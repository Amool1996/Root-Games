#!/bin/bash
# ---------------------------------------------------------------------------
# pilot_extreme.sh - 8-run test of EXTREME game values (traits + weather)
# before committing to a full 64 rebuild. Answers:
#   - do extreme weathers make big biomass differences?  (runs 1-4)
#   - does the re-done Depth card (strong gravitropism) work?  (runs 5-6)
#   - does extreme Speed swing biomass?  (runs 7-8)
# Builds a MID (all-default) plant and changes only the tested knob + weather.
#
# PREREQUISITES in ~/final_study/: Reference/  decimate_vtp.py
#   + atmosphere_ZERORAIN.xml  nitrate_ZERON.xml  phosphorus_ZEROP.xml  nitrate_HIGHN.xml
# Run:   cd ~/final_study && bash pilot_extreme.sh
# ---------------------------------------------------------------------------
set -e
cd ~/final_study
mkdir -p pilot
REF=~/final_study/Reference

mk(){ rm -rf pilot/$1; cp -r "$REF" pilot/$1; }
MZ(){ echo pilot/$1/plantParameters/Maize/Maize; }
EN(){ echo pilot/$1/environments/WageningseBovenBuurt; }

setenv(){ # $1 name  $2 weather
  local en; en=$(EN $1)
  case "$2" in
    Perfect)  cp ~/final_study/nitrate_HIGHN.xml $en/nitrate.xml ;;
    ZERORAIN) cp ~/final_study/atmosphere_ZERORAIN.xml $en/atmosphere.xml; cp ~/final_study/nitrate_HIGHN.xml $en/nitrate.xml ;;
    ZERON)    cp ~/final_study/nitrate_ZERON.xml $en/nitrate.xml ;;
    ZEROP)    cp ~/final_study/phosphorus_ZEROP.xml $en/phosphorus.xml; cp ~/final_study/nitrate_HIGHN.xml $en/nitrate.xml ;;
  esac
}
speed(){ sed -i "s/\\b4\\.5\\b/$2/g" "$(MZ $1)/growthrates.xml"; }
deepX(){ local a; a=$(MZ $1)/angles.xml
  sed -i 's|minimum="-0.035"|minimum="-0.09"|; s|maximum="-0.025"|maximum="-0.07"|' $a
  sed -i 's|minimum="-0.015"|minimum="-0.09"|; s|maximum="-0.005"|maximum="-0.06"|' $a
  sed -i 's|minimum="-0.01"|minimum="-0.06"|g; s|maximum="-0.005"|maximum="-0.04"|g' $a; }
shallowX(){ local a; a=$(MZ $1)/angles.xml
  sed -i 's|minimum="-0.035"|minimum="-0.002"|; s|maximum="-0.025"|maximum="-0.001"|' $a
  sed -i 's|minimum="-0.015"|minimum="-0.003"|; s|maximum="-0.005"|maximum="-0.001"|' $a
  sed -i 's|minimum="-0.01"|minimum="-0.001"|g; s|maximum="-0.005"|maximum="-0.0005"|g' $a
  sed -i 's|160 <!--stem|90 <!--stem|; s|150 <!--stem|90 <!--stem|; s|140 <!--stem|90 <!--stem|; s|130 <!--stem|90 <!--stem|' $a; }

# seed + no 3D-daily control handled by runner
mk p1_midPerfect;   setenv p1_midPerfect  Perfect
mk p2_midZERORAIN;  setenv p2_midZERORAIN ZERORAIN
mk p3_midZERON;     setenv p3_midZERON    ZERON
mk p4_midZEROP;     setenv p4_midZEROP    ZEROP
mk p5_deepZERORAIN; setenv p5_deepZERORAIN ZERORAIN; deepX p5_deepZERORAIN
mk p6_shalZERORAIN; setenv p6_shalZERORAIN ZERORAIN; shallowX p6_shalZERORAIN
mk p7_fastPerfect;  setenv p7_fastPerfect Perfect;  speed p7_fastPerfect 7.0
mk p8_slowPerfect;  setenv p8_slowPerfect Perfect;  speed p8_slowPerfect 2.0

echo "---- checks (each > 0) ----"
grep -c 'minimum="-0.09"' "$(MZ p5_deepZERORAIN)/angles.xml"
grep -c 'minimum="-0.001"' "$(MZ p6_shalZERORAIN)/angles.xml"
grep -c '0 7.0 ' "$(MZ p7_fastPerfect)/growthrates.xml"
grep -c '0 2.0 ' "$(MZ p8_slowPerfect)/growthrates.xml"
grep -c '0 0 100 0' "$(EN p2_midZERORAIN)/atmosphere.xml"
grep -c '0 0.14 -5 0.12' "$(EN p3_midZERON)/nitrate.xml"
grep -c '0.3e-3' "$(EN p4_midZEROP)/phosphorus.xml"
grep -c '0 100 -5 86' "$(EN p1_midPerfect)/nitrate.xml"

cat > run_array_pilot.sh << 'EOF'
#!/bin/bash
#SBATCH --job-name=pilot8
#SBATCH --array=1-8
#SBATCH --partition=general
#SBATCH --cpus-per-task=1
#SBATCH --mem=24G
#SBATCH --time=24:00:00
#SBATCH --output=logs/%x_%A_%a.out
module load opensimroot/v_Jun_17_2026
RUNS=~/final_study/pilot
mapfile -t DIRS < <(ls -1 "$RUNS")
DIR="${DIRS[$((SLURM_ARRAY_TASK_ID-1))]}"
cd "$RUNS/$DIR"
if [ -f run.log ] && grep -q "Simulation took" run.log; then echo "SKIP $DIR"; exit 0; fi
echo "START $DIR $(date)"
opensimroot runMaize.xml > run.log 2>&1
ls -S roots0*.vtp 2>/dev/null | tail -n +2 | xargs -r rm -f
f=$(ls -S roots0*.vtp 2>/dev/null | head -1)
[ -n "$f" ] && { t=$(basename "$f" .vtp); t=${t#roots}; python3 ~/final_study/decimate_vtp.py "$f" root3d.json "$t"; }
echo "DONE $DIR $(date)"
EOF
mkdir -p logs
sbatch run_array_pilot.sh
echo "8 extreme-value pilot runs submitted."
echo "when done: cd ~/final_study/pilot && tar czf ~/pilot_bundle.tar.gz */tabled_output.tab */root3d.json"
