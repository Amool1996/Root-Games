#!/usr/bin/env python3
"""
genscores6.py — builds ra-data/scores.js for ROOT GAME (6 trait cards, 64 designs x 4 weathers).

These biomass numbers are HAND-CRAFTED for teaching, not OpenSimRoot output. The real 64-run
OSR study showed Perfect ~ Drought ~ LowN playing almost identically, which makes a boring game,
so the model below exaggerates the real trade-offs until each weather has its own winning root.

MODEL:  biomass = FLOOR[env] + sum(BONUS[trait][env] for each trait the player picked)
A bonus can be negative, which means that choice is a WASTE in that weather.

Every weather has a different champion, and each neighbouring weather differs by exactly one card:
  Perfect  Shallow Speedy Smooth Skinny Bushy  Airy   "good year - build cheap, don't over-invest"
  Drought  Deep    Speedy Fuzzy  Skinny Sparse Airy   "dig deep, skip side roots in dry topsoil"
  LowN     Deep    Speedy Fuzzy  Skinny Bushy  Airy   "dig deep AND branch - nitrogen moves"
  LowP     Shallow Speedy Fuzzy  Skinny Bushy  Airy   "stay up top and go fuzzy - P is stuck there"

Run from the RootGames folder:  python cluster/genscores6.py
Then bump the ?v= number on the scores.js <script> tag in root-architect.html.
"""
import json, math, os

ENVS = ["Perfect", "Drought", "LowN", "LowP"]

# the 6 cards; first code is the "hero" side the bonus is written for
CARDS = [
    ("depth", "De", "Sh"),
    ("speed", "Fa", "St"),
    ("hairs", "Fz", "Ba"),
    ("thick", "Sk", "Th"),
    ("bush",  "Bu", "Sp"),
    ("air",   "Ai", "So"),
]

#              Perfect Drought  LowN   LowP
FLOOR = {"Perfect": 21.0, "Drought": 5.0, "LowN": 2.5, "LowP": 5.0}

BONUS = {
    # Deep instead of Shallow: pointless in a good year, everything in drought/lowN, costly in lowP
    "De": {"Perfect": -1.5, "Drought": 13.0, "LowN": 9.5, "LowP": -6.0},
    # Speedy instead of Steady: mild help everywhere
    "Fa": {"Perfect":  3.0, "Drought":  2.0, "LowN":  2.0, "LowP":  1.0},
    # Fuzzy instead of Smooth: hairs cost carbon when nutrients are easy, decisive for phosphorus
    "Fz": {"Perfect": -1.0, "Drought":  1.5, "LowN":  3.0, "LowP":  9.0},
    # Skinny instead of Thick: cheap roots go further under any stress
    "Sk": {"Perfect":  1.0, "Drought":  3.0, "LowN":  2.0, "LowP":  2.0},
    # Bushy instead of Sparse: side roots in dry topsoil are wasted carbon, but catch moving nitrate
    "Bu": {"Perfect":  2.0, "Drought": -3.5, "LowN":  5.0, "LowP":  4.0},
    # Airy instead of Solid: aerenchyma makes the root cheaper to run
    "Ai": {"Perfect":  1.0, "Drought":  2.0, "LowN":  2.0, "LowP":  2.0},
}

MIN_G = 1.5   # nobody harvests a negative plant


def jitter(combo, env):
    """deterministic +-0.35 g so grams look measured, and ties break"""
    h = 0
    for ch in combo + "_" + env:
        h = (h * 131 + ord(ch)) % 100003
    return (h / 100003.0 - 0.5) * 0.7


def biomass(picks, env):
    g = FLOOR[env] + sum(BONUS[p][env] for p in picks if p in BONUS)
    return max(MIN_G, g)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, os.pardir, "ra-data", "scores.js")

    grams, best = {}, {}
    combos = []

    def walk(i, acc):
        if i == len(CARDS):
            combos.append(list(acc))
            return
        _, a, b = CARDS[i]
        walk(i + 1, acc + [a])
        walk(i + 1, acc + [b])
    walk(0, [])

    for picks in combos:
        combo = "".join(picks)
        for env in ENVS:
            g = round(biomass(picks, env) + jitter(combo, env), 1)
            g = max(MIN_G, g)
            grams[combo + "_" + env] = g
            if g > best.get(env, 0):
                best[env] = g

    data = {"envs": ENVS, "grams": grams, "best": best}
    with open(out, "w", encoding="utf-8") as f:
        f.write("window.RA_SCORES=" + json.dumps(data, separators=(",", ":")) + ";\n")

    # ---- report ----
    name = {"De": "Deep", "Sh": "Shallow", "Fa": "Speedy", "St": "Steady", "Fz": "Fuzzy",
            "Ba": "Smooth", "Sk": "Skinny", "Th": "Thick", "Bu": "Bushy", "Sp": "Sparse",
            "Ai": "Airy", "So": "Solid"}

    def pretty(c):
        return " ".join(name[c[i:i + 2]] for i in range(0, len(c), 2))

    print("wrote", os.path.normpath(out), "-", len(grams), "entries\n")
    champs = {}
    for env in ENVS:
        rows = sorted(((v, k.split("_")[0]) for k, v in grams.items()
                       if k.endswith("_" + env)), reverse=True)
        champs[env] = rows[0][1]
        print("%-8s champion %5.1f g  %s" % (env, rows[0][0], pretty(rows[0][1])))
        print("%-8s worst    %5.1f g  %s   (spread %.1fx)\n"
              % ("", rows[-1][0], pretty(rows[-1][1]), rows[0][0] / rows[-1][0]))
    uniq = len(set(champs.values()))
    print("distinct champions:", uniq, "of 4", "OK" if uniq == 4 else "<-- FIX")
    top = max(ENVS, key=lambda e: max(v for k, v in grams.items() if k.endswith("_" + e)))
    print("biggest plant grows in:", top, "OK" if top == "Perfect" else "<-- FIX")


if __name__ == "__main__":
    main()
