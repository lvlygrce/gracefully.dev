/* Character Draft: the 8-bit battle.

   The judge writes the fight as a script of beats (who does what to whom,
   with which gear, what it looks like, how it lands). This file checks and
   repairs that script, then plays it out on a small pixel stage: the two
   teams walk on, each beat is acted with sprites, projectiles and particles,
   and the winner is revealed at the end.

   Battle.script(verdict, teams, preps)  → a clean list of beats (always some)
   Battle.player(container, fight, opts) → { play, pause, skip, destroy }
     fight = { teams, verdict, arena, worldName }
     opts  = { onEnd, onState(state), autoplay } */

(() => {
  "use strict";

  const W = 384, H = 216;
  const ACTIONS = ["advance", "strike", "combo", "shoot", "cast", "special", "annihilate", "throw", "slam", "barrage", "grab",
    "teleport", "transform", "summon", "stealth", "block", "dodge", "deploy_gear", "build", "heal", "shield", "trap",
    "team_up", "taunt", "retreat", "fall"];
  // Actions that need someone to hit.
  const ATTACKS = ["strike", "combo", "shoot", "cast", "special", "annihilate", "throw", "slam", "barrage", "grab",
    "teleport", "summon", "stealth", "trap", "team_up"];
  const EFFECTS = ["none", "slash", "impact", "fire", "ice", "lightning", "water", "earth", "wind", "poison", "light",
    "dark", "psychic", "tech", "web", "smoke", "explosion", "heal", "shield", "nature", "blood"];
  const OUTCOMES = ["hit", "crit", "hurt", "blocked", "dodged", "miss", "ko", "none"];
  const LOOKS = ["blade", "bow", "gun", "staff", "shield", "bomb", "trap", "net", "turret", "cannon", "vehicle",
    "potion", "armour", "banner", "beast", "device", "rope", "wall"];
  const COLOURS = { red: "#d6402f", orange: "#ef8a2c", yellow: "#f2cf3a", green: "#4caf50", blue: "#3f7fd6", purple: "#8e5bd0",
    white: "#f2f0ea", black: "#2b2b2b", grey: "#8c939b", gold: "#e8b84a", silver: "#cfd6dd", brown: "#8a5a32", pink: "#f08cc0", cyan: "#4fd6e6" };
  const FX = {
    fire: "#ff7a1a", ice: "#9fe3ff", lightning: "#ffe14d", water: "#3fa0ff", earth: "#a07a4a", wind: "#d8f3e6",
    poison: "#8bd34a", light: "#fff4b0", dark: "#7a4ac0", psychic: "#ff6ad5", tech: "#6af0ff", web: "#ffffff",
    smoke: "#9a9a9a", explosion: "#ff9a2a", heal: "#6aff8a", shield: "#8fd0ff", nature: "#5fbf4a", blood: "#c0262f",
    slash: "#ffffff", impact: "#fff2c0", none: "#ffffff",
  };
  const RANGED = new Set(["bow", "gun", "magic", "beam", "breath", "psychic", "summon", "gadget"]);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* --- The script ---------------------------------------------------------
     The same keys the judge uses: a name, or "name (world)" when two teams
     drafted characters with the same name. */

  function cast(teams) {
    const all = teams.flatMap((t, side) => t.roster.map(r => ({ ...r, team: t.name, side })));
    return all.map(c => ({ ...c, key: all.filter(o => o.name === c.name).length > 1 ? `${c.name} (${c.world})` : c.name }));
  }

  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function finder(people) {
    return name => {
      const n = norm(name);
      if (!n || n === "none") return null;
      return people.find(p => norm(p.key) === n) || people.find(p => norm(p.name) === n)
        || people.find(p => n.includes(norm(p.name)) || norm(p.name).includes(n)) || null;
    };
  }

  function gearLook(g) {
    if (LOOKS.includes(g.look)) return g.look;
    const t = norm(`${g.name} ${g.effect}`);
    const has = re => re.test(t);
    return has(/bomb|grenade|explosive|charge|dynamite|mine\b/) ? "bomb" : has(/trap|snare|spike|pit/) ? "trap" : has(/net\b|web/) ? "net"
      : has(/turret|ballista|catapult|trebuchet|sentry/) ? "turret" : has(/cannon|artillery/) ? "cannon" : has(/potion|elixir|tonic|salve|medic|heal/) ? "potion"
      : has(/armou?r|plate|mail|suit|helm/) ? "armour" : has(/shield|barrier|wall|barricade/) ? "shield" : has(/banner|flag|standard|horn/) ? "banner"
      : has(/gun|rifle|pistol|blaster|laser/) ? "gun" : has(/bow|crossbow|arrow/) ? "bow" : has(/staff|wand|rod/) ? "staff"
      : has(/sword|blade|spear|axe|dagger|lance/) ? "blade" : has(/cart|chariot|tank|vehicle|ship|car|bike|glider/) ? "vehicle"
      : has(/rope|chain|grapple/) ? "rope" : has(/dragon|hound|wolf|horse|beast|summon/) ? "beast" : "device";
  }
  function gearColour(g, look) {
    if (COLOURS[g.colour]) return COLOURS[g.colour];
    return ({ bomb: COLOURS.black, trap: COLOURS.grey, net: COLOURS.white, turret: COLOURS.brown, cannon: COLOURS.black, potion: COLOURS.green,
      armour: COLOURS.silver, shield: COLOURS.blue, banner: COLOURS.red, gun: COLOURS.grey, bow: COLOURS.brown, staff: COLOURS.purple,
      blade: COLOURS.silver, vehicle: COLOURS.brown, rope: COLOURS.brown, beast: COLOURS.brown, device: COLOURS.cyan, wall: COLOURS.grey })[look] || COLOURS.cyan;
  }

  /* Clean a model's beats into something that always plays sensibly:
     real actors and targets, the dead never acting again, everyone on stage
     at least once, and a fight to the death: by the end every loser is
     killed, while the winner's side still has someone alive. */
  function script(verdict, teams, preps) {
    const people = cast(teams);
    const find = finder(people);
    const winSide = Math.max(0, teams.findIndex(t => t.name === verdict.winner));
    const gear = (preps || verdict.preps || []).flatMap((p, side) => (p && p.gear || []).map(g => {
      const look = gearLook(g);
      return { name: g.name, side, look, colour: gearColour(g, look), effect: g.effect || "" };
    }));
    const findGear = name => { const n = norm(name); return !n || n === "none" ? null : gear.find(g => norm(g.name) === n) || gear.find(g => n.includes(norm(g.name)) || norm(g.name).includes(n)) || null; };
    const enemiesOf = p => people.filter(q => q.side !== p.side);
    const alliesOf = p => people.filter(q => q.side === p.side && q !== p);
    const down = new Set();
    const standing = list => list.filter(q => !down.has(q.key));
    const mvp = find(verdict.mvp);
    const dead = new Set((verdict.aftermath || []).filter(a => a.status === "dead").map(a => find(a.name)).filter(Boolean).map(p => p.key));

    const out = [];
    for (const raw of Array.isArray(verdict.beats) ? verdict.beats.slice(0, 40) : []) {
      const actor = find(raw.actor);
      if (!actor || down.has(actor.key)) continue;
      let action = ACTIONS.includes(raw.action) ? raw.action : "strike";
      // Nobody runs in a fight to the death: losers who'd flee are killed at the end.
      if (action === "retreat") { if (actor.side !== winSide) continue; action = "dodge"; }
      let target = find(raw.target);
      const friendly = ["heal", "shield"].includes(action);
      if (friendly && target && target.side !== actor.side) target = null;
      if (!friendly && target && target.side === actor.side && action !== "team_up") target = null;
      // Attacks need someone to hit; gear can simply be set up (a potion, a wall).
      // Vanishing or blinking away needs no target; any other attack does.
      const reposition = ["stealth", "teleport"].includes(action) && !target;
      if (!reposition && (ATTACKS.includes(action) || (target && !friendly))) {
        if (!target || down.has(target.key)) target = standing(enemiesOf(actor))[0] || null;
        if (!target && !friendly) continue;
      }
      let outcome = OUTCOMES.includes(raw.outcome) ? raw.outcome : target && !friendly ? "hit" : "none";
      if (friendly || !target || ["advance", "taunt", "block", "dodge", "build", "transform"].includes(action)) outcome = target && action === "advance" ? outcome : "none";
      // Never knock out the winner's last fighter.
      if (outcome === "ko" && target && target.side === winSide && standing(people.filter(q => q.side === winSide)).length <= 1) outcome = "hurt";
      if (outcome === "ko" && target && target.side === winSide && target === mvp) outcome = "hurt";
      const g = findGear(raw.gear);
      // An overwhelming power hits every enemy still alive.
      const victims = action === "annihilate" ? standing(enemiesOf(actor)).map(q => q.key) : null;
      if (victims && outcome === "ko" && actor.side !== winSide && standing(people.filter(q => q.side === winSide)).length <= victims.length) outcome = "crit";
      out.push({
        actor: actor.key, action, target: target ? target.key : null, victims,
        gear: g ? g.name : null, effect: EFFECTS.includes(raw.effect) ? raw.effect : "none", outcome,
        move: String(raw.move || "").trim().slice(0, 32),
        caption: String(raw.caption || "").trim().slice(0, 160), line: String(raw.line || "").trim().slice(0, 60),
      });
      if (outcome === "ko" && victims) victims.forEach(k => down.add(k));
      else if (outcome === "ko" && target) down.add(target.key);
      if (action === "fall") down.add(actor.key);
      if (action === "retreat" && actor.side !== winSide) down.add(actor.key);
    }

    // Anyone who never acted gets a moment early on.
    const acted = new Set(out.map(b => b.actor));
    people.filter(p => !acted.has(p.key) && !down.has(p.key)).forEach((p, i) => {
      const foe = standing(enemiesOf(p))[0] || enemiesOf(p)[0];
      const role = ((verdict.roles || []).find(r => r.name === p.name && r.team === p.team) || {}).role || "";
      out.splice(Math.min(out.length, 1 + i * 2), 0, {
        actor: p.key, action: foe ? "strike" : "taunt", target: foe ? foe.key : null, gear: null, effect: "none",
        outcome: foe ? "blocked" : "none", caption: role || `${p.name} joins the fray.`, line: "",
      });
    });

    // The dead fall.
    for (const k of dead) {
      if (down.has(k)) continue;
      const p = people.find(q => q.key === k);
      const foe = standing(enemiesOf(p))[0];
      if (!foe) continue;
      out.push({ actor: foe.key, action: "strike", target: k, gear: null, effect: "none", outcome: "ko", caption: `${p.name} is killed.`, line: "", move: "" });
      down.add(k);
    }

    // To the death: every loser still alive is killed, the first by the
    // turning point if it hasn't been shown yet, the rest by whoever stands.
    const winners = () => standing(people.filter(q => q.side === winSide));
    const finisher = (mvp && mvp.side === winSide && !down.has(mvp.key)) ? mvp : winners()[0];
    standing(people.filter(q => q.side !== winSide)).forEach((p, i) => {
      const killer = i === 0 && finisher ? finisher : winners()[i % Math.max(1, winners().length)] || finisher;
      if (!killer) return;
      const first = i === 0 && verdict.turning_point && !out.some(b => b.caption === verdict.turning_point);
      out.push({ actor: killer.key, action: first ? "special" : "strike", target: p.key, gear: null, effect: "none", outcome: "ko",
        caption: first ? String(verdict.turning_point) : `${killer.name} finishes ${p.name}.`, line: "", move: "" });
      down.add(p.key);
    });
    return out;
  }

  /* --- Backdrops ----------------------------------------------------------
     Drawn once per fight from the arena's description: a sky, far shapes, a
     middle layer and the ground, in a palette that suits the place. */

  function backdropKind(arena, world) {
    if (world === "minecraft") return "blocky";
    const t = norm(arena ? `${arena.name} ${arena.terrain}` : "");
    const has = re => re.test(t);
    return has(/lava|volcan|nether|magma|inferno|hell|mordor|mustafar/) ? "volcano"
      : has(/snow|ice|frozen|frost|wall|winter|glacier|tundra|north of/) ? "snow"
      : has(/space|station|ship|lab|laborator|base|hangar|facility|tower of|tech|reactor|helicarrier/) ? "tech"
      : has(/cave|cavern|mine|underground|tunnel|crypt|dungeon|sewer|chamber/) ? "cave"
      : has(/sea|ocean|beach|shore|harbou?r|bay|river|lake|island|coast|port|dock/) ? "sea"
      : has(/desert|sand|dune|wasteland|canyon|mesa/) ? "desert"
      : has(/city|street|street|town|new york|gotham|metropolis|rooftop|downtown|alley|square|market/) ? "city"
      : has(/arena|stadium|colosseum|rift|ring|pit|tournament|stage|dojo|tower/) ? "arena"
      : has(/castle|keep|throne|hall|palace|fortress|citadel|sept|temple|red keep|hogwarts|school/) ? "castle"
      : has(/forest|wood|jungle|grove|glade|swamp|marsh|tree/) ? "forest"
      : has(/sky|cloud|heaven|asgard|floating|mountain|peak|cliff/) ? "sky"
      : "plains";
  }

  const PALETTES = {
    plains: { sky: ["#8fc9f0", "#b9e0f5", "#e2f2f6"], far: "#7fa98a", mid: "#5f9a5a", ground: "#6fae4f", ground2: "#5a9440", line: "#4d7f37" },
    forest: { sky: ["#9ccbe0", "#c3e2ea", "#e3f0e8"], far: "#4f7f5a", mid: "#2f6a3f", ground: "#4f8f3a", ground2: "#3f7a30", line: "#2f5f24" },
    snow: { sky: ["#a9c6e0", "#cfe0ee", "#eef4f8"], far: "#c4d6e6", mid: "#9fb8cf", ground: "#eef4f8", ground2: "#d4e2ee", line: "#a9c0d6" },
    desert: { sky: ["#f0b56a", "#f6cf8f", "#fbe6bf"], far: "#d99a5a", mid: "#c9803f", ground: "#e8c27a", ground2: "#d9ae63", line: "#b98d48" },
    city: { sky: ["#2b2f5a", "#4a4a7a", "#8a6a8a"], far: "#2a2a44", mid: "#3a3a58", ground: "#5a5a66", ground2: "#4a4a55", line: "#3a3a44" },
    sea: { sky: ["#7fb8e6", "#a9d2ef", "#d6ecf6"], far: "#3f7fb8", mid: "#2f6aa0", ground: "#e2cf9a", ground2: "#d2bd84", line: "#b8a26a" },
    cave: { sky: ["#1f1a22", "#2a2430", "#3a3240"], far: "#2a2430", mid: "#3a3138", ground: "#4a4048", ground2: "#3a3238", line: "#2a2428" },
    volcano: { sky: ["#3a1414", "#7a2a1a", "#c4521f"], far: "#2a1a1a", mid: "#3a2020", ground: "#3a2a28", ground2: "#2a1e1c", line: "#ff6a1a" },
    tech: { sky: ["#1a2a3a", "#24384a", "#2f4a5f"], far: "#2a3f52", mid: "#3a5468", ground: "#5a6a78", ground2: "#4a5866", line: "#6af0ff" },
    sky: { sky: ["#6fb2ef", "#a6d3f6", "#e8f4fb"], far: "#ffffff", mid: "#d6e6f2", ground: "#c9b48a", ground2: "#b39e74", line: "#8f7c56" },
    arena: { sky: ["#e0a85a", "#efc78a", "#f6e2b8"], far: "#8a5a3a", mid: "#a06a42", ground: "#d9b47a", ground2: "#c9a066", line: "#a8804a" },
    castle: { sky: ["#6a7fb0", "#9fb0d0", "#d9dbe6"], far: "#5a607a", mid: "#6a7088", ground: "#8a8f96", ground2: "#7a7f86", line: "#5f646b" },
    blocky: { sky: ["#7fb6ff", "#9cc8ff", "#c2ddff"], far: "#5f9a4a", mid: "#4f8a3a", ground: "#5fa04e", ground2: "#8a5a32", line: "#3f7a2a" },
  };

  function backdrop(kind, night) {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const P = PALETTES[kind] || PALETTES.plains;
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const seed = { v: 7 };
    const rand = () => { seed.v = (seed.v * 16807) % 2147483647; return seed.v / 2147483647; };
    const horizon = 116;
    // Sky in dithered bands.
    const bands = P.sky.length;
    for (let y = 0; y < horizon; y++) {
      const t = y / horizon * (bands - 1), i = Math.floor(t), f = t - i;
      for (let x = 0; x < W; x += 2) {
        const c = (f > 0.5 + ((x / 2 + y) % 2) * 0.25 - 0.125) && i + 1 < bands ? P.sky[i + 1] : P.sky[i];
        rect(x, y, 2, 1, c);
      }
    }
    if (night || kind === "city" || kind === "cave") for (let i = 0; i < 40; i++) rect(rand() * W, rand() * 80, 1, 1, kind === "cave" ? "#5a5060" : "#f4f1ea");
    else if (kind !== "volcano" && kind !== "tech") {
      rect(320, 22, 14, 14, kind === "desert" || kind === "arena" ? "#fff2b0" : "#fff7d6");
      for (let i = 0; i < 4; i++) { const cx = rand() * W, cy = 20 + rand() * 50; rect(cx, cy, 30, 6, "#ffffff"); rect(cx + 6, cy - 4, 16, 4, "#ffffff"); }
    }
    // Far layer.
    const ridge = (base, amp, step, c, jag) => {
      let y = base;
      for (let x = 0; x < W; x += step) {
        y = clamp(y + (rand() - 0.5) * amp, base - amp * 2, base + amp);
        rect(x, y, step, horizon - y + 2, c);
        if (jag) rect(x + step / 2, y - jag, 2, jag, c);
      }
    };
    switch (kind) {
      case "forest":
        ridge(84, 10, 8, P.far);
        for (let x = -6; x < W; x += 14) { const h = 30 + rand() * 20, y = horizon - h; for (let i = 0; i < h; i += 2) rect(x + 7 - i / 4, y + i, i / 2, 2, P.mid); rect(x + 6, horizon - 6, 3, 6, "#5a3a24"); }
        break;
      case "snow": ridge(64, 16, 6, P.far); ridge(88, 10, 8, P.mid); break;
      case "desert": ridge(90, 8, 10, P.far); for (let i = 0; i < 3; i++) { const x = 40 + i * 120; for (let k = 0; k < 24; k++) rect(x - k, horizon - 24 + k, k * 2, 1, P.mid); } break;
      case "city":
        for (let x = 0; x < W; x += 18 + rand() * 10) { const h = 40 + rand() * 70, w = 16 + rand() * 12; rect(x, horizon - h, w, h, rand() > 0.5 ? P.far : P.mid);
          for (let wy = horizon - h + 4; wy < horizon - 4; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (rand() > 0.45) rect(wx, wy, 2, 3, "#f2cf6a"); }
        break;
      case "sea": rect(0, 88, W, horizon - 88, P.far); for (let y = 92; y < horizon; y += 6) for (let x = (y % 12); x < W; x += 16) rect(x, y, 8, 1, "#cfe8f8"); break;
      case "cave": for (let x = 0; x < W; x += 12) { const h = 10 + rand() * 30; for (let i = 0; i < h; i++) rect(x + 6 - (h - i) / 5, i, (h - i) / 2.5, 1, P.mid); } ridge(96, 8, 8, P.far); break;
      case "volcano":
        for (let k = 0; k < 56; k++) rect(190 - k * 1.6, 60 + k, k * 3.2, 1, P.far);
        rect(184, 56, 12, 6, "#ff6a1a"); for (let i = 0; i < 8; i++) rect(186 + rand() * 8, 40 + rand() * 16, 2, 2, "#ffb03a");
        ridge(98, 8, 8, P.mid);
        break;
      case "tech": for (let x = 0; x < W; x += 32) { rect(x, 20, 30, horizon - 20, P.far); rect(x + 4, 30, 22, 14, "#1a2a3a"); rect(x + 6, 32, 8, 2, "#6af0ff"); rect(x + 6, 36, 14, 1, "#3fa0ff"); } break;
      case "sky": for (let i = 0; i < 6; i++) { const cx = rand() * W, cy = 60 + rand() * 50; rect(cx, cy, 50, 10, P.far); rect(cx + 10, cy - 6, 26, 6, P.far); } break;
      case "arena":
        for (let row = 0; row < 5; row++) { rect(0, 46 + row * 14, W, 14, row % 2 ? P.far : P.mid); for (let x = (row % 2) * 3; x < W; x += 6) rect(x, 48 + row * 14, 2, 3, ["#f2cf6a", "#e86a5a", "#6aa0e8", "#f4f1ea"][(x + row) % 4]); }
        break;
      case "castle":
        ridge(86, 10, 8, P.far);
        for (const x of [40, 110, 250, 320]) { const h = 50 + rand() * 30; rect(x, horizon - h, 22, h, P.mid); for (let k = 0; k < 22; k += 6) rect(x + k, horizon - h - 4, 4, 4, P.mid); rect(x + 9, horizon - h + 10, 4, 6, "#2a2a3a"); }
        rect(0, horizon - 30, W, 30, P.mid); for (let k = 0; k < W; k += 8) rect(k, horizon - 34, 5, 4, P.mid);
        break;
      case "blocky":
        for (let x = 0; x < W; x += 8) { const h = 8 + Math.floor(rand() * 4) * 8; rect(x, horizon - h, 8, h, P.far); rect(x, horizon - h, 8, 2, "#7fc06a"); }
        for (const x of [60, 300]) { rect(x + 6, horizon - 40, 6, 40, "#6b4a2a"); rect(x - 4, horizon - 56, 26, 20, "#3f8a2a"); }
        break;
      default: ridge(84, 12, 8, P.far); ridge(100, 8, 8, P.mid);
    }
    // Ground: the fighting floor.
    rect(0, horizon, W, H - horizon, P.ground);
    for (let y = horizon; y < H; y += 3) for (let x = (y % 6); x < W; x += 9 + (y % 4)) rect(x, y, 3, 1, P.ground2);
    rect(0, horizon, W, 2, P.line);
    if (kind === "blocky") for (let x = 0; x < W; x += 16) for (let y = horizon + 6; y < H; y += 16) rect(x + ((y / 16) % 2) * 8, y, 1, 10, P.ground2);
    if (kind === "volcano") for (let i = 0; i < 6; i++) { const x = rand() * W, y = horizon + 10 + rand() * 60; rect(x, y, 14, 1, "#ff6a1a"); rect(x + 4, y + 1, 8, 1, "#ffb03a"); }
    if (kind === "tech") for (let x = 0; x < W; x += 24) rect(x, horizon, 1, H - horizon, "#4a5866");
    if (kind === "sea") for (let x = 0; x < W; x += 20) rect(x, horizon + 2, 12, 1, "#f4ecd2");
    if (night) { g.fillStyle = "rgba(10,14,40,0.35)"; g.fillRect(0, 0, W, H); }
    return cv;
  }

  /* --- Gear and effect drawings --------------------------------------- */

  function drawGear(g, look, colour, x, y, t) {
    const r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
    const dark = "#1d1a17";
    switch (look) {
      case "bomb": r(-3, -6, 6, 6, colour); r(-1, -8, 2, 2, "#8a5a32"); if ((t / 120 | 0) % 2) r(0, -10, 1, 2, "#ffcc33"); break;
      case "trap": r(-6, -2, 12, 2, colour); for (let i = -6; i < 6; i += 3) r(i, -4, 1, 2, "#cfd6dd"); break;
      case "net": for (let i = -6; i <= 6; i += 3) { r(i, -10, 1, 10, colour); r(-6, -10 + (i + 6) * 0.8, 13, 1, colour); } break;
      case "turret": case "cannon": r(-5, -6, 10, 6, "#6b4a2a"); r(-2, -9, 10, 3, look === "cannon" ? dark : colour); r(-4, -1, 3, 2, dark); r(2, -1, 3, 2, dark); break;
      case "potion": r(-2, -7, 4, 6, colour); r(-1, -9, 2, 2, "#cfd6dd"); r(-1, -6, 1, 2, "#ffffff"); break;
      case "armour": r(-4, -9, 8, 8, colour); r(-3, -8, 2, 6, "#ffffff"); break;
      case "shield": case "wall": r(-4, -12, 8, 12, colour); r(-3, -11, 6, 1, "#ffffff"); break;
      case "banner": r(0, -18, 1, 18, "#8a5a32"); r(1, -18, 8, 6, colour); r(1, -12, 6, 2, colour); break;
      case "vehicle": r(-9, -8, 18, 6, colour); r(-6, -12, 8, 4, colour); r(-7, -2, 4, 3, dark); r(3, -2, 4, 3, dark); break;
      case "beast": r(-6, -8, 10, 5, colour); r(3, -11, 4, 4, colour); r(-5, -3, 2, 3, colour); r(1, -3, 2, 3, colour); r(5, -10, 1, 1, dark); break;
      case "rope": for (let i = 0; i < 10; i++) r(-5 + i, -2 - Math.sin(i) * 2, 1, 1, colour); break;
      case "gun": r(-4, -5, 9, 3, colour); r(-4, -2, 3, 3, colour); break;
      case "bow": for (let i = -5; i <= 5; i++) r(Math.round(2 - (i * i) / 10), -6 + i, 1, 1, colour); r(-1, -11, 1, 11, "#f4f1ea"); break;
      case "staff": r(0, -14, 1, 14, "#8a5a32"); r(-1, -16, 3, 3, colour); break;
      case "blade": r(0, -12, 2, 10, "#d9dee4"); r(-2, -3, 6, 1, colour); r(0, -2, 2, 2, "#8a5a32"); break;
      default: r(-4, -7, 8, 7, colour); r(-2, -5, 4, 2, "#ffffff"); r(-1, -9, 1, 2, dark); if ((t / 200 | 0) % 2) r(0, -10, 1, 1, colour);
    }
  }

  /* --- The stage -------------------------------------------------------- */

  const SLOTS = [[128, 170], [104, 152], [98, 190], [74, 162], [56, 182]];

  function player(container, fight, opts = {}) {
    const { teams, verdict, arena } = fight;
    const worldName = fight.worldName || (w => w);
    const people = cast(teams);
    const beats = script(verdict, teams, verdict.preps);
    const winSide = Math.max(0, teams.findIndex(t => t.name === verdict.winner));
    const world = (arena && arena.world) || (people[0] && people[0].world) || "";
    const kind = backdropKind(arena, world);
    const night = /night|dark|shadow|dusk|midnight/i.test(arena ? `${arena.name} ${arena.terrain}` : "") && kind !== "volcano";
    const bg = backdrop(kind, night);
    const Sound = window.Sound;
    const sfx = (n, v = 1, r = 1) => { if (Sound) Sound.play(n, v, r); };

    container.innerHTML = `
      <div class="b8" tabindex="-1">
       <div class="b8__screen">
        <canvas class="b8__stage" width="${W}" height="${H}" aria-hidden="true"></canvas>
        <div class="b8__hud">
          ${teams.map((t, side) => `<div class="b8__team b8__team--${side ? "right" : "left"}">
            <span class="b8__who">${esc(t.name)}</span>
            ${people.filter(p => p.side === side).map(p => `<span class="b8__f" data-k="${esc(p.key)}"><span class="b8__n">${esc(p.name)}</span><span class="b8__hp"><i></i></span></span>`).join("")}
          </div>`).join("")}
        </div>
        <div class="b8__bubbles"></div>
        <div class="b8__banner" hidden></div>
        <div class="b8__move" hidden></div>
       </div>
        <p class="b8__caption" aria-live="polite"></p>
        <div class="b8__ctl">
          <button type="button" class="b8__btn" data-act="toggle" aria-label="Pause">❚❚</button>
          <span class="b8__bar"><i></i></span>
          <button type="button" class="b8__btn" data-act="skip">Skip</button>
        </div>
      </div>`;
    const root = container.querySelector(".b8");
    const cv = root.querySelector("canvas"), ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const caption = root.querySelector(".b8__caption"), banner = root.querySelector(".b8__banner"), bubbles = root.querySelector(".b8__bubbles");
    const bar = root.querySelector(".b8__bar i"), toggle = root.querySelector('[data-act="toggle"]');
    const moveEl = root.querySelector(".b8__move");

    // Fighters, lined up on their side, biggest at the back.
    const fighters = people.map(p => {
      const sprite = window.Sprite.of(p);
      return { ...p, sprite, hp: p.condition && p.condition.status === "injured" ? 70 : 100, downed: false, facing: p.side ? -1 : 1, alpha: 1, scale: 1 };
    });
    [0, 1].forEach(side => {
      const mine = fighters.filter(f => f.side === side).sort((a, b) => a.sprite.size - b.sprite.size);
      mine.forEach((f, i) => {
        const [sx, sy] = SLOTS[i % SLOTS.length];
        f.home = { x: side ? W - sx : sx, y: sy };
        f.pos = { x: side ? W + 40 : -40, y: sy };
        f.pose = "walk"; f.poseT = 0;
      });
    });
    const byKey = k => fighters.find(f => f.key === k);
    const fieldGear = [];   // items placed on the ground
    const stains = [];      // blood, oil and goo left on the ground
    let shots = [], parts = [], rings = [], flash = null, shake = 0;

    /* What a character bleeds, and how they die. Real people (the famous
       world) are simply defeated, without gore. */
    function gore(f) {
      const sp = f.sprite.spec;
      if (f.world === "famous" && sp.body !== "q" && sp.body !== "s") return { kind: "none" };
      if (sp.body === "r") return { kind: "oil", c: "#2b2b2b" };
      if (sp.body === "k") return { kind: "poof", c: "#c0262f" };
      if (sp.body === "g") return { kind: "fade", c: sp.skin };
      if (sp.body === "o") return { kind: "goo", c: sp.skin };
      if (sp.extras.has("blood_green")) return { kind: "blood", c: "#7fd34a" };
      if (sp.extras.has("blood_black")) return { kind: "blood", c: "#1d1a17" };
      return { kind: "blood", c: "#b3121f" };
    }
    // A spray from a wound, and a few drops on the ground.
    function bleed(f, amount, dir) {
      const g = gore(f);
      if (g.kind === "none" || g.kind === "fade") return;
      const c = centre(f);
      const n = Math.round(amount * (g.kind === "poof" ? 0.5 : 1));
      for (let i = 0; i < n; i++) {
        parts.push({ x: c.x, y: c.y + rnd(-3, 3), vx: dir * rnd(20, 110) + rnd(-20, 20), vy: rnd(-90, -10), g: 320,
          c: g.kind === "oil" && i % 3 === 0 ? "#ffd23a" : i % 4 === 0 ? Sprite.shade(g.c, -0.3) : g.c, s: rnd(1, 3) | 0 || 1, t0: time, life: rnd(350, 700) });
      }
      if (g.kind === "poof") return;
      for (let i = 0; i < Math.ceil(amount / 6); i++) stains.push({ x: f.pos.x + dir * rnd(2, 22), y: f.pos.y + rnd(-2, 3), r: 0, max: rnd(1, 3), c: g.c, t0: time });
    }
    // Death, in the character's own way: a pool of blood, oil or goo, a puff
    // of smoke (Minecraft), or fading away (ghosts).
    async function die(f, dir) {
      const g = gore(f);
      f.downed = true; f.dead = true; setHp(f, 0);
      sfx("b_death", 0.9);
      if (g.kind === "poof") {
        burst(centre(f).x, centre(f).y, "smoke", 22, true);
        f.flashUntil = time + 400;
        await wait(260);
        await tween(f, { alpha: 0 }, 300);
        return;
      }
      if (g.kind === "fade") {
        burst(centre(f).x, centre(f).y, "dark", 18);
        await tween(f, { alpha: 0 }, 700);
        return;
      }
      if (g.kind !== "none") {
        bleed(f, 26, dir);
        stains.push({ x: f.pos.x - dir * 4 * f.sprite.size, y: f.pos.y + 1, r: 0, max: (g.kind === "goo" ? 16 : 12) * f.sprite.size, c: g.c, t0: time, pool: true });
      }
      await wait(380);
    }
    function drawStains() {
      for (const st of stains) {
        const grow = st.pool ? clamp((time - st.t0) / 1600, 0, 1) : 1;
        const rx = Math.max(1, Math.round(st.max * grow)), ry = Math.max(1, Math.round(rx * 0.35));
        ctx.fillStyle = st.c;
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(1 - (y * y) / ((ry + 0.5) * (ry + 0.5))));
          ctx.fillRect(Math.round(st.x - w), Math.round(st.y + y), w * 2 + 1, 1);
        }
        if (st.pool && rx > 3) { ctx.fillStyle = Sprite.shade(st.c, 0.25); ctx.fillRect(Math.round(st.x - rx / 2), Math.round(st.y - ry + 1), 2, 1); }
      }
    }

    // A character who uses a weapon from their team's gear holds it from then on.
    const WIELD = { blade: "sword", bow: "bow", gun: "gun", staff: "staff", cannon: "cannon", rope: "whip", net: "whip" };
    function wield(f, item) {
      if (!item || item.side !== f.side) return;
      if (WIELD[item.look]) f.sprite = Sprite.of(f, { weapon: WIELD[item.look] });
      else if (item.look === "shield") f.sprite = Sprite.of(f, { extras: ["shield"] });
    }
    let moveTimer = null;
    function callMove(name) {
      if (!name) return;
      moveEl.textContent = name.endsWith("!") ? name : `${name}!`;
      moveEl.hidden = false;
      moveEl.style.animation = "none"; void moveEl.offsetWidth; moveEl.style.animation = "";
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { moveEl.hidden = true; }, 1500);
    }

    /* A clock that stops while paused; every wait in the script uses it. */
    let time = 0, last = performance.now(), playing = !!(opts.autoplay !== false), skipping = false, done = false, raf = 0, ended = false;
    const waits = [];
    const wait = ms => skipping ? Promise.resolve() : new Promise(res => waits.push({ at: time + ms, res }));
    const tweens = [];
    const tween = (obj, to, ms, e = ease) => {
      if (skipping) { Object.assign(obj, to); return Promise.resolve(); }
      const from = Object.fromEntries(Object.keys(to).map(k => [k, obj[k]]));
      return new Promise(res => tweens.push({ obj, from, to, t0: time, ms, e, res }));
    };
    const setPose = (f, pose) => { f.pose = pose; f.poseT = time; };

    // The story moves on a timer, so it keeps going in a background tab
    // (where animation frames stop); drawing happens on animation frames.
    function step() {
      const now = performance.now();
      const dt = Math.min(250, now - last); last = now;
      if (playing && !done) time += dt;
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i], k = clamp((time - tw.t0) / tw.ms, 0, 1), e = tw.e(k);
        for (const key in tw.to) tw.obj[key] = lerp(tw.from[key], tw.to[key], e);
        if (k >= 1) { tweens.splice(i, 1); tw.res(); }
      }
      for (let i = waits.length - 1; i >= 0; i--) if (time >= waits[i].at) { const w = waits.splice(i, 1)[0]; w.res(); }
    }
    function frame() {
      step();
      draw();
      if (!ended || !stopped) raf = requestAnimationFrame(frame);
    }
    let stopped = false;
    const timer = setInterval(() => { if (stopped) return clearInterval(timer); step(); }, 30);

    function draw() {
      ctx.save();
      if (shake > time) ctx.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
      ctx.drawImage(bg, 0, 0);
      drawStains();
      for (const it of fieldGear) drawGear(ctx, it.look, it.colour, it.x, it.y, time);
      const list = fighters.slice().sort((a, b) => a.pos.y - b.pos.y);
      for (const f of list) {
        const pose = f.downed ? "ko" : f.pose;
        const img = f.sprite.frame(pose, time - f.poseT, f.flashUntil > time && ((time / 60) | 0) % 2 === 0);
        const S = img.width;
        const x = Math.round(f.pos.x), y = Math.round(f.pos.y + (f.hop || 0));
        if (f.alpha <= 0.01) continue;
        ctx.fillStyle = `rgba(0,0,0,${(0.22 * clamp(f.alpha, 0, 1)).toFixed(2)})`;
        ctx.fillRect(x - Math.round(6 * f.sprite.size * f.scale), Math.round(f.pos.y) - 1, Math.round(12 * f.sprite.size * f.scale), 2);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(f.facing < 0 ? -f.scale : f.scale, f.scale);
        ctx.globalAlpha = clamp(f.alpha, 0, 1);
        ctx.drawImage(img, -Math.floor(S / 2), -(S - 4));
        ctx.restore();
        if (f.shield > time) { ctx.strokeStyle = "rgba(143,208,255,0.85)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 12 * f.sprite.size, 14 * f.sprite.size, 0, Math.PI * 2); ctx.stroke(); }
      }
      for (const r of rings) { const k = (time - r.t0) / r.ms; if (k < 1) { ctx.strokeStyle = r.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } }
      rings = rings.filter(r => time - r.t0 < r.ms);
      for (const s of shots) drawShot(s);
      for (const p of parts) {
        const age = time - p.t0;
        const px = p.x + p.vx * age / 1000, py = p.y + p.vy * age / 1000 + 0.5 * p.g * (age / 1000) ** 2;
        ctx.globalAlpha = clamp(1 - age / p.life, 0, 1);
        ctx.fillStyle = p.c; ctx.fillRect(Math.round(px), Math.round(py), p.s, p.s);
      }
      ctx.globalAlpha = 1;
      parts = parts.filter(p => time - p.t0 < p.life);
      if (flash && flash.until > time) { ctx.globalAlpha = (flash.until - time) / flash.ms * 0.55; ctx.fillStyle = flash.c; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.restore();
      placeBubbles();
      bar.style.width = `${Math.round(progress * 100)}%`;
    }

    function drawShot(s) {
      const k = clamp((time - s.t0) / s.ms, 0, 1);
      const x = lerp(s.x0, s.x1, k), y = lerp(s.y0, s.y1, k) - Math.sin(k * Math.PI) * (s.arc || 0);
      ctx.fillStyle = s.c;
      switch (s.kind) {
        case "arrow": { const d = Math.sign(s.x1 - s.x0); ctx.fillStyle = "#8a5a32"; ctx.fillRect(Math.round(x - 5 * d), Math.round(y), 6, 1); ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x + d), Math.round(y) - 1, 1, 3); break; }
        case "bullet": ctx.fillStyle = "#ffe08a"; ctx.fillRect(Math.round(x) - 2, Math.round(y), 4, 1); break;
        case "beam": { ctx.globalAlpha = 0.9; ctx.strokeStyle = s.c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(lerp(s.x0, s.x1, Math.min(1, k * 2)), lerp(s.y0, s.y1, Math.min(1, k * 2))); ctx.stroke();
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; break; }
        case "bolt": { if (k > 0.9) break; ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x0, s.y0);
          for (let i = 1; i <= 6; i++) ctx.lineTo(lerp(s.x0, s.x1, i / 6) + (i < 6 ? rnd(-4, 4) : 0), lerp(s.y0, s.y1, i / 6) + (i < 6 ? rnd(-6, 6) : 0)); ctx.stroke(); break; }
        case "web": { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(x, y); ctx.stroke(); break; }
        case "breath": for (let i = 0; i < 6; i++) { const kk = clamp(k - i * 0.05, 0, 1); ctx.fillStyle = i % 2 ? s.c : "#ffe14d"; const r = 2 + i; ctx.fillRect(Math.round(lerp(s.x0, s.x1, kk)) - r / 2, Math.round(lerp(s.y0, s.y1, kk) + rnd(-2, 2)), r, r); } break;
        case "rock": ctx.fillStyle = s.c; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 5); break;
        case "gear": drawGear(ctx, s.look, s.c, x, y + 4, time); break;
        case "spin": { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(Math.floor(time / 60) * Math.PI / 2);
          ctx.fillStyle = s.c; ctx.fillRect(-4, -1, 8, 3); ctx.fillStyle = "#8a5a32"; ctx.fillRect(-1, 1, 2, 4); ctx.restore(); break; }
        case "fall": { ctx.fillStyle = s.c; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 5, 2, 6); ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x) - 1, Math.round(y), 2, 1); break; }
        default: ctx.fillStyle = s.c; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6); ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
    }

    /* --- Effects ---------------------------------------------------------- */

    const centre = f => ({ x: f.pos.x, y: f.pos.y - 12 * f.sprite.size });
    function burst(x, y, effect, n = 14, big = false) {
      const c = FX[effect] || "#ffffff";
      for (let i = 0; i < n * (big ? 2 : 1); i++) {
        const a = rnd(0, Math.PI * 2), sp = rnd(30, big ? 140 : 90);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (effect === "heal" ? 40 : 0), g: effect === "heal" || effect === "smoke" ? -30 : 160,
          c: i % 3 === 0 ? "#ffffff" : effect === "explosion" && i % 2 ? "#ffcc33" : c, s: rnd(1, big ? 4 : 3) | 0 || 1, t0: time, life: rnd(300, big ? 900 : 600) });
      }
      if (["psychic", "shield", "light", "dark", "explosion", "tech"].includes(effect) || big) rings.push({ x, y, r0: 2, r1: big ? 30 : 16, c, t0: time, ms: big ? 600 : 400 });
    }
    function damageNumber(f, text, c) {
      const b = document.createElement("span");
      b.className = "b8__dmg"; b.textContent = text; b.style.color = c;
      const p = centre(f);
      b.style.left = `${(p.x / W) * 100}%`; b.style.top = `${((p.y - 12) / H) * 100}%`;
      bubbles.appendChild(b);
      setTimeout(() => b.remove(), 1100);
    }
    let talk = null;
    function say(f, line) {
      if (!line) return;
      bubbles.querySelectorAll(".b8__say").forEach(n => n.remove());
      const b = document.createElement("span");
      b.className = `b8__say${f.side ? " b8__say--r" : ""}`; b.textContent = line;
      bubbles.appendChild(b);
      talk = { f, b, until: time + Math.max(1800, line.length * 70) };
    }
    function placeBubbles() {
      if (!talk) return;
      if (time > talk.until) { talk.b.remove(); talk = null; return; }
      const p = talk.f.pos, top = p.y - 30 * talk.f.sprite.size;
      talk.b.style.left = `${(p.x / W) * 100}%`; talk.b.style.top = `${(top / H) * 100}%`;
    }
    function setHp(f, hp) {
      f.hp = clamp(hp, 0, 100);
      const el = root.querySelector(`.b8__f[data-k="${CSS.escape(f.key)}"]`);
      if (!el) return;
      el.querySelector("i").style.width = `${f.hp}%`;
      el.classList.toggle("is-low", f.hp < 35);
      el.classList.toggle("is-down", f.downed);
      el.classList.toggle("is-dead", !!f.dead);
    }

    // How a hit lands on the target.
    async function land(target, outcome, effect, from) {
      if (!target) return;
      const c = centre(target), dir = Math.sign(target.pos.x - from.pos.x) || 1;
      if (outcome === "dodged" || outcome === "miss") {
        sfx("b_whoosh", 0.7);
        damageNumber(target, outcome === "miss" ? "miss" : "dodged", "#f4f1ea");
        await tween(target.pos, { x: target.pos.x + dir * 12 }, 180);
        target.hop = -6; await wait(120); target.hop = 0;
        return;
      }
      if (outcome === "blocked") {
        setPose(target, "block"); sfx("b_block", 0.8);
        burst(c.x - dir * 6, c.y, "impact", 8);
        setHp(target, target.hp - 5);
        damageNumber(target, "blocked", "#cfe8ff");
        await wait(250);
        if (!target.downed) setPose(target, "idle");
        return;
      }
      if (outcome === "none") return;
      const dmg = { hit: 28, crit: 44, hurt: 15, ko: 100 }[outcome] || 20;
      burst(c.x, c.y, effect === "none" ? "impact" : effect, outcome === "crit" || outcome === "ko" ? 22 : 12, outcome === "crit");
      sfx(outcome === "crit" || outcome === "ko" ? "b_crit" : "b_hit", outcome === "hurt" ? 0.7 : 1);
      if (outcome === "crit" || outcome === "ko") { shake = time + 280; flash = { c: "#ffffff", until: time + 120, ms: 120 }; }
      target.flashUntil = time + 360;
      setPose(target, "hurt");
      bleed(target, outcome === "ko" ? 18 : outcome === "crit" ? 14 : outcome === "hurt" ? 5 : 9, dir);
      if (gore(target).kind === "blood" || gore(target).kind === "goo") sfx("b_splat", outcome === "hurt" ? 0.5 : 0.8);
      const left = outcome === "ko" ? 0 : Math.max(6, target.hp - dmg);
      damageNumber(target, outcome === "crit" ? `${target.hp - left}!` : `${target.hp - left}`, outcome === "crit" ? "#ffcc33" : "#ffffff");
      setHp(target, left);
      await tween(target.pos, { x: target.pos.x + dir * (outcome === "crit" || outcome === "ko" ? 14 : 7) }, 160);
      if (outcome === "ko") {
        await die(target, dir);
      } else {
        await wait(220);
        setPose(target, "idle");
      }
    }

    function shotFor(actor, effect, gearItem) {
      const st = actor.sprite.spec.style, w = actor.sprite.spec.weapon;
      if (gearItem) return gearItem.look === "bow" ? "arrow" : gearItem.look === "gun" || gearItem.look === "turret" ? "bullet" : gearItem.look === "cannon" ? "rock" : "orb";
      if (effect === "lightning") return "bolt";
      if (effect === "web") return "web";
      if (effect === "earth") return "rock";
      if (st === "bow" || w === "bow" || w === "crossbow") return "arrow";
      if (st === "gun" || ["gun", "rifle", "blaster"].includes(w)) return effect === "tech" || w === "blaster" ? "orb" : "bullet";
      if (st === "beam" || effect === "light" || effect === "tech") return "beam";
      if (st === "breath") return "breath";
      return "orb";
    }

    async function fire(actor, target, kind, effect, opts2 = {}) {
      const a = centre(actor), b = centre(target);
      const ms = kind === "beam" || kind === "bolt" ? 320 : kind === "breath" ? 500 : kind === "rock" ? 520 : 380;
      const c = FX[effect] || FX[actor.sprite.spec.element] || actor.sprite.spec.accent;
      sfx(kind === "arrow" ? "b_shoot" : kind === "bullet" ? "b_gun" : kind === "beam" || kind === "bolt" ? "b_beam" : kind === "breath" ? "b_fire" : "b_magic", 0.85);
      const s = { kind, x0: a.x + actor.facing * 8, y0: a.y - 2, x1: b.x, y1: b.y, c, t0: time, ms, arc: kind === "rock" || kind === "gear" ? 26 : 0, ...opts2 };
      shots.push(s);
      await wait(ms);
      shots = shots.filter(q => q !== s);
    }

    async function approach(actor, target) {
      const gap = 14 * Math.max(actor.sprite.size, target.sprite.size);
      setPose(actor, "walk");
      await tween(actor.pos, { x: target.pos.x - actor.facing * gap, y: target.pos.y + 1 }, 420);
    }
    async function goHome(f) {
      if (f.downed) return;
      setPose(f, "walk");
      await tween(f.pos, { x: f.home.x, y: f.home.y }, 380);
      setPose(f, "idle");
    }

    /* --- Acting out a beat ------------------------------------------------- */

    async function act(b) {
      const actor = byKey(b.actor), target = b.target ? byKey(b.target) : null;
      if (!actor || actor.downed) return;
      const gearItem = b.gear ? gearList.find(g => g.name === b.gear) : null;
      const effect = b.effect !== "none" ? b.effect : actor.sprite.spec.element !== "none" ? actor.sprite.spec.element : "impact";
      caption.textContent = b.caption || describe(b, actor, target);
      say(actor, b.line);
      wield(actor, gearItem);
      callMove(b.move);
      const ranged = RANGED.has(actor.sprite.spec.style);
      const t0 = time;
      switch (b.action) {
        case "advance":
          setPose(actor, "walk");
          await tween(actor.pos, { x: actor.pos.x + actor.facing * 34 }, 500);
          setPose(actor, "idle");
          if (target) await land(target, b.outcome, effect, actor);
          break;
        case "strike": case "team_up": case "special": {
          if (!target) break;
          const big = b.action === "special";
          const ally = b.action === "team_up" ? fighters.find(f => f.side === actor.side && f !== actor && !f.downed) : null;
          if (big) { setPose(actor, "cast"); sfx("b_charge", 0.8); for (let i = 0; i < 5; i++) { const c = centre(actor); burst(c.x, c.y, effect, 4); await wait(110); } flash = { c: FX[effect] || "#ffffff", until: time + 220, ms: 220 }; }
          if (ranged && !ally) {
            setPose(actor, "cast");
            await fire(actor, target, shotFor(actor, b.effect, null), effect);
            if (big) { shake = time + 400; burst(centre(target).x, centre(target).y, effect, 26, true); sfx("b_boom", 0.9); }
            await land(target, b.outcome, effect, actor);
            setPose(actor, "idle");
          } else {
            const moves = [approach(actor, target)];
            if (ally) moves.push((async () => { setPose(ally, "walk"); await tween(ally.pos, { x: target.pos.x - ally.facing * 16, y: target.pos.y - 8 }, 440); })());
            await Promise.all(moves);
            setPose(actor, "windup"); if (ally) setPose(ally, "windup");
            await wait(180);
            setPose(actor, "strike"); if (ally) setPose(ally, "strike");
            sfx(["blade", "claws"].includes(actor.sprite.spec.style) ? "b_slash" : "b_punch", 0.9);
            const c = centre(target);
            burst(c.x - actor.facing * 4, c.y, b.effect !== "none" ? b.effect : actor.sprite.spec.style === "blade" ? "slash" : "impact", 10, big);
            if (big) { shake = time + 400; sfx("b_boom", 0.8); }
            await land(target, b.outcome, effect, actor);
            await wait(160);
            await Promise.all([goHome(actor), ally ? goHome(ally) : null]);
          }
          break;
        }
        case "shoot": case "cast":
          if (!target) { setPose(actor, "cast"); burst(centre(actor).x, centre(actor).y, effect, 10); await wait(500); setPose(actor, "idle"); break; }
          setPose(actor, b.action === "shoot" ? "shoot" : "cast");
          await wait(200);
          await fire(actor, target, b.action === "shoot" ? (["gun", "rifle", "blaster"].includes(actor.sprite.spec.weapon) || actor.sprite.spec.style === "gun" ? "bullet" : "arrow") : shotFor(actor, b.effect, null), effect);
          await land(target, b.outcome, effect, actor);
          setPose(actor, "idle");
          break;
        case "block": case "shield": {
          const who = target && b.action === "shield" ? target : actor;
          setPose(actor, b.action === "block" ? "block" : "cast");
          who.shield = time + 1400; sfx("b_shield", 0.8);
          burst(centre(who).x, centre(who).y, "shield", 8);
          await wait(800); setPose(actor, "idle");
          break;
        }
        case "dodge":
          sfx("b_whoosh", 0.8);
          actor.hop = -8; await tween(actor.pos, { x: actor.pos.x - actor.facing * 14 }, 220); actor.hop = 0;
          await wait(300); await goHome(actor);
          break;
        case "heal": {
          const who = target || actor;
          setPose(actor, "cast"); sfx("b_heal", 0.8);
          for (let i = 0; i < 4; i++) { burst(centre(who).x, centre(who).y + 6, "heal", 5); await wait(140); }
          setHp(who, who.hp + 30);
          damageNumber(who, "+30", "#6aff8a");
          await wait(300); setPose(actor, "idle");
          break;
        }
        case "build": {
          setPose(actor, "cast"); sfx("b_build", 0.8);
          for (let i = 0; i < 6; i++) { burst(actor.pos.x + actor.facing * 10, actor.pos.y - 4, "lightning", 3); await wait(140); }
          if (gearItem) placeGear(gearItem, actor);
          await wait(300); setPose(actor, "idle");
          break;
        }
        case "deploy_gear": case "trap": {
          const item = gearItem || { look: b.action === "trap" ? "trap" : "device", colour: COLOURS.cyan, name: "" };
          const placed = placeGear(item, actor);
          sfx("b_deploy", 0.8);
          await wait(350);
          const look = item.look;
          const support = ["potion", "armour", "banner", "shield", "wall"].includes(look);
          if (support) {
            // Help for the user's own side; a banner lifts everyone standing.
            const who = look === "banner" ? fighters.filter(f => f.side === actor.side && !f.downed) : [actor];
            for (const f of who) {
              burst(centre(f).x, centre(f).y, look === "potion" ? "heal" : "shield", 8);
              if (look === "potion") { setHp(f, f.hp + 25); damageNumber(f, "+25", "#6aff8a"); }
              else f.shield = time + 1800;
            }
            sfx(look === "potion" ? "b_heal" : "b_shield", 0.8);
            await wait(500);
            if (look === "potion") fieldGear.splice(fieldGear.indexOf(placed), 1);
          } else if (target) {
            if (look === "bomb") {
              fieldGear.splice(fieldGear.indexOf(placed), 1);
              await fire(actor, target, "gear", "explosion", { look, c: item.colour, ms: 520, arc: 30 });
              burst(centre(target).x, target.pos.y - 4, "explosion", 24, true); sfx("b_boom"); shake = time + 360;
            } else if (look === "trap" || look === "net" || look === "rope") {
              fieldGear.splice(fieldGear.indexOf(placed), 1);
              const it = { ...placed, x: target.pos.x, y: target.pos.y }; fieldGear.push(it);
              sfx("b_block", 0.8); burst(target.pos.x, target.pos.y - 3, "impact", 10);
              await wait(250); setTimeout(() => { const i = fieldGear.indexOf(it); if (i >= 0) fieldGear.splice(i, 1); }, 1400);
            } else if (look === "vehicle" || look === "beast") {
              const s = { kind: "gear", look, c: item.colour, x0: placed.x, y0: placed.y - 6, x1: target.pos.x, y1: target.pos.y - 6, t0: time, ms: 500 };
              fieldGear.splice(fieldGear.indexOf(placed), 1); shots.push(s); sfx("b_whoosh"); await wait(500); shots = shots.filter(q => q !== s);
            } else {
              await fire({ ...actor, pos: { x: placed.x, y: placed.y + 8 }, sprite: actor.sprite, facing: actor.facing }, target,
                look === "turret" || look === "gun" ? "bullet" : look === "cannon" ? "rock" : look === "bow" ? "arrow" : "beam", b.effect !== "none" ? b.effect : "tech");
            }
            await land(target, b.outcome, b.effect !== "none" ? b.effect : "explosion", actor);
          } else {
            // Set up and left waiting on the field: a trap laid, a charge planted.
            await wait(400);
          }
          break;
        }
        case "combo": {
          if (!target) break;
          await approach(actor, target);
          const hit = b.effect !== "none" ? b.effect : actor.sprite.spec.style === "blade" ? "slash" : "impact";
          for (let i = 0; i < 4; i++) {
            setPose(actor, "windup"); await wait(80);
            setPose(actor, "strike"); sfx(["blade", "claws"].includes(actor.sprite.spec.style) ? "b_slash" : "b_punch", 0.7, 1 + i * 0.08);
            burst(centre(target).x - actor.facing * 3, centre(target).y + rnd(-4, 4), hit, 5);
            if (i < 3 && b.outcome !== "blocked" && b.outcome !== "dodged" && b.outcome !== "miss") { bleed(target, 3, actor.facing); target.flashUntil = time + 120; }
            await wait(90);
          }
          await land(target, b.outcome, effect, actor);
          await wait(160); await goHome(actor);
          break;
        }
        case "throw": {
          if (!target) break;
          setPose(actor, "windup"); await wait(220); setPose(actor, "strike");
          const w = actor.sprite.spec.weapon, c = ["hammer", "axe", "shield", "mace"].includes(w) ? "#cfd6dd" : FX[effect] || "#cfd6dd";
          sfx("b_throw", 0.9);
          await fire(actor, target, "spin", effect, { c, ms: 420, arc: 14 });
          await land(target, b.outcome, effect, actor);
          // Hammers, axes and shields come back.
          if (["hammer", "axe", "shield", "mace", "orb"].includes(w)) {
            const a = centre(target), h = centre(actor);
            const back = { kind: "spin", x0: a.x, y0: a.y, x1: h.x, y1: h.y, c, t0: time, ms: 380, arc: 10 };
            shots.push(back); await wait(380); shots = shots.filter(q => q !== back);
          }
          setPose(actor, "idle");
          break;
        }
        case "slam": {
          if (!target) break;
          setPose(actor, "windup");
          await Promise.all([tween(actor, { hop: -26 }, 260), tween(actor.pos, { x: target.pos.x - actor.facing * 10 * actor.sprite.size, y: target.pos.y }, 260)]);
          setPose(actor, "strike");
          await tween(actor, { hop: 0 }, 120);
          sfx("b_slam", 0.55); shake = time + 420;
          rings.push({ x: actor.pos.x, y: actor.pos.y, r0: 2, r1: 46, c: FX[effect] || "#e8d9b0", t0: time, ms: 500 });
          burst(actor.pos.x, actor.pos.y - 2, b.effect !== "none" ? b.effect : "earth", 24, true);
          // Everyone near the impact is thrown about.
          const near = fighters.filter(f => f !== target && f.side === target.side && !f.downed && Math.abs(f.pos.x - target.pos.x) < 46);
          await Promise.all([land(target, b.outcome, effect, actor), ...near.map(f => land(f, "hurt", effect, actor))]);
          await wait(160); await goHome(actor);
          break;
        }
        case "barrage": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_charge", 0.6);
          await wait(250);
          const kindOf = ["fire", "explosion", "lightning", "ice", "dark", "light", "psychic", "tech"].includes(effect) ? "orb" : "fall";
          const c = FX[effect] || "#cfd6dd";
          for (let i = 0; i < 12; i++) {
            const x = target.pos.x + rnd(-24, 24);
            const s = { kind: kindOf, x0: x + rnd(-20, 20), y0: -10, x1: x, y1: target.pos.y - rnd(0, 12), c, t0: time, ms: 380 };
            shots.push(s);
            setTimeout(() => { shots = shots.filter(q => q !== s); }, 400);
            if (i % 3 === 0) sfx(kindOf === "fall" ? "b_shoot" : "b_magic", 0.5);
            await wait(70);
          }
          await wait(260);
          burst(target.pos.x, target.pos.y - 4, effect === "none" ? "impact" : effect, 18, true);
          await land(target, b.outcome, effect, actor);
          setPose(actor, "idle");
          break;
        }
        case "grab": {
          if (!target) break;
          await approach(actor, target);
          setPose(actor, "strike");
          await tween(target, { hop: -16 }, 260);
          sfx("b_throw", 0.8);
          await Promise.all([tween(target.pos, { x: target.pos.x + actor.facing * 34 }, 360), tween(target, { hop: 0 }, 360, t => t * t)]);
          shake = time + 300; burst(target.pos.x, target.pos.y - 2, "earth", 14);
          await land(target, b.outcome, effect, actor);
          await goHome(actor);
          if (!target.downed) await goHome(target);
          break;
        }
        case "teleport": case "stealth": {
          if (!target) {   // just slipping out of sight for a moment
            sfx(b.action === "teleport" ? "b_teleport" : "b_whoosh", 0.7);
            if (b.action === "teleport") burst(centre(actor).x, centre(actor).y, "smoke", 12);
            await tween(actor, { alpha: b.action === "teleport" ? 0 : 0.15 }, 300);
            await wait(700);
            await tween(actor, { alpha: 1 }, 300);
            break;
          }
          const tele = b.action === "teleport";
          sfx(tele ? "b_teleport" : "b_whoosh", 0.8);
          if (tele) { burst(centre(actor).x, centre(actor).y, "smoke", 14); actor.alpha = 0; await wait(260); }
          else await tween(actor, { alpha: 0.12 }, 400);
          // Appear behind the target, facing them.
          actor.pos.x = target.pos.x + actor.facing * 16 * Math.max(1, target.sprite.size); actor.pos.y = target.pos.y;
          actor.facing = -actor.facing;
          if (tele) { burst(centre(actor).x, centre(actor).y, "smoke", 14); actor.alpha = 1; }
          else await tween(actor, { alpha: 1 }, 160);
          setPose(actor, "windup"); await wait(120);
          setPose(actor, "strike"); sfx("b_slash", 0.9);
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "slash", 12);
          await land(target, b.outcome === "hit" ? "crit" : b.outcome, effect, actor);
          await wait(200);
          if (tele) { burst(centre(actor).x, centre(actor).y, "smoke", 12); actor.alpha = 0; await wait(200); }
          actor.facing = actor.side ? -1 : 1;
          actor.pos.x = actor.home.x; actor.pos.y = actor.home.y;
          if (tele) { burst(centre(actor).x, centre(actor).y, "smoke", 10); actor.alpha = 1; }
          setPose(actor, "idle");
          break;
        }
        case "transform": {
          setPose(actor, "cast"); sfx("b_transform", 1);
          for (let i = 0; i < 6; i++) { burst(centre(actor).x, centre(actor).y, effect === "impact" ? "light" : effect, 6); await wait(110); }
          flash = { c: FX[effect] || "#ffffff", until: time + 300, ms: 300 };
          await tween(actor, { scale: Math.min(1.6, actor.scale * 1.4) }, 300);
          rings.push({ x: centre(actor).x, y: centre(actor).y, r0: 4, r1: 40, c: FX[effect] || "#ffffff", t0: time, ms: 500 });
          setHp(actor, actor.hp + 20);
          setPose(actor, "victory"); await wait(500); setPose(actor, "idle");
          break;
        }
        case "summon": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_summon", 0.9);
          const c = FX[effect] && effect !== "impact" ? FX[effect] : actor.sprite.spec.accent;
          const imps = [0, 1, 2].map(i => ({ kind: "gear", look: "beast", c, x0: actor.pos.x - actor.facing * (10 + i * 8), y0: actor.pos.y - 4 + i * 4,
            x1: target.pos.x, y1: target.pos.y - 4 + i * 2, t0: time + i * 120, ms: 520 }));
          imps.forEach(s => shots.push(s));
          await wait(760);
          shots = shots.filter(q => !imps.includes(q));
          burst(centre(target).x, centre(target).y, effect === "impact" ? "dark" : effect, 16);
          await land(target, b.outcome, effect, actor);
          setPose(actor, "idle");
          break;
        }
        case "annihilate": {
          const victims = (b.victims || []).map(byKey).filter(f => f && !f.downed);
          if (!victims.length && target) victims.push(target);
          setPose(actor, "cast"); sfx("b_charge", 1);
          for (let i = 0; i < 8; i++) { burst(centre(actor).x, centre(actor).y, effect === "impact" ? "light" : effect, 6, i > 5); await wait(90); }
          flash = { c: FX[effect] || "#ffffff", until: time + 500, ms: 500 }; shake = time + 900;
          sfx("b_boom", 1);
          victims.forEach(v => { burst(centre(v).x, centre(v).y, effect === "impact" ? "explosion" : effect, 22, true); rings.push({ x: centre(v).x, y: centre(v).y, r0: 2, r1: 30, c: FX[effect] || "#ffffff", t0: time, ms: 600 }); });
          await Promise.all(victims.map((v, i) => wait(i * 90).then(() => land(v, b.outcome, effect, actor))));
          setPose(actor, "victory"); await wait(500); setPose(actor, "idle");
          break;
        }
        case "taunt":
          setPose(actor, "victory"); actor.hop = -4; await wait(240); actor.hop = 0; await wait(500); setPose(actor, "idle");
          break;
        case "retreat":
          setPose(actor, "walk"); sfx("b_whoosh", 0.6);
          await tween(actor.pos, { x: actor.side ? W + 50 : -50 }, 900);
          if (actor.side !== winSide) { actor.downed = false; actor.alpha = 0; actor.gone = true; setHp(actor, actor.hp); root.querySelector(`.b8__f[data-k="${CSS.escape(actor.key)}"]`)?.classList.add("is-fled"); }
          break;
        case "fall":
          setPose(actor, "hurt"); await wait(300); await die(actor, actor.facing);
          break;
      }
      // Let each beat breathe long enough to read its caption.
      const need = Math.max(2300, (caption.textContent.length || 0) * 50);
      const spent = time - t0;
      if (spent < need) await wait(need - spent);
    }

    const gearList = (verdict.preps || []).flatMap((p, side) => (p && p.gear || []).map(g => { const look = gearLook(g); return { name: g.name, side, look, colour: gearColour(g, look) }; }));
    function placeGear(item, actor) {
      const it = { look: item.look, colour: item.colour, x: actor.pos.x + actor.facing * 16, y: actor.pos.y };
      fieldGear.push(it);
      burst(it.x, it.y - 4, "smoke", 8);
      return it;
    }

    function describe(b, a, t) {
      const verbs = { advance: "advances", strike: "attacks", combo: "unleashes a flurry on", shoot: "shoots at", cast: "casts at", special: "unleashes a special on",
        annihilate: "unleashes everything", throw: "hurls a weapon at", slam: "slams down on", barrage: "rains fire on", grab: "seizes", teleport: "teleports behind",
        transform: "transforms", summon: "summons help against", stealth: "vanishes and strikes", block: "braces",
        dodge: "dodges", deploy_gear: "deploys gear against", build: "builds something", heal: "heals", shield: "shields", trap: "springs a trap on",
        team_up: "teams up against", taunt: "taunts the enemy", retreat: "retreats", fall: "falls" };
      return `${a.name} ${verbs[b.action] || "acts"}${t && !["block", "dodge", "build", "taunt", "retreat", "fall"].includes(b.action) ? ` ${t.name}` : ""}.`;
    }

    /* --- The whole show ----------------------------------------------------- */

    let progress = 0;
    function showBanner(html, ms) {
      banner.innerHTML = html; banner.hidden = false;
      return wait(ms).then(() => { banner.hidden = true; });
    }

    async function run() {
      if (Sound) Sound.music("battle");
      fighters.forEach(f => setHp(f, f.hp));
      // Walk on.
      caption.textContent = arena ? `${arena.name}.` : "";
      await Promise.all(fighters.map((f, i) => wait(i * 90).then(() => tween(f.pos, { x: f.home.x, y: f.home.y }, 900)).then(() => setPose(f, "idle"))));
      sfx("b_ready", 0.9);
      await showBanner(`<span>Ready…</span>`, 700);
      sfx("b_fight", 1);
      await showBanner(`<span>Fight!</span>`, 650);
      for (let i = 0; i < beats.length; i++) {
        progress = i / beats.length;
        await act(beats[i]);
        if (done) return;
      }
      progress = 1;
      // The winners celebrate.
      if (Sound) Sound.music(null);
      sfx("b_win", 1);
      fighters.filter(f => f.side === winSide && !f.downed).forEach(f => setPose(f, "victory"));
      moveEl.hidden = true;
      caption.textContent = verdict.verdict || "";
      await showBanner(`<span>${esc(teams[winSide].name)}'s team wins</span>`, 2600);
      finish();
    }

    function finish() {
      if (ended) return;
      ended = true; done = true;
      if (Sound) Sound.music(null);
      opts.onState && opts.onState("ended");
      opts.onEnd && opts.onEnd();
    }

    // Skip: everything resolves at once and the result shows.
    function skip() {
      if (ended) return;
      skipping = true;
      waits.splice(0).forEach(w => w.res());
      tweens.splice(0).forEach(t => { Object.assign(t.obj, t.to); t.res(); });
      finish();
    }
    function play() { if (ended) return; playing = true; toggle.textContent = "❚❚"; toggle.setAttribute("aria-label", "Pause"); opts.onState && opts.onState("playing"); }
    function pause() { if (ended) return; playing = false; toggle.textContent = "▶"; toggle.setAttribute("aria-label", "Play"); opts.onState && opts.onState("paused"); }
    toggle.addEventListener("click", () => (playing ? pause() : play()));
    root.querySelector('[data-act="skip"]').addEventListener("click", skip);

    raf = requestAnimationFrame(frame);
    if (playing) opts.onState && opts.onState("playing");
    else toggle.textContent = "▶";
    run();

    return {
      play, pause, skip,
      destroy() { done = true; ended = true; stopped = true; clearInterval(timer); cancelAnimationFrame(raf); if (Sound) Sound.music(null); container.innerHTML = ""; },
      get playing() { return playing; },
    };
  }

  window.Battle = { player, script, cast, ACTIONS, EFFECTS, OUTCOMES, LOOKS, COLOURS: Object.keys(COLOURS), backdropKind, backdrop };
})();
