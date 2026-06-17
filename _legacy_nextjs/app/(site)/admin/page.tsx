"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface DashboardStats {
  users?: number;
  bookings?: number;
  tool_uses?: number;
  coupons?: number;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({});
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string; is_admin: boolean; plan: string; created_at: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !user.is_admin) { router.replace("/"); return; }
    api.admin.dashboard().then((d) => setStats(d as DashboardStats)).catch(() => {});
    api.admin.users().then((d) => setUsers(d as typeof users)).catch(() => {});
  }, [user, loading, router]);

  if (loading) return <div style={{ padding: "6rem 2rem", textAlign: "center" }}>جاري التحميل...</div>;
  if (!user?.is_admin) return null;

  const toggleAdmin = async (id: number) => {
    setBusy(true);
    await api.admin.toggleAdmin(id).catch(() => {});
    api.admin.users().then((d) => setUsers(d as typeof users)).catch(() => {});
    setBusy(false);
  };

  const deleteUser = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    setBusy(true);
    await api.admin.deleteUser(id).catch(() => {});
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setBusy(false);
  };

  const STAT_CARDS = [
    { label: "إجمالي المستخدمين", value: stats.users ?? 0, icon: "👥", color: "var(--accent)" },
    { label: "الحجوزات", value: stats.bookings ?? 0, icon: "📅", color: "var(--gold)" },
    { label: "استخدام الأدوات", value: stats.tool_uses ?? 0, icon: "🔧", color: "#22c55e" },
    { label: "الكوبونات", value: stats.coupons ?? 0, icon: "🎟️", color: "#ec4899" },
  ];

  return (
    <div style={{ padding: "3rem 2rem 6rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>لوحة الإدارة</h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.88rem" }}>إدارة المستخدمين والمحتوى والإعدادات</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/dashboard" className="btn-secondary" style={{ fontSize: "0.88rem" }}>الأدوات</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }} className="admin-stats-grid">
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "2rem" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-dim)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>المستخدمون ({users.length})</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                {["الاسم", "البريد", "الباقة", "الصلاحية", "الإجراءات"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-mid)", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.85rem 1rem", fontWeight: 600, fontSize: "0.88rem" }}>{u.name}</td>
                  <td style={{ padding: "0.85rem 1rem", color: "var(--ink-dim)", fontSize: "0.85rem" }}>{u.email}</td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.15rem 0.5rem" }}>{u.plan || "مجاني"}</span>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: u.is_admin ? "#22c55e" : "var(--ink-dim)", background: u.is_admin ? "rgba(34,197,94,0.1)" : "var(--bg)", border: `1px solid ${u.is_admin ? "rgba(34,197,94,0.3)" : "var(--line)"}`, borderRadius: 99, padding: "0.15rem 0.5rem" }}>
                      {u.is_admin ? "مشرف" : "مستخدم"}
                    </span>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => toggleAdmin(u.id)} disabled={busy} style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--line-strong)", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-arabic)", fontSize: "0.78rem", cursor: "pointer" }}>
                        {u.is_admin ? "إزالة صلاحية" : "ترقية"}
                      </button>
                      {u.id !== user.id && (
                        <button onClick={() => deleteUser(u.id)} disabled={busy} style={{ padding: "0.35rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontFamily: "var(--font-arabic)", fontSize: "0.78rem", cursor: "pointer" }}>
                          حذف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@media (max-width:900px) { .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  );
}
