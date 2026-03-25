import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT, EXTRACTION_PROMPT, DEEP_EXTRACTION_PROMPT } from '@/lib/prompts';
import { storeKnowledgePointTool } from '@/lib/tools';
import { addKnowledgePoint, addMessage, touchConversation } from '@/lib/db';
import type { ChatMessage, StreamEvent } from '@/lib/types';

// Force this route to run in the Node.js runtime (needed for better-sqlite3)
export const runtime = 'nodejs';

const encoder = new TextEncoder();

function getClient(): OpenAI {
  const apiKey = process.env.AI_API_KEY;
  const baseURL =
    process.env.AI_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta/openai/';

  if (!apiKey) {
    throw new Error('AI_API_KEY environment variable is not set');
  }

  return new OpenAI({ apiKey, baseURL });
}

function getModel(): string {
  return process.env.AI_MODEL || 'gemini-2.0-flash';
}

/** Encode a StreamEvent as an SSE data line. */
function encodeEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** Process all finished tool calls — save to DB and return SSE events. */
function processToolCalls(
  toolCalls: Map<number, { name: string; arguments: string }>,
  conversationId: string
): Uint8Array[] {
  const events: Uint8Array[] = [];

  for (const [, tc] of toolCalls) {
    if (tc.name !== 'store_knowledge_point') continue;
    try {
      let argsRaw = tc.arguments.trim();

      // If the model mistakenly concatenated multiple JSON objects (e.g. index collision),
      // we wrap them in an array to parse them correctly.
      if (/}\s*{/.test(argsRaw)) {
        argsRaw = '[' + argsRaw.replace(/}\s*{/g, '},{') + ']';
      }

      const parsed = JSON.parse(argsRaw);
      const argsArray = Array.isArray(parsed) ? parsed : [parsed];

      for (const args of argsArray) {
        if (!args.category || !args.original_text || !args.academic_alternative || !args.explanation) {
          continue; // Skip improperly formed objects
        }

        const saved = addKnowledgePoint({
          conversation_id: conversationId,
          category: args.category,
          original_text: args.original_text,
          academic_alternative: args.academic_alternative,
          explanation: args.explanation,
          example_sentence: args.example_sentence,
        });

        events.push(
          encodeEvent({
            type: 'knowledge_point',
            data: {
              conversation_id: conversationId,
              category: saved.category,
              original_text: saved.original_text,
              academic_alternative: saved.academic_alternative,
              explanation: saved.explanation,
              example_sentence: saved.example_sentence,
            },
          })
        );
      }
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError, '\nRaw arguments:', tc.arguments);
    }
  }

  return events;
}

/**
 * Phase 1: Stream the chat response WITHOUT tools.
 * This guarantees text output from any provider (including Gemini).
 */
async function streamChatResponse(
  client: OpenAI,
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController,
): Promise<string> {
  const createOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model,
    messages,
    stream: true,
    // No tools — forces the model to produce text
  };

  if (process.env.AI_THINKING_LEVEL) {
    createOptions.reasoning_effort = process.env.AI_THINKING_LEVEL as 'low' | 'medium' | 'high';
  }

  const stream = await client.chat.completions.create(createOptions);

  let assistantContent = '';

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    if (!choice?.delta?.content) continue;

    assistantContent += choice.delta.content;
    controller.enqueue(
      encodeEvent({ type: 'text', content: choice.delta.content })
    );
  }

  return assistantContent;
}

/**
 * Phase 2: Extract knowledge points using tool calls (non-streaming).
 * Runs after the chat response is complete, with the assistant's reply as context.
 */
async function extractKnowledgePoints(
  client: OpenAI,
  model: string,
  conversationMessages: OpenAI.Chat.ChatCompletionMessageParam[],
  assistantReply: string,
  conversationId: string,
  controller: ReadableStreamDefaultController,
): Promise<void> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    ...conversationMessages,
    { role: 'assistant', content: assistantReply },
    { role: 'user', content: EXTRACTION_PROMPT },
  ];

  const createOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    model,
    messages,
    tools: [storeKnowledgePointTool],
    stream: false,
  };

  const response = await client.chat.completions.create(createOptions) as OpenAI.Chat.ChatCompletion;

  const choice = response.choices[0];
  if (!choice?.message?.tool_calls?.length) return;

  const toolCalls = new Map<number, { name: string; arguments: string }>();
  for (let i = 0; i < choice.message.tool_calls.length; i++) {
    const tc = choice.message.tool_calls[i];
    if (tc.type !== 'function') continue;
    toolCalls.set(i, {
      name: tc.function.name,
      arguments: tc.function.arguments,
    });
  }

  const events = processToolCalls(toolCalls, conversationId);
  for (const ev of events) {
    controller.enqueue(ev);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, conversation_id: conversationId, extract_only: extractOnly } = (await request.json()) as {
      messages: ChatMessage[];
      conversation_id: string;
      extract_only?: boolean;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return Response.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    // Persist the latest user message (skip for extract-only mode)
    if (!extractOnly) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === 'user') {
        addMessage(conversationId, 'user', lastUserMsg.content);
      }
    }

    const client = getClient();
    const model = getModel();

    const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const readable = new ReadableStream({
      async start(controller) {
        try {
          if (extractOnly) {
            // Extract-only mode: skip chat, run aggressive extraction on the full conversation.
            // fullMessages already contains all user + assistant turns, so we just append the
            // extraction prompt directly — no need to duplicate the last assistant message.
            const hasAssistant = messages.some(m => m.role === 'assistant');
            if (!hasAssistant) {
              controller.enqueue(encodeEvent({ type: 'error', message: 'No assistant message to extract from' }));
              controller.close();
              return;
            }

            const extractionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
              ...fullMessages,
              { role: 'user', content: DEEP_EXTRACTION_PROMPT },
            ];

            const createOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
              model,
              messages: extractionMessages,
              tools: [storeKnowledgePointTool],
              stream: false,
            };

            const response = await client.chat.completions.create(createOptions) as OpenAI.Chat.ChatCompletion;
            const choice = response.choices[0];
            if (choice?.message?.tool_calls?.length) {
              const toolCalls = new Map<number, { name: string; arguments: string }>();
              for (let i = 0; i < choice.message.tool_calls.length; i++) {
                const tc = choice.message.tool_calls[i];
                if (tc.type !== 'function') continue;
                toolCalls.set(i, { name: tc.function.name, arguments: tc.function.arguments });
              }
              const events = processToolCalls(toolCalls, conversationId);
              for (const ev of events) {
                controller.enqueue(ev);
              }
            }
          } else {
            // Phase 1: Stream text response (no tools — guaranteed text)
            const assistantContent = await streamChatResponse(
              client, model, fullMessages, controller,
            );

            // Persist assistant message
            if (assistantContent) {
              addMessage(conversationId, 'assistant', assistantContent);
              touchConversation(conversationId);
            }

            // Phase 2: Extract knowledge points via tool calling
            try {
              await extractKnowledgePoints(
                client, model, fullMessages, assistantContent, conversationId, controller,
              );
            } catch (extractionError) {
              // Knowledge extraction is best-effort; don't fail the whole response
              console.error('Knowledge extraction failed:', extractionError);
            }
          }

          controller.enqueue(encodeEvent({ type: 'done' }));
          controller.close();
        } catch (streamError) {
          // Log full error details for debugging (especially 429 rate-limit errors)
          console.error('Stream error:', streamError);
          let errorMessage = 'Stream failed';
          if (streamError instanceof OpenAI.APIError) {
            console.error('API Error Details:', {
              status: streamError.status,
              message: streamError.message,
              code: streamError.code,
              type: streamError.type,
              headers: Object.fromEntries(streamError.headers?.entries?.() ?? []),
            });
            errorMessage = `API Error ${streamError.status}: ${streamError.message}` +
              (streamError.code ? ` (code: ${streamError.code})` : '') +
              (streamError.type ? ` [type: ${streamError.type}]` : '');
          } else if (streamError instanceof Error) {
            errorMessage = streamError.message;
          }
          controller.enqueue(
            encodeEvent({
              type: 'error',
              message: errorMessage,
            })
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
