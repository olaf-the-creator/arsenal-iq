"""Build the Location+ map summary from Baseball Savant's Statcast pitches.

Downloads each profile pitcher's regular-season pitches, then writes
data/wsn_location_summary.json: binned aggregates, never per-pitch rows, shaped
like what a backend would return. The app rolls the partitions up to
the selected pitch, count and batter hand and smooths the cells for display.

One object per pitcher:
  pitcher, season, game_type   MLBAM ID, season, "R" (regular season)
  model_version                "synthetic-poc": the values are invented (below)
  grid                         x0, z0 (ft, catcher's view, plate center = 0),
                               cell_ft, nx, nz; pitches outside it go in the
                               edge cells
  partitions                   one per Savant pitch_type x stand x balls x
                               strikes that he threw:
    n                          pitches (real)
    sz_top, sz_bot             mean batter strike zone, ft (real)
    location_plus              mean Location+ (SYNTHETIC)
    cells                      [i, j, n, location_plus] for each non-empty
                               cell; i from x0 rightward, j from z0 upward

Locations, counts, hands and zones are real. Statcast has no per-pitch
Location+, so each pitch is scored with a seeded, invented count-aware value
surface plus noise, and each pitch type is shifted so its mean matches the real
FanGraphs season Location+ for that pitch (wsn_fg_locationplus.json). Pitches
whose Savant type isn't in the arsenal (one CS, slow curve) are left out.
Replace with R&D's scored pitches or grids.

Re-runnable (needs network). Usage (from poc/): python3 scripts/build_location_summary.py
"""
import csv
import io
import json
import math
import random
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'data'
OUT = DATA / 'wsn_location_summary.json'
SEASON = 2026
PITCHERS = ['676917']  # MLBAMIDs with a profile page: Cade Cavalli
SEARCH = 'https://baseballsavant.mlb.com/statcast_search/csv'
GRID = {'x0': -1.75, 'z0': 0.5, 'cell_ft': 0.25, 'nx': 14, 'nz': 16}
ZONE_HALF_WIDTH = 0.83  # plate half-width plus a ball's radius, ft
SEED = 2026


def fetch(mlbam_id):
    query = urllib.parse.urlencode({
        'all': 'true', 'type': 'details', 'player_type': 'pitcher',
        'hfGT': 'R|', 'hfSea': f'{SEASON}|', 'pitchers_lookup[]': mlbam_id,
    })
    req = urllib.request.Request(f'{SEARCH}?{query}', headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        text = resp.read().decode('utf-8-sig')
    rows = [r for r in csv.DictReader(io.StringIO(text)) if r['pitch_type'] and r['plate_x'] and r['plate_z']]
    rows.sort(key=lambda r: (r['game_date'], int(r['game_pk']), int(r['at_bat_number']), int(r['pitch_number'])))
    return rows


def surface(x, z, sz_top, sz_bot, balls, strikes):
    """Invented value surface against the batter's own zone: edges beat the
    heart and far misses lose. With two strikes, just-off-the-plate chase spots
    gain; with three balls, strikes gain and misses cost more."""
    in_zone = abs(x) <= ZONE_HALF_WIDTH and sz_bot <= z <= sz_top
    third = (sz_top - sz_bot) / 3
    heart = abs(x) < 0.45 and sz_bot + third < z < sz_top - third
    out = math.hypot(max(abs(x) - ZONE_HALF_WIDTH, 0), max(sz_bot - z, 0, z - sz_top))
    v = 100
    if heart:
        v -= 6
    elif in_zone:
        v += 4
    else:
        v += 3 if out < 0.45 else -7 * out
    if strikes == 2:
        v += -4 if heart else 5 if not in_zone and out < 0.6 else 0
    if balls == 3:
        v += 5 if in_zone else -5
    return v


def cell(v, lo, n):
    return min(max(math.floor((v - lo) / GRID['cell_ft']), 0), n - 1)


def summarize(mlbam_id, arsenal, loc_plus, rand):
    types = {a['SavantType']: a['PitchType'] for a in arsenal if a['MLBAMID'] == mlbam_id}
    overall = loc_plus.get('Location+') or 100
    pitches = []
    for r in fetch(mlbam_id):
        if r['pitch_type'] not in types:
            continue
        p = {
            'type': r['pitch_type'], 'stand': r['stand'], 'balls': int(r['balls']), 'strikes': int(r['strikes']),
            'x': float(r['plate_x']), 'z': float(r['plate_z']),
            'sz_top': float(r['sz_top']), 'sz_bot': float(r['sz_bot']),
        }
        p['value'] = surface(p['x'], p['z'], p['sz_top'], p['sz_bot'], p['balls'], p['strikes']) + rand.gauss(0, 6)
        pitches.append(p)

    # Anchor each pitch type's mean to its real season Location+.
    for savant, fg in types.items():
        own = [p for p in pitches if p['type'] == savant]
        target = loc_plus.get(f'Loc+ {fg}') or overall
        shift = target - sum(p['value'] for p in own) / (len(own) or 1)
        for p in own:
            p['value'] += shift

    groups = defaultdict(list)
    for p in pitches:
        groups[(p['type'], p['stand'], p['balls'], p['strikes'])].append(p)
    partitions = []
    for (ptype, stand, balls, strikes), rows in sorted(groups.items()):
        cells = defaultdict(list)
        for p in rows:
            cells[(cell(p['x'], GRID['x0'], GRID['nx']), cell(p['z'], GRID['z0'], GRID['nz']))].append(p['value'])
        n = len(rows)
        partitions.append({
            'pitch_type': ptype, 'stand': stand, 'balls': balls, 'strikes': strikes, 'n': n,
            'sz_top': round(sum(p['sz_top'] for p in rows) / n, 3),
            'sz_bot': round(sum(p['sz_bot'] for p in rows) / n, 3),
            'location_plus': round(sum(p['value'] for p in rows) / n, 2),
            'cells': [[i, j, len(v), round(sum(v) / len(v), 1)] for (i, j), v in sorted(cells.items())],
        })
    return {
        'pitcher': mlbam_id, 'season': SEASON, 'game_type': 'R', 'model_version': 'synthetic-poc',
        'grid': GRID, 'partitions': partitions,
    }


def main():
    arsenal = json.loads((DATA / 'wsn_savant_arsenal.json').read_text())
    loc_records = {r['MLBAMID']: r for r in json.loads((DATA / 'wsn_fg_locationplus.json').read_text())}
    rand = random.Random(SEED)
    summaries = [summarize(m, arsenal, loc_records.get(m, {}), rand) for m in PITCHERS]
    OUT.write_text(compact_partitions(summaries) + '\n')
    total = sum(p['n'] for s in summaries for p in s['partitions'])
    print(f'{OUT.name}: {total} pitches, {sum(len(s["partitions"]) for s in summaries)} partitions, {OUT.stat().st_size:,} bytes')


def compact_partitions(summaries):
    """Indented JSON, but each partition on a single line."""
    lines = ['[']
    for si, s in enumerate(summaries):
        head = {k: v for k, v in s.items() if k != 'partitions'}
        body = json.dumps(head, indent=2)[:-2]  # drop the closing "\n}"
        lines.append('  ' + body.replace('\n', '\n  ') + ',')
        lines.append('    "partitions": [')
        parts = [json.dumps(p, separators=(', ', ': ')) for p in s['partitions']]
        lines.append(',\n'.join(f'      {p}' for p in parts))
        lines.append('    ]')
        lines.append('  }' + (',' if si < len(summaries) - 1 else ''))
    lines.append(']')
    return '\n'.join(lines)


if __name__ == '__main__':
    main()
