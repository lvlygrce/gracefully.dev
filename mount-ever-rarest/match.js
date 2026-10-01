/* Judging an answer. No server means no crowd to count, so rarity comes
   from the tiers written into the prompt bank; this file only has to decide
   which listed answer, if any, the player meant. Pure functions — no DOM. */

export const TIERS = [
  { points: 10,  label: "the tourist trail" },
  { points: 30,  label: "a quieter ridge" },
  { points: 60,  label: "a goat track" },
  { points: 100, label: "ghost of the mountains" },
];

export const VOUCH_POINTS = 30;

const STOP = new Set(["the", "a", "an", "of", "and", "fc", "afc", "hms", "rms", "uss", "mount", "mt"]);
const SWAP = { st: "saint", utd: "united", dr: "doctor", mr: "mister", jr: "junior" };
const ROMAN = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];
const ROMAN_SET = new Set([...ROMAN.slice(1), "xiii", "xiv", "xv", "xvi", "xvii", "xviii"]);

function singular(t) {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 6 && t.endsWith("oes")) return t.slice(0, -2);        // tomatoes, mangoes
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

function tokens(text) {
  const s = String(text)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’'`´]/g, "")
    .replace(/&/g, " and ").replace(/\+/g, " plus ").replace(/#/g, " sharp ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!s) return [];
  return s.split(" ").map(t => {
    t = SWAP[t] || t;
    const n = Number(t);
    if (Number.isInteger(n) && n >= 1 && n <= 12 && String(n) === t) t = ROMAN[n];
    return singular(t);
  });
}

/* Normalise to a token list. `strip` holds the prompt's droppable words
   ("shark" for sharks); regnal numbers go too when `numerals` is set. If
   stripping would leave nothing, the unstripped tokens are kept. */
export function normalise(text, strip = new Set(), numerals = false) {
  const all = tokens(text);
  const kept = all.filter(t => !STOP.has(t) && !strip.has(t) && !(numerals && ROMAN_SET.has(t)));
  if (kept.length) return kept;
  const soft = all.filter(t => !STOP.has(t));
  return soft.length ? soft : all;
}

/* Expand a prompt from the bank into something quick to match against. */
export function prepare(prompt) {
  if (prompt._ready) return prompt._ready;
  const strip = new Set((prompt.x || "").split(";").map(w => w.trim()).filter(Boolean).flatMap(tokens));
  const numerals = !!prompt.n;
  const seen = new Set();
  const answers = [];
  prompt.a.forEach((tierText, tier) => {
    tierText.split(";").map(s => s.trim()).filter(Boolean).forEach(item => {
      const aliases = item.split("|").map(s => s.trim()).filter(Boolean);
      const forms = aliases
        .map(alias => normalise(alias, strip, numerals))
        .filter(t => t.length)
        .map(t => ({ tokens: t, key: t.join("") }));
      const fresh = forms.filter(f => !seen.has(f.key));
      if (!fresh.length) return;               // already listed at a commoner tier
      fresh.forEach(f => seen.add(f.key));
      answers.push({ display: tidy(aliases[0]), tier, forms: fresh });
    });
  });
  // How many answers share each word, so a lone "John" is not taken
  // as John Cabot when half the bank is called John.
  const shared = new Map();
  answers.forEach(a => new Set(a.forms.flatMap(f => f.tokens)).forEach(t =>
    shared.set(t, (shared.get(t) || 0) + 1)));
  prompt._ready = { strip, numerals, sub: !!prompt.sub, answers, shared };
  return prompt._ready;
}

function tidy(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function distance(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  let before = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // A swapped pair ("einstien") is one slip, not two.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], before[j - 2] + 1);
      }
    }
    before = prev;
    prev = cur;
  }
  return prev[b.length];
}

// Typo room grows with length; short words get none, because most short
// words one letter apart are simply different words (tiger, timer).
const allowance = len => (len >= 10 ? 2 : len >= 6 ? 1 : 0);
const close = (a, b) => a[0] === b[0] && distance(a, b) <= allowance(b.length);

/* Every answer in the bank, so a real word is never mistaken for a typo
   of a different one ("condor" is not a misspelt "Connors"). */
export function buildLexicon(prompts) {
  const keys = new Set();
  for (const p of prompts) {
    for (const tierText of p.a) {
      for (const item of tierText.split(";")) {
        for (const alias of item.split("|")) {
          const key = normalise(alias).join("");
          if (key) keys.add(key);
        }
      }
    }
  }
  return keys;
}

function best(list, rank) {
  return list.sort(rank)[0] || null;
}

/* Returns { kind: "blank" } | { kind: "miss" } |
   { kind: "hit", tier, display, answer }. `lexicon` (from buildLexicon)
   switches off typo-matching for inputs that are real answers elsewhere. */
export function judge(input, prompt, lexicon = null) {
  const p = prepare(prompt);
  if (!String(input).trim()) return { kind: "blank" };
  const words = normalise(input, p.strip, p.numerals);
  const key = words.join("");
  if (!key) return { kind: "blank" };
  const typos = !(lexicon && lexicon.has(normalise(input).join("")));

  const hits = [];
  for (const answer of p.answers) {
    for (const f of answer.forms) {
      const n = f.tokens.length;
      let score = null;
      if (f.key === key) score = 0;
      // Said a little more, ending in the answer: "light blue", "doing the washing up".
      else if (f.key.length >= 4 && words.length > n && words.length - n <= 2 &&
               f.tokens.every((t, i) => words[words.length - n + i] === t)) score = 1;
      // Part of a name: a surname, or a first name nobody else in the list shares.
      else if (p.sub && key.length >= 4 && words.every(w => f.tokens.includes(w)) &&
               (words.length > 1 || words[0] === f.tokens[n - 1] || p.shared.get(words[0]) === 1)) score = 2;
      else if (typos) {
        if (close(key, f.key)) score = 3 + distance(key, f.key);
        else if (p.sub && words.length === 1 && f.tokens.some(t => t.length >= 6 && close(key, t))) score = 6;
      }
      if (score !== null) hits.push({ answer, score, size: n });
    }
  }
  const pick = best(hits, (a, b) =>
    a.score - b.score || (a.score === 1 ? b.size - a.size : 0) || a.answer.tier - b.answer.tier);
  if (!pick) return { kind: "miss" };
  return { kind: "hit", tier: pick.answer.tier, display: pick.answer.display, answer: pick.answer };
}

/* A few of the rarest listed answers, for "you could have said". */
export function rarer(prompt, exclude, count = 3) {
  const p = prepare(prompt);
  const pool = p.answers.filter(a => a.tier === 3 && a !== exclude);
  const out = [];
  while (pool.length && out.length < count) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].display);
  }
  return out;
}
