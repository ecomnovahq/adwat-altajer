import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تقويم المواسم | أدوات التاجر",
  description: "تقويم شامل للمواسم والمناسبات التجارية السعودية",
};

const SEASONS = [
  { month: "يناير", events: [{ name: "رأس السنة الميلادية", date: "1 يناير", color: "#6366f1", tip: "عروض البداية والتخفيضات" }] },
  { month: "فبراير", events: [{ name: "يوم الفالنتاين", date: "14 فبراير", color: "#ec4899", tip: "منتجات الهدايا والعطور" }] },
  { month: "مارس–أبريل", events: [{ name: "شهر رمضان", date: "متغير", color: "#a855f7", tip: "أكبر موسم للمبيعات في السعودية" }, { name: "عيد الفطر", date: "نهاية رمضان", color: "#eab308", tip: "ملابس وهدايا العيد" }] },
  { month: "مايو", events: [{ name: "يوم الأم", date: "الأحد الثاني", color: "#ec4899", tip: "هدايا الأمهات والعناية" }] },
  { month: "يونيو", events: [{ name: "يوم الأب", date: "الأحد الثالث", color: "#3b82f6", tip: "هدايا الرجال والإلكترونيات" }] },
  { month: "يوليو", events: [{ name: "Amazon Prime Day", date: "منتصف يوليو", color: "#f97316", tip: "منافسة مع العروض الكبرى" }] },
  { month: "سبتمبر", events: [{ name: "اليوم الوطني السعودي", date: "23 سبتمبر", color: "#22c55e", tip: "موسم ضخم للعلامات التجارية" }] },
  { month: "نوفمبر", events: [{ name: "بلاك فرايدي", date: "الجمعة الأخيرة", color: "#1f2937", tip: "أكبر يوم تسوق في العالم" }, { name: "سايبر مانداي", date: "الإثنين بعد BF", color: "#374151", tip: "مبيعات التقنية والإلكترونيات" }] },
  { month: "ديسمبر", events: [{ name: "رأس السنة الجديدة", date: "31 ديسمبر", color: "#6366f1", tip: "عروض نهاية العام وتصفية المخزون" }] },
];

export default function CalendarPage() {
  return (
    <>
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)", background: "var(--gold-soft)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            التقويم التجاري
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            تقويم المواسم <em style={{ fontStyle: "normal", color: "var(--gold)" }}>التجارية</em>
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 600, lineHeight: 1.7 }}>
            جميع المواسم والمناسبات التجارية السعودية في مكان واحد — خطط مبكراً وحقق أقصى استفادة.
          </p>
        </div>
      </section>

      <section style={{ padding: "4rem 2rem 6rem", maxWidth: 1200, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {SEASONS.map((season, si) => (
            <div key={si} style={{ background: "var(--bg-alt)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "1.75rem", transition: "border-color var(--transition)" }} className="season-row">
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-mid)", marginBottom: "1.25rem" }}>{season.month}</h3>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {season.events.map((ev, ei) => (
                  <div key={ei} style={{ flex: 1, minWidth: 220, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "1.25rem", borderRight: `3px solid ${ev.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{ev.name}</span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-mid)", marginBottom: "0.5rem" }}>📅 {ev.date}</div>
                    <div style={{ fontSize: "0.83rem", color: "var(--ink-dim)", lineHeight: 1.5 }}>💡 {ev.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "3rem", background: "var(--bg-alt)", border: "1px solid var(--line-accent)", borderRadius: "var(--radius-lg)", padding: "2.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent-2), var(--accent))" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>خطط لمواسمك بذكاء</h3>
          <p style={{ color: "var(--ink-dim)", marginBottom: "1.5rem" }}>استخدم أداة الحملة الموسمية لتوليد خطة تسويقية كاملة لأي موسم</p>
          <Link href="/dashboard/tools/launch-campaign" className="btn-primary">جرّب أداة الحملة الموسمية</Link>
        </div>
      </section>

      <style>{`.season-row:hover { border-color: var(--line-accent) !important; }`}</style>
    </>
  );
}
