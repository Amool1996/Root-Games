#!/usr/bin/env node
/* Generate Rooty's narration as mp3 files from a voice installed on this Mac.
 *
 *   node cluster/make_voice.js                      # default voice
 *   node cluster/make_voice.js "Grandma (English (US))"
 *   node cluster/make_voice.js "Samantha" 165        # voice + words-per-minute
 *
 * Writes ra-data/voice/p01.mp3 ... p15.mp3.  The game plays those instead of the
 * computer's built-in voice, which also makes the narration identical on every
 * machine — the booth laptop no longer depends on Windows' "Zira".
 *
 * IMPORTANT: it always writes ALL 15 pages. The game gives up on recordings the
 * first time one is missing (voiceFiles=false in root-architect.html), so a
 * partial set silently sends the rest of the story back to the built-in voice.
 *
 * The script is read out of root-architect.html itself, so the audio can never
 * drift from the captions on screen. macOS only — it uses `say`. Needs ffmpeg.
 */
const fs=require("fs"), cp=require("child_process"), path=require("path");
const ROOT=path.resolve(__dirname,".."), OUT=path.join(ROOT,"ra-data","voice");
const VOICE=process.argv[2]||"Sandy (English (US))";
const RATE =process.argv[3]||"150";          // words per minute; the built-in voice ran slow on purpose
const GAP  =0.42;                            // seconds between sentences (matches NARR_GAP=430 ms)
const LEAD =0.25, TAIL=0.40;                 // a breath before and after, so nothing clips

const sh=(c)=>cp.execSync(c,{stdio:["ignore","pipe","pipe"]}).toString();
const q=(s)=>"'"+String(s).replace(/'/g,"'\\''")+"'";

/* ---- pull the script out of the game ---- */
const src=fs.readFileSync(path.join(ROOT,"root-architect.html"),"utf8");
const at=src.indexOf("const INTRO=[");
if(at<0){ console.error("Could not find INTRO in root-architect.html"); process.exit(1); }
let i=src.indexOf("[",at), d=0, end=-1;
for(let k=i;k<src.length;k++){ const c=src[k];
  if(c==="[") d++; else if(c==="]"){ if(--d===0){ end=k+1; break; } } }
const INTRO=eval(src.slice(i,end));
const PAGES=INTRO.map(s=>({ id:s.id, short:!!s.short,
  lines:(s.short&&s.sayS&&s.sayS.length)?s.sayS:s.say }));

fs.mkdirSync(OUT,{recursive:true});
const tmp=fs.mkdtempSync("/tmp/rooty-");
const sil=(sec,f)=>sh(`ffmpeg -y -loglevel error -f lavfi -i anullsrc=r=22050:cl=mono -t ${sec} -c:a pcm_s16be -f aiff ${q(f)}`);
sil(GAP , path.join(tmp,"gap.aiff"));
sil(LEAD, path.join(tmp,"lead.aiff"));
sil(TAIL, path.join(tmp,"tail.aiff"));

console.log(`voice: ${VOICE}   rate: ${RATE} wpm   -> ${path.relative(ROOT,OUT)}/\n`);
let total=0;
PAGES.forEach(p=>{
  const parts=[path.join(tmp,"lead.aiff")];
  p.lines.forEach((line,n)=>{
    const f=path.join(tmp,`${p.id}_${n}.aiff`);
    sh(`say -v ${q(VOICE)} -r ${RATE} --data-format=BEI16@22050 -o ${q(f)} ${q(line)}`);
    parts.push(f);
    if(n<p.lines.length-1) parts.push(path.join(tmp,"gap.aiff"));
  });
  parts.push(path.join(tmp,"tail.aiff"));
  const list=path.join(tmp,`${p.id}.txt`);
  fs.writeFileSync(list, parts.map(f=>`file '${f}'`).join("\n"));
  const mp3=path.join(OUT,`${p.id}.mp3`);
  sh(`ffmpeg -y -loglevel error -f concat -safe 0 -i ${q(list)} -ac 1 -ar 22050 -codec:a libmp3lame -b:a 96k ${q(mp3)}`);
  const dur=parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${q(mp3)}`));
  total+=dur;
  console.log(`  ${p.id}${p.short?" [booth]":"        "}  ${dur.toFixed(1).padStart(5)}s  ${p.lines.length} sentence${p.lines.length>1?"s":""}`);
});
const booth=PAGES.filter(p=>p.short).length;
console.log(`\n${PAGES.length} files, ${total.toFixed(0)}s of narration in total.`);
console.log(`The booth plays the ${booth} short-cut pages; the rest are the full story.`);
fs.rmSync(tmp,{recursive:true,force:true});
