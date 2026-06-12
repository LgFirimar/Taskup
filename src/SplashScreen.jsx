import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onComplete }) {
  const [started, setStarted] = useState(false);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#c8e5d5",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {!started && (
        <img
          src="/icon.png"
          alt=""
          style={{ position: "absolute", width: 120, height: 120 }}
        />
      )}
      <video
        src="/splash_fast.mp4"
        muted
        playsInline
        autoPlay
        onPlay={() => setStarted(true)}
        onEnded={onComplete}
        onError={onComplete}
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
    </div>
  );
}
