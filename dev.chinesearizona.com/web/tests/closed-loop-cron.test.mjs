import { describe, expect, it } from 'vitest';

import {
  recentCronAnomalyLines,
  timestampFromCronLine,
} from '../../../ops/closed-loop/cron-log-health.mjs';

describe('closed-loop cron log health', () => {
  const now = Date.parse('2026-05-27T01:40:00.000Z');

  it('extracts timestamps from structured skip lines and pretty run IDs', () => {
    expect(
      timestampFromCronLine(
        '{"status":"skipped","reason":"lock_busy","timestamp":"2026-05-27T01:35:00Z"}'
      )
    ).toBe(Date.parse('2026-05-27T01:35:00.000Z'));

    expect(
      timestampFromCronLine('"runId": "arizona-radar-2026-05-26T23:05:01.842Z",')
    ).toBe(Date.parse('2026-05-26T23:05:01.842Z'));
  });

  it('ignores stale radar anomalies when the log also has timestamped clean runs', () => {
    const anomalies = recentCronAnomalyLines(
      [
        '{',
        '  "status": "completed",',
        '  "runId": "arizona-radar-2026-05-11T12:00:01.343Z"',
        '}',
        'spawnSync hermes ETIMEDOUT',
        '{"status":"skipped","reason":"lock_busy"}',
        '{',
        '  "status": "completed",',
        '  "runId": "arizona-radar-2026-05-25T12:00:02.227Z"',
        '}',
      ].join('\n'),
      { now, recentHours: 48 }
    );

    expect(anomalies).toHaveLength(0);
  });

  it('keeps recent timestamped radar anomalies', () => {
    const anomalies = recentCronAnomalyLines(
      [
        '{"status":"completed","runId":"arizona-radar-2026-05-27T01:00:00.000Z"}',
        '{"status":"skipped","reason":"lock_busy","timestamp":"2026-05-27T01:05:00Z"}',
        '{"status":"failed","timestamp":"2026-05-27T01:10:00.000Z","errorMessage":"spawnSync hermes ETIMEDOUT"}',
      ].join('\n'),
      { now, recentHours: 48 }
    );

    expect(anomalies.map((entry) => entry.line)).toEqual([
      '{"status":"skipped","reason":"lock_busy","timestamp":"2026-05-27T01:05:00Z"}',
      '{"status":"failed","timestamp":"2026-05-27T01:10:00.000Z","errorMessage":"spawnSync hermes ETIMEDOUT"}',
    ]);
  });

  it('keeps unstructured cron errors when a log has no timestamps at all', () => {
    const anomalies = recentCronAnomalyLines('Traceback: article sync failed', {
      now,
      recentHours: 48,
    });

    expect(anomalies).toHaveLength(1);
  });
});
