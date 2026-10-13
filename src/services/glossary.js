// Plain-language stat definitions for cheat sheets and other glossary cards.
// Model definitions follow the FanGraphs primer; Grade and Rank follow the
// POC's derived columns. Kept in one place so a future
// model registry can supply new entries without UI changes.
export const STAT_DEFINITIONS = {
  stuffPlus: {
    term: 'Stuff+',
    definition:
      'Grades the physical traits of a pitch only: release point, velocity, movement, spin and axis. 100 is average. Reliable after about 80 pitches.',
  },
  locationPlus: {
    term: 'Location+',
    definition:
      'Grades where a pitch is thrown, adjusted for the count and pitch type, ignoring its physical traits. 100 is average. Reliable after about 400 pitches.',
  },
  pitchingPlus: {
    term: 'Pitching+',
    definition:
      'A separate model that combines physical traits, location, count and batter handedness. It is not an average of Stuff+ and Location+. 100 is average.',
  },
  grade: {
    term: 'Grade',
    definition:
      'Pitching+ on the 20-80 scouting scale: 50 is average and every 10 points is one standard deviation for the pitcher’s role (SP or RP). Rounded to the nearest 5.',
  },
  modelGrades: {
    term: '20-80 Grades',
    definition:
      'Every model on the scouting scale: 50 is MLB average for the pitcher’s role (SP or RP) and every 10 points is one standard deviation. Pitch grades compare against the same pitch type. Rounded to the nearest 5.',
  },
  movement: {
    term: 'IVB / HB',
    definition:
      'Induced vertical break: how much a pitch rises or drops compared with a spinless pitch, in inches. Horizontal break: sideways movement, toward the arm side or glove side from the pitcher’s view.',
  },
  whiff: {
    term: 'Whiff%',
    definition: 'Swings and misses as a share of all swings against the pitch.',
  },
  xwoba: {
    term: 'xwOBA',
    definition:
      'Expected weighted on-base average allowed, based on quality of contact, strikeouts and walks rather than where balls landed. Lower is better for a pitcher.',
  },
  xera: {
    term: 'xERA',
    definition:
      'Expected ERA: xwOBA allowed put on the ERA scale. A gap between ERA and xERA hints at luck or defense rather than skill.',
  },
  fip: {
    term: 'FIP',
    definition:
      'Fielding Independent Pitching: ERA rebuilt from strikeouts, walks, hit batters and home runs only, so defense and batted-ball luck drop out. Lower is better.',
  },
  rank: {
    term: 'Rank',
    definition:
      'Order within the Rotation or the Bullpen by Grade. When grades tie, the pitcher with more innings ranks higher.',
  },
}

// Pick definitions by key, in the order given.
export const statDefinitions = (keys) => keys.map((k) => STAT_DEFINITIONS[k])
