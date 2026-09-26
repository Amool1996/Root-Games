/* Lets the lab stop an engine dead: every AudioContext either engine creates is
   recorded here, so the lab can suspend one while the other plays. Loaded FIRST. */
window.LAB_CTX = [];
(function(){
  const Real = window.AudioContext || window.webkitAudioContext;
  if(!Real) return;
  function Wrapped(...a){ const c = new Real(...a); window.LAB_CTX.push(c); return c; }
  Wrapped.prototype = Real.prototype;
  window.AudioContext = Wrapped; window.webkitAudioContext = Wrapped;
})();
try{ localStorage.removeItem("ra_mute"); }catch(e){}   // never start the lab muted
