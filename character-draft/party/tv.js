/* Character Draft party: the TV. It hosts the room, shows the PIN and the
   QR code, builds the deck from the chosen worlds, and draws each phase for
   the whole room. In AI mode it also runs the judge and hands the verdict
   to the server. */

(function () {
  "use strict";

  const { connect, clock, safe, esc, picture } = window.Party;
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
    { worlds: Object.keys(U), judge: "crowd", team: 5, skips: 2, bidSeconds: 10, voteSeconds: 20 },
    safe.get(PREFS_KEY) || {},
  );
  prefs.worlds = (prefs.worlds || []).filter(w => U[w]);
  if (!prefs.worlds.length) prefs.worlds = Object.keys(U);

  let state = null;
  let pin = null;
  let view = null;
  let status = "connecting";
  let error = "";
  let judging = { matchId: null, preps: [null, null], status: "", error: "" };

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
      else if (msg.t === "replaced") { error = "This party is now being shown on another screen."; render(true); }
      else if (msg.t === "error") { error = msg.message; render(true); }
      else if (msg.t === "state") {
        clock.sync(msg.state.serverNow);
        const was = state;
        state = msg.state;
        if (!was || was.phase !== state.phase) error = "";
        render();
        maybeJudge();
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
      skips: prefs.skips,
      bidSeconds: prefs.bidSeconds,
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
  }

  function partial() {
    const s = state;
    if (s.phase === "lobby") { updateCloud(); updateStart(); }
    if (s.phase === "auction") updateAuction();
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
              ${opt("judge", "crowd", "The crowd votes on their phones", prefs.judge === "crowd")}
              ${opt("judge", "gemini", "AI judge: Gemini", prefs.judge === "gemini")}
              ${opt("judge", "local", "AI judge: on this computer", prefs.judge === "local")}
            </div>
            ${prefs.judge === "gemini" ? (key
              ? `<p class="muted" style="margin-top:.4rem">${J.gemini.key() ? "Gemini key saved on this computer." : "Using Grace's PIN for Gemini."} <button class="btn btn--quiet" type="button" id="forget-key">Forget it</button></p>`
              : `<label class="field" style="margin-top:.5rem"><span class="field__label">Gemini API key (free from Google AI Studio), or Grace's PIN</span>
                   <input class="field__input" id="key" type="password" autocomplete="off" spellcheck="false" placeholder="Your key, or the PIN" /></label>`)
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
            <div class="opts">${[8, 10, 15].map(n => opt("bidsecs", n, `${n} seconds`, prefs.bidSeconds === n)).join("")}</div>
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
    [["team", "team"], ["skips", "skips"], ["bidsecs", "bidSeconds"]].forEach(([name, key]) => {
      app.querySelectorAll(`[name="${name}"]`).forEach(i => i.addEventListener("change", () => {
        prefs[key] = Number(i.value); savePrefs(); sendSettings(); updateStart();
      }));
    });
    on("forget-key", () => { J.gemini.forgetKey(); render(true); });
    const keyInput = document.getElementById("key");
    if (keyInput) keyInput.addEventListener("input", updateStart);
    on("start", startDraft);
    updateCloud();
    updateStart();
  }

  function sendSettings() { net.send({ t: "host:settings", settings: serverSettings() }); }

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
          <p class="hand">${lot.stage === "open" ? "on their phone" : "raise from your phone"}</p>
        </div>
      </div>
      <div class="players-bar" id="players-bar">${playerChips()}</div>
      ${foot(lot.stage === "bidding" ? `<button class="btn btn--quiet" type="button" id="next">Sold! Close the bidding now</button>` : "")}`;
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
         <p class="big-note">${skipper ? `${esc(skipper.name)} sent them away.` : ""} Gone for good.</p>`;
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

  function teamHtml(p, k) {
    const cards = p.roster.map(r => card(r.card)).filter(Boolean);
    return `<article class="team arrive" style="--i:${k}">
      <p class="team__name">${esc(p.name)} <span class="chip__meta">$${p.budget} left</span></p>
      <div class="team__pics">${cards.map(c => picture(c, "pic--sm")).join("") || `<span class="muted">nobody</span>`}</div>
      <ul class="team__list">${cards.map(c => `<li>${esc(c.name)}</li>`).join("")}</ul></article>`;
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
    const prep = (m.stage === "result" && m.verdict && m.verdict.preps && m.verdict.preps[k]) || (m.stage === "judging" && judging.matchId === m.id && judging.preps[k]);
    return `<section class="side ${won}" id="side-${k}">
      <p class="hand">${k === 0 ? "in this corner" : "and in this corner"}</p>
      <h2 class="title title--lg">${esc(p.name)}</h2>
      <div class="side__pics">${cards.map(c => picture(c, "pic--lg")).join("")}</div>
      <p class="side__names">${cards.map(c => esc(c.name)).join(" · ")}</p>
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
    } else if (m.stage === "judging") {
      middle = `<p class="hand" id="judge-status">${esc(judging.matchId === m.id ? judging.status : "the judge is getting ready…")}</p>
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
        ${m.verdict ? `<div class="verdict arrive" style="--i:2"><p class="big-note"><em>${esc(m.verdict.verdict)}</em></p>
          <p><span class="hand">turning point</span> ${esc(m.verdict.turning_point)}</p>
          <p><span class="hand">most valuable</span> ${esc(m.verdict.mvp)}</p>
          ${String(m.verdict.fight).split(/\n+/).filter(Boolean).map(p => `<p class="muted">${esc(p)}</p>`).join("")}
          <p class="hand">judged by ${esc(m.verdict.by)}</p></div>` : ""}
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

  function teamFor(id) {
    const p = player(id);
    return {
      name: p.name,
      left: p.budget,
      roster: p.roster.map(r => {
        const c = card(r.card);
        return { name: c.name, note: c.note, world: c.world, price: r.price };
      }),
    };
  }

  async function maybeJudge() {
    const m = state && state.match;
    if (!m || state.phase !== "match" || m.stage !== "judging") return;
    if (judging.matchId === m.id) return;
    const matchId = m.id;
    judging = { matchId, preps: [null, null], status: "The war councils are meeting…", error: "" };
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
      const v = await J.run(prefs.judge === "local" ? "local" : "gemini", {
        teams, arena,
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
      net.send({ t: "host:result", matchId, side, verdict: v });
    } catch (err) {
      if (judging.matchId !== matchId) return;
      judging.error = err.message || "The judge couldn't decide.";
      render(true);
    }
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
  setInterval(tick, 250);

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
