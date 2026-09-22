#!/bin/bash
# ---------------------------------------------------------------------------
# test_tuning.sh - 8-run pilot BEFORE any full rebuild. Tests:
#   DR2   = harsh drought (rain stops completely at day 10)
#   LN2   = harsh low-N (25% of the LP profile)
#   DepthV2 = Depth card re-encoded via gravitropism (angles alone proved dead)
# Uses two existing game combos (DeFaFzMa = deep-fast-fuzzy-many,
# ShFaFzMa = shallow-fast-fuzzy-many) as sources; existing runs are baselines.
#
# PREREQUISITES in ~/final_study/: atmosphere_DR2.xml  nitrate_LowN2.xml
#                                  decimate_vtp.py  runs_game64/
# Run:   cd ~/final_study && bash test_tuning.sh
# ---------------------------------------------------------------------------
set -e
cd ~/final_study
mkdir -p tuning

# folder <- source : grav edit : env swap
build() { # $1 name  $2 source  $3 grav(deep|shallow|no)  $4 env(DR2|LN2|no)
  rm -rf tuning/$1
  cp -r runs_game64/$2 tuning/$1
  ( cd tuning/$1 && rm -f run.log roots* *.pvd tabled_output.tab warnings.txt coringData* root3d.json 2>/dev/null; exit 0 )
  A=tuning/$1/plantParameters/Maize/Maize/angles.xml
  if [ "$3" = "deep" ]; then
    sed -i 's|minimum="-0.01"|minimum="-0.03"|g; s|maximum="-0.005"|maximum="-0.02"|g' $A
  elif [ "$3" = "shallow" ]; then
    sed -i 's|minimum="-0.01"|minimum="-0.001"|g; s|maximum="-0.005"|maximum="-0.0005"|g' $A
    sed -i 's|minimum="-0.035"|minimum="-0.003"|g; s|maximum="-0.025"|maximum="-0.002"|g' $A
  fi
  [ "$4" = "DR2" ] && cp ~/final_study/atmosphere_DR2.xml tuning/$1/environments/WageningseBovenBuurt/atmosphere.xml
  [ "$4" = "LN2" ] && cp ~/final_study/nitrate_LowN2.xml  tuning/$1/environments/WageningseBovenBuurt/nitrate.xml
  echo "built tuning/$1"
}

#      name          source              grav     env
build  tune_DR2_De   DeFaFzMa_Perfect    no       DR2
build  tune_LN2_De   DeFaFzMa_LowN      no       LN2
build  tune_P_DeV2   DeFaFzMa_Perfect    deep     no
build  tune_P_ShV2   ShFaFzMa_Perfect    shallow  no
build  tune_DR2_DeV2 DeFaFzMa_Perfect    deep     DR2
build  tune_DR2_ShV2 ShFaFzMa_Perfect    shallow  DR2
build  tune_LN2_DeV2 DeFaFzMa_LowN      deep     LN2
build  tune_LN2_ShV2 ShFaFzMa_LowN      shallow  LN2

# quick verification of the edits
echo "---- checks (each line must print a number > 0) ----"
grep -c 'minimum="-0.03"'  tuning/tune_P_DeV2/plantParameters/Maize/Maize/angles.xml
grep -c 'minimum="-0.001"' tuning/tune_P_ShV2/plantParameters/Maize/Maize/angles.xml
grep -c '10 0 100 0'       tuning/tune_DR2_De/environments/WageningseBovenBuurt/atmosphere.xml
grep -c '0 0.70 -5 0.59'   tuning/tune_LN2_De/environments/WageningseBovenBuurt/nitrate.xml

cat > run_array_tuning.sh << 'EOF'
#!/bin/bash
#SBATCH --job-name=tune8
#SBATCH --array=1-8
#SBATCH --partition=general
#SBATCH --cpus-per-task=1
#SBATCH --mem=24G
#SBATCH --time=24:00:00
#SBATCH --output=logs/%x_%A_%a.out
module load opensimroot/v_Jun_17_2026
RUNS=~/final_study/tuning
mapfile -t DIRS < <(ls -1 "$RUNS")
DIR="${DIRS[$((SLURM_ARRAY_TASK_ID-1))]}"
cd "$RUNS/$DIR"
if [ -f run.log ] && grep -q "Simulation took" run.log; then echo "SKIP $DIR"; exit 0; fi
echo "START $DIR $(date)"
opensimroot runMaize.xml > run.log 2>&1
# keep the TWO largest 3D files, delete the rest
ls -S roots0*.vtp 2>/dev/null | tail -n +3 | xargs -r rm -f
# convert the largest 3D file for analysis
f=$(ls -S roots0*.vtp 2>/dev/null | head -1)
if [ -n "$f" ]; then t=$(basename "$f" .vtp); t=${t#roots}; python3 ~/final_study/decimate_vtp.py "$f" root3d.json "$t"; fi
echo "DONE $DIR $(date)"
EOF
mkdir -p logs
sbatch run_array_tuning.sh
echo "----"
echo "8 tuning runs submitted. When done (grep -c 'Simulation took' tuning/*/run.log = 8):"
echo "  cd ~/final_study/tuning && tar czf ~/tune_bundle.tar.gz */tabled_output.tab */root3d.json"
echo "then download ~/tune_bundle.tar.gz"
