from __future__ import annotations

import copy
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib import robotparser
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from scripts.directory_scrape.utils import (
    format_phone_display,
    iso_now,
    normalize_phone,
    normalize_website_for_dedupe,
    normalize_whitespace,
    unique_strings,
)

from .config import resolve_web_path
from .extract import candidate_from_source_html, candidate_from_source_seed
from .models import CityDirectoryCandidate, CityDirectorySiteConfig


@dataclass
class FetchedPage:
    requested_url: str
    url: str
    html: str


Fetcher = Callable[[list[str]], dict[str, FetchedPage]]

PRESERVED_REVIEW_STATUSES = {"approved", "rejected"}
APPROVABLE_REVIEW_STATUS = "approved"
FETCH_USER_AGENT = "ChineseArizonaCityDirectoryImporter/1.0 (+https://chinesearizona.com/)"
MAX_HTML_BYTES = 2_000_000
ROBOTS_TIMEOUT_SECONDS = 5
FETCH_TIMEOUT_SECONDS = 8
ROBOTS_CACHE: dict[str, robotparser.RobotFileParser | bool] = {}


def staging_dir(site: CityDirectorySiteConfig) -> Path:
    return resolve_web_path(site.stagingDir)


def discovered_candidates_path(site: CityDirectorySiteConfig) -> Path:
    return staging_dir(site) / "discovered_candidates.jsonl"


def review_queue_path(site: CityDirectorySiteConfig) -> Path:
    return staging_dir(site) / "review_queue.jsonl"


def approved_export_path(site: CityDirectorySiteConfig) -> Path:
    return resolve_web_path(site.approvedListingsPath)


def _read_jsonl(path: Path) -> list[CityDirectoryCandidate]:
    if not path.exists():
        return []
    records: list[CityDirectoryCandidate] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                records.append(CityDirectoryCandidate.from_dict(json.loads(line)))
    return records


def _write_jsonl(path: Path, records: list[CityDirectoryCandidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record.to_dict(), ensure_ascii=False, sort_keys=True) + "\n")


def _read_json_array(path: Path) -> list[dict]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"Expected JSON array at {path}")
    return payload


def _slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "listing"


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


def _business_name(business: dict) -> str:
    name = business.get("name")
    if isinstance(name, dict):
        return normalize_whitespace(name.get("en"))
    if isinstance(name, str):
        return normalize_whitespace(name)
    return normalize_whitespace(business.get("name_en"))


def _business_dedupe_keys(business: dict) -> list[str]:
    keys: list[str] = []
    candidate_urls = [business.get("website"), business.get("menuUrl")]
    candidate_urls.extend(business.get("sourceUrls") or [])
    for url in candidate_urls:
        website_key = normalize_website_for_dedupe(url)
        if website_key:
            keys.append(f"website:{website_key}")
    phone_key = normalize_phone(business.get("phone"))
    if phone_key:
        keys.append(f"phone:{phone_key}")
    name = _business_name(business)
    city = normalize_whitespace(business.get("city"))
    if name and city:
        keys.append(f"name_city:{normalize_whitespace(f'{name} {city}').casefold()}")
    return unique_strings(keys)


def _state_from_address(address: str | None) -> str | None:
    if not address:
        return None
    match = re.search(r"\b([A-Z]{2}),?\s+\d{5}(?:-\d{4})?\b", address)
    if match:
        return match.group(1)
    match = re.search(r"(?:,\s*|\s)([A-Z]{2})(?:,\s*|$)", address)
    return match.group(1) if match else None


def _existing_listing_key_map(site: CityDirectorySiteConfig) -> dict[str, str]:
    existing_path = resolve_web_path(site.existingListingsPath)
    existing = _read_json_array(existing_path)
    key_map: dict[str, str] = {}
    for business in existing:
        slug = business.get("slug") or business.get("id") or _business_name(business)
        for key in _business_dedupe_keys(business):
            key_map[key] = slug
    return key_map


def _merge_candidate(base: CityDirectoryCandidate, incoming: CityDirectoryCandidate) -> CityDirectoryCandidate:
    merged = copy.deepcopy(base)
    prefer_incoming = incoming.confidenceScore > merged.confidenceScore
    for field in ["name", "categorySlug", "city", "region", "address", "serviceAreaText", "phone", "website", "email", "shortDescription", "description"]:
        incoming_value = getattr(incoming, field)
        current_value = getattr(merged, field)
        if incoming_value and (prefer_incoming or not current_value):
            setattr(merged, field, incoming_value)
    merged.sourceUrls = unique_strings(merged.sourceUrls + incoming.sourceUrls)
    merged.sourceIds = unique_strings(merged.sourceIds + incoming.sourceIds)
    merged.confidenceNotes = unique_strings(merged.confidenceNotes + incoming.confidenceNotes)
    merged.sourceNotes = unique_strings(merged.sourceNotes + incoming.sourceNotes)
    merged.dedupeKeys = unique_strings(merged.dedupeKeys + incoming.dedupeKeys)
    merged.languages = unique_strings(merged.languages + incoming.languages)
    merged.services = unique_strings(merged.services + incoming.services)
    merged.confidenceScore = max(merged.confidenceScore, incoming.confidenceScore)
    merged.confidenceLevel = incoming.confidenceLevel if prefer_incoming else merged.confidenceLevel
    merged.lastSeenAt = iso_now()
    if incoming.reviewStatus == "blocked_city_mismatch":
        merged.reviewStatus = "blocked_city_mismatch"
    if incoming.reviewStatus == "existing_duplicate" or incoming.matchedExistingSlug:
        merged.reviewStatus = "existing_duplicate"
        merged.matchedExistingSlug = incoming.matchedExistingSlug or merged.matchedExistingSlug
    return merged


def _dedupe_candidates(records: list[CityDirectoryCandidate]) -> list[CityDirectoryCandidate]:
    seen_by_key: dict[str, int] = {}
    merged: list[CityDirectoryCandidate] = []
    for record in records:
        match_index = next((seen_by_key[key] for key in record.dedupeKeys if key in seen_by_key), None)
        if match_index is None:
            match_index = len(merged)
            merged.append(record)
        else:
            merged[match_index] = _merge_candidate(merged[match_index], record)
        for key in merged[match_index].dedupeKeys:
            seen_by_key[key] = match_index
    return merged


def _apply_existing_listing_dedupe(site: CityDirectorySiteConfig, records: list[CityDirectoryCandidate]) -> list[CityDirectoryCandidate]:
    existing_keys = _existing_listing_key_map(site)
    output: list[CityDirectoryCandidate] = []
    for record in records:
        match = next((existing_keys[key] for key in record.dedupeKeys if key in existing_keys), None)
        if match:
            record = copy.deepcopy(record)
            record.reviewStatus = "existing_duplicate"
            record.matchedExistingSlug = match
            record.confidenceNotes = unique_strings(record.confidenceNotes + [f"matches existing listing '{match}'"])
        output.append(record)
    return output


def _candidate_matches_site(site: CityDirectorySiteConfig, candidate: CityDirectoryCandidate) -> bool:
    if candidate.siteKey != site.siteKey:
        return False
    if candidate.city not in site.allowedCities:
        return False
    if candidate.categorySlug not in site.allowedCategorySlugs:
        return False
    address_state = _state_from_address(candidate.address)
    if address_state and address_state != site.stateCode:
        return False
    return True


def _candidate_matches_existing_keys(candidate: CityDirectoryCandidate, existing_keys: set[str]) -> bool:
    return any(key in existing_keys for key in candidate.dedupeKeys)


def _previous_review_map(site: CityDirectorySiteConfig) -> dict[str, CityDirectoryCandidate]:
    previous = _read_jsonl(review_queue_path(site))
    by_key: dict[str, CityDirectoryCandidate] = {}
    for record in previous:
        by_key[record.candidateId] = record
        by_key[record.duplicateKey] = record
        for key in record.dedupeKeys:
            by_key[key] = record
    return by_key


def _preserve_review_decisions(
    site: CityDirectorySiteConfig,
    records: list[CityDirectoryCandidate],
) -> list[CityDirectoryCandidate]:
    previous = _previous_review_map(site)
    output: list[CityDirectoryCandidate] = []
    for record in records:
        prior = previous.get(record.candidateId) or previous.get(record.duplicateKey)
        if not prior:
            prior = next((previous[key] for key in record.dedupeKeys if key in previous), None)
        if prior:
            record = copy.deepcopy(record)
            record.firstSeenAt = prior.firstSeenAt
            record.reviewNotes = prior.reviewNotes
            if prior.reviewStatus in PRESERVED_REVIEW_STATUSES and record.reviewStatus not in {"existing_duplicate", "blocked_city_mismatch"}:
                record.reviewStatus = prior.reviewStatus
            record.sourceNotes = unique_strings(record.sourceNotes + prior.sourceNotes)
        output.append(record)
    return output


def _fetch_pages(urls: list[str]) -> dict[str, FetchedPage]:
    try:
        from scripts.directory_scrape.client import Crawl4AIHTTPClient
    except ModuleNotFoundError as error:
        if error.name != "crawl4ai":
            raise
        return _fetch_pages_with_stdlib(urls)

    async def run() -> dict[str, FetchedPage]:
        client = Crawl4AIHTTPClient()
        pages = await client.fetch_many(urls)
        return {
            requested_url: FetchedPage(
                requested_url=page.requested_url,
                url=page.url,
                html=page.html,
            )
            for requested_url, page in pages.items()
        }

    import asyncio

    return asyncio.run(run())


def _robots_url(url: str) -> str | None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return urljoin(f"{parsed.scheme}://{parsed.netloc}", "/robots.txt")


def _robots_allows(url: str, user_agent: str) -> bool:
    robots_url = _robots_url(url)
    if not robots_url:
        return False
    cached = ROBOTS_CACHE.get(robots_url)
    if isinstance(cached, bool):
        return cached
    if cached:
        return cached.can_fetch(user_agent, url)
    request = Request(robots_url, headers={"User-Agent": user_agent})
    parser = robotparser.RobotFileParser(robots_url)
    try:
        with urlopen(request, timeout=ROBOTS_TIMEOUT_SECONDS) as response:
            body = response.read(MAX_HTML_BYTES)
            robots_text = _decode_response_body(body, response.headers.get("content-type", ""))
    except HTTPError as error:
        if error.code in {404, 410}:
            ROBOTS_CACHE[robots_url] = True
            return True
        ROBOTS_CACHE[robots_url] = False
        return False
    except (URLError, OSError, TimeoutError, ValueError):
        ROBOTS_CACHE[robots_url] = False
        return False
    parser.parse(robots_text.splitlines())
    ROBOTS_CACHE[robots_url] = parser
    return parser.can_fetch(user_agent, url)


def _decode_response_body(body: bytes, content_type: str) -> str:
    charset_match = re.search(r"charset=([A-Za-z0-9._-]+)", content_type, re.IGNORECASE)
    charset = charset_match.group(1) if charset_match else "utf-8"
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def _fetch_pages_with_stdlib(urls: list[str]) -> dict[str, FetchedPage]:
    snapshots: dict[str, FetchedPage] = {}
    for requested_url in dict.fromkeys(urls):
        if not _robots_allows(requested_url, FETCH_USER_AGENT):
            continue
        request = Request(
            requested_url,
            headers={
                "User-Agent": FETCH_USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        try:
            with urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:
                content_type = response.headers.get("content-type", "")
                if "html" not in content_type.lower():
                    continue
                body = response.read(MAX_HTML_BYTES + 1)
                if len(body) > MAX_HTML_BYTES:
                    body = body[:MAX_HTML_BYTES]
                html = _decode_response_body(body, content_type)
                snapshots[requested_url] = FetchedPage(
                    requested_url=requested_url,
                    url=response.geturl(),
                    html=html,
                )
        except (HTTPError, URLError, OSError, TimeoutError, ValueError):
            continue
    return snapshots


def discover(site: CityDirectorySiteConfig, fetcher: Fetcher | None = None) -> list[CityDirectoryCandidate]:
    fetcher = fetcher or _fetch_pages
    source_urls = [source.url for source in site.sources]
    fetched_pages = fetcher(source_urls)
    records: list[CityDirectoryCandidate] = []

    for source in site.sources:
        page = fetched_pages.get(source.url)
        if page and page.html:
            records.append(candidate_from_source_html(page.html, page.url, source, site))
        else:
            records.append(candidate_from_source_seed(source, site, "source fetch unavailable; staged from configured seed only"))

    records = _dedupe_candidates(records)
    records = _apply_existing_listing_dedupe(site, records)
    records = _preserve_review_decisions(site, records)
    records.sort(key=lambda record: (record.reviewStatus, -record.confidenceScore, record.categorySlug, record.city, record.name))
    _write_jsonl(discovered_candidates_path(site), records)
    _write_jsonl(review_queue_path(site), records)
    return records


def _localized_text(english: str, chinese: str | None = None) -> dict[str, str | None]:
    return {"en": english, "zh": chinese}


def candidate_to_business(candidate: CityDirectoryCandidate, index: int, seen_slugs: set[str]) -> dict:
    slug = _unique_slug(_slugify(f"{candidate.name}-{candidate.city}"), seen_slugs)
    return {
        "id": f"{candidate.siteKey}-imported-{index + 1:04d}",
        "slug": slug,
        "name": _localized_text(candidate.name, candidate.nameZh),
        "categorySlug": candidate.categorySlug,
        "city": candidate.city,
        "region": candidate.region,
        "address": candidate.address,
        "serviceAreaText": candidate.serviceAreaText,
        "phone": format_phone_display(candidate.phone),
        "email": candidate.email,
        "website": candidate.website,
        "heroImage": None,
        "gallery": [],
        "shortDescription": _localized_text(candidate.shortDescription or f"{candidate.name} in {candidate.city}."),
        "description": _localized_text(candidate.description or candidate.shortDescription or f"{candidate.name} in {candidate.city}."),
        "services": [_localized_text(service) for service in candidate.services],
        "languages": candidate.languages or ["English"],
        "searchAliases": unique_strings([candidate.name, candidate.city, candidate.sourceCategory.replace("_", " ")]),
        "verified": True,
        "bilingual": any(language != "English" for language in candidate.languages),
        "newcomerFriendly": False,
        "sponsored": False,
        "featured": False,
        "rating": 0,
        "reviewCount": 0,
        "lastUpdated": candidate.lastSeenAt,
        "status": "live",
        "verificationState": "editor_verified",
        "hours": [],
        "sourceUrls": candidate.sourceUrls,
    }


def approved_candidates(site: CityDirectorySiteConfig, min_confidence: int = 70) -> list[CityDirectoryCandidate]:
    queue = _read_jsonl(review_queue_path(site))
    return [
        candidate
        for candidate in queue
        if candidate.reviewStatus == APPROVABLE_REVIEW_STATUS
        and candidate.confidenceScore >= min_confidence
        and not candidate.matchedExistingSlug
        and _candidate_matches_site(site, candidate)
    ]


def export_approved(
    site: CityDirectorySiteConfig,
    destination: Path | None = None,
    min_confidence: int = 70,
) -> list[dict]:
    destination = destination or approved_export_path(site)
    existing = _read_json_array(resolve_web_path(site.existingListingsPath))
    seen_slugs = {business.get("slug") for business in existing if business.get("slug")}
    existing_keys = {key for business in existing for key in _business_dedupe_keys(business)}
    exported = [
        candidate_to_business(candidate, index, seen_slugs)
        for index, candidate in enumerate(
            candidate
            for candidate in approved_candidates(site, min_confidence=min_confidence)
            if not _candidate_matches_existing_keys(candidate, existing_keys)
        )
    ]
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(exported, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return exported


def promote_approved_to_live(
    site: CityDirectorySiteConfig,
    min_confidence: int = 70,
    write_live: bool = False,
) -> list[dict]:
    if not write_live:
        raise ValueError("Refusing to update the live listing JSON without --write-live")
    live_path = resolve_web_path(site.existingListingsPath)
    existing = _read_json_array(live_path)
    seen_slugs = {business.get("slug") for business in existing if business.get("slug")}
    existing_keys = {key for business in existing for key in _business_dedupe_keys(business)}
    additions: list[dict] = []
    for candidate in approved_candidates(site, min_confidence=min_confidence):
        if _candidate_matches_existing_keys(candidate, existing_keys):
            continue
        addition = candidate_to_business(candidate, len(existing) + len(additions), seen_slugs)
        additions.append(addition)
        existing_keys.update(_business_dedupe_keys(addition))
    if additions:
        live_path.write_text(json.dumps(existing + additions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return additions
