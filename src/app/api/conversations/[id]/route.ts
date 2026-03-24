import { NextRequest } from 'next/server';
import { getConversation, updateConversationTitle, deleteConversation, getMessages } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/conversations/[id]
 * Returns a single conversation with its messages.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/api/conversations/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const conversation = getConversation(id);

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = getMessages(id);
    return Response.json({ ...conversation, messages });
  } catch (error) {
    console.error('Conversation GET error:', error);
    return Response.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

/**
 * PATCH /api/conversations/[id]
 * Body: { title }
 * Updates a conversation's title.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/conversations/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const { title } = await request.json();

    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const updated = updateConversationTitle(id, title);
    if (!updated) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Conversation PATCH error:', error);
    return Response.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id]
 * Deletes a conversation and all its messages and knowledge points (via CASCADE).
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<'/api/conversations/[id]'>
) {
  try {
    const { id } = await ctx.params;
    const deleted = deleteConversation(id);

    if (!deleted) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Conversation DELETE error:', error);
    return Response.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
