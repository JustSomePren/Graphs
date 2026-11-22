# Kam to půjde?

Mobilní hra na odhad vývoje akcií. Vidíš historický graf firmy, prostuduješ situaci tak, jak ji znal investor v daný den
(výsledky, P/E, konkurence, zprávy), nakreslíš odhad dalšího vývoje a hra ti ukáže realitu, skóre a důvod, proč to dopadlo, jak to dopadlo.

## Jak hrát

Dva režimy:

- **Příběhy** – 17 ručně připravených situací (NVIDIA před AI boomem, DeepSeek, cla 2025, Target, Boeing, GameStop…) s texty,
  horizonty od dnů (hodinová data) po rok.
- **Rychlá hra** – přes 1000 automaticky vygenerovaných scénářů: anonymní americká firma (~110 firem, 16 odvětví)
  v den výsledků (2012–2025).
- **Denní výzva** – každý den jeden společný scénář pro všechny hráče.
  Vidíš jen čísla, graf a výňatky z tiskové zprávy, jméno se dozvíš po vyhodnocení.

Postup:

1. Projdi záložky **Přehled** (situace + signály), **Data** (včetně tabulky minulých výsledků a reakcí trhu),
   **Konkurence** a **Články** (texty + výňatky a výhled vedení z originální tiskové zprávy).
   Klepnutím na „E“ v grafu uvidíš tržby, P/E a reakci akcie u každých minulých výsledků.
2. Do modré zóny vpravo nakresli vývoj – **Prst** nebo **Body**. Tlačítko **⛶** otevře kreslení na celou obrazovku
   na šířku: historie vyplní displej, **Budoucnost ▶** posune graf do zóny pro odhad. Dvěma prsty (nebo v režimu **✋ Posun**)
   se graf posouvá a přibližuje; když při kreslení dojedeš k horní/dolní hraně, rozsah se sám rozšíří (max. 30×).
   Na šířku se celá hra rozloží do dvou sloupců (graf + analýza).
3. **Vyhodnotit** – skóre 0–100 (konečná cena 60, průběh 25, směr 15) + bonus až 15 za tvar
   (reakce na výsledky, obraty). Skóre je kalibrované: hádání bez informace dává průměrně ~35 bodů,
   správný směr ~65, správná konečná cena ~97 (hlídá to test `tests/calibration.test.js`).
4. Profil: hodnost podle průměru posledních 10 her, série dní, odznaky a historie her.

Další funkce: **Přehled** s 8 klíčovými čísly, ročním rozpětím a „fakty v kostce“ po oblastech – jen čísla a srovnání,
bez hodnocení (žádné „levná“, „riziko“, žádné zelené/červené zvýraznění před odhadem);
tlačítko **±** ukáže pásmo běžného pohybu podle volatility; po vyhodnocení **sdílení** výsledku s emoji grafem
a srovnání s „rovnou čárou“; **Statistiky** (trefený směr, sklon k optimismu/pesimismu, výsledky podle horizontu a odvětví);
**Nastavení** (motiv, vibrace, reset postupu).

## Spuštění

```bash
npm install
npm run dev        # webová verze na http://localhost:5173 (i z mobilu ve stejné síti)
```

## Neutralita

Před odhadem hráč vidí jen to, co bylo známé k datu rozhodnutí, a v neutrálním tónu: titulky jsou ve tvaru
„firma + událost + datum“, texty bez hodnotících slov. Hlídá to test `tests/neutral.test.js` (seznam zakázaných
slov a kontrola, že budoucí události nejsou vidět).

## Testy

```bash
npm test           # jednotkové testy: skórování, výpočty z výkazů, kvalita dat všech scénářů
npm run test:e2e   # projde všechny scénáře v prohlížeči na rozlišení Pixelu (vyžaduje Playwright)
```

Kontrola kvality dat (`scripts/lib/validate.mjs`) běží i při `npm run data` – hlídá díry v cenách, špatně
přepočtené splity, nesmyslné marže a hlavně, aby se do scénáře nedostala žádná informace z budoucnosti.

## Android (Pixel)

Testovací APK se sestaví automaticky v GitHub Actions (záložka *Actions* → poslední běh → artefakt `kam-to-pujde-debug-apk`).

Ručně:

```bash
npm run android                      # build webu + synchronizace do android/
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### Podepsaný release (Google Play)

Podpisový klíč **není v gitu**. Build ho hledá v `android/keystore.properties`:

```properties
storeFile=release.jks
storePassword=…
keyAlias=kamtopujde
keyPassword=…
```

```bash
cd android && ./gradlew assembleRelease bundleRelease
# APK: app/build/outputs/apk/release/app-release.apk
# AAB pro Google Play: app/build/outputs/bundle/release/app-release.aab
```

V GitHub Actions se release sestaví, když v *Settings → Secrets → Actions* nastavíš:
`ANDROID_KEYSTORE_BASE64` (výstup `base64 -w0 release.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
**Klíč si dobře zálohuj** – bez něj nejde vydat aktualizaci aplikace se stejným podpisem.

Ikona a úvodní obrazovka jsou v `assets/` (zdroj `icon.svg`), Android varianty vytvoří `npx capacitor-assets generate --android`.

## Data

`npm run data` znovu stáhne data a vytvoří `src/data/scenarios.json`; `node scripts/build-data.mjs --auto`
vytvoří i automatické scénáře (`src/data/auto/` – části po odvětvích + `index.json`, aplikace je načítá až při použití;
seznam firem v `scripts/lib/auto.mjs`). Texty scénářů jsou v `scenarios/scenarios.mjs` –
nový scénář = nový objekt v tomto souboru (ticker, období, situace, články, vysvětlení výsledku).

Všechna data jsou jen taková, jaká byla **veřejně známá k datu rozhodnutí** – nic z budoucnosti.

| Zdroj | Co z něj hra bere | Licence |
|---|---|---|
| **SEC EDGAR** – výkazy 10-Q/10-K (XBRL API) | tržby, marže, EPS, cash flow, dluh, hotovost, zpětné odkupy, dividendy, počet akcií, zásoby, kvartální přehled | volné dílo (US government) |
| **SEC EDGAR** – formuláře 8-K | data vyhlášení výsledků (rozlišuje i předběžná čísla – dodávky, varování), odkazy na tiskové zprávy | volné dílo |
| **SEC EDGAR** – formuláře 4 | nákupy a prodeje insiderů za 6 měsíců | volné dílo |
| **FRED** (Fed St. Louis) | úrok Fedu, 10letý výnos, spread 10Y−2Y, inflace, nezaměstnanost | volné dílo (data Fedu, ministerstva financí a BLS) |
| **Yahoo Finance** (veřejný chart endpoint) | denní ceny a objemy → z nich se počítá volatilita, beta, klouzavé průměry, výkonnost | neoficiální, bez licence pro redistribuci |

Měsíční makro údaje se berou se zpožděním publikace (CPI ~45 dní), kvartální čísla jen z výkazů podaných do data rozhodnutí.

**Co zdarma k dispozici není:** historický konsenzus analytiků (forward P/E, počty buy/hold/sell) prodávají FactSet, LSEG, S&P a Zacks,
historický short interest burzy (Nasdaq/NYSE) také. Free API (Finnhub, Alpha Vantage, Tiingo) mají buď jen aktuální hodnoty, nebo vyžadují klíč
a jejich podmínky nedovolují data šířit v aplikaci. Očekávání trhu jsou proto jen v článcích, tak jak o nich psala média.

Ceny: oficiální licencovaný zdroj zdarma neexistuje – ceny vlastní burzy. Pro soukromou hru stačí Yahoo. Pro veřejné vydání
je připravený adaptér na **Tiingo** (licencovaný zdroj s osobním i komerčním tarifem): `TIINGO_TOKEN=… npm run data`.
Hodinová data (scénáře „dny“) zatím umí jen Yahoo.

**Ověření textů:** čísla v textech scénářů jsou zkontrolovaná proti originálním tiskovým zprávám na SEC
(NVIDIA, Meta, Netflix, Apple, CrowdStrike, Zoom, Peloton, Intel, GameStop – vše sedí; u Tesly upraveno na „téměř 140 000“ podle zprávy).
Texty o tržních reakcích a zprávách z médií (např. DeepSeek, cla) vychází z veřejně známých událostí.

**Anonymní scénáře:** jméno a ticker firmy se z výňatků tiskových zpráv automaticky odstraňují (test to hlídá),
názvy produktů ale mohou firmu občas prozradit.

Nejde o investiční doporučení.
