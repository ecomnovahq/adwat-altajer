/* هيدر موحّد لكل الصفحات — مصدر واحد للتناسق
   الترتيب: لوجو (يمين) · روابط (وسط) · أيقونات (شمال: حساب + بحث + تبديل الوضع) · زر القائمة (جوال)
   قائمة الجوال: درج جانبي من اليمين بعنوان "القائمة الرئيسية". */
(function () {
  // التقاط حدث التثبيت مبكّراً (قد يقع قبل بناء الهيدر)
  var _deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); _deferredInstall = e;
    var b = document.getElementById('xpInstall'); if (b) b.style.display = '';
  });
  window.addEventListener('appinstalled', function () {
    _deferredInstall = null;
    var b = document.getElementById('xpInstall'); if (b) b.style.display = 'none';
  });
  function init() {
    var p = location.pathname;
    var inPages = /\/pages\//.test(p);
    var root = inPages ? '' : 'pages/';
    var home = inPages ? '../index.html' : 'index.html';
    var file = (p.split('/').pop() || 'index.html').toLowerCase();

    // صفحات لها تخطيط مستقل (لوحة التحكم) — لا تُحقن الهيدر/الفوتر العام
    if (file === 'admin.html') return;

    var L = [
      { l: 'الرئيسية', h: home, f: 'index.html' },
      { l: 'الأدوات', h: root + 'tools.html', f: 'tools.html' },
      { l: 'الباقات', h: root + 'pricing.html', f: 'pricing.html' },
      { l: 'الكوبونات', h: root + 'coupons.html', f: 'coupons.html' },
      { l: 'المواسم', h: root + 'calendar.html', f: 'calendar.html' },
      { l: 'المدوّنة', h: root + 'blog.html', f: 'blog.html' },
      { l: 'عن المنصة', h: root + 'about.html', f: 'about.html' },
    ];
    // روابط تظهر للمسجّلين فقط
    try { if (localStorage.getItem('tajer-token')) {
      L.splice(5, 0, { l: 'نتائجي', h: root + 'history.html', f: 'history.html' });
      L.splice(6, 0, { l: 'رسائلي', h: root + 'messages.html', f: 'messages.html' });
    } } catch (e) {}
    var act = function (f) { return f === file ? ' class="active"' : ''; };
    var navHtml = L.map(function (x) { return '<a href="' + x.h + '"' + act(x.f) + '>' + x.l + '</a>'; }).join('');

    var loggedIn = false;
    try { loggedIn = !!localStorage.getItem('tajer-token'); } catch (e) {}
    var accountHref = root + (loggedIn ? 'account.html' : 'login.html');

    var logo = '<svg class="logo-svg" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg"><polygon points="50,4 93,30 93,110 50,136 7,110 7,30" fill="#6366f1"/><polygon class="logo-bg" points="7,30 50,4 50,70 7,70"/><polygon class="logo-bg" points="50,70 93,70 93,110 50,136"/></svg>';
    var icPerson = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    var icSearch = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    var icMoon = '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>';
    var icSun = '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    var icBurger = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
    var icRefresh = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>';
    var icInstall = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    var html =
      '<header class="xp-nav" id="xpNav"><div class="xp-nav-inner">' +
        '<div class="xp-lead">' +
          '<button class="xp-ic xp-burger" id="xpBurger" aria-label="القائمة">' + icBurger + '</button>' +
          '<a href="' + home + '" class="xp-logo">' + logo + '<span class="xp-logo-txt"><b>أدوات التاجر</b><i>Tajer Tools</i></span></a>' +
        '</div>' +
        '<nav class="xp-links">' + navHtml + '</nav>' +
        '<div class="xp-actions">' +
          '<div class="xp-refresh-wrap">' +
            '<button class="xp-ic" id="xpRefresh" aria-label="تحديث ومسح الكاش">' + icRefresh + '</button>' +
            '<div class="xp-refresh-pop" id="xpRefreshPop">' +
              '<button id="xpRefreshNow" type="button">تحديث الآن ومسح الكاش</button>' +
            '</div>' +
          '</div>' +
          '<a href="' + accountHref + '" class="xp-ic" aria-label="حسابي">' + icPerson + '</a>' +
          '<button class="xp-ic" id="xpSearch" aria-label="بحث">' + icSearch + '</button>' +
          '<button class="xp-ic xp-install" id="xpInstall" aria-label="تثبيت التطبيق" title="تثبيت التطبيق" style="display:none;">' + icInstall + '</button>' +
          '<button class="xp-ic xp-theme" id="xpTheme" aria-label="تبديل الوضع">' + icMoon + icSun + '</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="xp-drawer" id="xpDrawer">' +
        '<div class="xp-drawer-head"><span>القائمة الرئيسية</span><button id="xpClose" aria-label="إغلاق">✕</button></div>' +
        '<nav class="xp-drawer-links">' + navHtml + '</nav>' +
      '</div>' +
      '<div class="xp-backdrop" id="xpBackdrop"></div>';

    // أزل الهيدر القديم (الرئيسية والصفحات) دون المساس بالتنقّل الجانبي
    document.querySelectorAll('nav.main-nav, #mainNav, nav.nav').forEach(function (n) { n.remove(); });
    document.body.insertAdjacentHTML('afterbegin', html);

    // تبديل الوضع
    var htmlEl = document.documentElement;
    document.getElementById('xpTheme').addEventListener('click', function () {
      var next = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', next);
      try { localStorage.setItem('tajer-theme', next); } catch (e) {}
    });

    // زر تثبيت التطبيق (PWA) — يظهر فقط لو المتصفح يدعم التثبيت
    var instBtn = document.getElementById('xpInstall');
    if (instBtn) {
      if (_deferredInstall) instBtn.style.display = '';
      instBtn.addEventListener('click', function () {
        if (!_deferredInstall) return;
        _deferredInstall.prompt();
        _deferredInstall.userChoice.finally(function () { _deferredInstall = null; instBtn.style.display = 'none'; });
      });
    }

    // الدرج الجانبي
    var drawer = document.getElementById('xpDrawer'), bd = document.getElementById('xpBackdrop');
    function open() { drawer.classList.add('open'); bd.classList.add('show'); }
    function close() { drawer.classList.remove('open'); bd.classList.remove('show'); }
    document.getElementById('xpBurger').addEventListener('click', open);
    document.getElementById('xpClose').addEventListener('click', close);
    bd.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });

    // ظل عند التمرير
    var nav = document.getElementById('xpNav');
    addEventListener('scroll', function () { nav.classList.toggle('scrolled', scrollY > 10); }, { passive: true });

    // ── زر التحديث / مسح الكاش ──
    var rBtn = document.getElementById('xpRefresh');
    var rPop = document.getElementById('xpRefreshPop');
    if (rBtn && rPop) {
      rBtn.addEventListener('click', function (e) { e.stopPropagation(); rPop.classList.toggle('open'); });
      document.addEventListener('click', function (e) { if (!rPop.contains(e.target) && e.target !== rBtn) rPop.classList.remove('open'); });
      var now = document.getElementById('xpRefreshNow');
      if (now) now.addEventListener('click', function () { if (window.tjRefreshNow) window.tjRefreshNow(); });
    }

    // ── فوتر موحّد ──
    var sIcons = {
      wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15l-1.4 5 5.1-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.4-5.6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5.1a6.5 6.5 0 01-1.9-1.2 7.2 7.2 0 01-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.5.2-.3v-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 00-.7.3 2.8 2.8 0 00-.9 2.1A4.9 4.9 0 008 12a11 11 0 004.2 3.7c.6.3 1 .4 1.4.5a3.4 3.4 0 001.5.1c.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1-.2-.1-.5-.2z"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2H21l-6.6 7.5L22 22h-6.2l-4.8-6.3L5.5 22H2.7l7-8L2 2h6.3l4.4 5.8zm-1 18h1.6L7.1 3.7H5.4z"/></svg>',
      ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
      tt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 3a5 5 0 005 5v3a8 8 0 01-5-1.7V15a6 6 0 11-6-6v3a3 3 0 103 3V3z"/></svg>',
      sn: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.3 0 4 1.8 4 4.2 0 .9 0 1.7-.1 2.3.5.3 1 .2 1.6-.1.7-.3 1.3.6.7 1.1-.5.4-1.2.7-1.8.9.3.9 1.6 2.6 3.4 3 .5.1.6.7.1 1-.6.3-1.5.4-1.9.5-.1.3 0 .8-.5.9-.4.1-1-.2-1.7-.2-.9 0-1.3.6-2.2 1.1-.5.3-1.1.5-1.9.5s-1.4-.2-1.9-.5c-.9-.5-1.3-1.1-2.2-1.1-.7 0-1.3.3-1.7.2-.5-.1-.4-.6-.5-.9-.4-.1-1.3-.2-1.9-.5-.5-.3-.4-.9.1-1 1.8-.4 3.1-2.1 3.4-3-.6-.2-1.3-.5-1.8-.9-.6-.5 0-1.4.7-1.1.6.3 1.1.4 1.6.1-.1-.6-.1-1.4-.1-2.3C8 3.8 9.7 2 12 2z"/></svg>',
      yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5a3 3 0 00-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 001 7.5 31 31 0 00.9 12 31 31 0 001 16.5a3 3 0 002.1 2.1C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 002.1-2.1A31 31 0 0023 12a31 31 0 00-.1-4.5zM10 15V9l5 3z"/></svg>',
      li: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 102.5 6 2.5 2.5 0 004.98 3.5zM2.9 8.3h4.2V21H2.9zM9.5 8.3h4v1.7h.1a4.4 4.4 0 014-2.2c4.2 0 5 2.8 5 6.4V21h-4.2v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9.5z"/></svg>'
    };
    var socials = [
      { l: 'واتساب', h: 'https://wa.me/966507060592', i: sIcons.wa },
      { l: 'إكس', h: 'https://twitter.com/sallatips', i: sIcons.x },
      { l: 'إنستقرام', h: 'https://instagram.com/sallatips', i: sIcons.ig },
      { l: 'تيك توك', h: 'https://www.tiktok.com/@sallatips', i: sIcons.tt },
      { l: 'سناب شات', h: 'https://www.snapchat.com/add/sallatips', i: sIcons.sn },
      { l: 'يوتيوب', h: 'https://www.youtube.com/@sallatips', i: sIcons.yt },
      { l: 'لينكدإن', h: 'https://www.linkedin.com/company/sallatips', i: sIcons.li }
    ];
    var socialHtml = socials.map(function (s) {
      return '<a href="' + s.h + '" target="_blank" rel="noopener" aria-label="' + s.l + '" title="' + s.l + '">' + s.i + '</a>';
    }).join('');
    var colTools = [
      { l: 'محلل المتجر', f: 'analyzer.html' }, { l: 'مولّد الأوصاف', f: 'generator.html' },
      { l: 'مسار التاجر', f: 'merchant-path.html' }, { l: 'حاسبة الربح', f: 'calculator.html' },
      { l: 'كل الأدوات', f: 'tools.html' }
    ].map(function (x) { return '<a href="' + root + x.f + '">' + x.l + '</a>'; }).join('');
    var colCompany = [
      { l: 'عن المنصة', f: 'about.html' }, { l: 'المدوّنة', f: 'blog.html' },
      { l: 'الكوبونات', f: 'coupons.html' }, { l: 'المواسم', f: 'calendar.html' }
    ].map(function (x) { return '<a href="' + root + x.f + '">' + x.l + '</a>'; }).join('');
    var year = new Date().getFullYear();
    var footHtml =
      '<footer class="xp-foot">' +
        '<div class="xp-foot-main">' +
          '<div class="xp-foot-brand">' +
            '<a href="' + home + '" class="xp-foot-logo">' + logo + '<span><b>أدوات التاجر</b><i>Tajer Tools</i></span></a>' +
            '<p class="xp-foot-blurb">منصّة أدوات ذكية لكل تاجر طموح من <b>خبراء المنصات</b> — حلّل متجرك، ولّد محتواك، وخطّط لمواسمك في مكان واحد.</p>' +
            '<div class="xp-foot-socials">' + socialHtml + '</div>' +
          '</div>' +
          '<div class="xp-foot-col"><h4>الأدوات</h4>' + colTools + '</div>' +
          '<div class="xp-foot-col"><h4>المنصة</h4>' + colCompany + '</div>' +
          '<div class="xp-foot-col"><h4>تواصل معنا</h4>' +
            '<a href="https://wa.me/966507060592" target="_blank" rel="noopener">واتساب: 0507060592</a>' +
            '<a href="https://salatips.com" target="_blank" rel="noopener">salatips.com</a>' +
            '<a href="' + root + 'about.html">الدعم والمساعدة</a>' +
          '</div>' +
        '</div>' +
        '<div class="xp-foot-bottom"><div class="xp-foot-bottom-in">' +
          '<span>© ' + year + ' أدوات التاجر — جميع الحقوق محفوظة.</span>' +
          '<span>صُنع بحب من <a href="https://salatips.com" target="_blank" rel="noopener">خبراء المنصات</a></span>' +
        '</div></div>' +
      '</footer>';
    document.querySelectorAll('footer').forEach(function (f) { f.remove(); });
    document.body.insertAdjacentHTML('beforeend', footHtml);

    // ── مسار التنقّل (breadcrumb) للصفحات الداخلية ──
    if (inPages) {
      var ph = document.querySelector('.page-header .container') || document.querySelector('.page-header');
      if (ph && !ph.querySelector('.xp-crumb')) {
        var cur = (document.title || '').split(/[—–-]/)[0].trim() || 'الصفحة';
        var homeIc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>';
        var crumb = '<nav class="xp-crumb" aria-label="مسار التنقّل">' +
          '<a href="' + home + '">' + homeIc + 'الرئيسية</a>' +
          '<span aria-hidden="true">›</span><b>' + cur + '</b></nav>';
        ph.insertAdjacentHTML('afterbegin', crumb);
      }
    }

    // ── البحث ──
    var INDEX = [
      { n: 'مساعد التاجر', d: 'مساعدك الشخصي الذكي لمتجرك', kw: 'مساعد ذكي شات متابعة تنبيهات متجر', f: 'assistant.html' },
      { n: 'محلل المتجر الذكي', d: 'تحليل متجرك على سلة وزد', kw: 'تحليل سيو اداء تقرير', f: 'analyzer.html' },
      { n: 'حاسبة صافي الربح', d: 'احسب أرباحك وهامشك', kw: 'ربح تكلفة عمولة حساب', f: 'calculator.html' },
      { n: 'مولّد الأوصاف', d: 'أوصاف منتجات احترافية', kw: 'وصف منتج محتوى كتابة', f: 'generator.html' },
      { n: 'تقويم المواسم', d: 'مناسبات تجارية سعودية', kw: 'مواسم رمضان تخفيضات تقويم', f: 'calendar.html' },
      { n: 'قوالب واتساب', d: 'رسائل جاهزة للعملاء', kw: 'واتساب رسائل ردود', f: 'whatsapp.html' },
      { n: 'محلل المنافسين', d: 'قارن متجرك بمنافسيك', kw: 'منافسين مقارنة', f: 'competitor.html' },
      { n: 'خطة السوشيال ميديا', d: 'خطة محتوى أسبوعية', kw: 'سوشيال انستقرام تيك توك خطة', f: 'social-plan.html' },
      { n: 'مولّد سياسات المتجر', d: 'إرجاع وشحن وخصوصية', kw: 'سياسات قانوني شروط', f: 'store-policies.html' },
      { n: 'حملة الإطلاق', d: 'خطة إطلاق منتج كاملة', kw: 'اطلاق حملة تسويق', f: 'launch-campaign.html' },
      { n: 'مولّد صور المنتجات', d: 'صور احترافية بالذكاء', kw: 'صور تصوير منتج', f: 'image-gen.html' },
      { n: 'مسار التاجر', d: 'خطة تأسيس أو تقييم متجرك', kw: 'مسار تقييم تأسيس مبتدئ', f: 'merchant-path.html' },
      { n: 'كل الأدوات', d: 'تصفّح كل أدوات المنصة', kw: 'ادوات', f: 'tools.html' },
      { n: 'الباقات والأسعار', d: 'خطط الاشتراك المناسبة لمتجرك', kw: 'باقات اشتراك سعر اسعار خطط ترقية', f: 'pricing.html' },
      { n: 'الكوبونات', d: 'كوبونات خصم حصرية', kw: 'كوبون خصم عرض', f: 'coupons.html' },
      { n: 'المدوّنة', d: 'مقالات ونصائح', kw: 'مقالات مدونة', f: 'blog.html' },
      { n: 'عن المنصة', d: 'من نحن وخبراء المنصات', kw: 'عن من نحن تواصل', f: 'about.html' },
      { n: 'رسائلي والدعم', d: 'تذاكر الدعم ومحادثاتك مع الفريق', kw: 'رسائل دعم تذاكر تذكرة مساعدة شكوى', f: 'messages.html' },
    ];
    var nrm = function (s) { return String(s || '').replace(/[إأآا]/g, 'ا').replace(/[ىي]/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '').toLowerCase(); };
    INDEX.forEach(function (x) { x.h = root + x.f; x._s = nrm(x.n + ' ' + x.d + ' ' + x.kw); });

    var icS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    var modal = document.createElement('div');
    modal.className = 'xp-search'; modal.id = 'xpSearchModal';
    modal.innerHTML =
      '<div class="xp-search-box">' +
        '<div class="xp-search-input">' + icS +
          '<input id="xpSearchInput" type="search" placeholder="ابحث عن أداة أو صفحة..." autocomplete="off">' +
          '<button id="xpSearchClose" aria-label="إغلاق">✕</button>' +
        '</div>' +
        '<div class="xp-search-results" id="xpSearchResults"></div>' +
      '</div>';
    document.body.appendChild(modal);
    var input = modal.querySelector('#xpSearchInput');
    var results = modal.querySelector('#xpSearchResults');

    function render(q) {
      var qn = nrm(q.trim());
      var list = qn ? INDEX.filter(function (x) { return x._s.indexOf(qn) > -1; }) : INDEX.slice(0, 6);
      if (!list.length) { results.innerHTML = '<div class="xp-search-empty">لا توجد نتائج لـ "' + q + '"</div>'; return; }
      results.innerHTML = list.map(function (x) {
        return '<a href="' + x.h + '" class="xp-search-item"><span class="xp-search-ic">' + icS + '</span>' +
          '<span class="xp-search-txt"><b>' + x.n + '</b><i>' + x.d + '</i></span></a>';
      }).join('');
    }
    function openS() { modal.classList.add('open'); render(''); setTimeout(function () { input.focus(); }, 50); }
    function closeS() { modal.classList.remove('open'); input.value = ''; }
    document.getElementById('xpSearch').addEventListener('click', openS);
    modal.querySelector('#xpSearchClose').addEventListener('click', closeS);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeS(); });
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeS();
      if (e.key === 'Enter') { var first = results.querySelector('a'); if (first) location.href = first.href; }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeS(); });

    // اختصار لوحة المفاتيح: Ctrl/⌘ + K لفتح البحث، / للفتح السريع
    document.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      var typing = /^(input|textarea|select)$/i.test((e.target.tagName || '')) || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); modal.classList.contains('open') ? closeS() : openS(); }
      else if (k === '/' && !typing && !modal.classList.contains('open')) { e.preventDefault(); openS(); }
    });
    // تلميح الاختصار داخل صندوق البحث
    var isMac = /mac/i.test(navigator.platform || navigator.userAgent);
    var hint = document.createElement('span');
    hint.className = 'xp-kbd-hint';
    hint.textContent = (isMac ? '⌘' : 'Ctrl') + ' K';
    var sib = modal.querySelector('#xpSearchClose');
    sib.parentNode.insertBefore(hint, sib);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // تسجيل Service Worker (PWA + إدارة الكاش — HTML دائماً أحدث نسخة)
  try {
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      var swRoot = location.pathname.indexOf('/pages/') !== -1 ? '../sw.js' : 'sw.js';
      window.addEventListener('load', function () { navigator.serviceWorker.register(swRoot).catch(function(){}); });
    }
  } catch (e) {}
})();
