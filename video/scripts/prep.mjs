// Extract the real data the clips need from ../data into src/clipdata.json. No numbers are created here, only selected/aggregated.
import fs from 'fs';
const J = p => JSON.parse(fs.readFileSync(new URL('../../' + p, import.meta.url)));
const R = J('data/results/2026-27_es.json');
const played = R.matches.filter(m => m.length >= 6).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const rounds = [...new Set(played.map(m => m[1]))].sort((a, b) => a - b);
const pts = R.teams.map(() => 0), gd = R.teams.map(() => 0), frames = [];
for (const rd of rounds) {
  for (const [, r, h, a, hg, ag] of played.filter(m => m[1] === rd)) { pts[h] += hg > ag ? 3 : hg === ag ? 1 : 0; pts[a] += ag > hg ? 3 : hg === ag ? 1 : 0; gd[h] += hg - ag; gd[a] += ag - hg; }
  frames.push({ round: rd, pts: [...pts], gd: [...gd] });
}
const race = { teams: R.teams.map(t => t.short), frames, played: played.length, updated: R.updated || R.built, season: '2026/27' };
const B = J('data/live/barca.json'); const latest = B.matches[0];
const det = J(`data/live/matches/${latest.id}.json`);
const timeline = { ...latest, shots: det.shots, stats: det.stats, source: det.source };
const P = J('data/players.json').players; const RAD = ['npxg', 'sh', 'xa', 'kp', 'prog', 'pcar', 'drc', 'tkw', 'int', 'prs'];
const LBL = { npxg: 'npxG', sh: 'Shots', xa: 'xA', kp: 'Key passes', prog: 'Prog. passes', pcar: 'Prog. carries', drc: 'Dribbles', tkw: 'Tackles won', int: 'Interceptions', prs: 'Pressures' };
const pick = n => { const p = P.find(x => x.n === n && !x.demo); return { n: p.n, team: p.team, min: p.min, grp: p.grp, p: RAD.map(k => p.p[k] ?? 0), v: RAD.map(k => p.v[k] ?? 0) }; };
const radar = { keys: RAD.map(k => LBL[k]), a: pick('Lionel Messi'), b: pick('Cristiano Ronaldo'), season: 'La Liga 2015/16' };
const L = J('data/lab/laliga.json'); const rm = L.teams.findIndex(t => t.id === 'real-madrid'), fcb = L.teams.findIndex(t => t.id === 'barcelona');
const mi = L.matches.findIndex(m => m[0] === '2015-11-21' && m[2] === rm && m[3] === fcb); const names = new Map(L.players.map(p => [p.id, p.n]));
const sh = L.shots.filter(s => s[9] === mi).map(s => ({ min: s[6], xg: s[2], goal: s[3] === 'Go', team: s[8] === fcb ? 'fcb' : 'rm', player: names.get(s[7]) || '' })).sort((a, b) => a.min - b.min);
const clasico = { shots: sh, score: [L.matches[mi][4], L.matches[mi][5]], xg: [L.matches[mi][6], L.matches[mi][7]] };
fs.writeFileSync(new URL('../src/clipdata.json', import.meta.url), JSON.stringify({ race, timeline, radar, clasico }));
console.log('rounds', rounds.length, 'timeline', latest.id, det.shots.length, 'clasico shots', sh.length);
