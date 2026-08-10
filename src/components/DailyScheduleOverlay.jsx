import { useRef, useState, useCallback } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { uid, WORKER_URL, minToHHMM } from "../utils";

const PEACH = "#ea580c";

// Full-screen לו"ז יומי overlay.
//
// Phase 1 — bulk input: type all today's tasks (one per line, Enter = new line).
//   "תכלל ✦" calls Claude to estimate durations + fixed times + travel.
// Phase 2 — schedule view: shows the AI-built timeline.
//   Can add individual tasks one at a time.
//   "טען אתמול" copies yesterday's items (if any) into today.
//   3 AM reset: the todayKey passed from App already reflects the 3 AM boundary.
export default function DailyScheduleOverlay({
  accent, setShowDailySchedule,
  items, plan, settings,
  addItem, addItems, toggleItem, deleteItem,
  saveSettings,
  yesterdayItems, loadYesterday,
}) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true);

  const [bulkText, setBulkText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [singleInput, setSingleInput] = useState("");
  const [singleTime, setSingleTime] = useState("");

  const hasItems = items.length > 0;
  const todayLabel = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  const buildSchedule = useCallback(async () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`${WORKER_URL}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tasks: lines, dayStart: settings.dayStart, dayEnd: settings.dayEnd, homeAddress: settings.homeAddress || "" }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) throw new Error(data.error || "שגיאה");
      const newItems = data.items.map(it => ({
        id: uid(),
        text: it.text || "",
        fixedTime: it.fixedTime || null,
        durationMin: it.durationMin || 30,
        travelMin: it.travelMin || 0,
        done: false,
        createdAt: Date.now(),
      }));
      // If travel needed, insert a travel block before the task
      const withTravel = [];
      newItems.forEach(it => {
        if (it.travelMin > 0) {
          withTravel.push({ id: uid(), text: `🚗 נסיעה — ${it.text}`, fixedTime: null, durationMin: it.travelMin, done: false, createdAt: Date.now() - 1, isTravel: true });
        }
        withTravel.push(it);
      });
      addItems(withTravel);
      setBulkText("");
    } catch (e) {
      setAiError("לא הצלחתי לבנות לו\"ז — " + e.message);
    } finally {
      setAiLoading(false);
    }
  }, [bulkText, settings, addItems]);

  const submitSingle = () => {
    if (!singleInput.trim()) return;
    addItem(singleInput.trim(), singleTime || null, 30);
    setSingleInput(""); setSingleTime("");
  };

  const pendingCount = plan.scheduled.filter(i => !i.done).length;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label='לו"ז יומי' tabIndex={-1}
      style={{ position: "fixed", inset: 0, background: "white", zIndex: 200, direction: "rtl", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #ebebea", display: "flex", alignItems: "center", gap: 12, background: "white", flexShrink: 0 }}>
        <button className="back-btn" onClick={() => setShowDailySchedule(false)}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M5 11 Q9 11 11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M11 11 H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 5 L23 11 L16 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5" cy="11" r="3" fill="currentColor" opacity="0.45"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600 }}>חזרה</span>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>לו"ז יומי</div>
          <div style={{ fontSize: 12, color: "#6b6b6b" }}>{todayLabel}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {hasItems && yesterdayItems.length > 0 && (
            <button onClick={loadYesterday}
              style={{ background: "#fff4ed", border: `1px solid ${PEACH}40`, color: PEACH, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 600 }}>
              📅 אתמול
            </button>
          )}
          {hasItems && (
            <button onClick={() => setShowSettings(v => !v)} aria-label="הגדרות שעות היום"
              style={{ background: "none", border: "none", fontSize: 13, color: "#6b6b6b", cursor: "pointer", fontFamily: "'Heebo',sans-serif" }}>
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Day-range + home address settings */}
      {showSettings && (
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #ebebea", display: "flex", flexDirection: "column", gap: 10, background: "#fafaf9", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4a4a4a" }}>
              מ-
              <input type="time" className="plain-input" style={{ fontSize: 14, padding: "6px 8px", width: 110 }} value={settings.dayStart}
                onChange={e => saveSettings({ ...settings, dayStart: e.target.value })} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4a4a4a" }}>
              עד
              <input type="time" className="plain-input" style={{ fontSize: 14, padding: "6px 8px", width: 110 }} value={settings.dayEnd}
                onChange={e => saveSettings({ ...settings, dayEnd: e.target.value })} />
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#4a4a4a" }}>
            🏠 כתובת הבית (לחישוב זמני נסיעה)
            <input className="plain-input" style={{ fontSize: 13, padding: "6px 10px" }}
              placeholder="רחוב ומספר, עיר"
              value={settings.homeAddress || ""}
              onChange={e => saveSettings({ ...settings, homeAddress: e.target.value })} />
          </label>
        </div>
      )}

      {/* ── Phase 1: bulk input ── */}
      {!hasItems && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px 20px", gap: 16 }}>
          <div style={{ fontSize: 14, color: "#6b6b6b", fontWeight: 600 }}>
            מה יש לך להיום? כתבי משימה בכל שורה — קלוד יבנה לך לו"ז מומלץ 🗓️
          </div>

          {yesterdayItems.length > 0 && (
            <button onClick={loadYesterday}
              style={{ alignSelf: "flex-start", background: "#fff4ed", border: `1px solid ${PEACH}40`, color: PEACH, borderRadius: 10, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 600 }}>
              📅 טען לו"ז של אתמול
            </button>
          )}

          <textarea
            autoFocus
            className="plain-input"
            placeholder={"טיול עם הכלב\nקניות סופר\nאיסוף ילדים ב-15:30\nפגישה עם מנהל"}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") e.stopPropagation(); }}
            style={{ flex: 1, resize: "none", fontSize: 15, lineHeight: 1.8, padding: "14px", borderRadius: 14, minHeight: 200 }}
          />

          {aiError && <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "8px 12px" }}>{aiError}</div>}

          <button
            onClick={buildSchedule}
            disabled={aiLoading || !bulkText.trim()}
            style={{ background: aiLoading || !bulkText.trim() ? "#f5f5f4" : `linear-gradient(135deg,${PEACH},#c2410c)`, color: aiLoading || !bulkText.trim() ? "#aaa" : "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 16, fontWeight: 700, cursor: aiLoading || !bulkText.trim() ? "default" : "pointer", fontFamily: "'Heebo',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
            {aiLoading
              ? <><div style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid #ddd", borderTop: "2.5px solid #888", animation: "spin 0.8s linear infinite" }} /> מכין לו"ז...</>
              : <>✦ תכלל — בנה לו"ז</>}
          </button>
        </div>
      )}

      {/* ── Phase 2: schedule view ── */}
      {hasItems && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 160px" }}>

            {/* Progress bar */}
            {pendingCount > 0 && (
              <div style={{ margin: "8px 0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 5, background: "#f0f0ef", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((plan.done.length / items.length) * 100)}%`, background: `linear-gradient(90deg,${PEACH},#c2410c)`, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, color: "#6b6b6b", whiteSpace: "nowrap" }}>{plan.done.length}/{items.length}</span>
              </div>
            )}

            {/* Scheduled items */}
            {plan.scheduled.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f5f4" }}>
                <button onClick={() => toggleItem(item.id)} aria-label={`סמני "${item.text}" כבוצע`}
                  style={{ width: 20, height: 20, minWidth: 20, marginTop: 2, borderRadius: "50%", border: `1.5px solid ${PEACH}`, background: "none", padding: 0, cursor: "pointer", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.isFixed ? PEACH : "#8a8a8a", minWidth: 40, flexShrink: 0 }}>{minToHHMM(item.start)}</span>
                    {item.isFixed && <span title="שעה קבועה" style={{ fontSize: 10 }}>📌</span>}
                    {item.isTravel && <span style={{ fontSize: 10 }}>🚗</span>}
                    <span style={{ fontSize: 15, color: "#1a1a1a", lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{item.durationMin} דק׳ · מסיים {minToHHMM(item.end)}{item.travelNote ? ` · ⚠️ ${item.travelNote}` : ""}</div>
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }} aria-label="מחק">✕</button>
              </div>
            ))}

            {/* Overflow */}
            {plan.overflow.length > 0 && (
              <div style={{ marginTop: 16, background: "#fef2f2", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "#dc2626", fontWeight: 700, marginBottom: 8 }}>⚠️ לא נכנס ללו"ז היום (אין מספיק זמן עד {settings.dayEnd})</div>
                {plan.overflow.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <button onClick={() => toggleItem(item.id)} style={{ width: 18, height: 18, minWidth: 18, borderRadius: "50%", border: "1.5px solid #dc2626", background: "none", padding: 0, cursor: "pointer", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, color: "#1a1a1a" }}>{item.text}</span>
                    <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, cursor: "pointer", padding: "2px 4px" }} aria-label="מחק">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Done */}
            {plan.done.length > 0 && (<>
              <button onClick={() => setShowDone(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 12, color: "#6b6b6b", fontWeight: 600, padding: "14px 4px 6px", display: "flex", alignItems: "center", gap: 6 }}>
                ✅ בוצע ({plan.done.length}) <span style={{ fontSize: 9 }}>{showDone ? "▲" : "▼"}</span>
              </button>
              {showDone && plan.done.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", opacity: 0.5 }}>
                  <button onClick={() => toggleItem(item.id)} style={{ width: 20, height: 20, minWidth: 20, borderRadius: "50%", border: `1.5px solid ${PEACH}`, background: PEACH, padding: 0, cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, color: "#999", textDecoration: "line-through" }}>{item.text}</span>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", color: "#ddd", fontSize: 16, cursor: "pointer", padding: "2px 4px" }} aria-label="מחק">✕</button>
                </div>
              ))}
            </>)}
          </div>

          {/* Fixed add bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid #ebebea", background: "white", zIndex: 201 }}>
            <div style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 6, fontWeight: 600 }}>הוסיפי משימה — שעה רק אם חייב להיות בדיוק אז</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="plain-input" style={{ flex: 1, fontSize: 15 }} placeholder="מה עוד יש להיום?" value={singleInput}
                onChange={e => setSingleInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitSingle(); }} />
              <input type="time" className="plain-input" style={{ fontSize: 15, width: 100 }} value={singleTime}
                onChange={e => setSingleTime(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitSingle(); }} />
              <button className="add-btn" style={{ minWidth: 48, background: `linear-gradient(135deg,${PEACH},#c2410c)` }} aria-label='הוסף משימה ללו"ז' onClick={submitSingle}>+</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
