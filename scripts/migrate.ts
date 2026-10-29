import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openDatabase } from '../apps/api/src/db.ts';

const db = await openDatabase();
try {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  for (const name of (await readdir('database')).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    const sql = await readFile(`database/${name}`, 'utf8');
    const sha256 = createHash('sha256').update(sql).digest('hex');
    const prior = await db.query<{ sha256: string }>('SELECT sha256 FROM schema_migrations WHERE name = $1', [name]);
    if (prior.rows[0]) {
      if (prior.rows[0].sha256 !== sha256) throw new Error(`Applied migration changed: ${name}. Add a new migration instead.`);
      console.log(`Already applied: ${name}`);
      continue;
    }
    await db.transaction(async tx => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations (name, sha256) VALUES ($1, $2)', [name, sha256]);
    });
    console.log(`Applied: ${name}`);
  }
} finally { await db.close(); }
