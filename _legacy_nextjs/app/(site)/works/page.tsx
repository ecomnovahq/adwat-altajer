"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Work {
  id: number;
  title: string;
  description?: string;
  badge_label: string;
  category?: string;
  gradient_from: string;
  gradient_via: string;
  gradient_to: string;
}

export default function WorksPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("الكل");

  const categories = ["الكل", ...Array.from(new Set(works.map((w) => w.category || "أخرى")))];

  useEffect(() => {
    api.getWorks(category !== "الكل" ? category : undefined)
      .then((d) => { setWorks(d as Work[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  return (
    <>
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            معرض الأعمال
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            أعمال <em style={{ fontStyle: "normal", color: "var(--accent)" }}>نفتخر</em> بها
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 600, lineHeight: 1.7 }}>مشاريع حقيقية نفّذناها لتجار سعوديين — كل مشروع قصة نجاح.</p>
        </div>
      </section>

      {categories.length > 2 && (
        <section style={{ padding: "1.5rem 2rem", background: "var(--bg-card)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} style={{ padding: "0.45rem 0.9rem", borderRadius: "var(--radius-full)", border: "1px solid var(--line-strong)", background: category === c ? "var(--accent)" : "var(--bg)", color: category === c ? "#fff" : "var(--ink-dim)", fontFamily: "var(--font-arabic)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all var(--transition)" }}>
                {c}
              </button>
            ))}
          </div>
        </section>
      )}

      <section style={{ padding: "2.5rem 2rem 6rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }} className="works-grid-resp">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />)}
          </div>
        ) : works.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--ink-dim)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎨</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>لا توجد أعمال بعد</h3>
            <p>تحقق لاحقاً</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }} className="works-grid-resp">
            {works.map((w) => (
              <div key={w.id} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", transition: "all var(--transition)" }} className="work-card">
                <div style={{ height: 200, background: `linear-gradient(135deg, ${w.gradient_from}, ${w.gradient_via}, ${w.gradient_to})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 8, width: 90, background: "rgba(255,255,255,0.65)", borderRadius: 4 }} />
                    <div style={{ height: 6, width: 130, background: "rgba(255,255,255,0.45)", borderRadius: 4 }} />
                    <div style={{ height: 6, width: 70, background: "rgba(255,255,255,0.3)", borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  <span style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.2rem 0.6rem", marginBottom: "0.75rem" }}>{w.badge_label}</span>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem" }}>{w.title}</h3>
                  {w.description && <p style={{ fontSize: "0.83rem", color: "var(--ink-dim)", lineHeight: 1.65 }}>{w.description.slice(0, 100)}{w.description.length > 100 ? "..." : ""}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @media (max-width:900px) { .works-grid-resp { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width:580px) { .works-grid-resp { grid-template-columns: 1fr !important; } }
        .work-card:hover { border-color: var(--line-accent) !important; transform: translateY(-4px) !important; box-shadow: 0 16px 48px rgba(168,85,247,0.12) !important; }
      `}</style>
    </>
  );
}
