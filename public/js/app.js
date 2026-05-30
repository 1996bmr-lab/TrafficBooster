// Front-end controller: builds the tool nav, submits forms to the API,
// and renders each tool's result.

const panels = [...document.querySelectorAll(".panel")];
const nav = document.getElementById("toolNav");

// Read a response as JSON, but tolerate empty or non-JSON bodies so the
// UI shows a clear message instead of "Unexpected end of JSON input".
async function parseJson(r) {
  const text = await r.text();
  if (!text) return { ok: false, error: `Empty response (HTTP ${r.status}).` };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Server returned a non-JSON response (HTTP ${r.status}).` };
  }
}

// Build sidebar from the API tool catalog.
const res = await fetch("/api/tools")
  .then((r) => parseJson(r))
  .catch(() => null);
const tools = res?.data || panels.map((p) => ({ id: p.dataset.tool, name: p.querySelector("h2").textContent, desc: "" }));

for (const tool of tools) {
  const btn = document.createElement("button");
  btn.className = "nav-btn";
  btn.dataset.tool = tool.id;
  btn.innerHTML = `${tool.name}<small>${tool.desc || ""}</small>`;
  btn.addEventListener("click", () => showTool(tool.id));
  nav.appendChild(btn);
}

function showTool(id) {
  panels.forEach((p) => (p.hidden = p.dataset.tool !== id));
  [...nav.children].forEach((b) => b.classList.toggle("active", b.dataset.tool === id));
}
showTool(tools[0].id);

// Wire up every form.
for (const form of document.querySelectorAll("form[data-endpoint]")) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const panel = form.closest(".panel");
    const result = panel.querySelector(".result");
    const btn = form.querySelector("button[type=submit]");
    const payload = serialize(form);

    btn.disabled = true;
    result.hidden = false;
    result.innerHTML = '<p class="spinner">⏳ Working…</p>';

    try {
      const r = await fetch(form.dataset.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await parseJson(r);
      if (!json.ok) throw new Error(json.error || `Request failed (HTTP ${r.status})`);
      render(panel.dataset.tool, result, json.data);
    } catch (err) {
      result.innerHTML = `<div class="error-box">⚠️ ${escapeHtml(err.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}

function serialize(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") data[el.name] = el.checked;
    else if (el.type === "number") data[el.name] = el.value ? Number(el.value) : undefined;
    else if (el.value.trim() !== "") data[el.name] = el.value.trim();
  }
  if ("targets" in data) data.targets = String(data.targets).split(",").map((s) => s.trim()).filter(Boolean);
  if ("disallowPaths" in data) data.disallowPaths = String(data.disallowPaths).split("\n").map((s) => s.trim()).filter(Boolean);
  if ("keywords" in data) data.keywords = String(data.keywords).split(",").map((s) => s.trim()).filter(Boolean);
  if ("image" in data) data.logo = data.image; // schema logo alias
  return data;
}

// ---- Renderers ----
function render(tool, el, data) {
  const renderers = {
    audit: renderAudit,
    keywords: renderKeywords,
    meta: renderCodeResult,
    sitemap: renderSitemap,
    robots: (el, d) => renderCode(el, d.content, "robots.txt"),
    links: renderLinks,
    readability: renderReadability,
    schema: (el, d) => renderCode(el, d.scriptTag, "JSON-LD"),
  };
  (renderers[tool] || ((el, d) => renderCode(el, JSON.stringify(d, null, 2))))(el, data);
}

function renderAudit(el, d) {
  el.innerHTML = `
    <div class="score-ring">
      <div class="score-num grade-${d.grade}">${d.score}</div>
      <div>
        <div><strong>Grade ${d.grade}</strong> for <a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(d.url)}</a></div>
        <div class="detail">${d.passed.length} checks passed · ${d.issues.length} need attention</div>
      </div>
    </div>
    <div class="stat-grid">
      ${stat(d.stats.wordCount, "Words")}
      ${stat(d.stats.titleLength, "Title len")}
      ${stat(d.stats.descriptionLength, "Desc len")}
      ${stat(d.stats.images, "Images")}
      ${stat(d.stats.internalLinks, "Internal links")}
      ${stat(d.stats.responseMs + "ms", "Response")}
    </div>
    ${d.issues.length ? `<h3>Issues to fix</h3><ul class="check-list">${d.issues.map(checkItem(false)).join("")}</ul>` : ""}
    ${d.passed.length ? `<h3>Passing</h3><ul class="check-list">${d.passed.map(checkItem(true)).join("")}</ul>` : ""}
  `;
}

const checkItem = (pass) => (c) =>
  `<li class="${pass ? "pass" : "fail"}"><span class="icon">${pass ? "✔" : "✗"}</span><span><span class="label">${escapeHtml(c.label)}</span><br><span class="detail">${escapeHtml(c.detail)}</span></span></li>`;

function renderKeywords(el, d) {
  const tgt = d.targets.length
    ? `<h3>Target keywords</h3><table class="tbl"><tr><th>Keyword</th><th>Count</th><th>Density</th><th>Verdict</th></tr>${d.targets
        .map(
          (t) =>
            `<tr><td>${escapeHtml(t.keyword)}</td><td>${t.count}</td><td>${t.density}%</td><td><span class="badge ${verdictClass(t.verdict)}">${escapeHtml(t.verdict)}</span></td></tr>`,
        )
        .join("")}</table>`
    : "";
  el.innerHTML = `
    <p class="detail">${d.totalWords} content words analyzed${d.title ? ` · <strong>${escapeHtml(d.title)}</strong>` : ""}</p>
    ${tgt}
    <h3>Top single words</h3>${phraseTable(d.keywords.single)}
    <h3>Top 2-word phrases</h3>${phraseTable(d.keywords.bigrams)}
    <h3>Top 3-word phrases</h3>${phraseTable(d.keywords.trigrams)}
  `;
}

function phraseTable(rows) {
  if (!rows.length) return '<p class="detail">None found.</p>';
  return `<table class="tbl"><tr><th>Phrase</th><th>Count</th><th>Density</th></tr>${rows
    .map((r) => `<tr><td>${escapeHtml(r.phrase)}</td><td>${r.count}</td><td>${r.density}%</td></tr>`)
    .join("")}</table>`;
}

function renderSitemap(el, d) {
  const errs = d.errors.length
    ? `<p class="detail">${d.errors.length} URL(s) skipped (errors).</p>`
    : "";
  renderCode(el, d.xml, "sitemap.xml");
  el.insertAdjacentHTML(
    "afterbegin",
    `<p class="detail">Crawled <strong>${d.pageCount}</strong> pages on ${escapeHtml(d.origin)}. ${errs}</p>`,
  );
}

function renderLinks(el, d) {
  const rows = d.links
    .map(
      (l) =>
        `<tr><td><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(truncate(l.url, 60))}</a></td><td>${l.internal ? "internal" : "external"}</td><td><span class="badge ${l.ok ? "ok" : "bad"}">${l.status || "ERR"}</span></td></tr>`,
    )
    .join("");
  el.innerHTML = `
    <div class="stat-grid">
      ${stat(d.total, "Checked")}
      ${stat(d.okCount, "Working")}
      ${stat(d.brokenCount, "Broken")}
    </div>
    <table class="tbl"><tr><th>URL</th><th>Type</th><th>Status</th></tr>${rows}</table>
  `;
}

function renderReadability(el, d) {
  el.innerHTML = `
    <div class="score-ring">
      <div class="score-num grade-${d.fleschReadingEase >= 60 ? "B" : d.fleschReadingEase >= 50 ? "C" : "D"}">${d.fleschReadingEase}</div>
      <div><strong>${escapeHtml(d.level)}</strong><div class="detail">Flesch–Kincaid grade ${d.fleschKincaidGrade}</div></div>
    </div>
    <div class="stat-grid">
      ${stat(d.metrics.words, "Words")}
      ${stat(d.metrics.sentences, "Sentences")}
      ${stat(d.metrics.wordsPerSentence, "Words/sentence")}
      ${stat(d.metrics.syllablesPerWord, "Syllables/word")}
    </div>
    ${d.tips.length ? `<h3>Suggestions</h3><ul class="check-list">${d.tips.map((t) => `<li class="fail"><span class="icon">→</span><span class="detail">${escapeHtml(t)}</span></li>`).join("")}</ul>` : '<p class="detail">Looks good — no major readability issues.</p>'}
  `;
}

function renderCodeResult(el, d) {
  renderCode(el, d.html, "meta tags");
  if (d.warnings?.length) {
    el.insertAdjacentHTML(
      "beforeend",
      `<ul class="check-list">${d.warnings.map((w) => `<li class="fail"><span class="icon">!</span><span class="detail">${escapeHtml(w)}</span></li>`).join("")}</ul>`,
    );
  }
}

function renderCode(el, code, label = "output") {
  el.innerHTML = `<button class="copy-btn">Copy ${escapeHtml(label)}</button><pre class="code">${escapeHtml(code)}</pre>`;
  el.querySelector(".copy-btn").addEventListener("click", (e) => {
    navigator.clipboard.writeText(code);
    e.target.textContent = "Copied ✔";
    setTimeout(() => (e.target.textContent = `Copy ${label}`), 1500);
  });
}

// ---- helpers ----
function stat(v, k) {
  return `<div class="stat"><div class="v">${escapeHtml(String(v))}</div><div class="k">${escapeHtml(k)}</div></div>`;
}
function verdictClass(v) {
  if (v === "good") return "ok";
  if (v.startsWith("over")) return "warn";
  return "bad";
}
function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
