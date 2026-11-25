import type { Locale } from '@/lib/types';

const positionClasses = {
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
} as const;

// Marks an AI-made picture so visitors don't read it as a photo of the business.
export function IllustrationLabel({
  locale,
  position = 'bottom-left',
}: {
  locale: Locale;
  position?: keyof typeof positionClasses;
}) {
  return (
    <span
      className={`pointer-events-none absolute z-10 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white ${positionClasses[position]}`}
    >
      {locale === 'zh' ? '示意圖' : 'Illustration'}
    </span>
  );
}
