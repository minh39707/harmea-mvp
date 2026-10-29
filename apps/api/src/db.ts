import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export interface SqlConnection {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
}
export interface Database extends SqlConnection {
  transaction<T>(run: (tx: SqlConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function openDatabase(): Promise<Database> {
  const driver = process.env.DB_DRIVER ?? 'pglite';
  if (driver === 'pglite') {
    const path = resolve(process.env.DATA_DIR ?? './storage/db');
    await mkdir(path, { recursive: true });
    const db = new PGlite(path);
    await db.waitReady;
    return {
      query: (sql, values) => db.query(sql, values),
      exec: async sql => {
        await db.exec(sql);
      },
      transaction: run =>
        db.transaction(async tx =>
          run({
            query: (sql, values) => tx.query(sql, values),
            exec: async sql => {
              await tx.exec(sql);
            }
          })
        ),
      close: () => db.close()
    };
  }
  if (driver !== 'postgres') throw new Error('DB_DRIVER must be pglite or postgres');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for postgres');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    max: 5
  });
  return {
    query: (sql, values) => pool.query(sql, values),
    exec: async sql => {
      await pool.query(sql);
    },
    transaction: async run => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await run({
          query: (sql, values) => client.query(sql, values),
          exec: async sql => {
            await client.query(sql);
          }
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end()
  };
}
