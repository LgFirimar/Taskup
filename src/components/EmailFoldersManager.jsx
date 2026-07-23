import { useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useSwipeToReveal } from "../hooks/useSwipeToReveal";

const REVEAL_WIDTH = 76;

// One folder row: swipe left to reveal a delete button behind it (iOS Mail
// style), tap ✎ to rename inline. Swiping is disabled while renaming so a
// drag on the text input doesn't fight with editing it.
function LabelRow({ label, accent, editing, editName, setEditName, busy, onStartEdit, onSaveEdit, onCancelEdit, onDelete }) {
  const { offset, dragging, isOpen, close, wasDragClick, swipeHandlers } = useSwipeToReveal(REVEAL_WIDTH);

  return (
    <div style={{position:"relative",borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
      {/* Delete action, revealed from behind as the content slides left */}
      <button
        onClick={()=>{ close(); onDelete(label); }}
        disabled={busy}
        aria-label="מחק תיקייה"
        style={{position:"absolute",top:0,bottom:0,right:0,width:REVEAL_WIDTH,background:"#ef4444",color:"white",border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer"}}
      >
        {busy?"⏳":"🗑️"}
      </button>

      <div
        {...(editing ? {} : swipeHandlers)}
        onClick={()=>{ if (wasDragClick()) return; if (isOpen) close(); }}
        style={{
          position:"relative",background:"white",padding:"12px 14px",display:"flex",alignItems:"center",gap:10,
          transform:`translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction:"pan-y",
          userSelect: dragging ? "none" : "auto",
        }}
      >
        {editing ? (
          <>
            <input
              autoFocus className="plain-input" style={{flex:1,fontSize:13}} value={editName}
              onChange={e=>setEditName(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") onSaveEdit(); if(e.key==="Escape") onCancelEdit(); }}
            />
            <button onClick={onSaveEdit} disabled={busy} style={{background:accent,color:"white",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",flexShrink:0}}>{busy?"⏳":"שמור"}</button>
            <button onClick={onCancelEdit} aria-label="בטל עריכה" style={{background:"none",border:"none",color:"#8a8a8a",cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
          </>
        ) : (
          <>
            <span style={{flex:1,fontSize:13,fontWeight:600}}>📁 {label.name}</span>
            <button onClick={onStartEdit} disabled={busy} style={{background:"none",border:"none",color:"#8a8a8a",cursor:"pointer",fontSize:15,flexShrink:0}} aria-label="שנה שם">✎</button>
          </>
        )}
      </div>
    </div>
  );
}

// Rename/delete the actual Gmail folders (labels) rules/instructions move
// mail into — as opposed to the label-picker inside a rule/instruction's own
// form, which only chooses which folder that rule uses.
export default function EmailFoldersManager({ accent, gmailLabels, labelsLoading, labelsError, onRefresh, onRename, onDelete, onBackToEmailHome, onAppHome }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState(null);

  const startEdit = (label) => { setEditingId(label.id); setEditName(label.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); };
  const saveEdit = async (labelId) => {
    if (!editName.trim()) return;
    setBusyId(labelId);
    const ok = await onRename(labelId, editName.trim());
    setBusyId(null);
    if (ok) cancelEdit();
  };
  const handleDelete = async (label) => {
    if (!window.confirm(`למחוק את התיקייה "${label.name}"? המיילים עצמם לא יימחקו — הם רק יאבדו את התווית הזו. חוקים/הוראות שמפנים לתיקייה הזו יפסיקו לעבוד עד שיוגדרו מחדש.`)) return;
    setBusyId(label.id);
    await onDelete(label.id);
    setBusyId(null);
  };

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="ניהול תיקיות" tabIndex={-1} style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:230,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:8}}>
        <button className="back-btn" onClick={onBackToEmailHome}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          לדף המייל
        </button>
        <span style={{fontWeight:800,fontSize:15,flex:1,textAlign:"center"}}>📁 ניהול תיקיות</span>
        <button onClick={onAppHome} aria-label="חזרה לאפליקציה" style={{background:"none",border:"none",cursor:"pointer",color:"#8888a0",fontSize:18,padding:"6px 8px"}}>🏠</button>
      </div>

      <div style={{padding:"12px 20px 0"}}>
        <button onClick={onRefresh} disabled={labelsLoading} style={{width:"100%",background:"none",border:"1.5px solid #dde",borderRadius:12,color:"#666",padding:"8px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {labelsLoading?<><div className="spinner" style={{borderTopColor:accent,borderColor:`${accent}33`}}/>טוענת...</>:"🔄 רענני"}
        </button>
        <div style={{fontSize:11,color:"#8a8a8a",marginBottom:14}}>שינוי שם: לחצי ✎. מחיקה: משכי את התיקייה שמאלה ולחצי על 🗑️. שינוי כאן משפיע ישירות על התיקייה ב-Gmail עצמו.</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 20px 20px"}}>
        {labelsError&&(
          <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c"}}>⚠️ {labelsError}</div>
        )}
        {gmailLabels.map(label=>(
          <LabelRow
            key={label.id}
            label={label}
            accent={accent}
            editing={editingId===label.id}
            editName={editName}
            setEditName={setEditName}
            busy={busyId===label.id}
            onStartEdit={()=>startEdit(label)}
            onSaveEdit={()=>saveEdit(label.id)}
            onCancelEdit={cancelEdit}
            onDelete={handleDelete}
          />
        ))}
        {!labelsLoading&&gmailLabels.length===0&&(
          <div className="empty-state">אין עדיין תיקיות. תיקיות נוצרות אוטומטית כשמגדירים חוק/הוראה עם "תיקייה חדשה".</div>
        )}
      </div>
    </div>
  );
}
