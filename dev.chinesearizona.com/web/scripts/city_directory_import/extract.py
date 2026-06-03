from __future__ import annotations

import hashlib
import re
from typing import Any
from urllib.parse import unquote, urlparse

from bs4 import BeautifulSoup

from scripts.directory_scrape.taxonomy import detect_chinese_signals, infer_languages
from scripts.directory_scrape.utils import (
    best_json_ld_entity,
    extract_emails,
    extract_json_ld_entities,
    extract_phones,
    first_sentence,
    hostname_for,
    maybe_none,
    normalize_phone,
    normalize_url,
    normalize_website_for_dedupe,
    normalize_whitespace,
    shorten_text,
    unique_strings,
)

from .models import CityDirectoryCandidate, CityDirectorySiteConfig, CityDirectorySource


US_STATE_CODES = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "district of columbia": "DC",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
}


def _meta_content(soup: BeautifulSoup, key: str) -> str:
    for attrs in ({"property": key}, {"name": key}):
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return normalize_whitespace(tag.get("content"))
    return ""


def _visible_text(soup: BeautifulSoup) -> str:
    return normalize_whitespace(soup.get_text(" ", strip=True))


def _jsonld_address_value(address: dict[str, Any], key: str) -> str | None:
    value = address.get(key)
    if isinstance(value, list):
        value = next((item for item in value if item), None)
    if value is None:
        return None
    return maybe_none(str(value))


def _jsonld_address_parts(entity: dict[str, Any] | None) -> tuple[str | None, str | None, str | None]:
    if not entity:
        return None, None, None
    address = entity.get("address")
    if isinstance(address, list):
        address = next((item for item in address if isinstance(item, dict)), None)
    if not isinstance(address, dict):
        return None, None, None
    city = _jsonld_address_value(address, "addressLocality")
    state = _jsonld_address_value(address, "addressRegion")
    parts = [
        _jsonld_address_value(address, "streetAddress"),
        city,
        state,
        _jsonld_address_value(address, "postalCode"),
    ]
    return maybe_none(", ".join(str(part) for part in parts if part)), city, state


def _jsonld_website(entity: dict[str, Any] | None, page_url: str) -> str | None:
    if not entity:
        return normalize_url(page_url)
    raw_url = entity.get("url")
    if isinstance(raw_url, str):
        parsed = urlparse(raw_url)
        if not parsed.scheme and "." in raw_url.split("/", 1)[0]:
            return normalize_url(raw_url)
        return normalize_url(raw_url, page_url)
    return normalize_url(page_url)


def _best_name(soup: BeautifulSoup, entity: dict[str, Any] | None, source: CityDirectorySource) -> tuple[str, str]:
    if source.nameHint:
        return source.nameHint, "name from configured city source"
    if entity and entity.get("name"):
        return normalize_whitespace(str(entity["name"])), "name from page JSON-LD"
    title = _meta_content(soup, "og:title")
    if not title and soup.title:
        title = normalize_whitespace(soup.title.get_text())
    for separator in ["|", " - ", "–"]:
        if separator in title:
            title = title.split(separator, 1)[0]
            break
    return normalize_whitespace(title), "name from page title"


def _best_phone(soup: BeautifulSoup, text: str, entity: dict[str, Any] | None) -> str | None:
    if entity:
        telephone = entity.get("telephone")
        if isinstance(telephone, list):
            for item in telephone:
                phone = maybe_none(str(item))
                if phone and normalize_phone(phone):
                    return phone
        if isinstance(telephone, str) and normalize_phone(telephone):
            return telephone
    for link in soup.select("a[href^='tel:']"):
        phone = maybe_none(unquote(link.get("href", "").replace("tel:", "")))
        if phone and normalize_phone(phone):
            return phone
    phones = extract_phones(text)
    return phones[0] if phones else None


def _best_email(soup: BeautifulSoup, text: str, website: str | None) -> str | None:
    allowed_host = (hostname_for(website) or "").removeprefix("www.")
    trusted_public_domains = {"gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com"}
    candidates: list[str] = []
    for link in soup.select("a[href^='mailto:']"):
        email = maybe_none(link.get("href", "").replace("mailto:", ""))
        if email:
            candidates.append(email)
    candidates.extend(extract_emails(text))
    for email in unique_strings(candidates):
        domain = email.split("@")[-1].lower()
        if domain in trusted_public_domains:
            return email
        if allowed_host and (domain == allowed_host or domain.endswith(f".{allowed_host}")):
            return email
    return None


def _best_description(soup: BeautifulSoup, entity: dict[str, Any] | None) -> tuple[str, str]:
    description = ""
    if entity and entity.get("description"):
        description = normalize_whitespace(str(entity["description"]))
    if not description:
        description = _meta_content(soup, "description") or _meta_content(soup, "og:description")
    if not description:
        paragraphs = [normalize_whitespace(node.get_text(" ", strip=True)) for node in soup.find_all(["p", "h1", "h2", "h3"])[:8]]
        description = " ".join(part for part in paragraphs if part)
    description = normalize_whitespace(description)
    return first_sentence(description), description


def _state_from_address(address: str | None) -> str | None:
    if not address:
        return None
    match = re.search(r"\b([A-Z]{2}),?\s+\d{5}(?:-\d{4})?\b", address)
    if match:
        return match.group(1)
    match = re.search(r"(?:,\s*|\s)([A-Z]{2})(?:,\s*|$)", address)
    return match.group(1) if match else None


def _state_code_from_region(region: str | None) -> str | None:
    region = normalize_whitespace(region)
    if not region:
        return None
    if re.fullmatch(r"[A-Za-z]{2}", region):
        return region.upper()
    return US_STATE_CODES.get(region.casefold())


def _state_aliases(state_code: str) -> list[str]:
    aliases = [state_code]
    aliases.extend(name for name, code in US_STATE_CODES.items() if code == state_code)
    return aliases


def _city_from_text(text: str | None, allowed_cities: list[str]) -> str | None:
    if not text:
        return None
    for city in sorted(allowed_cities, key=len, reverse=True):
        if re.search(rf"\b{re.escape(city)}\b", text, re.IGNORECASE):
            return city
    return None


def _canonical_allowed_city(city: str | None, allowed_cities: list[str]) -> str | None:
    city = normalize_whitespace(city)
    if not city:
        return None
    for allowed_city in allowed_cities:
        if city.casefold() == allowed_city.casefold():
            return allowed_city
    return city


def _text_address_parts(
    text: str | None,
    allowed_cities: list[str],
    state_code: str,
) -> tuple[str | None, str | None, str | None]:
    if not text or not allowed_cities:
        return None, None, None
    city_pattern = "|".join(re.escape(city) for city in sorted(allowed_cities, key=len, reverse=True))
    state_pattern = "|".join(re.escape(alias) for alias in _state_aliases(state_code))
    street_suffixes = (
        "Ave|Avenue|Blvd|Boulevard|Broadway|Cir|Circle|Ct|Court|Dr|Drive|Hwy|Highway|Ln|Lane|"
        "Pkwy|Parkway|Pl|Place|Rd|Road|St|Street|Way"
    )
    address_pattern = re.compile(
        rf"(?<![-\d])\b(?P<street>\d{{1,6}}\s+"
        rf"(?:[A-Za-z0-9.#&'’/-]+\s+){{0,8}}"
        rf"(?:{street_suffixes})\.?"
        rf"(?:\s*,?\s*(?:#|Ste|Suite|Unit)\s*[A-Za-z0-9-]+)?)"
        rf"\s*,?\s+(?P<city>{city_pattern})"
        rf"\s*,?\s+(?P<state>{state_pattern})"
        rf"\s+(?P<postal>\d{{5}}(?:-\d{{4}})?)\b",
        re.IGNORECASE,
    )
    match = address_pattern.search(text)
    if not match:
        return None, None, None
    city = _canonical_allowed_city(match.group("city"), allowed_cities)
    state = _state_code_from_region(match.group("state"))
    street = normalize_whitespace(match.group("street").replace(" ,", ","))
    postal_code = match.group("postal")
    return f"{street}, {city}, {state} {postal_code}", city, state


def _candidate_dedupe_keys(name: str, city: str, phone: str | None, website: str | None) -> list[str]:
    keys: list[str] = []
    website_key = normalize_website_for_dedupe(website)
    if website_key:
        keys.append(f"website:{website_key}")
    phone_key = normalize_phone(phone)
    if phone_key:
        keys.append(f"phone:{phone_key}")
    name_city = normalize_whitespace(f"{name} {city}").casefold()
    if name_city:
        keys.append(f"name_city:{name_city}")
    return unique_strings(keys)


def _candidate_id(site_key: str, duplicate_key: str) -> str:
    digest = hashlib.sha1(f"{site_key}:{duplicate_key}".encode("utf-8")).hexdigest()[:12]
    return f"{site_key}-candidate-{digest}"


def _confidence_level(score: int) -> str:
    if score >= 80:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def _score_candidate(
    *,
    name: str,
    category_slug: str,
    city: str,
    address: str | None,
    state_code: str | None,
    phone: str | None,
    website: str | None,
    source: CityDirectorySource,
    chinese_signal_count: int,
) -> tuple[int, list[str]]:
    score = 0
    notes: list[str] = []
    if name:
        score += 20
        notes.append("has name")
    if category_slug:
        score += 10
        notes.append("has mapped category")
    if source.url:
        score += 10
        notes.append("has source URL")
    if city:
        score += 10
        notes.append("has allowed city")
    if address and state_code:
        score += 15
        notes.append("has address in selected state")
    elif source.serviceAreaText:
        score += 8
        notes.append("has configured service area")
    if phone:
        score += 10
        notes.append("has public phone")
    if website:
        score += 10
        notes.append("has website")
    if chinese_signal_count:
        score += 10
        notes.append("has Chinese-community signal")
    if source.sourceType in {"official_site", "open_data_seed"}:
        score += 5
        notes.append("source is configured public evidence")
    return min(score, 100), notes


def _seed_text(seed_data: dict[str, Any], key: str) -> str | None:
    value = seed_data.get(key)
    if value is None:
        return None
    return maybe_none(str(value))


def _seed_list(seed_data: dict[str, Any], key: str) -> list[str]:
    value = seed_data.get(key)
    if not value:
        return []
    if isinstance(value, list):
        return unique_strings([str(item) for item in value if item])
    return [str(value)]


def candidate_from_source_seed(source: CityDirectorySource, site: CityDirectorySiteConfig, note: str) -> CityDirectoryCandidate:
    seed_data = source.seedData
    name = _seed_text(seed_data, "name") or source.nameHint or ""
    city = _canonical_allowed_city(_seed_text(seed_data, "city") or source.city, site.allowedCities) or source.city
    address = _seed_text(seed_data, "address")
    address_state = _state_from_address(address) or _state_code_from_region(_seed_text(seed_data, "stateCode"))
    phone = _seed_text(seed_data, "phone")
    seed_website = _seed_text(seed_data, "website")
    website = normalize_url(seed_website) if seed_website else None
    if not website and source.sourceType != "open_data_seed":
        website = source.url
    email = _seed_text(seed_data, "email")
    service_area = _seed_text(seed_data, "serviceAreaText") or source.serviceAreaText
    short_description = _seed_text(seed_data, "shortDescription") or f"{name} in {city}."
    description = _seed_text(seed_data, "description") or short_description
    services = _seed_list(seed_data, "services")
    signal_text = " ".join(
        [
            name,
            source.sourceCategory.replace("_", " "),
            source.categorySlug.replace("-", " "),
            short_description,
            description,
            source.notes,
        ]
    )
    chinese_signals = detect_chinese_signals(signal_text, website or source.url)
    languages = _seed_list(seed_data, "languages") or infer_languages(signal_text)
    source_urls = unique_strings([url for url in [source.url, website, *_seed_list(seed_data, "sourceUrls")] if url])
    source_notes = unique_strings([note, source.notes, *_seed_list(seed_data, "sourceNotes")])

    city_mismatch = city not in site.allowedCities
    state_mismatch = bool(address_state and address_state != site.stateCode)
    dedupe_keys = _candidate_dedupe_keys(name, city, phone, website)
    duplicate_key = dedupe_keys[0] if dedupe_keys else f"source:{source.id}"
    score, notes = _score_candidate(
        name=name,
        category_slug=source.categorySlug,
        city=city if not city_mismatch else "",
        address=address,
        state_code=address_state if not state_mismatch else None,
        phone=phone,
        website=website,
        source=source,
        chinese_signal_count=len(chinese_signals),
    )
    if city_mismatch:
        notes.append(f"blocked: city '{city}' is outside {site.siteKey} allowed cities")
    if state_mismatch:
        notes.append(f"blocked: address state '{address_state}' does not match {site.stateCode}")
    review_status = "blocked_city_mismatch" if city_mismatch or state_mismatch else "needs_review"
    if review_status == "needs_review" and score < 60:
        review_status = "needs_review_low_confidence"
    return CityDirectoryCandidate(
        candidateId=_candidate_id(site.siteKey, duplicate_key),
        siteKey=site.siteKey,
        name=name,
        sourceCategory=source.sourceCategory,
        categorySlug=source.categorySlug,
        city=city,
        region=site.regionName,
        address=address,
        serviceAreaText=None if address else service_area,
        phone=phone,
        website=website,
        email=email,
        languages=languages,
        shortDescription=shorten_text(short_description),
        description=description,
        services=services,
        sourceUrls=source_urls,
        sourceIds=[source.id],
        confidenceScore=score,
        confidenceLevel=_confidence_level(score),
        confidenceNotes=notes,
        sourceNotes=source_notes,
        duplicateKey=duplicate_key,
        dedupeKeys=dedupe_keys or [duplicate_key],
        reviewStatus=review_status,
    )


def candidate_from_source_html(
    page_html: str,
    page_url: str,
    source: CityDirectorySource,
    site: CityDirectorySiteConfig,
) -> CityDirectoryCandidate:
    soup = BeautifulSoup(page_html, "lxml")
    text = _visible_text(soup)
    entity = best_json_ld_entity(extract_json_ld_entities(soup))
    name, name_note = _best_name(soup, entity, source)
    short_description, description = _best_description(soup, entity)
    address, address_city, address_state = _jsonld_address_parts(entity)
    if not address:
        address, address_city, address_state = _text_address_parts(text, site.allowedCities, site.stateCode)
    city = (
        _canonical_allowed_city(address_city, site.allowedCities)
        or _city_from_text(address, site.allowedCities)
        or _city_from_text(text[:3000], site.allowedCities)
        or source.city
    )
    state_code = _state_from_address(address) or _state_code_from_region(address_state)
    website = _jsonld_website(entity, page_url)
    phone = _best_phone(soup, text, entity)
    email = _best_email(soup, text, website)
    signal_text = " ".join([name, source.sourceCategory.replace("_", " "), short_description, description, text[:4000]])
    chinese_signals = detect_chinese_signals(signal_text, page_url)
    languages = infer_languages(signal_text)
    source_notes = [
        f"fetched configured {source.sourceType} source {source.id}",
        name_note,
        source.notes,
    ]

    city_mismatch = city not in site.allowedCities
    state_mismatch = bool(state_code and state_code != site.stateCode)
    score, confidence_notes = _score_candidate(
        name=name,
        category_slug=source.categorySlug,
        city=city if not city_mismatch else "",
        address=address,
        state_code=state_code if not state_mismatch else None,
        phone=phone,
        website=website,
        source=source,
        chinese_signal_count=len(chinese_signals),
    )
    if city_mismatch:
        confidence_notes.append(f"blocked: city '{city}' is outside {site.siteKey} allowed cities")
    if state_mismatch:
        confidence_notes.append(f"blocked: address state '{state_code}' does not match {site.stateCode}")

    review_status = "blocked_city_mismatch" if city_mismatch or state_mismatch else "needs_review"
    if review_status == "needs_review" and score < 60:
        review_status = "needs_review_low_confidence"

    dedupe_keys = _candidate_dedupe_keys(name, city, phone, website)
    duplicate_key = dedupe_keys[0] if dedupe_keys else f"source:{source.id}"
    return CityDirectoryCandidate(
        candidateId=_candidate_id(site.siteKey, duplicate_key),
        siteKey=site.siteKey,
        name=name,
        sourceCategory=source.sourceCategory,
        categorySlug=source.categorySlug,
        city=city,
        region=site.regionName,
        address=address,
        serviceAreaText=None if address else source.serviceAreaText,
        phone=phone,
        website=website,
        email=email,
        languages=languages,
        shortDescription=shorten_text(short_description),
        description=description,
        services=[],
        sourceUrls=[page_url],
        sourceIds=[source.id],
        confidenceScore=score,
        confidenceLevel=_confidence_level(score),
        confidenceNotes=confidence_notes,
        sourceNotes=source_notes,
        duplicateKey=duplicate_key,
        dedupeKeys=dedupe_keys or [duplicate_key],
        reviewStatus=review_status,
    )
