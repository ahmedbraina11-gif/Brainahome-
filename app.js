/* Braina Home: texts in ar/en/tr.json, contact in site.json, albums in albums.json. */
(function () {
  'use strict';
  var LANGS = ['ar', 'en', 'tr'];
  var state = { lang: 'ar', t: {}, site: {}, albums: [], gallery: {}, album: null, index: 0 };
  var cache = {};

  function $(id) { return document.getElementById(id); }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function json(url) {
    if (cache[url]) return cache[url];
    cache[url] = fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
    return cache[url];
  }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(q) > -1) return q;
    var saved = safeGet('braina-lang');
    if (LANGS.indexOf(saved) > -1) return saved;
    var nav = (navigator.language || 'ar').slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) > -1 ? nav : 'ar';
  }

  function waLink(number) {
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(get(state.t, 'wa.message') || '');
  }

  function applyText() {
    var t = state.t;
    document.documentElement.lang = state.lang;
    document.documentElement.dir = t.dir || 'ltr';
    document.title = t.meta.title;
    $('meta-desc').setAttribute('content', t.meta.desc);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get(t, el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = get(t, el.getAttribute('data-i18n-aria'));
      if (typeof v === 'string') el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('.langs button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === state.lang ? 'true' : 'false');
    });
    var makes = $('makes'); makes.innerHTML = '';
    (get(t, 'about.items') || []).forEach(function (s) {
      var li = document.createElement('li'); li.textContent = s; makes.appendChild(li);
    });
    $('lb-close').textContent = get(t, 'lightbox.close');
    $('lb-prev').setAttribute('aria-label', get(t, 'lightbox.prev'));
    $('lb-next').setAttribute('aria-label', get(t, 'lightbox.next'));
    $('lb-prev').textContent = '\u2039'; $('lb-next').textContent = '\u203A';
    $('float-wa').setAttribute('aria-label', get(t, 'floating.wa'));
    renderContact();
    renderTabs();
    renderGrid();
  }

  function renderContact() {
    var s = state.site, t = state.t;
    var main = s.phones[0];
    $('hero-wa').href = waLink(main.wa);
    $('float-wa').href = waLink(main.wa);
    var list = $('phones'); list.innerHTML = '';
    s.phones.forEach(function (p) {
      var li = document.createElement('li');
      var left = document.createElement('div');
      var label = document.createElement('span'); label.className = 'label'; label.textContent = get(t, 'contact.' + p.key);
      var num = document.createElement('span'); num.className = 'num'; num.textContent = p.display;
      left.appendChild(label); left.appendChild(num);
      var a = document.createElement('a'); a.className = 'btn'; a.href = waLink(p.wa);
      a.target = '_blank'; a.rel = 'noopener'; a.textContent = get(t, 'contact.chat');
      li.appendChild(left); li.appendChild(a); list.appendChild(li);
    });
    $('email').href = 'mailto:' + s.email; $('email').textContent = s.email;
    $('web').href = 'https://' + s.website.replace(/^https?:\/\//, ''); $('web').textContent = s.website;
    var q = encodeURIComponent(s.mapQuery);
    $('map-link').href = 'https://www.google.com/maps/search/?api=1&query=' + q;
    var frame = $('map'); var src = 'https://www.google.com/maps?q=' + q + '&hl=' + state.lang + '&output=embed';
    if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
  }

  function visibleAlbums() {
    return state.albums.filter(function (a) { return (state.gallery[a.id] || []).length > 0; });
  }

  function renderTabs() {
    var box = $('tabs'); box.innerHTML = '';
    var albums = visibleAlbums();
    if (albums.length && !albums.some(function (a) { return a.id === state.album; })) state.album = albums[0].id;
    albums.forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', a.id === state.album ? 'true' : 'false');
      b.textContent = a.title[state.lang] || a.title.en;
      b.addEventListener('click', function () { state.album = a.id; renderTabs(); renderGrid(); });
      box.appendChild(b);
    });
    box.hidden = albums.length < 2;
  }

  function photoUrl(id, file) { return file; }

  function renderGrid() {
    var grid = $('grid'); grid.innerHTML = '';
    var files = state.gallery[state.album] || [];
    $('empty').hidden = visibleAlbums().length > 0;
    files.forEach(function (f, i) {
      var b = document.createElement('button'); b.type = 'button';
      var img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async';
      img.src = photoUrl(state.album, f); img.alt = '';
      b.appendChild(img); b.addEventListener('click', function () { openBox(i); });
      grid.appendChild(b);
    });
  }

  /* lightbox */
  var box = $('lightbox');
  function showPhoto() {
    var files = state.gallery[state.album] || [];
    $('lb-img').src = photoUrl(state.album, files[state.index]);
    $('lb-count').textContent = (state.index + 1) + ' / ' + files.length;
  }
  function openBox(i) { state.index = i; showPhoto(); if (box.showModal) box.showModal(); else box.setAttribute('open', ''); }
  function step(d) {
    var n = (state.gallery[state.album] || []).length;
    state.index = (state.index + d + n) % n; showPhoto();
  }
  $('lb-close').addEventListener('click', function () { box.close(); });
  $('lb-prev').addEventListener('click', function () { step(-1); });
  $('lb-next').addEventListener('click', function () { step(1); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) step(dx > 0 ? -1 : 1);
  });

  function setLang(l) {
    state.lang = l; safeSet('braina-lang', l);
    return json(l + '.json').then(function (t) { state.t = t; applyText(); });
  }

  document.querySelectorAll('.langs button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });
  $('year').textContent = new Date().getFullYear();

  function probe(url) {
    return new Promise(function (res) {
      var i = new Image(); i.onload = function () { res(true); }; i.onerror = function () { res(false); }; i.src = url;
    });
  }
  // Photos are found automatically: <album>-01.jpg, <album>-02.jpg ... until a number is missing.
  function discover() {
    return Promise.all(state.albums.map(function (a) {
      var out = [];
      function next(n) {
        var f = a.id + '-' + (n < 10 ? '0' : '') + n + '.jpg';
        return probe(f).then(function (ok) {
          if (!ok || n >= 99) return out;
          out.push(f); return next(n + 1);
        });
      }
      return next(1).then(function (list) { state.gallery[a.id] = list; });
    })).then(function () { renderTabs(); renderGrid(); });
  }

  Promise.all([json('site.json'), json('albums.json')])
    .then(function (r) { state.site = r[0]; state.albums = r[1]; return setLang(pickLang()); })
    .then(discover)
    .catch(function (e) { console.error(e); });
})();
