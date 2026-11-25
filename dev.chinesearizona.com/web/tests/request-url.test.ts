import { describe, expect, it } from 'vitest';

import { getClientAddress } from '@/lib/request-url';

function requestWithForwardedFor(value?: string) {
  const headers = new Headers();
  if (value !== undefined) {
    headers.set('x-forwarded-for', value);
  }
  return { headers } as Parameters<typeof getClientAddress>[0];
}

describe('getClientAddress', () => {
  it('uses the visitor address in front of our own proxies', () => {
    // Production chain: Traefik sets the visitor, nginx appends Traefik's loopback peer.
    expect(getClientAddress(requestWithForwardedFor('203.0.113.7, 127.0.0.1'))).toBe('203.0.113.7');
  });

  it('gives different visitors different addresses behind the same proxy', () => {
    expect(getClientAddress(requestWithForwardedFor('203.0.113.7, 127.0.0.1'))).not.toBe(
      getClientAddress(requestWithForwardedFor('198.51.100.4, 127.0.0.1'))
    );
  });

  it('ignores addresses a client prepends', () => {
    expect(getClientAddress(requestWithForwardedFor('1.1.1.1, 10.0.0.5, 203.0.113.7, 127.0.0.1'))).toBe(
      '203.0.113.7'
    );
  });

  it('skips private, link-local and IPv6 internal proxy addresses', () => {
    expect(getClientAddress(requestWithForwardedFor('203.0.113.7, 172.18.0.1, 192.168.1.2'))).toBe(
      '203.0.113.7'
    );
    expect(getClientAddress(requestWithForwardedFor('2001:db8::1, ::1'))).toBe('2001:db8::1');
    expect(getClientAddress(requestWithForwardedFor('203.0.113.7, ::ffff:127.0.0.1'))).toBe('203.0.113.7');
    expect(getClientAddress(requestWithForwardedFor('203.0.113.7, fd12:3456::1, fe80::1'))).toBe(
      '203.0.113.7'
    );
  });

  it('does not treat public addresses that look similar to private ranges as internal', () => {
    expect(getClientAddress(requestWithForwardedFor('172.32.0.1, 127.0.0.1'))).toBe('172.32.0.1');
    expect(getClientAddress(requestWithForwardedFor('11.0.0.1, 127.0.0.1'))).toBe('11.0.0.1');
  });

  it('falls back sensibly in local development', () => {
    expect(getClientAddress(requestWithForwardedFor('127.0.0.1'))).toBe('127.0.0.1');
    expect(getClientAddress(requestWithForwardedFor())).toBe('local-request');
  });
});
