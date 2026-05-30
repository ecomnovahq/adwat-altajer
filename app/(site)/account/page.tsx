"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useState } from "react";

interface Booking {
  id: number;
  service?: string;
  status: string;
  created_at: string;
}

interface ToolUse {
  id: number;
  tool_name: string;
  created_at: string;
}

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [history, setHistory] = useState<ToolUse[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.myBookings().then((d) => setBookings(d as Booking[])).catch(() => {});
    api.toolHistory().then((d) => setHistory(d as ToolUse[])).catch(() => {});
  }, [user]);

  if (loading || !user) return (
    <div style={{ padding: "6rem 2rem", textAlign: "center", fontFamily: "var(--font-arabic)" }}>
      <div className="skeleton" style={{ width: 120, height: 120, borderRadius: "50%", margin: "0 auto 1rem" }} />
      <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 8, margin: "0 auto" }} />
    </div>
  );

  const statusColor = (s: string) => ({ confirmed: "#22c55e", pending: "#f59e0b", cancelled: "#ef4444" }[s] || "var(--ink-mid)");
  const statusLabel = (s: string) => ({ confirmed: "مؤكد", pending: "قيد المراجعة", cancelled: "ملغي" }[s] || s);

  return (
    <div style={{ padding: "4rem 2rem 6rem", maxWidth: 1000, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
      {/* Profile Header */}
      <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent-2), var(--accent))" }} />
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-2), var(--accent))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 800, flexShrink: 0, boxShadow: "0 8px 24px rgba(168,85,247,0.4)" }}>
          {(user.name as string).charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>{user.name as string}</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.9rem" }}>{user.email as string}</p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.2rem 0.6rem" }}>
              {(user.plan as string) || "مجاني"}
            </span>
            {user.is_admin && (
              <Link href="/admin" style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fff", background: "var(--accent)", borderRadius: 99, padding: "0.2rem 0.6rem", textDecoration: "none" }}>
                مشرف
              </Link>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn-primary" style={{ fontSize: "0.88rem", padding: "0.55rem 1.1rem" }}>الأدوات الذكية</Link>
          <button onClick={logout} style={{ padding: "0.55rem 1.1rem", borderRadius: "var(--radius-full)", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontFamily: "var(--font-arabic)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }} className="account-grid-resp">
        {/* Bookings */}
        <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            حجوزاتي
          </h2>
          {bookings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--ink-dim)" }}>
              <p style={{ marginBottom: "1rem" }}>لا توجد حجوزات بعد</p>
              <Link href="/services" className="btn-secondary" style={{ fontSize: "0.85rem" }}>احجز خدمة</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {bookings.map((b) => (
                <div key={b.id} style={{ padding: "1rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{b.service || "خدمة"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>{new Date(b.created_at).toLocaleDateString("ar-SA")}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColor(b.status), background: `${statusColor(b.status)}20`, borderRadius: 99, padding: "0.2rem 0.6rem" }}>{statusLabel(b.status)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tool History */}
        <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M3 3v18h18M7 14l4-4 4 4 6-6"/></svg>
            سجل الأدوات
          </h2>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--ink-dim)" }}>
              <p style={{ marginBottom: "1rem" }}>لم تستخدم أي أداة بعد</p>
              <Link href="/dashboard" className="btn-secondary" style={{ fontSize: "0.85rem" }}>استخدم الأدوات</Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.slice(0, 8).map((h) => (
                <div key={h.id} style={{ padding: "0.75rem 1rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{h.tool_name}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--ink-dim)" }}>{new Date(h.created_at).toLocaleDateString("ar-SA")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width:640px) { .account-grid-resp { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
