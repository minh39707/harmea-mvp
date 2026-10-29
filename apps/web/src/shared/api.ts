export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(
    '/api' + path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      : {}
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message ?? 'Không kết nối được. Thử lại nhé.');
  return data as T;
}
