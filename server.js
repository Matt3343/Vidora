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

function normalize(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getState(url) {
  if (!state.has(url)) {
    state.set(url, {
      ok: true,
      api: "unknown",
      failures: 0,
      lastCheck: 0,
      lastError: null
    });
  }
  return state.get(url);
}

instances = [...new Set(instances.map(normalize).filter(validUrl))];
instances.forEach(getState);

function orderedInstances() {
  return [...instances].sort((a, b) => {
    const A = getState(a);
    const B = getState(b);
    if (A.ok !== B.ok) return A.ok ? -1 : 1;
    return A.failures - B.failures;
  });
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Vidora/1.2",
        "Accept": "application/json,text/plain,*/*"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Antwort war kein gültiges JSON");
    }
  } finally {
    clearTimeout(timer);
  }
}

/*
  We deliberately don't use /api/v1/search for the instance health check.
  Some public instances return 404 for certain endpoints even though the
  instance itself is usable. Instead we test /api/v1/stats, and if that
  isn't available we try /api/v1/search as a compatibility fallback.
*/
async function checkInstance(url) {
  const s = getState(url);

  try {
    const data = await fetchJson(normalize(url) + "/api/v1/stats", 6000);

    s.ok = true;
    s.api = "v1";
    s.failures = 0;
    s.lastCheck = Date.now();
    s.lastError = null;

    return { ok: true, api: "v1", method: "stats", data };
  } catch (firstError) {
    try {
      const data = await fetchJson(
        normalize(url) + "/api/v1/search?q=test&type=video&page=1",
        6000
      );

      s.ok = true;
      s.api = "v1";
      s.failures = 0;
      s.lastCheck = Date.now();
      s.lastError = null;

      return { ok: true, api: "v1", method: "search", data };
    } catch (secondError) {
      s.ok = false;
      s.api = "unknown";
      s.failures += 1;
      s.lastCheck = Date.now();
      s.lastError = `${firstError.message}; ${secondError.message}`;

      return {
        ok: false,
        api: "unknown",
        error: s.lastError
      };
    }
  }
}

async function requestApi(instance, apiPath, timeoutMs = 9000) {
  const url = normalize(instance) + apiPath;
  const data = await fetchJson(url, timeoutMs);

  const s = getState(instance);
  s.ok = true;
  s.api = "v1";
  s.failures = 0;
  s.lastCheck = Date.now();
  s.lastError = null;

  return data;
}

async function failover(apiPath) {
  let lastError = new Error("Keine kompatible Invidious-Instanz erreichbar.");

  for (const instance of orderedInstances()) {
    try {
      const data = await requestApi(instance, apiPath);
      return { data, instance };
    } catch (error) {
      lastError = error;

      const s = getState(instance);
      s.ok = false;
      s.api = "unknown";
      s.failures += 1;
      s.lastCheck = Date.now();
      s.lastError = error.message;
    }
  }

  throw lastError;
}

app.use(express.json({ limit: "100kb" }));

// -------------------- INSTANCE MANAGEMENT --------------------

app.get("/api/instances", (req, res) => {
  res.json({
    instances: instances.map(url => ({
      url,
      ...getState(url)
    })),
    activeOrder: orderedInstances()
  });
});

app.post("/api/instances", async (req, res) => {
  try {
    const url = normalize(req.body?.url);

    if (!url) {
      return res.status(400).json({
        error: "Bitte eine Instanz-URL eingeben."
      });
    }

    if (!validUrl(url)) {
      return res.status(400).json({
        error: "Ungültige URL. Beispiel: https://inv.nadeko.net"
      });
    }

    if (instances.includes(url)) {
      return res.status(409).json({
        error: "Diese Instanz ist bereits vorhanden."
      });
    }

    // Add it first. A failed health check must NOT turn into an HTTP 404
    // for the user's add operation.
    instances.push(url);
    getState(url);

    const result = await checkInstance(url);

    res.status(201).json({
      ok: true,
      added: url,
      reachable: result.ok,
      api: result.api,
      warning: result.ok
        ? null
        : "Instanz wurde gespeichert, ist aber momentan nicht kompatibel oder erreichbar.",
      details: result.ok ? null : result.error
    });
  } catch (error) {
    console.error("Add instance error:", error);

    res.status(500).json({
      error: "Die Instanz konnte nicht hinzugefügt werden.",
      details: error.message
    });
  }
});

app.delete("/api/instances", (req, res) => {
  const url = normalize(req.body?.url);

  if (!instances.includes(url)) {
    return res.status(404).json({
      error: "Instanz nicht gefunden."
    });
  }

  if (instances.length <= 1) {
    return res.status(400).json({
      error: "Mindestens eine Instanz muss vorhanden sein."
    });
  }

  instances = instances.filter(x => x !== url);
  state.delete(url);

  res.json({
    ok: true,
    instances
  });
});

app.post("/api/instances/check", async (req, res) => {
  const url = normalize(req.body?.url);

  if (!instances.includes(url)) {
    return res.status(404).json({
      error: "Instanz nicht gefunden."
    });
  }

  const result = await checkInstance(url);

  if (result.ok) {
    return res.json({
      ok: true,
      url,
      api: result.api,
      method: result.method
    });
  }

  return res.status(502).json({
    ok: false,
    url,
    error: result.error
  });
});

// -------------------- INVIDIOUS API --------------------

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: "Suchbegriff fehlt."
    });
  }

  try {
    const result = await failover(
      `/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=1`
    );

    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: "Keine kompatible Invidious-Instanz erreichbar.",
      details: error.message
    });
  }
});

app.get("/api/trending", async (req, res) => {
  try {
    const result = await failover("/api/v1/trending");
    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: "Trends konnten nicht geladen werden.",
      details: error.message
    });
  }
});

app.get("/api/video/:id", async (req, res) => {
  try {
    const result = await failover(
      `/api/v1/videos/${encodeURIComponent(req.params.id)}`
    );

    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: "Video konnte nicht geladen werden.",
      details: error.message
    });
  }
});

// -------------------- FRONTEND --------------------

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("");
  console.log("====================================");
  console.log(`Vidora 1.2 läuft auf http://localhost:${PORT}`);
  console.log("====================================");
  console.log("Instanzen:");
  instances.forEach(url => console.log(" - " + url));
});