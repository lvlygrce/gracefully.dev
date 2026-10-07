"""Build ../sprites.js from the per-world spec lists here, checking each one.

Each line: Name<TAB>body|size|build|skin|hair|main|second|accent|hairStyle|head|outfit|weapon|extras|style|element
Run: python3 build.py
"""
import json, re, subprocess, sys, pathlib

HERE = pathlib.Path(__file__).parent
ENUMS = {
    "body": "h k r c q d b s o g".split(),
    "size": "s m l x".split(),
    "build": "t n w".split(),
    "hairStyle": "short long spiky bald ponytail bun mohawk afro slick braids buzz messy none".split(),
    "head": "none helmet helm hood fullmask cowl mask facemask hat tophat wizard cap crown headband bandana visor".split(),
    "outfit": "armour robe dress coat labcoat suit tunic uniform jersey jumpsuit fur bare vest".split(),
    "weapon": "none sword greatsword dagger katana lightsaber axe hammer mace club bat flail spear trident staff scythe wand bow crossbow gun rifle blaster cannon shield whip claws book guitar orb".split(),
    "style": "blade blunt fists claws bite bow gun magic beam breath summon psychic gadget".split(),
    "element": "none fire ice lightning water earth wind poison light dark psychic tech nature blood web smoke shield explosion".split(),
}
EXTRAS = set("""cape wings batwings wings_dark tail tail_bolt tail_flame ears ears_long ears_round ears_floppy horns horn antennae
halo flame_head beard moustache glasses eyepatch grin fangs cheeks redeyes glow_eyes glow gloves belt stripes spots emblem scarf
spikes shell mane noarms face_creeper webbing collar muzzle_light crest whiskers hood fins feet nubs no_ears crown_q boots_light shield""".split())
FIELDS = ["body", "size", "build", "skin", "hair", "main", "second", "accent", "hairStyle", "head", "outfit", "weapon", "extras", "style", "element"]

chars = json.loads(subprocess.run(["node", "-e", """
global.window={};eval(require('fs').readFileSync('../characters.js','utf8'));
const o={};for(const [k,w] of Object.entries(window.UNIVERSES))o[k]=w.characters.map(c=>c[0]);console.log(JSON.stringify(o))"""],
    cwd=HERE, capture_output=True, text=True, check=True).stdout)

out, bad = {}, 0
for f in sorted(HERE.glob("*.txt")):
    world = f.stem
    if world not in chars: print("unknown world", world); bad += 1; continue
    out[world] = {}
    for n, line in enumerate(f.read_text().splitlines(), 1):
        if not line.strip(): continue
        name, _, spec = line.partition("\t")
        parts = spec.split("|")
        where = f"{f.name}:{n} {name}"
        if name not in chars[world]: print("not in game:", where); bad += 1
        if len(parts) != 15: print("needs 15 fields:", where, len(parts)); bad += 1; continue
        d = dict(zip(FIELDS, parts))
        for k, allowed in ENUMS.items():
            if d[k] not in allowed: print(f"bad {k} {d[k]!r}:", where); bad += 1
        for k in ["skin", "hair", "main", "second", "accent"]:
            if not re.fullmatch(r"[0-9a-fA-F]{6}", d[k]): print(f"bad colour {k} {d[k]!r}:", where); bad += 1
        for x in filter(None, d["extras"].split(",")):
            if x not in EXTRAS: print(f"bad extra {x!r}:", where); bad += 1
        out[world][name] = spec
    missing = [c for c in chars[world] if c not in out[world]]
    if missing: print(f"{world}: {len(missing)} without a spec: {', '.join(missing[:8])}{'…' if len(missing) > 8 else ''}")

total = sum(len(v) for v in out.values())
js = ("/* 8-bit sprite specs, one per character, keyed by world then name. Built from\n"
      "   sprites-src/*.txt by sprites-src/build.py; the fields are listed in sprite.js. */\n\n"
      "window.CHARACTER_SPRITES = " + json.dumps(out, indent=1, ensure_ascii=False) + ";\n")
(HERE.parent / "sprites.js").write_text(js)
print(f"{total} specs written, {bad} problems")
sys.exit(1 if bad else 0)
