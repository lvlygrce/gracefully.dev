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
  let openAmount = { lot: 0, amount: 1 };
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
          if (state.phase === "auction" && state.lot && state.lot.opener === me.id) buzz([60, 40, 60]);
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
    if (s.phase === "auction") return `auction:${s.lots}:${s.lot.stage}:${s.lot.bid}:${s.lot.leader}:${me.admin}`;
    if (s.phase === "sold") return `sold:${s.lots}:${me.admin}`;
    if (s.phase === "match") return `match:${s.match.id}:${s.match.stage}:${me.vote}:${me.canVote}:${me.admin}:${(s.match.aftermath || []).length}`;
    if (s.phase === "bracket") return `bracket:${s.bracketRound}:${me.admin}`;
    if (s.phase === "lobby") return `lobby:${s.players.length}:${me.admin}`;
    return `${s.phase}:${me.admin}`;
  }

  function render(force) {
    const key = keyFor();
    if (!force && key === view) return tick();
    view = key;
    if (!state || !me) return joinView();
    const s = state;
    ({ lobby: lobbyView, auction: auctionView, sold: soldView, teams: teamsView, bracket: bracketView, match: matchView, champion: championView })[s.phase]();
    adminBar();
    tick();
  }

  const header = () => {
    const p = mine();
    if (!p) return "";
    return `<div class="me-bar"><span class="title title--md">${esc(p.name)}</span>
      <span><span class="money">$${p.budget}</span> <span class="hand">${p.roster.length}/${state.settings.team} · ${p.skips} skip${p.skips === 1 ? "" : "s"}</span></span></div>`;
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
      <p class="muted" style="margin-top: var(--space-md)">How it works: one character at a time goes up for auction. On your turn,
        open the bidding or use a skip to send them away; you have ${state.settings.skips} skip${state.settings.skips === 1 ? "" : "s"}.
        Anyone can raise, and every bid resets the clock. You have $${state.settings.budget} for ${state.settings.team} characters.</p>
      <div class="controls"><button class="btn btn--quiet" type="button" id="leave">Leave this game</button></div>`;
    on("leave", () => { net.send({ t: "leave" }); });
  }

  function lotCard(c, extra) {
    return `<div class="phone-lot">${picture(c)}<div><span class="card__name">${esc(c.name)}</span><br />
      <span class="card__note">${esc(c.worldName)} · ${esc(c.note)}</span>
      ${(c.tags || []).map(t => `<br /><span class="card__tag">${esc(t)}</span>`).join("")}${extra || ""}</div></div>`;
  }

  function auctionView() {
    const s = state, lot = s.lot, p = mine(), c = card(lot.card);
    const total = lot.stage === "open" ? s.settings.openSeconds : s.settings.bidSeconds;
    const clock = `<div class="topline"><p class="hand">card ${s.lots}</p><span class="timer" data-ends="${lot.endsAt}" data-fmt="{s}"></span></div>
      <div class="bar"><span data-bar="${lot.endsAt}" data-total="${total}"></span></div>`;
    const lead = player(lot.leader);
    const bidLine = lot.stage === "bidding"
      ? `<br /><span class="money">$${lot.bid}</span> <span class="hand">${lot.leader === me.id ? "you" : esc(lead ? lead.name : "")}</span>` : "";
    let body;
    if (!p.active) {
      body = `<p class="big-note">${p.roster.length >= s.settings.team ? "Your team's full." : "You're out of money."} Watch the others fight over the rest.</p>`;
    } else if (lot.stage === "open" && lot.opener === me.id) {
      if (openAmount.lot !== s.lots) openAmount = { lot: s.lots, amount: 1 };
      openAmount.amount = Math.min(Math.max(1, openAmount.amount), p.budget);
      body = `<h1 class="title title--lg">Your turn<span class="accent">.</span></h1>
        <p class="big-note">Open the bidding, or skip and they're gone for good.${p.skips ? "" : " You're out of skips, so you have to open."}</p>
        <div class="dock">
          <div class="stepper" role="group" aria-label="Opening bid">
            <button type="button" data-step="-1" aria-label="Lower">−</button>
            <output id="amount">$${openAmount.amount}</output>
            <button type="button" data-step="1" aria-label="Higher">+</button>
          </div>
          <button class="btn btn--primary btn--big btn--wide" type="button" id="open">Open at $${openAmount.amount}</button>
          <button class="btn btn--wide" type="button" id="skip" ${p.skips ? "" : "disabled"}>Skip (${p.skips} left)</button>
        </div>`;
    } else if (lot.stage === "open") {
      body = `<p class="big-note">${esc(player(lot.opener).name)} is deciding whether to open the bidding.</p>`;
    } else if (lot.leader === me.id) {
      body = `<h1 class="title title--lg">You're winning<span class="accent">.</span></h1>
        <p class="big-note">If nobody raises before the clock runs out, they're yours.</p>`;
    } else if (p.budget <= lot.bid) {
      body = `<p class="big-note">That's more than your $${p.budget}. Sit this one out.</p>`;
    } else {
      const steps = [1, 2, 5].map(n => lot.bid + n).filter(a => a <= p.budget);
      if (!steps.includes(p.budget) && p.budget > lot.bid && steps.length < 3) steps.push(p.budget);
      body = `<div class="raises">${steps.map(a => `<button class="btn btn--primary raise" type="button" data-raise="${a}">$${a}<small>${a === p.budget ? "all in" : `+$${a - lot.bid}`}</small></button>`).join("")}</div>
        <p class="hand" style="margin-top:.5rem">tap to raise; every bid resets the clock</p>`;
    }
    app.innerHTML = `${header()}${clock}${lotCard(c, bidLine)}${body}${myTeam()}`;
    app.querySelectorAll("[data-step]").forEach(b => b.addEventListener("click", () => {
      openAmount.amount = Math.min(Math.max(1, openAmount.amount + Number(b.dataset.step)), p.budget);
      document.getElementById("amount").textContent = `$${openAmount.amount}`;
      document.getElementById("open").textContent = `Open at $${openAmount.amount}`;
    }));
    on("open", () => { net.send({ t: "open", amount: openAmount.amount }); buzz(30); });
    on("skip", () => net.send({ t: "skip" }));
    app.querySelectorAll("[data-raise]").forEach(b => b.addEventListener("click", () => {
      net.send({ t: "raise", amount: Number(b.dataset.raise) }); buzz(25);
    }));
  }

  function soldView() {
    const r = state.sold, c = card(r.card), w = player(r.winner);
    const title = !w ? "Skipped" : w.id === me.id ? "Yours" : `${w.name} got them`;
    if (w && w.id === me.id) buzz([30, 40, 30]);
    app.innerHTML = `${header()}<h1 class="title title--xl arrive">${esc(title)}<span class="accent">.</span></h1>
      ${lotCard(c, w ? `<br /><span class="hand">for $${r.amount}</span>` : `<br /><span class="hand">gone for good</span>`)}
      <p class="hand">next card in a moment</p>${myTeam()}`;
  }

  // The first to join runs the show: a button for whatever comes next.
  function adminBar() {
    if (!me || !me.admin || !state) return;
    const s = state, m = s.match;
    let label = null, msg = "admin:next", extra = "";
    if (s.phase === "lobby") { label = s.players.length < 2 ? null : `Start the draft (${s.players.length} players)`; msg = "admin:start"; }
    else if (s.phase === "auction" && s.lot.stage === "bidding") label = "Sold! Close the bidding";
    else if (s.phase === "sold") label = "Next card";
    else if (s.phase === "teams") label = "Start the tournament";
    else if (s.phase === "bracket") label = "Start the fight";
    else if (s.phase === "match" && m.stage === "vote") label = "Close the vote";
    else if (s.phase === "match" && m.stage === "judging") { label = "Let the crowd decide instead"; msg = "admin:crowd"; }
    else if (s.phase === "match" && m.stage === "result") label = "Next fight";
    else if (s.phase === "champion") { label = "Play again with everyone"; msg = "admin:again"; }
    if (s.phase === "lobby" && s.players.length < 2) extra = `<span class="muted">Waiting for someone else to join.</span>`;
    if (!label && !extra) return;
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.innerHTML = `<span class="hand">you're running the show</span>${label ? `<button class="btn btn--primary btn--wide" type="button" id="admin-go">${esc(label)}</button>` : ""}${extra}`;
    app.prepend(bar);
    on("admin-go", () => { net.send({ t: msg }); buzz(20); });
  }

  function myTeam() {
    const p = mine();
    if (!p || !p.roster.length) return "";
    return `<span class="rule"></span><p class="hand">your team</p>
      <div class="pick">${p.roster.map(r => {
        const c = card(r.card);
        const k = (state.conditions || {})[r.card];
        const word = !k ? "" : k.status === "dead" ? "fallen" : k.status === "broken" ? "gear broken" : "injured";
        return `<div class="pick__card ${k && k.status === "dead" ? "pick__card--dead" : ""}">${picture(c)}<span><span class="card__name">${esc(c.name)}</span><br />
          <span class="hand">$${r.price}${k ? ` · ${word}` : ""}</span>${k ? `<br /><span class="card__note">${esc(k.note)}</span>` : ""}</span></div>`;
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
      const mineHurt = (m.aftermath || []).filter(a => mine().roster.some(r => r.card === a.card));
      app.innerHTML = `${header()}<h1 class="title title--xl arrive">${esc(msg)}<span class="accent">.</span></h1>
        <p class="big-note">${m.verdict ? `<em>${esc(m.verdict.verdict)}</em>` : m.tally ? `${m.tally[0]} votes to ${m.tally[1]}${m.tie ? ", settled by a coin" : ""}.` : ""}</p>
        ${mineHurt.length ? `<p class="hand">what it cost you</p><ul class="big-note" style="list-style:none">${mineHurt.map(a => {
          const c = card(a.card);
          return `<li><em>${esc(c ? c.name : "?")}</em> ${a.status === "dead" ? "fell" : a.status === "broken" ? "lost their gear" : "was injured"}: ${esc(a.note)}</li>`;
        }).join("")}</ul>` : ""}${fighting ? myTeam() : ""}`;
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
