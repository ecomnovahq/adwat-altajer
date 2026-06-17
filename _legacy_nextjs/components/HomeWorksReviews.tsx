"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Work {
  id: number; title: string; description?: string;
  badge_label: string; gradient_from: string; gradient_via: string; gradient_to: string;
}
interface Review {
  id: number; name: string; store?: string; review_text: string; rating: number; avatar_letter?: string;
}

export function HomeWorks() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getWorks().then((w) => { setWorks((w as Work[]).slice(0, 6)); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }} className="works-grid-responsive">
      {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  if (works.length === 0) return <div style={{ textAlign: "center", padding: "3rem", color: "var(--ink-dim)" }}>لا توجد أعمال بعد</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem", marginTop: "3rem" }} className="works-grid-responsive">
      {works.map((w) => (
        <div key={w.id} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ height: 180, background: `linear-gradient(135deg, ${w.gradient_from}, ${w.gradient_via}, ${w.gradient_to})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "0.5rem 1rem", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 8, width: 80, background: "rgba(255,255,255,0.6)", borderRadius: 4 }} />
              <div style={{ height: 6, width: 120, background: "rgba(255,255,255,0.4)", borderRadius: 4 }} />
              <div style={{ height: 6, width: 60, background: "rgba(255,255,255,0.3)", borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ padding: "1.25rem" }}>
            <span style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.2rem 0.6rem", marginBottom: "0.6rem" }}>{w.badge_label}</span>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.4rem" }}>{w.title}</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--ink-dim)", lineHeight: 1.6 }}>{(w.description || "").slice(0, 90)}{(w.description || "").length > 90 ? "..." : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getReviews().then((r) => { setReviews((r as Review[]).slice(0, 6)); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }} className="reviews-grid-responsive">
      {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 220, borderRadius: "var(--radius-lg)" }} />)}
    </div>
  );

  if (reviews.length === 0) return <div style={{ textAlign: "center", padding: "3rem", color: "var(--ink-dim)" }}>لا توجد مراجعات بعد</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem", marginTop: "3rem" }} className="reviews-grid-responsive">
      {reviews.map((r) => (
        <div key={r.id} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
          <div style={{ color: "#fbbf24", fontSize: "1rem", marginBottom: "0.75rem" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
          <p style={{ fontSize: "0.9rem", color: "var(--ink)", lineHeight: 1.7, marginBottom: "1.25rem" }}>&ldquo;{r.review_text}&rdquo;</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}>
              {r.avatar_letter || r.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{r.name}</div>
              {r.store && <div style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>{r.store}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
