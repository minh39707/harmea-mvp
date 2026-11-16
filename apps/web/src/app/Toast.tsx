import type { Shop } from './useShop';
import { IconCheck } from '../shared/ui/Icons';

export default function Toast({ notice, go }: Pick<Shop, 'notice' | 'go'>) {
  return (
    <div className="toast" role="status">
      <span className="toast-icon">
        <IconCheck size={16} />
      </span>
      <span>{notice}</span>
      <button onClick={() => go('cart')}>Xem giỏ →</button>
    </div>
  );
}
