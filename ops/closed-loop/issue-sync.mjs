// Every closed-loop issue carries a hidden marker for its finding key. GitHub
// search splits the marker into words, so a search for one key can also return
// another key's issue (for example `smoke` and `prod-smoke`). Only an issue
// whose body holds the exact marker counts as the open issue for a key.
export function issueMarker(key) {
  return `closed-loop:dev:${key}`;
}

function markerComment(key) {
  return `<!-- ${issueMarker(key)} -->`;
}

export function findIssueWithMarker(items, key) {
  const marker = markerComment(key);
  return (
    (items ?? []).find((item) => typeof item?.body === 'string' && item.body.includes(marker)) ??
    null
  );
}

async function findOpenIssue({ key, repository, request }) {
  const query = new URLSearchParams({
    per_page: '100',
    q: `repo:${repository} is:issue is:open ${issueMarker(key)}`,
  });
  const result = await request(`/search/issues?${query.toString()}`);
  return findIssueWithMarker(result?.items, key);
}

// Opens, updates, or closes the issue for one finding key. Returns what it did:
// 'created', 'updated', 'closed', or 'none'.
export async function syncFindingIssue({ finding, key, now = Date.now(), repository, request, source }) {
  const openIssue = await findOpenIssue({ key, repository, request });

  if (!finding) {
    if (!openIssue) {
      return 'none';
    }

    await request(`/repos/${repository}/issues/${openIssue.number}`, {
      body: JSON.stringify({
        state: 'closed',
        state_reason: 'completed',
      }),
      method: 'PATCH',
    });
    return 'closed';
  }

  const body = [
    markerComment(key),
    finding.body,
    '',
    '---',
    `Collected at: ${new Date(now).toISOString()}`,
    `Source: ${finding.source || source}`,
  ].join('\n');
  const payload = JSON.stringify({
    body,
    labels: finding.labels,
    title: finding.title,
  });

  if (openIssue) {
    await request(`/repos/${repository}/issues/${openIssue.number}`, {
      body: payload,
      method: 'PATCH',
    });
    return 'updated';
  }

  await request(`/repos/${repository}/issues`, {
    body: payload,
    method: 'POST',
  });
  return 'created';
}
