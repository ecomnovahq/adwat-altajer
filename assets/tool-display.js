/* يطبّق إعدادات الأدوات من لوحة التحكم (إخفاء / قريباً / مدفوع / الترتيب) على بطاقات .tool-card
   يُستخدم في الصفحة الرئيسية وصفحة الأدوات معاً. */
(async function applyToolDisplay() {
  const cards = document.querySelectorAll('.tool-card');
  if (!cards.length || typeof api === 'undefined') return;

  let settings = [];
  try { settings = await api.getToolSettings(); } catch { return; }

  const map = {};
  settings.forEach((s, i) => {
    map[s.tool_name] = { status: s.status || 'active', paid: !!s.is_paid, order: s.sort_order ?? (i + 1) };
  });

  const addBadge = (card, text, bg, color) => {
    if (card.querySelector('.tj-tool-badge')) return;
    if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
    const b = document.createElement('span');
    b.className = 'tj-tool-badge';
    b.textContent = text;
    b.style.cssText = `position:absolute;top:1rem;left:1rem;background:${bg};color:${color};`
      + 'font-size:.68rem;font-weight:800;padding:.22rem .6rem;border-radius:999px;z-index:4;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,.18);';
    card.appendChild(b);
  };

  cards.forEach(card => {
    const href = card.getAttribute('href') || '';
    const tool = href.replace(/^.*\//, '').replace(/\.html.*$/, '');
    const cfg = map[tool];
    if (!cfg) return;

    // الترتيب (يعمل مع grid و flex)
    if (cfg.order != null) card.style.order = cfg.order;

    // مخفية → إخفاء تام
    if (cfg.status === 'hidden') { card.style.display = 'none'; return; }

    // قريباً → تعطيل + شارة
    if (cfg.status === 'coming_soon') {
      card.style.opacity = '.55';
      card.style.pointerEvents = 'none';
      card.removeAttribute('href');
      addBadge(card, 'قريباً', 'linear-gradient(135deg,#ea6a1a,#f97316)', '#fff');
      return;
    }

    // مدفوعة → شارة (الوصول نفسه محمي من الـ API)
    if (cfg.paid) addBadge(card, 'مدفوعة', 'linear-gradient(135deg,#e3c04b,#b8860b)', '#1a1300');
  });
})();
