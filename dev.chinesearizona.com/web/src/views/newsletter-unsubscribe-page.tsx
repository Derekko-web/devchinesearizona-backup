import { isValidUnsubscribeToken } from '@/lib/newsletter';

type Copy = { en: string; zh: string };

type NewsletterUnsubscribeViewProps = {
  token?: string;
  status?: string;
};

const states: Record<'done' | 'invalid' | 'error' | 'confirm' | 'missing', { title: Copy; body: Copy }> = {
  done: {
    title: { en: "You're unsubscribed", zh: '已取消訂閱' },
    body: {
      en: "We won't send you newsletter emails anymore. You can sign up again from the bottom of any page.",
      zh: '我們不會再寄電子報給你。若想重新訂閱，可在任何頁面底部再次填寫。',
    },
  },
  invalid: {
    title: { en: 'This link is not valid', zh: '連結無效' },
    body: {
      en: 'We could not find a subscription for this link. It may have been copied incompletely. Use the unsubscribe link in your most recent email, or contact us.',
      zh: '找不到這個連結對應的訂閱，可能是連結複製不完整。請使用最近一封電子報中的取消訂閱連結，或與我們聯絡。',
    },
  },
  error: {
    title: { en: 'Something went wrong', zh: '發生錯誤' },
    body: {
      en: 'We could not update your subscription right now. Please try the link again in a few minutes.',
      zh: '目前無法更新你的訂閱，請過幾分鐘再試一次。',
    },
  },
  confirm: {
    title: { en: 'Unsubscribe from our newsletter?', zh: '確定要取消訂閱電子報嗎？' },
    body: {
      en: 'Press the button below and we will stop sending you newsletter emails.',
      zh: '按下方按鈕後，我們就不會再寄電子報給你。',
    },
  },
  missing: {
    title: { en: 'Unsubscribe', zh: '取消訂閱' },
    body: {
      en: 'To unsubscribe, use the link at the bottom of any newsletter email we sent you.',
      zh: '如要取消訂閱，請點選電子報底部的取消訂閱連結。',
    },
  },
};

function resolveState(token?: string, status?: string): keyof typeof states {
  if (status === 'done' || status === 'invalid' || status === 'error') {
    return status;
  }

  if (token === undefined || token === '') {
    return 'missing';
  }

  return isValidUnsubscribeToken(token) ? 'confirm' : 'invalid';
}

// One page in both languages, since a reader may arrive from either version of
// an email. It is noindex and only reachable from email links.
export function NewsletterUnsubscribeView({ token, status }: NewsletterUnsubscribeViewProps) {
  const state = resolveState(token, status);
  const copy = states[state];

  return (
    <div className="bg-[#f7f1e8] px-4 py-16 text-[#2c2722] sm:py-24">
      <div className="mx-auto max-w-xl rounded-lg border border-[#dfd4c8] bg-[#fbf7f0] p-8 shadow-[0_24px_70px_rgba(85,58,28,0.08)]">
        <h1 className="font-serif text-3xl leading-tight text-[#2f2923]">{copy.title.en}</h1>
        <p className="mt-1 text-xl text-[#6d6258]" lang="zh-Hant">
          {copy.title.zh}
        </p>
        <p className="mt-5 text-sm leading-6 text-[#4a3f37]">{copy.body.en}</p>
        <p className="mt-2 text-sm leading-6 text-[#4a3f37]" lang="zh-Hant">
          {copy.body.zh}
        </p>

        {state === 'confirm' && token ? (
          <form method="post" action="/api/newsletter/unsubscribe" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Unsubscribe · 取消訂閱
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
