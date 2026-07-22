import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Full-screen profile picker / creation modal, shown when no profile is active
// yet or the user opens "פרופיל חדש" from the profile menu.
export default function ProfileModal({
  allProfiles, newProfileName, setNewProfileName, createProfile,
  setActiveProfileId, setActiveTab, setActiveSubtab, setShowProfileModal,
}) {
  const dialogRef = useRef(null);
  // Only wire Escape-to-close when there's already a way to dismiss (i.e. not
  // on first-launch, when a profile is mandatory to proceed).
  useFocusTrap(dialogRef, true, allProfiles.length>0 ? ()=>setShowProfileModal(false) : undefined);
  return (
    <div dir="rtl" style={{minHeight:"100vh",background:"linear-gradient(135deg,#e8f5f0 0%,#eee8f8 100%)",fontFamily:"'Heebo',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');*{box-sizing:border-box;}`}</style>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="פרופיל" tabIndex={-1} style={{background:"white",borderRadius:24,padding:36,width:360,boxShadow:"0 12px 48px rgba(100,100,160,0.16)"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <img src="/icon.png" alt="" style={{width:72,borderRadius:18,boxShadow:"0 4px 16px rgba(100,100,160,0.2)"}}/>
        </div>
        <div style={{fontSize:22,fontWeight:700,textAlign:"center",marginBottom:4,color:"#1a1a2e"}}>TaskUp</div>
        <div style={{fontSize:14,color:"#9090b0",textAlign:"center",marginBottom:28}}>{allProfiles.length>0?"בחרי פרופיל או צרי חדש":"ברוכה הבאה 👋"}</div>
        {allProfiles.length>0&&<div style={{marginBottom:20}}>{allProfiles.map(p=>(<button key={p.id} onClick={()=>{setActiveProfileId(p.id);setActiveTab(null);setActiveSubtab(null);setShowProfileModal(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderRadius:14,border:"1.5px solid #ededf5",background:"white",cursor:"pointer",marginBottom:8,fontFamily:"'Heebo',sans-serif",fontSize:15,fontWeight:500,color:"#1a1a2e",transition:"all 0.15s"}}><span style={{width:34,height:34,borderRadius:"50%",background:"#7bc4a4",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{p.name.charAt(0)}</span>{p.name}</button>))}<div style={{borderTop:"1px solid #f0f0f8",margin:"16px 0 14px"}}/></div>}
        <div style={{fontSize:12,fontWeight:700,color:"#b0b0cc",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>{allProfiles.length>0?"פרופיל חדש":"שם הפרופיל"}</div>
        <input autoFocus className="plain-input" style={{width:"100%",marginBottom:14,fontSize:15,"--accent":"#7bc4a4"}} placeholder="שם הפרופיל" value={newProfileName} onChange={e=>setNewProfileName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createProfile()}/>
        <button onClick={createProfile} style={{width:"100%",background:"#7bc4a4",color:"white",border:"none",borderRadius:14,padding:"13px 0",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginBottom:allProfiles.length>0?8:0,boxShadow:"0 4px 14px rgba(123,196,164,0.4)"}}>{allProfiles.length>0?"צרי פרופיל":"התחלי"}</button>
        {allProfiles.length>0&&<button onClick={()=>setShowProfileModal(false)} style={{width:"100%",background:"none",color:"#b0b0cc",border:"none",padding:"8px 0",fontSize:14,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>ביטול</button>}
      </div>
    </div>
  );
}
