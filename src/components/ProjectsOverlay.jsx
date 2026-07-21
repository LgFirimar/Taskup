// Full-screen "projects" feature: project list + a tabbed project detail view
// (overview dashboard, tasks, timeline, brainstorm bubbles, inspiration board).
export default function ProjectsOverlay({
  accent,
  openProjectId, setOpenProjectId, setShowProjects,
  openProject, getProjectProgress,
  projects, deleteProject,
  showNewProject, setShowNewProject, newProjectName, setNewProjectName, addProject,
  projectView, setProjectView,
  toggleProjectTask, aiBreakProjectTask, aiBreakingProj, expandedProjTask, setExpandedProjTask, deleteProjectTask,
  newProjTaskInput, setNewProjTaskInput, addProjectTask,
  newProjSubtaskInput, setNewProjSubtaskInput, addProjectSubtask, toggleProjectSubtask, deleteProjectSubtask,
  showNewTimeline, setShowNewTimeline, newTimelineItem, setNewTimelineItem, addTimelineItem, deleteTimelineItem,
  newBubbleText, setNewBubbleText, addBubble, deleteBubble, aiThinkBubbles, aiThinkingProj,
  newBoardText, setNewBoardText, addBoardItem, deleteBoardItem,
}) {
  return (
    <div style={{position:"fixed",inset:0,background:"#f5f6fa",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column",fontFamily:"'Heebo',sans-serif"}}>
      {/* Projects header */}
      <div style={{background:"white",borderBottom:"1px solid #eeeef5",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button className="back-btn" onClick={()=>{setOpenProjectId(null);setShowProjects(openProjectId?true:false);}}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><path d="M3 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 2L19 8L13 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {openProjectId?"פרויקטים":"חזרה"}
        </button>
        <span style={{fontWeight:800,fontSize:17,flex:1,color:"#1a1a2e"}}>{openProject?openProject.name:"פרויקטים"}</span>
        {openProject&&(
          <div style={{fontSize:12,color:"#6b6b6b",fontWeight:500}}>התקדמות {getProjectProgress(openProject)}%</div>
        )}
      </div>

      {/* Progress bar for open project */}
      {openProject&&(
        <div style={{height:4,background:"#eeeef5"}}>
          <div style={{height:"100%",background:accent,width:`${getProjectProgress(openProject)}%`,transition:"width 0.4s",borderRadius:"0 4px 4px 0"}}/>
        </div>
      )}

      {/* Project list */}
      {!openProjectId&&(
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          {projects.map(pj=>{
            const prog=getProjectProgress(pj);
            return (
              <div key={pj.id} style={{background:"white",borderRadius:16,padding:"16px 18px",marginBottom:10,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",cursor:"pointer",borderRight:`4px solid ${accent}`}} onClick={()=>{setOpenProjectId(pj.id);setProjectView("tasks");}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700,fontSize:15,color:"#1a1a2e"}}>{pj.name}</span>
                  <button onClick={e=>{e.stopPropagation();deleteProject(pj.id);}} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:14}} aria-label="מחק פרויקט">✕</button>
                </div>
                <div style={{marginTop:8,height:5,background:"#f0f0f8",borderRadius:10,overflow:"hidden"}}>
                  <div style={{height:"100%",background:accent,width:`${prog}%`,borderRadius:10,transition:"width 0.4s"}}/>
                </div>
                <div style={{fontSize:11,color:"#6b6b6b",marginTop:5}}>{pj.tasks.filter(t=>t.done).length}/{pj.tasks.length} משימות • {prog}%</div>
              </div>
            );
          })}
          {showNewProject?(
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <input autoFocus className="plain-input" style={{flex:1}} placeholder="שם הפרויקט" value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addProject(newProjectName);setNewProjectName("");setShowNewProject(false);}if(e.key==="Escape")setShowNewProject(false);}}/>
              <button className="add-btn" onClick={()=>{addProject(newProjectName);setNewProjectName("");setShowNewProject(false);}}>צור</button>
            </div>
          ):(
            <button className="ghost-btn" style={{width:"100%",marginTop:8}} onClick={()=>setShowNewProject(true)}>+ פרויקט חדש</button>
          )}
        </div>
      )}

      {/* Project detail */}
      {openProject&&(<>
        {/* View tabs */}
        <div style={{display:"flex",gap:0,background:"white",borderBottom:"1px solid #eeeef5",padding:"0 20px",overflowX:"auto"}}>
          {[["overview","סקירה"],["tasks","משימות"],["timeline","לו״ז"],["brainstorm","Brain Storm"],["board","השראה"]].map(([v,label])=>(
            <button key={v} onClick={()=>setProjectView(v)} style={{padding:"11px 14px",border:"none",background:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,fontWeight:projectView===v?700:400,color:projectView===v?accent:"#6b6b6b",borderBottom:projectView===v?`2px solid ${accent}`:"2px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"}}>{label}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>

          {/* OVERVIEW dashboard */}
          {projectView==="overview"&&(()=>{
            const pendingTasks=(openProject.tasks||[]).filter(t=>!t.done);
            const doneTasks=(openProject.tasks||[]).filter(t=>t.done);
            const tl=openProject.timeline||[];
            const bubbles=openProject.bubbles||[];
            const board=openProject.board||[];
            const SectionHead=({title,view,count})=>(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,marginTop:22}}>
                <span style={{fontWeight:700,fontSize:14,color:"#1a1a2e"}}>{title}{count>0&&<span style={{marginRight:6,background:"#f0f0f8",color:"#8888b8",borderRadius:100,fontSize:11,padding:"1px 7px",fontWeight:600}}>{count}</span>}</span>
                <button onClick={()=>setProjectView(view)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:accent,fontFamily:"'Heebo',sans-serif",fontWeight:600}}>ראה הכל ←</button>
              </div>
            );
            return(<>
              {/* Tasks preview */}
              <SectionHead title="משימות" view="tasks" count={pendingTasks.length}/>
              {pendingTasks.length===0&&doneTasks.length===0&&<div className="empty-state">אין משימות עדיין</div>}
              <div style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                {pendingTasks.slice(0,3).map((t,i)=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<Math.min(pendingTasks.length,3)-1?"1px solid #f5f5fc":"none",borderRight:`3px solid ${accent}`}}>
                    <button onClick={()=>toggleProjectTask(openProject.id,t.id)} aria-label="סמן משימה כבוצעה" style={{width:18,height:18,borderRadius:4,border:`2px solid #dde`,background:"white",cursor:"pointer",flexShrink:0}}/>
                    <span style={{fontSize:13,color:"#1a1a2e",flex:1}}>{t.text}</span>
                    {(t.subtasks||[]).length>0&&<span style={{fontSize:11,color:"#6b6b6b"}}>{(t.subtasks||[]).filter(s=>s.done).length}/{(t.subtasks||[]).length}</span>}
                  </div>
                ))}
                {pendingTasks.length>3&&<div style={{padding:"8px 14px",fontSize:12,color:"#6b6b6b",cursor:"pointer"}} onClick={()=>setProjectView("tasks")}>+ עוד {pendingTasks.length-3} משימות</div>}
              </div>

              {/* Timeline preview */}
              <SectionHead title="לוח זמנים" view="timeline" count={tl.length}/>
              {tl.length===0&&<div className="empty-state">אין אבני דרך עדיין</div>}
              <div style={{background:"white",borderRadius:14,padding:"12px 16px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                {tl.slice(0,3).map((item,i)=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<Math.min(tl.length,3)-1?10:0}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:accent,flexShrink:0}}/>
                    <span style={{fontSize:11,color:"#6b6b6b",fontWeight:600,minWidth:50}}>{item.date?new Date(item.date+"T00:00:00").toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</span>
                    <span style={{fontSize:13,color:"#1a1a2e"}}>{item.text}</span>
                  </div>
                ))}
                {tl.length===0&&<div style={{color:"#6b6b6b",fontSize:12,textAlign:"center"}}>—</div>}
              </div>

              {/* Brainstorm preview */}
              <SectionHead title="Brain Storm" view="brainstorm" count={bubbles.length}/>
              {bubbles.length===0&&<div className="empty-state">אין רעיונות עדיין</div>}
              {bubbles.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:6,background:"white",borderRadius:14,padding:"14px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                  {bubbles.slice(0,4).map(b=>{
                    const userColors=['#d6f0ff','#c8f0e4','#d0ecd8','#bde8f8','#cceef0']; const aiColors=['#ede0ff','#fde8f0','#f5e0ff','#ffd8e8','#ffe4d8']; const palette=b.type==="ai"?aiColors:userColors; const fill=palette[(b.id.charCodeAt(0)||0)%palette.length];
                    const col=b.type==="ai"?"#7c5cb8":"#1a7a9a";
                    return(
                      <div key={b.id} style={{position:"relative",flexShrink:0}}>
                        <svg width="100" height="62" viewBox="0 0 100 62">
                          <g fill={fill}>
                            <rect x="8" y="32" width="84" height="26" rx="13"/>
                            <circle cx="26" cy="32" r="16"/>
                            <circle cx="46" cy="24" r="20"/>
                            <circle cx="68" cy="27" r="17"/>
                            <circle cx="84" cy="34" r="13"/>
                          </g>
                        </svg>
                        <div style={{position:"absolute",top:"52%",left:"50%",transform:"translate(-50%,-50%)",fontSize:10,fontWeight:700,color:col,textAlign:"center",width:82,lineHeight:1.25,pointerEvents:"none"}}>{b.text}</div>
                      </div>
                    );
                  })}
                  {bubbles.length>4&&<div style={{fontSize:12,color:"#6b6b6b",alignSelf:"center",paddingRight:4}}>+{bubbles.length-4}</div>}
                </div>
              )}

              {/* Board preview */}
              <SectionHead title="לוח השראה" view="board" count={board.length}/>
              {board.length===0&&<div className="empty-state">אין פריטים עדיין</div>}
              {board.length>0&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {board.slice(0,2).map(item=>(
                    <div key={item.id} style={{background:"white",borderRadius:12,padding:"12px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",minHeight:70,fontSize:12,color:"#555",lineHeight:1.5}}>{item.text}</div>
                  ))}
                  {board.length>2&&<div style={{background:"#f8f8fc",borderRadius:12,padding:"12px",fontSize:12,color:"#6b6b6b",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onClick={()=>setProjectView("board")}>+{board.length-2} עוד</div>}
                </div>
              )}
            </>);
          })()}

          {/* TASKS view */}
          {projectView==="tasks"&&(<>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input className="plain-input" style={{flex:1}} placeholder="משימה חדשה..." value={newProjTaskInput} onChange={e=>setNewProjTaskInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(addProjectTask(openProject.id,newProjTaskInput),setNewProjTaskInput(""))}/>
              <button className="add-btn" onClick={()=>{addProjectTask(openProject.id,newProjTaskInput);setNewProjTaskInput("");}}>+</button>
            </div>
            {openProject.tasks.map(task=>{
              const doneCount=(task.subtasks||[]).filter(s=>s.done).length;
              const totalSubs=(task.subtasks||[]).length;
              const subProg=totalSubs>0?Math.round(doneCount/totalSubs*100):0;
              return (
                <div key={task.id} style={{background:"white",borderRadius:14,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",borderRight:`3px solid ${task.done?"#4caf50":accent}`}}>
                  <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                    <button onClick={()=>toggleProjectTask(openProject.id,task.id)} aria-label={task.done?"בטל סימון משימה":"סמן משימה כבוצעה"} style={{width:20,height:20,borderRadius:4,border:`2px solid ${task.done?"#4caf50":"#dde"}`,background:task.done?"#4caf50":"white",color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>
                      {task.done?"✓":""}
                    </button>
                    <span style={{flex:1,fontSize:14,color:task.done?"#bbb":"#1a1a2e",textDecoration:task.done?"line-through":"none",fontWeight:500}}>{task.text}</span>
                    <button onClick={()=>aiBreakProjectTask(openProject.id,task.id,task.text)} style={{background:"none",border:"none",cursor:"pointer",color:aiBreakingProj===task.id?"#ffa726":"#dde",fontSize:13,fontFamily:"'Heebo',sans-serif",fontWeight:600}}>
                      {aiBreakingProj===task.id?<div className="spinner"/>:"מה עושים?"}
                    </button>
                    <button onClick={()=>setExpandedProjTask(expandedProjTask===task.id?null:task.id)} aria-label={expandedProjTask===task.id?"כווץ":"הרחב"} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:12}}>
                      {expandedProjTask===task.id?"▲":"▼"}
                    </button>
                    <button onClick={()=>deleteProjectTask(openProject.id,task.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:14}} aria-label="מחק משימת פרויקט">✕</button>
                  </div>
                  {totalSubs>0&&(
                    <div style={{height:3,background:"#f0f0f8",margin:"0 14px 8px"}}>
                      <div style={{height:"100%",background:"#4caf50",width:`${subProg}%`,borderRadius:3}}/>
                    </div>
                  )}
                  {(expandedProjTask===task.id||(task.subtasks||[]).length>0)&&(
                    <div style={{padding:"0 14px 12px 14px"}}>
                      {(task.subtasks||[]).map(st=>(
                        <div key={st.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderRight:`2px solid ${st.done?"#4caf50":"#e8e8f2"}`,paddingRight:10,marginRight:-10}}>
                          <button onClick={()=>toggleProjectSubtask(openProject.id,task.id,st.id)} aria-label={st.done?"בטל סימון תת-משימה":"סמן תת-משימה כבוצעה"} style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${st.done?"#4caf50":"#dde"}`,background:st.done?"#4caf50":"white",color:"white",cursor:"pointer",fontSize:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {st.done?"✓":""}
                          </button>
                          <span style={{flex:1,fontSize:13,color:st.done?"#bbb":"#555",textDecoration:st.done?"line-through":"none"}}>{st.text}</span>
                          <button onClick={()=>deleteProjectSubtask(openProject.id,task.id,st.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:12}} aria-label="מחק תת-משימה">✕</button>
                        </div>
                      ))}
                      {expandedProjTask===task.id&&(
                        <div style={{display:"flex",gap:6,marginTop:6}}>
                          <input autoFocus className="edit-inline" style={{fontSize:13}} placeholder="תת-משימה..." value={newProjSubtaskInput[task.id]||""} onChange={e=>setNewProjSubtaskInput(p=>({...p,[task.id]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"){addProjectSubtask(openProject.id,task.id,newProjSubtaskInput[task.id]||"");setNewProjSubtaskInput(p=>({...p,[task.id]:""}));}if(e.key==="Escape")setExpandedProjTask(null);}}/>
                          <button className="add-btn" style={{padding:"4px 10px",fontSize:13}} aria-label="הוסף תת-משימה" onClick={()=>{addProjectSubtask(openProject.id,task.id,newProjSubtaskInput[task.id]||"");setNewProjSubtaskInput(p=>({...p,[task.id]:""}));}}>+</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {openProject.tasks.length===0&&<div className="empty-state">אין משימות עדיין</div>}
          </>)}

          {/* TIMELINE view */}
          {projectView==="timeline"&&(<>
            <div style={{marginBottom:16}}>
              {(openProject.timeline||[]).map((item,i)=>(
                <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:16,paddingRight:8,position:"relative"}}>
                  <div style={{position:"absolute",right:0,top:6,bottom:-16,width:2,background:i<(openProject.timeline||[]).length-1?"#eeeef5":"transparent"}}/>
                  <div style={{width:12,height:12,borderRadius:"50%",background:accent,flexShrink:0,marginTop:3,position:"relative",zIndex:1}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:"#6b6b6b",fontWeight:600,marginBottom:2}}>{item.date?new Date(item.date+"T00:00:00").toLocaleDateString("he-IL",{day:"numeric",month:"short"}):""}</div>
                    <div style={{fontSize:14,color:"#1a1a2e",fontWeight:500}}>{item.text}</div>
                  </div>
                  <button onClick={()=>deleteTimelineItem(openProject.id,item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dde",fontSize:13}} aria-label="מחק אבן דרך">✕</button>
                </div>
              ))}
            </div>
            {showNewTimeline?(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <input type="date" className="plain-input" style={{flex:"0 0 auto",fontSize:13,colorScheme:"light"}} value={newTimelineItem.date} onChange={e=>setNewTimelineItem(p=>({...p,date:e.target.value}))}/>
                <input autoFocus className="plain-input" style={{flex:1}} placeholder="אבן דרך..." value={newTimelineItem.text} onChange={e=>setNewTimelineItem(p=>({...p,text:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"){addTimelineItem(openProject.id,newTimelineItem.text,newTimelineItem.date);setNewTimelineItem({text:"",date:""});setShowNewTimeline(false);}if(e.key==="Escape")setShowNewTimeline(false);}}/>
                <button className="add-btn" onClick={()=>{addTimelineItem(openProject.id,newTimelineItem.text,newTimelineItem.date);setNewTimelineItem({text:"",date:""});setShowNewTimeline(false);}}>הוסף</button>
              </div>
            ):(
              <button className="ghost-btn" style={{width:"100%"}} onClick={()=>setShowNewTimeline(true)}>+ הוסף אבן דרך</button>
            )}
          </>)}

          {/* BRAINSTORM view */}
          {projectView==="brainstorm"&&(<>
            <div style={{position:"relative",minHeight:320,background:"white",borderRadius:16,padding:"20px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",marginBottom:14,overflow:"auto"}}>
              {/* Central topic */}
              <div style={{textAlign:"center",marginBottom:20}}>
                <span style={{display:"inline-block",background:`${accent}18`,color:accent,borderRadius:100,padding:"6px 18px",fontWeight:700,fontSize:15}}>{openProject.name}</span>
              </div>
              {/* Bubbles */}
              <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
                {(openProject.bubbles||[]).map(b=>{
                  const userColors=['#d6f0ff','#c8f0e4','#d0ecd8','#bde8f8','#cceef0']; const aiColors=['#ede0ff','#fde8f0','#f5e0ff','#ffd8e8','#ffe4d8']; const palette=b.type==="ai"?aiColors:userColors; const fill=palette[(b.id.charCodeAt(0)||0)%palette.length];
                  const col=b.type==="ai"?"#7c5cb8":"#1a7a9a";
                  return(
                  <div key={b.id} style={{position:"relative",cursor:"pointer",flexShrink:0}} title="לחצי למחיקה" onClick={()=>deleteBubble(openProject.id,b.id)}>
                    <svg width="130" height="80" viewBox="0 0 130 80">
                      <g fill={fill}>
                        <rect x="10" y="40" width="110" height="32" rx="16"/>
                        <circle cx="32" cy="40" r="22"/>
                        <circle cx="56" cy="30" r="26"/>
                        <circle cx="83" cy="33" r="22"/>
                        <circle cx="104" cy="42" r="18"/>
                      </g>
                    </svg>
                    <div style={{position:"absolute",top:"55%",left:"50%",transform:"translate(-50%,-50%)",fontSize:11,fontWeight:700,color:col,textAlign:"center",width:108,lineHeight:1.3,pointerEvents:"none"}}>{b.text}</div>
                  </div>
                  );
                })}
              </div>
              {(openProject.bubbles||[]).length===0&&<div style={{color:"#6b6b6b",textAlign:"center",fontSize:13,marginTop:40}}>הוסיפי רעיונות למטה</div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input className="plain-input" style={{flex:1}} placeholder="רעיון חדש..." value={newBubbleText} onChange={e=>setNewBubbleText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addBubble(openProject.id,newBubbleText,"user");setNewBubbleText("");}}}/>
              <button className="add-btn" aria-label="הוסף רעיון" onClick={()=>{addBubble(openProject.id,newBubbleText,"user");setNewBubbleText("");}}>+</button>
              <button onClick={()=>aiThinkBubbles(openProject.id,openProject.name)} style={{border:`1.5px solid ${accent}`,borderRadius:12,background:"white",color:accent,padding:"0 14px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:13,whiteSpace:"nowrap"}}>
                {aiThinkingProj?<div className="spinner" style={{borderTopColor:accent,borderColor:`${accent}33`}}/>:"מה אתה חושב? 🤖"}
              </button>
            </div>
          </>)}

          {/* BOARD view */}
          {projectView==="board"&&(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {(openProject.board||[]).map(item=>(
                <div key={item.id} style={{background:"white",borderRadius:14,padding:"14px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",minHeight:100,position:"relative",fontSize:13,color:"#555",lineHeight:1.5}}>
                  {item.text}
                  <button onClick={()=>deleteBoardItem(openProject.id,item.id)} style={{position:"absolute",top:8,left:8,background:"none",border:"none",color:"#dde",cursor:"pointer",fontSize:12}} aria-label="מחק פריט השראה">✕</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input className="plain-input" style={{flex:1}} placeholder="הוסיפי השראה..." value={newBoardText} onChange={e=>setNewBoardText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addBoardItem(openProject.id,newBoardText);setNewBoardText("");}}}/>
              <button className="add-btn" aria-label="הוסף פריט השראה" onClick={()=>{addBoardItem(openProject.id,newBoardText);setNewBoardText("");}}>+</button>
            </div>
          </>)}

        </div>
      </>)}
    </div>
  );
}
