export const escapeXml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '�')
    .replace(
      /[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!
    );
function widthOf(text: string, size: number) {
  return (
    [...text].reduce(
      (n, c) =>
        n +
        (/[ilI1.,:;'! ]/.test(c)
          ? 0.3
          : /[MW@%]/.test(c)
            ? 0.95
            : /[\u2e80-\u9fff]/.test(c)
              ? 1
              : 0.61),
      0
    ) * size
  );
}
function wrap(text: string, size: number, max: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue;
    if (line && widthOf(line + ' ' + word, size) > max) {
      lines.push(line);
      line = '';
    }
    for (const char of word) {
      if (widthOf(line + char, size) > max && line) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    line += ' ';
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map(s => s.trim());
}
export function fittedText(
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines: number,
  size: number,
  min: number,
  gap: number,
  serif = false
) {
  let lines = wrap(value, size, maxWidth);
  while (lines.length > maxLines && size > min) {
    size--;
    lines = wrap(value, size, maxWidth);
  }
  if (lines.length > maxLines) throw Error('Nội dung quá dài để đặt trên thẻ.');
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * gap}" font-family="${serif ? 'Georgia, serif' : 'Arial, sans-serif'}" font-size="${size}" textLength="${Math.max(1, Math.min(maxWidth, widthOf(line, size))).toFixed(2)}" lengthAdjust="spacingAndGlyphs">${escapeXml(line)}</text>`
    )
    .join('');
}
export function displayDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
}
