// Readability scoring (Flesch Reading Ease + Flesch–Kincaid grade level).
// Readable content keeps visitors on the page longer, which correlates
// with better engagement and search performance.

import * as cheerio from "cheerio";
import { fetchPage } from "../utils/fetcher.js";

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return word.length ? 1 : 0;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = word.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

export async function analyzeReadability({ text, url }) {
  let content = text || "";
  let source = "text";

  if (url) {
    const page = await fetchPage(url);
    const $ = cheerio.load(page.body || "");
    $("script,style,noscript").remove();
    content = $("body").text();
    source = page.url;
  }

  content = content.replace(/\s+/g, " ").trim();
  if (!content) throw new Error("No text to analyze.");

  const sentences = content.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0);
  const words = content.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const numSentences = Math.max(sentences.length, 1);
  const numWords = Math.max(words.length, 1);

  const wordsPerSentence = numWords / numSentences;
  const syllablesPerWord = syllables / numWords;

  const flesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const grade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  const reScore = Math.max(0, Math.min(100, Math.round(flesch)));

  let level;
  if (reScore >= 90) level = "Very easy (5th grade)";
  else if (reScore >= 70) level = "Easy (6th–7th grade)";
  else if (reScore >= 60) level = "Plain English (8th–9th grade)";
  else if (reScore >= 50) level = "Fairly difficult (10th–12th grade)";
  else if (reScore >= 30) level = "Difficult (college)";
  else level = "Very difficult (college graduate)";

  const tips = [];
  if (wordsPerSentence > 20)
    tips.push(`Sentences average ${wordsPerSentence.toFixed(1)} words — shorten them.`);
  if (syllablesPerWord > 1.7) tips.push("Many long words — prefer simpler, shorter words.");
  if (reScore < 60)
    tips.push("Aim for a Flesch score of 60+ so a general audience reads it easily.");

  return {
    source,
    metrics: {
      words: numWords,
      sentences: numSentences,
      syllables,
      wordsPerSentence: +wordsPerSentence.toFixed(1),
      syllablesPerWord: +syllablesPerWord.toFixed(2),
    },
    fleschReadingEase: reScore,
    fleschKincaidGrade: +grade.toFixed(1),
    level,
    tips,
  };
}
