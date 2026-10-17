/* mlr3book 中文译本 · 全局搜索
 * 索引来源：search_index.json（构建期由 _tools/build_search_index.py 生成）
 * 功能：顶栏实时下拉搜索、/ 快捷键聚焦、方向键选择、回车跳转、Esc 关闭
 */
(function () {
  'use strict';

  var INDEX_URL = 'search_index.json';
  var MAX_HITS = 40;          // 下拉最多显示条数
  var SNIPPET_LEN = 150;      // 摘要长度

  var index = null;           // 载入后的扁平化记录
  var loading = false;
  var loadFailed = false;

  // ---------- 工具 ----------
  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, terms) {
    var out = esc(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function terms(q) {
    return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  // ---------- 索引载入 ----------
  function load(cb) {
    if (index) { cb(index); return; }
    if (loadFailed) { cb(null); return; }
    if (loading) { setTimeout(function () { load(cb); }, 120); return; }
    loading = true;
    fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        index = flatten(data);
        loading = false;
        cb(index);
      })
      .catch(function () {
        loading = false;
        loadFailed = true;
        cb(null);
      });
  }

  function flatten(data) {
    var recs = [];
    (data.chapters || []).forEach(function (ch) {
      (ch.sections || []).forEach(function (sec) {
        var fullPath = ch.file.split('/').pop().replace('.html', '');
        recs.push({
          file: ch.file,
          chapter: ch.title,
          section: sec.heading,
          anchor: sec.anchor || '',
          paras: sec.paras || [],
          key: (ch.title + ' ' + sec.heading).toLowerCase(),
          id: ch.file + '#' + (sec.anchor || '')
        });
      });
    });
    return recs;
  }

  // ---------- 检索 ----------
  function search(q) {
    var ts = terms(q);
    if (!ts.length || !index) return [];
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var rec = index[i];
      // 章节/小节标题命中 → 整节算一条
      var inHead = ts.every(function (t) { return rec.key.indexOf(t) >= 0; });
      if (inHead) {
        var first = rec.paras[0] || '';
        hits.push({
          rec: rec, score: 1000,
          snippet: snippet(first, ts, SNIPPET_LEN)
        });
        continue;
      }
      // 正文命中
      for (var j = 0; j < rec.paras.length; j++) {
        var low = rec.paras[j].toLowerCase();
        var ok = true;
        var score = 0;
        for (var k = 0; k < ts.length; k++) {
          var p = low.indexOf(ts[k]);
          if (p < 0) { ok = false; break; }
          score += 10 - Math.min(9, Math.floor(p / 400));
        }
        if (ok) {
          hits.push({ rec: rec, score: score + (rec.key.indexOf(ts[0]) >= 0 ? 50 : 0),
                      snippet: snippet(rec.paras[j], ts, SNIPPET_LEN) });
        }
      }
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits;
  }

  function snippet(text, ts, len) {
    if (text.length <= len) return text;
    var low = text.toLowerCase();
    var pos = -1;
    for (var i = 0; i < ts.length; i++) {
      var p = low.indexOf(ts[i]);
      if (p >= 0) { pos = p; break; }
    }
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - Math.floor(len / 3));
    var s = text.slice(start, start + len);
    return (start > 0 ? '…' : '') + s + (start + len < text.length ? '…' : '');
  }

  // ---------- 下拉面板 ----------
  function initPanel(input, panel) {
    var sel = -1, cur = [];

    function close() { panel.classList.remove('open'); panel.innerHTML = ''; sel = -1; }

    function render(q) {
      load(function (data) {
        if (!data) {
          panel.innerHTML = '<div class="s-hint">索引加载失败，请稍后重试</div>';
          panel.classList.add('open');
          return;
        }
        cur = search(q);
        if (!q.trim()) { close(); return; }
        if (!cur.length) {
          panel.innerHTML = '<div class="s-hint">未找到「' + esc(q) + '」相关内容</div>';
          panel.classList.add('open');
          return;
        }
        var ts = terms(q);
        var shown = cur.slice(0, MAX_HITS);
        var html = '<div class="s-head"><span>找到 ' + cur.length + ' 处</span>' +
                   '<span>按 Enter 查看全部</span></div>';
        html += shown.map(function (h, i) {
          return '<a class="s-item" href="' + h.rec.id + '" data-i="' + i + '">' +
                 '<div class="s-ch">' + highlight(h.rec.chapter, ts) + '</div>' +
                 (h.rec.section ? '<div class="s-sec">' + highlight(h.rec.section, ts) + '</div>' : '') +
                 '<div class="s-txt">' + highlight(h.snippet, ts) + '</div></a>';
        }).join('');
        panel.innerHTML = html;
        panel.classList.add('open');
        sel = -1;
      });
    }

    function move(delta) {
      var items = panel.querySelectorAll('.s-item');
      if (!items.length) return;
      sel = (sel + delta + items.length) % items.length;
      items.forEach(function (el, i) { el.classList.toggle('sel', i === sel); });
      items[sel].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (sel >= 0 && cur[sel]) { location.href = cur[sel].rec.id; }
        else if (input.value.trim()) { location.href = 'search.html?q=' + encodeURIComponent(input.value.trim()); }
      } else if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
    });
    panel.addEventListener('click', function (e) {
      var it = e.target.closest('.s-item');
      if (!it) return;
      e.preventDefault();
      location.href = it.getAttribute('href');
    });
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && e.target !== input) close();
    });
  }

  // ---------- 结果页 ----------
  function initResultPage(qs) {
    var box = document.getElementById('s-page-box');
    var input = document.getElementById('s-page-input');
    var meta = document.getElementById('s-page-meta');
    var list = document.getElementById('s-page-list');
    if (!box) return;
    var q = qs || '';
    input.value = q;

    function run(term) {
      load(function (data) {
        if (!data) { meta.textContent = '索引加载失败'; return; }
        var hits = search(term);
        if (!term.trim()) { meta.textContent = '输入关键词开始搜索全书内容'; list.innerHTML = ''; return; }
        meta.textContent = hits.length ? '找到 ' + hits.length + ' 处结果' : '未找到「' + term + '」相关内容';
        var ts = terms(term);
        list.innerHTML = hits.map(function (h) {
          return '<li><a class="s-item" href="' + h.rec.id + '">' +
                 '<div class="s-ch">' + highlight(h.rec.chapter, ts) + '</div>' +
                 (h.rec.section ? '<div class="s-sec">' + highlight(h.rec.section, ts) + '</div>' : '') +
                 '<div class="s-txt">' + highlight(h.snippet, ts) + '</div></a></li>';
        }).join('');
        window.scrollTo(0, 0);
      });
    }
    run(q);
    var t = null;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var v = input.value.trim();
        history.replaceState(null, '', v ? 'search.html?q=' + encodeURIComponent(v) : 'search.html');
        run(v);
      }, 220);
    });
  }

  // ---------- 启动 ----------
  function boot() {
    var input = document.getElementById('mlr3-search');
    var panel = document.getElementById('mlr3-search-panel');
    if (input && panel) initPanel(input, panel);

    var qs = '';
    var m = location.search.match(/[?&]q=([^&]*)/);
    if (m) qs = decodeURIComponent(m[1].replace(/\+/g, ' '));
    if (document.getElementById('s-page-box')) initResultPage(qs);

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        if (input) { e.preventDefault(); input.focus(); input.select(); }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
