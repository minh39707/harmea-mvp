import type { SqlConnection } from '../../db.ts';
export function findRequest(db: SqlConnection, requestKey: string) {
  return db.query('SELECT * FROM demo_checkouts WHERE request_key=$1', [requestKey]);
}
export function activeProducts(db: SqlConnection) {
  return db.query('SELECT * FROM products WHERE is_active=true');
}
export function insertCheckout(db: SqlConnection, values: unknown[]) {
  return db.query(
    'INSERT INTO demo_checkouts(id,order_number,request_key,request_hash,tracking_hash,items,recipient,subtotal_vnd) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(request_key) DO NOTHING RETURNING *',
    values
  );
}
