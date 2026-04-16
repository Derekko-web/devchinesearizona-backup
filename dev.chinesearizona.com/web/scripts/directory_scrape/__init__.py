"""Statewide directory ingestion pipeline for Chinese Arizona listings."""

from pathlib import Path


async def discover(output_dir: Path | None = None):
    from .pipeline import discover as _discover

    return await _discover(output_dir)


async def enrich(output_dir: Path | None = None):
    from .pipeline import enrich as _enrich

    return await _enrich(output_dir)


def dedupe_score(output_dir: Path | None = None):
    from .pipeline import dedupe_score as _dedupe_score

    return _dedupe_score(output_dir)

__all__ = ["discover", "enrich", "dedupe_score"]
