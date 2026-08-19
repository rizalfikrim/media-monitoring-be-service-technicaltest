import { pool } from '../src/config/database.js';

const columns = await pool.query(
  `SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'mentions'
   ORDER BY ordinal_position;`,
);

console.log('--- COLUMNS ---');
console.table(columns.rows);

const constraints = await pool.query(
  `SELECT tc.constraint_type, tc.constraint_name
   FROM information_schema.table_constraints tc
   WHERE tc.table_name = 'mentions'
   ORDER BY tc.constraint_type, tc.constraint_name;`,
);

console.log('--- CONSTRAINTS ---');
console.table(constraints.rows);

const indexes = await pool.query(
  `SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = 'mentions'
   ORDER BY indexname;`,
);

console.log('--- INDEXES ---');
console.table(indexes.rows);

await pool.end();
