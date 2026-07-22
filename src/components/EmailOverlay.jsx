import { useRef } from "react";
import { uid, formatDate, EMAIL_FORMAT_OPTIONS, EMAIL_FORMAT_LABELS, ruleFormats } from "../utils";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Full-screen "email summaries" feature home page: Gmail connect/auth and
// summarization rule management. Browsing the actual fetched emails (and
// marking them done/pending) happens on separate pages reached via the
// "📧 מיילים מסוכמים" button — see EmailSummariesOverview/EmailRuleDetail.
export default function EmailOverlay({
  accent,
  setShowEmail,
  gmailClientId, setGmailClientId, showClientIdInput, setShowClientIdInput, editGmailClientId,
  gmailToken, connectGmail, disconnectGmail, gmailAuthError, setGmailAuthError,
  emailRules, saveEmailRules, newRule, setNewRule, showNewRule, setShowNewRule,
  emailLoading, fetchAndSummarize, emailStatusMsg,
  gmailLabels, labelsLoading, labelsError, fetchGmailLabels, ensureRuleLabel,
  archiveErrorMsg, setArchiveErrorMsg,
  onOpenOverview,
}) {
  const containerRef = useRef(null);
  // No onEscape — the client-ID and new-rule sub-forms already use Escape to
  // cancel just themselves, so this only traps Tab focus within the overlay.
  useFocusTrap(containerRef, true);

  const saveRule = () => {
    if(!newRule.sender&&!newRule.subject)return;
    const toSave = {...newRule, formats: ruleFormats(newRule)};
    delete toSave.format;
    // Assign the id BEFORE saving (rather than inline in the array literal)
    // so `toSave` itself carries the real id — the eager label-creation call
    // below needs to reference the same id that ends up in emailRules, or its
    // resulting archiveLabelId update silently fails to attach to anything.
    if (!toSave.id) toSave.id = uid();
    if(newRule.id){ saveEmailRules(emailRules.map(r=>r.id===newRule.id?toSave:r)); }
    else{ saveEmailRules([...emailRules,toSave]); }
    // If a brand-new label name was chosen (no id resolved yet), create it in
    // Gmail right away — so the rule's "📁 תיקייה" button works immediately,
    // even before the first sync (which only resolves it if archiveAuto is on).
    if (!toSave.archiveLabelId && toSave.archiveLabelName) ensureRuleLabel(toSave);
    setNewRule({sender:"",subject:"",formats:["bullets"],dateFrom:"",dateAll:false});
    setShowNewRule(false);
  };

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="סיכומי מייל" tabIndex={-1} style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button className="back-btn" onClick={()=>setShowEmail(false)}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          חזרה
        </button>
        <span style={{fontWeight:800,fontSize:17,flex:1}}>📧 סיכומי מייל</span>
        {gmailClientId&&!showClientIdInput&&(
          <button onClick={editGmailClientId} aria-label="שנה Client ID" style={{background:"none",border:"none",fontSize:12,color:"#999",cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginLeft:4}}>שנה Client ID</button>
        )}
        {gmailToken
          ? <button onClick={()=>disconnectGmail()} style={{background:"none",border:"none",fontSize:12,color:"#e07070",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>התנתק</button>
          : <button onClick={connectGmail} style={{background:"#4285f4",color:"white",border:"none",borderRadius:10,padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>התחבר ל-Gmail</button>
        }
      </div>

      <div style={{flex:1,overflowY:"auto",padding:20}}>

        {/* Auth error banner */}
        {gmailAuthError&&!showClientIdInput&&(
          <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#b91c1c",display:"flex",alignItems:"center",gap:8}}>
            <span>⚠️</span>
            <span style={{flex:1}}>{gmailAuthError}</span>
            <button onClick={connectGmail} style={{background:"none",border:"none",color:"#b91c1c",fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,textDecoration:"underline",flexShrink:0}}>התחברי מחדש</button>
          </div>
        )}

        {/* Client ID setup */}
        {showClientIdInput&&(
          <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700}}>🔑 Google OAuth Client ID</div>
              <button onClick={()=>{setShowClientIdInput(false);setGmailAuthError("");}} aria-label="סגור" style={{background:"none",border:"none",cursor:"pointer",color:"#8a8a8a",fontSize:16,lineHeight:1}}>✕</button>
            </div>
            {gmailAuthError&&(
              <div style={{fontSize:12,color:"#b91c1c",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 10px",marginBottom:10}}>⚠️ {gmailAuthError}</div>
            )}
            <div style={{fontSize:12,color:"#666",marginBottom:10,lineHeight:1.6}}>
              זו הגדרה חד-פעמית של בעל/ת האפליקציה — לא צריך לעשות את זה שוב לכל משתמש/ת. אם מגדירים את המשתנה <code>VITE_GMAIL_CLIENT_ID</code> בהגדרות ה-build של האתר (Vercel/Netlify/וכו׳), אף אחד לא יראה את המסך הזה בכלל.<br/><br/>
              נדרש Client ID מ-Google Cloud Console:<br/>
              1. כנסי ל-console.cloud.google.com<br/>
              2. צרי פרויקט → Enable Gmail API<br/>
              3. Credentials → Create OAuth Client ID (Web Application)<br/>
              4. הוסיפי <b>{window.location.origin}</b> ל-Authorized JavaScript Origins<br/>
              5. העתיקי את ה-Client ID לכאן (או שמרי אותו כ-VITE_GMAIL_CLIENT_ID בהגדרות האתר)
            </div>
            <div style={{display:"flex",gap:8}}>
              <input autoFocus className="plain-input" style={{flex:1,fontSize:13}} placeholder="xxxxxxxx.apps.googleusercontent.com" value={gmailClientId} onChange={e=>setGmailClientId(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){localStorage.setItem("gmail_client_id",gmailClientId);setShowClientIdInput(false);connectGmail();}if(e.key==="Escape"){setShowClientIdInput(false);setGmailAuthError("");}}}/>
              <button className="add-btn" onClick={()=>{localStorage.setItem("gmail_client_id",gmailClientId);setShowClientIdInput(false);connectGmail();}}>אישור</button>
            </div>
          </div>
        )}

        {/* Browse already-fetched emails, grouped by rule */}
        {emailRules.length>0&&(
          <button onClick={onOpenOverview} style={{width:"100%",background:"white",border:`1.5px solid ${accent}`,borderRadius:14,padding:"12px 0",fontSize:14,fontWeight:700,color:accent,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:20}}>📧 מיילים מסוכמים</button>
        )}

        {/* Rules */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <span style={{fontWeight:700,fontSize:14}}>חוקי סיכום</span>
          <button onClick={()=>{setNewRule({sender:"",subject:"",formats:["bullets"],dateFrom:"",dateAll:false});setShowNewRule(true);}} style={{background:accent,color:"white",border:"none",borderRadius:10,padding:"5px 14px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>+ חוק חדש</button>
        </div>

        {showNewRule&&(
          <div style={{background:"white",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:13,fontWeight:700}}>{newRule.id?"עריכת חוק":"חוק חדש"}</span>
              <button onClick={()=>{setShowNewRule(false);setNewRule({sender:"",subject:"",format:"bullets",dateFrom:"",dateAll:false});}} style={{background:"none",border:"none",cursor:"pointer",color:"#8a8a8a",fontSize:18,lineHeight:1}} aria-label="בטל">✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="plain-input" style={{fontSize:13}} placeholder="שולח (לדוג' momence.com, אופציונלי)" value={newRule.sender} onChange={e=>setNewRule(p=>({...p,sender:e.target.value}))}/>
              <input className="plain-input" style={{fontSize:13}} placeholder="מילות מפתח (בלי שולח — יחפש רק לפי המילים)" value={newRule.subject} onChange={e=>setNewRule(p=>({...p,subject:e.target.value}))}/>
              {newRule.subject&&(
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#f9f9f8",borderRadius:10,padding:"8px 12px"}}>
                  <label style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>לחפש:</label>
                  <div style={{display:"flex",gap:6}}>
                    {[["subject","רק בכותרת"],["all","גם בתוכן המייל"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setNewRule(p=>({...p,searchScope:v}))} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${(newRule.searchScope||"subject")===v?accent:"#dde"}`,background:(newRule.searchScope||"subject")===v?`${accent}15`:"white",color:(newRule.searchScope||"subject")===v?accent:"#888",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,fontWeight:(newRule.searchScope||"subject")===v?700:400}}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* Date range */}
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#f9f9f8",borderRadius:10,padding:"8px 12px"}}>
                <label style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>תקופה:</label>
                <label style={{display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer"}}>
                  <input type="checkbox" checked={newRule.dateAll||false} onChange={e=>setNewRule(p=>({...p,dateAll:e.target.checked,dateFrom:""}))}/> כל המיילים
                </label>
                {!newRule.dateAll&&<input type="date" className="plain-input" style={{flex:1,fontSize:12,padding:"4px 8px",colorScheme:"light"}} value={newRule.dateFrom||""} onChange={e=>setNewRule(p=>({...p,dateFrom:e.target.value}))} placeholder="מתאריך"/>}
              </div>
              {!newRule.dateAll&&!newRule.dateFrom&&<div style={{fontSize:11,color:"#6b6b6b",marginTop:-4}}>בלי תאריך ובלי "כל המיילים" — מחפש רק 30 הימים האחרונים.</div>}
              <div style={{fontSize:11,color:"#8a8a8a",marginTop:-2}}>אפשר לבחור כמה סוגי סיכום — כל אחד יופיע בנפרד תחת הכותרת שלו</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {EMAIL_FORMAT_OPTIONS.map(([v,l])=>{
                  const selected = ruleFormats(newRule).includes(v);
                  return (
                    <button key={v} onClick={()=>setNewRule(p=>{
                      const cur = ruleFormats(p);
                      const next = cur.includes(v) ? cur.filter(x=>x!==v) : [...cur,v];
                      return {...p, formats: next.length?next:cur}; // keep at least one selected
                    })} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${selected?accent:"#dde"}`,background:selected?`${accent}15`:"white",color:selected?accent:"#888",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,fontWeight:selected?700:400}}>{l}</button>
                  );
                })}
              </div>
              {/* Move matching mail out of the inbox into a Gmail folder (label) */}
              <div style={{background:"#f9f9f8",borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
                <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",fontWeight:600}}>
                  <input type="checkbox" checked={!!newRule.archiveAuto} onChange={e=>setNewRule(p=>({...p,archiveAuto:e.target.checked}))}/>
                  📥 העבירי אוטומטית מיילים תואמים לתיקייה (יצאו מהאינבוקס)
                </label>
                {!gmailToken && <div style={{fontSize:11,color:"#b91c1c"}}>התחברי קודם ל-Gmail כדי לבחור תיקייה.</div>}
                {gmailToken && (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <select
                        className="plain-input" style={{flex:1,fontSize:12}}
                        value={newRule.archiveLabelId ? newRule.archiveLabelId : (newRule.archiveLabelName!=null ? "__new__" : "")}
                        onChange={e=>{
                          const v = e.target.value;
                          if (v === "__new__") setNewRule(p=>({...p,archiveLabelId:null,archiveLabelName:p.archiveLabelName||""}));
                          else if (v === "") setNewRule(p=>({...p,archiveLabelId:null,archiveLabelName:null}));
                          else { const label = gmailLabels.find(l=>l.id===v); setNewRule(p=>({...p,archiveLabelId:v,archiveLabelName:label?.name||""})); }
                        }}
                      >
                        <option value="">בלי תיקייה (בלי העברה)</option>
                        {gmailLabels.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
                        <option value="__new__">+ תיקייה חדשה</option>
                      </select>
                      <button type="button" onClick={fetchGmailLabels} disabled={labelsLoading} aria-label="רענני תיקיות" style={{background:"none",border:"1.5px solid #dde",borderRadius:8,cursor:"pointer",fontSize:13,padding:"5px 8px",color:"#888",flexShrink:0}}>{labelsLoading?"⏳":"🔄"}</button>
                    </div>
                    {(!newRule.archiveLabelId && newRule.archiveLabelName!=null) && (
                      <input className="plain-input" style={{fontSize:12}} placeholder="שם התיקייה החדשה" value={newRule.archiveLabelName||""} onChange={e=>setNewRule(p=>({...p,archiveLabelName:e.target.value}))}/>
                    )}
                    {labelsError && <div style={{fontSize:11,color:"#b91c1c"}}>{labelsError}</div>}
                  </div>
                )}
                <div style={{fontSize:11,color:"#8a8a8a"}}>אפשר לצפות במה שכבר עבר לתיקייה דרך דף "מיילים מסוכמים" ← החוק ← 📁 תיקייה.</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="add-btn" style={{flex:1}} onClick={saveRule}>{newRule.id?"עדכן חוק":"שמור חוק"}</button>
              </div>
            </div>
          </div>
        )}

        {emailRules.map(rule=>(
          <div key={rule.id} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:10,borderRight:`3px solid ${accent}`}}>
            <div style={{flex:1}}>
              {rule.sender&&<div style={{fontSize:13,fontWeight:600}}>מ: {rule.sender}</div>}
              {rule.subject&&<div style={{fontSize:12,color:"#888"}}>מילות מפתח: {rule.subject} ({rule.searchScope==="all"?"כותרת+תוכן":"כותרת בלבד"})</div>}
              <div style={{fontSize:11,color:accent,marginTop:2}}>
                {ruleFormats(rule).map(f=>EMAIL_FORMAT_LABELS[f]||f).join(" + ")}
                {" • "}
                {rule.dateAll?"כל המיילים":rule.dateFrom?`מ-${formatDate(rule.dateFrom)}`:"30 ימים אחרונים"}
              </div>
              {(rule.archiveLabelId||rule.archiveLabelName)&&(
                <div style={{fontSize:11,color:"#0077b6",marginTop:2}}>
                  📥 {rule.archiveAuto?"מועבר אוטומטית לתיקיית":"אפשרות להעביר לתיקיית"} "{rule.archiveLabelName||gmailLabels.find(l=>l.id===rule.archiveLabelId)?.name||"?"}"
                </div>
              )}
            </div>
            <button onClick={()=>{setNewRule({sender:"",subject:"",dateFrom:"",dateAll:false,...rule,formats:ruleFormats(rule)});setShowNewRule(true);}} style={{background:"none",border:"none",color:"#8a8a8a",cursor:"pointer",fontSize:15}} aria-label="ערוך חוק">✎</button>
            <button onClick={()=>saveEmailRules(emailRules.filter(r=>r.id!==rule.id))} style={{background:"none",border:"none",color:"#dde",cursor:"pointer",fontSize:16}} aria-label="מחק חוק">✕</button>
          </div>
        ))}

        {emailRules.length===0&&<div className="empty-state" style={{marginBottom:16}}>הגדירי חוק כדי להתחיל</div>}

        {/* Fetch button */}
        {gmailToken&&emailRules.length>0&&(
          <button onClick={fetchAndSummarize} disabled={emailLoading} style={{width:"100%",background:accent,color:"white",border:"none",borderRadius:14,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {emailLoading?<><div className="spinner" style={{borderTopColor:"white",borderColor:"rgba(255,255,255,0.3)"}}/>טוען מיילים...</>:"🔄 סכמי מיילים עכשיו"}
          </button>
        )}

        {/* Status message from the last sync attempt */}
        {emailStatusMsg&&!emailLoading&&(
          <div style={{background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#92400e",lineHeight:1.6,whiteSpace:"pre-line"}}>
            ℹ️ {emailStatusMsg}
          </div>
        )}

        {/* Archive/move errors (from an automatic move that failed) */}
        {archiveErrorMsg&&(
          <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#b91c1c",display:"flex",alignItems:"center",gap:8}}>
            <span>⚠️</span>
            <span style={{flex:1}}>{archiveErrorMsg}</span>
            <button onClick={()=>setArchiveErrorMsg("")} style={{background:"none",border:"none",color:"#b91c1c",cursor:"pointer",fontSize:14,flexShrink:0}} aria-label="סגור">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
