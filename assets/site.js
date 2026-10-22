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

  /* ---- Lucide ikonları (CDN'den geldiyse) ---- */
  function icons() { if (window.lucide && window.lucide.createIcons) { window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } }); } }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', icons); } else { icons(); }
})();
