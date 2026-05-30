// TrafficBooster — an SEO & organic-traffic optimization toolkit.
// Express server that serves the dashboard UI and the tool API.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import apiRouter from "./src/routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Simple in-memory rate limit so the crawling tools can't be abused.
const RATE = { windowMs: 60_000, max: 60 };
const hits = new Map();
app.use("/api", (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, reset: now + RATE.windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + RATE.windowMs;
  }
  entry.count++;
  hits.set(ip, entry);
  if (entry.count > RATE.max) {
    return res.status(429).json({ ok: false, error: "Rate limit exceeded. Try again shortly." });
  }
  next();
});

app.use("/api", apiRouter);

app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

// Only listen when run directly (keeps the app importable in tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`TrafficBooster running at http://localhost:${PORT}`);
  });
}

export default app;
