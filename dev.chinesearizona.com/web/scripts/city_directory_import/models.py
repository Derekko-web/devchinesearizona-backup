from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

from scripts.directory_scrape.utils import iso_now


SourceCategory = Literal[
    "restaurants",
    "grocery_markets",
    "real_estate",
    "legal_accounting_insurance",
    "healthcare",
    "beauty_wellness",
    "education_language_schools",
    "chinese_churches_religious_groups",
    "cultural_community_organizations",
    "ping_pong_table_tennis",
    "events_venues",
    "service_providers",
]

ReviewStatus = Literal[
    "needs_review",
    "needs_review_low_confidence",
    "approved",
    "rejected",
    "existing_duplicate",
    "blocked_city_mismatch",
]


@dataclass
class CityDirectorySource:
    id: str
    url: str
    sourceCategory: SourceCategory
    categorySlug: str
    city: str
    nameHint: str | None = None
    serviceAreaText: str | None = None
    sourceType: str = "official_site"
    notes: str = ""


@dataclass
class CityDirectorySiteConfig:
    siteKey: str
    domain: str
    stateCode: str
    regionName: str
    allowedCities: list[str]
    allowedCategorySlugs: list[str]
    existingListingsPath: str
    stagingDir: str
    approvedListingsPath: str
    sources: list[CityDirectorySource] = field(default_factory=list)


@dataclass
class CityDirectoryCandidate:
    candidateId: str
    siteKey: str
    name: str
    sourceCategory: str
    categorySlug: str
    city: str
    region: str
    sourceUrls: list[str]
    sourceIds: list[str]
    confidenceScore: int
    confidenceLevel: str
    confidenceNotes: list[str]
    sourceNotes: list[str]
    duplicateKey: str
    dedupeKeys: list[str]
    reviewStatus: ReviewStatus
    address: str | None = None
    serviceAreaText: str | None = None
    phone: str | None = None
    website: str | None = None
    email: str | None = None
    nameZh: str | None = None
    languages: list[str] = field(default_factory=list)
    shortDescription: str = ""
    description: str = ""
    services: list[str] = field(default_factory=list)
    matchedExistingSlug: str | None = None
    reviewNotes: str = ""
    firstSeenAt: str = field(default_factory=iso_now)
    lastSeenAt: str = field(default_factory=iso_now)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict) -> "CityDirectoryCandidate":
        return cls(**payload)
