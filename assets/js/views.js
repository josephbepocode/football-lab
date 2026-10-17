import { LEAGUES, SEASONS, LAB_LEAGUE, GROUPS, METRICS, OUTFIELD, GKSET, RADAR, CAT, load, results, lab, players, fmt, esc, crest, crestColor, initials, standings, labTable, rolling, similar } from './data.js';
import { shotMap, pizza, radar, lines, spark, scatter, xgBars, tip } from './charts.js';
const d3 = window.d3;
const $ = (s, r = document) => r.querySelector(s);
const view = () => document.getElementById('view');
const REAL_RES = `<span class="chip real" title="Results from openfootball/football.json (CC0)">Real data · openfootball</span>`;
const REAL_SB = `<span class="chip real" title="Event data from StatsBomb Open Data">Real data · StatsBomb</span>`;
const DEMO = `<span class="demo-chip" title="Synthetic numbers generated for demonstration. Not real players or stats.">Demo data</span>`;
const SB_CREDIT = `<a class="sb-credit" href="https://github.com/statsbomb/open-data" target="_blank" rel="noopener" title="Event data: StatsBomb Open Data"><img src="assets/statsbomb-logo.png" alt="StatsBomb"></a>`;
const DEMO_BANNER = (what) => `<div class="demo-banner">${DEMO}<span>${what} No free, openly licensed event data exists for this league, so these players, numbers and shots are <b>synthetic</b>, generated to show how the views work. They are not real players or real statistics.</span></div>`;
export const accent = c => document.documentElement.style.setProperty('--acc', c || '#c6ff3d');
const formHTML = f => `<span class="form">${f.map(r => `<i class="${r}">${r}</i>`).join('')}</span>`;
const labLabel = m => m.demo ? 'Demo lab' : `Event Lab ${m.season}`;
function seasonSeg(code, cur) {
  const L = LEAGUES[code];
  return `<nav class="seg" aria-label="Season">${SEASONS.map(s => `<a href="#/league/${code}/${s.id}" ${cur === s.id ? 'aria-current="page"' : ''}>${s.label} <span class="mute small">${s.note}</span></a>`).join('')}<a href="#/lab/${L.lab}" ${cur === 'lab' ? 'aria-current="page"' : ''}>${L.lab.startsWith('demo') ? 'Demo lab' : 'Event Lab'}</a></nav>`;
}
const loading = () => { view().innerHTML = '<div class="loading"><i></i></div>'; };
const setView = html => { window.__onRender?.(); const v = view(); v.classList.remove('view-in'); v.innerHTML = html; void v.offsetWidth; v.classList.add('view-in'); };
const W = el => Math.max(320, Math.min(900, (el?.clientWidth || 600)));

/* ---------------- HOME ---------------- */
export async function home() {
  accent('#c6ff3d');
  const [idx, summ, hero] = await Promise.all([load('data/results/index.json'), load('data/summary.json'), load('data/hero.json')]);
  const played = Object.values(idx.sets).reduce((a, s) => a + s.played, 0);
  const shots = Object.values(summ).reduce((a, s) => a + s.shots, 0), pool = Object.values(summ).reduce((a, s) => a + s.players, 0);
  setView(`
  <section class="hero">
    <div>
      <p class="kicker">Six leagues · tables · shot maps · percentiles</p>
      <h1>Football,<br><em>measured.</em></h1>
      <p class="lead">An analytics lab for La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie and Liga Portugal. Live tables and form from open results data, and event-level shot maps and percentile profiles from StatsBomb's open data.</p>
      <div class="hero-cta"><a class="btn primary" href="#/league/es/2026-27">Explore the leagues →</a><a class="btn" href="#/compare">Compare players</a><a class="btn" href="#/about">How it's built</a></div>
      <div class="hero-stats">
        <div><b data-count="${played}">0</b><span>real results, 2025/26 + 2026/27</span></div>
        <div><b data-count="${shots}">0</b><span>real shots with xG</span></div>
        <div><b data-count="${pool}">0</b><span>players with percentile profiles</span></div>
      </div>
    </div>
    <div class="hero-viz card" style="padding:14px"><div id="heroViz" class="chart"></div>
      <div class="legend-row" style="justify-content:space-between;padding:4px 8px 2px"><span>Every goal in the Event Lab datasets (${hero.length.toLocaleString()}), sized by xG</span>${SB_CREDIT}</div></div>
  </section>
  <section class="section"><div class="sec-head"><div><p class="kicker">Pick a league</p><h2>Six leagues, one lab.</h2></div><p>2026/27 standings, results through the latest update.</p></div>
    <div class="lg-grid" id="lgGrid">${Object.entries(LEAGUES).map(([c, L]) => `<a class="card lg-card" style="--c:${L.c}" href="#/league/${c}/2026-27" data-c="${c}">
      <div class="lg-top"><span class="lg-country mono">${L.country}</span>${L.lab.startsWith('demo') ? DEMO.replace('Demo data', 'Demo lab') : '<span class="chip real">Event Lab</span>'}</div>
      <div class="lg-name">${L.name}</div><div class="lg-mini" id="mini-${c}"></div>
      <div class="lg-leader"><div><span class="mute small">Leader</span><br><b id="lead-${c}">…</b></div><span id="pts-${c}"></span></div></a>`).join('')}</div>
  </section>
  <section class="section"><div class="sec-head"><div><p class="kicker">Spotlight</p><h2>Percentile profiles.</h2></div><p>Real StatsBomb event data, per 90, against players in the same position.</p></div>
    <div class="grid g3" id="spot"></div></section>
  <section class="section"><div class="sec-head"><div><p class="kicker">Honest data</p><h2>What's real, what's demo.</h2></div></div>
    <div class="grid g3">
      <div class="card"><span class="chip real">Real</span><h3 style="margin-top:12px">Results, tables &amp; form</h3><p class="sub">Every fixture and score for 2025/26 and 2026/27 from openfootball/football.json, public domain (CC0). Tables, form strips, points races and position charts are computed from these results.</p></div>
      <div class="card"><span class="chip real">Real</span><h3 style="margin-top:12px">Event Lab: shots, xG, percentiles</h3><p class="sub">StatsBomb Open Data: full La Liga, Serie A and Ligue 1 seasons from 2015/16, and Bayer Leverkusen's 2023/24 Bundesliga matches. Shot maps, xG, xPts and player percentiles are computed from the raw events.</p></div>
      <div class="card"><span class="demo-chip">Demo</span><h3 style="margin-top:12px">Eredivisie &amp; Liga Portugal players</h3><p class="sub">There's no free event data for these leagues, so their player labs use synthetic players with invented names and numbers, badged <b>Demo data</b> wherever they appear. Their tables and results are real.</p></div>
    </div></section>`);
  document.querySelectorAll('[data-count]').forEach(el => { const n = +el.dataset.count; d3.select(el).transition().duration(1600).ease(d3.easeCubicOut).tween('t', () => t => el.textContent = Math.round(n * t).toLocaleString()); });
  // hero viz
  const hv = $('#heroViz'); const w = 640; const svg = shotMap(hv, hero.map(h => [h[0], h[1], h[2], 'Go', 'Op', 'R', 0, 0, 0, 0]), { W: w, compact: true, label: () => 'Goal' });
  svg.selectAll('circle.shot').attr('fill-opacity', .42).attr('stroke', 'none').style('mix-blend-mode', 'screen').on('mousemove', (ev, d) => tip(`<b>Goal</b>${fmt(d[2])} xG`, ev));
  // league cards
  Object.keys(LEAGUES).forEach(async c => {
    try {
      const d = await results(c, '2026-27'); const t = standings(d); const top = t[0];
      $('#lead-' + c).textContent = top.short; $('#pts-' + c).textContent = `${top.Pts} pts · ${top.P} played`;
      spark($('#mini-' + c), [0, ...top.hist], { color: LEAGUES[c].c, W: 300, H: 60 });
    } catch (e) { $('#lead-' + c).textContent = '–'; }
  });
  const P = (await players()).players;
  const pick = ['Lionel Messi', 'Florian Wirtz', 'Zlatan Ibrahimović'].map(n => P.find(p => p.n === n)).filter(Boolean);
  const spot = $('#spot');
  spot.innerHTML = pick.map(p => `<a class="card" href="#/player/${p.uid}" style="display:block"><div class="card-head"><div><h3>${esc(p.n)}</h3><p class="sub">${esc(p.team)} · ${labName(p.lab)} · ${GROUPS[p.grp]}</p></div>${REAL_SB}</div><div class="chart" id="sp-${p.uid}"></div></a>`).join('');
  pick.forEach(p => { const keys = p.grp === 'GK' ? GKSET : OUTFIELD; pizza($('#sp-' + p.uid), keys, p.p, p.v, { W: 480 }); });
}
const LABN = { laliga: 'La Liga 2015/16', seriea: 'Serie A 2015/16', ligue1: 'Ligue 1 2015/16', bundesliga: 'Bundesliga 2023/24', 'demo-nl': 'Eredivisie (demo)', 'demo-pt': 'Liga Portugal (demo)' };
export const labName = k => LABN[k] || k;

/* ---------------- LEAGUE ---------------- */
export async function league(code, season) {
  const L = LEAGUES[code]; if (!L) return notFound(); season = season || '2026-27'; accent(L.c);
  const d = await results(code, season); const T = standings(d); const S = SEASONS.find(s => s.id === season);
  const n = T.length; const rounds = d3.max(d.matches.filter(m => m.length >= 6), m => m[1]) || 0;
  setView(`
  <div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><span>${L.country}</span></div><h1>${L.name}</h1>
    <div class="meta">${REAL_RES}<span class="chip">${S ? S.label : season} · ${d.played}/${d.total} matches${d.lastDate ? ' · results to ' + d.lastDate : ''}</span></div></div>${seasonSeg(code, season)}</div>
  <div class="grid g-7-5">
    <div class="card"><div class="card-head"><div><h3>League table</h3><p class="sub">Click a column to sort. Ties: points, goal difference, goals scored.</p></div></div>
      <div class="tbl-wrap"><table class="tbl" id="tbl"></table></div>
      <div class="zones"><span><i style="background:var(--acc)"></i>Top 4</span><span><i style="background:var(--acc2)"></i>5th–6th</span><span><i style="background:var(--loss)"></i>Bottom 3</span><span>Zones are visual only; qualification rules vary by league.</span></div></div>
    <div class="grid" style="align-content:start">
      <div class="card"><h3>Points race</h3><p class="sub">Cumulative points by games played. Top 6 highlighted; hover for values.</p><div class="chart" id="race"></div></div>
      <div class="card"><h3>Attack vs defence</h3><p class="sub">Goals scored vs conceded per game. Top-right is best.</p><div class="chart" id="avd"></div></div>
    </div>
  </div>
  <div class="grid g2 section" style="margin-top:18px">
    <div class="card"><h3>Latest results</h3><p class="sub">Most recent completed matches.</p><div class="results" id="latest"></div></div>
    <div class="card"><h3>Next fixtures</h3><p class="sub">${d.played === d.total ? 'Season complete.' : 'Upcoming scheduled matches.'}</p><div class="results" id="next"></div></div>
  </div>`);
  const cols = [['pos', '#', 'l'], ['short', 'Team', 'l'], ['P', 'P'], ['W', 'W'], ['D', 'D'], ['L', 'L'], ['GF', 'GF'], ['GA', 'GA'], ['GD', 'GD'], ['Pts', 'Pts'], ['form', 'Form']];
  let sortK = 'pos', dir = 1;
  const draw = () => {
    const rows = [...T].sort((a, b) => { const x = a[sortK], y = b[sortK]; return (typeof x === 'string' ? x.localeCompare(y) : (x - y)) * dir; });
    $('#tbl').innerHTML = `<thead><tr>${cols.map(([k, l, c]) => `<th class="${c || ''} ${sortK === k ? 'sorted' : ''}" ${k !== 'form' ? `data-k="${k}"` : ''} scope="col">${l}</th>`).join('')}</tr></thead><tbody>${rows.map((t, i) => `<tr class="${t.pos <= 4 ? 'z1' : t.pos <= 6 ? 'z2' : t.pos > n - 3 ? 'z3' : ''}" style="--i:${i}">
      <td class="pos l">${t.pos}</td><td class="team l"><a class="tl" href="#/team/${code}/${season}/${t.id}">${crest(t.short)}${esc(t.short)}</a></td>
      <td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td><td>${t.GD > 0 ? '+' : ''}${t.GD}</td><td class="pts">${t.Pts}</td><td>${formHTML(t.form)}</td></tr>`).join('')}</tbody>`;
    $('#tbl').querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k; if (sortK === k) dir *= -1; else { sortK = k; dir = (k === 'pos' || k === 'short' || k === 'GA' || k === 'L') ? 1 : -1; } draw(); });
  };
  draw();
  const pal = [L.c, '#5ee7ff', '#ffffff', '#ff6b9a', '#ffd35e', '#a0ff8a'];
  lines($('#race'), T.map((t, i) => ({ name: t.short, color: i < 6 ? pal[i] : 'rgba(255,255,255,.5)', op: i < 6 ? 1 : .22, w: i < 6 ? 2.4 : 1.2, values: [0, ...t.hist], label: i < 6 })), { W: 560, H: 330, xLabel: 'Games', yMin: 0 });
  scatter($('#avd'), T.filter(t => t.P).map(t => ({ x: t.GF / t.P, y: t.GA / t.P, label: t.short, color: crestColor(t.short), href: `/team/${code}/${season}/${t.id}`, score: (t.GF - t.GA) / t.P, r: 6 })), { W: 560, H: 360, xl: 'Goals for / game', yl: 'conceded / game', invertY: true, labelTop: 6, fx: d3.format('.1f'), fy: d3.format('.1f') });
  const playedM = d.matches.filter(m => m.length >= 6).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const up = d.matches.filter(m => m.length < 6).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 12);
  const tn = i => d.teams[i].short;
  $('#latest').innerHTML = playedM.map(m => `<div class="res"><span class="d">${m[0].slice(5)}</span><span>${esc(tn(m[2]))} <span class="mute">vs</span> ${esc(tn(m[3]))}</span><span class="sc U" style="color:var(--text)">${m[4]}–${m[5]}</span></div>`).join('') || '<p class="empty">No results yet.</p>';
  const big = d.matches.filter(m => m.length >= 6).sort((a, b) => Math.abs(b[4] - b[5]) - Math.abs(a[4] - a[5]) || (b[4] + b[5]) - (a[4] + a[5])).slice(0, 12);
  const list = up.length ? up : big;
  if (!up.length) { $('#next').previousElementSibling.textContent = 'Season complete. Biggest winning margins:'; $('#next').previousElementSibling.previousElementSibling.textContent = 'Biggest wins'; }
  $('#next').innerHTML = list.map(m => `<div class="res"><span class="d">${m[0].slice(5)}</span><span>${esc(tn(m[2]))} <span class="mute">vs</span> ${esc(tn(m[3]))}</span><span class="sc U" ${up.length ? '' : 'style="color:var(--text)"'}>${up.length ? 'MD ' + m[1] : m[4] + '–' + m[5]}</span></div>`).join('');
}

/* ---------------- TEAM (results season) ---------------- */
export async function team(code, season, id) {
  const L = LEAGUES[code]; if (!L) return notFound(); accent(L.c);
  const d = await results(code, season); const T = standings(d); const t = T.find(x => x.id === id); if (!t) return notFound();
  const S = SEASONS.find(s => s.id === season);
  const posHist = t.seq.map(s => standings(d, m => m[0] <= s.date).find(x => x.id === id).pos);
  const home = t.seq.filter(s => s.home), away = t.seq.filter(s => !s.home);
  const ppg = a => a.length ? (a.reduce((x, s) => x + (s.r === 'W' ? 3 : s.r === 'D' ? 1 : 0), 0) / a.length).toFixed(2) : '–';
  const other = SEASONS.find(s => s.id !== season);
  setView(`
  <div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/league/${code}/${season}">${L.name} ${S?.label || season}</a></div>
    <h1 style="display:flex;align-items:center;gap:18px">${crest(t.short).replace('class="crest"', 'class="crest" style="width:64px;height:64px;border-radius:20px;font-size:20px;background:' + crestColor(t.short) + '"')}${esc(t.short)}</h1>
    <div class="meta">${REAL_RES}<span class="chip">${esc(t.name)}</span><span class="chip">${S?.label || season} · ${t.P} played</span></div></div>
    <nav class="seg">${SEASONS.map(s => `<a href="#/team/${code}/${s.id}/${id}" ${s.id === season ? 'aria-current="page"' : ''}>${s.label}</a>`).join('')}</nav></div>
  <div class="kpis">
    <div class="kpi"><b>${ord(t.pos)}</b><span>Position</span></div><div class="kpi"><b>${t.Pts}</b><span>Points</span></div><div class="kpi"><b>${t.P ? (t.Pts / t.P).toFixed(2) : '–'}</b><span>Points / game</span></div>
    <div class="kpi"><b>${t.W}-${t.D}-${t.L}</b><span>W-D-L</span></div><div class="kpi"><b>${t.GF}<small> / ${t.GA}</small></b><span>Goals for / against</span></div>
    <div class="kpi"><b>${ppg(home)}</b><span>Home PPG</span></div><div class="kpi"><b>${ppg(away)}</b><span>Away PPG</span></div><div class="kpi"><b style="font-size:20px;padding-top:6px">${formHTML(t.form)}</b><span>Last 5</span></div>
  </div>
  <div class="grid g2">
    <div class="card"><h3>Form trend</h3><p class="sub">Rolling 5-match goals for and against.</p><div class="chart" id="roll"></div></div>
    <div class="card"><h3>Table position</h3><p class="sub">League position after each match.</p><div class="chart" id="posc"></div></div>
    <div class="card"><h3>Points pace</h3><p class="sub">Cumulative points against the leader and the league average.</p><div class="chart" id="pace"></div></div>
    <div class="card"><h3>Results &amp; fixtures</h3><p class="sub">Newest first.</p><div class="results" id="res"></div></div>
  </div>
  <p class="mute small" style="margin-top:18px">Looking for shot maps and player radars? They live in the <a href="#/lab/${L.lab}" style="color:var(--acc)">${L.name} ${L.lab.startsWith('demo') ? 'demo lab' : 'Event Lab'}</a>, which covers a different season (see Sources). ${other ? `<a href="#/team/${code}/${other.id}/${id}" style="color:var(--acc)">View ${other.label} →</a>` : ''}</p>`);
  if (t.P) {
    lines($('#roll'), [{ name: 'Scored', color: 'var(--acc)', values: rolling(t.seq.map(s => s.gf), 5), area: true }, { name: 'Conceded', color: '#aab3c5', values: rolling(t.seq.map(s => s.ga), 5) }], { W: 600, H: 260, fmtY: d3.format('.1f') });
    const n = T.length;
    const ps = $('#posc'); lines(ps, [{ name: t.short, color: 'var(--acc)', values: posHist.map(p => n + 1 - p), area: true }], { W: 600, H: 260, yMin: 1, fmtY: v => ord(n + 1 - v) });
    const avg = Array.from({ length: t.P + 1 }, (_, i) => d3.mean(T.filter(x => x.hist.length >= i), x => i ? x.hist[i - 1] : 0));
    const ser = [{ name: t.short, color: 'var(--acc)', values: [0, ...t.hist], w: 3 }, { name: 'League avg', color: 'rgba(255,255,255,.5)', values: avg, dash: '4 5' }];
    if (T[0].id !== id) ser.push({ name: T[0].short + ' (1st)', color: '#5ee7ff', values: [0, ...T[0].hist] });
    lines($('#pace'), ser, { W: 600, H: 260, xLabel: 'Games' });
  } else ['#roll', '#posc', '#pace'].forEach(s => $(s).innerHTML = '<p class="empty">No matches played yet.</p>');
  const all = d.matches.filter(m => m[2] === t.i || m[3] === t.i).sort((a, b) => b[0].localeCompare(a[0]));
  $('#res').innerHTML = all.map(m => { const h = m[2] === t.i, opp = d.teams[h ? m[3] : m[2]]; const done = m.length >= 6; const gf = h ? m[4] : m[5], ga = h ? m[5] : m[4]; const r = !done ? 'U' : gf > ga ? 'W' : gf === ga ? 'D' : 'L';
    return `<div class="res"><span class="d">${m[0].slice(5)} · ${h ? 'H' : 'A'}</span><a href="#/team/${code}/${season}/${opp.id}">${h ? 'vs' : '@'} ${esc(opp.short)}</a><span class="sc ${r}">${done ? `${gf}–${ga}` : 'MD ' + m[1]}</span></div>`; }).join('');
}
const ord = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th');

/* ---------------- LAB (league) ---------------- */
export async function labView(key) {
  const code = LAB_LEAGUE[key]; const LG = LEAGUES[code]; if (!LG) return notFound(); accent(LG.c);
  const [Ld, PI] = await Promise.all([lab(key), players()]);
  const M = Ld.meta;
  if (M.focus) return labTeam(key, Ld.teams.find(t => t.name === M.focus).id, true);
  const P = PI.players.filter(p => p.lab === key);
  const head = `<div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/league/${code}/2026-27">${LG.name}</a><span>/</span><span>${labLabel(M)}</span></div>
    <h1>${LG.name} <em>${M.demo ? 'demo lab' : M.season}</em></h1><div class="meta">${M.demo ? DEMO : REAL_SB}<span class="chip">${esc(M.scope)}</span>${M.demo ? '' : SB_CREDIT}</div></div>${seasonSeg(code, 'lab')}</div>`;
  if (M.demo) {
    setView(`${head}${DEMO_BANNER('Demo lab.')}
    <div class="grid g-5-7"><div class="card"><div class="card-head"><div><h3>Demo squad</h3><p class="sub">Synthetic players. Click one to open the demo profile.</p></div>${DEMO}</div><div class="plist" id="dl"></div></div>
    <div class="grid" style="align-content:start"><div class="card"><div class="card-head"><div><h3>Demo shot map</h3><p class="sub">Generated shots for the whole demo squad.</p></div>${DEMO}</div><div class="chart" id="dshots"></div></div>
    <div class="card"><div class="card-head"><div><h3 id="dpzT"></h3><p class="sub">Top demo attacker's percentile pizza, ranked against the real StatsBomb pool.</p></div>${DEMO}</div><div class="chart" id="dpz" style="max-width:520px;margin:0 auto"></div></div></div></div>`);
    $('#dl').innerHTML = P.sort((a, b) => b.v.npxg + b.v.xa - a.v.npxg - a.v.xa).map((p, i) => prow(p, i + 1, `${fmt(p.v.npxg + p.v.xa)}<span class="mute small"> xG+xA/90</span>`)).join('');
    shotMap($('#dshots'), Ld.shots, { W: 640, label: s => (P.find(p => p.uid === s[7]) || {}).n + ' (demo)' });
    const top = P.find(p => p.grp !== 'GK'); $('#dpzT').innerHTML = `<a href="#/player/${top.uid}">${esc(top.n)} →</a>`; pizza($('#dpz'), OUTFIELD, top.p, top.v, { W: 500 });
    return;
  }
  const T = labTable(Ld);
  setView(`${head}
  <div class="card"><div class="card-head"><div><h3>Expected table</h3><p class="sub">Real results alongside xG. xPts are simulated from every shot's xG, so they show how many points a team's chances deserved. Click a column to sort.</p></div></div>
    <div class="tbl-wrap"><table class="tbl" id="xt"></table></div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>Chance quality</h3><p class="sub">Non-penalty xG created vs conceded per match. Top-right is best.</p><div class="chart" id="xsc"></div></div>
    <div class="card"><h3>Style map</h3><p class="sub">Pressing intensity (PPDA, lower = more pressing) vs field tilt (share of final-third passes).</p><div class="chart" id="style"></div></div>
  </div>
  <div class="grid g-7-5" style="margin-top:18px">
    <div class="card"><div class="card-head"><div><h3>League shot map</h3><p class="sub" id="smSub"></p></div><div class="filters"><select id="smTeam" aria-label="Team"><option value="">All teams</option>${Ld.teams.map((t, i) => `<option value="${i}">${esc(t.name)}</option>`).join('')}</select>
      <div class="seg" id="smMode"><button aria-pressed="true" data-m="goals">Goals</button><button aria-pressed="false" data-m="all">All shots</button></div></div></div><div class="chart" id="lsm"></div></div>
    <div class="card"><div class="card-head"><div><h3>Leaders</h3><p class="sub">Per 90, minimum 900 minutes.</p></div></div>
      <div class="seg" id="ldTabs" style="margin-bottom:12px">${['npxg', 'xa', 'prog', 'drc', 'tkw'].map((k, i) => `<button aria-pressed="${!i}" data-k="${k}">${METRICS[k].s}</button>`).join('')}</div><div class="plist" id="leaders"></div></div>
  </div>`);
  const cols = [['pos', '#', 'l'], ['name', 'Team', 'l'], ['P', 'P'], ['Pts', 'Pts'], ['xPts', 'xPts'], ['dPts', '±'], ['GF', 'GF'], ['xG', 'xG'], ['GA', 'GA'], ['xGA', 'xGA'], ['xGD', 'xGD'], ['ppda', 'PPDA'], ['tilt', 'Tilt %']];
  T.forEach(t => { t.dPts = t.Pts - t.xPts; t.xGD = t.xG - t.xGA; });
  let sk = 'pos', dir = 1;
  const draw = () => {
    const rows = [...T].sort((a, b) => { const x = a[sk], y = b[sk]; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });
    const mx = d3.max(T, t => t.xPts);
    $('#xt').innerHTML = `<thead><tr>${cols.map(([k, l, c]) => `<th class="${c || ''} ${sk === k ? 'sorted' : ''}" data-k="${k}" scope="col">${l}</th>`).join('')}</tr></thead><tbody>${rows.map((t, i) => `<tr class="${t.pos <= 4 ? 'z1' : t.pos > T.length - 3 ? 'z3' : ''}" style="--i:${i}">
      <td class="pos l">${t.pos}</td><td class="team l"><a class="tl" href="#/lab/${key}/team/${t.id}">${crest(t.name)}${esc(t.name)}</a></td><td>${t.P}</td><td class="pts">${t.Pts}</td>
      <td><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">${fmt(t.xPts, 1)}<div class="bar" style="width:60px"><i style="width:${100 * t.xPts / mx}%"></i></div></div></td>
      <td style="color:${t.dPts >= 0 ? 'var(--win)' : 'var(--loss)'}">${t.dPts >= 0 ? '+' : ''}${fmt(t.dPts, 1)}</td><td>${t.GF}</td><td>${fmt(t.xG, 1)}</td><td>${t.GA}</td><td>${fmt(t.xGA, 1)}</td><td>${t.xGD >= 0 ? '+' : ''}${fmt(t.xGD, 1)}</td><td>${fmt(t.ppda, 1)}</td><td>${fmt(t.tilt, 1)}</td></tr>`).join('')}</tbody>`;
    $('#xt').querySelectorAll('th[data-k]').forEach(th => th.onclick = () => { const k = th.dataset.k; if (sk === k) dir *= -1; else { sk = k; dir = ['pos', 'name', 'GA', 'xGA', 'ppda'].includes(k) ? 1 : -1; } draw(); });
  };
  draw();
  scatter($('#xsc'), T.map(t => ({ x: t.npxG / t.P, y: t.npxGA / t.P, label: t.name, color: crestColor(t.name), href: `/lab/${key}/team/${t.id}`, r: 6, score: (t.npxG - t.npxGA) / t.P })), { W: 600, H: 400, xl: 'npxG / match', yl: 'npxGA / match', invertY: true, labelTop: 7, fx: d3.format('.1f'), fy: d3.format('.1f') });
  scatter($('#style'), T.map(t => ({ x: t.tilt, y: t.ppda, label: t.name, color: crestColor(t.name), href: `/lab/${key}/team/${t.id}`, r: 6, score: t.tilt - t.ppda * 3 })), { W: 600, H: 400, xl: 'Field tilt %', yl: 'PPDA', invertY: true, labelTop: 7, fx: d3.format('.0f'), fy: d3.format('.0f') });
  const nameById = new Map(); (await lab(key)).players.forEach(p => nameById.set(p.id, p.n));
  let team = '', mode = 'goals';
  const drawShots = () => {
    let s = Ld.shots.filter(x => x[4] !== 'Pe'); if (team !== '') s = s.filter(x => x[8] === +team); if (mode === 'goals') s = s.filter(x => x[3] === 'Go');
    $('#smSub').textContent = `${s.length.toLocaleString()} ${mode === 'goals' ? 'non-penalty goals' : 'non-penalty shots'}${team !== '' ? ' · ' + Ld.teams[+team].name : ' · all teams'}. Circle size = xG.`;
    shotMap($('#lsm'), s, { W: 640, label: x => `${nameById.get(x[7]) || 'Unknown'} · ${Ld.teams[x[8]].name}` });
  };
  $('#smTeam').onchange = e => { team = e.target.value; drawShots(); };
  $('#smMode').querySelectorAll('button').forEach(b => b.onclick = () => { mode = b.dataset.m; $('#smMode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawShots(); });
  drawShots();
  const lead = k => { $('#leaders').innerHTML = P.filter(p => p.grp !== 'GK').sort((a, b) => b.v[k] - a.v[k]).slice(0, 10).map((p, i) => prow(p, i + 1, fmt(p.v[k], METRICS[k].d))).join(''); };
  $('#ldTabs').querySelectorAll('button').forEach(b => b.onclick = () => { $('#ldTabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); lead(b.dataset.k); });
  lead('npxg');
}
const prow = (p, rk, val) => `<a class="prow" href="#/player/${p.uid}"><span class="rk">${rk}</span><span class="nm"><b>${esc(p.n)}${p.demo ? ' <span class="demo-chip" style="font-size:9px;padding:2px 5px">Demo</span>' : ''}</b><span>${esc(p.team)} · ${GROUPS[p.grp]} · ${p.min.toLocaleString()}′</span></span><span class="vv">${val}</span></a>`;

/* ---------------- LAB TEAM ---------------- */
export async function labTeam(key, id, focus = false) {
  const code = LAB_LEAGUE[key]; const LG = LEAGUES[code]; accent(LG.c);
  const [Ld, PI] = await Promise.all([lab(key), players()]); const M = Ld.meta;
  const T = labTable(Ld); const t = T.find(x => x.id === id); if (!t) return notFound();
  const indexed = new Set(PI.players.map(p => p.uid));
  const squad = Ld.players.filter(p => p.tid === t.i).sort((a, b) => b.min - a.min);
  const tm = Ld.teams;
  t.seq.forEach(s => s.oppName = tm[s.opp].name);
  setView(`
  <div class="phead"><div><div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/league/${code}/2026-27">${LG.name}</a><span>/</span>${focus ? `<span>${labLabel(M)}</span>` : `<a href="#/lab/${key}">${labLabel(M)}</a>`}</div>
    <h1 style="display:flex;align-items:center;gap:18px">${crest(t.name).replace('class="crest"', 'class="crest" style="width:64px;height:64px;border-radius:20px;font-size:20px;background:' + crestColor(t.name) + '"')}${esc(t.name)}</h1>
    <div class="meta">${REAL_SB}<span class="chip">${LG.name} ${M.season}</span><span class="chip">${esc(M.scope)}</span>${SB_CREDIT}</div></div>${focus ? seasonSeg(code, 'lab') : ''}</div>
  ${focus ? `<p class="lead" style="margin:-8px 0 22px">StatsBomb's open data for the 2023/24 Bundesliga covers only Bayer Leverkusen's matches: their unbeaten title season. So this lab is a deep dive on one team rather than a league table.</p>` : ''}
  <div class="kpis">
    ${focus ? '' : `<div class="kpi"><b>${ord(t.pos)}</b><span>Position</span></div>`}<div class="kpi"><b>${t.Pts}</b><span>Points (${t.W}-${t.D}-${t.L})</span></div><div class="kpi"><b>${fmt(t.xPts, 1)}</b><span>Expected points</span></div>
    <div class="kpi"><b>${t.GF}<small> / ${fmt(t.xG, 1)} xG</small></b><span>Goals for</span></div><div class="kpi"><b>${t.GA}<small> / ${fmt(t.xGA, 1)} xGA</small></b><span>Goals against</span></div>
    <div class="kpi"><b>${fmt(t.ppda, 1)}</b><span>PPDA</span></div><div class="kpi"><b>${fmt(t.tilt, 0)}%</b><span>Field tilt</span></div><div class="kpi"><b>${fmt(t.passShare, 0)}%</b><span>Pass share</span></div>
  </div>
  <div class="card"><h3>Match-by-match xG</h3><p class="sub">Bars above the line are xG created, below are xG conceded. Hover for the score.</p><div class="chart" id="xgb"></div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><div class="card-head"><div><h3>Shot map</h3><p class="sub" id="tsSub">Non-penalty shots. Circle size = xG.</p></div><div class="seg" id="tsMode"><button aria-pressed="true" data-m="for">For</button><button aria-pressed="false" data-m="against">Against</button></div></div><div class="chart" id="tsm"></div></div>
    <div class="grid" style="align-content:start">
      <div class="card"><h3>Form trend</h3><p class="sub">Rolling 5-match non-penalty xG for and against.</p><div class="chart" id="txg"></div></div>
      <div class="card"><h3>Points vs expected points</h3><p class="sub">Cumulative. A gap above the dashed line means results outran the chances.</p><div class="chart" id="txp"></div></div>
    </div>
  </div>
  <div class="grid g-7-5" style="margin-top:18px">
    <div class="card"><h3>Squad</h3><p class="sub">League minutes and output. Profiles are available for players with 900+ minutes.</p><div class="tbl-wrap"><table class="tbl" id="sq"></table></div></div>
    ${focus ? `<div class="card"><h3>Results</h3><p class="sub">Every league match in the dataset.</p><div class="results" id="lres"></div></div>` : `<div class="card"><h3>Team style</h3><p class="sub">Percentile rank among the league's ${T.length} teams.</p><div class="chart" id="trad"></div></div>`}
  </div>`);
  xgBars($('#xgb'), t.seq, { W: 1100, H: 240 });
  let mode = 'for';
  const nm = new Map(Ld.players.map(p => [p.id, p.n]));
  const ms = new Set(t.seq.map(s => s.mi));
  const drawS = () => {
    const s = Ld.shots.filter(x => ms.has(x[9]) && x[4] !== 'Pe' && (mode === 'for' ? x[8] === t.i : x[8] !== t.i));
    shotMap($('#tsm'), s, { W: 600, color: mode === 'for' ? 'var(--acc)' : 'var(--loss)', label: x => `${nm.get(x[7]) || ''} · ${tm[x[8]].name}` });
  };
  $('#tsMode').querySelectorAll('button').forEach(b => b.onclick = () => { mode = b.dataset.m; $('#tsMode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawS(); });
  drawS();
  lines($('#txg'), [{ name: 'npxG for', color: 'var(--acc)', values: rolling(t.seq.map(s => s.np), 5), area: true }, { name: 'npxG against', color: '#aab3c5', values: rolling(t.seq.map(s => s.npa), 5) }], { W: 600, H: 240, fmtY: d3.format('.1f') });
  const cum = a => { let s = 0; return a.map(v => s += v); };
  lines($('#txp'), [{ name: 'Points', color: 'var(--acc)', values: [0, ...cum(t.seq.map(s => s.r === 'W' ? 3 : s.r === 'D' ? 1 : 0))], w: 3 }, { name: 'xPts', color: 'rgba(255,255,255,.6)', values: [0, ...cum(t.seq.map(s => s.xp))], dash: '4 5' }], { W: 600, H: 240, fmtY: d3.format('.0f') });
  $('#sq').innerHTML = `<thead><tr><th class="l">Player</th><th>Pos</th><th>Min</th><th>G</th><th>xG</th><th>A</th><th>xA</th><th>Shots</th></tr></thead><tbody>${squad.map((p, i) => { const uid = `${key}-${p.id}`; const link = indexed.has(uid);
    return `<tr style="--i:${i}"><td class="team l">${link ? `<a class="tl" href="#/player/${uid}">${esc(p.n)}</a>` : `<span class="mute">${esc(p.n)}</span>`}</td><td>${p.grp}</td><td>${p.min.toLocaleString()}</td><td>${p.tot.g}</td><td>${fmt(p.tot.xg, 1)}</td><td>${p.tot.ast}</td><td>${fmt(p.tot.xa, 1)}</td><td>${p.tot.sh}</td></tr>`; }).join('')}</tbody>`;
  if (focus) {
    $('#lres').innerHTML = [...t.seq].reverse().map(s => `<div class="res"><span class="d">${s.date.slice(5)} · ${s.home ? 'H' : 'A'}</span><span>${s.home ? 'vs' : '@'} ${esc(s.oppName)} <span class="mute small mono">xG ${fmt(s.xg, 1)}–${fmt(s.xga, 1)}</span></span><span class="sc ${s.r}">${s.gf}–${s.ga}</span></div>`).join('');
  } else {
    const keys = ['npxg', 'shots', 'tilt', 'pass', 'press', 'npxga', 'sha'];
    const lab_ = { npxg: 'npxG', shots: 'Shots', tilt: 'Field tilt', pass: 'Pass share', press: 'Pressing', npxga: 'npxG prevented', sha: 'Shots prevented' };
    const val = x => ({ npxg: x.npxG / x.P, shots: x.sh / x.P, tilt: x.tilt, pass: x.passShare, press: -x.ppda, npxga: -x.npxGA / x.P, sha: -x.sha / x.P });
    const all = T.map(val); const me = val(t);
    const pr = {}; keys.forEach(k => { const arr = all.map(a => a[k]); pr[k] = 100 * arr.filter(v => v < me[k]).length / (arr.length - 1); });
    radar($('#trad'), keys, [{ name: t.name, color: 'var(--acc)', p: pr }], { W: 460, label: k => lab_[k], unit: ' percentile vs league' });
  }
}

/* ---------------- PLAYER ---------------- */
export async function player(uid) {
  const PI = await players(); const p = PI.players.find(x => x.uid === uid); if (!p) return notFound();
  const code = p.league; const LG = LEAGUES[code]; accent(LG.c);
  const Ld = await lab(p.lab); const lp = Ld.players.find(x => x.uid === uid);
  const pid = p.demo ? p.uid : p.id;
  const shots = Ld.shots.filter(s => s[7] === pid);
  const keys = p.grp === 'GK' ? GKSET : OUTFIELD;
  const sim = similar(p, PI.players);
  const pool = PI.poolSizes[p.grp];
  const gmx = p.tot.g - p.tot.xg;
  setView(`
  <div class="crumbs"><a href="#/">Home</a><span>/</span><a href="#/lab/${p.lab}">${labName(p.lab)}</a>${p.demo ? '' : `<span>/</span><a href="#/lab/${p.lab}/team/${Ld.teams[p.tid].id}">${esc(p.team)}</a>`}</div>
  <div class="p-hero"><div style="display:flex;gap:20px;align-items:center"><div class="avatar" aria-hidden="true">${initials(p.n)}</div><div><h1 style="margin:.1em 0">${esc(p.n)}</h1>
    <div class="p-num"><span>${esc(p.team)}</span><span>${labName(p.lab)}</span><span>${GROUPS[p.grp]}${p.pos ? ' · ' + esc(p.pos) : ''}</span><span>${p.min.toLocaleString()} min · ${p.apps} apps</span></div></div></div>
    <div class="meta" style="display:flex;gap:10px;flex-wrap:wrap">${p.demo ? DEMO : REAL_SB + SB_CREDIT}<a class="btn" href="#/compare/${uid}/${sim[0]?.q.uid || ''}">Compare →</a></div></div>
  ${p.demo ? DEMO_BANNER('Demo player.') : ''}
  <div class="kpis">
    <div class="kpi"><b>${p.tot.g}</b><span>Goals (${p.tot.npg} non-pen)</span></div><div class="kpi"><b>${fmt(p.tot.xg, 1)}</b><span>xG (${fmt(p.tot.npxg, 1)} np)</span></div>
    <div class="kpi"><b style="color:${gmx >= 0 ? 'var(--win)' : 'var(--loss)'}">${gmx >= 0 ? '+' : ''}${fmt(gmx, 1)}</b><span>Goals minus xG</span></div>
    <div class="kpi"><b>${p.tot.ast}</b><span>Assists</span></div><div class="kpi"><b>${fmt(p.tot.xa, 1)}</b><span>xA</span></div><div class="kpi"><b>${p.tot.sh}</b><span>Shots</span></div>
  </div>
  <div class="grid g-7-5">
    <div class="card"><div class="card-head"><div><h3>Percentile pizza</h3><p class="sub">Per 90 vs ${pool} ${GROUPS[p.grp].toLowerCase()}s with 900+ minutes across all StatsBomb datasets here.${p.demo ? ' Demo values ranked against that real pool.' : ''}</p></div>
      <div class="legend-row">${(p.grp === 'GK' ? ['gk', 'pos', 'def'] : ['att', 'pos', 'def']).map(c => `<span><i style="background:${CAT[c][1]}"></i>${CAT[c][0]}</span>`).join('')}</div></div><div class="chart" id="pz" style="max-width:600px;margin:0 auto"></div></div>
    <div class="card"><h3>Per 90 breakdown</h3><p class="sub">Value per 90 and percentile.</p><div id="pl"></div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><div class="card-head"><div><h3>Shot map</h3><p class="sub">All ${shots.length} shots incl. penalties. Circle size = xG.</p></div>${p.demo ? DEMO : ''}</div><div class="chart" id="psm"></div></div>
    <div class="grid" style="align-content:start">
      <div class="card"><h3>Goals vs xG</h3><p class="sub">Cumulative across the season's appearances.</p><div class="chart" id="pcum"></div></div>
      <div class="card"><h3>Form trend</h3><p class="sub">Rolling 5-appearance xG + xA.</p><div class="chart" id="pform"></div></div>
    </div>
  </div>
  <div class="card" style="margin-top:18px"><div class="card-head"><div><h3>Similar profiles</h3><p class="sub">Closest percentile profiles among ${GROUPS[p.grp].toLowerCase()}s${p.demo ? ' (demo players only)' : ''}.</p></div></div><div class="grid g3" id="sim"></div></div>`);
  pizza($('#pz'), keys, p.p, p.v, { W: 560 });
  $('#pl').innerHTML = ['att', 'pos', 'def', 'gk'].map(c => { const ks = keys.filter(k => METRICS[k].cat === c); if (!ks.length) return '';
    return `<p class="kicker" style="margin:14px 0 6px;color:${CAT[c][1]}">${CAT[c][0]}</p>` + ks.map(k => `<div class="pctl"><span>${METRICS[k].l}</span><span class="val">${fmt(p.v[k], METRICS[k].d)}${METRICS[k].pct ? '%' : ''}</span><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:${p.p[k]}%;background:${CAT[c][1]}"></i></div><span class="pv">${p.p[k]}</span></div></div>`).join(''); }).join('');
  shotMap($('#psm'), shots, { W: 600, label: s => (s[4] === 'Pe' ? 'Penalty · ' : '') + (Ld.matches[s[9]] ? `vs ${Ld.teams[Ld.matches[s[9]][2] === p.tid ? Ld.matches[s[9]][3] : Ld.matches[s[9]][2]].name}` : p.n) });
  const log = lp ? lp.log : [];
  const cum = (a) => { let s = 0; return a.map(v => s += v); };
  lines($('#pcum'), [{ name: 'Goals', color: 'var(--acc)', values: [0, ...cum(log.map(l => l[2]))], w: 3, area: true }, { name: 'xG', color: 'rgba(255,255,255,.65)', values: [0, ...cum(log.map(l => l[3]))], dash: '4 5' }], { W: 600, H: 230, xLabel: 'Appearance', fmtY: d3.format('.0f') });
  lines($('#pform'), [{ name: 'xG + xA', color: 'var(--acc2)', values: rolling(log.map(l => l[3] + l[4]), 5), area: true }], { W: 600, H: 200, xLabel: 'Appearance', fmtY: d3.format('.2f') });
  $('#sim').innerHTML = sim.map(({ q, sim }) => `<div class="prow" style="border:1px solid var(--line)"><span class="rk" title="Similarity score">${Math.round(sim)}</span><a class="nm" href="#/player/${q.uid}"><b>${esc(q.n)}</b><span>${esc(q.team)} · ${labName(q.lab)}</span></a><a class="chip" href="#/compare/${uid}/${q.uid}">Compare</a></div>`).join('');
}

/* ---------------- PLAYERS EXPLORER ---------------- */
export async function explorer() {
  accent('#c6ff3d');
  const PI = await players(); const all = PI.players;
  setView(`<div class="phead"><div><p class="kicker">Player explorer</p><h1>Find the <em>outliers.</em></h1><p class="lead">Every player with 900+ minutes in the Event Lab datasets. Pick two metrics and click a dot to open the profile.</p></div></div>
  <div class="card"><div class="filters" style="margin-bottom:14px">
    <select id="fLab" aria-label="Dataset"><option value="">All real datasets</option>${['laliga', 'seriea', 'ligue1', 'bundesliga'].map(k => `<option value="${k}">${labName(k)}</option>`).join('')}<option value="demo">Demo players only</option></select>
    <select id="fGrp" aria-label="Position"><option value="">All outfield</option>${Object.entries(GROUPS).filter(([g]) => g !== 'GK').map(([g, n]) => `<option value="${g}">${n}</option>`).join('')}</select>
    <select id="fX" aria-label="X axis">${OUTFIELD.map(k => `<option value="${k}" ${k === 'npxg' ? 'selected' : ''}>X: ${METRICS[k].s}</option>`).join('')}</select>
    <select id="fY" aria-label="Y axis">${OUTFIELD.map(k => `<option value="${k}" ${k === 'xa' ? 'selected' : ''}>Y: ${METRICS[k].s}</option>`).join('')}</select>
    <input class="input" id="fQ" placeholder="Highlight a name…" aria-label="Highlight player">
    <span id="fDemo"></span></div><div class="chart" id="ex"></div></div>
  <div class="card" style="margin-top:18px"><h3>Top 25</h3><p class="sub" id="exSub"></p><div class="tbl-wrap"><table class="tbl" id="exT"></table></div></div>`);
  const draw = () => {
    const lb = $('#fLab').value, g = $('#fGrp').value, kx = $('#fX').value, ky = $('#fY').value, q = $('#fQ').value.trim().toLowerCase();
    $('#fDemo').innerHTML = lb === 'demo' ? DEMO : '';
    const ps = all.filter(p => p.grp !== 'GK' && (lb === 'demo' ? p.demo : !p.demo && (!lb || p.lab === lb)) && (!g || p.grp === g));
    const col = { laliga: LEAGUES.es.c, seriea: LEAGUES.it.c, ligue1: LEAGUES.fr.c, bundesliga: LEAGUES.de.c, 'demo-nl': LEAGUES.nl.c, 'demo-pt': LEAGUES.pt.c };
    scatter($('#ex'), ps.map(p => ({ x: p.v[kx], y: p.v[ky], label: p.n, sub: `${esc(p.team)} · ${labName(p.lab)} · ${GROUPS[p.grp]}`, color: col[p.lab], href: `/player/${p.uid}`, r: 4.5, hi: q && p.n.toLowerCase().includes(q), score: p.p[kx] + p.p[ky] })),
      { W: 1100, H: 560, xl: METRICS[kx].s + ' /90', yl: METRICS[ky].s + ' /90', labelTop: 12, fx: d3.format('.2~f'), fy: d3.format('.2~f') });
    const top = [...ps].sort((a, b) => (b.p[kx] + b.p[ky]) - (a.p[kx] + a.p[ky])).slice(0, 25);
    $('#exSub').textContent = `${ps.length} players. Ranked by combined percentile on ${METRICS[kx].s} and ${METRICS[ky].s}.`;
    $('#exT').innerHTML = `<thead><tr><th class="l">#</th><th class="l">Player</th><th class="l">Team</th><th>Pos</th><th>Min</th><th>${METRICS[kx].s}</th><th>pct</th><th>${METRICS[ky].s}</th><th>pct</th></tr></thead><tbody>${top.map((p, i) => `<tr style="--i:${i}"><td class="l pos">${i + 1}</td><td class="team l"><a class="tl" href="#/player/${p.uid}">${esc(p.n)}</a></td><td class="l" style="font-family:var(--f)">${esc(p.team)} <span class="mute small">${labName(p.lab)}</span></td><td>${p.grp}</td><td>${p.min.toLocaleString()}</td><td>${fmt(p.v[kx], METRICS[kx].d)}</td><td>${p.p[kx]}</td><td>${fmt(p.v[ky], METRICS[ky].d)}</td><td>${p.p[ky]}</td></tr>`).join('')}</tbody>`;
  };
  ['fLab', 'fGrp', 'fX', 'fY'].forEach(i => $('#' + i).onchange = draw); $('#fQ').oninput = draw; draw();
}

/* ---------------- COMPARE ---------------- */
export async function compare(a, b) {
  accent('#c6ff3d');
  const PI = await players(); const all = PI.players; const byId = new Map(all.map(p => [p.uid, p]));
  const def = n => all.find(p => p.n === n)?.uid;
  let A = byId.get(a) || byId.get(def('Lionel Messi')), B = byId.get(b) || byId.get(def('Cristiano Ronaldo'));
  if (A && B && A.uid === B.uid) B = similar(A, all, 1)[0]?.q || B;
  setView(`<div class="phead"><div><p class="kicker">Head to head</p><h1>Player <em>vs</em> player.</h1><p class="lead">Overlay two percentile profiles. Percentiles are per 90 against each player's own position group.</p></div></div>
  <div class="card"><div class="cmp-pick"><div class="picker" id="pa"></div><div class="vs">vs</div><div class="picker" id="pb"></div></div></div>
  <div id="cmpBody"></div>`);
  const picker = (el, cur, on) => {
    el.innerHTML = `<input class="input" value="${esc(cur.n)}" aria-label="Choose player" autocomplete="off"><ul hidden></ul>`;
    const inp = el.querySelector('input'), ul = el.querySelector('ul'); let items = [], hi = 0;
    const render = () => { const q = inp.value.trim().toLowerCase(); items = all.filter(p => !q || p.n.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)).slice(0, 30);
      ul.innerHTML = items.map((p, i) => `<li data-i="${i}" class="${i === hi ? 'on' : ''}">${esc(p.n)}${p.demo ? ' · demo' : ''}<span>${esc(p.team)} · ${labName(p.lab)}</span></li>`).join(''); ul.hidden = !items.length; };
    inp.onfocus = () => { inp.select(); hi = 0; render(); }; inp.oninput = () => { hi = 0; render(); };
    inp.onkeydown = e => { if (e.key === 'ArrowDown') { hi = Math.min(hi + 1, items.length - 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); render(); e.preventDefault(); } else if (e.key === 'Enter' && items[hi]) { on(items[hi]); ul.hidden = true; inp.blur(); } else if (e.key === 'Escape') { ul.hidden = true; inp.blur(); } };
    ul.onmousedown = e => { const li = e.target.closest('li'); if (li) { on(items[+li.dataset.i]); ul.hidden = true; } };
    inp.onblur = () => setTimeout(() => { ul.hidden = true; inp.value = cur.n; }, 150);
  };
  const go = () => { history.replaceState(null, '', `#/compare/${A.uid}/${B.uid}`); body(); picker($('#pa'), A, p => { A = p; go(); }); picker($('#pb'), B, p => { B = p; go(); }); };
  const body = async () => {
    const gk = A.grp === 'GK' || B.grp === 'GK'; const keys = gk ? GKSET : RADAR; const mk = gk ? GKSET : OUTFIELD;
    const ca = 'var(--acc)', cb = '#ff6bd6';
    $('#cmpBody').innerHTML = `${A.demo || B.demo ? DEMO_BANNER('One or both players are demo players.') : ''}
    <div class="grid g-5-7" style="margin-top:18px">
      <div class="card"><div class="legend-row" style="justify-content:center;margin-bottom:6px"><span><i style="background:${ca}"></i>${esc(A.n)}</span><span><i style="background:${cb}"></i>${esc(B.n)}</span></div><div class="chart" id="rad"></div></div>
      <div class="card"><h3>Per 90 head to head</h3><p class="sub">${esc(A.n)}: ${GROUPS[A.grp]}, ${labName(A.lab)}, ${A.min.toLocaleString()}′ · ${esc(B.n)}: ${GROUPS[B.grp]}, ${labName(B.lab)}, ${B.min.toLocaleString()}′</p><div class="mirror" id="mir"></div></div>
    </div>
    <div class="grid g2" style="margin-top:18px"><div class="card"><h3>${esc(A.n)}</h3><p class="sub">Shot map${A.demo ? ' (demo)' : ''}</p><div class="chart" id="sa"></div></div><div class="card"><h3>${esc(B.n)}</h3><p class="sub">Shot map${B.demo ? ' (demo)' : ''}</p><div class="chart" id="sb"></div></div></div>`;
    radar($('#rad'), keys, [{ name: A.n, color: ca, p: A.p }, { name: B.n, color: cb, p: B.p }], { W: 520 });
    $('#mir').innerHTML = mk.map(k => { const va = A.v[k], vb = B.v[k], mx = Math.max(va, vb) || 1; const d = METRICS[k].d;
      return `<div class="mrow"><span class="l" style="color:${va >= vb ? 'var(--text)' : 'var(--mute)'}">${fmt(va, d)}</span><div class="mbar left"><i style="width:${100 * va / mx}%;background:${ca};opacity:${va >= vb ? 1 : .45}"></i></div><span class="lab">${METRICS[k].s}</span><div class="mbar"><i style="width:${100 * vb / mx}%;background:${cb};opacity:${vb >= va ? 1 : .45}"></i></div><span class="r" style="color:${vb >= va ? 'var(--text)' : 'var(--mute)'}">${fmt(vb, d)}</span></div>`; }).join('');
    for (const [P, el, c] of [[A, '#sa', ca], [B, '#sb', cb]]) { const L = await lab(P.lab); const pid = P.demo ? P.uid : P.id; shotMap($(el), L.shots.filter(s => s[7] === pid), { W: 560, color: c, label: () => P.n }); }
  };
  go();
}

/* ---------------- ABOUT ---------------- */
export async function about() {
  accent('#c6ff3d'); const summ = await load('data/summary.json'); const PI = await players();
  setView(`<div class="phead"><div><p class="kicker">Sources &amp; method</p><h1>How it's <em>built.</em></h1></div></div>
  <div class="prose">
  <p>Football Lab is a static site: vanilla JavaScript modules, D3 for every chart, and pre-built JSON. No framework, no backend, no tracking. It's hosted on GitHub Pages.</p>
  <h3>Data sources</h3>
  <table><tr><th>What</th><th>Source</th><th>Status</th></tr>
  <tr><td>Fixtures, results, tables, form, points races (2025/26 and 2026/27, all six leagues)</td><td><a href="https://github.com/openfootball/football.json">openfootball/football.json</a>, CC0-1.0 public domain</td><td><span class="chip real">Real</span></td></tr>
  <tr><td>Shots, xG, xPts, PPDA, field tilt, player per-90s and percentiles: La Liga, Serie A, Ligue 1 2015/16; Bundesliga 2023/24 (Bayer Leverkusen matches only)</td><td><a href="https://github.com/statsbomb/open-data">StatsBomb Open Data</a>, used under the StatsBomb Public Data User Agreement for non-commercial analysis, with attribution</td><td><span class="chip real">Real</span></td></tr>
  <tr><td>Eredivisie and Liga Portugal player labs (players, per-90s, shots)</td><td>Generated by <code>scripts/build_lab.py</code> with a fixed seed. Names are invented.</td><td><span class="demo-chip">Demo data</span></td></tr></table>
  <p>The Event Lab seasons differ from the live-results seasons because StatsBomb only releases selected historical seasons openly. Each page names its season.</p>
  <h3>Event Lab coverage</h3>
  <table><tr><th>Dataset</th><th>Matches</th><th>Shots</th><th>Players 900+ min</th></tr>${Object.entries(summ).map(([k, s]) => `<tr><td>${labName(k)}</td><td>${s.matches}</td><td>${s.shots.toLocaleString()}</td><td>${s.players}</td></tr>`).join('')}</table>
  <h3>Method</h3>
  <ul>
  <li><b>Minutes</b> come from starting XIs, substitutions and red cards. <b>Position group</b> is wherever the player logged the most minutes (GK, CB, FB, CM, AM/W, FW).</li>
  <li><b>Percentiles</b> are per 90 against every player in the same position group with 900+ minutes, pooled across the four real datasets (${Object.entries(PI.poolSizes).map(([g, n]) => `${g} ${n}`).join(', ')}). Demo players are ranked against this real pool but are never added to it.</li>
  <li><b>xG</b> is StatsBomb's own model. <b>xA</b> is the xG of the shot a pass created. <b>xPts</b> are computed exactly from each match's shot xGs, treating every shot as an independent chance and building the scoreline probabilities from that.</li>
  <li><b>Progressive pass</b>: a completed open-play pass from x ≥ 48 that moves the ball at least 25% closer to goal. <b>Progressive carry</b>: at least 10 yards forward, ending in the opposition half.</li>
  <li><b>PPDA</b>: opponent passes in their own 60% of the pitch, divided by our tackles, interceptions and fouls in that zone. <b>Field tilt</b>: our share of passes into the final third.</li>
  <li><b>League tables</b> use points, then goal difference, then goals scored. Official head-to-head tiebreakers aren't applied.</li>
  </ul>
  <h3>Credits &amp; independence</h3>
  <p>${SB_CREDIT}</p><p>Event data provided by StatsBomb. This project is inspired by football visual sites such as DataMB, but it is independent: it uses none of their code, images or data. There are no betting or odds features.</p>
  <p>Built by <a href="https://josephbepocode.github.io/josephbepo/">Joseph Bepo</a> · <a href="https://github.com/josephbepocode/football-lab">source on GitHub</a>.</p>
  </div>`);
}
export function notFound() { setView(`<div class="empty"><h2>Not found.</h2><p>That page doesn't exist. <a href="#/" style="color:var(--acc)">Go home</a></p></div>`); }
