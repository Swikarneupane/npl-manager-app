// USA: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current roster" (players for USA in the last 24 months; updated 13 Oct 2026) and the 2026 T20 World Cup squad. Aaron Jones and Unmukt Chand are US-based players already in the NPL data. MLC franchises are not listed here: no shared franchise ids exist yet.
export default {
  code: 'USA', name: 'USA', member: 'associate', asOf: '2026-10-13',
  sources: ['https://en.wikipedia.org/wiki/United_States_national_cricket_team#Current_roster', 'https://en.wikipedia.org/wiki/2026_Men%27s_T20_World_Cup_squads'],
  players: [
    ['usa-shayan-jahangir', 'Shayan Jahangir', 'USA', 1994, 'BAT', 64, 0, '', 'R', { t20: 1, odi: 0, fc: -1 }, ['USA']],
    ['usa-sanjay-krishnamurthi', 'Sanjay Krishnamurthi', 'USA', 2003, 'BAT', 62, 25, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-saiteja-mukkamalla', 'Saiteja Mukkamalla', 'USA', 2004, 'BAT', 64, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-utkarsh-srivastava', 'Utkarsh Srivastava', 'USA', 2007, 'BAT', 54, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-steven-taylor', 'Steven Taylor', 'USA', 1993, 'AR', 64, 50, 'OB', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-milind-kumar', 'Milind Kumar', 'USA', 1991, 'AR', 64, 50, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-shubham-ranjane', 'Shubham Ranjane', 'USA', 1994, 'AR', 60, 54, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-shehan-jayasuriya', 'Shehan Jayasuriya', 'USA', 1991, 'AR', 62, 52, 'OB', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-harmeet-singh', 'Harmeet Singh', 'USA', 1992, 'BOWL', 45, 72, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-monank-patel', 'Monank Patel', 'USA', 1993, 'WK', 64, 0, '', 'R', { t20: 0, odi: 1, fc: 0 }, ['USA']],
    ['usa-andries-gous', 'Andries Gous', 'USA', 1993, 'WK', 70, 0, '', 'R', { t20: 1, odi: 0, fc: -1 }, ['USA']],
    ['usa-nosthush-kenjige', 'Nosthush Kenjige', 'USA', 1991, 'AR', 58, 58, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-yasir-mohammad', 'Yasir Mohammad', 'USA', 2002, 'BOWL', 25, 56, 'LB', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-mohammad-mohsin', 'Mohammad Mohsin', 'USA', 1996, 'BOWL', 25, 58, 'LB', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-jessy-singh', 'Jessy Singh', 'USA', 1993, 'AR', 50, 58, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-ali-khan', 'Ali Khan', 'USA', 1990, 'BOWL', 30, 70, 'RFM', 'R', { t20: 1, odi: 0, fc: -1 }, ['USA']],
    ['usa-shadley-van-schalkwyk', 'Shadley van Schalkwyk', 'USA', 1988, 'BOWL', 30, 62, 'RM', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-saurabh-netravalkar', 'Saurabh Netravalkar', 'USA', 1991, 'BOWL', 30, 70, 'LFM', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-stephen-wiig', 'Stephen Wiig', 'USA', 1993, 'BOWL', 25, 56, 'LM', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-ali-sheikh', 'Ali Sheikh', 'USA', 2002, 'BOWL', 20, 56, 'RFM', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-rushil-ugarkar', 'Rushil Ugarkar', 'USA', 2003, 'BOWL', 20, 56, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-juanoy-drysdale', 'Juanoy Drysdale', 'USA', 1992, 'BOWL', 25, 60, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-abhishek-paradkar', 'Abhishek Paradkar', 'USA', 2000, 'BOWL', 25, 54, 'LM', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-ayan-desai', 'Ayan Desai', 'USA', 2003, 'BOWL', 25, 54, 'LM', 'L', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-ehsan-adil', 'Ehsan Adil', 'USA', 1993, 'BOWL', 25, 62, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['USA']],
    ['usa-aaron-jones', 'Aaron Jones', 'USA', 1994, 'BAT', 70, 0, '', 'R', { t20: 1, odi: 0, fc: -1 }, ['USA']],
    ['usa-unmukt-chand', 'Unmukt Chand', 'USA', 1993, 'BAT', 64, 0, '', 'R', { t20: 1, odi: 0, fc: -1 }, ['USA']],
  ],
  teams: [],
  comps: [],
};
