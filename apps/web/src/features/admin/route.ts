import { uuidPattern } from './validation.ts';
export type AdminRoute =
  { kind: 'login' } | { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'missing' };
export function adminRoute(path: string): AdminRoute {
  if (path === '/admin/login') return { kind: 'login' };
  if (path === '/admin' || path === '/admin/orders') return { kind: 'list' };
  const match = /^\/admin\/orders\/([^/]+)$/.exec(path);
  return match && uuidPattern.test(match[1]!)
    ? { kind: 'detail', id: match[1]! }
    : { kind: 'missing' };
}
export function adminPath(route: AdminRoute) {
  return route.kind === 'detail'
    ? `/admin/orders/${route.id}`
    : route.kind === 'list'
      ? '/admin/orders'
      : '/admin/login';
}
