"""Aggregate per-match StatsBomb summaries (from statsbomb_extract.py) into app data files.
Also generates the clearly-flagged DEMO player data for Eredivisie and Liga Portugal."""
import json, os, re, random, math, unicodedata, bisect
from collections import defaultdict
SB = os.environ.get('SB_DIR', '/workspace/fl-data')
LABS = [
 dict(key='laliga', league='es', file='m_11.json', comp='La Liga', season='2015/16', scope='Full season, 380 matches'),
 dict(key='seriea', league='it', file='m_12.json', comp='Serie A', season='2015/16', scope='Full season, 380 matches'),
 dict(key='ligue1', league='fr', file='m_7.json', comp='Ligue 1', season='2015/16', scope='377 of 380 matches available'),
 dict(key='bundesliga', league='de', file='m_9_281.json', comp='Bundesliga', season='2023/24', scope="Bayer Leverkusen's 34 league matches", focus='Bayer Leverkusen'),
]
MIN_POOL = 900
def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def grp(pos):
    p = pos.lower()
    if 'goalkeeper' in p: return 'GK'
    if 'center back' in p: return 'CB'
    if 'back' in p: return 'FB'
    if 'defensive midfield' in p or 'center midfield' in p: return 'CM'
    if 'attacking midfield' in p or 'wing' in p or p in ('left midfield', 'right midfield'): return 'AM'
    return 'FW'
# metric key -> (label, kind) kind: p90 numerator key / ratio
OUT = ['npg','npxg','sh','xa','kp','tbox','prog','pcar','drc','pcp','pbox','tkw','int','rec','prs','aerw']
GKM = ['sav','svp','gc','pa','pcp','rec']
INVERT = {'gc'}
def per90(s, mins):
    f = 90.0 / mins; g = lambda k: s.get(k, 0)
    v = {'npg': g('npg')*f, 'npxg': g('npxg')*f, 'sh': g('npsh')*f, 'xa': g('xa')*f, 'kp': g('kp')*f, 'tbox': g('tbox')*f,
         'prog': g('prog')*f, 'pcar': g('pcar')*f, 'drc': g('drc')*f, 'pcp': 100*g('pc')/g('pa') if g('pa') else 0,
         'pbox': (g('pbox')+g('cbox'))*f, 'tkw': g('tkw')*f, 'int': g('int')*f, 'rec': g('rec')*f, 'prs': g('prs')*f, 'aerw': g('aerw')*f,
         'sav': g('sav')*f, 'svp': 100*g('sav')/(g('sav')+g('gc')) if (g('sav')+g('gc')) else 0, 'gc': g('gc')*f, 'pa': g('pa')*f}
    return {k: round(x, 3) for k, x in v.items()}
labs_out = {}; allplayers = []
for L in LABS:
    matches = sorted(json.load(open(f"{SB}/{L['file']}")), key=lambda m: (m['match_date'], m['match_id']))
    ms = []; shots = []; P = {}
    teams = sorted({m['home_team']['home_team_name'] for m in matches} | {m['away_team']['away_team_name'] for m in matches})
    tix = {t: i for i, t in enumerate(teams)}
    TM = defaultdict(lambda: defaultdict(float))
    for mi, m in enumerate(matches):
        o = json.load(open(f"{SB}/sb/{m['match_id']}.json"))
        h, a = o['h'], o['a']; th, ta = o['team'][h], o['team'][a]
        ms.append([o['d'], o['wk'] or 0, tix[h], tix[a], o['hs'], o['as_'], round(th.get('xg', 0), 2), round(ta.get('xg', 0), 2),
                   round(th.get('npxg', 0), 2), round(ta.get('npxg', 0), 2)])
        for t, op in ((h, a), (a, h)):
            me, them = o['team'][t], o['team'][op]
            T = TM[t]; T['passes'] += me.get('passes', 0); T['opp_passes'] += them.get('passes', 0)
            T['f3'] += me.get('f3', 0); T['opp_f3'] += them.get('f3', 0)
            T['ppda_num'] += them.get('opp_build', 0); T['ppda_den'] += me.get('def_high', 0)
            T['sh'] += me.get('sh', 0); T['sha'] += them.get('sh', 0)
        for s in o['shots']:
            x, y, xg, oc, ty, bp, mn, pid, tm = s
            shots.append([x, y, xg, oc, ty, bp, mn, pid, tix[tm], mi])
        for p in o['players']:
            q = P.setdefault(p['id'], dict(id=p['id'], n=p['n'], teams=defaultdict(float), min=0, pos=defaultdict(float), s=defaultdict(float), log=[]))
            q['teams'][p['t']] += p['min']; q['min'] += p['min']
            for k, v in p['pos'].items(): q['pos'][k] += v
            for k, v in p['s'].items(): q['s'][k] += v
            st = p['s']; q['log'].append([mi, round(p['min']), int(st.get('g', 0)), round(st.get('xg', 0), 2), round(st.get('xa', 0), 2), int(st.get('sh', 0))])
    tstats = []
    for t in teams:
        T = TM[t]
        tstats.append(dict(id=slug(t), name=t, passShare=round(100*T['passes']/max(1, T['passes']+T['opp_passes']), 1),
                           tilt=round(100*T['f3']/max(1, T['f3']+T['opp_f3']), 1), ppda=round(T['ppda_num']/max(1, T['ppda_den']), 2),
                           sh=T['sh'], sha=T['sha']))
    players = []
    for q in P.values():
        if q['min'] < 90: continue
        pg = defaultdict(float)
        for k, v in q['pos'].items(): pg[grp(k)] += v
        g = max(pg, key=pg.get) if pg else 'CM'
        prim = max(q['pos'], key=q['pos'].get) if q['pos'] else ''
        team = max(q['teams'], key=q['teams'].get)
        pl = dict(uid=f"{L['key']}-{q['id']}", id=q['id'], n=q['n'], team=team, tid=tix[team], lab=L['key'], league=L['league'],
                  grp=g, pos=prim, min=round(q['min']), apps=len(q['log']),
                  tot={'g': int(q['s'].get('g', 0)), 'npg': int(q['s'].get('npg', 0)), 'xg': round(q['s'].get('xg', 0), 2), 'npxg': round(q['s'].get('npxg', 0), 2),
                       'ast': int(q['s'].get('ast', 0)), 'xa': round(q['s'].get('xa', 0), 2), 'sh': int(q['s'].get('sh', 0))},
                  v=per90(q['s'], q['min']), log=q['log'])
        players.append(pl)
    labs_out[L['key']] = dict(meta={k: L[k] for k in L if k != 'file'}, teams=tstats, matches=ms, shots=shots, players=players)
    allplayers += players
    print(L['key'], len(ms), 'matches', len(shots), 'shots', len(players), 'players', sum(p['min'] >= MIN_POOL for p in players), 'pool')
# percentile reference pool
pool = defaultdict(lambda: defaultdict(list))
for p in allplayers:
    if p['min'] >= MIN_POOL:
        for k, x in p['v'].items(): pool[p['grp']][k].append(x)
for g in pool:
    for k in pool[g]: pool[g][k].sort()
def pct(g, k, x):
    arr = pool[g][k]
    if not arr: return 0
    lo = bisect.bisect_left(arr, x); hi = bisect.bisect_right(arr, x)
    r = (lo + hi) / 2 / len(arr) * 100
    return round(100 - r if k in INVERT else r)
def addpct(p):
    keys = GKM if p['grp'] == 'GK' else OUT
    p['p'] = {k: pct(p['grp'], k, p['v'][k]) for k in keys}
for p in allplayers: addpct(p)
# ---------- DEMO data (synthetic, flagged) ----------
rng = random.Random(2026)
FIRST = {'nl': ['Daan','Sem','Milan','Luuk','Bram','Thijs','Jesse','Ruben','Stijn','Niels','Joep','Teun','Gijs','Wout','Sven','Koen','Mats','Jens','Rik','Floris'],
         'pt': ['Tiago','Rodrigo','Duarte','Gonçalo','Afonso','Rafael','Martim','Tomás','Vasco','Diogo','Lourenço','Henrique','Simão','Salvador','Guilherme','Bernardo','Rui','Nuno','Filipe','Leandro']}
LAST = {'nl': ['Vermeulen','Brouwer','Kuipers','Hoekstra','Dekkers','Smeets','Verbeek','Mulder','Postma','Wijnands','Bosman','Ter Horst','Van Dalen','Kramer','Veldkamp','Hendriks','Schouten','Molenaar','Van Rijn','Claassen'],
        'pt': ['Carvalho','Teixeira','Moura','Valente','Pinheiro','Faria','Barros','Cordeiro','Sequeira','Lobo','Simões','Tavares','Antunes','Quintela','Rebelo','Macedo','Esteves','Viana','Couto','Brandão']}
POSN = {'GK': 'Goalkeeper', 'CB': 'Center Back', 'FB': 'Right Back', 'CM': 'Center Midfield', 'AM': 'Right Wing', 'FW': 'Center Forward'}
demo = {}
pools_by_g = defaultdict(list)
for p in allplayers:
    if p['min'] >= MIN_POOL: pools_by_g[p['grp']].append(p)
def xg_model(x, y):
    d = math.hypot(120-x, 40-y); ang = abs(math.atan2(7.32*0.9144*1.1*(120-x), (120-x)**2 + (y-40)**2 - (3.66*1.09)**2))
    return max(0.01, min(0.75, 1/(1+math.exp(-( -1.1 - 0.13*d + 1.6*ang)))))
for lg, title in (('nl', 'Eredivisie'), ('pt', 'Liga Portugal')):
    plist = []; dshots = []
    used = set()
    for i, g in enumerate(['GK','GK','CB','CB','CB','CB','FB','FB','FB','FB','CM','CM','CM','CM','CM','AM','AM','AM','AM','FW','FW','FW','FW','AM']):
        while True:
            n = f"{rng.choice(FIRST[lg])} {rng.choice(LAST[lg])}"
            if n not in used: used.add(n); break
        base = rng.choice(pools_by_g[g])['v']
        v = {k: round(max(0, x*math.exp(rng.gauss(0, 0.22))) if k not in ('pcp', 'svp') else min(99, max(40, x + rng.gauss(0, 4))), 3) for k, x in base.items()}
        mins = rng.randint(950, 3000); apps = max(12, round(mins/80))
        uid = f"demo-{lg}-{i+1:02d}"
        log = []
        for mi in range(apps):
            mm = rng.choice([90, 90, 90, 75, 62, 25]) ; lam = v['npxg']*mm/90
            nsh = sum(rng.random() < v['sh']*mm/90/6 for _ in range(6))
            xg = round(sum(rng.uniform(0.03, 0.25) for _ in range(nsh)), 2)
            gl = sum(rng.random() < 0.11 for _ in range(nsh))
            log.append([mi, mm, gl, xg, round(max(0, rng.gauss(v['xa']*mm/90, 0.05)), 2), nsh])
            for _ in range(nsh):
                x = 120 - abs(rng.gauss(0, 1))*11 - rng.uniform(1, 9); y = 40 + rng.gauss(0, 9)
                x = max(70, min(119, x)); y = max(5, min(75, y)); q = round(xg_model(x, y), 3)
                oc = 'Go' if rng.random() < q*1.05 else rng.choice(['Sa','Bl','Of','Of','Wa'])
                dshots.append([round(x, 1), round(y, 1), q, oc, 'Op', rng.choice('LRRH'), rng.randint(1, 90), uid, 0, mi])
        tot = {'g': sum(l[2] for l in log), 'npg': sum(l[2] for l in log), 'xg': round(sum(l[3] for l in log), 2), 'npxg': round(sum(l[3] for l in log), 2),
               'ast': round(v['xa']*mins/90*rng.uniform(.7, 1.3)), 'xa': round(sum(l[4] for l in log), 2), 'sh': sum(l[5] for l in log)}
        p = dict(uid=uid, id=uid, n=n, team=f'{title} demo squad', tid=0, lab=f'demo-{lg}', league=lg, grp=g, pos=POSN[g], min=mins, apps=apps, tot=tot, v=v, log=log, demo=True)
        addpct(p); plist.append(p)
    demo[lg] = dict(meta=dict(key=f'demo-{lg}', league=lg, comp=title, season='Demo', scope='Synthetic sample data, not real players', demo=True),
                    teams=[dict(id='demo', name=f'{title} demo squad')], matches=[], shots=dshots, players=plist)
os.makedirs('data/lab', exist_ok=True)
index = []
for key, d in list(labs_out.items()) + [(f'demo-{k}', v) for k, v in demo.items()]:
    json.dump(d, open(f'data/lab/{key}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    for p in d['players']:
        if p['min'] >= MIN_POOL or p.get('demo'):
            index.append({k: p[k] for k in ('uid', 'id', 'tid', 'n', 'team', 'lab', 'league', 'grp', 'pos', 'min', 'apps', 'tot', 'v', 'p')} | ({'demo': True} if p.get('demo') else {}))
json.dump({'minPool': MIN_POOL, 'poolSizes': {g: len(pool[g]['npxg']) for g in pool}, 'players': index}, open('data/players.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('index', len(index), {g: len(pool[g]['npxg']) for g in pool})

# hero + summary files (small, for the home page)
hero = []
for key, d in labs_out.items():
    for sh in d['shots']:
        if sh[3] == 'Go': hero.append([round(sh[0]), round(sh[1]), round(sh[2], 2)])
json.dump(hero, open('data/hero.json', 'w'), separators=(',', ':'))
summ = {k: {'shots': len(d['shots']), 'matches': len(d['matches']), 'players': sum(p['min'] >= MIN_POOL for p in d['players'])} for k, d in labs_out.items()}
json.dump(summ, open('data/summary.json', 'w'), separators=(',', ':'))
print('hero goals', len(hero), summ)
