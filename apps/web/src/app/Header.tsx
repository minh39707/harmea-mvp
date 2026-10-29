import type { Shop } from './useShop';
import Bag from '../shared/ui/BagIcon';

export default function Header({
  go,
  view,
  count,
  setTracking
}: Pick<Shop, 'go' | 'view' | 'count' | 'setTracking'>) {
  return (
    <>
      <div className="announcement">
        <span>Một tấm thẻ nhỏ. Một kỷ niệm luôn ở bên.</span>
        <span className="demo-label">BẢN DEMO · KHÔNG THU TIỀN</span>
      </div>
      <header>
        <button className="wordmark" onClick={() => go('product')} aria-label="Harméa — trang chủ">
          harméa<span>♪</span>
        </button>
        <nav aria-label="Điều hướng">
          <button className={view === 'product' ? 'active' : ''} onClick={() => go('product')}>
            Bộ sưu tập
          </button>
          <button
            onClick={() => {
              go('product');
              setTimeout(
                () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }),
                100
              );
            }}
          >
            Cách sử dụng
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
          <span>Giỏ hàng</span>
          <b>{count}</b>
        </button>
      </header>
    </>
  );
}
