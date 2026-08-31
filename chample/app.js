/* Chample — front-end only. No server, no database, no build step.
   State lives in localStorage; the daily champion is derived from the date,
   so every browser lands on the same answer without anything asking a server. */

import { CHAMPIONS, BY_KEY, TAGS, SLOTS, normalise } from "./champions.js";

const LEN = 5;
const ROWS = 6;
const KEY = "chample:v1:state";
const EPOCH = new Date(2026, 0, 1);   /* day zero, local time */

/* --- Storage ---------------------------------------------------------
   Always wrapped: storage throws in private mode and when site data is
   blocked, and an uncaught throw here takes down the whole game. */

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

/* --- Which champion, which day ---------------------------------------
   The roster is shuffled once with a fixed seed, then indexed by day.
   Adding a champion therefore never disturbs a puzzle already played, and
   consecutive days are never neighbours in an alphabetical list. */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORDER = (() => {
  const a = CHAMPIONS.map(c => c.key);
  const rnd = mulberry32(0x5a17b);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
})();

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const dayNumber = () => Math.round((startOfToday() - EPOCH) / 86400000);
const championForDay = n => ORDER[((n % ORDER.length) + ORDER.length) % ORDER.length];
const randomChampion = () => ORDER[Math.floor(Math.random() * ORDER.length)];

/* --- State -----------------------------------------------------------
   Two independent games: the shared daily one, and endless practice.
   Only the daily game touches the statistics. */

const blankStats = () => ({
  played: 0, wins: 0, streak: 0, best: 0, lastDay: null, lastResult: null,
  dist: [0, 0, 0, 0, 0, 0]
});

const blankDaily = n => ({ day: n, guesses: [], status: "playing" });
const blankEndless = () => ({ champion: randomChampion(), guesses: [], status: "playing" });

function fresh() {
  return {
    version: 1, mode: "daily",
    daily: blankDaily(dayNumber()), endless: blankEndless(), stats: blankStats()
  };
}

/* Anything missing or malformed falls back rather than throwing — an old
   backup or a half-written key should never leave a blank page. */
function normaliseState(raw) {
  const s = fresh();
  if (!raw || typeof raw !== "object") return s;
  if (raw.mode === "endless") s.mode = "endless";

  const guessesOk = g => Array.isArray(g) && g.every(k => BY_KEY.has(k));

  if (raw.daily && Number.isInteger(raw.daily.day) && guessesOk(raw.daily.guesses)) s.daily = raw.daily;
  if (raw.endless && BY_KEY.has(raw.endless.champion) && guessesOk(raw.endless.guesses)) s.endless = raw.endless;
  if (raw.stats && typeof raw.stats === "object") s.stats = Object.assign(blankStats(), raw.stats);
  if (!Array.isArray(s.stats.dist) || s.stats.dist.length !== ROWS) s.stats.dist = [0, 0, 0, 0, 0, 0];
  if (s.daily.day !== dayNumber()) s.daily = blankDaily(dayNumber());
  return s;
}

let state = normaliseState(store.get(null));

const save = () => store.set(state);
const game = () => state[state.mode];
const answerKey = () => (state.mode === "daily" ? championForDay(state.daily.day) : state.endless.champion);
const answer = () => BY_KEY.get(answerKey());

/* --- Scoring ---------------------------------------------------------
   Two passes, so a tag the guess repeats is only ever marked as many times
   as it actually appears in the answer's kit. Same rule as the letters in
   an ordinary word game — the slots just hold tags instead. */

function score(guessKit, answerKit) {
  const out = Array(LEN).fill("miss");
  const left = {};
  for (let i = 0; i < LEN; i++) {
    if (guessKit[i] === answerKit[i]) out[i] = "hit";
    else left[answerKit[i]] = (left[answerKit[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (out[i] === "hit") continue;
    const t = guessKit[i];
    if (left[t] > 0) { out[i] = "near"; left[t]--; }
  }
  return out;
}

const SAID = { hit: "same slot", near: "elsewhere in the kit", miss: "not in the kit" };

/* --- Board -----------------------------------------------------------  */

const rowsEl = document.getElementById("rows");
const rows = [];

for (let r = 0; r < ROWS; r++) {
  const row = document.createElement("li");
  row.className = "kit-row";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", `Guess ${r + 1}`);

  const name = document.createElement("span");
  name.className = "kit-row__name";

  const cells = [];
  for (let c = 0; c < LEN; c++) {
    const cell = document.createElement("span");
    cell.className = "cell";
    cell.dataset.state = "empty";
    cell.style.setProperty("--c", String(c));
    const tag = document.createElement("span");
    tag.className = "cell__tag";
    const said = document.createElement("span");
    said.className = "visually-hidden";
    cell.append(tag, said);
    cells.push(cell);
  }

  row.append(name, ...cells);
  rowsEl.append(row);
  rows.push({ el: row, name, cells });
}

function paintRow(r, champion, marks, animate) {
  const row = rows[r];
  row.el.classList.toggle("is-twin", Boolean(champion) && marks.every(m => m === "hit") && champion.key !== answerKey());
  row.name.textContent = champion ? champion.name : "";

  row.cells.forEach((cell, c) => {
    cell.classList.remove("is-settling");
    if (!champion) {
      cell.dataset.state = "empty";
      cell.firstChild.textContent = "";
      cell.lastChild.textContent = "";
      return;
    }
    const paint = () => {
      cell.dataset.state = marks[c];
      cell.firstChild.textContent = TAGS[champion.kit[c]];
      cell.lastChild.textContent = `${SLOTS[c]}: ${TAGS[champion.kit[c]]}, ${SAID[marks[c]]}.`;
      if (!animate) return;
      cell.classList.add("is-settling");
      setTimeout(() => cell.classList.remove("is-settling"), 480);
    };
    animate ? setTimeout(paint, c * 150) : paint();
  });
}

function paintBoard() {
  const g = game();
  const ans = answer();
  for (let r = 0; r < ROWS; r++) {
    rows[r].el.classList.remove("is-won");
    const key = g.guesses[r];
    const champion = key ? BY_KEY.get(key) : null;
    paintRow(r, champion, champion ? score(champion.kit, ans.kit) : [], false);
  }
  if (g.status === "won") rows[g.guesses.length - 1].el.classList.add("is-won");
  paintPalette();
}

/* --- The tag palette -------------------------------------------------
   What you know about the vocabulary so far, in one line. Green: this tag
   is pinned to a slot. Gold: it is in the kit somewhere. Grey: ruled out. */

const RANK = { miss: 1, near: 2, hit: 3 };
const paletteEl = document.getElementById("palette");
const paletteChips = {};

for (const code in TAGS) {
  const chip = document.createElement("span");
  chip.className = "chip";
  const label = document.createElement("span");
  label.textContent = TAGS[code];
  const said = document.createElement("span");
  said.className = "visually-hidden";
  chip.append(label, said);
  paletteEl.append(chip);
  paletteChips[code] = chip;
}

function paintPalette() {
  const g = game();
  const ans = answer();
  const best = {};
  for (const key of g.guesses) {
    const champion = BY_KEY.get(key);
    const marks = score(champion.kit, ans.kit);
    for (let i = 0; i < LEN; i++) {
      const t = champion.kit[i];
      if (!best[t] || RANK[marks[i]] > RANK[best[t]]) best[t] = marks[i];
    }
  }
  for (const code in paletteChips) {
    const chip = paletteChips[code];
    const known = best[code] ? SAID[best[code]] : "nothing known yet";
    if (best[code]) chip.dataset.state = best[code];
    else delete chip.dataset.state;
    chip.title = `${TAGS[code]} — ${known}`;
    chip.lastChild.textContent = ` — ${known}.`;
  }
}

/* --- Guessing --------------------------------------------------------  */

const formEl = document.getElementById("guess-form");
const inputEl = document.getElementById("guess");
const suggestEl = document.getElementById("suggest");
const msgEl = document.getElementById("msg");
let msgTimer;
let active = -1;
let matches = [];

function flash(text) {
  clearTimeout(msgTimer);
  msgEl.textContent = text;
  msgTimer = setTimeout(() => { msgEl.textContent = ""; }, 3200);
}

function shake() {
  const row = rows[Math.min(game().guesses.length, ROWS - 1)];
  row.el.classList.remove("is-wrong");
  void row.el.offsetWidth;              /* restart the animation */
  row.el.classList.add("is-wrong");
  setTimeout(() => row.el.classList.remove("is-wrong"), 460);
}

function findMatches(text) {
  const q = normalise(text);
  if (!q) return [];
  const starts = [], contains = [];
  for (const c of CHAMPIONS) {
    if (c.key.startsWith(q)) starts.push(c);
    else if (c.key.includes(q)) contains.push(c);
  }
  return starts.concat(contains).slice(0, 7);
}

function paintSuggestions() {
  const guessed = new Set(game().guesses);
  suggestEl.replaceChildren(...matches.map((c, i) => {
    const li = document.createElement("li");
    li.className = "suggest__item";
    li.id = `suggest-${i}`;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(i === active));
    li.textContent = c.name;
    if (guessed.has(c.key)) {
      const note = document.createElement("span");
      note.className = "suggest__note";
      note.textContent = "guessed";
      li.append(note);
    }
    li.addEventListener("mousedown", e => { e.preventDefault(); choose(c); });
    return li;
  }));

  const open = matches.length > 0 && game().status === "playing";
  suggestEl.hidden = !open;
  inputEl.setAttribute("aria-expanded", String(open));
  if (active >= 0 && open) inputEl.setAttribute("aria-activedescendant", `suggest-${active}`);
  else inputEl.removeAttribute("aria-activedescendant");
}

function closeSuggestions() {
  matches = [];
  active = -1;
  paintSuggestions();
}

function choose(champion) {
  inputEl.value = "";
  closeSuggestions();
  submit(champion);
}

inputEl.addEventListener("input", () => {
  matches = findMatches(inputEl.value);
  active = matches.length ? 0 : -1;
  paintSuggestions();
});

inputEl.addEventListener("blur", () => setTimeout(closeSuggestions, 120));

inputEl.addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!matches.length) return;
    e.preventDefault();
    active = (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
    paintSuggestions();
  } else if (e.key === "Enter") {
    /* Submit from the field explicitly rather than relying on the browser's
       implicit submission, which a combobox can swallow. */
    e.preventDefault();
    formEl.requestSubmit();
  } else if (e.key === "Escape") {
    closeSuggestions();
  }
});

formEl.addEventListener("submit", e => {
  e.preventDefault();
  if (active >= 0 && matches[active]) return choose(matches[active]);

  const typed = normalise(inputEl.value);
  if (!typed) { flash("Name a champion — any champion."); return; }

  const champion = BY_KEY.get(typed) || (findMatches(inputEl.value).length === 1 ? findMatches(inputEl.value)[0] : null);
  if (!champion) { flash(`${inputEl.value.trim()} isn't in the roster.`); shake(); return; }

  inputEl.value = "";
  closeSuggestions();
  submit(champion);
});

function submit(champion) {
  const g = game();
  if (g.status !== "playing") return;

  if (g.guesses.includes(champion.key)) {
    flash(`You've already guessed ${champion.name}.`);
    shake();
    return;
  }

  const ans = answer();
  const marks = score(champion.kit, ans.kit);
  const won = champion.key === ans.key;
  g.guesses.push(champion.key);
  const r = g.guesses.length - 1;
  const over = won || g.guesses.length === ROWS;

  if (over) {
    g.status = won ? "won" : "lost";
    if (state.mode === "daily") recordResult(won, g.guesses.length);
  }
  save();

  paintRow(r, champion, marks, true);

  setTimeout(() => {
    paintPalette();
    if (won) rows[r].el.classList.add("is-won");
    if (over) { formEl.hidden = true; setTimeout(showResult, won ? 900 : 500); }
    else if (marks.every(m => m === "hit")) flash("Every slot matches — and it still isn't the champion.");
    else if (g.guesses.length === ROWS - 1) flash("One guess left.");
  }, LEN * 150);
}

/* --- Statistics ------------------------------------------------------
   Daily only. Endless is practice and never touches the streak. */

function recordResult(won, guesses) {
  const s = state.stats;
  const day = state.daily.day;
  if (s.lastDay === day) return;                 /* never count a day twice */
  s.played++;
  if (won) {
    s.wins++;
    s.dist[guesses - 1]++;
    s.streak = s.lastDay === day - 1 ? s.streak + 1 : 1;
    s.best = Math.max(s.best, s.streak);
  } else {
    s.streak = 0;
  }
  s.lastDay = day;
  s.lastResult = won ? guesses : 0;
}

const distEl = document.getElementById("dist");

function paintStats() {
  const s = state.stats;
  document.getElementById("s-played").textContent = s.played;
  document.getElementById("s-rate").textContent = s.played ? Math.round((s.wins / s.played) * 100) + "%" : "—";
  document.getElementById("s-streak").textContent = s.streak;
  document.getElementById("s-best").textContent = s.best;

  const peak = Math.max(1, ...s.dist);
  const showLatest = state.daily.status === "won" && s.lastDay === state.daily.day;
  distEl.replaceChildren(...s.dist.map((n, i) => {
    const row = document.createElement("div");
    row.className = "dist__row" + (showLatest && s.lastResult === i + 1 ? " is-latest" : "");
    const label = document.createElement("span");
    label.textContent = i + 1;
    const bar = document.createElement("span");
    bar.className = "dist__bar";
    bar.style.width = Math.round((n / peak) * 100) + "%";
    bar.textContent = n;
    row.append(label, bar);
    return row;
  }));
}

/* --- Result ----------------------------------------------------------  */

const resultEl = document.getElementById("result");
const verdictEl = document.getElementById("result-verdict");
const nameEl = document.getElementById("result-name");
const kitEl = document.getElementById("result-kit");
const nextEl = document.getElementById("next-champion");
const againBtn = document.getElementById("again");
const shareBtn = document.getElementById("share");

const PRAISE = ["First guess. Suspicious.", "Two. Very nice.", "Three — clean.",
                "Four. Solid.", "Five, with room to spare.", "Sixth guess. Close one."];

let tick;

function showResult() {
  const g = game();
  const ans = answer();
  verdictEl.textContent = g.status === "won" ? PRAISE[g.guesses.length - 1] : "Not this time. The kit belonged to";
  nameEl.textContent = ans.name;

  kitEl.replaceChildren(...ans.kit.map((code, i) => {
    const cell = document.createElement("span");
    cell.className = "cell";
    cell.dataset.state = "hit";
    const tag = document.createElement("span");
    tag.className = "cell__tag";
    tag.textContent = TAGS[code];
    const slot = document.createElement("span");
    slot.className = "cell__slot";
    slot.textContent = SLOTS[i];
    cell.append(slot, tag);
    return cell;
  }));

  resultEl.hidden = false;
  againBtn.hidden = state.mode !== "endless";
  shareBtn.textContent = "Copy my grid";

  clearInterval(tick);
  if (state.mode === "daily") {
    const countdown = () => { nextEl.textContent = "Next kit in " + untilMidnight(); };
    countdown();
    tick = setInterval(countdown, 1000);
  } else {
    nextEl.textContent = "";
  }
  paintStats();
}

function hideResult() {
  resultEl.hidden = true;
  clearInterval(tick);
}

function untilMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next - now) / 1000));
  const pad = n => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

againBtn.addEventListener("click", () => {
  state.endless = blankEndless();
  save();
  hideResult();
  paintBoard();
  formEl.hidden = false;
  inputEl.focus();
  flash("New kit. Off you go.");
});

shareBtn.addEventListener("click", async () => {
  const g = game();
  const ans = answer();
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const face = { hit: "\u{1F7E9}", near: "\u{1F7E8}", miss: dark ? "⬛" : "⬜" };
  const tally = g.status === "won" ? g.guesses.length : "X";
  const head = state.mode === "daily"
    ? `Chample no. ${state.daily.day + 1} — ${tally}/${ROWS}`
    : `Chample practice — ${tally}/${ROWS}`;
  const grid = g.guesses
    .map(key => score(BY_KEY.get(key).kit, ans.kit).map(m => face[m]).join(""))
    .join("\n");
  const text = `${head}\n${grid}`;

  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "Copied.";
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    try { document.execCommand("copy"); shareBtn.textContent = "Copied."; }
    catch { shareBtn.textContent = "Copy failed"; }
    ta.remove();
  }
  setTimeout(() => { shareBtn.textContent = "Copy my grid"; }, 2000);
});

/* --- Modes -----------------------------------------------------------  */

document.querySelectorAll(".mode").forEach(btn => {
  btn.addEventListener("click", () => {
    if (state.mode === btn.dataset.mode) return;
    state.mode = btn.dataset.mode;
    save();
    paintMode();
  });
});

function paintMode() {
  document.querySelectorAll(".mode").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode));
  });
  document.getElementById("daynum").textContent = state.mode === "daily"
    ? `no. ${state.daily.day + 1} — five slots, one champion`
    : "endless — five slots, one champion";

  inputEl.value = "";
  closeSuggestions();
  hideResult();
  paintBoard();

  const over = game().status !== "playing";
  formEl.hidden = over;
  if (over) showResult();
  paintStats();
}

/* --- The codex -------------------------------------------------------
   Every kit in the roster, in full. Built on first open rather than on
   load: it is 120 rows nobody has asked for yet. */

const codexEl = document.getElementById("codex-list");
const codexDetails = document.getElementById("codex");

codexDetails.addEventListener("toggle", () => {
  if (!codexDetails.open || codexEl.childElementCount) return;
  codexEl.replaceChildren(...CHAMPIONS.map(c => {
    const li = document.createElement("li");
    li.className = "codex__row";
    const name = document.createElement("span");
    name.className = "codex__name";
    name.textContent = c.name;
    const tags = document.createElement("span");
    tags.className = "codex__tags";
    tags.textContent = c.kit.map(code => TAGS[code]).join(" · ");
    li.append(name, tags);
    return li;
  }));
});

/* --- Export / import -------------------------------------------------
   Browser storage is evictable. This is the backup, the migration and the
   move-to-another-machine story, all at once. */

document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "chample-progress.json" });
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
      throw new Error("wrong shape");
    }
    state = normaliseState(parsed);
    save();
    paintMode();
    flash("Progress restored.");
  } catch {
    flash("That doesn't look like a Chample backup.");
  }
  e.target.value = "";
});

/* Another tab played today's kit — follow along rather than diverge. */
addEventListener("storage", e => {
  if (e.key !== KEY || !e.newValue) return;
  try { state = normaliseState(JSON.parse(e.newValue)); } catch { return; }
  paintMode();
});

/* --- Entrance --------------------------------------------------------
   Anything with .reveal and an --i index arrives on a 90ms stagger. */

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

/* --- Theme -----------------------------------------------------------
   The label describes the action, not the state. */

const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");

function paintTheme(theme) {
  root.setAttribute("data-theme", theme);
  toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

paintTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

toggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  paintTheme(next);
  try { localStorage.setItem("theme", next); } catch { /* no-op */ }
});

document.getElementById("count").textContent = CHAMPIONS.length;

paintMode();
save();
