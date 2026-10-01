# Admin-dashboard (nachtbouw 30 sep 2026, Hermes) — voor Michèle

Doel: elke ochtend in één blik zien **wie vandaag achteraan moet** (betalingen), met per leerling één knop naar Notion.
Het dashboard schrijft nergens naar; Notion Leerlingen blijft de invoerplek. Zelfde toegangscode-gate als finance/.

Status: **frontend klaar en getest** (36/36 clickflow, desktop + mobiel, fictieve data). **Endpoint nog te bouwen** (zie contract).
Lokaal bekijken: `admin/?local=1` laadt `admin_data.json` (fictief, generator `tools/gen_admin_fixture.py`).

## Tabbladen
- 📞 **Werklijst** — Notion-formule "Op betaallijst": Loopt ernstig achter → Loopt achter → Nog niets → Checken; hoogste openstaand eerst. Lopende betaalafspraak = niet op de lijst, komt de dag erna vanzelf terug. Vinkje "gedaan" is alleen voor vandaag op dit apparaat.
- ⏳ **Eerste betaling** — actief zonder betaalstatus; salesrep is eigenaar tot de eerste termijn binnen is.
- 📅 **Afspraken** — lopende betaalafspraken (morgen/vandaag gemarkeerd) + verlopen afspraken.
- 🔎 **Checken** — Moneybird-tijd: betaald bedrag nakijken, in Notion zetten.
- 👥 **Alle leerlingen** — sorteerbare tabel, zoeken, klas/statusfilter.
- 📊 **Overzicht** — betaalstand per klas/cohort (klik door), bonus nog niet uitgekeerd (voor Abel), hygiëne (wat in Notion ontbreekt).

## Datacontract `POST https://dpac.app.n8n.cloud/webhook/dpac-admin-data`
Body `{"code":"…"}` (zelfde gate-patroon als dpac-finance-data). Antwoord:
```json
{"gen":"2026-09-30T22:30:00+02:00","student_cols":[…],"students":[[…],…]}
```
Kolommen (`student_cols`, volgorde vrij): `id` (Notion page id), `naam`, `klas`, `cohort`, `actief` (Actief/Oud-leerling/Gestopt),
`betaalstatus` (Notion select), `trajectbedrag`, `betaald` (Odoo leidend, anders Notion), `openstaand`, `betaalwijze`,
`betaalafspraak_tot` (YYYY-MM-DD of null), `op_betaallijst` (Notion-formule, bool; null = dashboard rekent zelf),
`inschrijfdatum`, `bedenktijd_rest` (dagen), `salesrep`, `bonus_uitgekeerd` (bool/null), `producten` (array),
`bron` (odoo/moneybird), `betaald_odoo`, `betaald_notion`, `email`, `telefoon`,
`link_notion`, `link_odoo`, `link_moneybird`, `link_ghl`, `notitie` (Notitie administratie), `tijdlijn` (Betaalafspraken tijdlijn), `gewijzigd`.

Bron: Notion-database Leerlingen (`2a14a076-0bf7-4b5e-b410-a440e012265c`) + Odoo (bestaande finance-datalaag).
Bouwen als n8n-workflow naast wf-finance: Notion query (alle rijen, pagineren) → Odoo-match op e-mail → samenvoegen → JSON.

## n8n-workflow bouwen

Nieuwe workflow naast wf-finance, tag `dashboard`. Stappen:

1. **Webhook** (POST, path `dpac-admin-data`) — ontvangt `{"code":"…"}`.
2. **Code-node "Check access code"** — vergelijkt `body.code` met de vaste
   toegangscode (zelfde patroon als wf13/wf14: code staat alleen in deze
   node, nooit in het brein); bij mismatch meteen `Respond to Webhook` met
   401 `{"error":"unauthorized"}`.
3. **HTTP Request "Notion: query Leerlingen"** — POST naar de Notion
   database-query van database-id `2a14a076-0bf7-4b5e-b410-a440e012265c`,
   credential "Notion account", header `Notion-Version: 2022-06-28`, geen
   filter (alle rijen), `page_size` 100.
4. **IF "has_more"** → **Code-node "Zet start_cursor"** → terug naar stap 3
   (paginatielus, zelfde patroon als wf36/wf40).
5. **Code-node "Verzamel Notion-rijen"** — leest alle paginatie-runs
   (`$('Notion: query Leerlingen').all(0, runIndex)`) tot één platte lijst.
6. **HTTP Request / Postgres "Odoo-data"** — hergebruikt de bestaande
   finance-datalaag (`fin_invoices`/`fin_bank_lines`) voor betaald/openstaand.
7. **Code-node "Match op e-mail"** — koppelt elke Notion-rij aan zijn
   Odoo-regel via e-mailadres; zet `bron` op `odoo` bij match, anders
   `moneybird` (Notion blijft leidend bij geen match).
8. **Code-node "Map naar contract"** — zet de Notion-properties plus de
   Odoo-match om naar `student_cols`/`students` (zie datacontract hierboven)
   en zet `gen` op de huidige ISO-timestamp.
9. **Respond to Webhook** (`respondWith: json`) — stuurt
   `{"gen":…, "student_cols":…, "students":…}` terug.
