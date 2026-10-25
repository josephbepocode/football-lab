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
      <p class="sub" style="margin-top:12px"><a href="#/league/es/2026-27" style="color:var(--acc)">Full La Liga table →</a></p></div>
  </div>`);
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
  <p class="mono small mute" style="margin-top:14px">Data: StatsBomb Open Data (match events, StatsBomb xG), used under the StatsBomb Public Data User Agreement for non-commercial analysis. Historical match, not live.</p>`);
  const lbl = s => names.get(s[7]) || 'Unknown';
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
export function addExportButtons() {
  document.querySelectorAll('#view .card').forEach(card => {
    if (!card.querySelector('.chart svg') || card.querySelector('.png-btn')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'png-btn mono'; b.textContent = '⤓ PNG'; b.title = 'Download this chart as a PNG';
    b.onclick = () => toPNG(card).catch(e => console.error(e)); card.appendChild(b);
  });
}
