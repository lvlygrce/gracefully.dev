/* Chample — the answer list.

   A champion is five slots: passive, Q, W, E, R. Each ability carries ONE
   primary tag from a fixed vocabulary of nine. One tag per ability is a
   deliberate simplification: abilities do several things, and the tag is
   the thing the ability is *for*.

   The judgement calls, written down once so they stay consistent:

     dash    — any burst of self-movement: blinks, leaps, charges, and
               plain movement-speed buffs on yourself.
     hard CC — stun, root, knock-up, knock-back, taunt, fear, charm,
               sleep, polymorph, suppression.
     soft CC — slow, silence, blind, ground, wall, cripple.
     shield  — a barrier, damage reduction, bonus resistances or health,
               spell blocks, and untargetable-in-place defences.
     summon  — anything left on the field that acts on its own: pets,
               turrets, traps, walls of plants, clones, barrels.
     global  — reaches the whole map, or so far beyond the fight that
               range is the point of the ability.
     stealth — invisibility, camouflage, disguise, becoming untouchable
               by leaving the board.
     heal    — restores health to anyone, including lifesteal passives.
     damage  — everything whose whole job is a number going down.

   Adding a champion never disturbs a puzzle already played: the order is
   shuffled from a fixed seed in app.js, not taken from this list. */

export const TAGS = {
  dmg:     "damage",
  dash:    "dash",
  shield:  "shield",
  heal:    "heal",
  hardcc:  "hard CC",
  softcc:  "soft CC",
  stealth: "stealth",
  summon:  "summon",
  global:  "global"
};

export const SLOTS = ["passive", "Q", "W", "E", "R"];

/* name, then passive Q W E R */
const ROSTER = [
  ["Aatrox",          "heal hardcc hardcc dash heal"],
  ["Ahri",            "heal dmg dmg hardcc dash"],
  ["Akali",           "dmg dmg stealth dash dash"],
  ["Alistar",         "heal hardcc hardcc dmg shield"],
  ["Amumu",           "dmg hardcc dmg shield hardcc"],
  ["Anivia",          "shield hardcc softcc dmg softcc"],
  ["Annie",           "hardcc dmg dmg shield summon"],
  ["Ashe",            "softcc dmg dmg global hardcc"],
  ["Bard",            "summon hardcc heal dash hardcc"],
  ["Blitzcrank",      "shield hardcc dash hardcc dmg"],
  ["Brand",           "dmg hardcc dmg dmg dmg"],
  ["Braum",           "hardcc softcc shield shield hardcc"],
  ["Caitlyn",         "dmg dmg summon dash dmg"],
  ["Camille",         "shield dmg softcc dash hardcc"],
  ["Cho'Gath",        "heal hardcc softcc dmg dmg"],
  ["Darius",          "dmg dmg softcc hardcc dmg"],
  ["Diana",           "dmg dmg shield dash hardcc"],
  ["Dr. Mundo",       "shield softcc dmg dmg heal"],
  ["Ekko",            "dash softcc hardcc dash heal"],
  ["Evelynn",         "stealth dmg hardcc dash dmg"],
  ["Ezreal",          "dmg dmg dmg dash global"],
  ["Fiddlesticks",    "stealth hardcc heal softcc dash"],
  ["Fiora",           "heal dash shield dmg heal"],
  ["Fizz",            "dmg dash dmg dash hardcc"],
  ["Galio",           "dmg softcc shield dash global"],
  ["Gangplank",       "dmg dmg heal summon global"],
  ["Garen",           "heal softcc shield dmg dmg"],
  ["Gragas",          "heal softcc shield dash hardcc"],
  ["Graves",          "dmg dmg softcc dash dmg"],
  ["Gwen",            "heal dmg shield dash softcc"],
  ["Hecarim",         "dmg dmg heal dash hardcc"],
  ["Heimerdinger",    "dash summon dmg hardcc dmg"],
  ["Illaoi",          "summon dmg dash summon summon"],
  ["Irelia",          "dmg dash shield hardcc hardcc"],
  ["Janna",           "dash hardcc softcc shield heal"],
  ["Jarvan IV",       "dmg hardcc shield summon hardcc"],
  ["Jax",             "dmg dash dmg hardcc shield"],
  ["Jhin",            "dmg dmg hardcc summon dmg"],
  ["Jinx",            "dash dmg softcc summon global"],
  ["Kai'Sa",          "dmg dmg dmg dash dash"],
  ["Karthus",         "dmg dmg softcc dmg global"],
  ["Kassadin",        "shield dmg dmg softcc dash"],
  ["Katarina",        "dmg dmg dash dash dmg"],
  ["Kayle",           "dmg softcc heal dmg shield"],
  ["Kayn",            "dmg dash hardcc dash stealth"],
  ["Kennen",          "hardcc dmg dmg dash hardcc"],
  ["Kha'Zix",         "softcc dmg dmg dash stealth"],
  ["Kindred",         "dmg dash dmg softcc shield"],
  ["Lee Sin",         "dmg dash shield softcc hardcc"],
  ["Leona",           "dmg hardcc shield dash hardcc"],
  ["Lissandra",       "summon softcc hardcc dash hardcc"],
  ["Lucian",          "dmg dmg dash dash dmg"],
  ["Lulu",            "dmg softcc hardcc shield hardcc"],
  ["Lux",             "dmg hardcc shield softcc dmg"],
  ["Malphite",        "shield softcc dmg softcc hardcc"],
  ["Malzahar",        "shield softcc summon dmg hardcc"],
  ["Maokai",          "heal hardcc dash summon hardcc"],
  ["Master Yi",       "dmg dash heal dmg dash"],
  ["Miss Fortune",    "dmg dmg dash softcc dmg"],
  ["Mordekaiser",     "dmg dmg shield hardcc hardcc"],
  ["Morgana",         "heal hardcc dmg shield hardcc"],
  ["Nami",            "dash hardcc heal softcc hardcc"],
  ["Nasus",           "heal dmg softcc dmg shield"],
  ["Nautilus",        "hardcc hardcc shield softcc hardcc"],
  ["Neeko",           "stealth dmg summon hardcc hardcc"],
  ["Nocturne",        "heal dmg shield hardcc global"],
  ["Nunu & Willump",  "dmg heal dash hardcc hardcc"],
  ["Olaf",            "dmg softcc heal dmg shield"],
  ["Orianna",         "dmg dmg softcc shield hardcc"],
  ["Pantheon",        "dmg dmg hardcc shield global"],
  ["Poppy",           "shield dmg shield hardcc hardcc"],
  ["Pyke",            "heal hardcc stealth dash dmg"],
  ["Qiyana",          "dmg dmg dash dash hardcc"],
  ["Rakan",           "shield heal dash dash hardcc"],
  ["Rammus",          "dmg dash shield hardcc hardcc"],
  ["Renekton",        "dmg heal hardcc dash dmg"],
  ["Rengar",          "dash dmg heal softcc stealth"],
  ["Riven",           "dmg dash hardcc shield dmg"],
  ["Rumble",          "dmg dmg shield softcc softcc"],
  ["Ryze",            "dmg dmg hardcc dmg global"],
  ["Samira",          "dmg dmg shield dash dmg"],
  ["Sejuani",         "shield dash dmg hardcc hardcc"],
  ["Senna",           "dmg heal hardcc stealth global"],
  ["Seraphine",       "shield dmg heal hardcc hardcc"],
  ["Sett",            "dmg dmg shield hardcc hardcc"],
  ["Shaco",           "dmg stealth summon softcc summon"],
  ["Shen",            "shield dmg shield dash global"],
  ["Singed",          "dash dmg softcc hardcc dmg"],
  ["Sion",            "dmg hardcc shield softcc dash"],
  ["Sivir",           "dash dmg dmg shield dash"],
  ["Sona",            "dmg dmg heal dash hardcc"],
  ["Soraka",          "heal softcc heal hardcc global"],
  ["Swain",           "heal dmg softcc hardcc heal"],
  ["Talon",           "dmg dash softcc dash stealth"],
  ["Taric",           "dmg heal shield hardcc shield"],
  ["Teemo",           "stealth softcc dash dmg summon"],
  ["Thresh",          "dmg hardcc shield hardcc softcc"],
  ["Trundle",         "heal dmg heal softcc heal"],
  ["Tryndamere",      "dmg heal softcc dash shield"],
  ["Twitch",          "dmg stealth softcc dmg dmg"],
  ["Vayne",           "dash dash dmg hardcc stealth"],
  ["Veigar",          "dmg dmg dmg hardcc dmg"],
  ["Vel'Koz",         "dmg softcc dmg hardcc dmg"],
  ["Vi",              "shield dash dmg dmg hardcc"],
  ["Viktor",          "dmg shield hardcc dmg dmg"],
  ["Vladimir",        "dmg heal stealth dmg dmg"],
  ["Volibear",        "dmg hardcc heal shield dash"],
  ["Warwick",         "heal heal dash shield hardcc"],
  ["Wukong",          "shield dmg stealth dash hardcc"],
  ["Xayah",           "dmg dmg dmg hardcc stealth"],
  ["Xerath",          "dmg dmg softcc hardcc global"],
  ["Xin Zhao",        "heal hardcc softcc dash hardcc"],
  ["Yasuo",           "shield dmg shield dash hardcc"],
  ["Yone",            "dmg dmg shield dash hardcc"],
  ["Yorick",          "summon heal softcc softcc summon"],
  ["Zed",             "dmg dmg summon softcc dash"],
  ["Zeri",            "shield dmg softcc dash dmg"],
  ["Ziggs",           "dmg dmg dash softcc global"],
  ["Zoe",             "dmg dmg dash hardcc dash"],
  ["Zyra",            "summon dmg summon hardcc hardcc"]
];

/* A guess is matched on this: lower case, no spaces, no punctuation.
   So "khazix", "Kha Zix" and "KHA'ZIX" all land on the same champion. */
export const normalise = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const CHAMPIONS = ROSTER.map(([name, tags]) => ({
  name,
  key: normalise(name),
  kit: tags.split(" ")
}));

export const BY_KEY = new Map(CHAMPIONS.map(c => [c.key, c]));
