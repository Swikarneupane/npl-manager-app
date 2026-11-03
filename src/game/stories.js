// ===== Story chains, as plain data =====
// living.js runs these. Each chain: when it may start (hook names), a start chance weight, start
// conditions, a target (who it is about) and steps. Each step is one inbox decision with 3-4 choices.
//
// Conditions are arrays: ['phase', 'league'], ['played', 3] (user matches this season), ['month', 'Oct',
// 'Nov'], ['lost', 3] (losing streak), ['lastLost'], ['heat', 40] (with the story's club), ['stage', 'L'].
// Text tokens: {p} {ps} (first player, full name and surname), {p2} {p2s}, {names}, {s1} ('s' when one
// player, for verbs), {age}, {prov}, {home}, {club}, {city}, {opp} {oppShort} (the story's club), {mgr}
// (its manager), {npc} (a generated person), {post}, {sp} {sp2} (generated sponsors), {fest}, {stage},
// {inj}, {lostN}, {result}.
// Choice fields: l (label), fx (core effects, applied by G.applyEvent; '$p' is the first player), x
// (extra effects, applied by living.js: happy, happyAll, trust, pillars, heat, respect, rep, fitAll,
// formAll, injFix, reinj, trait, scout, release, staffLeave, why), out (what happens), later (a hint),
// next ({to, after: {matches} | {seasons} | {meet: true}}), alt ({p, ...overrides}: a chance outcome).
//
// Honesty: a chain with personal: true is about someone's private life or temperament. It may only
// target fictional players (p.real === false) through the FICTIONAL targets below, and only those
// steps may carry a quote from a player. National call-ups and injuries may involve real players,
// with no quotes and no personal details. Generated managers, staff, agents, pundits and sponsors may
// be quoted (quoteBy: 'npc').
export const FICTIONAL_TARGETS = ['fictionalNepali', 'fictionalOverseas', 'youngFictional', 'droppedVeteran', 'sponsorFace', 'fictionalPair', 'prospect'];

export const SPONSORS = ['Gurans Cola', 'Trishuli Noodles', 'Phewa Mobile', 'Rara Energy', 'Himali Paints', 'Koshi Cement', 'Mustang Apparel', 'Bagmati Bank'];

export const CHAINS = [
  {
    id: 'festival', title: 'Festival leave', personal: true, target: 'fictionalNepali', count: [1, 3], when: ['afterMatch'], weight: 3,
    cond: [['phase', 'league'], ['month', 'Oct', 'Nov'], ['played', 1]],
    steps: {
      s1: {
        title: '{names} want{s1} to go home for {fest}', ne: '{festNe}का लागि घर जान बिदा माग', cat: 'Squad', sum: 'Happiness or a fresh matchday',
        text: '{names} {has} asked for two days at home for {fest}. Family is in {prov}, and the bus alone is a day each way. You play again in three days.',
        quote: 'It is the one time of the year the whole family is together.',
        choices: [
          { l: 'Let them go', fx: { pid: '$p', fit: -4 }, x: { happyAll: 8, pillars: { fans: 1 } }, out: 'They come back with tika on their foreheads and sweets for everyone. Legs look heavy at the next session.' },
          { l: 'Bring {fest} to the camp', fx: { balance: -1.5 }, x: { happyAll: 6, trust: 2, pillars: { fans: 2, conduct: 1 } }, out: 'Families come to Kirtipur and the team hotel hosts the tika. The overseas players get tika too. The best week of the season.' },
          { l: 'Refuse: the match comes first', fx: { fans: -1 }, x: { happyAll: -8, pillars: { fans: -1 } }, out: 'They stay and train. Nobody argues, but the dressing room is quiet.', later: 'This may not be the end of it.', next: { to: 's2', after: { matches: 2 } } },
        ], safe: 0,
      },
      s2: {
        title: '{ps} is still sore about {fest}', cat: 'Squad', sum: 'Happiness and the captain',
        text: 'Part 2. Since you turned down the leave, {ps} has gone quiet at training and skipped the team dinner. The senior players have noticed.',
        quote: 'I did everything the club asked. I missed my mother\'s tika for a training session.',
        choices: [
          { l: 'Clear the air one to one', x: { happy: 6, trust: 1 }, out: 'A long walk around the ground. He says his piece; you say yours. It helps.' },
          { l: 'Promise him the next match', fx: { pid: '$p', morale: 6, promise: 'start' }, x: { happy: 4 }, out: 'He nods. Now he has to deliver, and so do you.' },
          { l: 'Leave it: he will get over it', x: { happy: -5, trust: -2 }, out: 'He gets over it, slowly. The captain thinks you could have handled it better.' },
        ], safe: 0,
      },
    },
  },
  {
    id: 'homesick', title: 'A long way from home', personal: true, target: 'fictionalOverseas', when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league'], ['played', 2]],
    steps: {
      s1: {
        title: '{p} has gone quiet', cat: 'Squad', sum: 'An overseas player settling in',
        text: '{ps} has barely spoken at training. The physio says he is sleeping badly, and his pace is down a few kph.',
        choices: [
          { l: 'Ask the senior pros to look after him', x: { happy: 4 }, out: 'They take him out for dal bhat after training. He laughs for the first time in a week.', next: { to: 's2', after: { matches: 2 } }, alt: { p: 0.5, out: 'They take him out for dal bhat. He seems better, for now.', next: null } },
          { l: 'Give him a day off', fx: { pid: '$p', rest: true }, x: { happy: 3 }, out: 'He spends the day on a video call home. He misses the next match.', next: { to: 's2', after: { matches: 2 } } },
          { l: 'He is a professional: leave it', x: { happy: -4 }, out: 'Nothing changes. He trains, then goes straight to his room.', next: { to: 's2', after: { matches: 1 } } },
        ], safe: 0,
      },
      s2: {
        title: '{p} wants to go home', cat: 'Squad', sum: 'Rs 2 L, a week off, or a stand-off',
        text: 'Part 2. His agent called tonight: {ps} misses his family, the food, the cold. He wants a week in {home}, in the middle of the run-in.',
        quote: 'I want to play for this club. I just need to see my family.',
        choices: [
          { l: 'Fly his family out to Nepal', fx: { balance: -2 }, x: { happy: 14, pillars: { finances: -1 } }, out: 'His family land in Kathmandu on Thursday. He bowls his fastest spell of the season at the weekend.', later: 'His family may want to stay for the playoffs.' },
          { l: 'Give him the week off', fx: { pid: '$p', rest: true }, x: { happy: 8 }, out: 'He flies out on Tuesday. You need a fourth overseas player for a game.', alt: { p: 0.33, out: 'He flies out on Tuesday. When he comes back, his agent has questions about his contract.', next: { to: 's3', after: { matches: 3 } } } },
          { l: 'Ask the overseas group to rally round', x: { happy: 5, trust: 1 }, out: 'The other overseas players take him under their wing. He is quieter, but he stays.' },
          { l: 'Refuse: he signed a contract', x: { happy: -12 }, out: 'The agent hangs up. He trains, but alone, earbuds in.', later: 'His form may suffer.', next: { to: 's3', after: { matches: 3 } } },
        ], safe: 2,
      },
      s3: {
        title: '{p}\'s agent asks about his future', cat: 'Contract', sum: 'Keep him, let him go, or pay',
        text: 'Part 3. {ps}\'s agent asks whether the club would release him from his contract at the end of the season.',
        choices: [
          { l: 'He stays: he is under contract', x: { happy: -6 }, out: 'He stays. The agent says he will ask again.' },
          { l: 'Agree to part at the season\'s end', x: { happy: 6, release: true }, out: 'He thanks you, and plays the rest of the season with nothing to lose. He leaves in the off-season.' },
          { l: 'Offer him a better deal', fx: { balance: -2 }, x: { happy: 10, trait: { k: 'loyal', d: 8 } }, out: 'Rs 2 L more a season. His agent calls it a fair offer.' },
        ], safe: 0,
      },
    },
  },
  {
    id: 'exams', title: 'Exams', personal: true, target: 'youngFictional', when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league'], ['played', 2]],
    steps: {
      s1: {
        title: '{p}\'s university exams clash with the next match', ne: 'परीक्षा र खेल एकै दिन', cat: 'Youth', sum: 'His studies or his cricket',
        text: '{ps} is {age} and in his second year of a commerce degree. His semester exam falls on the day of your next match.',
        quote: 'My father says the degree comes first. I want both.',
        choices: [
          { l: 'Let him sit the exam', fx: { pid: '$p', rest: true }, x: { happy: 8, pillars: { youth: 2 } }, out: 'He misses the match and sits the paper. He is back at nets the next morning.', next: { to: 's2', after: { seasons: 1 } } },
          { l: 'Ask the campus to move the exam', x: { happy: 3, pillars: { conduct: 1 } }, out: 'The campus agrees to a later sitting. He plays, and sits the paper next week.', next: { to: 's2', after: { seasons: 1 } }, alt: { p: 0.5, out: 'The campus says no. He plays, but his mind is elsewhere.', x: { happy: -4 }, next: null } },
          { l: 'Cricket first: he plays', x: { happy: -8, pillars: { youth: -1 } }, out: 'He plays. He fails the paper and has to resit it in the spring.' },
        ], safe: 0,
      },
      s2: {
        title: '{p} passes his exams', cat: 'Youth', sum: 'A small moment, a loyal player',
        text: 'Part 2, a season on. {ps} has his results: he passed. He wants to thank the club in front of the squad.',
        quote: 'You let me finish what I started. I won\'t forget it.',
        choices: [
          { l: 'Let him say it at the team meeting', x: { happy: 4, trust: 1, trait: { k: 'loyal', d: 6 } }, out: 'A round of applause. Even the overseas players join in.' },
          { l: 'Give him more responsibility', x: { happy: 5, trait: { k: 'lead', d: 6 } }, out: 'He runs the youth group\'s fielding drills from now on.' },
          { l: 'Keep it low-key', x: { happy: 1 }, out: 'A quiet word and a handshake. That is enough for him.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'callup', title: 'National call-up', personal: false, target: 'callup', count: [1, 2], when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league'], ['played', 4]],
    steps: {
      s1: {
        title: 'Nepal want {names} at a national camp', ne: 'राष्ट्रिय शिविरमा बोलावट', cat: 'International', sum: 'The national team or your next match',
        text: 'CAN has called {names} to a three-day skills camp at Mulpani. The camp clashes with your next match. This is in your game, not a real CAN camp.',
        choices: [
          { l: 'Release them for the camp', fx: { pid: '$p', rest: true }, x: { pillars: { conduct: 2 }, rep: 1, happyAll: 4, formAll: 0.5 }, out: 'They miss the next match and come back with fresh work from the national coaches.' },
          { l: 'Agree to one day only', x: { happyAll: 1 }, out: 'CAN accepts a shorter stay. Everyone is a little unhappy, and nobody is very unhappy.' },
          { l: 'Refuse: the NPL comes first', x: { pillars: { conduct: -3 }, rep: -1, happyAll: -4 }, out: 'CAN complains to the league in writing.', next: { to: 's2', after: { matches: 2 } } },
        ], safe: 0,
      },
      s2: {
        title: 'CAN writes to the league about you', cat: 'International', sum: 'Conduct and reputation',
        text: 'Part 2. A CAN official, a generated character, says in a letter that your club "does not respect the national team". The papers have it.',
        quote: 'Clubs exist because the national team gives cricket in Nepal its audience.', quoteBy: 'npc',
        choices: [
          { l: 'Apologise and offer a future camp', x: { rep: 1, pillars: { conduct: 2 } }, out: 'The row cools. CAN thanks the club in a short statement.' },
          { l: 'Stand firm: we pay their wages', fx: { board: -2 }, x: { pillars: { conduct: -2 }, rep: -1 }, out: 'Your owner backs you in private and asks you to stop talking in public.' },
          { l: 'Say nothing', x: { pillars: { conduct: -1 } }, out: 'The story runs for two days and dies.' },
        ], safe: 0,
      },
    },
  },
  {
    id: 'veteran', title: 'A dropped veteran', personal: true, target: 'droppedVeteran', when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league'], ['played', 3]],
    steps: {
      s1: {
        title: '{p} wants to know why he was dropped', cat: 'Squad', sum: 'Honesty, a promise or a new role',
        text: '{ps}, {age}, has been a regular for most of his career. He was left out again last night and has asked to see you.',
        quote: 'I have given this club everything. I deserve to know where I stand.',
        choices: [
          { l: 'Tell him straight: he is a squad player now', x: { happy: -6, trust: 2 }, out: 'He hears you out and leaves without a word.', later: 'He may not keep it to himself.', next: { to: 's2', after: { matches: 2 } } },
          { l: 'Promise him the next match', fx: { pid: '$p', morale: 6, promise: 'start' }, x: { happy: 6 }, out: 'He shakes your hand. Now he has to take his chance.' },
          { l: 'Make him a mentor for the young players', x: { happy: 4, pillars: { youth: 2 }, trait: { k: 'lead', d: 6 } }, out: 'He takes the youngsters for extra fielding the next morning, and looks ten years younger.' },
        ], safe: 0,
      },
      s2: {
        title: '{p} takes his grievance to the dressing room', cat: 'Squad', sum: 'The senior core is watching',
        text: 'Part 2. {ps} told the senior players he has been treated unfairly. Some of them agree with him.',
        quote: 'Ask anyone in that room who works harder than me.',
        choices: [
          { l: 'Call a team meeting', x: { happyAll: 2, trust: 2 }, out: 'Everything is said in the open. The air clears, mostly.' },
          { l: 'Fine him for breaking ranks', fx: { balance: 0.5 }, x: { happy: -10, pillars: { conduct: 1 } }, out: 'He pays the fine. He also stops talking to you.', next: { to: 's3', after: { seasons: 1 } } },
          { l: 'Bring him back into the XI', fx: { pid: '$p', morale: 8 }, x: { happy: 8, trust: -1 }, out: 'He is back. The captain wonders who picks the team.' },
        ], safe: 0,
      },
      s3: {
        title: '{p} asks to leave', cat: 'Contract', sum: 'Part 3: let him go or talk him round',
        text: 'Part 3, a season on. {ps} has not forgotten the fine. He asks to be released before the season starts.',
        choices: [
          { l: 'Let him go', x: { happy: 10, release: true }, out: 'He leaves with a handshake. His salary comes off your purse in the off-season.' },
          { l: 'Keep him: he is under contract', x: { happy: -6 }, out: 'He stays and does his job, no more.' },
          { l: 'Talk him round', x: { happy: 4, trust: 1 }, out: 'An hour over tea. He agrees to give it one more season.', alt: { p: 0.4, out: 'An hour over tea. He is not convinced.', x: { happy: -3 } } },
        ], safe: 1,
      },
    },
  },
  {
    id: 'sponsor', title: 'Sponsor clash', personal: true, target: 'sponsorFace', when: ['afterMatch', 'seasonStart'], weight: 2,
    cond: [['phase', 'league', 'preseason']],
    steps: {
      s1: {
        title: '{sp} want {p} as their face', cat: 'Sponsor', sum: 'Rs 3 L, or the player\'s goodwill',
        text: '{sp}, a club sponsor, want {ps} to front their new campaign. He already has a personal deal with a rival brand, {sp2}.',
        quote: 'We pay for the shirt. We expect the players to wear the brand.', quoteBy: 'npc',
        choices: [
          { l: 'Back the club sponsor: he drops {sp2}', fx: { balance: 3 }, x: { happy: -8, pillars: { finances: 2 } }, out: 'He signs the new deal, unhappily. His agent is furious.', next: { to: 's2', after: { matches: 3 } } },
          { l: 'Back the player: find another face', x: { happy: 6, pillars: { finances: -1 } }, out: '{sp} pick another player for the campaign. The money is smaller.' },
          { l: 'Broker a deal between the brands', fx: { balance: 1.5 }, x: { happy: 1, pillars: { finances: 1 } }, out: 'A compromise: different products, no clash. Everyone gets a little.', alt: { p: 0.4, out: '{sp} walk away from the talks, and from the next campaign.', fx: null, x: { pillars: { finances: -2 } } } },
        ], safe: 1,
      },
      s2: {
        title: '{p} is unhappy with the campaign', cat: 'Sponsor', sum: 'Part 2: the shoot day',
        text: 'Part 2. The {sp} shoot is on your rest day. {ps} wants it moved; the sponsor wants it now.',
        quote: 'I play cricket. I did not sign up to dance in a cola advert.',
        choices: [
          { l: 'Move the shoot', x: { happy: 5, pillars: { finances: -1 } }, out: 'The shoot moves to the end of the season. {sp} grumble.' },
          { l: 'He does the shoot', fx: { pid: '$p', fit: -6 }, x: { happy: -6, pillars: { finances: 1 } }, out: 'He does it, poorly. The advert runs anyway.' },
          { l: 'Do it with the whole squad', fx: { team: 1, balance: 0.5 }, x: { happy: 2 }, out: 'A squad shoot takes the pressure off him. The advert is quite good.' },
        ], safe: 0,
      },
    },
  },
  {
    id: 'war', title: 'War of words', personal: false, target: 'rivalManager', when: ['afterMatch'], weight: 3,
    cond: [['phase', 'league'], ['played', 1]],
    steps: {
      s1: {
        title: '{mgr} says {club} "got lucky"', ne: 'प्रतिद्वन्द्वी प्रशिक्षकको टिप्पणी', cat: 'Press', sum: 'Rivalry heat and his respect',
        text: '{oppShort} manager {mgr}, a generated character, told reporters your side got lucky and will be found out. You meet {oppShort} soon.',
        quote: 'They have had the bounce of the ball all year. That runs out.', quoteBy: 'npc',
        choices: [
          { l: 'Hit back: "Look at the table"', fx: { fans: 1 }, x: { heat: 12, respect: -6, pillars: { conduct: -1 }, why: 'Press spat' }, out: 'Your line leads the sports pages. {oppShort} pin it on their dressing-room wall.', next: { to: 's2', after: { meet: true } } },
          { l: 'Laugh it off', x: { heat: 2, respect: 3, pillars: { conduct: 1 } }, out: 'You smile and move on. The reporters are disappointed.' },
          { l: 'Invite him for dal bhat after the game', x: { heat: -6, respect: 8 }, out: 'He accepts, a little surprised. The papers call it a truce.' },
        ], safe: 1,
      },
      s2: {
        title: 'After the grudge match with {oppShort}', cat: 'Press', sum: 'Part 2: how to finish it',
        text: 'Part 2. {result} The reporters want to know what you say to {mgr} now.',
        choices: [
          { l: 'Shake his hand in public', x: { heat: -6, respect: 6, pillars: { conduct: 1 } }, out: 'A photo of the handshake makes the front page.' },
          { l: 'Rub it in', fx: { fans: 2 }, x: { heat: 10, respect: -8, pillars: { conduct: -2 }, why: 'Press spat' }, out: 'The fans love it. The league office sends a polite note.' },
          { l: 'Say nothing', x: { heat: 1 }, out: 'Silence. It says plenty.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'rushed', title: 'Rushed back', personal: false, target: 'injuredKey', when: ['afterMatch'], weight: 6,
    cond: [['phase', 'playoffs']],
    steps: {
      s1: {
        title: 'Can {ps} play in the {stage}?', ne: 'चोटिलो खेलाडी फाइनलमा?', cat: 'Medical', sum: 'Risk the injury for the big game',
        text: '{p} is injured and due to miss {inj}. The physio says an injection could get him through the {stage}, with a risk the injury flares up later.',
        choices: [
          { l: 'Play him with the injection', x: { injFix: true, fitAll: -12, reinj: 0.4, trust: 2 }, out: 'He is cleared to play. The physio writes down the risk in the medical log.', later: 'The injury may flare up in pre-season.' },
          { l: 'Fitness test on the morning', x: { injFix: true, fitAll: -8, reinj: 0.2, trust: 1 }, out: 'He passes the test, just. He is in the squad.', alt: { p: 0.5, out: 'He fails the morning test and sits out.', x: {} } },
          { l: 'Rest him: he has years ahead', x: { pillars: { conduct: 1 }, trust: -2 }, out: 'He watches from the dugout. The captain wanted him out there.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'transfer', title: 'Transfer interest', personal: false, target: 'bestPlayer', when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league'], ['played', 5]],
    steps: {
      s1: {
        title: '{oppShort} ask about {p}', cat: 'Transfers', sum: 'Rivalry heat or a pay rise',
        text: '{mgr} at {opp} has asked whether {ps} is available. There are no transfers between auctions, but {oppShort} will be at the next one with money to spend.',
        choices: [
          { l: 'Not for sale, and say so publicly', x: { heat: 6, happy: 4, why: 'Transfer interest' }, out: 'Your answer runs on the back pages. {oppShort} say they were only asking.' },
          { l: 'Offer him a pay rise to stay', fx: { balance: -2 }, x: { happy: 8 }, out: 'Rs 2 L more a season. He is staying.' },
          { l: 'Say nothing', x: { happy: -3, heat: 2, why: 'Transfer interest' }, out: 'The rumours run for a week.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'staffpoach', title: 'Staff poaching', personal: false, target: 'staffCoach', when: ['afterMatch'], weight: 1,
    cond: [['phase', 'league'], ['played', 4]],
    steps: {
      s1: {
        title: '{opp} want your {post}, {npc}', cat: 'Staff', sum: 'Keep your coach, or let him go',
        text: '{npc}, a generated character, has been offered a bigger role at {opp}. He would like to stay, if the club shows it values him.',
        quote: 'I like it here. I also have a family to feed.', quoteBy: 'npc',
        choices: [
          { l: 'Give him a one-off bonus', fx: { balance: -1.5 }, x: { trust: 1 }, out: 'He stays, and says so to the players.' },
          { l: 'Let him go with your blessing', x: { respect: 6, staffLeave: true }, out: 'He leaves at the end of the season. {mgr} sends a thank-you note.' },
          { l: 'Tell {oppShort} to stay away', x: { heat: 8, respect: -4, why: 'Tried to poach your staff' }, out: 'He stays. {oppShort} deny everything.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'prospect', title: 'A raw talent', personal: true, target: 'prospect', when: ['afterMatch', 'seasonStart'], weight: 1,
    cond: [['phase', 'league', 'preseason']],
    steps: {
      s1: {
        title: 'Your scouts rave about a {age}-year-old from {prov}', cat: 'Scouting', sum: 'Spend a little to know more',
        text: '{p}, a {role} from {prov} Province, has been the talk of district cricket. He has no club and will be in the next auction pool.',
        choices: [
          { l: 'Send the head scout', fx: { balance: -0.5 }, x: { scout: true }, out: 'The report is in: his potential is on his profile.', next: { to: 's2', after: { seasons: 1 } } },
          { l: 'Invite him to train with the squad', fx: { balance: -1 }, x: { scout: true, trait: { k: 'loyal', d: 12 }, pillars: { youth: 2 } }, out: 'He spends a week at Kirtipur and leaves wide-eyed.', next: { to: 's2', after: { seasons: 1 } } },
          { l: 'Not now', out: 'Others will find him.' },
        ], safe: 2,
      },
      s2: {
        title: '{p} remembers who spotted him', cat: 'Scouting', sum: 'Part 2: a season on',
        text: 'Part 2. {ps} is a season older and other clubs know his name now. He tells a reporter which club gave him his first look.',
        quote: 'The {club} scouts were the first to believe in me.',
        choices: [
          { l: 'Add him to your shortlist', x: { shortlist: true }, out: 'He is on your auction shortlist.' },
          { l: 'Send him a club shirt', x: { trait: { k: 'loyal', d: 6 } }, out: 'He posts a photo in it. Your fans like that.' },
          { l: 'Leave it', out: 'You wish him well.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'protest', title: 'Fans protest', personal: false, target: 'none', when: ['afterMatch'], weight: 5,
    cond: [['phase', 'league'], ['lost', 3]],
    steps: {
      s1: {
        title: '{city} supporters plan a protest after {lostN} straight defeats', ne: 'समर्थकहरू आक्रोशित', cat: 'Fans', sum: 'Fans, money or your nerve',
        text: 'The supporters\' club, a generated group, plans banners at the next game. They want answers about selection.',
        quote: 'We travel, we pay, we sing. We want a team that fights.', quoteBy: 'npc',
        choices: [
          { l: 'Meet the supporters\' club', x: { pillars: { fans: 3, conduct: 1 } }, out: 'Two hours, a lot of tea and some hard questions. The banners say "Fight for the badge" instead.' },
          { l: 'Cut ticket prices for the next game', fx: { balance: -1.5, fans: 4 }, x: { pillars: { fans: 2, finances: -1 } }, out: 'A full stand and a good atmosphere.' },
          { l: 'Ignore it', fx: { fans: -3 }, x: { pillars: { fans: -2 } }, out: 'The banners go up. The cameras find them.' },
        ], safe: 0,
      },
    },
  },
  {
    id: 'feud', title: 'Dressing-room feud', personal: true, target: 'fictionalPair', when: ['afterMatch'], weight: 1,
    cond: [['phase', 'league'], ['played', 3]],
    steps: {
      s1: {
        title: '{ps} and {p2s} fall out at nets', cat: 'Squad', sum: 'Unity and the captain',
        text: 'A short-ball drill turned into a shouting match between {p} and {p2}. Teammates had to step in.',
        quote: 'He bowled at my head four times in a net session. In a net session!',
        choices: [
          { l: 'Bang heads together', x: { happyAll: -2, trust: 2 }, out: 'A stern word with both. They shake hands, stiffly.' },
          { l: 'Split them into different groups', x: { happyAll: 1 }, out: 'Separate nets for a week. It works, for now.', next: { to: 's2', after: { matches: 2 } } },
          { l: 'Let the captain sort it out', x: { trust: -1, happyAll: 2 }, out: 'The captain takes them both for dinner. Peace, of a sort.', alt: { p: 0.4, out: 'The captain tries. It does not take.', next: { to: 's2', after: { matches: 2 } } } },
        ], safe: 0,
      },
      s2: {
        title: 'The {ps}–{p2s} feud is back', cat: 'Squad', sum: 'Part 2',
        text: 'Part 2. {ps} and {p2s} had words again on the team bus. The younger players are taking sides.',
        quote: 'I will play with him. I do not have to like him.',
        choices: [
          { l: 'Fine them both', fx: { balance: 0.5 }, x: { happyAll: -4, pillars: { conduct: 1 } }, out: 'The fines go to the supporters\' club. It ends there.' },
          { l: 'Sit them down together', x: { happyAll: 4, trust: 1 }, out: 'An awkward hour. They leave laughing, eventually.' },
          { l: 'Drop one of them', fx: { pid: '$p', morale: -8 }, x: { happy: -6 }, out: 'A message to everyone. {ps} takes it worst.' },
        ], safe: 1,
      },
    },
  },
  {
    id: 'pundit', title: 'The pundit', personal: false, target: 'pundit', when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league', 'playoffs'], ['lastLost']],
    steps: {
      s1: {
        title: 'TV pundit {npc} calls your selection "a lottery"', cat: 'Press', sum: 'Conduct and the fans',
        text: '{npc}, a generated pundit, spent five minutes on air pulling your XI apart after the defeat.',
        quote: 'I have seen better planning at a village tournament.', quoteBy: 'npc',
        choices: [
          { l: 'Reply on air', fx: { fans: 1 }, x: { pillars: { conduct: -1 } }, out: 'A lively segment. Ratings are good; the board is less amused.' },
          { l: 'Invite him to a training session', x: { pillars: { conduct: 2, fans: 1 } }, out: 'He comes, watches, and is kinder the next week.' },
          { l: 'Ignore him', out: 'Tomorrow he will be talking about someone else.' },
        ], safe: 2,
      },
    },
  },
  {
    id: 'school', title: 'A school visit', personal: false, target: 'none', when: ['afterMatch', 'seasonStart'], weight: 1,
    cond: [['phase', 'league', 'preseason']],
    steps: {
      s1: {
        title: 'A school in {city} asks for a coaching clinic', ne: 'विद्यालयमा प्रशिक्षण शिविर', cat: 'Community', sum: 'Fans and youth, or rest',
        text: 'A government school in {city} wants players to run a coaching clinic on the rest day. Four hundred children have signed up.',
        choices: [
          { l: 'Send the whole squad', fx: { fans: 2 }, x: { pillars: { fans: 3, youth: 1 }, fitAll: -3 }, out: 'A loud, happy day. Some tired legs at the next session.' },
          { l: 'Send the young players and a coach', x: { pillars: { fans: 2, youth: 2 } }, out: 'The youngsters are a hit; one of the children bowls the batting coach.' },
          { l: 'Decline: the squad needs the rest', fx: { fans: -1 }, x: { pillars: { fans: -1 } }, out: 'The school is disappointed and says so on social media.' },
        ], safe: 1,
      },
    },
  },
  {
    id: 'pitch', title: 'The groundsman\'s offer', personal: false, target: 'rivalHot', when: ['afterMatch'], weight: 2,
    cond: [['phase', 'league'], ['heat', 35]],
    steps: {
      s1: {
        title: 'The groundsman offers a turner for the {oppShort} game', cat: 'Match', sum: 'An edge, at a price',
        text: '{npc}, the Kirtipur groundsman and a generated character, says he can leave the next {oppShort} pitch dry and slow.',
        quote: 'Say the word, and it will turn from the first over.', quoteBy: 'npc',
        choices: [
          { l: 'Yes, a turner', x: { heat: 6, respect: -4, pillars: { conduct: -1 }, why: 'Doctored pitch row' }, out: '{oppShort} complain before a ball is bowled.' },
          { l: 'A fair pitch, please', x: { respect: 4, pillars: { conduct: 2 } }, out: 'The groundsman shrugs. A good, fair pitch.' },
          { l: 'Ask the match referee to inspect it', x: { pillars: { conduct: 1 }, respect: 2 }, out: 'The referee is impressed. So is {mgr}.' },
        ], safe: 1,
      },
    },
  },
  {
    id: 'academy', title: 'The academy director', personal: false, target: 'youngFictional', when: ['afterMatch'], weight: 1,
    cond: [['phase', 'league'], ['played', 5]],
    steps: {
      s1: {
        title: 'Your academy director wants {p} given a chance', cat: 'Youth', sum: 'Youth pillar or a promise',
        text: '{npc}, your academy director and a generated character, says {ps} ({age}) is ready and the board\'s youth target needs minutes.',
        quote: 'If not now, when? The kids are watching how we treat him.', quoteBy: 'npc',
        choices: [
          { l: 'Promise him a debut', fx: { pid: '$p', promise: 'debut', morale: 6 }, x: { pillars: { youth: 2 }, happy: 6 }, out: 'The academy celebrates. Now you have to find him a place in the XI.' },
          { l: 'More time in the nets first', x: { pillars: { youth: -1 }, happy: -2 }, out: 'The director accepts it, but writes it down.' },
          { l: 'Put him in the next squad photo, no promise', x: { happy: 2 }, out: 'A small step. He is closer.' },
        ], safe: 1,
      },
    },
  },
];
