import { createApp } from './app.ts';
import { openDatabase } from './db.ts';
const db = await openDatabase();

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp(db).listen(port, host, () => {
  console.log(`Harméa store: http://${host}:${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () =>
    server.close(async () => {
      await db.close();
      process.exit(0);
    })
  );
}
