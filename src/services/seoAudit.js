// On-page SEO audit: fetches a page and grades the most impactful
// ranking signals (title, meta description, headings, images, links,
// social tags, mobile readiness, etc.), returning actionable issues.

import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetcher.js";

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

function check(passed, weight, label, detail) {
  return { passed, weight, label, detail };
}

export async function runAudit(targetUrl) {
  const page = await fetchPage(targetUrl);
  if (!page.body) {
    throw new Error(
      `The URL returned no HTML content (status ${page.status}, type "${page.contentType}").`,
    );
  }

  const $ = cheerio.load(page.body);
  const checks = [];

  // --- Title ---
  const title = ($("title").first().text() || "").trim();
  const titleLen = title.length;
  checks.push(
    check(
      titleLen >= TITLE_MIN && titleLen <= TITLE_MAX,
      10,
      "Title tag length",
      title
        ? `Title is ${titleLen} chars. Aim for ${TITLE_MIN}–${TITLE_MAX}.`
        : "No <title> tag found — this is critical for rankings.",
    ),
  );

  // --- Meta description ---
  const desc = ($('meta[name="description"]').attr("content") || "").trim();
  const descLen = desc.length;
  checks.push(
    check(
      descLen >= DESC_MIN && descLen <= DESC_MAX,
      9,
      "Meta description",
      desc
        ? `Description is ${descLen} chars. Aim for ${DESC_MIN}–${DESC_MAX}.`
        : "No meta description — search engines will guess your snippet.",
    ),
  );

  // --- H1 ---
  const h1s = $("h1");
  checks.push(
    check(
      h1s.length === 1,
      8,
      "Single H1 heading",
      h1s.length === 0
        ? "No H1 found. Add one clear primary heading."
        : h1s.length === 1
          ? `One H1: "${h1s.first().text().trim().slice(0, 80)}"`
          : `Found ${h1s.length} H1 tags. Use exactly one.`,
    ),
  );

  // --- Heading structure ---
  const headingCount = $("h2,h3,h4,h5,h6").length;
  checks.push(
    check(
      headingCount > 0,
      4,
      "Subheading structure",
      headingCount > 0
        ? `${headingCount} subheadings help structure & readability.`
        : "No subheadings (H2–H6). Break content into sections.",
    ),
  );

  // --- Images alt text ---
  const images = $("img");
  const missingAlt = images.filter((_, el) => !$(el).attr("alt")?.trim()).length;
  checks.push(
    check(
      images.length === 0 || missingAlt === 0,
      6,
      "Image alt text",
      images.length === 0
        ? "No images on the page."
        : missingAlt === 0
          ? `All ${images.length} images have alt text.`
          : `${missingAlt} of ${images.length} images are missing alt text.`,
    ),
  );

  // --- Canonical ---
  const canonical = $('link[rel="canonical"]').attr("href");
  checks.push(
    check(
      Boolean(canonical),
      5,
      "Canonical URL",
      canonical
        ? `Canonical set to ${canonical}`
        : "No canonical link — risk of duplicate-content dilution.",
    ),
  );

  // --- Viewport / mobile ---
  const viewport = $('meta[name="viewport"]').attr("content");
  checks.push(
    check(
      Boolean(viewport),
      7,
      "Mobile viewport",
      viewport
        ? "Responsive viewport meta tag present."
        : "No viewport meta tag — mobile ranking will suffer.",
    ),
  );

  // --- Open Graph / social ---
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  checks.push(
    check(
      Boolean(ogTitle && ogImage),
      4,
      "Open Graph tags",
      ogTitle && ogImage
        ? "Open Graph title & image present (better social CTR)."
        : "Missing og:title or og:image — links share poorly.",
    ),
  );

  // --- Structured data ---
  const hasSchema = $('script[type="application/ld+json"]').length > 0;
  checks.push(
    check(
      hasSchema,
      5,
      "Structured data (JSON-LD)",
      hasSchema
        ? "JSON-LD structured data found (rich-result eligible)."
        : "No structured data — add JSON-LD for rich results.",
    ),
  );

  // --- HTTPS ---
  const isHttps = page.url.startsWith("https://");
  checks.push(
    check(isHttps, 6, "HTTPS", isHttps ? "Served over HTTPS." : "Not using HTTPS — a ranking signal."),
  );

  // --- Content length ---
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = text ? text.split(" ").length : 0;
  checks.push(
    check(
      wordCount >= 300,
      5,
      "Content depth",
      `${wordCount} words. Thin content (<300) tends to rank poorly.`,
    ),
  );

  // --- Page weight / speed proxy ---
  checks.push(
    check(
      page.elapsedMs < 1500 && page.sizeBytes < 500_000,
      6,
      "Page weight & response time",
      `Loaded in ${page.elapsedMs}ms, ${(page.sizeBytes / 1024).toFixed(0)} KB of HTML.`,
    ),
  );

  // --- Links ---
  const links = $("a[href]");
  let internal = 0;
  let external = 0;
  const base = new URL(page.url);
  links.each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    try {
      const u = new URL(href, base);
      if (u.hostname === base.hostname) internal++;
      else external++;
    } catch {
      /* ignore malformed */
    }
  });
  checks.push(
    check(
      internal > 0,
      3,
      "Internal linking",
      `${internal} internal and ${external} external links found.`,
    ),
  );

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const score = Math.round((earned / totalWeight) * 100);

  return {
    url: page.url,
    fetchedAt: new Date().toISOString(),
    status: page.status,
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
    stats: {
      titleLength: titleLen,
      descriptionLength: descLen,
      wordCount,
      images: images.length,
      imagesMissingAlt: missingAlt,
      internalLinks: internal,
      externalLinks: external,
      responseMs: page.elapsedMs,
      htmlKb: Math.round(page.sizeBytes / 1024),
    },
    passed: checks.filter((c) => c.passed),
    issues: checks.filter((c) => !c.passed),
  };
}
