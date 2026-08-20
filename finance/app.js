// ============================================================
//  DPAC · Finance dashboard — v1 (echte data uit Odoo via Supabase)
//  Werklijst-principe: één geprioriteerde lijst, geen buckets als werkscherm.
// ============================================================
"use strict";
const DATA_URL="https://dpac.app.n8n.cloud/webhook/dpac-finance-data";
const ODOO="https://audio-dojo1.odoo.com";
const eur0=v=>"€ "+Math.round(v).toLocaleString("nl-NL");
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const olink=(model,id,txt)=>id?`<a href="${ODOO}/web#id=${id}&model=${model}&view_type=form" target="_blank" title="openen in Odoo">${txt}</a>`:txt;
const TODAY=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
const fmt=s=>{if(!s)return"—";const d=new Date(s+"T00:00:00");return d.getDate()+" "+["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"][d.getMonth()]+(d.getFullYear()!==TODAY.getFullYear()?" ’"+String(d.getFullYear()).slice(2):"");};
const days=s=>s?Math.round((TODAY-new Date(s+"T00:00:00"))/864e5):null;

// ---- data laden ----
let INV=[], BANK=[], GEN=null, GCODE="";
const objs=(cols,rows)=>(rows||[]).map(r=>{const o={};cols.forEach((c,i)=>o[c]=r[i]);return o;});
async function laad(code){
  const resp=await fetch(DATA_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code})});
  if(!resp.ok) throw new Error("server gaf "+resp.status);
  const data=await resp.json();
  if(!data||data.error) throw new Error(data&&data.error==="unauthorized"?"code":"onbruikbaar antwoord");
  if(!Array.isArray(data.invoices)) throw new Error("onbruikbaar antwoord");
  return data;
}
async function gTry(code,stil){
  try{
    let data;
    if(location.search.indexOf("local=1")>=0){ data=await (await fetch("fin_data.json")).json(); }
    else data=await laad(code);
    GCODE=code; try{sessionStorage.dpacFinCode=code;}catch(e){}
    INV=objs(data.inv_cols,data.invoices); BANK=objs(data.bank_cols,data.bank); GEN=data.gen;
    document.getElementById("gate").style.display="none";
    boot(); return true;
  }catch(e){
    if(!stil){ document.getElementById("gfout").textContent=e.message==="code"?"Onjuiste code":"Laden mislukt ("+e.message+")"; const gi=document.getElementById("gcode"); if(gi) gi.value=""; }
    return false;
  }
}
function gCheck(){ gTry(document.getElementById("gcode").value.trim(),false); }

// ---- model ----
let DEBS=[];
function boot(){
  for(const i of INV){ i.open=+i.residual||0; i.late=(i.open>0&&i.due)?Math.max(0,days(i.due)):0; }
  const byP=new Map();
  for(const i of INV){ const k=i.pid||("x"+i.pname); if(!byP.has(k)) byP.set(k,{pid:i.pid,nm:i.pname||"(onbekend)",inv:[]}); byP.get(k).inv.push(i); }
  DEBS=[...byP.values()].map(d=>{
    d.open=d.inv.reduce((s,i)=>s+i.open,0);
    const od=d.inv.filter(i=>i.open>0&&i.late>0);
    d.late=od.length?Math.max(...od.map(i=>i.late)):0;
    d.nOpen=d.inv.filter(i=>i.open>0).length;
    d.score=d.open*(1+d.late/30);
    d.act = d.open<=0?"wacht" : d.late>45?"aanm" : d.late>14?"bel" : d.late>0?"herin" : "wacht";
    d.actT = d.open<=0?"Alles betaald" : d.late>45?"Aanmaning sturen" : d.late>14?"Bellen" : d.late>0?"1e herinnering sturen" : "Nog niet vervallen — niets doen";
    const why=[];
    if(d.late>0) why.push("oudste open factuur "+d.late+" dagen over de vervaldatum");
    if(d.nOpen>1) why.push(d.nOpen+" open facturen");
    d.why=why.join(" · ")||"factuur nog niet vervallen";
    return d;
  });
  const gd=GEN?new Date(GEN):null;
  document.getElementById("gen").textContent = gd&&!isNaN(gd)? "stand "+gd.getDate()+" "+["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"][gd.getMonth()]+" "+String(gd.getHours()).padStart(2,"0")+":"+String(gd.getMinutes()).padStart(2,"0")+" · sync draait elk uur" : "";
  render();
}

// ---- state ----
let tab="wl", wlOpen=new Set(), doneSet=new Set(), bktF=null, facSort={c:3,d:1}, facStat=null, doneTx=new Set(), afAll=false;
const ACTL={bel:["bel","📞 Bellen"],herin:["herin","✉️ 1e herinnering"],aanm:["aanm","⚠️ Aanmaning"],wacht:["wacht","⏳ Wachten"]};
const bucket=d=>d.late<=0?"0":d.late<=30?"1-30":d.late<=60?"31-60":"60+";

// ---- render ----
function render(){
  document.getElementById("tabs").innerHTML=[["wl","📞 Werklijst"],["fac","🧾 Alle facturen"],["aflet","🔗 Afletteren"]]
    .map(t=>`<div class="tab${tab===t[0]?" on":""}" onclick="tab='${t[0]}';render()">${t[1]}</div>`).join("");
  drawKpis();
  document.getElementById("view").innerHTML = tab==="wl"?wlHtml() : tab==="fac"?facHtml() : afletHtml();
}
function drawKpis(){
  const openTot=DEBS.reduce((s,d)=>s+d.open,0);
  const lateDs=DEBS.filter(d=>d.late>0&&d.open>0);
  const lateTot=lateDs.reduce((s,d)=>s+d.open,0);
  const unm=BANK.filter(t=>!doneTx.has(t.id)).length;
  const today=DEBS.filter(d=>d.open>0&&d.act!=="wacht").length;
  document.getElementById("kpis").innerHTML=[
    [eur0(openTot),"Totaal openstaand",""],[eur0(lateTot),"Waarvan te laat","bad"],[lateDs.length,"Debiteuren te laat",""],
    [unm,"Betalingen niet afgeletterd",unm?"bad":"good"],[today,"Vandaag actie nodig",""],[INV.length,"Facturen in Odoo",""]
  ].map(x=>`<div class="kpi ${x[2]}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
}
function wlHtml(){
  const bkts=["0","1-30","31-60","60+"].map(b=>{const ds=DEBS.filter(d=>d.open>0&&bucket(d)===b);return[b,ds.length,ds.reduce((s,d)=>s+d.open,0)];});
  let h=`<div class="wonchips"><span class="lbl">Overzicht (klik om te filteren):</span>`+
    `<div class="wchip${bktF==null?" on":""}" onclick="bktF=null;render()">Alles</div>`+
    bkts.map(([b,n,s])=>`<div class="wchip${bktF===b?" on":""}" onclick="bktF=bktF==='${b}'?null:'${b}';render()">${b==="0"?"Niet vervallen":b+" dgn te laat"} <span class="n">${n} · ${eur0(s)}</span></div>`).join("")+`</div>`;
  let list=DEBS.filter(d=>d.open>0).sort((a,b)=>b.score-a.score);
  if(bktF)list=list.filter(d=>bucket(d)===bktF);
  const acts=list.filter(d=>d.act!=="wacht"), rest=list.filter(d=>d.act==="wacht");
  h+=`<div class="cmp"><h3>Vandaag achteraan <span class="chsub">hoogste prioriteit eerst · klik een rij voor de facturen · klik een naam of factuurnummer om hem in Odoo te openen</span></h3><div class="wl">`;
  if(!acts.length)h+=`<div class="empty">Niets te doen${bktF?" in dit filter":""}. 🎉</div>`;
  h+=acts.map((d,i)=>row(d,i+1,false)).join("")+`</div></div>`;
  if(rest.length)h+=`<div class="cmp"><h3>Nog niet vervallen <span class="chsub">geen actie nodig</span></h3><div class="wl">`+rest.map(d=>row(d,null,true)).join("")+`</div></div>`;
  h+=`<p class="note">Prioriteit = openstaand bedrag × hoe lang over de vervaldatum. Betaalafspraken uit e-mail/chatter (fase 2) gaan hier straks bij: een gebroken afspraak schiet omhoog, een lopende afspraak zakt naar "met rust laten".</p>`;
  return h;
}
function row(d,rank,rest){
  const k=String(d.pid||d.nm),opn=wlOpen.has(k),done=doneSet.has(k);
  const cls=(rest?"rest":d.late>45?"hi":d.late>14?"mid":"")+(done?" done":"");
  const [ac,al]=ACTL[d.act];
  return `<div class="wlrow ${cls}" onclick="wlTog(${JSON.stringify(String(k)).replace(/"/g,"&quot;")})">
    <div class="wlhead">${rank?`<span class="rank">${rank}</span>`:`<span class="rank">·</span>`}
      <span class="wlnm" onclick="event.stopPropagation()">${olink("res.partner",d.pid,esc(d.nm))}</span>
      <span class="wlamt">${eur0(d.open)}</span>
      <span class="wlmeta"><span>${d.late>0?`<b style="color:var(--red-tx)">${d.late} dgn te laat</b>`:"nog niet vervallen"}</span>
        <span>${d.nOpen} open factuur${d.nOpen===1?"":"en"}</span></span>
      <span class="act"><span class="actlbl ${ac}">${al}</span>
        <button class="donebtn${done?" on":""}" onclick="event.stopPropagation();doneTog(${JSON.stringify(String(k)).replace(/"/g,"&quot;")})">${done?"✓ klaar":"klaar?"}</button></span>
    </div>
    <div class="why">${esc(d.actT)} — ${esc(d.why)}</div>
    ${opn?`<div class="wlx"><div><h4>Facturen</h4><table><tr><th>Nr</th><th>Datum</th><th>Verval</th><th>Bedrag</th><th>Open</th><th>Status</th></tr>${[...d.inv].sort((a,b)=>(b.open>0)-(a.open>0)||String(b.date).localeCompare(String(a.date))).map(i=>`<tr><td onclick="event.stopPropagation()">${olink("account.move",i.id,esc(i.name||"—"))}</td><td>${fmt(i.date)}</td><td>${i.late>0?`<b style="color:var(--red-tx)">${fmt(i.due)}</b>`:fmt(i.due)}</td><td>${eur0(i.total)}</td><td><b>${i.open>0?eur0(i.open):"✓"}</b></td><td>${psPill(i)}</td></tr>`).join("")}</table></div>
    <div><h4>Afspraak & contact</h4><div class="lr"><span>Nog geen betaalafspraak-data — komt in fase 2 uit de e-mail/Odoo-chatter</span></div></div></div>`:""}
  </div>`;
}
function psPill(i){ const ps=i.ps; const lab=ps==="paid"?"betaald":ps==="partial"?"deels betaald":ps==="in_payment"?"in behandeling":ps==="reversed"?"gecrediteerd":"open"; const cls=ps==="paid"?"win":i.late>0?"lost":"warn"; return `<span class="stg ${cls}">${lab}</span>`; }
function facHtml(){
  const stat=i=>i.open<=0?"betaald":i.late>0?"te laat":"open";
  const FL=[["betaald","Betaald"],["open","Open"],["te laat","Te laat"]];
  let h=`<div class="wonchips"><span class="lbl">Status:</span><div class="wchip${facStat==null?" on":""}" onclick="facStat=null;render()">Alles <span class="n">${INV.length}</span></div>`+FL.map(f=>`<div class="wchip${facStat===f[0]?" on":""}" onclick="facStat=facStat==='${f[0]}'?null:'${f[0]}';render()">${f[1]} <span class="n">${INV.filter(i=>stat(i)===f[0]).length}</span></div>`).join("")+`</div>`;
  const cols=[["Nr",i=>i.name||""],["Naam",i=>i.pname||""],["Datum",i=>i.date||""],["Vervaldatum",i=>i.due||""],["Bedrag",i=>+i.total],["Open",i=>i.open],["Dagen te laat",i=>i.late],["Status",i=>i.ps||""]];
  let list=facStat?INV.filter(i=>stat(i)===facStat):INV;
  const s=facSort;list=[...list].sort((x,y)=>{const a=cols[s.c][1](x),b=cols[s.c][1](y);return(a<b?-1:a>b?1:0)*s.d;});
  h+=`<div class="cmp"><h3>Alle facturen <span class="chsub">klik nr of naam om te openen in Odoo</span></h3><div style="overflow:auto"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="facSort.c===${i}?facSort.d=-facSort.d:(facSort={c:${i},d:1});render()">${c[0]} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+
    list.map(i=>`<tr><td>${olink("account.move",i.id,esc(i.name||"—"))}</td><td>${olink("res.partner",i.pid,esc(i.pname||"—"))}</td><td>${fmt(i.date)}</td><td>${fmt(i.due)}</td><td>${eur0(i.total)}</td><td><b>${i.open>0?eur0(i.open):"✓"}</b></td><td>${i.late||"—"}</td><td>${psPill(i)}</td></tr>`).join("")+`</table></div></div>`;
  return h;
}
function match(t){
  const cand=[];const ref=String(t.ref||"").toLowerCase();
  for(const i of INV){
    if(i.open<=0)continue;
    let sc=0,why=[];
    if(i.name&&ref.includes(i.name.toLowerCase())){sc+=60;why.push("factuurnummer in omschrijving");}
    if(Math.abs((+t.amount)-i.open)<1){sc+=30;why.push("bedrag klopt exact met openstaand");}
    else if(Math.abs((+t.amount)-(+i.total))<1){sc+=20;why.push("bedrag klopt met factuurtotaal");}
    else if(+t.amount<i.open){sc+=4;}
    if(t.pid&&t.pid===i.pid){sc+=35;why.push("Odoo herkent dezelfde klant");}
    const ln=String(i.pname||"").trim().split(" ").slice(-1)[0].toLowerCase();
    if(ln.length>=4&&(ref.includes(ln)||String(t.pname||"").toLowerCase().includes(ln))){sc+=22;why.push("achternaam komt overeen (mogelijk ouder/familie)");}
    const fn=String(i.pname||"").trim().split(" ")[0].toLowerCase();
    if(fn.length>=4&&ref.includes(fn)){sc+=10;why.push("voornaam in omschrijving");}
    if(sc>=15)cand.push({i,sc,why});
  }
  cand.sort((a,b)=>b.sc-a.sc);return cand[0]||null;
}
function afletHtml(){
  const list=[...BANK].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const LIM=afAll?list.length:80;
  let h=`<div class="cmp"><h3>Binnengekomen betalingen die nog niet afgeletterd zijn · ${list.length} <span class="chsub">nieuwste eerst · voorstel per betaling · de boek-knop in Odoo blijft aan jullie</span></h3>`;
  h+=list.slice(0,LIM).map(t=>{
    const done=doneTx.has(t.id);
    const m=match(t);
    const conf=m?(m.sc>=70?"hi":m.sc>=35?"mid":"lo"):"lo";
    const confL=m?(m.sc>=70?"zeker":m.sc>=35?"waarschijnlijk":"onzeker"):"geen match";
    return `<div class="mtch"${done?' style="opacity:.45"':''}><span class="conf ${conf}">${done?"✓ gedaan":confL}</span>
      <span style="min-width:170px"><b>${eur0(t.amount)}</b> · ${fmt(t.date)}<br><span class="chsub">${esc(t.pname||"")}${t.journal?" · "+esc(t.journal):""}</span></span>
      <span style="flex:2;min-width:260px"><span class="chsub" title="${esc(t.ref||"")}" style="display:inline-block;max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">"${esc(t.ref||"—")}"</span><br>${m?`→ <b>${olink("account.move",m.i.id,esc(m.i.name))}</b> van <b>${olink("res.partner",m.i.pid,esc(m.i.pname||"—"))}</b> (open ${eur0(m.i.open)})<br><span class="chsub">${m.why.join(" · ")}</span>`:`<span class="chsub">geen open factuur gevonden — handmatig bekijken</span>`}</span>
      <span style="display:flex;gap:8px;align-items:center"><a class="okbtn" style="text-decoration:none" href="${ODOO}/web#id=${t.id}&model=account.bank.statement.line&view_type=form" target="_blank">🔗 Open betaling in Odoo</a>
      <button class="donebtn${done?" on":""}" onclick="doneTx.${done?"delete":"add"}(${t.id});render()">${done?"✓":"klaar?"}</button></span></div>`;
  }).join("");
  if(list.length>LIM)h+=`<div style="text-align:center;margin:10px 0"><span class="wchip" style="display:inline-flex" onclick="afAll=true;render()">Toon alle ${list.length}</span></div>`;
  h+=`</div><p class="note">Matching op factuurnummer in de omschrijving, exact bedrag en naam-gelijkenis (ook als een ouder betaalt). "Open betaling in Odoo" springt direct naar de transactie zodat je hem daar in één klik kunt afletteren op de voorgestelde factuur. De volgende stap wordt een echte "✓ Akkoord, letter af"-knop die het boeken in Odoo voor je doet — die bouwen we apart en test-je eerst samen.</p>`;
  return h;
}
function wlTog(k){wlOpen.has(k)?wlOpen.delete(k):wlOpen.add(k);render();}
function doneTog(k){doneSet.has(k)?doneSet.delete(k):doneSet.add(k);render();}

// ---- start ----
try{ const c=sessionStorage.dpacFinCode; if(c) gTry(c,true); else if(location.search.indexOf("local=1")>=0) gTry("",true); }catch(e){ if(location.search.indexOf("local=1")>=0) gTry("",true); }
