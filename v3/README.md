# Sales v3 (nachtbouw 30 sep 2026, Hermes)

Laag bovenop de v2-motor. `engine_a.js` en `engine_b.js` zijn byte-identieke kopieën van `v2/app_a.js` en `v2/app_b.js`
(rekenlogica ongewijzigd). `app.js` voegt het startscherm 📊 Week toe en verandert alleen weergave:

- 📊 Week: tegels (leads, gepland, shows, no-shows, ingeschreven, betaald) en rates (plan, show, sign, pay, slot, reactietijd),
  kleur t.o.v. het 4-weeks gemiddelde van dezelfde weekdagen, pijl t.o.v. vorige week, oordeel in één zin,
  per persoon, nu doen (bellijst per reden), top-3 adviezen. Elk getal klikt door naar de bestaande namentabel.
- KPI-rij alleen nog op Totaal en Team (elke andere tab heeft zijn eigen kop).
- Alle v2-tabs, filters, details, rollen/per-rep en de code-gate werken ongewijzigd.

Lokaal testen: `?local=1` met `dashboard_data.json` (fixture: `tools/gen_sales_fixture.py`, fictieve namen).
Cache-bust: `index.html?v=` op de drie scripts.
