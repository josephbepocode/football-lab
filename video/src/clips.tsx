import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import D from './clipdata.json';
const C = { bg: '#0b0d12', panel: '#14171f', line: 'rgba(255,255,255,.12)', text: '#e9edf5', mute: '#8a93a6', acc: '#c6ff3d', fcb: '#ff5a3c', rm: '#e9edf5', b: '#ff6bd6', saved: '#5ee7ff', blocked: '#ff6b9a' };
const font = 'Inter, "Helvetica Neue", Arial, sans-serif', mono = '"JetBrains Mono", "DejaVu Sans Mono", monospace';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
/** Shared frame. Transition ideas (general UI-motion patterns, no assets copied): masked wipe-in header, staggered rise, spring scale, count-up numbers, outro slide. */
const Frame: React.FC<{ kicker: string; title: string; sub?: string; credit: string; sb?: boolean; children: (box: { w: number; h: number }) => React.ReactNode }> = ({ kicker, title, sub, credit, sb, children }) => {
  const f = useCurrentFrame(); const { width: W, height: H, durationInFrames: N, fps } = useVideoConfig();
  const port = H > W; const pad = port ? 64 : 96; const s = port ? 0.9 : 1;
  const wipe = interpolate(f, [0, 18], [0, 100], { ...clamp, easing: ease });
  const rise = (d: number) => ({ opacity: interpolate(f, [d, d + 14], [0, 1], clamp), transform: `translateY(${interpolate(f, [d, d + 18], [24, 0], { ...clamp, easing: ease })}px)` });
  const out = interpolate(f, [N - 12, N], [1, 0], clamp);
  const headH = (port ? 260 : 230) * s, footH = 120 * s;
  return <AbsoluteFill style={{ background: C.bg, fontFamily: font, color: C.text, opacity: out }}>
    <div style={{ position: 'absolute', top: 0, left: 0, height: 8, width: `${wipe}%`, background: C.acc }} />
    <div style={{ position: 'absolute', left: pad, right: pad, top: pad * 0.7 }}>
      <div style={{ ...rise(4), fontFamily: mono, fontSize: 24 * s, letterSpacing: 3, color: C.acc, textTransform: 'uppercase' }}>{kicker}</div>
      <div style={{ clipPath: `inset(0 ${100 - interpolate(f, [8, 30], [0, 100], { ...clamp, easing: ease })}% 0 0)`, fontSize: (port ? 66 : 76) * s, fontWeight: 800, letterSpacing: -1.5, marginTop: 10, lineHeight: 1.05 }}>{title}</div>
      {sub && <div style={{ ...rise(20), fontSize: 28 * s, color: C.mute, marginTop: 12 }}>{sub}</div>}
    </div>
    <div style={{ position: 'absolute', left: pad, right: pad, top: headH + pad * 0.5, bottom: footH + pad * 0.4 }}>{children({ w: W - 2 * pad, h: H - headH - footH - pad * 0.9 })}</div>
    <div style={{ position: 'absolute', left: pad, right: pad, bottom: pad * 0.55, height: footH * 0.8, borderTop: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...rise(30) }}>
      <div><div style={{ fontWeight: 800, fontSize: 30 * s, color: C.acc }}>Football Lab · bepojoseph.xyz</div><div style={{ fontFamily: mono, fontSize: 19 * s, color: C.mute, marginTop: 6 }}>Data: {credit}</div></div>
      {sb && <Img src={staticFile('statsbomb-logo.png')} style={{ height: 44 * s }} />}
    </div>
  </AbsoluteFill>;
};
const fmt = (v: number, d = 0) => v.toFixed(d);

/* 1. La Liga table race (bar chart race by matchday) */
export const TableRace: React.FC = () => {
  const f = useCurrentFrame(); const { durationInFrames: N } = useVideoConfig(); const R = D.race; const F = R.frames;
  const t = interpolate(f, [30, N - 70], [0, F.length - 1], clamp); const i = Math.floor(t), k = t - i; const a = F[i], b = F[Math.min(i + 1, F.length - 1)];
  const cur = R.teams.map((_, j) => a.pts[j] + (b.pts[j] - a.pts[j]) * k);
  const order = (fr: typeof a) => R.teams.map((_, j) => j).sort((x, y) => fr.pts[y] - fr.pts[x] || fr.gd[y] - fr.gd[x] || R.teams[x].localeCompare(R.teams[y]));
  const ra = order(a), rb = order(b); const rank = (j: number) => ra.indexOf(j) + (rb.indexOf(j) - ra.indexOf(j)) * ease(k);
  const mx = Math.max(...F[F.length - 1].pts); const shown = 20;
  return <Frame kicker={`La Liga ${R.season} · near-live`} title="The table race" sub={`Points after each matchday · Matchday ${b.round}${b.round === F[F.length - 1].round ? ' (latest, may be partial)' : ''}`} credit={`openfootball (CC0) + ESPN public scoreboard · ${R.played} matches · updated ${String(R.updated).slice(0, 10)}`}>
    {({ w, h }) => { const rh = h / shown; return <div style={{ position: 'relative', width: w, height: h }}>
      {R.teams.map((n, j) => { const r = rank(j); const op = interpolate(f, [20 + j, 34 + j], [0, 1], clamp); const bw = (w - 330) * cur[j] / mx;
        const barca = n === 'Barcelona', rmd = n === 'Real Madrid';
        return <div key={n} style={{ position: 'absolute', top: r * rh, left: 0, height: rh * 0.78, display: 'flex', alignItems: 'center', opacity: op }}>
          <div style={{ width: 50, fontFamily: mono, fontSize: rh * 0.42, color: C.mute }}>{Math.round(r) + 1}</div>
          <div style={{ width: 250, fontSize: rh * 0.48, fontWeight: barca || rmd ? 800 : 500 }}>{n}</div>
          <div style={{ width: Math.max(2, bw), height: '100%', borderRadius: 6, background: barca ? C.fcb : rmd ? C.rm : 'rgba(255,255,255,.22)' }} />
          <div style={{ marginLeft: 12, fontFamily: mono, fontSize: rh * 0.45, fontWeight: 700 }}>{Math.round(cur[j])}</div>
        </div>; })}
    </div>; }}
  </Frame>;
};

/* 2. Barça match shot timeline (ESPN) */
const OC: Record<string, string> = { Goal: C.acc, 'Own goal': C.acc, Saved: C.saved, Missed: 'rgba(255,255,255,.55)', Blocked: C.blocked };
export const ShotTimeline: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const T = D.timeline as any;
  const clock = interpolate(f, [30, 280], [0, 95], clamp);
  return <Frame kicker={`La Liga 2026/27 · Matchday ${T.round} · ${T.date}`} title={`${T.home} ${T.hg}–${T.ag} ${T.away}`} sub={`Every shot by minute (${T.shots.length}) · ESPN has no free xG, so shots are unweighted`} credit="ESPN public match summary + openfootball (CC0)">
    {({ w, h }) => { const l = 230, x = (m: number) => l + (w - l - 20) * m / 95; const mid = h * 0.45; const st: Record<string, number> = {};
      const goals = (sd: string) => T.shots.filter((s: any) => s.side === sd && /Goal/.test(s.outcome) && s.min <= clock).length;
      return <svg width={w} height={h}>
        <line x1={l} x2={x(clock)} y1={mid} y2={mid} stroke="rgba(255,255,255,.45)" strokeWidth={3} />
        {[45, 90].map(v => <line key={v} x1={x(v)} x2={x(v)} y1={mid - h * 0.38} y2={mid + h * 0.38} stroke={C.line} strokeDasharray="6 8" />)}
        {[0, 15, 30, 45, 60, 75, 90].map(v => <text key={v} x={x(v)} y={h * 0.92} fill={C.mute} fontSize={24} fontFamily={mono} textAnchor="middle">{v}'</text>)}
        <text x={0} y={mid - 30} fill={C.text} fontSize={34} fontWeight={800}>{T.home}</text><text x={0} y={mid - 70} fill={C.acc} fontSize={52} fontWeight={800} fontFamily={mono}>{goals('h')}</text>
        <text x={0} y={mid + 52} fill={C.text} fontSize={34} fontWeight={800}>{T.away}</text><text x={0} y={mid + 110} fill={C.acc} fontSize={52} fontWeight={800} fontFamily={mono}>{goals('a')}</text>
        {T.shots.map((s: any, i: number) => { const key = s.side + s.min; st[key] = (st[key] || 0) + 1; const appear = 30 + (s.min / 95) * 250;
          const sc = spring({ frame: f - appear, fps, config: { damping: 12 } }); const big = /Goal/.test(s.outcome); const y = s.side === 'h' ? mid - 28 - (st[key] - 1) * 30 : mid + 28 + (st[key] - 1) * 30;
          return <g key={i} transform={`translate(${x(s.min)},${y}) scale(${sc})`}><circle r={big ? 15 : 11} fill={OC[s.outcome] || '#fff'} stroke={C.bg} strokeWidth={3} />
            {big && sc > 0.9 && <text y={(s.side === 'h' ? -26 : 40) + (s.side === 'h' ? -1 : 1) * (T.shots.filter((q: any) => /Goal/.test(q.outcome) && q.side === s.side).indexOf(s) % 2) * 28} fill={C.text} fontSize={20} textAnchor="middle" fontWeight={600}>{s.player.split(' ').slice(-1)[0]} {s.clock}</text>}</g>; })}
        {Object.entries({ Goal: C.acc, Saved: C.saved, Missed: OC.Missed, Blocked: C.blocked }).map(([k2, c], i) => <g key={k2} transform={`translate(${l + i * 170},${h - 4})`}><circle r={10} cy={-8} fill={c} /><text x={20} fill={C.mute} fontSize={22}>{k2}</text></g>)}
      </svg>; }}
  </Frame>;
};

/* 3. Player radar compare (StatsBomb, historical) */
export const RadarCompare: React.FC = () => {
  const f = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const R = D.radar;
  const g = spring({ frame: f - 30, fps, config: { damping: 18, mass: 1.2 } }), g2 = spring({ frame: f - 60, fps, config: { damping: 18, mass: 1.2 } });
  return <Frame kicker={`Historical · ${R.season} · percentiles vs position group`} title={`${R.a.n} vs ${R.b.n}`} sub={`${R.a.team} · ${R.a.min.toLocaleString()} min   |   ${R.b.team} · ${R.b.min.toLocaleString()} min`} credit="StatsBomb Open Data (Hudl StatsBomb) · historical" sb>
    {({ w, h }) => { const port = height > width; const r = Math.min(port ? w - 260 : w * 0.55 - 160, port ? h * 0.62 : h) / 2 - 60; const cx = port ? w / 2 : r + 150, cy = port ? r + 70 : h / 2; const n = R.keys.length;
      const pt = (i: number, v: number) => [cx + Math.sin(2 * Math.PI * i / n) * r * v / 100, cy - Math.cos(2 * Math.PI * i / n) * r * v / 100];
      const poly = (p: number[], s: number) => p.map((v, i) => pt(i, v * s).join(',')).join(' ');
      return <div style={{ position: 'relative', width: w, height: h }}><svg width={w} height={h} style={{ position: 'absolute' }}>
        {[25, 50, 75, 100].map(q => <polygon key={q} points={R.keys.map((_, i) => pt(i, q).join(',')).join(' ')} fill="none" stroke={C.line} />)}
        {R.keys.map((k, i) => { const [x, y] = pt(i, 118); return <text key={k} x={x} y={y} fill={C.mute} fontSize={22} textAnchor="middle" dominantBaseline="middle" opacity={interpolate(f, [20 + i * 2, 34 + i * 2], [0, 1], clamp)}>{k}</text>; })}
        <polygon points={poly(R.a.p, g)} fill={C.acc + '40'} stroke={C.acc} strokeWidth={4} /><polygon points={poly(R.b.p, g2)} fill={C.b + '33'} stroke={C.b} strokeWidth={4} />
      </svg>
        <div style={{ position: 'absolute', ...(port ? { left: 0, right: 0, top: 2 * r + 150 } : { right: 0, top: 30, width: w * 0.38 }), fontSize: port ? 22 : 26 }}>
          <div style={{ display: 'flex', fontFamily: mono, color: C.mute, fontSize: 20, marginBottom: 8 }}><span style={{ flex: 1 }}>Percentile</span><span style={{ width: 90, color: C.acc, textAlign: 'right' }}>{R.a.n.split(' ').slice(-1)}</span><span style={{ width: 110, color: C.b, textAlign: 'right' }}>{R.b.n.split(' ').slice(-1)}</span></div>
          {R.keys.slice(0, port ? 5 : 10).map((k, i) => <div key={k} style={{ display: 'flex', padding: '6px 0', borderTop: `1px solid ${C.line}`, opacity: interpolate(f, [80 + i * 6, 92 + i * 6], [0, 1], clamp) }}>
            <span style={{ flex: 1 }}>{k}</span><span style={{ width: 90, textAlign: 'right', fontFamily: mono, fontWeight: R.a.p[i] >= R.b.p[i] ? 800 : 400 }}>{Math.round(R.a.p[i] * interpolate(f, [80 + i * 6, 110 + i * 6], [0, 1], clamp))}</span><span style={{ width: 110, textAlign: 'right', fontFamily: mono, fontWeight: R.b.p[i] >= R.a.p[i] ? 800 : 400 }}>{Math.round(R.b.p[i] * interpolate(f, [80 + i * 6, 110 + i * 6], [0, 1], clamp))}</span></div>)}
        </div></div>; }}
  </Frame>;
};

/* 4. Clásico 2015 xG flow (StatsBomb, historical) */
export const ClasicoXG: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const K = D.clasico;
  const clock = interpolate(f, [30, 300], [0, 95], clamp);
  return <Frame kicker="Historical · La Liga 2015/16 · 21 Nov 2015 · Bernabéu" title={`Real Madrid ${K.score[0]}–${K.score[1]} Barcelona`} sub="Cumulative StatsBomb xG by minute (all shots incl. penalties) · dots = goals" credit="StatsBomb Open Data (Hudl StatsBomb) · historical match, not current season" sb>
    {({ w, h }) => { const l = 70, rr = 260; const mxg = Math.max(...K.xg) * 1.15; const x = (m: number) => l + (w - l - rr) * m / 95, y = (v: number) => h - 50 - (h - 80) * v / mxg;
      const series = (['fcb', 'rm'] as const).map(t => { let c = 0; const pts: [number, number, boolean][] = [[0, 0, false]]; K.shots.filter(s => s.team === t && s.min <= clock).forEach(s => { pts.push([s.min, c, false]); c += s.xg; pts.push([s.min, c, s.goal]); }); pts.push([clock, c, false]); return { t, pts, c }; });
      return <svg width={w} height={h}>
        {[0, 0.5, 1, 1.5, 2, 2.5].filter(v => v <= mxg).map(v => <g key={v}><line x1={l} x2={w - rr} y1={y(v)} y2={y(v)} stroke={C.line} /><text x={l - 12} y={y(v) + 7} fill={C.mute} fontSize={20} fontFamily={mono} textAnchor="end">{v.toFixed(1)}</text></g>)}
        {[0, 15, 30, 45, 60, 75, 90].map(v => <text key={v} x={x(v)} y={h - 14} fill={C.mute} fontSize={22} fontFamily={mono} textAnchor="middle">{v}'</text>)}
        {series.map(s => { const col = s.t === 'fcb' ? C.fcb : C.rm; const last = s.pts[s.pts.length - 1];
          return <g key={s.t}><path d={'M' + s.pts.map(p => `${x(p[0])},${y(p[1])}`).join('L')} fill="none" stroke={col} strokeWidth={5} />
            {s.pts.filter(p => p[2]).map((p, i) => { const sc = spring({ frame: f - (30 + p[0] / 95 * 270), fps, config: { damping: 10 } }); return <circle key={i} cx={x(p[0])} cy={y(p[1])} r={13 * sc} fill={col} stroke={C.bg} strokeWidth={3} />; })}
            <text x={x(last[0]) + 16} y={y(last[1]) + 9} fill={col} fontSize={30} fontWeight={800} fontFamily={mono}>{s.t === 'fcb' ? 'Barça' : 'Madrid'} {fmt(s.c, 2)}</text></g>; })}
      </svg>; }}
  </Frame>;
};
