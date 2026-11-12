// Caribbean Premier League. Ratings are the game's estimates; real players carry name, nationality, birth year, role, hand, bowling type and registrations only.
// 2026 squads (Wikipedia, citing cplt20.com; the page lists up to 19 a team, above the 17 of the rules, so max is 19 here). Draft rules: 17 per squad (nine West Indians, five overseas, three breakout players), draft on 15 May 2026, four right-to-match options for existing teams, one breakout retention, up to five overseas signed directly and four in the XI (Gleaner, 1 May 2026). Ten players with no article could not be verified and are left out; rosters are topped up with generated players. Overseas = not West Indian by the nationality field.
export default {
  code: 'CPL', name: 'Caribbean Premier League', kind: 'franchise', host: 'WI', asOf: '2026-09-20',
  sources: ["https://en.wikipedia.org/wiki/2026_Caribbean_Premier_League", "https://jamaica-gleaner.com/article/sports/20260501/cpl-unveils-2026-draft-rules-new-era-begins-seventh-franchise"],
  teams: [
    { id: "CPL-ABF", name: "Antigua & Barbuda Falcons", short: "ABF", city: "St John's" },
    { id: "CPL-BT", name: "Barbados Tridents", short: "BT", city: "Bridgetown" },
    { id: "CPL-GAW", name: "Guyana Amazon Warriors", short: "GAW", city: "Providence" },
    { id: "CPL-JK", name: "Jamaica Kingsmen", short: "JK", city: "Kingston" },
    { id: "CPL-SKNP", name: "St Kitts & Nevis Patriots", short: "SKNP", city: "Basseterre" },
    { id: "CPL-SLK", name: "Saint Lucia Kings", short: "SLK", city: "Gros Islet" },
    { id: "CPL-TKR", name: "Trinbago Knight Riders", short: "TKR", city: "Port of Spain" },
  ],
  players: [
    ["pak-sufyan-moqim", "Sufyan Moqim", "PAK", 1999, "BOWL", 24, 71, "LB", "L", { t20: 1, odi: 0, fc: -1 }, ["PAK"]],
    ["sa-imran-tahir", "Imran Tahir", "SA", 1979, "BOWL", 20, 66, "LB", "R", { t20: 1, odi: 0, fc: -1 }, ["SA"]],
    ["sa-dwaine-pretorius", "Dwaine Pretorius", "SA", 1989, "AR", 59, 57, "RFM", "R", { t20: 1, odi: 0, fc: -1 }, ["SA"]],
    ["pak-hunain-shah", "Hunain Shah", "PAK", 2004, "BOWL", 26, 60, "RFM", "R", { t20: 1, odi: 0, fc: -1 }, ["PAK"]],
    ["pak-maaz-sadaqat", "Maaz Sadaqat", "PAK", 2005, "AR", 64, 62, "SLA", "L", { t20: 1, odi: 0, fc: -1 }, ["PAK"]],
    ["afg-waqar-salamkheil", "Waqar Salamkheil", "AFG", 2001, "BOWL", 22, 67, "SLA", "R", { t20: 1, odi: 0, fc: -1 }, ["AFG"]],
  ],
  squads: {
    'CPL-ABF': ["eng-moeen-ali", "wi-alzarri-joseph", "wi-amir-jangoo", "wi-anderson-phillip", "wi-evin-lewis", "wi-fabian-allen", "wi-jahmar-hamilton", "wi-jayden-seales", "wi-joshua-james", "wi-karima-gore", "sl-kusal-perera", "usa-milind-kumar", "wi-rahkeem-cornwall", "pak-shadab-khan", "wi-shamar-springer", "pak-sufyan-moqim", "ind-tajinder-singh", "nz-tim-robinson"],
    'CPL-BT': ["aus-chris-green", "wi-brandon-king", "aus-daniel-sams", "sa-george-linde", "wi-gudakesh-motie", "wi-johann-layne", "wi-kadeem-alleyne", "wi-kofi-james", "afg-mujeeb-ur-rahman", "sa-quinton-de-kock", "wi-ramon-simmonds", "wi-rivaldo-clarke", "wi-shadrack-descarte", "wi-sherfane-rutherford", "wi-zachary-carter", "wi-zishan-motara"],
    'CPL-GAW': ["sa-imran-tahir", "sa-dwaine-pretorius", "nz-glenn-phillips", "wi-isai-thorne", "wi-jonathan-van-lange", "wi-khary-pierre", "wi-matthew-nandu", "pak-mohammad-haris", "afg-mohammad-nabi", "wi-quentin-sampson", "afg-rahmanullah-gurbaz", "wi-romario-shepherd", "wi-ronaldo-alimohamed", "wi-shai-hope", "wi-shamar-joseph", "wi-shimron-hetmyer", "wi-veerasammy-permaul"],
    'CPL-JK': ["wi-rovman-powell", "wi-andre-russell", "ger-hassan-khan", "pak-hunain-shah", "wi-jeavor-royal", "wi-jediah-blades", "wi-keacy-carty", "wi-keemo-paul", "wi-kelvin-pitman", "wi-kirk-mckenzie", "pak-maaz-sadaqat", "wi-odean-smith", "wi-romaine-morris", "pak-saim-ayub", "wi-shaqkere-parris", "usa-shayan-jahangir", "pak-usman-khan", "wi-vitel-lawes"],
    'CPL-SKNP': ["wi-jason-holder", "wi-alick-athanaze", "wi-andre-fletcher", "wi-ashmead-nedd", "sl-dasun-shanaka", "aus-nikhil-chaudhary", "sl-wanindu-hasaranga", "pak-naseem-shah", "afg-waqar-salamkheil", "wi-jeremiah-louis", "wi-johnson-charles", "wi-kevin-wickham", "wi-kyle-mayers", "wi-mikyle-louis", "wi-navin-bidaisee", "wi-obed-mccoy"],
    'CPL-SLK': ["wi-roston-chase", "wi-ackeem-auguste", "wi-amari-goodridge", "sl-charith-asalanka", "wi-jewel-andrew", "wi-johann-jeremiah", "wi-joshua-bishop", "wi-kamil-pooran", "sl-maheesh-theekshana", "wi-matthew-forde", "wi-mckenny-clarke", "afg-noor-ahmad", "usa-shadley-van-schalkwyk", "nz-tim-seifert"],
    'CPL-TKR': ["wi-nicholas-pooran", "wi-akeal-hosein", "eng-alex-hales", "sl-amshi-de-silva", "nz-colin-munro", "sa-matthew-breetzke", "wi-dominic-drakes", "wi-joshua-da-silva", "wi-justin-greaves", "wi-jyd-goolie", "wi-kieron-pollard", "wi-nathan-edward", "wi-sunil-narine", "wi-terrance-hinds", "pak-usman-tariq"],
  },
  rules: { min: 17, max: 19, overseas: { max: 5, xi: 4, dataMax: 7, by: "nationality" }, recruit: "draft", retain: 1, rmo: 4, breakout: 3, xiBreakout: 1, wi: 9 },
};
