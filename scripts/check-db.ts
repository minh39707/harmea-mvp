import { openDatabase } from '../apps/api/src/db.ts';
const db = await openDatabase();
try {
  const products = await db.query(
    'SELECT id, name, unit_price_vnd, template_version, is_demo FROM products WHERE is_active = true'
  );
  const migrations = await db.query('SELECT name FROM schema_migrations ORDER BY name');
  console.log(
    JSON.stringify(
      {
        driver: process.env.DB_DRIVER ?? 'pglite',
        migrations: migrations.rows,
        products: products.rows
      },
      null,
      2
    )
  );
  if (products.rows.length !== 1) throw new Error('Expected exactly one active demo product');
} finally {
  await db.close();
}
