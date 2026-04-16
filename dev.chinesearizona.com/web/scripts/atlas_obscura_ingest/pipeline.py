from __future__ import annotations

import json
import re
import subprocess
import time
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, quote, urljoin, urlparse

from bs4 import BeautifulSoup, Tag

try:
    from curl_cffi import requests as curl_cffi_requests
except Exception:  # pragma: no cover - optional dependency
    curl_cffi_requests = None

ATLAS_SOURCE_NAME = "Atlas Obscura"
ATLAS_ARIZONA_GUIDE_URL = "https://www.atlasobscura.com/things-to-do/arizona"
ATLAS_ARIZONA_PLACES_URL = f"{ATLAS_ARIZONA_GUIDE_URL}/places"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
)
WHITESPACE_PATTERN = re.compile(r"\s+")
DATE_PATTERN = re.compile(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}")
COORDINATE_PATTERN = re.compile(r"(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)")
TARGET_URL_PATTERN = re.compile(r"/(places|articles|lists|itineraries?|itinerary)/")
ATLAS_FETCH_RETRY_DELAYS = (2.0, 5.0, 10.0)
ATLAS_FETCH_DELAY_SECONDS = 0.35
RETRY_LATER_PATTERN = re.compile(r"\bRetry later\b", re.IGNORECASE)
TRANSLATION_SEPARATOR = "\n<<<ATLAS_ZH_SPLIT>>>\n"
TRANSLATION_BATCH_MAX_CHARS = 3500

Translator = Callable[[list[str]], list[str]]
Fetcher = Callable[[list[str]], dict[str, str]]


def default_output_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "atlas-obscura-staging"


def default_generated_path() -> Path:
    return Path(__file__).resolve().parents[2] / "src" / "data" / "generated-hidden-arizona.json"


def default_override_path() -> Path:
    return Path(__file__).resolve().parents[2] / "src" / "data" / "atlas-obscura-editor-overrides.json"


def _staged_entries_path(output_dir: Path) -> Path:
    return output_dir / "staged-hidden-arizona.json"


def _manifest_path(output_dir: Path) -> Path:
    return output_dir / "sync-manifest.json"


def _translation_cache_path(output_dir: Path) -> Path:
    return output_dir / "translation-cache.json"


def _normalize_whitespace(value: str) -> str:
    return WHITESPACE_PATTERN.sub(" ", value).strip()


def _normalize_url(value: str) -> str:
    parsed = urlparse(value)
    if not parsed.scheme:
        return value.rstrip("/")
    path = parsed.path.rstrip("/")
    if not path:
        path = ""
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "hidden-arizona-entry"


def _to_localized(english: str, chinese: str | None = None) -> dict[str, str | None]:
    compact = _normalize_whitespace(english)
    return {
        "en": compact,
        "zh": _normalize_whitespace(chinese) if chinese else compact,
    }


def _meta_content(soup: BeautifulSoup, key: str) -> str:
    for attrs in ({"property": key}, {"name": key}):
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return _normalize_whitespace(str(tag.get("content")))
    return ""


def _run_curl(url: str) -> str:
    command = [
        "curl",
        "-sS",
        "-L",
        "--compressed",
        "-A",
        USER_AGENT,
        "-H",
        "Accept-Language: en-US,en;q=0.9",
        url,
    ]
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    return completed.stdout


def _is_atlas_url(url: str) -> bool:
    return "atlasobscura.com" in urlparse(url).netloc


def _looks_like_retry_page(page_html: str) -> bool:
    return bool(RETRY_LATER_PATTERN.search(page_html[:1200]))


def _run_curl_cffi(url: str, session: Any | None = None) -> str:
    if curl_cffi_requests is None:
        return _run_curl(url)

    active_session = session or curl_cffi_requests.Session()
    last_error: Exception | None = None

    for attempt, delay_seconds in enumerate((0.0, *ATLAS_FETCH_RETRY_DELAYS), start=1):
        if delay_seconds:
            time.sleep(delay_seconds)

        try:
            response = active_session.get(
                url,
                impersonate="chrome136",
                headers={
                    "Accept-Language": "en-US,en;q=0.9",
                    "User-Agent": USER_AGENT,
                },
                timeout=60,
            )
            response.raise_for_status()
            if _looks_like_retry_page(response.text):
                last_error = RuntimeError(f"Atlas Obscura asked us to retry later for {url}")
                continue

            time.sleep(ATLAS_FETCH_DELAY_SECONDS)
            return response.text
        except Exception as error:  # pragma: no cover - network-dependent
            last_error = error

    if last_error:
        raise RuntimeError(f"Unable to fetch Atlas Obscura URL after retries: {url}") from last_error

    raise RuntimeError(f"Unable to fetch Atlas Obscura URL: {url}")


def _fetch_pages(urls: list[str]) -> dict[str, str]:
    fetched: dict[str, str] = {}
    atlas_session = curl_cffi_requests.Session() if curl_cffi_requests is not None else None

    for url in list(dict.fromkeys(urls)):
        fetched[url] = _run_curl_cffi(url, session=atlas_session) if _is_atlas_url(url) else _run_curl(url)

    return fetched


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _derive_kind(url: str) -> str | None:
    if "/places/" in url:
        return "place"
    if "/articles/" in url:
        return "story"
    if "/lists/" in url:
        return "list"
    if "/itinerary" in url or "/itineraries/" in url:
        return "itinerary"
    return None


def _discover_targets_in_container(
    container: Tag | BeautifulSoup,
    source_url: str,
    allowed_kinds: set[str] | None = None,
) -> list[dict[str, str]]:
    discovered: dict[str, dict[str, str]] = {}

    for anchor in container.select("a[href]"):
        href = anchor.get("href", "").strip()
        if not href:
            continue
        absolute_url = urljoin(source_url, href)
        if not TARGET_URL_PATTERN.search(absolute_url):
            continue
        kind = _derive_kind(absolute_url)
        if not kind:
            continue
        if allowed_kinds and kind not in allowed_kinds:
            continue
        if absolute_url.endswith("/new"):
            continue
        normalized_url = _normalize_url(absolute_url)
        discovered[normalized_url] = {
            "url": normalized_url,
            "kind": kind,
            "label": _normalize_whitespace(anchor.get_text(" ", strip=True)),
        }

    return list(discovered.values())


def _find_heading(soup: BeautifulSoup, value: str) -> Tag | None:
    normalized_value = value.casefold()
    for header in soup.find_all(["h1", "h2", "h3"]):
        if _normalize_whitespace(header.get_text(" ", strip=True)).casefold() == normalized_value:
            return header
    return None


def discover_guide_targets(page_html: str, source_url: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(page_html, "html.parser")

    scoped_targets: list[dict[str, str]] = []
    stories_heading = _find_heading(soup, "Arizona Stories")
    if stories_heading:
        stories_section = stories_heading.find_parent("section")
        if stories_section:
            scoped_targets.extend(_discover_targets_in_container(stories_section, source_url, {"story"}))

    lists_heading = _find_heading(soup, "Lists")
    if lists_heading:
        lists_section = lists_heading.find_parent("section")
        if lists_section:
            scoped_targets.extend(_discover_targets_in_container(lists_section, source_url, {"list", "itinerary"}))

    if scoped_targets:
        deduped: dict[str, dict[str, str]] = {}
        for target in scoped_targets:
            deduped[target["url"]] = target
        return list(deduped.values())

    return _discover_targets_in_container(soup, source_url)


def discover_places_index_page_count(page_html: str, source_url: str) -> int:
    soup = BeautifulSoup(page_html, "html.parser")
    page_numbers = [1]

    for anchor in soup.select("a[href*='?page=']"):
        absolute_url = urljoin(source_url, anchor.get("href", ""))
        parsed = urlparse(absolute_url)
        query_page = parse_qs(parsed.query).get("page", [])
        if query_page and query_page[0].isdigit():
            page_numbers.append(int(query_page[0]))

    return max(page_numbers)


def discover_places_index_targets(page_html: str, source_url: str) -> list[dict[str, str]]:
    soup = BeautifulSoup(page_html, "html.parser")

    for selector in (
        ".CardWrapper a[data-gtm-content-type][href*='/places/']",
        ".CardWrapper a[href*='/places/']",
        "main a[data-gtm-content-type][href*='/places/']",
    ):
        matches = soup.select(selector)
        if matches:
            return _discover_targets_in_container(BeautifulSoup("".join(str(match) for match in matches), "html.parser"), source_url, {"place"})

    return []


def _extract_title(soup: BeautifulSoup) -> str:
    for selector in ("h1", "meta[property='og:title']", "title"):
        tag = soup.select_one(selector)
        if not tag:
            continue
        if tag.name == "meta":
            content = tag.get("content")
            if content:
                return _normalize_whitespace(str(content))
        else:
            text = tag.get_text(" ", strip=True)
            if text:
                return _normalize_whitespace(text)
    return "Untitled Arizona entry"


def _extract_excerpt(soup: BeautifulSoup) -> str:
    for selector in ("meta[property='og:description']", "meta[name='description']", "h2"):
        tag = soup.select_one(selector)
        if not tag:
            continue
        if tag.name == "meta":
            content = tag.get("content")
            if content:
                return _normalize_whitespace(str(content))
        else:
            text = tag.get_text(" ", strip=True)
            if text:
                return _normalize_whitespace(text)
    return ""


def _extract_dates(soup: BeautifulSoup) -> tuple[str, str]:
    published = _meta_content(soup, "article:published_time")
    modified = _meta_content(soup, "article:modified_time")

    if published and modified:
        return published, modified

    text = soup.get_text("\n", strip=True)
    matches = DATE_PATTERN.findall(text)
    if matches:
        # DATE_PATTERN.findall returns only month names, so run full search.
        full_matches = DATE_PATTERN.finditer(text)
        full_values = [match.group(0) for match in full_matches]
        if full_values:
            published_date = full_values[0]
            published_iso = datetime.strptime(published_date, "%B %d, %Y").replace(tzinfo=UTC).isoformat()
            return published_iso, published_iso

    now = datetime.now(UTC).isoformat()
    return now, now


def _load_json_ld_items(soup: BeautifulSoup) -> list[Any]:
    items: list[Any] = []

    for script in soup.select("script[type='application/ld+json']"):
        raw_value = (script.string or script.get_text(strip=True) or "").strip()
        if not raw_value:
            continue

        try:
            payload = json.loads(raw_value)
        except json.JSONDecodeError:
            continue

        if isinstance(payload, list):
            items.extend(payload)
            continue

        if isinstance(payload, dict) and isinstance(payload.get("@graph"), list):
            items.extend(payload["@graph"])
            continue

        items.append(payload)

    return items


def _json_ld_type_matches(item: Any, *expected_types: str) -> bool:
    if not isinstance(item, dict):
        return False

    item_type = item.get("@type")
    if isinstance(item_type, str):
        values = [item_type]
    elif isinstance(item_type, list):
        values = [value for value in item_type if isinstance(value, str)]
    else:
        values = []

    normalized = {value.casefold() for value in values}
    return any(expected.casefold() in normalized for expected in expected_types)


def _find_json_ld_item(soup: BeautifulSoup, *expected_types: str) -> dict[str, Any] | None:
    for item in _load_json_ld_items(soup):
        if _json_ld_type_matches(item, *expected_types):
            return item
    return None


def _extract_json_ld_image(soup: BeautifulSoup) -> str | None:
    for expected_types in (("Place", "TouristAttraction"), ("Article", "NewsArticle"), ("ItemList",), ("Trip", "TouristTrip")):
        item = _find_json_ld_item(soup, *expected_types)
        if not item:
            continue

        image_value = item.get("image")
        if isinstance(image_value, str):
            return image_value
        if isinstance(image_value, list):
            for value in image_value:
                if isinstance(value, str):
                    return value
                if isinstance(value, dict) and isinstance(value.get("url"), str):
                    return value["url"]
        if isinstance(image_value, dict) and isinstance(image_value.get("url"), str):
            return image_value["url"]

    return None


def _is_atlas_image_url(url: str) -> bool:
    hostname = urlparse(url).netloc
    return hostname in {"img.atlasobscura.com", "images.atlasobscura.com"}


def _extract_gallery(soup: BeautifulSoup, page_url: str) -> tuple[str | None, list[str]]:
    urls: list[str] = []
    json_ld_image = _extract_json_ld_image(soup)
    if json_ld_image:
        urls.append(urljoin(page_url, json_ld_image))

    for meta_key in ("og:image", "twitter:image"):
        meta_url = _meta_content(soup, meta_key)
        if meta_url:
            urls.append(urljoin(page_url, meta_url))

    for image in soup.select("img.clickable[src], article img[src], main img[src], img[src]"):
        src = image.get("src")
        if not src:
            continue
        absolute = urljoin(page_url, src)
        if absolute.startswith("data:"):
            continue
        if not _is_atlas_image_url(absolute):
            continue
        urls.append(absolute)

    unique_urls = list(dict.fromkeys(urls))
    hero = unique_urls[0] if unique_urls else None
    gallery = [value for value in unique_urls[1:] if value != hero][:12]
    return hero, gallery


def _collect_section_text(soup: BeautifulSoup, heading: str) -> list[str]:
    normalized_heading = heading.casefold()
    for header in soup.find_all(["h2", "h3"]):
        if _normalize_whitespace(header.get_text(" ", strip=True)).casefold() != normalized_heading:
            continue

        values: list[str] = []
        for sibling in header.find_next_siblings():
            if sibling.name in {"h2", "h3"}:
                break
            if sibling.name in {"p", "li", "blockquote"}:
                text = _normalize_whitespace(sibling.get_text(" ", strip=True))
                if text:
                    values.append(text)
        return values

    return []


def _extract_place_city(soup: BeautifulSoup) -> str | None:
    place_item = _find_json_ld_item(soup, "Place", "TouristAttraction")
    if place_item and isinstance(place_item.get("address"), dict):
        locality = place_item["address"].get("addressLocality")
        if isinstance(locality, str) and _normalize_whitespace(locality):
            return _normalize_whitespace(locality)

    for selector in ("h3", "meta[property='og:locality']"):
        tag = soup.select_one(selector)
        if not tag:
            continue
        value = tag.get("content") if tag.name == "meta" else tag.get_text(" ", strip=True)
        if not value:
            continue
        if "," in value:
            return _normalize_whitespace(value.split(",", 1)[0])
    return None


def _extract_place_address(soup: BeautifulSoup) -> str | None:
    place_item = _find_json_ld_item(soup, "Place", "TouristAttraction")
    if place_item and isinstance(place_item.get("address"), dict):
        address = place_item["address"]
        parts = [
            address.get("streetAddress"),
            address.get("addressLocality"),
            address.get("addressRegion"),
            address.get("postalCode"),
        ]
        compact = ", ".join(_normalize_whitespace(str(part)) for part in parts if part)
        if compact:
            return compact

    candidates = []
    for selector in ("[itemprop='streetAddress']", ".address", "[data-test='place-address']"):
        tag = soup.select_one(selector)
        if tag:
            text = _normalize_whitespace(tag.get_text(" ", strip=True))
            if text:
                candidates.append(text)

    text = soup.get_text("\n", strip=True)
    for line in text.splitlines():
        compact = _normalize_whitespace(line)
        if "United States" in compact:
            continue
        if re.search(r"\b(?:AZ|Arizona)\b", compact) and any(character.isdigit() for character in compact):
            candidates.append(compact)

    return candidates[0] if candidates else None


def _extract_coordinates(soup: BeautifulSoup) -> dict[str, float] | None:
    place_item = _find_json_ld_item(soup, "Place", "TouristAttraction")
    if place_item and isinstance(place_item.get("geo"), dict):
        latitude = place_item["geo"].get("latitude")
        longitude = place_item["geo"].get("longitude")
        if isinstance(latitude, (int, float)) and isinstance(longitude, (int, float)):
            return {
                "lat": float(latitude),
                "lng": float(longitude),
            }

    text = soup.get_text("\n", strip=True)
    match = COORDINATE_PATTERN.search(text)
    if not match:
        return None
    return {
        "lat": float(match.group(1)),
        "lng": float(match.group(2)),
    }


def _extract_related_links(soup: BeautifulSoup, page_url: str) -> list[dict[str, Any]]:
    related_links: list[dict[str, Any]] = []
    heading_values = {
        "nearby places",
        "related places",
        "related stories",
        "related lists",
        "related itineraries",
        "more atlas links",
    }

    scoped_anchors: list[Tag] = []
    for header in soup.find_all(["h2", "h3"]):
        if _normalize_whitespace(header.get_text(" ", strip=True)).casefold() not in heading_values:
            continue
        for sibling in header.find_next_siblings():
            if sibling.name in {"h2", "h3"}:
                break
            if sibling.name == "a" and sibling.get("href"):
                scoped_anchors.append(sibling)
            scoped_anchors.extend(sibling.select("a[href]"))

    for anchor in scoped_anchors:
        href = anchor.get("href", "").strip()
        if not href:
            continue
        absolute_url = urljoin(page_url, href)
        if absolute_url == page_url or "atlasobscura.com" not in absolute_url:
            continue
        if not TARGET_URL_PATTERN.search(absolute_url):
            continue
        label = _normalize_whitespace(anchor.get_text(" ", strip=True))
        if not label:
            continue
        related_links.append(
            {
                "label": _to_localized(label),
                "url": _normalize_url(absolute_url),
                "source": ATLAS_SOURCE_NAME,
            }
        )

    unique_links: dict[str, dict[str, Any]] = {}
    for link in related_links:
        unique_links[link["url"]] = link
    return list(unique_links.values())[:8]


def _extract_tags(soup: BeautifulSoup) -> list[str]:
    related_tags: list[str] = []
    for header in soup.find_all(["h2", "h3"]):
        if _normalize_whitespace(header.get_text(" ", strip=True)).casefold() != "related tags":
            continue
        for sibling in header.find_next_siblings():
            if sibling.name in {"h2", "h3"}:
                break
            anchors = sibling.select("a[href]")
            if anchors:
                related_tags.extend(_normalize_whitespace(anchor.get_text(" ", strip=True)) for anchor in anchors)
            else:
                text = _normalize_whitespace(sibling.get_text(" ", strip=True))
                if text:
                    related_tags.extend(piece for piece in re.split(r"\s{2,}|,\s*", text) if piece)
        break

    related_tags = [tag for tag in related_tags if 2 <= len(tag) <= 60]
    if related_tags:
        return list(dict.fromkeys(related_tags))[:16]

    tags: list[str] = []
    keywords = _meta_content(soup, "keywords")
    if keywords:
        tags.extend([_normalize_whitespace(item) for item in keywords.split(",") if _normalize_whitespace(item)])

    for anchor in soup.select("a[href]"):
        href = anchor.get("href", "")
        if not href:
            continue
        if not any(token in href for token in ("/tag/", "/topics/", "?tag=")):
            continue
        label = _normalize_whitespace(anchor.get_text(" ", strip=True))
        if label and 2 <= len(label) <= 60:
            tags.append(label)

    return list(dict.fromkeys(tags))[:16]


def _extract_primary_body(soup: BeautifulSoup) -> list[str]:
    containers = []
    for selector in ("article", "main", "[role='main']", ".article-body", ".entry-content"):
        container = soup.select_one(selector)
        if container:
            containers.append(container)
    containers.append(soup)

    for container in containers:
        paragraphs = []
        for tag in container.select("p"):
            text = _normalize_whitespace(tag.get_text(" ", strip=True))
            if text and text not in paragraphs:
                paragraphs.append(text)
        if paragraphs:
            return paragraphs

    return []


def parse_hidden_arizona_place(page_html: str, page_url: str) -> dict[str, Any]:
    soup = BeautifulSoup(page_html, "html.parser")
    place_item = _find_json_ld_item(soup, "Place", "TouristAttraction")
    title = _extract_title(soup)
    excerpt = _extract_excerpt(soup)
    published_at, updated_at = _extract_dates(soup)
    if place_item:
        published_at = place_item.get("datePublished", published_at)
        updated_at = place_item.get("dateModified", updated_at)
    hero_image, gallery = _extract_gallery(soup, page_url)
    about = _collect_section_text(soup, "About")
    if not about:
        body_candidates = _extract_primary_body(soup)
        about = body_candidates[:6] if body_candidates else [excerpt or title]
    know_before_you_go = _collect_section_text(soup, "Know Before You Go")
    city = _extract_place_city(soup)
    related_links = _extract_related_links(soup, page_url)

    visit_website = None
    directions_url = None
    for anchor in soup.select("a[href]"):
        label = _normalize_whitespace(anchor.get_text(" ", strip=True)).casefold()
        href = anchor.get("href", "").strip()
        if not href:
            continue
        absolute_url = urljoin(page_url, href)
        if label == "visit website":
            visit_website = absolute_url
        if "get directions" in label:
            directions_url = absolute_url

    if not visit_website and place_item:
        same_as = place_item.get("sameAs")
        if isinstance(same_as, str):
            visit_website = same_as
        elif isinstance(same_as, list):
            for candidate in same_as:
                if isinstance(candidate, str):
                    visit_website = candidate
                    break

    return {
        "slug": _slugify(title),
        "kind": "place",
        "title": _to_localized(title),
        "excerpt": _to_localized(excerpt or title),
        "body": [_to_localized(paragraph) for paragraph in about],
        "heroImage": hero_image,
        "gallery": gallery,
        "tags": _extract_tags(soup),
        "sourceName": ATLAS_SOURCE_NAME,
        "sourceUrl": _normalize_url(page_url),
        "sourceId": _normalize_url(page_url).split("/")[-1],
        "publishedAt": published_at,
        "updatedAt": updated_at,
        "republishedWithPermission": True,
        "city": city,
        "address": _extract_place_address(soup),
        "coordinates": _extract_coordinates(soup),
        "visitWebsite": visit_website,
        "directionsUrl": directions_url,
        "nearbyEntrySlugs": [],
        "knowBeforeYouGo": [_to_localized(paragraph) for paragraph in know_before_you_go],
        "relatedLinks": related_links,
    }


def _parse_non_place_entry(page_html: str, page_url: str, kind: str) -> dict[str, Any]:
    soup = BeautifulSoup(page_html, "html.parser")
    title = _extract_title(soup)
    excerpt = _extract_excerpt(soup)
    published_at, updated_at = _extract_dates(soup)
    article_item = _find_json_ld_item(soup, "Article", "NewsArticle")
    if article_item:
        published_at = article_item.get("datePublished", published_at)
        updated_at = article_item.get("dateModified", updated_at)
    hero_image, gallery = _extract_gallery(soup, page_url)
    body = _extract_primary_body(soup)
    if not body:
        body = [excerpt or title]

    return {
        "slug": _slugify(title),
        "kind": kind,
        "title": _to_localized(title),
        "excerpt": _to_localized(excerpt or title),
        "body": [_to_localized(paragraph) for paragraph in body],
        "heroImage": hero_image,
        "gallery": gallery,
        "tags": _extract_tags(soup),
        "sourceName": ATLAS_SOURCE_NAME,
        "sourceUrl": _normalize_url(page_url),
        "sourceId": _normalize_url(page_url).split("/")[-1],
        "publishedAt": published_at,
        "updatedAt": updated_at,
        "republishedWithPermission": True,
        "relatedLinks": _extract_related_links(soup, page_url),
    }


def parse_hidden_arizona_story(page_html: str, page_url: str) -> dict[str, Any]:
    return _parse_non_place_entry(page_html, page_url, "story")


def parse_hidden_arizona_list(page_html: str, page_url: str) -> dict[str, Any]:
    return _parse_non_place_entry(page_html, page_url, "list")


def parse_hidden_arizona_itinerary(page_html: str, page_url: str) -> dict[str, Any]:
    return _parse_non_place_entry(page_html, page_url, "itinerary")


def _load_translation_cache(path: Path) -> dict[str, str]:
    return _load_json(path, {})


def _save_translation_cache(path: Path, payload: dict[str, str]) -> None:
    _write_json(path, payload)


def _google_translate_to_zh(texts: list[str]) -> list[str]:
    if not texts:
        return []

    translated_parts: list[str] = []
    batch: list[str] = []
    batch_length = 0

    def flush_batch(items: list[str]) -> None:
        if not items:
            return
        query = quote(TRANSLATION_SEPARATOR.join(items))
        url = (
            "https://translate.googleapis.com/translate_a/single"
            f"?client=gtx&sl=auto&tl=zh-TW&dt=t&q={query}"
        )
        raw_response = _run_curl(url)
        payload = json.loads(raw_response)
        translated = "".join(
            part[0] for part in payload[0] if isinstance(part, list) and part and isinstance(part[0], str)
        )
        parts = [part.strip() for part in translated.split("<<<ATLAS_ZH_SPLIT>>>")]
        if len(parts) != len(items):
            raise ValueError("Translation batch split mismatch.")
        translated_parts.extend(parts)

    for text in texts:
        projected_length = batch_length + len(text) + len(TRANSLATION_SEPARATOR)
        if batch and projected_length > TRANSLATION_BATCH_MAX_CHARS:
            flush_batch(batch)
            batch = []
            batch_length = 0
        batch.append(text)
        batch_length += len(text) + len(TRANSLATION_SEPARATOR)

    flush_batch(batch)
    return translated_parts


def _translate_texts(texts: list[str], cache_path: Path, translator: Translator | None = None) -> dict[str, str]:
    translator = translator or _google_translate_to_zh
    cache = _load_translation_cache(cache_path)
    unique_texts = [text for text in dict.fromkeys(texts) if _normalize_whitespace(text)]
    missing = [text for text in unique_texts if text not in cache]

    if missing:
        try:
            translated = translator(missing)
        except Exception:
            translated = missing
        for index, text in enumerate(missing):
            cache[text] = translated[index] if index < len(translated) else text
        _save_translation_cache(cache_path, cache)

    return {text: cache.get(text, text) for text in unique_texts}


def _translate_entry(entry: dict[str, Any], cache_path: Path, translator: Translator | None = None) -> dict[str, Any]:
    texts = [
        entry["title"]["en"],
        entry["excerpt"]["en"],
        *[paragraph["en"] for paragraph in entry["body"]],
        *[paragraph["en"] for paragraph in entry.get("knowBeforeYouGo", [])],
        *[link["label"]["en"] for link in entry.get("relatedLinks", [])],
    ]
    translations = _translate_texts(texts, cache_path, translator=translator)
    entry["title"]["zh"] = translations.get(entry["title"]["en"], entry["title"]["en"])
    entry["excerpt"]["zh"] = translations.get(entry["excerpt"]["en"], entry["excerpt"]["en"])

    for paragraph in entry["body"]:
        paragraph["zh"] = translations.get(paragraph["en"], paragraph["en"])

    for paragraph in entry.get("knowBeforeYouGo", []):
        paragraph["zh"] = translations.get(paragraph["en"], paragraph["en"])

    for link in entry.get("relatedLinks", []):
        english = link["label"]["en"]
        link["label"]["zh"] = translations.get(english, english)

    return entry


def _apply_overrides(entries: list[dict[str, Any]], override_path: Path) -> tuple[list[dict[str, Any]], int]:
    overrides = _load_json(override_path, {})
    override_count = 0

    for entry in entries:
        override = overrides.get(entry["slug"])
        if not override:
            continue
        override_count += 1

        for field in ("title", "excerpt"):
            if field in override and isinstance(override[field], dict):
                entry[field]["zh"] = override[field].get("zh", entry[field].get("zh"))

        if "body" in override and isinstance(override["body"], list):
            for index, paragraph_override in enumerate(override["body"]):
                if index >= len(entry["body"]) or not isinstance(paragraph_override, dict):
                    continue
                entry["body"][index]["zh"] = paragraph_override.get("zh", entry["body"][index].get("zh"))

        if "knowBeforeYouGo" in override and isinstance(override["knowBeforeYouGo"], list):
            for index, paragraph_override in enumerate(override["knowBeforeYouGo"]):
                if index >= len(entry.get("knowBeforeYouGo", [])) or not isinstance(paragraph_override, dict):
                    continue
                entry["knowBeforeYouGo"][index]["zh"] = paragraph_override.get(
                    "zh",
                    entry["knowBeforeYouGo"][index].get("zh"),
                )

    return entries, override_count


def _finalize_internal_links(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    slug_by_source_url = {
        _normalize_url(entry["sourceUrl"]): entry["slug"]
        for entry in entries
    }

    for entry in entries:
        resolved_slugs: list[str] = []
        unresolved_links: list[dict[str, Any]] = []
        for link in entry.get("relatedLinks", []):
            matching_slug = slug_by_source_url.get(_normalize_url(link["url"]))
            if matching_slug and matching_slug != entry["slug"]:
                resolved_slugs.append(matching_slug)
                continue
            unresolved_links.append(link)

        if resolved_slugs:
            entry["nearbyEntrySlugs"] = list(dict.fromkeys(resolved_slugs))
        entry["relatedLinks"] = unresolved_links

    return entries


def _ensure_unique_slugs(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()

    for entry in entries:
        base_slug = entry["slug"]
        if base_slug not in seen:
            seen.add(base_slug)
            continue

        source_suffix = _slugify(entry.get("sourceId", "")) or base_slug
        candidate = source_suffix if source_suffix not in seen else f"{base_slug}-{entry['kind']}"
        counter = 2
        while candidate in seen:
            candidate = f"{base_slug}-{counter}"
            counter += 1

        entry["slug"] = candidate
        seen.add(candidate)

    return entries


def _diff_entries(previous_entries: list[dict[str, Any]], next_entries: list[dict[str, Any]]) -> dict[str, int]:
    previous_by_slug = {entry["slug"]: entry for entry in previous_entries}
    next_by_slug = {entry["slug"]: entry for entry in next_entries}
    previous_slugs = set(previous_by_slug)
    next_slugs = set(next_by_slug)
    shared_slugs = previous_slugs & next_slugs

    updated = sum(
        1 for slug in shared_slugs
        if json.dumps(previous_by_slug[slug], ensure_ascii=False, sort_keys=True)
        != json.dumps(next_by_slug[slug], ensure_ascii=False, sort_keys=True)
    )

    return {
        "added": len(next_slugs - previous_slugs),
        "updated": updated,
        "removed": len(previous_slugs - next_slugs),
    }


def _parse_entry(page_html: str, page_url: str, kind: str) -> dict[str, Any]:
    if kind == "place":
        return parse_hidden_arizona_place(page_html, page_url)
    if kind == "story":
        return parse_hidden_arizona_story(page_html, page_url)
    if kind == "list":
        return parse_hidden_arizona_list(page_html, page_url)
    if kind == "itinerary":
        return parse_hidden_arizona_itinerary(page_html, page_url)
    raise ValueError(f"Unsupported Atlas entry kind: {kind}")


def sync_entries(
    output_dir: Path | None = None,
    source_url: str = ATLAS_ARIZONA_GUIDE_URL,
    fetcher: Fetcher | None = None,
    translator: Translator | None = None,
) -> dict[str, Any]:
    output_dir = output_dir or default_output_dir()
    fetcher = fetcher or _fetch_pages
    output_dir.mkdir(parents=True, exist_ok=True)

    guide_html = fetcher([source_url]).get(source_url)
    if not guide_html:
        raise RuntimeError(f"Unable to fetch Atlas Obscura guide page: {source_url}")

    targets = discover_guide_targets(guide_html, source_url)

    places_index_url = _normalize_url(ATLAS_ARIZONA_PLACES_URL)
    places_index_html = fetcher([places_index_url]).get(places_index_url)
    if places_index_html:
        page_count = discover_places_index_page_count(places_index_html, places_index_url)
        index_urls = [
            places_index_url if page_number == 1 else f"{places_index_url}?page={page_number}"
            for page_number in range(1, page_count + 1)
        ]
        index_pages = fetcher(index_urls)
        for index_url in index_urls:
            page_html = index_pages.get(index_url)
            if not page_html:
                continue
            targets.extend(discover_places_index_targets(page_html, places_index_url))

    deduped_targets: dict[str, dict[str, str]] = {}
    for target in targets:
        deduped_targets[target["url"]] = target
    targets = list(deduped_targets.values())
    fetched_pages = fetcher([target["url"] for target in targets])

    staged_entries = []
    cache_path = _translation_cache_path(output_dir)
    for target in targets:
        page_html = fetched_pages.get(target["url"])
        if not page_html:
            continue
        entry = _parse_entry(page_html, target["url"], target["kind"])
        staged_entries.append(_translate_entry(entry, cache_path, translator=translator))

    staged_entries = _ensure_unique_slugs(staged_entries)
    staged_entries = _finalize_internal_links(staged_entries)
    previous_entries = _load_json(_staged_entries_path(output_dir), [])
    diff = _diff_entries(previous_entries, staged_entries)

    _write_json(_staged_entries_path(output_dir), staged_entries)
    manifest = {
        "syncedAt": datetime.now(UTC).isoformat(),
        "sourceName": ATLAS_SOURCE_NAME,
        "sourceUrl": source_url,
        "targetCount": len(targets),
        "stagedEntryCount": len(staged_entries),
        "diff": diff,
    }
    _write_json(_manifest_path(output_dir), manifest)

    return {
        "target_count": len(targets),
        "staged_entry_count": len(staged_entries),
        "staged_path": str(_staged_entries_path(output_dir)),
        "diff": diff,
    }


def publish_entries(
    output_dir: Path | None = None,
    generated_path: Path | None = None,
    override_path: Path | None = None,
) -> dict[str, Any]:
    output_dir = output_dir or default_output_dir()
    generated_path = generated_path or default_generated_path()
    override_path = override_path or default_override_path()

    staged_entries = _load_json(_staged_entries_path(output_dir), [])
    if not staged_entries:
        raise RuntimeError("No staged Atlas Obscura entries found. Run sync first.")

    published_entries, override_count = _apply_overrides(staged_entries, override_path)
    _write_json(generated_path, published_entries)

    manifest = _load_json(_manifest_path(output_dir), {})
    manifest["publishedAt"] = datetime.now(UTC).isoformat()
    manifest["publishedEntryCount"] = len(published_entries)
    manifest["generatedPath"] = str(generated_path)
    _write_json(_manifest_path(output_dir), manifest)

    return {
        "published_entry_count": len(published_entries),
        "override_count": override_count,
        "generated_path": str(generated_path),
    }
