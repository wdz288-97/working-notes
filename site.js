/* Ding's working notes: behaviour shared by every page. Each part runs only on pages that have its elements.
   Parts, in order: helpers, hero drawing field, story drawings (loop guide, opening figure, weekly tracking),
   variance data, channel chart, review slide, SQL, scroll story and chapter rail, AI pipeline,
   side panels, the work (tabs, raw output), template copy. */
(function () {
  'use strict';

  // ---- Helpers
  var NS = 'http://www.w3.org/2000/svg';
  var SPRITE = 'icons.svg';
  // Pages in zh/ load the same script from one folder up; the sprite is found next to the script itself
  var ASSET_BASE = (function () {
    var script = document.currentScript;
    return script && script.src ? script.src.slice(0, script.src.lastIndexOf('/') + 1) : '';
  })();
  // Chinese pages set lang="zh-CN"; every label the script writes has both versions
  var ZH = (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('zh') === 0;
  function say(en, zh) { return ZH ? zh : en; }
  function $(id) { return document.getElementById(id); }
  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function htmlEl(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(name, attrs) {
    var use = svgEl('use', attrs);
    use.setAttribute('href', ASSET_BASE + SPRITE + '#i-' + name);
    return use;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
  function fmt(n, digits) {
    var s = Math.abs(n).toFixed(digits);
    return (n > 0 ? '+' : n < 0 ? '−' : '') + s;
  }
  function percentLabel(n) { return fmt(n, Math.abs(n) >= 10 ? 0 : 1) + '%'; }
  function varianceColor(n) { return n >= 0 ? 'var(--good)' : 'var(--bad)'; }
  // A piece appears once the story reaches `at` and, if `until` is given, leaves again at `until`
  function piece(node, at, until) {
    node.setAttribute('data-at', at.toFixed(3));
    if (until !== undefined) node.setAttribute('data-until', String(until));
    return node;
  }
  function drawn(node) {
    node.classList.add('ico', 'draw');
    node.setAttribute('pathLength', 1);
    return node;
  }
  // A hand-drawn loop around a box, drawn in like the other line art
  function loopPath(x1, y1, x2, y2) {
    var cx = (x1 + x2) / 2;
    var cy = (y1 + y2) / 2;
    return 'M' + (cx + 6) + ' ' + y1 + 'C' + (x2 - 10) + ' ' + (y1 - 1) + ' ' + x2 + ' ' + (cy - 7) + ' ' + x2 + ' ' + cy +
      'C' + x2 + ' ' + (y2 - 2) + ' ' + (cx + 30) + ' ' + y2 + ' ' + cx + ' ' + y2 +
      'C' + (x1 + 12) + ' ' + y2 + ' ' + x1 + ' ' + (cy + 6) + ' ' + x1 + ' ' + cy +
      'C' + x1 + ' ' + (y1 + 4) + ' ' + (cx - 30) + ' ' + (y1 - 1) + ' ' + (cx + 14) + ' ' + (y1 + 2);
  }
  // An arc on a circle, angles in degrees clockwise from twelve o'clock
  function arcPath(cx, cy, r, from, to) {
    function point(deg) {
      var rad = deg * Math.PI / 180;
      return (cx + r * Math.sin(rad)).toFixed(2) + ' ' + (cy - r * Math.cos(rad)).toFixed(2);
    }
    return 'M' + point(from) + 'A' + r + ' ' + r + ' 0 ' + (to - from > 180 ? 1 : 0) + ' 1 ' + point(to);
  }
  // ---- Moving between pages: always open the next page at its top.
  // The site may be shown inside a frame whose surroundings keep their scroll position, so a link to another page
  // leaves a note, and the page it opens brings its own top into view.
  var NAV_NOTE = 'notes-page-switch';
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* not supported: the browser default applies */ }
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link || link.target || link.origin !== location.origin || link.pathname === location.pathname) return;
    try { sessionStorage.setItem(NAV_NOTE, '1'); } catch (err) { /* storage blocked: the page still opens, just without the extra scroll */ }
  });
  (function openAtTop() {
    var cameFromLink = false;
    try { cameFromLink = sessionStorage.getItem(NAV_NOTE) === '1'; sessionStorage.removeItem(NAV_NOTE); } catch (e) { cameFromLink = false; }
    if (location.hash) return;
    window.scrollTo(0, 0);
    if (cameFromLink) {
      var top = document.getElementById('top');
      if (top) window.requestAnimationFrame(function () { top.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    }
  })();

  var LOOP_ARCS = [[6, 84], [96, 174], [186, 264], [276, 354]];
  var LOOP_NAMES = say(['Plan', 'Do', 'Check', 'Act'], ['计划', '执行', '检查', '改进']);
  var NUMBER_WORDS = say(['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'], ['零', '一', '两', '三', '四', '五', '六']);
  var scrollHandlers = [];

  // ---- Home: a field of line drawings that draws itself in once on load
  (function drawHeroField() {
    var svg = $('hero-field');
    if (!svg) return;
    var icons = ['ticket', 'bars', 'person', 'sheet', 'sparkle', 'magnifier', 'book', 'database', 'calendar', 'kpi', 'monitor', 'bubble', 'clipboard', 'flow', 'idea', 'screen', 'cup', 'laptop'];
    var seed = 7;
    function random() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var n = 0;
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 9; c++) {
        if (random() < 0.22) continue;
        var size = 26 + Math.round(random() * 14);
        var x = c * 60 + 12 + Math.round((random() - 0.5) * 18);
        var y = r * 62 + 10 + Math.round((random() - 0.5) * 16);
        var tone = n % 6 === 2 ? 'accent' : n % 9 === 4 ? 'teal' : n % 11 === 7 ? 'amber' : 'line';
        var use = icon(icons[n % icons.length], { x: x, y: y, width: size, height: size, class: 'ico' });
        use.style.setProperty('--i', n);
        if (tone !== 'line') use.classList.add(tone);
        else use.style.color = 'var(--muted)';
        svg.appendChild(use);
        n++;
      }
    }
  })();

  // ---- The playbook story
  (function playbookStory() {
    var scrolly = $('scrolly');
    if (!scrolly) return;

    // The loop guide above the drawing: Plan, Do, Check, Act, with what the current stage is for
    var loopItems = document.querySelectorAll('#loop-steps li');
    var LOOP_PURPOSE = say([
      'agree the target and how it\u2019s measured',
      'run the business and track the numbers',
      'confirm what changed, then find out why',
      'agree the action, then follow up'
    ], [
      '商定目标和衡量方式',
      '开展业务，跟踪数字',
      '确认变化，再找原因',
      '商定行动，再跟进落实'
    ]);

    // Opening figure: three ways in, all leading into the same loop. It sits beside the summary and draws itself in on load.
    (function drawWaysIn() {
      var svg = $('ways-canvas');
      var order = 0;
      function onLoad(node) {
        node.classList.add('onload');
        node.style.setProperty('--i', order++);
        svg.appendChild(node);
      }
      var ways = [
        { icon: 'kpi', lines: say(['An owned KPI', 'moves'], ['自己负责的', '指标有变化']), cx: 70, path: 'M70 116C70 170 120 205 158 213', head: 'M149 206l9 7l-10 3' },
        { icon: 'ticket', lines: say(['Another team', 'asks'], ['其他团队', '提出需求']), cx: 220, path: 'M220 116V184', head: 'M214 177l6 7l6-7' },
        { icon: 'idea', lines: say(['A team starts', 'an initiative'], ['团队启动', '专项项目']), cx: 370, path: 'M370 116C370 170 320 205 282 213', head: 'M291 206l-9 7l10 3' }
      ];
      ways.forEach(function (w) {
        onLoad(icon(w.icon, { x: w.cx - 26, y: 8, width: 52, height: 52, class: 'ico draw' }));
        var label = svgEl('text', { x: w.cx, y: 82, 'text-anchor': 'middle' });
        w.lines.forEach(function (line, j) { label.appendChild(svgEl('tspan', { x: w.cx, dy: j === 0 ? 0 : 18 }, line)); });
        onLoad(label);
        onLoad(drawn(svgEl('path', { d: w.path + w.head })));
      });
      var cx = 220;
      var cy = 276;
      // Read like the strip above the story: Plan top left, then clockwise through Do, Check and Act, each arc
      // ending in an arrowhead. Names sit towards the sides, clear of the arrows coming in from above.
      var R = 84;
      var ARCS = [[276, 354], [6, 84], [96, 174], [186, 264]];
      var LABEL_ANGLES = [290, 70, 110, 250];
      function arcHead(endDeg) {
        var e = endDeg * Math.PI / 180;
        var tipX = cx + R * Math.sin(e);
        var tipY = cy - R * Math.cos(e);
        var back = [-Math.cos(e), -Math.sin(e)]; // opposite to the clockwise direction of travel
        function wing(turn) {
          var c = Math.cos(turn);
          var s = Math.sin(turn);
          return (tipX + 10 * (back[0] * c - back[1] * s)).toFixed(1) + ' ' + (tipY + 10 * (back[0] * s + back[1] * c)).toFixed(1);
        }
        return 'M' + wing(0.5) + 'L' + tipX.toFixed(1) + ' ' + tipY.toFixed(1) + 'L' + wing(-0.5);
      }
      ARCS.forEach(function (a, i) {
        var arc = drawn(svgEl('path', { d: arcPath(cx, cy, R, a[0], a[1]) + arcHead(a[1]) }));
        arc.style.strokeWidth = '2.5';
        onLoad(arc);
        var angle = LABEL_ANGLES[i] * Math.PI / 180;
        var lx = cx + 106 * Math.sin(angle);
        var ly = cy - 106 * Math.cos(angle) + 5;
        onLoad(svgEl('text', { class: 'big', x: lx.toFixed(1), y: ly.toFixed(1), 'text-anchor': lx > cx ? 'start' : 'end' }, LOOP_NAMES[i]));
      });
      onLoad(svgEl('text', { class: 'note', x: cx, y: cy + 5, 'text-anchor': 'middle' }, say('the same loop', '同一个循环')));
    })();

    // Weekly tracking: orders slip week by week; at the end of the story, the weeks after the promotion are still to come
    (function drawTracking() {
      var svg = $('track-canvas');
      var lastYear = [27.8, 27.9, 27.9, 28.0, 27.9, 28.0, 28.0, 28.1, 28.1, 28.1, 28.2, 28.2, 28.3];
      var thisYear = [28.6, 28.3, 28.0, 27.7, 27.3, 27.0, 26.7, 26.5, 26.2];
      var target = 27.5;
      function x(i) { return 34 + i * 30.5; }
      function y(v) { return 280 - (v - 25.6) * 60; }
      var last = thisYear.length - 1;

      svg.appendChild(piece(svgEl('line', { class: 'axis', x1: 20, y1: 296, x2: 415, y2: 296 }), 2));
      [[1.5, say('September', '9 月')], [6, say('October', '10 月')], [10.5, say('November', '11 月')]].forEach(function (m) {
        svg.appendChild(piece(svgEl('text', { class: 'wk-axis', x: x(m[0]), y: 318, 'text-anchor': 'middle' }, m[1]), 2.02));
      });
      [3.5, 8.5].forEach(function (i) { svg.appendChild(piece(svgEl('line', { class: 'axis', x1: x(i), y1: 290, x2: x(i), y2: 302 }), 2.02)); });

      svg.appendChild(piece(svgEl('line', { class: 'wk-target', x1: 20, y1: y(target), x2: 415, y2: y(target) }), 2.05));
      svg.appendChild(piece(svgEl('text', { class: 'wk-target-label', x: 415, y: y(target) + 18, 'text-anchor': 'end' }, say('weekly target ', '每周目标 ') + target.toFixed(1)), 2.05));

      var lastPath = lastYear.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(v).toFixed(1); }).join('');
      var lastLine = drawn(svgEl('path', { d: lastPath }));
      lastLine.classList.add('wk-last');
      svg.appendChild(piece(lastLine, 2.08));
      lastYear.forEach(function (v, i) { svg.appendChild(piece(svgEl('circle', { class: 'wk-dot-last', cx: x(i), cy: y(v).toFixed(1), r: 3 }), 2.1)); });

      thisYear.forEach(function (v, i) {
        var at = 2.14 + i * 0.045;
        if (i > 0) svg.appendChild(piece(svgEl('line', { class: 'wk-this', x1: x(i - 1), y1: y(thisYear[i - 1]).toFixed(1), x2: x(i), y2: y(v).toFixed(1) }), at));
        svg.appendChild(piece(svgEl('circle', { class: 'wk-dot-this', cx: x(i), cy: y(v).toFixed(1), r: 4 }), at));
      });
      // Labels sit left of the last week, leaving the space after it for the weeks still to come
      svg.appendChild(piece(svgEl('text', { class: 'wk-num', x: x(last) - 8, y: y(thisYear[last]) + 24, 'text-anchor': 'end' }, say('this year ', '今年 ') + thisYear[last].toFixed(1)), 2.54));
      svg.appendChild(piece(svgEl('text', { class: 'wk-num', x: x(last) - 8, y: y(lastYear[last]) - 14, 'text-anchor': 'end' }, say('last year ', '去年 ') + lastYear[last].toFixed(1)), 2.54));
      svg.appendChild(piece(svgEl('line', { class: 'wk-gap', x1: x(last), y1: y(lastYear[last]) + 7, x2: x(last), y2: y(thisYear[last]) - 7 }), 2.58));
      svg.appendChild(piece(svgEl('text', { class: 'wk-gap-label', x: x(last) - 8, y: (y(lastYear[last]) + y(thisYear[last])) / 2 + 5, 'text-anchor': 'end' }, say(fmt(thisYear[last] - lastYear[last], 1) + 'k a week', '每周 ' + fmt(thisYear[last] - lastYear[last], 1) + ' 千单')), 2.6));

      var start = x(last + 0.5);
      svg.appendChild(piece(svgEl('line', { class: 'wk-start', x1: start, y1: 62, x2: start, y2: 296 }), 12.04));
      svg.appendChild(piece(svgEl('text', { class: 'wk-start-label', x: start + 6, y: 58 }, say('promotion starts', '促销开始')), 12.04));
      for (var i = last + 1; i < lastYear.length; i++) {
        svg.appendChild(piece(svgEl('circle', { class: 'wk-dot-next', cx: x(i), cy: y(thisYear[last]).toFixed(1), r: 7 }), 12.1 + (i - last) * 0.05));
        svg.appendChild(piece(svgEl('text', { class: 'note', x: x(i), y: y(thisYear[last]) + 4.5, 'text-anchor': 'middle' }, '?'), 12.1 + (i - last) * 0.05));
      }
      svg.appendChild(piece(svgEl('text', { class: 'note', x: 20, y: 24 }, say('Each week now shows whether the action is working.', '现在每周都能看出行动是否见效。')), 12.36));
    })();

    // Variance data (illustrative, thousands of orders), shared by every chart and table
    var segments = [
      { key: 'delivery_app', name: say('Delivery apps', '外卖平台'), lead: say('Delivery apps', '外卖平台'), last: 48.0, now: 43.2 },
      { key: 'takeaway', name: say('Takeaway', '外带'), lead: say('Takeaway', '外带'), last: 31.0, now: 30.1 },
      { key: 'dine_in', name: say('Dine-in', '堂食'), lead: say('Dine-in', '堂食'), last: 22.5, now: 23.4 },
      { key: 'app_preorder', name: say('App pre-order', 'App 预点单'), lead: say('App pre-orders', 'App 预点单'), last: 14.0, now: 13.3 },
      { key: 'catering', name: say('Catering', '团餐'), lead: say('Catering', '团餐'), last: 6.5, now: 6.9 },
      { key: 'drive_through', name: say('Drive-through', '得来速'), lead: say('The drive-through', '得来速'), last: 2.0, now: 1.3 }
    ].map(function (s) {
      var d = Math.round((s.now - s.last) * 10) / 10;
      return { key: s.key, name: s.name, lead: s.lead, last: s.last, now: s.now, d: d, pct: (s.now - s.last) / s.last * 100 };
    });
    var totalLast = segments.reduce(function (a, s) { return a + s.last; }, 0);
    var totalNow = segments.reduce(function (a, s) { return a + s.now; }, 0);
    var totalD = Math.round((totalNow - totalLast) * 10) / 10;
    var totalPct = (totalNow - totalLast) / totalLast * 100;
    var shareOf = {};
    segments.forEach(function (s) { shareOf[s.key] = s.d / totalD * 100; });
    var orders = {
      split: segments.slice(),
      abs: segments.slice().sort(function (a, b) { return a.d - b.d; }),
      pct: segments.slice().sort(function (a, b) { return a.pct - b.pct; })
    };
    var biggest = orders.abs[0];
    var steepest = orders.pct[0];
    var falling = segments.filter(function (s) { return s.d < 0; }).length;
    // Each chart title states the message of its step
    var chartTitles = ZH ? {
      total: '订单量同比下降 ' + Math.abs(totalPct).toFixed(1) + '%',
      split: NUMBER_WORDS[falling] + '种点单方式下降，' + NUMBER_WORDS[segments.length - falling] + '种增长',
      abs: biggest.lead + '占了 ' + Math.abs(totalD).toFixed(1) + ' 千单降幅的 ' + Math.round(shareOf[biggest.key]) + '%',
      pct: steepest.lead + '降得最快，但只少了 ' + Math.abs(steepest.d).toFixed(1) + ' 千单'
    } : {
      total: 'Orders fell ' + Math.abs(totalPct).toFixed(1) + '% year on year',
      split: NUMBER_WORDS[falling] + ' ways of ordering fell, and ' + NUMBER_WORDS[segments.length - falling].toLowerCase() + ' grew',
      abs: biggest.lead + ' explain ' + Math.round(shareOf[biggest.key]) + '% of the ' + Math.abs(totalD).toFixed(1) + 'k drop',
      pct: steepest.lead + ' fell fastest, but by only ' + Math.abs(steepest.d).toFixed(1) + 'k'
    };

    // Channel chart: pieces arrive with scroll, rows slide to their new rank, the variance bars rescale
    var CH = { top: 34, row: 60, barScale: 200 / 48, axis: 372, absScale: 13, pctScale: 2, right: 440 };
    var STEP = { total: 3, split: 6, abs: 7, pct: 8 };
    var chart = $('story-chart');
    var chartTitle = $('ch-title');
    var varianceHead;
    var rowEls = {};
    (function buildStoryChart() {
      var t = STEP.total;
      var scale = 340 / totalLast;
      var nowW = totalNow * scale;
      var lastW = totalLast * scale;
      chart.appendChild(piece(svgEl('text', { class: 't-label', x: 0, y: 54 }, say('All channels', '全部渠道')), t + 0.04, t + 1));
      chart.appendChild(piece(svgEl('text', { class: 't-last', x: lastW, y: 54, 'text-anchor': 'end' }, say('October 2025: ', '2025 年 10 月：') + totalLast.toFixed(1)), t + 0.08, t + 1));
      chart.appendChild(piece(svgEl('rect', { class: 'bar-last', x: 0.75, y: 66.75, width: lastW - 1.5, height: 26 }), t + 0.08, t + 1));
      chart.appendChild(piece(svgEl('rect', { class: 'bar-this', x: 0, y: 76, width: nowW, height: 26 }), t + 0.14, t + 1));
      chart.appendChild(piece(svgEl('text', { class: 't-value', x: lastW + 8, y: 96 }, totalNow.toFixed(1)), t + 0.18, t + 1));
      chart.appendChild(piece(svgEl('rect', { x: nowW, y: 112, width: lastW - nowW, height: 14, fill: 'var(--bad)' }), t + 0.24, t + 1));
      chart.appendChild(piece(svgEl('line', { class: 'axis', x1: lastW, y1: 108, x2: lastW, y2: 130 }), t + 0.24, t + 1));
      chart.appendChild(piece(svgEl('text', { class: 't-delta', x: lastW, y: 152, 'text-anchor': 'end' }, fmt(totalD, 1) + say('k, ', ' 千单，') + percentLabel(totalPct)), t + 0.3, t + 1));
      chart.appendChild(piece(svgEl('text', { class: 't-note', x: 0, y: 196 }, say('The red gap is what was lost since last year.', '红色部分是比去年少掉的订单。')), t + 0.38, t + 1));

      var s0 = STEP.split;
      chart.appendChild(piece(svgEl('text', { x: 0, y: 14, class: 'ch-colhead' }, say('Oct 2026 vs Oct 2025, thousands', '2026 年 10 月对比 2025 年 10 月，千单')), s0));
      varianceHead = piece(svgEl('text', { x: CH.axis, y: 14, 'text-anchor': 'middle', class: 'ch-colhead' }, say('Change, thousands', '变化，千单')), s0);
      chart.appendChild(varianceHead);
      segments.forEach(function (s, i) {
        var g = piece(svgEl('g', { class: 'vrow' }), s0 + 0.05 + i * 0.06);
        g.appendChild(svgEl('text', { class: 'rlabel', x: 0, y: 18 }, s.name));
        var note = svgEl('text', { class: 'rnote', x: CH.right, y: 18, 'text-anchor': 'end' }, '');
        g.appendChild(note);
        // Last year outlined behind this year, offset across the bar only; the stroke inset lines the outline's outer edge up with the solid bar
        g.appendChild(svgEl('rect', { class: 'bar-last', x: 0.75, y: 25.75, width: s.last * CH.barScale - 1.5, height: 14 }));
        g.appendChild(svgEl('rect', { class: 'bar-this', x: 0, y: 31, width: s.now * CH.barScale, height: 15 }));
        g.appendChild(svgEl('text', { class: 'rval', x: Math.max(s.now, s.last) * CH.barScale + 6, y: 44 }, s.now.toFixed(1)));
        var bar = svgEl('rect', { class: 'vbar', x: CH.axis, y: 28, width: 1, height: 16, fill: varianceColor(s.d) });
        var label = svgEl('text', { class: 'vlabel', x: 0, y: 40 }, '');
        g.appendChild(bar);
        g.appendChild(label);
        chart.appendChild(g);
        rowEls[s.key] = { g: g, note: note, bar: bar, label: label };
      });
      chart.appendChild(piece(svgEl('line', { class: 'axis', x1: CH.axis, y1: 24, x2: CH.axis, y2: CH.top + segments.length * CH.row - 6 }), s0));
      // The focus row always ranks first, so the loop sits on the first row's note
      var ring = loopPath(252, CH.top + 1, 452, CH.top + 25);
      chart.appendChild(piece(svgEl('path', { class: 'chart-ring draw', pathLength: 1, d: ring }), STEP.abs + 0.12, STEP.abs + 1));
      chart.appendChild(piece(svgEl('path', { class: 'chart-ring draw', pathLength: 1, d: ring }), STEP.pct + 0.12, STEP.pct + 1));
    })();

    function layoutChart(state) {
      chartTitle.textContent = chartTitles[state] || chartTitles.split;
      if (state === 'total') return;
      var order = orders[state] || orders.split;
      var usePct = state === 'pct';
      var focusKey = state === 'abs' ? biggest.key : usePct ? steepest.key : null;
      varianceHead.textContent = usePct ? say('Change, %', '变化，%') : say('Change, thousands', '变化，千单');
      order.forEach(function (s, i) {
        var el = rowEls[s.key];
        var width = usePct ? s.pct * CH.pctScale : s.d * CH.absScale;
        var labelX = width < 0 ? CH.axis + width - 6 : CH.axis + width + 6;
        el.g.style.transform = 'translate(0px, ' + (CH.top + i * CH.row) + 'px)';
        el.g.classList.toggle('is-dim', focusKey !== null && s.key !== focusKey);
        el.bar.style.transform = 'scaleX(' + width.toFixed(2) + ')';
        el.label.setAttribute('text-anchor', width < 0 ? 'end' : 'start');
        el.label.style.transform = 'translate(' + labelX.toFixed(2) + 'px, 0px)';
        el.label.textContent = usePct ? percentLabel(s.pct) : fmt(s.d, 1);
        var note = '';
        if (s.key === focusKey) note = usePct ? say('steepest, but only ' + Math.abs(s.d).toFixed(1) + 'k', '降幅最大，但只少 ' + Math.abs(s.d).toFixed(1) + ' 千')
          : say(Math.round(shareOf[s.key]) + '% of the net drop', '占净降幅的 ' + Math.round(shareOf[s.key]) + '%');
        el.note.textContent = note;
      });
    }
    layoutChart('split');

    // Review slide: ranked by the size of the change
    (function drawSlideChart() {
      var svg = $('slide-chart');
      var L = { top: 4, row: 29, axis: 250, scale: 18 };
      orders.abs.forEach(function (s, i) {
        var y = L.top + i * L.row;
        var w = s.d * L.scale;
        var g = piece(svgEl('g', {}), 11.14 + i * 0.05);
        g.appendChild(svgEl('text', { class: 'slabel', x: 0, y: y + 18 }, s.name));
        g.appendChild(svgEl('rect', { x: w < 0 ? L.axis + w : L.axis, y: y + 6, width: Math.abs(w), height: 14, fill: varianceColor(s.d) }));
        g.appendChild(svgEl('text', { class: 'sval', x: w < 0 ? L.axis + w - 5 : L.axis + w + 5, y: y + 18, 'text-anchor': w < 0 ? 'end' : 'start' }, fmt(s.d, 1)));
        svg.appendChild(g);
      });
      svg.appendChild(piece(svgEl('line', { class: 'axis', x1: L.axis, y1: 0, x2: L.axis, y2: L.top + segments.length * L.row }), 11.14));
      svg.appendChild(piece(svgEl('path', { class: 'slide-ring draw', pathLength: 1, d: loopPath(-6, L.top - 1, 130, L.top + L.row - 3) }), 11.42));
      $('slide-title').textContent = say(biggest.lead + ' explain ' + Math.round(shareOf[biggest.key]) + '% of a ' + Math.abs(totalD).toFixed(1) + 'k drop in orders',
        '订单减少 ' + Math.abs(totalD).toFixed(1) + ' 千单，其中 ' + Math.round(shareOf[biggest.key]) + '% 来自' + biggest.lead);
    })();

    // Raw output for the side panel, from the same data
    (function renderRawOutput() {
      var table = $('raw-output');
      if (!table) return;
      var head = htmlEl('thead');
      var body = htmlEl('tbody');
      function appendRow(parent, cells, tag) {
        var tr = htmlEl('tr');
        cells.forEach(function (c) { tr.appendChild(htmlEl(tag, tag === 'th' ? { scope: 'col' } : {}, c)); });
        parent.appendChild(tr);
      }
      appendRow(head, ['order_channel', 'last_year', 'this_year', 'change', 'change_pct'], 'th');
      orders.abs.forEach(function (s) {
        var last = Math.round(s.last * 1000);
        var now = Math.round(s.now * 1000);
        appendRow(body, [s.key, String(last), String(now), String(now - last), (Math.round((now - last) / last * 1000) / 10).toFixed(1)], 'td');
      });
      table.appendChild(head);
      table.appendChild(body);
      $('raw-meta').textContent = say(orders.abs.length + ' rows returned', '返回 ' + orders.abs.length + ' 行');
    })();

    // SQL highlighting; the story's snippet types itself in, line by line
    highlightSql($('sql-code'));
    highlightSql($('scene-sql')).forEach(function (line, i) { piece(line, 5.36 + i * 0.035); });

    // Scroll story: the step under the trigger line sets the scene; how far into it you are reveals its pieces
    var stage = $('stage');
    var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
    var narrow = window.matchMedia('(max-width: 899px)');
    var railLinks = Array.prototype.slice.call(document.querySelectorAll('#rail a'));
    var waysSection = $('ways');
    var pieces = Array.prototype.map.call(stage.querySelectorAll('[data-at]'), function (node) {
      var until = node.getAttribute('data-until');
      return { node: node, at: parseFloat(node.getAttribute('data-at')), until: until === null ? Infinity : parseFloat(until), shown: false };
    });
    var activeStep = null;
    var activeStage = -1;

    var TRIGGER = 0.6;
    // Drawings finish in the first part of each step, so the picture is complete while its text is still in view
    var BUILD_SPEED = 4;
    var started = false;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Position in the story: the step whose top has passed the trigger line, plus how far into that step you are.
    // On phones the text box is fixed to the screen, so the story stops once its section scrolls away.
    function storyPosition() {
      var line = window.innerHeight * TRIGGER;
      if (narrow.matches && scrolly.getBoundingClientRect().bottom < window.innerHeight) return -1;
      var index = -1;
      steps.forEach(function (step, i) { if (step.getBoundingClientRect().top < line) index = i; });
      if (index === -1) return -1;
      var top = steps[index].getBoundingClientRect().top;
      var end = index + 1 < steps.length ? steps[index + 1].getBoundingClientRect().top : steps[index].getBoundingClientRect().bottom;
      return index + clamp((line - top) / Math.max(1, end - top) * BUILD_SPEED, 0, 0.999);
    }

    // Text box progress and Back/Next. Each button scrolls to the point where that step's drawing is complete,
    // so tapping and scrolling stay one system.
    function scrollToStep(i) {
      var behavior = reduceMotion.matches ? 'auto' : 'smooth';
      if (i >= steps.length) { waysSection.scrollIntoView({ behavior: behavior, block: 'start' }); return; }
      var top = steps[i].getBoundingClientRect().top + window.scrollY;
      var end = i + 1 < steps.length ? steps[i + 1].getBoundingClientRect().top + window.scrollY : top + steps[i].offsetHeight;
      window.scrollTo({ top: top + (end - top) * (0.7 / BUILD_SPEED) - window.innerHeight * TRIGGER, behavior: behavior });
    }
    steps.forEach(function (step, i) {
      var card = step.querySelector('.step-card');
      var bar = htmlEl('span', { class: 'card-progress', 'aria-hidden': 'true' });
      var fill = htmlEl('i');
      fill.style.width = ((i + 1) / steps.length * 100).toFixed(1) + '%';
      bar.appendChild(fill);
      card.insertBefore(bar, card.firstChild);
      var nav = htmlEl('div', { class: 'card-nav' });
      var back = htmlEl('button', { type: 'button', class: 'card-btn' }, say('Back', '上一步'));
      back.disabled = i === 0;
      back.addEventListener('click', function () { scrollToStep(i - 1); });
      var next = htmlEl('button', { type: 'button', class: 'card-btn' }, i === steps.length - 1 ? say('Finish', '完成') : say('Next', '下一步'));
      next.addEventListener('click', function () { scrollToStep(i + 1); });
      nav.appendChild(back);
      nav.appendChild(htmlEl('span', { class: 'card-count' }, say('Step ' + (i + 1) + ' of ' + steps.length, '第 ' + (i + 1) + ' 步，共 ' + steps.length + ' 步')));
      nav.appendChild(next);
      card.appendChild(nav);
    });

    // Phones: split the screen between the drawing and the text box by measuring this phone (its screen height,
    // browser bars and font-size setting), so every step's text fits the box and every drawing fits above it.
    // It re-measures only when the width, screen height or text size changes, never as the browser bar hides,
    // so the drawing doesn't jump while scrolling.
    (function fitPhoneLayout() {
      var root = document.documentElement;
      var cards = steps.map(function (step) { return step.querySelector('.step-card'); });
      var scenes = Array.prototype.slice.call(stage.querySelectorAll('.scene'));
      var scenesBox = stage.querySelector('.scenes');
      var shortScreen = window.matchMedia('(max-height: 780px)');
      // 100svh is the screen height with the browser bar showing; it stays put while the bar hides and shows
      var screenProbe = htmlEl('div', { 'aria-hidden': 'true' });
      screenProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
      // Its width follows the phone's text size, including font-size settings in Android and WeChat
      var textProbe = htmlEl('span', { 'aria-hidden': 'true' }, say('Monthly orders by channel', '各渠道每月订单量'));
      textProbe.style.cssText = 'position:absolute;top:0;left:0;white-space:nowrap;visibility:hidden;pointer-events:none';
      document.body.appendChild(screenProbe);
      document.body.appendChild(textProbe);
      var DRAWING_SHARE = { min: 0.36, max: 0.52 };
      var MIN_SCENE_SCALE = 0.6;
      var lastKey = '';

      function tallestCardHeight() {
        cards.forEach(function (card) { card.style.top = 'auto'; });
        var tallest = Math.max.apply(null, cards.map(function (card) { return card.offsetHeight; }));
        cards.forEach(function (card) { card.style.top = ''; });
        return tallest;
      }
      // Each drawing keeps its natural size, or shrinks just enough to fit the space it has
      function contentBottom(scene) {
        var sceneTop = scene.getBoundingClientRect().top;
        var bottom = 0;
        each(scene.children, function (child) {
          var end = child instanceof HTMLElement ? child.offsetTop + child.offsetHeight : child.getBoundingClientRect().bottom - sceneTop;
          bottom = Math.max(bottom, end);
        });
        return bottom;
      }
      // A visual scale, not a re-layout: the drawing keeps its own arrangement and shrinks from the top centre
      function scaleScene(scene, scale) {
        scene.style.transform = scale < 1 ? 'scale(' + scale.toFixed(3) + ')' : '';
        scene.style.transformOrigin = scale < 1 ? '50% 0' : '';
      }
      function fitScenes() {
        var room = scenesBox.clientHeight;
        scenes.forEach(function (scene) { scaleScene(scene, 1); });
        scenes.forEach(function (scene) {
          var needed = contentBottom(scene);
          if (needed > room + 1) scaleScene(scene, Math.max(MIN_SCENE_SCALE, room / needed));
        });
      }
      function fit() {
        if (!narrow.matches) {
          root.style.removeProperty('--stage-h');
          scenes.forEach(function (scene) { scaleScene(scene, 1); });
          lastKey = '';
          return;
        }
        var screenHeight = screenProbe.offsetHeight || window.innerHeight;
        var key = [window.innerWidth, screenHeight, textProbe.offsetWidth, shortScreen.matches].join('|');
        if (key === lastKey) return;
        lastKey = key;
        root.style.removeProperty('--stage-h');
        var gap = parseFloat(getComputedStyle(root).getPropertyValue('--box-gap')) || 8;
        var top = parseFloat(getComputedStyle(stage.parentNode).paddingTop) || 12;
        var bottom = parseFloat(getComputedStyle(cards[0]).bottom) || 12;
        var room = screenHeight - top - gap - bottom - tallestCardHeight() - 2;
        var stageHeight = clamp(room, screenHeight * DRAWING_SHARE.min, screenHeight * DRAWING_SHARE.max);
        root.style.setProperty('--stage-h', Math.floor(stageHeight) + 'px');
        fitScenes();
      }

      var fitQueued = false;
      function queueFit() {
        if (fitQueued) return;
        fitQueued = true;
        window.requestAnimationFrame(function () { fitQueued = false; fit(); });
      }
      fit();
      window.addEventListener('resize', queueFit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lastKey = ''; fit(); });
    })();

    // Scroll cues: shown until the first step starts, then gone for the rest of the visit
    function updateCues(position) {
      if (!started && position >= 0) {
        started = true;
        document.documentElement.classList.add('story-started');
      }
      var rect = scrolly.getBoundingClientRect();
      scrolly.classList.toggle('in-view', !started && rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight);
    }
    // Stage -2 is before the story starts, -1 the café example; 0 to 3 are plan, do, check and act;
    // 4 means the loop has come back round to plan
    function updateLoop(stageIndex) {
      each(loopItems, function (li, i) {
        var done = stageIndex === 4 || (stageIndex >= 0 && i < stageIndex);
        var current = stageIndex === 4 ? i === 0 : i === stageIndex;
        li.className = current ? 'current' : done ? 'done' : '';
      });
      var name;
      var purpose;
      if (stageIndex === -2) { name = say('Plan, do, check, act', '计划、执行、检查、改进'); purpose = say('one example, step by step', '用一个例子逐步走一遍'); }
      else if (stageIndex === -1) { name = say('The example', '示例'); purpose = say('a café chain and its monthly orders', '一家连锁咖啡店的每月订单'); }
      else if (stageIndex === 4) { name = say('Back to plan', '回到计划'); purpose = say('the result feeds the next plan', '结果进入下一轮计划'); }
      else { name = LOOP_NAMES[stageIndex]; purpose = LOOP_PURPOSE[stageIndex]; }
      $('loop-name').textContent = name;
      $('loop-desc').textContent = say(': ', '：') + purpose;
    }
    function updateRail() {
      var current = activeStep ? (activeStage === 4 ? 3 : activeStage) : -2;
      if (waysSection.getBoundingClientRect().top < window.innerHeight * 0.5) current = 5;
      railLinks.forEach(function (a) { a.classList.toggle('is-current', current !== null && Number(a.getAttribute('data-rail')) === current); });
    }
    function activate(step) {
      if (step === activeStep) return;
      if (activeStep) activeStep.classList.remove('is-active');
      activeStep = step;
      if (!step) {
        stage.setAttribute('data-scene', 'none');
        stage.setAttribute('data-state', 'none');
        return;
      }
      step.classList.add('is-active');
      var scene = step.getAttribute('data-scene');
      var state = step.getAttribute('data-state');
      stage.setAttribute('data-scene', scene);
      stage.setAttribute('data-state', state);
      activeStage = Number(step.getAttribute('data-stage'));
      updateLoop(activeStage);
      if (scene === 'chart') layoutChart(state);
    }
    function reveal(position) {
      pieces.forEach(function (p) {
        var show = position >= p.at && position < p.until;
        if (show === p.shown) return;
        p.shown = show;
        p.node.classList.toggle('is-shown', show);
      });
    }
    updateLoop(-2);
    scrollHandlers.push(function updateStory() {
      var position = storyPosition();
      activate(position < 0 ? null : steps[Math.floor(position)]);
      reveal(position);
      updateRail();
      updateCues(position);
    });
  })();

  // ---- SQL highlighting
  function highlightSql(code) {
    if (!code) return [];
    var KEYWORDS = ['WITH', 'AS', 'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'IN', 'GROUP', 'BY', 'ORDER', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'TRUE', 'FALSE', 'NOT', 'NULL', 'DISTINCT', 'ASC', 'DESC'];
    var FUNCTIONS = ['COUNT', 'SUM', 'ROUND', 'NULLIF', 'MAX', 'MIN', 'AVG'];
    var TOKEN = /(--.*$)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_.]*)|(\s+|.)/g;
    function tokenClass(match) {
      if (match[1]) return 'tok-c';
      if (match[2]) return 'tok-s';
      if (match[3]) return 'tok-n';
      if (match[4]) {
        var word = match[4].toUpperCase();
        if (KEYWORDS.indexOf(word) >= 0) return 'tok-k';
        if (FUNCTIONS.indexOf(word) >= 0) return 'tok-f';
      }
      return '';
    }
    var source = code.textContent.replace(/^\n/, '').replace(/\s+$/, '');
    var lines = [];
    code.textContent = '';
    source.split('\n').forEach(function (line) {
      var lineEl = htmlEl('span', { class: 'line' });
      var match;
      TOKEN.lastIndex = 0;
      while ((match = TOKEN.exec(line)) !== null) {
        var cls = tokenClass(match);
        lineEl.appendChild(cls ? htmlEl('span', { class: cls }, match[0]) : document.createTextNode(match[0]));
      }
      code.appendChild(lineEl);
      lines.push(lineEl);
    });
    return lines;
  }

  // ---- Using AI: the line fills with scroll, and each step draws in once the line reaches it
  (function aiPipeline() {
    var pipeline = $('pipeline');
    if (!pipeline) return;
    scrollHandlers.push(function updatePipeline() {
      var rect = pipeline.getBoundingClientRect();
      var progress = clamp((window.innerHeight * 0.6 - rect.top) / rect.height, 0, 1);
      var reach = progress * rect.height;
      pipeline.style.setProperty('--progress', progress.toFixed(4));
      each(pipeline.children, function (li) { li.classList.toggle('reached', li.offsetTop + 24 <= reach + 1); });
    });
  })();

  // ---- Side panels: opened from where the detail is relevant; Esc, the close button or the backdrop closes them
  each(document.querySelectorAll('[data-open]'), function (button) {
    var drawer = $(button.getAttribute('data-open'));
    if (!drawer) return;
    button.addEventListener('click', function () { drawer.showModal(); });
  });
  each(document.querySelectorAll('dialog.drawer'), function (drawer) {
    drawer.addEventListener('click', function (e) { if (e.target === drawer) drawer.close(); });
    each(drawer.querySelectorAll('[data-close]'), function (button) { button.addEventListener('click', function () { drawer.close(); }); });
  });

  // ---- Tabs
  function initTabs(tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(tabs[next], true);
      });
    });
  }
  each(document.querySelectorAll('[role="tablist"]'), initTabs);

  // ---- Template copy: the text is built from the template shown on the page, so the two never drift
  (function templateCopy() {
    var button = $('copy-template');
    if (!button) return;
    var status = $('copy-status');
    var fallback = $('copy-fallback');
    function templateText() {
      var lines = [];
      each(document.querySelectorAll('#tpl > div'), function (row) {
        var name = row.querySelector('dt').textContent.trim();
        var guide = row.querySelector('dd').textContent.trim().match(/^[^.?。？]*[.?。？]?/)[0].replace(/[.。]$/, '');
        lines.push(name + say(': [', '：[') + guide + ']');
      });
      return lines.join('\n');
    }
    button.addEventListener('click', function () {
      var text = templateText();
      var copied = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error('Clipboard unavailable'));
      copied.then(function () {
        fallback.hidden = true;
        status.textContent = say('Copied.', '已复制。');
      }, function () {
        fallback.value = text;
        fallback.hidden = false;
        fallback.focus();
        fallback.select();
        status.textContent = say('Copy is blocked here. The text is selected below; press Ctrl+C.', '这里无法直接复制。下面的文字已选中，请按 Ctrl+C。');
      });
    });
  })();

  // ---- Using AI chapters: the "In this chapter" list marks the section being read,
  // which is the last heading that has passed the top third of the screen
  (function chapterContents() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.guide-sections a[href^="#"]'));
    var sections = links.map(function (link) {
      return { link: link, heading: document.getElementById(link.getAttribute('href').slice(1)) };
    }).filter(function (section) { return section.heading; });
    if (!sections.length) return;
    var READING_LINE = 1 / 3;
    var contents = $('guide-contents');
    var toContents = $('to-contents');
    scrollHandlers.push(function markCurrentSection() {
      var line = window.innerHeight * READING_LINE;
      var current = null;
      sections.forEach(function (section) { if (section.heading.getBoundingClientRect().top < line) current = section; });
      sections.forEach(function (section) { section.link.classList.toggle('is-current', section === current); });
      // Phones: offer the way back to the contents once they have scrolled out of view
      if (contents && toContents) toContents.classList.toggle('is-shown', contents.getBoundingClientRect().bottom < 0);
    });
  })();

  // ---- Check the work: the margin example. Moving revenue changes total profit ÷ total revenue,
  // while the simple average of the two margins never moves.
  (function marginCalculator() {
    var revenueA = $('rev-a');
    var revenueB = $('rev-b');
    if (!revenueA || !revenueB) return;
    var MARGIN_A = 0.10;
    var MARGIN_B = 0.30;
    var BAR_FULL = 0.30; // the highest possible answer fills its bar

    function money(amount) { return 'RM' + Math.round(amount).toLocaleString('en-GB'); }
    function tidy(number) { return Math.abs(number - Math.round(number)) < 0.05 ? String(Math.round(number)) : number.toFixed(1); }
    function percent(share) { return tidy(share * 100) + '%'; }
    function barWidth(share) { return (share / BAR_FULL * 100).toFixed(1) + '%'; }

    function describe(simple, weighted, profit, revenue) {
      if (weighted === null) return say('With no revenue at all, there is no margin to compare.', '没有收入，就没有利润率可比。');
      var gap = Math.abs(weighted - simple) * 100;
      var totals = say('Total profit is ' + money(profit) + ' on ' + money(revenue) + ' of revenue. ',
        '总收入 ' + money(revenue) + '，总利润 ' + money(profit) + '。');
      if (gap < 0.05) return totals + say('Both products sell the same amount, so the two answers agree.', '两种产品卖得一样多，所以两个答案相同。');
      return totals + say('The two answers differ by ' + tidy(gap) + ' percentage points.', '两个答案相差 ' + tidy(gap) + ' 个百分点。');
    }
    function update() {
      var a = Number(revenueA.value);
      var b = Number(revenueB.value);
      var profit = a * MARGIN_A + b * MARGIN_B;
      var simple = (MARGIN_A + MARGIN_B) / 2;
      var weighted = a + b > 0 ? profit / (a + b) : null;
      $('rev-a-out').textContent = money(a);
      $('rev-b-out').textContent = money(b);
      $('m-simple').textContent = percent(simple);
      $('bar-simple').style.width = barWidth(simple);
      $('m-weighted').textContent = weighted === null ? say('n/a', '无') : percent(weighted);
      $('bar-weighted').style.width = weighted === null ? '0%' : barWidth(weighted);
      $('calc-note').textContent = describe(simple, weighted, profit, a + b);
    }
    revenueA.addEventListener('input', update);
    revenueB.addEventListener('input', update);
    update();
  })();

  // ---- Judge whether it's worth it: three ways to get the same monthly work done, as fee plus the value of your time
  (function costCalculator() {
    var hoursInput = $('ai-hours');
    var rateInput = $('hour-value');
    if (!hoursInput || !rateInput) return;
    var DIY_HOURS = 12;
    var AI_FEE = 100;
    var HIRE_FEE = 400;
    var HIRE_HOURS = 1;
    var NAMES = say({ diy: 'Doing it yourself', ai: 'AI-assisted work', hire: 'Hiring a person' }, { diy: '自己做', ai: '用 AI 协助', hire: '请人做' });

    function money(amount) { return 'RM' + Math.round(amount).toLocaleString('en-GB'); }
    function tidy(number) { return Math.abs(number - Math.round(number)) < 0.05 ? String(Math.round(number)) : number.toFixed(1); }
    function update() {
      var hours = Number(hoursInput.value);
      var rate = Number(rateInput.value);
      var costs = { diy: DIY_HOURS * rate, ai: AI_FEE + hours * rate, hire: HIRE_FEE + HIRE_HOURS * rate };
      var highest = Math.max(costs.diy, costs.ai, costs.hire);
      var cheapest = 'diy';
      Object.keys(costs).forEach(function (key) {
        $('cost-' + key).textContent = money(costs[key]);
        $('bar-' + key).style.width = (costs[key] / highest * 100).toFixed(1) + '%';
        if (costs[key] < costs[cheapest]) cheapest = key;
      });
      $('ai-hours-out').textContent = say(hours + (hours === 1 ? ' hour' : ' hours'), hours + ' 小时');
      $('hour-value-out').textContent = money(rate);
      $('cost-note').textContent = say(NAMES[cheapest] + ' costs least here. At ' + money(rate) + ' an hour, the ' + money(AI_FEE) +
        ' subscription pays for itself only if AI saves you more than ' + tidy(AI_FEE / rate) + ' hours a month.',
        '这里最省钱的是' + NAMES[cheapest] + '。按每小时 ' + money(rate) + ' 算，AI 每月要帮你省下 ' + tidy(AI_FEE / rate) +
        ' 小时以上，' + money(AI_FEE) + ' 的订阅费才回本。');
    }
    hoursInput.addEventListener('input', update);
    rateInput.addEventListener('input', update);
    update();
  })();

  // ---- Check your understanding: tap an answer to see whether it's the best one, and why.
  // Without the script, the answers and the explanation simply show as text.
  (function quizzes() {
    each(document.querySelectorAll('.quiz'), function (quiz) {
      var answer = quiz.getAttribute('data-answer');
      var options = quiz.querySelectorAll('.quiz-option');
      var result = quiz.querySelector('.quiz-result');
      quiz.classList.add('is-ready');
      each(options, function (option) {
        option.setAttribute('aria-pressed', 'false');
        option.addEventListener('click', function () {
          var right = option.getAttribute('data-option') === answer;
          each(options, function (other) {
            other.classList.toggle('is-right', other.getAttribute('data-option') === answer);
            other.classList.toggle('is-wrong', other === option && !right);
            other.setAttribute('aria-pressed', other === option ? 'true' : 'false');
          });
          result.textContent = right ? say('Right.', '答对了。') : say('Not quite. The best answer is marked with a tick.', '不太对。最佳答案已打勾。');
          quiz.classList.add('is-answered');
        });
      });
    });
  })();

  // ---- One scroll listener for every part that follows the reader
  if (scrollHandlers.length) {
    var frameQueued = false;
    var onScroll = function () {
      if (frameQueued) return;
      frameQueued = true;
      window.requestAnimationFrame(function () {
        frameQueued = false;
        scrollHandlers.forEach(function (handler) { handler(); });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }
})();
