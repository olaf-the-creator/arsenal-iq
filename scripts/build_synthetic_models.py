"""Write data/wsn_synthetic_models.json: the SYNTHETIC model outputs Mentat AI
needs that no provided source has.

Everything in the output is invented and labeled `model_version:
synthetic-poc`. Where a real anchor exists, the synthetic values are pinned to
it, so they stay consistent with the real data the profile shows:

  stuff_sensitivity   Stuff+ change per +1 mph, +1" IVB and +1" HB (toward the
                      glove side), plus a curvature penalty. Taken from the
                      author's mock ("mock sensitivities"). Stands in for R&D
                      running the model on hypothetical inputs.
  league_reference    An illustrative league-average four-seam shape for the
                      movement plot.
  season_history      Prior-season Stuff+ / Location+ / Pitching+ and pitch
                      counts, from the author's mock. 2026 is not here: it
                      comes from the real FanGraphs file.
  start_pitching_plus One Pitching+ per 2026 start (data/wsn_savant_gamelog.json),
                      seeded noise around a strikeout-rate trend, shifted so
                      the IP-weighted mean equals the real season Pitching+.
  stuff_decay         "Stuff Decay+", a hypothetical future model: Stuff+ by
                      pitch-count bucket within a start, per pitch type, shifted
                      so each pitch's pitch-weighted mean equals its real
                      season Stuff+.

Re-runnable and deterministic (fixed seeds).
Usage (from poc/): python3 scripts/build_synthetic_models.py
"""
import json
import random
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'data'
PLAYER_ID = '27473'  # Cade Cavalli (FanGraphs)
MLBAM_ID = '676917'

# Keyed by FanGraphs pitch code (SL = the sweeper Savant calls ST).
SENSITIVITY = {
    'FA': {'velo': 2.8, 'ivb': 1.7, 'hb': -0.5},
    'SI': {'velo': 2.4, 'ivb': -1.0, 'hb': -1.1},
    'FC': {'velo': 2.0, 'ivb': 0.7, 'hb': 0.6},
    'KC': {'velo': 1.6, 'ivb': -1.3, 'hb': 0.5},
    'SL': {'velo': 1.4, 'ivb': -0.4, 'hb': 1.5},
    'CH': {'velo': -1.2, 'ivb': -1.9, 'hb': -0.9},
}
CURVATURE = 0.08  # Stuff+ lost per square inch of total shape change

LEAGUE_FF = {'ivb': 15.6, 'hb': -7.0}

SEASON_HISTORY = [
    {'season': 2022, 'pitches': 99, 'stuff_plus': 101, 'location_plus': 96, 'pitching_plus': 97},
    {'season': 2025, 'pitches': 788, 'stuff_plus': 103, 'location_plus': 99, 'pitching_plus': 99},
]

# Stuff Decay+ buckets and the share of a start's pitches in each.
BUCKETS = ['1-25', '26-50', '51-75', '76-100', '101+']
BUCKET_SHARE = [0.27, 0.26, 0.24, 0.18, 0.05]
# Shape of the decay by pitch group, in Stuff+ points (before anchoring).
DECAY_SHAPE = {
    'FA': [1.6, 0.9, 0.0, -1.8, -3.9],
    'SI': [1.3, 0.8, 0.0, -1.5, -3.2],
    'FC': [0.9, 0.5, 0.0, -1.0, -2.2],
    'KC': [0.2, 0.3, 0.1, -0.2, -0.6],
    'SL': [0.5, 0.4, 0.0, -0.6, -1.4],
    'CH': [-0.4, 0.0, 0.3, 0.2, -0.3],
}


def innings(ip):
    whole, _, outs = ip.partition('.')
    return int(whole) + int(outs or 0) / 3


def main():
    stats = next(r for r in json.loads((DATA / 'wsn_fg_stuffplus.json').read_text()) if r['PlayerId'] == PLAYER_ID)
    starts = [r for r in json.loads((DATA / 'wsn_savant_gamelog.json').read_text()) if r['PlayerId'] == PLAYER_ID]

    # Per-start Pitching+, anchored to the real season value (IP-weighted).
    rng = random.Random(99)
    raw = []
    for i, s in enumerate(starts):
        ip = innings(s['IP'])
        so9 = s['SO'] * 9 / max(ip, 1)
        trend = 2.5 if i >= 20 else 1.0 if i >= 13 else 0.0
        raw.append(97.5 + trend + 0.4 * max(-6, min(8, so9 - 9)) + rng.gauss(0, 2.0))
    ips = [innings(s['IP']) for s in starts]
    offset = stats['Pitching+'] - sum(v * w for v, w in zip(raw, ips)) / sum(ips)
    start_pp = [{'date': s['Date'], 'pitching_plus': round(v + offset, 1)} for s, v in zip(starts, raw)]

    # Stuff Decay+, anchored to each pitch's real season Stuff+.
    rng = random.Random(7)
    decay = {}
    for code, shape in DECAY_SHAPE.items():
        season = stats[f'Stf+ {code}']
        vals = [v + rng.gauss(0, 0.35) for v in shape]
        mean = sum(v * w for v, w in zip(vals, BUCKET_SHARE))
        decay[code] = [round(season + v - mean, 1) for v in vals]

    out = {
        'pitcher': MLBAM_ID,
        'player_id': PLAYER_ID,
        'season': 2026,
        'model_version': 'synthetic-poc',
        'note': 'Synthetic values for the Mentat AI demo. Not model output; see scripts/build_synthetic_models.py.',
        'stuff_sensitivity': {'per_unit': SENSITIVITY, 'curvature': CURVATURE},
        'league_reference': {'FA': LEAGUE_FF},
        'season_history': SEASON_HISTORY,
        'start_pitching_plus': start_pp,
        'stuff_decay': {'buckets': BUCKETS, 'bucket_share': BUCKET_SHARE, 'by_pitch': decay},
    }
    (DATA / 'wsn_synthetic_models.json').write_text(json.dumps(out, indent=2) + '\n')


if __name__ == '__main__':
    main()
