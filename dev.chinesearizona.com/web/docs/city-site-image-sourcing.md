# City Site Image Sourcing

ChineseAustin, ChineseLosAngeles, and ChineseSFBay must not show generic placeholder art on public directory pages.

Image resolution follows this order:

1. Use listing-provided `heroImage` and `gallery` values when a source has supplied them.
2. Use a curated static image in `public/city-site-images/` when the image is business-specific or organization-specific.
3. Use the site's neutral city guide imagery when no allowed business-specific image is available.

Neutral city guide imagery is contextual only. It must not be described as a real storefront, staff photo, menu item, event photo, or business-owned image unless that sourcing is known. Alt text for those fallbacks should identify the image as a city or category guide image.

Do not add fallback image behavior for `dev.chinesearizona.com` or the main ChineseArizona domain as part of non-Arizona city image work. Arizona image behavior remains controlled by its own directory assets and replacement pipeline.

Before adding a real remote image, confirm that it is publicly available for reuse in this context or comes from a business-owned/public source that allows display. If that cannot be confirmed, use neutral static or generated imagery instead.
