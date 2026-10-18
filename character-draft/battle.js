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
    "teleport", "transform", "summon", "stealth", "time_stop", "foresee", "mind_control", "clone", "shapeshift",
    "regenerate", "phase", "fly", "grow", "shrink", "reality_warp", "summon_dragon", "summon_giant", "raise_dead",
    "stampede", "airstrike", "meteor", "lullaby", "devour", "portal", "freeze", "petrify", "anvil", "shout", "black_hole",
    "earthquake", "tornado", "lightning_storm", "time_rewind", "stretch", "drain", "laser_eyes", "self_destruct",
    "telekinesis", "spin_dash", "summon_companion", "hook", "chain_lightning", "earth_spikes", "sniper_shot", "grenade", "poison_cloud", "spin_slash", "shield_bounce", "web_swing", "mega_beam", "one_punch", "domain_expansion", "orb_strike", "flank", "arena_event", "return",
    "block", "dodge", "deploy_gear", "build", "heal",
    "shield", "trap", "team_up", "taunt", "retreat", "fall"];
  // Actions that need someone to hit.
  const ATTACKS = ["strike", "combo", "shoot", "cast", "special", "annihilate", "throw", "slam", "barrage", "grab",
    "teleport", "summon", "stealth", "trap", "team_up", "time_stop", "foresee", "mind_control", "clone", "shapeshift",
    "reality_warp", "summon_dragon", "summon_giant", "raise_dead", "stampede", "airstrike", "meteor", "lullaby", "devour",
    "portal", "freeze", "petrify", "anvil", "shout", "black_hole", "earthquake", "tornado", "lightning_storm", "stretch",
    "drain", "laser_eyes", "self_destruct", "telekinesis", "spin_dash", "summon_companion", "hook", "chain_lightning", "earth_spikes", "sniper_shot", "grenade", "poison_cloud", "spin_slash", "shield_bounce", "web_swing", "mega_beam", "one_punch", "domain_expansion", "orb_strike", "flank"];
  // Abilities that can be used on their own, with or without a target.
  const SOLO = ["stealth", "teleport", "phase", "fly", "grow", "shrink", "time_stop"];
  const EFFECTS = ["none", "slash", "impact", "fire", "ice", "lightning", "water", "earth", "wind", "poison", "light",
    "dark", "psychic", "tech", "web", "smoke", "explosion", "heal", "shield", "nature", "blood"];
  const OUTCOMES = ["hit", "crit", "hurt", "blocked", "dodged", "miss", "ko", "none"];
  const LOOKS = ["blade", "bow", "gun", "staff", "shield", "bomb", "trap", "net", "turret", "cannon", "vehicle",
    "potion", "armour", "banner", "beast", "device", "rope", "wall",
    "jetpack", "drone", "mech", "grapple", "smoke", "flamethrower", "rocket", "hammer", "axe", "spear", "scope", "medkit", "charm",
    "catapult", "mine", "boomerang", "cloak", "ram"];
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
    const extra = has(/jet ?pack|rocket boots|thruster/) ? "jetpack" : has(/drone/) ? "drone" : has(/mech\b|exosuit|power armou?r|walker|robot/) ? "mech"
      : has(/grappl|hookshot|zipline/) ? "grapple" : has(/smoke/) ? "smoke" : has(/flamethrower|flame thrower|incinerat/) ? "flamethrower"
      : has(/rocket|missile|bazooka|launcher|rpg/) ? "rocket" : has(/landmine|\bmine\b|claymore/) ? "mine" : has(/hammer|mallet|maul/) ? "hammer"
      : has(/\baxe\b|hatchet/) ? "axe" : has(/spear|javelin|pike|lance|trident/) ? "spear" : has(/scope|sniper|binocular|goggle/) ? "scope"
      : has(/medkit|med kit|first aid|bandage|stim/) ? "medkit" : has(/amulet|charm|talisman|ward|rune|crystal|totem/) ? "charm"
      : has(/catapult|trebuchet|siege/) ? "catapult" : has(/boomerang|chakram|disc/) ? "boomerang" : has(/cloak|invisib|camo/) ? "cloak"
      : has(/battering|\bram\b/) ? "ram" : "";
    if (extra) return extra;
    return has(/bomb|grenade|explosive|charge|dynamite/) ? "bomb" : has(/trap|snare|spike|pit/) ? "trap" : has(/net\b|web/) ? "net"
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
      blade: COLOURS.silver, vehicle: COLOURS.brown, rope: COLOURS.brown, beast: COLOURS.brown, device: COLOURS.cyan, wall: COLOURS.grey,
      jetpack: COLOURS.silver, drone: COLOURS.grey, mech: COLOURS.grey, grapple: COLOURS.black, smoke: COLOURS.grey, flamethrower: COLOURS.grey,
      rocket: COLOURS.green, hammer: COLOURS.silver, axe: COLOURS.silver, spear: COLOURS.silver, scope: COLOURS.black, medkit: COLOURS.white,
      charm: COLOURS.purple, catapult: COLOURS.grey, mine: COLOURS.grey, boomerang: COLOURS.brown, cloak: COLOURS.black, ram: COLOURS.grey })[look] || COLOURS.cyan;
  }

  /* --- Fighting like themselves ---------------------------------------------
     What a character can do, read from their name and note, so the battle
     shows it: a cloner attacks with copies of themselves, a speedster leaves
     afterimages, a stretcher punches from across the field. And named moves
     map to the animation that looks like them (Shadow Clone Jutsu, Kamehameha,
     Gum-Gum Pistol...). */
  const ABILITY_NAMES = {
    clone: /^(Naruto Uzumaki|Twice|Ectoplasm|Splinter|Multiple Man|Kakashi Hatake|Loki|Mysterio|Mesmer)$/,
    speed: /^(The Flash|Reverse-Flash|Quicksilver|Sonic|Shadow the Hedgehog|A-Train|Usain Bolt|Tracer|Killua Zoldyck|Zenitsu Agatsuma|Cheetara|Speed Racer|Makarov|Accelerator|Tenya Iida)$/,
    stretch: /^(Monkey D\. Luffy|Mister Fantastic|Plastic Man|Elastigirl|Mina Ashido)$/,
    teleport: /^(Nightcrawler|Kurogiri|Blink|Minato Namikaze|Dormammu|Doctor Strange|Rick Sanchez)$/,
    stealth: /^(Invisible Woman|Translucent|Predator|Toru Hagakure|Agent 47|Snake Eyes|Black Noir|Hollow Man)$/,
    shapeshift: /^(Mystique|Zoroark|Doppelganger|Beast Boy|Clayface|Martian Manhunter|Himiko Toga|Hulkling|Rimuru Tempest|Ditto)$/,
    grow: /^(Ant-Man|Mt\. Lady|Giant-Man|Gigantomachia|Colossus)$/,
    fly: /^(Superman|Supergirl|Storm|Iron Man|Captain Marvel|Falcon|Vision|Hawkman|Hawkgirl|Homelander|Starlight|Hawks|Raven|Starfire|Silver Surfer|Wonder Woman|Thor)$/,
  };
  const ABILITY_WORDS = {
    clone: /\bclon(e|es|ing)\b|duplicat|copies of (him|her|them)self|multipl(ies|ying) (him|her)self|shadow clones?|splits? into (copies|duplicates)|illusory copies/i,
    speed: /super-?speed|fastest|speedster|blinding speed|faster than|lightning-fast|sonic boom|speed force/i,
    stretch: /stretch|elastic|rubber|gum-gum|plastic body/i,
    teleport: /teleport|blinks? (in|out|across|behind)|apparat|warps? (through|behind)|portal gun/i,
    stealth: /invisib|cloaking|camouflag|turns? unseen|active camo/i,
    shapeshift: /shapeshift|shape-shift|shape-?changer|disguis|mimic|takes? the (form|shape)|polymorph/i,
    grow: /grows? (to|giant|huge)|giant-?man|enlarg|gigantif|size-?chang/i,
    fly: /\bflight\b|\bflies\b|\bflying\b|soars?\b/i,
  };
  const abilityCache = new Map();
  function abilitiesOf(p) {
    const key = `${p.world}|${p.name}`;
    if (abilityCache.has(key)) return abilityCache.get(key);
    const text = `${p.name} ${p.note || ""}`, out = new Set();
    for (const k in ABILITY_NAMES) if (ABILITY_NAMES[k].test(p.name) || ABILITY_WORDS[k].test(text)) out.add(k);
    abilityCache.set(key, out);
    return out;
  }
  // Famous named moves and the animation that shows them.
  const MOVES = [
    [/shadow clone|kage bunshin|multi-?shadow|clone jutsu|doppel|mirror image|copies attack/i, "clone"],
    [/rasengan|chidori|raikiri|rasenshuriken|spirit orb/i, "orb_strike"],
    [/kamehameha|final flash|galick|masenko|big bang attack|special beam cannon|hollow purple|getsuga|cero/i, "mega_beam"],
    [/spirit bomb|genki dama|supernova|death ball/i, "meteor"],
    [/gum-?gum|gomu gomu|stretch|elastic punch/i, "stretch"],
    [/get over here|hookshot|death sentence|rocket grab/i, "hook"],
    [/za warudo|the world|time stop|stop time|chronostasis/i, "time_stop"],
    [/domain expansion|infinite void|malevolent shrine|unlimited void/i, "domain_expansion"],
    [/one punch|serious punch|consecutive normal punches/i, "one_punch"],
    [/shield (throw|toss|bounce)|vibranium shield/i, "shield_bounce"],
    [/web-?swing|web (zip|kick)|thwip/i, "web_swing"],
    [/super saiyan|bankai|gear (four|fifth|5|4)|hulk out|transform|ultra instinct|mega evolution/i, "transform"],
    [/teleport|bamf|apparat|instant transmission|flying raijin|blink/i, "teleport"],
    [/invisib|cloak|vanish/i, "stealth"],
    [/shapeshift|disguise|polyjuice|transform into/i, "shapeshift"],
    [/expecto patronum|summon(s|ing)? (his|her|their)|summoning jutsu/i, "summon_companion"],
    [/petrif|stone gaze|medusa/i, "petrify"],
    [/heat vision|laser eyes|optic blast/i, "laser_eyes"],
    [/fus ro dah|sonic scream|canary cry|thu'?um|roar of/i, "shout"],
    [/black hole|gravity well|gravitational/i, "black_hole"],
    [/meteor|comet|starfall/i, "meteor"],
    [/lightning storm|thunderstorm|call(s)? lightning/i, "lightning_storm"],
    [/tornado|whirlwind|cyclone/i, "tornado"],
    [/earthquake|fissure|tremor|seismic/i, "earthquake"],
    [/freeze|ice prison|frozen solid|absolute zero/i, "freeze"],
    [/hadouken|fireball|fire blast|flamethrower|dracarys/i, "cast"],
    [/spin(ning)? (attack|dash)|spin dash|judgment|tornado spin/i, "spin_slash"],
  ];
  const PLAIN = ["strike", "combo", "special", "cast", "shoot", "throw", "slam"];
  // A plain attack becomes the character's signature way of fighting.
  function flavour(p, action, move, n) {
    const fromMove = move && MOVES.find(([re]) => re.test(move));
    if (fromMove && (PLAIN.includes(action) || action === fromMove[1])) return fromMove[1];
    if (!PLAIN.includes(action)) return action;
    const a = abilitiesOf(p);
    // Most of the time, not every time, so a fight still has variety.
    const often = n % 3 !== 2;
    if (a.has("clone") && often) return "clone";
    if (a.has("stretch") && often) return "stretch";
    if (a.has("teleport") && often) return "teleport";
    if (a.has("stealth") && n % 3 === 0) return "stealth";
    if (a.has("shapeshift") && n % 3 === 0) return "shapeshift";
    if (a.has("grow") && n % 3 === 0) return "grow";
    if (a.has("fly") && n % 2 === 0 && (action === "strike" || action === "combo")) return "fly";
    return action;
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
    // An army or horde dies in parts: a single blow only takes all of it when
    // it has already been thinned, unless the move wipes out whole sides.
    const groupsOf = w => ((window.UNIVERSES || {})[w] || {}).groups || [];
    const horde = q => { try { return window.Sprite.of(q).spec.extras.has("horde"); } catch { return false; } };
    const isGroup = q => groupsOf(q.world).includes(q.name) || horde(q);
    const hits = new Map();
    const fallenPool = Array.isArray(verdict.fallen) ? verdict.fallen : [];
    const returned = new Set();
    for (const raw of Array.isArray(verdict.beats) ? verdict.beats.slice(0, 40) : []) {
      // The battlefield itself strikes: a passing dragon, the warden, a rockslide.
      if (raw.action === "arena_event" || norm(raw.actor) === "the battlefield") {
        let target = find(raw.target);
        if (!target || down.has(target.key)) continue;
        let outcome = OUTCOMES.includes(raw.outcome) ? raw.outcome : "hit";
        if (outcome === "ko" && target.side === winSide && standing(people.filter(q => q.side === winSide)).length <= 1) outcome = "hurt";
        if (outcome === "ko" && target === mvp) outcome = "hurt";
        const by = String(raw.event_by || "").trim().slice(0, 60) || "The battlefield";
        out.push({ actor: null, action: "arena_event", eventBy: by, target: target.key, victims: null, gear: null,
          effect: EFFECTS.includes(raw.effect) ? raw.effect : "none", outcome, move: String(raw.move || "").trim().slice(0, 32), also: [],
          death: ["normal", "disintegrate", "blast_off", "vaporize", "explode", "crush", "melt", "shatter", "burn"].includes(raw.death) ? raw.death : "normal",
          caption: String(raw.caption || `${by} strikes ${target.name}.`).trim().slice(0, 160), line: "", callout: String(raw.callout || `${by}!`).trim().slice(0, 70) });
        if (outcome === "ko") down.add(target.key);
        continue;
      }
      // Someone killed earlier in the tournament turns out not to be dead.
      if (raw.action === "return" && !find(raw.actor)) {
        const f = fallenPool.find(q => norm(q.name) === norm(raw.actor));
        if (!f || returned.has(f.name) || returned.size >= 1) continue;
        const side = Math.max(0, teams.findIndex(t => norm(t.name) === norm(raw.event_by)));
        const key = people.some(q => q.key === f.name) ? `${f.name} (returned)` : f.name;
        const person = { name: f.name, world: f.world, note: f.note || "", team: teams[side].name, side, key, returned: true };
        people.push(person); returned.add(f.name);
        out.push({ actor: key, action: "return", person, target: null, victims: null, gear: null, effect: "none", outcome: "none", move: "", also: [], death: "normal",
          caption: String(raw.caption || `${f.name} isn't dead after all, and joins ${teams[side].name}'s team!`).trim().slice(0, 160), line: String(raw.line || "").trim().slice(0, 60),
          callout: String(raw.callout || `${f.name} returns!`).trim().slice(0, 70) });
        continue;
      }
      const actor = find(raw.actor);
      if (!actor || down.has(actor.key)) continue;
      let action = ACTIONS.includes(raw.action) ? raw.action : "strike";
      action = flavour(actor, action, String(raw.move || ""), out.filter(b => b.actor === actor.key).length);
      // Nobody runs in a fight to the death: losers who'd flee are killed at the end.
      if (action === "retreat") { if (actor.side !== winSide) continue; action = "dodge"; }
      let target = find(raw.target);
      const friendly = ["heal", "shield"].includes(action);
      if (friendly && target && target.side !== actor.side) target = null;
      if (!friendly && target && target.side === actor.side && action !== "team_up") target = null;
      // Attacks need someone to hit; gear can simply be set up (a potion, a wall).
      // Vanishing or blinking away needs no target; any other attack does.
      const reposition = SOLO.includes(action) && !target;
      if (!reposition && (ATTACKS.includes(action) || (target && !friendly))) {
        if (!target || down.has(target.key)) target = standing(enemiesOf(actor))[0] || null;
        if (!target && !friendly) continue;
      }
      let outcome = OUTCOMES.includes(raw.outcome) ? raw.outcome : target && !friendly ? "hit" : "none";
      // Blowing yourself up takes you with it, so the winners' last fighter can't.
      if (action === "self_destruct" && actor.side === winSide && standing(people.filter(q => q.side === winSide)).length <= 1) action = "special";
      if (friendly || !target || ["advance", "taunt", "block", "dodge", "build", "transform", "regenerate", "time_rewind"].includes(action)) outcome = target && action === "advance" ? outcome : "none";
      // Never knock out the winner's last fighter.
      if (outcome === "ko" && target && target.side === winSide && standing(people.filter(q => q.side === winSide)).length <= 1) outcome = "hurt";
      if (outcome === "ko" && target && target.side === winSide && target === mvp) outcome = "hurt";
      const g = findGear(raw.gear);
      // One move can catch several: "also" names the others it hits.
      let also = (Array.isArray(raw.also) ? raw.also : []).map(find).filter(q => q && target && q !== target && q.side === target.side && !down.has(q.key)).map(q => q.key);
      if (outcome === "ko" && also.length && target && target.side === winSide) {
        const left = standing(people.filter(q => q.side === winSide)).length;
        also = also.slice(0, Math.max(0, left - 2));
      }
      // An overwhelming power hits every enemy still alive; a controlled mind
      // turns on one of its own allies (or itself, if it has none left).
      let victims = action === "annihilate" ? standing(enemiesOf(actor)).map(q => q.key) : null;
      if (action === "mind_control" && target) {
        const ally = standing(alliesOf(target))[0];
        victims = [(ally || target).key];
      }
      if (victims && outcome === "ko" && victims.some(k => people.find(q => q.key === k).side === winSide)
        && standing(people.filter(q => q.side === winSide)).length <= victims.filter(k => people.find(q => q.key === k).side === winSide).length) outcome = "crit";
      if (outcome === "ko" && target && !victims && isGroup(target) && !(hits.get(target.key) > 0) && !["self_destruct", "devour", "black_hole"].includes(action)) {
        out.push({ actor: actor.key, action, target: target.key, victims: null, gear: g ? g.name : null, effect: EFFECTS.includes(raw.effect) ? raw.effect : "none",
          outcome: "crit", move: String(raw.move || "").trim().slice(0, 32), also: [], death: "normal",
          caption: `${actor.name} cuts into ${target.name}: a whole flank falls, but the rest fight on.`, line: "", callout: `${target.name} loses a flank` });
      }
      if (target && ["hit", "crit", "hurt"].includes(outcome)) hits.set(target.key, (hits.get(target.key) || 0) + 1);
      out.push({
        actor: actor.key, action, target: target ? target.key : null, victims,
        gear: g ? g.name : null, effect: EFFECTS.includes(raw.effect) ? raw.effect : "none", outcome,
        move: String(raw.move || "").trim().slice(0, 32),
        also: victims ? [] : [...new Set(also)],
        death: ["normal", "disintegrate", "blast_off", "vaporize", "explode", "crush", "melt", "shatter", "burn"].includes(raw.death) ? raw.death : "normal",
        caption: String(raw.caption || "").trim().slice(0, 160), line: String(raw.line || "").trim().slice(0, 60),
        callout: String(raw.callout || "").trim().slice(0, 70),
      });
      if (outcome === "ko" && victims) victims.forEach(k => down.add(k));
      else if (outcome === "ko" && target) { down.add(target.key); also.forEach(k => down.add(k)); }
      if (action === "fall" || action === "self_destruct") down.add(actor.key);
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
    if (/\bmoon\b|lunar|crater|mars\b/i.test(arena ? `${arena.name} ${arena.terrain}` : "")) return "moon";
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
    moon: { sky: ["#05060c", "#0b0d18", "#141728"], far: "#5a5d66", mid: "#73767f", ground: "#9a9da5", ground2: "#868991", line: "#62656d" },
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
    if (kind === "moon") {
      for (let i = 0; i < 90; i++) rect(rand() * W, rand() * 110, 1, 1, rand() < 0.2 ? "#ffffff" : "#9aa0b8");
      // The Earth, hanging in the black.
      rect(300, 18, 22, 22, "#2f6fd6"); rect(304, 22, 8, 6, "#4caf50"); rect(312, 30, 6, 6, "#4caf50"); rect(300, 18, 22, 3, "#cfe8ff");
    }
    else if (night || kind === "city" || kind === "cave") for (let i = 0; i < 40; i++) rect(rand() * W, rand() * 80, 1, 1, kind === "cave" ? "#5a5060" : "#f4f1ea");
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

  /* --- The defenders' ground ----------------------------------------------
     One side attacks, the other holds a feature of the battlefield: a wall,
     cliff, gate, trench, river, bridge, forest, rooftops or ruins. High ground
     lifts the defenders; water and ditches sit between the two sides. */

  const FEATURES = ["wall", "cliff", "gate", "trench", "river", "bridge", "forest", "rooftops", "ruins", "open"];
  const HIGH = { wall: 136, gate: 136, cliff: 132, rooftops: 134 };
  function featureFor(verdict, kind) {
    if (FEATURES.includes(verdict.feature)) return verdict.feature;
    return { castle: "wall", snow: "wall", sea: "river", forest: "forest", city: "rooftops", cave: "ruins", arena: "open", volcano: "cliff", tech: "trench", blocky: "wall" }[kind] || "open";
  }
  function drawFeature(feature, defSide, kind) {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = PALETTES[kind] || PALETTES.plains;
    const x0 = defSide ? 236 : 20, x1 = defSide ? 364 : 148, mid = W / 2;
    const stone = kind === "snow" ? ["#c8d4e0", "#a8b8c8", "#8898a8"] : kind === "volcano" ? ["#4a3a38", "#3a2a28", "#2a1e1c"] : ["#9a9890", "#7f7d76", "#5f5d57"];
    const top = HIGH[feature] || 0;
    if (feature === "wall" || feature === "gate" || feature === "rooftops") {
      const roof = feature === "rooftops";
      rect(x0, top, x1 - x0, H - top, roof ? "#5a4a5a" : stone[1]);
      for (let y = top + 4; y < H; y += 6) for (let x = x0 + ((y / 6) % 2) * 6; x < x1; x += 12) rect(x, y, 11, 1, roof ? "#4a3a4a" : stone[2]);
      rect(x0, top, x1 - x0, 2, roof ? "#7a6a7a" : stone[0]);
      if (!roof) for (let x = x0; x < x1; x += 10) rect(x, top - 5, 6, 5, stone[1]);
      if (roof) for (let y = top + 10; y < H - 6; y += 16) for (let x = x0 + 6; x < x1 - 8; x += 18) rect(x, y, 6, 8, "#f2cf6a");
      if (feature === "gate") { const gx = defSide ? x0 : x1 - 26; rect(gx, H - 50, 26, 50, "#2a1e14"); for (let i = 0; i < 26; i += 5) rect(gx + i, H - 50, 1, 50, "#5a4a3a"); }
      const edge = defSide ? x0 : x1;
      rect(edge - 1, top, 2, H - top, stone[2]);
    } else if (feature === "cliff") {
      for (let y = top; y < H; y++) {
        const spread = (y - top) * 0.35;
        const a = defSide ? x0 - spread : x0, b = defSide ? x1 : x1 + spread;
        rect(a, y, b - a, 1, (y - top) % 9 < 2 ? stone[2] : stone[1]);
      }
      rect(x0, top, x1 - x0, 2, stone[0]);
    } else if (feature === "trench") {
      const tx = defSide ? x0 - 6 : x1 - 6;
      rect(tx, 120, 12, H - 120, "#3a2a1a");
      for (let y = 124; y < H; y += 7) { rect(tx - 4, y, 6, 4, "#b8a070"); rect(tx + 10, y + 3, 6, 4, "#b8a070"); }
    } else if (feature === "river" || feature === "bridge") {
      for (let y = 116; y < H; y++) { const w = 34 + Math.sin(y / 9) * 4; rect(mid - w / 2, y, w, 1, (y + Math.floor(y / 5)) % 7 === 0 ? "#9fd0f0" : "#3f7fb8"); }
      if (feature === "bridge") { rect(mid - 28, 150, 56, 18, "#8a5a32"); for (let x = mid - 28; x < mid + 28; x += 6) rect(x, 150, 1, 18, "#5a3a1a"); rect(mid - 28, 148, 56, 2, "#6b4a2a"); }
    } else if (feature === "forest") {
      for (let i = 0; i < 6; i++) {
        const x = x0 + 8 + i * ((x1 - x0 - 16) / 5), h = 34 + (i % 3) * 8, y = 128 + (i % 2) * 10;
        for (let k = 0; k < h; k += 2) rect(x - k / 4, y - h + k, k / 2 + 1, 2, k % 6 ? "#2f6a3f" : "#3f7a4a");
        rect(x - 1, y, 3, 8, "#5a3a24");
      }
    } else if (feature === "ruins") {
      for (let i = 0; i < 5; i++) { const x = x0 + 10 + i * 26, h = 18 + (i * 7) % 20, y = 150 + (i % 2) * 14; rect(x, y - h, 8, h, stone[1]); rect(x - 2, y - h, 12, 3, stone[0]); rect(x + 3, y - h - 4, 4, 4, stone[2]); }
    }
    return { canvas: cv, top };
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
      case "jetpack": r(-4, -11, 3, 9, colour); r(1, -11, 3, 9, colour); r(-1, -10, 2, 6, "#5a5f66"); if ((t / 90 | 0) % 2) { r(-4, -2, 3, 3, "#ff9a2a"); r(1, -2, 3, 3, "#ffcc33"); } else { r(-4, -2, 3, 2, "#ffcc33"); r(1, -2, 3, 2, "#ff9a2a"); } break;
      case "drone": { const bob = Math.round(Math.sin(t / 150) * 1); r(-3, -8 + bob, 6, 3, colour); r(-1, -6 + bob, 2, 1, "#ff2828"); const s = (t / 50 | 0) % 2 ? 4 : 2; r(-4 - s, -10 + bob, s, 1, "#cfd6dd"); r(4, -10 + bob, s, 1, "#cfd6dd"); r(-4, -9 + bob, 1, 2, dark); r(3, -9 + bob, 1, 2, dark); break; }
      case "mech": r(-5, -16, 10, 8, colour); r(-3, -14, 6, 3, "#8fe9ff"); r(-7, -14, 2, 6, colour); r(5, -14, 2, 6, colour); r(-4, -8, 3, 8, dark); r(1, -8, 3, 8, dark); r(-5, -1, 4, 1, colour); r(1, -1, 4, 1, colour); break;
      case "grapple": r(-5, -5, 6, 3, colour); r(-5, -2, 2, 2, colour); r(1, -5, 2, 1, "#cfd6dd"); r(3, -6, 1, 3, "#cfd6dd"); r(4, -7, 1, 1, "#cfd6dd"); r(4, -3, 1, 1, "#cfd6dd"); break;
      case "smoke": r(-3, -6, 6, 6, colour); r(-1, -8, 2, 2, "#cfd6dd"); r(-2, -5, 1, 1, "#ffffff"); if ((t / 160 | 0) % 2) r(1, -11, 2, 2, "rgba(200,200,200,0.8)"); break;
      case "flamethrower": r(-6, -5, 10, 3, colour); r(4, -4, 3, 1, dark); r(-5, -2, 2, 3, dark); r(-3, -9, 3, 4, "#c0262f"); if ((t / 80 | 0) % 2) r(7, -5, 2, 2, "#ff7a1a"); break;
      case "rocket": r(-7, -6, 12, 3, colour); r(5, -7, 2, 5, dark); r(-4, -3, 2, 3, dark); r(-8, -7, 2, 5, "#5a5f66"); break;
      case "hammer": r(0, -12, 1, 12, "#8a5a32"); r(-3, -15, 7, 4, colour); r(-3, -15, 7, 1, "#ffffff"); break;
      case "axe": r(0, -13, 1, 13, "#8a5a32"); r(1, -13, 4, 5, colour); r(4, -14, 1, 7, colour); r(1, -13, 3, 1, "#ffffff"); break;
      case "spear": r(0, -16, 1, 16, "#8a5a32"); r(-1, -19, 3, 3, colour); r(0, -20, 1, 1, colour); break;
      case "scope": r(-5, -6, 10, 3, colour); r(-3, -7, 5, 1, dark); r(5, -6, 2, 1, "#9fe3ff"); break;
      case "medkit": r(-4, -7, 8, 6, colour); r(-1, -6, 2, 4, "#ffffff"); r(-2, -5, 4, 2, "#ffffff"); r(-2, -8, 4, 1, dark); break;
      case "charm": r(-1, -10, 2, 1, "#e8b84a"); r(-2, -9, 1, 2, "#e8b84a"); r(1, -9, 1, 2, "#e8b84a"); r(-2, -7, 4, 4, colour); r(-1, -6, 1, 1, "#ffffff"); if ((t / 250 | 0) % 2) r(2, -8, 1, 1, "#ffffff"); break;
      case "catapult": r(-8, -3, 16, 3, "#6b4a2a"); r(-7, 0, 3, 2, dark); r(4, 0, 3, 2, dark); r(-2, -10, 2, 7, "#8a5a32"); r(-6, -12, 10, 2, "#8a5a32"); r(-7, -14, 3, 2, colour); break;
      case "mine": r(-4, -2, 8, 2, colour); r(-2, -3, 4, 1, colour); if ((t / 300 | 0) % 2) r(0, -4, 1, 1, "#ff2828"); break;
      case "boomerang": r(-5, -6, 5, 2, colour); r(-1, -6, 2, 6, colour); r(-5, -6, 1, 1, "#ffffff"); break;
      case "cloak": r(-4, -13, 8, 3, colour); r(-5, -10, 10, 9, colour); r(-2, -12, 4, 2, dark); r(-5, -1, 2, 1, colour); r(3, -1, 2, 1, colour); break;
      case "ram": r(-10, -6, 20, 4, "#8a5a32"); r(10, -7, 3, 6, colour); r(-8, -2, 2, 2, dark); r(5, -2, 2, 2, dark); r(-6, -9, 1, 3, "#6b4a2a"); r(4, -9, 1, 3, "#6b4a2a"); break;
      default: r(-4, -7, 8, 7, colour); r(-2, -5, 4, 2, "#ffffff"); r(-1, -9, 1, 2, dark); if ((t / 200 | 0) % 2) r(0, -10, 1, 1, colour);
    }
  }

  /* --- Companions -----------------------------------------------------------
     Characters with a signature partner call it in: Annie's Tibbers, Yugi's
     Dark Magician or Blue-Eyes, Naruto's Kurama, a Stand behind its user. Each
     is drawn from its own design. Found by the move's name, else by who calls. */

  const COMPANIONS = [
    { id: "blueeyes", name: "Blue-Eyes White Dragon", match: /blue.?eyes/i, kind: "flyer", spec: "d|g|w|e8eef8|9fd0ff|e8eef8|e8eef8|5ab8f0|none|none|bare|none|glow_eyes,spikes|breath|light", attack: "beam", colour: "#cfe8ff", sound: "b_roar", line: "Burst Stream of Destruction!" },
    { id: "darkmagician", name: "Dark Magician", match: /dark magician/i, by: /^Yugi/, kind: "beast", spec: "h|l|t|c8b8e8|1a1a1a|5b3a9a|3a2a6a|4caf50|none|wizard|armour|staff|glow|magic|dark", attack: "orb", colour: "#8e5bd0", sound: "b_magic", line: "Dark Magic Attack!" },
    { id: "tibbers", name: "Tibbers", match: /tibbers/i, by: /^Annie$/, kind: "beast", spec: "h|x|w|6b4a2a|3b2a1a|6b4a2a|6b4a2a|ff7a1a|none|none|bare|claws|ears_round,stripes,redeyes,glow|claws|fire", attack: "slam", colour: "#ff7a1a", sound: "b_roar", line: "" },
    { id: "kurama", name: "Kurama", match: /kurama|nine.?tails|kyuubi/i, by: /^Naruto/, kind: "beast", spec: "q|g|w|ef8a2c|1f1f1f|ef8a2c|ef8a2c|c0262f|none|none|bare|none|tails9,redeyes,stripes|bite|fire", attack: "orb", colour: "#3a1a3a", sound: "b_roar", line: "Tailed Beast Bomb!" },
    { id: "starplatinum", name: "Star Platinum", match: /star platinum/i, by: /^Jotaro/, kind: "stand", spec: "h|l|w|8e5bd0|1a1a1a|8e5bd0|e8b84a|c0262f|long|headband|bare|none|scarf,glow|fists|psychic", cry: "ORA", colour: "#8e5bd0", sound: "b_punch" },
    { id: "theworld", name: "The World", match: /the world|za warudo/i, by: /^Dio/, kind: "stand", spec: "h|l|w|e8b84a|1a1a1a|e8b84a|3a5a3a|3a8a3a|none|helm|armour|none|glow|fists|psychic", cry: "MUDA", colour: "#e8b84a", sound: "b_punch" },
    { id: "goldexp", name: "Gold Experience", match: /gold experience/i, by: /^Giorno/, kind: "stand", spec: "h|l|n|e8b84a|1a1a1a|e8b84a|4caf50|ff6ad5|none|helm|armour|none|glow|fists|nature", cry: "MUDA", colour: "#e8b84a", sound: "b_punch" },
    { id: "eagle", name: "the Great Eagles", match: /eagle/i, by: /^Gandalf$/, kind: "flyer", spec: "b|g|w|8a5a32|e8b84a|8a5a32|8a5a32|e8b84a|none|none|bare|none|crest|claws|wind", attack: "dive", colour: "#e8d9b0", sound: "b_whoosh" },
    { id: "voidlings", name: "voidlings", match: /voidling/i, by: /^Malzahar$/, kind: "swarm", spec: "q|s|n|8e5bd0|ff6ad5|8e5bd0|8e5bd0|ff6ad5|none|none|bare|none|horde,spikes,no_ears|bite|dark", colour: "#8e5bd0", sound: "b_summon" },
    { id: "spiderlings", name: "spiderlings", match: /spiderling/i, by: /^Elise$/, kind: "swarm", spec: "q|s|w|2a2a2a|c0262f|2a2a2a|2a2a2a|c0262f|none|none|bare|none|horde,redeyes,no_ears,spots|bite|poison", colour: "#c0262f", sound: "b_summon" },
    { id: "plants", name: "thorn plants", match: /plant|thorn|garden/i, by: /^Zyra$/, kind: "swarm", spec: "o|s|n|2e6b3a|c0262f|2e6b3a|2e6b3a|c0262f|none|none|bare|none|horde,spikes,grin|bite|nature", colour: "#4caf50", sound: "b_summon" },
    { id: "daisy", name: "Daisy", match: /daisy/i, by: /^Ivern$/, kind: "beast", spec: "h|x|w|8a8f96|ff6ad5|8a8f96|5a5f66|ff6ad5|none|none|bare|none|spikes,glow_eyes|fists|nature", attack: "slam", colour: "#ff6ad5", sound: "b_slam" },
    { id: "maiden", name: "the Maiden of the Mist", match: /maiden|mist/i, by: /^Yorick$/, kind: "beast", spec: "g|l|t|9fe3d8|f2f0ea|9fe3d8|9fe3d8|4caf50|none|none|bare|none|glow,glow_eyes,nubs|claws|dark", attack: "melee", colour: "#9fe3d8", sound: "b_psychic" },
    { id: "charizard", name: "Charizard", match: /charizard/i, by: /Pok[eé]mon Trainer/, kind: "beast", from: ["pokemon", "Charizard"], attack: "breath", colour: "#ff7a1a", sound: "b_roar" },
    { id: "ghost", name: "Ghost", match: /\bghost\b|direwolf/i, by: /^Jon Snow$/, kind: "beast", from: ["westeros", "Ghost"], attack: "melee", colour: "#ffffff", sound: "b_slash" },
    { id: "fawkes", name: "Fawkes", match: /fawkes|phoenix/i, by: /Dumbledore/, kind: "flyer", from: ["hp", "Fawkes"], attack: "dive", colour: "#ff7a1a", sound: "b_fire" },
    { id: "aragog", name: "Aragog", match: /aragog|acromantula/i, by: /^Rubeus Hagrid$/, kind: "beast", from: ["hp", "Aragog"], attack: "melee", colour: "#2a2a2a", sound: "b_summon" },
    { id: "patronus", name: "a Patronus", match: /patronus|expecto/i, by: /^(Harry Potter|Severus Snape|Albus Dumbledore|Luna Lovegood|Hermione Granger)$/, kind: "beast", spec: "q|l|t|e8f4ff|cfe8ff|e8f4ff|e8f4ff|9fe3ff|none|none|bare|none|horns,glow,glow_eyes|fists|light", attack: "melee", colour: "#cfe8ff", sound: "b_magic", ghostly: true },
    { id: "appa", name: "Appa", match: /appa|sky bison/i, by: /^Aang$/, kind: "flyer", spec: "q|g|w|f2f0ea|8a5a32|f2f0ea|f2f0ea|3f7fd6|none|none|bare|none|horns,stripes|fists|wind", attack: "dive", colour: "#d8f3e6", sound: "b_wind" },
    { id: "gamabunta", name: "Gamabunta", match: /gamabunta|toad/i, kind: "beast", spec: "o|g|w|c0262f|e8b84a|c0262f|8a5a32|e8b84a|none|none|bare|katana|feet,grin,spots|fists|water", attack: "slam", colour: "#3fa0ff", sound: "b_slam" },
    { id: "shadows", name: "the shadow army", match: /shadow (army|soldier|extraction)|arise/i, by: /^Sung Jinwoo$/, kind: "swarm", spec: "h|m|n|1f1f2a|1a1a1a|1f1f2a|1f1f2a|8e5bd0|none|helm|armour|sword|horde,glow_eyes|blade|dark", colour: "#8e5bd0", sound: "b_rise" },
    { id: "minions", name: "the Minions", match: /minion/i, by: /^Gru$/, kind: "swarm", from: ["shows", "The Minions"], colour: "#f2cf3a", sound: "b_summon" },
    { id: "ironlegion", name: "the Iron Legion", match: /iron legion|drones|suits/i, by: /^Iron Man$/, kind: "swarm", spec: "r|m|n|9aa3ad|1a1a1a|9aa3ad|c0262f|8fe9ff|none|none|armour|none|horde,glow_eyes|beam|tech", colour: "#8fe9ff", sound: "b_beam" },
    { id: "batmobile", name: "the Batmobile", match: /batmobile|tumbler/i, by: /^Batman$/, kind: "vehicle", colour: "#2a2a33", sound: "b_plane" },
    { id: "hellcycle", name: "the Hell Cycle", match: /hell.?cycle|bike|motorcycle/i, by: /^Ghost Rider$/, kind: "vehicle", colour: "#ff7a1a", sound: "b_fire", fire: true },
    { id: "stormtroopers", name: "the 501st", match: /stormtrooper|501st|clone/i, by: /^(Darth Vader|Emperor Palpatine)$/, kind: "swarm", from: ["shows", "Stormtrooper Legion"], colour: "#f2f0ea", sound: "b_gun" },
    { id: "nazgul", name: "a Nazgûl", match: /nazg[uû]l|ringwraith|fell beast/i, by: /^Sauron$/, kind: "flyer", spec: "d|g|t|2a2a2a|1a1a1a|2a2a2a|2a2a2a|3a3a3a|none|none|bare|none|redeyes|bite|dark", attack: "dive", colour: "#2a2a2a", sound: "b_roar" },
    { id: "yoshi", name: "Yoshi", match: /yoshi/i, by: /^Mario$/, kind: "beast", from: ["smash", "Yoshi"], attack: "melee", colour: "#4caf50", sound: "b_gulp" },
    { id: "marshmallow", name: "Marshmallow", match: /marshmallow|snow (giant|monster)/i, by: /^Elsa$/, kind: "beast", spec: "h|g|w|e8f4ff|9fe3ff|e8f4ff|cfe8ff|3fa0ff|none|none|bare|claws|spikes,fangs,glow_eyes|fists|ice", attack: "slam", colour: "#9fe3ff", sound: "b_freeze" },
    { id: "groot", name: "Groot", match: /groot/i, by: /^Rocket$/, kind: "beast", from: ["marvel", "Groot"], attack: "slam", colour: "#4caf50", sound: "b_slam" },
    { id: "dragon", name: "Dragon", match: /\bdragon\b/i, by: /^(Shrek|Donkey)$/, kind: "flyer", spec: "d|g|w|e86a8a|f2cf3a|e86a8a|e86a8a|8e5bd0|none|none|bare|none|spikes|breath|fire", attack: "breath", colour: "#ff7a1a", sound: "b_roar" },
    { id: "turrets", name: "H-28G evolution turrets", match: /turret/i, by: /^Heimerdinger$/, kind: "swarm", spec: "r|s|n|9aa3ad|1a1a1a|e8b84a|5a5f66|3fa0ff|none|none|armour|cannon|horde,noarms,glow_eyes|gun|tech", colour: "#3fa0ff", sound: "b_gun" },
  ];
  function companionFor(actor, move) {
    return COMPANIONS.find(c => c.match.test(move || "")) || COMPANIONS.find(c => c.by && c.by.test(actor.name)) || null;
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
    // Who attacks and who holds the ground.
    const stance = side => ((verdict.preps || [])[side] || {}).stance;
    const attackSide = verdict.attacker != null && teams.some(t => t.name === verdict.attacker)
      ? teams.findIndex(t => t.name === verdict.attacker)
      : stance(1) === "attack" && stance(0) !== "attack" ? 1 : 0;
    const defSide = 1 - attackSide;
    const feature = featureFor(verdict, kind);
    const ground = drawFeature(feature, defSide, kind);
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
        <div class="b8__map" hidden></div>
        <div class="b8__call" hidden></div>
        <div class="b8__wipe" hidden aria-hidden="true"><span class="b8__wipe-title"></span><span class="b8__wipe-sub"></span></div>
        <div class="b8__council" hidden>
          <div class="b8__council-head"></div>
          <div class="b8__council-text" aria-live="polite"></div>
          <button type="button" class="b8__council-skip">Skip the plans</button>
        </div>
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
      const group = (((window.UNIVERSES || {})[p.world] || {}).groups || []).includes(p.name) || sprite.spec.extras.has("horde");
      return { ...p, sprite, group, unit: group ? window.Sprite.of(p, { single: true }) : null, gearOpts: {}, fast: abilitiesOf(p).has("speed"),
        hp: p.condition && p.condition.status === "injured" ? 70 : 100, downed: false, facing: p.side ? -1 : 1, alpha: 1, scale: 1 };
    });
    // Gear changes how someone looks: extras are added, a weapon replaces theirs.
    function equip(f, o) {
      const g = f.gearOpts;
      if (o.weapon) g.weapon = o.weapon;
      if (o.extras) g.extras = [...new Set([...(g.extras || []), ...o.extras])];
      f.sprite = Sprite.of(f, g);
      if (f.group) f.unit = Sprite.of(f, { ...g, single: true });
    }
    // What carrying a piece of gear looks like, if it shows.
    const WEAR = { jetpack: { extras: ["jetpack"] }, armour: { extras: ["plate"] }, mech: { extras: ["plate"] }, cloak: { extras: ["cape"] },
      scope: { extras: ["glasses"] }, shield: { extras: ["shield"] }, charm: { extras: ["glow"] } };
    const HELD = { blade: "sword", bow: "bow", gun: "gun", staff: "staff", hammer: "hammer", axe: "axe", spear: "spear", flamethrower: "gun", rocket: "cannon", cannon: "cannon" };
    function wearFor(look, f) {
      if (WEAR[look]) return WEAR[look];
      if (HELD[look] && f.sprite.spec.weapon === "none") return { weapon: HELD[look] };
      return null;
    }
    // A group's members, front to back, and the bodies it leaves behind.
    const RANKS = [[0, 0], [-10, -5], [10, -6], [-18, 2], [17, 1]];
    const fallen = [];
    const membersOf = f => f.downed ? 0 : Math.max(1, Math.min(RANKS.length, Math.ceil(f.hp / 20)));
    [0, 1].forEach(side => {
      const mine = fighters.filter(f => f.side === side).sort((a, b) => a.sprite.size - b.sprite.size);
      mine.forEach((f, i) => {
        let [sx, sy] = SLOTS[i % SLOTS.length];
        // The truly colossal loom at the back, far out to the side, and run off
        // the top of the screen: true to scale, however ridiculous.
        if (f.sprite.size >= 4) { sx = 30; sy = 140; }
        const high = side === defSide && ground.top && f.sprite.size < 4;
        f.home = { x: side ? W - sx : sx, y: high ? ground.top + 2 + (i % 3) * 3 : sy };
        // Defenders are already in place; attackers march in from the edge.
        f.pos = side === defSide ? { ...f.home } : { x: side ? W + 40 : -40, y: sy };
        f.pose = side === defSide ? "idle" : "walk"; f.poseT = 0;
      });
    });
    // Fighters back from the dead (see Battle.script) wait off-stage, unseen, until their beat.
    for (const b of beats) {
      if (b.action !== "return" || !b.person || fighters.some(f => f.key === b.person.key)) continue;
      const p = b.person, sprite = window.Sprite.of(p);
      const f = { ...p, sprite, group: false, unit: null, gearOpts: {}, hp: 100, downed: false, facing: p.side ? -1 : 1, alpha: 0, scale: 1, returning: true };
      f.home = { x: p.side ? W - 92 : 92, y: 198 };
      f.pos = { x: p.side ? W + 30 : -30, y: 198 }; f.pose = "idle"; f.poseT = 0;
      fighters.push(f);
    }
    const byKey = k => fighters.find(f => f.key === k);
    const fieldGear = [];   // items placed on the ground
    const stains = [];      // blood, oil and goo left on the ground
    let shots = [], parts = [], rings = [], flash = null, shake = 0;
    let frozen = null;      // { by, at }: time stopped by one fighter
    let ghost = null;       // a glimpse of the future: { f, x0, x1, t0, ms }
    let warpUntil = 0;      // reality bending on screen
    let clones = [];        // copies fighting alongside someone
    let giant = null;       // a colossus rising behind its summoner: { sprite, x, y, scale, rise, alpha }
    let flyer = null;       // something passing overhead: { sprite, x, y, facing, scale }
    let portals = [];       // { x, y, r, t0, until }
    let hole = null;        // a black hole: { x, y, r }
    let sepiaUntil = 0;     // time running backwards
    let cracks = [];        // ground split by an earthquake: { x, y, until }
    let companions = [];    // summoned partners that stay by their summoner
    let gas = [];           // lingering poison clouds: { x, y, until }
    let spikes = [];        // ground spikes: { x, y, t0, until }
    let domain = null;      // a domain expansion: { colour, until }
    const tints = new Map();
    const tinted = (img, c, a) => { const k = img; let m = tints.get(k); if (!m) tints.set(k, m = new Map()); if (!m.has(c)) m.set(c, Sprite.tint(img, c, a)); return m.get(c); };

    /* What a character bleeds, and how they die. */
    function gore(f) {
      const sp = f.sprite.spec;
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
    let deathStyle = "normal";   // how this beat's kills die
    async function die(f, dir, how = deathStyle) {
      koStamp(f);
      // A summoned partner fades when its summoner falls.
      companions.filter(p => p.owner === f).forEach(p => { burst(p.pos.x, p.pos.y - 10, "smoke", 12); tween(p, { alpha: 0 }, 500); });
      companions = companions.filter(p => p.owner !== f);
      const g = gore(f);
      f.downed = true; f.dead = true; setHp(f, 0);
      sfx("b_death", 0.9);
      const c = centre(f), h = 26 * f.sprite.size;
      switch (how) {
        case "disintegrate": {
          // Dust from the top down, drifting away on the wind.
          f.downed = false; setPose(f, "hurt"); f.cut = 0; f.cutFrom = "top";
          for (let i = 0; i <= 10; i++) {
            f.cut = i / 10;
            for (let k = 0; k < 6; k++) parts.push({ x: f.pos.x + rnd(-6, 6) * f.sprite.size, y: f.pos.y - h + h * f.cut + rnd(-2, 2), vx: dir * rnd(20, 60), vy: rnd(-25, -5), g: -10, c: k % 2 ? "#8a7a6a" : Sprite.shade(f.sprite.spec.main, -0.2), s: 1, t0: time, life: rnd(600, 1200) });
            await wait(110);
          }
          f.alpha = 0; f.cut = null; f.downed = true;
          return;
        }
        case "blast_off": {
          // Sent flying off into the sky, spinning, until a twinkle.
          f.downed = false; setPose(f, "hurt"); sfx("b_whoosh", 0.9);
          await Promise.all([tween(f.pos, { x: f.pos.x + dir * 140, y: -20 }, 900, t => t), tween(f, { spin: dir * 12, scale: 0.3 }, 900, t => t)]);
          f.alpha = 0; f.downed = true;
          parts.push({ x: clamp(f.pos.x, 10, W - 10), y: 12, vx: 0, vy: 0, g: 0, c: "#ffffff", s: 3, t0: time, life: 400 });
          rings.push({ x: clamp(f.pos.x, 10, W - 10), y: 12, r0: 1, r1: 6, c: "#ffffff", t0: time, ms: 400 });
          return;
        }
        case "vaporize": {
          flash = { c: "#ffffff", until: time + 250, ms: 250 };
          f.charred = 1; await wait(250);
          burst(c.x, c.y, "smoke", 20); await tween(f, { alpha: 0 }, 400);
          stains.push({ x: f.pos.x, y: f.pos.y + 1, r: 0, max: 6 * f.sprite.size, c: "#3a3530", t0: time, pool: true });
          return;
        }
        case "explode": {
          shake = time + 400; sfx("b_boom", 0.7);
          burst(c.x, c.y, "explosion", 16, true);
          if (g.kind !== "none" && g.kind !== "fade") { bleed(f, 40, dir); bleed(f, 30, -dir); }
          f.alpha = 0;
          if (g.kind === "blood" || g.kind === "goo") stains.push({ x: f.pos.x, y: f.pos.y + 1, r: 0, max: 16 * f.sprite.size, c: g.c, t0: time, pool: true });
          return;
        }
        case "crush": {
          await tween(f, { squash: 0.15 }, 160, t => t * t);
          shake = time + 300; burst(f.pos.x, f.pos.y - 2, "earth", 12);
          if (g.kind === "blood" || g.kind === "goo") stains.push({ x: f.pos.x, y: f.pos.y + 1, r: 0, max: 14 * f.sprite.size, c: g.c, t0: time, pool: true });
          return;
        }
        case "melt": {
          f.downed = false; setPose(f, "hurt"); f.cut = 0; f.cutFrom = "bottom";
          const puddle = { x: f.pos.x, y: f.pos.y + 1, r: 0, max: 12 * f.sprite.size, c: f.sprite.spec.main, t0: time, pool: true };
          stains.push(puddle);
          await tween(f, { cut: 1 }, 1200);
          f.alpha = 0; f.cut = null; f.downed = true;
          return;
        }
        case "shatter": {
          sfx("b_block", 0.9);
          for (let i = 0; i < 26; i++) { const a = rnd(0, Math.PI * 2), sp = rnd(40, 140); parts.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 260, c: i % 2 ? "#cfe8ff" : f.sprite.spec.main, s: rnd(2, 4) | 0, t0: time, life: rnd(500, 900) }); }
          f.alpha = 0;
          return;
        }
        case "burn": {
          f.downed = false; setPose(f, "hurt"); sfx("b_fire", 0.8);
          for (let i = 0; i < 8; i++) { burst(f.pos.x + rnd(-4, 4), f.pos.y - h * rnd(0.2, 0.9), "fire", 4); f.charred = i / 8; await wait(120); }
          f.downed = true; f.charred = 0.9;
          stains.push({ x: f.pos.x, y: f.pos.y + 1, r: 0, max: 8 * f.sprite.size, c: "#2a2420", t0: time, pool: true });
          return;
        }
        default: break;
      }
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
      if (WIELD[item.look] || HELD[item.look]) equip(f, { weapon: WIELD[item.look] || HELD[item.look] });
      else if (WEAR[item.look]) equip(f, WEAR[item.look]);
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
    let speed = 1;          // > 1 while a spectator catches up with the host
    let slow = 1;           // < 1 for the final blow's slow motion
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
      if (playing && !done) time += dt * speed * slow;
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
    let warpCanvas = null;
    const timer = setInterval(() => { if (stopped) return clearInterval(timer); step(); }, 30);

    function draw() {
      if (council) { drawCouncil(); placeBubbles(); return; }
      ctx.save();
      if (shake > time) ctx.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2)));
      if (punch && time - punch.t0 < punch.ms) {
        const z = 1 + 0.14 * (1 - (time - punch.t0) / punch.ms);
        ctx.translate(punch.x, punch.y); ctx.scale(z, z); ctx.translate(-punch.x, -punch.y);
      }
      ctx.drawImage(bg, 0, 0);
      drawScenery();
      ctx.drawImage(ground.canvas, 0, 0);
      drawStains();
      weather();
      if (domain && domain.until > time) {
        ctx.fillStyle = domain.colour; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + time / 3000; ctx.beginPath(); ctx.moveTo(W / 2, 90); ctx.lineTo(W / 2 + Math.cos(a) * 400, 90 + Math.sin(a) * 400); ctx.stroke(); }
      }
      for (const sp of spikes) {
        if (time > sp.until) continue;
        const k = clamp((time - sp.t0) / 180, 0, 1);
        for (let i = -3; i <= 3; i++) { const h = (14 - Math.abs(i) * 3) * k; ctx.fillStyle = i % 2 ? "#8a8f96" : "#a8acb2"; ctx.beginPath(); ctx.moveTo(sp.x + i * 5 - 3, sp.y); ctx.lineTo(sp.x + i * 5, sp.y - h); ctx.lineTo(sp.x + i * 5 + 3, sp.y); ctx.fill(); }
      }
      for (const c of cracks) {
        if (time > c.until) continue;
        ctx.fillStyle = "#1d1a17";
        for (let i = -30; i <= 30; i += 3) ctx.fillRect(Math.round(c.x + i), Math.round(c.y + Math.sin(i * 0.7) * 3), 3, 2 + (Math.abs(i) < 10 ? 2 : 0));
      }
      if (hole) {
        for (let i = 4; i >= 1; i--) { ctx.fillStyle = i === 1 ? "#000000" : `rgba(122,74,192,${0.15 * i})`; ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r * i / 2, 0, Math.PI * 2); ctx.fill(); }
        if (Math.random() < 0.6) parts.push({ x: hole.x + rnd(-40, 40), y: hole.y + rnd(-30, 30), vx: 0, vy: 0, g: 0, c: "#c8a8ff", s: 1, t0: time, life: 300 });
      }
      for (const p of portals) {
        if (time > p.until) continue;
        const k = clamp((time - p.t0) / 300, 0, 1), spin = time / 90;
        for (let i = 3; i >= 1; i--) {
          ctx.fillStyle = ["#2a7a3a", "#6aff8a", "#c8ffb0"][(i + Math.floor(spin)) % 3];
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * k * i / 3, p.r * 0.35 * k * i / 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (giant) {
        const img = giant.sprite.frame(giant.pose || "idle", time), S = img.width;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, giant.ground); ctx.clip();
        ctx.globalAlpha = giant.alpha;
        ctx.translate(Math.round(giant.x), Math.round(giant.ground + (1 - giant.rise) * S * giant.scale));
        ctx.scale(giant.facing * giant.scale, giant.scale);
        ctx.drawImage(img, -Math.floor(S / 2), -(S - 4));
        ctx.restore();
      }
      for (const c of fallen) {
        ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.scale(c.facing * c.k, c.k);
        ctx.drawImage(c.img, -Math.floor(c.img.width / 2), -(c.img.height - 4)); ctx.restore();
      }
      for (const it of fieldGear) drawGear(ctx, it.look, it.colour, it.x, it.y, time);
      const list = fighters.concat(clones).sort((a, b) => a.pos.y - b.pos.y);
      for (const f of list) {
        const pose = f.downed || f.asleep ? "ko" : f.pose;
        const t = frozen && f !== frozen.by ? frozen.at : time;   // the frozen don't move
        const body = f.disguise || (f.group ? f.unit : f.sprite);
        let img = body.frame(pose, t - f.poseT, f.flashUntil > time && ((time / 60) | 0) % 2 === 0);
        // The rest of a group, behind the one in front: fewer as it thins.
        if (f.group && !f.disguise && f.alpha > 0.01) {
          const n = membersOf(f), su = f.sprite.size * f.scale;
          for (let i = n - 1; i >= 1; i--) {
            const [dx, dy] = RANKS[i], mi = tinted(f.unit.frame(pose === "ko" ? "idle" : pose, t - f.poseT + i * 90), "#1d1a17", 0.2), MS = mi.width;
            ctx.save(); ctx.translate(Math.round(f.pos.x + dx * su * (f.facing || 1)), Math.round(f.pos.y + dy * su + (f.hop || 0)));
            ctx.scale((f.facing < 0 ? -1 : 1) * f.scale * 0.9, f.scale * 0.9); ctx.globalAlpha = clamp(f.alpha, 0, 1);
            ctx.drawImage(mi, -Math.floor(MS / 2), -(MS - 4)); ctx.restore();
          }
        }
        if (f.stone) img = tinted(img, "#8c8c8c", 0.8);
        else if (f.charred) img = tinted(img, "#1d1a17", f.charred);
        else if (f.tint) img = tinted(img, f.tint, 0.45);
        const S = img.width;
        const x = Math.round(f.pos.x), y = Math.round(f.pos.y + (f.hop || 0));
        // Speedsters leave afterimages wherever they run.
        if (f.fast && !f.downed) {
          const tr = f.trail || (f.trail = []), last = tr[tr.length - 1];
          if (!last || Math.abs(last.x - x) + Math.abs(last.y - y) > 3) tr.push({ x, y }); else if (tr.length) tr.shift();
          if (tr.length > 6) tr.shift();
          const ghost = tinted(img, "#ffe14d", 0.6);
          tr.slice(0, -1).forEach((p, i) => {
            ctx.save(); ctx.globalAlpha = 0.12 + i * 0.06; ctx.translate(p.x, p.y); ctx.scale(f.facing < 0 ? -f.scale : f.scale, f.scale);
            ctx.drawImage(ghost, -Math.floor(S / 2), -(S - 4)); ctx.restore();
          });
        }
        if (f.alpha <= 0.01) continue;
        // Dust kicked up by running feet.
        if (f.pose === "walk" && !f.downed && !f.sprite.flies && Math.random() < 0.25) parts.push({ x: x + rnd(-4, 4), y: Math.round(f.pos.y) - 1, vx: -f.facing * rnd(8, 20), vy: -rnd(4, 12), g: 10, c: "#c8b89a", s: 1, t0: time, life: 420 });
        ctx.fillStyle = `rgba(0,0,0,${(0.22 * clamp(f.alpha, 0, 1)).toFixed(2)})`;
        ctx.fillRect(x - Math.round(6 * f.sprite.size * f.scale), Math.round(f.pos.y) - 1, Math.round(12 * f.sprite.size * f.scale), 2);
        ctx.save();
        ctx.translate(x, y);
        if (f.spin) { ctx.translate(0, -12 * f.sprite.size); ctx.rotate(f.spin); ctx.translate(0, 12 * f.sprite.size); }
        ctx.scale(f.facing < 0 ? -f.scale : f.scale, f.scale * (f.squash || 1));
        ctx.globalAlpha = clamp(f.alpha, 0, 1);
        if (f.cut != null) {
          // Dissolving from the top (dust) or sinking from the bottom (melting).
          const top = -(S - 4), visible = S * (1 - f.cut);
          ctx.beginPath();
          if (f.cutFrom === "bottom") ctx.rect(-S / 2, top, S, visible); else ctx.rect(-S / 2, top + S - visible, S, visible);
          ctx.clip();
        }
        ctx.drawImage(img, -Math.floor(S / 2), -(S - 4));
        ctx.restore();
        if (f.ice) {
          const w = Math.round(16 * f.sprite.size * f.scale), h = Math.round(30 * f.sprite.size * f.scale);
          ctx.fillStyle = "rgba(170,220,255,0.5)"; ctx.fillRect(x - w / 2, y - h, w, h);
          ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(x - w / 2 + 2, y - h + 2, 2, h - 8); ctx.fillRect(x - w / 2, y - h, w, 1);
        }
        if (f.asleep && ((time / 400) | 0) % 2 === 0) { ctx.fillStyle = "#ffffff"; ctx.font = "8px monospace"; ctx.fillText("z", x + 6, y - 14 - ((time / 100) % 6)); }
        if (f.shield > time) { ctx.strokeStyle = "rgba(143,208,255,0.85)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 12 * f.sprite.size, 14 * f.sprite.size, 0, Math.PI * 2); ctx.stroke(); }
      }
      for (const gc of gas) {
        if (time > gc.until) continue;
        const fade = clamp((gc.until - time) / 600, 0, 1);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = `rgba(${gc.rgb || "139,211,74"},${(0.28 * fade).toFixed(2)})`; ctx.beginPath(); ctx.arc(gc.x + Math.sin(time / 400 + i) * 14, gc.y - 10 - (i % 3) * 7, 10 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill(); }
      }
      if (flyer) {
        const img = flyer.sprite.frame("walk", time), S = img.width;
        ctx.save(); ctx.translate(Math.round(flyer.x), Math.round(flyer.y)); ctx.scale(flyer.facing * flyer.scale, flyer.scale);
        ctx.drawImage(img, -Math.floor(S / 2), -(S - 4)); ctx.restore();
      }
      if (ghost) {
        const k = clamp((time - ghost.t0) / ghost.ms, 0, 1), g = ghost.f, img = g.sprite.frame("strike", 0);
        ctx.save(); ctx.globalAlpha = 0.35 * (1 - k * 0.5);
        ctx.translate(Math.round(lerp(ghost.x0, ghost.x1, k)), Math.round(g.pos.y));
        ctx.scale(g.facing < 0 ? -1 : 1, 1);
        ctx.drawImage(img, -Math.floor(img.width / 2), -(img.width - 4));
        ctx.restore();
      }
      for (const r of rings) { const k = (time - r.t0) / r.ms; if (k >= 0 && k < 1) { ctx.strokeStyle = r.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r0 + (r.r1 - r.r0) * k), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } }
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
      // Stopped time: the world goes grey, all but the one who stopped it.
      if (frozen) {
        ctx.save();
        ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
        const f = frozen.by, img = f.sprite.frame(f.pose, time - f.poseT);
        ctx.translate(Math.round(f.pos.x), Math.round(f.pos.y + (f.hop || 0)));
        ctx.scale(f.facing < 0 ? -f.scale : f.scale, f.scale);
        ctx.drawImage(img, -Math.floor(img.width / 2), -(img.width - 4));
        ctx.restore();
      }
      // Time running backwards: the picture goes sepia and scratchy.
      if (sepiaUntil > time) {
        ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = "#e8c890"; ctx.fillRect(0, 0, W, H); ctx.restore();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(rnd(0, W)), 0, 1, H);
      }
      // Bent reality: the picture ripples in slices and its colours flip.
      if (warpUntil > time) {
        const copy = warpCanvas || (warpCanvas = Object.assign(document.createElement("canvas"), { width: W, height: H }));
        copy.getContext("2d").drawImage(cv, 0, 0);
        for (let y = 0; y < H; y += 3) ctx.drawImage(copy, 0, y, W, 3, Math.round(Math.sin(y / 9 + time / 70) * 5), y, W, 3);
        if (((time / 120) | 0) % 3 === 0) { ctx.globalCompositeOperation = "difference"; ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
      }
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
        case "beam": { ctx.globalAlpha = 0.9; ctx.strokeStyle = s.c; ctx.lineWidth = s.w || 4; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(lerp(s.x0, s.x1, Math.min(1, k * 2)), lerp(s.y0, s.y1, Math.min(1, k * 2))); ctx.stroke();
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; break; }
        case "bolt": { if (k > 0.9) break; ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x0, s.y0);
          for (let i = 1; i <= 6; i++) ctx.lineTo(lerp(s.x0, s.x1, i / 6) + (i < 6 ? rnd(-4, 4) : 0), lerp(s.y0, s.y1, i / 6) + (i < 6 ? rnd(-6, 6) : 0)); ctx.stroke(); break; }
        case "web": { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(x, y); ctx.stroke(); break; }
        case "breath": for (let i = 0; i < 6; i++) { const kk = clamp(k - i * 0.05, 0, 1); ctx.fillStyle = i % 2 ? s.c : "#ffe14d"; const r = 2 + i; ctx.fillRect(Math.round(lerp(s.x0, s.x1, kk)) - r / 2, Math.round(lerp(s.y0, s.y1, kk) + rnd(-2, 2)), r, r); } break;
        case "hook": { ctx.strokeStyle = "#8a8f96"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = s.c; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4); ctx.fillRect(Math.round(x) + (s.x1 > s.x0 ? 2 : -4), Math.round(y) - 4, 2, 4); break; }
        case "sight": { ctx.strokeStyle = "rgba(255,40,40,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); ctx.stroke(); ctx.fillStyle = "#ff2828"; ctx.fillRect(Math.round(s.x1) - 1, Math.round(s.y1) - 1, 3, 3); break; }
        case "disc": { const px = Math.round(x), py = Math.round(y); ctx.fillStyle = "#c0262f"; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#f2f0ea"; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1f4fa8"; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill(); break; }
        case "plane": { const d = Math.sign(s.x1 - s.x0) || 1, px = Math.round(x), py = Math.round(y);
          ctx.fillStyle = "#6b7280"; ctx.fillRect(px - 8, py - 1, 16, 3); ctx.fillRect(px - 2 * d - 1, py - 6, 3, 13); ctx.fillRect(px - 8 * d - (d < 0 ? 2 : 0), py - 4, 2, 4);
          ctx.fillStyle = "#c0262f"; ctx.fillRect(px - 1, py - 1, 2, 2); break; }
        case "bomb": ctx.fillStyle = "#1d1a17"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 5); break;
        case "meteor": { const r = 8; ctx.fillStyle = "#c0262f"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ff9a2a"; ctx.beginPath(); ctx.arc(x - 1, y - 1, r - 3, 0, Math.PI * 2); ctx.fill();
          if (Math.random() < 0.8) parts.push({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(10, 40), vy: rnd(-40, -10), g: 0, c: Math.random() < 0.5 ? "#ffcc33" : "#ff7a1a", s: 2, t0: time, life: 400 });
          break; }
        case "anvil": { const px = Math.round(x), py = Math.round(y); ctx.fillStyle = "#3a3f45"; ctx.fillRect(px - 7, py - 6, 14, 3); ctx.fillRect(px - 4, py - 3, 8, 4); ctx.fillRect(px - 6, py + 1, 12, 3);
          ctx.fillStyle = "#ffffff"; ctx.fillRect(px - 7, py - 6, 14, 1); break; }
        case "tornado": { for (let i = 0; i < 9; i++) { const w = 4 + i * 2.2, yy = y - i * 4; ctx.fillStyle = i % 2 ? "rgba(216,243,230,0.85)" : "rgba(160,190,175,0.85)"; ctx.fillRect(Math.round(x - w / 2 + Math.sin(time / 60 + i) * 2), Math.round(yy), Math.round(w), 3); } break; }
        case "eyes": { ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(lerp(s.x0, s.x1, Math.min(1, k * 2)), lerp(s.y0, s.y1, Math.min(1, k * 2)));
          ctx.moveTo(s.x0, s.y0 + 2); ctx.lineTo(lerp(s.x0, s.x1, Math.min(1, k * 2)), lerp(s.y0, s.y1, Math.min(1, k * 2)) + 2); ctx.stroke(); ctx.globalAlpha = 1; break; }
        case "arm": { ctx.strokeStyle = s.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = s.c; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5); break; }
        case "drain": for (let i = 0; i < 5; i++) { const kk = (k + i * 0.18) % 1; ctx.fillStyle = s.c; ctx.fillRect(Math.round(lerp(s.x0, s.x1, kk)), Math.round(lerp(s.y0, s.y1, kk) + Math.sin(kk * 9) * 3), 2, 2); } break;
        case "note": { const px = Math.round(x), py = Math.round(y + Math.sin(time / 120 + s.x0) * 3); ctx.fillStyle = s.c; ctx.fillRect(px, py, 3, 2); ctx.fillRect(px + 2, py - 6, 1, 6); break; }
        case "rock": ctx.fillStyle = s.c; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 5); break;
        case "gear":
          if (s.scale) { ctx.save(); ctx.translate(Math.round(x), Math.round(y + 4)); ctx.scale((Math.sign(s.x1 - s.x0) || 1) * s.scale, s.scale); drawGear(ctx, s.look, s.c, 0, 0, time); ctx.restore(); }
          else drawGear(ctx, s.look, s.c, x, y + 4, time);
          break;
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
      if (callUntil && time > callUntil) { callEl.hidden = true; callUntil = 0; }
      if (!talk) return;
      if (time > talk.until) { talk.b.remove(); talk = null; return; }
      const p = talk.f.pos, top = p.y - 30 * talk.f.sprite.size;
      talk.b.style.left = `${(p.x / W) * 100}%`; talk.b.style.top = `${(top / H) * 100}%`;
    }
    function setHp(f, hp) {
      const before = f.group ? membersOf(f) : 0;
      f.hp = clamp(hp, 0, 100);
      if (f.group && f.pos && !f.downed) {
        const after = membersOf(f), su = f.sprite.size * f.scale;
        for (let i = before - 1; i >= after; i--) {
          const [dx, dy] = RANKS[i];
          const x = f.pos.x + dx * su * (f.facing || 1), y = f.pos.y + dy * su;
          fallen.push({ x, y: y + 2, img: f.unit.frame("ko", 0), facing: f.facing, k: f.scale * 0.9 });
          const g = gore(f);
          if (g.kind === "blood" || g.kind === "goo" || g.kind === "oil") stains.push({ x, y: y + 2, r: 0, max: rnd(2, 4), c: g.c, t0: time });
          burst(x, y - 8, g.kind === "blood" ? "blood" : "impact", 6);
        }
      }
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
      if (outcome === "crit" || outcome === "ko") { shake = time + 280; flash = { c: "#ffffff", until: time + 120, ms: 120 }; punch = { x: c.x, y: c.y, t0: time, ms: 380 }; }
      target.flashUntil = time + 360;
      setPose(target, "hurt");
      bleed(target, outcome === "ko" ? 18 : outcome === "crit" ? 14 : outcome === "hurt" ? 5 : 9, dir);
      if (gore(target).kind === "blood" || gore(target).kind === "goo") sfx("b_splat", outcome === "hurt" ? 0.5 : 0.8);
      const left = outcome === "ko" ? 0 : Math.max(6, target.hp - dmg);
      damageNumber(target, outcome === "crit" ? `${target.hp - left}!` : `${target.hp - left}`, outcome === "crit" ? "#ffcc33" : "#ffffff");
      if (!(outcome === "ko" && target.group)) setHp(target, left);
      await tween(target.pos, { x: target.pos.x + dir * (outcome === "crit" || outcome === "ko" ? 14 : 7) }, 160);
      if (outcome === "ko") {
        if (target.group && !skipping) for (let h = membersOf(target); h > 1; h--) { target.hp = h * 20; setHp(target, (h - 1) * 20 - 1); sfx("b_splat", 0.4, 1 + h * 0.05); await wait(130); }
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
      if (b.action === "arena_event") return arenaEvent(b);
      const actor = byKey(b.actor), target = b.target ? byKey(b.target) : null;
      if (!actor || actor.downed) return;
      const gearItem = b.gear ? gearList.find(g => g.name === b.gear) : null;
      const effect = b.effect !== "none" ? b.effect : actor.sprite.spec.element !== "none" ? actor.sprite.spec.element : "impact";
      caption.textContent = b.caption || describe(b, actor, target);
      const said = voice(beatLine(b));
      say(actor, b.line);
      if (b.callout) callout(b.callout, gearItem);
      else if (gearItem && !announced.has(gearItem.name)) callout(`${actor.name} brings out the ${gearItem.name}`, gearItem);
      else if (b.action === "fall") callout(`${feature && feature !== "open" ? `The ${feature}` : "The battlefield"} claims ${actor.name}`);
      if (gearItem) announced.add(gearItem.name);
      wield(actor, gearItem);
      callMove(b.move);
      deathStyle = b.death || "normal";
      const ranged = RANGED.has(actor.sprite.spec.style);
      const t0 = time;
      switch (b.action) {
        case "return": {
          // Not dead after all: a ghostly rise at the edge of the field, then into line.
          sfx("b_rise", 1); sfx("b_council", 0.6);
          showBanner(`<span>${esc(actor.name)} returns!</span>`, 1800);
          actor.pos = { x: actor.home.x, y: actor.home.y }; actor.alpha = 0;
          burst(actor.pos.x, actor.pos.y - 10, "dark", 20, true); shake = time + 300;
          actor.tint = "#9cc0ff";
          await tween(actor, { alpha: 1 }, 900);
          actor.tint = null;
          setPose(actor, "victory"); await wait(600); setPose(actor, "idle");
          break;
        }
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
        case "flank": {
          if (!target) break;
          // The group splits: parties swing round above and below to hit from
          // the sides while the main body comes straight on.
          sfx("b_rise", 0.6); sfx("b_whoosh", 0.8);
          const unit = actor.unit || actor.sprite;
          const parties = [-1, 1].map(k => ({ ...actor, group: false, sprite: unit, key: `${actor.key}~f${k}`, pos: { x: actor.pos.x, y: actor.pos.y + k * 6 }, alpha: 1, pose: "walk", poseT: time, hop: 0 }));
          parties.forEach(c => clones.push(c));
          const lost = actor.group ? Math.min(2, membersOf(actor) - 1) : 0;
          if (lost > 0) actor.hp = Math.max(21, actor.hp - lost * 20) ;
          await Promise.all([
            approach(actor, target),
            ...parties.map((c, i) => tween(c.pos, { x: lerp(actor.pos.x, target.pos.x, 0.5), y: target.pos.y + (i ? 34 : -34) }, 380)
              .then(() => tween(c.pos, { x: target.pos.x + actor.facing * (i ? 12 : 16), y: target.pos.y + (i ? 6 : -6) }, 320))
              .then(() => { c.facing = -actor.facing; })),
          ]);
          [actor, ...parties].forEach(f => setPose(f, "windup")); await wait(140);
          [actor, ...parties].forEach(f => setPose(f, "strike")); sfx("b_slash", 1); sfx("b_punch", 0.7);
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "slash", 18);
          await land(target, b.outcome, effect, actor);
          await Promise.all(parties.map(c => { setPose(c, "walk"); c.facing = actor.facing; return tween(c.pos, { x: actor.home.x, y: actor.home.y + (c.pos.y > target.pos.y ? 8 : -8) }, 450); }));
          clones = clones.filter(c => !parties.includes(c));
          if (lost > 0) setHp(actor, actor.hp);
          await goHome(actor);
          break;
        }
        case "deploy_gear": case "trap": {
          const item = gearItem || { look: b.action === "trap" ? "trap" : "device", colour: COLOURS.cyan, name: "" };
          const placed = placeGear(item, actor);
          sfx("b_deploy", 0.8);
          await wait(350);
          const look = item.look;
          const support = ["potion", "armour", "banner", "shield", "wall"].includes(look);
          if (look === "medkit" || look === "charm") {
            fieldGear.splice(fieldGear.indexOf(placed), 1);
            await supportGear(look, actor);
          } else if (target && GEAR_MOVES.has(look)) {
            fieldGear.splice(fieldGear.indexOf(placed), 1);
            const fx = await gearMove(look, actor, target, item, b);
            await land(target, b.outcome, b.effect !== "none" ? b.effect : fx || "impact", actor);
            if (!actor.downed && Math.abs(actor.pos.x - actor.home.x) > 4) await goHome(actor);
          } else if (support) {
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
        case "time_stop": {
          setPose(actor, "cast"); sfx("b_timestop", 1);
          rings.push({ x: centre(actor).x, y: centre(actor).y, r0: 4, r1: 160, c: "#ffffff", t0: time, ms: 700 });
          frozen = { by: actor, at: time };
          await wait(600);
          // Stopping time without striking: the world holds still, then moves on.
          if (!target || ["none", "blocked", "dodged", "miss"].includes(b.outcome)) {
            setPose(actor, "victory"); await wait(900);
            frozen = null; flash = { c: "#ffffff", until: time + 150, ms: 150 };
            setPose(actor, "idle");
            break;
          }
          await approach(actor, target);
          for (let i = 0; i < 3; i++) {
            setPose(actor, "windup"); await wait(110);
            setPose(actor, "strike"); sfx("b_punch", 0.5, 0.8);
            burst(centre(target).x, centre(target).y + rnd(-4, 4), b.effect !== "none" ? b.effect : "impact", 4);
            await wait(130);
          }
          await goHome(actor);
          await wait(250);
          frozen = null; sfx("b_crit", 1); flash = { c: "#ffffff", until: time + 200, ms: 200 };
          await land(target, b.outcome === "hit" ? "crit" : b.outcome, effect, actor);
          setPose(actor, "idle");
          break;
        }
        case "foresee": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_magic", 0.8, 0.8);
          burst(centre(actor).x, centre(actor).y - 6 * actor.sprite.size, "psychic", 8);
          // A glimpse of the attack that's coming…
          ghost = { f: target, x0: target.pos.x, x1: actor.pos.x - target.facing * 14 * target.sprite.size, t0: time, ms: 650 };
          await wait(700); ghost = null;
          // …so when it comes for real, it finds nothing there.
          setPose(target, "strike");
          await Promise.all([tween(target.pos, { x: actor.pos.x - target.facing * 14 * target.sprite.size }, 280), (async () => { await wait(120); actor.hop = -8; await tween(actor.pos, { x: actor.pos.x - actor.facing * 16 }, 160); actor.hop = 0; })()]);
          damageNumber(actor, "foreseen", "#ff6ad5"); sfx("b_whoosh", 0.8);
          setPose(actor, "strike"); sfx("b_slash", 0.9);
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "slash", 10);
          await land(target, b.outcome, effect, actor);
          await Promise.all([goHome(actor), goHome(target)]);
          break;
        }
        case "mind_control": {
          if (!target) break;
          const victim = (b.victims || []).map(byKey).find(Boolean) || target;
          setPose(actor, "cast"); sfx("b_psychic", 0.9);
          for (let i = 0; i < 3; i++) { rings.push({ x: centre(target).x, y: centre(target).y - 6, r0: 2, r1: 14, c: "#ff6ad5", t0: time, ms: 400 }); await wait(160); }
          damageNumber(target, "controlled", "#ff6ad5");
          if (victim !== target) {
            target.facing = -target.facing;
            await approach(target, victim);
            setPose(target, "windup"); await wait(150);
            setPose(target, "strike"); sfx("b_slash", 0.8);
            burst(centre(victim).x, centre(victim).y, "psychic", 10);
            await land(victim, b.outcome, "psychic", target);
            target.facing = target.side ? -1 : 1;
            await goHome(target);
          } else { setPose(target, "hurt"); await land(target, b.outcome, "psychic", actor); }
          setPose(actor, "idle");
          break;
        }
        case "clone": {
          if (!target) break;
          sfx("b_teleport", 0.8);
          // Shadow-clone users bring a crowd; anyone else, a pair.
          const many = /shadow|kage|multi/i.test(b.move || "") || /^(Naruto Uzumaki|Twice|Ectoplasm|Splinter|Multiple Man)$/.test(actor.name);
          const offs = many ? [-2, -1, 1, 2] : [-1, 1];
          const copies = offs.map(k => ({ ...actor, key: `${actor.key}~${k}`, pos: { x: actor.pos.x - actor.facing * 6, y: actor.pos.y + k * 8 }, alpha: 0.85, pose: "idle", poseT: time, hop: 0 }));
          copies.forEach(c => { burst(c.pos.x, c.pos.y - 8, "smoke", 8); clones.push(c); });
          await wait(300);
          await Promise.all([approach(actor, target), ...copies.map((c, i) => { setPose(c, "walk"); const k = offs[i]; return tween(c.pos, { x: target.pos.x - actor.facing * (12 + Math.abs(k) * 5) * (k % 2 ? 1 : -1), y: target.pos.y + k * 7 }, 420); })]);
          copies.forEach(c => { if (Math.abs(c.pos.x - target.pos.x) > 0) c.facing = Math.sign(target.pos.x - c.pos.x) || actor.facing; });
          [actor, ...copies].forEach(f => setPose(f, "windup")); await wait(150);
          [actor, ...copies].forEach(f => setPose(f, "strike")); sfx("b_punch", 0.9);
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "impact", 16);
          await land(target, b.outcome, effect, actor);
          copies.forEach(c => burst(c.pos.x, c.pos.y - 8, "smoke", 8));
          clones = clones.filter(c => !copies.includes(c));
          await goHome(actor);
          break;
        }
        case "shapeshift": {
          if (!target) break;
          sfx("b_transform", 0.7); burst(centre(actor).x, centre(actor).y, "smoke", 14);
          actor.disguise = target.sprite;
          await wait(400);
          await approach(actor, target);
          await wait(250);
          burst(centre(actor).x, centre(actor).y, "smoke", 12); actor.disguise = null;
          setPose(actor, "strike"); sfx("b_slash", 1);
          await land(target, b.outcome === "hit" ? "crit" : b.outcome, effect, actor);
          await goHome(actor);
          break;
        }
        case "regenerate": {
          setPose(actor, "cast"); sfx("b_heal", 0.9);
          for (let i = 0; i < 5; i++) { burst(centre(actor).x, centre(actor).y, "heal", 5); await wait(120); }
          setHp(actor, actor.hp + 40); damageNumber(actor, "+40", "#6aff8a");
          await wait(300); setPose(actor, "idle");
          break;
        }
        case "phase": {
          sfx("b_teleport", 0.6);
          await tween(actor, { alpha: 0.35 }, 200);
          if (target) {
            setPose(actor, "walk");
            await tween(actor.pos, { x: target.pos.x + actor.facing * 16, y: target.pos.y }, 500);
            actor.facing = -actor.facing; await tween(actor, { alpha: 1 }, 120);
            setPose(actor, "strike"); sfx("b_slash", 0.9);
            await land(target, b.outcome, effect, actor);
            actor.facing = actor.side ? -1 : 1;
            await tween(actor, { alpha: 0.35 }, 120); await goHome(actor);
          } else await wait(800);
          await tween(actor, { alpha: 1 }, 200);
          break;
        }
        case "fly": {
          sfx("b_whoosh", 0.8);
          await tween(actor, { hop: -40 }, 400);
          if (target) {
            await tween(actor.pos, { x: target.pos.x - actor.facing * 30 }, 350);
            setPose(actor, "cast");
            const a = { ...actor, pos: { x: actor.pos.x, y: actor.pos.y - 40 } };
            await fire(a, target, shotFor(actor, b.effect, null), effect);
            await land(target, b.outcome, effect, actor);
            await goHome(actor);
          } else await wait(600);
          await tween(actor, { hop: 0 }, 300);
          setPose(actor, "idle");
          break;
        }
        case "grow": case "shrink": {
          const grow = b.action === "grow", was = actor.scale;
          sfx(grow ? "b_transform" : "b_teleport", 0.8);
          await tween(actor, { scale: grow ? 1.9 : 0.45 }, 350);
          if (grow) shake = time + 300;
          if (target) {
            await approach(actor, target);
            setPose(actor, grow ? "windup" : "strike"); await wait(150);
            setPose(actor, "strike");
            if (grow) { sfx("b_slam", 0.5); shake = time + 400; burst(target.pos.x, target.pos.y, "earth", 18, true); }
            else sfx("b_slash", 0.8);
            await land(target, b.outcome === "hit" && !grow ? "crit" : b.outcome, effect, actor);
            await goHome(actor);
          } else await wait(600);
          await tween(actor, { scale: was }, 300);
          break;
        }
        case "reality_warp": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_warp", 1);
          warpUntil = time + 1100;
          await wait(900);
          burst(centre(target).x, centre(target).y, effect === "impact" ? "psychic" : effect, 18, true);
          await land(target, b.outcome, effect === "impact" ? "psychic" : effect, actor);
          setPose(actor, "idle");
          break;
        }
        case "summon_dragon": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_roar", 1);
          callMove(b.move || "Dracarys");
          const dragon = Sprite.of({ world: "westeros", name: (["Viserion", "Rhaegal", "Vhagar", "Caraxes", "Meleys", "Sunfyre"].find(n => new RegExp(n, "i").test(b.move || "")) || (/ice/i.test(b.move || "") ? "Viserion" : "Drogon")), note: "" }, { size: "g" });
          flyer = { sprite: dragon, x: actor.facing > 0 ? -60 : W + 60, y: 70, facing: actor.facing, scale: 1 };
          await tween(flyer, { x: target.pos.x - actor.facing * 70, y: 80 }, 900);
          const breath = { kind: "breath", x0: flyer.x + actor.facing * 22, y0: flyer.y - 20, x1: target.pos.x, y1: target.pos.y - 10, c: FX[b.effect !== "none" ? b.effect : "fire"] || FX.fire, t0: time, ms: 700 };
          shots.push(breath); sfx("b_fire", 1); await wait(700); shots = shots.filter(q => q !== breath);
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "fire", 26, true); shake = time + 400;
          stains.push({ x: target.pos.x, y: target.pos.y + 2, r: 0, max: 14, c: "#2a2420", t0: time, pool: true });
          await Promise.all([land(target, b.outcome, b.effect !== "none" ? b.effect : "fire", actor), tween(flyer, { x: actor.facing > 0 ? W + 80 : -80, y: 30 }, 900)]);
          flyer = null; setPose(actor, "idle");
          break;
        }
        case "summon_giant": {
          if (!target) break;
          const m = String(b.move || "").toLowerCase();
          const spec = /exodia/.test(m) ? "h|x|w|c8a060|1a1a1a|c8a060|8a5a32|ffe14d|none|helm|bare|none|glow,glow_eyes,stripes|fists|light"
            : /susanoo/.test(m) ? "h|x|w|8e5bd0|8e5bd0|8e5bd0|5b3a7a|ff6ad5|none|helm|armour|katana|glow,glow_eyes|blade|psychic"
            : /titan/.test(m) ? "h|x|w|c06a4a|1a1a1a|c06a4a|8a3a2a|ff7a1a|none|none|bare|none|stripes,glow_eyes|fists|fire"
            : `h|x|w|${actor.sprite.spec.accent.slice(1)}|1a1a1a|${actor.sprite.spec.accent.slice(1)}|3a3a3a|ffe14d|none|helm|armour|none|glow,glow_eyes|fists|light`;
          setPose(actor, "cast"); sfx("b_rise", 1); shake = time + 1400;
          giant = { sprite: Sprite.of({ world: "summon", name: m || "giant", spec }), x: actor.pos.x - actor.facing * 24, ground: actor.pos.y + 2, scale: 2.4, rise: 0, alpha: 1, facing: actor.facing, pose: "idle" };
          for (let i = 0; i < 8; i++) burst(actor.pos.x - actor.facing * 24 + rnd(-20, 20), actor.pos.y, "earth", 3);
          await tween(giant, { rise: 1 }, 1300);
          flash = { c: "#fff4b0", until: time + 300, ms: 300 };
          giant.pose = "strike"; sfx("b_boom", 1); shake = time + 600;
          const beam = { kind: "beam", x0: giant.x + actor.facing * 20, y0: giant.ground - 60, x1: target.pos.x, y1: target.pos.y - 10, c: FX[b.effect !== "none" ? b.effect : "light"] || "#fff4b0", t0: time, ms: 500 };
          shots.push(beam); await wait(500); shots = shots.filter(q => q !== beam);
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "explosion", 30, true);
          await land(target, b.outcome, b.effect !== "none" ? b.effect : "explosion", actor);
          giant.pose = "idle";
          await tween(giant, { rise: 0, alpha: 0 }, 900);
          giant = null; setPose(actor, "idle");
          break;
        }
        case "raise_dead": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_rise", 0.9);
          // The fallen stand back up, pale and blue-eyed. With nobody dead yet, skeletons claw out of the ground.
          let bodies = fighters.filter(f => f.dead && f.alpha > 0.01).slice(0, 4);
          const risen = (bodies.length ? bodies : [0, 1, 2].map(i => ({ sprite: Sprite.of({ world: "summon", name: "skeleton", spec: "h|m|t|e8e4d8|e8e4d8|e8e4d8|e8e4d8|6af0ff|bald|none|bare|sword|glow_eyes,stripes|blade|dark" }),
            pos: { x: actor.pos.x - actor.facing * (14 + i * 12), y: actor.pos.y + (i - 1) * 12 }, key: `skeleton${i}` }))).map(f => {
            const w = { ...f, key: `${f.key}~risen`, pos: { ...f.pos }, alpha: 1, scale: 1, dead: false, downed: true, tint: "#8fd0ff", facing: actor.facing, pose: "ko", poseT: time, hop: 0 };
            f.hiddenBody = true; if (f.alpha != null) f.bodyAlpha = f.alpha, f.alpha = 0;
            return w;
          });
          risen.forEach(w => { clones.push(w); burst(w.pos.x, w.pos.y - 4, "ice", 8); });
          await wait(500);
          risen.forEach(w => { w.downed = false; setPose(w, "idle"); });
          sfx("b_death", 0.5, 0.7);
          await wait(300);
          await Promise.all(risen.map((w, i) => { setPose(w, "walk"); return tween(w.pos, { x: target.pos.x - actor.facing * (12 + i * 5), y: target.pos.y + (i % 2 ? 6 : -6) }, 900 + i * 100); }));
          risen.forEach(w => setPose(w, "strike")); sfx("b_slash", 0.9);
          burst(centre(target).x, centre(target).y, "ice", 14);
          await land(target, b.outcome, b.effect !== "none" ? b.effect : "ice", actor);
          await wait(300);
          risen.forEach(w => { burst(w.pos.x, w.pos.y - 6, "smoke", 8); });
          clones = clones.filter(c => !risen.includes(c));
          fighters.filter(f => f.hiddenBody).forEach(f => { f.alpha = f.bodyAlpha != null ? f.bodyAlpha : 1; f.hiddenBody = false; });
          setPose(actor, "idle");
          break;
        }
        case "stampede": {
          if (!target) break;
          sfx("b_slam", 0.4); shake = time + 1500;
          const herd = actor.sprite.spec.extras.has("horde") || actor.sprite.spec.body !== "h" ? actor.sprite
            : Sprite.of({ world: "summon", name: "warhorse", spec: "q|l|n|6b4a2a|1a1a1a|6b4a2a|6b4a2a|e8b84a|none|none|bare|none|mane|bite|none" });
          const runners = [0, 1, 2, 3, 4, 5].map(i => ({ key: `run${i}`, sprite: herd, pos: { x: actor.facing > 0 ? -30 - i * 18 : W + 30 + i * 18, y: 140 + (i % 3) * 22 }, alpha: 1, scale: 1, facing: actor.facing, pose: "walk", poseT: time, hop: 0 }));
          runners.forEach(rn => clones.push(rn));
          const hit = fighters.filter(f => f.side !== actor.side && !f.downed && f !== target);
          await Promise.all(runners.map((rn, i) => wait(i * 80).then(() => tween(rn.pos, { x: actor.facing > 0 ? W + 60 : -60 }, 1600, t => t))));
          clones = clones.filter(c => !runners.includes(c));
          burst(centre(target).x, target.pos.y - 3, "earth", 20, true);
          await Promise.all([land(target, b.outcome, "impact", actor), ...hit.slice(0, 2).map(f => land(f, "hurt", "impact", actor))]);
          break;
        }
        case "airstrike": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_plane", 1);
          const planes = [0, 1, 2].map(i => ({ kind: "plane", x0: actor.facing > 0 ? -30 - i * 30 : W + 30 + i * 30, y0: 24 + i * 10, x1: actor.facing > 0 ? W + 40 : -40, y1: 24 + i * 10, c: "#6b7280", t0: time + i * 150, ms: 1700 }));
          planes.forEach(pl => shots.push(pl));
          await wait(700);
          for (let i = 0; i < 6; i++) {
            const x = target.pos.x + rnd(-26, 26);
            const bomb = { kind: "bomb", x0: x - actor.facing * 20, y0: 30, x1: x, y1: target.pos.y - 2, c: "#1d1a17", t0: time, ms: 420 };
            shots.push(bomb);
            setTimeout(() => { shots = shots.filter(q => q !== bomb); }, 450);
            wait(420).then(() => { burst(x, target.pos.y - 4, "explosion", 12, i % 2 === 0); sfx("b_boom", 0.5); shake = time + 200; });
            await wait(140);
          }
          await wait(500);
          await land(target, b.outcome, "explosion", actor);
          await wait(400); shots = shots.filter(q => !planes.includes(q));
          setPose(actor, "idle");
          break;
        }
        case "meteor": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_meteor", 1);
          const m = { kind: "meteor", x0: target.pos.x + actor.facing * 140, y0: -20, x1: target.pos.x, y1: target.pos.y - 6, c: "#ff7a1a", t0: time, ms: 1100 };
          shots.push(m); await wait(1100); shots = shots.filter(q => q !== m);
          flash = { c: "#ffffff", until: time + 300, ms: 300 }; shake = time + 900; sfx("b_boom", 1);
          burst(target.pos.x, target.pos.y - 6, "explosion", 40, true);
          rings.push({ x: target.pos.x, y: target.pos.y, r0: 4, r1: 70, c: "#ff9a2a", t0: time, ms: 700 });
          stains.push({ x: target.pos.x, y: target.pos.y + 2, r: 0, max: 22, c: "#2a2420", t0: time, pool: true });
          const near = fighters.filter(f => f !== target && !f.downed && Math.abs(f.pos.x - target.pos.x) < 50);
          await Promise.all([land(target, b.outcome, "fire", actor), ...near.map(f => land(f, "hurt", "fire", actor))]);
          setPose(actor, "idle");
          break;
        }
        case "lullaby": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_sing", 1);
          const notes = [0, 1, 2, 3, 4].map(i => ({ kind: "note", x0: actor.pos.x + actor.facing * 8, y0: actor.pos.y - 20, x1: target.pos.x + rnd(-10, 10), y1: target.pos.y - 26 + rnd(-6, 6), c: ["#ff6ad5", "#8fd0ff", "#fff4b0"][i % 3], t0: time + i * 160, ms: 900 }));
          notes.forEach(n => shots.push(n)); await wait(1500); shots = shots.filter(q => !notes.includes(q));
          if (b.outcome === "ko") { target.asleep = true; await wait(700); target.asleep = false; await land(target, "ko", "psychic", actor); }
          else if (["dodged", "blocked", "miss"].includes(b.outcome)) await land(target, b.outcome, "psychic", actor);
          else { target.asleep = true; damageNumber(target, "asleep", "#8fd0ff"); await wait(1300); target.asleep = false; if (b.outcome !== "none") await land(target, b.outcome, "psychic", actor); }
          setPose(actor, "idle");
          break;
        }
        case "devour": {
          if (!target) break;
          await approach(actor, target);
          setPose(actor, "strike"); sfx("b_gulp", 1);
          const mouth = { x: actor.pos.x + actor.facing * 6, y: actor.pos.y };
          await Promise.all([tween(target, { scale: 0.2 }, 500), tween(target.pos, mouth, 500)]);
          if (b.outcome === "ko") {
            target.alpha = 0; target.downed = true; target.dead = true; setHp(target, 0); sfx("b_death", 0.6);
            await tween(actor, { scale: actor.scale * 1.25 }, 200); await tween(actor, { scale: actor.scale / 1.25 }, 300);
          } else {
            await wait(400); sfx("b_punch", 0.9);
            await Promise.all([tween(target, { scale: 1 }, 300), tween(target.pos, { x: target.home.x, y: target.home.y }, 300)]);
            await land(target, b.outcome === "none" ? "hurt" : b.outcome, "impact", actor);
          }
          await goHome(actor);
          break;
        }
        case "portal": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_portal", 1);
          const pt = { x: target.pos.x, y: target.pos.y + 1, r: 16, t0: time, until: time + 99999 };
          portals.push(pt); await wait(400);
          await Promise.all([tween(target, { hop: 20 }, 400), tween(target, { alpha: 0 }, 400)]);
          if (b.outcome === "ko") { target.downed = true; target.dead = true; setHp(target, 0); sfx("b_death", 0.5); }
          else {
            const top = { x: target.pos.x, y: 10, r: 14, t0: time, until: time + 900 }; portals.push(top);
            target.hop = -140; target.alpha = 1; sfx("b_whoosh", 0.8);
            await tween(target, { hop: 0 }, 450, t => t * t);
            shake = time + 250; burst(target.pos.x, target.pos.y - 2, "earth", 12);
            await land(target, b.outcome === "none" ? "hurt" : b.outcome, "impact", actor);
          }
          pt.until = time + 300;
          setPose(actor, "idle");
          break;
        }
        case "freeze": case "petrify": {
          if (!target) break;
          const ice = b.action === "freeze";
          setPose(actor, "cast"); sfx(ice ? "b_freeze" : "b_stone", 1);
          if (ice) { const sh = { kind: "beam", x0: centre(actor).x, y0: centre(actor).y, x1: centre(target).x, y1: centre(target).y, c: FX.ice, t0: time, ms: 400 }; shots.push(sh); await wait(400); shots = shots.filter(q => q !== sh); }
          else { for (let i = 0; i < 3; i++) { rings.push({ x: centre(target).x, y: centre(target).y, r0: 20, r1: 2, c: "#8c8c8c", t0: time, ms: 400 }); await wait(150); } }
          if (["dodged", "blocked", "miss"].includes(b.outcome)) { await land(target, b.outcome, ice ? "ice" : "earth", actor); setPose(actor, "idle"); break; }
          if (ice) target.ice = true; else target.stone = true;
          target.frozenPose = target.pose;
          damageNumber(target, ice ? "frozen" : "stone", ice ? "#9fe3ff" : "#cfcfcf");
          await wait(1100);
          if (b.outcome === "ko") {
            burst(centre(target).x, centre(target).y, ice ? "ice" : "earth", 30, true); sfx(ice ? "b_block" : "b_boom", 0.9);
            target.ice = false; target.alpha = 0; target.downed = true; target.dead = true; setHp(target, 0); sfx("b_death", 0.5);
          } else {
            burst(centre(target).x, centre(target).y, ice ? "ice" : "earth", 12);
            target.ice = false; target.stone = false;
            if (b.outcome !== "none") await land(target, b.outcome, ice ? "ice" : "earth", actor);
          }
          setPose(actor, "idle");
          break;
        }
        case "anvil": {
          if (!target) break;
          setPose(actor, "victory"); sfx("b_whoosh", 0.7, 0.6);
          const an = { kind: "anvil", x0: target.pos.x, y0: -20, x1: target.pos.x, y1: target.pos.y - 26 * target.sprite.size, c: "#3a3f45", t0: time, ms: 700 };
          shots.push(an); await wait(700); shots = shots.filter(q => q !== an);
          sfx("b_anvil", 1); shake = time + 300;
          for (let i = 0; i < 5; i++) parts.push({ x: centre(target).x + Math.cos(i * 1.26) * 10, y: centre(target).y - 16 + Math.sin(i * 1.26) * 3, vx: 0, vy: 0, g: 0, c: "#ffe14d", s: 2, t0: time, life: 900 });
          await tween(target, { scale: target.scale * 0.6 }, 120);
          await land(target, b.outcome === "none" ? "hurt" : b.outcome, "impact", actor);
          if (!target.downed) await tween(target, { scale: 1 }, 300);
          setPose(actor, "idle");
          break;
        }
        case "shout": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_shout", 1);
          for (let i = 0; i < 4; i++) { rings.push({ x: centre(actor).x + actor.facing * 8, y: centre(actor).y, r0: 4, r1: 90, c: i % 2 ? "#ffffff" : FX[b.effect] || "#d8f3e6", t0: time + i * 90, ms: 600 }); }
          shake = time + 600; await wait(450);
          const blown = fighters.filter(f => f !== target && f.side !== actor.side && !f.downed && Math.abs(f.pos.y - target.pos.y) < 30);
          await Promise.all([land(target, b.outcome, "wind", actor), ...blown.slice(0, 2).map(f => land(f, "hurt", "wind", actor))]);
          setPose(actor, "idle");
          break;
        }
        case "black_hole": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_warp", 1);
          hole = { x: target.pos.x, y: target.pos.y - 30, r: 2 };
          await tween(hole, { r: 14 }, 500);
          await Promise.all([tween(target.pos, { x: hole.x, y: hole.y + 18 }, 700), tween(target, { scale: 0.5, hop: -10 }, 700)]);
          if (b.outcome === "ko") { await tween(target, { scale: 0.05, alpha: 0 }, 300); target.downed = true; target.dead = true; setHp(target, 0); sfx("b_death", 0.5); }
          else { await Promise.all([tween(target, { scale: 1, hop: 0 }, 300), tween(target.pos, { x: target.home.x, y: target.home.y }, 300)]); await land(target, b.outcome, "dark", actor); }
          await tween(hole, { r: 0 }, 300); hole = null;
          setPose(actor, "idle");
          break;
        }
        case "earthquake": {
          if (!target) break;
          setPose(actor, "strike"); sfx("b_quake", 1); shake = time + 1400;
          const crack = { x: target.pos.x, y: target.pos.y + 2, until: time + 99999 }; cracks.push(crack);
          for (let i = 0; i < 10; i++) { burst(target.pos.x + rnd(-30, 30), target.pos.y, "earth", 3); await wait(80); }
          const shaken = fighters.filter(f => f !== target && f.side !== actor.side && !f.downed && Math.abs(f.pos.x - target.pos.x) < 45);
          await Promise.all([land(target, b.outcome, "earth", actor), ...shaken.map(f => land(f, "hurt", "earth", actor))]);
          crack.until = time + 2500;
          setPose(actor, "idle");
          break;
        }
        case "tornado": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_wind", 1);
          const tw = { kind: "tornado", x0: actor.pos.x + actor.facing * 20, y0: actor.pos.y, x1: target.pos.x, y1: target.pos.y, c: "#d8f3e6", t0: time, ms: 900 };
          shots.push(tw); await wait(900);
          await tween(target, { hop: -40 }, 400);
          tw.x0 = tw.x1 = target.pos.x; tw.y0 = tw.y1 = target.pos.y; tw.t0 = time; tw.ms = 600;
          await wait(500); shots = shots.filter(q => q !== tw);
          await tween(target, { hop: 0 }, 300, t => t * t);
          await land(target, b.outcome, "wind", actor);
          setPose(actor, "idle");
          break;
        }
        case "lightning_storm": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_charge", 0.8);
          flash = { c: "#1a1a3a", until: time + 1800, ms: 1800 };
          const foes = fighters.filter(f => f.side !== actor.side && !f.downed);
          for (let i = 0; i < 7; i++) {
            const f = i % 3 === 0 ? target : foes[i % foes.length] || target;
            const bolt = { kind: "bolt", x0: f.pos.x + rnd(-10, 10), y0: 0, x1: f.pos.x, y1: f.pos.y - 4, c: "#ffe14d", t0: time, ms: 220 };
            shots.push(bolt); sfx("b_beam", 0.5);
            setTimeout(() => { shots = shots.filter(q => q !== bolt); }, 240);
            burst(f.pos.x, f.pos.y - 4, "lightning", 6);
            await wait(170);
          }
          shake = time + 300;
          const others = foes.filter(f => f !== target).slice(0, 2);
          await Promise.all([land(target, b.outcome, "lightning", actor), ...others.map(f => land(f, "hurt", "lightning", actor))]);
          setPose(actor, "idle");
          break;
        }
        case "time_rewind": {
          setPose(actor, "cast"); sfx("b_rewind", 1);
          sepiaUntil = time + 1600;
          stains.splice(Math.max(0, stains.length - 6));   // the latest blood runs backwards
          for (let i = 0; i < 6; i++) { burst(centre(actor).x, centre(actor).y, "light", 4); await wait(180); }
          setHp(actor, 100); damageNumber(actor, "rewound", "#e8c890");
          await wait(500); setPose(actor, "idle");
          break;
        }
        case "stretch": {
          if (!target) break;
          setPose(actor, "windup"); await wait(250);
          setPose(actor, "strike"); sfx("b_whoosh", 0.8);
          const arm = { kind: "arm", x0: centre(actor).x + actor.facing * 6, y0: centre(actor).y, x1: centre(target).x, y1: centre(target).y, c: actor.sprite.spec.skin, t0: time, ms: 300 };
          shots.push(arm); await wait(300); sfx("b_punch", 1);
          burst(centre(target).x, centre(target).y, "impact", 12);
          shots = shots.filter(q => q !== arm);
          await land(target, b.outcome, "impact", actor);
          setPose(actor, "idle");
          break;
        }
        case "drain": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_drain", 1);
          const d = { kind: "drain", x0: centre(target).x, y0: centre(target).y, x1: centre(actor).x, y1: centre(actor).y, c: b.effect === "psychic" ? "#ff6ad5" : "#c0262f", t0: time, ms: 1400 };
          shots.push(d); target.flashUntil = time + 1400;
          await wait(1400); shots = shots.filter(q => q !== d);
          setHp(actor, actor.hp + 25); damageNumber(actor, "+25", "#6aff8a");
          await land(target, b.outcome, b.effect !== "none" ? b.effect : "blood", actor);
          setPose(actor, "idle");
          break;
        }
        case "laser_eyes": {
          if (!target) break;
          setPose(actor, "shoot"); sfx("b_beam", 1);
          const eyes = { kind: "eyes", x0: centre(actor).x + actor.facing * 3, y0: actor.pos.y - (actor.sprite.size * 24 - 2), x1: centre(target).x, y1: centre(target).y, c: FX[b.effect] && b.effect !== "none" ? FX[b.effect] : "#ff3a2a", t0: time, ms: 700 };
          shots.push(eyes); await wait(700); shots = shots.filter(q => q !== eyes);
          burst(centre(target).x, centre(target).y, "fire", 14);
          await land(target, b.outcome, "fire", actor);
          setPose(actor, "idle");
          break;
        }
        case "self_destruct": {
          if (!target) break;
          await approach(actor, target);
          sfx("b_charge", 0.8);
          for (let i = 0; i < 6; i++) { actor.flashUntil = time + 120; actor.scale = 1 + i * 0.05; await wait(160); }
          sfx("b_boom", 1); flash = { c: "#ffffff", until: time + 300, ms: 300 }; shake = time + 800;
          burst(centre(actor).x, centre(actor).y, "explosion", 40, true);
          rings.push({ x: centre(actor).x, y: centre(actor).y, r0: 4, r1: 60, c: "#ff9a2a", t0: time, ms: 600 });
          stains.push({ x: actor.pos.x, y: actor.pos.y + 2, r: 0, max: 18, c: "#2a2420", t0: time, pool: true });
          actor.alpha = 0; actor.downed = true; actor.dead = true; setHp(actor, 0);
          await land(target, b.outcome, "explosion", actor);
          break;
        }
        case "telekinesis": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_psychic", 1);
          for (let i = 0; i < 3; i++) rings.push({ x: centre(target).x, y: centre(target).y, r0: 12, r1: 4, c: "#ff6ad5", t0: time + i * 120, ms: 400 });
          await tween(target, { hop: -46 }, 700);
          await wait(250);
          sfx("b_slam", 0.5);
          await tween(target, { hop: 0 }, 180, t => t * t);
          shake = time + 400; burst(target.pos.x, target.pos.y - 2, "earth", 18, true);
          await land(target, b.outcome, "psychic", actor);
          setPose(actor, "idle");
          break;
        }
        case "spin_dash": {
          if (!target) break;
          sfx("b_spin", 1);
          setPose(actor, "hurt");
          for (let i = 0; i < 4; i++) { burst(actor.pos.x - actor.facing * 6, actor.pos.y - 4, "smoke", 3); await wait(90); }
          await tween(actor.pos, { x: target.pos.x + actor.facing * 10, y: target.pos.y }, 260, t => t);
          sfx("b_punch", 1); burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "impact", 14);
          await land(target, b.outcome, "impact", actor);
          await goHome(actor);
          break;
        }
        case "summon_companion": {
          if (!target) break;
          const C = companionFor(actor, b.move);
          if (!C) { b.action = "summon"; return act(b); }
          const sprite = C.from ? Sprite.of({ world: C.from[0], name: C.from[1], note: "" }, C.kind === "flyer" ? { size: "g" } : {}) : Sprite.of({ world: "companion", name: C.id, spec: C.spec });
          callMove(b.move || C.name);
          // Already here from an earlier call? It just attacks again.
          let pal = companions.find(p => p.owner === actor && p.id === C.id);
          const side = actor.facing;
          if (!pal) {
            pal = { key: `${actor.key}~${C.id}`, id: C.id, owner: actor, sprite, alpha: 0, scale: 1, facing: side, pose: "idle", poseT: time, hop: 0,
              home: { x: actor.pos.x - side * (C.kind === "flyer" ? 34 : 26), y: actor.pos.y - (C.kind === "swarm" ? -10 : 6) } };
            pal.pos = { ...pal.home };
            setPose(actor, "cast"); sfx(C.sound || "b_summon", 1);
            if (C.kind === "vehicle") {
              companions.push(pal);
            } else if (C.kind === "flyer") {
              pal.pos = { x: pal.home.x, y: -40 }; pal.alpha = 1; pal.hop = 0;
              for (let i = 0; i < 3; i++) rings.push({ x: pal.home.x, y: pal.home.y - 30, r0: 2, r1: 40, c: C.colour, t0: time + i * 150, ms: 600 });
              clones.push(pal); companions.push(pal);
              await tween(pal.pos, { y: pal.home.y }, 900);
              shake = time + 300;
            } else if (C.kind === "stand") {
              clones.push(pal); companions.push(pal);
              await tween(pal, { alpha: 0.85 }, 500);
            } else {
              burst(pal.home.x, pal.home.y - 8, C.id === "tibbers" ? "fire" : "smoke", 20, C.kind !== "swarm");
              clones.push(pal); companions.push(pal);
              pal.scale = 0.2; pal.alpha = C.ghostly ? 0.8 : 1;
              await tween(pal, { scale: 1 }, 350);
              if (C.id === "tibbers") { shake = time + 300; burst(pal.pos.x, pal.pos.y - 20, "fire", 16, true); }
            }
            setPose(actor, "idle");
          }
          // How each companion fights.
          if (C.kind === "stand") {
            await Promise.all([approach(actor, target), tween(pal.pos, { x: target.pos.x - side * 10, y: target.pos.y - 4 }, 420)]);
            for (let i = 0; i < 8; i++) {
              setPose(pal, i % 2 ? "strike" : "windup"); sfx("b_punch", 0.4, 1 + (i % 3) * 0.1);
              burst(centre(target).x + rnd(-4, 4), centre(target).y + rnd(-8, 8), "impact", 3);
              if (i % 3 === 0) damageNumber(target, C.cry, C.colour);
              await wait(90);
            }
            shake = time + 300;
            await land(target, b.outcome === "hit" ? "crit" : b.outcome, "impact", actor);
            await Promise.all([goHome(actor), tween(pal.pos, { ...pal.home }, 380)]);
            await tween(pal, { alpha: 0 }, 400);
            companions = companions.filter(p => p !== pal); clones = clones.filter(c => c !== pal);
          } else if (C.kind === "vehicle") {
            companions = companions.filter(p => p !== pal); clones = clones.filter(c => c !== pal);
            const v = { kind: "gear", look: "vehicle", c: C.colour, scale: 3, x0: side > 0 ? -40 : W + 40, y0: target.pos.y - 2, x1: target.pos.x + side * 30, y1: target.pos.y - 2, t0: time, ms: 700 };
            shots.push(v); sfx(C.sound, 1);
            for (let i = 0; i < 5; i++) { parts.push({ x: lerp(v.x0, v.x1, i / 5), y: target.pos.y, vx: 0, vy: -20, g: 0, c: C.fire ? "#ff7a1a" : "#9a9a9a", s: 3, t0: time + i * 120, life: 500 }); }
            await wait(700); shots = shots.filter(q => q !== v);
            shake = time + 300; burst(centre(target).x, centre(target).y, C.fire ? "fire" : "impact", 20, true);
            await land(target, b.outcome, C.fire ? "fire" : "impact", actor);
          } else if (C.kind === "swarm") {
            setPose(pal, "walk");
            await tween(pal.pos, { x: target.pos.x - side * 8, y: target.pos.y + 2 }, 700);
            setPose(pal, "strike"); sfx("b_slash", 0.7);
            burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "blood", 10);
            await land(target, b.outcome, b.effect !== "none" ? b.effect : "impact", actor);
            burst(pal.pos.x, pal.pos.y - 4, "smoke", 10);
            companions = companions.filter(p => p !== pal); clones = clones.filter(c => c !== pal);
          } else if (C.attack === "beam" || C.attack === "orb" || C.attack === "breath") {
            setPose(pal, "cast"); if (C.line) say(pal.owner, C.line);
            await wait(300);
            const mouth = { x: pal.pos.x + side * 20 * pal.sprite.size, y: pal.pos.y - 22 * pal.sprite.size };
            const s = C.attack === "beam" ? { kind: "beam", x0: mouth.x, y0: mouth.y, x1: centre(target).x, y1: centre(target).y, c: C.colour, t0: time, ms: 700 }
              : C.attack === "breath" ? { kind: "breath", x0: mouth.x, y0: mouth.y, x1: centre(target).x, y1: centre(target).y, c: C.colour, t0: time, ms: 700 }
              : { kind: "orb", x0: mouth.x, y0: mouth.y, x1: centre(target).x, y1: centre(target).y, c: C.colour, t0: time, ms: 600 };
            sfx(C.attack === "beam" ? "b_beam" : C.attack === "breath" ? "b_fire" : "b_magic", 1);
            shots.push(s); await wait(s.ms); shots = shots.filter(q => q !== s);
            burst(centre(target).x, centre(target).y, C.attack === "orb" ? "dark" : "explosion", 24, true); shake = time + 400;
            if (C.attack === "beam") flash = { c: C.colour, until: time + 250, ms: 250 };
            await land(target, b.outcome, C.attack === "breath" ? "fire" : "light", actor);
            setPose(pal, "idle");
          } else if (C.attack === "dive") {
            const from = { ...pal.pos };
            await tween(pal.pos, { x: target.pos.x - side * 6, y: target.pos.y - 10 }, 450);
            sfx("b_slash", 1); burst(centre(target).x, centre(target).y, "slash", 14);
            await land(target, b.outcome, "impact", actor);
            await tween(pal.pos, from, 500);
          } else {
            // On foot: charge, strike (or slam the ground), and come back.
            setPose(pal, "walk");
            await tween(pal.pos, { x: target.pos.x - side * 16 * pal.sprite.size, y: target.pos.y }, 520);
            setPose(pal, "windup"); await wait(180);
            setPose(pal, "strike");
            if (C.attack === "slam") { sfx("b_slam", 0.6); shake = time + 400; burst(target.pos.x, target.pos.y - 2, C.id === "tibbers" ? "fire" : "earth", 22, true); }
            else { sfx("b_slash", 0.9); burst(centre(target).x, centre(target).y, "slash", 12); }
            await land(target, b.outcome, C.id === "tibbers" ? "fire" : "impact", actor);
            setPose(pal, "walk");
            await tween(pal.pos, { ...pal.home }, 450);
            setPose(pal, "idle");
          }
          break;
        }
        case "hook": {
          if (!target) break;
          setPose(actor, "shoot"); sfx("b_hook", 1);
          const hk = { kind: "hook", x0: centre(actor).x, y0: centre(actor).y, x1: centre(target).x, y1: centre(target).y, c: "#cfd6dd", t0: time, ms: 350 };
          shots.push(hk); await wait(350);
          if (["dodged", "miss"].includes(b.outcome)) { shots = shots.filter(q => q !== hk); await land(target, b.outcome, "impact", actor); setPose(actor, "idle"); break; }
          sfx("b_block", 0.8); burst(centre(target).x, centre(target).y, "impact", 8);
          // Reeled in: the chain stays taut while the target is dragged across.
          const pull = { x: actor.pos.x + actor.facing * 16, y: actor.pos.y };
          let reeling = true;
          (async () => { while (reeling) { hk.x0 = centre(actor).x; hk.y0 = centre(actor).y; hk.x1 = centre(target).x; hk.y1 = centre(target).y; hk.t0 = time - hk.ms; await wait(30); } })();
          await tween(target.pos, pull, 450, t => t * t);
          reeling = false; shots = shots.filter(q => q !== hk);
          setPose(actor, "strike"); sfx("b_slash", 1);
          await land(target, b.outcome, "impact", actor);
          if (!target.downed) await goHome(target);
          setPose(actor, "idle");
          break;
        }
        case "chain_lightning": {
          if (!target) break;
          setPose(actor, "cast");
          const chain = [target, ...fighters.filter(f => f.side === target.side && f !== target && !f.downed)].slice(0, 4);
          let from = actor;
          for (const f of chain) {
            const bolt = { kind: "bolt", x0: centre(from).x, y0: centre(from).y, x1: centre(f).x, y1: centre(f).y, c: "#ffe14d", t0: time, ms: 240 };
            shots.push(bolt); sfx("b_chain", 0.8); burst(centre(f).x, centre(f).y, "lightning", 8);
            await wait(200); shots = shots.filter(q => q !== bolt);
            if (f !== target) land(f, "hurt", "lightning", actor);
            from = f;
          }
          await land(target, b.outcome, "lightning", actor);
          setPose(actor, "idle");
          break;
        }
        case "earth_spikes": {
          if (!target) break;
          setPose(actor, "strike"); sfx("b_spikes", 0.9); shake = time + 300;
          burst(actor.pos.x + actor.facing * 8, actor.pos.y, "earth", 8);
          await wait(250);
          spikes.push({ x: target.pos.x, y: target.pos.y + 2, t0: time, until: time + 1600 });
          sfx("b_stone", 0.9); burst(target.pos.x, target.pos.y - 4, "earth", 14);
          await tween(target, { hop: -10 }, 120);
          await land(target, b.outcome, "earth", actor);
          target.hop = 0;
          setPose(actor, "idle");
          break;
        }
        case "sniper_shot": {
          if (!target) break;
          setPose(actor, "shoot");
          const sight = { kind: "sight", x0: centre(actor).x + actor.facing * 10, y0: centre(actor).y - 2, x1: centre(target).x, y1: centre(target).y - 6 * target.sprite.size, c: "#ff2828", t0: time, ms: 99999 };
          shots.push(sight);
          await wait(1100);
          shots = shots.filter(q => q !== sight);
          flash = { c: "#ffffff", until: time + 80, ms: 80 }; sfx("b_snipe", 1); shake = time + 120;
          const round = { kind: "bullet", x0: sight.x0, y0: sight.y0, x1: sight.x1, y1: sight.y1, c: "#ffe08a", t0: time, ms: 120 };
          shots.push(round); await wait(120); shots = shots.filter(q => q !== round);
          await land(target, b.outcome === "hit" ? "crit" : b.outcome, "impact", actor);
          setPose(actor, "idle");
          break;
        }
        case "grenade": {
          if (!target) break;
          setPose(actor, "windup"); await wait(180); setPose(actor, "strike"); sfx("b_grenade", 1);
          await fire(actor, target, "gear", "explosion", { look: "bomb", c: "#3a4a2a", ms: 650, arc: 34 });
          shake = time + 350; burst(target.pos.x, target.pos.y - 4, "explosion", 26, true);
          const near = fighters.filter(f => f !== target && f.side === target.side && !f.downed && Math.abs(f.pos.x - target.pos.x) < 36);
          await Promise.all([land(target, b.outcome, "explosion", actor), ...near.map(f => land(f, "hurt", "explosion", actor))]);
          setPose(actor, "idle");
          break;
        }
        case "poison_cloud": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_gas", 0.9);
          gas.push({ x: target.pos.x, y: target.pos.y, until: time + 4000 });
          for (let i = 0; i < 4; i++) { burst(centre(target).x, centre(target).y, "poison", 4); target.flashUntil = time + 120; await wait(250); }
          await land(target, b.outcome, "poison", actor);
          setPose(actor, "idle");
          break;
        }
        case "spin_slash": {
          if (!target) break;
          await approach(actor, target);
          sfx("b_spinslash", 1);
          const near = fighters.filter(f => f !== target && f.side === target.side && !f.downed && Math.abs(f.pos.x - target.pos.x) < 34);
          for (let i = 0; i < 8; i++) { actor.facing = -actor.facing; setPose(actor, "strike"); burst(centre(actor).x + actor.facing * 10, centre(actor).y, "slash", 3); await wait(90); }
          actor.facing = actor.side ? -1 : 1;
          await Promise.all([land(target, b.outcome, "slash", actor), ...near.map(f => land(f, "hurt", "slash", actor))]);
          await goHome(actor);
          break;
        }
        case "shield_bounce": {
          if (!target) break;
          setPose(actor, "windup"); await wait(180); setPose(actor, "strike"); sfx("b_throw", 0.9);
          const others = fighters.filter(f => f.side === target.side && f !== target && !f.downed).slice(0, 2);
          let from = centre(actor);
          for (const f of [target, ...others]) {
            const d = { kind: "disc", x0: from.x, y0: from.y, x1: centre(f).x, y1: centre(f).y, c: "#c0262f", t0: time, ms: 260 };
            shots.push(d); await wait(260); shots = shots.filter(q => q !== d);
            sfx("b_ricochet", 0.8); burst(centre(f).x, centre(f).y, "impact", 8);
            if (f !== target) land(f, "hurt", "impact", actor);
            from = centre(f);
          }
          const back = { kind: "disc", x0: from.x, y0: from.y, x1: centre(actor).x, y1: centre(actor).y, c: "#c0262f", t0: time, ms: 320 };
          shots.push(back);
          await land(target, b.outcome, "impact", actor);
          await wait(200); shots = shots.filter(q => q !== back);
          setPose(actor, "idle");
          break;
        }
        case "web_swing": {
          if (!target) break;
          sfx("b_web", 1);
          // Swinging in on a web line from somewhere overhead.
          const anchor = { x: (actor.pos.x + target.pos.x) / 2, y: 20 };
          const line = { kind: "web", x0: anchor.x, y0: anchor.y, x1: actor.pos.x, y1: actor.pos.y - 20, c: "#ffffff", t0: time - 2, ms: 1 };
          shots.push(line);
          let swinging = true;
          (async () => { while (swinging) { line.x1 = actor.pos.x; line.y1 = actor.pos.y + (actor.hop || 0) - 20; line.t0 = time - 2; await wait(30); } })();
          await tween(actor, { hop: -40 }, 250);
          await Promise.all([tween(actor.pos, { x: target.pos.x - actor.facing * 12, y: target.pos.y }, 520), tween(actor, { hop: 0 }, 520)]);
          swinging = false; shots = shots.filter(q => q !== line);
          setPose(actor, "strike"); sfx("b_punch", 1); burst(centre(target).x, centre(target).y, "impact", 12);
          await land(target, b.outcome, "impact", actor);
          await goHome(actor);
          break;
        }
        case "mega_beam": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_megabeam", 1);
          const glow = FX[b.effect] && b.effect !== "none" ? FX[b.effect] : "#8fd0ff";
          for (let i = 0; i < 10; i++) { burst(centre(actor).x + actor.facing * 8, centre(actor).y, b.effect !== "none" ? b.effect : "light", 4); await wait(100); }
          shake = time + 1000; flash = { c: glow, until: time + 300, ms: 300 }; sfx("b_boom", 0.6);
          const beam = { kind: "beam", w: 12, x0: centre(actor).x + actor.facing * 8, y0: centre(actor).y, x1: actor.facing > 0 ? W + 20 : -20, y1: centre(target).y, c: glow, t0: time, ms: 900 };
          shots.push(beam);
          const inLine = fighters.filter(f => f !== target && f.side === target.side && !f.downed && Math.abs(centre(f).y - centre(target).y) < 14);
          await wait(450);
          await Promise.all([land(target, b.outcome, b.effect !== "none" ? b.effect : "light", actor), ...inLine.map(f => land(f, "hurt", "light", actor))]);
          await wait(300); shots = shots.filter(q => q !== beam);
          setPose(actor, "idle");
          break;
        }
        case "one_punch": {
          if (!target) break;
          await approach(actor, target);
          setPose(actor, "idle"); await wait(500);
          damageNumber(actor, "serious punch", "#ffe14d");
          setPose(actor, "windup"); await wait(300);
          setPose(actor, "strike"); sfx("b_onepunch", 1); flash = { c: "#ffffff", until: time + 300, ms: 300 }; shake = time + 1200;
          rings.push({ x: centre(target).x, y: centre(target).y, r0: 4, r1: 400, c: "#ffffff", t0: time, ms: 700 });
          for (let i = 0; i < 30; i++) parts.push({ x: centre(target).x, y: centre(target).y + rnd(-20, 20), vx: actor.facing * rnd(200, 500), vy: rnd(-30, 30), g: 0, c: "#ffffff", s: 2, t0: time, life: 500 });
          await land(target, b.outcome === "hit" ? "crit" : b.outcome, "impact", actor);
          await goHome(actor);
          break;
        }
        case "domain_expansion": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_domain", 1);
          damageNumber(actor, "domain expansion", "#ff6ad5");
          const sukuna = /sukuna|malevolent|shrine/i.test(`${b.move} ${actor.name}`);
          domain = { colour: sukuna ? "#3a0a0a" : "#14082a", until: time + 99999 };
          await wait(900);
          if (sukuna) {
            // Malevolent Shrine: cuts from everywhere at once.
            for (let i = 0; i < 10; i++) { burst(centre(target).x + rnd(-8, 8), centre(target).y + rnd(-10, 10), "slash", 4); sfx("b_slash", 0.4, 1.2); await wait(80); }
          } else {
            // Unlimited Void: everything at once, frozen in place.
            for (let i = 0; i < 3; i++) { rings.push({ x: centre(target).x, y: centre(target).y, r0: 30, r1: 2, c: "#9fe3ff", t0: time, ms: 400 }); await wait(250); }
            target.asleep = true; await wait(400); target.asleep = false;
          }
          await land(target, b.outcome === "dodged" || b.outcome === "miss" ? "hit" : b.outcome, "psychic", actor);
          domain.until = time + 300;
          setPose(actor, "idle");
          break;
        }
        case "orb_strike": {
          if (!target) break;
          setPose(actor, "cast"); sfx("b_orb", 1);
          const col = b.effect === "lightning" || /chidori/i.test(b.move || "") ? "#9fe3ff" : FX[b.effect] && b.effect !== "none" ? FX[b.effect] : "#7fc8ff";
          for (let i = 0; i < 6; i++) { rings.push({ x: centre(actor).x + actor.facing * 8, y: centre(actor).y, r0: 6, r1: 2, c: col, t0: time, ms: 200 }); await wait(90); }
          await approach(actor, target);
          setPose(actor, "strike"); sfx("b_boom", 0.8);
          rings.push({ x: centre(target).x, y: centre(target).y, r0: 2, r1: 26, c: col, t0: time, ms: 400 });
          burst(centre(target).x, centre(target).y, b.effect !== "none" ? b.effect : "light", 18, true); shake = time + 300;
          await land(target, b.outcome, b.effect !== "none" ? b.effect : "light", actor);
          await goHome(actor);
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
        case "fall": {
          setPose(actor, "hurt");
          if (ground.top && actor.side === defSide && actor.pos.y <= ground.top + 12) {
            // Thrown off the wall or cliff.
            sfx("b_whoosh", 0.8);
            await tween(actor.pos, { x: actor.pos.x + (actor.side ? -24 : 24) }, 220);
            await tween(actor.pos, { y: 182 }, 380, t => t * t);
            shake = time + 250; burst(actor.pos.x, actor.pos.y - 2, "earth", 12);
          } else if (feature === "river" || feature === "bridge") {
            await tween(actor.pos, { x: W / 2, y: actor.pos.y + 4 }, 400);
            sfx("b_whoosh", 0.6); burst(actor.pos.x, actor.pos.y - 4, "water", 18, true);
            await tween(actor, { alpha: 0 }, 500);
          } else if (kind === "volcano") {
            burst(actor.pos.x, actor.pos.y - 4, "fire", 20, true); sfx("b_fire", 0.8);
          } else await wait(300);
          await die(actor, actor.facing);
          break;
        }
      }
      // The same move catching others too.
      if ((b.also || []).length) {
        const extra = b.also.map(byKey).filter(f => f && !f.downed);
        await Promise.all(extra.map((v, i) => wait(i * 140).then(() => { burst(centre(v).x, centre(v).y, effect === "none" ? "impact" : effect, 10); return land(v, b.outcome, effect, actor); })));
      }
      deathStyle = "normal";
      // Let each beat breathe long enough to read its caption.
      const need = Math.max(2300, (caption.textContent.length || 0) * 50);
      const spent = time - t0;
      if (spent < need) await wait(need - spent);
      await heard(said);
    }

    const gearList = (verdict.preps || []).flatMap((p, side) => (p && p.gear || []).map(g => { const look = gearLook(g); return { name: g.name, side, look, colour: gearColour(g, look), carried_by: g.carried_by || "", effect: g.effect || "" }; }));
    /* --- The place itself -----------------------------------------------------
       Weather that never stops (snow, embers, leaves, sand, dust) and, now and
       then between beats, something in the background that belongs to this
       battlefield or world: a dragon far off over Westeros, a Creeper, a
       helicopter's searchlight, a ship on the horizon. Scenery only: it never
       changes the fight. */
    let scenery = [];
    let lastScene = -3;
    function weather() {
      if (council || skipping) return;
      const r = Math.random();
      if (kind === "snow" && r < 0.5) parts.push({ x: rnd(0, W), y: -2, vx: rnd(-8, 4), vy: rnd(14, 26), g: 0, c: "#ffffff", s: r < 0.15 ? 2 : 1, t0: time, life: 9000 });
      else if (kind === "volcano" && r < 0.35) parts.push({ x: rnd(0, W), y: H - rnd(0, 40), vx: rnd(-6, 6), vy: -rnd(16, 34), g: 0, c: r < 0.15 ? "#ffcc33" : "#ff7a1a", s: 1, t0: time, life: 4000 });
      else if (kind === "forest" && r < 0.08) parts.push({ x: rnd(0, W), y: -2, vx: rnd(-10, 10), vy: rnd(10, 18), g: 0, c: ["#6a9a3a", "#c88a2a", "#a0522d"][Math.floor(rnd(0, 3))], s: 2, t0: time, life: 9000 });
      else if (kind === "desert" && r < 0.25) parts.push({ x: -2, y: rnd(120, H), vx: rnd(60, 110), vy: rnd(-4, 4), g: 0, c: "#e8d29a", s: 1, t0: time, life: 4500 });
      else if (kind === "cave" && r < 0.06) parts.push({ x: rnd(0, W), y: 0, vx: 0, vy: 40, g: 120, c: "#9fd0ff", s: 1, t0: time, life: 1500 });
      else if (kind === "sea" && r < 0.05) parts.push({ x: rnd(0, W), y: rnd(110, 130), vx: rnd(-4, 4), vy: -rnd(8, 20), g: 30, c: "#e8f4ff", s: 1, t0: time, life: 800 });
      else if (night && r < 0.004) scenery.push({ kind: "star", x0: rnd(40, W), y0: rnd(8, 40), x1: 0, y1: 0, t0: time, ms: 700 });
    }
    function scene(k, extra) { scenery.push({ kind: k, t0: time, ...extra }); }
    // Something from this place passes by in the background.
    function randomScene(i) {
      if (skipping || i - lastScene < 2 || Math.random() > 0.45) return;
      lastScene = i;
      const own = MAP_SCENES.filter(([re]) => re.test(arenaName));
      if (own.length && Math.random() < 0.7) return own[Math.floor(rnd(0, own.length))][1]();
      const dir = Math.random() < 0.5 ? 1 : -1, x0 = dir > 0 ? -60 : W + 60, x1 = dir > 0 ? W + 60 : -60;
      const far = who => { const c = characterNamed(who); return c ? Sprite.of(c) : null; };
      const pick = [];
      if (world === "westeros") pick.push(() => { const s = far(["Drogon", "Rhaegal", "Viserion"][Math.floor(rnd(0, 3))]); if (s) { scene("sprite", { sprite: s, x0, y0: 46, x1, y1: 30, ms: 4200, scale: 0.4, dir }); sfx("b_roar", 0.35); } });
      if (world === "minecraft") pick.push(() => { const s = far("Creeper"); if (s) { const xs = dir > 0 ? 20 : W - 20; scene("sprite", { sprite: s, x0: xs, y0: 132, x1: xs + dir * 50, y1: 132, ms: 2600, scale: 0.6, dir, boom: true }); } });
      if (world === "pokemon") pick.push(() => { const s = far("Pidgey") || far("Pidgeot"); if (s) scene("sprite", { sprite: s, x0, y0: 40, x1, y1: 52, ms: 3400, scale: 0.45, dir }); });
      if (world === "league") pick.push(() => { const s = far("Minion Wave"); if (s) scene("sprite", { sprite: s, x0, y0: 128, x1, y1: 128, ms: 6000, scale: 0.5, dir }); });
      if (world === "hp") pick.push(() => scene("birds", { x0, y0: 40, x1, y1: 34, ms: 3600, n: 1, c: "#e8e0d0", owl: true }));
      if (world === "shows" || world === "oldies") pick.push(() => scene("plane", { x0, y0: 26, x1, y1: 22, ms: 4200, dir }));
      const byKind = {
        castle: () => scene("birds", { x0, y0: 44, x1, y1: 30, ms: 3800, n: 6, c: "#1d1a17" }),
        snow: () => { scene("gust", { ms: 1800, dir }); sfx("b_wind", 0.5); },
        volcano: () => { scene("lava", { x0: rnd(60, W - 60), ms: 1400 }); sfx("b_boom", 0.3); shake = time + 250; },
        sea: () => Math.random() < 0.5 ? scene("ship", { x0, y0: 112, x1, y1: 112, ms: 7000, dir }) : scene("tentacle", { x0: rnd(40, W - 40), y0: 120, ms: 2600 }),
        city: () => Math.random() < 0.5 ? scene("heli", { x0, y0: 30, x1, y1: 34, ms: 5200, dir }) : scene("car", { x0, y0: 150, x1, y1: 150, ms: 1600, dir }),
        cave: () => { scene("birds", { x0, y0: 30, x1, y1: 50, ms: 2000, n: 9, c: "#2a2030", bats: true }); sfx("b_whoosh", 0.4); },
        arena: () => { scene("flashes", { ms: 1200 }); sfx("b_shout", 0.25); },
        tech: () => { scene("alarm", { ms: 1600 }); sfx("b_announce", 0.3); },
        forest: () => scene("birds", { x0: rnd(60, W - 60), y0: 96, x1: rnd(0, W), y1: 10, ms: 2200, n: 7, c: "#3a2a1a", burst: true }),
        desert: () => scene("tumbleweed", { x0, y0: 168, x1, y1: 168, ms: 3200, dir }),
        sky: () => { scene("bolt", { x0: rnd(40, W - 40), ms: 300 }); flash = { c: "#cfe8ff", until: time + 120, ms: 120 }; sfx("b_chain", 0.4); },
        blocky: () => scene("birds", { x0, y0: 40, x1, y1: 40, ms: 4000, n: 3, c: "#f2f0ea" }),
      };
      if (byKind[kind]) pick.push(byKind[kind]);
      pick.push(() => scene("birds", { x0, y0: 38, x1, y1: 28, ms: 4000, n: 4, c: "#2a2a2a" }));
      pick[Math.floor(rnd(0, pick.length))]();
    }
    /* Moments that belong to one particular battlefield, by its name. Like the
       rest of the scenery they never change the fight; they just make each
       place feel like itself. */
    const arenaName = arena ? `${arena.name} ${arena.terrain || ""}` : "";
    function flyName(name, y, ms, scale) { const s = (() => { const c = characterNamed(name); return c ? Sprite.of(c) : null; })(); if (!s) return false; const dir = Math.random() < 0.5 ? 1 : -1; scene("sprite", { sprite: s, x0: dir > 0 ? -50 : W + 50, y0: y, x1: dir > 0 ? W + 50 : -50, y1: y - 6, ms, scale, dir }); return true; }
    const across = () => { const dir = Math.random() < 0.5 ? 1 : -1; return { dir, x0: dir > 0 ? -60 : W + 60, x1: dir > 0 ? W + 60 : -60 }; };
    const MAP_SCENES = [
      [/gotham|arkham|batcave/i, () => { scene("signal", { ms: 4200 }); scene("searchlight", { ms: 4200 }); }],
      [/metropolis/i, () => { flyName("Superman", 40, 2200, 0.5) || scene("plane", { ...across(), y0: 30, y1: 26, ms: 2600 }); callout("It's a bird… it's a plane…"); }],
      [/new york|lumiose|deika|jaku|hosu/i, () => scene("car", { ...across(), y0: 152, y1: 152, ms: 1500, c: "#f2cf3a" })],
      [/asgard|bifrost/i, () => { scene("beam", { x0: rnd(40, W - 40), ms: 1400, c: "#ffffff", rainbow: true }); sfx("b_beam", 0.4); }],
      [/wakanda|avengers/i, () => scene("plane", { ...across(), y0: 34, y1: 30, ms: 2400, c: "#2a2a33" })],
      [/titan|knowhere|sakaar/i, () => { scene("rocks", { ms: 1800 }); shake = time + 250; }],
      [/summoner'?s rift/i, () => Math.random() < 0.5 ? (flyName("Elder Dragon", 46, 4200, 0.35) || 0) : flyName("Minion Wave", 128, 6000, 0.5)],
      [/howling abyss|freljord/i, () => { const s = characterNamed("Poros"); if (s) { const a = across(); scene("sprite", { sprite: Sprite.of(s), ...a, y0: 160, y1: 160, ms: 2600, scale: 0.6 }); sfx("b_whoosh", 0.3); } }],
      [/zaun/i, () => scene("fog", { ms: 3200, c: "120,200,90" })],
      [/piltover/i, () => scene("blimp", { ...across(), y0: 28, y1: 28, ms: 7000, c: "#c8a060" })],
      [/bilgewater/i, () => Math.random() < 0.5 ? scene("tentacle", { x0: rnd(40, W - 40), y0: 124, ms: 2600 }) : (scene("ship", { ...across(), y0: 112, y1: 112, ms: 6000 }), sfx("b_boom", 0.3))],
      [/shadow isles/i, () => scene("fog", { ms: 3400, c: "60,180,140" })],
      [/shurima|pyramid|tatooine|desert/i, () => scene("gust", { ms: 2400, dir: 1, c: "232,210,154" })],
      [/mount doom|mordor/i, () => { scene("eye", { ms: 3600 }); sfx("b_domain", 0.35); }],
      [/death star/i, () => { for (let i = 0; i < 3; i++) setTimeout(() => scene("plane", { ...across(), y0: 24 + i * 10, y1: 30 + i * 10, ms: 1400, c: "#8c939b", tie: true }), i * 220); sfx("b_plane", 0.4); }],
      [/isla nublar|jurassic/i, () => { scene("dino", { ms: 2600, x0: rnd(60, W - 60) }); sfx("b_roar", 0.6); shake = time + 400; }],
      [/hawkins|upside down/i, () => { scene("alarm", { ms: 1800, c: "200,20,40" }); scene("spores", { ms: 3000 }); }],
      [/bikini bottom|atlantis|ocean monument|seafoam/i, () => scene("bubbles", { ms: 3000 })],
      [/springfield/i, () => scene("blimp", { ...across(), y0: 30, y1: 30, ms: 7000, c: "#c0262f" })],
      [/zion|matrix/i, () => scene("rain", { ms: 2600, c: "#6aff8a" })],
      [/hill valley/i, () => { scene("car", { ...across(), y0: 150, y1: 150, ms: 900, c: "#cfd6dd", fire: true }); flash = { c: "#9fe3ff", until: time + 160, ms: 160 }; sfx("b_chain", 0.5); }],
      [/grayskull/i, () => { scene("bolt", { x0: 60, ms: 300 }); flash = { c: "#cfe8ff", until: time + 120, ms: 120 }; sfx("b_chain", 0.4); }],
      [/area 51|the moon/i, () => scene("ufo", { ...across(), y0: 40, y1: 46, ms: 3600 })],
      [/the moon/i, () => { fighters.forEach(f => { if (!f.downed && f.alpha > 0.5) { f.hop = -10; setTimeout(() => { f.hop = 0; }, 700); } }); callout("Low gravity!"); }],
      [/cincinnati zoo/i, () => flyName("Harambe", 160, 4000, 0.6)],
      [/tower of london|stonehenge|winterfell|the eyrie/i, () => scene("birds", { ...across(), y0: 40, y1: 30, ms: 3600, n: 7, c: "#1d1a17" })],
      [/colosseum|heavens arena|stadium|arena|indigo plateau/i, () => { scene("flashes", { ms: 1400 }); sfx("b_shout", 0.3); }],
      [/king'?s landing|dragonstone|meereen|harrenhal/i, () => flyName(["Drogon", "Rhaegal", "Viserion", "Vhagar", "Caraxes", "Syrax"][Math.floor(rnd(0, 6))], 46, 4200, 0.4)],
      [/the wall|north/i, () => scene("gust", { ms: 2000, dir: -1 })],
      [/hogwarts|great hall|hogsmeade|diagon/i, () => Math.random() < 0.5 ? scene("candles", { ms: 4200 }) : scene("birds", { ...across(), y0: 40, y1: 36, ms: 3600, n: 1, c: "#e8e0d0", owl: true })],
      [/azkaban|forbidden forest|department of mysteries/i, () => flyName("Dementors", 50, 4400, 0.5) || scene("fog", { ms: 3200, c: "40,40,60" })],
      [/chamber of secrets/i, () => scene("dino", { ms: 2400, x0: rnd(60, W - 60), snake: true })],
      [/vought|seven satellite|flatiron|white house/i, () => flyName("Homelander", 36, 1800, 0.45)],
      [/the end\b|stronghold/i, () => flyName("Ender Dragon", 44, 4600, 0.35)],
      [/nether|bastion/i, () => flyName("Ghast", 48, 5200, 0.6)],
      [/ancient city/i, () => { scene("sculk", { ms: 2400 }); sfx("b_domain", 0.3); }],
      [/konoha|hidden leaf/i, () => scene("leaves", { ms: 3000 })],
      [/marineford/i, () => { scene("ship", { ...across(), y0: 112, y1: 112, ms: 5000 }); sfx("b_boom", 0.35); shake = time + 200; }],
      [/shibuya/i, () => scene("fog", { ms: 3000, c: "10,10,30" })],
      [/infinity castle/i, () => { scene("alarm", { ms: 900, c: "120,40,160" }); sfx("b_spin", 0.4); }],
      [/namek/i, () => scene("rocks", { ms: 1600 })],
      [/raccoon city/i, () => scene("heli", { ...across(), y0: 30, y1: 34, ms: 5000 })],
      [/aperture/i, () => { scene("portals", { ms: 2600 }); sfx("b_portal", 0.4); }],
      [/midgar/i, () => scene("rain", { ms: 2600, c: "#9fd0ff" })],
      [/corneria|big blue|final destination/i, () => scene("plane", { ...across(), y0: 30, y1: 26, ms: 1600, c: "#cfd6dd" })],
      [/dracula|castle/i, () => scene("birds", { ...across(), y0: 34, y1: 44, ms: 2200, n: 9, c: "#2a2030", bats: true })],
      [/muppet|studio 54/i, () => scene("disco", { ms: 2600 })],
      [/fourtrees|moonpool|sunningrocks|dark forest|viridian forest/i, () => scene("leaves", { ms: 3000 })],
    ];
    function drawScenery() {
      scenery = scenery.filter(s => time - s.t0 < s.ms);
      for (const s of scenery) {
        const k = clamp((time - s.t0) / s.ms, 0, 1), x = lerp(s.x0 || 0, s.x1 || 0, k), y = lerp(s.y0 || 0, s.y1 || 0, k);
        const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(a), Math.round(b), w, h); };
        switch (s.kind) {
          case "sprite": {
            const img = s.sprite.frame("walk", time), S = img.width;
            ctx.save(); ctx.globalAlpha = 0.85; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s.dir * s.scale, s.scale);
            ctx.drawImage(img, -Math.floor(S / 2), -(S - 4)); ctx.restore();
            if (s.boom && k > 0.95 && !s.boomed) { s.boomed = true; burst(x, y - 6, "explosion", 18, true); sfx("b_boom", 0.4); }
            break;
          }
          case "birds": for (let i = 0; i < s.n; i++) {
            const bx = x + (i % 3) * 9 * (s.burst ? Math.cos(i) * 3 : 1), by = y + Math.floor(i / 3) * 6 + (s.burst ? Math.sin(i * 2) * 10 * k : 0);
            const up = ((time / (s.bats ? 70 : 140) + i) | 0) % 2;
            R(bx - 2, by - up, 2, 1, s.c); R(bx, by, 1, 1, s.c); R(bx + 1, by - up, 2, 1, s.c);
            if (s.owl) { R(bx - 1, by - 2, 3, 3, s.c); }
          } break;
          case "plane": if (s.tie) { R(x - 1, y - 1, 3, 3, s.c || "#8c939b"); R(x - 4, y - 4, 1, 9, "#3a3a44"); R(x + 4, y - 4, 1, 9, "#3a3a44"); R(x - 3, y, 7, 1, "#3a3a44"); break; }
            R(x - 7, y, 14, 2, s.c || "#cfd6dd"); R(x - 1, y - 3, 3, 8, s.c || "#cfd6dd"); R(x - 7 * s.dir, y - 3, 2, 3, s.c || "#cfd6dd"); break;
          case "ship": R(x - 10, y, 20, 3, "#5a3a22"); R(x - 1, y - 12, 1, 12, "#3a2a1a"); R(x - 6, y - 11, 6, 8, "#e8e0d0"); R(x + 1, y - 9, 5, 6, "#e8e0d0"); break;
          case "tentacle": { const h = Math.sin(k * Math.PI) * 30; for (let i = 0; i < h; i += 2) R(s.x0 + Math.sin(i / 5 + time / 200) * 3, s.y0 - i, 3, 2, "#5a3a6a"); break; }
          case "heli": {
            R(x - 6, y, 12, 4, "#2a2a33"); R(x + 6 * s.dir, y + 1, 7 * s.dir > 0 ? 7 : -7, 1, "#2a2a33"); R(x - 8 + ((time / 40) | 0) % 2 * 4, y - 2, 12, 1, "#8c939b");
            ctx.fillStyle = "rgba(255,250,200,0.18)"; ctx.beginPath(); ctx.moveTo(x - 2, y + 4); ctx.lineTo(x - 26 + Math.sin(time / 500) * 30, 200); ctx.lineTo(x + 26 + Math.sin(time / 500) * 30, 200); ctx.fill();
            break;
          }
          case "car": if (s.fire) { R(x - 40 * s.dir, y + 4, 40, 1, "#ff7a1a"); R(x - 40 * s.dir, y + 6, 40, 1, "#ffcc33"); }
            R(x - 9, y, 18, 4, s.c || "#c0262f"); R(x - 5, y - 3, 9, 3, s.c || "#c0262f"); R(x - 3, y - 2, 5, 2, "#9fe3ff"); R(x - 7, y + 4, 3, 2, "#1d1a17"); R(x + 4, y + 4, 3, 2, "#1d1a17"); break;
          case "tumbleweed": { const a = time / 120; ctx.strokeStyle = "#a07a4a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 4 - Math.abs(Math.sin(a)) * 6, 5, a, a + 5); ctx.stroke(); break; }
          case "lava": for (let i = 0; i < 5; i++) { const t = k * 1.4 - i * 0.1, lx = s.x0 + (i - 2) * 14 * t, ly = 120 - Math.sin(Math.min(1, t) * Math.PI) * 60; if (t > 0 && t < 1) R(lx, ly, 3, 3, i % 2 ? "#ff7a1a" : "#ffcc33"); } break;
          case "gust": { for (let i = 0; i < 12; i++) R((((time / 3) * s.dir + i * 37) % W + W) % W, 30 + i * 13, 18, 1, `rgba(${s.c || "255,255,255"},0.5)`); break; }
          case "flashes": if (Math.random() < 0.3) R(rnd(0, W), rnd(60, 120), 2, 2, "#ffffff"); break;
          case "alarm": if (((time / 200) | 0) % 2) { ctx.fillStyle = `rgba(${s.c || "255,40,40"},0.18)`; ctx.fillRect(0, 0, W, H); } break;
          case "bolt": { ctx.strokeStyle = "#e8f4ff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.x0, 0); for (let i = 1; i <= 5; i++) ctx.lineTo(s.x0 + rnd(-8, 8), i * 18); ctx.stroke(); break; }
          case "signal": { const g = ctx.createRadialGradient(300, 34, 2, 300, 34, 24); g.addColorStop(0, "rgba(255,250,200,0.75)"); g.addColorStop(1, "rgba(255,250,200,0)"); ctx.fillStyle = g; ctx.fillRect(270, 4, 60, 60);
            ctx.fillStyle = "#1d1a17"; ctx.beginPath(); ctx.moveTo(288, 34); ctx.lineTo(294, 30); ctx.lineTo(297, 33); ctx.lineTo(300, 27); ctx.lineTo(303, 33); ctx.lineTo(306, 30); ctx.lineTo(312, 34); ctx.lineTo(300, 38); ctx.fill(); break; }
          case "searchlight": { ctx.fillStyle = "rgba(255,250,200,0.12)"; const a = Math.sin(time / 600) * 60; ctx.beginPath(); ctx.moveTo(60, 216); ctx.lineTo(120 + a - 18, 0); ctx.lineTo(120 + a + 18, 0); ctx.fill(); break; }
          case "beam": { ctx.globalAlpha = Math.sin(k * Math.PI); for (let i = 0; i < 6; i++) { ctx.fillStyle = s.rainbow ? ["#ff6a6a", "#ffcc33", "#6aff8a", "#6af0ff", "#8e5bd0", "#ff6ad5"][i] : s.c; ctx.fillRect(s.x0 - 9 + i * 3, 0, 3, 160); } ctx.globalAlpha = 1; break; }
          case "rocks": for (let i = 0; i < 6; i++) { const t = (k * 1.5 + i * 0.13) % 1; R(30 + i * 57, t * 120, 4, 4, "#6b5a4a"); } break;
          case "fog": { ctx.fillStyle = `rgba(${s.c},${(0.28 * Math.sin(k * Math.PI)).toFixed(2)})`; ctx.fillRect(0, 0, W, H); for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(${s.c},${(0.18 * Math.sin(k * Math.PI)).toFixed(2)})`; ctx.beginPath(); ctx.ellipse((i * 90 + time / 20) % (W + 80) - 40, 150 + (i % 2) * 20, 50, 12, 0, 0, Math.PI * 2); ctx.fill(); } break; }
          case "blimp": R(x - 16, y - 5, 32, 10, s.c); R(x - 18, y - 2, 2, 4, s.c); R(x - 4, y + 5, 8, 3, "#3a3a44"); R(x - 12, y - 4, 24, 1, "rgba(255,255,255,0.5)"); break;
          case "eye": { const a = Math.sin(k * Math.PI); ctx.globalAlpha = a; ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.ellipse(W / 2, 40, 26, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffcc33"; ctx.beginPath(); ctx.ellipse(W / 2, 40, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); R(W / 2 - 1, 32, 3, 16, "#1d1a17"); ctx.fillStyle = "rgba(255,80,0,0.12)"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; break; }
          case "dino": { const h = Math.sin(k * Math.PI) * 50, bx = s.x0; ctx.fillStyle = s.snake ? "#3a5a3a" : "#4a5a3a";
            if (s.snake) { for (let i = 0; i < h; i += 3) R(bx + Math.sin(i / 6) * 8, 130 - i, 6, 3, "#3a5a3a"); }
            else { R(bx - 14, 128 - h * 0.6, 26, 18, "#4a5a3a"); R(bx + 6, 120 - h * 0.6, 16, 10, "#4a5a3a"); R(bx + 14, 128 - h * 0.6, 8, 2, "#f2f0ea"); R(bx - 22, 134 - h * 0.6, 10, 4, "#4a5a3a"); }
            break; }
          case "spores": for (let i = 0; i < 12; i++) R((i * 31 + time / 30) % W, 200 - ((time / 15 + i * 40) % 200), 1, 1, "#e8e0f0"); break;
          case "bubbles": for (let i = 0; i < 14; i++) { const by = 200 - ((time / 12 + i * 37) % 200); ctx.strokeStyle = "rgba(220,240,255,0.7)"; ctx.beginPath(); ctx.arc((i * 29) % W + Math.sin(by / 10) * 3, by, 1 + (i % 3), 0, Math.PI * 2); ctx.stroke(); } break;
          case "rain": for (let i = 0; i < 40; i++) R((i * 47 + time / 3) % W, (i * 23 + time / 2) % H, 1, 4, s.c); break;
          case "ufo": { R(x - 10, y, 20, 3, "#8c939b"); R(x - 5, y - 4, 10, 4, "#9fe3ff"); if (k > 0.3 && k < 0.7) { ctx.fillStyle = "rgba(160,255,160,0.18)"; ctx.beginPath(); ctx.moveTo(x - 4, y + 3); ctx.lineTo(x - 16, 200); ctx.lineTo(x + 16, 200); ctx.lineTo(x + 4, y + 3); ctx.fill(); } break; }
          case "candles": for (let i = 0; i < 10; i++) { const cy = 30 + (i % 4) * 9 + Math.sin(time / 500 + i) * 2; R(20 + i * 36, cy, 1, 4, "#f2f0ea"); R(20 + i * 36, cy - 2, 1, 2, ((time / 150 + i) | 0) % 2 ? "#ffcc33" : "#ff9a2a"); } break;
          case "sculk": { ctx.fillStyle = `rgba(20,90,110,${(0.25 * Math.sin(k * Math.PI)).toFixed(2)})`; ctx.fillRect(0, 140, W, H - 140); rings.length < 40 && Math.random() < 0.1 && rings.push({ x: rnd(0, W), y: rnd(150, 200), r0: 2, r1: 18, c: "#4fd6e6", t0: time, ms: 500 }); break; }
          case "leaves": for (let i = 0; i < 14; i++) R((i * 29 + time / 25 + Math.sin(time / 300 + i) * 10) % W, (i * 17 + time / 18) % H, 2, 1, ["#6a9a3a", "#c88a2a", "#a0522d"][i % 3]); break;
          case "portals": { const a = Math.sin(k * Math.PI); ctx.globalAlpha = a; ctx.fillStyle = "#3f7fd6"; ctx.beginPath(); ctx.ellipse(40, 150, 8, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ef8a2c"; ctx.beginPath(); ctx.ellipse(W - 40, 150, 8, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
          case "disco": { for (let i = 0; i < 8; i++) { ctx.fillStyle = ["rgba(255,106,213,0.18)", "rgba(106,240,255,0.18)", "rgba(255,225,77,0.18)"][i % 3]; ctx.beginPath(); ctx.arc((i * 61 + time / 8) % W, 120 + Math.sin(time / 400 + i) * 40, 14, 0, Math.PI * 2); ctx.fill(); } R(W / 2 - 4, 6, 8, 8, "#cfd6dd"); break; }
          case "star": R(s.x0 - k * 40, s.y0 + k * 14, 2, 1, "#ffffff"); R(s.x0 - k * 40 + 2, s.y0 + k * 14 - 1, 6, 1, "rgba(255,255,255,0.4)"); break;
        }
      }
    }

    /* A big moment's camera: a punch in on heavy hits, a K.O. stamp on kills. */
    let punch = null;
    function koStamp(f) {
      if (skipping) return;
      const b = document.createElement("span");
      b.className = "b8__ko"; b.textContent = "K.O.";
      const p = centre(f);
      b.style.left = `${(p.x / W) * 100}%`; b.style.top = `${((p.y - 10) / H) * 100}%`;
      bubbles.appendChild(b);
      setTimeout(() => b.remove(), 1200);
    }

    /* The battlefield strikes: what (or who) does it decides how it looks. */
    function eventKind(by) {
      const t = norm(by);
      if (/dragon|drogon|rhaegal|viserion|vhagar|caraxes|wyvern|eagle|bird|plane|jet|ship|nazg|phoenix|griffin|bat\b/.test(t)) return "flyby";
      if (/warden|guard|police|soldier|sheriff|security|knight|sniper|turret|army|cop|ranger|officer/.test(t)) return "authority";
      if (/storm|lightning|thunder|blizzard|snow|wind|flood|wave|rain|tornado|hurricane|tide/.test(t)) return "weather";
      if (/crowd|fans|audience|mob|stampede|spectator/.test(t)) return "crowd";
      return "hazard";
    }
    function characterNamed(name) {
      const U = window.UNIVERSES || {};
      for (const w of Object.keys(U)) { const c = U[w].characters.find(x => norm(x[0]) === norm(name) || norm(name).includes(norm(x[0]))); if (c) return { name: c[0], world: w, note: c[1] }; }
      return null;
    }
    async function arenaEvent(b) {
      const target = byKey(b.target);
      if (!target || target.downed) return;
      const t0 = time, by = b.eventBy || "The battlefield", kind = eventKind(by);
      caption.textContent = b.caption;
      callout(b.callout || `${by}!`);
      const said = voice(beatLine(b));
      deathStyle = b.death || "normal";
      const from = { pos: { x: target.pos.x - (target.side ? -12 : 12), y: target.pos.y }, sprite: target.sprite, facing: target.side ? -1 : 1 };
      let effect = b.effect !== "none" ? b.effect : "impact";
      if (kind === "flyby") {
        const who = characterNamed(by);
        const sprite = who ? Sprite.of(who, { size: "g" }) : Sprite.parse ? Sprite.of({ name: "dragon", world: "", spec: "d|g|w|3a3a3a|1a1a1a|3a3a3a|3a3a3a|c0262f|none|none|bare|none|spikes,redeyes|breath|fire" }) : null;
        const dir = Math.random() < 0.5 ? 1 : -1;
        sfx("b_roar", 1);
        flyer = { sprite, x: dir > 0 ? -80 : W + 80, y: 64, facing: dir, scale: 1 };
        await tween(flyer, { x: target.pos.x - dir * 60, y: 72 }, 1100);
        if (b.outcome !== "none" && b.outcome !== "miss") {
          effect = b.effect !== "none" ? b.effect : "fire";
          const breath = { kind: "breath", x0: flyer.x + dir * 20, y0: flyer.y - 18, x1: target.pos.x, y1: target.pos.y - 10, c: FX[effect] || FX.fire, t0: time, ms: 650 };
          shots.push(breath); sfx("b_fire", 1); await wait(650); shots = shots.filter(q => q !== breath);
          burst(centre(target).x, centre(target).y, effect, 22, true); shake = time + 350;
        }
        const leaving = tween(flyer, { x: dir > 0 ? W + 90 : -90, y: 28 }, 1000).then(() => { flyer = null; });
        await land(target, b.outcome, effect, from);
        await leaving;
      } else if (kind === "authority") {
        const edge = target.pos.x < W / 2 ? -20 : W + 20, dir = edge < 0 ? 1 : -1;
        const guard = { key: "~event", name: by, sprite: Sprite.of({ name: by, world: "", spec: "h|m|n|f1d0b0|1a1a1a|3a4a5a|1a1a1a|e8b84a|short|cap|uniform|gun|belt|gun|none" }),
          pos: { x: edge, y: target.pos.y + 6 }, facing: dir, alpha: 1, scale: 1, pose: "walk", poseT: time, hop: 0, side: -1 };
        clones.push(guard);
        await tween(guard.pos, { x: target.pos.x - dir * 46 }, 700);
        setPose(guard, "shoot"); sfx("b_gun", 1); flash = { c: "#ffffff", until: time + 60, ms: 60 };
        const shot = { kind: "bullet", x0: guard.pos.x + dir * 8, y0: guard.pos.y - 14, x1: target.pos.x, y1: target.pos.y - 12, c: "#ffe08a", t0: time, ms: 160 };
        shots.push(shot); await wait(160); shots = shots.filter(q => q !== shot);
        await land(target, b.outcome, "impact", from);
        setPose(guard, "walk"); guard.facing = -dir;
        await tween(guard.pos, { x: edge }, 600);
        clones = clones.filter(c => c !== guard);
      } else if (kind === "weather") {
        effect = b.effect !== "none" ? b.effect : "lightning";
        flash = { c: "#cfe8ff", until: time + 200, ms: 200 }; sfx("b_chain", 1); shake = time + 300;
        const bolt = { kind: "bolt", x0: target.pos.x + rnd(-20, 20), y0: 0, x1: target.pos.x, y1: target.pos.y - 8, c: FX[effect] || FX.lightning, t0: time, ms: 260 };
        shots.push(bolt); await wait(260); shots = shots.filter(q => q !== bolt);
        burst(centre(target).x, centre(target).y, effect, 20, true);
        await land(target, b.outcome, effect, from);
      } else if (kind === "crowd") {
        sfx("b_shout", 0.9);
        for (let i = 0; i < 7; i++) {
          const x0 = rnd(0, W), s1 = { kind: "rock", x0, y0: H, x1: target.pos.x + rnd(-6, 6), y1: target.pos.y - 10, c: ["#e8b84a", "#c0262f", "#f2f0ea"][i % 3], t0: time, ms: 500, arc: 50 };
          shots.push(s1); setTimeout(() => { shots = shots.filter(q => q !== s1); }, 600); await wait(90);
        }
        await wait(400);
        await land(target, b.outcome, "impact", from);
      } else {
        sfx("b_quake", 0.9); shake = time + 700;
        for (let i = 0; i < 4; i++) {
          const r = { kind: "rock", x0: target.pos.x + rnd(-14, 14), y0: -10, x1: target.pos.x + rnd(-5, 5), y1: target.pos.y - 6, c: "#8a8f96", t0: time, ms: 420 };
          shots.push(r); setTimeout(() => { shots = shots.filter(q => q !== r); }, 450); await wait(110);
        }
        await wait(300);
        burst(target.pos.x, target.pos.y - 4, "earth", 22, true); sfx("b_slam", 1);
        await land(target, b.outcome, "earth", from);
      }
      deathStyle = "normal";
      const need = Math.max(2300, (caption.textContent.length || 0) * 50), spent = time - t0;
      if (spent < need) await wait(need - spent);
      await heard(said);
    }

    /* Gear in use: each kind of prepared gear has its own way of coming into
       the fight. Returns the effect the hit lands with, or null when the look
       has no special move here. */
    const GEAR_MOVES = new Set(["jetpack", "drone", "mech", "grapple", "smoke", "flamethrower", "rocket", "hammer", "axe", "spear",
      "scope", "catapult", "mine", "boomerang", "cloak", "ram", "medkit", "charm"]);
    async function gearMove(look, actor, target, item, b) {
      const tc = () => centre(target);
      switch (look) {
        case "jetpack": {
          equip(actor, { extras: ["jetpack"] });
          sfx("b_jetpack", 1); setPose(actor, "walk");
          const trail = setInterval(() => burst(actor.pos.x - actor.facing * 4, actor.pos.y - 2, "fire", 2), 60);
          await tween(actor.pos, { y: actor.pos.y - 60, x: actor.pos.x + actor.facing * 20 }, 450);
          setPose(actor, "strike");
          await tween(actor.pos, { x: target.pos.x - actor.facing * 12, y: target.pos.y }, 300);
          clearInterval(trail); shake = time + 200;
          burst(tc().x, tc().y, "explosion", 14);
          return "impact";
        }
        case "drone": {
          sfx("b_drone", 1);
          const d = { kind: "gear", look: "drone", c: item.colour, x0: actor.pos.x, y0: actor.pos.y - 30, x1: target.pos.x, y1: target.pos.y - 52, t0: time, ms: 700 };
          shots.push(d); await wait(700);
          for (let i = 0; i < 3; i++) {
            const z = { kind: "beam", c: "#ff2828", w: 1, x0: target.pos.x, y0: target.pos.y - 50, x1: target.pos.x + rnd(-3, 3), y1: tc().y, t0: time, ms: 160 };
            shots.push(z); burst(tc().x, tc().y, "tech", 5); await wait(170); shots = shots.filter(q => q !== z);
          }
          shots = shots.filter(q => q !== d);
          return "tech";
        }
        case "mech": {
          sfx("b_mech", 1);
          const from = actor.pos.x - actor.facing * 30;
          const m = { kind: "gear", look: "mech", c: item.colour, scale: 3, x0: from, y0: target.pos.y - 4, x1: target.pos.x - actor.facing * 22, y1: target.pos.y - 4, t0: time, ms: 900 };
          shots.push(m);
          for (let i = 0; i < 4; i++) { await wait(225); shake = time + 90; burst(lerp(m.x0, m.x1, (i + 1) / 4), target.pos.y, "earth", 4); }
          sfx("b_slam", 1); shake = time + 400; burst(tc().x, target.pos.y - 4, "impact", 20, true);
          await wait(200); shots = shots.filter(q => q !== m);
          return "impact";
        }
        case "grapple": {
          sfx("b_hook", 1);
          const h = { kind: "hook", c: item.colour, x0: centre(actor).x, y0: centre(actor).y, x1: tc().x, y1: tc().y, t0: time, ms: 260 };
          shots.push(h); await wait(260);
          setPose(actor, "walk");
          const line = { kind: "web", x0: tc().x, y0: tc().y, x1: tc().x, y1: tc().y, t0: time, ms: 1 };
          shots = shots.filter(q => q !== h); shots.push(line);
          await tween(actor.pos, { x: target.pos.x - actor.facing * 12, y: target.pos.y }, 260);
          shots = shots.filter(q => q !== line);
          setPose(actor, "strike"); sfx("b_punch", 1);
          return "impact";
        }
        case "smoke": {
          sfx("b_smoke", 1);
          await fire(actor, target, "gear", "smoke", { look: "smoke", c: item.colour, ms: 420, arc: 24 });
          gas.push({ x: target.pos.x, y: target.pos.y, until: time + 2600, rgb: "170,170,170" });
          actor.alpha = 0.15; await wait(300);
          actor.pos.x = target.pos.x + actor.facing * 14; actor.facing *= -1; actor.alpha = 1;
          setPose(actor, "strike"); sfx("b_slash", 1);
          await wait(120); actor.facing *= -1;
          return "slash";
        }
        case "flamethrower": {
          equip(actor, { weapon: "gun" });
          setPose(actor, "shoot"); sfx("b_flame", 1);
          for (let i = 0; i < 4; i++) { fire(actor, target, "breath", "fire"); await wait(110); }
          await wait(380);
          burst(tc().x, tc().y, "fire", 16);
          return "fire";
        }
        case "rocket": {
          equip(actor, { weapon: "cannon" });
          setPose(actor, "shoot"); sfx("b_rocket", 1);
          const rk = { kind: "gear", look: "rocket", c: item.colour, x0: centre(actor).x, y0: centre(actor).y - 4, x1: tc().x, y1: tc().y - 4, t0: time, ms: 520, arc: 12, scale: 1 };
          shots.push(rk);
          const smoke = setInterval(() => { const k = clamp((time - rk.t0) / rk.ms, 0, 1); burst(lerp(rk.x0, rk.x1, k), lerp(rk.y0, rk.y1, k), "smoke", 2); }, 50);
          await wait(520); clearInterval(smoke); shots = shots.filter(q => q !== rk);
          shake = time + 380; burst(tc().x, target.pos.y - 6, "explosion", 26, true);
          return "explosion";
        }
        case "hammer": {
          equip(actor, { weapon: "hammer" });
          await approach(actor, target);
          setPose(actor, "windup"); actor.hop = -14; await wait(240); actor.hop = 0;
          setPose(actor, "strike"); sfx("b_slam", 1); shake = time + 350;
          rings.push({ x: target.pos.x, y: target.pos.y, r0: 2, r1: 34, c: "#fff2c0", t0: time, ms: 450 });
          cracks.push({ x: target.pos.x, y: target.pos.y, until: time + 2500 });
          return "impact";
        }
        case "axe": case "spear": case "boomerang": {
          setPose(actor, "windup"); await wait(160); setPose(actor, "strike"); sfx("b_throw", 0.9);
          const s = { kind: "spin", c: item.colour, x0: centre(actor).x, y0: centre(actor).y, x1: tc().x, y1: tc().y, t0: time, ms: 360 };
          shots.push(s); await wait(360); shots = shots.filter(q => q !== s);
          if (look === "boomerang") {
            const back = { kind: "spin", c: item.colour, x0: tc().x, y0: tc().y, x1: centre(actor).x, y1: centre(actor).y, t0: time, ms: 360, arc: 18 };
            shots.push(back); wait(360).then(() => { shots = shots.filter(q => q !== back); });
          }
          return "slash";
        }
        case "scope": {
          equip(actor, { extras: ["glasses"] });
          setPose(actor, "shoot");
          const sight = { kind: "sight", x0: centre(actor).x, y0: centre(actor).y - 2, x1: tc().x, y1: tc().y, t0: time, ms: 900 };
          shots.push(sight); await wait(900); shots = shots.filter(q => q !== sight);
          sfx("b_snipe", 1); flash = { c: "#ffffff", until: time + 70, ms: 70 };
          await fire(actor, target, "bullet", "impact", { ms: 140 });
          return "impact";
        }
        case "catapult": {
          const cp = { look: "catapult", colour: item.colour, x: actor.pos.x - actor.facing * 18, y: actor.pos.y + 4 };
          fieldGear.push(cp); sfx("b_throw", 1); await wait(250);
          const rock = { kind: "rock", c: "#8a8f96", x0: cp.x, y0: cp.y - 14, x1: tc().x, y1: tc().y, t0: time, ms: 750, arc: 70 };
          shots.push(rock); await wait(750); shots = shots.filter(q => q !== rock);
          sfx("b_boom", 0.9); shake = time + 400; burst(tc().x, target.pos.y - 4, "earth", 22, true);
          return "impact";
        }
        case "mine": {
          const mn = { look: "mine", colour: item.colour, x: target.pos.x, y: target.pos.y + 1 };
          fieldGear.push(mn); sfx("b_deploy", 0.6);
          await wait(700);
          fieldGear.splice(fieldGear.indexOf(mn), 1);
          sfx("b_boom", 1); shake = time + 400; burst(target.pos.x, target.pos.y - 2, "explosion", 26, true);
          target.hop = -10; await wait(150); target.hop = 0;
          return "explosion";
        }
        case "cloak": {
          equip(actor, { extras: ["cape"] });
          sfx("b_teleport", 0.8);
          await tween(actor, { alpha: 0.1 }, 300);
          actor.pos.x = target.pos.x - actor.facing * 12; actor.pos.y = target.pos.y;
          await tween(actor, { alpha: 1 }, 150);
          setPose(actor, "strike"); sfx("b_slash", 1);
          return "slash";
        }
        case "ram": {
          sfx("b_mech", 0.6);
          const rm = { kind: "gear", look: "ram", c: item.colour, scale: 2, x0: actor.pos.x, y0: target.pos.y - 2, x1: target.pos.x - actor.facing * 10, y1: target.pos.y - 2, t0: time, ms: 650 };
          shots.push(rm); await wait(650);
          sfx("b_slam", 1); shake = time + 500; burst(tc().x, tc().y, "earth", 22, true);
          await wait(150); shots = shots.filter(q => q !== rm);
          return "impact";
        }
      }
      return null;
    }
    // Support gear: a medkit patches up the user's side, a charm wards everyone.
    async function supportGear(look, actor) {
      const who = look === "charm" ? fighters.filter(f => f.side === actor.side && !f.downed) : [actor, ...fighters.filter(f => f.side === actor.side && !f.downed && f !== actor && f.hp < 60).slice(0, 1)];
      for (const f of who) {
        burst(centre(f).x, centre(f).y, look === "medkit" ? "heal" : "light", 10);
        if (look === "medkit") { setHp(f, f.hp + 30); damageNumber(f, "+30", "#6aff8a"); }
        else f.shield = time + 2400;
      }
      sfx(look === "medkit" ? "b_heal" : "b_shield", 0.9);
      await wait(550);
    }

    // An announcer's call across the top of the screen: plans, gear, terrain.
    const announced = new Set();
    const callEl = root.querySelector(".b8__call");
    let callUntil = 0;
    function callout(text, item) {
      if (!text || skipping) return;
      callEl.innerHTML = `${item ? `<canvas width="24" height="24" aria-hidden="true"></canvas>` : ""}<span>${esc(text)}</span>`;
      if (item) { const c = callEl.querySelector("canvas").getContext("2d"); c.imageSmoothingEnabled = false; c.save(); c.translate(12, 20); c.scale(1.2, 1.2); drawGear(c, item.look, item.colour, 0, 0, time); c.restore(); }
      callEl.hidden = false;
      callEl.style.animation = "none"; void callEl.offsetWidth; callEl.style.animation = "";
      sfx("b_announce", 0.55);
      callUntil = time + 2600;
    }

    function placeGear(item, actor) {
      const it = { look: item.look, colour: item.colour, x: actor.pos.x + actor.facing * 16, y: actor.pos.y };
      fieldGear.push(it);
      burst(it.x, it.y - 4, "smoke", 8);
      return it;
    }

    function describe(b, a, t) {
      const verbs = { advance: "advances", strike: "attacks", combo: "unleashes a flurry on", shoot: "shoots at", cast: "casts at", special: "unleashes a special on",
        annihilate: "unleashes everything", throw: "hurls a weapon at", slam: "slams down on", barrage: "rains fire on", grab: "seizes", teleport: "teleports behind",
        transform: "transforms", summon: "summons help against", summon_companion: "calls a companion against", stealth: "vanishes and strikes", time_stop: "stops time and strikes",
        foresee: "sees the attack coming and counters", mind_control: "seizes the mind of", clone: "sends copies at", shapeshift: "disguises as",
        summon_dragon: "calls a dragon down on", summon_giant: "summons a colossus against", raise_dead: "raises the dead against", stampede: "stampedes through",
        airstrike: "calls an airstrike on", meteor: "drops a meteor on", lullaby: "sings to sleep", devour: "devours", portal: "drops a portal under",
        freeze: "freezes", petrify: "turns to stone", anvil: "drops an anvil on", shout: "screams at", black_hole: "opens a black hole under",
        earthquake: "splits the ground under", tornado: "whips a tornado at", lightning_storm: "calls a lightning storm on", time_rewind: "turns back time",
        hook: "hooks and drags in", chain_lightning: "chains lightning through", earth_spikes: "raises spikes under", sniper_shot: "snipes",
        grenade: "lobs a grenade at", poison_cloud: "gasses", spin_slash: "spins through", shield_bounce: "bounces a shield off", web_swing: "swings in on",
        mega_beam: "fires everything at", one_punch: "punches", domain_expansion: "traps in a domain", orb_strike: "drives an orb into",
        stretch: "stretches a punch at", drain: "drains", laser_eyes: "burns", self_destruct: "self-destructs on", telekinesis: "lifts and slams", spin_dash: "spin-dashes into",
        regenerate: "regenerates", phase: "phases", fly: "takes to the air", grow: "grows huge", shrink: "shrinks down", reality_warp: "bends reality around", block: "braces",
        flank: "splits up and flanks", arena_event: "is struck by the battlefield", return: "returns from the dead", dodge: "dodges", deploy_gear: "deploys gear against", build: "builds something", heal: "heals", shield: "shields", trap: "springs a trap on",
        team_up: "teams up against", taunt: "taunts the enemy", retreat: "retreats", fall: "falls" };
      return `${a.name} ${verbs[b.action] || "acts"}${t && !["block", "dodge", "build", "taunt", "retreat", "fall"].includes(b.action) ? ` ${t.name}` : ""}.`;
    }

    /* --- The war councils ---------------------------------------------------
       Before the battle, each team's council is shown in its tent: the team
       around a map table, the leader marked, the plan read out line by line,
       and every piece of gear built or brought out and handed to whoever
       carries it. */

    let council = null;      // { side, members, rack: [items], item, sparks }
    let councilSkip = false;
    const councilEl = root.querySelector(".b8__council");
    const cText = councilEl.querySelector(".b8__council-text"), cHead = councilEl.querySelector(".b8__council-head");
    councilEl.querySelector(".b8__council-skip").addEventListener("click", () => {
      councilSkip = true; if (N) N.stop(); waits.splice(0).forEach(w => w.res());
    });
    // opts.councilPace "quick": the councils at about a third of the time,
    // typed fast, with only the headline read aloud.
    const QUICK = opts.councilPace === "quick";
    const cwait = ms => councilSkip ? Promise.resolve() : wait(QUICK ? ms * 0.35 : ms);

    /* A page turn between scenes: a curtain sweeps across with a title card,
       the scene changes behind it, and it sweeps away. */
    const wipeEl = root.querySelector(".b8__wipe");
    /* Keeping several screens in step: each scene change is a numbered step.
       The host reports its steps (opts.onStep); a spectator waits at each
       step until the host has reached it (opts.follow), never more than 20s. */
    const stepNo = { council: 0, battle: 0 };
    async function gate(kind) {
      const n = ++stepNo[kind];
      if (opts.onStep) opts.onStep(kind, n);
      if (opts.follow && !skipping && !(kind === "council" && councilSkip)) await Promise.race([opts.follow(kind, n), wait(20000)]);
      // Behind the host (a slow device, a late arrival): fast-forward, quietly, until level.
      speed = opts.lag && opts.lag(kind, n) >= 1 ? 3 : 1;
    }

    async function wipeIn(title, sub) {
      if (councilSkip || skipping) return;
      wipeEl.querySelector(".b8__wipe-title").textContent = title;
      wipeEl.querySelector(".b8__wipe-sub").textContent = sub || "";
      wipeEl.hidden = false; wipeEl.className = "b8__wipe is-in";
      sfx("b_whoosh", 0.8);
      await cwait(480);
      await cwait(1000);
    }
    async function wipeOut() {
      if (wipeEl.hidden) return;
      wipeEl.className = "b8__wipe is-out";
      await cwait(480);
      wipeEl.hidden = true; wipeEl.className = "b8__wipe";
    }

    /* Narration (narrator.js): the same lines the screen shows, read aloud,
       and the battle waits for each to finish (never more than 25 seconds). */
    const N = opts.silent ? null : window.Narrator;
    const voice = t => (N && N.on() && !skipping && speed === 1 && t) ? N.speak(t) : Promise.resolve();
    const heard = p => skipping ? Promise.resolve() : Promise.race([p, wait(25000)]);
    const cheard = p => councilSkip ? Promise.resolve() : heard(p);
    const planLines = prep => (String(prep.plan || "").match(/[^.!?]+[.!?]*/g) || []).map(x => x.trim()).filter(Boolean);
    const councilIntro = (side, prep) => {
      const lead = prep && fighters.find(f => f.side === side && (norm(f.name) === norm(prep.leader) || norm(f.key) === norm(prep.leader)));
      return `${teams[side].name}'s war council, ${side === attackSide ? "attacking" : "defending"}${lead ? `, led by ${lead.name}` : ""}.`;
    };
    const gearLine = g => `${/^(already theirs|scavenged)$/i.test(String(g.made_by || "").trim()) ? "Gear" : "New gear"}: ${g.name}. ${g.effect || ""}`;
    const mapLine = () => arena ? `${arena.name}: ${teams[attackSide].name}'s team attacks, ${teams[defSide].name}'s team holds ${verdict.defences || "its ground"}.` : "";
    const beatLine = b => [b.caption || (b.actor ? describe(b, byKey(b.actor), b.target ? byKey(b.target) : null) : ""), b.callout].filter(Boolean).join(". ");
    const winLine = () => `${teams[winSide].name}'s team wins. ${verdict.verdict || ""}`;
    // With ElevenLabs, fetch every line ahead so each plays the moment it's needed.
    if (N && N.mode === "eleven") {
      const pre = [];
      if (!opts.skipCouncil) [attackSide, defSide].forEach(sd => { const pr = (verdict.preps || [])[sd]; if (pr) pre.push(councilIntro(sd, pr), ...(opts.councilPace === "quick" ? [] : [...planLines(pr), ...(pr.gear || []).map(gearLine)])); });
      if (!opts.councilOnly) { pre.push(mapLine(), ...beats.map(beatLine), winLine()); }
      N.prefetch(pre);
    }

    const TENT = [["#5a2a22", "#4a221c", "#6b3328"], ["#22344a", "#1b2a3d", "#2b4260"]];
    function drawCouncil() {
      const [a, b2, c] = TENT[council.side];
      for (let x = 0; x < W; x += 24) { ctx.fillStyle = (x / 24) % 2 ? a : b2; ctx.fillRect(x, 0, 24, 126); }
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W / 2, 18); ctx.lineTo(W, 0); ctx.fill();
      ctx.fillStyle = "#3a2a1e"; ctx.fillRect(0, 126, W, H - 126);
      ctx.fillStyle = "#2e2117"; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 126, 1, H - 126);
      // A lantern, flickering.
      const fl = 0.75 + Math.sin(time / 90) * 0.08 + Math.sin(time / 37) * 0.05;
      const LX = 330;
      const glow = ctx.createRadialGradient(LX, 40, 2, LX, 40, 170);
      glow.addColorStop(0, `rgba(255,200,110,${(0.35 * fl).toFixed(3)})`); glow.addColorStop(1, "rgba(255,200,110,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1d1a17"; ctx.fillRect(LX, 4, 1, 28); ctx.fillRect(LX - 4, 32, 9, 2); ctx.fillRect(LX - 4, 42, 9, 2);
      ctx.fillStyle = "#ffd27a"; ctx.fillRect(LX - 3, 34, 7, 8);
      // The team, behind the table, scaled to fit.
      ctx.save(); ctx.translate(0, -24);
      for (const m of council.members) {
        const f = m.f, pose = m.pose || "idle";
        const img = f.sprite.frame(pose, time - (m.poseT || 0)), S = img.width;
        const k = clamp(2.3 / f.sprite.size, 0.5, 2.3);
        ctx.save(); ctx.translate(Math.round(m.x), Math.round(m.y + (m.hop || 0)));
        ctx.scale(m.facing * k, k); ctx.drawImage(img, -Math.floor(S / 2), -(S - 4)); ctx.restore();
        if (m.leader) {
          const hy = Math.round(m.y - 34 * f.sprite.size * k - 4 + Math.sin(time / 300) * 1.5);
          ctx.fillStyle = "#e8b84a"; ctx.fillRect(Math.round(m.x) - 5, hy, 11, 3); ctx.fillRect(Math.round(m.x) - 5, hy - 3, 2, 3); ctx.fillRect(Math.round(m.x), hy - 4, 1, 4); ctx.fillRect(Math.round(m.x) + 4, hy - 3, 2, 3);
          ctx.fillStyle = "#c0262f"; ctx.fillRect(Math.round(m.x), hy + 1, 1, 1);
        }
        if (m.mark && m.mark > time) { ctx.fillStyle = "#fff2c0"; const ay = Math.round(m.y - 34 * f.sprite.size * k - 12 + Math.sin(time / 80) * 2); ctx.fillRect(Math.round(m.x) - 2, ay, 5, 2); ctx.fillRect(Math.round(m.x) - 1, ay + 2, 3, 1); ctx.fillRect(Math.round(m.x), ay + 3, 1, 1); }
      }
      // The table and the battle map on it, with the plan's arrows crawling across.
      ctx.fillStyle = "#6b4a2a"; ctx.fillRect(70, 150, W - 140, 10); ctx.fillStyle = "#5a3e22"; ctx.fillRect(70, 160, W - 140, 4);
      ctx.fillStyle = "#4a3220"; ctx.fillRect(80, 164, 6, 40); ctx.fillRect(W - 86, 164, 6, 40);
      ctx.fillStyle = "#e8d9b0"; ctx.fillRect(130, 146, W - 260, 8); ctx.fillStyle = "#cdb98a"; ctx.fillRect(130, 153, W - 260, 1);
      const prog = council.plan || 0;
      ctx.fillStyle = council.side === attackSide ? "#c0262f" : "#1f4fa8";
      for (let i = 0; i < 20 * prog; i++) ctx.fillRect(140 + i * 5, 149 + Math.round(Math.sin(i / 2) * 1.5), 3, 1);
      ctx.fillStyle = "#1d1a17"; ctx.fillRect(W - 142, 148, 3, 1); ctx.fillRect(W - 141, 147, 1, 3);
      ctx.restore();
      // Gear: the piece being made, big over the table; the rest on the rack.
      council.rack.forEach((it, i) => {
        ctx.save(); ctx.translate(26 + i * 26, 64); ctx.scale(2, 2); drawGear(ctx, it.look, it.colour, 0, 0, time); ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(14 + i * 26, 65, 24, 2);
      });
      if (council.item) {
        const it = council.item, k = clamp((time - it.t0) / 400, 0, 1);
        const y = 80 - ease(k) * 26 + Math.sin(time / 200) * 2;
        const halo = ctx.createRadialGradient(W / 2, y - 10, 1, W / 2, y - 10, 30);
        halo.addColorStop(0, "rgba(255,240,180,0.55)"); halo.addColorStop(1, "rgba(255,240,180,0)");
        ctx.fillStyle = halo; ctx.fillRect(W / 2 - 30, y - 40, 60, 60);
        ctx.save(); ctx.translate(W / 2, y); ctx.scale(3 * k + 0.5, 3 * k + 0.5); drawGear(ctx, it.look, it.colour, 0, 0, time); ctx.restore();
      }
      for (const p of parts) {
        const age = time - p.t0; if (age > p.life) continue;
        const s = age / 1000;
        ctx.globalAlpha = 1 - age / p.life; ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x + p.vx * s), Math.round(p.y + p.vy * s + p.g * s * s / 2), p.s, p.s);
      }
      ctx.globalAlpha = 1;
      parts = parts.filter(p => time - p.t0 < p.life);
    }

    async function typeOut(html, text) {
      cText.innerHTML = html;
      const el = cText.querySelector("[data-type]");
      if (!el) return;
      sfx("b_type", 0.35);
      if (councilSkip || skipping) { el.textContent = text; return; }
      const t0 = time;
      while (true) {
        const n = Math.min(text.length, Math.floor((time - t0) / (QUICK ? 6 : 22)));
        el.textContent = text.slice(0, n);
        if (n >= text.length || councilSkip || skipping) break;
        await wait(30);
      }
      el.textContent = text;
    }

    async function showCouncil(side) {
      const prep = (verdict.preps || [])[side];
      if (!prep || councilSkip || skipping) return;
      const team = teams[side];
      const mine = fighters.filter(f => f.side === side);
      const leader = mine.find(f => norm(f.name) === norm(prep.leader) || norm(f.key) === norm(prep.leader));
      const n = mine.length, gap = Math.min(64, 300 / Math.max(1, n - 1));
      // A new page for each council: the curtain falls with its title, the
      // tent is set behind it, and the curtain lifts.
      await gate("council");
      await wipeIn(`${team.name}'s war council`, side === attackSide ? "planning the attack" : "planning the defence");
      council = {
        side, rack: [], item: null, plan: 0,
        members: mine.map((f, i) => ({ f, x: W / 2 + (i - (n - 1) / 2) * gap, y: 148, facing: i < n / 2 ? 1 : -1, leader: f === leader })),
      };
      const stance = side === attackSide ? "attacking" : "defending";
      cHead.innerHTML = `<span class="b8__council-team">${esc(team.name)}'s war council</span>
        <span class="b8__council-stance b8__council-stance--${side === attackSide ? "attack" : "defend"}">${stance}</span>
        ${leader ? `<span class="b8__council-lead">led by ${esc(leader.name)}</span>` : ""}`;
      councilEl.hidden = false; councilEl.classList.remove("is-leaving"); root.classList.add("is-council");
      await wipeOut();
      sfx("b_council", 0.8);
      caption.textContent = `${team.name}'s team plans its ${stance === "attacking" ? "attack" : "defence"}.`;
      const intro = voice(councilIntro(side, prep));
      await Promise.all([cwait(1300), cheard(intro)]);
      // The plan, a sentence at a time, with the leader pointing at the map.
      const lines = String(prep.plan || "").match(/[^.!?]+[.!?]*/g) || [];
      const lm = council.members.find(m => m.leader);
      sfx("b_plan", 0.7);
      for (let i = 0; i < lines.length && !councilSkip; i++) {
        if (lm) { lm.pose = i % 2 ? "cast" : "windup"; lm.poseT = time; }
        await gate("council");
        council.plan = (i + 1) / lines.length;
        const s = lines[i].trim();
        const said = QUICK ? Promise.resolve() : voice(s);
        await typeOut(`<span class="b8__council-label">the plan</span><span data-type></span>`, s);
        await Promise.all([cwait(900 + s.length * 12), cheard(said)]);
      }
      if (lm) lm.pose = "idle";
      // The gear, piece by piece.
      for (const g of (prep.gear || [])) {
        if (councilSkip) break;
        await gate("council");
        const look = gearLook(g), colour = gearColour(g, look);
        const maker = council.members.find(m => norm(m.f.name) === norm(g.made_by));
        const carrier = council.members.find(m => g.carried_by && (norm(m.f.key) === norm(g.carried_by) || norm(m.f.name) === norm(g.carried_by)));
        council.item = { look, colour, t0: time };
        if (maker) {
          maker.pose = "strike"; maker.poseT = time;
          for (let i = 0; i < 3; i++) { sfx("b_forge", 0.5, 1 + i * 0.05); burst(W / 2, 70, "lightning", 6); maker.pose = i % 2 ? "windup" : "strike"; maker.poseT = time; await cwait(220); }
          maker.pose = "idle";
        } else sfx("b_equip", 0.8);
        const gearSaid = QUICK ? Promise.resolve() : voice(gearLine(g));
        const who = [maker ? `built by ${esc(maker.f.name)}` : esc(g.made_by === "scavenged" ? "scavenged" : "already theirs"), carrier ? `carried by ${esc(carrier.f.name)}` : ""].filter(Boolean).join(" · ");
        await typeOut(`<span class="b8__council-label">${maker ? "new gear" : "gear"}</span><span class="b8__council-gear">${esc(g.name)}</span>
          <span class="b8__council-who">${who}</span><span class="b8__council-effect" data-type></span>`, g.effect || "");
        if (carrier) { carrier.mark = time + 1400; const w = wearFor(look, carrier.f); if (w) { equip(carrier.f, w); sfx("b_equip", 0.7); burst(carrier.x, 96, "light", 8); } }
        await Promise.all([cwait(1500 + (g.effect || "").length * 14), cheard(gearSaid)]);
        council.rack.push({ look, colour });
        council.item = null;
      }
      if (!(prep.gear || []).length) { await typeOut(`<span class="b8__council-label">gear</span><span data-type></span>`, "Nothing but what they carry."); await cwait(1200); }
      councilEl.classList.add("is-leaving");
      await cwait(400);
      councilEl.hidden = true; root.classList.remove("is-council");
      cText.innerHTML = "";
      council = null;
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
      // Each side's war council, the attackers first; then everyone carries their gear.
      // opts.councilOnly plays just the councils (while the judge is still
      // deciding the fight); opts.skipCouncil leaves them out (already seen).
      if (!opts.skipCouncil) {
        await showCouncil(attackSide);
        await showCouncil(defSide);
      }
      councilEl.hidden = true; council = null; root.classList.remove("is-council");
      if (opts.councilOnly) { if (Sound && Sound.release) Sound.release("battle"); return finish(); }
      for (const g of gearList) {
        const f = fighters.find(q => q.side === g.side && g.carried_by && (norm(q.key) === norm(g.carried_by) || norm(q.name) === norm(g.carried_by)));
        const w = f && wearFor(g.look, f);
        if (w) equip(f, w);
      }
      // The battlefield itself first: its picture, its name, and who holds what.
      const holders = teams[defSide].name, raiders = teams[attackSide].name;
      const mapEl = root.querySelector(".b8__map");
      await gate("battle");
      if (arena) {
        mapEl.innerHTML = `${arena.image ? `<img src="${esc(arena.image)}" alt="" referrerpolicy="origin" onerror="this.remove()" />` : ""}
          <div class="b8__map-text"><span class="b8__map-name">${esc(arena.name)}</span>
          ${arena.terrain ? `<span class="b8__map-terrain">${esc(arena.terrain)}</span>` : ""}
          <span class="b8__map-sides">${esc(raiders)}'s team attacks · ${esc(holders)}'s team defends${verdict.defences ? ` ${esc(verdict.defences)}` : ""}</span></div>`;
        mapEl.hidden = false;
        caption.textContent = `${arena.name}: ${raiders}'s team attacks, ${holders}'s team holds ${verdict.defences || "its ground"}.`;
        await Promise.all([wait(3400), heard(voice(mapLine()))]);
        mapEl.classList.add("is-leaving");
        await wait(600);
        mapEl.hidden = true;
      }
      // The attackers march in; the defenders are already in position.
      const raidersF = fighters.filter(f => f.side === attackSide);
      await Promise.all(raidersF.map((f, i) => wait(i * 110).then(() => tween(f.pos, { x: f.home.x, y: f.home.y }, 1300)).then(() => setPose(f, "idle"))));
      sfx("b_ready", 0.9);
      await showBanner(`<span>Ready…</span>`, 700);
      sfx("b_fight", 1);
      await showBanner(`<span>Fight!</span>`, 650);
      // The killing blow that ends it plays in slow motion.
      const lastKill = beats.reduce((n, b, i) => b.outcome === "ko" ? i : n, -1);
      for (let i = 0; i < beats.length; i++) {
        progress = i / beats.length;
        await gate("battle");
        randomScene(i);
        if (i === lastKill && !skipping) slow = 0.45;
        await act(beats[i]);
        slow = 1;
        if (done) return;
      }
      progress = 1;
      await gate("battle");
      // The winners celebrate.
      if (Sound && Sound.release) Sound.release("battle");
      sfx("b_win", 1);
      fighters.filter(f => f.side === winSide && !f.downed).forEach(f => setPose(f, "victory"));
      fireworks();
      moveEl.hidden = true;
      caption.textContent = verdict.verdict || "";
      const won = voice(winLine());
      await Promise.all([showBanner(`<span>${esc(teams[winSide].name)}'s team wins</span>`, 2600), heard(won)]);
      finish();
    }

    // Fireworks over the winners.
    function fireworks() {
      if (skipping) return;
      sfx("b_firework", 0.7);
      const xs = fighters.filter(f => f.side === winSide).map(f => f.pos.x);
      const mid = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : W / 2;
      const cols = ["#ff6ad5", "#ffe14d", "#6af0ff", "#6aff8a", "#ff9a2a"];
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const x = mid + rnd(-70, 70), y = rnd(25, 75), c = cols[i % cols.length];
          for (let j = 0; j < 26; j++) { const a = (j / 26) * Math.PI * 2, sp = rnd(40, 75); parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 40, c: j % 3 ? c : "#ffffff", s: 2, t0: time, life: rnd(700, 1100) }); }
          rings.push({ x, y, r0: 2, r1: 14, c, t0: time, ms: 300 });
        }, i * 320);
      }
    }

    function finish() {
      if (ended) return;
      ended = true; done = true;
      if (Sound && Sound.release) Sound.release("battle");
      opts.onState && opts.onState("ended");
      opts.onEnd && opts.onEnd();
    }

    // Skip: everything resolves at once and the result shows.
    function skip() {
      if (ended) return;
      if (N) N.stop();
      scenery = []; punch = null; slow = 1;
      skipping = true; council = null; councilEl.hidden = true; root.classList.remove("is-council"); companions = []; gas = []; spikes = []; domain = null; frozen = null; ghost = null; warpUntil = 0; clones = []; giant = null; flyer = null; portals = []; hole = null; sepiaUntil = 0; cracks = [];
      waits.splice(0).forEach(w => w.res());
      tweens.splice(0).forEach(t => { Object.assign(t.obj, t.to); t.res(); });
      finish();
    }
    function play() { if (ended) return; if (N) N.resume(); playing = true; toggle.textContent = "❚❚"; toggle.setAttribute("aria-label", "Pause"); opts.onState && opts.onState("playing"); }
    function pause() { if (ended) return; if (N) N.pause(); playing = false; toggle.textContent = "▶"; toggle.setAttribute("aria-label", "Play"); opts.onState && opts.onState("paused"); }
    toggle.addEventListener("click", () => (playing ? pause() : play()));
    root.querySelector('[data-act="skip"]').addEventListener("click", skip);

    raf = requestAnimationFrame(frame);
    if (playing) opts.onState && opts.onState("playing");
    else toggle.textContent = "▶";
    run();

    return {
      play, pause, skip,
      destroy() { if (N) N.stop(); done = true; ended = true; stopped = true; clearInterval(timer); cancelAnimationFrame(raf); if (Sound && Sound.release) Sound.release("battle"); container.innerHTML = ""; },
      get playing() { return playing; },
    };
  }

  window.Battle = { player, script, cast, ACTIONS, EFFECTS, OUTCOMES, LOOKS, COLOURS: Object.keys(COLOURS), backdropKind, backdrop };
})();
