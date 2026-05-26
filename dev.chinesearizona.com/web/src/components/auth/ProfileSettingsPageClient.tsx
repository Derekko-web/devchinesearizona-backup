'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { persistServerSession } from '@/lib/client-auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import { withLocale } from '@/lib/routing';
import type { Locale } from '@/lib/types';
import { useAuth } from './AuthProvider';

type ProfileSettingsTab = 'profile' | 'email';
type StatusTone = 'error' | 'info' | 'success';
type StatusState = {
  message: string;
  tone: StatusTone;
};

export type ProfileSettingsInitialData = {
  aboutMe: string;
  avatarUrl: string;
  email: string;
  firstName: string;
  lastName: string;
  persistedBioZh: string;
  persistedDisplayName: string;
  persistedNameZh: string;
  userId: string;
  username: string;
  website: string;
};

function buildDisplayName(firstName: string, lastName: string, username: string): string {
  const joined = `${firstName.trim()} ${lastName.trim()}`.trim();
  return joined || username.trim();
}

function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function statusClasses(tone: StatusTone): string {
  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-[#dcc7a3] bg-[#fbf6ec] text-[#7d6036]';
}

function inputClasses(readOnly = false): string {
  return [
    'w-full border px-4 py-3 text-lg text-slate-800 outline-none transition',
    readOnly ? 'border-[#ded7cb] bg-[#f7f4ef] text-slate-500' : 'border-[#d8d1c4] bg-white focus:border-[#c9ab77]',
  ].join(' ');
}

function SettingsFieldLabel({
  hint,
  title,
}: {
  hint?: string;
  title: string;
}) {
  return (
    <label className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-800">
      <span>{title}</span>
      {hint ? <span className="ml-3 font-medium tracking-[0.12em] text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function ProfileSettingsPageClient({
  initialData,
  locale,
}: {
  initialData: ProfileSettingsInitialData;
  locale: Locale;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const currentEmail = user?.id === initialData.userId ? (user.email ?? initialData.email) : initialData.email;
  const currentUsername =
    user?.id === initialData.userId && typeof user.user_metadata?.username === 'string' && user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
      : initialData.username;
  const [activeTab, setActiveTab] = useState<ProfileSettingsTab>('profile');
  const [busyAction, setBusyAction] = useState<'profile' | 'email' | 'password' | null>(null);
  const [status, setStatus] = useState<StatusState | null>(null);
  const [profileForm, setProfileForm] = useState({
    aboutMe: initialData.aboutMe,
    avatarUrl: initialData.avatarUrl,
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    username: currentUsername,
    website: initialData.website,
  });
  const [persistedProfile, setPersistedProfile] = useState({
    aboutMe: initialData.aboutMe,
    bioZh: initialData.persistedBioZh,
    displayName: initialData.persistedDisplayName,
    nameZh: initialData.persistedNameZh,
  });
  const [emailForm, setEmailForm] = useState({
    nextEmail: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: '',
    newPassword: '',
  });
  const cancelHref = withLocale(locale, '/dashboard');
  const previewHandle = normalizeUsername(profileForm.username) || currentUsername || 'member';
  const avatarUrl = profileForm.avatarUrl.trim();
  const avatarInitial = (previewHandle.charAt(0) || 'm').toUpperCase();

  async function getBrowserClient() {
    let client: ReturnType<typeof getSupabaseBrowserClient> = null;

    try {
      client = getSupabaseBrowserClient();
    } catch {
      client = null;
    }

    if (!client || !isSupabaseConfigured()) {
      setStatus({
        message:
          locale === 'zh'
            ? '尚未設定 Supabase Auth 環境值。請先加入 NEXT_PUBLIC_SUPABASE_URL，以及 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY。'
            : 'Supabase Auth env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL plus NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY first.',
        tone: 'error',
      });
      return null;
    }

    return client;
  }

  async function persistLatestSession(client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>) {
    const {
      data: { session },
    } = await client.auth.getSession();

    if (session) {
      await persistServerSession(session);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    const normalizedUsername = normalizeUsername(profileForm.username);
    if (!normalizedUsername) {
      setStatus({
        message:
          locale === 'zh'
            ? '請輸入使用者名稱。'
            : 'Please add a username.',
        tone: 'error',
      });
      return;
    }

    if (profileForm.website.trim() && !isValidUrl(profileForm.website.trim())) {
      setStatus({
        message:
          locale === 'zh'
            ? '網站網址需要以 http:// 或 https:// 開頭。'
            : 'Website URLs must start with http:// or https://.',
        tone: 'error',
      });
      return;
    }

    if (avatarUrl && !isValidUrl(avatarUrl)) {
      setStatus({
        message:
          locale === 'zh'
            ? '頭像網址需要以 http:// 或 https:// 開頭。'
            : 'Avatar URLs must start with http:// or https://.',
        tone: 'error',
      });
      return;
    }

    setBusyAction('profile');
    setStatus(null);

    const nextDisplayName = buildDisplayName(
      profileForm.firstName,
      profileForm.lastName,
      normalizedUsername
    );
    const nextNameZh =
      persistedProfile.nameZh && persistedProfile.nameZh !== persistedProfile.displayName
        ? persistedProfile.nameZh
        : nextDisplayName;
    const nextBioZh =
      persistedProfile.bioZh && persistedProfile.bioZh !== persistedProfile.aboutMe
        ? persistedProfile.bioZh
        : profileForm.aboutMe.trim();

    const { data: updatedProfile, error: profileError } = await client
      .from('profiles')
      .update({
        bio_en: profileForm.aboutMe.trim(),
        bio_zh_tw: nextBioZh,
        name: nextDisplayName,
        name_zh_tw: nextNameZh || nextDisplayName,
        slug: normalizedUsername,
      })
      .eq('auth_user_id', initialData.userId)
      .select('slug, name, name_zh_tw, bio_en, bio_zh_tw')
      .single();

    if (profileError || !updatedProfile) {
      const duplicateSlug =
        profileError?.message?.includes('profiles_slug_key') ||
        profileError?.message?.includes('duplicate key value');

      setStatus({
        message: duplicateSlug
          ? locale === 'zh'
            ? '這個使用者名稱已被使用，請換一個。'
            : 'That username is already taken. Try another one.'
          : profileError?.message ??
            (locale === 'zh'
              ? '目前無法更新個人資料。請稍後再試。'
              : 'Unable to update your profile right now. Please try again.'),
        tone: 'error',
      });
      setBusyAction(null);
      return;
    }

    const { error: userError } = await client.auth.updateUser({
      data: {
        avatar_url: avatarUrl || null,
        first_name: profileForm.firstName.trim() || null,
        full_name: nextDisplayName || null,
        last_name: profileForm.lastName.trim() || null,
        name: nextDisplayName || null,
        picture: avatarUrl || null,
        username: normalizedUsername,
        website: profileForm.website.trim() || null,
      },
    });

    await persistLatestSession(client);
    setBusyAction(null);

    if (userError) {
      setStatus({
        message:
          userError.message ??
          (locale === 'zh'
            ? '個人資料主體已更新，但帳號資訊沒有完全同步。請重新整理後再試一次。'
            : 'Your profile was updated, but account metadata did not fully sync. Refresh and try once more.'),
        tone: 'error',
      });
      router.refresh();
      return;
    }

    setProfileForm((current) => ({
      ...current,
      avatarUrl,
      username: normalizedUsername,
      website: current.website.trim(),
    }));
    setPersistedProfile({
      aboutMe: updatedProfile.bio_en,
      bioZh: updatedProfile.bio_zh_tw,
      displayName: updatedProfile.name,
      nameZh: updatedProfile.name_zh_tw,
    });
    setStatus({
      message:
        locale === 'zh'
          ? '個人資料已更新。'
          : 'Your profile has been updated.',
      tone: 'success',
    });
    router.refresh();
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    const nextEmail = emailForm.nextEmail.trim();
    if (!nextEmail) {
      setStatus({
        message:
          locale === 'zh'
            ? '請輸入新的 email。'
            : 'Please enter a new email address.',
        tone: 'error',
      });
      return;
    }

    setBusyAction('email');
    setStatus(null);

    const { error } = await client.auth.updateUser({
      email: nextEmail,
    });

    await persistLatestSession(client);
    setBusyAction(null);

    if (error) {
      setStatus({
        message:
          error.message ??
          (locale === 'zh'
            ? '目前無法更新 email。'
            : 'Unable to update your email right now.'),
        tone: 'error',
      });
      return;
    }

    setEmailForm({ nextEmail: '' });
    setStatus({
      message:
        locale === 'zh'
          ? '確認信已寄出。請到新的 email 收件匣完成變更。'
          : 'Confirmation sent. Check your new inbox to finish updating your email.',
      tone: 'success',
    });
    router.refresh();
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const client = await getBrowserClient();
    if (!client) {
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setStatus({
        message:
          locale === 'zh'
            ? '新密碼至少需要 6 個字元。'
            : 'Your new password must be at least 6 characters long.',
        tone: 'error',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus({
        message:
          locale === 'zh'
            ? '兩次輸入的新密碼不一致。'
            : 'New password and confirmation do not match.',
        tone: 'error',
      });
      return;
    }

    setBusyAction('password');
    setStatus(null);

    const { error } = await client.auth.updateUser({
      password: passwordForm.newPassword,
    });

    await persistLatestSession(client);
    setBusyAction(null);

    if (error) {
      setStatus({
        message:
          error.message ??
          (locale === 'zh'
            ? '目前無法更新密碼。'
            : 'Unable to update your password right now.'),
        tone: 'error',
      });
      return;
    }

    setPasswordForm({
      confirmPassword: '',
      newPassword: '',
    });
    setStatus({
      message:
        locale === 'zh'
          ? '密碼已更新。'
          : 'Your password has been updated.',
      tone: 'success',
    });
  }

  return (
    <div className="w-full bg-[linear-gradient(180deg,#f7f3ec_0%,#f8f5ef_36%,#fbfaf7_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9e8459]">
            {locale === 'zh' ? '帳號設定' : 'Account Settings'}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#362615] sm:text-5xl">
            {locale === 'zh' ? '編輯你的個人資料' : 'Edit Your Profile'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6d5a45] sm:text-base">
            {locale === 'zh'
              ? '更新站內顯示名稱、個人簡介、Email 設定與密碼。你的使用者名稱會用在帳號選單與未來的公開個人頁。'
              : 'Update how your account appears across the site, refresh your bio and avatar, and manage your email or password in one place.'}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-[#d9ccb8]">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`border px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition ${
              activeTab === 'profile'
                ? 'border-[#d0b183] bg-[#d0b183] text-white'
                : 'border-[#d9ccb8] bg-transparent text-[#b49363] hover:bg-[#fbf6ed]'
            }`}
          >
            {locale === 'zh' ? '個人資料' : 'Profile'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`border px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition ${
              activeTab === 'email'
                ? 'border-[#d0b183] bg-[#d0b183] text-white'
                : 'border-[#d9ccb8] bg-transparent text-[#b49363] hover:bg-[#fbf6ed]'
            }`}
          >
            {locale === 'zh' ? 'Email 設定' : 'Email Settings'}
          </button>
        </div>

        <section className="border border-t-0 border-[#d9ccb8] bg-[rgba(255,252,247,0.9)] px-5 py-6 shadow-[0_18px_60px_rgba(71,50,25,0.08)] sm:px-8 sm:py-8">
          {status ? (
            <div className={`mb-6 border px-4 py-3 text-sm font-medium ${statusClasses(status.tone)}`}>
              {status.message}
            </div>
          ) : null}

          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit} className="space-y-10">
              <div className="space-y-6">
                <h2 className="text-4xl font-bold tracking-tight text-[#362615]">
                  {locale === 'zh' ? '必填欄位' : 'Required'}
                </h2>

                <div>
                  <SettingsFieldLabel
                    title={locale === 'zh' ? '使用者名稱' : 'Username'}
                    hint={locale === 'zh' ? '這是站內顯示名稱與未來個人頁網址' : "How you'll be known on the site"}
                  />
                  <input
                    value={profileForm.username}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <SettingsFieldLabel
                    title={locale === 'zh' ? 'Email' : 'Email'}
                    hint={locale === 'zh' ? '這是我們聯絡你的方式' : 'How we can reach you'}
                  />
                  <input value={currentEmail} readOnly className={inputClasses(true)} />
                </div>

                <div className="border-b border-[#e7ddd0] pb-6">
                  <SettingsFieldLabel title={locale === 'zh' ? '密碼' : 'Password'} />
                  <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className="text-sm font-semibold uppercase tracking-[0.14em] text-[#c4a26b] transition-colors hover:text-[#a37c45]"
                  >
                    {locale === 'zh' ? '變更' : 'Change'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-4xl font-bold tracking-tight text-[#362615]">
                  {locale === 'zh' ? '選填欄位' : 'Optional'}
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <SettingsFieldLabel title={locale === 'zh' ? '名字' : 'First Name'} />
                    <input
                      value={profileForm.firstName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          firstName: event.target.value,
                        }))
                      }
                      className={inputClasses()}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <SettingsFieldLabel title={locale === 'zh' ? '姓氏' : 'Last Name'} />
                    <input
                      value={profileForm.lastName}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          lastName: event.target.value,
                        }))
                      }
                      className={inputClasses()}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div>
                  <SettingsFieldLabel
                    title={locale === 'zh' ? '網站' : 'Website'}
                    hint={locale === 'zh' ? '你的個人網站或社群首頁' : 'Where you live on the internet'}
                  />
                  <input
                    value={profileForm.website}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        website: event.target.value,
                      }))
                    }
                    className={inputClasses()}
                    placeholder="https://"
                    autoComplete="url"
                  />
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-start">
                  <div>
                    <SettingsFieldLabel
                      title={locale === 'zh' ? '個人頭像' : 'Profile Image'}
                      hint={locale === 'zh' ? '先貼上圖片網址，之後可再接檔案上傳' : 'Paste an image URL for now'}
                    />
                    <input
                      value={profileForm.avatarUrl}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          avatarUrl: event.target.value,
                        }))
                      }
                      className={inputClasses()}
                      placeholder="https://images.example.com/avatar.jpg"
                    />
                  </div>
                  <div className="flex justify-start lg:justify-end">
                    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#d9ccb8] bg-[#edf3eb] shadow-sm">
                      {avatarUrl ? (
                        // User-provided remote avatar URLs are not constrained to Next image domains.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-[#6f8a60]">{avatarInitial}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <SettingsFieldLabel
                    title={locale === 'zh' ? '關於我' : 'About Me'}
                    hint={locale === 'zh' ? '寫幾句介紹自己' : 'Tell us about yourself'}
                  />
                  <textarea
                    value={profileForm.aboutMe}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        aboutMe: event.target.value,
                      }))
                    }
                    rows={7}
                    className={`${inputClasses()} resize-y`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                <button
                  type="submit"
                  disabled={busyAction === 'profile'}
                  className="inline-flex min-w-56 items-center justify-center bg-[#d4674f] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#bf5943] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === 'profile'
                    ? locale === 'zh'
                      ? '更新中...'
                      : 'Updating...'
                    : locale === 'zh'
                      ? '更新個人資料'
                      : 'Update Profile'}
                </button>
                <Link
                  href={cancelHref}
                  className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c6a066] transition-colors hover:text-[#a97e44]"
                >
                  {locale === 'zh' ? '取消' : 'Cancel'}
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-10">
              <div className="space-y-3">
                <h2 className="text-4xl font-bold tracking-tight text-[#362615]">
                  {locale === 'zh' ? 'Email 設定' : 'Email Settings'}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#6d5a45] sm:text-base">
                  {locale === 'zh'
                    ? '在這裡更新聯絡 email，或直接為目前帳號設定新密碼。'
                    : 'Update the email tied to this account, or set a fresh password for your current session.'}
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6 border-b border-[#e7ddd0] pb-8">
                <div>
                  <SettingsFieldLabel
                    title={locale === 'zh' ? '目前 Email' : 'Current Email'}
                    hint={locale === 'zh' ? '這是目前登入使用的信箱' : 'Currently attached to this account'}
                  />
                  <input value={currentEmail} readOnly className={inputClasses(true)} />
                </div>

                <div>
                  <SettingsFieldLabel
                    title={locale === 'zh' ? '新的 Email' : 'New Email'}
                    hint={locale === 'zh' ? '我們會寄確認信到新的信箱' : 'We will send a confirmation link'}
                  />
                  <input
                    type="email"
                    value={emailForm.nextEmail}
                    onChange={(event) =>
                      setEmailForm({
                        nextEmail: event.target.value,
                      })
                    }
                    className={inputClasses()}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busyAction === 'email'}
                  className="inline-flex min-w-48 items-center justify-center border border-[#d0b183] bg-[#fbf6ec] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#8d6a38] transition-colors hover:bg-[#f5ecd8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === 'email'
                    ? locale === 'zh'
                      ? '更新中...'
                      : 'Updating...'
                    : locale === 'zh'
                      ? '更新 Email'
                      : 'Update Email'}
                </button>
              </form>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-[#362615]">
                    {locale === 'zh' ? '密碼' : 'Password'}
                  </h3>
                  <p className="text-sm leading-7 text-[#6d5a45]">
                    {locale === 'zh'
                      ? '直接在這裡設定新的登入密碼。'
                      : 'Set a new sign-in password for this account right here.'}
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <SettingsFieldLabel title={locale === 'zh' ? '新密碼' : 'New Password'} />
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          newPassword: event.target.value,
                        }))
                      }
                      className={inputClasses()}
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <SettingsFieldLabel title={locale === 'zh' ? '確認新密碼' : 'Confirm Password'} />
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      className={inputClasses()}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-5">
                  <button
                    type="submit"
                    disabled={busyAction === 'password'}
                    className="inline-flex min-w-52 items-center justify-center bg-[#d4674f] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#bf5943] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === 'password'
                      ? locale === 'zh'
                        ? '更新中...'
                        : 'Updating...'
                      : locale === 'zh'
                        ? '更新密碼'
                        : 'Update Password'}
                  </button>
                  <Link
                    href={cancelHref}
                    className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c6a066] transition-colors hover:text-[#a97e44]"
                  >
                    {locale === 'zh' ? '返回後台' : 'Back to dashboard'}
                  </Link>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
