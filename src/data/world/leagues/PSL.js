// Pakistan Super League. Real franchises and the latest registered squads checked (asOf 2026-11-01); ratings are the game's estimates.
// Squad keys are database ids; players not already in a nation file are in `players`. Franchise players not listed here are
// filled in with generated players up to rules.min. Sources are in `sources`.
export default {
  code: 'PSL', name: 'Pakistan Super League', kind: 'franchise', host: 'PAK', asOf: '2026-11-01',
  sources: ["Wikipedia, \"2026 Pakistan Super League\" (teams, squads, auction; 26 March to 3 May 2026; PSL 11)"],
  teams: [
    {"id":"PSL-HYD","name":"Hyderabad Kingsmen","short":"HYD","city":"Hyderabad"},
    {"id":"PSL-ISL","name":"Islamabad United","short":"ISL","city":"Islamabad"},
    {"id":"PSL-KAR","name":"Karachi Kings","short":"KAR","city":"Karachi"},
    {"id":"PSL-LHQ","name":"Lahore Qalandars","short":"LHQ","city":"Lahore"},
    {"id":"PSL-MUL","name":"Multan Sultans","short":"MUL","city":"Multan"},
    {"id":"PSL-PES","name":"Peshawar Zalmi","short":"PES","city":"Peshawar"},
    {"id":"PSL-QUE","name":"Quetta Gladiators","short":"QUE","city":"Quetta"},
    {"id":"PSL-RWP","name":"Rawalpindiz","short":"RWP","city":"Rawalpindi"},
  ],
  players: [
    ["pak-sharjeel-khan","Sharjeel Khan","PAK",1989,"BAT",68,0,"","L",{},["PAK"]],
    ["pak-imad-wasim","Imad Wasim","PAK",1988,"AR",66,62,"SLA","L",{},["PAK"]],
    ["pak-haider-ali","Haider Ali","PAK",2000,"BAT",62,0,"","R",{},["PAK"]],
    ["pak-azam-khan","Azam Khan","PAK",1998,"WK",64,0,"","R",{},["PAK"]],
    ["pak-ihsanullah","Ihsanullah","PAK",2002,"BOWL",20,68,"RF","R",{},["PAK"]],
    ["pak-asif-ali","Asif Ali","PAK",1991,"BAT",62,0,"","R",{},["PAK"]],
    ["pak-mohammad-wasim-jr","Mohammad Wasim Jr.","PAK",2001,"BOWL",30,72,"RF","R",{},["PAK"]],
    ["pak-hassan-nawaz","Hassan Nawaz","PAK",2002,"BAT",62,0,"","R",{},["PAK"]],
    ["nz-cole-mcconchie","Cole McConchie","NZ",1991,"AR",58,56,"OB","R",{},["NZ"]],
  ],
  squads: {
    'PSL-HYD': ["aus-marnus-labuschagne","pak-saim-ayub","pak-hassan-khan","pak-usman-khan","aus-glenn-maxwell","pak-akif-javed","pak-mohammad-ali","sl-kusal-perera","aus-riley-meredith","pak-sharjeel-khan","sl-maheesh-theekshana"],
    'PSL-ISL': ["pak-shadab-khan","usa-andries-gous","aus-chris-green","nz-devon-conway","pak-faheem-ashraf","nz-mark-chapman","pak-imad-wasim","pak-sameer-minhas","pak-haider-ali","eng-richard-gleeson","pak-mohammad-hasnain","nep-dipendra-singh-airee","pak-salman-mirza","uae-muhammad-jawadullah"],
    'PSL-KAR': ["aus-david-warner","pak-hassan-ali","pak-abbas-afridi","pak-khushdil-shah","pak-saad-baig","eng-moeen-ali","pak-azam-khan","pak-salman-ali-agha","pak-mir-hamza","aus-adam-zampa","oma-aqib-ilyas","uae-muhammad-waseem","pak-ihsanullah","sa-reeza-hendricks","eng-jason-roy"],
    'PSL-LHQ': ["pak-shaheen-shah-afridi","pak-abdullah-shafique","zim-sikandar-raza","ban-mustafizur-rahman","pak-haris-rauf","pak-usama-mir","pak-fakhar-zaman","pak-haseebullah-khan","ban-parvez-hossain-emon","pak-asif-ali","pak-tayyab-tahir","sa-rubin-hermann","sl-dunith-wellalage","aus-daniel-sams","zim-ryan-burl","pak-hussain-talat","sl-charith-asalanka"],
    'PSL-MUL': ["aus-ashton-turner","pak-shan-masood","aus-steve-smith","pak-mohammad-nawaz","pak-sahibzada-farhan","pak-mohammad-wasim-jr","aus-peter-siddle","sa-tabraiz-shamsi","aus-lachlan-shaw","sa-delano-potgieter","aus-josh-philippe","pak-faisal-akram","pak-arafat-minhas","pak-mohammad-huraira"],
    'PSL-PES': ["pak-babar-azam","pak-sufiyan-muqeem","pak-abdul-samad","aus-aaron-hardie","pak-aamir-jamal","pak-khurram-shahzad","pak-mohammad-haris","eng-james-vince","nz-michael-bracewell","sl-kusal-mendis","pak-iftikhar-ahmed","ban-nahid-rana","pak-shahnawaz-dahani","ban-shoriful-islam","ban-tanzid-hasan"],
    'PSL-QUE': ["pak-saud-shakeel","pak-abrar-ahmed","pak-hassan-nawaz","pak-usman-tariq","pak-shamyl-hussain","sa-rilee-rossouw","pak-jahandad-khan","pak-khawaja-nafay","aus-sam-harper","nz-bevon-jacobs","aus-ben-mcdermott","eng-tom-curran","pak-ahmed-daniyal","wi-alzarri-joseph","usa-ali-khan"],
    'PSL-RWP': ["pak-mohammad-rizwan","eng-sam-billings","pak-naseem-shah","ban-rishad-hossain","nz-daryl-mitchell","pak-abdullah-fazal","sa-dian-forrester","pak-kamran-ghulam","pak-asif-afridi","nz-cole-mcconchie","aus-usman-khawaja","pak-imam-ul-haq","pak-sajid-khan","nz-ben-sears"],
  },
  rules: {"min":18,"max":23,"overseas":{"max":9,"xi":4},"recruit":"auction","retain":4,"purse":450000000,"currency":"PKR","note":"PSL 11 was the first by auction (draft since 2016): purse Rs 45 crore, up to 4 retentions one per category; 888 registered across four base prices. Squad overseas cap of 9 is an in-game assumption; the 4-overseas XI is the long-standing PSL rule (not re-verified)."},
};
