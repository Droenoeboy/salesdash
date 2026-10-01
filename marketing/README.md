# marketing-v5-preview — mock-up bovenop marketing v4.0

Overlay: `index.html` laadt `../marketing/` (opmaak + app.js) en legt `preview.js` erover. Geen kopie van de code; het echte product is onaangeraakt.
Lokaal: `?local=1` met `mkt_data.json` (fictief, `tools/gen_mkt_fixture.py`).

Ronde 1 (2 recensenten, vreemde, oog) → doorgevoerd: regenboogstreep en emoji's weg, één accentkleur (roze), kleur alleen bij oordeel, delta's klein onder het getal en rechts uitgelijnd, tegel open = boomtabel op die maat, Onbekend grijs onderaan, lege Advies-staat één regel, alarmen grijs.
Ronde 2 → doorgevoerd: kalender-emoji weg, grijze balk lopende week weg, campagnenaam eerst bij "zoekwoord onbekend", lege Advies-staat verbergt knop en alarmen. Recensent: geen ronde 3 nodig.

Keuzes voor Abel (niet gedaan): Advies → Doen als startscherm · platformchips weg · Naar Ger in Adviezen doorvoeren · Totaalrij weg · weeklijn op gekozen periode.
Telling: 41 → 41 klikbaar op Cijfers; 0 console-fouten; 390 px zonder overflow.
Grootste punt (alle beoordelaars): het AI-advies moet per regel advertentie + bedrag noemen (prompt workflow 21), anders is Advies leeg van betekenis.

## Kleurregel kleine aantallen (Abel, 1 okt): snel belonen, langzaam straffen
- Foutloos met minstens 2 (2 van 2, 3 van 3): altijd groen.
- 1 van 1: groen bij klanten; bij Plan/Show alleen als de rij onder € 150 kostte.
- Verder: groen als de 80%-ondergrens (Wilson) boven het lijsttotaal ligt; rood pas als de 90%-bovengrens eronder ligt. 0 van 5 blijft wit, 0 van 40 wordt rood.
- Sortering op percentage, hoogste bovenaan. Hover op het percentage zegt waarom (bijv. "3 van 9 · zelfs met geluk onder 60%").
- Euro-lijsten (Kosten, Kosten/klant) ongewijzigd: tegen plafond € 1.700 (groen ≤ 85%, rood > 125%).
