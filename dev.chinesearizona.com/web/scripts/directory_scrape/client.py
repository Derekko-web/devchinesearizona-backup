from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig, HTTPCrawlerConfig
from crawl4ai.async_crawler_strategy import AsyncHTTPCrawlerStrategy

from .utils import normalize_url


@dataclass
class PageSnapshot:
    requested_url: str
    url: str
    html: str
    markdown: str
    metadata: dict[str, Any]
    status_code: int


class Crawl4AIHTTPClient:
    def __init__(self, batch_size: int = 12):
        self.batch_size = batch_size

    async def fetch_many(self, urls: list[str]) -> dict[str, PageSnapshot]:
        unique_urls = list(dict.fromkeys(urls))
        if not unique_urls:
            return {}
        snapshots: dict[str, PageSnapshot] = {}
        strategy = AsyncHTTPCrawlerStrategy(
            HTTPCrawlerConfig(
                headers={
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
                }
            )
        )
        run_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            check_robots_txt=True,
            verbose=False,
            mean_delay=0.15,
            max_range=0.3,
            page_timeout=30000,
            semaphore_count=6,
        )
        async with AsyncWebCrawler(crawler_strategy=strategy) as crawler:
            for start in range(0, len(unique_urls), self.batch_size):
                batch = unique_urls[start : start + self.batch_size]
                request_lookup: dict[str, str] = {}
                for requested_url in batch:
                    normalized = normalize_url(requested_url) or requested_url
                    request_lookup[normalized] = requested_url
                    request_lookup[normalized.rstrip("/")] = requested_url
                results = await crawler.arun_many(urls=batch, config=run_config)
                for result in results:
                    if not result.success or (result.status_code and result.status_code >= 400) or not result.html:
                        continue
                    normalized_result_url = normalize_url(result.url) or result.url
                    requested_url = request_lookup.get(normalized_result_url) or request_lookup.get(normalized_result_url.rstrip("/")) or result.url
                    snapshots[requested_url] = PageSnapshot(
                        requested_url=requested_url,
                        url=result.url,
                        html=result.html,
                        markdown=result.markdown or "",
                        metadata=result.metadata or {},
                        status_code=result.status_code or 0,
                    )
        return snapshots

    async def fetch(self, url: str) -> PageSnapshot | None:
        return (await self.fetch_many([url])).get(url)
