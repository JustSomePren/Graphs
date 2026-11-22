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

- **Fundamenty** (tržby, EPS, zisk, hotovost, data výsledků) – SEC EDGAR API, veřejná data bez licence.
  Používají se jen výkazy podané **do data rozhodnutí**, takže nevidíš nic z budoucnosti.
- **Ceny** – denní zavírací ceny z veřejného chart endpointu Yahoo Finance, přepočtené na úroveň před pozdějšími splity
  (cena je taková, jakou investor tehdy opravdu viděl). Jde o neoficiální endpoint – pro veřejné vydání hry by bylo lepší nahradit ho licencovaným zdrojem.
- **Forward P/E a doporučení analytiků** se nezobrazují – konsenzuální odhady jsou licencovaná data (FactSet, LSEG, Zacks…).
  Očekávání trhu jsou proto zmíněna jen v článcích, tak jak o nich veřejně psala média.

Nejde o investiční doporučení.
