import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function useCourseCoverUrl(assetId: string | undefined, fallback: string, mode: 'public' | 'private' = 'public') {
  const [url, setUrl] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    setUrl(fallback);
    if (!assetId) return () => { cancelled = true; };

    const request = mode === 'public' ? api.media.publicCourseCover(assetId) : api.media.url(assetId);
    void request.then((asset) => {
      if (!cancelled) setUrl(asset.url);
    }).catch(() => {
      if (!cancelled) setUrl(fallback);
    });

    return () => { cancelled = true; };
  }, [assetId, fallback, mode]);

  return url;
}
