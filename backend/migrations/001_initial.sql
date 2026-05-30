-- ============================================================
-- Adwat Altajer — Initial Schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(100) NOT NULL,
  discount    VARCHAR(50) NOT NULL,
  platform    VARCHAR(50) NOT NULL DEFAULT 'both',
  description TEXT,
  link        VARCHAR(500),
  category    VARCHAR(100) DEFAULT 'عام',
  expiry_date DATE,
  is_active   BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Works / Portfolio
CREATE TABLE IF NOT EXISTS works (
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

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
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

-- Bookings / Service Requests
CREATE TABLE IF NOT EXISTS bookings (
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

-- Tool usage logs
CREATE TABLE IF NOT EXISTS tool_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tool_name   VARCHAR(100) NOT NULL,
  input_data  JSONB,
  result_data JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Seed: Default admin (password: Admin@2026)
-- Run bcrypt separately or use the seed script
-- ============================================================

-- ============================================================
-- Seed: Sample coupons
-- ============================================================
INSERT INTO coupons (name, code, discount, platform, description, category, is_featured, link) VALUES
('سلة — باقة بلس', 'TAJER-SALLA20', '20%', 'salla', 'خصم 20% على أول باقة في سلة لكل تجار أدوات التاجر + شهر مجاني', 'منصات', true, 'https://salla.com'),
('زد — باقة النمو', 'TAJER-ZID15', '15%', 'zid', 'خصم 15% على باقة النمو في زد مع شهر مجاني للتجربة', 'منصات', true, 'https://zid.sa'),
('إضافة سلة — تقييمات المنتجات', 'TAJER-REV30', '30%', 'salla', 'خصم 30% على إضافة تقييمات المنتجات لرفع الثقة ومعدل التحويل', 'إضافات', false, null),
('إضافة زد — برنامج الولاء', 'TAJER-LOY25', '25%', 'zid', 'خصم 25% على إضافة برنامج الولاء لبناء قاعدة عملاء متكررين', 'إضافات', false, null),
('Canva Pro — تصميم المحتوى', 'TAJER-CANVA', 'شهر مجاني', 'both', 'جرّب Canva Pro مجاناً لمدة شهر لتصميم محتوى متجرك واعلاناتك', 'أدوات', false, null),
('Mailchimp — تسويق بالبريد', 'TAJER-MAIL', '20%', 'both', 'خصم 20% على خطة Mailchimp لإدارة قوائم البريد والنشرات الدورية', 'أدوات', false, null)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: Sample works
-- ============================================================
INSERT INTO works (title, category, badge_label, description, gradient_from, gradient_via, gradient_to, sort_order) VALUES
('متجر عطورات فاخرة — سلة', 'store', 'تصميم متجر', 'تصميم كامل على سلة مع هوية بصرية متكاملة وصفحات منتجات محسّنة لرفع معدل التحويل.', '#100e12', '#2d2b60', '#7f7ef8', 1),
('براند أزياء نسائية — X & Instagram', 'social', 'إدارة سوشيال', 'إدارة كاملة للحسابات: محتوى يومي، ريلز، وإعلانات ممولة أعطت 3x عائد على الإنفاق.', '#1e0a12', '#4a1840', '#c840a0', 2),
('متجر إلكترونيات — زد', 'seo', 'SEO وتحسين', 'تحسين محركات البحث لـ 200+ منتج أدى إلى زيادة الزيارات العضوية 180% في 3 أشهر.', '#0e1a10', '#1a4a20', '#4ade80', 3),
('حملة رمضان — مستلزمات منزلية', 'campaign', 'حملة موسمية', 'استراتيجية وتنفيذ حملة رمضانية شاملة حققت 5x نمو في المبيعات مقارنةً بالعام السابق.', '#100e1e', '#3d1270', '#a855f7', 4),
('براند مكملات غذائية سعودية', 'brand', 'هوية بصرية', 'هوية بصرية كاملة من الشعار للتغليف والموشن جرافيك، جاهزة للإطلاق الرسمي.', '#1a0e0a', '#5a2a10', '#ff6b35', 5),
('متجر عباءات — تقرير + تحسين', 'dev', 'تحليل وتطوير', 'تحليل شامل للمتجر وتطبيق توصيات رفعت سرعة التحميل 60% وتحسّن SEO بشكل ملحوظ.', '#0e1220', '#162050', '#3b82f6', 6),
('متجر مستحضرات تجميل — سلة', 'store', 'تصميم متجر', 'تصميم متجر متكامل على سلة بهوية بصرية فاخرة للمستحضرات النسائية مع تحسين صفحات المنتجات.', '#1a0e14', '#4a1430', '#e879a0', 7),
('إدارة محتوى صيدلية أونلاين', 'social', 'إدارة سوشيال', 'بناء حضور رقمي متكامل لصيدلية أونلاين مع محتوى طبي موثوق على X وإنستغرام.', '#0e1420', '#1a2a50', '#60a5fa', 8),
('هوية براند قهوة سعودية', 'brand', 'هوية بصرية', 'هوية بصرية كاملة لبراند قهوة سعودي متخصص في القهوة المختصة مع الشعار والمطبوعات.', '#1a1208', '#3d2a10', '#d97706', 9)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: Sample reviews
-- ============================================================
INSERT INTO reviews (name, store, platform, review_text, rating, avatar_letter) VALUES
('محمد العتيبي', 'متجر رويال عطورات · سلة', 'salla', 'فريق احترافي جداً، سلّموا تصميم المتجر في الوقت المحدد وجودة فوق التوقعات. متجري على سلة صار أحسن بكثير!', 5, 'م'),
('نورة الشمري', 'نورة ستور — عباءات فاخرة · زد', 'zid', 'ما توقعت إن تحليل المتجر يطلع بهالتفصيل! اكتشفت مشاكل كانت موجودة من سنتين. الأدوات هنا فعلاً مختلفة.', 5, 'ن'),
('أحمد الدوسري', 'تك ستور للإلكترونيات · زد', 'zid', 'استخدمت مولّد الأوصاف لـ 50 منتج في يوم واحد. وفّرت ساعات طويلة وكل الأوصاف احترافية وعربية سليمة.', 5, 'أ'),
('سارة القحطاني', 'جميلة ستور للعناية · سلة', 'salla', 'الكوبونات اللي لقيتها هنا وفّرت عليّ أكثر من 3000 ريال في أول شهر! شكراً لأدوات التاجر.', 5, 'س'),
('فيصل المالكي', 'فيصل للمكملات الغذائية · سلة', 'salla', 'تقويم المواسم ساعدني أخطط حملاتي 3 أشهر مسبقاً. رمضان هذا كان أحسن موسم في تاريخ متجري.', 5, 'ف'),
('رنا البقمي', 'رنا كوليكشن — أزياء · زد', 'zid', 'الخدمة الشخصية فوق الوصف، الفريق متابعني خطوة بخطوة لحد ما المتجر طلع بالشكل اللي حلمت فيه.', 5, 'ر')
ON CONFLICT DO NOTHING;
