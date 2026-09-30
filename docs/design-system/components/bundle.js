/* @ds-bundle: {"format":4,"namespace":"BrewPoint","components":[{"name":"Button"},{"name":"Field"},{"name":"ProductTile"},{"name":"CartLine"},{"name":"Numpad"},{"name":"StatusChip"},{"name":"Banner"},{"name":"PinPrompt"},{"name":"DataTable"},{"name":"PermissionMatrix"},{"name":"Receipt"},{"name":"AccentPicker"},{"name":"Navigation"},{"name":"StatTile"},{"name":"Chart"},{"name":"NotificationCenter"},{"name":"ReportView"},{"name":"Dashboard"},{"name":"AlertsScreen"},{"name":"TransactionsScreen"},{"name":"RegisterSessionsScreen"},{"name":"ProductsScreen"},{"name":"InventoryScreen"},{"name":"ExpiryScreen"},{"name":"UsersScreen"},{"name":"DevicesScreen"},{"name":"AuditLogScreen"},{"name":"SubscriptionScreen"},{"name":"SettingsScreen"},{"name":"PurchaseOrdersScreen"},{"name":"PurchaseOrderEditScreen"},{"name":"ReceiveDeliveryScreen"},{"name":"SuppliersScreen"},{"name":"ConsoleOverviewScreen"},{"name":"ConsoleShopsScreen"},{"name":"ConsoleShopDetailScreen"},{"name":"ConsoleSupportAccessScreen"},{"name":"ConsoleTicketsScreen"},{"name":"ConsoleBillingScreen"},{"name":"ConsolePlansScreen"},{"name":"ConsoleFlagsScreen"},{"name":"ConsoleReleasesScreen"},{"name":"ConsoleAnnouncementsScreen"},{"name":"ConsoleDataRequestsScreen"},{"name":"ConsoleAuditScreen"},{"name":"ConsoleStaffScreen"}]} */
(function () {
  var INK = '#2B1D14';
  var WHITE = '#FFFFFF';
  var GROUND = { light: '#FFFCF8', dark: '#251B15' };

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('').toUpperCase();
  }
  function lin(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance(hex) {
    var c = hexToRgb(hex);
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  }
  function contrast(a, b) {
    var x = luminance(a);
    var y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h = 0;
    var s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0;
    var g = 0;
    var b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }
  function hsl(hex) {
    var c = hexToRgb(hex);
    return rgbToHsl(c[0], c[1], c[2]);
  }
  function shade(hex, dl) {
    var v = hsl(hex);
    return hslToHex(v[0], v[1], Math.max(0, Math.min(1, v[2] + dl)));
  }
  function bestOn(hex) {
    return contrast(INK, hex) >= contrast(WHITE, hex) ? INK : WHITE;
  }
  // Moves an accent's lightness away from its text color until the pair reaches 4.5:1.
  function fixOn(hex) {
    var on = bestOn(hex);
    var dir = on === INK ? 0.01 : -0.01;
    var out = hex;
    for (var i = 0; i < 60 && contrast(on, out) < 4.5; i++) out = shade(out, dir);
    return out;
  }
  function keepOn(base, dl, on) {
    for (var k = 1; k >= 0; k -= 0.25) {
      var cand = shade(base, dl * k);
      if (contrast(on, cand) >= 4.5) return cand;
    }
    return base;
  }

  // A shop picks one hex. Returns every accent token, each pair at 4.5:1 or better in the given theme.
  function deriveAccent(hex, theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    var accent = fixOn(String(hex).toUpperCase());
    if (theme === 'dark') {
      for (var j = 0; j < 60 && contrast(accent, GROUND.dark) < 3; j++) accent = shade(accent, 0.01);
      accent = fixOn(accent);
    }
    var on = bestOn(accent);
    var dir = theme === 'dark' ? 0.06 : -0.06;
    var v = hsl(accent);
    var soft = hslToHex(v[0], Math.min(v[1], 0.7), theme === 'dark' ? 0.16 : 0.87);
    var strong = accent;
    var step = theme === 'dark' ? 0.01 : -0.01;
    for (var i = 0; i < 90; i++) {
      if (contrast(strong, GROUND[theme]) >= 4.5 && contrast(strong, soft) >= 4.5) break;
      strong = shade(strong, step);
    }
    return {
      accent: accent,
      accentHover: keepOn(accent, dir, on),
      accentPressed: keepOn(accent, dir * 2, on),
      onAccent: on,
      accentSoft: soft,
      accentStrong: strong
    };
  }

  function applyAccent(el, hex, theme) {
    var a = deriveAccent(hex, theme);
    var s = el.style;
    s.setProperty('--accent', a.accent);
    s.setProperty('--accent-hover', a.accentHover);
    s.setProperty('--accent-pressed', a.accentPressed);
    s.setProperty('--on-accent', a.onAccent);
    s.setProperty('--accent-soft', a.accentSoft);
    s.setProperty('--accent-strong', a.accentStrong);
    return a;
  }

  // Money is integer centavos everywhere; this is the only place it becomes text.
  function formatPeso(centavos) {
    var n = Math.round(centavos);
    var sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    var whole = Math.floor(n / 100);
    var frac = n % 100;
    var grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + '₱' + grouped + '.' + (frac < 10 ? '0' + frac : frac);
  }


  // Compact peso for chart axes only: 1250000 centavos becomes "₱12.5k".
  function formatPesoShort(centavos) {
    var p = Math.round(centavos) / 100;
    var a = Math.abs(p);
    var sign = p < 0 ? '-' : '';
    if (a >= 1000000) return sign + '₱' + trim(a / 1000000) + 'M';
    if (a >= 1000) return sign + '₱' + trim(a / 1000) + 'k';
    return sign + '₱' + Math.round(a);
  }
  function trim(n) { return (Math.round(n * 10) / 10).toString(); }

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var f = v / p;
    var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10], n = 10;
    for (var q = 0; q < steps.length; q++) if (f <= steps[q]) { n = steps[q]; break; }
    return n * p;
  }
  function fmt(v, kind) {
    if (kind === 'peso') return formatPeso(v);
    if (kind === 'pct') return trim(v) + '%';
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function fmtAxis(v, kind) {
    if (kind === 'peso') return formatPesoShort(v);
    if (kind === 'pct') return trim(v) + '%';
    return v >= 1000 ? trim(v / 1000) + 'k' : String(v);
  }
  // A bar with 4px rounded ends anchored to the baseline: square at the base, round at the value end.
  function barPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function hbarPath(x, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    if (w <= 0) return '';
    return 'M' + x + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) +
      'V' + (y + h - r) + 'Q' + (x + w) + ',' + (y + h) + ' ' + (x + w - r) + ',' + (y + h) + 'H' + x + 'Z';
  }
  function swatch(color, dashed) {
    return '<span class="bp-legend__key' + (dashed ? ' is-dashed' : '') + '" style="--key:var(--' + color + ')"></span>';
  }

  // Renders a bar, line or horizontal-bar chart into el as SVG with a hover tooltip.
  // spec: {type:'bar'|'line'|'hbar', labels:[...], series:[{name, values:[...], color:'chart-1', compare:false}], format:'peso'|'count'|'pct', height}
  function chart(el, spec) {
    var type = spec.type || 'bar';
    var kind = spec.format || 'count';
    var series = spec.series || [];
    var labels = spec.labels || [];
    var W = Math.max(280, Math.round(el.clientWidth || spec.width || 560));
    var i, j, s, out = [];
    el.classList.add('bp-chart');
    var max = 0;
    for (i = 0; i < series.length; i++) for (j = 0; j < series[i].values.length; j++) max = Math.max(max, series[i].values[j]);

    if (type === 'hbar') {
      var rowH = 36, barH = 14, lw = spec.labelWidth || 140, vw = 96;
      var H = labels.length * rowH;
      var pw = W - lw - vw;
      var vals = series[0].values, col = series[0].color || 'chart-1';
      var m = niceMax(max);
      out.push('<svg class="bp-chart__svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="' + esc(spec.title || series[0].name) + '">');
      for (i = 0; i < labels.length; i++) {
        var y = i * rowH;
        var bw = Math.max(vals[i] > 0 ? 3 : 0, pw * vals[i] / m);
        out.push('<g class="bp-chart__hit" data-i="' + i + '">' +
          '<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="transparent"/>' +
          '<text class="bp-chart__label" x="0" y="' + (y + rowH / 2 + 5) + '">' + esc(labels[i]) + '</text>' +
          '<rect x="' + lw + '" y="' + (y + (rowH - barH) / 2) + '" width="' + pw + '" height="' + barH + '" rx="4" style="fill:var(--surface-sunken)"/>' +
          '<path d="' + hbarPath(lw, y + (rowH - barH) / 2, bw, barH, 4) + '" style="fill:var(--' + col + ')"/>' +
          '<text class="bp-chart__value" x="' + W + '" y="' + (y + rowH / 2 + 5) + '" text-anchor="end">' + esc(fmt(vals[i], kind)) + '</text></g>');
      }
      out.push('</svg>');
      el.innerHTML = out.join('');
      return el;
    }

    var Hh = spec.height || 220;
    var ml = 56, mr = type === 'line' ? 16 : 8, mt = 12, mb = 28;
    var pw2 = W - ml - mr, ph = Hh - mt - mb;
    var ymax = niceMax(max * 1.05);
    var n = labels.length;
    var band = pw2 / n;
    function Y(v) { return mt + ph - ph * v / ymax; }
    function X(k) { return ml + band * k + band / 2; }

    if (series.length > 1) {
      var lg = ['<div class="bp-legend">'];
      for (i = 0; i < series.length; i++) lg.push('<span class="bp-legend__item">' + swatch(series[i].compare ? 'chart-compare' : (series[i].color || ('chart-' + (i + 1))), series[i].compare) + esc(series[i].name) + '</span>');
      lg.push('</div>');
      out.push(lg.join(''));
    }
    out.push('<svg class="bp-chart__svg" viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" height="' + Hh + '" role="img" aria-label="' + esc(spec.title || '') + '">');
    for (i = 0; i <= 4; i++) {
      var gv = ymax * i / 4, gy = Y(gv);
      out.push('<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + gy + '" y2="' + gy + '" style="stroke:var(--chart-grid)" stroke-width="1"' + (i === 0 ? '' : ' stroke-dasharray="2 4"') + '/>');
      out.push('<text class="bp-chart__axis" x="' + (ml - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + esc(fmtAxis(gv, kind)) + '</text>');
    }
    var every = Math.max(1, Math.ceil(n / Math.floor(pw2 / 44)));
    for (i = 0; i < n; i++) if (i % every === 0) out.push('<text class="bp-chart__axis" x="' + X(i) + '" y="' + (Hh - 8) + '" text-anchor="middle">' + esc(labels[i]) + '</text>');

    if (type === 'bar') {
      var groups = series.length, inner = Math.min(40, band * 0.72), bw2 = (inner - 2 * (groups - 1)) / groups;
      for (j = 0; j < groups; j++) {
        s = series[j];
        for (i = 0; i < n; i++) {
          var bx = X(i) - inner / 2 + j * (bw2 + 2), by = Y(s.values[i]);
          var st = s.compare ? 'fill:var(--surface-raised);stroke:var(--chart-compare);stroke-width:2' : 'fill:var(--' + (s.color || 'chart-' + (j + 1)) + ')';
          out.push('<path class="bp-chart__mark" data-i="' + i + '" d="' + barPath(bx + (s.compare ? 1 : 0), by + (s.compare ? 1 : 0), bw2 - (s.compare ? 2 : 0), mt + ph - by - (s.compare ? 1 : 0), 4) + '" style="' + st + '"/>');
        }
      }
    } else {
      for (j = series.length - 1; j >= 0; j--) {
        s = series[j];
        var d = '';
        for (i = 0; i < n; i++) d += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(s.values[i]).toFixed(1);
        out.push('<path d="' + d + '" fill="none" style="stroke:var(--' + (s.compare ? 'chart-compare' : (s.color || 'chart-' + (j + 1))) + ')" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' + (s.compare ? ' stroke-dasharray="6 5"' : '') + '/>');
      }
      out.push('<line class="bp-chart__cross" x1="0" x2="0" y1="' + mt + '" y2="' + (mt + ph) + '" style="stroke:var(--ink-muted)" stroke-width="1"/>');
      for (j = 0; j < series.length; j++) {
        s = series[j];
        for (i = 0; i < n; i++) out.push('<circle class="bp-chart__dot" data-i="' + i + '" cx="' + X(i) + '" cy="' + Y(s.values[i]) + '" r="4" stroke-width="2" style="fill:var(--' + (s.compare ? 'chart-compare' : (s.color || 'chart-' + (j + 1))) + ');stroke:var(--surface-raised)"/>');
      }
    }
    for (i = 0; i < n; i++) out.push('<rect class="bp-chart__hit" data-i="' + i + '" x="' + (ml + band * i) + '" y="' + mt + '" width="' + band + '" height="' + ph + '" fill="transparent"/>');
    out.push('</svg><div class="bp-tip" role="tooltip" hidden></div>');
    el.innerHTML = out.join('');

    var tip = el.querySelector('.bp-tip');
    var cross = el.querySelector('.bp-chart__cross');
    var svg = el.querySelector('svg');
    function show(k, evt) {
      var rows = ['<div class="bp-tip__title">' + esc(labels[k]) + '</div>'];
      for (var q = 0; q < series.length; q++) {
        rows.push('<div class="bp-tip__row">' + swatch(series[q].compare ? 'chart-compare' : (series[q].color || 'chart-' + (q + 1)), series[q].compare) +
          '<span>' + esc(series[q].name) + '</span><b>' + esc(fmt(series[q].values[k], kind)) + '</b></div>');
      }
      tip.innerHTML = rows.join('');
      tip.hidden = false;
      var scale = svg.getBoundingClientRect().width / W;
      var left = X(k) * scale, top = svg.offsetTop + mt * scale;
      var tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(el.clientWidth - tw, left + 12 > el.clientWidth - tw ? left - tw - 12 : left + 12)) + 'px';
      tip.style.top = top + 'px';
      var marks = el.querySelectorAll('.bp-chart__mark, .bp-chart__dot');
      for (var z = 0; z < marks.length; z++) marks[z].classList.toggle('is-dim', type === 'bar' && marks[z].getAttribute('data-i') !== String(k));
      var dots = el.querySelectorAll('.bp-chart__dot');
      for (z = 0; z < dots.length; z++) dots[z].classList.toggle('is-on', dots[z].getAttribute('data-i') === String(k));
      if (cross) { cross.setAttribute('x1', X(k)); cross.setAttribute('x2', X(k)); cross.classList.add('is-on'); }
    }
    function hide() {
      tip.hidden = true;
      var marks = el.querySelectorAll('.is-dim, .is-on');
      for (var z = 0; z < marks.length; z++) marks[z].classList.remove('is-dim', 'is-on');
    }
    var hits = el.querySelectorAll('.bp-chart__hit');
    for (i = 0; i < hits.length; i++) {
      hits[i].addEventListener('pointerenter', function (e) { show(Number(this.getAttribute('data-i')), e); });
    }
    svg.addEventListener('pointerleave', hide);
    return el;
  }

  // A 96x28 trend line for a stat tile; the last point gets a dot.
  function sparkline(values, color) {
    var w = 96, h = 28, p = 3;
    var mx = Math.max.apply(null, values), mn = Math.min.apply(null, values);
    var rg = mx - mn || 1;
    var d = '', x = 0, y = 0;
    for (var i = 0; i < values.length; i++) {
      x = p + (w - 2 * p) * i / (values.length - 1);
      y = p + (h - 2 * p) * (1 - (values[i] - mn) / rg);
      d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    var c = 'var(--' + (color || 'chart-1') + ')';
    return '<svg class="bp-spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" style="stroke:' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" style="fill:' + c + '"/></svg>';
  }

  var ICONS = {
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    x: ['M6 6l12 12M18 6L6 18'],
    plus: ['M12 5v14M5 12h14'],
    minus: ['M5 12h14'],
    alert: ['M12 4l9 16H3L12 4z', 'M12 10v4M12 17.2v.1'],
    info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5M12 8v.1'],
    'wifi-off': ['M3 3l18 18', 'M8.5 16.5a5 5 0 0 1 7 0', 'M5 13a10 10 0 0 1 3.2-2.1', 'M19 13a10 10 0 0 0-5.2-2.8', 'M12 20h.01'],
    wifi: ['M8.5 16.5a5 5 0 0 1 7 0', 'M5 13a10 10 0 0 1 14 0', 'M2 9.5a15 15 0 0 1 20 0', 'M12 20h.01'],
    refresh: ['M20 11a8 8 0 0 0-14.5-4M4 4v4h4', 'M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4'],
    lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M6 11h12v9H6z'],
    backspace: ['M9 5h11v14H9l-6-7 6-7z', 'M13 9.5l5 5M18 9.5l-5 5'],
    printer: ['M7 9V4h10v5', 'M7 17H4v-7h16v7h-3', 'M7 14h10v6H7z'],
    user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 20c0-4 3.6-6 8-6s8 2 8 6'],
    clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
    trash: ['M5 7h14M9 7V4h6v3', 'M7 7l1 13h8l1-13'],
    search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
    'chevron-down': ['M6 9l6 6 6-6'],
    'chevron-right': ['M9 6l6 6-6 6'],
    bell: ['M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z', 'M10 20.5a2 2 0 0 0 4 0'],
    dashboard: ['M4 4h7v9H4z', 'M13 4h7v5h-7z', 'M13 11h7v9h-7z', 'M4 15h7v5H4z'],
    chart: ['M4 20h16', 'M7 16v-5', 'M12 16V6', 'M17 16v-8'],
    'trend-up': ['M4 17l6-6 4 4 6-7', 'M15 8h5v5'],
    'trend-down': ['M4 7l6 6 4-4 6 7', 'M15 16h5v-5'],
    'arrow-up': ['M12 19V5', 'M6 11l6-6 6 6'],
    'arrow-down': ['M12 5v14', 'M6 13l6 6 6-6'],
    receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2V3z', 'M9 8h6M9 12h6M9 16h3'],
    box: ['M4 8l8-4 8 4v8l-8 4-8-4V8z', 'M4 8l8 4 8-4', 'M12 12v8'],
    calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4'],
    download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
    filter: ['M4 5h16l-6 8v6l-4-2v-4L4 5z'],
    tag: ['M3 12V4h8l10 10-8 8L3 12z', 'M7.5 8.5v.1'],
    users: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5', 'M16 4.3a3.5 3.5 0 0 1 0 6.4', 'M18.5 14.8c1.9.8 3 2.5 3 5.2'],
    tablet: ['M5 3h14v18H5z', 'M11 18h2'],
    shield: ['M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z'],
    card: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h4'],
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1'],
    'calendar-x': ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4M16 3v4', 'M10 13l4 4M14 13l-4 4'],
    edit: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13 7l4 4'],
    key: ['M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M11 11h10M18 11v3M21 11v3'],
    mail: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
    store: ['M4 10v10h16V10', 'M3 10l2-6h14l2 6H3z', 'M10 20v-5h4v5'],
    eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    more: ['M5 12h.01M12 12h.01M19 12h.01'],
    truck: ['M3 6h11v10H3z', 'M14 10h4l3 3v3h-7z', 'M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z']
  };
  function icon(name, size) {
    var paths = ICONS[name] || [];
    size = size || 20;
    return '<svg class="bp-icon" viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  }

  // The back-office destinations, in order. Keys are what data-sidenav and sidenav() take.
  var NAV = [
    [null, [['dashboard', 'dashboard', 'Dashboard'], ['alerts', 'bell', 'Alerts']]],
    ['Sales', [['transactions', 'receipt', 'Transactions'], ['reports', 'chart', 'Reports'], ['sessions', 'clock', 'Register sessions']]],
    ['Menu and stock', [['products', 'tag', 'Products'], ['inventory', 'box', 'Inventory'], ['expiry', 'calendar-x', 'Expiry tracking']]],
    ['Purchasing', [['purchases', 'truck', 'Purchase orders'], ['suppliers', 'store', 'Suppliers']]],
    ['People', [['users', 'users', 'Users and roles'], ['devices', 'tablet', 'Devices']]],
    ['Business', [['audit', 'shield', 'Audit log'], ['subscription', 'card', 'Subscription'], ['settings', 'settings', 'Settings']]]
  ];
  var COUNT_LABEL = { alerts: ' unread alerts', inventory: ' items need attention' };
  // Inner markup of the back-office side navigation with `current` marked. counts: {alerts, inventory}; hide: keys the user may not see.
  function sidenav(current, counts, hide) {
    counts = counts || { alerts: 5, inventory: 5 };
    hide = hide || [];
    var out = [];
    for (var g = 0; g < NAV.length; g++) {
      var items = NAV[g][1].filter(function (it) { return hide.indexOf(it[0]) < 0; });
      if (!items.length) continue;
      if (NAV[g][0]) out.push('<div class="bp-sidenav__group">' + NAV[g][0] + '</div>');
      for (var k = 0; k < items.length; k++) {
        var it = items[k], n = counts[it[0]];
        out.push('<a class="bp-sidenav__item" href="#' + it[0] + '"' + (it[0] === current ? ' aria-current="page"' : '') + '>' + icon(it[1]) + it[2] +
          (n ? '<span class="bp-sidenav__badge" aria-label="' + n + (COUNT_LABEL[it[0]] || '') + '">' + (n > 99 ? '99+' : n) + '</span>' : '') + '</a>');
      }
    }
    return out.join('');
  }

  // The BrewPoint staff console (superadmin). Separate app, separate navigation.
  var ADMIN_NAV = [
    [null, [['overview', 'dashboard', 'Overview'], ['shops', 'store', 'Shops']]],
    ['Support', [['support', 'key', 'Support access'], ['tickets', 'mail', 'Tickets']]],
    ['Money', [['billing', 'card', 'Billing'], ['plans', 'tag', 'Plans and prices']]],
    ['Product', [['flags', 'filter', 'Feature flags'], ['releases', 'tablet', 'App releases'], ['announcements', 'bell', 'Announcements']]],
    ['Compliance', [['datarequests', 'download', 'Data requests'], ['audit', 'shield', 'Staff audit log']]],
    ['Team', [['staff', 'users', 'Staff']]]
  ];
  // Inner markup of the staff console navigation with `current` marked. counts: {tickets, support, datarequests}.
  function adminnav(current, counts) {
    counts = counts || { tickets: 4, datarequests: 1 };
    var out = ['<div class="bp-sidenav__brand"><span class="bp-sidenav__brandname">BrewPoint</span><span class="bp-sidenav__env">' + icon('shield', 16) + 'Staff console</span></div>'];
    for (var g = 0; g < ADMIN_NAV.length; g++) {
      if (ADMIN_NAV[g][0]) out.push('<div class="bp-sidenav__group">' + ADMIN_NAV[g][0] + '</div>');
      for (var k = 0; k < ADMIN_NAV[g][1].length; k++) {
        var it = ADMIN_NAV[g][1][k], n = counts[it[0]];
        out.push('<a class="bp-sidenav__item" href="#' + it[0] + '"' + (it[0] === current ? ' aria-current="page"' : '') + '>' + icon(it[1]) + it[2] +
          (n ? '<span class="bp-sidenav__badge" aria-label="' + n + ' open">' + n + '</span>' : '') + '</a>');
      }
    }
    return out.join('');
  }

  // Replaces <i data-icon="name"> with the SVG and fills <span data-peso="14500"> with formatted pesos.
  function mount(root) {
    root = root || document;
    var i;
    var navs = root.querySelectorAll('[data-sidenav]');
    for (i = 0; i < navs.length; i++) {
      navs[i].classList.add('bp-sidenav');
      navs[i].innerHTML = sidenav(navs[i].getAttribute('data-sidenav'));
    }
    var anavs = root.querySelectorAll('[data-adminnav]');
    for (i = 0; i < anavs.length; i++) {
      anavs[i].classList.add('bp-sidenav', 'bp-sidenav--console');
      anavs[i].innerHTML = adminnav(anavs[i].getAttribute('data-adminnav'));
    }
    var icons = root.querySelectorAll('[data-icon]');
    for (i = 0; i < icons.length; i++) {
      var host = document.createElement('span');
      host.innerHTML = icon(icons[i].getAttribute('data-icon'), Number(icons[i].getAttribute('data-size')) || 20);
      var svg = host.firstChild;
      var cls = icons[i].getAttribute('class');
      if (cls) svg.setAttribute('class', 'bp-icon ' + cls);
      icons[i].parentNode.replaceChild(svg, icons[i]);
    }
    var pesos = root.querySelectorAll('[data-peso]');
    for (i = 0; i < pesos.length; i++) {
      pesos[i].textContent = formatPeso(Number(pesos[i].getAttribute('data-peso')));
    }
    var sparks = root.querySelectorAll('[data-spark]');
    for (i = 0; i < sparks.length; i++) {
      sparks[i].innerHTML = sparkline(sparks[i].getAttribute('data-spark').split(',').map(Number), sparks[i].getAttribute('data-color') || 'chart-1');
    }
  }

  window.BrewPoint = {
    mount: mount,
    contrast: contrast,
    deriveAccent: deriveAccent,
    applyAccent: applyAccent,
    formatPeso: formatPeso,
    formatPesoShort: formatPesoShort,
    chart: chart,
    sidenav: sidenav,
    adminnav: adminnav,
    sparkline: sparkline,
    icon: icon,
    icons: Object.keys(ICONS)
  };
})();
