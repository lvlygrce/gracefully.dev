/* Character Draft party: the TV. It hosts the room, shows the PIN and the
   QR code, builds the deck from the chosen worlds, and draws each phase for
   the whole room. In AI mode it also runs the judge and hands the verdict
   to the server. */

(function () {
  "use strict";

  const { connect, clock, safe, esc, picture, fitter } = window.Party;
  // Everything fits the TV: text and pictures shrink rather than scroll.
  const fit = fitter(() => Math.min(30, Math.max(15, window.innerWidth * 0.0112)), 8);
  const U = window.UNIVERSES;
  const IMAGES = window.CHARACTER_IMAGES || {};
  const J = window.Judge;
  const app = document.getElementById("app");
  const announcer = document.getElementById("announce");

  const HOST_KEY = "character-draft:party:host";
  const PREFS_KEY = "character-draft:party:prefs";
  const JOIN_URL = `${location.origin}/play/`;
  const JOIN_LABEL = `${location.host}/play`;

  const prefs = Object.assign(
    { worlds: Object.keys(U), judge: "gemini", team: 5, skips: 2, bidSeconds: 10, autoNext: false, sound: "all", announceNames: true, battle8: true, voteSeconds: 20, casualties: true, film: "off", filmTier: "quick" },
    safe.get(PREFS_KEY) || {},
  );
  // The crowd vote used to be the default, so older saved settings carry it
  // without anyone having picked it: move them to Gemini once.
  if (!prefs.v) { if (prefs.judge === "crowd") prefs.judge = "gemini"; prefs.v = 2; safe.set(PREFS_KEY, prefs); }
  prefs.worlds = (prefs.worlds || []).filter(w => U[w]);
  if (!prefs.worlds.length) prefs.worlds = Object.keys(U);

  let state = null;
  let pin = null;
  let view = null;
  let status = "connecting";
  let error = "";
  // Browsers only allow sound after someone has clicked the page once.
  let soundOk = false;
  const Sound = window.Sound;
  Sound.setMode(prefs.sound);
  document.addEventListener("pointerdown", () => {
    Sound.unlock();
    if (soundOk) return;
    soundOk = true;
    const n = document.getElementById("sound-note");
    if (n) n.textContent = "";
  });

  // The corner speaker: all sound, effects only, or silence.
  const SOUND_LABEL = { all: "Sound: effects and music", effects: "Sound: effects only", off: "Sound off" };
  function soundButton() {
    const b = document.getElementById("sound-toggle");
    if (!b) return;
    b.dataset.mode = prefs.sound;
    b.setAttribute("aria-label", SOUND_LABEL[prefs.sound]);
    b.title = SOUND_LABEL[prefs.sound];
  }
  function setSound(m) {
    prefs.sound = m; savePrefs(); Sound.setMode(m); soundButton();
    app.querySelectorAll('[name="sound"]').forEach(i => { i.checked = i.value === m; });
  }
  document.getElementById("sound-toggle")?.addEventListener("click", () =>
    setSound({ all: "effects", effects: "off", off: "all" }[prefs.sound] || "all"));
  soundButton();

  // Game-show cues from what changed between two states.
  function cues(was, s) {
    // During a match the battle (or film) owns the music; it starts quiet.
    if (s.phase !== "match") Sound.music(["lobby", "teams", "bracket"].includes(s.phase) ? "lobby" : ["auction", "sold"].includes(s.phase) ? "auction" : null);
    else if (!was || was.phase !== "match") Sound.music(null);
    if (!was) return;
    const same = (a, b) => a.phase === "match" && b.phase === "match" && a.match.id === b.match.id;
    if (s.phase === "lobby" && was.phase === "lobby" && s.players.length > was.players.length) Sound.play("join", 0.8);
    if (s.phase === "auction" && s.lots !== was.lots) {
      Sound.play("reveal");
      const c = card(s.lot.card);
      if (c && prefs.announceNames) Sound.say(c.name);
    }
    if (s.phase === "auction" && was.phase === "auction" && s.lots === was.lots && s.lot.bids.length > was.lot.bids.length)
      Sound.play("bid", 1, 1 + Math.min(0.35, s.lot.bids.length * 0.035));   // each raise a touch higher
    if (s.phase === "sold" && was.phase !== "sold") Sound.play(s.sold && s.sold.winner ? "sold" : "skipped");
    if (s.phase === "match" && !same(s, was)) Sound.play("fight");
    if (s.phase === "match" && s.match.stage === "vote" && same(s, was) && (s.match.voted || 0) > (was.match.voted || 0)) Sound.play("vote", 0.6);
    if (s.phase === "match" && s.match.stage === "result" && !(same(s, was) && was.match.stage === "result")
      && !(judging.battle && judging.matchId === s.match.id)) Sound.play("winner");   // the battle already played its own
    if (s.phase === "champion" && was.phase !== "champion") Sound.play("champion");
  }

  // A beep for each of the last three seconds of any clock, higher on the last.
  let tickSeen = { ends: 0, left: -1 };
  function tickSound() {
    const s = state;
    let ends = 0;
    if (s && s.phase === "auction" && s.lot) ends = s.lot.endsAt;
    else if (s && s.phase === "match" && s.match.stage === "vote") ends = s.match.endsAt;
    if (!ends) { tickSeen = { ends: 0, left: -1 }; return; }
    const left = clock.left(ends);
    const fresh = ends !== tickSeen.ends;
    if (!fresh && left === tickSeen.left) return;
    tickSeen = { ends, left };
    if (fresh) return;   // a clock that just (re)started: let the bid sound have the moment
    if (left > 0 && left <= 3) Sound.play("tock", 0.7, left === 1 ? 1.25 : 1);   // the last three seconds only
    if (left === 0 && s.phase === "match") Sound.play("timeup", 0.8);
  }
  let filmCtl = null;

  let judging = { matchId: null, preps: [null, null], status: "", error: "", film: null };
  const Film = window.Film;

  const announce = t => { announcer.textContent = ""; requestAnimationFrame(() => { announcer.textContent = t; }); };
  const savePrefs = () => safe.set(PREFS_KEY, prefs);
  const player = id => state && state.players.find(p => p.id === id);
  const card = cid => state && state.cards[cid];
  const judgeMode = () => (prefs.judge === "crowd" ? "crowd" : "ai");

  /* --- Connection ------------------------------------------------------ */

  const net = connect({
    onOpen() {
      const host = safe.get(HOST_KEY);
      if (host && host.pin) net.send({ t: "host:resume", pin: host.pin, hostToken: host.hostToken });
      else createRoom();
    },
    onStatus(s) { status = s; const el = document.getElementById("net-status"); if (el) el.textContent = statusText(); },
    onMessage(msg) {
      if (msg.t === "hosting") { pin = msg.pin; safe.set(HOST_KEY, { pin: msg.pin, hostToken: msg.hostToken }); }
      else if (msg.t === "gone") { safe.remove(HOST_KEY); createRoom(); }
      else if (msg.t === "admin-start") { if (state && state.phase === "lobby") startDraft(); }
      else if (msg.t === "film") {   // the admin's phone controls the film on this screen
        if (!filmCtl) return;
        if (msg.action === "play") filmCtl.play();
        else if (msg.action === "pause") filmCtl.pause();
        else if (msg.action === "skip") filmCtl.skip();
      }
      else if (msg.t === "replaced") { error = "This party is now being shown on another screen."; render(true); }
      else if (msg.t === "error") { error = msg.message; render(true); }
      else if (msg.t === "state") {
        clock.sync(msg.state.serverNow);
        const was = state;
        state = msg.state;
        if (!was || was.phase !== state.phase) error = "";
        // The admin can change the pace from their phone: keep this screen's
        // settings in step, so the next game (or the start) doesn't undo it.
        const st = state.settings;
        if (st.bidSeconds !== prefs.bidSeconds || st.autoNext !== prefs.autoNext) {
          prefs.bidSeconds = st.bidSeconds; prefs.autoNext = st.autoNext; savePrefs();
          if (state.phase === "lobby") view = null;   // redraw the settings
        }
        render();
        cues(was, state);
        maybeJudge();
        maybeReason();
      }
    },
  });

  function createRoom() {
    net.send({ t: "host:create", settings: serverSettings() });
  }

  function serverSettings() {
    return {
      judge: judgeMode(),
      team: prefs.team,
      casualties: prefs.casualties,
      film: judgeMode() === "ai" ? prefs.film : "off",
      filmTier: prefs.filmTier,
      skips: prefs.skips,
      bidSeconds: prefs.bidSeconds,
      autoNext: prefs.autoNext,
      voteSeconds: prefs.voteSeconds,
      worldsLabel: prefs.worlds.map(w => U[w].name).join(" + "),
    };
  }

  const statusText = () => status === "open" ? "" : status === "reconnecting" ? "reconnecting to the party server…" : "connecting…";

  /* --- Views ----------------------------------------------------------- */

  function keyFor(s) {
    if (!s) return "none";
    switch (s.phase) {
      case "auction": return `auction:${s.lots}:${s.lot.stage}`;
      case "sold": return `sold:${s.lots}`;
      case "bracket": return `bracket:${s.bracketRound}`;
      case "match": return `match:${s.match.id}:${s.match.stage}`;
      default: return s.phase;
    }
  }

  function render(force) {
    const key = keyFor(state);
    if (force || key !== view) { view = key; full(); }
    else partial();
  }

  function full() {
    if (!state) {
      app.innerHTML = `<p class="hand">${esc(statusText() || "opening a room…")}</p>${error ? `<p class="warn">${esc(error)}</p>` : ""}`;
      return;
    }
    const s = state;
    ({ lobby: lobbyView, auction: auctionView, sold: soldView, teams: teamsView, bracket: bracketView, match: matchView, champion: championView })[s.phase]();
    tick();
    fit();
  }

  function partial() {
    const s = state;
    if (s.phase === "lobby") { updateCloud(); updateStart(); }
    if (s.phase === "auction") updateAuction();
    // The reasoned aftermath of a crowd fight arrives a few seconds after the result.
    if (s.phase === "match" && s.match.stage === "result" && (s.match.aftermath || []).length && !document.querySelector(".aftermath")) full();
    fit();
    if (s.phase === "match" && s.match.stage === "vote") {
      const el = document.getElementById("voted");
      if (el) el.textContent = `${s.match.voted} of ${s.match.voters} voted`;
    }
  }

  const foot = (extra = "") => `
    <div class="controls">
      ${extra}
      <span class="status-dot" id="net-status">${esc(statusText())}</span>
      ${error ? `<p class="warn">${esc(error)}</p>` : ""}
    </div>`;

  const countdown = (endsAt, label) => endsAt
    ? `<span class="hand"><span data-ends="${endsAt}" data-fmt="${esc(label)}"></span></span>` : "";

  function strip() {
    const a = state.arena;
    if (!a) return "";
    return `<div class="strip"><img src="${esc(a.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()" />
      <p><span class="hand">the battle will be fought at</span><br /><span class="title title--md">${esc(a.name)}</span>
      <span class="muted"> ${esc(a.terrain)}</span></p></div>`;
  }

  /* Lobby: room code, QR, who's in, and the settings. */

  function lobbyView() {
    const worlds = Object.entries(U).map(([k, u]) => `
      <label class="opt"><input type="checkbox" name="world" value="${k}" ${prefs.worlds.includes(k) ? "checked" : ""} /><span>${esc(u.name)}</span></label>`).join("");
    const opt = (name, value, label, on) => `<label class="opt"><input type="radio" name="${name}" value="${value}" ${on ? "checked" : ""} /><span>${label}</span></label>`;
    const key = J.gemini.ready();

    app.innerHTML = `
      <div class="lobby">
        <section>
          <p class="hand arrive">a party game for up to 24 phones</p>
          <h1 class="title title--xl arrive" style="--i:1">Character Draft<span class="accent">.</span></h1>
          <div class="join arrive" style="--i:2">
            <div class="join__qr" id="qr" aria-label="QR code to join"></div>
            <div>
              <p class="hand">on your phone, go to</p>
              <p class="join__url">${esc(JOIN_LABEL)}</p>
              <p class="hand">and enter</p>
              <p class="join__pin" aria-label="Game PIN ${esc(state.pin.split("").join(" "))}">${esc(state.pin)}</p>
            </div>
          </div>
          <p class="hand" id="count" style="margin-top: var(--space-md)"></p>
          <p class="muted" id="sound-note">${soundOk ? "" : "Click anywhere on this screen once to turn on the sound."}</p>
          <div class="roster-cloud" id="cloud"></div>
          ${foot(`<button class="btn btn--primary btn--big" type="button" id="start">Start the draft</button>`)}
        </section>

        <section class="settings arrive" style="--i:3">
          <fieldset>
            <legend>Worlds in the deck</legend>
            <div class="opts">${worlds}</div>
            <button class="btn btn--quiet" type="button" id="all-worlds">${prefs.worlds.length === Object.keys(U).length ? "Clear all" : "Select all"}</button>
          </fieldset>
          <fieldset>
            <legend>Who decides each fight</legend>
            <div class="opts">
              ${opt("judge", "gemini", "AI judge: Gemini", prefs.judge === "gemini")}
              ${opt("judge", "local", "AI judge: on this computer", prefs.judge === "local")}
              ${opt("judge", "crowd", "The crowd votes on their phones", prefs.judge === "crowd")}
            </div>
            ${prefs.judge === "gemini" || (prefs.judge === "crowd" && prefs.casualties) ? (key
              ? `<p class="muted" style="margin-top:.4rem">${J.gemini.key() ? "Gemini key saved on this computer." : "Using Grace's PIN for Gemini."} <button class="btn btn--quiet" type="button" id="forget-key">Forget it</button></p>`
              : `<label class="field" style="margin-top:.5rem"><span class="field__label">Gemini API key (free from Google AI Studio), or Grace's PIN</span>
                   <input class="field__input" id="key" type="password" autocomplete="off" spellcheck="false" placeholder="Your key, or the PIN" value="${esc(typed.key || "")}" /></label>`)
              : prefs.judge === "local" ? `<p class="muted" style="margin-top:.4rem">Runs Qwen 3.5 on this computer's graphics card: a 2.4GB download the first time, and a minute or two per fight.</p>` : ""}
          </fieldset>
          <fieldset>
            <legend>Team size</legend>
            <div class="opts">${[3, 4, 5].map(n => opt("team", n, `${n} each`, prefs.team === n)).join("")}</div>
          </fieldset>
          <fieldset>
            <legend>Skips each</legend>
            <div class="opts">${[0, 1, 2, 3].map(n => opt("skips", n, String(n), prefs.skips === n)).join("")}</div>
          </fieldset>
          <fieldset>
            <legend>Clock after each bid</legend>
            <div class="opts">${[3, 5, 8, 10, 15].map(n => opt("bidsecs", n, `${n} seconds`, prefs.bidSeconds === n)).join("")}</div>
          </fieldset>
          <fieldset>
            <legend>After each card is sold</legend>
            <div class="opts">
              ${opt("autonext", "off", "Wait for the host to move on", !prefs.autoNext)}
              ${opt("autonext", "on", "Next card comes up by itself", prefs.autoNext)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Sound on this screen</legend>
            <div class="opts">
              ${opt("sound", "all", "Effects and music", prefs.sound === "all")}
              ${opt("sound", "effects", "Effects only", prefs.sound === "effects")}
              ${opt("sound", "off", "Off", prefs.sound === "off")}
            </div>
            <div class="opts" style="margin-top:.3rem">
              ${opt("announce", "on", "Read out each character's name", prefs.announceNames)}
              ${opt("announce", "off", "Don't", !prefs.announceNames)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Lasting harm, with three or more players</legend>
            <div class="opts">
              ${opt("casualties", "on", "Injuries, broken gear and deaths carry on", prefs.casualties)}
              ${opt("casualties", "off", "Everyone starts each fight fresh", !prefs.casualties)}
            </div>
            ${prefs.casualties ? `<p class="muted" style="margin-top:.3rem">Harm is always reasoned, never random: the AI judge says what each fight did${prefs.judge === "crowd"
              ? ", and after a crowd vote Gemini works out what the result cost (add a key or the PIN above; without one, crowd fights leave everyone unhurt)" : ""}.</p>` : ""}
          </fieldset>
          ${prefs.judge !== "crowd" ? `<fieldset>
            <legend>Show each fight</legend>
            <div class="opts">
              ${opt("battle8", "on", "As an 8-bit battle, then the winner", prefs.battle8)}
              ${opt("battle8", "off", "Straight to the winner", !prefs.battle8)}
            </div>
          </fieldset>` : ""}
          <fieldset>
            <legend>Film the fights</legend>
            <div class="opts">
              ${opt("film", "off", "No films", prefs.film === "off")}
              ${opt("film", "final", "Just the final", prefs.film === "final")}
              ${opt("film", "all", "Every fight", prefs.film === "all")}
            </div>
            ${prefs.film !== "off" ? `<div class="opts" style="margin-top:.4rem">${["quick", "feature", "epic"].map(t => opt("filmtier", t, `${t[0].toUpperCase() + t.slice(1)} <span class="chip__meta" data-tierprice="${t}"></span>`, prefs.filmTier === t)).join("")}</div>
              <p class="muted" id="film-note" style="margin-top:.3rem"></p>
              ${J.pin.get() ? "" : Film.ownKey.get() ? `<p class="muted">Films use your Higgsfield key.</p>` : `<label class="field" style="margin-top:.4rem"><span class="field__label">Higgsfield key (key id:secret), or Grace's PIN</span>
                <input class="field__input" id="hf-key" type="password" autocomplete="off" spellcheck="false" placeholder="Your key, or the PIN" value="${esc(typed["hf-key"] || "")}" /></label>`}` : ""}
          </fieldset>
          <p class="muted">Everyone gets $${state.settings.budget}. One character at a time goes up for auction: whoever's turn it is
            opens the bidding or spends a skip to send it away. Then anyone can raise from their phone, and every bid resets the clock.
            Highest bid when it runs out takes them. Then it's a knockout tournament on this screen.</p>
          <p class="hand" id="estimate"></p>
        </section>
      </div>`;

    try {
      new QRCode(document.getElementById("qr"), { text: `${JOIN_URL}#${state.pin}`, width: 256, height: 256, colorDark: "#241f1a", colorLight: "#ffffff" });
    } catch { document.getElementById("qr").remove(); }

    app.querySelectorAll('[name="world"]').forEach(i => i.addEventListener("change", () => {
      prefs.worlds = [...app.querySelectorAll('[name="world"]:checked')].map(x => x.value);
      savePrefs(); sendSettings(); updateStart();
      document.getElementById("all-worlds").textContent = prefs.worlds.length === Object.keys(U).length ? "Clear all" : "Select all";
    }));
    document.getElementById("all-worlds").addEventListener("click", () => {
      const all = prefs.worlds.length === Object.keys(U).length;
      prefs.worlds = all ? [] : Object.keys(U);
      savePrefs(); sendSettings(); render(true);
    });
    app.querySelectorAll('[name="judge"]').forEach(i => i.addEventListener("change", () => {
      prefs.judge = i.value; savePrefs(); sendSettings(); render(true);
    }));
    app.querySelectorAll('[name="casualties"]').forEach(i => i.addEventListener("change", () => {
      prefs.casualties = i.value === "on"; savePrefs(); sendSettings(); render(true);
    }));
    app.querySelectorAll('[name="film"]').forEach(i => i.addEventListener("change", () => {
      prefs.film = i.value; savePrefs(); sendSettings(); render(true);
    }));
    app.querySelectorAll('[name="filmtier"]').forEach(i => i.addEventListener("change", () => {
      prefs.filmTier = i.value; savePrefs(); sendSettings(); priceFilms();
    }));
    if (prefs.film !== "off") priceFilms();
    app.querySelectorAll('[name="battle8"]').forEach(i => i.addEventListener("change", () => { prefs.battle8 = i.value === "on"; savePrefs(); }));
    app.querySelectorAll('[name="sound"]').forEach(i => i.addEventListener("change", () => setSound(i.value)));
    app.querySelectorAll('[name="announce"]').forEach(i => i.addEventListener("change", () => {
      prefs.announceNames = i.value === "on"; savePrefs();
    }));
    app.querySelectorAll('[name="autonext"]').forEach(i => i.addEventListener("change", () => {
      prefs.autoNext = i.value === "on"; savePrefs(); sendSettings(); updateStart();
    }));
    [["team", "team"], ["skips", "skips"], ["bidsecs", "bidSeconds"]].forEach(([name, key]) => {
      app.querySelectorAll(`[name="${name}"]`).forEach(i => i.addEventListener("change", () => {
        prefs[key] = Number(i.value); savePrefs(); sendSettings(); updateStart();
      }));
    });
    on("forget-key", () => { J.gemini.forgetKey(); render(true); });
    ["key", "hf-key"].forEach(watchKey);
    on("start", startDraft);
    updateCloud();
    updateStart();
  }

  function sendSettings() { net.send({ t: "host:settings", settings: serverSettings() }); }

  /* Keys and the PIN are kept as soon as they're entered, so changing a
     setting (which redraws the lobby) never loses them, and the PIN typed
     in either box unlocks both Gemini and films at once. */
  const typed = {};
  let pinTimer = null;
  function watchKey(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      typed[id] = el.value;
      updateStart();
      clearTimeout(pinTimer);
      const v = el.value.trim();
      if (J.pin.looksLike(v)) pinTimer = setTimeout(() => tryPin(v), 350);
    });
    el.addEventListener("change", () => {
      const v = el.value.trim();
      if (!v || J.pin.looksLike(v)) return;
      if (id === "key") { J.gemini.saveKey(v); typed.key = ""; render(true); }
      else if (Film.ownKey.looksLike(v)) { Film.ownKey.set(v); typed["hf-key"] = ""; render(true); }
      else { error = "That doesn't look like a Higgsfield key (key id:secret)."; render(true); }
    });
  }

  async function tryPin(v) {
    let ok = false;
    try { ok = await J.pin.verify(v); } catch (err) { error = err.message; return render(true); }
    if (!ok) { error = "That PIN isn't right."; return render(true); }
    typed.key = ""; typed["hf-key"] = ""; error = "";
    render(true);
  }

  // What filming will cost, per fight and for the whole tournament.
  async function priceFilms() {
    let q = null, rate = 1.7;
    try { [q, rate] = await Promise.all([Film.quote(), Film.nzdRate()]); } catch { /* shown below */ }
    const note = document.getElementById("film-note");
    if (!q) { if (note) note.textContent = "Films aren't available right now."; return; }
    q.tiers.forEach(t => { const el = document.querySelector(`[data-tierprice="${t.id}"]`); if (el) el.textContent = `NZ$${(t.usd * rate).toFixed(2)} a fight`; });
    const tier = q.tiers.find(t => t.id === prefs.filmTier) || q.tiers[0];
    const fights = prefs.film === "final" ? 1 : Math.max(1, state.players.length - 1);
    if (note) {
      note.textContent = (judgeMode() === "crowd" ? "Films need an AI judge, so pick Gemini or this computer above. " : "")
        + `${fights === 1 ? "One film" : `About ${fights} films`}: around NZ$${(tier.usd * rate * fights).toFixed(2)} in all. `
        + "Each takes a few minutes to make; the winner is revealed when it ends.";
    }
  }

  function updateCloud() {
    const cloud = document.getElementById("cloud");
    if (!cloud) return;
    const ps = state.players;
    document.getElementById("count").textContent = ps.length
      ? `${ps.length} of 24 in. ${esc(ps[0].name)} joined first, so they can run the show from their phone.`
      : "Waiting for players to join… the first to join runs the show from their phone.";
    // Only names that have just joined get the arrival; the rest stay put.
    const seen = new Set((cloud.dataset.seen || "").split(",").filter(Boolean));
    cloud.dataset.seen = ps.map(p => p.id).join(",");
    cloud.innerHTML = ps.map(p => `
      <span class="chip ${seen.has(p.id) ? "" : "arrive"} ${p.connected ? "" : "chip--off"}">${esc(p.name)}
        <button class="chip__x" type="button" data-kick="${p.id}" aria-label="Remove ${esc(p.name)}">×</button></span>`).join("");
    cloud.querySelectorAll("[data-kick]").forEach(b => b.addEventListener("click", () => net.send({ t: "host:kick", playerId: b.dataset.kick })));
  }

  function updateStart() {
    const b = document.getElementById("start");
    if (!b) return;
    const needKey = prefs.judge === "gemini" && !J.gemini.ready() && !(document.getElementById("key") || {}).value;
    b.disabled = state.players.length < 2 || !prefs.worlds.length || needKey;
    b.textContent = state.players.length < 2 ? "Waiting for 2 players" : needKey ? "Add a Gemini key first" : "Start the draft";
    // Roughly how long the draft will run: each card takes the opener's
    // moment plus a few rounds of bidding.
    const est = document.getElementById("estimate");
    if (est && state.players.length >= 2) {
      const cards = Math.ceil(state.players.length * prefs.team * 1.25);
      const mins = Math.max(1, Math.round(cards * (8 + prefs.bidSeconds * 2.2) / 60));
      est.textContent = `about ${mins} minutes of drafting for ${state.players.length} players`;
    }
  }

  function buildDeck() {
    const deck = [];
    for (const w of prefs.worlds) {
      const u = U[w];
      u.characters.forEach(([name, note], i) => {
        const tags = [];
        if ((u.strategists || []).includes(name)) tags.push("known for strategy");
        if ((u.makers || []).includes(name)) tags.push("builds gear");
        deck.push({ id: `${w}:${i}`, name, note, world: w, worldName: u.name, image: (IMAGES[w] || {})[name] || "", tags });
      });
    }
    return deck;
  }

  function drawArena() {
    const all = prefs.worlds.flatMap(w => (U[w].arenas || []).map(a => ({ name: a[0], terrain: a[1], image: a[2], world: w, worldName: U[w].name })));
    return all.length ? all[Math.floor(Math.random() * all.length)] : null;
  }

  async function startDraft() {
    const hfInput = document.getElementById("hf-key");
    const hfTyped = hfInput && hfInput.value.trim();
    if (hfTyped && J.pin.looksLike(hfTyped)) {
      let ok = false;
      try { ok = await J.pin.verify(hfTyped); } catch (err) { error = err.message; return render(true); }
      if (!ok) { error = "That PIN isn't right."; return render(true); }
    } else if (hfTyped) {
      if (!Film.ownKey.looksLike(hfTyped)) { error = "That doesn't look like a Higgsfield key (key id:secret)."; return render(true); }
      Film.ownKey.set(hfTyped);
    }
    const keyInput = document.getElementById("key");
    const typed = keyInput && keyInput.value.trim();
    if (typed && J.pin.looksLike(typed)) {
      let ok = false;
      try { ok = await J.pin.verify(typed); } catch (err) { error = err.message; return render(true); }
      if (!ok) { error = "That PIN isn't right."; return render(true); }
    } else if (typed) J.gemini.saveKey(typed);
    net.send({ t: "host:start", settings: serverSettings(), deck: buildDeck(), arena: drawArena() });
  }

  /* The auction: one card on the block, the bids, and the clock. */

  function playerChips() {
    const lot = state.lot;
    return state.players.map(p => {
      const out = !p.active;
      const turn = lot && lot.stage === "open" && lot.opener === p.id;
      const lead = lot && lot.leader === p.id;
      return `<span class="chip ${turn || lead ? "chip--locked" : ""} ${out || !p.connected ? "chip--off" : ""}">${esc(p.name)}
        <span class="chip__meta">$${p.budget} · ${p.roster.length}/${state.settings.team} · ${p.skips} skip${p.skips === 1 ? "" : "s"}${out ? " · done" : lead ? " · leading" : turn ? " · to open" : ""}</span></span>`;
    }).join("");
  }

  function cardHtml(c, k, extra = "") {
    return `<article class="card arrive" style="--i:${k}">${picture(c, "pic--lg")}
      <span class="card__name">${esc(c.name)}</span>
      <span class="card__note">${esc(c.worldName)} · ${esc(c.note)}</span>
      ${(c.tags || []).map(t => `<span class="card__tag">${esc(t)}</span>`).join("")}
      ${extra}</article>`;
  }

  function lotStatus() {
    const lot = state.lot;
    if (lot.stage === "open") {
      return `<p class="hand">${esc(player(lot.opener).name)}'s turn</p>
        <p class="title title--lg">Open the bidding, or skip<span class="accent">.</span></p>`;
    }
    if (lot.stage === "open-all") {
      return `<p class="hand">${esc(player(lot.skippedBy).name)} skipped</p>
        <p class="title title--lg">Anyone else can open the bidding<span class="accent">.</span></p>`;
    }
    const lead = player(lot.leader);
    return `<p class="hand">highest bid</p>
      <p class="lot__bid"><span class="money">$${lot.bid}</span> <span class="title title--md">${esc(lead ? lead.name : "")}</span></p>
      <ul class="lot__bids">${lot.bids.slice(0, -1).reverse().map(b => `<li>${esc((player(b.player) || {}).name || "?")} $${b.amount}</li>`).join("")}</ul>`;
  }

  function auctionView() {
    const s = state, lot = s.lot, c = card(lot.card);
    const total = lot.stage === "open" ? s.settings.openSeconds : s.settings.bidSeconds;
    app.innerHTML = `
      <div class="topline">
        <p class="hand">card ${s.lots} · ${s.deckLeft} left in the deck · every bid resets the clock</p>
        ${strip().replace('class="strip"', 'class="strip strip--slim"')}
      </div>
      <div class="lot">
        <div class="lot__card">${cardHtml(c, 0)}</div>
        <div class="lot__side">
          <div id="lot-status">${lotStatus()}</div>
          <span class="timer lot__timer" data-ends="${lot.endsAt}" data-fmt="{s}" id="lot-timer"></span>
          <div class="bar"><span data-bar="${lot.endsAt}" data-total="${total}" id="lot-bar"></span></div>
          <p class="hand">${lot.stage === "open" ? "on their phone" : lot.stage === "open-all" ? "open from your phone" : "raise from your phone"}</p>
        </div>
      </div>
      <div class="players-bar" id="players-bar">${playerChips()}</div>
      ${foot(lot.stage === "bidding" ? `<button class="btn btn--quiet" type="button" id="next">Sold! Close the bidding now</button>`
        : lot.stage === "open-all" ? `<button class="btn btn--quiet" type="button" id="next">Nobody wants them: move on</button>` : "")}`;
    on("next", () => net.send({ t: "host:next" }));
    if (lot.stage === "open") announce(`${c.name} is up. ${player(lot.opener).name} opens or skips.`);
  }

  // A new bid doesn't redraw the card: just the bid, the clock and the chips.
  function updateAuction() {
    const lot = state.lot;
    const st = document.getElementById("lot-status");
    if (!st) return;
    st.innerHTML = lotStatus();
    const t = document.getElementById("lot-timer"), b = document.getElementById("lot-bar");
    if (t) t.dataset.ends = lot.endsAt;
    if (b) b.dataset.bar = lot.endsAt;
    document.getElementById("players-bar").innerHTML = playerChips();
    const lead = player(lot.leader);
    if (lead) announce(`$${lot.bid}, ${lead.name}.`);
  }

  function soldView() {
    const s = state, r = s.sold, c = card(r.card);
    const w = player(r.winner), skipper = player(r.skippedBy);
    const line = w
      ? `<h1 class="title title--xl arrive">Sold to <em>${esc(w.name)}</em><span class="accent">.</span></h1>
         <p class="title title--lg">for $${r.amount}</p>`
      : `<h1 class="title title--xl arrive">Skipped<span class="accent">.</span></h1>
         <p class="big-note">${skipper ? `${esc(skipper.name)} skipped, and nobody else opened the bidding.` : ""} Gone for good.</p>`;
    app.innerHTML = `
      <div class="lot">
        <div class="lot__card">${cardHtml(c, 0)}</div>
        <div class="lot__side">${line}<p class="hand">${countdown(s.endsAt, "next card in {s}")}</p></div>
      </div>
      <div class="players-bar">${playerChips()}</div>
      ${foot(`<button class="btn btn--primary" type="button" id="next">Next card</button>`)}`;
    on("next", () => net.send({ t: "host:next" }));
    announce(w ? `Sold to ${w.name} for $${r.amount}.` : "Skipped.");
  }

  /* Teams, then the bracket. */

  // A character's picture, marked if an earlier fight hurt, disarmed or killed them.
  const condition = cid => (state.conditions || {})[cid];
  const condWord = c => !c ? "" : c.status === "dead" ? "fallen" : c.status === "broken" ? "gear broken" : "injured";
  function marked(c, size) {
    const k = condition(c.id);
    return `<span class="cpic ${k ? `cpic--${k.status}` : ""}" title="${k ? esc(`${condWord(k)}: ${k.note}`) : ""}">${picture(c, size)}${k ? `<span class="cpic__tag">${condWord(k)}</span>` : ""}</span>`;
  }

  function teamHtml(p, k) {
    const cards = p.roster.map(r => card(r.card)).filter(Boolean);
    return `<article class="team arrive" style="--i:${k}">
      <p class="team__name">${esc(p.name)} <span class="chip__meta">$${p.budget} left</span></p>
      <div class="team__pics">${cards.map(c => marked(c, "pic--sm")).join("") || `<span class="muted">nobody</span>`}</div>
      <ul class="team__list">${cards.map(c => { const x = condition(c.id); return `<li>${esc(c.name)}${x ? ` <span class="cond">(${condWord(x)})</span>` : ""}</li>`; }).join("")}</ul></article>`;
  }

  function teamsView() {
    app.innerHTML = `
      <p class="hand">the draft is done</p>
      <h1 class="title title--lg" style="margin-bottom: var(--space-sm)">The teams are in<span class="accent">.</span></h1>
      ${strip()}
      <div class="teams">${state.players.map(teamHtml).join("")}</div>
      ${foot(`<button class="btn btn--primary btn--big" type="button" id="next">Start the tournament</button>`)}`;
    on("next", () => net.send({ t: "host:next" }));
    announce("The draft is done. The teams are in.");
  }

  function roundName(r) {
    const n = state.bracket[r].length;
    return n === 1 ? "The final" : n === 2 ? "Semi-finals" : n === 4 ? "Quarter-finals" : `Round of ${n * 2}`;
  }

  function bracketHtml() {
    const cur = state.match && state.match.id;
    return `<div class="bracket">${state.bracket.map((round, r) => `
      <div class="bracket__round"><span class="bracket__label">${roundName(r)}</span>
        ${round.map(m => {
          const side = id => {
            const p = player(id);
            if (!p) return `<span class="bout__side bout__side--empty">${r === 0 ? "bye" : "…"}</span>`;
            const cls = m.winner ? (m.winner === id ? "bout__side--won" : "bout__side--lost") : "";
            return `<span class="bout__side ${cls}">${esc(p.name)}</span>`;
          };
          return `<div class="bout ${m.id === cur ? "bout--now" : ""}">${side(m.a)}${side(m.b)}</div>`;
        }).join("")}
      </div>`).join("")}</div>`;
  }

  function bracketView() {
    const s = state;
    app.innerHTML = `
      <div class="topline">
        <div><p class="hand">knockout tournament</p>
          <h1 class="title title--lg">${roundName(s.bracketRound)}<span class="accent">.</span></h1></div>
        ${countdown(s.endsAt, "first fight in {s}")}
      </div>
      ${bracketHtml()}
      ${foot(`<button class="btn btn--primary" type="button" id="next">Fight</button>`)}`;
    on("next", () => net.send({ t: "host:next" }));
    announce(roundName(s.bracketRound));
  }

  /* A match: two teams, then the crowd's vote or the AI judge, then the result. */

  function sideHtml(id, k) {
    const p = player(id);
    const m = state.match;
    const cards = p.roster.map(r => card(r.card)).filter(Boolean);
    const won = m.stage === "result" ? (m.winner === id ? "side--won" : "side--lost") : "";
    // Plans show while the councils work; the result screen keeps to the result.
    const prep = m.stage === "judging" && judging.matchId === m.id && judging.preps[k];
    return `<section class="side ${won}" id="side-${k}">
      <p class="hand">${k === 0 ? "in this corner" : "and in this corner"}</p>
      <h2 class="title title--lg">${esc(p.name)}</h2>
      <div class="side__pics">${cards.map(c => marked(c, "pic--lg")).join("")}</div>
      <p class="side__names">${cards.map(c => { const x = condition(c.id); return esc(c.name) + (x ? ` <span class="cond">(${condWord(x)})</span>` : ""); }).join(" · ")}</p>
      ${prep ? `<div class="side__plan"><span class="hand">led by ${esc(prep.leader)}</span><br />${esc(prep.plan)}
        ${(prep.gear || []).length ? `<br /><span class="hand">gear:</span> ${prep.gear.map(g => esc(g.name)).join(", ")}` : ""}</div>` : ""}
    </section>`;
  }

  function matchView() {
    const s = state, m = s.match;
    let middle = "";
    if (m.stage === "vote") {
      middle = `<div class="topline"><p class="title title--md">Vote on your phones<span class="accent">.</span> <span class="hand" id="voted">${m.voted} of ${m.voters} voted</span></p>
        <span class="timer" data-ends="${m.endsAt}" data-fmt="{s}"></span></div>
        <div class="bar"><span data-bar="${m.endsAt}" data-total="${s.settings.voteSeconds}"></span></div>`;
    } else if (m.stage === "judging" && judging.matchId === m.id && judging.battle) {
      // Rebuilding the screen keeps the same battle going rather than restarting it.
      const b = judging.battle;
      app.innerHTML = `<p class="hand">${esc(player(m.a).name)} vs ${esc(player(m.b).name)}${m.final ? " · the final" : ""}</p>`;
      if (!b.el) {
        b.el = document.createElement("div");
        b.el.className = "tv-film tv-film--full tv-battle";
        app.appendChild(b.el);
        b.ctl = filmCtl = Battle.player(b.el, { teams: b.teams, verdict: b.verdict, arena: b.arena, worldName: w => (U[w] || {}).name || w }, {
          onState: st => {
            if (judging.battle !== b) return;
            if (st === "playing") net.send({ t: "host:film", matchId: m.id, film: "playing" });
            if (st === "paused") net.send({ t: "host:film", matchId: m.id, film: "ready" });
          },
          onEnd: () => {
            if (filmCtl === b.ctl) filmCtl = null;
            net.send({ t: "host:film", matchId: m.id, film: null });
            finishJudged();
          },
        });
      } else app.appendChild(b.el);
      return;
    } else if (m.stage === "judging" && judging.matchId === m.id && judging.film && judging.film.ready) {
      // The film gets the whole screen.
      app.innerHTML = `<p class="hand">${esc(player(m.a).name)} vs ${esc(player(m.b).name)} · press play here, or on the admin's phone</p>
        <div id="tv-film" class="tv-film tv-film--full"></div>`;
      filmCtl = Film.player(document.getElementById("tv-film"), judging.film, {
        onEnd: () => { filmCtl = null; net.send({ t: "host:film", matchId: m.id, film: null }); finishJudged(); },
        onState: st => {
          if (st === "playing" || st === "muted") net.send({ t: "host:film", matchId: m.id, film: "playing" });
          if (st === "paused") net.send({ t: "host:film", matchId: m.id, film: "ready" });
          const note = app.querySelector(".hand");
          if (note && st === "muted") note.textContent = "Sound is off: click the screen once to turn it on.";
        },
      });
      return;
    } else if (m.stage === "judging") {
      const f = judging.matchId === m.id && judging.film;
      middle = `<p class="hand" id="judge-status">${esc(judging.matchId === m.id ? judging.status : "the judge is getting ready…")}</p>
        ${f ? `${Film.makingBar(f.startedAt, f.shots.length)}<ol class="shotlist">${f.shots.map(x => `<li class="${x.url ? "shot--done" : ""}"><span class="hand">${esc(x.label)} · ${x.url ? "ready" : esc(String(x.status).replace("_", " "))}</span><br />${esc(x.caption)}</li>`).join("")}</ol>
          <button class="btn btn--quiet" type="button" id="skip-film">Skip the film</button>` : ""}
        ${judging.matchId === m.id && judging.error ? `<p class="warn">${esc(judging.error)}</p>
          <div class="controls"><button class="btn btn--primary" type="button" id="retry">Try the judge again</button>
          <button class="btn" type="button" id="crowd">Let the crowd decide this one</button></div>` : ""}`;
    } else {
      const w = player(m.winner);
      const total = m.tally ? m.tally[0] + m.tally[1] : 0;
      middle = `<h1 class="title title--xl arrive"><em>${esc(w.name)}</em> wins<span class="accent">.</span></h1>
        ${total ? `<div class="tally"><span style="width:${(m.tally[0] / total) * 100}%"></span><span style="width:${(m.tally[1] / total) * 100}%"></span></div>
          <p class="hand">${m.tally[0]} votes to ${m.tally[1]}${m.tie ? ", a tie, so a coin decided it" : ""}</p>` : ""}
        ${m.tie && !total ? `<p class="hand">nobody voted, so a coin decided it</p>` : ""}
        ${(m.aftermath || []).length ? `<div class="aftermath arrive" style="--i:1"><span class="hand">${m.walkover ? "" : "what the fight cost"}</span><ul>${m.aftermath.map(a => {
          const c = card(a.card);
          return `<li>${c ? marked(c, "pic--xs") : ""}<span><em>${esc(c ? c.name : "?")}</em> ${a.status === "dead" ? "fell" : a.status === "broken" ? "lost their gear" : "was injured"}: ${esc(a.note)}</span></li>`;
        }).join("")}</ul></div>` : ""}
        ${m.walkover ? `<p class="big-note">${esc(player(m.winner === m.a ? m.b : m.a).name)}'s team has nobody left standing, so ${esc(w.name)} goes through.</p>` : ""}
        ${m.verdict ? `<div class="verdict arrive" style="--i:2"><p class="big-note"><em>${esc(m.verdict.verdict)}</em></p>
          <p><span class="hand">turning point</span> ${esc(m.verdict.turning_point)}</p>
          <p><span class="hand">most valuable</span> ${esc(m.verdict.mvp)}</p>
          <p class="hand">judged by ${esc(m.verdict.by)} · the whole story is in recent battles</p></div>` : ""}
        <div class="controls">${countdown(s.endsAt, "next fight in {s}")}<button class="btn btn--primary" type="button" id="next">Next</button></div>`;
    }
    app.innerHTML = `
      <p class="hand">${roundName(m.id && s.bracket.findIndex(r => r.some(x => x.id === m.id)))}</p>
      ${strip()}
      <div class="versus">${sideHtml(m.a, 0)}<span class="versus__vs">vs</span>${sideHtml(m.b, 1)}</div>
      <div style="margin-top: var(--space-md)">${middle}</div>
      ${foot(m.stage === "vote" ? `<button class="btn btn--quiet" type="button" id="close-vote">Close the vote</button>` : "")}`;
    on("next", () => net.send({ t: "host:next" }));
    on("close-vote", () => net.send({ t: "host:next" }));
    on("retry", () => { judging.matchId = null; maybeJudge(); });
    on("crowd", () => net.send({ t: "host:crowd" }));
    on("skip-film", () => { if (judging.film) judging.film.skip = true; net.send({ t: "host:film", matchId: m.id, film: null }); finishJudged(); });
    if (m.stage === "vote") announce(`${player(m.a).name} against ${player(m.b).name}. Vote on your phones.`);
    if (m.stage === "result") announce(`${player(m.winner).name} wins.`);
  }

  function championView() {
    const p = player(state.champion);
    app.innerHTML = p ? `
      <div class="champion">
        <p class="hand arrive">the champion</p>
        <h1 class="title title--xl arrive" style="--i:1"><em>${esc(p.name)}</em><span class="accent">.</span></h1>
        <div class="arrive" style="--i:2; max-width: 40rem; margin: var(--space-md) auto 0">${teamHtml(p, 0)}</div>
        <div class="controls" style="justify-content:center">
          <button class="btn btn--primary btn--big" type="button" id="again">Play again with everyone</button>
          <button class="btn" type="button" id="new-room">New room</button>
        </div>
      </div>` : `<p class="hand">Nobody drafted a team, so there's no tournament.</p>
        <div class="controls"><button class="btn btn--primary" type="button" id="again">Play again</button></div>`;
    on("again", () => net.send({ t: "host:again" }));
    on("new-room", () => { safe.remove(HOST_KEY); createRoom(); });
    if (p) announce(`${p.name} is the champion.`);
  }

  /* --- The AI judge, run here on the TV --------------------------------- */

  // The fallen don't fight; the hurt fight on, marked for the judge.
  function teamFor(id) {
    const p = player(id);
    return {
      name: p.name,
      left: p.budget,
      roster: p.roster.filter(r => !(condition(r.card) && condition(r.card).status === "dead")).map(r => {
        const c = card(r.card);
        return { id: c.id, name: c.name, note: c.note, world: c.world, price: r.price, condition: condition(r.card) || null };
      }),
    };
  }

  const lasting = () => state.settings.casualties && state.players.filter(p => p.roster.length).length >= 3;
  const filmsThis = m => state.settings.film === "all" || (state.settings.film === "final" && m.final);

  // Send the verdict once the film (if any) has played or been skipped.
  // The fight as an 8-bit battle on this screen, then the result. The admin's
  // phone can pause or skip it, just like a film.
  function showBattle(matchId, teams, v, arena) {
    if (!prefs.battle8 || judging.matchId !== matchId) return finishJudged();
    judging.battle = { teams, verdict: v, arena, el: null, ctl: null };
    net.send({ t: "host:film", matchId, film: "playing" });
    render(true);
  }

  function finishJudged() {
    const j = judging;
    if (!j.pending || j.sent) return;
    j.sent = true;
    net.send(j.pending);
  }

  async function maybeJudge() {
    const m = state && state.match;
    if (!m || state.phase !== "match" || m.stage !== "judging") return;
    if (judging.matchId === m.id) return;
    const matchId = m.id;
    judging = { matchId, preps: [null, null], status: "The war councils are meeting…", error: "", film: null, pending: null, sent: false };
    render(true);
    const teams = [teamFor(m.a), teamFor(m.b)];
    const a = state.arena;
    const arena = a ? { name: a.name, terrain: a.terrain, world: a.world } : null;
    const setStatus = (t) => {
      if (judging.matchId !== matchId) return;
      judging.status = t;
      const el = document.getElementById("judge-status");
      if (el) el.textContent = t;
    };
    try {
      J.local.modelId = J.local.models[0].id;
      const kind = prefs.judge === "local" ? "local" : "gemini";
      const v = await J.run(kind, {
        teams, arena, aftermath: lasting(),
        worldName: w => (U[w] || {}).name || w,
        onStatus: setStatus,
        onPrep: (i, prep) => {
          if (judging.matchId !== matchId) return;
          judging.preps[i] = prep;
          const el = document.getElementById(`side-${i}`);
          if (el) el.outerHTML = sideHtml(i === 0 ? m.a : m.b, i);
        },
      });
      if (!state.match || state.match.id !== matchId) return;
      const side = v.winner === teams[1].name ? 1 : 0;
      const aftermath = (v.aftermath || []).filter(a => a.status !== "fine")
        .map(a => ({ card: a.id, status: a.status === "gear_broken" ? "broken" : a.status, note: a.note }));
      judging.pending = { t: "host:result", matchId, side, verdict: v, aftermath };

      if (filmsThis(m)) {
        try {
          const q = await Film.quote();
          const tier = q.tiers.find(t => t.id === state.settings.filmTier) || q.tiers[0];
          const board = await J.storyboard(kind, { teams, verdict: v, arena, worldName: w => (U[w] || {}).name || w, shots: tier.shots, onStatus: setStatus });
          setStatus("Sending the storyboard to the studio…");
          const job = await Film.start({ tier: tier.id, prompts: Object.fromEntries(tier.shots.map(x => [x.key, board.shots[x.key].prompt])) });
          const label = k => k.startsWith("prep_a") ? `${teams[0].name}'s war council prepares` : k.startsWith("prep_b") ? `${teams[1].name}'s war council prepares` : "The battle";
          judging.film = { startedAt: Date.now(), shots: tier.shots.map(x => ({ key: x.key, duration: x.duration, label: label(x.key), caption: board.shots[x.key].caption, speaker: board.shots[x.key].speaker, line: board.shots[x.key].line, url: null, status: "queued" })) };
          net.send({ t: "host:film", matchId, film: "making" });
          setStatus("Filming the fight. This takes a few minutes; the winner is revealed when it ends.");
          render(true);
          await Film.wait(job.id, st => {
            if (judging.matchId !== matchId || !judging.film || judging.film.skip) return;
            st.shots.forEach(x => { const sh = judging.film.shots.find(y => y.key === x.key); if (sh) { sh.status = x.status; sh.url = x.url || sh.url; } });
            if (!judging.film.ready) render(true);
          });
          if (judging.matchId !== matchId || judging.film.skip) return;
          v.film = { shots: judging.film.shots };
          judging.film.ready = judging.film.shots.some(x => x.url);
          keepParty(teams, v);
          if (!judging.film.ready) { net.send({ t: "host:film", matchId, film: null }); return showBattle(matchId, teams, v, arena); }
          net.send({ t: "host:film", matchId, film: "ready" });
          return render(true);   // the film plays, then finishJudged sends the result
        } catch (err) {
          judging.film = null;
          setStatus(`No film this time (${err.message}). Here's the verdict.`);
        }
      }
      keepParty(teams, v);
      showBattle(matchId, teams, v, arena);
    } catch (err) {
      if (judging.matchId !== matchId) return;
      judging.error = err.message || "The judge couldn't decide.";
      render(true);
    }
  }

  // After a crowd vote, reason out what the fight cost (never rolled).
  let reasonedFor = null;
  async function maybeReason() {
    const m = state && state.match;
    if (!m || state.phase !== "match" || m.stage !== "result" || m.verdict || m.walkover) return;
    if (!lasting() || (m.aftermath || []).length || reasonedFor === m.id) return;
    const kind = prefs.judge === "local" ? "local" : J.gemini.ready() ? "gemini" : null;
    if (!kind) return;
    reasonedFor = m.id;
    const winner = player(m.winner).name;
    const a = state.arena;
    try {
      const list = await J.aftermathOf(kind, {
        teams: [teamFor(m.a), teamFor(m.b)], winner,
        arena: a ? { name: a.name, terrain: a.terrain, world: a.world } : null,
        worldName: w => (U[w] || {}).name || w,
      });
      net.send({ t: "host:aftermath", matchId: m.id, aftermath: list.filter(x => x.status !== "fine")
        .map(x => ({ card: x.id, status: x.status === "gear_broken" ? "broken" : x.status, note: x.note })) });
    } catch { /* no reasoning, no harm */ }
  }

  // AI-judged fights go into this browser's recent battles, like the two-player game's.
  function keepParty(teams, v) {
    if (!Film || !Film.battles) return;
    const { film, aftermath, ...story } = v;
    const a = state.arena;
    Film.battles.save({
      id: Math.random().toString(36).slice(2, 10), at: Date.now(), worlds: prefs.worlds,
      arena: a ? { name: a.name, image: a.image } : null,
      teams: teams.map(t => ({ name: t.name, roster: t.roster.map(r => ({ name: r.name, world: r.world, note: r.note, price: r.price })) })),
      verdict: story,
      film: film ? { shots: film.shots.map(x => ({ label: x.label, caption: x.caption, speaker: x.speaker, line: x.line, url: x.url })) } : null,
    });
  }

  /* --- Clock ----------------------------------------------------------- */

  function tick() {
    document.querySelectorAll("[data-ends]").forEach(el => {
      const left = clock.left(Number(el.dataset.ends));
      el.textContent = el.dataset.fmt.replace("{s}", left);
      el.classList.toggle("timer--low", left <= 5);
    });
    document.querySelectorAll("[data-bar]").forEach(el => {
      const left = clock.left(Number(el.dataset.bar));
      el.style.width = `${Math.max(0, Math.min(100, (left / Number(el.dataset.total)) * 100))}%`;
    });
  }
  setInterval(() => { tick(); tickSound(); }, 250);

  function on(idName, fn) {
    const el = document.getElementById(idName);
    if (el) el.addEventListener("click", fn);
  }

  /* --- Theme ----------------------------------------------------------- */

  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  function paint(theme) {
    root.setAttribute("data-theme", theme);
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  paint(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    paint(next);
    try { localStorage.setItem("theme", next); } catch { /* no-op */ }
  });

  full();
})();
