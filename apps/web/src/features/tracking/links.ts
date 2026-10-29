export function trackingToken(value: string) {
  let token = value.trim();
  if (token.startsWith('#')) token = token.slice(1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    let url: URL;
    try {
      url = new URL(token, 'http://localhost');
    } catch {
      throw Error('Kiểm tra liên kết theo dõi hoặc mã bí mật.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/track' || url.search)
      throw Error('Liên kết theo dõi cần có dạng /track# mã bí mật.');
    token = url.hash.slice(1);
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw Error('Kiểm tra liên kết theo dõi hoặc mã bí mật.');
  return token;
}
export function trackingLink(origin: string, token: string) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw Error('Địa chỉ trang không hợp lệ.');
  return `${url.origin}/track#${trackingToken(token)}`;
}
