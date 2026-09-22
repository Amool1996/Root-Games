#!/bin/bash
# ---------------------------------------------------------------------------
# run_array_game64.sh - run the 64 CAFNR game simulations.
# Skip-guard: finished runs are skipped, so re-submitting after an
# interruption (or a hung run) is always safe.
# Submit:   cd ~/final_study && mkdir -p logs && sbatch run_array_game64.sh
# ---------------------------------------------------------------------------
#SBATCH --job-name=game64
#SBATCH --array=1-64
#SBATCH --partition=general
#SBATCH --cpus-per-task=1
#SBATCH --mem=12G
#SBATCH --time=08:00:00
#SBATCH --output=logs/%x_%A_%a.out

module load opensimroot/v_Jun_17_2026

RUNS=~/final_study/runs_game64
mapfile -t DIRS < <(ls -1 "$RUNS")
DIR="${DIRS[$((SLURM_ARRAY_TASK_ID-1))]}"
if [ -z "$DIR" ]; then echo "No folder for task $SLURM_ARRAY_TASK_ID"; exit 0; fi

cd "$RUNS/$DIR"

# --- skip if already finished ---
if [ -f run.log ] && grep -q "Simulation took" run.log; then
  echo "SKIP $DIR (already complete)"; exit 0
fi

echo "START $DIR  on $(hostname)  $(date)"
opensimroot runMaize.xml > run.log 2>&1
echo "DONE  $DIR  $(date)"
