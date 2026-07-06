import { useSignedUrl } from '@/lib/storage';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

const BUCKET = 'consultant-documents';

interface Props {
  path: string | null | undefined;
  className?: string;
  children: ReactNode;
}

/** Renders an <a> link to a private consultant document via short-lived signed URL. */
export const ConsultantDocumentLink = ({ path, className, children }: Props) => {
  const { signedUrl, loading } = useSignedUrl(BUCKET, path);
  if (!path) return null;
  if (loading || !signedUrl) {
    return (
      <span className={className}>
        <Loader2 className="w-3 h-3 animate-spin inline" />
      </span>
    );
  }
  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
};

interface ImgProps {
  path: string | null | undefined;
  alt: string;
  className?: string;
}

export const ConsultantDocumentImage = ({ path, alt, className }: ImgProps) => {
  const { signedUrl } = useSignedUrl(BUCKET, path);
  if (!path || !signedUrl) return null;
  return <img src={signedUrl} alt={alt} className={className} />;
};

export const ConsultantDocumentVideo = ({ path, className }: { path: string | null | undefined; className?: string }) => {
  const { signedUrl } = useSignedUrl(BUCKET, path);
  if (!path || !signedUrl) return null;
  return <video src={signedUrl} controls className={className} />;
};
