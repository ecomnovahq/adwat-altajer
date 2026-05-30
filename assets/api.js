// ─── API Base Configuration ───────────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : '/api';

// ─── WhatsApp Config (change number here) ────────────────────────────────────
const WHATSAPP_NUMBER = '966500000000'; // ← غيّر هنا رقم واتساب السعودي

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
async function apiRequest(method, endpoint, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `خطأ ${res.status}`);
    err.code = data.code;
    err.toolName = data.toolName;
    err.displayName = data.displayName;
    err.limit = data.limit;
    err.used = data.used;
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
  register: async (name, email, password) => {
    const data = await apiRequest('POST', '/auth/register', { name, email, password });
    auth.setSession(data.token, data.user);
    return data;
  },
  logout: () => {
    auth.clear();
    const inPages = location.pathname.replace(/\\/g, '/').includes('/pages/');
    window.location.href = inPages ? '../index.html' : 'index.html';
  },

  // ─── Tools ─────────────────────────────────────────────────────────────────
  analyze:           (storeUrl, category) => apiRequest('POST', '/tools/analyze', { storeUrl, category }),
  generate:          (data)               => apiRequest('POST', '/tools/generate', data),
  generateImage:     (data)               => apiRequest('POST', '/tools/generate-image', data),
  getToolSettings:   ()                   => apiRequest('GET', '/tools/settings'),
  requestToolAccess: (toolName, reason)   => apiRequest('POST', '/tools/request-access', { toolName, reason }),
  chat:              (message, history)   => apiRequest('POST', '/tools/chat', { message, history }),
  whatsapp:          (data)               => apiRequest('POST', '/tools/whatsapp', data),
  competitor:        (data)               => apiRequest('POST', '/tools/competitor', data),
  socialPlan:        (data)               => apiRequest('POST', '/tools/social-plan', data),
  storePolicies:     (data)               => apiRequest('POST', '/tools/store-policies', data),
  launchCampaign:    (data)               => apiRequest('POST', '/tools/launch-campaign', data),

  // ─── Account ───────────────────────────────────────────────────────────
  myBookings:   ()  => apiRequest('GET', '/bookings/my'),
  myRequests:   ()  => apiRequest('GET', '/tools/my-requests'),
  toolHistory:  ()  => apiRequest('GET', '/tools/history'),

  // ─── Public ────────────────────────────────────────────────────────────────
  getCoupons:    (params = {}) => apiRequest('GET', `/coupons?${new URLSearchParams(params)}`),
  getWorks:      (category)    => apiRequest('GET', `/works${category ? `?category=${category}` : ''}`),
  getReviews:    ()            => apiRequest('GET', '/reviews'),
  submitBooking: (data)        => apiRequest('POST', '/bookings', data),

  // ─── Blog ──────────────────────────────────────────────────────────────────
  getBlogPosts:  (params = {}) => apiRequest('GET', `/blog?${new URLSearchParams(params)}`),
  getBlogPost:   (slug)        => apiRequest('GET', `/blog/post/${slug}`),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    dashboard:    ()          => apiRequest('GET', '/admin/dashboard'),
    users:        ()          => apiRequest('GET', '/admin/users'),
    toggleAdmin:  (id)        => apiRequest('PUT', `/admin/users/${id}/toggle-admin`),
    deleteUser:   (id)        => apiRequest('DELETE', `/admin/users/${id}`),
    updateUserTools: (id, tools_access) => apiRequest('PUT', `/admin/users/${id}/tools-access`, { tools_access }),
    logs:         (tool)      => apiRequest('GET', `/admin/logs${tool ? `?tool=${tool}` : ''}`),

    toolSettings:       ()             => apiRequest('GET', '/admin/tool-settings'),
    updateToolSettings: (name, data)   => apiRequest('PUT', `/admin/tool-settings/${name}`, data),
    toolRequests:       ()             => apiRequest('GET', '/admin/tool-requests'),
    updateToolRequest:  (id, data)     => apiRequest('PUT', `/admin/tool-requests/${id}`, data),

    allCoupons:   ()          => apiRequest('GET', '/coupons/admin/all'),
    createCoupon: (data)      => apiRequest('POST', '/coupons', data),
    updateCoupon: (id, data)  => apiRequest('PUT', `/coupons/${id}`, data),
    deleteCoupon: (id)        => apiRequest('DELETE', `/coupons/${id}`),

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
  },
};

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
.tj-btn-success:hover{opacity:.85}`;
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
  } else {
    showError('حدث خطأ', err.message);
  }
}

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
.tj-chat-window{position:fixed;bottom:5.5rem;left:1.5rem;width:340px;max-width:calc(100vw - 3rem);
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
.tj-chat-messages{height:280px;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.6rem;scrollbar-width:thin}
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
    <div class="tj-chat-header">
      <div class="tj-chat-header-avatar"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M3 16h18"/><circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/><path d="M12 11V5"/><path d="M9 5h6"/></svg></div>
      <div class="tj-chat-header-info">
        <div class="tj-chat-header-name">تاجر — مساعدك الذكي</div>
        <div class="tj-chat-header-status">● متاح الآن · يجيب فوراً</div>
      </div>
      <button class="tj-chat-close" id="tjChatClose">✕</button>
    </div>
    <div class="tj-chat-messages" id="tjChatMsgs">
      <div class="tj-msg tj-msg-bot">السلام عليكم! حياك الله — أنا تاجر، مساعدك الذكي. سواء تبي تحلل متجرك أو تولد محتوى أو تستشير — أنا هنا. كيف أقدر أساعدك اليوم؟</div>
    </div>
    <div class="tj-chat-input-area">
      <input class="tj-chat-input" id="tjChatInput" placeholder="اكتب رسالتك..." maxlength="500"/>
      <button class="tj-chat-send" id="tjChatSend">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;
  document.body.appendChild(chatWin);

  // State
  let chatHistory = [];
  let chatOpen = false;
  let chatBusy = false;

  function toggleChat() {
    chatOpen = !chatOpen;
    chatWin.classList.toggle('open', chatOpen);
    if (chatOpen) document.getElementById('tjChatInput')?.focus();
  }

  async function sendMessage() {
    if (chatBusy) return;
    const input = document.getElementById('tjChatInput');
    const msgs = document.getElementById('tjChatMsgs');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    chatBusy = true;

    // User bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'tj-msg tj-msg-user';
    userBubble.textContent = message;
    msgs.appendChild(userBubble);

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'tj-msg tj-msg-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const data = await api.chat(message, chatHistory);
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'assistant', content: data.reply });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

      typing.remove();
      const botBubble = document.createElement('div');
      botBubble.className = 'tj-msg tj-msg-bot';
      botBubble.textContent = data.reply;
      msgs.appendChild(botBubble);
    } catch {
      typing.remove();
      const errBubble = document.createElement('div');
      errBubble.className = 'tj-msg tj-msg-bot';
      errBubble.textContent = 'عذراً، المساعد غير متاح حالياً. تواصل معنا عبر واتساب.';
      msgs.appendChild(errBubble);
    }

    msgs.scrollTop = msgs.scrollHeight;
    chatBusy = false;
    input.focus();
  }

  document.getElementById('tjChatBtn').addEventListener('click', toggleChat);
  document.getElementById('tjChatClose').addEventListener('click', toggleChat);
  document.getElementById('tjChatSend').addEventListener('click', sendMessage);
  document.getElementById('tjChatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
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
