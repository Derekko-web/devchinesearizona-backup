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
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-800">
        {locale === 'zh'
          ? '帳號工具目前暫時無法使用。你仍然可以瀏覽目錄，管理功能會在服務完成設定後開放。'
          : 'Account tools are temporarily unavailable. You can still browse the directory while management features are being set up.'}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
        {locale === 'zh' ? '帳號' : 'Account'}
      </p>
      <p className="mt-3 text-base font-semibold text-slate-900">{email}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {locale === 'zh'
          ? '這個帳號已可用於管理已連結的商家與後續帳號操作。'
          : 'This account is ready to manage any listings and workflows connected to it.'}
      </p>
      <p className="mt-3 text-sm font-medium text-emerald-800">
        {locale === 'zh' ? '角色' : 'Role'}: {profileRoleLabel(role, locale)}
      </p>
    </div>
  );
}
