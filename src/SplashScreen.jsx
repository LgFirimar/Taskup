import { useCallback, useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const [started, setStarted] = useState(false);
  const doneRef = useRef(false);

  const done = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  // ref callback — fires synchronously when the DOM node mounts
  // iOS allows play() here because it's still within the launch gesture context
  const videoRef = useCallback((node) => {
    if (!node) return;

    node.addEventListener("ended", done, { once: true });
    node.addEventListener("error", done, { once: true });

    const fallback = setTimeout(done, 4000);

    const attemptPlay = () => {
      node.play()
        .then(() => setStarted(true))
        .catch(() => clearTimeout(fallback));
    };

    if (node.readyState >= 3) {
      attemptPlay();
    } else {
      node.addEventListener("canplaythrough", attemptPlay, { once: true });
    }

    // Safety: if canplaythrough never fires, try anyway after 500ms
    setTimeout(attemptPlay, 500);
  }, [done]);

  // Intercept first touchstart on the page — iOS sometimes needs this
  useEffect(() => {
    const handler = (e) => {
      const video = document.querySelector("#splash-video");
      if (video && video.paused) {
        video.play().then(() => setStarted(true)).catch(() => {});
      }
    };
    document.addEventListener("touchstart", handler, { once: true });
    return () => document.removeEventListener("touchstart", handler);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#c8e5d5",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <video
        id="splash-video"
        ref={videoRef}
        src="/splash_fast.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
        style={{
          width: "calc(100% - 48px)",
          maxWidth: 420,
          maxHeight: "calc(100vh - 80px)",
          objectFit: "contain",
          borderRadius: 24,
          opacity: started ? 1 : 0,
          transition: "opacity 0.3s",
          mixBlendMode: "multiply",
        }}
      />
      {!started && (
        <img
          src="/icon.png"
          alt="TaskUp"
          style={{ position: "absolute", width: 140, height: 140, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))" }}
        />
      )}
    </div>
  );
}
