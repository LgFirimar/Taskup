import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const fallback = setTimeout(onComplete, 8000);

    if (!video) return () => clearTimeout(fallback);

    const onCanPlay = () => {
      setReady(true);
      video.playbackRate = 2.5;
      video.play().catch(() => { clearTimeout(fallback); onComplete(); });
    };

    const onEnded = () => { clearTimeout(fallback); onComplete(); };
    const onError = () => { clearTimeout(fallback); onComplete(); };

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("ended", onEnded, { once: true });
    video.addEventListener("error", onError, { once: true });

    return () => {
      clearTimeout(fallback);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#c8e5d5",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <video
        ref={videoRef}
        src="/splash_reversed.mp4"
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
          transition: "opacity 0.4s",
        }}
      />
      {!ready && (
        <img
          src="/icon.png"
          alt="TaskUp"
          style={{ position: "absolute", width: 120, height: 120 }}
        />
      )}
    </div>
  );
}
