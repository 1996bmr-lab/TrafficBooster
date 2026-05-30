// Keyword density & n-gram analysis. Works on raw text or a fetched URL.
// Helps spot whether target keywords appear often enough (without
// keyword-stuffing) and surfaces the phrases a page actually ranks for.

import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetcher.js";

const STOP_WORDS = new Set(
  (
    "a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves"
  ).split(" "),
);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter(
    (w) => w.length > 1 && !STOP_WORDS.has(w),
  );
}

function topNgrams(tokens, n, limit) {
  const counts = new Map();
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1 || n === 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

export async function analyzeKeywords({ text, url, targets = [] }) {
  let content = text || "";
  let source = "text";
  let title = "";

  if (url) {
    const page = await fetchPage(url);
    const $ = cheerio.load(page.body || "");
    $("script,style,noscript").remove();
    title = ($("title").first().text() || "").trim();
    content = $("body").text();
    source = page.url;
  }

  const tokens = tokenize(content);
  const totalWords = tokens.length;
  if (totalWords === 0) {
    throw new Error("No analyzable text content found.");
  }

  const density = (count) => +((count / totalWords) * 100).toFixed(2);

  const single = topNgrams(tokens, 1, 15).map((e) => ({
    ...e,
    density: density(e.count),
  }));
  const bigrams = topNgrams(tokens, 2, 10).map((e) => ({
    ...e,
    density: density(e.count),
  }));
  const trigrams = topNgrams(tokens, 3, 10).map((e) => ({
    ...e,
    density: density(e.count),
  }));

  // Evaluate the user's target keywords.
  const targetReport = targets
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => {
      const phrase = t.split(/\s+/).filter(Boolean).join(" ");
      const count = (
        content.toLowerCase().match(new RegExp(`\\b${escapeRegex(phrase)}\\b`, "g")) || []
      ).length;
      const d = density(count);
      let verdict;
      if (count === 0) verdict = "missing";
      else if (d > 3) verdict = "over-optimized (risk of stuffing)";
      else if (d < 0.5) verdict = "sparse";
      else verdict = "good";
      return { keyword: phrase, count, density: d, verdict };
    });

  return {
    source,
    title,
    totalWords,
    targets: targetReport,
    keywords: { single, bigrams, trigrams },
  };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
