/* Mount Ever-Rarest — front-end only. No server, no database, no build step.
   The prompt bank lives in prompts/, the judging in match.js; everything
   below is the climb. */

import { PROMPTS } from "./prompts/index.js";
import { judge, rarer, buildLexicon, TIERS, VOUCH_POINTS } from "./match.js";

const BASE = 5364;
const SUMMIT = 8849;
const ROUND_SIZE = 7;
const SECONDS = 20;
const LEXICON = buildLexicon(PROMPTS);

/* The South Col route, in metres and in mountain-drawing coordinates.
   Waypoints with a `label` are drawn on the map; the rest only name where
   the leopard is. */
const ROUTE = [
  { m: 5364, x: 70,  y: 352, name: "base camp",             label: "Base camp", lx: -8,  ly: 22, anchor: "start" },
  { m: 5800, x: 130, y: 318, name: "the Khumbu Icefall" },
  { m: 6065, x: 175, y: 298, name: "Camp I",                label: "Camp I",    lx: 0,   ly: 24, anchor: "middle" },
  { m: 6400, x: 245, y: 272, name: "Camp II",               label: "Camp II",   lx: 0,   ly: 24, anchor: "middle" },
  { m: 6800, x: 300, y: 232, name: "the Lhotse Face" },
  { m: 7162, x: 345, y: 198, name: "Camp III",              label: "Camp III",  lx: 12,  ly: 6,  anchor: "start" },
  { m: 7500, x: 372, y: 166, name: "the Yellow Band" },
  { m: 7800, x: 392, y: 138, name: "the Geneva Spur" },
  { m: 7920, x: 400, y: 124, name: "Camp IV on the South Col", label: "Camp IV", lx: 12, ly: 8, anchor: "start" },
  { m: 8400, x: 372, y: 84,  name: "the Balcony" },
  { m: 8749, x: 344, y: 56,  name: "the South Summit" },
  { m: 8790, x: 338, y: 50,  name: "the Hillary Step" },
  { m: 8849, x: 330, y: 42,  name: "the summit",            label: "Summit",    lx: -14, ly: -8, anchor: "end" },
];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const fmt = m => `${Math.round(m).toLocaleString("en-GB")} m`;
const $ = id => document.getElementById(id);

const GLYPH = { tier: ["🥾", "⛰️", "🐐", "🐆"], vouched: "✋", miss: "❄️", blank: "🌫️", timeout: "🌫️" };

/* --- Storage ---------------------------------------------------------
   Always wrapped: storage throws in private mode and when site data is
   blocked, and an uncaught throw here takes down the whole game. */

const KEY = "mount-ever-rarest:v1:state";

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
  altitude: BASE,
  summits: 0,
  seen: [],             // prompt texts already asked, so nothing repeats until the bank runs dry
  stats: { rounds: 0, metres: 0, bestRound: 0, ghosts: 0, highest: BASE },
};

function load(raw) {
  const s = { ...BLANK, ...(raw || {}) };
  s.stats = { ...BLANK.stats, ...(s.stats || {}) };
  s.altitude = clamp(Number(s.altitude) || BASE, BASE, SUMMIT);
  s.seen = Array.isArray(s.seen) ? s.seen : [];
  return s;
}

let saved = load(store.get({}));
const save = () => store.set(saved);


/* --- Choosing prompts ------------------------------------------------
   Unseen prompts first, never more than two from one category in a
   round. When fewer than a round's worth remain, the bank starts over. */

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRound() {
  const seen = new Set(saved.seen);
  let pool = PROMPTS.filter(p => !seen.has(p.q));
  if (pool.length < ROUND_SIZE) { saved.seen = []; pool = PROMPTS.slice(); }

  const picked = [];
  const perCategory = {};
  for (const p of shuffle(pool)) {
    if ((perCategory[p.category] || 0) >= 2) continue;
    picked.push(p);
    perCategory[p.category] = (perCategory[p.category] || 0) + 1;
    if (picked.length === ROUND_SIZE) break;
  }
  for (const p of shuffle(pool)) {           // a thin bank: fill up regardless
    if (picked.length === ROUND_SIZE) break;
    if (!picked.includes(p)) picked.push(p);
  }
  saved.seen.push(...picked.map(p => p.q));
  return picked;
}

/* --- The mountain ---------------------------------------------------- */

const SVG_NS = "http://www.w3.org/2000/svg";

function segmentFor(m) {
  for (let i = 1; i < ROUTE.length; i++) {
    if (m <= ROUTE[i].m) return i;
  }
  return ROUTE.length - 1;
}

function pointAt(m) {
  const i = segmentFor(m);
  const a = ROUTE[i - 1], b = ROUTE[i];
  const t = clamp((m - a.m) / (b.m - a.m), 0, 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, a, b };
}

function whereAt(m) {
  if (m >= SUMMIT) return "On the summit of Everest";
  if (m <= BASE) return "Base camp, in the Khumbu";
  const exact = ROUTE.find(w => w.m === m);
  const zone = m >= 8000 ? " · the death zone" : "";
  if (exact) return `At ${exact.name}${zone}`;
  const { a, b } = pointAt(m);
  return `Past ${a.name}, making for ${b.name}${zone}`;
}

function drawCamps() {
  const route = $("route");
  route.setAttribute("d", "M" + ROUTE.map(w => `${w.x} ${w.y}`).join(" L"));
  const g = $("camps");
  g.textContent = "";
  ROUTE.filter(w => w.label).forEach(w => {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", "camp__dot");
    dot.setAttribute("cx", w.x);
    dot.setAttribute("cy", w.y);
    dot.setAttribute("r", 3.6);
    dot.dataset.m = w.m;
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("class", "camp__label");
    text.setAttribute("x", w.x + w.lx);
    text.setAttribute("y", w.y + w.ly);
    text.setAttribute("text-anchor", w.anchor);
    text.textContent = w.label;
    g.append(dot, text);
  });
}

function renderMountain() {
  const m = saved.altitude;
  const here = pointAt(m);
  const passed = ROUTE.filter(w => w.m <= m);
  $("trail").setAttribute("d",
    "M" + [...passed, here].map(w => `${w.x.toFixed(1)} ${w.y.toFixed(1)}`).join(" L"));

  document.querySelectorAll(".camp__dot").forEach(dot =>
    dot.classList.toggle("is-passed", Number(dot.dataset.m) <= m));

  // Face the way the path runs, and lean into the slope.
  const dx = here.b.x - here.a.x;
  const dy = here.b.y - here.a.y;
  const flip = dx < 0 ? -1 : 1;
  const lean = clamp(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI, -32, 0);
  $("leopard").style.transform = `translate(${here.x}px, ${here.y}px)`;
  $("leopard-body").style.transform = `scale(${flip}, 1) rotate(${lean}deg) scale(1.5)`;

  $("altitude-metres").textContent = fmt(m);
  $("altitude-where").textContent = whereAt(m);
  $("summits").textContent = saved.summits
    ? `${saved.summits} ${saved.summits === 1 ? "summit" : "summits"}`
    : "";
}

/* --- A round --------------------------------------------------------- */

let round = null;
let timer = null;

function startRound() {
  if (saved.altitude >= SUMMIT) saved.altitude = BASE;      // a new expedition
  round = {
    number: saved.stats.rounds + 1,
    prompts: pickRound(),
    results: [],
    index: 0,
    start: saved.altitude,
    summited: false,
  };
  save();
  renderMountain();
  $("intro").hidden = true;
  document.body.classList.add("is-playing");
  $("summary").hidden = true;
  $("play").hidden = false;
  ask();
}

function ask() {
  const p = round.prompts[round.index];
  $("play-count").textContent = `Prompt ${round.index + 1} of ${ROUND_SIZE}`;
  $("play-category").textContent = p.categoryLabel;
  $("prompt-text").textContent = p.q;
  $("verdict").hidden = true;
  const input = $("answer-input");
  input.value = "";
  input.disabled = false;
  $("answer-form").querySelector("button").disabled = false;
  input.focus({ preventScroll: true });
  $("climb-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  startTimer();
}

function startTimer() {
  stopTimer();
  const deadline = performance.now() + SECONDS * 1000;
  const fill = $("timer-fill");
  const secs = $("timer-secs");
  const box = $("timer");
  box.classList.remove("is-paused");
  const tick = () => {
    const left = Math.max(0, deadline - performance.now());
    fill.style.transform = `scaleX(${left / (SECONDS * 1000)})`;
    const s = Math.ceil(left / 1000);
    secs.textContent = s;
    box.classList.toggle("is-low", s <= 5);
    if (left <= 0) { timer = null; finish(null); return; }
    timer = requestAnimationFrame(tick);
  };
  tick();
}

function stopTimer() {
  if (timer) cancelAnimationFrame(timer);
  timer = null;
}

function climb(points) {
  const before = saved.altitude;
  saved.altitude = Math.min(SUMMIT, saved.altitude + points);
  saved.stats.metres += points;
  saved.stats.highest = Math.max(saved.stats.highest, saved.altitude);
  if (before < SUMMIT && saved.altitude >= SUMMIT) {
    saved.summits += 1;
    round.summited = true;
  }
  save();
  renderMountain();
}

function finish(value) {
  if (!round || round.results.length > round.index) return;   // already answered
  stopTimer();
  $("timer").classList.add("is-paused");
  const p = round.prompts[round.index];
  const timedOut = value === null;
  const verdict = timedOut ? { kind: "timeout" } : judge(value, p, LEXICON);
  const result = {
    q: p.q,
    answer: timedOut ? $("answer-input").value.trim() : value.trim(),
    kind: verdict.kind,
    tier: verdict.tier,
    display: verdict.display,
    points: verdict.kind === "hit" ? TIERS[verdict.tier].points : 0,
    rarer: rarer(p, verdict.answer),
  };
  if (result.kind === "hit" && result.tier === 3) saved.stats.ghosts += 1;
  round.results.push(result);
  $("answer-input").disabled = true;
  $("answer-form").querySelector("button").disabled = true;
  if (result.points) climb(result.points);
  showVerdict(result);
}

function showVerdict(r) {
  const line = $("verdict-line");
  const note = $("verdict-note");
  const box = $("verdict");
  box.classList.toggle("is-hit", r.kind === "hit" || r.kind === "vouched");

  if (r.kind === "hit") {
    line.textContent = r.display;
    note.textContent = `${TIERS[r.tier].label} · up ${r.points} m`;
  } else if (r.kind === "vouched") {
    line.textContent = `“${r.answer}”`;
    note.textContent = `taken on trust · up ${r.points} m`;
  } else if (r.kind === "miss") {
    line.textContent = `“${r.answer}”`;
    note.textContent = "not in our field notes · no metres this time";
  } else if (r.kind === "timeout") {
    line.textContent = "Out of time";
    note.textContent = "the wind took it · no metres this time";
  } else {
    line.textContent = "Nothing said";
    note.textContent = "lost in the cloud · no metres this time";
  }

  const rarerText = r.rarer.length ? listing(r.rarer) : "";
  $("verdict-rarer").textContent = !rarerText ? ""
    : r.kind === "hit" && r.tier === 3 ? `Others this far off the path: ${rarerText}.`
    : `Rarer tracks: ${rarerText}.`;

  $("vouch-btn").hidden = r.kind !== "miss";
  const last = round.index === ROUND_SIZE - 1;
  $("next-btn").textContent = last ? "See how far you climbed" : "Next prompt";
  box.hidden = false;
  // Restart the arrival, so each verdict settles rather than snapping in.
  box.style.animation = "none";
  void box.offsetWidth;
  box.style.animation = "";
  $("next-btn").focus({ preventScroll: true });
}

function listing(items) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function vouch() {
  const r = round && round.results[round.index];
  if (!r || r.kind !== "miss") return;
  r.kind = "vouched";
  r.points = VOUCH_POINTS;
  climb(r.points);
  showVerdict(r);
}

function next() {
  if (!round) return;
  if (round.index < ROUND_SIZE - 1) {
    round.index += 1;
    ask();
  } else {
    endRound();
  }
}

/* --- The end of a round ---------------------------------------------- */

function gainOf(r) {
  return r.results.reduce((sum, x) => sum + x.points, 0);
}

function endRound() {
  const gain = gainOf(round);
  saved.stats.rounds += 1;
  saved.stats.bestRound = Math.max(saved.stats.bestRound, gain);
  save();

  $("play").hidden = true;
  document.body.classList.remove("is-playing");
  $("summary").hidden = false;
  $("summary-title").textContent = `Climb ${round.number}`;
  $("summary-gain").textContent = gain ? `up ${gain} m` : "no metres";

  const now = saved.altitude;
  $("summary-line").textContent = round.summited
    ? `You stood on the roof of the world. That is summit number ${saved.summits}; the next climb starts again from base camp.`
    : gain === 0
      ? `The cloud came down and you held your ground at ${fmt(now)}. ${whereAt(now)}.`
      : `From ${fmt(round.start)} to ${fmt(now)}. ${whereAt(now)}.`;

  const rows = $("summary-rows");
  rows.textContent = "";
  round.results.forEach(r => {
    const li = document.createElement("li");
    li.className = "row";
    const glyph = span("row__glyph", r.kind === "hit" ? GLYPH.tier[r.tier] : GLYPH[r.kind]);
    glyph.setAttribute("aria-hidden", "true");
    const said = r.kind === "hit" ? r.display : r.answer;
    const a = span("row__a" + (said ? "" : " is-empty"), said || (r.kind === "timeout" ? "out of time" : "nothing said"));
    const tier = span("row__tier",
      r.kind === "hit" ? TIERS[r.tier].label
      : r.kind === "vouched" ? "taken on trust"
      : r.kind === "miss" ? "not in our field notes"
      : r.kind === "timeout" ? "the wind took it" : "lost in the cloud");
    const m = span("row__m" + (r.points ? " is-up" : ""), r.points ? `+${r.points} m` : "0 m");
    li.append(glyph, span("row__q", r.q), a, tier, m);
    rows.append(li);
  });

  $("keep-btn").textContent = saved.altitude >= SUMMIT ? "Begin a new ascent" : "Keep climbing";
  $("share-status").textContent = "";
  $("share-text").hidden = true;
  renderStats();
  $("climb-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  $("keep-btn").focus({ preventScroll: true });
}

function span(cls, text) {
  const el = document.createElement("span");
  el.className = cls;
  el.textContent = text;
  return el;
}

function shareText() {
  const glyphs = round.results.map(r => r.kind === "hit" ? GLYPH.tier[r.tier] : GLYPH[r.kind]).join("");
  const gain = gainOf(round);
  const where = round.summited ? "summit reached" : `now at ${fmt(saved.altitude)}`;
  const url = location.origin + location.pathname;
  return `Mount Ever-Rarest · climb ${round.number}\n${glyphs}\nup ${gain} m · ${where}\n${url}`;
}

async function share() {
  if (!round) return;
  const text = shareText();
  const status = $("share-status");
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  if (navigator.share && coarse) {
    try { await navigator.share({ text }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const box = $("share-text");
  box.hidden = true;
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Copied. Paste it wherever your rope team gathers.";
  } catch {
    // No clipboard here: hand the text over to copy by hand.
    box.value = text;
    box.hidden = false;
    box.focus();
    box.select();
    status.textContent = "The clipboard wouldn't open, so here it is to copy.";
  }
}

/* --- Record ---------------------------------------------------------- */

function renderStats() {
  const s = saved.stats;
  const items = [
    ["Climbs", s.rounds],
    ["Summits", saved.summits],
    ["Best climb", s.bestRound ? fmt(s.bestRound) : "—"],
    ["Ghost answers", s.ghosts],
    ["Highest point", fmt(s.highest)],
  ];
  const grid = $("stats-grid");
  grid.textContent = "";
  items.forEach(([label, value]) => {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    wrap.append(dt, dd);
    grid.append(wrap);
  });
}

/* --- Export / import -------------------------------------------------
   Browser storage is evictable; this is the backup, migration and
   cross-device story all at once. */

function exportData() {
  const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "mount-ever-rarest.json" });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("stats-status").textContent = "Saved. Keep it somewhere dry.";
}

async function importData(file) {
  const status = $("stats-status");
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.version !== 1 || typeof parsed.altitude !== "number") {
      throw new Error("not ours");
    }
    saved = load(parsed);
    save();
    renderMountain();
    renderStats();
    status.textContent = "Loaded. Welcome back to the mountain.";
  } catch {
    status.textContent = "That file doesn't look like a Mount Ever-Rarest record.";
  }
}

/* --- Wiring ---------------------------------------------------------- */

$("start-btn").addEventListener("click", startRound);
$("keep-btn").addEventListener("click", startRound);
$("restart-btn").addEventListener("click", () => {
  saved.altitude = BASE;
  save();
  startRound();
});
$("share-btn").addEventListener("click", share);
$("next-btn").addEventListener("click", next);
$("vouch-btn").addEventListener("click", vouch);
$("answer-form").addEventListener("submit", e => {
  e.preventDefault();
  finish($("answer-input").value);
});
$("export-btn").addEventListener("click", exportData);
$("import-btn").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", e => {
  const file = e.target.files && e.target.files[0];
  if (file) importData(file);
  e.target.value = "";
});

drawCamps();
renderMountain();
renderStats();

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
const toggle = $("theme-toggle");

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

$("year").textContent = new Date().getFullYear();
