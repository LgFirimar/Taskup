import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    // Fallback: if video doesn't load within 800ms, skip splash
    const fallback = setTimeout(onComplete, 800);

    if (!video) return () => clearTimeout(fallback);

    const start = () => {
      clearTimeout(fallback);
      setReady(true);
      video.currentTime = video.duration;

      const fps = 30;
      const step = 1 / fps;

      const tick = () => {
        if (!videoRef.current) return;
        const v = videoRef.current;
        const next = v.currentTime - step;
        if (next <= 0) {
          v.currentTime = 0;
          setTimeout(onComplete, 300);
          return;
        }
        v.currentTime = next;
        rafRef.current = requestAnimationFrame(tick);
      };

      setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 50);
    };

    video.addEventListener("loadedmetadata", start, { once: true });
    video.addEventListener("error", () => { clearTimeout(fallback); onComplete(); }, { once: true });

    return () => {
      clearTimeout(fallback);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#b8e0d2",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 24,
    }}>
      <video
        ref={videoRef}
        src="/splash.mp4"
        muted
        playsInline
        preload="auto"
        style={{
          width: "min(340px, 85vw)",
          borderRadius: 32,
          opacity: ready ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      {!ready && (
        <div style={{ width: 48, height: 48 }}>
          <img src="/icon.svg" alt="" style={{ width: "100%", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
