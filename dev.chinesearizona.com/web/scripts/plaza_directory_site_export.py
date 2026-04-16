from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
PYTHON_PACKAGES = ROOT / ".python-packages"
if PYTHON_PACKAGES.exists() and str(PYTHON_PACKAGES) not in sys.path:
    sys.path.insert(0, str(PYTHON_PACKAGES))

from scripts.directory_scrape.image_overrides import (
    default_image_audit_path,
    default_image_override_path,
    generate_directory_image_overrides,
)

SCRAPED_FIXTURE_PATH = ROOT / "src" / "data" / "generated-scraped-businesses.json"
PLAZA_SCRAPE_PATH = ROOT / "data" / "plaza-directories" / "asian-plaza-directory-scrape.json"
PLAZA_OUTPUT_PATH = ROOT / "src" / "data" / "generated-plaza-businesses.json"
COMBINED_OUTPUT_PATH = ROOT / "src" / "data" / "generated-directory-businesses.json"

NAME_ALIASES = {
    "99 ranch": "99 ranch market",
    "bbq chiecken": "bbq chicken",
    "best of hong kong dining": "best hong kong dining",
    "best hong kong dining restaurant": "best hong kong dining",
    "daiso": "daiso japan",
    "fedex": "fedex office",
    "happy bao": "happy baos",
    "happy bao s": "happy baos",
    "hodori restaurant": "hodori",
    "hong kong cafe": "hong kong cafe",
    "magic noodle house": "china magic noodle house",
    "mekong palace restaurant": "mekong palace",
    "mekong sandwiches": "mekong vietnamese sandwiches",
    "sizzling house": "sizzling and ramen",
    "somi somi": "somisomi",
    "tara thai 2go": "tara thai",
    "tea snow lounge": "tea snow",
}

REGION_BY_CITY = {
    "Chandler": "Greater Phoenix",
    "Glendale": "Greater Phoenix",
    "Mesa": "Greater Phoenix",
    "Peoria": "Greater Phoenix",
    "Phoenix": "Greater Phoenix",
    "Tempe": "Greater Phoenix",
    "Tucson": "Greater Tucson",
}

CATEGORY_BY_RAW_KIND = {
    "bakery": "dining",
    "bar": "dining",
    "bubble_tea": "dining",
    "cafe": "dining",
    "confectionery": "dining",
    "dessert": "dining",
    "fast_food": "dining",
    "ice_cream": "dining",
    "restaurant": "dining",
    "supermarket": "dining",
    "beauty": "beauty-wellness",
    "hairdresser": "beauty-wellness",
    "massage": "beauty-wellness",
    "clinic": "medical",
    "chemist": "medical",
    "dentist": "medical",
    "doctors": "medical",
    "optician": "medical",
    "pharmacy": "medical",
    "insurance": "legal-finance",
    "bank": "legal-finance",
    "money_lender": "legal-finance",
    "tax_advisor": "legal-finance",
    "martial_arts": "education",
    "copyshop": "local-services",
    "post_office": "local-services",
    "interior_decoration": "home-services",
    "doityourself": "home-services",
    "tyres": "home-services",
    "bookstore": "shopping",
    "clothes": "shopping",
    "collector": "shopping",
    "convenience": "shopping",
    "department_store": "shopping",
    "discount_store": "shopping",
    "e-cigarette": "shopping",
    "electronics": "shopping",
    "fashion_accessories": "shopping",
    "florist": "shopping",
    "general": "shopping",
    "gift": "shopping",
    "jewelry": "shopping",
    "pottery": "shopping",
    "shoes": "shopping",
    "toys": "shopping",
    "variety_store": "shopping",
    "anime": "shopping",
}

NAME_CATEGORY_OVERRIDES = {
    "bafang dumpling": "dining",
    "bbq chicken": "dining",
    "beijing acupuncture and health center": "medical",
    "bun bo hue": "dining",
    "claw zone": "shopping",
    "cloud studio": "shopping",
    "comfort foot and body massage": "beauty-wellness",
    "daruma": "dining",
    "dong feng seafood city": "dining",
    "fat miilk coffee": "dining",
    "friggin jerk beef jerky": "shopping",
    "fu jing funding llc": "legal-finance",
    "haidilao": "dining",
    "heads up spa": "beauty-wellness",
    "hong kong cafe": "dining",
    "jax and ko international": "shopping",
    "jina s salon": "beauty-wellness",
    "jag s billiards": "dining",
    "lady m cakes": "dining",
    "meet fresh": "dining",
    "miniso": "shopping",
    "miracle ear": "medical",
    "morris liu oriental pottery": "shopping",
    "name brand exchange": "shopping",
    "p and y insurance": "legal-finance",
    "phoenix int l travel and tours": "local-services",
    "populus beauty": "beauty-wellness",
    "roll avenue ice cream rolls": "dining",
    "royce chocolate": "dining",
    "snowy village": "dining",
    "sweet time bakery": "dining",
    "the art gallery": "shopping",
    "the alley bubble tea": "dining",
    "the jerky king": "shopping",
    "the street": "dining",
    "tokyo shokudo": "dining",
    "udon shin": "dining",
    "wong insurance agency": "legal-finance",
    "yjp spine center": "medical",
    "yz s ktv karaoke cafe": "dining",
    "zhengxin chicken steak": "dining",
}

BUSINESS_SERVICES = {
    "dining": "Dining and food stop",
    "beauty-wellness": "Beauty and wellness stop",
    "medical": "Health and medical support",
    "legal-finance": "Finance and practical support",
    "education": "Classes and learning support",
    "home-services": "Home and decor support",
    "local-services": "Everyday local service",
    "shopping": "Shopping and retail stop",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


NORMALIZED_CATEGORY_BY_RAW_KIND = {
    normalize_text(key): category
    for key, category in CATEGORY_BY_RAW_KIND.items()
}


def canonical_name(value: str) -> str:
    normalized = normalize_text(value)
    return NAME_ALIASES.get(normalized, normalized)


def slugify(value: str) -> str:
    return normalize_text(value).replace(" ", "-") or "listing"


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if not value:
            continue
        if value not in seen:
            seen.add(value)
            unique.append(value)
    return unique


def ensure_unique_slug(base: str, seen: set[str]) -> str:
    if base not in seen:
        seen.add(base)
        return base
    suffix = 2
    while f"{base}-{suffix}" in seen:
        suffix += 1
    slug = f"{base}-{suffix}"
    seen.add(slug)
    return slug


def region_for_city(city: str) -> str:
    return REGION_BY_CITY.get(city, city)


def website_host(url: str | None) -> str | None:
    if not url:
        return None
    host = re.sub(r"^https?://", "", url).split("/", 1)[0].strip().lower()
    return host or None


def normalized_address(value: str | None) -> str:
    return normalize_text(value)


def normalized_phone(value: str | None) -> str:
    if not value:
        return ""
    digits = re.sub(r"\D+", "", value)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits


def raw_category_key(entry: dict[str, Any]) -> str:
    return normalize_text(entry.get("category"))


def infer_category(entry: dict[str, Any]) -> str:
    name_key = canonical_name(entry["name"])
    if name_key in NAME_CATEGORY_OVERRIDES:
        return NAME_CATEGORY_OVERRIDES[name_key]
    raw_kind = raw_category_key(entry)
    if raw_kind in NORMALIZED_CATEGORY_BY_RAW_KIND:
        return NORMALIZED_CATEGORY_BY_RAW_KIND[raw_kind]

    name_haystack = normalize_text(entry["name"])
    if any(keyword in name_haystack for keyword in ["cafe", "coffee", "bakery", "bbq", "dumpling", "pho", "ramen", "hot pot", "udon", "tea", "grill", "kitchen"]):
        return "dining"
    if any(keyword in name_haystack for keyword in ["salon", "massage", "spa", "beauty"]):
        return "beauty-wellness"
    if any(keyword in name_haystack for keyword in ["insurance", "funding", "bank", "tax"]):
        return "legal-finance"
    if any(keyword in name_haystack for keyword in ["acupuncture", "health", "medical", "spine", "dent", "clinic"]):
        return "medical"
    if any(keyword in name_haystack for keyword in ["travel", "courier", "office"]):
        return "local-services"
    return "shopping"


def center_service_row(center: dict[str, Any], placement: str) -> dict[str, Any]:
    label = f"Located in {center['name']}" if placement == "plaza" else f"Near {center['name']}"
    return {"en": label, "zh": None}


def category_service_row(category_slug: str) -> dict[str, Any]:
    return {"en": BUSINESS_SERVICES[category_slug], "zh": None}


def build_search_aliases(center: dict[str, Any], entry: dict[str, Any], category_slug: str) -> list[str]:
    aliases = [
        entry["name"],
        center["name"],
        center["city"],
        category_slug,
        entry.get("category") or "",
        center["centerAddress"],
        entry.get("placement") or "",
    ]
    host = website_host(entry.get("website"))
    if host:
        aliases.append(host)
    return unique_strings([value for value in aliases if value])


def build_short_description(center: dict[str, Any], entry: dict[str, Any], category_slug: str, status: str) -> dict[str, Any]:
    placement = entry.get("placement", "plaza")
    if status == "planned":
        english = f"Planned tenant at {center['name']} in {center['city']}."
    else:
        category_label = BUSINESS_SERVICES[category_slug].replace(" stop", "").replace(" support", "")
        location_copy = "inside" if placement == "plaza" else "near"
        english = f"{category_label} listing {location_copy} {center['name']} in {center['city']}."
    return {"en": english, "zh": None}


def build_description(center: dict[str, Any], entry: dict[str, Any], category_slug: str, status: str) -> dict[str, Any]:
    placement = entry.get("placement", "plaza")
    if status == "planned":
        english = (
            f"{entry['name']} is a planned tenant for {center['name']} in {center['city']}. "
            "This profile comes from development reporting and may change before opening."
        )
    else:
        location_copy = "within" if placement == "plaza" else "near"
        english = (
            f"{entry['name']} is listed {location_copy} {center['name']} in {center['city']}. "
            "This profile was generated from plaza directory sources and map-based verification, "
            "so direct business contact details may still be incomplete."
        )
    return {"en": english, "zh": None}


def build_business_record(
    entry: dict[str, Any],
    center: dict[str, Any],
    seen_slugs: set[str],
    index: int,
) -> dict[str, Any]:
    category_slug = infer_category(entry)
    status = "planned" if center["status"] == "planned" or entry.get("status") == "planned" else "live"
    slug = ensure_unique_slug(slugify(f"{entry['name']}-{center['city']}"), seen_slugs)

    return {
        "id": f"plaza_{index:04d}",
        "slug": slug,
        "name": {"en": entry["name"], "zh": None},
        "categorySlug": category_slug,
        "city": center["city"],
        "region": region_for_city(center["city"]),
        "address": entry.get("address") or center["centerAddress"],
        "serviceAreaText": None,
        "phone": entry.get("phone"),
        "email": None,
        "website": entry.get("website"),
        "menuUrl": None,
        "heroImage": None,
        "gallery": [],
        "shortDescription": build_short_description(center, entry, category_slug, status),
        "description": build_description(center, entry, category_slug, status),
        "services": [
            center_service_row(center, entry.get("placement", "plaza")),
            category_service_row(category_slug),
        ],
        "languages": ["English"],
        "searchAliases": build_search_aliases(center, entry, category_slug),
        "verified": True,
        "bilingual": False,
        "newcomerFriendly": False,
        "sponsored": False,
        "featured": False,
        "rating": 0,
        "reviewCount": 0,
        "lastUpdated": center["generatedAt"],
        "status": status,
        "verificationState": "editor_verified",
        "hours": [],
        "coordinates": entry.get("coordinates"),
    }


def merge_plaza_context(existing: dict[str, Any], center: dict[str, Any], entry: dict[str, Any], generated_at: str) -> dict[str, Any]:
    existing_aliases = list(existing.get("searchAliases", []))
    existing_aliases.extend(build_search_aliases(center, entry, existing["categorySlug"]))
    existing["searchAliases"] = unique_strings(existing_aliases)

    services = list(existing.get("services", []))
    center_row = center_service_row(center, entry.get("placement", "plaza"))
    if center_row not in services:
        services.append(center_row)
    existing["services"] = services

    if not existing.get("coordinates") and entry.get("coordinates"):
        existing["coordinates"] = entry["coordinates"]
    if not existing.get("address") and (entry.get("address") or center["centerAddress"]):
        existing["address"] = entry.get("address") or center["centerAddress"]
    if not existing.get("website") and entry.get("website"):
        existing["website"] = entry["website"]
    if not existing.get("phone") and entry.get("phone"):
        existing["phone"] = entry["phone"]

    existing["lastUpdated"] = generated_at
    return existing


def exact_business_signature(business: dict[str, Any]) -> tuple[str, str, str, str, str] | None:
    address_key = normalized_address(business.get("address"))
    website_key = website_host(business.get("website")) or ""
    phone_key = normalized_phone(business.get("phone"))
    if not any([address_key, website_key, phone_key]):
        return None
    return (
        canonical_name(business["name"]["en"]),
        business["city"].casefold(),
        address_key,
        website_key,
        phone_key,
    )


def plaza_entry_matches_existing(existing: dict[str, Any], center: dict[str, Any], entry: dict[str, Any]) -> bool:
    entry_address = normalized_address(entry.get("address") or center["centerAddress"])
    entry_website = website_host(entry.get("website")) or ""
    entry_phone = normalized_phone(entry.get("phone"))
    existing_address = normalized_address(existing.get("address"))
    existing_website = website_host(existing.get("website")) or ""
    existing_phone = normalized_phone(existing.get("phone"))
    return bool(
        (entry_website and existing_website and entry_website == existing_website)
        or (entry_phone and existing_phone and entry_phone == existing_phone)
        or (entry_address and existing_address and entry_address == existing_address)
    )


def plaza_entries(payload: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    rows: list[tuple[dict[str, Any], dict[str, Any]]] = []
    generated_at = payload["generatedAt"]
    for center in payload["centers"]:
        center["generatedAt"] = generated_at
        for entry in center["listings"]:
            rows.append((center, entry))
    return rows


def main() -> None:
    existing_businesses = read_json(SCRAPED_FIXTURE_PATH)
    plaza_payload = read_json(PLAZA_SCRAPE_PATH)
    generated_at = plaza_payload["generatedAt"]

    existing_by_name_city: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in existing_businesses:
        key = (canonical_name(row["name"]["en"]), row["city"].casefold())
        existing_by_name_city.setdefault(key, []).append(row)
    seen_slugs = {row["slug"] for row in existing_businesses}

    new_businesses: list[dict[str, Any]] = []
    new_businesses_by_signature: dict[tuple[str, str, str, str, str], dict[str, Any]] = {}
    next_index = 1
    for center, entry in plaza_entries(plaza_payload):
        key = (canonical_name(entry["name"]), center["city"].casefold())
        existing_match = next(
            (
                row
                for row in existing_by_name_city.get(key, [])
                if plaza_entry_matches_existing(row, center, entry)
            ),
            None,
        )
        if existing_match:
            merge_plaza_context(existing_match, center, entry, generated_at)
            continue

        candidate = build_business_record(entry, center, seen_slugs, next_index)
        signature = exact_business_signature(candidate)
        if signature and signature in new_businesses_by_signature:
            merge_plaza_context(new_businesses_by_signature[signature], center, entry, generated_at)
            continue

        new_businesses.append(candidate)
        if signature:
            new_businesses_by_signature[signature] = candidate
        next_index += 1

    combined = list(existing_businesses)
    combined.extend(sorted(new_businesses, key=lambda item: (item["status"] != "live", item["city"], item["name"]["en"].casefold())))

    PLAZA_OUTPUT_PATH.write_text(json.dumps(new_businesses, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    COMBINED_OUTPUT_PATH.write_text(json.dumps(combined, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    image_result = generate_directory_image_overrides(source_path=COMBINED_OUTPUT_PATH)

    print(f"wrote {PLAZA_OUTPUT_PATH}")
    print(f"wrote {COMBINED_OUTPUT_PATH}")
    print(f"wrote {default_image_override_path()}")
    print(f"wrote {default_image_audit_path()}")
    print(f"existing businesses kept: {len(existing_businesses)}")
    print(f"new plaza businesses added: {len(new_businesses)}")
    print(f"combined businesses total: {len(combined)}")
    print(f"automatic image overrides: {len(image_result.overrides)}")
    print(f"image audit rows: {len(image_result.audit_records)}")


if __name__ == "__main__":
    main()
