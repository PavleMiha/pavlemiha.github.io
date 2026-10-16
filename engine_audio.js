/* Engine noise player (see src/engine_sound.rs and src/engine_out.rs).
 * Every engine voice is one looping source on its own gain node, created
 * once and never stopped or replaced, so nothing piles up in the audio graph.
 * The game sends volumes every frame; each change glides over ~12 ms. Those
 * frames are also a heartbeat: the master gain is always scheduled to fade
 * out shortly after the latest one, so a hidden, covered or frozen page falls
 * silent inside the audio thread even when no script runs. Idle or hidden,
 * the context is suspended.
 * Browsers refuse to start audio before the player has touched the page (and
 * warn for every attempt), so the context is only created by the first
 * gesture. Samples the game hands over before then wait here as copies and
 * become voices the moment it exists. */
(() => {
  const GLIDE = 0.012, STALL = 0.25, FADE = 0.06;
  let ctx = null, master = null, active = false, resuming = false, touched = false;
  const voices = [], last = [], waiting = [];
  function audio() {
    if (ctx || !touched) return ctx;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    try { ctx = new Context({ latencyHint: 'interactive' }); } catch { return null; }
    master = ctx.createGain();
    master.gain.value = 0;
    // The mix is limited in Rust; this only catches stray peaks.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.002; limiter.release.value = 0.1;
    master.connect(limiter).connect(ctx.destination);
    waiting.forEach((sample, index) => { if (sample) voice(index, sample.data, sample.rate); });
    waiting.length = 0;
    return ctx;
  }
  // One looping voice from a sample, at the volume the game last asked for.
  function voice(index, data, rate) {
    if (voices[index]) return;
    try {
      const buffer = ctx.createBuffer(1, data.length, rate);
      buffer.copyToChannel(data, 0);
      const gain = ctx.createGain();
      gain.gain.value = last[index] || 0;
      gain.connect(master);
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.loop = true;
      source.connect(gain); source.start();
      voices[index] = { gain, value: gain.gain.value };
    } catch { /* Unsupported rate or context: that voice stays silent. */ }
  }
  // Run only while the game wants engine sound and the page is visible.
  function sync() {
    if (!ctx) return;
    const want = active && !document.hidden;
    if (want && ctx.state === 'suspended' && !resuming) {
      resuming = true;
      ctx.resume().catch(() => {}).finally(() => { resuming = false; });
    } else if (!want && ctx.state === 'running' && (!active || master.gain.value < 0.01)) {
      // Hidden while audible: suspend once the fade has finished.
      ctx.suspend().catch(() => {});
    }
  }
  // The first gesture creates the context (browsers allow audio from then
  // on); every gesture lets it resume if the engine wants sound.
  function gesture() {
    touched = true;
    audio();
    sync();
  }
  for (const type of ['pointerdown', 'keydown', 'touchend']) addEventListener(type, gesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.02);
      setTimeout(sync, 150);
    } else sync();
  });
  miniquad_add_plugin({
    name: 'ember_engine_audio', version: '0.1.0',
    register_plugin(imports) {
      imports.env.ember_engine_load = (index, ptr, len, rate) => {
        if (voices[index]) return;
        // Wasm memory is reused once this call returns: keep a copy.
        const data = new Float32Array(wasm_memory.buffer, ptr, len).slice();
        if (audio()) voice(index, data, rate);
        else waiting[index] = { data, rate };
      };
      imports.env.ember_engine_set = (ptr, len, wanted) => {
        active = wanted !== 0;
        const values = new Float32Array(wasm_memory.buffer, ptr, len);
        for (let i = 0; i < len; i++) last[i] = values[i];
        const ctx = audio();
        if (!ctx) return;
        sync();
        const now = ctx.currentTime;
        for (let i = 0; i < len; i++) {
          const value = values[i];
          const voice = voices[i];
          if (voice && voice.value !== value) {
            voice.gain.gain.setTargetAtTime(value, now, GLIDE);
            voice.value = value;
          }
        }
        // Heartbeat: audible now, silent soon unless another frame arrives.
        const gain = master.gain;
        gain.cancelScheduledValues(now);
        gain.setTargetAtTime(document.hidden ? 0 : 1, now, GLIDE);
        gain.setTargetAtTime(0, now + STALL, FADE);
      };
    }
  });
  window.emberEngineAudio = Object.freeze({
    state() {
      return {
        context: ctx ? ctx.state : 'none',
        voices: voices.filter(Boolean).length,
        waiting: waiting.filter(Boolean).length,
        master: master ? master.gain.value : 0,
        gains: voices.map(v => v ? v.gain.gain.value : 0),
      };
    }
  });
})();
