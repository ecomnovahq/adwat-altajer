import Link from "next/link";

const TOOLS_LINKS = [
  { href: "/dashboard/tools/store-analyzer", label: "محلل المتجر" },
  { href: "/dashboard/tools/product-description", label: "مولّد الأوصاف" },
  { href: "/dashboard/tools/competitor-analyzer", label: "تحليل المنافسين" },
  { href: "/dashboard/tools/social-plan", label: "خطة سوشيال" },
  { href: "/dashboard/tools/whatsapp-templates", label: "ردود واتساب" },
  { href: "/dashboard/tools/store-policies", label: "سياسات المتجر" },
  { href: "/dashboard/tools/profit-calculator", label: "حاسبة الربح" },
  { href: "/dashboard/tools/product-images", label: "صور المنتجات" },
];

const PLATFORM_LINKS = [
  { href: "/coupons", label: "الكوبونات" },
  { href: "/calendar", label: "تقويم المواسم" },
  { href: "/works", label: "أعمالنا" },
  { href: "/services", label: "الخدمات" },
  { href: "/blog", label: "المدونة" },
  { href: "/about", label: "عن المنصة" },
];

export default function Footer() {
  return (
    <footer style={{
      background: "var(--bg-alt)",
      borderTop: "1px solid var(--line)",
      fontFamily: "var(--font-arabic)",
    }}>
      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "4rem 2rem 2rem",
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: "3rem",
      }}
        className="flex-col sm:flex-row"
      >
        {/* Brand */}
        <div>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: "0.6rem",
            textDecoration: "none", color: "var(--ink)", fontWeight: 700, marginBottom: "0.75rem",
          }}>
            <svg width="22" height="30" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,4 93,30 93,110 50,136 7,110 7,30" fill="#a855f7" />
              <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="7,30 50,4 50,70 7,70" />
              <polygon style={{ fill: "var(--bg-card,#120e22)" }} points="50,70 93,70 93,110 50,136" />
            </svg>
            أدوات التاجر
          </Link>
          <p style={{ color: "var(--ink-dim)", fontSize: "0.88rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            منصة شاملة للتاجر السعودي — أدوات ذكية مدعومة بالذكاء الاصطناعي، كوبونات حصرية، وخدمات احترافية.
          </p>
          {/* Social */}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            {[
              { label: "X", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
              { label: "Instagram", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg> },
            ].map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                style={{
                  width: 34, height: 34, borderRadius: "var(--radius-sm)",
                  background: "var(--bg-card)", border: "1px solid var(--line)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--ink-dim)", textDecoration: "none",
                  transition: "all var(--transition)",
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mid)", marginBottom: "1.25rem" }}>
            الأدوات
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {TOOLS_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={{
                color: "var(--ink-dim)", textDecoration: "none", fontSize: "0.88rem",
                transition: "color var(--transition)",
              }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mid)", marginBottom: "1.25rem" }}>
            المنصة
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {PLATFORM_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={{
                color: "var(--ink-dim)", textDecoration: "none", fontSize: "0.88rem",
              }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mid)", marginBottom: "1.25rem" }}>
            قانوني
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {["سياسة الخصوصية", "شروط الاستخدام", "إخلاء المسؤولية"].map((label) => (
              <a key={label} href="#" style={{
                color: "var(--ink-dim)", textDecoration: "none", fontSize: "0.88rem",
              }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1400, margin: "0 auto",
        padding: "1.5rem 2rem",
        borderTop: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "0.82rem", color: "var(--ink-mid)",
      }}>
        <span>© 2026 أدوات التاجر — جميع الحقوق محفوظة.</span>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>adwat-altajer.com</span>
      </div>
    </footer>
  );
}
