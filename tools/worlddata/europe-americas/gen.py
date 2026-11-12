import os
import re,json,unicodedata,sys
OUT=sys.argv[1]
W='https://en.wikipedia.org/wiki/'
WC=W+"2026_Men%27s_T20_World_Cup_squads"
# Domestic teams: (short, name, level). level 1 = top division, 2 = second (players.js scales generated
# players by it). County levels are the 2027 County Championship divisions, settled by the 2026 table
# (Durham and Kent promoted; Leicestershire and Hampshire relegated): en.wikipedia.org/wiki/2026_County_Championship
D1_2027={'DUR','ESS','GLA','KEN','NOT','SOM','SUR','SUS','WAR','YOR'}
COUNTIES=[(s,n,1 if s in D1_2027 else 2) for s,n in [('DER','Derbyshire'),('DUR','Durham'),('ESS','Essex'),('GLA','Glamorgan'),('GLO','Gloucestershire'),('HAM','Hampshire'),('KEN','Kent'),('LAN','Lancashire'),('LEI','Leicestershire'),('MDX','Middlesex'),('NHT','Northamptonshire'),('NOT','Nottinghamshire'),('SOM','Somerset'),('SUR','Surrey'),('SUS','Sussex'),('WAR','Warwickshire'),('WOR','Worcestershire'),('YOR','Yorkshire')]]
N={
'ENG':dict(name='England',member='full',asOf='2026-10-29',teams=COUNTIES,note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). National squad: everyone who played for England since 9 Nov 2025 or holds a 2026-27 ECB contract (Wikipedia, citing the ECB, 12 Oct 2026). Added: recently retired internationals and leading county / franchise players already in the NPL data, each checked against their Wikipedia infobox (Nov 2026).',
  sources=[W+'England_cricket_team#Current_squad','https://www.ecb.co.uk/news/4590808/england-men-central-contracts-announced-for-20262027',WC,'Wikipedia player articles (infobox: birth date, batting, bowling, teams), read 11 Nov 2026',W+'2026_County_Championship']),
'WI':dict(name='West Indies',member='full',asOf='2026-02-07',teams=[('BAR','Barbados Pride',1),('GUY','Guyana Harpy Eagles',1),('JAM','Jamaica Scorpions',1),('LEE','Leeward Islands Hurricanes',1),('TT','Trinidad and Tobago Red Force',1),('WIN','Windward Islands Volcanoes',1)],
  note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). National squad list: Wikipedia "Current squad" (CWI contracts 2025-26, players since 17 Nov 2024; last updated 17 Nov 2025) plus the 2026 T20 World Cup squad. Added: Pooran, Russell, Narine and other leading regional / franchise players, each checked against their Wikipedia infobox (Nov 2026). Players from Combined Campuses or the WI Academy have no regional team listed.',
  sources=[W+'West_Indies_cricket_team#Current_squad','https://www.espncricinfo.com/story/justin-greaves-sherfane-rutherford-jomel-warrican-get-cricket-west-indies-contracts-for-2025-26-season-1505145',WC,'Wikipedia player articles (infobox), read 11 Nov 2026']),
'IRE':dict(name='Ireland',member='full',asOf='2026-11-01',teams=[('LEI','Leinster Lightning',1),('NK','Northern Knights',1),('NWW','North West Warriors',1),('MUN','Munster Reds',2)],
  note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). Players for Ireland since 4 Oct 2025 plus Cricket Ireland contracts of March 2026 (Wikipedia, updated 1 Nov 2026), the 2026 T20 World Cup squad, and recent internationals checked against their Wikipedia infobox. Munster Reds play the white-ball interprovincials only, and sat out the 2026 Inter-Provincial Cup (three teams).',
  sources=[W+'Ireland_cricket_team#Current_squad','https://cricketireland.ie/news/central-contracts-awarded/',WC,'Wikipedia player articles (infobox), read 11 Nov 2026']),
'SCO':dict(name='Scotland',member='associate',asOf='2026-08-13',teams=[('CH','Caledonian Highlanders',1),('EK','Eastern Knights',1),('WW','Western Warriors',1)],note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). Players for Scotland Dec 2024 - Feb 2026 (Wikipedia, updated 13 Aug 2026) plus the 2026 T20 World Cup squad. Domestic teams: the three Regional Super Series sides of 2026 (Cricket Scotland); player registrations to them not verified, so their rosters are generated.',sources=[W+'Scotland_national_cricket_team#Current_squad',WC,'https://cricketscotland.com/Article/26986078-81b6-4ece-836a-ec31c8709d97']),
'NED':dict(name='Netherlands',member='associate',asOf='2026-02-21',teams=[('KAM','Kampong',2),('VRA','VRA Amsterdam',2),('RCC','Rotterdam CC',2),('VCC','Voorburg CC',2),('HCC','HCC',2),('HBS','HBS Craeyenhout',2),('HDV','Hermes DVS',2),('VOC','VOC Rotterdam',2)],note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). Wikipedia "Current squad" (updated 21 Feb 2026) and the 2026 T20 World Cup squad. Domestic teams: the eight 2026 Topklasse clubs (tkcricket.com 2026 previews); club registrations not verified, so their rosters are generated.',sources=[W+'Netherlands_national_cricket_team#Current_squad',WC,'https://tkcricket.com/category/preview/preview-2026-tk/page/2/']),
'ITA':dict(name='Italy',member='associate',asOf='2026-02-19',teams=[],note='Wikipedia "Current squad" (updated 19 Feb 2026) and the 2026 T20 World Cup squad; Joe Burns from his Wikipedia article (Italy international from 2024).',sources=[W+'Italy_national_cricket_team#Current_squad',WC,W+'Joe_Burns']),
'JER':dict(name='Jersey',member='associate',asOf='2025-07-05',teams=[],note='Wikipedia "Current squad" (updated 5 Jul 2025). No newer verified squad found.',sources=[W+'Jersey_cricket_team#Current_squad']),
'DEN':dict(name='Denmark',member='associate',asOf='2025-08-18',teams=[],note='Wikipedia "Current squad" (updated 18 Aug 2025): 13 verified players; two generated players ({ gen: 1 }, fictional names) fill the squad to 15.',sources=[W+'Denmark_national_cricket_team#Current_squad']),
'GER':dict(name='Germany',member='associate',asOf='2025-07-03',teams=[],note='Wikipedia "Current squad" (updated 3 Jul 2025): 14 verified players; one generated wicket-keeper ({ gen: 1 }, fictional name) gives a second keeper.',sources=[W+'Germany_national_cricket_team#Current_squad']),
'ESP':dict(name='Spain',member='associate',asOf='2024-08-28',teams=[],note='Wikipedia "Current squad" (updated 28 Aug 2024, the newest verified list): 15 players; one generated wicket-keeper ({ gen: 1 }, fictional name) gives a second keeper.',sources=[W+'Spain_national_cricket_team#Current_squad']),
'FRA':dict(name='France',member='associate',asOf='2025-08-07',teams=[],note='Wikipedia "Current squad" (updated 7 Aug 2025).',sources=[W+'France_national_cricket_team#Current_squad']),
'USA':dict(name='USA',member='associate',asOf='2026-10-13',teams=[('MA','Mid-Atlantic',1),('SW','South-West',1),('S','South',1),('W','West',1),('E','East',1),('MW','Mid-West',1),('RED','Red',1),('BLU','Blue',1)],note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). Wikipedia "Current roster" (players for USA in the last 24 months; updated 13 Oct 2026) and the 2026 T20 World Cup squad. Aaron Jones and Unmukt Chand are US-based players already in the NPL data. MLC franchises are not listed here: no shared franchise ids exist yet. Domestic teams: the eight sides of the 2024 Men\'s 50-Over National Championship (USA Cricket); registrations not verified, so their rosters are generated.',sources=[W+'United_States_national_cricket_team#Current_roster',WC,'https://usacricket.org/featured-news/mid-atlantic-crowned-champions-as-2024-mens-national-championship-concludes/']),
'CAN':dict(name='Canada',member='associate',asOf='2026-02-20',teams=[],note='W3: players added from the 2026 Hundred, MLC and CPL squads and the 18 county Current squad tables (Wikipedia, read 12 Nov 2026); birth year, hand, bowling type and role from the article or table; ratings are the game estimates (league-tier default, higher for current internationals). Wikipedia "Current squad" (updated 20 Feb 2026) and the 2026 T20 World Cup squad. Birth years for Pargat Singh and Rishiv Joshi come from the age shown (approximate).',sources=[W+'Canada_national_cricket_team#Current_squad',WC]),
'BER':dict(name='Bermuda',member='associate',asOf='2025-06-15',teams=[],note='Wikipedia "Current squad" (updated 15 Jun 2025).',sources=[W+'Bermuda_national_cricket_team#Current_squad']),
}
def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace("'","")
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
seen=set()
for code,m in N.items():
    rows=[]
    for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'spec',f'{code}.txt')):
        line=line.rstrip('\n')
        if not line: continue
        f=line.split('|'); name,born,role,bat,bowl,typ,hand,fm,dom=f[:9]; gen=(len(f)>9 and f[9]=='gen') or dom=='gen'
        if dom=='gen': dom=''
        t,o,c=[int(x) for x in fm.split(',')]
        fmo={'t20':t,'odi':o,'fc':c}
        if gen: fmo['gen']=1
        pid=f'{code.lower()}-{slug(name)}'; assert pid not in seen,pid; seen.add(pid)
        teams=[code]+[(d if '-' in d else f'{code}-{d}') for d in dom.split(',') if d]  # 'ENG-SUR' (a team id with a dash) registers a player at another nation's team, e.g. a county
        rows.append([pid,name,code,int(born),role,int(bat),int(bowl),typ,hand,fmo,teams])
    def js(v):
        if isinstance(v,dict): return '{ '+', '.join(f'{k}: {v[k]}' for k in v)+' }'
        if isinstance(v,list): return '['+', '.join(js(x) for x in v)+']'
        if isinstance(v,str): return json.dumps(v,ensure_ascii=False).replace("\\\"","\"") if "'" in v else "'"+v+"'"
        return str(v)
    out=[f"// {m['name']}: national and domestic players. Ratings are the game's estimates.",
         "// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)",
         "// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.",
         "// "+m['note'],
         "export default {",
         f"  code: '{code}', name: '{m['name']}', member: '{m['member']}', asOf: '{m['asOf']}',",
         "  sources: ["+', '.join(js(s) for s in m['sources'])+"],",
         "  players: ["]
    out+=[f"    {js(r)}," for r in rows]
    out.append("  ],")
    out.append("  teams: ["+''.join(f"\n    {{ id: '{code}-{t[0]}', name: '{t[1]}', short: '{t[0]}', kind: 'domestic'{f', level: {t[2]}' if len(t)>2 else ''} }}," for t in m['teams'])+("\n  " if m['teams'] else "")+"],")
    out+=["  comps: [],","};",""]
    open(f'{OUT}/{code}.js','w').write('\n'.join(out))
    print(code,len(rows))
