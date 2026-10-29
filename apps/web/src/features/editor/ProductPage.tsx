import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';
import ProductGallery from './ProductGallery';
import DesignForm from './DesignForm';
import ProductHelp from './ProductHelp';
export default function ProductPage(
  props: Pick<
    Shop,
    | 'product'
    | 'add'
    | 'draft'
    | 'update'
    | 'photo'
    | 'error'
    | 'quantity'
    | 'setQuantity'
    | 'editing'
    | 'gallery'
    | 'setGallery'
    | 'editorBusy'
    | 'updateCrop'
    | 'exportPreview'
  >
) {
  const { product } = props;
  return (
    <>
      <div className="breadcrumb">
        Harméa <span>/</span> Quà tặng âm nhạc <span>/</span> NFC Music Card
      </div>
      <section className="product-layout">
        <ProductGallery {...props} />
        <div className="product-info">
          <div className="eyebrow">
            <span className="gold-dot" /> THE SOUND OF YOUR MEMORIES
          </div>
          <h1>
            Một bài hát.
            <br />
            <em>Một người đặc biệt.</em>
          </h1>
          <p className="product-name">Harméa NFC Music Card</p>
          <p className="intro">
            Gói một bức ảnh, một lời nhắn và giai điệu của hai bạn vào chiếc thẻ nhỏ. Chạm nhẹ để mở
            lại một kỷ niệm.
          </p>
          <div className="price-row">
            <strong>{product ? money(product.unitPriceVnd) : 'Đang tải giá…'}</strong>
            <span>{product?.isDemo ? 'Giá demo · chờ nhóm xác nhận' : 'Giá dự kiến'}</span>
          </div>
          <div className="pills">
            <span>✧ Cá nhân hóa theo bạn</span>
            <span>♪ Chạm NFC mở liên kết</span>
            <span>54 × 86 mm</span>
          </div>
          <DesignForm {...props} />
        </div>
      </section>
      <ProductHelp />
    </>
  );
}
