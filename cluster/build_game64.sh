#!/bin/bash
# ---------------------------------------------------------------------------
# build_game64.sh - CAFNR "Root Architect" game simulations
# 16 root designs (Depth x Speed x Hairs x NodalNumber, 2 levels each)
#  x 4 environments (Perfect / Drought / LowN / LowP) = 64 runs, seed 7777.
# Builds into ~/final_study/runs_game64 (does NOT touch runs/ or runs620/).
#
# PREREQUISITES under ~/final_study/:  Reference/  env_variants/  game64_recipe.csv
# Run:   cd ~/final_study && bash build_game64.sh
# ---------------------------------------------------------------------------
set -e
REF=~/final_study/Reference
OUT=~/final_study/runs_game64
ENV=~/final_study/env_variants
CSV=~/final_study/game64_recipe.csv

mkdir -p "$OUT"
echo "Building 64-run game study into $OUT"

tail -n +2 "$CSV" | tr -d '\r' | while IFS=, read -r folder depth speed hairs nodal soilN water soilP seed; do
  [ -z "$folder" ] && continue
  dir="$OUT/$folder"
  rm -rf "$dir"
  cp -r "$REF" "$dir"
  MZ="$dir/plantParameters/Maize/Maize"
  EN="$dir/environments/WageningseBovenBuurt"

  # --- TRAIT 1: rooting DEPTH via branching angles (angles.xml) -------------
  # bigger angle from the upward-growing stem = closer to vertical = deeper.
  # defaults: nodal whorls 160/150/140/130, brace 140/130 (inline), seminal 90
  if [ "$depth" = "Deep" ]; then
    A1=175; A2=165; A3=155; A4=145; AB1=160; AB2=150; AS=130
  else # Shallow
    A1=120; A2=110; A3=100; A4=90;  AB1=110; AB2=100; AS=60
  fi
  # brace roots first (inline values, unique in the file)
  sed -i "s|unit=\"degrees\"> 140|unit=\"degrees\"> $AB1|" "$MZ/angles.xml"
  sed -i "s|unit=\"degrees\"> 130|unit=\"degrees\"> $AB2|" "$MZ/angles.xml"
  # nodal whorls (anchored on their unique comment)
  sed -i "s|160 <!--stem growth up|$A1 <!--stem growth up|" "$MZ/angles.xml"
  sed -i "s|150 <!--stem growth up|$A2 <!--stem growth up|" "$MZ/angles.xml"
  sed -i "s|140 <!--stem growth up|$A3 <!--stem growth up|" "$MZ/angles.xml"
  sed -i "s|130 <!--stem growth up|$A4 <!--stem growth up|" "$MZ/angles.xml"
  # seminal roots (anchored on their unique comment)
  sed -i "s|90 <!--original value: 90 -->|$AS <!--original value: 90 -->|" "$MZ/angles.xml"

  # --- TRAIT 2: root elongation SPEED (growthrates.xml) ---------------------
  # same blanket sed proven in build_all620.sh (peak growthRate 4.5 cm/day)
  if [ "$speed" = "Fast" ]; then E=5.5; else E=3.5; fi
  sed -i "s/\\b4\\.5\\b/$E/g" "$MZ/growthrates.xml"

  # --- TRAIT 3: root HAIRS length (rootHairs.xml) ---------------------------
  # default 0.028 cm; Fuzzy 0.1 cm (Zhu et al 2005: maize hairs 1-4mm), Bald 0.005
  if [ "$hairs" = "Fuzzy" ]; then H=0.1; else H=0.005; fi
  sed -i "s|2 0.028 2000 0.028|2 $H 2000 $H|g" "$MZ/rootHairs.xml"

  # --- TRAIT 4: NODAL root number per whorl (maize.xml) ---------------------
  # defaults 3/4/5/6 (numberOfBranches/whorl AND maxNumberOfBranches per whorl)
  if [ "$nodal" = "Many" ]; then
    N1=6; N2=8; N3=10; N4=12
  else # Few
    N1=1; N2=2; N3=2; N4=3
  fi
  sed -i "/name=\"nodalroots\">/,/<\/SimulaBase>/  s|unit=\"#\"> 3|unit=\"#\"> $N1|" "$MZ/maize.xml"
  sed -i "/name=\"nodalroots2\">/,/<\/SimulaBase>/ s|unit=\"#\"> 4|unit=\"#\"> $N2|" "$MZ/maize.xml"
  sed -i "/name=\"nodalroots3\">/,/<\/SimulaBase>/ s|unit=\"#\"> 5|unit=\"#\"> $N3|" "$MZ/maize.xml"
  sed -i "/name=\"nodalroots4\">/,/<\/SimulaBase>/ s|unit=\"#\"> 6|unit=\"#\"> $N4|" "$MZ/maize.xml"
  # whorl-4 maxNumberOfBranches sits on its own line with a unique comment
  sed -i "s|6 <!--original value: 6-->|$N4 <!--original value: 6-->|" "$MZ/maize.xml"

  # --- environment -----------------------------------------------------------
  [ "$soilN" = "HighN" ] && cp "$ENV/nitrate_HighN.xml" "$EN/nitrate.xml"
  [ "$water" = "DR" ]    && cp "$ENV/atmosphere_DR.xml" "$EN/atmosphere.xml"
  # LowP: soil P 18.e-3 -> 2.e-3 uMol/ml (file's own severe-stress ref is 1.e-3)
  [ "$soilP" = "LowP" ]  && sed -i "s|18\\.e-3|2.e-3|g" "$EN/phosphorus.xml"

  # --- seed -------------------------------------------------------------------
  sed -i "/randomNumberGeneratorSeed/c\\<SimulaConstant name=\"randomNumberGeneratorSeed\" type=\"int\"> $seed </SimulaConstant>" "$MZ/simulationControlParameters.xml"

  # --- 3D output: keep vtp ON but ONLY the final day-40 snapshot --------------
  # (the day-40 file carries rootSegmentAge, so the game can replay full growth)
  sed -i '/<SimulaBase name="vtp">/a <SimulaConstant name="startTime" type="time"> 40.</SimulaConstant>' "$MZ/simulationControlParameters.xml"
  # RSML off (redundant with vtp and 4x larger)
  sed -i '/name="RSML"/,/\/SimulaBase/ s/"bool"> 1</"bool"> 0</' "$MZ/simulationControlParameters.xml"

  echo "  built $folder"
done

echo "----"
echo "Folder count in runs_game64/: $(ls -1 "$OUT" | wc -l)  (expected 64)"

# --- spot checks: one all-long and one all-short design ----------------------
echo "---- spot check DeFaFzMa_Perfect (expect 175 / 5.5 / 0.1 / 6+12) ----"
grep -o "175 <!--stem growth up" "$OUT/DeFaFzMa_Perfect/plantParameters/Maize/Maize/angles.xml" | head -1
grep -o "0 5.5 " "$OUT/DeFaFzMa_Perfect/plantParameters/Maize/Maize/growthrates.xml" | head -1
grep -o "2 0.1 2000 0.1" "$OUT/DeFaFzMa_Perfect/plantParameters/Maize/Maize/rootHairs.xml" | head -1
grep -o "unit=\"#\"> 12" "$OUT/DeFaFzMa_Perfect/plantParameters/Maize/Maize/maize.xml" | head -1
echo "---- spot check ShStBaFe_LowP (expect 120 / 3.5 / 0.005 / 1, P=2.e-3) ----"
grep -o "120 <!--stem growth up" "$OUT/ShStBaFe_LowP/plantParameters/Maize/Maize/angles.xml" | head -1
grep -o "0 3.5 " "$OUT/ShStBaFe_LowP/plantParameters/Maize/Maize/growthrates.xml" | head -1
grep -o "2 0.005 2000 0.005" "$OUT/ShStBaFe_LowP/plantParameters/Maize/Maize/rootHairs.xml" | head -1
grep -o "unit=\"#\"> 1\b" "$OUT/ShStBaFe_LowP/plantParameters/Maize/Maize/maize.xml" | head -1
grep -o "2.e-3" "$OUT/ShStBaFe_LowP/environments/WageningseBovenBuurt/phosphorus.xml" | head -1
echo "---- vtp export check (expect startTime 40 line) ----"
grep -A1 '<SimulaBase name="vtp">' "$OUT/DeFaFzMa_Perfect/plantParameters/Maize/Maize/simulationControlParameters.xml" | grep -o 'startTime" type="time"> 40.'
echo "If any of the 10 lines above is blank, that edit did NOT fire - tell Claude."
