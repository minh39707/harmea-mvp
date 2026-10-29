import { useEffect, useRef, useState } from 'react';
import type { Design, Item, Product, Receipt, PublicTracking, View } from '../shared/types';
import { blankDesign as blank } from '../shared/types';
import { api } from '../shared/api';
import { loadCart, saveCart } from '../features/cart/cart-storage';
import { removeAssets } from '../features/editor/asset-store';
import { useEditor } from '../features/editor/useEditor';
import { useCheckout } from '../features/checkout/useCheckout';
import { trackingLink } from '../features/tracking/links';
import { useTracking } from '../features/tracking/useTracking';
export function useShop() {
  const [product, setProduct] = useState<Product | null>(null),
    [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState<Item[]>(loadCart),
    [view, setView] = useState<View>(location.pathname === '/track' ? 'tracking' : 'product');
  const [draft, setDraft] = useState<Design>({ ...blank }),
    [quantity, setQuantity] = useState(1),
    [editing, setEditing] = useState<string | null>(null);
  const [gallery, setGallery] = useState<'sample' | 'preview'>('sample'),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [tracking, setTracking] = useState<PublicTracking | null>(null),
    [trackInput, setTrackInput] = useState(location.hash.slice(1));
  const [recipient, setRecipient] = useState({ name: '', phone: '', address: '', note: '' }),
    [confirmed, setConfirmed] = useState(false);
  const count = cart.reduce((n, i) => n + i.quantity, 0),
    subtotal = cart.reduce((n, i) => n + i.quantity * (product?.unitPriceVnd ?? 0), 0);
  const fetchProduct = () => {
    setLoadError('');
    api<Product>('/products/current')
      .then(setProduct)
      .catch(e => setLoadError(e.message));
  };
  const previousCart = useRef(cart);
  useEffect(fetchProduct, []);
  useEffect(() => {
    try {
      setConfirmed(false);
      saveCart(cart);
      const retained = new Set(cart.map(i => i.assetKey));
      for (const item of previousCart.current)
        if (item.assetKey && !retained.has(item.assetKey))
          void removeAssets(item.assetKey).catch(() =>
            setError('Không xóa được ảnh khỏi bộ nhớ thiết bị.')
          );
      previousCart.current = cart;
    } catch {
      setError('Bộ nhớ trình duyệt đầy. Giảm ảnh trong giỏ để lưu khi tải lại.');
    }
  }, [cart]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  function go(next: View) {
    if (busy && view === 'checkout' && next !== 'success') return;
    setView(next);
    setError('');
    setNotice('');
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
    if (next === 'tracking' && location.pathname !== '/track')
      history.replaceState(null, '', '/track');
    if (location.pathname === '/track' && next !== 'tracking') history.replaceState(null, '', '/');
  }
  const { update, updateCrop, photo, add, edit, exportPreview, editorBusy } = useEditor({
    view,
    product,
    cart,
    draft,
    quantity,
    editing,
    setDraft,
    setQuantity,
    setEditing,
    setGallery,
    setError,
    setNotice,
    setCart,
    go
  });
  const { checkout, pendingRequestKey } = useCheckout({
    editorBusy,
    busy,
    cart,
    recipient,
    confirmed,
    setBusy,
    setError,
    setReceipt,
    setCart,
    setRecipient,
    setConfirmed,
    go
  });
  const { lookup, trackingBusy } = useTracking({ view, setError, setTracking, setTrackInput });
  const trackLink = receipt ? trackingLink(location.origin, receipt.trackingToken) : '';
  return {
    product,
    setProduct,
    loadError,
    cart,
    setCart,
    view,
    draft,
    setDraft,
    quantity,
    setQuantity,
    editing,
    setEditing,
    gallery,
    setGallery,
    notice,
    setNotice,
    error,
    setError,
    busy,
    receipt,
    setReceipt,
    tracking,
    setTracking,
    trackingBusy,
    pendingRequestKey,
    trackInput,
    setTrackInput,
    recipient,
    setRecipient,
    confirmed,
    setConfirmed,
    count,
    subtotal,
    fetchProduct,
    go,
    update,
    updateCrop,
    exportPreview,
    editorBusy,
    photo,
    add,
    edit,
    checkout,
    lookup,
    trackLink
  };
}
export type Shop = ReturnType<typeof useShop>;
