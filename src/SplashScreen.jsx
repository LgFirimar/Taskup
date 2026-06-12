import { useCallback, useEffect, useRef, useState } from "react";

const KEYFRAMES = `
  @keyframes splashBurst {
    0%   { transform: scale(1);    opacity: 1;   filter: blur(0px); }
    30%  { transform: scale(1.12); opacity: 0.9; filter: blur(1px); }
    100% { transform: scale(1.18); opacity: 0;   filter: blur(10px); }
  }
  @keyframes bgDissolve {
    0%   { opacity: 1; }
    100% { opacity: 0; }
  }
`;

export default function SplashScreen({ onComplete }) {
  const [started, setStarted] = useState(false);
  const [bursting, setBursting] = useState(false);
  const doneRef = useRef(false);

  const done = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setBursting(true);
    setTimeout(onComplete, 450);
  }, [onComplete]);

  const videoRef = useCallback((node) => {
    if (!node) return;

    node.addEventListener("ended", done, { once: true });
    node.addEventListener("error", done, { once: true });

    const fallback = setTimeout(done, 5000);

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
    setTimeout(attemptPlay, 500);
  }, [done]);

  useEffect(() => {
    const handler = () => {
      const video = document.querySelector("#splash-video");
      if (video && video.paused) video.play().then(() => setStarted(true)).catch(() => {});
    };
    document.addEventListener("touchstart", handler, { once: true });
    return () => document.removeEventListener("touchstart", handler);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#c8e5d5",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: bursting ? "bgDissolve 0.45s ease-out forwards" : "none",
    }}>
      <style>{KEYFRAMES}</style>

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
          mixBlendMode: "multiply",
          opacity: started && !bursting ? 1 : 0,
          transition: started ? "opacity 0.3s" : "none",
          animation: bursting ? "splashBurst 0.45s ease-out forwards" : "none",
        }}
      />

      {/* Icon shown while video loads, also bursts */}
      {!started && (
        <img
          src="/icon.png"
          alt=""
          style={{
            position: "absolute",
            width: 140, height: 140,
            borderRadius: "22%",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.18))",
            animation: bursting ? "splashBurst 0.45s ease-out forwards" : "none",
          }}
        />
      )}
    </div>
  );
}
