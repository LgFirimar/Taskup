// Allowed origins for browser requests. Cloudflare Pages serves both the
// production URL and every preview deploy under *.pages.dev, so we allow the
// whole subdomain rather than one fixed URL (which would break previews and
// risk locking out production if the exact URL isn't known here). localhost
// covers local dev (`npm run dev` / `vite preview`). If a custom domain is
// added later, set ALLOWED_ORIGIN in the Worker's environment variables
// (Cloudflare dashboard) — no code change needed.
function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  if (env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname.endsWith(".pages.dev")) return true;
    if ((hostname === "localhost" || hostname === "127.0.0.1") && protocol === "http:") return true;
  } catch {
    return false;
  }
  return false;
}

function corsHeaders(origin, env) {
  const allowed = isAllowedOrigin(origin, env);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// Very lightweight, best-effort per-IP rate limiting. Workers run across many
// edge locations with no shared memory, so this only limits requests that
// happen to land on the same isolate — it raises the bar against casual
// abuse (a stray script hammering the endpoint) but is NOT a strong defense
// against a determined attacker. For real protection, use Cloudflare's
// dashboard-configured Rate Limiting rules on this route (no code needed).
const RATE_LIMIT = 20; // requests
const RATE_WINDOW_MS = 60_000; // per minute, per isolate
const hits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const timestamps = (hits.get(ip) || []).filter(t => t > windowStart);
  timestamps.push(now);
  hits.set(ip, timestamps);
  if (hits.size > 5000) hits.clear(); // crude cap so the Map can't grow unbounded
  return timestamps.length > RATE_LIMIT;
}

async function callClaude(env, { maxTokens, prompt }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Anthropic API returned an unexpected response shape");
  return text;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, env);

    if (request.method === "OPTIONS") return new Response(null, { headers });

    // Browsers already enforce CORS, but that's not a security boundary —
    // non-browser clients can send any Origin header they like, so we also
    // reject disallowed origins server-side before doing any real work.
    if (!isAllowedOrigin(origin, env)) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: { ...headers, "content-type": "application/json" },
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests — please slow down and try again shortly." }), {
        status: 429,
        headers: { ...headers, "content-type": "application/json" },
      });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "POST" && url.pathname === "/breakdown") {
        const { task } = await request.json();
        if (!task || typeof task !== "string" || !task.trim()) {
          return new Response(JSON.stringify({ error: "Missing task" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }
        const text = await callClaude(env, {
          maxTokens: 400,
          prompt: `פרקי את המשימה הבאה ל-3 עד 5 צעדים קטנים וברורים מאוד. החזירי את הצעדים בלבד, כל צעד בשורה נפרדת, ללא מספרים ללא מקפים ללא כוכביות.\n\nמשימה: "${task.slice(0, 500)}"`,
        });
        const steps = text.split("\n").map(s => s.trim()).filter(Boolean);
        return new Response(JSON.stringify({ steps }), { headers: { ...headers, "content-type": "application/json" } });
      }

      if (request.method === "POST" && url.pathname === "/parse-list") {
        const { text: input } = await request.json();
        if (!input || typeof input !== "string" || !input.trim()) {
          return new Response(JSON.stringify({ error: "Missing text" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }
        const text = await callClaude(env, {
          maxTokens: 300,
          prompt: `חלצי את פריטי הקניות מהטקסט הבא. החזירי כל פריט בשורה נפרדת בלבד, ללא מספרים ללא מקפים ללא כוכביות ללא כמויות.\n\nטקסט: "${input.slice(0, 1000)}"`,
        });
        const items = text.split("\n").map(s => s.trim()).filter(Boolean);
        return new Response(JSON.stringify({ items }), { headers: { ...headers, "content-type": "application/json" } });
      }

      if (request.method === "POST" && url.pathname === "/summarize-email") {
        const { subject, sender, body, format } = await request.json();
        if (!body || typeof body !== "string" || !body.trim()) {
          return new Response(JSON.stringify({ error: "Missing body" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }

        const formatInstructions = {
          bullets:  "סכמי את המייל ב-3-5 נקודות קצרות בעברית.",
          summary:  "כתבי סיכום קצר של 2-3 משפטים בעברית.",
          tasks:    "חלצי את כל המשימות שיש לבצע מהמייל. כל משימה בשורה נפרדת, ללא מספרים.",
          dates:    "חלצי את כל התאריכים, מועדים ואירועים מהמייל. פורמט: YYYY-MM-DD | תיאור. כל שורה נפרדת.",
        };

        const prompt = `מאת: ${(sender || "").slice(0, 200)}\nנושא: ${(subject || "").slice(0, 300)}\n\nתוכן:\n${body.slice(0, 3000)}\n\n---\n${formatInstructions[format] || formatInstructions.summary}`;

        const result = await callClaude(env, { maxTokens: 500, prompt });
        return new Response(JSON.stringify({ result }), { headers: { ...headers, "content-type": "application/json" } });
      }

      return new Response("Not found", { status: 404, headers });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: "Something went wrong processing that request. Please try again." }), {
        status: 502,
        headers: { ...headers, "content-type": "application/json" },
      });
    }
  },
};
