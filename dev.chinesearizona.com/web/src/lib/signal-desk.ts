import fs from 'node:fs';
import path from 'node:path';

import { monitoredSources, signalDeskQueue as staticSignalDeskQueue } from '@/data/platform-data';

import type { MonitoredSource, SignalDeskQueueItem } from '@/lib/types';

const GENERATED_SIGNAL_DESK_QUEUE_PATH = path.join(
  process.cwd(),
  'src',
  'data',
  'generated-signal-desk-queue.json'
);

let signalDeskQueueCache:
  | {
      path: string;
      mtimeMs: number;
      queue: SignalDeskQueueItem[];
    }
  | null = null;

function resolveSignalDeskQueuePath(): string {
  return process.env.GENERATED_SIGNAL_DESK_QUEUE_PATH || GENERATED_SIGNAL_DESK_QUEUE_PATH;
}

function readSignalDeskQueue(): SignalDeskQueueItem[] {
  const filePath = resolveSignalDeskQueuePath();
  try {
    const stats = fs.statSync(filePath);
    if (signalDeskQueueCache?.path === filePath && signalDeskQueueCache.mtimeMs === stats.mtimeMs) {
      return signalDeskQueueCache.queue;
    }

    const queue = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SignalDeskQueueItem[];
    signalDeskQueueCache = {
      path: filePath,
      mtimeMs: stats.mtimeMs,
      queue,
    };
    return queue;
  } catch {
    return signalDeskQueueCache?.queue || staticSignalDeskQueue;
  }
}

export function getMonitoredSources(): MonitoredSource[] {
  return monitoredSources;
}

export function getSignalDeskQueue(): SignalDeskQueueItem[] {
  return readSignalDeskQueue();
}

export function getSignalDeskSummary() {
  const queue = getSignalDeskQueue();
  const followUps = queue.filter((item) => item.directoryFollowUp);

  return {
    monitoredSourceCount: getMonitoredSources().length,
    totalSignals: queue.length,
    publishedCount: queue.filter((item) => item.reviewStatus === 'approved' || item.reviewStatus === 'published').length,
    queuedCount: queue.filter((item) => item.reviewStatus === 'queued').length,
    reviewReadyCount: queue.filter((item) => item.reviewStatus === 'review_ready').length,
    directoryFollowUpCount: followUps.length,
    openDirectoryFollowUpCount: followUps.filter(
      (item) => item.directoryFollowUp && item.directoryFollowUp.status !== 'done'
    ).length,
  };
}
