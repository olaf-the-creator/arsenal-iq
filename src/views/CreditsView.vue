<script setup>
// Data sources and disclosures. Source credits live here instead of
// in footnotes on the data pages.
const sources = [
  {
    name: 'MLB',
    url: 'https://www.mlb.com',
    site: 'mlb.com',
    uses: [
      'Roster and bio details: jersey number, position, throwing hand, depth role, DOB, age, height and weight',
      'Player headshots, loaded from MLB’s image service by MLBAM ID',
      'Team logos (placeholders in the public source)',
    ],
  },
  {
    name: 'FanGraphs',
    url: 'https://www.fangraphs.com',
    site: 'fangraphs.com',
    uses: [
      'Season Stuff+, Location+ and Pitching+ for each pitcher, with innings pitched',
      'Stuff+ and Location+ by pitch type',
      'Model definitions, reliability thresholds and the spreads behind the 20-80 grades, from the Stuff+, Location+ and Pitching+ primer (Sabermetrics Library)',
    ],
    note: 'The 20-80 grades and ranks are derived from these values and are illustrative.',
  },
  {
    name: 'Baseball Savant',
    url: 'https://baseballsavant.mlb.com',
    site: 'baseballsavant.mlb.com',
    uses: [
      'Season results: W-L, ERA, xERA, FIP, starts, innings, strikeouts, WHIP, K% and BB%, plus the 2026 game log',
      'Arsenal metrics by pitch: usage, count, velocity, movement, whiff rate, xwOBA and run value',
      'Statcast pitch locations, counts, batter hands and strike zones, binned into the Location+ map',
    ],
    note: 'Statcast data is provided by MLB Advanced Media.',
  },
]
</script>

<template>
  <section>
    <h1>Credits</h1>
    <p class="intro">
      This proof of concept is built on public 2026 regular-season data from the sources below. We thank them for making it available.
    </p>

    <div class="grid">
      <article v-for="s in sources" :key="s.name" class="source">
        <h2>{{ s.name }}</h2>
        <a :href="s.url" target="_blank" rel="noopener">{{ s.site }}</a>
        <ul>
          <li v-for="u in s.uses" :key="u">{{ u }}</li>
        </ul>
        <p v-if="s.note" class="note">{{ s.note }}</p>
      </article>
    </div>

    <div class="section-head">
      <h2 class="section-title">Disclosures</h2>
      <span class="rule" aria-hidden="true" />
    </div>
    <ul class="disclosures">
      <li>This is a hobby project, built for a Washington Nationals job application. It is not affiliated with or endorsed by MLB, the Washington Nationals, FanGraphs or Baseball Savant.</li>
      <li>Team names, logos and player images are the property of MLB and its clubs and are used here for illustration only.</li>
      <li>The Location+ map’s colors are synthetic. Statcast doesn’t publish a Location+ score for each pitch, so the values are invented and anchored to each pitch type’s real FanGraphs season Location+.</li>
      <li>Chadwick's answers are scripted, not generated. Its what-if sensitivities, model ERA, earlier seasons' model values, per-start Pitching+ and the Stuff Decay+ model are synthetic and labeled illustrative.</li>
      <li>Data is a snapshot and doesn’t update. Some figures were transcribed by hand and should be checked against the source before any use outside this mockup.</li>
    </ul>
  </section>
</template>

<style scoped>
.intro {
  max-width: 720px;
  margin: 0 0 24px;
  font-size: 15px;
  line-height: 1.5;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  gap: 16px;
}

.source {
  padding: 18px 20px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-card-bg);
}

.source h2 {
  margin: 0;
  color: var(--color-navy);
  font-size: 18px;
  font-weight: 700;
}

.source a {
  color: var(--color-scarlet);
  font-size: 13px;
  font-weight: 600;
}

.source ul {
  margin: 14px 0 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.5;
}

.source li + li {
  margin-top: 6px;
}

.note {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 16px;
}

.section-title {
  margin: 0;
  color: var(--color-navy);
  font-size: 20px;
  font-weight: 700;
}

.rule {
  flex: 1;
  height: 1px;
  background: var(--color-navy);
}

.disclosures {
  max-width: 820px;
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.6;
}

.disclosures li + li {
  margin-top: 6px;
}
</style>
