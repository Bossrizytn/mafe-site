/* Mafe Studio — "Galeri" paylaşılan davranış katmanı.
   Reveal (IO hızlı yolu + scroll/rAF süpürme yedeği), mobil menü, demo formlar. */
(function () {
  'use strict';
  document.body.classList.add('mfa-js');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top < innerHeight * 0.94 && r.bottom > 0;
  }

  /* ---- Sohbet balonları: vitrin görünür olduğundan itibaren sırayla ---- */
  function kickBubbles(c) {
    if (c.dataset.bubDone) return;
    c.dataset.bubDone = '1';
    var list = c.querySelectorAll('.mfa-bub');
    Array.prototype.forEach.call(list, function (b, i) {
      setTimeout(function () { b.classList.add('mfa-in'); }, 160 * i + 200);
    });
  }

  /* ---- Süpürme: görünür alandaki tüm reveal'ları bir kez açar ---- */
  function sweep() {
    var closed = document.querySelectorAll('.mfa-rv:not(.mfa-in)');
    Array.prototype.forEach.call(closed, function (el) { if (inView(el)) el.classList.add('mfa-in'); });
    var cases = document.querySelectorAll('.mfa-case');
    Array.prototype.forEach.call(cases, function (c) { if (inView(c)) kickBubbles(c); });
  }

  if (reduce || !('IntersectionObserver' in window)) {
    /* Erişilebilirlik: hareket yok — her şey anında görünür */
    Array.prototype.forEach.call(document.querySelectorAll('.mfa-rv, .mfa-bub'), function (el) { el.classList.add('mfa-in'); });
  } else {
    /* Hızlı yol: IntersectionObserver */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('mfa-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.mfa-rv'), function (el) { io.observe(el); });

    var bio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        bio.unobserve(e.target);
        kickBubbles(e.target);
      });
    }, { threshold: 0.25 });
    Array.prototype.forEach.call(document.querySelectorAll('.mfa-case'), function (c) { bio.observe(c); });

    /* Yedek: observer'ın tetiklenmediği ortamlarda scroll/rAF süpürmesi */
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; sweep(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    sweep();
    setTimeout(sweep, 250);
    window.addEventListener('load', function () { sweep(); setTimeout(sweep, 400); setTimeout(sweep, 1500); });

    /* Son güvence: 3.5 saniye sonra kalan her şey görünür (hiçbir içerik görünmez kalmaz) */
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.mfa-rv, .mfa-bub'), function (el) { el.classList.add('mfa-in'); });
    }, 3500);
  }

  /* ---- Mobil menü ---- */
  var burger = document.querySelector('.mfa-burger');
  var menu = document.querySelector('.mfa-nav-links');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    });
  }

  /* ---- Gerçek formlar: form[data-endpoint] → Formsubmit (AJAX, hesapsız) ----
     Gönderim başarı paneline geçirir; hata durumunda form açık kalır ve not düşer. */
  var WL_ERR = { tr: 'Gönderilemedi — lütfen tekrar deneyin.', en: "Couldn't send — please try again." };
  Array.prototype.forEach.call(document.querySelectorAll('form[data-endpoint]'), function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var hp = form.querySelector('.mfa-hp input, input[name="_honey"]');
      if (hp && hp.value) return; /* honeypot: sessizce yut */
      var btn = form.querySelector('button[type=submit]');
      var btnOld = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      var sel = form.getAttribute('data-demo-success') || form.getAttribute('data-success');
      var ok = sel && document.querySelector(sel);
      var note = form.querySelector('.mfa-form-note');
      var lang = (document.documentElement.lang === 'en') ? 'en' : 'tr';

      fetch(form.getAttribute('data-endpoint'), {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (r) { return r.json().then(function (j) { return { httpOk: r.ok, j: j }; }); })
        .then(function (res) {
          var j = res.j || {};
          var pending = String(j.message || '').match(/activat|confirm|verify/i);
          if (res.httpOk && (j.success === 'true' || j.success === true || pending)) {
            form.hidden = true;
            if (ok) { ok.hidden = false; ok.classList.add('mfa-in'); }
          } else { throw new Error('send failed'); }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = btnOld; }
          if (note && !note.dataset.wlErr) {
            note.dataset.wlErr = '1';
            note.textContent = WL_ERR[lang];
          }
        });
    });
  });

  /* ---- Demo formlar: form[data-demo] gönderilince başarı durumuna geçer ----
     Statik prototip: hiçbir veri gönderilmez, hiçbir istek yapılmaz. */
  Array.prototype.forEach.call(document.querySelectorAll('form[data-demo]'), function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var hp = form.querySelector('.mfa-hp input');
      if (hp && hp.value) return; /* honeypot: sessizce yut */
      var ok = document.querySelector(form.getAttribute('data-demo-success'));
      form.hidden = true;
      if (ok) { ok.hidden = false; ok.classList.add('mfa-in'); }
    });
  });

  /* ---- İkonlar: gömülü SVG seti (dış bağımlılık yok) ---- */
  var ICONS = {
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'calendar-check': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'list-checks': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'minus': '<path d="M5 12h14"/>',
    'play': '<polygon points="6 3 20 12 6 21 6 3"/>',
    'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>'
  };
  function icons() {
    Array.prototype.forEach.call(document.querySelectorAll('i[data-lucide]'), function (el) {
      var body = ICONS[el.getAttribute('data-lucide')];
      if (!body) return;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.75');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(el.attributes, function (a) {
        if (a.name !== 'data-lucide') svg.setAttribute(a.name, a.value);
      });
      svg.innerHTML = body;
      el.replaceWith(svg);
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', icons); } else { icons(); }
})();
