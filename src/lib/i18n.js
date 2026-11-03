// Bilingual labels. The language setting is 'en', 'np' or 'both'; screens pass both strings and
// get back the one to show. Numbers follow the Nepali-numerals setting through nn() in util.js.
export function T(G, en, np) {
  const L = G && G.s.lang;
  if (!np) return en;
  if (L === 'np') return np;
  if (L === 'both') return `${en} · ${np}`;
  return en;
}

// Section and screen names used by the new depth screens, shared so the nav, headers and More
// sheet say the same thing in Nepali.
export const NP = {
  Today: 'आज', Inbox: 'सन्देश', Club: 'क्लब', League: 'लिग', Table: 'अंकतालिका', Fixtures: 'तालिका', Playoffs: 'प्लेअफ', Caps: 'क्याप',
  Live: 'प्रत्यक्ष', Commentary: 'कमेन्ट्री', Card: 'स्कोरकार्ड', Tactics: 'रणनीति', XI: 'एकादश', Order: 'क्रम', Training: 'प्रशिक्षण',
  Lot: 'लट', 'Up next': 'अर्को', 'My squad': 'मेरो टोली', Rivals: 'प्रतिद्वन्द्वी', Sold: 'बिक्री',
  World: 'विश्व', Nepal: 'नेपाल', History: 'इतिहास', Settings: 'सेटिङ', More: 'थप', Home: 'गृह', Squad: 'टोली', Match: 'खेल', Auction: 'लिलामी',
  'Matchday': 'खेल दिन', 'Press conference': 'पत्रकार सम्मेलन', 'Round-up': 'सारांश', 'Final week': 'फाइनल हप्ता', 'Season review': 'सिजन समीक्षा',
  'Training week': 'प्रशिक्षण हप्ता', 'Dressing room': 'ड्रेसिङ रुम', 'Scouting': 'स्काउटिङ', 'Recruitment': 'भर्ती', 'Staff': 'कर्मचारी',
  'Board': 'बोर्ड', 'Sponsors and fans': 'प्रायोजक र समर्थक', 'League hub': 'लिग केन्द्र', 'Career': 'करियर', 'Stories': 'कथा',
  'International': 'अन्तर्राष्ट्रिय', 'World Cup': 'विश्वकप', 'Rankings': 'वरीयता', 'Champions': 'च्याम्पियन', 'Nepalis': 'नेपालीहरू', 'Coming up': 'आउँदै',
};
// A known label in the current language: tn(G, 'Today') -> 'Today' / 'आज' / 'Today · आज'.
export const tn = (G, en) => T(G, en, NP[en]);
// For tight spots (the phone bottom bar): Nepali in Nepali mode, English otherwise, never both.
export const tnShort = (G, en) => (G && G.s.lang === 'np' && NP[en] ? NP[en] : en);
