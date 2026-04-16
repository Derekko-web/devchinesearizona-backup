from __future__ import annotations

from dataclasses import asdict, dataclass, field

from .utils import iso_now


@dataclass
class ScrapedBusinessCandidate:
    name_en: str
    categorySlug: str
    city: str
    region: str
    address: str | None = None
    serviceAreaText: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    heroImage: str | None = None
    gallery: list[str] = field(default_factory=list)
    hours: list[dict[str, str]] = field(default_factory=list)
    coordinates: dict[str, float] | None = None
    languages: list[str] = field(default_factory=list)
    shortDescription: str = ""
    description: str = ""
    services: list[str] = field(default_factory=list)
    searchAliases: list[str] = field(default_factory=list)
    sourceUrls: list[str] = field(default_factory=list)
    officialSiteUrl: str | None = None
    chineseSignal: list[dict[str, str]] = field(default_factory=list)
    completenessScore: int = 0
    duplicateKey: str = ""
    scrapedAt: str = field(default_factory=iso_now)
    name_zh: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict) -> "ScrapedBusinessCandidate":
        return cls(**payload)
