import { createHash } from 'node:crypto';

export function generateDedupeKey(params: {
  source: string;
  title: string | null;
  content: string | null;
  publishedAt: Date | null;
}): string {
  const payload = JSON.stringify([
    params.source.toLowerCase(),
    params.title?.toLowerCase() ?? '',
    params.content?.toLowerCase() ?? '',
    params.publishedAt ? params.publishedAt.toISOString() : '',
  ]);

  return createHash('sha256').update(payload).digest('hex');
}