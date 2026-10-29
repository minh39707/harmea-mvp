import type { Shop } from './useShop';

export default function Footer({ go }: Pick<Shop, 'go'>) {
  return (
    <footer>
      <button className="wordmark" onClick={() => go('product')}>
        harméa<span>♪</span>
      </button>
      <p>Dự án sinh viên, không liên kết với nền tảng âm nhạc.</p>
      <a href="/admin/login">Quản trị</a>
    </footer>
  );
}
