// Bangladesh Premier League. Real franchises and the latest registered squads checked (asOf 2026-01-23); ratings are the game's estimates.
// Squad keys are database ids; players not already in a nation file are in `players`. Franchise players not listed here are
// filled in with generated players up to rules.min. Sources are in `sources`.
export default {
  code: 'BPL', name: 'Bangladesh Premier League', kind: 'franchise', host: 'BAN', asOf: '2026-01-23',
  sources: ["Wikipedia, \"2025-26 Bangladesh Premier League\" (26 Dec 2025 to 23 Jan 2026, six teams)","Wikipedia, \"2026 Bangladesh Premier League player auction\" (auction 30 Nov 2025)"],
  teams: [
    {"id":"BPL-CHR","name":"Chattogram Royals","short":"CHR","city":"Chattogram"},
    {"id":"BPL-DHC","name":"Dhaka Capitals","short":"DHC","city":"Dhaka"},
    {"id":"BPL-NOX","name":"Noakhali Express","short":"NOX","city":"Noakhali"},
    {"id":"BPL-RAJ","name":"Rajshahi Warriors","short":"RAJ","city":"Rajshahi"},
    {"id":"BPL-RAN","name":"Rangpur Riders","short":"RAN","city":"Rangpur"},
    {"id":"BPL-SYL","name":"Sylhet Titans","short":"SYL","city":"Sylhet"},
  ],
  players: [
    ["ban-mohammad-mithun","Mohammad Mithun","BAN",1990,"WK",60,0,"","R",{},["BAN"]],
    ["ban-sabbir-rahman","Sabbir Rahman","BAN",1991,"BAT",62,0,"","R",{},["BAN"]],
    ["ban-nasir-hossain","Nasir Hossain","BAN",1991,"AR",58,52,"OB","R",{},["BAN"]],
    ["ban-yasir-ali","Yasir Ali","BAN",1999,"BAT",60,0,"","R",{},["BAN"]],
    ["ban-nurul-hasan-sohan","Nurul Hasan Sohan","BAN",1993,"WK",60,0,"","R",{},["BAN"]],
    ["ban-mahmudullah","Mahmudullah","BAN",1986,"AR",66,45,"OB","R",{},["BAN"]],
    ["ban-tawhid-hridoy","Tawhid Hridoy","BAN",2000,"BAT",64,0,"","R",{},["BAN"]],
  ],
  squads: {
    'BPL-CHR': ["ban-mohammad-naim","ban-shoriful-islam","ban-mahmudul-hasan-joy","ban-mahedi-hasan","ban-tanvir-islam","sl-niroshan-dickwella"],
    'BPL-DHC': ["ban-taskin-ahmed","ban-saif-hassan","ban-shamim-hossain","ban-mohammad-saifuddin","ban-mohammad-mithun","ban-taijul-islam","ban-sabbir-rahman","ban-nasir-hossain","sl-dasun-shanaka"],
    'BPL-NOX': ["ban-hasan-mahmud","ban-soumya-sarkar","ban-mahidul-islam-ankon","ban-jaker-ali","ban-rejaur-rahman-raja","ban-shahadat-hossain-dipu","pak-haider-ali","pak-ihsanullah"],
    'BPL-RAJ': ["ban-tanzid-hasan","ban-najmul-hossain-shanto","ban-mushfiqur-rahim","ban-tanzim-hasan-sakib","ban-yasir-ali","ban-akbar-ali","ban-hasan-murad","sl-dushan-hemantha","pak-jahandad-khan"],
    'BPL-RAN': ["ban-mustafizur-rahman","ban-nurul-hasan-sohan","ban-litton-das","ban-mahmudullah","ban-tawhid-hridoy","ban-nahid-rana","ban-mrittunjoy-chowdhury","ban-nayeem-hasan"],
    'BPL-SYL': ["ban-mehidy-hasan-miraz","ban-nasum-ahmed","ban-parvez-hossain-emon","ban-khaled-ahmed","ban-afif-hossain","ban-ebadot-hossain","ban-zakir-hasan","ban-ariful-islam","ban-mominul-haque","sl-angelo-mathews","usa-aaron-jones"],
  },
  rules: {"min":18,"max":20,"overseas":{"max":6,"xi":4},"recruit":"auction","retain":2,"directLocal":2,"directOverseas":2,"purse":null,"note":"2025-26 edition: auction on 30 November 2025 with up to two local and two overseas direct signings per franchise. Overseas squad and XI limits are not in the sources checked (in-game 6 and 4). Squads here omit the unresolved local players."},
};
