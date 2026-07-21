import { PRIO_COLOR, formatDate, getReminderStatus, getDaysUntil } from "../utils";

// Everything below the tab bar for the currently active tab: the empty
// state, the two summary cards, the subtabs row, and the tasks/reminders
// two-column board (including inline task-row and reminder-card rendering).
export default function TabContent({
  accent,
  currentTab, activeSubtab, setActiveSubtab,
  showNewSub, setShowNewSub, newSubInput, setNewSubInput, addSubtab, deleteSubtab,
  allPendingTasks, sortedReminderGroups,
  isAggregate, taskGroups,
  taskInput, setTaskInput, addTask,
  allDoneTasks, showDoneTasks, setShowDoneTasks, toggleDone, deleteItem,
  reminderInput, setReminderInput, addReminder,
  showReminderDates, setShowReminderDates,
  reminderStart, setReminderStart, reminderEnd, setReminderEnd, reminderAlertDate, setReminderAlertDate,
  allDoneReminders, showDoneReminders, setShowDoneReminders,
  completingId, handleComplete,
  editId, setEditId, editText, setEditText, editAlertDate, setEditAlertDate, editStartDate, setEditStartDate, editEndDate, setEditEndDate, saveEdit,
  cyclePriority, handleBigComplete,
  breakingDownId, breakdownTaskDirect, breakdownTask, pendingBreakdown, setPendingBreakdown, confirmBreakdown,
  expandedTaskId, setExpandedTaskId, subtaskInput, setSubtaskInput, addSubtask, toggleSubtask, deleteSubtask,
}) {
  const renderTaskRow = (item) => {
    const prioColor = item.priority?PRIO_COLOR[item.priority]:null;
    const prioClass = item.priority?` prio-${item.priority}`:"";
    const hasPending = pendingBreakdown?.taskId===item.id;
    return (
      <div key={item.id} className={`task-row${prioClass}`} style={{flexDirection:"column",gap:0}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,width:"100%"}}>
          {/* Priority dot */}
          <button className="prio-dot" style={{background:prioColor||"white",borderColor:prioColor||"#d8d7cf","--accent":accent}} title="הגדרי עדיפות" aria-label="הגדרי עדיפות"
            onClick={()=>cyclePriority(item.id)}/>

          <div style={{flex:1,minWidth:0}}>
            {editId===item.id
              ?<input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("task",item.id);if(e.key==="Escape")setEditId(null);}}/>
              :<span style={{fontSize:14,lineHeight:1.55,color:"#222"}}>{item.text}</span>}
          </div>

          <div style={{display:"flex",alignItems:"center",flexShrink:0,gap:2}}>
            {/* Done — checkmark SVG */}
            <button className="icon-btn done-btn" style={{"--accent":accent}} title="סיימתי!" aria-label="סיימתי!" onClick={()=>handleBigComplete(item.id)}>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1.5 5.5L5.5 9.5L12.5 1.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {/* Scissors — direct breakdown */}
            <button className="icon-btn" style={{color:breakingDownId===item.id?"#ffa726":"#d4a96e",fontSize:14}} title="קטן עלי — מוסיף ישירות" aria-label="קטן עלי — מוסיף ישירות"
              onClick={()=>breakdownTaskDirect(item.id,item.text)}>
              {breakingDownId===item.id?<div className="spinner" style={{borderTopColor:"#ffa726",borderColor:"#ffa72633"}}/>:"✂"}
            </button>
            {/* ✦✦ Claude suggestions — shows editable steps */}
            <button
              title="שאלי את קלוד"
              aria-label="שאלי את קלוד"
              onClick={()=>breakdownTask(item.id,item.text)}
              style={{background:"none",border:"none",cursor:"pointer",padding:"3px 5px",borderRadius:8,fontSize:13,fontWeight:700,color:hasPending?"#b45309":"#c8b090",letterSpacing:-1,minWidth:28,minHeight:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {breakingDownId===item.id&&hasPending?<div className="spinner" style={{borderTopColor:"#b45309",borderColor:"#b4530933",width:12,height:12}}/>:"✦✦"}
            </button>
            <button className="icon-btn" style={{fontSize:17}} aria-label="ערוך משימה" onClick={()=>{setEditId(item.id);setEditText(item.text);}}>✎</button>
            <button className="icon-btn del" aria-label="מחק משימה" onClick={()=>deleteItem("task",item.id)}>✕</button>
          </div>
        </div>

        {/* Existing subtasks */}
        {(item.subtasks||[]).length>0&&(
          <div style={{marginTop:8,paddingRight:28}}>
            {(item.subtasks||[]).map(st=>(
              <div key={st.id} className="subtask-row" style={{"--accent":accent}}>
                <button className={`subtask-check${st.done?" checked":""}`} aria-label={st.done?"בטל סימון תת-משימה":"סמן תת-משימה כבוצעה"} onClick={()=>toggleSubtask(item.id,st.id)}>
                  {st.done&&<svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
                <span style={{fontSize:13,flex:1,color:st.done?"#bbb":"#555",textDecoration:st.done?"line-through":"none"}}>{st.text}</span>
                <button className="icon-btn del" style={{fontSize:11,minWidth:"unset",minHeight:"unset",padding:"2px 3px"}} aria-label="מחק תת-משימה" onClick={()=>deleteSubtask(item.id,st.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* AI pending suggestions */}
        {hasPending&&(
          <div style={{marginTop:10,paddingRight:12,background:"#fffdf5",borderRadius:10,padding:"10px 12px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#b45309",marginBottom:8}}>✦ הצעות קלוד — ערכי או מחקי לפני אישור</div>
            {pendingBreakdown.steps.map((s,idx)=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{fontSize:11,color:"#bbb",minWidth:16}}>{idx+1}.</span>
                <input className="edit-inline" style={{flex:1,fontSize:13}} value={s.text}
                  onChange={e=>setPendingBreakdown(p=>({...p,steps:p.steps.map(x=>x.id===s.id?{...x,text:e.target.value}:x)}))}/>
                <button onClick={()=>setPendingBreakdown(p=>({...p,steps:p.steps.filter(x=>x.id!==s.id)}))} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14,flexShrink:0}} aria-label="מחק הצעה">✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button className="add-btn" style={{flex:1,padding:"7px 0",fontSize:13}} onClick={confirmBreakdown}>הוסף הכל</button>
              <button onClick={()=>setPendingBreakdown(null)} style={{background:"none",border:"1px solid #e5e5e3",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,color:"#888"}}>ביטול</button>
            </div>
          </div>
        )}

        {/* Manual add subtask + AI suggest button */}
        {expandedTaskId===item.id&&!hasPending&&(
          <div style={{marginTop:8,paddingRight:28,display:"flex",gap:6,alignItems:"center"}}>
            <input autoFocus className="edit-inline" style={{fontSize:13}} placeholder="הוסיפי צעד קטן..." value={subtaskInput} onChange={e=>setSubtaskInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){addSubtask(item.id,subtaskInput);setSubtaskInput("");}if(e.key==="Escape"){setExpandedTaskId(null);setSubtaskInput("");}}}/>
            <button className="add-btn" style={{padding:"4px 10px",fontSize:13}} aria-label="הוסף תת-משימה" onClick={()=>{addSubtask(item.id,subtaskInput);setSubtaskInput("");}}>+</button>
          </div>
        )}

        {/* Complete animation */}
        {completingId===item.id&&(
          <>
            <div className="ring" style={{"--accent":accent}}/>
            <div className="ring-outer" style={{"--accent":accent}}/>
          </>
        )}
      </div>
    );
  };

  if (!currentTab) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"70vh",color:"#6b6b6b",gap:16}}>
        <div style={{fontSize:48}}>📋</div>
        <div style={{fontSize:18,fontWeight:500,color:"#999"}}>אין כרטיסיות עדיין</div>
        <div style={{fontSize:14}}>לחצי על "+ כרטיסייה חדשה" כדי להתחיל</div>
      </div>
    );
  }

  return (<>
    {/* Category summary cards */}
    <div className="cat-grid">
      <div className="cat-card" style={{background:"#eaf5f0"}} onClick={()=>setActiveSubtab(null)}>
        <div className="cat-card-title" style={{color:"#2d7a5a"}}>משימות</div>
        <div className="cat-card-sub">{allPendingTasks.length} פתוחות</div>
      </div>
      <div className="cat-card" style={{background:"#ede8f8"}} onClick={()=>setActiveSubtab(null)}>
        <div className="cat-card-title" style={{color:"#6b5ca8"}}>תזכורות</div>
        <div className="cat-card-sub">{sortedReminderGroups.flatMap(g=>g.reminders).length} פעילות</div>
      </div>
    </div>

    <div style={{padding:"0 20px 100px"}}>
      {/* Subtabs */}
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:20}}>
        <button className={`sub-chip${!activeSubtab?" active":""}`} style={{"--accent":accent}} onClick={()=>setActiveSubtab(null)}>כללי</button>
        {currentTab.subtabs.map(s=>(
          <div key={s.id} style={{position:"relative"}}>
            <button className={`sub-chip${activeSubtab===s.id?" active":""}`} style={{"--accent":accent}} onClick={()=>setActiveSubtab(s.id)}>{s.label}</button>
            {activeSubtab===s.id&&<button className="icon-btn del" aria-label="מחק תת-כרטיסייה" style={{position:"absolute",top:-5,left:-5,fontSize:10,background:"#f5f5f4",borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",padding:0,minWidth:"unset",minHeight:"unset"}} onClick={()=>deleteSubtab(s.id)}>✕</button>}
          </div>
        ))}
        {showNewSub?(
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input autoFocus className="plain-input" style={{width:140,fontSize:13,padding:"5px 10px"}} placeholder="שם תת-כרטיסייה" value={newSubInput} onChange={e=>setNewSubInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addSubtab();if(e.key==="Escape")setShowNewSub(false);}}/>
            <button className="add-btn" style={{padding:"5px 10px",fontSize:13}} onClick={addSubtab}>הוסף</button>
            <button className="icon-btn" aria-label="בטל תת-כרטיסייה חדשה" onClick={()=>setShowNewSub(false)}>✕</button>
          </div>
        ):(
          <button className="ghost-btn" style={{padding:"4px 12px",fontSize:12}} onClick={()=>setShowNewSub(true)}>+ תת-כרטיסייה</button>
        )}
      </div>

      <div className="main-grid">
        {/* TASKS */}
        <div>
          <div className="section-header">
            <span className="col-header">משימות</span>
            {allPendingTasks.length>0&&<span className="section-count">{allPendingTasks.length}</span>}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input className="plain-input" style={{flex:1}} placeholder="משימה חדשה..." value={taskInput} onChange={e=>setTaskInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}/>
            <button className="add-btn" aria-label="הוסף משימה" onClick={addTask}>+</button>
          </div>

          {allPendingTasks.length===0&&<div className="empty-state">אין משימות פתוחות</div>}

          {/* Aggregate: group by source */}
          {isAggregate ? (
            taskGroups.map((group,gi)=>{
              const pending=group.tasks.filter(t=>!t.done);
              if(!pending.length&&group.label) return null;
              return (
                <div key={gi}>
                  {group.label&&<div className="group-label">{group.label}</div>}
                  {pending.length>0&&<div className="task-group-wrap">{pending.map(item=>renderTaskRow(item))}</div>}
                </div>
              );
            })
          ) : (
            taskGroups[0].tasks.filter(t=>!t.done).length>0
              ? <div className="task-group-wrap">{taskGroups[0].tasks.filter(t=>!t.done).map(item=>renderTaskRow(item))}</div>
              : null
          )}

          {allDoneTasks.length>0&&<>
            <button className="section-label" onClick={()=>setShowDoneTasks(p=>!p)} style={{background:"none",border:"none",padding:0,width:"100%",display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
              הושלמו ({allDoneTasks.length}) <span style={{fontSize:9}}>{showDoneTasks?"▲":"▼"}</span>
            </button>
            {showDoneTasks&&allDoneTasks.map(item=>(
              <div key={item.id} className="task-row" style={{opacity:0.45}}>
                <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid #ddd",background:"white",flexShrink:0,marginTop:1}}/>
                <div style={{flex:1}}><span style={{fontSize:14,textDecoration:"line-through",color:"#888"}}>{item.text}</span></div>
                <button className="icon-btn" style={{color:"#8a8a8a",fontSize:13,fontWeight:700}} aria-label="שחזר משימה" onClick={()=>toggleDone("task",item.id)}>↩</button>
                <button className="icon-btn del" aria-label="מחק משימה" onClick={()=>deleteItem("task",item.id)}>✕</button>
              </div>
            ))}
          </>}
        </div>

        {/* REMINDERS */}
        <div style={{paddingLeft:52}}>
          <div className="section-header">
            <span className="col-header">תזכורות</span>
            {sortedReminderGroups.flatMap(g=>g.reminders).filter(r=>getReminderStatus(r.startDate,r.endDate)==="active").length>0&&(
              <span className="section-count">
                {sortedReminderGroups.flatMap(g=>g.reminders).filter(r=>getReminderStatus(r.startDate,r.endDate)==="active").length} פעיל
              </span>
            )}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:showReminderDates?8:0}}>
              <input className="plain-input" style={{flex:1}} placeholder="תזכורת חדשה..." value={reminderInput} onChange={e=>setReminderInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addReminder()}/>
              <button onClick={()=>setShowReminderDates(p=>!p)} aria-label="הצג תאריכי תזכורת" style={{border:`1.5px solid ${showReminderDates?accent:"#e5e5e3"}`,borderRadius:8,background:"white",padding:"0 10px",cursor:"pointer",fontSize:15,color:showReminderDates?accent:"#aaa",transition:"all 0.15s"}}>📅</button>
              <button className="add-btn" aria-label="הוסף תזכורת" onClick={addReminder}>+</button>
            </div>
            {showReminderDates&&(
              <>
              <div style={{display:"flex",gap:8,alignItems:"center",background:"#f9f9f8",border:"1px solid #ebebea",borderRadius:8,padding:"10px 12px"}}>
                <div style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
                  <label style={{fontSize:11,color:"#6b6b6b",fontWeight:600}}>מתאריך</label>
                  <input type="date" className="plain-input" style={{fontSize:13,padding:"6px 10px",colorScheme:"light"}} value={reminderStart} onChange={e=>setReminderStart(e.target.value)}/>
                </div>
                <div style={{color:"#ccc",marginTop:16}}>—</div>
                <div style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
                  <label style={{fontSize:11,color:"#6b6b6b",fontWeight:600}}>עד תאריך</label>
                  <input type="date" className="plain-input" style={{fontSize:13,padding:"6px 10px",colorScheme:"light"}} value={reminderEnd} min={reminderStart} onChange={e=>setReminderEnd(e.target.value)}/>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"8px 12px"}}>
                <span style={{fontSize:13,color:"#92400e",fontWeight:600,whiteSpace:"nowrap"}}>🔔 התרע מ-</span>
                <input type="date" className="plain-input" style={{flex:1,fontSize:13,padding:"6px 10px",colorScheme:"light"}} value={reminderAlertDate} onChange={e=>setReminderAlertDate(e.target.value)}/>
              </div>
              </>
            )}
          </div>

          {sortedReminderGroups.flatMap(g=>g.reminders).length===0&&<div className="empty-state">אין תזכורות פתוחות</div>}

          {sortedReminderGroups.map((group,gi)=>{
            if(!group.reminders.length&&group.label) return null;
            return (
              <div key={gi}>
                {group.label&&isAggregate&&<div className="group-label">{group.label}</div>}
                {group.reminders.map(item=>{
                  const status=getReminderStatus(item.startDate,item.endDate);
                  const daysUntilStart=getDaysUntil(item.startDate);
                  const daysUntilEnd=getDaysUntil(item.endDate);
                  const statusColor=status==="active"?accent:status==="future"?"#5c6bc0":"#8a8a8a";
                  const statusLabel=status==="active"?"פעיל עכשיו":status==="future"?"עתידי":status==="past"?"עבר":"";
                  const cardClass=`reminder-card${status==="active"?" active-r":status==="future"?" future-r":status==="past"?" past-r":""}`;
                  return (
                    <div key={item.id} className={cardClass} style={{"--accent":accent}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        <div style={{position:"relative",flexShrink:0,paddingTop:1}}>
                          <button className={`check-circle${completingId===item.id?" popping":""}`} aria-label="סיימתי!" style={{width:20,height:20,borderRadius:"50%",border:"2px solid #ddd",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,transition:"all 0.15s","--accent":accent}} onClick={()=>handleComplete("reminder",item.id)}/>
                          {completingId===item.id&&<div className="ring" style={{"--accent":accent}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          {editId===item.id
                            ?<div style={{display:"flex",flexDirection:"column",gap:6}}>
                                <input autoFocus className="edit-inline" value={editText} onChange={e=>setEditText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit("reminder",item.id);if(e.key==="Escape"){setEditId(null);setEditAlertDate("");setEditStartDate("");setEditEndDate("");}}}/>
                                <div style={{display:"flex",alignItems:"center",gap:6,background:"#f9f9f8",border:"1px solid #ebebea",borderRadius:8,padding:"6px 10px"}}>
                                  <span style={{fontSize:11,color:"#888",fontWeight:600,whiteSpace:"nowrap"}}>מ-</span>
                                  <input type="date" className="edit-inline" style={{fontSize:12,padding:"3px 8px",flex:1,colorScheme:"light"}} value={editStartDate} onChange={e=>setEditStartDate(e.target.value)}/>
                                  <span style={{fontSize:11,color:"#888",fontWeight:600,whiteSpace:"nowrap"}}>עד-</span>
                                  <input type="date" className="edit-inline" style={{fontSize:12,padding:"3px 8px",flex:1,colorScheme:"light"}} value={editEndDate} min={editStartDate} onChange={e=>setEditEndDate(e.target.value)}/>
                                </div>
                                <div style={{display:"flex",alignItems:"center",gap:6,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 10px"}}>
                                  <span style={{fontSize:12,color:"#92400e",fontWeight:600,whiteSpace:"nowrap"}}>🔔 התרע מ-</span>
                                  <input type="date" className="edit-inline" style={{fontSize:12,padding:"3px 8px",flex:1,colorScheme:"light"}} value={editAlertDate} onChange={e=>setEditAlertDate(e.target.value)}/>
                                  <button onClick={()=>saveEdit("reminder",item.id)} style={{background:accent,color:"white",border:"none",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:600,flexShrink:0}}>שמור</button>
                                </div>
                              </div>
                            :<span style={{fontSize:14,fontWeight:500,lineHeight:1.4}}>{item.text}</span>}
                          {(item.startDate||item.endDate)&&(
                            <div className="date-range-bar" style={{marginTop:8}}>
                              {status!=="none"&&<><span className="status-dot" style={{background:statusColor}}/><span style={{fontSize:11,color:statusColor,fontWeight:600,marginLeft:2}}>{statusLabel}</span><span style={{color:"#ddd"}}>·</span></>}
                              {item.startDate&&<span className="date-chip" style={{background:status==="active"?`${accent}18`:"#f0f0ef",color:status==="active"?accent:"#666"}}>{formatDate(item.startDate)}</span>}
                              {item.startDate&&item.endDate&&<span style={{color:"#ccc",fontSize:11}}>←</span>}
                              {item.endDate&&<span className="date-chip" style={{background:status==="active"?`${accent}18`:"#f0f0ef",color:status==="active"?accent:"#666"}}>{formatDate(item.endDate)}</span>}
                              {status==="future"&&daysUntilStart!==null&&<span className="days-badge" style={{background:"#e8eaf6",color:"#5c6bc0",marginRight:4}}>בעוד {daysUntilStart} יום</span>}
                              {status==="active"&&daysUntilEnd!==null&&<span className="days-badge" style={{background:`${accent}18`,color:accent,marginRight:4}}>{daysUntilEnd===0?"מסתיים היום":`${daysUntilEnd} יום נותרו`}</span>}
                              {status==="active"&&!item.endDate&&<span className="days-badge" style={{background:`${accent}18`,color:accent,marginRight:4}}>פעיל</span>}
                            </div>
                          )}
                        </div>
                        <button className="icon-btn" style={{fontSize:18}} aria-label="ערוך תזכורת" onClick={()=>{setEditId(item.id);setEditText(item.text);setEditAlertDate(item.alertDate||"");setEditStartDate(item.startDate||"");setEditEndDate(item.endDate||"");}}>✎</button>
                        <button className="icon-btn del" aria-label="מחק תזכורת" onClick={()=>deleteItem("reminder",item.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {allDoneReminders.length>0&&<>
            <button className="section-label" onClick={()=>setShowDoneReminders(p=>!p)} style={{background:"none",border:"none",padding:0,width:"100%",display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
              הושלמו ({allDoneReminders.length}) <span style={{fontSize:9}}>{showDoneReminders?"▲":"▼"}</span>
            </button>
            {showDoneReminders&&allDoneReminders.map(item=>(
              <div key={item.id} className="reminder-card" style={{opacity:0.4}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button style={{width:20,height:20,borderRadius:"50%",border:"2px solid #aaa",background:"#aaa",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}} aria-label="בטל סימון תזכורת" onClick={()=>toggleDone("reminder",item.id)}>✓</button>
                  <span style={{flex:1,fontSize:14,textDecoration:"line-through",color:"#888"}}>{item.text}</span>
                  <button className="icon-btn del" aria-label="מחק תזכורת" onClick={()=>deleteItem("reminder",item.id)}>✕</button>
                </div>
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  </>);
}
