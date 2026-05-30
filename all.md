# أدوات التاجر — التوثيق الشامل من A إلى Z

**تاريخ التوثيق:** 2026-05-23  
**المؤلف:** Claude Code (توثيق آلي شامل)

---

## الفهرس

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [Tech Stack الكامل](#2-tech-stack-الكامل)
3. [Design System — نظام التصميم](#3-design-system--نظام-التصميم)
4. [هيكل المجلدات الكامل](#4-هيكل-المجلدات-الكامل)
5. [صفحات الموقع العام](#5-صفحات-الموقع-العام)
6. [المكونات (Components)](#6-المكونات-components)
7. [لوحة التحكم والأدوات العشر](#7-لوحة-التحكم-والأدوات-العشر)
8. [Backend — المعمارية الكاملة](#8-backend--المعمارية-الكاملة)
9. [API Endpoints الكاملة](#9-api-endpoints-الكاملة)
10. [قاعدة البيانات — Schema الكامل](#10-قاعدة-البيانات--schema-الكامل)
11. [محرك الذكاء الاصطناعي](#11-محرك-الذكاء-الاصطناعي)
12. [نظام المصادقة (Authentication)](#12-نظام-المصادقة-authentication)
13. [إعداد البيئة والتشغيل](#13-إعداد-البيئة-والتشغيل)
14. [تاريخ التطوير — التعليمات الكاملة من A إلى Z](#14-تاريخ-التطوير--التعليمات-الكاملة-من-a-إلى-z)
15. [المشاكل المكتشفة والإصلاحات](#15-المشاكل-المكتشفة-والإصلاحات)

---

## 1. نظرة عامة على المشروع

**الاسم:** أدوات التاجر (Adwat Altajer)  
**الهدف:** منصة ذكاء اصطناعي متكاملة مصممة خصيصاً للتجار السعوديين في التجارة الإلكترونية  
**الجمهور المستهدف:** تجار منصتَي سلة وزد والمتاجر الإلكترونية في المملكة العربية السعودية  
**اللغة:** العربية (RTL) بالكامل  
**الوضع الحالي:** قيد التطوير — النسخة v4 من محلل المتاجر

**ما يقدمه المشروع:**
- 10 أدوات ذكاء اصطناعي مجانية للتجار
- تحليل شامل للمتاجر الإلكترونية (15 محور + Gemini Vision)
- توليد محتوى تسويقي (أوصاف، صور، رسائل واتساب، خطط سوشيال)
- تحليل المنافسين وسياسات المتجر وحملات الإطلاق
- نظام حسابات مع صلاحيات مدفوعة ومجانية

---

## 2. Tech Stack الكامل

### Frontend
```
Next.js            14.2.5    (App Router)
React              18.3.1
TypeScript         5.5.3
Tailwind CSS       3.4.6
Framer Motion      11.3.8    (animations)
Lucide React       0.407.0   (icons)
Radix UI           (headless components)
  @radix-ui/react-slot       1.1.0
  @radix-ui/react-label      2.1.0
  @radix-ui/react-select     2.1.1
  @radix-ui/react-tabs       1.1.0
  @radix-ui/react-dialog     1.1.1
  @radix-ui/react-checkbox   1.1.1
  @radix-ui/react-slider     1.2.0
  @radix-ui/react-switch     1.1.0
class-variance-authority     0.7.0
clsx                         2.1.1
tailwind-merge               2.4.0
concurrently                 8.2.2
```

### Backend
```
Node.js            (runtime)
Express            4.19.2    (web framework)
PostgreSQL         (database)
pg                 8.12.0    (PostgreSQL client)
bcryptjs           2.4.3     (password hashing, salt=12)
jsonwebtoken       9.0.2     (JWT tokens, 7 days)
express-validator  7.1.0     (input validation)
express-rate-limit 7.3.1     (rate limiting)
cors               2.8.5
morgan             1.10.1    (HTTP logging)
dotenv             16.4.5
winston            3.19.0    (structured logging)
nodemailer         8.0.7     (email sending)
axios              1.16.1    (HTTP requests)
cheerio            1.2.0     (HTML parsing)
puppeteer-core     25.0.2    (headless Chrome screenshots)
playwright         1.60.0    (browser automation - behavioral simulation)
```

### AI APIs المستخدمة
```
@google/generative-ai    0.24.1    Gemini 2.0 Flash (primary)
groq-sdk                 1.2.0     Groq Llama 3.3-70b (emergency fallback)
Hugging Face Flux Schnell           (image generation via API)
Google PageSpeed Insights API       (Core Web Vitals)
```

### Scripts (package.json)
```json
"dev":     "next dev -p 3000"
"build":   "next build"
"start":   "next start -p 3000"
"backend": "cd backend && npm run dev"
"dev:all": "concurrently \"npm run dev\" \"npm run backend\""
```

---

## 3. Design System — نظام التصميم

### اسم النظام: Purple Gold v4

### ألوان Dark Mode (الوضع الافتراضي)
```css
:root {
  /* ── Backgrounds ── */
  --bg:           #08060f;           /* الخلفية الرئيسية */
  --bg-alt:       #0d0a1a;           /* خلفية بديلة */
  --bg-card:      #120e22;           /* بطاقات */
  --bg-elevated:  #19152f;           /* عناصر مرتفعة */
  --bg-overlay:   rgba(8,6,15,0.88); /* overlay للـ modals */

  /* ── النصوص ── */
  --ink:     #f0ebff;                /* النص الأساسي */
  --ink-dim: #8b83b0;                /* النص الثانوي */
  --ink-mid: #4a4468;                /* النص الثالثي */

  /* ── الألوان الأساسية ── */
  --accent:      #a855f7;            /* البنفسجي الرئيسي */
  --accent-2:    #9333ea;            /* بنفسجي أغمق */
  --accent-3:    #c084fc;            /* بنفسجي أفتح */
  --accent-warm: #eab308;            /* ذهبي */
  --accent-soft: rgba(168,85,247,0.1);
  --accent-glow: rgba(168,85,247,0.22);

  /* ── الذهبي ── */
  --gold:      #eab308;
  --gold-soft: rgba(234,179,8,0.12);

  /* ── الحالات ── */
  --danger:    #f43f5e;              /* أحمر - خطأ */
  --success:   #10b981;              /* أخضر - نجاح */

  /* ── الحدود ── */
  --line:        rgba(240,235,255,0.07);
  --line-strong: rgba(240,235,255,0.13);
  --line-accent: rgba(168,85,247,0.28);

  /* ── الظلال ── */
  --shadow-sm:     0 1px 3px rgba(0,0,0,0.6);
  --shadow-md:     0 4px 24px rgba(0,0,0,0.5);
  --shadow-lg:     0 24px 64px rgba(0,0,0,0.7);
  --shadow-accent: 0 8px 32px rgba(168,85,247,0.32);

  /* ── الطباعة ── */
  --font-arabic: var(--font-tajawal, 'Tajawal'), sans-serif;

  /* ── الحواف ── */
  --radius-sm:   8px;
  --radius-md:   14px;
  --radius-lg:   20px;
  --radius-xl:   28px;
  --radius-full: 9999px;

  /* ── الحركة ── */
  --transition: 0.22s cubic-bezier(0.16, 1, 0.3, 1);

  /* ── التنقل ── */
  --nav-bg:        rgba(8,6,15,0.90);
  --float-card-bg: rgba(18,14,34,0.97);
}
```

### ألوان Light Mode
```css
[data-theme="light"] {
  --bg:           #faf8ff;
  --bg-alt:       #f2eeff;
  --bg-card:      #e9e2ff;
  --bg-elevated:  #ddd4ff;
  --bg-overlay:   rgba(250,248,255,0.92);
  --ink:          #1a0f2e;
  --ink-dim:      #5a4d7a;
  --ink-mid:      #9b90bf;
  --line:         rgba(26,15,46,0.07);
  --line-strong:  rgba(26,15,46,0.13);
  --nav-bg:       rgba(250,248,255,0.94);
  --float-card-bg:rgba(255,255,255,0.98);
  --shadow-sm:    0 1px 3px rgba(0,0,0,0.07);
  --shadow-md:    0 4px 24px rgba(0,0,0,0.09);
}
```

### الخطوط
```
الخط الأساسي: Tajawal (Google Fonts)
Weights: 300 | 400 | 500 | 700 | 800
```

### Tailwind Extensions
```javascript
fontFamily: {
  sans: ['var(--font-arabic)', 'Tajawal', 'Noto Sans Arabic', 'Arial', 'sans-serif'],
  arabic: ['Tajawal', 'sans-serif'],
}
animation: {
  'spin-slow': 'spin 3s linear infinite',
  'pulse-soft': 'pulse 2s ease-in-out infinite',
}
```

### نظام الثيم (Dark/Light Toggle)
- التخزين: `localStorage` بالمفتاح `tajer-theme`
- القيم: `dark` (افتراضي) | `light`
- التهيئة: script في `<head>` يعمل قبل تحميل React لمنع الوميض
- التبديل: من خلال `data-theme` attribute على `<html>`

---

## 4. هيكل المجلدات الكامل

```
adwat-altajer/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root Layout (RTL, Tajawal, AuthProvider)
│   ├── page.tsx                      # الصفحة الرئيسية التسويقية
│   ├── globals.css                   # CSS Variables + Design System
│   ├── loading.tsx                   # Skeleton loading
│   │
│   ├── (site)/                       # Route Group — صفحات الموقع العام
│   │   ├── layout.tsx                # Layout مع Navbar + Footer
│   │   ├── login/
│   │   │   └── page.tsx              # تسجيل دخول + إنشاء حساب
│   │   ├── tools/
│   │   │   └── page.tsx              # عرض كل الأدوات (public)
│   │   ├── services/
│   │   │   └── page.tsx              # الخدمات الاستشارية + نموذج حجز
│   │   ├── coupons/
│   │   │   └── page.tsx              # كوبونات سلة وزد
│   │   ├── works/
│   │   │   └── page.tsx              # معرض الأعمال
│   │   ├── about/
│   │   │   └── page.tsx              # عن المنصة
│   │   ├── blog/
│   │   │   ├── page.tsx              # قائمة المقالات
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # مقالة مفردة
│   │   ├── account/
│   │   │   └── page.tsx              # حساب المستخدم
│   │   ├── calendar/
│   │   │   └── page.tsx              # تقويم المواسم التجارية
│   │   └── admin/
│   │       └── page.tsx              # لوحة الإدارة
│   │
│   └── dashboard/                    # Route Group — الأدوات الداخلية
│       ├── layout.tsx                # Sidebar + Navigation للأدوات
│       ├── page.tsx                  # شبكة الـ 10 أدوات
│       ├── settings/
│       │   └── page.tsx              # إعدادات الحساب
│       └── tools/
│           ├── store-analyzer/
│           │   └── page.tsx          # محلل المتجر (1664 سطر)
│           ├── competitor-analyzer/
│           │   └── page.tsx          # محلل المنافسين
│           ├── product-description/
│           │   └── page.tsx          # مولد الأوصاف
│           ├── product-images/
│           │   └── page.tsx          # مولد الصور
│           ├── whatsapp-templates/
│           │   └── page.tsx          # قوالب واتساب
│           ├── social-plan/
│           │   └── page.tsx          # خطة السوشيال
│           ├── store-policies/
│           │   └── page.tsx          # سياسات المتجر
│           ├── launch-campaign/
│           │   └── page.tsx          # حملة الإطلاق
│           ├── profit-calculator/
│           │   └── page.tsx          # حاسبة الربح
│           └── seasons-calendar/
│               └── page.tsx          # تقويم المواسم
│
├── components/
│   ├── Navbar.tsx                    # شريط التنقل العلوي
│   ├── Footer.tsx                    # التذييل
│   ├── ChatWidget.tsx                # Chat AI عائم
│   ├── HomeStats.tsx                 # عداد الإحصائيات المتحرك
│   ├── HomeWorksReviews.tsx          # أعمال + تقييمات (Client Component)
│   └── ui/                           # Radix UI Components
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── textarea.tsx
│       ├── badge.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── sheet.tsx
│       ├── slider.tsx
│       ├── checkbox.tsx
│       ├── card.tsx
│       ├── separator.tsx
│       ├── switch.tsx
│       └── progress.tsx
│
├── contexts/
│   └── AuthContext.tsx               # Authentication State Management
│
├── lib/
│   ├── api.ts                        # API Client + endpoints
│   └── utils.ts                      # cn() utility
│
├── assets/
│   ├── styles.css                    # CSS للصفحات القديمة (HTML)
│   ├── main.js                       # JavaScript للصفحات القديمة
│   ├── api.js                        # API client للصفحات القديمة
│   └── favicon.svg
│
├── pages/                            # صفحات HTML قديمة (غير مستخدمة في Next.js)
│   ├── analyzer.html
│   ├── competitor.html
│   ├── admin.html
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express server (نقطة الدخول)
│   │   ├── logger.js                 # Winston logger
│   │   ├── mailer.js                 # Nodemailer (email)
│   │   ├── config/
│   │   │   └── db.js                # PostgreSQL Pool connection
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT validation
│   │   │   └── errorHandler.js      # Central error handler
│   │   ├── utils/
│   │   │   └── screenshot.js        # Puppeteer screenshots
│   │   └── routes/
│   │       ├── tools.js             # AI Engine (~2000 سطر)
│   │       ├── auth.js              # Authentication routes
│   │       ├── coupons.js           # Coupons CRUD
│   │       ├── bookings.js          # Service bookings
│   │       ├── reviews.js           # Reviews CRUD
│   │       ├── works.js             # Portfolio CRUD
│   │       ├── blog.js              # Blog posts CRUD
│   │       └── admin.js             # Admin dashboard
│   ├── migrations/
│   │   ├── 001_initial.sql          # الجداول الأساسية
│   │   ├── 002_tools_access.sql     # صلاحيات الأدوات
│   │   ├── 003_tool_settings_requests.sql
│   │   ├── 004_indexes_and_password_reset.sql
│   │   ├── 005_all_tools_settings.sql
│   │   └── run.js                   # Migration runner
│   ├── .env                         # Environment variables
│   └── package.json
│
├── tailwind.config.js
├── next.config.js                    # rewrites: /api/* → localhost:3001
├── tsconfig.json
├── postcss.config.js
├── package.json                      # Frontend dependencies
├── PROJECT_ISSUES.md                 # تقرير المراجعة الشامل
└── all.md                            # هذا الملف
```

---

## 5. صفحات الموقع العام

### الصفحة الرئيسية (`app/page.tsx`)
- Hero section مع gradient animation
- عداد الإحصائيات (HomeStats)
- شريط Marquee بأسماء منصات
- قسم الأدوات (8 بطاقات)
- قسم الخدمات
- قسم الأعمال (HomeWorksReviews)
- قسم التقييمات
- قسم CTA نهائي
- Navbar + Footer

### صفحة تسجيل الدخول (`/login`)
- Tab للدخول + Tab للتسجيل
- نموذج الدخول: email + password
- نموذج التسجيل: name + email + password
- JWT token يُخزَّن في localStorage بالمفتاح `tajer-token`
- استعادة كلمة المرور

### صفحة الأدوات (`/tools`)
- عرض شبكة الأدوات العامة
- كل أداة: اسم + وصف + أيقونة + رابط

### صفحة الخدمات (`/services`)
- عرض 4 خدمات استشارية
- نموذج حجز خدمة (اسم، بريد، هاتف، نوع الخدمة)

### صفحة الكوبونات (`/coupons`)
- قائمة كوبونات سلة وزد
- فلتر بالمنصة والفئة
- زر نسخ الكود

### صفحة الأعمال (`/works`)
- معرض المشاريع المنجزة
- فلتر بالفئة

### صفحة المدونة (`/blog`)
- قائمة المقالات
- صفحة مقالة مفردة بـ slug

### صفحة الحساب (`/account`)
- بيانات المستخدم
- زر تسجيل الخروج

### صفحة الإدارة (`/admin`) — للـ Admin فقط
- إحصائيات الاستخدام
- إدارة المستخدمين وصلاحياتهم
- إدارة الأدوات (مدفوع/مجاني)
- إدارة طلبات الوصول

---

## 6. المكونات (Components)

### Navbar.tsx
```
- شريط ثابت في أعلى الصفحة (fixed + blur backdrop)
- Logo (أدوات التاجر)
- روابط: الرئيسية | الأدوات | الخدمات | الكوبونات | الأعمال | المدونة | عن المنصة
- زر Dark/Light toggle (يحفظ في localStorage)
- عند تسجيل الدخول: Avatar مع dropdown (حساب | لوحة التحكم | تسجيل الخروج)
- عند عدم الدخول: زر "دخول | تسجيل"
- Hamburger menu للموبايل
```

### Footer.tsx
```
- Brand section (شعار + وصف)
- قسم الأدوات (روابط)
- قسم المنصة (روابط)
- قسم قانوني (سياسة + شروط)
- أيقونات سوشيال (X, Instagram)
- Copyright 2026
```

### ChatWidget.tsx
```
- زر عائم في أسفل يسار الشاشة
- زر WhatsApp (966500000000)
- نافذة دردشة (340px عرض)
- تاريخ المحادثة
- يتصل بـ POST /api/tools/chat
- المساعد اسمه "تاجر" — نبرة خليجية ودية
```

### HomeStats.tsx
```
- 4 أرقام متحركة (count-up animation):
  +500 كوبون نشط
  10 أدوات ذكية
  95% رضا العملاء
  +200 مشروع منجز
- Intersection Observer لبدء العد عند الظهور
```

### HomeWorksReviews.tsx (Client Component)
```
- HomeWorks(): يجلب الأعمال من GET /api/works
- HomeReviews(): يجلب التقييمات من GET /api/reviews
```

### UI Components (Radix UI + Tailwind)
```
button.tsx    — variants: default | destructive | outline | secondary | ghost | link
input.tsx     — text input مع RTL support
label.tsx     — form labels
textarea.tsx  — multi-line text
badge.tsx     — status badges (variants)
select.tsx    — dropdown مع Radix portal
tabs.tsx      — tabbed interface
sheet.tsx     — drawer/sheet (side panel)
slider.tsx    — range slider
checkbox.tsx  — checkboxes
card.tsx      — Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter
separator.tsx — divider line
switch.tsx    — toggle switch
progress.tsx  — progress bar
```

### AuthContext (contexts/AuthContext.tsx)
```typescript
interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
  tools_access: string[]
  plan: string
}

// Methods:
login(email, password) → JWT token في localStorage
register(name, email, password) → تسجيل + دخول تلقائي
logout() → حذف token

// State:
user: User | null
loading: boolean
isAdmin: boolean
```

---

## 7. لوحة التحكم والأدوات العشر

### Dashboard Layout (`app/dashboard/layout.tsx`)
```
- Sidebar قابل للطي (collapsed/expanded)
- 10 روابط للأدوات مع أيقونات
- رابط الإعدادات
- رابط الرجوع للموقع
- Responsive: يختفي على الموبايل
```

### Dashboard Home (`app/dashboard/page.tsx`)
```
- شبكة الـ 10 أدوات
- كل أداة: اسم + وصف + أيقونة + نموذج AI + Badge
- الضغط يوجه لـ /dashboard/tools/[tool-name]
```

---

### الأداة 1: محلل المتجر (Store Analyzer)
**المسار:** `app/dashboard/tools/store-analyzer/page.tsx` (1664 سطر)  
**الـ API:** `POST /api/tools/analyze`

**الوصف:** تحليل شامل بـ 17 علامة تبويب لأي متجر إلكتروني — يكشف نقاط القوة والضعف ويعطي خطة تحسين قابلة للتنفيذ.

**المدخلات:**
```typescript
url: string              // رابط المتجر
category?: string        // التخصص (13 فئة): 
// أزياء | إلكترونيات | مواد غذائية | صحة | مستلزمات منزل 
// رياضة | إكسسوارات | عطور | أطفال | كتب | برمجيات | خدمات | عام
```

**الـ 17 علامة تبويب:**
| # | التبويب | المحتوى |
|---|---------|---------|
| 1 | Summary | ملخص + overallScore + نقاط قوة/ضعف |
| 2 | Technical | Core Web Vitals + Security Headers |
| 3 | Visual | تحليل بصري + Hero + صور منتجات + brand |
| 4 | UX | تجربة المستخدم |
| 5 | CRO | معدل التحويل + Cart + Checkout |
| 6 | SEO | تحسين محركات البحث |
| 7 | Behavioral | سلوك المستخدم (Playwright) |
| 8 | Industry | تحليل الصناعة + benchmarks |
| 9 | Trust | نقاط الثقة |
| 10 | Commerce | ميزات التجارة الخليجية |
| 11 | Benchmark | مقارنة مع متوسط القطاع |
| 12 | Revenue | الإيرادات المفقودة بالـ SAR |
| 13 | Actions | خطة عمل مرتبة بالأولوية |
| 14 | Priorities | عرض أولويات |
| 15 | Optimizer | محسّن الكلمات والعناوين |
| 16 | Psychology | التحليل النفسي للمشترين |
| 17 | Competitors | المنافسون المكتشفون |

**المخرجات الكاملة (JSON):**
```typescript
interface AnalysisResult {
  // Core
  overallScore: number              // 0-100
  platform: string                  // سلة | زد | غير محدد
  storeName: string
  summary: string
  criteria: CriterionItem[]         // 15 معيار تفصيلي
  
  // Theme
  themeName: string | null          // اسم القالب المكتشف
  themeCode: string | null          // رمز القالب
  detectedIndustry: string | null   // الصناعة المكتشفة تلقائياً
  
  // Visual
  visualScore: number
  visualItems: VisualItem[]
  heroSection: HeroSectionData
  productImages: ProductImagesData
  brandConsistency: BrandConsistencyData
  visualAttention: VisualAttentionData
  premiumFeel: "premium"|"professional"|"mid"|"budget"
  visionUsed: boolean               // هل استُخدم Gemini Vision؟
  
  // UX + CRO
  ux: { score, items }
  cro: { items }
  croScore: number
  conversionProbability: number     // 0-100%
  checkoutFriction: CheckoutFriction
  offerStrength: OfferStrength
  
  // Technical
  technicalChecks: TechnicalCheck[]
  pageSpeed: PageSpeedData
  
  // Behavioral
  behavioral: BehavioralData
  croSignals: CROSignals
  
  // Trust + Commerce
  trust: TrustData
  commerce: CommerceData
  
  // SEO + Security
  seo: SEOData
  security: SecurityData
  trustScore: number
  
  // Benchmarking
  benchmarkingData: BenchmarkData
  
  // Revenue
  revenue: { estimatedMonthlyLoss, issues }
  
  // Actions
  actions: Action[]
  
  // AI-powered
  psychology: PsychologyData
  brand: BrandData
  pricing: PricingData
  competitors: Competitor[]
  
  // Score indices
  maturityScore: number
  merchantSuccessScore: number
  healthScore: number
  missingFeatures: string[]
  growthOpportunities: string[]
  rtlAnalysis: RTLAnalysis
  gulfCommerceReadiness: GulfData
}
```

---

### الأداة 2: محلل المنافسين (Competitor Analyzer)
**المسار:** `app/dashboard/tools/competitor-analyzer/page.tsx`  
**الـ API:** `POST /api/tools/competitor`

**الوصف:** مقارنة متجرك بمنافس واحد واكتشاف فرص التفوق.

**المدخلات:**
```typescript
myUrl: string            // رابط متجرك
competitorUrl: string    // رابط المنافس (واحد فقط)
```

**المخرجات:**
```typescript
interface AnalysisResult {
  summary: string
  myStore: { name, url, score, strengths[], weaknesses[] }
  competitor: { name, url, score, strengths[], weaknesses[] }
  comparison: ComparisonRow[]    // 8 محاور مع نقاط
  opportunities: string[]
  threats: string[]
  strategy: string[]
}
```

**ملاحظة:** الـ UI يبدأ بحقل واحد للمنافس (الحد الأقصى = 1).

---

### الأداة 3: مولد أوصاف المنتجات (Product Description)
**المسار:** `app/dashboard/tools/product-description/page.tsx`  
**الـ API:** `POST /api/tools/generate`

**الوصف:** يولّد 3 نسخ احترافية من وصف المنتج محسّنة لـ SEO ومنصات التواصل.

**المدخلات:**
```typescript
interface FormState {
  productName: string
  category: string         // من 6 فئات
  features: string[]       // مميزات قابلة للإضافة/الحذف
  audience: string         // 7 خيارات: نساء | رجال | أطفال | عائلات | شباب | مهنيون | الكل
  tone: "professional" | "friendly" | "luxury" | "bold" | "emotional"
  language: "ar" | "en" | "both"
  length: number           // 50-500 كلمة (slider)
  bulletPoints: boolean
  seoKeywords: boolean
  hasCTA: boolean
}
```

**toneMap (الترجمة للـ API):**
```typescript
{
  professional: "professional",
  friendly:     "friendly",
  luxury:       "luxury",
  bold:         "professional",    // fallback
  emotional:    "friendly"         // fallback
}
```

**المخرجات:**
```typescript
interface Variant {
  text: string
  seoKeywords: string[]
  rating: number
  badge: string
}
// يُرجع: title + description + shortDescription + bulletPoints + keywords
```

---

### الأداة 4: مولد صور المنتجات (Product Images)
**المسار:** `app/dashboard/tools/product-images/page.tsx`  
**الـ API:** `POST /api/tools/generate-image`

**الوصف:** يولّد صورة منتج احترافية بالذكاء الاصطناعي (Hugging Face Flux Schnell).

**المدخلات:**
```typescript
interface FormState {
  productName: string
  description: string
  style: "white-studio" | "lifestyle" | "luxury" | "flat-lay"
  lighting: "natural" | "studio" | "dramatic" | "soft"
  angle: "front" | "side" | "top" | "45deg"
  ratio: "1:1" | "4:3" | "9:16" | "16:9"
  colors: string
  logoFile: File | null      // اختياري
}
```

**خطوات التحميل:**
1. تحليل وصف المنتج...
2. بناء الـ prompt...
3. إرسال إلى Flux Schnell...
4. معالجة الصورة المولّدة...

**المخرجات:** صورة واحدة (URL)

**ملاحظة:** يولّد **صورة واحدة** فقط (لا 4).

---

### الأداة 5: قوالب رسائل واتساب (WhatsApp Templates)
**المسار:** `app/dashboard/tools/whatsapp-templates/page.tsx`  
**الـ API:** `POST /api/tools/whatsapp`

**الوصف:** يولّد 3 قوالب رسائل واتساب احترافية لـ 7 مواقف مختلفة.

**المدخلات:**
```typescript
{
  messageType: string    // نوع الرسالة (من القائمة أدناه)
  storeName: string
  productType: string
  brandName: string
  tone: "formal" | "friendly" | "funny"
  includeEmoji: boolean
  includeLink: boolean
}
```

**أنواع الرسائل الـ 7:**
1. رسالة ترحيب بعميل جديد
2. تأكيد الطلب
3. استرداد سلة مهجورة
4. عرض خاص/خصم
5. شكر بعد الشراء
6. طلب تقييم
7. تذكير بعرض ينتهي قريباً

**المخرجات:** 3 قوالب نصية مع عداد أحرف ومتغيرات ديناميكية (`{اسم_العميل}`, `{رقم_الطلب}`)

---

### الأداة 6: خطة محتوى السوشيال (Social Plan)
**المسار:** `app/dashboard/tools/social-plan/page.tsx`  
**الـ API:** `POST /api/tools/social-plan`

**الوصف:** خطة محتوى تسويقية كاملة لـ 5 منصات مع تقويم نشر.

**المدخلات:**
```typescript
{
  selectedPlatforms: string[]    // Instagram | TikTok | Snapchat | Twitter | LinkedIn
  storeName: string
  productType: string
  duration: "أسبوع" | "شهر" | "3 أشهر"
  businessType: string           // 7 فئات
  goals: string[]
  tone: string                   // 4 أنماط
}
```

**المخرجات:**
```typescript
interface PlanResult {
  plan: DayPlan[]           // كل يوم: theme + 3+ posts
  bestTimes: Record<string, string>    // أفضل وقت نشر لكل منصة
  summary: string
  storeName: string
}
```

**3 عروض:** تقويم | قائمة | إحصائيات

---

### الأداة 7: مولد سياسات المتجر (Store Policies)
**المسار:** `app/dashboard/tools/store-policies/page.tsx`  
**الـ API:** `POST /api/tools/store-policies`

**الوصف:** يولّد سياسات قانونية متوافقة مع نظام التجارة الإلكترونية السعودي.

**المدخلات:**
```typescript
{
  storeName: string
  businessType: string     // 10 فئات
  country: string          // 8 دول (السعودية افتراضياً)
  selectedPolicies: string[]
  extraDetails: string
}
```

**أنواع السياسات الـ 5:**
1. 🚚 سياسة الشحن والتوصيل
2. ↩️ سياسة الإرجاع والاستبدال
3. 🔒 سياسة الخصوصية
4. 📄 الشروط والأحكام العامة
5. 🍪 سياسة ملفات الكوكيز

**المخرجات:** نص HTML قانوني محرّر قابل للنسخ والتحميل

---

### الأداة 8: حملة الإطلاق (Launch Campaign)
**المسار:** `app/dashboard/tools/launch-campaign/page.tsx`  
**الـ API:** `POST /api/tools/launch-campaign`

**الوصف:** استراتيجية إطلاق متكاملة مع جدول زمني وتوزيع ميزانية.

**الخطوات الـ 4:**
```
الخطوة 1 — المنتج:   productName | category | description
الخطوة 2 — الجمهور:  features[] | audience | price | competitors
الخطوة 3 — الإطلاق:  launchDate | budget | platforms[] | goal
الخطوة 4 — المراجعة: تلخيص كل شيء
```

**المخرجات:**
```typescript
interface CampaignResult {
  summary: string
  timeline: { day: string; tasks: string[] }[]
  cards: CampaignCard[]      // 6 أنواع: post | ad | email | story | video | offer
  kpis: { label, value, icon }[]
  budget: { channel, amount, pct }[]
}
```

---

### الأداة 9: حاسبة الربح (Profit Calculator)
**المسار:** `app/dashboard/tools/profit-calculator/page.tsx`  
**الـ API:** بدون — JavaScript خالص

**الوصف:** حساب هامش الربح وتكاليف الشحن والعائد على الاستثمار بشكل فوري.

---

### الأداة 10: تقويم المواسم (Seasons Calendar)
**المسار:** `app/dashboard/tools/seasons-calendar/page.tsx`  
**الـ API:** `POST /api/tools/seasons-calendar` (أو مدمج)

**الوصف:** تقويم بالمواسم التجارية السعودية مع أفكار محتوى لكل موسم (Gemini Flash).

---

## 8. Backend — المعمارية الكاملة

### app.js — نقطة الدخول
```javascript
// معالجة الأخطاء الحرجة
process.on('uncaughtException', ...)
process.on('unhandledRejection', ...)

// إنشاء تلقائي للجداول الحرجة (idempotent)
CREATE TABLE IF NOT EXISTS tool_settings ...
CREATE TABLE IF NOT EXISTS tool_logs ...
CREATE TABLE IF NOT EXISTS tool_access_requests ...

// Middleware Stack:
morgan('dev')                              // HTTP logging
cors({ origin: FRONTEND_URL })            // CORS (localhost:5500)
express.json({ limit: '10mb' })           // JSON body
express.urlencoded({ extended: true })
rateLimit({ windowMs: 15min, max: 150 }) // 150 req/15min عام
rateLimit({ windowMs: 60min, max: 30 })  // 30 req/hour للـ AI tools

// Routes:
/api/auth     → auth.js
/api/tools    → tools.js
/api/coupons  → coupons.js
/api/bookings → bookings.js
/api/works    → works.js
/api/reviews  → reviews.js
/api/admin    → admin.js
/api/blog     → blog.js
/api/health   → { status: 'ok' }
```

### logger.js
```javascript
// Winston Configuration:
Console: color-coded في development
error.log: 5MB max، 3 ملفات متعاقبة
combined.log: 10MB max، 5 ملفات
Format: JSON مع timestamp
Level: 'info' في dev، 'warn' في production
```

### db.js
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,                        // أقصى اتصالات
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### middleware/auth.js
```javascript
auth()         // JWT إلزامي — يُوقف إذا غاب أو انتهى
optionalAuth() // JWT اختياري — يكمل بدونه
adminAuth()    // JWT + is_admin=true
```

### utils/screenshot.js (Puppeteer Core)
```javascript
// يأخذ لقطات من متجر المستخدم:
// - الصفحة الرئيسية (desktop 1440px + mobile 390px)
// - صفحة منتج/تصنيف إن وجدت
// - JPEG output بـ base64
// - يستخدم CHROME_PATH من .env
```

---

## 9. API Endpoints الكاملة

### المصادقة
```
POST   /api/auth/register          { name, email, password } → { token, user }
POST   /api/auth/login             { email, password } → { token, user }
GET    /api/auth/me                (auth) → user data
POST   /api/auth/forgot-password   { email } → إرسال رابط إعادة تعيين
POST   /api/auth/reset-password    { token, password } → تحديث
```

### أدوات الذكاء الاصطناعي
```
POST   /api/tools/analyze          (auth) { url, category } → AnalysisResult
POST   /api/tools/generate         (auth) { productName, features, category, tone, targetAudience }
POST   /api/tools/generate-image   (auth) { productName, description, style, colors }
POST   /api/tools/whatsapp         (auth) { storeName, productType, brandName, tone }
POST   /api/tools/competitor       (auth) { myUrl, competitorUrl }
POST   /api/tools/social-plan      (auth) { storeName, productType, duration, platforms }
POST   /api/tools/store-policies   (auth) { storeName, productType, city, shippingDays, returnDays }
POST   /api/tools/launch-campaign  (auth) { ... }
POST   /api/tools/chat             (auth/optional) { message, history[] }
POST   /api/tools/request-access   (auth) { toolName, reason }
GET    /api/tools/settings         → إعدادات الأدوات (is_paid, daily_free_limit)
GET    /api/tools/history          (auth) → سجل استخدام المستخدم
GET    /api/tools/my-requests      (auth) → طلبات الوصول الخاصة
```

### البيانات العامة
```
GET    /api/coupons                → كوبونات نشطة
GET    /api/works                  → أعمال نشطة
GET    /api/reviews                → تقييمات نشطة
GET    /api/blog                   → مقالات منشورة
GET    /api/blog/post/:slug        → مقالة + زيادة مشاهدات
```

### الحجوزات
```
POST   /api/bookings               (optional auth) { name, email, phone, service_type, message }
GET    /api/bookings/my            (auth) → حجوزاتي
```

### لوحة الإدارة
```
GET    /api/admin/dashboard         (admin) → إحصائيات
GET    /api/admin/users             (admin) → قائمة المستخدمين
PUT    /api/admin/users/:id/tools-access  (admin) → تحديث الصلاحيات
PUT    /api/admin/users/:id/toggle-admin  (admin) → تبديل admin
DELETE /api/admin/users/:id         (admin) → حذف
GET    /api/admin/tool-settings     (admin) → إعدادات الأدوات
PUT    /api/admin/tool-settings/:toolName (admin)
GET    /api/admin/tool-requests     (admin) → طلبات الوصول
PUT    /api/admin/tool-requests/:id (admin) → موافقة/رفض
GET    /api/admin/logs              (admin) → سجلات الاستخدام
```

---

## 10. قاعدة البيانات — Schema الكامل

### الجداول العشرة

#### 1. users
```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  is_admin      BOOLEAN DEFAULT FALSE,
  tools_access  JSONB DEFAULT '[]',      -- مصفوفة أسماء الأدوات المتاحة
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. tool_settings
```sql
CREATE TABLE tool_settings (
  tool_name        VARCHAR(100) PRIMARY KEY,
  display_name     VARCHAR(255),
  is_paid          BOOLEAN DEFAULT FALSE,
  daily_free_limit INTEGER DEFAULT 10,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الأولية (migration 005):**
| tool_name | display_name | is_paid | daily_free_limit |
|-----------|-------------|---------|-----------------|
| analyzer | محلل المتاجر | false | 10 |
| generator | مولد المحتوى | false | 10 |
| image-gen | توليد الصور | false | 5 |
| whatsapp | قوالب واتساب | false | 5 |
| competitor | محلل المنافسين | false | 5 |
| social-plan | خطة السوشيال | false | 3 |
| store-policies | سياسات المتجر | false | 5 |
| launch-campaign | حملة الإطلاق | false | 3 |

#### 3. tool_logs
```sql
CREATE TABLE tool_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tool_name   VARCHAR(100) NOT NULL,
  input_data  JSONB,
  result_data JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. tool_access_requests
```sql
CREATE TABLE tool_access_requests (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tool_name  VARCHAR(100) NOT NULL,
  reason     TEXT,
  status     VARCHAR(50) DEFAULT 'pending'
             CHECK (status IN ('pending','approved','rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. coupons
```sql
CREATE TABLE coupons (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(100) NOT NULL,
  discount    VARCHAR(50) NOT NULL,
  platform    VARCHAR(50) DEFAULT 'both',  -- salla | zid | both
  description TEXT,
  link        VARCHAR(500),
  category    VARCHAR(100) DEFAULT 'عام',
  expiry_date DATE,
  is_active   BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. works (Portfolio)
```sql
CREATE TABLE works (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  category      VARCHAR(100) NOT NULL,
  badge_label   VARCHAR(100),
  description   TEXT,
  gradient_from VARCHAR(20) DEFAULT '#100e12',
  gradient_via  VARCHAR(20) DEFAULT '#2d2b60',
  gradient_to   VARCHAR(20) DEFAULT '#7f7ef8',
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. reviews
```sql
CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  store         VARCHAR(255),
  platform      VARCHAR(50),
  review_text   TEXT NOT NULL,
  rating        INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  avatar_letter VARCHAR(5),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8. bookings
```sql
CREATE TABLE bookings (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255),
  phone        VARCHAR(50),
  service_type VARCHAR(100),
  message      TEXT,
  notes        TEXT,
  status       VARCHAR(50) DEFAULT 'pending'
               CHECK (status IN ('pending','contacted','in_progress','completed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. blog_posts
```sql
CREATE TABLE blog_posts (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(500) NOT NULL,
  slug         VARCHAR(500) UNIQUE NOT NULL,
  excerpt      TEXT,
  content      TEXT,
  cover_image  VARCHAR(1000),
  category     VARCHAR(100),
  tags         TEXT[],
  author_name  VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE,
  views        INTEGER DEFAULT 0,
  read_time    INTEGER DEFAULT 5,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### 10. password_reset_tokens
```sql
CREATE TABLE password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes (للأداء)
```sql
CREATE INDEX idx_tool_logs_user_id ON tool_logs(user_id);
CREATE INDEX idx_tool_logs_created_at ON tool_logs(created_at DESC);
CREATE INDEX idx_tool_logs_tool_name ON tool_logs(tool_name);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_platform ON coupons(platform);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_is_published ON blog_posts(is_published);
CREATE INDEX idx_works_is_active ON works(is_active);
CREATE INDEX idx_works_sort_order ON works(sort_order);
CREATE INDEX idx_reviews_is_active ON reviews(is_active);
CREATE INDEX idx_tool_access_requests_user_id ON tool_access_requests(user_id);
CREATE INDEX idx_tool_access_requests_status ON tool_access_requests(status);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
```

### Admin الافتراضي (migration run.js)
```
Email: admin@adwat-altajer.sa
Password: Admin@2026
```

---

## 11. محرك الذكاء الاصطناعي

### المعمارية الكاملة (tools.js)

```
طلب المستخدم
    ↓
Phase 1: 6 collectors متوازية (Promise.allSettled)
    ├── scrapeStore()           → HTML + signals (Cheerio)
    ├── fetchSEOFiles()         → robots.txt + sitemap.xml
    ├── fetchPageSpeed()        → Core Web Vitals (Google API)
    ├── takeStoreScreenshots()  → لقطات (Puppeteer)
    ├── simulateBehavior()      → سلوك المستخدم (Playwright)
    └── checkSecurityHeaders()  → Security HTTP headers
    
    [أي collector فاشل → { success: false } لا يوقف الباقين]
    
    ↓
Phase 2: 6 AI calls متوازية (Promise.all + safe() wrapper)
    ├── aiCallCore()     → التقييم الأساسي 15 معيار
    ├── aiCallVisual()   → التحليل البصري + Gemini Vision
    ├── aiCallConversion() → CRO + Trust + Commerce
    ├── aiCallBusiness() → Business Intelligence + Competitors
    ├── aiCallOptimizer() → محسّن الكلمات والعناوين
    └── aiCallPsychology() → التحليل النفسي للمشترين
    
    [أي AI call فاشل → null (safe wrapper) ، لا يكسر التحليل]
    
    ↓
Phase 3: بناء الـ response الكامل وإرساله
```

### AI Provider Architecture
```javascript
// Primary: Gemini 2.0 Flash
aiGenerateGemini(prompt, maxTokens)
  └── 429 quota? → retry مرة واحدة بعد 3 ثوانٍ
      └── 429 مجدداً? → groqFallback() (emergency)
          └── Groq فاشل أيضاً? → null

// Vision: Gemini Vision API
aiAnalyzeWithVision(prompt, imageParts)
  └── فشل? → aiGenerateGemini() (text-only fallback)

// Fallback: Groq Llama 3.3-70b
groqFallback(prompt, maxTokens)
  └── يُستخدم فقط عند 429 من Gemini
```

### parseJSON — استخراج JSON من الـ response
```javascript
const parseJSON = (raw) => {
  const match = raw.match(/```json\s*([\s\S]+?)\s*```/) 
             || raw.match(/\{[\s\S]+\}/);
  return JSON.parse(match ? (match[1] || match[0]) : raw);
};
```

### safe() wrapper
```javascript
const safe = (fn, name) => 
  fn.catch(e => { 
    logger.warn(`${name} failed: ${e.message?.slice(0,80)}`); 
    return null; 
  });
```

### AI Models المستخدمة
| الأداة | النموذج | الغرض |
|--------|---------|-------|
| Store Analyzer | Gemini 2.0 Flash | 6 تحليلات متوازية |
| Store Analyzer | Gemini Vision | تحليل لقطات الشاشة |
| Product Description | Gemini 2.0 Flash | توليد المحتوى |
| Product Images | Hugging Face Flux Schnell | توليد الصور |
| WhatsApp Templates | Groq Llama 3.3-70b | سرعة عالية |
| Competitor Analyzer | Gemini 2.0 Flash | تحليل المنافس |
| Social Plan | Gemini 2.0 Flash | خطة المحتوى |
| Store Policies | Gemini 2.0 Flash | النصوص القانونية |
| Launch Campaign | Gemini 2.0 Flash | الاستراتيجية |
| AI Chat | Gemini 2.0 Flash | محادثة |

### حدود API المجانية
| Provider | الحد | التجديد |
|----------|------|---------|
| Gemini Free Tier | 1,500 طلب/يوم | منتصف الليل (Pacific) |
| Groq Free | 100,000 token/يوم | منتصف الليل |

### scrapeStore() — الـ Signals المستخرجة
```javascript
// الإشارات التجارية:
hasReviewSection, hasCountdown, hasUrgencyText
hasAddToCartBtn, hasWhatsAppFloat, hasShippingBadge
hasReturnPolicy, hasChatWidget, hasProductVideo
hasSizeGuide, hasTrustBadges, hasPaymentBadgesInFooter
hasCrossedPrice, hasFakeDiscountRisk, hasProductBadges
hasShippingInfo, hasReturnDays, hasLoyaltyProgram

// وسائل الدفع المكتشفة:
paymentMethods: ['Apple Pay', 'مدى', 'تابي', 'تمارا', 'COD', ...]

// معلومات القالب:
themeName, themeCode   (من قاعدة بيانات ~200 قالب سلة/زد)
detectedIndustry       (من detectIndustry() → pattern matching)
```

---

## 12. نظام المصادقة (Authentication)

### Flow الكامل
```
1. Register: POST /api/auth/register
   - Validation: email format | password min 6
   - Hash: bcrypt(password, 12)
   - Save to users table
   - Return: JWT token (7 days)

2. Login: POST /api/auth/login
   - Validation: email + password
   - Compare: bcrypt.compare(password, hash)
   - Return: JWT token (7 days)

3. Protected Requests:
   - Header: Authorization: Bearer {token}
   - Middleware: jwt.verify(token, JWT_SECRET)
   - يُضاف req.user = { id, email, name, is_admin, tools_access }

4. Password Reset:
   - POST /forgot-password: يُنشئ token مؤقت (1 ساعة) في DB
   - البريد يُرسل بـ Nodemailer (إذا SMTP مُعدّ)
   - POST /reset-password: يتحقق من token ويحدّث الـ hash
```

### JWT Payload
```javascript
{ id, email, name, is_admin, iat, exp }
```

### Token Storage (Frontend)
```javascript
localStorage.key: "tajer-token"
```

---

## 13. إعداد البيئة والتشغيل

### ملف .env الكامل
```env
# Database
DATABASE_URL=postgresql://postgres:Ahmed@localhost:5432/adwat_altajer

# JWT
JWT_SECRET=AdwatAltajer_2026_SuperSecret_JWT_Key_xZ9mK3pQ7rL

# Gemini (النموذج الرئيسي — aistudio.google.com/apikey)
GEMINI_API_KEY=AIzaSyBzKIjK787i3h4-4EvUtELhZgM9t3fRXQ4

# Groq (احتياطي تلقائي فقط عند نفاد Gemini)
GROQ_API_KEY=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

# PageSpeed Insights API
PAGESPEED_API_KEY=AIzaSyBcA_pX2Rx8c-HYr6IvuTfS9s3RLMI5rTQ

# Chrome للـ Screenshots
CHROME_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe

# Server
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5500

# Email (SMTP) — فارغ حالياً
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

### next.config.js
```javascript
// API Rewrites: كل /api/* → localhost:3001
rewrites: [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }]

// Remote Images (AI services):
'**.huggingface.co' | '**.hf.space' | 'replicate.delivery'
'oaidalleapiprodscus.blob.core.windows.net' | '**.cloudflare.com'
```

### تشغيل المشروع
```bash
# تثبيت الـ dependencies
npm install
cd backend && npm install && cd ..

# تشغيل قاعدة البيانات (PostgreSQL يجب أن يكون running)
cd backend && node migrations/run.js

# تشغيل كل شيء معاً
npm run dev:all
# Frontend → http://localhost:3000
# Backend  → http://localhost:3001

# أو منفصلاً:
npm run dev          # Frontend فقط
cd backend && node src/app.js   # Backend فقط
```

### التحقق من صحة الـ backend
```bash
curl http://localhost:3001/api/health
# Response: { "status": "ok" }
```

---

## 14. تاريخ التطوير — التعليمات الكاملة من A إلى Z

هذا القسم يوثّق **كل التعليمات التي أعطاها المستخدم للـ AI** خلال جلسات التطوير.

---

### الجلسة الأولى — بناء Store Analyzer v4

**التعليمات المُعطاة:**
1. تطوير Store Analyzer v4 بـ 17 علامة تبويب (كان قبلها أقل)
2. إضافة Gemini Vision لتحليل لقطات الشاشة بصرياً
3. إضافة تبويبة Psychology (التحليل النفسي للمشترين)
4. إضافة تبويبة Competitors (المنافسون المكتشفون)
5. إضافة Visual tab sub-sections:
   - `heroSection` — تحليل Hero Section
   - `productImages` — جودة صور المنتجات
   - `brandConsistency` — اتساق الهوية البصرية
   - `visualAttention` — توجيه انتباه الزائر

**ما تم بناؤه:**
- دالة `aiCallPsychology()` — الاستدعاء الـ 6 للـ AI
- دالة `aiCallVisual()` المُحسّنة مع Gemini Vision
- تحديث interfaces في `store-analyzer/page.tsx`
- إضافة `PsychologyData`, `BrandData`, `PricingData`, `Competitor` interfaces
- `Promise.allSettled` لـ data collectors

---

### الجلسة الثانية — إصلاح الأخطاء

**التعليمات المُعطاة:**
1. **"ولا عمل اي تحليل نهائي؟؟؟"** — التحليل كان يُرجع دائماً 60 (القيمة الافتراضية)
2. **"هل انتا متأكد انه التطوير على الاداة اللي داخل الموقع؟؟؟"** — تساؤل عن ما إذا كان الكود يُحدَّث
3. **"حدث خطأ — تجاوزت حد استخدام الذكاء الاصطناعي"** — رسالة خطأ واضحة

**ما اكتُشف:**
- الـ backend كان يشغّل الكود القديم (لم يُعاد تشغيله)
- Groq API استهلك 97,394/100,000 token يومي
- Gemini API (المفتاح القديم): quota يومية منتهية

**الإصلاح:**
```powershell
Stop-Process -Name "node" -Force    # إيقاف السيرفر القديم
node src/app.js                      # تشغيل الكود الجديد
```

---

### الجلسة الثالثة — إزالة Groq والبحث عن بديل

**التعليمات المُعطاة:**
> "مش عايز اعتمد على Groq نهائي استخدمات الادوات المناسبه و المطلوب مني اديب لك api kay بجيبه"

**مفاتيح Gemini التي جُربت:**
| المفتاح | الحساب | النتيجة |
|---------|--------|---------|
| `AIzaSyBa79MmglZTUtoQ8Bdg8ktM5po3usjBoQ4` | حساب Google أول | 429 quota منتهية |
| `AIzaSyBcA_pX2Rx8c-HYr6IvuTfS9s3RLMI5rTQ` | Google Cloud Console | 403 API not enabled |
| `AIzaSyBzKIjK787i3h4-4EvUtELhZgM9t3fRXQ4` | حساب Google جديد | 429 نفس المشكلة |

**السبب الجذري المكتشف:**
> Gemini Free Tier quota هي **per-project لا per-key** — كل المفاتيح من نفس المشروع تشارك نفس الـ 1,500 طلب/يوم.

**الحل المطبّق:**
- Groq أُعيد كـ **emergency fallback فقط** عند 429 من Gemini
- Logger يُظهر: `AI: Gemini 2.0 Flash (primary) + Groq (fallback) ✓`

---

### الجلسة الرابعة — المراجعة الشاملة

**التعليمات المُعطاة:**
> "سيء ل ابعد الحدود — المطلوب منك الان تنشء لي ملف فيه تفاصيل المشروع كامل مع مراجعة المشروع كامل و الشات كامل و تحديد كل الاشكاليات فقط و اعطائي الملف — سوي اختبار كامل للمنصة كاممله و حدد الاخطاء"

**ما تم:**
- مراجعة شاملة لكل ملف في المشروع
- إنشاء ملف `PROJECT_ISSUES.md` بتقرير مفصّل
- تصنيف الأخطاء: CRITICAL | HIGH | MEDIUM | LOW
- تطبيق جميع الإصلاحات

---

### الجلسة الخامسة — البدائل وهذا التوثيق

**التعليمات المُعطاة:**
> "في بدائل ؟" — سؤال عن بدائل Gemini API

**الإجابة المُقدَّمة:**
- Groq (موجود) — 100K token/يوم
- **Cerebras** (موصى به) — 60K token/دقيقة، مجاني
- OpenRouter — نماذج مجانية محدودة

> "انشء ملف بأسم all منفصل يكون فيه شرح كامل ما حدث من a الى z حرفيا"

**الناتج:** هذا الملف الذي تقرأه الآن.

---

## 15. المشاكل المكتشفة والإصلاحات

### جدول الإصلاحات الكامل

| الكود | المشكلة | الملف | الحالة |
|-------|---------|-------|--------|
| **C1** | `visionUsed` محسوبة من وجود screenshots لا من Vision API | `tools.js:888` | ✅ تم الإصلاح |
| **C2** | `Promise.all` للـ collectors — فشل واحد يُوقف الكل | `tools.js:864` | ✅ → `Promise.allSettled` |
| **C3** | `BrandData` interface ناقصة `premiumFeel` | `store-analyzer/page.tsx:39` | ✅ تم الإصلاح |
| **H1** | Competitor UI تقبل 5 منافسين والـ backend يدعم 1 | `competitor-analyzer/page.tsx:147` | ✅ حُدِّد بـ 1 |
| **H2** | `toneMap` ناقص 3 نبرات (professional, friendly, luxury) | `product-description/page.tsx:233` | ✅ تم الإكمال |
| **H3** | `detectedIndustry` بدون fallback للـ `category` | `tools.js:918` | ✅ fallback مضاف |
| **M1** | "توليد 4 صور" في الـ UI والحقيقة صورة واحدة | `product-images/page.tsx` | ✅ صُحِّح النص |
| **M2** | SMTP credentials فارغة — البريد لا يعمل | `backend/.env` | ⏳ ينتظر بيانات المستخدم |
| **M3** | `--font-arabic` CSS variable غير معرف | `globals.css:41` | ✅ معرّف |
| **M4** | Dead code: `geminiModel` و `geminiModelLarge` | `tools.js` | ✅ حُذف |
| **L1** | `logger` مُعرَّف مرتين (lines 4 و 523) | `tools.js` | ✅ مرة واحدة فقط |

---

### التفاصيل التقنية لكل إصلاح

**C1 — visionUsed:**
```javascript
// قبل (خاطئ — يحسب من الـ screenshots):
const visionUsed = !!(visual && screenshots.success && screenshots.pages?.length > 0);

// بعد (صحيح — من Vision API مباشرة):
const visionUsed = visual?.visionUsed || false;
// وفي aiCallVisual: return { ...result, visionUsed: true } عند نجاح Vision
```

**C2 — Promise.allSettled:**
```javascript
// قبل:
const [scraped, seoFiles, pageSpeed, screenshots, behavioral, security] =
  await Promise.all([scrapeStore(...), fetchSEOFiles(...), ...]);

// بعد:
const _collectors = await Promise.allSettled([
  scrapeStore(storeUrl),
  fetchSEOFiles(storeUrl),
  fetchPageSpeed(storeUrl),
  takeStoreScreenshots(storeUrl),
  simulateBehavior(storeUrl),
  checkSecurityHeaders(storeUrl),
]);
const [scraped, seoFiles, pageSpeed, screenshots, behavioral, security] =
  _collectors.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : (logger.warn(`collector[${i}] failed: ${r.reason?.message?.slice(0,60)}`), { success: false })
  );
```

**H2 — toneMap:**
```typescript
// قبل (ناقص):
const toneMap = { bold: "professional", emotional: "friendly" }

// بعد (كامل):
const toneMap = {
  professional: "professional",
  friendly:     "friendly",
  luxury:       "luxury",
  bold:         "professional",
  emotional:    "friendly"
}
```

**H3 — detectedIndustry:**
```javascript
// قبل:
const detectedIndustry = scraped.success ? scraped.detectedIndustry : null;

// بعد:
const detectedIndustry = scraped.success
  ? (scraped.detectedIndustry || category || null)
  : (category || null);
```

---

### المشاكل المتبقية (لم تُحلّ بعد)

#### M2 — SMTP (البريد الإلكتروني لا يعمل)
```env
SMTP_USER=    # يحتاج Gmail App Password
SMTP_PASS=    # يحتاج Gmail App Password
```
**الحل:** الذهاب إلى [myaccount.google.com/apppasswords] وإنشاء App Password

#### AI Quota Exhaustion
```
Gemini:  1,500 طلب/يوم (Free Tier) — يتجدد منتصف الليل Pacific
Groq:  100,000 token/يوم — يتجدد منتصف الليل

الحل الدائم: تفعيل Google Cloud Billing → Unlimited requests
```

---

### الخلاصة والحالة الحالية

| القسم | الحالة |
|-------|--------|
| Frontend — Next.js | ✅ جاهز |
| Backend — Express | ✅ جاهز |
| قاعدة البيانات | ✅ جاهزة |
| AI Engine | ✅ جاهز (تحتاج quota) |
| Auth System | ✅ جاهز |
| SMTP/Email | ⚠️ يحتاج إعداد |
| Gemini Quota | ⚠️ تتجدد يومياً |
| Deployment | 🔲 لم يُنفَّذ بعد |

---

*نهاية التوثيق — آخر تحديث: 2026-05-23*
