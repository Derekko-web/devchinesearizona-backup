'use client';

import { useState } from 'react';

type DiscoverArticleImageProps = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function DiscoverArticleImage({
  src,
  fallbackSrc,
  alt,
  className = 'object-cover',
  priority = false,
}: DiscoverArticleImageProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const primarySrc = src?.trim() ?? '';
  const fallbackImageSrc = fallbackSrc?.trim() ?? '';
  const canUseFallback = Boolean(fallbackImageSrc && fallbackImageSrc !== primarySrc);
  const primaryFailed = failedSources.includes(primarySrc);
  const fallbackFailed = failedSources.includes(fallbackImageSrc);
  const imageSrc = primarySrc && !primaryFailed
    ? primarySrc
    : canUseFallback && !fallbackFailed
      ? fallbackImageSrc
      : '';

  if (!imageSrc) {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_42%),linear-gradient(135deg,_#e2e8f0,_#f8fafc)]" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`h-full w-full ${className}`}
      onError={() => {
        setFailedSources((current) =>
          current.includes(imageSrc) ? current : [...current, imageSrc]
        );
      }}
    />
  );
}
