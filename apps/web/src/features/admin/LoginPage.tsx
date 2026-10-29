import { useState } from 'react';
import type { AdminAuth } from './useAdminAuth';
export default function LoginPage({ auth }: { auth: AdminAuth }) {
  const [username, setUsername] = useState('admin'),
    [password, setPassword] = useState('');
  return (
    <section className="admin-login">
      <h1>Đăng nhập quản trị</h1>
      <form
        onSubmit={async e => {
          e.preventDefault();
          try {
            await auth.login(username, password);
          } finally {
            setPassword('');
          }
        }}
        aria-busy={auth.busy}
      >
        <fieldset disabled={auth.busy}>
          <label>
            Tài khoản
            <input
              required
              maxLength={80}
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </label>
          <label>
            Mật khẩu
            <input
              required
              type="password"
              maxLength={256}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
          <button className="button primary" type="submit">
            {auth.busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </fieldset>
      </form>
      {auth.message && (
        <p className="error" role="alert">
          {auth.message}
        </p>
      )}
      <a href="/">← Về cửa hàng</a>
    </section>
  );
}
