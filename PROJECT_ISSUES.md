# تقرير مراجعة المشروع الكامل — أدوات التاجر
**تاريخ المراجعة:** 2026-05-23  
**المراجع:** Claude Code (فحص آلي شامل)

---

## المشكلة الجذرية — AI Quota منتهية

**الأعراض الظاهرة:**
- التقييم العام يظهر دائماً **60** (القيمة الافتراضية)
- تفاصيل المعايير (15 محور) **فارغة**
- التوصيات، الذكاء، المنافسين — **كلها فارغة**

**السبب:**
| Provider | الحالة | وقت التجديد |
|----------|--------|------------|
| Groq | 97,394 / 100,000 token يومي | ~50 دقيقة |
| Gemini (key 1) | Quota يومية منتهية | منتصف الليل |
| Gemini (key 2 — حساب جديد) | نفس المشكلة — `GenerateRequestsPerDayPerProjectPerModel-FreeTier` | منتصف الليل |

**الحل الدائم:** تفعيل Google Cloud Billing → يرفع الحد من 1,500 طلب/يوم إلى عملياً unlimited

---

## الأخطاء المكتشفة — مرتبة حسب الأولوية

---

### 🔴 CRITICAL

#### C1 — visionUsed محسوبة بطريقة خاطئة
- **الملف:** `backend/src/routes/tools.js` (السطر ~885)
- **المشكلة:** `const visionUsed = !!(visual && screenshots.success && screenshots.pages?.length > 0)`
- يحسب من وجود screenshots لا من استخدام Vision API الفعلي
- **الإصلاح:** `const visionUsed = visual?.visionUsed || false` + إرجاع `visionUsed: true` من `aiCallVisual`
- **الحالة:** ✅ تم الإصلاح

#### C2 — Promise.all للـ data collectors يوقف التحليل كاملاً عند فشل أي collector
- **الملف:** `backend/src/routes/tools.js` (السطر ~864)
- **المشكلة:** إذا انتهت مهلة PageSpeed أو فشل scraping → 500 Error
- **الإصلاح:** تحويل إلى `Promise.allSettled()` مع `{ success: false }` كـ fallback
- **الحالة:** ✅ تم الإصلاح

#### C3 — BrandData interface ناقصة premiumFeel
- **الملف:** `app/dashboard/tools/store-analyzer/page.tsx` (السطر 39)
- **المشكلة:** `interface BrandData` لا تحتوي على `premiumFeel` لكن الكود يصل إليها
- **الإصلاح:** إضافة `premiumFeel?: "premium"|"professional"|"mid"|"budget"`
- **الحالة:** ✅ تم الإصلاح

---

### 🟠 HIGH

#### H1 — Competitor Analyzer يُرسل منافساً واحداً رغم أن الـ UI يقبل 5
- **الملف:** `app/dashboard/tools/competitor-analyzer/page.tsx` (السطر 167-168)
- **المشكلة:** `competitors.filter(...)[0]` — يأخذ الأول فقط
- **الإصلاح:** تعديل الـ UI ليوضح "منافس واحد فقط"
- **الحالة:** ✅ تم الإصلاح

#### H2 — Product Description: tone mapping ناقص
- **الملف:** `app/dashboard/tools/product-description/page.tsx` (السطر 233)
- **المشكلة:** `toneMap` يفتقد: professional, friendly, luxury → يُرسل `undefined`
- **الإصلاح:** خريطة كاملة لكل الـ tones
- **الحالة:** ✅ تم الإصلاح

#### H3 — detectedIndustry دائماً null بدون fallback
- **الملف:** `backend/src/routes/tools.js` (السطر ~915)
- **المشكلة:** لا يستخدم `category` كـ fallback عندما يفشل auto-detection
- **الإصلاح:** `scraped.detectedIndustry || category || null`
- **الحالة:** ✅ تم الإصلاح

---

### 🟡 MEDIUM

#### M1 — Product Images تعد المستخدم بـ 4 صور والـ backend يولّد 1
- **الملف:** `app/dashboard/tools/product-images/page.tsx` (السطر 326 و 675)
- **الحالة:** ✅ تم الإصلاح (تعديل النص)

#### M2 — SMTP credentials فارغة
- **الملف:** `backend/.env` (السطر 30-31)
- البريد الإلكتروني لن يعمل (تسجيل حسابات، استعادة كلمة المرور)
- **الإصلاح:** إضافة بيانات Gmail في .env
- **الحالة:** ⏳ ينتظر بيانات المستخدم

#### M3 — CSS variable `--font-arabic` غير معرف
- **الملف:** `tailwind.config.js` (السطر 12)
- **الإصلاح:** تعريف المتغير في globals.css
- **الحالة:** ✅ تم الإصلاح

#### M4 — Dead code: geminiModel و geminiModelLarge معرفتان وغير مستخدمتان
- **الملف:** `backend/src/routes/tools.js`
- **الحالة:** ✅ تم الحذف

---

### 🔵 LOW

#### L1 — logger يُعرَّف مرتين
- **الملف:** `backend/src/routes/tools.js`
- **الحالة:** ✅ تم الإصلاح

---

## توصيات إضافية

1. **Google Cloud Billing** — لرفع حد Gemini API من 1,500 إلى unlimited
2. **SMTP Setup** — إعداد Gmail App Password لتفعيل البريد
3. **Database backup** — لا يوجد آلية نسخ احتياطي للـ PostgreSQL
4. **.env في .gitignore** — التأكد من أن .env غير مرفوع لـ git

---

## حالة الأدوات بعد الإصلاح

| الأداة | الحالة |
|--------|--------|
| محلل المتاجر | ✅ يعمل — ينتظر تجديد quota |
| محلل المنافسين | ✅ تم إصلاح مشكلة multi-competitor |
| توليد وصف المنتج | ✅ تم إصلاح tone mapping |
| توليد صور المنتجات | ✅ تم تصحيح عدد الصور |
| قوالب واتساب | ✅ لا مشاكل |
| خطة السوشيال | ✅ لا مشاكل |
| سياسات المتجر | ✅ لا مشاكل |
| حملة الإطلاق | ✅ لا مشاكل |
