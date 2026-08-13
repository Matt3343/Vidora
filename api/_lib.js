const FALLBACK_INSTANCES = [
  "https://yewtu.be",
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de"
];

function normalize(u) {
  return String(u || "").trim().replace(/\/+$/, "");
}

function validUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:";
  } catch {
    return false;
  }
}

function readCookie(req) {
  const raw = req.headers.cookie || "";
  const m = raw.match(/(?:^|;\s*)vidora_instances=([^;]*)/);
  if (!m) return [];
  try {
    const a = JSON.parse(decodeURIComponent(m[1]));
    return Array.isArray(a) ? [...new Set(a.map(normalize).filter(validUrl))] : [];
  } catch {
    return [];
  }
}

function getInstances(req) {
  const custom = readCookie(req);
  return custom.length ? custom : [...FALLBACK_INSTANCES];
}

function saveInstances(res, instances) {
  const value = encodeURIComponent(JSON.stringify(instances));
  res.setHeader(
    "Set-Cookie",
    `vidora_instances=${value}; Path=/; Max-Age=31536000; SameSite=Lax`
  );
}

async function requestText(url, timeout=8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Vidora/1.4",
        "Accept": "application/json,text/plain,*/*"
      }
    });
    const text = await r.text();
    return { status: r.status, text, url: r.url };
  } finally {
    clearTimeout(timer);
  }
}

async function requestJson(base, endpoint, timeout=9000) {
  const result = await requestText(normalize(base) + endpoint, timeout);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`HTTP ${result.status}`);
  }
  try {
    return JSON.parse(result.text);
  } catch {
    throw new Error("Ungültige JSON-Antwort");
  }
}

async function probeInstance(instance) {
  instance = normalize(instance);

  // Several endpoints are tested because public instances differ.
  const tests = [
    { path: "/api/v1/trending", kind: "trending" },
    { path: "/api/v1/search?q=music&type=video&page=1", kind: "search" }
  ];

  let last = "Keine kompatible Invidious-API gefunden.";

  for (const test of tests) {
    try {
      const data = await requestJson(instance, test.path, 6500);
      return {
        ok: true,
        instance,
        endpoint: test.kind,
        sampleCount: Array.isArray(data) ? data.length : 1
      };
    } catch (e) {
      last = e.message;
    }
  }

  return { ok: false, instance, error: last };
}

async function discoverInstances() {
  /*
    Invidious' public-instance ecosystem changes frequently.
    This discovery tries known community-maintained instance lists and
    extracts HTTPS hostnames. It is deliberately tolerant: if a source
    changes format, other sources are still tried.
  */
  const sources = [
    "https://raw.githubusercontent.com/iv-org/documentation/master/Invidious-Instances.md",
    "https://raw.githubusercontent.com/wiki/iv-org/documentation/Invidious-Instances.md",
    "https://api.invidious.io/instances.json"
  ];

  const found = new Set();

  for (const source of sources) {
    try {
      const r = await requestText(source, 7000);
      if (r.status < 200 || r.status >= 300) continue;

      const text = r.text;

      // URLs in Markdown/text.
      for (const m of text.matchAll(/https?:\/\/[A-Za-z0-9.-]+(?::\d+)?/g)) {
        const u = normalize(m[0]);
        if (validUrl(u)) found.add(u);
      }

      // JSON instance lists often contain "https": ...
      try {
        const j = JSON.parse(text);
        const walk = value => {
          if (!value) return;
          if (typeof value === "string" && validUrl(value)) found.add(normalize(value));
          else if (Array.isArray(value)) value.forEach(walk);
          else if (typeof value === "object") Object.values(value).forEach(walk);
        };
        walk(j);
      } catch {}
    } catch {}
  }

  return [...found];
}

async function discoverAndProbe() {
  const candidates = [...new Set([
    ...FALLBACK_INSTANCES,
    ...(await discoverInstances())
  ])].filter(validUrl);

  // Probe in parallel but cap concurrency.
  const results = [];
  const queue = [...candidates];

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      results.push(await probeInstance(item));
    }
  }

  await Promise.all(Array.from({length: 6}, worker));

  return results
    .filter(x => x.ok)
    .sort((a,b) => b.sampleCount - a.sampleCount);
}

async function failover(instances, endpoint) {
  let last = new Error("Keine funktionierende Invidious-Instanz gefunden.");

  for (const instance of instances) {
    try {
      const data = await requestJson(instance, endpoint);
      return { data, instance };
    } catch (e) {
      last = e;
    }
  }

  throw last;
}

function json(res, status, data) {
  res.status(status).json(data);
}

module.exports = {
  FALLBACK_INSTANCES,
  normalize,
  validUrl,
  getInstances,
  saveInstances,
  probeInstance,
  discoverAndProbe,
  failover,
  json
};