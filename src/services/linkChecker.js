// Scans a page for links and checks each one's HTTP status so you can
// fix broken links (which waste crawl budget and hurt UX/rankings).

import * as cheerio from "cheerio";
import { fetchPage, normalizeUrl } from "../utils/fetcher.js";

export async function checkLinks(pageUrl, options = {}) {
  const maxLinks = Math.min(options.maxLinks ?? 40, 100);
  const page = await fetchPage(pageUrl);
  if (!page.body) throw new Error("No HTML found at that URL.");

  const $ = cheerio.load(page.body);
  const base = new URL(page.url);
  const seen = new Set();
  const links = [];

  $("a[href]").each((_, el) => {
    if (links.length >= maxLinks) return;
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
      return;
    let abs;
    try {
      abs = new URL(href, base);
      abs.hash = "";
    } catch {
      return;
    }
    if (!/^https?:/.test(abs.protocol)) return;
    const key = abs.toString();
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ url: key, internal: abs.hostname === base.hostname });
  });

  const results = await Promise.all(
    links.map(async (link) => {
      try {
        const res = await fetchPage(normalizeUrl(link.url), { method: "HEAD", timeout: 10000 });
        // Some servers reject HEAD; retry with GET on 405/501.
        if (res.status === 405 || res.status === 501) {
          const get = await fetchPage(normalizeUrl(link.url), { timeout: 10000 });
          return { ...link, status: get.status, ok: get.ok };
        }
        return { ...link, status: res.status, ok: res.ok };
      } catch (err) {
        return { ...link, status: 0, ok: false, error: err.message };
      }
    }),
  );

  const broken = results.filter((r) => !r.ok);
  return {
    page: page.url,
    total: results.length,
    okCount: results.length - broken.length,
    brokenCount: broken.length,
    broken,
    links: results,
  };
}
