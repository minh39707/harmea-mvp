import type { Shop } from './useShop';

export default function Toast({ notice, go }: Pick<Shop, 'notice' | 'go'>) {
  return (
    <div className="toast" role="status">
      ✓ {notice}
      <button onClick={() => go('cart')}>Xem giỏ →</button>
    </div>
  );
}
