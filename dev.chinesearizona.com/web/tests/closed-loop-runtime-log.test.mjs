import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  hasRuntimeLogPattern,
  readRuntimeLogAppend,
} from '../../../ops/closed-loop/runtime-log.mjs';

const tempDirs = [];

function tempPath(name) {
  const dir = mkdtempSync(join(tmpdir(), 'closed-loop-runtime-log-'));
  tempDirs.push(dir);
  return join(dir, name);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    rmSync(dir, { force: true, recursive: true });
  }
});

describe('closed-loop runtime log tracking', () => {
  it('baselines existing PM2 error log content without reopening a stale issue', () => {
    const logPath = tempPath('error.log');
    const statePath = join(dirname(logPath), 'state.json');
    writeFileSync(
      logPath,
      [
        '<html><h1>Cloudflare Error 522</h1></html>',
        'Error: Failed to find Server Action "x".',
      ].join('\n')
    );

    const appended = readRuntimeLogAppend(logPath, statePath);

    expect(appended).toBe('');
    expect(hasRuntimeLogPattern(appended)).toBe(false);
  });

  it('flags matching PM2 error log content appended after the checkpoint', () => {
    const logPath = tempPath('error.log');
    const statePath = join(dirname(logPath), 'state.json');
    writeFileSync(logPath, 'ready\n');
    expect(readRuntimeLogAppend(logPath, statePath)).toBe('');

    appendFileSync(logPath, '<html><h1>Cloudflare Error 522</h1></html>\n');
    const appended = readRuntimeLogAppend(logPath, statePath);

    expect(appended).toContain('Cloudflare Error 522');
    expect(hasRuntimeLogPattern(appended)).toBe(true);
    expect(readRuntimeLogAppend(logPath, statePath)).toBe('');
  });

  it('scans a replaced log file when PM2 rotates or truncates it', () => {
    const logPath = tempPath('error.log');
    const statePath = join(dirname(logPath), 'state.json');
    writeFileSync(logPath, 'old log content\n');
    expect(readRuntimeLogAppend(logPath, statePath)).toBe('');

    writeFileSync(logPath, 'Unhandled exception after rotation\n');
    const appended = readRuntimeLogAppend(logPath, statePath);

    expect(appended).toContain('Unhandled exception');
    expect(hasRuntimeLogPattern(appended)).toBe(true);
  });
});
