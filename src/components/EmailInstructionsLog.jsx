import { useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { gmailWebUrl } from "../utils";

// Read-only history of mail processed by "הוראות" (sort/delete-only rules,
// no AI summarization). Entries are prepended as they're created, so the
// array is already most-recent-first.
//
// Grouped by "sort group" — the folder mail was moved to, or a single
// "נמחקו" group for deletions — collapsed by default, one click per group
// reveals its emails. A flat list got long fast once several instructions
// had been running for a while.
export default function EmailInstructionsLog({ accent, emailInstructionLog, onBackToEmailHome, onAppHome }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const toggleGroup = (key) => setExpandedGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Group while preserving each group's first-appearance order — since the
  // log is already most-recent-first, that means the most recently active
  // group comes first.
  const groups = [];
  const groupIndexByKey = new Map();
  emailInstructionLog.forEach(m => {
    const isDelete = m.action === "delete";
    const key = isDelete ? "__deleted__" : (m.labelName || "מוין");
    if (!groupIndexByKey.has(key)) {
      groupIndexByKey.set(key, groups.length);
      groups.push({ key, label: isDelete ? "🗑️ נמחקו" : `📁 ${key}`, entries: [] });
    }
    groups[groupIndexByKey.get(key)].entries.push(m);
  });

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
        {groups.map(g=>{
          const isOpen = expandedGroups.has(g.key);
          return (
            <div key={g.key} style={{marginBottom:8}}>
              <button
                onClick={()=>toggleGroup(g.key)}
                aria-expanded={isOpen}
                style={{width:"100%",background:"white",border:"none",borderRadius:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"'Heebo',sans-serif",textAlign:"right"}}
              >
                <span style={{flex:1,fontSize:13,fontWeight:700,color:g.key==="__deleted__"?"#b91c1c":accent}}>{g.label}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#8a8a8a"}}>{g.entries.length}</span>
                <span style={{fontSize:12,color:"#8a8a8a",display:"inline-block",transition:"transform 0.15s",transform:isOpen?"rotate(180deg)":"none"}}>▾</span>
              </button>
              {isOpen&&(
                <div style={{padding:"8px 4px 0"}}>
                  {g.entries.map(m=>(
                    <div key={`${m.instructionId}:${m.id}`} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                      <div style={{fontSize:11,color:"#6b6b6b",marginBottom:3}}>{m.sender} • {m.date?new Date(m.date).toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e",flex:1}}>{m.subject}</div>
                        {m.id&&(
                          <a href={gmailWebUrl(m.id)} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#0077b6",fontWeight:700,whiteSpace:"nowrap",textDecoration:"none",flexShrink:0}}>📩 מייל מקורי</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {emailInstructionLog.length===0&&(
          <div className="empty-state">עדיין לא טופלו מיילים לפי הוראות.</div>
        )}
      </div>
    </div>
  );
}
