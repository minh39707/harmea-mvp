export type Design = {
  fullName: string;
  signatureText: string;
  musicUrl: string;
  place: string;
  dateOfBirth: string;
  commemorativeDate: string;
  color: string;
  photo: string;
};
export type Item = { id: string; productId: string; quantity: number; design: Design };
export type Product = {
  id: string;
  name: string;
  unitPriceVnd: number;
  isDemoPrice: boolean;
  image: string;
};
export type Receipt = {
  orderNumber: string;
  status: string;
  subtotalVnd: number;
  createdAt: string;
  trackingToken?: string;
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
  photo: ''
};

export type Recipient = { name: string; phone: string; address: string; note: string };
export type StateSetter<T> = import('react').Dispatch<import('react').SetStateAction<T>>;
