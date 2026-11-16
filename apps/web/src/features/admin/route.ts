import { uuidPattern } from './validation.ts';
import { matchRoute } from '../../shared/router.ts';
export type AdminRoute =
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'products' }
  | { kind: 'stats' }
  | { kind: 'missing' };
export function adminRoute(path: string): AdminRoute {
  const match = matchRoute(path);
  if (!match) return { kind: 'missing' };
  switch (match.route.name) {
    case 'admin':
    case 'admin-orders':
      return { kind: 'list' };
    case 'admin-products':
      return { kind: 'products' };
    case 'admin-stats':
      return { kind: 'stats' };
    case 'admin-order': {
      const id = match.params.id;
      return id && uuidPattern.test(id) ? { kind: 'detail', id } : { kind: 'missing' };
    }
    default:
      return { kind: 'missing' };
  }
}
export function adminPath(route: AdminRoute) {
  if (route.kind === 'detail') return `/admin/orders/${route.id}`;
  if (route.kind === 'list') return '/admin/orders';
  if (route.kind === 'products') return '/admin/products';
  if (route.kind === 'stats') return '/admin/stats';
  return '/admin';
}
