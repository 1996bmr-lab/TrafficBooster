// Safe HTTP fetching helpers shared across the SEO services.
// Includes basic SSRF protection so the tools can only be pointed at
// public http(s) URLs, not internal/loopback addresses.

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local
  /^172\.(1[6-9]|2\d|3[0-1])\./, // 172.16.0.0 – 172.31.255.255
  /\.local$/i,
  /^\[::1\]$/,
  /^::1$/,
];

const DEFAULT_HEADERS = {
  // Identify ourselves honestly as a tool, like other SEO crawlers do.
  "User-Agent":
    "TrafficBooster/1.0 (+SEO audit tool; respects robots.txt) Mozilla/5.0 (compatible)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

/**
 * Validate and normalize a user-supplied URL.
 * @param {string} input
 * @returns {URL}
 */
export function normalizeUrl(input) {
  if (!input || typeof input !== "string") {
    throw new Error("A URL is required.");
  }
  let candidate = input.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`"${input}" is not a valid URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const host = url.hostname;
  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    throw new Error(
      "Refusing to fetch private, loopback, or link-local addresses.",
    );
  }

  return url;
}

/**
 * Fetch a URL with a timeout and return the response plus timing info.
 * @param {string|URL} target
 * @param {{timeout?: number, method?: string}} [options]
 */
export async function fetchPage(target, options = {}) {
  const url = target instanceof URL ? target : normalizeUrl(target);
  const timeout = options.timeout ?? 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: DEFAULT_HEADERS,
    });
    const elapsedMs = Date.now() - start;

    const contentType = res.headers.get("content-type") || "";
    const isHtml = contentType.includes("html");
    const body = options.method === "HEAD" || !isHtml ? "" : await res.text();

    return {
      url: res.url || url.toString(),
      status: res.status,
      ok: res.ok,
      elapsedMs,
      contentType,
      headers: res.headers,
      sizeBytes: new TextEncoder().encode(body || "").length,
      body,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms.`);
    }
    throw new Error(`Could not reach ${url.toString()}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}
