-- Migration 005: Add all tool_settings entries for every tool
INSERT INTO tool_settings (tool_name, display_name, is_paid, daily_free_limit) VALUES
  ('analyzer',        'محلل المتاجر',              false, 10),
  ('generator',       'مولّد المحتوى',             false, 10),
  ('image-gen',       'مولّد صور المنتجات',        false,  5),
  ('whatsapp',        'قوالب واتساب',              false,  5),
  ('competitor',      'محلل المنافسين',            false,  5),
  ('social-plan',     'خطة السوشيال ميديا',        false,  3),
  ('store-policies',  'سياسات المتجر',             false,  5),
  ('launch-campaign', 'حملة الإطلاق',              false,  3)
ON CONFLICT (tool_name) DO UPDATE
  SET display_name     = EXCLUDED.display_name,
      daily_free_limit = EXCLUDED.daily_free_limit;
