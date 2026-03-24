import { NextRequest } from 'next/server';
import { getAllKnowledgePoints, addKnowledgePoint, clearAllKnowledgePoints, getKnowledgePointStats } from '@/lib/db';
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

    if (statsParam === 'true') {
      const stats = getKnowledgePointStats(conversationIdParam);
      return Response.json(stats);
    }

    const points = getAllKnowledgePoints(categoryParam ?? undefined, conversationIdParam);
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
    const { conversation_id, category, original_text, academic_alternative, explanation, example_sentence } = body;

    if (!conversation_id || !category || !original_text || !academic_alternative || !explanation) {
      return Response.json(
        { error: 'Missing required fields: conversation_id, category, original_text, academic_alternative, explanation' },
        { status: 400 }
      );
    }

    const validCategories: KnowledgeCategory[] = [
      'synonym', 'collocation', 'word_form', 'grammar_rule', 'user_mistake',
    ];
    if (!validCategories.includes(category)) {
      return Response.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }

    const point = addKnowledgePoint({
      conversation_id,
      category,
      original_text,
      academic_alternative,
      explanation,
      example_sentence,
    });

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
