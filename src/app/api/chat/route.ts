import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '@/lib/prompts';
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

export async function POST(request: NextRequest) {
  try {
    const { messages, conversation_id: conversationId } = (await request.json()) as {
      messages: ChatMessage[];
      conversation_id: string;
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

    // Persist the latest user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === 'user') {
      addMessage(conversationId, 'user', lastUserMsg.content);
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

    const createOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
      model,
      messages: fullMessages,
      tools: [storeKnowledgePointTool],
      stream: true,
    };

    if (process.env.AI_THINKING_LEVEL) {
      createOptions.reasoning_effort = process.env.AI_THINKING_LEVEL as 'low' | 'medium' | 'high';
    }

    const readable = new ReadableStream({
      async start(controller) {
        async function runTurn(currentMessages: OpenAI.Chat.ChatCompletionMessageParam[]) {
          const createOptions: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
            model,
            messages: currentMessages,
            tools: [storeKnowledgePointTool],
            stream: true,
          };

          if (process.env.AI_THINKING_LEVEL) {
            createOptions.reasoning_effort = process.env.AI_THINKING_LEVEL as 'low' | 'medium' | 'high';
          }

          const stream = await client.chat.completions.create(createOptions);

          const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
          let turnContent = '';
          let finishReason = '';

          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            if (!choice?.delta) continue;

            if (choice.delta.content) {
              turnContent += choice.delta.content;
              controller.enqueue(
                encodeEvent({ type: 'text', content: choice.delta.content })
              );
            }

            if (choice.delta.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                const idx = tc.index;
                if (!toolCalls.has(idx)) {
                  toolCalls.set(idx, { id: tc.id || '', name: '', arguments: '' });
                }
                const existing = toolCalls.get(idx)!;
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.arguments += tc.function.arguments;
              }
            }

            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }
          }

          return { turnContent, toolCalls, finishReason };
        }

        try {
          const currentMessages = [...fullMessages];
          let totalAssistantContent = '';

          while (true) {
            const { turnContent, toolCalls, finishReason } = await runTurn(currentMessages);
            totalAssistantContent += turnContent;

            if (toolCalls.size > 0) {
              const evs = processToolCalls(toolCalls, conversationId);
              for (const ev of evs) {
                controller.enqueue(ev);
              }

              // Assign IDs to any tool calls that are mysteriously missing them
              for (const [, tc] of toolCalls) {
                if (!tc.id) tc.id = crypto.randomUUID();
              }

              // Append assistant message with tool calls
              currentMessages.push({
                role: 'assistant',
                content: turnContent || null,
                tool_calls: Array.from(toolCalls.values()).map(tc => ({
                  id: tc.id,
                  type: 'function',
                  function: {
                    name: tc.name,
                    arguments: tc.arguments
                  }
                }))
              });

              // Append tool responses
              for (const [, tc] of toolCalls) {
                currentMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify({ success: true })
                });
              }

              // If it stopped explicitly for tool results OR it didn't give us any text feedback,
              // we force it to take another turn so the user gets actual feedback!
              if (finishReason === 'tool_calls' || turnContent.trim().length === 0) {
                continue; // Run next turn
              }
            }
            break;
          }

          if (totalAssistantContent) {
            addMessage(conversationId, 'assistant', totalAssistantContent);
            touchConversation(conversationId);
          } else {
            const fallbackText = "I've extracted the knowledge points! Check the Knowledge Bank.";
            controller.enqueue(encodeEvent({ type: 'text', content: fallbackText }));
            addMessage(conversationId, 'assistant', fallbackText);
            touchConversation(conversationId);
          }

          controller.enqueue(encodeEvent({ type: 'done' }));
          controller.close();
        } catch (streamError) {
          console.error('Stream error:', streamError);
          controller.enqueue(
            encodeEvent({
              type: 'error',
              message: streamError instanceof Error ? streamError.message : 'Stream failed',
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
