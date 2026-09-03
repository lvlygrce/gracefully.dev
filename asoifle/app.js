/* asoifle — front-end only. No server, no database, no build step.
   The roster lives in characters.js; everything below is the game. */

import { CHARACTERS, DAILY_POOL } from "./characters.js";

const MAX_GUESSES = 8;

/* The columns, in board order. `compare` below returns one verdict per column. */
const COLUMNS = [
  { key: "name",     label: "Character" },
  { key: "house",    label: "House" },
  { key: "origin",   label: "Origin" },
  { key: "gender",   label: "Gender" },
  { key: "status",   label: "At the end" },
  { key: "season",   label: "First seen" },
  { key: "episodes", label: "Episodes" },
];

/* --- Storage ---------------------------------------------------------
   Always wrapped: storage throws in private mode and when site data is
   blocked, and an uncaught throw here takes down the whole game. */

const KEY = "asoifle:v1:state";

const store = {
  get(fallback = null) {
    try {
      const raw = localStorage.getItem(KEY);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); return true; }
    catch { return false; }
  }
};

const BLANK = {
  version: 1,
  stats: { played: 0, won: 0, streak: 0, best: 0, lastDay: null },
  daily: null,          // { day, guesses: [name], done, won }
};

let saved = { ...BLANK, ...(store.get({}) || {}) };
saved.stats = { ...BLANK.stats, ...(saved.stats || {}) };

const save = () => store.set(saved);

/* --- Which character, and why ---------------------------------------
   The daily answer is deterministic: the pool is shuffled once with a fixed
   seed, then walked one place a day. Everybody gets the same character, and
   nobody sees a repeat until the whole pool has been through. */

const EPOCH = Date.UTC(2026, 0, 1);

function today() {
  const now = new Date();
  const local = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((local - EPOCH) / 86400000);
}

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAILY_ORDER = (() => {
  const list = DAILY_POOL.slice();
  const rand = mulberry(20260101);          // fixed seed, so the order never moves
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
})();

const dailyFor = day => DAILY_ORDER[((day % DAILY_ORDER.length) + DAILY_ORDER.length) % DAILY_ORDER.length];

const byName = name =>
  CHARACTERS.find(c => c.name.toLowerCase() === String(name).toLowerCase()) || null;

/* --- Comparing a guess ----------------------------------------------- */

function verdict(state, text, mark) { return { state, text, mark }; }

function compare(guess, answer) {
  const out = {};

  out.name = verdict(guess.name === answer.name ? "hit" : "miss", guess.name, "");

  out.house = verdict(guess.house === answer.house ? "hit" : "miss", guess.house, "");

  out.origin = guess.origin === answer.origin
    ? verdict("hit", guess.origin, "")
    : guess.realm === answer.realm && guess.realm !== "Unknown"
      ? verdict("near", guess.origin, "")
      : verdict("miss", guess.origin, "");

  out.gender = verdict(guess.gender === answer.gender ? "hit" : "miss", guess.gender, "");
  out.status = verdict(guess.status === answer.status ? "hit" : "miss", guess.status, "");

  out.season = numeric(guess.season, answer.season, 1);
  out.episodes = numeric(guess.episodes, answer.episodes, 5);

  return out;
}

/* Numbers get a third state: near, plus an arrow pointing at the answer. */
function numeric(a, b, tolerance) {
  if (a === b) return verdict("hit", String(a), "");
  const arrow = b > a ? "↑" : "↓";
  return verdict(Math.abs(a - b) <= tolerance ? "near" : "miss", String(a), arrow);
}

/* --- Game state ------------------------------------------------------ */

const game = {
  mode: "daily",      // daily | endless | challenge
  answer: null,
  guesses: [],        // characters, oldest first
  over: false,
  won: false,
  hinted: false,
  day: today(),
};

/* --- Elements -------------------------------------------------------- */

const el = id => document.getElementById(id);
const form = el("guess-form");
const input = el("guess-input");
const suggestions = el("suggestions");
const head = el("board-head");
const body = el("board-body");
const boardwrap = el("boardwrap");
const hint = el("hint");
const tally = el("tally");
const narrowing = el("narrowing");
const remaining = el("remaining");
const hintBtn = el("hint-btn");
const whisper = el("whisper");
const playLabel = el("play-label");
const outcome = el("outcome");

/* --- Board ----------------------------------------------------------- */

function drawHead() {
  head.replaceChildren(...COLUMNS.map(col => {
    const d = document.createElement("div");
    d.className = "board__th";
    d.textContent = col.label;
    return d;
  }));
}

function drawGuess(guess) {
  const v = compare(guess, game.answer);
  const row = document.createElement("div");
  row.className = "row";
  row.setAttribute("role", "row");

  COLUMNS.forEach((col, i) => {
    const cell = document.createElement("div");
    const r = v[col.key];
    cell.className = `cell cell--${r.state}` + (col.key === "name" ? " cell--name" : "");
    cell.style.setProperty("--c", i);
    cell.setAttribute("role", "cell");

    const word = document.createElement("span");
    word.className = "cell__text";
    word.textContent = r.text;
    cell.append(word);

    if (r.mark) {
      const m = document.createElement("span");
      m.className = "cell__arrow";
      m.textContent = r.mark;
      m.setAttribute("aria-hidden", "true");
      cell.append(m);
    }

    const said = r.state === "hit" ? "correct" : r.state === "near" ? "close" : "wrong";
    const dir = r.mark === "↑" ? ", answer is higher" : r.mark === "↓" ? ", answer is lower" : "";
    cell.setAttribute("aria-label", `${col.label}: ${r.text}, ${said}${dir}`);

    row.append(cell);
  });

  body.prepend(row);
  boardwrap.hidden = false;
}

/* --- Who is left -----------------------------------------------------
   A character still fits if every guess so far would have produced exactly
   the same six clues against them as it did against the real answer. The
   name column is in the comparison too, which is what rules out the people
   already guessed. */

function sameClues(a, b) {
  return COLUMNS.every(c => a[c.key].state === b[c.key].state && a[c.key].mark === b[c.key].mark);
}

function stillFit() {
  const told = game.guesses.map(g => [g, compare(g, game.answer)]);
  return CHARACTERS.filter(candidate =>
    told.every(([g, clues]) => sameClues(compare(g, candidate), clues))).length;
}

function drawNarrowing() {
  if (game.over || game.guesses.length === 0) {
    narrowing.hidden = true;
    return;
  }
  narrowing.hidden = false;
  const n = stillFit();
  remaining.textContent = n === 1
    ? "One character still fits. You have it."
    : `${n} of the ${CHARACTERS.length} still fit.`;
  hintBtn.hidden = game.hinted || game.guesses.length < 3;
}

/* The hint is a line they said. Not everyone has one worth quoting, so the
   fallback is their initials. */
function drawHint() {
  const a = game.answer;
  whisper.hidden = false;
  if (a.quote) {
    el("whisper-text").textContent = `\u201C${a.quote}\u201D`;
    el("whisper-by").textContent = "something they said";
  } else {
    el("whisper-text").textContent = a.initials;
    el("whisper-by").textContent = "their initials — they were never one for speeches";
  }
}

hintBtn.addEventListener("click", () => {
  game.hinted = true;
  hintBtn.hidden = true;
  drawHint();
  if (game.mode === "daily") persistDaily();
});

/* --- The turn -------------------------------------------------------- */

function submitGuess(character) {
  if (game.over) return;

  game.guesses.push(character);
  drawGuess(character);
  input.value = "";
  closeSuggestions();
  say("");

  if (character.name === game.answer.name) finish(true);
  else if (game.guesses.length >= MAX_GUESSES) finish(false);
  else {
    updateTally();
    /* Sansa and Arya are identical on all six clues, as are one or two other
       pairs. Say so rather than letting a row of green look broken. */
    const v = compare(character, game.answer);
    if (COLUMNS.slice(1).every(c => v[c.key].state === "hit")) {
      say("Every clue matches — and it is still not them.");
    }
  }

  drawNarrowing();
  if (game.mode === "daily") persistDaily();
}

function persistDaily() {
  saved.daily = {
    day: game.day,
    guesses: game.guesses.map(c => c.name),
    done: game.over,
    won: game.won,
    hinted: game.hinted,
  };
  save();
}

function updateTally() {
  tally.textContent = game.over
    ? `${game.guesses.length} of ${MAX_GUESSES}`
    : `${game.guesses.length + 1} of ${MAX_GUESSES}`;
}

function finish(won) {
  game.over = true;
  game.won = won;
  updateTally();
  form.hidden = true;
  narrowing.hidden = true;

  if (game.mode === "daily" && saved.stats.lastDay !== game.day) {
    const s = saved.stats;
    s.played += 1;
    if (won) {
      s.won += 1;
      s.streak = s.lastDay === game.day - 1 || s.lastDay === null ? s.streak + 1 : 1;
      s.best = Math.max(s.best, s.streak);
    } else {
      s.streak = 0;
    }
    s.lastDay = game.day;
    save();
  }

  drawStats();
  drawOutcome();
}

/* --- Outcome --------------------------------------------------------- */

function drawOutcome() {
  const a = game.answer;
  const n = game.guesses.length;

  outcome.hidden = false;
  outcome.innerHTML = "";

  const h = document.createElement("p");
  h.className = "outcome__line";
  h.textContent = game.won
    ? n === 1 ? "First guess. Suspicious." : `Found in ${n}.`
    : "Eight guesses and the raven still came back empty.";
  outcome.append(h);

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <p class="card__name">${escape(a.name)}</p>
    <p class="card__meta">${escape(a.house)} &middot; ${escape(a.origin)} &middot; ${escape(a.gender)}
      &middot; ${escape(a.status)} at the end &middot; first seen in season ${a.season}
      &middot; ${a.episodes} episodes</p>
    ${a.note ? `<p class="card__note">${escape(a.note)}</p>` : ""}`;
  outcome.append(card);

  const tools = document.createElement("p");
  tools.className = "outcome__tools";

  const share = document.createElement("button");
  share.type = "button";
  share.className = "btn";
  share.textContent = "Copy your grid";
  share.addEventListener("click", () => copy(shareText(), share, "Copy your grid"));
  tools.append(share);

  const challenge = document.createElement("button");
  challenge.type = "button";
  challenge.className = "btn btn--quiet";
  challenge.textContent = "Send this one to a friend";
  challenge.addEventListener("click", () => copy(challengeLink(a), challenge, "Send this one to a friend"));
  tools.append(challenge);

  if (game.mode !== "daily") {
    const again = document.createElement("button");
    again.type = "button";
    again.className = "btn btn--quiet";
    again.textContent = "Another one";
    again.addEventListener("click", () => newEndless());
    tools.append(again);
  }

  outcome.append(tools);
}

const SQUARE = { hit: "🟩", near: "🟨", miss: "⬜" };

function shareText() {
  const score = `${game.won ? game.guesses.length : "X"}/${MAX_GUESSES}${game.hinted ? "*" : ""}`;
  const title = game.mode === "daily" ? `asoifle ${game.day} — ${score}` : `asoifle — ${score}`;

  const grid = game.guesses.map(g => {
    const v = compare(g, game.answer);
    return COLUMNS.slice(1).map(c => SQUARE[v[c.key].state]).join("");
  });

  return [title, ...grid, location.origin + location.pathname].join("\n");
}

function challengeLink(character) {
  const code = btoa(encodeURIComponent(character.name)).replace(/=+$/, "");
  return `${location.origin}${location.pathname}#c=${code}`;
}

async function copy(text, button, original) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Press ⌘C";
    prompt("Copy this:", text);
  }
  setTimeout(() => { button.textContent = original; }, 1800);
}

/* --- Suggestions ----------------------------------------------------- */

let active = -1;
let matches = [];

function openSuggestions(list) {
  matches = list;
  active = -1;
  suggestions.replaceChildren(...list.map((c, i) => {
    const li = document.createElement("li");
    li.className = "combo__option";
    li.setAttribute("role", "option");
    li.id = `option-${i}`;
    li.textContent = c.name;
    li.addEventListener("mousedown", e => { e.preventDefault(); submitGuess(c); });
    return li;
  }));
  suggestions.hidden = list.length === 0;
  input.setAttribute("aria-expanded", String(list.length > 0));
}

function closeSuggestions() {
  suggestions.hidden = true;
  suggestions.replaceChildren();
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  matches = [];
  active = -1;
}

function highlight(i) {
  [...suggestions.children].forEach((li, n) => li.classList.toggle("is-active", n === i));
  active = i;
  if (i >= 0) {
    input.setAttribute("aria-activedescendant", `option-${i}`);
    suggestions.children[i].scrollIntoView({ block: "nearest" });
  }
}

function pool() {
  const used = new Set(game.guesses.map(c => c.name));
  return CHARACTERS.filter(c => !used.has(c.name));
}

input.addEventListener("input", () => {
  const q = input.value.trim().toLowerCase();
  if (!q) return closeSuggestions();
  const starts = [], contains = [];
  for (const c of pool()) {
    const n = c.name.toLowerCase();
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  openSuggestions([...starts, ...contains].slice(0, 8));
});

input.addEventListener("keydown", e => {
  /* Enter is handled here rather than left to implicit form submission,
     so it works the same whether or not the list is open. */
  if (e.key === "Enter") { e.preventDefault(); form.requestSubmit(); return; }
  if (suggestions.hidden) return;
  if (e.key === "ArrowDown") { e.preventDefault(); highlight((active + 1) % matches.length); }
  else if (e.key === "ArrowUp") { e.preventDefault(); highlight((active - 1 + matches.length) % matches.length); }
  else if (e.key === "Escape") { closeSuggestions(); }
});

input.addEventListener("blur", () => setTimeout(closeSuggestions, 120));

form.addEventListener("submit", e => {
  e.preventDefault();
  if (active >= 0 && matches[active]) return submitGuess(matches[active]);

  const q = input.value.trim().toLowerCase();
  if (!q) return say("Type a name first.");

  const exact = pool().find(c => c.name.toLowerCase() === q);
  if (exact) return submitGuess(exact);
  if (matches.length === 1) return submitGuess(matches[0]);
  if (matches.length > 1) return say("Which one? Pick from the list.");

  const already = game.guesses.find(c => c.name.toLowerCase().includes(q));
  say(already ? `You already tried ${already.name}.` : "Nobody in the roster by that name.");
});

const say = text => { hint.textContent = text; };

/* --- Starting a game ------------------------------------------------- */

function start(mode, answer) {
  game.mode = mode;
  game.day = today();
  game.answer = answer || dailyFor(game.day);
  game.guesses = [];
  game.over = false;
  game.won = false;
  game.hinted = false;

  narrowing.hidden = true;
  whisper.hidden = true;
  hintBtn.hidden = true;
  body.replaceChildren();
  boardwrap.hidden = true;
  outcome.hidden = true;
  outcome.replaceChildren();
  form.hidden = false;
  input.value = "";
  say("");
  closeSuggestions();
  updateTally();

  playLabel.textContent =
    mode === "daily" ? "Guess today's character"
    : mode === "challenge" ? "Someone set you this one"
    : "Guess the character";

  document.querySelectorAll(".btn--mode").forEach(b =>
    b.classList.toggle("is-on", b.dataset.mode === mode));

  /* A daily already in progress is replayed from storage, so a reload
     never costs you your guesses. */
  if (mode === "daily" && saved.daily && saved.daily.day === game.day) {
    for (const name of saved.daily.guesses) {
      const c = byName(name);
      if (!c) continue;
      game.guesses.push(c);
      drawGuess(c);
    }
    if (saved.daily.hinted) { game.hinted = true; drawHint(); }
    if (saved.daily.done) finish(saved.daily.won);
    else { updateTally(); drawNarrowing(); }
  }

  if (!game.over) input.focus({ preventScroll: true });
}

function randomCharacter() {
  return DAILY_POOL[Math.floor(Math.random() * DAILY_POOL.length)];
}

/* Both modes drop any challenge hash, so a refresh does not drag you back
   into someone else's puzzle. */
function newEndless() {
  history.replaceState(null, "", location.pathname);
  start("endless", randomCharacter());
}

document.querySelectorAll(".btn--mode").forEach(b => {
  b.addEventListener("click", () => {
    if (b.dataset.mode !== "daily") return newEndless();
    history.replaceState(null, "", location.pathname);
    start("daily");
  });
});

/* --- Stats ----------------------------------------------------------- */

function drawStats() {
  const s = saved.stats;
  const rate = s.played ? Math.round((s.won / s.played) * 100) : 0;
  const rows = [
    ["Days played", s.played],
    ["Found", s.won],
    ["Hit rate", `${rate}%`],
    ["Streak", s.streak],
    ["Longest streak", s.best],
  ];
  el("stats-grid").replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    return [dt, dd];
  }));
}

/* --- Export / import -------------------------------------------------
   Browser storage is evictable; this is the backup and the move-to-a-new-
   laptop story, both at once. */

el("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "asoifle-record.json" });
  a.click();
  URL.revokeObjectURL(url);
});

el("import-btn").addEventListener("click", () => el("import-file").click());

el("import-file").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== "object" || !parsed.version) throw new Error("bad file");
    saved = { ...BLANK, ...parsed, stats: { ...BLANK.stats, ...(parsed.stats || {}) } };
    save();
    drawStats();
    say("Record loaded.");
  } catch {
    say("That file isn't an asoifle record.");
  }
  e.target.value = "";
});

/* --- Chrome ---------------------------------------------------------- */

const howBtn = el("how-btn");
howBtn.addEventListener("click", () => {
  const open = el("how").hidden;
  el("how").hidden = !open;
  howBtn.setAttribute("aria-expanded", String(open));
});

const escape = s => String(s).replace(/[&<>"]/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

/* Anything with .reveal and an --i index arrives on a 90ms stagger. */
const revealables = document.querySelectorAll(".reveal");
if (!("IntersectionObserver" in window)) {
  revealables.forEach(x => x.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  revealables.forEach(x => io.observe(x));
}

/* Theme — the label describes the action, not the state. */
const root = document.documentElement;
const toggle = el("theme-toggle");

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

el("year").textContent = new Date().getFullYear();

/* --- Go -------------------------------------------------------------- */

drawHead();
drawStats();

/* A challenge link carries the character in the hash — no server needed to
   pass a puzzle between two people. */
function fromHash() {
  const m = location.hash.match(/c=([A-Za-z0-9+/]+)/);
  if (!m) return null;
  try { return byName(decodeURIComponent(atob(m[1]))); } catch { return null; }
}

const challenged = fromHash();
if (challenged) start("challenge", challenged);
else start("daily");

/* A link pasted into a tab that already has the game open changes only the
   hash, so no reload happens and the game has to restart itself. */
window.addEventListener("hashchange", () => {
  const c = fromHash();
  if (c) start("challenge", c);
});
