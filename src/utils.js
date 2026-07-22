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
