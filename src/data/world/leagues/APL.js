// Afghanistan Premier League. Real franchises and the latest registered squads checked (asOf 2026-10-15); ratings are the game's estimates.
// Squad keys are database ids; players not already in a nation file are in `players`. Franchise players not listed here are
// filled in with generated players up to rules.min. Sources are in `sources`.
export default {
  code: 'APL', name: 'Afghanistan Premier League', kind: 'franchise', host: 'AFG', asOf: '2026-10-15',
  sources: ["Wikipedia, \"Afghanistan Premier League\"; ACB, \"APLT20 reaches major milestone with three franchises sold\" (Aug 2026)","CrickTracker, ACB confident of APL revival (Oct 2026)"],
  teams: [
    {"id":"APL-KAB","name":"Axcel United Kabul","short":"KAB","city":"Kabul"},
    {"id":"APL-BAL","name":"Balkh Zwanan","short":"BAL","city":"Mazar-i-Sharif"},
    {"id":"APL-KAN","name":"Kandahar Warriors","short":"KAN","city":"Kandahar"},
    {"id":"APL-PAK","name":"Paktia (franchise unsold)","short":"PAK","city":"Khost"},
    {"id":"APL-NAN","name":"Nangarhar (franchise unsold)","short":"NAN","city":"Jalalabad"},
  ],
  players: [

  ],
  squads: {

  },
  rules: {"min":18,"max":23,"overseas":{"max":8,"xi":4},"recruit":"draft","retain":0,"purse":null,"note":"Revived league, five teams, played in the UAE from 27 Dec 2026. Only three franchises (Axcel United Kabul, Balkh Zwanan, Kandahar Warriors) were sold by Oct 2026; the Paktia and Nangarhar teams are in-game placeholders. No squads, draft rules or overseas limits were found: everything here is an assumption."},
};
