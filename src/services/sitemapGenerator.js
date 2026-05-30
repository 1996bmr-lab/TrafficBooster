// Lightweight crawler that walks same-domain links from a starting URL
// (breadth-first, bounded) and emits a valid XML sitemap.

import * as cheerio from "cheerio";
import { fetchPage, normalizeUrl } from "../utils/fetcher.js";

export async function generateSitemap(startUrl, options = {}) {
  const maxPages = Math.min(options.maxPages ?? 25, 100);
  const start = normalizeUrl(startUrl);
  const origin = start.origin;

  const visited = new Set();
  const queue = [start.toString()];
  const found = [];
  const errors = [];

  while (queue.length && found.length < maxPages) {
    const current = queue.shift();
    const normalized = current.split("#")[0];
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    let page;
    try {
      page = await fetchPage(normalized);
    } catch (err) {
      errors.push({ url: normalized, error: err.message });
      continue;
    }

    if (!page.ok) {
      errors.push({ url: normalized, error: `HTTP ${page.status}` });
      continue;
    }

    const lastmod = page.headers.get("last-modified");
    found.push({
      loc: page.url,
      lastmod: lastmod ? new Date(lastmod).toISOString() : new Date().toISOString(),
    });

    if (!page.body) continue;
    const $ = cheerio.load(page.body);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href || href.startsWith("#")) return;
      try {
        const u = new URL(href, page.url);
        u.hash = "";
        if (u.origin === origin && !visited.has(u.toString()) && /^https?:/.test(u.protocol)) {
          queue.push(u.toString());
        }
      } catch {
        /* ignore */
      }
    });
  }

  const xml = buildXml(found);
  return { origin, pageCount: found.length, urls: found, errors, xml };
}

function buildXml(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

function escapeXml(s = "") {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
