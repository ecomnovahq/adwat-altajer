import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الأدوات الذكية | أدوات التاجر",
  description: "10 أدوات ذكية مدعومة بالذكاء الاصطناعي للتاجر السعودي",
};

const TOOLS = [
  {
    num: "01", href: "/dashboard/tools/store-analyzer",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/></svg>,
    title: "محلل المتجر الذكي",
    desc: "تحليل شامل لمتجرك على سلة أو زد — نقاط القوة والضعف والتوصيات فوراً. يساعدك تعرف وين تتحسن بدقة.",
    tag: "AI مدعوم", gold: false,
  },
  {
    num: "02", href: "/dashboard/tools/product-description",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    title: "مولّد أوصاف المنتجات",
    desc: "أوصاف منتجات احترافية في ثوانٍ — مُحسَّنة للبيع والسيو. بالعربي، بنبرة متجرك.",
    tag: "AI مدعوم", gold: false,
  },
  {
    num: "03", href: "/dashboard/tools/competitor-analyzer",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    title: "تحليل المنافسين",
    desc: "قارن متجرك بمنافسيك واكتشف الفجوات والفرص. اعرف وين تتميز وكيف تكسب أكثر.",
    tag: "AI مدعوم", gold: false,
  },
  {
    num: "04", href: "/dashboard/tools/social-plan",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    title: "خطة السوشيال ميديا",
    desc: "خطة محتوى أسبوعية جاهزة على إنستقرام وتويتر وسناب. بالعربي، مناسبة لمتجرك.",
    tag: "مجاني", gold: true,
  },
  {
    num: "05", href: "/dashboard/tools/whatsapp-templates",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
    title: "ردود واتساب الجاهزة",
    desc: "ردود احترافية جاهزة للعملاء — استفسارات، شكاوي، طلبات. بنبرة متجرك، محترمة وفعّالة.",
    tag: "مجاني", gold: true,
  },
  {
    num: "06", href: "/dashboard/tools/store-policies",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    title: "سياسات المتجر",
    desc: "سياسة الإرجاع والاستبدال والشحن والخصوصية — مكتوبة بشكل احترافي وقانوني صحيح.",
    tag: "AI مدعوم", gold: false,
  },
  {
    num: "07", href: "/dashboard/tools/profit-calculator",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    title: "حاسبة الربح الذكية",
    desc: "احسب هامش ربحك الحقيقي — تكلفة، شحن، عمولة المنصة، ضريبة. اعرف رقمك الصحيح.",
    tag: "مجاني", gold: true,
  },
  {
    num: "08", href: "/dashboard/tools/product-images",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    title: "مولّد صور المنتجات",
    desc: "صور منتجات احترافية بالذكاء الاصطناعي — بخلفيات مخصصة لمتجرك وبأسلوب سعودي.",
    tag: "AI مدعوم", gold: false,
  },
  {
    num: "09", href: "/dashboard/tools/seasons-calendar",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    title: "تقويم المواسم التجارية",
    desc: "تقويم شامل لكل المواسم والمناسبات السعودية — رمضان، اليوم الوطني، بلاك فرايدي وأكثر.",
    tag: "مجاني", gold: true,
  },
  {
    num: "10", href: "/dashboard/tools/launch-campaign",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
    title: "حملة الإطلاق الموسمية",
    desc: "خطة حملة تسويقية كاملة لمواسمك — رسائل، عروض، جدول نشر. كل شي جاهز للتنفيذ.",
    tag: "AI مدعوم", gold: false,
  },
];

export default function ToolsPage() {
  return (
    <>
      {/* Page Header */}
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            10 أدوات متاحة
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            أدوات <em style={{ fontStyle: "normal", color: "var(--accent)" }}>التاجر</em> الذكية
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 600, lineHeight: 1.7 }}>
            أدوات ذكية مبنية لتاجر السوق السعودي. حلل متجرك، احسب أرباحك، ولّد محتوى، خطط لمواسمك. كل شي في مكان واحد.
          </p>
        </div>
      </section>

      <section style={{ padding: "4rem 2rem 6rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2rem" }} className="tools-page-grid">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2.5rem", position: "relative", overflow: "hidden", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", textDecoration: "none", color: "var(--ink)", display: "block" }}
              className="tool-page-card"
            >
              <div style={{ fontSize: "0.78rem", color: "var(--ink-dim)", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", letterSpacing: "0.06em" }}>
                <span style={{ width: 18, height: 1, background: "currentColor", flexShrink: 0, display: "inline-block" }} />
                أداة {t.num}
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--bg)", border: "1px solid var(--line-strong)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: t.gold ? "var(--gold)" : "var(--accent)", transition: "all var(--transition)" }}>
                {t.icon}
              </div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.8rem", lineHeight: 1.2 }}>{t.title}</h3>
              <p style={{ color: "var(--ink-dim)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>{t.desc}</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: t.gold ? "var(--gold)" : "var(--accent)", background: t.gold ? "var(--gold-soft)" : "var(--accent-soft)", border: `1px solid ${t.gold ? "rgba(234,179,8,0.25)" : "var(--line-accent)"}`, borderRadius: 99, padding: "0.2rem 0.6rem" }}>{t.tag}</span>
                <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  ابدأ الآن
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width:768px) { .tools-page-grid { grid-template-columns: 1fr !important; } }
        .tool-page-card:hover { border-color: var(--line-accent) !important; transform: translateY(-5px) !important; box-shadow: 0 20px 50px rgba(168,85,247,0.15) !important; }
        .tool-page-card:hover > div:nth-child(3) { background: linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%) !important; color: #fff !important; transform: rotate(-6deg) scale(1.08) !important; box-shadow: 0 6px 20px rgba(168,85,247,0.35) !important; border-color: var(--accent) !important; }
      `}</style>
    </>
  );
}
