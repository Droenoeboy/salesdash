// v3 "schoon" (1 okt 2026, Hermes) — laag bovenop engine_a/b + app.js. Wensen Abel 1 okt:
// schoner · no-shows omgekeerd oordeel · tegel klik = trendlijn (zoals marketing) · logo uit brandboek · rustiger ·
// start op Totaal · Linda/Connor/Lucas weg · Vandaag weg · "waar verliest wie" naar Team met groen waar het goed gaat.
// Niets in de motor gewijzigd; alles hier is terug te draaien door dit bestand uit index.html te halen.

// ---- instellingen ----
const REPS_WEG = ["Linda","Connor","Lucas"];     // niet meer in het team: geen kaart, geen chip, geen rij. Hun leads tellen gewoon mee in Totaal/Team.
const KPI_LAAG_IS_GOED = new Set(["No-shows","Reactietijd (mediaan)"]);   // dalen = groen
const TREND_WEKEN = 12;

// ---- 1. stijl: rustig, één accent, kleur alleen als oordeel ----
(function(){
  const st=document.createElement("style"); st.id="cleancss";
  st.textContent=`
  .top:after,#gate:before,.logo i{display:none!important}
  .top .logo img,.top .logo i{display:none!important} .top .logo{width:32px;height:38px;margin-right:4px;border:0!important;box-shadow:none;overflow:visible;background:#fff!important;color:#fff;-webkit-mask:url(dpac-logo.svg) no-repeat center/contain;mask:url(dpac-logo.svg) no-repeat center/contain;border-radius:0;flex:none;box-shadow:none}
  .v2tag{display:none} .standbar{display:none!important}
  .btnrow{opacity:.35;transition:opacity .15s} .top:hover .btnrow{opacity:1}
  #modebar{display:none!important}
  .tabsrow{justify-content:center} .tabs{justify-content:center}
  .tab .dot{display:none}
  /* tegels: getal, label, verschil klein eronder */
  .kpi b{font-size:26px;letter-spacing:-.5px} .kpi .dlt{font-size:11px;margin-top:3px}
  .kpi.on{box-shadow:inset 0 0 0 2px var(--sel-bg)!important}
  .kpi.clk:hover b{text-decoration:none} .kpi.clk:hover{border-color:var(--mut2)}
  .kpinote{display:none}
  /* kolommen: geen gekleurde vlakken, alleen een dun lijntje per stap; kleur blijft voor het oordeel (groen/rood rand) */
  .blk.p,.blk.h,.blk.s,.blk.i,.blk.c,.blk.b,.outN.p,.outN.h,.outN.s,.outN.i,.outN.c,.outN.b{background:var(--bg)!important}
  html[data-theme="dark"] .blk.p,html[data-theme="dark"] .blk.h,html[data-theme="dark"] .blk.s,html[data-theme="dark"] .blk.i,html[data-theme="dark"] .blk.c,html[data-theme="dark"] .blk.b,
  html[data-theme="dark"] .outN.p,html[data-theme="dark"] .outN.h,html[data-theme="dark"] .outN.s,html[data-theme="dark"] .outN.i,html[data-theme="dark"] .outN.c,html[data-theme="dark"] .outN.b{background:var(--ink2)!important}
  .blk .pct,.outN{color:var(--txt)!important} .blk .lab{color:var(--mut)!important;letter-spacing:.3px}
  .blk .bar{height:3px;opacity:.9}
  .blk.goed{box-shadow:inset 3px 0 0 #1a9a3d} .blk.slecht{box-shadow:inset 3px 0 0 #dc2a1e}
  .fcol.tot{border:1px solid var(--line)}
  .bigN{background:transparent;color:var(--txt);padding:0;font-size:18px}
  /* lijst 'Overig / oude accounts' en teamchips weg op Totaal */
  #cols .teamchips,#cols .fcol.mini{display:none!important}
  /* trendlijn onder de tegels (zoals marketing) */
  #kpitrend{margin:0 0 14px} #kpitrend .cmp{padding:12px 14px 6px} #kpitrend .chart .cur{display:none}
  #kpitrend .chhead{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 4px} #kpitrend .chhead h3{margin:0;font-size:13px;font-weight:700} #kpitrend .chhead span{font-size:11.5px;color:var(--mut)}
  /* verliesmatrix in Team: groen/rood per cel t.o.v. team */
  .lostm td.goed{box-shadow:inset 3px 0 0 #1a9a3d} .lostm td.slecht{box-shadow:inset 3px 0 0 #dc2a1e} .lostm td.worst{outline:none}
  .lostm td.goed .lc b{color:#15803a} .lostm td.slecht .lc b{color:#b91f15}
  html[data-theme="dark"] .lostm td.goed .lc b{color:#5fd77f} html[data-theme="dark"] .lostm td.slecht .lc b{color:#ff8a7e}
  .wtag{display:none}
  .pulshead h2,.pcard h3{letter-spacing:0}
  @media(max-width:640px){.kpi b{font-size:20px}}
  `;
  document.head.appendChild(st);
})();

// emoji's uit tabs, chips en koppen (tekst blijft)
const _cStrip=s=>s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]\uFE0F?\s*/gu,"").replace(/[Σ🧮]\s*/g,"").trim();
function cleanEmoji(root){ if(!root) return; const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const todo=[]; let n; while((n=w.nextNode())){ if(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]/u.test(n.textContent)) todo.push(n); } todo.forEach(n=>{ n.textContent=n.textContent.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]\uFE0F?\s*/gu,""); }); }

// ---- 2. start op Totaal, Vandaag weg, team zonder oud-reps ----
tab="tot";
const _cInit=initApp;
initApp=function(){
  _cInit();
  REPS=REPS.filter(p=>!REPS_WEG.includes(p.n));
  if(tab==="week"||tab==="vandaag") tab="tot";
  const sub=document.querySelector(".top .sub"); if(sub){ for(const n of [...sub.childNodes]) if(n.nodeType===3) n.textContent=""; const g=sub.querySelector("#gen"); if(g){ sub.insertBefore(document.createTextNode("opgehaald "),g); if(typeof LAATSTE!=="undefined"&&LAATSTE){ const d=new Date(LAATSTE); sub.appendChild(document.createTextNode(` · laatste gebeurtenis in GHL ${d.getDate()} ${MND[d.getMonth()]} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`)); } } }
  render();
};
const _cTabs=drawTabs;
drawTabs=function(){
  _cTabs();
  const el=document.getElementById("tabs"); if(!el) return;
  [...el.querySelectorAll(".tab")].forEach(t=>{ const txt=_cStrip(t.textContent); if(txt==="Vandaag"||txt==="Week") t.remove(); });
  cleanEmoji(el);
  [...el.querySelectorAll(".tab")].forEach(t=>{ if(t.textContent.trim()==="Adviezen") t.textContent="Advies"; if(tab==="verlies"&&t.textContent.trim()==="Team") t.classList.add("on"); });
  const on=el.querySelector(".tab.on"); if(on){ const Lx=on.offsetLeft-el.offsetLeft; if(Lx<el.scrollLeft||Lx+on.offsetWidth>el.scrollLeft+el.clientWidth) el.scrollLeft=Math.max(0,Lx-16); }
};
// Week-puls: 'Nu doen' (bellijst van de Vandaag-tab) verwijst niet meer naar een tab die weg is
const _cPuls=typeof drawPuls==="function"?drawPuls:null;
if(_cPuls){ drawPuls=function(){ _cPuls(); const w=document.getElementById("pulswrap"); if(!w) return; [...w.querySelectorAll(".pcard h3")].forEach(h=>{ if(/Nu doen/.test(h.textContent)) h.parentElement.remove(); }); cleanEmoji(w); }; }

// ---- 3. tegels: no-shows/reactietijd dalen = groen; klik = trendlijn eronder (zoals marketing) + de namen zoals altijd ----
let kpiSel=null;
const KPI_DEF={   // label → [sleutel, waarde(f,s,a,b,who), as-type]
  "Nieuwe leads":["leads",(f,s,a,b,who)=>L.filter(l=>inR(l.cd,a,b)&&(who==null||l.setter===who)).length,"#"],
  "Leads afgehandeld":["beh",(f)=>f.gepland.length+f.verloren.length,"#"],
  "Intakes gepland":["gepland",(f)=>f.gepland.length,"#"],
  "Intakes in periode":["agenda",(f)=>f.agenda.length,"#"],
  "Shows":["show",(f)=>f.show.length,"#"],
  "No-shows":["noshow",(f)=>f.geenShow.filter(l=>l.is_noshow).length,"#"],
  "Ingeschreven":["ins",(f,s,a,b,who)=>L.filter(l=>l.is_signed&&inR(l.insE,a,b)&&(who==null||l.owner===who)).length,"#"],
  "Ingeschreven · eigenaar":["ins",(f,s,a,b,who)=>L.filter(l=>l.is_signed&&inR(l.insE,a,b)&&(who==null||l.owner===who)).length,"#"],
  "Betaald":["paid",(f)=>f.paid.length,"#"],
  "Show rate per slot":["slot",(f,s)=>{ const held=s.show.length+s.noshow.length+s.late.length; return held?pct(s.show.length,held):null; },"%"],
  "Reactietijd (mediaan)":["s2l",(f,s,a,b,who)=>median(L.filter(l=>inR(l.cd,a,b)&&(who==null||((l.s2lBy||l.setter)===who&&!(l.s2lHow||"").startsWith("gok")))).map(l=>l.s2l)),"min"]
};
function kpiWeekSeries(label){
  const def=KPI_DEF[label]; if(!def) return null; const who=repOf();
  const end=B, start=Math.min(A,end-TREND_WEKEN*7+1); const bk=[]; for(let d=weekKey(start); d<=end; d+=7) bk.push([d,Math.min(d+6,end)]);
  const vals=bk.map(([a,b])=>{ const f=funnel(who,a,b), s=slots(who,a,b,"setter"); const v=def[1](f,s,a,b,who); return v==null?null:(def[2]==="#"?v:Math.round(v*10)/10); });
  const labels=bk.map(([a])=>"wk "+isoWeek(a));
  const inPer=bk.map(([a,b])=>b>=A);
  return {vals,labels,inPer,type:def[2],bk};
}
function kpiTrendHtml(label){
  const S=kpiWeekSeries(label); if(!S) return "";
  const fmtV=v=>v==null?"—":S.type==="%"?r1(v)+"%":S.type==="min"?fmin(v):v;
  const tips=S.vals.map((v,i)=>`${S.labels[i]}: ${fmtV(v)}`);
  const weak=S.inPer.map(x=>!x);
  const cw=Math.max(320,(document.getElementById("kpis").clientWidth||900)-30);
  const lopend=B>=TODAY; const nI=S.vals.length-(lopend?2:1); const laatst=S.vals[nI], vorig=S.vals[nI-1];
  const laag=KPI_LAAG_IS_GOED.has(label);
  let d=""; if(laatst!=null&&vorig!=null){ const x=S.type==="#"?laatst-vorig:Math.round((laatst-vorig)*10)/10; const goed=laag?x<0:x>0, slecht=laag?x>0:x<0; d=`<i class="dlt ${goed?"up":slecht?"dn":"eq"}" style="font-style:normal;font-weight:700">${x>0?"+":""}${S.type==="#"?x:S.type==="%"?r1(x)+" pp":fmin(Math.abs(x))}</i>`; }
  const kop=laatst==null?"":`laatste volle week ${S.labels[nI]}: ${fmtV(laatst)} ${d}`;
  return `<div class="cmp"><div class="chhead"><h3>${esc(label)} per week</h3><span>${kop}</span></div>${svgLine([{name:label,color:"var(--txt)",values:S.vals,weak,tips,width:2}],{pct:S.type==="%",labels:S.labels,h:170,w:cw,ticks:3})}</div>`;
}
function kpiTrendDraw(){
  let tr=document.getElementById("kpitrend"); const k=document.getElementById("kpis");
  if(!tr){ tr=document.createElement("div"); tr.id="kpitrend"; k.parentNode.insertBefore(tr,k.nextSibling); }
  const show=kpiSel&&(tab==="tot"||tab==="verlies"||isTeamTab())&&k.style.display!=="none";
  tr.style.display=show?"":"none"; tr.innerHTML=show?kpiTrendHtml(kpiSel):"";
}
const _cKpis=drawKpis;
drawKpis=function(){
  const was=tab; if(tab==="verlies") tab="cmp"; try{ _cKpis(); } finally { tab=was; }
  const k=document.getElementById("kpis"); if(!k||k.style.display==="none"){ kpiTrendDraw(); return; }
  [...k.querySelectorAll(".kpi")].forEach(t=>{
    const lab=(t.querySelector("span")||{}).textContent||""; const dl=t.querySelector(".dlt");
    if(KPI_LAAG_IS_GOED.has(lab)&&dl){ if(dl.classList.contains("up")){ dl.classList.replace("up","dn"); } else if(dl.classList.contains("dn")){ dl.classList.replace("dn","up"); } }
    if(KPI_DEF[lab]){ t.classList.add("clk"); if(kpiSel===lab) t.classList.add("on"); let orig=t.getAttribute("onclick")||"";
      if(/Ingeschreven/.test(lab)) orig="kpiPick('signS','ok')"; else if(lab==="Show rate per slot") orig="kpiPick('show')";   // blijf op deze tab: trend + namen
      t.setAttribute("onclick",`kpiTog(${JSON.stringify(lab)},function(){${orig}})`); }
  });
  kpiTrendDraw();
};
function kpiTog(lab,fn){ kpiSel=(kpiSel===lab)?null:lab; try{ if(kpiSel&&fn) fn(); }catch(e){} drawKpis(); }
// bij wisselen van periode blijft de gekozen tegel open (zelfde maat, nieuwe weken)

// ---- 4. Team: subkeuze 'Verlies' = 'waar verliest wie' met groen én rood per cel t.o.v. het team ----
const _cTeamSub=teamSubHtml;
teamSubHtml=function(){ let h=_cTeamSub(); h=h.replace(/<span class="lbl"[^>]*>Persoon:<\/span>/, `<div class="wchip sm${tab==="verlies"?" on":""}" onclick="tab='verlies';sel=null;render()">Verlies</div><span class="lbl" style="margin-left:6px">Persoon:</span>`); return _cStrip(h).replace(/>\s*Vergelijk</,">Vergelijk<"); };
let verliesPick=null;
function verliesRows(){
  const MP=+(DEFS.min_volume_plan||15), MS=+(DEFS.min_volume_show||8), MG=+(DEFS.min_volume_sign||5);
  const rep=o=>{ const f=funnel(o,A,B); const beh=f.gepland.length+f.verloren.length;
    const agenda=MODE==="rep"?f.agenda:L.filter(l=>inR(l.id_,A,B)&&(o==null||l.owner===o)); const gsO=agenda.filter(l=>!l.is_show&&l.lost);
    const closeDen=f.closeLost.length+f.dossiers.filter(l=>l.is_signed).length;
    return {o, beh, lostL:f.verloren, agenda, gsO, closeLost:f.closeLost, closeDen,
      c:[[f.verloren.length,beh,MP],[gsO.length,agenda.length,MS],[f.closeLost.length,closeDen,MG]]}; };
  const T=rep(null); const rows=REPS.map(p=>rep(p.n)).filter(r=>r.beh+r.agenda.length>=5);
  return {T,rows};
}
function drawVerlies(){
  const cw=document.getElementById("cmpwrap"); const {T,rows}=verliesRows();
  const KOL=[["Verloren vóór de intake","÷ afgehandelde leads"],["Geen show","÷ intakes op de agenda"],["Verloren na de intake","÷ afgeronde dossiers"]];
  const SEGN=["Leads-fase","Intake gepland, geen show","Na show"];
  const cell=(r,i)=>{ const [n,d,mn]=r.c[i]; const [tn,td]=T.c[i]; const p=d?pct(n,d):null; let cls=""; let dtxt="";
    if(r.o!==null&&p!=null&&td&&d>=mn){ const diff=pct(tn,td)-p; if(diff>=OORDEEL_PP) cls="goed"; else if(diff<=-OORDEEL_PP) cls="slecht"; dtxt=`<em>${diff>=0?"+":"−"}${r1(Math.abs(diff))} pp t.o.v. team</em>`; }
    else if(r.o!==null&&p!=null&&d<mn) dtxt=`<em>te weinig volume</em>`;
    const on=verliesPick&&verliesPick.o===r.o&&verliesPick.i===i;
    return `<td class="lcell${n?" clk":""} ${cls}${on?" on":""}" ${n?`onclick="verliesPickCell(${r.o===null?"null":jq(r.o)},${i})" title="klik: wie zijn dat"`:""}><div class="lc"><b>${p==null?"—":r1(p)+"%"}</b><small>${n} van ${d}</small>${dtxt}</div></td>`; };
  let h=`<div class="cmp"><h3>Waar verliest wie · ${fmtY(A)} t/m ${fmtY(B)}</h3>
    <table class="lostm"><tr><th>Persoon</th>${KOL.map(k=>`<th>${k[0]}<br><i>${k[1]}</i></th>`).join("")}</tr>`;
  for(const r of [T].concat(rows)) h+=`<tr class="${r.o===null?"tot":""}"><td><b>${r.o===null?"Team":esc(r.o)}</b></td>${[0,1,2].map(i=>cell(r,i)).join("")}</tr>`;
  h+=`</table><p class="note" style="margin-top:8px">Groen: minstens ${OORDEEL_PP} pp minder verlies dan het team in die stap. Rood: minstens ${OORDEEL_PP} pp meer. Verlies staat bij de eigenaar van de deal.</p>`;
  if(verliesPick){ const r=verliesPick.o===null?T:rows.find(x=>x.o===verliesPick.o); if(r){ const ls=[r.lostL,r.gsO,r.closeLost][verliesPick.i];
    const byR=new Map(); for(const l of ls) byR.set(l.lost_reason||"(geen reden)",(byR.get(l.lost_reason||"(geen reden)")||0)+1); const topR=[...byR.entries()].sort((a,b)=>b[1]-a[1]);
    h+=`<div class="weekwie" style="margin-top:12px"><div class="dhead"><b>${r.o===null?"Team":esc(r.o)} · ${KOL[verliesPick.i][0].toLowerCase()} · ${ls.length}</b><span><a href="#" onclick="verliesPick=null;drawVerlies();return false" style="color:var(--plan)">sluiten ✕</a></span></div>
      <div class="wonchips" style="margin:0 0 8px">`+topR.map(([x,c])=>`<div class="wchip sm">${esc(x)}<span class="n">${c}</span></div>`).join("")+`</div>
      <table><tr><th>Verloren op</th><th>Naam</th><th>Reden</th><th>Setter</th><th>Eigenaar</th><th>Binnengekomen</th></tr>`+ls.slice().sort((a,b)=>b.scd-a.scd).map(l=>`<tr><td>${l.scd>=0?fmt(l.scd):"—"}</td><td>${ghl(l.contact_id,l.name)}</td><td>${esc(l.lost_reason||"(geen reden)")}</td><td>${esc(l.setter||"—")}</td><td>${esc(l.owner||"—")}</td><td>${l.cd>=0?fmt(l.cd):"—"}</td></tr>`).join("")+`</table></div>`; } }
  h+=`</div>`;
  cw.innerHTML=h;
}
function verliesPickCell(o,i){ verliesPick=(verliesPick&&verliesPick.o===o&&verliesPick.i===i)?null:{o,i}; drawVerlies(); }
const _cCols=drawCols;
drawCols=function(){
  if(tab==="verlies"){ const ids=["cols","advwrap","wonwrap","dagwrap","aptwrap","trendwrap","bronwrap","lostwrap","cmpwrap","intwrap","vandaagwrap","pulswrap"]; ids.forEach(id=>{ const x=document.getElementById(id); if(x) x.style.display="none"; });
    const wpw=document.getElementById("wpwrap"); if(wpw) wpw.innerHTML=teamSubHtml(); teamLast=tab; const cw=document.getElementById("cmpwrap"); cw.style.display="block"; drawVerlies(); return; }
  _cCols();
  const wpw=document.getElementById("wpwrap"); if(wpw&&isTeamTab()) wpw.innerHTML=teamSubHtml();
  // Verloren-tab: de matrix staat nu in Team › Verlies
  if(tab==="lost") lostOpschonen();
  cleanEmoji(document.getElementById("cols")); cleanEmoji(document.getElementById("wpwrap")); cleanEmoji(document.getElementById("lostwrap")); cleanEmoji(document.getElementById("advwrap")); cleanEmoji(document.getElementById("wonwrap")); cleanEmoji(document.getElementById("intwrap")); cleanEmoji(document.getElementById("dagwrap")); cleanEmoji(document.getElementById("cmpwrap")); cleanEmoji(document.getElementById("trendwrap"));
  const unk=document.querySelector("#cols .fcol.unk, #cols .unkcol"); if(unk) unk.style.display="none";
};
// drawLost tekent ook bij een klik opnieuw (lostQuick, chips): matrix dan opnieuw weghalen
function lostOpschonen(){
  const lw=document.getElementById("lostwrap"); if(!lw) return;
  [...lw.querySelectorAll(".cmp")].forEach(c=>{ const h3=c.querySelector("h3"); if(h3&&/Waar verliest wie/.test(h3.textContent)) c.remove(); });
  // periode-chips weg: de datumkiezer rechtsboven heeft dezelfde keuzes
  [...lw.querySelectorAll(".wonchips")].forEach(r=>{ const l=r.querySelector(".lbl"); if(l&&/Periode/.test(l.textContent)) r.remove(); });
  // oud-reps: geen eigenaar-chip en geen kolom (hun leads tellen mee in de totalen)
  [...lw.querySelectorAll(".wchip")].forEach(c=>{ const t=c.firstChild&&c.firstChild.textContent?c.firstChild.textContent.trim():""; if(REPS_WEG.includes(t)) c.remove(); });
  [...lw.querySelectorAll("table")].forEach(tb=>{ const hd=tb.querySelector("tr"); if(!hd) return; const ths=[...hd.children]; const idx=ths.map((th,i)=>REPS_WEG.includes(th.textContent.trim())?i:-1).filter(i=>i>=0); if(!idx.length) return;
    [...tb.querySelectorAll("tr")].forEach(tr=>{ idx.slice().reverse().forEach(i=>{ if(tr.children[i]) tr.children[i].remove(); }); }); });
  cleanEmoji(lw);
}
const _cLost=drawLost;
drawLost=function(){ _cLost(); lostOpschonen(); };
