# Kam to půjde?

Mobilní hra na odhad vývoje akcií. Vidíš historický graf firmy, prostuduješ situaci tak, jak ji znal investor v daný den
(výsledky, P/E, konkurence, zprávy), nakreslíš odhad dalšího vývoje a hra ti ukáže realitu, skóre a důvod, proč to dopadlo, jak to dopadlo.

## Jak hrát

1. Vyber scénář (firma + datum + horizont: dny, týdny, měsíce, rok).
2. Projdi záložky **Situace**, **Data**, **Konkurence** a **Rozšířené** (články, odkazy na originální tiskové zprávy na SEC).
3. Do šedé zóny vpravo nakresli vývoj – **Prst** (volné kreslení) nebo **Body** (klepnutím vkládáš body, tažením je posouváš).
   Tlačítko **Rozsah** mění měřítko osy, kdyby se ti odhad nevešel.
4. **Vyhodnotit** – skóre 0–100:
   - konečná cena 60 b., průběh 25 b., směr 15 b.,
   - bonus až +15 b. za trefený tvar (reakce na earnings, obraty nahoru/dolů).

## Spuštění

```bash
npm install
npm run dev        # webová verze na http://localhost:5173 (i z mobilu ve stejné síti)
```

## Android (Pixel)

APK se sestaví automaticky v GitHub Actions (záložka *Actions* → poslední běh → artefakt `kam-to-pujde-apk`).

Ručně:

```bash
npm run android                      # build webu + synchronizace do android/
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Instalace na telefon: pošli si APK do telefonu a povol instalaci z neznámých zdrojů, nebo `adb install app-debug.apk`.

## Data

`npm run data` znovu stáhne data a vytvoří `src/data/scenarios.json`. Texty scénářů jsou v `scenarios/scenarios.mjs` –
nový scénář = nový objekt v tomto souboru (ticker, období, situace, články, vysvětlení výsledku).

Všechna data jsou jen taková, jaká byla **veřejně známá k datu rozhodnutí** – nic z budoucnosti.

| Zdroj | Co z něj hra bere | Licence |
|---|---|---|
| **SEC EDGAR** – výkazy 10-Q/10-K (XBRL API) | tržby, marže, EPS, cash flow, dluh, hotovost, zpětné odkupy, dividendy, počet akcií, zásoby, kvartální přehled | volné dílo (US government) |
| **SEC EDGAR** – formuláře 8-K | data vyhlášení výsledků, odkazy na tiskové zprávy | volné dílo |
| **SEC EDGAR** – formuláře 4 | nákupy a prodeje insiderů za 6 měsíců | volné dílo |
| **FRED** (Fed St. Louis) | úrok Fedu, 10letý výnos, spread 10Y−2Y, inflace, nezaměstnanost | volné dílo (data Fedu, ministerstva financí a BLS) |
| **Yahoo Finance** (veřejný chart endpoint) | denní ceny a objemy → z nich se počítá volatilita, beta, klouzavé průměry, výkonnost | neoficiální, bez licence pro redistribuci |

Měsíční makro údaje se berou se zpožděním publikace (CPI ~45 dní), kvartální čísla jen z výkazů podaných do data rozhodnutí.

**Co zdarma k dispozici není:** historický konsenzus analytiků (forward P/E, počty buy/hold/sell) prodávají FactSet, LSEG, S&P a Zacks,
historický short interest burzy (Nasdaq/NYSE) také. Free API (Finnhub, Alpha Vantage, Tiingo) mají buď jen aktuální hodnoty, nebo vyžadují klíč
a jejich podmínky nedovolují data šířit v aplikaci. Očekávání trhu jsou proto jen v článcích, tak jak o nich psala média.

Ceny: oficiální licencovaný zdroj zdarma neexistuje – ceny vlastní burzy. Pro soukromou hru stačí Yahoo, pro veřejné vydání by bylo
potřeba nahradit ho placeným zdrojem (např. Polygon, Tiingo) – stačí upravit `scripts/lib/prices.mjs`.

Nejde o investiční doporučení.
