"use client";

import { useEffect, useRef, useState } from "react";

function useCounter(target: number, started: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [started, target]);
  return val;
}

function StatBlock({ num, prefix, suffix, label, gold }: { num: number; prefix?: string; suffix?: string; label: string; gold: boolean }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const val = useCounter(num, started);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ background: "var(--bg-card)", padding: "3rem 2rem", textAlign: "center" }}>
      <div style={{
        fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "0.5rem",
        background: gold ? "linear-gradient(135deg, #fbbf24, var(--gold))" : "linear-gradient(135deg, var(--accent-3), var(--accent))",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }}>
        {prefix}{val}{suffix}
      </div>
      <div style={{ fontSize: "0.82rem", color: "var(--ink-dim)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function HomeStats() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginTop: "4rem" }} className="stats-grid-responsive">
      <StatBlock num={500} prefix="+" label="كوبون خصم نشط" gold={false} />
      <StatBlock num={10} label="أداة ذكية مجانية" gold={true} />
      <StatBlock num={95} suffix="%" label="رضا العملاء" gold={false} />
      <StatBlock num={200} suffix="+" label="مشروع منجز" gold={true} />
    </div>
  );
}
