import { NextRequest } from 'next/server';
import { getAllConversations, createConversation } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/conversations
 * Returns all conversations ordered by most recently updated.
 */
export async function GET() {
  try {
    const conversations = getAllConversations();
    return Response.json(conversations);
  } catch (error) {
    console.error('Conversations GET error:', error);
    return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 * Body: { title? }
 * Creates a new conversation and returns it.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const conversation = createConversation(body.title);
    return Response.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Conversations POST error:', error);
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
