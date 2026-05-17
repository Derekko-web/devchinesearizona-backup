import { parseBusinessPhotoSet } from '@/lib/business-media';
import { getDirectoryCategories } from '@/lib/directory';
import { createBusinessClaim, createModerationReport, getBusinessClaims, getModerationReports } from '@/lib/runtime-store';
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase';
import type { BusinessClaim, BusinessCategory, ModerationReport, ProfileRole } from '@/lib/types';

type ClaimInput = {
  businessSlug?: string;
  businessName: string;
  claimantName: string;
  email: string;
  profileId?: string;
  category?: string;
  city?: string;
  details?: string;
  heroImage?: string;
  gallery?: string[];
};

type ReportInput = {
  entitySlug: string;
  entityType?: ModerationReport['entityType'];
  reason: string;
};

type BusinessClaimRow = {
  id: string;
  business_id?: string | null;
  profile_id?: string | null;
  business_slug?: string | null;
  business_name: string;
  claimant_name: string;
  email: string;
  category_slug?: string | null;
  city?: string | null;
  details?: string | null;
  hero_image?: string | null;
  gallery?: string[] | null;
  status: BusinessClaim['status'];
  created_at: string;
};

type ClaimantProfileRow = {
  id: string;
  role: ProfileRole;
  auth_user_id?: string | null;
};

type BusinessOwnerRow = {
  id: string;
  slug: string;
  owner_profile_id?: string | null;
  status?: string | null;
  verification_state?: 'unverified' | 'claimed' | 'editor_verified' | null;
  hero_image?: string | null;
  gallery?: string[] | null;
};

type ClaimApprovalInput = {
  claimId: string;
  actorRole: ProfileRole;
  categorySlug?: string;
  city?: string;
  heroImage?: string;
  gallery?: string[];
};

type ClaimApprovalResult = {
  businessSlug: string;
  createdListing: boolean;
};

function textOrUndefined(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalize(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function nextProfileRole(role: ProfileRole): ProfileRole {
  return role === 'member' ? 'business_owner' : role;
}

function resolveApprovedBusinessStatus(status?: string | null): 'live' | 'stale' | 'suppressed' {
  if (status === 'stale' || status === 'suppressed') {
    return status;
  }

  return 'live';
}

function buildClaimedListingDescription(
  businessName: string,
  city: string,
  categorySlug: string
): string {
  const normalizedCategory = categorySlug.trim().toLowerCase();
  const categoryLabel = {
    dining: 'restaurant',
    education: 'education service',
    medical: 'medical practice',
    'legal-finance': 'legal or financial service',
    moving: 'relocation service',
    'local-services': 'local service',
    'home-services': 'home service',
    shopping: 'shop',
    travel: 'travel service',
  }[normalizedCategory] ?? 'local business';

  return `${businessName} is a ${categoryLabel} in ${city}, Arizona.`;
}

function resolveCategorySlug(
  categories: BusinessCategory[],
  requestedSlug?: string,
  claimCategory?: string
): string | undefined {
  const normalizedRequested = normalize(requestedSlug);
  if (normalizedRequested) {
    const directMatch = categories.find((category) => normalize(category.slug) === normalizedRequested);
    if (directMatch) {
      return directMatch.slug;
    }
  }

  const normalizedClaimCategory = normalize(claimCategory);
  if (!normalizedClaimCategory) {
    return undefined;
  }

  const matchedCategory = categories.find((category) => {
    const aliases = [
      category.slug,
      slugify(category.slug),
      category.name.en,
      category.name.zh,
      slugify(category.name.en),
      slugify(category.name.zh ?? ''),
    ];

    return aliases.some((alias) => normalize(alias) === normalizedClaimCategory);
  });

  return matchedCategory?.slug;
}

async function buildUniqueBusinessSlug(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  preferredSlug?: string,
  businessName?: string
) {
  const baseSlug = slugify(preferredSlug || businessName || '') || 'business';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 2}`;
    const { data, error } = await client
      .from('businesses')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error || !data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function buildUniqueProfileSlug(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  baseName: string
) {
  const baseSlug = slugify(baseName) || 'member';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 2}`;
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error || !data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

async function ensureClaimantProfile(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  claim: BusinessClaimRow
): Promise<ClaimantProfileRow | null> {
  if (claim.profile_id) {
    const { data, error } = await client
      .from('profiles')
      .select('id, role, auth_user_id')
      .eq('id', claim.profile_id)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  }

  const normalizedEmail = normalize(claim.email);
  if (!normalizedEmail) {
    return null;
  }

  const { data: authProfile, error: authError } = await client
    .from('auth_profiles')
    .select('id, role, full_name')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (authError || !authProfile) {
    return null;
  }

  const { data: existingProfile, error: profileError } = await client
    .from('profiles')
    .select('id, role, auth_user_id')
    .eq('auth_user_id', authProfile.id)
    .maybeSingle();

  if (!profileError && existingProfile) {
    return existingProfile;
  }

  const displayName =
    textOrUndefined(claim.claimant_name) ??
    textOrUndefined(authProfile.full_name) ??
    normalizedEmail.split('@')[0] ??
    'Member';
  const slug = await buildUniqueProfileSlug(client, displayName);
  const { data: createdProfile, error: createError } = await client
    .from('profiles')
    .insert({
      auth_user_id: authProfile.id,
      slug,
      name: displayName,
      name_zh_tw: displayName,
      role: nextProfileRole(authProfile.role as ProfileRole),
      city: textOrUndefined(claim.city) ?? 'Phoenix',
      languages: ['English'],
      bio_en: 'Business owner account.',
      bio_zh_tw: '商家主理人帳號。',
    })
    .select('id, role, auth_user_id')
    .maybeSingle();

  if (createError || !createdProfile) {
    return null;
  }

  return createdProfile;
}

async function getClaimBusiness(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  claim: BusinessClaimRow
): Promise<BusinessOwnerRow | null> {
  if (claim.business_id) {
    const { data, error } = await client
      .from('businesses')
      .select('id, slug, owner_profile_id, status, verification_state, hero_image, gallery')
      .eq('id', claim.business_id)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  }

  const businessSlug = textOrUndefined(claim.business_slug);
  if (!businessSlug) {
    return null;
  }

  const { data, error } = await client
    .from('businesses')
    .select('id, slug, owner_profile_id, status, verification_state, hero_image, gallery')
    .eq('slug', businessSlug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

async function resolveCategoryId(
  client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>,
  categorySlug: string
): Promise<string> {
  const { data, error } = await client
    .from('business_categories')
    .select('id')
    .eq('slug', categorySlug)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error('Unable to find the selected directory category.');
  }

  return data.id;
}

export async function submitBusinessClaim(input: ClaimInput): Promise<BusinessClaim> {
  const businessSlug = textOrUndefined(input.businessSlug);
  const businessName = input.businessName.trim();
  const claimantName = input.claimantName.trim();
  const email = input.email.trim().toLowerCase();
  const category = textOrUndefined(input.category);
  const city = textOrUndefined(input.city);
  const details = textOrUndefined(input.details);
  const heroImage = textOrUndefined(input.heroImage);
  const gallery = input.gallery ?? [];
  const serviceClient = getSupabaseServiceClient();
  if (serviceClient) {
    let businessId: string | undefined;
    if (businessSlug) {
      const { data } = await serviceClient
        .from('businesses')
        .select('id')
        .eq('slug', businessSlug)
        .maybeSingle();

      businessId = data?.id;
    }

    const { data, error } = await serviceClient
      .from('business_claims')
      .insert({
        business_id: businessId ?? null,
        profile_id: input.profileId ?? null,
        business_slug: businessSlug ?? null,
        business_name: businessName,
        claimant_name: claimantName,
        email,
        category_slug: category ?? null,
        city: city ?? null,
        details: details ?? null,
        hero_image: heroImage ?? null,
        gallery,
      })
      .select(
        'id, business_id, business_slug, business_name, claimant_name, email, category_slug, city, details, hero_image, gallery, status, created_at'
      )
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        businessId: data.business_id ?? undefined,
        businessSlug: data.business_slug ?? undefined,
        businessName: data.business_name,
        claimantName: data.claimant_name,
        email: data.email,
        category: data.category_slug ?? undefined,
        city: data.city ?? undefined,
        details: data.details ?? undefined,
        heroImage: data.hero_image ?? undefined,
        gallery: data.gallery ?? [],
        status: data.status,
        createdAt: data.created_at,
      };
    }
  }

  return createBusinessClaim(businessName, claimantName, email, {
    businessSlug,
    category,
    city,
    details,
    heroImage,
    gallery,
  });
}

export async function approveBusinessClaim(input: ClaimApprovalInput): Promise<ClaimApprovalResult> {
  const client = getSupabaseServiceClient();
  if (!client) {
    throw new Error('Business claim approval requires Supabase configuration.');
  }

  if (!['moderator', 'admin'].includes(input.actorRole)) {
    throw new Error('Only moderators and admins can approve business claims.');
  }

  const { data: claim, error } = await client
    .from('business_claims')
    .select(
      'id, business_id, profile_id, business_slug, business_name, claimant_name, email, category_slug, city, details, hero_image, gallery, status, created_at'
    )
    .eq('id', input.claimId)
    .maybeSingle();

  if (error || !claim) {
    throw new Error('Unable to find that business claim.');
  }

  if (claim.status !== 'pending') {
    throw new Error('This business claim has already been reviewed.');
  }

  const claimantProfile = await ensureClaimantProfile(client, claim as BusinessClaimRow);
  if (!claimantProfile) {
    throw new Error('Unable to find or create a profile for the claimant email.');
  }

  const existingBusiness = await getClaimBusiness(client, claim as BusinessClaimRow);
  const categories = await getDirectoryCategories();
  const resolvedCategorySlug = resolveCategorySlug(
    categories,
    textOrUndefined(input.categorySlug),
    claim.category_slug
  );
  const resolvedCity = textOrUndefined(input.city) ?? textOrUndefined(claim.city);
  const pendingHeroImage = textOrUndefined(input.heroImage) ?? textOrUndefined(claim.hero_image);
  const pendingGallery = input.gallery ?? claim.gallery ?? [];
  const hasPendingPhotos = Boolean(pendingHeroImage) || pendingGallery.length > 0;
  const resolvedPhotos = parseBusinessPhotoSet(
    {
      heroImage: pendingHeroImage ?? existingBusiness?.hero_image,
      gallery: pendingGallery,
    },
    'en'
  );
  const now = new Date().toISOString();

  let businessId = existingBusiness?.id ?? textOrUndefined(claim.business_id);
  let businessSlug = existingBusiness?.slug ?? textOrUndefined(claim.business_slug);
  let createdListing = false;

  if (existingBusiness) {
    if (
      existingBusiness.owner_profile_id &&
      existingBusiness.owner_profile_id !== claimantProfile.id
    ) {
      throw new Error('This listing is already assigned to another owner profile.');
    }

    const nextVerificationState =
      existingBusiness.verification_state === 'editor_verified'
        ? 'editor_verified'
        : 'claimed';

    const { error: updateBusinessError } = await client
      .from('businesses')
      .update({
        owner_profile_id: claimantProfile.id,
        verified: true,
        status: resolveApprovedBusinessStatus(existingBusiness.status),
        verification_state: nextVerificationState,
        hero_image: hasPendingPhotos
          ? (resolvedPhotos.heroImage ?? existingBusiness.hero_image ?? null)
          : (existingBusiness.hero_image ?? null),
        gallery: hasPendingPhotos ? resolvedPhotos.gallery : (existingBusiness.gallery ?? []),
        last_updated: now,
      })
      .eq('id', existingBusiness.id);

    if (updateBusinessError) {
      throw new Error('Unable to connect the existing listing to the claimant profile.');
    }
  } else {
    if (!resolvedCategorySlug) {
      throw new Error('Choose a directory category before approving this new listing.');
    }

    if (!resolvedCity) {
      throw new Error('Add a city before approving this new listing.');
    }

    const categoryId = await resolveCategoryId(client, resolvedCategorySlug);
    const nextSlug = await buildUniqueBusinessSlug(
      client,
      textOrUndefined(claim.business_slug),
      claim.business_name
    );
    const description =
      textOrUndefined(claim.details) ??
      buildClaimedListingDescription(claim.business_name, resolvedCity, resolvedCategorySlug);
    const shortDescription =
      description.length > 220 ? `${description.slice(0, 217)}...` : description;
    const { data: createdBusiness, error: createBusinessError } = await client
      .from('businesses')
      .insert({
        slug: nextSlug,
        category_id: categoryId,
        owner_profile_id: claimantProfile.id,
        name_en: claim.business_name,
        short_description_en: shortDescription,
        description_en: description,
        city: resolvedCity,
        region: resolvedCity,
        email: textOrUndefined(claim.email) ?? null,
        hero_image: resolvedPhotos.heroImage ?? null,
        gallery: resolvedPhotos.gallery,
        verified: true,
        status: 'live',
        verification_state: 'claimed',
        last_updated: now,
      })
      .select('id, slug')
      .maybeSingle();

    if (createBusinessError || !createdBusiness) {
      throw new Error('Unable to create a directory listing for this claim.');
    }

    businessId = createdBusiness.id;
    businessSlug = createdBusiness.slug;
    createdListing = true;
  }

  const upgradedRole = nextProfileRole(claimantProfile.role);
  if (upgradedRole !== claimantProfile.role) {
    await client
      .from('profiles')
      .update({ role: upgradedRole })
      .eq('id', claimantProfile.id);

    if (claimantProfile.auth_user_id) {
      await client
        .from('auth_profiles')
        .update({ role: upgradedRole })
        .eq('id', claimantProfile.auth_user_id);
    }
  }

  const { error: updateClaimError } = await client
    .from('business_claims')
    .update({
      status: 'approved',
      profile_id: claimantProfile.id,
      business_id: businessId ?? null,
      business_slug: businessSlug ?? null,
      category_slug: resolvedCategorySlug ?? textOrUndefined(claim.category_slug) ?? null,
      city: resolvedCity ?? null,
      hero_image: resolvedPhotos.heroImage ?? null,
      gallery: resolvedPhotos.gallery,
    })
    .eq('id', claim.id);

  if (updateClaimError) {
    throw new Error('Unable to mark the business claim as approved.');
  }

  if (!businessSlug) {
    throw new Error('The claim was approved, but no listing slug was resolved.');
  }

  return {
    businessSlug,
    createdListing,
  };
}

export async function submitModerationReport(input: ReportInput): Promise<ModerationReport> {
  const serviceClient = getSupabaseServiceClient();
  if (serviceClient) {
    const { data, error } = await serviceClient
      .from('reports')
      .insert({
        entity_type: input.entityType ?? 'community_post',
        entity_slug: input.entitySlug,
        reason: input.reason,
      })
      .select('id, entity_type, entity_slug, reason, created_at')
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        entityType: data.entity_type,
        entitySlug: data.entity_slug,
        reason: data.reason,
        createdAt: data.created_at,
      };
    }
  }

  return createModerationReport(input.entitySlug, input.reason, input.entityType ?? 'community_post');
}

export async function getPendingBusinessClaimsSnapshot(): Promise<BusinessClaim[]> {
  const client = getSupabaseServiceClient() ?? getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('business_claims')
      .select('id, business_id, business_slug, business_name, claimant_name, email, category_slug, city, details, hero_image, gallery, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((claim) => ({
        id: claim.id,
        businessId: claim.business_id ?? undefined,
        businessSlug: claim.business_slug ?? undefined,
        businessName: claim.business_name,
        claimantName: claim.claimant_name,
        email: claim.email,
        category: claim.category_slug ?? undefined,
        city: claim.city ?? undefined,
        details: claim.details ?? undefined,
        heroImage: claim.hero_image ?? undefined,
        gallery: claim.gallery ?? [],
        status: claim.status,
        createdAt: claim.created_at,
      }));
    }
  }

  return getBusinessClaims().filter((claim) => claim.status === 'pending');
}

export async function getModerationReportsSnapshot(): Promise<ModerationReport[]> {
  const client = getSupabaseServiceClient() ?? getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('reports')
      .select('id, entity_type, entity_slug, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      return data.map((report) => ({
        id: report.id,
        entityType: report.entity_type,
        entitySlug: report.entity_slug,
        reason: report.reason,
        createdAt: report.created_at,
      }));
    }
  }

  return getModerationReports();
}
