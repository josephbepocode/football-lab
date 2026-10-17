import json, os, sys, math, urllib.request, concurrent.futures as cf, time
from collections import defaultdict
BASE='https://raw.githubusercontent.com/statsbomb/open-data/master/data/'
SETS=[('m_11.json','laliga'),('m_12.json','seriea'),('m_7.json','ligue1'),('m_9_281.json','bundesliga')]
def get(url):
    for i in range(5):
        try:
            with urllib.request.urlopen(url,timeout=60) as r: return json.load(r)
        except Exception as e:
            time.sleep(2+i*3); err=e
    raise err
def cached(kind,mid):
    p=f'raw/{kind}_{mid}.json'
    if os.path.exists(p): return json.load(open(p))
    d=get(f'{BASE}{kind}/{mid}.json'); json.dump(d,open(p+'.tmp','w')); os.rename(p+'.tmp',p); return d
def grp(pos):
    p=pos.lower()
    if 'goalkeeper' in p: return 'GK'
    if 'center back' in p: return 'CB'
    if 'back' in p: return 'FB'   # left/right back, wing back
    if 'defensive midfield' in p or 'center midfield' in p: return 'CM'
    if 'attacking midfield' in p or 'wing' in p or p in('left midfield','right midfield'): return 'AM'
    return 'FW'
def inbox(l): return l and l[0]>=102 and 18<=l[1]<=62
def gdist(l): return math.hypot(120-l[0],40-l[1])
SP={'Corner','Throw-in','Free Kick','Goal Kick','Kick Off'}
def proc(mid,match):
    out=f'sb/{mid}.json'
    if os.path.exists(out): return
    ev=cached('events',mid); lu=cached('lineups',mid)
    idn={match['home_team']['home_team_id']:match['home_team']['home_team_name'],match['away_team']['away_team_id']:match['away_team']['away_team_name']}
    for e in ev:
        if 'team' in e and e['team']['id'] in idn: e['team']['name']=idn[e['team']['id']]
    nick={}
    for t in lu:
        for p in t['lineup']: nick[p['player_id']]=p.get('player_nickname') or p['player_name']
    end={1:45,2:90}
    for e in ev:
        if e['type']['name']=='Half End': end[e['period']]=max(end.get(e['period'],0),e['minute']+e['second']/60)
    full=max(end.get(2,90),end.get(4,0) or 0)
    P={} ; on={}; posmin=defaultdict(lambda:defaultdict(float)); curpos={}
    def player(pid,team):
        if pid not in P: P[pid]=dict(id=pid,n=nick.get(pid,str(pid)),t=team,min=0,on=None,off=None)
        return P[pid]
    for e in ev:
        tn=e['type']['name']
        if tn=='Starting XI':
            for l in e['tactics']['lineup']:
                p=player(l['player']['id'],e['team']['name']); p['on']=0; curpos[p['id']]=(l['position']['name'],0)
        elif tn=='Substitution':
            t=e['minute']+e['second']/60
            off=player(e['player']['id'],e['team']['name']); off['off']=t
            r=e['substitution']['replacement']; p=player(r['id'],e['team']['name']); p['on']=t
            pos=e.get('position',{}).get('name') or curpos.get(off['id'],('Center Midfield',0))[0]
            curpos[p['id']]=(pos,t)
        elif tn in('Bad Behaviour','Foul Committed'):
            c=(e.get('bad_behaviour') or e.get('foul_committed') or {}).get('card',{}).get('name','')
            if c in('Red Card','Second Yellow') and 'player' in e: player(e['player']['id'],e['team']['name'])['off']=e['minute']+e['second']/60
        elif tn=='Tactical Shift':
            t=e['minute']+e['second']/60
            for l in e['tactics']['lineup']:
                pid=l['player']['id']
                if pid in curpos: posmin[pid][curpos[pid][0]]+=t-curpos[pid][1]
                curpos[pid]=(l['position']['name'],t)
    for p in P.values():
        if p['on'] is None: continue
        off=p['off'] if p['off'] is not None else full
        p['min']=max(0,round(off-p['on'],1))
        if p['id'] in curpos: posmin[p['id']][curpos[p['id']][0]]+=off-curpos[p['id']][1]
    S=defaultdict(lambda:defaultdict(float))
    shots=[]; xgby={}
    for e in ev:
        if e['type']['name']=='Shot': xgby[e['id']]=e['shot'].get('statsbomb_xg',0)
    teams=[match['home_team']['home_team_name'],match['away_team']['away_team_name']]
    T={t:defaultdict(float) for t in teams}
    for e in ev:
        tn=e['type']['name']; pl=e.get('player'); tm=e.get('team',{}).get('name')
        if not pl: continue
        s=S[pl['id']]; l=e.get('location'); ts=T.get(tm)
        if tn=='Shot':
            sh=e['shot']; xg=sh.get('statsbomb_xg',0); typ=sh['type']['name']; g=sh['outcome']['name']=='Goal'
            shots.append([round(l[0],1),round(l[1],1),round(xg,3),sh['outcome']['name'][:2],typ[:2],sh['body_part']['name'][0],e['minute'],pl['id'],tm])
            s['sh']+=1; s['xg']+=xg; s['g']+=g
            if typ!='Penalty': s['npsh']+=1; s['npxg']+=xg; s['npg']+=g
            if sh['outcome']['name'] in('Goal','Saved','Saved To Post'): s['sot']+=1
            if typ!='Penalty' and ts is not None: ts['npxg']+=xg
            if ts is not None: ts['xg']+=xg; ts['sh']+=1
        elif tn=='Pass':
            ps=e['pass']; ok='outcome' not in ps; typ=ps.get('type',{}).get('name')
            s['pa']+=1; s['pc']+=ok
            if ts is not None: ts['passes']+=1
            if ps.get('shot_assist') or ps.get('goal_assist'): s['kp']+=1; s['xa']+=xgby.get(ps.get('assisted_shot_id'),0)
            if ps.get('goal_assist'): s['ast']+=1
            el=ps.get('end_location')
            if ok and el and typ not in SP:
                if l[0]>=48 and gdist(el)<=0.75*gdist(l): s['prog']+=1
                if inbox(el) and not inbox(l): s['pbox']+=1
                if el[0]>=80 and l[0]<80: s['f3']+=1
                if ts is not None and el[0]>=80 and l[0]<80: ts['f3']+=1
            if ts is not None and l and l[0]<72: ts['opp_build']+=1  # passes in own 60%
        elif tn=='Carry':
            el=e['carry']['end_location']
            if el[0]-l[0]>=10 and el[0]>=48: s['pcar']+=1
            if inbox(el) and not inbox(l): s['cbox']+=1
        elif tn=='Dribble':
            s['dra']+=1; s['drc']+=e['dribble']['outcome']['name']=='Complete'
        elif tn=='Duel':
            d=e['duel']; dt=d['type']['name']
            if dt=='Tackle':
                s['tka']+=1
                if d.get('outcome',{}).get('name') in('Won','Success In Play','Success Out'): s['tkw']+=1
            elif dt=='Aerial Lost': s['aerl']+=1
            if ts is not None and l and l[0]>=48: ts['def_high']+=1
        elif tn=='Interception':
            s['int']+=1
            if ts is not None and l and l[0]>=48: ts['def_high']+=1
        elif tn=='Pressure':
            s['prs']+=1
            if l and l[0]>=80: s['prs3']+=1
        elif tn=='Ball Recovery':
            if not e.get('ball_recovery',{}).get('recovery_failure'): s['rec']+=1
        elif tn=='Block': s['blk']+=1
        elif tn=='Clearance': s['clr']+=1
        elif tn=='Foul Committed':
            if ts is not None and l and l[0]>=48: ts['def_high']+=1
        elif tn=='Ball Receipt*':
            if 'ball_receipt' not in e and inbox(l): s['tbox']+=1
        elif tn=='Dispossessed' or tn=='Miscontrol': s['lost']+=1
        for k in('pass','clearance','shot','miscontrol'):
            if e.get(k,{}).get('aerial_won'): s['aerw']+=1
        if tn=='Goal Keeper':
            gk=e['goalkeeper']; gt=gk['type']['name']
            if gt in('Shot Saved','Shot Saved Off T','Shot Saved to Post','Penalty Saved','Penalty Saved to Post'): s['sav']+=1
            if gt=='Goal Conceded': s['gc']+=1
    # goals prevented: psxg not avail; use xg faced on target
    players=[]
    for pid,p in P.items():
        if p['min']<=0: continue
        pm=posmin.get(pid,{})
        players.append(dict(id=pid,n=p['n'],t=p['t'],min=p['min'],pos={k:round(v,1) for k,v in pm.items() if v>0},s={k:round(v,4) for k,v in S[pid].items()}))
    o=dict(id=mid,d=match['match_date'],wk=match.get('match_week'),h=teams[0],a=teams[1],hs=match['home_score'],as_=match['away_score'],
           team={t:{k:round(v,3) for k,v in T[t].items()} for t in teams},players=players,shots=shots)
    json.dump(o,open(out+'.tmp','w'),separators=(',',':')); os.rename(out+'.tmp',out)
if __name__=='__main__':
  jobs=[]
  for f,lg in SETS:
      for m in json.load(open(f)): jobs.append((m['match_id'],m))
  print(len(jobs),flush=True)
  done=0
  with cf.ThreadPoolExecutor(24) as ex:
      fs={ex.submit(proc,mid,m):mid for mid,m in jobs}
      for f in cf.as_completed(fs):
          done+=1
          try: f.result()
          except Exception as e: print('ERR',fs[f],repr(e)[:200],flush=True)
          if done%50==0: print(done,flush=True)
  print('DONE',flush=True)
