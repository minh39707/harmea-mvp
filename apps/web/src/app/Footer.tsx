import type { Shop } from './useShop';

export default function Footer({ go }: Pick<Shop, 'go'>) {
  return (
    <footer>
      <div>
        <button className="wordmark" onClick={() => go('product')}>
          harméa<span>♪</span>
        </button>
        <p>Music connects. Memories stay.</p>
      </div>
      <p>
        Một dự án sinh viên độc lập.
        <br />
        Không liên kết chính thức với các nền tảng âm nhạc.
      </p>
      <span>
        NFC MUSIC CARD
        <br />
        <small>Made for your memories.</small>
      </span>
    </footer>
  );
}
