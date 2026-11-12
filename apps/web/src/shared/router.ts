import { createElement, useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

export const routeTable = [
  {
    name: 'home',
    path: '/',
    title: 'Harméa — Thẻ NFC lưu giữ giai điệu',
    description: 'Tạo mẫu thẻ NFC cá nhân hóa trong bản demo Harméa.'
  },
  {
    name: 'design',
    path: '/design',
    title: 'Thiết kế thẻ — Harméa',
    description: 'Tùy chỉnh mẫu thẻ Harméa trong trình thiết kế.'
  },
  {
    name: 'product-alias',
    path: '/product',
    title: 'Thiết kế thẻ — Harméa',
    description: 'Tùy chỉnh mẫu thẻ Harméa trong trình thiết kế.',
    redirect: '/design'
  },
  {
    name: 'cart',
    path: '/cart',
    title: 'Giỏ hàng — Harméa',
    description: 'Xem các thiết kế đang lưu trong giỏ hàng Harméa.'
  },
  {
    name: 'checkout',
    path: '/checkout',
    title: 'Thông tin đặt hàng — Harméa',
    description: 'Gửi thông tin đặt hàng cho bản demo Harméa.'
  },
  {
    name: 'tracking',
    path: '/track',
    title: 'Tra cứu đơn hàng — Harméa',
    description: 'Tra cứu tiến độ đơn hàng bằng mã đơn và số điện thoại.'
  },
  {
    name: 'about',
    path: '/about',
    title: 'Về Harméa',
    description: 'Tìm hiểu về ý tưởng thẻ NFC lưu giữ kỷ niệm của Harméa.'
  },
  {
    name: 'how-nfc-works',
    path: '/how-nfc-works',
    title: 'NFC hoạt động thế nào? — Harméa',
    description: 'Thông tin cơ bản về cách điện thoại mở liên kết NFC.'
  },
  {
    name: 'faq',
    path: '/faq',
    title: 'Câu hỏi thường gặp — Harméa',
    description: 'Câu trả lời về thiết kế, NFC, đặt hàng và tra cứu đơn.'
  },
  {
    name: 'shipping-policy',
    path: '/policies/shipping',
    title: 'Chính sách giao hàng — Harméa',
    description: 'Thông tin giao hàng đang chờ Harméa xác nhận.'
  },
  {
    name: 'returns-policy',
    path: '/policies/returns',
    title: 'Đổi trả — Harméa',
    description: 'Thông tin đổi trả đang chờ Harméa xác nhận.'
  },
  {
    name: 'privacy-policy',
    path: '/policies/privacy',
    title: 'Quyền riêng tư — Harméa',
    description: 'Cách bản demo Harméa lưu và xử lý dữ liệu đặt hàng.'
  },
  {
    name: 'contact',
    path: '/contact',
    title: 'Liên hệ — Harméa',
    description: 'Thông tin liên hệ chính thức đang chờ Harméa xác nhận.'
  },
  {
    name: 'admin',
    path: '/admin',
    title: 'Quản trị — Harméa',
    description: 'Trang quản trị Harméa.'
  },
  {
    name: 'admin-orders',
    path: '/admin/orders',
    title: 'Đơn hàng — Quản trị Harméa',
    description: 'Quản lý đơn hàng Harméa.'
  },
  {
    name: 'admin-order',
    path: '/admin/orders/:id',
    title: 'Chi tiết đơn — Quản trị Harméa',
    description: 'Chi tiết đơn hàng Harméa.'
  },
  {
    name: 'admin-products',
    path: '/admin/products',
    title: 'Sản phẩm — Quản trị Harméa',
    description: 'Quản lý sản phẩm Harméa.'
  },
  {
    name: 'admin-stats',
    path: '/admin/stats',
    title: 'Thống kê — Quản trị Harméa',
    description: 'Thống kê đơn hàng Harméa.'
  }
] as const;

export type RouteDefinition = (typeof routeTable)[number];
export type RouteName = RouteDefinition['name'];
export type RouteMatch = { route: RouteDefinition; params: Record<string, string> };
export const notFoundRoute = {
  name: 'not-found',
  path: null,
  title: 'Không tìm thấy trang — Harméa',
  description: 'Trang bạn tìm không tồn tại hoặc đã được chuyển.'
} as const;

function normalizePath(pathname: string) {
  if (!pathname.startsWith('/')) return null;
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.replace(/\/+$/, '');
  return pathname;
}

export function matchRoute(pathname: string): RouteMatch | null {
  let path: string;
  try {
    const url = new URL(pathname, 'http://router.local');
    if (url.origin !== 'http://router.local') return null;
    path = normalizePath(url.pathname) ?? '';
  } catch {
    return null;
  }
  const incoming = path.split('/').filter(Boolean);

  for (const route of routeTable) {
    const pattern = route.path.split('/').filter(Boolean);
    if (pattern.length !== incoming.length) continue;
    const params: Record<string, string> = {};
    let matches = true;
    for (let index = 0; index < pattern.length; index += 1) {
      const expected = pattern[index]!;
      const actual = incoming[index]!;
      if (expected.startsWith(':')) {
        try {
          const value = decodeURIComponent(actual);
          if (!value || value.includes('/') || value.includes('\\')) {
            matches = false;
            break;
          }
          params[expected.slice(1)] = value;
        } catch {
          matches = false;
          break;
        }
      } else if (expected !== actual) {
        matches = false;
        break;
      }
    }
    if (matches) return { route, params };
  }
  return null;
}

export function resolveInternalDestination(destination: string, baseUrl: string): string | null {
  try {
    const base = new URL(baseUrl);
    const target = new URL(destination, base);
    if (
      target.origin !== base.origin ||
      target.username ||
      target.password ||
      !['http:', 'https:'].includes(target.protocol)
    )
      return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

type RouterWindow = Pick<Window, 'location' | 'history' | 'scrollTo'>;
type NavigateOptions = { replace?: boolean };

let currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
const subscribers = new Set<() => void>();
let popstateListening = false;

function publishPath(pathname: string, scroll: boolean) {
  const changed = pathname !== currentPath;
  currentPath = pathname;
  if (changed && scroll && typeof window !== 'undefined')
    window.scrollTo({ top: 0, behavior: 'auto' });
  for (const subscriber of subscribers) subscriber();
}

function handlePopState() {
  if (typeof window !== 'undefined') publishPath(window.location.pathname, true);
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  if (!popstateListening && typeof window !== 'undefined') {
    window.addEventListener('popstate', handlePopState);
    popstateListening = true;
  }
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && popstateListening && typeof window !== 'undefined') {
      window.removeEventListener('popstate', handlePopState);
      popstateListening = false;
    }
  };
}

export function navigate(
  destination: string,
  options: NavigateOptions = {},
  browser: RouterWindow | null = typeof window === 'undefined' ? null : window
) {
  if (!browser) return false;
  const next = resolveInternalDestination(destination, browser.location.href);
  if (!next) return false;
  const current = `${browser.location.pathname}${browser.location.search}${browser.location.hash}`;
  if (next === current) return true;
  if (options.replace) browser.history.replaceState(null, '', next);
  else browser.history.pushState(null, '', next);
  publishPath(
    browser.location.pathname,
    browser === (typeof window === 'undefined' ? null : window)
  );
  return true;
}

export function usePathname() {
  return useSyncExternalStore(
    subscribe,
    () => currentPath,
    () => '/'
  );
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
  replace?: boolean;
};

export function Link({ to, replace = false, onClick, children, ...props }: LinkProps) {
  const baseUrl = typeof window === 'undefined' ? 'http://router.local/' : window.location.href;
  const href = resolveInternalDestination(to, baseUrl);
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (!href) {
      event.preventDefault();
      return;
    }
    if (
      props.target ||
      props.download !== undefined ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(href, { replace });
  }
  return createElement(
    'a',
    {
      ...props,
      href: href ?? '#',
      onClick: handleClick,
      'aria-disabled': href ? props['aria-disabled'] : true
    },
    children
  );
}

export function applyRouteMetadata(
  route: RouteDefinition | typeof notFoundRoute,
  pathname: string,
  browser: Pick<Window, 'location'> | null = typeof window === 'undefined' ? null : window
) {
  if (typeof document === 'undefined' || !browser) return;
  const isPrivate = [
    'cart',
    'checkout',
    'tracking',
    'admin',
    'admin-orders',
    'admin-order',
    'admin-products',
    'admin-stats'
  ].includes(route.name);
  document.title = route.title;
  const canonicalPath = route.name === 'product-alias' ? route.redirect : pathname;

  const setMeta = (selector: string, attributes: Record<string, string>) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement('meta');
      document.head.append(element);
    }
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  };
  setMeta('meta[name="description"]', { name: 'description', content: route.description });
  setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  setMeta('meta[property="og:title"]', { property: 'og:title', content: route.title });
  setMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: route.description
  });
  setMeta('meta[property="og:url"]', {
    property: 'og:url',
    content: new URL(canonicalPath, browser.location.origin).href
  });
  setMeta('meta[property="og:image"]', {
    property: 'og:image',
    content: new URL('/images/brand-emblem.png', browser.location.origin).href
  });
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: route.title });
  setMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: route.description
  });
  setMeta('meta[name="twitter:image"]', {
    name: 'twitter:image',
    content: new URL('/images/brand-emblem.png', browser.location.origin).href
  });
  setMeta('meta[name="robots"]', {
    name: 'robots',
    content: isPrivate || route.name === 'not-found' ? 'noindex, nofollow' : 'index, follow'
  });

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = new URL(canonicalPath, browser.location.origin).href;

  const referrer = document.head.querySelector<HTMLMetaElement>('meta[name="referrer"]');
  if (route.name === 'tracking') {
    setMeta('meta[name="referrer"]', { name: 'referrer', content: 'no-referrer' });
  } else if (referrer) {
    referrer.remove();
  }
}
