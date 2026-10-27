/* ===== ميم أوفيس – الواجهة الرئيسية + وثيقة العمل الحر (Salla Custom JS) =====
   1) قسم الهيرو في الرئيسية: عنوان متحرك + وصف + أزرار + شريط المميزات
   2) شارة «وثيقة العمل الحر» في الفوتر بكل صفحات المتجر                    */
(function () {
  /* ---------- الإعدادات: عدّل هنا فقط ---------- */
  var CONFIG = {
    systemsUrl: "https://meemoffice.com/%D8%A3%D9%86%D8%B8%D9%85%D8%A9-%D9%85%D9%8A%D9%85-%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%B1%D9%8A%D8%A9/c1585079166", // رابط تصنيف الأنظمة
    whatsappUrl: "https://api.whatsapp.com/send/?phone=966560485861&text&type=phone_number&app_absent=0", // رابط الواتساب
    words: ["تنظيم", "نظام", "احترافية"],      // الكلمات المتبدّلة داخل الأقواس
    interval: 2200,                             // مدة ظهور كل كلمة (ملي ثانية)

    // وثيقة العمل الحر (تظهر في الفوتر)
    freelance: {
      show: true,                               // false لإخفاء الشارة
      title: "وثيقة العمل الحر",
      number: "FL-423087760",                   // رقم التوثيق
      url: ""                                   // رابط التحقق (اختياري) — اتركه فاضي لو مافي رابط
    }
  };

  function isHome() {
    return document.body.classList.contains("index") || location.pathname === "/" || location.pathname === "";
  }

  function ic(d, s) {
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var I = {
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
    brand: '<circle cx="12" cy="12" r="9"/><path d="M8 15.5v-7l4 4.5 4-4.5v7"/>',
    swap: '<path d="M4 8h15l-3-3M20 16H5l3 3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    wa: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2z"/>',
    verified: '<path d="M12 2.8l2.3 1.7 2.8-.1.9 2.7 2.3 1.7-.9 2.7.9 2.7-2.3 1.7-.9 2.7-2.8-.1L12 21.2l-2.3-1.7-2.8.1-.9-2.7-2.3-1.7.9-2.7-.9-2.7 2.3-1.7.9-2.7 2.8.1z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>'
  };

  var FEATURES = [
    // [النص، الأيقونة، مميّز؟]
    ["خدمنا أكثر من 1,000 عميل", "users", true],
    ["يُبنى على طريقة شغلك", "sliders"],
    ["باسمك وشعارك", "brand"],
    ["ننقل بياناتك عنك", "swap"],
    ["أنظمتنا جاهزة خلال 2 إلى 3 أيام", "clock"],
    ["يناسب كل الأجهزة", "phone"]
  ];

  /* ================= 1) الهيرو ================= */
  var CSS = '\
#mo-hero{--g:#dca35a;--gb:#c78a39;--gd:#9a6a22;--bg:#18181a;--ink:#2a2118;\
  font-family:inherit;direction:rtl;background:#fff;padding:0;position:relative;max-width:none}\
html{overflow-x:clip}\
#mo-hero *{box-sizing:border-box}\
#mo-hero .mh-dark{position:relative;overflow:hidden;background-color:var(--bg);color:#f3efe9;\
  background-image:radial-gradient(520px 340px at 100% 0,rgba(199,138,57,.32),transparent 70%),\
  linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);\
  background-size:auto,118px 118px,118px 118px;background-position:0 0,0 -6px,-6px 0}\
#mo-hero .mh-in{max-width:1320px;margin:0 auto;padding:110px 28px 100px}\
#mo-hero .mh-eye{display:flex;align-items:center;gap:14px;font-size:18px;font-weight:700;color:var(--g);margin:0 0 26px}\
#mo-hero .mh-eye:before{content:"";width:34px;height:2px;background:var(--g);border-radius:2px}\
#mo-hero h1{margin:0;font-size:clamp(46px,8.4vw,112px);font-weight:900;line-height:1.08;color:#f3efe9;letter-spacing:0}\
#mo-hero .mh-l2{display:inline-flex;align-items:center;gap:.16em;color:var(--g);margin-top:.04em}\
#mo-hero .mh-br{direction:ltr;unicode-bidi:isolate;color:var(--gb);font-weight:500;font-size:.78em;line-height:1}\
#mo-hero .mh-rot{display:inline-grid;justify-items:start;overflow:hidden;padding:.06em .08em .2em;margin-bottom:-.14em;transition:width .5s cubic-bezier(.2,.8,.2,1)}\
#mo-hero .mh-w{grid-area:1/1;text-align:right;white-space:nowrap;opacity:0;transform:translateY(70%);filter:blur(6px);\
  transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .5s ease,filter .5s ease}\
#mo-hero .mh-w.on{opacity:1;transform:none;filter:none}\
#mo-hero .mh-w.out{opacity:0;transform:translateY(-70%);filter:blur(6px)}\
#mo-hero p{margin:30px 0 40px;font-size:clamp(17px,1.7vw,22px);font-weight:500;line-height:1.9;color:#b9b3ab;max-width:860px}\
#mo-hero p b{color:#f3efe9;font-weight:800}\
#mo-hero .mh-btns{display:flex;gap:16px;flex-wrap:wrap}\
#mo-hero .mh-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:226px;padding:20px 34px;border-radius:99px;\
  font-size:19px;font-weight:800;color:#1b1610;text-decoration:none;transition:transform .2s,filter .2s,box-shadow .2s}\
#mo-hero .mh-btn:hover{transform:translateY(-2px);filter:brightness(1.06)}\
#mo-hero .mh-pri{background:var(--gb);box-shadow:0 14px 30px rgba(199,138,57,.25)}\
#mo-hero .mh-wa{background:#79e2a8;box-shadow:0 14px 30px rgba(121,226,168,.18)}\
#mo-hero .mh-feat{background:#fff;padding:26px 28px 22px}\
#mo-hero .mh-fg{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,auto);justify-content:space-around;gap:20px 40px}\
#mo-hero .mh-f{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:700;color:#3a3530;white-space:nowrap}\
#mo-hero .mh-f svg{color:var(--gb);flex:none}\
#mo-hero .mh-f.hl{color:var(--gd);font-weight:800}\
@media (max-width:991px){\
  #mo-hero .mh-in{padding:80px 22px 70px}\
  #mo-hero .mh-fg{grid-template-columns:repeat(2,auto);justify-content:center;gap:16px 34px}\
}\
@media (max-width:600px){\
  #mo-hero .mh-dark{background-size:auto,72px 72px,72px 72px}\
  #mo-hero .mh-in{padding:52px 16px 46px}\
  #mo-hero .mh-eye{font-size:14px;gap:10px;margin-bottom:18px}\
  #mo-hero .mh-eye:before{width:24px}\
  #mo-hero p{margin:20px 0 28px;line-height:1.85}\
  #mo-hero .mh-btns{gap:10px;flex-wrap:nowrap}\
  #mo-hero .mh-btn{flex:1;min-width:0;padding:15px 10px;font-size:15px;gap:7px}\
  #mo-hero .mh-btn svg{width:18px;height:18px}\
  #mo-hero .mh-feat{padding:20px 14px 18px}\
  #mo-hero .mh-fg{grid-template-columns:1fr 1fr;justify-content:stretch;gap:14px 10px}\
  #mo-hero .mh-f{font-size:13px;gap:7px;white-space:normal;line-height:1.5}\
  #mo-hero .mh-f svg{width:18px;height:18px}\
}\
@media (prefers-reduced-motion:reduce){#mo-hero .mh-w{transition:opacity .3s;transform:none!important;filter:none!important}}';

  function html() {
    var words = "", feats = "";
    for (var i = 0; i < CONFIG.words.length; i++)
      words += '<span class="mh-w' + (i === 0 ? " on" : "") + '"' + (i ? ' aria-hidden="true"' : "") + ">" + CONFIG.words[i] + "</span>";
    for (var j = 0; j < FEATURES.length; j++) {
      var f = FEATURES[j];
      feats += '<div class="mh-f' + (f[2] ? " hl" : "") + '">' + ic(I[f[1]], 22) + "<span>" + f[0] + "</span></div>";
    }
    return '\
<div class="mh-dark"><div class="mh-in">\
  <div class="mh-eye">أنظمة لإدارة الأملاك والعروض العقارية</div>\
  <h1>عقارك يستاهل<br><span class="mh-l2"><span class="mh-br">}</span><span class="mh-rot">' + words + '</span><span class="mh-br">{</span></span></h1>\
  <p>نبني لك <b>نظامك العقاري الخاص</b>، الدعم الفني والتحديثات والإصلاحات والصيانة والإضافات شاملة، مع نسخ احتياطية واستضافة رسمية.</p>\
  <div class="mh-btns">\
    <a class="mh-btn mh-pri" href="' + CONFIG.systemsUrl + '">اكتشف أنظمتنا</a>\
    <a class="mh-btn mh-wa" href="' + CONFIG.whatsappUrl + '" target="_blank" rel="noopener">' + ic(I.wa, 22) + 'كلّمنا واتساب</a>\
  </div>\
</div></div>\
<div class="mh-feat"><div class="mh-fg">' + feats + '</div></div>';
  }

  // تبديل الكلمة داخل الأقواس: الحالية تطلع لفوق وتختفي، والجديدة تدخل من تحت
  // وعرض المساحة بين القوسين يتغيّر مع طول الكلمة عشان القوسين يحضنونها
  function rotate(sec) {
    var rot = sec.querySelector(".mh-rot"), w = sec.querySelectorAll(".mh-w"), i = 0;
    function fit() {
      var cs = getComputedStyle(rot);
      rot.style.width = Math.ceil(w[i].offsetWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + "px";
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    if (w.length < 2) return;
    setInterval(function () {
      if (document.hidden) return;
      var cur = w[i], nxt = w[(i = (i + 1) % w.length)];
      cur.classList.remove("on");
      cur.classList.add("out");
      cur.setAttribute("aria-hidden", "true");
      nxt.classList.remove("out");
      nxt.classList.add("on");
      nxt.removeAttribute("aria-hidden");
      fit();
      setTimeout(function () { cur.classList.remove("out"); }, 650);
    }, CONFIG.interval);
  }

  // القسم بعرض الشاشة كامل حتى لو الثيم حاطّه داخل حاوية لها هوامش
  function fullBleed(sec) {
    function fit() {
      sec.style.marginLeft = sec.style.marginRight = "0";
      var r = sec.getBoundingClientRect(), vw = document.documentElement.clientWidth;
      sec.style.marginLeft = -r.left + "px";
      sec.style.marginRight = -(vw - r.right) + "px";
    }
    fit();
    window.addEventListener("resize", fit);
  }

  function mountHero() {
    if (!isHome() || document.getElementById("mo-hero")) return;
    var main = document.querySelector("main") || document.querySelector("#app");
    if (!main) return;

    var st = document.createElement("style");
    st.id = "mo-hero-css";
    st.textContent = CSS;
    document.head.appendChild(st);

    var sec = document.createElement("section");
    sec.id = "mo-hero";
    sec.innerHTML = html();
    var first = main.querySelector(":scope > section");
    if (first) first.before(sec);
    else main.prepend(sec);
    fullBleed(sec);
    rotate(sec);
  }

  /* ================= 2) وثيقة العمل الحر في الفوتر ================= */
  // شعار العمل الحر (PNG شفاف مضمّن داخل الكود — ما يحتاج رفع صورة)
  var FL_LOGO = "data:image/png;base64,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";

  var FL_CSS = '\
#mo-fl{direction:rtl;font-family:inherit;display:flex;justify-content:center;padding:22px 16px 6px;width:100%;clear:both}\
#mo-fl *{box-sizing:border-box}\
#mo-fl.in-brand{padding:28px 0 6px}\
#mo-fl .fl-card{display:inline-flex;align-items:center;gap:16px;background:#fff;color:#1c1c1e;text-decoration:none;\
  border:1px solid rgba(20,30,50,.09);border-radius:18px;padding:12px 22px 12px 18px;\
  box-shadow:0 1px 2px rgba(20,30,50,.05),0 10px 26px -12px rgba(20,30,50,.18);transition:transform .2s,box-shadow .2s}\
#mo-fl a.fl-card:hover{transform:translateY(-2px);box-shadow:0 1px 2px rgba(20,30,50,.05),0 16px 32px -14px rgba(20,30,50,.26)}\
#mo-fl .fl-logo{height:54px;width:auto;flex:none;display:block}\
#mo-fl .fl-sep{width:1px;align-self:stretch;margin:4px 0;background:linear-gradient(transparent,rgba(20,30,50,.14),transparent)}\
#mo-fl .fl-txt{display:flex;flex-direction:column;gap:4px;line-height:1.25;text-align:right}\
#mo-fl .fl-t{display:flex;align-items:center;gap:6px;font-size:16px;font-weight:800;color:#1c1c1e;margin:0}\
#mo-fl .fl-t svg{color:#1c8f5a;flex:none}\
#mo-fl .fl-n{direction:ltr;unicode-bidi:isolate;text-align:right;font-size:17px;font-weight:800;letter-spacing:.6px;\
  color:#1c5caa;font-variant-numeric:tabular-nums;font-family:inherit}\
@media (max-width:600px){\
  #mo-fl{padding:18px 12px 4px}\
  #mo-fl.in-brand{padding:20px 0 4px}\
  #mo-fl .fl-card{gap:12px;padding:10px 16px 10px 14px;border-radius:16px}\
  #mo-fl .fl-logo{height:44px}\
  #mo-fl .fl-t{font-size:14px}\
  #mo-fl .fl-n{font-size:15px}\
}';

  function flHtml() {
    var c = CONFIG.freelance, tag = c.url ? "a" : "div";
    var attrs = c.url ? ' href="' + c.url + '" target="_blank" rel="noopener"' : "";
    return '<' + tag + ' class="fl-card"' + attrs + ' title="' + c.title + ' ' + c.number + '">\
  <img class="fl-logo" src="' + FL_LOGO + '" alt="' + c.title + '" width="55" height="54" decoding="async">\
  <span class="fl-sep" aria-hidden="true"></span>\
  <span class="fl-txt">\
    <span class="fl-t">' + ic(I.verified, 18) + c.title + '</span>\
    <span class="fl-n">' + c.number + '</span>\
  </span>\
</' + tag + '>';
  }

  function findFooter() {
    return document.querySelector("footer.store-footer") ||
           document.querySelector(".store-footer") ||
           document.querySelector("footer");
  }

  // مكان الشارة: تحت وصف المتجر في عمود البراند (المساحة الفاضية فوق صف التواصل)
  // ولو ما لقاه: قبل صف التواصل، ثم قبل سطر الحقوق، ثم آخر الفوتر
  function placeBadge(footer, box) {
    var brand = footer.querySelector('[data-selia="footer-brand-column"], .store-footer__brand');
    if (brand) { box.classList.add("in-brand"); brand.appendChild(box); return; }

    var contacts = footer.querySelector(".store-footer__contacts-row");
    if (contacts) { contacts.before(box); return; }

    var bottom = footer.querySelector(".footer-bottom");
    if (bottom) { bottom.before(box); return; }

    var all = footer.querySelectorAll("*"), copy = null;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length) continue;
      var t = el.textContent || "";
      if (t.indexOf("©") > -1 || t.indexOf("جميع الحقوق") > -1 || t.indexOf("الحقوق محفوظة") > -1) { copy = el; break; }
    }
    if (copy) {
      var row = copy.closest('[class*="bottom"],[class*="copyright"]');
      if (row && footer.contains(row) && row !== footer) { row.before(box); return; }
    }
    footer.appendChild(box);
  }

  function mountBadge() {
    if (!CONFIG.freelance.show || document.getElementById("mo-fl")) return true;
    var footer = findFooter();
    if (!footer) return false;

    if (!document.getElementById("mo-fl-css")) {
      var st = document.createElement("style");
      st.id = "mo-fl-css";
      st.textContent = FL_CSS;
      document.head.appendChild(st);
    }
    var box = document.createElement("div");
    box.id = "mo-fl";
    box.innerHTML = flHtml();
    placeBadge(footer, box);
    return true;
  }

  // الفوتر في سلة أحياناً يتأخر بالتحميل — ننتظره لحد ما يظهر (بحد أقصى 20 ثانية)
  function waitBadge() {
    if (mountBadge()) return;
    var mo = new MutationObserver(function () { if (mountBadge()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 20000);
  }

  function init() {
    mountHero();
    waitBadge();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
