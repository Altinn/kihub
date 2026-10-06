/**
 * 022 — pure YouTube helpers for the KI Læring video block. No Payload import, so it is
 * unit-testable in isolation and shared by the collection's field validation (admin) and the
 * renderer (employee surface) — one parser, so what the editor accepts is exactly what renders.
 */

/** YouTube video ids are 11 chars of URL-safe base64. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Extracts the video id from any common YouTube URL shape: `youtu.be/<id>`, `watch?v=<id>`,
 * `/embed/<id>`, `/shorts/<id>`, `/live/<id>`. Tracking params (`si=`, `feature=`) are ignored.
 * A bare 11-char id is accepted too. Anything else (other hosts, playlists, channels) → null.
 */
export function parseYouTubeId(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  let candidate: string | null | undefined = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidate = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === 'watch') candidate = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(segments[0] ?? '')) candidate = segments[1];
  }
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/** Start offset from `t=` / `start=` (`90`, `90s`, `1m30s`, `1h2m3s`) in whole seconds, or null. */
export function parseYouTubeStart(input: string | null | undefined): number | null {
  const raw = input?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const t = url.searchParams.get('t') ?? url.searchParams.get('start');
  if (!t) return null;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t);
  if (!match || !match[0]) return null;
  const [, h = '0', m = '0', s = '0'] = match;
  const total = Number(h) * 3600 + Number(m) * 60 + Number(s);
  return total > 0 ? total : null;
}

export interface YouTubeEmbedOptions {
  /**
   * Preferred subtitle language — YouTube's track code (`no` = "Norwegian" in YouTube Studio).
   * Only takes effect if the video HAS a track in that language; YouTube never auto-translates here.
   */
  captionLanguage?: string;
  start?: number | null;
}

/**
 * The embed URL. Uses the privacy-enhanced `youtube-nocookie.com` host (no cookies until play),
 * forces subtitles on (`cc_load_policy=1`) with Norwegian preferred (`cc_lang_pref`), and sets the
 * player UI language (`hl`). `rel=0` keeps "related videos" to the same channel.
 */
export function youtubeEmbedUrl(id: string, options: YouTubeEmbedOptions = {}): string {
  const lang = options.captionLanguage ?? 'no';
  const params = new URLSearchParams({
    cc_load_policy: '1',
    cc_lang_pref: lang,
    hl: lang,
    rel: '0',
  });
  if (options.start) params.set('start', String(options.start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
