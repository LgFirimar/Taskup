import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const fallback = setTimeout(onComplete, 6000);

    if (!video) return () => clearTimeout(fallback);

    const onLoaded = () => {
      setReady(true);
      video.play().catch(() => { clearTimeout(fallback); onComplete(); });
    };

    const onEnded = () => {
      clearTimeout(fallback);
      onComplete();
    };

    const onError = () => {
      clearTimeout(fallback);
      onComplete();
    };

    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("ended", onEnded, { once: true });
    video.addEventListener("error", onError, { once: true });

    return () => {
      clearTimeout(fallback);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#b8e0d2",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <video
        ref={videoRef}
        src="/splash.mp4"
        muted
        playsInline
        preload="auto"
        style={{
          width: "100%", height: "100%",
          objectFit: "cover",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />
      {!ready && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#b8e0d2",
        }}>
          <img
            src="/icon.png"
            alt="TaskUp"
            style={{ width: 120, height: 120, borderRadius: 28, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
          />
        </div>
      )}
    </div>
  );
}
