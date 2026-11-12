import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const runFile = promisify(execFile);

function connectionOptions(url) {
  if (url.protocol !== 'mysql:') throw new Error('TEST_DATABASE_URL must use mysql://');
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    charset: 'utf8mb4',
    timezone: 'Z',
    ...(url.searchParams.get('ssl') === 'true' ? { ssl: {} } : {})
  };
}

export async function createTestDatabase(context) {
  const source = process.env.TEST_DATABASE_URL;
  if (!source)
    throw new Error(
      'TEST_DATABASE_URL is required. Set it to a local MySQL account with CREATE and DROP DATABASE privileges.'
    );

  let sourceUrl;
  try {
    sourceUrl = new URL(source);
    connectionOptions(sourceUrl);
  } catch (error) {
    if (error.message.startsWith('TEST_DATABASE_URL')) throw error;
    throw new Error('TEST_DATABASE_URL must be a valid mysql:// URL.');
  }

  const databaseName = `harmea_test_${randomBytes(10).toString('hex')}`;
  const targetUrl = new URL(sourceUrl);
  targetUrl.pathname = `/${databaseName}`;
  const oldDatabaseUrl = process.env.DATABASE_URL;
  const admin = await mysql.createConnection(connectionOptions(sourceUrl));
  let closed = false;
  const destroy = async () => {
    if (closed) return;
    closed = true;
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    } catch {
      throw new Error(`Could not drop isolated MySQL test database ${databaseName}.`);
    } finally {
      await admin.end();
      if (oldDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = oldDatabaseUrl;
    }
  };
  context?.after(destroy);

  try {
    await admin.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    process.env.DATABASE_URL = targetUrl.toString();
    const migrate = async () => {
      const { stdout } = await runFile(process.execPath, ['scripts/migrate.ts'], {
        cwd: process.cwd(),
        env: process.env,
        encoding: 'utf8'
      });
      return stdout;
    };
    const firstMigration = await migrate();
    return { databaseName, firstMigration, migrate, destroy };
  } catch (error) {
    try {
      await destroy();
    } catch {
      // Keep the setup error as the test failure; do not hide it with cleanup noise.
    }
    if (error.message.includes('scripts/migrate.ts')) throw error;
    throw new Error(
      `Could not create isolated MySQL test database ${databaseName}; verify TEST_DATABASE_URL grants and MySQL availability.`
    );
  }
}
