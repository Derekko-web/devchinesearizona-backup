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

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <script dangerouslySetInnerHTML={{ __html: passwordToggleFallback }} />
      <div className="mx-auto flex min-h-[calc(100dvh-220px)] w-full max-w-lg items-center">
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
    </section>
  );
}
