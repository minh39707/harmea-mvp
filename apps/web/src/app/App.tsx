import { useEffect } from 'react';
import Storefront from './Storefront';
import AdminApp from '../features/admin/AdminApp';
import {
  applyRouteMetadata,
  matchRoute,
  navigate,
  notFoundRoute,
  usePathname
} from '../shared/router';

export default function App() {
  const pathname = usePathname();
  const match = matchRoute(pathname);
  const route = match?.route;
  const isAdmin = route?.name.startsWith('admin') ?? false;

  useEffect(() => {
    if (route && 'redirect' in route && route.redirect) {
      navigate(route.redirect, { replace: true });
      return;
    }
    applyRouteMetadata(route ?? notFoundRoute, pathname);
  }, [pathname, route]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }, [pathname]);

  if (isAdmin) return <AdminApp />;
  return <Storefront routeName={route?.name ?? 'not-found'} />;
}
