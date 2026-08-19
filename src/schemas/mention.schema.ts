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

const isParsableDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

export const searchMentionsQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    source: z.string().trim().optional(),
    from: z
      .string()
      .trim()
      .refine(isParsableDate, 'Invalid date format')
      .optional(),
    to: z
      .string()
      .trim()
      .refine(isParsableDate, 'Invalid date format')
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to), {
    path: ['from'],
    message: 'from must not be greater than to',
  });

export type SearchMentionsQuery = z.infer<typeof searchMentionsQuerySchema>;