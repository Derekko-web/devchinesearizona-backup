from __future__ import annotations

import argparse
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from scripts.directory_scrape.utils import format_phone_display, normalize_url, normalize_whitespace

from .config import resolve_web_path


OVERTURE_RELEASE = "2026-05-20.0"
OVERTURE_PLACES_PATH = (
    f"s3://overturemaps-us-west-2/release/{OVERTURE_RELEASE}/theme=places/type=place/*"
)
OVERTURE_PLACES_GUIDE_URL = "https://docs.overturemaps.org/guides/places/"
OVERTURE_GETTING_DATA_URL = "https://docs.overturemaps.org/getting-data/"

SQL_NAME_PATTERN = (
    "chinese|china|hong kong|taiwan|taipei|sichuan|szechuan|canton|mandarin|"
    "shanghai|hunan|peking|beijing|dumpling|dim sum|hot pot|hotpot|wonton|"
    "bao|boba|bubble tea|kung fu tea|happy lemon|meet fresh|yi fang|yifang|"
    "tiger sugar|sunright|gong cha|sharetea|99 ranch|ranch market|asia market|"
    "asian market|panda express|malatang|xiao long bao|xlb|85"
)
SQL_CATEGORY_PATTERN = "chinese|taiwan|bubble_tea|dim_sum|dumpling|hot_pot|cantonese|sichuan"

CHINESE_CATEGORY_PATTERN = re.compile(
    r"chinese|taiwanese|bubble_tea|dim_sum|dumpling|hot_pot|cantonese|sichuan|szechuan",
    re.IGNORECASE,
)
HARD_NAME_PATTERN = re.compile(
    r"\b("
    r"chinese|china|hong kong|taiwan|taipei|sichuan|szechuan|canton|cantonese|"
    r"mandarin|shanghai|shanghainese|hunan|peking|beijing|dumpling|dim sum|"
    r"wonton|bao|99 ranch|ranch market|asia market|asian market|panda express|"
    r"malatang|xiao long bao|xlb"
    r")\b",
    re.IGNORECASE,
)
SOFT_NAME_PATTERN = re.compile(
    r"(\b(boba|bubble tea|hot pot|hotpot|kung fu tea|happy lemon|meet fresh|yi fang|"
    r"yifang|tiger sugar|sunright|gong cha|sharetea)\b|85\s*\.?\s*c)",
    re.IGNORECASE,
)
STRONG_NEGATIVE_PATTERN = re.compile(
    r"\b(indian|nepalese|himalayan|thai|japanese|korean|sushi|ramen|steak|mexican|burger)\b",
    re.IGNORECASE,
)
NAME_NEGATIVE_PATTERN = re.compile(
    r"\b(indian|nepalese|himalayan|thai|japanese|korean|sushi|ramen|steak)\b",
    re.IGNORECASE,
)
LEGAL_FINANCE_NAME_PATTERN = re.compile(r"\b(accounting|tax|cpa|cpas|law|insurance|finance)\b", re.IGNORECASE)
SERVICE_NAME_PATTERN = re.compile(r"\b(air china|airline|airlines|tour|tours|travel)\b", re.IGNORECASE)
EXCLUDED_NAME_PATTERN = re.compile(r"\b(asakuma rice|kenny-bao thai tran md)\b", re.IGNORECASE)


@dataclass(frozen=True)
class SiteSpec:
    key: str
    state_code: str
    bbox: tuple[float, float, float, float]
    target: int
    output_path: str
    allowed_cities: set[str]
    city_priority: tuple[str, ...]
    city_cap: int | None = None


SITE_SPECS = {
    "austin": SiteSpec(
        key="austin",
        state_code="TX",
        bbox=(-98.20, 29.75, -97.10, 30.85),
        target=320,
        output_path="data/sites/austin/directory-import-sources/overture-places.json",
        allowed_cities={
            "Austin",
            "Bastrop",
            "Bee Cave",
            "Buda",
            "Cedar Park",
            "Dripping Springs",
            "Elgin",
            "Georgetown",
            "Hutto",
            "Kyle",
            "Lago Vista",
            "Lakeway",
            "Leander",
            "Liberty Hill",
            "Manor",
            "Pflugerville",
            "Round Rock",
            "San Marcos",
            "Sunset Valley",
            "Taylor",
            "West Lake Hills",
            "Wimberley",
        },
        city_priority=(
            "Austin",
            "Round Rock",
            "Cedar Park",
            "Pflugerville",
            "Leander",
            "Georgetown",
            "San Marcos",
            "Kyle",
            "Buda",
        ),
        city_cap=None,
    ),
    "los-angeles": SiteSpec(
        key="los-angeles",
        state_code="CA",
        bbox=(-118.75, 33.55, -117.45, 34.38),
        target=320,
        output_path="data/sites/los-angeles/directory-import-sources/overture-places.json",
        allowed_cities=set(),
        city_priority=(
            "Los Angeles",
            "Alhambra",
            "Arcadia",
            "Monterey Park",
            "San Gabriel",
            "Pasadena",
            "Temple City",
            "Rosemead",
            "Rowland Heights",
            "Hacienda Heights",
            "Walnut",
            "Diamond Bar",
            "El Monte",
            "South El Monte",
            "West Covina",
            "City of Industry",
            "Irvine",
            "Anaheim",
            "Torrance",
            "Long Beach",
        ),
        city_cap=35,
    ),
    "sf-bay": SiteSpec(
        key="sf-bay",
        state_code="CA",
        bbox=(-122.65, 37.15, -121.55, 38.15),
        target=320,
        output_path="data/sites/sf-bay/directory-import-sources/overture-places.json",
        allowed_cities=set(),
        city_priority=(
            "San Francisco",
            "Oakland",
            "San Jose",
            "Cupertino",
            "Sunnyvale",
            "Santa Clara",
            "Fremont",
            "Milpitas",
            "Daly City",
            "Berkeley",
            "San Mateo",
            "Mountain View",
            "Palo Alto",
            "Hayward",
            "Alameda",
        ),
        city_cap=35,
    ),
}


def _slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "source"


def _category_text(primary: str | None, alternates: list[str] | None) -> str:
    return " ".join([primary or "", *(alternates or [])])


def _is_chinese_community_match(name: str, category_text: str) -> bool:
    if EXCLUDED_NAME_PATTERN.search(name):
        return False
    has_chinese_category = bool(CHINESE_CATEGORY_PATTERN.search(category_text))
    has_hard_name = bool(HARD_NAME_PATTERN.search(name))
    has_soft_name = bool(SOFT_NAME_PATTERN.search(name))
    if not (has_chinese_category or has_hard_name or has_soft_name):
        return False
    if NAME_NEGATIVE_PATTERN.search(name) and not has_hard_name:
        return False
    if STRONG_NEGATIVE_PATTERN.search(f"{name} {category_text}") and not (has_chinese_category or has_hard_name):
        return False
    return True


def _source_category(primary_category: str | None, name: str) -> str:
    category = (primary_category or "").casefold()
    if LEGAL_FINANCE_NAME_PATTERN.search(name):
        return "legal_accounting_insurance"
    if SERVICE_NAME_PATTERN.search(name):
        return "service_providers"
    if any(token in category for token in ["restaurant", "food", "cafe", "tea", "bakery", "dessert"]):
        return "restaurants"
    if any(token in category for token in ["grocery", "market", "supermarket"]):
        return "grocery_markets"
    if "real_estate" in category:
        return "real_estate"
    if any(token in category for token in ["law", "account", "bank", "insurance", "finance", "tax", "cpa"]):
        return "legal_accounting_insurance"
    if any(token in category for token in ["doctor", "clinic", "dent", "medical", "health", "acupuncture"]):
        return "healthcare"
    if any(token in category for token in ["beauty", "salon", "spa", "massage", "hair"]):
        return "beauty_wellness"
    if any(token in category for token in ["school", "education", "language", "tutor"]):
        return "education_language_schools"
    if any(token in category for token in ["church", "temple", "religious"]):
        return "chinese_churches_religious_groups"
    if any(token in category for token in ["association", "community", "museum", "organization", "service"]):
        return "cultural_community_organizations"
    if "store" in category:
        return "service_providers"
    return "service_providers"


def _localized_category(primary_category: str | None) -> str:
    category = (primary_category or "local business").replace("_", " ")
    return category[:1].upper() + category[1:]


def _first_address(addresses: list[dict[str, Any]] | None) -> dict[str, Any] | None:
    if not addresses:
        return None
    for address in addresses:
        if isinstance(address, dict) and address.get("locality") and address.get("region"):
            return address
    return None


def _formatted_address(address: dict[str, Any]) -> str:
    parts = [
        normalize_whitespace(address.get("freeform")),
        normalize_whitespace(address.get("locality")),
        normalize_whitespace(address.get("region")),
        normalize_whitespace(address.get("postcode")),
    ]
    street = parts[0]
    city = parts[1]
    state_postcode = " ".join(part for part in [parts[2], parts[3]] if part)
    return ", ".join(part for part in [street, city, state_postcode] if part)


def _best_website(websites: list[str] | None) -> str | None:
    if not websites:
        return None
    for website in websites:
        normalized = normalize_url(website)
        if normalized:
            return normalized
    return None


def _best_phone(phones: list[str] | None) -> str | None:
    if not phones:
        return None
    for phone in phones:
        formatted = format_phone_display(phone)
        if formatted:
            return formatted
    return None


def _source_note(overture_id: str, sources: list[dict[str, Any]] | None) -> str:
    datasets = []
    for source in sources or []:
        dataset = source.get("dataset") if isinstance(source, dict) else None
        license_name = source.get("license") if isinstance(source, dict) else None
        if dataset and license_name:
            datasets.append(f"{dataset} ({license_name})")
        elif dataset:
            datasets.append(dataset)
    dataset_text = ", ".join(dict.fromkeys(datasets)) or "Overture Places"
    return f"Overture Places {OVERTURE_RELEASE} id {overture_id}; source datasets: {dataset_text}."


def _candidate_sort_key(source: dict[str, Any], spec: SiteSpec) -> tuple[int, int, str, str]:
    seed = source["seedData"]
    category_priority = {
        "restaurants": 0,
        "grocery_markets": 1,
        "healthcare": 2,
        "education_language_schools": 3,
        "legal_accounting_insurance": 4,
        "beauty_wellness": 5,
        "real_estate": 6,
        "service_providers": 7,
        "cultural_community_organizations": 8,
        "chinese_churches_religious_groups": 9,
    }
    score = 0
    if seed.get("website"):
        score -= 3
    if seed.get("phone"):
        score -= 2
    try:
        city_rank = spec.city_priority.index(source["city"])
    except ValueError:
        city_rank = len(spec.city_priority)
    return (category_priority.get(source["sourceCategory"], 10), city_rank, score, source["nameHint"])


def _row_to_source(spec: SiteSpec, row: tuple[Any, ...]) -> dict[str, Any] | None:
    overture_id, name, primary_category, alternates, websites, phones, addresses, confidence, sources = row
    name = normalize_whitespace(name)
    address = _first_address(addresses)
    if not name or not address:
        return None
    city = normalize_whitespace(address.get("locality"))
    state = normalize_whitespace(address.get("region"))
    if not city or state != spec.state_code:
        return None
    if spec.allowed_cities and city not in spec.allowed_cities:
        return None

    category_text = _category_text(primary_category, alternates)
    if not _is_chinese_community_match(name, category_text):
        return None

    source_category = _source_category(primary_category, name)
    website = _best_website(websites)
    phone = _best_phone(phones)
    display_category = _localized_category(primary_category)
    address_text = _formatted_address(address)
    source_id = f"{spec.key}-overture-{_slugify(f'{name}-{city}')}-{str(overture_id)[:8]}"
    source_note = _source_note(str(overture_id), sources)
    source_urls = [OVERTURE_GETTING_DATA_URL]
    if website:
        source_urls.insert(0, website)

    return {
        "id": source_id,
        "url": OVERTURE_PLACES_GUIDE_URL,
        "sourceCategory": source_category,
        "city": city,
        "nameHint": name,
        "sourceType": "open_data_seed",
        "notes": source_note,
        "seedData": {
            "name": name,
            "city": city,
            "stateCode": spec.state_code,
            "address": address_text,
            "phone": phone,
            "website": website,
            "shortDescription": f"{display_category} in {city}.",
            "description": f"{name} is listed in Overture Maps Places as a {display_category.lower()} in {city}.",
            "services": [display_category],
            "languages": ["English"],
            "sourceUrls": source_urls,
            "sourceNotes": [source_note, f"Overture confidence: {confidence:.2f}" if confidence is not None else ""],
        },
    }


def _dedupe_sources(sources: list[dict[str, Any]], spec: SiteSpec) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for source in sorted(sources, key=lambda source: _candidate_sort_key(source, spec)):
        seed = source["seedData"]
        website = normalize_url(seed.get("website"))
        phone_digits = re.sub(r"\D", "", seed.get("phone") or "")
        name_city = normalize_whitespace(f"{seed.get('name')} {source.get('city')}").casefold()
        keys = [
            f"website:{website}" if website else "",
            f"phone:{phone_digits}" if phone_digits else "",
            f"name_city:{name_city}" if name_city else "",
        ]
        keys = [key for key in keys if key]
        if not keys or any(key in seen for key in keys):
            continue
        seen.update(keys)
        output.append(source)
    return output


def _select_sources(sources: list[dict[str, Any]], spec: SiteSpec) -> list[dict[str, Any]]:
    sorted_sources = _dedupe_sources(sources, spec)
    if not spec.city_cap:
        return sorted_sources[: spec.target]

    selected: list[dict[str, Any]] = []
    selected_ids: set[str] = set()
    city_counts: dict[str, int] = {}
    for source in sorted_sources:
        city = source["city"]
        if city_counts.get(city, 0) >= spec.city_cap:
            continue
        selected.append(source)
        selected_ids.add(source["id"])
        city_counts[city] = city_counts.get(city, 0) + 1
        if len(selected) >= spec.target:
            return selected

    for source in sorted_sources:
        if source["id"] in selected_ids:
            continue
        selected.append(source)
        if len(selected) >= spec.target:
            break
    return selected


def _connect_duckdb():
    try:
        import duckdb
    except ModuleNotFoundError as error:
        raise SystemExit("Install duckdb to generate Overture source files: python3 -m pip install duckdb") from error

    connection = duckdb.connect()
    connection.execute("INSTALL httpfs; LOAD httpfs;")
    connection.execute("SET s3_region='us-west-2';")
    connection.execute("SET s3_url_style='path';")
    connection.execute("SET s3_endpoint='s3.us-west-2.amazonaws.com';")
    return connection


def generate_sources(site_key: str) -> list[dict[str, Any]]:
    spec = SITE_SPECS[site_key]
    west, south, east, north = spec.bbox
    connection = _connect_duckdb()
    rows = connection.execute(
        f"""
        SELECT
          id,
          names.primary AS name,
          categories.primary AS primary_category,
          categories.alternate AS alternate_categories,
          websites,
          phones,
          addresses,
          confidence,
          sources
        FROM read_parquet('{OVERTURE_PLACES_PATH}', hive_partitioning=1)
        WHERE bbox.xmin >= {west}
          AND bbox.xmax <= {east}
          AND bbox.ymin >= {south}
          AND bbox.ymax <= {north}
          AND (operating_status IS NULL OR operating_status = 'open')
          AND (
            regexp_matches(lower(coalesce(names.primary, '')), '{SQL_NAME_PATTERN}')
            OR regexp_matches(lower(coalesce(categories.primary, '')), '{SQL_CATEGORY_PATTERN}')
          )
        LIMIT 8000
        """
    ).fetchall()
    sources = [source for row in rows if (source := _row_to_source(spec, row))]
    return _select_sources(sources, spec)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate city directory source seeds from Overture Maps Places")
    parser.add_argument("--site", choices=sorted(SITE_SPECS), action="append", help="Site key to generate. Defaults to all.")
    args = parser.parse_args()
    site_keys = args.site or sorted(SITE_SPECS)
    for site_key in site_keys:
        sources = generate_sources(site_key)
        spec = SITE_SPECS[site_key]
        output_path = resolve_web_path(spec.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps({"sources": sources}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{site_key}: wrote {len(sources)} sources -> {output_path}")


if __name__ == "__main__":
    main()
