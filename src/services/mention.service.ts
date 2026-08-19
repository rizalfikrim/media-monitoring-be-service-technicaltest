import { bulkInsertMentions } from '../repositories/mention.repository.js';
import { rawMentionSchema, type RawMention } from '../schemas/mention.schema.js';
import type { NormalizedMention } from '../types/mention.js';
import { InvalidDateError, parsePublishedAt } from '../utils/date.js';
import { generateDedupeKey } from '../utils/dedupe.js';
import { parseEngagement } from '../utils/engagement.js';
import { normalizeSource, normalizeText, stripHtml } from '../utils/text.js';

export type NormalizeResult =
  | { ok: true; mention: NormalizedMention }
  | { ok: false; reason: string };

export interface BulkResult {
  received: number;
  inserted: number;
  duplicates: number;
  rejected: number;
}

export async function processBulkMentions(records: RawMention[]): Promise<BulkResult> {
  const normalized: NormalizedMention[] = [];
  let rejected = 0;

  for (const record of records) {
    const result = normalizeRawMention(record);
    if (result.ok) {
      normalized.push(result.mention);
    } else {
      rejected++;
    }
  }

  const received = records.length;
  const inserted = await bulkInsertMentions(normalized);
  const duplicates = normalized.length - inserted;

  return { received, inserted, duplicates, rejected };
}

export function normalizeRawMention(raw: unknown): NormalizeResult {
  const parsed = rawMentionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid record structure' };
  }

  const record: RawMention = parsed.data;

  const source = normalizeSource(record.source);
  if (!source) {
    return { ok: false, reason: 'source is required' };
  }

  const title = normalizeText(record.title);
  const content =
    record.content === null || record.content === undefined
      ? null
      : normalizeText(stripHtml(record.content));

  if (!title && !content) {
    return { ok: false, reason: 'title or content is required' };
  }

  let publishedAt: Date | null;
  try {
    publishedAt = parsePublishedAt(record.published_at);
  } catch (error) {
    if (error instanceof InvalidDateError) {
      return { ok: false, reason: 'invalid published_at' };
    }
    throw error;
  }

  const engagement = parseEngagement(record.engagement);
  const dedupeKey = generateDedupeKey({ source, title, content, publishedAt });

  return {
    ok: true,
    mention: {
      external_id: normalizeText(record.external_id),
      source,
      title,
      content,
      url: normalizeText(record.url),
      author: normalizeText(record.author),
      published_at: publishedAt,
      engagement,
      dedupe_key: dedupeKey,
    },
  };
}