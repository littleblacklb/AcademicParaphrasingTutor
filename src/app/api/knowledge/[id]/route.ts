import { NextRequest } from 'next/server';
import { deleteKnowledgePoint } from '@/lib/db';

export const runtime = 'nodejs';

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
