import Storefront from './Storefront';
import AdminApp from '../features/admin/AdminApp';
export default function App() {
  return location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? (
    <AdminApp />
  ) : (
    <Storefront />
  );
}
