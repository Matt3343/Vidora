const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

let instances = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de"
];

const state = new Map();
for (const url of instances) state.set(url, { ok: true, failures: 0, lastCheck: 0 });

function normalize(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function uniqueInstances(list) {
  return [...new Set(list.map(normalize).filter(u => /^https?:\/\//i.test(u)))];
}

function getOrderedInstances() {
  return [...instances].sort((a, b) => {
    const A = state.get(a) || { ok: true, failures: 0 };
    const B = state.get(b) || { ok: true, failures: 0 };
    if (A.ok !== B.ok) return A.ok ? -1 : 1;
    return A.failures - B.failures;
  });
}

async function requestJson(instance, apiPath, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(normalize(instance) + apiPath, {
      signal: controller.signal,
      headers: { "User-Agent": "Vidora/1.0" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tryWithFailover(apiPath) {
  const ordered = getOrderedInstances();
  let lastError = null;

  for (const instance of ordered) {
    try {
      const data = await requestJson(instance, apiPath);
      const s = state.get(instance) || {};
      state.set(instance, { ...s, ok: true, failures: 0, lastCheck: Date.now() });
      return { data, instance };
    } catch (err) {
      lastError = err;
      const s = state.get(instance) || {};
      state.set(instance, {
        ...s,
        ok: false,
        failures: (s.failures || 0) + 1,
        lastCheck: Date.now()
      });
    }
  }

  const error = new Error(lastError?.message || "Keine Invidious-Instanz erreichbar");
  error.code = "ALL_INSTANCES_FAILED";
  throw error;
}

// Status / instance management
app.get("/api/instances", (req, res) => {
  res.json({
    activeOrder: getOrderedInstances(),
    instances: instances.map(url => ({
      url,
      ...(state.get(url) || { ok: true, failures: 0, lastCheck: 0 })
    }))
  });
});

app.post("/api/instances", express.json(), (req, res) => {
  const url = normalize(req.body?.url);
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Ungültige URL" });
  }
  if (!instances.includes(url)) instances.push(url);
  if (!state.has(url)) state.set(url, { ok: true, failures: 0, lastCheck: 0 });
  res.json({ ok: true, instances });
});

app.delete("/api/instances", express.json(), (req, res) => {
  const url = normalize(req.body?.url);
  if (instances.length <= 1) return res.status(400).json({ error: "Mindestens eine Instanz muss vorhanden sein." });
  instances = instances.filter(x => x !== url);
  state.delete(url);
  res.json({ ok: true, instances });
});

app.post("/api/instances/check", express.json(), async (req, res) => {
  const url = normalize(req.body?.url);
  if (!instances.includes(url)) return res.status(404).json({ error: "Instanz nicht gefunden." });
  try {
    await requestJson(url, "/api/v1/search?q=test&type=video&page=1", 6000);
    state.set(url, { ...(state.get(url) || {}), ok: true, failures: 0, lastCheck: Date.now() });
    res.json({ ok: true, url });
  } catch (e) {
    const s = state.get(url) || {};
    state.set(url, { ...s, ok: false, failures: (s.failures || 0) + 1, lastCheck: Date.now() });
    res.status(502).json({ ok: false, url, error: e.message });
  }
});

// Search through Invidious with automatic failover
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const page = Number(req.query.page || 1);
  if (!q) return res.status(400).json({ error: "Suchbegriff fehlt." });

  try {
    const result = await tryWithFailover(
      `/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=${page}`
    );
    res.json({ instance: result.instance, data: result.data });
  } catch (e) {
    res.status(502).json({ error: e.message, code: e.code });
  }
});

// Trending
app.get("/api/trending", async (req, res) => {
  try {
    const result = await tryWithFailover("/api/v1/trending");
    res.json({ instance: result.instance, data: result.data });
  } catch (e) {
    res.status(502).json({ error: e.message, code: e.code });
  }
});

// Video details
app.get("/api/video/:id", async (req, res) => {
  try {
    const result = await tryWithFailover("/api/v1/videos/" + encodeURIComponent(req.params.id));
    res.json({ instance: result.instance, data: result.data });
  } catch (e) {
    res.status(502).json({ error: e.message, code: e.code });
  }
});

// Return a player URL using the healthy instance selected by the video request.
app.get("/api/player/:id", async (req, res) => {
  try {
    const result = await tryWithFailover("/api/v1/videos/" + encodeURIComponent(req.params.id));
    res.json({
      instance: result.instance,
      embedUrl: normalize(result.instance) + "/embed/" + encodeURIComponent(req.params.id)
    });
  } catch (e) {
    res.status(502).json({ error: e.message, code: e.code });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Vidora läuft auf http://localhost:${PORT}`);
  console.log("Invidious-Instanzen:", instances.join(", "));
});
