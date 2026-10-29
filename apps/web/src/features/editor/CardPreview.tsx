import type { Design } from '../../shared/types';
export default function CardPreview({
  design,
  small = false
}: {
  design: Design;
  small?: boolean;
}) {
  return (
    <div className={`music-card ${design.color} ${small ? 'small' : ''}`}>
      <div className="card-top">
        HARMÉA <span>MEMORY PASS / 001</span>
      </div>
      <div className="card-body">
        <div className="portrait">
          {design.photo ? (
            <img src={design.photo} alt="Ảnh cá nhân hóa" />
          ) : (
            <span>
              h<span className="note">♪</span>
            </span>
          )}
        </div>
        <div className="card-copy">
          <small>THIS SONG BELONGS TO</small>
          <strong>{design.fullName || 'Your favorite person'}</strong>
          <div className="card-rule" />
          <small>A PLACE TO REMEMBER</small>
          <p>{design.place || 'Somewhere with you'}</p>
          <small>A MOMENT TO KEEP</small>
          <p>{design.commemorativeDate || 'A memory, forever.'}</p>
          <i>{design.signatureText || 'with love'}</i>
        </div>
      </div>
      <div className="card-bottom">
        <span>♫ TAP INTO A MEMORY</span>
        <span>PERSONAL MUSIC CARD ↗</span>
      </div>
    </div>
  );
}
