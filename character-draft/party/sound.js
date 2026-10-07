/* Character Draft party: sound on the TV.

   Effects and two music beds made with ElevenLabs, played through Web Audio
   so they start on the beat. Browsers keep audio locked until the page is
   clicked once; until then everything here is silently skipped.

   Modes: "all" (effects and music), "effects" (no music), "off". */

(() => {
  "use strict";

  const BASE = new URL("sfx/", document.currentScript.src).href;
  const NAMES = ["reveal", "bid", "tick", "tock", "sold", "skipped", "join", "fight", "winner", "champion", "timeup", "vote", "lobby", "auction"];
  const LEVEL = { lobby: 0.32, auction: 0.16 };   // music sits under everything

  let ctx = null, master = null;
  const buffers = {};
  let mode = "all";
  let musicName = null, musicNode = null, musicGain = null;
  let ducked = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    NAMES.forEach(load);
    return ctx;
  }

  async function load(name) {
    try {
      const res = await fetch(`${BASE}${name}.mp3?v=1`);
      buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
      if (name === musicName && !musicNode) startMusic();
    } catch { /* a missing sound just stays quiet */ }
  }

  const live = () => ctx && ctx.state === "running";

  function play(name, vol = 1, rate = 1) {
    if (mode === "off" || !live() || !buffers[name]) return;
    const src = ctx.createBufferSource();
    src.buffer = buffers[name];
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(master);
    src.start();
  }

  function stopMusic(fade = 0.6) {
    if (!musicNode) return;
    const node = musicNode, g = musicGain;
    musicNode = null; musicGain = null;
    try {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
      node.stop(ctx.currentTime + fade + 0.05);
    } catch { /* already stopped */ }
  }

  function startMusic() {
    if (mode !== "all" || !live() || !musicName || !buffers[musicName]) return;
    const src = ctx.createBufferSource();
    src.buffer = buffers[musicName];
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(level(), ctx.currentTime + 1.2);
    src.connect(g).connect(master);
    src.start();
    musicNode = src; musicGain = g;
  }

  const level = () => (LEVEL[musicName] || 0.25) * (ducked ? 0.35 : 1);

  // Ask for a music bed (or null for silence); the same one keeps playing.
  function music(name) {
    if (name === musicName && (musicNode || !live())) return;
    stopMusic();
    musicName = name;
    startMusic();
  }

  // Lower the music while something else (a film, a name read out) needs the room.
  function duck(on) {
    ducked = on;
    if (musicGain) musicGain.gain.linearRampToValueAtTime(level(), ctx.currentTime + 0.3);
  }

  // Read a character's name like a game-show host, after the reveal sting.
  function say(text, delay = 900) {
    if (mode === "off" || !live() || !("speechSynthesis" in window)) return;
    setTimeout(() => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
        const pick = voices.find(v => /Daniel|Google UK English Male|Alex|Samantha|Google US English/.test(v.name)) || voices[0];
        if (pick) u.voice = pick;
        u.rate = 1.02; u.pitch = 1; u.volume = 1;
        duck(true);
        u.onend = u.onerror = () => duck(false);
        speechSynthesis.speak(u);
      } catch { /* no voice, no matter */ }
    }, delay);
  }

  // The first click anywhere unlocks audio for the rest of the session.
  function unlock() {
    if (!ensure()) return;
    if (ctx.state !== "running") ctx.resume().then(startMusicIfIdle).catch(() => {});
    else startMusicIfIdle();
  }
  const startMusicIfIdle = () => { if (!musicNode) startMusic(); };

  function setMode(m) {
    mode = ["all", "effects", "off"].includes(m) ? m : "all";
    if (mode !== "all") stopMusic(0.3);
    else startMusicIfIdle();
    if (mode === "off" && "speechSynthesis" in window) speechSynthesis.cancel();
  }

  window.Sound = { unlock, play, music, duck, say, setMode, get mode() { return mode; }, get unlocked() { return live(); } };
})();
