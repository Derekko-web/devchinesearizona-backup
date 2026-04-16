from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import (
    default_generated_article_path,
    default_generated_queue_path,
    default_output_dir,
    default_signal_input_path,
    default_source_manifest_path,
    sync_signal_desk,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate original ChineseArizona signal-desk articles and review queue")
    parser.add_argument(
        "--source-manifest-path",
        type=Path,
        default=default_source_manifest_path(),
        help="Path to monitored source manifest JSON.",
    )
    parser.add_argument(
        "--signal-input-path",
        type=Path,
        default=default_signal_input_path(),
        help="Path to signal input JSON.",
    )
    parser.add_argument(
        "--generated-article-path",
        type=Path,
        default=default_generated_article_path(),
        help="Path to generated local article JSON.",
    )
    parser.add_argument(
        "--generated-queue-path",
        type=Path,
        default=default_generated_queue_path(),
        help="Path to generated signal desk queue JSON.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output_dir(),
        help="Directory for staging manifests.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("run")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command != "run":
        raise ValueError(f"Unsupported command: {args.command}")

    summary = sync_signal_desk(
        source_manifest_path=args.source_manifest_path,
        signal_input_path=args.signal_input_path,
        generated_article_path=args.generated_article_path,
        generated_queue_path=args.generated_queue_path,
        output_dir=args.output_dir,
    )
    print(
        "signal desk sync complete: "
        f"sources={summary['monitoredSourceCount']} "
        f"signals={summary['signalCount']} "
        f"published={summary['publishedCount']} "
        f"queued={summary['queuedCount']} "
        f"review_ready={summary['reviewReadyCount']} "
        f"latest_published={summary['latestPublishedAt']}"
    )


if __name__ == "__main__":
    main()
