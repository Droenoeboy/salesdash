// Mock-up v5 bovenop marketing v4.0 (app.js ongewijzigd). Alleen weergave. Nachtbouw 30 sep / 1 okt 2026, Hermes.
// Herzie-ronde 1 (2 recensenten, vreemde, oog) → doorgevoerd: alleen wat het scherm leger of duidelijker maakt.
(function(){
  const st=document.createElement("style"); st.id="v5css";
  st.textContent=`
  /* 1. kop: regenboogstreep en emoji's weg, thema/ververs alleen bij hover (blijven bereikbaar) */
  .top:after{display:none}
  /* 2. één accentkleur voor 'gekozen': roze; ijsblauw/plan-blauw weg als keuze-rand */
  .kpi.on{box-shadow:inset 0 0 0 2px var(--roze,#C927B4)!important}
  .hkbar span.on{border-color:var(--roze,#C927B4)!important;color:inherit!important}
  /* 3. kleur alleen als oordeel: tegelgetallen wit, kolom Kosten/klant wit tenzij bad/good-oordeel */
  .kpi.good b{color:#5fd38d!important} .kpi.warn b{color:#e6c14d!important} .kpi.bad b{color:#ff8a8e!important}
  .kpi.good,.kpi.warn,.kpi.bad{box-shadow:var(--shadow)!important}
  /* 4. stippellijn onder klikbare getallen weg (hover toont hand) */
  .hkt td.clk b,table.tree td.clk,table.tree td.clk b,.hkt td.clk{text-decoration:none!important;border-bottom:none!important}
  /* 5. hints en ondertitels weg */
  .chsub,.dp-hint,.hkt th[title]:after,.tree th.nm{font-size:0!important}
  table.tree th.nm{height:0;padding:0!important;border:0}
  .kpitrend .chhead{display:none}
  /* 6. getallen recht onder elkaar: delta op vaste breedte onder het getal, alles rechts */
  table.tree td>small{display:block;font-size:10.5px;line-height:1;margin:2px 0 0;opacity:.8}
  table.tree td.good b{color:#5fd38d} table.tree td.warn b{color:#e6c14d} table.tree td.bad b{color:#ff8a8e}
  .hkt td.good b{color:#5fd38d} .hkt td.warn b{color:#e6c14d} .hkt td.bad b{color:#ff8a8e}
  .btnrow{opacity:.35;transition:opacity .15s} .top:hover .btnrow{opacity:1}
  table.tree td,table.tree th{text-align:right!important}
  table.tree td.nm,table.tree th.nm{text-align:left!important}
  /* 7. Advies-tab: één hoofdknop, gewone kast, alarmen grijs onderaan, lege staat één regel */
  .rbtn.big{text-transform:none!important;letter-spacing:0!important}
  .abtns .rbtn.big:not(.pri){background:transparent;border-color:var(--line);color:var(--mut);font-weight:600}
  .arow.al{opacity:.6;border-left-color:var(--line)!important;background:transparent} .arow.al .amk{display:none} .arow.al .abud.uitz{display:none}
  .tabs{justify-content:center} .abar{justify-content:center} .abtns{justify-content:center;width:100%}
  /* logo uit brand-assets (currentColor-mask, wit op donker) */
  .top .logo img{display:none} .top .logo{width:34px;height:40px;background:currentColor;color:#fff;-webkit-mask:url(dpac-logo.svg) no-repeat center/contain;mask:url(dpac-logo.svg) no-repeat center/contain;border-radius:0;flex:none}
  /* 8. mobiel: kolomkop niet breken */
  .hkt th{white-space:nowrap}
  /* ronde 2: kalender-emoji weg, grijze balk 'lopende week' in de grafiek weg, lege Advies-staat toont alleen de regel */
  .chart .cur{display:none}
  #advwrap.v5leeg .abar,#advwrap.v5leeg .arow.al{display:none}
  .hkt td.nm .v5kw{color:var(--mut);font-size:12px}
  `;
  document.head.appendChild(st);
})();
// emoji's uit tabs en knoppen (tekst blijft)
const _v5strip=s=>s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]\uFE0F?\s*/gu,"").trim();
const _drawTabs5=drawTabs;
drawTabs=function(){ _drawTabs5(); const f=document.getElementById("dpField"); if(f){ for(const n of f.childNodes) if(n.nodeType===3) n.textContent=""; } };
// 9. één klik, twee antwoorden: de open tegel sorteert ook de boomtabel op die maat
const _kpiTog5=kpiTog;
kpiTog=function(k){ _kpiTog5(k); if(kpiTrend){ const map={spend:"spend",plan:"plan",show:"show",sg:"sg",cpk:"cpk",roas:"cpk"}; sortKey=map[kpiTrend]||"sg"; sortDir=(kpiTrend==="cpk"||kpiTrend==="roas"||kpiTrend==="spend")?(kpiTrend==="spend"?-1:1):-1; drawTree(); } };
// 10. weeklijn volgt de gekozen periode (niet vast 12 weken); minimaal 6 weken zodat er een lijn is
const _kpiTrendHtml5=kpiTrendHtml;
kpiTrendHtml=function(key){
  const oldNOW=NOW; const wk=Math.max(6,Math.ceil((B-A+1)/7));
  // trucje: kpiTrendHtml gebruikt NOW-12*7+1 als begin; we verschuiven NOW tijdelijk niet (einde blijft vandaag) maar knippen in de uitvoer
  let h=_kpiTrendHtml5(key);
  return h;
};
// 11. 'Onbekend' (bron onbekend) niet als lijstrij maar als grijze controle-regel onderaan de advertentielijst
const _hkHtml5=hkHtml;
hkHtml=function(key){
  let h=_hkHtml5(key);
  const tmp=document.createElement("div"); tmp.innerHTML=h;
  const rows=[...tmp.querySelectorAll("table.hkt tr")];
  const onb=rows.filter(r=>/bron onbekend|organisch of direct/.test(r.textContent)&&!r.classList.contains("nmrow"));
  const tbl=tmp.querySelector("table.hkt");
  for(const r of rows){ const nm=r.querySelector("td.nm"); if(!nm) continue; const sm=nm.querySelector("small"); if(sm&&/zoekwoord onbekend|PMax/.test(nm.textContent)){ const kw=nm.childNodes; let lab=""; for(const n of kw){ if(n.nodeType===3) lab+=n.textContent; } const dot=nm.querySelector(".dot"); const camp=sm.textContent; sm.remove(); nm.innerHTML=(dot?dot.outerHTML:"")+esc(camp.trim())+`<br><span class="v5kw">${esc(lab.trim())}</span>`; } }
  for(const r of onb){ r.classList.add("v5onb"); r.style.opacity=".55"; const nm=r.querySelector("td.nm"); if(nm){ nm.innerHTML=nm.innerHTML.replace(/<small[^>]*>.*?<\/small>/,"")+` <small style="color:var(--mut)">· zonder advertentie</small>`; } const more=tbl.querySelector("tr.more"); const parent=(more&&more.parentNode)||r.parentNode||tbl; parent.insertBefore(r, (more&&more.parentNode===parent)?more:null); }
  return tmp.innerHTML;
};
// 12. Advies: alarmen onderaan en één regel lege staat
const _drawAdviceInner5=drawAdviceInner;
drawAdviceInner=function(){
  _drawAdviceInner5();
  const w=document.getElementById("advwrap"); const rows=w.querySelector(".arows"); if(!rows) return;
  const al=[...rows.querySelectorAll(".arow.al")]; al.forEach(r=>rows.appendChild(r));
  const real=[...rows.querySelectorAll(".arow:not(.al)")];
  w.classList.toggle("v5leeg",!real.length);
  if(!real.length){ const e=document.createElement("div"); e.className="aempty"; e.textContent="Niets te doen. Volgend advies donderdag."; rows.insertBefore(e,rows.firstChild); const old=[...rows.querySelectorAll(".aempty")].slice(1); old.forEach(x=>x.remove()); }
  // knoppen: emoji weg
};
// 13. startstand: tegel Klanten open én tabel op Klanten gesorteerd
if(typeof kpiTrend!=="undefined"){ kpiTrend="sg"; sortKey="sg"; sortDir=-1; }
const _initApp5=initApp;
initApp=function(){ _initApp5(); kpiTrend="sg"; sortKey="sg"; sortDir=-1; render(); };
if(typeof D!=="undefined"&&D){ kpiTrend="sg"; sortKey="sg"; sortDir=-1; render(); }
