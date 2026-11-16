import type { Shop } from '../../app/useShop';
import { GIFT_MESSAGE_MAX, GIFT_MESSAGE_NOTE } from '../../shared/types';
import { IconMessage } from '../../shared/ui/Icons';

// F6: ô "Lời nhắn / Lời chúc" nằm dưới cảnh báo độ phân giải, theo ảnh minh chứng.
export default function GiftMessageField({
  draft,
  update,
  setGallery
}: Pick<Shop, 'draft' | 'update'> & { setGallery?: (gallery: 'sample' | 'preview') => void }) {
  const value = draft.giftMessage ?? '';
  return (
    <div className="gift-message-box">
      <div className="gift-message-head">
        <IconMessage size={18} color="var(--brand)" />
        <label htmlFor="card-gift-message">Lời nhắn / Lời chúc</label>
        <span id="gift-message-count" aria-live="polite">
          {value.length} / {GIFT_MESSAGE_MAX}
        </span>
      </div>
      <textarea
        id="card-gift-message"
        rows={3}
        maxLength={GIFT_MESSAGE_MAX}
        value={value}
        onChange={e => {
          update('giftMessage', e.target.value);
          setGallery?.('preview');
        }}
        placeholder={`Nhập lời nhắn hoặc lời chúc (tối đa ${GIFT_MESSAGE_MAX} ký tự)...`}
        aria-describedby="gift-message-count"
        title={GIFT_MESSAGE_NOTE}
      />
    </div>
  );
}
