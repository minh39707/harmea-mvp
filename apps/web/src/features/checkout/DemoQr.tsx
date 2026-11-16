// F2: ảnh "QR" minh hoạ cho bước thanh toán demo.
// Đây KHÔNG phải mã QR: các ô được sinh giả ngẫu nhiên (cố định), không có vùng định dạng hợp lệ
// nên không ứng dụng nào quét ra nội dung, và có dải chữ đỏ "MÃ DEMO – KHÔNG CHUYỂN TIỀN" đè lên.

const SIZE = 29;

function modules(): boolean[][] {
  let seed = 20261115;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => rand() > 0.52)
  );
  const finder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r++)
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r,
          cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue;
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[rr]![cc] = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (edge || core);
      }
  };
  finder(0, 0);
  finder(0, SIZE - 7);
  finder(SIZE - 7, 0);
  return grid;
}

const GRID = modules();

export default function DemoQr() {
  return (
    <div
      className="transfer-qr demo-qr"
      role="img"
      aria-label="Ảnh minh hoạ mã QR demo, không quét được, không chuyển tiền"
    >
      <svg viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} aria-hidden="true">
        <rect x="-2" y="-2" width={SIZE + 4} height={SIZE + 4} fill="#fff" />
        {GRID.flatMap((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect key={`${r}-${c}`} x={c} y={r} width="1.02" height="1.02" fill="#111" />
            ) : null
          )
        )}
      </svg>
      <span className="demo-qr-ribbon">MÃ DEMO – KHÔNG CHUYỂN TIỀN</span>
    </div>
  );
}
