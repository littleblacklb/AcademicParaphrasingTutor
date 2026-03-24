// ─── Knowledge Point Types ────────────────────────────────────────────

export type KnowledgeCategory =
  | 'synonym'
  | 'collocation'
  | 'word_form'
  | 'grammar_rule'
  | 'user_mistake';

export interface KnowledgePoint {
  id: string;
  conversation_id: string;
  category: KnowledgeCategory;
  original_text: string;
  academic_alternative: string;
  explanation: string;
  example_sentence?: string;
  created_at: string; // ISO 8601
}

// ─── Conversation Types ───────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ─── Chat Types ────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// ─── Streaming Event Types ────────────────────────────────────────────

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'knowledge_point'; data: Omit<KnowledgePoint, 'id' | 'created_at'> }
  | { type: 'done' }
  | { type: 'error'; message: string };
