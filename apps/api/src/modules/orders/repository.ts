import type { SqlConnection } from '../../db.ts';

export const statuses = ['pending', 'confirmed', 'producing', 'shipping', 'completed', 'cancelled'];
export function getOrder(db: SqlConnection, id: string) {
  return db.query('SELECT * FROM orders WHERE id=$1', [id]);
}
export function getItems(db: SqlConnection, id: string) {
  return db.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY position', [id]);
}
export function getHistory(db: SqlConnection, id: string) {
  return db.query('SELECT * FROM order_status_events WHERE order_id=$1 ORDER BY order_version', [
    id
  ]);
}
export function addEvent(
  db: SqlConnection,
  id: string,
  orderId: string,
  version: number,
  from: unknown,
  to: string,
  actor: string,
  note: string | null = null
) {
  return db.query(
    'INSERT INTO order_status_events(id,order_id,order_version,from_status,to_status,actor,internal_note) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [id, orderId, version, from, to, actor, note]
  );
}
