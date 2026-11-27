import 'server-only';

import { getAdminNotificationEmail, isEmailConfigured, sendEmail } from '@/lib/email';
import { defaultSiteProfile } from '@/lib/site-config';
import type { BusinessClaim } from '@/lib/types';

// Tells the admin about a new claim or new-listing request (#464), so it
// doesn't wait until someone happens to open /admin. Sends nothing while
// email is off; the claim is already saved either way.

export type ClaimNotificationResult = 'sent' | 'email_not_configured' | 'no_recipient' | 'failed';

export function buildClaimNotificationEmail(
  claim: Pick<BusinessClaim, 'businessName' | 'businessSlug' | 'claimantName' | 'email' | 'category' | 'city' | 'details'>
): { subject: string; text: string } {
  const siteUrl = defaultSiteProfile.url.replace(/\/+$/, '');
  const isClaim = Boolean(claim.businessSlug);
  const lines = [
    isClaim
      ? `${claim.claimantName} asked to claim ${claim.businessName} on ChineseArizona.`
      : `${claim.claimantName} asked to add a new business, ${claim.businessName}, to ChineseArizona.`,
    isClaim ? '有人申請認領這個商家。' : '有人申請新增商家。',
    `Review it in the admin page / 請到管理頁審核: ${siteUrl}/admin`,
    '',
    `Business 商家: ${claim.businessName}`,
    ...(isClaim ? [`Listing 商家頁面: ${siteUrl}/business/${claim.businessSlug}`] : []),
    `Name 姓名: ${claim.claimantName}`,
    `Email: ${claim.email}`,
    ...(claim.category ? [`Category 分類: ${claim.category}`] : []),
    ...(claim.city ? [`City 城市: ${claim.city}`] : []),
    ...(claim.details ? ['', 'Notes 備註:', claim.details] : []),
  ];

  return {
    subject: `${isClaim ? 'New claim' : 'New listing request'}: ${claim.businessName} / ${isClaim ? '新認領' : '新增商家'}`,
    text: lines.join('\n'),
  };
}

export async function notifyAdminOfBusinessClaim(
  claim: Pick<BusinessClaim, 'businessName' | 'businessSlug' | 'claimantName' | 'email' | 'category' | 'city' | 'details'>
): Promise<ClaimNotificationResult> {
  if (!isEmailConfigured()) {
    return 'email_not_configured';
  }

  const to = getAdminNotificationEmail();
  if (!to) {
    return 'no_recipient';
  }

  try {
    const email = buildClaimNotificationEmail(claim);
    await sendEmail({ to, subject: email.subject, text: email.text, replyTo: claim.email });
    return 'sent';
  } catch (error) {
    console.error('[claims] Unable to email the admin about a new claim:', error);
    return 'failed';
  }
}
