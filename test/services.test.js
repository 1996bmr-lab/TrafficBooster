// Unit tests for the pure (non-network) services.
import { test } from "node:test";
import assert from "node:assert/strict";

import { generateMetaTags } from "../src/services/metaGenerator.js";
import { generateRobots } from "../src/services/robotsGenerator.js";
import { generateSchema } from "../src/services/schemaGenerator.js";
import { analyzeKeywords } from "../src/services/keywordAnalyzer.js";
import { analyzeReadability } from "../src/services/readability.js";
import { normalizeUrl } from "../src/utils/fetcher.js";

test("meta generator trims long title and emits OG tags", () => {
  const { html, warnings } = generateMetaTags({
    title: "A".repeat(80),
    description: "Short desc",
    url: "https://example.com",
    image: "https://example.com/og.jpg",
  });
  assert.match(html, /<title>/);
  assert.match(html, /og:image/);
  assert.match(html, /twitter:card.*summary_large_image/);
  assert.ok(warnings.some((w) => /trimmed to 60/.test(w)));
});

test("robots generator includes sitemap and disallow rules", () => {
  const { content } = generateRobots({
    allowAll: true,
    disallowPaths: ["/admin", "cart"],
    sitemapUrl: "https://example.com/sitemap.xml",
  });
  assert.match(content, /User-agent: \*/);
  assert.match(content, /Disallow: \/admin/);
  assert.match(content, /Disallow: \/cart/);
  assert.match(content, /Sitemap: https:\/\/example\.com\/sitemap\.xml/);
});

test("schema generator builds valid Article JSON-LD", () => {
  const { json, scriptTag } = generateSchema("article", {
    headline: "Hello",
    author: "Jane",
    datePublished: "2024-01-01",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed["@type"], "Article");
  assert.equal(parsed.author.name, "Jane");
  assert.match(scriptTag, /application\/ld\+json/);
});

test("schema generator rejects unknown type", () => {
  assert.throws(() => generateSchema("nope", {}), /Unsupported/);
});

test("keyword analyzer computes density on raw text", async () => {
  const text = "SEO tips. Great SEO tips for better SEO ranking and traffic.";
  const out = await analyzeKeywords({ text, targets: ["seo", "missing phrase"] });
  assert.ok(out.totalWords > 0);
  const seo = out.targets.find((t) => t.keyword === "seo");
  assert.equal(seo.count, 3);
  const missing = out.targets.find((t) => t.keyword === "missing phrase");
  assert.equal(missing.verdict, "missing");
});

test("readability scores plain text", async () => {
  const out = await analyzeReadability({
    text: "The cat sat on the mat. It was a sunny day. Birds sang in the trees.",
  });
  assert.ok(out.fleschReadingEase >= 0 && out.fleschReadingEase <= 100);
  assert.ok(out.metrics.sentences >= 3);
});

test("normalizeUrl blocks private addresses", () => {
  assert.throws(() => normalizeUrl("http://localhost:3000"), /private|loopback/);
  assert.throws(() => normalizeUrl("http://192.168.1.1"), /private|loopback/);
  assert.equal(normalizeUrl("example.com").protocol, "https:");
});
