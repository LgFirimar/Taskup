import { useRef } from "react";
import { EMAIL_FORMAT_LABELS, ruleFormats } from "../utils";
import { useFocusTrap } from "../hooks/useFocusTrap";

// "מיילים מסוכמים" — lists every summarization rule so she can pick which
// one's emails to browse. Every sub-page of the email feature (this one
// included) offers exactly two navigation actions: back to the email home
// overlay, or straight to the app's main screen — never a deeper stack.
export default function EmailSummariesOverview({ accent, emailRules, emailSummaries, onOpenRule, onBackToEmailHome, onAppHome }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true, onBackToEmailHome);

  const untouchedCount = (ruleId) => emailSummaries.filter(s => s.ruleId === ruleId && !s.status).length;
  const totalCount = (ruleId) => emailSummaries.filter(s => s.ruleId === ruleId).length;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="מיילים מסוכמים" tabIndex={-1} style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:210,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:8}}>
        <button className="back-btn" onClick={onBackToEmailHome}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          לדף המייל
        </button>
        <span style={{fontWeight:800,fontSize:16,flex:1,textAlign:"center"}}>📧 מיילים מסוכמים</span>
        <button onClick={onAppHome} aria-label="חזרה לאפליקציה" style={{background:"none",border:"none",cursor:"pointer",color:"#8888a0",fontSize:18,padding:"6px 8px"}}>🏠</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {emailRules.map(rule=>{
          const untouched = untouchedCount(rule.id);
          const total = totalCount(rule.id);
          return (
            <button
              key={rule.id}
              onClick={()=>onOpenRule(rule.id)}
              style={{width:"100%",textAlign:"right",background:"white",borderRadius:14,padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1.5px solid transparent`,borderRight:`3px solid ${accent}`,cursor:"pointer",fontFamily:"'Heebo',sans-serif",display:"flex",alignItems:"center",gap:10}}
            >
              <div style={{flex:1}}>
                {rule.sender&&<div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>מ: {rule.sender}</div>}
                {rule.subject&&<div style={{fontSize:12,color:"#888"}}>מילות מפתח: {rule.subject}</div>}
                {!rule.sender&&!rule.subject&&<div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>חוק ללא תנאים</div>}
                <div style={{fontSize:11,color:accent,marginTop:4}}>
                  {ruleFormats(rule).map(f=>EMAIL_FORMAT_LABELS[f]||f).join(" + ")}
                </div>
              </div>
              {total>0 && (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  {untouched>0
                    ? <span style={{background:accent,color:"white",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{untouched} חדשים</span>
                    : <span style={{background:"#f0f0f8",color:"#8a8a8a",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600}}>הכל טופל</span>
                  }
                </div>
              )}
              <span style={{color:"#c8c8d8",fontSize:16}}>‹</span>
            </button>
          );
        })}
        {emailRules.length===0&&<div className="empty-state">אין חוקי סיכום מוגדרים עדיין — אפשר להוסיף אחד בדף המייל הראשי.</div>}
      </div>
    </div>
  );
}
