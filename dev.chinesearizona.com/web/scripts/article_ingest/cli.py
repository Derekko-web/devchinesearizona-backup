from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import (
    default_generated_article_path,
    default_output_dir,
    sync_articles,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Import republished articles from Sunbird Arizona")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output_dir(),
        help="Directory for sync metadata and staging files.",
    )
    parser.add_argument(
        "--generated-path",
        type=Path,
        default=default_generated_article_path(),
        help="Path for generated imported article JSON.",
    )
    parser.add_argument(
        "--source-base-url",
        default="https://www.sunbirdarizona.com/wp-json/wp/v2/posts",
        help="WordPress posts endpoint to sync from.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("run")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command != "run":
        raise ValueError(f"Unsupported command: {args.command}")

    summary = sync_articles(
        output_dir=args.output_dir,
        generated_path=args.generated_path,
        source_base_url=args.source_base_url,
    )
    print(
        "article sync complete: "
        f"source_posts={summary['source_post_count']} "
        f"imported_articles={summary['imported_article_count']} "
        f"latest_modified={summary['latest_modified_at']} "
        f"-> {args.generated_path}"
    )


if __name__ == "__main__":
    main()
