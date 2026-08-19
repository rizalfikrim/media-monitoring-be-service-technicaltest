import type { Request, Response } from 'express';
import {
  bulkMentionSchema,
  searchMentionsQuerySchema,
  statsQuerySchema,
} from '../schemas/mention.schema.js';
import {
  getMentionStats,
  processBulkMentions,
  searchMentions,
} from '../services/mention.service.js';

function formatZodIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Array<{ field: string; message: string }> {
  return issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export async function bulkMentionsController(req: Request, res: Response): Promise<void> {
  const parsed = bulkMentionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid request body',
      errors: formatZodIssues(parsed.error.issues),
    });
    return;
  }

  try {
    const data = await processBulkMentions(parsed.data);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Bulk ingestion failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function searchMentionsController(req: Request, res: Response): Promise<void> {
  const parsed = searchMentionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: formatZodIssues(parsed.error.issues),
    });
    return;
  }

  try {
    const result = await searchMentions(parsed.data);
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function statsMentionsController(req: Request, res: Response): Promise<void> {
  const parsed = statsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors: formatZodIssues(parsed.error.issues),
    });
    return;
  }

  try {
    const result = await getMentionStats(parsed.data.group_by);
    res.status(200).json({ success: true, group_by: result.group_by, data: result.data });
  } catch (error) {
    console.error('Stats failed:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
