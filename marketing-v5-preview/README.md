# marketing-v5-preview — mock-up bovenop marketing v4.0

Overlay: `index.html` laadt `../marketing/` (opmaak + app.js) en legt `preview.js` erover. Geen kopie van de code; het echte product is onaangeraakt.
Lokaal: `?local=1` met `mkt_data.json` (fictief, `tools/gen_mkt_fixture.py`).

Ronde 1 (2 recensenten, vreemde, oog) → doorgevoerd: regenboogstreep en emoji's weg, één accentkleur (roze), kleur alleen bij oordeel, delta's klein onder het getal en rechts uitgelijnd, tegel open = boomtabel op die maat, Onbekend grijs onderaan, lege Advies-staat één regel, alarmen grijs.
Ronde 2 → doorgevoerd: kalender-emoji weg, grijze balk lopende week weg, campagnenaam eerst bij "zoekwoord onbekend", lege Advies-staat verbergt knop en alarmen. Recensent: geen ronde 3 nodig.

Keuzes voor Abel (niet gedaan): Advies → Doen als startscherm · platformchips weg · Naar Ger in Adviezen doorvoeren · Totaalrij weg · weeklijn op gekozen periode.
Telling: 41 → 41 klikbaar op Cijfers; 0 console-fouten; 390 px zonder overflow.
Grootste punt (alle beoordelaars): het AI-advies moet per regel advertentie + bedrag noemen (prompt workflow 21), anders is Advies leeg van betekenis.
