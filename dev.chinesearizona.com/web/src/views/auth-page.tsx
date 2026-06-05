import { AuthPageClient } from '@/components/auth/AuthPageClient';
import type { AuthPageKind } from '@/lib/auth';
import type { Locale } from '@/lib/types';

type AuthPageSearchParams = {
  email_error?: string;
  next?: string;
  mode?: string;
  complete?: string;
  error?: string;
  error_description?: string;
  message?: string;
  password_error?: string;
  tone?: 'error' | 'info' | 'success';
};

export function AuthPageView({
  locale,
  searchParams,
  page,
}: {
  locale: Locale;
  searchParams?: AuthPageSearchParams;
  page: AuthPageKind;
}) {
  const passwordToggleFallback = `
    (() => {
      if (window.__authPasswordToggleFallbackInstalled) {
        return;
      }
      window.__authPasswordToggleFallbackInstalled = true;

      const syncButton = (button, input) => {
        const isVisible = input.type === 'text';
        const showText = button.getAttribute('data-show-text') ?? 'Show';
        const hideText = button.getAttribute('data-hide-text') ?? 'Hide';
        const showLabel = button.getAttribute('data-show-label') ?? 'Show password';
        const hideLabel = button.getAttribute('data-hide-label') ?? 'Hide password';

        button.textContent = isVisible ? hideText : showText;
        button.setAttribute('aria-label', isVisible ? hideLabel : showLabel);
        button.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      };

      const findInput = (button) => {
        const root = button.closest('[data-auth-password-toggle-root]');
        if (!(root instanceof HTMLElement)) {
          return null;
        }

        if (root.getAttribute('data-auth-client-ready') === 'true') {
          return null;
        }

        const input = root.querySelector('[data-auth-password-field]');
        return input instanceof HTMLInputElement ? input : null;
      };

      const syncAll = () => {
        document.querySelectorAll('[data-auth-password-toggle]').forEach((node) => {
          if (!(node instanceof HTMLButtonElement)) {
            return;
          }

          const input = findInput(node);
          if (!input) {
            return;
          }

          syncButton(node, input);
        });
      };

      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest('[data-auth-password-toggle]');
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }

        const input = findInput(button);
        if (!input) {
          return;
        }

        input.type = input.type === 'password' ? 'text' : 'password';
        syncButton(button, input);
      });

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncAll, { once: true });
      } else {
        syncAll();
      }
    })();
  `;

  if (searchParams?.complete) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6 lg:px-8">
        <script dangerouslySetInnerHTML={{ __html: passwordToggleFallback }} />
        <AuthPageClient
          locale={locale}
          page={page}
          initialNext={searchParams?.next}
          initialMode={searchParams?.mode}
          initialComplete={searchParams?.complete}
          initialEmailError={searchParams?.email_error}
          initialErrorDescription={searchParams?.error_description}
          initialMessage={searchParams?.message}
          initialPasswordError={searchParams?.password_error}
          initialTone={searchParams?.tone}
        />
      </div>
    );
  }

  if (page === 'join') {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <script dangerouslySetInnerHTML={{ __html: passwordToggleFallback }} />
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.75rem] border border-white/60 bg-[linear-gradient(145deg,#dce9ff_0%,#f6e4de_42%,#f5efe7_100%)] shadow-[0_35px_120px_rgba(84,62,38,0.16)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.78),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,203,177,0.4),transparent_30%)]" />
          <div className="absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-[#9bb7eb]/30 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#f6c6b5]/40 blur-3xl" />

          <div className="relative grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.72fr)] lg:px-10 lg:py-12">
            <div className="flex items-center">
              <div className="max-w-2xl rounded-[2rem] border border-white/70 bg-white/86 p-8 shadow-[0_22px_70px_rgba(65,49,31,0.14)] backdrop-blur sm:p-10">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8f6239]">
                  {locale === 'zh' ? '加入 ChineseArizona' : 'Join ChineseArizona'}
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#3a2a1b] sm:text-5xl">
                  {locale === 'zh'
                    ? '建立你的商家與社群帳號。'
                    : 'Create your account for listings, community, and saved tools.'}
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-[#5f4f40]">
                  {locale === 'zh'
                    ? '認領商家、發佈社群內容、儲存搜尋與使用 Shop 功能，都會綁定到同一個帳號。'
                    : 'Claim listings, post in the community, save searches, and use shop features with one account that follows you across the directory.'}
                </p>
              </div>
            </div>

            <AuthPageClient
              locale={locale}
              page={page}
              initialNext={searchParams?.next}
              initialMode={searchParams?.mode}
              initialComplete={searchParams?.complete}
              initialEmailError={searchParams?.email_error}
              initialErrorDescription={searchParams?.error_description}
              initialMessage={searchParams?.message}
              initialPasswordError={searchParams?.password_error}
              initialTone={searchParams?.tone}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-14 sm:px-6 lg:px-8">
      <script dangerouslySetInnerHTML={{ __html: passwordToggleFallback }} />
      <div className="mx-auto max-w-4xl rounded-[2.5rem] bg-[radial-gradient(circle_at_top,#ffffff,rgba(255,249,242,0.96)_48%,rgba(240,246,255,0.92)_100%)] px-6 py-10 shadow-[0_28px_90px_rgba(72,54,31,0.12)] sm:px-10 sm:py-14">
        <AuthPageClient
          locale={locale}
          page={page}
          initialNext={searchParams?.next}
          initialMode={searchParams?.mode}
          initialComplete={searchParams?.complete}
          initialEmailError={searchParams?.email_error}
          initialErrorDescription={searchParams?.error_description}
          initialMessage={searchParams?.message}
          initialPasswordError={searchParams?.password_error}
          initialTone={searchParams?.tone}
        />
      </div>
    </div>
  );
}
