import { AdSenseSlot } from '@/components/AdSenseSlot';
import {
  getAdSenseClientId,
  getAdSensePlacementConfig,
  type AdSensePlacement,
} from '@/lib/adsense';
import type { Locale } from '@/lib/types';

export function AdSidebarRail({
  placement,
  locale,
  sticky = true,
}: {
  placement: AdSensePlacement;
  locale: Locale;
  sticky?: boolean;
}) {
  const clientId = getAdSenseClientId();
  const config = getAdSensePlacementConfig(placement);

  if (!clientId || !config) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }

    return (
      <aside className={`space-y-4 ${sticky ? 'xl:sticky xl:top-24' : ''}`}>
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
          {locale === 'zh'
            ? 'AdSense 側邊欄版位已接好。加入 NEXT_PUBLIC_ADSENSE_CLIENT 與對應的 NEXT_PUBLIC_ADSENSE_SLOT_* 後，這裡就會顯示真正的 Google 廣告。'
            : 'The AdSense sidebar placement is wired up. Add NEXT_PUBLIC_ADSENSE_CLIENT plus the matching NEXT_PUBLIC_ADSENSE_SLOT_* value and real Google ads will render here.'}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`space-y-4 ${sticky ? 'xl:sticky xl:top-24' : ''}`}
      aria-label={locale === 'zh' ? '廣告側欄' : 'Advertising sidebar'}
    >
      <AdSenseSlot
        clientId={clientId}
        slotId={config.slotId}
        placement={config.placement}
        locale={locale}
      />
    </aside>
  );
}
