// Bottom-sheet "quick add a task" input, opened from the FAB.
export default function QuickCapture({ setShowQuickCapture, currentTab, quickText, setQuickText, quickCapture, ctx }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,direction:"rtl"}} onClick={e=>{if(e.target===e.currentTarget)setShowQuickCapture(false);}}>
      <div style={{background:"white",borderRadius:"16px 16px 0 0",padding:"24px 20px 32px",width:"100%",maxWidth:600}}>
        <div style={{fontSize:12,fontWeight:700,color:"#6b6b6b",marginBottom:10}}>📥 לכידה מהירה {currentTab?`← ${currentTab.label}`:"← בחרי קודם כרטיסייה"}</div>
        <div style={{display:"flex",gap:10}}>
          <input autoFocus className="plain-input" style={{flex:1,fontSize:16}} placeholder="מה עלה לך בראש?" value={quickText} onChange={e=>setQuickText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&ctx)quickCapture();if(e.key==="Escape")setShowQuickCapture(false);}}/>
          <button className="add-btn" style={{fontSize:15}} onClick={quickCapture} disabled={!ctx}>הוסיפי</button>
        </div>
        {!ctx&&<div style={{fontSize:12,color:"#e07070",marginTop:8}}>בחרי כרטיסייה כדי להוסיף משימה</div>}
      </div>
    </div>
  );
}
