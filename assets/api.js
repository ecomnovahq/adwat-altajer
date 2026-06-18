// ─── API Base Configuration ───────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : '/api';

// ─── WhatsApp Config (change number here) ────────────────────────────────────
const WHATSAPP_NUMBER = '966507060592'; // رقم واتساب خبراء المنصات

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
const auth = {
  getToken: () => localStorage.getItem('tajer-token'),
  getUser: () => { try { return JSON.parse(localStorage.getItem('tajer-user')); } catch { return null; } },
  setSession: (token, user) => {
    localStorage.setItem('tajer-token', token);
    localStorage.setItem('tajer-user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('tajer-token');
    localStorage.removeItem('tajer-user');
  },
  isLoggedIn: () => !!localStorage.getItem('tajer-token'),
  isAdmin: () => { const u = auth.getUser(); return u && u.is_admin; },
};

// ─── Core Request ─────────────────────────────────────────────────────────────
let _tjPending = 0;
async function apiRequest(method, endpoint, body, blobResponse = false) {
  return _apiRequest(method, endpoint, body, blobResponse);
}
async function _apiRequest(method, endpoint, body, blobResponse = false) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // امنع التحديث التلقائي أثناء أي طلب جارٍ (إلا نبضة الحضور)
  const heavy = endpoint.indexOf('/heartbeat') === -1;
  if (heavy) { _tjPending++; window.__tjBusy = true; }
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } finally {
    if (heavy) { _tjPending = Math.max(0, _tjPending - 1); window.__tjBusy = _tjPending > 0; }
  }

  if (blobResponse) {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `خطأ ${res.status}`);
    }
    const blob = await res.blob();
    const cd   = res.headers.get('content-disposition') || '';
    // Handle both filename= and filename*=UTF-8'' RFC 5987 formats
    const nameMatch = cd.match(/filename\*=UTF-8''([^;\n]+)/i) || cd.match(/filename="?([^";\n]+)"?/i);
    const name = nameMatch ? decodeURIComponent(nameMatch[1]) : 'تقرير.pdf';
    return { blob, filename: name };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // جلسة منتهية أو حساب محذوف → امسح الجلسة ووجّه للدخول تلقائياً
    if (res.status === 401 && token) {
      auth.clear();
      if (!location.pathname.endsWith('login.html')) {
        const base = location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        setTimeout(() => { location.href = base; }, 1500);
      }
      const e = new Error('انتهت جلستك أو الحساب غير متاح — سجّل دخولك من جديد.');
      e.code = 'SESSION_EXPIRED';
      throw e;
    }
    const err = new Error(data.error || `خطأ ${res.status}`);
    err.code = data.code;
    err.toolName = data.toolName;
    err.displayName = data.displayName;
    err.limit = data.limit;
    err.used = data.used;
    if (data.code === 'TRIAL_ENDED' && typeof showUpgradeModal === 'function') showUpgradeModal('trial');
    throw err;
  }
  return data;
}

const api = {
  get:    (ep)       => apiRequest('GET', ep),
  post:   (ep, body) => apiRequest('POST', ep, body),
  put:    (ep, body) => apiRequest('PUT', ep, body),
  delete: (ep)       => apiRequest('DELETE', ep),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const data = await apiRequest('POST', '/auth/login', { email, password });
    auth.setSession(data.token, data.user);
    return data;
  },
  // تسجيل من خطوتين: إرسال كود → تأكيد
  registerInit: (name, email, password, phone) => apiRequest('POST', '/auth/register-init', { name, email, password, phone }),
  verifyEmail: async (email, code) => {
    const data = await apiRequest('POST', '/auth/verify-email', { email, code });
    auth.setSession(data.token, data.user);
    return data;
  },
  resendCode: (email, purpose) => apiRequest('POST', '/auth/resend-code', { email, purpose }),
  forgotPassword: (email) => apiRequest('POST', '/auth/forgot-password', { email }),
  resetPassword: (email, code, password) => apiRequest('POST', '/auth/reset-password', { email, code, password }),
  logout: () => {
    auth.clear();
    const inPages = location.pathname.replace(/\\/g, '/').includes('/pages/');
    window.location.href = inPages ? '../index.html' : 'index.html';
  },

  // ─── Tools ─────────────────────────────────────────────────────────────────
  analyze:           (storeUrl, category) => apiRequest('POST', '/tools/analyze', { storeUrl, category }),
  exportPdf:         (storeUrl, category, data) => apiRequest('POST', '/tools/export-pdf', { storeUrl, category, data }, true),
  generate:          (data)               => apiRequest('POST', '/tools/generate', data),
  generateImage:     (data)               => apiRequest('POST', '/tools/generate-image', data),
  getToolSettings:   ()                   => apiRequest('GET', '/tools/settings'),
  getPlans:          ()                   => apiRequest('GET', '/tools/plans'),
  getSubscription:   ()                   => apiRequest('GET', '/tools/subscription'),
  requestToolAccess: (toolName, reason)   => apiRequest('POST', '/tools/request-access', { toolName, reason }),
  chat:              (message, history, context) => apiRequest('POST', '/tools/chat', { message, history, context }),
  merchantPath:      (data)                  => apiRequest('POST', '/tools/merchant-path', data),
  whatsapp:          (data)               => apiRequest('POST', '/tools/whatsapp', data),
  competitor:        (data)               => apiRequest('POST', '/tools/competitor', data),
  socialPlan:        (data)               => apiRequest('POST', '/tools/social-plan', data),
  storePolicies:     (data)               => apiRequest('POST', '/tools/store-policies', data),
  launchCampaign:    (data)               => apiRequest('POST', '/tools/launch-campaign', data),

  // ─── Account ───────────────────────────────────────────────────────────
  myBookings:   ()  => apiRequest('GET', '/bookings/my'),
  myRequests:   ()  => apiRequest('GET', '/tools/my-requests'),
  toolHistory:  ()  => apiRequest('GET', '/tools/history'),
  historyItem:  (id) => apiRequest('GET', `/tools/history/${id}`),
  myStats:      ()   => apiRequest('GET', '/tools/my-stats'),
  generateBulk: (products, tone) => apiRequest('POST', '/tools/generate-bulk', { products, tone }),

  // ─── مساعد التاجر (يدعم تعدّد المتاجر عبر storeId الحالي) ─────────────────────
  asstStoreId:    null,                                  // المتجر النشط حالياً
  setStore:       function (id) { this.asstStoreId = id || null; },
  _sid:           function () { return this.asstStoreId; },
  _q:             function () { return this.asstStoreId ? `?storeId=${this.asstStoreId}` : ''; },
  asstAddStore:   (url)  => apiRequest('POST', '/assistant/store', { url }),
  asstGetStore:   function (id) { const s = id ?? this.asstStoreId; return apiRequest('GET', '/assistant/store' + (s ? `?storeId=${s}` : '')); },
  asstSync:       function () { return apiRequest('POST', '/assistant/sync', { storeId: this._sid() }); },
  asstSyncProgress: function () { return apiRequest('GET', '/assistant/sync/progress' + this._q()); },
  asstDeleteStore: function () { return apiRequest('DELETE', '/assistant/store', { storeId: this._sid() }); },
  asstAlertsSeen: function () { return apiRequest('POST', '/assistant/alerts/seen', { storeId: this._sid() }); },
  asstChat:       function (data) { return apiRequest('POST', '/assistant/chat', { ...data, storeId: this._sid() }); },
  asstChatHistory: function () { return apiRequest('GET', '/assistant/chat' + this._q()); },
  asstClearChat:  function () { return apiRequest('DELETE', '/assistant/chat', { storeId: this._sid() }); },
  asstProdDesc:   (id, lang) => apiRequest('POST', `/assistant/product/${id}/description`, { lang: lang || 'ar' }),
  asstProdPrice:  (id, cost) => apiRequest('POST', `/assistant/product/${id}/price-suggestion`, { cost }),
  asstProdSeo:    (id)   => apiRequest('POST', `/assistant/product/${id}/seo`),
  asstProdBullets:(id)   => apiRequest('POST', `/assistant/product/${id}/bullets`),
  asstProdApply:  (id, description) => apiRequest('POST', `/assistant/product/${id}/apply`, { description }),
  asstProdHistory:(id)   => apiRequest('GET', `/assistant/product/${id}/history`),
  asstProdCompress:(id, white)  => apiRequest('POST', `/assistant/product/${id}/compress-image`, { white: white ? 1 : 0 }),
  asstProdSchema: (id)   => apiRequest('GET', `/assistant/product/${id}/schema`),
  asstProdEnhanceImg: (id, mode) => apiRequest('POST', `/assistant/product/${id}/enhance-image`, { mode: mode || 'clean' }),
  asstSeoAudit:   function () { return apiRequest('POST', '/assistant/seo-audit', { storeId: this._sid() }); },
  asstProdChat:   (id, message) => apiRequest('POST', `/assistant/product/${id}/chat`, { message }),
  asstProdRefresh:(id)   => apiRequest('POST', `/assistant/product/${id}/refresh`),
  asstProdFixGaps:(id)   => apiRequest('POST', `/assistant/product/${id}/fix-gaps`),
  asstUsage:      function () { return apiRequest('GET', '/assistant/usage'); },
  asstCategoryCampaign: function (category) { return apiRequest('POST', '/assistant/category-campaign', { category, storeId: this._sid() }); },
  asstMarketing:  function (type, opts) { return apiRequest('POST', `/assistant/marketing/${type}`, { ...(opts||{}), storeId: this._sid() }); },
  asstSupport:    function (type, opts) { return apiRequest('POST', `/assistant/support/${type}`, { ...(opts||{}), storeId: this._sid() }); },
  asstWeeklyPlan: function () { return apiRequest('POST', '/assistant/weekly-plan', { storeId: this._sid() }); },
  asstSettings:   function (data) { return apiRequest('POST', '/assistant/settings', { ...data, storeId: this._sid() }); },
  asstCompetitorTimeline: function () { return apiRequest('GET', '/assistant/competitor-timeline' + this._q()); },
  asstCompetitors:    function () { return apiRequest('GET', '/assistant/competitors' + this._q()); },
  asstAddCompetitor:  function (url) { return apiRequest('POST', '/assistant/competitors', { url, storeId: this._sid() }); },
  asstDelCompetitor:  function (id) { return apiRequest('DELETE', `/assistant/competitors/${id}`, { storeId: this._sid() }); },
  asstTasks:      function () { return apiRequest('GET', '/assistant/tasks' + this._q()); },
  asstTaskToggle: function (id, done) { return apiRequest('PUT', `/assistant/tasks/${id}`, { done, storeId: this._sid() }); },
  asstTaskAdd:    function (text) { return apiRequest('POST', '/assistant/tasks', { text, storeId: this._sid() }); },
  asstTaskDel:    function (id) { return apiRequest('DELETE', `/assistant/tasks/${id}`, { storeId: this._sid() }); },
  asstTaskReorder:function (ids) { return apiRequest('POST', '/assistant/tasks/reorder', { ids, storeId: this._sid() }); },
  asstBulk:       function (type, category) { return apiRequest('POST', `/assistant/bulk/${type}`, { storeId: this._sid(), category: category || '' }); },
  asstCompare:    function (url) { return apiRequest('POST', '/assistant/compare', { url, storeId: this._sid() }); },
  asstPricing:    function () { return apiRequest('POST', '/assistant/pricing-analysis', { storeId: this._sid() }); },
  asstExportCsv:  function () { return apiRequest('GET', '/assistant/export' + this._q()); },
  // Google Analytics (الأداء)
  gaStatus:       function () { return apiRequest('GET', '/integrations/ga/status' + this._q()); },
  gaConnect:      function (propertyId) { return apiRequest('POST', '/integrations/ga/connect', { propertyId, storeId: this._sid() }); },
  gaReport:       function () { return apiRequest('GET', '/integrations/ga/report' + this._q()); },
  gaDisconnect:   function () { return apiRequest('DELETE', '/integrations/ga/disconnect' + this._q()); },

  // ─── تكامل سلة ───────────────────────────────────────────────────────────────
  sallaConnect:    (token) => apiRequest('POST', '/integrations/salla/connect', { token }),
  sallaStatus:     ()      => apiRequest('GET', '/integrations/salla/status'),
  sallaDisconnect: ()      => apiRequest('DELETE', '/integrations/salla/disconnect'),
  sallaProducts:   (page=1) => apiRequest('GET', `/integrations/salla/products?page=${page}`),
  sallaUpdateProduct: (id, data) => apiRequest('PUT', `/integrations/salla/products/${id}`, data),

  // ─── Public ────────────────────────────────────────────────────────────────
  getCoupons:    (params = {}) => apiRequest('GET', `/coupons?${new URLSearchParams(params)}`),
  getCouponCategories: ()      => apiRequest('GET', '/coupons/categories'),
  getWorks:      (category)    => apiRequest('GET', `/works${category ? `?category=${category}` : ''}`),
  getReviews:    ()            => apiRequest('GET', '/reviews'),
  submitBooking: (data)        => apiRequest('POST', '/bookings', data),

  // ─── Blog ──────────────────────────────────────────────────────────────────
  getBlogPosts:  (params = {}) => apiRequest('GET', `/blog?${new URLSearchParams(params)}`),
  getBlogPost:   (slug)        => apiRequest('GET', `/blog/post/${slug}`),

  // ─── الحضور + تذاكر الدعم ────────────────────────────────────────────────────
  heartbeat:     ()            => apiRequest('POST', '/auth/heartbeat'),
  tickets: {
    create:     (data)         => apiRequest('POST', '/tickets', data),
    mine:       ()             => apiRequest('GET', '/tickets'),
    messages:   (id, since=0)  => apiRequest('GET', `/tickets/${id}/messages?since=${since}`),
    send:       (id, body, attachments) => apiRequest('POST', `/tickets/${id}/messages`, { body, attachments }),
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    dashboard:    ()          => apiRequest('GET', '/admin/dashboard'),
    statsFull:    (params={})  => apiRequest('GET', `/admin/stats/full?${new URLSearchParams(params)}`),
    analyses:     ()          => apiRequest('GET', '/admin/analyses'),
    assistantStores: ()       => apiRequest('GET', '/admin/assistant-stores'),
    assistantStore:  (id)     => apiRequest('GET', `/admin/assistant-stores/${id}`),
    setStoreLimit:   (id, limit) => apiRequest('PUT', `/admin/assistant-stores/${id}/limit`, { limit }),
    storeInsights:   (id)        => apiRequest('GET', `/admin/assistant-stores/${id}/insights`),
    addInsight:      (id, data)  => apiRequest('POST', `/admin/assistant-stores/${id}/insights`, data),
    delInsight:      (id)        => apiRequest('DELETE', `/admin/insights/${id}`),
    assistantClients: ()      => apiRequest('GET', '/admin/assistant-clients'),
    assistantClient: (uid)    => apiRequest('GET', `/admin/assistant-clients/${uid}`),
    setMaxStores:    (uid, maxStores) => apiRequest('PUT', `/admin/assistant-clients/${uid}/max-stores`, { maxStores }),
    setClientPlan:   (uid, plan) => apiRequest('PUT', `/admin/assistant-clients/${uid}/plan`, { plan }),
    setAiQuota:      (uid, aiQuota) => apiRequest('PUT', `/admin/assistant-clients/${uid}/ai-quota`, { aiQuota }),
    updateAnalysis: (id, data)=> apiRequest('PUT', `/admin/analyses/${id}`, data),
    deleteAnalysis: (id)      => apiRequest('DELETE', `/admin/analyses/${id}`),
    users:        ()          => apiRequest('GET', '/admin/users'),
    addUser:      (data)      => apiRequest('POST', '/admin/users', data),
    userDetail:   (id)        => apiRequest('GET', `/admin/users/${id}`),
    toggleAdmin:  (id)        => apiRequest('PUT', `/admin/users/${id}/toggle-admin`),
    deleteUser:   (id)        => apiRequest('DELETE', `/admin/users/${id}`),
    updateUserTools: (id, tools_access) => apiRequest('PUT', `/admin/users/${id}/tools-access`, { tools_access }),
    logs:         (tool)      => apiRequest('GET', `/admin/logs${tool ? `?tool=${tool}` : ''}`),

    toolSettings:       ()             => apiRequest('GET', '/admin/tool-settings'),
    updateToolSettings: (name, data)   => apiRequest('PUT', `/admin/tool-settings/${name}`, data),
    setToolOrder:       (order)        => apiRequest('PUT', '/admin/tool-order', { order }),
    plans:              ()             => apiRequest('GET', '/admin/plans'),
    generatePlans:      (data)         => apiRequest('POST', '/admin/plans/generate', data),
    createPlan:         (data)         => apiRequest('POST', '/admin/plans', data),
    updatePlan:         (id, data)     => apiRequest('PUT', `/admin/plans/${id}`, data),
    deletePlan:         (id)           => apiRequest('DELETE', `/admin/plans/${id}`),
    getTrialDays:       ()             => apiRequest('GET', '/admin/config/trial-days'),
    setTrialDays:       (trialDays)    => apiRequest('PUT', '/admin/config/trial-days', { trialDays }),
    subscribeUser:      (uid, data)    => apiRequest('POST', `/admin/users/${uid}/subscribe`, data),
    unsubscribeUser:    (uid)          => apiRequest('DELETE', `/admin/users/${uid}/subscribe`),
    toolRequests:       ()             => apiRequest('GET', '/admin/tool-requests'),
    updateToolRequest:  (id, data)     => apiRequest('PUT', `/admin/tool-requests/${id}`, data),
    merchantPathSubs:   ()             => apiRequest('GET', '/admin/merchant-path'),
    updateMerchantPathSub: (id, data)  => apiRequest('PUT', `/admin/merchant-path/${id}`, data),
    deleteMerchantPathSub: (id)        => apiRequest('DELETE', `/admin/merchant-path/${id}`),

    allCoupons:   ()          => apiRequest('GET', '/coupons/admin/all'),
    createCoupon: (data)      => apiRequest('POST', '/coupons', data),
    updateCoupon: (id, data)  => apiRequest('PUT', `/coupons/${id}`, data),
    deleteCoupon: (id)        => apiRequest('DELETE', `/coupons/${id}`),
    couponCategories:    ()        => apiRequest('GET', '/coupons/categories'),
    addCouponCategory:   (data)    => apiRequest('POST', '/coupons/categories', data),
    updateCouponCategory:(id,data) => apiRequest('PUT', `/coupons/categories/${id}`, data),
    deleteCouponCategory:(id)      => apiRequest('DELETE', `/coupons/categories/${id}`),

    allWorks:     ()          => apiRequest('GET', '/works/admin/all'),
    createWork:   (data)      => apiRequest('POST', '/works', data),
    updateWork:   (id, data)  => apiRequest('PUT', `/works/${id}`, data),
    deleteWork:   (id)        => apiRequest('DELETE', `/works/${id}`),

    allReviews:   ()          => apiRequest('GET', '/reviews/admin/all'),
    createReview: (data)      => apiRequest('POST', '/reviews', data),
    updateReview: (id, data)  => apiRequest('PUT', `/reviews/${id}`, data),
    deleteReview: (id)        => apiRequest('DELETE', `/reviews/${id}`),

    allUsers:     ()          => apiRequest('GET', '/admin/users'),
    allBookings:  (status)    => apiRequest('GET', `/bookings${status ? `?status=${status}` : ''}`),
    updateBooking:(id, data)  => apiRequest('PUT', `/bookings/${id}`, data),
    deleteBooking:(id)        => apiRequest('DELETE', `/bookings/${id}`),

    allBlogPosts:   ()          => apiRequest('GET', '/blog/admin/all'),
    createBlogPost: (data)      => apiRequest('POST', '/blog', data),
    updateBlogPost: (id, data)  => apiRequest('PUT', `/blog/${id}`, data),
    deleteBlogPost: (id)        => apiRequest('DELETE', `/blog/${id}`),

    tickets:        ()          => apiRequest('GET', '/tickets/admin/all'),
    ticketMessages: (id, since=0) => apiRequest('GET', `/tickets/${id}/messages?since=${since}`),
    ticketReply:    (id, body, attachments) => apiRequest('POST', `/tickets/${id}/admin-reply`, { body, attachments }),
    ticketStatus:   (id, status)=> apiRequest('PUT', `/tickets/${id}/status`, { status }),
    deleteTicket:   (id)        => apiRequest('DELETE', `/tickets/${id}`),
  },
};

// ─── نبضة الحضور (متصل الآن) ──────────────────────────────────────────────────
(function presenceHeartbeat() {
  function ping() {
    try { if (localStorage.getItem('tajer-token') && !document.hidden) api.heartbeat().catch(() => {}); } catch {}
  }
  ping();
  setInterval(ping, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });
})();

// ─── مسح الكاش + التحديث (يدوي/تلقائي كل 60 ثانية) ────────────────────────────
window.tjClearCache = async function () {
  // امسح Cache Storage و Service Workers إن وُجدت
  try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (e) {}
  try { if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); rs.forEach(r => r.unregister()); } } catch (e) {}
};
window.tjRefreshNow = async function () {
  await window.tjClearCache();
  try {
    const url = new URL(location.href);
    url.searchParams.set('_', Date.now());   // كسر كاش المتصفح للصفحة والموارد
    location.replace(url.toString());
  } catch (e) { location.reload(); }
};
window.__tjBusy = false;
// أُزيل التحديث التلقائي نهائياً — نظّف أي تفعيل سابق محفوظ
try { localStorage.removeItem('tj-autorefresh'); } catch (e) {}
window.tjAutoRefreshOn = function () { return false; };
window.tjSetAutoRefresh = function () {};

// ─── Modal System ─────────────────────────────────────────────────────────────
(function injectModalStyles() {
  const s = document.createElement('style');
  s.textContent = `
.tj-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;padding:1rem;
  animation:tjFadeIn .18s ease forwards}
@keyframes tjFadeIn{from{opacity:0}to{opacity:1}}
.tj-modal{background:var(--bg-card,#1a1825);border:1px solid var(--line,#1a1f35);
  border-radius:20px;padding:2rem 2rem 1.6rem;max-width:440px;width:100%;
  transform:translateY(18px);animation:tjSlide .22s ease forwards;
  box-shadow:0 30px 80px rgba(0,0,0,.6)}
@keyframes tjSlide{to{transform:translateY(0)}}
.tj-modal-icon{font-size:2.8rem;margin-bottom:.75rem;display:block}
.tj-modal-title{font-size:1.15rem;font-weight:700;margin-bottom:.4rem;color:var(--ink,#f0eeff)}
.tj-modal-msg{color:var(--ink-dim,#888);line-height:1.7;margin-bottom:1.4rem;font-size:.92rem}
.tj-modal-textarea{width:100%;background:var(--bg,#0b0e17);border:1px solid var(--line,#1a1f35);
  border-radius:10px;padding:.7rem 1rem;color:var(--ink,#f0eeff);font-family:inherit;
  font-size:.9rem;resize:vertical;min-height:90px;margin-bottom:1.2rem;box-sizing:border-box}
.tj-modal-textarea:focus{outline:none;border-color:var(--accent,#6366f1)}
.tj-modal-actions{display:flex;gap:.6rem;justify-content:flex-end;flex-wrap:wrap}
.tj-btn{padding:.5rem 1.15rem;border-radius:10px;border:none;cursor:pointer;
  font-weight:600;font-size:.88rem;font-family:inherit;transition:all .2s}
.tj-btn-primary{background:var(--accent,#6366f1);color:#fff}
.tj-btn-primary:hover{opacity:.85}
.tj-btn-secondary{background:transparent;color:var(--ink-dim,#888);
  border:1px solid var(--line,#1a1f35)}
.tj-btn-secondary:hover{color:var(--ink,#f0eeff);border-color:var(--line-strong,#3a3848)}
.tj-btn-danger{background:#ef4444;color:#fff}
.tj-btn-danger:hover{opacity:.85}
.tj-btn-success{background:#22c55e;color:#fff}
.tj-btn-success:hover{opacity:.85}
.tj-modal-wide{max-width:860px}
.tj-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1rem;margin:.4rem 0 1.2rem;text-align:right}
.tj-plan{position:relative;background:var(--bg,#0b0e17);border:1px solid var(--line,#1a1f35);border-radius:16px;padding:1.2rem 1rem;display:flex;flex-direction:column;transition:transform .2s,border-color .2s,box-shadow .2s}
.tj-plan:hover{transform:translateY(-4px);border-color:var(--accent,#6366f1);box-shadow:0 14px 34px rgba(99,102,241,.18)}
.tj-plan-hot{border-color:var(--accent,#6366f1);box-shadow:0 8px 26px rgba(99,102,241,.18)}
.tj-plan-badge{position:absolute;top:-11px;inset-inline-start:50%;transform:translateX(50%);background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;font-size:.68rem;font-weight:700;border-radius:99px;padding:.18rem .8rem;white-space:nowrap}
.tj-plan-name{font-weight:800;font-size:1.05rem;margin-bottom:.3rem;color:var(--ink,#f0eeff)}
.tj-plan-price{font-weight:800;font-size:1.5rem;color:var(--accent,#6366f1);margin-bottom:.8rem}
.tj-plan-price small{font-size:.7rem;color:var(--ink-dim,#888);font-weight:600}
.tj-plan-feats{list-style:none;padding:0;margin:0 0 1rem;display:flex;flex-direction:column;gap:.4rem;flex:1}
.tj-plan-feats li{font-size:.82rem;color:var(--ink,#f0eeff);line-height:1.5;padding-inline-start:1.2rem;position:relative}
.tj-plan-feats li::before{content:'';position:absolute;inset-inline-start:0;top:.45em;width:7px;height:7px;border-radius:50%;background:var(--accent,#6366f1)}
.tj-plan-btn{display:block;text-align:center;background:var(--accent,#6366f1);color:#fff;border-radius:10px;padding:.55rem;font-weight:700;font-size:.85rem;text-decoration:none;transition:opacity .2s}
.tj-plan-btn:hover{opacity:.88}
@media(max-width:560px){.tj-plans{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
})();

function showModal({ type = 'info', title, message, textarea, actions = [] }) {
  const icons = {
    error:   `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    success: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    info:    `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    confirm: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };
  const overlay = document.createElement('div');
  overlay.className = 'tj-overlay';
  overlay.innerHTML = `<div class="tj-modal">
    <span class="tj-modal-icon">${icons[type] || icons.info}</span>
    <div class="tj-modal-title">${title}</div>
    ${message ? `<div class="tj-modal-msg">${message}</div>` : ''}
    ${textarea ? `<textarea class="tj-modal-textarea" id="tjTextarea" placeholder="${textarea.placeholder || ''}"></textarea>` : ''}
    <div class="tj-modal-actions" id="tjActions"></div>
  </div>`;

  const actionsEl = overlay.querySelector('#tjActions');
  const defaultActions = [{ label: 'حسناً', style: 'primary', close: true }];
  (actions.length ? actions : defaultActions).forEach(a => {
    const btn = document.createElement('button');
    btn.className = `tj-btn tj-btn-${a.style || 'secondary'}`;
    btn.textContent = a.label;
    btn.onclick = () => {
      if (a.close !== false) overlay.remove();
      if (a.onClick) {
        const val = overlay.querySelector('#tjTextarea')?.value;
        a.onClick(val);
      }
    };
    actionsEl.appendChild(btn);
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay;
}

function showError(title, message) { showModal({ type: 'error', title, message }); }
function showSuccess(title, message) { showModal({ type: 'success', title, message }); }
function showConfirm(title, message, onConfirm, btnLabel = 'تأكيد') {
  showModal({ type: 'confirm', title, message, actions: [
    { label: 'إلغاء', style: 'secondary', close: true },
    { label: btnLabel, style: 'danger', onClick: onConfirm },
  ]});
}

function showToolError(err, toolName) {
  if (err.code === 'TOOL_PAID') {
    showModal({
      type: 'warning',
      title: `${err.displayName || 'الأداة'} مدفوعة`,
      message: 'هذه الأداة متاحة للمشتركين. أرسل طلب وصول وسيتواصل معك الفريق خلال 24 ساعة.',
      textarea: { placeholder: 'أخبرنا لماذا تحتاج هذه الأداة...' },
      actions: [
        { label: 'إلغاء', style: 'secondary', close: true },
        { label: 'إرسال طلب الوصول', style: 'primary', onClick: async (reason) => {
          if (!reason || reason.trim().length < 10) {
            showError('يرجى التوضيح', 'اكتب سبباً واضحاً (10 أحرف على الأقل)');
            return;
          }
          try {
            await api.requestToolAccess(toolName, reason.trim());
            showSuccess('تم إرسال طلبك!', 'سيراجع الفريق طلبك ويتواصل معك قريباً.');
          } catch (e) { showError('خطأ', e.message); }
        }},
      ],
    });
  } else if (err.code === 'DAILY_LIMIT') {
    showModal({
      type: 'warning',
      title: 'وصلت للحد اليومي',
      message: `استخدمت ${err.used} من ${err.limit} مرات مسموحة اليوم لـ${err.displayName || 'هذه الأداة'}. جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
      actions: [
        { label: 'حسناً', style: 'secondary', close: true },
        { label: 'تواصل معنا', style: 'primary', onClick: () => {
          const msg = encodeURIComponent(`مرحباً، أريد الوصول غير المحدود لـ${err.displayName || 'الأدوات'}`);
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
        }},
      ],
    });
  } else if (err.code === 'TRIAL_ENDED') {
    showUpgradeModal('trial');
  } else {
    showError('حدث خطأ', err.message);
  }
}

// ─── نافذة الباقات / الترقية (مشتركة لكل الصفحات) ─────────────────────────────
async function showUpgradeModal(reason) {
  if (document.getElementById('tjUpgrade')) return; // نافذة واحدة فقط
  let plans = [];
  try { plans = await api.getPlans(); } catch { /* skip */ }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wa = (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '');
  const feats = p => Array.isArray(p.features) ? p.features : (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })();
  const cards = plans.length ? plans.map(p => `
    <div class="tj-plan${p.badge ? ' tj-plan-hot' : ''}">
      ${p.badge ? `<span class="tj-plan-badge">${esc(p.badge)}</span>` : ''}
      <div class="tj-plan-name">${esc(p.name)}</div>
      <div class="tj-plan-price">${p.price != null && p.price !== '' ? esc(p.price) + ' <small>ر.س / ' + esc(p.period || 'شهرياً') + '</small>' : 'حسب الطلب'}</div>
      <ul class="tj-plan-feats">${feats(p).slice(0, 8).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <a class="tj-plan-btn" href="https://wa.me/${wa}?text=${encodeURIComponent('مرحباً، أريد الاشتراك في باقة ' + (p.name || ''))}" target="_blank" rel="noopener">اشترك الآن</a>
    </div>`).join('') : '<div style="color:var(--ink-dim,#888);padding:1.2rem;text-align:center;">لا توجد باقات متاحة حالياً — تواصل معنا.</div>';
  const overlay = document.createElement('div');
  overlay.className = 'tj-overlay'; overlay.id = 'tjUpgrade';
  overlay.innerHTML = `<div class="tj-modal tj-modal-wide">
    <div class="tj-modal-title">${reason === 'trial' ? 'انتهت فترتك المجانية' : 'رقّ باقتك'}</div>
    <div class="tj-modal-msg">اختر الباقة المناسبة لمواصلة استخدام كل الأدوات والمساعد بلا حدود.</div>
    <div class="tj-plans">${cards}</div>
    <div class="tj-modal-actions"><button class="tj-btn tj-btn-secondary" id="tjUpClose">لاحقاً</button></div>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  overlay.querySelector('#tjUpClose').onclick = () => overlay.remove();
}
window.showUpgradeModal = showUpgradeModal;

// ─── عرض جدول الأسعار العصري (مشترك: صفحة الأدوات + صفحة الباقات + نافذة الترقية) ──
function _planFeatures(p) { return Array.isArray(p.features) ? p.features : (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })(); }
function renderPricingInto(el, plans, period) {
  if (!el) return;
  period = period || 'monthly';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wa = (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '');
  const ck = '<svg class="pr-ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  if (!plans || !plans.length) { el.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--ink-dim);">لا توجد باقات متاحة حالياً.</div>'; return; }
  el.innerHTML = plans.map(p => {
    const rec = /موص|recommend|الأكثر|مميز|الأفضل/i.test(p.badge || '');
    const m = (p.price === '' || p.price == null) ? null : Number(p.price);
    const y = (p.price_yearly === '' || p.price_yearly == null) ? null : Number(p.price_yearly);
    let price, per = 'شهرياً', save = '';
    if (period === 'yearly' && y != null) {
      price = y; per = 'سنوياً';
      if (m != null) { const full = m * 12; if (full > y) { const pct = Math.round((1 - y / full) * 100); save = `<span class="pr-old">${full.toLocaleString('en-US')}</span><span class="pr-save">وفّر ${pct}%</span>`; } }
    } else { price = m; per = 'شهرياً'; }
    const priceTxt = (price != null) ? `${Number(price).toLocaleString('en-US')} <small>ر.س / ${per}</small>` : 'حسب الطلب';
    const feats = _planFeatures(p);
    return `<div class="pr-card${rec ? ' pr-rec' : ''}">
      ${rec ? `<div class="pr-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px;"><path d="M20 6L9 17l-5-5"/></svg> ${esc(p.badge || 'موصى به')}</div>` : ''}
      <div class="pr-name">${esc(p.name)}</div>
      ${save ? `<div class="pr-saverow">${save}</div>` : ''}
      <div class="pr-price">${priceTxt}</div>
      <div class="pr-feats-t">المميزات</div>
      <ul class="pr-feats">${feats.length ? feats.map(f => `<li>${ck}<span>${esc(f)}</span></li>`).join('') : '<li style="color:var(--ink-dim);">—</li>'}</ul>
      <a class="pr-btn" href="https://wa.me/${wa}?text=${encodeURIComponent('مرحباً، أريد الاشتراك في باقة ' + (p.name || '') + (period === 'yearly' ? ' (سنوي)' : ''))}" target="_blank" rel="noopener">اشترك الآن</a>
    </div>`;
  }).join('');
}
window.renderPricingInto = renderPricingInto;

// ─── Nav Auth UI ─────────────────────────────────────────────────────────────
function initNavAuth() {
  const user = auth.getUser();
  const navCta = document.querySelector('.nav-cta');
  if (!navCta) return;

  const inPages = location.pathname.replace(/\\/g, '/').includes('/pages/');
  if (user) {
    const userBtn = document.createElement('a');
    userBtn.className = 'nav-user-btn';
    userBtn.innerHTML = `<span class="nav-user-avatar">${user.name.charAt(0)}</span><span>${user.name}</span>`;
    userBtn.href = user.is_admin
      ? (inPages ? 'admin.html' : 'pages/admin.html')
      : (inPages ? 'account.html' : 'pages/account.html');
    navCta.parentNode.insertBefore(userBtn, navCta);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'nav-logout-btn';
    logoutBtn.textContent = 'خروج';
    logoutBtn.onclick = api.logout;
    navCta.parentNode.insertBefore(logoutBtn, navCta.nextSibling);
    navCta.style.display = 'none';
  } else {
    const loginBtn = document.createElement('a');
    loginBtn.className = 'nav-login-btn';
    loginBtn.textContent = 'تسجيل الدخول';
    loginBtn.href = inPages ? 'login.html' : 'pages/login.html';
    navCta.parentNode.insertBefore(loginBtn, navCta);
    navCta.style.display = 'none';
  }
}

// ─── Floating Widgets (Chat + WhatsApp) ──────────────────────────────────────
(function initWidgets() {
  const isAdmin = location.pathname.includes('admin.html');
  const isLogin = location.pathname.includes('login.html');
  if (isAdmin || isLogin) return;

  // Inject styles
  const s = document.createElement('style');
  s.textContent = `
.tj-widgets{position:fixed;bottom:1.5rem;left:1.5rem;z-index:9990;display:flex;flex-direction:column;gap:.75rem;align-items:flex-start}
.tj-fab{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.4);transition:all .25s;flex-shrink:0}
.tj-fab:hover{transform:scale(1.1)}
.tj-fab-wa{background:#25d366}
.tj-fab-chat{background:var(--accent,#6366f1)}
.tj-fab svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tj-chat-window{position:fixed;bottom:5.5rem;left:1.5rem;width:360px;max-width:calc(100vw - 3rem);
  height:540px;max-height:82vh;
  background:var(--bg-card,#1a1825);border:1px solid var(--line,#1a1f35);border-radius:20px;
  box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;
  z-index:9991;overflow:hidden;
  transform:translateY(20px) scale(.95);opacity:0;pointer-events:none;
  transition:all .25s cubic-bezier(.4,0,.2,1)}
.tj-chat-window.open{transform:translateY(0) scale(1);opacity:1;pointer-events:all}
.tj-chat-header{padding:1rem 1.2rem;background:var(--accent,#6366f1);color:#fff;display:flex;align-items:center;gap:.6rem}
.tj-chat-header-avatar{width:34px;height:34px;background:rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem}
.tj-chat-header-info{flex:1}
.tj-chat-header-name{font-weight:700;font-size:.95rem}
.tj-chat-header-status{font-size:.72rem;opacity:.85}
.tj-chat-close{background:none;border:none;color:#fff;cursor:pointer;font-size:1.3rem;padding:.2rem;line-height:1}
.tj-chat-messages{flex:1;min-height:0;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.6rem;scrollbar-width:thin}
.tj-msg{max-width:85%;padding:.55rem .85rem;border-radius:14px;font-size:.88rem;line-height:1.55;word-break:break-word}
.tj-msg-user{background:var(--accent,#6366f1);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.tj-msg-bot{background:var(--bg,#0b0e17);color:var(--ink,#f0eeff);align-self:flex-start;border:1px solid var(--line,#1a1f35);border-bottom-left-radius:4px}
.tj-msg-typing{display:flex;gap:4px;padding:.55rem .85rem;align-self:flex-start}
.tj-msg-typing span{width:7px;height:7px;background:var(--ink-dim,#888);border-radius:50%;animation:tjDot 1.2s infinite;display:block}
.tj-msg-typing span:nth-child(2){animation-delay:.2s}
.tj-msg-typing span:nth-child(3){animation-delay:.4s}
@keyframes tjDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
.tj-chat-input-area{padding:.8rem 1rem;border-top:1px solid var(--line,#1a1f35);display:flex;gap:.5rem}
.tj-chat-input{flex:1;background:var(--bg,#0b0e17);border:1px solid var(--line,#1a1f35);border-radius:10px;
  padding:.5rem .8rem;color:var(--ink,#f0eeff);font-family:inherit;font-size:.88rem;outline:none;resize:none}
.tj-chat-input:focus{border-color:var(--accent,#6366f1)}
.tj-chat-send{width:36px;height:36px;background:var(--accent,#6366f1);border:none;border-radius:10px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s}
.tj-chat-send:hover{opacity:.85}
.tj-chat-send svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tj-view{display:none;flex-direction:column;flex:1;min-height:0}
.tj-view.active{display:flex}
.tj-home-hero{position:relative;background:linear-gradient(135deg,var(--accent-2,#9333ea),var(--accent,#6366f1));color:#fff;padding:1.5rem 1.2rem 1.6rem;flex-shrink:0}
.tj-home-ava{display:flex;margin-bottom:.9rem;padding-inline-start:10px}
.tj-home-ava span{width:38px;height:38px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:800;margin-inline-start:-10px;font-size:.9rem;color:#fff}
.tj-home-hi{font-size:1.4rem;font-weight:800;line-height:1.45}
.tj-home-body{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.7rem;background:var(--bg,#0b0e17)}
.tj-card{background:var(--bg-card,#1a1825);border:1px solid var(--line,#1a1f35);border-radius:14px;padding:1rem;text-align:right;cursor:pointer;width:100%;font-family:inherit;color:var(--ink,#f0eeff);transition:all .15s;display:flex;align-items:center;justify-content:space-between;gap:.6rem}
.tj-card:hover{border-color:var(--accent,#6366f1);transform:translateY(-1px)}
.tj-card-main{font-weight:700;font-size:.95rem}
.tj-card-sub{font-size:.78rem;color:var(--ink-dim,#888);margin-top:.25rem;line-height:1.5}
.tj-card-arrow{color:var(--accent,#6366f1);flex-shrink:0}
.tj-card-arrow svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tj-sec-title{font-size:.78rem;color:var(--ink-dim,#888);font-weight:700;margin:.5rem .2rem -.1rem}
.tj-conv{display:flex;gap:.6rem;align-items:center;background:var(--bg-card,#1a1825);border:1px solid var(--line,#1a1f35);border-radius:12px;padding:.7rem .8rem;cursor:pointer;width:100%;text-align:right;font-family:inherit;color:var(--ink,#f0eeff);margin-bottom:.5rem}
.tj-conv:hover{border-color:var(--accent,#6366f1)}
.tj-conv-ava{width:36px;height:36px;border-radius:50%;background:var(--accent-soft,#eee);color:var(--accent,#6366f1);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tj-conv-ava svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}
.tj-conv-b{flex:1;min-width:0}
.tj-conv-t{font-weight:700;font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tj-conv-l{font-size:.76rem;color:var(--ink-dim,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:.1rem}
.tj-conv-meta{display:flex;flex-direction:column;align-items:flex-start;gap:.25rem;flex-shrink:0}
.tj-conv-time{font-size:.65rem;color:var(--ink-mid,#aaa)}
.tj-conv-dot{width:8px;height:8px;border-radius:50%;background:#22c55e}
.tj-nav{display:flex;border-top:1px solid var(--line,#1a1f35);background:var(--bg-card,#1a1825);flex-shrink:0}
.tj-nav button{flex:1;background:none;border:none;cursor:pointer;padding:.55rem;display:flex;flex-direction:column;align-items:center;gap:.2rem;color:var(--ink-dim,#888);font-family:inherit;font-size:.7rem;position:relative}
.tj-nav button.active{color:var(--accent,#6366f1)}
.tj-nav button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2}
.tj-nav-badge{position:absolute;top:.15rem;left:calc(50% - 18px);background:#ef4444;color:#fff;font-size:.6rem;font-weight:700;border-radius:99px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px}
.tj-chat-window.in-chat .tj-nav{display:none}
.tj-chat-back{background:none;border:none;color:#fff;cursor:pointer;padding:.2rem;display:flex}
.tj-chat-back svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:480px){.tj-chat-window{width:calc(100vw - 3rem)}}`;
  document.head.appendChild(s);

  // Build HTML
  const wrap = document.createElement('div');
  wrap.className = 'tj-widgets';
  wrap.innerHTML = `
    <button class="tj-fab tj-fab-chat" id="tjChatBtn" title="تحدث مع المساعد">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    </button>
    <a class="tj-fab tj-fab-wa" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('مرحباً، أريد الاستفسار عن خدمات أدوات التاجر')}" target="_blank" title="تواصل عبر واتساب">
      <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
    </a>`;
  document.body.appendChild(wrap);

  // Chat window
  const chatWin = document.createElement('div');
  chatWin.className = 'tj-chat-window';
  chatWin.id = 'tjChatWindow';
  chatWin.innerHTML = `
    <!-- الرئيسية -->
    <div class="tj-view active" id="tjHome">
      <div class="tj-home-hero">
        <button class="tj-chat-close" data-close style="position:absolute;top:.7rem;left:.8rem;">✕</button>
        <div class="tj-home-ava">
          <span style="background:#a855f7">خ</span><span style="background:#ec4899">م</span><span style="background:#22c55e">د</span>
        </div>
        <div class="tj-home-hi" id="tjHi">هلا والله<br>كيف يمكننا مساعدتك؟</div>
      </div>
      <div class="tj-home-body">
        <button class="tj-card" id="tjNewChat">
          <div><div class="tj-card-main">أرسل لنا رسالة</div><div class="tj-card-sub">المساعد الذكي يرد فوراً · ودعم بشري عند الحاجة</div></div>
          <span class="tj-card-arrow"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></span>
        </button>
        <div class="tj-sec-title">محادثاتك الأخيرة</div>
        <div id="tjHomeConvs"><div style="color:var(--ink-dim,#888);font-size:.8rem;padding:.5rem .2rem;">لا توجد محادثات بعد</div></div>
      </div>
    </div>

    <!-- قائمة الرسائل -->
    <div class="tj-view" id="tjMsgsView">
      <div class="tj-chat-header">
        <div class="tj-chat-header-info"><div class="tj-chat-header-name">الرسائل</div><div class="tj-chat-header-status">محادثاتك مع الدعم</div></div>
        <button class="tj-chat-close" data-close>✕</button>
      </div>
      <div class="tj-home-body" id="tjMsgsList"></div>
    </div>

    <!-- المحادثة -->
    <div class="tj-view" id="tjChatV">
      <div class="tj-chat-header">
        <button class="tj-chat-back" id="tjChatBack"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
        <div class="tj-chat-header-avatar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M3 16h18"/><circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/><path d="M12 11V5"/><path d="M9 5h6"/></svg></div>
        <div class="tj-chat-header-info">
          <div class="tj-chat-header-name" id="tjChatName">تاجر — مساعدك الذكي</div>
          <div class="tj-chat-header-status" id="tjChatStatusTxt">● متاح الآن · يجيب فوراً</div>
        </div>
        <button class="tj-chat-close" data-close>✕</button>
      </div>
      <div class="tj-chat-messages" id="tjChatMsgs"></div>
      <div id="tjAttBar" style="display:none;gap:.35rem;flex-wrap:wrap;padding:.4rem .7rem 0;"></div>
      <div class="tj-chat-input-area">
        <button class="tj-chat-send" id="tjChatAttach" title="إرفاق صورة أو ملف" style="background:var(--bg-card,#1a1825);border:1px solid var(--line,#1a1f35);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--ink-dim,#888)"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <input type="file" id="tjChatFile" accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.csv" multiple style="display:none"/>
        <input class="tj-chat-input" id="tjChatInput" placeholder="اكتب رسالتك..." maxlength="500"/>
        <button class="tj-chat-send" id="tjChatSend">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>

    <!-- تبويبات سفلية -->
    <div class="tj-nav" id="tjNav">
      <button class="active" id="tjNavHome"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>الرئيسية</button>
      <button id="tjNavMsgs"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>الرسائل<span class="tj-nav-badge" id="tjNavBadge" style="display:none">0</span></button>
    </div>`;
  document.body.appendChild(chatWin);

  // State
  let chatHistory = [];
  let chatOpen = false;
  let chatBusy = false;
  let ticketMode = false, ticketId = null, ticketLastId = 0, ticketPoll = null, awaitingCustomTopic = false, _pendingAtt = null;

  const SUPPORT_TOPICS = ['طلب خدمة', 'استفسار عن أداة', 'مشكلة تقنية', 'الفواتير والاشتراك', 'اقتراح', 'أخرى'];
  const wantsSupport = (m) => /خدمة العملاء|خدمه العملاء|الدعم|دعم فني|اكلم|أكلم|اتواصل|أتواصل|تواصل مع|محادثة مع|شكوى|اشتكي|ممثل|representative|support|تذكرة|تذكره/i.test(m);
  const userName = (() => { try { const u = JSON.parse(localStorage.getItem('tajer-user') || 'null'); return (u && (u.name || u.full_name || u.username)) || ''; } catch { return ''; } })();
  const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const convIcon = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>';

  (function initHi() { const el = document.getElementById('tjHi'); if (el && userName) el.innerHTML = `هلا ${escHtml(userName)}<br>كيف يمكننا مساعدتك؟`; })();

  // ── إدارة الشاشات (رئيسية / رسائل / محادثة) ──
  function showView(name) {
    chatWin.querySelectorAll('.tj-view').forEach(v => v.classList.remove('active'));
    document.getElementById({ home: 'tjHome', msgs: 'tjMsgsView', chat: 'tjChatV' }[name])?.classList.add('active');
    chatWin.classList.toggle('in-chat', name === 'chat');
    document.getElementById('tjNavHome').classList.toggle('active', name === 'home');
    document.getElementById('tjNavMsgs').classList.toggle('active', name === 'msgs');
    if (name === 'chat') setTimeout(() => document.getElementById('tjChatInput')?.focus(), 60);
  }
  function toggleChat() {
    chatOpen = !chatOpen;
    chatWin.classList.toggle('open', chatOpen);
    if (chatOpen) { showView('home'); loadConvs(); }
  }
  function closeChat() { chatOpen = false; chatWin.classList.remove('open'); }

  // ── قائمة المحادثات (تذاكر الدعم) ──
  function timeAgoShort(d) { const m = Math.round((Date.now() - new Date(d)) / 60000); if (m < 1) return 'الآن'; if (m < 60) return `${m}د`; const h = Math.round(m / 60); if (h < 24) return `${h}س`; return `${Math.round(h / 24)}ي`; }
  function convItem(t) {
    return `<button class="tj-conv" data-tid="${t.id}">
      <span class="tj-conv-ava">${convIcon}</span>
      <span class="tj-conv-b"><span class="tj-conv-t">${escHtml(t.topic)}</span><span class="tj-conv-l">${escHtml(t.last_message || '—')}</span></span>
      <span class="tj-conv-meta"><span class="tj-conv-time">${timeAgoShort(t.updated_at)}</span>${t.status === 'answered' ? '<span class="tj-conv-dot" title="رد جديد"></span>' : ''}</span>
    </button>`;
  }
  async function loadConvs() {
    const home = document.getElementById('tjHomeConvs'), listEl = document.getElementById('tjMsgsList');
    if (!localStorage.getItem('tajer-token')) {
      home.innerHTML = '<div style="color:var(--ink-dim,#888);font-size:.8rem;padding:.4rem .2rem;line-height:1.7;">سجّل دخولك لعرض محادثاتك والتواصل مع الدعم.</div>';
      listEl.innerHTML = '<div style="color:var(--ink-dim,#888);font-size:.85rem;padding:1.5rem 1rem;text-align:center;">سجّل دخولك لعرض رسائلك.</div>';
      return;
    }
    let list; try { list = await api.tickets.mine(); } catch { list = []; }
    const newReplies = list.filter(t => t.status === 'answered').length;
    const badge = document.getElementById('tjNavBadge');
    if (badge) { badge.textContent = newReplies; badge.style.display = newReplies ? 'flex' : 'none'; }
    home.innerHTML = list.length ? list.slice(0, 3).map(convItem).join('') : '<div style="color:var(--ink-dim,#888);font-size:.8rem;padding:.4rem .2rem;">لا توجد محادثات بعد</div>';
    listEl.innerHTML = list.length ? list.map(convItem).join('') : '<div style="color:var(--ink-dim,#888);font-size:.85rem;padding:1.5rem 1rem;text-align:center;line-height:1.8;">لا توجد رسائل بعد.<br>اضغط «أرسل لنا رسالة» للبدء.</div>';
    chatWin.querySelectorAll('.tj-conv').forEach(b => b.onclick = () => openTicketConv(+b.dataset.tid, list.find(x => x.id == b.dataset.tid)));
  }

  // فتح محادثة دعم موجودة
  async function openTicketConv(id, t) {
    stopTicketPoll();
    ticketMode = true; ticketId = id; ticketLastId = 0; awaitingCustomTopic = false;
    try { localStorage.setItem('tj-active-ticket', id); } catch {}
    document.getElementById('tjChatMsgs').innerHTML = '';
    document.getElementById('tjChatName').textContent = t ? t.topic : 'تذكرة دعم';
    document.getElementById('tjChatStatusTxt').textContent = t ? ('دعم العملاء · ' + t.number) : 'دعم العملاء';
    showView('chat');
    try { const d = await api.tickets.messages(id, 0); (d.messages || []).forEach(m => { ticketLastId = Math.max(ticketLastId, m.id); addBubble(m.body, m.sender === 'admin' ? 'tj-msg-bot' : 'tj-msg-user'); }); } catch {}
    ticketPoll = setInterval(pollTicket, 7000);
  }

  // بدء محادثة جديدة مع المساعد الذكي
  function openNewChat() {
    stopTicketPoll();
    ticketMode = false; ticketId = null; awaitingCustomTopic = false; chatHistory = [];
    document.getElementById('tjChatName').textContent = 'تاجر — مساعدك الذكي';
    document.getElementById('tjChatStatusTxt').textContent = '● متاح الآن · يجيب فوراً';
    document.getElementById('tjChatMsgs').innerHTML = '';
    addBubble(`السلام عليكم${userName ? ' ' + userName : ''}! حياك الله — أنا تاجر مساعدك الذكي. اسألني عن متجرك أو اطلب «التواصل مع خدمة العملاء».`, 'tj-msg-bot');
    showView('chat');
  }

  function attHtmlW(att) {
    if (!att || !att.length) return '';
    return '<div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.4rem;">' + att.map(a => {
      if ((a.type || '').startsWith('image/') || /^data:image\//.test(a.url))
        return `<a href="${a.url}" download="${escHtml(a.name)}" target="_blank"><img src="${a.url}" style="max-width:130px;max-height:130px;border-radius:8px;"></a>`;
      return `<a href="${a.url}" download="${escHtml(a.name)}" style="display:inline-flex;align-items:center;gap:.3rem;background:rgba(127,127,127,.15);border-radius:8px;padding:.3rem .55rem;font-size:.76rem;color:inherit;text-decoration:none;">${escHtml(a.name)}</a>`;
    }).join('') + '</div>';
  }
  function addBubble(text, cls, att) {
    const msgs = document.getElementById('tjChatMsgs');
    const b = document.createElement('div');
    b.className = 'tj-msg ' + cls;
    if (att && att.length) b.innerHTML = escHtml(text) + attHtmlW(att);
    else b.textContent = text;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
    return b;
  }

  function showSupportTopics() {
    const msgs = document.getElementById('tjChatMsgs');
    addBubble('أكيد! اختر الموضوع اللي تحب تتواصل بخصوصه مع فريق الدعم:', 'tj-msg-bot');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:.4rem;margin:.2rem 0 .5rem;';
    SUPPORT_TOPICS.forEach(t => {
      const c = document.createElement('button');
      c.textContent = t;
      c.style.cssText = 'background:var(--accent-soft,#eef);color:var(--accent,#6366f1);border:1px solid var(--accent,#6366f1);border-radius:999px;padding:.35rem .85rem;font-size:.8rem;cursor:pointer;font-family:inherit;';
      c.onclick = () => { wrap.remove(); chooseTopic(t); };
      wrap.appendChild(c);
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function chooseTopic(topic) {
    if (!localStorage.getItem('tajer-token')) {
      addBubble('عشان أوصلك بفريق الدعم لازم تسجّل دخولك الأول.', 'tj-msg-bot');
      const a = addBubble('اضغط هنا لتسجيل الدخول', 'tj-msg-bot');
      a.style.cursor = 'pointer'; a.style.textDecoration = 'underline'; a.style.color = 'var(--accent,#6366f1)';
      a.onclick = () => { location.href = (location.pathname.includes('/pages/') ? '' : 'pages/') + 'login.html'; };
      return;
    }
    if (topic === 'أخرى') {
      awaitingCustomTopic = true;
      addBubble('اكتب باختصار موضوع تواصلك وسأفتح لك تذكرة فوراً.', 'tj-msg-bot');
      return;
    }
    await openTicket(topic);
  }

  async function openTicket(topic) {
    try {
      const t = await api.tickets.create({ topic });
      ticketMode = true; ticketId = t.id; ticketLastId = 0;
      try { localStorage.setItem('tj-active-ticket', t.id); } catch {}
      document.getElementById('tjChatName').textContent = topic;
      document.getElementById('tjChatStatusTxt').textContent = `دعم العملاء · ${t.number}`;
      addBubble(`تم فتح تذكرتك رقم ${t.number} بخصوص: ${topic}.\nيسعدنا خدمتك! اكتب رسالتك وفريقنا بيرد عليك بأسرع وقت — إحنا معك خطوة بخطوة.`, 'tj-msg-bot');
      stopTicketPoll(); ticketPoll = setInterval(pollTicket, 7000);
      // أرسل المرفقات المعلّقة (إن وُجدت) بعد فتح التذكرة
      if (_pendingAtt && _pendingAtt.length) {
        const att = _pendingAtt; _pendingAtt = null;
        try { const m = await api.tickets.send(t.id, '', att); ticketLastId = Math.max(ticketLastId, m.id); addBubble('تم إرسال مرفقاتك للفريق.', 'tj-msg-bot'); } catch {}
      }
    } catch { addBubble('تعذّر فتح التذكرة، حاول مرة أخرى.', 'tj-msg-bot'); }
  }

  function stopTicketPoll() { if (ticketPoll) { clearInterval(ticketPoll); ticketPoll = null; } }

  async function pollTicket() {
    if (!ticketId || document.hidden) return;
    try {
      const d = await api.tickets.messages(ticketId, ticketLastId);
      (d.messages || []).forEach(m => {
        ticketLastId = Math.max(ticketLastId, m.id);
        if (m.sender === 'admin') addBubble(m.body, 'tj-msg-bot', m.attachments); // ردود الفريق + مرفقاتها
      });
    } catch {}
  }

  // ── مرفقات الودجت (لمحادثة خدمة العملاء) ──
  let tjAtt = [];
  function renderTjAttBar() {
    const bar = document.getElementById('tjAttBar'); if (!bar) return;
    bar.style.display = tjAtt.length ? 'flex' : 'none';
    bar.innerHTML = tjAtt.map((a, i) => `<span style="display:inline-flex;align-items:center;gap:.3rem;background:var(--accent-soft,#eef);color:var(--accent,#6366f1);border-radius:8px;padding:.2rem .5rem;font-size:.72rem;">${escHtml(a.name)} <span style="cursor:pointer;font-weight:700;" data-rm="${i}">×</span></span>`).join('');
    bar.querySelectorAll('[data-rm]').forEach(x => x.onclick = () => { tjAtt.splice(+x.dataset.rm, 1); renderTjAttBar(); });
  }
  document.getElementById('tjChatAttach').addEventListener('click', () => document.getElementById('tjChatFile').click());
  document.getElementById('tjChatFile').addEventListener('change', ev => {
    [...ev.target.files].slice(0, 5).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { addBubble('الملف ' + file.name + ' أكبر من 5MB.', 'tj-msg-bot'); return; }
      const r = new FileReader();
      r.onload = e2 => { tjAtt.push({ name: file.name, type: file.type, url: e2.target.result }); renderTjAttBar(); };
      r.readAsDataURL(file);
    });
    ev.target.value = '';
  });

  async function sendMessage() {
    if (chatBusy) return;
    const input = document.getElementById('tjChatInput');
    const msgs = document.getElementById('tjChatMsgs');
    const message = input.value.trim();
    const att = tjAtt.slice();
    if (!message && !att.length) return;
    input.value = '';

    // وضع التذكرة: أرسل للدعم (نص و/أو مرفقات)
    if (ticketMode && ticketId) {
      tjAtt = []; renderTjAttBar();
      addBubble(message || '(مرفق)', 'tj-msg-user', att);
      try { const m = await api.tickets.send(ticketId, message, att); ticketLastId = Math.max(ticketLastId, m.id); }
      catch { addBubble('تعذّر إرسال الرسالة.', 'tj-msg-bot'); }
      return;
    }
    // مرفقات بدون تذكرة → وجّه لفتح محادثة دعم وأرسلها بعد الفتح
    if (att.length) {
      tjAtt = []; renderTjAttBar();
      _pendingAtt = att;
      addBubble(message || '(مرفقات)', 'tj-msg-user', att);
      addBubble('لإرسال المرفقات لفريق خدمة العملاء، اختر الموضوع:', 'tj-msg-bot');
      showSupportTopics();
      return;
    }
    // المستخدم يكتب موضوع "أخرى" المخصّص
    if (awaitingCustomTopic) {
      awaitingCustomTopic = false;
      addBubble(message, 'tj-msg-user');
      await openTicket(message.slice(0, 100));
      return;
    }

    addBubble(message, 'tj-msg-user');

    // نية التواصل مع الدعم البشري؟
    if (wantsSupport(message)) { showSupportTopics(); return; }

    chatBusy = true;
    const typing = document.createElement('div');
    typing.className = 'tj-msg tj-msg-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const data = await api.chat(message, chatHistory, window._tjStoreContext || null);
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: data.reply });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      typing.remove();
      addBubble(data.reply, 'tj-msg-bot');
    } catch {
      typing.remove();
      addBubble('عذراً، المساعد غير متاح حالياً. تواصل معنا عبر واتساب.', 'tj-msg-bot');
    }
    chatBusy = false;
    input.focus();
  }

  document.getElementById('tjChatBtn').addEventListener('click', toggleChat);
  chatWin.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeChat));
  document.getElementById('tjChatSend').addEventListener('click', sendMessage);
  document.getElementById('tjChatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('tjChatBack').addEventListener('click', () => { showView('home'); loadConvs(); });
  document.getElementById('tjNewChat').addEventListener('click', openNewChat);
  document.getElementById('tjNavHome').addEventListener('click', () => { showView('home'); loadConvs(); });
  document.getElementById('tjNavMsgs').addEventListener('click', () => { showView('msgs'); loadConvs(); });
})();

// ─── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let wrap = document.querySelector('.tj-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'tj-toast-wrap';
    document.body.appendChild(wrap);
  }
  const toast = document.createElement('div');
  toast.className = `tj-toast tj-toast-${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(() => toast.classList.add('out'), duration - 400);
  setTimeout(() => toast.remove(), duration);
}

// ─── Scroll Reveal ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));
});

document.addEventListener('DOMContentLoaded', initNavAuth);
