/* asoifle — the roster.
   Every character here appears in three or more episodes of the show.

   Each row is:
     [ name, house, origin, gender, status, firstSeason, episodes, note ]

   house    the house they were born or married into; failing that, the order,
            people or trade they belong to. "Lowborn" for commoners with neither.
   origin   birthplace where the show tells us, otherwise where they are rooted.
   status   where they stand at the end of the final episode.
   episodes appearances across all 73 episodes, credited and uncredited.

   Counts and first appearances are the fiddliest part of this file. If one is
   wrong, fix it here — nothing else needs to change. */

const ROWS = [
  // — The North and the Starks —
  ["Eddard Stark",        "Stark",        "The North",        "Male",   "Dead",  1, 12, "Warden of the North. Lost his head on the steps of the Sept of Baelor."],
  ["Catelyn Stark",       "Tully",        "The Riverlands",   "Female", "Dead",  1, 25, "Born a Tully of Riverrun, which is why her origin is not the North."],
  ["Robb Stark",          "Stark",        "The North",        "Male",   "Dead",  1, 22, "The Young Wolf. Never lost a battle, only a wedding."],
  ["Sansa Stark",         "Stark",        "The North",        "Female", "Alive", 1, 59, "Queen in the North."],
  ["Arya Stark",          "Stark",        "The North",        "Female", "Alive", 1, 59, "Sailed west of Westeros."],
  ["Bran Stark",          "Stark",        "The North",        "Male",   "Alive", 1, 43, "Absent for the whole of season five, which is why the count runs low."],
  ["Rickon Stark",        "Stark",        "The North",        "Male",   "Dead",  1, 16, "Should have run in a zigzag."],
  ["Jon Snow",            "Stark",        "The North",        "Male",   "Alive", 1, 62, "Raised a Stark of Winterfell, born Aegon Targaryen at the Tower of Joy."],
  ["Benjen Stark",        "Stark",        "The North",        "Male",   "Dead",  1,  7, "First Ranger, then Coldhands. Dead in the sense that matters."],
  ["Lyanna Stark",        "Stark",        "The North",        "Female", "Dead",  6,  4, "Seen only in Bran's visions of the Tower of Joy."],
  ["Jorah Mormont",       "Mormont",      "The North",        "Male",   "Dead",  1, 52, "Exiled slaver, then the most loyal man in Essos."],
  ["Jeor Mormont",        "Mormont",      "The North",        "Male",   "Dead",  1, 15, "The Old Bear. Killed by his own men at Craster's Keep."],
  ["Lyanna Mormont",      "Mormont",      "The North",        "Female", "Dead",  6,  8, "Ten years old and the loudest voice in any hall she entered."],
  ["Roose Bolton",        "Bolton",       "The North",        "Male",   "Dead",  2, 16, "The Leech Lord. Knifed by his own son."],
  ["Ramsay Bolton",       "Bolton",       "The North",        "Male",   "Dead",  3, 21, "Eaten by his own hounds."],
  ["Myranda",             "Lowborn",      "The North",        "Female", "Dead",  4,  6, "The kennelmaster's daughter, and Ramsay's."],
  ["Jojen Reed",          "Reed",         "The North",        "Male",   "Dead",  3, 12, "Greendreamer. Died at the roots of the weirwood."],
  ["Meera Reed",          "Reed",         "The North",        "Female", "Alive", 3, 15, "Dragged Bran halfway across the North and got no thanks for it."],
  ["Hodor",               "Lowborn",      "The North",        "Male",   "Dead",  1, 30, "Hold the door."],
  ["Maester Luwin",       "Citadel",      "The North",        "Male",   "Dead",  1, 15, "Tutor to every Stark child."],
  ["Maester Wolkan",      "Citadel",      "The North",        "Male",   "Alive", 6,  5, "Kept the Dreadfort's books, then Winterfell's."],
  ["Rodrik Cassel",       "Cassel",       "The North",        "Male",   "Dead",  1,  9, "Master-at-arms at Winterfell."],
  ["Jory Cassel",         "Cassel",       "The North",        "Male",   "Dead",  1,  6, "Captain of the Stark guard. A dagger through the eye."],
  ["Rickard Karstark",    "Karstark",     "The North",        "Male",   "Dead",  2,  6, "Hanged by Robb for killing two Lannister boys."],
  ["Greatjon Umber",      "Umber",        "The North",        "Male",   "Dead",  1,  4, "Lost two fingers to a direwolf and laughed about it."],
  ["Ros",                 "Lowborn",      "The North",        "Female", "Dead",  1, 12, "Left Winterfell for King's Landing. It did not go well."],
  ["Olly",                "Night's Watch","The North",        "Male",   "Dead",  4, 14, "Everyone's least favourite steward."],
  ["Alliser Thorne",      "Night's Watch","The North",        "Male",   "Dead",  1, 21, "Master-at-arms at Castle Black. Hanged for mutiny."],
  ["Eddison Tollett",     "Night's Watch","The Vale",         "Male",   "Dead",  2, 25, "Dolorous Edd, last Lord Commander we hear of."],
  ["Grenn",               "Night's Watch","The North",        "Male",   "Dead",  1, 15, "Held the tunnel against a giant."],
  ["Pypar",               "Night's Watch","The North",        "Male",   "Dead",  1, 12, "Sang for his supper before he took the black."],
  ["Rast",                "Night's Watch","The North",        "Male",   "Dead",  1,  8, "Mutineer at Craster's Keep."],
  ["Karl Tanner",         "Night's Watch","The Crownlands",   "Male",   "Dead",  3,  5, "A cutthroat from Flea Bottom who drank from a skull."],
  ["Qhorin Halfhand",     "Night's Watch","The North",        "Male",   "Dead",  2,  5, "Died by Jon's hand so Jon could live."],
  ["Yoren",               "Night's Watch","The North",        "Male",   "Dead",  1,  6, "Got Arya out of King's Landing dressed as a boy."],
  ["Janos Slynt",         "Night's Watch","The Crownlands",   "Male",   "Dead",  1, 10, "Commanded the Gold Cloaks. Beheaded by Jon Snow."],
  ["Maester Aemon",       "Targaryen",    "The Crownlands",   "Male",   "Dead",  1, 15, "Daenerys's great-great-uncle, blind at the end of the world."],
  ["Samwell Tarly",       "Tarly",        "The Reach",        "Male",   "Alive", 1, 49, "Wrote it all down and called it A Song of Ice and Fire."],
  ["Locke",               "Bolton",       "The North",        "Male",   "Dead",  3,  7, "Took Jaime's hand off."],

  // — Beyond the Wall —
  ["Ygritte",             "Free Folk",    "Beyond the Wall",  "Female", "Dead",  2, 17, "You know nothing."],
  ["Tormund Giantsbane",  "Free Folk",    "Beyond the Wall",  "Male",   "Alive", 3, 30, "Went back through the gate with the free folk."],
  ["Mance Rayder",        "Free Folk",    "Beyond the Wall",  "Male",   "Dead",  3,  8, "King-Beyond-the-Wall. Given an arrow as mercy."],
  ["Craster",             "Free Folk",    "Beyond the Wall",  "Male",   "Dead",  2,  5, "Married his daughters and gave his sons away."],
  ["Gilly",               "Free Folk",    "Beyond the Wall",  "Female", "Alive", 2, 30, "Craster's daughter, and Sam's."],
  ["Osha",                "Free Folk",    "Beyond the Wall",  "Female", "Dead",  1, 17, "Took Rickon south and paid for it."],
  ["Wun Wun",             "Free Folk",    "Beyond the Wall",  "Male",   "Dead",  5,  6, "The last giant."],
  ["Night King",          "White Walkers","Beyond the Wall",  "Male",   "Dead",  4,  8, "Never spoke a word."],
  ["Three-Eyed Raven",    "Unknown",      "Beyond the Wall",  "Male",   "Dead",  4,  6, "Rooted into the weirwood, waiting for Bran."],
  ["Leaf",                "Children",     "Beyond the Wall",  "Female", "Dead",  4,  4, "One of the Children of the Forest. Made the first White Walker."],

  // — The Riverlands and the Vale —
  ["Walder Frey",         "Frey",         "The Riverlands",   "Male",   "Dead",  1,  8, "The Late Lord Frey. Baked into a pie."],
  ["Edmure Tully",        "Tully",        "The Riverlands",   "Male",   "Alive", 3,  8, "Nominated himself for the throne and was ignored."],
  ["Brynden Tully",       "Tully",        "The Riverlands",   "Male",   "Dead",  3,  9, "The Blackfish. Went down swinging off-screen."],
  ["Lysa Arryn",          "Tully",        "The Riverlands",   "Female", "Dead",  1,  8, "Only Cat. Out the Moon Door."],
  ["Robin Arryn",         "Arryn",        "The Vale",         "Male",   "Alive", 1, 10, "Grew up rather well, all things considered."],
  ["Yohn Royce",          "Royce",        "The Vale",         "Male",   "Alive", 4, 10, "Bronze Yohn, and the only sensible man in the Vale."],
  ["Petyr Baelish",       "Baelish",      "The Vale",         "Male",   "Dead",  1, 42, "Littlefinger. Born to a small house on the Fingers."],
  ["Beric Dondarrion",    "Dondarrion",   "The Stormlands",   "Male",   "Dead",  3, 12, "Died six times before it finally took."],
  ["Thoros of Myr",       "R'hllor",      "Essos",            "Male",   "Dead",  3, 12, "The red priest who kept bringing Beric back."],
  ["Hot Pie",             "Lowborn",      "The Riverlands",   "Male",   "Alive", 2,  8, "Still baking. Arguably the best outcome in the show."],
  ["Gendry",              "Baratheon",    "The Crownlands",   "Male",   "Alive", 1, 21, "Robert's bastard, born in King's Landing, legitimised at last."],

  // — King's Landing, the Lannisters and the Baratheons —
  ["Tywin Lannister",     "Lannister",    "The Westerlands",  "Male",   "Dead",  1, 26, "Did not, in the end, die on the privy in his sleep."],
  ["Cersei Lannister",    "Lannister",    "The Westerlands",  "Female", "Dead",  1, 62, "Crushed under the Red Keep."],
  ["Jaime Lannister",     "Lannister",    "The Westerlands",  "Male",   "Dead",  1, 55, "The Kingslayer. Went back to her at the end."],
  ["Tyrion Lannister",    "Lannister",    "The Westerlands",  "Male",   "Alive", 1, 67, "Appears in more episodes than anyone else."],
  ["Kevan Lannister",     "Lannister",    "The Westerlands",  "Male",   "Dead",  1, 14, "Tywin's brother. Wildfire took him."],
  ["Lancel Lannister",    "Lannister",    "The Westerlands",  "Male",   "Dead",  1, 18, "Cousin, squire, lover, sparrow, casualty."],
  ["Joffrey Baratheon",   "Baratheon",    "The Crownlands",   "Male",   "Dead",  1, 22, "Purple."],
  ["Myrcella Baratheon",  "Baratheon",    "The Crownlands",   "Female", "Dead",  1,  8, "Poisoned by a kiss on a boat out of Dorne."],
  ["Tommen Baratheon",    "Baratheon",    "The Crownlands",   "Male",   "Dead",  1, 20, "Took off his crown and stepped out of the window."],
  ["Robert Baratheon",    "Baratheon",    "The Stormlands",   "Male",   "Dead",  1,  7, "Killed by a boar and a great deal of strongwine."],
  ["Stannis Baratheon",   "Baratheon",    "The Stormlands",   "Male",   "Dead",  2, 26, "The one true king, briefly."],
  ["Renly Baratheon",     "Baratheon",    "The Stormlands",   "Male",   "Dead",  1, 12, "Killed by a shadow with his brother's face."],
  ["Shireen Baratheon",   "Baratheon",    "The Crownlands",   "Female", "Dead",  3, 15, "Born on Dragonstone. Burned by her father."],
  ["Selyse Baratheon",    "Florent",      "The Reach",        "Female", "Dead",  2, 15, "Born a Florent of Brightwater Keep."],
  ["Davos Seaworth",      "Lowborn",      "The Crownlands",   "Male",   "Alive", 2, 45, "A smuggler out of Flea Bottom who ended on the small council."],
  ["Melisandre",          "R'hllor",      "Essos",            "Female", "Dead",  2, 30, "Took off the necklace and walked into the snow."],
  ["Varys",               "Lowborn",      "Essos",            "Male",   "Dead",  1, 47, "Born a slave in Lys. Burned for treason."],
  ["Grand Maester Pycelle","Citadel",     "The Crownlands",   "Male",   "Dead",  1, 34, "Far less doddering than he let on."],
  ["Qyburn",              "Citadel",      "The Crownlands",   "Male",   "Dead",  3, 25, "Stripped of his chain for experimenting on the living."],
  ["Gregor Clegane",      "Clegane",      "The Westerlands",  "Male",   "Dead",  1, 22, "The Mountain. Died twice, arguably."],
  ["Sandor Clegane",      "Clegane",      "The Westerlands",  "Male",   "Dead",  1, 40, "The Hound. Got his Cleganebowl."],
  ["Podrick Payne",       "Payne",        "The Westerlands",  "Male",   "Alive", 2, 27, "Squire, singer, knight."],
  ["Meryn Trant",         "Trant",        "The Crownlands",   "Male",   "Dead",  1, 15, "Crossed off the list in a Braavosi brothel."],
  ["Bronn",               "Lowborn",      "Unknown",          "Male",   "Alive", 1, 34, "The show never says where he is from. Ended up Lord of Highgarden."],
  ["Shae",                "Lowborn",      "Essos",            "Female", "Dead",  1, 21, "My lion."],
  ["High Sparrow",        "Faith",        "The Crownlands",   "Male",   "Dead",  5, 15, "A cobbler who brought a queen to her knees."],
  ["Septa Unella",        "Faith",        "The Crownlands",   "Female", "Dead",  5,  7, "Shame."],
  ["Brienne of Tarth",    "Tarth",        "The Stormlands",   "Female", "Alive", 2, 41, "Finished Jaime's page in the White Book."],

  // — The Reach and Dorne —
  ["Margaery Tyrell",     "Tyrell",       "The Reach",        "Female", "Dead",  2, 26, "Wanted to be the queen. Was, three times."],
  ["Loras Tyrell",        "Tyrell",       "The Reach",        "Male",   "Dead",  1, 18, "The Knight of Flowers."],
  ["Olenna Tyrell",       "Tyrell",       "The Reach",        "Female", "Dead",  3, 18, "Tell Cersei. I want her to know it was me."],
  ["Mace Tyrell",         "Tyrell",       "The Reach",        "Male",   "Dead",  4, 10, "Out of his depth in every scene."],
  ["Randyll Tarly",       "Tarly",        "The Reach",        "Male",   "Dead",  6,  5, "Chose the fire over the knee."],
  ["Dickon Tarly",        "Tarly",        "The Reach",        "Male",   "Dead",  6,  3, "Chose his father."],
  ["Archmaester Ebrose",  "Citadel",      "The Reach",        "Male",   "Alive", 6,  4, "Wrote the history Sam retitled."],
  ["Oberyn Martell",      "Martell",      "Dorne",            "Male",   "Dead",  4,  7, "The Red Viper. Should have finished him."],
  ["Doran Martell",       "Martell",      "Dorne",            "Male",   "Dead",  5,  5, "Killed on his own terrace."],
  ["Trystane Martell",    "Martell",      "Dorne",            "Male",   "Dead",  5,  5, "Killed on his own ship."],
  ["Ellaria Sand",        "Sand",         "Dorne",            "Female", "Alive", 4, 15, "Chained in the black cells, watching her daughter rot."],
  ["Obara Sand",          "Sand",         "Dorne",            "Female", "Dead",  5,  7, "Killed with her own spear."],
  ["Nymeria Sand",        "Sand",         "Dorne",            "Female", "Dead",  5,  7, "Killed with her own whip."],
  ["Tyene Sand",          "Sand",         "Dorne",            "Female", "Dead",  5,  7, "The Long Farewell."],
  ["Areo Hotah",          "Lowborn",      "Essos",            "Male",   "Dead",  5,  4, "A Norvoshi axeman guarding a Dornish prince."],

  // — The Iron Islands —
  ["Theon Greyjoy",       "Greyjoy",      "The Iron Islands", "Male",   "Dead",  1, 48, "Ward, traitor, Reek, and finally a good man."],
  ["Yara Greyjoy",        "Greyjoy",      "The Iron Islands", "Female", "Alive", 2, 21, "Bent the knee for the Iron Islands and kept them."],
  ["Balon Greyjoy",       "Greyjoy",      "The Iron Islands", "Male",   "Dead",  2,  5, "Off a rope bridge in a storm."],
  ["Euron Greyjoy",       "Greyjoy",      "The Iron Islands", "Male",   "Dead",  6, 12, "I got to be the man who killed Jaime Lannister."],

  // — Essos —
  ["Daenerys Targaryen",  "Targaryen",    "The Crownlands",   "Female", "Dead",  1, 62, "Born on Dragonstone during a storm, raised in the Free Cities."],
  ["Viserys Targaryen",   "Targaryen",    "The Crownlands",   "Male",   "Dead",  1,  8, "A crown for a king. Not a dragon."],
  ["Khal Drogo",          "Dothraki",     "Essos",            "Male",   "Dead",  1, 12, "Killed by a scratch and a maegi."],
  ["Irri",                "Dothraki",     "Essos",            "Female", "Dead",  1, 12, "Handmaiden. Strangled in Qarth."],
  ["Rakharo",             "Dothraki",     "Essos",            "Male",   "Dead",  1,  6, "Returned to Daenerys in pieces."],
  ["Doreah",              "Lowborn",      "Essos",            "Female", "Dead",  1, 10, "Sealed in a vault with Xaro."],
  ["Missandei",           "Lowborn",      "Essos",            "Female", "Dead",  3, 34, "Taken from Naath as a child. Dracarys."],
  ["Grey Worm",           "Unsullied",    "Essos",            "Male",   "Alive", 3, 31, "Sailed for Naath."],
  ["Daario Naharis",      "Second Sons",  "Essos",            "Male",   "Alive", 3, 19, "Left behind in Meereen to keep the peace."],
  ["Barristan Selmy",     "Selmy",        "The Stormlands",   "Male",   "Dead",  1, 17, "Born at Harvest Hall. Died in an alley in Meereen."],
  ["Jaqen H'ghar",        "Faceless Men", "Essos",            "Male",   "Alive", 2, 10, "Valar morghulis."],
  ["The Waif",            "Faceless Men", "Essos",            "Female", "Dead",  5,  6, "Ended up a face on the wall."],
  ["Mirri Maz Duur",      "Lowborn",      "Essos",            "Female", "Dead",  1,  4, "Only death may pay for life."],
  ["Xaro Xhoan Daxos",    "Lowborn",      "Essos",            "Male",   "Dead",  2,  6, "The richest man in Qarth, and his vault was empty."],
  ["Hizdahr zo Loraq",    "Loraq",        "Essos",            "Male",   "Dead",  4,  6, "Married a queen and died in the fighting pits."],
  ["Talisa Maegyr",       "Maegyr",       "Essos",            "Female", "Dead",  2, 10, "A Volantene noblewoman playing at nursing."],
  ["Salladhor Saan",      "Lowborn",      "Essos",            "Male",   "Alive", 2,  5, "A pirate with a very good hat."],
  ["Tycho Nestoris",      "Iron Bank",    "Essos",            "Male",   "Alive", 4,  4, "The Iron Bank will have its due."],
];

/* A line each, for the hint. Only the ones worth quoting are here — the
   rest fall back to initials, which suits the Mountain rather well. Trim,
   add or correct freely; nothing else reads this map. */
const QUOTES = {
  "Eddard Stark":       "Winter is coming.",
  "Jon Snow":           "The night gathers, and now my watch begins.",
  "Arya Stark":         "Not today.",
  "Sansa Stark":        "I'm a slow learner, it's true. But I learn.",
  "Bran Stark":         "I can never be Lord of Winterfell.",
  "Lyanna Mormont":     "I don't plan on knitting by the fire.",
  "Jorah Mormont":      "Khaleesi.",
  "Hodor":              "Hodor.",
  "Jojen Reed":         "The ink is dry.",
  "Ygritte":            "You know nothing, Jon Snow.",
  "Roose Bolton":       "The Lannisters send their regards.",
  "Ramsay Bolton":      "If you think this has a happy ending, you haven't been paying attention.",
  "Theon Greyjoy":      "My name is Reek.",
  "Alliser Thorne":     "For the Watch.",
  "Maester Aemon":      "Kill the boy, and let the man be born.",
  "Three-Eyed Raven":   "You'll never walk again. But you will fly.",
  "Petyr Baelish":      "Chaos is a ladder.",
  "Beric Dondarrion":   "Every time I come back, I'm a bit less.",
  "Thoros of Myr":      "Lord, cast your light upon us.",
  "Gendry":             "I've been rowing.",
  "Tywin Lannister":    "A lion does not concern himself with the opinion of sheep.",
  "Cersei Lannister":   "When you play the game of thrones, you win or you die.",
  "Jaime Lannister":    "The things I do for love.",
  "Tyrion Lannister":   "I drink and I know things.",
  "Joffrey Baratheon":  "Everyone is mine to torment.",
  "Stannis Baratheon":  "Fewer.",
  "Shireen Baratheon":  "Father, please!",
  "Melisandre":         "The night is dark and full of terrors.",
  "Varys":              "Power resides where men believe it resides.",
  "Sandor Clegane":     "I'm going to eat every chicken in this room.",
  "Bronn":              "I don't fight in tournaments.",
  "Shae":               "My lion.",
  "High Sparrow":       "We are all sinners.",
  "Brienne of Tarth":   "All my life men like you have sneered at me.",
  "Margaery Tyrell":    "I want to be the queen.",
  "Olenna Tyrell":      "Tell Cersei. I want her to know it was me.",
  "Oberyn Martell":     "My name is Oberyn Martell.",
  "Ellaria Sand":       "Weak men will never rule Dorne again.",
  "Daenerys Targaryen": "I will take what is mine with fire and blood.",
  "Khal Drogo":         "Moon of my life.",
  "Missandei":          "Dracarys.",
  "Barristan Selmy":    "I am a knight. I shall die a knight.",
  "Jaqen H'ghar":       "Valar morghulis.",
};

const KEYS = ["name", "house", "origin", "gender", "status", "season", "episodes", "note"];

export const CHARACTERS = ROWS.map(row => {
  const c = {};
  KEYS.forEach((k, i) => { c[k] = row[i] ?? ""; });
  c.realm = c.origin === "Essos" ? "Essos"
          : c.origin === "Beyond the Wall" ? "Beyond the Wall"
          : c.origin === "Unknown" ? "Unknown"
          : "The Seven Kingdoms";
  c.quote = QUOTES[c.name] || "";
  /* Initials are the fallback hint for anyone with no line of their own. */
  c.initials = c.name.split(/\s+/).map(w => w[0].toUpperCase() + ".").join(" ");
  return c;
});

/* The daily answer only ever comes from the better-known half of the roster —
   nobody wants to open the tab and be asked for Areo Hotah. */
export const DAILY_POOL = CHARACTERS.filter(c => c.episodes >= 12);
