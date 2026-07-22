import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Real push-notification opt-in/out for reminders. Mirrors CloudBackupModal's
// layout/behavior for consistency.
export default function PushNotificationsModal({
  setShowPushModal,
  pushSupported, pushSubscribed, pushBusy, pushError, setPushError,
  enablePush, disablePush,
}) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true, () => setShowPushModal(false));

  return (
    <div className="alert-modal" onClick={() => setShowPushModal(false)}>
      <div className="alert-card" ref={dialogRef} role="dialog" aria-modal="true" aria-label="התראות Push" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>התראות Push</span>
          <button onClick={() => setShowPushModal(false)} aria-label="סגור" style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8a8a", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.6 }}>
          {!pushSupported ? (
            <div style={{ color: "#b03030" }}>הדפדפן הזה לא תומך בהתראות Push (בדרך כלל זה עובד היטב באנדרואיד/כרום, אבל מוגבל ב-iOS אלא אם האפליקציה נוספה למסך הבית).</div>
          ) : !pushSubscribed ? (
            <>
              <div style={{ color: "#555" }}>
                מפעילות התראות אמיתיות שמגיעות גם כשהאפליקציה סגורה — כשמגיע תאריך ההתראה של תזכורת, תקבלי הודעה ישירות מהמכשיר. דורש אישור הרשאת התראות מהדפדפן.
              </div>
              <button className="add-btn" disabled={pushBusy} onClick={enablePush}>
                {pushBusy ? <div className="spinner" style={{ borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> : "הפעילי התראות"}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#2d7a5a", fontWeight: 600 }}>
                <span>✓ התראות Push מופעלות</span>
              </div>
              <div style={{ color: "#6b6b6b" }}>תזכורות עם תאריך התראה יישלחו כהתראה למכשיר, גם כשהאפליקציה סגורה.</div>
              <button
                disabled={pushBusy}
                onClick={disablePush}
                style={{ border: "1.5px solid #e5e5e3", borderRadius: 12, background: "white", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 13, fontWeight: 600, color: "#c08080", padding: "10px 0" }}
              >
                {pushBusy ? <div className="spinner" /> : "כבי התראות"}
              </button>
            </>
          )}

          {pushError && (
            <div style={{ background: "#fff5f5", border: "1px solid #f5c6c6", borderRadius: 10, padding: "10px 12px", color: "#b03030", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {pushError}
              <button onClick={() => setPushError("")} style={{ display: "block", marginTop: 6, background: "none", border: "none", color: "#b03030", textDecoration: "underline", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "'Heebo',sans-serif" }}>סגרי הודעה</button>
            </div>
          )}

          <div style={{ fontSize: 11, color: "#8a8a8a", borderTop: "1px solid #f0f0f8", paddingTop: 10 }}>
            כרגע ההתראות עובדות רק עבור תזכורות עם תאריך התראה — לא עבור תאריכי יעד של משימות.
          </div>
        </div>
      </div>
    </div>
  );
}
