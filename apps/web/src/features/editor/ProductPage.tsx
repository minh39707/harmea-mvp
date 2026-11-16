import type { Shop } from '../../app/useShop';
import ProductGallery from './ProductGallery';
import DesignForm from './DesignForm';
import ProductHelp from './ProductHelp';

export default function ProductPage(
  props: Pick<
    Shop,
    | 'product'
    | 'add'
    | 'addAsNew'
    | 'draft'
    | 'update'
    | 'photo'
    | 'photoStats'
    | 'error'
    | 'quantity'
    | 'setQuantity'
    | 'editing'
    | 'editingPosition'
    | 'cart'
    | 'edit'
    | 'startNewDesign'
    | 'gallery'
    | 'setGallery'
    | 'editorBusy'
    | 'saveStatus'
    | 'updateCrop'
    | 'exportPreview'
  >
) {
  return (
    <div className="product-page-container">
      <section className="product-layout">
        <ProductGallery {...props} />
        <DesignForm {...props} />
      </section>
      <div className="section-divider" aria-hidden="true" />
      <ProductHelp />
    </div>
  );
}
