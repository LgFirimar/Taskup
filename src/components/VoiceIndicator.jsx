// Floating mic button — tap to start/pause voice recognition. Shows the last
// heard phrase (voiceLabel) or a live interim debug transcript (voiceDebug).
export default function VoiceIndicator({
  voiceAvail, voiceState, setVoiceState, voiceLabel, voiceDebug,
  recognitionRef, voiceModeRef, voiceActiveRef,
}) {
  if (!voiceAvail) return null;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={voiceState==="off"?"הפעל שליטה קולית":voiceState==="listening"?"מאזין — הקש כדי להשהות":"הקש כדי לדבר"}
      style={{position:"fixed",bottom:90,right:20,zIndex:250,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}}
      onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.currentTarget.click();}}}
      onClick={()=>{
        const r=recognitionRef.current;
        if(!r) return;
        if(voiceState==="off"){
          // First use — start recognition + enter listening immediately
          voiceActiveRef.current=true;
          sessionStorage.setItem("voice_on","1");
          voiceModeRef.current="listening";
          const sayHi=()=>{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance("כן?"); u.lang="he-IL"; speechSynthesis.speak(u); };
          try{ r.start(); setVoiceState("listening"); sayHi(); }catch(err){ console.error("voice: failed to start recognition",err); }
        } else if(voiceModeRef.current==="listening"){
          // Already listening — pause
          voiceModeRef.current="idle"; setVoiceState("idle");
        } else {
          // Idle — enter listening
          const sayHi2=()=>{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance("כן?"); u.lang="he-IL"; speechSynthesis.speak(u); };
          voiceModeRef.current="listening"; setVoiceState("listening"); sayHi2();
        }
      }}
    >
      {voiceLabel&&<div style={{background:"rgba(0,0,0,0.75)",color:"white",fontSize:12,padding:"5px 12px",borderRadius:20,fontFamily:"'Heebo',sans-serif",direction:"rtl",whiteSpace:"nowrap",maxWidth:220,textAlign:"center"}}>{voiceLabel}</div>}
      {voiceDebug&&!voiceLabel&&<div style={{background:"rgba(80,80,200,0.85)",color:"white",fontSize:11,padding:"4px 10px",borderRadius:20,fontFamily:"'Heebo',sans-serif",direction:"rtl",maxWidth:220,textAlign:"center",fontStyle:"italic"}}>{voiceDebug}</div>}
      <div style={{width:42,height:42,borderRadius:"50%",background:voiceState==="listening"?"#ef5350":voiceState==="processing"?"#ffa726":"white",border:"2px solid "+(voiceState==="listening"?"#ef5350":voiceState==="processing"?"#ffa726":voiceState==="off"?"#dde":"#dde"),display:"flex",alignItems:"center",justifyContent:"center",boxShadow:voiceState==="listening"?"0 0 0 6px rgba(239,83,80,0.2)":"0 2px 8px rgba(0,0,0,0.1)",transition:"all 0.3s",animation:voiceState==="listening"?"voicePulse 1s ease-in-out infinite":"none",opacity:voiceState==="off"?0.45:1}}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="6" y="1" width="6" height="10" rx="3" fill={voiceState==="listening"?"white":"#aab"}/>
          <path d="M3 9a6 6 0 0012 0" stroke={voiceState==="listening"?"white":"#aab"} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9" y1="15" x2="9" y2="17" stroke={voiceState==="listening"?"white":"#aab"} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{fontSize:9,color:voiceState==="listening"?"#ef5350":"#bbb",fontFamily:"'Heebo',sans-serif",whiteSpace:"nowrap"}}>
        {voiceState==="off"?"הפעל קול":voiceState==="listening"?"מאזין...":"הקש לדבר"}
      </div>
    </div>
  );
}
