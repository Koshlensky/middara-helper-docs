(function () {
  'use strict';

  // ===== Theme =====
  const html = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const hljsTheme = document.getElementById('hljs-theme');

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (hljsTheme) {
      hljsTheme.href = theme === 'dark'
        ? 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css'
        : 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css';
    }
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      const current = html.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // ===== Sidebar Toggle (mobile) =====
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');

  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !sidebarToggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ===== Folder toggle =====
  document.querySelectorAll('.nav-folder-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const list = btn.nextElementSibling;
      if (list) {
        list.style.display = expanded ? 'none' : '';
      }
    });
  });

  // ===== Search =====
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchUrl = window.__SEARCH_URL__;
  let searchData = null;

  function loadSearchData(cb) {
    if (searchData) { cb(searchData); return; }
    fetch(searchUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) { searchData = data; cb(data); })
      .catch(function () { searchData = []; cb([]); });
  }

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showResults(query) {
    if (!query.trim()) { searchResults.hidden = true; return; }
    loadSearchData(function (data) {
      const q = query.toLowerCase();
      const matches = data.filter(function (d) {
        return d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q);
      }).slice(0, 6);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
      } else {
        searchResults.innerHTML = matches.map(function (d) {
          const excerpt = getExcerpt(d.body, q);
          return '<a class="search-result" href="' + d.id + '">' +
            '<div class="search-result-title">' + highlight(d.title, query) + '</div>' +
            (excerpt ? '<div class="search-result-excerpt">' + highlight(excerpt, query) + '</div>' : '') +
            '</a>';
        }).join('');
      }
      searchResults.hidden = false;
    });
  }

  function getExcerpt(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text.substring(0, 80);
    const start = Math.max(0, idx - 30);
    const end = Math.min(text.length, idx + query.length + 60);
    return (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
  }

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', function () {
      showResults(searchInput.value);
    });
    searchInput.addEventListener('focus', function () {
      if (searchInput.value) showResults(searchInput.value);
    });
    document.addEventListener('click', function (e) {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.hidden = true;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { searchResults.hidden = true; searchInput.blur(); }
    });
  }

  // ===== TOC active section (IntersectionObserver) =====
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length > 0) {
    const headings = [];
    tocLinks.forEach(function (link) {
      const id = link.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) headings.push({ id: id, el: el, link: link });
    });

    let activeId = null;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const found = headings.find(function (h) { return h.el === entry.target; });
          if (found && found.id !== activeId) {
            activeId = found.id;
            tocLinks.forEach(function (l) { l.classList.remove('active'); });
            found.link.classList.add('active');
          }
        }
      });
    }, { rootMargin: '0px 0px -60% 0px', threshold: 0 });

    headings.forEach(function (h) { observer.observe(h.el); });
  }

  // ===== Hover preview for internal links =====
  var previewEl = null;
  var previewTimer = null;
  var previewCache = {};
  var currentOrigin = window.location.origin;
  var rootUrl = (window.__ROOT_URL__ || '').replace(/\/$/, '');

  function createPreviewEl() {
    if (previewEl) return previewEl;
    previewEl = document.createElement('div');
    previewEl.className = 'page-preview';
    document.body.appendChild(previewEl);
    return previewEl;
  }

  function showPreview(href, x, y) {
    var el = createPreviewEl();

    function position() {
      var pw = el.offsetWidth || 360;
      var ph = el.offsetHeight || 180;
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      var left = x + 16;
      var top = y - 20;
      if (left + pw > vw - 12) left = x - pw - 16;
      if (top + ph > vh - 12) top = vh - ph - 12;
      if (top < 8) top = 8;
      el.style.left = left + 'px';
      el.style.top = top + 'px';
    }

    if (previewCache[href]) {
      var d = previewCache[href];
      el.innerHTML = '<div class="page-preview-title">' + escapeHtml(d.title) + '</div>' +
        (d.excerpt ? '<div class="page-preview-excerpt">' + escapeHtml(d.excerpt) + '</div>' : '');
      el.classList.add('visible');
      position();
      return;
    }

    fetch(href)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var titleEl = doc.querySelector('.article h1, .article h2');
        var title = titleEl ? titleEl.textContent.trim() : (doc.title || href);
        var contentEl = doc.querySelector('.article');
        var excerpt = '';
        if (contentEl) {
          var preamble = contentEl.querySelector('#preamble p, p');
          if (preamble) {
            excerpt = preamble.textContent.trim().substring(0, 200);
            if (excerpt.length === 200) excerpt += '...';
          }
        }
        previewCache[href] = { title: title, excerpt: excerpt };
        el.innerHTML = '<div class="page-preview-title">' + escapeHtml(title) + '</div>' +
          (excerpt ? '<div class="page-preview-excerpt">' + escapeHtml(excerpt) + '</div>' : '');
        el.classList.add('visible');
        position();
      })
      .catch(function () {
        previewCache[href] = { title: href, excerpt: '' };
      });
  }

  function hidePreview() {
    if (previewEl) previewEl.classList.remove('visible');
  }

  function isInternalLink(href) {
    if (!href) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('javascript:')) return false;
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== currentOrigin) return false;
      if (!url.pathname.endsWith('.html')) return false;
      if (url.href === window.location.href) return false;
      return true;
    } catch (e) { return false; }
  }

  var article = document.querySelector('.article');
  if (article) {
    article.addEventListener('mouseover', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!isInternalLink(href)) return;

      var absHref = new URL(href, window.location.href).href;
      clearTimeout(previewTimer);
      previewTimer = setTimeout(function () {
        showPreview(absHref, e.clientX, e.clientY);
      }, 300);
    });

    article.addEventListener('mousemove', function (e) {
      if (previewEl && previewEl.classList.contains('visible')) {
        var pw = previewEl.offsetWidth || 360;
        var ph = previewEl.offsetHeight || 180;
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var left = e.clientX + 16;
        var top = e.clientY - 20;
        if (left + pw > vw - 12) left = e.clientX - pw - 16;
        if (top + ph > vh - 12) top = vh - ph - 12;
        if (top < 8) top = 8;
        previewEl.style.left = left + 'px';
        previewEl.style.top = top + 'px';
      }
    });

    article.addEventListener('mouseout', function (e) {
      var link = e.target.closest('a');
      if (!link) return;
      clearTimeout(previewTimer);
      hidePreview();
    });
  }

})();
