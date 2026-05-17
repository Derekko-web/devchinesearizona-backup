'use client';

import type { Session } from '@supabase/supabase-js';

export async function persistServerSession(session: Session) {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      expiresAt: session.expires_at,
    }),
  });
}

export async function clearServerSession() {
  await fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  });
}
