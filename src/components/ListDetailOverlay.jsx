import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Full-screen detail view for a single shopping list or note, opened from the
// lists menu or via voice command.
export default function ListDetailOverlay({
  openListId, openList, openListType, accent,
  setOpenListId, setOpenListType, setListItemInput, listItemInput,
  shareShoppingList, deleteShoppingList, deleteNote, updateProfile,
  toggleShoppingItem, editingShoppingItem, setEditingShoppingItem, editShoppingItem, deleteShoppingItem,
  showBoughtItems, setShowBoughtItems, parseAndAddItems, parsingList,
}) {
  const containerRef = useRef(null);
  // No onEscape — item-editing inputs already use Escape to cancel their own
  // edit state, so this only traps Tab focus within the full-screen overlay.
  useFocusTrap(containerRef, true);
  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={openList.name} tabIndex={-1} style={{position:"fixed",inset:0,background:"white",zIndex:200,direction:"rtl",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #ebebea",display:"flex",alignItems:"center",gap:12,background:"white"}}>
        <button className="back-btn" onClick={()=>{setOpenListId(null);setOpenListType(null);setListItemInput("");}}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M5 11 Q9 11 11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M11 11 H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M16 5 L23 11 L16 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5" cy="11" r="3" fill="currentColor" opacity="0.45"/>
          </svg>
          <span style={{fontSize:11,fontWeight:600}}>חזרה</span>
        </button>
        <span style={{fontWeight:700,fontSize:18,flex:1}}>{openList.name}</span>
        {openListType==="shopping"&&(
          <button onClick={()=>shareShoppingList(openList)} style={{background:"none",border:"none",fontSize:13,color:"#25d366",cursor:"pointer",fontFamily:"'Heebo',sans-serif",marginLeft:8}}>💬 שתף</button>
        )}
        <button onClick={()=>{if(openListType==="shopping")deleteShoppingList(openListId);else deleteNote(openListId);}} style={{background:"none",border:"none",fontSize:13,color:"#e07070",cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>מחק</button>
      </div>

      {/* Notes: free textarea */}
      {openListType==="notes"&&(
        <textarea style={{flex:1,padding:"20px",fontFamily:"'Heebo',sans-serif",fontSize:16,lineHeight:1.8,border:"none",outline:"none",resize:"none",direction:"rtl",color:"#1a1a1a",background:"white"}}
          placeholder="כתבי כאן בחופשיות..."
          value={openList.content||""}
          onChange={e=>updateProfile(p=>({...p,notes:(p.notes||[]).map(n=>n.id===openListId?{...n,content:e.target.value}:n)}))}/>
      )}

      {/* Shopping: items list */}
      {openListType==="shopping"&&<>
        <div style={{flex:1,overflowY:"auto",padding:"8px 20px 100px"}}>
          {(!openList.items||openList.items.length===0)&&<div style={{color:"#6b6b6b",fontSize:14,textAlign:"center",padding:"40px 0"}}>רשימה ריקה — הוסיפי פריטים למטה</div>}
          {(openList.items||[]).filter(item=>!item.done).map(item=>(
            <div key={item.id} className="list-item-row">
              <button onClick={()=>toggleShoppingItem(openListId,item.id)} aria-label={`סמני "${item.text}" כנקנה`} style={{width:18,height:18,minWidth:18,borderRadius:"50%",border:`1.5px solid ${accent}`,background:"none",padding:0,cursor:"pointer",flexShrink:0}}/>
              {editingShoppingItem?.itemId===item.id
                ?<input autoFocus className="edit-inline" style={{flex:1,fontSize:15}} value={editingShoppingItem.text} onChange={e=>setEditingShoppingItem(p=>({...p,text:e.target.value}))}
                    onKeyDown={e=>{if(e.key==="Enter")editShoppingItem(openListId,item.id,editingShoppingItem.text);if(e.key==="Escape")setEditingShoppingItem(null);}}/>
                :<span style={{flex:1,fontSize:15,color:"#1a1a1a",lineHeight:1.5}}>{item.text}</span>
              }
              <button onClick={()=>setEditingShoppingItem({listId:openListId,itemId:item.id,text:item.text})} style={{background:"none",border:"none",color:"#8a8a8a",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="ערוך פריט">✎</button>
              <button onClick={()=>deleteShoppingItem(openListId,item.id)} style={{background:"none",border:"none",color:"#8a8a8a",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="מחק פריט">✕</button>
            </div>
          ))}

          {(openList.items||[]).some(item=>item.done)&&(()=>{
            const bought=(openList.items||[]).filter(item=>item.done);
            return <>
              <button onClick={()=>setShowBoughtItems(v=>!v)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,color:"#6b6b6b",fontWeight:600,padding:"10px 4px 6px",display:"flex",alignItems:"center",gap:6}}>
                נקנה ({bought.length}) <span style={{fontSize:9}}>{showBoughtItems?"▲":"▼"}</span>
              </button>
              {showBoughtItems&&bought.map(item=>(
                <div key={item.id} className="list-item-row">
                  <button onClick={()=>toggleShoppingItem(openListId,item.id)} aria-label={`בטלי סימון "${item.text}" כנקנה`} style={{width:18,height:18,minWidth:18,borderRadius:"50%",border:`1.5px solid ${accent}`,background:accent,padding:0,cursor:"pointer",flexShrink:0}}/>
                  <span style={{flex:1,fontSize:15,color:"#bbb",lineHeight:1.5,textDecoration:"line-through"}}>{item.text}</span>
                  <button onClick={()=>deleteShoppingItem(openListId,item.id)} style={{background:"none",border:"none",color:"#8a8a8a",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}} aria-label="מחק פריט">✕</button>
                </div>
              ))}
            </>;
          })()}
        </div>
        {/* Fixed add bar — stays above keyboard on mobile */}
        <div style={{position:"fixed",bottom:0,left:0,right:0,padding:"12px 20px",paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",borderTop:"1px solid #ebebea",background:"white",zIndex:201}}>
          <div style={{fontSize:11,color:"#6b6b6b",marginBottom:6,fontWeight:600}}>פסיקים בין פריטים, או משפט חופשי</div>
          <div style={{display:"flex",gap:10}}>
            <input autoFocus className="plain-input" style={{flex:1,fontSize:15}} placeholder='חלב, ביצים, לחם  או  "תקני גם יוגורט"' value={listItemInput} onChange={e=>setListItemInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){parseAndAddItems(openListId,listItemInput);setListItemInput("");}}}/>
            <button className="add-btn" style={{minWidth:52}} aria-label="הוסף פריטים" onClick={()=>{parseAndAddItems(openListId,listItemInput);setListItemInput("");}} disabled={parsingList}>
              {parsingList?<div className="spinner" style={{borderTopColor:"white",borderColor:"rgba(255,255,255,0.3)"}}/>:"+"}
            </button>
          </div>
        </div>
      </>}
    </div>
  );
}
