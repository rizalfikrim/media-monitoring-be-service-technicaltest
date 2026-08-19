export interface NormalizedMention {
  external_id: string | null;
  source: string;
  title: string | null;
  content: string | null;
  url: string | null;
  author: string | null;
  published_at: Date | null;
  engagement: number | null;
  dedupe_key: string;
}

export interface SearchMention {
  id: number;
  externalId: string | null;
  source: string;
  title: string | null;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  engagement: number | null;
  createdAt: Date;
}