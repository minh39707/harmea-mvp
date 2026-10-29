const musicHosts = [
  'open.spotify.com',
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'soundcloud.com',
  'www.soundcloud.com'
];
export function validMusic(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      musicHosts.includes(u.hostname)
    );
  } catch {
    return false;
  }
}
