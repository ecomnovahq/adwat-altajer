import Link from "next/link";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import HomeStats from "@/components/HomeStats";
import { HomeWorks, HomeReviews } from "@/components/HomeWorksReviews";

const TOOLS = [
  { href: "/dashboard/tools/store-analyzer", name: "محلل المتجر", desc: "تحليل شامل لمتجرك على سلة أو زد — نقاط القوة والضعف والتوصيات", tag: "AI مدعوم", gold: false, icon: "M3 3v18h18M7 14l4-4 4 4 6-6" },
  { href: "/dashboard/tools/product-description", name: "مولّد الأوصاف", desc: "أوصاف منتجات احترافية في ثوانٍ — مُحسَّنة للبيع والسيو", tag: "AI مدعوم", gold: false, icon: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" },
  { href: "/dashboard/tools/competitor-analyzer", name: "تحليل المنافسين", desc: "قارن متجرك بمنافسيك واكتشف الفجوات والفرص", tag: "AI مدعوم", gold: false, icon: "M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" },
  { href: "/dashboard/tools/social-plan", name: "خطة سوشيال", desc: "خطة محتوى أسبوعية جاهزة على كل المنصات", tag: "مجاني", gold: true, icon: "M2 3h20v14H2zM8 21h8M12 17v4" },
  { href: "/dashboard/tools/whatsapp-templates", name: "ردود واتساب", desc: "ردود احترافية جاهزة للعملاء بنبرة متجرك", tag: "مجاني", gold: true, icon: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" },
  { href: "/dashboard/tools/store-policies", name: "سياسات المتجر", desc: "سياسة الإرجاع والشحن والخصوصية بنقرة واحدة", tag: "AI مدعوم", gold: false, icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8" },
];

const PLATFORMS = [
  { name: "سلة", color: "#6366f1" }, { name: "زد", color: "#22c55e" },
  { name: "شيبو", color: "#f59e0b" }, { name: "بايدو", color: "#3b82f6" },
  { name: "إكسباي", color: "#ec4899" }, { name: "هايد باي", color: "#a855f7" },
  { name: "مكان", color: "#10b981" }, { name: "ماي فاتورة", color: "#f97316" },
  { name: "تاب", color: "#8b5cf6" }, { name: "إكسباندكارت", color: "#06b6d4" },
];

export default function HomePage() {
  const doubled = [...PLATFORMS, ...PLATFORMS];

  return (
    <>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "8rem 2rem 5rem", textAlign: "center", position: "relative", overflow: "hidden", fontFamily: "var(--font-arabic)" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(168,85,247,0.2) 0%, transparent 68%)", top: "40%", left: "50%", transform: "translate(-50%, -55%)", filter: "blur(50px)" }} />
          <div style={{ position: "absolute", width: 500, height: 400, background: "radial-gradient(ellipse, rgba(234,179,8,0.12) 0%, transparent 65%)", top: "70%", left: "35%", transform: "translate(-50%, -50%)", filter: "blur(65px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(168,85,247,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.05) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 80%)" }} />
        </div>

        {/* Floating cards — hidden on mobile via CSS */}
        <div className="hero-float-card" style={{ position: "absolute", bottom: "22%", right: "3%", zIndex: 3, background: "var(--bg-elevated)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", padding: "0.85rem 1.1rem", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", backdropFilter: "blur(16px)", animation: "heroFloat 4s ease-in-out infinite" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--gold-soft)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12V22H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div><div>كوبون خصم نشط</div><div style={{ fontSize: "0.7rem", color: "var(--ink-dim)", fontWeight: 400 }}>+500 كوبون على سلة وزد</div></div>
        </div>

        <div className="hero-float-card" style={{ position: "absolute", top: "30%", left: "3%", zIndex: 3, background: "var(--bg-elevated)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-md)", padding: "0.85rem 1.1rem", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)", backdropFilter: "blur(16px)", animation: "heroFloat 4s 1.8s ease-in-out infinite" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18M7 14l4-4 4 4 6-6"/></svg>
          </div>
          <div><div>محلل ذكي</div><div style={{ fontSize: "0.7rem", color: "var(--ink-dim)", fontWeight: 400 }}>تقرير متجرك في ثوانٍ</div></div>
        </div>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 880, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", padding: "0.42rem 1.1rem", borderRadius: "var(--radius-full)", border: "1px solid var(--line-accent)", background: "var(--accent-soft)", fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", marginBottom: "2.25rem", animation: "heroFadeUp 0.7s 0.15s ease both" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "heroPulse 2s infinite" }} />
            منصة مبنية خصيصاً للسوق السعودي
          </div>

          <h1 style={{ fontSize: "clamp(2.8rem, 8vw, 5.8rem)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.04em", marginBottom: "1.5rem", color: "var(--ink)", animation: "heroFadeUp 0.8s 0.3s ease both" }}>
            كل ما يحتاجه<br />
            <span style={{ background: "linear-gradient(135deg, var(--accent-3) 0%, var(--accent) 60%, var(--accent-2) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>التاجر السعودي</span><br />
            في <span style={{ background: "linear-gradient(135deg, #fcd34d 0%, var(--gold) 60%, #d97706 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>مكان واحد.</span>
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.18rem)", color: "var(--ink-dim)", lineHeight: 1.85, maxWidth: 560, margin: "0 auto 2.5rem", animation: "heroFadeUp 0.8s 0.45s ease both" }}>
            أدوات تحليل ذكية، كوبونات حصرية، تقويم المواسم، وفريق متخصص ينفّذ لك. كل شي تحتاجه لمتجرك، بدون تعقيد.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", animation: "heroFadeUp 0.8s 0.6s ease both" }}>
            <Link href="/tools" className="btn-primary" style={{ padding: "0.9rem 2.2rem", fontSize: "1rem" }}>ابدأ بالأدوات مجاناً ←</Link>
            <Link href="/coupons" className="btn-secondary" style={{ padding: "0.9rem 2rem" }}>شوف الكوبونات</Link>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap", marginTop: "3.5rem", paddingTop: "2.5rem", borderTop: "1px solid var(--line)", animation: "heroFadeUp 0.8s 0.75s ease both" }}>
            {[
              { num: "+500", label: "كوبون نشط", gold: false },
              { num: "10", label: "أداة ذكية", gold: true },
              { num: "100%", label: "مجاني للبدء", gold: false },
              { num: "+200", label: "مشروع منجز", gold: true },
            ].map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "var(--ink-dim)" }}>
                <span style={{ fontWeight: 800, fontSize: "1.1rem", color: p.gold ? "var(--gold)" : "var(--accent)" }}>{p.num}</span>
                <span>{p.label}</span>
                {i < 3 && <span style={{ width: 1, height: 24, background: "var(--line)", marginRight: "0.5rem", display: "inline-block" }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ── */}
      <div style={{ padding: "2.5rem 2rem", background: "var(--bg-card)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", overflow: "hidden", position: "relative", fontFamily: "var(--font-arabic)" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 120, background: "linear-gradient(to left, var(--bg-card), transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 120, background: "linear-gradient(to right, var(--bg-card), transparent)", zIndex: 2, pointerEvents: "none" }} />
        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--ink-mid)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "1.5rem" }}>منصات وخدمات مدعومة</p>
        <div style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", gap: "3rem", alignItems: "center", animation: "platformScroll 22s linear infinite", width: "max-content" }}>
            {doubled.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.9rem", fontWeight: 700, color: "var(--ink-dim)", whiteSpace: "nowrap", padding: "0.5rem 1.25rem", border: "1px solid var(--line)", borderRadius: "var(--radius-full)", background: "var(--bg-alt)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLS ── */}
      <section style={{ padding: "7rem 2rem", background: "var(--bg-alt)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="section-eyebrow">الأدوات الذكية</div>
          <h2 className="section-title">أدوات بنيناها<br /><em>لمشاكل حقيقية</em></h2>
          <p style={{ color: "var(--ink-dim)", maxWidth: 480, marginTop: "0.5rem", fontSize: "0.95rem", marginBottom: "3rem" }}>كل أداة صُممت بناءً على احتياجات التجار — بدون تسجيل، بدون تعقيد.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.2rem" }} className="tools-grid-responsive">
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href} className="tool-card-link" style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.6rem", display: "flex", alignItems: "flex-start", gap: "1rem", textDecoration: "none", color: "inherit", transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
                <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: "var(--radius-md)", background: t.gold ? "var(--gold-soft)" : "var(--accent-soft)", border: `1px solid ${t.gold ? "rgba(234,179,8,0.28)" : "var(--line-accent)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.gold ? "var(--gold)" : "var(--accent)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.icon}/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.93rem", marginBottom: "0.3rem" }}>{t.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-dim)", lineHeight: 1.65 }}>{t.desc}</div>
                  <span style={{ display: "inline-block", marginTop: "0.55rem", fontSize: "0.65rem", fontWeight: 700, color: t.gold ? "var(--gold)" : "var(--accent)", background: t.gold ? "var(--gold-soft)" : "var(--accent-soft)", border: `1px solid ${t.gold ? "rgba(234,179,8,0.25)" : "var(--line-accent)"}`, borderRadius: 99, padding: "0.15rem 0.5rem" }}>{t.tag}</span>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            <Link href="/tools" className="btn-secondary">عرض كل الأدوات ←</Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "7rem 2rem", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>خطوات بسيطة</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>كيف تعمل <em>المنصة؟</em></h2>
            <p style={{ color: "var(--ink-dim)", maxWidth: 460, margin: "0.5rem auto 0", fontSize: "0.95rem" }}>ثلاث خطوات وتبدأ تستفيد من كل أدوات التاجر</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="how-grid-responsive">
            {[
              { num: "١", title: "سجّل أو ابدأ بدون تسجيل", desc: "بعض الأدوات مفتوحة للجميع بدون حساب. سجّل مجاناً للحصول على ميزات إضافية.", gold: false },
              { num: "٢", title: "اختر الأداة اللي تحتاجها", desc: "من محلل المتجر إلى مولّد الأوصاف إلى خطة سوشيال — كل شي في مكان واحد.", gold: true },
              { num: "٣", title: "احصل على النتائج فوراً", desc: "تقارير وتوصيات احترافية خلال ثوانٍ. انسخها، طبّقها، وشوف الفرق في متجرك.", gold: false },
            ].map((s, i) => (
              <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "2rem 1.75rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.gold ? "linear-gradient(135deg, #d97706, var(--gold))" : "linear-gradient(135deg, var(--accent-2), var(--accent))", color: "#fff", fontWeight: 800, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", boxShadow: s.gold ? "0 4px 16px rgba(234,179,8,0.35)" : "0 4px 16px rgba(168,85,247,0.4)" }}>{s.num}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h3>
                <p style={{ fontSize: "0.83rem", color: "var(--ink-dim)", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS (Client Component) ── */}
      <section style={{ padding: "7rem 2rem", background: "var(--bg-alt)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>أرقام حقيقية</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>نتائج <em>تتكلم</em> عن نفسها</h2>
          </div>
          <Suspense fallback={<div className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)", marginTop: "4rem" }} />}>
            <HomeStats />
          </Suspense>

          <div style={{ marginTop: "4rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 80, background: "linear-gradient(to left, var(--bg-alt), transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 80, background: "linear-gradient(to right, var(--bg-alt), transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ display: "flex", gap: "3rem", animation: "ticker 24s linear infinite", width: "max-content" }}>
              {["محلل المتجر","كوبونات سلة","سيو المنتجات","كوبونات زد","خطة سوشيال","رمضان","اليوم الوطني","بلاك فرايدي","تحليل المنافسين","ردود واتساب","محلل المتجر","كوبونات سلة","سيو المنتجات","كوبونات زد","خطة سوشيال","رمضان","اليوم الوطني","بلاك فرايدي","تحليل المنافسين","ردود واتساب"].map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.7rem", fontSize: "0.85rem", color: "var(--ink-dim)", whiteSpace: "nowrap" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: i % 2 === 0 ? "var(--accent)" : "var(--gold)", flexShrink: 0 }} />{item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKS (Client Component) ── */}
      <section style={{ padding: "7rem 2rem", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <div>
              <div className="section-eyebrow">معرض الأعمال</div>
              <h2 className="section-title" style={{ marginBottom: 0 }}>أعمال <em>نفتخر</em> بها</h2>
            </div>
            <Link href="/works" className="btn-secondary">عرض الكل ←</Link>
          </div>
          <Suspense fallback={<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem", marginTop: "3rem" }}>{[0,1,2].map(i=><div key={i} className="skeleton" style={{height:300,borderRadius:"var(--radius-lg)"}}/>)}</div>}>
            <HomeWorks />
          </Suspense>
        </div>
      </section>

      {/* ── REVIEWS (Client Component) ── */}
      <section style={{ padding: "7rem 2rem", background: "var(--bg-alt)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>آراء العملاء</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>ماذا يقول <em>عملاؤنا</em></h2>
          </div>
          <Suspense fallback={<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25rem", marginTop: "3rem" }}>{[0,1,2].map(i=><div key={i} className="skeleton" style={{height:220,borderRadius:"var(--radius-lg)"}}/>)}</div>}>
            <HomeReviews />
          </Suspense>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "7rem 2rem", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ border: "1px solid var(--line-accent)", borderRadius: "var(--radius-xl)", padding: "5rem 3rem", textAlign: "center", position: "relative", overflow: "hidden", background: "linear-gradient(150deg, rgba(168,85,247,0.07) 0%, rgba(8,6,15,0) 60%)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--accent-2) 30%, var(--accent) 50%, var(--accent-3) 70%, transparent)" }} />
            <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", filter: "blur(60px)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="section-eyebrow" style={{ justifyContent: "center", marginBottom: "1.25rem" }}>ابدأ اليوم</div>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: "1.25rem" }}>
                جاهز تنمّي<br />
                <span style={{ background: "linear-gradient(135deg, #fbbf24, var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>متجرك؟</span>
              </h2>
              <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 500, margin: "0 auto 2.5rem" }}>انضم لمئات التجار اللي يستخدمون أدوات التاجر يومياً. مجاني للبدء، بدون بيانات بنك.</p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/tools" className="btn-primary" style={{ padding: "1rem 2.5rem", fontSize: "1.05rem" }}>ابدأ مجاناً الآن</Link>
                <Link href="/services" className="btn-secondary" style={{ padding: "1rem 2rem" }}>احجز استشارة</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes heroFloat { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-10px) rotate(0.5deg)} }
        @keyframes heroFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes heroPulse { 0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,0.6)} 50%{box-shadow:0 0 0 5px rgba(168,85,247,0)} }
        @keyframes platformScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @media (max-width:768px) { .hero-float-card { display:none !important; } }
        @media (max-width:900px) {
          .tools-grid-responsive { grid-template-columns: repeat(2,1fr) !important; }
          .how-grid-responsive { grid-template-columns: 1fr !important; }
          .works-grid-responsive { grid-template-columns: repeat(2,1fr) !important; }
          .reviews-grid-responsive { grid-template-columns: repeat(2,1fr) !important; }
          .stats-grid-responsive { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width:580px) {
          .tools-grid-responsive { grid-template-columns: 1fr !important; }
          .works-grid-responsive { grid-template-columns: 1fr !important; }
          .reviews-grid-responsive { grid-template-columns: 1fr !important; }
        }
        .tool-card-link:hover { border-color: var(--line-accent) !important; transform: translateY(-5px) scale(1.01) !important; box-shadow: 0 20px 56px rgba(168,85,247,0.16) !important; }
      `}</style>

      <Footer />
      <ChatWidget />
    </>
  );
}
