import {
  bulkInsertMentions,
  searchMentions as searchMentionsRepo,
  type MentionRow,
} from '../repositories/mention.repository.js';
import {
  rawMentionSchema,
  type RawMention,
  type SearchMentionsQuery,
} from '../schemas/mention.schema.js';
import type { NormalizedMention, SearchMention } from '../types/mention.js';
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

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

function parseSearchDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (dateOnlyRegex.test(value)) {
    return new Date(endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

function toSearchMention(row: MentionRow): SearchMention {
  return {
    id: Number(row.id),
    externalId: row.external_id,
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url,
    author: row.author,
    publishedAt: row.published_at,
    engagement: row.engagement === null ? null : Number(row.engagement),
    createdAt: row.created_at,
  };
}

export interface SearchMentionsResult {
  data: SearchMention[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function searchMentions(query: SearchMentionsQuery): Promise<SearchMentionsResult> {
  const source = query.source ? normalizeSource(query.source) : undefined;

  const { rows, total } = await searchMentionsRepo({
    q: query.q || undefined,
    source: source ?? undefined,
    from: parseSearchDate(query.from, false),
    to: parseSearchDate(query.to, true),
    page: query.page,
    limit: query.limit,
  });

  return {
    data: rows.map(toSearchMention),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
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