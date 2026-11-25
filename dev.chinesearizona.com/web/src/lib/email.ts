// Transactional email through Resend's HTTP API. No SDK: one fetch call keeps
// the dependency list short. Nothing is sent unless both RESEND_API_KEY and
// EMAIL_FROM are set, so dev and CI never email anyone by accident.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 8000;

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

// Where leads for unclaimed listings go.
export function getAdminNotificationEmail(): string | null {
  const value = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  return value ? value : null;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error('email_not_configured');
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`email_rejected_${response.status}`);
  }

  await response.body?.cancel();
}
