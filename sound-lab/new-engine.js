/* ============================================================================
   Root Race — music & sound, v2
   Same public API as the old module (start/boot/play/duck/toggle/sfx/pop/
   spinTicks/muted) so it drops straight into root-architect.html.

   What changed, and why:
   - Every voice goes through a FILTER. Raw oscillators are what make a page
     sound like a 1980s toy; rolling the top off is most of "playful, not annoying".
   - A LIMITER sits on the output, so the mix can never clip however many
     sounds land on the same beat.
   - A short REVERB puts the notes in a room instead of against your ear.
   - Patterns are FOUR bars with a variation, not two identical ones, and the
     timing and loudness of each note wobble slightly, so it never machine-guns.
   - Each screen has its own INSTRUMENT, key and groove — not just its own tempo.
   - Screens a child may sit on for minutes (title, leaderboard) CALM DOWN by
     themselves after a while instead of nagging.
   ========================================================================== */
const SCENE_MUSIC_V2 = {
  title:"title", intro:"story", who:"who",   after:"party",
  wheel:"wheel", design:"design", sim:"grow", results:"results",
  name:"party",  board:"party"
};

const NewMusic = (()=>{
  const _ = null;
  const N = n => 440*Math.pow(2,(n-69)/12);
  const rnd = (a,b) => a + Math.random()*(b-a);

  let ctx=null, master=null, limiter=null, musicBus=null, musicHP=null, musicLP=null,
      fxBus=null, fxLP=null, mixBus=null, tilt=null, ceiling=null,
      verb=null, verbIn=null, verbOut=null;
  let timer=null, scene=null, pat=null, step=0, nextT=0, pass=0, fileEl=null;
  let ducked=false, switchTok=0, sceneStarted=0, intens=0, intensTarget=0, lastPop=0;
  let muted=false; try{ muted=localStorage.getItem("ra_mute")==="1"; }catch(e){}

  /* ---------------------------------------------------------------- patches
     cut  = how bright (lowpass Hz).  Lower = warmer/softer.
     vol  = lead loudness.  bvol = bass loudness.  wet = how much reverb.
     calm = seconds after which the loop thins out by itself (0 = never).     */
  const P = {
    /* COME AND PLAY — warm marimba, C major pentatonic, bouncy but not frantic */
    title:{ bpm:112, voice:"marimba", cut:2200, vol:.30, bvol:.20, wet:.16,
      groove:"kick", calm:45,
      lead:[60,_,_,67,_,64,_,_, 62,_,64,_,_,_,_,_,
            57,_,_,60,_,62,_,_, 64,_,_,_,_,_,_,_,
            60,_,_,67,_,69,_,_, 67,_,64,_,_,_,_,_,
            62,_,64,_,60,_,57,_, 60,_,_,_,_,_,_,_],
      bass:[36,_,_,_,_,_,36,_, _,_,_,_,43,_,_,_,
            33,_,_,_,_,_,33,_, _,_,_,_,40,_,_,_,
            41,_,_,_,_,_,41,_, _,_,_,_,48,_,_,_,
            43,_,_,_,_,_,43,_, _,_,_,_,43,_,_,_] },

    /* ROOTY'S STORY — music box, very sparse and low, lives under the voice */
    story:{ bpm:76, voice:"musicbox", cut:1900, vol:.16, bvol:.10, wet:.42,
      groove:"none", calm:0,
      lead:[72,_,_,_,_,_,_,_, 67,_,_,_,_,_,_,_,
            69,_,_,_,_,_,_,_, 64,_,_,_,_,_,_,_,
            71,_,_,_,_,_,_,_, 67,_,_,_,_,_,_,_,
            65,_,_,_,_,_,64,_, 60,_,_,_,_,_,_,_],
      bass:[48,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            45,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            41,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            43,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_] },

    /* TYPE YOUR NAME — its own screen at last: a calm pad, almost nothing to
       hear, so a child hunting for letters is not being hurried along */
    who:{ bpm:70, voice:"pad", cut:1100, vol:.16, bvol:.12, wet:.35,
      groove:"none", calm:0,
      lead:[64,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            60,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            62,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            59,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_],
      bass:[45,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            41,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            43,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            40,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_] },

    /* THE FIELD WHEEL — carnival oom-pah, but the square is filtered right
       down so it is jaunty rather than piercing. You are only here ~10 s. */
    wheel:{ bpm:128, voice:"reed", cut:1500, vol:.22, bvol:.22, wet:.14,
      groove:"oompah", calm:0,
      lead:[67,_,64,_,62,_,64,_, 67,_,_,_,_,_,_,_,
            65,_,62,_,60,_,62,_, 65,_,_,_,_,_,_,_,
            67,_,69,_,71,_,69,_, 67,_,64,_,_,_,_,_,
            62,_,64,_,65,_,67,_, 67,_,_,_,_,_,_,_],
      bass:[43,_,_,_,50,_,_,_, 43,_,_,_,50,_,_,_,
            41,_,_,_,48,_,_,_, 41,_,_,_,48,_,_,_,
            36,_,_,_,43,_,_,_, 36,_,_,_,43,_,_,_,
            43,_,_,_,50,_,_,_, 43,_,_,_,50,_,_,_] },

    /* BUILD YOUR ROOT — thinking music. Marimba, A minor pentatonic, unhurried,
       leaves long gaps so six decisions do not feel like a countdown. */
    design:{ bpm:94, voice:"marimba", cut:1700, vol:.24, bvol:.17, wet:.24,
      groove:"shaker", calm:0,
      lead:[57,_,_,_,60,_,_,_, 62,_,_,_,_,_,_,_,
            64,_,_,_,62,_,_,_, 60,_,_,_,_,_,_,_,
            57,_,_,_,55,_,_,_, 57,_,60,_,_,_,_,_,
            62,_,_,_,60,_,_,_, 57,_,_,_,_,_,_,_],
      bass:[33,_,_,_,_,_,_,_, _,_,_,_,40,_,_,_,
            36,_,_,_,_,_,_,_, _,_,_,_,43,_,_,_,
            29,_,_,_,_,_,_,_, _,_,_,_,36,_,_,_,
            31,_,_,_,_,_,_,_, _,_,_,_,38,_,_,_] },

    /* THE RACE — rising bells. This one also LISTENS: intensity() opens the
       filter and brings in a counter-line as the root grows, so day 40 is the
       fullest the music ever gets. That is the clearest "where am I" cue we have. */
    grow:{ bpm:100, voice:"musicbox", cut:1150, vol:.22, bvol:.15, wet:.30,
      groove:"pulse", calm:0, dynamic:true,
      lead:[48,_,52,_,55,_,60,_, 52,_,55,_,60,_,64,_,
            55,_,60,_,64,_,67,_, 60,_,64,_,67,_,72,_,
            71,_,67,_,64,_,60,_, 67,_,64,_,60,_,55,_,
            64,_,60,_,55,_,52,_, 60,_,_,_,_,_,_,_],
      bass:[36,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            41,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            43,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            36,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_] },

    /* YOUR SCORE — no longer the party loop. You are READING here: six reasons
       and a stats table. Warm, resolved, out of the way. */
    results:{ bpm:84, voice:"pad", cut:1300, vol:.19, bvol:.14, wet:.34,
      groove:"none", calm:0,
      lead:[60,_,_,_,_,_,64,_, 67,_,_,_,_,_,_,_,
            65,_,_,_,_,_,62,_, 60,_,_,_,_,_,_,_,
            57,_,_,_,_,_,60,_, 64,_,_,_,_,_,_,_,
            62,_,_,_,_,_,60,_, 60,_,_,_,_,_,_,_],
      bass:[36,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            41,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            33,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_,
            43,_,_,_,_,_,_,_, _,_,_,_,_,_,_,_] },

    /* THE BOARD — celebration, then it settles. A booth leaderboard can sit on
       screen for ten minutes; after 20 s this thins to a gentle version. */
    party:{ bpm:126, voice:"marimba", cut:2400, vol:.30, bvol:.21, wet:.18,
      groove:"kick", calm:20,
      lead:[64,_,67,_,72,_,_,_, 69,_,67,_,64,_,_,_,
            62,_,64,_,67,_,_,_, 69,_,_,_,_,_,_,_,
            64,_,67,_,72,_,_,_, 74,_,72,_,69,_,_,_,
            67,_,69,_,72,_,72,_, 72,_,_,_,_,_,_,_],
      bass:[36,_,_,_,36,_,_,_, 41,_,_,_,41,_,_,_,
            43,_,_,_,43,_,_,_, 36,_,_,_,36,_,_,_,
            41,_,_,_,41,_,_,_, 43,_,_,_,43,_,_,_,
            36,_,_,_,43,_,_,_, 36,_,_,_,_,_,_,_] }
  };

  /* ------------------------------------------------------------------ setup */
  function impulse(sec, decay){
    const rate=ctx.sampleRate, len=Math.floor(rate*sec), b=ctx.createBuffer(2,len,rate);
    for(let c=0;c<2;c++){ const d=b.getChannelData(c);
      for(let i=0;i<len;i++){ const t=i/len; d[i]=(Math.random()*2-1)*Math.pow(1-t,decay); } }
    return b;
  }
  function ensure(){
    if(ctx) return true;
    try{
      ctx = new (window.AudioContext||window.webkitAudioContext)();

      /* limiter last in the chain — nothing downstream of it can clip */
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value=-12; limiter.knee.value=14; limiter.ratio.value=4;
      limiter.attack.value=.004;   limiter.release.value=.18;
      master  = ctx.createGain(); master.gain.value = muted?0:1;
      limiter.connect(master); master.connect(ctx.destination);

      /* a room for everything to sit in */
      verb = ctx.createConvolver(); verb.buffer = impulse(1.7, 2.6);
      verbIn = ctx.createGain(); verbIn.gain.value=1;
      verbOut= ctx.createGain(); verbOut.gain.value=.9;
      verbIn.connect(verb); verb.connect(verbOut);   /* verbOut is wired into mixBus once it exists */

      /* music bus: highpass keeps the bass from turning to mud,
         lowpass is the brightness knob each patch sets */
      musicHP = ctx.createBiquadFilter(); musicHP.type="highpass"; musicHP.frequency.value=110;
      musicLP = ctx.createBiquadFilter(); musicLP.type="lowpass";  musicLP.frequency.value=3000; musicLP.Q.value=.6;
      musicBus= ctx.createGain(); musicBus.gain.value=1;
      musicBus.connect(musicHP); musicHP.connect(musicLP);

      /* one tone-shaping stage that EVERYTHING passes through, music and effects alike:
         a shelf that tips the top down, then a hard ceiling. Nothing in this game can
         reach a child's ear above ~3 kHz however it was synthesized. */
      mixBus  = ctx.createGain(); mixBus.gain.value=1;
      tilt    = ctx.createBiquadFilter(); tilt.type="highshelf"; tilt.frequency.value=1800; tilt.gain.value=-7;
      ceiling = ctx.createBiquadFilter(); ceiling.type="lowpass"; ceiling.frequency.value=3000; ceiling.Q.value=.5;
      mixBus.connect(tilt); tilt.connect(ceiling); ceiling.connect(limiter);
      musicLP.connect(mixBus);

      verbOut.connect(mixBus);
      fxLP  = ctx.createBiquadFilter(); fxLP.type="lowpass"; fxLP.frequency.value=2400; fxLP.Q.value=.6;
      fxBus = ctx.createGain(); fxBus.gain.value=.85; fxBus.connect(fxLP); fxLP.connect(mixBus);
      return true;
    }catch(e){ return false; }
  }
  /* send a voice to the room as well as straight through */
  function wet(node, amount){ if(amount>0){ const s=ctx.createGain(); s.gain.value=amount; node.connect(s); s.connect(verbIn); } }

  /* ----------------------------------------------------------------- voices */
  /* marimba/kalimba — a wooden knock with the brightness dying away fast */
  function marimba(t,midi,dur,vol,dest,w){
    const f=N(midi);
    const o=ctx.createOscillator(); o.type="triangle"; o.frequency.value=f;
    const o2=ctx.createOscillator(); o2.type="sine"; o2.frequency.value=f*2.01;
    const g2=ctx.createGain(); g2.gain.value=.09; o2.connect(g2);
    const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.Q.value=1.2;
    lp.frequency.setValueAtTime(Math.min(f*3.2,2600),t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f*1.25,180),t+Math.min(dur,.28));
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.006);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(lp); g2.connect(lp); lp.connect(g); g.connect(dest); wet(g,w);
    o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur+.05);
  }
  /* music box — fundamental plus its twelfth, long shimmering tail */
  function musicbox(t,midi,dur,vol,dest,w){
    const f=N(midi);
    [[1,1],[2.99,.08]].forEach(([mul,amp])=>{
      const o=ctx.createOscillator(); o.type="sine"; o.frequency.value=f*mul;
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(vol*amp,t+.008);
      g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g); g.connect(dest); wet(g,w*amp);
      o.start(t); o.stop(t+dur+.05);
    });
  }
  /* carnival reed — a square, but filtered hard so it is jaunty not piercing */
  function reed(t,midi,dur,vol,dest,w){
    const f=N(midi);
    const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=f*2.4; lp.Q.value=1.3;
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.02);
    g.gain.setValueAtTime(vol,t+dur*.6);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    [-7,7].forEach(cents=>{
      const o=ctx.createOscillator(); o.type="square"; o.frequency.value=f; o.detune.value=cents;
      const a=ctx.createGain(); a.gain.value=.5; o.connect(a); a.connect(lp);
      o.start(t); o.stop(t+dur+.05);
    });
    lp.connect(g); g.connect(dest); wet(g,w);
  }
  /* pad — two saws, slow in, very dark. Background only. */
  function pad(t,midi,dur,vol,dest,w){
    const f=N(midi);
    const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=f*2.2; lp.Q.value=.8;
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.35);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    [-9,9].forEach(cents=>{
      const o=ctx.createOscillator(); o.type="sawtooth"; o.frequency.value=f; o.detune.value=cents;
      const a=ctx.createGain(); a.gain.value=.4; o.connect(a); a.connect(lp);
      o.start(t); o.stop(t+dur+.1);
    });
    lp.connect(g); g.connect(dest); wet(g,w);
  }
  const VOICE = { marimba, musicbox, reed, pad };

  /* bass — sine with a little triangle, filtered low so it never fights the tune */
  function sub(t,midi,dur,vol,dest){
    const f=N(midi);
    const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=320; lp.Q.value=.7;
    const o=ctx.createOscillator(); o.type="sine"; o.frequency.value=f;
    const o2=ctx.createOscillator(); o2.type="triangle"; o2.frequency.value=f;
    const a2=ctx.createGain(); a2.gain.value=.28; o2.connect(a2);
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.02);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(lp); a2.connect(lp); lp.connect(g); g.connect(dest);
    o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur+.05);
  }
  function noise(t,dur,hz,q,vol,dest){
    const n=Math.floor(ctx.sampleRate*dur), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=ctx.createBufferSource(); s.buffer=b;
    const f=ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=hz; f.Q.value=q;
    const g=ctx.createGain(); g.gain.value=vol;
    s.connect(f); f.connect(g); g.connect(dest); s.start(t);
  }
  function kick(t,vol,dest){
    const o=ctx.createOscillator(); o.type="sine";
    o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(42,t+.11);
    const g=ctx.createGain();
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.006);
    g.gain.exponentialRampToValueAtTime(.0001,t+.16);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t+.2);
  }

  /* --------------------------------------------------------------- sequencer */
  function calmFactor(){
    if(!pat || !pat.calm) return 1;
    const on=(ctx.currentTime-sceneStarted);
    return on < pat.calm ? 1 : Math.max(.45, 1 - (on-pat.calm)/60);   // thins out, never silent
  }
  function playStep(i,t){
    const spb=60/pat.bpm/4, cf=calmFactor(), v=VOICE[pat.voice]||marimba;
    const m=pat.lead[i], b=pat.bass[i];
    const hum = ()=>t + rnd(-.006,.006);                    // nothing lands exactly on the grid
    const vel = ()=>rnd(.88,1.06);

    if(m!=null){
      const long = pat.voice==="pad" ? spb*14 : pat.voice==="musicbox" ? spb*9 : spb*3.4;
      v(hum(), m, long, pat.vol*cf*vel(), musicBus, pat.wet);
      /* the race gets a counter-line once the root is really going */
      if(pat.dynamic && intens>.55 && i%8===0)
        v(hum(), m+7, spb*6, pat.vol*.26*cf, musicBus, pat.wet*1.3);
    }
    if(b!=null) sub(hum(), b, spb*3.2, pat.bvol*cf, musicBus);

    /* groove — sparse on purpose. The old engine put a hat on every odd 16th. */
    if(pat.groove==="kick"   && i%8===0)            kick(t,.32*cf,musicBus);
    if(pat.groove==="kick"   && i%8===4)            noise(t,.06,1500,1.1,.020*cf,musicBus);
    if(pat.groove==="oompah" && i%4===2)            noise(t,.05,1300,1.0,.024*cf,musicBus);
    if(pat.groove==="shaker" && i%8===4)            noise(t,.06,1600,.9,.014*cf,musicBus);
    if(pat.groove==="pulse"  && i%16===0)           kick(t,.20*cf,musicBus);
  }
  function tick(){
    if(!ctx||!pat) return;
    const spb=60/pat.bpm/4;
    while(nextT < ctx.currentTime+.35){
      playStep(step%64, nextT);
      step++; if(step%64===0) pass++;
      nextT += spb;
    }
    if(pat.dynamic){                                  // ease the race filter toward its target
      intens += (intensTarget-intens)*.08;
      musicLP.frequency.setTargetAtTime(pat.cut + intens*1250, ctx.currentTime, .3);
    }
  }
  function stopLoop(){ if(timer){ clearInterval(timer); timer=null; } pat=null;
    if(fileEl){ try{ fileEl.pause(); }catch(e){} fileEl=null; } }
  function startPattern(name){
    pat = P[name]||P.title; step=0; pass=0; sceneStarted=ctx.currentTime;
    nextT = ctx.currentTime+.06;
    musicLP.frequency.setTargetAtTime(pat.cut, ctx.currentTime, .12);
    timer = setInterval(tick,60); tick();
  }
  function level(){ if(scene==="story") return ducked?.10:.42; return ducked?.22:1; }

  function play(name){
    if(name===scene) return; scene=name;
    if(!ctx) return;
    if(ctx.state==="suspended") ctx.resume();
    const tok=++switchTok, now=ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value,now);
    musicBus.gain.linearRampToValueAtTime(.0001,now+.14);
    setTimeout(()=>{
      if(tok!==switchTok) return;
      stopLoop();
      const t2=ctx.currentTime;
      musicBus.gain.cancelScheduledValues(t2);
      musicBus.gain.setValueAtTime(.0001,t2);
      musicBus.gain.linearRampToValueAtTime(level(),t2+.4);
      const files=window.RA_MUSIC||{};
      if(files[name]){
        fileEl=new Audio("ra-data/music/"+files[name]); fileEl.loop=true;
        fileEl.volume=muted?0:(ducked?.15:.55);
        fileEl.play().catch(()=>{ fileEl=null; startPattern(name); }); return;
      }
      startPattern(name);
    },160);
  }

  /* ------------------------------------------------------------------- sfx */
  function sfx(kind){
    if(!ctx||muted) return; const t=ctx.currentTime;
    if(kind==="click")        marimba(t,69,.30,.24,fxBus,.12);
    else if(kind==="tick"){   noise(t,.04,1200,1.2,.10,fxBus); marimba(t,57,.10,.06,fxBus,0); }
    else if(kind==="fanfare"){
      [60,64,67,72].forEach((n,i)=> marimba(t+i*.085,n,.5,.30,fxBus,.28));
      [64,67,72].forEach(n=> musicbox(t+.40,n,1.5,.16,fxBus,.5));
    }
    else if(kind==="chime")   [67,71,74].forEach((n,i)=> musicbox(t+i*.05,n,1.4,.18,fxBus,.5));
    else if(kind==="pop"){
      const o=ctx.createOscillator(); o.type="sine";
      const lp=ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=700;
      o.frequency.setValueAtTime(rnd(200,250),t);
      o.frequency.exponentialRampToValueAtTime(rnd(350,420),t+.07);
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.16,t+.008);
      g.gain.exponentialRampToValueAtTime(.0001,t+.12);
      o.connect(lp); lp.connect(g); g.connect(fxBus); wet(g,.2);
      o.start(t); o.stop(t+.15);
    }
    else if(kind==="count")   noise(t,.035,1400,1.1,.035,fxBus);
  }
  function pop(){ const now=performance.now(); if(now-lastPop<70) return; lastPop=now; sfx("pop"); }
  function spinTicks(ms){ if(!ctx) return; let t=0,gap=45;
    const go2=()=>{ if(t>=ms) return; sfx("tick"); gap*=1.055; t+=gap; setTimeout(go2,gap); }; go2(); }

  /* ------------------------------------------------------------------- api */
  function boot(){ ensure(); const sp=document.getElementById("tapSplash");
    if(ctx && ctx.state==="running"){ start(); if(sp) sp.style.display="none"; }
    else if(sp) sp.style.display="flex"; }
  function start(){ if(!ensure()) return; if(ctx.state==="suspended") ctx.resume();
    const sp=document.getElementById("tapSplash"); if(sp) sp.style.display="none";
    if(scene && !pat && !fileEl){ const s=scene; scene=null; play(s); } }
  function duck(on){ ducked=on; if(!ctx) return;
    musicBus.gain.setTargetAtTime(level(),ctx.currentTime,.25);
    if(fileEl) fileEl.volume=muted?0:(on?.15:.55); }
  function toggle(){ muted=!muted; try{ localStorage.setItem("ra_mute",muted?"1":"0"); }catch(e){}
    if(ctx) master.gain.setTargetAtTime(muted?0:1,ctx.currentTime,.05);
    if(fileEl) fileEl.volume=muted?0:.55;
    const b=document.getElementById("muteBtn"); if(b) b.textContent=muted?"🔇":"🔊"; }
  /* the race screen calls this 0 -> 1 as the root grows */
  function intensity(v){ intensTarget=Math.max(0,Math.min(1,v)); }

  return { start, boot, play, duck, toggle, sfx, pop, spinTicks, intensity,
           get muted(){ return muted; },
           _dbg:{ get ctx(){return ctx;}, P, get scene(){return scene;},
                  setCut(hz){ if(musicLP) musicLP.frequency.setTargetAtTime(hz,ctx.currentTime,.1); },
                  setWet(x){ if(verbOut) verbOut.gain.setTargetAtTime(x,ctx.currentTime,.1); },
                  setVol(x){ if(master) master.gain.setTargetAtTime(x,ctx.currentTime,.1); },
                  setTilt(db){ if(tilt) tilt.gain.setTargetAtTime(db,ctx.currentTime,.1); },
                  setCeiling(hz){ if(ceiling) ceiling.frequency.setTargetAtTime(hz,ctx.currentTime,.1); } } };
})();
