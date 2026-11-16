import { useEffect } from 'react';

// F8: khi bàn phím điện thoại mở, iOS Safari (và Chrome Android từ bản 108) chỉ thu nhỏ
// "visual viewport"; phần tử `position: fixed; bottom: 0` vẫn bám đáy layout viewport nên nằm
// dưới bàn phím. Hook này đo phần bị bàn phím che và ghi vào biến CSS `--keyboard-inset` trên
// <html>, để thanh hành động trên mobile luôn nằm ngay trên bàn phím.

/** Chiều cao bị che ở đáy màn hình, tính từ kích thước layout và visual viewport. */
export function keyboardInset(layoutHeight: number, visualHeight: number, visualTop: number) {
  const inset = layoutHeight - visualHeight - visualTop;
  // Bỏ qua chênh lệch nhỏ do thanh địa chỉ co giãn; bàn phím luôn cao hơn nhiều.
  return inset > 80 ? Math.round(inset) : 0;
}

export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;
    const update = () => {
      const inset = keyboardInset(window.innerHeight, vv.height, vv.offsetTop);
      root.style.setProperty('--keyboard-inset', `${inset}px`);
      root.classList.toggle('keyboard-open', inset > 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--keyboard-inset');
      root.classList.remove('keyboard-open');
    };
  }, []);
}

/** Đưa ô đang nhập ra giữa vùng nhìn thấy sau khi bàn phím mở xong. */
export function revealOnFocus(e: { target: EventTarget | null }) {
  const el = e.target;
  if (!(el instanceof HTMLElement) || !window.matchMedia('(max-width: 860px)').matches) return;
  window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
}
