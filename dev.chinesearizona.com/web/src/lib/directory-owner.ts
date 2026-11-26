import { parseBilingualDetails, type BilingualDetailsInput } from '@/lib/business-bilingual';
import type { Locale, ProfileRole } from '@/lib/types';
import { getSupabaseServiceClient } from '@/lib/supabase';

type OwnedBusinessRow = {
  id: string;
  slug: string;
  owner_profile_id?: string | null;
};

export async function updateBusinessPhotosForProfile(input: {
  businessSlug: string;
  profileId: string;
  role: ProfileRole;
  heroImage?: string;
  gallery: string[];
}) {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Business editing requires Supabase configuration.');
  }

  const { data, error } = await client
    .from('businesses')
    .select('id, slug, owner_profile_id')
    .eq('slug', input.businessSlug)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Business not found.');
  }

  const business = data as OwnedBusinessRow;
  const canManageAnyBusiness = input.role === 'moderator' || input.role === 'admin';
  if (!canManageAnyBusiness && business.owner_profile_id !== input.profileId) {
    throw new Error('You cannot edit this business.');
  }

  const { error: updateError } = await client
    .from('businesses')
    .update({
      hero_image: input.heroImage ?? null,
      gallery: input.gallery,
      last_updated: new Date().toISOString(),
    })
    .eq('id', business.id);

  if (updateError) {
    throw new Error('Unable to update business photos.');
  }

  return {
    businessSlug: business.slug,
  };
}

export async function deleteBusinessForProfile(input: {
  businessSlug: string;
  profileId: string;
  role: ProfileRole;
}) {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Business editing requires Supabase configuration.');
  }

  const { data, error } = await client
    .from('businesses')
    .select('id, slug, owner_profile_id')
    .eq('slug', input.businessSlug)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Business not found.');
  }

  const business = data as OwnedBusinessRow;
  const canManageAnyBusiness = input.role === 'moderator' || input.role === 'admin';
  if (!canManageAnyBusiness && business.owner_profile_id !== input.profileId) {
    throw new Error('You cannot delete this business.');
  }

  const { error: deleteError } = await client.from('businesses').delete().eq('id', business.id);
  if (deleteError) {
    throw new Error('Unable to delete business.');
  }

  return {
    businessSlug: business.slug,
  };
}

// Saves the bilingual details for a listing (issue #411). Owners edit their
// own listings; moderators and admins can edit any listing.
export async function updateBusinessBilingualDetailsForProfile(input: {
  businessSlug: string;
  profileId: string;
  role: ProfileRole;
  details: BilingualDetailsInput;
  locale: Locale;
}) {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Business editing requires Supabase configuration.');
  }

  const { data, error } = await client
    .from('businesses')
    .select('id, slug, owner_profile_id, languages')
    .eq('slug', input.businessSlug)
    .maybeSingle();

  if (error || !data) {
    throw new Error(input.locale === 'zh' ? '找不到這個商家。' : 'Business not found.');
  }

  const business = data as OwnedBusinessRow & { languages?: string[] | null };
  const canManageAnyBusiness = input.role === 'moderator' || input.role === 'admin';
  if (!canManageAnyBusiness && business.owner_profile_id !== input.profileId) {
    throw new Error(input.locale === 'zh' ? '你無法編輯這個商家。' : 'You cannot edit this business.');
  }

  const details = parseBilingualDetails(input.details, input.locale, business.languages ?? []);
  const { error: updateError } = await client
    .from('businesses')
    .update({
      languages: details.languages,
      wechat_id: details.wechatId ?? null,
      accepts_wechat_pay: details.acceptsWeChatPay,
      accepts_alipay: details.acceptsAlipay,
      chinese_menu_or_forms: details.chineseMenuOrForms,
      last_updated: new Date().toISOString(),
    })
    .eq('id', business.id);

  if (updateError) {
    throw new Error(
      input.locale === 'zh' ? '目前無法儲存雙語資訊。' : 'Unable to save bilingual details right now.'
    );
  }

  return { businessSlug: business.slug, details };
}
