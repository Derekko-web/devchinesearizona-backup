from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from .models import ScrapedBusinessCandidate
from .pipeline import _final_jsonl_path, _read_jsonl, default_output_dir

VALID_LANGUAGES = {"English", "Mandarin", "Traditional Chinese", "Taiwanese"}


def default_site_fixture_path() -> Path:
    return Path(__file__).resolve().parents[2] / "src" / "data" / "generated-scraped-businesses.json"


def _slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "listing"


def _unique_slug(base: str, seen: set[str]) -> str:
    if base not in seen:
        seen.add(base)
        return base
    suffix = 2
    while f"{base}-{suffix}" in seen:
        suffix += 1
    slug = f"{base}-{suffix}"
    seen.add(slug)
    return slug


def _localized_text(english: str, chinese: str | None = None) -> dict[str, str | None]:
    return {"en": english, "zh": chinese}


def _service_rows(candidate: ScrapedBusinessCandidate) -> list[dict[str, str | None]]:
    return [_localized_text(service) for service in candidate.services]


def candidate_to_business(
    candidate: ScrapedBusinessCandidate,
    index: int,
    seen_slugs: set[str],
) -> dict:
    slug = _unique_slug(_slugify(f"{candidate.name_en}-{candidate.city}"), seen_slugs)
    languages = [language for language in candidate.languages if language in VALID_LANGUAGES]
    bilingual = bool(candidate.name_zh or candidate.chineseSignal or any(language != "English" for language in languages))
    hero_image = candidate.heroImage or (candidate.gallery[0] if candidate.gallery else None)
    gallery = [image for image in candidate.gallery if image != hero_image]

    return {
        "id": f"scraped_{index + 1:04d}",
        "slug": slug,
        "name": _localized_text(candidate.name_en, candidate.name_zh),
        "categorySlug": candidate.categorySlug,
        "city": candidate.city,
        "region": candidate.region,
        "address": candidate.address,
        "serviceAreaText": candidate.serviceAreaText,
        "phone": candidate.phone,
        "email": candidate.email,
        "website": candidate.website or candidate.officialSiteUrl,
        "heroImage": hero_image,
        "gallery": gallery,
        "shortDescription": _localized_text(candidate.shortDescription),
        "description": _localized_text(candidate.description),
        "services": _service_rows(candidate),
        "languages": languages,
        "searchAliases": candidate.searchAliases,
        "verified": True,
        "bilingual": bilingual,
        "newcomerFriendly": False,
        "sponsored": False,
        "featured": False,
        "rating": 0,
        "reviewCount": 0,
        "lastUpdated": candidate.scrapedAt,
        "status": "live",
        "verificationState": "editor_verified",
        "hours": candidate.hours,
        "coordinates": candidate.coordinates,
    }


def export_site_fixtures(
    output_dir: Path | None = None,
    destination: Path | None = None,
) -> list[dict]:
    output_dir = output_dir or default_output_dir()
    destination = destination or default_site_fixture_path()
    candidates = _read_jsonl(_final_jsonl_path(output_dir))
    seen_slugs: set[str] = set()
    exported = [candidate_to_business(candidate, index, seen_slugs) for index, candidate in enumerate(candidates)]
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(exported, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return exported
