import { imageHeader } from './image-header';
import { centerCrop } from './geometry';
import { fitWithin, PHOTO_MAX_EDGE } from './photo-processing';

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const THUMBNAIL_MAX_EDGE = 600;
const THUMBNAIL_MAX_DATA_URL_LENGTH = 160_000;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(Error('Không nén được ảnh.'))),
      'image/jpeg',
      quality
    )
  );
}

function canvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) throw Error('Không đọc được ảnh trong trình duyệt.');
  return context;
}

export async function photo(file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > MAX_INPUT_BYTES)
    throw Error('Chọn ảnh JPG/PNG tối đa 15 MiB.');
  const header = imageHeader(new Uint8Array(await file.arrayBuffer()));
  if (header.type !== file.type) throw Error('Nội dung tệp không đúng định dạng JPG/PNG.');
  if (typeof createImageBitmap !== 'function')
    throw Error('Trình duyệt không hỗ trợ xử lý ảnh an toàn. Hãy cập nhật trình duyệt.');

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width > 8192 ||
      bitmap.height > 8192 ||
      bitmap.width * bitmap.height > MAX_INPUT_PIXELS
    )
      throw Error('Ảnh vượt giới hạn kích thước.');

    const dimensions = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvasContext(canvas);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressed = await canvasBlob(canvas, 0.85);

    const compressedBitmap = await createImageBitmap(compressed);
    let thumbnail: string;
    try {
      const thumbDimensions = fitWithin(
        compressedBitmap.width,
        compressedBitmap.height,
        THUMBNAIL_MAX_EDGE
      );
      const thumb = document.createElement('canvas');
      thumb.width = thumbDimensions.width;
      thumb.height = thumbDimensions.height;
      canvasContext(thumb).drawImage(compressedBitmap, 0, 0, thumb.width, thumb.height);
      thumbnail = thumb.toDataURL('image/jpeg', 0.75);
      if (thumbnail.length > THUMBNAIL_MAX_DATA_URL_LENGTH)
        throw Error('Ảnh quá phức tạp. Hãy chọn ảnh khác.');
    } finally {
      compressedBitmap.close();
    }

    return {
      original: compressed,
      thumbnail,
      width: dimensions.width,
      height: dimensions.height,
      crop: centerCrop(dimensions.width, dimensions.height),
      sourceBytes: file.size,
      compressedBytes: compressed.size
    };
  } catch (error) {
    if (error instanceof DOMException)
      throw Error('Không đọc được ảnh. Chọn một tệp JPG/PNG hợp lệ.');
    throw error;
  } finally {
    bitmap?.close();
  }
}
