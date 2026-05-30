// Cloudflare Worker entry point.
//
// Serves the dashboard from the static-assets binding (env.ASSETS) and
// handles the /api/* and /health routes with the same services used by the
// local Node server. Deployed via `npx wrangler deploy` (see wrangler.toml).

import { TOOLS, runTool } from "./dispatch.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === "/health") {
        return json({ ok: true, runtime: "cloudflare-worker" });
      }

      if (pathname === "/api/tools" && request.method === "GET") {
        return json({ ok: true, data: TOOLS });
      }

      // POST /api/<tool>
      const apiMatch = pathname.match(/^\/api\/([a-z]+)$/);
      if (apiMatch) {
        if (request.method !== "POST") {
          return json({ ok: false, error: "Use POST for this endpoint." }, 405);
        }
        let body;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Request body is not valid JSON." }, 400);
        }
        try {
          const data = await runTool(apiMatch[1], body);
          return json({ ok: true, data });
        } catch (err) {
          return json({ ok: false, error: err.message }, 400);
        }
      }

      if (pathname.startsWith("/api/")) {
        return json({ ok: false, error: "Not found" }, 404);
      }

      // Everything else: serve a static asset (index.html, css, js…).
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return json({ ok: false, error: "Static assets binding not configured." }, 500);
    } catch (err) {
      return json({ ok: false, error: err.message || "Internal error." }, 500);
    }
  },
};
