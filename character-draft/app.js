/* Character Draft — front-end only. No server, no database, no build step.
   The draft in progress lives in localStorage so a reload resumes it; finished
   teams are shared as a link with the whole result encoded in the URL hash. */

(function () {
  "use strict";

  const BUDGET = 20;
  const TEAM = 5;
  const KEY = "character-draft:v1:state";
  const PREFS_KEY = "character-draft:v1:prefs";

  const U = window.UNIVERSES;
  const IMAGES = window.CHARACTER_IMAGES || {};
  const app = document.getElementById("app");
  const announcer = document.getElementById("announce");

  /* --- Storage ------------------------------------------------------- */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* no-op */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* no-op */ }
    },
  };

  let state = store.get(KEY, null);
  if (state && (state.version !== 1 || !U[state.universe])) state = null;

  let prefs = store.get(PREFS_KEY, { names: ["Player one", "Player two"], universe: "westeros" });
  if (!U[prefs.universe]) prefs.universe = "westeros";

  let pendingBid = 1;      // the number on the stepper; not worth persisting
  let shared = readShared();

  /* --- Helpers ------------------------------------------------------- */

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const char = i => U[state.universe].characters[i];
  const other = p => 1 - p;
  const canAct = p => p.roster.length < TEAM && p.budget >= 1;

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initials(name) {
    return name.replace(/[^A-Za-z' ]/g, "").split(" ").filter(Boolean)
      .slice(0, 2).map(w => w[0]).join("");
  }

  // A picture, or a lettered placeholder if there isn't one or it won't load.
  function portrait(universe, name, size) {
    const src = (IMAGES[universe] || {})[name];
    const fallback = `<span class="portrait__letters" aria-hidden="true">${esc(initials(name))}</span>`;
    return `<span class="portrait portrait--${size}">${fallback}${src
      ? `<img src="${esc(src)}" alt="" loading="${size === "lg" ? "eager" : "lazy"}"
             referrerpolicy="no-referrer" onerror="this.remove()" />`
      : ""}</span>`;
  }

  function announce(text) {
    announcer.textContent = "";
    requestAnimationFrame(() => { announcer.textContent = text; });
  }

  function save() { store.set(KEY, state); }

  function snapshot() {
    const { history, ...rest } = state;
    state.history = (history || []).concat(JSON.stringify(rest)).slice(-40);
  }

  /* --- The rules -----------------------------------------------------
     The deck is the whole world, shuffled. One character is turned over
     at a time. The opener bids or passes; if they pass the other player
     may open instead. Both pass and the character is gone for good. Once
     someone opens, it's raise or pass until one of you lets it go. */

  function startDraft(names, universe) {
    const all = U[universe].characters.map((_, i) => i);
    const first = Math.random() < 0.5 ? 0 : 1;
    state = {
      version: 1,
      universe,
      phase: "draft",
      players: names.map(name => ({ name, budget: BUDGET, roster: [] })),
      deck: shuffle(all),
      opener: first,
      lot: null,
      last: null,
      log: [`The coin says ${names[first]} opens first.`],
      history: [],
    };
    save();
    announce(state.log[0]);
    render();
  }

  function reveal() {
    snapshot();
    const i = state.deck.shift();
    state.lot = { i, bid: 0, leader: null, turn: state.opener, passes: 0 };
    state.last = null;
    pendingBid = 1;
    save();
    announce(`${char(i)[0]}. ${state.players[state.opener].name}, open or pass.`);
    render();
  }

  function bid(amount) {
    const lot = state.lot;
    const p = state.players[lot.turn];
    if (amount <= lot.bid || amount > p.budget) return;
    snapshot();
    if (!lot.bid) state.log.push(`${p.name} opens ${char(lot.i)[0]} at $${amount}.`);
    lot.bid = amount;
    lot.leader = lot.turn;
    lot.turn = other(lot.turn);
    settle();
  }

  function pass() {
    const lot = state.lot;
    snapshot();
    if (lot.bid) return sell();
    lot.passes += 1;
    const next = other(lot.turn);
    if (lot.passes >= 2 || !canAct(state.players[next])) return discard();
    lot.turn = next;
    pendingBid = 1;
    save();
    announce(`${state.players[other(next)].name} passes. ${state.players[next].name}, open or pass.`);
    render();
  }

  // If whoever is due to respond can't outbid, the lot goes to the leader.
  function settle() {
    const lot = state.lot;
    const responder = state.players[lot.turn];
    if (!canAct(responder) || responder.budget <= lot.bid) return sell();
    pendingBid = lot.bid + 1;
    save();
    announce(`${state.players[lot.leader].name} bids $${lot.bid}. ${responder.name}, raise or pass.`);
    render();
  }

  function sell() {
    const { i, bid: price, leader } = state.lot;
    const p = state.players[leader];
    p.budget -= price;
    p.roster.push({ i, price });
    const line = `${p.name} drafts ${char(i)[0]} for $${price}.`;
    finishLot({ i, text: line, who: leader, price });
  }

  function discard() {
    const { i } = state.lot;
    finishLot({ i, text: `Nobody wanted ${char(i)[0]}. Gone for good.`, who: null });
  }

  function finishLot(result) {
    state.log.push(result.text);
    state.lot = null;
    state.last = result;

    const prev = state.opener;
    const next = canAct(state.players[other(prev)]) ? other(prev)
               : canAct(state.players[prev]) ? prev
               : null;

    if (next === null || state.deck.length === 0) {
      state.phase = "done";
      state.log.push(next === null ? "That's the draft." : "The deck ran out. That's the draft.");
    } else {
      state.opener = next;
    }
    pendingBid = 1;
    save();
    announce(result.text + (state.phase === "done" ? " That's the draft." : ""));
    render();
  }

  function undo() {
    const history = state.history || [];
    if (!history.length) return;
    const prev = JSON.parse(history[history.length - 1]);
    state = { ...prev, history: history.slice(0, -1) };
    pendingBid = state.lot && state.lot.bid ? state.lot.bid + 1 : 1;
    save();
    announce("Undone.");
    render();
  }

  /* --- Sharing ------------------------------------------------------- */

  // Names rather than indices, so a link survives edits to the pools.
  function shareCode() {
    const data = {
      u: state.universe,
      p: state.players.map(p => [p.name, p.budget, p.roster.map(r => [char(r.i)[0], r.price])]),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    let bin = "";
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function readShared() {
    const m = location.hash.match(/^#teams=([\w-]+)$/);
    if (!m) return null;
    try {
      const bin = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      if (!U[data.u] || !Array.isArray(data.p)) return null;
      return data;
    } catch { return null; }
  }

  function teamsAsText(universe, teams) {
    const lines = [`Character Draft — ${U[universe].name}`, ""];
    teams.forEach(t => {
      lines.push(`${t.name} ($${t.left} left)`);
      t.roster.forEach(r => lines.push(`  ${r.name} — $${r.price}`));
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  async function copy(text, button, done) {
    try {
      await navigator.clipboard.writeText(text);
      const was = button.textContent;
      button.textContent = done;
      announce(done);
      setTimeout(() => { button.textContent = was; }, 1800);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  /* --- Views --------------------------------------------------------- */

  function render() {
    if (shared) return renderTeams(shared.u, fromShared(shared), true);
    if (!state) return renderSetup();
    if (state.phase === "done") return renderTeams(state.universe, fromState(), false);
    renderDraft();
  }

  function fromState() {
    return state.players.map(p => ({
      name: p.name,
      left: p.budget,
      roster: p.roster.map(r => ({ name: char(r.i)[0], note: char(r.i)[1], price: r.price })),
    }));
  }

  function fromShared(data) {
    const notes = Object.fromEntries(U[data.u].characters);
    return data.p.map(([name, left, roster]) => ({
      name, left,
      roster: roster.map(([n, price]) => ({ name: n, note: notes[n] || "", price })),
    }));
  }

  function renderSetup() {
    const worlds = Object.entries(U).map(([key, u]) => `
      <label class="choice">
        <input type="radio" name="universe" value="${key}" ${prefs.universe === key ? "checked" : ""} />
        <span class="choice__body">
          <span class="choice__name">${esc(u.name)}</span>
          <span class="choice__note">${esc(u.blurb)} · ${u.characters.length} characters</span>
        </span>
      </label>`).join("");

    app.innerHTML = `
      <form class="setup" id="setup">
        <h2 class="section-label">Who's drafting</h2>
        <div class="names">
          <label class="field"><span class="field__label">First player</span>
            <input class="field__input" name="p0" value="${esc(prefs.names[0])}" maxlength="24" required autocomplete="off" /></label>
          <label class="field"><span class="field__label">Second player</span>
            <input class="field__input" name="p1" value="${esc(prefs.names[1])}" maxlength="24" required autocomplete="off" /></label>
        </div>

        <h2 class="section-label">Pick a world</h2>
        <fieldset class="choices"><legend class="visually-hidden">World</legend>${worlds}</fieldset>

        <p class="rules">
          Each of you starts with <em>$${BUDGET}</em> and room for <em>${TEAM}</em>.
          The whole world is shuffled into a deck and turned over one character at a time.
          Whoever's turn it is opens the bidding or passes; if you both pass, that character is gone for good.
          Highest bid takes them. The draft ends when you're both full or broke.
        </p>

        <button class="btn btn--primary" type="submit">Shuffle and begin</button>
      </form>`;

    document.getElementById("setup").addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const names = [f.get("p0"), f.get("p1")].map((n, k) => String(n).trim() || `Player ${k + 1}`);
      if (names[0] === names[1]) names[1] += " too";
      prefs = { names, universe: f.get("universe") };
      store.set(PREFS_KEY, prefs);
      startDraft(names, prefs.universe);
    });
  }

  function playerCard(p, active) {
    const slots = Array.from({ length: TEAM }, (_, s) =>
      `<span class="slot ${s < p.roster.length ? "slot--full" : ""}"></span>`).join("");
    const roster = p.roster.length
      ? p.roster.map(r => {
          const name = char(r.i)[0];
          return `<li>${portrait(state.universe, name, "sm")}<span class="roster__name">${esc(name)}</span><span class="price">$${r.price}</span></li>`;
        }).join("")
      : `<li class="roster__empty">nobody yet</li>`;
    const status = !canAct(p)
      ? (p.roster.length >= TEAM ? "team's full" : "out of money")
      : active ? "your move" : "";
    return `
      <article class="player ${active ? "player--active" : ""} ${canAct(p) ? "" : "player--out"}"
               aria-label="${esc(p.name)}">
        <header class="player__head">
          <h3 class="player__name">${esc(p.name)}</h3>
          <span class="player__status">${status}</span>
        </header>
        <p class="player__budget"><span class="money">$${p.budget}</span> <span class="muted">left</span></p>
        <div class="slots" aria-label="${p.roster.length} of ${TEAM} drafted">${slots}</div>
        <ul class="roster">${roster}</ul>
      </article>`;
  }

  function stepper(min, max) {
    pendingBid = Math.min(Math.max(pendingBid, min), max);
    return `
      <div class="stepper" role="group" aria-label="Bid amount">
        <button class="stepper__btn" type="button" data-step="-1" aria-label="Lower bid" ${pendingBid <= min ? "disabled" : ""}>−</button>
        <output class="stepper__value" id="bid-value">$${pendingBid}</output>
        <button class="stepper__btn" type="button" data-step="1" aria-label="Raise bid" ${pendingBid >= max ? "disabled" : ""}>+</button>
      </div>`;
  }

  function renderDraft() {
    const { players, lot, last, opener } = state;
    const mover = lot ? lot.turn : opener;
    let block;

    if (lot) {
      const [name, note] = char(lot.i);
      const r = players[lot.turn];
      const opened = lot.bid > 0;
      const solo = !canAct(players[other(lot.turn)]);
      let prompt, verb, passLabel;

      if (opened) {
        prompt = `<em>${esc(r.name)}</em>, raise or pass? You have $${r.budget}.`;
        verb = "Bid";
        passLabel = `Pass — ${esc(players[lot.leader].name)} gets them`;
      } else {
        const firstPassed = lot.passes > 0;
        prompt = firstPassed
          ? `${esc(players[other(lot.turn)].name)} passed. <em>${esc(r.name)}</em>, open or pass? You have $${r.budget}.`
          : `<em>${esc(r.name)}</em>, open the bidding or pass? You have $${r.budget}.`;
        if (solo) prompt += ` ${esc(players[other(lot.turn)].name)} is out, so whatever you open at is what you pay.`;
        verb = "Open at";
        passLabel = firstPassed || solo ? "Pass — they're gone for good" : "Pass";
      }

      block = `
        <div class="reveal-card" data-key="${lot.i}">
          ${portrait(state.universe, name, "lg")}
          <div class="reveal-card__text">
            <p class="block__kicker">character ${U[state.universe].characters.length - state.deck.length} turned over</p>
            <h2 class="block__name">${esc(name)}</h2>
            <p class="block__note">${esc(note)}</p>
            ${opened
              ? `<p class="block__bid"><span class="money">$${lot.bid}</span> held by ${esc(players[lot.leader].name)}</p>`
              : `<p class="block__bid block__bid--none">no bids yet</p>`}
          </div>
        </div>
        <p class="block__prompt">${prompt}</p>
        <div class="block__actions">
          ${stepper(lot.bid + 1, r.budget)}
          <button class="btn btn--primary" type="button" id="bid">${verb} $${pendingBid}</button>
          <button class="btn" type="button" id="pass">${passLabel}</button>
        </div>`;
    } else {
      const n = players[opener];
      const lastBit = last ? `
        <div class="last">
          ${portrait(state.universe, char(last.i)[0], "md")}
          <p class="last__text">${esc(last.text)}</p>
        </div>` : "";
      block = `
        ${lastBit}
        <p class="block__kicker">${state.deck.length} characters face down</p>
        <h2 class="block__name block__name--quiet">Who's next? <em>${esc(n.name)}</em> opens.</h2>
        <div class="block__actions">
          <button class="btn btn--primary" type="button" id="reveal">Turn over the next character</button>
        </div>`;
    }

    const log = state.log.slice().reverse().map(l => `<li>${esc(l)}</li>`).join("");

    app.innerHTML = `
      <p class="world">${esc(U[state.universe].name)}</p>
      <div class="players">${players.map((p, k) => playerCard(p, k === mover)).join("")}</div>

      <section class="block" aria-label="Auction">${block}</section>

      <section aria-labelledby="log-h" class="log-wrap">
        <h2 class="section-label" id="log-h">How it's going</h2>
        <ol class="log">${log}</ol>
      </section>

      <div class="tools">
        <button class="btn btn--quiet" type="button" id="undo" ${(state.history || []).length ? "" : "disabled"}>Undo last move</button>
        <button class="btn btn--quiet" type="button" id="abandon">Abandon this draft</button>
      </div>`;

    if (lot) wireStepper(lot.bid + 1, players[lot.turn].budget, lot.bid ? "Bid" : "Open at");

    on("reveal", reveal);
    on("bid", () => bid(pendingBid));
    on("pass", pass);
    on("undo", undo);
    on("abandon", () => {
      if (!confirm("Abandon this draft? The teams so far will be lost.")) return;
      state = null;
      store.remove(KEY);
      render();
    });

    const primary = document.getElementById(lot ? "bid" : "reveal");
    if (primary && document.activeElement && document.activeElement !== document.body) {
      primary.focus({ preventScroll: true });
    }
  }

  function wireStepper(min, max, verb) {
    const value = document.getElementById("bid-value");
    if (!value) return;
    app.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
      pendingBid = Math.min(Math.max(pendingBid + Number(b.dataset.step), min), max);
      value.textContent = `$${pendingBid}`;
      document.getElementById("bid").textContent = `${verb} $${pendingBid}`;
      app.querySelector('[data-step="-1"]').disabled = pendingBid <= min;
      app.querySelector('[data-step="1"]').disabled = pendingBid >= max;
    }));
  }

  function on(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  function renderTeams(universe, teams, isShared) {
    const cards = teams.map(t => {
      const spent = BUDGET - t.left;
      const rows = t.roster.length
        ? t.roster.map(r => `
            <li class="final__row">
              ${portrait(universe, r.name, "md")}
              <span class="final__body">
                <span class="final__name">${esc(r.name)}</span>
                <span class="final__note">${esc(r.note)}</span>
              </span>
              <span class="price">$${r.price}</span>
            </li>`).join("")
        : `<li class="roster__empty">nobody</li>`;
      return `
        <article class="final">
          <h3 class="final__team">${esc(t.name)}</h3>
          <p class="muted">${t.roster.length} drafted · $${spent} spent · $${t.left} left</p>
          <ol class="final__list">${rows}</ol>
        </article>`;
    }).join("");

    app.innerHTML = `
      <p class="world">${esc(U[universe].name)}</p>
      <h2 class="done__title">${isShared ? "Someone shared their teams" : "The teams are in"}<span class="wordmark__mark">.</span></h2>
      <p class="done__lede">Now argue about who wins.</p>
      <div class="finals">${cards}</div>
      <div class="tools tools--loud">
        ${isShared ? "" : `
          <button class="btn btn--primary" type="button" id="again">Draft again, fresh shuffle</button>
          <button class="btn" type="button" id="copy-text">Copy the teams</button>
          <button class="btn" type="button" id="copy-link">Copy a link to them</button>
          <button class="btn btn--quiet" type="button" id="undo">Undo the last move</button>`}
        <button class="btn btn--quiet" type="button" id="new">${isShared ? "Start your own draft" : "Change players or world"}</button>
      </div>`;

    on("undo", undo);
    on("again", () => startDraft(state.players.map(p => p.name), state.universe));
    on("copy-text", e => copy(teamsAsText(universe, teams), e.currentTarget, "Copied"));
    on("copy-link", e => {
      const url = `${location.href.split("#")[0]}#teams=${shareCode()}`;
      copy(url, e.currentTarget, "Link copied");
    });
    on("new", () => {
      if (isShared) {
        shared = null;
        history.replaceState(null, "", location.pathname + location.search);
      } else {
        state = null;
        store.remove(KEY);
      }
      render();
    });
  }

  window.addEventListener("hashchange", () => { shared = readShared(); render(); });

  /* --- Entrance ------------------------------------------------------ */

  const revealables = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealables.forEach(el => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
    revealables.forEach(el => io.observe(el));
  }

  /* --- Theme --------------------------------------------------------- */

  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");

  function paint(theme) {
    root.setAttribute("data-theme", theme);
    toggle.setAttribute("aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  paint(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  toggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    paint(next);
    try { localStorage.setItem("theme", next); } catch { /* no-op */ }
  });

  render();
})();
