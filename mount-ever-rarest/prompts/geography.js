/* Geography. Each prompt lists accepted answers in four tiers, from the
   answers most people reach for (tier 0) to the ones almost nobody does
   (tier 3). Answers are separated by ";" and aliases by "|"; the first
   alias is the one shown. `x` lists words that may be dropped from either
   side before matching ("tiger shark" = "tiger"). */

export default [
  { q: "Name a country in Africa", a: [
    "Egypt; South Africa; Nigeria; Kenya; Morocco; Ethiopia",
    "Ghana; Algeria; Tanzania; Uganda; Zimbabwe; Libya; Tunisia; Sudan; Somalia; Madagascar; Senegal; Rwanda; Democratic Republic of the Congo|DRC|DR Congo|Congo; Republic of the Congo; Cameroon; Zambia; Namibia; Botswana; Angola; Mali; Ivory Coast|Côte d'Ivoire",
    "Niger; Chad; Mozambique; Malawi; Sierra Leone; Liberia; Burkina Faso; Guinea; Benin; Togo; Gabon; Eritrea; Mauritania; South Sudan; Lesotho; Eswatini|Swaziland; Burundi; Djibouti; Gambia; Central African Republic|CAR",
    "Equatorial Guinea; Guinea-Bissau; Cape Verde|Cabo Verde; Comoros; São Tomé and Príncipe|Sao Tome; Seychelles; Mauritius; Western Sahara",
  ]},
  { q: "Name a capital city in Europe", a: [
    "London; Paris; Rome; Berlin; Madrid",
    "Dublin; Amsterdam; Lisbon; Athens; Vienna; Brussels; Moscow; Oslo; Stockholm; Copenhagen; Prague; Warsaw; Budapest",
    "Helsinki; Bern; Reykjavík; Edinburgh; Cardiff; Bucharest; Sofia; Belgrade; Zagreb; Kyiv|Kiev; Bratislava; Ljubljana; Tallinn; Riga; Vilnius; Luxembourg; Monaco; Minsk",
    "Valletta; Sarajevo; Skopje; Tirana; Podgorica; Chișinău|Chisinau; Vaduz; Andorra la Vella; San Marino; Nicosia; Belfast; Pristina; Vatican City; Tbilisi; Yerevan; Baku",
  ]},
  { q: "Name a US state", x: "state", a: [
    "California; Texas; Florida; New York",
    "Hawaii; Alaska; Washington; Nevada; Arizona; Colorado; Ohio; Georgia; Illinois; Michigan; Massachusetts; Pennsylvania; Virginia; New Jersey; Oregon",
    "Utah; Tennessee; Louisiana; Kentucky; North Carolina; South Carolina; Minnesota; Wisconsin; Missouri; Alabama; Mississippi; Maine; Maryland; Connecticut; Indiana; Oklahoma; Kansas; Iowa; New Mexico; Vermont",
    "North Dakota; South Dakota; Wyoming; Montana; Idaho; Nebraska; Delaware; Rhode Island; New Hampshire; West Virginia; Arkansas",
  ]},
  { q: "Name a river", x: "river", a: [
    "Nile; Amazon; Thames; Mississippi",
    "Danube; Seine; Rhine; Yangtze; Ganges; Hudson; Colorado",
    "Volga; Mekong; Congo; Zambezi; Tigris; Euphrates; Missouri; St Lawrence; Rio Grande; Shannon; Severn; Tiber; Po; Loire; Elbe; Indus; Yellow River|Huang He; Jordan",
    "Yenisei; Ob; Lena; Amur; Irrawaddy; Murray; Darling; Orinoco; Paraná; Niger; Limpopo; Dnieper; Vistula; Oder; Tagus; Douro; Rhône; Mackenzie; Yukon; Columbia; Brahmaputra; Salween; Ural; Liffey; Clyde; Tyne; Trent; Avon; Ouse; Mersey; Ebro; Garonne; Arno; Tay; Spey; Wye; Dee; Don; Moselle; Main; Neckar; Okavango; Senegal; Ohio; Tennessee; Snake; Platte",
  ]},
  { q: "Name an island", x: "island; isle", a: [
    "Hawaii; Jamaica; Ireland; Iceland; Great Britain|Britain",
    "Bali; Sicily; Madagascar; Cuba; Greenland; Tasmania; Crete; Ibiza; Majorca|Mallorca; Isle of Wight|Wight; North Island; South Island",
    "Sardinia; Corsica; Cyprus; Malta; Borneo; Sumatra; Java; Sri Lanka; Tenerife; Barbados; Tahiti; Skye; Anglesey; Manhattan; Long Island; Isle of Man|Man; Santorini; Mykonos; Corfu; Rhodes; Capri; Lanzarote; Gran Canaria; Madeira; Hokkaido; Honshu; Zanzibar; Jersey; Guernsey",
    "Svalbard; Kyushu; Shikoku; Socotra; Easter Island|Rapa Nui; Galápagos; Mauritius; Réunion; Lampedusa; Gotland; Baffin Island|Baffin; Ellesmere; Sakhalin; Hispaniola; Trinidad; Tobago; Lewis; Harris; Mull; Islay; Sark; Lundy; St Helena; Tristan da Cunha; Ascension; Newfoundland; Vancouver Island; Prince Edward Island; Kodiak; Elba; Fiji; New Guinea; Sulawesi; Mindanao; Luzon; Okinawa; Jeju; Hainan; Phuket; Komodo; Lindisfarne; Orkney; Shetland; Arran",
  ]},
  { q: "Name a mountain range", x: "mountains; mountain; range", a: [
    "Himalayas; Alps; Rocky Mountains|Rockies; Andes",
    "Pyrenees; Appalachians; Atlas; Urals",
    "Carpathians; Apennines; Dolomites; Sierra Nevada; Cascades; Karakoram; Hindu Kush; Caucasus; Great Dividing Range; Drakensberg; Cairngorms; Grampians; Pennines; Snowdonia|Eryri",
    "Tian Shan; Altai; Pamirs; Zagros; Brooks Range; Alaska Range; Sierra Madre; Transantarctic; Rwenzori|Ruwenzori; Balkan; Tatras; Jura; Vosges; Coast Mountains; Tetons; Blue Ridge; Adirondacks; Ozarks; Southern Alps; Anti-Atlas; Kunlun; Hengduan; Western Ghats; Eastern Ghats; Aravalli; Simien; Brecon Beacons; Lake District Fells; Black Hills; Sierra Morena; Massif Central; Harz; Sudetes; Dinaric Alps",
  ]},
  { q: "Name a desert", x: "desert", a: [
    "Sahara; Gobi",
    "Kalahari; Atacama; Mojave; Arabian; Antarctic|Antarctica; Sonoran",
    "Namib; Great Victoria; Simpson; Thar; Taklamakan; Chihuahuan; Great Basin; Death Valley; Negev; Sinai; Arctic",
    "Karakum; Kyzylkum; Dasht-e Kavir; Dasht-e Lut; Rub' al Khali|Empty Quarter; Syrian; Gibson; Tanami; Great Sandy; Patagonian; Danakil; Judean; Wadi Rum; White Desert; Painted Desert; Black Rock; Colorado Desert; Owyhee; Ordos; Badain Jaran; Tabernas; Bardenas Reales; Accona; Little Sandy; Strzelecki; Sturt Stony; Libyan; Nubian; Ténéré; Danakil",
  ]},
  { q: "Name a country in South America", a: [
    "Brazil; Argentina; Peru; Chile; Colombia",
    "Venezuela; Ecuador; Bolivia",
    "Uruguay; Paraguay",
    "Guyana; Suriname; French Guiana",
  ]},
  { q: "Name a city in Australia", a: [
    "Sydney; Melbourne; Brisbane; Perth",
    "Adelaide; Canberra; Darwin; Hobart; Gold Coast",
    "Cairns; Newcastle; Wollongong; Geelong; Townsville; Alice Springs; Sunshine Coast",
    "Ballarat; Bendigo; Toowoomba; Launceston; Mackay; Rockhampton; Bunbury; Wagga Wagga; Albury; Mildura; Broome; Kalgoorlie; Orange; Dubbo; Bathurst; Tamworth; Mount Gambier; Port Augusta; Whyalla; Devonport; Burnie; Geraldton; Karratha; Port Hedland; Coffs Harbour; Ipswich; Bundaberg; Hervey Bay; Shepparton; Fremantle; Byron Bay; Port Macquarie; Katherine; Mandurah",
  ]},
  { q: "Name a sea", x: "sea", a: [
    "Mediterranean; Red Sea; Dead Sea; Caribbean",
    "North Sea; Black Sea; Baltic; Caspian; Irish Sea",
    "Arabian; South China; Adriatic; Aegean; Coral; Tasman; Bering; Java; Sea of Japan|Japan; Yellow",
    "Sargasso; Weddell; Ross; Barents; Kara; Laptev; Beaufort; Labrador; Norwegian; Celtic; Ligurian; Tyrrhenian; Ionian; Marmara; Azov; Okhotsk; Andaman; Banda; Timor; Arafura; Sulu; Celebes; Philippine; East China; Scotia; Alboran; Balearic; White; Aral; Salton; Galilee; Chukchi; East Siberian; Greenland; Wadden; Bismarck; Solomon; Hebrides",
  ]},
  { q: "Name a country that starts with \"S\"", a: [
    "Spain; Sweden; Switzerland; Scotland",
    "South Africa; Singapore; Saudi Arabia; South Korea; Sri Lanka; Somalia; Sudan; Syria",
    "Senegal; Serbia; Slovakia; Slovenia; Samoa; South Sudan; Suriname; Seychelles; Sierra Leone",
    "San Marino; São Tomé and Príncipe|Sao Tome; Solomon Islands; Saint Lucia|St Lucia; Saint Kitts and Nevis|St Kitts; Saint Vincent and the Grenadines|St Vincent; Swaziland",
  ]},
  { q: "Name a volcano", x: "volcano", a: [
    "Vesuvius; Etna; Fuji; Krakatoa",
    "Kīlauea|Kilauea; Mauna Loa; Mount St Helens|St Helens; Eyjafjallajökull|Eyjafjallajokull",
    "Stromboli; Popocatépetl|Popocatepetl; Pinatubo; Kilimanjaro; Tambora; Hekla; Mauna Kea; Yellowstone; Rainier; Olympus Mons; Teide",
    "Merapi; Erebus; Nyiragongo; Cotopaxi; Chimborazo; Sakurajima; Taal; Mayon; Pelée|Pelee; Ruapehu; Tongariro; Ngauruhoe; Taranaki; Agung; Sinabung; Bárðarbunga|Bardarbunga; Katla; Grímsvötn|Grimsvotn; Aso; Unzen; Shasta; Hood; Baker; Lassen; Paricutín|Paricutin; Arenal; Villarrica; Ojos del Salado; Erta Ale; Ol Doinyo Lengai; Elbrus; Fagradalsfjall; Cumbre Vieja; Soufrière Hills|Soufriere Hills; Hunga Tonga; Nevado del Ruiz; Santorini; Krakatau; Cotopaxi; Mount Mazama|Crater Lake; Ararat; Damavand",
  ]},
  { q: "Name a famous bridge", x: "bridge", a: [
    "Golden Gate; Tower Bridge; London Bridge; Brooklyn Bridge",
    "Sydney Harbour Bridge; Rialto; Ponte Vecchio; Forth Bridge; Severn Bridge",
    "Millau Viaduct; Charles Bridge; Bridge of Sighs; Clifton Suspension Bridge; Humber Bridge; Øresund|Oresund; Akashi Kaikyō|Akashi Kaikyo; Tsing Ma; Verrazzano|Verrazano; George Washington Bridge; Mackinac; Sunshine Skyway; Glenfinnan Viaduct; Ribblehead Viaduct",
    "Chain Bridge|Széchenyi; Pont du Gard; Pont Neuf; Pont Alexandre III; Stari Most|Mostar; Tyne Bridge; Millennium Bridge; Ha'penny Bridge; Carrick-a-Rede; Galata Bridge; Hong Kong–Zhuhai–Macau; Danyang–Kunshan; Lake Pontchartrain Causeway; Seven Mile Bridge; Iron Bridge|Ironbridge; Menai; Erasmus; Khaju; Si-o-se-pol; Capilano; Confederation Bridge; Story Bridge; Harbour Bridge; Helix Bridge; Gateshead Millennium; Kintai; Rakotzbrücke|Rakotzbrucke; Puente de Triana; Pont d'Avignon",
  ]},
  { q: "Name a lake", x: "lake; loch; lough", a: [
    "Loch Ness; Superior; Michigan; Geneva; Como",
    "Victoria; Titicaca; Baikal; Erie; Ontario; Huron; Tahoe; Windermere; Garda",
    "Tanganyika; Malawi; Lucerne; Constance; Maggiore; Balaton; Great Salt Lake; Ladoga; Chad; Lomond; Neagh; Louise; Bled; Lake District",
    "Onega; Winnipeg; Great Bear; Great Slave; Athabasca; Nicaragua; Maracaibo; Eyre; Taupō|Taupo; Wakatipu; Ohrid; Inle; Toba; Issyk-Kul; Van; Urmia; Tonlé Sap|Tonle Sap; Dal; Okeechobee; Champlain; Placid; Crater; Mead; Powell; Zurich; Annecy; Bourget; Hallstatt; Derwentwater; Ullswater; Coniston; Bala; Turkana; Kivu; Albert; Volta; Kariba; Nasser; Retba; Hillier; Peyto; Moraine; Bohinj; Plitvice; Iseo; Orta; Lugano; Thun; Brienz; Königssee|Konigssee; Titisee; Katrine; Tay; Awe; Morar",
  ]},
  { q: "Name a landlocked country", a: [
    "Switzerland; Austria",
    "Nepal; Bolivia; Paraguay; Hungary; Czech Republic|Czechia; Mongolia; Afghanistan; Luxembourg",
    "Bhutan; Laos; Kazakhstan; Uzbekistan; Serbia; Slovakia; Belarus; Liechtenstein; Andorra; San Marino; Vatican City|Vatican; Ethiopia; Uganda; Rwanda; Zimbabwe; Zambia",
    "Lesotho; Eswatini|Swaziland; Botswana; Malawi; Burundi; South Sudan; Chad; Niger; Mali; Burkina Faso; Central African Republic; Kyrgyzstan; Tajikistan; Turkmenistan; Armenia; Azerbaijan; Moldova; North Macedonia|Macedonia; Kosovo",
  ]},
  { q: "Name a city in Japan", a: [
    "Tokyo; Kyoto; Osaka",
    "Hiroshima; Nagasaki; Yokohama; Kobe; Nagoya; Sapporo",
    "Nara; Fukuoka; Sendai; Naha|Okinawa; Kawasaki; Nikko; Hakone; Kamakura",
    "Kanazawa; Matsuyama; Kumamoto; Kagoshima; Niigata; Shizuoka; Hamamatsu; Okayama; Takayama; Himeji; Chiba; Saitama; Kitakyushu; Sakai; Hakodate; Aomori; Nagano; Gifu; Otaru; Beppu; Kōchi|Kochi; Toyota; Matsumoto; Kurashiki; Nagoya; Ise; Wakayama; Tottori; Matsue; Sasebo; Asahikawa; Morioka; Akita; Yamagata; Fukushima; Utsunomiya; Mito; Kofu; Shirakawa-go",
  ]},
  { q: "Name a country in Asia", a: [
    "China; Japan; India; Thailand",
    "Vietnam; South Korea; North Korea; Korea; Indonesia; Philippines; Malaysia; Singapore; Pakistan; Nepal",
    "Bangladesh; Sri Lanka; Cambodia; Laos; Myanmar|Burma; Mongolia; Afghanistan; Iran; Iraq; Saudi Arabia; Taiwan; Israel; Turkey",
    "Bhutan; Brunei; Timor-Leste|East Timor; Maldives; Kazakhstan; Uzbekistan; Kyrgyzstan; Tajikistan; Turkmenistan; Oman; Yemen; Qatar; Bahrain; Kuwait; Jordan; Lebanon; Syria; United Arab Emirates|UAE; Georgia; Armenia; Azerbaijan; Palestine",
  ]},
  { q: "Name a city in Italy", a: [
    "Rome; Venice; Milan; Florence; Naples",
    "Pisa; Turin; Verona; Bologna",
    "Genoa; Palermo; Siena; Bari; Sorrento; Amalfi; Como",
    "Trieste; Padua; Perugia; Catania; Lecce; Bergamo; Parma; Modena; Ravenna; Lucca; Cagliari; Messina; Trento; Bolzano; Assisi; Matera; Syracuse|Siracusa; Taormina; Mantua; Ferrara; Urbino; Pescara; Salerno; Brindisi; Vicenza; Treviso; Rimini; Ancona; Reggio Calabria; Livorno; Pompeii; Positano; San Gimignano; Orvieto; Cremona; Pavia; Udine; Aosta; Sassari; Alghero; Taranto",
  ]},
];
