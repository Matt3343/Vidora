const DEFAULT_INSTANCES = [
  "https://inv.nadeko.net",
  "https://yewtu.be",
  "https://invidious.nerdvpn.de"
];

// Vercel Functions are stateless between invocations, so instance changes
// are stored in a cookie. This makes the instance manager work without a DB.
function getInstances(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)vidora_instances=([^;]*)/);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (Array.isArray(parsed)) {
        const clean = parsed
          .map(normalize)
          .filter(validUrl);
        if (clean.length) return [...new Set(clean)];
      }
    } catch {}
  }
  return [...DEFAULT_INSTANCES];
}

function setInstancesCookie(res, instances) {
  const value = encodeURIComponent(JSON.stringify(instances));
  res.setHeader(
    "Set-Cookie",
    `vidora_instances=${value}; Path=/; Max-Age=31536000; SameSite=Lax`
  );
}

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

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Vidora/1.3",
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

async function checkInstance(instance) {
  instance = normalize(instance);

  // Don't require one specific endpoint. Some public instances return 404
  // for stats while their search/video API still works.
  const tests = [
    "/api/v1/search?q=test&type=video&page=1",
    "/api/v1/trending"
  ];

  let lastError = new Error("Keine kompatible Invidious-API gefunden.");

  for (const endpoint of tests) {
    try {
      await fetchJson(instance + endpoint, 7000);
      return { ok: true, instance, endpoint };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    instance,
    error: lastError.message
  };
}

async function failover(instances, apiPath) {
  let lastError = new Error("Keine kompatible Invidious-Instanz erreichbar.");

  // Randomize only equally so one broken instance does not always become
  // the first target when many users have the same defaults.
  for (const instance of instances) {
    try {
      const data = await fetchJson(
        normalize(instance) + apiPath,
        9000
      );
      return { data, instance };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function json(res, status, data) {
  res.status(status).json(data);
}

module.exports = {
  DEFAULT_INSTANCES,
  getInstances,
  setInstancesCookie,
  normalize,
  validUrl,
  checkInstance,
  failover,
  json
};