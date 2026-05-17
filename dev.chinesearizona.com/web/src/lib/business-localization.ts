import { resolveLocalizedTextList } from '@/lib/article-localization';
import {
  formatBusinessServiceHighlightLabel,
  getBusinessDescriptionServiceHighlights,
} from '@/lib/business-display';
import type { Business, Locale } from '@/lib/types';

export type LocalizedBusinessCardText = {
  shortDescription: string;
  locationLabel: string;
  serviceHighlights: string[];
};

export type LocalizedBusinessDetailText = {
  shortDescription: string;
  description: string;
  locationLabel: string;
  services: string[];
  serviceHighlights: string[];
};

type LocalizedBusinessSharedText = {
  locationLabel: string;
  services: string[];
  serviceHighlights: string[];
};

function pushUnique(accumulator: string[], value: string | undefined) {
  if (!value) {
    return;
  }

  if (!accumulator.some((item) => item.toLowerCase() === value.toLowerCase())) {
    accumulator.push(value);
  }
}

function buildLocationTranslationSource(business: Business): string {
  return business.serviceAreaText?.trim() || `${business.city}, Arizona`;
}

async function resolveLocalizedBusinessSharedTextList(
  businesses: Business[],
  locale: Locale
): Promise<LocalizedBusinessSharedText[]> {
  if (businesses.length === 0) {
    return [];
  }

  const locationSources = businesses
    .filter((business) => !business.address?.trim())
    .map((business) => ({ en: buildLocationTranslationSource(business) }));
  const localizedLocations =
    locationSources.length > 0 ? await resolveLocalizedTextList(locationSources, locale) : [];
  const localizedServices =
    businesses.flatMap((business) => business.services).length > 0
      ? await resolveLocalizedTextList(
          businesses.flatMap((business) => business.services),
          locale
        )
      : [];

  let locationIndex = 0;
  let serviceIndex = 0;

  return businesses.map((business) => {
    const locationLabel = business.address?.trim()
      ? business.address.trim()
      : (() => {
          const localizedLocation =
            localizedLocations[locationIndex++] ?? buildLocationTranslationSource(business);

          if (!business.serviceAreaText?.trim() && locale === 'en') {
            return `${business.city}, AZ`;
          }

          return localizedLocation;
        })();
    const services = business.services
      .map((service) => {
        const localizedService =
          localizedServices[serviceIndex++] ??
          (locale === 'zh' ? service.zh?.trim() || service.en : service.en);
        return localizedService.trim();
      })
      .filter(Boolean);
    const serviceHighlights: string[] = [];

    business.services.forEach((service, index) => {
      pushUnique(
        serviceHighlights,
        formatBusinessServiceHighlightLabel(business, service.en, services[index] ?? service.en)
      );
    });

    return {
      locationLabel,
      services,
      serviceHighlights: getBusinessDescriptionServiceHighlights(
        business,
        locale,
        3,
        serviceHighlights.slice(0, 3)
      ),
    };
  });
}

export async function resolveLocalizedBusinessCardTextList(
  businesses: Business[],
  locale: Locale
): Promise<Array<{ business: Business; localizedText: LocalizedBusinessCardText }>> {
  if (businesses.length === 0) {
    return [];
  }

  const sharedText = await resolveLocalizedBusinessSharedTextList(businesses, locale);
  const localizedDescriptions = await resolveLocalizedTextList(
    businesses.map((business) => business.shortDescription),
    locale
  );

  return businesses.map((business, index) => ({
    business,
    localizedText: {
      shortDescription: localizedDescriptions[index] ?? business.shortDescription.en,
      locationLabel:
        sharedText[index]?.locationLabel ??
        business.address?.trim() ??
        business.serviceAreaText?.trim() ??
        `${business.city}, AZ`,
      serviceHighlights: sharedText[index]?.serviceHighlights ?? [],
    },
  }));
}

export async function resolveLocalizedBusinessDetailText(
  business: Business,
  locale: Locale
): Promise<LocalizedBusinessDetailText> {
  const [sharedText] = await resolveLocalizedBusinessSharedTextList([business], locale);
  const [shortDescription, description] = await resolveLocalizedTextList(
    [business.shortDescription, business.description],
    locale
  );

  return {
    shortDescription: shortDescription ?? business.shortDescription.en,
    description: description ?? business.description.en,
    locationLabel:
      sharedText?.locationLabel ??
      business.address?.trim() ??
      business.serviceAreaText?.trim() ??
      `${business.city}, AZ`,
    services: sharedText?.services ?? [],
    serviceHighlights: sharedText?.serviceHighlights ?? [],
  };
}
