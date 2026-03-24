import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Tool schema for the store_knowledge_point function.
 * This is passed to the AI model so it can extract knowledge points
 * from its feedback and return them as structured tool calls.
 */
export const storeKnowledgePointTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'store_knowledge_point',
    description:
      'Store a valuable academic writing concept mentioned in your feedback. ' +
      'Call this tool for EACH knowledge point you identify — synonyms you ' +
      'suggested, collocations, word-form transformations, grammar rules, ' +
      'or mistakes the user made. You may call this tool multiple times per turn.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
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
          type: 'string',
          description:
            "The user's original word, phrase, or the incorrect form.",
        },
        academic_alternative: {
          type: 'string',
          description:
            'The corrected or higher-level academic term / phrase.',
        },
        explanation: {
          type: 'string',
          description:
            'A brief, clear explanation of why this alternative is preferred ' +
            'or what rule applies.',
        },
        example_sentence: {
          type: 'string',
          description:
            'An example sentence demonstrating the academic alternative in context.',
        },
      },
      required: ['category', 'original_text', 'academic_alternative', 'explanation'],
    },
  },
};
