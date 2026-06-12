import { useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("icon"); // "icon" | "playing"

  const startVideo = () => {
    const video = videoRef.current;
    if (!video) { onComplete(); return; }

    setPhase("playing");
    const fallback = setTimeout(onComplete, 5000);

    video.addEventListener("ended", () => { clearTimeout(fallback); onComplete(); }, { once: true });
    video.addEventListener("error", () => { clearTimeout(fallback); onComplete(); }, { once: true });

    video.play().catch(() => { clearTimeout(fallback); onComplete(); });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#c8e5d5",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Video — hidden until playing */}
      <video
        ref={videoRef}
        src="/splash_fast.mp4"
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          width: "calc(100% - 48px)",
          maxWidth: 420,
          maxHeight: "calc(100vh - 80px)",
          objectFit: "contain",
          borderRadius: 24,
          opacity: phase === "playing" ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: "none",
        }}
      />

      {/* Icon tap target */}
      {phase === "icon" && (
        <div onClick={startVideo} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img
            src="/icon.png"
            alt="TaskUp"
            style={{ width: 140, height: 140, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))" }}
          />
          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.35)", fontFamily: "'Heebo',sans-serif", fontWeight: 500 }}>
            לחצי להמשיך
          </div>
        </div>
      )}
    </div>
  );
}
