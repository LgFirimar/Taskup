// Popover shown from the shopping/notes side pills — lets you jump into an
// existing list/note or create a new one.
export default function ListsMenu({
  showListsMenu, setShowListsMenu, shoppingLists, notesList,
  setOpenListId, setOpenListType, showNewListInput, setShowNewListInput,
  newListName, setNewListName, addShoppingList, addNote,
}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:190}} onClick={()=>{setShowListsMenu(null);setShowNewListInput(false);setNewListName("");}}>
      <div style={{position:"absolute",bottom:96,left:24,background:"white",borderRadius:14,padding:16,minWidth:220,boxShadow:"0 4px 24px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{showListsMenu==="shopping"?"🛒 רשימות קניות":"📝 פתקים"}</div>
        {(showListsMenu==="shopping"?shoppingLists:notesList).map(list=>(
          <button key={list.id} onClick={()=>{setOpenListId(list.id);setOpenListType(showListsMenu);setShowListsMenu(null);setShowNewListInput(false);}}
            style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"1px solid #ebebea",background:"white",cursor:"pointer",marginBottom:6,fontFamily:"'Heebo',sans-serif",fontSize:14,color:"#1a1a1a",textAlign:"right"}}>
            <span style={{flex:1}}>{list.name}</span>
            <span style={{fontSize:11,color:"#6b6b6b"}}>{showListsMenu==="shopping"?(list.items||[]).filter(i=>!i.done).length:"📄"}</span>
          </button>
        ))}
        {showNewListInput?(
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <input autoFocus className="plain-input" style={{flex:1,fontSize:13,padding:"6px 10px"}} placeholder={showListsMenu==="shopping"?"שם הרשימה":"שם הפתק"} value={newListName} onChange={e=>setNewListName(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){if(showListsMenu==="shopping")addShoppingList(newListName);else addNote(newListName);setNewListName("");setShowNewListInput(false);}if(e.key==="Escape"){setShowNewListInput(false);setNewListName("");}}}/>
            <button className="add-btn" style={{padding:"6px 10px",fontSize:13}} aria-label={showListsMenu==="shopping"?"צור רשימה":"צור פתק"} onClick={()=>{if(showListsMenu==="shopping")addShoppingList(newListName);else addNote(newListName);setNewListName("");setShowNewListInput(false);}}>+</button>
          </div>
        ):(
          <button className="ghost-btn" style={{width:"100%",marginTop:4,fontSize:13}} onClick={()=>setShowNewListInput(true)}>+ {showListsMenu==="shopping"?"רשימה חדשה":"פתק חדש"}</button>
        )}
      </div>
    </div>
  );
}
