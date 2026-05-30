"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const SERVICES = [
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    title: "تصميم متجر سلة / زد",
    desc: "تصميم متجر إلكتروني احترافي على سلة أو زد — يعكس هويتك ويحول الزوار لعملاء.",
    features: ["تصميم صفحة رئيسية مخصصة", "إعداد الفئات والمنتجات", "ربط بوابات الدفع", "تحسين سرعة المتجر", "شهر دعم مجاني"],
    price: "1,500",
    featured: false,
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    title: "إدارة سوشيال ميديا",
    desc: "إدارة كاملة لحسابات منصاتك — محتوى يومي، تصميم، جدولة، وتفاعل مع متابعيك.",
    features: ["30 منشور شهرياً", "تصميم جرافيك احترافي", "جدولة وإدارة التعليقات", "تقرير شهري للأداء", "استراتيجية محتوى"],
    price: "2,000",
    featured: true,
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
    title: "تحسين محركات البحث (SEO)",
    desc: "اجعل منتجاتك تظهر في أول نتائج جوجل — دراسة كلمات مفتاحية وتحسين تقني شامل.",
    features: ["تحليل كلمات مفتاحية", "تحسين أوصاف المنتجات", "إعداد Sitemap و Schema", "تقرير شهري للترتيب", "تحسين تجربة المستخدم"],
    price: "800",
    featured: false,
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
    title: "هوية بصرية للمتجر",
    desc: "هوية بصرية متكاملة تميزك عن المنافسين — شعار، ألوان، خطوط، وأدلة الاستخدام.",
    features: ["تصميم شعار احترافي", "لوحة ألوان وخطوط", "قوالب منصات التواصل", "دليل استخدام الهوية", "صور للمتجر الإلكتروني"],
    price: "1,200",
    featured: false,
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
    title: "حملات موسمية",
    desc: "حملة تسويقية متكاملة لمواسمك — رمضان، اليوم الوطني، بلاك فرايدي، وأكثر.",
    features: ["استراتيجية الحملة كاملة", "تصميمات جاهزة للنشر", "جدول نشر مفصّل", "كتابة إعلانات مدفوعة", "متابعة وتقرير الأداء"],
    price: "900",
    featured: false,
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    title: "استشارة تجارية",
    desc: "جلسة مع خبير لتقييم وضعك وتحديد أولويات نموك — خطة عمل واضحة وقابلة للتطبيق.",
    features: ["جلسة ساعة كاملة", "تقييم شامل لمتجرك", "خطة عمل مكتوبة", "3 أسئلة متابعة", "توصيات فورية قابلة للتطبيق"],
    price: "350",
    featured: false,
  },
];

export default function ServicesPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.submitBooking({ name, email, phone, service, message });
      setSuccess(true);
      setName(""); setEmail(""); setPhone(""); setService(""); setMessage("");
    } catch (err: unknown) {
      setError((err as Error).message || "حدث خطأ، حاول مرة أخرى");
    }
    setBusy(false);
  };

  return (
    <>
      {/* Header */}
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            خدمات احترافية
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            خدمات <em style={{ fontStyle: "normal", color: "var(--accent)" }}>مخصصة</em> للتاجر السعودي
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 600, lineHeight: 1.7 }}>
            فريق متخصص ينفّذ لك ما تحتاجه — من التصميم إلى التسويق إلى الاستشارة.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section style={{ padding: "4rem 2rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="services-grid-resp">
          {SERVICES.map((s, i) => (
            <div key={i} style={{ background: "var(--bg-alt)", border: `1px solid ${s.featured ? "var(--line-accent)" : "var(--line)"}`, borderRadius: "var(--radius-lg)", padding: "2rem", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", transition: "all var(--transition)", boxShadow: s.featured ? "0 8px 40px rgba(168,85,247,0.12)" : "none" }} className="service-card-resp">
              {s.featured && (
                <>
                  <div style={{ position: "absolute", top: -10, right: "1.5rem", background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", color: "#fff", padding: "0.3rem 0.9rem", borderRadius: "var(--radius-full)", fontSize: "0.7rem", fontWeight: 700, boxShadow: "0 3px 12px rgba(168,85,247,0.4)" }}>الأكثر طلباً</div>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent-2) 0%, var(--accent) 100%)" }} />
                </>
              )}
              <div style={{ width: 56, height: 56, borderRadius: 14, background: s.featured ? "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)" : "var(--bg)", border: "1px solid var(--line-strong)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: s.featured ? "#fff" : "var(--accent)", boxShadow: s.featured ? "0 4px 16px rgba(168,85,247,0.35)" : "none" }}>
                {s.icon}
              </div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.5rem" }}>{s.title}</h3>
              <p style={{ color: "var(--ink-dim)", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: "1.5rem", flex: 1 }}>{s.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: "1.5rem" }}>
                {s.features.map((f, fi) => (
                  <li key={fi} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.4rem 0", fontSize: "0.9rem", color: "var(--ink)" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div style={{ paddingTop: "1.5rem", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>يبدأ من</div>
                  <div style={{ fontWeight: 800, fontSize: "1.8rem", color: "var(--accent)", lineHeight: 1 }}>{s.price} <span style={{ fontSize: "0.7em", color: "var(--ink-dim)", fontWeight: 400 }}>ريال</span></div>
                </div>
              </div>
              <a href="#booking" style={{ display: "block", textAlign: "center", padding: "0.85rem", background: s.featured ? "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)" : "var(--bg)", border: `1px solid ${s.featured ? "var(--accent)" : "var(--line-strong)"}`, borderRadius: "var(--radius-full)", color: s.featured ? "#fff" : "var(--ink)", textDecoration: "none", fontWeight: 600, transition: "all var(--transition)", boxShadow: s.featured ? "0 4px 14px rgba(168,85,247,0.3)" : "none" }}>
                احجز الآن
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Process Steps */}
      <section style={{ padding: "0 2rem 4rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        <div style={{ padding: "3rem", background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, var(--line-accent) 30%, var(--accent) 50%, var(--line-accent) 70%, transparent 100%)" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>كيف نعمل معك؟</h2>
          <p style={{ color: "var(--ink-dim)", marginBottom: "2rem" }}>عملية واضحة وشفافة من البداية للنهاية</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem" }} className="process-grid-resp">
            {[
              { num: "١", title: "احجز استشارة", desc: "املأ الفورم وسنتواصل معك خلال 24 ساعة" },
              { num: "٢", title: "جلسة الاكتشاف", desc: "نفهم احتياجاتك وأهداف مشروعك بدقة" },
              { num: "٣", title: "التنفيذ والمتابعة", desc: "نبدأ العمل مع تحديثات منتظمة على التقدم" },
              { num: "٤", title: "التسليم والدعم", desc: "نسلّم العمل مع دعم لضمان رضاك الكامل" },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: "center", padding: "1.5rem", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", transition: "all var(--transition)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", fontWeight: 800, fontSize: "1rem", color: "#fff", marginBottom: "0.8rem", boxShadow: "0 4px 14px rgba(168,85,247,0.3)" }}>{step.num}</div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem" }}>{step.title}</h4>
                <p style={{ color: "var(--ink-dim)", fontSize: "0.85rem", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section id="booking" style={{ padding: "0 2rem 6rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", background: "var(--bg-alt)", border: "1px solid var(--line-strong)", borderRadius: "var(--radius-lg)", padding: "3rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent-2) 0%, var(--accent) 50%, transparent 100%)" }} />
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            احجز <em style={{ fontStyle: "normal", color: "var(--accent)" }}>استشارتك</em> المجانية
          </h2>
          <p style={{ color: "var(--ink-dim)", marginBottom: "2rem" }}>سنتواصل معك خلال 24 ساعة للتأكيد وتحديد الموعد</p>

          {success ? (
            <div style={{ textAlign: "center", padding: "2rem", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: "var(--radius-md)", color: "var(--accent)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
              <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>تم استلام طلبك!</h3>
              <p>سنتواصل معك قريباً على البريد الإلكتروني.</p>
            </div>
          ) : (
            <form onSubmit={handleBooking}>
              {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "0.8rem 1rem", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>{error}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }} className="form-row-resp">
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>الاسم الكامل</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="محمد العتيبي" required className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>رقم الجوال</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5xx xxx xxxx" required className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>البريد الإلكتروني</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required className="field-input" style={{ width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>الخدمة المطلوبة</label>
                <select value={service} onChange={(e) => setService(e.target.value)} required className="field-input" style={{ width: "100%", boxSizing: "border-box" }}>
                  <option value="">اختر الخدمة</option>
                  {SERVICES.map((s) => <option key={s.title} value={s.title}>{s.title}</option>)}
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--ink-dim)", marginBottom: "0.4rem", fontWeight: 500 }}>تفاصيل إضافية</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="أخبرنا عن متجرك وما تحتاجه..." rows={4} className="field-input" style={{ width: "100%", boxSizing: "border-box", resize: "none" }} />
              </div>
              <button type="submit" disabled={busy} style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-arabic)", fontSize: "1rem", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}>
                {busy ? "جاري الإرسال..." : "أرسل طلب الحجز"}
              </button>
            </form>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width:1024px) { .services-grid-resp { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width:640px) { .services-grid-resp { grid-template-columns: 1fr !important; } .form-row-resp { grid-template-columns: 1fr !important; } }
        @media (max-width:768px) { .process-grid-resp { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width:480px) { .process-grid-resp { grid-template-columns: 1fr !important; } }
        .service-card-resp:hover { border-color: var(--line-accent) !important; transform: translateY(-5px) !important; box-shadow: 0 20px 50px rgba(168,85,247,0.15) !important; }
      `}</style>
    </>
  );
}
