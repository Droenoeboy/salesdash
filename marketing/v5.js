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
  .top .logo img,.top .logo i{display:none!important} .top .logo{width:32px;height:38px;margin-right:4px;border:0!important;box-shadow:none;overflow:visible;background:#fff!important;color:#fff;-webkit-mask:url(dpac-logo.svg) no-repeat center/contain;mask:url(dpac-logo.svg) no-repeat center/contain;border-radius:0;flex:none}
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
kpiTog=function(k){ _kpiTog5(k); if(["plan","show","cpk","roas"].includes(kpiTrend)){ hkSort="r"; hkDraw&&hkDraw(); } if(kpiTrend){ const map={spend:"spend",plan:"plan",show:"show",sg:"sg",cpk:"cpk",roas:"cpk"}; sortKey=map[kpiTrend]||"sg"; sortDir=(kpiTrend==="cpk"||kpiTrend==="roas"||kpiTrend==="spend")?(kpiTrend==="spend"?-1:1):-1; drawTree(); } };
// 10. weeklijn volgt de gekozen periode (niet vast 12 weken); minimaal 6 weken zodat er een lijn is
const _kpiTrendHtml5=kpiTrendHtml;
kpiTrendHtml=function(key){
  const oldNOW=NOW; const wk=Math.max(6,Math.ceil((B-A+1)/7));
  // trucje: kpiTrendHtml gebruikt NOW-12*7+1 als begin; we verschuiven NOW tijdelijk niet (einde blijft vandaag) maar knippen in de uitvoer
  let h=_kpiTrendHtml5(key);
  return h;
};
// 13. kleurregel kleine aantallen (Abel 1 okt): hkHtml opnieuw gedefinieerd, kopie van app.js 1291-1316 met andere cls/sort/tooltip
hkHtml=function(key){
  const D=HKDEF[key]; if(!D) return "";
  const zero=o=>key==='cpk'||key==='roas'?(o.m.sg===0&&o.m.spend>=100):(key==='spend'||key==='sg')?false:((D.den(o.m)||0)>=5&&D.num(o.m)===0);
  const all=hkGroups(key).filter(o=>(D.num(o.m)||0)>0||zero(o));
  const PL=["meta","google","tiktok","niet_betaald","onbekend"]; const cnt={}; all.forEach(o=>{ cnt[o.plat]=(cnt[o.plat]||0)+D.num(o.m); });
  const tot=all.reduce((s,o)=>s+D.num(o.m),0);
  const fmtN=v=>D.eur&&key==="spend"?eur0(v):Math.round(v);
  // DPAC-137: Meta/Google/TikTok altijd als filter (ook bij 0); Niet betaald en Onbekend zodra ze in deze lijst voorkomen
  let h=`<div class="hk"><div class="hkbar"><span class="${hkPlat?"":"on"}" onclick="hkP(null)">Alles<i>${fmtN(tot)}</i></span>`+PL.filter(p=>cnt[p]!=null||p===hkPlat||["meta","google","tiktok"].includes(p)).map(p=>`<span class="${hkPlat===p?"on":""}" onclick="hkP('${p}')">${esc(PN(p))}<i>${fmtN(cnt[p]||0)}</i></span>`).join("")+`</div>`;
  const rows=all.filter(o=>!hkPlat||o.plat===hkPlat);
  // totaal van de lijst = anker voor de kleur
  const sum=f=>rows.reduce((s,o)=>s+f(o.m),0);
  const T={spend:sum(m=>m.spend),n:sum(m=>m.n),g:sum(m=>m.g),i:sum(m=>m.i),sh:sum(m=>m.sh),sg:sum(m=>m.sg)};
  const tRate={spend:T.n?T.spend/T.n:null,plan:T.n?T.g/T.n*100:null,show:T.i?T.sh/T.i*100:null,sg:T.n?T.sg/T.n*100:null,cpk:T.sg?T.spend/T.sg:null,roas:T.sg?T.spend/T.sg:null}[key];
  const CPKT=key==='cpk'||key==='roas';
  // v5 (Abel, 1 okt): snel belonen, langzaam straffen. Wilson-interval: groen als ondergrens (80%) boven totaal, rood als bovengrens (90%) eronder.
  const wil=(k,n,z)=>{ if(!n) return null; const p=k/n, z2=z*z, d=1+z2/n, c=(p+z2/(2*n))/d, h=z/d*Math.sqrt(p*(1-p)/n+z2/(4*n*n)); return [Math.max(0,c-h)*100, Math.min(1,c+h)*100]; };
  const grey=o=>CPKT?(o.m.sg===0?o.m.spend<100:false):D.eur?((D.den(o.m)||0)<5||D.rate(o.m)==null):D.rate(o.m)==null;
  const V5={};
  const cls=o=>{ if(CPKT){ if(o.m.sg===0) return o.m.spend>=400?'bad':o.m.spend>=100?'warn':'nd'; const v=o.m.cpk; return v==null?'nd':v<=MAXCPK()*0.85?'good':v>MAXCPK()*1.25?'bad':'warn'; }
    if(D.eur){ if(grey(o)||tRate==null) return "nd"; const v=D.rate(o.m); return v<=tRate*0.9?"good":v>=tRate*1.1?"bad":""; }
    if(grey(o)||tRate==null) return "nd"; const k=D.num(o.m)||0, n=D.den(o.m)||0; if(!n) return "nd";
    const lo=wil(k,n,1.28)[0], hi=wil(k,n,1.645)[1]; V5[o.k]={k,n,lo,hi};
    if(k===n && k>=2) return "good";                                   // foutloos met minstens 2: altijd groen (Abel)
    if(lo>tRate && (k>=2 || key==="sg" || o.m.spend<150)) return "good"; // 1 van 1 alleen bij klanten of als het weinig kostte
    if(hi<tRate) return "bad"; return ""; };
  const why=o=>{ const w=V5[o.k]; if(!w) return ""; const c=cls(o); if(c==="good") return w.k===w.n?`${w.k} van ${w.n} · foutloos (totaal ${r1(tRate)}%)`:`${w.k} van ${w.n} · ook met pech boven ${r1(w.lo)}% (totaal ${r1(tRate)}%)`; if(c==="bad") return `${w.k} van ${w.n} · zelfs met geluk onder ${r1(w.hi)}% (totaal ${r1(tRate)}%)`; return `${w.k} van ${w.n} · nog niet te onderscheiden van het totaal (${r1(tRate)}%)`; };
  const nul=o=>D.rate(o.m)==null&&!(CPKT&&o.m.sg===0);
  rows.sort((x,y)=> hkSort==="r" ? ((nul(x)?1:0)-(nul(y)?1:0) || (D.low?1:-1)*(((CPKT&&x.m.sg===0)?x.m.spend*9:(D.rate(x.m)??0))-((CPKT&&y.m.sg===0)?y.m.spend*9:(D.rate(y.m)??0))) || D.num(y.m)-D.num(x.m)) : (D.num(y.m)-D.num(x.m) || y.m.n-x.m.n));
  const CAP=10; const shown=rows.filter((o,i)=>hkAll||i<CAP||cls(o)==="bad"||cls(o)==="warn");
  const rf=v=>v==null?"—":D.eur?eur0(v):r1(v)+"%";
  h+=`<table class="hkt"><tr><th class="num" onclick="hkS('n')">${D.n}${hkSort==="n"?" ▼":""}</th><th class="num" onclick="hkS('r')" title="${D.low?"lager is beter":"hoger is beter"} · gekleurd tegen het totaal van deze lijst (${rf(tRate)}) · groen: foutloos vanaf 2 of zeker beter · rood: zeker slechter">${D.r}${hkSort==="r"?" ▼":""}</th><th>Advertentie / zoekwoord</th></tr>`;
  for(const o of shown){ const v=D.num(o.m); const nk="hk:"+o.k; const namen=key==="spend"?o.m.S.nieuw:o.m.S[D.set]; const kan=namen&&namen.length;
    h+=`<tr><td class="num${kan?" clk":""}"${kan?` onclick="nmTog(${jq(nk)})"`:""} title="${esc(kan?"klik voor de namen":"")}"><b>${fmtN(v)}</b></td><td class="num ${cls(o)}" title="${esc(CPKT&&o.m.sg===0?eur0(o.m.spend)+' uitgegeven zonder klant':(!D.eur&&!CPKT&&why(o))||D.tip(o.m))}"><b>${CPKT&&o.m.sg===0?eur0(o.m.spend)+' · 0':rf(D.rate(o.m))}</b></td><td class="nm"><span class="dot" style="background:${PC(o.plat)}"></span>${esc(o.lab)}<small>${esc(o.sub||"")}</small></td></tr>`;
    if(NMOPEN.has(nk)) h+=`<tr class="nmrow hkn"><td colspan="3">${namesHtml(namen,nk)}</td></tr>`; }
  if(hkAll?rows.length>CAP:rows.length>shown.length) h+=`<tr class="more"><td colspan="3" onclick="hkAll=!hkAll;hkDraw()">${hkAll?"minder":"nog "+(rows.length-shown.length)+" meer"}</td></tr>`;
  if(!rows.length) h+=`<tr><td colspan="3" class="nd">Niets in deze periode.</td></tr>`;
  return h+`</table></div>`;
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
const _memHad=()=>{ try{ return !!localStorage.dpacMktStand; }catch(e){ return false; } };   // punt 15: onthouden stand gaat voor
if(typeof kpiTrend!=="undefined"&&!_memHad()){ kpiTrend="sg"; sortKey="sg"; sortDir=-1; }
const _initApp5=initApp;
initApp=function(){ _initApp5(); if(!_memHad()){ kpiTrend="sg"; sortKey="sg"; sortDir=-1; } render(); };
if(typeof D!=="undefined"&&D&&!_memHad()){ kpiTrend="sg"; sortKey="sg"; sortDir=-1; render(); }

// 14. (Abel 1 okt, avond) elke sortering omkeerbaar: ook de lijst onder een open tegel (hkt). Tweede klik op dezelfde kop = andersom.
let hkDir=1;   // 1 = zoals altijd (beste/grootste bovenaan), -1 = omgekeerd (slechtste bovenaan)
hkS=function(s){ if(hkSort===s) hkDir=-hkDir; else { hkSort=s; hkDir=1; } hkDraw(); };
const _kpiTog14=kpiTog; kpiTog=function(k){ hkDir=1; _kpiTog14(k); };
const _hkHtml14=hkHtml;
hkHtml=function(key){
  let h=_hkHtml14(key);
  // pijl in de kop laat de richting zien
  h=h.replace(/(hkS\('n'\)">[^<]*?)( ▼)?<\/th>/, (m,a,b)=> b? `${a}${hkDir>0?" ▼":" ▲"}</th>` : m)
     .replace(/(hkS\('r'\)"[^>]*>[^<]*?)( ▼)?<\/th>/, (m,a,b)=> b? `${a}${hkDir>0?" ▼":" ▲"}</th>` : m);
  if(hkDir<0){   // rijen (zonder de namen-regels) omdraaien; de kop blijft staan
    const i=h.indexOf('<table class="hkt">'); const j=h.indexOf('</table>',i); if(i<0||j<0) return h;
    const tbl=h.slice(i,j); const rows=tbl.split(/(?=<tr)/); const head=rows.slice(0,2).join(""); let body=rows.slice(2);
    const grp=[]; for(const r of body){ if(r.startsWith('<tr class="nmrow')&&grp.length) grp[grp.length-1]+=r; else grp.push(r); }
    h=h.slice(0,i)+head+grp.reverse().join("")+h.slice(j);
  }
  return h;
};

// 15. (Abel 1 okt, avond) onthouden: welke rijen in de boomtabel open staan, de sortering en de open tegel. Start zoals je het achterliet.
const MEM_KEY="dpacMktStand";
function memSave(){ try{ localStorage[MEM_KEY]=JSON.stringify({open:[...open],sortKey,sortDir,kpiTrend}); }catch(e){} }
(function(){ let m=null; try{ m=JSON.parse(localStorage[MEM_KEY]||"null"); }catch(e){}
  if(m){ open=new Set(m.open||[]); if(m.sortKey) sortKey=m.sortKey; if(m.sortDir) sortDir=m.sortDir; kpiTrend=m.kpiTrend===undefined?kpiTrend:m.kpiTrend; }
  else { open=new Set(["p:meta","p:google","p:tiktok"]); }   // eerste keer: platforms uitgeklapt (wens Abel)
})();
const _toggleNode15=toggleNode; toggleNode=function(k){ _toggleNode15(k); memSave(); };
const _setSort15=setSort; setSort=function(k){ _setSort15(k); memSave(); };
const _treeOpenAll15=treeOpenAll; treeOpenAll=function(){ _treeOpenAll15(); memSave(); };
const _treeCloseAll15=treeCloseAll; treeCloseAll=function(){ _treeCloseAll15(); memSave(); };
const _kpiTog15=kpiTog; kpiTog=function(k){ _kpiTog15(k); memSave(); };
// na het laden van de data de onthouden stand opnieuw toepassen (initApp zet eigen defaults)
const _initApp15=initApp; initApp=function(){ _initApp15(); let m=null; try{ m=JSON.parse(localStorage[MEM_KEY]||"null"); }catch(e){} if(m){ open=new Set(m.open||[]); if(m.sortKey) sortKey=m.sortKey; if(m.sortDir) sortDir=m.sortDir; kpiTrend=m.kpiTrend===undefined?kpiTrend:m.kpiTrend; render(); } };
