"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Coupon {
  id: number;
  code: string;
  platform: string;
  discount_type: string;
  discount_value: number;
  description?: string;
  store_name?: string;
  expires_at?: string;
  category?: string;
  is_active: boolean;
}

const PLATFORMS = ["الكل", "سلة", "زد", "شيبو", "إكسباي", "أخرى"];

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} style={{ padding: "0.5rem 1rem", background: copied ? "var(--accent)" : "var(--bg)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-sm)", color: copied ? "#fff" : "var(--ink)", fontFamily: "var(--font-arabic)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all var(--transition)", whiteSpace: "nowrap" }}>
      {copied ? "✓ تم النسخ" : "نسخ الكود"}
    </button>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("الكل");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (platform !== "الكل") params.platform = platform;
    if (search) params.search = search;
    api.getCoupons(params).then((d) => { setCoupons(d as Coupon[]); setLoading(false); }).catch(() => setLoading(false));
  }, [platform, search]);

  const filtered = coupons.filter((c) => c.is_active);

  return (
    <>
      {/* Header */}
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", background: "var(--gold-soft)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", animation: "pulse 2s infinite" }} />
            {filtered.length}+ كوبون نشط
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            كوبونات خصم <em style={{ fontStyle: "normal", color: "var(--gold)" }}>حصرية</em>
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 600, lineHeight: 1.7 }}>كوبونات خصم على أهم منصات التجارة الإلكترونية السعودية — محدّثة باستمرار.</p>
        </div>
      </section>

      {/* Filters */}
      <section style={{ padding: "2rem", background: "var(--bg-card)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن كوبون أو متجر..." className="field-input" style={{ flex: 1, minWidth: 200 }} />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)} style={{ padding: "0.45rem 0.9rem", borderRadius: "var(--radius-full)", border: "1px solid var(--line-strong)", background: platform === p ? "var(--accent)" : "var(--bg)", color: platform === p ? "#fff" : "var(--ink-dim)", fontFamily: "var(--font-arabic)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all var(--transition)" }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Coupons Grid */}
      <section style={{ padding: "2.5rem 2rem 6rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }} className="coupons-grid-resp">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--ink-dim)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎟️</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>لا توجد كوبونات</h3>
            <p>جرّب فلتر مختلف أو تحقق لاحقاً</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }} className="coupons-grid-resp">
            {filtered.map((c) => (
              <div key={c.id} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.5rem", position: "relative", overflow: "hidden", transition: "all var(--transition)" }} className="coupon-card">
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--accent-2), var(--accent))" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.15rem 0.5rem" }}>{c.platform}</span>
                    {c.store_name && <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "0.4rem" }}>{c.store_name}</div>}
                  </div>
                  <div style={{ textAlign: "left", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>
                      {c.discount_value}{c.discount_type === "percentage" ? "%" : " ريال"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--ink-dim)" }}>خصم</div>
                  </div>
                </div>
                {c.description && <p style={{ fontSize: "0.83rem", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "1rem" }}>{c.description}</p>}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px dashed var(--line-strong)", paddingTop: "1rem" }}>
                  <div style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.8rem", fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink)" }}>{c.code}</div>
                  <CopyButton code={c.code} />
                </div>
                {c.expires_at && (
                  <div style={{ fontSize: "0.72rem", color: "var(--ink-mid)", marginTop: "0.5rem" }}>
                    ينتهي: {new Date(c.expires_at).toLocaleDateString("ar-SA")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @media (max-width:900px) { .coupons-grid-resp { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width:580px) { .coupons-grid-resp { grid-template-columns: 1fr !important; } }
        .coupon-card:hover { border-color: var(--line-accent) !important; transform: translateY(-3px) !important; box-shadow: 0 12px 36px rgba(168,85,247,0.12) !important; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </>
  );
}
