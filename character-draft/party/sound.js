/* Character Draft party: sound on the TV.

   Effects and two music beds made with ElevenLabs, played through Web Audio
   so they start on the beat. Browsers keep audio locked until the page is
   clicked once; until then everything here is silently skipped.

   Modes: "all" (effects and music), "effects" (no music), "off". */

(() => {
  "use strict";

  const BASE = new URL("sfx/", document.currentScript.src).href;
  const EFFECTS = ["reveal", "bid", "tock", "sold", "skipped", "join", "fight", "winner", "champion", "timeup", "vote",
    "b_slash", "b_punch", "b_shoot", "b_gun", "b_beam", "b_fire", "b_magic", "b_charge", "b_boom", "b_hit", "b_crit",
    "b_block", "b_whoosh", "b_ko", "b_heal", "b_build", "b_deploy", "b_shield", "b_ready", "b_fight", "b_win",
    "b_splat", "b_death", "b_throw", "b_slam", "b_teleport", "b_transform", "b_summon", "b_timestop", "b_psychic", "b_warp",
    "b_roar", "b_rise", "b_plane", "b_meteor", "b_sing", "b_gulp", "b_portal", "b_freeze", "b_stone", "b_anvil",
    "b_shout", "b_quake", "b_wind", "b_rewind", "b_drain", "b_spin"];
  // Music beds, all in the same 8-bit fighting style. A bed with several
  // tracks plays them in turn, crossfading, so it never loops one clip.
  const BEDS = { lobby: ["lobby"], auction: ["auction1", "auction2", "auction3"], battle: ["battle1", "battle2"] };
  const LEVEL = { lobby: 0.3, auction: 0.2, battle: 0.26 };   // music sits under everything
  const FADE_IN = 2, FADE_OUT = 1.5, CROSS = 2.5;
  const NAMES = EFFECTS.concat(...Object.values(BEDS));

  let ctx = null, master = null;
  const buffers = {};
  let mode = "all";
  let musicName = null, musicNode = null, musicGain = null, musicTrack = 0, musicTimer = null;
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
      const res = await fetch(`${BASE}${name}.mp3?v=6`);
      buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
      if (musicName && BEDS[musicName].includes(name) && !musicNode) startMusic();
    } catch { /* a missing sound just stays quiet */ }
  }

  const live = () => ctx && ctx.state === "running";

  function play(name, vol = 1, rate = 1) {
    if (mode === "off" || !live() || !buffers[name]) return;
    const src = ctx.createBufferSource();
    src.buffer = buffers[name];
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    // A few milliseconds of fade either side, so nothing clicks in or out.
    const t = ctx.currentTime, len = src.buffer.duration / rate;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.setValueAtTime(vol, Math.max(t + 0.012, t + len - 0.05));
    g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(g).connect(master);
    src.start();
  }

  function stopMusic(fade = FADE_OUT) {
    clearTimeout(musicTimer);
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

  function startMusic(fadeIn = FADE_IN) {
    if (mode !== "all" || !live() || !musicName) return;
    const list = BEDS[musicName];
    const track = list[musicTrack % list.length];
    if (!buffers[track]) return;
    const src = ctx.createBufferSource();
    src.buffer = buffers[track];
    src.loop = list.length === 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(level(), ctx.currentTime + fadeIn);
    src.connect(g).connect(master);
    src.start();
    musicNode = src; musicGain = g;
    // Hand over to the next track before this one ends.
    if (list.length > 1) {
      const name = musicName;
      musicTimer = setTimeout(() => {
        if (musicName !== name) return;
        const old = { node: musicNode, gain: musicGain };
        musicNode = null; musicGain = null;
        musicTrack++;
        startMusic(CROSS);
        try {
          old.gain.gain.cancelScheduledValues(ctx.currentTime);
          old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime);
          old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + CROSS);
          old.node.stop(ctx.currentTime + CROSS + 0.05);
        } catch { /* already stopped */ }
      }, Math.max(1000, (src.buffer.duration - CROSS) * 1000));
    }
  }

  const level = () => (LEVEL[musicName] || 0.25) * (ducked ? 0.35 : 1);

  // Ask for a music bed (or null for silence); the same one keeps playing.
  function music(name) {
    if (name === musicName && (musicNode || !live())) return;
    stopMusic();
    musicName = name;
    if (name) musicTrack = Math.floor(Math.random() * BEDS[name].length);
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
    if (mode !== "all") stopMusic(0.6);
    else startMusicIfIdle();
    if (mode === "off" && "speechSynthesis" in window) speechSynthesis.cancel();
  }

  window.Sound = { unlock, play, music, duck, say, setMode, get mode() { return mode; }, get unlocked() { return live(); } };
})();
