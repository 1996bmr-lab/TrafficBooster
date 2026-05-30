# 🚀 TrafficBooster

A web application toolkit of features and functions you can run to **boost a
website's search-engine ranking and organic traffic**. It's a white-hat SEO
suite: it analyzes real pages and generates optimization assets — it does **not**
fake traffic, click bots, or game metrics (those tactics get sites penalized).

![Node](https://img.shields.io/badge/node-%E2%89%A518-3c873a) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

| Tool | What it does | How it boosts traffic |
| --- | --- | --- |
| **SEO Audit** | Crawls a page and grades 13 on-page ranking signals (title, meta, headings, alt text, canonical, viewport, HTTPS, structured data, speed…) with a prioritized fix list. | Fixing on-page issues directly improves rankings. |
| **Keyword Analyzer** | Keyword density + top 1/2/3-word phrases for a URL or pasted text, and scores your target keywords (missing / sparse / good / over-optimized). | Target the right terms without keyword stuffing. |
| **Meta Tag Generator** | Produces optimized `<title>`, meta description, canonical, Open Graph & Twitter Card tags. | Better snippets & social previews lift click-through rate. |
| **Sitemap Generator** | Breadth-first crawls same-domain links and emits a valid `sitemap.xml`. | Helps search engines discover & index every page. |
| **Robots.txt Generator** | Builds a `robots.txt` with allow/disallow rules, crawl-delay & sitemap reference. | Guides crawl budget to the pages that matter. |
| **Broken Link Checker** | Scans a page's links and flags broken ones (with HTTP status). | Removing dead links improves UX & crawl efficiency. |
| **Readability Analyzer** | Flesch Reading Ease & Flesch–Kincaid grade level with improvement tips. | Readable content increases dwell time & engagement. |
| **Schema Generator** | JSON-LD for Organization, LocalBusiness, Article, Product, Website, FAQ, Breadcrumb. | Rich results stand out and earn more clicks. |

## Quick start

```bash
npm install
npm start
# open http://localhost:3000
```

Development with auto-reload:

```bash
npm run dev
```

Run the tests:

```bash
npm test
```

## API

All tools are also available as a JSON API (handy for CI or automation):

| Method | Endpoint | Body |
| --- | --- | --- |
| `GET` | `/api/tools` | — |
| `POST` | `/api/audit` | `{ "url": "example.com" }` |
| `POST` | `/api/keywords` | `{ "url" or "text", "targets": ["..."] }` |
| `POST` | `/api/meta` | `{ "title", "description", "url", "image", ... }` |
| `POST` | `/api/sitemap` | `{ "url", "maxPages": 25 }` |
| `POST` | `/api/robots` | `{ "allowAll", "disallowPaths": [], "sitemapUrl" }` |
| `POST` | `/api/links` | `{ "url", "maxLinks": 40 }` |
| `POST` | `/api/readability` | `{ "url" or "text" }` |
| `POST` | `/api/schema` | `{ "kind": "article", ... }` |

Example:

```bash
curl -s -X POST http://localhost:3000/api/audit \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}' | jq
```

## Deploying to Cloudflare Workers

The app also runs as a Cloudflare Worker (static dashboard + `/api` routes),
configured in `wrangler.toml`.

```bash
npm install
npm run deploy        # npx wrangler deploy
npm run cf:dev        # run the Worker locally (wrangler dev)
```

**Cloudflare "Build" settings** for the connected Git repo:

| Setting | Value |
| --- | --- |
| Build command | `npm ci` (so `wrangler` can bundle dependencies) |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | your default branch (e.g. `main`) |

The Worker serves `public/` via the static-assets binding and handles
`/api/*` with the same services as the Node server, so behavior is identical.

## Architecture

```
server.js              Express app for local Node dev (npm start)
src/
  worker.js            Cloudflare Worker entry (fetch handler + ASSETS)
  dispatch.js          Shared tool dispatch used by server.js AND worker.js
  routes/api.js        Express routes -> dispatch
  services/            One module per tool (framework-agnostic)
  utils/fetcher.js     Safe fetch with timeouts + SSRF guard
public/                Dashboard UI (vanilla HTML/CSS/JS)
wrangler.toml          Cloudflare Worker + static-assets config
test/                  node:test unit tests
```

## Safety & ethics

- Only fetches **public `http(s)` URLs** — loopback, private, and link-local
  addresses are blocked (SSRF protection).
- Identifies itself honestly via User-Agent and is built for the sites **you
  own or are authorized to analyze**.
- Implements only **white-hat** techniques recommended by search engines. No
  cloaking, link schemes, or artificial traffic.

## License

MIT
