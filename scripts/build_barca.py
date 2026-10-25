"""Barça extras, run after build_live.py. Keyless sources only.
- Caches ESPN match summary JSON (public, unofficial endpoint) in data/espn/<eventId>.json (trimmed to the parts we use).
- data/live/matches/<reportId>.json: shots by minute (from ESPN commentary), lineups, subs, team stats.
- data/live/barca_fixtures.json: upcoming fixtures + transparent difficulty rating.
- data/weekly/*.json + index.json + feed.xml: weekly 'Barça in numbers' (finished ISO weeks only).
Fails gracefully: any ESPN error leaves the cached files as they were."""
import json, os, re, sys, datetime, urllib.request, html
UA = {'User-Agent': 'football-lab (github.com/josephbepocode/football-lab)'}
SITE = 'https://josephbepocode.github.io/football-lab/'
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r: return json.load(r)
def jload(p, default=None):
    try: return json.load(open(p))
    except Exception: return default
def jdump(p, o):
    """Write only if content (ignoring 'updated') changed, so timestamp-only churn doesn't create commits."""
    old = jload(p)
    if isinstance(old, dict) and isinstance(o, dict) and {k: v for k, v in old.items() if k != 'updated'} == {k: v for k, v in o.items() if k != 'updated'}: return False
    json.dump(o, open(p, 'w'), ensure_ascii=False, separators=(',', ':')); return True
live = jload('data/live/es.json'); B = jload('data/live/barca.json'); R = jload('data/results/2026-27_es.json')
if not (live and B and R): print('missing inputs'); sys.exit(0)
names = live['teams']; bi = names.index('Barcelona')
now = datetime.datetime.now(datetime.timezone.utc)
# ---------- 1. per-match details
def summary(eid):
    p = f'data/espn/{eid}.json'; c = jload(p)
    if c and c.get('final'): return c
    try: d = get(f'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/summary?event={eid}')
    except Exception as ex: print('ESPN summary failed', eid, ex, file=sys.stderr); return c
    keep = {'final': bool(d.get('header', {}).get('competitions', [{}])[0].get('status', {}).get('type', {}).get('completed')), 'fetched': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'boxscore': d.get('boxscore'), 'rosters': d.get('rosters'), 'keyEvents': d.get('keyEvents'),
            'commentary': [{'t': x.get('time', {}).get('displayValue', ''), 'text': x.get('text', '')} for x in d.get('commentary', []) if x.get('text', '').startswith(('Attempt', 'Goal!', 'Own Goal'))]}
    json.dump(keep, open(p, 'w'), ensure_ascii=False, separators=(',', ':')); return keep
STATS = [('possessionPct', 'Possession %'), ('totalShots', 'Shots'), ('shotsOnTarget', 'Shots on target'), ('wonCorners', 'Corners'), ('accuratePasses', 'Accurate passes'), ('totalPasses', 'Passes'),
         ('foulsCommitted', 'Fouls'), ('yellowCards', 'Yellow cards'), ('redCards', 'Red cards'), ('offsides', 'Offsides'), ('saves', 'Saves'), ('effectiveTackles', 'Tackles won'), ('interceptions', 'Interceptions')]
def mins(t):
    n = re.findall(r'\d+', t or ''); return int(n[0]) + (int(n[1]) if len(n) > 1 else 0) if n else None
OUT = {'Attempt missed': 'Missed', 'Attempt saved': 'Saved', 'Attempt blocked': 'Blocked', 'Goal!': 'Goal', 'Own Goal': 'Own goal'}
def details(ev, rep):
    s = summary(ev['id'])
    if not s: return None
    home, away = names[ev['h']], names[ev['a']]
    def side_of(team): return 'h' if team and team.lower() in home.lower() or (team and home.lower() in team.lower()) else 'a'
    shots = []
    for c in s.get('commentary') or []:
        m = re.match(r'(Attempt missed|Attempt saved|Attempt blocked|Goal!|Own Goal)[^.]*\.\s*(?:.*?\d+\.\s*)?(.+?) \(([^)]+)\)', c['text'])
        if not m: continue
        kind, player, team = m.groups()
        shots.append({'min': mins(c['t']), 'clock': c['t'], 'side': side_of(team) if kind != 'Own Goal' else ('a' if side_of(team) == 'h' else 'h'), 'player': player, 'outcome': OUT[kind]})
    shots.sort(key=lambda x: x['min'] or 0)
    teams = {}
    for t in (s.get('boxscore') or {}).get('teams', []) or []:
        sd = 'h' if t.get('homeAway') == 'home' or t['team']['displayName'] == home else 'a'
        sv = {x['name']: x.get('displayValue') for x in t.get('statistics', [])}; teams[sd] = [[lbl, sv.get(k)] for k, lbl in STATS if sv.get(k) not in (None, '')]
    lineups = {}
    for r in s.get('rosters') or []:
        sd = 'h' if r.get('homeAway') == 'home' else 'a'
        lineups[sd] = {'team': r['team']['displayName'], 'formation': r.get('formation'),
                       'xi': [{'n': p['athlete']['displayName'], 'no': p.get('jersey'), 'pos': p.get('position', {}).get('abbreviation'), 'off': bool(p.get('subbedOut'))} for p in r.get('roster', []) if p.get('starter')],
                       'bench': [{'n': p['athlete']['displayName'], 'no': p.get('jersey'), 'on': bool(p.get('subbedIn'))} for p in r.get('roster', []) if not p.get('starter')]}
    subs = []
    for k in s.get('keyEvents') or []:
        if 'ubstitution' in k.get('type', {}).get('text', ''):
            ps = [p['athlete']['displayName'] for p in k.get('participants', [])]
            m = re.search(r'\. (.+?) replaces (.+?)\.?$', k.get('text', ''))
            on, off = (m.groups() if m else (ps + [None, None])[:2])
            off = re.sub(r' because of an? .*$', '', off or '') or None
            subs.append({'min': k.get('clock', {}).get('displayValue', ''), 'side': side_of(k.get('team', {}).get('displayName')), 'on': on, 'off': off})
    out = {'id': rep['id'], 'espnId': ev['id'], 'home': home, 'away': away, 'shots': shots, 'stats': teams, 'lineups': lineups, 'subs': subs,
           'source': 'ESPN public match summary (cached ' + s.get('fetched', '') + ')', 'updated': now.strftime('%Y-%m-%dT%H:%M:%SZ')}
    jdump(f'data/live/matches/{rep["id"]}.json', out); return out
byPair = {(e['h'], e['a']): e for e in live['events']}
ix = {t['short']: i for i, t in enumerate(R['teams'])}
D = {}
for rep in B['matches']:
    ev = byPair.get((names.index(rep['home']), names.index(rep['away'])))
    if ev and ev['done']:
        try: D[rep['id']] = details(ev, rep)
        except Exception as ex: print('details failed', rep['id'], ex, file=sys.stderr)
# ---------- 2. upcoming fixtures + difficulty
played = sorted([m for m in R['matches'] if len(m) >= 6], key=lambda m: m[0])
T = {i: {'pts': 0, 'gd': 0, 'gf': 0, 'res': []} for i in range(len(R['teams']))}
for m in played:
    _, _, h, a, hg, ag = m[:6]
    for t, f, g in ((h, hg, ag), (a, ag, hg)):
        T[t]['gd'] += f - g; T[t]['gf'] += f; p = 3 if f > g else 1 if f == g else 0; T[t]['pts'] += p; T[t]['res'].append(p)
order = sorted(T, key=lambda i: (-T[i]['pts'], -T[i]['gd'], -T[i]['gf'], R['teams'][i]['short'])); N = len(order)
for k, i in enumerate(order): T[i]['pos'] = k + 1
BR = ix['Barcelona']; fx = []
for m in sorted([m for m in R['matches'] if len(m) < 6 and BR in (m[2], m[3])], key=lambda m: m[0]):
    opp = m[3] if m[2] == BR else m[2]; home = m[2] == BR; o = T[opp]; last5 = o['res'][-5:]
    pos_s = (N - o['pos']) / (N - 1); form_s = (sum(last5) / (3 * len(last5))) if last5 else 0.5; venue = 0 if home else 0.1
    raw = min(1.0, 0.6 * pos_s + 0.3 * form_s + venue); rating = round(1 + 4 * raw, 1)
    ev = byPair.get((m[2], m[3]))
    fx.append({'date': m[0], 'kickoff': ev['kickoff'] if ev else None, 'round': m[1], 'home': home, 'opp': R['teams'][opp]['short'], 'oppPos': o['pos'], 'oppForm': ''.join('W' if p == 3 else 'D' if p == 1 else 'L' for p in last5),
               'posScore': round(pos_s, 3), 'formScore': round(form_s, 3), 'venue': venue, 'rating': rating})
jdump('data/live/barca_fixtures.json', {'updated': now.strftime('%Y-%m-%dT%H:%M:%SZ'), 'basedOn': f'{len(played)} played matches', 'fixtures': fx,
       'formula': 'rating = 1 + 4 × min(1, 0.6 × position score + 0.3 × form score + venue). Position score = (20 − opponent position) / 19. Form score = opponent points in last 5 league matches / max possible. Venue = 0.1 away, 0 at home. 1 = easiest, 5 = hardest.'})
# ---------- 3. weekly Barça in numbers (finished ISO weeks, Mon-Sun)
weeks = {}
for rep in sorted(B['matches'], key=lambda r: r['date']):
    y, w, _ = datetime.date.fromisoformat(rep['date']).isocalendar(); weeks.setdefault(f'{y}-W{w:02d}', []).append(rep)
arch = []
for wk, reps in sorted(weeks.items()):
    y, w = int(wk[:4]), int(wk[6:]); mon = datetime.date.fromisocalendar(y, w, 1); sun = mon + datetime.timedelta(days=6)
    if datetime.datetime.combine(sun + datetime.timedelta(days=1), datetime.time(6), datetime.timezone.utc) > now: continue  # week not finished yet
    ms, gf, ga, pts, scorers, shots, sot, poss = [], 0, 0, 0, {}, 0, 0, []
    for r in reps:
        f, a = (r['hg'], r['ag']) if r['barcaHome'] else (r['ag'], r['hg']); gf += f; ga += a; pts += 3 if f > a else 1 if f == a else 0
        side = 'h' if r['barcaHome'] else 'a'
        for g in r['goals']:
            if g['side'] == side and not g['og']: scorers[g['player']] = scorers.get(g['player'], 0) + 1
        d = D.get(r['id']) or jload(f'data/live/matches/{r["id"]}.json') or {}
        st = dict(d.get('stats', {}).get(side, []))
        if st.get('Shots'): shots += int(st['Shots'])
        if st.get('Shots on target'): sot += int(st['Shots on target'])
        if st.get('Possession %'): poss.append(float(st['Possession %']))
        ms.append({'id': r['id'], 'date': r['date'], 'home': r['home'], 'away': r['away'], 'hg': r['hg'], 'ag': r['ag']})
    obj = {'week': wk, 'from': mon.isoformat(), 'to': sun.isoformat(), 'matches': ms, 'played': len(ms), 'points': pts, 'gf': gf, 'ga': ga,
           'scorers': sorted(([k, v] for k, v in scorers.items()), key=lambda x: -x[1]), 'shots': shots or None, 'shotsOnTarget': sot or None,
           'possessionAvg': round(sum(poss) / len(poss), 1) if poss else None, 'tableAfter': reps[-1]['after'], 'leaderAfter': reps[-1]['leaderAfter'],
           'sources': 'openfootball (CC0) + ESPN public scoreboard & match summaries'}
    jdump(f'data/weekly/{wk}.json', obj)
    arch.append({k: obj[k] for k in ('week', 'from', 'to', 'played', 'points', 'gf', 'ga', 'tableAfter')})
jdump('data/weekly/index.json', {'weeks': arch[::-1]})
items = ''.join(f'''<item><title>Barça in numbers · {a['week']} ({a['from']} to {a['to']})</title><link>{SITE}#/weekly/{a['week']}</link><guid isPermaLink="false">football-lab-barca-{a['week']}</guid>
<pubDate>{datetime.datetime.combine(datetime.date.fromisoformat(a['to']) + datetime.timedelta(days=1), datetime.time(6), datetime.timezone.utc).strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>
<description>{html.escape(f"{a['played']} league match(es), {a['points']} pts, goals {a['gf']}-{a['ga']}. Position after: {a['tableAfter']['pos']} ({a['tableAfter']['pts']} pts).")}</description></item>''' for a in arch[::-1])
feed = f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Football Lab · Barça in numbers</title><link>{SITE}#/weekly</link><description>Weekly Barça La Liga numbers from real data (openfootball, ESPN).</description>{items}</channel></rss>\n'
if (open('feed.xml').read() if os.path.exists('feed.xml') else '') != feed: open('feed.xml', 'w').write(feed)
print('match details', len([v for v in D.values() if v]), 'fixtures', len(fx), 'weeks', len(arch))
