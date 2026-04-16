from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

CHINESE_CHARACTER_PATTERN = re.compile(r"[\u4e00-\u9fff]")
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}")
ADDRESS_PATTERN = re.compile(
    r"\d{2,5}\s+[A-Za-z0-9 .#&'/-]+(?:,\s*|\s+)([A-Za-z .'-]+)(?:,\s*|\s+)AZ\s+\d{5}",
    re.IGNORECASE,
)
SERVICE_AREA_PATTERN = re.compile(
    r"\b(Phoenix Metro Area|Greater Phoenix|East Valley|West Valley|North Phoenix|Phoenix|Chandler|Mesa|Tempe|Gilbert|Scottsdale|Glendale|Peoria|Tucson)\b",
    re.IGNORECASE,
)

KNOWN_CITIES = [
    "Phoenix",
    "Chandler",
    "Mesa",
    "Tempe",
    "Gilbert",
    "Scottsdale",
    "Glendale",
    "Peoria",
    "Tucson",
    "Goodyear",
    "Avondale",
    "Surprise",
    "Buckeye",
    "Mesa",
]

GREATER_PHOENIX_CITIES = {
    "Phoenix",
    "Chandler",
    "Mesa",
    "Tempe",
    "Gilbert",
    "Scottsdale",
    "Glendale",
    "Peoria",
    "Goodyear",
    "Avondale",
    "Surprise",
    "Buckeye",
}
GREATER_TUCSON_CITIES = {"Tucson", "Oro Valley", "Marana", "Sahuarita"}


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_whitespace(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def maybe_none(value: str | None) -> str | None:
    cleaned = normalize_whitespace(value)
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered in {"n/a", "na", "none", "null"}:
        return None
    return cleaned


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        cleaned = normalize_whitespace(value)
        if not cleaned:
            continue
        lowered = cleaned.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        output.append(cleaned)
    return output


def contains_chinese_characters(value: str | None) -> bool:
    return bool(value and CHINESE_CHARACTER_PATTERN.search(value))


def extract_emails(value: str | None) -> list[str]:
    if not value:
        return []
    return unique_strings(EMAIL_PATTERN.findall(value))


def extract_phones(value: str | None) -> list[str]:
    if not value:
        return []
    return unique_strings(PHONE_PATTERN.findall(value))


def normalize_phone(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits or None


def format_phone_display(value: str | None) -> str | None:
    digits = normalize_phone(value)
    if not digits:
        return None
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return normalize_whitespace(value)


def normalize_url(value: str | None, base_url: str | None = None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    if base_url:
        value = urljoin(base_url, value)
    parsed = urlparse(value)
    if not parsed.scheme:
        value = f"https://{value.lstrip('/')}"
        parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        return None
    normalized = parsed._replace(fragment="").geturl()
    return normalized.rstrip("/") if parsed.path not in {"", "/"} else normalized


def hostname_for(url: str | None) -> str | None:
    if not url:
        return None
    try:
        return urlparse(url).netloc.lower()
    except ValueError:
        return None


def normalize_website_for_dedupe(url: str | None) -> str | None:
    if not url:
        return None
    normalized = normalize_url(url)
    if not normalized:
        return None
    parsed = urlparse(normalized)
    hostname = parsed.netloc.lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    path = parsed.path.rstrip("/")
    return f"{hostname}{path}"


def city_from_address(address: str | None) -> str | None:
    if not address:
        return None
    for known_city in KNOWN_CITIES:
        if re.search(rf"\b{re.escape(known_city)}\b,?\s+AZ(?:\s+\d{{5}}(?:-\d{{4}})?)?$", address, re.IGNORECASE):
            return known_city
    match = re.search(r"([A-Za-z .'-]+)(?:,\s*|\s+)AZ(?:\s+\d{5}(?:-\d{4})?)?$", address)
    if not match:
        match = ADDRESS_PATTERN.search(address)
    if not match:
        return None
    city = normalize_whitespace(match.group(1))
    for known_city in KNOWN_CITIES:
        if city.lower() == known_city.lower():
            return known_city
    return city


def city_from_text(text: str | None) -> str | None:
    if not text:
        return None
    for city in KNOWN_CITIES:
        if re.search(rf"\b{re.escape(city)}\b", text, re.IGNORECASE):
            return city
    return None


def extract_service_area(text: str | None) -> str | None:
    if not text:
        return None
    match = SERVICE_AREA_PATTERN.search(text)
    if not match:
        return None
    return normalize_whitespace(match.group(1))


def region_for_city(city: str | None) -> str:
    if not city:
        return "Arizona"
    if city in GREATER_PHOENIX_CITIES:
        return "Greater Phoenix"
    if city in GREATER_TUCSON_CITIES:
        return "Greater Tucson"
    return "Arizona"


def split_keywords(value: str | None) -> list[str]:
    if not value:
        return []
    return unique_strings(re.split(r"[;,|]", value))


def shorten_text(value: str | None, max_length: int = 180) -> str:
    cleaned = normalize_whitespace(value)
    if len(cleaned) <= max_length:
        return cleaned
    return cleaned[: max_length - 1].rstrip() + "…"


def first_sentence(value: str | None, max_length: int = 220) -> str:
    cleaned = normalize_whitespace(value)
    if not cleaned:
        return ""
    sentence = re.split(r"(?<=[.!?])\s+", cleaned, maxsplit=1)[0]
    return shorten_text(sentence, max_length=max_length)


def extract_json_ld_entities(soup: Any) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text()
        if not raw or not raw.strip():
            continue
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            continue
        entities.extend(flatten_json_ld(parsed))
    return entities


def flatten_json_ld(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        output: list[dict[str, Any]] = []
        for item in payload:
            output.extend(flatten_json_ld(item))
        return output
    if not isinstance(payload, dict):
        return []
    if "@graph" in payload and isinstance(payload["@graph"], list):
        return flatten_json_ld(payload["@graph"])
    return [payload]


def best_json_ld_entity(entities: list[dict[str, Any]]) -> dict[str, Any] | None:
    preferred_types = [
        "LocalBusiness",
        "Organization",
        "Place",
        "School",
        "EducationalOrganization",
        "Person",
    ]
    best_entity: dict[str, Any] | None = None
    best_score = -1
    for entity in entities:
        raw_type = entity.get("@type")
        types = raw_type if isinstance(raw_type, list) else [raw_type]
        score = 0
        for index, preferred_type in enumerate(preferred_types):
            if preferred_type in types:
                score = max(score, 100 - index)
        if entity.get("name"):
            score += 10
        if entity.get("url"):
            score += 5
        if score > best_score:
            best_score = score
            best_entity = entity
    return best_entity


def is_placeholder_domain(url: str | None) -> bool:
    hostname = hostname_for(url)
    if not hostname:
        return False
    return hostname == "example.com" or hostname.endswith(".example") or "placeholder" in hostname


def is_placeholder_phone(phone: str | None) -> bool:
    digits = normalize_phone(phone)
    return bool(digits and "555" in digits)
