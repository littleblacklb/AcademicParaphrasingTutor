import { NextRequest } from 'next/server';
import { getAllKnowledgePoints, addKnowledgePoint, clearAllKnowledgePoints, getKnowledgePointStats, toggleGlobalBank } from '@/lib/db';
import type { KnowledgeCategory } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * GET /api/knowledge
 * Query params:
 *   ?category=synonym|collocation|word_form|grammar_rule|user_mistake
 *   ?stats=true  (returns category counts instead of full list)
 *   ?conversation_id=id (filters by conversation)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statsParam = searchParams.get('stats');
    const categoryParam = searchParams.get('category') as KnowledgeCategory | null;
    const conversationIdParam = searchParams.get('conversation_id') || undefined;
    const globalParam = searchParams.get('global') === 'true';

    if (statsParam === 'true') {
      const stats = getKnowledgePointStats(conversationIdParam);
      return Response.json(stats);
    }

    const points = getAllKnowledgePoints(categoryParam ?? undefined, conversationIdParam, globalParam);
    return Response.json(points);
  } catch (error) {
    console.error('Knowledge GET error:', error);
    return Response.json({ error: 'Failed to fetch knowledge points' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge
 * Body: { conversation_id, category, original_text, academic_alternative, explanation, example_sentence? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, category, original_text, academic_alternative, explanation, example_sentence, in_global_bank } = body;

    if (!category || !original_text || !academic_alternative || !explanation) {
      return Response.json(
        { error: 'Missing required fields: category, original_text, academic_alternative, explanation' },
        { status: 400 }
      );
    }

    const validCategories: KnowledgeCategory[] = [
      'synonym', 'collocation', 'word_form', 'grammar_rule', 'user_mistake',
    ];
    if (!validCategories.includes(category)) {
      return Response.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }

    const resolvedConversationId = conversation_id || '__manual__';

    // Ensure __manual__ conversation exists for manual adds
    if (!conversation_id) {
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const exists = db.prepare("SELECT id FROM conversations WHERE id = '__manual__'").get();
      if (!exists) {
        db.prepare(
          "INSERT INTO conversations (id, title, created_at, updated_at) VALUES ('__manual__', 'Manual Entries', datetime('now'), datetime('now'))"
        ).run();
      }
    }

    const point = addKnowledgePoint({
      conversation_id: resolvedConversationId,
      category,
      original_text,
      academic_alternative,
      explanation,
      example_sentence,
    });

    // If explicitly adding to global bank, toggle it
    if (in_global_bank) {
      toggleGlobalBank(point.id, true);
      point.in_global_bank = true;
    }

    return Response.json(point, { status: 201 });
  } catch (error) {
    console.error('Knowledge POST error:', error);
    return Response.json({ error: 'Failed to create knowledge point' }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge?conversation_id=id
 * Clears all knowledge points (optionally scoped to a conversation).
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationIdParam = searchParams.get('conversation_id') || undefined;
    clearAllKnowledgePoints(conversationIdParam);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Knowledge DELETE error:', error);
    return Response.json({ error: 'Failed to clear knowledge points' }, { status: 500 });
  }
}
