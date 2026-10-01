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

## 🤖 Sales-AI-adviseur (1 okt 2026)
Laag `ai.js` (uit te zetten door de script-tag te verwijderen). Tab **Advies**: bovenaan het AI-advies, daaronder het bestaande rekenadvies.
- 🤖 **Adviezen doorlopen**: AI-wachtwoord → `POST /webhook/dpac-sales-ai-adviseur` `{code, ww, model}` (401 = wachtwoord fout) → n8n **22 · Sales · AI adviseur** (`hV9K7f9mJ9oSHIm3`) → Claude → `dpac.sales_ai_advice`. Dashboard pollt elke 15 s.
- Per advies: afvinken, opmerking, 📨 **Naar Django** (Slack-DM via de bot; eerst voorbeeld). Opslag: `dpac.sales_followups` via `POST /webhook/dpac-sales-ai-data` `{code, action: get|sync|send}`.
- Vaste punten: `dpac.sales_ai_vaste_punten` (bel binnen 5 min, intake binnen 48 uur, bevestigen, 7 contactmomenten).
- Prompt v1.1 = v1 van Abel + Django als lezer/doorsturer, rollen uit het brein, alleen actieve mensen, sluiten op wie de intake deed, geen gedachtestreepjes.
- Demo: `?local=1` leest `sales_ai_demo.json` (geanonimiseerd).
