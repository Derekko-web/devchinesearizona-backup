from __future__ import annotations

import copy
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

from .client import Crawl4AIHTTPClient
from .models import ScrapedBusinessCandidate
from .parsers import (
    parse_azaanhpi_directory,
    parse_heritage_collection,
    parse_heritage_detail,
    parse_official_site,
)
from .seeds import AZ_AANHPI_DIRECTORY_URL, HERITAGE_COLLECTION_URLS, OFFICIAL_SITE_SEEDS
from .taxonomy import (
    is_relevant_candidate,
    mark_candidate,
    passes_trust_gate,
    source_priority,
)
from .utils import normalize_phone, normalize_website_for_dedupe, unique_strings

SUSPICIOUS_ENRICHMENT_PATTERN = re.compile(
    r"\b(slot gacor|slot777|jackpot|casino|telegram|bonus new member|sportsbook|live casino)\b",
    re.IGNORECASE,
)


def default_output_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "scrape-staging"


def _discovered_path(output_dir: Path) -> Path:
    return output_dir / "discovered_candidates.jsonl"


def _enriched_path(output_dir: Path) -> Path:
    return output_dir / "enriched_candidates.jsonl"


def _final_jsonl_path(output_dir: Path) -> Path:
    return output_dir / "business_candidates.jsonl"


def _final_csv_path(output_dir: Path) -> Path:
    return output_dir / "business_candidates.csv"


def _write_jsonl(path: Path, records: list[ScrapedBusinessCandidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record.to_dict(), ensure_ascii=False) + "\n")


def _read_jsonl(path: Path) -> list[ScrapedBusinessCandidate]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        return [ScrapedBusinessCandidate.from_dict(json.loads(line)) for line in handle if line.strip()]


def _csv_row(record: ScrapedBusinessCandidate) -> dict[str, str]:
    payload = record.to_dict()
    payload["sourceUrls"] = " | ".join(record.sourceUrls)
    payload["searchAliases"] = " | ".join(record.searchAliases)
    payload["services"] = " | ".join(record.services)
    payload["languages"] = " | ".join(record.languages)
    payload["gallery"] = " | ".join(record.gallery)
    payload["hours"] = json.dumps(record.hours, ensure_ascii=False)
    payload["coordinates"] = json.dumps(record.coordinates, ensure_ascii=False)
    payload["chineseSignal"] = json.dumps(record.chineseSignal, ensure_ascii=False)
    return {key: "" if value is None else str(value) for key, value in payload.items()}


def _write_csv(path: Path, records: list[ScrapedBusinessCandidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rows = [_csv_row(record) for record in records]
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def _should_fetch_for_enrichment(url: str | None) -> bool:
    if not url:
        return False
    hostname = (normalize_website_for_dedupe(url) or "").split("/", 1)[0]
    blocked_hosts = {"instagram.com", "www.instagram.com", "facebook.com", "www.facebook.com", "qmenu.us"}
    return hostname not in blocked_hosts


def _should_apply_enrichment(base: ScrapedBusinessCandidate, incoming: ScrapedBusinessCandidate) -> bool:
    haystack = " ".join(
        filter(
            None,
            [
                incoming.shortDescription,
                incoming.description,
                incoming.name_zh or "",
                " ".join(incoming.services),
                " ".join(incoming.searchAliases[:8]),
            ],
        )
    )
    if SUSPICIOUS_ENRICHMENT_PATTERN.search(haystack):
        return False
    if base.city and incoming.city and base.city != incoming.city and base.address:
        return False
    return True


def _merge_scalar(current: str | None, incoming: str | None, prefer_incoming: bool = False) -> str | None:
    if incoming and (prefer_incoming or not current):
        return incoming
    return current


def merge_two_candidates(base: ScrapedBusinessCandidate, incoming: ScrapedBusinessCandidate) -> ScrapedBusinessCandidate:
    merged = copy.deepcopy(base)
    prefer_incoming = source_priority(incoming) >= source_priority(base)
    merged.name_en = _merge_scalar(merged.name_en, incoming.name_en, prefer_incoming) or merged.name_en
    merged.name_zh = _merge_scalar(merged.name_zh, incoming.name_zh, prefer_incoming)
    merged.categorySlug = _merge_scalar(merged.categorySlug, incoming.categorySlug, prefer_incoming) or merged.categorySlug
    merged.city = _merge_scalar(merged.city, incoming.city, prefer_incoming) or merged.city
    merged.region = _merge_scalar(merged.region, incoming.region, prefer_incoming) or merged.region
    merged.address = _merge_scalar(merged.address, incoming.address, prefer_incoming)
    merged.serviceAreaText = _merge_scalar(merged.serviceAreaText, incoming.serviceAreaText, prefer_incoming)
    merged.phone = _merge_scalar(merged.phone, incoming.phone, prefer_incoming)
    merged.email = _merge_scalar(merged.email, incoming.email, prefer_incoming)
    merged.website = _merge_scalar(merged.website, incoming.website, prefer_incoming)
    merged.heroImage = _merge_scalar(merged.heroImage, incoming.heroImage, prefer_incoming)
    merged.officialSiteUrl = _merge_scalar(merged.officialSiteUrl, incoming.officialSiteUrl, prefer_incoming)
    if incoming.shortDescription and (prefer_incoming or not merged.shortDescription or len(incoming.shortDescription) > len(merged.shortDescription)):
        merged.shortDescription = incoming.shortDescription
    if incoming.description and (prefer_incoming or not merged.description or len(incoming.description) > len(merged.description)):
        merged.description = incoming.description
    if incoming.coordinates and (prefer_incoming or not merged.coordinates):
        merged.coordinates = incoming.coordinates
    if incoming.hours and (prefer_incoming or not merged.hours):
        merged.hours = incoming.hours
    merged.languages = unique_strings(merged.languages + incoming.languages)
    merged.gallery = unique_strings(merged.gallery + incoming.gallery)
    merged.services = unique_strings(merged.services + incoming.services)
    merged.searchAliases = unique_strings(merged.searchAliases + incoming.searchAliases)
    merged.sourceUrls = unique_strings(merged.sourceUrls + incoming.sourceUrls)
    merged.chineseSignal = merged.chineseSignal + [signal for signal in incoming.chineseSignal if signal not in merged.chineseSignal]
    return mark_candidate(merged)


def merge_candidate_group(group: list[ScrapedBusinessCandidate]) -> ScrapedBusinessCandidate:
    ordered = sorted(group, key=lambda candidate: (source_priority(candidate), candidate.completenessScore), reverse=True)
    merged = ordered[0]
    for candidate in ordered[1:]:
        merged = merge_two_candidates(merged, candidate)
    return mark_candidate(merged)


def _group_by_key(records: list[ScrapedBusinessCandidate], key_builder) -> list[ScrapedBusinessCandidate]:
    grouped: dict[str, list[ScrapedBusinessCandidate]] = defaultdict(list)
    leftovers: list[ScrapedBusinessCandidate] = []
    for record in records:
        key = key_builder(record)
        if not key:
            leftovers.append(record)
            continue
        grouped[key].append(record)
    merged = [merge_candidate_group(group) for group in grouped.values()]
    return merged + leftovers


async def discover(output_dir: Path | None = None) -> list[ScrapedBusinessCandidate]:
    output_dir = output_dir or default_output_dir()
    client = Crawl4AIHTTPClient()
    seed_urls = [AZ_AANHPI_DIRECTORY_URL, *HERITAGE_COLLECTION_URLS, *[seed["url"] for seed in OFFICIAL_SITE_SEEDS]]
    seed_pages = await client.fetch_many(seed_urls)
    discovered: list[ScrapedBusinessCandidate] = []

    aanhpi_page = seed_pages.get(AZ_AANHPI_DIRECTORY_URL)
    if aanhpi_page:
        discovered.extend(parse_azaanhpi_directory(aanhpi_page.html, AZ_AANHPI_DIRECTORY_URL))

    heritage_targets: list[dict[str, str]] = []
    for collection_url in HERITAGE_COLLECTION_URLS:
        page = seed_pages.get(collection_url)
        if page:
            heritage_targets.extend(parse_heritage_collection(page.html, collection_url))
    heritage_detail_pages = await client.fetch_many([target["detail_url"] for target in heritage_targets])
    for target in heritage_targets:
        detail_page = heritage_detail_pages.get(target["detail_url"])
        if not detail_page:
            continue
        candidate = parse_heritage_detail(detail_page.html, target["detail_url"], source_collection_url=target["source_url"])
        if candidate:
            discovered.append(candidate)

    for seed in OFFICIAL_SITE_SEEDS:
        page = seed_pages.get(seed["url"])
        if not page:
            continue
        candidate = parse_official_site(page.html, page.url, seed=seed)
        if candidate:
            discovered.append(candidate)

    discovered = [mark_candidate(candidate) for candidate in discovered]
    _write_jsonl(_discovered_path(output_dir), discovered)
    return discovered


async def enrich(output_dir: Path | None = None) -> list[ScrapedBusinessCandidate]:
    output_dir = output_dir or default_output_dir()
    discovered = _read_jsonl(_discovered_path(output_dir))
    client = Crawl4AIHTTPClient()
    fetch_map: dict[str, list[int]] = defaultdict(list)
    for index, candidate in enumerate(discovered):
        enrichment_url = candidate.officialSiteUrl or candidate.website
        if _should_fetch_for_enrichment(enrichment_url):
            fetch_map[enrichment_url].append(index)
    fetched_pages = await client.fetch_many(list(fetch_map.keys()))
    enriched = copy.deepcopy(discovered)
    for enrichment_url, indexes in fetch_map.items():
        page = fetched_pages.get(enrichment_url)
        if not page:
            continue
        for index in indexes:
            seed = {
                "name_en": enriched[index].name_en,
                "categorySlug": enriched[index].categorySlug,
                "city": enriched[index].city,
                "serviceAreaText": enriched[index].serviceAreaText,
            }
            incoming = parse_official_site(page.html, page.url, seed=seed)
            if incoming and _should_apply_enrichment(enriched[index], incoming):
                enriched[index] = merge_two_candidates(enriched[index], incoming)
    enriched = [mark_candidate(candidate) for candidate in enriched]
    _write_jsonl(_enriched_path(output_dir), enriched)
    return enriched


def dedupe_score(output_dir: Path | None = None) -> list[ScrapedBusinessCandidate]:
    output_dir = output_dir or default_output_dir()
    enriched = _read_jsonl(_enriched_path(output_dir))
    relevant = [mark_candidate(candidate) for candidate in enriched if is_relevant_candidate(candidate)]
    by_website = _group_by_key(relevant, lambda candidate: normalize_website_for_dedupe(candidate.website or candidate.officialSiteUrl))
    by_phone = _group_by_key(by_website, lambda candidate: normalize_phone(candidate.phone))
    by_name_city = _group_by_key(by_phone, lambda candidate: f"{candidate.name_en.casefold()}::{candidate.city.casefold()}")
    final_records = [mark_candidate(candidate) for candidate in by_name_city if passes_trust_gate(candidate)]
    final_records.sort(key=lambda candidate: (-candidate.completenessScore, candidate.categorySlug, candidate.city, candidate.name_en))
    _write_jsonl(_final_jsonl_path(output_dir), final_records)
    _write_csv(_final_csv_path(output_dir), final_records)
    return final_records
