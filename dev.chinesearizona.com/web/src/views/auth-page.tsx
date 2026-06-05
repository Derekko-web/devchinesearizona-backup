import Image from 'next/image';

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

type AuthEntryCopy = {
  eyebrow: string;
  headline: string;
  body: string;
  imageAlt: string;
  imageCaption: string;
  notes: string[];
};

function authEntryCopy(locale: Locale, page: AuthPageKind, isComplete: boolean): AuthEntryCopy {
  if (isComplete) {
    return locale === 'zh'
      ? {
          eyebrow: '安全登入',
          headline: '正在完成登入。',
          body: '完成後會自動回到你剛剛開始的流程。',
          imageAlt: 'Phoenix Chinese community program with a Mandarin learning activity',
          imageCaption: '登入後會回到原本的商家、社群或 Shop 流程。',
          notes: ['保持這個分頁開啟', '不需要重複送出表單', '若失敗可回到登入頁'],
        }
      : {
          eyebrow: 'Secure account',
          headline: 'Finishing sign-in.',
          body: 'You will return to the claim, community, or shop flow you started.',
          imageAlt: 'Phoenix Chinese community program with a Mandarin learning activity',
          imageCaption: 'After sign-in, you return to the workflow that brought you here.',
          notes: ['Keep this tab open', 'No extra form submit is needed', 'Return to login if the callback fails'],
        };
  }

  if (page === 'join') {
    return locale === 'zh'
      ? {
          eyebrow: '加入 ChineseArizona',
          headline: '建立本地帳號。',
          body: '認領商家、發佈社群內容、儲存搜尋與使用 Shop 工具。',
          imageAlt: 'Phoenix Chinese community program with a Mandarin learning activity',
          imageCaption: '社群資訊、商家認領與 marketplace 工具會共用同一個帳號。',
          notes: ['商家認領與審核狀態', '社群發文與後續通知', 'Shop 賣家與帳號工具'],
        }
      : {
          eyebrow: 'Join ChineseArizona',
          headline: 'Create your local account.',
          body: 'Claim listings, post updates, save local picks, and use shop tools.',
          imageAlt: 'Phoenix Chinese community program with a Mandarin learning activity',
          imageCaption: 'Community posts, listing claims, and marketplace tools share one account.',
          notes: ['Business claims and review status', 'Community posts and follow-up', 'Shop seller and account tools'],
        };
  }

  return locale === 'zh'
    ? {
        eyebrow: '登入',
        headline: '回到你的本地工具。',
        body: '用 email 密碼或 Google 登入，然後回到剛剛的操作。',
        imageAlt: 'Phoenix Chinese community program with a Mandarin learning activity',
        imageCaption: '你的登入會保留返回路徑，讓你繼續原本的操作。',
        notes: ['認領與管理商家資料', '發佈社群內容', '查看帳號與 Shop 工具'],
      }
    : {
        eyebrow: 'Log in',
        headline: 'Return to your local tools.',
        body: 'Use email and password or Google, then continue where you left off.',
        imageAlt: 'Phoenix Chinese community program with a Mandarin learning activity',
        imageCaption: 'Your return path is preserved so the original action can continue.',
        notes: ['Claim and manage listings', 'Publish community posts', 'Open account and shop tools'],
      };
}

export function AuthPageView({
  locale,
  searchParams,
  page,
}: {
  locale: Locale;
  searchParams?: AuthPageSearchParams;
  page: AuthPageKind;
}) {
  const isComplete = Boolean(searchParams?.complete);
  const copy = authEntryCopy(locale, page, isComplete);
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

  return (
    <section className="auth-page-rise px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
      <script dangerouslySetInnerHTML={{ __html: passwordToggleFallback }} />
      <div className="mx-auto grid min-h-[calc(100dvh-190px)] max-w-7xl items-start gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(24rem,0.78fr)]">
        <div className="order-2 relative overflow-hidden rounded-[28px] border border-[#e5d5c5] bg-[#fffaf3] p-5 shadow-[0_28px_70px_-54px_rgba(80,48,24,0.52)] sm:p-7 lg:order-1 lg:min-h-[680px]">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/chinesearizona-logo.png"
              alt=""
              width={52}
              height={52}
              className="h-12 w-12 rounded-[14px] shadow-[0_16px_30px_-22px_rgba(187,61,41,0.9)]"
              priority
            />
            <div>
              <p className="text-sm font-semibold text-[#2d221b]">ChineseArizona</p>
              <p className="text-sm text-[#7b6658]">{copy.eyebrow}</p>
            </div>
          </div>

          <div className="mt-10 max-w-3xl lg:mt-14">
            <h1 className="max-w-3xl text-[2.65rem] font-semibold leading-[0.98] tracking-tight text-[#241913] sm:text-[3.8rem] lg:text-[4.45rem] [font-family:var(--font-display)]">
              {copy.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5e4a3d]">{copy.body}</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {copy.notes.map((note) => (
              <div key={note} className="rounded-[18px] border border-[#eadccc] bg-white/72 px-4 py-3 text-sm font-semibold leading-5 text-[#4f3d31]">
                {note}
              </div>
            ))}
          </div>

          <figure className="mt-8">
            <div className="auth-page-photo relative aspect-[16/9] overflow-hidden rounded-[24px] border border-[#dcc9b8] bg-[#eaded0] shadow-[0_26px_58px_-48px_rgba(74,49,27,0.6)]">
              <Image
                src="/community/schools/chinese-linguistic-school-of-phoenix.webp"
                alt={copy.imageAlt}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
                priority={!isComplete}
              />
            </div>
            <figcaption className="mt-3 max-w-xl text-sm leading-6 text-[#6b5748]">{copy.imageCaption}</figcaption>
          </figure>
        </div>

        <div className="order-1 lg:order-2 lg:pl-2">
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
    </section>
  );
}
