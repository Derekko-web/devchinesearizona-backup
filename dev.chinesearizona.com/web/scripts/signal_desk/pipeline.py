from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_VPS_RUNTIME_ROOT = Path("/var/www/runtime-data/dev.chinesearizona.com/web")


def _default_runtime_path(relative_path: str) -> Path:
    configured_root = os.environ.get("CHINESEARIZONA_RUNTIME_DATA_ROOT")
    if configured_root:
        return Path(configured_root) / relative_path

    if ROOT == Path("/var/www/dev.chinesearizona.com/web"):
        return DEFAULT_VPS_RUNTIME_ROOT / relative_path

    return ROOT / relative_path

ALLOWED_DESTINATION_SURFACES = {"community_news", "relocation_guide", "directory_followup", "mixed"}
ALLOWED_REVIEW_STATUSES = {"queued", "review_ready", "approved", "published"}
ALLOWED_SOURCE_POLICIES = {"summary_link", "signal_only", "republish_with_permission"}
ALLOWED_FRESHNESS_TIERS = {"breaking", "weekly", "monthly", "evergreen", "archive"}


def default_signal_input_path() -> Path:
    return ROOT / "data" / "signal-desk-staging" / "source-signals.json"


def default_source_manifest_path() -> Path:
    return ROOT / "src" / "data" / "monitored-sources.json"


def default_generated_article_path() -> Path:
    configured_path = os.environ.get("GENERATED_LOCAL_ARTICLES_PATH")
    if configured_path:
        return Path(configured_path)

    return _default_runtime_path("src/data/generated-local-articles.json")


def default_generated_queue_path() -> Path:
    configured_path = os.environ.get("GENERATED_SIGNAL_DESK_QUEUE_PATH")
    if configured_path:
        return Path(configured_path)

    return _default_runtime_path("src/data/generated-signal-desk-queue.json")


def default_output_dir() -> Path:
    configured_path = os.environ.get("SIGNAL_DESK_OUTPUT_DIR")
    if configured_path:
        return Path(configured_path)

    return _default_runtime_path("data/signal-desk-staging")


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _ensure_localized_text(value: dict[str, Any], field_name: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object.")

    english = str(value.get("en", "")).strip()
    chinese = str(value.get("zh", "")).strip()
    if not english or not chinese:
        raise ValueError(f"{field_name} must include non-empty en and zh values.")


def _priority_score(signal: dict[str, Any]) -> int:
    freshness_weights = {
        "breaking": 96,
        "weekly": 82,
        "monthly": 68,
        "evergreen": 58,
        "archive": 30,
    }
    score = freshness_weights[signal["freshnessTier"]]
    score += min(len(signal.get("personaTargets", [])) * 4, 12)
    score += min(len(signal.get("ctaBusinessSlugs", [])) * 2, 8)
    if signal.get("directoryFollowUp"):
        score += 5
    if signal.get("reviewStatus") == "queued":
        score -= 3
    if signal.get("reviewStatus") == "published":
        score -= 6

    return max(1, min(score, 100))


def _validate_signal(signal: dict[str, Any], sources_by_slug: dict[str, dict[str, Any]]) -> None:
    required_fields = [
        "id",
        "slug",
        "sourceSlug",
        "destinationSurface",
        "series",
        "category",
        "freshnessTier",
        "sourcePolicy",
        "title",
        "excerpt",
        "body",
        "heroImage",
        "publishedAt",
        "personaTargets",
        "relatedCategorySlugs",
        "ctaBusinessSlugs",
        "sourceLinks",
        "reviewStatus",
    ]
    for field in required_fields:
        if field not in signal:
            raise ValueError(f"Signal {signal.get('id', '<unknown>')} is missing required field {field}.")

    if signal["sourceSlug"] not in sources_by_slug:
        raise ValueError(f"Signal {signal['id']} references unknown sourceSlug {signal['sourceSlug']}.")

    if signal["destinationSurface"] not in ALLOWED_DESTINATION_SURFACES:
        raise ValueError(f"Signal {signal['id']} has unsupported destinationSurface {signal['destinationSurface']}.")

    if signal["reviewStatus"] not in ALLOWED_REVIEW_STATUSES:
        raise ValueError(f"Signal {signal['id']} has unsupported reviewStatus {signal['reviewStatus']}.")

    if signal["sourcePolicy"] not in ALLOWED_SOURCE_POLICIES:
        raise ValueError(f"Signal {signal['id']} has unsupported sourcePolicy {signal['sourcePolicy']}.")

    if signal["freshnessTier"] not in ALLOWED_FRESHNESS_TIERS:
        raise ValueError(f"Signal {signal['id']} has unsupported freshnessTier {signal['freshnessTier']}.")

    if signal["destinationSurface"] != "community_news":
        raise ValueError(f"Signal {signal['id']} currently only supports destinationSurface=community_news.")

    if not signal["ctaBusinessSlugs"]:
        raise ValueError(f"Signal {signal['id']} must include at least one directory CTA business.")

    if not signal["sourceLinks"]:
        raise ValueError(f"Signal {signal['id']} must include at least one source link.")

    _ensure_localized_text(signal["title"], f"{signal['id']}.title")
    _ensure_localized_text(signal["excerpt"], f"{signal['id']}.excerpt")

    body = signal["body"]
    if not isinstance(body, list) or not body:
        raise ValueError(f"Signal {signal['id']} must include at least one body paragraph.")
    for index, paragraph in enumerate(body):
        _ensure_localized_text(paragraph, f"{signal['id']}.body[{index}]")

    source = sources_by_slug[signal["sourceSlug"]]
    allowed_use = source["allowedUse"]
    if allowed_use == "signal_only" and signal["sourcePolicy"] != "signal_only":
        raise ValueError(f"Signal {signal['id']} must stay signal_only because source {signal['sourceSlug']} is signal_only.")

    if allowed_use == "summary_link" and signal["sourcePolicy"] == "republish_with_permission":
        raise ValueError(
            f"Signal {signal['id']} cannot use republish_with_permission because source {signal['sourceSlug']} only allows summary_link."
        )


def build_signal_desk_exports(
    sources: list[dict[str, Any]],
    signals: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    sources_by_slug: dict[str, dict[str, Any]] = {}
    for source in sources:
        slug = source.get("slug")
        if not slug:
            raise ValueError("Every monitored source must include a slug.")
        if slug in sources_by_slug:
            raise ValueError(f"Duplicate monitored source slug: {slug}")
        sources_by_slug[slug] = source

    seen_signal_ids: set[str] = set()
    seen_signal_slugs: set[str] = set()
    local_articles: list[dict[str, Any]] = []
    queue_items: list[dict[str, Any]] = []

    for signal in signals:
        _validate_signal(signal, sources_by_slug)

        signal_id = signal["id"]
        slug = signal["slug"]
        if signal_id in seen_signal_ids:
            raise ValueError(f"Duplicate signal id: {signal_id}")
        if slug in seen_signal_slugs:
            raise ValueError(f"Duplicate signal slug: {slug}")
        seen_signal_ids.add(signal_id)
        seen_signal_slugs.add(slug)

        source = sources_by_slug[signal["sourceSlug"]]
        priority_score = _priority_score(signal)
        review_status = signal["reviewStatus"]
        queue_item = {
            "id": signal_id,
            "slug": slug,
            "title": signal["title"],
            "series": signal["series"],
            "reviewStatus": review_status,
            "priorityScore": priority_score,
            "sourceName": source["name"],
            "sourceUrl": source["url"],
            "freshnessTier": signal["freshnessTier"],
            "destinationSurface": signal["destinationSurface"],
            "personaTargets": signal["personaTargets"],
            "ctaBusinessSlugs": signal["ctaBusinessSlugs"],
            "publishedAt": signal.get("publishedAt"),
        }

        if signal.get("directoryFollowUp"):
            queue_item["directoryFollowUp"] = signal["directoryFollowUp"]

        queue_items.append(queue_item)

        if review_status not in {"approved", "published"}:
            continue

        local_articles.append(
            {
                "slug": slug,
                "title": signal["title"],
                "excerpt": signal["excerpt"],
                "heroImage": signal["heroImage"],
                "publishedAt": signal["publishedAt"],
                "updatedAt": signal.get("updatedAt"),
                "category": signal["category"],
                "body": signal["body"],
                "series": signal["series"],
                "freshnessTier": signal["freshnessTier"],
                "sourcePolicy": signal["sourcePolicy"],
                "relatedCategorySlugs": signal["relatedCategorySlugs"],
                "ctaBusinessSlugs": signal["ctaBusinessSlugs"],
                "personaTargets": signal["personaTargets"],
                "sourceLinks": signal["sourceLinks"],
                "authorProfileSlug": signal.get("authorProfileSlug"),
                "sourceName": "ChineseArizona Signal Desk",
                "sourceId": signal_id,
                "republishedWithPermission": False,
            }
        )

    queue_items.sort(key=lambda item: (item["priorityScore"], item.get("publishedAt") or ""), reverse=True)
    local_articles.sort(key=lambda item: (item.get("publishedAt") or "", item["slug"]), reverse=True)

    summary = {
        "monitoredSourceCount": len(sources),
        "signalCount": len(signals),
        "publishedCount": len(local_articles),
        "queuedCount": sum(1 for item in queue_items if item["reviewStatus"] == "queued"),
        "reviewReadyCount": sum(1 for item in queue_items if item["reviewStatus"] == "review_ready"),
        "latestPublishedAt": local_articles[0]["publishedAt"] if local_articles else None,
    }

    return local_articles, queue_items, summary


def sync_signal_desk(
    *,
    source_manifest_path: Path | None = None,
    signal_input_path: Path | None = None,
    generated_article_path: Path | None = None,
    generated_queue_path: Path | None = None,
    output_dir: Path | None = None,
) -> dict[str, Any]:
    source_manifest_path = source_manifest_path or default_source_manifest_path()
    signal_input_path = signal_input_path or default_signal_input_path()
    generated_article_path = generated_article_path or default_generated_article_path()
    generated_queue_path = generated_queue_path or default_generated_queue_path()
    output_dir = output_dir or default_output_dir()

    sources = _read_json(source_manifest_path)
    signals = _read_json(signal_input_path)
    local_articles, queue_items, summary = build_signal_desk_exports(sources, signals)

    _write_json(generated_article_path, local_articles)
    _write_json(generated_queue_path, queue_items)
    _write_json(output_dir / "signal-desk-manifest.json", summary)

    return summary
