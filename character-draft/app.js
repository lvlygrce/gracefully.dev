/* Character Draft — front-end only. No server, no database, no build step.
   The draft in progress lives in localStorage so a reload resumes it; finished
   teams are shared as a link with the whole result encoded in the URL hash. */

(function () {
  "use strict";

  const BUDGET = 20;
  const TEAM = 5;
  const PASS_OPTIONS = [0, 1, 2, 3];
  const DEFAULT_PASSES = 2;
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
  if (state && state.version === 1 && U[state.universe]) state = migrate(state);
  if (state && (state.version !== 2 || !state.worlds.every(w => U[w]))) state = null;
  if (state && state.passes === undefined) {
    state.passes = DEFAULT_PASSES;
    state.players.forEach(p => { p.passes = DEFAULT_PASSES; });
  }

  let prefs = store.get(PREFS_KEY, { names: ["Player one", "Player two"], worlds: ["westeros"] });
  if (!Array.isArray(prefs.worlds)) prefs.worlds = U[prefs.universe] ? [prefs.universe] : ["westeros"];
  prefs.worlds = prefs.worlds.filter(w => U[w]);
  if (!prefs.worlds.length) prefs.worlds = ["westeros"];
  if (!PASS_OPTIONS.includes(prefs.passes)) prefs.passes = DEFAULT_PASSES;

  // The judge's progress on the current finished draft. Not persisted; the
  // verdict itself is saved on the draft once it arrives.
  let judging = { busy: false, status: "", progress: null, error: "", verdict: null };
  let pendingBid = 1;      // the number on the stepper; not worth persisting
  let shared = readShared();

  /* --- Helpers ------------------------------------------------------- */

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // A character is "world:index", so a deck can mix worlds. Returns
  // [name, note, world].
  function char(id) {
    const [w, i] = id.split(":");
    const [name, note] = U[w].characters[Number(i)];
    return [name, note, w];
  }

  const worldsName = worlds => worlds.map(w => U[w].name).join(" + ");

  // Drafts saved before mixing existed held one world and bare indices.
  function migrate(old) {
    const id = i => `${old.universe}:${i}`;
    const s = { ...old, version: 2, worlds: [old.universe] };
    delete s.universe;
    s.deck = old.deck.map(id);
    s.players = old.players.map(p => ({ ...p, roster: p.roster.map(r => ({ ...r, i: id(r.i) })) }));
    if (old.lot) s.lot = { ...old.lot, i: id(old.lot.i) };
    if (old.last) s.last = { ...old.last, i: id(old.last.i) };
    s.history = [];
    return s;
  }
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
     may open instead. Both pass and the character is gone for good. Each
     player has only a few passes for the whole draft; with none left, you
     have to open. Once someone opens, it's raise or pass until one of you
     lets it go, and declining to raise costs nothing. */

  function startDraft(names, worlds, passes) {
    const all = worlds.flatMap(w => U[w].characters.map((_, i) => `${w}:${i}`));
    const first = Math.random() < 0.5 ? 0 : 1;
    state = {
      version: 2,
      worlds,
      total: all.length,
      phase: "draft",
      passes,
      players: names.map(name => ({ name, budget: BUDGET, roster: [], passes })),
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
    const passer = state.players[lot.turn];
    if (passer.passes <= 0) { state.history.pop(); return; }
    passer.passes -= 1;
    state.log.push(`${passer.name} passes on ${char(lot.i)[0]} (${passer.passes} ${passer.passes === 1 ? "pass" : "passes"} left).`);
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
      w: state.worlds,
      p: state.players.map(p => [p.name, p.budget, p.roster.map(r => [char(r.i)[0], r.price, char(r.i)[2]])]),
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
      if (data.u && !data.w) data.w = [data.u];
      if (!Array.isArray(data.w) || !data.w.every(w => U[w]) || !Array.isArray(data.p)) return null;
      return data;
    } catch { return null; }
  }

  function teamsAsText(worlds, teams) {
    const lines = [`Character Draft — ${worldsName(worlds)}`, ""];
    teams.forEach(t => {
      lines.push(`${t.name} ($${t.left} left)`);
      t.roster.forEach(r => lines.push(`  ${r.name}${worlds.length > 1 ? ` (${U[r.world].name})` : ""} — $${r.price}`));
      lines.push("");
    });
    const v = state && !shared && state.verdict;
    if (v) lines.push("", `The judge says ${v.winner} wins. ${v.verdict}`, `MVP: ${v.mvp}`);
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
    if (shared) return renderTeams(shared.w, fromShared(shared), true);
    if (!state) return renderSetup();
    if (state.phase === "done") return renderTeams(state.worlds, fromState(), false);
    renderDraft();
  }

  function fromState() {
    return state.players.map(p => ({
      name: p.name,
      left: p.budget,
      roster: p.roster.map(r => {
        const [name, note, world] = char(r.i);
        return { name, note, world, price: r.price };
      }),
    }));
  }

  function fromShared(data) {
    const noteOf = (w, n) => (U[w].characters.find(c => c[0] === n) || [])[1] || "";
    return data.p.map(([name, left, roster]) => ({
      name, left,
      roster: roster.map(([n, price, w = data.w[0]]) => ({
        name: n, world: U[w] ? w : data.w[0], note: U[w] ? noteOf(w, n) : "", price,
      })),
    }));
  }

  function renderSetup() {
    const worlds = Object.entries(U).map(([key, u]) => `
      <label class="choice">
        <input type="checkbox" name="worlds" value="${key}" ${prefs.worlds.includes(key) ? "checked" : ""} />
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

        <h2 class="section-label">Pick your worlds</h2>
        <fieldset class="choices"><legend class="visually-hidden">Worlds</legend>${worlds}</fieldset>
        <p class="choices__note" id="worlds-note"></p>

        <h2 class="section-label">Passes each</h2>
        <fieldset class="chips"><legend class="visually-hidden">Passes each</legend>${PASS_OPTIONS.map(n => `
          <label class="chip">
            <input type="radio" name="passes" value="${n}" ${prefs.passes === n ? "checked" : ""} />
            <span>${n}</span>
          </label>`).join("")}
          <span class="chips__note">times you can say no to a character; after that you must bid</span>
        </fieldset>

        <p class="rules">
          Each of you starts with <em>$${BUDGET}</em> and room for <em>${TEAM}</em>.
          Everything in the worlds you pick is shuffled into one deck and turned over one character at a time.
          Pick more than one for a mixed draft.
          Whoever's turn it is opens the bidding or spends a pass; if you both pass, that character is gone for good.
          Run out of passes and you have to open, even on a dud.
          Highest bid takes them. The draft ends when you're both full or broke.
        </p>

        <button class="btn btn--primary" type="submit">Shuffle and begin</button>
      </form>`;

    const form = document.getElementById("setup");
    const note = document.getElementById("worlds-note");
    const countWorlds = () => {
      const picked = [...form.querySelectorAll('[name="worlds"]:checked')].map(i => i.value);
      const total = picked.reduce((n, w) => n + U[w].characters.length, 0);
      note.classList.remove("choices__note--warn");
      note.textContent = !picked.length ? "Pick at least one world."
        : picked.length === 1 ? `${total} characters in the deck. Tick another world to mix them.`
        : `A mixed deck: ${worldsName(picked)}, ${total} characters.`;
    };
    form.addEventListener("change", countWorlds);
    countWorlds();

    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const names = [f.get("p0"), f.get("p1")].map((n, k) => String(n).trim() || `Player ${k + 1}`);
      if (names[0] === names[1]) names[1] += " too";
      const worlds = f.getAll("worlds");
      if (!worlds.length) {
        note.textContent = "Pick at least one world.";
        note.classList.add("choices__note--warn");
        return;
      }
      prefs = { names, worlds, passes: Number(f.get("passes")) };
      store.set(PREFS_KEY, prefs);
      startDraft(names, worlds, prefs.passes);
    });
  }

  function playerCard(p, active) {
    const slots = Array.from({ length: TEAM }, (_, s) =>
      `<span class="slot ${s < p.roster.length ? "slot--full" : ""}"></span>`).join("");
    const roster = p.roster.length
      ? p.roster.map(r => {
          const [name, , world] = char(r.i);
          return `<li>${portrait(world, name, "sm")}<span class="roster__name">${esc(name)}</span><span class="price">$${r.price}</span></li>`;
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
        <p class="player__passes">${p.passes === 1 ? "1 pass" : `${p.passes} passes`} left</p>
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
      const [name, note, world] = char(lot.i);
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
        if (r.passes <= 0) prompt += " You're out of passes, so you have to open.";
        verb = "Open at";
        passLabel = r.passes <= 0 ? null
          : `${firstPassed || solo ? "Pass — they're gone for good" : "Pass"} (${r.passes} left)`;
      }

      block = `
        <div class="reveal-card" data-key="${lot.i}">
          ${portrait(world, name, "lg")}
          <div class="reveal-card__text">
            <p class="block__kicker">character ${state.total - state.deck.length} turned over${state.worlds.length > 1 ? `, from ${esc(U[world].name)}` : ""}</p>
            <h2 class="block__name">${esc(name)}</h2>
            <p class="block__note">${esc(note)}</p>
            ${(U[world].strategists || []).includes(name) ? `<p class="block__tag">known for strategy</p>` : ""}
            ${opened
              ? `<p class="block__bid"><span class="money">$${lot.bid}</span> held by ${esc(players[lot.leader].name)}</p>`
              : `<p class="block__bid block__bid--none">no bids yet</p>`}
          </div>
        </div>
        <p class="block__prompt">${prompt}</p>
        <div class="block__actions">
          ${stepper(lot.bid + 1, r.budget)}
          <button class="btn btn--primary" type="button" id="bid">${verb} $${pendingBid}</button>
          ${passLabel ? `<button class="btn" type="button" id="pass">${passLabel}</button>` : ""}
        </div>`;
    } else {
      const n = players[opener];
      const lastBit = last ? `
        <div class="last">
          ${portrait(char(last.i)[2], char(last.i)[0], "md")}
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
      <p class="world">${esc(worldsName(state.worlds))}</p>
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

  function renderTeams(worlds, teams, isShared) {
    const cards = teams.map(t => {
      const spent = BUDGET - t.left;
      const rows = t.roster.length
        ? t.roster.map(r => `
            <li class="final__row">
              ${portrait(r.world, r.name, "md")}
              <span class="final__body">
                <span class="final__name">${esc(r.name)}</span>
                <span class="final__note">${esc(r.note)}${worlds.length > 1 ? ` · ${esc(U[r.world].name)}` : ""}</span>
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
      <p class="world">${esc(worldsName(worlds))}</p>
      <h2 class="done__title">${isShared ? "Someone shared their teams" : "The teams are in"}<span class="wordmark__mark">.</span></h2>
      <p class="done__lede">Now argue about who wins.</p>
      <div class="finals">${cards}</div>
      <section class="judge" aria-labelledby="judge-h">
        <h2 class="section-label" id="judge-h">Who wins?</h2>
        <div id="judge-body" aria-live="polite"></div>
      </section>
      <div class="tools tools--loud">
        ${isShared ? "" : `
          <button class="btn btn--primary" type="button" id="again">Draft again, fresh shuffle</button>
          <button class="btn" type="button" id="copy-text">Copy the teams</button>
          <button class="btn" type="button" id="copy-link">Copy a link to them</button>
          <button class="btn btn--quiet" type="button" id="undo">Undo the last move</button>`}
        <button class="btn btn--quiet" type="button" id="new">${isShared ? "Start your own draft" : "Change players or world"}</button>
      </div>`;

    on("undo", undo);
    renderJudge(worlds, teams, isShared);

    on("again", () => {
      judging = { busy: false, status: "", progress: null, error: "", verdict: null };
      startDraft(state.players.map(p => p.name), state.worlds, state.passes);
    });
    on("copy-text", e => copy(teamsAsText(worlds, teams), e.currentTarget, "Copied"));
    on("copy-link", e => {
      const url = `${location.href.split("#")[0]}#teams=${shareCode()}`;
      copy(url, e.currentTarget, "Link copied");
    });
    on("new", () => {
      judging = { busy: false, status: "", progress: null, error: "", verdict: null };
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

  /* --- The judge -----------------------------------------------------
     judge.js does the asking; this draws the settings, the wait and the
     reveal. A verdict on your own draft is saved with it; one on a shared
     link lives only until you leave. */

  function renderJudge(worlds, teams, isShared) {
    const body = document.getElementById("judge-body");
    const J = window.Judge;
    const verdict = isShared ? judging.verdict : (state.verdict || null);
    const playable = teams.every(t => t.roster.length);

    if (judging.busy) {
      body.innerHTML = `
        <p class="judge__status">${esc(judging.status)}</p>
        ${judging.progress != null
          ? `<div class="judge__bar"><span style="width:${Math.round(judging.progress * 100)}%"></span></div>`
          : ""}`;
      return;
    }

    if (verdict) {
      body.innerHTML = verdictHtml(verdict) + `
        <div class="tools tools--loud judge__again">
          <button class="btn" type="button" id="judge-again">Ask for a second opinion</button>
        </div>`;
      on("judge-again", () => {
        if (isShared) judging.verdict = null; else { state.verdict = null; save(); }
        render();
      });
      return;
    }

    if (!playable) {
      body.innerHTML = `<p class="muted"><em>Someone has no team, so there's nothing to judge.</em></p>`;
      return;
    }

    const mode = prefs.judge || "gemini";
    const key = J.gemini.key();
    const localModel = prefs.localModel || J.local.models[0].id;
    const gpu = J.local.supported();

    body.innerHTML = `
      <p class="judge__lede">Let an AI judge reason through the fight and pick a winner.</p>
      <fieldset class="choices choices--judge"><legend class="visually-hidden">Judge</legend>
        <label class="choice">
          <input type="radio" name="judge" value="gemini" ${mode === "gemini" ? "checked" : ""} />
          <span class="choice__body">
            <span class="choice__name">Gemini</span>
            <span class="choice__note">Google's model, with your own free API key. Quick and sharp.</span>
          </span>
        </label>
        <label class="choice">
          <input type="radio" name="judge" value="local" ${mode === "local" ? "checked" : ""} />
          <span class="choice__body">
            <span class="choice__name">On this device</span>
            <span class="choice__note">A small model on your GPU. Private and free, but a big first download.</span>
          </span>
        </label>
      </fieldset>

      <div class="judge__opts">
        ${mode === "gemini" ? (key ? `
          <p class="judge__key">Your Gemini key is saved in this browser only.
            <button class="btn btn--quiet btn--inline" type="button" id="forget-key">Forget it</button></p>` : `
          <label class="field"><span class="field__label">Gemini API key</span>
            <input class="field__input field__input--key" id="key-input" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your key" /></label>
          <p class="judge__fine">Get one free at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>.
            It stays in this browser and is only ever sent to Google.</p>`)
        : `
          ${gpu ? "" : `<p class="judge__warn">This browser doesn't have WebGPU, so it can't run a model here. Chrome or Edge on a laptop or desktop usually can.</p>`}
          <fieldset class="chips chips--stack"><legend class="visually-hidden">Model</legend>
            ${J.local.models.map(m => `
              <label class="chip chip--wide">
                <input type="radio" name="local-model" value="${m.id}" ${m.id === localModel ? "checked" : ""} />
                <span>${esc(m.label)} <em>${esc(m.note)}</em></span>
              </label>`).join("")}
          </fieldset>
          <p class="judge__fine"><span id="storage-line"></span>
            <button class="btn btn--quiet btn--inline" type="button" id="clear-models">Clear downloaded models</button></p>`}
      </div>

      ${judging.error ? `<p class="judge__warn">${esc(judging.error)}</p>` : ""}
      <button class="btn btn--primary" type="button" id="judge-go" ${mode === "local" && !gpu ? "disabled" : ""}>Reveal the winner</button>`;

    body.querySelectorAll('[name="judge"]').forEach(i => i.addEventListener("change", () => {
      prefs.judge = i.value; store.set(PREFS_KEY, prefs); judging.error = ""; renderJudge(worlds, teams, isShared);
    }));
    body.querySelectorAll('[name="local-model"]').forEach(i => i.addEventListener("change", () => {
      prefs.localModel = i.value; store.set(PREFS_KEY, prefs);
    }));
    on("forget-key", () => { J.gemini.forgetKey(); renderJudge(worlds, teams, isShared); });

    const storageLine = document.getElementById("storage-line");
    if (storageLine) {
      J.local.storage().then(space => {
        if (space && storageLine.isConnected) {
          storageLine.textContent = `This site is using ${(space.usage / 1e9).toFixed(1)}GB; `
            + `your browser allows about ${(space.free / 1e9).toFixed(1)}GB more.`;
        }
      });
    }
    on("clear-models", async e => {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = "Clearing…";
      try { await J.local.clear(); judging.error = ""; announce("Downloaded models cleared."); }
      catch (err) { judging.error = `Couldn't clear them: ${err.message}`; }
      renderJudge(worlds, teams, isShared);
    });

    on("judge-go", async () => {
      if (mode === "gemini" && !key) {
        const typed = document.getElementById("key-input").value.trim();
        if (!typed) { judging.error = "Paste a Gemini API key first."; return renderJudge(worlds, teams, isShared); }
        J.gemini.saveKey(typed);
      }
      const draftAtStart = state;
      judging = { busy: true, status: "Calling the judge…", progress: null, error: "", verdict: null };
      renderJudge(worlds, teams, isShared);
      const onStatus = (text, progress) => {
        judging.status = text;
        judging.progress = progress == null ? null : progress;
        if (document.getElementById("judge-body")) renderJudge(worlds, teams, isShared);
      };
      const worldName = w => U[w].name;
      try {
        const v = mode === "gemini"
          ? await J.gemini.judge(teams, worldName, onStatus)
          : await J.local.judge(teams, worldName, onStatus, prefs.localModel || J.local.models[0].id);
        judging = { busy: false, status: "", progress: null, error: "", verdict: isShared ? v : null };
        if (!isShared && state === draftAtStart) { state.verdict = v; save(); }
        announce(`${v.winner} wins. ${v.verdict}`);
      } catch (err) {
        judging = { busy: false, status: "", progress: null, error: err.message || "Something went wrong.", verdict: null };
      }
      if (document.getElementById("judge-body")) renderJudge(worlds, teams, isShared);
    });
  }

  function rolesHtml(v) {
    const roles = (v.roles || []).filter(r => r.role);
    if (!roles.length) return "";
    const teams = [...new Set(roles.map(r => r.team))];
    return `
      <div class="roles verdict__step" style="--i:2">
        ${teams.map(t => `
          <div class="roles__team">
            <p class="edge__team">${esc(t)}</p>
            <ul class="roles__list">
              ${roles.filter(r => r.team === t).map(r => `
                <li>${portrait(r.world, r.name, "md")}
                  <p><span class="roles__name">${esc(r.name)}</span> ${esc(r.role)}</p></li>`).join("")}
            </ul>
          </div>`).join("")}
      </div>`;
  }

  function verdictHtml(v) {
    const paras = String(v.fight).split(/\n+/).filter(Boolean)
      .map(p => `<p>${esc(p)}</p>`).join("");
    const edges = (v.edges || []).map(e => `
      <div class="edge">
        <p class="edge__team">${esc(e.team)}</p>
        ${e.plan ? `<p><em>The plan:</em> ${esc(e.plan)}</p>` : ""}
        <p><em>Strength:</em> ${esc(e.strength)}</p>
        <p><em>Weakness:</em> ${esc(e.weakness)}</p>
      </div>`).join("");
    return `
      <div class="verdict">
        <div class="edges verdict__step" style="--i:0">${edges}</div>
        <div class="verdict__fight verdict__step" style="--i:1">${paras}</div>
        ${rolesHtml(v)}
        <p class="verdict__turn verdict__step" style="--i:3"><span class="verdict__label">the turning point</span> ${esc(v.turning_point)}</p>
        <p class="verdict__mvp verdict__step" style="--i:4"><span class="verdict__label">most valuable</span> ${esc(v.mvp)}</p>
        <h3 class="verdict__winner verdict__step" style="--i:5"><em>${esc(v.winner)}</em> wins<span class="wordmark__mark">.</span></h3>
        <p class="verdict__line verdict__step" style="--i:6">${esc(v.verdict)}</p>
        <p class="verdict__by verdict__step" style="--i:6">judged by ${esc(v.by || "the judge")}</p>
      </div>`;
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
