// DPAC · Administratie-dashboard (Hermes, DPAC-315/353). Werklijst betalingen voor Michèle. Eén scherm: Werklijst · Eerste betaling · Afspraken · Afletteren; klik een naam = zijpaneel.
// Data: n8n-endpoint dpac-admin-data (lezen + schrijven naar Notion Leerlingen, zie README.md) · lokaal: ?local=1 laadt admin_data.json (fictief).
// Schrijven: zijpaneel per leerling (herinnering, aanmaning, termijnen, betaalafspraak, notitie, schuldhulp). In local-modus alleen in deze browser.
// Tab Afletteren = overgenomen uit finance/app.js (facturen/bankregels zitten in hetzelfde antwoord).
const DATA_URL="https://dpac.app.n8n.cloud/webhook/dpac-admin-data";
const LOCAL=()=>location.search.indexOf("local=1")>=0;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eur0=v=>"€ "+Math.round(+v||0).toLocaleString("nl-NL");
const MND=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const TODAY=new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
const fmt=s=>{ if(!s) return "—"; const d=new Date(String(s).slice(0,10)+"T00:00:00"); if(isNaN(d)) return "—"; return d.getDate()+" "+MND[d.getMonth()]+(d.getFullYear()!==TODAY.getFullYear()?" ’"+String(d.getFullYear()).slice(2):""); };
const days=s=>{ if(!s) return null; const d=new Date(String(s).slice(0,10)+"T00:00:00"); return isNaN(d)?null:Math.round((TODAY-d)/864e5); };
const jq=s=>JSON.stringify(String(s)).replace(/"/g,"&quot;");
const objs=(cols,rows)=>(rows||[]).map(r=>{ const o={}; cols.forEach((c,i)=>o[c]=r[i]); return o; });
const pad2=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
const VANDAAG=ymd(TODAY);
const dmy=s=>{ const m=String(s||"").slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?m[3]+"-"+m[2]+"-"+m[1]:""; };   // labels: DD-MM-JJJJ
const eurT=v=>{ const n=Math.round((+v||0)*100)/100; return "€ "+n.toLocaleString("nl-NL",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}); };   // termijnbedrag: centen alleen als ze er zijn
const isJa=v=>v===true||v==="true"||v==="Ja";

// ---- termijnen: tekst "YYYY-MM-DD|bedrag|open|binnen" per regel ----
function parseBedrag(v){ let t=String(v==null?"":v).replace(/[€\s]/g,""); if(!t) return 0; if(t.includes(",")) t=t.replace(/\./g,"").replace(",","."); else if(/^\d{1,3}(\.\d{3})+$/.test(t)) t=t.replace(/\./g,""); const n=parseFloat(t); return isNaN(n)?0:Math.round(n*100)/100; }
function parseDatum(v){ const t=String(v||"").trim(); let m=t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if(m) return m[1]+"-"+pad2(m[2])+"-"+pad2(m[3]); m=t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/); return m?m[3]+"-"+pad2(m[2])+"-"+pad2(m[1]):""; }
function parseTermijnen(txt){ return String(txt||"").split(/\r?\n/).map(r=>r.trim()).filter(Boolean).map(r=>{ const p=r.split("|").map(x=>x.trim()); return {datum:parseDatum(p[0]),bedrag:parseBedrag(p[1]),binnen:/^binnen/i.test(p[2]||"")}; }).filter(t=>t.datum||t.bedrag); }
const termijnenTekst=T=>T.map(t=>t.datum+"|"+t.bedrag+"|"+(t.binnen?"binnen":"open")).join("\n");
function plusMaand(s){ const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return VANDAAG; let y=+m[1], mo=+m[2]+1; if(mo>12){ mo=1; y++; } return y+"-"+pad2(mo)+"-"+pad2(Math.min(+m[3],new Date(y,mo,0).getDate())); }


// ---- toegang + data ----
// ---- toegang + data ----
let S=[], GEN=null, GCODE="", DEMO=false;
async function laad(code){
  const resp=await fetch(DATA_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code})});
  if(!resp.ok) throw new Error("server gaf "+resp.status);
  const data=await resp.json();
  if(!data||data.error) throw new Error(data&&data.error==="unauthorized"?"code":"onbruikbaar antwoord");
  if(!Array.isArray(data.students)) throw new Error("onbruikbaar antwoord");
  return data;
}
async function gTry(code,stil){
  const f=document.getElementById("gfout"); if(f) f.textContent=stil?"":"code controleren en gegevens ophalen…";
  try{
    let data;
    if(LOCAL()){ data=await (await fetch("admin_data.json")).json(); DEMO=true; }
    else data=await laad(code);
    GCODE=code; try{ sessionStorage.dpacAdminCode=code; }catch(e){}   // alleen dit tabblad; nooit automatisch inloggen via localStorage
    S=objs(data.student_cols,data.students); GEN=data.gen;
    if(DEMO) lokaleEditsToepassen();
    INV=objs(data.inv_cols||[],data.invoices); BANK=objs(data.bank_cols||[],data.bank);
    document.getElementById("gate").style.display="none";
    document.getElementById("demo").style.display=DEMO?"block":"none";
    finBoot(); boot(); return true;
  }catch(e){
    if(e.message==="code"){ try{ sessionStorage.removeItem("dpacAdminCode"); }catch(x){} }
    if(!stil){ f.textContent=e.message==="code"?"Onjuiste code":"Laden mislukt ("+e.message+")"; const gi=document.getElementById("gcode"); if(gi) gi.value=""; }
    else f.textContent="";
    return false;
  }
}
function gCheck(){ gTry(document.getElementById("gcode").value.trim(),false); }
async function ververs(){ const b=document.getElementById("refr"); if(b) b.classList.add("busy"); try{ if(LOCAL()) await gTry("",true); else if(GCODE) await gTry(GCODE,true); } finally{ if(b) b.classList.remove("busy"); } }

// ---- schrijven (naar Notion via het endpoint; local-modus: alleen in deze browser) ----
const leesLokaal=()=>{ try{ return JSON.parse(localStorage.dpacAdminLocalEdits||"{}")||{}; }catch(e){ return {}; } };
function lokaleEditsToepassen(){ const E=leesLokaal(); for(const s of S) if(E[s.id]){ Object.assign(s,E[s.id]); if("betaalafspraak_tot" in E[s.id]) s.op_betaallijst=null; } }
function bewaarLokaal(id,velden){ const E=leesLokaal(); E[id]=Object.assign(E[id]||{},velden); localStorage.dpacAdminLocalEdits=JSON.stringify(E); }
const WSEQ={};
async function schrijf(id,velden){
  const s=S.find(x=>x.id===id); if(!s) return false;
  const keys=Object.keys(velden), oud={op_betaallijst:s.op_betaallijst}, seq={};
  for(const k of keys){ oud[k]=s[k]; s[k]=velden[k]; seq[k]=WSEQ[id+k]=(WSEQ[id+k]||0)+1; }
  if("betaalafspraak_tot" in velden) s.op_betaallijst=null;   // Notion-formule rekent pas bij de volgende stand; tot dan rekent het dashboard zelf
  verrijk(s); render();
  try{
    if(LOCAL()) bewaarLokaal(id,velden);
    else{
      const r=await fetch(DATA_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(Object.assign({code:GCODE,actie:"schrijf",page_id:id},velden))});
      if(!r.ok) throw new Error("server gaf "+r.status);
      const j=await r.json();
      if(!j||!j.ok) throw new Error(j&&j.error==="unauthorized"?"code verlopen, ververs de pagina":(j&&j.error)||"onbruikbaar antwoord");
    }
    if(PN===id) pnMeld(true);
    return true;
  }catch(e){
    let terug=false; for(const k of keys) if(WSEQ[id+k]===seq[k]){ s[k]=oud[k]; terug=true; }
    if(terug&&"betaalafspraak_tot" in velden) s.op_betaallijst=oud.op_betaallijst;
    verrijk(s); render();
    if(PN===id){ pnMeld(false,"Niet opgeslagen ("+e.message+")"); pnHerstel(s,keys); }
    else alert("Niet opgeslagen voor "+s.naam+" ("+e.message+")");
    return false;
  }
}

// ---- verrijking ----
const WL_STATUS=["Loopt ernstig achter","Loopt achter","Nog niets","Checken"];
const RANK={"Loopt ernstig achter":0,"Loopt achter":1,"Nog niets":2,"Checken":3};
function verrijk(s){
  s.open=+s.openstaand||0; s.betaald=+s.betaald||0; s.traject=+s.trajectbedrag||0;
  s.pct=s.traject?Math.min(100,Math.round(s.betaald/s.traject*100)):null;
  s.afsprDagen=s.betaalafspraak_tot?-days(s.betaalafspraak_tot):null;       // >0 = nog in de toekomst
  s.opLijst = s.op_betaallijst==null ? !(s.afsprDagen>0) : (s.op_betaallijst===true||s.op_betaallijst==="Ja");
  s.status=s.betaalstatus||"";
  s.actief=s.actief||"";
  s.dagenSinds=days(s.inschrijfdatum);
  s.bedenk=s.bedenktijd_rest!=null?+s.bedenktijd_rest:null;
  s.klas=s.klas||"(geen klas)"; s.cohort=s.cohort||"";
  s.zoek=[s.naam,s.klas,s.email,s.telefoon,s.salesrep].filter(Boolean).join(" ").toLowerCase();
  // actie voor Michèle
  if(s.status==="Checken"){ s.act=["chk","🔎 Checken in Moneybird"]; s.why="Leerling uit de Moneybird-tijd: betaald bedrag met de hand nakijken en in Notion zetten."; }
  else if(s.status==="Loopt ernstig achter"){ s.act=["aanm","⚠️ Aanmaning / bellen"]; s.why="Status Loopt ernstig achter: les geweigerd tot betaling (automatisch via Leerlingstatus)."; }
  else if(s.status==="Loopt achter"){ s.act=["bel","📞 Bellen of herinnering"]; s.why="Loopt achter op het betaalschema."; }
  else if(s.status==="Nog niets"||!s.status){ s.act=["rep","🤝 Eerste betaling · "+(s.salesrep||"salesrep")]; s.why="Nog geen eerste betaling: de salesrep is eigenaar tot de eerste termijn binnen is."; }
  else if(s.status==="Startbedrag binnen"){ s.act=["herin","✉️ Vervolgtermijn plannen"]; s.why="Startbedrag is binnen, rest van het traject nog niet."; }
  else if(s.status==="Loopt bij"){ s.act=["wacht","⏳ Loopt bij"]; s.why="Betaalt volgens schema."; }
  else if(s.status==="Volledig betaald"){ s.act=["ok","✅ Volledig betaald"]; s.why="Alles betaald."; }
  else { s.act=["wacht",s.status]; s.why=""; }
  s.cls = s.status==="Loopt ernstig achter"?"hi" : s.status==="Loopt achter"?"mid" : s.status==="Nog niets"||!s.status?"lo" : s.status==="Checken"?"chk" : s.status==="Volledig betaald"?"ok":"";
}
function boot(){
  for(const s of S) verrijk(s);
  const gd=GEN?new Date(GEN):null;
  document.getElementById("gen").textContent = gd&&!isNaN(gd)? "stand "+gd.getDate()+" "+MND[gd.getMonth()]+" "+String(gd.getHours()).padStart(2,"0")+":"+String(gd.getMinutes()).padStart(2,"0") : "";
  render();
}
// ---- selecties ----
const werklijst=()=>S.filter(s=>WL_STATUS.includes(s.status)&&s.opLijst);
const wachtEerste=()=>S.filter(s=>s.actief==="Actief"&&(s.status===""||s.status==="Nog niets"));
const afspraken=()=>S.filter(s=>s.afsprDagen!=null&&s.afsprDagen>0).sort((a,b)=>a.afsprDagen-b.afsprDagen);
const checken=()=>S.filter(s=>s.status==="Checken");
const bonusOpen=()=>S.filter(s=>s.betaald>=1000&&s.bonus_uitgekeerd===false&&s.salesrep);
const vandaagChecken=()=>S.filter(s=>String(s.betaalafspraak_tot||"").slice(0,10)===VANDAAG).sort((a,b)=>b.open-a.open);


// ---- state ----
let seg="wl", statF=null, klasF=null, q="", chkOpen=false, CHECKED=new Set(), afOpen=new Set(), afAll=false, MAXROWS=60;
try{ const c=JSON.parse(localStorage.dpacAdminChecked||"null"); if(c&&c.d===VANDAAG&&Array.isArray(c.ids)) CHECKED=new Set(c.ids); }catch(e){}   // "gecheckt" geldt alleen vandaag
function saveChecked(){ try{ localStorage.dpacAdminChecked=JSON.stringify({d:VANDAAG,ids:[...CHECKED]}); }catch(e){} }
function chkTog(k){ CHECKED.has(k)?CHECKED.delete(k):CHECKED.add(k); saveChecked(); render(); }
function keepScroll(fn){ const y=window.scrollY; fn(); window.scrollTo(0,y); }
const KORT={"Loopt ernstig achter":"Ernstig achter","Loopt achter":"Achter","Nog niets":"Nog niets","Checken":"Checken","Volledig betaald":"Betaald","Loopt bij":"Loopt bij","Startbedrag binnen":"Start binnen"};
const kort=s=>KORT[s]||s||"Geen status";
const SEP='</span><span>';   // meta-items: elk in een span, scheidingsteken via CSS (::before), zodat er nooit een los punt aan het regeleinde hangt

function boot(){
  for(const s of S) verrijk(s);
  const gd=GEN?new Date(GEN):null;
  document.getElementById("gen").textContent = gd&&!isNaN(gd)? "stand "+gd.getDate()+" "+MND[gd.getMonth()]+" "+pad2(gd.getHours())+":"+pad2(gd.getMinutes()) : "";
  render();
}
function render(){
  const wl=werklijst(), we=wachtEerste(), af=afspraken();
  const T=[["wl","Werklijst",wl.length],["eerste","Eerste betaling",we.length],["afspr","Afspraken",af.length],["afl","Afletteren",aflData().withPay.length]];
  document.getElementById("segs").innerHTML=T.map(t=>`<button class="seg${seg===t[0]?" on":""}" onclick="seg='${t[0]}';statF=null;klasF=null;render()">${t[1]}<b>${t[2]}</b></button>`).join("");
  keepScroll(()=>{ document.getElementById("view").innerHTML = q.trim()?zoekHtml() : seg==="wl"?wlHtml(wl) : seg==="eerste"?eersteHtml(we) : seg==="afspr"?afsprHtml(af) : afletHtml(); });
}

// ---- rijen ----
const shIcoon=s=>isJa(s.schuldhulp)?`<span class="shi" title="Schuldhulpverlening">◎</span>`:"";
function termTxt(s){
  const T=parseTermijnen(s.termijnen).filter(t=>!t.binnen); if(!T.length) return "";
  const nx=T.filter(t=>t.datum).sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0)[0]||T[0];
  const som=T.reduce((a,t)=>a+t.bedrag,0);
  return `<span><b>${eurT(nx.bedrag)}${nx.datum?` op <span${nx.datum<VANDAAG?' class="late"':""}>${dmy(nx.datum)}</span>`:""}</b> · nog ${eurT(som)}</span>`;
}
function metaWl(s){
  const m=[`${esc(s.klas)}${s.betaalwijze?" · "+esc(s.betaalwijze):""}`];
  if(s.afsprDagen!=null&&s.afsprDagen<=0) m.push(`<span class="late">afspraak verlopen ${dmy(s.betaalafspraak_tot)}</span>`);
  if(s.herinnering) m.push(`Herinnering gestuurd: ${dmy(s.herinnering)}`);
  if(s.aanmaning) m.push(`<span class="late">Aanmaning gestuurd: ${dmy(s.aanmaning)}</span>`);
  const t=termTxt(s); if(t) m.push(t);
  return m.join(SEP);
}
function row(s,meta,right){
  return `<div class="row ${s.cls}" onclick="openPaneel(${jq(s.id)})" role="button" tabindex="0" onkeydown="if(event.key==='Enter')openPaneel(${jq(s.id)})">
    <div class="nm"><span>${esc(s.naam)}</span>${shIcoon(s)}</div>
    <div class="meta"><span>${meta}</span></div>
    <div class="amt"><span class="num">${eur0(s.open)}</span><small>van ${eur0(s.traject)}</small></div>
    ${right!==undefined?right:`<span class="pill ${s.cls}">${esc(kort(s.status))}</span>`}
  </div>`;
}
const filt=list=>list.filter(s=>(statF==null||s.status===statF)&&(klasF==null||s.klas===klasF));
function lijst(title,sub,list,metaFn,right){
  const shown=list.slice(0,MAXROWS);
  return `<div class="list"><div class="lhead"><h2>${title}</h2><span>${sub}</span></div>${shown.length?shown.map(s=>row(s,metaFn(s),right?right(s):undefined)).join(""):`<div class="empty">Niets te doen.</div>`}${list.length>MAXROWS?`<button class="more" onclick="MAXROWS+=100;render()">Toon alle ${list.length}</button>`:""}</div>`;
}
function klasSel(list){
  const kl=new Map(); for(const s of list) kl.set(s.klas,(kl.get(s.klas)||0)+1);
  if(kl.size<2) return "";
  return `<span class="sp"></span><select class="sel" aria-label="Klas" onchange="klasF=this.value||null;render()"><option value="">Alle klassen</option>${[...kl.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<option value="${esc(k)}"${klasF===k?" selected":""}>${esc(k)} (${n})</option>`).join("")}</select>`;
}

// ---- werklijst ----
function wlHtml(wl){
  const ern=wl.filter(s=>s.status==="Loopt ernstig achter").length, ach=wl.filter(s=>s.status==="Loopt achter").length, chk=wl.filter(s=>s.status==="Checken").length, nn=wl.length-ern-ach-chk;
  const openWl=wl.reduce((a,s)=>a+s.open,0);
  const L=vandaagChecken(), n=L.filter(s=>!CHECKED.has(s.id)).length;
  let h=`<div class="bar"><div class="sum"><span class="num">${eur0(openWl)}</span><span>open bij ${wl.length} leerlingen</span></div><span class="sp"></span>
    <button class="pbtn${L.length?(chkOpen?" on":""):" dim"}" ${L.length?`onclick="chkOpen=!chkOpen;render()"`:"disabled"} title="Betaalafspraak tot vandaag: kijk of de betaling binnen is en vink af">${L.length?"Vandaag betaling checken":"Vandaag niets te checken"}${L.length?`<span class="pill-n">${n}</span>`:""}</button></div>`;
  if(chkOpen&&L.length) h+=`<div class="ck"><div class="lhead"><h2>Vandaag betaling checken</h2><span>${L.length-n} van ${L.length} gecheckt · betaalafspraak tot ${dmy(VANDAAG)}</span></div>${L.map(s=>{ const c=CHECKED.has(s.id); return `<div class="ckrow${c?" on":""}"><label class="ckbox"><input type="checkbox"${c?" checked":""} onchange="chkTog(${jq(s.id)})" aria-label="Gecheckt: ${esc(s.naam)}"></label><span class="nml" onclick="openPaneel(${jq(s.id)})">${esc(s.naam)}</span><span class="sub">${esc(s.klas)} · ${eur0(s.open)}</span></div>`; }).join("")}</div>`;
  const chipF=(k,t,n,cls)=>n?`<button class="chip${statF===k?" on":""}" onclick="statF=statF===${jq(k)}?null:${jq(k)};render()">${t}<b>${n}</b></button>`:"";
  h+=`<div class="filt"><button class="chip${statF==null?" on":""}" onclick="statF=null;render()">Alles<b>${wl.length}</b></button>${chipF("Loopt ernstig achter","Ernstig achter",ern)}${chipF("Loopt achter","Achter",ach)}${chipF("Nog niets","Nog niets",nn)}${chipF("Checken","Checken",chk)}${klasSel(wl)}</div>`;
  const list=filt(wl).sort((a,b)=>(RANK[a.status]??9)-(RANK[b.status]??9)||b.open-a.open);
  h+=lijst("Achteraan","ernstig eerst, dan hoogste bedrag · klik een rij",list,metaWl);
  return h;
}
// ---- eerste betaling ----
function eersteHtml(we){
  const list=filt(we).sort((a,b)=>(b.dagenSinds||0)-(a.dagenSinds||0));
  let h=`<div class="bar"><div class="sum"><span class="num">${we.length}</span><span>wachten op hun eerste betaling · de salesrep is eigenaar tot de eerste termijn binnen is</span></div></div>`;
  h+=`<div class="filt">${klasSel(we).replace('<span class="sp"></span>','')}</div>`;
  h+=lijst("Langst wachtend eerst","klik een rij",list,s=>`${esc(s.klas)}${SEP}ingeschreven ${dmy(s.inschrijfdatum)}${s.dagenSinds!=null?` (${s.dagenSinds} d)`:""}${s.bedenk>0?`${SEP}bedenktijd nog ${s.bedenk} d`:""}`,s=>`<span class="pill">${esc(s.salesrep||"geen rep")}</span>`);
  return h;
}
// ---- afspraken ----
function afsprHtml(af){
  const list=filt(af);
  let h=`<div class="bar"><div class="sum"><span class="num">${af.length}</span><span>lopende betaalafspraken · komen de dag na de afspraakdatum terug op de werklijst</span></div></div>`;
  h+=lijst("Eerstvolgende eerst","klik een rij",list,s=>`${esc(s.klas)}${SEP}${esc(kort(s.status))}${s.herinnering?`${SEP}Herinnering gestuurd: ${dmy(s.herinnering)}`:""}`,s=>`<span class="pill${s.afsprDagen<=1?" mid":""}">${s.afsprDagen===0?"vandaag":s.afsprDagen===1?"morgen":"t/m "+dmy(s.betaalafspraak_tot)}</span>`);
  return h;
}
// ---- zoeken (over alle leerlingen) ----
function zoekHtml(){
  const t=q.trim().toLowerCase(), list=S.filter(s=>s.zoek.includes(t)).sort((a,b)=>b.open-a.open);
  return lijst(`Zoekresultaat`,`${list.length} van ${S.length} leerlingen`,list,s=>`${esc(s.klas)}${s.actief&&s.actief!=="Actief"?`${SEP}${esc(s.actief)}`:""}${s.afsprDagen>0?`${SEP}afspraak t/m ${dmy(s.betaalafspraak_tot)}`:""}`);
}

// ---- zijpaneel per leerling ----
let PN=null, PT=[], NT=null, MT=null;
const pnLeerling=()=>S.find(x=>x.id===PN);
function openPaneel(id){
  const s=S.find(x=>x.id===id); if(!s) return;
  if(PN&&PN!==id) ntSave();
  PN=id; PT=parseTermijnen(s.termijnen);
  const el=document.getElementById("pn");
  el.innerHTML=pnHtml(s); tmDraw();
  el.classList.add("on"); document.getElementById("pnbg").classList.add("on"); document.body.style.overflow="hidden";
  el.scrollTop=0; grow(document.getElementById("pnNote"));
  el.focus({preventScroll:true});
}
function sluitPaneel(){
  if(!PN) return;
  ntSave(); PN=null; clearTimeout(MT);
  document.getElementById("pn").classList.remove("on"); document.getElementById("pnbg").classList.remove("on"); document.body.style.overflow="";
}
const datumVeld=(f,v,hint)=>`<div class="dv"><input type="date" id="pn_${f}" value="${esc(String(v||"").slice(0,10))}" onchange="zetDatum('${f}',this.value)" aria-label="${hint}"><button class="tb" onclick="zetDatum('${f}',VANDAAG)">Vandaag</button>${v?`<button class="tb" onclick="zetDatum('${f}','')">Wissen</button>`:""}</div>`;
function pnHtml(s){
  return `<div class="pnhd"><div class="sp"><h2>${esc(s.naam)}${shIcoon(s)}</h2><div class="pnsub">${esc(s.klas)}${s.betaalwijze?" · "+esc(s.betaalwijze):""}${s.actief&&s.actief!=="Actief"?" · "+esc(s.actief):""}</div></div><span class="pnmsg" id="pnMsg" aria-live="polite"></span><button class="pnx" id="pnx" onclick="sluitPaneel()" aria-label="Sluiten"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  <div class="pnamt"><span class="num">${eur0(s.open)}</span><span>open van ${eur0(s.traject)}</span><span class="tag pill ${s.cls}">${esc(kort(s.status))}</span></div>
  <div class="fld"><label>Betaalafspraak tot<small>daarna weer op de werklijst</small></label>${datumVeld("betaalafspraak_tot",s.betaalafspraak_tot,"Betaalafspraak tot")}</div>
  <div class="fld"><label>Herinnering gestuurd</label>${datumVeld("herinnering",s.herinnering,"Herinnering gestuurd")}</div>
  <div class="fld"><label>Aanmaning gestuurd</label>${datumVeld("aanmaning",s.aanmaning,"Aanmaning gestuurd")}</div>
  <div class="fld col"><label>Betaaltermijnen</label><div id="tm"></div></div>
  <div class="fld col"><label>Notitie</label><textarea id="pnNote" rows="3" oninput="ntInput(this)" onblur="ntSave()" aria-label="Notitie">${esc(s.notitie||"")}</textarea></div>
  <label class="pnck"><input type="checkbox" id="pnSh"${isJa(s.schuldhulp)?" checked":""} onchange="schrijf(PN,{schuldhulp:this.checked})"><span>Schuldhulpverlening</span></label>
  <div class="links">${s.link_notion?`<a class="lnk pri" href="${esc(s.link_notion)}" target="_blank" rel="noopener">Notion</a>`:""}${s.link_odoo?`<a class="lnk" href="${esc(s.link_odoo)}" target="_blank" rel="noopener">Odoo</a>`:""}${s.link_moneybird?`<a class="lnk" href="${esc(s.link_moneybird)}" target="_blank" rel="noopener">Moneybird</a>`:""}${s.telefoon?`<a class="lnk" href="tel:${esc(String(s.telefoon).replace(/\s/g,""))}">${esc(s.telefoon)}</a>`:""}${s.email?`<a class="lnk" href="mailto:${esc(s.email)}">E-mail</a>`:""}</div>
  <div class="kv"><span>Betaald</span><span>${eur0(s.betaald)}${s.betaald_odoo!=null&&s.betaald_notion!=null&&Math.abs(s.betaald_odoo-s.betaald_notion)>1?` <span class="late">(Odoo ${eur0(s.betaald_odoo)}, Notion ${eur0(s.betaald_notion)})</span>`:""}</span><span>Bron</span><span>${s.bron==="odoo"?"Odoo":"handmatig (Moneybird)"}</span><span>Ingeschreven</span><span>${dmy(s.inschrijfdatum)||"—"}${s.bedenk>0?` · bedenktijd nog ${s.bedenk} d`:""}</span><span>Salesrep</span><span>${esc(s.salesrep||"—")}</span></div>
  ${s.tijdlijn?`<h4>Eerdere afspraken (Notion)</h4><div class="pre">${esc(s.tijdlijn)}</div>`:""}`;
}
function pnMeld(ok,txt){
  const el=document.getElementById("pnMsg"); if(!el) return;
  clearTimeout(MT); el.className="pnmsg "+(ok?"ok":"fout"); el.textContent=ok?"Opgeslagen":txt;
  if(ok) MT=setTimeout(()=>{ el.textContent=""; el.className="pnmsg"; },1500);
}
function pnHerstel(s,keys){   // na een mislukte schrijfactie: velden terug naar de waarde in S (notitie blijft staan)
  for(const k of keys){
    const el=document.getElementById("pn_"+k); if(el) el.value=String(s[k]||"").slice(0,10);
    if(k==="schuldhulp"){ const c=document.getElementById("pnSh"); if(c) c.checked=isJa(s.schuldhulp); }
    if(k==="termijnen"){ PT=parseTermijnen(s.termijnen); tmDraw(); }
  }
}
function zetDatum(f,v){
  const s=pnLeerling(); if(!s) return;
  if(String(s[f]||"").slice(0,10)===(v||"")) return;
  const dv=document.getElementById("pn_"+f)?.closest(".dv");
  schrijf(PN,{[f]:v||null}).then(()=>{ if(PN===s.id&&dv&&dv.isConnected) dv.outerHTML=datumVeld(f,s[f],dv.querySelector("input")?.getAttribute("aria-label")||f); });   // alleen dit veld vernieuwen (Wissen-knop), melding blijft staan
}
function grow(el){ if(!el) return; el.style.height="auto"; el.style.height=(el.scrollHeight+2)+"px"; }
function ntInput(el){ grow(el); clearTimeout(NT); NT=setTimeout(ntSave,800); }
function ntSave(){
  clearTimeout(NT); NT=null;
  const el=document.getElementById("pnNote"), s=pnLeerling(); if(!el||!s) return;
  if(el.value!==(s.notitie||"")) schrijf(PN,{notitie:el.value});
}
const tmIn=v=>v?(v%1?v.toFixed(2).replace(".",","):String(v)):"";
const tmOpen=()=>PT.filter(t=>!t.binnen).reduce((a,t)=>a+t.bedrag,0);
function tmDraw(){
  const el=document.getElementById("tm"); if(!el) return;
  el.innerHTML=`${PT.length?`<div class="tm h"><span>Binnen</span><span>Bedrag</span><span>Datum</span><span></span></div>`:""}${PT.map((t,i)=>`<div class="tm${t.binnen?" in":""}"><label class="tmck"><input type="checkbox"${t.binnen?" checked":""} onchange="tmZet(${i},'binnen',this.checked,this)" aria-label="Binnen"></label><span class="tmeur"><i>€</i><input inputmode="decimal" value="${tmIn(t.bedrag)}" onchange="tmZet(${i},'bedrag',this.value,this)" aria-label="Bedrag"></span><input type="date" value="${esc(t.datum)}" onchange="tmZet(${i},'datum',this.value,this)" aria-label="Datum"><button class="tb tmx" aria-label="Termijn verwijderen" onclick="tmDel(${i})">×</button></div>`).join("")}<div class="tmfoot"><button class="tb" onclick="tmAdd()">+ Termijn</button>${PT.length?`<span>Nog te betalen <b id="tmSom">${eurT(tmOpen())}</b></span>`:""}</div>`;
}
function tmZet(i,k,v,el){
  const t=PT[i]; if(!t) return;
  if(k==="bedrag"){ t.bedrag=parseBedrag(v); el.value=tmIn(t.bedrag); }
  else if(k==="datum") t.datum=v;
  else { t.binnen=!!v; el.closest(".tm").classList.toggle("in",t.binnen); }
  tmSave();
}
function tmAdd(){
  const met=PT.filter(t=>t.datum).sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0), last=met[met.length-1]||PT[PT.length-1];
  PT.push({datum:last&&last.datum?plusMaand(last.datum):VANDAAG,bedrag:last?last.bedrag:0,binnen:false});
  tmDraw(); tmSave();
}
function tmDel(i){ PT.splice(i,1); tmDraw(); tmSave(); }
function tmSave(){ const el=document.getElementById("tmSom"); if(el) el.textContent=eurT(tmOpen()); schrijf(PN,{termijnen:termijnenTekst(PT)}); }
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&PN) sluitPaneel(); });

// ---- afletteren (overgenomen uit finance/app.js; facturen/bankregels komen mee in het admin-antwoord) ----
const ODOO="https://audio-dojo1.odoo.com";
const RECON_URL=ODOO+"/odoo/accounting/13/reconciliation";   // Bankaflettering-view (dagboek Bank)
const MOLLIE_URL="https://my.mollie.com/dashboard/";
const JID_PA=8;
const olink=(model,id,txt)=>id?`<a href="${ODOO}/web#id=${id}&model=${model}&view_type=form" target="_blank" title="openen in Odoo" onclick="event.stopPropagation()">${txt}</a>`:txt;
let INV=[], BANK=[], IBANMAP=new Map(), AFL=null;   // alleen lezen: het dashboard schrijft niets naar Odoo
const IBAN_RE=/\b[A-Z]{2}\d{2}[A-Z]{4}[0-9A-Z]{6,}\b/;
const norm=s=>String(s||"").toLowerCase();
const nrmS=s=>String(s||"").toLowerCase().replace(/[^a-zÀ-ɏ]+/gi," ").replace(/\s+/g," ").trim(); // woorden met spaties, voor woordgrens-matching
const isMollie=t=>norm(t.ref).includes("mollie")||norm(t.pname).includes("mollie");
const isIntern=t=>norm(t.pname).includes("producer academie");
function finBoot(){
  for(const i of INV){ i.open=+i.residual||0; i.late=(i.open>0&&i.due)?Math.max(0,days(i.due)):0; }
  for(const t of BANK){ const m=String(t.ref||"").replace(/\s/g,"").match(IBAN_RE)||String(t.ref||"").match(IBAN_RE); t.iban=m?m[0]:null; }
  IBANMAP=new Map();
  for(const t of BANK){ if(t.rec&&t.pid&&t.iban&&!IBANMAP.has(t.iban)) IBANMAP.set(t.iban,{pid:t.pid,pname:t.pname}); }
  AFL=null;
}
function calcDebs(list){
  const byP=new Map();
  for(const i of list){ const k=i.pid||("x"+i.pname); if(!byP.has(k)) byP.set(k,{pid:i.pid,nm:i.pname||"(onbekend)",inv:[]}); byP.get(k).inv.push(i); }
  return [...byP.values()].map(d=>{ d.open=d.inv.reduce((s,i)=>s+i.open,0); return d; });
}
function reconGo(term,el){   // link opent de Bankaflettering zelf; hier alleen de naam naar het klembord + inline bevestiging
  try{ if(term&&navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(term).catch(()=>{}); }catch(e){}
  if(!term||!el) return;
  const box=el.parentNode; let ok=box.querySelector(".cpy");
  if(!ok){ ok=document.createElement("span"); ok.className="cpy"; box.insertBefore(ok,el.nextSibling); }
  ok.textContent="gekopieerd ✓"; clearTimeout(ok._t); ok._t=setTimeout(()=>ok.remove(),2500);
}
function ibanHist(t){
  if(!t.iban) return [];
  return BANK.filter(b=>b.id!==t.id&&b.iban===t.iban).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
}
function psPill(i){ const ps=i.ps; const lab=ps==="paid"?"betaald":ps==="partial"?"deels betaald":ps==="in_payment"?"in behandeling":ps==="reversed"?"gecrediteerd":"open"; const cls=ps==="paid"?"win":i.late>0?"lost":"warn"; return `<span class="stg ${cls}">${lab}</span>`; }
const achternaam=nm=>String(nm||"").trim().split(" ").slice(-1)[0]||"";
const payNaam=t=>{ const m=String(t.ref||"").match(/naam:\s*(.+?)(?:\s+(?:omschrijving|kenmerk|iban|bic)\b|,|$)/i); return m?m[1].trim():""; };
const shortWhy=w=>({"Odoo herkent deze klant al op de betaling":"klant staat al op de betaling","zelfde rekeningnummer als eerdere afgeletterde betaling":"bekende rekening van deze klant","achternaam komt overeen (mogelijk ouder/familie)":"zelfde achternaam","voornaam in omschrijving":"voornaam in omschrijving","bedrag = precies het openstaande saldo":"bedrag = openstaand saldo"}[w]||w.replace("bedrag lijkt een termijn","termijn").replace(" in omschrijving",""));
function payCands(pid,pname){
  const out=[];
  for(const t of BANK){
    if(t.rec||isMollie(t)||isIntern(t)) continue;
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
function aflData(){   // rekenwerk één keer per stand, niet bij elke render
  if(AFL) return AFL;
  const cards=calcDebs(INV.filter(i=>i.jid===JID_PA)).map(d=>({d,cand:payCands(d.pid,d.nm)}));
  const withPay=cards.filter(c=>c.cand.length).sort((a,b)=>b.d.open-a.d.open);
  const claimed=new Set(); withPay.forEach(c=>c.cand.forEach(x=>claimed.add(x.t.id)));
  return AFL={withPay, mollie:BANK.filter(t=>!t.rec&&isMollie(t)), rest:BANK.filter(t=>!t.rec&&!isMollie(t)&&!isIntern(t)&&!claimed.has(t.id))};
}
function afNaam(d){ const s=d.pid?S.find(x=>x.odoo_partner_id===d.pid):null; return s?`<span class="nml" onclick="event.stopPropagation();openPaneel(${jq(s.id)})" title="Open leerling">${esc(s.naam)}</span>`:olink("res.partner",d.pid,esc(d.nm)); }

function afletHtml(){
  const {withPay,mollie,rest}=aflData();
  let h=`<div class="bar"><div class="sum"><span class="num">${withPay.length}</span><span>leerlingen met een niet-afgeletterde betaling · alleen kijken, afletteren doe je in Odoo</span></div></div>`;
  h+=`<div class="list afl"><div class="lhead"><h2>Per leerling</h2><span>bedrag = openstaand volgens Odoo · klik een rij</span></div>`;
  if(!withPay.length) h+=`<div class="empty">Geen betalingen te koppelen.</div>`;
  h+=withPay.map(c=>{
    const d=c.d,k="a"+(d.pid||d.nm),opn=afOpen.has(k);
    const som=c.cand.reduce((s,x)=>s+ +x.t.amount,0);
    return `<div class="row ${d.open>0?"mid":""}" onclick="afTog(${jq(k)})" role="button" tabindex="0"><div class="nm"><span>${afNaam(d)}</span></div><div class="meta">${d.inv.length} factu${d.inv.length===1?"ur":"ren"}</div><div class="amt"><span class="num">${eur0(d.open)}</span><small>open</small></div><span class="cnt">${c.cand.length} betaling${c.cand.length===1?"":"en"} · ${eur0(som)}</span></div>
      ${opn?`<div class="afx"><p>Als deze betaling${c.cand.length===1?"":"en"} klopt${c.cand.length===1?"":"en"}, is het echte openstaand ${eur0(Math.max(0,d.open-som))}.</p>${c.cand.map(x=>{ const h2=ibanHist(x.t); return `<div class="mt"><span class="conf ${x.sc>=70?"hi":x.sc>=45?"mid":"lo"}">${x.sc>=70?"zeker":x.sc>=45?"waarschijnlijk":"onzeker"}</span><span><b>${eur0(x.t.amount)}</b> · ${dmy(x.t.date)}${payNaam(x.t)?` · van ${esc(payNaam(x.t))}`:""}</span><a class="lnk" href="${RECON_URL}" target="_blank" rel="noopener" onclick="event.stopPropagation();reconGo(${jq(payNaam(x.t)||achternaam(d.nm))},this)" title="Opent de bankaflettering in Odoo; de naam staat op je klembord">Bekijk in Odoo</a><span class="why" title="${esc(x.t.ref||"")}">${x.why.map(shortWhy).join(" · ")}${h2.length?` · ${h2.length} eerdere betaling${h2.length===1?"":"en"} via deze rekening`:""}</span></div>`; }).join("")}
      <table><tr><th>Factuur</th><th class="r">Bedrag</th><th class="r">Open</th><th>Status</th></tr>${d.inv.map(i=>`<tr><td>${olink("account.move",i.id,esc(i.name||"—"))}</td><td class="r">${eur0(i.total)}</td><td class="r">${i.open>0?eur0(i.open):"✓"}</td><td>${psPill(i)}</td></tr>`).join("")}</table></div>`:""}`;
  }).join("")+`</div>`;
  h+=`<div class="list sect"><div class="lhead"><h2>Mollie-bundels</h2><span>${mollie.length} · ${eur0(mollie.reduce((s,t)=>s+ +t.amount,0))} · uitsplitsen kan alleen in <a href="${MOLLIE_URL}" target="_blank" rel="noopener">Mollie</a></span></div>${mollie.slice(0,10).map(t=>`<div class="lr"><b>${eur0(t.amount)}</b><span>${dmy(t.date)}</span><span>${esc(String(t.ref||"").match(/REF [^ ]+/)?.[0]||"")}</span></div>`).join("")}${mollie.length>10?`<div class="lr">… en ${mollie.length-10} meer</div>`:""}</div>`;
  h+=`<div class="list sect"><div class="lhead"><h2>Onbekende betalingen</h2><span>${rest.length} · geen leerling herkend</span></div>${rest.slice(0,afAll?rest.length:25).map(t=>`<div class="mt" style="padding:10px 16px;border-top:0;border-bottom:1px solid var(--line2)"><span class="conf lo">onbekend</span><span><b>${eur0(t.amount)}</b> · ${dmy(t.date)}</span><a class="lnk" href="${RECON_URL}" target="_blank" rel="noopener" onclick="event.stopPropagation();reconGo(${jq(String((norm(t.ref).match(/naam: ([^o]+?) (?:omschrijving|kenmerk)/)||[])[1]||"").trim().split(" ").slice(-1)[0]||"")},this)">Bankaflettering</a><span class="why" title="${esc(t.ref||"")}">${esc(String(t.ref||"—").slice(0,120))}</span></div>`).join("")}${rest.length>25&&!afAll?`<button class="more" onclick="afAll=true;render()">Toon alle ${rest.length}</button>`:""}</div>`;
  return h;
}
function afTog(k){ afOpen.has(k)?afOpen.delete(k):afOpen.add(k); render(); }

// ---- start ----
try{ localStorage.removeItem("dpacAdminCode"); localStorage.removeItem("dpacAdminDone"); }catch(e){}   // nooit automatisch inloggen
setTimeout(()=>{ const g=document.getElementById("gcode"); if(g && document.getElementById("gate").style.display!=="none") g.focus(); },50);
try{ if(LOCAL()) gTry("",true); else { const c=sessionStorage.dpacAdminCode; if(c) gTry(c,true); } }catch(e){}
