"""Add 20-80 grade and Rank fields to data/wsn_fg_stuffplus.json.

Every grade follows: grade = 50 + 10 * z, rounded to the nearest
5 and clamped to 20-80. Means and SDs are the primer's (illustrative, A-11):

  Grade (Pitching)  z = (Pitching+ - 100) / role SD   SP 4.94,  RP 6.61
  Stuff Grade       z = (Stuff+ - 100) / role SD      SP 12.16, RP 17.02
  Location Grade    z = (Location+ - 100) / role SD   SP 3.34,  RP 5.87
  Stf Grade <type>  z = (Stf+ <type> - type mean) / type SD, from the primer's
                    pitch-type Stuff+ table (pitch level, not role-specific).
                    FA uses the primer's FF row; FO has no primer row and gets
                    no grade. Blank when the pitch isn't thrown.

Role comes from the roster's Depth (Rotation = SP, Bullpen = RP).

Rank is assigned separately within Rotation and Bullpen: Grade descending,
then innings pitched descending (more IP wins a tie), then raw
Pitching+ so every pitcher gets a distinct rank.

Re-runnable: existing grade and Rank fields are recomputed in place, appended
after the provided fields (blank = null).
Usage (from poc/): python3 scripts/add_pitching_grades.py
"""
import json
import math
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'data'
STATS = DATA / 'wsn_fg_stuffplus.json'
ROSTER = DATA / 'wsn_mlb_pitchers.json'

# Pitcher-level SDs by role (primer).
ROLE_SD = {
    'Grade': ('Pitching+', {'Rotation': 4.94, 'Bullpen': 6.61}),
    'Stuff Grade': ('Stuff+', {'Rotation': 12.16, 'Bullpen': 17.02}),
    'Location Grade': ('Location+', {'Rotation': 3.34, 'Bullpen': 5.87}),
}
ROLES = ('Rotation', 'Bullpen')

# Pitch-type Stuff+ (mean, SD) at the pitch level (primer). FA = FF.
PITCH_STUFF = {
    'FA': (99.2, 18.3), 'SI': (92.5, 13.6), 'FC': (102.1, 14.0), 'FS': (109.6, 30.2),
    'SL': (110.8, 15.6), 'CU': (105.5, 16.8), 'CH': (87.2, 16.4), 'KC': (110.3, 16.4),
}
PITCH_COLS = [f'Stf Grade {t}' for t in PITCH_STUFF]
DERIVED = ['Grade', 'Rank', 'Stuff Grade', 'Location Grade'] + PITCH_COLS


def to_grade(plus, sd, mean=100):
    raw = 50 + 10 * (plus - mean) / sd
    rounded = math.floor(raw / 5 + 0.5) * 5  # round half up, not banker's
    return max(20, min(80, rounded))


def innings(ip):
    """Baseball IP notation: 15.1 = 15 1/3 innings, 15.2 = 15 2/3."""
    whole, _, outs = ip.partition('.')
    return int(whole) + int(outs or 0) / 3


def main():
    depth = {r['PlayerId']: r['Depth'] for r in json.loads(ROSTER.read_text())}
    rows = [{k: v for k, v in r.items() if k not in DERIVED} for r in json.loads(STATS.read_text())]

    for r in rows:
        role = depth[r['PlayerId']]
        for col, (src, sds) in ROLE_SD.items():
            r[col] = to_grade(r[src], sds[role]) if r[src] is not None else None
        for t, (mean, sd) in PITCH_STUFF.items():
            v = r[f'Stf+ {t}']
            r[f'Stf Grade {t}'] = to_grade(v, sd, mean) if v is not None else None

    for role in ROLES:
        group = [r for r in rows if depth[r['PlayerId']] == role]
        group.sort(key=lambda r: (r['Grade'], innings(r['IP']), r['Pitching+']), reverse=True)
        for i, r in enumerate(group, start=1):
            r['Rank'] = i

    # Re-order so the derived fields follow the provided ones, as before.
    rows = [{**{k: v for k, v in r.items() if k not in DERIVED}, **{k: r[k] for k in DERIVED}} for r in rows]
    STATS.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
