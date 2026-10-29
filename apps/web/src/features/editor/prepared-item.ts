import type { Item } from '../../shared/types';
import { loadAssets } from './asset-store';
import { orderDesign } from './validate-design';
import { template } from './geometry';

export async function preparedItem(item: Item) {
  if (!item.assetKey || item.templateVersion !== template.version)
    throw Error('Thiết kế cũ cần mở sửa và chọn lại ảnh trước khi đặt đơn mới.');
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)
    throw Error('Số lượng mỗi thiết kế từ 1 đến 10.');
  const assets = await loadAssets(item.assetKey);
  if (!assets) throw Error('Không còn ảnh gốc trên thiết bị. Mở sửa thiết kế và chọn lại ảnh.');
  if (
    !['image/jpeg', 'image/png'].includes(assets.photo.type) ||
    !assets.photo.size ||
    assets.photo.size > 5 * 1024 * 1024 ||
    assets.preview.type !== 'image/png' ||
    !assets.preview.size ||
    assets.preview.size > 2 * 1024 * 1024
  )
    throw Error('Ảnh của thiết kế không hợp lệ. Hãy mở sửa và chọn lại ảnh.');
  return {
    payload: {
      productId: item.productId,
      templateVersion: item.templateVersion,
      quantity: item.quantity,
      design: orderDesign(item.design)
    },
    photo: assets.photo,
    preview: assets.preview
  };
}
