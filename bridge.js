/* Local-only saves and an explicit, observable agent interface. */
(() => {
  let queue = [];
  // Commands queued so far; the game counts the ones it has run the same way
  // (state().commands_done), so a caller can wait for its own command.
  let queued = 0;
  let snapshot = null;
  let fixed = {};
  // When an agent last read the state; the game only builds a snapshot every
  // frame while someone is reading.
  let lastRead = -Infinity;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const key = 'ember-bureau-save-v4';
  function write(ptr, capacity, value) {
    const bytes = encoder.encode(value);
    if (bytes.length > capacity) return 0;
    new Uint8Array(wasm_memory.buffer, ptr, bytes.length).set(bytes);
    return bytes.length;
  }
  miniquad_add_plugin({
    name: 'ember_bridge', version: '0.1.0',
    register_plugin(imports) {
      // The page owns its size: the game only enters and leaves fullscreen,
      // and reads whether it is fullscreen (the player can leave it with the
      // browser's own controls).
      imports.env.ember_fullscreen = () => (document.fullscreenElement ? 1 : 0);
      imports.env.ember_display = mode => {
        if (mode === 0) { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
        else if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      };
      imports.env.ember_now = () => Date.now() / 1000;
      imports.env.ember_load = (ptr, capacity) => {
        try { return write(ptr, capacity, localStorage.getItem(key) || localStorage.getItem('ember-bureau-save-v3') || localStorage.getItem('ember-bureau-save-v2') || localStorage.getItem('ember-bureau-save-v1') || ''); }
        catch { return 0; }
      };
      imports.env.ember_save = (ptr, len) => {
        try { localStorage.setItem(key, decoder.decode(new Uint8Array(wasm_memory.buffer, ptr, len))); return 1; }
        catch { return 0; }
      };
      imports.env.ember_poll = (ptr, capacity) => {
        // Hand over the oldest commands that fit; the rest wait for the next
        // frame, so a full queue still drains in order and every command runs.
        let size = 2, count = 0;
        for (const entry of queue) {
          const more = entry.bytes + (count ? 1 : 0);
          if (size + more > capacity) break;
          size += more; count++;
        }
        const written = write(ptr, capacity, '[' + queue.slice(0, count).map(q => q.json).join(',') + ']');
        if (written) queue = queue.slice(count);
        return written;
      };
      imports.env.ember_state_wanted = () => (performance.now() - lastRead < 2000 ? 1 : 0);
      imports.env.ember_static = (ptr, len) => {
        fixed = JSON.parse(decoder.decode(new Uint8Array(wasm_memory.buffer, ptr, len)));
      };
      imports.env.ember_state = (ptr, len) => {
        snapshot = JSON.parse(decoder.decode(new Uint8Array(wasm_memory.buffer, ptr, len)));
        document.getElementById('loading')?.remove();
      };
    }
  });
  window.emberAgent = Object.freeze({
    command(command) {
      // Encoded now, so later changes to the caller's object do not leak in.
      // At most 1024 UTF-8 bytes, a command always fits one poll on its own.
      const json = JSON.stringify(command);
      const bytes = json === undefined ? 0 : encoder.encode(json).length;
      if (queue.length >= 64 || !bytes || bytes > 1024) throw new Error('Command queue full or command too large');
      queue.push({ json, bytes });
      return ++queued;
    },
    // Live per-frame state plus the catalogue published once at startup.
    state() {
      lastRead = performance.now();
      return snapshot && structuredClone({ ...fixed, ...snapshot });
    }
  });
})();
