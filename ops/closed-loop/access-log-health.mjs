const DEFAULT_WINDOW_MINUTES = 60;
const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};
// nginx combined log time, e.g. [25/Nov/2026:04:03:37 +0000]
const ACCESS_LOG_TIME_PATTERN =
  /\[(\d{2})\/([A-Z][a-z]{2})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})\]/;

export function timestampFromAccessLogLine(line) {
  const match = String(line || '').match(ACCESS_LOG_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const [, day, monthName, year, hour, minute, second, sign, offsetHours, offsetMinutes] = match;
  const month = MONTHS[monthName];
  if (month === undefined) {
    return null;
  }

  const utc = Date.UTC(
    Number(year),
    month,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
  const offsetMs = (Number(offsetHours) * 60 + Number(offsetMinutes)) * 60 * 1000;
  return sign === '+' ? utc - offsetMs : utc + offsetMs;
}

function isServerError(line) {
  return /^5\d\d$/.test(line.split(/\s+/)[8] || '');
}

// Returns the 5xx lines that happened within the window, so an old burst
// (for example one deploy restart) stops counting once it ages out.
export function recentServerErrorLines(lines, options = {}) {
  const now = options.now ?? Date.now();
  const windowMinutes =
    Number.isFinite(Number(options.windowMinutes)) && Number(options.windowMinutes) > 0
      ? Number(options.windowMinutes)
      : DEFAULT_WINDOW_MINUTES;
  const windowMs = windowMinutes * 60 * 1000;
  const serverErrors = lines.filter(isServerError);
  const sawTimestamp = lines.some((line) => timestampFromAccessLogLine(line) !== null);

  if (!sawTimestamp) {
    return serverErrors;
  }

  return serverErrors.filter((line) => {
    const timestamp = timestampFromAccessLogLine(line);
    return timestamp !== null && now - timestamp <= windowMs;
  });
}
