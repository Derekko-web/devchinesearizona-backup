from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.city_directory_import.config import load_site_config
from scripts.city_directory_import.models import CityDirectoryCandidate
from scripts.city_directory_import.pipeline import FetchedPage, discover, export_approved, promote_approved_to_live, review_queue_path


SOURCE_CATEGORIES = {
    "restaurants": {"categorySlug": "dining"},
    "grocery_markets": {"categorySlug": "shopping"},
    "real_estate": {"categorySlug": "real-estate"},
    "legal_accounting_insurance": {"categorySlug": "legal-finance"},
    "healthcare": {"categorySlug": "medical"},
    "beauty_wellness": {"categorySlug": "beauty-wellness"},
    "education_language_schools": {"categorySlug": "education"},
    "chinese_churches_religious_groups": {"categorySlug": "faith-community"},
    "cultural_community_organizations": {"categorySlug": "local-services"},
    "ping_pong_table_tennis": {"categorySlug": "local-services"},
    "events_venues": {"categorySlug": "local-services"},
    "service_providers": {"categorySlug": "local-services"},
}


def write_manifest(tmp: Path, sites: dict) -> Path:
    path = tmp / "manifest.json"
    path.write_text(
        json.dumps(
            {
                "version": 1,
                "sourceCategories": SOURCE_CATEGORIES,
                "sites": sites,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return path


def site_payload(tmp: Path, sources: list[dict]) -> dict:
    existing_path = tmp / "existing.json"
    existing_path.write_text("[]\n", encoding="utf-8")
    return {
        "domain": "chineseaustin.com",
        "stateCode": "TX",
        "regionName": "Austin metro",
        "allowedCities": ["Austin", "Cedar Park"],
        "allowedCategorySlugs": [
            "dining",
            "shopping",
            "real-estate",
            "legal-finance",
            "medical",
            "beauty-wellness",
            "education",
            "faith-community",
            "local-services",
        ],
        "existingListingsPath": str(existing_path),
        "stagingDir": str(tmp / "staging"),
        "approvedListingsPath": str(tmp / "staging" / "approved.json"),
        "sources": sources,
    }


def fake_fetcher(pages: dict[str, str]):
    def fetch(urls: list[str]) -> dict[str, FetchedPage]:
        return {
            url: FetchedPage(requested_url=url, url=url, html=pages[url])
            for url in urls
            if url in pages
        }

    return fetch


def read_queue(path: Path) -> list[CityDirectoryCandidate]:
    return [
        CityDirectoryCandidate.from_dict(json.loads(line))
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def write_queue(path: Path, records: list[CityDirectoryCandidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(record.to_dict(), ensure_ascii=False, sort_keys=True) + "\n" for record in records),
        encoding="utf-8",
    )


def business_page_html(name: str = "Example Noodle", city: str = "Austin", state: str = "TX") -> str:
    return f"""
      <html>
        <head>
          <script type="application/ld+json">
          {{
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "{name}",
            "url": "https://example-noodle.test/",
            "telephone": "(512) 123-4567",
            "description": "Chinese noodle restaurant with Mandarin-speaking staff.",
            "address": {{
              "@type": "PostalAddress",
              "streetAddress": "123 N Lamar Blvd",
              "addressLocality": "{city}",
              "addressRegion": "{state}",
              "postalCode": "78701"
            }}
          }}
          </script>
        </head>
        <body>{name} Chinese noodles Mandarin Austin</body>
      </html>
    """


class CityDirectoryImportTests(unittest.TestCase):
    def test_missing_site_config_fails_without_arizona_fallback(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(tmp, {"austin": site_payload(tmp, [])})

            with self.assertRaisesRegex(ValueError, "will not fall back to Arizona"):
                load_site_config("sf-bay", manifest)

    def test_source_city_must_belong_to_selected_city_site(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "phoenix-source",
                                "url": "https://phoenix.example.test/",
                                "sourceCategory": "restaurants",
                                "city": "Phoenix",
                                "nameHint": "Phoenix Source",
                            }
                        ],
                    )
                },
            )

            with self.assertRaisesRegex(ValueError, "not in the allowed city list"):
                load_site_config("austin", manifest)

    def test_unknown_source_category_fails_closed(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "bad-category-source",
                                "url": "https://example.test/",
                                "sourceCategory": "restaurants_typo",
                                "city": "Austin",
                                "nameHint": "Example Source",
                            }
                        ],
                    )
                },
            )

            with self.assertRaisesRegex(ValueError, "unsupported sourceCategory"):
                load_site_config("austin", manifest)

    def test_discovery_dedupes_same_run_candidates_against_existing_city_listings(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            payload = site_payload(
                tmp,
                [
                    {
                        "id": "example-noodle-home",
                        "url": "https://example-noodle.test/",
                        "sourceCategory": "restaurants",
                        "city": "Austin",
                        "nameHint": "Example Noodle",
                    },
                    {
                        "id": "example-noodle-contact",
                        "url": "https://example-noodle.test/contact",
                        "sourceCategory": "restaurants",
                        "city": "Austin",
                        "nameHint": "Example Noodle",
                    },
                ],
            )
            existing_path = tmp / "existing.json"
            existing_path.write_text(
                json.dumps(
                    [
                        {
                            "id": "existing-1",
                            "slug": "example-noodle-austin",
                            "name": {"en": "Example Noodle"},
                            "city": "Austin",
                            "phone": "(512) 123-4567",
                            "website": "https://example-noodle.test/",
                        }
                    ]
                ),
                encoding="utf-8",
            )
            payload["existingListingsPath"] = str(existing_path)
            manifest = write_manifest(tmp, {"austin": payload})
            site = load_site_config("austin", manifest)

            records = discover(
                site,
                fetcher=fake_fetcher(
                    {
                        "https://example-noodle.test/": business_page_html(),
                        "https://example-noodle.test/contact": business_page_html(),
                    }
                ),
            )

            self.assertEqual(len(records), 1)
            self.assertEqual(records[0].reviewStatus, "existing_duplicate")
            self.assertEqual(records[0].matchedExistingSlug, "example-noodle-austin")
            self.assertEqual(records[0].sourceIds, ["example-noodle-home", "example-noodle-contact"])

    def test_rerun_preserves_approved_review_and_exports_only_reviewed_candidates(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "example-noodle",
                                "url": "https://example-noodle.test/",
                                "sourceCategory": "restaurants",
                                "city": "Austin",
                                "nameHint": "Example Noodle",
                            }
                        ],
                    )
                },
            )
            site = load_site_config("austin", manifest)
            fetcher = fake_fetcher({"https://example-noodle.test/": business_page_html()})

            discover(site, fetcher=fetcher)
            queue = read_queue(review_queue_path(site))
            queue[0].reviewStatus = "approved"
            queue[0].reviewNotes = "Reviewed against official Austin source."
            write_queue(review_queue_path(site), queue)

            rerun = discover(site, fetcher=fetcher)
            exported = export_approved(site)

            self.assertEqual(rerun[0].reviewStatus, "approved")
            self.assertEqual(rerun[0].reviewNotes, "Reviewed against official Austin source.")
            self.assertEqual(len(exported), 1)
            self.assertEqual(exported[0]["name"]["en"], "Example Noodle")
            self.assertEqual(exported[0]["city"], "Austin")

    def test_low_confidence_approved_candidate_is_not_exported(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "weak-source",
                                "url": "https://weak-source.test/",
                                "sourceCategory": "ping_pong_table_tennis",
                                "city": "Austin",
                                "nameHint": "Austin Table Tennis Club",
                            }
                        ],
                    )
                },
            )
            site = load_site_config("austin", manifest)
            discover(site, fetcher=fake_fetcher({}))
            queue = read_queue(review_queue_path(site))
            queue[0].reviewStatus = "approved"
            write_queue(review_queue_path(site), queue)

            exported = export_approved(site, min_confidence=70)

            self.assertEqual(queue[0].confidenceLevel, "medium")
            self.assertLess(queue[0].confidenceScore, 70)
            self.assertEqual(exported, [])

    def test_approved_candidate_with_wrong_state_is_not_exported(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "wrong-state-source",
                                "url": "https://wrong-state-source.test/",
                                "sourceCategory": "restaurants",
                                "city": "Austin",
                                "nameHint": "Example Noodle",
                            }
                        ],
                    )
                },
            )
            site = load_site_config("austin", manifest)
            discover(site, fetcher=fake_fetcher({"https://wrong-state-source.test/": business_page_html(state="MN")}))
            queue = read_queue(review_queue_path(site))
            self.assertEqual(queue[0].reviewStatus, "blocked_city_mismatch")
            queue[0].reviewStatus = "approved"
            write_queue(review_queue_path(site), queue)

            exported = export_approved(site)

            self.assertEqual(exported, [])

    def test_page_address_locality_outside_allowed_city_is_blocked_even_same_state(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "same-state-wrong-city-source",
                                "url": "https://same-state-wrong-city-source.test/",
                                "sourceCategory": "restaurants",
                                "city": "Austin",
                                "nameHint": "Example Noodle",
                            }
                        ],
                    )
                },
            )
            site = load_site_config("austin", manifest)
            discover(
                site,
                fetcher=fake_fetcher(
                    {"https://same-state-wrong-city-source.test/": business_page_html(city="Dallas", state="TX")}
                ),
            )
            queue = read_queue(review_queue_path(site))
            self.assertEqual(queue[0].city, "Dallas")
            self.assertEqual(queue[0].reviewStatus, "blocked_city_mismatch")
            queue[0].reviewStatus = "approved"
            write_queue(review_queue_path(site), queue)

            exported = export_approved(site)

            self.assertEqual(exported, [])

    def test_promote_approved_is_idempotent_against_current_live_listings(self) -> None:
        with TemporaryDirectory() as directory:
            tmp = Path(directory)
            manifest = write_manifest(
                tmp,
                {
                    "austin": site_payload(
                        tmp,
                        [
                            {
                                "id": "example-noodle",
                                "url": "https://example-noodle.test/",
                                "sourceCategory": "restaurants",
                                "city": "Austin",
                                "nameHint": "Example Noodle",
                            }
                        ],
                    )
                },
            )
            site = load_site_config("austin", manifest)
            discover(site, fetcher=fake_fetcher({"https://example-noodle.test/": business_page_html()}))
            queue = read_queue(review_queue_path(site))
            queue[0].reviewStatus = "approved"
            write_queue(review_queue_path(site), queue)

            first_promotion = promote_approved_to_live(site, write_live=True)
            second_promotion = promote_approved_to_live(site, write_live=True)
            live_listings = json.loads(Path(site.existingListingsPath).read_text(encoding="utf-8"))

            self.assertEqual(len(first_promotion), 1)
            self.assertEqual(second_promotion, [])
            self.assertEqual(len(live_listings), 1)
            self.assertEqual(live_listings[0]["name"]["en"], "Example Noodle")


if __name__ == "__main__":
    unittest.main()
