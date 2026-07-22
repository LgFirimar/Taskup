import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Read-only, live view of what's actually inside a Gmail label/folder —
// fetched fresh from Gmail each time, not from anything Taskup tracked
// locally, so it reflects reality even if mail was moved there some other way.
export default function EmailFolderView({ accent, labelName, messages, loading, error, onRefresh, onBackToEmailHome, onAppHome }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={`תיקיית ${labelName}`} tabIndex={-1} style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:230,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:8}}>
        <button className="back-btn" onClick={onBackToEmailHome}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          לדף המייל
        </button>
        <span style={{fontWeight:800,fontSize:15,flex:1,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📁 {labelName}</span>
        <button onClick={onAppHome} aria-label="חזרה לאפליקציה" style={{background:"none",border:"none",cursor:"pointer",color:"#8888a0",fontSize:18,padding:"6px 8px"}}>🏠</button>
      </div>

      <div style={{padding:"12px 20px 0"}}>
        <button onClick={onRefresh} disabled={loading} style={{width:"100%",background:"none",border:"1.5px solid #dde",borderRadius:12,color:"#666",padding:"8px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {loading?<><div className="spinner" style={{borderTopColor:accent,borderColor:`${accent}33`}}/>טוענת...</>:"🔄 רענני"}
        </button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 20px 20px"}}>
        {error&&(
          <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c"}}>⚠️ {error}</div>
        )}
        {messages.map(m=>(
          <div key={m.id} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
            <div style={{fontSize:11,color:"#6b6b6b",marginBottom:3}}>{m.sender} • {m.date?new Date(m.date).toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{m.subject}</div>
          </div>
        ))}
        {!loading&&!error&&messages.length===0&&(
          <div className="empty-state">התיקייה ריקה כרגע.</div>
        )}
      </div>
    </div>
  );
}
