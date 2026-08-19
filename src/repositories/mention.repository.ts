import { pool } from '../config/database.js';
import type { NormalizedMention } from '../types/mention.js';

export async function bulkInsertMentions(mentions: NormalizedMention[]): Promise<number> {
  if (mentions.length === 0) {
    return 0;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const values: unknown[] = [];
    const placeholders: string[] = [];
    for (let i = 0; i < mentions.length; i++) {
      const mention = mentions[i];
      const offset = i * 6;
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`,
      );
      values.push(
        mention.source,
        mention.title,
        mention.content,
        mention.published_at,
        mention.engagement,
        mention.dedupe_key,
      );
    }

    const result = await client.query(
      `INSERT INTO mentions (source, title, content, published_at, engagement, dedupe_key)
       VALUES ${placeholders.join(', ')}
       ON CONFLICT (dedupe_key) DO NOTHING`,
      values,
    );

    await client.query('COMMIT');
    return result.rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
