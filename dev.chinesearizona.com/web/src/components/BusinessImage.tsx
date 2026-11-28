import type { CSSProperties } from 'react';

import { CategoryIcon } from '@/components/CategoryIcon';
import { IllustrationLabel } from '@/components/IllustrationLabel';
import { isIllustrationImageUrl } from '@/lib/directory-ai-replacements';
import type { BusinessCategory, Locale } from '@/lib/types';

type BusinessImageProps = {
  imageUrl?: string | null;
  label: string;
  locale: Locale;
  category?: BusinessCategory;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
  showIllustrationLabel?: boolean;
};

export function BusinessImage({
  imageUrl,
  label,
  locale,
  category,
  className = '',
  sizes = '100vw',
  priority = false,
  style,
  showIllustrationLabel = true,
}: BusinessImageProps) {
  if (imageUrl) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={label}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          sizes={sizes}
          className={`h-full w-full ${className || 'object-cover'}`}
          style={style}
        />
        {showIllustrationLabel && isIllustrationImageUrl(imageUrl) ? <IllustrationLabel locale={locale} /> : null}
      </>
    );
  }

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fde68a_0%,#f8fafc_38%,#dbeafe_100%)] p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-sm">
        <CategoryIcon icon={category?.icon ?? 'briefcase'} className="h-6 w-6" />
      </div>
      {/* No photo: show the category, not the photo's alt text or a "placeholder" caption (#473). */}
      <p className="mt-4 max-w-[14rem] text-sm font-semibold text-slate-700">
        {category ? (locale === 'zh' ? category.name.zh ?? category.name.en : category.name.en) : null}
      </p>
    </div>
  );
}
