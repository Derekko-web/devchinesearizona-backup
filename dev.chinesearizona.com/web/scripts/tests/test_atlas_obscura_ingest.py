from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.atlas_obscura_ingest.pipeline import (
    ATLAS_ARIZONA_GUIDE_URL,
    ATLAS_ARIZONA_PLACES_URL,
    default_generated_path,
    discover_guide_targets,
    discover_places_index_page_count,
    discover_places_index_targets,
    parse_hidden_arizona_itinerary,
    parse_hidden_arizona_list,
    parse_hidden_arizona_place,
    parse_hidden_arizona_story,
    publish_entries,
    sync_entries,
)

FIXTURES = Path(__file__).parent / "fixtures"


def fixture_text(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class AtlasObscuraIngestTests(unittest.TestCase):
    def test_discovers_arizona_targets_across_all_supported_kinds(self) -> None:
        targets = discover_guide_targets(
            fixture_text("atlas_obscura_guide.html"),
            ATLAS_ARIZONA_GUIDE_URL,
        )

        self.assertEqual(len(targets), 4)
        self.assertEqual({target["kind"] for target in targets}, {"place", "story", "list", "itinerary"})

    def test_discovers_places_across_paginated_places_index(self) -> None:
        first_page = fixture_text("atlas_obscura_places_index_page_1.html")
        second_page = fixture_text("atlas_obscura_places_index_page_2.html")

        self.assertEqual(discover_places_index_page_count(first_page, ATLAS_ARIZONA_PLACES_URL), 2)

        page_one_targets = discover_places_index_targets(first_page, ATLAS_ARIZONA_PLACES_URL)
        page_two_targets = discover_places_index_targets(second_page, ATLAS_ARIZONA_PLACES_URL)

        self.assertEqual(page_one_targets[0]["url"], "https://www.atlasobscura.com/places/the-wave")
        self.assertEqual(page_two_targets[0]["url"], "https://www.atlasobscura.com/places/white-pocket")

    def test_parse_place_extracts_location_visit_notes_and_related_links(self) -> None:
        entry = parse_hidden_arizona_place(
            fixture_text("atlas_obscura_place.html"),
            "https://www.atlasobscura.com/places/the-wave",
        )

        self.assertEqual(entry["kind"], "place")
        self.assertEqual(entry["title"]["en"], "The Wave")
        self.assertEqual(entry["city"], "Marble Canyon")
        self.assertEqual(entry["address"], "House Rock Road, Marble Canyon, AZ 86036")
        self.assertEqual(entry["coordinates"], {"lat": 36.996067, "lng": -112.006083})
        self.assertEqual(entry["visitWebsite"], "https://www.blm.gov/visit/the-wave")
        self.assertEqual(len(entry["knowBeforeYouGo"]), 2)
        self.assertEqual(entry["relatedLinks"][0]["url"], "https://www.atlasobscura.com/places/white-pocket")
        self.assertEqual(entry["gallery"][0], "https://images.atlasobscura.com/the-wave/gallery-1.jpg")

    def test_parse_story_list_and_itinerary_extract_body_and_media(self) -> None:
        story = parse_hidden_arizona_story(
            fixture_text("atlas_obscura_story.html"),
            "https://www.atlasobscura.com/articles/arizona-cavern-story",
        )
        curated_list = parse_hidden_arizona_list(
            fixture_text("atlas_obscura_list.html"),
            "https://www.atlasobscura.com/lists/weird-arizona-weekend",
        )
        itinerary = parse_hidden_arizona_itinerary(
            fixture_text("atlas_obscura_itinerary.html"),
            "https://www.atlasobscura.com/itineraries/explore-route-66-arizona",
        )

        self.assertEqual(story["kind"], "story")
        self.assertEqual(story["heroImage"], "https://images.atlasobscura.com/story/hero.jpg")
        self.assertEqual(story["body"][0]["en"], "The first paragraph explains how travelers found the grotto.")
        self.assertEqual(curated_list["kind"], "list")
        self.assertEqual(curated_list["excerpt"]["en"], "Four desert stops for a strange Arizona weekend.")
        self.assertEqual(itinerary["kind"], "itinerary")
        self.assertIn("Day one starts in Holbrook", itinerary["body"][0]["en"])

    def test_sync_stages_localized_entries_without_publishing(self) -> None:
        with TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir) / "atlas"
            generated_path = Path(temp_dir) / "generated-hidden-arizona.json"

            fixtures = {
                ATLAS_ARIZONA_GUIDE_URL: fixture_text("atlas_obscura_guide.html"),
                ATLAS_ARIZONA_PLACES_URL: fixture_text("atlas_obscura_places_index_page_1.html"),
                f"{ATLAS_ARIZONA_PLACES_URL}?page=2": fixture_text("atlas_obscura_places_index_page_2.html"),
                "https://www.atlasobscura.com/places/the-wave": fixture_text("atlas_obscura_place.html"),
                "https://www.atlasobscura.com/places/white-pocket": fixture_text("atlas_obscura_place_white_pocket.html"),
                "https://www.atlasobscura.com/articles/arizona-cavern-story": fixture_text("atlas_obscura_story.html"),
                "https://www.atlasobscura.com/lists/weird-arizona-weekend": fixture_text("atlas_obscura_list.html"),
                "https://www.atlasobscura.com/itineraries/explore-route-66-arizona": fixture_text("atlas_obscura_itinerary.html"),
            }

            summary = sync_entries(
                output_dir=output_dir,
                fetcher=lambda urls: {url: fixtures[url] for url in urls},
                translator=lambda texts: [f"ZH::{text}" for text in texts],
            )

            staged_entries = json.loads((output_dir / "staged-hidden-arizona.json").read_text(encoding="utf-8"))

            self.assertEqual(summary["staged_entry_count"], 5)
            self.assertFalse(generated_path.exists())
            self.assertTrue(all(entry["title"]["zh"].startswith("ZH::") for entry in staged_entries))

    def test_publish_applies_editor_overrides_and_promotes_staged_entries(self) -> None:
        with TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir) / "atlas"
            generated_path = Path(temp_dir) / "generated-hidden-arizona.json"
            override_path = Path(temp_dir) / "overrides.json"

            fixtures = {
                ATLAS_ARIZONA_GUIDE_URL: fixture_text("atlas_obscura_guide.html"),
                ATLAS_ARIZONA_PLACES_URL: fixture_text("atlas_obscura_places_index_page_1.html"),
                f"{ATLAS_ARIZONA_PLACES_URL}?page=2": fixture_text("atlas_obscura_places_index_page_2.html"),
                "https://www.atlasobscura.com/places/the-wave": fixture_text("atlas_obscura_place.html"),
                "https://www.atlasobscura.com/places/white-pocket": fixture_text("atlas_obscura_place_white_pocket.html"),
                "https://www.atlasobscura.com/articles/arizona-cavern-story": fixture_text("atlas_obscura_story.html"),
                "https://www.atlasobscura.com/lists/weird-arizona-weekend": fixture_text("atlas_obscura_list.html"),
                "https://www.atlasobscura.com/itineraries/explore-route-66-arizona": fixture_text("atlas_obscura_itinerary.html"),
            }

            sync_entries(
                output_dir=output_dir,
                fetcher=lambda urls: {url: fixtures[url] for url in urls},
                translator=lambda texts: [f"ZH::{text}" for text in texts],
            )

            override_path.write_text(
                json.dumps(
                    {
                        "the-wave": {
                            "title": {"zh": "編輯版浪潮"},
                            "body": [{"zh": "編輯修訂的第一段"}],
                            "knowBeforeYouGo": [{"zh": "編輯修訂的行前提醒"}],
                        }
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )

            summary = publish_entries(
                output_dir=output_dir,
                generated_path=generated_path,
                override_path=override_path,
            )

            published_entries = json.loads(generated_path.read_text(encoding="utf-8"))
            place_entry = next(entry for entry in published_entries if entry["slug"] == "the-wave")

            self.assertEqual(summary["published_entry_count"], 5)
            self.assertEqual(summary["override_count"], 1)
            self.assertEqual(place_entry["title"]["zh"], "編輯版浪潮")
            self.assertEqual(place_entry["body"][0]["zh"], "編輯修訂的第一段")
            self.assertEqual(place_entry["knowBeforeYouGo"][0]["zh"], "編輯修訂的行前提醒")


if __name__ == "__main__":
    unittest.main()
