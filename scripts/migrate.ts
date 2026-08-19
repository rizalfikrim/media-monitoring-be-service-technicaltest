import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/config/database.js';

const migrationsDir = join(fileURLToPath(new URL('..', import.meta.url)), 'migrations');

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No migration files found.');
  await pool.end();
  process.exit(0);
}

for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`Applied: ${file}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed: ${file}`);
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
