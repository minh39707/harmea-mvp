import type { Product, OrderStatus, Crop } from '../../shared/types';
export type AdminSession = { authenticated: true; expiresAt: string };
export type AdminSummary = {
  id: string;
  orderNumber: string;
  recipientName: string;
  status: OrderStatus;
  quantity: number;
  subtotalVnd: number;
  shippingFeeVnd: null;
  currency: 'VND';
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type AdminPage = { items: AdminSummary[]; page: number; pageSize: number; total: number };
export type AdminDesign = {
  fullName: string;
  musicUrl: string;
  crop: Crop;
  color?: string;
  dateOfBirth?: string;
  commemorativeDate?: string;
  place?: string;
  signatureText?: string;
};
export type AdminItem = {
  id: string;
  quantity: number;
  designSnapshot: AdminDesign;
  assets: { photo: string; preview: string };
};
export type AdminEvent = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actor: 'guest' | 'admin' | 'system';
  internalNote: string | null;
  occurredAt: string;
};
export type AdminDetail = AdminSummary & {
  productSnapshot: Product;
  recipient: { name: string; phone: string; address: string };
  note: string;
  unitPriceVnd: number;
  templateVersion: string;
  trackingCode: string | null;
  cancellationReason: string | null;
  items: AdminItem[];
  history: AdminEvent[];
};
export type StatusDraft = {
  status: OrderStatus;
  reason: string;
  trackingCode: string;
  confirmed: boolean;
};
