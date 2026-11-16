import { useEffect, useRef, useState } from 'react';
import { IconMusic } from '../../shared/ui/Icons';
import './BackgroundMusic.css';

const preferenceKey = 'harmea.music.enabled.v1';
const volumeKey = 'harmea.music.volume.v1';
const defaultVolume = 35;

function readVolume() {
  try {
    const stored = localStorage.getItem(volumeKey);
    const value = Number(stored);
    return stored !== null && Number.isInteger(value) && value >= 0 && value <= 100
      ? value
      : defaultVolume;
  } catch {
    return defaultVolume;
  }
}

// iOS Safari ignores HTMLMediaElement.volume (hardware buttons only); hide the slider there.
function volumeAdjustable() {
  try {
    if (typeof Audio === 'undefined') return false;
    const probe = new Audio();
    probe.volume = 0.5;
    return Math.abs(probe.volume - 0.5) < 0.01;
  } catch {
    return false;
  }
}

export function useBackgroundMusic(enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pending = useRef(false);
  const attempt = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preferred, setPreferred] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) === 'on';
    } catch {
      return false;
    }
  });

  const [volume, setVolumeState] = useState(readVolume);
  const [canAdjustVolume] = useState(volumeAdjustable);

  function setVolume(value: number) {
    const next = Math.min(100, Math.max(0, Math.round(value)));
    setVolumeState(next);
    try {
      localStorage.setItem(volumeKey, String(next));
    } catch {
      /* Volume still applies for this visit without storage. */
    }
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume, enabled]);

  function remember(value: boolean) {
    setPreferred(value);
    try {
      localStorage.setItem(preferenceKey, value ? 'on' : 'off');
    } catch {
      /* Playback still works without storage. */
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      attempt.current++;
      pending.current = false;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      setPlaying(false);
      setLoading(false);
      setError('');
    };
  }, [enabled]);

  async function toggle() {
    const audio = audioRef.current;
    if (!enabled || !audio) return;
    setError('');
    if (!audio.paused || pending.current) {
      attempt.current++;
      pending.current = false;
      audio.pause();
      setPlaying(false);
      setLoading(false);
      remember(false);
      return;
    }
    const request = ++attempt.current;
    pending.current = true;
    setLoading(true);
    audio.volume = volume / 100;
    // Assign the source inside the click handler: no media request before consent.
    if (!audio.getAttribute('src') || audio.error) audio.src = '/audio/nen.mp3';
    try {
      await audio.play();
      if (request !== attempt.current) return;
      remember(true);
    } catch {
      if (request === attempt.current) {
        setPlaying(false);
        setError('Chưa phát được nhạc. Bạn có thể bấm phát lại.');
      }
    } finally {
      if (request === attempt.current) {
        pending.current = false;
        setLoading(false);
      }
    }
  }

  const label = loading
    ? 'Hủy tải nhạc'
    : playing
      ? 'Tắt nhạc nền'
      : preferred
        ? 'Phát tiếp nhạc nền'
        : 'Bật nhạc nền';
  return {
    playing,
    loading,
    toggle,
    audio: enabled ? (
      <audio
        ref={audioRef}
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    ) : null,
    controls: enabled ? (
      <aside className="background-music" aria-label="Điều khiển nhạc nền">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-pressed={playing || loading}
          className="background-music-toggle"
          aria-label={label}
        >
          <IconMusic size={18} />
          <span>{label}</span>
        </button>
        {playing && canAdjustVolume && (
          <div className="background-music-volume">
            <IconMusic size={14} aria-hidden="true" />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={event => setVolume(Number(event.currentTarget.value))}
              aria-label="Âm lượng nhạc nền"
              aria-valuetext={`${volume}%`}
            />
            <span className="background-music-volume-value" aria-hidden="true">
              {volume}%
            </span>
          </div>
        )}
        {error && (
          <p role="status" className="background-music-error">
            {error}
          </p>
        )}
      </aside>
    ) : null
  };
}

export type BackgroundMusic = Pick<
  ReturnType<typeof useBackgroundMusic>,
  'playing' | 'loading' | 'toggle'
>;
