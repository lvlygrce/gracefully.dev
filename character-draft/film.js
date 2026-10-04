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
        <p class="film__line" id="film-line"></p>
        <div class="film__dots">${shots.map((s, i) => `<button type="button" class="film__dot" data-shot="${i}" aria-label="Shot ${i + 1}"></button>`).join("")}</div>
        <div class="film__tools"><button class="btn btn--quiet btn--inline" type="button" id="film-skip">Skip to the result</button></div>
      </div>`;
    const video = container.querySelector("#film-video");
    const caption = container.querySelector("#film-caption");
    const chapter = container.querySelector("#film-chapter");
    const line = container.querySelector("#film-line");
    const play = container.querySelector("#film-play");
    let i = 0, ended = false;

    const finish = () => { if (ended) return; ended = true; onEnd && onEnd(); };
    function show(k, autoplay) {
      i = k;
      const s = shots[k];
      video.src = s.url;
      caption.textContent = s.caption || "";
      line.textContent = s.line ? `${s.speaker ? `${s.speaker}: ` : ""}“${s.line}”` : "";
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

  /* --- Recent battles ------------------------------------------------
     Every judged battle is kept in this browser for a week (as long as
     Higgsfield keeps the films): the teams, the story and the film's shots.
     Each can be watched again, or downloaded as a story or one joined film. */

  const BATTLES_KEY = "character-draft:v1:battles";
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  const battles = {
    list() {
      const all = safe.get(BATTLES_KEY) || [];
      const fresh = all.filter(b => Date.now() - b.at < WEEK);
      if (fresh.length !== all.length) safe.set(BATTLES_KEY, fresh);
      return fresh;
    },
    save(entry) {
      const all = battles.list().filter(b => b.id !== entry.id);
      all.unshift(entry);
      // Keep the newest 40, and drop the oldest if storage gets tight.
      for (let n = Math.min(all.length, 40); n > 0; n--) {
        try { localStorage.setItem(BATTLES_KEY, JSON.stringify(all.slice(0, n))); return; } catch { /* trim and retry */ }
      }
    },
    update(id, patch) {
      const all = battles.list();
      const b = all.find(x => x.id === id);
      if (!b) return;
      Object.assign(b, patch);
      try { localStorage.setItem(BATTLES_KEY, JSON.stringify(all)); } catch { /* no-op */ }
    },
    remove(id) { safe.set(BATTLES_KEY, battles.list().filter(b => b.id !== id)); },
    daysLeft: b => Math.max(0, Math.ceil((b.at + WEEK - Date.now()) / 86400000)),
    title: b => `${b.teams[0].name} vs ${b.teams[1].name}`,

    story(b) {
      const v = b.verdict || {};
      const lines = [battles.title(b), new Date(b.at).toLocaleString(), b.arena ? `At ${b.arena.name}` : "", ""];
      b.teams.forEach((t, i) => {
        lines.push(`${t.name}'s team: ${t.roster.map(r => r.name).join(", ")}`);
        const p = (v.preps || [])[i];
        if (p) {
          lines.push(`  Led by ${p.leader}. ${p.plan}`);
          (p.gear || []).forEach(g => lines.push(`  Gear: ${g.name} (${g.made_by}): ${g.effect}`));
        }
        lines.push("");
      });
      if (v.fight) lines.push("The fight", v.fight, "");
      (v.roles || []).filter(r => r.role).forEach(r => lines.push(`${r.name}: ${r.role}`));
      if (v.turning_point) lines.push("", `Turning point: ${v.turning_point}`);
      if (v.mvp) lines.push(`Most valuable: ${v.mvp}`);
      lines.push("", `${v.winner || "?"} wins. ${v.verdict || ""}`, v.by ? `Judged by ${v.by}.` : "");
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
    },

    downloadStory(b) {
      saveBlob(new Blob([battles.story(b)], { type: "text/plain" }), `${battles.title(b)}.txt`);
    },

    async downloadFilm(b) {
      const urls = ((b.film && b.film.shots) || []).map(x => x.url).filter(Boolean);
      if (!urls.length) throw new Error("This battle doesn't have a film.");
      const r = await fetch(`${SERVER}/video/stitch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls, name: battles.title(b) }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Couldn't join the film."); }
      saveBlob(await r.blob(), `${battles.title(b)}.mp4`);
    },
  };

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: name.replace(/[\\/:*?"<>|]+/g, "") });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  window.Film = { quote, nzdRate, nz, start, wait, status, player, esc, TEXT_USD, ownKey, safe, battles };
})();
