<script setup>
import { computed, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PersonIcon from './PersonIcon.vue'
import { heatColor } from '../utils/grades.js'
import { MIN_PITCHES, PITCH_COLUMNS, PITCHES_PER_IP, hasProfile, headshotUrl, teamLogoUrl } from '../services/pitchers.js'

const props = defineProps({
  // [{ role, pitchers }], one group per role, each already ordered by rank.
  groups: { type: Array, required: true },
  // Show the per-pitch Stuff+ columns after Stuff+ (toggled from the action bar).
  showPitches: { type: Boolean, default: false },
  // Shade the model cells blue (cold) to red (hot) by their 20-80 grade.
  heatMap: { type: Boolean, default: false },
})

const pitchCols = computed(() => (props.showPitches ? PITCH_COLUMNS : []))
const lastPitch = PITCH_COLUMNS.length - 1
const columns = computed(() => 9 + pitchCols.value.length)

// Headshots that failed to load (e.g. offline) show the placeholder icon.
const noPhoto = reactive(new Set())
// Groups with rows; when none (e.g. a scope without data) a generic header shows.
const shown = computed(() => props.groups.filter((g) => g.pitchers.length))
const hasThin = computed(() => shown.value.some((g) => g.pitchers.some((p) => p.thinSample)))

// Whole-row click opens the profile (the name stays a real link for keyboard and
// screen readers). Clicks on the name link keep their own behavior.
const router = useRouter()
const profileRoute = (p) => ({ name: 'pitcher-profile', params: { playerId: p.playerId } })
const openRow = (p, e) => {
  if (!hasProfile(p.playerId) || e.target.closest('a, button')) return
  router.push(profileRoute(p))
}
const NO_PROFILE = 'Profile page not available in the POC (Cade Cavalli only)'

const THIN_MARK = '†'
const thinTitle = (role) =>
  `Small sample: under ~${MIN_PITCHES[role]} pitches (est. from IP). Grade may not be stable yet.`

// Stat cells are blank when the value is N/A (design doc).
const fmtPlus = (v) => (v == null ? '' : Math.round(v))
// Inline fill for a cell's 20-80 grade; none when the heat map is off.
const heat = (g) => (props.heatMap && g != null ? { backgroundColor: heatColor(g) } : undefined)
const fmtIp = (v) => (v == null ? '' : v.includes('.') ? v : `${v}.0`)
</script>

<template>
  <div>
    <!-- Only the table scrolls sideways; the footnotes below stay put. -->
    <div class="table-wrap">
    <table class="pitcher-table" :class="{ condensed: !showPitches }">
      <!-- One tbody per role (Rotation, then Bullpen), each opened by its own
           light-grey header row whose first cell (over Rank + Player) names the role. -->
      <tbody v-for="(g, i) in shown.length ? shown : [{ role: 'Pitchers', pitchers: [] }]" :key="g.role" class="group" :aria-label="g.role">
        <tr class="group-head" :class="{ 'group-head--first': i === 0 }">
          <th scope="colgroup" colspan="2" class="role">{{ g.role }}</th>
          <th scope="col" class="c-extra">Position</th>
          <th scope="col" class="c-extra">Team</th>
          <th scope="col" class="num c-extra">IP</th>
          <th scope="col" class="num">Stuff+</th>
          <th v-for="(c, j) in pitchCols" :key="c.key" scope="col" class="num pitch" :class="{ 'pitch--first': j === 0, 'pitch--last': j === lastPitch }" :title="`Stuff+: ${c.name}`">
            Stf+ {{ c.label }}
          </th>
          <th scope="col" class="num">Location+</th>
          <th scope="col" class="num">Pitching+</th>
          <th scope="col" class="num sorted" aria-sort="descending" title="Sorted by Pitching grade (20-80), within role">
            Grade <span class="sort-arrow" aria-hidden="true">▼</span>
          </th>
        </tr>
        <template v-for="p in g.pitchers" :key="p.playerId">
        <tr
          :class="{ 'row--link': hasProfile(p.playerId) }"
          :title="hasProfile(p.playerId) ? undefined : NO_PROFILE"
          @click="openRow(p, $event)"
        >
          <td class="num rank">{{ p.rank ?? '' }}</td>
          <td>
            <!-- Rows with a profile page link to it (Cavalli only in the POC). -->
            <component
              :is="hasProfile(p.playerId) ? RouterLink : 'div'"
              v-bind="hasProfile(p.playerId) ? { to: profileRoute(p) } : {}"
              class="player"
              :class="{ 'player--link': hasProfile(p.playerId) }"
            >
              <span class="avatar">
                <img
                  v-if="p.mlbamId && !noPhoto.has(p.mlbamId)"
                  :src="headshotUrl(p.mlbamId)"
                  alt=""
                  width="45"
                  height="45"
                  loading="lazy"
                  @error="noPhoto.add(p.mlbamId)"
                />
                <PersonIcon v-else :size="26" />
              </span>
              <span class="who">
                <span class="player-name">{{ p.name }}</span>
                <span v-if="p.number" class="jersey" :title="`Jersey number ${p.number}`">#{{ p.number }}</span>
                <span class="sub">{{ p.position }}<template v-if="p.ip"> · {{ fmtIp(p.ip) }} IP</template></span>
              </span>
              <!-- Right-aligned in the cell so the pills line up down the table (decorative: the name link and the row click do the work). -->
              <span class="view-profile" :class="{ 'view-profile--off': !hasProfile(p.playerId) }" aria-hidden="true">View ›</span>
            </component>
          </td>
          <td class="c-extra">{{ p.position ?? '' }}</td>
          <td class="c-extra">
            <div v-if="p.team" class="team">
              <img :src="teamLogoUrl(p.team)" :alt="p.teamName ?? p.team" width="20" height="20" />
              <span>{{ p.team }}</span>
            </div>
          </td>
          <td class="num c-extra">{{ fmtIp(p.ip) }}</td>
          <td class="num" :style="heat(p.stuffGrade)">{{ fmtPlus(p.stuffPlus) }}</td>
          <td v-for="(c, j) in pitchCols" :key="c.key" class="num pitch" :class="{ 'pitch--first': j === 0, 'pitch--last': j === lastPitch }" :style="heat(p.pitchStuffGrade[c.key])">
            {{ fmtPlus(p.pitchStuffPlus[c.key]) }}
          </td>
          <td class="num" :style="heat(p.locationGrade)">{{ fmtPlus(p.locationPlus) }}</td>
          <td class="num" :style="heat(p.grade)">{{ fmtPlus(p.pitchingPlus) }}</td>
          <td class="num grade" :style="heat(p.grade)">
            {{ p.grade ?? '' }}<span v-if="p.thinSample" class="thin-mark" :title="thinTitle(p.role)">{{ THIN_MARK }}<span class="visually-hidden"> small sample</span></span>
          </td>
        </tr>
        </template>
        <tr v-if="!g.pitchers.length">
          <td :colspan="columns" class="empty">No pitchers to show.</td>
        </tr>
      </tbody>
    </table>
    </div>
    <p v-if="heatMap" class="footnote">
      Shading follows each value's 20-80 grade: <span class="swatch swatch--cold" aria-hidden="true" /> blue is below
      average (cold), white is average, <span class="swatch swatch--hot" aria-hidden="true" /> red is above average (hot).
    </p>
    <p v-if="hasThin" class="footnote">
      <span class="thin-mark thin-mark--inline" aria-hidden="true">{{ THIN_MARK }}</span>
      Small sample: fewer than ~{{ MIN_PITCHES.Rotation }} pitches (Rotation) or ~{{ MIN_PITCHES.Bullpen }} (Bullpen),
      estimated from IP at {{ PITCHES_PER_IP }} pitches per inning. Treat the grade as provisional.
    </p>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}

.pitcher-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

th {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

tbody tr:hover {
  background: var(--color-row-hover);
}

/* Group header rows: very light grey, role name over Rank + Player. */
.group-head th {
  background: var(--color-header-bg);
  border-bottom: none;
}

/* Later group headers double as the divider: white space above, then grey. */
.group-head:not(.group-head--first) th {
  border-top: 28px solid var(--color-white);
}

.role {
  color: var(--color-navy);
  font-size: 13px;
  font-weight: 700;
}

.group tr.group-head:hover {
  background: none;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sorted {
  color: var(--color-navy);
  font-weight: 700;
}

.sort-arrow {
  margin-left: 2px;
  font-size: 9px;
}

.grade {
  position: relative; /* the thin-data marker hangs in the padding, so grades stay aligned */
  font-weight: 700;
  color: var(--color-navy);
}

.thin-mark {
  position: absolute;
  margin-left: 2px;
  color: var(--color-scarlet);
  font-size: 12px;
  font-weight: 700;
  cursor: help;
}

.thin-mark--inline {
  position: static;
  margin: 0 4px 0 0;
}

.footnote {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.jersey {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin: 0 2px 0 4px;
  border-radius: 2px;
  vertical-align: -1px;
}

.swatch--cold {
  background: rgb(92 141 214);
}

.swatch--hot {
  background: rgb(226 88 80);
}

.rank {
  font-weight: 600;
  color: var(--color-navy);
}

.player {
  display: flex;
  align-items: center;
  gap: 12px;
}

.who {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

/* Position and IP under the name: shown on phones only, where those columns drop. */
.sub {
  display: none;
}

/* Headshot roundel (~45px, design doc); navy border per the theme. */
.avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 45px;
  height: 45px;
  overflow: hidden;
  border: 2px solid var(--color-navy);
  border-radius: 50%;
  color: var(--color-navy);
  background: var(--color-header-bg);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Per-pitch columns read as a detail band attached to Stuff+. */
th.pitch,
td.pitch {
  padding-left: 8px;
  padding-right: 8px;
}

td.pitch {
  color: var(--color-text);
  font-size: 14px;
}

/* Subtle dividers bracket the per-pitch band. */
.pitch--first {
  border-left: 1px solid var(--color-border);
}

.pitch--last {
  border-right: 1px solid var(--color-border);
}

.player-name {
  font-weight: 700;
}

.player--link {
  color: inherit;
  text-decoration: none;
}

/* Clickable rows: pointer, scarlet accent on hover, and a "View ›" pill beside the name. */
.row--link {
  cursor: pointer;
}

tbody tr.row--link:hover {
  background: #fbeeee;
  box-shadow: inset 3px 0 0 var(--color-scarlet);
}

.view-profile {
  display: inline-block;
  flex: none;
  margin-left: auto;
  white-space: nowrap;
  padding: 3px 10px;
  border: 1px solid var(--color-scarlet);
  border-radius: 999px;
  color: var(--color-scarlet);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.row--link:hover .view-profile,
.row--link:focus-within .view-profile {
  background: var(--color-scarlet);
  color: var(--color-white);
}

/* Rows without a profile keep the pill, greyed out (the row tooltip explains why). */
.view-profile--off {
  border-color: var(--color-border);
  color: #c4c8d0;
  cursor: not-allowed;
}

.player--link .player-name {
  color: var(--color-navy);
}

.player--link:hover .player-name,
.player--link:focus-visible .player-name {
  color: var(--color-scarlet);
  text-decoration: underline;
}

.team {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty {
  padding: 32px;
  color: var(--color-text-muted);
  text-align: center;
}

/* Phones: no avatar, a compact table with every column always visible (rank, player with
   position and IP beneath, Stuff+, Location+, Pitching+, Grade). With per-pitch columns
   on, the full table scrolls sideways and the player column stays put. */
@media (max-width: 640px) {
  .pitcher-table {
    font-size: 13px;
  }

  th,
  td {
    padding: 7px 4px;
  }

  th {
    font-size: 9px;
    letter-spacing: 0.02em;
  }

  .avatar {
    display: none;
  }

  /* Rank drops; the freed room keeps the name on one line, with number, position and IP
     on a second line, and the pill centered against both. */
  /* Zero-width rather than display:none, so the role header's colspan=2 still lines up. */
  /* Specific enough to beat the `.condensed td.num` padding and width below. */
  .pitcher-table td.rank.num {
    width: 0;
    min-width: 0;
    padding: 0;
    font-size: 0;
    border-bottom-color: transparent;
  }

  .player {
    gap: 8px;
  }

  .group-head .role,
  td:nth-child(2) {
    padding-left: 8px;
  }

  .who {
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: 1px 4px;
    min-width: 0;
    /* Contributes no intrinsic width, so the player column's size comes from its
       min-width alone and the name-to-pill gap is the same with or without the
       per-pitch columns. */
    width: 0;
  }

  .player-name {
    flex: 0 0 100%;
    white-space: nowrap;
    line-height: 1.2;
  }

  .jersey {
    font-size: 11px;
  }

  .jersey::after {
    content: ' ·';
  }

  .view-profile {
    padding: 1px 7px;
    font-size: 10px;
  }

  .sub {
    display: block;
    color: var(--color-text-muted);
    font-size: 11px;
  }

  td {
    white-space: normal;
  }

  td.num {
    white-space: nowrap;
  }

  /* Condensed layout: numbers hug their content so names get the room. */
  .condensed td.num,
  .condensed th.num {
    width: 1%;
    padding-left: 5px;
    padding-right: 5px;
  }

  .c-extra {
    display: none;
  }

  /* Full table (per-pitch on): frozen player column. */
  .pitcher-table:not(.condensed) {
    width: max-content;
    min-width: 100%;
  }

  .pitcher-table:not(.condensed) .group-head .role,
  .pitcher-table:not(.condensed) tbody tr:not(.group-head) td:nth-child(2) {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--color-white);
    box-shadow: 1px 0 0 var(--color-border);
  }

  /* The role header cell keeps its grey while frozen. */
  .pitcher-table:not(.condensed) .group-head .role {
    background: var(--color-header-bg);
  }

  /* Same player column width with or without the per-pitch columns. */
  tbody tr:not(.group-head) td:nth-child(2) {
    min-width: 180px;
  }
}

/* Narrow phones (360px): tighter number padding so the table fits. */
@media (max-width: 380px) {
  .condensed td.num,
  .condensed th.num {
    padding-left: 3px;
    padding-right: 3px;
  }
}
</style>
