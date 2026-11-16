import { createApp } from './app.ts';
import { openDatabase } from './db.ts';
import { lookupSecret } from './modules/orders/lookup.ts';
import { createFileStorage } from './lib/storage/index.ts';

if (process.env.NODE_ENV === 'production') lookupSecret();
const db = await openDatabase();
const storage = createFileStorage();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const server = createApp(db, { storage }).listen(port, host, () => {
  process.stdout.write(
    `${JSON.stringify({ level: 'info', event: 'server_started', host, port })}\n`
  );
});
server.on('error', error => {
  const code =
    error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN';
  process.stderr.write(`${JSON.stringify({ level: 'error', event: 'server_error', code })}\n`);
  void db.close().finally(() => {
    storage.close?.();
    process.exitCode = 1;
  });
});

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => {
      process.stderr.write(
        `${JSON.stringify({ level: 'warn', event: 'shutdown_timeout', signal })}\n`
      );
      server.closeAllConnections();
    }, 9000);
    timeout.unref();
    server.close(() => {
      clearTimeout(timeout);
      void db
        .close()
        .finally(() => storage.close?.())
        .then(() => {
          process.stdout.write(`${JSON.stringify({ level: 'info', event: 'server_stopped' })}\n`);
        })
        .catch(() => {
          process.stderr.write(
            `${JSON.stringify({ level: 'error', event: 'database_close_failed' })}\n`
          );
          process.exitCode = 1;
        });
    });
  });
}
