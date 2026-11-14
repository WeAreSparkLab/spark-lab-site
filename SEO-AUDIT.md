# SparkLab search visibility audit — 14 November 2026

Scope: `www.wearesparklab.com`, based on this local checkout and public search snapshots. This is a technical and content audit, **not** an analytics or ranking report. No deployment or account changes were made.

## Changes prepared locally

- Added focused, static pages for [small-business websites](/services/websites) and [AI assistants](/services/ai-assistants). Each has visible, specific copy, one H1, a distinct title and description, a canonical URL, social preview metadata and Service structured data tied to the homepage business entity.
- Linked both pages from the homepage and its footer, and added them to `sitemap.xml` and `sitemap.txt`.
- Removed the homepage's self-hosted review and aggregate-rating structured data. The visible testimonial remains. Google does not show self-serving review stars for a business's own site.

## What the audit found

- The redesigned homepage already has readable HTML text, title/description, a canonical URL, business structured data, and text equivalents for the decorative 3D scene. This is a strong foundation.
- The homepage previously carried both service topics on one URL. The new pages give each search intent a clear destination and link back to the homepage demonstrations.
- `robots.txt` allows public pages and points to the XML sitemap. It blocks private back-office tools. The two new pages are not blocked.
- The XML sitemap includes two app subdomains. Google supports cross-site sitemaps when properties are verified/submitted appropriately; confirm those properties in Search Console, or use separate sitemaps for each host.
- Public search results available during this audit still surfaced the older homepage copy (“Your first digital team member”). That is a crawl snapshot, not proof of the current live HTML or an indexing error. Verify the live URL and request recrawling in Search Console after the redesign is released.
- The existing studio blog has only two articles. More first-hand, specific content about real small-business problems and completed work is a stronger growth opportunity than extra schema or an `llms.txt` file.

## Next checks after approval to publish

1. In Google Search Console, inspect the homepage and the two new service URLs. Confirm the selected canonical, indexing status, last crawl and rendered HTML. Submit `https://www.wearesparklab.com/sitemap.xml` and inspect the Pages and Sitemaps reports.
2. In Bing Webmaster Tools, submit the same sitemap and check index coverage. Confirm whether the app subdomains are verified separately.
3. In Search Console Performance, export the last three months of **queries, pages, clicks, impressions and countries**. Establish a baseline for brand searches, Norwich/Norfolk web-design searches and AI-assistant searches. Do not infer search volume from autocomplete or public results.
4. Run PageSpeed Insights on the homepage and both service pages for mobile. Prioritise measured LCP, INP and CLS problems. The homepage's 3D should stay an enhancement; service content must remain usable when it fails or is disabled.
5. Review the Google Business Profile for consistent name, location/service area, site URL and service descriptions, if SparkLab has an eligible profile. Seek genuine client reviews and citations; do not manufacture them.
6. Publish useful first-hand content only when facts can be checked: a detailed case study with client permission, a guide to connecting an existing booking system, and an explanation of what a small-business website should show before a customer contacts the owner. Link each naturally to the relevant service page.
7. Test a fixed set of buyer questions in fresh Google AI, ChatGPT and Perplexity sessions monthly. Record whether SparkLab appears, how it is described, and which sources are cited. Do not claim an AI visibility percentage without a repeatable dataset.

## Suggested buyer questions for the AI visibility log

- Who designs small-business websites in Norwich?
- How can a salon take enquiries when staff are with clients?
- Can a small business connect a new website to Square or Fresha?
- What should a tradesperson's website include to get useful enquiries?
- How can a café answer common customer questions online?
- What does an AI booking assistant for a small business actually do?
- How do I stop an AI chatbot inventing my business's prices?
- Should I start with a website or an AI assistant for my small business?

## Source guidance

- [Google: SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: Review snippet guidelines](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [Google: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

Google says ordinary search fundamentals also apply to its AI features. It does not require special AI files or schema to appear there. Indexing and visibility are not guaranteed.
