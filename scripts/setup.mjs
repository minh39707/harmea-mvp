import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';

if (!existsSync('package.json') || !existsSync('database/001_initial.sql'))
  throw new Error('Run in harmea-mvp root');
if (existsSync('.env')) {
  console.log('.env already exists; preserved. No credentials changed.');
} else {
  const password = randomBytes(18).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  const pgPassword = randomBytes(24).toString('base64url');
  let env = await readFile('.env.example', 'utf8');
  env = env
    .replace(
      'DATABASE_URL=\n',
      `DATABASE_URL=postgresql://harmea:${pgPassword}@127.0.0.1:5432/harmea\n`
    )
    .replace('POSTGRES_PASSWORD=REPLACE_WITH_GENERATED_VALUE', `POSTGRES_PASSWORD=${pgPassword}`)
    .replace('ADMIN_PASSWORD_HASH=\n', `ADMIN_PASSWORD_HASH=${salt}:${hash}\n`);
  await writeFile('.env', env, { flag: 'wx', mode: 0o600 });
  await writeFile(
    '.local-admin.txt',
    `Local demo credentials; admin authentication is still task A.\nUsername: admin\nPassword: ${password}\n`,
    { flag: 'wx', mode: 0o600 }
  );
  console.log(
    'Created .env and .local-admin.txt. Keep both private; neither belongs in Git or the handoff ZIP.'
  );
}
await mkdir('storage/uploads', { recursive: true });
console.log('Next: npm run db:migrate, npm run db:check, npm run dev');
