// Floating side pills (shopping/notes/projects/email quick-access) plus the
// quick-capture FAB button.
export default function SidePills({
  accent,
  showListsMenu, setShowListsMenu,
  showProjects, openProjectId, setShowProjects, setOpenProjectId,
  showEmail, setShowEmail,
  setShowQuickCapture,
}) {
  return (<>
    {[
      {key:"shopping", icon:"🛒", label:"קניות",     bottom:216, active:showListsMenu==="shopping",        fn:()=>setShowListsMenu(showListsMenu==="shopping"?null:"shopping")},
      {key:"notes",    icon:"📝", label:"פתקים",     bottom:172, active:showListsMenu==="notes",           fn:()=>setShowListsMenu(showListsMenu==="notes"?null:"notes")},
      {key:"projects", icon:"🗂", label:"פרויקטים", bottom:128, active:!!(showProjects||openProjectId),   fn:()=>{setShowProjects(true);setOpenProjectId(null);}},
      {key:"email",    icon:"📧", label:"מייל",      bottom:84,  active:showEmail,                         fn:()=>setShowEmail(true)},
    ].map(({key,icon,label,bottom,active,fn})=>(
      <button key={key}
        className={`side-pill${active?" active-pill":""}`}
        style={{bottom, ...(active?{}:{padding:"0",width:38,height:38,minWidth:38,justifyContent:"center",gap:0})}}
        aria-label={label}
        onClick={fn}
      >
        <span style={{fontSize:active?14:18}}>{icon}</span>
        {active&&<span>{label}</span>}
      </button>
    ))}
    <button className="fab" style={{background:accent}} aria-label="לכידה מהירה — הוסיפי משימה" onClick={()=>setShowQuickCapture(true)}>+</button>
  </>);
}
