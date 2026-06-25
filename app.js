/* ============================================================
   V&V Apartment & Studio — interactions (multi-page, null-safe)
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c){ return (c || document).querySelector(s); }
  function $all(s, c){ return [].slice.call((c || document).querySelectorAll(s)); }
  function getLS(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function setLS(k,v){ try { localStorage.setItem(k,v); } catch(e){} }

  /* ---------- language (per-page titles from meta) ---------- */
  function meta(name){ var m = $('meta[name="' + name + '"]'); return m ? m.getAttribute('content') : null; }
  function setLang(lang){
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'th' ? 'th' : 'en');
    var t = meta(lang === 'en' ? 'title-en' : 'title-th');
    if (t) document.title = t;
    $all('.lang-toggle button').forEach(function(b){
      var on = b.dataset.setlang === lang;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    setLS('vv-lang', lang);
  }
  setLang(getLS('vv-lang') === 'en' ? 'en' : 'th');
  $all('.lang-toggle button').forEach(function(b){
    b.addEventListener('click', function(){ setLang(b.dataset.setlang); });
  });

  /* ---------- nav: scroll state + mobile menu ---------- */
  var nav = $('.nav');
  if (nav){
    var onScrollNav = function(){ nav.classList.toggle('scrolled', window.scrollY > 40); };
    onScrollNav();
    var burger = $('.burger');
    if (burger) burger.addEventListener('click', function(){
      nav.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', nav.classList.contains('menu-open'));
    });
    $all('.nav-links a').forEach(function(a){
      a.addEventListener('click', function(){ nav.classList.remove('menu-open'); });
    });

    /* parallax hero (home only) */
    var heroBg = $('.hero-bg');
    var ticking = false;
    window.addEventListener('scroll', function(){
      onScrollNav();
      if (!reduce && heroBg && !ticking){
        window.requestAnimationFrame(function(){
          var y = window.scrollY;
          if (y < window.innerHeight) heroBg.style.transform = 'translateY(' + (y * 0.28) + 'px)';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---------- scroll reveal ---------- */
  var reveals = $all('.reveal');
  if (reveals.length){
    if ('IntersectionObserver' in window && !reduce){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(function(el){ io.observe(el); });
    } else {
      reveals.forEach(function(el){ el.classList.add('in'); });
    }
  }

  /* ---------- animated counters ---------- */
  function animateCount(el){
    var target = parseFloat(el.dataset.count), dur = 1400, start = null;
    function step(ts){
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step); else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(step);
  }
  var counters = $all('[data-count]');
  if (counters.length){
    if ('IntersectionObserver' in window && !reduce){
      var co = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if (en.isIntersecting){ animateCount(en.target); co.unobserve(en.target); } });
      }, { threshold: 0.6 });
      counters.forEach(function(c){ co.observe(c); });
    } else {
      counters.forEach(function(c){ c.textContent = parseFloat(c.dataset.count).toLocaleString(); });
    }
  }

  /* ---------- gallery filter + lightbox (gallery page only) ---------- */
  var cells = $all('.gcell');
  if (cells.length){
    var filters = $all('.filter');
    filters.forEach(function(f){
      f.addEventListener('click', function(){
        filters.forEach(function(x){ x.classList.remove('on'); });
        f.classList.add('on');
        var cat = f.dataset.cat;
        cells.forEach(function(c){ c.classList.toggle('hide', !(cat === 'all' || c.dataset.cat === cat)); });
      });
    });

    var lb = $('.lightbox');
    if (lb){
      var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-cap'), current = 0;
      var visible = function(){ return cells.filter(function(c){ return !c.classList.contains('hide'); }); };
      var show = function(){
        var c = visible()[current]; if (!c) return;
        var img = c.querySelector('img');
        lbImg.src = img.dataset.full || img.src; lbImg.alt = img.alt;
        var cap = c.querySelector('.cap'); lbCap.textContent = cap ? cap.textContent : '';
      };
      var open = function(c){ current = visible().indexOf(c); show(); lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
      var move = function(d){ var l = visible(); current = (current + d + l.length) % l.length; show(); };
      var close = function(){ lb.classList.remove('open'); document.body.style.overflow = ''; };
      cells.forEach(function(c){
        c.setAttribute('tabindex', '0');
        c.addEventListener('click', function(){ open(c); });
        c.addEventListener('keydown', function(e){ if (e.key === 'Enter') open(c); });
      });
      lb.querySelector('.lb-close').addEventListener('click', close);
      lb.querySelector('.lb-prev').addEventListener('click', function(){ move(-1); });
      lb.querySelector('.lb-next').addEventListener('click', function(){ move(1); });
      lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
      document.addEventListener('keydown', function(e){
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') move(-1);
        if (e.key === 'ArrowRight') move(1);
      });
    }
  }

  /* ---------- PWA install ---------- */
  var deferredPrompt = null, toast = $('.install-toast');
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferredPrompt = e;
    if (getLS('vv-install-dismissed') !== '1' && toast) toast.classList.add('show');
  });
  if (toast){
    var di = toast.querySelector('.do-install');
    if (di) di.addEventListener('click', function(){
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function(){ deferredPrompt = null; toast.classList.remove('show'); });
    });
    var x = toast.querySelector('.x');
    if (x) x.addEventListener('click', function(){ toast.classList.remove('show'); setLS('vv-install-dismissed', '1'); });
  }

  /* ---------- remove any previously-installed service worker + caches ---------- */
  /* The old cache-first worker caused stale/broken loads on GitHub Pages.
     We no longer use a service worker; clean up any leftover registrations. */
  if ('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(function(regs){
      regs.forEach(function(r){ r.unregister(); });
    }).catch(function(){});
    if (window.caches && caches.keys){
      caches.keys().then(function(keys){ keys.forEach(function(k){ caches.delete(k); }); }).catch(function(){});
    }
  }

  /* ---------- year ---------- */
  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear() + 543;
  var yrEn = $('#year-en'); if (yrEn) yrEn.textContent = new Date().getFullYear();
})();

/* ============================================================
   Cinematic opening: glitter canvas + intro control (home only)
   ============================================================ */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function glitter(canvas, density) {
    if (!canvas) return function(){};
    var ctx = canvas.getContext('2d'), parts = [], raf = 0, running = true, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr); canvas.height = Math.max(1, r.height * dpr);
    }
    function seed() {
      size();
      var area = (canvas.width * canvas.height) / (dpr * dpr);
      var n = Math.max(14, Math.round(area / density));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          r: (Math.random() * 1.1 + 0.35) * dpr,
          a: Math.random(), tw: Math.random() * 0.04 + 0.012,
          vy: -(Math.random() * 0.25 + 0.05) * dpr, vx: (Math.random() - 0.5) * 0.18 * dpr,
          gold: Math.random() > 0.42
        });
      }
    }
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.a += p.tw; var al = 0.10 + Math.abs(Math.sin(p.a)) * 0.34;
        p.y += p.vy; p.x += p.vx;
        if (p.y < -4) { p.y = canvas.height + 4; p.x = Math.random() * canvas.width; }
        if (p.x < -4) p.x = canvas.width + 4; if (p.x > canvas.width + 4) p.x = -4;
        var col = p.gold ? '241,220,168' : '255,255,255';
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, 'rgba(' + col + ',' + al + ')');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    seed(); draw();
    var ro; try { ro = new ResizeObserver(seed); ro.observe(canvas); } catch (e) {}
    return function stop() { running = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); };
  }

  function start() {
    var intro = document.getElementById('intro');
    var heroCanvas = document.querySelector('.hero-glitter');
    var stopHero = glitter(heroCanvas, 34000);

    if (intro) {
      try { sessionStorage.setItem('vv-intro', '1'); } catch (e) {}
      // only run intro glitter if intro is actually showing (not pre-skipped)
      var seen = document.documentElement.classList.contains('intro-seen');
      var stopIntro = seen ? function(){} : glitter(intro.querySelector('.intro-glitter'), 15000);
      var dismiss = function () {
        intro.style.animation = 'introOut .7s cubic-bezier(.7,0,.25,1) forwards';
        setTimeout(function () { stopIntro(); if (intro && intro.parentNode) intro.style.display = 'none'; }, 750);
        document.removeEventListener('keydown', onKey);
      };
      var onKey = function (e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') dismiss(); };
      var skip = intro.querySelector('.intro-skip');
      if (skip) skip.addEventListener('click', dismiss);
      if (!seen) {
        document.addEventListener('keydown', onKey);
        // auto-cleanup after the CSS auto-dismiss finishes
        setTimeout(function () { stopIntro(); }, 4200);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
