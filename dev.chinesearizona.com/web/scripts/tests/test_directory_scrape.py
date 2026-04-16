from __future__ import annotations

import json
from tempfile import TemporaryDirectory
import unittest
from pathlib import Path

from scripts.directory_scrape.image_overrides import (
    FetchedPage,
    ImageOverrideDiscovery,
    SearchResultPage,
    discover_business_image_override,
    generate_directory_image_overrides,
    should_keep_generated_override,
)
from scripts.directory_scrape.image_utils import extract_ranked_image_candidates, inspect_image_reference
from scripts.directory_scrape.models import ScrapedBusinessCandidate
from scripts.directory_scrape.parsers import (
    parse_azaanhpi_directory,
    parse_heritage_detail,
    parse_official_site,
)
from scripts.directory_scrape.pipeline import merge_candidate_group
from scripts.directory_scrape.site_export import candidate_to_business
from scripts.directory_scrape.taxonomy import (
    compute_completeness_score,
    is_relevant_candidate,
    mark_candidate,
    passes_trust_gate,
)

FIXTURES = Path(__file__).parent / "fixtures"


def fixture_text(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class DirectoryScrapeTests(unittest.TestCase):
    def test_parse_azaanhpi_directory_keeps_only_explicit_chinese_rows(self) -> None:
        candidates = parse_azaanhpi_directory(
            fixture_text("azaanhpi_table.html"),
            "https://azaanhpidirectory.carrd.co/",
        )
        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(candidate.name_en, "Mayflower Chinese Cuisine")
        self.assertEqual(candidate.categorySlug, "dining")
        self.assertEqual(candidate.city, "Chandler")
        self.assertTrue(candidate.chineseSignal)

    def test_parse_heritage_detail_maps_real_estate_record(self) -> None:
        candidate = parse_heritage_detail(
            fixture_text("heritage_detail.html"),
            "https://heritageweb.com/asian-real-estate-association-of-america-greater-phoenix-29828",
            source_collection_url="https://heritageweb.com/us/arizona/phoenix-organizations-chinese",
        )
        self.assertIsNotNone(candidate)
        assert candidate is not None
        self.assertEqual(candidate.categorySlug, "real-estate")
        self.assertEqual(candidate.city, "Phoenix")
        self.assertEqual(candidate.website.rstrip("/"), "https://areaagreaterphoenix.org")
        self.assertEqual(candidate.coordinates, {"lat": 33.507201, "lng": -112.057941})

    def test_parse_official_site_detects_languages_and_contact(self) -> None:
        candidate = parse_official_site(
            fixture_text("official_site.html"),
            "https://hedylirealtor.com/",
            seed={
                "name_en": "Hedy Li",
                "categorySlug": "real-estate",
                "city": "Phoenix",
                "serviceAreaText": "Phoenix Metro Area",
            },
        )
        self.assertIsNotNone(candidate)
        assert candidate is not None
        self.assertEqual(candidate.name_en, "Hedy Li")
        self.assertEqual(candidate.phone, "(626) 235-2358")
        self.assertEqual(candidate.email, "hedyli10@gmail.com")
        self.assertEqual(candidate.heroImage, "https://cdn.example.com/hedy-li/headshot.jpg")
        self.assertNotIn("https://images.unsplash.com/photo-123456", candidate.gallery)
        self.assertIn("Mandarin", candidate.languages)
        self.assertTrue(candidate.chineseSignal)

    def test_relevance_filter_excludes_non_chinese_candidate_without_signal(self) -> None:
        candidate = ScrapedBusinessCandidate(
            name_en="Example Boba Shop",
            categorySlug="dining",
            city="Mesa",
            region="Greater Phoenix",
            address="123 Main St Mesa, AZ 85201",
            phone="480-123-4567",
            website="https://example-boba.test/",
            shortDescription="Boba tea and desserts.",
            description="Boba tea and desserts.",
            sourceUrls=["https://azaanhpidirectory.carrd.co/"],
        )
        marked = mark_candidate(candidate)
        self.assertFalse(is_relevant_candidate(marked))
        marked.chineseSignal = [{"kind": "page_keyword_chinese", "value": "Chinese", "sourceUrl": "https://example-boba.test/"}]
        self.assertTrue(is_relevant_candidate(marked))

    def test_dedupe_prefers_official_site_fields(self) -> None:
        directory_candidate = mark_candidate(
            ScrapedBusinessCandidate(
                name_en="Hedy Li",
                categorySlug="real-estate",
                city="Phoenix",
                region="Greater Phoenix",
                serviceAreaText="Phoenix Metro Area",
                phone="626-235-2358",
                website="https://hedylirealtor.com/",
                shortDescription="Directory listing.",
                description="Directory listing.",
                sourceUrls=["https://azaanhpidirectory.carrd.co/"],
                chineseSignal=[{"kind": "directory_keyword", "value": "Chinese", "sourceUrl": "https://azaanhpidirectory.carrd.co/"}],
            )
        )
        official_candidate = mark_candidate(
            ScrapedBusinessCandidate(
                name_en="Hedy Li",
                categorySlug="real-estate",
                city="Phoenix",
                region="Greater Phoenix",
                serviceAreaText="Phoenix Metro Area",
                phone="626-235-2358",
                email="hedyli10@gmail.com",
                website="https://hedylirealtor.com/",
                officialSiteUrl="https://hedylirealtor.com/",
                shortDescription="Chinese-speaking realtor in Phoenix.",
                description="Chinese-speaking realtor in Phoenix focused on investment real estate.",
                sourceUrls=["https://hedylirealtor.com/"],
                chineseSignal=[{"kind": "page_keyword_chinese", "value": "Chinese", "sourceUrl": "https://hedylirealtor.com/"}],
            )
        )
        merged = merge_candidate_group([directory_candidate, official_candidate])
        self.assertEqual(merged.email, "hedyli10@gmail.com")
        self.assertIn("https://hedylirealtor.com/", merged.sourceUrls)
        self.assertIn("https://azaanhpidirectory.carrd.co/", merged.sourceUrls)
        self.assertIn("Chinese-speaking realtor in Phoenix", merged.shortDescription)

    def test_completeness_scoring_and_trust_gate(self) -> None:
        complete = mark_candidate(
            ScrapedBusinessCandidate(
                name_en="Phoenix Chinese Center",
                categorySlug="education",
                city="Glendale",
                region="Greater Phoenix",
                serviceAreaText="Glendale, Arizona",
                website="https://phoenixchinesecenter.com/",
                shortDescription="Mandarin classes for kids.",
                description="Mandarin classes for kids.",
                sourceUrls=["https://phoenixchinesecenter.com/"],
                chineseSignal=[{"kind": "page_keyword_mandarin", "value": "Mandarin", "sourceUrl": "https://phoenixchinesecenter.com/"}],
            )
        )
        incomplete = mark_candidate(
            ScrapedBusinessCandidate(
                name_en="Incomplete Candidate",
                categorySlug="education",
                city="Phoenix",
                region="Greater Phoenix",
                shortDescription="Missing location and contact.",
                description="Missing location and contact.",
                sourceUrls=["https://example.test/"],
                chineseSignal=[{"kind": "page_keyword_chinese", "value": "Chinese", "sourceUrl": "https://example.test/"}],
            )
        )
        self.assertTrue(passes_trust_gate(complete))
        self.assertFalse(passes_trust_gate(incomplete))
        self.assertGreater(compute_completeness_score(complete), compute_completeness_score(incomplete))

    def test_site_export_maps_candidate_into_live_business_fixture(self) -> None:
        candidate = mark_candidate(
            ScrapedBusinessCandidate(
                name_en="Phoenix Chinese Center",
                name_zh="鳳凰城中文中心",
                categorySlug="education",
                city="Glendale",
                region="Greater Phoenix",
                address="6688 W Bell Rd, Glendale, AZ 85308",
                phone="623-581-3115",
                website="https://phoenixchinesecenter.com/",
                heroImage="https://phoenixchinesecenter.com/wp-content/uploads/2023/05/prep-course-0.jpg",
                gallery=["https://phoenixchinesecenter.com/wp-content/uploads/2024/08/4.png"],
                shortDescription="Mandarin classes for kids and adults.",
                description="Mandarin classes for kids and adults.",
                services=["Weekend Mandarin classes"],
                languages=["English", "Mandarin", "Traditional Chinese"],
                sourceUrls=["https://phoenixchinesecenter.com/"],
                chineseSignal=[{"kind": "page_keyword_mandarin", "value": "Mandarin", "sourceUrl": "https://phoenixchinesecenter.com/"}],
            )
        )
        business = candidate_to_business(candidate, 0, set())
        self.assertEqual(business["id"], "scraped_0001")
        self.assertEqual(business["slug"], "phoenix-chinese-center-glendale")
        self.assertEqual(business["name"]["zh"], "鳳凰城中文中心")
        self.assertEqual(business["status"], "live")
        self.assertEqual(business["verificationState"], "editor_verified")
        self.assertTrue(business["verified"])
        self.assertFalse(business["newcomerFriendly"])
        self.assertTrue(business["bilingual"])
        self.assertEqual(business["phone"], "(623) 581-3115")
        self.assertEqual(business["heroImage"], "https://phoenixchinesecenter.com/wp-content/uploads/2023/05/prep-course-0.jpg")
        self.assertEqual(business["gallery"], ["https://phoenixchinesecenter.com/wp-content/uploads/2024/08/4.png"])
        self.assertEqual(business["services"][0]["en"], "Weekend Mandarin classes")

    def test_extract_ranked_image_candidates_prefers_real_business_images(self) -> None:
        ranked = extract_ranked_image_candidates(
            """
            <html>
              <head>
                <meta property="og:image" content="/images/slot-jackpot-banner.jpg" />
              </head>
              <body>
                <img src="/images/dining-room.jpg" alt="Phoenix Noodle House dining room" width="1200" height="800" />
                <img src="https://images.unsplash.com/photo-123456" alt="restaurant interior" width="1600" height="900" />
              </body>
            </html>
            """,
            "https://phoenixnoodle.example/gallery",
            business_name="Phoenix Noodle House",
            page_context="https://phoenixnoodle.example/gallery",
        )
        self.assertTrue(ranked)
        self.assertEqual(ranked[0][1], "https://phoenixnoodle.example/images/dining-room.jpg")
        self.assertFalse(any("unsplash" in url for _, url in ranked))
        self.assertFalse(any("slot-jackpot" in url for _, url in ranked))

    def test_inspect_image_reference_flags_suspicious_patterns(self) -> None:
        award = inspect_image_reference("https://www.autumncourt.com/wp-content/uploads/2017/04/phoenix_winner.png")
        self.assertTrue(award.suspicious)
        self.assertIn("award_badge", award.reasons)

        stock = inspect_image_reference("https://img1.wsimg.com/isteam/stock/57799")
        self.assertTrue(stock.suspicious)
        self.assertIn("stock_or_generated_image", stock.reasons)

        thai_spam = inspect_image_reference(
            "https://diamondcntogo.com/wp-content/uploads/2025/09/ewo24-สล็อตออนไลน์-สนุกง่าย-ลุ้นโบนัสทุกวัน.webp"
        )
        self.assertTrue(thai_spam.suspicious)
        self.assertIn("spam_image", thai_spam.reasons)

        order_asset = inspect_image_reference("https://static.spotapps.co/website_images/ab_websites/287439_website_v1/order_left.jpg")
        self.assertTrue(order_asset.suspicious)
        self.assertIn("order_page_asset", order_asset.reasons)

        tiny_square = inspect_image_reference(
            "https://img.us980.com/p?r=115742091&s=hash&w=250&h=250"
        )
        self.assertTrue(tiny_square.suspicious)
        self.assertIn("tiny_square_image", tiny_square.reasons)

        insecure_http = inspect_image_reference(
            "http://www.ikkyutucson.com/wp-content/uploads/2017/01/DSC_0058-1024x681.jpg"
        )
        self.assertTrue(insecure_http.suspicious)
        self.assertIn("insecure_http_image", insecure_http.reasons)

    def test_discover_business_image_override_follows_relevant_internal_pages(self) -> None:
        pages = {
            "https://phoenixnoodle.example/menu": """
                <html>
                  <body>
                    <a href="/about">About us</a>
                    <a href="/gallery">Photo gallery</a>
                    <a href="/privacy">Privacy policy</a>
                    <img src="/assets/logo.png" alt="logo" width="120" height="40" />
                  </body>
                </html>
            """,
            "https://phoenixnoodle.example": """
                <html>
                  <body>
                    <a href="/gallery">Gallery</a>
                  </body>
                </html>
            """,
            "https://phoenixnoodle.example/gallery": """
                <html>
                  <head>
                    <meta property="og:image" content="/images/dining-room.jpg" />
                  </head>
                  <body>
                    <img src="/images/noodle-soup.jpg" alt="Phoenix Noodle House noodle soup" width="1200" height="900" />
                    <img src="/images/storefront.jpg" alt="Phoenix Noodle House storefront" width="1100" height="700" />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        override = discover_business_image_override(
            {
                "id": "scraped_9999",
                "slug": "phoenix-noodle-house",
                "name": {"en": "Phoenix Noodle House"},
                "website": "https://phoenixnoodle.example/menu",
                "heroImage": None,
                "status": "live",
            },
            fetcher=fetcher,
        )
        self.assertIsNotNone(override)
        assert override is not None
        self.assertEqual(override["heroImage"], "https://phoenixnoodle.example/images/dining-room.jpg")
        self.assertIn("https://phoenixnoodle.example/images/noodle-soup.jpg", override.get("gallery", []))
        self.assertIn("https://phoenixnoodle.example/images/storefront.jpg", override.get("gallery", []))

    def test_discover_business_image_override_uses_search_fallback_without_website(self) -> None:
        pages = {
            "https://www.restaurantji.com/az/mesa/example-noodle-house-/": """
                <html>
                  <head>
                    <meta property="og:image" content="https://cdn6.localdatacdn.com/images/9999999/d_example_noodle_house_photo.jpg" />
                  </head>
                  <body>
                    <img src="https://cdn6.localdatacdn.com/images/9999999/d_example_noodle_house_photo.jpg" alt="Example Noodle House dining room" width="1200" height="800" />
                    <img src="https://cdn6.localdatacdn.com/images/9999999/d_example_noodle_house_menu.jpg" alt="Example Noodle House menu" width="1200" height="800" />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        def searcher(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
            self.assertIn("Mesa", query)
            self.assertEqual(business_name, "Example Noodle House")
            self.assertIsNone(business_website)
            return [
                SearchResultPage(
                    title="Example Noodle House, Mesa - Photos and Reviews",
                    url="https://www.restaurantji.com/az/mesa/example-noodle-house-/",
                    page_score=82,
                )
            ]

        override = discover_business_image_override(
            {
                "id": "plaza_9998",
                "slug": "example-noodle-house-mesa",
                "name": {"en": "Example Noodle House"},
                "categorySlug": "dining",
                "city": "Mesa",
                "heroImage": None,
                "status": "live",
            },
            fetcher=fetcher,
            searcher=searcher,
        )
        self.assertIsNotNone(override)
        assert override is not None
        self.assertEqual(
            override["heroImage"],
            "https://cdn6.localdatacdn.com/images/9999999/d_example_noodle_house_photo.jpg",
        )

    def test_discover_business_image_override_uses_loc8nearme_for_non_dining_listing(self) -> None:
        pages = {
            "https://www.loc8nearme.com/arizona/chandler/example-gift-shop/7504462/": """
                <html>
                  <body>
                    <img
                      src="https://cdn10.localdatacdn.com/az/chandler/7504462/original/nDMtG5rn7d.jpg"
                      alt="Storefront photo"
                      width="1200"
                      height="800"
                    />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        def searcher(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
            self.assertIn("Chandler", query)
            self.assertEqual(business_name, "Example Gift Shop")
            return [
                SearchResultPage(
                    title="Example Gift Shop - Chandler, AZ",
                    url="https://www.loc8nearme.com/arizona/chandler/example-gift-shop/7504462/",
                    page_score=76,
                )
            ]

        override = discover_business_image_override(
            {
                "id": "plaza_9997",
                "slug": "example-gift-shop-chandler",
                "name": {"en": "Example Gift Shop"},
                "categorySlug": "shopping",
                "city": "Chandler",
                "heroImage": None,
                "status": "live",
            },
            fetcher=fetcher,
            searcher=searcher,
        )
        self.assertIsNotNone(override)
        assert override is not None
        self.assertEqual(
            override["heroImage"],
            "https://cdn10.localdatacdn.com/az/chandler/7504462/original/nDMtG5rn7d.jpg",
        )

    def test_discover_business_image_override_prefers_public_location_photo_over_official_award_badge(self) -> None:
        pages = {
            "https://autumncourt.example/": """
                <html>
                  <head>
                    <meta property="og:image" content="/uploads/phoenix_winner.png" />
                  </head>
                  <body>
                    <a href="/menu">Menu</a>
                  </body>
                </html>
            """,
            "https://autumncourt.example/menu": """
                <html>
                  <body>
                    <img src="/uploads/order_left.jpg" alt="Order online" width="1200" height="800" />
                  </body>
                </html>
            """,
            "https://www.restaurantji.com/az/phoenix/autumn-court-/": """
                <html>
                  <head>
                    <meta property="og:image" content="https://cdn6.localdatacdn.com/images/1234567/d_autumn_court_photo.jpg" />
                  </head>
                  <body>
                    <img src="https://cdn6.localdatacdn.com/images/1234567/d_autumn_court_photo.jpg" alt="Autumn Court dining room" width="1200" height="800" />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        def searcher(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
            self.assertIn("Phoenix", query)
            self.assertEqual(business_name, "Autumn Court")
            self.assertEqual(business_website, "https://autumncourt.example/")
            return [
                SearchResultPage(
                    title="Autumn Court - Phoenix, AZ",
                    url="https://www.restaurantji.com/az/phoenix/autumn-court-/",
                    page_score=82,
                )
            ]

        override = discover_business_image_override(
            {
                "id": "scraped_9995",
                "slug": "autumn-court-phoenix",
                "name": {"en": "Autumn Court"},
                "categorySlug": "dining",
                "city": "Phoenix",
                "website": "https://autumncourt.example/",
                "heroImage": "https://autumncourt.example/uploads/phoenix_winner.png",
                "status": "live",
            },
            fetcher=fetcher,
            searcher=searcher,
        )
        self.assertIsNotNone(override)
        assert override is not None
        self.assertEqual(
            override["heroImage"],
            "https://cdn6.localdatacdn.com/images/1234567/d_autumn_court_photo.jpg",
        )

    def test_discover_business_image_override_keeps_good_official_image_over_weaker_public_match(self) -> None:
        pages = {
            "https://phoenixtea.example/": """
                <html>
                  <head>
                    <meta property="og:image" content="/images/dining-room.jpg" />
                  </head>
                  <body>
                    <img src="/images/storefront.jpg" alt="Phoenix Tea House storefront" width="1200" height="800" />
                  </body>
                </html>
            """,
            "https://www.restaurantji.com/az/phoenix/phoenix-tea-house/": """
                <html>
                  <body>
                    <img src="https://cdn6.localdatacdn.com/images/7654321/d_phoenix_tea_house_menu.jpg" alt="menu" width="280" height="180" />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        def searcher(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
            self.assertIn("Phoenix", query)
            self.assertEqual(business_name, "Phoenix Tea House")
            return [
                SearchResultPage(
                    title="Phoenix Tea House photos",
                    url="https://www.restaurantji.com/az/phoenix/phoenix-tea-house/",
                    page_score=62,
                )
            ]

        override = discover_business_image_override(
            {
                "id": "scraped_9994",
                "slug": "phoenix-tea-house",
                "name": {"en": "Phoenix Tea House"},
                "categorySlug": "dining",
                "city": "Phoenix",
                "website": "https://phoenixtea.example/",
                "heroImage": "https://phoenixtea.example/uploads/old-logo.png",
                "status": "live",
            },
            fetcher=fetcher,
            searcher=searcher,
        )
        self.assertIsNotNone(override)
        assert override is not None
        self.assertEqual(
            override["heroImage"],
            "https://phoenixtea.example/images/dining-room.jpg",
        )

    def test_discover_business_image_override_prefers_location_photo_over_small_square_logo(self) -> None:
        pages = {
            "https://local.fedex.com/en-us/az/chandler/office-0745": """
                <html>
                  <head>
                    <meta property="og:image" content="https://dynl.mktgcdn.com/p/QvkhIrpoDicmnZRN1n-cJFJ5x6AK7me5Ua1FdME-6lc/150x150.png" />
                  </head>
                  <body>
                    <img src="https://dynl.mktgcdn.com/p/QvkhIrpoDicmnZRN1n-cJFJ5x6AK7me5Ua1FdME-6lc/150x150.png" alt="FedEx Office" width="150" height="150" />
                    <img src="https://dynl.mktgcdn.com/p/68gOLh77sL4AJ05y6ZdbZrfP6jaYht8sMQLUKKoUorQ/400x215.jpg" alt="Print and shipping center" width="400" height="215" />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        def searcher(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
            self.assertIn("Chandler", query)
            self.assertEqual(business_name, "FedEx Office")
            return [
                SearchResultPage(
                    title="FedEx Office - Chandler, AZ",
                    url="https://local.fedex.com/en-us/az/chandler/office-0745",
                    page_score=74,
                )
            ]

        override = discover_business_image_override(
            {
                "id": "plaza_9996",
                "slug": "fedex-office-chandler",
                "name": {"en": "FedEx Office"},
                "categorySlug": "local-services",
                "city": "Chandler",
                "heroImage": None,
                "status": "live",
            },
            fetcher=fetcher,
            searcher=searcher,
        )
        self.assertIsNotNone(override)
        assert override is not None
        self.assertEqual(
            override["heroImage"],
            "https://dynl.mktgcdn.com/p/68gOLh77sL4AJ05y6ZdbZrfP6jaYht8sMQLUKKoUorQ/400x215.jpg",
        )

    def test_discover_business_image_override_rejects_unrelated_trusted_directory_page(self) -> None:
        pages = {
            "https://www.restaurantji.com/az/tucson/nan-tian-bbq-gourmet-/": """
                <html>
                  <body>
                    <img
                      src="https://cdn6.localdatacdn.com/images/6035104/d_nan_tian_bbq_gourmet_photo.jpg"
                      alt="Nan Tian BBQ Gourmet storefront"
                      width="1200"
                      height="800"
                    />
                  </body>
                </html>
            """,
        }

        def fetcher(url: str) -> FetchedPage | None:
            html = pages.get(url)
            if not html:
                return None
            return FetchedPage(requested_url=url, url=url, html=html)

        def searcher(query: str, business_name: str, business_website: str | None = None) -> list[SearchResultPage]:
            self.assertIn("Tucson", query)
            self.assertEqual(business_name, "Lee Lee Oriental Supermarket")
            return [
                SearchResultPage(
                    title="Nan Tian BBQ Gourmet - Tucson, AZ",
                    url="https://www.restaurantji.com/az/tucson/nan-tian-bbq-gourmet-/",
                    page_score=82,
                )
            ]

        override = discover_business_image_override(
            {
                "id": "plaza_9993",
                "slug": "lee-lee-oriental-supermarket-tucson",
                "name": {"en": "Lee Lee Oriental Supermarket"},
                "categorySlug": "shopping",
                "city": "Tucson",
                "heroImage": None,
                "status": "live",
            },
            fetcher=fetcher,
            searcher=searcher,
        )

        self.assertIsNone(override)

    def test_generate_directory_image_overrides_writes_audit_for_unresolved_and_replaced_images(self) -> None:
        businesses = [
            {
                "id": "plaza_0001",
                "slug": "missing-shop-mesa",
                "name": {"en": "Missing Shop"},
                "categorySlug": "shopping",
                "city": "Mesa",
                "status": "live",
                "heroImage": None,
                "website": None,
            },
            {
                "id": "scraped_0002",
                "slug": "suspicious-cafe-phoenix",
                "name": {"en": "Suspicious Cafe"},
                "categorySlug": "dining",
                "city": "Phoenix",
                "status": "live",
                "heroImage": "https://static.spotapps.co/website_images/ab_websites/287439_website_v1/order_left.jpg",
                "website": "https://suspiciouscafe.example/",
            },
        ]

        safe_hero = "https://cdn6.localdatacdn.com/images/9999999/d_suspicious_cafe_photo.jpg"
        safe_source_page = "https://www.restaurantji.com/az/phoenix/suspicious-cafe/"

        def resolver(business: dict[str, object]) -> ImageOverrideDiscovery | None:
            if business["slug"] != "suspicious-cafe-phoenix":
                return None
            return ImageOverrideDiscovery(
                override={"heroImage": safe_hero},
                chosen_source_page=safe_source_page,
                hero_score=144,
                hero_assessment=inspect_image_reference(
                    safe_hero,
                    business_name="Suspicious Cafe",
                    page_url=safe_source_page,
                    page_context=safe_source_page,
                ),
            )

        with TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            source_path = temp_root / "generated-directory-businesses.json"
            override_path = temp_root / "generated-business-image-overrides.json"
            audit_path = temp_root / "business-image-audit.json"
            source_path.write_text(json.dumps(businesses), encoding="utf-8")

            result = generate_directory_image_overrides(
                source_path=source_path,
                destination=override_path,
                audit_destination=audit_path,
                resolver=resolver,
                max_workers=1,
            )

            self.assertNotIn("missing-shop-mesa", result.overrides)
            self.assertEqual(result.overrides["suspicious-cafe-phoenix"]["heroImage"], safe_hero)

            audit_payload = json.loads(audit_path.read_text(encoding="utf-8"))
            audit_by_slug = {row["slug"]: row for row in audit_payload}

            self.assertEqual(audit_by_slug["missing-shop-mesa"]["outcome"], "needs_manual_review")
            self.assertEqual(audit_by_slug["missing-shop-mesa"]["reasons"], ["missing_current_image", "no_candidate_found"])
            self.assertIsNone(audit_by_slug["missing-shop-mesa"]["proposedHeroUrl"])

            self.assertEqual(audit_by_slug["suspicious-cafe-phoenix"]["outcome"], "replaced_suspicious")
            self.assertEqual(audit_by_slug["suspicious-cafe-phoenix"]["proposedHeroUrl"], safe_hero)
            self.assertEqual(audit_by_slug["suspicious-cafe-phoenix"]["chosenSourcePage"], safe_source_page)
            self.assertIn("suspicious_current_image", audit_by_slug["suspicious-cafe-phoenix"]["reasons"])
            self.assertIn("order_page_asset", audit_by_slug["suspicious-cafe-phoenix"]["reasons"])

    def test_should_keep_generated_override_accepts_official_page_cdn_image(self) -> None:
        business = {
            "slug": "official-cdn-academy-phoenix",
            "name": {"en": "Official CDN Academy"},
            "city": "Phoenix",
            "website": "https://officialcdna.example/gallery",
        }
        discovery = ImageOverrideDiscovery(
            override={
                "heroImage": "https://images.squarespace-cdn.com/content/v1/1234567890/headshot.jpg",
            },
            chosen_source_page="https://officialcdna.example/gallery",
            hero_score=138,
            hero_assessment=inspect_image_reference(
                "https://images.squarespace-cdn.com/content/v1/1234567890/headshot.jpg",
                business_name="Official CDN Academy",
                page_url="https://officialcdna.example/gallery",
                page_context="https://officialcdna.example/gallery",
            ),
        )

        self.assertTrue(should_keep_generated_override(business, discovery))


if __name__ == "__main__":
    unittest.main()
