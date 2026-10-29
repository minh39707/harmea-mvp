import { useEffect, useRef, useState } from 'react';
import { adminRoute, adminPath } from './route';
import type { AdminRoute } from './route';
import { useAdminAuth } from './useAdminAuth';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

export default function AdminApp() {
  const [route, setRoute] = useState(() => adminRoute(location.pathname)),
    auth = useAdminAuth();
  const requested = useRef<AdminRoute>(route.kind === 'detail' ? route : { kind: 'list' });
  function navigate(next: AdminRoute, replace = false) {
    if (replace) history.replaceState(null, '', adminPath(next));
    else history.pushState(null, '', adminPath(next));
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  useEffect(() => {
    const changed = () => setRoute(adminRoute(location.pathname));
    window.addEventListener('popstate', changed);
    return () => window.removeEventListener('popstate', changed);
  }, []);
  useEffect(() => {
    if (auth.state === 'anonymous' && route.kind !== 'login') {
      if (route.kind === 'detail') requested.current = route;
      navigate({ kind: 'login' }, true);
    }
    if (auth.state === 'authenticated' && route.kind === 'login') navigate(requested.current, true);
  }, [auth.state, route.kind]);
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="wordmark" href="/">
          harméa<span>♪</span>
        </a>
        <span>Quản trị đơn hàng</span>
        {auth.state === 'authenticated' && (
          <button
            className="button secondary"
            disabled={auth.busy}
            onClick={() => void auth.logout()}
          >
            Đăng xuất
          </button>
        )}
      </header>
      <main>
        {auth.state === 'checking' && <p role="status">Đang kiểm tra phiên…</p>}
        {auth.state === 'logging-out' && <p role="status">Đang đăng xuất…</p>}
        {auth.state === 'logout-failed' && (
          <section className="admin-login">
            <p className="error" role="alert">
              {auth.message}
            </p>
            <button
              className="button primary"
              disabled={auth.busy}
              onClick={() => void auth.logout()}
            >
              Thử đăng xuất lại
            </button>
            <p>
              <a href="/">Về cửa hàng</a>
            </p>
          </section>
        )}
        {auth.state === 'anonymous' && <LoginPage auth={auth} />}
        {auth.state === 'authenticated' &&
          (route.kind === 'missing' ? (
            <section>
              <h1>Không tìm thấy trang quản trị</h1>
              <button className="button secondary" onClick={() => navigate({ kind: 'list' })}>
                Mở danh sách đơn
              </button>
            </section>
          ) : route.kind === 'login' ? (
            <p role="status">Đang mở đơn hàng…</p>
          ) : (
            <Dashboard route={route} navigate={navigate} onUnauthorized={auth.invalidate} />
          ))}
      </main>
    </div>
  );
}
