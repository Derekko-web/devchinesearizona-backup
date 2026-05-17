'use client';

import { useState } from 'react';

type DiscoverArticleImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function DiscoverArticleImage({
  src,
  alt,
  className = 'object-cover',
  priority = false,
}: DiscoverArticleImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_42%),linear-gradient(135deg,_#e2e8f0,_#f8fafc)]" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={`h-full w-full ${className}`}
      onError={() => setHasError(true)}
    />
  );
}
