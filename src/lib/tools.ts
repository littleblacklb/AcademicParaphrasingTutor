import type { ChatCompletionTool } from 'openai/resources/chat/completions';

const knowledgePointSchema = {
  type: 'object' as const,
  properties: {
    category: {
      type: 'string' as const,
      enum: [
        'synonym',
        'collocation',
        'word_form',
        'grammar_rule',
        'user_mistake',
      ],
      description:
        'The category of the knowledge point: synonym (academic word substitution), ' +
        'collocation (phrasal framework or common academic phrase), ' +
        'word_form (part-of-speech transformation), ' +
        'grammar_rule (hedging, voice change, or other grammar pattern), ' +
        'user_mistake (an error the user made with correction).',
    },
    original_text: {
      type: 'string' as const,
      description:
        "The user's original word, phrase, or the incorrect form.",
    },
    academic_alternative: {
      type: 'string' as const,
      description:
        'The corrected or higher-level academic term / phrase.',
    },
    explanation: {
      type: 'string' as const,
      description:
        'A brief, clear explanation of why this alternative is preferred ' +
        'or what rule applies.',
    },
    example_sentence: {
      type: 'string' as const,
      description:
        'An example sentence demonstrating the academic alternative in context.',
    },
  },
  required: ['category', 'original_text', 'academic_alternative', 'explanation'],
};

/**
 * Tool schema that accepts a batch of knowledge points in a single call.
 * This works around the limitation that many models (especially Gemini)
 * only make 1-2 tool calls per turn even when instructed to make more.
 */
export const storeKnowledgePointTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'store_knowledge_points',
    description:
      'Store ALL academic writing knowledge points extracted from the feedback ' +
      'in a single call. Include every synonym, collocation, word-form change, ' +
      'grammar rule, and user mistake you can identify. Return them all at once ' +
      'in the items array.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Array of knowledge points to store. Include ALL points — do not omit any.',
          items: knowledgePointSchema,
        },
      },
      required: ['items'],
    },
  },
};
