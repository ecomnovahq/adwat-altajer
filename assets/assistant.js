const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const sc = v => v >= 80 ? '#22c55e' : v >= 55 ? '#f59e0b' : '#ef4444';
let _attach = null; // {text} أو {image}

// أيقونات SVG قابلة لإعادة الاستخدام
const _svg = p => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  target: _svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  bag: _svg('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
  file: _svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),
  bell: _svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
  check: _svg('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
  image: _svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  grid: _svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
  tag: _svg('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7" y2="7"/>'),
  trophy: _svg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>'),
};
// فرق قبل/بعد
function deltaBadge(cur, prev, higherBetter = true) {
  if (prev == null || cur == null || isNaN(cur) || isNaN(prev) || cur === prev) return '';
  const diff = cur - prev, up = diff > 0;
  const good = higherBetter ? up : !up;
  const col = good ? '#22c55e' : '#ef4444';
  return `<span class="as-kpi2-d" style="color:${col}">${up ? '▲' : '▼'} ${Math.abs(diff)}</span>`;
}
// حالة فارغة موحّدة
function emptyState(icon, title, sub) {
  return `<div class="as-empty"><div class="as-empty-ic">${icon || IC.check}</div><div class="as-empty-t">${e(title)}</div>${sub ? `<div class="as-empty-s">${e(sub)}</div>` : ''}</div>`;
}
// بطاقة KPI موحّدة
function kpiCard({ k, ic, value, label, delta }) {
  return `<div class="as-kpi2" style="--k:${k}">
    <div class="as-kpi2-top"><span class="as-kpi2-ic">${ic || ''}</span>${delta || ''}</div>
    <div class="as-kpi2-n" style="color:${k}">${value}</div>
    <div class="as-kpi2-l">${label}</div>
  </div>`;
}

function show(id){ ['asOnboard','asDash','asLoading'].forEach(x=>document.getElementById(x).style.display = x===id?(x==='asDash'?'block':'block'):'none'); }

// عدّاد تصاعدي للأرقام (micro-interaction) — يحرّك أول رقم في العنصر مع احترام تفضيل تقليل الحركة
function countUp(el) {
  if (el.dataset.counted) return;
  const node = el.firstChild;
  if (!node || node.nodeType !== 3) { el.dataset.counted = '1'; return; }
  const m = String(node.nodeValue).trim().match(/^-?\d[\d,]*$/);
  if (!m) { el.dataset.counted = '1'; return; }
  const target = parseInt(m[0].replace(/,/g, ''));
  el.dataset.counted = '1';
  if (!isFinite(target) || target === 0) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dur = 700, t0 = performance.now(), fmt = n => n.toLocaleString('en-US');
  (function step(t) {
    const p = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
    node.nodeValue = fmt(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
function animateCounts(root) { (root || document).querySelectorAll('.as-kpi2-n').forEach(countUp); }

// ─── شريط تقدّم المزامنة (تقدّم حقيقي من الخادم عبر polling) ───
const PROG_STAGES = [
  { p: 15, t: 'الاتصال بمتجرك' },
  { p: 28, t: 'اكتشاف الأقسام والصفحات' },
  { p: 50, t: 'فتح الأقسام وسحب المنتجات' },
  { p: 90, t: 'جلب تفاصيل كل منتج (صور/أسعار/وصف)' },
  { p: 95, t: 'تصنيف المنتجات بالذكاء' },
  { p: 100, t: 'تحليل المتجر وإعداد التوصيات' },
];
let _progTimer = null, _progVal = 0, _progReal = false;
function paintProg(pct, label) {
  if (pct < _progVal) pct = _progVal; // لا تتراجع
  _progVal = pct;
  document.getElementById('asProgFill').style.width = pct + '%';
 document.getElementById('asProgPct').textContent = pct + '%';
 document.getElementById('asProgStage').textContent = label || PROG_STAGES.find(s => pct <= s.p)?.t || '';
  let idx = PROG_STAGES.findIndex(s => pct < s.p);
  if (idx === -1) idx = PROG_STAGES.length - 1;
  PROG_STAGES.forEach((_, i) => {
    const el = document.getElementById('aps' + i); if (!el) return;
    el.classList.toggle('done', i < idx);
    el.classList.toggle('active', i === idx);
 const dot = el.querySelector('.dot'); if (dot) dot.textContent = i < idx ? '✓' : '';
  });
}
function startProg() {
  _progVal = 0; _progReal = false;
  document.getElementById('asProgOverlay').classList.add('on');
  document.getElementById('asProgSteps').innerHTML = PROG_STAGES.map((s, i) =>
    `<div class="as-prog-step" id="aps${i}"><span class="dot"></span>${s.t}</div>`).join('');
  paintProg(2, 'بدء المزامنة…');
  const tick = async () => {
    try {
      const p = await api.asstSyncProgress();
      if (p && p.done === false) {           // مزامنة قيد التشغيل فعلياً — تقدّم حقيقي
        _progReal = true;
        paintProg(Math.max(2, Math.min(98, p.pct || 0)), p.label);
      } else if (!_progReal) {               // بانتظار بدء المزامنة على الخادم — زحف بسيط حتى 10%
        paintProg(Math.min(10, _progVal + 1), 'تجهيز…');
      }
    } catch (_) { if (!_progReal) paintProg(Math.min(10, _progVal + 1), 'تجهيز…'); }
  };
  tick();
  _progTimer = setInterval(tick, 1200);
}
function stopProg(done) {
  clearInterval(_progTimer); _progTimer = null;
  if (done) {
    paintProg(100, 'اكتمل ');
    setTimeout(() => document.getElementById('asProgOverlay').classList.remove('on'), 600);
  } else {
    document.getElementById('asProgOverlay').classList.remove('on');
  }
}

let _stores = [], _maxStores = 1, _loadedOnce = false;
async function load() {
  if (!auth.isLoggedIn || !auth.isLoggedIn()) {
    document.getElementById('asLoading').innerHTML = `
      <div style="max-width:420px;margin:4rem auto;text-align:center;background:var(--bg-card);border:1px solid var(--line);border-radius:16px;padding:2.5rem 1.6rem;">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;color:var(--accent);">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <h2 style="font-size:1.25rem;margin:0 0 .5rem;">مساعد التاجر</h2>
        <p style="color:var(--ink-dim);font-size:.9rem;line-height:1.7;margin:0 0 1.4rem;">سجّل دخولك لتحليل متجرك، متابعة منافسيك، وتوليد محتواك — كل شيء في مكان واحد.</p>
        <a href="login.html" class="btn-primary" style="display:inline-flex;padding:.7rem 2rem;text-decoration:none;">تسجيل الدخول</a>
      </div>`;
    return;
  }
  if (!_loadedOnce) showSkeleton();
  let data; try { data = await api.asstGetStore(); } catch (_) { data = { store: null }; }
  _loadedOnce = true;
  _stores = data.stores || [];
  _maxStores = data.maxStores || 1;
  if (!data.store) {
    // لا متاجر بعد → شاشة الإضافة، مع توضيح حدّ الباقة
    show('asOnboard');
    const hint = document.getElementById('asOnboardHint');
 if (hint) hint.textContent = _maxStores > 1 ? `باقتك تسمح بـ ${_maxStores} متاجر.` : '';
    return;
  }
  api.setStore(data.activeStoreId || data.store.id);
  renderStoreSwitcher(data.activeStoreId || data.store.id);
  show('asDash');
  const bn = document.getElementById('asBottomNav'); if (bn) bn.style.display = '';
  renderDash(data); loadChat(); loadTasks();
  maybeStartTour();
}

// ─── Skeleton loaders ───
function showSkeleton() {
  const el = document.getElementById('asLoading'); if (!el) return;
  show('asLoading');
  const line = w => `<div class="sk sk-line" style="width:${w}"></div>`;
  el.innerHTML = `<div style="max-width:1280px;margin:0 auto;padding:1rem 0;">
    <div class="sk" style="height:44px;width:60%;border-radius:10px;margin-bottom:1rem;"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.8rem;margin-bottom:1.2rem;">
      ${Array(4).fill('<div class="sk sk-card"></div>').join('')}
    </div>
    <div class="sk" style="height:200px;border-radius:14px;margin-bottom:1rem;"></div>
    ${line('90%')}${line('80%')}${line('70%')}
  </div>`;
}

// ─── شريط التنقّل السفلي (جوال) ───
function bottomNav(name) {
  document.querySelectorAll('#asBottomNav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'chat') {
    document.querySelector('.as-grid')?.classList.remove('chat-off');
    document.querySelector('.as-chat')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  switchTab(name);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── قائمة الإجراءات في الرأس ───
function toggleActions(ev) { ev && ev.stopPropagation(); document.getElementById('asActionsMenu')?.classList.toggle('on'); }
// ─── طيّ/فتح لوحة المساعد على الديسكتوب ───
function toggleChatPanel() {
  const grid = document.querySelector('.as-grid'); if (!grid) return;
  const off = grid.classList.toggle('chat-off');
  const re = document.getElementById('asChatReopen');
  if (re) re.style.display = (off && window.innerWidth > 980) ? 'flex' : 'none';
}
document.addEventListener('click', ev => {
  const m = document.getElementById('asActionsMenu');
  if (m && m.classList.contains('on') && !ev.target.closest('.as-menu')) m.classList.remove('on');
});
// إظهار الرأس اللاصق عند التمرير
window.addEventListener('scroll', () => {
  const bar = document.getElementById('asStickyBar'), head = document.querySelector('.as-head');
  if (!bar || !head || document.getElementById('asDash').style.display === 'none') return;
  bar.classList.toggle('on', head.getBoundingClientRect().bottom < 56);
}, { passive: true });

// ─── جولة ترحيبية تفاعلية ───
const _TOUR = [
  { sel: '#asName', t: 'متجرك هنا', d: 'اسم متجرك ومنصّته. بدّل بين متاجرك من القائمة إن كان لديك أكثر من متجر.' },
  { sel: '#asKpis', t: 'مؤشّراتك السريعة', d: 'التقييم، عدد المنتجات، الصفحات، والتنبيهات — مع فرق التقدّم منذ آخر مزامنة.' },
  { sel: '#asGlobalSearch', t: 'بحث فوري', d: 'ابحث عن أي منتج أو إجراء وانتقل إليه مباشرة.' },
  { sel: '#asBell', t: 'الإشعارات', d: 'تنبيهات متجرك وردود خدمة العملاء في مكان واحد.' },
  { sel: '#asTabs', t: 'أقسام الأداة', d: 'لوحة المتجر · المنتجات · التسويق · تجربة العميل · خطة العمل — كل شيء منظّم.' },
  { sel: '#asSyncBtn', t: 'المزامنة', d: 'اضغط «مزامنة الآن» لتحديث منتجاتك وتحليلك في أي وقت.' },
  { sel: '.as-chat', t: 'مساعدك الذكي', d: 'اسأله عن أي شيء بخصوص متجرك، أرفق صورة أو تقريراً، أو اطلب التواصل مع الدعم.' },
];
let _tourIdx = 0;
function maybeStartTour() {
  try { if (localStorage.getItem('tj-asst-tour') === 'done') return; } catch {}
  setTimeout(() => startTour(), 700);
}
function startTour() {
  _tourIdx = 0;
  document.getElementById('tourOv').classList.add('on');
  showTourStep();
}
function endTour() {
  document.getElementById('tourOv').classList.remove('on');
  try { localStorage.setItem('tj-asst-tour', 'done'); } catch {}
}
function showTourStep() {
  const step = _TOUR[_tourIdx];
  const el = step && document.querySelector(step.sel);
  if (!el) { if (_tourIdx < _TOUR.length - 1) { _tourIdx++; return showTourStep(); } return endTour(); }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const spot = document.getElementById('tourSpot'), pop = document.getElementById('tourPop');
    const pad = 6;
    spot.style.cssText = `position:absolute;border-radius:12px;box-shadow:0 0 0 9999px rgba(8,6,18,.72);top:${r.top-pad}px;left:${r.left-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;transition:all .3s ease;pointer-events:none;`;
    const last = _tourIdx === _TOUR.length - 1;
    pop.innerHTML = `<h4>${e(step.t)}</h4><p>${e(step.d)}</p>
      <div class="tour-btns"><span class="tour-step">${_tourIdx+1}/${_TOUR.length}</span>
      <span><button onclick="endTour()" style="background:none;border:none;color:var(--ink-dim);cursor:pointer;font-family:var(--font-arabic);font-size:.82rem;">تخطّي</button>
      <button onclick="tourNext()" class="btn-primary" style="padding:.4rem 1.1rem;font-size:.83rem;">${last?'تم':'التالي'}</button></span></div>`;
    // ضع البطاقة أسفل العنصر أو أعلاه حسب المساحة
    let top = r.bottom + 12, left = Math.min(Math.max(12, r.left), window.innerWidth - 312);
    if (top + 160 > window.innerHeight) top = Math.max(12, r.top - 172);
    pop.style.top = top + 'px'; pop.style.left = left + 'px';
  }, 320);
}
function tourNext() { if (_tourIdx >= _TOUR.length - 1) return endTour(); _tourIdx++; showTourStep(); }
window.addEventListener('resize', () => { if (document.getElementById('tourOv')?.classList.contains('on')) showTourStep(); });

// قائمة تبديل المتاجر + زر "متجر جديد"
function renderStoreSwitcher(activeId) {
  const sel = document.getElementById('asStoreSwitch');
  const newBtn = document.getElementById('asNewStoreBtn');
  if (_stores.length > 1) {
    sel.style.display = '';
 sel.innerHTML = _stores.map(s => `<option value="${s.id}" ${s.id==activeId?'selected':''}>${e(s.store_name||s.store_url)}${s.latest_score!=null?` · ${s.latest_score}/100`:''}</option>`).join('');
  } else { sel.style.display = 'none'; }
  // زر متجر جديد يظهر إن كان تحت الحد
  newBtn.style.display = (_stores.length < _maxStores) ? '' : 'none';
}

function switchStore(id) {
  api.setStore(id);
  load();
}

// ─── أداء المتجر عبر Google Analytics ───
async function loadGa() {
  const body = document.getElementById('asGaBody'); if (!body) return;
  let st; try { st = await api.gaStatus(); } catch { body.innerHTML = ''; return; }
  if (!st.connected) {
    body.innerHTML = `
      <div style="font-size:.85rem;color:var(--ink-dim);line-height:1.8;margin-bottom:.6rem;">اربط Google Analytics 4 لترى زوّار متجرك ومصادرهم ومعدّل التحويل داخل المساعد مباشرة.</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <input id="asGaPid" class="as-input" placeholder="GA4 Property ID (أرقام فقط)" style="flex:1;min-width:160px;">
        <button class="btn-primary" style="padding:.5rem 1rem;" onclick="connectGa()">ربط</button>
      </div>
      <div style="font-size:.72rem;color:var(--ink-dim);margin-top:.5rem;">من GA4: الإعدارة ← إعدادات الخاصية ← Property ID. وأضف بريد حساب الخدمة كـ Viewer.</div>`;
    return;
  }
  body.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;">جارٍ جلب بيانات الأداء...</div>';
  try {
    const r = await api.gaReport();
    const kpi = (n, l) => `<div class="as-kpi"><div class="as-kpi-n">${n}</div><div class="as-kpi-l">${l}</div></div>`;
    const dur = s => s >= 60 ? Math.floor(s/60)+'د '+(s%60)+'ث' : s+'ث';
    body.innerHTML = `
      <div class="as-kpis">
        ${kpi(r.users.toLocaleString('ar-EG'),'زائر')}
        ${kpi(r.sessions.toLocaleString('ar-EG'),'جلسة')}
        ${kpi(r.pageViews.toLocaleString('ar-EG'),'مشاهدة صفحة')}
        ${kpi(r.conversions.toLocaleString('ar-EG'),'تحويل')}
        ${kpi(dur(r.avgDuration),'متوسط الجلسة')}
        ${kpi(r.bounceRate+'%','الارتداد')}
      </div>
      ${(r.sources||[]).length?`<div class="as-section-t" style="margin-top:.8rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg> مصادر الزيارات</div>${r.sources.map(s=>`<div class="as-pagerow"><span>${e(s.name)}</span><span style="color:var(--accent);font-weight:700;">${s.sessions.toLocaleString('ar-EG')}</span></div>`).join('')}`:''}
      ${(r.topPages||[]).length?`<div class="as-section-t" style="margin-top:.6rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3 .5 2 2 2 2 2 0-2-1-4 1-7z"/></svg> أكثر الصفحات زيارة</div>${r.topPages.map(p=>`<div class="as-pagerow"><span>${e(p.title)}</span><span style="color:var(--ink-dim);">${p.views.toLocaleString('ar-EG')}</span></div>`).join('')}`:''}
      <div style="text-align:left;margin-top:.6rem;"><button class="copy-icon-btn" onclick="disconnectGa()">فصل GA</button> <span style="color:var(--ink-dim);font-size:.72rem;">${e(r.range)}</span></div>`;
  } catch (err) {
    const m = err.message || 'تعذّر';
    body.innerHTML = `<div style="color:#f59e0b;font-size:.84rem;line-height:1.8;">${e(m)}</div>
      <div style="text-align:left;margin-top:.5rem;"><button class="copy-icon-btn" onclick="disconnectGa()">إعادة الربط</button></div>`;
  }
}
async function connectGa() {
  const pid = (document.getElementById('asGaPid').value||'').trim();
 if (!pid) { showError('مطلوب','أدخل Property ID'); return; }
 try { await api.gaConnect(pid); showToast('تم ربط Google Analytics','success'); loadGa(); }
 catch (err) { showError('تعذّر', err.message); }
}
async function disconnectGa() { try { await api.gaDisconnect(); } catch(_){} loadGa(); }

// (10) عرض استهلاك حدّ الذكاء الشهري
async function loadUsage() {
  const el = document.getElementById('asUsage'); if (!el) return;
  try {
    const u = await api.asstUsage();
    if (!u || u.quota === 0 || u.remaining == null) { el.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg> استخدام الذكاء: غير محدود'; return; }
    const pct = Math.min(100, Math.round(u.used / u.quota * 100));
    const col = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
    el.innerHTML = `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg> استخدام الذكاء هذا الشهر: <b style="color:${col}">${u.used}</b> / ${u.quota}
      <div style="height:6px;background:var(--line);border-radius:99px;margin-top:.3rem;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${col};"></div></div>`;
  } catch (_) { el.innerHTML = ''; }
}

// إضافة متجر جديد (يعيد استخدام شاشة الإضافة)
function openAddStore() {
 if (_stores.length >= _maxStores) { showError('وصلت للحد', `باقتك تسمح بـ ${_maxStores} متجر. احذف متجراً أو رقّ باقتك.`); return; }
  api.setStore(null);
  show('asOnboard');
  const hint = document.getElementById('asOnboardHint');
 if (hint) hint.textContent = `متجر ${_stores.length + 1} من ${_maxStores}.`;
  const back = document.getElementById('asBackToDash');
  if (back) back.style.display = _stores.length ? '' : 'none';
  setTimeout(() => document.getElementById('asUrl')?.focus(), 100);
}

let _lastData = null;
// ─── بطاقة الباقة الحالية + تحفيز الترقية للباقة الأعلى ───
async function renderPlanCard() {
  const el = document.getElementById('asPlanCard');
  if (!el) return;
  let st;
  try { st = await api.getSubscription(); } catch { return; }
  if (!st || st.status === 'admin') { el.style.display = 'none'; return; }
  const plans = (st.plans || []);
  if (!plans.length) { el.style.display = 'none'; return; }

  // الباقة الحالية + الأعلى منها
  let curIdx = -1;
  if (st.status === 'subscribed' && st.plan) curIdx = plans.findIndex(p => p.name === st.plan);
  const next = curIdx >= 0 ? (plans[curIdx + 1] || null) : (plans.find(p => p.badge) || plans[0]);

  const curLabel = st.status === 'subscribed' ? (st.plan || 'مشترك')
    : st.status === 'trial' ? `تجربة مجانية — باقٍ ${st.daysLeft} يوم`
    : st.status === 'expired' ? 'انتهت التجربة' : 'الباقة المجانية';

  const feats = (next && Array.isArray(next.features)) ? next.features : [];
  const priceTxt = next ? `${next.price} ${next.period === 'yearly' ? 'ر.س/سنة' : 'ر.س/شهر'}` : '';

  let html = `<div class="as-card as-plan">
    <div class="as-plan-head">
      <div><div class="as-plan-cur">باقتك الحالية</div><div class="as-plan-name">${e(curLabel)}</div></div>
      ${next ? `<span class="as-plan-badge">${e(next.badge || 'ترقية متاحة')}</span>` : '<span class="as-plan-badge ok">أعلى باقة ✓</span>'}
    </div>`;
  if (next) {
    html += `<div class="as-plan-up">
      <div class="as-plan-up-t">ارتقِ إلى باقة «${e(next.name)}» 🚀</div>
      <ul class="as-plan-feats">${feats.slice(0, 5).map(f => `<li>${e(f)}</li>`).join('')}</ul>
      <button class="btn-primary as-plan-btn" onclick="showUpgradeModal('upgrade')">ترقية الآن${priceTxt ? ' — ' + e(priceTxt) : ''}</button>
    </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
  el.style.display = '';
}

function renderDash(d) {
  _lastData = d;
  try { const u = (window.auth && auth.getUser && auth.getUser()) || {}; const gn = document.getElementById('asGreetName'); if (gn) gn.textContent = (u.name || '').split(' ')[0] || ''; } catch {}
  const s = d.store, rep = s.latest_report || {};
 document.getElementById('asName').textContent = s.store_name || 'متجرك';
  // الرأس اللاصق
  const skn = document.getElementById('asStickyName'); if (skn) skn.textContent = s.store_name || 'متجرك';
  const sks = document.getElementById('asStickyScore'); if (sks) { const c = sc(s.latest_score); sks.textContent = (s.latest_score ?? '—') + '/100'; sks.style.background = c + '22'; sks.style.color = c; }
  document.getElementById('asMeta').innerHTML = `${e(s.platform||'')} · <a href="${e(s.store_url)}" target="_blank" style="color:var(--accent)">فتح المتجر <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a> · آخر مزامنة: ${s.last_synced_at?new Date(s.last_synced_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}):'—'}`;
  // KPIs محسّنة (أيقونة + لون حالة + قبل/بعد)
  const totalProds = rep.productsCount ?? (d.products||[]).length;
  const limit = d.productLimit || rep.productLimit || 100;
  const sn = d.snapshots || [];
  const pm = (sn.length > 1 && sn[sn.length-2].report && sn[sn.length-2].report.metrics) || {};
  const prevScore = sn.length > 1 ? sn[sn.length-2].score : null;
  const pagesN = (d.pages||rep.pages||[]).length, alertsN = (d.alerts||[]).length;
  document.getElementById('asKpis').innerHTML =
      kpiCard({ k: sc(s.latest_score), ic: IC.target, value: (s.latest_score ?? '—'), label: 'التقييم العام', delta: deltaBadge(s.latest_score, prevScore, true) })
    + kpiCard({ k: 'var(--accent)', ic: IC.bag, value: `${totalProds}<span style="font-size:.8rem;color:var(--ink-dim);font-weight:400;"> / ${limit}</span>`, label: 'منتجات (حدّ الباقة)', delta: deltaBadge(totalProds, pm.products, true) })
    + kpiCard({ k: '#3b82f6', ic: IC.file, value: pagesN, label: 'صفحات المتجر', delta: deltaBadge(pagesN, pm.pages, true) })
    + kpiCard({ k: alertsN ? '#ef4444' : '#22c55e', ic: IC.bell, value: alertsN, label: 'تنبيهات مفتوحة', delta: '' });
  animateCounts(document.getElementById('asKpis'));
  renderPlanCard();
  // عدّادات التبويبات
 document.getElementById('asTabProdN').textContent = (d.products||[]).length;
 { const pn = document.getElementById('asTabPageN'); if (pn) pn.textContent = (d.pages||rep.pages||[]).length; }
 { const an = document.getElementById('asTabAlertN'); if (an) an.textContent = (d.alerts||[]).length || ''; }
  // منصات التواصل
  const soc = d.socials || rep.socials || {};
  const socKeys = Object.keys(soc).filter(k => soc[k]);
  if (socKeys.length) {
    document.getElementById('asSocialCard').style.display = '';
    const lbl = { instagram:'إنستقرام', twitter:'إكس (تويتر)', tiktok:'تيك توك', snapchat:'سناب شات', whatsapp:'واتساب', facebook:'فيسبوك', youtube:'يوتيوب', telegram:'تيليجرام' };
    document.getElementById('asSocials').innerHTML = socKeys.map(k=>`<a class="as-social" href="${e(soc[k])}" target="_blank" rel="noopener">${e(lbl[k]||k)} <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`).join('');
  }
  // مخطّط تطوّر التقييم (SVG خطّي بقيم وتواريخ)
  const snapRows = (d.snapshots||[]).filter(x=>x.score!=null);
  const trendEl = document.getElementById('asTrend');
  const datesEl = document.getElementById('asSparkDates');
  datesEl.innerHTML = '';
  renderScoreChart(snapRows);
  renderForecast(snapRows, s.target_score);
  if (snapRows.length > 1) {
    const sameDay = new Date(snapRows[0].created_at).toDateString() === new Date(snapRows[snapRows.length-1].created_at).toDateString();
    const fmtD = ts => { try { const dd = new Date(ts); return sameDay ? dd.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}) : dd.toLocaleDateString('ar-EG',{day:'numeric',month:'short'}); } catch(_){ return ''; } };
    const first = snapRows[0], last = snapRows[snapRows.length-1], prev = snapRows[snapRows.length-2];
    const diff = last.score - prev.score;
    const col = diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--ink-dim)';
    const txt = diff === 0 ? 'دون تغيير منذ آخر مزامنة' : `${diff>0?'▲ +':'▼ '}${Math.abs(diff)} نقطة منذ آخر مزامنة`;
    const sinceStart = last.score - first.score;
    const ssTxt = sinceStart !== 0 ? `<span style="color:${sinceStart>0?'#22c55e':'#ef4444'};">${sinceStart>0?'▲ +':'▼ '}${Math.abs(sinceStart)} منذ البداية</span>` : '';
    trendEl.innerHTML = `<span style="color:${col};font-weight:700;">${e(txt)}</span>${ssTxt?' · '+ssTxt:''}`;
  } else { trendEl.innerHTML = ''; }
  loadUsage();
  // alerts
  const al = d.alerts||[];
  document.getElementById('asAlerts').innerHTML = al.length ? al.map(a=>`<div class="as-alert ${e(a.severity)}">${a.severity==='high'?'':a.severity==='medium'?'':''} ${e(a.message)}</div>`).join('') : emptyState(IC.check, 'متجرك بخير', 'لا توجد تنبيهات حالياً');
  api.asstAlertsSeen().catch(()=>{});
  // recs
  document.getElementById('asRecs').innerHTML = (rep.recommendations||[]).map(r=>`<li>${e(r)}</li>`).join('') || '<li style="color:var(--ink-dim)">—</li>';

  // أقسام المتجر
  const cats = d.categories || rep.categories || [];
  if (cats.length) {
    document.getElementById('asCatsCard').style.display = '';
 document.getElementById('asCatsCount').textContent = `(${cats.length})`;
    document.getElementById('asCats').innerHTML = cats.map(c=>`<span class="as-suggest"><button onclick="document.getElementById('asProdCat').value='${e(c.replace(/'/g,''))}';renderProds(1)" style="background:var(--bg-card);border:1px solid var(--line);color:var(--ink-dim);border-radius:99px;padding:.3rem .8rem;font-size:.78rem;cursor:pointer;font-family:var(--font-arabic);">${e(c)}</button></span>`).join('');
  }
  // قائمة منسدلة للأقسام
  const catSel = document.getElementById('asProdCat');
 catSel.innerHTML = '<option value="">كل الأقسام</option>' + cats.map(c=>`<option value="${e(c)}">${e(c)}</option>`).join('');

  // صفحات المتجر (مصنّفة)
  const pages = d.pages || rep.pages || [];
 document.getElementById('asPagesCount').textContent = `(${pages.length})`;
  document.getElementById('asPages').innerHTML = pages.length
    ? pages.map(pg => {
        const u = typeof pg === 'string' ? pg : pg.url;
        const nm = (typeof pg === 'object' && pg.name) ? pg.name : (u.replace(/^https?:\/\/[^/]+\//,'').replace(/\/$/,'') || 'الرئيسية');
        const kind = (typeof pg === 'object' && pg.kind) ? pg.kind : '';
        return `<div class="as-pagerow"><a href="${e(u)}" target="_blank" rel="noopener" title="${e(u)}">${e(nm)}</a>${kind?`<span class="as-pagekind">${e(kind)}</span>`:''}</div>`;
      }).join('')
    : emptyState(IC.file, 'لم نكتشف صفحات', 'جرّب «مزامنة الآن» لإعادة الفحص');

  // المنتجات (مع فلترة وتصفّح)
  _allProds = d.products || [];
  renderProds(1);
  renderStats(_allProds, cats);
  renderAnalysis(cats);
  renderHealth(d, cats);
  renderAudit(d);
  renderSettings(d);
  renderVisuals(cats);
  renderAchievements(d);
  renderExpertInsights(d);
  renderSmartInsights(d);
  _gaPromise = null; // إعادة جلب بيانات GA لكل تحميل
  renderHero(d);
  renderOverviewVisits();
  renderBell();
  refreshBell();
  loadGa();
  ['asProdSearch','asProdCat','asProdFilter'].forEach(id=>{
    const el=document.getElementById(id); el.oninput=()=>renderProds(1); el.onchange=()=>renderProds(1);
  });
}

// ─── إحصائيات المتجر ───
function renderStats(prods, cats) {
  const el = document.getElementById('asStats'); if (!el) return;
  const n = prods.length || 0;
  const withDesc = prods.filter(p => p.has_description).length;
  const withImg = prods.filter(p => prodImages(p).length).length;
  const prices = prods.map(p => parseFloat(p.price)).filter(v => !isNaN(v) && v > 0);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const min = prices.length ? Math.min(...prices) : 0, max = prices.length ? Math.max(...prices) : 0;
  const pct = (x) => n ? Math.round(x / n * 100) : 0;
  // فرق قبل/بعد من اللقطات
  const sn = (_lastData && _lastData.snapshots) || [];
  const pm = (sn.length > 1 && sn[sn.length-2].report && sn[sn.length-2].report.metrics) || {};
  const pPct = (cur, tot) => tot ? Math.round(cur / tot * 100) : 0;
  const descDelta = pm.products ? deltaBadge(pct(withDesc), pPct(pm.withDesc, pm.products), true) : '';
  const imgDelta = pm.products ? deltaBadge(pct(withImg), pPct(pm.withImg, pm.products), true) : '';
  el.innerHTML =
      kpiCard({ k: pct(withDesc) >= 80 ? '#22c55e' : '#f59e0b', ic: IC.check, value: pct(withDesc) + '%', label: 'منتجات لها وصف', delta: descDelta })
    + kpiCard({ k: pct(withImg) >= 80 ? '#22c55e' : '#f59e0b', ic: IC.image, value: pct(withImg) + '%', label: 'منتجات لها صورة', delta: imgDelta })
    + kpiCard({ k: 'var(--accent)', ic: IC.grid, value: (cats||[]).length, label: 'عدد الأقسام', delta: deltaBadge((cats||[]).length, pm.categories, true) })
    + kpiCard({ k: '#3b82f6', ic: IC.tag, value: `<span style="font-size:1.1rem">${avg||'—'}</span>`, label: 'متوسط السعر (ر.س)', delta: '' })
    + kpiCard({ k: '#3b82f6', ic: IC.tag, value: `<span style="font-size:1rem">${prices.length?min+'-'+max:'—'}</span>`, label: 'نطاق السعر', delta: '' })
    + kpiCard({ k: (n-withDesc) ? '#ef4444' : '#22c55e', ic: IC.bag, value: (n - withDesc), label: 'بحاجة وصف', delta: '' });
}

// ─── توقّع مسار التقييم (انحدار خطّي على اللقطات التاريخية) ───
function renderForecast(rows, target) {
  const el = document.getElementById('asForecast'); if (!el) return;
  if (!rows || rows.length < 2) { el.innerHTML = ''; return; }
  // نقاط (أيام منذ أول لقطة, التقييم)
  const t0 = new Date(rows[0].created_at).getTime();
  const pts = rows.map(r => [(new Date(r.created_at).getTime() - t0) / 86400000, r.score]);
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
  const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
  const denom = n * sxx - sx * sx;
  const cur = rows[rows.length - 1].score;
  const lastDay = pts[n - 1][0];
  let html = '';
  if (Math.abs(denom) < 1e-6) { el.innerHTML = ''; return; }
  const slope = (n * sxy - sx * sy) / denom;          // نقاط/يوم
  const intercept = (sy - slope * sx) / n;
  const per30 = slope * 30;
  const proj30 = Math.max(0, Math.min(100, Math.round(intercept + slope * (lastDay + 30))));
  const trendCol = per30 > 1 ? '#22c55e' : per30 < -1 ? '#ef4444' : 'var(--ink-dim)';
  const arrow = per30 > 1 ? '▲' : per30 < -1 ? '▼' : '◆';
  let line = `<span style="color:${trendCol};font-weight:700;">${arrow} بالوتيرة الحالية: ${proj30}/100 خلال 30 يوم</span> (${per30 >= 0 ? '+' : ''}${Math.round(per30)} نقطة/شهر تقريبًا)`;
  // متى نصل للهدف؟
  if (target && cur < target) {
    if (slope > 0.05) {
      const daysToTarget = Math.ceil((target - cur) / slope);
      if (daysToTarget <= 365) line += `<br><span style="color:var(--accent);">تصل لهدفك (${target}) خلال ~${daysToTarget} يوم بالوتيرة الحالية.</span>`;
      else line += `<br><span style="color:#d97706;">الوتيرة الحالية بطيئة جدًا لبلوغ هدفك (${target}) — كثّف التحسينات.</span>`;
    } else {
      line += `<br><span style="color:#d97706;">تقييمك لا يتقدّم نحو هدفك (${target}) — راجع توصيات «أولوياتك».</span>`;
    }
  } else if (target && cur >= target) {
    line += `<br><span style="color:#22c55e;">تجاوزت هدفك (${target}) — ارفع الهدف للحفاظ على الزخم.</span>`;
  }
  html = `<div style="font-size:.8rem;line-height:1.8;background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.5rem .7rem;">
    <div style="display:flex;align-items:center;gap:.35rem;font-weight:700;font-size:.78rem;margin-bottom:.2rem;color:var(--ink-dim);"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:.9em;height:.9em;"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 3 5-6"/></svg> توقّع المسار</div>
    ${line}</div>`;
  el.innerHTML = html;
}

// ─── مخطّط تطوّر التقييم (SVG: مساحة + خط + نقاط + قيم + تواريخ) ───
function renderScoreChart(rows) {
  const el = document.getElementById('asSpark'); if (!el) return;
  el.style.height = 'auto'; el.style.display = 'block';
  if (!rows || rows.length < 2) {
    el.innerHTML = '<div style="color:var(--ink-dim);font-size:.82rem;padding:.6rem 0;">سيظهر مخطّط التطوّر بعد مزامنتين أو أكثر — كل مزامنة تُضيف نقطة جديدة.</div>';
    return;
  }
  const n = rows.length, scores = rows.map(r => r.score);
  const lo = Math.max(0, Math.min(...scores) - 8), hi = Math.min(100, Math.max(...scores) + 8) || 100;
  const span = Math.max(1, hi - lo);
  const W = 600, H = 150, padX = 26, padT = 26, padB = 28;
  const x = i => n === 1 ? W / 2 : padX + i * (W - 2 * padX) / (n - 1);
  const y = v => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const pts = rows.map((r, i) => [x(i), y(r.score)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${pts[n-1][0].toFixed(1)} ${H-padB} L ${pts[0][0].toFixed(1)} ${H-padB} Z`;
  const sameDay = new Date(rows[0].created_at).toDateString() === new Date(rows[n-1].created_at).toDateString();
  const lbl = ts => { const d = new Date(ts); return sameDay ? d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}) : d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'}); };
  const every = n <= 8 ? 1 : Math.ceil(n / 6);
  const sc = v => v >= 80 ? '#22c55e' : v >= 55 ? '#f59e0b' : '#ef4444';
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;font-family:inherit;">
    <defs><linearGradient id="scGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".30"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <line x1="${padX}" y1="${y(lo)}" x2="${W-padX}" y2="${y(lo)}" stroke="var(--line)" stroke-width="1"/>
    <path d="${area}" fill="url(#scGrad)"/>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p, i) => {
      const showLbl = (i % every === 0) || i === n - 1;
      return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===n-1?5:3.5}" fill="${sc(rows[i].score)}" stroke="var(--bg-alt)" stroke-width="2" style="cursor:pointer;"><title>التقييم ${rows[i].score}/100 · ${e(lbl(rows[i].created_at))}</title></circle>`
        + (n <= 12 ? `<text x="${p[0].toFixed(1)}" y="${(p[1]-9).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${rows[i].score}</text>` : '')
        + (showLbl ? `<text x="${p[0].toFixed(1)}" y="${H-9}" text-anchor="middle" font-size="9" fill="var(--ink-dim)">${e(lbl(rows[i].created_at))}</text>` : '');
    }).join('')}
  </svg>`;
}

// ─── تحليل بصري: دائري للأقسام + أشرطة الجاهزية ───
const _palette = ['#7c3aed','#22c55e','#f59e0b','#3b82f6','#ec4899','#06b6d4','#ef4444','#a3a3a3'];
function renderVisuals(cats) {
  const prods = _allProds || [];
  // توزيع الأقسام
  const byCat = {};
  prods.forEach(p => { const c = p.category || 'بدون قسم'; byCat[c] = (byCat[c] || 0) + 1; });
  let entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  let top = entries.slice(0, 6);
  const restN = entries.slice(6).reduce((s, x) => s + x[1], 0);
  if (restN) top.push(['أخرى', restN]);
  const total = prods.length || 1;
  const donut = document.getElementById('asCatDonut');
  if (top.length) {
    const R = 52, C = 2 * Math.PI * R; let off = 0;
    const arcs = top.map((x, i) => {
      const frac = x[1] / total, len = frac * C;
      const seg = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${_palette[i % _palette.length]}" stroke-width="14" stroke-dasharray="${len.toFixed(1)} ${(C-len).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 60 60)"/>`;
      off += len; return seg;
    }).join('');
    const legend = top.map((x, i) => `<div style="display:flex;align-items:center;gap:.4rem;font-size:.76rem;margin:.15rem 0;"><span style="width:10px;height:10px;border-radius:3px;background:${_palette[i % _palette.length]};flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e(x[0])}</span><b>${x[1]}</b></div>`).join('');
    donut.innerHTML = `<svg viewBox="0 0 120 120" width="120" height="120" style="max-width:100%;"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="14"/>${arcs}<text x="60" y="56" text-anchor="middle" font-size="20" font-weight="800" fill="var(--ink)">${prods.length}</text><text x="60" y="72" text-anchor="middle" font-size="9" fill="var(--ink-dim)">منتج</text></svg><div style="margin-top:.5rem;text-align:right;">${legend}</div>`;
  } else { donut.innerHTML = '<div style="color:var(--ink-dim);font-size:.82rem;">لا أقسام بعد.</div>'; }
  // أشرطة الجاهزية
  const n = prods.length || 1;
  const pc = x => Math.round(x / n * 100);
  const bars = [
    ['وصف', pc(prods.filter(p => p.has_description).length)],
    ['صورة', pc(prods.filter(p => prodImages(p).length).length)],
    ['SEO', pc(prods.filter(p => p.seo).length)],
    ['قسم', pc(prods.filter(p => p.category).length)],
  ];
  document.getElementById('asReadinessBars').innerHTML = '<div style="font-size:.8rem;color:var(--ink-dim);margin-bottom:.5rem;">نِسَب جاهزية المنتجات</div>' + bars.map(b => {
    const col = b[1] >= 80 ? '#22c55e' : b[1] >= 50 ? '#f59e0b' : '#ef4444';
    return `<div style="margin-bottom:.55rem;"><div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:.2rem;"><span>${b[0]}</span><b style="color:${col}">${b[1]}%</b></div><div style="height:8px;background:var(--bg);border:1px solid var(--line);border-radius:99px;overflow:hidden;"><div style="height:100%;width:${b[1]}%;background:${col};border-radius:99px;"></div></div></div>`;
  }).join('');
}

// ─── إنجازات الأسبوع (الفرق عن آخر لقطة) ───
function renderAchievements(d) {
  const card = document.getElementById('asAchieveCard'), box = document.getElementById('asAchieve');
  const sn = d.snapshots || [];
  if (sn.length < 2) { card.style.display = 'none'; return; }
  const cur = (sn[sn.length-1].report && sn[sn.length-1].report.metrics) || {};
  const prev = (sn[sn.length-2].report && sn[sn.length-2].report.metrics) || {};
  const items = [];
  const add = (curV, prevV, label, suffix) => { const diff = (curV||0) - (prevV||0); if (diff > 0) items.push(`+${diff} ${label}`); };
  add(cur.withDesc, prev.withDesc, 'وصف جديد');
  add(cur.withImg, prev.withImg, 'صورة');
  add(cur.products, prev.products, 'منتج');
  add(cur.categories, prev.categories, 'قسم');
  const sd = (sn[sn.length-1].score||0) - (sn[sn.length-2].score||0);
  if (sd > 0) items.unshift(`+${sd} نقطة تقييم`);
  if (!items.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  box.innerHTML = items.map(t => `<span style="background:color-mix(in srgb,#22c55e 15%,transparent);color:#16a34a;border-radius:99px;padding:.35rem .8rem;font-size:.82rem;font-weight:700;">${e(t)}</span>`).join('');
}

// ─── الفحص التقني للمتجر (5 محاور) ───
function renderAudit(d) {
  const card = document.getElementById('asAuditCard'), box = document.getElementById('asAudit');
  const a = (d.store && d.store.latest_report && d.store.latest_report.audit) || null;
  if (!a) { card.style.display = 'none'; return; }
  card.style.display = '';
  const ov = document.getElementById('asAuditOverall');
  if (ov && a.overall != null) { const c = sc(a.overall); ov.textContent = a.overall + '/100'; ov.style.color = c; }
  const ICA = {
    payment: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    seo: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    ux: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
    trust: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    performance: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  };
  const rows = [
    ['payment', 'طرق الدفع', a.payment],
    ['seo', 'SEO والظهور في جوجل', a.seo],
    ['ux', 'تجربة المستخدم والتصميم', a.ux],
    ['trust', 'الثقة والتوثيق', a.trust],
    ['performance', 'أداء الموقع (Core Web Vitals)', a.performance],
  ];
  box.innerHTML = rows.map(([k, lbl, sub], i) => {
    if (!sub || sub.score == null) return k === 'performance'
      ? `<div class="as-audit-row" style="opacity:.6;"><div class="as-audit-h">${ICA[k]} <span>${lbl}</span><span style="margin-inline-start:auto;font-size:.75rem;color:var(--ink-dim);">غير متاح</span></div></div>`
      : '';
    const col = sc(sub.score);
    const extra = k === 'payment' && sub.methods && sub.methods.length ? `طرق مكتشفة: ${sub.methods.map(e).join('، ')}` : '';
    const cwv = k === 'performance' ? [sub.lcp && `LCP ${sub.lcp}`, sub.cls && `CLS ${sub.cls}`, sub.fcp && `FCP ${sub.fcp}`].filter(Boolean).join(' · ') : '';
    const issues = (sub.issues || []).slice(0, 3);
    return `<div class="as-audit-row">
      <div class="as-audit-h" onclick="this.parentElement.classList.toggle('open')">
        ${ICA[k]} <span>${lbl}</span>
        <b style="color:${col};margin-inline-start:auto;">${sub.score}%</b>
        <svg class="ic as-audit-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="as-audit-bar"><div style="width:${sub.score}%;background:${col};"></div></div>
      <div class="as-audit-body">
        ${extra ? `<div style="font-size:.8rem;color:var(--ink-dim);margin:.3rem 0;">${e(extra)}</div>` : ''}
        ${cwv ? `<div style="font-size:.8rem;color:var(--ink-dim);margin:.3rem 0;">${e(cwv)}</div>` : ''}
        ${(sub.pass && sub.pass.length) ? `<div style="font-size:.8rem;color:#16a34a;margin:.2rem 0;">✓ ${sub.pass.map(e).join(' · ')}</div>` : ''}
        ${issues.length ? `<ul class="as-list" style="font-size:.82rem;margin:.3rem 0;">${issues.map(x => `<li style="color:#d97706;">${e(x)}</li>`).join('')}</ul>` : '<div style="font-size:.8rem;color:#16a34a;">لا توجد مشاكل في هذا المحور</div>'}
      </div>
    </div>`;
  }).join('');
}

// ─── الأهداف والأتمتة ومراقبة المنافس ───
function renderSettings(d) {
  const s = d.store || {};
  const target = s.target_score || 80;
  const gv = document.getElementById('asGoalVal'), gr = document.getElementById('asGoalRange');
  if (gv) gv.textContent = (s.target_score ? s.target_score : '—') + (s.target_score ? '/100' : '');
  if (gr) gr.value = target;
  const prog = document.getElementById('asGoalProg');
  if (prog && s.target_score) {
    const cur = s.latest_score || 0, gap = s.target_score - cur;
    prog.innerHTML = gap <= 0 ? '<span style="color:#22c55e;font-weight:700;">تم تحقيق الهدف</span>' : `يلزمك <b style="color:var(--accent)">+${gap}</b> نقطة للوصول لهدفك (${cur} → ${s.target_score}).`;
  } else if (prog) prog.textContent = 'حرّك المؤشّر لتحديد هدف تقييم لمتجرك.';
  const ag = document.getElementById('asAutoGen'); if (ag) ag.checked = !!s.auto_generate;
}
async function saveGoal(v) {
  try { await api.asstSettings({ targetScore: parseInt(v) }); if (_lastData) _lastData.store.target_score = parseInt(v); renderSettings(_lastData); showToast('تم تحديد الهدف', 'success'); }
  catch (err) { showError('تعذّر', err.message); }
}
async function saveAutoGen(on) {
  try { await api.asstSettings({ autoGenerate: on }); if (_lastData) _lastData.store.auto_generate = on; showToast(on ? 'فُعّل التوليد التلقائي' : 'أُوقف التوليد التلقائي', 'success'); }
  catch (err) { showError('تعذّر', err.message); }
}
// ─── مراقبة المنافسين (قسم مستقل) ───────────────────────────────────────────
function _compChart(sn) {
  if (!sn || sn.length < 2) return '';
  const vals = sn.map(s => s.products || 0), lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo);
  const W = 280, H = 56, pad = 6;
  const pts = sn.map((s, i) => [pad + i * (W - 2 * pad) / (sn.length - 1), pad + (1 - ((s.products || 0) - lo) / span) * (H - 2 * pad)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const fmtD = d => { try { return new Date(d).toLocaleDateString('ar-EG', { dateStyle: 'short' }); } catch { return ''; } };
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;margin-top:.4rem;"><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--accent)" style="cursor:pointer;"><title>${sn[i].products ?? 0} منتج · ${fmtD(sn[i].created_at)}</title></circle>`).join('')}</svg>`;
}
async function renderCompetitors() {
  const list = document.getElementById('asCompList'); if (!list) return;
  list.innerHTML = '<div style="color:var(--ink-dim);font-size:.82rem;">جارٍ التحميل…</div>';
  let d; try { d = await api.asstCompetitors(); } catch (err) { list.innerHTML = `<div style="color:var(--ink-dim);font-size:.82rem;">${e(err.message)}</div>`; return; }
  const comps = d.competitors || [];
  if (!comps.length) { list.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;border:1px dashed var(--line);border-radius:10px;padding:1rem;text-align:center;">لا منافسين متابَعين بعد — أضف رابط متجر منافس أعلاه لبدء المراقبة.</div>'; return; }

  // ── إحصائيات لوحة المراقبة ──
  const rep = (_lastData && _lastData.store && _lastData.store.latest_report) || {};
  const myProducts = rep.productsCount ?? (_lastData && _lastData.products ? _lastData.products.length : (_allProds || []).length);
  const myName = (_lastData && _lastData.store && _lastData.store.store_name) || 'متجرك';
  const withData = comps.filter(c => typeof c.products === 'number');
  const compVals = withData.map(c => c.products);
  const avgComp = compVals.length ? Math.round(compVals.reduce((a, b) => a + b, 0) / compVals.length) : null;
  const maxComp = compVals.length ? Math.max(...compVals) : null;
  const ranking = [...withData.map(c => ({ n: c.products })), { n: myProducts, me: true }].sort((a, b) => b.n - a.n);
  const myRank = ranking.findIndex(x => x.me) + 1;
  let mostActive = null; comps.forEach(c => { if ((c.delta || 0) > 0 && (!mostActive || c.delta > mostActive.delta)) mostActive = c; });
  const shortName = s => { s = String(s || 'منافس'); return s.length > 14 ? s.slice(0, 13) + '…' : s; };

  const stats = `<div class="as-kpis" style="margin-bottom:.3rem;">
    ${kpiCard({ k: 'var(--accent)', ic: IC.grid, value: comps.length, label: 'منافسون متابَعون' })}
    ${kpiCard({ k: '#3b82f6', ic: IC.bag, value: (avgComp ?? '—'), label: 'متوسط منتجاتهم' })}
    ${kpiCard({ k: myRank === 1 ? '#22c55e' : '#f59e0b', ic: IC.trophy, value: myRank ? `${myRank}/${ranking.length}` : '—', label: 'ترتيب متجرك بالمنتجات' })}
    ${kpiCard({ k: mostActive ? '#ef4444' : '#22c55e', ic: IC.bell, value: mostActive ? `+${mostActive.delta}` : '0', label: mostActive ? ('الأنشط: ' + shortName(mostActive.name)) : 'لا تحرّكات جديدة' })}
  </div>`;

  let bars = '';
  if (avgComp != null) {
    const mx = Math.max(myProducts, avgComp, maxComp || 0, 1);
    const bar = (lbl, val, col) => `<div style="margin:.35rem 0;"><div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:.2rem;"><span>${lbl}</span><b style="color:${col}">${val} منتج</b></div><div style="height:8px;background:var(--line);border-radius:99px;overflow:hidden;"><div style="height:100%;width:${Math.round(val / mx * 100)}%;background:${col};border-radius:99px;"></div></div></div>`;
    const lead = myProducts >= avgComp;
    bars = `<div style="background:var(--bg-card);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;margin-bottom:.5rem;">
      <div class="as-section-t" style="font-size:.88rem;">متجرك مقابل المنافسين</div>
      ${bar('متجرك (' + e(myName) + ')', myProducts, 'var(--accent)')}
      ${bar('متوسط المنافسين', avgComp, '#3b82f6')}
      ${maxComp != null ? bar('أقوى منافس', maxComp, '#ef4444') : ''}
      <div style="font-size:.78rem;margin-top:.5rem;color:${lead ? '#22c55e' : '#d97706'};font-weight:700;">${lead ? 'متجرك يتفوّق على متوسط منافسيك في عدد المنتجات.' : `متوسط منافسيك يسبقك بـ ${avgComp - myProducts} منتج — فرصة للتوسّع.`}</div>
    </div>`;
  }

  const cards = comps.map(c => {
    const diff = c.delta || 0;
    const dcol = diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : 'var(--ink-dim)';
    const dtxt = diff > 0 ? `▲ +${diff} منتج منذ المتابعة` : diff < 0 ? `▼ ${Math.abs(diff)} منتج منذ المتابعة` : 'لا تغيير منذ المتابعة';
    const pending = (c.snapshots || []).length < 1;
    return `<div style="font-size:.84rem;background:var(--bg-card);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.4rem;">
        <b style="font-size:.92rem;">${e(c.name || 'منافس')}</b>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <button class="btn-secondary" style="padding:.25rem .7rem;font-size:.76rem;" onclick="compareThis('${e(c.url)}')">قارن</button>
          <button class="copy-icon-btn" style="color:#ef4444;border-color:#ef4444;" onclick="delCompetitor(${c.id})" title="إلغاء المتابعة"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>
      ${pending
        ? '<div style="color:var(--ink-dim);font-size:.78rem;margin-top:.35rem;">تتم المتابعة — ستظهر بياناته بعد أول مزامنة.</div>'
        : `<div style="margin-top:.3rem;">منتجات: <b style="color:var(--accent)">${c.products ?? '—'}</b> · أقسام: ${c.categories ?? '—'}</div>
           <div style="color:${dcol};font-weight:700;font-size:.78rem;margin-top:.25rem;">${dtxt}</div>
           ${_compChart(c.snapshots)}`}
      <a href="${e(c.url)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:.76rem;display:inline-block;margin-top:.3rem;">زيارة متجر المنافس ↗</a>
    </div>`;
  }).join('');

  list.innerHTML = stats + bars + cards;
  animateCounts(list);
}
async function addCompetitor() {
  const inp = document.getElementById('asCompUrl');
  const url = (inp.value || '').trim();
  if (!url) { showError('تنبيه', 'أدخل رابط متجر المنافس'); return; }
  const btn = document.getElementById('asCompAddBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ السحب…'; }
  try {
    await api.asstAddCompetitor(url);
    inp.value = '';
    showToast('تمت إضافة المنافس للمتابعة', 'success');
    renderCompetitors();
  } catch (err) { showError('تعذّر', err.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'إضافة للمتابعة'; } }
}
async function delCompetitor(id) {
  const doDel = async () => {
    try { await api.asstDelCompetitor(id); showToast('أُلغيت المتابعة', 'success'); renderCompetitors(); }
    catch (err) { showError('تعذّر', err.message); }
  };
  showConfirm ? showConfirm('إلغاء المتابعة', 'سيتوقف رصد هذا المنافس وتُحذف لقطاته. متابعة؟', doDel, 'إلغاء المتابعة') : doDel();
}
// مقارنة منافس من داخل القسم
function compareThis(url) {
  const inp = document.getElementById('asCmpInlineUrl'); if (inp) inp.value = url;
  runCompareInline();
  const body = document.getElementById('asCmpInlineBody');
  if (body) body.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── صحة المتجر + أولويات هذا الأسبوع (توجيه ذكي مشتق من البيانات) ───
// جلب GA مرة واحدة لكل تحميل (يتشاركه كرت الملخّص وكرت الزيارات)
let _gaPromise = null;
function getGa() {
  if (!_gaPromise) _gaPromise = (async () => {
    let st; try { st = await api.gaStatus(); } catch { return { connected: false }; }
    if (!st || !st.connected) return { connected: false };
    let report = null; try { report = await api.gaReport(); } catch { /* skip */ }
    return { connected: true, report };
  })();
  return _gaPromise;
}

// ─── كرت الملخّص العصري (بروح «مساعد النمو») ───
let _heroData = null, _heroMode = 'score';
async function renderHero(d) {
  const card = document.getElementById('asHero'); if (!card) return;
  const s = d.store || {}; const rep = s.latest_report || {};
  if (!s.store_url) { card.style.display = 'none'; return; }
  card.style.display = '';
  const mEl = document.getElementById('asHeroMonth'); if (mEl) mEl.textContent = new Date().toLocaleDateString('ar-EG', { month: 'long' }) + ' ' + new Date().getFullYear();
  const prods = _allProds || (d.products || []);
  const sn = (d.snapshots || []).filter(x => x.score != null);
  _heroData = {
    score: sn.map(x => ({ v: x.score, d: x.created_at })),
    products: sn.map(x => ({ v: (x.report && x.report.metrics && x.report.metrics.products), d: x.created_at })).filter(p => p.v != null),
    productsCount: rep.productsCount ?? prods.length,
  };
  renderHeroChart();
  // أيقونات SVG
  const icUsers = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>';
  const icStar = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const icBag = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  const badge = (kc, svg, n, l) => `<div class="as-hero-kpi"><div class="as-hero-kpi-badge" style="--kc:${kc}">${svg}</div><div><div class="as-hero-kpi-n">${n}</div><div class="as-hero-kpi-l">${l}</div></div></div>`;
  const kpisEl = document.getElementById('asHeroKpis');
  const ga = await getGa();
  const visits = (ga.connected && ga.report) ? (ga.report.users || 0).toLocaleString('en-US') : '—';
  kpisEl.innerHTML =
      badge('var(--accent)', icUsers, visits, ga.connected ? 'الزيارات (آخر فترة)' : 'الزيارات — اربط GA')
    + badge(sc(s.latest_score), icStar, (s.latest_score ?? '—'), 'التقييم العام')
    + badge('#3b82f6', icBag, (_heroData.productsCount || 0).toLocaleString('en-US'), 'المنتجات');
  // شريط الهدف
  const goalEl = document.getElementById('asHeroGoal');
  if (s.target_score) {
    const p = Math.min(100, Math.round((s.latest_score || 0) / s.target_score * 100));
    goalEl.innerHTML = `<div class="as-hero-goal-top"><span>هدف التقييم: <b style="color:var(--accent)">${p}%</b></span><span style="color:var(--ink-dim);">${s.latest_score || 0} / ${s.target_score} <span style="cursor:pointer;color:var(--accent);" onclick="switchTab('settings')" title="تعديل الهدف">✎</span></span></div><div class="as-hero-goal-bar"><div class="as-hero-goal-fill" style="width:${p}%"></div></div>`;
  } else {
    goalEl.innerHTML = `<div class="as-hero-goal-top"><span style="color:var(--ink-dim);">حدّد هدف تقييم لمتجرك لتتابع تقدّمك شهريًا</span><button class="copy-icon-btn" onclick="switchTab('settings')">تحديد هدف</button></div>`;
  }
  // دعوة لإجراء
  document.getElementById('asHeroCta').innerHTML = `<div class="as-hero-cta-txt">فريق الخبراء يأخذ بيدك خطوة بخطوة لرفع تقييم متجرك ومبيعاتك.</div><button class="btn-primary" style="padding:.5rem 1.2rem;white-space:nowrap;" onclick="switchTab('analysis')">أطلق حملتك</button>`;
}
function renderHeroChart() {
  const el = document.getElementById('asHeroChart'); if (!el || !_heroData) return;
  const pts = (_heroMode === 'products' ? _heroData.products : _heroData.score) || [];
  const label = _heroMode === 'products' ? 'عدد المنتجات عبر المزامنات' : 'تطوّر التقييم عبر المزامنات';
  if (pts.length < 2) {
    el.innerHTML = `<div class="as-hero-cap">${label}</div><div style="margin:auto;text-align:center;color:var(--ink-dim);font-size:.82rem;line-height:1.8;padding:1.2rem 0;">يظهر المخطّط بعد مزامنتين أو أكثر<br><span style="font-size:.74rem;">كل مزامنة تُضيف عمودًا جديدًا</span></div>`;
    return;
  }
  const show = pts.slice(-8); // آخر 8 نقاط
  const vals = show.map(p => p.v), max = Math.max(...vals), min = Math.min(...vals), span = Math.max(1, max - min);
  const fmtD = d => { try { return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }); } catch { return ''; } };
  const cols = show.map((p, i) => {
    const h = Math.round(35 + ((p.v - min) / span) * 65);
    return `<div class="as-hero-col"><div class="as-hero-col-v">${p.v}</div><div class="as-hero-col-track"><div class="as-hero-bar${i === show.length - 1 ? ' peak' : ''}" style="height:${h}%"></div></div><div class="as-hero-col-d">${e(fmtD(p.d))}</div></div>`;
  }).join('');
  el.innerHTML = `<div class="as-hero-cap">${label}</div><div class="as-hero-bars">${cols}</div>`;
}
function setHeroChart(mode) {
  _heroMode = mode;
  const b1 = document.getElementById('asHeroGScore'), b2 = document.getElementById('asHeroGProducts');
  if (b1) b1.classList.toggle('active', mode === 'score');
  if (b2) b2.classList.toggle('active', mode === 'products');
  renderHeroChart();
}

// ─── الزيارات (Google Analytics) داخل لوحة النظرة العامة + ملاحظات ذكية ───
async function renderOverviewVisits() {
  const box = document.getElementById('asVisits'); if (!box) return;
  const ga = await getGa();
  if (!ga.connected) {
    box.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;">
      <div style="font-size:.85rem;color:var(--ink-dim);line-height:1.7;max-width:520px;">اربط Google Analytics لترى زيارات متجرك ومصادرها ومعدّل التحويل هنا مباشرة — ويستخدمها المساعد في تحليله.</div>
      <button class="btn-primary" style="padding:.5rem 1.1rem;white-space:nowrap;" onclick="switchTab('performance')">ربط Google Analytics</button>
    </div>`;
    return;
  }
  try {
    const r = ga.report;
    if (!r) throw new Error('تعذّر جلب الزيارات الآن');
    const dur = s => s >= 60 ? Math.floor(s / 60) + 'د ' + (s % 60) + 'ث' : (s || 0) + 'ث';
    const convRate = r.sessions ? Math.round(r.conversions / r.sessions * 1000) / 10 : 0;
    box.innerHTML = `<div class="as-kpis">
        ${kpiCard({ k: 'var(--accent)', ic: IC.target, value: (r.users || 0).toLocaleString('en-US'), label: 'زائر' })}
        ${kpiCard({ k: '#3b82f6', ic: IC.grid, value: (r.sessions || 0).toLocaleString('en-US'), label: 'جلسة' })}
        ${kpiCard({ k: '#8b5cf6', ic: IC.file, value: (r.pageViews || 0).toLocaleString('en-US'), label: 'مشاهدة صفحة' })}
        ${kpiCard({ k: convRate >= 1 ? '#22c55e' : '#f59e0b', ic: IC.check, value: (r.conversions || 0).toLocaleString('en-US'), label: `تحويل (${convRate}%)` })}
      </div>
      ${(r.sources || []).length ? `<div class="as-section-t" style="margin-top:.7rem;font-size:.85rem;">أعلى مصادر الزيارات</div><div style="display:flex;gap:.4rem;flex-wrap:wrap;">${r.sources.slice(0, 5).map(s => `<span style="font-size:.78rem;background:var(--bg-card);border:1px solid var(--line);border-radius:99px;padding:.2rem .7rem;">${e(s.name)} <b style="color:var(--accent)">${(s.sessions || 0).toLocaleString('en-US')}</b></span>`).join('')}</div>` : ''}
      <div id="asVisitsSmart" style="margin-top:.6rem;font-size:.82rem;line-height:1.8;"></div>
      <div style="text-align:left;margin-top:.5rem;"><span style="color:var(--ink-dim);font-size:.72rem;">${e(r.range || '')}</span></div>`;
    animateCounts(box);
    // ملاحظات ذكية على الزيارات
    const bits = [];
    if (r.bounceRate >= 60) bits.push(`<span style="color:#ef4444;">معدّل الارتداد مرتفع (${r.bounceRate}%) — حسّن سرعة المتجر وصفحات الهبوط.</span>`);
    else if (r.bounceRate) bits.push(`معدّل الارتداد ${r.bounceRate}% · متوسط الجلسة ${dur(r.avgDuration)}.`);
    if (r.sources && r.sources.length) bits.push(`أكثر مصدر: <b>${e(r.sources[0].name)}</b>.`);
    if (r.sessions && convRate < 1) bits.push(`<span style="color:#f59e0b;">معدّل التحويل منخفض (${convRate}%) — راجع الأسعار والأوصاف وطرق الدفع.</span>`);
    else if (convRate >= 2) bits.push(`<span style="color:#22c55e;">معدّل تحويل جيد (${convRate}%).</span>`);
    const sm = document.getElementById('asVisitsSmart'); if (sm) sm.innerHTML = bits.join(' ');
  } catch (err) {
    box.innerHTML = `<div style="color:#f59e0b;font-size:.84rem;">${e(err.message || 'تعذّر جلب الزيارات')} <button class="copy-icon-btn" style="margin-inline-start:.4rem;" onclick="switchTab('performance')">إدارة الربط</button></div>`;
  }
}

// ─── نظرة ذكية: مؤشّرات محسوبة من البيانات (فورية، بلا تكلفة ذكاء) ───
function renderSmartInsights(d) {
  const kpisEl = document.getElementById('asSmartKpis'), sumEl = document.getElementById('asSmartSummary');
  if (!kpisEl) return;
  const prods = _allProds || (d.products || []);
  const n = prods.length;
  const card = document.getElementById('asSmartCard');
  if (!n) { if (card) card.style.display = 'none'; return; }
  if (card) card.style.display = '';
  const pct = x => Math.round(x / n * 100);
  const withDesc = prods.filter(p => p.has_description).length;
  const withImg = prods.filter(p => prodImages(p).length).length;
  const withSeo = prods.filter(p => p.seo).length;
  const withCat = prods.filter(p => p.category).length;
  // اكتمال المحتوى المركّب (وصف + صورة + SEO)
  const completion = Math.round((pct(withDesc) + pct(withImg) + pct(withSeo)) / 3);
  const cCol = completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#ef4444';
  // أكبر فرصة: البُعد الأكثر نقصًا
  const gaps = [
    { k: 'وصف', miss: n - withDesc, act: "switchTab('analysis')" },
    { k: 'صورة', miss: n - withImg, act: "switchTab('products');var f=document.getElementById('asProdFilter');if(f){f.value='noimg';renderProds(1);}" },
    { k: 'SEO', miss: n - withSeo, act: "switchTab('analysis')" },
    { k: 'تصنيف', miss: n - withCat, act: "switchTab('products')" },
  ].sort((a, b) => b.miss - a.miss);
  const top = gaps[0];
  // اتجاه التقييم منذ آخر مزامنة
  const sn = (d.snapshots || []).filter(x => x.score != null);
  const score = d.store.latest_score ?? (sn.length ? sn[sn.length - 1].score : null);
  const prev = sn.length > 1 ? sn[sn.length - 2].score : null;
  const delta = (prev != null && score != null) ? score - prev : null;
  const dCol = delta == null ? 'var(--ink-dim)' : delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : 'var(--ink-dim)';
  const dTxt = delta == null ? 'أول مزامنة' : delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : '= ثابت';
  // أضعف قسم اكتمالًا (≥3 منتجات)
  const byCat = {};
  prods.forEach(p => { const c = p.category || 'بدون قسم'; (byCat[c] = byCat[c] || []).push(p); });
  let weakCat = null;
  Object.entries(byCat).forEach(([c, arr]) => {
    if (arr.length < 3 || c === 'بدون قسم') return;
    const comp = Math.round(arr.filter(p => p.has_description && prodImages(p).length).length / arr.length * 100);
    if (!weakCat || comp < weakCat.comp) weakCat = { c, comp, count: arr.length };
  });

  kpisEl.innerHTML =
      kpiCard({ k: cCol, ic: IC.check, value: completion + '%', label: 'اكتمال المحتوى (وصف·صورة·SEO)' })
    + kpiCard({ k: top.miss ? '#f59e0b' : '#22c55e', ic: IC.bag, value: top.miss, label: top.miss ? `الأكبر فرصة: بلا ${top.k}` : 'لا فجوات منتجات' })
    + kpiCard({ k: dCol, ic: IC.target, value: (score ?? '—'), label: `التقييم ${dTxt} منذ آخر مزامنة` })
    + (weakCat
        ? kpiCard({ k: weakCat.comp < 50 ? '#ef4444' : '#f59e0b', ic: IC.grid, value: weakCat.comp + '%', label: `أضعف قسم: ${weakCat.c}` })
        : kpiCard({ k: '#22c55e', ic: IC.grid, value: Object.keys(byCat).length, label: 'عدد الأقسام' }));
  animateCounts(kpisEl);

  // جملة ذكية مركّبة + زر إجراء لأكبر فرصة
  if (sumEl) {
    const bits = [];
    if (delta != null && delta !== 0) bits.push(delta > 0 ? `تقييمك تحسّن <b style="color:#22c55e">${delta}+</b> نقطة منذ آخر مزامنة` : `تقييمك تراجع <b style="color:#ef4444">${delta}</b> نقطة — انتبه`);
    if (top.miss) bits.push(`<b>${top.miss}</b> منتج بلا ${top.k} (${pct(top.miss)}%) — أكبر فرصة نمو الآن`);
    if (weakCat && weakCat.comp < 60) bits.push(`قسم «${e(weakCat.c)}» الأضعف اكتمالًا (${weakCat.comp}%)`);
    const line = bits.length ? bits.join(' · ') : 'متجرك في حالة جيدة — كل المؤشّرات مكتملة.';
    sumEl.innerHTML = `${line} ${top.miss ? `<button class="as-prod-ask" style="display:inline-block;width:auto;padding:.25rem .8rem;margin-inline-start:.4rem;" onclick="${top.act}">عالج الآن</button>` : ''}`;
  }
}

// تحليل الخبير البشري (يُغذّى من لوحة التحكم)
function renderExpertInsights(d) {
  const card = document.getElementById('asExpertCard'), list = document.getElementById('asExpertList');
  if (!card || !list) return;
  const ins = (d && d.adminInsights) || [];
  if (!ins.length) { card.style.display = 'none'; return; }
  const meta = {
    insight:        { c: 'var(--accent)', t: 'ملاحظة' },
    recommendation: { c: '#22c55e',       t: 'توصية' },
    warning:        { c: '#ef4444',       t: 'تحذير' },
    opportunity:    { c: '#f59e0b',       t: 'فرصة' },
  };
  card.style.display = '';
  list.innerHTML = ins.map(x => {
    const m = meta[x.kind] || meta.insight;
    const date = x.created_at ? new Date(x.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' }) : '';
    return `<div style="background:var(--bg-card);border:1px solid var(--line);border-inline-start:3px solid ${m.c};border-radius:8px;padding:.6rem .8rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap;">
        <span style="font-size:.7rem;font-weight:700;color:${m.c};background:${m.c}1a;border-radius:99px;padding:.1rem .6rem;">${m.t}</span>
        ${date ? `<span style="font-size:.68rem;color:var(--ink-dim);">${e(date)}</span>` : ''}
      </div>
      ${x.title ? `<div style="font-weight:700;font-size:.9rem;margin-top:.35rem;">${e(x.title)}</div>` : ''}
      <div style="font-size:.85rem;line-height:1.7;margin-top:.2rem;white-space:pre-wrap;">${e(x.body)}</div>
    </div>`;
  }).join('');
}
function renderHealth(d, cats) {
  const s = d.store, rep = s.latest_report || {};
  const score = s.latest_score ?? 0;
  const col = score >= 80 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444';
  const ring = document.getElementById('asHealthRing');
  if (ring) { ring.style.background = `conic-gradient(${col} ${score*3.6}deg, var(--line) 0)`;
    ring.innerHTML = `<div style="width:64px;height:64px;border-radius:50%;background:var(--bg-alt);display:flex;align-items:center;justify-content:center;flex-direction:column;"><b style="font-size:1.3rem;color:${col}">${score}</b><span style="font-size:.6rem;color:var(--ink-dim)">/100</span></div>`; }
  const label = score >= 80 ? 'متجرك بحالة ممتازة ' : score >= 55 ? 'متجرك جيد، وفيه فرص تحسين' : 'متجرك يحتاج عناية عاجلة';
 document.getElementById('asHealthTitle').textContent = label;
 document.getElementById('asHealthMsg').textContent = rep.summary || 'اضغط «مزامنة الآن» لتحديث تحليل متجرك.';
  // أولويات مشتقة من البيانات الفعلية
  const prods = _allProds || [];
  const noDesc = prods.filter(p => !p.has_description).length;
  const noImg = prods.filter(p => !prodImages(p).length).length;
  const noSeo = prods.filter(p => !p.seo).length;
  const noCat = prods.filter(p => !p.category).length;
  const pr = [];
  if (noDesc) pr.push({ t: `${noDesc} منتج بدون وصف بيع — ولّد أوصافها`, act: `switchTab('analysis')`, btn: 'توليد جماعي' });
  if (noImg) pr.push({ t: `${noImg} منتج بدون صورة واضحة — أضف صوراً`, act: `switchTab('products');document.getElementById('asProdFilter').value='noimg';renderProds(1)`, btn: 'عرضها' });
  if (noSeo) pr.push({ t: `${noSeo} منتج بدون SEO — حسّن ظهورك في جوجل`, act: `switchTab('analysis')`, btn: 'تحسين SEO' });
  if (noCat) pr.push({ t: `${noCat} منتج غير مصنّف في قسم`, act: `switchTab('products')`, btn: 'مراجعة' });
  (rep.recommendations || []).slice(0, 2).forEach(r => pr.push({ t: r, act: `switchTab('plan')`, btn: 'لخطة العمل' }));
  const el = document.getElementById('asPriorities');
  el.innerHTML = pr.length ? pr.slice(0, 5).map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem;background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;">
      <span style="font-size:.85rem;">${e(p.t)}</span>
      <button class="as-prod-ask" style="width:auto;padding:.3rem .8rem;flex-shrink:0;" onclick="${p.act}">${e(p.btn)}</button>
    </div>`).join('') : '<div style="color:#22c55e;font-size:.85rem;">كل شيء مكتمل — متجرك جاهز </div>';
}
// تبديل تبويب برمجياً
function switchTab(name) {
  document.querySelectorAll('#asTabs .as-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.as-tabpane').forEach(p => p.style.display = 'none');
  const pane = document.getElementById('tab-' + name);
  if (pane) { pane.style.display = 'block'; pane.classList.remove('as-fade'); void pane.offsetWidth; pane.classList.add('as-fade'); }
  document.querySelectorAll('#asBottomNav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'competitors') renderCompetitors();
}

// ─── بحث عام داخل الأداة (منتجات + إجراءات) ───
const _searchActions = [
  { t: 'مزامنة المتجر الآن', go: () => document.getElementById('asSyncBtn').click() },
  { t: 'تحليل التسويق والأسعار', go: () => switchTab('analysis') },
  { t: 'تجربة العميل (FAQ / سياسات)', go: () => switchTab('support') },
  { t: 'خطة العمل', go: () => switchTab('plan') },
  { t: 'تصدير منتجات CSV', go: () => exportProductsCsv() },
  { t: 'تقرير PDF', go: () => exportStorePdf() },
];
window._searchPick = window._searchPick || [];
function globalSearch(q) {
  const box = document.getElementById('asSearchResults'); if (!box) return;
  q = (q || '').trim().toLowerCase();
  if (!q) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const prods = (_allProds || []).filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 8);
  const acts = _searchActions.filter(a => a.t.toLowerCase().includes(q));
  window._searchPick = [];
  let html = '';
  if (prods.length) {
    html += '<div style="font-size:.72rem;color:var(--ink-dim);padding:.5rem .8rem .2rem;">منتجات</div>';
    prods.forEach(p => { const i = window._searchPick.push(() => { openProduct(p.id); closeSearch(); }) - 1;
      const img = prodImages(p)[0];
      html += `<div onclick="window._searchPick[${i}]()" style="display:flex;align-items:center;gap:.6rem;padding:.5rem .8rem;cursor:pointer;border-top:1px solid var(--line);">${img?`<img src="${e(img)}" style="width:30px;height:30px;border-radius:6px;object-fit:contain;background:#fff;">`:''}<span style="flex:1;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e(p.name)}</span></div>`;
    });
  }
  if (acts.length) {
    html += '<div style="font-size:.72rem;color:var(--ink-dim);padding:.5rem .8rem .2rem;border-top:1px solid var(--line);">إجراءات</div>';
    acts.forEach(a => { const i = window._searchPick.push(() => { a.go(); closeSearch(); }) - 1;
      html += `<div onclick="window._searchPick[${i}]()" style="padding:.5rem .8rem;cursor:pointer;font-size:.85rem;border-top:1px solid var(--line);">${e(a.t)}</div>`;
    });
  }
  box.innerHTML = html || '<div style="padding:.7rem .8rem;color:var(--ink-dim);font-size:.85rem;">لا نتائج</div>';
  box.style.display = 'block';
}
function closeSearch() { const b = document.getElementById('asSearchResults'); if (b) { b.style.display = 'none'; } const i = document.getElementById('asGlobalSearch'); if (i) i.value = ''; }

// ─── جرس الإشعارات (تنبيهات المتجر + ردود الدعم) ───
let _answeredTickets = 0;
async function refreshBell() {
  try { const ts = await api.tickets.mine(); _answeredTickets = (ts || []).filter(t => t.status === 'answered').length; } catch { _answeredTickets = 0; }
  renderBell();
}
function renderBell() {
  const d = _lastData || {};
  const alerts = (d.alerts || []);
  const unseen = alerts.filter(a => !a.seen).length;
  const total = unseen + _answeredTickets;
  const badge = document.getElementById('asBellBadge');
  if (badge) { badge.style.display = total ? 'flex' : 'none'; badge.textContent = total > 9 ? '9+' : total; }
  const menu = document.getElementById('asBellMenu');
  if (!menu) return;
  let html = '<div style="padding:.7rem .9rem;font-weight:800;border-bottom:1px solid var(--line);">الإشعارات</div><div style="max-height:320px;overflow-y:auto;">';
  if (_answeredTickets) html += `<div onclick="location.href='messages.html'" style="padding:.6rem .9rem;cursor:pointer;border-bottom:1px solid var(--line);font-size:.85rem;color:var(--accent);font-weight:700;">${_answeredTickets} ردّ جديد من خدمة العملاء — افتح رسائلي</div>`;
  if (alerts.length) {
    alerts.slice(0, 8).forEach(a => {
      const c = a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#f59e0b' : '#3b82f6';
      html += `<div onclick="switchTab('settings');toggleBell()" style="padding:.6rem .9rem;cursor:pointer;border-bottom:1px solid var(--line);font-size:.83rem;display:flex;gap:.5rem;"><span style="width:8px;height:8px;border-radius:50%;background:${c};margin-top:.4rem;flex-shrink:0;"></span><span>${e(a.message)}</span></div>`;
    });
  }
  if (!alerts.length && !_answeredTickets) html += `<div style="padding:1.2rem;text-align:center;color:var(--ink-dim);font-size:.85rem;">لا إشعارات جديدة</div>`;
  html += '</div>';
  menu.innerHTML = html;
}
function toggleBell(ev) {
  if (ev) ev.stopPropagation();
  const m = document.getElementById('asBellMenu');
  m.style.display = m.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', (ev) => {
  const bell = document.getElementById('asBell'), menu = document.getElementById('asBellMenu');
  if (menu && menu.style.display === 'block' && !menu.contains(ev.target) && bell && !bell.contains(ev.target)) menu.style.display = 'none';
  const sr = document.getElementById('asSearchResults'), si = document.getElementById('asGlobalSearch');
  if (sr && sr.style.display === 'block' && !sr.contains(ev.target) && ev.target !== si) sr.style.display = 'none';
});

// ─── (2،3،5،6) تحليل الأقسام: أسعار + مكررات + أدوات القسم ───
function renderAnalysis(cats) {
  // (2) إحصاءات الأسعار لكل قسم + تمييز الشاذّ
  const byCat = {};
  _allProds.forEach(p => { const c = p.category || 'بدون قسم'; const v = parseFloat(p.price); (byCat[c] = byCat[c] || []).push({ p, v: isNaN(v) ? null : v }); });
  const statsEl = document.getElementById('asCatStats');
  const rows = Object.entries(byCat).map(([c, items]) => {
    const prices = items.map(x => x.v).filter(v => v != null && v > 0);
    if (!prices.length) return `<div class="as-pagerow"><span>${e(c)}</span><span style="color:var(--ink-dim)">${items.length} منتج · بلا أسعار</span></div>`;
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const min = Math.min(...prices), max = Math.max(...prices);
    return `<div class="as-pagerow"><span>${e(c)} <span style="color:var(--ink-dim);font-size:.78rem;">(${items.length})</span></span>
      <span style="font-size:.8rem;">متوسط <b style="color:var(--accent)">${avg}</b> · ${min}–${max} ر.س</span></div>`;
  }).join('');
  statsEl.innerHTML = rows || '<div style="color:var(--ink-dim);">لا بيانات أسعار.</div>';
  // قائمة الأقسام لأدوات القسم
  const pick = document.getElementById('asCatPick');
  const realCats = (cats && cats.length ? cats : Object.keys(byCat).filter(c => c !== 'بدون قسم'));
 pick.innerHTML = realCats.map(c => `<option value="${e(c)}">${e(c)}</option>`).join('') || '<option value="">لا أقسام</option>';
  // (3) المنتجات المكررة/المتشابهة (تطبيع الاسم)
  const norm = s => String(s || '').toLowerCase().replace(/[ًٌٍَُِّْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/[^a-z0-9؀-ۿ]+/g,' ').replace(/\s+/g,' ').trim();
  const seen = {};
  _allProds.forEach(p => { const k = norm(p.name); if (!k) return; (seen[k] = seen[k] || []).push(p); });
  const dups = Object.values(seen).filter(g => g.length > 1);
 document.getElementById('asDupCount').textContent = dups.length ? `(${dups.length} مجموعة)` : '';
  document.getElementById('asDuplicates').innerHTML = dups.length
    ? dups.slice(0, 30).map(g => `<div class="as-pagerow"><span>${e(g[0].name)}</span><span style="color:#d97706;font-size:.8rem;">${g.length} نسخ متشابهة</span></div>`).join('')
    : emptyState(IC.check, 'لا منتجات مكرّرة', 'منتجاتك نظيفة بلا تكرار');
}
async function bulkActionCat(type) {
  const cat = document.getElementById('asCatPick').value;
  const out = document.getElementById('asCatActionOut');
  out.innerHTML = `<div style="color:var(--ink-dim);font-size:.85rem;"> جارٍ ${type==='description'?'توليد الأوصاف':'توليد SEO'} لقسم «${e(cat)}»...</div>`;
  try {
    const r = await api.asstBulk(type, cat);
    out.innerHTML = `<div style="color:#16a34a;font-size:.85rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت معالجة ${r.processed||0} منتج في القسم.</div>`;
    if (type === 'description') refreshStoreData();
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}
// ─── تجربة العميل ───
async function support(type, kind) {
  const out = document.getElementById('asSupportOut');
  out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"> جارٍ التوليد...</div>';
  try {
    const r = await api.asstSupport(type, { kind });
    let html = '';
    if (type === 'faq') {
      html = (r.faq||[]).map(f=>`<div style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.6rem;margin-bottom:.5rem;font-size:.85rem;"><b>${e(f.q)}</b><br><span style="color:var(--ink-dim)">${e(f.a)}</span></div>`).join('');
    } else if (type === 'whatsapp') {
      html = (r.templates||[]).map(t=>`<div style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.6rem;margin-bottom:.5rem;font-size:.85rem;"><b>${e(t.title)}</b><br>${e(t.text)}</div>`).join('');
    } else if (type === 'policy') {
      html = `<div style="font-weight:700;margin-bottom:.4rem;">${e(r.title||'')}</div><div id="polOut" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.85rem;white-space:pre-wrap;">${e(r.body||'')}</div>${_copyBtn('polOut')}`;
    }
    out.innerHTML = html || '<div style="color:var(--ink-dim)">لا نتيجة.</div>';
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}
async function replyReview() {
  const review = (document.getElementById('asReviewIn').value||'').trim();
 if (!review) { showError('مطلوب','الصق التقييم'); return; }
  const rating = document.getElementById('asReviewRating').value;
  const out = document.getElementById('asReviewOut');
  out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"> جارٍ توليد الرد...</div>';
  try {
    const r = await api.asstSupport('review-reply', { review, rating });
    out.innerHTML = `<div style="font-size:.8rem;color:var(--ink-dim);margin-bottom:.3rem;">المشاعر: <b>${e(r.sentiment||'—')}</b></div>
      <div id="revOut" style="background:var(--accent-soft);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.86rem;white-space:pre-wrap;">${e(r.reply||'')}</div>${_copyBtn('revOut')}`;
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

// ─── فحص SEO شامل ───
async function runSeoAudit() {
  const out = document.getElementById('asSeoAudit');
  out.innerHTML = '<div style="color:var(--ink-dim);"> جارٍ فحص SEO...</div>';
  try {
    const r = await api.asstSeoAudit();
    const col = r.score >= 70 ? '#22c55e' : r.score >= 45 ? '#f59e0b' : '#ef4444';
    const list = (t, arr, c) => (arr&&arr.length) ? `<div class="as-section-t" style="margin-top:.6rem;">${t}</div><ul class="as-list">${arr.map(x=>`<li style="color:${c||'inherit'}">${e(x)}</li>`).join('')}</ul>` : '';
    out.innerHTML = `<div style="font-size:1.6rem;font-weight:800;color:${col};">${r.score}/100</div>
      <div style="color:var(--ink-dim);font-size:.8rem;">منتجات بلا وصف: ${r.stats.noDesc} · بلا SEO: ${r.stats.noSeo} · بلا قسم: ${r.stats.noCat}</div>
      ${list('<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg> مشاكل', r.issues, '#d97706')}
      ${list('<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> خطوات سريعة عالية الأثر', r.quickWins, '#16a34a')}
      ${(r.keywords||[]).length?`<div class="as-section-t" style="margin-top:.6rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.6 7.6a5 5 0 1 0-1.4 1.4l3.5 3.5L16 16l1.5 1.5L19 16l-1.5-1.5 1.9-1.9"/></svg> كلمات مفتاحية مقترحة</div><div style="display:flex;gap:.3rem;flex-wrap:wrap;">${r.keywords.map(k=>`<span class="as-pd-chip">${e(k)}</span>`).join('')}</div>`:''}`;
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

// ─── محرّك التسويق ───
async function marketing(type) {
  const out = document.getElementById('asMktOut');
  const topic = (document.getElementById('asMktTopic').value||'').trim();
  const platform = document.getElementById('asMktPlatform').value;
  const labels = { calendar:'خطة المحتوى', social:'المنشور', ad:'الإعلان', message:'الرسالة', coupons:'أفكار الكوبونات' };
  out.innerHTML = `<div style="color:var(--ink-dim);font-size:.85rem;"> جارٍ إنشاء ${labels[type]}...</div>`;
  try {
    const r = await api.asstMarketing(type, { topic, occasion: topic, platform, channel: 'whatsapp' });
    let html = '';
    if (type === 'calendar') {
      html = `<div class="as-section-t"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> خطة محتوى الأسبوع</div>` + (r.days||[]).map(d=>`<div class="as-pagerow"><span><b>${e(d.day||'')}</b> · ${e(d.idea||'')}</span><span style="color:var(--accent);font-size:.75rem;">${e(d.type||'')}</span></div>`).join('');
    } else if (type === 'social') {
      html = `<div id="mkOut" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.86rem;white-space:pre-wrap;">${e(r.post||'')}\n\n${e(r.caption||'')}\n\n${(r.hashtags||[]).map(e).join(' ')}</div>${_copyBtn('mkOut')}`;
    } else if (type === 'ad') {
      html = `<div id="mkOut" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.86rem;"><b>${e(r.headline||'')}</b><br>${e(r.body||'')}<br><span style="color:var(--accent);font-weight:700;">${e(r.cta||'')}</span>${(r.variants||[]).length?'<hr style="border-color:var(--line)">بدائل: '+r.variants.map(e).join(' · '):''}</div>${_copyBtn('mkOut')}`;
    } else if (type === 'message') {
      html = `<div id="mkOut" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.86rem;white-space:pre-wrap;">${e(r.message||'')}${r.followup?'\n\n— متابعة:\n'+e(r.followup):''}</div>${_copyBtn('mkOut')}`;
    } else {
      html = `<div class="as-section-t"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> أفكار عروض</div>` + (r.ideas||[]).map(i=>`<div style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.6rem;margin-bottom:.5rem;font-size:.85rem;"><b>${e(i.name||'')}</b> ${i.code?`<span style="color:var(--accent)">[${e(i.code)}]</span>`:''}<br><span style="color:var(--ink-dim)">${e(i.detail||'')}</span></div>`).join('');
    }
    out.innerHTML = html || '<div style="color:var(--ink-dim)">لا نتيجة.</div>';
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

// تحسين صور قسم كامل (يعيد استخدام تحسين الصورة بالذكاء، بحدّ أعلى)
async function bulkImagesCat(mode) {
  const cat = document.getElementById('asCatPick').value;
  const out = document.getElementById('asCatActionOut');
  const items = (_allProds || []).filter(p => p.category === cat && prodImages(p).length).slice(0, 6);
  if (!items.length) { out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;">لا منتجات بصور في هذا القسم.</div>'; return; }
  out.innerHTML = `<div style="color:var(--ink-dim);font-size:.85rem;">جارٍ تحسين صور «${e(cat)}» (${items.length} منتج)... قد يستغرق دقيقة.</div><div id="bicGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.6rem;margin-top:.7rem;"></div>`;
  const grid = document.getElementById('bicGrid');
  let done = 0;
  for (const p of items) {
    const cell = document.createElement('div');
    cell.style.cssText = 'text-align:center;font-size:.7rem;';
    cell.innerHTML = `<div class="sk" style="height:90px;border-radius:8px;"></div><div style="margin-top:.2rem;color:var(--ink-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e(p.name)}</div>`;
    grid.appendChild(cell);
    try {
      const r = await api.asstProdEnhanceImg(p.id, mode);
      cell.innerHTML = `<a href="${r.image}" download="${e((p.name||'p').replace(/[\\/:*?"<>|]/g,''))}.png"><img src="${r.image}" style="width:100%;height:90px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px;"></a><div style="margin-top:.2rem;color:#16a34a;">تم ✓</div>`;
      done++;
    } catch (err) { cell.innerHTML = `<div style="height:90px;display:flex;align-items:center;justify-content:center;color:#ef4444;font-size:.7rem;border:1px solid var(--line);border-radius:8px;">تعذّر</div><div style="margin-top:.2rem;color:var(--ink-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e(p.name)}</div>`; }
  }
  out.insertAdjacentHTML('afterbegin', `<div style="color:#16a34a;font-size:.85rem;margin-bottom:.4rem;">اكتمل: ${done}/${items.length} — حمّل الصور بالضغط عليها.</div>`);
}

async function runCampaign() {
  const cat = document.getElementById('asCatPick').value;
  const out = document.getElementById('asCatActionOut');
  out.innerHTML = `<div style="color:var(--ink-dim);font-size:.85rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg> جارٍ إنشاء حملة لقسم «${e(cat)}»...</div>`;
  try {
    const r = await api.asstCategoryCampaign(cat);
    out.innerHTML = `
      <div class="as-section-t"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg> منشور تسويقي</div>
      <div id="campPost" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.86rem;white-space:pre-wrap;">${e(r.post||'')}</div>${_copyBtn('campPost')}
      ${r.caption?`<div class="as-section-t" style="margin-top:.7rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> كابشن</div><div id="campCap" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;font-size:.85rem;white-space:pre-wrap;">${e(r.caption)}</div>${_copyBtn('campCap')}`:''}
      ${(r.hashtags||[]).length?`<div class="as-section-t" style="margin-top:.7rem;">#⃣ هاشتاقات</div><div id="campTags" style="font-size:.85rem;color:var(--accent);">${r.hashtags.map(e).join(' ')}</div>${_copyBtn('campTags')}`:''}
      ${r.offer?`<div class="as-section-t" style="margin-top:.7rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> فكرة عرض</div><div style="font-size:.85rem;">${e(r.offer)}</div>`:''}`;
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

// ─── المنتجات: فلترة + تصفّح + أدوات ───
let _allProds = [], _prodPage = 1; const PROD_PER = 12;
// (4) نسبة جاهزية المنتج: صورة/وصف/سعر/قسم/SEO
function prodReadiness(p) {
  const checks = [
    ['صورة', prodImages(p).length > 0],
    ['وصف', !!p.has_description],
    ['سعر', !!p.price],
    ['قسم', !!p.category],
    ['SEO', !!p.seo],
  ];
  const done = checks.filter(c => c[1]).length;
  return { pct: Math.round(done / checks.length * 100), miss: checks.filter(c => !c[1]).map(c => c[0]) };
}
const readyColor = pct => pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
// صور المنتج: تدمج معرض الصور (images) مع الصورة الرئيسية، بلا تكرار
function prodImages(p) {
  let arr = [];
  if (Array.isArray(p.images)) arr = p.images.filter(Boolean);
  if (p.image) arr.unshift(p.image);
  return [...new Set(arr.filter(u => u && /^https?:\/\//.test(u)))];
}
// عارض صور (lightbox)
function openLightbox(imgs, i = 0) {
  imgs = (imgs || []).filter(Boolean); if (!imgs.length) return;
  let idx = i;
  let box = document.getElementById('asLightbox');
  if (!box) { box = document.createElement('div'); box.id = 'asLightbox'; box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;'; document.body.appendChild(box); }
  const render = () => { box.innerHTML = `
    <button onclick="document.getElementById('asLightbox').remove()" style="position:absolute;top:18px;left:18px;background:#fff2;color:#fff;border:none;border-radius:50%;width:42px;height:42px;font-size:1.3rem;cursor:pointer;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    <img src="${e(imgs[idx])}" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:10px;background:#fff;">
    ${imgs.length>1?`<div style="margin-top:14px;display:flex;gap:8px;align-items:center;color:#fff;">
      <button onclick="window._lbPrev()" style="background:#fff2;color:#fff;border:none;border-radius:8px;padding:.4rem .9rem;cursor:pointer;">‹</button>
      <span>${idx+1} / ${imgs.length}</span>
      <button onclick="window._lbNext()" style="background:#fff2;color:#fff;border:none;border-radius:8px;padding:.4rem .9rem;cursor:pointer;">›</button>
    </div>`:''}`; };
  window._lbPrev = () => { idx = (idx-1+imgs.length)%imgs.length; render(); };
  window._lbNext = () => { idx = (idx+1)%imgs.length; render(); };
  box.onclick = ev => { if (ev.target === box) box.remove(); };
  render();
}
function filteredProds() {
  const q = (document.getElementById('asProdSearch').value||'').trim().toLowerCase();
  const cat = document.getElementById('asProdCat').value;
  const flt = document.getElementById('asProdFilter').value;
  return _allProds.filter(p => {
    if (q && !(p.name||'').toLowerCase().includes(q)) return false;
    if (cat && p.category !== cat) return false;
    if (flt === 'nodesc' && p.has_description) return false;
    if (flt === 'noimg' && p.image) return false;
    return true;
  });
}
function renderProds(page) {
  _prodPage = page;
  const list = filteredProds();
 document.getElementById('asProdCount').textContent = `(${list.length} من ${_allProds.length})`;
  const start = (page-1)*PROD_PER;
  const pageItems = list.slice(start, start+PROD_PER);
  const wrap = document.getElementById('asProds');
  wrap.innerHTML = pageItems.map(p=>{
    const imgs = prodImages(p);
    const rd = prodReadiness(p);
    return `
    <div class="as-prod">
      <div class="as-prod-img" onclick="openProduct(${p.id})" style="cursor:pointer;position:relative;">
        ${imgs.length?`<img src="${e(imgs[0])}" alt="${e(p.name)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=&quot;color:#bbb;font-size:.7rem&quot;>تعذّر تحميل الصورة</div>'">`:'<div style="color:var(--ink-mid);font-size:.72rem;">بلا صورة</div>'}
        ${imgs.length>1?`<span style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.6);color:#fff;border-radius:6px;padding:1px 7px;font-size:.66rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> ${imgs.length}</span>`:''}
        <span title="جاهزية المنتج" style="position:absolute;top:6px;left:6px;background:${readyColor(rd.pct)};color:#fff;border-radius:6px;padding:1px 7px;font-size:.66rem;font-weight:700;">${rd.pct}%</span>
      </div>
      <div class="as-prod-b">
        <div class="as-prod-n">${e(p.name)}</div>
        ${p.price?`<div style="font-size:.78rem;font-weight:700;color:var(--accent);">${e(p.price)} ${e(p.currency||'ر.س')}</div>`:''}
        ${p.category?`<div style="font-size:.68rem;color:var(--ink-dim);">${e(p.category)}</div>`:''}
        ${rd.miss.length?`<div style="font-size:.66rem;color:#d97706;">ينقصه: ${rd.miss.map(e).join('، ')}</div>`:'<div style="font-size:.66rem;color:#22c55e;"> مكتمل</div>'}
        <button class="as-prod-ask" onclick="openProduct(${p.id})">استعراض المنتج <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
        <button class="as-prod-refresh" onclick="event.stopPropagation();refreshProductCard(${p.id}, event)" title="إعادة سحب بيانات هذا المنتج من المتجر"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> تحديث من المتجر</button>
      </div>
    </div>`;}).join('') || (_allProds.length
      ? `<div style="grid-column:1/-1;">${emptyState(IC.bag, 'لا منتجات مطابقة للفلتر', 'غيّر الفلتر أو البحث')}</div>`
      : `<div style="grid-column:1/-1;">${emptyState(IC.bag, 'لم تُسحب منتجات بعد', 'اضغط «مزامنة الآن» بالأعلى. إن كان متجرك يحجب الزحف فقد لا تظهر كل المنتجات.')}</div>`);
  // تصفّح
  const pages = Math.ceil(list.length / PROD_PER);
  document.getElementById('asProdPager').innerHTML = pages>1
    ? `<button class="btn-secondary" style="padding:.35rem .9rem;font-size:.8rem;" ${page<=1?'disabled':''} onclick="renderProds(${page-1})">السابق</button>
       <span style="margin:0 1rem;color:var(--ink-dim);font-size:.82rem;">${page}/${pages}</span>
       <button class="btn-secondary" style="padding:.35rem .9rem;font-size:.8rem;" ${page>=pages?'disabled':''} onclick="renderProds(${page+1})">التالي</button>` : '';
}

// ─── استعراض المنتج الكامل ───
// كل تفاصيل المنتج (جدول + SEO المحفوظ + نقاط البيع المحفوظة)
function pdDetails(p, imgs) {
  const row = (l, v) => `<div style="display:flex;justify-content:space-between;gap:1rem;padding:.4rem 0;border-bottom:1px solid var(--line);font-size:.82rem;"><span style="color:var(--ink-dim)">${l}</span><span style="font-weight:600;text-align:left;word-break:break-word;max-width:60%;">${v}</span></div>`;
  const yn = b => b ? '<span style="color:#16a34a"> نعم</span>' : '<span style="color:#d97706"> لا</span>';
  let seo = p.seo, bullets = p.bullets;
  try { if (typeof seo === 'string') seo = JSON.parse(seo); } catch {}
  try { if (typeof bullets === 'string') bullets = JSON.parse(bullets); } catch {}
  let html = `<div class="as-pd-section-t" style="margin-top:.8rem;"> كل التفاصيل</div><div>`;
  html += row('رقم المنتج', 'P' + p.id);
  html += row('القسم', e(p.category || '—'));
  html += row('السعر', p.price ? e(p.price + ' ' + (p.currency || 'ر.س')) : '—');
  html += row('عدد الصور', imgs.length);
  html += row('له وصف', yn(p.has_description));
  html += row('له SEO', yn(!!seo));
  html += row('له نقاط بيع', yn(!!(bullets && bullets.length)));
  if (p.url) html += row('الرابط', `<a href="${e(p.url)}" target="_blank" rel="noopener" style="color:var(--accent)">فتح <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`);
  html += `</div>`;
  if (seo && (seo.pageTitle || seo.metaDescription)) {
    html += `<div class="as-pd-section-t" style="margin-top:.8rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> SEO المحفوظ</div>
      <div style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.6rem;font-size:.8rem;line-height:1.8;">
        ${seo.pageTitle?`<b>العنوان:</b> ${e(seo.pageTitle)}<br>`:''}
        ${seo.metaDescription?`<b>الوصف:</b> ${e(seo.metaDescription)}<br>`:''}
        ${(seo.tags&&seo.tags.length)?`<b>الوسوم:</b> ${seo.tags.map(e).join('، ')}`:''}
      </div>`;
  }
  if (bullets && bullets.length) {
    html += `<div class="as-pd-section-t" style="margin-top:.8rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> نقاط البيع المحفوظة</div>
      <ul class="as-list" style="font-size:.82rem;">${bullets.map(b=>`<li>${e(b)}</li>`).join('')}</ul>`;
  }
  return html;
}

function openProduct(id) {
  const p = _allProds.find(x=>x.id===id); if (!p) return;
  const imgs = prodImages(p);
  const rd = prodReadiness(p);
  const safeName = (p.name||'').replace(/'/g,'’');
 document.getElementById('asProdModalT').textContent = p.name;
  const descText = (p.description||'').replace(/<[^>]+>/g,'').trim();
  document.getElementById('asProdModalB').innerHTML = `
    <div class="as-pd">
      <div class="as-pd-gallery">
        <div class="as-pd-main" onclick='openLightbox(${JSON.stringify(imgs)},0)'>
          ${imgs.length?`<img id="asPdMain" src="${e(imgs[0])}" alt="${e(p.name)}">`:'<div style="color:var(--ink-mid);font-size:.8rem;">لا توجد صورة</div>'}
        </div>
        ${imgs.length>1?`<div class="as-pd-thumbs">${imgs.map((u,i)=>`<img src="${e(u)}" loading="lazy" decoding="async" onclick="document.getElementById('asPdMain').src=this.src" style="${i===0?'border-color:var(--accent)':''}">`).join('')}</div>`:''}
      </div>
      <div class="as-pd-info">
        <div class="as-pd-name">${e(p.name)}</div>
        <div class="as-pd-meta">
          ${p.price?`<span class="as-pd-price">${e(p.price)} ${e(p.currency||'ر.س')}</span>`:''}
          ${p.category?`<span class="as-pd-chip">${e(p.category)}</span>`:''}
          <span class="as-pd-chip" style="background:${readyColor(rd.pct)}22;color:${readyColor(rd.pct)};font-weight:700;">جاهزية ${rd.pct}%</span>
          ${p.url?`<a class="as-pd-chip" href="${e(p.url)}" target="_blank" rel="noopener" style="color:var(--accent)">فتح في المتجر <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`:''}
        </div>
        ${rd.miss.length?`<div style="font-size:.78rem;color:#d97706;margin-bottom:.5rem;">ينقص هذا المنتج: ${rd.miss.map(e).join('، ')}</div>`:''}
        <div class="as-pd-section-t">الوصف الحالي</div>
        <div class="as-pd-desc">${descText? e(descText) : '<span style="color:var(--ink-dim)">لا يوجد وصف محفوظ لهذا المنتج.</span>'}</div>
        ${pdDetails(p, imgs)}
      </div>
    </div>
    <div class="as-pd-actions">
      ${rd.miss.length?`<button class="btn-primary" style="justify-content:center;grid-column:1/-1;background:linear-gradient(135deg,#16a34a,#22c55e);" onclick="fixGaps(${id})"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 14 8 20 8 15 12 17 18 12 14 7 18 9 12 4 8 10 8 12 2"/></svg> أصلح نواقص المنتج (${rd.miss.map(e).join('، ')})</button>`:''}
      <button class="btn-primary" style="justify-content:center;" onclick="prodAction(${id},'desc')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg> وصف بيع متكامل</button>
      <button class="btn-primary" style="justify-content:center;" onclick="prodAction(${id},'bullets')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> نقاط بيع</button>
      <button class="btn-primary" style="justify-content:center;" onclick="prodAction(${id},'seo')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> تحسين SEO</button>
      <button class="btn-secondary" style="justify-content:center;" onclick="prodAction(${id},'desc-en')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg> وصف إنجليزي</button>
      <button class="btn-secondary" style="justify-content:center;" onclick="priceSuggest(${id})"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> سعر مقترح</button>
      <button class="btn-primary" style="justify-content:center;" onclick="prodAction(${id},'enhance-clean')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> صورة احترافية</button>
      <button class="btn-primary" style="justify-content:center;" onclick="prodAction(${id},'enhance-life')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> صورة لايف ستايل</button>
      <button class="btn-secondary" style="justify-content:center;" onclick="prodAction(${id},'img')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg> ضغط الصورة</button>
      <button class="btn-secondary" style="justify-content:center;" onclick="prodAction(${id},'schema')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7" y2="7"/></svg> Schema لجوجل</button>
      <button class="btn-secondary" style="justify-content:center;" onclick="refreshProduct(${id})"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> تحديث من المتجر</button>
      <button class="btn-secondary" style="justify-content:center;" onclick="showHistory(${id})"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> سجل التغييرات</button>
    </div>
    <div class="as-pd-chat">
      <input id="asPdChatIn" class="as-input" placeholder="اسأل المساعد عن هذا المنتج… (سعر، تحسين، تسويق)" style="flex:1;" onkeydown="if(event.key==='Enter')prodChat(${id})">
      <button class="btn-secondary" style="padding:.5rem 1rem;" onclick="prodChat(${id})"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg> اسأل</button>
    </div>
    <div id="asProdResult" style="margin-top:1rem;"></div>`;
  document.getElementById('asProdModal').style.display = 'flex';
}

const _copyBtn = (id) => `<button class="as-prod-ask" style="width:auto;padding:.3rem .8rem;margin-top:.5rem;" onclick="navigator.clipboard.writeText(document.getElementById('${id}').innerText.trim());showToast('تم النسخ','success')"> نسخ</button>`;
const _applyBtn = (pid, srcId) => `<button class="btn-primary" style="width:auto;padding:.3rem .9rem;margin-top:.5rem;margin-infrom-start:.4rem;font-size:.8rem;" onclick="applyDesc(${pid},'${srcId}')"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> اعتمد كوصف المنتج</button>`;

async function applyDesc(pid, srcId) {
  const txt = document.getElementById(srcId)?.innerText.trim(); if (!txt) return;
  try {
    await api.asstProdApply(pid, txt);
    const p = _allProds.find(x=>x.id===pid); if (p) { p.description = txt; p.has_description = true; }
 showToast('تم اعتماد الوصف وحفظه', 'success');
    openProduct(pid);
 } catch (err) { showError('تعذّر', err.message); }
}

async function showHistory(pid) {
  const out = document.getElementById('asProdResult');
  out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"> تحميل السجل...</div>';
  try {
    const r = await api.asstProdHistory(pid);
    const items = r.revisions || [];
    out.innerHTML = items.length ? `<div class="as-pd-section-t">سجل تغييرات الوصف (${items.length})</div>` + items.map(h=>`
      <div style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.6rem;margin-bottom:.5rem;font-size:.82rem;">
        <div style="color:var(--ink-dim);font-size:.72rem;margin-bottom:.3rem;">${e(new Date(h.created_at).toLocaleString('ar-EG'))}</div>
        <div style="color:#d97706;">قبل: ${e((h.before_val||'—').slice(0,160))}</div>
        <div style="color:#16a34a;margin-top:.2rem;">بعد: ${e((h.after_val||'').slice(0,200))}</div>
      </div>`).join('') : emptyState(IC.file, 'لا تغييرات محفوظة بعد', 'ستظهر هنا أي تعديلات على الوصف');
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

async function fixGaps(id) {
  const out = document.getElementById('asProdResult');
  out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 14 8 20 8 15 12 17 18 12 14 7 18 9 12 4 8 10 8 12 2"/></svg> جارٍ إصلاح النواقص (وصف/SEO/نقاط بيع)...</div>';
  try {
    const r = await api.asstProdFixGaps(id);
    // حدّث المنتج محلياً
    const p = _allProds.find(x=>x.id===id);
    if (p) { if ((r.done||[]).includes('الوصف')) p.has_description = true; }
 showToast('تم إصلاح: ' + ((r.done||[]).join('، ') || 'لا شيء ناقص'), 'success');
    // أعد تحميل البيانات لجلب المحتوى المحفوظ ثم افتح المنتج
    await refreshStoreData(); openProduct(id);
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}
async function refreshProduct(id) {
  const out = document.getElementById('asProdResult');
  out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> جارٍ تحديث المنتج من المتجر...</div>';
  try {
    const r = await api.asstProdRefresh(id);
    const i = _allProds.findIndex(x=>x.id===id);
    if (i >= 0 && r.product) _allProds[i] = r.product;
 showToast('تم تحديث المنتج من المتجر', 'success');
    openProduct(id); renderProds(_prodPage);
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}
// تحديث منتج واحد من المتجر مباشرةً من بطاقته (بدون فتح النافذة)
async function refreshProductCard(id, ev) {
  const btn = ev && ev.currentTarget;
  if (btn) { btn.disabled = true; btn._html = btn.innerHTML; btn.textContent = 'جارٍ التحديث...'; }
  try {
    const r = await api.asstProdRefresh(id);
    const i = _allProds.findIndex(x => x.id === id);
    if (i >= 0 && r.product) _allProds[i] = r.product;
    showToast('تم تحديث المنتج من المتجر', 'success');
    renderProds(_prodPage); // يعيد بناء الشبكة بالبيانات الجديدة
  } catch (err) {
    showError('تعذّر', err.message || 'فشل تحديث المنتج');
    if (btn) { btn.disabled = false; if (btn._html) btn.innerHTML = btn._html; }
  }
}
// إعادة تحميل بيانات المتجر النشط (للمنتجات بعد التوليد/الحفظ)
async function refreshStoreData() {
  try { const d = await api.asstGetStore(); _allProds = d.products || _allProds; _lastData = d; renderProds(_prodPage); } catch(_){}
}
async function priceSuggest(id) {
  const out = document.getElementById('asProdResult');
  out.innerHTML = `<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.6rem;">
    <span style="font-size:.83rem;">تكلفة المنتج (اختياري):</span>
    <input id="pscost" type="number" min="0" placeholder="ر.س" class="as-input" style="width:110px;flex:0;">
    <button class="btn-primary" style="padding:.4rem 1rem;font-size:.82rem;" onclick="runPrice(${id})">اقترح السعر</button>
  </div><div id="psout"></div>`;
}
async function runPrice(id) {
  const cost = document.getElementById('pscost')?.value;
  const o = document.getElementById('psout');
  o.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;">جارٍ التحليل...</div>';
  try {
    const r = await api.asstProdPrice(id, cost);
    const st = r.stats || {};
    o.innerHTML = `<div style="background:var(--accent-soft);border-radius:10px;padding:.9rem;">
      <div style="font-size:.8rem;color:var(--ink-dim);">السعر المقترح</div>
      <div style="font-size:1.8rem;font-weight:800;color:var(--accent);">${r.suggested!=null?e(r.suggested)+' ر.س':'—'} <span style="font-size:.8rem;font-weight:600;color:var(--ink-dim);">${e(r.position||'')}</span></div>
      <div style="font-size:.85rem;margin-top:.4rem;line-height:1.8;">${e(r.reasoning||'')}</div>
      <div style="font-size:.76rem;color:var(--ink-dim);margin-top:.5rem;">أسعار القسم — متوسط: ${st.avg??'—'} · من ${st.min??'—'} إلى ${st.max??'—'} (${st.count||0} منتج)</div>
    </div>`;
  } catch (err) { o.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}
async function prodChat(id) {
  const inp = document.getElementById('asPdChatIn'); const msg = (inp.value||'').trim(); if (!msg) return;
  const out = document.getElementById('asProdResult');
  inp.value=''; out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"> المساعد يكتب...</div>';
  try {
    const r = await api.asstProdChat(id, msg);
    out.innerHTML = `<div id="prRes" style="background:var(--accent-soft);border-radius:8px;padding:.8rem;line-height:1.9;font-size:.88rem;white-space:pre-wrap;">${e(r.reply)}</div>${_copyBtn('prRes')}`;
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

async function prodAction(id, kind) {
  const out = document.getElementById('asProdResult');
  out.innerHTML = '<div style="color:var(--ink-dim);font-size:.85rem;"> جارٍ المعالجة...</div>';
  try {
    if (kind === 'desc-en') {
      const r = await api.asstProdDesc(id, 'en');
      out.innerHTML = `<div style="font-weight:700;margin-bottom:.4rem;">English description:</div><div id="prRes" dir="ltr" style="text-align:left;background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.88rem;white-space:pre-wrap;">${e(r.description)}</div>${_copyBtn('prRes')}`;
    } else if (kind === 'desc') {
      const r = await api.asstProdDesc(id);
      const p = _allProds.find(x => x.id === id);
      const cur = (p && p.description || '').replace(/<[^>]+>/g, '').trim();
      const diff = cur
        ? `<div class="as-diff"><div class="col"><h5>الوصف الحالي</h5>${e(cur)}</div><div class="col new"><h5>الوصف المقترح</h5><span id="prRes">${e(r.description)}</span></div></div>`
        : `<div style="font-weight:700;margin-bottom:.4rem;">الوصف المقترح:</div><div id="prRes" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.88rem;white-space:pre-wrap;">${e(r.description)}</div>`;
      out.innerHTML = diff + `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem;">${_copyBtn('prRes')}${_applyBtn(id,'prRes')}</div>`;
    } else if (kind === 'bullets') {
      const r = await api.asstProdBullets(id);
      out.innerHTML = `<div style="font-weight:700;margin-bottom:.4rem;">نقاط البيع:</div><ul id="prRes" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem 1.4rem;line-height:1.9;font-size:.86rem;">${(r.bullets||[]).map(b=>`<li>${e(b)}</li>`).join('')}</ul>${_copyBtn('prRes')}`;
    } else if (kind === 'seo') {
      const r = await api.asstProdSeo(id);
      out.innerHTML = `<div id="prRes" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;line-height:1.9;font-size:.86rem;">
        <b>عنوان الصفحة:</b> ${e(r.pageTitle)}<br><b>وصف الصفحة:</b> ${e(r.metaDescription)}<br><b>الوسوم:</b> ${(r.tags||[]).map(e).join('، ')}</div>${_copyBtn('prRes')}`;
    } else if (kind === 'enhance-clean' || kind === 'enhance-life') {
      const mode = kind === 'enhance-life' ? 'lifestyle' : 'clean';
      const label = mode === 'lifestyle' ? 'صورة لايف ستايل' : 'صورة احترافية بخلفية نظيفة';
      out.innerHTML = `<div style="color:var(--ink-dim);font-size:.85rem;">الذكاء يحلّل المنتج ويولّد ${e(label)}... (قد يستغرق نصف دقيقة)</div>`;
      const r = await api.asstProdEnhanceImg(id, mode);
      out.innerHTML = `<div style="font-size:.85rem;margin-bottom:.5rem;font-weight:700;">${r.ai ? e(label) : 'صورة بخلفية بيضاء نظيفة'}</div>
        <img src="${r.image}" style="max-width:240px;width:100%;border-radius:10px;display:block;margin-bottom:.5rem;background:#fff;border:1px solid var(--line);">
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <a class="btn-primary" style="padding:.4rem 1rem;font-size:.83rem;" href="${r.image}" download="${e(r.name)}.png">تحميل الصورة</a>
          <button class="btn-secondary" style="padding:.4rem 1rem;font-size:.83rem;" onclick="prodAction(${id},'${kind}')">إعادة التوليد</button>
        </div>`;
    } else if (kind === 'img') {
      const r = await api.asstProdCompress(id);
      const kb = n => (n/1024).toFixed(0)+'KB';
      out.innerHTML = `<div style="font-size:.85rem;margin-bottom:.5rem;">الحجم: <b>${kb(r.originalSize)}</b> ← <b style="color:#22c55e">${kb(r.compressedSize)}</b> (وفّرت ${r.saved}%)</div>
        <img src="${r.image}" style="max-width:160px;border-radius:8px;display:block;margin-bottom:.5rem;background:#fff;">
        <a class="btn-primary" style="padding:.4rem 1rem;font-size:.83rem;" href="${r.image}" download="${e(r.name)}.webp"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> تحميل الصورة</a>`;
    } else if (kind === 'schema') {
      const r = await api.asstProdSchema(id);
      out.innerHTML = `<div style="font-weight:700;margin-bottom:.4rem;">Schema (JSON-LD) — الصقها في صفحة المنتج لتحسين ظهورك في جوجل:</div>
        <pre id="prRes" style="background:var(--bg-card);border:1px solid var(--line);border-radius:8px;padding:.7rem;font-size:.74rem;overflow-x:auto;direction:ltr;text-align:left;white-space:pre-wrap;">${e(r.html)}</pre>${_copyBtn('prRes')}`;
    }
  } catch (err) { out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;">${e(err.message||'تعذّر')}</div>`; }
}

// ─── الشات ───
function addMsg(role, text) {
  const box = document.getElementById('asMsgs');
  const div = document.createElement('div');
  div.className = 'as-msg ' + role;
 div.textContent = text;
  box.appendChild(div); box.scrollTop = box.scrollHeight;
  return div;
}
async function loadChat() {
  let hist; try { hist = await api.asstChatHistory(); } catch (_) { hist = []; }
  const box = document.getElementById('asMsgs'); box.innerHTML = '';
 if (!hist.length) addMsg('assistant', 'أهلاً! أنا مساعدك الذكي لمتجرك. اسألني عن أي شيء: تحسينات، تسويق، منتجات، أو أرفق لي تقريراً وسأحلّله لك.');
 else hist.forEach(m => addMsg(m.role === 'user' ? 'user' : 'assistant', m.content));
}
function asQuick(t){ document.getElementById('asText').value = t; sendMsg(); }

async function sendMsg() {
  const ta = document.getElementById('asText');
  const msg = ta.value.trim();
  if (!msg && !_attach) return;
 if (msg) addMsg('user', msg);
 if (_attach?.name) addMsg('user', ' ' + _attach.name);
  ta.value = ''; ta.style.height = 'auto';
  const payload = { message: msg };
  if (_attach?.text) payload.attachmentText = _attach.text;
  if (_attach?.image) payload.images = [_attach.image];
  _attach = null; document.getElementById('asAttachChip').innerHTML = '';
 const typing = addMsg('assistant typing', 'يكتب...');
  try {
    const r = await api.asstChat(payload);
 typing.remove(); addMsg('assistant', r.reply);
    if (r.offerSupport) showSupportCta(msg);
 } catch (err) { typing.remove(); addMsg('assistant', ' ' + (err.message || 'تعذّر الرد')); }
}

// زر فتح تذكرة يظهر داخل المحادثة عند طلب التواصل
function showSupportCta(prefill) {
  const box = document.getElementById('asMsgs');
  const wrap = document.createElement('div');
  wrap.className = 'as-msg assistant';
  wrap.style.background = 'var(--accent-soft)';
  wrap.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> تحب أوصلك بفريق خدمة العملاء؟ <button class="as-prod-ask" style="margin-top:.5rem;width:auto;padding:.4rem .9rem;" onclick="openSupport(' + JSON.stringify(prefill || '').replace(/"/g,'&quot;') + ')">افتح تذكرة دعم (VIP) <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>';
  box.appendChild(wrap); box.scrollTop = box.scrollHeight;
}

async function openSupport(prefill) {
  try {
    const t = await api.tickets.create({ topic: 'دعم من مساعد التاجر', message: prefill || 'أحتاج التواصل مع خدمة العملاء بخصوص متجري.', vip: true });
 showToast('تم فتح تذكرة VIP رقم ' + (t.number || ''), 'success');
 addMsg('assistant', ' تم فتح تذكرتك (' + (t.number || '') + ') كعميل VIP. تابع الردّ من «رسائلي». سيردّ الفريق بأولوية.');
 } catch (err) { showError('تعذّر', err.message); }
}

// ─── خطة العمل (المهام) ───
async function loadTasks() {
  let d; try { d = await api.asstTasks(); } catch (_) { return; }
  const tasks = d.tasks || [];
 document.getElementById('asTabTaskN').textContent = tasks.length || '';
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  document.getElementById('asPlanFill').style.width = pct + '%';
 document.getElementById('asPlanPct').textContent = pct + '%';
  document.getElementById('asTasks').innerHTML = tasks.length ? tasks.map(t => `
    <div class="as-task ${t.done ? 'done' : ''}" draggable="true" data-id="${t.id}">
      <span class="as-task-grip" title="اسحب للترتيب"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg></span>
      <div class="as-task-cb" onclick="toggleTask(${t.id}, ${!t.done})">${t.done ? '✓' : ''}</div>
      <div class="as-task-txt">${e(t.text)}</div>
      <button class="as-task-del" onclick="delTask(${t.id})" title="حذف"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>`).join('') : emptyState(IC.check, 'لا مهام بعد', 'اضغط «ولّد خطة هذا الأسبوع» أو زامن متجرك لتظهر التوصيات كمهام');
  bindTaskDnd();
}
// سحب وإفلات المهام
let _dragTask = null;
function bindTaskDnd() {
  const box = document.getElementById('asTasks'); if (!box) return;
  box.querySelectorAll('.as-task[draggable=true]').forEach(row => {
    row.addEventListener('dragstart', () => { _dragTask = row; row.classList.add('dragging'); });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); box.querySelectorAll('.as-task').forEach(r => r.classList.remove('dragover')); saveTaskOrder(); });
    row.addEventListener('dragover', ev => { ev.preventDefault(); if (row !== _dragTask) row.classList.add('dragover'); });
    row.addEventListener('dragleave', () => row.classList.remove('dragover'));
    row.addEventListener('drop', ev => {
      ev.preventDefault(); row.classList.remove('dragover');
      if (!_dragTask || row === _dragTask) return;
      const rows = [...box.querySelectorAll('.as-task')];
      const di = rows.indexOf(_dragTask), ti = rows.indexOf(row);
      if (di < ti) row.after(_dragTask); else row.before(_dragTask);
    });
  });
}
async function saveTaskOrder() {
  const ids = [...document.querySelectorAll('#asTasks .as-task')].map(r => +r.dataset.id);
  await api.asstTaskReorder(ids).catch(() => {});
}
async function genWeeklyPlan(btn) {
 if (btn) { btn.disabled = true; btn.textContent = ' جارٍ التوليد...'; }
  try {
    const r = await api.asstWeeklyPlan();
 showToast(r.added ? `أُضيفت ${r.added} مهمة لخطتك` : 'خطتك محدّثة بالفعل', 'success');
    loadTasks();
 } catch (err) { showError('تعذّر', err.message); }
 finally { if (btn) { btn.disabled = false; btn.textContent = ' ولّد خطة هذا الأسبوع'; } }
}
async function toggleTask(id, done) { await api.asstTaskToggle(id, done).catch(()=>{}); loadTasks(); }
async function delTask(id) { await api.asstTaskDel(id).catch(()=>{}); loadTasks(); }

// ─── إجراءات جماعية ───
async function bulkAction(type, btn) {
  const prog = document.getElementById('asBulkProg');
 btn.disabled = true; const orig = btn.textContent; btn.textContent = ' جارٍ المعالجة...';
 prog.style.display = 'block'; prog.textContent = 'جارٍ المعالجة الجماعية... قد يستغرق دقيقة';
  try {
    const r = await api.asstBulk(type);
 prog.textContent = ` تمت معالجة ${r.processed || 0} منتج` + (r.message ? ' — ' + r.message : '');
    if (type === 'description') { await load(); } // أعد تحميل المنتجات المحدّثة
 } catch (err) { prog.textContent = ' ' + (err.message || 'تعذّر'); }
 finally { btn.disabled = false; btn.textContent = orig; }
}

// ─── مقارنة بمنافس (HTML مشترك بين النافذة والقسم) ───
function _compareHTML(r, url, trackInline) {
  const better = (a, b, higher = true) => { // أيّ طرف أفضل (يلوّن الأرقام)
    if (a == null || b == null || a === b) return ['', ''];
    const aWin = higher ? a > b : a < b;
    return aWin ? ['color:#16a34a;font-weight:700', ''] : ['', 'color:#16a34a;font-weight:700'];
  };
  const row = (label, a, b, hl) => {
    const [ca, cb] = hl || ['', ''];
    return `<div class="cmp-row"><div style="${ca}">${e(String(a ?? '—'))}</div><div class="lbl">${label}</div><div style="${cb}">${e(String(b ?? '—'))}</div></div>`;
  };
  _lastCompare = r;
  const M = r.mine, C = r.competitor;
  const safeUrl = (r.competitorUrl || url).replace(/'/g, '');
  const trackBtn = trackInline
    ? `<button class="btn-primary" style="width:100%;justify-content:center;margin-top:1rem;" onclick="trackFromCompare('${e(safeUrl)}')">تابع هذا المنافس تلقائيًا</button>`
    : `<button class="btn-primary" style="width:100%;justify-content:center;margin-top:1rem;" onclick="trackCompetitor('${e(safeUrl)}')">تابع هذا المنافس تلقائيًا</button>`;
  return `
    <div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:.6rem;"><span>${e(M.name||'متجري')}</span><span style="color:var(--ink-dim)">مقابل</span><span>${e(C.name||'المنافس')}</span></div>
    ${row('المنتجات', M.products, C.products, better(M.products, C.products))}
    ${row('الأقسام', M.categories, C.categories, better(M.categories, C.categories))}
    ${row('متوسط السعر (ر.س)', M.avgPrice, C.avgPrice)}
    ${row('طرق الدفع', (M.payment||[]).length, (C.payment||[]).length, better((M.payment||[]).length, (C.payment||[]).length))}
    ${row('SEO', M.seoScore!=null?M.seoScore+'%':'—', C.seoScore!=null?C.seoScore+'%':'—', better(M.seoScore, C.seoScore))}
    ${row('الثقة', M.trustScore!=null?M.trustScore+'%':'—', C.trustScore!=null?C.trustScore+'%':'—', better(M.trustScore, C.trustScore))}
    ${row('منصات التواصل', (M.socials||[]).length, (C.socials||[]).length, better((M.socials||[]).length,(C.socials||[]).length))}
    ${r.summary ? `<p style="margin-top:1rem;line-height:1.8;">${e(r.summary)}</p>` : ''}
    ${r.pricing ? `<div style="background:var(--accent-soft);border-radius:8px;padding:.6rem .8rem;font-size:.85rem;line-height:1.8;margin-top:.5rem;">${e(r.pricing)}</div>` : ''}
    ${(r.advantages||[]).length ? `<div class="as-section-t" style="margin-top:.8rem;color:#16a34a;">نقاط تفوّقك</div><ul class="as-list">${r.advantages.map(g=>`<li>${e(g)}</li>`).join('')}</ul>` : ''}
    ${(r.gaps||[]).length ? `<div class="as-section-t" style="margin-top:.6rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg> فجوات عندك</div><ul class="as-list">${r.gaps.map(g=>`<li>${e(g)}</li>`).join('')}</ul>` : ''}
    ${(r.plan||[]).length ? `<div class="as-section-t" style="margin-top:.6rem;"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l-2 6 6-2 8-8a3 3 0 0 0-4-4z"/><path d="M14 6l4 4"/></svg> خطة التفوّق</div><ul class="as-list">${r.plan.map(g=>`<li>${e(g)}</li>`).join('')}</ul>` : ''}
    ${trackBtn}
    <button class="btn-secondary" style="width:100%;justify-content:center;margin-top:.5rem;gap:.4rem;" onclick="shareCompareWhatsApp()"><svg class="ic" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15l-1.4 5 5.1-1.3A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z"/></svg> شارك المقارنة عبر واتساب</button>`;
}
let _lastCompare = null;
function shareCompareWhatsApp() {
  const r = _lastCompare; if (!r) return;
  const M = r.mine || {}, C = r.competitor || {};
  const L = [
    `مقارنة: «${M.name || 'متجري'}» مقابل «${C.name || 'المنافس'}»`,
    `المنتجات: ${M.products ?? '—'} مقابل ${C.products ?? '—'}`,
    `الأقسام: ${M.categories ?? '—'} مقابل ${C.categories ?? '—'}`,
    `متوسط السعر: ${M.avgPrice ?? '—'} مقابل ${C.avgPrice ?? '—'}`,
  ];
  if (r.summary) L.push('', r.summary);
  if ((r.advantages || []).length) L.push('', 'نقاط تفوّقي:', ...r.advantages.map(x => '• ' + x));
  L.push('', 'حُلّل عبر «مساعد التاجر» من أدوات التاجر');
  window.open('https://wa.me/?text=' + encodeURIComponent(L.join('\n')), '_blank', 'noopener');
}
async function runCompare() {
  const url = document.getElementById('asCmpUrl').value.trim();
 if (!url) { showError('مطلوب', 'أدخل رابط المنافس'); return; }
  const body = document.getElementById('asCmpBody');
  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--ink-dim);"> جارٍ تحليل المنافس... (~دقيقة)</div>';
  try { const r = await api.asstCompare(url); body.innerHTML = _compareHTML(r, url, false); }
  catch (err) { body.innerHTML = `<div style="color:#ef4444;padding:1.5rem;text-align:center;">${e(err.message||'تعذّر')}</div>`; }
}
// نسخة القسم المستقل
async function runCompareInline() {
  const url = (document.getElementById('asCmpInlineUrl').value || '').trim();
  if (!url) { showError('مطلوب', 'أدخل رابط المنافس'); return; }
  const body = document.getElementById('asCmpInlineBody');
  const btn = document.getElementById('asCmpInlineGo');
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التحليل…'; }
  body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--ink-dim);"> جارٍ تحليل المنافس... (~دقيقة)</div>';
  try { const r = await api.asstCompare(url); body.innerHTML = _compareHTML(r, url, true); }
  catch (err) { body.innerHTML = `<div style="color:#ef4444;padding:1.5rem;text-align:center;">${e(err.message||'تعذّر')}</div>`; }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'قارن الآن'; } }
}
// المتابعة من نافذة المقارنة القديمة (الإجراءات) → تضيف للقائمة
async function trackCompetitor(url) {
  try { await api.asstAddCompetitor(url);
    showToast('تتم متابعة المنافس — ستصلك تنبيهات عند تغيّر منتجاته', 'success');
    const m = document.getElementById('asCmpModal'); if (m) m.style.display = 'none';
  } catch (err) { showError('تعذّر', err.message); }
}
// المتابعة من داخل القسم → تضيف للقائمة وتحدّثها
async function trackFromCompare(url) {
  try { await api.asstAddCompetitor(url); showToast('تتم متابعة المنافس', 'success'); renderCompetitors(); }
  catch (err) { showError('تعذّر', err.message); }
}

// ─── تصدير تقرير PDF ───
// تحليل التسعير الذكي مقابل السوق
async function runPricingAnalysis() {
  const out = document.getElementById('asPricingOut'), btn = document.getElementById('asPricingBtn');
  if (!out) return;
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ التحليل…'; }
  out.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--ink-dim);">جارٍ سحب أسعار السوق وتحليلها… (قد يستغرق دقيقة-دقيقتين)</div>';
  try {
    const r = await api.asstPricing();
    const posMeta = { above: ['أسعارك أعلى من السوق', '#ef4444'], below: ['أسعارك أقل من السوق', '#f59e0b'], aligned: ['أسعارك متوافقة مع السوق', '#22c55e'] };
    const [pTxt, pCol] = posMeta[r.position] || posMeta.aligned;
    const mx = Math.max(r.myStats.avg, r.marketStats.avg, 1);
    const bar = (lbl, val, col) => `<div style="margin:.35rem 0;"><div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:.2rem;"><span>${lbl}</span><b style="color:${col}">${val} ر.س</b></div><div style="height:8px;background:var(--line);border-radius:99px;overflow:hidden;"><div style="height:100%;width:${Math.round(val / mx * 100)}%;background:${col};border-radius:99px;"></div></div></div>`;
    const prodRows = (r.products || []).map(p => `<tr>
      <td style="padding:.4rem .5rem;border-top:1px solid var(--line);">${e(p.name)}</td>
      <td style="padding:.4rem .5rem;border-top:1px solid var(--line);white-space:nowrap;">${e(String(p.current ?? '—'))}</td>
      <td style="padding:.4rem .5rem;border-top:1px solid var(--line);white-space:nowrap;color:var(--accent);font-weight:700;">${e(String(p.suggestion ?? '—'))}</td>
      <td style="padding:.4rem .5rem;border-top:1px solid var(--line);color:var(--ink-dim);font-size:.8rem;">${e(p.reason || '')}</td>
    </tr>`).join('');
    out.innerHTML = `
      <div style="display:inline-block;font-weight:700;font-size:.85rem;color:${pCol};background:${pCol}1a;border-radius:99px;padding:.2rem .8rem;margin-bottom:.5rem;">${pTxt}</div>
      <div style="background:var(--bg-card);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;margin-bottom:.6rem;">
        ${bar('متوسط أسعارك', r.myStats.avg, 'var(--accent)')}
        ${bar('متوسط السوق', r.marketStats.avg, '#3b82f6')}
        <div style="font-size:.74rem;color:var(--ink-dim);margin-top:.4rem;">مقارنة مع: ${(r.competitors || []).map(e).join('، ')} · عيّنة السوق ${r.marketStats.count} سعر</div>
      </div>
      ${r.summary ? `<p style="font-size:.88rem;line-height:1.8;margin:.2rem 0 .6rem;">${e(r.summary)}</p>` : ''}
      ${(r.categoryNotes || []).length ? `<ul class="as-list">${r.categoryNotes.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}
      ${prodRows ? `<div style="overflow-x:auto;margin-top:.5rem;"><table style="width:100%;border-collapse:collapse;font-size:.85rem;"><thead><tr style="color:var(--ink-dim);font-size:.76rem;text-align:start;"><th style="padding:.3rem .5rem;text-align:start;">المنتج</th><th style="padding:.3rem .5rem;text-align:start;">الحالي</th><th style="padding:.3rem .5rem;text-align:start;">المقترح</th><th style="padding:.3rem .5rem;text-align:start;">السبب</th></tr></thead><tbody>${prodRows}</tbody></table></div>` : ''}
      ${(r.actions || []).length ? `<div class="as-section-t" style="margin-top:.7rem;font-size:.85rem;">خطوات عملية</div><ul class="as-list">${r.actions.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}`;
  } catch (err) {
    out.innerHTML = `<div style="color:#ef4444;font-size:.85rem;padding:1rem;">${e(err.message || 'تعذّر التحليل')}</div>`;
  } finally { if (btn) { btn.disabled = false; btn.textContent = 'حلّل الأسعار'; } }
}
// مشاركة ملخص المتجر عبر واتساب
function shareReportWhatsApp() {
  const d = _lastData; if (!d || !d.store) { showError('لا بيانات', 'زامن متجرك أولاً'); return; }
  const s = d.store, rep = s.latest_report || {};
  const prods = _allProds || [], n = prods.length || 1, pc = x => Math.round(x / n * 100);
  const score = s.latest_score ?? '—';
  const L = [
    `ملخّص متجر «${s.store_name || 'متجري'}»`,
    `التقييم العام: ${score}/100`,
    `عدد المنتجات: ${(d.products || []).length}`,
    `اكتمال الأوصاف: ${pc(prods.filter(p => p.has_description).length)}%`,
    `اكتمال الصور: ${pc(prods.filter(p => prodImages(p).length).length)}%`,
    `اكتمال السيو: ${pc(prods.filter(p => p.seo).length)}%`,
  ];
  if (rep.summary) L.push('', rep.summary);
  if (s.store_url) L.push('', `رابط المتجر: ${s.store_url}`);
  L.push('', 'حُلّل عبر «مساعد التاجر» من أدوات التاجر');
  const url = 'https://wa.me/?text=' + encodeURIComponent(L.join('\n'));
  window.open(url, '_blank', 'noopener');
  toggleActions();
}
function exportStorePdf() {
  const d = _lastData; if (!d || !d.store) return;
  const s = d.store, rep = s.latest_report || {};
  const esc2 = x => String(x ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
  const prods = _allProds || [];
  const n = prods.length || 1;
  const pc = x => Math.round(x / n * 100);
  const withDesc = pc(prods.filter(p => p.has_description).length);
  const withImg = pc(prods.filter(p => prodImages(p).length).length);
  const withSeo = pc(prods.filter(p => p.seo).length);
  const cats = d.categories || rep.categories || [];
  const score = s.latest_score ?? 0;
  const scol = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
  const sec = (t, arr, c) => (arr && arr.length) ? `<h2>${t}<\/h2><ul>${arr.map(x => `<li style="color:${c||'#1a1a2e'}">${esc2(x)}<\/li>`).join('')}<\/ul>` : '';
  const kpi = (v, l, col) => `<div class="kc"><div class="kv" style="color:${col||'#6d28d9'}">${v}<\/div><div class="kl">${esc2(l)}<\/div><\/div>`;
  const bar = (l, v) => { const c = v >= 80 ? '#16a34a' : v >= 50 ? '#d97706' : '#dc2626'; return `<div class="br"><div class="brh"><span>${l}<\/span><b style="color:${c}">${v}%<\/b><\/div><div class="brt"><div class="brf" style="width:${v}%;background:${c}"><\/div><\/div><\/div>`; };
  // توزيع الأقسام (أعلى 6)
  const byCat = {}; prods.forEach(p => { const c = p.category || 'بدون قسم'; byCat[c] = (byCat[c] || 0) + 1; });
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(x => `<tr><td>${esc2(x[0])}<\/td><td style="text-align:left;font-weight:700;">${x[1]}<\/td><\/tr>`).join('');
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير ${esc2(s.store_name)}<\/title>
    <style>
    *{box-sizing:border-box;} body{font-family:Tahoma,Arial,sans-serif;color:#1a1a2e;padding:0;margin:0;line-height:1.9;}
    .wrap{padding:30px 34px;max-width:820px;margin:0 auto;}
    .hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #6d28d9;padding-bottom:16px;margin-bottom:20px;}
    .hd h1{color:#6d28d9;margin:0;font-size:22px;} .hd .sub{color:#777;font-size:13px;margin-top:4px;}
    .ring{width:96px;height:96px;border-radius:50%;background:conic-gradient(${scol} ${score*3.6}deg,#eee 0);display:flex;align-items:center;justify-content:center;}
    .ring i{width:74px;height:74px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font-style:normal;}
    .ring b{font-size:26px;color:${scol};} .ring s{font-size:10px;color:#999;text-decoration:none;}
    .meta{background:#f7f5ff;border:1px solid #e6e0fa;border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:18px;}
    .meta b{color:#6d28d9;}
    .kpis{display:flex;gap:10px;margin:16px 0;} .kc{flex:1;background:#faf9ff;border:1px solid #eee;border-radius:10px;padding:12px;text-align:center;}
    .kv{font-size:24px;font-weight:800;} .kl{font-size:11px;color:#777;margin-top:4px;}
    h2{color:#6d28d9;font-size:15px;border-bottom:1px solid #eee;padding-bottom:5px;margin:22px 0 8px;}
    ul{padding-inline-start:20px;margin:6px 0;} li{margin:4px 0;font-size:13.5px;}
    .br{margin:7px 0;} .brh{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:3px;} .brt{height:9px;background:#eee;border-radius:99px;overflow:hidden;} .brf{height:100%;border-radius:99px;}
    table{width:100%;border-collapse:collapse;font-size:13px;} td{border-bottom:1px solid #eee;padding:6px 8px;}
    .foot{margin-top:26px;border-top:1px solid #eee;padding-top:10px;font-size:11px;color:#999;text-align:center;}
    @media print{.wrap{padding:0 6px;}}
    <\/style><\/head><body><div class="wrap">
    <div class="hd"><div><h1>تقرير متجر ${esc2(s.store_name)}<\/h1><div class="sub">${esc2(s.platform || '')} · ${esc2(s.store_url)}<\/div><\/div>
      <div class="ring"><i><b>${score}<\/b><s>من 100<\/s><\/i><\/div><\/div>
    <div class="meta"><b>المنتجات:<\/b> ${rep.productsCount ?? prods.length} &nbsp;|&nbsp; <b>الأقسام:<\/b> ${cats.length} &nbsp;|&nbsp; <b>الصفحات:<\/b> ${(d.pages||[]).length} &nbsp;|&nbsp; <b>آخر مزامنة:<\/b> ${s.last_synced_at ? new Date(s.last_synced_at).toLocaleString('ar-EG',{dateStyle:'short'}) : '—'}<\/div>
    <div class="kpis">${kpi(withDesc + '%', 'له وصف', withDesc>=80?'#16a34a':'#d97706')}${kpi(withImg + '%', 'له صورة', withImg>=80?'#16a34a':'#d97706')}${kpi(withSeo + '%', 'له SEO', withSeo>=80?'#16a34a':'#d97706')}<\/div>
    <h2>ملخّص الحالة<\/h2><p style="font-size:13.5px;">${esc2(rep.summary || '')}<\/p>
    <h2>جاهزية المنتجات<\/h2>${bar('الأوصاف', withDesc)}${bar('الصور', withImg)}${bar('تحسين SEO', withSeo)}
    ${catRows ? `<h2>توزيع المنتجات على الأقسام<\/h2><table>${catRows}<\/table>` : ''}
    ${sec('نقاط القوة', rep.strengths, '#16a34a')}
    ${sec('نقاط الضعف', rep.weaknesses, '#dc2626')}
    ${sec('التوصيات', rep.recommendations)}
    <div class="foot">أدوات التاجر — مساعد التاجر · خبراء المنصات · ${new Date().toLocaleString('ar')}<\/div>
    <\/div><\/body><\/html>`;
  const w = window.open('', '_blank'); if (!w) { showError('تنبيه', 'فعّل النوافذ المنبثقة'); return; }
  w.document.write(html); w.document.close(); w.onload = () => { w.focus(); w.print(); };
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 500);
}

// ─── تصدير منتجات المتجر CSV (للرفع على المتجر مباشرة) ───
function exportProductsCsv() {
  const prods = _allProds || [];
 if (!prods.length) { showError('لا منتجات', 'لا توجد منتجات لتصديرها.'); return; }
  const cols = ['الاسم','السعر','العملة','القسم','له وصف','رابط الصورة','رابط المنتج','الوصف'];
  const esc = v => '"' + String(v ?? '').replace(/"/g,'""').replace(/\r?\n/g,' ') + '"';
  const rows = prods.map(p => [p.name, p.price, p.currency||'ر.س', p.category||'', p.has_description?'نعم':'لا', p.image||'', p.url||'', (p.description||'').replace(/<[^>]+>/g,'')].map(esc).join(','));
  const csv = '﻿' + cols.map(esc).join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `منتجات-${(_lastData?.store?.store_name||'المتجر').replace(/[\\/:*?"<>|]/g,'')}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
 showToast('تم تصدير CSV', 'success');
}

// ─── أحداث ───
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('asAddBtn');
  if (addBtn) addBtn.addEventListener('click', async () => {
    const url = document.getElementById('asUrl').value.trim();
 if (!url) { showError('مطلوب', 'أدخل رابط متجرك'); return; }
 addBtn.disabled = true; addBtn.textContent = ' جارٍ السحب والتحليل...';
    startProg();
 try { const r = await api.asstAddStore(url); if (r && r.storeId) api.setStore(r.storeId); stopProg(true); document.getElementById('asUrl').value=''; showToast('تم ربط متجرك وتحليله', 'success'); load(); }
 catch (err) { stopProg(false); showError('تعذّر', err.message); }
 finally { addBtn.disabled = false; addBtn.textContent = 'ابدأ التحليل'; }
  });
  document.getElementById('asSyncBtn').addEventListener('click', async (ev) => {
 ev.target.disabled = true; ev.target.textContent = ' مزامنة...';
    startProg();
 try { await api.asstSync(); stopProg(true); showToast('تمت المزامنة', 'success'); load(); }
 catch (err) { stopProg(false); showError('تعذّر', err.message); }
 finally { ev.target.disabled = false; ev.target.textContent = ' مزامنة الآن'; }
  });
  document.getElementById('asDelBtn').addEventListener('click', () => {
    const doDel = async () => { await api.asstDeleteStore(); api.setStore(null); load(); };
    showConfirm ? showConfirm('حذف المتجر', 'سيُحذف هذا المتجر وكل بياناته ومحادثاته. متابعة؟', doDel, 'حذف')
      : (async () => { if (confirm('حذف هذا المتجر؟')) doDel(); })();
  });
  document.getElementById('asExportBtn').addEventListener('click', exportProductsCsv);
  { const sb = document.getElementById('asShareBtn'); if (sb) sb.addEventListener('click', shareReportWhatsApp); }
  document.getElementById('asSendBtn').addEventListener('click', sendMsg);
  document.getElementById('asClearChat').addEventListener('click', async () => { await api.asstClearChat().catch(()=>{}); loadChat(); });
  document.getElementById('asSupportBtn').addEventListener('click', () => openSupport('أحتاج التواصل مع خدمة العملاء بخصوص متجري.'));
  // ميزات جديدة
  document.getElementById('asPdfBtn').addEventListener('click', exportStorePdf);
  document.getElementById('asCompareBtn').addEventListener('click', () => { document.getElementById('asCmpModal').style.display = 'flex'; });
  document.getElementById('asCmpGo').addEventListener('click', runCompare);
  document.getElementById('asBulkDesc').addEventListener('click', (ev) => bulkAction('description', ev.currentTarget));
  document.getElementById('asBulkSeo').addEventListener('click', (ev) => bulkAction('seo', ev.currentTarget));
  document.getElementById('asTaskAddBtn').addEventListener('click', async () => {
    const inp = document.getElementById('asTaskInput'); const t = inp.value.trim();
    if (!t) return; await api.asstTaskAdd(t).catch(()=>{}); inp.value = ''; loadTasks();
  });
  // تبديل التبويبات
  document.querySelectorAll('#asTabs .as-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#asTabs .as-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.as-tabpane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
  }));
  const ta = document.getElementById('asText');
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(100, ta.scrollHeight) + 'px'; });
  ta.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMsg(); } });
  // إرفاق ملف
  document.getElementById('asAttachBtn').addEventListener('click', () => document.getElementById('asFile').click());
  document.getElementById('asFile').addEventListener('change', ev => {
    const f = ev.target.files[0]; if (!f) return;
    const reader = new FileReader();
    if (f.type.startsWith('image/')) {
      reader.onload = e2 => { _attach = { image: e2.target.result, name: f.name }; chip(f.name); };
      reader.readAsDataURL(f);
    } else {
      reader.onload = e2 => { _attach = { text: String(e2.target.result).slice(0, 12000), name: f.name }; chip(f.name); };
      reader.readAsText(f);
    }
    ev.target.value = '';
  });
  function chip(name){ document.getElementById('asAttachChip').innerHTML = `<span class="as-attach-chip"> ${e(name)} <span style="cursor:pointer" onclick="_attach=null;document.getElementById('asAttachChip').innerHTML=''"></span></span>`; }
  load();
});