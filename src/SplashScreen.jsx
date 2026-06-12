import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) { setTimeout(onComplete, 500); return; }

    const fallback = setTimeout(onComplete, 6000);

    const tryPlay = () => {
      video.play()
        .then(() => setStarted(true))
        .catch(() => { clearTimeout(fallback); onComplete(); });
    };

    video.addEventListener("loadeddata", tryPlay, { once: true });
    video.addEventListener("ended", () => { clearTimeout(fallback); onComplete(); }, { once: true });
    video.addEventListener("error", () => { clearTimeout(fallback); onComplete(); }, { once: true });

    // If loadeddata already fired (cached)
    if (video.readyState >= 2) tryPlay();

    return () => clearTimeout(fallback);
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#c8e5d5",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <video
        ref={videoRef}
        src="/splash_fast.mp4"
        muted
        playsInline
        preload="auto"
        style={{
          width: "calc(100% - 48px)",
          maxWidth: 420,
          maxHeight: "calc(100vh - 80px)",
          objectFit: "contain",
          borderRadius: 24,
          opacity: started ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      {!started && (
        <img src="/icon.png" alt="" style={{ position: "absolute", width: 120, height: 120 }} />
      )}
    </div>
  );
}
