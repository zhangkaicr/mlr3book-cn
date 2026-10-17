/* 全站搜索 · 通用版
 * 兼容两种索引格式：
 *   A) { chapters: [{ file:'chapters/x.html', title, sections:[…] }] }   —— mlr3book
 *   B) { library, libTitle, pages:[{ file:'x.html', title, sections:[…] }] } —— share 各库
 * 功能：顶栏下拉实时搜索、/ 快捷键聚焦、方向键选择、回车跳转、Esc 关闭、独立结果页
 */
(function () {
  'use strict';

  var INDEX_URL = 'search_index.json';
  var MAX_HITS = 40;
  var SNIPPET_LEN = 150;

  var index = null, loading = false, loadFailed = false, libTitle = '';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hl(text, ts) {
    var out = esc(text);
    ts.forEach(function (t) {
      if (!t) return;
      var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function terms(q) { return String(q).trim().toLowerCase().split(/\s+/).filter(Boolean); }

  function snippet(text, ts, len) {
    if (text.length <= len) return text;
    var low = text.toLowerCase(), pos = -1;
    for (var i = 0; i < ts.length; i++) {
      var p = low.indexOf(ts[i]);
      if (p >= 0) { pos = p; break; }
    }
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - Math.floor(len / 3));
    return (start > 0 ? '…' : '') + text.slice(start, start + len) +
           (start + len < text.length ? '…' : '');
  }

  function load(cb) {
    if (index) { cb(index); return; }
    if (loadFailed) { cb(null); return; }
    if (loading) { setTimeout(function () { load(cb); }, 120); return; }
    loading = true;
    fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        libTitle = data.libTitle || '';
        index = flatten(data);
        loading = false;
        cb(index);
      })
      .catch(function () { loading = false; loadFailed = true; cb(null); });
  }

  function flatten(data) {
    var src = data.chapters || data.pages || [];
    var recs = [];
    src.forEach(function (unit) {
      (unit.sections || []).forEach(function (sec) {
        var title = unit.title || '';
        recs.push({
          file: unit.file,
          chapter: title,
          section: sec.heading || '',
          anchor: sec.anchor || '',
          paras: sec.paras || [],
          key: (title + ' ' + (sec.heading || '')).toLowerCase(),
          id: unit.file + (sec.anchor ? '#' + sec.anchor : '')
        });
      });
    });
    return recs;
  }

  function search(q) {
    var ts = terms(q);
    if (!ts.length || !index) return [];
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var rec = index[i];
      if (ts.every(function (t) { return rec.key.indexOf(t) >= 0; })) {
        // 标题命中：优先用首段作摘要；若该小节无正文（页面级标题条目），回退用标题本身
        var head = rec.paras[0] || rec.section || rec.chapter || '';
        hits.push({ rec: rec, score: 1000, snippet: snippet(head, ts, SNIPPET_LEN) });
        continue;
      }
      for (var j = 0; j < rec.paras.length; j++) {
        var low = rec.paras[j].toLowerCase(), ok = true, score = 0;
        for (var k = 0; k < ts.length; k++) {
          var p = low.indexOf(ts[k]);
          if (p < 0) { ok = false; break; }
          score += 10 - Math.min(9, Math.floor(p / 400));
        }
        if (ok) hits.push({ rec: rec, score: score, snippet: snippet(rec.paras[j], ts, SNIPPET_LEN) });
      }
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits;
  }

  /* ---------- 下拉面板 ---------- */
  function initPanel(input, panel) {
    var sel = -1, cur = [];

    function close() { panel.className = panel.className.replace(/\s*open/g, ''); panel.innerHTML = ''; sel = -1; }

    function render(q) {
      load(function (data) {
        if (!data) {
          panel.innerHTML = '<div class="sempty">索引加载失败</div>';
          panel.className += ' open';
          return;
        }
        cur = search(q);
        if (!q.trim()) { close(); return; }
        if (!cur.length) {
          panel.innerHTML = '<div class="sempty">未找到「' + esc(q) + '」相关内容</div>';
          panel.className += ' open';
          return;
        }
        var ts = terms(q);
        var html = '<div class="sh">找到 ' + cur.length + ' 处　·　Enter 查看全部</div>' +
          cur.slice(0, MAX_HITS).map(function (h, i) {
            return '<a class="sres" href="' + h.rec.id + '" data-i="' + i + '">' +
              '<div class="c">' + hl(h.rec.chapter, ts) + '</div>' +
              (h.rec.section ? '<div class="s">' + hl(h.rec.section, ts) + '</div>' : '') +
              '<div class="t">' + hl(h.snippet, ts) + '</div></a>';
          }).join('');
        panel.innerHTML = html;
        panel.className += ' open';
        sel = -1;
      });
    }

    function move(d) {
      var items = panel.querySelectorAll('.sres');
      if (!items.length) return;
      sel = (sel + d + items.length) % items.length;
      for (var i = 0; i < items.length; i++) items[i].className = items[i].className.replace(/\s*sel/g, '');
      items[sel].className += ' sel';
      items[sel].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim()) render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (sel >= 0 && cur[sel]) location.href = cur[sel].rec.id;
        else if (input.value.trim()) location.href = 'search.html?q=' + encodeURIComponent(input.value.trim());
      } else if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
    });
    panel.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('.sres') : null;
      if (!it) return;
      e.preventDefault();
      location.href = it.getAttribute('href');
    });
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && e.target !== input) close();
    });
  }

  /* ---------- 结果页 ---------- */
  function initResultPage() {
    var input = document.getElementById('s-page-q');
    if (!input) return;
    var meta = document.getElementById('s-page-meta');
    var list = document.getElementById('s-page-list');
    var m = location.search.match(/[?&]q=([^&]*)/);
    var q = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    input.value = q;

    function run(term) {
      load(function (data) {
        if (!data) { meta.textContent = '索引加载失败'; return; }
        var hits = search(term);
        if (!term.trim()) { meta.textContent = '输入关键词开始搜索'; list.innerHTML = ''; return; }
        meta.textContent = hits.length ? ('找到 ' + hits.length + ' 处结果')
                                      : ('未找到「' + term + '」相关内容');
        var ts = terms(term);
        list.innerHTML = hits.map(function (h) {
          return '<li><a class="sres" href="' + h.rec.id + '">' +
            '<div class="c">' + hl(h.rec.chapter, ts) + '</div>' +
            (h.rec.section ? '<div class="s">' + hl(h.rec.section, ts) + '</div>' : '') +
            '<div class="t">' + hl(h.snippet, ts) + '</div></a></li>';
        }).join('');
      });
    }
    run(q);
    var t = null;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var v = input.value.trim();
        try {
          history.replaceState(null, '', v ? 'search.html?q=' + encodeURIComponent(v) : 'search.html');
        } catch (err) { /* file:// 下忽略 */ }
        run(v);
      }, 220);
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var input = document.getElementById('s-q');
    var panel = document.getElementById('s-panel');
    if (input && panel) initPanel(input, panel);
    initResultPage();

    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && input) {
        e.preventDefault(); input.focus(); input.select();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
