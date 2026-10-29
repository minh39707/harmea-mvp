export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  options: { method?: string; signal?: AbortSignal } = {}
): Promise<T> {
  const form = body instanceof FormData;
  const r = await fetch('/api' + path, {
    method: options.method ?? (body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    cache: 'no-store',
    signal: options.signal,
    ...(body === undefined
      ? {}
      : {
          headers: form ? {} : { 'Content-Type': 'application/json' },
          body: form ? body : JSON.stringify(body)
        })
  }).catch(() => {
    throw new ApiError(
      'Không kết nối được hoặc đã hết thời gian chờ. Vui lòng thử lại.',
      0,
      'NETWORK_ERROR'
    );
  });
  if (r.status === 204) return undefined as T;
  let data;
  try {
    data = await r.json();
  } catch {
    throw new ApiError('Không đọc được phản hồi của máy chủ.', r.status, 'INVALID_RESPONSE');
  }
  if (!r.ok)
    throw new ApiError(
      typeof data?.error?.message === 'string'
        ? data.error.message.slice(0, 500)
        : 'Không thể xử lý yêu cầu.',
      r.status,
      typeof data?.error?.code === 'string' ? data.error.code : 'REQUEST_FAILED'
    );
  return data as T;
}
