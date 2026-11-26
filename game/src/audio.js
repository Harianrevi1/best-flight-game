// SKYLANE — Island Run: all sounds are synthesised with WebAudio.
// No audio files are loaded; everything is an oscillator or filtered noise.
window.SKYLANE = window.SKYLANE || {};

SKYLANE.audio = (function () {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let started = false;

  function makeNoiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    // Engine drone: two detuned saws through a low-pass filter.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 62;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 93;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();

    // Wind rush: looped noise through a band-pass filter.
    windSource = ctx.createBufferSource();
    windSource.buffer = makeNoiseBuffer(2);
    windSource.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSource.start();
    started = true;
  }

  function setEngine(throttle, speedNorm) {
    if (!started || muted) return;
    const t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(58 + throttle * 95, t, 0.1);
    engineOsc2.frequency.setTargetAtTime(87 + throttle * 140, t, 0.1);
    engineGain.gain.setTargetAtTime(0.028 + throttle * 0.05, t, 0.15);
    windGain.gain.setTargetAtTime(speedNorm * 0.05, t, 0.2);
    windFilter.frequency.setTargetAtTime(500 + speedNorm * 900, t, 0.2);
  }

  function blip(freq, at, dur, type, vol) {
    if (!started) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(vol || 0.16, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  function ring() {
    if (!started) return;
    const t = ctx.currentTime;
    blip(880, t, 0.35, 'sine', 0.2);
    blip(1318, t + 0.09, 0.4, 'sine', 0.2);
    blip(1760, t + 0.18, 0.45, 'sine', 0.14);
  }

  function crash() {
    if (!started) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    blip(55, t, 0.5, 'sine', 0.4);
  }

  function land() {
    if (!started) return;
    const t = ctx.currentTime;
    blip(523, t, 0.3, 'triangle', 0.18);
    blip(659, t + 0.1, 0.3, 'triangle', 0.18);
    blip(784, t + 0.2, 0.5, 'triangle', 0.18);
  }

  function click() {
    if (!started) return;
    blip(660, ctx.currentTime, 0.08, 'square', 0.08);
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.9;
  }

  function isMuted() { return muted; }

  return { init, setEngine, ring, crash, land, click, setMuted, isMuted };
})();
