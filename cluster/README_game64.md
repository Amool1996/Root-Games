# CAFNR "Root Architect" game — 64 cluster runs

16 root designs × 4 environments, seed 7777. Every game score will be a real
OSR simulation result from these runs.

**Design codes** (folder names are code_environment, e.g. `DeFaFzMa_Drought`):

| Slot | Long option | Short option |
|---|---|---|
| Depth | `De` Deep (steep angles) | `Sh` Shallow |
| Speed | `Fa` Fast (5.5 cm/day) | `St` Steady (3.5) |
| Hairs | `Fz` Fuzzy (0.1 cm) | `Ba` Bald (0.005) |
| Nodal roots | `Ma` Many (6/8/10/12 per whorl) | `Fe` Few (1/2/2/3) |

Environments: `Perfect` (HighN, watered) · `Drought` (HighN, DR) · `LowN`
(low N, watered) · `LowP` (HighN, watered, soil P 18e-3 → 2e-3 uMol/ml).

## Steps (from the laptop)

1. Upload the 3 files to the cluster (run from this folder in Git Bash / scp):

```bash
scp game64_recipe.csv build_game64.sh run_array_game64.sh YOUR-USERNAME@hellbender.rnet.missouri.edu:~/final_study/
```

2. On the cluster (Open OnDemand shell or terminal):

```bash
cd ~/final_study && bash build_game64.sh
```

   Check the spot-check lines at the end — all 9 must print a value.

3. Submit:

```bash
cd ~/final_study && mkdir -p logs && sbatch run_array_game64.sh
```

4. Progress check (climbs to 64):

```bash
cat ~/final_study/runs_game64/*/run.log 2>/dev/null | grep -c "Simulation took"
```

5. When done, bundle and download:

```bash
cd ~/final_study/runs_game64 && tar czf ~/game64_results.tar.gz */tabled_output.tab
```

then from the laptop: `scp YOUR-USERNAME@hellbender.rnet.missouri.edu:~/game64_results.tar.gz ~/Desktop/RootGames/cluster/`

## After download

Claude will run the sanity pass in R (does each environment have a different
winner? does every trait card move the score somewhere?) and build the
`combo × env → biomass` lookup table for the game.
