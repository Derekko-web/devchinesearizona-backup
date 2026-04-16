from __future__ import annotations

import unittest

from scripts.article_ingest.pipeline import _extract_paragraphs, post_to_article


class ArticleIngestTests(unittest.TestCase):
    def test_extract_paragraphs_strips_embedded_media_noise(self) -> None:
        html = """
        <p>Hello <strong>world</strong>.</p>
        <section><img src="data:image/jpeg;base64,abc123" alt="" /></section>
        <p>Second paragraph &amp; more.</p>
        """
        paragraphs = _extract_paragraphs(html)

        self.assertEqual(paragraphs, ["Hello world.", "Second paragraph & more."])

    def test_post_to_article_maps_wordpress_post(self) -> None:
        post = {
            "id": 39440,
            "slug": "39440",
            "link": "https://www.sunbirdarizona.com/2026/03/07/39440/",
            "date_gmt": "2026-03-08T05:54:18",
            "modified_gmt": "2026-03-08T06:18:13",
            "title": {"rendered": "Global Ties Arizona举办农历新年庆典"},
            "excerpt": {"rendered": "<p>这是摘要。</p>"},
            "content": {
                "rendered": "<p>第一段。</p><p>Second paragraph.</p>"
            },
            "_embedded": {
                "wp:featuredmedia": [
                    {
                        "source_url": "https://www.sunbirdarizona.com/wp-content/uploads/example.jpg"
                    }
                ],
                "wp:term": [
                    [
                        {
                            "taxonomy": "category",
                            "slug": "cncommunity",
                        }
                    ]
                ],
            },
        }

        article = post_to_article(post)

        self.assertEqual(article["slug"], "global-ties-arizona-39440")
        self.assertEqual(article["sourceId"], "39440")
        self.assertEqual(article["sourceName"], "Sunbird Arizona")
        self.assertEqual(article["sourceUrl"], post["link"])
        self.assertEqual(article["heroImage"], "https://www.sunbirdarizona.com/wp-content/uploads/example.jpg")
        self.assertEqual(article["category"], "news")
        self.assertEqual(article["series"], "community-wire")
        self.assertEqual(article["freshnessTier"], "archive")
        self.assertEqual(article["sourcePolicy"], "republish_with_permission")
        self.assertEqual(article["sourceLinks"][0]["url"], post["link"])
        self.assertEqual(article["body"][0]["zh"], "第一段。")
        self.assertEqual(article["body"][1]["en"], "Second paragraph.")


if __name__ == "__main__":
    unittest.main()
