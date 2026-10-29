import type { Design } from '../../shared/types';
export async function photo(
  file: File | undefined,
  update: (key: keyof Design, value: string) => void,
  setError: (error: string) => void
) {
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    setError('Chọn ảnh JPG/PNG dưới 5 MB.');
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.width * image.height > 20000000) throw Error('Ảnh tối đa 20 megapixel.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 600 / Math.max(image.width, image.height));
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.75);
    if (data.length > 350000) throw Error('Ảnh quá phức tạp. Hãy chọn ảnh nhỏ hơn.');
    update('photo', data);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Không đọc được ảnh.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
