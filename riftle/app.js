/* Riftle — front-end only. No server, no database, no build step.
   State lives in localStorage; the daily word is derived from the date,
   so every browser lands on the same answer without anything asking a server. */

import { ANSWERS, GLOSS } from "./words.js";

const LEN = 5;
const ROWS = 6;
const KEY = "riftle:v1:state";
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

/* --- Which word, which day -------------------------------------------
   The answers are shuffled once with a fixed seed, then indexed by day.
   Appending to words.js therefore never disturbs a puzzle already played,
   and consecutive days are never adjacent entries in the list. */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORDER = (() => {
  const a = ANSWERS.slice();
  const rnd = mulberry32(0x1f7c9);
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
const wordForDay = n => ORDER[((n % ORDER.length) + ORDER.length) % ORDER.length];
const randomWord = () => ORDER[Math.floor(Math.random() * ORDER.length)];

/* --- State -----------------------------------------------------------
   Two independent games: the shared daily one, and endless practice.
   Only the daily game touches the statistics. */

const blankStats = () => ({
  played: 0, wins: 0, streak: 0, best: 0, lastDay: null, lastResult: null,
  dist: [0, 0, 0, 0, 0, 0]
});

const blankDaily = n => ({ day: n, guesses: [], status: "playing" });
const blankEndless = () => ({ word: randomWord(), guesses: [], status: "playing" });

function fresh() {
  return { version: 1, mode: "daily", daily: blankDaily(dayNumber()), endless: blankEndless(), stats: blankStats() };
}

/* Anything missing or malformed falls back rather than throwing — an old
   backup or a half-written key should never leave a blank page. */
function normalise(raw) {
  const s = fresh();
  if (!raw || typeof raw !== "object") return s;
  if (raw.mode === "endless") s.mode = "endless";
  if (raw.daily && Number.isInteger(raw.daily.day) && Array.isArray(raw.daily.guesses)) s.daily = raw.daily;
  if (raw.endless && typeof raw.endless.word === "string" && Array.isArray(raw.endless.guesses)) s.endless = raw.endless;
  if (raw.stats && typeof raw.stats === "object") s.stats = Object.assign(blankStats(), raw.stats);
  if (!Array.isArray(s.stats.dist) || s.stats.dist.length !== ROWS) s.stats.dist = [0, 0, 0, 0, 0, 0];
  if (s.daily.day !== dayNumber()) s.daily = blankDaily(dayNumber());
  return s;
}

let state = normalise(store.get(null));
let current = "";

const save = () => store.set(state);
const game = () => state[state.mode];
const answer = () => (state.mode === "daily" ? wordForDay(state.daily.day) : state.endless.word);

/* --- Scoring ---------------------------------------------------------
   Two passes, so a repeated letter is only ever marked as many times as
   it actually appears in the answer. */

function score(guess, ans) {
  const out = Array(LEN).fill("miss");
  const left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === ans[i]) out[i] = "hit";
    else left[ans[i]] = (left[ans[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (out[i] === "hit") continue;
    const c = guess[i];
    if (left[c] > 0) { out[i] = "near"; left[c]--; }
  }
  return out;
}

/* --- Board -----------------------------------------------------------  */

const boardEl = document.getElementById("board");
const rows = [];

for (let r = 0; r < ROWS; r++) {
  const row = document.createElement("div");
  row.className = "row";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", `Guess ${r + 1}`);
  const tiles = [];
  for (let c = 0; c < LEN; c++) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.state = "empty";
    const letter = document.createElement("span");
    letter.className = "tile__letter";
    tile.append(letter);
    row.append(tile);
    tiles.push(tile);
  }
  boardEl.append(row);
  rows.push({ el: row, tiles });
}

function setTile(tile, char, state) {
  tile.firstChild.textContent = char;
  tile.dataset.state = state;
}

function paintBoard() {
  const g = game();
  const ans = answer();
  for (let r = 0; r < ROWS; r++) {
    rows[r].el.classList.remove("is-won", "is-wrong");
    const guess = g.guesses[r];
    const marks = guess ? score(guess, ans) : null;
    for (let c = 0; c < LEN; c++) {
      const tile = rows[r].tiles[c];
      tile.classList.remove("is-typed", "is-settling");
      if (guess) setTile(tile, guess[c], marks[c]);
      else if (r === g.guesses.length && g.status === "playing") {
        const ch = current[c] || "";
        setTile(tile, ch, ch ? "typed" : "empty");
      } else setTile(tile, "", "empty");
    }
  }
  if (g.status === "won") rows[g.guesses.length - 1].el.classList.add("is-won");
  paintKeys();
}

/* --- Keyboard --------------------------------------------------------  */

const RANK = { miss: 1, near: 2, hit: 3 };
const LAYOUT = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const keyEls = {};
const keyboardEl = document.getElementById("keyboard");

LAYOUT.forEach((letters, i) => {
  const row = document.createElement("div");
  row.className = "krow";
  if (i === 2) row.append(makeKey("enter", "Enter", true));
  for (const ch of letters) {
    const key = makeKey(ch, ch, false);
    keyEls[ch] = key;
    row.append(key);
  }
  if (i === 2) row.append(makeKey("back", "Delete", true));
  keyboardEl.append(row);
});

function makeKey(value, label, wide) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = wide ? "key key--wide" : "key";
  btn.textContent = label;
  btn.dataset.key = value;
  btn.addEventListener("click", () => press(value));
  return btn;
}

function paintKeys() {
  const g = game();
  const ans = answer();
  const best = {};
  for (const guess of g.guesses) {
    const marks = score(guess, ans);
    for (let i = 0; i < LEN; i++) {
      const c = guess[i];
      if (!best[c] || RANK[marks[i]] > RANK[best[c]]) best[c] = marks[i];
    }
  }
  for (const ch in keyEls) {
    if (best[ch]) keyEls[ch].dataset.state = best[ch];
    else delete keyEls[ch].dataset.state;
  }
}

/* --- Input -----------------------------------------------------------  */

const msgEl = document.getElementById("msg");
let msgTimer;

function flash(text) {
  clearTimeout(msgTimer);
  msgEl.textContent = text;
  msgTimer = setTimeout(() => { msgEl.textContent = ""; }, 2400);
}

function press(k) {
  const g = game();
  if (g.status !== "playing") return;
  if (k === "enter") return submit();
  if (k === "back") {
    current = current.slice(0, -1);
    paintActiveRow();
    return;
  }
  if (current.length >= LEN) return;
  current += k;
  paintActiveRow(current.length - 1);
}

function paintActiveRow(popIndex = -1) {
  const g = game();
  const row = rows[g.guesses.length];
  if (!row) return;
  for (let c = 0; c < LEN; c++) {
    const ch = current[c] || "";
    setTile(row.tiles[c], ch, ch ? "typed" : "empty");
    row.tiles[c].classList.toggle("is-typed", c === popIndex);
  }
}

function submit() {
  const g = game();
  if (current.length < LEN) {
    flash("Five letters, please.");
    const row = rows[g.guesses.length];
    row.el.classList.remove("is-wrong");
    void row.el.offsetWidth;          /* restart the animation */
    row.el.classList.add("is-wrong");
    return;
  }

  const ans = answer();
  const guess = current;
  current = "";
  g.guesses.push(guess);

  const marks = score(guess, ans);
  const r = g.guesses.length - 1;
  const won = guess === ans;
  const over = won || g.guesses.length === ROWS;

  if (over) {
    g.status = won ? "won" : "lost";
    if (state.mode === "daily") recordResult(won, g.guesses.length);
  }
  save();

  rows[r].tiles.forEach((tile, c) => {
    setTimeout(() => {
      setTile(tile, guess[c], marks[c]);
      tile.classList.remove("is-typed");
      tile.classList.add("is-settling");
      setTimeout(() => tile.classList.remove("is-settling"), 460);

      if (c !== LEN - 1) return;
      paintKeys();
      if (won) rows[r].el.classList.add("is-won");
      if (over) setTimeout(showResult, won ? 900 : 500);
      else if (g.guesses.length === ROWS - 1) flash("One guess left.");
    }, c * 170);
  });
}

document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof Element && e.target.closest("input, textarea, summary, [contenteditable]")) return;
  if (e.key === "Enter") { e.preventDefault(); press("enter"); }
  else if (e.key === "Backspace") { e.preventDefault(); press("back"); }
  else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
});

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
const wordEl = document.getElementById("result-word");
const glossEl = document.getElementById("result-gloss");
const nextEl = document.getElementById("next-word");
const againBtn = document.getElementById("again");
const shareBtn = document.getElementById("share");

const PRAISE = ["First guess. Suspicious.", "Two. Very nice.", "Three — clean.",
                "Four. Solid.", "Five, with room to spare.", "Sixth guess. Close one."];

let tick;

function showResult() {
  const g = game();
  const ans = answer();
  verdictEl.textContent = g.status === "won" ? PRAISE[g.guesses.length - 1] : "Not this time. The word was";
  wordEl.textContent = ans;
  glossEl.textContent = GLOSS[ans] || "";
  resultEl.hidden = false;
  againBtn.hidden = state.mode !== "endless";
  shareBtn.textContent = "Copy my grid";

  clearInterval(tick);
  if (state.mode === "daily") {
    const countdown = () => { nextEl.textContent = "Next word in " + untilMidnight(); };
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
  current = "";
  save();
  hideResult();
  paintBoard();
  flash("New word. Off you go.");
});

shareBtn.addEventListener("click", async () => {
  const g = game();
  const ans = answer();
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const face = { hit: "\u{1F7E9}", near: "\u{1F7E8}", miss: dark ? "⬛" : "⬜" };
  const head = state.mode === "daily"
    ? `Riftle no. ${state.daily.day + 1} — ${g.status === "won" ? g.guesses.length : "X"}/${ROWS}`
    : `Riftle practice — ${g.status === "won" ? g.guesses.length : "X"}/${ROWS}`;
  const grid = g.guesses.map(guess => score(guess, ans).map(m => face[m]).join("")).join("\n");
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
    current = "";
    save();
    paintMode();
  });
});

function paintMode() {
  document.querySelectorAll(".mode").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode));
  });
  document.getElementById("daynum").textContent = state.mode === "daily"
    ? `no. ${state.daily.day + 1} — a word from the rift`
    : "endless — a word from the rift";
  hideResult();
  paintBoard();
  if (game().status !== "playing") showResult();
  paintStats();
}

/* --- Export / import -------------------------------------------------
   Browser storage is evictable. This is the backup, the migration and the
   move-to-another-machine story, all at once. */

document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "riftle-progress.json" });
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
    state = normalise(parsed);
    current = "";
    save();
    paintMode();
    flash("Progress restored.");
  } catch {
    flash("That doesn't look like a Riftle backup.");
  }
  e.target.value = "";
});

/* Another tab played today's word — follow along rather than diverge. */
addEventListener("storage", e => {
  if (e.key !== KEY || !e.newValue) return;
  state = normalise(JSON.parse(e.newValue));
  current = "";
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

paintMode();
save();
