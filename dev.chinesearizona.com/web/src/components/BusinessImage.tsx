import { CategoryIcon } from '@/components/CategoryIcon';
import type { BusinessCategory, Locale } from '@/lib/types';

type BusinessImageProps = {
  imageUrl?: string | null;
  label: string;
  locale: Locale;
  category?: BusinessCategory;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function BusinessImage({
  imageUrl,
  label,
  locale,
  category,
  className = '',
  sizes = '100vw',
  priority = false,
}: BusinessImageProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        sizes={sizes}
        className={`h-full w-full ${className || 'object-cover'}`}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fde68a_0%,#f8fafc_38%,#dbeafe_100%)] p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-brand-700 shadow-sm">
        <CategoryIcon icon={category?.icon ?? 'briefcase'} className="h-6 w-6" />
      </div>
      <p className="mt-4 max-w-[14rem] text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
        {locale === 'zh' ? '示意圖' : 'Placeholder'}
      </p>
    </div>
  );
}
