import type { Request, Response } from 'express';
import { bulkMentionSchema } from '../schemas/mention.schema.js';
import { processBulkMentions } from '../services/mention.service.js';

export async function bulkMentionsController(req: Request, res: Response): Promise<void> {
  const parsed = bulkMentionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid request body',
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
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
