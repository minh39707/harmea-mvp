import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { openMigrationConnection } from '../apps/api/src/db.ts';

const db = await openMigrationConnection();
let locked = false;
let lookupMigrationDeferred = false;
try {
  const lock = await db.query<{ acquired: number }>(
    "SELECT GET_LOCK('harmea_migrate', 30) AS acquired"
  );
  if (Number(lock.rows[0]?.acquired) !== 1)
    throw new Error('Could not acquire the MySQL migration lock within 30 seconds.');
  locked = true;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      CONSTRAINT schema_migrations_sha256_format CHECK (REGEXP_LIKE(sha256, '^[0-9a-f]{64}$', 'c'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  for (const name of (await readdir('database')).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    const sql = await readFile(`database/${name}`, 'utf8');
    const sha256 = createHash('sha256').update(sql).digest('hex');
    const prior = await db.query<{ sha256: string }>(
      'SELECT sha256 FROM schema_migrations WHERE name=?',
      [name]
    );
    if (prior.rows[0]) {
      if (prior.rows[0].sha256 !== sha256)
        throw new Error(`Applied migration changed: ${name}. Add a new migration instead.`);
      console.log(`Already applied: ${name}`);
      continue;
    }

    if (name === '005_r1_finalize_lookup.sql') {
      const missing = await db.query<{ total: number }>(
        'SELECT CAST(COUNT(*) AS UNSIGNED) AS total FROM orders WHERE lookup_phone_hash IS NULL'
      );
      if (Number(missing.rows[0]?.total ?? 0) > 0) {
        lookupMigrationDeferred = true;
        console.log(
          'Deferred 005_r1_finalize_lookup.sql: run npm run db:backfill-lookup, then rerun npm run db:migrate.'
        );
        continue;
      }
    }

    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(
        `Migration ${name} failed. MySQL DDL may have partially applied; repair the database manually before retrying.`,
        { cause: error }
      );
    }
    await db.query('INSERT INTO schema_migrations (name, sha256) VALUES (?, ?)', [name, sha256]);
    console.log(`Applied: ${name}`);
  }
  if (lookupMigrationDeferred) process.exitCode = 1;
} finally {
  if (locked) await db.query("SELECT RELEASE_LOCK('harmea_migrate')");
  await db.close();
}
