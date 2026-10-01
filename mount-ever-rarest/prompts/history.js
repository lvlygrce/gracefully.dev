/* History. Format as in geography.js. `sub: true` lets a partial name
   count; `n: true` ignores regnal numbers ("Henry VIII" = "Henry"). */

export default [
  { q: "Name a British or English monarch", n: true, x: "king; queen", a: [
    "Elizabeth; Victoria; Henry; Charles",
    "George; William; Edward; James; Mary; Anne; Richard; John",
    "Alfred the Great|Alfred; William the Conqueror; Richard the Lionheart; Edward the Confessor; Harold; Cnut|Canute; Stephen; Matilda",
    "Æthelred|Aethelred|Ethelred; Æthelstan|Athelstan; Edgar; Edmund; Harthacnut; Harold Harefoot; Lady Jane Grey|Jane Grey|Jane; Eadwig; Eadred; Sweyn Forkbeard; Edward the Elder; Edmund Ironside; Edgar Ætheling; Egbert; Offa; Robert the Bruce; Macbeth; Malcolm; David; Duncan; Kenneth MacAlpin; Mary, Queen of Scots|Mary Queen of Scots; William of Orange; Empress Matilda; Louis",
  ]},
  { q: "Name a US president", sub: true, a: [
    "Abraham Lincoln|Abe Lincoln; George Washington; Barack Obama; Donald Trump; John F. Kennedy|JFK",
    "Joe Biden; Franklin D. Roosevelt|FDR; Theodore Roosevelt|Teddy Roosevelt; Ronald Reagan; George W. Bush; George H. W. Bush; Bill Clinton; Richard Nixon; Thomas Jefferson; Jimmy Carter",
    "Dwight D. Eisenhower|Eisenhower; Harry S. Truman|Truman; John Adams; John Quincy Adams; Andrew Jackson; James Madison; Gerald Ford; Ulysses S. Grant|Grant; James Monroe; Woodrow Wilson; Lyndon B. Johnson|LBJ",
    "James K. Polk|Polk; Zachary Taylor; Millard Fillmore; Franklin Pierce; James Buchanan; John Tyler; Martin Van Buren; William Henry Harrison; Benjamin Harrison; James Garfield; Chester A. Arthur|Chester Arthur; Grover Cleveland; William McKinley; William Howard Taft|Taft; Warren G. Harding|Harding; Calvin Coolidge; Herbert Hoover; Andrew Johnson; Rutherford B. Hayes|Hayes",
  ]},
  { q: "Name an ancient civilisation", x: "ancient; civilisation; civilization; empire", a: [
    "Egyptians|Egypt|Egyptian; Romans|Rome|Roman; Greeks|Greece|Greek",
    "Aztecs|Aztec; Incas|Inca; Maya|Mayans|Mayan; Vikings; Persians|Persia|Persian; Chinese|China",
    "Babylonians|Babylon|Babylonian; Sumerians|Sumer|Sumerian; Mesopotamians|Mesopotamia; Phoenicians|Phoenicia; Carthaginians|Carthage; Celts|Celtic; Indus Valley|Harappan; Mycenaeans; Minoans|Minoan",
    "Hittites; Assyrians|Assyria; Akkadians|Akkad; Etruscans; Olmecs; Toltecs; Zapotecs; Nabataeans; Kush|Kushites; Nubians|Nubia; Aksum|Axum|Aksumites; Scythians; Parthians; Elamites|Elam; Hyksos; Moche; Nazca; Chavín|Chavin; Khmer; Mauryans|Maurya; Guptas|Gupta; Shang; Zhou; Qin; Han; Sassanids|Sasanians; Achaemenids; Lydians|Lydia; Urartu; Norte Chico|Caral; Jōmon|Jomon; Hurrians; Mitanni; Philistines; Israelites; Dacians; Thracians; Illyrians; Picts; Anglo-Saxons; Huns; Goths; Teotihuacan; Mississippian; Ancestral Puebloans|Anasazi; Hohokam; Tiwanaku; Wari; Chimú|Chimu; Great Zimbabwe; Mali; Songhai; Ghana; Nok; Punt; Dilmun; Magan; Saba|Sheba; Lapita; Polynesians; Bactria; Sogdians; Xiongnu",
  ]},
  { q: "Name a famous battle", x: "battle", a: [
    "Waterloo; Hastings; Gettysburg",
    "the Somme|Somme; Stalingrad; Trafalgar; D-Day|Normandy; Agincourt; Pearl Harbor; the Alamo|Alamo; Battle of Britain|Britain",
    "the Bulge|Bulge; Thermopylae; Marathon; Midway; Verdun; Bosworth; Culloden; Little Bighorn; Yorktown; Dunkirk; El Alamein; Gallipoli; Passchendaele; Ypres; Hogwarts; Helm's Deep; Endor; Hoth",
    "Cannae; Actium; Salamis; Gaugamela; Issus; Zama; Tours; Lepanto; Vienna; Blenheim; Austerlitz; Leipzig; Borodino; Jena; Sedan; Jutland; Tannenberg; Kursk; Iwo Jima; Okinawa; Guadalcanal; Leyte Gulf; Monte Cassino; Arnhem; Dien Bien Phu; Antietam; Bull Run|Manassas; Shiloh; Vicksburg; Saratoga; Lexington; Bunker Hill; New Orleans; San Jacinto; Plassey; Rorke's Drift; Isandlwana; Balaclava; Inkerman; Sevastopol; Solferino; Bannockburn; Stirling Bridge; Flodden; Crécy|Crecy; Poitiers; Naseby; Marston Moor; the Boyne|Boyne; Tewkesbury; Towton; Stamford Bridge; Edgehill; Adrianople; Teutoburg Forest|Teutoburg; Alesia; Hattin; Manzikert; Ain Jalut; Kosovo; Mohács|Mohacs; Chaeronea; Kadesh; Megiddo; Red Cliffs; Sekigahara; Tsushima; Hue; Inchon|Incheon; Chosin Reservoir; Mons; the Marne|Marne; Cambrai; Amiens; Vimy Ridge; Messines; Caporetto; Stalingrad; Moscow; Leningrad; Berlin; Okinawa; the Atlantic; Coral Sea; Philippine Sea; Mount Badon; Maldon; Brunanburh; Lewes; Evesham; Falkirk; Killiecrankie; Prestonpans; Sedgemoor; Fontenoy; Quebec|Plains of Abraham; Fallen Timbers; Tippecanoe; Fredericksburg; Chancellorsville; Chickamauga; Wounded Knee; Omdurman; Spion Kop; Adwa|Adowa; Isandlwana; Ulundi",
  ]},
  { q: "Name an ancient Egyptian god", x: "god; goddess", a: [
    "Ra|Re; Anubis; Osiris; Isis; Horus",
    "Set|Seth; Thoth; Bastet|Bast",
    "Hathor; Ptah; Amun|Amun-Ra|Amon; Sobek; Nut; Geb; Sekhmet; Ma'at|Maat; Aten; Khepri",
    "Khnum; Khonsu; Bes; Taweret; Nephthys; Atum; Shu; Tefnut; Apep|Apophis; Montu; Min; Wadjet; Nekhbet; Neith; Serket|Selket; Mut; Hapi; Anuket; Satet|Satis; Heka; Meretseger; Renenutet; Seshat; Wepwawet; Ammit; Imhotep; Aker; Babi; Banebdjedet; Hu; Sia; Kek; Nun; Naunet; Amaunet; Heh; Hauhet; Mafdet; Menhit; Nefertum; Pakhet; Qetesh; Reshep; Anat; Astarte; Sopdet; Sopdu; Tatenen; Wosret; Unut; Mehen; Meskhenet; Shai; Hedetet; Iah; Ihy; Kebechet; Mertseger; Andjety; Sokar; Duamutef; Hapy; Imsety; Qebehsenuef",
  ]},
  { q: "Name a Greek god or goddess", x: "god; goddess", a: [
    "Zeus; Poseidon; Hades; Athena; Aphrodite",
    "Apollo; Ares; Hermes; Hera; Artemis",
    "Dionysus; Demeter; Hephaestus; Hestia; Persephone; Nike; Eros; Gaia; Kronos|Cronus; Pan; Hecate; Nemesis",
    "Uranus|Ouranos; Rhea; Nyx; Eos; Helios; Selene; Morpheus; Hypnos; Thanatos; Iris; Hebe; Tyche; Asclepius; Themis; Mnemosyne; Prometheus; Atlas; Oceanus; Tethys; Hyperion; Phoebe; Leto; Metis; Triton; Amphitrite; Aeolus; Boreas; Zephyrus; Harmonia; Eris; Deimos; Phobos; Ananke; Chaos; Erebus; Aether; Hemera; Pontus; Tartarus; Priapus; Nereus; Proteus; Thetis; Eileithyia; Hymen; Pothos; Himeros; Anteros; Plutus; Peitho; Ate; Dike; Eirene; Eunomia; the Fates|Moirai; Clotho; Lachesis; Atropos; the Muses; Calliope; Clio; Erato; Euterpe; Melpomene; Polyhymnia; Terpsichore; Thalia; Urania; Aglaea; Euphrosyne; Charites|Graces; Nemesis; Hesperides; Selene; Astraea; Coeus; Crius; Iapetus; Theia; Epimetheus; Menoetius; Styx; Hecate; Persephone; Kore",
  ]},
  { q: "Name a Roman emperor", sub: true, x: "emperor", a: [
    "Augustus; Nero; Caligula",
    "Marcus Aurelius; Hadrian; Constantine; Claudius; Commodus",
    "Tiberius; Trajan; Vespasian; Titus; Domitian; Diocletian; Septimius Severus; Caracalla",
    "Galba; Otho; Vitellius; Nerva; Antoninus Pius; Lucius Verus; Pertinax; Didius Julianus; Geta; Macrinus; Elagabalus; Severus Alexander; Maximinus Thrax; Gordian; Philip the Arab; Decius; Valerian; Gallienus; Aurelian; Probus; Carus; Maximian; Galerius; Constantius; Licinius; Julian the Apostate|Julian; Jovian; Valentinian; Valens; Gratian; Theodosius; Honorius; Arcadius; Romulus Augustulus; Justinian; Zeno; Majorian; Anthemius; Heraclius; Basil; Tacitus; Florian; Numerian; Carinus; Maxentius; Constans; Constantine II; Trebonianus Gallus; Aemilian; Claudius Gothicus; Quintillus; Pupienus; Balbinus; Philip; Hostilian; Herennius Etruscus; Magnus Maximus; Leo; Anastasius; Justin; Phocas; Maurice; Tiberius II; Justinian II; Constans II; Leo III; Basil II; Alexios Komnenos|Alexios; Constantine XI",
  ]},
  { q: "Name a famous explorer", sub: true, x: "explorer", a: [
    "Christopher Columbus; Ferdinand Magellan; Marco Polo",
    "Captain James Cook|James Cook|Captain Cook; Vasco da Gama; Roald Amundsen; Ernest Shackleton; Robert Falcon Scott|Captain Scott; Neil Armstrong; Edmund Hillary; Tenzing Norgay",
    "Francis Drake; Walter Raleigh; Amerigo Vespucci; John Cabot; Henry Hudson; David Livingstone; Henry Morton Stanley; Meriwether Lewis; William Clark; Ibn Battuta; Zheng He; Leif Erikson|Leif Eriksson; Erik the Red; Hernán Cortés|Cortes; Francisco Pizarro; Yuri Gagarin; Amelia Earhart; Jacques Cousteau; George Mallory",
    "Vasco Núñez de Balboa|Balboa; Hernando de Soto; Juan Ponce de León|Ponce de Leon; Samuel de Champlain; Jacques Cartier; René-Robert de La Salle|La Salle; Mungo Park; Richard Burton; John Hanning Speke; Mary Kingsley; Isabella Bird; Gertrude Bell; Fridtjof Nansen; Robert Peary; Matthew Henson; John Franklin; Vitus Bering; Abel Tasman; William Dampier; Matthew Flinders; Robert O'Hara Burke; William John Wills; William Bligh; Martin Frobisher; Alexander von Humboldt; Louis Antoine de Bougainville; Jean-François de La Pérouse|La Perouse; Douglas Mawson; Richard Byrd; Ranulph Fiennes; Freya Stark; Bartolomeu Dias; Pedro Álvares Cabral|Cabral; George Vancouver; Alexander Mackenzie; John C. Frémont|Fremont; Sacagawea; Daniel Boone; Ahmad ibn Fadlan|Ibn Fadlan; Xuanzang; Faxian; Hanno the Navigator; Pytheas; Saint Brendan; Bjarni Herjólfsson; Willem Barentsz; Jean de Brébeuf; Simon Fraser; David Thompson; Jedediah Smith; Zebulon Pike; John Wesley Powell; Ludwig Leichhardt; Edward John Eyre; John McDouall Stuart; Charles Sturt; Burke and Wills; Ida Pfeiffer; Alexandra David-Néel; Isabelle Eberhardt; Nellie Bly; Matthew Henson; Apsley Cherry-Garrard; Tom Crean; Frank Wild; Edward Wilson; Lawrence Oates; Ann Bancroft; Liv Arnesen; Børge Ousland; Reinhold Messner; Junko Tabei; Thor Heyerdahl; Sylvia Earle; Valentina Tereshkova; Buzz Aldrin; Sally Ride; John Glenn; Alan Shepard",
  ]},
  { q: "Name a wonder of the ancient world", x: "wonder", a: [
    "Great Pyramid of Giza|Great Pyramid|Pyramids|Pyramids of Giza; Hanging Gardens of Babylon|Hanging Gardens",
    "Colossus of Rhodes|Colossus; Lighthouse of Alexandria|Pharos of Alexandria|Pharos",
    "Statue of Zeus at Olympia|Statue of Zeus; Temple of Artemis at Ephesus|Temple of Artemis",
    "Mausoleum at Halicarnassus|Mausoleum of Halicarnassus|Mausoleum; Walls of Babylon; Ishtar Gate",
  ]},
  { q: "Name a famous queen, from any era", n: true, x: "queen", a: [
    "Cleopatra; Elizabeth; Victoria; Marie Antoinette",
    "Nefertiti; Boudica|Boudicca; Anne Boleyn; Mary, Queen of Scots|Mary Queen of Scots; Isabella; Mary; Anne",
    "Catherine the Great; Eleanor of Aquitaine; Hatshepsut; Queen of Sheba|Sheba; Bloody Mary; Catherine of Aragon; Jane Seymour; Camilla; Elizabeth the Queen Mother|Queen Mother; Guinevere; Esther; Dido; Queen of Hearts; Elsa;Latifah; Bey|Beyoncé",
    "Zenobia; Liliʻuokalani|Liliuokalani; Nzinga; Seondeok; Wu Zetian; Theodora; Tamar; Christina; Margrethe; Wilhelmina; Juliana; Beatrix; Máxima|Maxima; Rania; Noor; Letizia; Sofía|Sofia; Silvia; Alexandra; Mary of Teck; Caroline; Charlotte; Adelaide; Matilda; Berengaria; Anne of Cleves; Catherine Howard; Catherine Parr; Ranavalona; Lakshmibai|Rani of Jhansi; Artemisia; Olga of Kiev; Jadwiga; Maria Theresa; Joanna; Tomyris; Amanirenas; Nur Jahan; Razia Sultana; Sālote|Salote; Emma of Normandy; Æthelflæd|Aethelflaed; Gorgo; Hippolyta; Penthesilea; Medb|Maeve; Cartimandua; Grace O'Malley|Granuaile; Margaret of Anjou; Elizabeth Woodville; Isabella of France; Eleanor of Castile; Philippa of Hainault; Anne Neville; Henrietta Maria; Catherine of Braganza; Mary of Modena; Caroline of Brunswick; Marie de' Medici; Catherine de' Medici; Anne of Austria; Josephine; Hortense; Louise of Prussia; Elisabeth of Austria|Sisi; Margaret of Denmark; Mumtaz Mahal; Didda; Rudrama Devi; Amina of Zaria; Yaa Asantewaa; Makeda; Nefertari; Tiye; Ahhotep; Cleopatra Selene; Arsinoe; Berenice; Olympias; Semiramis; Tamar of Georgia; Isabella of Castile; Juana la Loca; Christina of Sweden; Ulrika Eleonora; Kristina; Victoria of Sweden",
  ]},
  { q: "Name a famous empire", x: "empire", a: [
    "Roman; British; Ottoman",
    "Mongol; Persian; Byzantine; Holy Roman; Aztec; Inca; Egyptian; Galactic",
    "Spanish; French; Russian; Mughal; Han; Habsburg|Austrian|Austro-Hungarian; German; Japanese; Chinese; Greek; Macedonian; Babylonian; Assyrian; Portuguese; Dutch; Carolingian; Napoleonic; Qing; Ming",
    "Achaemenid; Sassanid|Sasanian; Seleucid; Parthian; Maurya; Gupta; Khmer; Mali; Songhai; Ghana; Benin; Ashanti; Zulu; Ethiopian; Aksumite; Frankish; Abbasid; Umayyad; Fatimid; Seljuk; Timurid; Safavid; Tang; Song; Yuan; Qin; Vijayanagara; Chola; Majapahit; Srivijaya; Swedish; Danish; Brazilian; Korean; Tibetan; Khwarazmian; Golden Horde; Kushan; Hittite; Akkadian; Athenian; Carthaginian; Angevin; Latin; Bulgarian; Serbian; North Sea; Kanem-Bornu; Oyo; Wari; Tiwanaku; Toltec; Durrani; Sikh; Maratha; Delhi Sultanate; Ayyubid; Mamluk; Almohad; Almoravid; Rashidun; Hunnic; Xiongnu; Göktürk; Uyghur; Liao; Jin; Western Xia; Gokturk; Empire of Japan; Korean Empire; Mexican; Haitian; Central African; Manchukuo; Trebizond; Nicaea; Thessalonica",
  ]},
  { q: "Name a ruler known as \"the Great\"", x: "great", a: [
    "Alexander; Alfred; Peter; Catherine",
    "Frederick; Charlemagne|Charles; Cyrus",
    "Ramesses|Rameses; Herod; Constantine; Cnut|Canute; Ivan; Akbar; Darius",
    "Theodoric; Casimir; Otto; Pompey; Antiochus; Tigranes; Gregory; Leo; Kamehameha; Sejong; Mithridates; Ashoka; Shapur; Abbas; Vytautas; Rhodri; Llywelyn; Sancho; Alfonso; Louis; Ranjit Singh; Gwanggaeto; Sargon; Mstislav; Vladimir; Stephen|Stefan; Hugh; Gustavus Adolphus|Gustavus",
  ]},
  { q: "Name a famous castle", x: "castle; chateau; château; schloss", a: [
    "Windsor; Edinburgh; Neuschwanstein; Hogwarts",
    "Tower of London; Balmoral; Warwick; Leeds; Dover; Stirling; Bran|Dracula's Castle; Cinderella",
    "Conwy; Caernarfon; Himeji; Prague Castle|Prague; Alnwick; Bamburgh; Cardiff; Blarney; Harlech; Eilean Donan; Urquhart; Glamis; Tintagel; Alhambra; Versailles; Highclere|Downton Abbey; Hohenzollern; Carcassonne",
    "Beaumaris; Dunnottar; Caerphilly; Bodiam; Corfe; Kenilworth; Lindisfarne; Arundel; Hever; Chillon; Eltz; Heidelberg; Malbork; Bled; Predjama; Alcázar of Segovia|Alcazar of Segovia; Chambord; Chenonceau; Krak des Chevaliers; Castel Sant'Angelo; Matsumoto; Osaka; Peleș|Peles; Corvin|Hunyad; Spiš|Spis; Trakai; Kronborg; Frederiksborg; Moszna; Cahir; Trim; Kilkenny; Dunluce; Bunratty; Ashford; Dublin; Rock of Cashel; Hearst; Boldt; Casa Loma; Castillo de San Marcos; Sleeping Beauty; Pembroke; Chepstow; Raglan; Kidwelly; Carreg Cennen; Powis; Penrhyn; Castell Coch; Rochester; Colchester; Framlingham; Orford; Leeds; Lewes; Pevensey; Arundel; Berkeley; Sudeley; Ludlow; Goodrich; Stokesay; Durham; Raby; Richmond; Skipton; Pontefract; Scarborough; Warkworth; Dunstanburgh; Lindisfarne; Caerlaverock; Culzean; Inveraray; Cawdor; Blair; Doune; Tantallon; Craigievar; Crathes; Dunrobin; Kisimul; Castle Stalker|Stalker; Kilchurn; Edinburgh; Château Frontenac|Frontenac; Mont Saint-Michel; Hochosterwitz; Burg Eltz; Wartburg; Lichtenstein; Cochem; Marksburg; Pfalzgrafenstein; Sanssouci; Bratislava; Buda; Spilberk; Karlštejn|Karlstejn; Český Krumlov|Cesky Krumlov; Wawel; Ksiaz; Olavinlinna; Gripsholm; Kalmar; Vyborg; Kremlin; Guaita; Castel del Monte; Sforza; Miramare; Bellver; Coca; Loarre; Peñafiel; Belmonte; Pena Palace|Pena; Guimarães|Guimaraes; Bodrum; Rumelihisarı; Kerak; Masada; Citadel of Aleppo; Bam; Chittorgarh; Mehrangarh; Amber Fort; Golconda; Matsue; Kumamoto; Inuyama; Hikone; Nijo; Shuri; Edo",
  ]},
  { q: "Name a famous ship", x: "ship; hms; rms; ss; uss", a: [
    "Titanic; Mayflower",
    "HMS Victory|Victory; Mary Rose; Cutty Sark; Bismarck; Lusitania; Santa María|Santa Maria; Black Pearl; Queen Mary",
    "Endeavour; HMS Beagle|Beagle; Golden Hinde|Golden Hind; Queen Elizabeth 2|QE2|Queen Elizabeth; Yamato; HMS Bounty|Bounty; Endurance; Terror; Erebus; Fram; Vasa; USS Arizona|Arizona; USS Enterprise|Enterprise; Mary Celeste; Pinta; Niña|Nina; Kon-Tiki; Calypso; Rainbow Warrior; Exxon Valdez; USS Constitution|Constitution; Potemkin; Flying Dutchman; Ark; Argo; Nautilus; Pequod; Millennium Falcon; Hispaniola; Jolly Roger; Dawn Treader; Queen Anne's Revenge",
    "Essex; USS Missouri|Missouri; HMS Hood|Hood; Ark Royal; HMS Belfast|Belfast; HMS Warrior|Warrior; SS Great Britain|Great Britain; Great Eastern; Andrea Doria; Edmund Fitzgerald; Monitor; Merrimack|CSS Virginia; Aurora; Graf Spee|Admiral Graf Spee; Tirpitz; Scharnhorst; Olympic; Britannic; Carpathia; Californian; Normandie; Wilhelm Gustloff; Batavia; Resolute; Discovery; Dreadnought|HMS Dreadnought; Prince of Wales; Repulse; Bluenose; Sovereign of the Seas; Thermopylae; Royal Charles; Mary Rose; Golden Hind; Revenge; Ark Royal; Henri Grâce à Dieu; Great Harry; Gokstad; Oseberg; Sutton Hoo; Khufu ship; Treasure ship; Kyrenia; Wasa; Amistad; Clotilda; Zong; Empire Windrush|Windrush; Herald of Free Enterprise; Costa Concordia; Estonia; Sewol; Doña Paz; Lancastria; Kursk; Belgrano|General Belgrano; Sir Galahad; Atlantic Conveyor; Sheffield; Indianapolis|USS Indianapolis; Maine|USS Maine; Akagi; Shinano; Musashi; Prinz Eugen; Bismarck; Endurance; Nimrod; Quest; Discovery; Terra Nova; Aurora; Belgica; Gjøa|Gjoa; Jeannette; Polaris; Investigator; Hecla; Fury; Victoria; Trinidad; Golden Hinde; Matthew; Half Moon|Halve Maen; Speedwell; Duyfken; Resolution; Adventure; Investigator; Challenger|HMS Challenger; Alvin; Trieste; Hunley; Holland; Turtle; Nautilus; Seawise Giant; Allure of the Seas; Icon of the Seas; Wonder of the Seas; Oasis of the Seas; Queen Mary 2|QM2; Canberra; Oriana; France; United States; Rex; Bremen; Mauretania; Aquitania; Imperator; Vaterland; Leviathan; Sirius; Savannah; Charlotte Dundas; Turbinia; Clermont; Cutty Sark",
  ]},
  { q: "Name one of Henry VIII's wives", sub: true, a: [
    "Anne Boleyn; Catherine of Aragon",
    "Jane Seymour",
    "Anne of Cleves",
    "Catherine Howard|Kathryn Howard; Catherine Parr|Katherine Parr",
  ]},
  { q: "Name a famous revolution", x: "revolution; revolutionary", a: [
    "French; American; Russian; Industrial",
    "Cuban; Chinese; Glorious; Cultural",
    "Iranian; Mexican; Haitian; Velvet; Orange; Agricultural; Scientific; Bolshevik; October; February; Digital; Green",
    "Xinhai; Meiji Restoration|Meiji; Carnation; Rose; Tulip; Cedar; Jasmine; Saffron; Egyptian; Hungarian; German; Bolivarian; Sandinista|Nicaraguan; Algerian; Easter Rising|Irish; Neolithic; Sexual; Quiet; Singing; 1848|Revolutions of 1848; Dutch; Texas; Portuguese; Romanian; EDSA|People Power; Kenyan; Zanzibar; Ethiopian; Libyan; Tunisian; Syrian; Yemeni; Bahraini; Euromaidan|Revolution of Dignity|Maidan; Bulldozer; Umbrella; Sunflower; Burmese|8888; Saur; Young Turk; Taiping; Boxer; Mexican; Bolivian; Guatemalan; Venezuelan; Argentine; Brazilian; Chilean; Belgian; Greek; Serbian; Polish; Lithuanian; Estonian; Latvian; Georgian; Armenian; Ukrainian; Kyrgyz; Tajik; Uzbek; Commercial; Consumer; Financial; Information; Second Industrial; Fourth Industrial; Copernican; Darwinian; Keynesian; Quantum; Military; Neolithic; Urban; Paper; Printing; Peaceful; Silent; Bloodless; Atlantic; Spanish; Italian; July; February; Paris Commune",
  ]},
  { q: "Name a famous treaty", x: "treaty; of; peace", a: [
    "Versailles",
    "Paris; Waitangi; Rome",
    "Tordesillas; Westphalia; Utrecht; Ghent; Maastricht; Lisbon; Brest-Litovsk; Nanking|Nanjing; Kyoto Protocol|Kyoto; Paris Agreement; Good Friday Agreement|Good Friday; Camp David Accords|Camp David; Oslo Accords|Oslo; Dayton Agreement|Dayton; Act of Union|Union; North Atlantic|NATO; Non-Proliferation|NPT; Geneva Conventions|Geneva",
    "Trianon; Saint-Germain; Sèvres|Sevres; Lausanne; Vienna; Tilsit; Amiens; Aix-la-Chapelle; Nerchinsk; Guadalupe Hidalgo; Fort Laramie; Kanagawa; Portsmouth; Shimonoseki; London; Locarno; Rapallo; Limerick; Troyes; Verdun; Adrianople; Kadesh; Tientsin|Tianjin; Aigun; Berlin; Brussels; Outer Space; Antarctic; Schengen; Arras; Bretigny; Picquigny; Northampton; York; Edinburgh-Northampton; Perth; Windsor; Falaise; Montgomery; Wedmore; Alfred and Guthrum; Hubertusburg; Pressburg; Campo Formio; Lunéville; Fontainebleau; Kiel; Adams-Onís; Webster-Ashburton; Oregon; Wanghia; Whampoa; Ryswick; Nijmegen; Karlowitz; Passarowitz; Belgrade; Küçük Kaynarca; Jassy; Bucharest; Adrianople; San Stefano; Frankfurt; Prague; Zurich; Turin; Villafranca; Washington Naval; Kellogg-Briand; Munich Agreement|Munich; Molotov-Ribbentrop|Nazi-Soviet Pact; Atlantic Charter; Yalta; Potsdam; San Francisco; Warsaw Pact; Elysée; Helsinki Accords; SALT; START; INF; New START; Montreal Protocol; Ramsar; CITES; Svalbard; Lateran; Concordat of Worms; Medina; Hudaybiyyah; Zuhab; Amasya; Erzurum; Gulistan; Turkmenchay; Akhal; Peking|Beijing; Simla; Lahore; Amritsar; Tashkent; Shimla; Mangalore; Seringapatam; Bassein; Salbai; Allahabad; Waitangi",
  ]},
];
