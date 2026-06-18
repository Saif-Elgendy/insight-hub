// Smart video URL normalization for multiple providers.
// Supported: YouTube, Vimeo, Google Drive, Dailymotion, Facebook,
// direct MP4/WebM/OGG, and Supabase Storage paths (lesson-videos).

export type VideoKind =
  | 'youtube'
  | 'vimeo'
  | 'drive'
  | 'dailymotion'
  | 'facebook'
  | 'direct'
  | 'storage'
  | 'unknown';

export interface NormalizedVideo {
  kind: VideoKind;
  /** Embeddable iframe src OR direct media URL */
  src: string | null;
  /** True when the src must be rendered with <video>, not <iframe> */
  isDirect: boolean;
  /** True when src still needs a signed URL fetched from Supabase Storage */
  needsSignedUrl: boolean;
  /** Storage path (only when needsSignedUrl is true) */
  storagePath?: string;
}

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;
const DRIVE_RE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/;
const DAILY_RE = /dailymotion\.com\/(?:video\/|embed\/video\/)([a-zA-Z0-9]+)/;
const FB_RE = /facebook\.com\/.*\/videos\/(\d+)/;
const DIRECT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i;

export function normalizeVideoUrl(input: string | null | undefined): NormalizedVideo {
  if (!input) return { kind: 'unknown', src: null, isDirect: false, needsSignedUrl: false };
  const url = input.trim();

  const yt = url.match(YT_RE);
  if (yt) {
    return {
      kind: 'youtube',
      src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`,
      isDirect: false,
      needsSignedUrl: false,
    };
  }

  const vm = url.match(VIMEO_RE);
  if (vm) {
    return {
      kind: 'vimeo',
      src: `https://player.vimeo.com/video/${vm[1]}`,
      isDirect: false,
      needsSignedUrl: false,
    };
  }

  const dr = url.match(DRIVE_RE);
  if (dr) {
    return {
      kind: 'drive',
      src: `https://drive.google.com/file/d/${dr[1]}/preview`,
      isDirect: false,
      needsSignedUrl: false,
    };
  }

  const dm = url.match(DAILY_RE);
  if (dm) {
    return {
      kind: 'dailymotion',
      src: `https://www.dailymotion.com/embed/video/${dm[1]}`,
      isDirect: false,
      needsSignedUrl: false,
    };
  }

  const fb = url.match(FB_RE);
  if (fb) {
    return {
      kind: 'facebook',
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0`,
      isDirect: false,
      needsSignedUrl: false,
    };
  }

  if (DIRECT_RE.test(url) && /^https?:\/\//i.test(url)) {
    return { kind: 'direct', src: url, isDirect: true, needsSignedUrl: false };
  }

  // Treat anything else as a Supabase Storage path (lesson-videos bucket)
  return {
    kind: 'storage',
    src: null,
    isDirect: false,
    needsSignedUrl: true,
    storagePath: url,
  };
}
