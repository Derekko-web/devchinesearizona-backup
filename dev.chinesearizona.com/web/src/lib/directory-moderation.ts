import { createBusinessClaim, createModerationReport, getBusinessClaims, getModerationReports } from '@/lib/runtime-store';
import { getSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase';
import type { BusinessClaim, ModerationReport } from '@/lib/types';

type ClaimInput = {
  businessSlug?: string;
  businessName: string;
  claimantName: string;
  email: string;
  category?: string;
  city?: string;
  details?: string;
};

type ReportInput = {
  entitySlug: string;
  entityType?: ModerationReport['entityType'];
  reason: string;
};

export async function submitBusinessClaim(input: ClaimInput): Promise<BusinessClaim> {
  const serviceClient = getSupabaseServiceClient();
  if (serviceClient) {
    let businessId: string | undefined;
    if (input.businessSlug) {
      const { data } = await serviceClient
        .from('businesses')
        .select('id')
        .eq('slug', input.businessSlug)
        .maybeSingle();

      businessId = data?.id;
    }

    const { data, error } = await serviceClient
      .from('business_claims')
      .insert({
        business_id: businessId ?? null,
        business_slug: input.businessSlug ?? null,
        business_name: input.businessName,
        claimant_name: input.claimantName,
        email: input.email,
        category_slug: input.category ?? null,
        city: input.city ?? null,
        details: input.details ?? null,
      })
      .select(
        'id, business_id, business_slug, business_name, claimant_name, email, category_slug, city, details, status, created_at'
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
        status: data.status,
        createdAt: data.created_at,
      };
    }
  }

  return createBusinessClaim(input.businessName, input.claimantName, input.email, {
    businessSlug: input.businessSlug,
    category: input.category,
    city: input.city,
    details: input.details,
  });
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
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('business_claims')
      .select('id, business_id, business_slug, business_name, claimant_name, email, category_slug, city, details, status, created_at')
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
        status: claim.status,
        createdAt: claim.created_at,
      }));
    }
  }

  return getBusinessClaims().filter((claim) => claim.status === 'pending');
}

export async function getModerationReportsSnapshot(): Promise<ModerationReport[]> {
  const client = getSupabaseClient();
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
