import { formatDate } from "../utils";

// Shown once on load if any reminder's alertDate has already arrived
// (see computeInitialAlerts in utils.js).
export default function ReminderAlertModal({ alertReminders, setShowAlertModal }) {
  return (
    <div className="alert-modal">
      <div className="alert-card">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:22}}>🔔</span>
          <span style={{fontWeight:700,fontSize:17}}>תזכורות שממתינות לך</span>
        </div>
        <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:8}}>
          {alertReminders.map((r,i)=>(
            <div key={i} className="alert-item">
              <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14}}>{r.text}</div>
                {r.startDate&&<div style={{fontSize:12,color:"#92400e",marginTop:2}}>מ-{formatDate(r.startDate)}{r.endDate?` עד ${formatDate(r.endDate)}`:""}</div>}
              </div>
            </div>
          ))}
        </div>
        <button onClick={()=>setShowAlertModal(false)}
          style={{background:"#1a1a1a",color:"white",border:"none",borderRadius:10,padding:"11px 0",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"'Heebo',sans-serif"}}>
          סגור
        </button>
      </div>
    </div>
  );
}
