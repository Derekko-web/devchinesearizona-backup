import { profileRoleLabel } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Locale } from '@/lib/types';

export function DashboardAccessNotice({
  locale,
  email,
  role,
}: {
  locale: Locale;
  email?: string | null;
  role: 'member' | 'business_owner' | 'editor' | 'moderator' | 'admin';
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-900 shadow-[0_18px_45px_rgba(120,53,15,0.06)]">
        {locale === 'zh'
          ? '帳號工具目前暫時無法使用。你仍然可以瀏覽目錄，管理功能會在服務完成設定後開放。'
          : 'Account tools are temporarily unavailable. You can still browse the directory while management features are being set up.'}
      </div>
    );
  }

  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_20px_50px_rgba(74,49,27,0.07)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            {locale === 'zh' ? '帳號狀態' : 'Account status'}
          </p>
          <p className="mt-2 break-all text-base font-semibold text-slate-950">{email}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {locale === 'zh'
              ? '這個帳號已可用於管理已連結的商家與後續帳號操作。'
              : 'This account is ready for connected listing and owner workflows.'}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {profileRoleLabel(role, locale)}
        </div>
      </div>
    </div>
  );
}
