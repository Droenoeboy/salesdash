# Testverslag DPAC-315 · Administratie-dashboard voor Michelle

Getest op 5 okt 2026 (systeemdatum = "vandaag" in de app), lokaal tegen `admin_data.json` (fictief, 168 leerlingen, 60 facturen, 150 bankregels).

- **Servers:** `python3 -m http.server 8787` vanuit `salesdash/` (nieuwe versie) en `8788` vanuit `tools/admin315-before/`, met HEAD-versie `13189d4` van `admin/index.html` + `admin/app.js` en dezelfde `admin_data.json`.
- **Tooling:** `tools/shot.js` (Playwright headless; print console- en page-errors).
  - Omdat shot.js de JS als één argument wil, leest `tools/admin315/shotf.js` die uit een bestand en roept daarna shot.js aan.
  - Voor punt 5 (echt herladen) en de gate-test is een eigen Playwright-script gebruikt, met dezelfde foutopvang als shot.js.
- **Alles in één keer:** `node tools/admin315/run_all.js`. Alle testscripts staan in `tools/admin315/`.
- **Screenshots:** `tools/shots/admin315-*.png`.

**Resultaat: alle 6 verplichte punten OK. Geen enkele console- of page-error in welke run dan ook** (elke regel eindigt op `errors: none`). De bestaande regressietest `tools/flow_admin.js` geeft 36 PASS en 0 FAIL, op desktop en mobiel.

---

## 1. Werklijst desktop 1440×900 en mobiel 390×844 — OK
Screenshots: `admin315-1-werklijst-desktop.png`, `admin315-1-werklijst-mobiel.png`
```
EVAL: {"tab":"wl","knop":"Vandaag betaling checken · 3","labels":25,"schuldhulpIcoon":3,"sw":1440,"iw":1440}
shot shots/admin315-1-werklijst-desktop.png errors: none
EVAL: {"tab":"wl","knop":"Vandaag betaling checken · 3","labels":25,"schuldhulpIcoon":3,"sw":390,"iw":390}
shot shots/admin315-1-werklijst-mobiel.png errors: none
```
- **Knop:** staat als eerste tegel naast de KPI's, op één rij met de 7 bestaande. Op mobiel neemt hij de volle breedte bovenaan.
- **Labels:** 25 labels (herinnering, aanmaning, termijnen) en 3 schuldhulp-icoontjes in de rijen.
- **Breedte:** geen horizontale scroll (`scrollWidth == innerWidth`).
- **Alle tabs op 390 px** (`admin315/t8_mobiel.js`): `scrollWidth` is overal 390 (wl, eerste, afspr, chk, alle, ov, afl).
- **Klikdoelen op 390 px:** geen enkel zichtbaar klikdoel is lager dan 40 px. Uitzondering zijn de checkboxjes van 20 px; die zitten in een label van 40×40 px.

## 2. "Vandaag betaling checken": lijst open, één leerling afgevinkt — OK
Screenshot: `admin315-2-checken.png` · script `admin315/t2_check.js`
```
EVAL: {"voor":"Vandaag betaling checken · 3","na":"Vandaag betaling checken · 2","rijen":["Jonas Mulder","Bente Jansen","Kiara Mulder"],
       "opslag":{"d":"2026-10-05","ids":["n0027"]},"eersteGecheckt":true,"paneelViaNaam":"Bente Jansen","escSluit":true}
shot shots/admin315-2-checken.png errors: none
```
- **Teller:** vóór `· 3`, na één vinkje `· 2`.
- **Opslag:** `localStorage.dpacAdminChecked = {d:"2026-10-05", ids:[…]}`. Een opgeslagen object met een andere `d` wordt bij het laden genegeerd.
- **Lijst:** inline onder de KPI's, dus geen modal.
- **Naam:** klik opent het zijpaneel; Esc sluit het weer.
- **N == 0:** de knop wordt gedempt en toont "Vandaag niets te checken". Zonder één afspraak vandaag is hij ook `disabled`.
- **Extra** (`admin315/t9_extra.js`): betaalafspraak in het paneel op "Vandaag" zetten laat de teller live stijgen: `· 3` → `· 4`.

## 3. Zijpaneel: herinnering, 3 termijnen (1 binnen), schuldhulp aan — OK
Screenshots: `admin315-3-paneel-desktop.png`, `admin315-3-paneel-mobiel.png` (paneel schermvullend, 390 px) en `admin315-3-rij-labels.png` (rij na sluiten). Scripts: `admin315/t3_paneel.js`, `admin315/t3b_rij.js`.
```
EVAL: {"naam":"Faris Mulder","id":"n0156","opgeslagen":"Opgeslagen ✓",
 "termijnRijen":[{"binnen":true,"bedrag":"150,50","datum":"2026-09-01"},{"binnen":false,"bedrag":"150,50","datum":"2026-10-01"},{"binnen":false,"bedrag":"150,50","datum":"2026-11-01"}],
 "somTekst":"€ 301",
 "S":{"herinnering":"2026-10-05","termijnen":"2026-09-01|150.5|binnen\n2026-10-01|150.5|open\n2026-11-01|150.5|open","schuldhulp":true,"notitie":"Gebeld 5 okt, betaalt vrijdag."},
 "rijLabels":["Herinnering gestuurd: 05-10-2026","€ 150,50 op 01-10-2026 · nog te betalen € 301"],"rijSchuldhulpIcoon":true, ...}
shot shots/admin315-3-paneel-desktop.png errors: none
EVAL: {"naam":"Faris Mulder","klikBuitenSluit":true,"labels":["Herinnering gestuurd: 05-10-2026","€ 150,50 op 01-10-2026 · nog te betalen € 301"],
       "schuldhulpIcoon":"Schuldhulpverlening","achterstalligeDatumKleur":"rgb(255, 138, 142)"}
shot shots/admin315-3-rij-labels.png errors: none
```
- **Herinnering:** gezet via de knop "Vandaag". "Opgeslagen ✓" verschijnt en is na 1,5 s weer weg (`msgNa1600:""` in t9).
- **Termijnen:**
  - "+ Termijn" neemt standaard de laatste datum + 1 maand en het vorige bedrag over (1-9 → 1-10 → 1-11, € 150,50).
  - De eerste termijn is binnen. "Nog te betalen" telt alleen de open termijnen: 2 × 150,50 = € 301.
- **Rij-label:** de eerstvolgende open termijn (01-10-2026) ligt in het verleden, dus die datum staat in `var(--red-tx)` = rgb(255,138,142).
- **Schuldhulp:** neutraal `◎` in `var(--mut)` met `title="Schuldhulpverlening"`.
- **Sluiten:** werkt met ×, Esc en klik buiten het paneel (getest).
- **Notitie:** na 500 ms is er nog niets opgeslagen, na 1000 ms wel (debounce van 800 ms). Blur slaat direct op (t9).
- **Betaalafspraak tot in de toekomst:** de leerling gaat direct van de werklijst af en verschijnt bij Afspraken (t9: `opWlVoor:true, opWlNa:false, inAfspraken:true`).

## 4. Tab Afletteren (desktop) — OK
Screenshots: `admin315-4-afletteren-desktop.png`, `admin315-4-afletteren-mobiel.png` · script `admin315/t4_afletteren.js`
```
EVAL: {"tabs":[…,"📊 Overzicht","🔗 Afletteren35"],"laatsteTab":"afl","kaarten":35,
 "kandidaten":["zeker € 995 · 5 okt · naam staat al op de betaling …","waarschijnlijk € 2.899 · 2 sep · van Zoë Jansen zelfde achternaam · bedrag = openstaand saldo 👤 Klant op betaling 🔗 Bekijk in Odoo"],
 "knopVoor":true,"setPartner":{"lijn":2500,"pid":1042,"bankregelHeeftNuPid":true,"knopNaKlik":false},"paneelViaNaam":"Zoë Jansen",
 "mollie":"🟣 Mollie-uitbetalingen (bundels) · 0 · € 0 …","overige":"❓ Overige niet-afgeletterde betalingen · 103 …","sw":1440,"iw":1440}
shot shots/admin315-4-afletteren-desktop.png errors: none
```
- **Plek en stijl:** laatste tab, in de bestaande tabs-stijl.
- **Logica:** `payCands`, `calcDebs`, IBAN-historie, `reconGo`, `psPill` en `setPartner` komen uit `finance/app.js`. Er wordt gerekend op `invoices`/`bank` uit hetzelfde admin-antwoord.
- **Testdata aangepast:** de testdata heeft geen namen in de bank-omschrijvingen. Het script zet daarom één bankregel op "naam: Zoë Jansen …" met bedrag = openstaand, zodat de naam-match en de knop "Klant op betaling" (set_partner) te zien zijn. In local-modus wordt set_partner nagebootst; er gaat geen netwerkverkeer uit.
- **Naam:** de naam van een leerling opent het zijpaneel (koppeling via `odoo_partner_id`). Het Odoo-linkje staat ernaast als "Odoo ↗".

## 5. Herladen: herinnering, termijnen en schuldhulp blijven staan — OK
Screenshot: `admin315-5-na-herladen.png` (paneel na herladen) · script `admin315/t5_reload.js` (Playwright `page.reload()`)
```
VOOR {"naam":"Faris Mulder","id":"n0156","S":{"herinnering":"2026-10-05","termijnen":"2026-09-01|150.5|binnen\n2026-10-01|150.5|open\n2026-11-01|150.5|open","schuldhulp":true,"notitie":"Gebeld 5 okt, betaalt vrijdag."}}
NA   {"S":{…identiek…},"rijLabels":["Herinnering gestuurd: 05-10-2026","€ 150,50 op 01-10-2026 · nog te betalen € 301"],"rijSchuldhulpIcoon":true,
      "paneel":{"herinneringVeld":"2026-10-05","termijnen":["binnen 150,50 2026-09-01","open 150,50 2026-10-01","open 150,50 2026-11-01"],"som":"€ 301","schuldhulp":true,"notitie":"Gebeld 5 okt, betaalt vrijdag."},"demoLabel":"demo"}
S gelijk voor/na herladen: true
shot shots/admin315-5-na-herladen.png errors: none
```
- **Opslag in local-modus:** `localStorage.dpacAdminLocalEdits = {page_id:{veld:waarde}}`. Dit wordt na het laden van `admin_data.json` toegepast.
- **Demo-label:** de paarse TESTDATA-balk bovenaan, plus het label "demo" in het paneel.

## 6. Klikbare elementen op de Werklijst (`a,button,[onclick],input,select,textarea`) — OK
Screenshots: `admin315-6-voor.png`, `admin315-6-na.png` · script `admin315/t6_tel.js`

| | totaal | zichtbaar | header | gate | tabs | kpis | view | naam-links |
|---|---|---|---|---|---|---|---|---|
| **vóór** (HEAD 13189d4, :8788) | **172** | 170 | 1 | 2 | 6 | 7 | 156 | 0 |
| **ná** (deze versie, :8787) | **246** | 244 | 1 | 2 | 7 | 8 | 227 | 71 |

Het verschil is +74:
- 71 klikbare namen (één per rij; die openen het paneel)
- 1 tab Afletteren
- 1 knop "Vandaag betaling checken"
- 1 achtergrond van het paneel (klik buiten = sluiten)

Er is geen bestaand klikbaar element verdwenen.

---

## Extra controles
- **Echte modus met nagebootste `fetch`** (`admin315/t7_echtpad.js`; geen verkeer naar n8n, Notion of Odoo):
  - **Gate:** zichtbaar. Het codeveld heeft `type="text"` en `autocomplete="off"`. Een foute code geeft "Onjuiste code"; een goede code laat je binnen.
  - **Opslag van de code:** `localStorage.dpacAdminCode` blijft `null`; alleen `sessionStorage.dpacAdminCode` wordt gezet.
  - **Schrijven:** body `{"code":"GOED","actie":"schrijf","page_id":"n0081","herinnering":"2026-10-05"}` met `Content-Type: text/plain`. "Wissen" stuurt `"herinnering":null`.
  - **Fout bij schrijven:** het paneel toont "Niet opgeslagen (Notion gaf 500)". De waarde in S en het veld gaan terug naar leeg en er verschijnt geen label in de rij.
  - **set_partner:** body `{"code":"GOED","action":"set_partner","line_id":2500,"partner_id":1042}` naar `dpac-finance-actions`.
- **Gate** (`admin315/t9_gate.js`):
  - Een oude `localStorage.dpacAdminCode` vóór het laden geeft geen automatisch inloggen (0 fetch-calls) en de sleutel wordt opgeruimd.
  - Een code in `sessionStorage` (verversen in hetzelfde tabblad) logt wel automatisch in (71 rijen).
- **Parser** (t9):
  - Invoer: lege regels, spaties, `150,50`, `1.234,5`, `€ 1.500`, `01-11-2026` en `Binnen`. Uitkomst: 4 nette termijnen.
  - Formaten: `eurT(150)="€ 150"`, `eurT(150.5)="€ 150,50"`.
  - Datums: `plusMaand("2026-01-31")="2026-02-28"`.
- **Transities:** `transition-duration` is 0,15 s (kleur, rand, opacity) en 0,12 s (`transform`, `:active`-schaal) op tabs, KPI's, rijen, knoppen, namen en de checkknop.
- **Regressie:** `tools/flow_admin.js` geeft 36/36 PASS.
  - Tijdens de bouw faalden er eerst 2. "kpi ernstig → filter" kwam doordat de nieuwe knop voor in de DOM stond; die staat nu achteraan en wordt met CSS `order` vooraan getoond.
  - "390 geen horizontale scroll" (Overzicht 396 px) kwam doordat de naamcel in de bonustabel vet was geworden. Opgelost, plus `.grid2>*{min-width:0}`.

## Open punten / niet getest
- **Endpoint niet live getest.** Schrijven en set_partner zijn niet tegen de echte endpoints getest, alleen met een nagebootste `fetch` (bewust: geen testwijzigingen in echte Notion- of Odoo-data). Het contract zegt "al live getest".
- **Datumvelden in headless Chrome:** de native `<input type="date">` toont daar `mm/dd/yyyy` (en-US). In een Nederlandse browser is dat `dd-mm-jjjj`. Alle labels gebruiken zelf `DD-MM-JJJJ`.
- **Mollie-bundels:** zoals in finance/ herkent `isMollie` die aan "mollie" in omschrijving of partnernaam. In de testdata staan 68 regels met `journal:"Mollie"` zonder dat woord; die vallen onder "Overige" (103). Met echte data controleren of de `journal`-kolom mee moet tellen.
- **Notitie bij een mislukte opslag:** de waarde in S gaat terug, maar de tekst blijft in het veld staan (met de melding "Niet opgeslagen…"), zodat Michelle niets kwijtraakt. De volgende blur probeert opnieuw.
- **Betaalafspraak lokaal aangepast:** tot de volgende stand rekent het dashboard zelf of de leerling op de werklijst hoort (`op_betaallijst` → `null`). De Notion-formule neemt het daarna weer over.
