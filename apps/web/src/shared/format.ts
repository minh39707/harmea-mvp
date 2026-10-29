export const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const colorLabel = (color: string) =>
  color === 'cream' ? 'Kem kỷ niệm' : color === 'blue' ? 'Xanh bình yên' : 'Hồng dịu dàng';
