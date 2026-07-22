import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Read-only history of mail processed by "הוראות" (sort/delete-only rules,
// no AI summarization). Entries are prepended as they're created, so the
// array is already most-recent-first.
export default function EmailInstructionsLog({ accent, emailInstructionLog, onBackToEmailHome, onAppHome }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="הוראות — מיילים שטופלו" tabIndex={-1} style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:230,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:8}}>
        <button className="back-btn" onClick={onBackToEmailHome}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          לדף המייל
        </button>
        <span style={{fontWeight:800,fontSize:15,flex:1,textAlign:"center"}}>📋 הוראות — מיילים שטופלו</span>
        <button onClick={onAppHome} aria-label="חזרה לאפליקציה" style={{background:"none",border:"none",cursor:"pointer",color:"#8888a0",fontSize:18,padding:"6px 8px"}}>🏠</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 20px 20px"}}>
        {emailInstructionLog.map(m=>(
          <div key={`${m.instructionId}:${m.id}`} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
            <div style={{fontSize:11,color:"#6b6b6b",marginBottom:3}}>{m.sender} • {m.date?new Date(m.date).toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e",marginBottom:6}}>{m.subject}</div>
            <span style={{display:"inline-block",fontSize:11,fontWeight:700,borderRadius:8,padding:"3px 9px",background:m.action==="delete"?"#fef2f2":`${accent}18`,color:m.action==="delete"?"#b91c1c":accent}}>
              {m.action==="delete" ? "🗑️ נמחק" : `📁 ${m.labelName || "מוין"}`}
            </span>
          </div>
        ))}
        {emailInstructionLog.length===0&&(
          <div className="empty-state">עדיין לא טופלו מיילים לפי הוראות.</div>
        )}
      </div>
    </div>
  );
}
