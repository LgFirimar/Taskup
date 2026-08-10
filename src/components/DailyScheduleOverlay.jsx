import { useRef, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { minToHHMM } from "../utils";

// Full-screen "לו"ז יומי" (daily schedule) planner. Enter today's tasks;
// give a task a fixed clock time only when it truly can't move (picking up
// the kids at 15:30), leave the rest blank and the app slots them into the
// gaps around "now" and around whatever's fixed, in the order they were
// typed. See computeDailySchedule in utils.js for the actual packing logic.
export default function DailyScheduleOverlay({
  accent, setShowDailySchedule,
  items, plan, settings,
  addItem, toggleItem, deleteItem, setItemTime,
  saveSettings,
  textInput, setTextInput, timeInput, setTimeInput,
}) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true);
  const [showDone, setShowDone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const submit = () => {
    if (!textInput.trim()) return;
    addItem(textInput, timeInput);
    setTextInput(""); setTimeInput("");
  };

  const todayLabel = new Date().toLocaleDateString("he-IL", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label="לו&quot;ז יומי" tabIndex={-1} style={{position:"fixed",inset:0,background:"white",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #ebebea",display:"flex",alignItems:"center",gap:12,background:"white"}}>
        <button className="back-btn" onClick={()=>setShowDailySchedule(false)}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M5 11 Q9 11 11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M11 11 H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 5 L23 11 L16 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5" cy="11" r="3" fill="currentColor" opacity="0.45"/>
          </svg>
          <span style={{fontSize:11,fontWeight:600}}>חזרה</span>
        </button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:18}}>לו"ז יומי</div>
          <div style={{fontSize:12,color:"#6b6b6b"}}>{todayLabel}</div>
        </div>
        <button onClick={()=>setShowSettings(v=>!v)} aria-label="הגדרות שעות היום" style={{background:"none",border:"none",fontSize:13,color:"#6b6b6b",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>⚙️ שעות היום</button>
      </div>

      {showSettings&&(
        <div style={{padding:"12px 20px",borderBottom:"1px solid #ebebea",display:"flex",alignItems:"center",gap:14,background:"#fafaf9"}}>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#4a4a4a"}}>
            מ-
            <input type="time" className="plain-input" style={{fontSize:14,padding:"6px 8px",width:110}} value={settings.dayStart}
              onChange={e=>saveSettings({...settings,dayStart:e.target.value})}/>
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#4a4a4a"}}>
            עד
            <input type="time" className="plain-input" style={{fontSize:14,padding:"6px 8px",width:110}} value={settings.dayEnd}
              onChange={e=>saveSettings({...settings,dayEnd:e.target.value})}/>
          </label>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"8px 20px 140px"}}>
        {items.length===0&&(
          <div style={{color:"#6b6b6b",fontSize:14,textAlign:"center",padding:"40px 0"}}>
            אין עדיין משימות להיום — הוסיפי למטה. אפשר בלי שעה (האפליקציה תשבץ אוטומטית), או עם שעה קבועה למה שחייב זמן מדויק.
          </div>
        )}

        {plan.scheduled.map(item=>(
          <div key={item.id} className="list-item-row" style={{alignItems:"flex-start"}}>
            <button onClick={()=>toggleItem(item.id)} aria-label={`סמני "${item.text}" כבוצע`} style={{width:18,height:18,minWidth:18,marginTop:2,borderRadius:"50%",border:`1.5px solid ${accent}`,background:"none",padding:0,cursor:"pointer",flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:700,color:item.isFixed?accent:"#8a8a8a",minWidth:42}}>{minToHHMM(item.start)}</span>
                {item.isFixed&&<span title="שעה קבועה" style={{fontSize:11}}>📌</span>}
                <span style={{fontSize:15,color:"#1a1a1a",lineHeight:1.5}}>{item.text}</span>
              </div>
            </div>
            <button onClick={()=>deleteItem(item.id)} style={{background:"none",border:"none",color:"#8a8a8a",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="מחק">✕</button>
          </div>
        ))}

        {plan.overflow.length>0&&(
          <div style={{marginTop:16}}>
            <div style={{fontSize:12,color:"#9d0208",fontWeight:700,marginBottom:6}}>⚠️ לא נכנס ללו"ז היום (אין מספיק זמן עד {settings.dayEnd})</div>
            {plan.overflow.map(item=>(
              <div key={item.id} className="list-item-row">
                <button onClick={()=>toggleItem(item.id)} aria-label={`סמני "${item.text}" כבוצע`} style={{width:18,height:18,minWidth:18,borderRadius:"50%",border:"1.5px solid #9d0208",background:"none",padding:0,cursor:"pointer",flexShrink:0}}/>
                <span style={{flex:1,fontSize:15,color:"#1a1a1a",lineHeight:1.5}}>{item.text}</span>
                <button onClick={()=>deleteItem(item.id)} style={{background:"none",border:"none",color:"#8a8a8a",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="מחק">✕</button>
              </div>
            ))}
          </div>
        )}

        {plan.done.length>0&&(<>
          <button onClick={()=>setShowDone(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,color:"#6b6b6b",fontWeight:600,padding:"14px 4px 6px",display:"flex",alignItems:"center",gap:6}}>
            בוצע ({plan.done.length}) <span style={{fontSize:9}}>{showDone?"▲":"▼"}</span>
          </button>
          {showDone&&plan.done.map(item=>(
            <div key={item.id} className="list-item-row">
              <button onClick={()=>toggleItem(item.id)} aria-label={`בטלי סימון "${item.text}" כבוצע`} style={{width:18,height:18,minWidth:18,borderRadius:"50%",border:`1.5px solid ${accent}`,background:accent,padding:0,cursor:"pointer",flexShrink:0}}/>
              <span style={{flex:1,fontSize:15,color:"#bbb",lineHeight:1.5,textDecoration:"line-through"}}>{item.text}{item.fixedTime?` (${item.fixedTime})`:""}</span>
              <button onClick={()=>deleteItem(item.id)} style={{background:"none",border:"none",color:"#8a8a8a",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="מחק">✕</button>
            </div>
          ))}
        </>)}
      </div>

      {/* Fixed add bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"12px 20px",paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",borderTop:"1px solid #ebebea",background:"white",zIndex:201}}>
        <div style={{fontSize:11,color:"#6b6b6b",marginBottom:6,fontWeight:600}}>שעה — רק אם זה חייב להיות בדיוק אז</div>
        <div style={{display:"flex",gap:10}}>
          <input autoFocus className="plain-input" style={{flex:1,fontSize:15}} placeholder="מה צריך לעשות היום?" value={textInput} onChange={e=>setTextInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")submit();}}/>
          <input type="time" className="plain-input" style={{fontSize:15,width:110}} value={timeInput} onChange={e=>setTimeInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")submit();}}/>
          <button className="add-btn" style={{minWidth:52}} aria-label="הוסף משימה ללו&quot;ז" onClick={submit}>+</button>
        </div>
      </div>
    </div>
  );
}
