// Brief "undo" snackbar shown after deleting a single task or reminder —
// deletion happens immediately, but this gives a few seconds to reverse it
// before it's gone for good.
export default function UndoToast({ lastDeleted, undoDeleteItem }) {
  if (!lastDeleted) return null;
  const label = lastDeleted.type === "task" ? "המשימה נמחקה" : "התזכורת נמחקה";
  return (
    <div
      role="status"
      style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        background: "#1a1a1a", color: "white", borderRadius: 100, padding: "10px 8px 10px 18px",
        display: "flex", alignItems: "center", gap: 12, zIndex: 300,
        boxShadow: "0 6px 24px rgba(0,0,0,0.28)", fontFamily: "'Heebo',sans-serif", fontSize: 13,
        direction: "rtl", maxWidth: "calc(100vw - 32px)",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}: "{lastDeleted.item.text}"
      </span>
      <button
        onClick={undoDeleteItem}
        style={{ background: "none", border: "none", color: "#7fd99a", cursor: "pointer", fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 100 }}
      >
        בטל מחיקה ↩
      </button>
    </div>
  );
}
