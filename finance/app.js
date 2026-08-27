// ============================================================
//  DPAC · Finance dashboard — v2 (echte data uit Odoo via Supabase)
//  Werklijst per debiteur · afletteren per leerling · PA/ASM gescheiden
// ============================================================
"use strict";
const DATA_URL="https://dpac.app.n8n.cloud/webhook/dpac-finance-data";
const ODOO="https://audio-dojo1.odoo.com";
const RECON_URL=ODOO+"/odoo/accounting/13/reconciliation";   // Bankaflettering-view (dagboek Bank)
const MOLLIE_URL="https://my.mollie.com/dashboard/";
const ACT_URL="https://dpac.app.n8n.cloud/webhook/dpac-finance-actions";
const JID_PA=8, JID_ASM=16;
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
const IBAN_RE=/\b[A-Z]{2}\d{2}[A-Z]{4}[0-9A-Z]{6,}\b/;
const norm=s=>String(s||"").toLowerCase();
const nrmS=s=>String(s||"").toLowerCase().replace(/[^a-zÀ-ɏ]+/gi," ").replace(/\s+/g," ").trim(); // woorden met spaties, voor woordgrens-matching
const isMollie=t=>norm(t.ref).includes("mollie")||norm(t.pname).includes("mollie");
const isIntern=t=>norm(t.pname).includes("producer academie");
let IBANMAP=new Map();
function boot(){
  for(const i of INV){ i.open=+i.residual||0; i.late=(i.open>0&&i.due)?Math.max(0,days(i.due)):0; }
  for(const t of BANK){ const m=String(t.ref||"").replace(/\s/g,"").match(IBAN_RE)||String(t.ref||"").match(IBAN_RE); t.iban=m?m[0]:null; }
  IBANMAP=new Map();
  for(const t of BANK){ if(t.rec&&t.pid&&t.iban&&!IBANMAP.has(t.iban)) IBANMAP.set(t.iban,{pid:t.pid,pname:t.pname}); }
  const gd=GEN?new Date(GEN):null;
  document.getElementById("gen").textContent = gd&&!isNaN(gd)? "stand "+gd.getDate()+" "+["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"][gd.getMonth()]+" "+String(gd.getHours()).padStart(2,"0")+":"+String(gd.getMinutes()).padStart(2,"0")+" · sync draait elk uur" : "";
  render();
}
function calcDebs(list){
  const byP=new Map();
  for(const i of list){ const k=i.pid||("x"+i.pname); if(!byP.has(k)) byP.set(k,{pid:i.pid,nm:i.pname||"(onbekend)",inv:[]}); byP.get(k).inv.push(i); }
  return [...byP.values()].map(d=>{
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
}

// ---- state ----
let tab="wl", scope="pa", wlOpen=new Set(), doneSet=new Set(), bktF=null, facSort={c:3,d:1}, facStat=null, doneTx=new Set(), afOpen=new Set(), afAll=false;
const ACTL={bel:["bel","📞 Bellen"],herin:["herin","✉️ 1e herinnering"],aanm:["aanm","⚠️ Aanmaning"],wacht:["wacht","⏳ Wachten"]};
const bucket=d=>d.late<=0?"0":d.late<=30?"1-30":d.late<=60?"31-60":"60+";
const scoped=()=>INV.filter(i=>scope==="alles"?true:(scope==="pa"?i.jid===JID_PA:i.jid===JID_ASM));
const scopeChips=()=>`<div class="wonchips"><span class="lbl">Administratie:</span>`+[["pa","🎹 Producer Academie"],["asm","⭐️ All Star Mgmt"],["alles","Alles"]].map(x=>`<div class="wchip${scope===x[0]?" on":""}" onclick="scope='${x[0]}';render()">${x[1]} <span class="n">${INV.filter(i=>x[0]==="alles"?true:(x[0]==="pa"?i.jid===JID_PA:i.jid===JID_ASM)).length}</span></div>`).join("")+`</div>`;
function reconGo(term){ try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(term); }catch(e){} window.open(RECON_URL,"_blank"); }
function ibanHist(t){
  if(!t.iban)return[];
  return BANK.filter(b=>b.id!==t.id&&b.iban===t.iban).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
}
let busySet=new Set();
async function setPartner(lineId,pid,ev){
  if(ev)ev.stopPropagation();
  if(busySet.has(lineId))return; busySet.add(lineId); render();
  try{
    const r=await fetch(ACT_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code:GCODE,action:"set_partner",line_id:lineId,partner_id:pid})});
    const j=await r.json();
    if(j&&j.ok){ const t=BANK.find(b=>b.id===lineId); if(t){ t.pid=pid; t.pname=j.partner||t.pname; } }
    else alert("Partner zetten mislukt: "+((j&&j.error)||"onbekende fout"));
  }catch(e){ alert("Partner zetten mislukt (netwerk)"); }
  busySet.delete(lineId); render();
}

// ---- render ----
function render(){
  document.getElementById("tabs").innerHTML=[["wl","📞 Werklijst"],["fac","🧾 Alle facturen"],["aflet","🔗 Afletteren"]]
    .map(t=>`<div class="tab${tab===t[0]?" on":""}" onclick="tab='${t[0]}';render()">${t[1]}</div>`).join("");
  drawKpis();
  document.getElementById("view").innerHTML = tab==="wl"?wlHtml() : tab==="fac"?facHtml() : afletHtml();
}
function drawKpis(){
  const DEBS=calcDebs(scoped());
  const openTot=DEBS.reduce((s,d)=>s+d.open,0);
  const lateDs=DEBS.filter(d=>d.late>0&&d.open>0);
  const lateTot=lateDs.reduce((s,d)=>s+d.open,0);
  const unrec=BANK.filter(t=>!t.rec&&!isMollie(t)&&!isIntern(t)&&!doneTx.has(t.id)).length;
  const mollie=BANK.filter(t=>!t.rec&&isMollie(t)).length;
  const today=DEBS.filter(d=>d.open>0&&d.act!=="wacht").length;
  document.getElementById("kpis").innerHTML=[
    [eur0(openTot),"Openstaand ("+(scope==="pa"?"PA":scope==="asm"?"ASM":"alles")+")",""],[eur0(lateTot),"Waarvan te laat","bad"],[lateDs.length,"Debiteuren te laat",""],
    [unrec,"Bankbetalingen niet afgeletterd",unrec?"bad":"good"],[mollie,"Mollie-bundels niet afgeletterd",mollie?"bad":"good"],[today,"Vandaag actie nodig",""]
  ].map(x=>`<div class="kpi ${x[2]}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
}
function wlHtml(){
  const DEBS=calcDebs(scoped());
  let h=scopeChips();
  const bkts=["0","1-30","31-60","60+"].map(b=>{const ds=DEBS.filter(d=>d.open>0&&bucket(d)===b);return[b,ds.length,ds.reduce((s,d)=>s+d.open,0)];});
  h+=`<div class="wonchips"><span class="lbl">Overzicht (klik om te filteren):</span>`+
    `<div class="wchip${bktF==null?" on":""}" onclick="bktF=null;render()">Alles</div>`+
    bkts.map(([b,n,s])=>`<div class="wchip${bktF===b?" on":""}" onclick="bktF=bktF==='${b}'?null:'${b}';render()">${b==="0"?"Niet vervallen":b+" dgn te laat"} <span class="n">${n} · ${eur0(s)}</span></div>`).join("")+`</div>`;
  let list=DEBS.filter(d=>d.open>0).sort((a,b)=>b.score-a.score);
  if(bktF)list=list.filter(d=>bucket(d)===bktF);
  const acts=list.filter(d=>d.act!=="wacht"), rest=list.filter(d=>d.act==="wacht");
  h+=`<div class="cmp"><h3>Vandaag achteraan <span class="chsub">hoogste prioriteit eerst · klik een rij voor de facturen · namen en factuurnummers openen in Odoo</span></h3><div class="wl">`;
  if(!acts.length)h+=`<div class="empty">Niets te doen${bktF?" in dit filter":""}. 🎉</div>`;
  h+=acts.map((d,i)=>row(d,i+1,false)).join("")+`</div></div>`;
  if(rest.length)h+=`<div class="cmp"><h3>Nog niet vervallen <span class="chsub">geen actie nodig</span></h3><div class="wl">`+rest.map(d=>row(d,null,true)).join("")+`</div></div>`;
  h+=`<p class="note">Prioriteit = openstaand bedrag × hoe lang over de vervaldatum. Let op vóór je herinneringen stuurt: check op de Afletteren-tab of er nog niet-afgeletterde betalingen van deze leerling liggen — anders herinner je iemand die al betaald heeft.</p>`;
  return h;
}
function row(d,rank,rest){
  const k=String(d.pid||d.nm),opn=wlOpen.has(k),done=doneSet.has(k);
  const cls=(rest?"rest":d.late>45?"hi":d.late>14?"mid":"")+(done?" done":"");
  const [ac,al]=ACTL[d.act];
  const cand=payCands(d.pid,d.nm);
  return `<div class="wlrow ${cls}" onclick="wlTog(${JSON.stringify(String(k)).replace(/"/g,"&quot;")})">
    <div class="wlhead">${rank?`<span class="rank">${rank}</span>`:`<span class="rank">·</span>`}
      <span class="wlnm" onclick="event.stopPropagation()">${olink("res.partner",d.pid,esc(d.nm))}</span>
      <span class="wlamt">${eur0(d.open)}</span>
      <span class="wlmeta"><span>${d.late>0?`<b style="color:var(--red-tx)">${d.late} dgn te laat</b>`:"nog niet vervallen"}</span></span>
      <span class="act"><span class="actlbl ${ac}">${al}</span>
        <button class="donebtn${done?" on":""}" onclick="event.stopPropagation();doneTog(${JSON.stringify(String(k)).replace(/"/g,"&quot;")})">${done?"✓ klaar":"klaar?"}</button></span>
    </div>
    ${opn?`<div class="why">${esc(d.actT)} — ${esc(d.why)}${cand.length?" · check eerst de Afletteren-tab: er liggen nog niet-afgeletterde betalingen":""}</div><div class="wlx"><div><h4>Facturen</h4><table><tr><th>Nr</th><th>Datum</th><th>Verval</th><th>Bedrag</th><th>Open</th><th>Status</th></tr>${[...d.inv].sort((a,b)=>(b.open>0)-(a.open>0)||String(b.date).localeCompare(String(a.date))).map(i=>`<tr><td onclick="event.stopPropagation()">${olink("account.move",i.id,esc(i.name||"—"))}</td><td>${fmt(i.date)}</td><td>${i.late>0?`<b style="color:var(--red-tx)">${fmt(i.due)}</b>`:fmt(i.due)}</td><td>${eur0(i.total)}</td><td><b>${i.open>0?eur0(i.open):"✓"}</b></td><td>${psPill(i)}</td></tr>`).join("")}</table></div>
    <div><h4>Betalingen nog niet afgeletterd</h4>${cand.length?cand.map(c=>`<div class="lr"><span title="${esc(c.t.ref||"")}">${eur0(c.t.amount)} · ${fmt(c.t.date)} · ${esc(shortWhy(c.why[0]||""))}</span></div>`).join("")+`<div style="margin-top:8px"><span class="okbtn" onclick="event.stopPropagation();reconGo(${JSON.stringify(achternaam(d.nm)).replace(/"/g,"&quot;")})">🔗 Open bankaflettering (zoekterm gekopieerd)</span></div>`:`<div class="lr"><span>Geen onafgeletterde betalingen gevonden voor deze leerling.</span></div>`}<div class="note" style="margin-top:8px">Betaalafspraken uit e-mail volgen in fase 2.</div></div></div>`:""}
  </div>`;
}
function psPill(i){ const ps=i.ps; const lab=ps==="paid"?"betaald":ps==="partial"?"deels betaald":ps==="in_payment"?"in behandeling":ps==="reversed"?"gecrediteerd":"open"; const cls=ps==="paid"?"win":i.late>0?"lost":"warn"; return `<span class="stg ${cls}">${lab}</span>`; }
function facHtml(){
  let h=scopeChips();
  const IL=scoped();
  const stat=i=>i.open<=0?"betaald":i.late>0?"te laat":"open";
  const FL=[["betaald","Betaald"],["open","Open"],["te laat","Te laat"]];
  h+=`<div class="wonchips"><span class="lbl">Status:</span><div class="wchip${facStat==null?" on":""}" onclick="facStat=null;render()">Alles <span class="n">${IL.length}</span></div>`+FL.map(f=>`<div class="wchip${facStat===f[0]?" on":""}" onclick="facStat=facStat==='${f[0]}'?null:'${f[0]}';render()">${f[1]} <span class="n">${IL.filter(i=>stat(i)===f[0]).length}</span></div>`).join("")+`</div>`;
  const cols=[["Nr",i=>i.name||""],["Naam",i=>i.pname||""],["Datum",i=>i.date||""],["Vervaldatum",i=>i.due||""],["Bedrag",i=>+i.total],["Open",i=>i.open],["Dagen te laat",i=>i.late],["Status",i=>i.ps||""]];
  let list=facStat?IL.filter(i=>stat(i)===facStat):IL;
  const s=facSort;list=[...list].sort((x,y)=>{const a=cols[s.c][1](x),b=cols[s.c][1](y);return(a<b?-1:a>b?1:0)*s.d;});
  h+=`<div class="cmp"><h3>Facturen <span class="chsub">klik nr of naam om te openen in Odoo</span></h3><div style="overflow:auto"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="facSort.c===${i}?facSort.d=-facSort.d:(facSort={c:${i},d:1});render()">${c[0]} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+
    list.map(i=>`<tr><td>${olink("account.move",i.id,esc(i.name||"—"))}</td><td>${olink("res.partner",i.pid,esc(i.pname||"—"))}</td><td>${fmt(i.date)}</td><td>${fmt(i.due)}</td><td>${eur0(i.total)}</td><td><b>${i.open>0?eur0(i.open):"✓"}</b></td><td>${i.late||"—"}</td><td>${psPill(i)}</td></tr>`).join("")+`</table></div></div>`;
  return h;
}
// ---- afletteren: per leerling ----
const achternaam=nm=>String(nm||"").trim().split(" ").slice(-1)[0]||"";
const payNaam=t=>{const m=String(t.ref||"").match(/naam:\s*(.+?)(?:\s+(?:omschrijving|kenmerk|iban|bic)\b|,|$)/i);return m?m[1].trim():"";};
const shortWhy=w=>({"Odoo herkent deze klant al op de betaling":"klant staat al op de betaling","zelfde rekeningnummer als eerdere afgeletterde betaling":"bekende rekening van deze klant","achternaam komt overeen (mogelijk ouder/familie)":"zelfde achternaam","voornaam in omschrijving":"voornaam in omschrijving","bedrag = precies het openstaande saldo":"bedrag = openstaand saldo"}[w]||w.replace("bedrag lijkt een termijn","termijn").replace(" in omschrijving",""));
function payCands(pid,pname){
  const out=[];
  for(const t of BANK){
    if(t.rec||isMollie(t)||isIntern(t)||doneTx.has(t.id))continue;
    let sc=0,why=[];
    if(pid&&t.pid===pid){sc+=60;why.push("Odoo herkent deze klant al op de betaling");}
    if(pid&&t.iban&&IBANMAP.has(t.iban)&&IBANMAP.get(t.iban).pid===pid){sc+=55;why.push("zelfde rekeningnummer als eerdere afgeletterde betaling");}
    const ref=norm(t.ref);
    const refS=" "+nrmS(t.ref)+" ", pnS=" "+nrmS(t.pname)+" ";
    const lnp=nrmS(String(pname||"").trim().split(" ").slice(1).join(" ")); // volledige achternaam incl. tussenvoegsels
    if(lnp.length>=4&&(refS.includes(" "+lnp+" ")||pnS.includes(" "+lnp+" "))){sc+=30;why.push("achternaam komt overeen (mogelijk ouder/familie)");}
    const fn=nrmS(String(pname||"").trim().split(" ")[0]);
    if(fn.length>=4&&refS.includes(" "+fn+" ")){sc+=14;why.push("voornaam in omschrijving");}
    for(const i of INV){ if(i.pid===pid&&i.name&&ref.includes(norm(i.name))){sc+=60;why.push("factuurnummer "+i.name+" in omschrijving");break;} }
    if(sc>0){
      const open=INV.filter(i=>i.pid===pid).reduce((s,i)=>s+i.open,0);
      if(Math.abs(+t.amount-open)<1){sc+=20;why.push("bedrag = precies het openstaande saldo");}
      else{ const tots=INV.filter(i=>i.pid===pid).map(i=>+i.total); for(const tt of tots){ for(const n of [2,4,5,8,10]){ if(Math.abs(+t.amount-tt/n)<2){sc+=10;why.push("bedrag lijkt een termijn (1/"+n+" van "+eur0(tt)+")");break;} } } }
      if(sc>=55||why.length>=2) out.push({t,sc,why}); // ≥2 onafhankelijke signalen, of één ijzersterk signaal (partner/IBAN/factuurnr)
    }
  }
  out.sort((a,b)=>b.sc-a.sc);
  return out;
}
function afletHtml(){
  const paDebs=calcDebs(INV.filter(i=>i.jid===JID_PA));
  const cards=paDebs.map(d=>({d,cand:payCands(d.pid,d.nm)}));
  const withPay=cards.filter(c=>c.cand.length).sort((a,b)=>b.d.open-a.d.open);
  const claimed=new Set(); withPay.forEach(c=>c.cand.forEach(x=>claimed.add(x.t.id)));
  const mollie=BANK.filter(t=>!t.rec&&isMollie(t));
  const rest=BANK.filter(t=>!t.rec&&!isMollie(t)&&!isIntern(t)&&!claimed.has(t.id)&&!doneTx.has(t.id));
  let h=`<div class="cmp"><h3>Per leerling: betalingen die nog afgeletterd moeten worden · ${withPay.length} leerlingen <span class="chsub">alleen Producer Academie · klik een leerling voor de details · de knop opent de Bankaflettering-view in Odoo en kopieert de zoekterm</span></h3>`;
  if(!withPay.length)h+=`<div class="empty">Geen onafgeletterde betalingen te koppelen aan leerlingen. 👌</div>`;
  h+=`<div class="wl">`+withPay.map(c=>{
    const d=c.d,k="a"+(d.pid||d.nm),opn=afOpen.has(k);
    const som=c.cand.reduce((s,x)=>s+ +x.t.amount,0);
    return `<div class="wlrow ${d.open>0?"mid":""}" onclick="afTog(${JSON.stringify(k).replace(/"/g,"&quot;")})">
      <div class="wlhead"><span class="rank">€</span>
        <span class="wlnm" onclick="event.stopPropagation()">${olink("res.partner",d.pid,esc(d.nm))}</span>
        <span class="wlamt">${eur0(d.open)}</span>
        <span class="wlmeta"><span>openstaand volgens Odoo</span><span>${c.cand.length} mogelijke betaling${c.cand.length===1?"":"en"} gevonden (samen ${eur0(som)})</span>${c.cand.some(x=>!x.t.pid)?`<span><span class="stg lost">naam ontbreekt op betaling</span></span>`:""}</span>
        <span class="act"><span class="okbtn" onclick="event.stopPropagation();reconGo(${JSON.stringify(achternaam(d.nm)).replace(/"/g,"&quot;")})">🔗 Bankaflettering</span></span>
      </div>
      <div class="why">Als deze betalingen kloppen, is het echte openstaand ${eur0(Math.max(0,d.open-som))} in plaats van ${eur0(d.open)} — check vóór je herinnert.</div>
      ${opn?`<div class="wlx"><div><h4>Gevonden betalingen</h4>${c.cand.map(x=>{const h2=ibanHist(x.t);const tt=(x.t.ref||"")+(h2.length?"  |  eerder via deze rekening: "+h2.map(v=>eur0(v.amount)+" op "+fmt(v.date)+(v.rec?" (afgeletterd"+(v.pname?" op "+v.pname:"")+")":" (nog open)")).join(", "):"");return `<div class="mtch"><span class="conf ${x.sc>=70?"hi":x.sc>=45?"mid":"lo"}">${x.sc>=70?"zeker":x.sc>=45?"waarschijnlijk":"onzeker"}</span><span title="${esc(tt)}"><b>${eur0(x.t.amount)}</b> · ${fmt(x.t.date)}${payNaam(x.t)?` · van ${esc(payNaam(x.t))}`:""}${x.t.pid?' · <span class="stg win">naam staat al op de betaling</span>':""}<br><span class="chsub">${x.why.map(shortWhy).join(" · ")}${h2.length?` · 🔎 ${h2.length} eerdere betaling${h2.length===1?"":"en"} via deze rekening`:""}</span></span><span class="act"><span class="okbtn" onclick="event.stopPropagation();reconGo(${JSON.stringify(payNaam(x.t)||achternaam(d.nm)).replace(/"/g,"&quot;")})">🔗 Bekijk in Odoo</span></span></div>`;}).join("")}</div>
      <div><h4>Facturen van ${esc(d.nm)}</h4><table><tr><th>Nr</th><th>Bedrag</th><th>Open</th><th>Status</th></tr>${d.inv.map(i=>`<tr><td onclick="event.stopPropagation()">${olink("account.move",i.id,esc(i.name||"—"))}</td><td>${eur0(i.total)}</td><td><b>${i.open>0?eur0(i.open):"✓"}</b></td><td>${psPill(i)}</td></tr>`).join("")}</table><div class="note" style="margin-top:8px">Klopt een betaling? Klik "Bekijk in Odoo" — de naam van de betaler staat dan op je klembord; plak die in het zoekveld, zet daar zelf de klant op de betaling en klik Afletteren. Dit dashboard boekt niets. Hover over een betaling voor de volledige omschrijving.</div></div></div>`:""}
    </div>`;
  }).join("")+`</div></div>`;
  h+=`<div class="cmp"><h3>🟣 Mollie-uitbetalingen (bundels) · ${mollie.length} · ${eur0(mollie.reduce((s,t)=>s+ +t.amount,0))} <span class="chsub">één Mollie-storting bevat meerdere klantbetalingen — uitsplitsen kan alleen in Mollie</span></h3>
    ${mollie.slice(0,10).map(t=>`<div class="lr"><span>${eur0(t.amount)} · ${fmt(t.date)} · <span class="chsub">${esc(String(t.ref||"").match(/REF [^ ]+/)?.[0]||"Mollie")}</span></span></div>`).join("")}${mollie.length>10?`<div class="chsub" style="margin:4px 0 8px">… en ${mollie.length-10} meer</div>`:""}
    <div style="margin-top:8px"><a class="okbtn" style="text-decoration:none" href="${MOLLIE_URL}" target="_blank">🔗 Open Mollie-dashboard</a></div>
    <p class="note">Wil je dat deze bundels hier automatisch uitgesplitst worden per leerling? Zet dan een Mollie API-key in n8n (Mollie → Developers → API-keys) — dan halen we per uitbetaling de losse betalingen op en matchen ze vanzelf.</p></div>`;
  h+=`<div class="cmp"><h3>❓ Overige niet-afgeletterde betalingen · ${rest.length} <span class="chsub">geen leerling herkend — handmatig bekijken</span></h3>
    ${rest.slice(0,afAll?rest.length:25).map(t=>`<div class="mtch"><span class="conf lo">onbekend</span><span><b>${eur0(t.amount)}</b> · ${fmt(t.date)}<br><span class="chsub" title="${esc(t.ref||"")}" style="display:inline-block;max-width:640px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">"${esc(t.ref||"—")}"</span></span><span class="act"><span class="okbtn" onclick="reconGo(${JSON.stringify(String((norm((BANK.find(b=>b.id===t.id)||{}).ref||"").match(/naam: ([^o]+?) (?:omschrijving|kenmerk)/)?.[1]||"").trim().split(" ").slice(-1)[0]||"")).replace(/"/g,"&quot;")})">🔗 Bankaflettering</span></span></div>`).join("")}
    ${rest.length>25&&!afAll?`<div style="text-align:center;margin:10px 0"><span class="wchip" style="display:inline-flex" onclick="afAll=true;render()">Toon alle ${rest.length}</span></div>`:""}</div>`;
  return h;
}
function wlTog(k){wlOpen.has(k)?wlOpen.delete(k):wlOpen.add(k);render();}
function afTog(k){afOpen.has(k)?afOpen.delete(k):afOpen.add(k);render();}
function doneTog(k){doneSet.has(k)?doneSet.delete(k):doneSet.add(k);render();}

// ---- start ----
try{ const c=sessionStorage.dpacFinCode; if(c) gTry(c,true); else if(location.search.indexOf("local=1")>=0) gTry("",true); }catch(e){ if(location.search.indexOf("local=1")>=0) gTry("",true); }
