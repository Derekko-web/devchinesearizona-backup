from __future__ import annotations

import argparse
from pathlib import Path

from .config import default_manifest_path, load_site_config
from .pipeline import (
    approved_candidates,
    discover,
    export_approved,
    promote_approved_to_live,
    review_queue_path,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Reusable city-specific directory discovery/import pipeline")
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--site", required=True, help="Site key to run, for example austin, los-angeles, or sf-bay")
    common.add_argument(
        "--manifest-path",
        type=Path,
        default=default_manifest_path(),
        help="City directory source manifest path",
    )
    common.add_argument(
        "--min-confidence",
        type=int,
        default=70,
        help="Minimum confidence required for approved export/promotion",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("discover", parents=[common], help="Fetch configured city sources and refresh the review queue")
    subparsers.add_parser("run", parents=[common], help="Discover sources, preserve review decisions, and export approved candidates")
    export_parser = subparsers.add_parser(
        "export-approved",
        parents=[common],
        help="Export approved high-confidence candidates to staging JSON",
    )
    export_parser.add_argument("--destination", type=Path, help="Override approved export destination")
    promote_parser = subparsers.add_parser(
        "promote-approved",
        parents=[common],
        help="Append approved candidates to the configured live static JSON",
    )
    promote_parser.add_argument(
        "--write-live",
        action="store_true",
        help="Required acknowledgement that the configured live listing JSON should be changed",
    )
    subparsers.add_parser("approved-count", parents=[common], help="Print approved candidate count without writing output")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    site = load_site_config(args.site, args.manifest_path)

    if args.command == "discover":
        records = discover(site)
        print(f"discovered {len(records)} candidates for {site.siteKey} -> {review_queue_path(site)}")
        return
    if args.command == "run":
        records = discover(site)
        exported = export_approved(site, min_confidence=args.min_confidence)
        print(
            f"run complete for {site.siteKey}: review_queue={len(records)} "
            f"approved_export={len(exported)} -> {review_queue_path(site)}"
        )
        return
    if args.command == "export-approved":
        exported = export_approved(site, destination=args.destination, min_confidence=args.min_confidence)
        print(f"exported {len(exported)} approved listings for {site.siteKey}")
        return
    if args.command == "promote-approved":
        additions = promote_approved_to_live(site, min_confidence=args.min_confidence, write_live=args.write_live)
        print(f"promoted {len(additions)} approved listings into {site.existingListingsPath}")
        return
    if args.command == "approved-count":
        print(len(approved_candidates(site, min_confidence=args.min_confidence)))
        return
    raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()
