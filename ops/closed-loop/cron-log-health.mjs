const CRON_ANOMALY_PATTERN = /ETIMEDOUT|Falling back to file-backed|lock_busy|Traceback|Error:|\bfailed\b/i;
const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/;

function parseTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function timestampFromJsonLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const payload = JSON.parse(trimmed);
    for (const key of ['timestamp', 'finishedAt', 'finished_at', 'startedAt', 'started_at']) {
      if (payload[key]) {
        const timestamp = parseTimestamp(payload[key]);
        if (timestamp !== null) {
          return timestamp;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function timestampFromCronLine(line) {
  const jsonTimestamp = timestampFromJsonLine(line);
  if (jsonTimestamp !== null) {
    return jsonTimestamp;
  }

  const match = String(line || '').match(ISO_TIMESTAMP_PATTERN);
  return match ? parseTimestamp(match[0]) : null;
}

export function recentCronAnomalyLines(log, options = {}) {
  const now = options.now ?? Date.now();
  const recentHours =
    Number.isFinite(Number(options.recentHours)) && Number(options.recentHours) > 0
      ? Number(options.recentHours)
      : 48;
  const recentWindowMs = recentHours * 60 * 60 * 1000;
  const lines = String(log || '').split(/\r?\n/);
  const anomalies = [];
  let sawTimestamp = false;
  let activeTimestamp = null;

  for (const line of lines) {
    const timestamp = timestampFromCronLine(line);
    if (timestamp !== null) {
      sawTimestamp = true;
      activeTimestamp = timestamp;
    }

    if (!CRON_ANOMALY_PATTERN.test(line)) {
      continue;
    }

    anomalies.push({
      line,
      timestamp: activeTimestamp,
    });
  }

  if (!sawTimestamp) {
    return anomalies;
  }

  return anomalies.filter((entry) => {
    if (entry.timestamp === null) {
      return false;
    }

    return now - entry.timestamp <= recentWindowMs;
  });
}
