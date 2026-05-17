import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FromBuilder = {
  select: (value: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    };
  };
  insert?: (value: Record<string, unknown>) => {
    select: (value: string) => {
      maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    };
  };
  update?: (value: Record<string, unknown>) => {
    eq: (column: string, value: string) => Record<string, never>;
  };
};

describe('directory moderation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates approved owner-submitted listings as live businesses', async () => {
    let insertedBusiness: Record<string, unknown> | undefined;

    const client = {
      from(table: string): FromBuilder {
        if (table === 'business_claims') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'claim-1',
                        business_id: null,
                        profile_id: 'profile-1',
                        business_slug: null,
                        business_name: "Derek's ramen",
                        claimant_name: 'Derek',
                        email: 'koderek000@gmail.com',
                        category_slug: 'dining',
                        city: 'Phoenix',
                        details: null,
                        hero_image: 'https://example.com/storefront.jpg',
                        gallery: [
                          'https://example.com/interior.jpg',
                          'https://example.com/menu.jpg',
                        ],
                        status: 'pending',
                        created_at: '2026-04-19T23:40:35.560Z',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          };
        }

        if (table === 'profiles') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'profile-1',
                        role: 'member',
                        auth_user_id: 'auth-1',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          };
        }

        if (table === 'auth_profiles') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: 'not used' },
                    }),
                  };
                },
                ilike() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: 'not used' },
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          } as unknown as FromBuilder;
        }

        if (table === 'business_categories') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'category-1',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === 'businesses') {
          return {
            select(selection: string) {
              return {
                eq() {
                  return {
                    maybeSingle: async () => {
                      if (selection.includes('owner_profile_id')) {
                        return { data: null, error: { message: 'not found' } };
                      }

                      return { data: null, error: { message: 'slug available' } };
                    },
                  };
                },
              };
            },
            insert(value: Record<string, unknown>) {
              insertedBusiness = value;
              return {
                select() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'business-1',
                        slug: 'derek-s-ramen',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: vi.fn(() => null),
      getSupabaseServiceClient: vi.fn(() => client),
    }));

    vi.doMock('@/lib/directory', () => ({
      getDirectoryCategories: vi.fn(async () => [
        {
          slug: 'dining',
          name: { en: 'Dining', zh: '餐飲' },
          description: { en: 'Dining', zh: '餐飲' },
          icon: 'utensils',
        },
      ]),
    }));

    vi.doMock('@/lib/runtime-store', () => ({
      createBusinessClaim: vi.fn(),
      createModerationReport: vi.fn(),
      getBusinessClaims: vi.fn(() => []),
      getModerationReports: vi.fn(() => []),
    }));

    const { approveBusinessClaim } = await import('@/lib/directory-moderation');
    await expect(
      approveBusinessClaim({
        actorRole: 'admin',
        categorySlug: 'dining',
        city: 'Phoenix',
        claimId: 'claim-1',
      })
    ).resolves.toEqual({
      businessSlug: 'derek-s-ramen',
      createdListing: true,
    });

    expect(insertedBusiness?.status).toBe('live');
    expect(insertedBusiness?.verification_state).toBe('claimed');
    expect(insertedBusiness?.owner_profile_id).toBe('profile-1');
    expect(insertedBusiness?.hero_image).toBe('https://example.com/storefront.jpg');
    expect(insertedBusiness?.gallery).toEqual([
      'https://example.com/interior.jpg',
      'https://example.com/menu.jpg',
    ]);
    expect(insertedBusiness?.description_en).toBe("Derek's ramen is a restaurant in Phoenix, Arizona.");
    expect(insertedBusiness?.short_description_en).toBe("Derek's ramen is a restaurant in Phoenix, Arizona.");
  });

  it('publishes approved claims for existing pending-review businesses', async () => {
    let updatedBusiness: Record<string, unknown> | undefined;

    const client = {
      from(table: string): FromBuilder {
        if (table === 'business_claims') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'claim-2',
                        business_id: 'business-1',
                        profile_id: 'profile-1',
                        business_slug: 'derek-s-tea',
                        business_name: "Derek's tea",
                        claimant_name: 'Derek',
                        email: 'koderek000@gmail.com',
                        category_slug: 'dining',
                        city: 'Tempe',
                        details: null,
                        hero_image: null,
                        gallery: [
                          'https://example.com/tea-room.jpg',
                          'https://example.com/signage.jpg',
                        ],
                        status: 'pending',
                        created_at: '2026-04-19T23:50:35.560Z',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          };
        }

        if (table === 'profiles') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'profile-1',
                        role: 'member',
                        auth_user_id: 'auth-1',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          };
        }

        if (table === 'auth_profiles') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: 'not used' },
                    }),
                  };
                },
                ilike() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: 'not used' },
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return {};
                },
              };
            },
          } as unknown as FromBuilder;
        }

        if (table === 'businesses') {
          return {
            select(selection: string) {
              return {
                eq() {
                  return {
                    maybeSingle: async () => {
                      if (selection.includes('owner_profile_id')) {
                        return {
                          data: {
                            id: 'business-1',
                            slug: 'derek-s-tea',
                            owner_profile_id: null,
                            status: 'pending_review',
                            verification_state: 'unverified',
                          },
                          error: null,
                        };
                      }

                      return { data: null, error: { message: 'not used' } };
                    },
                  };
                },
              };
            },
            update(value: Record<string, unknown>) {
              updatedBusiness = value;
              return {
                eq() {
                  return {};
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    };

    vi.doMock('@/lib/supabase', () => ({
      getSupabaseClient: vi.fn(() => null),
      getSupabaseServiceClient: vi.fn(() => client),
    }));

    vi.doMock('@/lib/directory', () => ({
      getDirectoryCategories: vi.fn(async () => [
        {
          slug: 'dining',
          name: { en: 'Dining', zh: '餐飲' },
          description: { en: 'Dining', zh: '餐飲' },
          icon: 'utensils',
        },
      ]),
    }));

    vi.doMock('@/lib/runtime-store', () => ({
      createBusinessClaim: vi.fn(),
      createModerationReport: vi.fn(),
      getBusinessClaims: vi.fn(() => []),
      getModerationReports: vi.fn(() => []),
    }));

    const { approveBusinessClaim } = await import('@/lib/directory-moderation');
    await expect(
      approveBusinessClaim({
        actorRole: 'admin',
        categorySlug: 'dining',
        city: 'Tempe',
        claimId: 'claim-2',
      })
    ).resolves.toEqual({
      businessSlug: 'derek-s-tea',
      createdListing: false,
    });

    expect(updatedBusiness?.status).toBe('live');
    expect(updatedBusiness?.verification_state).toBe('claimed');
    expect(updatedBusiness?.owner_profile_id).toBe('profile-1');
    expect(updatedBusiness?.hero_image).toBe('https://example.com/tea-room.jpg');
    expect(updatedBusiness?.gallery).toEqual(['https://example.com/signage.jpg']);
  });
});
