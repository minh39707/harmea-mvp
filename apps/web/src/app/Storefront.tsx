import Header from './Header';
import Footer from './Footer';
import Toast from './Toast';
import { useShop } from './useShop';
import HomePage from '../features/home/HomePage';
import ProductPage from '../features/editor/ProductPage';
import CartPage from '../features/cart/CartPage';
import CheckoutPage from '../features/checkout/CheckoutPage';
import SuccessPage from '../features/checkout/SuccessPage';
import TrackingPage from '../features/tracking/TrackingPage';
import { ContentPage, NotFoundPage } from '../features/content/ContentPages';
import type { RouteName } from '../shared/router';

export default function Storefront({ routeName }: { routeName: RouteName | 'not-found' }) {
  const shop = useShop();
  let page;
  switch (routeName) {
    case 'home':
      page = <HomePage {...shop} />;
      break;
    case 'design':
    case 'product-alias':
      page = <ProductPage {...shop} />;
      break;
    case 'cart':
      page = <CartPage {...shop} />;
      break;
    case 'checkout':
      page =
        shop.view === 'success' && shop.receipt ? (
          <SuccessPage {...shop} />
        ) : (
          <CheckoutPage {...shop} cart={shop.checkoutCart} subtotal={shop.checkoutSubtotal} />
        );
      break;
    case 'tracking':
      page = <TrackingPage {...shop} />;
      break;
    case 'about':
    case 'how-nfc-works':
    case 'faq':
    case 'shipping-policy':
    case 'returns-policy':
    case 'privacy-policy':
    case 'contact':
      page = <ContentPage name={routeName} />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <Header count={shop.count} setTracking={shop.setTracking} />
      {shop.notice && !shop.error && !shop.loadError && <Toast {...shop} />}
      {(shop.loadError || shop.error) && (
        <div className="toast error" role="alert">
          {shop.loadError || shop.error}
          {shop.loadError ? (
            <button onClick={shop.fetchProduct}>Thử tải lại</button>
          ) : (
            <button onClick={() => shop.setError('')}>Đóng thông báo</button>
          )}
        </div>
      )}
      {shop.product?.isActive === false && (
        <div className="toast" role="status">
          Tạm ngừng nhận đơn
        </div>
      )}
      <main id="main-content" tabIndex={-1}>
        {page}
      </main>
      <Footer />
    </>
  );
}
