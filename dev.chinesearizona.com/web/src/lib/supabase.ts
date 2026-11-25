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

const SUPABASE_PROBE_TIMEOUT_MS = 2500;

export type SupabaseProbeResult = {
  ok: boolean;
  message: string;
};

// Runs one real query against a publicly readable table, so a paused,
// deleted, misconfigured or hanging Supabase project shows up as unhealthy
// instead of only checking that the env vars are present.
export async function probeSupabase(): Promise<SupabaseProbeResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey();

  if (!url || !key) {
    return { ok: false, message: 'Supabase is not configured, so it was not queried.' };
  }

  try {
    const response = await fetch(
      `${url.replace(/\/+$/, '')}/rest/v1/business_categories?select=id&limit=1`,
      {
        headers: { apikey: key },
        signal: AbortSignal.timeout(SUPABASE_PROBE_TIMEOUT_MS),
      }
    );
    await response.body?.cancel();

    if (!response.ok) {
      return { ok: false, message: `Supabase rejected a test query (HTTP ${response.status}).` };
    }

    return { ok: true, message: 'Supabase answered a test query.' };
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return {
        ok: false,
        message: `Supabase did not answer within ${SUPABASE_PROBE_TIMEOUT_MS}ms.`,
      };
    }

    const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
    return {
      ok: false,
      message:
        typeof code === 'string'
          ? `Supabase could not be reached (${code}).`
          : 'Supabase could not be reached.',
    };
  }
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
