import { useRef, useState } from "react";
import { EMAIL_FORMAT_LABELS, ruleFormats } from "../utils";
import { useFocusTrap } from "../hooks/useFocusTrap";

const TABS = [["new","חדשים"],["pending","⏳ ממתינות"],["done","✅ בוצעו"]];

// One rule's fetched emails, filtered into three views: new (untouched —
// the default), pending, and done. Per her spec, no delete/move-to-folder
// actions are shown per card — just a done/pending mark. Archiving is either
// automatic (rule.archiveAuto) or viewable read-only via the "📁 תיקייה" page.
export default function EmailRuleDetail({
  accent, rule, gmailLabels, summaries,
  onSetStatus, onSyncRule, syncing, onOpenFolder,
  onBackToEmailHome, onAppHome,
}) {
  const [tab, setTab] = useState("new");
  const [collapsedSections, setCollapsedSections] = useState({});
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);

  const byTab = {
    new: summaries.filter(s=>!s.status),
    pending: summaries.filter(s=>s.status==="pending"),
    done: summaries.filter(s=>s.status==="done"),
  };
  const shown = byTab[tab];
  const labelName = rule.archiveLabelName || gmailLabels.find(l=>l.id===rule.archiveLabelId)?.name;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={`מיילים — ${rule.sender||rule.subject||"חוק"}`} tabIndex={-1} style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:220,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:8}}>
        <button className="back-btn" onClick={onBackToEmailHome}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          לדף המייל
        </button>
        <span style={{fontWeight:800,fontSize:15,flex:1,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rule.sender ? `מ: ${rule.sender}` : (rule.subject || "חוק")}</span>
        <button onClick={onAppHome} aria-label="חזרה לאפליקציה" style={{background:"none",border:"none",cursor:"pointer",color:"#8888a0",fontSize:18,padding:"6px 8px"}}>🏠</button>
      </div>

      <div style={{padding:"12px 20px 0"}}>
        <div style={{fontSize:11,color:accent,marginBottom:10}}>{ruleFormats(rule).map(f=>EMAIL_FORMAT_LABELS[f]||f).join(" + ")}</div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",gap:6,flex:1}}>
            {TABS.map(([v,l])=>(
              <button key={v} onClick={()=>setTab(v)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${tab===v?accent:"#dde"}`,background:tab===v?`${accent}15`:"white",color:tab===v?accent:"#888",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,fontWeight:tab===v?700:400}}>
                {l} {byTab[v].length>0?`(${byTab[v].length})`:""}
              </button>
            ))}
          </div>
          <button onClick={onSyncRule} disabled={syncing} aria-label="עדכני" style={{background:"none",border:"1.5px solid #dde",borderRadius:10,cursor:"pointer",fontSize:13,padding:"6px 10px",color:"#666",flexShrink:0}}>{syncing?"⏳":"🔄 עדכן"}</button>
        </div>
        {labelName&&(
          <button onClick={onOpenFolder} style={{width:"100%",background:"none",border:`1.5px solid #0077b6`,borderRadius:12,color:"#0077b6",padding:"8px 0",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:14}}>📁 תיקיית "{labelName}"</button>
        )}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"0 20px 20px"}}>
        {shown.map((s,i)=>{
          const results = s.results || {};
          const entries = Object.entries(results);
          return (
            <div key={s.id||i} style={{background:"white",borderRadius:16,padding:"16px 18px",marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,0.07)"}}>
              <div style={{fontSize:11,color:"#6b6b6b",marginBottom:4}}>{s.sender} • {s.date?new Date(s.date).toLocaleDateString("he-IL",{day:"numeric",month:"short"}):"" }</div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#1a1a2e"}}>{s.subject}</div>
              {entries.map(([fmt,text],idx)=>{
                const key = `${s.id||i}_${fmt}`;
                const collapsed = !!collapsedSections[key];
                return (
                  <div key={fmt} style={{marginTop:idx>0?10:0,paddingTop:idx>0?10:0,borderTop:idx>0?"1px solid #f0f0f8":"none"}}>
                    <button
                      onClick={()=>setCollapsedSections(p=>({...p,[key]:!p[key]}))}
                      style={{display:"flex",alignItems:"center",gap:6,width:"100%",background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:collapsed?0:6,fontFamily:"'Heebo',sans-serif"}}
                    >
                      <span style={{fontSize:12,fontWeight:700,color:accent}}>{EMAIL_FORMAT_LABELS[fmt]||fmt}</span>
                      <span style={{fontSize:11,color:"#8a8a8a",marginRight:"auto"}}>{collapsed?"▸":"▾"}</span>
                    </button>
                    {!collapsed&&<div style={{fontSize:13,color:"#444",lineHeight:1.7,whiteSpace:"pre-line"}}>{text}</div>}
                  </div>
                );
              })}
              {s.archived&&<div style={{marginTop:10,fontSize:11,color:"#2d6a4f",fontWeight:600}}>📥 הועבר לתיקייה</div>}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                {tab==="new"&&(<>
                  <button onClick={()=>onSetStatus(s.id,"done")} style={{flex:1,background:"#2d6a4f",color:"white",border:"none",borderRadius:10,padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>✓ בוצע</button>
                  <button onClick={()=>onSetStatus(s.id,"pending")} style={{flex:1,background:"none",border:"1.5px solid #dde",borderRadius:10,color:"#888",padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>⏳ ממתין</button>
                </>)}
                {tab==="pending"&&(<>
                  <button onClick={()=>onSetStatus(s.id,"done")} style={{flex:1,background:"#2d6a4f",color:"white",border:"none",borderRadius:10,padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>✓ בוצע</button>
                  <button onClick={()=>onSetStatus(s.id,null)} style={{flex:1,background:"none",border:"1.5px solid #dde",borderRadius:10,color:"#888",padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>↩️ בטל</button>
                </>)}
                {tab==="done"&&(
                  <button onClick={()=>onSetStatus(s.id,null)} style={{flex:1,background:"none",border:"1.5px solid #dde",borderRadius:10,color:"#888",padding:"7px 0",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>↩️ בטל</button>
                )}
              </div>
            </div>
          );
        })}
        {shown.length===0&&(
          <div className="empty-state">
            {tab==="new"&&"אין מיילים חדשים — לחצי \"🔄 עדכן\" כדי לבדוק שוב."}
            {tab==="pending"&&"אין מיילים שסומנו כממתינים."}
            {tab==="done"&&"אין מיילים שסומנו כבוצעו."}
          </div>
        )}
      </div>
    </div>
  );
}
