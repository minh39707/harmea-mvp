import Header from './Header';
import Footer from './Footer';
import Toast from './Toast';
import { useShop } from './useShop';
import ProductPage from '../features/editor/ProductPage';
import CartPage from '../features/cart/CartPage';
import CheckoutPage from '../features/checkout/CheckoutPage';
import SuccessPage from '../features/checkout/SuccessPage';
import TrackingPage from '../features/tracking/TrackingPage';
export default function Storefront() {
  const shop = useShop();
  return (
    <>
      <Header {...shop} />
      {shop.notice && <Toast {...shop} />}
      <main>
        {shop.loadError && (
          <div className="error" role="alert">
            {shop.loadError}
            <button onClick={shop.fetchProduct}>Thử lại</button>
          </div>
        )}
        {shop.view === 'product' && <ProductPage {...shop} />}
        {shop.view === 'cart' && <CartPage {...shop} />}
        {shop.view === 'checkout' && <CheckoutPage {...shop} />}
        {shop.view === 'success' && shop.receipt && <SuccessPage {...shop} />}
        {shop.view === 'tracking' && <TrackingPage {...shop} />}
      </main>
      <Footer {...shop} />
    </>
  );
}
