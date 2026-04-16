from __future__ import annotations

import unittest

from scripts.signal_desk.pipeline import build_signal_desk_exports


class SignalDeskPipelineTests(unittest.TestCase):
    def test_build_signal_desk_exports_generates_local_articles_and_queue(self) -> None:
        sources = [
            {
                "slug": "phoenix-sky-harbor",
                "name": "Phoenix Sky Harbor",
                "url": "https://www.skyharbor.com/",
                "sourceType": "airport_newsroom",
                "personaTargets": ["local_families"],
                "allowedUse": "summary_link",
                "cadence": "weekly",
                "destinationSurface": "community_news",
            }
        ]
        signals = [
            {
                "id": "sig_route_watch_1",
                "slug": "route-watch-sample",
                "sourceSlug": "phoenix-sky-harbor",
                "destinationSurface": "community_news",
                "series": "route-watch",
                "category": "news",
                "freshnessTier": "weekly",
                "sourcePolicy": "summary_link",
                "title": {"en": "Route Watch Sample", "zh": "航線觀察示例"},
                "excerpt": {"en": "Short summary", "zh": "簡短摘要"},
                "body": [
                    {
                        "en": "Paragraph one.",
                        "zh": "第一段。",
                    }
                ],
                "heroImage": "https://images.unsplash.com/example.jpg",
                "publishedAt": "2026-04-10T10:00:00.000Z",
                "updatedAt": "2026-04-10T10:00:00.000Z",
                "personaTargets": ["local_families"],
                "relatedCategorySlugs": ["travel"],
                "ctaBusinessSlugs": ["lotus-travel-center"],
                "sourceLinks": [
                    {
                        "label": {"en": "Phoenix Sky Harbor", "zh": "鳳凰城機場"},
                        "url": "https://www.skyharbor.com/",
                        "source": "Phoenix Sky Harbor",
                    }
                ],
                "authorProfileSlug": "phoenix-community-team",
                "reviewStatus": "approved",
                "reviewNotes": ["Ready to publish."],
            }
        ]

        local_articles, queue_items, summary = build_signal_desk_exports(sources, signals)

        self.assertEqual(summary["publishedCount"], 1)
        self.assertEqual(summary["queuedCount"], 0)
        self.assertEqual(local_articles[0]["series"], "route-watch")
        self.assertEqual(local_articles[0]["sourcePolicy"], "summary_link")
        self.assertEqual(local_articles[0]["ctaBusinessSlugs"], ["lotus-travel-center"])
        self.assertEqual(queue_items[0]["sourceName"], "Phoenix Sky Harbor")
        self.assertGreaterEqual(queue_items[0]["priorityScore"], 1)

    def test_duplicate_signal_slug_raises(self) -> None:
        sources = [
            {
                "slug": "tiktok-phoenix-food",
                "name": "TikTok Phoenix Food",
                "url": "https://www.tiktok.com/tag/phoenixfood",
                "sourceType": "social_signal",
                "personaTargets": ["students"],
                "allowedUse": "signal_only",
                "cadence": "daily",
                "destinationSurface": "community_news",
            }
        ]
        base_signal = {
            "id": "sig_food_1",
            "slug": "same-slug",
            "sourceSlug": "tiktok-phoenix-food",
            "destinationSurface": "community_news",
            "series": "trend-radar",
            "category": "news",
            "freshnessTier": "weekly",
            "sourcePolicy": "signal_only",
            "title": {"en": "Food watch", "zh": "美食觀察"},
            "excerpt": {"en": "Summary", "zh": "摘要"},
            "body": [{"en": "Paragraph", "zh": "段落"}],
            "heroImage": "https://images.unsplash.com/example.jpg",
            "publishedAt": "2026-04-11T10:00:00.000Z",
            "personaTargets": ["students"],
            "relatedCategorySlugs": ["dining"],
            "ctaBusinessSlugs": ["taste-of-taiwan"],
            "sourceLinks": [
                {
                    "label": {"en": "TikTok", "zh": "TikTok"},
                    "url": "https://www.tiktok.com/tag/phoenixfood",
                    "source": "TikTok",
                }
            ],
            "reviewStatus": "approved",
            "reviewNotes": ["Ready"],
        }

        with self.assertRaisesRegex(ValueError, "Duplicate signal slug"):
            build_signal_desk_exports(sources, [base_signal, dict(base_signal, id="sig_food_2")])

    def test_signal_only_source_cannot_publish_as_republish(self) -> None:
        sources = [
            {
                "slug": "tiktok-phoenix-food",
                "name": "TikTok Phoenix Food",
                "url": "https://www.tiktok.com/tag/phoenixfood",
                "sourceType": "social_signal",
                "personaTargets": ["students"],
                "allowedUse": "signal_only",
                "cadence": "daily",
                "destinationSurface": "community_news",
            }
        ]
        signals = [
            {
                "id": "sig_food_3",
                "slug": "food-signal-bad-policy",
                "sourceSlug": "tiktok-phoenix-food",
                "destinationSurface": "community_news",
                "series": "trend-radar",
                "category": "news",
                "freshnessTier": "weekly",
                "sourcePolicy": "republish_with_permission",
                "title": {"en": "Food watch", "zh": "美食觀察"},
                "excerpt": {"en": "Summary", "zh": "摘要"},
                "body": [{"en": "Paragraph", "zh": "段落"}],
                "heroImage": "https://images.unsplash.com/example.jpg",
                "publishedAt": "2026-04-11T10:00:00.000Z",
                "personaTargets": ["students"],
                "relatedCategorySlugs": ["dining"],
                "ctaBusinessSlugs": ["taste-of-taiwan"],
                "sourceLinks": [
                    {
                        "label": {"en": "TikTok", "zh": "TikTok"},
                        "url": "https://www.tiktok.com/tag/phoenixfood",
                        "source": "TikTok",
                    }
                ],
                "reviewStatus": "approved",
                "reviewNotes": ["Ready"],
            }
        ]

        with self.assertRaisesRegex(ValueError, "must stay signal_only"):
            build_signal_desk_exports(sources, signals)


if __name__ == "__main__":
    unittest.main()
