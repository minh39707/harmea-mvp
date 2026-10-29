export function imageHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0,
    type = '';
  if (
    bytes.length >= 33 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) &&
    String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR'
  ) {
    width = view.getUint32(16);
    height = view.getUint32(20);
    type = 'image/png';
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset),
        name = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (name === 'acTL') throw Error('Chọn ảnh tĩnh JPG/PNG.');
      if (length > bytes.length - offset - 12) throw Error('Tệp PNG không đầy đủ.');
      offset += length + 12;
      if (name === 'IEND') break;
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    type = 'image/jpeg';
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++]!;
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) &&
        length >= 7
      ) {
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (!width || !height || width > 8192 || height > 8192 || width * height > 20000000)
    throw Error('Ảnh cần là JPG/PNG, tối đa 20 megapixel và mỗi cạnh 8192 px.');
  return { width, height, type };
}
