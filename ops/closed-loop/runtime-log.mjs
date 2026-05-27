import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const defaultRuntimeLogPatterns = [
  /Failed to find Server Action/i,
  /Cloudflare[\s\S]*Error/i,
  /Unhandled|uncaught|fatal/i,
];

const END_SAMPLE_BYTES = 128;

function readJsonFile(path) {
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonFile(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function getLogState(path) {
  if (!existsSync(path)) {
    return {
      exists: false,
      mtimeMs: 0,
      size: 0,
    };
  }

  const stats = statSync(path);
  return {
    exists: true,
    ino: stats.ino,
    mtimeMs: stats.mtimeMs,
    size: stats.size,
  };
}

function isValidPreviousState(value, logPath) {
  return (
    value &&
    value.path === logPath &&
    typeof value.size === 'number' &&
    Number.isFinite(value.size) &&
    value.size >= 0
  );
}

function endSample(buffer, size = buffer.length) {
  if (size <= 0) {
    return '';
  }

  const start = Math.max(0, size - END_SAMPLE_BYTES);
  return buffer.subarray(start, size).toString('base64');
}

function previousLogContentStillPresent(previousState, currentState, currentBuffer) {
  if (
    !isValidPreviousState(previousState, currentState.path) ||
    previousState.size > currentState.size
  ) {
    return false;
  }

  if (typeof previousState.endSample === 'string') {
    return endSample(currentBuffer, previousState.size) === previousState.endSample;
  }

  return previousState.ino === currentState.ino;
}

export function readRuntimeLogAppend(logPath, statePath, options = {}) {
  const maxBytes = options.maxBytes ?? 6000;
  const now = options.now ?? Date.now();
  const previousState = readJsonFile(statePath);
  const currentState = getLogState(logPath);
  const currentBuffer = currentState.exists ? readFileSync(logPath) : Buffer.alloc(0);
  const nextState = {
    checkedAt: new Date(now).toISOString(),
    endSample: endSample(currentBuffer),
    ino: currentState.ino ?? null,
    mtimeMs: currentState.mtimeMs,
    path: logPath,
    size: currentState.size,
  };

  writeJsonFile(statePath, nextState);

  if (!currentState.exists || !isValidPreviousState(previousState, logPath)) {
    return '';
  }

  const start = previousLogContentStillPresent(previousState, nextState, currentBuffer)
    ? previousState.size
    : 0;
  if (start === currentState.size) {
    return '';
  }

  const appended = currentBuffer.subarray(start);
  const capped =
    appended.length > maxBytes ? appended.subarray(appended.length - maxBytes) : appended;

  return capped.toString('utf8');
}

export function hasRuntimeLogPattern(log, patterns = defaultRuntimeLogPatterns) {
  return patterns.some((pattern) => pattern.test(log));
}
