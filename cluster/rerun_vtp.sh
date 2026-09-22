#!/bin/bash
# ---------------------------------------------------------------------------
# rerun_vtp.sh - ONE script that fixes the 3D-export problem and reruns.
# 1) backs up the 64 finished biomass tables to ~/game64_tables_backup.tar.gz
# 2) removes the broken export line from all 64 run folders (back to the
#    factory daily-export setting that test vtptestB just PROVED works)
# 3) resubmits all 64 runs; each run keeps only its final day-40 3D file
#    and deletes the 40 daily ones, so disk stays under control.
# Run:   cd ~/final_study && bash rerun_vtp.sh
# ---------------------------------------------------------------------------
set -e
cd ~/final_study

# 0) safety net: back up the finished score tables
( cd runs_game64 && tar czf ~/game64_tables_backup.tar.gz */tabled_output.tab )
echo "score tables backed up to ~/game64_tables_backup.tar.gz"

# 1) revert the vtp export to the proven factory setting + clear old outputs
for d in runs_game64/*/; do
  sed -i '\|^<SimulaConstant name="startTime" type="time"> 40.</SimulaConstant>$|d' \
    "$d/plantParameters/Maize/Maize/simulationControlParameters.xml"
  rm -f "$d"run.log "$d"roots* "$d"*.pvd
done
echo "all 64 folders reset with working export settings"

# 2) write the runner (with per-run cleanup) and submit
cat > run_array_vtp.sh << 'EOF'
#!/bin/bash
#SBATCH --job-name=game64vtp
#SBATCH --array=1-64%24
#SBATCH --partition=general
#SBATCH --cpus-per-task=1
#SBATCH --mem=24G
#SBATCH --time=24:00:00
#SBATCH --output=logs/%x_%A_%a.out
module load opensimroot/v_Jun_17_2026
RUNS=~/final_study/runs_game64
mapfile -t DIRS < <(ls -1 "$RUNS")
DIR="${DIRS[$((SLURM_ARRAY_TASK_ID-1))]}"
cd "$RUNS/$DIR"
if [ -f run.log ] && grep -q "Simulation took" run.log; then echo "SKIP $DIR"; exit 0; fi
echo "START $DIR $(date)"
opensimroot runMaize.xml > run.log 2>&1
# keep only the final day-40 3D file; delete the daily ones (saves ~1 GB/run)
find . -maxdepth 1 -name "roots0*.vtp" ! -name "roots040.00.vtp" -delete
echo "DONE $DIR $(date)"
EOF
mkdir -p logs
sbatch run_array_vtp.sh
echo "----"
echo "64 runs resubmitted (max 24 at a time). Check progress with:"
echo "  cat ~/final_study/runs_game64/*/run.log 2>/dev/null | grep -c 'Simulation took'"
