import { LEAGUES, LAB_LEAGUE, players, esc } from './data.js';
import * as V from './views.js';
import * as X from './extra.js';
const $ = s => document.querySelector(s);
// league nav
$('#leagueNav').innerHTML = Object.entries(LEAGUES).map(([c, L]) => `<a href="#/league/${c}/2026-27" data-c="${c}" style="--c:${L.c}"><i></i>${L.name}</a>`).join('');
function markNav(code, path) {
  document.querySelectorAll('#leagueNav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.c === code));
  document.querySelectorAll('.navlink').forEach(a => a.toggleAttribute('aria-current', path.startsWith(a.getAttribute('href').slice(2))));
}
async function route() {
  const path = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  let code = null;
  try {
    const run = async () => {
      switch (parts[0]) {
        case undefined: return V.home();
        case 'league': code = parts[1]; return V.league(parts[1], parts[2]);
        case 'team': code = parts[1]; return V.team(parts[1], parts[2], parts[3]);
        case 'lab': code = LAB_LEAGUE[parts[1]]; return parts[2] === 'team' ? V.labTeam(parts[1], parts[3]) : V.labView(parts[1]);
        case 'player': { const P = await players(); code = P.players.find(p => p.uid === parts[1])?.league; return V.player(parts[1]); }
        case 'players': return V.explorer();
        case 'compare': return V.compare(parts[1], parts[2]);
        case 'about': return V.about();
        case 'barca': code = 'es'; return parts[1] ? X.barcaMatch(parts[1]) : X.barcaList();
        case 'fixtures': code = 'es'; return X.fixtures();
        case 'weekly': code = 'es'; return X.weekly(parts[1]);
        case 'clasico-2015': code = 'es'; return X.clasico();
        default: return V.notFound();
      }
    };
    let done = false; window.__onRender = () => { done = true; };
    const t = setTimeout(() => { if (!done) document.getElementById('view').innerHTML = '<div class="loading"><i></i></div>'; }, 150);
    await run();
    clearTimeout(t);
  } catch (e) {
    console.error(e.stack); document.getElementById('view').innerHTML = `<div class="empty"><h2>Something went wrong.</h2><p class="mono small">${esc(e.message)}</p></div>`;
  }
  const hist = { lab: 1, player: 1, players: 1, compare: 1, 'clasico-2015': 1 }[parts[0]];
  const seasonLbl = parts[0] === 'lab' ? V.labName(parts[1]) : parts[0] === 'clasico-2015' ? 'La Liga 2015/16' : 'La Liga, Serie A, Ligue 1 2015/16 · Bundesliga 2023/24';
  try { await X.updatedStrip(hist ? 'hist' : (['barca', 'fixtures', 'weekly'].includes(parts[0]) || (code === 'es' && parts[0] !== 'lab') || !parts[0]) ? 'es' : 'other', seasonLbl); } catch (e) { console.error(e); }
  setTimeout(X.addExportButtons, 1200);
  markNav(code, path);
  document.title = (document.querySelector('#view h1')?.textContent.trim() || 'Football Lab').replace(/\s+/g, ' ') + ' · Football Lab';
  window.scrollTo({ top: 0, behavior: 'instant' });
}
addEventListener('hashchange', route); route();
// command palette
const pal = $('#palette'), inp = $('#paletteInput'), list = $('#paletteList'); let items = [], hi = 0, base = null;
async function buildIndex() {
  if (base) return base;
  const P = (await players()).players;
  const teams = new Map();
  const res = await Promise.all(Object.keys(LEAGUES).map(c => fetch(`data/results/2026-27_${c}.json`).then(r => r.json()).then(d => [c, d])));
  res.forEach(([c, d]) => d.teams.forEach(t => teams.set(c + t.id, { t: t.short, s: `${LEAGUES[c].name} · team · 2026/27`, h: `#/team/${c}/2026-27/${t.id}` })));
  base = [...Object.entries(LEAGUES).map(([c, L]) => ({ t: L.name, s: `League · ${L.country}`, h: `#/league/${c}/2026-27` })), ...teams.values(),
    ...P.map(p => ({ t: p.n, s: `${p.team} · ${V.labName(p.lab)}${p.demo ? ' · DEMO' : ''}`, h: `#/player/${p.uid}` }))];
  return base;
}
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function renderPal() {
  const q = norm(inp.value.trim()); const all = await buildIndex();
  items = (q ? all.filter(x => norm(x.t).includes(q) || norm(x.s).includes(q)).sort((a, b) => norm(a.t).indexOf(q) - norm(b.t).indexOf(q)) : all.slice(0, 6)).slice(0, 40);
  hi = Math.min(hi, Math.max(0, items.length - 1));
  list.innerHTML = items.map((x, i) => `<li class="${i === hi ? 'on' : ''}" role="option"><a href="${x.h}">${esc(x.t)}<span>${esc(x.s)}</span></a></li>`).join('') || '<li class="empty">No matches</li>';
}
const openPal = () => { pal.hidden = false; inp.value = ''; hi = 0; renderPal(); setTimeout(() => inp.focus(), 10); };
const closePal = () => { pal.hidden = true; };
$('#searchBtn').onclick = openPal;
pal.onclick = e => { if (e.target === pal || e.target.closest('a')) closePal(); };
inp.oninput = () => { hi = 0; renderPal(); };
addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
  else if (e.key === '/' && pal.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openPal(); }
  if (pal.hidden) return;
  if (e.key === 'Escape') closePal();
  else if (e.key === 'ArrowDown') { hi = Math.min(hi + 1, items.length - 1); renderPal(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); renderPal(); e.preventDefault(); }
  else if (e.key === 'Enter' && items[hi]) { location.hash = items[hi].h; closePal(); }
});
