/* Wardle — the roster.

   A champion is five slots: passive, Q, W, E, R. Each ability carries ONE
   primary tag from a fixed vocabulary. One tag per ability is a deliberate
   simplification: abilities do several things, and the tag is the thing the
   ability is *for*.

   The judgement calls, written down once so they stay consistent:

     dash    — any burst of self-movement: blinks, leaps, charges, and plain
               movement-speed buffs on yourself.
     hard CC — stun, root, knock-up, knock-back, taunt, fear, charm, sleep,
               polymorph, suppression.
     soft CC — slow, silence, blind, ground, cripple, a wall in the way.
     shield  — a barrier, damage reduction, bonus resistances or health, a
               spell block, untargetable-in-place defences, refusing to die.
     summon  — anything left on the field that acts on its own: pets, turrets,
               traps, plants, clones, barrels, a borrowed body.
     global  — reaches the whole map, or so far past the fight that the range
               is the point of the ability.
     stealth — invisibility, camouflage, disguise, or leaving the board so
               that nothing can touch you.
     heal    — health restored to anyone, lifesteal passives included.
     damage  — everything whose whole job is a number going down.
     utility — the fifteen that do none of the above: gold, experience, vision,
               cooldowns, forging items, swapping weapons or stances, stealing
               or repeating somebody else's spell.

   Sources, as of patch 16.17.1:
     lane     — client_positions, League wiki Module:ChampionData
     role     — champion tags, Riot Data Dragon
     passive  — Data Dragon
     Q W E R  — Data Dragon, shown only once the answer is revealed
     year     — release date, League wiki Module:ChampionData
     region   — birthplace rather than the faction the client files them
                under, following the same rule as Riftle. This is the one
                field with no machine-readable source, so it is a judgement
                call in a few cases: Kayle and Morgana under Targon, Janna
                under Shurima, Kalista under Camavor, Jax under Icathia.
     skins    — Data Dragon, chromas excluded. The one field that drifts:
                it is a snapshot, and it only ever goes up.
     tags     — mine. Argue with them in the codex.

   Adding a champion never disturbs a puzzle already played: the order is
   shuffled from a fixed seed in app.js, not taken from this list. */

export const TAGS = {
  damage:  "damage",
  dash:    "dash",
  shield:  "shield",
  heal:    "heal",
  hardcc:  "hard CC",
  softcc:  "soft CC",
  stealth: "stealth",
  summon:  "summon",
  global:  "global",
  utility: "utility"
};

export const SLOTS = ["passive", "Q", "W", "E", "R"];

/* name, tags (passive Q W E R), lane, role, passive, year, region, skins, Q|W|E|R */
const ROSTER = [
["Aatrox","heal hardcc hardcc dash heal","Top","Fighter","Deathbringer Stance",2013,"Shurima",11,"The Darkin Blade|Infernal Chains|Umbral Dash|World Ender"],
["Ahri","heal damage damage hardcc dash","Middle","Mage/Assassin","Essence Theft",2011,"Ionia",20,"Orb of Deception|Fox-Fire|Charm|Spirit Rush"],
["Akali","damage damage stealth dash dash","Top or Middle","Assassin","Assassin's Mark",2010,"Ionia",20,"Five Point Strike|Twilight Shroud|Shuriken Flip|Perfect Execution"],
["Akshan","damage damage stealth dash damage","Middle","Marksman/Assassin","Dirty Fighting",2021,"Shurima",4,"Avengerang|Going Rogue|Heroic Swing|Comeuppance"],
["Alistar","heal hardcc hardcc damage shield","Support","Tank/Support","Triumphant Roar",2009,"Noxus",16,"Pulverize|Headbutt|Trample|Unbreakable Will"],
["Ambessa","dash damage shield softcc hardcc","Top or Jungle","Fighter/Assassin","Drakehound's Step",2024,"Noxus",2,"Cunning Sweep / Sundering Slam|Repudiation|Lacerate|Public Execution"],
["Amumu","damage hardcc damage shield hardcc","Jungle","Tank/Support","Cursed Touch",2009,"Shurima",14,"Bandage Toss|Despair|Tantrum|Curse of the Sad Mummy"],
["Anivia","shield hardcc softcc damage softcc","Middle","Mage","Rebirth",2009,"the Freljord",12,"Flash Frost|Crystallize|Frostbite|Glacial Storm"],
["Annie","hardcc damage damage shield summon","Middle","Mage/Support","Pyromania",2009,"Noxus",19,"Disintegrate|Incinerate|Molten Shield|Summon: Tibbers"],
["Aphelios","utility damage utility utility damage","Bottom","Marksman","The Hitman and the Seer",2019,"Mount Targon",6,"Weapon Abilites|Phase|Weapon Queue System|Moonlight Vigil"],
["Ashe","softcc damage damage global hardcc","Bottom or Support","Marksman/Support","Frost Shot",2009,"the Freljord",21,"Ranger's Focus|Volley|Hawkshot|Enchanted Crystal Arrow"],
["Aurelion Sol","damage damage dash hardcc hardcc","Middle","Mage","Cosmic Creator",2016,"Mount Targon",6,"Breath of Light|Astral Flight|Singularity|Falling Star / The Skies Descend"],
["Aurora","heal damage stealth dash softcc","Middle or Top","Mage/Assassin","Spirit Abjuration",2024,"the Freljord",3,"Twofold Hex|Across the Veil|The Weirding|Between Worlds"],
["Azir","summon damage summon dash hardcc","Middle","Mage/Marksman","Shurima's Legacy",2014,"Shurima",7,"Conquering Sands|Arise!|Shifting Sands|Emperor's Divide"],
["Bard","summon hardcc heal dash hardcc","Support","Support/Mage","Traveler's Call",2015,"Runeterra",11,"Cosmic Binding|Caretaker's Shrine|Magical Journey|Tempered Fate"],
["Bel'Veth","damage dash hardcc heal shield","Jungle","Fighter","Death in Lavender",2022,"the Void",4,"Void Surge|Above and Below|Royal Maelstrom|Endless Banquet"],
["Blitzcrank","shield hardcc dash hardcc damage","Support","Tank/Support","Mana Barrier",2009,"Zaun",21,"Rocket Grab|Overdrive|Power Fist|Static Field"],
["Brand","damage hardcc damage damage damage","Jungle or Support","Mage/Support","Blaze",2011,"the Freljord",13,"Sear|Pillar of Flame|Conflagration|Pyroclasm"],
["Braum","hardcc softcc shield shield hardcc","Support","Tank/Support","Concussive Blows",2014,"the Freljord",9,"Winter's Bite|Stand Behind Me|Unbreakable|Glacial Fissure"],
["Briar","heal hardcc dash softcc hardcc","Jungle","Fighter/Assassin","Crimson Curse",2023,"Noxus",3,"Head Rush|Blood Frenzy / Snack Attack|Chilling Scream|Certain Death"],
["Caitlyn","damage damage summon dash damage","Bottom","Marksman","Headshot",2011,"Piltover",22,"Piltover Peacemaker|Yordle Snap Trap|90 Caliber Net|Ace in the Hole"],
["Camille","shield damage softcc dash hardcc","Top","Fighter/Assassin","Adaptive Defenses",2016,"Piltover",8,"Precision Protocol|Tactical Sweep|Hookshot|The Hextech Ultimatum"],
["Cassiopeia","dash damage softcc damage hardcc","Middle","Mage","Serpentine Grace",2010,"Noxus",12,"Noxious Blast|Miasma|Twin Fang|Petrifying Gaze"],
["Cho'Gath","heal hardcc softcc damage damage","Top","Tank/Mage","Carnivore",2009,"the Void",11,"Rupture|Feral Scream|Vorpal Spikes|Feast"],
["Corki","damage damage dash damage damage","Bottom","Marksman/Mage","Hextech Munitions",2009,"Bandle City",11,"Phosphorus Bomb|Valkyrie|Gatling Gun|Missile Barrage"],
["Darius","damage damage softcc hardcc damage","Top","Fighter/Tank","Hemorrhage",2012,"Noxus",18,"Decimate|Crippling Strike|Apprehend|Noxian Guillotine"],
["Diana","damage damage shield dash hardcc","Jungle or Middle","Fighter/Assassin","Moonsilver Blade",2012,"Mount Targon",16,"Crescent Strike|Pale Cascade|Lunar Rush|Moonfall"],
["Dr. Mundo","shield softcc damage damage heal","Top or Jungle","Tank/Fighter","Goes Where He Pleases",2009,"Zaun",11,"Infected Bonesaw|Heart Zapper|Blunt Force Trauma|Maximum Dosage"],
["Draven","utility damage dash hardcc damage","Bottom","Marksman","League of Draven",2012,"Noxus",14,"Spinning Axe|Blood Rush|Stand Aside|Whirling Death"],
["Ekko","dash softcc hardcc dash heal","Jungle or Middle","Assassin/Mage","Z-Drive Resonance",2015,"Zaun",12,"Timewinder|Parallel Convergence|Phase Dive|Chronobreak"],
["Elise","summon damage summon hardcc summon","Jungle","Assassin/Mage","Spider Queen",2012,"Noxus",9,"Neurotoxin / Venomous Bite|Volatile Spiderling / Skittering Frenzy|Cocoon / Rappel|Spider Form"],
["Evelynn","stealth damage hardcc dash damage","Jungle","Assassin/Mage","Demon Shade",2009,"Runeterra",15,"Hate Spike|Allure|Whiplash|Last Caress"],
["Ezreal","damage damage damage dash global","Bottom","Marksman/Mage","Rising Spell Force",2010,"Piltover",21,"Mystic Shot|Essence Flux|Arcane Shift|Trueshot Barrage"],
["Fiddlesticks","stealth hardcc heal softcc dash","Jungle","Mage/Support","A Harmless Scarecrow",2009,"Runeterra",12,"Terrify|Bountiful Harvest|Reap|Crowstorm"],
["Fiora","heal dash shield damage heal","Top","Fighter/Assassin","Duelist's Dance",2012,"Demacia",16,"Lunge|Riposte|Bladework|Grand Challenge"],
["Fizz","damage dash damage dash hardcc","Middle","Assassin/Fighter","Nimble Fighter",2011,"Bilgewater",15,"Urchin Strike|Seastone Trident|Playful / Trickster|Chum the Waters"],
["Galio","damage softcc shield dash global","Middle","Tank/Mage","Colossal Smash",2010,"Demacia",11,"Winds of War|Shield of Durand|Justice Punch|Hero's Entrance"],
["Gangplank","damage damage heal summon global","Top","Fighter","Trial by Fire",2009,"Bilgewater",12,"Parrrley|Remove Scurvy|Powder Keg|Cannon Barrage"],
["Garen","heal softcc shield damage damage","Top","Fighter/Tank","Perseverance",2010,"Demacia",19,"Decisive Strike|Courage|Judgment|Demacian Justice"],
["Gnar","shield softcc damage dash hardcc","Top","Fighter/Tank","Rage Gene",2014,"the Freljord",10,"Boomerang Throw / Boulder Toss|Hyper / Wallop|Hop / Crunch|GNAR!"],
["Gragas","heal softcc shield dash hardcc","Jungle","Fighter/Mage","Happy Hour",2010,"the Freljord",14,"Barrel Roll|Drunken Rage|Body Slam|Explosive Cask"],
["Graves","damage damage softcc dash damage","Jungle","Marksman","New Destiny",2011,"Bilgewater",13,"End of the Line|Smoke Screen|Quickdraw|Collateral Damage"],
["Gwen","heal damage shield dash softcc","Top","Fighter","A Thousand Cuts",2021,"the Shadow Isles",6,"Snip Snip!|Hallowed Mist|Skip 'n Slash|Needlework"],
["Hecarim","damage damage heal dash hardcc","Jungle","Fighter/Tank","Warpath",2012,"the Shadow Isles",12,"Rampage|Spirit of Dread|Devastating Charge|Onslaught of Shadows"],
["Heimerdinger","dash summon damage hardcc damage","Top","Mage/Support","Hextech Affinity",2009,"Piltover",9,"H-28 G Evolution Turret|Hextech Micro-Rockets|CH-2 Electron Storm Grenade|UPGRADE!!!"],
["Hwei","damage damage heal hardcc softcc","Middle or Support","Mage/Support","Signature of the Visionary",2023,"Ionia",3,"Subject: Disaster|Subject: Serenity|Subject: Torment|Spiraling Despair"],
["Illaoi","summon damage dash summon summon","Top","Fighter/Tank","Prophet of an Elder God",2015,"Bilgewater",6,"Tentacle Smash|Harsh Lesson|Test of Spirit|Leap of Faith"],
["Irelia","damage dash shield hardcc hardcc","Top or Middle","Fighter/Assassin","Ionian Fervor",2010,"Ionia",15,"Bladesurge|Defiant Dance|Flawless Duet|Vanguard's Edge"],
["Ivern","utility hardcc damage shield summon","Jungle","Support/Mage","Friend of the Forest",2016,"the Freljord",6,"Rootcaller|Brushmaker|Triggerseed|Daisy!"],
["Janna","dash hardcc softcc shield heal","Support","Support/Mage","Tailwind",2009,"Shurima",16,"Howling Gale|Zephyr|Eye Of The Storm|Monsoon"],
["Jarvan IV","damage hardcc shield summon hardcc","Jungle","Fighter/Tank","Martial Cadence",2011,"Demacia",15,"Dragon Strike|Golden Aegis|Demacian Standard|Cataclysm"],
["Jax","damage dash damage hardcc shield","Top or Jungle","Fighter","Relentless Assault",2009,"Icathia",20,"Leap Strike|Empower|Counter Strike|Grandmaster-at-Arms"],
["Jayce","dash damage damage hardcc shield","Top","Fighter/Marksman","Hextech Capacitor",2012,"Piltover",12,"To the Skies! / Shock Blast|Lightning Field / Hyper Charge|Thundering Blow / Acceleration Gate|Mercury Cannon / Mercury Hammer"],
["Jhin","damage damage hardcc summon damage","Bottom","Marksman/Mage","Whisper",2016,"Ionia",13,"Dancing Grenade|Deadly Flourish|Captive Audience|Curtain Call"],
["Jinx","dash damage softcc summon global","Bottom","Marksman","Get Excited!",2013,"Zaun",15,"Switcheroo!|Zap!|Flame Chompers!|Super Mega Death Rocket!"],
["K'Sante","damage softcc hardcc dash hardcc","Top","Tank/Fighter","Dauntless Instinct",2022,"Shurima",3,"Ntofo Strikes|Path Maker|Footwork|All Out"],
["Kai'Sa","damage damage damage dash dash","Bottom","Marksman/Mage","Second Skin",2018,"Shurima",14,"Icathian Rain|Void Seeker|Supercharge|Killer Instinct"],
["Kalista","dash damage summon damage hardcc","Bottom","Marksman","Martial Poise",2014,"Camavor",6,"Pierce|Sentinel|Rend|Fate's Call"],
["Karma","utility damage hardcc shield utility","Middle or Support","Mage/Support","Gathering Fire",2011,"Ionia",15,"Inner Flame|Focused Resolve|Inspire|Mantra"],
["Karthus","damage damage softcc damage global","Jungle","Mage","Death Defied",2009,"the Shadow Isles",13,"Lay Waste|Wall of Pain|Defile|Requiem"],
["Kassadin","shield damage damage softcc dash","Middle","Assassin/Mage","Void Stone",2009,"Shurima",9,"Null Sphere|Nether Blade|Force Pulse|Riftwalk"],
["Katarina","damage damage dash dash damage","Middle","Assassin/Mage","Voracity",2009,"Noxus",19,"Bouncing Blade|Preparation|Shunpo|Death Lotus"],
["Kayle","damage softcc heal damage shield","Top","Marksman/Mage","Divine Ascent",2009,"Mount Targon",18,"Radiant Blast|Celestial Blessing|Starfire Spellblade|Divine Judgment"],
["Kayn","damage dash hardcc dash stealth","Jungle","Fighter/Assassin","The Darkin Scythe",2017,"Ionia",7,"Reaping Slash|Blade's Reach|Shadow Step|Umbral Trespass"],
["Kennen","hardcc damage damage dash hardcc","Top","Mage","Mark of the Storm",2010,"Ionia",10,"Thundering Shuriken|Electrical Surge|Lightning Rush|Slicing Maelstrom"],
["Kha'Zix","softcc damage damage dash stealth","Jungle","Assassin","Unseen Threat",2012,"the Void",8,"Taste Their Fear|Void Spike|Leap|Void Assault"],
["Kindred","damage dash damage softcc shield","Jungle","Marksman","Mark of the Kindred",2015,"Runeterra",9,"Dance of Arrows|Wolf's Frenzy|Mounting Dread|Lamb's Respite"],
["Kled","shield hardcc damage dash dash","Top","Fighter","Skaarl, the Cowardly Lizard",2016,"Noxus",4,"Bear Trap on a Rope|Violent Tendencies|Jousting|Chaaaaaaaarge!!!"],
["Kog'Maw","damage damage damage softcc damage","Bottom","Marksman/Mage","Icathian Surprise",2010,"the Void",15,"Caustic Spittle|Bio-Arcane Barrage|Void Ooze|Living Artillery"],
["LeBlanc","stealth damage dash hardcc utility","Middle","Assassin/Mage","Mirror Image",2010,"Noxus",14,"Sigil of Malice|Distortion|Ethereal Chains|Mimic"],
["Lee Sin","damage dash shield softcc hardcc","Jungle","Fighter/Assassin","Flurry",2011,"Ionia",21,"Sonic Wave / Resonating Strike|Safeguard / Iron Will|Tempest / Cripple|Dragon's Rage"],
["Leona","damage hardcc shield dash hardcc","Support","Tank/Support","Sunlight",2011,"Mount Targon",21,"Shield of Daybreak|Eclipse|Zenith Blade|Solar Flare"],
["Lillia","damage damage damage softcc hardcc","Jungle","Fighter/Mage","Dream-Laden Bough",2020,"Ionia",6,"Blooming Blows|Watch Out! Eep!|Swirlseed|Lilting Lullaby"],
["Lissandra","summon softcc hardcc dash hardcc","Middle","Mage","Iceborn Subjugation",2013,"the Freljord",9,"Ice Shard|Ring of Frost|Glacial Path|Frozen Tomb"],
["Locke","damage damage heal dash hardcc","Middle","Assassin/Mage","Silver Stake",2026,"Demacia",1,"Ritual Nails|Soul Ignition|Ashen Pursuit|Purgatory"],
["Lucian","damage damage dash dash damage","Bottom","Marksman/Assassin","Lightslinger",2013,"the Shadow Isles",17,"Piercing Light|Ardent Blaze|Relentless Pursuit|The Culling"],
["Lulu","damage softcc hardcc shield hardcc","Support","Support/Mage","Pix, Faerie Companion",2012,"Bandle City",14,"Glitterlance|Whimsy|Help, Pix!|Wild Growth"],
["Lux","damage hardcc shield softcc damage","Middle or Support","Mage/Support","Illumination",2010,"Demacia",21,"Light Binding|Prismatic Barrier|Lucent Singularity|Final Spark"],
["Malphite","shield softcc damage softcc hardcc","Top","Tank/Mage","Granite Shield",2009,"Ixtal",14,"Seismic Shard|Thunderclap|Ground Slam|Unstoppable Force"],
["Malzahar","shield softcc summon damage hardcc","Middle","Mage","Void Shift",2010,"Shurima",13,"Call of the Void|Void Swarm|Malefic Visions|Nether Grasp"],
["Maokai","heal hardcc dash summon hardcc","Support","Tank/Support","Sap Magic",2011,"the Shadow Isles",11,"Bramble Smash|Twisted Advance|Sapling Toss|Nature's Grasp"],
["Master Yi","damage dash heal damage dash","Jungle","Fighter/Assassin","Double Strike",2009,"Ionia",21,"Alpha Strike|Meditate|Wuju Style|Highlander"],
["Mel","damage damage shield hardcc global","Middle or Support","Mage/Support","Searing Brilliance",2025,"Noxus",2,"Radiant Volley|Rebuttal|Solar Snare|Golden Eclipse"],
["Milio","damage hardcc heal shield heal","Support","Support/Mage","Fired Up!",2023,"Ixtal",3,"Ultra Mega Fire Kick|Cozy Campfire|Warm Hugs|Breath of Life"],
["Miss Fortune","damage damage dash softcc damage","Bottom","Marksman/Mage","Love Tap",2010,"Bilgewater",22,"Double Up|Strut|Make It Rain|Bullet Time"],
["Mordekaiser","damage damage shield hardcc hardcc","Top","Fighter/Mage","Darkness Rise",2010,"Noxus",13,"Obliterate|Indestructible|Death's Grasp|Realm of Death"],
["Morgana","heal hardcc damage shield hardcc","Support or Middle","Support/Mage","Soul Siphon",2009,"Mount Targon",20,"Dark Binding|Tormented Shadow|Black Shield|Soul Shackles"],
["Naafiri","summon damage stealth dash dash","Middle","Assassin/Fighter","We Are More",2023,"Shurima",4,"Darkin Daggers|The Call of the Pack|Eviscerate|Hounds' Pursuit"],
["Nami","dash hardcc heal softcc hardcc","Support","Support/Mage","Surging Tides",2012,"Bilgewater",17,"Aqua Prison|Ebb and Flow|Tidecaller's Blessing|Tidal Wave"],
["Nasus","heal damage softcc damage shield","Top","Fighter/Tank","Soul Eater",2009,"Shurima",16,"Siphoning Strike|Wither|Spirit Fire|Fury of the Sands"],
["Nautilus","hardcc hardcc shield softcc hardcc","Support","Tank/Support","Staggering Blow",2012,"Bilgewater",11,"Dredge Line|Titan's Wrath|Riptide|Depth Charge"],
["Neeko","stealth damage summon hardcc hardcc","Middle or Support","Mage/Support","Inherent Glamour",2018,"Ixtal",8,"Blooming Burst|Shapesplitter|Tangle-Barbs|Pop Blossom"],
["Nidalee","dash damage summon heal dash","Jungle","Assassin/Mage","Prowl",2009,"Ixtal",16,"Javelin Toss / Takedown|Bushwhack / Pounce|Primal Surge / Swipe|Aspect Of The Cougar"],
["Nilah","heal damage shield dash hardcc","Bottom","Fighter/Assassin","Joy Unending",2022,"Kathkan",3,"Formless Blade|Jubilant Veil|Slipstream|Apotheosis"],
["Nocturne","heal damage shield hardcc global","Jungle","Fighter/Assassin","Umbra Blades",2011,"Runeterra",10,"Duskbringer|Shroud of Darkness|Unspeakable Horror|Paranoia"],
["Nunu & Willump","damage heal dash hardcc hardcc","Jungle","Tank/Mage","Call of the Freljord",2009,"the Freljord",12,"Consume|Biggest Snowball Ever!|Snowball Barrage|Absolute Zero"],
["Olaf","damage softcc shield damage shield","Top","Fighter/Tank","Berserker Rage",2010,"the Freljord",11,"Undertow|Tough It Out|Reckless Swing|Ragnarok"],
["Orianna","damage damage softcc shield hardcc","Middle","Mage/Support","Clockwork Windup",2011,"Piltover",12,"Command: Attack|Command: Dissonance|Command: Protect|Command: Shockwave"],
["Ornn","shield softcc damage dash summon","Top","Tank","Living Forge",2017,"the Freljord",5,"Volcanic Rupture|Bellows Breath|Searing Charge|Call of the Forge God"],
["Pantheon","damage damage hardcc shield global","Top or Support","Fighter/Assassin","Mortal Will",2010,"Mount Targon",13,"Comet Spear|Shield Vault|Aegis Assault|Grand Starfall"],
["Poppy","shield damage shield hardcc hardcc","Top or Jungle","Tank/Fighter","Iron Ambassador",2010,"Bandle City",13,"Hammer Shock|Steadfast Presence|Heroic Charge|Keeper's Verdict"],
["Pyke","heal hardcc stealth dash damage","Support","Support/Assassin","Gift of the Drowned Ones",2018,"Bilgewater",12,"Bone Skewer|Ghostwater Dive|Phantom Undertow|Death From Below"],
["Qiyana","damage damage dash dash hardcc","Middle","Assassin","Royal Privilege",2019,"Ixtal",8,"Elemental Wrath / Edge of Ixtal|Terrashape|Audacity|Supreme Display of Talent"],
["Quinn","damage softcc utility dash dash","Top","Marksman/Assassin","Harrier",2013,"Demacia",7,"Blinding Assault|Heightened Senses|Vault|Behind Enemy Lines"],
["Rakan","shield heal dash dash hardcc","Support","Support","Fey Feathers",2017,"Ionia",12,"Gleaming Quill|Grand Entrance|Battle Dance|The Quickness"],
["Rammus","damage dash shield hardcc hardcc","Jungle","Tank","Spiked Shell",2009,"Shurima",12,"Powerball|Defensive Ball Curl|Frenzying Taunt|Soaring Slam"],
["Rek'Sai","heal damage hardcc damage dash","Jungle","Fighter/Tank","Fury of the Xer'Sai",2014,"the Void",5,"Queen's Wrath / Prey Seeker|Burrow / Un-burrow|Furious Bite / Tunnel|Void Rush"],
["Rell","damage hardcc hardcc dash hardcc","Support","Tank/Support","Break the Mold",2020,"Noxus",4,"Shattering Strike|Ferromancy: Crash Down|Full Tilt|Magnet Storm"],
["Renata Glasc","damage hardcc shield shield hardcc","Support","Support/Mage","Leverage",2022,"Zaun",5,"Handshake|Bailout|Loyalty Program|Hostile Takeover"],
["Renekton","damage heal hardcc dash damage","Top","Fighter/Tank","Reign of Anger",2011,"Shurima",15,"Cull the Meek|Ruthless Predator|Slice and Dice|Dominus"],
["Rengar","dash damage heal softcc stealth","Jungle","Assassin/Fighter","Unseen Predator",2012,"Ixtal",9,"Savagery|Battle Roar|Bola Strike|Thrill of the Hunt"],
["Riven","damage dash hardcc shield damage","Top","Fighter/Assassin","Runic Blade",2011,"Noxus",16,"Broken Wings|Ki Burst|Valor|Blade of the Exile"],
["Rumble","damage damage shield softcc softcc","Top","Fighter/Mage","Junkyard Titan",2011,"Bandle City",6,"Flamespitter|Scrap Shield|Electro Harpoon|The Equalizer"],
["Ryze","damage damage hardcc damage global","Middle","Mage","Arcane Mastery",2009,"Runeterra",14,"Overload|Rune Prison|Spell Flux|Realm Warp"],
["Samira","damage damage shield dash damage","Bottom","Marksman/Assassin","Daredevil Impulse",2020,"Noxus",6,"Flair|Blade Whirl|Wild Rush|Inferno Trigger"],
["Sejuani","shield dash damage hardcc hardcc","Jungle","Tank","Fury of the North",2012,"the Freljord",13,"Arctic Assault|Winter's Wrath|Permafrost|Glacial Prison"],
["Senna","damage heal hardcc stealth global","Bottom or Support","Support/Marksman","Absolution",2019,"the Shadow Isles",11,"Piercing Darkness|Last Embrace|Curse of the Black Mist|Dawning Shadow"],
["Seraphine","shield damage heal hardcc hardcc","Bottom or Support","Support/Mage","Stage Presence",2020,"Piltover",13,"High Note|Surround Sound|Beat Drop|Encore"],
["Sett","damage damage shield hardcc hardcc","Top","Fighter/Tank","Pit Grit",2020,"Ionia",10,"Knuckle Down|Haymaker|Facebreaker|The Show Stopper"],
["Shaco","damage stealth summon softcc summon","Jungle","Assassin","Backstab",2009,"unknown, even to him",16,"Deceive|Jack In The Box|Two-Shiv Poison|Hallucinate"],
["Shen","shield damage shield dash global","Top","Tank","Ki Barrier",2010,"Ionia",13,"Twilight Assault|Spirit's Refuge|Shadow Dash|Stand United"],
["Shyvana","shield damage shield softcc hardcc","Jungle","Fighter/Tank","Scalemail",2011,"Demacia",8,"Emberstrike|Inferno Aegis|Molten Burst|Dragon's Descent"],
["Singed","dash damage softcc hardcc damage","Top","Tank/Mage","Noxious Slipstream",2009,"Zaun",12,"Poison Trail|Mega Adhesive|Fling|Insanity Potion"],
["Sion","shield hardcc shield softcc dash","Top","Tank/Fighter","Glory in Death",2009,"Noxus",11,"Decimating Smash|Soul Furnace|Roar of the Slayer|Unstoppable Onslaught"],
["Sivir","dash damage damage shield dash","Bottom","Marksman","Fleet of Foot",2009,"Shurima",19,"Boomerang Blade|Ricochet|Spell Shield|On The Hunt"],
["Skarner","damage damage shield dash hardcc","Jungle or Top","Tank/Fighter","Threads of Vibration",2011,"Ixtal",6,"Shattered Earth / Upheaval|Seismic Bastion|Ixtal's Impact|Impale"],
["Smolder","damage damage damage dash summon","Bottom","Marksman/Mage","Dragon Practice",2024,"Camavor",2,"Super Scorcher Breath|Achooo!|Flap, Flap, Flap|MMOOOMMMM!"],
["Sona","damage damage heal dash hardcc","Support","Support/Mage","Power Chord",2010,"Demacia",16,"Hymn of Valor|Aria of Perseverance|Song of Celerity|Crescendo"],
["Soraka","dash softcc heal hardcc global","Support","Support/Mage","Salvation",2009,"Mount Targon",18,"Starcall|Astral Infusion|Equinox|Wish"],
["Swain","heal damage softcc hardcc heal","Middle or Support","Mage/Support","Ravenous Flock",2010,"Noxus",10,"Death's Hand|Vision of Empire|Nevermove|Demonic Ascension"],
["Sylas","damage softcc heal dash utility","Middle","Mage/Assassin","Petricite Burst",2019,"Demacia",9,"Chain Lash|Kingslayer|Abscond / Abduct|Hijack"],
["Syndra","damage damage softcc hardcc damage","Middle","Mage","Transcendent",2012,"Ionia",13,"Dark Sphere|Force of Will|Scatter the Weak|Unleashed Power"],
["Tahm Kench","damage softcc hardcc shield hardcc","Top","Tank/Support","An Acquired Taste",2015,"Bilgewater",7,"Tongue Lash|Abyssal Dive|Thick Skin|Devour"],
["Taliyah","dash damage hardcc softcc softcc","Jungle or Middle","Mage/Support","Rock Surfing",2016,"Shurima",6,"Threaded Volley|Seismic Shove|Unraveled Earth|Weaver's Wall"],
["Talon","damage dash softcc dash stealth","Middle","Assassin","Blade's End",2011,"Noxus",12,"Noxian Diplomacy|Rake|Assassin's Path|Shadow Assault"],
["Taric","damage heal shield hardcc shield","Support","Support/Tank","Bravado",2009,"Demacia",7,"Starlight's Touch|Bastion|Dazzle|Cosmic Radiance"],
["Teemo","stealth softcc dash damage summon","Top","Marksman/Mage","Guerrilla Warfare",2009,"Bandle City",15,"Blinding Dart|Move Quick|Toxic Shot|Noxious Trap"],
["Thresh","damage hardcc shield hardcc softcc","Support","Support/Tank","Damnation",2013,"the Shadow Isles",15,"Death Sentence|Dark Passage|Flay|The Box"],
["Tristana","damage damage dash damage hardcc","Bottom","Marksman/Assassin","Draw a Bead",2009,"Bandle City",19,"Rapid Fire|Rocket Jump|Explosive Charge|Buster Shot"],
["Trundle","heal damage heal softcc heal","Top","Fighter/Tank","King's Tribute",2010,"the Freljord",8,"Chomp|Frozen Domain|Pillar of Ice|Subjugate"],
["Tryndamere","damage heal softcc dash shield","Top","Fighter/Assassin","Battle Fury",2009,"the Freljord",13,"Bloodlust|Mocking Shout|Spinning Slash|Undying Rage"],
["Twisted Fate","utility damage hardcc damage global","Middle or Bottom","Mage/Marksman","Loaded Dice",2009,"Bilgewater",16,"Wild Cards|Pick a Card|Stacked Deck|Destiny"],
["Twitch","damage stealth softcc damage damage","Bottom","Marksman/Assassin","Deadly Venom",2009,"Zaun",14,"Ambush|Venom Cask|Contaminate|Spray and Pray"],
["Udyr","utility damage shield dash softcc","Top or Jungle","Fighter/Tank","Bridge Between",2009,"the Freljord",6,"Wilding Claw|Iron Mantle|Blazing Stampede|Wingborne Storm"],
["Urgot","damage softcc damage dash hardcc","Top","Fighter/Tank","Echoing Flames",2010,"Noxus",7,"Corrosive Charge|Purge|Disdain|Fear Beyond Death"],
["Varus","damage damage damage softcc hardcc","Bottom","Marksman/Mage","Living Vengeance",2012,"Shurima",15,"Piercing Arrow|Blighted Quiver|Hail of Arrows|Chain of Corruption"],
["Vayne","dash dash damage hardcc stealth","Bottom","Marksman/Assassin","Night Hunter",2011,"Demacia",21,"Tumble|Silver Bolts|Condemn|Final Hour"],
["Veigar","damage damage damage hardcc damage","Middle","Mage","Phenomenal Evil Power",2009,"Bandle City",16,"Baleful Strike|Dark Matter|Event Horizon|Primordial Burst"],
["Vel'Koz","damage softcc damage hardcc damage","Support","Mage/Support","Organic Deconstruction",2014,"the Void",7,"Plasma Fission|Void Rift|Tectonic Disruption|Life Form Disintegration Ray"],
["Vex","hardcc damage shield softcc dash","Middle","Mage","Doom 'n Gloom",2021,"the Shadow Isles",4,"Mistral Bolt|Personal Space|Looming Darkness|Shadow Surge"],
["Vi","shield dash damage damage hardcc","Jungle","Fighter/Assassin","Blast Shield",2012,"Zaun",13,"Vault Breaker|Denting Blows|Relentless Force|Cease and Desist"],
["Viego","summon damage hardcc stealth dash","Jungle","Fighter/Assassin","Sovereign's Domination",2021,"Camavor",7,"Blade of the Ruined King|Spectral Maw|Harrowed Path|Heartbreaker"],
["Viktor","damage shield hardcc damage damage","Middle","Mage","Glorious Evolution",2011,"Zaun",8,"Siphon Power|Gravity Field|Hextech Ray|Arcane Storm"],
["Vladimir","damage heal stealth damage damage","Middle","Mage/Fighter","Crimson Pact",2010,"Noxus",14,"Transfusion|Sanguine Pool|Tides of Blood|Hemoplague"],
["Volibear","damage hardcc heal shield dash","Top","Fighter/Tank","The Relentless Storm",2011,"the Freljord",10,"Thundering Smash|Frenzied Maul|Sky Splitter|Stormbringer"],
["Warwick","damage heal dash shield hardcc","Jungle","Fighter/Tank","Eternal Hunger",2009,"Zaun",16,"Jaws of the Beast|Blood Hunt|Primal Howl|Infinite Duress"],
["Wukong","shield damage stealth dash hardcc","Jungle","Fighter/Tank","Stone Skin",2011,"Ionia",9,"Crushing Blow|Warrior Trickster|Nimbus Strike|Cyclone"],
["Xayah","damage damage damage hardcc stealth","Bottom","Marksman","Clean Cuts",2017,"Ionia",12,"Double Daggers|Deadly Plumage|Bladecaller|Featherstorm"],
["Xerath","damage damage softcc hardcc global","Middle or Support","Mage/Support","Mana Surge",2011,"Shurima",9,"Arcanopulse|Eye of Destruction|Shocking Orb|Rite of the Arcane"],
["Xin Zhao","heal hardcc softcc dash hardcc","Jungle","Fighter/Tank","Determination",2010,"Demacia",12,"Three Talon Strike|Wind Becomes Lightning|Audacious Charge|Crescent Guard"],
["Yasuo","shield damage shield dash hardcc","Top, Middle or Bottom","Fighter/Assassin","Way of the Wanderer",2013,"Ionia",18,"Steel Tempest|Wind Wall|Sweeping Blade|Last Breath"],
["Yone","damage damage shield dash hardcc","Top or Middle","Fighter/Assassin","Way of the Hunter",2020,"Ionia",11,"Mortal Steel|Spirit Cleave|Soul Unbound|Fate Sealed"],
["Yorick","summon heal softcc softcc summon","Top","Fighter/Tank","Shepherd of Souls",2011,"the Shadow Isles",9,"Last Rites|Dark Procession|Mourning Mist|Eulogy of the Isles"],
["Yunara","damage damage softcc dash utility","Bottom","Marksman","Vow of the First Lands",2025,"Ionia",2,"Cultivation of Spirit|Arc of Judgment / Arc of Ruin|Kanmei's Steps / Untouchable Shadow|Transcend One's Self"],
["Yuumi","heal softcc stealth shield damage","Support","Support/Mage","Feline Friendship",2019,"Bandle City",10,"Prowling Projectile|You and Me!|Zoomies|Final Chapter"],
["Zaahen","damage damage hardcc dash heal","Top or Jungle","Fighter","Cultivation of War",2025,"Shurima",1,"The Darkin Glaive|Dreaded Return|Aureate Rush|Grim Deliverance"],
["Zac","heal hardcc damage dash hardcc","Jungle","Tank/Fighter","Cell Division",2013,"Zaun",10,"Stretching Strikes|Unstable Matter|Elastic Slingshot|Let's Bounce!"],
["Zed","damage damage summon softcc dash","Jungle or Middle","Assassin","Contempt for the Weak",2012,"Ionia",14,"Razor Shuriken|Living Shadow|Shadow Slash|Death Mark"],
["Zeri","shield damage softcc dash damage","Bottom","Marksman","Living Battery",2022,"Zaun",6,"Burst Fire|Ultrashock Laser|Spark Surge|Lightning Crash"],
["Ziggs","damage damage dash softcc global","Bottom","Mage","Short Fuse",2012,"Bandle City",12,"Bouncing Bomb|Satchel Charge|Hexplosive Minefield|Mega Inferno Bomb"],
["Zilean","utility hardcc utility softcc heal","Support","Support/Mage","Time In A Bottle",2009,"Shurima",8,"Time Bomb|Rewind|Time Warp|Chronoshift"],
["Zoe","damage damage dash hardcc dash","Middle","Mage","More Sparkles!",2017,"Mount Targon",9,"Paddle Star!|Spell Thief|Sleepy Trouble Bubble|Portal Jump"],
["Zyra","summon damage summon hardcc hardcc","Support","Mage/Support","Garden of Thorns",2012,"Ixtal",12,"Deadly Spines|Rampant Growth|Grasping Roots|Stranglethorns"]
];

/* A guess is matched on this: lower case, no spaces, no punctuation.
   So "khazix", "Kha Zix" and "KHA'ZIX" all land on the same champion. */
export const normalise = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export const CHAMPIONS = ROSTER.map(
  ([name, tags, lane, role, passive, year, region, skins, abilities]) => ({
    name,
    key: normalise(name),
    kit: tags.split(" "),
    lane,
    role,
    passive,
    year: String(year),
    region,
    skins,
    abilities: abilities.split("|")
  })
);

export const BY_KEY = new Map(CHAMPIONS.map(c => [c.key, c]));
