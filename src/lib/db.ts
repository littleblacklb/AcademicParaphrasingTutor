import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { KnowledgePoint, KnowledgeCategory, Conversation, StoredMessage } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'apt.db');

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection.
 * Creates the data directory and tables if they don't exist.
 */
export function getDb(): Database.Database {
  if (db) return db;

  // Ensure the data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_conv_updated_at ON conversations(updated_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_msg_conv ON conversation_messages(conversation_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS knowledge_points (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('synonym', 'collocation', 'word_form', 'grammar_rule', 'user_mistake')),
      original_text TEXT NOT NULL,
      academic_alternative TEXT NOT NULL,
      explanation TEXT NOT NULL,
      example_sentence TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_kp_category ON knowledge_points(category);
    CREATE INDEX IF NOT EXISTS idx_kp_created_at ON knowledge_points(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_kp_conv ON knowledge_points(conversation_id);
  `);

  // Migration: add conversation_id if table already exists without it
  try {
    const cols = db.prepare("PRAGMA table_info(knowledge_points)").all() as { name: string }[];
    const hasConvId = cols.some((c) => c.name === 'conversation_id');
    if (!hasConvId) {
      // Add the column with a default placeholder. Existing rows get a legacy conversation.
      db.exec(`ALTER TABLE knowledge_points ADD COLUMN conversation_id TEXT NOT NULL DEFAULT '__legacy__'`);
      // Create a legacy conversation entry for orphaned points
      const legacyExists = db.prepare("SELECT id FROM conversations WHERE id = '__legacy__'").get();
      if (!legacyExists) {
        db.prepare(
          "INSERT INTO conversations (id, title, created_at, updated_at) VALUES ('__legacy__', 'Previous Sessions', datetime('now'), datetime('now'))"
        ).run();
      }
    }
  } catch {
    // Table was just created fresh — nothing to migrate
  }

  return db;
}

// ─── Conversation CRUD ────────────────────────────────────────────────

export function createConversation(title?: string): Conversation {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(id, title || 'New Conversation', now, now);

  return { id, title: title || 'New Conversation', created_at: now, updated_at: now };
}

export function getAllConversations(): Conversation[] {
  const db = getDb();
  return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all() as Conversation[];
}

export function getConversation(id: string): Conversation | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
}

export function updateConversationTitle(id: string, title: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, new Date().toISOString(), id);
  return result.changes > 0;
}

export function touchConversation(id: string): void {
  const db = getDb();
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id);
}

export function deleteConversation(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Message CRUD ─────────────────────────────────────────────────────

export function addMessage(conversationId: string, role: 'user' | 'assistant', content: string): StoredMessage {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO conversation_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, conversationId, role, content, now);

  // Touch conversation timestamp
  touchConversation(conversationId);

  return { id, conversation_id: conversationId, role, content, created_at: now };
}

export function getMessages(conversationId: string): StoredMessage[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(conversationId) as StoredMessage[];
}

// ─── Knowledge Point CRUD ─────────────────────────────────────────────

export function getAllKnowledgePoints(category?: KnowledgeCategory, conversationId?: string): KnowledgePoint[] {
  const db = getDb();
  let sql = 'SELECT * FROM knowledge_points';
  const conditions: string[] = [];
  const params: string[] = [];

  if (category) {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conversationId) {
    conditions.push('conversation_id = ?');
    params.push(conversationId);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  return stmt.all(...params) as KnowledgePoint[];
}

export function addKnowledgePoint(
  kp: Omit<KnowledgePoint, 'id' | 'created_at'>
): KnowledgePoint {
  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO knowledge_points (id, conversation_id, category, original_text, academic_alternative, explanation, example_sentence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    kp.conversation_id,
    kp.category,
    kp.original_text,
    kp.academic_alternative,
    kp.explanation,
    kp.example_sentence ?? null,
    created_at
  );

  return { id, created_at, ...kp };
}

export function deleteKnowledgePoint(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM knowledge_points WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function clearAllKnowledgePoints(conversationId?: string): number {
  const db = getDb();
  if (conversationId) {
    const result = db.prepare('DELETE FROM knowledge_points WHERE conversation_id = ?').run(conversationId);
    return result.changes;
  }
  db.exec('DELETE FROM knowledge_points');
  return 0;
}

export function getKnowledgePointStats(conversationId?: string): Record<KnowledgeCategory, number> {
  const db = getDb();
  let sql = 'SELECT category, COUNT(*) as count FROM knowledge_points';
  const params: string[] = [];
  if (conversationId) {
    sql += ' WHERE conversation_id = ?';
    params.push(conversationId);
  }
  sql += ' GROUP BY category';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as { category: KnowledgeCategory; count: number }[];

  const stats: Record<KnowledgeCategory, number> = {
    synonym: 0,
    collocation: 0,
    word_form: 0,
    grammar_rule: 0,
    user_mistake: 0,
  };

  for (const row of rows) {
    stats[row.category] = row.count;
  }

  return stats;
}
