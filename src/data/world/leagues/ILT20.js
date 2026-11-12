// International League T20. Real franchises and the latest registered squads checked (asOf 2026-10-01); ratings are the game's estimates.
// Squad keys are database ids; players not already in a nation file are in `players`. Franchise players not listed here are
// filled in with generated players up to rules.min. Sources are in `sources`.
export default {
  code: 'ILT20', name: 'International League T20', kind: 'franchise', host: 'UAE', asOf: '2026-10-01',
  sources: ["Wisden, \"ILT20 2026-27 auction: live updated squads\" (auction 1 Oct 2026)","Wisden, \"ILT20 2026-27 auction rules, purses and all you need to know\"","Arab News / The News, season 5 dates 22 Nov to 20 Dec 2026"],
  teams: [
    {"id":"ILT20-ADK","name":"Abu Dhabi Knight Riders","short":"ADK","city":"Abu Dhabi"},
    {"id":"ILT20-DV","name":"Desert Vipers","short":"DV","city":"Dubai"},
    {"id":"ILT20-DC","name":"Dubai Capitals","short":"DC","city":"Dubai"},
    {"id":"ILT20-GG","name":"Gulf Giants","short":"GG","city":"Dubai"},
    {"id":"ILT20-MIE","name":"MI Emirates","short":"MIE","city":"Dubai"},
    {"id":"ILT20-SHW","name":"Sharjah Warriorz","short":"SHW","city":"Sharjah"},
  ],
  players: [

  ],
  squads: {
    'ILT20-ADK': ["nz-finn-allen","wi-jason-holder","wi-sunil-narine","uae-muhammad-rohid","uae-alishan-sharafu","eng-moeen-ali","wi-andre-fletcher","afg-gulbadin-naib","nz-colin-munro","eng-michael-pepper","ire-lorcan-tucker","pak-usman-tariq","afg-qais-ahmad"],
    'ILT20-DV': ["usa-andries-gous","eng-dan-lawrence","afg-mujeeb-ur-rahman","wi-shimron-hetmyer","uae-vriitya-aravind","pak-babar-azam","pak-naseem-shah","pak-fakhar-zaman","eng-aneurin-donald","eng-david-payne","ire-harry-tector","eng-joe-clarke","afg-abdullah-ahmadzai","pak-shadab-khan"],
    'ILT20-DC': ["aus-marcus-stoinis","ban-mustafizur-rahman","afg-noor-ahmad","wi-rovman-powell","uae-zuhaib-zubair","pak-haider-ali","sa-faf-du-plessis","sl-dasun-shanaka","eng-phil-salt","eng-max-holden","afg-darwish-rasooli","afg-sediqullah-atal","afg-karim-janat","ire-mark-adair","eng-matthew-potts","pak-hassan-khan","eng-tom-moores","eng-luke-wood"],
    'ILT20-GG': ["afg-azmatullah-omarzai","zim-blessing-muzarabani","sa-david-miller","sa-heinrich-klaasen","uae-matiullah-khan","uae-dhruv-parashar","afg-ibrahim-zadran","afg-rahmanullah-gurbaz","eng-liam-livingstone","ire-curtis-campher","wi-shamar-joseph","wi-alzarri-joseph","nam-david-wiese","wi-alick-athanaze","sa-tabraiz-shamsi","uae-sagar-kalyan"],
    'ILT20-MIE': ["wi-nicholas-pooran","afg-rashid-khan","wi-romario-shepherd","wi-sherfane-rutherford","uae-muhammad-waseem","afg-fazalhaq-farooqi","afg-allah-ghazanfar","eng-chris-jordan","eng-james-coles","sa-lizaad-williams","ire-ross-adair","eng-jonny-bairstow"],
    'ILT20-SHW': ["nz-adam-milne","eng-james-vince","zim-sikandar-raza","uae-tanish-suri","uae-junaid-siddique","eng-adil-rashid","afg-mohammad-nabi","eng-richard-gleeson","sa-george-linde","ire-george-dockrell","sco-brandon-mcmullen","eng-craig-overton","eng-james-rew","eng-tom-banton","ned-logan-van-beek"],
  },
  rules: {"min":18,"max":23,"overseas":{"max":null,"xi":null},"recruit":"auction","retain":4,"purse":1300000,"currency":"USD","directBudget":700000,"quota":{"fullMember":11,"afg":4,"ire":1,"uae":4,"kuwait":1,"saudi":1,"otherAssociate":1},"rtm":4,"note":"Purse $1.3m, squads 18-23, direct signings and retentions allocation $700k, four pre-auction overseas signings, four RTM cards, minimum 11 Full Member players. No overseas limit applies; the XI limit was not found."},
};
