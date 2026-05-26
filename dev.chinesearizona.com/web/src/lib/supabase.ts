import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null | undefined;

type SupabaseAuthLocale = 'en' | 'zh';

const transientSupabaseErrorPattern =
  /cloudflare|error\s*522|timed?\s*out|timeout|failed to fetch|fetch failed|network(?:error| request failed)?|<!doctype|<html/i;

function unknownErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return null;
}

export function getSupabaseAuthUnavailableMessage(locale: SupabaseAuthLocale): string {
  return locale === 'zh'
    ? '登入服務暫時無法使用。請稍後再試。'
    : 'Authentication is temporarily unavailable. Please try again shortly.';
}

export function hasSupabaseAuthErrorMessage(error: unknown, expectedMessage: string): boolean {
  return unknownErrorMessage(error) === expectedMessage;
}

export function getSupabaseAuthErrorMessage(
  error: unknown,
  locale: SupabaseAuthLocale,
  fallback: string
): string {
  const message = unknownErrorMessage(error);

  if (!message) {
    return fallback;
  }

  if (message.length > 240 || transientSupabaseErrorPattern.test(message)) {
    return getSupabaseAuthUnavailableMessage(locale);
  }

  return message;
}

export function getSupabasePublicKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return key && key.length > 0 ? key : null;
}

function createSupabaseInstance(persistSession: boolean): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    getSupabasePublicKey() as string,
    {
      auth: {
        flowType: persistSession ? 'pkce' : 'implicit',
        persistSession,
        autoRefreshToken: persistSession,
        detectSessionInUrl: persistSession,
      },
    }
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey());
}

export function isSupabaseServiceConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createSupabaseInstance(false);
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (browserClient !== undefined) {
    return browserClient;
  }

  browserClient = createSupabaseInstance(true);
  return browserClient;
}

export function getSupabaseServiceClient() {
  if (!isSupabaseServiceConfigured()) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
