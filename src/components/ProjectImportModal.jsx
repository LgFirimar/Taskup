import { useRef, useState } from "react";
import { WORKER_URL } from "../utils";
import { useFocusTrap } from "../hooks/useFocusTrap";

const MAX_BYTES = { image: 5 * 1024 * 1024, pdf: 15 * 1024 * 1024, text: 2 * 1024 * 1024, docx: 8 * 1024 * 1024 };
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const readAsText = (file) => file.text();
const readAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
  reader.onerror = () => reject(new Error("file read failed"));
  reader.readAsDataURL(file);
});
// mammoth is only pulled into the bundle when someone actually picks a .docx
// file (dynamic import), so the common image/PDF/text paths don't pay for it.
const extractDocxText = async (file) => {
  // Plain "mammoth" import (not the prebuilt mammoth.browser.js, which is a
  // UMD bundle meant for <script> tags) — Vite resolves this through the
  // package's "browser" field, which swaps in browser-compatible unzip/file
  // implementations automatically.
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
};

const CATEGORY_META = {
  tasks: { label: "✅ משימות", key: "tasks" },
  timeline: { label: "📅 לו״ז", key: "timeline" },
  brainstorm: { label: "💭 Brain Storm", key: "brainstorm" },
  board: { label: "🖼️ לוח השראה", key: "board" },
};

// Upload a file (image/PDF/text) for a project, have the Worker's AI break it
// into suggested tasks/timeline/brainstorm/board items, then let the user
// review and pick which suggestions actually get added — nothing is written
// to the project until she confirms.
export default function ProjectImportModal({ projectId, projectName, accent, applyProjectImport, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | preview
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true, phase === "loading" ? undefined : onClose);

  const toggle = (key) => setExcluded(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    // Checked against both MIME type AND file extension — iOS Safari in
    // particular sometimes hands the file input an empty/generic file.type
    // for .docx (and occasionally .txt), which would otherwise make a valid
    // file look unsupported.
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|heic|heif|webp|gif)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isDocx = file.type === DOCX_MIME || /\.docx$/i.test(file.name);
    const isText = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
    if (!isImage && !isPdf && !isDocx && !isText) {
      setError("סוג קובץ לא נתמך כרגע — אפשר להעלות תמונה (גם צילום פתק בכתב יד), PDF, Word (docx) או קובץ טקסט.");
      return;
    }
    const kind = isImage ? "image" : isPdf ? "pdf" : isDocx ? "docx" : "text";
    if (file.size > MAX_BYTES[kind]) {
      setError(`הקובץ גדול מדי (מקסימום ${Math.round(MAX_BYTES[kind] / 1024 / 1024)}MB לסוג הזה).`);
      return;
    }

    setPhase("loading");
    try {
      let payload;
      if (kind === "text") {
        payload = { kind: "text", text: await readAsText(file) };
      } else if (kind === "docx") {
        const text = await extractDocxText(file);
        if (!text || !text.trim()) {
          setError("לא הצלחתי לחלץ טקסט מקובץ ה-Word הזה. אפשר לנסות לייצא אותו ל-PDF ולהעלות את זה.");
          setPhase("idle");
          return;
        }
        payload = { kind: "text", text };
      } else {
        payload = { kind, mimeType: file.type, data: await readAsBase64(file) };
      }

      const res = await fetch(`${WORKER_URL}/parse-project-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Surface the server's actual Hebrew error message when it sent one
        // (e.g. "the document was too long/complex"), instead of always
        // falling back to the generic message below — makes it possible to
        // tell what actually went wrong from a screenshot.
        const serverMessage = await res.json().then(d => d?.error).catch(() => null);
        throw Object.assign(new Error(serverMessage || `parse failed: ${res.status}`), { isServerMessage: !!serverMessage });
      }
      const data = await res.json();
      const isEmpty = !(data.tasks?.length || data.timeline?.length || data.brainstorm?.length || data.board?.length);
      if (isEmpty) {
        setError("לא הצלחתי לזהות בקובץ הזה תוכן שאפשר לפרק לקטגוריות. אפשר לנסות קובץ אחר.");
        setPhase("idle");
        return;
      }
      setSuggestions(data);
      setExcluded(new Set());
      setPhase("preview");
    } catch (err) {
      console.error("project file import failed", err);
      // If the server sent back a specific Hebrew reason (e.g. the document
      // was too long/complex for the AI to parse), show that instead of the
      // generic fallback — makes future issues diagnosable from a screenshot.
      setError(err?.isServerMessage ? err.message : "הפירוק נכשל. נסי שוב בעוד רגע, או עם קובץ אחר.");
      setPhase("idle");
    }
  };

  const totalCount = suggestions
    ? (suggestions.tasks?.length || 0) + (suggestions.timeline?.length || 0) + (suggestions.brainstorm?.length || 0) + (suggestions.board?.length || 0)
    : 0;
  const selectedCount = suggestions
    ? ["tasks", "timeline", "brainstorm", "board"].reduce((sum, cat) => sum + (suggestions[cat] || []).filter((_, i) => !excluded.has(`${cat}-${i}`)).length, 0)
    : 0;

  const confirmImport = () => {
    applyProjectImport(projectId, {
      tasks: (suggestions.tasks || []).filter((_, i) => !excluded.has(`tasks-${i}`)),
      timeline: (suggestions.timeline || []).filter((_, i) => !excluded.has(`timeline-${i}`)),
      bubbles: (suggestions.brainstorm || []).filter((_, i) => !excluded.has(`brainstorm-${i}`)),
      board: (suggestions.board || []).filter((_, i) => !excluded.has(`board-${i}`)),
    });
    onClose();
  };

  return (
    <div className="alert-modal" onClick={() => phase !== "loading" && onClose()}>
      <div className="alert-card" ref={dialogRef} role="dialog" aria-modal="true" aria-label="ייבוא מקובץ" tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>📎</span>
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>ייבוא מקובץ — {projectName}</span>
          {phase !== "loading" && (
            <button onClick={onClose} aria-label="סגור" style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8a8a", fontSize: 18, lineHeight: 1 }}>✕</button>
          )}
        </div>

        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 1.6 }}>
          {phase === "idle" && (
            <>
              <div style={{ color: "#555" }}>
                מעלים קובץ — תמונה (גם צילום פתק בכתב יד), PDF, Word או טקסט — ו-AI מפרק אותו אוטומטית להצעות למשימות, לו״ז, Brain Storm ולוח השראה. את/ה תבחרי בסוף מה באמת נכנס לפרויקט.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,text/plain,.txt,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
              <button className="add-btn" onClick={() => fileInputRef.current?.click()}>בחרי קובץ</button>
            </>
          )}

          {phase === "loading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0" }}>
              <div className="spinner" style={{ borderTopColor: accent, borderColor: `${accent}33` }} />
              <div style={{ color: "#6b6b6b" }}>מנתחת את הקובץ...</div>
            </div>
          )}

          {phase === "preview" && suggestions && (
            <>
              <div style={{ fontSize: 12, color: "#8a8a8a" }}>{selectedCount} מתוך {totalCount} נבחרו — אפשר לבטל סימון לפריטים שלא רוצים להוסיף.</div>
              {["tasks", "timeline", "brainstorm", "board"].map(cat => {
                const items = suggestions[cat] || [];
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#1a1a2e" }}>{CATEGORY_META[cat].label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {items.map((item, i) => {
                        const key = `${cat}-${i}`;
                        const checked = !excluded.has(key);
                        const text = typeof item === "string" ? item : item.text;
                        const subtasks = typeof item === "object" ? item.subtasks : null;
                        const date = typeof item === "object" ? item.date : null;
                        return (
                          <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#f7f7fb", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggle(key)} style={{ marginTop: 2 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: "#1a1a2e" }}>{text}{date ? <span style={{ color: "#8a8a8a", fontSize: 11 }}> · {date}</span> : null}</div>
                              {subtasks?.length > 0 && (
                                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                                  {subtasks.map((st, si) => <div key={si} style={{ fontSize: 12, color: "#6b6b6b" }}>· {st}</div>)}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #f5c6c6", borderRadius: 10, padding: "10px 12px", color: "#b03030", fontSize: 12, lineHeight: 1.6 }}>
              {error}
              <button onClick={() => setError("")} style={{ display: "block", marginTop: 6, background: "none", border: "none", color: "#b03030", textDecoration: "underline", cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "'Heebo',sans-serif" }}>סגרי הודעה</button>
            </div>
          )}
        </div>

        {phase === "preview" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="add-btn" style={{ flex: 1 }} disabled={selectedCount === 0} onClick={confirmImport}>הוסיפי לפרויקט ({selectedCount})</button>
            <button onClick={onClose} style={{ border: "1.5px solid #e5e5e3", borderRadius: 12, background: "white", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontSize: 13, fontWeight: 600, color: "#555", padding: "0 16px" }}>ביטול</button>
          </div>
        )}
      </div>
    </div>
  );
}
