from __future__ import annotations

import copy
import re

from .models import ScrapedBusinessCandidate
from .utils import (
    contains_chinese_characters,
    format_phone_display,
    first_sentence,
    is_placeholder_domain,
    is_placeholder_phone,
    normalize_phone,
    normalize_website_for_dedupe,
    normalize_whitespace,
    shorten_text,
    unique_strings,
)

CATEGORY_RULES = [
    ("real-estate", ["realtor", "real estate", "broker", "mortgage", "home buying", "housing"]),
    ("legal-finance", ["cpa", "tax", "bookkeeping", "accounting", "law", "attorney", "lawyer", "legal", "bar association", "financial"]),
    ("medical", ["medical", "clinic", "doctor", "dentist", "family medicine", "health"]),
    ("education", ["school", "academy", "class", "classes", "education", "tutoring", "linguistic", "mandarin classes", "language"]),
    ("moving", ["moving", "relocation", "logistics"]),
    ("home-services", ["hvac", "plumbing", "repair", "landscaping", "contractor"]),
    ("dining", ["restaurant", "food", "cuisine", "tea", "boba", "hot pot", "noodle", "cafe", "taiwanese", "chinese"]),
]

CHINESE_SIGNAL_RULES = [
    ("keyword_chinese", re.compile(r"\bchinese\b", re.IGNORECASE)),
    ("keyword_mandarin", re.compile(r"\bmandarin\b", re.IGNORECASE)),
    ("keyword_bilingual", re.compile(r"\bbilingual\b", re.IGNORECASE)),
    ("keyword_taiwanese", re.compile(r"\btaiwanese\b", re.IGNORECASE)),
    ("keyword_traditional", re.compile(r"traditional chinese|繁體|繁体", re.IGNORECASE)),
]

LANGUAGE_RULES = [
    ("Mandarin", re.compile(r"\bmandarin\b|普通话|普通話|国语|國語|中文", re.IGNORECASE)),
    ("Traditional Chinese", re.compile(r"traditional chinese|繁體|繁体", re.IGNORECASE)),
    ("Taiwanese", re.compile(r"\btaiwanese\b|台語|台湾话|臺語", re.IGNORECASE)),
]


def infer_category_slug(*parts: str | None, default: str = "") -> str:
    haystack = " ".join(normalize_whitespace(part).lower() for part in parts if part)
    for slug, keywords in CATEGORY_RULES:
        if any(keyword in haystack for keyword in keywords):
            return slug
    return default


def detect_chinese_signals(text: str | None, source_url: str, kind_prefix: str = "page") -> list[dict[str, str]]:
    if not text:
        return []
    signals: list[dict[str, str]] = []
    for label, pattern in CHINESE_SIGNAL_RULES:
        match = pattern.search(text)
        if match:
            signals.append(
                {
                    "kind": f"{kind_prefix}_{label}",
                    "value": normalize_whitespace(match.group(0)),
                    "sourceUrl": source_url,
                }
            )
    if contains_chinese_characters(text):
        signals.append({"kind": f"{kind_prefix}_han_text", "value": "Chinese characters", "sourceUrl": source_url})
    unique: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    for signal in signals:
        key = (signal["kind"], signal["value"], signal["sourceUrl"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(signal)
    return unique


def infer_languages(text: str | None) -> list[str]:
    if not text:
        return []
    languages = ["English"] if re.search(r"[A-Za-z]{3}", text) else []
    for label, pattern in LANGUAGE_RULES:
        if pattern.search(text):
            languages.append(label)
    return unique_strings(languages)


def build_search_aliases(candidate: ScrapedBusinessCandidate) -> list[str]:
    aliases = [candidate.name_en, candidate.name_zh or "", candidate.city, candidate.categorySlug]
    if candidate.website:
        aliases.append(normalize_website_for_dedupe(candidate.website) or "")
    aliases.extend(candidate.languages)
    aliases.extend(candidate.services)
    for signal in candidate.chineseSignal:
        aliases.append(signal["value"])
    return unique_strings(aliases)


def is_relevant_candidate(candidate: ScrapedBusinessCandidate) -> bool:
    if candidate.chineseSignal:
        return True
    combined_text = " ".join(
        filter(
            None,
            [
                candidate.name_en,
                candidate.name_zh or "",
                candidate.shortDescription,
                candidate.description,
                " ".join(candidate.searchAliases),
            ],
        )
    )
    return bool(detect_chinese_signals(combined_text, candidate.officialSiteUrl or (candidate.sourceUrls[0] if candidate.sourceUrls else "")))


def has_public_contact_method(candidate: ScrapedBusinessCandidate) -> bool:
    return bool(
        (candidate.phone and not is_placeholder_phone(candidate.phone))
        or (candidate.website and not is_placeholder_domain(candidate.website))
    )


def has_public_location(candidate: ScrapedBusinessCandidate) -> bool:
    return bool(candidate.address or candidate.serviceAreaText)


def passes_trust_gate(candidate: ScrapedBusinessCandidate) -> bool:
    return bool(candidate.name_en and candidate.categorySlug and candidate.city and has_public_contact_method(candidate) and has_public_location(candidate))


def compute_completeness_score(candidate: ScrapedBusinessCandidate) -> int:
    score = 0
    if candidate.name_en:
        score += 10
    if candidate.categorySlug:
        score += 10
    if candidate.city:
        score += 10
    if candidate.phone and not is_placeholder_phone(candidate.phone):
        score += 10
    if candidate.website and not is_placeholder_domain(candidate.website):
        score += 10
    if candidate.address:
        score += 15
    elif candidate.serviceAreaText:
        score += 12
    if candidate.email:
        score += 5
    if candidate.languages:
        score += 5
    if candidate.shortDescription:
        score += 5
    if candidate.description:
        score += 5
    if candidate.services:
        score += 5
    if candidate.coordinates:
        score += 5
    if candidate.hours:
        score += 5
    if candidate.name_zh:
        score += 5
    return min(score, 100)


def source_priority(candidate: ScrapedBusinessCandidate) -> int:
    official_key = normalize_website_for_dedupe(candidate.officialSiteUrl)
    source_keys = {normalize_website_for_dedupe(url) for url in candidate.sourceUrls}
    if official_key and official_key in source_keys:
        return 3
    if any("heritageweb.com" in url for url in candidate.sourceUrls):
        return 2
    if any("azaanhpidirectory.carrd.co" in url for url in candidate.sourceUrls):
        return 1
    return 0


def assign_duplicate_key(candidate: ScrapedBusinessCandidate) -> str:
    website_key = normalize_website_for_dedupe(candidate.website or candidate.officialSiteUrl)
    if website_key:
        return f"website:{website_key}"
    phone_key = normalize_phone(candidate.phone)
    if phone_key:
        return f"phone:{phone_key}"
    name_city = normalize_whitespace(f"{candidate.name_en} {candidate.city}").casefold()
    return f"name_city:{name_city}"


def mark_candidate(candidate: ScrapedBusinessCandidate) -> ScrapedBusinessCandidate:
    marked = copy.deepcopy(candidate)
    marked.phone = format_phone_display(marked.phone)
    marked.heroImage = normalize_whitespace(marked.heroImage) or None
    if not marked.shortDescription and marked.description:
        marked.shortDescription = first_sentence(marked.description)
    if marked.shortDescription and not marked.description:
        marked.description = marked.shortDescription
    if marked.description and not marked.shortDescription:
        marked.shortDescription = shorten_text(marked.description)
    marked.languages = unique_strings(marked.languages)
    marked.services = unique_strings(marked.services)
    marked.gallery = [image for image in unique_strings(marked.gallery) if image != marked.heroImage]
    marked.searchAliases = build_search_aliases(marked)
    marked.sourceUrls = unique_strings(marked.sourceUrls)
    marked.chineseSignal = list(marked.chineseSignal)
    marked.completenessScore = compute_completeness_score(marked)
    marked.duplicateKey = assign_duplicate_key(marked)
    return marked
