import { NextRequest } from 'next/server';
import { getAllKnowledgePoints } from '@/lib/db';
import { exportToCsv, exportToJson } from '@/lib/export';
import type { KnowledgeCategory } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * GET /api/knowledge/export?format=csv|json&category=synonym|...&conversation_id=id
 * Downloads knowledge points as a file.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const category = searchParams.get('category') as KnowledgeCategory | null;
    const conversationIdParam = searchParams.get('conversation_id') || undefined;

    const points = getAllKnowledgePoints(category ?? undefined, conversationIdParam);

    if (format === 'csv') {
      const csv = exportToCsv(points);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="knowledge-bank.csv"',
        },
      });
    }

    const json = exportToJson(points);
    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="knowledge-bank.json"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
