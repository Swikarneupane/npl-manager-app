// Generates src/data/world/nations/{AUS,NZ,SA,ZIM,...}.js from compact specs.
// line: Name|born|role|bat|bowl|type|hand|fm t20/odi/fc|domestic short|gen
import { writeFileSync } from 'node:fs';
const OUT = process.argv[2];
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const N = {};
N.AUS = {
  name: 'Australia', member: 'full', asOf: '2026-10-01',
  note: 'Test squad for the South Africa tour and ODI squad for Zimbabwe/South Africa (named Sep 2026), the 2026 T20 World Cup squad, and leading Sheffield Shield / Marsh Cup players.',
  sources: [
    'https://www.cricket.com.au/news/4573063/australia-test-squad-south-africa-tour-2026-selection-labuschagne-renshaw-cummins-starc-cooper-kuhnemann-neser',
    'https://www.outlookindia.com/sports/cricket/australia-odi-squad-zimbabwe-south-africa-2026-mitchell-marsh-travis-head',
    'https://www.cricket.com.au/news/4427747/all-the-squads-for-icc-mens-t20-world-cup-2026-as-they-drop-australia-india-england-pakistan-bangladesh-afghanistan',
    'ESPNcricinfo player pages (batting hand, bowling style, state)',
  ],
  teams: [['NSW', 'New South Wales', 1], ['QLD', 'Queensland', 1], ['VIC', 'Victoria', 1], ['WA', 'Western Australia', 1], ['SA', 'South Australia', 1], ['TAS', 'Tasmania', 1]],
  p: `
Pat Cummins|1993|BOWL|52|92|RF|R|0/1/2|NSW
Mitchell Starc|1990|BOWL|45|89|LF|L|1/2/1|NSW
Josh Hazlewood|1991|BOWL|30|90|RFM|L|0/1/2|NSW
Scott Boland|1989|BOWL|30|84|RFM|R|-6/-3/4|VIC
Nathan Lyon|1987|BOWL|35|86|OB|R|-6/-2/4|NSW
Steve Smith|1989|BAT|89|30|LB|R|-3/0/3|NSW
Marnus Labuschagne|1994|BAT|84|32|LB|R|-5/-1/3|QLD
Travis Head|1993|BAT|86|38|OB|L|2/1/0|SA
Alex Carey|1991|WK|76|0||L|0/1/1|SA
Josh Inglis|1995|WK|78|0||R|2/1/-1|WA
Cameron Green|1999|AR|80|72|RFM|R|0/1/1|WA
Beau Webster|1993|AR|74|66|RM|R|-2/0/2|TAS
Matthew Renshaw|1996|BAT|74|20||L|-2/0/3|QLD
Cooper Connolly|2003|AR|70|58|SLA|L|2/1/-2|WA
Matthew Kuhnemann|1996|BOWL|30|76|SLA|L|-2/0/2|TAS
Michael Neser|1990|AR|62|80|RFM|R|-2/0/3|QLD
Todd Murphy|2000|BOWL|30|74|OB|L|-4/-2/3|
Jake Weatherald|1994|BAT|72|0||L|-2/-1/3|TAS
Sam Konstas|2005|BAT|70|20||R|-1/0/2|NSW
Nathan McSweeney|1999|BAT|70|30|OB|R|-2/0/2|SA
Mitchell Marsh|1991|AR|80|62|RM|R|2/1/-2|WA
Glenn Maxwell|1988|AR|80|64|OB|R|4/1/-6|VIC
Tim David|1996|BAT|78|28|OB|R|6/0/-8|
Marcus Stoinis|1989|AR|76|64|RM|R|3/1/-6|WA
Adam Zampa|1992|BOWL|30|84|LB|R|2/2/-6|NSW
Nathan Ellis|1994|BOWL|35|78|RFM|R|3/0/-2|TAS
Xavier Bartlett|1998|BOWL|40|74|RFM|R|2/1/0|QLD
Spencer Johnson|1995|BOWL|32|73|LF|L|2/0/-2|SA
Ben Dwarshuis|1994|BOWL|35|72|LFM|L|2/0/0|NSW
Sean Abbott|1992|AR|55|74|RFM|R|1/1/0|NSW
Aaron Hardie|1999|AR|64|64|RM|R|0/1/0|WA
Matthew Short|1995|AR|70|60|OB|R|3/1/-2|SA
Jake Fraser-McGurk|2002|BAT|70|15||R|4/0/-3|SA
Josh Philippe|1997|WK|68|0||R|3/0/-3|NSW
Ben McDermott|1994|BAT|70|0||R|2/0/-1|TAS
Chris Green|1993|AR|58|64|OB|R|3/0/-4|NSW
Daniel Sams|1992|AR|62|64|LFM|R|3/0/-3|NSW
Mitchell Owen|2001|AR|70|50|RM|R|4/0/-2|TAS
Tanveer Sangha|2001|BOWL|25|70|LB|R|1/1/-1|NSW
Lance Morris|1998|BOWL|25|74|RF|R|-1/0/2|WA
Jhye Richardson|1996|BOWL|40|76|RF|R|0/0/1|WA
Billy Stanlake|1994|BOWL|20|72|RF|L|1/1/-1|
Oliver Peake|2006|BAT|64|0||L|0/0/0|VIC
David Warner|1986|BAT|78|0||L|3/0/-4|
Chris Lynn|1990|BAT|70|0||R|4/-1/-6|
Ben Cutting|1987|AR|62|58|RFM|R|3/0/-4|
Josh Brown|1993|BAT|66|0||R|4/-1/-6|
Sam Heazlett|1995|BAT|64|0||L|1/0/0|QLD
D'Arcy Short|1990|AR|68|50|LWS|L|3/0/-4|
Peter Handscomb|1991|BAT|72|0||R|-2/0/3|VIC
Marcus Harris|1992|BAT|72|0||L|-2/0/3|VIC
Henry Hunt|1997|BAT|68|0||R|-2/0/2|SA
Kurtis Patterson|1993|BAT|70|0||L|-2/0/2|NSW
Jordan Silk|1992|BAT|68|0||R|0/1/1|TAS
Caleb Jewell|1997|BAT|68|0||L|0/0/1|TAS
Jason Sangha|1999|BAT|68|20||R|0/0/1|SA
Campbell Kellaway|2002|BAT|66|0||L|-1/0/2|VIC
Sam Whiteman|1992|WK|66|0||L|0/0/1|WA
Jimmy Peirson|1992|WK|66|0||R|0/0/1|QLD
Tim Ward|1998|BAT|66|0||L|-1/0/2|TAS
Mitchell Swepson|1993|BOWL|30|70|LB|R|0/0/1|QLD
Brendan Doggett|1994|BOWL|25|76|RF|R|-1/0/2|SA
Mark Steketee|1994|BOWL|40|74|RFM|R|0/0/1|QLD
Fergus O'Neill|2001|BOWL|35|72|RFM|R|-2/0/2|VIC
Riley Meredith|1996|BOWL|20|72|RF|R|1/0/0|TAS
Wes Agar|1997|BOWL|30|70|RFM|R|0/0/1|SA
Jack Edwards|2000|AR|64|64|RFM|R|1/1/0|NSW
Ollie Davies|2000|BAT|66|20||R|1/0/0|NSW
Hilton Cartwright|1992|AR|66|50|RM|R|0/1/0|WA
Will Sutherland|1999|AR|66|70|RFM|R|0/1/1|VIC
Corey Rocchiccioli|1997|BOWL|35|70|OB|R|-2/0/2|WA
Teague Wyllie|2004|BAT|62|0||L|-1/0/2|WA
`};

N.NZ = {
  name: 'New Zealand', member: 'full', asOf: '2026-10-11',
  note: 'ODI squads for the home series v India (named Oct 2026), the 2026 Test tour of Ireland/England, the 2026 T20 World Cup, and leading Plunket Shield / Ford Trophy / Super Smash players.',
  sources: [
    'https://tribune.com.pk/story/2634211/new-zealand-split-odi-squads-for-india-series',
    'https://www.geosuper.tv/latest/55784-new-zealand-announce-squad-for-ireland-england-tests',
    'https://www.nzc.nz/international/news',
    'ESPNcricinfo player pages (batting hand, bowling style, association)',
  ],
  teams: [['AUC', 'Auckland', 1], ['NDI', 'Northern Districts', 1], ['CTD', 'Central Districts', 1], ['WEL', 'Wellington', 1], ['CAN', 'Canterbury', 1], ['OTA', 'Otago', 1]],
  p: `
Kane Williamson|1990|BAT|88|28|OB|R|0/2/3|NDI
Tom Latham|1992|WK|80|0||L|-4/1/3|CAN
Devon Conway|1991|BAT|80|0||L|1/1/1|WEL
Rachin Ravindra|1999|AR|78|60|SLA|L|1/2/0|WEL
Daryl Mitchell|1991|BAT|82|40|RM|R|0/2/1|CAN
Glenn Phillips|1996|AR|77|62|OB|R|2/1/0|OTA
Mitchell Santner|1992|AR|66|78|SLA|L|2/2/-1|NDI
Michael Bracewell|1991|AR|70|68|OB|L|1/1/0|WEL
Matt Henry|1991|BOWL|40|84|RFM|R|0/1/2|CAN
Kyle Jamieson|1995|AR|50|82|RFM|R|-1/1/2|CAN
Jacob Duffy|1994|BOWL|25|78|RFM|R|2/1/0|OTA
Will O'Rourke|2001|BOWL|20|80|RF|R|-2/0/3|CAN
Ben Sears|1998|BOWL|20|74|RF|R|0/0/0|WEL
Zak Foulkes|2002|AR|50|68|RFM|R|0/0/1|CAN
Nathan Smith|1998|AR|58|70|RFM|R|0/1/1|WEL
Blair Tickner|1993|BOWL|25|72|RFM|R|0/1/0|CTD
Lockie Ferguson|1991|BOWL|20|80|RF|R|3/1/-3|AUC
Adam Milne|1992|BOWL|21|72|RF|R|2/0/-3|CTD
Ish Sodhi|1992|BOWL|31|73|LB|R|2/0/-2|NDI
Will Young|1992|BAT|76|0||R|0/1/2|CTD
Mark Chapman|1994|BAT|72|30|SLA|L|2/1/-2|AUC
Finn Allen|1999|BAT|74|0||R|5/0/-5|WEL
Tim Seifert|1994|WK|74|0||R|4/0/-4|NDI
Mitch Hay|2000|WK|68|0||R|1/1/0|CAN
Nick Kelly|1993|BAT|68|0||L|0/1/0|WEL
Kristian Clarke|2001|AR|50|66|RFM|R|0/0/0|NDI
Matt Fisher|1999|BOWL|25|68|RFM|R|0/0/0|NDI
Tom Blundell|1990|WK|74|0||R|-2/0/2|WEL
Henry Nicholls|1991|BAT|74|0||L|-2/0/2|CAN
Jimmy Neesham|1990|AR|70|62|RFM|L|1/1/-2|WEL
Scott Kuggeleijn|1992|BOWL|50|70|RFM|R|1/0/0|NDI
Colin Munro|1987|BAT|70|0||L|4/0/-6|
Martin Guptill|1986|BAT|70|0||R|3/1/-6|
Trent Boult|1989|BOWL|35|82|LFM|R|3/1/-4|NDI
Ajaz Patel|1988|BOWL|25|76|SLA|L|-6/-3/4|AUC
Dean Foxcroft|1998|AR|66|50|OB|R|1/0/0|OTA
Bevon Jacobs|2002|BAT|64|0||R|2/0/-1|AUC
Muhammad Abbas|2003|AR|64|55|RM|L|1/1/0|WEL
Tim Robinson|2002|BAT|66|0||R|2/0/0|WEL
Josh Clarkson|1997|AR|64|55|RM|R|1/0/0|CTD
Rhys Mariu|2002|BAT|66|0||R|0/0/1|CAN
Henry Shipley|1996|AR|58|66|RFM|L|0/1/0|CAN
Michael Rippon|1991|AR|58|66|LWS|R|0/0/1|OTA
Adithya Ashok|2002|BOWL|30|64|LB|L|0/0/0|AUC
Ben Lister|1996|BOWL|20|68|LFM|R|0/0/1|AUC
Doug Bracewell|1990|AR|60|66|RFM|R|0/0/1|CTD
Dane Cleaver|1992|WK|64|0||R|0/0/1|CTD
Cam Fletcher|1993|WK|62|0||R|0/0/1|CAN
Jayden Lennox|1994|BOWL|25|66|SLA|R|0/0/1|CTD
Joe Carter|1993|BAT|66|0||R|0/0/1|NDI
Katene Clarke|1993|BAT|64|0||R|0/0/1|NDI
Jeet Raval|1988|BAT|66|0||L|-2/0/2|NDI
Dale Phillips|1999|AR|62|50|OB|R|0/0/0|OTA
Tom Bruce|1991|BAT|66|0||R|1/0/0|CTD
`};

N.SA = {
  name: 'South Africa', member: 'full', asOf: '2026-11-02',
  note: 'Test squad v Bangladesh (named 2 Nov 2026), recent white-ball squads (2026 T20 World Cup, India T20Is), and leading CSA four-day / one-day / T20 Challenge players.',
  sources: [
    'https://www.crictracker.com/cricket-news/south-africa-name-15-member-squad-for-test-series-against-bangladesh-4880/',
    'https://www.clubcricket.co.za/latestnews/proteas-include-uncapped-pair-in-squad-for-india-t20is/',
    'https://www.cricket.com.au/news/4427747/all-the-squads-for-icc-mens-t20-world-cup-2026-as-they-drop-australia-india-england-pakistan-bangladesh-afghanistan',
    'ESPNcricinfo player pages (batting hand, bowling style, provincial team)',
  ],
  // level: the 2026-27 divisions (Knights promoted, KZN Inland relegated):
  // https://supersport.com/cricket/news/1ea4d45c-e491-42b1-9871-b6aa07e53528/first-class-series-edges-closer-as-domestic-season-begins
  teams: [['TIT', 'Titans', 1], ['LIO', 'Lions', 1], ['DOL', 'Dolphins', 1], ['WP', 'Western Province', 1], ['WAR', 'Warriors', 1], ['KNI', 'Knights', 1], ['NW', 'North West', 1], ['BOL', 'Boland', 1],
    ['BOR', 'Border', 2], ['EAS', 'Easterns', 2], ['NC', 'Northern Cape', 2], ['KZI', 'KZN Inland', 2], ['SWD', 'South Western Districts', 2], ['LIM', 'Limpopo', 2], ['MPU', 'Mpumalanga', 2]],
  p: `
Temba Bavuma|1990|BAT|80|0||R|-3/1/3|LIO
Aiden Markram|1994|BAT|82|50|OB|R|0/1/2|TIT
Ryan Rickelton|1996|WK|78|0||L|1/1/1|LIO
Tony de Zorzi|1997|BAT|74|0||L|-2/0/2|WP
Tristan Stubbs|2000|BAT|76|30|OB|R|2/0/0|WAR
Matthew Breetzke|1998|BAT|74|0||R|0/2/0|WAR
Dewald Brevis|2003|BAT|76|30|LB|R|4/0/-2|TIT
Kyle Verreynne|1997|WK|74|0||R|-2/0/2|WP
Wiaan Mulder|1998|AR|74|66|RM|R|-2/0/3|LIO
Marco Jansen|2000|AR|66|84|LF|R|0/1/2|WAR
Kagiso Rabada|1995|BOWL|40|91|RF|L|0/1/2|LIO
Lungi Ngidi|1996|BOWL|20|80|RF|R|1/1/0|TIT
Anrich Nortje|1993|BOWL|20|82|RF|R|2/1/0|WAR
Keshav Maharaj|1990|BOWL|45|82|SLA|R|-1/1/3|DOL
Simon Harmer|1989|BOWL|45|80|OB|R|-6/-3/5|
Senuran Muthusamy|1994|AR|62|70|SLA|L|-3/0/3|
Corbin Bosch|1994|AR|62|72|RFM|R|0/0/1|TIT
Dane Paterson|1989|BOWL|30|76|RFM|R|-2/0/3|WP
Marques Ackerman|1996|BAT|70|30|OB|R|-2/0/2|DOL
Zubayr Hamza|1995|BAT|72|0||R|-2/0/3|
David Bedingham|1994|BAT|72|0||R|-2/0/3|
Heinrich Klaasen|1991|WK|82|0||R|4/2/-6|TIT
David Miller|1989|BAT|78|0||L|3/1/-4|DOL
Quinton de Kock|1992|WK|80|0||L|3/2/-4|TIT
Reeza Hendricks|1989|BAT|72|0||R|1/1/-1|LIO
Rassie van der Dussen|1989|BAT|72|0||R|0/1/0|LIO
George Linde|1991|AR|62|64|SLA|L|1/0/0|
Bjorn Fortuin|1994|BOWL|27|70|SLA|R|1/0/0|LIO
Donovan Ferreira|1998|AR|66|60|OB|R|3/0/-2|TIT
Rilee Rossouw|1989|BAT|72|0||L|3/0/-4|
Tabraiz Shamsi|1990|BOWL|25|74|LWS|R|2/0/-4|
Faf du Plessis|1984|BAT|72|0||R|3/0/-6|
Wayne Parnell|1989|BOWL|50|68|LFM|L|2/0/-3|
Marchant de Lange|1990|BOWL|35|70|RF|R|2/0/-2|
Gerald Coetzee|2000|BOWL|40|80|RF|R|1/1/0|TIT
Nandre Burger|1995|BOWL|25|76|LFM|L|1/1/0|
Kwena Maphaka|2006|BOWL|20|76|LF|L|1/0/0|LIO
Ottniel Baartman|1993|BOWL|25|72|RFM|R|1/0/0|
Lizaad Williams|1993|BOWL|30|74|RFM|L|1/1/0|TIT
Lutho Sipamla|1998|BOWL|25|70|RFM|R|0/0/0|LIO
Nqabayomzi Peter|2002|BOWL|25|70|LB|R|1/0/0|LIO
Prenelan Subrayen|1993|BOWL|30|72|OB|R|0/0/1|DOL
Lhuan-dre Pretorius|2006|WK|72|0||L|1/1/0|TIT
Sinethemba Qeshile|1999|WK|66|0||R|0/0/1|
Tshepo Moreki|1995|BOWL|25|70|RFM|R|0/0/1|LIO
Codi Yusuf|1999|BOWL|40|72|RFM|R|0/0/1|LIO
Keegan Petersen|1993|BAT|72|0||R|-2/0/2|
Raynard van Tonder|1998|BAT|68|0||R|-1/0/2|
Sarel Erwee|1989|BAT|70|0||L|-2/0/2|DOL
Eathan Bosch|1998|AR|50|68|RFM|R|0/0/1|DOL
Andile Phehlukwayo|1996|AR|62|66|RFM|L|1/1/-1|DOL
Junior Dala|1989|BOWL|25|68|RFM|R|1/0/0|
Mihlali Mpongwana|2000|AR|55|66|RFM|R|1/0/0|
`};

N.ZIM = {
  name: 'Zimbabwe', member: 'full', asOf: '2026-07-22',
  note: 'T20 World Cup 2026 squad, home T20I squads v Bangladesh and India (Jul 2026), recent Test and ODI squads. Domestic franchise registrations not verified, so players carry the national team only.',
  sources: [
    'https://www.icc-cricket.com/tournaments/mens-t20-world-cup-2026/news/zimbabwe-unveil-squad-for-t20-world-cup-2026',
    'https://sundayguardianlive.com/sports/ind-vs-zim-zimbabwe-announces-squad-for-t20i-series-against-india-sikandar-raza-to-lead-tafadzwa-tsiga-earns-maiden-call-up-243384/',
    'https://www.geosuper.tv/latest/57683-zimbabwe-name-squad-for-home-t20i-series-against-bangladesh',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
    'ESPNcricinfo player pages (batting hand, bowling style)',
  ],
  teams: [['ME', 'Mashonaland Eagles', 1], ['MOU', 'Mountaineers', 1], ['MT', 'Matabeleland Tuskers', 1], ['MWR', 'Mid West Rhinos', 1], ['SR', 'Southern Rocks', 1]],
  p: `
Sikandar Raza|1986|AR|76|70|OB|R|1/1/0|
Craig Ervine|1985|BAT|72|0||L|-1/1/2|
Sean Williams|1986|AR|72|60|SLA|L|0/1/1|
Brian Bennett|2003|BAT|74|45|OB|R|1/1/0|
Ben Curran|1996|BAT|68|0||L|0/1/1|
Nick Welch|1998|BAT|66|0||R|-1/0/2|
Brendan Taylor|1986|WK|72|0||R|1/1/0|
Tafadzwa Tsiga|1999|WK|60|0||R|0/0/1|
Clive Madande|2000|WK|60|0||R|0/0/1|
Joylord Gumbie|1996|WK|62|0||R|0/0/1|
Tadiwanashe Marumani|2002|WK|62|0||L|1/0/-1|
Nyasha Mayavo|1998|BAT|60|0||R|0/0/1|
Wessly Madhevere|2000|AR|64|55|OB|R|1/0/0|
Dion Myers|2002|BAT|64|30|RM|R|0/1/0|
Ryan Burl|1994|AR|62|62|LB|L|1/0/0|
Tony Munyonga|1999|BAT|60|30|OB|R|1/0/-1|
Tashinga Musekiwa|1993|AR|58|50|LB|R|1/0/-1|
Milton Shumba|2000|AR|60|50|SLA|L|1/0/0|
Takudzwanashe Kaitano|1993|BAT|60|0||R|-2/0/2|
Johnathan Campbell|1998|AR|60|50|LB|L|0/0/1|
Innocent Kaia|1992|BAT|60|0||R|0/1/0|
Prince Masvaure|1988|BAT|58|0||R|-1/0/1|
Blessing Muzarabani|1996|BOWL|20|80|RFM|R|0/1/1|
Richard Ngarava|1997|BOWL|25|76|LFM|L|1/1/0|
Tendai Chatara|1991|BOWL|20|70|RFM|R|0/1/0|
Victor Nyauchi|1993|BOWL|20|70|RFM|R|0/0/1|
Tanaka Chivanga|1997|BOWL|20|70|RFM|R|0/0/1|
Trevor Gwandu|1997|BOWL|30|66|RFM|R|0/0/0|
Brad Evans|1997|AR|50|70|RFM|R|0/1/0|
Wellington Masakadza|1993|BOWL|40|72|SLA|L|1/0/0|
Newman Nyamhuri|2006|BOWL|25|66|LFM|L|0/0/0|
Vincent Masekesa|1999|BOWL|25|66|RFM|R|0/0/1|
Tinotenda Maposa|2001|BOWL|25|66|RFM|R|0/0/0|
Graeme Cremer|1986|BOWL|40|66|LB|R|1/0/-1|
Faraz Akram|1996|AR|50|62|RFM|R|0/0/0|
Luke Jongwe|1995|AR|50|64|RFM|R|1/0/0|
Brandon Mavuta|1997|BOWL|40|66|LB|R|0/0/1|
Carl Mumba|1995|BOWL|25|66|RFM|R|0/0/1|
Ernest Masuku|2000|BOWL|20|64|RFM|R|0/0/0|
Roy Kaia|1991|AR|58|55|OB|R|0/0/1|
`};

// Associates: domestic teams only where listed (Namibia); fm default favours white-ball (little first-class cricket).
N.NAM = {
  name: 'Namibia', member: 'associate', asOf: '2026-02-21',
  note: 'Squad list on Wikipedia (updated 21 Feb 2026), T20 World Cup 2026 squad and the 2025 Africa Qualifier squad. Domestic teams: clubs of the Cricket Namibia 50-over Premier League named in 2025-26 reports; club registrations not verified, so their rosters are generated.',
  sources: ['https://en.wikipedia.org/wiki/Namibia_national_cricket_team', 'https://www.icc-cricket.com/tournaments/mens-t20-world-cup-2026/news/erasmus-leads-namibia-for-icc-men-s-t20-world-cup-2026', 'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
    'https://www.we.com.na/sport-wrap-main/leaders-ccd-tigers-to-meet-winless-old-boys2025-01-24146186', 'https://cricketnamibia.com/celebrating-excellence-at-2026-cricket-namibia-annual-awards/'],
  teams: [['WAN', 'Wanderers', 2], ['TU', 'Trustco United', 2], ['WHS', 'WHS Old Boys', 2], ['CCD', 'CCD Tigers', 2]],
  p: `
Gerhard Erasmus|1995|AR|68|56|OB|R||
JJ Smit|1995|AR|64|64|LFM|R||
Ruben Trumpelmann|1998|BOWL|42|77|LFM|R||
Bernard Scholtz|1990|BOWL|24|64|SLA|R||
Jan Nicol Loftie-Eaton|2001|BAT|66|40|LB|L||
Niko Davin|1998|BAT|60|30|LB|R||
Louren Steenkamp|1997|BAT|60|30|OB|R||
Jean-Pierre Kotze|1994|BAT|62|0||L||
Malan Kruger|1995|BAT|60|0||R||
Dylan Leicher|2004|BAT|56|35|RM|R||
Michael van Lingen|1997|AR|60|50|LM|L||
Shaun Fouche|2000|AR|52|55|RM|R||
Alexander Busing-Volschenk|2005|AR|52|52|RM|R||
Jan Frylinck|1994|AR|58|62|LFM|L||
Zane Green|1996|WK|60|0||L||
JC Balt|2000|BAT|56|0||R||
Jack Brassell|2005|BOWL|25|56|RM|R||
Tangeni Lungameni|1992|BOWL|30|60|LM|L||
Ben Shikongo|2000|BOWL|25|62|RFM|R||
Jan-Izak de Villiers|2001|BOWL|25|58|RM|R||
Peter-Daniel Blignaut|2005|BOWL|25|56|SLA|R||
Kobus Ventersdorp|2001|WK|48|0||R|||G
`};

N.PNG = {
  name: 'Papua New Guinea', member: 'associate', asOf: '2026-05-08',
  note: '2024 T20 World Cup squad, Wikipedia squad list, and the 2026 East Asia-Pacific Qualifier squad (players whose styles could be confirmed).',
  sources: ['https://en.wikipedia.org/wiki/Papua_New_Guinea_national_cricket_team', 'https://www.nbc.com.pg/post/35356/barramundis-depart-for-japan'],
  p: `
Assad Vala|1987|AR|62|56|OB|R||
Sese Bau|1992|BAT|60|30|RM|L||
Tony Ura|1989|BAT|62|0||R||
Lega Siaka|1993|BAT|58|35|LB|R||
Hiri Hiri|1995|BAT|52|40|OB|R||
Gaudi Toka|1994|BAT|52|30|RM|L||
Norman Vanua|1994|AR|52|58|RM|R||
Charles Amini|1992|AR|56|54|LB|L||
Chad Soper|1992|AR|50|58|RM|R||
Simon Atai|1999|AR|50|52|SLA|L||
Kiplin Doriga|1995|WK|50|0||R||
Hila Vare|2001|WK|52|0||L||
John Kariko|2004|BOWL|30|56|SLA|L||
Riley Hekure|1995|BOWL|25|54|RM|R||
Semo Kamea|2001|BOWL|25|58|LF|L||
Kabua Morea|1993|BOWL|30|58|LM|R||
Alei Nao|1994|BOWL|30|60|RM|R||
Damien Ravu|1994|BOWL|25|54|RM|R||
`};

N.UGA = {
  name: 'Uganda', member: 'associate', asOf: '2026-03-03',
  note: '2024 T20 World Cup squad, 2025 Africa Qualifier squad, and the March 2026 Namibia tour squad.',
  sources: ['https://en.wikipedia.org/wiki/Uganda_national_cricket_team', 'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out', 'https://nbssport.co.ug/2026/03/03/cricket-uganda-name-youthful-squad-for-crucial-namibia-tour/'],
  p: `
Riazat Ali Shah|1998|AR|62|56|RM|R||
Brian Masaba|1991|AR|56|52|LB|R||
Kenneth Waiswa|1998|AR|56|56|RM|R||
Alpesh Ramjani|1994|AR|56|62|SLA|L||
Simon Ssesazi|1996|BAT|58|20||R||
Ronak Patel|1988|BAT|54|40|SLA|R||
Roger Mukasa|1989|BAT|54|30|OB|R||
Robinson Obuya|2001|BAT|56|0||R||
Ronald Lutaaya|2003|BAT|50|30|RM|L||
Pascal Murungi|2004|BAT|50|30|RM|R||
Arnold Otwani|1995|BAT|48|30|SLA|R||
Fred Achelam|2001|WK|50|0||R||
Cyrus Kakuru|2003|WK|54|0||R||
Henry Ssenyondo|1993|BOWL|30|62|SLA|R||
Cosmas Kyewuta|2002|BOWL|30|58|OB|R||
Joseph Baguma|2004|BOWL|25|54|OB|R||
Frank Nsubuga|1980|BOWL|30|58|OB|R||
Dinesh Nakrani|1991|BOWL|40|58|LM|L||
Juma Miyaji|2003|BOWL|30|58|RM|R||
Bilal Hassan|1990|BOWL|25|58|RFM|R||
`};

N.KEN = {
  name: 'Kenya', member: 'associate', asOf: '2025-08-31',
  note: 'Wikipedia squad list (Jersey series, Aug 2025) and the 2025 Africa Qualifier squad.',
  sources: ['https://en.wikipedia.org/wiki/Kenya_national_cricket_team', 'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out'],
  p: `
Dhiren Gondaria|1996|BAT|58|35|OB|R||
Pushkar Sharma|2002|BAT|56|30|LM|L||
Sachin Bhudia|1995|BAT|52|30|RM|R||
Jasraj Kundi|2000|BAT|52|30|RM|R||
Nelson Odhiambo|1990|AR|52|52|RM|R||
Rakep Patel|1990|AR|58|50|OB|R||
Sukhdeep Singh|2002|WK|50|0||R||
Irfan Karim|1993|WK|52|0||R||
Shem Ngoche|1990|BOWL|35|60|SLA|R||
Vraj Patel|2003|BOWL|30|58|SLA|L||
Vishil Patel|2006|BOWL|25|54|LB|R||
Lucas Oluoch|1992|BOWL|25|58|LM|R||
Peter Langat|1995|BOWL|25|54|RM|R||
Francis Mutua|2003|BOWL|25|54|RM|R||
Tanzeel Sheikh|1997|BOWL|25|54|RM|R||
`};

N.TAN = {
  name: 'Tanzania', member: 'associate', asOf: '2025-10-01',
  note: 'Wikipedia squad list (Aug 2023) cross-checked with the 2025 Africa Qualifier squad.',
  sources: ['https://en.wikipedia.org/wiki/Tanzania_national_cricket_team', 'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out'],
  p: `
Kassim Nassoro|1988|AR|52|52|OB|R||
Ivan Selemani|2000|BAT|50|30|OB|R||
Omary Kitunda|1999|BAT|48|30|RM|R||
Abhik Patwa|1987|BAT|52|30|OB|R||
Jitin Singh|1984|BAT|48|30|RM|R||
Dhrumit Mehta|2003|BAT|48|30|OB|R||
Yunusu Issa|2001|AR|46|48|RM|R||
Shaik Basha|2006|AR|44|48|LWS|L||
Amal Rajeevan|1997|WK|50|0||R||
Yalinde Nkanya|2003|BOWL|25|52|SLA|R||
Sanjay Thakor|1990|BOWL|30|50|LB|R||
Akhil Anil|1998|BOWL|30|50|OB|L||
Ally Kimote|1992|BOWL|25|52|RM|R||
Salum Jumbe|1997|BOWL|25|52|RFM|L||
Johnson Nyambo|2005|BOWL|25|48|RFM|R||
Juma Kilimahewa|2002|WK|42|0||R|||G
`};

N.NGA = {
  name: 'Nigeria', member: 'associate', asOf: '2025-10-01',
  note: 'Wikipedia squad list (Oct 2023) cross-checked with the 2025 Africa Qualifier squad.',
  sources: ['https://en.wikipedia.org/wiki/Nigeria_national_cricket_team', 'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out'],
  p: `
Sylvester Okpe|2000|BOWL|40|54|OB|R||
Isaac Danladi|2002|BAT|48|35|LB|R||
Sesan Adedeji|1996|BAT|48|30|OB|R||
Akhere Isesele|2001|BAT|44|0||R||
Daniel Ajekun|1997|BAT|44|30|OB|R||
Selim Salau|2005|BAT|44|0||R||
Ali Rahmon|2008|AR|40|40|RM|R||
Sulaimon Runsewe|2001|BAT|46|30|OB|R||
Isaac Okpe|1995|WK|46|0||R||
Ridwan Abdulkareem|2005|BOWL|25|50|OB|R||
Joshua Asia|2006|BOWL|25|50|OB|R||
Peter Aho|2003|BOWL|25|54|RM|R||
Chiemelie Udekwe|2005|BOWL|25|48|RM|R||
Prosper Useni|2006|BOWL|25|50|LM|L||
Mohameed Taiwo|2002|BOWL|25|48|LM|L||
Obinna Lagosmere|2003|WK|40|0||R|||G
`};

N.BOT = {
  name: 'Botswana', member: 'associate', asOf: '2025-10-01',
  note: 'Wikipedia squad list (Jun 2023) cross-checked with the 2025 Africa Qualifier squad.',
  sources: ['https://en.wikipedia.org/wiki/Botswana_national_cricket_team', 'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out'],
  p: `
Karabo Motlhanka|1992|BAT|50|0||L||
Phemelo Silas|2001|BAT|44|35|LB|R||
Vinoo Balakrishnan|1989|BAT|48|35|OB|R||
Ameer Saiyed|1996|BAT|46|40|SLA|L||
Reginald Nehonde|1990|AR|46|48|OB|R||
Thatayaone Tshose|1996|AR|46|50|RF|R||
Valentine Mbazo|1999|WK|44|0||R||
Rod Mbaiwa|2003|WK|42|0||R||
Mmoloki Mooketsi|1997|BOWL|25|48|SLA|L||
Dhruv Maisuria|1998|BOWL|25|50|LB|R||
Katlo Piet|2003|BOWL|25|48|SLA|L||
Boemo Khumalo|2002|BOWL|25|50|RFM|R||
Boteng Maphosa|2002|BOWL|25|48|RFM|R||
Boemo Kgoseimang|1999|BOWL|25|46|RM|R||
Tumo Kalaharian|2004|BOWL|25|44|RM|R|||G
`};

N.VAN = {
  name: 'Vanuatu', member: 'associate', asOf: '2026-05-05',
  note: 'Wikipedia squad list (updated 5 May 2026).',
  sources: ['https://en.wikipedia.org/wiki/Vanuatu_national_cricket_team'],
  p: `
Joshua Rasu|1994|AR|48|52|RFM|R||
Junior Kaltapau|1999|BAT|46|30|OB|R||
Andrew Mansale|1988|BAT|46|30|OB|R||
Rodrick Lekai|2007|BAT|40|30|OB|R||
Womejo Wotu|2004|BAT|42|35|RFM|L||
Tim Cutler|1982|AR|42|46|SLA|R||
Patrick Matautaava|1991|AR|46|48|RM|R||
Nalin Nipiko|1995|AR|48|48|RM|R||
Jarryd Allan|1991|WK|42|0||R||
Clement Tommy|1997|WK|42|0||R||
Ala Viraliliu|2002|WK|38|0||R||
Williamsing Nalisa|2000|BOWL|25|50|LB|R||
Nicholas Venables|1983|BOWL|25|46|LFM|L||
Darren Wotu|1998|BOWL|25|48|RM|R||
Kalo Efatewind|2003|BOWL|25|42|RM|R|||G
Ioane Tannaroa|2004|BOWL|25|42|OB|R|||G
`};

N.SAM = {
  name: 'Samoa', member: 'associate', asOf: '2025-10-08',
  note: '15-man squad for the 2025 Asia/EAP T20 World Cup Qualifier in Oman, plus players listed on Samoa squad pages. Bowling types for several Samoan players are not published; those are the game\'s estimates.',
  sources: ['https://www.icc-cricket.com/news/you-do-it-mother-s-word-as-ross-taylor-answers-samoa-call', 'https://www.wisden.com/cricket-news/new-zealand-great-ross-taylor-reverses-retirement-to-represent-samoa-in-t20-world-cup-qualifier', 'https://possible11.com/team/samoa-4112/squad/', 'https://en.wikipedia.org/wiki/Samoa_national_cricket_team'],
  p: `
Caleb Jasmat|1998|AR|52|50|OB|R||
Ross Taylor|1984|BAT|72|20||R|0/0/0|
Sean Solia|1993|BAT|60|45|RM|R||
Darius Visser|1995|AR|56|48|RM|R||
Daniel Burgess|1999|AR|46|46|RM|R||
Douglas Finau|1998|BOWL|30|48|RM|R||
Sam French|1997|WK|44|0||R||
Maletino Maiava|2000|WK|40|0||R||
Kurtis Hynam-Nyberg|1999|BOWL|30|46|RM|R||
Ben Mailata|1996|BAT|46|0||R||
Noah Mead|2000|BOWL|25|48|RM|R||
Solomon Nash|1998|BOWL|25|50|RM|R||
Samson Sola|1995|BOWL|30|50|RM|R||
Fereti Sululoto|1997|BAT|46|0||R||
Saumani Tiai|1996|AR|46|46|RM|R||
Ili Tugaga|1998|BOWL|25|48|RM|R||
Sean Cotter|1997|BAT|44|0||R||
`};

const DESC = {
  AUS: 'Australia', NZ: 'New Zealand', SA: 'South Africa', ZIM: 'Zimbabwe', NAM: 'Namibia', PNG: 'Papua New Guinea', UGA: 'Uganda',
  KEN: 'Kenya', TAN: 'Tanzania', NGA: 'Nigeria', BOT: 'Botswana', VAN: 'Vanuatu', SAM: 'Samoa',
};
const seen = new Set();
for (const [code, n] of Object.entries(N)) {
  const full = n.member === 'full'; const lc = code.toLowerCase();
  const recs = n.p.trim().split('\n').map((line) => {
    const [name, born, role, bat, bowl, type, hand, fmS, dom, g] = line.split('|');
    const [t20, odi, fc] = fmS ? fmS.split('/').map(Number) : (full ? [0, 0, 0] : [1, 0, -3]);
    const fm = { t20, odi, fc }; if (g === 'G') fm.gen = 1;
    let id = `${lc}-${slug(name)}`; let k = 2; while (seen.has(id)) id = `${lc}-${slug(name)}-${k++}`; seen.add(id);
    const teams = [code]; if (dom) teams.push(`${code}-${dom}`);
    return [id, name, code, +born, role, +bat, +bowl, type, hand, fm, teams];
  });
  const rec = (r) => `    [${r.slice(0, 9).map((x) => typeof x === 'string' ? `'${x.replace(/'/g, "\\'")}'` : x).join(', ')}, { t20: ${r[9].t20}, odi: ${r[9].odi}, fc: ${r[9].fc}${r[9].gen ? ', gen: 1' : ''} }, [${r[10].map((t) => `'${t}'`).join(', ')}]],`;
  const teams = (n.teams || []).map(([s, nm, lv]) => `    { id: '${code}-${s}', name: '${nm}', short: '${s}', kind: 'domestic'${lv ? `, level: ${lv}` : ''} },`);
  const out = `// ${DESC[code]}: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: ${n.note}
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: '${code}', name: '${n.name}', member: '${n.member}', asOf: '${n.asOf}',
  sources: [
${n.sources.map((s) => `    '${s.replace(/'/g, "\\'")}',`).join('\n')}
  ],
  players: [
${recs.map(rec).join('\n')}
  ],
  teams: [${teams.length ? `\n${teams.join('\n')}\n  ` : ''}],
  comps: [],
};
`;
  writeFileSync(`${OUT}/${code}.js`, out);
  console.log(code, recs.length);
}
