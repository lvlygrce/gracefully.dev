/* Character Draft party: a phone. Join with the PIN from the TV, then bid in
   secret, see your team, and vote on the fights you're not in. */

(function () {
  "use strict";

  const { connect, clock, safe, esc, picture } = window.Party;
  const app = document.getElementById("app");
  const announcer = document.getElementById("announce");
  const ME_KEY = "character-draft:party:me";
  const NAME_KEY = "character-draft:party:name";

  let session = safe.get(ME_KEY);           // { pin, playerId, token, name }
  let state = null, me = null;
  let view = null;
  let flash = "";                           // a one-off message on the join screen
  let choice = { round: 0, card: null, amount: 1 };
  let joining = false;

  const announce = t => { announcer.textContent = ""; requestAnimationFrame(() => { announcer.textContent = t; }); };
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* no-op */ } };
  const player = id => state && state.players.find(p => p.id === id);
  const card = cid => state && state.cards[cid];
  const mine = () => player(me && me.id);

  const net = connect({
    onOpen() {
      if (session) net.send({ t: "resume", pin: session.pin, playerId: session.playerId, token: session.token });
    },
    onMessage(msg) {
      if (msg.t === "joined") {
        joining = false;
        session = { pin: msg.pin, playerId: msg.playerId, token: msg.token, name: msg.name };
        safe.set(ME_KEY, session);
        if (location.hash) history.replaceState(null, "", location.pathname);
      } else if (msg.t === "state") {
        clock.sync(msg.state.serverNow);
        const was = state;
        state = msg.state; me = msg.me;
        if (was && was.phase !== state.phase) {
          if (state.phase === "market") buzz(60);
          if (state.phase === "match" && state.match && (state.match.a === me.id || state.match.b === me.id || me.canVote)) buzz([40, 60, 40]);
        }
        render();
      } else if (msg.t === "error") {
        joining = false; flash = msg.message; render(true);
      } else if (msg.t === "gone" || msg.t === "kicked") {
        joining = false;
        safe.remove(ME_KEY); session = null; state = null; me = null;
        flash = msg.t === "kicked" ? "The host removed you from that game." : "That game has ended. Join a new one with the PIN on the TV.";
        render(true);
      } else if (msg.t === "replaced") {
        flash = "You've joined from another tab or phone, so this one has stepped aside.";
        state = null; render(true);
      }
    },
  });

  /* --- Views ----------------------------------------------------------- */

  function keyFor() {
    if (!state || !me) return `join:${joining}`;
    const s = state;
    if (s.phase === "market") return `market:${s.round}:${me.bid ? me.bid.card + me.bid.amount : "-"}:${(mine() || {}).active}`;
    if (s.phase === "match") return `match:${s.match.id}:${s.match.stage}:${me.vote}:${me.canVote}`;
    if (s.phase === "bracket") return `bracket:${s.bracketRound}`;
    if (s.phase === "results") return `results:${s.round}`;
    if (s.phase === "lobby") return `lobby:${s.players.length}`;
    return s.phase;
  }

  function render(force) {
    const key = keyFor();
    if (!force && key === view) return tick();
    view = key;
    if (!state || !me) return joinView();
    const s = state;
    ({ lobby: lobbyView, market: marketView, results: resultsView, teams: teamsView, bracket: bracketView, match: matchView, champion: championView })[s.phase]();
    tick();
  }

  const header = () => {
    const p = mine();
    if (!p) return "";
    return `<div class="me-bar"><span class="title title--md">${esc(p.name)}</span>
      <span><span class="money">$${p.budget}</span> <span class="hand">${p.roster.length}/${state.settings.team}</span></span></div>`;
  };

  function joinView() {
    const hashPin = (location.hash.match(/\d{5}/) || [])[0] || "";
    const name = safe.get(NAME_KEY) || "";
    app.innerHTML = `
      <p class="hand arrive">Character Draft party</p>
      <h1 class="title title--xl arrive" style="--i:1">Join the game<span class="accent">.</span></h1>
      ${session && !state ? `<p class="hand">Rejoining…</p>` : ""}
      <form id="join" class="arrive" style="--i:2; margin-top: var(--space-md)">
        <label class="field"><span class="field__label">Game PIN, from the TV</span>
          <input class="field__input field__input--pin" name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" value="${esc(hashPin)}" required /></label>
        <label class="field"><span class="field__label">Your name</span>
          <input class="field__input" name="name" maxlength="18" autocomplete="nickname" value="${esc(name)}" required /></label>
        ${flash ? `<p class="warn">${esc(flash)}</p>` : ""}
        <button class="btn btn--primary btn--big btn--wide" type="submit" ${joining ? "disabled" : ""}>${joining ? "Joining…" : "Join"}</button>
      </form>`;
    const form = document.getElementById("join");
    form.addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(form);
      const pin = String(f.get("pin")).replace(/\D/g, "");
      const nm = String(f.get("name")).trim();
      if (pin.length !== 5 || !nm) { flash = "Enter the 5-digit PIN and your name."; return render(true); }
      safe.set(NAME_KEY, nm);
      flash = ""; joining = true;
      net.send({ t: "join", pin, name: nm });
      render(true);
    });
    const first = form.querySelector(hashPin ? '[name="name"]' : '[name="pin"]');
    if (first && !first.value) first.focus();
  }

  function lobbyView() {
    app.innerHTML = `${header()}
      <h1 class="title title--xl arrive">You're in<span class="accent">.</span></h1>
      <p class="big-note arrive" style="--i:1">Watch the TV. The draft starts when the host is ready.</p>
      <p class="hand arrive" style="--i:2">${state.players.length} players so far</p>
      <p class="muted" style="margin-top: var(--space-md)">How it works: each round, cards appear on the TV and here. Bid on one, in secret.
        Highest bid takes it. You have $${state.settings.budget} for ${state.settings.team} characters.</p>
      <div class="controls"><button class="btn btn--quiet" type="button" id="leave">Leave this game</button></div>`;
    on("leave", () => { net.send({ t: "leave" }); });
  }

  function marketView() {
    const s = state, p = mine();
    if (choice.round !== s.round) choice = { round: s.round, card: null, amount: 1 };
    if (!p.active) {
      app.innerHTML = `${header()}<h1 class="title title--lg">${p.roster.length >= s.settings.team ? "Your team's full" : "You're out of money"}<span class="accent">.</span></h1>
        <p class="big-note">Watch the others fight over the rest on the TV.</p>${myTeam()}`;
      return;
    }
    if (me.bid && me.bid.card && !choice.card) { choice.card = me.bid.card; choice.amount = me.bid.amount; }
    choice.amount = Math.min(Math.max(1, choice.amount), p.budget);
    const locked = me.bid;
    const lockedCard = locked && locked.card && card(locked.card);
    app.innerHTML = `${header()}
      <div class="topline"><p class="hand">round ${s.round} · pick one, bid in secret</p>
        <span class="timer" data-ends="${s.endsAt}" data-fmt="{s}"></span></div>
      <div class="bar"><span data-bar="${s.endsAt}" data-total="${s.settings.roundSeconds}"></span></div>
      ${locked ? `<p class="big-note">${lockedCard ? `Locked in: <em>$${locked.amount}</em> on ${esc(lockedCard.name)}.` : "You're sitting this round out."}
        <span class="muted">You can change it until time's up.</span></p>` : ""}
      <div class="pick">${s.market.map(cid => {
        const c = card(cid);
        return `<button class="pick__card" type="button" data-card="${cid}" aria-pressed="${choice.card === cid}">
          ${picture(c)}<span><span class="card__name">${esc(c.name)}</span><br /><span class="card__note">${esc(c.worldName)} · ${esc(c.note)}</span>
          ${(c.tags || []).map(t => `<br /><span class="card__tag">${esc(t)}</span>`).join("")}</span></button>`;
      }).join("")}</div>
      <div class="dock">
        <div class="stepper" role="group" aria-label="Bid amount">
          <button type="button" data-step="-1" aria-label="Lower bid">−</button>
          <output id="amount">$${choice.amount}</output>
          <button type="button" data-step="1" aria-label="Raise bid">+</button>
        </div>
        <button class="btn btn--primary btn--big btn--wide" type="button" id="bid" ${choice.card ? "" : "disabled"}>${choice.card ? `Bid $${choice.amount} on ${esc(card(choice.card).name)}` : "Tap a card to bid"}</button>
        <button class="btn btn--quiet" type="button" id="skip">Skip this round</button>
      </div>`;
    app.querySelectorAll("[data-card]").forEach(b => b.addEventListener("click", () => {
      choice.card = b.dataset.card; view = null; render();
    }));
    app.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
      choice.amount = Math.min(Math.max(1, choice.amount + Number(b.dataset.step)), p.budget);
      document.getElementById("amount").textContent = `$${choice.amount}`;
      const bid = document.getElementById("bid");
      if (choice.card) bid.textContent = `Bid $${choice.amount} on ${card(choice.card).name}`;
    }));
    on("bid", () => { net.send({ t: "bid", card: choice.card, amount: choice.amount }); buzz(30); });
    on("skip", () => { choice.card = null; net.send({ t: "bid", card: null }); });
  }

  function resultsView() {
    const s = state;
    const won = s.lastRound.results.filter(r => r.winner === me.id);
    const lost = s.lastRound.results.filter(r => r.winner !== me.id && r.bids.some(b => b.player === me.id));
    let body;
    if (won.length) {
      const r = won[0], c = card(r.card);
      body = `<h1 class="title title--xl arrive">Yours<span class="accent">.</span></h1>
        <div class="pick__card arrive" style="--i:1">${picture(c)}<span><span class="card__name">${esc(c.name)}</span><br /><span class="hand">for $${r.amount}</span></span></div>`;
      buzz([30, 40, 30]);
    } else if (lost.length) {
      const r = lost[0], c = card(r.card), w = player(r.winner);
      body = `<h1 class="title title--xl arrive">Outbid<span class="accent">.</span></h1>
        <p class="big-note">${esc(w ? w.name : "Someone")} took ${esc(c.name)} for $${r.amount}.</p>`;
    } else {
      body = `<h1 class="title title--lg arrive">No bid this round<span class="accent">.</span></h1>`;
    }
    app.innerHTML = `${header()}${body}<p class="hand" style="margin-top: var(--space-md)">next round soon. Watch the TV.</p>${myTeam()}`;
  }

  function myTeam() {
    const p = mine();
    if (!p || !p.roster.length) return "";
    return `<span class="rule"></span><p class="hand">your team</p>
      <div class="pick">${p.roster.map(r => {
        const c = card(r.card);
        return `<div class="pick__card">${picture(c)}<span><span class="card__name">${esc(c.name)}</span><br /><span class="hand">$${r.price}</span></span></div>`;
      }).join("")}</div>`;
  }

  function teamsView() {
    const p = mine();
    app.innerHTML = `${header()}<h1 class="title title--xl">${p.roster.length ? "Your team" : "No team this time"}<span class="accent">.</span></h1>
      <p class="big-note">${p.roster.length ? "The tournament's about to start. Watch the TV." : "You didn't win anyone, so you'll be voting on the fights."}</p>${myTeam()}`;
  }

  function nextFor() {
    const r = state.bracket[state.bracketRound] || [];
    return r.find(m => !m.winner && (m.a === me.id || m.b === me.id));
  }

  function bracketView() {
    const m = nextFor();
    const opp = m && player(m.a === me.id ? m.b : m.a);
    const stillIn = state.bracket.some(r => r.some(x => (x.a === me.id || x.b === me.id) && (!x.winner || x.winner === me.id)));
    app.innerHTML = `${header()}<h1 class="title title--xl">${m && opp ? `You fight ${esc(opp.name)}` : stillIn ? "You're through" : "You're out"}<span class="accent">.</span></h1>
      <p class="big-note">${m ? "Look at the TV." : stillIn ? "You've got a bye this round." : "You'll vote on the other fights."}</p>${myTeam()}`;
  }

  function matchView() {
    const s = state, m = s.match;
    const a = player(m.a), b = player(m.b);
    const fighting = m.a === me.id || m.b === me.id;
    const teamBtn = (p, side) => `
      <button class="vote__btn" type="button" data-side="${side}" aria-pressed="${me.vote === side}">
        <span class="title title--md">${esc(p.name)}</span>
        <span class="team__pics">${p.roster.map(r => picture(card(r.card))).join("")}</span>
        <span class="card__note">${p.roster.map(r => esc(card(r.card).name)).join(" · ")}</span>
      </button>`;
    if (m.stage === "vote" && me.canVote) {
      app.innerHTML = `${header()}
        <div class="topline"><p class="title title--md">Who wins?</p><span class="timer" data-ends="${m.endsAt}" data-fmt="{s}"></span></div>
        <div class="bar"><span data-bar="${m.endsAt}" data-total="${s.settings.voteSeconds}"></span></div>
        ${s.arena ? `<p class="hand">at ${esc(s.arena.name)}</p>` : ""}
        <div class="vote">${teamBtn(a, 0)}${teamBtn(b, 1)}</div>
        ${me.vote != null ? `<p class="big-note">You voted for ${esc((me.vote === 1 ? b : a).name)}. You can change it until time's up.</p>` : ""}`;
      app.querySelectorAll("[data-side]").forEach(btn => btn.addEventListener("click", () => {
        net.send({ t: "vote", side: Number(btn.dataset.side) }); buzz(25);
      }));
      return;
    }
    if (m.stage === "result") {
      const w = player(m.winner);
      const msg = fighting ? (m.winner === me.id ? "You win" : "You're out") : `${w.name} wins`;
      if (fighting) buzz(m.winner === me.id ? [40, 50, 40, 50, 80] : 120);
      app.innerHTML = `${header()}<h1 class="title title--xl arrive">${esc(msg)}<span class="accent">.</span></h1>
        <p class="big-note">${m.verdict ? `<em>${esc(m.verdict.verdict)}</em>` : m.tally ? `${m.tally[0]} votes to ${m.tally[1]}${m.tie ? ", settled by a coin" : ""}.` : ""}</p>`;
      return;
    }
    app.innerHTML = `${header()}<h1 class="title title--xl">${fighting ? "You're up" : `${esc(a.name)} vs ${esc(b.name)}`}<span class="accent">.</span></h1>
      <p class="big-note">${fighting ? (m.stage === "vote" ? "Everyone else is voting. Make your case, out loud." : "The judge is deciding. Look at the TV.")
        : "The judge is deciding. Look at the TV."}</p>${fighting ? myTeam() : ""}`;
  }

  function championView() {
    const c = player(state.champion);
    const me1 = c && c.id === me.id;
    if (me1) buzz([60, 60, 60, 60, 200]);
    app.innerHTML = `${header()}<h1 class="title title--xl arrive">${me1 ? "You're the champion" : c ? `${esc(c.name)} wins it all` : "That's the game"}<span class="accent">.</span></h1>
      <p class="big-note">${me1 ? "Take a bow." : "Stay on this screen if the host plays again."}</p>${myTeam()}`;
    if (me1) announce("You're the champion.");
  }

  /* --- Clock and helpers ----------------------------------------------- */

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

  render(true);
})();
