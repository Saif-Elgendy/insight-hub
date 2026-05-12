import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const SIGN_EXPIRY = 60 * 60; // 1 hour

/**
 * Extract the storage object path from a previously stored URL
 * (works for both `/object/public/{bucket}/...` and `/object/sign/{bucket}/...?token=`).
 * If the input is already a plain path, it's returned unchanged.
 */
export function extractStoragePath(urlOrPath: string, bucket: string): string {
  if (!urlOrPath) return urlOrPath;
  const marker = `/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return urlOrPath;
  const tail = urlOrPath.slice(idx + marker.length);
  return tail.split("?")[0];
}

/**
 * Generate a short-lived signed URL for a private bucket file.
 * Returns null on failure (e.g. RLS denied access).
 */
export async function getSignedUrl(
  bucket: string,
  urlOrPath: string,
  expiresIn: number = SIGN_EXPIRY
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractStoragePath(urlOrPath, bucket);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * React hook returning a signed URL for a private bucket file.
 */
export function useSignedUrl(bucket: string, urlOrPath: string | null | undefined) {
  const [signed, setSigned] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!urlOrPath) {
      setSigned(null);
      return;
    }
    setLoading(true);
    getSignedUrl(bucket, urlOrPath).then((url) => {
      if (!cancelled) {
        setSigned(url);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, urlOrPath]);

  return { signedUrl: signed, loading };
}
