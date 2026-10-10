/* Character Draft: 8-bit sprites.

   Every character is drawn in code from a short spec, so 1,000-odd fighters
   cost a few bytes each and all share the same animations. A spec is one
   pipe-separated string (see FIELDS), kept in sprites.js; a character without
   one gets a sensible guess from their name and note.

   Body plans: h humanoid, k blocky (Minecraft), r robot, c chibi (big head,
   small body: Pikachu, Kirby), q four-legged animal, d dragon, b bird,
   s serpent, o blob, g ghost.

   Poses: idle, walk, windup, strike, shoot, cast, block, hurt, ko, victory.
   Sprites face right and are flipped by the stage for the left team. */

(() => {
  "use strict";

  const FIELDS = ["body", "size", "build", "skin", "hair", "main", "second", "accent",
    "hairStyle", "head", "outfit", "weapon", "extras", "style", "element"];
  const SIZE = { s: 0.75, m: 1, l: 1.3, x: 1.7 };
  const OUTLINE = [23, 18, 14];
  const STEEL = "#d9dee4", STEEL_D = "#8e98a3", WOOD = "#7a4a24", GOLD = "#e8b84a", BONE = "#efe4c8", DARK = "#1d1a17";

  /* --- Colour ------------------------------------------------------------ */

  const hexRgb = h => {
    const s = String(h).replace("#", "");
    return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) || 0);
  };
  const toHex = c => "#" + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  // f > 0 lightens toward white, f < 0 darkens toward black.
  const shade = (h, f) => toHex(hexRgb(h).map(v => f < 0 ? v * (1 + f) : v + (255 - v) * f));
  const lum = h => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  /* --- Specs ------------------------------------------------------------- */

  function parse(str) {
    const a = String(str).split("|");
    const s = {};
    FIELDS.forEach((f, i) => { s[f] = (a[i] || "").trim(); });
    s.extras = new Set(s.extras ? s.extras.split(",").map(x => x.trim()).filter(Boolean) : []);
    for (const k of ["skin", "hair", "main", "second", "accent"]) s[k] = /^#?[0-9a-f]{6}$/i.test(s[k]) ? "#" + s[k].replace("#", "") : "#888888";
    s.body = s.body || "h"; s.size = SIZE[s.size] ? s.size : "m"; s.build = s.build || "n";
    s.style = s.style || "fists"; s.element = s.element || "none";
    return s;
  }

  const hash = str => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, h, salt = 0) => arr[(h >>> salt) % arr.length];

  // A guess for anyone without a hand-made spec: body plan, colours and
  // weapon from the world and the words in their note.
  const SKINS = ["f1c9a5", "e0ac69", "c68642", "8d5524", "ffdbac", "a0623b"];
  const HAIRS = ["1a1a1a", "3b2a1a", "6b4423", "b5651d", "e6c35c", "d9d4c7", "8c1c13", "2b2b45"];
  const MAINS = ["8e2b2b", "2b4a8e", "2e6b3a", "5b3a7a", "7a5b2e", "3a3a3a", "a3542c", "2c6e75", "6d6d6d", "b08d2c"];
  function guess(name, note, world) {
    const h = hash(name + "|" + world), t = `${name} ${note}`.toLowerCase();
    const has = re => re.test(t);
    let body = "h", style = "fists", weapon = "none", element = "none", outfit = pick(["tunic", "coat", "uniform", "armour", "suit"], h, 3);
    if (world === "minecraft") body = "k";
    else if (world === "warriors") body = "q";
    else if (has(/dragon|wyvern/)) body = "d";
    else if (has(/\b(cat|kitten|wolf|dog|hound|fox|lion|tiger|bear|horse|direwolf|panther|leopard|deer|boar)\b/)) body = "q";
    else if (has(/\b(bird|eagle|owl|phoenix|hawk|crow|raven|griffin|hippogriff)\b/)) body = "b";
    else if (has(/\b(snake|serpent|basilisk|eel)\b/)) body = "s";
    else if (has(/\b(ghost|spirit|phantom|wraith|dementor)\b/)) body = "g";
    else if (has(/\b(slime|blob|ooze)\b/)) body = "o";
    else if (has(/\b(robot|android|cyborg|mech|machine|droid)\b/)) body = "r";
    else if (world === "pokemon" || world === "smash" && has(/pok[eé]mon/)) body = "c";
    if (has(/\b(bow|archer|arrow|hunter)\b/)) { style = "bow"; weapon = "bow"; }
    else if (has(/\b(gun|sniper|shoot|pistol|rifle|marksman|gunslinger)\b/)) { style = "gun"; weapon = has(/sniper|rifle/) ? "rifle" : "gun"; }
    else if (has(/\b(wizard|witch|mage|sorcer|magic|spell|warlock|sage|shaman|priest)\b/)) { style = "magic"; weapon = has(/witch|wizard/) ? "wand" : "staff"; outfit = "robe"; }
    else if (has(/\b(knight|sword|blade|swordsman|warrior|samurai|ronin)\b/)) { style = "blade"; weapon = has(/samurai|ronin|katana/) ? "katana" : "sword"; }
    else if (has(/\b(axe|viking|barbarian)\b/)) { style = "blade"; weapon = "axe"; }
    else if (has(/\b(spear|lance|trident)\b/)) { style = "blade"; weapon = has(/trident/) ? "trident" : "spear"; }
    else if (has(/\b(hammer)\b/)) { style = "blunt"; weapon = "hammer"; }
    else if (has(/\b(scientist|engineer|inventor|genius|tech|hacker)\b/)) { style = "gadget"; outfit = "labcoat"; }
    else if (has(/\b(psychic|telepath|telekin)\b/)) style = "psychic";
    if (has(/fire|flame|burn|lava|blaze|ember/)) element = "fire";
    else if (has(/ice|frost|snow|cold|freez/)) element = "ice";
    else if (has(/lightning|thunder|electric|storm|spark|volt/)) element = "lightning";
    else if (has(/water|sea|ocean|tide|aqua/)) element = "water";
    else if (has(/poison|venom|toxic/)) element = "poison";
    else if (has(/shadow|dark|death|necro|undead/)) element = "dark";
    else if (has(/light|holy|sun|radiant/)) element = "light";
    if (style === "fists" && element !== "none" && body === "h") style = "magic";
    if (body !== "h" && body !== "k" && body !== "r") {
      style = body === "d" ? "breath" : body === "q" ? "claws" : body === "s" ? "bite" : style === "fists" ? "magic" : style;
      outfit = "bare"; weapon = body === "q" || body === "d" || body === "s" ? "none" : weapon;
    }
    const skin = body === "h" || body === "k" ? pick(SKINS, h, 1) : pick(MAINS.concat(["c9a227", "d97b29", "6a8caf", "9c9c9c"]), h, 1);
    return [body, body === "d" ? "x" : "m", pick(["n", "n", "t", "w"], h, 5), skin, pick(HAIRS, h, 7), pick(MAINS, h, 9), pick(MAINS, h, 11),
      pick(["e8b84a", "c0392b", "d9d4c7", "3f7fbf", "2e8b57"], h, 13), pick(["short", "long", "short", "spiky", "ponytail", "bald", "slick"], h, 15),
      "none", outfit, weapon, "", style, element].join("|");
  }

  function specFor(c) {
    const data = window.CHARACTER_SPRITES || {};
    const raw = (data[c.world] || {})[c.name];
    return parse(raw || guess(c.name, c.note || "", c.world || ""));
  }

  /* --- Drawing ----------------------------------------------------------- */

  const R = Math.round;

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  // A pixel pen on a small canvas: everything snaps to whole pixels.
  function pen(cv) {
    const ctx = cv.getContext("2d");
    const rect = (x, y, w, h, c) => { if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(R(x), R(y), R(w), R(h)); };
    const px = (x, y, c) => rect(x, y, 1, 1, c);
    const line = (x0, y0, x1, y1, t, c) => {
      x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, o = Math.floor((t - 1) / 2);
      for (let n = 0; n < 400; n++) {
        rect(x0 - o, y0 - o, t, t, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    };
    const disc = (cx, cy, r, c) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c);
    };
    const ellipse = (cx, cy, rx, ry, c) => {
      for (let y = -ry; y <= ry; y++) {
        const w = R(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.4) * (ry + 0.4)))));
        rect(cx - w, cy + y, w * 2 + 1, 1, c);
      }
    };
    const tri = (x0, y0, x1, y1, x2, y2, c) => {   // filled, by scanlines
      const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
      for (let y = R(minY); y <= R(maxY); y++) {
        const xs = [];
        [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]].forEach(([ax, ay, bx, by]) => {
          if ((y >= Math.min(ay, by)) && (y <= Math.max(ay, by)) && ay !== by) xs.push(ax + (y - ay) * (bx - ax) / (by - ay));
        });
        if (xs.length >= 2) { const a = Math.min(...xs), b = Math.max(...xs); rect(a, y, b - a + 1, 1, c); }
      }
    };
    return { ctx, rect, px, line, disc, ellipse, tri };
  }

  // Unit vector, scaled.
  const dir = (x, y, l = 1) => { const m = Math.hypot(x, y) || 1; return [x / m * l, y / m * l]; };

  /* Poses: arm angles, a bob, a stride and a lean for each frame. */
  function posePars(pose, f) {
    switch (pose) {
      case "walk": return { arm: "swing", f, stride: [-2, 0, 2, 0][f % 4], bob: f % 2 };
      case "windup": return { arm: "up", lean: -1 };
      case "strike": return { arm: "forward", lean: 2, stride: 2 };
      case "shoot": return { arm: "aim", lean: 0 };
      case "cast": return { arm: "cast", bob: f % 2 ? -1 : 0 };
      case "block": return { arm: "block", lean: -1 };
      case "hurt": return { arm: "back", lean: -2 };
      case "victory": return { arm: "victory", bob: f % 2 ? -2 : 0 };
      default: return { arm: "rest", bob: f % 2 };
    }
  }
  const ARMS = {
    rest: [[0.25, 1], [-0.2, 1]], up: [[-0.35, -1], [-0.3, 1]], forward: [[1, 0.05], [-0.3, 0.9]],
    aim: [[1, 0], [0.8, 0.2]], cast: [[0.85, -0.5], [0.8, -0.3]], block: [[0.55, -0.85], [0.3, 0.6]],
    back: [[-0.7, 0.5], [-0.7, 0.4]], victory: [[0.25, -1], [-0.25, -1]],
  };
  function armDirs(p) {
    if (p.arm === "swing") { const s = [0.45, 0, -0.45, 0][p.f % 4]; return [[s, 1], [-s, 1]]; }
    return ARMS[p.arm] || ARMS.rest;
  }

  /* Weapons, drawn from the hand along a direction. */
  function weapon(g, type, hx, hy, d, u, s) {
    const [dx, dy] = dir(d[0], d[1]);
    const at = l => [hx + dx * l, hy + dy * l];
    const perp = [-dy, dx];
    const T = Math.max(1, R(u * 1.4));
    const glow = s.accent;
    switch (type) {
      case "sword": case "katana": case "greatsword": case "dagger": case "lightsaber": {
        const L = R(u * ({ sword: 9, katana: 10, greatsword: 13, dagger: 4, lightsaber: 11 })[type]);
        const t = type === "greatsword" ? T + 1 : type === "katana" || type === "dagger" ? 1 : T;
        const [ex, ey] = at(L);
        g.line(hx - dx * 2, hy - dy * 2, hx, hy, 2, type === "lightsaber" ? "#9aa0a6" : WOOD);
        if (type === "lightsaber") { g.line(hx, hy, ex, ey, t + 1, glow); g.line(hx, hy, ex, ey, 1, "#ffffff"); break; }
        if (type !== "katana" && type !== "dagger") g.line(hx + perp[0] * 2, hy + perp[1] * 2, hx - perp[0] * 2, hy - perp[1] * 2, 1, GOLD);
        g.line(hx + dx, hy + dy, ex, ey, t, STEEL);
        g.line(hx + dx * 2, hy + dy * 2, ex - dx, ey - dy, 1, "#ffffff");
        break;
      }
      case "axe": case "hammer": case "mace": case "club": case "bat": case "flail": {
        const L = R(u * (type === "hammer" ? 10 : 9));
        const [ex, ey] = at(L);
        g.line(hx - dx * 2, hy - dy * 2, ex, ey, type === "bat" || type === "club" ? T + 1 : 1, type === "bat" ? "#c9a36b" : WOOD);
        if (type === "axe") { g.tri(ex, ey, ex - dx * 4 + perp[0] * 4, ey - dy * 4 + perp[1] * 4, ex + perp[0] * 4, ey + perp[1] * 4, STEEL); }
        else if (type === "hammer") { g.rect(ex - R(2 * u), ey - R(2 * u), R(5 * u), R(4 * u), type === "hammer" && s.accent ? shade(STEEL, -0.1) : STEEL); g.rect(ex - R(2 * u), ey - R(2 * u), R(5 * u), 1, "#ffffff"); }
        else if (type === "mace" || type === "flail") g.disc(ex, ey, R(2 * u), STEEL_D);
        else if (type === "club") g.disc(ex, ey, R(1.5 * u), WOOD);
        break;
      }
      case "spear": case "trident": case "staff": case "scythe": {
        const L = R(u * 14);
        const [ex, ey] = at(L * 0.75), [bx, by] = at(-L * 0.25);
        g.line(bx, by, ex, ey, 1, WOOD);
        if (type === "spear") g.tri(ex, ey, ex + dx * 4 + perp[0] * 2, ey + dy * 4 + perp[1] * 2, ex - perp[0] * 2 + dx * 4, ey - perp[1] * 2 + dy * 4, STEEL), g.line(ex, ey, ex + dx * 5, ey + dy * 5, 1, STEEL);
        if (type === "trident") { for (const k of [-2, 0, 2]) g.line(ex + perp[0] * k, ey + perp[1] * k, ex + perp[0] * k + dx * 4, ey + perp[1] * k + dy * 4, 1, GOLD); g.line(ex + perp[0] * 2, ey + perp[1] * 2, ex - perp[0] * 2, ey - perp[1] * 2, 1, GOLD); }
        if (type === "staff") { g.disc(ex + dx * 2, ey + dy * 2, Math.max(1, R(1.6 * u)), glow); g.px(ex + dx * 2, ey + dy * 2 - 1, "#ffffff"); }
        if (type === "scythe") g.line(ex, ey, ex - dx * 2 + perp[0] * 6, ey - dy * 2 + perp[1] * 6, 2, STEEL);
        break;
      }
      case "wand": { const [ex, ey] = at(R(5 * u)); g.line(hx, hy, ex, ey, 1, WOOD); g.px(ex + dx, ey + dy, glow); g.px(ex + dx * 2, ey + dy * 2, "#ffffff"); break; }
      case "bow": case "crossbow": {
        const h = R(6 * u);
        const cx = hx + dx * 2, cy = hy + dy * 2;
        if (type === "crossbow") { g.line(hx, hy, hx + dx * 6, hy + dy * 6, 2, WOOD); g.line(hx + dx * 5 + perp[0] * 3, hy + dy * 5 + perp[1] * 3, hx + dx * 5 - perp[0] * 3, hy + dy * 5 - perp[1] * 3, 1, STEEL_D); break; }
        for (let i = -h; i <= h; i++) { const bow = (1 - (i * i) / (h * h)) * 2.5; g.px(cx + perp[0] * i + dx * bow, cy + perp[1] * i + dy * bow, WOOD); }
        g.line(cx + perp[0] * h, cy + perp[1] * h, cx - perp[0] * h, cy - perp[1] * h, 1, "#e9e2d0");
        break;
      }
      case "gun": case "rifle": case "cannon": case "blaster": {
        const L = R(u * ({ gun: 4, blaster: 5, rifle: 9, cannon: 8 })[type]);
        g.line(hx, hy, hx + dx * L, hy + dy * L, type === "cannon" ? T + 2 : type === "rifle" ? 2 : 2, type === "blaster" ? "#cfd6dd" : "#3b3f45");
        if (type === "rifle") g.line(hx - dx * 3, hy - dy * 3 + 1, hx, hy + 1, 2, WOOD);
        if (type === "blaster" || type === "cannon") g.px(hx + dx * L, hy + dy * L, glow);
        break;
      }
      case "shield": { g.disc(hx + dx * 2, hy + dy * 2, R(3.5 * u), s.accent); g.disc(hx + dx * 2, hy + dy * 2, R(2.2 * u), s.main); g.disc(hx + dx * 2, hy + dy * 2, Math.max(1, R(1 * u)), "#ffffff"); break; }
      case "whip": { let x = hx, y = hy; for (let i = 1; i <= 12; i++) { const nx = hx + dx * i * u, ny = hy + dy * i * u + Math.sin(i * 0.9) * 2; g.line(x, y, nx, ny, 1, s.second === s.main ? WOOD : shade(s.second, -0.2)); x = nx; y = ny; } break; }
      case "claws": { for (const k of [-1, 0, 1]) g.line(hx + perp[0] * k, hy + perp[1] * k, hx + perp[0] * k + dx * 4 * u, hy + perp[1] * k + dy * 4 * u, 1, STEEL); break; }
      case "book": { g.rect(hx - 1, hy - 2, R(4 * u), R(3 * u), s.accent); g.rect(hx, hy - 2, R(3 * u), 1, "#ffffff"); break; }
      case "guitar": { const [ex, ey] = at(R(9 * u)); g.line(hx, hy, ex, ey, 1, WOOD); g.disc(hx - dx * 2, hy - dy * 2, R(2.5 * u), s.accent); break; }
      case "orb": { g.disc(hx + dx * 2, hy + dy * 2 - 1, Math.max(1, R(1.8 * u)), glow); g.px(hx + dx * 2, hy + dy * 2 - 2, "#ffffff"); break; }
      default: break;
    }
  }

  /* Things that sit on top of any head: ears, horns, crowns and so on. */
  function topper(g, s, hx, hy, w, u) {
    const x = s.extras, mid = hx + R(w / 2);
    if (x.has("ears")) { g.tri(hx, hy + 1, hx + 1, hy - R(3 * u), hx + R(3 * u), hy + 1, s.hair); g.tri(hx + w - R(3 * u), hy + 1, hx + w - 1, hy - R(3 * u), hx + w, hy + 1, s.hair); }
    if (x.has("ears_long")) { for (const ex of [hx + 1, hx + w - 2]) { g.rect(ex, hy - R(6 * u), Math.max(1, R(1.6 * u)), R(6 * u), s.skin); g.rect(ex, hy - R(6 * u), Math.max(1, R(1.6 * u)), R(2 * u), DARK); } }
    if (x.has("ears_round")) { g.disc(hx + 1, hy, Math.max(1, R(1.5 * u)), s.hair); g.disc(hx + w - 1, hy, Math.max(1, R(1.5 * u)), s.hair); }
    if (x.has("horns")) { g.line(hx + 1, hy, hx - 1, hy - R(3 * u), 1, BONE); g.line(hx + w - 2, hy, hx + w, hy - R(3 * u), 1, BONE); }
    if (x.has("antennae")) { g.line(mid - 1, hy, mid - 2, hy - R(4 * u), 1, DARK); g.line(mid + 1, hy, mid + 2, hy - R(4 * u), 1, DARK); g.px(mid - 2, hy - R(4 * u), s.accent); g.px(mid + 2, hy - R(4 * u), s.accent); }
    if (x.has("halo")) g.rect(mid - R(2 * u), hy - R(3 * u), R(5 * u), 1, GOLD);
    if (x.has("flame_head")) for (let i = 0; i < w; i += 2) g.rect(hx + i, hy - 1 - ((i * 7) % 3), 2, 2 + ((i * 7) % 3), i % 4 ? "#ffcc33" : "#ff6a1a");
  }

  /* Humanoids, blocky folk, robots and chibis share one rig. */
  function humanoid(g, s, pose, f, u) {
    const blocky = s.body === "k", robot = s.body === "r", chibi = s.body === "c";
    const p = posePars(pose, f), x = s.extras;
    const cx = g.cx, base = g.base;
    let headH, headW, torsoH, torsoW, legH, aw, al;
    if (chibi) { headH = R(10 * u); headW = R(11 * u); torsoH = R(5 * u); torsoW = R(8 * u); legH = R(3 * u); aw = Math.max(2, R(2 * u)); al = R(4 * u); }
    else if (blocky) { headH = R(8 * u); headW = R(8 * u); torsoH = R(9 * u); torsoW = R(8 * u); legH = R(8 * u); aw = R(3 * u); al = R(8 * u); }
    else {
      headH = R(8 * u); headW = R(8 * u); torsoH = R(8 * u); legH = R(7 * u); aw = Math.max(2, R(2 * u)); al = R(6 * u);
      torsoW = R(({ t: 6, n: 8, w: 10 })[s.build] * u) || R(8 * u);
    }
    if (x.has("noarms")) al = 0;
    const lean = (p.lean || 0) * (u >= 1 ? 1 : 0.5), bob = p.bob || 0, stride = (p.stride || 0) * u;
    const bare = s.outfit === "bare", jump = s.outfit === "jumpsuit";
    const top = bare ? s.skin : s.main;
    const pants = bare ? s.skin : jump ? s.main : s.second;
    const sleeve = bare || s.outfit === "vest" ? s.skin : s.main;
    const hand = x.has("gloves") ? s.second : robot ? shade(s.main, -0.2) : s.skin;
    const hipY = base - legH;
    const tTop = hipY - torsoH + bob;
    const tLeft = cx - Math.floor(torsoW / 2) + lean;
    const legW = Math.max(2, Math.floor(torsoW / 2) - (blocky ? 0 : 0));

    // Behind the body: aura, cape, wings, tail.
    if (x.has("cape")) {
      const flap = f % 2;
      g.tri(tLeft + 1, tTop, tLeft - R(4 * u) - flap, base - 1, tLeft + torsoW - 1, base - 2, s.accent);
      g.rect(tLeft, tTop, torsoW, 2, shade(s.accent, -0.2));
    }
    if (x.has("wings") || x.has("batwings")) {
      const up = f % 2 ? -2 : 0, wc = x.has("batwings") ? s.accent : x.has("wings_dark") ? DARK : "#f4f1ea";
      g.tri(tLeft + 2, tTop + 2, tLeft - R(9 * u), tTop - R(7 * u) + up, tLeft - R(5 * u), tTop + R(6 * u), wc);
      g.tri(tLeft + 3, tTop + 1, tLeft - R(4 * u), tTop - R(9 * u) + up, tLeft - R(1 * u), tTop + R(4 * u), shade(wc, -0.15));
    }
    if (x.has("tail") || x.has("tail_bolt") || x.has("tail_flame")) {
      const tx = tLeft, ty = hipY - R(2 * u) + bob;
      if (x.has("tail_bolt")) { g.line(tx, ty, tx - R(3 * u), ty - R(3 * u), 2, s.skin); g.line(tx - R(3 * u), ty - R(3 * u), tx - R(1 * u), ty - R(6 * u), 2, s.skin); g.line(tx - R(1 * u), ty - R(6 * u), tx - R(5 * u), ty - R(10 * u), 3, s.skin); g.px(tx, ty, s.hair); }
      else {
        g.line(tx, ty, tx - R(3 * u), ty + R(1 * u), Math.max(1, R(1.5 * u)), s.hair);
        g.line(tx - R(3 * u), ty + R(1 * u), tx - R(5 * u), ty - R(3 * u) - (f % 2), Math.max(1, R(1.5 * u)), s.hair);
        if (x.has("tail_flame")) { g.disc(tx - R(5 * u), ty - R(4 * u) - (f % 2), Math.max(1, R(1.4 * u)), "#ff7a1a"); g.px(tx - R(5 * u), ty - R(5 * u) - (f % 2), "#ffe14d"); }
      }
    }
    if (x.has("shell")) g.ellipse(tLeft, tTop + R(torsoH / 2), R(3 * u), R(torsoH / 2) + 1, s.hair);

    // The back arm.
    const [fa, ba] = armDirs(p);
    const shY = tTop + 1;
    const bsx = tLeft + 1, fsx = tLeft + torsoW - 2;
    if (al) {
      const [bx, by] = dir(ba[0], ba[1], al);
      g.line(bsx, shY, bsx + bx, shY + by, aw, shade(sleeve, -0.25));
      g.rect(bsx + bx - Math.floor(aw / 2), shY + by - Math.floor(aw / 2), aw, aw, shade(hand, -0.2));
      if (x.has("shield")) weapon(g, "shield", bsx + bx, shY + by, [1, 0], u, s);
    }

    // Legs: back then front, with boots.
    const boot = bare ? shade(s.skin, -0.25) : x.has("boots_light") ? shade(s.second, 0.35) : shade(s.second, -0.45);
    const bootH = Math.max(1, R(2 * u));
    const lx = cx - Math.floor(torsoW / 2);
    if (legH > 0) {
      g.rect(lx - stride, hipY, legW, legH, shade(pants, -0.25)); if (!bare) g.rect(lx - stride, base - bootH, legW, bootH, shade(boot, -0.2));
      g.rect(lx + torsoW - legW + stride, hipY, legW, legH, pants); if (!bare) g.rect(lx + torsoW - legW + stride, base - bootH, legW, bootH, boot);
    }

    // Body and clothes.
    g.rect(tLeft, tTop, torsoW, torsoH, top);
    switch (s.outfit) {
      case "armour": g.rect(tLeft - 1, tTop, 2, 2, s.accent); g.rect(tLeft + torsoW - 1, tTop, 2, 2, s.accent); g.rect(tLeft + 1, tTop + 1, 1, torsoH - 2, shade(s.main, 0.35)); g.rect(tLeft, tTop + torsoH - 1, torsoW, 1, s.second); break;
      case "robe": g.rect(tLeft - 1, hipY + bob, torsoW + 2, legH - 1, s.main); g.rect(tLeft - 1, base - 2 + bob, torsoW + 2, 1, s.accent); g.rect(tLeft + Math.floor(torsoW / 2), tTop, 1, torsoH, s.accent); break;
      case "dress": g.rect(tLeft - 1, hipY + bob, torsoW + 2, R(legH * 0.65), s.main); g.rect(tLeft - 1, hipY + bob + R(legH * 0.65) - 1, torsoW + 2, 1, s.accent); break;
      case "coat": case "labcoat": g.rect(tLeft, hipY + bob, torsoW, R(legH * 0.55), s.main); g.rect(tLeft + Math.floor(torsoW / 2), tTop + 1, 1, torsoH + R(legH * 0.55) - 1, shade(s.main, -0.3)); break;
      case "suit": g.rect(tLeft + Math.floor(torsoW / 2) - 1, tTop, 2, torsoH - 2, "#f4f1ea"); g.rect(tLeft + Math.floor(torsoW / 2), tTop + 1, 1, torsoH - 3, s.accent); break;
      case "bare": if (x.has("belt")) g.rect(tLeft, tTop + torsoH - 1, torsoW, 1, s.second); if (chibi || !x.has("belt")) g.rect(tLeft + 1, tTop + R(torsoH / 2), torsoW - 2, Math.max(1, R(torsoH / 3)), shade(s.skin, 0.25)); break;
      case "vest": g.rect(tLeft, tTop, 2, torsoH, s.main); g.rect(tLeft + torsoW - 2, tTop, 2, torsoH, s.main); break;
      case "fur": for (let i = 0; i < torsoW; i += 2) g.px(tLeft + i, tTop + (i % 3), shade(s.main, 0.3)); g.rect(tLeft, tTop + torsoH - 1, torsoW, 1, s.second); break;
      case "jersey": g.rect(tLeft, tTop, torsoW, 1, s.accent); g.rect(tLeft + 1, tTop + 2, torsoW - 2, 2, shade(s.main, 0.4)); break;
      default: g.rect(tLeft, tTop + torsoH - 1, torsoW, 1, s.outfit === "uniform" ? s.accent : s.second); if (s.outfit === "uniform") g.rect(tLeft + 1, tTop + 1, 1, 1, GOLD);
    }
    if (x.has("stripes")) for (let i = 1; i < torsoH; i += 2) g.rect(tLeft, tTop + i, torsoW, 1, shade(top, -0.35));
    if (x.has("emblem")) g.rect(tLeft + Math.floor(torsoW / 2) - 1, tTop + 2, 2, 2, s.accent);
    if (x.has("scarf")) { g.rect(tLeft, tTop, torsoW, 2, s.accent); g.line(tLeft, tTop + 1, tLeft - R(3 * u), tTop + R(3 * u) + (f % 2), 1, s.accent); }
    if (x.has("spikes")) for (let i = 0; i < 3; i++) g.tri(tLeft - 1, tTop + 1 + i * 3, tLeft - R(3 * u), tTop + i * 3, tLeft, tTop + 3 + i * 3, BONE);

    // The head.
    const hx = cx - Math.floor(headW / 2) + lean + (chibi || blocky ? 0 : 1);
    const hy = tTop - headH + (chibi ? 1 : 0);
    if (s.hairStyle === "afro" || x.has("mane")) g.disc(hx + R(headW / 2), hy + R(headH / 2), R(headW * 0.8), s.hair);
    if (s.hairStyle === "long" || s.hairStyle === "braids") g.rect(hx - 1, hy + 1, R(3 * u), headH + R(4 * u), s.hair);
    if (s.hairStyle === "ponytail") g.line(hx - 1, hy + 2, hx - R(3 * u), hy + R(6 * u), 2, s.hair);
    if (robot) { g.rect(hx, hy, headW, headH, shade(s.main, 0.15)); g.rect(hx + 1, hy + R(headH * 0.35), headW - 1, Math.max(1, R(1.6 * u)), s.accent); }
    else {
      g.rect(hx, hy, headW, headH, s.skin);
      if (chibi && headW > 6) { g.rect(hx, hy, 1, 1, "rgba(0,0,0,0)"); }
    }
    const ey = hy + R(headH * (chibi ? 0.45 : 0.5));
    const e1 = hx + headW - 2, e2 = hx + headW - (chibi ? 5 : 4);
    const eye = x.has("redeyes") || x.has("glow_eyes") ? s.accent : DARK;
    const face = () => {
      if (robot) return;
      if (chibi) { g.rect(e1 - 1, ey, 2, 2, eye); g.rect(e2 - 1, ey, 2, 2, eye); g.px(e1 - 1, ey, "#ffffff"); g.px(e2 - 1, ey, "#ffffff"); }
      else { const eh = u >= 1 ? 2 : 1; g.rect(e1, ey - 1, 1, eh, eye); if (headW >= 6) g.rect(e2, ey - 1, 1, eh, eye); }
      if (x.has("cheeks")) { g.px(e1 + 1, ey + 2, "#e2433a"); g.px(e2 - 2, ey + 2, "#e2433a"); }
      if (x.has("beard")) g.rect(hx + 2, ey + 2, headW - 2, headH - (ey - hy) - 2 + 1, s.hair);
      if (x.has("moustache")) g.rect(e2, ey + 2, 3, 1, s.hair);
      if (x.has("glasses")) { g.rect(e2 - 1, ey - 1, 4, 1, DARK); g.px(e1, ey, "#bfe3ff"); }
      if (x.has("eyepatch")) g.rect(e1 - 1, ey - 1, 2, 2, DARK);
      if (x.has("grin")) { g.rect(e2 - 1, ey + 2, 4, 1, "#ffffff"); }
      if (x.has("fangs")) { g.px(e2, ey + 3, "#ffffff"); g.px(e1, ey + 3, "#ffffff"); }
      if (x.has("face_creeper")) { g.rect(hx + 1, hy + 2, 2, 2, DARK); g.rect(hx + headW - 3, hy + 2, 2, 2, DARK); g.rect(hx + 3, hy + 4, 2, 3, DARK); g.rect(hx + 2, hy + 5, 4, 2, DARK); }
    };
    // Hair on top.
    const hairTop = () => {
      switch (s.hairStyle) {
        case "short": case "ponytail": case "long": case "braids": case "slick": g.rect(hx, hy, headW, 2, s.hair); g.rect(hx, hy, 2, R(headH * 0.55), s.hair); break;
        case "spiky": g.rect(hx, hy, headW, 2, s.hair); for (let i = 0; i < headW; i += 2) g.tri(hx + i - 1, hy + 1, hx + i, hy - R(3 * u), hx + i + 2, hy + 1, s.hair); g.rect(hx, hy, 2, R(headH * 0.6), s.hair); break;
        case "bun": g.rect(hx, hy, headW, 2, s.hair); g.disc(hx + 1, hy - 1, Math.max(1, R(1.5 * u)), s.hair); break;
        case "mohawk": g.rect(hx + 1, hy - R(2 * u), headW - 3, R(2 * u) + 1, s.hair); break;
        case "buzz": g.rect(hx, hy, headW, 1, s.hair); break;
        case "afro": g.rect(hx, hy, headW, 2, s.hair); break;
        case "messy": g.rect(hx - 1, hy - 1, headW + 1, 3, s.hair); g.px(hx + 2, hy - 2, s.hair); g.px(hx + 5, hy - 2, s.hair); g.rect(hx - 1, hy, 2, R(headH * 0.6), s.hair); break;
        default: break;
      }
    };
    switch (s.head) {
      case "helmet": hairTop(); g.rect(hx - 1, hy - 1, headW + 2, R(headH * 0.45), s.accent === s.main ? STEEL : shade(STEEL, -0.05)); g.rect(hx - 1, hy - 1, 2, headH - 1, STEEL); face(); break;
      case "helm": g.rect(hx - 1, hy - 1, headW + 2, headH + 1, STEEL); g.rect(hx + 2, ey, headW - 2, 1, DARK); g.px(hx + R(headW / 2), hy - 2, s.accent); break;
      case "hood": g.rect(hx - 1, hy - 1, headW + 2, headH, s.main); g.rect(hx + 2, hy + 2, headW - 2, headH - 3, shade(s.skin, -0.35)); g.px(e1, ey, x.has("glow_eyes") ? s.accent : DARK); break;
      case "fullmask": g.rect(hx, hy, headW, headH, s.main); g.rect(e2 - 1, ey - 1, 2, 2, "#ffffff"); g.rect(e1 - 1, ey - 1, 2, 2, "#ffffff"); if (x.has("webbing")) { g.px(hx + 2, hy + 2, DARK); g.px(hx + 3, hy + headH - 2, DARK); } break;
      case "cowl": g.rect(hx, hy, headW, R(headH * 0.6), s.main); g.tri(hx, hy, hx + 1, hy - R(3 * u), hx + 2, hy, s.main); g.tri(hx + headW - 2, hy, hx + headW - 1, hy - R(3 * u), hx + headW, hy, s.main); g.px(e1, ey - 1, "#ffffff"); face(); break;
      case "mask": hairTop(); face(); g.rect(hx + 2, ey - 1, headW - 2, 2, s.accent); g.px(e1, ey - 1, "#ffffff"); break;
      case "facemask": hairTop(); face(); g.rect(hx + 2, ey + 1, headW - 2, headH - (ey - hy) - 1, s.accent); break;
      case "hat": hairTop(); face(); g.rect(hx - 2, hy, headW + 4, 1, s.second); g.rect(hx, hy - R(3 * u), headW, R(3 * u), s.second); break;
      case "tophat": hairTop(); face(); g.rect(hx - 1, hy, headW + 2, 1, DARK); g.rect(hx, hy - R(5 * u), headW, R(5 * u), DARK); g.rect(hx, hy - 2, headW, 1, s.accent); break;
      case "wizard": hairTop(); face(); g.rect(hx - 2, hy, headW + 4, 1, s.main); g.tri(hx, hy, hx + R(headW / 2) - 2, hy - R(9 * u), hx + headW, hy, s.main); break;
      case "cap": hairTop(); face(); g.rect(hx, hy - 1, headW, 2, s.accent); g.rect(hx + headW - 1, hy, R(3 * u), 1, s.accent); break;
      case "crown": hairTop(); face(); g.rect(hx, hy - 1, headW, 2, GOLD); for (let i = 0; i < headW; i += 2) g.px(hx + i, hy - 2, GOLD); break;
      case "headband": hairTop(); face(); g.rect(hx, hy + 2, headW, 1, s.accent); g.px(hx - 1, hy + 3, s.accent); break;
      case "bandana": hairTop(); face(); g.rect(hx, hy, headW, 2, s.accent); g.px(hx - 1, hy + 2, s.accent); break;
      case "visor": hairTop(); face(); g.rect(hx + 1, ey - 1, headW, 2, s.accent); break;
      default: hairTop(); face();
    }
    topper(g, s, hx, hy, headW, u);

    // The front arm, with the weapon under the hand.
    if (al) {
      const [fx, fy] = dir(fa[0], fa[1], al);
      const hxp = fsx + fx, hyp = shY + fy;
      const wd = p.arm === "rest" || p.arm === "swing" ? [0.8, 0.6] : p.arm === "up" ? [-0.35, -1] : p.arm === "forward" || p.arm === "aim" ? [1, -0.05]
        : p.arm === "cast" ? [0.6, -0.8] : p.arm === "block" ? [0.15, -1] : p.arm === "victory" ? [0.15, -1] : [-0.6, -0.5];
      const ranged = ["bow", "crossbow", "gun", "rifle", "blaster", "cannon"].includes(s.weapon);
      const upright = ["staff", "spear", "trident", "scythe"].includes(s.weapon) && (p.arm === "rest" || p.arm === "swing");
      g.line(fsx, shY, hxp, hyp, aw, sleeve);
      weapon(g, s.weapon, hxp, hyp, ranged && (p.arm === "rest" || p.arm === "swing") ? [0.7, 0.7] : upright ? [0.1, -1] : wd, u, s);
      g.rect(hxp - Math.floor(aw / 2), hyp - Math.floor(aw / 2), aw, aw, hand);
    }
  }

  /* Four-legged animals, and dragons on the same frame with wings and a neck. */
  function quadruped(g, s, pose, f, u, dragon) {
    const p = posePars(pose, f), x = s.extras;
    const cx = g.cx, base = g.base;
    const bodyL = R((dragon ? 16 : 14) * u), bodyH = R((dragon ? 7 : 5) * u), legH = R((dragon ? 6 : 5) * u);
    const headW = R((dragon ? 7 : 5) * u), headH = R((dragon ? 5 : 5) * u);
    const lunge = pose === "strike" ? R(3 * u) : pose === "hurt" ? -R(2 * u) : 0;
    const bob = p.bob || 0, walk = pose === "walk" ? [-1, 0, 1, 0][f % 4] * u : 0;
    const bx = cx - Math.floor(bodyL / 2) + lunge, by = base - legH - bodyH + bob;
    const c = s.skin, mark = s.hair, legW = Math.max(2, R(2 * u));
    // Tail.
    const tl = R((dragon ? 10 : 6) * u);
    g.line(bx, by + 1, bx - tl * 0.6, by - tl * 0.6 + (f % 2), Math.max(1, R((dragon ? 2.5 : 1.5) * u)), dragon ? c : mark === c ? shade(c, -0.15) : mark);
    if (dragon) g.tri(bx - tl * 0.6 - 2, by - tl * 0.6 - 2, bx - tl * 0.6 + 2, by - tl * 0.6 - 3, bx - tl * 0.6, by - tl * 0.6 + 2, s.accent);
    // Far legs, wings behind.
    const legsX = [bx + 1, bx + bodyL - legW - 2];
    legsX.forEach((lx, i) => g.rect(lx + (i ? -walk : walk) + 1, by + bodyH, legW, legH - bob, shade(c, -0.3)));
    if (dragon || x.has("wings") || x.has("batwings")) {
      const up = f % 2 ? -R(3 * u) : 0, wc = dragon || x.has("batwings") ? s.accent : "#f4f1ea";
      g.tri(bx + R(bodyL * 0.35), by + 1, bx + R(bodyL * 0.1), by - R(13 * u) + up, bx + R(bodyL * 0.75), by + 1, shade(wc, -0.2));
      g.tri(bx + R(bodyL * 0.45), by + 1, bx + R(bodyL * 0.4), by - R(11 * u) + up, bx + R(bodyL * 0.95), by - R(2 * u), wc);
      if (dragon) g.line(bx + R(bodyL * 0.45), by, bx + R(bodyL * 0.4), by - R(11 * u) + up, 1, mark);
    }
    // Body.
    g.ellipse(bx + R(bodyL / 2), by + R(bodyH / 2), R(bodyL / 2), R(bodyH / 2), c);
    g.rect(bx + 2, by + bodyH - 1, bodyL - 4, 1, mark === c ? shade(c, 0.25) : mark);
    if (x.has("stripes")) for (let i = 2; i < bodyL - 2; i += 3) g.rect(bx + i, by, 1, bodyH - 1, shade(c, -0.4));
    if (x.has("spots")) for (let i = 2; i < bodyL - 2; i += 4) g.px(bx + i, by + 2 + (i % 2), shade(c, -0.4));
    if (x.has("spikes") || dragon) for (let i = 2; i < bodyL - 3; i += 3) g.tri(bx + i, by + 1, bx + i + 1, by - R(2 * u), bx + i + 2, by + 1, dragon ? s.accent : BONE);
    // Near legs.
    legsX.forEach((lx, i) => g.rect(lx + (i ? walk : -walk), by + bodyH, legW, legH - bob, c));
    // Neck and head.
    const lift = pose === "strike" ? R(1 * u) : pose === "windup" || pose === "cast" ? -R(2 * u) : 0;
    let hx = bx + bodyL - R(2 * u), hy = by - headH + R(2 * u) + lift;
    if (dragon) {
      const nx = bx + bodyL + R(3 * u), ny = by - R(6 * u) + lift;
      g.line(bx + bodyL - R(3 * u), by + 2, nx, ny, R(3 * u), c);
      hx = nx - 1; hy = ny - R(headH / 2);
    }
    if (x.has("mane")) g.disc(hx + 1, hy + R(headH / 2), R(headH * 0.85), mark);
    g.rect(hx, hy, headW, headH, c);
    const snout = R((dragon ? 4 : 2) * u);
    g.rect(hx + headW, hy + headH - R(2.5 * u), snout, R(2.5 * u), x.has("muzzle_light") ? shade(c, 0.35) : c);
    g.px(hx + headW + snout - 1, hy + headH - R(2.5 * u), DARK);
    g.px(hx + headW - 2, hy + R(headH * 0.35), x.has("redeyes") || x.has("glow_eyes") ? s.accent : DARK);
    if (pose === "strike" && (s.style === "bite" || s.style === "breath")) g.rect(hx + headW, hy + headH - 1, snout, 1, "#7a1f1f");
    if (dragon || x.has("horns")) { g.line(hx + 1, hy, hx - R(2 * u), hy - R(3 * u), 1, BONE); g.line(hx + 3, hy, hx + 1, hy - R(4 * u), 1, BONE); }
    else if (x.has("ears_floppy")) g.rect(hx, hy + 1, 2, R(3 * u), shade(c, -0.25));
    else if (x.has("ears_round")) g.disc(hx + 1, hy, Math.max(1, R(1.2 * u)), c);
    else if (!x.has("no_ears")) { g.tri(hx, hy + 1, hx + 1, hy - R(3 * u), hx + 3, hy + 1, c); g.px(hx + 1, hy - 1, mark === c ? shade(c, 0.3) : mark); }
    if (x.has("horn")) g.line(hx + headW - 1, hy, hx + headW + 2, hy - R(4 * u), 1, GOLD);
    if (x.has("collar")) g.rect(hx - 1, hy + headH, 3, 1, s.accent);
    topper(g, { ...s, extras: new Set([...x].filter(e => ["halo", "crown_q", "flame_head"].includes(e))) }, hx, hy, headW, u);
    if (x.has("crown_q")) { g.rect(hx, hy - 1, headW, 1, GOLD); g.px(hx, hy - 2, GOLD); g.px(hx + headW - 1, hy - 2, GOLD); }
    // An animal with a weapon carries it in its jaws.
    if (s.weapon && s.weapon !== "none" && s.weapon !== "claws") {
      const d = pose === "windup" ? [-0.3, -1] : pose === "strike" ? [1, 0.1] : [0.9, -0.5];
      weapon(g, s.weapon, hx + headW + R(snout / 2), hy + headH - 1, d, u, s);
    }
  }

  function bird(g, s, pose, f, u) {
    const p = posePars(pose, f), x = s.extras;
    const hover = -R(6 * u) + (f % 2 ? -1 : 0) + (pose === "strike" ? R(3 * u) : 0);
    const cx = g.cx + (pose === "strike" ? R(3 * u) : 0), cy = g.base - R(6 * u) + hover;
    const bw = R(6 * u), bh = R(4 * u);
    const flap = pose === "walk" || pose === "idle" ? f % 2 : pose === "windup" ? 1 : 0;
    g.line(cx - bw, cy, cx - bw - R(4 * u), cy + R(1 * u), Math.max(1, R(2 * u)), s.hair);   // tail
    g.tri(cx - 2, cy - 1, cx - R(7 * u), cy - (flap ? R(9 * u) : -R(5 * u)), cx + R(3 * u), cy - 1, shade(s.hair, -0.2));
    g.ellipse(cx, cy, bw, bh, s.skin);
    g.rect(cx - bw + 2, cy + 1, bw * 2 - 4, 1, shade(s.skin, 0.3));
    g.tri(cx - 1, cy - 1, cx - R(5 * u), cy - (flap ? R(8 * u) : -R(6 * u)), cx + R(4 * u), cy, s.hair);
    const hx = cx + bw - 1, hy = cy - bh - 1;
    g.disc(hx, hy, Math.max(2, R(2.6 * u)), s.skin);
    g.tri(hx + R(2 * u), hy - 1, hx + R(5 * u), hy + 1, hx + R(2 * u), hy + 2, s.accent);
    g.px(hx + 1, hy - 1, x.has("redeyes") ? s.accent : DARK);
    if (x.has("crest")) g.tri(hx - 2, hy - 1, hx - R(3 * u), hy - R(5 * u), hx + 1, hy - 2, s.accent);
    if (x.has("flame_head") || s.element === "fire") for (let i = 0; i < 3; i++) g.px(cx - bw - R(3 * u) - i, cy - i + (f % 2), i % 2 ? "#ffcc33" : "#ff6a1a");
    g.line(cx, cy + bh, cx, cy + bh + R(2 * u) - hover * 0, 1, s.accent);
    if (s.weapon && s.weapon !== "none") weapon(g, s.weapon, cx + 1, cy + bh + 1, pose === "strike" ? [1, 0.2] : [0.6, 0.8], u, s);
  }

  function serpent(g, s, pose, f, u) {
    const cx = g.cx, base = g.base, x = s.extras;
    const t = Math.max(2, R(3 * u)), n = 9, step = R(2.4 * u);
    const raise = pose === "strike" || pose === "windup" || pose === "cast" ? 1 : 0;
    let px0 = null, py0 = null;
    for (let i = 0; i < n; i++) {
      const xx = cx - R(n * step / 2) + i * step;
      const yy = base - t - Math.sin(f * 1.2 + i * 0.8) * R(1.5 * u) - (raise && i > n - 4 ? (i - (n - 4)) * R(2.5 * u) : 0);
      if (px0 !== null) g.line(px0, py0, xx, yy, t, i % 2 ? s.skin : shade(s.skin, -0.15));
      if (x.has("stripes") && i % 2) g.px(xx, yy - 1, s.hair);
      px0 = xx; py0 = yy;
    }
    const hx = px0 + (pose === "strike" ? R(3 * u) : 0), hy = py0 - 1;
    g.ellipse(hx + 1, hy, R(2.6 * u), R(2 * u), s.skin);
    if (x.has("hood")) g.ellipse(hx - 1, hy, R(2 * u), R(3.4 * u), shade(s.skin, -0.2));
    g.px(hx + 2, hy - 1, x.has("redeyes") || x.has("glow_eyes") ? s.accent : DARK);
    if (pose === "strike") g.line(hx + R(3 * u), hy + 1, hx + R(5 * u), hy + 1, 1, "#d6324a");
    if (x.has("whiskers")) g.line(hx + 2, hy + 1, hx + R(5 * u), hy + R(2 * u), 1, GOLD);
    if (x.has("horns")) g.line(hx, hy - 1, hx - 2, hy - R(3 * u), 1, BONE);
    if (x.has("fins")) g.tri(cx - 2, base - t - 2, cx, base - t - R(5 * u), cx + 2, base - t - 2, s.accent);
  }

  function blob(g, s, pose, f, u, ghost) {
    const x = s.extras;
    const squash = pose === "strike" ? 1.15 : pose === "windup" ? 0.85 : f % 2 ? 0.94 : 1;
    const w = R(7 * u / Math.sqrt(squash)), h = R(9 * u * squash);
    const cx = g.cx + (pose === "strike" ? R(2 * u) : 0);
    const float = ghost ? -R(4 * u) + (f % 2 ? -1 : 0) : 0;
    const bottom = g.base + float, top = bottom - h;
    if (ghost) g.ctx.globalAlpha = 0.92;
    for (let y = 0; y < h; y++) {
      const dome = ghost ? 0.55 : 0.6, q = Math.min(1, (y + 0.5) / (h * dome));
      const half = R(w * Math.sqrt(Math.max(0, 1 - (1 - q) * (1 - q))) * (ghost || y < h - 2 ? 1 : 0.92));
      g.rect(cx - half, top + y, half * 2 + 1, 1, y > h - 3 && !ghost ? shade(s.skin, -0.2) : s.skin);
    }
    if (ghost) for (let i = -w; i <= w; i += 2) g.px(cx + i + (f % 2), bottom, s.skin);
    g.ctx.globalAlpha = 1;
    g.rect(cx - w + 2, top + R(h * 0.25), 2, 1, shade(s.skin, 0.4));
    const ey = top + R(h * 0.4);
    const eye = x.has("redeyes") || x.has("glow_eyes") ? s.accent : DARK;
    g.rect(cx + R(w * 0.5), ey, Math.max(1, R(1.4 * u)), Math.max(2, R(2 * u)), eye);
    g.rect(cx + R(w * 0.1), ey, Math.max(1, R(1.4 * u)), Math.max(2, R(2 * u)), eye);
    if (x.has("grin")) g.rect(cx, ey + R(3 * u), R(w * 0.7), 1, "#ffffff");
    // Pac-Man's mouth: a wedge cut out towards the front, open and shut.
    if (x.has("mouth")) {
      const open = pose === "strike" || f % 2 === 0 ? 0.55 : 0.25, my = top + R(h * 0.55);
      for (let yy = -R(h * 0.5); yy <= R(h * 0.5); yy++) {
        const reach = Math.abs(yy) <= R(h * open) ? R(w * 1.2 * (1 - Math.abs(yy) / (h * open + 0.5))) : 0;
        if (reach > 0) g.ctx.clearRect(cx + w + 1 - reach, my + yy, reach + 1, 1);
      }
    }
    if (x.has("cheeks")) { g.px(cx + R(w * 0.8), ey + 2, "#e98aa8"); g.px(cx - R(w * 0.1), ey + 2, "#e98aa8"); }
    if (x.has("spikes")) for (let i = -w + 1; i < w; i += 3) g.tri(cx + i - 1, top + 2, cx + i, top - R(2 * u), cx + i + 1, top + 2, s.skin);
    if (x.has("feet")) { g.ellipse(cx - R(w * 0.5), bottom, R(2 * u), 1, s.accent); g.ellipse(cx + R(w * 0.5), bottom, R(2 * u), 1, s.accent); }
    if (x.has("nubs")) { g.disc(cx - w, top + R(h * 0.6), Math.max(1, R(1.3 * u)), s.skin); g.disc(cx + w, top + R(h * 0.55) - (pose === "strike" ? 2 : 0), Math.max(1, R(1.3 * u)), s.skin); }
    const head = { ...s, hair: s.hair };
    const hw = R(w * 1.2);
    topper(g, head, cx - R(hw / 2), top + 1, hw, u);
    if (s.head === "crown") { g.rect(cx - 2, top - 1, 5, 1, GOLD); g.px(cx - 2, top - 2, GOLD); g.px(cx + 2, top - 2, GOLD); }
    if (s.head === "wizard") g.tri(cx - R(3 * u), top + 1, cx, top - R(7 * u), cx + R(3 * u), top + 1, s.main);
    if (s.head === "cap") { g.rect(cx - R(3 * u), top, R(6 * u), 2, s.accent); g.rect(cx + R(2 * u), top + 1, R(2 * u), 1, s.accent); }
    if (s.weapon && s.weapon !== "none") weapon(g, s.weapon, cx + w, top + R(h * 0.6), pose === "windup" ? [-0.3, -1] : pose === "strike" ? [1, 0] : [0.7, -0.7], u, s);
  }

  /* --- Frames, outlines and the cache ------------------------------------ */

  // Dark one-pixel outline round everything, the classic sprite look.
  function outline(cv) {
    const ctx = cv.getContext("2d");
    const { width: w, height: h } = cv;
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const out = new Uint8ClampedArray(d);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        const i = (y * w + x) * 4;
        out[i] = OUTLINE[0]; out[i + 1] = OUTLINE[1]; out[i + 2] = OUTLINE[2]; out[i + 3] = 255;
      }
    }
    img.data.set(out);
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function bounds(cv) {
    const { width: w, height: h } = cv;
    const d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }

  // A glowing aura: a soft ring of the accent colour just outside the outline.
  function halo(cv, colour) {
    const ctx = cv.getContext("2d");
    const { width: w, height: h } = cv;
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const out = new Uint8ClampedArray(d);
    const [r, g, b] = hexRgb(colour);
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        const i = (y * w + x) * 4;
        out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = (x + y) % 2 ? 150 : 90;
      }
    }
    img.data.set(out);
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  function tinted(cv, colour, alpha) {
    const c = canvas(cv.width, cv.height), ctx = c.getContext("2d");
    ctx.drawImage(cv, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  const FRAMES = { idle: 2, walk: 4, windup: 1, strike: 1, shoot: 1, cast: 2, block: 1, hurt: 1, ko: 1, victory: 2 };
  const cache = new Map();

  // A group (an army, a horde, a crew) is drawn as a little crowd: two
  // smaller, darker figures behind the one in front.
  function draw(spec, pose, f) {
    const one = drawOne(spec, pose, f);
    if (!spec.extras.has("horde")) return one;
    const back = tinted(drawOne(spec, pose, (f + 1) % 2), "#1d1a17", 0.25);
    const S = one.width, c = canvas(S, S), ctx = c.getContext("2d");
    const u = SIZE[spec.size] || 1, k = 0.78, w = Math.round(S * k);
    for (const [dx, dy] of [[-Math.round(9 * u), -Math.round(4 * u)], [Math.round(9 * u), -Math.round(6 * u)]]) {
      ctx.drawImage(back, Math.round((S - w) / 2) + dx, S - w - 4 * k + dy + Math.round(4 * k), w, w);
    }
    ctx.drawImage(one, 0, 0);
    return c;
  }

  function drawOne(spec, pose, f) {
    const u = SIZE[spec.size] || 1;
    const S = Math.ceil(56 * u) + 8;
    const cv = canvas(S, S);
    const g = pen(cv);
    g.cx = Math.floor(S / 2); g.base = S - 4;
    const real = pose === "ko" ? "hurt" : pose;
    switch (spec.body) {
      case "q": quadruped(g, spec, real, f, u, false); break;
      case "d": quadruped(g, spec, real, f, u, true); break;
      case "b": bird(g, spec, real, f, u); break;
      case "s": serpent(g, spec, real, f, u); break;
      case "o": blob(g, spec, real, f, u, false); break;
      case "g": blob(g, spec, real, f, u, true); break;
      default: humanoid(g, spec, real, f, u);
    }
    outline(cv);
    if (spec.extras.has("glow") && pose !== "ko") halo(cv, spec.accent);
    if (pose !== "ko") return cv;
    // Knocked out: lying on their back, greyed.
    // Lying down: people tip over backwards (a quarter turn, head behind
    // them), creatures roll belly-up. Either way the body rests on the ground.
    const b = bounds(cv);
    const lying = canvas(S, S), ctx = lying.getContext("2d");
    if (!b) return lying;
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
    if (!"qdbs".includes(spec.body)) {
      ctx.translate(Math.floor(S / 2) - Math.floor(h / 2), S - 4);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(cv, b.x0, b.y0, w, h, 0, 0, w, h);
    } else {
      ctx.translate(Math.floor(S / 2) - Math.floor(w / 2), S - 4);
      ctx.scale(1, -1);
      ctx.drawImage(cv, b.x0, b.y0, w, h, 0, 0, w, h);
    }
    return tinted(lying, "#3a3530", 0.35);
  }

  /* A fighter's frames: Sprite.of(character) → { frame(pose, t), flash(...) }.
     t is in ms, so animation speed is the same on any screen. */
  // o.weapon / o.extras swap in gear picked up during a fight.
  function of(c, o = {}) {
    const spec = c.spec ? parse(c.spec) : specFor(c);
    if (o.weapon) {
      spec.weapon = o.weapon;
      if (["bow", "crossbow"].includes(o.weapon)) spec.style = "bow";
      else if (["gun", "rifle", "cannon", "blaster"].includes(o.weapon)) spec.style = "gun";
      else if (["staff", "wand"].includes(o.weapon) && spec.style === "fists") spec.style = "magic";
      else if (spec.style === "fists") spec.style = "blade";
    }
    (o.extras || []).forEach(x => spec.extras.add(x));
    const key = `${c.world}|${c.name}|${c.spec || ""}|${o.weapon || ""}|${(o.extras || []).join(",")}`;
    if (!cache.has(key)) cache.set(key, new Map());
    const mine = cache.get(key);
    const get = (pose, f, flash) => {
      const k = `${pose}:${f}:${flash ? 1 : 0}`;
      if (!mine.has(k)) {
        const base = draw(spec, pose, f);
        mine.set(k, flash ? tinted(base, "#ffffff", 0.85) : base);
      }
      return mine.get(k);
    };
    const speed = { idle: 420, walk: 120, cast: 160, victory: 260 };
    return {
      spec,
      frame(pose, t = 0, flash = false) {
        const n = FRAMES[pose] || 1;
        const f = n > 1 ? Math.floor(t / (speed[pose] || 200)) % n : 0;
        return get(pose, f, flash);
      },
      size: SIZE[spec.size] || 1,
      flies: spec.body === "b" || spec.body === "g",
    };
  }

  window.Sprite = { of, parse, guess, specFor, FIELDS, shade, lum, hexRgb };
})();
