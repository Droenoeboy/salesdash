# Werkwijze voor elke wijziging aan een dashboard in deze repo

Geldt voor Hermes én Claude Code. Geen uitzonderingen, ook niet voor "kleine" fixes.

## Houding
Werk als ervaren developer en UI-designer met de zorgvuldigheid van Apple: helder, consistent, tot in detail afgewerkt.
Onderzoek eerst de bestaande code en het ontwerp. Begrijp wat al werkt en los de oorzaak op, niet het symptoom.
Lees vóór je bouwt: skill `impeccable` (`/opt/data/skills/dpac/impeccable/SKILL.md`), `dpac-brain/10-bedrijf/brand-kit.md`,
en het domeinbestand van het dashboard (bv. `dpac-brain/40-finance/dashboard-administratie.md`).

## Ontwerpregels (kort)
- Eén blik en je weet het. Elk scherm beantwoordt één of twee vragen. Uitleg achter hover, nooit op het scherm.
- Leger of gelijk: tel klikbare elementen vóór en na (`document.querySelectorAll('button,[onclick],a,select,input').length`). Meer is fout.
- Elk getal staat één keer op het scherm. Geen tegels die herhalen wat tabs of filters al zeggen.
- Huisstijl: koppen/getallen IBM Plex Sans Condensed 700, tekst Barlow 15–16 px, DPAC-roze `#C927B4` alleen voor de hoofdknop en de actieve tab, ijsblauw `#8FD8FF` voor focus. Hoekradius 4 px. Geen emoji's in de UI.
- Kleur is oordeel (rood = ernstig, amber = achter, groen = goed), nooit decoratie.
- Nooit automatisch inloggen (geen code in localStorage).
- Het dashboard schrijft nooit naar Odoo; alleen lezen en linken.

## Drie controlerondes, elke keer, echt uitgevoerd
1. **Functionaliteit** — `node tools/t_admin.js` (fixture, 1440 én 390 px): alle interacties, randgevallen, geen console-fouten, bestaande functies intact. 0 fouten of niet verder.
2. **Ontwerp** — `node tools/shot.js` per scherm op 1440 en 390 px; bekijk de screenshots zelf. Let op hiërarchie, uitlijning, witruimte, typografie, afgekapte tekst, consistentie, tikdoelen ≥ 40 px, horizontaal scrollen.
3. **Eindcontrole als gebruiker** — `DPAC_CODE=… node tools/t_admin_live.js` tegen het echte endpoint: inloggen, rij openen, iets opslaan en terugdraaien, verversen, elke tab. Loop daarna zelf door de belangrijkste handelingen en herstel wat onlogisch, onaf of onrustig voelt.

Zeg nooit dat iets getest is als dat niet zo is. Benoem expliciet wat je niet hebt kunnen verifiëren.
Lever pas op als gevonden problemen zijn opgelost. Oplevering = screenshots + telling klikbare elementen + wat verdween + wat niet geverifieerd is.

## Deploy
Alleen na expliciet "live" van Abel. Merge naar `main`, tag `live-JJJJ-MM-DD-<naam>`, controleer de live URL met een verse fetch (cache-bust) en een screenshot. Daarna brein + CHANGELOG bijwerken en Multica-issue sluiten.
