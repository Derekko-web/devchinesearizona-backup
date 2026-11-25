import { describe, expect, it } from 'vitest';

import {
  findIssueWithMarker,
  issueMarker,
  syncFindingIssue,
} from '../../../ops/closed-loop/issue-sync.mjs';

const repository = 'Derekko-web/devchinesearizona-backup';
const now = Date.parse('2026-11-25T08:00:00.000Z');

function openIssue(number, key, title = `Issue ${number}`) {
  return {
    body: [`<!-- ${issueMarker(key)} -->`, 'details'].join('\n'),
    number,
    state: 'open',
    title,
  };
}

// Fake GitHub API: answers the issue search with `searchItems` and records
// every write so tests can assert what the collector would change.
function fakeGithub(searchItems = []) {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({
      body: options.body ? JSON.parse(options.body) : undefined,
      method: options.method ?? 'GET',
      path,
    });
    if (path.startsWith('/search/issues')) {
      return { items: searchItems, total_count: searchItems.length };
    }
    return {};
  };
  const writes = () => calls.filter((call) => call.method !== 'GET');
  return { calls, request, writes };
}

const prodSmokeFinding = {
  body: 'The required production smoke routes did not all return healthy responses.',
  key: 'prod-smoke',
  labels: ['loop/prod', 'agent-ready', 'runtime'],
  source: 'https://chinesearizona.com',
  title: 'Production smoke check is failing (chinesearizona.com)',
};

const devSmokeFinding = {
  body: 'The required dev smoke routes did not all return healthy responses.',
  key: 'smoke',
  labels: ['loop/dev', 'agent-ready', 'runtime'],
  title: 'Dev smoke check is failing',
};

describe('closed-loop issue marker lookup', () => {
  it('only matches the issue that carries the exact marker', () => {
    const devIssue = openIssue(10, 'smoke');
    const prodIssue = openIssue(11, 'prod-smoke');

    expect(findIssueWithMarker([prodIssue, devIssue], 'smoke')).toBe(devIssue);
    expect(findIssueWithMarker([devIssue, prodIssue], 'prod-smoke')).toBe(prodIssue);
    expect(findIssueWithMarker([prodIssue], 'smoke')).toBeNull();
    expect(findIssueWithMarker(undefined, 'smoke')).toBeNull();
  });
});

describe('closed-loop issue sync', () => {
  it('opens a separate production issue with its own title, label, and source', async () => {
    const github = fakeGithub([openIssue(10, 'smoke', 'Dev smoke check is failing')]);

    const action = await syncFindingIssue({
      finding: prodSmokeFinding,
      key: 'prod-smoke',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    expect(action).toBe('created');
    expect(github.writes()).toHaveLength(1);
    const [write] = github.writes();
    expect(write.method).toBe('POST');
    expect(write.path).toBe(`/repos/${repository}/issues`);
    expect(write.body.title).toBe('Production smoke check is failing (chinesearizona.com)');
    expect(write.body.labels).toContain('loop/prod');
    expect(write.body.body).toContain('<!-- closed-loop:dev:prod-smoke -->');
    expect(write.body.body).toContain('Source: https://chinesearizona.com');
    expect(write.body.body).toContain('Collected at: 2026-11-25T08:00:00.000Z');
  });

  it('stays quiet when production is healthy and no production issue is open', async () => {
    const github = fakeGithub([openIssue(10, 'smoke', 'Dev smoke check is failing')]);

    const action = await syncFindingIssue({
      finding: undefined,
      key: 'prod-smoke',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    expect(action).toBe('none');
    expect(github.writes()).toEqual([]);
  });

  it('does not close the open production issue when dev recovers', async () => {
    const github = fakeGithub([openIssue(11, 'prod-smoke')]);

    const action = await syncFindingIssue({
      finding: undefined,
      key: 'smoke',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    expect(action).toBe('none');
    expect(github.writes()).toEqual([]);
  });

  it('does not overwrite the production issue with a dev finding', async () => {
    const github = fakeGithub([openIssue(11, 'prod-smoke')]);

    const action = await syncFindingIssue({
      finding: devSmokeFinding,
      key: 'smoke',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    expect(action).toBe('created');
    const [write] = github.writes();
    expect(write.method).toBe('POST');
    expect(write.body.body).toContain('<!-- closed-loop:dev:smoke -->');
    expect(write.body.body).toContain('Source: https://dev.chinesearizona.com');
  });

  it('updates the matching open issue instead of opening a duplicate', async () => {
    const github = fakeGithub([openIssue(10, 'smoke'), openIssue(11, 'prod-smoke')]);

    const action = await syncFindingIssue({
      finding: prodSmokeFinding,
      key: 'prod-smoke',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    expect(action).toBe('updated');
    const [write] = github.writes();
    expect(write.method).toBe('PATCH');
    expect(write.path).toBe(`/repos/${repository}/issues/11`);
  });

  it('closes the production issue once production is healthy again', async () => {
    const github = fakeGithub([openIssue(10, 'smoke'), openIssue(11, 'prod-smoke')]);

    const action = await syncFindingIssue({
      finding: undefined,
      key: 'prod-smoke',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    expect(action).toBe('closed');
    expect(github.writes()).toEqual([
      {
        body: { state: 'closed', state_reason: 'completed' },
        method: 'PATCH',
        path: `/repos/${repository}/issues/11`,
      },
    ]);
  });

  it('searches open issues for the key marker', async () => {
    const github = fakeGithub([]);

    await syncFindingIssue({
      finding: undefined,
      key: 'prod-nginx-5xx',
      now,
      repository,
      request: github.request,
      source: 'https://dev.chinesearizona.com',
    });

    const search = new URL(`https://api.github.com${github.calls[0].path}`);
    expect(search.pathname).toBe('/search/issues');
    expect(search.searchParams.get('q')).toBe(
      `repo:${repository} is:issue is:open closed-loop:dev:prod-nginx-5xx`
    );
  });
});
