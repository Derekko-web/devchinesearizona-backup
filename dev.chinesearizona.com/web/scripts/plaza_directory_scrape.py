from __future__ import annotations

import json
import math
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

USER_AGENT = "ChineseArizonaPlazaScraper/1.0"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "plaza-directories"
LOCAL_FIXTURE_PATH = ROOT / "src" / "data" / "generated-scraped-businesses.json"
OSM_ATTRIBUTION_URL = "https://www.openstreetmap.org/copyright"
OVERPASS_ENDPOINTS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

EXCLUDED_KINDS = {
    "atm",
    "bus_station",
    "car_rental",
    "car_repair",
    "charging_station",
    "cinema",
    "college",
    "community_centre",
    "driving_school",
    "fuel",
    "hospital",
    "library",
    "parking",
    "place_of_worship",
    "police",
    "post_box",
    "prison",
    "rental",
    "school",
    "social_centre",
    "storage_rental",
    "theatre",
    "townhall",
    "university",
    "vending_machine",
}

NAME_ALIASES = {
    "99 ranch": "99 ranch market",
    "best hong kong dining restaurant": "best hong kong dining",
    "daiso": "daiso japan",
    "bbq chiecken": "bbq chicken",
    "fedex": "fedex office",
    "happy bao": "happy baos",
    "happy bao s": "happy baos",
    "hong kong cafe": "hong kong cafe",
    "mekong palace restaurant": "mekong palace",
    "mekong sandwiches": "mekong vietnamese sandwiches",
    "sizzling house": "sizzling and ramen",
    "somi somi": "somisomi",
    "tea snow lounge": "tea snow",
    "tara thai 2go": "tara thai",
    "magic noodle house": "china magic noodle house",
    "best of hong kong dining": "best hong kong dining",
    "hodori restaurant": "hodori",
}

PLAZAS: list[dict[str, Any]] = [
    {
        "id": "mekong-plaza",
        "name": "Mekong Plaza",
        "city": "Mesa",
        "center_address": "66 S Dobson Rd, Mesa, AZ 85202",
        "lat": 33.4131879,
        "lon": -111.8761049,
        "core_radius": 90,
        "nearby_radius": 190,
        "address_fragments": ["66 s dobson rd", "66 south dobson road"],
        "summary": (
            "Mesa Asian District shopping center anchored by Mekong Supermarket. "
            "The official stores page currently exposes a large in-plaza tenant list, "
            "and map data adds a few immediately adjacent businesses."
        ),
        "source_urls": [
            "https://mekongplaza.com/mekong-plaza",
            "https://mekongplaza.com/stores-1",
            "https://phxrailfood.com/2022/04/22/com-tam-thuan-kieu/",
            OSM_ATTRIBUTION_URL,
        ],
        "official_fetch": "mekong",
        "status": "active",
    },
    {
        "id": "chandler-ranch",
        "name": "Chandler Ranch",
        "city": "Chandler",
        "center_address": "NEC of W Chandler Blvd & N Dobson Rd, Chandler, AZ 85224",
        "lat": 33.3076161,
        "lon": -111.8748813,
        "core_radius": 175,
        "nearby_radius": 270,
        "address_fragments": [
            "1780 west chandler boulevard",
            "1880 west chandler boulevard",
            "1900 west chandler boulevard",
            "1920 west chandler boulevard",
            "1940 west chandler boulevard",
            "1990 west chandler boulevard",
        ],
        "summary": (
            "Asian-focused Chandler shopping center anchored by 99 Ranch Market. "
            "The official NewQuest property page lists highlighted tenants, while map data "
            "fills in the broader current business mix around the center."
        ),
        "source_urls": [
            "https://www.newquest.com/property/chandler-ranch/",
            OSM_ATTRIBUTION_URL,
        ],
        "official_fetch": "chandler-ranch",
        "status": "active",
    },
    {
        "id": "lee-lee-plaza-tucson",
        "name": "Lee Lee Plaza Tucson",
        "city": "Tucson",
        "center_address": "Orange Grove Rd & La Cholla Blvd, Tucson, AZ 85704",
        "lat": 32.3237024,
        "lon": -111.0099240,
        "core_radius": 175,
        "nearby_radius": 245,
        "address_fragments": [
            "1980 west orange grove",
            "2040 west orange grove",
            "2080 west orange grove",
        ],
        "summary": (
            "Tucson Lee Lee cluster around Orange Grove and La Cholla. There does not appear "
            "to be a clean public tenant directory, so this scrape leans on Lee Lee location "
            "context, Tucson reporting, and map-confirmed businesses around the center."
        ),
        "source_urls": [
            "https://leeleesupermarket.com/tucson/",
            "https://tucsonfoodie.com/2023/05/18/lee-lee-acquired-4-stores/",
            OSM_ATTRIBUTION_URL,
        ],
        "status": "active",
        "manual_entries": [
            {
                "name": "Lee Lee Oriental Supermarket",
                "category": "supermarket",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["brand-location-context"],
            }
        ],
    },
    {
        "id": "dobson-park-plaza-chandler",
        "name": "Dobson Park Plaza Chandler",
        "city": "Chandler",
        "center_address": "2025 N Dobson Rd, Chandler, AZ 85224",
        "lat": 33.3363504,
        "lon": -111.8741328,
        "core_radius": 155,
        "nearby_radius": 225,
        "address_fragments": ["2025 n dobson rd", "2015 n dobson rd", "2005 n dobson rd"],
        "summary": (
            "Dobson Park Plaza is a Chandler Lee Lee-anchored center with limited public directory "
            "data. The scrape combines the LoopNet select-tenant listing, current map data, and "
            "your local business fixture matches."
        ),
        "source_urls": [
            "https://www.loopnet.com/Listing/2025-N-Dobson-Rd-Chandler-AZ/32461828/",
            "https://leeleesupermarket.com/chandler/",
            OSM_ATTRIBUTION_URL,
        ],
        "status": "active",
        "manual_entries": [
            {
                "name": "Lee Lee Oriental Supermarket",
                "category": "supermarket",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["leasing-listing", "brand-location-context"],
            },
            {
                "name": "China Magic Noodle House",
                "category": "restaurant",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["leasing-listing"],
            },
            {
                "name": "CVS Pharmacy",
                "category": "pharmacy",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["leasing-listing"],
            },
            {
                "name": "McDonald's",
                "category": "fast_food",
                "placement": "nearby",
                "status": "active",
                "source_labels": ["leasing-listing"],
            },
            {
                "name": "USA Tae Kwon Do",
                "category": "martial_arts",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["leasing-listing"],
            },
            {
                "name": "Bambu Dessert Drink",
                "category": "dessert",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["leasing-listing"],
            },
        ],
    },
    {
        "id": "peoria-lee-lee-center",
        "name": "Peoria Lee Lee center",
        "city": "Peoria",
        "center_address": "7575 W Cactus Rd, Peoria, AZ 85381",
        "lat": 33.5947986,
        "lon": -112.2221890,
        "core_radius": 170,
        "nearby_radius": 240,
        "address_fragments": [
            "7521 west cactus road",
            "7549 west cactus road",
            "7575 west cactus road",
            "7611 west cactus road",
        ],
        "summary": (
            "Peoria Lee Lee cluster centered on the Cactus Road location. Public tenant information "
            "is sparse, so this directory is primarily built from map-confirmed businesses around the "
            "center plus Lee Lee location context."
        ),
        "source_urls": [
            "https://leeleesupermarket.com/peoria/",
            "https://tucsonfoodie.com/2023/05/18/lee-lee-acquired-4-stores/",
            OSM_ATTRIBUTION_URL,
        ],
        "status": "active",
        "manual_entries": [
            {
                "name": "Lee Lee Oriental Supermarket",
                "category": "supermarket",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["brand-location-context"],
            }
        ],
    },
    {
        "id": "mesa-main-marketplace-h-mart",
        "name": "Mesa Main Marketplace / H Mart",
        "city": "Mesa",
        "center_address": "1919 W Main St, Mesa, AZ 85201",
        "lat": 33.4132826,
        "lon": -111.8726114,
        "core_radius": 145,
        "nearby_radius": 275,
        "address_fragments": [
            "1911 west main street",
            "1919 west main street",
            "1933 west main street",
        ],
        "summary": (
            "West Mesa retail cluster anchored by H Mart. There is no simple public center directory, "
            "so this scrape uses map-confirmed businesses and nearby Mesa Asian District context."
        ),
        "source_urls": [
            "https://www.hmart.com/",
            "https://phxrailfood.com/2022/01/21/the-stone-korean-tofu-house/",
            OSM_ATTRIBUTION_URL,
        ],
        "status": "active",
        "manual_entries": [
            {
                "name": "H Mart",
                "category": "supermarket",
                "placement": "plaza",
                "status": "active",
                "source_labels": ["brand-location-context"],
            }
        ],
    },
    {
        "id": "dobson-square",
        "name": "Dobson Square",
        "city": "Mesa",
        "center_address": "1116 S Dobson Rd, Mesa, AZ 85202",
        "lat": 33.3943583,
        "lon": -111.8759179,
        "core_radius": 120,
        "nearby_radius": 220,
        "address_fragments": ["1116 s dobson rd", "1120 s dobson rd"],
        "summary": (
            "Dobson Square has one of the cleanest public directories in this batch. The official "
            "property page provides a tenant list, and map data adds nearby businesses on the same corner."
        ),
        "source_urls": [
            "https://rentazretail.com/dobson-square-center",
            OSM_ATTRIBUTION_URL,
        ],
        "official_fetch": "dobson-square",
        "status": "active",
    },
    {
        "id": "three-fountains-plaza",
        "name": "Three Fountains Plaza",
        "city": "Mesa",
        "center_address": "1350 S Longmore Rd, Mesa, AZ 85202",
        "lat": 33.3908634,
        "lon": -111.8649282,
        "core_radius": 215,
        "nearby_radius": 270,
        "address_fragments": [
            "1230 south longmore",
            "1316 south longmore",
            "1350 south longmore",
        ],
        "summary": (
            "Southern Avenue / Longmore Road plaza in Mesa with a visible Asian business cluster. "
            "Public directory coverage is limited, so this scrape is mostly map-driven with the LoopNet "
            "center listing as supporting context."
        ),
        "source_urls": [
            "https://www.loopnet.com/Listing/1350-S-Longmore-Rd-Mesa-AZ/21038126/",
            OSM_ATTRIBUTION_URL,
        ],
        "status": "active",
    },
    {
        "id": "the-mosaic",
        "name": "The Mosaic",
        "city": "Glendale",
        "center_address": "Former Sears at Arrowhead Towne Center, Glendale, AZ 85308",
        "lat": 33.6438676,
        "lon": -112.2274792,
        "core_radius": 0,
        "nearby_radius": 0,
        "summary": (
            "The Mosaic is still in development at Arrowhead Towne Center, so the directory here is a "
            "planned-tenant list rather than a current open-business roster."
        ),
        "source_urls": [
            "https://www.everythingarrowhead.com/p/update-the-mosaic-at-arrowhead-towne-center-6e28",
            "https://hoodline.com/2026/03/empty-glendale-sears-to-be-reborn-as-99-ranch-powered-asian-food-hub/",
        ],
        "status": "planned",
        "manual_entries": [
            {"name": "99 Ranch Market", "category": "supermarket", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Teso Life", "category": "discount_store", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Kinokuniya Books", "category": "bookstore", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "T-Swirl Crepe", "category": "dessert", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Bafang Dumpling", "category": "restaurant", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Pho 602", "category": "restaurant", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "The Alley Bubble Tea", "category": "bubble_tea", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Somi Somi", "category": "dessert", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Fat Miilk Coffee", "category": "cafe", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Royce Chocolate", "category": "confectionery", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Lady M Cakes", "category": "bakery", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
            {"name": "Tokyo Shokudo", "category": "restaurant", "placement": "plaza", "status": "planned", "source_labels": ["development-report"]},
        ],
    },
]


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def canonical_name(value: str | None) -> str:
    key = normalize_text(value)
    return NAME_ALIASES.get(key, key)


def slugify(value: str) -> str:
    return normalize_text(value).replace(" ", "-")


def fetch_html(url: str) -> str:
    last_error: Exception | None = None
    for _ in range(3):
        try:
            response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=45)
            response.raise_for_status()
            return response.text
        except Exception as exc:  # pragma: no cover - network variability
            last_error = exc
    raise RuntimeError(f"failed to fetch {url}") from last_error


def fetch_mekong_tenants() -> list[str]:
    soup = BeautifulSoup(fetch_html("https://mekongplaza.com/stores-1"), "html.parser")
    seen: set[str] = set()
    names: list[str] = []
    for heading in soup.find_all("h4"):
        name = " ".join(heading.get_text(" ", strip=True).split())
        if not name:
            continue
        key = canonical_name(name)
        if key in seen:
            continue
        seen.add(key)
        names.append(name)
    return names


def fetch_dobson_square_tenants() -> list[str]:
    soup = BeautifulSoup(fetch_html("https://rentazretail.com/dobson-square-center"), "html.parser")
    heading = soup.find(string=lambda text: text and text.strip() == "Current Tenants")
    if not heading:
        return []
    container = heading.parent.find_next_sibling()
    if not container:
        return []
    return [
        " ".join(item.get_text(" ", strip=True).split())
        for item in container.select("li")
        if item.get_text(" ", strip=True).strip()
    ]


def fetch_chandler_ranch_tenants() -> list[str]:
    text = " ".join(BeautifulSoup(fetch_html("https://www.newquest.com/property/chandler-ranch/"), "html.parser").get_text(" ", strip=True).split())
    match = re.search(r"Includes tenants such as (.+?), and more", text)
    if not match:
        return []
    return [part.strip() for part in match.group(1).split(",") if part.strip()]


def fetch_official_tenants(kind: str) -> list[str]:
    if kind == "mekong":
        return fetch_mekong_tenants()
    if kind == "dobson-square":
        return fetch_dobson_square_tenants()
    if kind == "chandler-ranch":
        return fetch_chandler_ranch_tenants()
    return []


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def query_overpass(lat: float, lon: float, radius: int) -> list[dict[str, Any]]:
    if radius <= 0:
        return []
    query = f"""[out:json][timeout:25];
(
  nwr(around:{radius},{lat},{lon})[name][shop];
  nwr(around:{radius},{lat},{lon})[name][amenity];
  nwr(around:{radius},{lat},{lon})[name][office];
);
out center tags;
"""
    last_error: Exception | None = None
    for endpoint in OVERPASS_ENDPOINTS:
        for _ in range(2):
            try:
                response = requests.post(
                    endpoint,
                    data=query.encode(),
                    headers={"User-Agent": USER_AGENT},
                    timeout=60,
                )
                response.raise_for_status()
                payload = response.json()
                return payload.get("elements", [])
            except Exception as exc:  # pragma: no cover - network variability
                last_error = exc
    raise RuntimeError(f"failed overpass lookup for {lat},{lon}") from last_error


def osm_entry(plaza: dict[str, Any], element: dict[str, Any]) -> dict[str, Any] | None:
    tags = element.get("tags", {})
    name = tags.get("name")
    if not name:
        return None
    category = tags.get("shop") or tags.get("amenity") or tags.get("office") or "unknown"
    if category in EXCLUDED_KINDS:
        return None

    lat = element.get("lat", element.get("center", {}).get("lat"))
    lon = element.get("lon", element.get("center", {}).get("lon"))
    distance = None
    if lat is not None and lon is not None:
        distance = round(haversine_meters(plaza["lat"], plaza["lon"], lat, lon), 1)

    address_bits = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:city"),
        tags.get("addr:state"),
        tags.get("addr:postcode"),
    ]
    address = ", ".join(bit for bit in address_bits if bit)
    address_key = normalize_text(address)
    address_match = any(normalize_text(fragment) in address_key for fragment in plaza.get("address_fragments", []))
    if address_match:
        placement = "plaza"
    elif distance is not None and distance <= plaza["core_radius"] and not address:
        placement = "plaza"
    else:
        placement = "nearby"

    return {
        "name": name,
        "canonicalName": canonical_name(name),
        "category": category,
        "placement": placement,
        "status": "active",
        "address": address or None,
        "website": tags.get("website") or tags.get("contact:website"),
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "distanceMeters": distance,
        "coordinates": {"lat": lat, "lng": lon} if lat is not None and lon is not None else None,
        "description": None,
        "hours": [],
        "sourceLabels": ["map-current"],
        "sourceUrls": [OSM_ATTRIBUTION_URL],
        "matchedLocalListing": None,
    }


def load_local_fixtures() -> list[dict[str, Any]]:
    return json.loads(LOCAL_FIXTURE_PATH.read_text(encoding="utf-8"))


def local_fixture_entry(row: dict[str, Any], placement: str) -> dict[str, Any]:
    return {
        "name": row["name"]["en"],
        "canonicalName": canonical_name(row["name"]["en"]),
        "category": row.get("categorySlug") or "business",
        "placement": placement,
        "status": "active",
        "address": row.get("address"),
        "website": row.get("website"),
        "phone": row.get("phone"),
        "distanceMeters": None,
        "coordinates": row.get("coordinates"),
        "description": row.get("shortDescription", {}).get("en") or row.get("description", {}).get("en"),
        "hours": row.get("hours") or [],
        "sourceLabels": ["local-site-fixture"],
        "sourceUrls": [],
        "matchedLocalListing": {
            "slug": row.get("slug"),
            "id": row.get("id"),
        },
    }


def choose_fixture_placement(plaza: dict[str, Any], row: dict[str, Any]) -> str | None:
    address = normalize_text(row.get("address"))
    for fragment in plaza.get("address_fragments", []):
        if normalize_text(fragment) in address:
            return "plaza"
    if plaza["city"].casefold() not in (row.get("city") or "").casefold():
        return None
    if any(token in address for token in [normalize_text(plaza["center_address"])]):
        return "plaza"
    return None


def source_rank(entry: dict[str, Any]) -> int:
    labels = set(entry.get("sourceLabels", []))
    if "local-site-fixture" in labels:
        return 3
    if "map-current" in labels:
        return 2
    if "brand-location-context" in labels:
        return 1
    return 0


def merge_entry(target: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    if source_rank(incoming) > source_rank(target) and incoming.get("name"):
        target["name"] = incoming["name"]
    if incoming.get("placement") == "plaza":
        target["placement"] = "plaza"
    if incoming.get("status") == "planned":
        target["status"] = "planned"
    if target.get("category") in {None, "", "business", "unknown"} and incoming.get("category") not in {None, "", "business", "unknown"}:
        target["category"] = incoming["category"]
    for field in ("address", "website", "phone", "description", "coordinates", "matchedLocalListing"):
        if incoming.get(field) and not target.get(field):
            target[field] = incoming[field]
    if incoming.get("hours") and not target.get("hours"):
        target["hours"] = incoming["hours"]
    if incoming.get("distanceMeters") is not None:
        current = target.get("distanceMeters")
        target["distanceMeters"] = incoming["distanceMeters"] if current is None else min(current, incoming["distanceMeters"])
    target["sourceLabels"] = sorted(set(target.get("sourceLabels", []) + incoming.get("sourceLabels", [])))
    target["sourceUrls"] = sorted(set(target.get("sourceUrls", []) + incoming.get("sourceUrls", [])))
    return target


def add_entry(store: dict[str, dict[str, Any]], incoming: dict[str, Any]) -> None:
    key = incoming["canonicalName"]
    if key in store:
        store[key] = merge_entry(store[key], incoming)
    else:
        store[key] = incoming


def official_name_entry(plaza: dict[str, Any], name: str) -> dict[str, Any]:
    return {
        "name": name,
        "canonicalName": canonical_name(name),
        "category": "business",
        "placement": "plaza",
        "status": "planned" if plaza["status"] == "planned" else "active",
        "address": plaza["center_address"],
        "website": None,
        "phone": None,
        "distanceMeters": None,
        "coordinates": None,
        "description": None,
        "hours": [],
        "sourceLabels": ["official-center-page"],
        "sourceUrls": [url for url in plaza["source_urls"] if url != OSM_ATTRIBUTION_URL],
        "matchedLocalListing": None,
    }


def manual_entry(base: dict[str, Any], plaza: dict[str, Any]) -> dict[str, Any]:
    entry = {
        "name": base["name"],
        "canonicalName": canonical_name(base["name"]),
        "category": base.get("category", "business"),
        "placement": base.get("placement", "plaza"),
        "status": base.get("status", plaza["status"]),
        "address": base.get("address") or plaza["center_address"],
        "website": base.get("website"),
        "phone": base.get("phone"),
        "distanceMeters": None,
        "coordinates": base.get("coordinates"),
        "description": base.get("description"),
        "hours": base.get("hours", []),
        "sourceLabels": base.get("source_labels", ["manual-curation"]),
        "sourceUrls": base.get("source_urls", [url for url in plaza["source_urls"] if url != OSM_ATTRIBUTION_URL]),
        "matchedLocalListing": None,
    }
    return entry


def build_plaza_directory(plaza: dict[str, Any], local_rows: list[dict[str, Any]]) -> dict[str, Any]:
    entries: dict[str, dict[str, Any]] = {}

    official_fetch = plaza.get("official_fetch")
    if official_fetch:
        for name in fetch_official_tenants(official_fetch):
            add_entry(entries, official_name_entry(plaza, name))

    for item in plaza.get("manual_entries", []):
        add_entry(entries, manual_entry(item, plaza))

    for element in query_overpass(plaza["lat"], plaza["lon"], plaza["nearby_radius"]):
        entry = osm_entry(plaza, element)
        if entry:
            add_entry(entries, entry)

    for row in local_rows:
        placement = choose_fixture_placement(plaza, row)
        if not placement:
            row_name_key = canonical_name(row["name"]["en"])
            if row_name_key not in entries:
                continue
            placement = entries[row_name_key]["placement"]
        add_entry(entries, local_fixture_entry(row, placement))

    final_entries = sorted(
        entries.values(),
        key=lambda item: (
            0 if item["placement"] == "plaza" else 1,
            0 if item["status"] == "active" else 1,
            (item["distanceMeters"] if item["distanceMeters"] is not None else 9999),
            item["name"].casefold(),
        ),
    )

    plaza_count = sum(1 for entry in final_entries if entry["placement"] == "plaza")
    nearby_count = sum(1 for entry in final_entries if entry["placement"] == "nearby")
    planned_count = sum(1 for entry in final_entries if entry["status"] == "planned")

    return {
        "id": plaza["id"],
        "name": plaza["name"],
        "city": plaza["city"],
        "centerAddress": plaza["center_address"],
        "centerCoordinates": {"lat": plaza["lat"], "lng": plaza["lon"]},
        "summary": plaza["summary"],
        "status": plaza["status"],
        "sourceUrls": plaza["source_urls"],
        "counts": {
            "plazaListings": plaza_count,
            "nearbyListings": nearby_count,
            "plannedListings": planned_count,
            "totalListings": len(final_entries),
        },
        "listings": final_entries,
    }


def render_markdown(results: list[dict[str, Any]], generated_at: str) -> str:
    lines = [
        "# Plaza Directory Scrape",
        "",
        f"Generated: {generated_at}",
        "",
        "This file combines official center pages when available, OpenStreetMap map enrichment, and matching local business fixtures.",
        "",
    ]
    for plaza in results:
        lines.extend(
            [
                f"## {plaza['name']}",
                "",
                f"Center: {plaza['centerAddress']}",
                "",
                f"Summary: {plaza['summary']}",
                "",
                (
                    f"Counts: {plaza['counts']['plazaListings']} plaza, "
                    f"{plaza['counts']['nearbyListings']} nearby, "
                    f"{plaza['counts']['plannedListings']} planned, "
                    f"{plaza['counts']['totalListings']} total"
                ),
                "",
                "Sources:",
            ]
        )
        for url in plaza["sourceUrls"]:
            lines.append(f"- {url}")
        lines.append("")
        for entry in plaza["listings"]:
            source_labels = ", ".join(entry["sourceLabels"])
            parts = [
                entry["placement"],
                entry["status"],
                entry["category"],
                source_labels,
            ]
            if entry.get("address"):
                parts.append(entry["address"])
            if entry.get("website"):
                parts.append(entry["website"])
            if entry.get("distanceMeters") is not None:
                parts.append(f"{entry['distanceMeters']}m")
            lines.append(f"- {entry['name']} | " + " | ".join(parts))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    local_rows = load_local_fixtures()
    results = [build_plaza_directory(plaza, local_rows) for plaza in PLAZAS]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUTPUT_DIR / "asian-plaza-directory-scrape.json"
    md_path = OUTPUT_DIR / "asian-plaza-directory-scrape.md"

    payload = {
        "generatedAt": generated_at,
        "centers": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(results, generated_at), encoding="utf-8")

    print(f"wrote {json_path}")
    print(f"wrote {md_path}")
    for center in results:
        print(
            f"{center['name']}: "
            f"{center['counts']['plazaListings']} plaza / "
            f"{center['counts']['nearbyListings']} nearby / "
            f"{center['counts']['plannedListings']} planned"
        )


if __name__ == "__main__":
    main()
