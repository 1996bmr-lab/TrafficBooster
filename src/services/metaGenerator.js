// Generates an optimized, copy-paste-ready block of <head> tags:
// title, meta description, canonical, Open Graph and Twitter Card tags.

function clamp(str, max) {
  if (!str) return "";
  const s = str.trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function esc(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function generateMetaTags(input = {}) {
  const {
    title = "",
    description = "",
    url = "",
    image = "",
    siteName = "",
    twitterHandle = "",
    keywords = [],
    type = "website",
  } = input;

  if (!title) throw new Error("A page title is required.");

  const finalTitle = clamp(title, 60);
  const finalDesc = clamp(description, 160);
  const kw = Array.isArray(keywords)
    ? keywords
    : String(keywords)
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

  const lines = [
    `<title>${esc(finalTitle)}</title>`,
    `<meta name="description" content="${esc(finalDesc)}">`,
  ];
  if (kw.length) lines.push(`<meta name="keywords" content="${esc(kw.join(", "))}">`);
  if (url) lines.push(`<link rel="canonical" href="${esc(url)}">`);
  lines.push(`<meta name="robots" content="index, follow">`);

  // Open Graph
  lines.push("");
  lines.push("<!-- Open Graph / Facebook -->");
  lines.push(`<meta property="og:type" content="${esc(type)}">`);
  lines.push(`<meta property="og:title" content="${esc(finalTitle)}">`);
  lines.push(`<meta property="og:description" content="${esc(finalDesc)}">`);
  if (url) lines.push(`<meta property="og:url" content="${esc(url)}">`);
  if (image) lines.push(`<meta property="og:image" content="${esc(image)}">`);
  if (siteName) lines.push(`<meta property="og:site_name" content="${esc(siteName)}">`);

  // Twitter
  lines.push("");
  lines.push("<!-- Twitter Card -->");
  lines.push(`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`);
  lines.push(`<meta name="twitter:title" content="${esc(finalTitle)}">`);
  lines.push(`<meta name="twitter:description" content="${esc(finalDesc)}">`);
  if (image) lines.push(`<meta name="twitter:image" content="${esc(image)}">`);
  if (twitterHandle)
    lines.push(`<meta name="twitter:site" content="${esc(twitterHandle.startsWith("@") ? twitterHandle : "@" + twitterHandle)}">`);

  const warnings = [];
  if (title.length > 60) warnings.push(`Title was ${title.length} chars; trimmed to 60.`);
  if (description.length > 160)
    warnings.push(`Description was ${description.length} chars; trimmed to 160.`);
  if (description && description.length < 70)
    warnings.push("Description is short — aim for 70–160 chars for a fuller snippet.");
  if (!image) warnings.push("No social image provided — links will share without a preview.");

  return { html: lines.join("\n"), warnings };
}
