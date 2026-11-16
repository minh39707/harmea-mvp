// Executed by Node inside a one-off app container; no host Node/AWS tools required.
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  chmod,
  chown,
  lstat,
  readFile,
  readdir,
  realpath,
  rm,
  unlink,
  writeFile
} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

const run = promisify(execFile);
const secretHash = value => createHash('sha256').update(value).digest('hex');
const within = (root, path) => {
  const part = relative(root, path);
  return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`));
};
export function snapshotMetadata(env, storageRoot = '/app/storage') {
  const storageDriver = env.STORAGE_DRIVER || 'local';
  if (!['local', 's3'].includes(storageDriver)) throw new Error('Unsupported storage driver.');
  if (!env.LOOKUP_SECRET || Buffer.byteLength(env.LOOKUP_SECRET) < 32)
    throw new Error('LOOKUP_SECRET must be configured.');
  if (
    !/^[a-zA-Z0-9_]{1,64}$/.test(env.MYSQL_DATABASE ?? '') ||
    ['mysql', 'sys', 'information_schema', 'performance_schema'].includes(
      env.MYSQL_DATABASE.toLowerCase()
    )
  )
    throw new Error('Refusing a missing or system database name.');
  const uploadDir = resolve(env.UPLOAD_DIR ?? join(storageRoot, 'uploads'));
  if (storageDriver === 'local' && !within(resolve(storageRoot), uploadDir))
    throw new Error('Local UPLOAD_DIR must be inside the storage volume.');
  if (storageDriver === 's3' && (!env.S3_BUCKET || !env.AWS_REGION))
    throw new Error('S3 bucket and region must be configured.');
  return {
    format: 1,
    createdAt: new Date().toISOString(),
    storageDriver,
    database: env.MYSQL_DATABASE,
    lookupSecretSha256: secretHash(env.LOOKUP_SECRET),
    uploadPath: storageDriver === 'local' ? relative(resolve(storageRoot), uploadDir) : null,
    bucket: storageDriver === 's3' ? env.S3_BUCKET : null,
    region: storageDriver === 's3' ? env.AWS_REGION : null
  };
}

async function regularFile(path, maxBytes = Infinity) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > maxBytes)
    throw new Error('Invalid snapshot file.');
  return stat;
}
async function digest(path) {
  await regularFile(path);
  const hash = createHash('sha256');
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}
async function manifest(dir) {
  await regularFile(join(dir, 'manifest.json'), 16384);
  const result = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  if (result.format !== 1 || !['local', 's3'].includes(result.storageDriver))
    throw new Error('Unsupported snapshot manifest.');
  return result;
}
const filesFor = metadata => [
  'db.sql',
  'manifest.json',
  ...(metadata.storageDriver === 'local' ? ['uploads.tar'] : [])
];

export async function validateArchive(archive, tar = 'tar') {
  const options = { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 };
  const listing = await run(
    tar,
    ['--force-local', '-tf', archive, '--quoting-style=escape'],
    options
  );
  for (const path of listing.stdout.split('\n').filter(Boolean)) {
    if (path === '.' || path === './') continue;
    const stripped = path.replace(/^\.\//, '').replace(/\/$/, '');
    if (
      stripped.startsWith('/') ||
      stripped
        .split('/')
        .some(part => !/^[a-zA-Z0-9_.-]+$/.test(part) || ['.', '..'].includes(part))
    )
      throw new Error('Unsafe archive path.');
  }
  const verbose = await run(tar, ['--force-local', '-tvf', archive, '--numeric-owner'], options);
  if (
    verbose.stdout
      .split('\n')
      .filter(Boolean)
      .some(line => !['-', 'd'].includes(line[0]))
  )
    throw new Error('Snapshot archives may only contain regular files and directories.');
}

export async function sealSnapshot(dir, tar = 'tar', owner) {
  const meta = await manifest(dir);
  if (!(await regularFile(join(dir, 'db.sql'))).size) throw new Error('Database dump is empty.');
  if (meta.storageDriver === 'local') await validateArchive(join(dir, 'uploads.tar'), tar);
  const sums = [];
  for (const name of filesFor(meta)) {
    await chmod(join(dir, name), 0o600);
    sums.push(`${await digest(join(dir, name))}  ${name}`);
  }
  await writeFile(join(dir, 'SHA256SUMS'), sums.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  if (owner)
    for (const name of [...filesFor(meta), 'SHA256SUMS'])
      await chown(join(dir, name), owner.uid, owner.gid);
  await unlink(join(dir, 'INCOMPLETE'));
}

export async function validateSnapshot(dir, env, storageRoot = '/app/storage', tar = 'tar') {
  try {
    await lstat(join(dir, 'INCOMPLETE'));
    throw new Error('Snapshot is incomplete.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const meta = await manifest(dir);
  await regularFile(join(dir, 'SHA256SUMS'), 4096);
  const lines = (await readFile(join(dir, 'SHA256SUMS'), 'utf8')).trim().split('\n');
  const names = filesFor(meta);
  if (lines.length !== names.length) throw new Error('Invalid checksum manifest.');
  for (let i = 0; i < names.length; i++) {
    const match = /^([a-f0-9]{64})  ([a-zA-Z0-9_.-]+)$/.exec(lines[i]);
    if (!match || match[2] !== names[i] || (await digest(join(dir, names[i]))) !== match[1])
      throw new Error('Snapshot checksum mismatch.');
  }
  const current = snapshotMetadata(env, storageRoot);
  for (const key of [
    'storageDriver',
    'database',
    'lookupSecretSha256',
    'uploadPath',
    'bucket',
    'region'
  ])
    if (meta[key] !== current[key])
      throw new Error(
        'Snapshot does not match the current database, lookup secret or storage configuration.'
      );
  if (meta.storageDriver === 'local') await validateArchive(join(dir, 'uploads.tar'), tar);
  return meta;
}

export async function restoreFiles(dir, storageRoot = '/app/storage', tar = 'tar') {
  const root = await realpath(storageRoot);
  if (
    root === resolve(sep) ||
    root === resolve('/app') ||
    within(root, await realpath(dir)) ||
    !basename(root)
  )
    throw new Error('Unsafe storage restore target.');
  await validateArchive(join(dir, 'uploads.tar'), tar);
  for (const name of await readdir(root)) {
    const path = resolve(root, name);
    if (!within(root, path) || path === root) throw new Error('Unsafe storage cleanup target.');
    await rm(path, { recursive: true, force: true });
  }
  await run(tar, [
    '--force-local',
    '-xf',
    join(dir, 'uploads.tar'),
    '-C',
    root,
    '--same-permissions'
  ]);
}

if (
  process.argv[1] === '-' ||
  (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
) {
  try {
    if (process.env.HARMEA_BACKUP_HELPER !== 'true')
      throw new Error('Backup helper requires an isolated operational container.');
    const dir = '/backup',
      root = '/app/storage',
      mode = process.argv[2];
    if (mode === 'prepare') {
      const meta = snapshotMetadata(process.env);
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(meta) + '\n', {
        flag: 'wx',
        mode: 0o600
      });
      console.log(`${meta.storageDriver} ${meta.database}`);
    } else if (mode === 'validate-live') {
      const original = Object.fromEntries(
        JSON.parse(readFileSync(0, 'utf8')).map(line => {
          const index = line.indexOf('=');
          return [line.slice(0, index), line.slice(index + 1)];
        })
      );
      const current = snapshotMetadata(original);
      const configured = await manifest(dir);
      for (const key of [
        'storageDriver',
        'database',
        'lookupSecretSha256',
        'uploadPath',
        'bucket',
        'region'
      ])
        if (current[key] !== configured[key])
          throw new Error('Configured environment differs from the existing app.');
    } else if (mode === 'archive') {
      if ((await manifest(dir)).storageDriver !== 'local')
        throw new Error('Archive is only supported for local storage.');
      await run('tar', ['--force-local', '-cf', join(dir, 'uploads.tar'), '-C', root, '.']);
    } else if (mode === 'seal') {
      const uid = Number(process.env.HARMEA_BACKUP_UID),
        gid = Number(process.env.HARMEA_BACKUP_GID);
      if (!Number.isInteger(uid) || uid < 0 || !Number.isInteger(gid) || gid < 0)
        throw new Error('Invalid backup owner.');
      await sealSnapshot(dir, 'tar', { uid, gid });
    } else if (mode === 'validate' || mode === 'restore-files') {
      const meta = await validateSnapshot(dir, process.env);
      if (mode === 'restore-files') {
        if (meta.storageDriver !== 'local')
          throw new Error('S3 restore does not write local files.');
        await restoreFiles(dir);
      } else console.log(`${meta.storageDriver} ${meta.database}`);
    } else throw new Error('Unknown backup helper mode.');
  } catch {
    console.error(
      'Snapshot operation failed: check completeness, checksums, archive paths, lookup secret and storage configuration.'
    );
    process.exitCode = 1;
  }
}
