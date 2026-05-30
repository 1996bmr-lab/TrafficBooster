// REST API for the local Node server. Delegates to the shared dispatcher
// so the Node server and the Cloudflare Worker stay behavior-identical.

import { Router } from "express";
import { TOOLS, runTool } from "../dispatch.js";

const router = Router();

router.get("/tools", (_req, res) => res.json({ ok: true, data: TOOLS }));

// One handler for every tool: POST /api/<tool>.
router.post("/:tool", async (req, res) => {
  try {
    const data = await runTool(req.params.tool, req.body || {});
    res.json({ ok: true, data });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

export default router;
