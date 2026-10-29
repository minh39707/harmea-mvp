import { imageHeader } from './image-header';
import { centerCrop } from './geometry';

export async function photo(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw Error('Chọn ảnh JPG/PNG tối đa 5 MiB.');
  const header = imageHeader(new Uint8Array(await file.arrayBuffer()));
  if (header.type !== file.type) throw Error('Nội dung tệp không đúng định dạng JPG/PNG.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth > 8192 ||
      image.naturalHeight > 8192 ||
      image.naturalWidth * image.naturalHeight > 20000000
    )
      throw Error('Ảnh vượt giới hạn kích thước.');
    const canvas = document.createElement('canvas'),
      scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw Error('Không đọc được ảnh trong trình duyệt.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let thumbnail = canvas.toDataURL('image/jpeg', 0.75),
      quality = 0.65;
    while (thumbnail.length > 160000 && quality >= 0.25) {
      thumbnail = canvas.toDataURL('image/jpeg', quality);
      quality -= 0.1;
    }
    if (thumbnail.length > 160000) throw Error('Ảnh quá phức tạp. Hãy chọn ảnh khác.');
    return {
      original: file,
      thumbnail,
      width: image.naturalWidth,
      height: image.naturalHeight,
      crop: centerCrop(image.naturalWidth, image.naturalHeight)
    };
  } catch (error) {
    if (error instanceof DOMException)
      throw Error('Không đọc được ảnh. Chọn một tệp JPG/PNG hợp lệ.');
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
