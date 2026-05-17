import type { ProfileRole } from '@/lib/types';
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
