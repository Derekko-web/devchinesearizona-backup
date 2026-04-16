from __future__ import annotations

from dataclasses import dataclass
import re
import warnings
from typing import Any

from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

from .utils import best_json_ld_entity, extract_json_ld_entities, hostname_for, normalize_url, normalize_whitespace

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

BAD_IMAGE_PATTERN = re.compile(
    r"(logo|icon|favicon|badge|avatar|placeholder|sprite|spinner|loader|google-play|app-store)",
    re.IGNORECASE,
)
GOOD_IMAGE_PATTERN = re.compile(
    r"(hero|gallery|cover|banner|feature|featured|photo|dish|course|class|team|office|property|listing|headshot|interior|exterior|storefront|dining|food)",
    re.IGNORECASE,
)
PHOTO_LIKE_IMAGE_PATTERN = re.compile(
    r"(photo|dish|food|dining|interior|exterior|storefront|headshot|team|class|course)",
    re.IGNORECASE,
)
MENU_IMAGE_PATTERN = re.compile(r"\bmenu\b", re.IGNORECASE)
SPAM_IMAGE_PATTERN = re.compile(
    r"(slot|gacor|jackpot|casino|sportsbook|poker|roulette|bonus|maxwin|judi|betting|bookmaker|สล็อตออนไลน์|เดิมพัน|สมัครใหม่|เกมสล็อต|เกม[ฺ]ฮอต)",
    re.IGNORECASE,
)
STOCK_IMAGE_PATTERN = re.compile(
    r"(\bstock\b|/stock/|/getty/|default-image|default_photo|sample-image|demo-image|generated/generated|isteam/stock|unsplash)",
    re.IGNORECASE,
)
GENERIC_ASSET_PATTERN = re.compile(
    r"(animation|game-code|landingpage|storepickup|our-press|press\.png|rewards|loyalty|coupon|promo|homepage|details-hero|cover-image|hero-card|modal|widget|button|thumbnail|thumb|nav|masthead|footer|app-download|photo[-_ ]coming[-_ ]soon|noimg|giphy\.gif|trans\.gif|sharing\.png|consumer-goods\.png|beauty\.png|menu-(?:burgers|breakfast|late-night)|/imagery/map/|roadvibrant|geoplat|maps_opengraph|screenshoter|buzzfile_171x41|og-image\.png|btn_home_out\.png|grey\.gif|/akam/|pixel_[a-z0-9]+)",
    re.IGNORECASE,
)
AWARD_IMAGE_PATTERN = re.compile(
    r"(winner|award|best[-_ ]of[-_ ]the[-_ ]valley|best[-_ ]restaurant|award[-_ ]winning|voted[-_ ]best)",
    re.IGNORECASE,
)
MENU_BANNER_PATTERN = re.compile(r"(menubanner|menu[-_ ]banner|menubanner\.|/img/menubanner)", re.IGNORECASE)
ORDER_ASSET_PATTERN = re.compile(r"(order[-_ ]?(left|right|now|online)|online[-_ ]ordering|start[-_ ]order)", re.IGNORECASE)
PAGE_CONTEXT_GOOD_PATTERN = re.compile(
    r"(gallery|photo|photos|about|story|menu|location|locations|locator|listing|restaurant|food|interior|exterior|store|storefront|branch|office|portfolio|services)",
    re.IGNORECASE,
)
PAGE_CONTEXT_BAD_PATTERN = re.compile(
    r"(privacy|terms|policy|careers|jobs|gift[- ]?card|rewards|account|login|signup|checkout|cart)",
    re.IGNORECASE,
)
BLOCKED_IMAGE_HOSTS = {"images.unsplash.com", "source.unsplash.com"}
BLOCKED_IMAGE_EXTENSIONS = (".svg", ".ico")
SMALL_DIMENSION_IN_URL_PATTERN = re.compile(r"(?:^|[/_=-])(\d{1,3})x(\d{1,3})(?:[._-]|$)", re.IGNORECASE)
URL_WIDTH_HINT_PATTERN = re.compile(r"(?:^|[?&/,_-])(?:w|wid|width)[=_-]?(\d{1,3})(?:[?&/,_-]|$)", re.IGNORECASE)
URL_HEIGHT_HINT_PATTERN = re.compile(r"(?:^|[?&/,_-])(?:h|hei|height)[=_-]?(\d{1,3})(?:[?&/,_-]|$)", re.IGNORECASE)
BUSINESS_NAME_STOPWORDS = {
    "and",
    "arizona",
    "az",
    "bar",
    "business",
    "cafe",
    "chinese",
    "company",
    "food",
    "grill",
    "group",
    "house",
    "inc",
    "kitchen",
    "llc",
    "llp",
    "market",
    "phoenix",
    "restaurant",
    "services",
    "shop",
    "store",
    "tempe",
    "mesa",
    "chandler",
    "glendale",
    "tucson",
}


@dataclass(frozen=True)
class ImageQualityAssessment:
    score: int
    suspicious: bool
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class RankedImageCandidate:
    score: int
    url: str
    assessment: ImageQualityAssessment


def _meta_content(soup: BeautifulSoup, key: str) -> str:
    for attrs in ({"property": key}, {"name": key}):
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return normalize_whitespace(tag.get("content"))
    return ""


def _normalize_image_url(value: str | None, page_url: str) -> str | None:
    url = normalize_url(value, page_url)
    if url and page_url.startswith("https://") and url.startswith("http://"):
        return "https://" + url.removeprefix("http://")
    return url


def _image_from_jsonld(value: Any, page_url: str) -> list[str]:
    if isinstance(value, str):
        url = _normalize_image_url(value, page_url)
        return [url] if url else []
    if isinstance(value, list):
        urls: list[str] = []
        for item in value:
            urls.extend(_image_from_jsonld(item, page_url))
        return urls
    if isinstance(value, dict):
        urls: list[str] = []
        for key in ("url", "contentUrl", "thumbnailUrl"):
            urls.extend(_image_from_jsonld(value.get(key), page_url))
        return urls
    return []


def _business_name_tokens(value: str | None) -> set[str]:
    if not value:
        return set()
    normalized = re.sub(r"[^a-z0-9]+", " ", value.lower())
    return {
        token
        for token in normalized.split()
        if len(token) >= 4 and token not in BUSINESS_NAME_STOPWORDS
    }


def _business_name_boost(haystack: str, business_name: str | None) -> int:
    tokens = _business_name_tokens(business_name)
    if not tokens:
        return 0
    matches = sum(1 for token in tokens if token in haystack.lower())
    if matches >= 3:
        return 22
    if matches == 2:
        return 15
    if matches == 1:
        return 6
    return 0


def _append_reason(reasons: list[str], reason: str) -> None:
    if reason not in reasons:
        reasons.append(reason)


def _parse_dimension(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if match:
            try:
                return int(match.group(0))
            except ValueError:
                return None
    return None


def assess_image_candidate(
    url: str,
    source: str,
    page_url: str,
    alt: str = "",
    class_text: str = "",
    width: int | None = None,
    height: int | None = None,
    business_name: str | None = None,
    page_context: str = "",
) -> ImageQualityAssessment:
    score = 0
    reasons: list[str] = []
    haystack = " ".join(part for part in [url, alt, class_text, page_context] if part)
    host = hostname_for(url)
    normalized_url = url.lower()
    extension = normalized_url.split("?", 1)[0]

    if normalized_url.startswith("http://"):
        score -= 140
        _append_reason(reasons, "insecure_http_image")

    if source == "meta":
        score += 60
    elif source == "jsonld":
        score += 45
    else:
        score += 20

    if width and height:
        area = width * height
        if area >= 120_000:
            score += 25
        elif area >= 40_000:
            score += 12
        elif area < 10_000:
            score -= 30
        if width <= 260 and height <= 260 and abs(width - height) <= 40:
            score -= 55
            _append_reason(reasons, "tiny_square_image")

    if GOOD_IMAGE_PATTERN.search(haystack):
        score += 18
    if MENU_IMAGE_PATTERN.search(haystack) and not PHOTO_LIKE_IMAGE_PATTERN.search(haystack):
        score -= 28
    if BAD_IMAGE_PATTERN.search(haystack):
        score -= 80
        _append_reason(reasons, "logo_or_icon")
    if SPAM_IMAGE_PATTERN.search(haystack):
        score -= 160
        _append_reason(reasons, "spam_image")
    if STOCK_IMAGE_PATTERN.search(haystack):
        score -= 70
        _append_reason(reasons, "stock_or_generated_image")
    if GENERIC_ASSET_PATTERN.search(haystack):
        score -= 100
        _append_reason(reasons, "generic_asset")
    if AWARD_IMAGE_PATTERN.search(haystack):
        score -= 110
        _append_reason(reasons, "award_badge")
    if MENU_BANNER_PATTERN.search(haystack):
        score -= 110
        _append_reason(reasons, "menu_banner")
    if ORDER_ASSET_PATTERN.search(haystack):
        score -= 115
        _append_reason(reasons, "order_page_asset")

    if host in BLOCKED_IMAGE_HOSTS:
        score -= 120
        _append_reason(reasons, "blocked_image_host")
    if extension.endswith(BLOCKED_IMAGE_EXTENSIONS):
        score -= 120
        _append_reason(reasons, "blocked_image_extension")

    for match in SMALL_DIMENSION_IN_URL_PATTERN.finditer(normalized_url):
        try:
            width_hint = int(match.group(1))
            height_hint = int(match.group(2))
        except ValueError:
            continue
        if width_hint < 120 and height_hint < 120:
            score -= 90
            _append_reason(reasons, "tiny_square_image")
            break
        if width_hint <= 260 and height_hint <= 260 and abs(width_hint - height_hint) <= 40:
            score -= 55
            _append_reason(reasons, "tiny_square_image")
            break

    width_hints = [int(match.group(1)) for match in URL_WIDTH_HINT_PATTERN.finditer(normalized_url)]
    height_hints = [int(match.group(1)) for match in URL_HEIGHT_HINT_PATTERN.finditer(normalized_url)]
    if width_hints and height_hints:
        if any(
            width_hint <= 260 and height_hint <= 260 and abs(width_hint - height_hint) <= 40
            for width_hint in width_hints
            for height_hint in height_hints
        ):
            score -= 40
            _append_reason(reasons, "tiny_square_image")
    if any(width_hint < 120 for width_hint in width_hints):
        score -= 60
        _append_reason(reasons, "tiny_square_image")
    elif any(width_hint < 220 for width_hint in width_hints):
        score -= 24
        _append_reason(reasons, "tiny_square_image")
    if any(height_hint < 120 for height_hint in height_hints):
        score -= 60
        _append_reason(reasons, "tiny_square_image")
    elif any(height_hint < 220 for height_hint in height_hints):
        score -= 24
        _append_reason(reasons, "tiny_square_image")

    page_host = hostname_for(page_url)
    if host and page_host and (host == page_host or host.endswith(f".{page_host}") or page_host.endswith(f".{host}")):
        score += 8

    if PAGE_CONTEXT_GOOD_PATTERN.search(page_context):
        score += 8
    if PAGE_CONTEXT_BAD_PATTERN.search(page_context):
        score -= 25

    if alt and alt.strip() and alt.strip().lower() not in {"home", "logo"}:
        score += 5

    score += _business_name_boost(haystack, business_name)
    return ImageQualityAssessment(score=score, suspicious=bool(reasons), reasons=tuple(reasons))


def inspect_image_reference(
    url: str,
    business_name: str | None = None,
    page_url: str | None = None,
    page_context: str = "",
) -> ImageQualityAssessment:
    reference_url = page_url or url
    reference_context = page_context or page_url or url
    return assess_image_candidate(
        url,
        "existing",
        reference_url,
        business_name=business_name,
        page_context=reference_context,
    )


def _rank_image_candidates_from_soup(
    soup: BeautifulSoup,
    page_url: str,
    entity: dict[str, Any] | None = None,
    business_name: str | None = None,
    page_context: str = "",
) -> list[RankedImageCandidate]:
    candidates: list[RankedImageCandidate] = []

    for key in ("og:image", "og:image:secure_url", "twitter:image"):
        url = _normalize_image_url(_meta_content(soup, key), page_url)
        if not url:
            continue
        assessment = assess_image_candidate(
            url,
            "meta",
            page_url,
            business_name=business_name,
            page_context=page_context,
        )
        candidates.append(RankedImageCandidate(score=assessment.score, url=url, assessment=assessment))

    if entity:
        for url in _image_from_jsonld(entity.get("image"), page_url):
            assessment = assess_image_candidate(
                url,
                "jsonld",
                page_url,
                business_name=business_name,
                page_context=page_context,
            )
            candidates.append(RankedImageCandidate(score=assessment.score, url=url, assessment=assessment))

    for tag in soup.find_all("img"):
        raw_url = tag.get("src") or tag.get("data-src") or tag.get("data-lazy-src") or tag.get("data-original")
        url = _normalize_image_url(raw_url, page_url)
        if not url:
            continue
        alt = normalize_whitespace(tag.get("alt"))
        class_text = " ".join(tag.get("class", []))
        width = _parse_dimension(tag.get("width"))
        height = _parse_dimension(tag.get("height"))
        assessment = assess_image_candidate(
            url,
            "img",
            page_url,
            alt,
            class_text,
            width,
            height,
            business_name=business_name,
            page_context=page_context,
        )
        candidates.append(RankedImageCandidate(score=assessment.score, url=url, assessment=assessment))

    ranked: list[RankedImageCandidate] = []
    seen: set[str] = set()
    for candidate in sorted(candidates, key=lambda item: item.score, reverse=True):
        if candidate.score < 10 or candidate.url in seen:
            continue
        seen.add(candidate.url)
        ranked.append(candidate)
    return ranked


def extract_ranked_image_candidate_details(
    page_html: str,
    page_url: str,
    entity: dict[str, Any] | None = None,
    business_name: str | None = None,
    page_context: str = "",
) -> list[RankedImageCandidate]:
    soup = BeautifulSoup(page_html, "lxml")
    entity = entity or best_json_ld_entity(extract_json_ld_entities(soup))
    return _rank_image_candidates_from_soup(
        soup,
        page_url,
        entity=entity,
        business_name=business_name,
        page_context=page_context or page_url,
    )


def extract_ranked_image_candidates(
    page_html: str,
    page_url: str,
    entity: dict[str, Any] | None = None,
    business_name: str | None = None,
    page_context: str = "",
) -> list[tuple[int, str]]:
    return [
        (candidate.score, candidate.url)
        for candidate in extract_ranked_image_candidate_details(
            page_html,
            page_url,
            entity=entity,
            business_name=business_name,
            page_context=page_context,
        )
    ]


def extract_image_assets_from_soup(
    soup: BeautifulSoup,
    page_url: str,
    entity: dict[str, Any] | None = None,
    business_name: str | None = None,
    page_context: str = "",
) -> tuple[str | None, list[str]]:
    ranked = [
        candidate.url
        for candidate in _rank_image_candidates_from_soup(
            soup,
            page_url,
            entity=entity,
            business_name=business_name,
            page_context=page_context or page_url,
        )
    ]
    if not ranked:
        return None, []
    hero_image = ranked[0]
    gallery = [url for url in ranked[1:7] if url != hero_image]
    return hero_image, gallery


def extract_image_assets(
    page_html: str,
    page_url: str,
    entity: dict[str, Any] | None = None,
    business_name: str | None = None,
    page_context: str = "",
) -> tuple[str | None, list[str]]:
    soup = BeautifulSoup(page_html, "lxml")
    entity = entity or best_json_ld_entity(extract_json_ld_entities(soup))
    return extract_image_assets_from_soup(
        soup,
        page_url,
        entity=entity,
        business_name=business_name,
        page_context=page_context,
    )
