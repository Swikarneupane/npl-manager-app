// The Hundred. Ratings are the game's estimates; real players carry name, nationality, birth year, role, hand, bowling type and registrations only.
// Men's squads of the 2026 edition (Wikipedia, citing Sky Sports): signings and retentions, the auction and the Vitality Wildcard picks; in-season replacements are left out. Overseas = not English, so Scots, Irish and UK-qualified players count as overseas here (real squads can hold more than the limit by that count). Hundred overseas limits: 2026 squad of 16 to 18 with a maximum of 3 in the XI, from 2027 five in the squad and four in the XI, squads up to 19 (secondary sources; the ECB regulations were not read).
export default {
  code: 'HUN', name: 'The Hundred', kind: 'franchise', host: 'ENG', asOf: '2026-08-16',
  sources: ["https://en.wikipedia.org/wiki/2026_The_Hundred_season", "https://www.thehundred.com/info/how-player-selection-works", "https://www.wisden.com/cricket-news/the-hundred-2026-list-of-all-overseas-players-for-the-mens-and-womens-competitions"],
  teams: [
    { id: "HUN-BP", name: "Birmingham Phoenix", short: "BP", city: "Birmingham" },
    { id: "HUN-LS", name: "London Spirit", short: "LS", city: "London" },
    { id: "HUN-MSG", name: "Manchester Super Giants", short: "MSG", city: "Manchester" },
    { id: "HUN-MIL", name: "MI London", short: "MIL", city: "London" },
    { id: "HUN-SB", name: "Southern Brave", short: "SB", city: "Southampton" },
    { id: "HUN-SL", name: "Sunrisers Leeds", short: "SL", city: "Leeds" },
    { id: "HUN-TR", name: "Trent Rockets", short: "TR", city: "Nottingham" },
    { id: "HUN-WF", name: "Welsh Fire", short: "WF", city: "Cardiff" },
  ],
  players: [
    ["sa-sean-dickson", "Sean Dickson", "SA", 1991, "BAT", 65, 30, "RM", "R", { t20: 1, odi: 0, fc: -1 }, ["SA"]],
    ["sa-leus-du-plooy", "Leus du Plooy", "SA", 1995, "BAT", 65, 29, "SLA", "L", { t20: 1, odi: 0, fc: -1 }, ["SA"]],
    ["aus-nathan-sowter", "Nathan Sowter", "AUS", 1992, "BOWL", 21, 64, "LB", "R", { t20: 1, odi: 0, fc: -1 }, ["AUS"]],
    ["aus-nikhil-chaudhary", "Nikhil Chaudhary", "AUS", 1996, "AR", 66, 64, "OB", "R", { t20: 1, odi: 0, fc: -1 }, ["AUS"]],
    ["aus-daniel-worrall", "Daniel Worrall", "AUS", 1991, "BOWL", 19, 69, "RFM", "R", { t20: 1, odi: 0, fc: -1 }, ["AUS"]],
  ],
  squads: {
    'HUN-BP': ["eng-rehan-ahmed", "eng-jacob-bethell", "sa-donovan-ferreira", "aus-mitchell-owen", "eng-ethan-brookes", "eng-joe-clarke", "sco-scott-currie", "eng-laurie-evans", "eng-saqib-mahmood", "ban-mustafizur-rahman", "eng-will-smeed", "pak-usman-tariq", "eng-jordan-thompson", "eng-chris-wood", "sa-sean-dickson", "eng-tom-helm"],
    'HUN-LS': ["sa-dewald-brevis", "eng-liam-livingstone", "eng-jamie-overton", "aus-adam-zampa", "eng-jonny-bairstow", "eng-james-coles", "eng-mason-crane", "eng-matthew-fisher", "eng-adam-hose", "eng-tymal-mills", "nz-adam-milne", "sa-lhuan-dre-pretorius", "eng-james-rew", "eng-david-willey", "eng-kiran-carlson", "eng-henry-crocombe"],
    'HUN-MSG': ["afg-noor-ahmad", "eng-jos-buttler", "eng-liam-dawson", "sa-heinrich-klaasen", "eng-gus-atkinson", "eng-sonny-baker", "sa-leus-du-plooy", "eng-tom-hartley", "eng-max-holden", "sa-aiden-markram", "eng-tom-moores", "eng-tawanda-muyeye", "eng-george-scrimshaw", "nz-tim-seifert", "eng-josh-tongue", "eng-paul-walter", "eng-adam-finch", "eng-james-sales"],
    'HUN-MIL': ["eng-sam-curran", "eng-will-jacks", "afg-rashid-khan", "wi-nicholas-pooran", "nz-trent-boult", "eng-tom-curran", "eng-richard-gleeson", "eng-callum-parkinson", "eng-ollie-pope", "eng-jason-roy", "wi-sherfane-rutherford", "aus-nathan-sowter", "eng-olly-stone", "eng-ollie-sykes", "eng-james-vince", "eng-eddie-jack", "eng-sebastian-morgan"],
    'HUN-SB': ["eng-jofra-archer", "eng-jamie-smith", "aus-marcus-stoinis", "sa-tristan-stubbs", "eng-tom-abell", "aus-nikhil-chaudhary", "eng-caleb-falconer", "eng-chris-jordan", "eng-ben-mckinney", "sa-david-miller", "eng-michael-pepper", "eng-adil-rashid", "eng-thomas-rew", "eng-luke-wood", "aus-daniel-worrall", "eng-manny-lumsden", "eng-saif-zaib"],
    'HUN-SL': ["eng-harry-brook", "eng-brydon-carse", "aus-nathan-ellis", "aus-mitchell-marsh", "pak-abrar-ahmed", "eng-tom-alsop", "eng-ed-barnard", "eng-zak-crawley", "eng-benny-howell", "eng-tom-lawes", "eng-dan-lawrence", "eng-liam-patterson-white", "eng-matthew-potts", "sa-ryan-rickelton", "eng-reece-topley", "eng-charlie-allison", "eng-matt-revis"],
    'HUN-TR': ["eng-tom-banton", "aus-tim-david", "eng-ben-duckett", "nz-mitchell-santner", "nz-finn-allen", "eng-sam-billings", "eng-danny-briggs", "sco-brad-currie", "eng-aneurin-donald", "eng-lewis-gregory", "nz-matt-henry", "eng-louis-kimber", "eng-ben-mayes", "eng-dan-mousley", "eng-craig-overton", "eng-david-payne", "eng-ben-raine", "eng-ben-sanderson"],
    'HUN-WF': ["sa-marco-jansen", "nz-rachin-ravindra", "eng-phil-salt", "eng-chris-woakes", "eng-tom-aspinwall", "eng-jafer-chohan", "eng-sam-cook", "eng-jordan-cox", "nz-lockie-ferguson", "eng-ben-kellaway", "eng-tom-kohler-cadmore", "eng-joe-root", "aus-matthew-short", "jer-asa-tribe", "eng-jordan-clark", "eng-dillon-pennington"],
  },
  rules: { min: 16, max: 18, overseas: { max: 4, xi: 3, dataMax: 6, from2027: { max: 5, xi: 4 }, by: "nationality" }, recruit: "auction", retain: 4, purse: 2050000, currency: "GBP", wildcard: true, format: "H100", balls: 100 },
};
