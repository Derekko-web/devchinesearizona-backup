import { monitoredSources, signalDeskQueue } from '@/data/platform-data';

import type { MonitoredSource, SignalDeskQueueItem } from '@/lib/types';

export function getMonitoredSources(): MonitoredSource[] {
  return monitoredSources;
}

export function getSignalDeskQueue(): SignalDeskQueueItem[] {
  return signalDeskQueue;
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
