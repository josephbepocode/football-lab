"""Fetch league results from openfootball/football.json (CC0) and write compact JSON for the app.
Usage: python3 scripts/build_results.py   (run from repo root)"""
import json, re, urllib.request, unicodedata, datetime
LEAGUES = {'es': 'es.1', 'de': 'de.1', 'it': 'it.1', 'fr': 'fr.1', 'nl': 'nl.1', 'pt': 'pt.1'}
SEASONS = ['2026-27', '2025-26']
SRC = 'https://raw.githubusercontent.com/openfootball/football.json/master/{s}/{l}.json'
SHORT = {
 'FC Bayern München':'Bayern Munich','Bayer 04 Leverkusen':'Leverkusen','Borussia Dortmund':'Dortmund','Borussia Mönchengladbach':"M'gladbach",
 'Eintracht Frankfurt':'Frankfurt','1. FC Heidenheim 1846':'Heidenheim','1. FC Köln':'Köln','1. FC Union Berlin':'Union Berlin','1. FSV Mainz 05':'Mainz',
 'FC Augsburg':'Augsburg','FC Schalke 04':'Schalke','FC St. Pauli 1910':'St. Pauli','Hamburger SV':'Hamburg','RB Leipzig':'Leipzig','SC Freiburg':'Freiburg',
 'SC Paderborn 07':'Paderborn','SV 07 Elversberg':'Elversberg','SV Werder Bremen':'Werder Bremen','TSG 1899 Hoffenheim':'Hoffenheim','VfB Stuttgart':'Stuttgart','VfL Wolfsburg':'Wolfsburg',
 'Athletic Club':'Athletic Club','CA Osasuna':'Osasuna','Club Atlético de Madrid':'Atlético Madrid','Deportivo Alavés':'Alavés','Elche CF':'Elche','FC Barcelona':'Barcelona',
 'Getafe CF':'Getafe','Girona FC':'Girona','Levante UD':'Levante','Málaga CF':'Málaga','RC Celta de Vigo':'Celta Vigo','RC Deportivo La Coruña':'Deportivo',
 'RCD Espanyol de Barcelona':'Espanyol','RCD Mallorca':'Mallorca','Rayo Vallecano de Madrid':'Rayo Vallecano','Real Betis Balompié':'Real Betis','Real Madrid CF':'Real Madrid',
 'Real Oviedo':'Real Oviedo','Real Racing Club de Santander':'Racing Santander','Real Sociedad de Fútbol':'Real Sociedad','Sevilla FC':'Sevilla','Valencia CF':'Valencia','Villarreal CF':'Villarreal',
 'AJ Auxerre':'Auxerre','AS Monaco FC':'Monaco','Angers SCO':'Angers','ES Troyes AC':'Troyes','FC Lorient':'Lorient','FC Metz':'Metz','FC Nantes':'Nantes','Le Havre AC':'Le Havre',
 'Le Mans FC':'Le Mans','Lille OSC':'Lille','OGC Nice':'Nice','Olympique Lyonnais':'Lyon','Olympique de Marseille':'Marseille','Paris FC':'Paris FC','Paris Saint-Germain FC':'PSG',
 'RC Strasbourg Alsace':'Strasbourg','Racing Club de Lens':'Lens','Stade Brestois 29':'Brest','Stade Rennais FC 1901':'Rennes','Toulouse FC':'Toulouse',
 'AC Milan':'AC Milan','AC Monza':'Monza','AC Pisa 1909':'Pisa','ACF Fiorentina':'Fiorentina','AS Roma':'Roma','Atalanta BC':'Atalanta','Bologna FC 1909':'Bologna','Cagliari Calcio':'Cagliari',
 'Como 1907':'Como','FC Internazionale Milano':'Inter','Frosinone Calcio':'Frosinone','Genoa CFC':'Genoa','Hellas Verona FC':'Verona','Juventus FC':'Juventus','Parma Calcio 1913':'Parma',
 'SS Lazio':'Lazio','SSC Napoli':'Napoli','Torino FC':'Torino','US Cremonese':'Cremonese','US Lecce':'Lecce','US Sassuolo Calcio':'Sassuolo','Udinese Calcio':'Udinese','Venezia FC':'Venezia',
 'ADO Den Haag':'ADO Den Haag','AFC Ajax':'Ajax','AZ':'AZ Alkmaar','FC Groningen':'Groningen',"FC Twente '65":'Twente','FC Utrecht':'Utrecht','FC Volendam':'Volendam',
 'Feyenoord Rotterdam':'Feyenoord','Fortuna Sittard':'Fortuna Sittard','Go Ahead Eagles':'Go Ahead Eagles','Heracles Almelo':'Heracles','NAC Breda':'NAC Breda','NEC':'NEC Nijmegen',
 'PEC Zwolle':'PEC Zwolle','PSV':'PSV','SBV Excelsior':'Excelsior','SC Cambuur-Leeuwarden':'Cambuur','SC Heerenveen':'Heerenveen','Sparta Rotterdam':'Sparta Rotterdam',
 'Telstar 1963':'Telstar','Willem II Tilburg':'Willem II',
 'AVS':'AVS','Académico de Viseu FC':'Académico Viseu','CD Nacional':'Nacional','CD Santa Clara':'Santa Clara','CD Tondela':'Tondela','CF Estrela da Amadora':'Estrela Amadora',
 'CS Marítimo':'Marítimo','Casa Pia AC':'Casa Pia','FC Alverca':'Alverca','FC Arouca':'Arouca','FC Famalicão':'Famalicão','FC Porto':'Porto','GD Estoril Praia':'Estoril',
 'Gil Vicente FC':'Gil Vicente','Moreirense FC':'Moreirense','Rio Ave FC':'Rio Ave','Sport Lisboa e Benfica':'Benfica','Sporting Clube de Braga':'Braga',
 'Sporting Clube de Portugal':'Sporting CP','Vitória Guimarães':'Vitória SC'}
def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def ft(m):
    s = m.get('score')
    if isinstance(s, dict): s = s.get('ft')
    return s if isinstance(s, list) and len(s) == 2 else None
def rnd(r):
    n = re.findall(r'\d+', r or ''); return int(n[0]) if n else 0
index = {}
for code, lf in LEAGUES.items():
    for s in SEASONS:
        with urllib.request.urlopen(SRC.format(s=s, l=lf), timeout=60) as r: d = json.load(r)
        names = sorted({m['team1'] for m in d['matches']} | {m['team2'] for m in d['matches']})
        ix = {n: i for i, n in enumerate(names)}
        teams = [{'id': slug(SHORT.get(n, n)), 'name': n, 'short': SHORT.get(n, n)} for n in names]
        ms = []
        for m in d['matches']:
            sc = ft(m)
            ms.append([m['date'], rnd(m.get('round')), ix[m['team1']], ix[m['team2']]] + (sc if sc else []))
        played = [m for m in ms if len(m) == 6]
        out = {'league': code, 'season': s, 'title': d['name'], 'teams': teams, 'matches': ms,
               'played': len(played), 'total': len(ms), 'lastDate': max((m[0] for m in played), default=None),
               'source': 'openfootball/football.json (CC0-1.0)', 'built': datetime.date.today().isoformat()}
        json.dump(out, open(f'data/results/{s}_{code}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        index[f'{s}_{code}'] = {'played': out['played'], 'total': out['total'], 'lastDate': out['lastDate']}
        print(code, s, out['played'], '/', out['total'])
json.dump({'built': datetime.date.today().isoformat(), 'sets': index}, open('data/results/index.json', 'w'), separators=(',', ':'))
