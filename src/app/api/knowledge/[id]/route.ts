import { NextRequest } from 'next/server';
import { deleteKnowledgePoint, toggleGlobalBank } from '@/lib/db';

export const runtime = 'nodejs';

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
