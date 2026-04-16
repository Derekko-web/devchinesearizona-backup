from __future__ import annotations

import json
import re
import subprocess
import unicodedata
from datetime import UTC, datetime
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

PER_PAGE = 100
SOURCE_NAME = "Sunbird Arizona"
DEFAULT_SOURCE_BASE_URL = "https://www.sunbirdarizona.com/wp-json/wp/v2/posts"
DEFAULT_HERO_IMAGE = (
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
    "?auto=format&fit=crop&w=1200&q=80"
)
FEATURE_CATEGORY_SLUGS = {"phoenixstory", "community-special", "community-special-featured"}
BLOCK_TAG_PATTERN = re.compile(r"<(?:p|li|blockquote|h[2-6])[^>]*>(.*?)</(?:p|li|blockquote|h[2-6])>", re.IGNORECASE | re.DOTALL)
BREAK_TAG_PATTERN = re.compile(r"<br\s*/?>", re.IGNORECASE)
COMMENT_PATTERN = re.compile(r"<!--.*?-->", re.DOTALL)
SCRIPT_STYLE_PATTERN = re.compile(r"<(?:script|style)[^>]*>.*?</(?:script|style)>", re.IGNORECASE | re.DOTALL)
MEDIA_TAG_PATTERN = re.compile(r"<(?:img|figure|svg|video|audio|iframe)[^>]*>.*?</(?:figure|svg|video|audio|iframe)>", re.IGNORECASE | re.DOTALL)
VOID_MEDIA_TAG_PATTERN = re.compile(r"<(?:img|source)[^>]*>", re.IGNORECASE)
TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")
CJK_PATTERN = re.compile(r"[\u3400-\u9fff\u3040-\u30ff]")
NUMERIC_SLUG_PATTERN = re.compile(r"^\d+$")
IMAGE_SRC_PATTERN = re.compile(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', re.IGNORECASE)
SPACE_BEFORE_PUNCTUATION_PATTERN = re.compile(r"\s+([,.;:!?])")


def default_output_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "data" / "article-ingest-staging"


def default_generated_article_path() -> Path:
    return Path(__file__).resolve().parents[2] / "src" / "data" / "generated-imported-articles.json"


def _manifest_path(output_dir: Path) -> Path:
    return output_dir / "sync-manifest.json"


def _run_curl(url: str, include_headers: bool = False) -> str:
    command = [
        "curl",
        "-sS",
        "-H",
        "Accept: application/json",
        "-H",
        "User-Agent: ChineseArizonaArticleSync/1.0",
    ]
    if include_headers:
        command.extend(["-D", "-"])
    command.append(url)
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    return completed.stdout


def _split_headers_and_body(raw_response: str) -> tuple[dict[str, str], str]:
    parts = re.split(r"\r?\n\r?\n", raw_response, maxsplit=1)
    if len(parts) != 2:
        return {}, raw_response
    raw_headers, body = parts
    headers: dict[str, str] = {}
    for line in raw_headers.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers[key.strip().lower()] = value.strip()
    return headers, body


def _fetch_json_with_headers(url: str) -> tuple[dict[str, str], Any]:
    headers, body = _split_headers_and_body(_run_curl(url, include_headers=True))
    return headers, json.loads(body)


def _fetch_json(url: str) -> Any:
    return json.loads(_run_curl(url))


def _posts_url(source_base_url: str, page: int) -> str:
    query = urlencode(
        {
            "per_page": PER_PAGE,
            "page": page,
            "_embed": "1",
            "status": "publish",
            "orderby": "date",
            "order": "desc",
        }
    )
    return f"{source_base_url}?{query}"


def _fetch_all_posts(source_base_url: str) -> list[dict[str, Any]]:
    headers, first_page = _fetch_json_with_headers(_posts_url(source_base_url, 1))
    total_pages = max(int(headers.get("x-wp-totalpages", "1")), 1)
    posts = list(first_page)
    for page in range(2, total_pages + 1):
        posts.extend(_fetch_json(_posts_url(source_base_url, page)))
    return posts


def _strip_tags(fragment: str) -> str:
    cleaned = COMMENT_PATTERN.sub(" ", fragment)
    cleaned = SCRIPT_STYLE_PATTERN.sub(" ", cleaned)
    cleaned = MEDIA_TAG_PATTERN.sub(" ", cleaned)
    cleaned = VOID_MEDIA_TAG_PATTERN.sub(" ", cleaned)
    cleaned = BREAK_TAG_PATTERN.sub("\n", cleaned)
    cleaned = cleaned.replace("<wbr />", "").replace("<wbr/>", "").replace("<wbr>", "")
    cleaned = TAG_PATTERN.sub(" ", cleaned)
    cleaned = unescape(cleaned)
    cleaned = WHITESPACE_PATTERN.sub(" ", cleaned).strip()
    cleaned = SPACE_BEFORE_PUNCTUATION_PATTERN.sub(r"\1", cleaned)
    return cleaned


def _extract_paragraphs(rendered_html: str) -> list[str]:
    sanitized = COMMENT_PATTERN.sub(" ", rendered_html)
    sanitized = SCRIPT_STYLE_PATTERN.sub(" ", sanitized)
    sanitized = MEDIA_TAG_PATTERN.sub(" ", sanitized)
    sanitized = VOID_MEDIA_TAG_PATTERN.sub(" ", sanitized)

    blocks = [_strip_tags(match) for match in BLOCK_TAG_PATTERN.findall(sanitized)]
    paragraphs = [block for block in blocks if block]
    if paragraphs:
        return paragraphs

    fallback = _strip_tags(sanitized)
    return [line for line in re.split(r"\n{2,}", fallback) if line]


def _truncate(value: str, limit: int = 220) -> str:
    compact = WHITESPACE_PATTERN.sub(" ", value).strip()
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1].rstrip() + "…"


def _contains_cjk(value: str) -> bool:
    return bool(CJK_PATTERN.search(value))


def _localized_text(value: str) -> dict[str, str | None]:
    compact = value.strip()
    if not compact:
        return {"en": "", "zh": None}
    if _contains_cjk(compact):
        return {"en": compact, "zh": compact}
    return {"en": compact, "zh": None}


def _slugify(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "article"


def _build_slug(post: dict[str, Any]) -> str:
    raw_slug = str(post.get("slug") or "").strip()
    title = _strip_tags(post.get("title", {}).get("rendered", "")) or f"article-{post['id']}"
    slug_base = title if not raw_slug or NUMERIC_SLUG_PATTERN.fullmatch(raw_slug) else raw_slug
    return _slugify(f"{slug_base}-{post['id']}")


def _extract_featured_image(post: dict[str, Any]) -> str:
    featured_media = post.get("_embedded", {}).get("wp:featuredmedia", [])
    if featured_media:
        source_url = featured_media[0].get("source_url")
        if source_url:
            return source_url

    content_html = post.get("content", {}).get("rendered", "")
    image_match = IMAGE_SRC_PATTERN.search(content_html)
    if image_match:
        return image_match.group(1)

    return DEFAULT_HERO_IMAGE


def _extract_category_slug(post: dict[str, Any]) -> str | None:
    embedded_terms = post.get("_embedded", {}).get("wp:term", [])
    if not embedded_terms:
        return None
    for group in embedded_terms:
        for term in group:
            if term.get("taxonomy") == "category":
                slug = term.get("slug")
                if slug:
                    return slug
    return None


def _article_category(post: dict[str, Any]) -> str:
    category_slug = _extract_category_slug(post)
    if category_slug in FEATURE_CATEGORY_SLUGS:
        return "feature"
    return "news"


def _iso_utc(value: str | None) -> str:
    if not value:
        return datetime.now(UTC).isoformat()
    if value.endswith("Z"):
        return value
    return f"{value}Z"


def post_to_article(post: dict[str, Any]) -> dict[str, Any]:
    title = _strip_tags(post.get("title", {}).get("rendered", "")) or f"Article {post['id']}"
    paragraphs = _extract_paragraphs(post.get("content", {}).get("rendered", ""))
    excerpt_text = _strip_tags(post.get("excerpt", {}).get("rendered", ""))
    if not excerpt_text:
        excerpt_text = _truncate(paragraphs[0] if paragraphs else title)

    return {
        "slug": _build_slug(post),
        "title": _localized_text(title),
        "excerpt": _localized_text(excerpt_text),
        "heroImage": _extract_featured_image(post),
        "publishedAt": _iso_utc(post.get("date_gmt") or post.get("date")),
        "updatedAt": _iso_utc(post.get("modified_gmt") or post.get("modified")),
        "category": _article_category(post),
        "body": [_localized_text(paragraph) for paragraph in paragraphs if paragraph],
        "series": "community-wire",
        "freshnessTier": "archive",
        "sourcePolicy": "republish_with_permission",
        "relatedCategorySlugs": [],
        "ctaBusinessSlugs": [],
        "personaTargets": ["local_families"],
        "sourceLinks": [
            {
                "label": {"en": SOURCE_NAME, "zh": SOURCE_NAME},
                "url": post.get("link"),
                "source": SOURCE_NAME,
            }
        ]
        if post.get("link")
        else [],
        "sourceName": SOURCE_NAME,
        "sourceUrl": post.get("link"),
        "sourceId": str(post.get("id")),
        "republishedWithPermission": True,
    }


def _sort_articles(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        posts,
        key=lambda article: (
            article.get("publishedAt", ""),
            article.get("updatedAt", ""),
            article.get("sourceId", ""),
        ),
        reverse=True,
    )


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_articles(
    output_dir: Path | None = None,
    generated_path: Path | None = None,
    source_base_url: str = DEFAULT_SOURCE_BASE_URL,
) -> dict[str, Any]:
    output_dir = output_dir or default_output_dir()
    generated_path = generated_path or default_generated_article_path()

    source_posts = _fetch_all_posts(source_base_url)
    imported_articles = _sort_articles([post_to_article(post) for post in source_posts])
    latest_modified_at = imported_articles[0]["updatedAt"] if imported_articles else None

    manifest = {
        "syncedAt": datetime.now(UTC).isoformat(),
        "source": SOURCE_NAME,
        "sourceBaseUrl": source_base_url,
        "sourcePostCount": len(source_posts),
        "importedArticleCount": len(imported_articles),
        "latestModifiedAt": latest_modified_at,
    }

    _write_json(generated_path, imported_articles)
    _write_json(_manifest_path(output_dir), manifest)

    return {
        "source_post_count": len(source_posts),
        "imported_article_count": len(imported_articles),
        "latest_modified_at": latest_modified_at,
        "generated_path": str(generated_path),
    }
