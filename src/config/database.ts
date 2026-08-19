import { Pool } from 'pg';
import { config } from './env.js';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});
