/* The judge — reasons through who wins. Two ways to run it, both with no server:
   Gemini, called straight from the browser with the player's own API key, or a
   small model running on this device's GPU through WebLLM.

   The key lives in localStorage, not a cookie: cookies ride along on every
   request to this site, while localStorage never leaves the browser. It is only
   ever sent to Google, in a header. */

(function () {
  "use strict";

  const KEY_STORE = "character-draft:v1:gemini-key";
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

  /* --- The question ------------------------------------------------ */

  const SYSTEM = `You are the judge of a fantasy team battle between two drafted teams of fictional characters.
Judge as a knowledgeable fan: use what the characters can actually do in their source material
(games, shows, films, comics, books). When teams mix worlds, scale power fairly and say how you did.

A battle is not decided by raw power alone. Weigh all of these, and give the non-physical ones real weight:
- Strategy and leadership: a proven general or commander makes the whole team fight as one, picks the ground,
  sets the timing and exploits the enemy's weaknesses. A team without one fights as scattered individuals.
- Cunning and deception: schemers, spymasters, tricksters and survivors win through traps, lies, bribes,
  betrayal, misdirection, ambushes and simply refusing to fight on the enemy's terms.
- Skill, experience and instinct: veterans, assassins and sellswords who know when to strike and when to run.
- Raw power and abilities: strength, magic, technology, creatures.
- Synergy: how well the team's members cover each other's weaknesses.
Characters marked [strategist] are renowned for strategy, leadership or cunning. Make their plans matter:
a clever, well-led team can and often should beat a stronger but leaderless one, unless the power gap is
truly overwhelming (a cosmic being against ordinary humans). Show the thinking, not only the punching.
The two players only drafted the teams; they are not in the fight. Only the listed characters fight.
Stick to what each character really is and can do; never invent powers or weapons they don't have.
Every character on both teams must play a part: mention each of them by name in the fight, and give each one
their own line in "roles". Nobody sits out.
Be decisive: no draws. Be vivid but brief. For "winner", give the player's name exactly as given.`;

  function isStrategist(r) {
    const u = (window.UNIVERSES || {})[r.world];
    return !!(u && u.strategists && u.strategists.includes(r.name));
  }

  function describe(teams, worldName) {
    return teams.map(t => {
      const rows = t.roster.length
        ? t.roster.map(r => `- ${r.name} (${worldName(r.world)}): ${r.note}${isStrategist(r) ? " [strategist]" : ""}`).join("\n")
        : "- nobody";
      return `Team drafted by ${t.name}:\n${rows}`;
    }).join("\n\n");
  }

  function prompt(teams, worldName) {
    return `Two teams fight to the finish on a varied battlefield: open ground, woods, a river crossing and a ruined
keep on a hill. Both arrive at dusk with a day to scout, plan, set traps or try tricks before the clash.

${describe(teams, worldName)}

Reply as JSON with these fields:
- "edges": for each team, who leads it and its plan, its biggest strength and its biggest weakness, one sentence each (array of {"team", "plan", "strength", "weakness"}, where "team" is the player's name)
- "fight": the battle in three short paragraphs, naming every character at least once, with their abilities and the tactics or tricks they use
- "roles": one sentence for every character, saying what they did in the fight and how it went for them (an object with one key per character name, exactly as listed)
- "turning_point": the single moment that decided it, one sentence (a clever move counts as much as a big hit)
- "mvp": the character who mattered most
- "winner": exactly one of: ${teams.map(t => JSON.stringify(t.name)).join(", ")}
- "verdict": one punchy line explaining why the winner won`;
  }

  const SCHEMA = {
    type: "OBJECT",
    properties: {
      edges: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: { team: { type: "STRING" }, plan: { type: "STRING" }, strength: { type: "STRING" }, weakness: { type: "STRING" } },
          required: ["team", "plan", "strength", "weakness"],
        },
      },
      fight: { type: "STRING" },
      turning_point: { type: "STRING" },
      mvp: { type: "STRING" },
      winner: { type: "STRING" },
      verdict: { type: "STRING" },
    },
    required: ["edges", "fight", "turning_point", "mvp", "winner", "verdict"],
  };

  // One key per character, so the model's structured output can't leave
  // anyone out. A name drafted twice (Ghost the direwolf and Ghost of Marvel)
  // gets its world added.
  function roleKeys(teams) {
    const all = teams.flatMap(t => t.roster.map(r => ({ team: t.name, ...r })));
    return all.map(c => ({
      ...c,
      key: all.filter(o => o.name === c.name).length > 1 ? `${c.name} (${c.world})` : c.name,
    }));
  }

  function schemaFor(teams) {
    const keys = roleKeys(teams).map(c => c.key);
    return {
      ...SCHEMA,
      properties: {
        ...SCHEMA.properties,
        roles: {
          type: "OBJECT",
          properties: Object.fromEntries(keys.map(k => [k, { type: "STRING" }])),
          required: keys,
        },
      },
      required: [...SCHEMA.required, "roles"],
    };
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

  function parse(text, teams) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const data = JSON.parse(text.slice(start, end + 1));
    // Small models sometimes paraphrase the winner; snap to a real name.
    const names = teams.map(t => t.name);
    if (!names.includes(data.winner)) {
      const lowerWinner = String(data.winner || "").toLowerCase();
      data.winner = names.find(n => lowerWinner.includes(n.toLowerCase())) || names[0];
    }
    // Turn the roles object into a list grouped by team, in draft order.
    const given = data.roles && typeof data.roles === "object" ? data.roles : {};
    data.roles = roleKeys(teams).map(c => ({
      team: c.team, name: c.name, world: c.world,
      role: String(given[c.key] || given[c.name] || "").trim(),
    }));
    if (typeof data.fight !== "string") data.fight = String(data.fight || "");
    if (!Array.isArray(data.edges)) data.edges = [];
    return data;
  }

  /* --- Gemini ------------------------------------------------------ */

  const gemini = {
    key: () => safe.get(KEY_STORE),
    saveKey: k => { safe.set(KEY_STORE, k.trim()); safe.remove(MODEL_STORE); },
    forgetKey: () => { safe.remove(KEY_STORE); safe.remove(MODEL_STORE); },

    async request(path, body) {
      const res = await fetch(`${GEMINI}/${path}`, {
        method: body ? "POST" : "GET",
        headers: { "x-goog-api-key": gemini.key(), ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
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
      const pool = names.filter(n => tier(n) < 9)
        .sort((a, b) => tier(a) - tier(b) || version(b) - version(a));
      if (!pool.length) throw new Error("This API key can't use any Gemini Flash models.");
      const last = safe.get(MODEL_STORE);
      return last && pool.includes(last) ? [last, ...pool.filter(n => n !== last)] : pool;
    },

    async judge(teams, worldName, onStatus) {
      onStatus("Finding a Gemini model…");
      const pool = (await gemini.models()).slice(0, 5);
      const short = n => n.replace("models/", "");
      const tried = [];
      for (const model of pool) {
        onStatus(tried.length
          ? `${short(tried[tried.length - 1])} is busy, so asking ${short(model)} instead…`
          : `The judge is reasoning it through (${short(model)})…`);
        try {
          const data = await gemini.request(`${model}:generateContent`, {
            systemInstruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: prompt(teams, worldName) }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schemaFor(teams), temperature: 0.9 },
          });
          const parts = (data.candidates && data.candidates[0] && data.candidates[0].content
            && data.candidates[0].content.parts) || [];
          const text = parts.filter(p => p.text && !p.thought).map(p => p.text).join("");
          if (!text) throw Object.assign(new Error("Gemini came back empty."), { retry: true });
          const verdict = { ...parse(text, teams), by: short(model) };
          safe.set(MODEL_STORE, model);
          return verdict;
        } catch (err) {
          if (!err.retry && !(err instanceof SyntaxError)) throw err;
          tried.push(model);
          await new Promise(r => setTimeout(r, 1200));
        }
      }
      throw new Error(`Gemini is swamped right now. I tried ${tried.map(short).join(", ")}, and they're all busy. `
        + "Give it a minute and try again, or use the judge on this device.");
    },
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

    async judge(teams, worldName, onStatus, modelId) {
      if (!local.supported()) {
        throw new Error("This browser doesn't have WebGPU, so it can't run a model locally. Try Chrome or Edge, or use Gemini.");
      }
      if (!engine || engineModel !== modelId) {
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
      }
      onStatus("The judge is reasoning it through on your GPU…");
      const reply = await engine.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt(teams, worldName) },
        ],
        temperature: 0.5,
        max_tokens: 1800,
        response_format: { type: "json_object", schema: JSON.stringify(lower(schemaFor(teams))) },
        extra_body: { enable_thinking: false },
      });
      const text = reply.choices[0].message.content || "";
      const label = (LOCAL_MODELS.find(m => m.id === modelId) || {}).label || modelId;
      return { ...parse(text, teams), by: `${label}, on this device` };
    },
  };

  window.Judge = { gemini, local };
})();
