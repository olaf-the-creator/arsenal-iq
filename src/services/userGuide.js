// User Guide content, one entry per route name. The drawer reads this
// through guideFor(); a Rails/CMS endpoint could replace the file later.
//
// Writing rules (ASD-STE100 Simplified Technical English):
// short sentences (about 20 words at most), one idea each, active voice, simple
// present tense, the same word for the same thing, no em dashes.
// Stat definitions stay in each page's Stats Cheat Sheet, so keep stat
// references high level here. Use **bold** only where it helps the reader.
//
// A summary may hold [link text](url) links. They open in a new tab.
//
// Shape: { heading, summary, sections: [{ title, text?, bullets?, steps? }] }

const GUIDES = {
  'arsenal-iq': {
    heading: 'Arsenal IQ',
    summary:
      'Arsenal IQ is a mock app for the Nationals’ front office: a home base for pitching analytics. It ranks every pitcher on the [Stuff+, Location+ and Pitching+ models](https://library.fangraphs.com/pitching/stuff-location-and-pitching-primer/), so you can spot the arms worth a closer look in minutes instead of hours.',
    sections: [
      {
        title: 'Player search',
        text: 'The search box is in the top bar on every page. Type part of a name to see matches. Select a name to open that pitcher’s profile. In this POC, only Cade Cavalli has a profile. The other names show a note and you cannot select them. On a phone, tap the magnifier icon to open the search.',
      },
      {
        title: 'Main table',
        text: 'The table lists each pitcher who matches the filters. It shows player information and the season results from the three models.',
        bullets: [
          'The table has two groups: **Rotation** and **Bullpen**. Starters and relievers have very different results, so the table ranks them separately.',
          'Click a row or its **View** button to open the Pitcher Profile. In this POC, only Cade Cavalli has a profile.',
          'A dagger (†) next to a grade means the pitcher has thrown few pitches. Use that grade with care.',
        ],
      },
      {
        title: 'Filters',
        bullets: [
          '**Year:** click the year next to the page title to open a list of seasons. In this POC, only 2026 is available.',
          '**Scope:** the tabs above the table change the list of pitchers. **Team** shows all Washington Nationals major league pitchers. It is the default.',
          '**MLB** and **MiLB** are disabled in this POC. They show future uses, such as a search for trade targets, waiver claims or depth options.',
        ],
      },
      {
        title: 'Toggles',
        bullets: [
          '**Stuff+ by pitch:** adds the Stuff+ result for each pitch type. The table gets wider. This toggle is off by default.',
          '**Heat map:** colors the stats in the table to show how each pitcher compares with the rest of the league. This toggle is on by default.',
        ],
      },
      {
        title: 'Small screens',
        text: 'On a phone, the table uses a compact layout. It shows the three model columns and the grade, and it hides the player photos.',
      },
      {
        title: 'Stats Cheat Sheet',
        text: 'The Stats Cheat Sheet is below the table. It explains each stat in the table.',
      },
    ],
  },

  'pitcher-profile': {
    heading: 'Pitcher Profile',
    summary:
      'One pitcher, the full picture. This page puts the bio, the headline grades, a pitch-by-pitch arsenal and the movement profile in one place. Most of the numbers come from the three models, and this POC covers the 2026 season only.',
    sections: [
      {
        title: 'Player search',
        text: 'The search box is in the top bar on every page. Type part of a name to see matches. Select a name to open that pitcher’s profile. In this POC, only Cade Cavalli has a profile. The other names show a note and you cannot select them. On a phone, tap the magnifier icon to open the search.',
      },
      {
        title: 'Player information',
        text: 'The top of the page shows the pitcher’s photo, position, team, role, throwing hand, size and age. A table of season results (ERA, xERA, FIP and more) is beside it. The links above it return you to Arsenal IQ.',
      },
      {
        title: 'Model Grades',
        text: 'Each of the three models has a card. The models give scores where 100 is the league average and each 10 points is one standard deviation. The 20-80 grading scale makes these scores easier to read.',
        bullets: [
          'Each card shows the grade and the model score.',
          'The Process vs Results card puts Pitching+ on the ERA scale (Model ERA) next to xERA, FIP and ERA. Model ERA is illustrative until R&D supplies an expected-runs figure. The other three are real.',
        ],
      },
      {
        title: 'Pitch Arsenal',
        text: 'This section has three views of the same data: the arsenal table, the Movement Profile chart and the Location+ Map. The views are linked. When you select a pitch in one view, the other views change to show that pitch.',
        bullets: [
          'Nearly all data here is real. The only exception is the color of the Location+ Map (see below).',
        ],
      },
      {
        title: 'Movement Profile',
        text: 'The chart shows how each pitch moves, from the pitcher’s view. Select a pitch in the chart or in the table to focus on it.',
      },
      {
        title: 'Location+ Map',
        text: 'The map shows where the pitcher throws and the Location+ score of those pitches. It shows the catcher’s view.',
        bullets: [
          'Filter by **pitch type**, **count** and **batter hand**.',
          'The pitch locations, pitch counts and season Location+ are real.',
          'The colors are **synthetic**. Detailed Location+ scores for each pitch are very large, so this POC does not use them.',
          'In a full product, a backend server would process this data and send it to the app.',
        ],
      },
      {
        title: 'Disabled tabs',
        text: 'Two tabs below the player information are not active in this POC.',
        bullets: [
          '**Pitch Optimizer:** this tool will show how a change to arm slot, seam orientation, grip or release can change a pitcher’s results. The Director of Pitching wants this feature. Chadwick will be the interface for it, because natural language is flexible and easy to use.',
          '**Biomechanics:** Baseball Sciences has a skeletal data viewer that they want to add to this platform. It is planned for a later phase. Staff are more likely to make high-impact decisions from hard metrics, such as arm angle compared with results.',
        ],
      },
    ],
  },

  chadwick: {
    heading: 'Chadwick AI',
    summary:
      'Chadwick AI is the club’s newest analytics product, named after [Henry Chadwick](https://en.wikipedia.org/wiki/Henry_Chadwick_(writer)), the baseball writer who turned the game into numbers. Ask a question in plain language, and Chadwick finds the data, runs the models and answers with charts.',
    sections: [
      {
        title: 'How Chadwick works',
        text: 'Chadwick uses the latest large language models (LLMs). It uses the data and model services behind the app. For each question, Chadwick does these steps:',
        steps: [
          'Reads your question.',
          'Gets the data it needs from the data service.',
          'Sends different values to one of the three model APIs for a “what if” simulation.',
          'Writes a detailed answer with charts, graphs or other visuals.',
        ],
      },
      {
        title: 'Selectors',
        text: 'The selectors are below the question box. They set what Chadwick uses.',
        bullets: [
          '**Player:** you can write a player’s name in your question. Use the selector when you need to be exact, for example to choose the correct “Smith” or “Cabrera”. In this POC, only Cade Cavalli is available.',
          '**Model:** Chadwick can use the Stuff+, Location+ and Pitching+ APIs. It can use other models and uses in the future.',
          '**Source data:** this is the source and year that Chadwick uses to find data. In this POC, it is Statcast for the 2026 season.',
        ],
      },
      {
        title: 'Sample prompts',
        text: 'This is a POC, so Chadwick does not give a useful answer to a question that you type yourself. Select a sample prompt to see what Chadwick can do. The answers are scripted.',
      },
      {
        title: 'Chat tools',
        bullets: [
          'Stop an answer while Chadwick writes it.',
          'Ask a follow-up question from the suggestions under an answer.',
          'Start a new chat from the button at the top of the chat.',
        ],
      },
    ],
  },

  credits: {
    heading: 'Credits',
    summary:
      'This page thanks the people who collect and provide the data that gives this POC real information. It also shows which parts of the project are real and which parts are close to real or simulated.',
    sections: [
      {
        title: 'Data sources',
        text: 'A prototype that uses only invented data is hard to judge. These sources made the POC more useful, and the team wants to thank them. Each card lists the data that the POC takes from that source.',
      },
      {
        title: 'Disclosures',
        text: 'The Disclosures list explains what is real, what is derived and what is synthetic. Read it before you use a number from the POC outside the project.',
      },
    ],
  },
}

const FALLBACK = {
  heading: 'Page not found',
  aboutLabel: 'About this page',
  summary: 'This page does not exist. Use the tabs in the top bar to go to Arsenal IQ, Chadwick or Credits.',
  sections: [],
}

/** Text for the header's guide button: "About <page title>". */
export function aboutLabel(routeName) {
  const g = guideFor(routeName)
  return g.aboutLabel ?? `About ${g.heading}`
}

/** Guide for a route name. Unknown routes get a short fallback. */
export function guideFor(routeName) {
  return GUIDES[routeName] ?? FALLBACK
}
