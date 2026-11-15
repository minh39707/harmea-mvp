// Khoá cuộn trang khi mở modal (F3).
//
// `overflow: hidden` trên body không chặn được cuộn trên iOS Safari, và khi html/body đều có
// `overflow-x: hidden` thì việc bật/tắt overflow trên body có thể để trang kẹt không cuộn được.
// Vì vậy body được ghim bằng `position: fixed` tại vị trí hiện tại, rồi trả lại đúng style cũ và
// cuộn về `scrollY` đã lưu khi mở khoá. Có đếm số lần khoá để hai modal lồng nhau không trả nhầm.

type LockTarget = {
  document: { body: { style: Record<string, string> } };
  scrollY: number;
  scrollTo: (x: number, y: number) => void;
};

const keys = ['overflow', 'position', 'top', 'left', 'right', 'width'] as const;

let depth = 0;
let saved: { scrollY: number; style: Record<string, string> } | null = null;

export function lockScroll(win: LockTarget = window as unknown as LockTarget): () => void {
  const style = win.document.body.style;
  if (depth === 0) {
    const scrollY = win.scrollY;
    saved = { scrollY, style: Object.fromEntries(keys.map(k => [k, style[k] ?? ''])) };
    style.overflow = 'hidden';
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
  }
  depth += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth > 0 || !saved) return;
    for (const k of keys) style[k] = saved.style[k] ?? '';
    const y = saved.scrollY;
    saved = null;
    win.scrollTo(0, y);
  };
}
