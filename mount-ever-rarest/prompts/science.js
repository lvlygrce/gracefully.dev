/* Science and nature. Format as in geography.js. `sub: true` lets a
   partial name count ("Curie" for "Marie Curie"). */

export default [
  { q: "Name a chemical element", a: [
    "oxygen; hydrogen; carbon; gold; iron",
    "nitrogen; helium; silver; copper; sodium; calcium; lead",
    "zinc; potassium; aluminium|aluminum; uranium; neon; chlorine; magnesium; mercury; platinum; tin; sulfur|sulphur; silicon; plutonium; lithium",
    "argon; krypton; xenon; radon; fluorine; bromine; iodine; astatine; phosphorus; boron; beryllium; titanium; chromium; manganese; cobalt; nickel; vanadium; scandium; gallium; germanium; arsenic; selenium; rubidium; strontium; yttrium; zirconium; niobium; molybdenum; technetium; ruthenium; rhodium; palladium; cadmium; indium; antimony; tellurium; caesium|cesium; barium; lanthanum; cerium; praseodymium; neodymium; promethium; samarium; europium; gadolinium; terbium; dysprosium; holmium; erbium; thulium; ytterbium; lutetium; hafnium; tantalum; tungsten; rhenium; osmium; iridium; thallium; bismuth; polonium; francium; radium; actinium; thorium; protactinium; neptunium; americium; curium; berkelium; californium; einsteinium; fermium; mendelevium; nobelium; lawrencium; rutherfordium; dubnium; seaborgium; bohrium; hassium; meitnerium; darmstadtium; roentgenium; copernicium; nihonium; flerovium; moscovium; livermorium; tennessine; oganesson",
  ]},
  { q: "Name a planet or dwarf planet", x: "planet; dwarf", a: [
    "Mars; Jupiter; Saturn; Earth",
    "Venus; Mercury; Neptune; Uranus; Pluto",
    "Ceres; Eris",
    "Makemake; Haumea; Sedna; Gonggong; Quaoar; Orcus",
  ]},
  { q: "Name a moon in our solar system", x: "moon", a: [
    "the Moon|Luna|moon",
    "Titan; Europa; Io; Ganymede; Phobos; Deimos",
    "Callisto; Enceladus; Triton; Charon",
    "Mimas; Titania; Oberon; Miranda; Ariel; Umbriel; Rhea; Iapetus; Dione; Tethys; Hyperion; Phoebe; Nereid; Proteus; Amalthea; Himalia; Nix; Hydra; Kerberos; Styx; Dysnomia; Janus; Epimetheus; Pan; Atlas; Prometheus; Pandora; Metis; Adrastea; Thebe; Puck; Cordelia; Ophelia; Larissa; Despina; Galatea; Naiad; Thalassa; Halimede; Psamathe; Sycorax; Caliban; Prospero; Setebos; Mab; Cupid; Belinda; Rosalind; Portia; Juliet; Desdemona; Cressida; Bianca; Perdita; Margaret; Ferdinand; Trinculo; Francisco; Stephano; Ymir; Paaliaq; Kiviuq; Siarnaq; Tarvos; Skathi; Mundilfari; Leda; Elara; Lysithea; Ananke; Carme; Pasiphae; Sinope; Callirrhoe; Themisto; Hi'iaka; Namaka; Weywot; Vanth; Xiangliu; Actaea; Ilmarë",
  ]},
  { q: "Name a bone in the human body", x: "bone", a: [
    "femur|thigh bone; skull; rib",
    "tibia|shin bone|shinbone; fibula; humerus; pelvis; jaw|jawbone|mandible; sternum|breastbone; spine",
    "radius; ulna; scapula|shoulder blade; clavicle|collarbone; patella|kneecap; vertebra; coccyx|tailbone; cranium; hip; cheekbone|zygomatic; phalanges|phalanx; stirrup|stapes; anvil|incus; hammer|malleus",
    "hyoid; sacrum; ilium; ischium; pubis; talus; calcaneus|heel bone; navicular; cuboid; cuneiform; metatarsal; carpal; metacarpal; scaphoid; lunate; triquetrum; pisiform; trapezium; trapezoid; capitate; hamate; maxilla; nasal bone; lacrimal; palatine; vomer; ethmoid; sphenoid; frontal; parietal; temporal; occipital; atlas; axis; sesamoid; inferior nasal concha|turbinate; manubrium; xiphoid; tarsal; lumbar vertebra; thoracic vertebra; cervical vertebra; ossicle; fabella",
  ]},
  { q: "Name an organ of the human body", x: "organ", a: [
    "heart; brain; lung; liver; kidney",
    "stomach; skin; intestine|bowel|gut; bladder; pancreas",
    "spleen; gallbladder; appendix; large intestine|colon; small intestine; eye; thyroid; uterus|womb; ovary; tongue; oesophagus|esophagus; ear",
    "thymus; adrenal gland|adrenal; pituitary; pineal; testis|testicle; prostate; larynx|voice box; pharynx; trachea|windpipe; diaphragm; tonsil; adenoid; mesentery; rectum; duodenum; ileum; jejunum; cochlea; hypothalamus; parathyroid; placenta; ureter; urethra; salivary gland; lymph node; bone marrow; cerebellum; cornea; retina; nose; interstitium; fallopian tube; cervix; vagina; penis; epididymis; seminal vesicle; caecum|cecum; sigmoid colon; omentum; pericardium; pleura; peritoneum; spinal cord; hippocampus; amygdala",
  ]},
  { q: "Name a gas", x: "gas", a: [
    "oxygen; carbon dioxide|CO2; nitrogen; hydrogen; helium",
    "methane; carbon monoxide; neon; argon; chlorine; ozone; natural gas",
    "nitrous oxide|laughing gas; propane; butane; ammonia; steam|water vapour|water vapor; radon; xenon; krypton; fluorine; tear gas",
    "hydrogen sulfide|hydrogen sulphide; sulfur dioxide|sulphur dioxide; nitrogen dioxide; ethylene|ethene; acetylene|ethyne; ethane; phosgene; mustard gas; sarin; arsine; phosphine; silane; hydrogen cyanide; nitric oxide; Freon; sulfur hexafluoride|sulphur hexafluoride; formaldehyde; hydrogen chloride; deuterium; tritium; chlorine dioxide; nitrogen trifluoride; carbonyl sulfide; diborane; germane; stibine; hydrogen fluoride; hydrogen bromide; dimethyl ether; propylene; butadiene; isobutane; chloromethane; fluoromethane; tetrafluoromethane; xenon difluoride; oganesson; neon; ammonia; LPG; coal gas; town gas; marsh gas; biogas; syngas; firedamp; chokedamp|blackdamp",
  ]},
  { q: "Name a famous scientist", sub: true, a: [
    "Albert Einstein; Isaac Newton; Charles Darwin",
    "Marie Curie; Stephen Hawking; Galileo Galilei|Galileo; Nikola Tesla; Thomas Edison",
    "Louis Pasteur; Michael Faraday; Niels Bohr; Nicolaus Copernicus|Copernicus; Johannes Kepler; Gregor Mendel; Richard Feynman; Robert Oppenheimer|J. Robert Oppenheimer; Alan Turing; Ada Lovelace; Rosalind Franklin; Archimedes; Alexander Fleming; Edward Jenner; Carl Sagan; Jane Goodall; David Attenborough; Neil deGrasse Tyson; Brian Cox; Leonardo da Vinci",
    "Lise Meitner; Paul Dirac; Werner Heisenberg; Erwin Schrödinger|Schrodinger; Max Planck; James Clerk Maxwell; Robert Boyle; Robert Hooke; Lord Kelvin|William Thomson; Ernest Rutherford; John Dalton; Antoine Lavoisier; Dmitri Mendeleev; Joseph Lister; Edwin Hubble; Emmy Noether; Srinivasa Ramanujan; C. V. Raman; Subrahmanyan Chandrasekhar; Hypatia; Euclid; Pythagoras; Aristotle; Enrico Fermi; Wolfgang Pauli; Max Born; Otto Hahn; Pierre Curie; Alexander Graham Bell; James Watt; Alessandro Volta; André-Marie Ampère|Ampere; Georg Ohm; Luigi Galvani; Amedeo Avogadro; Carl Linnaeus; Alexander von Humboldt; Alfred Russel Wallace; Jean-Baptiste Lamarck; Francis Crick; James Watson; Dorothy Hodgkin; Rachel Carson; Barbara McClintock; Jonas Salk; Tu Youyou; Peter Higgs; Richard Dawkins; Bill Nye; Ptolemy; Tycho Brahe; William Herschel; Caroline Herschel; Henrietta Leavitt; Benjamin Banneker; George Washington Carver; Hedy Lamarr; Grace Hopper; Charles Babbage; Katherine Johnson; Mary Anning; Jocelyn Bell Burnell; Chien-Shiung Wu; Vera Rubin; Florence Nightingale; Ibn al-Haytham|Alhazen; Al-Khwarizmi; Avicenna|Ibn Sina; Robert Koch; Ignaz Semmelweis; Rudolf Virchow; Claude Bernard; Ivan Pavlov; Sigmund Freud; Santiago Ramón y Cajal; Linus Pauling; Frederick Sanger; Fritz Haber; Gottfried Leibniz; Blaise Pascal; René Descartes; Leonhard Euler; Carl Friedrich Gauss; Henri Poincaré; Kurt Gödel; John von Neumann; Claude Shannon; Tim Berners-Lee; Edmond Halley; Christiaan Huygens; Antonie van Leeuwenhoek; Benjamin Franklin; Humphry Davy; Henry Cavendish; Joseph Priestley; William Harvey; Galen; Hippocrates; Jennifer Doudna; Katalin Karikó; Sarah Gilbert; Edward Teller; Wernher von Braun; Robert Goddard; Konstantin Tsiolkovsky",
  ]},
  { q: "Name a unit of measurement", x: "unit", a: [
    "metre|meter; kilogram|kilo; inch; mile",
    "foot; centimetre|centimeter; gram; litre|liter; pound; second; yard; ounce; kilometre|kilometer; minute; hour",
    "pint; gallon; stone; tonne|ton; acre; hectare; millimetre|millimeter; degree; Celsius; Fahrenheit; watt; volt; calorie; byte; mph; millilitre; teaspoon; tablespoon; cup",
    "kelvin; joule; newton; pascal; ampere|amp; ohm; hertz; coulomb; farad; henry; tesla; weber; lumen; lux; candela; mole; becquerel; sievert; gray; decibel; furlong; chain; rod; league; fathom; nautical mile; knot; light year; parsec; astronomical unit; ångström|angstrom; micron; bushel; peck; gill; dram; grain; hand; cubit; carat; erg; bar; atmosphere; horsepower; bit; barrel; hogshead; radian; steradian; dalton; electronvolt; siemens; katal; roentgen; rem; curie; rad; dioptre; poise; stokes; gauss; maxwell; dyne; torr; psi; BTU; therm; kilowatt-hour; mil; thou; span; ell; perch; pole; rood; hide; township; firkin; kilderkin; butt; tun; quire; ream; gross; dozen; baker's dozen; score; jiffy; shake; fortnight; smoot",
  ]},
  { q: "Name a type of rock", x: "rock; stone", a: [
    "granite; marble; limestone",
    "sandstone; slate; basalt; chalk; obsidian; pumice",
    "shale; quartzite; flint; coal; gneiss; schist; igneous; sedimentary; metamorphic; lava; clay; quartz; mudstone",
    "gabbro; diorite; andesite; rhyolite; tuff; breccia; conglomerate; dolomite; siltstone; greywacke; peridotite; serpentinite; hornfels; phyllite; komatiite; travertine; tufa; chert; jasper; diatomite; scoria; eclogite; migmatite; anorthosite; dacite; trachyte; kimberlite; ironstone; oolite; marl; laterite; soapstone; lapis lazuli; pegmatite; porphyry; syenite; tonalite; granodiorite; dunite; norite; phonolite; ignimbrite; agglomerate; arkose; coquina; evaporite; rock salt|halite; gypsum; anthracite; lignite; jet; amphibolite; blueschist; greenschist; granulite; mylonite; skarn; marble; argillite; flagstone; ragstone; Purbeck marble; Portland stone; Bath stone; Yorkstone; millstone grit; greensand",
  ]},
  { q: "Name a constellation", a: [
    "Orion; the Plough|Plough|Big Dipper; Ursa Major|Great Bear",
    "Cassiopeia; Ursa Minor|Little Dipper|Little Bear; Leo; Scorpius|Scorpio",
    "Gemini; Taurus; Aries; Cancer; Virgo; Libra; Sagittarius; Capricornus|Capricorn; Aquarius; Pisces; Southern Cross|Crux; Andromeda; Pegasus; Perseus; Draco; Cygnus; Lyra",
    "Hercules; Boötes|Bootes; Aquila; Auriga; Centaurus; Carina; Canis Major; Canis Minor; Monoceros; Ophiuchus; Cepheus; Corona Borealis; Lupus; Hydra; Eridanus; Cetus; Vela; Puppis; Pavo; Tucana; Dorado; Volans; Columba; Lepus; Delphinus; Sagitta; Vulpecula; Lacerta; Triangulum; Camelopardalis; Lynx; Leo Minor; Coma Berenices; Corvus; Crater; Sextans; Antlia; Pyxis; Fornax; Sculptor; Phoenix; Grus; Indus; Telescopium; Microscopium; Norma; Ara; Circinus; Musca; Chamaeleon; Apus; Octans; Mensa; Hydrus; Horologium; Reticulum; Caelum; Pictor; Triangulum Australe; Corona Australis; Scutum; Serpens; Equuleus; Piscis Austrinus; Canes Venatici",
  ]},
  { q: "Name a part of a plant", a: [
    "leaf; stem; root; flower; petal",
    "seed; thorn; bud; branch; pollen; fruit; trunk; bark",
    "stamen; pistil; sepal; anther; stigma; style; ovary; xylem; phloem; chloroplast; stomata|stoma; bulb; tuber",
    "filament; calyx; corolla; node; internode; rhizome; cotyledon; cuticle; tendril; petiole; bract; carpel; receptacle; ovule; nectary; meristem; cambium; root hair; spine; trichome; frond; spadix; spathe; peduncle; pedicel; lenticel; corm; stolon; runner; guard cell; palisade layer; spongy mesophyll; mesophyll; epidermis; vein; midrib; lamina|leaf blade; stipule; axil; apical bud; lateral bud; taproot; fibrous root; root cap; pericycle; endodermis; cortex; pith; heartwood; sapwood; vascular bundle; cell wall; vacuole; tepal; perianth; hypanthium; anther; locule; placenta; endosperm; embryo; seed coat|testa; radicle; plumule; hypocotyl; epicotyl; awn; glume; catkin; cone; needle; prickle; aerial root; prop root; pneumatophore; haustorium",
  ]},
  { q: "Name a disease caused by a virus", x: "virus", a: [
    "flu|influenza; COVID-19|COVID|coronavirus; common cold|cold; chickenpox",
    "measles; HIV|AIDS; mumps; Ebola; rabies",
    "polio; smallpox; hepatitis; herpes; rubella|German measles; Zika; dengue; shingles; norovirus; glandular fever|mononucleosis|mono; cold sores; warts; HPV; bird flu|avian flu; swine flu",
    "yellow fever; hantavirus; Marburg; Lassa fever; West Nile; chikungunya; rotavirus; SARS; MERS; mpox|monkeypox; viral encephalitis|encephalitis; croup; bronchiolitis|RSV; hand, foot and mouth|hand foot and mouth; slapped cheek|fifth disease; roseola; tick-borne encephalitis; Japanese encephalitis; Nipah; Hendra; Rift Valley fever; Crimean-Congo haemorrhagic fever; cowpox; molluscum contagiosum; viral meningitis; viral gastroenteritis|stomach bug; adenovirus; enterovirus; hepatitis A; hepatitis B; hepatitis C; hepatitis E; Epstein-Barr; cytomegalovirus|CMV; HTLV; Oropouche; Kyasanur Forest disease; Hantavirus pulmonary syndrome; Bornholm disease; herpangina; infectious mononucleosis; foot-and-mouth disease; myxomatosis; distemper; parvovirus; tobacco mosaic",
  ]},
  { q: "Name a type of cloud", x: "cloud", a: [
    "cumulus; cirrus; stratus",
    "cumulonimbus; nimbus; nimbostratus; storm cloud|thundercloud; rain cloud",
    "altostratus; altocumulus; cirrostratus; cirrocumulus; stratocumulus; fog; mist; mammatus; lenticular; mushroom cloud",
    "noctilucent; nacreous|mother-of-pearl; Kelvin-Helmholtz; asperitas; pileus; arcus|shelf cloud; roll cloud; wall cloud; contrail; pyrocumulus|flammagenitus; virga; funnel cloud; Morning Glory; anvil|incus; castellanus; fractus; undulatus; mackerel sky; cap cloud; banner cloud; fallstreak hole|hole punch; polar stratospheric; cumulus congestus; cumulus humilis; cumulus mediocris; altocumulus lenticularis; stratus nebulosus; cirrus uncinus|mares' tails; floccus; spissatus; radiatus; velum; tuba; murus; cauda; praecipitatio; homogenitus|cataractagenitus; silvagenitus; Hutchinson's cloud; haar; sea fret",
  ]},
  { q: "Name a part of a cell", x: "cell", a: [
    "nucleus; mitochondria|mitochondrion; cell membrane|membrane; cytoplasm",
    "cell wall; ribosome; chloroplast; vacuole",
    "Golgi apparatus|Golgi|Golgi body; endoplasmic reticulum|ER; lysosome; nucleolus; DNA; chromosome; plasma membrane",
    "centriole; centrosome; cytoskeleton; peroxisome; vesicle; flagellum; cilia|cilium; plasmid; microtubule; microfilament; nuclear envelope|nuclear membrane; nuclear pore; pili; capsule; thylakoid; stroma; cristae; chromatin; rough ER; smooth ER; proteasome; spliceosome; matrix; cytosol; intermediate filament; tonoplast; amyloplast; chromoplast; leucoplast; plastid; glyoxysome; contractile vacuole; food vacuole; endosome; phagosome; lipid droplet; glycocalyx; microvilli; desmosome; tight junction; gap junction; plasmodesmata; nucleoid; mesosome; inclusion body; RNA; mRNA; tRNA; histone; gene; centromere; telomere; kinetochore; spindle",
  ]},
  { q: "Name a type of energy", x: "energy; power", a: [
    "solar; wind; nuclear",
    "kinetic; potential; electrical|electric; heat|thermal; light; sound",
    "chemical; hydroelectric|hydro; geothermal; tidal; wave; elastic; gravitational; renewable",
    "magnetic; radiant; biomass; mechanical; dark energy; activation energy; ionisation energy|ionization energy; zero-point; gravitational potential; elastic potential; fusion; fission; strain; internal; electromagnetic; rest energy|mass energy; vacuum energy; free energy; Gibbs free energy; lattice energy; bond energy; binding energy; latent heat; enthalpy; ocean thermal; osmotic|blue energy; fossil fuel; coal; oil; natural gas; hydrogen; biofuel; wood; peat; ionic; photovoltaic; piezoelectric; muscle; food energy|calories; spiritual|chi|qi",
  ]},
  { q: "Name a programming language", x: "language", a: [
    "Python; JavaScript; Java; C++",
    "C; C#; Ruby; PHP; Swift; SQL; HTML; CSS",
    "Rust; Go|Golang; Kotlin; TypeScript; R; Perl; MATLAB; Scala; BASIC|Visual Basic; assembly; Scratch; Fortran; COBOL",
    "Haskell; Lisp; Clojure; Erlang; Elixir; Pascal; Delphi; Ada; Prolog; Smalltalk; OCaml; F#; Julia; Lua; Dart; Zig; Nim; Crystal; Groovy; Objective-C; Logo; APL; Forth; Brainfuck; Racket; Scheme; Elm; Solidity; VB.NET; Bash; PowerShell; AWK; Tcl; D; Simula; ALGOL; B; ML; CoffeeScript; Common Lisp; Emacs Lisp; Mojo; Gleam; Odin; V; Carbon; Hack; Raku; PL/I; RPG; ABAP; Apex; SAS; SPSS; Stata; Verilog; VHDL; GLSL; HLSL; WebAssembly; Wolfram|Mathematica; Maple; Idris; Agda; Coq|Rocq; Lean; Eiffel; Modula-2; Oberon; Sed; Make; COBOL; J; K; Q; Befunge; Whitespace; LOLCODE; Piet; Shakespeare; Chef; Malbolge; INTERCAL; ActionScript; Visual FoxPro; Clarion; PureScript; ReasonML; ClojureScript; Kotlin Native; Ballerina; Pony",
  ]},
  { q: "Name a phobia (the word)", x: "phobia", a: [
    "arachnophobia; claustrophobia; agoraphobia",
    "acrophobia; xenophobia; homophobia; hydrophobia; aquaphobia",
    "nyctophobia; trypophobia; coulrophobia; ophidiophobia; aerophobia; emetophobia; glossophobia; triskaidekaphobia; hippopotomonstrosesquippedaliophobia; mysophobia|germophobia; technophobia; thalassophobia; nomophobia",
    "arachibutyrophobia; thanatophobia; haemophobia|hemophobia; trypanophobia; cynophobia; ailurophobia; astraphobia; pteromerhanophobia; philophobia; gamophobia; ombrophobia; chionophobia; selenophobia; heliophobia; pyrophobia; megalophobia; automatonophobia; pogonophobia; omphalophobia; ergophobia; somniphobia; dentophobia|odontophobia; iatrophobia; entomophobia; apiphobia|melissophobia; ornithophobia; musophobia; lepidopterophobia; necrophobia; phasmophobia; androphobia; gynophobia; atychiphobia; monophobia|autophobia; anglophobia; francophobia; hexakosioihexekontahexaphobia; paraskevidekatriaphobia; ephebiphobia; gerascophobia; sitophobia; nosophobia; cyberphobia; ablutophobia; bibliophobia; chromophobia; pediophobia; tokophobia; agyrophobia; batrachophobia; ranidaphobia; equinophobia|hippophobia; bovinophobia; galeophobia|selachophobia; ichthyophobia; herpetophobia; kinemortophobia; koumpounophobia; sesquipedalophobia; anuptaphobia; phobophobia; pantophobia; ergasiophobia; decidophobia; catoptrophobia|eisoptrophobia; spectrophobia; chiraptophobia; haphephobia; ochlophobia|enochlophobia; demophobia; scolionophobia; basophobia; climacophobia; amaxophobia; siderodromophobia; bathophobia; potamophobia; lilapsophobia; brontophobia; keraunophobia; cryophobia; frigophobia; thermophobia; xanthophobia; leukophobia; melanophobia; erythrophobia; porphyrophobia; papyrophobia; alektorophobia; arithmophobia; numerophobia; hylophobia; anthophobia; botanophobia; lachanophobia; mycophobia; chorophobia; logophobia; hypnophobia; oneirophobia; xylophobia; cacophobia; venustraphobia; caligynephobia; alliumphobia; turophobia; carnophobia; ichthyophobia",
  ]},
];
