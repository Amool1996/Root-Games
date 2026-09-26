# 🌽 Amazing Roots! + Root Race — CAFNR Showcase 2026

Browser games that teach kids (K–5) about plant roots, built for the CAFNR Showcase
outreach booth (Division of Plant Science & Technology, University of Missouri — Sidhu Lab).

Two independent, fully offline games live in this repo:

| File | What it is |
|------|------------|
| `amazing-roots-games.html` | **Amazing Roots!** — a 3-game menu: *Grow Your Root!*, *Label the Root!*, *Farm Boss!* (one self-contained file) |
| `root-architect.html` + `ra-data/` | **Root Race** — design a maize root, watch it grow beside the champion root, match your field, top the leaderboard |

**Want to change something?** Read [`EDITING.md`](EDITING.md) — it is written for people who
are not programmers and says exactly where each piece lives.

## ▶️ How to run (booth mode, no internet)

1. Copy the **whole `RootGames` folder** (Root Race needs `ra-data/`).
2. **Root Race:** double-click **`Start-Root-Race.bat`** — it opens full screen with the music
   already playing. (Or double-click `root-architect.html` and press **F11**; then the music
   starts on the first tap, via a "TAP TO START" screen.) Quit with **Alt+F4**.
3. **Amazing Roots!:** double-click `amazing-roots-games.html`, press **F11**.
4. Works with mouse, keyboard and touchscreens. Leaderboards persist per day in `localStorage`.

## 📱 On a phone

The game is also published at **https://amool1996.github.io/Root-Games/root-architect.html**
(GitHub Pages; `.github/workflows/pages.yml` republishes the game files on every push to `main`).
The start, Saved and leaderboard screens show a **QR code** for that address, so a visitor can
scan it and play the same game on their phone. The QR card hides itself on narrow screens.
The phone's scores go on that phone's own board; the booth laptop keeps its own board.

## 🎮 Amazing Roots! (3 games)

| Game | What kids learn |
|------|-----------------|
| **Grow Your Root!** | Steer a growing root through soil — dodge rocks, collect water and N-P-K. Roots actively *forage* underground. |
| **Label the Root!** | Drag labels (Skin/epidermis, Sponge/cortex, Water Pipes/xylem, Food Pipes/phloem) onto a maize root cross-section. |
| **Farm Boss!** | Run a farm on a $100 budget from prep to harvest. Pick seeds by *root traits*, survive drought/storms/disease, make a profit. |

## 🌱 Root Race

**The lesson:** there is no single best root — a clever root matches its **field**.

| Field | What is scarce | Winning root |
|-------|----------------|--------------|
| 🌈 Perfect Year | nothing | cheap and simple: shallow, smooth, skinny, bushy, airy |
| ☀️ Drought Year | water (deep) | **deep**, skinny, airy — and *sparse*: side roots in dry topsoil are wasted |
| 🍽️ Hungry Soil (low N) | nitrogen (washes deep) | **deep and bushy** — branch a lot to catch moving nitrate |
| 🪨 Poor Rocky Soil (low P) | phosphorus (stuck at the top) | **shallow and fuzzy** — root hairs where the P is |

Each neighbouring field differs by exactly one card, so a child who plays twice discovers
one new thing rather than being told six.

**Flow:** start screen with today's best scores → PLAY → *Rooty's Story* (a continuous ~80-second
film, every game) → the child types their **name** → spin the **field wheel** (a real root
cross-section micrograph is the hub) → climb **6 steps**, one trait card per step, each option with
its own root avatar (Deep/Shallow · Speedy/Steady · Fuzzy/Smooth · Skinny/Thick · Bushy/Sparse ·
Airy/Solid) → watch **their root and the champion root race side by side** on identical soil, with
live bars showing what each has taken up → harvest → score, a **statistics comparison** (water, N, P
taken, deepest root, amount of root, plant weight) and **a reason for every one of the six cards**
→ save → back to the start, where the board now shows them. The full 3-minute story is offered at
the end, on the leaderboard screen.

**What the simulation screen shows (and what it means):**
- The root geometry is **real OpenSimRoot output** (`ra-data/roots/*.js`, 16 designs, replayed
  segment-by-segment by simulated birthday). Deep/Shallow is stretched, Steady runs on a slower
  clock, Fuzzy draws root hairs, Thick/Skinny changes width, Sparse drops side roots, Airy is
  see-through — so every card is visible in the growth itself.
- A root **drinks exactly what it reaches**. Root hairs reach further for N and P. Whatever the
  root did not get to stays in the soil, pulsing, at harvest — that is the comparison.
- Roots are drawn pale like a washed root and **take on the colour of what they drink**: blue for
  water, yellow-green for nitrogen, red for phosphorus; each uptake sends a wave of colour
  through the whole system.
- The shoot is a **40-day corn plant** (vegetative, ~V8–V10: leaves only, no tassel, no ear). It
  grows bigger and greener when its root feeds it well — and when the root is failing its field it
  shows the real symptom: **purple leaves** (low P), **yellow lower leaves** (low N), **wilting**
  (drought).

**Scoring (be aware when reading results):**
- The **biomass score is a hand-crafted teaching model**, not the simulation's output. It is
  generated by [`cluster/genscores6.py`](cluster/genscores6.py) into `ra-data/scores.js`
  (64 designs × 4 fields). The real 64-run OSR results (`cluster/game64_results/`) showed
  Perfect ≈ Drought ≈ Low-N, which is true and also a dull game, so the model exaggerates the
  real trade-offs until every field has its own champion. Score = your biomass ÷ that field's
  champion × 100, so all fields are fair on one leaderboard.
- The picture (what a root reaches) and the score (the model) are two views of the same design.
  They agree in spirit — a root that reaches more scores more — but not to the gram. The lesson
  text after the harvest gives the exact grams per card.

## 🖥️ Simulation pipeline (`cluster/`)

Everything needed to reproduce the OSR runs on the Mizzou Hellbender cluster
(module `opensimroot/v_Jun_17_2026`, SLURM arrays):

| File | Purpose |
|------|---------|
| `game64_recipe.csv` | 16 root designs × 4 environments = 64 runs (seed 7777) |
| `build_game64.sh` | copies the OSR Reference input tree and edits the trait knobs per run (angles, growth rate, root hairs, nodal roots) + environment files |
| `run_array_game64.sh` | SLURM array runner with a skip-guard for safe resubmits |
| `rerun_vtp.sh`, `fix_vtp2.sh`, `vtp_test.sh` | fixes for OSR's 3-D (vtp) export quirks — see notes below |
| `decimate_vtp.py`, `decimate_all*.sh` | shrink each run's day-40 vtp (60–150 MB) into a compact `root3d.json` the game can animate |
| `score_table.py`, `game_scores.json` | extract day-40 shoot biomass from `tabled_output.tab` (the *real* numbers, for reference) |
| `genscores6.py` | **the game's scoring model** — run it to regenerate `ra-data/scores.js`; it self-checks that the four champions are distinct and the Perfect year grows the biggest plant |
| `atmosphere_*.xml`, `nitrate_*.xml`, `phosphorus_*.xml` | environment variants (drought, low/high N, low P) |
| `test_tuning.sh`, `pilot_extreme.sh` | 8-run pilots used to tune environment/trait strength before batches |
| `game64_results/` | **64 real OSR outputs**: `tabled_output.tab` per run + `root3d.json` geometries |
| `tune_results/` | the tuning-pilot outputs |
| `README_game64.md` | step-by-step cluster instructions |

**Lessons learned (documented so nobody repeats them):** OSR's vtp exporter only writes
data when exporting periodically from day 0 (`startTime`/`outputTimes` set to the final
day silently produce empty files); always pilot 1–8 runs before a 64-run batch; keep the
two largest vtp files per run rather than trusting a filename.

Raw cluster outputs (per-day `.vtp`/`.rsml`, several GB) are **not** in this repo.

## 🎵 Music & sound

Every screen has its own music, synthesized in the browser (no files, works offline): bouncy on the
title, a soft music box under Rooty's Story, carnival oom-pah on the field wheel with ticks and a
fanfare on the spin, rising arpeggios while the roots grow (each drink pops), and a celebration on
the score and leaderboard. Music ducks under the narration. The speaker button (top right) mutes
everything and remembers it. Browsers only allow sound after the first tap, so it starts with the
first touch. To use real tracks, see [`ra-data/music/README.txt`](ra-data/music/README.txt).

## 🔊 Voice

Rooty's Story narrates itself with a female voice built into Windows (Zira). For a real human
voice, record the pages as MP3s into `ra-data/voice/` — see
[`ra-data/voice/README.txt`](ra-data/voice/README.txt) for the script and file names. The eight
pages the short cut uses are listed there; record those and the booth version is covered.

## 🛠️ Tech

Plain HTML/CSS/JS + SVG/SMIL animation — no libraries, no build step, no server.
Everything for Root Race is in one file, `root-architect.html`, plus data in `ra-data/`.
`ra-data/roots/*.js` are lazy-loaded per design; `ra-data/root-hub.png` (root cross-section)
and `ra-data/maize-hero.svg` (title art) are the only images.

## 📚 Credits

Sidhu Lab, Division of Plant Science & Technology, University of Missouri.
Simulations: OpenSimRoot (Postma et al., 2017; gitlab.com/rootmodels/OpenSimRoot).
Root cross-section micrograph and phenotype ideas from the lab's own work.
Made with the help of Claude (Anthropic).
