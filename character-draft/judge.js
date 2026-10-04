/* The judge — reasons through who wins. Two ways to run it, both with no server:
   Gemini, called straight from the browser with the player's own API key, or a
   small model running on this device's GPU through WebLLM.

   The key lives in localStorage, not a cookie: cookies ride along on every
   request to this site, while localStorage never leaves the browser. It is only
   ever sent to Google, in a header. */

(function () {
  "use strict";

  const KEY_STORE = "character-draft:v1:gemini-key";
  const PIN_STORE = "character-draft:v1:pin";
  const SERVER = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "http://localhost:8080"
    : "https://party-server-production-d0f7.up.railway.app";
  const MODEL_STORE = "character-draft:v1:gemini-model";
  const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
  const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm";

  const LOCAL_MODELS = [
    { id: "Qwen3.5-4B-q4f16_1-MLC", label: "Qwen 3.5 4B", bytes: 2.39e9, note: "sharper, about a 2.4GB download, needs 4GB of graphics memory" },
    { id: "Qwen3.5-2B-q4f16_1-MLC", label: "Qwen 3.5 2B", bytes: 1.08e9, note: "quicker, about a 1.1GB download, needs 2.3GB, but it gets facts wrong more often" },
  ];

  const safe = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* no-op */ } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* no-op */ } },
  };

  /* --- The questions ----------------------------------------------
     Three calls. Each team's war council plans and gears up on its own,
     knowing the battlefield and the enemy roster but not the enemy's plan.
     Then the judge pits the two preparations against each other. */

  const CHARACTER_RULES = `Use what the characters can actually do in their source material (games, shows, films,
comics, books). When teams mix worlds, scale power fairly. Stick to what each character really is and can do;
never invent powers they don't have. The two players only drafted the teams; they are not in the fight.`;

  const PREP_SYSTEM = `You are the war council for one team in a fantasy battle between two drafted teams of
fictional characters. Your job is to prepare your team to win: pick a leader, make a plan, gear up and give
everyone a job. You know the battlefield and who is on the enemy team, but not what they are planning.
${CHARACTER_RULES}
Characters marked [strategist] are renowned for strategy, leadership or cunning: let them shape the plan.
Characters marked [maker] are engineers, smiths, inventors or alchemists. Each maker can build ONE new device,
weapon, potion or piece of armour in the time before the battle, suited to their real skills, the battlefield
and the enemy they'll face. A team with no maker cannot build anything new: its gear can only be what its members
already carry or could scavenge from the battlefield, at most two items.
Characters marked [injured] are hurt from an earlier fight and weaker; [gear broken] means their signature weapon
or gear is gone, so plan around that.
Plan around the terrain and around specific enemies. Be concrete and brief.`;

  const BATTLE_SYSTEM = `You are the judge of a fantasy battle between two drafted teams of fictional characters.
${CHARACTER_RULES}
Each team has already prepared in secret: a leader, a plan, gear and jobs. Pit the two preparations against each
other. Teams act on their plans and use their gear, but no plan survives contact unchanged: decide whose plan
anticipated the other, whose gear counters what, where a plan breaks, and whether spymasters or schemers saw
through the enemy's tricks. Devices can fail, be stolen or be turned against their makers.
A battle is not decided by raw power alone. Weigh strategy and leadership, cunning and deception, skill and
experience, raw power, the battlefield and home ground, and how well each team works together. A clever,
well-led, well-equipped team can and often should beat a stronger but disorganised one, unless the power gap is
truly overwhelming (a cosmic being against ordinary humans).
Characters marked [injured] fight at reduced strength; [gear broken] means they can't use their signature weapon.
Every character on both teams must play a part: mention each by name in the fight and give each their own line
in "roles". Nobody sits out. Be decisive: no draws. Be vivid but brief. For "winner", give the player's name
exactly as given.`;

  const tagsFor = r => {
    const u = (window.UNIVERSES || {})[r.world] || {};
    return [
      (u.strategists || []).includes(r.name) ? " [strategist]" : "",
      (u.makers || []).includes(r.name) ? " [maker]" : "",
    ].join("");
  };

  const isMaker = r => (((window.UNIVERSES || {})[r.world] || {}).makers || []).includes(r.name);

  // Earlier fights in a tournament can leave someone hurt or unarmed.
  const hurt = r => !r.condition ? ""
    : r.condition.status === "injured" ? ` [injured: ${r.condition.note}]`
    : r.condition.status === "broken" ? ` [gear broken: ${r.condition.note}]` : "";

  const rows = (team, worldName) => team.roster.length
    ? team.roster.map(r => `- ${r.name} (${worldName(r.world)}): ${r.note}${tagsFor(r)}${hurt(r)}`).join("\n")
    : "- nobody";

  const battlefield = (arena, worldName) => arena
    ? `The battlefield is ${arena.name} (${worldName(arena.world)}): ${arena.terrain}`
    : "The battlefield is varied: open ground, woods, a river crossing and a ruined keep on a hill.";

  // One key per character, so structured output can't leave anyone out. A
  // name drafted twice (Ghost the direwolf, Ghost of Marvel) gets its world.
  function roleKeys(teams) {
    const all = teams.flatMap(t => t.roster.map(r => ({ team: t.name, ...r })));
    return all.map(c => ({
      ...c,
      key: all.filter(o => o.name === c.name).length > 1 ? `${c.name} (${c.world})` : c.name,
    }));
  }

  const keyedObject = keys => ({
    type: "OBJECT",
    properties: Object.fromEntries(keys.map(k => [k, { type: "STRING" }])),
    required: keys,
  });

  function prepQuestion(teams, i, worldName, arena) {
    const us = teams[i], them = teams[1 - i];
    const keys = roleKeys(teams).filter(c => c.team === us.name);
    const makers = us.roster.filter(isMaker).map(r => r.name);
    const gearRule = makers.length
      ? `Your makers are ${makers.join(", ")}. Each can build ONE new item; everyone else can only bring what they already carry.`
      : "Your team has no makers, so you cannot build anything new: list at most two things your members already carry or could scavenge.";
    const user = `${battlefield(arena, worldName)}
Both teams arrive at dusk with a day to scout, build, plan and set traps before the clash.

Your team, drafted by ${us.name}:
${rows(us, worldName)}

The enemy, drafted by ${them.name}:
${rows(them, worldName)}

Reply as JSON:
- "leader": the character who leads your team
- "plan": your plan in three sentences: the approach, how you use the terrain, and how you deal with the enemy's most dangerous members
- "gear": the devices, weapons and supplies you go in with (array of {"name", "made_by", "effect"}). ${gearRule} "made_by" is the maker who built it, or "already theirs" or "scavenged".
- "jobs": one short sentence per character on your team, saying their job in the plan (an object with one key per character name, exactly as listed)`;
    const schema = {
      type: "OBJECT",
      properties: {
        leader: { type: "STRING" },
        plan: { type: "STRING" },
        gear: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              made_by: { type: "STRING", enum: [...makers, "already theirs", "scavenged"] },
              effect: { type: "STRING" },
            },
            required: ["name", "made_by", "effect"],
          },
        },
        jobs: keyedObject(keys.map(c => c.key)),
      },
      required: ["leader", "plan", "gear", "jobs"],
    };
    return { system: PREP_SYSTEM, user, schema, maxTokens: 900 };
  }

  function prepText(prep) {
    const gear = prep.gear.length
      ? prep.gear.map(g => `  - ${g.name} (${g.made_by}): ${g.effect}`).join("\n")
      : "  - nothing beyond what they carry";
    const jobs = prep.jobs.map(j => `  - ${j.name}: ${j.job}`).join("\n");
    return `Leader: ${prep.leader}\nPlan: ${prep.plan}\nGear:\n${gear}\nJobs:\n${jobs}`;
  }

  function battleQuestion(teams, preps, worldName, arena, aftermath) {
    const keys = roleKeys(teams).map(c => c.key);
    const user = `${battlefield(arena, worldName)}

${teams.map((t, i) => `Team drafted by ${t.name}:\n${rows(t, worldName)}\nTheir preparation:\n${prepText(preps[i])}`).join("\n\n")}

Reply as JSON:
- "fight": the battle in three short paragraphs: how each plan played out, which gear mattered, naming every character at least once
- "roles": one sentence for every character on both teams, saying what they did and how it went for them (an object with one key per character name, exactly as listed)
- "turning_point": the single moment that decided it, one sentence (a clever move or a device can count as much as a big hit)
- "mvp": the character who mattered most
- "winner": exactly one of: ${teams.map(t => JSON.stringify(t.name)).join(", ")}
- "verdict": one punchy line explaining why the winner won${aftermath ? `
- "aftermath": what this fight did to each character, which carries into their next fight: "fine", "injured",
  "gear_broken" or "dead", with a short note (an object with one key per character name). Most characters should
  come out "fine" or "injured"; only kill a character if the fight clearly did. Losers are likelier to be hurt.` : ""}`;
    const afterSchema = {
      type: "OBJECT",
      properties: Object.fromEntries(keys.map(k => [k, {
        type: "OBJECT",
        properties: { status: { type: "STRING", enum: ["fine", "injured", "gear_broken", "dead"] }, note: { type: "STRING" } },
        required: ["status", "note"],
      }])),
      required: keys,
    };
    const schema = {
      type: "OBJECT",
      properties: {
        ...(aftermath ? { aftermath: afterSchema } : {}),
        fight: { type: "STRING" },
        roles: keyedObject(keys),
        turning_point: { type: "STRING" },
        mvp: { type: "STRING" },
        winner: { type: "STRING" },
        verdict: { type: "STRING" },
      },
      required: ["fight", "roles", "turning_point", "mvp", "winner", "verdict", ...(aftermath ? ["aftermath"] : [])],
    };
    return { system: BATTLE_SYSTEM, user, schema, maxTokens: aftermath ? 2000 : 1500 };
  }

  // The same shape in JSON Schema, for WebLLM's grammar-constrained output.
  function lower(s) {
    if (Array.isArray(s)) return s.map(lower);
    if (!s || typeof s !== "object") return s;
    const out = {};
    for (const [k, v] of Object.entries(s)) {
      out[k] = k === "type" ? String(v).toLowerCase() : lower(v);
    }
    return out;
  }

  function json(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.slice(start, end + 1));
  }

  function tidyPrep(data, teams, i) {
    const us = teams[i];
    const given = data.jobs && typeof data.jobs === "object" ? data.jobs : {};
    const keys = roleKeys(teams).filter(c => c.team === us.name);
    // Hold the model to the gear rules: one build per maker on this team,
    // and at most two carried or scavenged things. Anything credited to
    // someone who can't build is dropped, so it can't decide the battle.
    const makers = us.roster.filter(isMaker).map(r => r.name);
    const built = new Set();
    let carried = 0;
    const gear = [];
    for (const g of Array.isArray(data.gear) ? data.gear : []) {
      const item = { name: String(g.name || "").trim(), made_by: String(g.made_by || "").trim(), effect: String(g.effect || "").trim() };
      if (!item.name) continue;
      const maker = makers.find(m => m.toLowerCase() === item.made_by.toLowerCase());
      if (maker) {
        if (built.has(maker)) continue;
        built.add(maker);
        gear.push({ ...item, made_by: maker });
      } else if (/^(already theirs|scavenged)$/i.test(item.made_by) && carried < 2) {
        carried++;
        gear.push({ ...item, made_by: item.made_by.toLowerCase() });
      }
    }
    return {
      team: us.name,
      leader: String(data.leader || ""),
      plan: String(data.plan || ""),
      gear,
      jobs: keys.map(c => ({ name: c.name, world: c.world, job: String(given[c.key] || given[c.name] || "").trim() })),
    };
  }

  function tidyBattle(data, teams) {
    // Small models sometimes paraphrase the winner; snap to a real name.
    const names = teams.map(t => t.name);
    if (!names.includes(data.winner)) {
      const w = String(data.winner || "").toLowerCase();
      data.winner = names.find(n => w.includes(n.toLowerCase())) || names[0];
    }
    const given = data.roles && typeof data.roles === "object" ? data.roles : {};
    data.roles = roleKeys(teams).map(c => ({
      team: c.team, name: c.name, world: c.world,
      role: String(given[c.key] || given[c.name] || "").trim(),
    }));
    data.fight = String(data.fight || "");
    if (data.aftermath && typeof data.aftermath === "object") {
      const given = data.aftermath;
      data.aftermath = roleKeys(teams).map(c => {
        const a = given[c.key] || given[c.name] || {};
        return { team: c.team, name: c.name, world: c.world, id: c.id, status: String(a.status || "fine"), note: String(a.note || "") };
      });
    }
    return data;
  }

  /* --- The PIN -----------------------------------------------------
     Grace's PIN unlocks the Gemini and video keys held on the party server.
     The keys never come to the browser: requests go through the server with
     the PIN, which it checks (and locks out guessers). */

  const pin = {
    get: () => safe.get(PIN_STORE),
    clear: () => safe.remove(PIN_STORE),
    async verify(p) {
      const r = await fetch(`${SERVER}/pin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin: p }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) throw new Error(d.error || "Too many wrong PINs. Try again in 15 minutes.");
      if (!d.ok) return false;
      safe.set(PIN_STORE, p);
      safe.remove(MODEL_STORE);
      return true;
    },
    looksLike: v => /^\d{4}$/.test(String(v).trim()),
  };

  /* --- Gemini ------------------------------------------------------ */

  const gemini = {
    key: () => safe.get(KEY_STORE),
    ready: () => !!(safe.get(KEY_STORE) || pin.get()),
    saveKey: k => { safe.set(KEY_STORE, k.trim()); safe.remove(MODEL_STORE); },
    forgetKey: () => { safe.remove(KEY_STORE); pin.clear(); safe.remove(MODEL_STORE); },

    async request(path, body) {
      // Your own key goes straight to Google; with the PIN, through the server.
      const viaPin = !gemini.key() && pin.get();
      const res = await fetch(viaPin ? `${SERVER}/gemini/${path}` : `${GEMINI}/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          ...(viaPin ? { "x-draft-pin": pin.get() } : { "x-goog-api-key": gemini.key() }),
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (viaPin && res.status === 403) { pin.clear(); throw new Error("That PIN isn't right any more. Enter it again, or use your own Gemini key."); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data.error && data.error.message) || `Gemini said ${res.status}.`;
        const bad = (res.status === 400 && /api key/i.test(msg)) || res.status === 401 || res.status === 403;
        const err = new Error(bad ? "Gemini didn't accept that API key." : msg);
        err.status = res.status;
        // Busy, rate-limited or briefly broken: another model may well answer.
        err.retry = !bad && (res.status === 429 || res.status >= 500 || res.status === 404);
        throw err;
      }
      return data;
    },

    // Every model this key can use, best first: stable Flash, then Flash
    // Lite, then previews, newest version first within each. Looked up live so
    // the app keeps working as Google adds and retires versions. The one that
    // last worked goes to the front.
    async models() {
      const data = await gemini.request("models?pageSize=1000");
      const names = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => m.name);
      const version = n => Number((n.match(/gemini-(\d+(?:\.\d+)?)/) || [0, 0])[1]);
      const tier = n =>
        /^models\/gemini-[\d.]+-flash$/.test(n) ? 0 :
        /^models\/gemini-[\d.]+-flash-lite$/.test(n) ? 1 :
        /^models\/gemini-[\d.]+-flash(-lite)?-preview/.test(n) ? 2 : 9;
      const sorted = names.filter(n => tier(n) < 9 && !gemini.spent.has(n))
        .sort((a, b) => tier(a) - tier(b) || version(b) - version(a));
      // A few of each kind, so a busy or used-up Flash still leaves Flash-Lite
      // (which has far more free calls a day) to fall back on.
      const pool = [0, 1, 2].flatMap(t => sorted.filter(n => tier(n) === t).slice(0, t === 2 ? 1 : 3));
      if (!pool.length) throw new Error("Gemini has run out of free calls on every model for today. Try tomorrow, or use the judge on this device.");
      const last = safe.get(MODEL_STORE);
      return last && pool.includes(last) ? [last, ...pool.filter(n => n !== last)] : pool;
    },

    // One structured question, falling back across models when one is busy.
    async ask(q, onStatus, what) {
      const pool = (gemini.pool = gemini.pool || await gemini.models());
      const short = n => n.replace("models/", "");
      const tried = [];
      for (const model of pool) {
        if (tried.length) onStatus(`${short(tried[tried.length - 1])} is busy, so ${what} goes to ${short(model)}…`);
        try {
          const data = await gemini.request(`${model}:generateContent`, {
            systemInstruction: { parts: [{ text: q.system }] },
            contents: [{ role: "user", parts: [{ text: q.user }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: q.schema, temperature: 0.9 },
          });
          const parts = (data.candidates && data.candidates[0] && data.candidates[0].content
            && data.candidates[0].content.parts) || [];
          const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join("");
          if (!text) throw Object.assign(new Error("Gemini came back empty."), { retry: true });
          const out = json(text);
          safe.set(MODEL_STORE, model);
          gemini.used = short(model);
          return out;
        } catch (err) {
          if (!err.retry && !(err instanceof SyntaxError)) throw err;
          // Out of free calls for the day: don't ask this model again this visit.
          if (err.status === 429 && /per ?day|quota/i.test(err.message)) gemini.spent.add(model);
          tried.push(model);
          await new Promise(r => setTimeout(r, 1200));
        }
      }
      throw new Error(`Gemini is swamped right now. I tried ${tried.map(short).join(", ")}, and they're all busy. `
        + "Give it a minute and try again, or use the judge on this device.");
    },

    async prepare(onStatus) {
      gemini.pool = null;
      onStatus("Finding a Gemini model…");
      gemini.pool = await gemini.models();
    },

    label: () => gemini.used || "Gemini",
    spent: new Set(),
    parallel: true,
  };

  /* --- WebLLM ------------------------------------------------------ */

  let engine = null;
  let engineModel = null;

  const gb = b => `${(b / 1e9).toFixed(1)}GB`;

  function isQuota(err) {
    return err && (err.name === "QuotaExceededError" || /quota/i.test(String(err.message || err)));
  }

  const SPACE_TIPS = "That usually means the disk is nearly full, "
    + "you're in a private or incognito window, or an earlier model download is taking the space. "
    + "Try “Clear downloaded models” below, free some disk space, or use a normal window.";
  const QUOTA_HELP = `Your browser wouldn't let this site store the model. ${SPACE_TIPS}`;

  const local = {
    models: LOCAL_MODELS,
    supported: () => "gpu" in navigator,

    // How much this site has stored, and roughly how much more it may store.
    async storage() {
      if (!navigator.storage || !navigator.storage.estimate) return null;
      try {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        return { usage, free: Math.max(0, quota - usage) };
      } catch { return null; }
    },

    async clear() {
      const webllm = await import(WEBLLM_URL);
      if (engine) { await engine.unload(); engine = null; engineModel = null; }
      for (const m of LOCAL_MODELS) {
        try { await webllm.deleteModelAllInfoInCache(m.id); } catch { /* not cached */ }
      }
    },

    modelId: LOCAL_MODELS[0].id,
    parallel: false,

    async prepare(onStatus) {
      const modelId = local.modelId;
      if (!local.supported()) {
        throw new Error("This browser doesn't have WebGPU, so it can't run a model locally. Try Chrome or Edge, or use Gemini.");
      }
      if (engine && engineModel === modelId) return;
      onStatus("Loading WebLLM…");
      const webllm = await import(WEBLLM_URL);
      const info = LOCAL_MODELS.find(m => m.id === modelId) || { bytes: 0 };
      const cached = await webllm.hasModelInCache(modelId).catch(() => false);
      if (!cached) {
        // Ask to be kept, so the browser doesn't evict gigabytes it just fetched.
        if (navigator.storage && navigator.storage.persist) await navigator.storage.persist().catch(() => {});
        const space = await local.storage();
        if (space && space.free < info.bytes * 1.1) {
          throw new Error(`This model needs about ${gb(info.bytes)} of storage, but your browser will only give this site `
            + `about ${gb(space.free)} more. ${SPACE_TIPS}`);
        }
      }
      if (engine) { await engine.unload(); engine = null; }
      try {
        engine = await webllm.CreateMLCEngine(modelId, {
          initProgressCallback: p => {
            const pct = Math.round((p.progress || 0) * 100);
            onStatus(`Getting the model ready, ${pct}%. The first time downloads it; after that it's cached.`, p.progress);
          },
        });
      } catch (err) {
        engine = null;
        if (isQuota(err)) throw new Error(QUOTA_HELP);
        throw err;
      }
      engineModel = modelId;
    },

    async ask(q) {
      const reply = await engine.chat.completions.create({
        messages: [{ role: "system", content: q.system }, { role: "user", content: q.user }],
        temperature: 0.6,
        max_tokens: q.maxTokens,
        response_format: { type: "json_object", schema: JSON.stringify(lower(q.schema)) },
        extra_body: { enable_thinking: false },
      });
      return json(reply.choices[0].message.content || "");
    },

    label: () => `${(LOCAL_MODELS.find(m => m.id === local.modelId) || {}).label || local.modelId}, on this device`,
  };

  /* --- The run ------------------------------------------------------
     Both war councils, then the battle. Preparations already made (say, the
     battle call failed last time) are reused rather than asked for again. */

  async function run(kind, { teams, worldName, arena, preps = [], onStatus, onPrep, aftermath = false }) {
    const backend = kind === "gemini" ? gemini : local;
    await backend.prepare(onStatus);
    const done = [preps[0] || null, preps[1] || null];

    const prepOne = async i => {
      if (done[i]) return done[i];
      const q = prepQuestion(teams, i, worldName, arena);
      const data = await backend.ask(q, onStatus, `${teams[i].name}'s war council`);
      done[i] = tidyPrep(data, teams, i);
      onPrep(i, done[i]);
      return done[i];
    };

    if (backend.parallel) {
      onStatus("Both war councils are planning…");
      await Promise.all([prepOne(0), prepOne(1)]);
    } else {
      for (const i of [0, 1]) {
        if (done[i]) continue;
        onStatus(`${teams[i].name}'s war council is planning on your GPU…`);
        await prepOne(i);
      }
    }

    onStatus("Both sides are ready. The battle is being fought…");
    const q = battleQuestion(teams, done, worldName, arena, aftermath);
    const battle = tidyBattle(await backend.ask(q, onStatus, "the battle"), teams);
    return { ...battle, preps: done, by: backend.label() };
  }

  /* --- The director ------------------------------------------------
     Turns a decided battle into a storyboard for a short film: one visual
     style, one fixed description per character, and a shot list. The shot
     prompts are assembled here, not by the model, so every shot repeats the
     same style and the same character descriptions word for word. That
     repetition is what keeps characters looking like themselves. */

  const DIRECTOR_SYSTEM = `You are the director of a very short film about a fantasy battle that has already been decided.
Never change the outcome, the plans or the gear: film what happened. Make it exciting, clear and a little funny.
The film is made by a text-to-video model, one shot at a time, so:
- "style": one line describing the look of the whole film (medium, lighting, palette), chosen to suit these characters.
  Keep it family-friendly blockbuster: stylised action, no blood, no gore.
- "cast": for every character, a "look": a purely visual description of 15 to 30 words (species or build, face,
  hair, outfit and its colours, signature weapon or prop; no names, no actors), and a "tag": a 2 to 4 word visual
  nickname such as "the armoured inventor" or "the blue-haired archer". The look is reused word for word in every shot.
- "shots": each "action" is one continuous moment that can be filmed in the shot's length: who is in frame,
  what they do, and the camera move. At most three characters in focus. Under 60 words. In "action", call
  characters only by their tag, never by name. Keep the action playful and theatrical, like a family adventure
  film: dazzling clashes, near misses, clever tricks and comic moments; nobody is seriously hurt.
  Each "caption" is a trailer-style line shown under the shot, under 14 words, present tense.
  "who" lists the characters on screen, using their names exactly as given.
- Every shot has one spoken line: "speaker" is the character who says it (one of "who"), and "line" is what they
  say out loud, in character, under 12 words: a taunt, a battle cry, a plan, a joke. It must sound like them.
  The line is spoken aloud in the film, so no stage directions, no names of real actors.`;

  function directorQuestion(teams, verdict, arena, worldName, shots) {
    const names = roleKeys(teams).map(c => c.key);
    const purpose = k => k.startsWith("prep_a") ? `${teams[0].name}'s team preparing: their plan in action, the makers building their gear`
      : k.startsWith("prep_b") ? `${teams[1].name}'s team preparing: their plan in action, the makers building their gear`
      : "the battle, in order";
    const prepText2 = (p, t) => p ? `${t.name}'s team, led by ${p.leader}. Plan: ${p.plan} Gear: ${(p.gear || []).map(g => `${g.name} (${g.made_by}): ${g.effect}`).join("; ") || "none"}` : "";
    const battleShots = shots.filter(x => x.key.startsWith("battle"));
    const user = `${battlefield(arena, worldName)}

${teams.map(t => `Team drafted by ${t.name}:\n${rows(t, worldName)}`).join("\n\n")}

What happened:
${(verdict.preps || []).map((p, i) => prepText2(p, teams[i])).filter(Boolean).join("\n")}
The fight: ${verdict.fight}
Turning point: ${verdict.turning_point}
Most valuable: ${verdict.mvp}
Winner: ${verdict.winner}'s team. ${verdict.verdict}

Shots to write, in order:
${shots.map(x => `- ${x.key} (${x.duration} seconds): ${purpose(x.key)}`).join("\n")}
The ${battleShots.length} battle shots tell the fight from first clash to the turning point, and the last one shows ${verdict.winner}'s team victorious.`;
    const shotSchema = {
      type: "OBJECT",
      properties: {
        who: { type: "ARRAY", items: { type: "STRING", enum: names } },
        action: { type: "STRING" },
        caption: { type: "STRING" },
        speaker: { type: "STRING", enum: names },
        line: { type: "STRING" },
      },
      required: ["who", "action", "caption", "speaker", "line"],
    };
    const schema = {
      type: "OBJECT",
      properties: {
        style: { type: "STRING" },
        cast: {
          type: "OBJECT",
          properties: Object.fromEntries(names.map(n => [n, {
            type: "OBJECT",
            properties: { look: { type: "STRING" }, tag: { type: "STRING" } },
            required: ["look", "tag"],
          }])),
          required: names,
        },
        shots: { type: "OBJECT", properties: Object.fromEntries(shots.map(x => [x.key, shotSchema])), required: shots.map(x => x.key) },
      },
      required: ["style", "cast", "shots"],
    };
    return { system: DIRECTOR_SYSTEM, user, schema, maxTokens: 2200 };
  }

  const SAFE = "Playful, theatrical, bloodless action like a family adventure film; nobody is seriously hurt. "
    + "No on-screen text or logos. Consistent character designs throughout.";

  // Names never reach the video model: they can trip its content filter, and
  // it draws from the descriptions anyway. Each character is "tag: look".
  function shotPrompt(board, shot, arena) {
    const cast = (shot.who || []).map(n => {
      const c = board.cast[n];
      return c ? `${c.tag}: ${c.look}.` : "";
    }).filter(Boolean).join(" ");
    const where = arena ? `Setting: ${arena.name}, ${arena.terrain}` : "";
    // The spoken line, quoted, so the video model voices it.
    const sp = shot.speaker && board.cast[shot.speaker];
    const speech = shot.line ? `${sp ? sp.tag : "One of them"} says clearly: "${shot.line.replace(/"/g, "'")}"` : "";
    return [board.style, where, cast, `Action: ${shot.action}`, speech, SAFE].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 1750);
  }

  async function storyboard(kind, { teams, verdict, arena, worldName, shots, onStatus }) {
    const backend = kind === "gemini" ? gemini : local;
    await backend.prepare(onStatus);
    onStatus("The director is writing the storyboard…");
    const data = await backend.ask(directorQuestion(teams, verdict, arena, worldName, shots), onStatus, "the director");
    const board = { style: String(data.style || ""), cast: {}, shots: {} };
    for (const [n, c] of Object.entries(data.cast || {})) {
      board.cast[n] = typeof c === "string" ? { look: c, tag: "a fighter" } : { look: String(c.look || ""), tag: String(c.tag || "a fighter") };
    }
    // Any name that slipped into an action becomes that character's tag.
    const unname = text => Object.entries(board.cast)
      .sort((a, b) => b[0].length - a[0].length)
      .reduce((t, [n, c]) => t.split(n).join(c.tag), text);
    for (const x of shots) {
      const sh = (data.shots || {})[x.key] || {};
      board.shots[x.key] = {
        who: Array.isArray(sh.who) ? sh.who.map(String) : [],
        action: unname(String(sh.action || "")),
        caption: String(sh.caption || ""),
        speaker: String(sh.speaker || ""),
        // Names spoken in a line are fine as dialogue, but keep it short.
        line: String(sh.line || "").split(/\s+/).slice(0, 16).join(" "),
      };
      board.shots[x.key].prompt = shotPrompt(board, board.shots[x.key], arena);
    }
    return board;
  }

  /* --- What a crowd-decided fight cost ---------------------------------
     The crowd picks a winner but says nothing about how it went, so for
     lasting harm in a tournament this reasons it out: given the teams, the
     ground and who won, what would the fight have done to each character? */

  async function aftermathOf(kind, { teams, winner, arena, worldName, onStatus = () => {} }) {
    const backend = kind === "gemini" ? gemini : local;
    await backend.prepare(onStatus);
    const keys = roleKeys(teams).map(c => c.key);
    const user = `${battlefield(arena, worldName)}

${teams.map(t => `Team drafted by ${t.name}:\n${rows(t, worldName)}`).join("\n\n")}

The crowd watched this fight and decided that ${winner}'s team won. Reason through how a fight between these
teams, here, would most likely have gone given that result, then say what it did to each character.

Reply as JSON:
- "aftermath": for each character, "fine", "injured", "gear_broken" or "dead", with a short note on why
  (an object with one key per character name). Base it only on what these characters can do against each other
  and on who won: a mismatch or a brutal fight hurts more, an easy win hurts less, and a character only dies if
  the fight would really have killed them.`;
    const schema = {
      type: "OBJECT",
      properties: {
        aftermath: {
          type: "OBJECT",
          properties: Object.fromEntries(keys.map(k => [k, {
            type: "OBJECT",
            properties: { status: { type: "STRING", enum: ["fine", "injured", "gear_broken", "dead"] }, note: { type: "STRING" } },
            required: ["status", "note"],
          }])),
          required: keys,
        },
      },
      required: ["aftermath"],
    };
    const data = await backend.ask({ system: BATTLE_SYSTEM, user, schema, maxTokens: 900 }, onStatus, "the medic");
    const given = (data && data.aftermath) || {};
    return roleKeys(teams).map(c => {
      const a = given[c.key] || given[c.name] || {};
      return { id: c.id, name: c.name, status: String(a.status || "fine"), note: String(a.note || "") };
    });
  }

  window.Judge = { gemini, local, run, storyboard, aftermathOf, pin, SERVER };
})();
