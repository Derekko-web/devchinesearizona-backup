const DEFAULT_STABLE_WINDOW_MS = 30 * 60 * 1000;

function numericValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function checkedAtMs(previousState) {
  if (!previousState?.checkedAt) {
    return null;
  }

  const value = Date.parse(previousState.checkedAt);
  return Number.isFinite(value) ? value : null;
}

export function pm2ProcessState(app, now = Date.now()) {
  return {
    checkedAt: new Date(now).toISOString(),
    restartTime: numericValue(app?.pm2_env?.restart_time),
  };
}

export function evaluatePm2Health(app, options = {}) {
  const now = options.now ?? Date.now();
  const threshold = options.threshold ?? 10;
  const stableWindowMs = options.stableWindowMs ?? DEFAULT_STABLE_WINDOW_MS;
  const previousState = options.previousState ?? null;

  const env = app?.pm2_env ?? {};
  const status = env.status ?? 'unknown';
  const restarts = numericValue(env.restart_time);
  const unstableRestarts = numericValue(env.unstable_restarts);
  const previousRestarts =
    previousState?.restartTime === undefined ? null : numericValue(previousState.restartTime);
  const restartDelta =
    previousRestarts === null ? 0 : Math.max(0, restarts - previousRestarts);
  const previousCheckedAtMs = checkedAtMs(previousState);
  const deltaWindowMinutes =
    previousCheckedAtMs === null ? null : Math.round((now - previousCheckedAtMs) / 60_000);
  const pmUptime = numericValue(env.pm_uptime);
  const uptimeMs = pmUptime > 0 ? Math.max(0, now - pmUptime) : 0;
  const recentlyRestarted = uptimeMs < stableWindowMs;
  const initialRestartBurst =
    previousState === null && restarts > threshold && recentlyRestarted;
  const trackedRestartBurst =
    previousState !== null && restartDelta > threshold && recentlyRestarted;
  const unstableRestartBurst = unstableRestarts > threshold && recentlyRestarted;
  const unhealthy =
    status !== 'online' || initialRestartBurst || trackedRestartBurst || unstableRestartBurst;

  return {
    deltaWindowMinutes,
    recentlyRestarted,
    restartDelta,
    restarts,
    stableWindowMinutes: Math.round(stableWindowMs / 60_000),
    status,
    unhealthy,
    unstableRestarts,
    uptimeIso: pmUptime > 0 ? new Date(pmUptime).toISOString() : 'unknown',
  };
}
