"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Moon, Sun, Menu, X, User, LogOut, Settings } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/tools", label: "الأدوات" },
  { href: "/coupons", label: "الكوبونات" },
  { href: "/calendar", label: "المواسم" },
  { href: "/works", label: "أعمالنا" },
  { href: "/services", label: "الخدمات" },
  { href: "/blog", label: "المدونة" },
  { href: "/about", label: "عن المنصة" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[var(--ink)] no-underline font-bold">
      <svg width="22" height="31" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,4 93,30 93,110 50,136 7,110 7,30" fill="#a855f7" />
        <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="7,30 50,4 50,70 7,70" />
        <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="50,70 93,70 93,110 50,136" />
      </svg>
      <span style={{ color: "var(--ink)" }}>أدوات التاجر</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tajer-theme") || "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tajer-theme", next);
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      <nav
        className={`site-nav ${scrolled ? "scrolled" : ""}`}
        style={{ fontFamily: "var(--font-arabic)" }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "68px",
          }}
        >
          <Logo />

          {/* Desktop nav links */}
          <ul
            className="hidden lg:flex items-center gap-1 list-none m-0 p-0"
          >
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: isActive(link.href) ? "var(--accent)" : "var(--ink-dim)",
                    background: isActive(link.href) ? "var(--accent-soft)" : "transparent",
                    textDecoration: "none",
                    transition: "all var(--transition)",
                    display: "block",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(link.href)) {
                      (e.target as HTMLElement).style.color = "var(--ink)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(link.href)) {
                      (e.target as HTMLElement).style.color = "var(--ink-dim)";
                    }
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: 36, height: 36, borderRadius: "var(--radius-full)",
                background: "var(--bg-card)", border: "1px solid var(--line-strong)",
                color: "var(--ink-dim)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all var(--transition)",
              }}
              aria-label="تبديل الوضع"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Auth */}
            {user ? (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.4rem 0.9rem 0.4rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--bg-card)", border: "1px solid var(--line-strong)",
                    color: "var(--ink)", cursor: "pointer",
                    fontSize: "0.88rem", fontWeight: 600,
                    fontFamily: "var(--font-arabic)",
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--accent)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
                  }}>
                    {(user.name as string).charAt(0)}
                  </span>
                  {user.name as string}
                </button>
                {userMenuOpen && (
                  <div
                    style={{
                      position: "absolute", top: "calc(100% + 8px)", left: 0,
                      background: "var(--bg-elevated)", border: "1px solid var(--line-strong)",
                      borderRadius: "var(--radius-md)", padding: "0.5rem",
                      minWidth: 180, zIndex: 200,
                      boxShadow: "var(--shadow-lg)",
                    }}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Link
                      href={user.is_admin ? "/admin" : "/account"}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)",
                        color: "var(--ink)", textDecoration: "none", fontSize: "0.88rem",
                      }}
                    >
                      <User size={14} /> {user.is_admin ? "لوحة الإدارة" : "حسابي"}
                    </Link>
                    <Link
                      href="/dashboard"
                      style={{
                        display: "flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)",
                        color: "var(--ink)", textDecoration: "none", fontSize: "0.88rem",
                      }}
                    >
                      <Settings size={14} /> الأدوات الذكية
                    </Link>
                    <div style={{ height: 1, background: "var(--line)", margin: "0.25rem 0" }} />
                    <button
                      onClick={logout}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "0.6rem",
                        padding: "0.6rem 0.8rem", borderRadius: "var(--radius-sm)",
                        color: "#f43f5e", background: "none", border: "none",
                        cursor: "pointer", fontSize: "0.88rem", textAlign: "right",
                        fontFamily: "var(--font-arabic)",
                      }}
                    >
                      <LogOut size={14} /> تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link href="/login" style={{
                  padding: "0.45rem 1rem", borderRadius: "var(--radius-full)",
                  border: "1px solid var(--line-strong)", color: "var(--ink)",
                  textDecoration: "none", fontSize: "0.88rem", fontWeight: 600,
                  transition: "all var(--transition)",
                }}>
                  تسجيل الدخول
                </Link>
                <Link href="/services" style={{
                  padding: "0.45rem 1.1rem", borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)",
                  color: "#fff", textDecoration: "none", fontSize: "0.88rem", fontWeight: 700,
                  boxShadow: "0 3px 12px rgba(168,85,247,0.35)",
                }}>
                  احجز استشارة
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                width: 36, height: 36, borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)", border: "1px solid var(--line)",
                color: "var(--ink)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{
            background: "var(--bg-card)", borderTop: "1px solid var(--line)",
            padding: "1rem 2rem 1.5rem",
          }}>
            <ul className="list-none m-0 p-0 space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    style={{
                      display: "block", padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      color: isActive(link.href) ? "var(--accent)" : "var(--ink-dim)",
                      background: isActive(link.href) ? "var(--accent-soft)" : "transparent",
                      textDecoration: "none", fontWeight: 600,
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--line)", marginTop: "0.5rem" }}>
                {user ? (
                  <button onClick={logout} style={{
                    color: "#f43f5e", background: "none", border: "none",
                    cursor: "pointer", fontFamily: "var(--font-arabic)", fontWeight: 600,
                    fontSize: "0.95rem", padding: "0.65rem 0.85rem",
                  }}>
                    تسجيل الخروج
                  </button>
                ) : (
                  <Link href="/login" style={{
                    display: "block", padding: "0.65rem 0.85rem",
                    color: "var(--accent)", fontWeight: 700, textDecoration: "none",
                  }}>
                    تسجيل الدخول / إنشاء حساب
                  </Link>
                )}
              </li>
            </ul>
          </div>
        )}
      </nav>
      {/* Spacer for fixed nav */}
      <div style={{ height: 68 }} />
    </>
  );
}
