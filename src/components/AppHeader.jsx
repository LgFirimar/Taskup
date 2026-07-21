// Top-of-app header: greeting, profile switcher, settings menu, search bar
// (with live results dropdown), and the tab bar.
export default function AppHeader({
  accent, profiles, activeProfileId, allProfiles,
  profileMenuRef, showProfileMenu, setShowProfileMenu, switchProfile, setNewProfileName, setShowProfileModal, deleteCurrentProfile,
  settingsMenuRef, showSettingsMenu, setShowSettingsMenu, exportBackup, importBackup, shareWhatsApp,
  voiceAvail, setShowVoiceHelp,
  searchQuery, setSearchQuery, searchResults, goToSearchResult,
  tabs, activeTab, setActiveTab, setActiveSubtab, setDefaultTab, deleteTab,
  showNewTab, setShowNewTab, newTabInput, setNewTabInput, addTab,
}) {
  return (
    <div className="app-header">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",paddingBottom:10}}>
        <div>
          <div className="greeting">שלום, {profiles[activeProfileId]?.name||"👋"}</div>
          <div className="greeting-date">{new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
          <div ref={profileMenuRef} style={{position:"relative"}}>
            <button onClick={()=>setShowProfileMenu(p=>!p)} aria-label="תפריט פרופיל" style={{display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36,borderRadius:"50%",border:"none",background:accent,cursor:"pointer",color:"white",fontFamily:"'Heebo',sans-serif",fontSize:15,fontWeight:700}}>
              {profiles[activeProfileId]?.name?.charAt(0)||"?"}
            </button>
            {showProfileMenu&&(
              <div className="dropdown-menu">
                {allProfiles.map(p=>(<button key={p.id} className="dropdown-item" style={{fontWeight:p.id===activeProfileId?600:400}} onClick={()=>switchProfile(p.id)}><span className="profile-avatar">{p.name.charAt(0)}</span>{p.name}{p.id===activeProfileId&&<span style={{marginRight:"auto",fontSize:12}}>✓</span>}</button>))}
                <div className="dropdown-divider"/>
                <button className="dropdown-item" onClick={()=>{setShowProfileMenu(false);setNewProfileName("");setShowProfileModal(true);}}>+ פרופיל חדש</button>
                <button className="dropdown-item danger" onClick={deleteCurrentProfile}>מחק פרופיל נוכחי</button>
              </div>
            )}
          </div>
        <div ref={settingsMenuRef} style={{position:"relative"}}>
          <button onClick={()=>setShowSettingsMenu(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#8a8a8a",padding:"4px 6px",borderRadius:6,lineHeight:1}} aria-label="הגדרות">⚙</button>
          {showSettingsMenu&&(
            <div className="dropdown-menu settings-dropdown">
              <button className="dropdown-item" onClick={exportBackup}>📤 גיבוי</button>
              <button className="dropdown-item" onClick={importBackup}>📥 ייבוא גיבוי</button>
              <div className="dropdown-divider"/>
              <button className="dropdown-item" onClick={shareWhatsApp}>💬 שתף ב-WhatsApp</button>
              {voiceAvail&&<>
                <div className="dropdown-divider"/>
                <button className="dropdown-item" onClick={()=>{setShowSettingsMenu(false);setShowVoiceHelp(true);}}>🎙️ פקודות קוליות</button>
              </>}
            </div>
          )}
        </div>
        </div>
      </div>
      <div style={{position:"relative"}}>
        <input
          className="search-bar"
          placeholder="חיפוש משימות ותזכורות..."
          value={searchQuery}
          onChange={e=>setSearchQuery(e.target.value)}
          onKeyDown={e=>{if(e.key==="Escape")setSearchQuery("");}}
          style={searchQuery?{paddingLeft:36}:undefined}
        />
        {searchQuery&&(
          <button onClick={()=>setSearchQuery("")} aria-label="נקה חיפוש" style={{position:"absolute",left:14,top:9,background:"none",border:"none",color:"#8a8a8a",fontSize:15,cursor:"pointer",lineHeight:1,padding:2}}>✕</button>
        )}
        {searchQuery.trim().length>=2&&(
          <div style={{position:"absolute",top:"calc(100% - 8px)",right:0,left:0,background:"white",borderRadius:14,boxShadow:"0 6px 24px rgba(0,0,0,0.12)",zIndex:50,maxHeight:320,overflowY:"auto",padding:searchResults.length?"6px 0":"14px"}}>
            {searchResults.length===0&&<div style={{color:"#6b6b6b",fontSize:13,textAlign:"center"}}>אין תוצאות ל"{searchQuery}"</div>}
            {searchResults.map((r,i)=>(
              <button key={r.itype+r.item.id+i} onClick={()=>goToSearchResult(r)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"right",background:"none",border:"none",padding:"9px 16px",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
                <span style={{fontSize:14}}>{r.itype==="task"?"✓":"🔔"}</span>
                <span style={{flex:1,fontSize:14,color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.item.text}</span>
                <span style={{fontSize:11,color:"#6b6b6b",flexShrink:0}}>{r.tab.label}{r.subtab?` / ${r.subtab.label}`:""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tab-bar">
        {tabs.map(t=>(
          <div key={t.id} className={`tab-pill${activeTab===t.id?" active":""}`} style={{"--accent":t.color}}>
            <button onClick={()=>{setActiveTab(t.id);setActiveSubtab(null);}} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",padding:0,margin:0,font:"inherit",color:"inherit",cursor:"pointer"}}>
              <span className="tab-dot" style={{background:t.color}}/>{t.label}
            </button>
            {activeTab===t.id&&(<>
              <button aria-label="קבע ככרטיסייה ברירת מחדל" onClick={()=>setDefaultTab(t.id)} style={{fontSize:12,cursor:"pointer",color:profiles[activeProfileId]?.defaultTab===t.id?"#f4a261":"#ddd",marginRight:-2,lineHeight:1,background:"none",border:"none",padding:0}}>★</button>
              <button className="icon-btn del" aria-label="מחק כרטיסייה" style={{fontSize:11,marginRight:-2,padding:0,minWidth:"unset",minHeight:"unset",background:"none",border:"none",cursor:"pointer"}} onClick={()=>deleteTab(t.id)}>✕</button>
            </>)}
          </div>
        ))}
        {showNewTab?(
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input autoFocus className="plain-input" style={{width:150,fontSize:13,padding:"6px 10px","--accent":"#2d6a4f"}} placeholder="שם הכרטיסייה" value={newTabInput} onChange={e=>setNewTabInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addTab();if(e.key==="Escape")setShowNewTab(false);}}/>
            <button className="add-btn" style={{padding:"6px 12px",fontSize:13,"--accent":"#2d6a4f"}} onClick={addTab}>הוסף</button>
            <button className="icon-btn" aria-label="בטל כרטיסייה חדשה" onClick={()=>setShowNewTab(false)}>✕</button>
          </div>
        ):(
          <button className="ghost-btn" style={{"--accent":"#2d6a4f"}} onClick={()=>setShowNewTab(true)}>+ כרטיסייה חדשה</button>
        )}
      </div>
    </div>
  );
}
