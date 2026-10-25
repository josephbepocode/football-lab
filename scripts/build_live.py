"""Near-live La Liga overlay. Run AFTER build_results.py (from repo root).
Sources (no key committed):
  1. ESPN public scoreboard JSON (keyless): site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard
  2. Optional: football-data.org v4 free tier, only if env FOOTBALL_DATA_TOKEN is set (GitHub Actions secret).
Base fixture list is openfootball (CC0). Scores only get filled from a source that reports the match as finished.
Writes: data/results/2026-27_es.json (merged), data/live/es.json, data/live/barca.json, data/live/meta.json"""
import json, os, re, sys, time, datetime, unicodedata, urllib.request
SEASON = '2026-27'; PATH = f'data/results/{SEASON}_es.json'
UA = {'User-Agent': 'football-lab (github.com/josephbepocode/football-lab)'}
def get(url, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)
def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(fc|cf|cd|rc|rcd|ud|sd|de|club|real|balompie|futbol)\b', ' ', s)
    return re.sub(r'[^a-z]+', '', s)
ALIAS = {'atleticomadrid': 'atleticomadrid', 'athleticbilbao': 'athletic', 'athleticclub': 'athletic', 'celta': 'celtavigo',
         'deportivolacoruna': 'deportivo', 'rayo': 'rayovallecano', 'racingsantander': 'racingsantander'}
def jdump(p, o):
    import subprocess
    # compare with the committed version, so a run that only changes timestamps leaves the file untouched
    r = subprocess.run(['git', 'show', 'HEAD:' + p], capture_output=True, text=True)
    try: old = json.loads(r.stdout) if r.returncode == 0 else None
    except Exception: old = None
    strip = lambda x: {k: v for k, v in x.items() if k not in ('updated', 'built')} if isinstance(x, dict) else x
    if strip(old) == strip(o):
        open(p, 'w').write(r.stdout); return
    json.dump(o, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
PREV = (lambda: json.load(open('data/live/meta.json')).get('updated') if os.path.exists('data/live/meta.json') else None)()
d = json.load(open(PATH)); teams = d['teams']
def key(s): k = norm(s); return ALIAS.get(k, k)
TK = {}
for i, t in enumerate(teams):
    for n in (t['name'], t['short']): TK[key(n)] = i
def tid(name):
    k = key(name)
    if k in TK: return TK[k]
    for kk, i in TK.items():
        if kk and (kk in k or k in kk): return i
    raise KeyError(name)
pair = {(m[2], m[3]): m for m in d['matches']}
now = datetime.datetime.now(datetime.timezone.utc)
events, used = {}, []
# ---- 1. ESPN
try:
    base = 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard'
    cal = get(base)['leagues'][0]['calendar']
    days = sorted({c[:10].replace('-', '') for c in cal})
    for day in days:
        if datetime.datetime.strptime(day, '%Y%m%d').replace(tzinfo=datetime.timezone.utc) > now + datetime.timedelta(days=21): continue
        for e in get(f'{base}?dates={day}').get('events', []):
            c = e['competitions'][0]; H = next(x for x in c['competitors'] if x['homeAway'] == 'home'); A = next(x for x in c['competitors'] if x['homeAway'] == 'away')
            h, a = tid(H['team']['displayName']), tid(A['team']['displayName']); st = e['status']['type']
            goals = []
            for x in c.get('details', []):
                if not x.get('scoringPlay'): continue
                side = 'h' if x.get('team', {}).get('id') == H['team']['id'] else 'a'
                goals.append({'side': side, 'min': x.get('clock', {}).get('displayValue', ''), 'player': ', '.join(p['displayName'] for p in x.get('athletesInvolved', [])),
                              'pen': bool(x.get('penaltyKick')), 'og': bool(x.get('ownGoal'))})
            events[(h, a)] = {'id': e['id'], 'kickoff': e['date'], 'h': h, 'a': a, 'state': st.get('state'), 'status': st.get('description'), 'done': bool(st.get('completed')),
                              'hg': int(H['score']) if H.get('score') not in (None, '') else None, 'ag': int(A['score']) if A.get('score') not in (None, '') else None,
                              'goals': goals, 'src': 'ESPN'}
        time.sleep(0.2)
    used.append('ESPN public scoreboard')
except Exception as ex:
    print('ESPN failed:', ex, file=sys.stderr)
# ---- 2. football-data.org (optional, keyed via secret)
tok = os.environ.get('FOOTBALL_DATA_TOKEN', '').strip()
if tok:
    try:
        fd = get('https://api.football-data.org/v4/competitions/PD/matches?season=' + SEASON[:4], {'X-Auth-Token': tok})
        n = 0
        for m in fd.get('matches', []):
            h, a = tid(m['homeTeam'].get('name') or m['homeTeam']['shortName']), tid(m['awayTeam'].get('name') or m['awayTeam']['shortName'])
            ft = m.get('score', {}).get('fullTime', {}); done = m.get('status') == 'FINISHED'
            if (h, a) not in events or (done and not events[(h, a)]['done']):
                events[(h, a)] = {'id': 'fd' + str(m['id']), 'kickoff': m['utcDate'], 'h': h, 'a': a, 'state': 'post' if done else 'pre', 'status': m.get('status', '').title(),
                                  'done': done, 'hg': ft.get('home'), 'ag': ft.get('away'), 'goals': [], 'src': 'football-data.org'}; n += 1
        used.append(f'football-data.org free tier ({n} matches filled)')
        sc = get('https://api.football-data.org/v4/competitions/PD/scorers?limit=20&season=' + SEASON[:4], {'X-Auth-Token': tok})
        json.dump({'updated': now.strftime('%Y-%m-%dT%H:%M:%SZ'), 'source': 'football-data.org', 'season': SEASON,
                   'scorers': [{'n': x['player']['name'], 'team': x['team'].get('shortName') or x['team']['name'], 'g': x.get('goals'), 'a': x.get('assists'), 'pen': x.get('penalties'), 'mp': x.get('playedMatches')} for x in sc.get('scorers', [])]},
                  open('data/live/scorers.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    except Exception as ex:
        print('football-data.org failed:', ex, file=sys.stderr)
if not events:
    print('No live source succeeded; leaving openfootball data as is.'); sys.exit(0)
# ---- merge into openfootball fixture list
filled = 0
for (h, a), ev in events.items():
    m = pair.get((h, a))
    if not m: continue
    m[0] = ev['kickoff'][:10]
    if ev['done'] and ev['hg'] is not None:
        if len(m) < 6 or m[4:6] != [ev['hg'], ev['ag']]: filled += 1
        del m[4:]; m += [ev['hg'], ev['ag']]
stamp = now.strftime('%Y-%m-%dT%H:%M:%SZ')
played = [m for m in d['matches'] if len(m) >= 6]
d.update(played=len(played), lastDate=max((m[0] for m in played), default=None), updated=stamp,
         source='openfootball/football.json (CC0-1.0) + ' + ' + '.join(used))
jdump(PATH, d)
ix = json.load(open('data/results/index.json')); ix['updated'] = stamp
ix['sets'][f'{SEASON}_es'] = {'played': d['played'], 'total': d['total'], 'lastDate': d['lastDate']}
jdump('data/results/index.json', ix)
# ---- standings helper (same rules as the site: pts, GD, GF)
def table(ms):
    T = {i: [0, 0, 0] for i in range(len(teams))}
    for m in ms:
        _, _, h, a, hg, ag = m[:6]
        T[h][1] += hg - ag; T[a][1] += ag - hg; T[h][2] += hg; T[a][2] += ag
        T[h][0] += 3 if hg > ag else 1 if hg == ag else 0; T[a][0] += 3 if ag > hg else 1 if hg == ag else 0
    order = sorted(T, key=lambda i: (-T[i][0], -T[i][1], -T[i][2], teams[i]['short']))
    return {i: {'pos': k + 1, 'pts': T[i][0]} for k, i in enumerate(order)}
live = sorted(events.values(), key=lambda e: e['kickoff'])
jdump('data/live/es.json', {'updated': stamp, 'sources': used, 'teams': [t['short'] for t in teams], 'events': live})
B = next(i for i, t in enumerate(teams) if t['id'] == 'barcelona')
chron = sorted(played, key=lambda m: m[0]); reports = []
for m in chron:
    if B not in (m[2], m[3]): continue
    before = table([x for x in chron if x[0] < m[0]]); after = table([x for x in chron if x[0] <= m[0]])
    ev = events.get((m[2], m[3]), {})
    reports.append({'id': f'{m[0]}-{teams[m[2]]["id"]}-{teams[m[3]]["id"]}', 'date': m[0], 'round': m[1], 'home': teams[m[2]]['short'], 'away': teams[m[3]]['short'],
                    'hg': m[4], 'ag': m[5], 'barcaHome': m[2] == B, 'goals': ev.get('goals', []), 'goalsSrc': ev.get('src') if ev.get('goals') else None,
                    'before': before[B] if any(x[0] < m[0] for x in chron) else None, 'after': after[B],
                    'leaderAfter': teams[next(i for i, v in after.items() if v['pos'] == 1)]['short'],
                    'note': 'Table positions use points, goal difference, goals scored, computed from all results up to and including this date.'})
jdump('data/live/barca.json', {'updated': stamp, 'matches': reports[::-1]})
import subprocess
changed = subprocess.run(['git', 'status', '--porcelain', 'data/results', 'data/live'], capture_output=True, text=True).stdout.strip()
# meta 'updated' = last time any data actually changed (so the site never claims an update that didn't happen)
json.dump({'updated': stamp if (changed or not PREV) else PREV, 'checked': stamp, 'sources': used}, open('data/live/meta.json.tmp', 'w'))
os.replace('data/live/meta.json.tmp', 'data/live/meta.json') if (changed or not PREV) else os.remove('data/live/meta.json.tmp')
print('updated', stamp, 'sources', used, 'scores changed', filled, 'played', len(played), 'barca reports', len(reports))
