import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(fileURLToPath(new URL('../', import.meta.url)));
const inside = (root, path) => {
  const part = relative(root, path);
  return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`));
};

export async function makeProductionEnv(options) {
  if (!options.out) throw new Error('--out is required and its parent directory must exist.');
  const requested = resolve(options.out);
  const root = await realpath(repository);
  if (inside(repository, requested) || inside(root, requested))
    throw new Error('Production env must be written outside the repository.');
  let parent;
  try {
    parent = await realpath(dirname(requested));
  } catch {
    throw new Error('Output parent directory must already exist.');
  }
  const output = join(parent, basename(requested));
  if (inside(root, output))
    throw new Error('Production env must be written outside the repository.');
  let existing;
  try {
    existing = await lstat(output);
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot inspect output file.');
  }
  if (existing && (!existing.isFile() || existing.isSymbolicLink() || existing.nlink !== 1))
    throw new Error('Refusing symlink, hardlink or non-file output.');
  if (existing && !options.force)
    throw new Error('Output exists; use --force only to replace it deliberately.');
  if (!!options.s3Bucket !== !!options.awsRegion)
    throw new Error('--s3-bucket and --aws-region must be provided together.');
  if (
    options.s3Bucket &&
    (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(options.s3Bucket) ||
      /\.\.|\.-|-\./.test(options.s3Bucket))
  )
    throw new Error('Invalid S3 bucket name.');
  if (options.awsRegion && !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(options.awsRegion))
    throw new Error('Invalid AWS region.');
  if (
    options.image &&
    !/^(?:docker\.io\/)?[a-z0-9][a-z0-9_-]*\/harmea-web:v\d+(?:\.\d+\.\d+)?(?:@sha256:[a-f0-9]{64})?$/.test(
      options.image
    )
  )
    throw new Error('--image must be a versioned Docker Hub harmea-web image.');
  const template = await readFile(join(repository, '.env.example'), 'utf8');
  const values = Object.fromEntries(
    template
      .split(/\r?\n/)
      .filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
  Object.assign(values, {
    NODE_ENV: 'production',
    PORT: '3000',
    APP_URL: 'https://harmea.introd.xyz',
    MYSQL_PASSWORD: randomBytes(32).toString('hex'),
    MYSQL_ROOT_PASSWORD: randomBytes(32).toString('hex'),
    LOOKUP_SECRET: randomBytes(32).toString('hex'),
    UPLOAD_DIR: '/app/storage/uploads',
    STORAGE_DRIVER: options.s3Bucket ? 's3' : 'local',
    ADMIN_ENABLED: 'false'
  });
  values.DATABASE_URL = `mysql://${encodeURIComponent(values.MYSQL_USER)}:${values.MYSQL_PASSWORD}@db:3306/${encodeURIComponent(values.MYSQL_DATABASE)}`;
  if (options.s3Bucket)
    Object.assign(values, { S3_BUCKET: options.s3Bucket, AWS_REGION: options.awsRegion });
  if (options.image) values.APP_IMAGE = options.image;
  if (
    Object.entries(values).some(
      ([key, value]) =>
        (key.startsWith('AWS_') && key !== 'AWS_REGION') ||
        value.includes('CHANGE_ME') ||
        /[\r\n]/.test(value)
    )
  )
    throw new Error('Template has an unsupported placeholder or unsafe variable.');
  const content =
    '# Private production environment. Send separately; exclude from Git and handoff archives.\n' +
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') +
    '\n';
  const target = options.force
    ? join(parent, `.harmea-env-${randomBytes(12).toString('hex')}.tmp`)
    : output;
  let handle;
  let created = false;
  try {
    handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    created = true;
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    if (options.force) await rename(target, output);
  } catch {
    await handle?.close().catch(() => undefined);
    if (created) await unlink(target).catch(() => undefined);
    throw new Error('Could not write the private output file; no secret was printed.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--help') {
      console.log(
        'Usage: npm run env:prod -- --out <existing-directory/file> [--force] [--image user/harmea-web:vN] [--s3-bucket name --aws-region region]'
      );
    } else {
      const options = {};
      const names = {
        '--out': 'out',
        '--s3-bucket': 's3Bucket',
        '--aws-region': 'awsRegion',
        '--image': 'image'
      };
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--force' && !options.force) {
          options.force = true;
          continue;
        }
        const key = names[args[i]];
        if (!key || options[key] || !args[i + 1] || args[i + 1].startsWith('--'))
          throw new Error('Unknown, duplicate or incomplete argument; use --help.');
        options[key] = args[++i];
      }
      await makeProductionEnv(options);
      console.log('Private production env created outside the repository. Transfer it separately.');
      if (!options.image) console.log('Set APP_IMAGE to the tested version before deployment.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
