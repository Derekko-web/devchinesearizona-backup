from __future__ import annotations

import json
import re
from typing import Any

from bs4 import BeautifulSoup
from crawl4ai import JsonCssExtractionStrategy

from .image_utils import extract_image_assets_from_soup
from .models import ScrapedBusinessCandidate
from .taxonomy import detect_chinese_signals, infer_category_slug, infer_languages, mark_candidate
from .utils import (
    best_json_ld_entity,
    city_from_address,
    city_from_text,
    contains_chinese_characters,
    extract_emails,
    extract_json_ld_entities,
    extract_phones,
    extract_service_area,
    first_sentence,
    hostname_for,
    maybe_none,
    normalize_url,
    normalize_whitespace,
    region_for_city,
    shorten_text,
    split_keywords,
    unique_strings,
)

AANHPI_ROW_SCHEMA = {
    "name": "az_aanhpi_rows",
    "baseSelector": "tr",
    "fields": [
        {"name": "name_en", "selector": "td:nth-child(1)", "type": "text"},
        {"name": "website", "selector": "td:nth-child(1) a", "type": "attribute", "attribute": "href"},
        {"name": "phone", "selector": "td:nth-child(2)", "type": "text"},
        {"name": "address", "selector": "td:nth-child(3)", "type": "text"},
    ],
}

HERITAGE_TILE_SCHEMA = {
    "name": "heritage_tiles",
    "baseSelector": ".dir1-tile",
    "fields": [
        {"name": "name_en", "selector": ".dir1-tile__title_link", "type": "text"},
        {"name": "detail_url", "selector": ".dir1-tile__title_link", "type": "attribute", "attribute": "href"},
    ],
}


def _meta_content(soup: BeautifulSoup, key: str) -> str:
    for attrs in ({"property": key}, {"name": key}):
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return normalize_whitespace(tag.get("content"))
    return ""


def _jsonld_address(entity: dict[str, Any]) -> str | None:
    address = entity.get("address")
    if not isinstance(address, dict):
        return None
    parts = [
        address.get("streetAddress"),
        address.get("addressLocality"),
        address.get("addressRegion"),
        address.get("postalCode"),
    ]
    return maybe_none(", ".join(part for part in parts if part))


def _jsonld_coordinates(entity: dict[str, Any]) -> dict[str, float] | None:
    geo = entity.get("geo")
    if not isinstance(geo, dict):
        return None
    try:
        return {"lat": float(geo["latitude"]), "lng": float(geo["longitude"])}
    except (KeyError, TypeError, ValueError):
        return None


def _jsonld_hours(entity: dict[str, Any]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    hours = entity.get("openingHoursSpecification")
    if not isinstance(hours, list):
        return items
    for entry in hours:
        if not isinstance(entry, dict):
            continue
        days = entry.get("dayOfWeek")
        opens = entry.get("opens")
        closes = entry.get("closes")
        if not opens and not closes:
            continue
        if isinstance(days, list):
            label = ", ".join(str(day).split("/")[-1] for day in days)
        else:
            label = str(days).split("/")[-1] if days else "Hours"
        value = " - ".join(part for part in [opens, closes] if part)
        items.append({"label": label, "value": value})
    return items


def _visible_text(soup: BeautifulSoup) -> str:
    return normalize_whitespace(soup.get_text(" ", strip=True))


def _best_name(soup: BeautifulSoup, entity: dict[str, Any] | None, seed: dict[str, Any] | None = None) -> str:
    if seed and seed.get("name_en"):
        return seed["name_en"]
    if entity and entity.get("name"):
        return normalize_whitespace(str(entity["name"]))
    site_name = _meta_content(soup, "og:site_name")
    if site_name:
        return site_name.split("|", 1)[0].strip()
    title = _meta_content(soup, "og:title") or normalize_whitespace(soup.title.get_text()) if soup.title else ""
    for separator in ["|", "–", " - "]:
        if separator in title:
            title = title.split(separator, 1)[0]
            break
    return normalize_whitespace(title)


def _best_name_zh(soup: BeautifulSoup, text: str) -> str | None:
    for selector in ["h1", "h2", "[data-aid='HEADER_LOGO_TEXT_RENDERED']"]:
        tag = soup.select_one(selector)
        if tag:
            candidate = normalize_whitespace(tag.get_text(" ", strip=True))
            if contains_chinese_characters(candidate) and 2 <= len(candidate) <= 80:
                return candidate
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if contains_chinese_characters(line) and 2 <= len(line) <= 80:
            return normalize_whitespace(line)
    return None


def _best_description(soup: BeautifulSoup, entity: dict[str, Any] | None) -> tuple[str, str]:
    description = ""
    if entity and entity.get("description"):
        description = normalize_whitespace(str(entity["description"]))
    if not description:
        description = _meta_content(soup, "description") or _meta_content(soup, "og:description")
    if not description:
        paragraphs = [normalize_whitespace(node.get_text(" ", strip=True)) for node in soup.find_all(["p", "h2", "h3"])[:8]]
        description = " ".join(part for part in paragraphs if part)
    description = normalize_whitespace(description)
    return first_sentence(description), description


def _best_service_area(text: str, city: str | None, seed: dict[str, Any] | None = None) -> str | None:
    if seed and seed.get("serviceAreaText"):
        return seed["serviceAreaText"]
    if city:
        return f"{city}, Arizona"
    extracted = extract_service_area(text)
    if extracted:
        return extracted
    return None


def _best_contact_email(soup: BeautifulSoup, text: str, allowed_host: str | None = None) -> str | None:
    allowed_host = (allowed_host or "").removeprefix("www.")
    trusted_public_domains = {"gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com"}
    for link in soup.select("a[href^='mailto:']"):
        email = maybe_none(link.get("href", "").replace("mailto:", ""))
        if not email:
            continue
        domain = email.split("@")[-1].lower()
        if domain in trusted_public_domains:
            return email
        if allowed_host and (domain == allowed_host or domain.endswith(f".{allowed_host}")):
            return email
    emails = extract_emails(text)
    for email in emails:
        domain = email.split("@")[-1].lower()
        if domain in trusted_public_domains:
            return email
        if allowed_host and (domain == allowed_host or domain.endswith(f".{allowed_host}")):
            return email
    return None


def _best_contact_phone(soup: BeautifulSoup, text: str, entity: dict[str, Any] | None = None) -> str | None:
    if entity:
        telephone = entity.get("telephone")
        if isinstance(telephone, list):
            for item in telephone:
                phone = maybe_none(str(item))
                if phone and len(re.sub(r"\D", "", phone)) >= 10:
                    return phone
        if isinstance(telephone, str):
            phone = maybe_none(telephone)
            if phone and len(re.sub(r"\D", "", phone)) >= 10:
                return phone
    for link in soup.select("a[href^='tel:']"):
        phone = maybe_none(link.get("href", "").replace("tel:", ""))
        if phone and len(re.sub(r"\D", "", phone)) >= 10:
            return phone
    phones = extract_phones(text)
    return phones[0] if phones else None


def _addresses_from_text(text: str) -> list[str]:
    return unique_strings(
        normalize_whitespace(match.group(0))
        for match in re.finditer(r"\d{2,5}\s+[A-Za-z0-9 .#&'/-]+(?:,\s*|\s+)[A-Za-z .'-]+(?:,\s*|\s+)AZ\s+\d{5}", text)
    )


def parse_azaanhpi_directory(page_html: str, source_url: str) -> list[ScrapedBusinessCandidate]:
    soup = BeautifulSoup(page_html, "lxml")
    strategy = JsonCssExtractionStrategy(schema=AANHPI_ROW_SCHEMA)
    candidates: list[ScrapedBusinessCandidate] = []
    for table in soup.select("table"):
        heading_tag = table.find_previous(["h1", "h2", "h3", "p"])
        heading = normalize_whitespace(heading_tag.get_text(" ", strip=True) if heading_tag else "")
        if heading.lower() not in {"chinese", "taiwanese"}:
            continue
        rows = strategy.run(source_url, [str(table)])
        for row in rows:
            name_en = maybe_none(row.get("name_en"))
            phone = maybe_none(row.get("phone"))
            address = maybe_none(row.get("address"))
            city = city_from_address(address)
            if not name_en or not city:
                continue
            website = normalize_url(row.get("website"), source_url)
            candidate = ScrapedBusinessCandidate(
                name_en=name_en,
                categorySlug="dining",
                city=city,
                region=region_for_city(city),
                address=address,
                phone=phone,
                website=website,
                officialSiteUrl=website,
                shortDescription=f"{heading} restaurant in {city}, Arizona.",
                description=(
                    f"{name_en} is a {heading.lower()} restaurant in {city}, Arizona. "
                    f"Public contact phone: {phone or 'not listed'}."
                ),
                searchAliases=[name_en, heading, city],
                sourceUrls=[source_url],
                chineseSignal=[
                    {
                        "kind": "directory_category",
                        "value": heading,
                        "sourceUrl": source_url,
                    }
                ],
            )
            candidates.append(mark_candidate(candidate))
    return candidates


def parse_heritage_collection(page_html: str, source_url: str) -> list[dict[str, str]]:
    strategy = JsonCssExtractionStrategy(schema=HERITAGE_TILE_SCHEMA)
    items = strategy.run(source_url, [page_html])
    detail_targets: list[dict[str, str]] = []
    for item in items:
        name_en = maybe_none(item.get("name_en"))
        detail_url = normalize_url(item.get("detail_url"), source_url)
        if not name_en or not detail_url:
            continue
        detail_targets.append({"name_en": name_en, "detail_url": detail_url, "source_url": source_url})
    return detail_targets


def parse_heritage_detail(page_html: str, source_url: str, source_collection_url: str | None = None) -> ScrapedBusinessCandidate | None:
    soup = BeautifulSoup(page_html, "lxml")
    entities = extract_json_ld_entities(soup)
    entity = best_json_ld_entity(entities)
    if not entity:
        return None
    name_en = maybe_none(str(entity.get("name", "")))
    if not name_en:
        return None
    description = normalize_whitespace(str(entity.get("description", "")))
    address = _jsonld_address(entity)
    city = city_from_address(address) or city_from_text(description) or city_from_text(page_html)
    if not city and isinstance(entity.get("areaServed"), dict):
        city = maybe_none(str(entity["areaServed"].get("name", "")))
    city = city or "Phoenix"
    website = normalize_url(entity.get("url"), source_url)
    keywords = split_keywords(entity.get("keywords"))
    category_slug = infer_category_slug(" ".join(keywords), description, source_url)
    hero_image, gallery = extract_image_assets_from_soup(
        soup,
        source_url,
        entity=entity,
        business_name=name_en,
        page_context=source_url,
    )
    candidate = ScrapedBusinessCandidate(
        name_en=name_en,
        categorySlug=category_slug or "legal-finance",
        city=city,
        region=region_for_city(city),
        address=address,
        serviceAreaText=maybe_none(str(entity.get("areaServed", {}).get("name", ""))) if isinstance(entity.get("areaServed"), dict) else None,
        website=website,
        heroImage=hero_image,
        gallery=gallery,
        officialSiteUrl=website,
        coordinates=_jsonld_coordinates(entity),
        shortDescription=first_sentence(description),
        description=description,
        searchAliases=keywords,
        sourceUrls=[url for url in [source_collection_url, source_url] if url],
        chineseSignal=detect_chinese_signals(" ".join(keywords) or "Chinese", source_url, kind_prefix="directory"),
    )
    return mark_candidate(candidate)


def parse_official_site(page_html: str, page_url: str, seed: dict[str, Any] | None = None) -> ScrapedBusinessCandidate | None:
    soup = BeautifulSoup(page_html, "lxml")
    text = _visible_text(soup)
    entity = best_json_ld_entity(extract_json_ld_entities(soup))
    name_en = _best_name(soup, entity, seed)
    if not name_en:
        return None
    short_description, description = _best_description(soup, entity)
    address = _jsonld_address(entity) if entity else None
    discovered_addresses = _addresses_from_text(text)
    if not address and not (seed and seed.get("categorySlug") == "real-estate" and len(discovered_addresses) > 1):
        address = discovered_addresses[0] if discovered_addresses else None
    city = city_from_address(address)
    if not city and entity and isinstance(entity.get("address"), dict):
        city = maybe_none(str(entity["address"].get("addressLocality", "")))
    if not city:
        city = maybe_none(_meta_content(soup, "geo.placename")) or seed.get("city") if seed else None
    if not city:
        city = city_from_text(" ".join([name_en, short_description, description, text]))
    city = city or "Phoenix"
    website = normalize_url((entity or {}).get("url") if entity else None) or normalize_url(_meta_content(soup, "canonical"), page_url) or normalize_url(page_url)
    allowed_email_host = hostname_for(website)
    service_area = _best_service_area(text, city, seed)
    hero_image, gallery = extract_image_assets_from_soup(
        soup,
        page_url,
        entity=entity,
        business_name=name_en,
        page_context=page_url,
    )
    candidate = ScrapedBusinessCandidate(
        name_en=name_en,
        name_zh=_best_name_zh(soup, text),
        categorySlug=(seed.get("categorySlug") if seed else "") or infer_category_slug(name_en, short_description, description, text),
        city=city,
        region=region_for_city(city),
        address=address,
        serviceAreaText=None if address else service_area,
        phone=_best_contact_phone(soup, text, entity),
        email=_best_contact_email(soup, text, allowed_host=allowed_email_host),
        website=website,
        heroImage=hero_image,
        gallery=gallery,
        officialSiteUrl=website,
        hours=_jsonld_hours(entity) if entity else [],
        coordinates=_jsonld_coordinates(entity) if entity else None,
        languages=infer_languages(" ".join([name_en, short_description, description, text[:2500]])),
        shortDescription=short_description,
        description=description,
        services=split_keywords(_meta_content(soup, "keywords"))[:6],
        searchAliases=[
            _meta_content(soup, "og:title"),
            _meta_content(soup, "og:site_name"),
            seed.get("name_en", "") if seed else "",
            service_area or "",
        ],
        sourceUrls=[page_url],
        chineseSignal=detect_chinese_signals(" ".join([name_en, short_description, description, text[:4000]]), page_url),
    )
    return mark_candidate(candidate)
