import type { Shop } from './useShop';
import Bag from '../shared/ui/BagIcon';
import { Link, matchRoute, usePathname } from '../shared/router';

export default function Header({ count, setTracking }: Pick<Shop, 'count' | 'setTracking'>) {
  const pathname = usePathname();
  const routeName = matchRoute(pathname)?.route.name;
  return (
    <header className="store-header">
      <div className="brand">
        <Link className="brand-btn" to="/" aria-label="Harméa — Trang chủ">
          <img src="/images/brand-emblem.png" alt="" className="brand-emblem-icon" />
          <span className="brand-text-logo">HARMÉA</span>
        </Link>
        <span className="demo-badge">Demo</span>
      </div>
      <nav aria-label="Điều hướng chính">
        <Link to="/" aria-current={routeName === 'home' ? 'page' : undefined}>
          Trang chủ
        </Link>
        <Link
          to="/design"
          aria-current={
            routeName === 'design' || routeName === 'product-alias' ? 'page' : undefined
          }
        >
          Thiết kế
        </Link>
        <Link
          to="/track"
          aria-current={routeName === 'tracking' ? 'page' : undefined}
          onClick={() => setTracking(null)}
        >
          Tra cứu đơn
        </Link>
      </nav>
      <Link
        className="bag-button"
        to="/cart"
        aria-current={routeName === 'cart' ? 'page' : undefined}
        aria-label={`Giỏ hàng, ${count} sản phẩm`}
      >
        <Bag />
        <b>{count}</b>
      </Link>
    </header>
  );
}
