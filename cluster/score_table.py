#!/usr/bin/env python3
"""Build the Root Architect scoring table from the 64 tabled_output.tab files.
Outputs game_scores.json (combo x env -> grams + normalized 0-100 score)
and prints the sanity report (winners per env, per-card effects)."""
import os, json, collections

BASE = r"C:/Users/amool/Desktop/RootGames/cluster/game64_results"
ENVS = ["Perfect", "Drought", "LowN", "LowP"]

def day40_shootDW(folder):
    best_t, val = -1.0, None
    with open(os.path.join(folder, "tabled_output.tab"), encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3: continue
            name = parts[0].strip().strip('"').strip()
            if name != "shootDryWeight": continue
            try:
                t = float(parts[1].strip().strip('"'))
                v = float(parts[2].strip().strip('"'))
            except ValueError:
                continue
            if t > best_t:
                best_t, val = t, v
    return best_t, val

runs = {}
for d in sorted(os.listdir(BASE)):
    p = os.path.join(BASE, d)
    if not os.path.isdir(p): continue
    combo, env = d.rsplit("_", 1)
    t, v = day40_shootDW(p)
    runs[(combo, env)] = v
    if v is None: print("!! no shootDryWeight in", d)

combos = sorted({c for c, e in runs})
print(f"{len(combos)} combos x {len(ENVS)} envs = {len(runs)} runs parsed\n")

# score table
best = {e: max(runs[(c, e)] for c in combos) for e in ENVS}
worst = {e: min(runs[(c, e)] for c in combos) for e in ENVS}
print(f"{'combo':10s}" + "".join(f"{e:>16s}" for e in ENVS))
for c in combos:
    row = f"{c:10s}"
    for e in ENVS:
        g = runs[(c, e)]
        s = 100.0 * g / best[e]
        row += f"{g:8.2f}g {s:5.1f}"
    print(row)

print("\nWINNER per environment:")
for e in ENVS:
    w = max(combos, key=lambda c: runs[(c, e)])
    l = min(combos, key=lambda c: runs[(c, e)])
    print(f"  {e:8s}: best {w} ({best[e]:.2f} g)   worst {l} ({worst[e]:.2f} g)   spread {100*worst[e]/best[e]:.0f}-100 pts")

# per-card average effect per env (long-option mean minus short-option mean)
CARDS = [("Depth", "De", "Sh"), ("Speed", "Fa", "St"), ("Hairs", "Fz", "Ba"), ("Nodal", "Ma", "Fe")]
print("\nCARD EFFECT (avg grams: first option minus second, per env):")
print(f"{'card':18s}" + "".join(f"{e:>10s}" for e in ENVS))
for name, a, b in CARDS:
    row = f"{name:5s} {a} vs {b}     "
    for e in ENVS:
        ga = sum(runs[(c, e)] for c in combos if a in c) / 8
        gb = sum(runs[(c, e)] for c in combos if b in c) / 8
        row += f"{ga-gb:+10.2f}"
    print(row)

# save for the game
out = {"envs": ENVS,
       "grams": {f"{c}_{e}": round(runs[(c, e)], 3) for c in combos for e in ENVS},
       "best": {e: round(best[e], 3) for e in ENVS}}
with open(os.path.join(os.path.dirname(BASE), "game_scores.json"), "w") as f:
    json.dump(out, f, indent=1)
print("\nwrote game_scores.json")
