// The homepage hides its News & Community block when the newest story is older
// than this, so a paused news desk does not make the site look abandoned
// (issue #506). The block comes back by itself when a newer story is published.
export const HOMEPAGE_NEWS_MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isNewsFresh(
  dates: ReadonlyArray<string | null | undefined>,
  now: number = Date.now(),
  maxAgeDays: number = HOMEPAGE_NEWS_MAX_AGE_DAYS
): boolean {
  const times = dates.map((date) => (date ? Date.parse(date) : Number.NaN)).filter(Number.isFinite);
  if (times.length === 0) {
    return false;
  }

  return now - Math.max(...times) <= maxAgeDays * DAY_MS;
}
