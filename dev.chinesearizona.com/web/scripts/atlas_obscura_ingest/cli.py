from __future__ import annotations

import argparse
from pathlib import Path

from .pipeline import (
    ATLAS_ARIZONA_GUIDE_URL,
    default_generated_path,
    default_output_dir,
    default_override_path,
    publish_entries,
    sync_entries,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync licensed Atlas Obscura Arizona content")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output_dir(),
        help="Directory for staging files.",
    )
    parser.add_argument(
        "--generated-path",
        type=Path,
        default=default_generated_path(),
        help="Path for the generated site dataset.",
    )
    parser.add_argument(
        "--override-path",
        type=Path,
        default=default_override_path(),
        help="Path for editor override JSON.",
    )
    parser.add_argument(
        "--source-url",
        default=ATLAS_ARIZONA_GUIDE_URL,
        help="Arizona guide page used to discover child content.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("sync")
    subparsers.add_parser("publish")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "sync":
        summary = sync_entries(
            output_dir=args.output_dir,
            source_url=args.source_url,
        )
        print(
            "atlas sync complete: "
            f"targets={summary['target_count']} "
            f"staged_entries={summary['staged_entry_count']} "
            f"added={summary['diff']['added']} "
            f"updated={summary['diff']['updated']} "
            f"removed={summary['diff']['removed']} "
            f"-> {summary['staged_path']}"
        )
        return

    if args.command == "publish":
        summary = publish_entries(
            output_dir=args.output_dir,
            generated_path=args.generated_path,
            override_path=args.override_path,
        )
        print(
            "atlas publish complete: "
            f"published_entries={summary['published_entry_count']} "
            f"override_count={summary['override_count']} "
            f"-> {summary['generated_path']}"
        )
        return

    raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()
