import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "عن أدوات التاجر | من نحن",
  description: "تعرّف على منصة أدوات التاجر — المنصة العربية للتجار السعوديين",
};

const VALUES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>,
    title: "الجودة أولاً",
    desc: "كل أداة وخدمة نقدمها تمر بمعايير جودة صارمة قبل أن تصل إليك.",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    title: "مبني للتاجر السعودي",
    desc: "نفهم السوق السعودي ونبني أدوات تناسب احتياجاته الحقيقية، لا ترجمة من أدوات أجنبية.",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    title: "بسيط وفعّال",
    desc: "لا تعقيد، لا منحنى تعلم طويل. كل أداة تعطيك نتائج في ثوانٍ.",
  },
];

const TIMELINE = [
  { date: "2024", title: "البداية", desc: "انطلاق فكرة المنصة من ملاحظة الحاجة الحقيقية لأدوات عربية تخدم التاجر السعودي." },
  { date: "مارس 2025", title: "الإطلاق الأول", desc: "إطلاق أول 3 أدوات: محلل المتجر، مولّد الأوصاف، وحاسبة الربح." },
  { date: "يونيو 2025", title: "التوسع", desc: "إضافة 7 أدوات جديدة وإطلاق قسم الكوبونات وتقويم المواسم." },
  { date: "2026", title: "الحاضر", desc: "10 أدوات، مئات التجار، وخدمات احترافية متكاملة تخدم السوق السعودي." },
];

export default function AboutPage() {
  return (
    <>
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            قصتنا
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            مبنية <em style={{ fontStyle: "normal", color: "var(--accent)" }}>للتاجر السعودي،</em><br />من فهم حقيقي للسوق
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 650, lineHeight: 1.7 }}>
            أدوات التاجر هي محاولة جادة لخدمة كل تاجر سعودي يبني علامته التجارية أونلاين، بأدوات حقيقية تعطي قيمة فورية وبدون تعقيد.
          </p>
        </div>
      </section>

      <section style={{ padding: "4rem 2rem", maxWidth: 1000, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        {/* Mission */}
        <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "3rem", marginBottom: "2rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent 0%, var(--line-accent) 40%, var(--accent) 50%, var(--line-accent) 60%, transparent 100%)" }} />
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>مهمتنا <em style={{ fontStyle: "normal", color: "var(--accent)" }}>الأساسية</em></h2>
          <p style={{ color: "var(--ink)", lineHeight: 1.9, fontSize: "1.05rem", marginBottom: "1.2rem" }}>
            تجار السوق السعودي يقضون ساعات يومياً في مهام متكررة: تحليل المتجر، حساب الأرباح، كتابة أوصاف، التخطيط للمواسم. كل هذي مهام يفترض تكون أسهل بكثير.
          </p>
          <p style={{ color: "var(--ink)", lineHeight: 1.9, fontSize: "1.05rem", marginBottom: "1.2rem" }}>
            نحن وُجدنا عشان نختصر هذي الفجوة. منصة واحدة تجمع كل الأدوات اللي يحتاجها التاجر، مع كوبونات حصرية على أهم الخدمات، وفريق احترافي جاهز للتنفيذ لما تحتاج.
          </p>
          <p style={{ color: "var(--ink)", lineHeight: 1.9, fontSize: "1.05rem" }}>
            كل أداة في المنصة مبنية بناءً على فهم عميق لسوقنا السعودي، مو نسخة مترجمة من أدوات أجنبية ما تناسبنا.
          </p>
        </div>

        {/* Values */}
        <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "3rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>قيمنا <em style={{ fontStyle: "normal", color: "var(--accent)" }}>اللي نشتغل عليها</em></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="values-grid-resp">
            {VALUES.map((v, i) => (
              <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "1.5rem", transition: "all var(--transition)" }} className="value-item">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-soft)", border: "1px solid var(--line-accent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", transition: "all var(--transition)" }}>
                  {v.icon}
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>{v.title}</h3>
                <p style={{ color: "var(--ink-dim)", fontSize: "0.92rem", lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "3rem", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>رحلتنا <em style={{ fontStyle: "normal", color: "var(--accent)" }}>حتى اليوم</em></h2>
          <div style={{ position: "relative", paddingRight: "2rem" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, right: 8, width: 2, background: "linear-gradient(180deg, var(--accent) 0%, var(--line-strong) 100%)" }} />
            {TIMELINE.map((item, i) => (
              <div key={i} style={{ position: "relative", paddingBottom: i < TIMELINE.length - 1 ? "2rem" : 0 }}>
                <div style={{ position: "absolute", right: "-2rem", top: "0.3rem", width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", boxShadow: "0 0 0 4px var(--bg-alt), 0 4px 12px rgba(168,85,247,0.3)" }} />
                <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: "0.3rem", fontSize: "0.85rem", letterSpacing: "0.05em" }}>{item.date}</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>{item.title}</h3>
                <p style={{ color: "var(--ink-dim)", fontSize: "0.95rem", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>تواصل <em style={{ fontStyle: "normal", color: "var(--accent)" }}>معنا</em></h2>
          <p style={{ color: "var(--ink-dim)", marginBottom: "2rem" }}>نرحب بأي استفسار أو ملاحظة</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="contact-grid-resp">
            {[
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, title: "البريد الإلكتروني", value: "info@adwat-altajer.com" },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>, title: "واتساب", value: "+966 50 000 0000" },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>, title: "تويتر / X", value: "@adwat_altajer" },
            ].map((c, i) => (
              <div key={i} style={{ textAlign: "center", padding: "1.5rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", transition: "all var(--transition)" }} className="contact-item">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", color: "#fff", margin: "0 auto 1rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(168,85,247,0.3)" }}>{c.icon}</div>
                <h4 style={{ fontWeight: 700, marginBottom: "0.3rem" }}>{c.title}</h4>
                <span style={{ color: "var(--accent)", fontSize: "0.88rem" }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width:768px) { .values-grid-resp { grid-template-columns: 1fr !important; } .contact-grid-resp { grid-template-columns: 1fr !important; } }
        .value-item:hover { border-color: var(--line-accent) !important; transform: translateY(-3px) !important; box-shadow: 0 8px 24px rgba(168,85,247,0.1) !important; }
        .contact-item:hover { border-color: var(--line-accent) !important; transform: translateY(-3px) !important; box-shadow: 0 8px 24px rgba(168,85,247,0.1) !important; }
      `}</style>
    </>
  );
}
