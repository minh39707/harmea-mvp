import type { AdminRoute } from './route';
import { useAdminOrders } from './useAdminOrders';
import OrderList from './OrderList';
import OrderDetail from './OrderDetail';
export default function Dashboard({
  route,
  navigate,
  onUnauthorized
}: {
  route: AdminRoute;
  navigate: (route: AdminRoute) => void;
  onUnauthorized: () => void;
}) {
  const orders = useAdminOrders(route, onUnauthorized);
  return (
    <>
      {orders.error && (
        <p className="error" role="alert">
          {orders.error}
        </p>
      )}
      {orders.notice && (
        <p className="admin-notice" role="status">
          {orders.notice}
        </p>
      )}
      {route.kind === 'detail' ? (
        <OrderDetail
          orders={orders}
          back={() => navigate({ kind: 'list' })}
          onUnauthorized={onUnauthorized}
        />
      ) : (
        <OrderList orders={orders} open={id => navigate({ kind: 'detail', id })} />
      )}
    </>
  );
}
