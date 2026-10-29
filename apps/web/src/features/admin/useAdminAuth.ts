import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../shared/api';
import { adminSession, loginAdmin, logoutAdmin } from './client';
type AuthState = 'checking' | 'anonymous' | 'authenticated' | 'logging-out' | 'logout-failed';
export function useAdminAuth() {
  const [state, setState] = useState<AuthState>('checking'),
    [expiresAt, setExpiresAt] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const epoch = useRef(0),
    locked = useRef(false);
  function invalidate() {
    epoch.current++;
    setState('anonymous');
    setExpiresAt('');
    setMessage('Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại.');
  }
  useEffect(() => {
    const controller = new AbortController(),
      request = ++epoch.current;
    adminSession(controller.signal)
      .then(session => {
        if (request === epoch.current) {
          setExpiresAt(session.expiresAt);
          setState('authenticated');
        }
      })
      .catch(error => {
        if (!controller.signal.aborted && request === epoch.current) {
          setState('anonymous');
          if (!(error instanceof ApiError && error.status === 401))
            setMessage(error instanceof Error ? error.message : 'Không kiểm tra được phiên.');
        }
      });
    return () => {
      epoch.current++;
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (state !== 'authenticated') return;
    const timeout = setTimeout(invalidate, Math.max(0, Date.parse(expiresAt) - Date.now()));
    const verify = () => {
      const request = epoch.current;
      void adminSession()
        .then(session => {
          if (request === epoch.current) setExpiresAt(session.expiresAt);
        })
        .catch(error => {
          if (request === epoch.current && error instanceof ApiError && error.status === 401)
            invalidate();
        });
    };
    window.addEventListener('focus', verify);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('focus', verify);
    };
  }, [state, expiresAt]);
  async function login(username: string, password: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    const request = ++epoch.current;
    try {
      const session = await loginAdmin(username, password);
      if (request === epoch.current) {
        setExpiresAt(session.expiresAt);
        setState('authenticated');
      }
    } catch (error) {
      if (request === epoch.current) {
        setState('anonymous');
        setMessage(error instanceof Error ? error.message : 'Không đăng nhập được.');
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    if (locked.current) return;
    locked.current = true;
    epoch.current++;
    setBusy(true);
    setState('logging-out');
    setMessage('');
    try {
      await logoutAdmin();
      setState('anonymous');
      setExpiresAt('');
      setMessage('Đã đăng xuất.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState('anonymous');
        setExpiresAt('');
        setMessage('Phiên không còn hiệu lực.');
      } else {
        setState('logout-failed');
        setMessage('Chưa xác nhận được đăng xuất ở máy chủ. Dữ liệu đã ẩn; hãy thử đăng xuất lại.');
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { state, expiresAt, message, busy, login, logout, invalidate };
}
export type AdminAuth = ReturnType<typeof useAdminAuth>;
