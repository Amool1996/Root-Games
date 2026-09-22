#!/bin/bash
# ---------------------------------------------------------------------------
# fix_vtp2.sh - rerun ONLY the folders whose day-40 3D file is missing or
# broken. Bulletproofed: the new runner keeps the TWO largest roots*.vtp
# files per run (final + backup), so OSR's flaky final-day export and any
# filename surprises can no longer lose data.
# Run:   cd ~/final_study && bash fix_vtp2.sh
# ---------------------------------------------------------------------------
set -e
cd ~/final_study/runs_game64

n=0
for d in */; do
  d=${d%/}
  # a good 3D file = any roots*.vtp bigger than 1 MB
  best=$(find "$d" -maxdepth 1 -name "roots0*.vtp" -size +1M | head -1)
  if [ -z "$best" ]; then
    rm -f "$d/run.log" "$d"/roots0*.vtp "$d"/root3d.json
    echo "WILL RERUN: $d"
    n=$((n+1))
  fi
done
echo "----"
echo "folders to rerun: $n  (all others keep their good 3D file and are skipped)"

cat > ../run_array_vtp2.sh << 'EOF'
#!/bin/bash
#SBATCH --job-name=vtpfix
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
# keep the TWO largest 3D files, delete the rest (no filename assumptions)
ls -S roots0*.vtp 2>/dev/null | tail -n +3 | xargs -r rm -f
echo "DONE $DIR $(date)"
EOF

cd ~/final_study && mkdir -p logs && sbatch run_array_vtp2.sh
echo "submitted - only the $n broken folders actually rerun; the rest exit in seconds"
