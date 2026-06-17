"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");

  useEffect(() => {
    if (user) router.replace(user.is_admin ? "/admin" : "/");
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(loginEmail, loginPass);
    } catch (err: unknown) {
      setError((err as Error).message || "خطأ في تسجيل الدخول");
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(regName, regEmail, regPass);
    } catch (err: unknown) {
      setError((err as Error).message || "خطأ في إنشاء الحساب");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--bg)", position: "relative", fontFamily: "var(--font-arabic)" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 70% 20%, rgba(168,85,247,0.18) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(79,70,229,0.1) 0%, transparent 50%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 460, background: "var(--bg-alt)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-lg)", padding: "3rem", position: "relative", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent-2) 0%, var(--accent) 50%, var(--accent-3) 100%)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "2.5rem", textDecoration: "none" }}>
          <svg width="36" height="50" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,4 93,30 93,110 50,136 7,110 7,30" fill="#a855f7" />
            <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="7,30 50,4 50,70 7,70" />
            <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="50,70 93,70 93,110 50,136" />
          </svg>
          <div>
            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "1rem" }}>أدوات التاجر</div>
            <div style={{ fontSize: "0.68rem", color: "var(--ink-dim)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Tajer Tools</div>
          </div>
        </Link>

        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: 4, marginBottom: "2rem", border: "1px solid var(--line)" }}>
          {(["login", "register"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); }} style={{ flex: 1, padding: "0.65rem", textAlign: "center", fontFamily: "var(--font-arabic)", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", borderRadius: "calc(var(--radius-sm) - 2px)", transition: "all var(--transition)", color: tab === t ? "#fff" : "var(--ink-dim)", border: "none", background: tab === t ? "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)" : "none", boxShadow: tab === t ? "0 2px 12px rgba(168,85,247,0.35)" : "none" }}>
              {t === "login" ? "تسجيل الدخول" : "حساب جديد"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "0.8rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>البريد الإلكتروني</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="example@email.com" required autoComplete="email" className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>كلمة المرور</label>
              <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" required autoComplete="current-password" className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={busy} style={{ width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-arabic)", fontSize: "1rem", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, boxShadow: "0 4px 16px rgba(168,85,247,0.3)", marginTop: "0.5rem" }}>
              {busy ? "جاري الدخول..." : "دخول"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>الاسم الكامل</label>
              <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="محمد العتيبي" required className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>البريد الإلكتروني</label>
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="example@email.com" required autoComplete="email" className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>كلمة المرور <span style={{ color: "var(--ink-dim)", fontSize: "0.75rem" }}>(8 أحرف على الأقل)</span></label>
              <input type="password" value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={busy} style={{ width: "100%", padding: "0.9rem", background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-arabic)", fontSize: "1rem", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, boxShadow: "0 4px 16px rgba(168,85,247,0.3)", marginTop: "0.5rem" }}>
              {busy ? "جاري الإنشاء..." : "إنشاء حساب"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.85rem" }}>← العودة للرئيسية</Link>
        </div>
      </div>
    </div>
  );
}
