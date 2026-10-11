/* Character Draft: a narrator for the 8-bit battles. It reads the war
   councils' plans, the gear, each beat's caption and the verdict aloud.

   Three voices:
   - "off"
   - "browser": the voice built into the browser (free, works offline,
     quality depends on the computer)
   - "eleven": ElevenLabs through the party server, with the judge's PIN
     (the most natural voice; costs ElevenLabs credits)

   speak(text) returns a promise that settles when the line has been said,
   so the battle can wait for it. */

(() => {
  "use strict";

  const KEY = "character-draft:narration";
  const PIN_KEY = "character-draft:v1:pin";   // the judge's PIN (judge.js)
  const SERVER = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:8080"
    : "https://party-server-production-d0f7.up.railway.app";

  const get = () => { try { return localStorage.getItem(KEY) || "off"; } catch { return "off"; } };
  let mode = get();
  if (!["off", "browser", "eleven"].includes(mode)) mode = "off";
  let audio = null, paused = false, warned = "";

  // ElevenLabs bills by character: about this many per fight, with
  // Flash v2.5 at half a credit a character.
  const CHARS_PER_FIGHT = 2600;
  const CREDITS_PER_FIGHT = Math.round(CHARS_PER_FIGHT / 2);
  function estimate(fights = 1) {
    const credits = CREDITS_PER_FIGHT * fights;
    const dollars = (credits / 30000) * 5;   // the $5 Starter plan: 30,000 credits a month
    return { credits, dollars, text: `about ${credits.toLocaleString()} ElevenLabs credits${fights > 1 ? ` for ${fights} fights` : " a fight"} (roughly $${dollars.toFixed(2)} on the $5 Starter plan; the free plan's 10,000 a month covers about ${Math.floor(10000 / CREDITS_PER_FIGHT)} fights)` };
  }

  /* --- The browser's own voice ------------------------------------------- */
  let voice = null;
  function pickVoice() {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    const prefs = [/Daniel/, /Google UK English Male/, /Arthur/, /Karen/, /Google UK English Female/, /Samantha/, /^en-GB/, /^en-AU/, /^en/];
    for (const re of prefs) { const v = vs.find(x => re.test(x.name) || re.test(x.lang)); if (v) return v; }
    return vs[0] || null;
  }
  if (window.speechSynthesis) {
    voice = pickVoice();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener("voiceschanged", () => { voice = pickVoice(); });
  }
  function sayBrowser(text) {
    if (!window.speechSynthesis) return Promise.resolve();
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 1.08; u.pitch = 0.95;
      const done = () => { clearTimeout(t); res(); };
      const t = setTimeout(done, 1500 + text.length * 120);   // never hang the battle
      u.onend = done; u.onerror = done;
      speechSynthesis.speak(u);
    });
  }

  /* --- ElevenLabs, through the server --------------------------------------- */
  const cache = new Map();
  function pin() { try { return localStorage.getItem(PIN_KEY); } catch { return null; } }
  async function fetchVoice(text) {
    if (cache.has(text)) return cache.get(text);
    const p = (async () => {
      const r = await fetch(`${SERVER}/tts`, { method: "POST", headers: { "content-type": "application/json", "x-draft-pin": pin() || "" }, body: JSON.stringify({ text }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Narration failed."); }
      return URL.createObjectURL(await r.blob());
    })();
    cache.set(text, p);
    p.catch(() => cache.delete(text));
    return p;
  }
  async function sayEleven(text) {
    let url;
    try { url = await fetchVoice(text); }
    catch (e) { if (warned !== e.message) { warned = e.message; console.warn("narration:", e.message); } return sayBrowser(text); }
    return new Promise(res => {
      audio = new Audio(url);
      const done = () => { clearTimeout(t); res(); };
      const t = setTimeout(done, 3000 + text.length * 120);
      audio.onended = done; audio.onerror = done;
      audio.play().catch(done);
    });
  }

  function clean(t) { return String(t || "").replace(/\s+/g, " ").trim().slice(0, 600); }

  window.Narrator = {
    get mode() { return mode; },
    set(m) { mode = ["off", "browser", "eleven"].includes(m) ? m : "off"; try { localStorage.setItem(KEY, mode); } catch { /* fine */ } if (mode === "off") this.stop(); },
    on() { return mode !== "off"; },
    available: { browser: !!window.speechSynthesis, eleven: true },
    estimate,
    // Fetch ElevenLabs audio ahead, so a line plays the moment it's needed.
    prefetch(lines) { if (mode === "eleven") (lines || []).map(clean).filter(Boolean).slice(0, 40).forEach(t => fetchVoice(t).catch(() => {})); },
    speak(text) {
      const t = clean(text);
      if (!t || mode === "off") return Promise.resolve();
      return mode === "eleven" ? sayEleven(t) : sayBrowser(t);
    },
    stop() {
      if (window.speechSynthesis) speechSynthesis.cancel();
      if (audio) { audio.pause(); audio = null; }
    },
    pause() { paused = true; if (window.speechSynthesis) speechSynthesis.pause(); if (audio) audio.pause(); },
    resume() { if (!paused) return; paused = false; if (window.speechSynthesis) speechSynthesis.resume(); if (audio) audio.play().catch(() => {}); },
  };
})();
