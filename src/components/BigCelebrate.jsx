// Confetti-style burst shown briefly when a task/reminder is marked done.
export default function BigCelebrate() {
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:260,overflow:"hidden"}}>
      {["🎉","✨","⭐","🎊","💫","🌟","🎈"].map((emoji,i)=>(
        <span key={i} className="big-emoji" style={{"--dx":`${(i-3)*35}px`,"--dy":`-${60+Math.round(i*8)}px`,left:"50%",bottom:"40%",animationDelay:`${i*70}ms`}}>{emoji}</span>
      ))}
    </div>
  );
}
