// Near-live Barça match pages, 2015/16 Clásico throwback, "last updated" strip, PNG export.
import { load, lab, fmt, esc, crest } from './data.js';
import { shotMap } from './charts.js';
const d3 = window.d3;
const $ = (s, r = document) => r.querySelector(s);
const view = () => document.getElementById('view');
const set = html => { window.__onRender?.(); const v = view(); v.classList.remove('view-in'); v.innerHTML = html; void v.offsetWidth; v.classList.add('view-in'); };
const SB_CREDIT = `<a class="sb-credit" href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener" title="Event data: StatsBomb Open Data"><img src="assets/statsbomb-logo.png" alt="StatsBomb"></a>`;
const nocache = u => load(u + '?t=' + Math.floor(Date.now() / 300000));
export const when = iso => iso ? new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : 'unknown';
const SRC_LINKS = `<a href="https://github.com/openfootball/football.json">openfootball</a> (CC0) fixtures + ESPN public scoreboard for latest scores &amp; scorers`;

/** Strip shown on every page: live pages get "Last updated", historical pages get a clear historical label. */
export async function updatedStrip(kind, season) {
  const v = view(); if (!v || v.querySelector('.upd')) return;
  let html;
  if (kind === 'hist') html = `<span class="chip hist">Historical data · StatsBomb Open Data · ${esc(season || 'past seasons')}</span><span>Static dataset, not live. Shot maps and xG are from a past season.</span>`;
  else {
    let meta = {}; try { meta = await nocache('data/live/meta.json'); } catch { }
    let ix = {}; try { ix = await nocache('data/results/index.json'); } catch { }
    html = `<span class="chip real">Last updated · ${esc(when(meta.updated || ix.updated || ix.built))}</span><span>La Liga refreshes every 30 min on match days (hourly otherwise) via GitHub Actions. Sources: ${SRC_LINKS}.${kind === 'other' ? ' Other leagues: openfootball, refreshed with the same job.' : ''}</span>`;
  }
  v.insertAdjacentHTML('afterbegin', `<div class="upd mono small">${html}</div>`);
}

/* ---------- Barça: list of finished matches ---------- */
export async function barcaList() {
  const B = await nocache('data/live/barca.json');
  set(`<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/league/es/2026-27">La Liga</a></div><h1>Barça <em>post-match</em></h1>
    <div class="meta"><span class="chip real">Real data</span><span class="chip">2026/27 · ${B.matches.length} league matches played</span></div></div></div>
  ${await scorersCard()}
  <div class="card"><h3>Every finished Barça league match</h3><p class="sub">Generated automatically after full time. Click a match for scorers and table impact.</p>
  <div class="results">${B.matches.map(m => `<a class="res" href="#/barca/${m.id}"><span class="d">${m.date.slice(5)}</span><span>${esc(m.home)} <span class="mute">vs</span> ${esc(m.away)} <span class="mute">· MD ${m.round}</span></span><span class="sc ${res(m)}" style="color:var(--text)">${m.hg}–${m.ag}</span></a>`).join('') || '<p class="empty">No matches yet.</p>'}</div></div>`);
}
const res = m => { const f = m.barcaHome ? m.hg : m.ag, a = m.barcaHome ? m.ag : m.hg; return f > a ? 'W' : f === a ? 'D' : 'L'; };

async function scorersCard() {
  let S; try { const M = await nocache('data/live/meta.json'); if (!M.sources?.some(x => /football-data/.test(x))) return ''; S = await nocache('data/live/scorers.json'); } catch { return ''; }
  if (!S?.scorers?.length) return '';
  return `<div class="card" style="margin-bottom:18px"><h3>La Liga 2026/27 top scorers (live)</h3><p class="sub">From football-data.org free tier · updated ${esc(when(S.updated))}. Assists/penalties shown only where the source provides them.</p>
  <table class="tbl"><thead><tr><th class="l">Player</th><th class="l">Team</th><th>MP</th><th>G</th><th>A</th><th>Pen</th></tr></thead><tbody>${S.scorers.map(x => `<tr><td class="l">${esc(x.n)}</td><td class="l">${esc(x.team)}</td><td>${x.mp ?? '–'}</td><td>${x.g ?? '–'}</td><td>${x.a ?? '–'}</td><td>${x.pen ?? '–'}</td></tr>`).join('')}</tbody></table></div>`;
}
/* ---------- Barça: one match ---------- */
export async function barcaMatch(id) {
  const B = await nocache('data/live/barca.json'); const m = B.matches.find(x => x.id === id);
  if (!m) return set(`<div class="empty"><h2>Match not found.</h2><p><a href="#/barca" style="color:var(--acc)">All Barça matches</a></p></div>`);
  const r = res(m), word = { W: 'Win', D: 'Draw', L: 'Defeat' }[r];
  const g = side => m.goals.filter(x => x.side === side).map(x => `<li><b>${esc(x.min)}</b> ${esc(x.player || 'Unknown')}${x.pen ? ' (pen)' : ''}${x.og ? ' (OG)' : ''}</li>`).join('') || '<li class="mute">–</li>';
  const mv = m.before ? m.before.pos - m.after.pos : null;
  set(`<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/barca">Barça post-match</a></div>
    <p class="kicker">La Liga 2026/27 · Matchday ${m.round} · ${esc(m.date)}</p><h1>${esc(m.home)} ${m.hg}–${m.ag} ${esc(m.away)}</h1>
    <div class="meta"><span class="chip real">Real data</span><span class="chip">Barça ${word}</span></div></div></div>
  <div class="grid g2">
    <div class="card" id="pmCard"><div class="card-head"><div><h3>Scorers</h3><p class="sub">${m.goalsSrc ? 'Goal events from the ESPN public scoreboard.' : 'Scorer details not available from the source for this match.'}</p></div></div>
      <div class="grid g2"><div><b>${crest(m.home)} ${esc(m.home)}</b><ul class="goals">${g('h')}</ul></div><div><b>${crest(m.away)} ${esc(m.away)}</b><ul class="goals">${g('a')}</ul></div></div></div>
    <div class="card"><h3>Table impact</h3><p class="sub">${esc(m.note)}</p>
      <div class="kpis"><div class="kpi"><b>${m.before ? m.before.pos : '–'} → ${m.after.pos}</b><span>Position${mv ? (mv > 0 ? ` (up ${mv})` : ` (down ${-mv})`) : ''}</span></div>
      <div class="kpi"><b>${m.before ? m.before.pts : 0} → ${m.after.pts}</b><span>Points</span></div><div class="kpi"><b style="font-size:20px">${esc(m.leaderAfter)}</b><span>Leader after</span></div></div>
      <p class="sub" style="margin-top:12px"><a href="#/league/es/2026-27" style="color:var(--acc)">Full La Liga table →</a> · <a href="p/barca/${m.id}/" style="color:var(--acc)">Share link</a></p></div>
  </div><div id="mdet"></div>`);
  let D; try { D = await nocache(`data/live/matches/${m.id}.json`); } catch { $('#mdet').innerHTML = '<p class="mono small mute" style="margin-top:14px">Shot timeline, lineups and match stats not available for this match (ESPN summary not cached).</p>'; return; }
  const side = m.barcaHome ? 'h' : 'a';
  $('#mdet').innerHTML = `<div class="card" style="margin-top:18px" data-src="espn"><h3>Shot timeline</h3><p class="sub">Every shot by minute (${D.shots.length} total), from ESPN's match commentary. Above the line: ${esc(m.home)}; below: ${esc(m.away)}. ESPN's free feed has no xG, so shots are not weighted.</p><div class="chart" id="stl"></div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>Match stats</h3><p class="sub">ESPN box score.</p><table class="tbl mstats" style="width:100%;table-layout:fixed"><thead><tr><th>${esc(m.home)}</th><th class="l" style="text-align:center"></th><th>${esc(m.away)}</th></tr></thead><tbody>${(D.stats.h || []).map(([l, v], i) => `<tr><td>${esc(v)}</td><td class="l" style="text-align:center;color:var(--mute)">${esc(l)}</td><td>${esc((D.stats.a || [])[i]?.[1] ?? '–')}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Lineups &amp; substitutions</h3><p class="sub">Starting XIs (formation), bench and substitutions from ESPN.</p><div class="grid g2">${['h', 'a'].map(sd => { const L = D.lineups[sd]; if (!L) return '<div class="mute">–</div>';
      return `<div><b>${esc(L.team)}</b> <span class="mono small mute">${esc(L.formation || '')}</span><ul class="xi">${L.xi.map(p => `<li><span class="mono">${esc(p.no || '')}</span> ${esc(p.n)} <span class="mute small">${esc(p.pos || '')}</span>${p.off ? ' <span class="subo">↓</span>' : ''}</li>`).join('')}</ul>
      <p class="mono small mute" style="margin:8px 0 4px">Subs</p><ul class="xi">${D.subs.filter(x => x.side === sd).map(x => `<li><span class="mono">${esc(x.min)}</span> <span class="subi">↑</span> ${esc(x.on || '')} <span class="subo">↓</span> ${esc(x.off || '')}</li>`).join('') || '<li class="mute">None</li>'}</ul></div>`; }).join('')}</div></div>
  </div><p class="mono small mute" style="margin-top:10px">Source: ${esc(D.source)}. ESPN data is cached in the repo; if ESPN changes its format these panels hide rather than show wrong numbers.</p>`;
  timeline($('#stl'), D.shots, m.home, m.away);
}
const OC = { Goal: '#c6ff3d', 'Own goal': '#c6ff3d', Saved: '#5ee7ff', Missed: 'rgba(255,255,255,.55)', Blocked: '#ff6b9a' };
function timeline(el, shots, home, away) {
  const W = 900, H = 300, m = { l: 110, r: 20, t: 20, b: 50 }; const mx = Math.max(95, d3.max(shots, s => s.min) || 90);
  const x = d3.scaleLinear([0, mx], [m.l, W - m.r]); const mid = (H - m.b + m.t) / 2;
  const svg = d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
  svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', mid).attr('y2', mid).attr('stroke', 'rgba(255,255,255,.3)');
  [45, 90].forEach(v => svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'rgba(255,255,255,.12)').attr('stroke-dasharray', '3 4'));
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).attr('class', 'axis').call(d3.axisBottom(x).tickValues([0, 15, 30, 45, 60, 75, 90]).tickFormat(d => d + "'")).call(g => g.select('.domain').remove());
  svg.append('text').attr('x', 10).attr('y', mid - 10).attr('fill', 'var(--text)').attr('font-size', 13).attr('font-weight', 600).text(home);
  svg.append('text').attr('x', 10).attr('y', mid + 22).attr('fill', 'var(--text)').attr('font-size', 13).attr('font-weight', 600).text(away);
  const stack = {}; shots.forEach(s => { const k = s.side + s.min; stack[k] = (stack[k] || 0) + 1; s._k = stack[k]; });
  svg.append('g').selectAll('circle').data(shots).join('circle').attr('cx', s => x(s.min || 0)).attr('cy', s => s.side === 'h' ? mid - 14 - (s._k - 1) * 14 : mid + 14 + (s._k - 1) * 14)
    .attr('r', s => /Goal/i.test(s.outcome) ? 7 : 5).attr('fill', s => OC[s.outcome] || '#fff').attr('stroke', '#06070a')
    .append('title').text(s => `${s.clock} ${s.player} · ${s.outcome}`);
  const lg = svg.append('g').attr('transform', `translate(${m.l},${H - 12})`).attr('class', 'axis');
  Object.entries({ Goal: OC.Goal, Saved: OC.Saved, Missed: OC.Missed, Blocked: OC.Blocked }).forEach(([k, c], i) => { lg.append('circle').attr('cx', i * 100).attr('cy', -4).attr('r', 5).attr('fill', c); lg.append('text').attr('x', i * 100 + 10).attr('y', 0).attr('fill', 'var(--mute)').text(k); });
}
/** StatsBomb xG flow (historical). */
function xgFlow(el, shots, teams) {
  const W = 900, H = 320, m = { l: 50, r: 120, t: 20, b: 40 };
  const series = teams.map(t => { let c = 0; const pts = [[0, 0]]; shots.filter(s => s[8] === t.i).sort((a, b) => a[6] - b[6]).forEach(s => { pts.push([s[6], c]); c += s[2]; pts.push([s[6], c, s[3] === 'Go']); }); pts.push([95, c]); return { ...t, pts, tot: c }; });
  const x = d3.scaleLinear([0, 95], [m.l, W - m.r]), y = d3.scaleLinear([0, d3.max(series, s => s.tot) * 1.1], [H - m.b, m.t]);
  const svg = d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).attr('class', 'axis').call(d3.axisBottom(x).tickValues([0, 15, 30, 45, 60, 75, 90]).tickFormat(d => d + "'"));
  svg.append('g').attr('transform', `translate(${m.l},0)`).attr('class', 'axis').call(d3.axisLeft(y).ticks(5));
  series.forEach(s => {
    svg.append('path').attr('d', d3.line(p => x(p[0]), p => y(p[1]))(s.pts)).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', 2.5);
    svg.append('g').selectAll('circle').data(s.pts.filter(p => p[2])).join('circle').attr('cx', p => x(p[0])).attr('cy', p => y(p[1])).attr('r', 6).attr('fill', s.c).attr('stroke', '#06070a');
    svg.append('text').attr('x', W - m.r + 8).attr('y', y(s.tot) + 4).attr('fill', s.c).attr('font-size', 13).attr('font-weight', 600).text(`${s.name} ${fmt(s.tot, 2)}`);
  });
  svg.append('text').attr('x', m.l).attr('y', 14).attr('fill', 'var(--mute)').attr('font-size', 11).text('Cumulative StatsBomb xG · dots = goals');
}

/* ---------- Clásico throwback 21 Nov 2015 ---------- */
export async function clasico() {
  const L = await lab('laliga'); const rm = L.teams.findIndex(t => t.id === 'real-madrid'), fcb = L.teams.findIndex(t => t.id === 'barcelona');
  const mi = L.matches.findIndex(m => m[0] === '2015-11-21' && m[2] === rm && m[3] === fcb);
  if (mi < 0) return set('<div class="empty"><h2>Match not in dataset.</h2></div>');
  const m = L.matches[mi]; const names = new Map(L.players.map(p => [p.id, p.n]));
  const sh = L.shots.filter(s => s[9] === mi); const fs = sh.filter(s => s[8] === fcb), rs = sh.filter(s => s[8] === rm);
  const scorers = fs.filter(s => s[3] === 'Go').sort((a, b) => a[6] - b[6]).map(s => `${esc(names.get(s[7]) || 'Unknown')} ${s[6]}′`).join(' · ');
  set(`<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/lab/laliga">Event Lab · La Liga 2015/16</a></div>
    <p class="kicker">Throwback · La Liga 2015/16 · Matchday ${m[1]} · 21 Nov 2015 · Santiago Bernabéu</p><h1>Real Madrid ${m[4]}–${m[5]} <em>Barcelona</em></h1>
    <div class="meta"><span class="chip real">Real data · StatsBomb</span><span class="chip hist">Historical · 2015/16 season</span>${SB_CREDIT}</div></div></div>
  <div class="grid g2">
    <div class="card"><h3>Barcelona shots</h3><p class="sub">${fs.length} shots · ${fmt(m[7], 2)} xG. Goals: ${scorers || '–'}. Circle size = StatsBomb xG; hover for details.</p><div class="chart" id="cfcb"></div></div>
    <div class="card"><h3>Real Madrid shots</h3><p class="sub">${rs.length} shots · ${fmt(m[6], 2)} xG. Circle size = StatsBomb xG.</p><div class="chart" id="crm"></div></div>
  </div>
  <div class="card" style="margin-top:18px"><h3>xG flow</h3><p class="sub">Historical (La Liga 2015/16), not the current season. Cumulative StatsBomb xG by minute, all shots including penalties.</p><div class="chart" id="xgf"></div></div>
  <p class="mono small mute" style="margin-top:14px">Data: StatsBomb Open Data (match events, StatsBomb xG), used under the StatsBomb Public Data User Agreement for non-commercial analysis. Historical match, not live.</p>`);
  const lbl = s => names.get(s[7]) || 'Unknown';
  xgFlow($('#xgf'), sh, [{ i: fcb, name: 'Barcelona', c: '#ff5a3c' }, { i: rm, name: 'Real Madrid', c: '#e9edf5' }]);
  shotMap($('#cfcb'), fs, { W: 560, color: '#ff5a3c', label: lbl }); shotMap($('#crm'), rs, { W: 560, color: '#e9edf5', label: lbl });
}

/* ---------- PNG export for every chart ---------- */
const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing'];
async function toPNG(card) {
  const svg = card.querySelector('.chart svg'); if (!svg) return;
  const vb = svg.viewBox.baseVal; const w = vb?.width || svg.clientWidth, h = vb?.height || svg.clientHeight;
  const clone = svg.cloneNode(true); const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((el, i) => { const cs = getComputedStyle(el); dst[i].setAttribute('style', PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';')); });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', w); clone.setAttribute('height', h);
  const title = card.querySelector('h3')?.textContent || 'Chart', page = document.querySelector('#view h1')?.textContent.trim() || '';
  const S = 2, pad = 28, top = 64, bot = 40, sbLogo = !!card.closest('#view').querySelector('.sb-credit') || /StatsBomb/i.test(document.querySelector('#view .meta')?.textContent || '');
  const c = document.createElement('canvas'); c.width = (w + pad * 2) * S; c.height = (h + top + bot) * S; const x = c.getContext('2d'); x.scale(S, S);
  x.fillStyle = '#0b0d12'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#e9edf5'; x.font = '600 18px "Inter Tight", sans-serif'; x.fillText(title, pad, 30);
  x.fillStyle = '#8a93a6'; x.font = '13px "Inter Tight", sans-serif'; x.fillText(page.replace(/\s+/g, ' '), pad, 50);
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  await img.decode(); x.drawImage(img, pad, top, w, h);
  x.fillStyle = '#c6ff3d'; x.font = '600 12px "JetBrains Mono", monospace'; x.fillText('Football Lab · bepojoseph.xyz', pad, top + h + 26);
  x.fillStyle = '#8a93a6'; x.textAlign = 'right'; x.fillText(sbLogo ? 'Data: StatsBomb Open Data' : 'Data: openfootball (CC0) / ESPN', w + pad, top + h + 26);
  const a = document.createElement('a'); a.download = 'football-lab-' + (page + '-' + title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 70) + '.png'; a.href = c.toDataURL('image/png'); a.click();
}
const SBIMG = new Image(); SBIMG.src = 'assets/statsbomb-logo.png';
async function shareCard(card) {
  const svg = card.querySelector('.chart svg'); if (!svg) return;
  const vb = svg.viewBox.baseVal; const w = vb?.width || svg.clientWidth, h = vb?.height || svg.clientHeight;
  const clone = svg.cloneNode(true); const src = [svg, ...svg.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((el, i) => { const cs = getComputedStyle(el); dst[i].setAttribute('style', PROPS.map(p => `${p}:${cs.getPropertyValue(p)}`).join(';')); });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', w); clone.setAttribute('height', h);
  const sb = usesSB(card); const route = location.hash.replace(/^#\/?/, '');
  const espn = /^(barca|weekly|fixtures)/.test(route) || card.dataset.src === 'espn';
  const srcTxt = 'Data: ' + (sb ? 'StatsBomb Open Data (Hudl StatsBomb) · historical' : espn ? 'ESPN / openfootball' : 'openfootball / ESPN');
  const title = card.querySelector('h3')?.textContent || 'Chart', page = (document.querySelector('#view h1')?.textContent || '').trim().replace(/\s+/g, ' ');
  const pnum = document.querySelector('#view .p-num'); const kicker = (pnum ? 'Historical · ' + [...pnum.children].map(e => e.textContent).join(' · ') : document.querySelector('#view .phead .kicker')?.textContent || (sb ? 'Historical · StatsBomb' : 'Football Lab')).trim();
  const c = document.createElement('canvas'); c.width = 2400; c.height = 1350; const x = c.getContext('2d'); x.scale(2, 2);
  x.fillStyle = '#0b0d12'; x.fillRect(0, 0, 1200, 675); x.fillStyle = '#c6ff3d'; x.fillRect(0, 0, 1200, 6);
  x.fillStyle = '#c6ff3d'; x.font = '600 15px "JetBrains Mono", monospace'; x.fillText(kicker.toUpperCase().slice(0, 90), 48, 44);
  x.fillStyle = '#e9edf5'; x.font = '700 34px "Inter Tight", sans-serif'; x.fillText(page.slice(0, 60), 48, 86);
  x.fillStyle = '#8a93a6'; x.font = '500 18px "Inter Tight", sans-serif'; x.fillText(title + (card.querySelector('.sub') ? ' · ' + card.querySelector('.sub').textContent : '').slice(0, 110 - title.length), 48, 114);
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)); await img.decode();
  const bw = 1104, bh = 440, sc = Math.min(bw / w, bh / h); x.drawImage(img, 48 + (bw - w * sc) / 2, 134 + (bh - h * sc) / 2, w * sc, h * sc);
  x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.moveTo(48, 592); x.lineTo(1152, 592); x.stroke();
  x.fillStyle = '#c6ff3d'; x.font = '700 18px "Inter Tight", sans-serif'; x.fillText('Football Lab · bepojoseph.xyz', 48, 622);
  x.fillStyle = '#8a93a6'; x.font = '14px "JetBrains Mono", monospace'; x.fillText(srcTxt, 48, 648);
  x.fillStyle = '#e9edf5'; x.font = '700 18px "Inter Tight", sans-serif'; x.textAlign = 'right'; x.fillText('@NorthCuler', 1152, 622);
  if (sb && SBIMG.complete) { const lw = 150, lh = lw * SBIMG.height / SBIMG.width; x.drawImage(SBIMG, 1152 - lw, 634, lw, lh); }
  const a = document.createElement('a'); a.download = 'football-lab-share-' + (page + '-' + title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '.png'; a.href = c.toDataURL('image/png'); a.click();
}
const usesSB = card => !!document.querySelector('#view .sb-credit') || /StatsBomb|Historical/i.test(document.querySelector('#view .upd')?.textContent || '');
export function addExportButtons() {
  document.querySelectorAll('#view .card').forEach(card => {
    if (!card.querySelector('.chart svg') || card.querySelector('.share-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'share-btn mono'; b.textContent = '⤓ Share card'; b.title = 'Download a 1200×675 share card (for X)';
    b.onclick = () => shareCard(card).catch(e => console.error(e)); card.appendChild(b);
  });
  document.querySelectorAll('#view .card').forEach(card => {
    if (!card.querySelector('.chart svg') || card.querySelector('.png-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'png-btn mono'; b.textContent = '⤓ PNG'; b.title = 'Download this chart as a PNG';
    b.onclick = () => toPNG(card).catch(e => console.error(e)); card.appendChild(b);
  });
}

/* ---------- Upcoming fixtures with difficulty ---------- */
export async function fixtures() {
  const F = await nocache('data/live/barca_fixtures.json');
  const col = r => r >= 4 ? 'var(--loss)' : r >= 3 ? '#ffd35e' : 'var(--win)';
  set(`<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/barca">Barça</a></div><h1>Barça <em>fixtures</em></h1>
    <div class="meta"><span class="chip real">Real fixtures &amp; table</span><span class="chip">${F.fixtures.length} league matches left · table from ${esc(F.basedOn)}</span></div></div></div>
  <div class="card"><h3>How difficulty is rated</h3><p class="sub">${esc(F.formula)} It's a simple, transparent heuristic from the current table and form, not a prediction model.</p></div>
  <div class="card" style="margin-top:18px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="l">Date</th><th>MD</th><th class="l">Opponent</th><th>Venue</th><th>Opp. pos</th><th>Opp. last 5</th><th>Pos score</th><th>Form score</th><th>Difficulty</th></tr></thead><tbody>
  ${F.fixtures.map(f => `<tr><td class="l">${esc(f.kickoff ? when(f.kickoff) : f.date)}</td><td>${f.round}</td><td class="l">${crest(f.opp)} ${esc(f.opp)}</td><td>${f.home ? 'Home' : 'Away'}</td><td>${f.oppPos}</td><td>${f.oppForm ? `<span class="form">${[...f.oppForm].map(r => `<i class="${r}">${r}</i>`).join('')}</span>` : '–'}</td><td>${f.posScore.toFixed(2)}</td><td>${f.formScore.toFixed(2)}</td><td><b style="color:${col(f.rating)}">${f.rating.toFixed(1)}</b></td></tr>`).join('')}</tbody></table></div>
  <p class="sub" style="margin-top:10px">Ratings change as the table moves. Kick-off times are shown in your time zone where ESPN has published them; otherwise the scheduled date from openfootball.</p></div>`);
}
/* ---------- Weekly Barça in numbers ---------- */
export async function weekly(wk) {
  if (!wk) {
    const I = await nocache('data/weekly/index.json');
    return set(`<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/barca">Barça</a></div><h1>Barça <em>in numbers</em></h1>
      <div class="meta"><span class="chip real">Real data</span><a class="chip" href="feed.xml">RSS feed</a></div></div></div>
    <div class="card"><h3>Weekly archive</h3><p class="sub">Built automatically after each finished Monday–Sunday week with a Barça league match.</p>
    <div class="results">${I.weeks.map(w => `<a class="res" href="#/weekly/${w.week}"><span class="d">${w.week.slice(5)}</span><span>${w.from} to ${w.to} <span class="mute">· ${w.played} match${w.played > 1 ? 'es' : ''}</span></span><span class="sc" style="color:var(--text)">${w.points} pts · ${w.gf}–${w.ga}</span></a>`).join('') || '<p class="empty">No finished weeks yet.</p>'}</div></div>`);
  }
  let W; try { W = await nocache(`data/weekly/${wk}.json`); } catch { return set('<div class="empty"><h2>Week not found.</h2><p><a href="#/weekly" style="color:var(--acc)">Archive</a></p></div>'); }
  const k = (v, l) => `<div class="kpi"><b>${v ?? '–'}</b><span>${l}</span></div>`;
  set(`<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/weekly">Barça in numbers</a></div><p class="kicker">${W.from} to ${W.to}</p><h1>Week <em>${esc(W.week)}</em></h1>
    <div class="meta"><span class="chip real">Real data</span><a class="chip" href="feed.xml">RSS</a><a class="chip" href="p/weekly/${W.week}/">Share link</a></div></div></div>
  <div class="card"><div class="kpis">${k(W.played, 'League matches')}${k(W.points, 'Points')}${k(W.gf + '–' + W.ga, 'Goals for–against')}${k(W.shots, 'Barça shots')}${k(W.shotsOnTarget, 'On target')}${k(W.possessionAvg != null ? W.possessionAvg + '%' : null, 'Avg possession')}${k(W.tableAfter.pos + ' (' + W.tableAfter.pts + ' pts)', 'Position after')}${k(esc(W.leaderAfter), 'Leader after')}</div></div>
  <div class="grid g2" style="margin-top:18px"><div class="card"><h3>Results</h3><div class="results">${W.matches.map(m => `<a class="res" href="#/barca/${m.id}"><span class="d">${m.date.slice(5)}</span><span>${esc(m.home)} <span class="mute">vs</span> ${esc(m.away)}</span><span class="sc" style="color:var(--text)">${m.hg}–${m.ag}</span></a>`).join('')}</div></div>
  <div class="card"><h3>Barça scorers</h3><ul class="goals">${W.scorers.map(([n, g]) => `<li><b>${g}</b> ${esc(n)}</li>`).join('') || '<li class="mute">None</li>'}</ul></div></div>
  <p class="mono small mute" style="margin-top:10px">Sources: ${esc(W.sources)}. Shots and possession appear only when ESPN's box score has them.</p>`);
}
