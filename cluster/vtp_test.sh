#!/bin/bash
# ---------------------------------------------------------------------------
# vtp_test.sh - find the vtp export setting that actually writes day-40 data.
# Makes 2 copies of the smallest game run (ShStBaFe_Drought):
#   vtptestA: outputTimes "39, 40"   (2 export moments, documented mechanism)
#   vtptestB: factory default        (daily export, known to work in the pilot)
# and submits both as 1-task jobs.
# Run:   cd ~/final_study && bash vtp_test.sh
# ---------------------------------------------------------------------------
set -e
cd ~/final_study

for t in vtptestA vtptestB; do
  rm -rf $t
  cp -r runs_game64/ShStBaFe_Drought $t
  ( cd $t && rm -f roots* run.log warnings.txt tabled_output.tab coringData* *.pvd *.wrl 2>/dev/null; exit 0 )
done

# A: swap the broken startTime-40 line for an outputTimes list
sed -i 's|<SimulaConstant name="startTime" type="time"> 40.</SimulaConstant>|<SimulaConstant name="outputTimes" type="string">39, 40</SimulaConstant>|' \
  vtptestA/plantParameters/Maize/Maize/simulationControlParameters.xml

# B: delete the broken line entirely -> back to factory default (daily export)
sed -i '\|^<SimulaConstant name="startTime" type="time"> 40.</SimulaConstant>$|d' \
  vtptestB/plantParameters/Maize/Maize/simulationControlParameters.xml

echo "== vtptestA vtp block =="
grep -B1 -A5 '<SimulaBase name="vtp">' vtptestA/plantParameters/Maize/Maize/simulationControlParameters.xml
echo "== vtptestB vtp block =="
grep -B1 -A5 '<SimulaBase name="vtp">' vtptestB/plantParameters/Maize/Maize/simulationControlParameters.xml

sbatch --job-name=vtpA --partition=general --cpus-per-task=1 --mem=16G --time=06:00:00 \
  --wrap="module load opensimroot/v_Jun_17_2026 && cd ~/final_study/vtptestA && opensimroot runMaize.xml > run.log 2>&1"
sbatch --job-name=vtpB --partition=general --cpus-per-task=1 --mem=16G --time=06:00:00 \
  --wrap="module load opensimroot/v_Jun_17_2026 && cd ~/final_study/vtptestB && opensimroot runMaize.xml > run.log 2>&1"
echo "Both tests submitted. Check later with:"
echo "  ls -s --block-size=1K ~/final_study/vtptest*/roots040.00.vtp"
