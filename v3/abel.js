// v3 · wensen Abel 1 okt 2026 (avond), Hermes. Laag bovenop engine_a/b, app.js, clean.js, ai.js. Uit te zetten door dit script uit index.html te halen.
// 1 emoji's terug op de tabs · 2 Totaal: teamchips (namen aan/uit) en Fysiek/Google Meet terug · 3 KPI-pillen licht gekleurd zodat je ziet dat het knoppen zijn
// 4 Team: subkeuze Verlies vooraan met uitleg, Trend met bolletjes om over te hoveren · 5 Advies: twee knoppen zoals marketing (zit in ai.js; hier alleen de staat zonder n8n)
// 6 Log: alleen totaal-overzicht met naamfilter + per persoon uitklappen per uur · 7 geen automatisch inloggen met een onthouden code

// ---- 7. geen automatische login: onthouden code wissen, nooit meer stil inloggen ----
try { localStorage.removeItem("dpacSalesCode"); sessionStorage.removeItem("dpacSalesCode"); } catch (e) {}
const _aGTry = gTry;
gTry = async function (code, stil) {
  const r = await _aGTry(code, stil);
  try { localStorage.removeItem("dpacSalesCode"); sessionStorage.removeItem("dpacSalesCode"); } catch (e) {}
  return r;
};

(function () {
  const st = document.createElement("style"); st.id = "abelcss";
  st.textContent = `
  /* 3. pillen: lichte tint van de stapkleur, zodat het zichtbaar knoppen zijn (niet schreeuwend) */
  .blk.p,.outN.p{background:color-mix(in srgb,var(--plan) 10%,var(--card))!important} .blk.p .lab,.blk.p .pct{color:var(--plan-tx)!important}
  .blk.h,.outN.h{background:color-mix(in srgb,var(--show) 12%,var(--card))!important} .blk.h .lab,.blk.h .pct{color:var(--show-tx)!important}
  .blk.s,.outN.s{background:color-mix(in srgb,var(--sign) 10%,var(--card))!important} .blk.s .lab,.blk.s .pct{color:var(--sign-tx)!important}
  .blk.i,.outN.i{background:color-mix(in srgb,var(--sign) 7%,var(--card))!important}
  .blk.c,.outN.c{background:color-mix(in srgb,var(--close) 9%,var(--card))!important} .blk.c .lab,.blk.c .pct{color:var(--close-tx)!important}
  .blk.b,.outN.b{background:color-mix(in srgb,var(--pay) 12%,var(--card))!important} .blk.b .lab,.blk.b .pct{color:var(--pay-tx)!important}
  .blk{cursor:pointer;transition:filter .12s} .blk:hover{filter:brightness(1.12)}
  .blk.goed{box-shadow:inset 3px 0 0 #1a9a3d} .blk.slecht{box-shadow:inset 3px 0 0 #dc2a1e}
  /* 2. teamchips en intake-chips terug op Totaal */
  #cols .teamchips{display:flex!important}
  /* 4. trend: bolletjes zichtbaar, hover toont waarde */
  #trendwrap svg circle.pt{fill:var(--card);stroke:currentColor;stroke-width:2;r:4} #trendwrap svg circle.pt:hover{r:6}
  #trendwrap svg .pt{color:var(--txt)}
  .verliesuitleg{font-size:13px;color:var(--mut);margin:-4px 0 12px}
  /* 6. log: eenvoudiger */
  #dagwrap .note,#dagwrap .weekcard .chsub,#dagwrap .dgkies>span[style]{display:none!important}
  .logtop{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin:0 0 12px;box-shadow:var(--shadow)}
  .logtop .lk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
  .logtop .lk h3{margin:0;font-size:15px}
  .logtot{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}
  .logtot div{border:1px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0}
  .logtot b{font-size:20px;display:block;font-variant-numeric:tabular-nums;letter-spacing:-.3px} .logtot span{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;font-weight:600}
  .logtot div.rood b{color:var(--close-tx)} .logtot div.groen b{color:var(--sign-tx)}
  .dgcard .dgsum,.dgcard .dgbalk,.dgcard .dgcrm{display:none!important}
  .dgcard .dghead b{font-size:15px} .dgcard .dgkort{margin-left:auto;font-size:12.5px;color:var(--mut);font-variant-numeric:tabular-nums;white-space:nowrap}
  .dguur{cursor:pointer} .dguur:hover{background:color-mix(in srgb,var(--txt) 4%,transparent)}
  @media(max-width:640px){.logtot{grid-template-columns:repeat(3,1fr)} .dgcard .dgkort{display:none}}
  `;
  document.head.appendChild(st);
})();

// ---- 1. emoji's terug op de tabs (clean.js haalt ze weg; hier zetten we ze terug met vaste iconen) ----
const TAB_ICO = { "Totaal": "📊", "Team": "⚖️", "Intakes": "🗓", "Gewonnen": "🏆", "Verloren": "🚫", "Advies": "⚡", "Log": "📅", "Marketing ↗": "📣" };
const _aTabs = drawTabs;
drawTabs = function () {
  _aTabs();
  const el = document.getElementById("tabs"); if (!el) return;
  [...el.querySelectorAll(".tab")].forEach(t => { const txt = t.textContent.trim(); const ico = TAB_ICO[txt]; if (ico && !t.dataset.ico) { t.dataset.ico = "1"; t.insertBefore(document.createTextNode(ico + " "), t.firstChild); } });
};
// clean.js verwijdert emoji's uit koppen na elke tekening; de tabbalk slaan we over door de iconen na cleanEmoji opnieuw te plaatsen
const _aClean = cleanEmoji;
cleanEmoji = function (root) { if (root && root.id === "tabs") return; _aClean(root); };

// ---- 2. Totaal: teamchips (aan/uit per naam) en Fysiek / Google Meet terug ----
// clean.js verbergt ze via CSS (#cols .teamchips); hierboven weer aangezet. De motor tekent ze al (teamChipsHtml + kindChipsHtml).

// ---- 4. Team: Verlies vooraan met uitleg; Trend hoverbaar ----
const _aTeamSub = teamSubHtml;
teamSubHtml = function () {
  let h = _aTeamSub();
  // volgorde: Vergelijk · Verlies · Trend
  const verlies = h.match(/<div class="wchip sm[^"]*" onclick="tab='verlies'[^>]*>Verlies<\/div>/); const trend = h.match(/<div class="wchip sm[^"]*" onclick="tab=&quot;trend&quot;[^>]*>[^<]*Trend<\/div>/);
  if (verlies && trend) { h = h.replace(verlies[0], "").replace(trend[0], verlies[0] + trend[0]); }
  return h;
};
const _aVerlies = drawVerlies;
drawVerlies = function () {
  _aVerlies();
  const cw = document.getElementById("cmpwrap"); const h3 = cw && cw.querySelector(".cmp h3"); if (!h3 || cw.querySelector(".verliesuitleg")) return;
  const p = document.createElement("p"); p.className = "verliesuitleg";
  p.textContent = "Per persoon: welk deel van zijn leads valt af in welke stap. Groen = minder verlies dan het team, rood = meer. Klik een cel voor de namen en de redenen.";
  h3.insertAdjacentElement("afterend", p);
};
// trend: de motor tekent onzichtbare cirkels alleen als er een klik-handler is; wij geven elke lijn een bolletje met hovertekst
const _aSvgLine = svgLine;
svgLine = function (series, o) {
  const s2 = series.map(se => se.click ? se : Object.assign({}, se, { click: () => "void 0" }));
  return _aSvgLine(s2, o);
};

// ---- 6. Log: bovenaan totaal (filter op naam), daaronder per persoon uitklappen per uur ----
let logWho = null;
const _aDag = drawDag;
drawDag = function () {
  _aDag();
  const dw = document.getElementById("dagwrap"); if (!dw) return;
  // weektabel en samenvatting per rep weg: te veel in één keer (Abel 1 okt)
  [...dw.querySelectorAll(".weekcard")].forEach(x => x.remove());
  // bovenaan: totaal van de dag, filter op naam
  const d = dagSel; const evts = EV.filter(e => e.dag === d && (!logWho || e.rep === logWho));
  const who = l => logWho ? (l.setter === logWho || l.owner === logWho || l.intaker === logWho) : true;
  const nieuw = L.filter(l => l.cd === d && who(l)).length, gepland = L.filter(l => l.stage_position !== 0 && l.pd === d && who(l)).length;
  const apts = AP.filter(a => a.sd === d && (!logWho || a.rep === logWho || a.intaker === logWho || a.setter === logWho));
  const show = L.filter(l => l.id_ === d && l.is_show && who(l)).length, verloren = L.filter(l => l.lost && l.scd === d && who(l)).length, sign = L.filter(l => l.is_signed && l.insE === d && who(l)).length;
  const bel = evts.filter(e => e.d && e.d.cat === "set").length;
  const namen = [...new Set(EV.filter(e => e.dag === d).map(e => e.rep).filter(Boolean))].sort();
  const chip = (lab, v) => `<div class="wchip sm${logWho === v ? " on" : ""}" onclick="logWho=${v === null ? "null" : jq(v)};drawDag()">${esc(lab)}</div>`;
  const tile = (n, lab, cls) => `<div class="${cls || ""}"><b>${n}</b><span>${lab}</span></div>`;
  const top = document.createElement("div"); top.className = "logtop";
  top.innerHTML = `<div class="lk"><h3>${logWho ? esc(logWho) : "Iedereen"} · ${fmtY(d)}</h3><div class="wonchips" style="margin:0 0 0 auto">${chip("iedereen", null)}${namen.map(n => chip(n, n)).join("")}</div></div>
    <div class="logtot">${tile(nieuw, "nieuwe leads")}${tile(bel, "belpogingen")}${tile(gepland, "intakes gepland")}${tile(apts.length, "intakes op de dag")}${tile(show, "shows", show ? "groen" : "")}${tile(sign, "ingeschreven", sign ? "groen" : "")}${tile(verloren, "verloren", verloren ? "rood" : "")}</div>`;
  const kies = dw.querySelector(".dgkies"); if (kies) kies.insertAdjacentElement("afterend", top); else dw.prepend(top);
  // per persoon: alleen naam + korte telling; filter op naam verbergt de rest
  [...dw.querySelectorAll(".dgcard")].forEach(c => {
    const naam = (c.querySelector(".dghead b") || {}).textContent || "";
    if (logWho && naam !== logWho) { c.style.display = "none"; return; }
    const n = EV.filter(e => e.dag === d && (e.rep || "(zonder rep)") === naam).length;
    const hd = c.querySelector(".dghead"); if (hd && !hd.querySelector(".dgkort")) { const k = document.createElement("span"); k.className = "dgkort"; k.textContent = n ? `${n} ${n === 1 ? "actie" : "acties"}` : "geen acties met tijd"; hd.appendChild(k); }
  });
  // lege staat één regel
  const leeg = dw.querySelector(".dgleeg"); if (leeg) leeg.textContent = "Geen activiteit op deze dag.";
};
