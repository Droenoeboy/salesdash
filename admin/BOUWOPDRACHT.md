# Bouwopdracht: Administratie-dashboard voor Michelle (DPAC-315)

Je werkt in `/opt/data/workspace/dpac-nacht/salesdash/admin/`. Bestaand: `index.html` + `app.js` (werkend dashboard, vanilla JS, geen build, één bestand per laag). Breid dit uit; behoud ALLE bestaande tabbladen, functies en stijl (CSS-variabelen in index.html). Geen frameworks, geen npm, geen build-stap. Nederlands in alle UI-tekst.

## Wie en waarom
Michelle doet de administratie van een muziekacademie. Elke ochtend wil ze in één blik zien: wie moet ik vandaag achternazitten, wat heb ik al gestuurd, welke afspraak loopt. Ze is geen techneut. Alles wat ze invult moet bewaard blijven (in Notion, via het endpoint) en er na herladen nog staan.

## Data (contract — al live getest)
`POST https://dpac.app.n8n.cloud/webhook/dpac-admin-data`, header `Content-Type: text/plain`, body JSON.
- Lezen: `{"code":"…"}` → `{gen, student_cols, students[][], inv_cols, invoices[][], bank_cols, bank[][], counts}`.
  Foute code → `{"error":"unauthorized"}` (HTTP 200).
- Schrijven: `{"code":"…","actie":"schrijf","page_id":"<id>", ...velden}` → `{"ok":true,"page_id":…}`.
  Velden (alleen meegestuurde worden gezet; `null` of `""` maakt leeg):
  `notitie` (tekst), `herinnering` (YYYY-MM-DD), `aanmaning` (YYYY-MM-DD), `schuldhulp` (bool),
  `termijnen` (tekst, één regel per termijn: `YYYY-MM-DD|bedrag|open` of `…|binnen`), `betaalafspraak_tot` (YYYY-MM-DD).
- Lokaal testen: `?local=1` laadt `admin_data.json` (fictief, zelfde vorm). In local-modus schrijven = alleen in geheugen + `localStorage.dpacAdminLocalEdits` (zodat de flow testbaar is), met een zichtbaar "demo"-label.

Nieuwe student-kolommen (naast de bestaande): `herinnering`, `aanmaning`, `schuldhulp`, `termijnen`, `status_uitgebreid`, `leerlingstatus`, `odoo_partner_id`.
"Betaling checken"-datum = bestaande kolom `betaalafspraak_tot` (Michelle noemt dit "betaalafspraak tot"; de leerling komt op die dag terug).

Na elke succesvolle schrijfactie: pas de rij in `S` direct lokaal aan (optimistic) en render; bij fout: melding in het paneel, waarde terugzetten. Geen volledige herlaad nodig.

## Wat er bij moet komen (exact dit, niet meer)

### A. Knop "Vandaag betaling checken · N" (op de Werklijst-tab, bovenaan, naast de KPI's)
- N = aantal leerlingen met `betaalafspraak_tot` == vandaag, min de leerlingen die vandaag al zijn afgevinkt.
- Klik → inline lijst (geen modal) met naam + vinkje. Aanvinken: N daalt met 1, de leerling blijft vandaag "gecheckt" (`localStorage.dpacAdminChecked = {d:"YYYY-MM-DD", ids:[…]}`; andere dag = leeg).
- Naam in die lijst is klikbaar → opent het zijpaneel (C).
- N == 0 → knop gedempt met "Vandaag niets te checken".

### B. Labels in de werklijst-rijen (bestaande `row()`)
Bij de naam, als chips in de bestaande stijl (`.tag`/`.chip`, klein, gedempt):
- `Herinnering gestuurd: DD-MM-JJJJ` als `herinnering` gevuld.
- `Aanmaning gestuurd: DD-MM-JJJJ` als `aanmaning` gevuld (rood-gedempt, want ernstiger).
- Schuldhulp: klein neutraal icoontje (bv. `◎` of een SVG-cirkel, kleur `var(--mut)`), `title="Schuldhulpverlening"`. Geen tekst, geen felle kleur.
- Termijnen: als er open termijnen zijn: `<b>€ 150 op 01-11-2026</b> · nog te betalen € 600` (eerstvolgende open termijn op datum, totaal = som van alle open termijnen). Termijn met datum in het verleden en nog open: datum in `var(--red-tx)`.
- Datumformaat overal in deze labels: `DD-MM-JJJJ`.

### C. Zijpaneel per leerling (klik op naam in élke tab)
Rechts inschuivend paneel (max 480 px, mobiel volledig scherm), sluiten met ×, Esc en klik buiten. Bovenin: naam, klas, betaalstatus, openstaand, knop "Open in Notion" (bestaande link). Daaronder drie segmenten (één rij knoppen, zoals de tabs): **Herinnering · Aanmaning · Betaaltermijnen**. Daaronder altijd zichtbaar: **Notitie**, en helemaal onderaan één vinkje "Schuldhulpverlening".

- **Herinnering**: datumveld (`<input type="date">`) + knop "Vandaag" + knop "Wissen". Opslaan direct bij wijziging (geen aparte opslaan-knop), met "Opgeslagen ✓" 1,5 s in het paneel.
- **Aanmaning**: idem.
- **Betaaltermijnen**: lijst van termijnen (vinkje binnen/open, bedrag in €, datum), bewerkbaar inline; knop "+ Termijn" (datum standaard = laatste termijn + 1 maand, bedrag = vorige bedrag), verwijderen per regel (×). Onder de lijst: "Nog te betalen: € …" (som open). Elke wijziging wordt als `termijnen`-tekst opgeslagen (regels `YYYY-MM-DD|bedrag|open|binnen`). Parser moet tolerant zijn (lege regels, spaties, komma-decimaal).
- **Notitie**: `<textarea>` met de bestaande `notitie`, auto-groeiend, opslaan 800 ms na laatste toetsaanslag (debounce) én bij blur. Onder de notitie, kleiner en gedempt, de bestaande `tijdlijn`-tekst (alleen-lezen, label "Eerdere afspraken (Notion)") als die gevuld is.
- **Schuldhulpverlening**: checkbox, opslaan direct.
- Ook in het paneel: "Betaalafspraak tot" (datumveld, zelfde gedrag als Herinnering) — want dat is Michelle's werkmechanisme.

### D. Tab "Afletteren" (finance erin)
Voeg een tabblad **Afletteren** toe (als laatste tab) met de logica van `../finance/app.js` (facturen/bankregels uit `invoices`/`bank` in hetzelfde antwoord). Kopieer de werkende functies uit finance/app.js over (geen iframe), inclusief de `set_partner`-actie naar `https://dpac.app.n8n.cloud/webhook/dpac-finance-actions` (body `{code, action:"set_partner", line_id, partner_id}`), zodat finance/ daarna weg kan. Zelfde code (`GCODE`). Gebruik de bestaande tabs-stijl; geen eigen kleuren.

### E. Toegang
Bestaande gate blijft. Wél verwijderen: automatisch inloggen met `localStorage.dpacAdminCode` (DPAC-regel: nooit automatisch inloggen; alleen `sessionStorage` mag, zodat ververs binnen één tabblad werkt). `type="text"` met `autocomplete="off"` op het codeveld, geen `type="password"`.

## Stijl en UX (hard)
- Eén blik: de werklijst blijft de hoofdvraag ("wie vandaag"). De nieuwe knop en labels dienen die vraag.
- Geen nieuwe kleuren; gebruik de CSS-variabelen uit `index.html`. Rood/oranje/groen alleen als oordeel.
- Klik-doelen ≥ 40 px hoog op mobiel. 390 px breed zonder horizontaal scrollen.
- Elke klikbare plek reageert zichtbaar (hover/active 120–200 ms).
- Geen uitlegteksten op het scherm; uitleg in `title`.
- Datums in labels `DD-MM-JJJJ`; bedragen `€ 1.234` (geen centen) behalve termijnbedragen met centen als ze die hebben (`€ 150,00`).
- Geen console-fouten. Geen externe libraries.

## Testen (verplicht, zelf uitvoeren, resultaten in `TESTVERSLAG.md` in deze map)
Tooling: `node /opt/data/workspace/dpac-nacht/tools/shot.js <url> <out.png> [w] [h] [js]` (Playwright headless; print console-/page-errors). Start een statische server: `cd /opt/data/workspace/dpac-nacht/salesdash && python3 -m http.server 8787 --bind 127.0.0.1 &` en gebruik `http://127.0.0.1:8787/admin/?local=1`.
Schrijf screenshots naar `/opt/data/workspace/dpac-nacht/tools/shots/admin315-*.png`:
1. Werklijst desktop 1440×900 en mobiel 390×844.
2. Knop "Vandaag betaling checken" open, één leerling afgevinkt (teller gedaald) — bewijs via `js`-evaluatie van de tellertekst voor/na.
3. Zijpaneel open met Herinnering gevuld (label verschijnt in de rij), Betaaltermijnen met 3 termijnen (1 binnen), Schuldhulp aan (icoontje in rij).
4. Tab Afletteren desktop.
5. Herladen van de pagina: in local-modus moet de ingevulde herinnering/termijnen/schuldhulp er nog staan (via `localStorage.dpacAdminLocalEdits`).
6. Tel klikbare elementen (`a,button,[onclick],input,select,textarea`) op de Werklijst vóór en ná (vóór = `git stash`-versie of de huidige commit); noteer beide getallen.
Geen enkele screenshot mag console-/page-errors hebben.

## Oplevering
- `README.md` in deze map bijwerken (nieuwe functies, contract, tabs; verwijder "endpoint nog te bouwen").
- Commit op branch `admin-315` met duidelijke boodschap; niet pushen, niet mergen.
- Vat aan het eind in max 10 regels samen: wat gebouwd, wat verdween, tellingen, open punten.
