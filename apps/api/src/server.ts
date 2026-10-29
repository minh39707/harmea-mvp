import { createApp } from './app.ts';
import { openDatabase } from './db.ts';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
await mkdir('storage',{recursive:true});
let secret:string;
try{secret=await readFile('storage/checkout-secret','utf8');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;secret=randomBytes(32).toString('hex');await writeFile('storage/checkout-secret',secret,{flag:'wx',mode:0o600});}
const db=await openDatabase();

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';
const server = createApp(db,secret).listen(port, host, () => {
  console.log(`Harméa store: http://${host}:${port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close(async () => {await db.close();process.exit(0);}));
}
