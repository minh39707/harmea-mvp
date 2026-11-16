import { useCallback, useEffect, useRef, useState } from 'react';
import type { Design, Item, Product, Receipt, PublicTracking, View } from '../shared/types';
import type { StateSetter } from '../shared/types';
import { blankDesign as blank } from '../shared/types';
import { api } from '../shared/api';
import { CART_STORAGE_KEY, loadCart, saveCart } from '../features/cart/cart-storage';
import { cleanOrphanAssets, removeAssets } from '../features/editor/asset-store';
import { useEditor } from '../features/editor/useEditor';
import { useCheckout } from '../features/checkout/useCheckout';
import { useTracking } from '../features/tracking/useTracking';
import { matchRoute, navigate, usePathname } from '../shared/router';

function viewForPath(pathname: string): View {
  const name = matchRoute(pathname)?.route.name;
  if (name === 'design' || name === 'product-alias') return 'product';
  if (name === 'cart') return 'cart';
  if (name === 'checkout') return 'checkout';
  if (name === 'tracking') return 'tracking';
  return 'home';
}

export function useShop() {
  const pathname = usePathname();
  const [product, setProduct] = useState<Product | null>(null),
    [loadError, setLoadError] = useState('');
  const [cart, setCartState] = useState<Item[]>(loadCart),
    [view, setView] = useState<View>(() => viewForPath(location.pathname));
  const [draft, setDraft] = useState<Design>({ ...blank }),
    [quantity, setQuantity] = useState(1),
    [editing, setEditing] = useState<string | null>(null),
    [editingPosition, setEditingPosition] = useState<number | null>(null);
  const [gallery, setGallery] = useState<'sample' | 'preview'>('sample'),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const [assetStoreReady, setAssetStoreReady] = useState(false);
  const [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [tracking, setTracking] = useState<PublicTracking | null>(null),
    [trackOrderNumber, setTrackOrderNumber] = useState(''),
    [trackPhone, setTrackPhone] = useState('');
  const [recipient, setRecipient] = useState({ name: '', phone: '', address: '', note: '' }),
    [confirmed, setConfirmed] = useState(false);
  const count = cart.reduce((n, i) => n + i.quantity, 0),
    subtotal = cart.reduce((n, i) => n + i.quantity * (product?.unitPriceVnd ?? 0), 0);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => loadCart().map(i => i.id));

  const previousCartIds = useRef<string[]>(cart.map(i => i.id));
  useEffect(() => {
    const currentIds = cart.map(i => i.id);
    const prevIds = previousCartIds.current;
    previousCartIds.current = currentIds;

    const newlyAdded = currentIds.filter(id => !prevIds.includes(id));
    setSelectedItemIds(prev => {
      const existing = prev.filter(id => currentIds.includes(id));
      if (newlyAdded.length > 0) {
        return [...existing, ...newlyAdded];
      }
      return existing;
    });
  }, [cart]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItemIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setConfirmed(false);
  }, []);

  const selectAll = useCallback(
    (select: boolean) => {
      setSelectedItemIds(select ? cart.map(i => i.id) : []);
      setConfirmed(false);
    },
    [cart]
  );

  const selectedItems = cart.filter(i => selectedItemIds.includes(i.id));
  const selectedCount = selectedItems.reduce((n, i) => n + i.quantity, 0);
  const selectedSubtotal = selectedItems.reduce(
    (n, i) => n + i.quantity * (product?.unitPriceVnd ?? 0),
    0
  );

  const checkoutCart = selectedItems;
  const checkoutSubtotal = selectedSubtotal;
  const fetchProduct = () => {
    setLoadError('');
    api<Product>('/products/current')
      .then(setProduct)
      .catch(e => setLoadError(e.message));
  };
  const commitCart = useCallback(
    (action: Item[] | ((current: Item[]) => Item[]), cleanupRemoved = true) => {
      const previous = loadCart();
      const next = typeof action === 'function' ? action(previous) : action;
      if (next.length > 10) throw Error('Mỗi giỏ tối đa 10 thiết kế.');
      saveCart(next);
      setCartState(next);
      setConfirmed(false);
      if (cleanupRemoved) {
        const retained = new Set(next.flatMap(item => (item.assetKey ? [item.assetKey] : [])));
        for (const item of previous)
          if (item.assetKey && !retained.has(item.assetKey))
            void removeAssets(item.assetKey).catch(() =>
              setError('Không xóa được ảnh khỏi bộ nhớ thiết bị.')
            );
      }
      return next;
    },
    []
  );
  const setCart: StateSetter<Item[]> = useCallback(
    action => {
      try {
        commitCart(action);
      } catch {
        setError('Không lưu được giỏ hàng trên trình duyệt. Kiểm tra dung lượng hoặc quyền lưu.');
      }
    },
    [commitCart]
  );
  useEffect(fetchProduct, []);
  useEffect(() => {
    setView(current =>
      current === 'success' && pathname === '/checkout' ? current : viewForPath(pathname)
    );
  }, [pathname]);
  useEffect(() => {
    let mounted = true;
    const synchronize = (event: StorageEvent) => {
      if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
      const latest = loadCart();
      setCartState(latest);
      setConfirmed(false);
    };
    window.addEventListener('storage', synchronize);
    void cleanOrphanAssets(() => loadCart().flatMap(item => (item.assetKey ? [item.assetKey] : [])))
      .catch(() => {
        if (mounted) setError('Không thể dọn ảnh cũ khỏi bộ nhớ trình duyệt.');
      })
      .finally(() => {
        if (mounted) setAssetStoreReady(true);
      });
    return () => {
      mounted = false;
      window.removeEventListener('storage', synchronize);
    };
  }, []);
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
    const destination: Partial<Record<View, string>> = {
      home: '/',
      product: '/design',
      cart: '/cart',
      checkout: '/checkout',
      tracking: '/track'
    };
    if (next !== 'success' && destination[next]) navigate(destination[next]!);
  }
  const editor = useEditor({
    view,
    product,
    cart,
    ready: assetStoreReady,
    draft,
    quantity,
    editing,
    editingPosition,
    setDraft,
    setQuantity,
    setEditing,
    setEditingPosition,
    setGallery,
    setError,
    setNotice,
    commitCart,
    go
  });
  const {
    update,
    updateCrop,
    photo,
    photoStats,
    add,
    addAsNew,
    edit,
    startNewDesign,
    exportPreview,
    saveStatus
  } = editor;
  const editorBusy = editor.editorBusy;
  const { checkout, pendingRequestKey } = useCheckout({
    editorBusy,
    busy,
    cart: checkoutCart,
    recipient,
    confirmed,
    setBusy,
    setError,
    setReceipt,
    setTrackPhone,
    setCart,
    setRecipient,
    setConfirmed,
    go
  });
  const { lookup, trackingBusy } = useTracking({ view, setError, setTracking });
  return {
    product,
    setProduct,
    loadError,
    cart,
    setCart,
    selectedItemIds,
    setSelectedItemIds,
    toggleSelectItem,
    selectAll,
    selectedItems,
    selectedCount,
    selectedSubtotal,
    checkoutCart,
    checkoutSubtotal,
    view,
    draft,
    setDraft,
    quantity,
    setQuantity,
    editing,
    setEditing,
    editingPosition,
    setEditingPosition,
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
    trackOrderNumber,
    setTrackOrderNumber,
    trackPhone,
    setTrackPhone,
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
    photoStats,
    add,
    addAsNew,
    saveStatus,
    edit,
    startNewDesign,
    checkout,
    lookup
  };
}
export type Shop = ReturnType<typeof useShop>;
