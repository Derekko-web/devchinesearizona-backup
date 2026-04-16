from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from .pipeline import dedupe_score, default_output_dir, discover, enrich
from .site_export import default_site_fixture_path, export_site_fixtures


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Chinese Arizona directory ingestion pipeline")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=default_output_dir(),
        help="Directory for staging files",
    )
    parser.add_argument(
        "--site-fixture-path",
        type=Path,
        default=default_site_fixture_path(),
        help="Path for generated site fixture JSON",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in ["discover", "enrich", "dedupe_score", "export_site_fixtures", "run"]:
        subparsers.add_parser(command)
    return parser


async def run_async(command: str, output_dir: Path, site_fixture_path: Path) -> None:
    if command == "discover":
        records = await discover(output_dir)
        print(f"discovered {len(records)} candidates -> {output_dir}")
        return
    if command == "enrich":
        records = await enrich(output_dir)
        print(f"enriched {len(records)} candidates -> {output_dir}")
        return
    if command == "run":
        discovered = await discover(output_dir)
        enriched = await enrich(output_dir)
        final_records = dedupe_score(output_dir)
        exported_records = export_site_fixtures(output_dir, site_fixture_path)
        print(
            f"run complete: discovered={len(discovered)} enriched={len(enriched)} "
            f"final={len(final_records)} site_fixtures={len(exported_records)} "
            f"-> {output_dir}"
        )
        return
    raise ValueError(f"Unsupported async command: {command}")


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "dedupe_score":
        records = dedupe_score(args.output_dir)
        print(f"deduped {len(records)} candidates -> {args.output_dir}")
        return
    if args.command == "export_site_fixtures":
        records = export_site_fixtures(args.output_dir, args.site_fixture_path)
        print(f"exported {len(records)} site fixtures -> {args.site_fixture_path}")
        return
    asyncio.run(run_async(args.command, args.output_dir, args.site_fixture_path))


if __name__ == "__main__":
    main()
