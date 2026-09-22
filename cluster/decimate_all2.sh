#!/bin/bash
# ---------------------------------------------------------------------------
# decimate_all2.sh - robust version. For each run: picks the LARGEST
# roots*.vtp (whatever its name), converts it to root3d.json, skips runs
# already converted, and one bad file no longer kills the whole job.
# Ends by bundling everything into ~/game64_bundle.tar.gz
# Submit:   cd ~/final_study && sbatch decimate_all2.sh
# ---------------------------------------------------------------------------
#SBATCH --job-name=decimate2
#SBATCH --partition=general
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --time=04:00:00
#SBATCH --output=decimate2_%j.out

cd ~/final_study/runs_game64
ok=0; bad=0
for d in */; do
  d=${d%/}
  if [ -s "$d/root3d.json" ]; then echo "SKIP $d (already converted)"; ok=$((ok+1)); continue; fi
  f=$(ls -S "$d"/roots0*.vtp 2>/dev/null | head -1)
  if [ -z "$f" ]; then echo "NO VTP: $d"; bad=$((bad+1)); continue; fi
  t=$(basename "$f" .vtp); t=${t#roots}
  if python3 ~/final_study/decimate_vtp.py "$f" "$d/root3d.json" "$t"; then
    ok=$((ok+1))
  else
    echo "CONVERT FAILED: $d ($f)"; bad=$((bad+1))
  fi
done
echo "----"
echo "converted or already done: $ok / 64   problems: $bad"
tar czf ~/game64_bundle.tar.gz */tabled_output.tab */root3d.json
ls -sh ~/game64_bundle.tar.gz
echo "DONE - download ~/game64_bundle.tar.gz to the laptop"
