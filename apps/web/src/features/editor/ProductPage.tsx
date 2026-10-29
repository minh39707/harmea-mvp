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
      <section className="product-layout">
        <ProductGallery {...props} />
        <div className="product-info">
          <h1>
            Thẻ nhạc <em>của riêng bạn.</em>
          </h1>
          <p className="intro">
            Một bức ảnh và một bài hát trên thẻ Harméa NFC, dành cho người bạn muốn gửi tặng.
          </p>
          <div className="price-row">
            <strong>{product ? money(product.unitPriceVnd) : 'Đang tải giá…'}</strong>
            <span className="note">{product?.isDemo ? 'Giá demo' : 'Giá dự kiến'}</span>
          </div>
          <DesignForm {...props} />
        </div>
      </section>
      <ProductHelp />
    </>
  );
}
