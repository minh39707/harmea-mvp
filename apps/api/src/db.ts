import mysql, { type Connection, type PoolConnection, type ResultSetHeader } from 'mysql2/promise';

export interface SqlResult<T extends Record<string, unknown> = Record<string, unknown>> {
  rows: T[];
  affectedRows: number;
}

export interface SqlConnection {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[]
  ): Promise<SqlResult<T>>;
  exec(sql: string): Promise<void>;
}

export interface Database extends SqlConnection {
  transaction<T>(run: (tx: SqlConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

function mysqlOptions(uri: string) {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    throw new Error('DATABASE_URL must be a valid mysql:// URL');
  }
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must use mysql://');
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL must include a database name');
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    charset: 'utf8mb4',
    timezone: 'Z' as const,
    multipleStatements: false,
    connectTimeout: 3000,
    ...(url.searchParams.get('ssl') === 'true' ? { ssl: {} } : {})
  };
}

function isoUtc(rows: Record<string, unknown>[]) {
  return rows.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : value
      ])
    )
  );
}

async function setUtc(connection: PoolConnection | Connection) {
  await connection.query("SET time_zone = '+00:00'");
}

async function execute<T extends Record<string, unknown>>(
  connection: PoolConnection | Connection,
  sql: string,
  values: unknown[] = []
): Promise<SqlResult<T>> {
  const [result] = await connection.query(sql, values);
  if (Array.isArray(result)) {
    const rows = isoUtc(result as Record<string, unknown>[]) as T[];
    return { rows, affectedRows: rows.length };
  }
  const header = result as ResultSetHeader;
  return { rows: [], affectedRows: header.affectedRows };
}

export async function openDatabase(): Promise<Database> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is required for MySQL');
  const pool = mysql.createPool({
    ...mysqlOptions(uri),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    waitForConnections: true,
    queueLimit: 0
  });

  const withConnection = async <T>(run: (connection: PoolConnection) => Promise<T>) => {
    const connection = await pool.getConnection();
    try {
      await setUtc(connection);
      return await run(connection);
    } finally {
      connection.release();
    }
  };

  const asSqlConnection = (connection: PoolConnection): SqlConnection => ({
    query: (sql, values) => execute(connection, sql, values),
    exec: async sql => {
      await connection.query(sql);
    }
  });

  return {
    query: (sql, values) => withConnection(connection => execute(connection, sql, values)),
    exec: async sql => {
      await withConnection(connection => connection.query(sql).then(() => undefined));
    },
    transaction: async run =>
      withConnection(async connection => {
        await connection.beginTransaction();
        try {
          const result = await run(asSqlConnection(connection));
          await connection.commit();
          return result;
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      }),
    close: () => pool.end()
  };
}

export interface MigrationConnection extends SqlConnection {
  close(): Promise<void>;
}

export async function openMigrationConnection(): Promise<MigrationConnection> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is required for MySQL');
  const connection = await mysql.createConnection({
    ...mysqlOptions(uri),
    multipleStatements: true
  });
  try {
    await setUtc(connection);
  } catch (error) {
    await connection.end();
    throw error;
  }
  return {
    query: (sql, values) => execute(connection, sql, values),
    exec: async sql => {
      await connection.query(sql);
    },
    close: () => connection.end()
  };
}
