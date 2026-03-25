import { NextRequest } from 'next/server';
import { deleteKnowledgePoint, toggleGlobalBank, updateKnowledgePoint } from '@/lib/db';
import type { KnowledgeCategory } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * PUT /api/knowledge/[id]
 * Updates fields of a knowledge point.
 * Body: { category?, original_text?, academic_alternative?, explanation?, example_sentence? }
 */
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<'/api/knowledge/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const { category, original_text, academic_alternative, explanation, example_sentence } = body;

    const validCategories: KnowledgeCategory[] = [
      'synonym', 'collocation', 'word_form', 'grammar_rule', 'user_mistake',
    ];
    if (category && !validCategories.includes(category)) {
      return Response.json({ error: `Invalid category: ${category}` }, { status: 400 });
    }

    const fields: Record<string, string | null | undefined> = {};
    if (category !== undefined) fields.category = category;
    if (original_text !== undefined) fields.original_text = original_text;
    if (academic_alternative !== undefined) fields.academic_alternative = academic_alternative;
    if (explanation !== undefined) fields.explanation = explanation;
    if (example_sentence !== undefined) fields.example_sentence = example_sentence;

    const updated = updateKnowledgePoint(id, fields);
    if (!updated) {
      return Response.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Knowledge point PUT error:', error);
    return Response.json({ error: 'Failed to update knowledge point' }, { status: 500 });
  }
}

/**
 * PATCH /api/knowledge/[id]
 * Toggles the in_global_bank status of a knowledge point.
 * Body: { in_global_bank: boolean }
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/knowledge/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    const value = !!body.in_global_bank;
    const updated = toggleGlobalBank(id, value);

    if (!updated) {
      return Response.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    return Response.json({ success: true, in_global_bank: value });
  } catch (error) {
    console.error('Knowledge point PATCH error:', error);
    return Response.json({ error: 'Failed to update knowledge point' }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge/[id]
 * Deletes a single knowledge point by ID.
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<'/api/knowledge/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const deleted = deleteKnowledgePoint(id);

    if (!deleted) {
      return Response.json({ error: 'Knowledge point not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Knowledge point DELETE error:', error);
    return Response.json({ error: 'Failed to delete knowledge point' }, { status: 500 });
  }
}
