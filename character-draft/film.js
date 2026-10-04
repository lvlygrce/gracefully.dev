/* Battle films: prices, making a film through the party server, and playing it.

   The Higgsfield key lives only on the server. This page sends finished shot
   prompts plus the access code; the server prices the job, keeps to its daily
   budget, makes the shots with WAN 3.0 and reports back. Prices are shown in
   New Zealand dollars at today's exchange rate. */

(function () {
  "use strict";

  const SERVER = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:8080"
    : "https://party-server-production-d0f7.up.railway.app";
  const HF_STORE = "character-draft:v1:higgsfield-key";
  const RATE_KEY = "character-draft:v1:usd-nzd";
  const FALLBACK_RATE = 1.7;

  // A Gemini judgement is four calls of a few thousand tokens: about two US
  // cents at paid rates, and nothing within Gemini's free allowance.
  const TEXT_USD = { gemini: 0.012, local: 0 };

  const safe = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* no-op */ } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* no-op */ } },
  };

  async function nzdRate() {
    const cached = safe.get(RATE_KEY);
    if (cached && Date.now() - cached.at < 12 * 3600 * 1000) return cached.rate;
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD");
      const d = await r.json();
      const rate = d && d.rates && Number(d.rates.NZD);
      if (rate > 0.5 && rate < 5) { safe.set(RATE_KEY, { rate, at: Date.now() }); return rate; }
    } catch { /* fall through */ }
    return (cached && cached.rate) || FALLBACK_RATE;
  }

  let quoteCache = null;
  async function quote() {
    if (quoteCache && Date.now() - quoteCache.at < 10 * 60 * 1000) return quoteCache.data;
    const r = await fetch(`${SERVER}/video/quote`);
    if (!r.ok) throw new Error("The film service isn't answering.");
    const data = await r.json();
    quoteCache = { data, at: Date.now() };
    return data;
  }

  const nz = (usd, rate) => usd <= 0 ? "free" : `NZ$${(usd * rate).toFixed(2)}`;

  // With the PIN, the server's Higgsfield key and budget; otherwise the
  // player's own key, passed through for this one film and never stored there.
  async function start({ tier, prompts, seed }) {
    const p = window.Judge && window.Judge.pin.get();
    const own = safe.get(HF_STORE);
    const r = await fetch(`${SERVER}/video/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tier, prompts, seed, ...(own ? { hfKey: own } : { code: p }) }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "The film couldn't be started.");
    return d;
  }

  async function status(id) {
    const r = await fetch(`${SERVER}/video/status/${encodeURIComponent(id)}`);
    if (r.status === 404) throw Object.assign(new Error("The film service has forgotten this film."), { gone: true });
    if (!r.ok) throw new Error("Couldn't check on the film.");
    return r.json();
  }

  // Poll until every shot is finished or has failed.
  async function wait(id, onProgress) {
    let delay = 4000;
    for (;;) {
      const st = await status(id);
      onProgress(st);
      if (st.done) return st;
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(10000, delay * 1.2);
    }
  }

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* The player: the shots in order, a caption under each, chapter titles
     between prep and battle, and a callback when the last shot ends. */
  function player(container, film, { onEnd } = {}) {
    const shots = film.shots.filter(s => s.url);
    if (!shots.length) { container.innerHTML = `<p class="judge__warn">None of the shots came back, so there's no film this time.</p>`; return; }
    container.innerHTML = `
      <div class="film">
        <p class="film__chapter" id="film-chapter"></p>
        <div class="film__screen">
          <video id="film-video" playsinline preload="auto"></video>
          <button class="film__play" id="film-play" type="button">Play the film</button>
        </div>
        <p class="film__caption" id="film-caption" aria-live="polite"></p>
        <div class="film__dots">${shots.map((s, i) => `<button type="button" class="film__dot" data-shot="${i}" aria-label="Shot ${i + 1}"></button>`).join("")}</div>
        <div class="film__tools"><button class="btn btn--quiet btn--inline" type="button" id="film-skip">Skip to the result</button></div>
      </div>`;
    const video = container.querySelector("#film-video");
    const caption = container.querySelector("#film-caption");
    const chapter = container.querySelector("#film-chapter");
    const play = container.querySelector("#film-play");
    let i = 0, ended = false;

    const finish = () => { if (ended) return; ended = true; onEnd && onEnd(); };
    function show(k, autoplay) {
      i = k;
      const s = shots[k];
      video.src = s.url;
      caption.textContent = s.caption || "";
      chapter.textContent = s.label || "";
      container.querySelectorAll(".film__dot").forEach((d, n) => d.classList.toggle("film__dot--on", n === k));
      if (autoplay) video.play().catch(() => { play.hidden = false; });
    }
    video.addEventListener("ended", () => { if (i + 1 < shots.length) show(i + 1, true); else finish(); });
    play.addEventListener("click", () => { play.hidden = true; show(i, true); });
    container.querySelectorAll(".film__dot").forEach(d => d.addEventListener("click", () => { play.hidden = true; show(Number(d.dataset.shot), true); }));
    container.querySelector("#film-skip").addEventListener("click", () => { video.pause(); finish(); });
    show(0, false);
  }

  const ownKey = {
    get: () => safe.get(HF_STORE),
    set: k => safe.set(HF_STORE, k.trim()),
    clear: () => safe.remove(HF_STORE),
    looksLike: k => /^[\w-]{8,}:[\w-]{16,}$/.test(String(k).trim()),
  };

  window.Film = { quote, nzdRate, nz, start, wait, status, player, esc, TEXT_USD, ownKey, safe };
})();
