// Short shared cache for public directory reads (issue #524).
//
// Business, category and city pages each made 3-6 sequential Supabase requests
// per page view (listings, "most popular", categories, active plans and ad
// campaigns). Results are now kept for DIRECTORY_CACHE_TTL_MS and shared by all
// requests in this server process, including the metadata and the page of the
// same request.
//
// Freshness: every code path that changes what a listing shows (owner edits,
// photo changes, deletes, claim approval, plan purchases, ad campaign changes)
// calls invalidateDirectoryCache() after its write succeeds, so the owner sees
// the change on the next page load. Changes made outside the app (a SQL update,
// a newly approved listing) show within the TTL.
//
// The production app runs as one process (pm2 fork mode), so one in-memory
// store is coherent. It lives on globalThis so every server bundle shares it.

export const DIRECTORY_CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 300;

type Entry = {
  expiresAt: number;
  value: Promise<unknown>;
};

type CacheState = {
  entries: Map<string, Entry>;
};

const globalKey = '__chineseArizonaDirectoryCache';

function state(): CacheState {
  const holder = globalThis as typeof globalThis & { [globalKey]?: CacheState };
  holder[globalKey] ??= { entries: new Map() };
  return holder[globalKey];
}

function resolveTtlMs(): number {
  const configured = process.env.DIRECTORY_CACHE_TTL_MS;
  if (configured === undefined || configured === '') {
    // Off under tests unless a test asks for it, so mocked databases never leak between tests.
    return process.env.NODE_ENV === 'test' ? 0 : DIRECTORY_CACHE_TTL_MS;
  }

  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DIRECTORY_CACHE_TTL_MS;
}

type CachedReadOptions<T> = {
  // Results that should not be kept (a failed query, a miss that falls back to fixtures).
  shouldCache?: (value: T) => boolean;
  now?: () => number;
};

// Returns the cached result for `key`, or runs `load` once and shares its
// promise with every caller until it expires. Concurrent requests for the same
// key wait on the same query instead of each starting one.
export function cachedDirectoryRead<T>(
  key: string,
  load: () => Promise<T>,
  options: CachedReadOptions<T> = {}
): Promise<T> {
  const ttlMs = resolveTtlMs();
  if (ttlMs === 0) {
    return load();
  }

  const now = options.now ?? Date.now;
  const { entries } = state();
  const existing = entries.get(key);
  if (existing && existing.expiresAt > now()) {
    return existing.value as Promise<T>;
  }

  const value = load();
  const entry: Entry = { expiresAt: now() + ttlMs, value };
  entries.delete(key);
  entries.set(key, entry);
  while (entries.size > MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    entries.delete(oldestKey);
  }

  const forget = () => {
    if (entries.get(key) === entry) {
      entries.delete(key);
    }
  };
  value.then((result) => {
    if (options.shouldCache && !options.shouldCache(result)) {
      forget();
    }
  }, forget);

  return value;
}

// Call after any write that changes what a listing, plan or ad shows.
export function invalidateDirectoryCache(): void {
  state().entries.clear();
}

export function directoryCacheSize(): number {
  return state().entries.size;
}
