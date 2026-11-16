import { openDatabase } from '../apps/api/src/db.ts';
import { createFileStorage } from '../apps/api/src/lib/storage/index.ts';
import { LocalFileStorage } from '../apps/api/src/lib/storage/local.ts';
import { migrateUploads } from '../apps/api/src/lib/storage/migrate.ts';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: npm run storage:migrate-s3 -- [--dry-run]');
  console.log(
    'Stop order writes first. Copies referenced local order images, verifies SHA-256, retains source files.'
  );
} else if (args.some(arg => arg !== '--dry-run')) {
  console.error('Only --dry-run and --help are supported.');
  process.exitCode = 1;
} else {
  let db;
  let destination;
  try {
    const source = new LocalFileStorage(process.env.UPLOAD_DIR ?? 'storage/uploads');
    // Dry-run does not construct an S3 client or contact any S3 endpoint.
    if (!args.includes('--dry-run'))
      destination = createFileStorage({ ...process.env, STORAGE_DRIVER: 's3' });
    db = await openDatabase();
    async function* referencedKeys() {
      let after = '';
      while (true) {
        const rows = (
          await db.query(
            'SELECT id,photo_key,preview_key FROM order_items WHERE id>? ORDER BY id LIMIT 500',
            [after]
          )
        ).rows;
        if (!rows.length) break;
        for (const row of rows) {
          yield String(row.photo_key);
          yield String(row.preview_key);
        }
        after = String(rows.at(-1).id);
      }
    }
    console.log(JSON.stringify(await migrateUploads(source, destination, referencedKeys())));
  } catch {
    console.error(
      'Upload migration failed. Check database/storage access and checksums; source files were retained.'
    );
    process.exitCode = 1;
  } finally {
    destination?.close?.();
    await db?.close();
  }
}
