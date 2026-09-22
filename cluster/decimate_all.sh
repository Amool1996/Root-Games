#!/bin/bash
# ---------------------------------------------------------------------------
# decimate_all.sh - shrink each game run's day-40 vtp (~60-150MB) into a
# compact root3d.json (~2MB) with decimate_vtp.py, then bundle all results
# (biomass tables + root geometries) into ONE download: ~/game64_bundle.tar.gz
#
# PREREQUISITES in ~/final_study/: decimate_vtp.py  runs_game64/ (64 complete)
# Submit:   cd ~/final_study && sbatch decimate_all.sh
# Watch:    tail -f ~/final_study/decimate_*.out
# ---------------------------------------------------------------------------
#SBATCH --job-name=decimate
#SBATCH --partition=general
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --time=04:00:00
#SBATCH --output=decimate_%j.out

set -e
RUNS=~/final_study/runs_game64
cd "$RUNS"

echo "vtp files found: $(ls */roots040.00.vtp 2>/dev/null | wc -l)  (expected 64)"

n=0
for d in */; do
  d="${d%/}"
  if [ -f "$d/roots040.00.vtp" ]; then
    python3 ~/final_study/decimate_vtp.py "$d/roots040.00.vtp" "$d/root3d.json" 40
    n=$((n+1))
  else
    echo "MISSING vtp: $d"
  fi
done
echo "decimated: $n"
echo "json files written: $(ls */root3d.json 2>/dev/null | wc -l)  (expected 64)"

tar czf ~/game64_bundle.tar.gz */tabled_output.tab */root3d.json
ls -sh ~/game64_bundle.tar.gz
echo "DONE - download ~/game64_bundle.tar.gz to the laptop"
