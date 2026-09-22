# 🌽 Amazing Roots! + Root Game — CAFNR Showcase 2026

Browser games that teach kids (K–5) about plant roots, built for the CAFNR Showcase
outreach booth (Division of Plant Science & Technology, University of Missouri — Sidhu Lab).

Two independent, fully offline games live in this repo:

| File | What it is |
|------|------------|
| `amazing-roots-games.html` | **Amazing Roots!** — a 3-game menu: *Grow Your Root!*, *Label the Root!*, *Farm Boss!* (one self-contained file) |
| `root-architect.html` + `ra-data/` | **Root Game** — design a maize root, watch a *real OpenSimRoot simulation* of it grow, beat the weather, top the leaderboard |

## ▶️ How to run (booth mode, no internet)

1. Copy the **whole `RootGames` folder** (the Root Game needs `ra-data/`).
2. Double-click the `.html` file you want, then press **F11** for fullscreen.
3. Works with mouse, keyboard and touchscreens. Leaderboards persist per day in `localStorage`.

## 🎮 Amazing Roots! (3 games)

| Game | What kids learn |
|------|-----------------|
| **Grow Your Root!** | Steer a growing root through soil — dodge rocks, collect water and N-P-K. Roots actively *forage* underground. |
| **Label the Root!** | Drag labels (Skin/epidermis, Sponge/cortex, Water Pipes/xylem, Food Pipes/phloem) onto a maize root cross-section. |
| **Farm Boss!** | Run a farm on a $100 budget from prep to harvest. Pick seeds by *root traits*, survive drought/storms/disease, make a profit. |

## 🌱 Root Game

**The lesson:** there is no single "best" root — a smart root matches the weather.
Deep roots win a **drought** and **low-nitrogen** soil (water and nitrate sit deep);
fuzzy, shallow roots win **low-phosphorus** soil (phosphorus stays in the topsoil).

**Flow:** animated title (Rooty & friends) → *Rooty's Story*, a 10-page grade-2 explainer
(plays before the first game; optional voice) → spin the weather wheel (a real root
cross-section micrograph is the hub; 4 weather sections) → pick **6 trait cards**
(Deep/Shallow · Speedy/Steady · Fuzzy/Smooth · Skinny/Thick · Bushy/Sparse · Airy/Solid)
→ watch the root grow through soil dotted with water / N / P → harvest → score + a lesson
that says which choices helped or hurt → daily leaderboard.

**Scoring (be aware when reading results):**
- The **root you watch grow is real**: OpenSimRoot (OSR) 3-D root geometry from our
  cluster runs, replayed segment-by-segment by simulated birthday (`ra-data/roots/*.js`).
- The **biomass score is a hand-crafted game model** (`cluster/score_table.py` model,
  values in `ra-data/scores.js`), *anchored on* the real 64-run OSR results but amplified
  so every choice visibly matters for a child. Score = your biomass ÷ that weather's
  champion × 100, so all weathers are fair on one leaderboard.
- The real simulated biomass tables are kept for reference in `cluster/game64_results/`.

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
| `score_table.py`, `game_scores.json` | extract day-40 shoot biomass from `tabled_output.tab`; the game's scoring model |
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

## 🛠️ Tech

Plain HTML/CSS/JS + SVG/SMIL animation — no libraries, no build step, no server.
`ra-data/roots/*.js` are lazy-loaded per design; `ra-data/root-hub.png` (root cross-section)
and `ra-data/maize-hero.svg` (title art) are the only images.
Regenerate scores: edit the model in `cluster/score_table.py`, write `ra-data/scores.js`,
and bump the `?v=` on the `<script>` tags in `root-architect.html`.

## 📚 Credits

Sidhu Lab, Division of Plant Science & Technology, University of Missouri.
Simulations: OpenSimRoot (Postma et al., 2017; gitlab.com/rootmodels/OpenSimRoot).
Root cross-section micrograph and phenotype ideas from the lab's own work.
Made with the help of Claude (Anthropic).
