// Shared constants and pure helper functions, extracted from App.jsx so the
// main component file stays focused on state + rendering.

export const uid = () => Math.random().toString(36).slice(2, 9);
export const STORAGE_KEY = "taskup_v1";
export const WORKER_URL = "https://taskup-ai.lior0gal.workers.dev";
// A single Google OAuth Client ID for the whole app, baked in at build time via
// the VITE_GMAIL_CLIENT_ID env var on the hosting platform. This lets any user
// just click "התחבר ל-Gmail" with zero Google Cloud Console setup of their own —
// only the app owner sets this up once. If it's not set (e.g. local dev without
// the env var), the app falls back to the old manual Client-ID-entry flow.
export const DEFAULT_GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID || "";
export const PRIO_CYCLE = [null, "green", "yellow", "red"];
export const PRIO_COLOR = { green:"#4caf50", yellow:"#ffa726", red:"#ef5350" };

// Wraps fetch with a timeout via AbortController. Plain fetch() has no
// built-in timeout — a single stalled request (a network hiccup switching
// wifi/cellular, a backgrounded PWA tab, spotty connectivity) leaves
// whatever code is `await`-ing it hanging forever, with no error and
// nothing to catch. That's what turned "sync a big mailbox" into
// "stuck on the first instruction for hours" with no way to recover short
// of force-closing the app: one single request inside a long per-thread
// loop never resolved, and everything after it never got a chance to run.
// Aborting after a timeout turns that into a normal, catchable rejection
// instead, so a sync can report the failure and move on.
export const fetchWithTimeout = (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const TAB_COLORS = [
  "#2d6a4f","#1d4e89","#7b3f00","#5a189a",
  "#9d0208","#0077b6","#6a994e","#8338ec",
  "#c77dff","#e76f51","#457b9d","#e9c46a",
];

export const formatDate = (s) => {
  if (!s) return null;
  return new Date(s+"T00:00:00").toLocaleDateString("he-IL",{day:"numeric",month:"short",year:"numeric"});
};
export const today = () => new Date().toISOString().split("T")[0];

export const getReminderStatus = (startDate,endDate) => {
  if (!startDate) return "none";
  const now=new Date(); now.setHours(0,0,0,0);
  const start=new Date(startDate+"T00:00:00");
  const end=endDate?new Date(endDate+"T00:00:00"):null;
  if (now<start) return "future";
  if (end&&now>end) return "past";
  return "active";
};
export const getDaysUntil = (s) => {
  if (!s) return null;
  const now=new Date(); now.setHours(0,0,0,0);
  return Math.round((new Date(s+"T00:00:00")-now)/86400000);
};
export const loadStorage = () => { try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{};}catch{return{};} };

// Reminders whose alertDate has arrived, computed once from storage (used for lazy state init on mount)
export const computeInitialAlerts = () => {
  const d=loadStorage(); if(!d.profiles) return [];
  const todayStr=new Date().toISOString().split("T")[0];
  const alerting=[];
  Object.values(d.profiles).forEach(p=>{
    (p.tabs||[]).forEach(t=>{
      const check=(reminders)=>reminders.forEach(r=>{
        if(r.done||!r.alertDate) return;
        if(r.alertDate<=todayStr) alerting.push(r);
      });
      check(t.reminders||[]);
      (t.subtabs||[]).forEach(s=>check(s.reminders||[]));
    });
  });
  return alerting;
};

// Public half of the VAPID keypair used for real push notifications (see
// worker.js's sendDueReminders + the useFocusTrap-style usePushNotifications
// hook). Not a secret — it's sent to every push service (FCM etc.) as part of
// each subscription, and is meaningless without the private half, which lives
// only as a Cloudflare Worker secret (VAPID_PRIVATE_KEY) and is never
// committed. Both halves were generated together once; if the private key is
// ever rotated on the Worker, this constant must be updated to match.
export const VAPID_PUBLIC_KEY = "BMXM-WqaJ2e_22W0p58Bm2PbFr7UE8cE9u-Jhv59dwEhW60o8EZHxtqw6cAim_TkTdux-pM1XiUytThARa8uxHg";

// pushManager.subscribe() wants the VAPID public key as a raw Uint8Array, not
// the URL-safe base64 string it's normally shared as.
export const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

// Shared between EmailOverlay, EmailSummariesOverview and EmailRuleDetail so
// format labels/order stay consistent everywhere a rule's formats are shown.
export const EMAIL_FORMAT_OPTIONS = [["bullets","• נקודות"],["summary","📝 סיכום"],["tasks","✅ משימות"],["dates","📅 תאריכים"]];
export const EMAIL_FORMAT_LABELS = Object.fromEntries(EMAIL_FORMAT_OPTIONS);
// A rule created before multi-select support only has a singular `format`
// string — this reads either shape back as an array so old rules keep working.
export const ruleFormats = (rule) => (rule?.formats?.length ? rule.formats : [rule?.format || "bullets"]);

// Turns a comma-separated field value into a list of individual match
// terms, trimmed, with empty entries (stray/double commas) dropped.
const splitTerms = (value) => (value || "").split(",").map(s => s.trim()).filter(Boolean);

// A term is safe to send to Gmail bare only if it's made entirely of
// characters Gmail's query parser is guaranteed to treat as one
// unsplittable token (word characters, @, ., -). Anything else — a space,
// an ampersand, other punctuation — risks Gmail's tokenizer breaking the
// term into separate words instead of matching it as one literal string.
// Quoting forces Gmail to treat it as a single exact phrase regardless.
const atomicTerm = (term) => /^[\w@.-]+$/.test(term) ? term : `"${term}"`;

// Once an instruction/rule has completed at least one full sync, there's no
// need to keep re-listing the same old, already-seen mail on every
// subsequent sync forever — that's what made repeat syncs on a big "כל
// המיילים" backlog get slower over time (already-processed threads are
// always skipped via existingKeys, so nothing was ever re-ACTED on — but
// Gmail still had to re-LIST every matching thread, old and new, on every
// single sync, which is the slow part). lastSyncedAt (set after each
// completed sync — see syncEmail) becomes a rolling floor for the next
// search, with a 1-day overlap for safety (clock skew, a message landing
// right at the boundary). The very first sync (no lastSyncedAt yet) is
// intentionally NOT floored this way, so it can still catch the whole
// existing backlog once.
const watermarkFloor = (lastSyncedAt) => {
  if (!lastSyncedAt) return null;
  const d = new Date(lastSyncedAt);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "/");
};

// Builds Gmail search query strings from a rule/instruction's matching
// fields (sender/keywords/date range) — shared between summarization rules
// and "הוראות" instructions, since both match mail the same way. Note: no
// "in:inbox" restriction — Gmail's default search already excludes
// Spam/Trash, but still matches mail that's been archived out of the inbox
// (a very common case once rules start moving things around).
//
// Returns an ARRAY, not a single string. A comma-separated field with
// several alternatives (e.g. "AliExpress, DoorDash, H&M") used to be
// packed into one from:(A OR B OR C) query, but real-world testing showed
// Gmail's handling of such groups is unreliable once a term has a special
// character or the group gets long — "H&M" in particular would silently
// never match as part of an OR-group, even though from:H&M / from:"H&M"
// on its own works fine. Running one simple, single-term query PER
// alternative instead — and merging the resulting thread ids client-side —
// sidesteps all of that: every individual query is as simple as Gmail
// search gets, so there's no grouping/tokenizing ambiguity left for Gmail
// to get wrong.
export const buildGmailSearchQueries = (ruleLike) => {
  let dateQ = "";
  const watermark = watermarkFloor(ruleLike.lastSyncedAt);
  if (ruleLike.dateAll) {
    if (watermark) dateQ = `after:${watermark} `;
  } else if (ruleLike.dateFrom) {
    const userFloor = ruleLike.dateFrom.replace(/-/g, "/");
    const floor = (watermark && watermark > userFloor) ? watermark : userFloor;
    dateQ = `after:${floor} `;
  } else {
    dateQ = "newer_than:30d ";
  }

  const senderTerms = splitTerms(ruleLike.sender);
  const subjectTerms = splitTerms(ruleLike.subject);
  // scope "all" = also search the email body, not just the subject line.
  const subjectPrefix = ruleLike.searchScope === "all" ? "" : "subject:";

  const senderBranches = senderTerms.length ? senderTerms.map(t => `from:${atomicTerm(t)} `) : [""];
  const subjectBranches = subjectTerms.length ? subjectTerms.map(t => `${subjectPrefix}${atomicTerm(t)} `) : [""];

  const queries = [];
  for (const s of senderBranches) {
    for (const k of subjectBranches) {
      if (!s && !k) continue; // neither sender nor subject set at all — nothing to search on
      queries.push((dateQ + s + k).trim());
    }
  }
  return queries;
};

// Deep link into Gmail's own web/app view for a given thread or message id —
// used wherever a card shows an email we didn't render the full original of
// (summary cards, the הוראות log, the folder viewer), so there's always a
// way to actually open and read it. #all matches regardless of which
// label/view the mail is currently under (inbox, archived, moved by a rule,
// etc). u/0 assumes the first signed-in Google account, which covers the
// common single-account case; a multi-account user may need to switch
// accounts first if this opens the wrong inbox.
export const gmailWebUrl = (id) => `https://mail.google.com/mail/u/0/#all/${id}`;

// "הוראות" — lightweight rules that ONLY sort-to-folder or trash matching
// mail, with no AI summarization involved. Distinct from the summarization
// rules above (see EMAIL_FORMAT_OPTIONS) and from their own log page.
export const EMAIL_INSTRUCTION_ACTION_LABELS = { folder: "📁 מיון לתיקייה", delete: "🗑️ מחיקה (לסל המחזור)" };

// Every open (not done) reminder with an alertDate, across ALL profiles —
// not just the active one — since a push notification should fire regardless
// of which profile happens to be selected in the browser (or whether the app
// is even open at all). Sent to the Worker on every subscribe/resync so it
// knows what to check on its cron schedule.
export const collectAllReminders = (profiles) => {
  const list = [];
  Object.values(profiles || {}).forEach(p => {
    (p.tabs || []).forEach(t => {
      const collect = (reminders) => (reminders || []).forEach(r => {
        if (r.done || !r.alertDate) return;
        list.push({ id: r.id, text: r.text, alertDate: r.alertDate });
      });
      collect(t.reminders);
      (t.subtabs || []).forEach(s => collect(s.reminders));
    });
  });
  return list;
};
