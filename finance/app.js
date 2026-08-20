// ============================================================
//  DPAC · Finance dashboard — v0 (DEMO-DATA, nog geen Odoo-koppeling)
//  Werklijst-principe: één geprioriteerde lijst, geen buckets als werkscherm.
// ============================================================
"use strict";
const eur0=v=>"€ "+Math.round(v).toLocaleString("nl-NL");
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const DAY=864e5, TODAY=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
const dstr=off=>{const d=new Date(TODAY.getTime()+off*DAY);return d.toISOString().slice(0,10);};
const fmt=s=>{if(!s)return"—";const d=new Date(s+"T00:00:00");return d.getDate()+" "+["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"][d.getMonth()];};
const days=s=>Math.round((TODAY-new Date(s+"T00:00:00"))/DAY);

// ---- DEMO-DATA (verzonnen; structuur = wat straks uit Odoo komt) ----
const DEBS=[
 {id:1,nm:"Tim de Jong",bedrijf:null,inv:[{nr:"F2026-0101",d:dstr(-75),due:dstr(-45),amt:2267,paid:0},{nr:"F2026-0141",d:dstr(-45),due:dstr(-15),amt:2267,paid:0}],afspraak:{beloofd:dstr(-9),bedrag:2267,via:"mail"},contact:dstr(-9),eig:"Sanne"},
 {id:2,nm:"Lisa Vermeer",bedrijf:null,inv:[{nr:"F2026-0118",d:dstr(-64),due:dstr(-34),amt:6800,paid:2266}],afspraak:null,contact:null,eig:"Sanne"},
 {id:3,nm:"Ravi Kumar",bedrijf:"RK Beats BV",inv:[{nr:"F2026-0092",d:dstr(-100),due:dstr(-70),amt:1495,paid:0}],afspraak:{beloofd:dstr(-21),bedrag:1495,via:"telefoon"},contact:dstr(-21),eig:"Abel"},
 {id:4,nm:"Noa Bakker",bedrijf:null,inv:[{nr:"F2026-0155",d:dstr(-33),due:dstr(-3),amt:2267,paid:0}],afspraak:null,contact:dstr(-2),eig:"Sanne"},
 {id:5,nm:"Milan Visser",bedrijf:null,inv:[{nr:"F2026-0149",d:dstr(-40),due:dstr(-10),amt:6300,paid:0}],afspraak:{beloofd:dstr(6),bedrag:6300,via:"mail"},contact:dstr(-4),eig:"Sanne"},
 {id:6,nm:"Yara El Amrani",bedrijf:null,inv:[{nr:"F2026-0160",d:dstr(-26),due:dstr(4),amt:2267,paid:0}],afspraak:null,contact:dstr(-26),eig:"Sanne"},
 {id:7,nm:"Daan Smit",bedrijf:null,inv:[{nr:"F2026-0127",d:dstr(-55),due:dstr(-25),amt:2267,paid:1000}],afspraak:null,contact:dstr(-40),eig:"Abel"},
 {id:8,nm:"Femke Groen",bedrijf:null,inv:[{nr:"F2026-0119",d:dstr(-62),due:dstr(-32),amt:6595,paid:6595}],afspraak:null,contact:dstr(-30),eig:"Sanne"},
 {id:9,nm:"Sem Willems",bedrijf:"Willems Media",inv:[{nr:"F2026-0138",d:dstr(-48),due:dstr(-18),amt:995,paid:0},{nr:"F2026-0090",d:dstr(-92),due:dstr(-62),amt:995,paid:995}],afspraak:null,contact:null,eig:"Abel"},
 {id:10,nm:"Julia Peters",bedrijf:null,inv:[{nr:"F2026-0163",d:dstr(-20),due:dstr(10),amt:2267,paid:0}],afspraak:null,contact:dstr(-5),eig:"Sanne"}
];
const TX=[
 {d:dstr(-2),amt:2267,naam:"J.M. de Jong",iban:"NL91ABNA…721",oms:"F2026-0141 Tim"},
 {d:dstr(-3),amt:4534,naam:"H. Vermeer-Kok",iban:"NL20INGB…104",oms:"lesgeld Lisa"},
 {d:dstr(-1),amt:995,naam:"Willems Media BV",iban:"NL55RABO…990",oms:"factuur"},
 {d:dstr(-6),amt:150,naam:"Stichting Derdengeld",iban:"NL02BUNQ…333",oms:"onbekend kenmerk 8842"},
 {d:dstr(-4),amt:6300,naam:"M. Visser",iban:"NL77KNAB…265",oms:"F2026-0149"}
];

// ---- afgeleiden ----
function calc(d){
  const open=d.inv.reduce((s,i)=>s+i.amt-i.paid,0);
  const overdue=d.inv.filter(i=>i.amt>i.paid&&days(i.due)>0);
  const late=overdue.length?Math.max(...overdue.map(i=>days(i.due))):0;
  const broken=d.afspraak&&days(d.afspraak.beloofd)>0&&open>0;
  const running=d.afspraak&&days(d.afspraak.beloofd)<=0&&open>0;
  const noContact=!d.contact;
  let score=open*(1+late/30);
  if(broken)score*=2; if(running)score*=0.12; if(noContact)score+=400;
  if(open<=0)score=0;
  let act="wacht",actT="Nog niet vervallen";
  if(open>0){
    if(running){act="wacht";actT="Afspraak loopt t/m "+fmt(d.afspraak.beloofd)+" — met rust laten";}
    else if(broken){act="bel";actT="Bellen — afspraak gebroken";}
    else if(late>45){act="aanm";actT="Aanmaning sturen";}
    else if(late>14){act="bel";actT="Bellen";}
    else if(late>0){act="herin";actT="1e herinnering";}
  }
  const why=[];
  if(late>0)why.push(late+" dagen over de vervaldatum");
  if(broken)why.push("beloofde betaling ("+eur0(d.afspraak.bedrag)+" vóór "+fmt(d.afspraak.beloofd)+") niet nagekomen");
  if(running)why.push("betaalafspraak loopt nog (beloofd vóór "+fmt(d.afspraak.beloofd)+")");
  if(noContact&&open>0)why.push("nog nooit gereageerd op contact");
  if(d.contact&&!broken&&!running)why.push("laatste contact "+fmt(d.contact));
  return {open,late,broken,running,noContact,score,act,actT,why:why.join(" · ")||"—"};
}
const ALL=DEBS.map(d=>({...d,c:calc(d)}));
const bucket=d=> d.c.late<=0?"0":d.c.late<=30?"1-30":d.c.late<=60?"31-60":"60+";

// ---- state ----
let tab="wl", wlOpen=new Set(), doneSet=new Set(), bktF=null, facSort={c:0,d:1}, facStat=null, matched=new Set();
const ACTL={bel:["bel","📞 Bellen"],herin:["herin","✉️ 1e herinnering"],aanm:["aanm","⚠️ Aanmaning"],wacht:["wacht","⏳ Wachten"]};

// ---- render ----
function render(){
  document.getElementById("tabs").innerHTML=[["wl","📞 Werklijst"],["fac","🧾 Alle facturen"],["aflet","🔗 Afletteren"]]
    .map(t=>`<div class="tab${tab===t[0]?" on":""}" onclick="tab='${t[0]}';render()">${t[1]}</div>`).join("");
  drawKpis();
  const v=document.getElementById("view");
  v.innerHTML = tab==="wl"?wlHtml() : tab==="fac"?facHtml() : afletHtml();
}
function drawKpis(){
  const openTot=ALL.reduce((s,d)=>s+d.c.open,0);
  const lateTot=ALL.filter(d=>d.c.late>0).reduce((s,d)=>s+d.c.open,0);
  const nLate=ALL.filter(d=>d.c.late>0&&d.c.open>0).length;
  const broken=ALL.filter(d=>d.c.broken).length;
  const unm=TX.filter((t,i)=>!matched.has(i)).length;
  const today=ALL.filter(d=>d.c.open>0&&!d.c.running&&d.c.act!=="wacht").length;
  document.getElementById("kpis").innerHTML=[
    [eur0(openTot),"Totaal openstaand",""],[eur0(lateTot),"Waarvan te laat","bad"],[nLate,"Debiteuren te laat",""],
    [broken,"Gebroken afspraken",broken?"bad":"good"],[unm,"Betalingen niet afgeletterd",unm?"bad":"good"],[today,"Vandaag actie nodig",""]
  ].map(x=>`<div class="kpi ${x[2]}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
}
function wlHtml(){
  const bkts=["0","1-30","31-60","60+"].map(b=>{const ds=ALL.filter(d=>d.c.open>0&&bucket(d)===b);return[b,ds.length,ds.reduce((s,d)=>s+d.c.open,0)];});
  let h=`<div class="wonchips"><span class="lbl">Overzicht (klik om te filteren):</span>`+
    `<div class="wchip${bktF==null?" on":""}" onclick="bktF=null;render()">Alles</div>`+
    bkts.map(([b,n,s])=>`<div class="wchip${bktF===b?" on":""}" onclick="bktF=bktF==='${b}'?null:'${b}';render()">${b==="0"?"Niet vervallen":b+" dgn te laat"} <span class="n">${n} · ${eur0(s)}</span></div>`).join("")+`</div>`;
  let list=ALL.filter(d=>d.c.open>0).sort((a,b)=>b.c.score-a.c.score);
  if(bktF)list=list.filter(d=>bucket(d)===bktF);
  const acts=list.filter(d=>!d.c.running&&d.c.act!=="wacht"), rest=list.filter(d=>d.c.running||d.c.act==="wacht");
  h+=`<div class="cmp"><h3>Vandaag achteraan <span class="chsub">hoogste prioriteit eerst · klik een rij voor de facturen en afsprakenhistorie</span></h3><div class="wl">`;
  if(!acts.length)h+=`<div class="empty">Niets te doen${bktF?" in dit filter":""}. 🎉</div>`;
  h+=acts.map((d,i)=>row(d,i+1,false)).join("")+`</div></div>`;
  if(rest.length)h+=`<div class="cmp"><h3>Met rust laten / nog niet vervallen <span class="chsub">afspraak loopt of factuur is nog niet vervallen</span></h3><div class="wl">`+rest.map(d=>row(d,null,true)).join("")+`</div></div>`;
  h+=`<p class="note">Prioriteit = openstaand bedrag × hoe lang te laat, zwaar strafpunt voor een gebroken betaalafspraak, en wie een lopende afspraak heeft zakt automatisch naar beneden. In de echte versie komen bedragen, vervaldata en betalingen live uit Odoo en de afspraken uit de e-mail/chatter (fase 2).</p>`;
  return h;
}
function row(d,rank,rest){
  const c=d.c,k=d.id,opn=wlOpen.has(k),done=doneSet.has(k);
  const cls=(rest?"rest":c.broken||c.late>45?"hi":c.late>14?"mid":"")+(done?" done":"");
  const [ac,al]=ACTL[c.act];
  return `<div class="wlrow ${cls}" onclick="wlTog(${k})">
    <div class="wlhead">${rank?`<span class="rank">${rank}</span>`:`<span class="rank">·</span>`}
      <span class="wlnm">${esc(d.nm)}${d.bedrijf?`<small>via ${esc(d.bedrijf)} · gekoppeld aan leerling</small>`:""}</span>
      <span class="wlamt">${eur0(c.open)}</span>
      <span class="wlmeta"><span>${c.late>0?`<b style="color:var(--red-tx)">${c.late} dgn te laat</b>`:"nog niet vervallen"}</span>
        <span>${d.inv.filter(i=>i.amt>i.paid).length} open factuur${d.inv.filter(i=>i.amt>i.paid).length===1?"":"en"}</span>
        <span>${c.broken?`<span class="stg lost">afspraak gebroken</span>`:c.running?`<span class="stg warn">afspraak loopt</span>`:c.noContact?`<span class="stg lost">nooit gereageerd</span>`:"laatste contact "+fmt(d.contact)}</span>
        <span>eigenaar ${esc(d.eig)}</span></span>
      <span class="act"><span class="actlbl ${ac}">${al}</span>
        <button class="donebtn${done?" on":""}" onclick="event.stopPropagation();doneTog(${k})">${done?"✓ klaar":"klaar?"}</button></span>
    </div>
    <div class="why">${esc(c.actT)} — ${esc(c.why)}</div>
    ${opn?`<div class="wlx"><div><h4>Facturen</h4><table><tr><th>Nr</th><th>Datum</th><th>Verval</th><th>Bedrag</th><th>Betaald</th><th>Open</th></tr>${d.inv.map(i=>`<tr><td>${i.nr}</td><td>${fmt(i.d)}</td><td>${days(i.due)>0&&i.amt>i.paid?`<b style="color:var(--red-tx)">${fmt(i.due)}</b>`:fmt(i.due)}</td><td>${eur0(i.amt)}</td><td>${i.paid?eur0(i.paid):"—"}</td><td><b>${i.amt-i.paid>0?eur0(i.amt-i.paid):"✓"}</b></td></tr>`).join("")}</table></div>
    <div><h4>Afspraak & contact</h4>${d.afspraak?`<div class="lr"><span>Beloofd: ${eur0(d.afspraak.bedrag)} vóór ${fmt(d.afspraak.beloofd)} (via ${d.afspraak.via})</span></div>`:`<div class="lr"><span>Geen betaalafspraak bekend</span></div>`}<div class="lr"><span>Laatste contact: ${d.contact?fmt(d.contact):"nooit"}</span></div><div class="note" style="margin-top:8px">Straks: automatisch gevuld vanuit administratie@-mail/Odoo-chatter, met linkje naar het mailtje als bewijs.</div></div></div>`:""}
  </div>`;
}
function facHtml(){
  const rows=[];ALL.forEach(d=>d.inv.forEach(i=>rows.push({d,i,open:i.amt-i.paid,late:i.amt>i.paid?Math.max(0,days(i.due)):0})));
  const stat=r=>r.open<=0?"betaald":r.late>0?"te laat":"open";
  const FL=[["betaald","Betaald"],["open","Open"],["te laat","Te laat"]];
  let h=`<div class="wonchips"><span class="lbl">Status:</span><div class="wchip${facStat==null?" on":""}" onclick="facStat=null;render()">Alles <span class="n">${rows.length}</span></div>`+FL.map(f=>`<div class="wchip${facStat===f[0]?" on":""}" onclick="facStat=facStat==='${f[0]}'?null:'${f[0]}';render()">${f[1]} <span class="n">${rows.filter(r=>stat(r)===f[0]).length}</span></div>`).join("")+`</div>`;
  const cols=[["Nr",r=>r.i.nr],["Naam",r=>r.d.nm],["Datum",r=>r.i.d],["Vervaldatum",r=>r.i.due],["Bedrag",r=>r.i.amt],["Betaald",r=>r.i.paid],["Open",r=>r.open],["Dagen te laat",r=>r.late],["Eigenaar",r=>r.d.eig]];
  let list=facStat?rows.filter(r=>stat(r)===facStat):rows;
  const s=facSort;list=[...list].sort((x,y)=>{const a=cols[s.c][1](x),b=cols[s.c][1](y);return(a<b?-1:a>b?1:0)*s.d;});
  h+=`<div class="cmp"><h3>Alle facturen</h3><div style="overflow:auto"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="facSort.c===${i}?facSort.d=-facSort.d:(facSort={c:${i},d:1});render()">${c[0]} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+
    list.map(r=>`<tr><td>${r.i.nr}</td><td>${esc(r.d.nm)}</td><td>${fmt(r.i.d)}</td><td>${fmt(r.i.due)}</td><td>${eur0(r.i.amt)}</td><td>${r.i.paid?eur0(r.i.paid):"—"}</td><td><b>${r.open>0?eur0(r.open):"✓"}</b></td><td>${r.late||"—"}</td><td>${esc(r.d.eig)}</td></tr>`).join("")+`</table></div></div>`;
  return h;
}
function match(t){
  const cand=[];
  ALL.forEach(d=>d.inv.forEach(i=>{
    if(i.amt-i.paid<=0)return;
    let sc=0,why=[];
    if(t.oms.includes(i.nr)){sc+=60;why.push("factuurnummer in omschrijving");}
    if(Math.abs(t.amt-(i.amt-i.paid))<1){sc+=30;why.push("bedrag klopt exact");}
    else if(t.amt<i.amt-i.paid){sc+=8;why.push("deelbetaling mogelijk");}
    const ln=d.nm.split(" ").slice(-1)[0].toLowerCase();
    if(t.naam.toLowerCase().includes(ln)){sc+=25;why.push("achternaam komt overeen ("+(t.naam.split(" ").length>1?"mogelijk ouder/familie":"zelfde naam")+")");}
    if(d.bedrijf&&t.naam.toLowerCase().includes(d.bedrijf.split(" ")[0].toLowerCase())){sc+=35;why.push("bedrijfsnaam van gekoppelde leerling");}
    if(t.oms.toLowerCase().includes(d.nm.split(" ")[0].toLowerCase())){sc+=15;why.push("voornaam in omschrijving");}
    if(sc>0)cand.push({d,i,sc,why});
  }));
  cand.sort((a,b)=>b.sc-a.sc);return (cand[0]&&cand[0].sc>=15)?cand[0]:null;
}
function afletHtml(){
  let h=`<div class="cmp"><h3>Binnengekomen betalingen zonder aflettering <span class="chsub">voorstel per betaling — jij drukt de knop, nooit automatisch</span></h3>`;
  h+=TX.map((t,ix)=>{
    if(matched.has(ix))return`<div class="mtch" style="opacity:.45"><span class="conf hi">✓ afgeletterd</span><b>${eur0(t.amt)}</b><span>${esc(t.naam)}</span><span class="chsub">(demo — in het echt geboekt in Odoo)</span></div>`;
    const m=match(t);
    const conf=m?(m.sc>=70?"hi":m.sc>=35?"mid":"lo"):"lo";
    const confL=m?(m.sc>=70?"zeker":m.sc>=35?"waarschijnlijk":"onzeker"):"geen match";
    return `<div class="mtch"><span class="conf ${conf}">${confL}</span>
      <span><b>${eur0(t.amt)}</b> · ${fmt(t.d)}<br><span class="chsub">${esc(t.naam)} · ${esc(t.iban)} · "${esc(t.oms)}"</span></span>
      <span style="flex:1">${m?`→ <b>${esc(m.i.nr)}</b> van <b>${esc(m.d.nm)}</b> (open ${eur0(m.i.amt-m.i.paid)})<br><span class="chsub">${m.why.join(" · ")}</span>`:`<span class="chsub">geen open factuur gevonden — handmatig bekijken</span>`}</span>
      <button class="okbtn" ${m&&m.sc>=35?"":"disabled"} onclick="matched.add(${ix});render()">✓ Akkoord, letter af</button></div>`;
  }).join("")+`</div>`;
  h+=`<p class="note">Zo werkt het straks echt: Mollie/banktransacties uit Odoo worden hier gematcht op factuurnummer, exact bedrag en naam-gelijkenis (ook als een ouder betaalt — via de leerling-koppeling). "Akkoord" laat n8n de aflettering in Odoo boeken. Twijfelgevallen blijven staan met de reden erbij.</p>`;
  return h;
}
function wlTog(k){wlOpen.has(k)?wlOpen.delete(k):wlOpen.add(k);render();}
function doneTog(k){doneSet.has(k)?doneSet.delete(k):doneSet.add(k);render();}
render();
