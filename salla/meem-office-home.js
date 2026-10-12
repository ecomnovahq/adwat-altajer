/* ===== ميم أوفيس – الواجهة الرئيسية (Salla Custom JS) =====
   قسم واحد: عنوان متحرك + وصف + أزرار + شريط المميزات          */
(function () {
  /* ---------- الإعدادات: عدّل هنا فقط ---------- */
  var CONFIG = {
    systemsUrl: "https://meemoffice.com/%D8%A3%D9%86%D8%B8%D9%85%D8%A9-%D9%85%D9%8A%D9%85-%D8%A7%D9%84%D8%B9%D9%82%D8%A7%D8%B1%D9%8A%D8%A9/c1585079166", // رابط تصنيف الأنظمة
    whatsappUrl: "https://api.whatsapp.com/send/?phone=966560485861&text&type=phone_number&app_absent=0", // رابط الواتساب
    words: ["تنظيم", "نظام", "احترافية"],      // الكلمات المتبدّلة داخل الأقواس
    interval: 2200                              // مدة ظهور كل كلمة (ملي ثانية)
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
    wa: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9a5 5 0 0 1-2.8-2.8l.9-1-1-2z"/>'
  };

  var FEATURES = [
    // [النص، الأيقونة، مميّز؟]
    ["خدمنا أكثر من 1,000 عميل", "users", true],
    ["يُبنى على طريقة شغلك", "sliders"],
    ["باسمك وشعارك", "brand"],
    ["ننقل بياناتك عنك", "swap"],
    ["أنظمتنا جاهزة خلال 2-3 أيام", "clock"],
    ["يشتغل من أي جهاز", "phone"],
    ["مستضاف وآمن على Cloudflare", "shield"],
    ["دعم فني وتحديثات سنة كاملة", "headset"]
  ];

  var CSS = '\
#mo-hero{--g:#dca35a;--gb:#c78a39;--gd:#9a6a22;--bg:#18181a;--ink:#2a2118;\
  font-family:inherit;direction:rtl;background:#f3efe9;padding:12px}\
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
#mo-hero p{margin:30px 0 40px;font-size:clamp(17px,1.7vw,22px);font-weight:500;line-height:1.9;color:#b9b3ab;max-width:760px}\
#mo-hero p b{color:#f3efe9;font-weight:800}\
#mo-hero .mh-btns{display:flex;gap:16px;flex-wrap:wrap}\
#mo-hero .mh-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:226px;padding:20px 34px;border-radius:99px;\
  font-size:19px;font-weight:800;color:#1b1610;text-decoration:none;transition:transform .2s,filter .2s,box-shadow .2s}\
#mo-hero .mh-btn:hover{transform:translateY(-2px);filter:brightness(1.06)}\
#mo-hero .mh-pri{background:var(--gb);box-shadow:0 14px 30px rgba(199,138,57,.25)}\
#mo-hero .mh-wa{background:#79e2a8;box-shadow:0 14px 30px rgba(121,226,168,.18)}\
#mo-hero .mh-feat{background:#fff;padding:26px 28px 22px}\
#mo-hero .mh-fg{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(4,auto);justify-content:space-around;gap:20px 40px}\
#mo-hero .mh-f{display:flex;align-items:center;gap:10px;font-size:17px;font-weight:700;color:#3a3530;white-space:nowrap}\
#mo-hero .mh-f svg{color:var(--gb);flex:none}\
#mo-hero .mh-f.hl{color:var(--gd);font-weight:800}\
@media (max-width:991px){\
  #mo-hero .mh-in{padding:80px 22px 70px}\
  #mo-hero .mh-fg{grid-template-columns:repeat(2,auto);justify-content:center;gap:16px 34px}\
}\
@media (max-width:600px){\
  #mo-hero{padding:8px}\
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
  <p>نبني لك <b>نظامك العقاري الخاص</b>، مع <b>دعم فني وتحديثات سنة كاملة</b>.</p>\
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

  function mount() {
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
    rotate(sec);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
