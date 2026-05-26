import { describe, expect, it } from 'vitest';

import { evaluatePm2Health } from '../../../ops/closed-loop/pm2-health.mjs';

function pm2App(overrides = {}) {
  return {
    name: 'dev-chinesearizona',
    pm2_env: {
      node_version: '20.20.2',
      pm_uptime: Date.parse('2026-05-26T20:00:00.000Z'),
      restart_time: 0,
      status: 'online',
      unstable_restarts: 0,
      ...overrides,
    },
  };
}

describe('closed-loop PM2 health', () => {
  const now = Date.parse('2026-05-26T22:00:00.000Z');

  it('does not flag cumulative deploy restarts after the process has stabilized', () => {
    const health = evaluatePm2Health(pm2App({ restart_time: 162 }), {
      now,
      previousState: null,
      threshold: 10,
    });

    expect(health.unhealthy).toBe(false);
    expect(health.restarts).toBe(162);
    expect(health.recentlyRestarted).toBe(false);
  });

  it('does not flag historical unstable restarts after the process has stabilized', () => {
    const health = evaluatePm2Health(pm2App({ unstable_restarts: 20 }), {
      now,
      previousState: null,
      threshold: 10,
    });

    expect(health.unhealthy).toBe(false);
    expect(health.unstableRestarts).toBe(20);
  });

  it('flags a high restart count when the process is still inside the stable window', () => {
    const health = evaluatePm2Health(
      pm2App({
        pm_uptime: Date.parse('2026-05-26T21:45:00.000Z'),
        restart_time: 12,
      }),
      {
        now,
        previousState: null,
        threshold: 10,
      }
    );

    expect(health.unhealthy).toBe(true);
    expect(health.recentlyRestarted).toBe(true);
  });

  it('flags restart bursts since the previous closed-loop sample', () => {
    const health = evaluatePm2Health(
      pm2App({
        pm_uptime: Date.parse('2026-05-26T21:55:00.000Z'),
        restart_time: 24,
      }),
      {
        now,
        previousState: {
          checkedAt: '2026-05-26T21:30:00.000Z',
          restartTime: 11,
        },
        threshold: 10,
      }
    );

    expect(health.unhealthy).toBe(true);
    expect(health.restartDelta).toBe(13);
    expect(health.deltaWindowMinutes).toBe(30);
  });

  it('always flags a process that is not online', () => {
    const health = evaluatePm2Health(pm2App({ status: 'errored' }), {
      now,
      previousState: null,
      threshold: 10,
    });

    expect(health.unhealthy).toBe(true);
    expect(health.status).toBe('errored');
  });
});
