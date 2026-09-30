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
