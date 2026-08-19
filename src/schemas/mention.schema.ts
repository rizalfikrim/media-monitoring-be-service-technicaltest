import { z } from 'zod';

export const rawMentionSchema = z.object({
  external_id: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  published_at: z.union([z.string(), z.number(), z.null()]).optional(),
  engagement: z.union([z.string(), z.number(), z.null()]).optional(),
});

export type RawMention = z.infer<typeof rawMentionSchema>;

export const bulkMentionSchema = z.array(rawMentionSchema).min(1);