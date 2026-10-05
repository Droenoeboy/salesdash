# Administratie-dashboard (`admin/`) — voor Michèle

Eén scherm: **wie moet vandaag achteraan**, wat is al gestuurd, welke afspraak loopt. Klik een naam → zijpaneel; alles wat je daar invult gaat direct naar Notion Leerlingen.

Werkwijze voor elke wijziging: `../WERKWIJZE.md` (drie controlerondes, verplicht).

## Scherm
- **Kop:** titel, stand, zoekveld (zoekt in alle leerlingen), ververs.
- **Tabs:** Werklijst · Eerste betaling · Afspraken · Afletteren. Elk aantal staat één keer, in de tab.
- **Werklijst:** totaal open + knop **Vandaag betaling checken · N** (leerlingen met `Betaalafspraak tot` = vandaag; vinkjes gelden alleen vandaag, op dit apparaat). Daaronder statusfilter, klas-dropdown en de lijst: ernstig eerst, dan hoogste bedrag.
- **Rij:** naam, klas · betaalwijze, labels *Herinnering gestuurd: DD-MM-JJJJ* / *Aanmaning gestuurd: DD-MM-JJJJ* / **€ bedrag op datum** · nog € totaal; rechts openstaand en status. ◎ = schuldhulpverlening (hover voor uitleg).
- **Zijpaneel:** Betaalafspraak tot, Herinnering gestuurd, Aanmaning gestuurd (datum + Vandaag/Wissen), Betaaltermijnen (bedrag, datum, vinkje binnen, verwijderen; "Nog te betalen"), Notitie (slaat op na 0,8 s typen), Schuldhulpverlening, links (Notion, Odoo, Moneybird, bellen, mail), kerngegevens, eerdere afspraken uit Notion.
- **Afletteren:** overgenomen uit het oude finance-dashboard. Alleen kijken en "Bekijk in Odoo" (naam op klembord). Het dashboard schrijft niets naar Odoo.

## Data
- Endpoint `dpac-admin-data` (n8n). Lezen: `{code}` → `student_cols/students`, `inv_cols/invoices`, `bank_cols/bank`, `gen`. Schrijven: `{code, actie:"schrijf", page_id, ...velden}` → `{ok:true}`.
- Notion-velden die het paneel schrijft: `Betaalafspraak tot`, `Admin: Herinnering gestuurd`, `Admin: Aanmaning gestuurd`, `Admin: Betaaltermijnen` (regel per termijn `JJJJ-MM-DD|bedrag|open|binnen`), `Admin: Notitie`, `Admin: Schuldhulpverlening`.
- Toegangscode alleen in `sessionStorage` (dit tabblad). Nooit automatisch inloggen.
- Lokaal: `admin/?local=1` laadt `admin_data.json` (fictief; generator `tools/gen_admin_fixture.py`); schrijven blijft dan in deze browser.

## Tests (map `tools/` naast deze repo)
- `node t_admin.js` — functioneel, fixture, 1440 + 390 px (48 checks).
- `node shot.js <url> <png> [w] [h] [js]` — screenshots voor de ontwerpronde.
- `DPAC_CODE=… node t_admin_live.js` — echte data: inloggen, schrijven + terugdraaien, verversen, tabs.
