export default function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", zIndex: 9999,
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <svg width="40" height="56" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style={{ animation: "logoPulse 1.4s ease-in-out infinite" }}>
          <polygon points="50,4 93,30 93,110 50,136 7,110 7,30" fill="#a855f7" />
          <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="7,30 50,4 50,70 7,70" />
          <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="50,70 93,70 93,110 50,136" />
        </svg>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", display: "block", animation: `loadDot 1.2s ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes logoPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }
        @keyframes loadDot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}
