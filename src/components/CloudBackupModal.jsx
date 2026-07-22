import { useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

// Google Drive backup: connect once, then every change is backed up
// automatically in the background (debounced). Also offers a manual
// "backup now" and a "restore" that pulls the saved file back down.
export default function CloudBackupModal({
  setShowCloudBackup,
  driveToken, connectDrive, disconnectDrive,
  driveAuthError, setDriveAuthError,
  lastBackupAt, backupInProgress, backupToDrive,
  restoreInProgress, restoreFromDrive,
}) {
  const lastBackupLabel = lastBackupAt
    ? new Date(lastBackupAt).toLocaleString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, true, ()=>setShowCloudBackup(false));

  return (
    <div className="alert-modal" onClick={()=>setShowCloudBackup(false)}>
      <div className="alert-card" ref={dialogRef} role="dialog" aria-modal="true" aria-label="גיבוי ל-Google Drive" tabIndex={-1} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>☁️</span>
          <span style={{fontWeight:700,fontSize:16,flex:1}}>גיבוי ל-Google Drive</span>
          <button onClick={()=>setShowCloudBackup(false)} aria-label="סגור" style={{background:"none",border:"none",cursor:"pointer",color:"#8a8a8a",fontSize:18,lineHeight:1}}>✕</button>
        </div>

        <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:14,fontSize:13,lineHeight:1.6}}>
          {!driveToken ? (
            <>
              <div style={{color:"#555"}}>
                חיבור חד-פעמי ל-Google Drive שומר גיבוי אוטומטי של כל הנתונים שלך (פרופילים, כרטיסיות, משימות, תזכורות, קניות ופתקים) בקובץ אחד בענן — כך שגם אם מנקים cache או עוברים מכשיר, אפשר לשחזר הכל.
              </div>
              <button className="add-btn" onClick={connectDrive}>התחברי ל-Drive</button>
            </>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,color:"#2d7a5a",fontWeight:600}}>
                <span>✓ מחוברת ל-Google Drive</span>
              </div>
              <div style={{color:"#6b6b6b"}}>
                {backupInProgress
                  ? "מגבה עכשיו..."
                  : lastBackupLabel
                    ? `גיבוי אחרון: ${lastBackupLabel}`
                    : "עדיין לא בוצע גיבוי — הוא יתבצע אוטומטית בעוד כמה שניות, או אפשר לגבות עכשיו."}
              </div>

              <div style={{display:"flex",gap:8}}>
                <button className="add-btn" style={{flex:1}} disabled={backupInProgress} onClick={backupToDrive}>
                  {backupInProgress?<div className="spinner" style={{borderTopColor:"white",borderColor:"rgba(255,255,255,0.3)"}}/>:"גבי עכשיו"}
                </button>
                <button
                  style={{flex:1,border:"1.5px solid #e5e5e3",borderRadius:12,background:"white",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:13,fontWeight:600,color:"#555"}}
                  disabled={restoreInProgress}
                  onClick={restoreFromDrive}
                >
                  {restoreInProgress?<div className="spinner"/>:"שחזרי מגיבוי"}
                </button>
              </div>

              <button
                onClick={()=>disconnectDrive()}
                style={{background:"none",border:"none",color:"#c08080",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:12,alignSelf:"flex-start",padding:0}}
              >
                התנתקי מ-Drive
              </button>
            </>
          )}

          {driveAuthError&&(
            <div style={{background:"#fff5f5",border:"1px solid #f5c6c6",borderRadius:10,padding:"10px 12px",color:"#b03030",fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {driveAuthError}
              <button onClick={()=>setDriveAuthError("")} style={{display:"block",marginTop:6,background:"none",border:"none",color:"#b03030",textDecoration:"underline",cursor:"pointer",fontSize:11,padding:0,fontFamily:"'Heebo',sans-serif"}}>סגרי הודעה</button>
            </div>
          )}

          <div style={{fontSize:11,color:"#8a8a8a",borderTop:"1px solid #f0f0f8",paddingTop:10}}>
            החיבור נשמר בדפדפן הזה ופג אחרי כשעה — אם הגיבוי האוטומטי מפסיק לעבוד, זו הסיבה הכי סבירה; פשוט התחברי מחדש. נדרש שה-Google Drive API מופעל באותו פרויקט ב-Google Cloud Console שבו הופעל Gmail API.
          </div>
        </div>
      </div>
    </div>
  );
}
