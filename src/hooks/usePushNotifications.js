import { useEffect, useRef, useState } from "react";
import { WORKER_URL, VAPID_PUBLIC_KEY, urlBase64ToUint8Array, collectAllReminders } from "../utils";

// Real (OS-level, works-while-app-closed) push notifications for reminders'
// alertDate, via the browser Push API + a Cloudflare Worker that stores each
// subscription's reminder schedule in KV and checks it on a cron trigger
// (see worker.js's /push/subscribe, /push/unsubscribe and sendDueReminders).
//
// Deliberately scoped to reminders only, not task due dates — task due dates
// have no single "fire once" instant (they'd stay "due" every day until
// marked done, and the Worker doesn't track done-state), so pushing those
// would need a materially different flush design. Left as a possible later
// addition.
export function usePushNotifications({ profiles }) {
  const [pushSupported] = useState(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  );
  const [pushSubscribed, setPushSubscribed] = useState(() => localStorage.getItem("push_subscribed") === "1");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const resyncTimerRef = useRef(null);

  const enablePush = async () => {
    if (!pushSupported) { setPushError("הדפדפן הזה לא תומך בהתראות Push."); return; }
    setPushBusy(true);
    setPushError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError(permission === "denied" ? "ההרשאה נחסמה — אפשר לאשר התראות בהגדרות הדפדפן ולנסות שוב." : "לא אושרה הרשאה להתראות.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const res = await fetch(`${WORKER_URL}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), reminders: collectAllReminders(profiles) }),
      });
      if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);
      localStorage.setItem("push_subscribed", "1");
      setPushSubscribed(true);
    } catch (err) {
      console.error("enablePush failed", err);
      setPushError("החיבור להתראות נכשל. נסי שוב בעוד רגע.");
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    setPushError("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(`${WORKER_URL}/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe();
      }
    } catch (err) {
      console.error("disablePush failed", err);
    } finally {
      localStorage.removeItem("push_subscribed");
      setPushSubscribed(false);
      setPushBusy(false);
    }
  };

  // Keep the Worker's copy of "what to notify about" fresh: whenever
  // reminders change (add/edit/mark done/delete an alertDate) and a
  // subscription is already active, silently resend the current list after a
  // quiet moment — same debounce pattern as the Google Drive auto-backup.
  useEffect(() => {
    if (!pushSubscribed) return;
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) { setPushSubscribed(false); localStorage.removeItem("push_subscribed"); return; }
        await fetch(`${WORKER_URL}/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON(), reminders: collectAllReminders(profiles) }),
        });
      } catch (err) {
        console.error("push resync failed", err);
      }
    }, 10000);
    return () => { if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current); };
  }, [profiles, pushSubscribed]);

  return { pushSupported, pushSubscribed, pushBusy, pushError, setPushError, enablePush, disablePush };
}
