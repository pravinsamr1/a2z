(function () {
  'use strict';

  var doc = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header shadow once the page scrolls */
  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.to-top');
  function onScroll() {
    var y = window.pageYOffset || doc.scrollTop;
    if (header) header.classList.toggle('is-pinned', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* Mobile navigation */
  var navToggle = document.querySelector('.nav-toggle');
  var navClose = document.querySelector('.nav-close');
  var navOverlay = document.querySelector('.nav-overlay');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (navToggle) navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (navToggle) navToggle.addEventListener('click', function () { setNav(!body.classList.contains('nav-open')); });
  if (navClose) navClose.addEventListener('click', function () { setNav(false); });
  if (navOverlay) navOverlay.addEventListener('click', function () { setNav(false); });

  Array.prototype.forEach.call(document.querySelectorAll('.submenu-toggle'), function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.closest('.has-sub');
      var open = !li.classList.contains('is-open');
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      setNav(false);
      closeModal();
      closeLightbox();
    }
  });

  /* Entrance animations */
  var animated = document.querySelectorAll('[data-anim]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        el.style.animationDelay = delay + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(animated, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(animated, function (el) { el.style.opacity = 1; });
  }

  /* Hero background video: start only when allowed */
  var video = document.querySelector('.hero__video');
  if (video) {
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduceMotion || saveData) {
      video.removeAttribute('autoplay');
      video.pause();
    } else {
      var src = video.getAttribute('data-src');
      if (src) {
        video.src = src;
        video.load();
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    }
  }

  /* Quote popup */
  var modal = document.getElementById('quote-modal');
  var lastFocus = null;
  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setNav(false);
    var first = modal.querySelector('input:not(.hp)');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (lastFocus) lastFocus.focus();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-quote]'), function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
  });
  if (modal) {
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    var closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  /* Enquiry forms */
  Array.prototype.forEach.call(document.querySelectorAll('form[data-enquiry]'), function (form) {
    var started = form.querySelector('input[name="_ts"]');
    if (started) started.value = String(Date.now());
    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }
      if (status) { status.className = 'form-status'; status.textContent = ''; }
      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        return r.json().catch(function () { return { ok: r.ok }; });
      }).then(function (res) {
        if (res && res.ok) {
          form.reset();
          if (started) started.value = String(Date.now());
          if (status) { status.className = 'form-status is-ok'; status.textContent = res.message || 'Thank you! We will be in touch shortly.'; }
        } else {
          throw new Error(res && res.message);
        }
      }).catch(function (err) {
        if (status) {
          status.className = 'form-status is-err';
          status.textContent = (err && err.message) || 'Sorry, something went wrong. Please call us on 0431 563 884.';
        }
      }).then(function () {
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
      });
    });
  });

  /* Recent work carousel */
  var track = document.querySelector('.work__track');
  if (track) {
    var slides = track.children;
    var total = slides.length;
    Array.prototype.slice.call(slides).forEach(function (s) {
      var c = s.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      var img = c.querySelector('img');
      if (img) img.alt = '';
      track.appendChild(c);
    });
    var index = 0;
    var paused = false;
    var step = function () {
      var w = slides[0].getBoundingClientRect().width + 10;
      index++;
      track.style.transition = 'transform .5s ease';
      track.style.transform = 'translate3d(' + (-index * w) + 'px,0,0)';
      if (index >= total) {
        setTimeout(function () {
          track.style.transition = 'none';
          index = 0;
          track.style.transform = 'translate3d(0,0,0)';
        }, 520);
      }
    };
    track.addEventListener('mouseenter', function () { paused = true; });
    track.addEventListener('mouseleave', function () { paused = false; });
    if (!reduceMotion) {
      setInterval(function () { if (!paused && !document.hidden) step(); }, 5000);
    }
  }

  /* Gallery lightbox */
  var lb = document.querySelector('.lightbox');
  var gallery = document.querySelectorAll('.gallery-grid a');
  var current = 0;
  function showImage(i) {
    current = (i + gallery.length) % gallery.length;
    var a = gallery[current];
    var img = lb.querySelector('img');
    img.src = a.getAttribute('href');
    img.alt = (a.querySelector('img') || {}).alt || '';
  }
  function closeLightbox() {
    if (lb) lb.classList.remove('is-open');
  }
  if (lb && gallery.length) {
    Array.prototype.forEach.call(gallery, function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        showImage(i);
        lb.classList.add('is-open');
      });
    });
    lb.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
    lb.querySelector('.lightbox__prev').addEventListener('click', function () { showImage(current - 1); });
    lb.querySelector('.lightbox__next').addEventListener('click', function () { showImage(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') showImage(current - 1);
      if (e.key === 'ArrowRight') showImage(current + 1);
    });
  }
})();
