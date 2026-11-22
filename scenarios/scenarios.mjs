// Texty scénářů. Čísla (P/E, tržby, EPS, ceny) dopočítává scripts/build-data.mjs ze SEC EDGAR a cen.

export const scenarios = [
  {
    id: 'nvda-2023-05',
    ticker: 'NVDA',
    name: 'NVIDIA',
    title: 'NVIDIA před AI earnings',
    horizon: 'měsíc',
    peers: ['AMD', 'INTC'],
    historyStart: '2021-11-01',
    decisionDate: '2023-05-24',
    endDate: '2023-06-30',
    situation:
      'Je 24. května 2023 odpoledne. NVIDIA dnes po zavření burzy zveřejní výsledky za Q1 fiskálního roku 2024. ' +
      'Od říjnového dna 2022 akcie vyrostla téměř trojnásobně – trh sází na to, že na jejích čipech poběží celý boom generativní AI. ' +
      'Klasické tržby ale pořád klesají meziročně (herní segment po kryptu a covidu).',
    events: [
      { date: '2022-03-22', label: 'GTC: představen čip H100' },
      { date: '2022-08-31', label: 'USA omezují export A100/H100 do Číny' },
      { date: '2022-11-30', label: 'Spuštěn ChatGPT' },
      { date: '2023-01-23', label: 'Microsoft investuje do OpenAI' },
      { date: '2023-03-21', label: 'GTC 2023: „iPhone moment AI“' },
    ],
    articles: [
      {
        title: 'Výsledky Q3 FY2023 (16. 11. 2022)',
        body:
          'Tržby 5,93 mld. USD, meziročně −17 %. Herní segment −51 % – kanály jsou přeplněné grafikami po konci kryptotěžby. ' +
          'Data center roste (+31 %), ale vedení přiznává dopad exportních omezení do Číny. Firma odepisuje zásoby.',
      },
      {
        title: 'Výsledky Q4 FY2023 (22. 2. 2023)',
        body:
          'Tržby 6,05 mld. USD (−21 % meziročně), data center 3,62 mld. (+11 %), gaming 1,83 mld. (−46 %). ' +
          'Výhled na Q1: 6,5 mld. USD ±2 %. Jensen Huang: „AI je v bodě zlomu“. Firma ohlašuje DGX Cloud – pronájem AI superpočítačů přes cloudy. Akcie den po výsledcích +14 %.',
      },
      {
        title: 'Co trh čeká',
        body:
          'Podle médií analytici čekají tržby za Q1 kolem 6,5 mld. USD (v souladu s výhledem) a výhled na Q2 kolem 7,1–7,2 mld. USD. ' +
          'Klíčová otázka: promítne se poptávka po H100 od Microsoftu, Googlu, Amazonu a Mety už do výhledu, nebo je to zatím jen příběh?',
      },
      {
        title: 'Konkurence',
        body:
          'AMD chystá akcelerátor MI300 (představen na CES v lednu 2023, ostrý start až koncem roku). Intel má Gaudi. ' +
          'Hyperscaleři vyvíjí vlastní čipy (Google TPU, AWS Trainium/Inferentia). Výhodou NVIDIE je softwarový ekosystém CUDA.',
      },
    ],
    outcome: {
      summary:
        'Výhled zničil očekávání: na Q2 NVIDIA čekala tržby ~11 mld. USD místo ~7,2 mld., které čekal trh. ' +
        'Akcie den poté +24 % a 30. května se firma poprvé dotkla tržní kapitalizace 1 bilionu USD.',
      points: [
        'Q1 tržby 7,19 mld. USD, data center rekordních 4,28 mld.',
        'Výhled Q2 11,0 mld. ±2 % – o ~50 % nad konsenzem.',
        'Vysoké trailing P/E klamalo: budoucí zisky rostly mnohem rychleji než cena.',
      ],
    },
  },
  {
    id: 'meta-2022-02',
    ticker: 'META',
    name: 'Meta Platforms',
    title: 'Meta a první pokles uživatelů',
    horizon: '2 měsíce',
    peers: ['GOOGL', 'SNAP', 'PINS'],
    historyStart: '2020-06-01',
    decisionDate: '2022-02-02',
    endDate: '2022-03-31',
    situation:
      'Je 2. února 2022. Meta (do října 2021 Facebook) dnes po zavření burzy zveřejní výsledky za Q4 2021. ' +
      'Firma loni oznámila, že vsadí budoucnost na metaverse, a Apple svou funkcí ATT (App Tracking Transparency) zkomplikoval cílení reklam.',
    events: [
      { date: '2021-04-26', label: 'iOS 14.5: Apple spouští ATT' },
      { date: '2021-09-14', label: 'WSJ: „Facebook Files“' },
      { date: '2021-10-04', label: 'Celosvětový výpadek + whistleblowerka F. Haugen' },
      { date: '2021-10-28', label: 'Přejmenování na Meta' },
    ],
    articles: [
      {
        title: 'Výsledky Q3 2021 (25. 10. 2021)',
        body:
          'Tržby 29,0 mld. USD (+35 %), ale pod očekáváním. Denně aktivní uživatelé (DAU) 1,93 mld. ' +
          'Výhled na Q4: 31,5–34 mld. USD, vedení výslovně zmiňuje dopad změn v iOS. Reality Labs (VR/metaverse) se od Q4 vykazuje zvlášť a letos sníží provozní zisk zhruba o 10 mld. USD.',
      },
      {
        title: 'Apple ATT',
        body:
          'Od iOS 14.5 musí aplikace žádat o souhlas se sledováním. Většina uživatelů odmítá. Měření účinnosti reklam se zhoršilo – malí inzerenti, kteří na Facebooku stojí, hůř vyhodnocují kampaně.',
      },
      {
        title: 'Konkurence',
        body:
          'TikTok v září 2021 oznámil 1 miliardu měsíčních uživatelů a bere pozornost hlavně mladým. Meta odpovídá formátem Reels, který se ale zatím monetizuje hůř než klasický feed.',
      },
    ],
    outcome: {
      summary:
        'Výsledky šokovaly: DAU poprvé v historii klesly (1,929 mld.), výhled na Q1 2022 byl pod očekáváním a Reality Labs prodělaly za rok 10,2 mld. USD. ' +
        'Akcie den poté −26 % – tehdy největší jednodenní ztráta tržní hodnoty v historii USA (~230 mld. USD).',
      points: [
        'Q4 tržby 33,7 mld. USD (+20 %), ale výhled Q1 jen 27–29 mld.',
        'Vedení odhadlo dopad ATT na rok 2022 na ~10 mld. USD.',
        'Pokles pokračoval do poloviny března, pak se cena částečně odrazila.',
      ],
    },
  },
  {
    id: 'meta-2023-02',
    ticker: 'META',
    name: 'Meta Platforms',
    title: 'Meta: rok efektivity?',
    horizon: '3 měsíce',
    peers: ['GOOGL', 'SNAP'],
    historyStart: '2021-09-01',
    decisionDate: '2023-02-01',
    endDate: '2023-04-28',
    situation:
      'Je 1. února 2023. Meta dnes po zavření zveřejní výsledky Q4 2022. Akcie spadla od maxima o víc než 70 %, ' +
      'na podzim investoři trestali obří výdaje na metaverse. V listopadu firma propustila 11 000 lidí. Od dna se cena už výrazně odrazila.',
    events: [
      { date: '2022-02-03', label: 'Pád −26 % po Q4 2021' },
      { date: '2022-10-24', label: 'Otevřený dopis Altimeter: „škrtejte náklady“' },
      { date: '2022-10-26', label: 'Q3 2022: výdaje ↑, akcie −24 %' },
      { date: '2022-11-09', label: 'Propuštění 11 000 zaměstnanců' },
    ],
    articles: [
      {
        title: 'Výsledky Q3 2022 (26. 10. 2022)',
        body:
          'Tržby 27,7 mld. USD (−4 %), čistý zisk −52 %. Reality Labs ztráta 3,7 mld. za kvartál. ' +
          'Vedení nastínilo náklady na rok 2023 ve výši 96–101 mld. USD a Zuckerberg trval na investicích do metaverse. Trh reagoval pádem o 24 %.',
      },
      {
        title: 'Propouštění (9. 11. 2022)',
        body:
          'Meta propouští ~13 % zaměstnanců. Zuckerberg přiznává, že přecenil trvalost covidového růstu online byznysu. První signál, že vedení slyší tlak investorů.',
      },
      {
        title: 'Konkurence a trh',
        body:
          'Celý reklamní trh zpomaluje (Snap, Google i Amazon hlásí slabší reklamy). Reels rostou, TikTok stále sílí. Zvyšující se sazby Fedu tlačí na valuace růstových firem.',
      },
    ],
    outcome: {
      summary:
        'Zuckerberg vyhlásil „rok efektivity“: snížil plán nákladů na 2023 na 89–95 mld. USD a přidal zpětný odkup akcií za 40 mld. USD. ' +
        'Tržby 32,2 mld. byly nad očekáváním. Akcie den poté +23 % a rally pokračovala.',
      points: [
        'V březnu další vlna propouštění (10 000 lidí) – trh tleskal.',
        'Q1 2023 (26. 4.) opět nad očekáváním, akcie +14 %.',
        'Lekce: u výrazně zlevněné firmy stačí změna přístupu vedení k nákladům.',
      ],
    },
  },
  {
    id: 'nflx-2022-04',
    ticker: 'NFLX',
    name: 'Netflix',
    title: 'Netflix: kam se poděli předplatitelé?',
    horizon: '2 měsíce',
    peers: ['DIS', 'CMCSA'],
    historyStart: '2020-06-01',
    decisionDate: '2022-04-19',
    endDate: '2022-06-30',
    situation:
      'Je 19. dubna 2022. Netflix dnes po zavření zveřejní výsledky Q1. Už v lednu akcie spadla o 22 % kvůli slabému výhledu přírůstků předplatitelů. ' +
      'Od té doby firma zdražila v USA a v březnu kvůli válce stáhla službu z Ruska.',
    events: [
      { date: '2022-01-20', label: 'Q4 2021: slabý výhled, akcie −22 %' },
      { date: '2022-01-14', label: 'Zdražení v USA a Kanadě' },
      { date: '2022-03-06', label: 'Netflix pozastavuje službu v Rusku' },
    ],
    articles: [
      {
        title: 'Výsledky Q4 2021 (20. 1. 2022)',
        body:
          'Přírůstek 8,3 mil. předplatitelů (celkem ~222 mil.), mírně pod výhledem. Na Q1 2022 ale vedení čeká jen 2,5 mil. nových předplatitelů (rok předtím 4 mil.). ' +
          'Vysvětluje to slabší nabídkou obsahu v první polovině roku a konkurencí.',
      },
      {
        title: 'Rusko',
        body: 'Netflix měl v Rusku necelý 1 mil. předplatitelů. Odchod z trhu znamená jednorázový úbytek v Q1.',
      },
      {
        title: 'Konkurence',
        body:
          'Disney+ roste velmi rychle (přes 129 mil. předplatitelů koncem roku 2021), HBO Max, Amazon Prime Video a Apple TV+ investují miliardy do obsahu. Po covidovém boomu se trh nasytil.',
      },
    ],
    outcome: {
      summary:
        'Netflix poprvé za více než 10 let ztratil předplatitele (−200 tis.) a na Q2 čekal úbytek dalších 2 mil. ' +
        'Přiznal, že ~100 mil. domácností sdílí hesla a že zvažuje levnější tarif s reklamami. Akcie −35 % za jediný den.',
      points: [
        'Bill Ackman (Pershing Square) okamžitě prodal celý podíl se ztrátou.',
        'Trh přecenil Netflix z „růstové“ na „zralou“ firmu.',
        'Pokles pokračoval celé jaro spolu s výprodejem technologií.',
      ],
    },
  },
  {
    id: 'aapl-2019-01',
    ticker: 'AAPL',
    name: 'Apple',
    title: 'Apple: varování z Číny',
    horizon: 'rok',
    peers: ['MSFT', 'GOOGL', 'AMZN'],
    historyStart: '2017-01-03',
    decisionDate: '2019-01-02',
    endDate: '2019-12-31',
    situation:
      'Je večer 2. ledna 2019. Tim Cook právě rozeslal akcionářům dopis: Apple snižuje výhled tržeb za vánoční kvartál z 89–93 mld. USD na ~84 mld. USD. ' +
      'Hlavní důvod: slabá Čína a obchodní válka USA–Čína. Akcie už od říjnového maxima spadla o třetinu a celý trh má za sebou nejhorší prosinec od roku 1931.',
    events: [
      { date: '2018-08-02', label: 'Apple první firmou za 1 bil. USD' },
      { date: '2018-11-01', label: 'Q4 FY18: konec reportování prodaných kusů' },
      { date: '2018-12-24', label: 'Dno výprodeje trhu' },
    ],
    articles: [
      {
        title: 'Dopis Tima Cooka (2. 1. 2019)',
        body:
          'Nový výhled ~84 mld. USD tržeb (dříve 89–93). Pokles je hlavně v Číně (iPhone, Mac, iPad), částečně i nižší počet upgradů iPhonů – lidé si nechávají telefony déle, levnější výměny baterií. ' +
          'Služby, Wearables a Mac dle Cooka rostou rekordně; hrubá marže kolem 38 %.',
      },
      {
        title: 'Výsledky Q4 FY2018 (1. 11. 2018)',
        body:
          'Tržby 62,9 mld. USD (+20 %), ale výhled na Vánoce pod očekáváním a oznámení, že firma přestane zveřejňovat počty prodaných iPhonů. Trh to četl jako signál, že prodeje kusů stagnují. Akcie −7 %.',
      },
      {
        title: 'Makro',
        body:
          'Fed v prosinci zvedl sazby počtvrté v roce, obchodní válka eskaluje, S&P 500 v Q4 −14 %. Apple se obchoduje na P/E výrazně pod průměrem trhu.',
      },
    ],
    outcome: {
      summary:
        'Den po dopisu akcie −10 %. Pak ale přišel jeden z nejlepších roků Applu: Fed se otočil k uvolňování, trh uvěřil příběhu Služeb ' +
        '(Apple TV+, Arcade, Apple Card, AirPods) a obchodní dohoda „fáze 1“ v prosinci. Za rok 2019 akcie téměř zdvojnásobila.',
      points: [
        'Q1 výsledky (29. 1.) přesně dle sníženého výhledu, Služby rekord → akcie +7 %.',
        'Hlavní tahoun: expanze P/E z ~13 na ~25, ne růst zisku.',
        'Špatná zpráva + levná valuace + panika = často nákupní příležitost.',
      ],
    },
  },
  {
    id: 'tsla-2020-11',
    ticker: 'TSLA',
    name: 'Tesla',
    title: 'Tesla jde do S&P 500',
    horizon: '6 týdnů',
    peers: ['GM', 'F'],
    historyStart: '2019-06-03',
    decisionDate: '2020-11-16',
    endDate: '2020-12-31',
    situation:
      'Je večer 16. listopadu 2020. S&P Dow Jones Indices právě oznámila, že Tesla bude zařazena do indexu S&P 500 k 21. prosinci. ' +
      'Indexové fondy budou muset nakoupit akcie za desítky miliard dolarů. V září přitom komise Teslu nezařadila a akcie tehdy spadla o 21 %.',
    events: [
      { date: '2020-01-29', label: 'Q4 2019: zisk, akcie letí' },
      { date: '2020-08-31', label: 'Split akcií 5:1' },
      { date: '2020-09-08', label: 'Nezařazení do S&P 500, −21 %' },
      { date: '2020-09-22', label: 'Battery Day' },
    ],
    articles: [
      {
        title: 'Výsledky Q3 2020 (21. 10. 2020)',
        body:
          'Pátý ziskový kvartál v řadě (podmínka pro S&P 500). Rekordní dodávky téměř 140 000 aut, tržby 8,8 mld. USD. Firma drží cíl 500 000 dodaných aut za rok 2020. ' +
          'Část zisku tvoří prodej emisních povolenek jiným automobilkám.',
      },
      {
        title: 'Zařazení do indexu',
        body:
          'Tesla bude jedna z největších firem indexu a největší nově zařazená firma v historii. Index se mění k 21. 12. – fondy sledující S&P 500 nakupují typicky v den před účinností. ' +
          'S&P zvažuje zařazení najednou nebo ve dvou tranších.',
      },
      {
        title: 'Valuace a konkurence',
        body:
          'Tesla je dražší než Toyota, VW a GM dohromady, i když prodá zlomek aut. GM a Ford ohlašují elektrické plány, VW spouští ID.3 a čínský NIO roste.',
      },
    ],
    outcome: {
      summary:
        'Akcie hned druhý den +8 % a rally pokračovala až do zařazení – 18. prosince se zobchodovalo za rekordních ~150 mld. USD. ' +
        'Za 6 týdnů cena vzrostla o víc než 70 %. „Kupuj fámu, prodej fakt“ tentokrát nepřišlo hned.',
      points: [
        'S&P rozhodlo o zařazení najednou – nákupní tlak v jeden den.',
        'Retailový trh a FOMO v roce 2020 byly extrémní.',
        'Za rok 2020 Tesla dodala 499 550 aut – těsně pod cílem.',
      ],
    },
  },
  {
    id: 'crwd-2024-07',
    ticker: 'CRWD',
    name: 'CrowdStrike',
    title: 'CrowdStrike: výpadek, který shodil svět',
    horizon: '6 týdnů',
    peers: ['PANW', 'S', 'FTNT'],
    historyStart: '2023-07-03',
    decisionDate: '2024-07-18',
    endDate: '2024-08-30',
    situation:
      'Pátek 19. července 2024, ráno před otevřením burzy. Chybná aktualizace senzoru Falcon pro Windows shodila miliony počítačů po celém světě: ' +
      'stojí letiště, banky, nemocnice i televize. Oprava vyžaduje často ruční zásah na každém PC. Graf končí včerejším zavřením.',
    events: [
      { date: '2024-06-04', label: 'Q1 FY25: tržby +33 %' },
      { date: '2024-06-24', label: 'Zařazení do S&P 500' },
    ],
    articles: [
      {
        title: 'Výsledky Q1 FY2025 (4. 6. 2024)',
        body:
          'Tržby 921 mil. USD (+33 %), roční opakované tržby (ARR) 3,65 mld. USD (+33 %). Firma zvýšila celoroční výhled zisku. ' +
          'Akcie se obchoduje za více než 20násobek tržeb – trh za ni platí jako za nejlepší firmu v oboru.',
      },
      {
        title: 'Co se stalo',
        body:
          'Nejde o kybernetický útok, ale o chybný konfigurační soubor. Mac a Linux zasaženy nebyly. CEO George Kurtz se veřejně omluvil. ' +
          'Otázky: odchod zákazníků ke konkurenci, žaloby (aerolinky, pojišťovny) a smluvní kompenzace.',
      },
      {
        title: 'Konkurence',
        body:
          'Hlavní konkurenti: Microsoft Defender, Palo Alto Networks, SentinelOne. Přechod velké firmy na jiný EDR je ale drahý a trvá měsíce až roky.',
      },
    ],
    outcome: {
      summary:
        'První den −11 %, pak pád pokračoval – Delta Air Lines vyčíslila ztrátu ~500 mil. USD a najala právníky. Kolem 5. srpna (zároveň globální výprodej trhu) byla akcie zhruba o 40 % níž než před výpadkem. ' +
        'Pak se ukázalo, že zákazníci masově neodchází, a cena se zčásti vrátila.',
      points: [
        'Q2 FY25 (28. 8.): tržby +32 %, výhled mírně snížen kvůli kompenzacím zákazníkům.',
        'Silná pozice v odvětví – vysoké náklady na změnu dodavatele.',
        'Do konce roku 2024 akcie smazala většinu ztráty.',
      ],
    },
  },
  {
    id: 'zm-2020-10',
    ticker: 'ZM',
    name: 'Zoom Video',
    title: 'Zoom na vrcholu pandemie',
    horizon: 'rok+',
    peers: ['MSFT', 'RNG'],
    historyStart: '2019-04-18',
    decisionDate: '2020-10-19',
    endDate: '2021-12-31',
    situation:
      'Je 19. října 2020. Zoom se stal synonymem pro práci z domova – akcie letos vzrostla zhruba sedminásobně. ' +
      'Druhá vlna covidu nabírá na síle, firmy i školy jedou dál online. Vakcíny jsou ve třetí fázi testů.',
    events: [
      { date: '2019-04-18', label: 'IPO' },
      { date: '2020-03-11', label: 'WHO vyhlašuje pandemii' },
      { date: '2020-04-01', label: '„Zoombombing“ a kritika bezpečnosti' },
      { date: '2020-08-31', label: 'Q2 FY21: tržby +355 %' },
    ],
    articles: [
      {
        title: 'Výsledky Q2 FY2021 (31. 8. 2020)',
        body:
          'Tržby 663,5 mil. USD (+355 %), počet zákazníků s více než 10 zaměstnanci ~370 tisíc. Výhled na celý rok zvýšen na ~2,37–2,39 mld. USD. Akcie den poté +41 %.',
      },
      {
        title: 'Konkurence',
        body:
          'Microsoft Teams hlásí 115 mil. denně aktivních uživatelů a je zdarma v Office 365. Google Meet je zdarma pro všechny. Zoom vyhrává jednoduchostí, ale bariéra přechodu je nízká.',
      },
      {
        title: 'Valuace',
        body:
          'Trh oceňuje Zoom výš než mnohé zavedené softwarové firmy dohromady. Cena předpokládá, že vysoký růst vydrží i po pandemii.',
      },
    ],
    outcome: {
      summary:
        'Zhruba tady byl vrchol. 9. listopadu Pfizer ohlásil účinnou vakcínu a Zoom spadl o 17 % za den. ' +
        'V roce 2021 růst tržeb rychle zpomaloval, akvizice Five9 za 14,7 mld. USD propadla (akcionáři Five9 ji odmítli) a koncem roku byla akcie zhruba o 2/3 níž.',
      points: [
        'Firma zůstala zisková – problém byla cena, ne byznys.',
        'Valuace předpokládající věčný covidový růst se zhroutila.',
        'Konkurence (Teams) využila balíčkování s Office.',
      ],
    },
  },
  {
    id: 'gme-2021-01',
    ticker: 'GME',
    name: 'GameStop',
    title: 'GameStop a WallStreetBets',
    horizon: 'dny',
    peers: ['BBY'],
    historyStart: '2020-01-02',
    decisionDate: '2021-01-22',
    endDate: '2021-02-10',
    situation:
      'Je pátek 22. ledna 2021 večer. Akcie upadajícího prodejce her GameStop letos vystřelila z ~19 na 65 USD. ' +
      'Na Redditu (r/wallstreetbets) se lidé domlouvají na nákupu a call opcích – short interest přesahuje 100 % volných akcií. Hedge fondy sázejí na pád.',
    events: [
      { date: '2020-08-31', label: 'Ryan Cohen odhaluje podíl' },
      { date: '2021-01-11', label: 'Cohen + 2 lidé do představenstva' },
      { date: '2021-01-19', label: 'Citron Research: short GME' },
    ],
    articles: [
      {
        title: 'Ryan Cohen (11. 1. 2021)',
        body:
          'Zakladatel e-shopu Chewy drží přes 10 % GameStopu a s dvěma kolegy usedá v představenstvu. Plán: proměnit kamenné obchody na e-commerce. ' +
          'Prázdninové prodeje: srovnatelné tržby +4,8 %, e-commerce +309 %.',
      },
      {
        title: 'Short squeeze',
        body:
          'Když je shortováno víc akcií, než je volně k dispozici, musí shorteři při růstu ceny nakupovat zpět – a tím cenu dál tlačí nahoru. ' +
          'Gamma squeeze: prodejci call opcí se zajišťují nákupem akcií. Fundamentálně je GameStop ztrátový.',
      },
      {
        title: 'Rizika',
        body:
          'Brokeři mohou omezit obchodování, zvýšit maržové požadavky, shorteři mohou dokoupit kapitál. Pohyby desítek procent za den v obou směrech.',
      },
    ],
    outcome: {
      summary:
        'Squeeze explodoval: 25. 1. Melvin Capital potřeboval injekci 2,75 mld. USD, 26. 1. Elon Musk tweetnul „Gamestonk!!“ a 27. 1. akcie zavřela na 347 USD. ' +
        '28. 1. Robinhood a další brokeři zakázali nákupy – cena se během dne propadla. Do 10. února spadla dokonce pod výchozí úroveň.',
      points: [
        'Za 3 obchodní dny +430 %, pak −85 % od vrcholu.',
        'Fundamenty v tomto horizontu nehrály žádnou roli.',
        'Bonus za tvar zde dává smysl: šlo hlavně o načasování vrcholu.',
      ],
    },
  },
  {
    id: 'pton-2021-11',
    ticker: 'PTON',
    name: 'Peloton',
    title: 'Peloton po pandemickém boomu',
    horizon: '2 měsíce',
    peers: ['LULU', 'NKE'],
    historyStart: '2019-09-26',
    decisionDate: '2021-11-04',
    endDate: '2021-12-31',
    situation:
      'Je 4. listopadu 2021. Peloton dnes po zavření zveřejní výsledky za Q1 fiskálního roku 2022. ' +
      'Posilovny jsou znovu otevřené, firma v srpnu zlevnila základní kolo a akcie je už zhruba o polovinu pod lednovým maximem.',
    events: [
      { date: '2020-03-16', label: 'Lockdowny, boom domácího cvičení' },
      { date: '2021-05-05', label: 'Stažení běžeckého pásu Tread+' },
      { date: '2021-08-26', label: 'Zlevnění Bike na 1 495 USD' },
    ],
    articles: [
      {
        title: 'Výsledky Q4 FY2021 (26. 8. 2021)',
        body:
          'Tržby 937 mil. USD, čistá ztráta 313 mil. USD (ztráta se prohlubuje). Firma snížila cenu základního kola z 1 895 na 1 495 USD, aby oživila poptávku. ' +
          'Výhled na první kvartál nového roku byl slabší, než trh čekal.',
      },
      {
        title: 'Stažení Tread+ (5. 5. 2021)',
        body:
          'Po úrazech dětí a smrtelné nehodě Peloton stáhl pás Tread+ a ohlásil miliardové škody na pověsti i tržbách. Vedení nejdřív varování úřadu CPSC odmítalo.',
      },
      {
        title: 'Konkurence',
        body:
          'Apple Fitness+ (od prosince 2020), iFIT/NordicTrack, Lululemon koupil Mirror. Hlavní „konkurent“ jsou ale znovu otevřené posilovny a návrat lidí ven.',
      },
    ],
    outcome: {
      summary:
        'Peloton snížil roční výhled tržeb o ~1 mld. USD (na 4,4–4,8 mld.) a přiznal slabou poptávku po skončení lockdownů. Akcie −35 % za den. ' +
        'O 12 dní později firma vydala nové akcie za 1 mld. USD, přestože tvrdila, že kapitál nepotřebuje. V prosinci přidala ránu postava v seriálu „A tak dále…“, která zemřela po jízdě na Pelotonu.',
      points: [
        'Q1 FY22: tržby 805 mil. USD, ztráta 376 mil. USD.',
        'Z pandemického vítěze zpět na zem – stejný vzorec jako Zoom.',
        'Do konce roku akcie spadla na ~36 USD.',
      ],
    },
  },
  {
    id: 'intc-2024-08',
    ticker: 'INTC',
    name: 'Intel',
    title: 'Intel: obrat, nebo pád?',
    horizon: '2 měsíce',
    peers: ['AMD', 'NVDA', 'QCOM'],
    historyStart: '2023-06-01',
    decisionDate: '2024-08-01',
    endDate: '2024-09-30',
    situation:
      'Je 1. srpna 2024 odpoledne. Intel dnes po zavření burzy zveřejní výsledky za Q2. Pod vedením Pata Gelsingera investuje desítky miliard do nových továren, ' +
      'aby dohnal TSMC. Výrobní divize Intel Foundry přitom za rok 2023 vykázala provozní ztrátu 7 mld. USD. Akcie je od začátku roku zhruba o třetinu níž.',
    events: [
      { date: '2024-03-20', label: 'Dotace z CHIPS Act až 8,5 mld. USD' },
      { date: '2024-04-02', label: 'Foundry: ztráta 7 mld. USD za 2023' },
      { date: '2024-04-25', label: 'Q1: slabý výhled, akcie −9 %' },
    ],
    articles: [
      {
        title: 'Výsledky Q1 2024 (25. 4. 2024)',
        body:
          'Tržby 12,7 mld. USD (+9 %), ale výhled na Q2 jen 12,5–13,5 mld. USD, pod očekáváním trhu. Vedení zmiňuje omezené výrobní kapacity a slabší poptávku mimo AI. Akcie den poté −9 %.',
      },
      {
        title: 'Strategie IDM 2.0',
        body:
          'Intel chce vyrábět čipy i pro jiné firmy (foundry) a do roku 2025 dohnat TSMC technologií 18A. To znamená obří kapitálové výdaje, tlak na hrubou marži a hotovost. Dividenda zatím zůstává.',
      },
      {
        title: 'Konkurence',
        body:
          'AMD bere Intelu podíl v serverech, NVIDIA ovládla AI akcelerátory, kde Intel s Gaudi téměř nehraje. V noteboocích přichází čipy Qualcomm Snapdragon X na architektuře Arm.',
      },
    ],
    outcome: {
      summary:
        'Výsledky šokovaly: ztráta 1,6 mld. USD, slabý výhled na Q3, hrubá marže jen 35 %. Intel pozastavil dividendu, ohlásil škrty nákladů za 10 mld. USD a propuštění více než 15 % lidí. ' +
        'Akcie 2. srpna −26 % – nejhorší den od roku 1974. V září cenu podpořily zprávy o zájmu Qualcommu o převzetí a o dohodě s Amazonem.',
      points: [
        'Tržby Q2 12,8 mld. USD (−1 %), výhled Q3 12,5–13,5 mld.',
        'Zrušení dividendy je pro „hodnotové“ investory silný signál problémů.',
        'Spekulace o převzetí vedly k částečnému odrazu.',
      ],
    },
  },
  {
    id: 'nvda-2025-01',
    ticker: 'NVDA',
    name: 'NVIDIA',
    title: 'NVIDIA a šok jménem DeepSeek',
    horizon: 'dny',
    intraday: true,
    peers: ['AMD', 'AVGO', 'MSFT'],
    historyStart: '2024-06-03',
    decisionDate: '2025-01-24',
    endDate: '2025-02-07',
    situation:
      'Je neděle 26. ledna 2025 večer. Čínský startup DeepSeek 20. ledna zveřejnil model R1, který se v testech matematiky a programování vyrovná nejlepším modelům OpenAI. ' +
      'Podle firmy stál výpočet pro trénink jejího modelu V3 jen kolem 6 mil. USD na oslabených čipech H800. Aplikace DeepSeek přes víkend vystoupala na čelo amerického App Store. ' +
      'Graf končí pátečním zavřením, posledních pár týdnů vidíš po hodinách.',
    events: [
      { date: '2024-06-10', label: 'Split akcií 10:1' },
      { date: '2024-06-18', label: 'NVIDIA nejcennější firmou světa' },
      { date: '2025-01-20', label: 'DeepSeek vydává model R1' },
      { date: '2025-01-21', label: 'Projekt Stargate až za 500 mld. USD' },
    ],
    articles: [
      {
        title: 'DeepSeek R1',
        body:
          'Model s otevřenými vahami (licence MIT), výkonem srovnatelný s OpenAI o1 a s API za zlomek ceny. Pokud jde trénovat špičkovou AI s mnohem menším výpočetním výkonem, ' +
          'může klesnout poptávka po drahých GPU. Protiargument: levnější AI = víc používání = víc výpočtů (Jevonsův paradox).',
      },
      {
        title: 'Výsledky Q3 FY2025 (20. 11. 2024)',
        body: 'Tržby 35,1 mld. USD (+94 %), data center 30,8 mld. USD. Výhled na Q4 37,5 mld. USD ±2 %. Poptávka po čipech Blackwell podle vedení výrazně převyšuje nabídku.',
      },
      {
        title: 'Investice do AI',
        body:
          'Microsoft plánuje za fiskální rok 2025 utratit zhruba 80 mld. USD za AI datová centra, Meta 24. 1. ohlásila investice 60–65 mld. USD na rok 2025, ' +
          'OpenAI se SoftBankem a Oraclem ohlásili projekt Stargate až za 500 mld. USD.',
      },
      {
        title: 'Konkurence',
        body: 'Broadcom vyrábí zakázkové AI čipy pro Google a další a v prosinci 2024 přesáhl tržní hodnotu 1 bil. USD. AMD nabízí akcelerátory MI300.',
      },
    ],
    outcome: {
      summary:
        'Pondělí 27. ledna: NVIDIA −17 %, ztráta asi 590 mld. USD tržní hodnoty – největší jednodenní ztráta jedné firmy v historii. Padaly i Broadcom a další „AI“ akcie. ' +
        'V úterý se akcie částečně odrazila (+9 %), ale 3. února při otevření spadla ještě níž – o víkendu USA podepsaly cla na Kanadu, Mexiko a Čínu. ' +
        'Pak přišlo uklidnění: cla na Mexiko a Kanadu se odložila a velké firmy ve výsledcích potvrdily obří investice do AI.',
      points: [
        'Trh se bál nižší poptávky po GPU, fundamenty NVIDIE se přes noc nezměnily.',
        'Velké propady kvalitních firem na „příběh“ se často částečně vrací.',
        'Hodinový graf ukazuje, že největší pohyb přišel hned při otevření.',
      ],
    },
  },
  {
    id: 'aapl-2025-04',
    ticker: 'AAPL',
    name: 'Apple',
    title: 'Apple a celní „Den osvobození“',
    horizon: 'dny',
    intraday: true,
    peers: ['MSFT', 'AMZN', 'DELL'],
    historyStart: '2024-07-01',
    decisionDate: '2025-04-02',
    endDate: '2025-04-17',
    situation:
      'Je večer 2. dubna 2025. Prezident Trump po zavření burzy oznámil „reciproční“ cla: základních 10 % na veškerý dovoz a vyšší sazby pro desítky zemí – ' +
      'Čína dalších 34 % (navíc k už platným 20 %), Vietnam 46 %, Indie 26 %. Apple vyrábí většinu iPhonů v Číně, část v Indii, další produkty ve Vietnamu. ' +
      'Futures na akciové indexy po oznámení prudce padají.',
    events: [
      { date: '2025-01-30', label: 'Q1 FY25: rekordní tržby, Čína −11 %' },
      { date: '2025-02-24', label: 'Apple slibuje 500 mld. USD investic v USA' },
      { date: '2025-03-07', label: 'Odklad chytřejší Siri' },
    ],
    articles: [
      {
        title: 'Výsledky Q1 FY2025 (30. 1. 2025)',
        body: 'Tržby 124,3 mld. USD (+4 %), EPS 2,40 USD. iPhone 69,1 mld. (−1 %), služby 26,3 mld. (+14 %), Velká Čína −11 %.',
      },
      {
        title: 'Co cla znamenají pro Apple',
        body:
          'Pokud by Apple nezvedl ceny, cla by výrazně snížila jeho marže. Zdražení iPhonu zase může srazit poptávku. Otázky: dostane Apple výjimku jako v roce 2019? ' +
          'Odpoví Čína odvetnými cly? Jak rychle lze přesunout výrobu do Indie?',
      },
      {
        title: 'Valuace',
        body: 'Apple se obchoduje za více než 30násobek zisku – trh za něj platí prémii za stabilitu. Prudká změna výhledu může tuto prémii rychle snížit.',
      },
    ],
    outcome: {
      summary:
        'Apple za 4 obchodní dny ztratil přes 20 % (Čína 4. 4. odpověděla vlastním clem 34 %). 9. dubna Trump ohlásil 90denní odklad cel pro většinu zemí (ne pro Čínu) ' +
        'a Apple vyskočil o 15 % – nejvíc od roku 1998. 11. dubna večer přišla výjimka pro smartphony a počítače. Přesto akcie do 17. 4. nevymazala celou ztrátu.',
      points: [
        'Extrémní volatilita oběma směry – rozhodovaly politické zprávy, ne fundamenty.',
        'Kdo prodal v panice 8. dubna, prodal skoro na dně.',
        'Bonus za tvar: pád – odraz – postupné uklidnění.',
      ],
    },
  },
  {
    id: 'amzn-2022-04',
    ticker: 'AMZN',
    name: 'Amazon',
    title: 'Amazon po covidovém boomu',
    horizon: '2 měsíce',
    peers: ['WMT', 'GOOGL', 'MSFT'],
    historyStart: '2020-06-01',
    decisionDate: '2022-04-28',
    endDate: '2022-06-30',
    situation:
      'Je 28. dubna 2022 odpoledne. Amazon dnes po zavření burzy zveřejní výsledky za Q1. Inflace v USA je nejvyšší za 40 let, Fed začal zvedat sazby a technologické akcie v dubnu prudce padají. ' +
      'Amazon během pandemie zdvojnásobil logistickou síť a teď řeší vyšší náklady na mzdy a dopravu. V březnu ohlásil split akcií 20:1 a zpětný odkup za 10 mld. USD.',
    events: [
      { date: '2021-07-05', label: 'Andy Jassy novým CEO' },
      { date: '2021-11-10', label: 'IPO Rivianu (Amazon drží velký podíl)' },
      { date: '2022-02-03', label: 'Q4 2021: zdražení Prime, akcie +13,5 %' },
      { date: '2022-03-09', label: 'Ohlášen split 20:1 a odkup za 10 mld.' },
    ],
    articles: [
      {
        title: 'Výsledky Q4 2021 (3. 2. 2022)',
        body:
          'Tržby 137,4 mld. USD (+9 %), AWS 17,8 mld. (+40 %). Zisk nafoukl přecenění podílu v Rivianu. Amazon zdražil Prime v USA ze 119 na 139 USD ročně. Akcie den poté +13,5 %.',
      },
      {
        title: 'Náklady a kapacity',
        body:
          'Vedení přiznává, že po covidu má více skladů a lidí, než potřebuje, a náklady na dopravu a mzdy rostou. Akcie Rivianu od IPO výrazně spadly – Amazon bude vykazovat ztrátu z přecenění.',
      },
      { title: 'Trh', body: 'Nasdaq je od listopadového maxima zhruba o pětinu níž. Investoři utíkají od růstových firem kvůli rostoucím sazbám.' },
    ],
    outcome: {
      summary:
        'Amazon vykázal čistou ztrátu 3,8 mld. USD (hlavně přecenění Rivianu o 7,6 mld.), tržby +7 % – nejpomalejší růst za dvě desetiletí – a slabý výhled na Q2. ' +
        'Akcie 29. dubna −14 %, nejhorší den od roku 2006. Pak dál padala s celým technologickým sektorem.',
      points: [
        'AWS rostl o 37 %, ale e-commerce zpomalila a náklady rostly.',
        'V červnu proběhl split 20:1 – graf je přepočítaný, cena v grafu je v „předsplitových“ dolarech.',
        'Makro (Fed, inflace) táhlo dolů celý sektor.',
      ],
    },
  },
  {
    id: 'snap-2022-05',
    ticker: 'SNAP',
    name: 'Snap',
    title: 'Snap varuje uprostřed kvartálu',
    horizon: '2 měsíce',
    peers: ['META', 'PINS', 'GOOGL'],
    historyStart: '2021-01-04',
    decisionDate: '2022-05-23',
    endDate: '2022-07-29',
    situation:
      'Je večer 23. května 2022. Snap (Snapchat) po zavření burzy zveřejnil interní dopis CEO: makroekonomické prostředí se zhoršilo rychleji, než firma čekala, ' +
      'a tržby i provozní zisk za Q2 budou pod spodní hranicí výhledu, který dala před měsícem. Firma zpomalí nábor.',
    events: [
      { date: '2021-09-24', label: 'Akcie na historickém maximu' },
      { date: '2021-10-21', label: 'Q3: dopad Apple ATT, akcie −27 %' },
      { date: '2022-02-03', label: 'Q4: první čtvrtletní zisk, akcie +59 %' },
      { date: '2022-04-21', label: 'Q1 2022 výsledky' },
    ],
    articles: [
      {
        title: 'Výsledky Q1 2022 (21. 4. 2022)',
        body:
          'Tržby 1,06 mld. USD (+38 %), denně aktivní uživatelé 332 mil. (+18 %). Výhled na Q2: růst tržeb 20–25 %. Vedení zmiňuje nejistotu kvůli válce na Ukrajině, inflaci a změnám v iOS.',
      },
      {
        title: 'Co znamená varování',
        body:
          'Jen měsíc po výhledu ho firma ruší. Snap žije z reklamy – když on vidí slabší poptávku inzerentů, týká se to možná i Mety, Pinterestu nebo Googlu.',
      },
      { title: 'Konkurence', body: 'TikTok bere pozornost mladých uživatelů, Meta tlačí Reels. Apple ATT omezil cílení reklam.' },
    ],
    outcome: {
      summary:
        'Snap 24. května −43 % a strhl celý reklamní sektor: Meta −8 %, Alphabet −5 %, Pinterest −24 %. ' +
        'Výsledky Q2 (21. 7.) potvrdily zpomalení na +13 %, firma nedala výhled a akcie spadla o dalších 39 %.',
      points: [
        'Varování uprostřed kvartálu je silný signál – málokdy přijde jen jedno.',
        'Malé firmy s vysokou valuací reagují na zpomalení nejprudčeji.',
        'Reklamní trh je cyklický – inzerenti škrtají jako první.',
      ],
    },
  },
  {
    id: 'tgt-2022-05',
    ticker: 'TGT',
    name: 'Target',
    title: 'Target a zaseklé zásoby',
    horizon: '2 měsíce',
    peers: ['WMT', 'COST', 'BBY'],
    historyStart: '2021-01-04',
    decisionDate: '2022-05-17',
    endDate: '2022-07-29',
    situation:
      'Je večer 17. května 2022. Target zítra před otevřením burzy zveřejní výsledky za Q1. Dnes ráno Walmart vykázal výrazně nižší zisk kvůli nákladům na palivo, mzdy a přebytečným zásobám ' +
      'a jeho akcie spadla o 11 % – nejvíc od roku 1987. Inflace mění to, co lidé kupují: méně televizí a nábytku, víc jídla a benzínu.',
    events: [
      { date: '2021-11-17', label: 'Q3 2021: rekordní tržby' },
      { date: '2022-03-01', label: 'Q4 2021: silné prázdniny' },
      { date: '2022-05-17', label: 'Walmart vykázal slabý zisk, −11 %' },
    ],
    articles: [
      {
        title: 'Výsledky Q4 2021 (1. 3. 2022)',
        body:
          'Silná prázdninová sezóna, tržby rekordní. Target zvýšil dividendu a oznámil odkup akcií za 15 mld. USD. Na rok 2022 čekal provozní marži kolem 8 %.',
      },
      {
        title: 'Walmart (17. 5. 2022)',
        body:
          'Největší konkurent snížil roční výhled zisku. Důvody: palivo, přesčasy, dražší doprava a zásoby zboží, které se teď neprodává. Zásoby Walmartu meziročně +33 %.',
      },
      { title: 'Spotřebitel', body: 'Ceny potravin a energií rostou nejrychleji za desítky let. Lidé omezují nákupy elektroniky, domácích potřeb a oblečení, které během covidu kupovali hodně.' },
    ],
    outcome: {
      summary:
        'Target vykázal provozní marži jen 5,3 % (rok předtím 9,8 %) a zisk na akcii hluboko pod očekáváním. Zásoby vzrostly o 43 %. ' +
        'Akcie 18. května −25 % – nejhorší den od krachu v roce 1987. 7. června Target znovu snížil výhled marže a ohlásil výprodeje zásob.',
      points: [
        'Walmart den předem byl varováním – podobný byznys, podobné problémy.',
        'Prudký růst zásob proti tržbám = budoucí slevy a nižší marže.',
        'Druhé varování v červnu trh přijal klidněji – špatné zprávy už byly v ceně.',
      ],
    },
  },
  {
    id: 'ba-2024-01',
    ticker: 'BA',
    name: 'Boeing',
    title: 'Boeing a utržené dveře',
    horizon: '2 měsíce',
    peers: ['RTX', 'GE', 'LMT'],
    historyStart: '2022-01-03',
    decisionDate: '2024-01-05',
    endDate: '2024-03-15',
    situation:
      'Je večer v pátek 5. ledna 2024. Letadlu Alaska Airlines (Boeing 737 MAX 9) se krátce po startu z Portlandu ve výšce asi 5 km utrhl panel dveří v trupu. ' +
      'Letadlo bezpečně přistálo, nikdo nezemřel. Boeing se po krizi 737 MAX z let 2019–2020 snaží obnovit důvěru a zvyšovat výrobu.',
    events: [
      { date: '2023-04-13', label: 'Vada od dodavatele Spirit AeroSystems' },
      { date: '2023-10-25', label: 'Q3 2023 výsledky' },
      { date: '2023-12-29', label: 'Kontroly kvůli uvolněnému šroubu ve směrovce' },
    ],
    articles: [
      {
        title: 'Výsledky Q3 2023 (25. 10. 2023)',
        body:
          'Tržby rostou, ale Boeing je stále ve ztrátě. Firma potvrdila cíl volného cash flow 3–5 mld. USD na rok 2023 a plán zvýšit výrobu 737 na 38 kusů měsíčně a dál.',
      },
      {
        title: 'Co může následovat',
        body: 'Úřad FAA může letadla uzemnit, nařídit kontroly nebo omezit výrobu. Aerolinky mohou žádat kompenzace a odkládat objednávky. Na druhé straně má Boeing objednávky na roky dopředu.',
      },
      { title: 'Konkurence', body: 'Airbus je jediný velký konkurent a má také plnou výrobu na roky. Zákazníci nemohou snadno přejít.' },
    ],
    outcome: {
      summary:
        'FAA 6. ledna uzemnila 171 letadel 737 MAX 9. Akcie v pondělí 8. ledna −8 % a pokles pokračoval: FAA zakázala zvyšovat výrobu 737 MAX, ' +
        'Boeing ve výsledcích (31. 1.) nedal výhled na rok 2024 a předběžná zpráva vyšetřovatelů NTSB (6. 2.) uvedla, že na panelu chyběly šrouby. Do poloviny března akcie ztratila zhruba čtvrtinu.',
      points: [
        'Nehoda bez obětí, ale odhalila systémové problémy s kvalitou.',
        'Regulátor omezil výrobu → nižší cash flow na roky dopředu.',
        'Špatné zprávy přicházely postupně – pokles byl dlouhý, ne jednorázový.',
      ],
    },
  },
]
