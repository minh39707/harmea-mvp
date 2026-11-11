import { openDatabase } from '../apps/api/src/db.ts';
import {
  lookupPhoneHash,
  lookupSecret,
  normalizePhone
} from '../apps/api/src/modules/orders/lookup.ts';

const secret = lookupSecret();
const db = await openDatabase();
try {
  const rows = await db.query(
    'SELECT id,recipient_snapshot FROM orders WHERE lookup_phone_hash IS NULL ORDER BY created_at,id'
  );
  const digests = rows.rows.map(row => {
    const recipient =
      typeof row.recipient_snapshot === 'string'
        ? JSON.parse(row.recipient_snapshot)
        : row.recipient_snapshot;
    return { id: row.id, digest: lookupPhoneHash(normalizePhone(recipient?.phone), secret) };
  });
  await db.transaction(async tx => {
    for (const row of digests)
      await tx.query(
        'UPDATE orders SET lookup_phone_hash=? WHERE id=? AND lookup_phone_hash IS NULL',
        [row.digest, row.id]
      );
  });
  const remaining = await db.query(
    'SELECT CAST(COUNT(*) AS UNSIGNED) AS total FROM orders WHERE lookup_phone_hash IS NULL'
  );
  if (Number(remaining.rows[0]?.total ?? 0) !== 0)
    throw new Error('Phone lookup backfill is incomplete; no customer data was printed.');
  console.log(`Backfilled phone lookup hashes for ${digests.length} order(s).`);
  console.log(
    'Next: run npm run db:migrate to apply the final NOT NULL and token removal migration.'
  );
} catch {
  console.error(
    'Phone lookup backfill failed. Check the stored recipient phone formats; no phone values were printed.'
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
