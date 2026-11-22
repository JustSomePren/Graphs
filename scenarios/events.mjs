// Události: hráč odhaduje, jak událost ovlivní konkrétní akcie.
// date = poslední zavření burzy před reakcí trhu. situation = jen to, co bylo v tu chvíli známo.
// timeline = události kolem; ty po datu rozhodnutí se zobrazí až po vyhodnocení.

export const CATEGORIES = {
  ceo: 'Změna vedení',
  geo: 'Geopolitika',
  crash: 'Propad trhu',
  health: 'Zdraví a pandemie',
  regulation: 'Regulace a skandály',
  politics: 'Politika',
  finance: 'Finanční krize',
}

export const events = [
  {
    id: 'ukrajina-2022',
    category: 'geo',
    title: 'Ruská invaze na Ukrajinu',
    date: '2022-02-23',
    situation:
      'Je ráno 24. února 2022. Rusko v noci zahájilo vojenskou invazi na Ukrajinu. Ropa Brent se poprvé od roku 2014 dostala nad 100 USD za barel. ' +
      'Západ ohlašuje sankce. Fed se chystá v březnu poprvé od roku 2018 zvýšit sazby, inflace v USA je 7,5 %.',
    tickers: ['XOM', 'LMT', 'DAL', 'MCD', 'CAT'],
    horizons: ['týden', 'měsíc', '6 měsíců', 'rok'],
    timeline: [
      { date: '2021-11-10', label: 'Inflace v USA přes 6 %' },
      { date: '2022-02-21', label: 'Rusko uznává separatistické oblasti' },
      { date: '2022-02-24', label: 'Invaze na Ukrajinu' },
      { date: '2022-03-08', label: 'USA zakazují dovoz ruské ropy' },
      { date: '2022-03-16', label: 'Fed zvyšuje sazby poprvé od 2018' },
      { date: '2022-06-15', label: 'Fed zvyšuje sazby o 0,75 p.b.' },
    ],
    articles: [
      { title: 'Ropa a plyn', body: 'Rusko je jeden z největších vývozců ropy a zemního plynu. Evropa z Ruska dováží zhruba 40 % plynu.' },
      { title: 'Trh před invazí', body: 'S&P 500 je od lednového maxima zhruba o 12 % níž, Nasdaq o víc než 15 %. Trh čeká sérii zvyšování sazeb Fedem.' },
    ],
    outcome: {
      summary:
        'S&P 500 24. února nejdřív klesl o víc než 2 %, ale den uzavřel v plusu 1,5 %. Ropa v březnu vystoupala nejvýš za 14 let. ' +
        'Energetické a zbrojařské firmy v následujících měsících rostly, letecké společnosti trpěly drahým palivem. Rok 2022 byl pro akcie celkově slabý kvůli rychlému zvyšování sazeb.',
      points: ['McDonald’s 8. 3. pozastavil restaurace v Rusku a v květnu z Ruska odešel.', 'Fed zvýšil sazby během roku 2022 z nuly na 4,25–4,5 %.'],
    },
  },
  {
    id: 'covid-2020',
    category: 'health',
    title: 'Koronavirus se šíří mimo Čínu',
    date: '2020-02-21',
    situation:
      'Je víkend 22.–23. února 2020. V Itálii a Jižní Koreji prudce rostou počty nakažených novým koronavirem, Itálie uzavírá několik obcí na severu země. ' +
      'S&P 500 byl ve středu 19. února na historickém maximu. Nezaměstnanost v USA je 3,5 %, nejníž od roku 1969.',
    tickers: ['CCL', 'DAL', 'MAR', 'AMZN', 'XOM', 'NFLX'],
    horizons: ['měsíc', '3 měsíce', 'rok'],
    timeline: [
      { date: '2020-01-23', label: 'Čína uzavírá Wu-chan' },
      { date: '2020-01-30', label: 'WHO vyhlašuje mezinárodní ohrožení' },
      { date: '2020-02-19', label: 'S&P 500 na historickém maximu' },
      { date: '2020-03-11', label: 'WHO vyhlašuje pandemii' },
      { date: '2020-03-15', label: 'Fed snižuje sazby na nulu' },
      { date: '2020-03-23', label: 'S&P 500 na dně (−34 % od maxima)' },
      { date: '2020-03-27', label: 'Balík pomoci CARES Act' },
      { date: '2020-11-09', label: 'Pfizer: vakcína účinná' },
    ],
    articles: [
      { title: 'Čína', body: 'Čína v lednu uzavřela Wu-chan a další města. Apple 17. 2. oznámil, že kvůli výpadkům výroby v Číně nesplní výhled tržeb.' },
      { title: 'Trh', body: 'S&P 500 za posledních 12 měsíců vzrostl zhruba o 20 %, Fed v roce 2019 třikrát snížil sazby.' },
    ],
    outcome: {
      summary:
        'Od 24. února trh prudce padal: S&P 500 ztratil do 23. března 34 %, nejrychlejší propad v historii. Fed snížil sazby na nulu, vláda schválila obří pomoc. ' +
        'Pak přišel stejně rychlý odraz a v srpnu 2020 byl index na novém maximu. Cestovní ruch a výletní lodě se propadly, firmy jako Amazon nebo Netflix z lockdownů profitovaly.',
      points: ['Ropa WTI v dubnu 2020 krátce obchodovala za zápornou cenu.', 'Výletní lodě v USA nesměly plout více než rok.'],
    },
  },
  {
    id: 'vakcina-2020',
    category: 'health',
    title: 'Pfizer oznamuje účinnou vakcínu',
    date: '2020-11-06',
    situation:
      'Je pondělí 9. listopadu 2020 ráno. Pfizer a BioNTech oznámily, že jejich vakcína proti covidu-19 je podle průběžných výsledků velké studie účinná z více než 90 %. ' +
      'Žádost o nouzové schválení chtějí podat koncem listopadu. Týden předtím proběhly prezidentské volby v USA.',
    tickers: ['PFE', 'CCL', 'DAL', 'NFLX', 'AMZN', 'MAR'],
    horizons: ['týden', 'měsíc', '6 měsíců'],
    timeline: [
      { date: '2020-03-11', label: 'WHO vyhlašuje pandemii' },
      { date: '2020-11-03', label: 'Prezidentské volby v USA' },
      { date: '2020-11-09', label: 'Pfizer: vakcína účinná z 90 %' },
      { date: '2020-11-16', label: 'Moderna: vakcína účinná z 94,5 %' },
      { date: '2020-12-11', label: 'FDA schvaluje vakcínu Pfizer' },
      { date: '2020-12-14', label: 'Začíná očkování v USA' },
    ],
    articles: [
      { title: 'Pandemie', body: 'Počty nakažených v USA a Evropě rostou, některé evropské země znovu zavádějí lockdowny.' },
      { title: 'Akcie v roce 2020', body: 'Firmy těžící z práce z domova (Zoom, Netflix, Amazon) výrazně rostly, cestovní ruch a energetika zůstávají hluboko pod úrovní z února.' },
    ],
    outcome: {
      summary:
        '9. listopadu proběhla prudká rotace: výletní lodě a aerolinky vyletěly (Carnival +39 % za den), firmy „ze zůstaň doma“ klesly (Zoom −17 %). ' +
        'Pfizer +8 %. V dalších měsících očkování postupovalo a cestovní akcie dál rostly, i když k úrovni před pandemií se vracely pomalu.',
      points: ['Moderna o týden později ohlásila podobně účinnou vakcínu.', 'Pfizer na vakcíně v roce 2021 utržil přes 36 mld. USD.'],
    },
  },
  {
    id: 'svb-2023',
    category: 'finance',
    title: 'Problémy Silicon Valley Bank',
    date: '2023-03-09',
    situation:
      'Je večer 9. března 2023. SVB Financial (banka startupů) včera oznámila prodej dluhopisů se ztrátou 1,8 mld. USD a plán navýšit kapitál o 2,25 mld. USD. ' +
      'Akcie dnes klesla o 60 %. Podle médií klienti vybírají vklady. Fed od března 2022 zvýšil sazby z nuly na 4,5–4,75 %.',
    tickers: ['JPM', 'SCHW', 'BAC', 'WFC'],
    horizons: ['týden', 'měsíc', '6 měsíců'],
    timeline: [
      { date: '2022-03-16', label: 'Fed začíná zvyšovat sazby' },
      { date: '2023-03-08', label: 'SVB ohlašuje ztrátu a navýšení kapitálu' },
      { date: '2023-03-10', label: 'Regulátoři uzavírají SVB' },
      { date: '2023-03-12', label: 'Uzavřena Signature Bank, Fed spouští program BTFP' },
      { date: '2023-03-19', label: 'UBS přebírá Credit Suisse' },
      { date: '2023-05-01', label: 'JPMorgan přebírá First Republic' },
    ],
    articles: [
      { title: 'Proč dluhopisy ztrácí', body: 'Když sazby rostou, cena dříve koupených dluhopisů s nízkým úrokem klesá. Banky mají takových dluhopisů v rozvahách mnoho.' },
      { title: 'Vklady', body: 'Vklady jsou v USA pojištěné do 250 tisíc USD. U bank s klienty z řad firem je velká část vkladů nad tímto limitem.' },
    ],
    outcome: {
      summary:
        'SVB byla 10. března uzavřena, o dva dny později i Signature Bank. Vláda garantovala všechny vklady obou bank a Fed spustil úvěrový program pro banky. ' +
        'Regionální banky se propadly, velké banky se po prvním poklesu staly „bezpečným přístavem“ a JPMorgan v květnu převzal First Republic.',
      points: ['Charles Schwab čelil obavám kvůli dluhopisům v rozvaze, ale vklady stabilizoval.', 'Index regionálních bank do května ztratil zhruba třetinu.'],
    },
  },
  {
    id: 'sbux-niccol-2024',
    category: 'ceo',
    title: 'Starbucks mění CEO, přichází šéf Chipotle',
    date: '2024-08-12',
    situation:
      'Je ráno 13. srpna 2024 před otevřením burzy. Starbucks oznámil, že novým CEO bude Brian Niccol, který od roku 2018 vedl Chipotle Mexican Grill. ' +
      'Dosavadní CEO Laxman Narasimhan končí po necelých 18 měsících. Tržby Starbucksu ve srovnatelných kavárnách dva kvartály po sobě klesaly. Do firmy vstoupili aktivističtí investoři Elliott a Starboard.',
    tickers: ['SBUX', 'CMG'],
    horizons: ['týden', '3 měsíce', 'rok'],
    timeline: [
      { date: '2018-02-13', label: 'Niccol se stává CEO Chipotle' },
      { date: '2023-03-20', label: 'Narasimhan CEO Starbucksu' },
      { date: '2024-07-30', label: 'Starbucks: srovnatelné tržby −3 %' },
      { date: '2024-08-13', label: 'Oznámen nový CEO' },
      { date: '2024-09-09', label: 'Niccol nastupuje' },
    ],
    articles: [
      { title: 'Chipotle pod Niccolem', body: 'Za vedení Niccola tržby Chipotle zhruba zdvojnásobily a akcie vzrostla několikanásobně. Chipotle zatím nástupce neoznámil.' },
      { title: 'Starbucks', body: 'Firma v posledních kvartálech hlásí pokles návštěvnosti v USA a slabší prodeje v Číně.' },
    ],
    outcome: {
      summary:
        'Starbucks 13. srpna vyskočil o 24 %, nejvíc v historii, Chipotle ve stejný den klesl o 7,5 %. Niccol nastoupil v září a ohlásil plán „Back to Starbucks“. ' +
        'Obrat tržeb ale trval déle, než trh v srpnu doufal.',
      points: ['Niccol dostal balík odměn v hodnotě přes 100 mil. USD.', 'Chipotle povýšilo dosavadního provozního ředitele na CEO.'],
    },
  },
  {
    id: 'dis-iger-2022',
    category: 'ceo',
    title: 'Bob Iger se vrací do čela Disney',
    date: '2022-11-18',
    situation:
      'Je neděle 20. listopadu 2022 večer. Disney oznámil, že s okamžitou platností končí CEO Bob Chapek a do čela se na dva roky vrací Bob Iger, který firmu vedl v letech 2005–2020. ' +
      'Před dvěma týdny Disney vykázal výsledky pod očekáváním a ztrátu streamovací divize 1,5 mld. USD za kvartál.',
    tickers: ['DIS'],
    horizons: ['měsíc', '6 měsíců', 'rok'],
    timeline: [
      { date: '2020-02-25', label: 'Chapek nahrazuje Igera' },
      { date: '2022-11-08', label: 'Výsledky Q4 FY2022, akcie −13 %' },
      { date: '2022-11-20', label: 'Iger se vrací' },
      { date: '2023-02-08', label: 'Iger ohlašuje 7 000 propuštěných a úspory 5,5 mld. USD' },
      { date: '2023-03-27', label: 'Začíná propouštění' },
    ],
    articles: [
      { title: 'Streaming', body: 'Disney+ má přes 160 mil. předplatitelů, ale divize je ve ztrátě. Firma slíbila ziskovost streamingu do roku 2024.' },
      { title: 'Iger', body: 'Za Igerova vedení Disney koupil Pixar, Marvel, Lucasfilm a většinu 21st Century Fox.' },
    ],
    outcome: {
      summary:
        'Akcie Disney 21. listopadu vzrostla o 6 %. Iger v únoru ohlásil reorganizaci, propouštění 7 000 lidí a úspory. ' +
        'Akcie se v dalším roce pohybovala zhruba mezi 80 a 120 USD a na konci roku 2023 byla přibližně na úrovni z doby návratu.',
      points: ['Aktivistický investor Nelson Peltz po únorových oznámeních ustoupil od boje o křeslo ve správní radě.'],
    },
  },
  {
    id: 'msft-ballmer-2013',
    category: 'ceo',
    title: 'Steve Ballmer oznamuje odchod z Microsoftu',
    date: '2013-08-22',
    situation:
      'Je ráno 23. srpna 2013 před otevřením burzy. Microsoft oznámil, že CEO Steve Ballmer do 12 měsíců odejde, jakmile bude vybrán nástupce. Ballmer firmu vede od roku 2000. ' +
      'Akcie je výrazně pod maximem z roku 1999. Microsoft v červenci odepsal 900 mil. USD na tablety Surface RT a trh PC meziročně klesá.',
    tickers: ['MSFT'],
    horizons: ['měsíc', 'rok', '5 let'],
    timeline: [
      { date: '2000-01-13', label: 'Ballmer se stává CEO' },
      { date: '2013-07-18', label: 'Odpis Surface RT 900 mil. USD' },
      { date: '2013-08-23', label: 'Ballmer oznamuje odchod' },
      { date: '2013-09-03', label: 'Microsoft kupuje mobilní divizi Nokie' },
      { date: '2014-02-04', label: 'Satya Nadella novým CEO' },
      { date: '2014-03-27', label: 'Office pro iPad' },
    ],
    articles: [
      { title: 'Byznys', body: 'Hlavní zdroje zisku jsou Windows a Office. Cloud Azure je zatím malý. V mobilech má Windows Phone jednotky procent trhu.' },
      { title: 'Valuace', body: 'Microsoft vyplácí rostoucí dividendu a drží přes 70 mld. USD v hotovosti a investicích.' },
    ],
    outcome: {
      summary:
        'Akcie 23. srpna vzrostla o 7 %. Novým CEO se v únoru 2014 stal Satya Nadella, který firmu přeorientoval na cloud (Azure, Office 365). ' +
        'Během následujících pěti let akcie zhruba trojnásobila hodnotu a Microsoft se v roce 2018 znovu stal nejcennější firmou světa.',
      points: ['Akvizice mobilní divize Nokie (7,2 mld. USD) byla v roce 2015 z velké části odepsána.'],
    },
  },
  {
    id: 'aapl-jobs-2011',
    category: 'ceo',
    title: 'Steve Jobs odstupuje z čela Applu',
    date: '2011-08-24',
    situation:
      'Je večer 24. srpna 2011. Steve Jobs po zavření burzy oznámil, že odstupuje z funkce CEO Applu, ze zdravotních důvodů. Novým CEO je Tim Cook, dosavadní provozní ředitel. ' +
      'Jobs zůstává předsedou správní rady. Apple je od tohoto měsíce chvílemi nejcennější firmou v USA.',
    tickers: ['AAPL'],
    horizons: ['měsíc', 'rok', '5 let'],
    timeline: [
      { date: '2010-04-03', label: 'Začíná prodej iPadu' },
      { date: '2011-01-17', label: 'Jobs na zdravotní dovolené' },
      { date: '2011-08-24', label: 'Jobs odstupuje, CEO Tim Cook' },
      { date: '2011-10-05', label: 'Steve Jobs umírá' },
      { date: '2011-10-14', label: 'Začíná prodej iPhonu 4S se Siri' },
      { date: '2012-09-21', label: 'iPhone 5' },
    ],
    articles: [
      { title: 'Byznys', body: 'Apple vykázal za poslední kvartál tržby 28,6 mld. USD (+82 % r/r). iPhone tvoří zhruba polovinu tržeb, iPad roste rychle.' },
      { title: 'Tim Cook', body: 'Cook řídí provoz a dodavatelský řetězec od roku 1998 a během Jobsových dovolených firmu už dvakrát vedl.' },
    ],
    outcome: {
      summary:
        'Druhý den akcie klesla jen o necelé 1 %. V roce 2012 Apple rostl dál (iPhone 5) a v září 2012 dosáhl maxima, pak přišel výrazný pokles. ' +
        'Za pět let pod Cookem tržby i zisk výrazně vzrostly a akcie zhruba dvojnásobila hodnotu.',
      points: ['Apple v roce 2012 obnovil výplatu dividendy a začal zpětné odkupy.'],
    },
  },
  {
    id: 'nke-hill-2024',
    category: 'ceo',
    title: 'Nike vrací do čela Elliotta Hilla',
    date: '2024-09-19',
    situation:
      'Je večer 19. září 2024. Nike po zavření burzy oznámil, že CEO John Donahoe 13. října odchází a novým CEO bude Elliott Hill, který ve firmě pracoval 32 let a v roce 2020 odešel do penze. ' +
      'Akcie je zhruba o 50 % pod maximem z roku 2021. Firma v červnu snížila výhled tržeb, konkurence (On, Hoka) bere podíl.',
    tickers: ['NKE'],
    horizons: ['měsíc', '6 měsíců', 'rok'],
    timeline: [
      { date: '2020-01-13', label: 'Donahoe se stává CEO' },
      { date: '2024-06-27', label: 'Snížený výhled, akcie −20 %' },
      { date: '2024-09-19', label: 'Oznámen návrat Elliotta Hilla' },
      { date: '2024-10-01', label: 'Nike ruší celoroční výhled' },
      { date: '2024-10-14', label: 'Hill nastupuje' },
    ],
    articles: [
      { title: 'Strategie posledních let', body: 'Za Donahoea se Nike soustředil na přímý prodej zákazníkům a omezil spolupráci s řadou obchodníků.' },
      { title: 'Konkurence', body: 'Menší značky běžecké obuvi (On, Hoka, New Balance) v posledních letech rychle rostou.' },
    ],
    outcome: {
      summary:
        'Akcie Nike 20. září vzrostla o 7 %. O dva týdny později firma zrušila celoroční výhled a Hill ohlásil, že obrat bude trvat. ' +
        'V následujících měsících akcie klesla pod úroveň z doby oznámení.',
      points: ['Hill obnovil spolupráci s obchodníky a více se zaměřil na sport a běh.'],
    },
  },
  {
    id: 'intc-gelsinger-2024',
    category: 'ceo',
    title: 'Pat Gelsinger odchází z Intelu',
    date: '2024-11-29',
    situation:
      'Je ráno 2. prosince 2024 před otevřením burzy. Intel oznámil, že CEO Pat Gelsinger s účinností od 1. prosince odešel do penze. Firmu dočasně povedou finanční ředitel David Zinsner a Michelle Johnston Holthaus. ' +
      'Gelsinger od roku 2021 investoval desítky miliard do nových továren. Akcie je od jeho nástupu zhruba o 60 % níž.',
    tickers: ['INTC'],
    horizons: ['týden', 'měsíc', '6 měsíců'],
    timeline: [
      { date: '2021-02-15', label: 'Gelsinger se stává CEO' },
      { date: '2024-08-01', label: 'Pozastavení dividendy, akcie −26 %' },
      { date: '2024-11-08', label: 'Intel vyřazen z indexu Dow Jones' },
      { date: '2024-12-02', label: 'Odchod Gelsingera' },
      { date: '2025-03-12', label: 'Novým CEO Lip-Bu Tan' },
    ],
    articles: [
      { title: 'Situace Intelu', body: 'Intel v roce 2024 propouští přes 15 % zaměstnanců a hledá partnery pro výrobní divizi Foundry. Z CHIPS Act má přislíbeno až 7,9 mld. USD.' },
    ],
    outcome: {
      summary:
        'Akcie 2. prosince nejdřív vzrostla o 6 %, ale den zakončila mírně v minusu. Další týdny přinesly spíše pokles. ' +
        'Novým CEO se v březnu 2025 stal Lip-Bu Tan a akcie na jeho jmenování reagovala růstem.',
      points: ['Trh řešil, zda nové vedení výrobní divizi oddělí nebo prodá.'],
    },
  },
  {
    id: 'ba-calhoun-2024',
    category: 'ceo',
    title: 'Šéf Boeingu oznamuje odchod',
    date: '2024-03-22',
    situation:
      'Je ráno 25. března 2024 před otevřením burzy. CEO Boeingu Dave Calhoun oznámil, že na konci roku 2024 odejde. Končí i předseda správní rady a šéf divize civilních letadel. ' +
      'Boeing od lednového incidentu letu Alaska 1282 čelí vyšetřování a FAA omezila výrobu letadel 737 MAX.',
    tickers: ['BA'],
    horizons: ['měsíc', '6 měsíců'],
    timeline: [
      { date: '2024-01-05', label: 'Incident Alaska 1282' },
      { date: '2024-01-24', label: 'FAA omezuje výrobu 737 MAX' },
      { date: '2024-03-25', label: 'Calhoun oznamuje odchod' },
      { date: '2024-07-31', label: 'Novým CEO Kelly Ortberg' },
      { date: '2024-09-13', label: 'Stávka 33 000 dělníků' },
    ],
    articles: [{ title: 'Cash flow', body: 'Boeing varoval, že v prvním čtvrtletí 2024 spálí 4–4,5 mld. USD hotovosti kvůli zpomalení výroby.' }],
    outcome: {
      summary:
        'Akcie v den oznámení mírně vzrostla. V dalších měsících pokračovaly problémy s výrobou, v září začala dlouhá stávka a Boeing v říjnu ohlásil propouštění 10 % zaměstnanců a navýšení kapitálu.',
      points: ['Novým CEO se v srpnu 2024 stal Kelly Ortberg.'],
    },
  },
  {
    id: 'yen-2024',
    category: 'crash',
    title: 'Výprodej trhů v srpnu 2024',
    date: '2024-08-02',
    situation:
      'Je pondělí 5. srpna 2024 ráno. Páteční zpráva o zaměstnanosti v USA (+114 tis. míst, nezaměstnanost 4,3 %) aktivovala tzv. Sahmovo pravidlo, které historicky provázelo recese. ' +
      'Bank of Japan 31. července zvýšila sazby a jen prudce posiluje. Japonský index Nikkei dnes padá o více než 12 %.',
    tickers: ['NVDA', 'AAPL', 'CAT', 'JPM'],
    horizons: ['týden', 'měsíc', '3 měsíce'],
    timeline: [
      { date: '2024-07-10', label: 'S&P 500 na maximu' },
      { date: '2024-07-31', label: 'Bank of Japan zvyšuje sazby' },
      { date: '2024-08-02', label: 'Zpráva o zaměstnanosti: +114 tis. míst' },
      { date: '2024-08-05', label: 'Nikkei −12 %, index VIX přes 60' },
      { date: '2024-09-18', label: 'Fed snižuje sazby o 0,5 p.b.' },
    ],
    articles: [
      { title: 'Carry trade', body: 'Investoři si půjčovali v jenu s nízkým úrokem a investovali do aktiv s vyšším výnosem. Když jen posiluje, takové pozice se zavírají.' },
      { title: 'Fed', body: 'Fed drží sazby na 5,25–5,5 %. Trh čeká první snížení v září.' },
    ],
    outcome: {
      summary:
        'S&P 500 5. srpna klesl o 3 %, index strachu VIX krátce vyskočil nad 60. Během dvou týdnů ale trh smazal téměř celý pokles. ' +
        'Fed v září snížil sazby o 0,5 p.b. a S&P 500 do konce roku dosáhl nových maxim.',
      points: ['Nikkei 6. srpna vzrostl o více než 10 %.'],
    },
  },
  {
    id: 'cina-2015',
    category: 'crash',
    title: 'Černé pondělí v srpnu 2015',
    date: '2015-08-21',
    situation:
      'Je víkend 22.–23. srpna 2015. Čína 11. srpna nečekaně oslabila jüan, obavy ze zpomalení čínské ekonomiky rostou. S&P 500 za poslední týden ztratil 5,8 %, nejvíc od roku 2011. ' +
      'Čínské akcie od června ztratily přes třetinu. Fed zvažuje první zvýšení sazeb od roku 2006.',
    tickers: ['AAPL', 'CAT', 'AMZN', 'CVX'],
    horizons: ['týden', '6 měsíců', 'rok'],
    timeline: [
      { date: '2015-06-12', label: 'Čínské akcie na maximu' },
      { date: '2015-08-11', label: 'Čína oslabuje jüan' },
      { date: '2015-08-24', label: 'Dow Jones při otevření −1 000 bodů' },
      { date: '2015-12-16', label: 'Fed zvyšuje sazby poprvé od 2006' },
      { date: '2016-02-11', label: 'Dno trhu a ropy' },
    ],
    articles: [{ title: 'Komodity', body: 'Ropa se obchoduje kolem 40 USD za barel, ceny kovů klesají kvůli slabší poptávce z Číny.' }],
    outcome: {
      summary:
        'Dow Jones 24. srpna při otevření ztratil přes 1 000 bodů a obchodování řady akcií se přerušovalo. Trh se během září částečně odrazil, ' +
        'ale do února 2016 přišel další pokles spolu s ropou. Poté začal dlouhý růst.',
      points: ['Caterpillar a energetické firmy trpěly propadem komodit až do začátku roku 2016.'],
    },
  },
  {
    id: 'volmageddon-2018',
    category: 'crash',
    title: 'Únorový propad 2018',
    date: '2018-02-02',
    situation:
      'Je víkend 3.–4. února 2018. Páteční zpráva o zaměstnanosti ukázala nejrychlejší růst mezd od roku 2009 (+2,9 % r/r). Výnos 10letého dluhopisu vystoupal na 2,85 %, ' +
      'nejvýš od roku 2014. S&P 500 v pátek klesl o 2,1 %, předtím byl několik let v klidném růstu (rok 2017 +19 %).',
    tickers: ['AAPL', 'AMZN', 'JPM', 'CAT'],
    horizons: ['týden', 'měsíc', 'rok'],
    timeline: [
      { date: '2017-12-22', label: 'Daňová reforma v USA' },
      { date: '2018-01-26', label: 'S&P 500 na maximu' },
      { date: '2018-02-05', label: 'Dow Jones −1 175 bodů' },
      { date: '2018-03-22', label: 'Cla na čínské zboží' },
      { date: '2018-12-24', label: 'Dno prosincového výprodeje' },
    ],
    articles: [{ title: 'Volatilita', body: 'Index VIX byl v roce 2017 na historických minimech. Některé fondy sázely na to, že volatilita zůstane nízká.' }],
    outcome: {
      summary:
        'V pondělí 5. února Dow Jones ztratil 1 175 bodů, největší bodový pokles v historii, a fondy sázející na nízkou volatilitu se zhroutily. ' +
        'Trh se během jara a léta zotavil a v září byl na novém maximu. Na konci roku 2018 ale přišel další prudký výprodej.',
      points: ['Index VIX 5. února více než zdvojnásobil hodnotu.'],
    },
  },
  {
    id: 'volby-2016',
    category: 'politics',
    title: 'Donald Trump vyhrává volby 2016',
    date: '2016-11-08',
    situation:
      'Je noc z 8. na 9. listopadu 2016. Donald Trump nečekaně vyhrál prezidentské volby, průzkumy favorizovaly Hillary Clintonovou. ' +
      'Futures na S&P 500 v noci padaly až o 5 %. Republikáni drží obě komory Kongresu. Trump sliboval snížení daní, deregulaci bank a investice do infrastruktury.',
    tickers: ['JPM', 'CAT', 'LMT', 'AMZN', 'PFE'],
    horizons: ['týden', 'měsíc', 'rok'],
    timeline: [
      { date: '2016-06-23', label: 'Referendum o brexitu' },
      { date: '2016-11-08', label: 'Prezidentské volby v USA' },
      { date: '2016-12-14', label: 'Fed zvyšuje sazby' },
      { date: '2017-01-20', label: 'Inaugurace' },
      { date: '2017-12-22', label: 'Daňová reforma podepsána' },
    ],
    articles: [{ title: 'Sliby', body: 'Snížení firemní daně z 35 %, zmírnění bankovní regulace, cla na dovoz z Číny a Mexika, investice do infrastruktury.' }],
    outcome: {
      summary:
        'Noční propad futures se do rána vrátil a 9. listopadu akcie rostly. Následovala tzv. „Trump rally“: banky a průmyslové firmy prudce rostly, ' +
        'S&P 500 v roce 2017 přidal 19 % a firemní daň se snížila na 21 %.',
      points: ['Akcie bank během listopadu 2016 vzrostly zhruba o 20 %.', 'Farmaceutické firmy rostly s tím, že hrozba regulace cen léků slábne.'],
    },
  },
  {
    id: 'ba-etiopie-2019',
    category: 'regulation',
    title: 'Druhá havárie Boeingu 737 MAX',
    date: '2019-03-08',
    situation:
      'Je neděle 10. března 2019. Letadlo Ethiopian Airlines (Boeing 737 MAX 8) havarovalo krátce po startu z Addis Abeby, zahynulo všech 157 lidí na palubě. ' +
      'Je to druhá nehoda tohoto typu za pět měsíců – v říjnu 2018 havaroval 737 MAX indonéské Lion Air. Čína zvažuje uzemnění svých letadel 737 MAX.',
    tickers: ['BA'],
    horizons: ['týden', '3 měsíce', 'rok'],
    timeline: [
      { date: '2018-10-29', label: 'Havárie Lion Air 610' },
      { date: '2019-03-10', label: 'Havárie Ethiopian 302' },
      { date: '2019-03-13', label: 'USA uzemňují 737 MAX' },
      { date: '2019-12-23', label: 'Odvolán CEO Dennis Muilenburg' },
      { date: '2020-11-18', label: 'FAA ruší uzemnění' },
    ],
    articles: [{ title: '737 MAX', body: '737 MAX je nejprodávanější letadlo Boeingu s více než 4 500 objednávkami. Aerolinky jich provozují necelých 400.' }],
    outcome: {
      summary:
        'Boeing 11. března klesl o 5 %, další den o 6 %. Během pár dní světové úřady i USA letadla uzemnily. Zákaz letů trval přes 20 měsíců, ' +
        'stál Boeing desítky miliard a v prosinci 2019 skončil CEO. Akcie se pak v roce 2020 zhroutila i kvůli pandemii.',
      points: ['Vyšetřování ukázalo chyby v systému MCAS.'],
    },
  },
  {
    id: 'fb-cambridge-2018',
    category: 'regulation',
    title: 'Skandál Cambridge Analytica',
    date: '2018-03-16',
    situation:
      'Je víkend 17.–18. března 2018. New York Times a Guardian zveřejnily, že firma Cambridge Analytica získala data až 50 mil. uživatelů Facebooku bez jejich souhlasu ' +
      'a využívala je v politických kampaních. Politici v USA a Británii žádají vysvětlení.',
    tickers: ['META'],
    horizons: ['týden', '3 měsíce', 'rok'],
    timeline: [
      { date: '2018-03-17', label: 'Zveřejnění kauzy' },
      { date: '2018-04-10', label: 'Zuckerberg vypovídá v Kongresu' },
      { date: '2018-04-25', label: 'Silné výsledky Q1' },
      { date: '2018-07-25', label: 'Výsledky Q2: zpomalení, akcie −19 %' },
      { date: '2019-07-24', label: 'Pokuta FTC 5 mld. USD' },
    ],
    articles: [{ title: 'Facebook', body: 'Facebook má přes 2 mld. měsíčních uživatelů, tržby v roce 2017 rostly o 47 %.' }],
    outcome: {
      summary:
        'Akcie 19. března klesla o 7 % a během deseti dní ztratila skoro pětinu. Silné výsledky v dubnu ji vrátily nahoru a v červenci byla na maximu. ' +
        'Pak ale výsledky Q2 ukázaly zpomalení a akcie spadla o 19 % za den.',
      points: ['Facebook nakonec zaplatil pokutu FTC 5 mld. USD.'],
    },
  },
  {
    id: 'izrael-2023',
    category: 'geo',
    title: 'Útok Hamásu na Izrael',
    date: '2023-10-06',
    situation:
      'Je víkend 7.–8. října 2023. Hnutí Hamás zaútočilo z Pásma Gazy na Izrael, zahynuly stovky lidí. Izrael vyhlásil válečný stav. ' +
      'Trhy řeší, zda se konflikt rozšíří na další země v regionu. Výnos 10letého dluhopisu USA je kolem 4,8 %, nejvýš od roku 2007.',
    tickers: ['LMT', 'CVX', 'DAL', 'RTX'],
    horizons: ['týden', 'měsíc', '6 měsíců'],
    timeline: [
      { date: '2023-10-07', label: 'Útok Hamásu' },
      { date: '2023-10-19', label: 'Výnos 10letého dluhopisu 5 %' },
      { date: '2023-10-27', label: 'Pozemní operace v Gaze' },
      { date: '2023-11-14', label: 'Inflace zpomaluje, trh roste' },
    ],
    articles: [{ title: 'Trh', body: 'S&P 500 je od červencového maxima zhruba o 6 % níž kvůli rostoucím výnosům dluhopisů.' }],
    outcome: {
      summary:
        'V pondělí 9. října zbrojařské firmy vyskočily (Lockheed Martin +9 %, Northrop +11 %), ropa přidala kolem 4 % a aerolinky klesly. ' +
        'Konflikt se na ropný trh nerozšířil tak, jak se trh bál. Od konce října akcie rostly díky klesajícím výnosům dluhopisů.',
      points: ['Ropa se do konce roku vrátila pod úroveň z doby před útokem.'],
    },
  },
]
