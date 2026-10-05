# Admin-dashboard — voor Michèle

Doel: elke ochtend in één blik zien **wie vandaag achteraan moet** (betalingen), wat al gestuurd is en welke afspraak loopt.
Michèle vult per leerling in via het zijpaneel; dat schrijft direct naar Notion Leerlingen.

- **Geschiedenis:** nachtbouw 30 sep 2026, Hermes. Uitgebreid in DPAC-315 (okt 2026): zijpaneel met schrijven naar Notion, "Vandaag betaling checken", labels in de werklijst en tab Afletteren (uit finance/).
- **Status:** frontend klaar en getest (zie `TESTVERSLAG.md`). Het endpoint draait (lezen + schrijven).
- **Lokaal bekijken:** `admin/?local=1` laadt `admin_data.json` (fictief, generator `tools/gen_admin_fixture.py`). Schrijven gebeurt dan alleen in deze browser (`localStorage.dpacAdminLocalEdits`), met de TESTDATA-balk en een "demo"-label in het paneel.
- **Tests:** `node tools/admin315/run_all.js` (servers op 8787/8788, zie TESTVERSLAG).

## Tabbladen
- 📞 **Werklijst** — Notion-formule "Op betaallijst": Loopt ernstig achter → Loopt achter → Nog niets → Checken; hoogste openstaand eerst. Een lopende betaalafspraak staat niet op de lijst en komt de dag erna vanzelf terug. Het vinkje "gedaan" geldt alleen voor vandaag op dit apparaat.
  - **Knop "Vandaag betaling checken · N"** (eerste tegel naast de KPI's): leerlingen met `betaalafspraak_tot` = vandaag. Klik geeft een inline lijst met een vinkje per naam. Afvinken laat N dalen en wordt onthouden tot middernacht (`localStorage.dpacAdminChecked = {d, ids}`). Bij N = 0 is de knop gedempt: "Vandaag niets te checken".
  - **Labels bij de naam:**
    - `Herinnering gestuurd: DD-MM-JJJJ`
    - `Aanmaning gestuurd: DD-MM-JJJJ` (rood-gedempt)
    - `◎` = schuldhulpverlening (alleen in de `title`)
    - eerstvolgende open termijn + "nog te betalen" (datum rood als die al voorbij is)
- ⏳ **Eerste betaling** — actief zonder betaalstatus; de salesrep is eigenaar tot de eerste termijn binnen is.
- 📅 **Afspraken** — lopende betaalafspraken (morgen/vandaag gemarkeerd) en verlopen afspraken.
- 🔎 **Checken** — Moneybird-tijd: betaald bedrag nakijken en in Notion zetten.
- 👥 **Alle leerlingen** — sorteerbare tabel, zoeken, klas- en statusfilter. Klik op een rij klapt die uit; klik op een naam opent het paneel.
- 📊 **Overzicht** — betaalstand per klas/cohort (klik door), bonus nog niet uitgekeerd (voor Abel), hygiëne (wat in Notion ontbreekt).
- 🔗 **Afletteren** — overgenomen uit `finance/app.js` (geen iframe):
  - onafgeletterde bankbetalingen per leerling, met het score-model (partner, IBAN-historie, achternaam/voornaam, factuurnummer, bedrag)
  - Mollie-bundels en overige betalingen
  - "🔗 Bekijk in Odoo" opent de bankaflettering met de zoekterm op het klembord
  - "👤 Klant op betaling" zet via `set_partner` de klant op de bankregel in Odoo

  Hiermee kan `finance/` weg.

## Zijpaneel per leerling (klik op een naam, in elke tab)
Het paneel schuift rechts in (max 480 px, mobiel schermvullend). Sluiten met ×, Esc of een klik buiten het paneel.
- **Kop:** naam, klas, betaalstatus, openstaand en "Open in Notion".
- **Betaalafspraak tot:** datumveld + Vandaag + Wissen. De leerling komt op die dag terug ("Vandaag betaling checken").
- **Segmenten:**
  - **Herinnering** en **Aanmaning**: datumveld + Vandaag + Wissen.
  - **Betaaltermijnen**: per regel binnen/open, bedrag en datum, plus ×. "+ Termijn" neemt de laatste datum + 1 maand en het vorige bedrag. Daaronder "Nog te betalen".
- **Notitie:** groeit mee, slaat op 800 ms na de laatste toets en bij blur. Daaronder, alleen-lezen, "Eerdere afspraken (Notion)" (de `tijdlijn`).
- **Schuldhulpverlening:** vinkje.

Alles slaat direct op ("Opgeslagen ✓" 1,5 s). De rij wordt meteen lokaal bijgewerkt (optimistic). Bij een fout verschijnt een melding in het paneel en gaat de waarde terug; bij de notitie blijft de getypte tekst staan.

## Toegang
- Zelfde toegangscode-gate als voorheen; het codeveld is `type="text"` met `autocomplete="off"`.
- **Nooit automatisch inloggen via localStorage** (DPAC-regel). Een oude `localStorage.dpacAdminCode` wordt bij het laden opgeruimd.
- Alleen `sessionStorage` onthoudt de code, zodat verversen binnen hetzelfde tabblad werkt.

## Datacontract `POST https://dpac.app.n8n.cloud/webhook/dpac-admin-data`
Header `Content-Type: text/plain`, body JSON.

**Lezen:** `{"code":"…"}` geeft:
```json
{"gen":"…","student_cols":[…],"students":[[…],…],"inv_cols":[…],"invoices":[[…],…],"bank_cols":[…],"bank":[[…],…],"counts":{…}}
```
Een foute code geeft `{"error":"unauthorized"}` (HTTP 200).

**Kolommen in `student_cols`** (volgorde vrij):
- **Basis:** `id` (Notion page id), `naam`, `klas`, `cohort`, `actief` (Actief/Oud-leerling/Gestopt), `betaalstatus` (Notion select).
- **Geld en afspraak:**
  - `trajectbedrag`, `betaald` (Odoo leidend, anders Notion), `openstaand`, `betaalwijze`
  - `betaalafspraak_tot` (YYYY-MM-DD of null; Michèle noemt dit "betaalafspraak tot")
  - `op_betaallijst` (Notion-formule, bool; null = dashboard rekent zelf)
- **Inschrijving en verkoop:** `inschrijfdatum`, `bedenktijd_rest` (dagen), `salesrep`, `bonus_uitgekeerd` (bool/null), `producten` (array).
- **Bron:** `bron` (odoo/moneybird), `betaald_odoo`, `betaald_notion`.
- **Contact en links:** `email`, `telefoon`, `link_notion`, `link_odoo`, `link_moneybird`, `link_ghl`.
- **Tekst:** `notitie` (Notitie administratie), `tijdlijn` (Betaalafspraken tijdlijn), `gewijzigd`.
- **Nieuw (DPAC-315):** `herinnering`, `aanmaning` (YYYY-MM-DD), `schuldhulp` (bool), `termijnen` (tekst), `status_uitgebreid`, `leerlingstatus`, `odoo_partner_id` (koppelt Afletteren aan de leerling).

**Facturen en bank** (voor Afletteren):
- `inv_cols` = `id,name,pid,pname,date,due,total,residual,ps,jid` (jid 8 = Producer Academie)
- `bank_cols` = `id,date,amount,ref,pid,pname,journal,rec`

**Schrijven:** `{"code":"…","actie":"schrijf","page_id":"<id>", …velden}` geeft `{"ok":true,"page_id":…}`.
- Alleen meegestuurde velden worden gezet; `null` of `""` maakt een veld leeg.
- Velden: `notitie` (tekst), `herinnering`, `aanmaning` en `betaalafspraak_tot` (YYYY-MM-DD), `schuldhulp` (bool), `termijnen`.
- `termijnen` is één regel per termijn: `YYYY-MM-DD|bedrag|open` of `YYYY-MM-DD|bedrag|binnen`, bedrag met punt-decimaal.
- De parser is tolerant: lege regels, spaties, komma-decimaal, `€`, duizendtal-punten en `DD-MM-JJJJ` worden allemaal geaccepteerd.

**Afletteren-actie:** `POST https://dpac.app.n8n.cloud/webhook/dpac-finance-actions`, body `{code, action:"set_partner", line_id, partner_id}`, geeft `{"ok":true,"partner":"…"}`.

**Bronnen:** Notion-database Leerlingen (`2a14a076-0bf7-4b5e-b410-a440e012265c`) + Odoo (bestaande finance-datalaag `fin_invoices`/`fin_bank_lines`).
