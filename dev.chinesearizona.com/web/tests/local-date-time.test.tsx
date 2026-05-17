import { describe, expect, it } from 'vitest';

import { formatDateTimeInTimeZone } from '@/components/LocalDateTime';

describe('LocalDateTime', () => {
  it('formats timestamps in the provided timezone', () => {
    const date = '2026-04-18T22:01:32.901Z';

    expect(formatDateTimeInTimeZone(date, 'en', 'UTC')).toBe('Apr 18, 2026, 10:01 PM UTC');
    expect(formatDateTimeInTimeZone(date, 'en', 'America/Chicago')).toBe(
      'Apr 18, 2026, 5:01 PM CDT'
    );
  });
});
