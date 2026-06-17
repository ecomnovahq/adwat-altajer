-- Migration 007: حالة ظهور الأداة (متاحة / مخفية / قريباً)
ALTER TABLE tool_settings
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- القيم المسموحة: active (متاحة) | hidden (مخفية) | coming_soon (قريباً)
-- نضمن أن أي صف قديم له قيمة صحيحة
UPDATE tool_settings SET status = 'active' WHERE status IS NULL OR status NOT IN ('active','hidden','coming_soon');

-- إضافة الأدوات المجانية (الحاسبة والتقويم) ليتحكم الأدمن في ظهورها
INSERT INTO tool_settings (tool_name, display_name, is_paid, daily_free_limit, status) VALUES
  ('calculator',    'حاسبة الأرباح', false, NULL, 'active'),
  ('calendar',      'تقويم المواسم', false, NULL, 'active'),
  ('merchant-path', 'مسار التاجر',   false, 5,    'active')
ON CONFLICT (tool_name) DO NOTHING;
