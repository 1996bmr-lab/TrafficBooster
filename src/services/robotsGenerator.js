// Generates a robots.txt file from simple options.

export function generateRobots(input = {}) {
  const {
    allowAll = true,
    disallowPaths = [],
    allowPaths = [],
    crawlDelay = null,
    sitemapUrl = "",
    blockBots = [], // user-agents to fully disallow
  } = input;

  const lines = [];

  lines.push("User-agent: *");
  if (allowAll) {
    lines.push("Allow: /");
  }
  for (const p of normalizePaths(allowPaths)) lines.push(`Allow: ${p}`);
  for (const p of normalizePaths(disallowPaths)) lines.push(`Disallow: ${p}`);
  if (crawlDelay && Number(crawlDelay) > 0) lines.push(`Crawl-delay: ${Number(crawlDelay)}`);

  for (const bot of blockBots.map((b) => b.trim()).filter(Boolean)) {
    lines.push("");
    lines.push(`User-agent: ${bot}`);
    lines.push("Disallow: /");
  }

  if (sitemapUrl) {
    lines.push("");
    lines.push(`Sitemap: ${sitemapUrl.trim()}`);
  }

  return { content: lines.join("\n") + "\n" };
}

function normalizePaths(paths) {
  const arr = Array.isArray(paths)
    ? paths
    : String(paths || "")
        .split(/[\n,]/)
        .map((p) => p.trim());
  return arr.filter(Boolean).map((p) => (p.startsWith("/") ? p : `/${p}`));
}
