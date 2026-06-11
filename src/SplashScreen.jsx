import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const fallback = setTimeout(onComplete, 8000);

    if (!video) return () => clearTimeout(fallback);

    const start = () => {
      setReady(true);
      video.currentTime = video.duration;

      // Play backwards — notes fly IN to the calendar
      const fps = 30;
      const step = 1 / fps;
      const tick = () => {
        if (!videoRef.current) return;
        const v = videoRef.current;
        const next = v.currentTime - step;
        if (next <= 0) {
          v.currentTime = 0;
          clearTimeout(fallback);
          setTimeout(onComplete, 400);
          return;
        }
        v.currentTime = next;
        rafRef.current = requestAnimationFrame(tick);
      };
      setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, 50);
    };

    const onError = () => { clearTimeout(fallback); onComplete(); };

    video.addEventListener("loadedmetadata", start, { once: true });
    video.addEventListener("error", onError, { once: true });

    return () => {
      clearTimeout(fallback);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "white",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <video
        ref={videoRef}
        src="/splash.mp4"
        muted
        playsInline
        preload="auto"
        style={{
          width: "calc(100% - 48px)",
          maxWidth: 420,
          maxHeight: "calc(100vh - 80px)",
          objectFit: "contain",
          borderRadius: 24,
          opacity: ready ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      {!ready && (
        <div style={{ position: "absolute", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src="/icon.png"
            alt="TaskUp"
            style={{ width: 120, height: 120 }}
          />
        </div>
      )}
    </div>
  );
}
