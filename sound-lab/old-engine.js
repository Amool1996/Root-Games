/* EXTRACTED VERBATIM from root-architect.html lines 2106, 2107-2208 — do not edit; this is the A/B reference. */
const SCENE_MUSIC={title:"title", intro:"story", who:"design", after:"party", wheel:"wheel", design:"design", sim:"grow", results:"party", name:"party", board:"party"};
const OldMusic=(()=>{
  let ctx=null, master=null, mg=null, sg=null, timer=null, scene=null, pat=null, step=0, nextT=0, fileEl=null, lastPop=0;
  let ducked=false, switchTok=0;
  let muted=false; try{ muted=localStorage.getItem("ra_mute")==="1"; }catch(e){}
  const N=n=>440*Math.pow(2,(n-69)/12), _=null;
  /* two-bar loops in 16th steps; mel/bass are MIDI notes (C major / pentatonic, so nothing can clash) */
  const P={
    title:{bpm:128, wave:"triangle", vol:.42, hats:true,                        // bouncy and bright
      mel:[72,_,76,_,79,_,76,_, 81,_,79,_,76,_,74,_, 72,_,74,_,76,_,79,_, 81,_,79,79,76,_,74,_],
      bass:[36,_,_,_,36,_,_,_,43,_,_,_,43,_,_,_,45,_,_,_,45,_,_,_,41,_,_,_,41,_,_,_]},
    story:{bpm:84, wave:"sine", vol:.12, hats:false, bell:true,                // soft music box under the voice
      mel:[72,_,_,_,76,_,_,_,79,_,_,_,76,_,_,_, 74,_,_,_,77,_,_,_,81,_,_,_,77,_,_,_],
      bass:[48,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_, 53,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_]},
    wheel:{bpm:132, wave:"square", vol:.2, hats:true,                          // carnival oom-pah
      mel:[79,_,76,_,72,_,76,_,79,_,76,_,72,_,_,_, 81,_,77,_,74,_,77,_,81,_,77,_,74,_,_,_],
      bass:[36,_,_,_,43,_,_,_,36,_,_,_,43,_,_,_,41,_,_,_,48,_,_,_,41,_,_,_,48,_,_,_]},
    design:{bpm:108, wave:"triangle", vol:.34, hats:false,                     // curious, thinking
      mel:[72,_,_,74,_,_,76,_,_,_,79,_,_,_,_,_, 76,_,_,74,_,_,72,_,_,_,69,_,_,_,_,_],
      bass:[45,_,_,_,_,_,_,_,41,_,_,_,_,_,_,_,43,_,_,_,_,_,_,_,36,_,_,_,_,_,_,_]},
    grow:{bpm:100, wave:"sine", vol:.3, hats:false, bell:true,                 // rising arpeggios: something is growing
      mel:[60,64,67,72, 64,67,72,76, 67,72,76,79, 72,76,79,84, 83,79,76,72, 79,76,72,67, 76,72,67,64, 72,67,64,60],
      bass:[36,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_, 41,_,_,_,_,_,_,_,43,_,_,_,_,_,_,_]},
    party:{bpm:138, wave:"triangle", vol:.44, hats:true,                       // celebration
      mel:[76,_,79,_,84,_,79,_, 81,_,84,_,79,_,76,_, 74,_,76,_,79,_,81,_, 84,_,_,_,84,84,_,_],
      bass:[36,_,_,_,36,_,_,_,41,_,_,_,41,_,_,_,43,_,_,_,43,_,_,_,36,_,_,_,36,_,_,_]}
  };
  function ensure(){
    if(ctx) return true;
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)();
      master=ctx.createGain(); master.gain.value=muted?0:1; master.connect(ctx.destination);
      mg=ctx.createGain(); mg.gain.value=1;  mg.connect(master);     // music
      sg=ctx.createGain(); sg.gain.value=.9; sg.connect(master);     // effects
      return true; }catch(e){ return false; }
  }
  function tone(t,midi,dur,type,vol,dest,a){
    a=a||0.012; const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.value=N(midi);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+0.03);
  }
  function hat(t,vol){
    const n=Math.floor(ctx.sampleRate*0.04), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=ctx.createBufferSource(); s.buffer=b; const f=ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=7000;
    const g=ctx.createGain(); g.gain.value=vol; s.connect(f); f.connect(g); g.connect(mg); s.start(t);
  }
  function playStep(i,t){
    const spb=60/pat.bpm/4, m=pat.mel[i], b=pat.bass[i];
    if(m!=null) tone(t,m,pat.bell?spb*3.2:spb*1.7,pat.wave,pat.vol,mg);
    if(b!=null) tone(t,b,spb*3.6,"triangle",pat.vol*0.9,mg,0.02);
    if(pat.hats && (i%2===1)) hat(t,0.05);
  }
  function tick(){ if(!ctx||!pat) return; const spb=60/pat.bpm/4;
    while(nextT<ctx.currentTime+0.3){ playStep(step%32,nextT); step++; nextT+=spb; } }
  function stopLoop(){ if(timer){ clearInterval(timer); timer=null; } pat=null; if(fileEl){ try{ fileEl.pause(); }catch(e){} fileEl=null; } }
  function startPattern(name){ pat=P[name]||P.title; step=0; nextT=ctx.currentTime+0.06; timer=setInterval(tick,90); tick(); }
  function level(){ if(scene==="story") return ducked?0.10:0.4;   // the story is a background hum, always
    return ducked?0.22:1; }
  function play(name){
    if(name===scene) return; scene=name;
    if(!ctx) return;                                   // remembered; starts on the first tap
    if(ctx.state==="suspended") ctx.resume();
    // fade the old loop out (120 ms), THEN start the new one, so two loops never sound together
    const tok=++switchTok, now=ctx.currentTime;
    mg.gain.cancelScheduledValues(now); mg.gain.setValueAtTime(mg.gain.value,now); mg.gain.linearRampToValueAtTime(0.0001,now+0.12);
    setTimeout(()=>{ if(tok!==switchTok) return;
      stopLoop();
      const t2=ctx.currentTime; mg.gain.cancelScheduledValues(t2); mg.gain.setValueAtTime(0.0001,t2); mg.gain.linearRampToValueAtTime(level(),t2+0.35);
      const files=window.RA_MUSIC||{};
      if(files[name]){ fileEl=new Audio("ra-data/music/"+files[name]); fileEl.loop=true; fileEl.volume=muted?0:(ducked?0.15:0.55);
        fileEl.play().catch(()=>{ fileEl=null; startPattern(name); }); return; }
      startPattern(name);
    }, 140);
  }
  /* on load: if the browser already allows sound (kiosk launcher), start straight away; otherwise
     show TAP TO START so the first touch happens on the title screen, not on PLAY */
  function boot(){ ensure(); const sp=document.getElementById("tapSplash");
    if(ctx && ctx.state==="running"){ start(); if(sp) sp.style.display="none"; }
    else if(sp) sp.style.display="flex"; }
  function start(){ if(!ensure()) return; if(ctx.state==="suspended") ctx.resume();
    const sp=document.getElementById("tapSplash"); if(sp) sp.style.display="none";
    if(scene && !pat && !fileEl){ const s=scene; scene=null; play(s); } }
  function duck(on){ ducked=on; if(!ctx) return; mg.gain.setTargetAtTime(level(), ctx.currentTime, 0.25); if(fileEl) fileEl.volume=muted?0:(on?0.15:0.55); }
  function toggle(){ muted=!muted; try{ localStorage.setItem("ra_mute",muted?"1":"0"); }catch(e){}
    if(ctx) master.gain.setTargetAtTime(muted?0:1, ctx.currentTime, 0.05); if(fileEl) fileEl.volume=muted?0:0.55;
    const b=document.getElementById("muteBtn"); if(b) b.textContent=muted?"🔇":"🔊"; }
  function sfx(kind){
    if(!ctx||muted) return; const t=ctx.currentTime;
    if(kind==="click") tone(t,88,0.09,"triangle",0.35,sg);
    else if(kind==="tick"){ hat(t,0.25); tone(t,96,0.05,"square",0.08,sg); }
    else if(kind==="fanfare"){ [72,76,79,84].forEach((n,i)=>tone(t+i*0.09,n,0.35,"triangle",0.4,sg)); [72,76,79].forEach(n=>tone(t+0.42,n,0.9,"triangle",0.28,sg,0.03)); }
    else if(kind==="chime"){ tone(t,88,0.9,"sine",0.35,sg); tone(t+0.05,95,0.9,"sine",0.25,sg); tone(t+0.1,100,1.1,"sine",0.2,sg); }
    else if(kind==="pop"){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type="sine";
      o.frequency.setValueAtTime(520,t); o.frequency.exponentialRampToValueAtTime(980,t+0.08);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.1);
      o.connect(g); g.connect(sg); o.start(t); o.stop(t+0.12); }
    else if(kind==="count") tone(t,100,0.04,"square",0.06,sg);
  }
  function pop(){ const now=performance.now(); if(now-lastPop<70) return; lastPop=now; sfx("pop"); }
  function spinTicks(ms){ if(!ctx) return; let t=0, gap=45;                  // ticks slow down as the wheel does
    const go2=()=>{ if(t>=ms) return; sfx("tick"); gap*=1.055; t+=gap; setTimeout(go2,gap); }; go2(); }
  return {start, boot, play, duck, toggle, sfx, pop, spinTicks, get muted(){ return muted; }};
})();
