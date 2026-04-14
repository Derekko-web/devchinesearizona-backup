# ChineseArizona.com: Product Strategy & Technical Architecture

## 1. Market and Product Research

### Target Audience & Personas
1. **The Taiwanese Relocator (TSMC/Tech):** Moving from Taiwan or California. High income, values efficiency, modern design, and high-signal information. Needs housing, Mandarin-speaking realtors, tax info, schools for kids.
2. **The Established Local Family:** Has lived in AZ for years. Looking for authentic new restaurants, weekend events, Asian grocers, and community networking.
3. **The New Student (ASU/UofA):** Needs reliable sublets, used cars, part-time jobs, and cheap eats.
4. **The Local Business Owner:** Wants to reach the Chinese/Taiwanese demographic but may lack tech savvy. Needs an easy way to claim listings and build trust.

### Newcomer Pain Points
* Information fragmentation (WeChat groups are closed/ephemeral; Facebook groups are noisy/spammy; old directories are outdated).
* Lack of trusted, bilingual service providers (plumbers, mechanics, lawyers).
* "Desert Shock" — adapting to AZ's climate, housing style, and spread-out geography compared to Taipei or the Bay Area.

### Why They Trust Us
* Clean, modern UI (unlike early-2000s forums).
* High signal-to-noise ratio (curated listings, verified businesses).
* Bilingual support (Traditional Chinese, Simplified Chinese, English) so cross-generational families can use it.

### Editorial vs. Directory
* **Directory:** High-intent utility (e.g., "Find a Chinese-speaking CPA in Chandler").
* **Editorial (Newcomer Guides/News):** Top-of-funnel discovery (e.g., "The Complete Guide to Moving to Chandler, AZ from California"). This drives organic SEO and repeat visits.

---

## 2. Brand and Design Direction

### Visual Identity
* **Vibe:** Trustworthy, crisp, welcoming. High-contrast typography with generous whitespace avoiding the cramped "yellow pages" look of older Asian diasporic sites.
* **Palette:**
  * **Primary Palette (Trust):** Deep Indigo (#1E3A8A) and Desert Sky Blue (#3B82F6). Communicates safety, professionalism, and reliability.
  * **Accent Palette (Warmth/Action):** Sunset Orange (#F97316) and Red-Orange (#EF4444). Used sparingly for CTAs, badges, and important alerts. Reflects Arizona's landscape and cultural warmth.
  * **Neutral Palette (Backgrounds):** Slate Gray (#F8FAFC, #E2E8F0) and Charcoal text (#1E293B). Clean layout.
* **Typography:** Inter or Roboto (English) paired with Noto Sans TC/SC (Chinese). Modern, legible sans-serifs that render beautifully across scripts.
* **UI Elements:** Rounded corners (8px-12px) for cards, soft drop shadows, mobile-first bottom navigation (or accessible hamburger menu).
* **Trust Signals:** "Verified Business" checkmarks, user ratings, date of last information update, and explicit categorization.

---

## 3. Site Structure and Information Architecture

### Sitemap Roadmap
* **Home:** Search bar, Top Categories, Featured Guides, Recent Community Events.
* **Directory Index:** 
  * Real Estate & Housing (Top priority for TSMC/CA transplants)
  * Healthcare & Medical
  * Legal & Financial (Immigration, Tax)
  * Food & Dining (Restaurants, Groceries)
  * Home Services (Contractors, AC repair)
  * Auto Services
* **Newcomer Guide (Editorial):** "Moving to AZ", "School Districts", "Driver's Licenses", "Utilities Setup".
* **Community:** Events Calendar, Articles/News, Classifieds (Housing/Jobs).

### High-Priority Launch Categories
1. Housing / Real Estate / Mortgages
2. Relocation Services / Moving Companies
3. Authentic Restaurants & Groceries
4. Legal (Immigration & Business) & CPA

---

## 4. Homepage and Key Page Layouts

**Homepage Layout Logic:**
1. **Hero Section:** Large, welcoming image of AZ. High-contrast search bar ("What are you looking for?") + Location filter.
2. **Quick Links / Category Grid:** Icon-based grid of the top 8 categories (Food, Housing, Medical, etc.).
3. **Newcomer Spotlight:** 3-card carousel of "Essential Guides for Moving to AZ."
4. **Trending/Featured Businesses:** Trust-building highlights of highly rated local services.
5. **Upcoming Events:** Community heartbeat.

**Directory Landing Page:** Map view on the right (desktop) / toggle on mobile. List of cards with thumbnail, name (en/zh), rating, location tags, and 2 key features.

---

## 5. Technical Architecture

### Stack Selection (Opinionated)
* **Frontend:** **Next.js (App Router)** + **Tailwind CSS**.
  * *Why:* SSR for phenomenal SEO, fast loading times, and incredibly robust ecosystem. Perfect for a content/directory hybrid.
* **Backend & Database:** **Supabase** (PostgreSQL).
  * *Why:* Relational data is mandatory for a directory (Businesses -> Reviews -> Users -> Categories). Supabase provides Auth (including OAuth/social login), Row Level Security, and edge functions natively.
* **Search:** **Algolia** or **Typesense**.
  * *Why:* Fast, typo-tolerant search in both English and Pinyin/Chinese. Essential for user experience.
* **CMS (Editorial):** **Sanity.io** or **Strapi**.
  * *Why:* Headless CMS separates editorial content (Newcomer Guides) from the hardcore directory app structure.
* **Hosting:** **Vercel** (Frontend) + **Supabase Cloud** (DB).
* **i18n:** `next-intl` for routing and translating static UI across `en`, `zh-TW`, and `zh-CN`.

### Data Modeling (Core Entities)
* `Business`: id, name_en, name_zh, description, phone, address, lat, lng, is_verified, tier (free/sponsored).
* `Category`: id, slug, name_en, name_zh, icon.
* `Business_Category`: Join table.
* `Review`: id, user_id, business_id, rating, content, created_at.
* `User`: id, auth_id, name, avatar_url, role (admin, business_owner, user).

---

## 6. SEO and Growth Strategy

### Strategy Vectors
1. **Programmatic SEO (Directory):** 
   * Auto-generate pages for `{Category} in {City}` (e.g., "Chinese CPAs in Chandler", "Taiwanese Restaurants in Tempe").
   * Optimize URL slugs: `/directory/chandler/cpa`.
   * **Schema Markup:** Inject `LocalBusiness`, `Review`, and `BreadcrumbList` JSON-LD on every listing.
2. **Content SEO (Editorial):**
   * Target long-tail newcomer queries: "How to transfer California driver license to Arizona", "Best school districts near TSMC Phoenix". 
   * These guides generate backlinks naturally.
3. **Bilingual Search:**
   * Implement `hreflang` tags correctly.
   * Ensure search works for users typing Pinyin or localized terms.
4. **Growth Loop:**
   * Claim your listing: Reach out to existing businesses with a pre-filled, beautiful profile they can "claim" by making an account.

---

*This document outlines the master blueprint. The next step is a live visual prototype.*