"""Build static link-preview stubs + 1200x675 og:image PNGs into _site/p/ (not committed; deployed by Actions).
Each stub has og:/twitter: summary_large_image tags and redirects to the hash route. Real numbers only, read from data/."""
import json, os, html, shutil, sys
from PIL import Image, ImageDraw, ImageFont
SITE = 'https://josephbepocode.github.io/football-lab/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '_site'
F = '/usr/share/fonts/truetype/dejavu/'
def font(sz, b=False): return ImageFont.truetype(F + ('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf'), sz)
SB = Image.open('assets/statsbomb-logo.png').convert('RGBA'); SB = SB.resize((240, int(240 * SB.height / SB.width)))
BG, TXT, MUTE, ACC = (11, 13, 18), (233, 237, 245), (138, 147, 166), (198, 255, 61)
def card(path, kicker, title, sub, tiles, source, sb=False, accent=ACC):
    im = Image.new('RGB', (1200, 675), BG); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1200, 8], fill=accent)
    d.text((64, 56), kicker.upper(), font=font(22, True), fill=accent)
    t = title; fs = 64
    while d.textlength(t, font=font(fs, True)) > 1072 and fs > 34: fs -= 2
    d.text((64, 96), t, font=font(fs, True), fill=TXT)
    d.text((64, 110 + fs), sub, font=font(26), fill=MUTE)
    x, w = 64, (1072 - 24 * (max(1, len(tiles)) - 1)) // max(1, len(tiles))
    for lbl, val in tiles:
        d.rounded_rectangle([x, 300, x + w, 470], 18, fill=(20, 23, 31), outline=(40, 44, 56), width=2)
        vs = 64
        while d.textlength(str(val), font=font(vs, True)) > w - 40 and vs > 24: vs -= 2
        d.text((x + 24, 330), str(val), font=font(vs, True), fill=TXT); d.text((x + 24, 420), lbl, font=font(22), fill=MUTE); x += w + 24
    d.line([64, 560, 1136, 560], fill=(40, 44, 56), width=2)
    d.text((64, 584), 'Football Lab · bepojoseph.xyz', font=font(26, True), fill=ACC)
    d.text((64, 622), 'Data: ' + source, font=font(20), fill=MUTE)
    wm = '@NorthCuler'; d.text((1136 - d.textlength(wm, font=font(24, True)), 586), wm, font=font(24, True), fill=TXT)
    if sb: im.paste(SB, (1136 - SB.width, 620), SB)
    os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path)
def stub(slug, route, title, desc, img_args):
    d = f'{OUT}/p/{slug}'; os.makedirs(d, exist_ok=True); card(f'{d}/card.png', *img_args)
    url, img, dest = f'{SITE}p/{slug}/', f'{SITE}p/{slug}/card.png', f'{SITE}#/{route}'
    e = html.escape
    open(f'{d}/index.html', 'w').write(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(title)} · Football Lab</title>
<meta name="description" content="{e(desc)}"><link rel="canonical" href="{e(dest)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Football Lab"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(url)}"><meta property="og:image" content="{e(img)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:description" content="{e(desc)}"><meta name="twitter:image" content="{e(img)}">
<meta http-equiv="refresh" content="0; url={e(dest)}"><script>location.replace({json.dumps(dest)})</script></head>
<body><p><a href="{e(dest)}">Open {e(title)} on Football Lab</a></p></body></html>''')
    return slug
J = lambda p: json.load(open(p))
ESPN = 'openfootball / ESPN'; n = 0
B = J('data/live/barca.json'); FX = J('data/live/barca_fixtures.json'); W = J('data/weekly/index.json')
stub('home', '', 'Football Lab', 'Tables, form, shot maps and percentile profiles for six European leagues.', ('Football analytics', 'Football Lab', 'La Liga · Bundesliga · Serie A · Ligue 1 · Eredivisie · Liga Portugal', [], 'openfootball / ESPN / StatsBomb', True))
stub('league-es', 'league/es/2026-27', 'La Liga 2026/27 table', 'Near-live La Liga table, form and points race.', ('La Liga 2026/27', 'La Liga table', f'Matches played: {J("data/results/2026-27_es.json")["played"]}', [], ESPN))
if B['matches']:
    m = B['matches'][0]; stub('barca', 'barca', 'Barça post-match', 'Every finished Barça league match: scorers, shots, lineups, table impact.', ('Barça post-match', 'Barça 2026/27', f'Latest: {m["home"]} {m["hg"]}–{m["ag"]} {m["away"]}', [['Position', m['after']['pos']], ['Points', m['after']['pts']]], ESPN))
for m in B['matches']:
    det = {}
    try: det = J(f'data/live/matches/{m["id"]}.json')
    except Exception: pass
    side = 'h' if m['barcaHome'] else 'a'; st = dict(det.get('stats', {}).get(side, []))
    tiles = [['Table after', f'{m["after"]["pos"]} ({m["after"]["pts"]} pts)']] + ([['Barça shots', st['Shots']]] if st.get('Shots') else []) + ([['Possession', st['Possession %'] + '%']] if st.get('Possession %') else [])
    stub(f'barca/{m["id"]}', f'barca/{m["id"]}', f'{m["home"]} {m["hg"]}–{m["ag"]} {m["away"]}', f'La Liga 2026/27 matchday {m["round"]}: scorers, shot timeline, lineups and table impact.',
         (f'La Liga 2026/27 · MD {m["round"]} · {m["date"]}', f'{m["home"]} {m["hg"]}–{m["ag"]} {m["away"]}', 'Post-match: scorers, shots, lineups, table impact', tiles, ESPN)); n += 1
if FX['fixtures']:
    f = FX['fixtures'][0]; stub('fixtures', 'fixtures', 'Barça upcoming fixtures', 'Upcoming Barça fixtures with a transparent difficulty rating.', ('Barça fixtures', 'Upcoming fixtures', f'Next: {"vs" if f["home"] else "at"} {f["opp"]} · {f["date"]}', [['Next difficulty (1–5)', f['rating']], ['Fixtures left', len(FX['fixtures'])]], ESPN))
stub('weekly', 'weekly', 'Barça in numbers', 'Weekly Barça in numbers, auto-built from real data.', ('Weekly', 'Barça in numbers', 'Archive of weekly league numbers', [], ESPN))
for w in W['weeks']:
    stub(f'weekly/{w["week"]}', f'weekly/{w["week"]}', f'Barça in numbers · {w["week"]}', f'{w["from"]} to {w["to"]}: {w["points"]} pts, goals {w["gf"]}–{w["ga"]}.',
         (f'Barça in numbers · {w["from"]} – {w["to"]}', f'Week {w["week"]}', f'{w["played"]} league match(es)', [['Points', w['points']], ['Goals', f'{w["gf"]}–{w["ga"]}'], ['Position', w['tableAfter']['pos']]], ESPN)); n += 1
L = J('data/lab/laliga.json'); rm = [i for i, t in enumerate(L['teams']) if t['id'] == 'real-madrid'][0]; cm = next(m for m in L['matches'] if m[0] == '2015-11-21' and m[2] == rm)
stub('clasico-2015', 'clasico-2015', 'Real Madrid 0–4 Barcelona (2015/16)', 'Historical shot maps and xG flow from StatsBomb Open Data.', ('Historical · La Liga 2015/16 · 21 Nov 2015', 'Real Madrid 0–4 Barcelona', 'Shot maps & xG flow (historical, StatsBomb Open Data)', [['Barça xG', f'{cm[7]:.2f}'], ['Madrid xG', f'{cm[6]:.2f}']], 'StatsBomb Open Data (Hudl StatsBomb)', True))
for k in ('compare', 'players'): stub(k, k, {'compare': 'Compare players', 'players': 'Player explorer'}[k], 'Historical StatsBomb player profiles and percentiles.', ('Historical StatsBomb data', {'compare': 'Player vs player', 'players': 'Player explorer'}[k], 'Percentile radars and per-90s', [], 'StatsBomb Open Data (Hudl StatsBomb)', True))
LBL = {'laliga': 'La Liga 2015/16', 'seriea': 'Serie A 2015/16', 'ligue1': 'Ligue 1 2015/16', 'bundesliga': 'Bundesliga 2023/24'}
for p in J('data/players.json')['players']:
    if p.get('demo'): continue
    t = p['tot']; stub(f'player/{p["uid"]}', f'player/{p["uid"]}', f'{p["n"]} · {LBL.get(p["lab"], p["lab"])}', f'{p["team"]}: percentile profile, shot map and per-90s (historical StatsBomb data).',
        (f'Historical · {LBL.get(p["lab"], p["lab"])} · {p["team"]}', p['n'], f'{p["pos"] or ""} · {p["min"]:,} min · {p["apps"]} apps', [['Goals', t['g']], ['Assists', t['ast']], ['xG', f'{t["xg"]:.2f}'], ['NP shots', t['sh']]], 'StatsBomb Open Data (Hudl StatsBomb)', True)); n += 1
print('stubs built', n)
