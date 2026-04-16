from __future__ import annotations

import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Any, Callable
from urllib.parse import parse_qs, unquote, urlparse

import requests
from bs4 import BeautifulSoup

from .image_utils import (
    ImageQualityAssessment,
    extract_ranked_image_candidate_details,
    inspect_image_reference,
)
from .utils import hostname_for, normalize_url, normalize_whitespace

ROOT = Path(__file__).resolve().parents[2]
USER_AGENT = "ChineseArizonaDirectoryImageEnricher/1.0"
MANUAL_OVERRIDE_PATH = ROOT / "src" / "data" / "business-image-overrides.ts"
IMAGE_PAGE_HINTS: tuple[tuple[str, int], ...] = (
    ("gallery", 40),
    ("photo", 36),
    ("photos", 36),
    ("interior", 32),
    ("exterior", 32),
    ("storefront", 30),
    ("dishes", 28),
    ("food", 24),
    ("menu", 18),
    ("about", 18),
    ("story", 16),
    ("location", 14),
    ("locations", 12),
    ("restaurant", 12),
    ("services", 8),
    ("contact", 8),
    ("portfolio", 18),
    ("team", 8),
)
BLOCKED_PAGE_PATTERN = re.compile(
    r"(privacy|terms|policy|careers|jobs|gift[- ]?card|rewards|account|login|signup|checkout|cart|press|news|blog)",
    re.IGNORECASE,
)
BLOCKED_OVERRIDE_IMAGE_PATTERN = re.compile(
    r"(static_map|suspended(?:\.[a-z0-9]+)?$|feature-callout|phones_image|tabs-\d+-\d+|graphic(?:-|_)|hero-card)",
    re.IGNORECASE,
)
LOCATION_PAGE_PATTERN = re.compile(r"(location|locations|locator|listing|store|stores|branch|office)", re.IGNORECASE)
YAHOO_RESULT_URL_PATTERN = re.compile(r"/RU=([^/]+)/")
BLOCKED_PAGE_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".zip",
)
MIN_HERO_SCORE = 28
MIN_GALLERY_SCORE = 20
MAX_DISCOVERY_PAGES = 5
MAX_SEARCH_RESULTS = 5
MAX_DISCOVERY_WORKERS = 2
SEARCH_RESULT_DOMAINS = {
    "restaurantji.com": 82,
    "www.restaurantji.com": 82,
    "usarestaurants.info": 78,
    "www.usarestaurants.info": 78,
    "businessyab.com": 74,
    "www.businessyab.com": 74,
    "loc8nearme.com": 76,
    "www.loc8nearme.com": 76,
    "visitchandler.com": 72,
    "www.visitchandler.com": 72,
}
TRUSTED_SEARCH_IMAGE_HOSTS = {
    "cdn6.localdatacdn.com",
    "cdn7.localdatacdn.com",
    "cdn8.localdatacdn.com",
    "cdn9.localdatacdn.com",
    "cdn10.localdatacdn.com",
    "cdn2.usarestaurants.info",
    "cdn.businessyab.com",
    "fnb.com-photos.com",
    "assets.simpleviewinc.com",
}
BLOCKED_SEARCH_RESULT_HOSTS = {
    "bing.com",
    "www.bing.com",
    "bizapedia.com",
    "www.bizapedia.com",
    "britannica.com",
    "www.britannica.com",
    "buzzfile.com",
    "www.buzzfile.com",
    "dictionary.cambridge.org",
    "search.yahoo.com",
    "images.search.yahoo.com",
    "video.search.yahoo.com",
    "yelp.com",
    "www.yelp.com",
    "facebook.com",
    "www.facebook.com",
    "instagram.com",
    "www.instagram.com",
    "mapy.com",
    "www.mapy.com",
    "nextdoor.com",
    "www.nextdoor.com",
    "mapquest.com",
    "www.mapquest.com",
    "tiktok.com",
    "www.tiktok.com",
    "ubereats.com",
    "www.ubereats.com",
}


@dataclass
class FetchedPage:
    requested_url: str
    url: str
    html: str
    page_score: int = 0


@dataclass
class SearchResultPage:
    title: str
    url: str
    page_score: int


@dataclass(frozen=True)
class ImageOverrideDiscovery:
    override: dict[str, Any]
    chosen_source_page: str | None
    hero_score: int
    hero_assessment: ImageQualityAssessment


@dataclass(frozen=True)
class ImageOverrideAuditRecord:
    slug: str
    name: str
    city: str
    status: str
    current_hero_url: str | None
    proposed_hero_url: str | None
    chosen_source_page: str | None
    outcome: str
    reasons: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "city": self.city,
            "status": self.status,
            "currentHeroUrl": self.current_hero_url,
            "proposedHeroUrl": self.proposed_hero_url,
            "chosenSourcePage": self.chosen_source_page,
            "outcome": self.outcome,
            "reasons": self.reasons,
        }


@dataclass(frozen=True)
class ImageOverrideGenerationResult:
    overrides: dict[str, dict[str, Any]]
    audit_records: list[ImageOverrideAuditRecord]


def default_source_directory_path() -> Path:
    return ROOT / "src" / "data" / "generated-directory-businesses.json"


def default_image_override_path() -> Path:
    return ROOT / "src" / "data" / "generated-business-image-overrides.json"


def default_image_audit_path() -> Path:
    return ROOT / "data" / "scrape-staging" / "business-image-audit.json"


def manual_override_slugs() -> set[str]:
    if not MANUAL_OVERRIDE_PATH.exists():
        return set()
    source = MANUAL_OVERRIDE_PATH.read_text(encoding="utf-8")
    return {match.group(1) for match in re.finditer(r"'([^']+)'\s*:", source)}


def _same_site(url: str, page_url: str) -> bool:
    host = (hostname_for(url) or "").removeprefix("www.")
    page_host = (hostname_for(page_url) or "").removeprefix("www.")
    if not host or not page_host:
        return False
    return host == page_host or host.endswith(f".{page_host}") or page_host.endswith(f".{host}")


def _seed_page_urls(website: str | None) -> list[str]:
    normalized = normalize_url(website)
    if not normalized:
        return []
    urls = [normalized]
    parsed = urlparse(normalized)
    root = f"{parsed.scheme}://{parsed.netloc}"
    if root != normalized:
        urls.append(root)
    return list(dict.fromkeys(urls))


def _score_candidate_page(url: str, text: str) -> int:
    haystack = f"{url} {text}".lower()
    if BLOCKED_PAGE_PATTERN.search(haystack):
        return 0
    score = 0
    for hint, hint_score in IMAGE_PAGE_HINTS:
        if hint in haystack:
            score += hint_score
    if "?" in url:
        score -= 4
    return score


def discover_relevant_image_pages(page: FetchedPage) -> list[tuple[int, str]]:
    soup = BeautifulSoup(page.html, "lxml")
    discovered: dict[str, int] = {}

    for tag in soup.find_all("a", href=True):
        url = normalize_url(tag.get("href"), page.url)
        if not url or url == page.url or not _same_site(url, page.url):
            continue
        if url.lower().split("?", 1)[0].endswith(BLOCKED_PAGE_EXTENSIONS):
            continue
        text = normalize_whitespace(
            " ".join(
                part
                for part in [tag.get_text(" ", strip=True), tag.get("title"), tag.get("aria-label")]
                if part
            )
        )
        score = _score_candidate_page(url, text)
        if score <= 0:
            continue
        discovered[url] = max(discovered.get(url, 0), score)

    ranked = sorted(discovered.items(), key=lambda item: (-item[1], item[0]))[:MAX_DISCOVERY_PAGES]
    return [(score, url) for url, score in ranked]


def fetch_page(url: str, timeout_seconds: int = 5) -> FetchedPage | None:
    normalized = normalize_url(url)
    if not normalized:
        return None
    try:
        response = requests.get(
            normalized,
            headers={"User-Agent": USER_AGENT},
            timeout=timeout_seconds,
        )
        response.raise_for_status()
    except Exception:
        return None

    content_type = response.headers.get("content-type", "")
    if "html" not in content_type.lower():
        return None

    return FetchedPage(
        requested_url=normalized,
        url=normalize_url(response.url) or response.url,
        html=response.text,
    )


def _current_image_assessment(business: dict[str, Any]) -> ImageQualityAssessment | None:
    hero_image = normalize_url(business.get("heroImage"))
    business_name = business.get("name", {}).get("en")
    if not hero_image or not business_name:
        return None
    reference_page = normalize_url(business.get("website")) or hero_image
    return inspect_image_reference(
        hero_image,
        business_name=business_name,
        page_url=reference_page,
        page_context=reference_page,
    )


def should_attempt_image_discovery(
    business: dict[str, Any],
    current_assessment: ImageQualityAssessment | None = None,
) -> bool:
    business_name = business.get("name", {}).get("en")
    if not business_name:
        return False
    if business.get("status") not in {"live", "planned"}:
        return False
    if not normalize_url(business.get("heroImage")):
        return True
    current_assessment = current_assessment or _current_image_assessment(business)
    return bool(current_assessment and current_assessment.suspicious)


def _business_name_tokens(value: str) -> set[str]:
    return {
        token
        for token in re.sub(r"[^a-z0-9]+", " ", value.lower()).split()
        if len(token) >= 4 and token not in {"arizona", "chinese", "restaurant", "phoenix", "mesa", "tempe", "tucson", "glendale", "chandler"}
    }


def _is_allowed_override_candidate(
    image_url: str,
    business_name: str,
    candidate_score: int,
    reference_urls: list[str],
    page_score: int,
) -> bool:
    normalized_image = normalize_url(image_url)
    if not normalized_image:
        return False
    if BLOCKED_OVERRIDE_IMAGE_PATTERN.search(normalized_image.lower()):
        return False
    normalized_references = [normalize_url(url) for url in reference_urls]
    page_url = normalized_references[0] if normalized_references else None
    if any(normalized_reference == normalized_image for normalized_reference in normalized_references if normalized_reference):
        return False
    host_match = any(
        normalized_reference and _same_site(normalized_image, normalized_reference)
        for normalized_reference in normalized_references
    )
    token_match = any(token in normalized_image.lower() for token in _business_name_tokens(business_name))
    page_host = (hostname_for(page_url) or "").lower() if page_url else ""
    page_host_match = any(token in page_host for token in _business_name_tokens(business_name))
    trusted_search_image = (hostname_for(normalized_image) or "").lower() in TRUSTED_SEARCH_IMAGE_HOSTS
    location_page = bool(page_url and LOCATION_PAGE_PATTERN.search(page_url))
    return (
        host_match
        or token_match
        or (candidate_score >= 64 and page_score >= 64 and trusted_search_image)
        or (candidate_score >= 70 and page_score >= 70 and page_host_match)
        or (candidate_score >= 58 and page_score >= 68 and location_page)
    )


def _best_image_override_for_pages(
    pages: list[FetchedPage],
    business_name: str,
    reference_urls: list[str],
) -> ImageOverrideDiscovery | None:
    candidate_scores: dict[str, int] = {}
    candidate_sources: dict[str, str] = {}
    candidate_assessments: dict[str, ImageQualityAssessment] = {}

    for page in pages:
        for candidate in extract_ranked_image_candidate_details(
            page.html,
            page.url,
            business_name=business_name,
            page_context=page.url,
        ):
            if not _is_allowed_override_candidate(
                candidate.url,
                business_name,
                candidate.score,
                [page.url, *reference_urls],
                page.page_score,
            ):
                continue
            adjusted_score = candidate.score + page.page_score
            if adjusted_score <= candidate_scores.get(candidate.url, -1):
                continue
            candidate_scores[candidate.url] = adjusted_score
            candidate_sources[candidate.url] = page.url
            candidate_assessments[candidate.url] = candidate.assessment

    ranked = sorted(candidate_scores.items(), key=lambda item: item[1], reverse=True)
    if not ranked or ranked[0][1] < MIN_HERO_SCORE:
        return None

    hero_image = ranked[0][0]
    hero_host = hostname_for(hero_image) or ""
    gallery = [
        url
        for url, score in ranked[1:10]
        if score >= MIN_GALLERY_SCORE
        and url != hero_image
        and not candidate_assessments[url].suspicious
        and ((hostname_for(url) or "") == hero_host or _same_site(url, hero_image))
    ][:6]
    override: dict[str, Any] = {"heroImage": hero_image}
    if gallery:
        override["gallery"] = gallery
    return ImageOverrideDiscovery(
        override=override,
        chosen_source_page=candidate_sources.get(hero_image),
        hero_score=ranked[0][1],
        hero_assessment=candidate_assessments[hero_image],
    )


def should_keep_generated_override(business: dict[str, Any], discovery: ImageOverrideDiscovery) -> bool:
    hero_image = normalize_url(discovery.override.get("heroImage"))
    if not hero_image or discovery.hero_assessment.suspicious:
        return False
    business_name = business["name"]["en"]
    business_website = normalize_url(business.get("website"))
    chosen_source_page = normalize_url(discovery.chosen_source_page)
    hero_host = (hostname_for(hero_image) or "").lower()
    token_match = any(token in hero_image.lower() for token in _business_name_tokens(business_name))
    same_site = bool(business_website and _same_site(hero_image, business_website))
    official_source_page = bool(chosen_source_page and business_website and _same_site(chosen_source_page, business_website))
    trusted_host = hero_host in TRUSTED_SEARCH_IMAGE_HOSTS
    return same_site or official_source_page or trusted_host or token_match


def _decode_yahoo_result_url(value: str) -> str | None:
    match = YAHOO_RESULT_URL_PATTERN.search(value)
    if not match:
        return normalize_url(value)
    return normalize_url(unquote(match.group(1)))


def _decode_bing_result_url(value: str) -> str | None:
    normalized = normalize_url(value)
    if not normalized:
        return None
    parsed = urlparse(normalized)
    host = (parsed.netloc or "").lower()
    if host not in {"www.bing.com", "bing.com"}:
        return normalized
    raw = parse_qs(parsed.query).get("u", [None])[0]
    if not raw:
        return normalized
    if raw.startswith("a1"):
        raw = raw[2:]
    try:
        padded = raw + "=" * ((4 - len(raw) % 4) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode("utf-8", "ignore")
    except Exception:
        return normalized
    return normalize_url(decoded) or normalized


def _build_search_queries(business: dict[str, Any]) -> list[str]:
    name = business["name"]["en"]
    city = business.get("city") or "Arizona"
    category_slug = business.get("categorySlug") or ""
    queries = [f"{name} {city} AZ"]
    if category_slug == "dining":
        queries.extend(
            [
                f"{name} {city} AZ restaurant",
                f"{name} {city} AZ photos",
            ]
        )
    else:
        queries.extend(
            [
                f"{name} {city} AZ photos",
                f"{name} {city} AZ location",
            ]
        )
    return list(dict.fromkeys(queries))


def _normalize_search_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _search_title_bonus(title: str, business_name: str) -> int:
    normalized_title = _normalize_search_text(title)
    normalized_name = _normalize_search_text(business_name)
    if normalized_name and normalized_name in normalized_title:
        return 18
    matches = sum(1 for token in _business_name_tokens(business_name) if token in normalized_title)
    return min(18, matches * 6)


def _search_result_domain_score(resolved_url: str, business_name: str, title: str, business_website: str | None) -> int | None:
    host = (hostname_for(resolved_url) or "").lower()
    if not host or host in BLOCKED_SEARCH_RESULT_HOSTS:
        return None

    title_bonus = _search_title_bonus(title, business_name)
    explicit_score = SEARCH_RESULT_DOMAINS.get(host)
    if explicit_score:
        if title_bonus < 6 and not (business_website and _same_site(resolved_url, business_website)):
            return None
        return explicit_score
    if business_website and _same_site(resolved_url, business_website):
        return 78
    if title_bonus >= 12:
        return 62
    return None


def search_yahoo_result_pages(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
    try:
        response = requests.get(
            "https://search.yahoo.com/search",
            params={"p": query},
            headers={"User-Agent": USER_AGENT},
            timeout=5,
        )
        response.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(response.text, "lxml")
    results: list[SearchResultPage] = []
    seen: set[str] = set()

    for anchor in soup.select("div#results a"):
        href = anchor.get("href")
        title = normalize_whitespace(anchor.get_text(" ", strip=True))
        if not href or not title:
            continue
        resolved_url = _decode_yahoo_result_url(href)
        if not resolved_url or resolved_url in seen:
            continue
        domain_score = _search_result_domain_score(resolved_url, business_name, title, business_website)
        if not domain_score:
            continue
        page_score = domain_score + _search_title_bonus(title, business_name)
        results.append(SearchResultPage(title=title, url=resolved_url, page_score=page_score))
        seen.add(resolved_url)
        if len(results) >= MAX_SEARCH_RESULTS:
            break

    return results


def search_startpage_result_pages(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
    try:
        response = requests.get(
            "https://www.startpage.com/sp/search",
            params={"query": query},
            headers={"User-Agent": USER_AGENT},
            timeout=5,
        )
        response.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(response.text, "lxml")
    results: list[SearchResultPage] = []
    seen: set[str] = set()

    for anchor in soup.select("div.result a.result-link[href]"):
        href = normalize_url(anchor.get("href"))
        title = normalize_whitespace(anchor.get_text(" ", strip=True))
        if not href or not title or href in seen:
            continue
        domain_score = _search_result_domain_score(href, business_name, title, business_website)
        if not domain_score:
            continue
        page_score = domain_score + _search_title_bonus(title, business_name)
        results.append(SearchResultPage(title=title, url=href, page_score=page_score))
        seen.add(href)
        if len(results) >= MAX_SEARCH_RESULTS:
            break

    return results


def search_bing_result_pages(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
    try:
        response = requests.get(
            "https://www.bing.com/search",
            params={"q": query},
            headers={"User-Agent": USER_AGENT},
            timeout=5,
        )
        response.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(response.text, "lxml")
    results: list[SearchResultPage] = []
    seen: set[str] = set()

    for anchor in soup.select("li.b_algo h2 a[href]"):
        href = _decode_bing_result_url(anchor.get("href"))
        title = normalize_whitespace(anchor.get_text(" ", strip=True))
        if not href or not title or href in seen:
            continue
        domain_score = _search_result_domain_score(href, business_name, title, business_website)
        if not domain_score:
            continue
        page_score = domain_score + _search_title_bonus(title, business_name)
        results.append(SearchResultPage(title=title, url=href, page_score=page_score))
        seen.add(href)
        if len(results) >= MAX_SEARCH_RESULTS:
            break

    return results


def search_result_pages(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
    combined: list[SearchResultPage] = []
    seen: set[str] = set()
    for searcher in (search_yahoo_result_pages, search_bing_result_pages, search_startpage_result_pages):
        for result in searcher(query, business_name, business_website):
            if result.url in seen:
                continue
            combined.append(result)
            seen.add(result.url)
    return sorted(combined, key=lambda result: result.page_score, reverse=True)[:MAX_SEARCH_RESULTS]


def _fetch_search_pages(
    business: dict[str, Any],
    fetcher: Callable[[str], FetchedPage | None],
    searcher: Callable[[str, str, str | None], list[SearchResultPage]],
) -> list[FetchedPage]:
    pages: list[FetchedPage] = []
    seen_urls: set[str] = set()
    business_name = business["name"]["en"]
    business_website = business.get("website")

    for query in _build_search_queries(business):
        for result in searcher(query, business_name, business_website):
            if result.url in seen_urls:
                continue
            if _search_title_bonus(result.title, business_name) < 6 and not (
                business_website and _same_site(result.url, business_website)
            ):
                continue
            page = fetcher(result.url)
            if not page:
                continue
            page.page_score = result.page_score
            pages.append(page)
            seen_urls.add(result.url)
            if len(pages) >= MAX_SEARCH_RESULTS:
                return pages

    return pages


def _page_keys(page: FetchedPage) -> list[str]:
    return list(
        dict.fromkeys(
            [
                normalize_url(page.url) or page.url,
                normalize_url(page.requested_url) or page.requested_url,
            ]
        )
    )


def _store_page(page_index: dict[str, FetchedPage], page: FetchedPage) -> None:
    keys = [key for key in _page_keys(page) if key]
    if not keys:
        return
    existing = next((page_index[key] for key in keys if key in page_index), None)
    if existing:
        existing.page_score = max(existing.page_score, page.page_score)
        for key in keys:
            page_index[key] = existing
        return
    for key in keys:
        page_index[key] = page


def _unique_pages(page_index: dict[str, FetchedPage]) -> list[FetchedPage]:
    pages: list[FetchedPage] = []
    seen: set[int] = set()
    for page in page_index.values():
        marker = id(page)
        if marker in seen:
            continue
        seen.add(marker)
        pages.append(page)
    return pages


def discover_business_image_override_result(
    business: dict[str, Any],
    fetcher: Callable[[str], FetchedPage | None] | None = None,
    searcher: Callable[[str, str, str | None], list[SearchResultPage]] | None = None,
) -> ImageOverrideDiscovery | None:
    current_assessment = _current_image_assessment(business)
    if not should_attempt_image_discovery(business, current_assessment):
        return None

    fetcher = fetcher or fetch_page
    searcher = searcher or search_result_pages
    business_name = business["name"]["en"]
    business_website = normalize_url(business.get("website"))
    page_index: dict[str, FetchedPage] = {}

    for index, url in enumerate(_seed_page_urls(business_website)):
        page = fetcher(url)
        if not page:
            continue
        page.page_score = 8 if index == 0 else 3
        _store_page(page_index, page)

    discovered_targets: dict[str, int] = {}
    for page in _unique_pages(page_index):
        for link_score, url in discover_relevant_image_pages(page):
            if any(key in page_index for key in [normalize_url(url) or url]):
                continue
            discovered_targets[url] = max(discovered_targets.get(url, 0), link_score)

    for url, link_score in sorted(discovered_targets.items(), key=lambda item: (-item[1], item[0]))[:MAX_DISCOVERY_PAGES]:
        page = fetcher(url)
        if not page:
            continue
        page.page_score = link_score
        _store_page(page_index, page)

    for page in _fetch_search_pages(business, fetcher, searcher):
        _store_page(page_index, page)

    reference_urls = [business_website] if business_website else []
    return _best_image_override_for_pages(_unique_pages(page_index), business_name, reference_urls)


def discover_business_image_override(
    business: dict[str, Any],
    fetcher: Callable[[str], FetchedPage | None] | None = None,
    searcher: Callable[[str, str, str | None], list[SearchResultPage]] | None = None,
) -> dict[str, Any] | None:
    discovery = discover_business_image_override_result(business, fetcher=fetcher, searcher=searcher)
    return discovery.override if discovery else None


def _unique_reasons(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def _build_audit_record(
    business: dict[str, Any],
    current_assessment: ImageQualityAssessment | None,
    discovery: ImageOverrideDiscovery | None,
    kept_override: ImageOverrideDiscovery | None,
    error_reason: str | None = None,
) -> ImageOverrideAuditRecord | None:
    current_hero_url = normalize_url(business.get("heroImage"))
    current_missing = not current_hero_url
    current_suspicious = bool(current_assessment and current_assessment.suspicious)
    if not current_missing and not current_suspicious:
        return None

    reasons: list[str] = []
    outcome = "needs_manual_review"
    if current_missing:
        reasons.append("missing_current_image")
    if current_suspicious:
        reasons.append("suspicious_current_image")
        reasons.extend(list(current_assessment.reasons))

    if kept_override:
        outcome = "resolved_missing" if current_missing else "replaced_suspicious"
    else:
        if discovery:
            reasons.append("proposed_image_rejected")
            reasons.extend(list(discovery.hero_assessment.reasons))
        else:
            reasons.append("no_candidate_found")
        if error_reason:
            reasons.append(error_reason)

    return ImageOverrideAuditRecord(
        slug=business["slug"],
        name=business["name"]["en"],
        city=business.get("city") or "",
        status=business.get("status") or "",
        current_hero_url=current_hero_url,
        proposed_hero_url=kept_override.override.get("heroImage") if kept_override else (discovery.override.get("heroImage") if discovery else None),
        chosen_source_page=kept_override.chosen_source_page if kept_override else (discovery.chosen_source_page if discovery else None),
        outcome=outcome,
        reasons=_unique_reasons(reasons),
    )


def generate_directory_image_overrides(
    source_path: Path | None = None,
    destination: Path | None = None,
    audit_destination: Path | None = None,
    resolver: Callable[[dict[str, Any]], ImageOverrideDiscovery | None] | None = None,
    max_workers: int = MAX_DISCOVERY_WORKERS,
) -> ImageOverrideGenerationResult:
    source_path = source_path or default_source_directory_path()
    destination = destination or default_image_override_path()
    audit_destination = audit_destination or default_image_audit_path()
    resolver = resolver or discover_business_image_override_result

    businesses = json.loads(source_path.read_text(encoding="utf-8"))
    existing_manual_slugs = manual_override_slugs()
    current_assessments = {
        business["slug"]: _current_image_assessment(business)
        for business in businesses
        if business.get("slug") not in existing_manual_slugs
    }
    eligible_businesses = [
        business
        for business in businesses
        if business.get("slug") not in existing_manual_slugs
        and should_attempt_image_discovery(business, current_assessments.get(business["slug"]))
    ]
    business_by_slug = {business["slug"]: business for business in eligible_businesses}

    resolved_discoveries: dict[str, ImageOverrideDiscovery | None] = {}
    error_reasons: dict[str, str] = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_slug = {
            executor.submit(resolver, business): business["slug"] for business in eligible_businesses
        }
        for future in as_completed(future_to_slug):
            slug = future_to_slug[future]
            try:
                resolved_discoveries[slug] = future.result()
            except Exception as exc:
                resolved_discoveries[slug] = None
                error_reasons[slug] = f"discovery_error:{type(exc).__name__}"

    overrides: dict[str, dict[str, Any]] = {}
    audit_records: list[ImageOverrideAuditRecord] = []

    for business in eligible_businesses:
        slug = business["slug"]
        discovery = resolved_discoveries.get(slug)
        kept_override = discovery if discovery and should_keep_generated_override(business, discovery) else None
        if kept_override:
            overrides[slug] = kept_override.override

        audit_record = _build_audit_record(
            business,
            current_assessments.get(slug),
            discovery,
            kept_override,
            error_reason=error_reasons.get(slug),
        )
        if audit_record:
            audit_records.append(audit_record)

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    audit_destination.parent.mkdir(parents=True, exist_ok=True)
    audit_destination.write_text(
        json.dumps([record.to_dict() for record in audit_records], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    return ImageOverrideGenerationResult(overrides=overrides, audit_records=audit_records)


def main() -> None:
    result = generate_directory_image_overrides()
    print(f"wrote {len(result.overrides)} automatic business image overrides -> {default_image_override_path()}")
    print(f"wrote {len(result.audit_records)} image audit rows -> {default_image_audit_path()}")


if __name__ == "__main__":
    main()
