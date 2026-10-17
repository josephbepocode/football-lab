// Data layer: loaders, league metadata, derived metrics. All numbers come from the JSON in /data.
export const LEAGUES = {
  es: { name: 'La Liga', country: 'Spain', c: '#ff5a3c', lab: 'laliga' },
  de: { name: 'Bundesliga', country: 'Germany', c: '#d4ff3a', lab: 'bundesliga' },
  it: { name: 'Serie A', country: 'Italy', c: '#4d94ff', lab: 'seriea' },
  fr: { name: 'Ligue 1', country: 'France', c: '#b18cff', lab: 'ligue1' },
  nl: { name: 'Eredivisie', country: 'Netherlands', c: '#ff9a2e', lab: 'demo-nl' },
  pt: { name: 'Liga Portugal', country: 'Portugal', c: '#2fe39a', lab: 'demo-pt' },
};
export const SEASONS = [
  { id: '2026-27', label: '2026/27', note: 'In progress' },
  { id: '2025-26', label: '2025/26', note: 'Final' },
];
export const LAB_LEAGUE = { laliga: 'es', seriea: 'it', ligue1: 'fr', bundesliga: 'de', 'demo-nl': 'nl', 'demo-pt': 'pt' };
export const GROUPS = { GK: 'Goalkeeper', CB: 'Centre-back', FB: 'Full-back', CM: 'Midfielder', AM: 'Winger / AM', FW: 'Forward' };
export const METRICS = {
  npg: { l: 'Non-penalty goals', s: 'NP goals', cat: 'att', d: 2 },
  npxg: { l: 'Non-penalty xG', s: 'npxG', cat: 'att', d: 2 },
  sh: { l: 'Shots (non-penalty)', s: 'Shots', cat: 'att', d: 2 },
  xa: { l: 'Expected assists (xA)', s: 'xA', cat: 'att', d: 2 },
  kp: { l: 'Key passes', s: 'Key passes', cat: 'att', d: 2 },
  tbox: { l: 'Receptions in box', s: 'Box touches', cat: 'att', d: 2 },
  prog: { l: 'Progressive passes', s: 'Prog. passes', cat: 'pos', d: 2 },
  pcar: { l: 'Progressive carries', s: 'Prog. carries', cat: 'pos', d: 2 },
  drc: { l: 'Successful dribbles', s: 'Dribbles', cat: 'pos', d: 2 },
  pcp: { l: 'Pass completion %', s: 'Pass %', cat: 'pos', d: 1, pct: true },
  pbox: { l: 'Passes + carries into box', s: 'Box entries', cat: 'pos', d: 2 },
  tkw: { l: 'Tackles won', s: 'Tackles won', cat: 'def', d: 2 },
  int: { l: 'Interceptions', s: 'Interceptions', cat: 'def', d: 2 },
  rec: { l: 'Ball recoveries', s: 'Recoveries', cat: 'def', d: 2 },
  prs: { l: 'Pressures', s: 'Pressures', cat: 'def', d: 1 },
  aerw: { l: 'Aerial duels won', s: 'Aerials won', cat: 'def', d: 2 },
  sav: { l: 'Saves', s: 'Saves', cat: 'gk', d: 2 },
  svp: { l: 'Save %', s: 'Save %', cat: 'gk', d: 1, pct: true },
  gc: { l: 'Goals conceded (lower is better)', s: 'Conceded', cat: 'gk', d: 2 },
  pa: { l: 'Passes attempted', s: 'Passes', cat: 'pos', d: 1 },
};
export const OUTFIELD = ['npg', 'npxg', 'sh', 'xa', 'kp', 'tbox', 'prog', 'pcar', 'drc', 'pcp', 'pbox', 'tkw', 'int', 'rec', 'prs', 'aerw'];
export const GKSET = ['sav', 'svp', 'gc', 'pa', 'pcp', 'rec'];
export const RADAR = ['npxg', 'sh', 'xa', 'kp', 'prog', 'pcar', 'drc', 'tkw', 'int', 'prs'];
export const CAT = { att: ['Attacking', 'var(--att)'], pos: ['Possession', 'var(--pos)'], def: ['Defending', 'var(--def)'], gk: ['Goalkeeping', 'var(--gk)'] };
export const OUTCOME = { Go: 'Goal', Sa: 'Saved', Bl: 'Blocked', Of: 'Off target', Wa: 'Off target', Po: 'Hit post', Sv: 'Saved' };
export const SHOT_TYPE = { Op: 'Open play', Pe: 'Penalty', Fr: 'Free kick', Co: 'Corner', Ki: 'Kick-off' };
export const BODY = { L: 'Left foot', R: 'Right foot', H: 'Head', O: 'Other' };

const cache = new Map();
export function load(path) {
  if (!cache.has(path)) cache.set(path, fetch(path).then(r => { if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); }));
  return cache.get(path);
}
export const results = (code, season) => load(`data/results/${season}_${code}.json`);
export const lab = key => load(`data/lab/${key}.json`);
export const players = () => load('data/players.json');

export const fmt = (v, d = 2) => (v == null || isNaN(v)) ? '–' : (+v).toFixed(d);
export const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
export const initials = n => n.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
export function crestColor(name) { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 70% 62%)`; }
export const crest = name => `<span class="crest" style="background:${crestColor(name)}" aria-hidden="true">${esc(initials(name.replace(/^(FC|AC|AS|SS|SSC|US|RC|RCD|CA|CD|SC|SV|VfB|VfL|TSG|OGC)\s/, '')))}</span>`;

/** League table from openfootball-style matches [date, round, home, away, hg, ag]. Tiebreak: pts, GD, GF (simplified). */
export function standings(d, filter = () => true) {
  const T = d.teams.map((t, i) => ({ ...t, i, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, seq: [], hist: [] }));
  const played = d.matches.filter(m => m.length >= 6 && filter(m)).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]);
  for (const m of played) {
    const [date, rd, h, a, hg, ag] = m;
    for (const [t, gf, ga, home, opp] of [[T[h], hg, ag, 1, a], [T[a], ag, hg, 0, h]]) {
      const r = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
      t.P++; t[r]++; t.GF += gf; t.GA += ga; t.Pts += r === 'W' ? 3 : r === 'D' ? 1 : 0;
      t.seq.push({ date, rd, r, gf, ga, home, opp }); t.hist.push(t.Pts);
    }
  }
  T.forEach(t => { t.GD = t.GF - t.GA; t.form = t.seq.slice(-5).map(s => s.r); });
  T.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.short.localeCompare(b.short));
  T.forEach((t, k) => t.pos = k + 1);
  return T;
}
/** Exact goal distribution from a list of shot xG values (Poisson-binomial). */
function goalDist(xgs) { let p = [1]; for (const x of xgs) { const n = new Array(p.length + 1).fill(0); p.forEach((v, k) => { n[k] += v * (1 - x); n[k + 1] += v * x; }); p = n; } return p; }
export function matchProbs(hx, ax) {
  const H = goalDist(hx), A = goalDist(ax); let w = 0, dr = 0, l = 0;
  H.forEach((ph, i) => A.forEach((pa, j) => { const p = ph * pa; if (i > j) w += p; else if (i === j) dr += p; else l += p; }));
  return [w, dr, l];
}
/** Lab table: real results + xG + shot-simulated expected points. matches: [date, wk, h, a, hs, as, hxg, axg, hnpxg, anpxg] */
export function labTable(L) {
  const byMatch = L.matches.map(() => [[], []]);
  for (const s of L.shots) { const m = L.matches[s[9]]; if (!m) continue; byMatch[s[9]][s[8] === m[2] ? 0 : 1].push(s[2]); }
  const T = L.teams.map((t, i) => ({ ...t, i, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, xG: 0, xGA: 0, npxG: 0, npxGA: 0, xPts: 0, seq: [] }));
  L.matches.forEach((m, mi) => {
    const [date, wk, h, a, hs, as, hx, ax, hnp, anp] = m; const [ph, dr, pa] = matchProbs(byMatch[mi][0], byMatch[mi][1]);
    for (const [t, gf, ga, xg, xga, np, npa, xp, home, opp] of [[T[h], hs, as, hx, ax, hnp, anp, 3 * ph + dr, 1, a], [T[a], as, hs, ax, hx, anp, hnp, 3 * pa + dr, 0, h]]) {
      const r = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
      t.P++; t[r]++; t.GF += gf; t.GA += ga; t.Pts += r === 'W' ? 3 : r === 'D' ? 1 : 0;
      t.xG += xg; t.xGA += xga; t.npxG += np; t.npxGA += npa; t.xPts += xp;
      t.seq.push({ date, wk, r, gf, ga, xg, xga, np, npa, xp, home, opp, mi });
    }
  });
  T.forEach(t => { t.GD = t.GF - t.GA; t.form = t.seq.slice(-5).map(s => s.r); });
  const ranked = T.filter(t => t.P > 0).sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
  ranked.forEach((t, k) => t.pos = k + 1);
  return ranked;
}
export function rolling(arr, k) { return arr.map((_, i) => { const s = arr.slice(Math.max(0, i - k + 1), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; }); }
export function similar(p, all, n = 6) {
  const keys = p.grp === 'GK' ? GKSET : OUTFIELD;
  const v = keys.map(k => p.p[k] || 0);
  return all.filter(q => q.uid !== p.uid && q.grp === p.grp && !!q.demo === !!p.demo)
    .map(q => { const w = keys.map(k => q.p[k] || 0); const d = Math.sqrt(v.reduce((s, x, i) => s + (x - w[i]) ** 2, 0)); return { q, sim: Math.max(0, 100 - d / Math.sqrt(keys.length)) }; })
    .sort((a, b) => b.sim - a.sim).slice(0, n);
}
