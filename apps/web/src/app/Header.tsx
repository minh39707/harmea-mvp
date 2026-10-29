import type { Shop } from './useShop';
import Bag from '../shared/ui/BagIcon';

export default function Header({
  go,
  view,
  count,
  setTracking
}: Pick<Shop, 'go' | 'view' | 'count' | 'setTracking'>) {
  return (
    <header className="store-header">
      <div className="brand">
        <button className="wordmark" onClick={() => go('product')} aria-label="Harméa — trang chủ">
          harméa<span>♪</span>
        </button>
        <span className="demo-badge">Demo</span>
      </div>
      <nav aria-label="Điều hướng">
        <button className={view === 'product' ? 'active' : ''} onClick={() => go('product')}>
          Sản phẩm
        </button>
        <button
          className={view === 'tracking' ? 'active' : ''}
          onClick={() => {
            setTracking(null);
            go('tracking');
          }}
        >
          Tra cứu đơn
        </button>
      </nav>
      <button
        className="bag-button"
        onClick={() => go('cart')}
        aria-label={`Giỏ hàng, ${count} sản phẩm`}
      >
        <Bag />
        <b>{count}</b>
      </button>
    </header>
  );
}
