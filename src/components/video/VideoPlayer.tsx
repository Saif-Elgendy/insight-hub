import { Loader2, Lock, Video as VideoIcon } from 'lucide-react';
import { useSignedUrl } from '@/lib/storage';
import { normalizeVideoUrl } from '@/lib/videoUrl';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  url: string | null | undefined;
  title?: string;
  /** Supabase storage bucket used when the URL is a storage path. Defaults to lesson-videos. */
  bucket?: string;
  className?: string;
  /** Show provider badge in the corner */
  showBadge?: boolean;
}

const KIND_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  drive: 'Google Drive',
  dailymotion: 'Dailymotion',
  facebook: 'Facebook',
  direct: 'فيديو مباشر',
  storage: 'مكتبة الكورس',
};

export function VideoPlayer({
  url,
  title = 'فيديو',
  bucket = 'lesson-videos',
  className,
  showBadge = true,
}: VideoPlayerProps) {
  const normalized = normalizeVideoUrl(url);
  const { signedUrl, loading } = useSignedUrl(
    bucket,
    normalized.needsSignedUrl ? normalized.storagePath ?? null : null
  );

  const finalSrc = normalized.needsSignedUrl ? signedUrl : normalized.src;
  const useVideoTag = normalized.isDirect || (normalized.needsSignedUrl && !!finalSrc);

  return (
    <div
      className={cn(
        'relative aspect-video rounded-2xl overflow-hidden shadow-elevated bg-black',
        className
      )}
    >
      {!url ? (
        <Placeholder icon={<VideoIcon className="w-10 h-10" />} text="لا يوجد فيديو لهذا الدرس" />
      ) : loading ? (
        <Placeholder icon={<Loader2 className="w-8 h-8 animate-spin" />} text="جاري التحميل..." />
      ) : !finalSrc ? (
        <Placeholder icon={<Lock className="w-8 h-8" />} text="يجب التسجيل للوصول للفيديو" />
      ) : useVideoTag ? (
        <video
          src={finalSrc}
          title={title}
          controls
          controlsList="nodownload"
          playsInline
          className="w-full h-full bg-black"
        />
      ) : (
        <iframe
          src={finalSrc}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}

      {showBadge && finalSrc && KIND_LABEL[normalized.kind] && (
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
          {KIND_LABEL[normalized.kind]}
        </span>
      )}
    </div>
  );
}

function Placeholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/70 bg-gradient-to-br from-foreground/30 to-foreground/10">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}
