// D3 chart components. Every chart animates in and is responsive via viewBox.
import { METRICS, CAT, OUTCOME, SHOT_TYPE, BODY, fmt, esc } from './data.js';
const d3 = window.d3;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = ms => reduce ? 0 : ms;
const tipEl = () => document.getElementById('tip');
export function tip(html, ev) {
  const t = tipEl(); if (!html) { t.classList.remove('on'); return; }
  t.innerHTML = html; t.classList.add('on');
  const r = t.getBoundingClientRect(); let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
const svgIn = (el, w, h) => d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img');

/** Half pitch, attacking upwards, StatsBomb 120x80 coordinates. */
export function halfPitch(g, W, pad = 10) {
  const s = (W - pad * 2) / 80, H = 60 * s + pad * 2;
  const X = y => pad + y * s, Y = x => pad + (120 - x) * s;
  g.append('rect').attr('class', 'pitch-bg').attr('x', pad).attr('y', pad).attr('width', 80 * s).attr('height', 60 * s).attr('rx', 6);
  const L = g.append('g').attr('class', 'pitch-line');
  L.append('rect').attr('x', X(0)).attr('y', Y(120)).attr('width', 80 * s).attr('height', 60 * s);
  L.append('rect').attr('x', X(18)).attr('y', Y(120)).attr('width', 44 * s).attr('height', 18 * s);
  L.append('rect').attr('x', X(30)).attr('y', Y(120)).attr('width', 20 * s).attr('height', 6 * s);
  L.append('rect').attr('x', X(36)).attr('y', Y(120) - 2.4 * s).attr('width', 8 * s).attr('height', 2.4 * s);
  L.append('circle').attr('cx', X(40)).attr('cy', Y(108)).attr('r', 1.2).attr('fill', 'rgba(255,255,255,.3)');
  const arc = d3.arc().innerRadius(10 * s).outerRadius(10 * s).startAngle(Math.PI - 0.927).endAngle(Math.PI + 0.927);
  L.append('path').attr('d', arc()).attr('transform', `translate(${X(40)},${Y(108)})`);
  L.append('path').attr('d', d3.arc().innerRadius(10 * s).outerRadius(10 * s).startAngle(-Math.PI / 2).endAngle(Math.PI / 2)()).attr('transform', `translate(${X(40)},${Y(60)})`);
  return { X, Y, s, H };
}
/** Shot map. shots: [x,y,xg,outcome,type,body,minute,pid,teamIdx,matchIdx] */
export function shotMap(el, shots, { W = 560, color = 'var(--acc)', label = s => '', compact = false } = {}) {
  const tmp = d3.create('svg'); const H = halfPitch(tmp.append('g'), W).H + (compact ? 0 : 36);
  const svg = svgIn(el, W, H); const g = svg.append('g'); const p = halfPitch(g, W);
  const dense = shots.length > 350; const r = d3.scaleSqrt().domain([0, 1]).range(dense ? [1.4, 7 * (W / 560)] : [2.2, 15 * (W / 560)]);
  const data = [...shots].sort((a, b) => (a[3] === 'Go') - (b[3] === 'Go') || b[2] - a[2]);
  const dots = g.append('g').selectAll('circle').data(data).join('circle').attr('class', 'shot')
    .attr('cx', d => p.X(d[1])).attr('cy', d => p.Y(Math.max(d[0], 60))).attr('r', 0)
    .attr('fill', d => d[3] === 'Go' ? color : 'rgba(255,255,255,.07)').attr('stroke', d => d[3] === 'Go' ? (dense ? 'none' : '#06070a') : (dense ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.45)'))
    .attr('stroke-width', d => d[3] === 'Go' ? 1 : .8).attr('fill-opacity', d => d[3] === 'Go' ? (dense ? .6 : .95) : 1)
    .on('mousemove', (ev, d) => tip(`<b>${esc(label(d))}</b>${OUTCOME[d[3]] || d[3]} · ${fmt(d[2], 2)} xG<div class="mono">${d[6]}' · ${SHOT_TYPE[d[4]] || ''} · ${BODY[d[5]] || ''}</div>`, ev))
    .on('mouseleave', () => tip(null));
  dots.transition().duration(T(700)).delay((d, i) => T(Math.min(i * 3, 900))).ease(d3.easeBackOut).attr('r', d => r(d[2]));
  if (!compact) {
    const n = shots.length, goals = shots.filter(s => s[3] === 'Go').length, xg = d3.sum(shots, s => s[2]);
    const lg = svg.append('g').attr('transform', `translate(10,${H - 20})`).attr('class', 'axis');
    [['Shots', n], ['Goals', goals], ['xG', fmt(xg, 1)], ['xG/shot', n ? fmt(xg / n, 2) : '–']].forEach(([k, v], i) => {
      const t = lg.append('text').attr('x', i * Math.min(W / 5, 92)).attr('fill', 'var(--mute)'); t.append('tspan').text(k + ' '); t.append('tspan').attr('fill', 'var(--text)').attr('font-weight', 600).text(v);
    });
    const kx = W - 132; const key = svg.append('g').attr('transform', `translate(${kx},${H - 24})`).attr('class', 'axis');
    key.append('circle').attr('cx', 6).attr('cy', 0).attr('r', 5).attr('fill', color); key.append('text').attr('x', 15).attr('y', 4).text('Goal');
    key.append('circle').attr('cx', 66).attr('cy', 0).attr('r', 5).attr('fill', 'rgba(255,255,255,.07)').attr('stroke', 'rgba(255,255,255,.45)'); key.append('text').attr('x', 75).attr('y', 4).text('No goal');
  }
  return svg;
}
/** Pizza chart of percentiles. keys -> p (0-100), v (raw). */
export function pizza(el, keys, pct, raw, { W = 520, color } = {}) {
  const H = W, R = W / 2 - 74, r0 = R * 0.16, cx = W / 2, cy = H / 2;
  const svg = svgIn(el, W, H); const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
  const n = keys.length, a = 2 * Math.PI / n, gap = 0.012;
  const rad = d3.scaleLinear().domain([0, 100]).range([r0, R]);
  [25, 50, 75, 100].forEach(t => g.append('circle').attr('r', rad(t)).attr('fill', 'none').attr('stroke', t === 100 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)').attr('stroke-dasharray', t === 100 ? null : '2 4'));
  const arc = d3.arc().cornerRadius(4);
  const ghost = g.append('g').selectAll('path').data(keys).join('path').attr('fill', 'rgba(255,255,255,.035)')
    .attr('d', (k, i) => arc({ innerRadius: r0, outerRadius: R, startAngle: i * a + gap, endAngle: (i + 1) * a - gap }));
  const col = k => color || CAT[METRICS[k].cat][1];
  const sl = g.append('g').selectAll('path').data(keys).join('path').attr('fill', col).attr('fill-opacity', .88)
    .attr('d', (k, i) => arc({ innerRadius: r0, outerRadius: r0 + .1, startAngle: i * a + gap, endAngle: (i + 1) * a - gap }))
    .on('mousemove', (ev, k) => tip(`<b>${METRICS[k].l}</b>${fmt(raw[k], METRICS[k].d)}${METRICS[k].pct ? '%' : ' per 90'}<div class="mono">${pct[k]}th percentile</div>`, ev)).on('mouseleave', () => tip(null));
  sl.transition().duration(T(1000)).delay((k, i) => T(i * 45)).ease(d3.easeCubicOut)
    .attrTween('d', (k, i) => { const ip = d3.interpolate(r0 + .1, rad(Math.max(pct[k], 2))); return t => arc({ innerRadius: r0, outerRadius: ip(t), startAngle: i * a + gap, endAngle: (i + 1) * a - gap }); });
  keys.forEach((k, i) => {
    const mid = (i + .5) * a, rr = rad(Math.max(pct[k], 2)); const bx = Math.sin(mid) * Math.max(rr - 13, r0 + 12), by = -Math.cos(mid) * Math.max(rr - 13, r0 + 12);
    const b = g.append('g').attr('transform', `translate(${bx},${by})`).attr('opacity', 0);
    b.append('rect').attr('x', -14).attr('y', -9).attr('width', 28).attr('height', 18).attr('rx', 9).attr('fill', '#06070a').attr('stroke', col(k));
    b.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', '#fff').attr('font', '600 10.5px JetBrains Mono').style('font', '600 10.5px JetBrains Mono').text(pct[k]);
    b.transition().delay(T(500 + i * 45)).duration(T(400)).attr('opacity', 1);
    const lx = Math.sin(mid) * (R + 16), ly = -Math.cos(mid) * (R + 16);
    const words = METRICS[k].s.split(' ');
    const t = g.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', Math.abs(Math.sin(mid)) < .2 ? 'middle' : Math.sin(mid) > 0 ? 'start' : 'end')
      .attr('fill', 'var(--mute)').style('font', '500 11.5px Inter Tight').attr('dy', words.length > 1 ? -2 : 4);
    words.forEach((w, j) => t.append('tspan').attr('x', lx).attr('dy', j ? 13 : 0).text(w));
  });
  g.append('circle').attr('r', r0 - 3).attr('fill', '#0b0d12').attr('stroke', 'rgba(255,255,255,.12)');
  return svg;
}
/** Overlaid radar for comparison. series: [{name, color, p:{k:pct}}] */
export function radar(el, keys, series, { W = 520, label = k => METRICS[k].s, unit = 'th percentile' } = {}) {
  const H = W, R = W / 2 - 70, svg = svgIn(el, W, H), g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);
  const n = keys.length, ang = i => i * 2 * Math.PI / n, rad = d3.scaleLinear().domain([0, 100]).range([0, R]);
  [20, 40, 60, 80, 100].forEach(t => g.append('polygon').attr('points', keys.map((k, i) => [Math.sin(ang(i)) * rad(t), -Math.cos(ang(i)) * rad(t)].join(',')).join(' ')).attr('fill', t === 100 ? 'rgba(255,255,255,.02)' : 'none').attr('stroke', 'rgba(255,255,255,.08)'));
  keys.forEach((k, i) => {
    g.append('line').attr('x2', Math.sin(ang(i)) * R).attr('y2', -Math.cos(ang(i)) * R).attr('stroke', 'rgba(255,255,255,.08)');
    const lx = Math.sin(ang(i)) * (R + 18), ly = -Math.cos(ang(i)) * (R + 18);
    g.append('text').attr('x', lx).attr('y', ly).attr('dy', 4).attr('text-anchor', Math.abs(Math.sin(ang(i))) < .2 ? 'middle' : Math.sin(ang(i)) > 0 ? 'start' : 'end').attr('fill', 'var(--mute)').style('font', '500 11.5px Inter Tight').text(label(k));
  });
  const line = d3.lineRadial().curve(d3.curveLinearClosed).angle((d, i) => ang(i)).radius(d => rad(d));
  series.forEach((s, si) => {
    const vals = keys.map(k => s.p[k] || 0);
    const path = g.append('path').attr('fill', s.color).attr('fill-opacity', .16).attr('stroke', s.color).attr('stroke-width', 2.2).attr('stroke-linejoin', 'round')
      .attr('d', line(vals.map(() => 0)));
    path.transition().duration(T(1100)).delay(T(si * 150)).ease(d3.easeCubicOut).attrTween('d', () => { const ip = d3.interpolateArray(vals.map(() => 0), vals); return t => line(ip(t)); });
    g.append('g').selectAll('circle').data(vals).join('circle').attr('r', 3.5).attr('fill', s.color).attr('stroke', '#06070a').attr('cx', 0).attr('cy', 0)
      .on('mousemove', (ev, v) => { const i = vals.indexOf(v); tip(`<b>${esc(s.name)}</b>${label(keys[i])}<div class="mono">${Math.round(v)}${unit}</div>`, ev); }).on('mouseleave', () => tip(null))
      .transition().duration(T(1100)).delay(T(si * 150)).ease(d3.easeCubicOut).attr('cx', (v, i) => Math.sin(ang(i)) * rad(v)).attr('cy', (v, i) => -Math.cos(ang(i)) * rad(v));
  });
  return svg;
}
/** Multi-line chart. series: [{name,color,values:[number],dash,area}] x = index (1-based) */
export function lines(el, series, { W = 640, H = 280, xLabel = 'Match', yLabel = '', yMin = 0, xTicks, highlight, fmtY = v => v, labels = true } = {}) {
  const m = { t: 16, r: labels ? 104 : 16, b: 32, l: 38 };
  const svg = svgIn(el, W, H); const n = d3.max(series, s => s.values.length) || 1;
  const x = d3.scaleLinear().domain([1, Math.max(2, n)]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([yMin ?? d3.min(series, s => d3.min(s.values)), d3.max(series, s => d3.max(s.values)) || 1]).nice().range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis gridl').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat(fmtY)).call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(xTicks || Math.min(n, 10)).tickFormat(d3.format('d')).tickSizeOuter(0));
  if (xLabel) svg.append('text').attr('x', W - m.r).attr('y', H - 4).attr('text-anchor', 'end').attr('fill', 'var(--dim)').style('font', '11px JetBrains Mono').text(xLabel);
  const ln = d3.line().x((d, i) => x(i + 1)).y(d => y(d)).curve(d3.curveMonotoneX);
  const ar = d3.area().x((d, i) => x(i + 1)).y0(y.range()[0]).y1(d => y(d)).curve(d3.curveMonotoneX);
  const gid = 'g' + Math.random().toString(36).slice(2);
  const paths = [];
  series.forEach((s, si) => {
    if (s.area) {
      const grad = svg.append('defs').append('linearGradient').attr('id', gid + si).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      grad.append('stop').attr('offset', 0).attr('stop-color', s.color).attr('stop-opacity', .32); grad.append('stop').attr('offset', 1).attr('stop-color', s.color).attr('stop-opacity', 0);
      svg.append('path').attr('d', ar(s.values)).attr('fill', `url(#${gid + si})`).attr('opacity', 0).transition().duration(T(900)).delay(T(400)).attr('opacity', 1);
    }
    const p = svg.append('path').attr('d', ln(s.values)).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', s.w || 2.2).attr('stroke-linecap', 'round')
      .attr('stroke-opacity', s.op ?? 1).attr('stroke-dasharray', s.dash || null).attr('data-name', s.name);
    if (!s.dash) { const L = p.node().getTotalLength(); p.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().duration(T(1300)).delay(T(si * 25)).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0).on('end', function () { d3.select(this).attr('stroke-dasharray', null); }); }
    paths.push(p);
    if (labels && s.label !== false) {
      svg.append('text').attr('class', 'endlab').attr('x', x(s.values.length) + 8).attr('y', y(s.values[s.values.length - 1]) + 4).attr('fill', s.color).attr('fill-opacity', s.op ?? 1).style('font', '600 11.5px Inter Tight').text(s.name).attr('opacity', 0).transition().delay(T(1100)).duration(T(400)).attr('opacity', 1);
    }
  });
  // de-overlap end labels
  const labs = svg.selectAll('text.endlab').nodes().map(n => ({ n, y: +n.getAttribute('y') })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < labs.length; k++) if (labs[k].y - labs[k - 1].y < 13) labs[k].y = labs[k - 1].y + 13;
  labs.forEach(l => l.n.setAttribute('y', l.y));
  // hover rule
  const rule = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'rgba(255,255,255,.25)').attr('opacity', 0);
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('mousemove', function (ev) {
      const [mx] = d3.pointer(ev, this); const i = Math.round(x.invert(mx)) - 1; if (i < 0 || i >= n) return;
      rule.attr('x1', x(i + 1)).attr('x2', x(i + 1)).attr('opacity', 1);
      const rows = series.filter(s => s.values[i] != null && s.tip !== false).sort((a, b) => b.values[i] - a.values[i]).slice(0, 8)
        .map(s => `<div style="display:flex;justify-content:space-between;gap:14px"><span><i class="swatch" style="background:${s.color}"></i>${esc(s.name)}</span><span class="mono" style="color:var(--text)">${fmtY(s.values[i])}</span></div>`).join('');
      tip(`<b>${xLabel} ${i + 1}</b>${rows}`, ev);
    }).on('mouseleave', () => { rule.attr('opacity', 0); tip(null); });
  return svg;
}
/** Sparkline */
export function spark(el, values, { W = 300, H = 60, color = 'var(--acc)' } = {}) {
  const svg = svgIn(el, W, H).attr('preserveAspectRatio', 'none');
  const x = d3.scaleLinear().domain([0, Math.max(1, values.length - 1)]).range([2, W - 2]); const y = d3.scaleLinear().domain([0, d3.max(values) || 1]).range([H - 3, 3]);
  const gid = 's' + Math.random().toString(36).slice(2);
  const gr = svg.append('defs').append('linearGradient').attr('id', gid).attr('x2', 0).attr('y2', 1);
  gr.append('stop').attr('stop-color', color).attr('stop-opacity', .35); gr.append('stop').attr('offset', 1).attr('stop-color', color).attr('stop-opacity', 0);
  svg.append('path').attr('d', d3.area().x((d, i) => x(i)).y0(H).y1(d => y(d)).curve(d3.curveMonotoneX)(values)).attr('fill', `url(#${gid})`);
  const p = svg.append('path').attr('d', d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX)(values)).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('vector-effect', 'non-scaling-stroke');
  const L = p.node().getTotalLength(); p.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().duration(T(1400)).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
}
/** Scatter plot. pts: [{x,y,r?,label,color,href,sub}] */
export function scatter(el, pts, { W = 640, H = 420, xl = '', yl = '', invertY = false, quad = true, labelTop = 8, fx = v => v, fy = v => v } = {}) {
  const m = { t: 18, r: 20, b: 40, l: 46 };
  const svg = svgIn(el, W, H);
  const x = d3.scaleLinear().domain(d3.extent(pts, d => d.x)).nice().range([m.l, W - m.r]);
  const yd = d3.extent(pts, d => d.y); const y = d3.scaleLinear().domain(invertY ? [yd[1], yd[0]] : yd).nice().range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis gridl').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickSize(-(H - m.t - m.b)).tickFormat(fx));
  svg.append('g').attr('class', 'axis gridl').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r)).tickFormat(fy));
  svg.append('text').attr('x', W - m.r).attr('y', H - 6).attr('text-anchor', 'end').attr('fill', 'var(--mute)').style('font', '11.5px JetBrains Mono').text(xl + ' →');
  svg.append('text').attr('x', m.l + 4).attr('y', m.t - 4).attr('fill', 'var(--mute)').style('font', '11.5px JetBrains Mono').text((invertY ? '↑ fewer ' : '↑ ') + yl);
  if (quad) {
    const mx = d3.mean(pts, d => d.x), my = d3.mean(pts, d => d.y);
    svg.append('line').attr('x1', x(mx)).attr('x2', x(mx)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'rgba(255,255,255,.18)').attr('stroke-dasharray', '3 5');
    svg.append('line').attr('y1', y(my)).attr('y2', y(my)).attr('x1', m.l).attr('x2', W - m.r).attr('stroke', 'rgba(255,255,255,.18)').attr('stroke-dasharray', '3 5');
  }
  const g = svg.append('g');
  const dots = g.selectAll('circle').data(pts).join('circle').attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 0)
    .attr('fill', d => d.color || 'var(--acc)').attr('fill-opacity', d => d.hi ? .95 : .55).attr('stroke', d => d.hi ? '#fff' : '#06070a').attr('stroke-width', d => d.hi ? 1.5 : .8)
    .style('cursor', d => d.href ? 'pointer' : 'default')
    .on('mousemove', (ev, d) => tip(`<b>${esc(d.label)}</b>${d.sub || ''}<div class="mono">${xl}: ${fx(d.x)} · ${yl}: ${fy(d.y)}</div>`, ev)).on('mouseleave', () => tip(null))
    .on('click', (ev, d) => { if (d.href) location.hash = d.href; });
  dots.transition().duration(T(700)).delay((d, i) => T(Math.min(i * 4, 600))).ease(d3.easeBackOut).attr('r', d => d.r || 5);
  const top = [...pts].filter(d => d.hi || d.lab).concat([...pts].sort((a, b) => (b.score ?? (b.x + b.y)) - (a.score ?? (a.x + a.y))).slice(0, labelTop));
  const seen = new Set();
  top.forEach(d => { if (seen.has(d)) return; seen.add(d);
    g.append('text').attr('x', x(d.x) + (d.r || 5) + 4).attr('y', y(d.y) + 4).attr('fill', d.hi ? '#fff' : 'var(--mute)').style('font', `${d.hi ? 600 : 500} 11px Inter Tight`).style('pointer-events', 'none').text(d.label).attr('opacity', 0).transition().delay(T(700)).attr('opacity', 1); });
  return svg;
}
/** Bars of per-match values (e.g. xG for/against diverging). */
export function xgBars(el, seq, { W = 640, H = 220, cf = 'var(--acc)', ca = 'rgba(200,210,230,.45)' } = {}) {
  const m = { t: 12, r: 10, b: 26, l: 34 }; const svg = svgIn(el, W, H);
  const x = d3.scaleBand().domain(seq.map((_, i) => i)).range([m.l, W - m.r]).padding(.25);
  const mx = d3.max(seq, s => Math.max(s.xg, s.xga)) || 1; const y = d3.scaleLinear().domain([-mx, mx]).nice().range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis gridl').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat(d => Math.abs(d)));
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'rgba(255,255,255,.3)');
  const g = svg.append('g');
  const bar = (key, c, sign) => g.append('g').selectAll('rect').data(seq).join('rect').attr('x', (_, i) => x(i)).attr('width', x.bandwidth()).attr('y', y(0)).attr('height', 0).attr('rx', 2).attr('fill', c)
    .on('mousemove', (ev, s) => tip(`<b>${s.home ? 'vs' : '@'} ${esc(s.oppName)}</b>${s.gf}–${s.ga} · ${s.r === 'W' ? 'Win' : s.r === 'D' ? 'Draw' : 'Loss'}<div class="mono">xG ${fmt(s.xg)} – ${fmt(s.xga)} · ${s.date}</div>`, ev)).on('mouseleave', () => tip(null))
    .transition().duration(T(800)).delay((_, i) => T(i * 14)).attr('y', s => sign > 0 ? y(s[key]) : y(0)).attr('height', s => Math.abs(y(s[key] * sign) - y(0)));
  bar('xg', cf, 1); bar('xga', ca, -1);
  g.append('g').selectAll('circle').data(seq).join('circle').attr('cx', (_, i) => x(i) + x.bandwidth() / 2).attr('cy', s => y(0) + (s.r === 'W' ? -1 : s.r === 'L' ? 1 : 0) * 0).attr('r', 0);
  svg.append('text').attr('x', m.l + 4).attr('y', m.t + 8).attr('fill', cf).style('font', '11px JetBrains Mono').text('xG for ↑');
  svg.append('text').attr('x', m.l + 4).attr('y', H - m.b - 6).attr('fill', ca).style('font', '11px JetBrains Mono').text('xG against ↓');
}
