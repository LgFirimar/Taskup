import { useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import OriginalEmailLink from "./OriginalEmailLink";

// Read-only history of mail processed by "הוראות" (sort/delete-only rules,
// no AI summarization). Entries are prepended as they're created, so the
// array is already most-recent-first.
//
// Three-level drill-down, each level collapsed by default (a flat list got
// long fast once several instructions had been running for a while):
// category (see the category picker in EmailOverlay's "+ הוראה חדשה" form)
// → the specific instruction within it → that instruction's emails. A
// category can hold several instructions (e.g. two different senders both
// tagged "עבודה"), so going straight from category to a merged email list
// made it hard to tell which instruction actually caught which mail —
// clicking the category now reveals its instructions first, and only
// clicking one of those reveals its emails. Instructions with no category,
// or a log entry whose instruction was later deleted so nothing can be
// resolved, fall into one "ללא קטגוריה" bucket. Each entry still shows what
// actually happened to it (moved to a folder / deleted) inline, since
// that's no longer implied by the group itself the way it was when the top
// level grouped by sort-target.
export default function EmailInstructionsLog({ accent, emailInstructionLog, emailInstructions, onBackToEmailHome, onAppHome }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const toggleGroup = (key) => setExpandedGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  // Keyed by instructionId — unique across the whole page (a given
  // instruction only ever falls under one category group), so no need to
  // namespace this per-category too.
  const [expandedInstructionGroups, setExpandedInstructionGroups] = useState(() => new Set());
  const toggleInstructionGroup = (key) => setExpandedInstructionGroups(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const instructionById = new Map((emailInstructions || []).map(i => [i.id, i]));
  const instructionSummary = (instruction) =>
    [instruction?.sender && `מ: ${instruction.sender}`, instruction?.subject && `מילים: ${instruction.subject}`].filter(Boolean).join(" | ") || "(הוראה ללא תנאים)";

  // Nested grouping — category, then instruction within it — while
  // preserving each level's first-appearance order. Since the log is
  // already most-recent-first, that means the most recently active
  // category/instruction comes first.
  const groups = [];
  const groupIndexByKey = new Map();
  emailInstructionLog.forEach(m => {
    const instruction = instructionById.get(m.instructionId);
    const category = instruction?.category || "";
    const catKey = category || "__none__";
    if (!groupIndexByKey.has(catKey)) {
      groupIndexByKey.set(catKey, groups.length);
      groups.push({ key: catKey, label: category || "ללא קטגוריה", total: 0, instructionGroups: [], instructionIndexByKey: new Map() });
    }
    const catGroup = groups[groupIndexByKey.get(catKey)];
    catGroup.total++;
    const instrKey = m.instructionId || "__unknown__";
    if (!catGroup.instructionIndexByKey.has(instrKey)) {
      catGroup.instructionIndexByKey.set(instrKey, catGroup.instructionGroups.length);
      catGroup.instructionGroups.push({ key: instrKey, label: instruction ? instructionSummary(instruction) : "הוראה שנמחקה", entries: [] });
    }
    catGroup.instructionGroups[catGroup.instructionIndexByKey.get(instrKey)].entries.push(m);
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
                <span style={{flex:1,fontSize:13,fontWeight:700,color:g.key==="__none__"?"#8a8a8a":accent}}>🏷️ {g.label}</span>
                <span style={{fontSize:11,fontWeight:700,color:"#8a8a8a"}}>{g.total}</span>
                <span style={{fontSize:12,color:"#8a8a8a",display:"inline-block",transition:"transform 0.15s",transform:isOpen?"rotate(180deg)":"none"}}>▾</span>
              </button>
              {isOpen&&(
                <div style={{padding:"8px 0 0 14px"}}>
                  {g.instructionGroups.map(ig=>{
                    const isInstrOpen = expandedInstructionGroups.has(ig.key);
                    return (
                      <div key={ig.key} style={{marginBottom:8}}>
                        <button
                          onClick={()=>toggleInstructionGroup(ig.key)}
                          aria-expanded={isInstrOpen}
                          style={{width:"100%",background:"#f9f9f8",border:"1.5px solid #eee",borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"'Heebo',sans-serif",textAlign:"right"}}
                        >
                          <span style={{flex:1,fontSize:12,fontWeight:600,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ig.label}</span>
                          <span style={{fontSize:11,fontWeight:700,color:"#8a8a8a"}}>{ig.entries.length}</span>
                          <span style={{fontSize:11,color:"#8a8a8a",display:"inline-block",transition:"transform 0.15s",transform:isInstrOpen?"rotate(180deg)":"none"}}>▾</span>
                        </button>
                        {isInstrOpen&&(
                          <div style={{padding:"8px 0 0"}}>
                            {ig.entries.map(m=>{
                              const isDelete = m.action === "delete";
                              const actionLabel = isDelete ? "🗑️ נמחקה" : `📁 ${m.labelName || "מוין"}`;
                              return (
                                <div key={`${m.instructionId}:${m.id}`} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                                  <div style={{fontSize:11,color:"#6b6b6b",marginBottom:3}}>{m.sender} • {m.date?new Date(m.date).toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""} • <span style={{color:isDelete?"#b91c1c":"#0077b6"}}>{actionLabel}</span></div>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                                    <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e",flex:1}}>{m.subject}</div>
                                    <OriginalEmailLink id={m.id} messageId={m.messageId}/>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
