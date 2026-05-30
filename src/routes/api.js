// REST API wiring each SEO tool to an endpoint.

import { Router } from "express";
import { runAudit } from "../services/seoAudit.js";
import { analyzeKeywords } from "../services/keywordAnalyzer.js";
import { generateMetaTags } from "../services/metaGenerator.js";
import { generateSitemap } from "../services/sitemapGenerator.js";
import { generateRobots } from "../services/robotsGenerator.js";
import { checkLinks } from "../services/linkChecker.js";
import { analyzeReadability } from "../services/readability.js";
import { generateSchema } from "../services/schemaGenerator.js";

const router = Router();

// Wrap async handlers so thrown errors become clean 400 JSON responses.
const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
};

router.get("/tools", (_req, res) => {
  res.json({
    ok: true,
    data: [
      { id: "audit", name: "SEO Audit", desc: "Grade a page's on-page SEO and list fixable issues." },
      { id: "keywords", name: "Keyword Analyzer", desc: "Keyword density & top phrases for a page or text." },
      { id: "meta", name: "Meta Tag Generator", desc: "Optimized title, description, Open Graph & Twitter tags." },
      { id: "sitemap", name: "Sitemap Generator", desc: "Crawl a site and build an XML sitemap." },
      { id: "robots", name: "Robots.txt Generator", desc: "Create a robots.txt with crawl rules." },
      { id: "links", name: "Broken Link Checker", desc: "Find broken links that waste crawl budget." },
      { id: "readability", name: "Readability Analyzer", desc: "Flesch reading-ease & grade level scoring." },
      { id: "schema", name: "Schema Generator", desc: "JSON-LD structured data for rich results." },
    ],
  });
});

router.post("/audit", handle((req) => runAudit(req.body.url)));

router.post(
  "/keywords",
  handle((req) =>
    analyzeKeywords({
      text: req.body.text,
      url: req.body.url,
      targets: req.body.targets || [],
    }),
  ),
);

router.post("/meta", handle((req) => generateMetaTags(req.body)));

router.post(
  "/sitemap",
  handle((req) => generateSitemap(req.body.url, { maxPages: req.body.maxPages })),
);

router.post("/robots", handle((req) => generateRobots(req.body)));

router.post(
  "/links",
  handle((req) => checkLinks(req.body.url, { maxLinks: req.body.maxLinks })),
);

router.post(
  "/readability",
  handle((req) => analyzeReadability({ text: req.body.text, url: req.body.url })),
);

router.post("/schema", handle((req) => generateSchema(req.body.kind, req.body)));

export default router;
