export type Crop = { x: number; y: number; width: number; height: number };
export type Design = {
  fullName: string;
  signatureText: string;
  musicUrl: string;
  place: string;
  dateOfBirth: string;
  commemorativeDate: string;
  color: string;
  photo: string;
  photoWidth: number;
  photoHeight: number;
  crop: Crop;
};
export type EditorAssets = { photo: Blob; preview: Blob };
export type Item = {
  id: string;
  productId: string;
  templateVersion?: string;
  assetKey?: string;
  quantity: number;
  design: Design;
};
export type Product = {
  id: string;
  name: string;
  unitPriceVnd: number;
  templateVersion: string;
  isDemo: boolean;
  physicalSizeMm: { width: number; height: number };
  artworkSizeMm: { width: number; height: number };
  safeAreaMm: { width: number; height: number };
};
export type Receipt = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  quantity: number;
  unitPriceVnd: number;
  subtotalVnd: number;
  shippingFeeVnd: null;
  currency: 'VND';
  createdAt: string;
  trackingToken: string;
};
export type OrderStatus =
  'pending' | 'confirmed' | 'producing' | 'shipping' | 'completed' | 'cancelled';
export type PublicTracking = {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  trackingCode: string | null;
  history: Array<{ status: OrderStatus; occurredAt: string }>;
};
export type View = 'product' | 'cart' | 'checkout' | 'success' | 'tracking';
export const blankDesign: Design = {
  fullName: '',
  signatureText: '',
  musicUrl: '',
  place: '',
  dateOfBirth: '',
  commemorativeDate: '',
  color: 'cream',
  photo: '',
  photoWidth: 0,
  photoHeight: 0,
  crop: { x: 0, y: 0, width: 1, height: 1 }
};

export type Recipient = { name: string; phone: string; address: string; note: string };
export type StateSetter<T> = import('react').Dispatch<import('react').SetStateAction<T>>;
