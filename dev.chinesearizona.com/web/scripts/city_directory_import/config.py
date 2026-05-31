from __future__ import annotations

import json
from pathlib import Path

from .models import CityDirectorySiteConfig, CityDirectorySource

WEB_ROOT = Path(__file__).resolve().parents[2]


def default_manifest_path() -> Path:
    return WEB_ROOT / "data" / "city-directory-source-manifest.json"


def resolve_web_path(path: str | Path) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        return candidate
    return WEB_ROOT / candidate


def load_site_config(site_key: str, manifest_path: Path | None = None) -> CityDirectorySiteConfig:
    manifest_path = manifest_path or default_manifest_path()
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    sites = payload.get("sites", {})
    if site_key not in sites:
        available = ", ".join(sorted(sites)) or "none"
        raise ValueError(
            f"No city directory import config for site '{site_key}'. "
            f"Configured sites: {available}. The importer will not fall back to Arizona or another city."
        )

    source_categories = payload.get("sourceCategories", {})
    site_payload = sites[site_key]
    allowed_cities = site_payload.get("allowedCities", [])
    allowed_categories = site_payload.get("allowedCategorySlugs", [])
    sources: list[CityDirectorySource] = []

    for source_payload in site_payload.get("sources", []):
        source_category = source_payload["sourceCategory"]
        category_slug = source_payload.get("categorySlug") or source_categories.get(source_category, {}).get("categorySlug")
        if not category_slug:
            raise ValueError(f"Source {source_payload.get('id', '<unknown>')} is missing a categorySlug")
        if category_slug not in allowed_categories:
            raise ValueError(
                f"Source {source_payload.get('id', '<unknown>')} uses categorySlug '{category_slug}', "
                f"which is not enabled for site '{site_key}'"
            )
        source_city = source_payload["city"]
        if source_city not in allowed_cities:
            raise ValueError(
                f"Source {source_payload.get('id', '<unknown>')} city '{source_city}' is not in "
                f"the allowed city list for site '{site_key}'"
            )
        sources.append(
            CityDirectorySource(
                id=source_payload["id"],
                url=source_payload["url"],
                sourceCategory=source_category,
                categorySlug=category_slug,
                city=source_city,
                nameHint=source_payload.get("nameHint"),
                serviceAreaText=source_payload.get("serviceAreaText"),
                sourceType=source_payload.get("sourceType", "official_site"),
                notes=source_payload.get("notes", ""),
            )
        )

    return CityDirectorySiteConfig(
        siteKey=site_key,
        domain=site_payload["domain"],
        stateCode=site_payload["stateCode"],
        regionName=site_payload["regionName"],
        allowedCities=allowed_cities,
        allowedCategorySlugs=allowed_categories,
        existingListingsPath=site_payload["existingListingsPath"],
        stagingDir=site_payload["stagingDir"],
        approvedListingsPath=site_payload["approvedListingsPath"],
        sources=sources,
    )
