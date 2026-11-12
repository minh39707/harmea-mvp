import { usePathname, navigate as navigateRoute, Link } from '../../shared/router';
import { adminRoute, adminPath } from './route';
import type { AdminRoute } from './route';
import Dashboard from './Dashboard';
import ProductsPage from './ProductsPage';
import StatsPage from './StatsPage';

export default function AdminApp() {
  const pathname = usePathname();
  const route = adminRoute(pathname);
  function navigate(next: AdminRoute, replace = false) {
    navigateRoute(adminPath(next), { replace });
  }
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link className="wordmark" to="/">
          harméa<span>♪</span>
        </Link>
        <nav className="admin-nav" aria-label="Quản trị">
          <Link
            to="/admin/orders"
            aria-current={route.kind === 'list' || route.kind === 'detail' ? 'page' : undefined}
          >
            Đơn hàng
          </Link>
          <Link to="/admin/products" aria-current={route.kind === 'products' ? 'page' : undefined}>
            Sản phẩm
          </Link>
          <Link to="/admin/stats" aria-current={route.kind === 'stats' ? 'page' : undefined}>
            Thống kê
          </Link>
        </nav>
      </header>
      <main>
        {route.kind === 'missing' ? (
          <section>
            <h1>Không tìm thấy trang quản trị</h1>
            <button className="button secondary" onClick={() => navigate({ kind: 'list' })}>
              Mở danh sách đơn
            </button>
          </section>
        ) : route.kind === 'products' ? (
          <ProductsPage />
        ) : route.kind === 'stats' ? (
          <StatsPage />
        ) : (
          <Dashboard route={route} navigate={navigate} />
        )}
      </main>
    </div>
  );
}
