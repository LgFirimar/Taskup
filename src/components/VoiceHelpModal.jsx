// Voice commands cheat-sheet modal, plus the custom-voice-command
// (aliases + shortcuts) management UI.
export default function VoiceHelpModal({
  setShowVoiceHelp,
  customVoiceCommands, deleteVoiceCommand,
  showAddVoiceCmd, setShowAddVoiceCmd,
  newVoiceCmd, setNewVoiceCmd, addVoiceCommand,
}) {
  return (
    <div className="alert-modal" onClick={()=>setShowVoiceHelp(false)}>
      <div className="alert-card" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>🎙️</span>
          <span style={{fontWeight:700,fontSize:16,flex:1}}>פקודות קוליות</span>
          <button onClick={()=>setShowVoiceHelp(false)} aria-label="סגור" style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:18,lineHeight:1}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:14,fontSize:13,lineHeight:1.6}}>
          {[
            {title:"מעבר בין כרטיסיות", examples:['"לשונית ילדים"', '"עברי לעבודה"']},
            {title:"רשימות קניות", examples:['"קניות" — פותח את תפריט הרשימות', '"רשימת סופר" — פותח או יוצר רשימה בשם הזה', '"אילו רשימות" / "הצג רשימות" — מקריא את שמות הרשימות']},
            {title:"הוספה/הסרה מרשימה פתוחה", examples:['"תוסיפי חלב" — כל טקסט חופשי נחשב תוספת כשרשימה פתוחה', '"מחקי חלב" / "תורידי חלב" / "למחוק חלב"']},
            {title:"פתקים", examples:['"פתקים" — פותח את תפריט הפתקים', '"פתק קניות לחג" — פותח או יוצר פתק', '"תכתבי X" — מוסיף שורה לפתק הפתוח']},
            {title:"משימות ותזכורות", examples:['"משימה לקנות מתנה"', '"תזכורת להתקשר לרופא"']},
            {title:"סימון כבוצע", examples:['"סמני לקנות מתנה"', '"סיימתי להתקשר לרופא"']},
            {title:"הקראה", examples:['"תקריאי" / "הקרא" — מקריא את כל המשימות והתזכורות הפתוחות בכרטיסייה', '"תקריאי X" — מקריא פריט ספציפי', '"מה יש" — ברשימת קניות פתוחה, מקריא את הפריטים']},
            {title:"ניווט כללי", examples:['"סגור" / "חזרה" / "אחורה" — סוגר רשימה/פתק פתוח']},
          ].map((g,i)=>(
            <div key={i}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:"#1a1a2e"}}>{g.title}</div>
              {g.examples.map((ex,j)=>(
                <div key={j} style={{color:"#666",marginBottom:2}}>{ex}</div>
              ))}
            </div>
          ))}
          <div style={{fontSize:12,color:"#aaa",borderTop:"1px solid #f0f0f8",paddingTop:10}}>
            לוחצים על סמל המיקרופון כדי להתחיל להאזין, ואז אומרים אחת מהפקודות למעלה.
          </div>

          {/* Custom voice commands — aliases for existing actions + fixed shortcuts */}
          <div style={{borderTop:"1px solid #f0f0f8",paddingTop:12,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontWeight:700,fontSize:13,color:"#1a1a2e"}}>פקודות מותאמות אישית</div>
            {customVoiceCommands.length===0&&!showAddVoiceCmd&&(
              <div style={{fontSize:12,color:"#aaa"}}>עוד לא הוספת פקודות משלך — אפשר להוסיף כינוי לפעולה קיימת (למשל "תרשמי לי" במקום "משימה") או קיצור דרך קבוע (למשל "לעבודה" שפותח ישר כרטיסייה מסוימת).</div>
            )}
            {customVoiceCommands.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,background:"#f7f7fb",borderRadius:10,padding:"8px 10px"}}>
                <div style={{flex:1,fontSize:12}}>
                  <div style={{fontWeight:600}}>"{c.phrase}"</div>
                  <div style={{color:"#888"}}>
                    {c.kind==="alias"
                      ?`כינוי ל${({task:"הוספת משימה",reminder:"הוספת תזכורת",done:"סימון כבוצע",read:"הקראה",close:"סגירה"})[c.action]||c.action}`
                      :`קיצור ל${({tab:"כרטיסייה",shopping:"רשימת קניות",notes:"פתק"})[c.targetType]||c.targetType}: ${c.targetName}`}
                  </div>
                </div>
                <button className="icon-btn del" aria-label={`מחק פקודה ${c.phrase}`} onClick={()=>deleteVoiceCommand(c.id)}>✕</button>
              </div>
            ))}
            {showAddVoiceCmd?(
              <div style={{display:"flex",flexDirection:"column",gap:8,background:"#f7f7fb",borderRadius:10,padding:10}}>
                <input className="plain-input" placeholder='הביטוי שתגידי (למשל "תרשמי לי")' value={newVoiceCmd.phrase} onChange={e=>setNewVoiceCmd(v=>({...v,phrase:e.target.value}))}/>
                <div style={{display:"flex",gap:12,fontSize:12}}>
                  <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                    <input type="radio" checked={newVoiceCmd.kind==="alias"} onChange={()=>setNewVoiceCmd(v=>({...v,kind:"alias"}))}/> כינוי לפעולה קיימת
                  </label>
                  <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                    <input type="radio" checked={newVoiceCmd.kind==="shortcut"} onChange={()=>setNewVoiceCmd(v=>({...v,kind:"shortcut"}))}/> קיצור דרך קבוע
                  </label>
                </div>
                {newVoiceCmd.kind==="alias"?(
                  <select className="plain-input" value={newVoiceCmd.action} onChange={e=>setNewVoiceCmd(v=>({...v,action:e.target.value}))}>
                    <option value="task">הוספת משימה</option>
                    <option value="reminder">הוספת תזכורת</option>
                    <option value="done">סימון כבוצע</option>
                    <option value="read">הקראה</option>
                    <option value="close">סגירה</option>
                  </select>
                ):(
                  <>
                    <select className="plain-input" value={newVoiceCmd.targetType} onChange={e=>setNewVoiceCmd(v=>({...v,targetType:e.target.value,targetName:""}))}>
                      <option value="tab">כרטיסייה</option>
                      <option value="shopping">רשימת קניות</option>
                      <option value="notes">פתק</option>
                    </select>
                    <input className="plain-input" placeholder="שם היעד (למשל: עבודה)" value={newVoiceCmd.targetName} onChange={e=>setNewVoiceCmd(v=>({...v,targetName:e.target.value}))}/>
                  </>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button className="add-btn" style={{"--accent":"#2d6a4f"}} onClick={addVoiceCommand}>שמור</button>
                  <button className="icon-btn" onClick={()=>setShowAddVoiceCmd(false)}>ביטול</button>
                </div>
              </div>
            ):(
              <button className="ghost-btn" style={{"--accent":"#2d6a4f",alignSelf:"flex-start"}} onClick={()=>setShowAddVoiceCmd(true)}>+ הוסף פקודה</button>
            )}
          </div>
        </div>
        <button onClick={()=>setShowVoiceHelp(false)}
          style={{background:"#1a1a1a",color:"white",border:"none",borderRadius:10,padding:"11px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
          סגור
        </button>
      </div>
    </div>
  );
}
