// Framework-agnostic tool dispatch shared by the Node (Express) server and
// the Cloudflare Worker. Each case maps a request body to a service call.

import { runAudit } from "./services/seoAudit.js";
import { analyzeKeywords } from "./services/keywordAnalyzer.js";
import { generateMetaTags } from "./services/metaGenerator.js";
import { generateSitemap } from "./services/sitemapGenerator.js";
import { generateRobots } from "./services/robotsGenerator.js";
import { checkLinks } from "./services/linkChecker.js";
import { analyzeReadability } from "./services/readability.js";
import { generateSchema } from "./services/schemaGenerator.js";

export const TOOLS = [
  { id: "audit", name: "SEO Audit", desc: "Grade a page's on-page SEO and list fixable issues." },
  { id: "keywords", name: "Keyword Analyzer", desc: "Keyword density & top phrases for a page or text." },
  { id: "meta", name: "Meta Tag Generator", desc: "Optimized title, description, Open Graph & Twitter tags." },
  { id: "sitemap", name: "Sitemap Generator", desc: "Crawl a site and build an XML sitemap." },
  { id: "robots", name: "Robots.txt Generator", desc: "Create a robots.txt with crawl rules." },
  { id: "links", name: "Broken Link Checker", desc: "Find broken links that waste crawl budget." },
  { id: "readability", name: "Readability Analyzer", desc: "Flesch reading-ease & grade level scoring." },
  { id: "schema", name: "Schema Generator", desc: "JSON-LD structured data for rich results." },
];

/**
 * Run a tool by id. Returns the tool's data, or throws an Error whose
 * message is safe to surface to the client.
 * @param {string} name
 * @param {object} body
 */
export async function runTool(name, body = {}) {
  switch (name) {
    case "audit":
      return runAudit(body.url);
    case "keywords":
      return analyzeKeywords({ text: body.text, url: body.url, targets: body.targets || [] });
    case "meta":
      return generateMetaTags(body);
    case "sitemap":
      return generateSitemap(body.url, { maxPages: body.maxPages });
    case "robots":
      return generateRobots(body);
    case "links":
      return checkLinks(body.url, { maxLinks: body.maxLinks });
    case "readability":
      return analyzeReadability({ text: body.text, url: body.url });
    case "schema":
      return generateSchema(body.kind, body);
    default:
      throw new Error(`Unknown tool: "${name}".`);
  }
}
