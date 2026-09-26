#!/usr/bin/env node
/* Install narration clips downloaded from a voice tool into ra-data/voice/.
 *
 *   node cluster/install_voice.js ~/Downloads/rooty          # a folder of clips
 *   node cluster/install_voice.js ~/Downloads/rooty --booth  # only the 8 booth pages were made
 *   node cluster/install_voice.js ~/Downloads/rooty --dry    # show the mapping, change nothing
 *
 * The clips are matched to pages BY THE ORDER THEY WERE CREATED, because tools
 * like SoundTools name their downloads whatever they like. Generate them in the
 * order the paste sheet lists and this lands correctly; the --dry run prints the
 * mapping with each clip's length so you can check before anything is written.
 *
 * Any input format ffmpeg understands works (wav, webm, m4a, mp3...).
 *
 * With --booth, the 7 full-story pages that were not recorded are left exactly as
 * they are, so they keep whatever voice is already installed. That matters: the
 * game sets voiceFiles=false the first time a file is MISSING, and every page
 * after that falls back to the computer's built-in voice. A complete set of 15 is
 * what keeps the story consistent.
 */
const fs = require("fs"), cp = require("child_process"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), OUT = path.join(ROOT, "ra-data", "voice");

const args = process.argv.slice(2);
const dir  = args.find(a => !a.startsWith("--"));
const DRY  = args.includes("--dry");
const BOOTH= args.includes("--booth");
if (!dir) { console.error("usage: node cluster/install_voice.js <folder> [--booth] [--dry]"); process.exit(1); }

const sh = c => cp.execSync(c, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
const q  = s => "'" + String(s).replace(/'/g, "'\\''") + "'";

/* ---- the pages, in the order the paste sheet lists them ---- */
const src = fs.readFileSync(path.join(ROOT, "root-architect.html"), "utf8");
const at = src.indexOf("const INTRO=[");
let i = src.indexOf("[", at), d = 0, end = -1;
for (let k = i; k < src.length; k++) { const c = src[k];
  if (c === "[") d++; else if (c === "]") { if (--d === 0) { end = k + 1; break; } } }
const INTRO = eval(src.slice(i, end));
const ALL   = INTRO.map(s => ({ id: s.id, short: !!s.short,
  words: ((s.short && s.sayS && s.sayS.length) ? s.sayS : s.say).join(" ").split(/\s+/).length }));
const PAGES = BOOTH ? ALL.filter(p => p.short) : ALL;

/* ---- the clips, oldest first ---- */
const AUDIO = /\.(wav|mp3|webm|m4a|aac|ogg|opus|flac|aiff?|mp4)$/i;
const clips = fs.readdirSync(dir).filter(f => AUDIO.test(f))
  .map(f => ({ f, p: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => a.t - b.t);

if (!clips.length) { console.error("No audio files found in " + dir); process.exit(1); }

/* If the files are already named after their page (p01.webm, p09.wav...), trust that
   over creation order — it survives re-recording one take, and ignores unrelated audio
   sitting in the same folder. The voice booth names its downloads this way. */
const IDS = new Set(ALL.map(p => p.id));
const byName = new Map();
clips.forEach(c => {
  const m = path.basename(c.f).toLowerCase().match(/\bp(\d{2})\b/);
  if (!m) return;
  const id = "p" + m[1];
  if (!IDS.has(id)) return;
  const prev = byName.get(id);
  if (!prev || c.t > prev.t) byName.set(id, c);   // a later re-record of the same page wins
});
const NAMED = byName.size >= Math.min(3, PAGES.length);
if (NAMED) {
  console.log(`matching BY FILENAME (${byName.size} of ${clips.length} clips name a page)`);
  const ignored = clips.length - byName.size;
  if (ignored) console.log(`  ignoring ${ignored} file${ignored>1?"s":""} that name no page\n`);
  else console.log("");
} else {
  console.log("matching BY CREATION ORDER (filenames do not name pages)\n");
}

console.log(`${clips.length} clip${clips.length > 1 ? "s" : ""} in ${dir}`);
console.log(`${PAGES.length} page${PAGES.length > 1 ? "s" : ""} to fill${BOOTH ? " (booth cut only)" : ""}\n`);

if (!NAMED && clips.length !== PAGES.length) {
  console.log(`!! ${clips.length} clips but ${PAGES.length} pages.`);
  console.log(`   Mapping the first ${Math.min(clips.length, PAGES.length)} in order — check the table below carefully.`);
  if (!BOOTH && clips.length === ALL.filter(p => p.short).length)
    console.log(`   (Looks like you recorded just the booth cut — rerun with --booth)`);
  console.log("");
}

const dur = f => { try { return parseFloat(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${q(f)}`)); } catch (e) { return NaN; } };
/* how much of the clip is actually speech, ignoring silence at either end —
   judging a take by its raw length punishes a slow finger on the stop button */
const speechDur = f => {
  try {
    const out = sh(`ffmpeg -hide_banner -i ${q(f)} -af "silencedetect=noise=-38dB:d=0.4" -f null /dev/null 2>&1`);
    const total = dur(f);
    let lead = 0, tail = 0;
    const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
    const ends   = [...out.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
    if (ends.length && starts.length && starts[0] < 0.25) lead = ends[0];
    if (starts.length && Math.abs(starts[starts.length-1] + 0) < total) {
      const lastStart = starts[starts.length-1];
      const lastEnd = ends.length === starts.length ? ends[ends.length-1] : total;
      if (lastEnd >= total - 0.15) tail = total - lastStart;
    }
    const sp = total - lead - tail;
    return isFinite(sp) && sp > 0 ? sp : total;
  } catch (e) { return dur(f); }
};

console.log("page  clip                      raw   speech  expect");
let warn = 0;
const plan = [];
const targets = NAMED ? PAGES.filter(pg => byName.has(pg.id))
                      : PAGES.slice(0, Math.min(clips.length, PAGES.length));
targets.forEach((pg, n) => {
  const c = NAMED ? byName.get(pg.id) : clips[n];
  const len = dur(c.p), sp = speechDur(c.p);
  const exp = pg.words / 2.4;                       // ~150 wpm reading pace
  const off = sp / exp;                             // judge the SPEECH, not the tail
  let flag = "";
  if (!isFinite(len))      { flag = "<- unreadable"; warn++; }
  else if (off < 0.55)     { flag = "<- too SHORT, likely cut off"; warn++; }
  else if (off > 2.2)      { flag = "<- very long, check it"; warn++; }
  else if (len - sp > 1.5) { flag = `<- ${(len-sp).toFixed(1)}s of silence, will be trimmed`; }
  console.log(`${pg.id}${pg.short ? "*" : " "}  ${c.f.slice(0, 22).padEnd(22)}  ${(isFinite(len) ? len.toFixed(1)+"s" : " ? ").padStart(6)}  ${sp.toFixed(1).padStart(5)}s  ${exp.toFixed(1).padStart(5)}s  ${flag}`);
  plan.push({ pg, clip: c });
});
console.log("\n* = a booth page (played by the short cut kids actually see)");
if (warn) console.log(`\n${warn} clip${warn > 1 ? "s" : ""} look off against the expected reading time — likely a mis-ordered or truncated take.`);

if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

/* ---- convert + install ---- */
console.log("\ninstalling...");
fs.mkdirSync(OUT, { recursive: true });
const bak = path.join(OUT, "_replaced");
plan.forEach(({ pg, clip }) => {
  const dest = path.join(OUT, pg.id + ".mp3");
  if (fs.existsSync(dest)) {                        // never destroy what is already there
    fs.mkdirSync(bak, { recursive: true });
    fs.copyFileSync(dest, path.join(bak, pg.id + ".mp3"));
  }
  /* Trim the silence off both ends before anything else. A recording where the
     reader did not hit stop promptly leaves the picture sitting in silence: the
     story turns the page on the audio ENDING, not on a timer. Then pad a short
     breath back so the last word is not clipped. */
  sh(`ffmpeg -y -loglevel error -i ${q(clip.p)} ` +
     `-af "highpass=f=70,` +
     // Front: a soft onset (the h in "Hi", an intake of breath) sits below -40 dB and
     // gets eaten, chopping the first consonant. Use a much lower threshold, keep a
     // third of a second, and put 120 ms of true silence back in front regardless.
     `silenceremove=start_periods=1:start_silence=0.35:start_threshold=-55dB,` +
     `adelay=120,` +
     // Tail: this is the one that matters — dead air here stalls the page turn.
     `areverse,silenceremove=start_periods=1:start_silence=0.35:start_threshold=-45dB,areverse,` +
     `apad=pad_dur=0.3,` +
     `loudnorm=I=-16:TP=-1.5:LRA=11" ` +
     `-ac 1 -ar 22050 -codec:a libmp3lame -b:a 96k ${q(dest)}`);
  const was = dur(clip.p), now = dur(dest);
  const cut = (isFinite(was) && isFinite(now)) ? was - now : NaN;
  console.log(`  ${pg.id}.mp3  <-  ${clip.f.padEnd(24)} ${now.toFixed(1)}s` +
              (isFinite(cut) && cut > 0.5 ? `   (trimmed ${cut.toFixed(1)}s of silence)` : ""));
});

const missing = ALL.filter(p => !fs.existsSync(path.join(OUT, p.id + ".mp3")));
console.log(`\n${ALL.length - missing.length}/${ALL.length} pages present.`);
if (missing.length) {
  console.log(`MISSING: ${missing.map(p => p.id).join(" ")}`);
  console.log(`The game gives up on recordings at the first missing file, so fill these`);
  console.log(`(node cluster/make_voice.js "<voice>") before the booth.`);
} else {
  console.log("Complete set — the story will use these on every machine.");
}
if (fs.existsSync(bak)) console.log(`\nPrevious versions kept in ${path.relative(ROOT, bak)}/`);
