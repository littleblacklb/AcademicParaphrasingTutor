import { getAllKnowledgePoints } from './db';
import type { KnowledgePoint } from './types';

/**
 * Export knowledge points as CSV string.
 */
export function exportToCsv(points?: KnowledgePoint[]): string {
  const data = points ?? getAllKnowledgePoints();

  const headers = [
    'Category',
    'Original Text',
    'Academic Alternative',
    'Explanation',
    'Example Sentence',
    'Created At',
  ];

  const rows = data.map((kp) => [
    kp.category,
    escapeCsv(kp.original_text),
    escapeCsv(kp.academic_alternative),
    escapeCsv(kp.explanation),
    escapeCsv(kp.example_sentence ?? ''),
    kp.created_at,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export knowledge points as JSON string (pretty-printed).
 */
export function exportToJson(points?: KnowledgePoint[]): string {
  const data = points ?? getAllKnowledgePoints();
  return JSON.stringify(data, null, 2);
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
