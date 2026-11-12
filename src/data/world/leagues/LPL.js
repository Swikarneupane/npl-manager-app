// Lanka Premier League. Real franchises and the latest registered squads checked (asOf 2026-08-08); ratings are the game's estimates.
// Squad keys are database ids; players not already in a nation file are in `players`. Franchise players not listed here are
// filled in with generated players up to rules.min. Sources are in `sources`.
export default {
  code: 'LPL', name: 'Lanka Premier League', kind: 'franchise', host: 'SL', asOf: '2026-08-08',
  sources: ["Wikipedia, \"2026 Lanka Premier League\" (17 July to 8 August 2026, five teams, players draft)","CricTracker, \"LPL 2026: Final squads of all teams after Player Draft\""],
  teams: [
    {"id":"LPL-COL","name":"Colombo Kaps","short":"COL","city":"Colombo"},
    {"id":"LPL-DAM","name":"Dambulla Sixers","short":"DAM","city":"Dambulla"},
    {"id":"LPL-GAL","name":"Galle Gallants","short":"GAL","city":"Galle"},
    {"id":"LPL-JAF","name":"Jaffna Kings","short":"JAF","city":"Jaffna"},
    {"id":"LPL-KAN","name":"Kandy Royals","short":"KAN","city":"Kandy"},
  ],
  players: [
    ["sl-sadeera-samarawickrama","Sadeera Samarawickrama","SL",1995,"BAT",64,0,"","R",{},["SL"]],
    ["ind-vijay-shankar","Vijay Shankar","IND",1991,"AR",62,50,"RM","R",{},["IND"]],
    ["sl-akila-dananjaya","Akila Dananjaya","SL",1993,"BOWL",25,62,"OB","R",{},["SL"]],
  ],
  squads: {
    'LPL-JAF': ["ban-taskin-ahmed","sl-dunith-wellalage","ban-shakib-al-hasan","sl-bhanuka-rajapaksa","sl-avishka-fernando","nam-david-wiese","sl-dilshan-madushanka","afg-ibrahim-zadran","sl-chamindu-wickramasinghe","sl-nuwanidu-fernando","nep-sandeep-lamichhane","sa-lizaad-williams","nep-dipendra-singh-airee","sl-nishan-madushka"],
    'LPL-COL': ["aus-ben-mcdermott","sl-kamindu-mendis","nz-jimmy-neesham","sl-kusal-mendis","sl-binura-fernando","afg-mujeeb-ur-rahman","sl-sadeera-samarawickrama","sl-janith-liyanage","pak-shahnawaz-dahani","sl-jeffrey-vandersay","pak-mohammad-haris","ban-hasan-mahmud","nep-kushal-bhurtel"],
    'LPL-KAN': ["ind-vijay-shankar","sl-angelo-mathews","eng-moeen-ali","sl-wanindu-hasaranga","sl-nuwan-thushara","afg-rahmanullah-gurbaz","sl-kusal-perera","sl-asitha-fernando","aus-daniel-sams","sl-lahiru-udara","afg-zahir-khan","sco-brandon-mcmullen","sl-dushan-hemantha"],
    'LPL-GAL': ["ban-litton-das","sl-eshan-malinga","sa-rassie-van-der-dussen","sl-dasun-shanaka","sl-charith-asalanka","pak-mohammad-nawaz","sl-pramod-madushan","sl-vijayakanth-viyaskanth","pak-akif-javed","sl-sahan-arachchige","sl-chamika-karunaratne","sl-tharindu-rathnayake","aus-sam-harper","ban-mehidy-hasan-miraz","pak-haider-ali","sl-kasun-rajitha","sl-sachindu-colombage"],
    'LPL-DAM': ["sa-reeza-hendricks","sl-dinesh-chandimal","pak-sahibzada-farhan","sl-dushmantha-chameera","sl-maheesh-theekshana","afg-fazalhaq-farooqi","sl-niroshan-dickwella","sl-pavan-rathnayake","sl-akila-dananjaya","pak-mohammad-wasim","sl-dhananjaya-lakshan","sl-ramesh-mendis","afg-gulbadin-naib","sa-dian-forrester"],
  },
  rules: {"min":17,"max":20,"overseas":{"max":9,"xi":4},"recruit":"draft","retain":4,"purse":null,"categories":{"platinum":50000,"gold":30000,"classic":20000,"associate":15000,"under23":10000},"note":"2026 replaced the auction with a draft by category (Platinum $50k, Gold $30k, Classic $20k, Associate $15k, Emerging U23 $10k), four direct pre-signings per team; impact substitute and mandatory U23 rule were introduced. Overseas limits not found (in-game 9 in squad, 4 in XI)."},
};
