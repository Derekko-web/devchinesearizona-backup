import { describe, expect, it } from 'vitest';

import {
  recentServerErrorLines,
  timestampFromAccessLogLine,
} from '../../../ops/closed-loop/access-log-health.mjs';

function accessLine(time, path, status) {
  return `127.0.0.1 - - [${time}] "GET ${path} HTTP/1.1" ${status} 21 "-" "ChineseArizona closed-loop smoke check"`;
}

describe('closed-loop access log health', () => {
  const now = Date.parse('2026-11-25T07:00:43.000Z');

  it('reads the nginx combined log timestamp', () => {
    expect(timestampFromAccessLogLine(accessLine('25/Nov/2026:04:03:37 +0000', '/zh', 502))).toBe(
      Date.parse('2026-11-25T04:03:37.000Z')
    );
    expect(timestampFromAccessLogLine(accessLine('24/Nov/2026:21:03:37 -0700', '/zh', 502))).toBe(
      Date.parse('2026-11-25T04:03:37.000Z')
    );
    expect(timestampFromAccessLogLine('not an access log line')).toBeNull();
  });

  it('ignores a 5xx burst that is older than the window', () => {
    const lines = [
      ...['/', '/en', '/zh', '/business', '/news'].map((path) =>
        accessLine('25/Nov/2026:04:03:37 +0000', path, 502)
      ),
      accessLine('25/Nov/2026:06:58:00 +0000', '/', 200),
    ];

    expect(recentServerErrorLines(lines, { now, windowMinutes: 60 })).toEqual([]);
  });

  it('keeps 5xx lines inside the window and skips non-5xx lines', () => {
    const recent502 = accessLine('25/Nov/2026:06:30:00 +0000', '/news', 502);
    const recent500 = accessLine('25/Nov/2026:06:59:59 +0000', '/zh', 500);
    const lines = [
      accessLine('25/Nov/2026:04:03:37 +0000', '/', 502),
      recent502,
      accessLine('25/Nov/2026:06:40:00 +0000', '/en', 404),
      recent500,
    ];

    expect(recentServerErrorLines(lines, { now, windowMinutes: 60 })).toEqual([
      recent502,
      recent500,
    ]);
  });

  it('counts every 5xx line when the log has no readable timestamps', () => {
    const lines = ['a b c d e f g h 502 x', 'a b c d e f g h 200 x'];

    expect(recentServerErrorLines(lines, { now, windowMinutes: 60 })).toEqual([lines[0]]);
  });

  it('defaults to a 60 minute window', () => {
    const lines = [
      accessLine('25/Nov/2026:05:59:00 +0000', '/', 502),
      accessLine('25/Nov/2026:06:01:00 +0000', '/en', 502),
    ];

    expect(recentServerErrorLines(lines, { now })).toEqual([lines[1]]);
    expect(recentServerErrorLines(lines, { now, windowMinutes: 'bad' })).toEqual([lines[1]]);
  });
});
