// Deployed via Cloudflare Workers Builds (Git integration) — every push to
// main on this repo now redeploys this Worker automatically.
//
// Real push notifications for reminders (see src/hooks/usePushNotifications.js
// and src/sw.js on the client side): the client POSTs its push subscription +
// current reminder list here, we store it in KV, and a cron trigger
// (scheduled() below, configured in wrangler.toml) checks every 15 minutes
// for reminders whose alertDate has arrived and sends a real Web Push.
// Requires the PUSH_KV binding (KV namespace) and the VAPID_PRIVATE_KEY
// secret to be configured on this Worker — see wrangler.toml for the KV
// binding and the Cloudflare dashboard's "Variables and secrets" for the key
// (same place ANTHROPIC_API_KEY lives).
import webpush from "web-push";

// Public half of the VAPID keypair — matches src/utils.js's VAPID_PUBLIC_KEY
// constant exactly (both must come from the same generated pair). Not a
// secret; the private half is a Worker secret and is never committed.
const VAPID_PUBLIC_KEY = "BMXM-WqaJ2e_22W0p58Bm2PbFr7UE8cE9u-Jhv59dwEhW60o8EZHxtqw6cAim_TkTdux-pM1XiUytThARa8uxHg";
const VAPID_SUBJECT = "https://taskup-ai.lior0gal.workers.dev";

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

// KV keys must not contain the raw push endpoint URL (long, and identifies a
// specific device) — hash it instead, both for a bounded key size and so a
// leaked KV listing doesn't directly expose subscribers' endpoints.
async function sha256Hex(str) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Every open reminder the client knows about, trimmed to just what the cron
// job needs (id/text/alertDate) — see src/utils.js's collectAllReminders for
// the client-side counterpart that builds this list.
function sanitizeReminders(reminders) {
  if (!Array.isArray(reminders)) return [];
  return reminders
    .filter(r => r && r.id && r.alertDate)
    .slice(0, 500) // defensive cap — no real user should ever have this many open reminders
    .map(r => ({ id: String(r.id), text: String(r.text || "תזכורת").slice(0, 200), alertDate: String(r.alertDate).slice(0, 10) }));
}

// Sends one Web Push message via fetch() rather than web-push's own
// sendNotification(), which internally uses Node's https.request() — that
// performs real outbound network I/O, which Cloudflare Workers' nodejs_compat
// does not actually implement (it only shims computation, e.g. crypto).
// generateRequestDetails() does all the same VAPID-signing/payload-encryption
// work (pure crypto, safe under nodejs_compat) and just hands back a plain
// {endpoint, method, headers, body} — which fetch() can send directly, and
// fetch is fully native/supported in Workers.
async function sendWebPush(subscription, payloadObj) {
  const details = webpush.generateRequestDetails(subscription, JSON.stringify(payloadObj));
  const headers = {};
  for (const [k, v] of Object.entries(details.headers)) {
    if (k.toLowerCase() === "content-length") continue; // let fetch compute this itself
    headers[k] = String(v);
  }
  return fetch(details.endpoint, { method: details.method, headers, body: details.body });
}

// Runs on the cron schedule configured in wrangler.toml. Cloudflare KV list()
// is eventually consistent and unordered, but that's fine here — we just need
// to eventually visit every stored subscription, not any particular order.
async function sendDueReminders(env) {
  if (!env.PUSH_KV || !env.VAPID_PRIVATE_KEY) {
    console.error("sendDueReminders: missing PUSH_KV binding or VAPID_PRIVATE_KEY secret — skipping.");
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const todayStr = new Date().toISOString().split("T")[0];

  let cursor;
  for (;;) {
    const list = await env.PUSH_KV.list({ prefix: "push:", cursor });
    for (const entry of list.keys) {
      const raw = await env.PUSH_KV.get(entry.name);
      if (!raw) continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }

      const notified = new Set(data.notified || []);
      const due = (data.reminders || []).filter(r => r.alertDate <= todayStr && !notified.has(r.id));
      if (due.length === 0) continue;

      let gone = false;
      for (const r of due) {
        try {
          const res = await sendWebPush(data.subscription, { title: "🔔 תזכורת מ-Taskup", body: r.text, url: "/" });
          if (res.status === 404 || res.status === 410) {
            // Subscription is no longer valid (browser data cleared, permission
            // revoked, etc.) — remove it so we stop retrying forever.
            await env.PUSH_KV.delete(entry.name);
            gone = true;
            break;
          }
          if (!res.ok) {
            console.error("push send failed", entry.name, res.status, await res.text().catch(() => ""));
            continue; // leave un-notified — will retry next cron run
          }
          notified.add(r.id);
        } catch (err) {
          console.error("push send threw", entry.name, err.message);
        }
      }
      if (!gone) {
        await env.PUSH_KV.put(entry.name, JSON.stringify({ ...data, notified: Array.from(notified) }));
      }
    }
    if (list.list_complete) break;
    cursor = list.cursor;
  }
}

// Builds the prompt for /parse-project-file. `prompt` below ends up as the
// Messages API's `content` field, which accepts either a plain string or an
// array of content blocks (image/document/text) — callClaude() just forwards
// whatever it's given, so passing an array here works without any changes to
// that helper.
function projectImportPrompt(todayStr, inlineText) {
  const instructions = `את/ה עוזר/ת שמפרקת תוכן (מסמך, פתק, או תמונה של פתק בכתב יד) לרכיבים שאפשר להזין ישירות לפרויקט ניהול משימות. תאריך היום: ${todayStr}.

נתחי את התוכן המצורף וזהי:
- tasks: משימות לביצוע. כל משימה: טקסט קצר וברור, ואופציונלית תת-משימות (subtasks) אם יש פירוט לשלבים.
- timeline: אבני דרך/מועדים. אם מוזכר תאריך יחסי ("יום שלישי הבא", "בעוד שבוע") נסי לחשב תאריך מוחלט (YYYY-MM-DD) לפי תאריך היום; אם אין תאריך ברור, השאירי date כ-null.
- brainstorm: רעיונות חופשיים, מחשבות, נושאים לדיון.
- board: ציטוטים, השראה, קישורים, או כל תוכן רלוונטי שלא מתאים לשלוש הקטגוריות האחרות.

חשוב מאוד:
- החזירי אך ורק אובייקט JSON תקין, בלי שום טקסט נוסף לפניו או אחריו, ובלי code fences של markdown.
- מבנה מדויק (כולל כל המפתחות, גם אם המערך ריק): {"tasks":[{"text":"...","subtasks":["..."]}],"timeline":[{"text":"...","date":"YYYY-MM-DD"}],"brainstorm":["..."],"board":["..."]}
- אל תמציאי תוכן שלא מופיע במקור — אם קטגוריה מסוימת ריקה, החזירי עבורה מערך ריק.`;
  return inlineText ? `${instructions}\n\nתוכן הקובץ:\n${inlineText.slice(0, 8000)}` : instructions;
}

// Best-effort parse of Claude's JSON response — strips a markdown code fence
// if the model wrapped its output in one despite being told not to, then
// validates + caps shape so a malformed or huge response can't break the
// client or balloon KV/response size.
function parseProjectImportResponse(raw) {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) cleaned = fenceMatch[1];
  const data = JSON.parse(cleaned);

  const capText = (s, len = 300) => String(s || "").slice(0, len);
  const tasks = Array.isArray(data.tasks) ? data.tasks.slice(0, 40).map(t => ({
    text: capText(t?.text),
    subtasks: Array.isArray(t?.subtasks) ? t.subtasks.slice(0, 15).map(s => capText(s, 200)).filter(Boolean) : [],
  })).filter(t => t.text) : [];
  const timeline = Array.isArray(data.timeline) ? data.timeline.slice(0, 40).map(it => ({
    text: capText(it?.text),
    date: typeof it?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : null,
  })).filter(it => it.text) : [];
  const brainstorm = Array.isArray(data.brainstorm) ? data.brainstorm.slice(0, 40).map(s => capText(s, 200)).filter(Boolean) : [];
  const board = Array.isArray(data.board) ? data.board.slice(0, 40).map(s => capText(s, 400)).filter(Boolean) : [];

  return { tasks, timeline, brainstorm, board };
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

        const prompt = `מאת: ${(sender || "").slice(0, 200)}\nנושא: ${(subject || "").slice(0, 300)}\n\nתוכן:\n${body.slice(0, 3000)}\n\n---\n${formatInstructions[format] || formatInstructions.summary}\n\nחשוב: תמיד תחזירי טקסט כלשהו — אם אין נקודות/משימות/תאריכים רלוונטיים במייל, כתבי משפט קצר שאומר זאת (למשל "לא נמצאו משימות במייל הזה"), ולעולם אל תחזירי תשובה ריקה.`;

        let result = await callClaude(env, { maxTokens: 500, prompt });
        // The model occasionally returns an empty (or whitespace-only)
        // completion for no clear reason — retry once before giving up,
        // rather than showing the user a blank section.
        if (!result || !result.trim()) {
          result = await callClaude(env, { maxTokens: 500, prompt }).catch(() => "");
        }
        if (!result || !result.trim()) {
          result = "לא הצלחתי להפיק תוכן עבור הפורמט הזה מהמייל הזה. נסי לגבות שוב בעוד רגע.";
        }
        return new Response(JSON.stringify({ result }), { headers: { ...headers, "content-type": "application/json" } });
      }

      if (request.method === "POST" && url.pathname === "/parse-project-file") {
        const { kind, mimeType, data, text } = await request.json();
        if (kind !== "image" && kind !== "pdf" && kind !== "text") {
          return new Response(JSON.stringify({ error: "Unsupported file kind" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }
        if ((kind === "image" || kind === "pdf") && (!data || typeof data !== "string")) {
          return new Response(JSON.stringify({ error: "Missing file data" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }
        if (kind === "text" && (!text || typeof text !== "string" || !text.trim())) {
          return new Response(JSON.stringify({ error: "Missing text" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }

        const todayStr = new Date().toISOString().split("T")[0];
        let prompt;
        if (kind === "image") {
          prompt = [
            { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data } },
            { type: "text", text: projectImportPrompt(todayStr) },
          ];
        } else if (kind === "pdf") {
          prompt = [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            { type: "text", text: projectImportPrompt(todayStr) },
          ];
        } else {
          prompt = projectImportPrompt(todayStr, text);
        }

        const raw = await callClaude(env, { maxTokens: 2000, prompt });
        let parsed;
        try {
          parsed = parseProjectImportResponse(raw);
        } catch (err) {
          console.error("parse-project-file: failed to parse Claude response", err.message, raw.slice(0, 300));
          return new Response(JSON.stringify({ error: "לא הצלחתי לפרק את הקובץ הזה. נסי שוב או עם קובץ אחר." }), { status: 502, headers: { ...headers, "content-type": "application/json" } });
        }
        return new Response(JSON.stringify(parsed), { headers: { ...headers, "content-type": "application/json" } });
      }

      if (request.method === "POST" && url.pathname === "/push/subscribe") {
        if (!env.PUSH_KV) {
          return new Response(JSON.stringify({ error: "Push notifications aren't configured on the server yet." }), { status: 503, headers: { ...headers, "content-type": "application/json" } });
        }
        const { subscription, reminders } = await request.json();
        if (!subscription?.endpoint) {
          return new Response(JSON.stringify({ error: "Missing subscription" }), { status: 400, headers: { ...headers, "content-type": "application/json" } });
        }
        const key = `push:${await sha256Hex(subscription.endpoint)}`;
        const cleanReminders = sanitizeReminders(reminders);
        const keepIds = new Set(cleanReminders.map(r => r.id));
        const existingRaw = await env.PUSH_KV.get(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : null;
        // Preserve which reminders were already notified across resyncs (the
        // client resends its full reminder list on every change), so a
        // reminder that already fired doesn't get pushed again — but drop
        // entries for reminders that no longer exist client-side.
        const notified = (existing?.notified || []).filter(id => keepIds.has(id));
        await env.PUSH_KV.put(key, JSON.stringify({ subscription, reminders: cleanReminders, notified, updatedAt: new Date().toISOString() }));
        return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, "content-type": "application/json" } });
      }

      if (request.method === "POST" && url.pathname === "/push/unsubscribe") {
        if (!env.PUSH_KV) {
          return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, "content-type": "application/json" } });
        }
        const { endpoint } = await request.json();
        if (endpoint) await env.PUSH_KV.delete(`push:${await sha256Hex(endpoint)}`);
        return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, "content-type": "application/json" } });
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

  // Cloudflare cron trigger entry point (see [triggers] in wrangler.toml).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendDueReminders(env));
  },
};
