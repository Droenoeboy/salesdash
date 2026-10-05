// DPAC · Administratie-dashboard (nachtbouw 30 sep 2026, Hermes; uitgebreid okt 2026, DPAC-315). Werklijst betalingen voor Michèle.
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
async function ververs(){ if(LOCAL()) return gTry("",true); if(GCODE) await gTry(GCODE,true); }

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
let tab="wl", open=new Set(), done=new Set(), statF=null, klasF=null, q="", sortK={c:"prio",d:1}, ovBy="klas", chkOpen=false, CHECKED=new Set();
try{ const d=JSON.parse(localStorage.dpacAdminDone||"null"); if(d&&d.t&&Date.now()-d.t<12*36e5) done=new Set(d.k); }catch(e){}   // "klaar" onthouden tot 12 uur
try{ const c=JSON.parse(localStorage.dpacAdminChecked||"null"); if(c&&c.d===VANDAAG&&Array.isArray(c.ids)) CHECKED=new Set(c.ids); }catch(e){}   // "gecheckt" geldt alleen vandaag
function saveDone(){ try{ localStorage.dpacAdminDone=JSON.stringify({t:Date.now(),k:[...done]}); }catch(e){} }
function saveChecked(){ try{ localStorage.dpacAdminChecked=JSON.stringify({d:VANDAAG,ids:[...CHECKED]}); }catch(e){} }
function tog(k){ open.has(k)?open.delete(k):open.add(k); render(); }
function doneTog(k){ done.has(k)?done.delete(k):done.add(k); saveDone(); render(); }
function chkTog(k){ CHECKED.has(k)?CHECKED.delete(k):CHECKED.add(k); saveChecked(); render(); }
function keepScroll(fn){ const y=window.scrollY; fn(); window.scrollTo(0,y); }

function render(){
  const wl=werklijst(), we=wachtEerste(), af=afspraken(), ch=checken();
  const nErn=wl.filter(s=>s.status==="Loopt ernstig achter").length;
  const T=[["wl","📞 Werklijst",wl.length,nErn?"bad":wl.length?"warn":""],["eerste","⏳ Eerste betaling",we.length,we.length?"warn":""],["afspr","📅 Afspraken",af.length,""],["chk","🔎 Checken",ch.length,""],["alle","👥 Alle leerlingen",S.length,""],["ov","📊 Overzicht",null,""],["afl","🔗 Afletteren",aflData().withPay.length,""]];
  document.getElementById("tabs").innerHTML=T.map(t=>`<div class="tab${tab===t[0]?" on":""}" onclick="tab='${t[0]}';statF=null;klasF=null;render()">${t[1]}${t[2]!=null?`<span class="n ${t[3]}">${t[2]}</span>`:""}</div>`).join("");
  drawKpis(wl,we,af,ch);
  keepScroll(()=>{ document.getElementById("view").innerHTML = tab==="wl"?chkLijstHtml()+wlHtml(wl) : tab==="eerste"?eersteHtml(we) : tab==="afspr"?afsprHtml(af) : tab==="chk"?chkHtml(ch) : tab==="alle"?alleHtml() : tab==="afl"?afletHtml() : ovHtml(); });
}
function drawKpis(wl,we,af,ch){
  const openWl=wl.reduce((a,s)=>a+s.open,0), ern=wl.filter(s=>s.status==="Loopt ernstig achter"), ach=wl.filter(s=>s.status==="Loopt achter");
  const morgen=af.filter(s=>s.afsprDagen<=1).length;
  document.getElementById("kpis").innerHTML=[
    [eur0(openWl),"Openstaand op de werklijst",wl.length?"warn":"good","tab='wl';statF=null;render()"],
    [ern.length,"Loopt ernstig achter",ern.length?"bad":"good","tab='wl';statF='Loopt ernstig achter';render()"],
    [ach.length,"Loopt achter",ach.length?"warn":"good","tab='wl';statF='Loopt achter';render()"],
    [we.length,"Wacht op eerste betaling",we.length?"warn":"good","tab='eerste';render()"],
    [af.length+(morgen?" · "+morgen+" morgen":""),"Betaalafspraken lopen",morgen?"warn":"","tab='afspr';render()"],
    [ch.length,"Nog te checken (Moneybird)",ch.length?"":"good","tab='chk';render()"]
  ].map(x=>`<div class="kpi ${x[2]}" onclick="${x[3]}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("")+(tab==="wl"?chkKnop():"");   // knop staat via CSS order vooraan
}
// ---- vandaag betaling checken (betaalafspraak tot == vandaag) ----
function chkKnop(){
  const L=vandaagChecken(), n=L.filter(s=>!CHECKED.has(s.id)).length;
  const pijl=chkOpen&&L.length?" ▴":n?" ▾":"";   // ▾ alleen bij N > 0; ▴ blijft zolang de lijst open is
  return `<button class="kpi kchk${n?"":" dim"}${chkOpen&&L.length?" on":""}" id="chkbtn"${L.length?` onclick="chkOpen=!chkOpen;render()"`:" disabled"} title="Betaalafspraak tot vandaag: kijk of de betaling binnen is en vink af"><b>${n?"Vandaag betaling checken · "+n:"Vandaag niets te checken"}</b><span>Betaalafspraak tot <em>${dmy(VANDAAG)}${pijl}</em></span></button>`;
}
function chkLijstHtml(){
  const L=vandaagChecken(); if(!chkOpen||!L.length) return "";
  return `<div class="cmp cklist"><h3>Vandaag betaling checken <span class="chsub">${L.filter(s=>CHECKED.has(s.id)).length} van ${L.length} gecheckt</span></h3>${L.map(s=>{ const c=CHECKED.has(s.id); return `<div class="ckrow${c?" on":""}"><label class="ckbox" title="${c?"Gecheckt (vandaag)":"Afvinken: betaling gecheckt"}"><input type="checkbox"${c?" checked":""} onchange="chkTog(${jq(s.id)})"></label><span class="nmlink" onclick="openPaneel(${jq(s.id)})">${esc(s.naam)}</span><span class="cksub">${esc(s.klas)} · ${eur0(s.open)}</span></div>`; }).join("")}</div>`;
}
function chipsHtml(list,withStatus){
  const st=new Map(), kl=new Map(); for(const s of list){ st.set(s.status||"(leeg)",(st.get(s.status||"(leeg)")||0)+1); kl.set(s.klas,(kl.get(s.klas)||0)+1); }
  let h=`<div class="wonchips"><input class="zoek" placeholder="🔍 zoek op naam, klas, e-mail" value="${esc(q)}" oninput="q=this.value;render()"><span class="lbl">${list.length} leerlingen</span>`;
  if(withStatus){ h+=`<span class="lbl" style="margin-left:8px">Status:</span><div class="wchip${statF==null?" on":""}" onclick="statF=null;render()">Alles</div>`+[...st.entries()].sort((a,b)=>(RANK[a[0]]??9)-(RANK[b[0]]??9)).map(([k,n])=>`<div class="wchip${statF===k?" on":""}" onclick="statF=statF===${jq(k)}?null:${jq(k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join(""); }
  h+=`</div><div class="wonchips"><span class="lbl">Klas:</span><div class="wchip${klasF==null?" on":""}" onclick="klasF=null;render()">Alle</div>`+[...kl.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div class="wchip${klasF===k?" on":""}" onclick="klasF=klasF===${jq(k)}?null:${jq(k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join("")+`</div>`;
  return h;
}
const filt=list=>list.filter(s=>(statF==null||(s.status||"(leeg)")===statF)&&(klasF==null||s.klas===klasF)&&(!q||s.zoek.includes(q.toLowerCase())));
// naam = opent het zijpaneel (in elke tab)
const nmLink=s=>`<span class="nmlink" onclick="event.stopPropagation();openPaneel(${jq(s.id)})">${esc(s.naam)}</span>`;
const shIcoon=s=>isJa(s.schuldhulp)?`<span class="shi" title="Schuldhulpverlening">◎</span>`:"";
function termTag(s){
  const T=parseTermijnen(s.termijnen).filter(t=>!t.binnen); if(!T.length) return "";
  const nx=T.filter(t=>t.datum).sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0)[0]||T[0];
  const som=T.reduce((a,t)=>a+t.bedrag,0);
  return `<span class="tag" title="Eerstvolgende open termijn · totaal open termijnen"><b>${eurT(nx.bedrag)}${nx.datum?` op <span${nx.datum<VANDAAG?' class="laat"':""}>${dmy(nx.datum)}</span>`:""}</b> · nog te betalen ${eurT(som)}</span>`;
}
function tagsHtml(s){
  const t=[];
  if(s.herinnering) t.push(`<span class="tag">Herinnering gestuurd: ${dmy(s.herinnering)}</span>`);
  if(s.aanmaning) t.push(`<span class="tag red">Aanmaning gestuurd: ${dmy(s.aanmaning)}</span>`);
  const tt=termTag(s); if(tt) t.push(tt);
  return t.length?`<span class="tags">${t.join("")}</span>`:"";
}
function row(s,rank){
  const k=s.id, opn=open.has(k), dn=done.has(k);
  return `<div class="wlrow ${s.cls}${dn?" done":""}" onclick="tog(${jq(k)})">
    <div class="wlhead">${rank!=null?`<span class="rank">${rank}</span>`:""}
      <span class="wlnm">${nmLink(s)}${shIcoon(s)}<small>${esc(s.klas)}${s.betaalwijze?" · "+esc(s.betaalwijze):""}${s.producten&&s.producten.includes("Allstar")?" · All Star":""}</small>${tagsHtml(s)}</span>
      <span class="wlamt">${eur0(s.open)}<small>van ${eur0(s.traject)}${s.pct!=null?" · "+s.pct+"% betaald":""}</small></span>
      <span class="wlmeta"><span class="stg ${s.cls==="hi"||s.cls==="mid"?"lost":s.cls==="lo"?"warn":s.cls==="chk"?"info":s.cls==="ok"?"win":""}">${esc(s.status||"geen status")}</span>${s.afsprDagen!=null&&s.afsprDagen>0?`<span>📅 afspraak t/m ${fmt(s.betaalafspraak_tot)} (nog ${s.afsprDagen} d)</span>`:s.afsprDagen!=null&&s.afsprDagen<=0?`<span style="color:var(--red-tx)">📅 afspraak verlopen ${fmt(s.betaalafspraak_tot)}</span>`:""}${s.bron==="odoo"?"":`<span title="niet in Odoo: handmatig via Moneybird/Notion">✍️ handmatig</span>`}</span>
      <span class="act"><span class="actlbl ${s.act[0]}">${esc(s.act[1])}</span><button class="donebtn${dn?" on":""}" onclick="event.stopPropagation();doneTog(${jq(k)})" title="alleen een vinkje voor vandaag op dit apparaat; de status zelf zet je in Notion">${dn?"✓ gedaan":"gedaan?"}</button></span>
    </div>
    ${opn?`<div class="why">${esc(s.why)}</div><div class="wlx"><div><h4>Bedragen</h4><div class="kv"><span>Trajectbedrag</span><span>${eur0(s.traject)}</span><span>Betaald</span><span>${eur0(s.betaald)}${s.betaald_odoo!=null&&s.betaald_notion!=null&&s.betaald_odoo!==s.betaald_notion?` <small style="color:var(--warn-tx)">(Odoo ${eur0(s.betaald_odoo)} · Notion ${eur0(s.betaald_notion)})</small>`:""}</span><span>Openstaand</span><span><b>${eur0(s.open)}</b></span><span>Betaalwijze</span><span>${esc(s.betaalwijze||"—")}</span><span>Inschrijfdatum</span><span>${fmt(s.inschrijfdatum)}${s.dagenSinds!=null?" · "+s.dagenSinds+" d geleden":""}</span><span>Bedenktijd</span><span>${s.bedenk!=null&&s.bedenk>0?"⏳ nog "+s.bedenk+" dagen":"✅ definitief"}</span><span>Bron betaling</span><span>${s.bron==="odoo"?"Odoo (leidend)":"handmatig (Moneybird-tijd)"}</span><span>Salesrep</span><span>${esc(s.salesrep||"—")}</span><span>Laatst gewijzigd</span><span>${fmt(s.gewijzigd)}</span></div>
      <div class="links">${s.link_notion?`<a class="lnk pri" href="${esc(s.link_notion)}" target="_blank" onclick="event.stopPropagation()">✍️ Invullen in Notion</a>`:""}${s.link_odoo?`<a class="lnk" href="${esc(s.link_odoo)}" target="_blank" onclick="event.stopPropagation()">Odoo</a>`:""}${s.link_moneybird?`<a class="lnk" href="${esc(s.link_moneybird)}" target="_blank" onclick="event.stopPropagation()">Moneybird</a>`:""}${s.link_ghl?`<a class="lnk" href="${esc(s.link_ghl)}" target="_blank" onclick="event.stopPropagation()">GHL</a>`:""}${s.telefoon?`<a class="lnk" href="tel:${esc(String(s.telefoon).replace(/\\s/g,""))}" onclick="event.stopPropagation()">📞 ${esc(s.telefoon)}</a>`:""}${s.email?`<a class="lnk" href="mailto:${esc(s.email)}" onclick="event.stopPropagation()">✉️ mail</a>`:""}</div></div>
      <div><h4>Notitie administratie (uit Notion)</h4><div class="notitie">${esc(s.notitie||"—")}</div>${s.tijdlijn?`<h4 style="margin-top:10px">Betaalafspraken tijdlijn</h4><div class="notitie">${esc(s.tijdlijn)}</div>`:""}</div></div>`:""}
  </div>`;
}
function wlHtml(wl){
  let list=filt(wl).sort((a,b)=>(RANK[a.status]??9)-(RANK[b.status]??9)||b.open-a.open);
  const nu=list.filter(s=>s.status!=="Checken"), chk=list.filter(s=>s.status==="Checken");
  let h=chipsHtml(wl,true);
  h+=`<div class="cmp"><h3>Vandaag achteraan <span class="chsub">ernstig achter eerst, dan achter, dan nog niets · hoogste bedrag eerst · klik een rij</span></h3><div class="wl">${nu.length?nu.map((s,i)=>row(s,i+1)).join(""):`<div class="empty">Niets te doen${statF||klasF||q?" in dit filter":""}. 🎉</div>`}</div></div>`;
  if(chk.length) h+=`<div class="cmp"><h3>Nog te checken <span class="chsub">leerlingen uit de Moneybird-tijd: betaald bedrag nakijken en Betaald in Notion zetten</span></h3><div class="wl">${chk.map(s=>row(s,null)).join("")}</div></div>`;
  return h;
}
function eersteHtml(we){
  const list=filt(we).sort((a,b)=>(b.dagenSinds||0)-(a.dagenSinds||0));
  let h=chipsHtml(we,false);
  h+=`<div class="cmp"><h3>Wacht op eerste betaling <span class="chsub">actief, nog geen betaalstatus · de salesrep is eigenaar tot de eerste termijn binnen is · langst wachtend eerst</span></h3><div class="wl">${list.length?list.map((s,i)=>row(s,i+1)).join(""):`<div class="empty">Iedereen heeft een eerste betaling gedaan. 🎉</div>`}</div></div>`;
  const perRep=new Map(); for(const s of we) perRep.set(s.salesrep||"(geen rep)",(perRep.get(s.salesrep||"(geen rep)")||0)+1);
  h+=`<div class="cmp"><h3>Per salesrep</h3><div class="wonchips">${[...perRep.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div class="wchip" onclick="q=${jq(k==="(geen rep)"?"":k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join("")}</div></div>`;
  return h;
}
function afsprHtml(af){
  const list=filt(af);
  let h=chipsHtml(af,false);
  h+=`<div class="cmp"><h3>Lopende betaalafspraken <span class="chsub">staan niet op de werklijst; komen de dag na de afspraakdatum vanzelf terug</span></h3><div class="tblwrap"><table><tr><th>Naam</th><th>Klas</th><th>Status</th><th class="r">Openstaand</th><th>Afspraak t/m</th><th class="r">Nog</th><th></th></tr>${list.map(s=>`<tr class="trk" onclick="tab='alle';q=${jq(s.naam)};open.add(${jq(s.id)});render()"><td class="nm">${nmLink(s)}${shIcoon(s)}</td><td>${esc(s.klas)}</td><td><span class="stg ${s.cls==="hi"||s.cls==="mid"?"lost":"warn"}">${esc(s.status)}</span></td><td class="r"><b>${eur0(s.open)}</b></td><td>${fmt(s.betaalafspraak_tot)}</td><td class="r">${s.afsprDagen<=1?`<b style="color:var(--warn-tx)">${s.afsprDagen===1?"morgen":"vandaag"}</b>`:s.afsprDagen+" d"}</td><td>${s.link_notion?`<a href="${esc(s.link_notion)}" target="_blank" onclick="event.stopPropagation()">Notion</a>`:""}</td></tr>`).join("")||`<tr><td colspan="7" class="empty">Geen lopende afspraken.</td></tr>`}</table></div></div>`;
  const verlopen=S.filter(s=>s.afsprDagen!=null&&s.afsprDagen<=0&&WL_STATUS.includes(s.status));
  if(verlopen.length) h+=`<div class="cmp"><h3>Afspraak verlopen, weer op de werklijst <span class="chsub">${verlopen.length}</span></h3><div class="wl">${verlopen.sort((a,b)=>a.afsprDagen-b.afsprDagen).map(s=>row(s,null)).join("")}</div></div>`;
  return h;
}
function chkHtml(ch){
  const list=filt(ch).sort((a,b)=>b.open-a.open);
  let h=chipsHtml(ch,false);
  h+=`<div class="cmp"><h3>Checken in Moneybird <span class="chsub">leerlingen van vóór Odoo: betaald bedrag nakijken, dan Betaald en Betaalstatus in Notion zetten · hoogste openstaand eerst</span></h3><div class="wl">${list.length?list.map((s,i)=>row(s,i+1)).join(""):`<div class="empty">Alles gecheckt. 🎉</div>`}</div></div>`;
  return h;
}
function alleHtml(){
  const cols=[["naam","Naam",s=>s.naam],["klas","Klas",s=>s.klas],["status","Status",s=>RANK[s.status]??(s.status==="Volledig betaald"?8:5)],["actief","Actief",s=>s.actief],["open","Openstaand",s=>s.open,"r"],["betaald","Betaald",s=>s.betaald,"r"],["pct","% betaald",s=>s.pct??-1,"r"],["afspr","Afspraak",s=>s.afsprDagen??-999],["rep","Salesrep",s=>s.salesrep||""],["gew","Gewijzigd",s=>s.gewijzigd||""]];
  if(sortK.c==="prio") sortK={c:"status",d:1};
  const C=cols.find(c=>c[0]===sortK.c)||cols[0];
  const list=filt(S).sort((a,b)=>{ const x=C[2](a), y=C[2](b); return (x<y?-1:x>y?1:0)*sortK.d; });
  let h=chipsHtml(S,true);
  h+=`<div class="cmp"><h3>Alle leerlingen <span class="chsub">${list.length} van ${S.length} · klik een kolomkop om te sorteren, een naam om te openen</span></h3><div class="tblwrap"><table><tr>${cols.map(c=>`<th class="${c[3]||""}" onclick="sortK.c===${jq(c[0])}?sortK.d=-sortK.d:(sortK={c:${jq(c[0])},d:1});render()">${c[1]} ${sortK.c===c[0]?(sortK.d>0?"▲":"▼"):""}</th>`).join("")}</tr>`+
    list.slice(0,400).map(s=>`<tr class="trk" onclick="open.has(${jq(s.id)})?open.delete(${jq(s.id)}):open.add(${jq(s.id)});render()"><td class="nm">${nmLink(s)}${shIcoon(s)}</td><td>${esc(s.klas)}</td><td><span class="stg ${s.cls==="hi"||s.cls==="mid"?"lost":s.cls==="lo"?"warn":s.cls==="chk"?"info":s.cls==="ok"?"win":""}">${esc(s.status||"—")}</span></td><td>${esc(s.actief||"—")}</td><td class="r"><b>${eur0(s.open)}</b></td><td class="r">${eur0(s.betaald)}</td><td class="r">${s.pct!=null?`<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="bar"><b style="width:${s.pct}%"></b></span>${s.pct}%</div>`:"—"}</td><td>${s.afsprDagen!=null?(s.afsprDagen>0?"t/m "+fmt(s.betaalafspraak_tot):"verlopen"):"—"}</td><td>${esc(s.salesrep||"—")}</td><td>${fmt(s.gewijzigd)}</td></tr>${open.has(s.id)?`<tr><td colspan="${cols.length}" style="white-space:normal;padding:0 0 10px">${row(s,null)}</td></tr>`:""}`).join("")+`</table>${list.length>400?`<div class="empty">eerste 400 van ${list.length}</div>`:""}</div></div>`;
  return h;
}
function ovHtml(){
  const key=ovBy==="klas"?s=>s.klas:s=>s.cohort||"(geen cohort)";
  const g=new Map(); for(const s of S){ if(s.actief!=="Actief"&&ovBy==="klas") continue; const k=key(s); if(!g.has(k)) g.set(k,{k,n:0,open:0,traject:0,betaald:0,vol:0,ach:0,ern:0,nn:0,chk:0,afspr:0}); const r=g.get(k); r.n++; r.open+=s.open; r.traject+=s.traject; r.betaald+=s.betaald; if(s.status==="Volledig betaald") r.vol++; if(s.status==="Loopt achter") r.ach++; if(s.status==="Loopt ernstig achter") r.ern++; if(s.status==="Nog niets"||!s.status) r.nn++; if(s.status==="Checken") r.chk++; if(s.afsprDagen>0) r.afspr++; }
  const rows=[...g.values()].sort((a,b)=>b.open-a.open);
  const tot=rows.reduce((a,r)=>{ for(const k of ["n","open","traject","betaald","vol","ach","ern","nn","chk","afspr"]) a[k]=(a[k]||0)+r[k]; return a; },{k:"Totaal"});
  const cell=(r,k,cls)=>`<td class="r${r[k]?"":" dim"}" ${r[k]?`style="cursor:pointer" onclick="tab='alle';klasF=${ovBy==="klas"?jq(r.k):"null"};statF=${jq(cls)};q='';render()"`:""}>${r[k]||"—"}</td>`;
  const openTot=S.filter(s=>s.actief==="Actief").reduce((a,s)=>a+s.open,0);
  let h=`<div class="ovtot">Openstaand actieve leerlingen: <b>${eur0(openTot)}</b></div>`;
  h+=`<div class="wonchips"><span class="lbl">Per:</span><div class="wchip${ovBy==="klas"?" on":""}" onclick="ovBy='klas';render()">Klas (actieve leerlingen)</div><div class="wchip${ovBy==="cohort"?" on":""}" onclick="ovBy='cohort';render()">Cohort (iedereen)</div></div>`;
  h+=`<div class="cmp"><h3>Betaalstand per ${ovBy} <span class="chsub">hoogste openstaand eerst · klik een getal voor de namen</span></h3><div class="tblwrap"><table><tr><th>${ovBy==="klas"?"Klas":"Cohort"}</th><th class="r">Leerlingen</th><th class="r">Openstaand</th><th class="r">Betaald</th><th class="r">Volledig</th><th class="r">Ernstig achter</th><th class="r">Achter</th><th class="r">Nog niets</th><th class="r">Checken</th><th class="r">Afspraak</th></tr>`+
    rows.concat([tot]).map(r=>`<tr${r.k==="Totaal"?' style="font-weight:700"':""}><td>${esc(r.k)}</td><td class="r">${r.n}</td><td class="r"><b>${eur0(r.open)}</b></td><td class="r"><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="bar"><b style="width:${r.traject?Math.min(100,Math.round(r.betaald/r.traject*100)):0}%"></b></span>${r.traject?Math.round(r.betaald/r.traject*100)+"%":"—"}</div></td>${cell(r,"vol","Volledig betaald")}${cell(r,"ern","Loopt ernstig achter")}${cell(r,"ach","Loopt achter")}${cell(r,"nn","Nog niets")}${cell(r,"chk","Checken")}<td class="r">${r.afspr||"—"}</td></tr>`).join("")+`</table></div></div>`;
  const bo=bonusOpen(); const perRep=new Map(); for(const s of bo) perRep.set(s.salesrep,(perRep.get(s.salesrep)||0)+1);
  h+=`<div class="grid2"><div class="cmp"><h3>Bonus nog niet uitgekeerd <span class="chsub">eerste betaling binnen, vinkje "Bonus uitgekeerd" nog leeg · voor Abel</span></h3>${bo.length?`<div class="wonchips">${[...perRep.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div class="wchip" onclick="tab='alle';q=${jq(k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join("")}</div><div class="tblwrap"><table><tr><th>Naam</th><th>Salesrep</th><th class="r">Betaald</th><th>Inschrijving</th></tr>${bo.slice(0,30).map(s=>`<tr><td>${nmLink(s)}</td><td>${esc(s.salesrep)}</td><td class="r">${eur0(s.betaald)}</td><td>${fmt(s.inschrijfdatum)}</td></tr>`).join("")}</table></div>`:`<div class="empty">Alle bonussen uitgekeerd.</div>`}</div>
    <div class="cmp"><h3>Hygiëne <span class="chsub">wat in Notion ontbreekt of niet klopt</span></h3><div class="wl">${hygHtml()}</div></div></div>`;
  return h;
}
function hygHtml(){
  const items=[
    ["Actief zonder klas", S.filter(s=>s.actief==="Actief"&&s.klas==="(geen klas)")],
    ["Op de werklijst maar Oud-leerling of Gestopt", S.filter(s=>WL_STATUS.includes(s.status)&&s.opLijst&&s.actief&&s.actief!=="Actief")],
    ["Openstaand 0 maar status achter", S.filter(s=>["Loopt achter","Loopt ernstig achter"].includes(s.status)&&s.open<=0)],
    ["Volledig betaald maar nog openstaand", S.filter(s=>s.status==="Volledig betaald"&&s.open>0)],
    ["Geen trajectbedrag (actief)", S.filter(s=>s.actief==="Actief"&&!s.traject)],
    ["Geen betaalwijze (actief, niet volledig betaald)", S.filter(s=>s.actief==="Actief"&&!s.betaalwijze&&s.status!=="Volledig betaald")],
    ["Odoo en Notion verschillen in betaald bedrag", S.filter(s=>s.betaald_odoo!=null&&s.betaald_notion!=null&&Math.abs(s.betaald_odoo-s.betaald_notion)>1)],
  ];
  return items.map(([t,ls])=>`<div class="wlrow ${ls.length?"mid":"ok"}" onclick="if(${ls.length}){tab='alle';q='';statF=null;klasF=null;open=new Set([${ls.slice(0,60).map(s=>jq(s.id)).join(",")}]);render()}"><div class="wlhead"><span class="rank">${ls.length}</span><span class="wlnm" style="font-size:14px">${esc(t)}</span><span class="wlmeta">${ls.slice(0,4).map(nmLink).join(", ")}${ls.length>4?" …":""}</span></div></div>`).join("");
}

// ---- zijpaneel per leerling ----
let PN=null, PSEG="herin", PT=[], NT=null, MT=null;
const SEGS=[["herin","Herinnering"],["aanm","Aanmaning"],["term","Betaaltermijnen"]];
const pnLeerling=()=>S.find(x=>x.id===PN);
function openPaneel(id){
  const s=S.find(x=>x.id===id); if(!s) return;
  if(PN&&PN!==id) ntSave();
  PN=id; PT=parseTermijnen(s.termijnen);
  const el=document.getElementById("pn");
  el.innerHTML=pnHtml(s); pnSegDraw();
  el.classList.add("on"); document.getElementById("pnbg").classList.add("on"); document.body.style.overflow="hidden";
  el.scrollTop=0; grow(document.getElementById("pnNote"));
  document.getElementById("pnx").focus({preventScroll:true});
}
function sluitPaneel(){
  if(!PN) return;
  ntSave(); PN=null; clearTimeout(MT);
  document.getElementById("pn").classList.remove("on"); document.getElementById("pnbg").classList.remove("on"); document.body.style.overflow="";
}
function pnHtml(s){
  const stc=s.cls==="hi"||s.cls==="mid"?"lost":s.cls==="lo"?"warn":s.cls==="chk"?"info":s.cls==="ok"?"win":"";
  return `<div class="pnhd"><div class="pnti"><h2>${esc(s.naam)}</h2><div class="pnsub">${esc(s.klas)} <span class="stg ${stc}">${esc(s.status||"geen status")}</span>${DEMO?` <span class="tag" title="Testmodus: wijzigingen blijven alleen in deze browser (localStorage), niet in Notion">demo</span>`:""}</div></div><div class="pnr"><span class="pnmsg" id="pnMsg" aria-live="polite"></span><button class="pnx" id="pnx" onclick="sluitPaneel()" title="Sluiten (Esc)">×</button></div></div>
  <div class="pnrow"><div class="pnamt"><b>${eur0(s.open)}</b><span>openstaand</span></div>${s.link_notion?`<a class="lnk pri" href="${esc(s.link_notion)}" target="_blank" rel="noopener">Open in Notion</a>`:""}</div>
  <div class="pnf" title="Op deze datum komt de leerling terug op de werklijst"><h4>Betaalafspraak tot</h4>${datumVeld("betaalafspraak_tot",s.betaalafspraak_tot)}</div>
  <div class="segs">${SEGS.map(([k,t])=>`<button class="tab${PSEG===k?" on":""}" data-k="${k}" onclick="pnSeg('${k}')">${t}</button>`).join("")}</div>
  <div id="pnSeg" class="pnseg"></div>
  <div class="pnf"><h4>Notitie</h4><textarea id="pnNote" rows="3" oninput="ntInput(this)" onblur="ntSave()">${esc(s.notitie||"")}</textarea>${s.tijdlijn?`<div class="pntl"><h4>Eerdere afspraken (Notion)</h4><div class="notitie">${esc(s.tijdlijn)}</div></div>`:""}</div>
  <label class="pnck"><input type="checkbox" id="pnSh"${isJa(s.schuldhulp)?" checked":""} onchange="schrijf(PN,{schuldhulp:this.checked})"><span>Schuldhulpverlening</span></label>`;
}
function pnSeg(k){ PSEG=k; document.querySelectorAll("#pn .segs .tab").forEach(b=>b.classList.toggle("on",b.dataset.k===k)); pnSegDraw(); }
function pnSegDraw(){
  const s=pnLeerling(), el=document.getElementById("pnSeg"); if(!s||!el) return;
  el.innerHTML = PSEG==="herin"?datumVeld("herinnering",s.herinnering) : PSEG==="aanm"?datumVeld("aanmaning",s.aanmaning) : tmHtml();
}
function pnMeld(ok,txt){
  const el=document.getElementById("pnMsg"); if(!el) return;
  clearTimeout(MT); el.className="pnmsg "+(ok?"ok":"fout"); el.textContent=ok?"Opgeslagen ✓":txt;
  if(ok) MT=setTimeout(()=>{ el.textContent=""; el.className="pnmsg"; },1500);
}
function pnHerstel(s,keys){   // na een mislukte schrijfactie: velden terug naar de waarde in S (notitie blijft staan zodat er geen tekst verloren gaat)
  for(const k of keys){
    const el=document.getElementById("pn_"+k); if(el){ el.value=String(s[k]||"").slice(0,10); dtxt(k,el.value); }
    if(k==="schuldhulp"){ const c=document.getElementById("pnSh"); if(c) c.checked=isJa(s.schuldhulp); }
    if(k==="termijnen"){ PT=parseTermijnen(s.termijnen); if(PSEG==="term") pnSegDraw(); }
  }
}
// datumveld: opslaan direct bij wijziging; ernaast altijd DD-MM-JJJJ (de native datumweergave volgt de browsertaal)
const datumVeld=(f,v)=>`<div class="dveld"><input type="date" id="pn_${f}" value="${esc(String(v||"").slice(0,10))}" onchange="zetDatum('${f}',this.value)"><span class="dtxt" id="pn_${f}_t">${dmy(v)}</span><span class="dknop"><button class="tbtn" onclick="zetDatum('${f}',VANDAAG)">Vandaag</button><button class="tbtn" onclick="zetDatum('${f}','')">Wissen</button></span></div>`;
function dtxt(f,v){ const t=document.getElementById("pn_"+f+"_t"); if(t) t.textContent=dmy(v); }
function zetDatum(f,v){
  const s=pnLeerling(); if(!s) return;
  const el=document.getElementById("pn_"+f); if(el&&el.value!==v) el.value=v;
  dtxt(f,v);
  if(String(s[f]||"").slice(0,10)===(v||"")) return;
  schrijf(PN,{[f]:v||null});
}
// notitie: auto-groeiend, opslaan 800 ms na de laatste toets en bij blur
function grow(el){ if(!el) return; el.style.height="auto"; el.style.height=(el.scrollHeight+2)+"px"; }
function ntInput(el){ grow(el); clearTimeout(NT); NT=setTimeout(ntSave,800); }
function ntSave(){
  clearTimeout(NT); NT=null;
  const el=document.getElementById("pnNote"), s=pnLeerling(); if(!el||!s) return;
  if(el.value!==(s.notitie||"")) schrijf(PN,{notitie:el.value});
}
// betaaltermijnen
const tmIn=v=>v?(v%1?v.toFixed(2).replace(".",","):String(v)):"";
const tmOpen=()=>PT.filter(t=>!t.binnen).reduce((a,t)=>a+t.bedrag,0);
function tmHtml(){
  return `${PT.length?`<div class="tmr tmh"><span>Binnen</span><span>Bedrag</span><span>Datum</span><span></span></div>`:""}${PT.map((t,i)=>`<div class="tmr${t.binnen?" in":""}"><label class="tmck" title="${t.binnen?"Binnen":"Open"}"><input type="checkbox"${t.binnen?" checked":""} onchange="tmZet(${i},'binnen',this.checked,this)"></label><span class="tmeur"><i>€</i><input inputmode="decimal" value="${tmIn(t.bedrag)}" onchange="tmZet(${i},'bedrag',this.value,this)"></span><input type="date" value="${esc(t.datum)}" onchange="tmZet(${i},'datum',this.value,this)"><button class="tbtn tmx" title="Termijn verwijderen" onclick="tmDel(${i})">×</button><span class="dtxt">${dmy(t.datum)}</span></div>`).join("")}<div class="tmfoot"><button class="tbtn" onclick="tmAdd()">+ Termijn</button><span>Nog te betalen: <b id="tmSom">${eurT(tmOpen())}</b></span></div>`;
}
function tmZet(i,k,v,el){
  const t=PT[i]; if(!t) return;
  if(k==="bedrag"){ t.bedrag=parseBedrag(v); el.value=tmIn(t.bedrag); }
  else if(k==="datum"){ t.datum=v; el.closest(".tmr").querySelector(".dtxt").textContent=dmy(v); }
  else { t.binnen=!!v; el.closest(".tmr").classList.toggle("in",t.binnen); el.parentNode.title=t.binnen?"Binnen":"Open"; }
  tmSave();
}
function tmAdd(){
  const met=PT.filter(t=>t.datum).sort((a,b)=>a.datum<b.datum?-1:a.datum>b.datum?1:0), last=met[met.length-1]||PT[PT.length-1];
  PT.push({datum:last&&last.datum?plusMaand(last.datum):VANDAAG,bedrag:last?last.bedrag:0,binnen:false});
  pnSegDraw(); tmSave();
}
function tmDel(i){ PT.splice(i,1); pnSegDraw(); tmSave(); }
function tmSave(){ const el=document.getElementById("tmSom"); if(el) el.textContent=eurT(tmOpen()); schrijf(PN,{termijnen:termijnenTekst(PT)}); }
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&PN) sluitPaneel(); });

// ---- afletteren (overgenomen uit finance/app.js; facturen/bankregels komen mee in het admin-antwoord) ----
const ODOO="https://audio-dojo1.odoo.com";
const RECON_URL=ODOO+"/odoo/accounting/13/reconciliation";   // Bankaflettering-view (dagboek Bank)
const MOLLIE_URL="https://my.mollie.com/dashboard/";
const ACT_URL="https://dpac.app.n8n.cloud/webhook/dpac-finance-actions";
const JID_PA=8;
const olink=(model,id,txt)=>id?`<a href="${ODOO}/web#id=${id}&model=${model}&view_type=form" target="_blank" title="openen in Odoo" onclick="event.stopPropagation()">${txt}</a>`:txt;
let INV=[], BANK=[], IBANMAP=new Map(), AFL=null, afOpen=new Set(), afAll=false, busySet=new Set();
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
function reconGo(term){ try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(term).catch(()=>{}); }catch(e){} window.open(RECON_URL,"_blank"); }
function ibanHist(t){
  if(!t.iban) return [];
  return BANK.filter(b=>b.id!==t.id&&b.iban===t.iban).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
}
async function setPartner(lineId,pid,ev){
  if(ev) ev.stopPropagation();
  if(busySet.has(lineId)) return; busySet.add(lineId); render();
  try{
    let j;
    if(LOCAL()) j={ok:true,partner:(INV.find(i=>i.pid===pid)||{}).pname};   // demo: niets versturen
    else{ const r=await fetch(ACT_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code:GCODE,action:"set_partner",line_id:lineId,partner_id:pid})}); j=await r.json(); }
    if(j&&j.ok){ const t=BANK.find(b=>b.id===lineId); if(t){ t.pid=pid; t.pname=j.partner||t.pname; } AFL=null; }
    else alert("Partner zetten mislukt: "+((j&&j.error)||"onbekende fout"));
  }catch(e){ alert("Partner zetten mislukt (netwerk)"); }
  busySet.delete(lineId); render();
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
function aflData(){   // rekenwerk één keer per stand (en na set_partner), niet bij elke render
  if(AFL) return AFL;
  const cards=calcDebs(INV.filter(i=>i.jid===JID_PA)).map(d=>({d,cand:payCands(d.pid,d.nm)}));
  const withPay=cards.filter(c=>c.cand.length).sort((a,b)=>b.d.open-a.d.open);
  const claimed=new Set(); withPay.forEach(c=>c.cand.forEach(x=>claimed.add(x.t.id)));
  return AFL={withPay, mollie:BANK.filter(t=>!t.rec&&isMollie(t)), rest:BANK.filter(t=>!t.rec&&!isMollie(t)&&!isIntern(t)&&!claimed.has(t.id))};
}
function afNaam(d){ const s=d.pid?S.find(x=>x.odoo_partner_id===d.pid):null; return s?`${nmLink(s)} <span class="odl">${olink("res.partner",d.pid,"Odoo ↗")}</span>`:olink("res.partner",d.pid,esc(d.nm)); }
function afletHtml(){
  const {withPay,mollie,rest}=aflData();
  let h=`<div class="cmp"><h3>Afletteren per leerling · ${withPay.length} <span class="chsub">bedrag = openstaand volgens Odoo · klik een rij</span></h3>`;
  if(!withPay.length) h+=`<div class="empty">Geen onafgeletterde betalingen te koppelen aan leerlingen. 👌</div>`;
  h+=`<div class="wl">`+withPay.map(c=>{
    const d=c.d,k="a"+(d.pid||d.nm),opn=afOpen.has(k);
    const som=c.cand.reduce((s,x)=>s+ +x.t.amount,0);
    return `<div class="wlrow ${d.open>0?"mid":""}" onclick="afTog(${jq(k)})">
      <div class="wlhead"><span class="rank">€</span>
        <span class="wlnm">${afNaam(d)}</span>
        <span class="wlamt">${eur0(d.open)}</span>
        <span class="wlmeta"><span>${c.cand.length} betaling${c.cand.length===1?"":"en"}</span></span>
      </div>
      ${opn?`<div class="why">${c.cand.length} mogelijke betaling${c.cand.length===1?"":"en"} gevonden (samen ${eur0(som)}) — als die kloppen is het echte openstaand ${eur0(Math.max(0,d.open-som))} in plaats van ${eur0(d.open)}.</div><div class="wlx"><div><h4>Gevonden betalingen</h4>${c.cand.map(x=>{ const h2=ibanHist(x.t); const tt=(x.t.ref||"")+(h2.length?"  |  eerder via deze rekening: "+h2.map(v=>eur0(v.amount)+" op "+fmt(v.date)+(v.rec?" (afgeletterd"+(v.pname?" op "+v.pname:"")+")":" (nog open)")).join(", "):""); return `<div class="mtch"><span class="conf ${x.sc>=70?"hi":x.sc>=45?"mid":"lo"}">${x.sc>=70?"zeker":x.sc>=45?"waarschijnlijk":"onzeker"}</span><span title="${esc(tt)}"><b>${eur0(x.t.amount)}</b> · ${fmt(x.t.date)}${payNaam(x.t)?` · van ${esc(payNaam(x.t))}`:""}${x.t.pid===d.pid&&d.pid?' · <span class="stg win">naam staat al op de betaling</span>':""}<br><span class="chsub">${x.why.map(shortWhy).join(" · ")}${h2.length?` · 🔎 ${h2.length} eerdere betaling${h2.length===1?"":"en"} via deze rekening`:""}</span></span><span class="act">${d.pid&&x.t.pid!==d.pid?`<button class="okbtn"${busySet.has(x.t.id)?" disabled":""} onclick="setPartner(${+x.t.id},${+d.pid},event)" title="Zet ${esc(d.nm)} als klant op deze bankregel in Odoo (set_partner)">${busySet.has(x.t.id)?"bezig…":"👤 Klant op betaling"}</button>`:""}<span class="okbtn" onclick="event.stopPropagation();reconGo(${jq(payNaam(x.t)||achternaam(d.nm))})" title="Opent de bankaflettering in Odoo; de naam van de betaler staat op je klembord. Plak die in het zoekveld en klik daar Afletteren.">🔗 Bekijk in Odoo</span></span></div>`; }).join("")}</div>
      <div><h4>Facturen van ${esc(d.nm)}</h4><div class="tblwrap"><table><tr><th>Nr</th><th>Bedrag</th><th>Open</th><th>Status</th></tr>${d.inv.map(i=>`<tr><td>${olink("account.move",i.id,esc(i.name||"—"))}</td><td>${eur0(i.total)}</td><td><b>${i.open>0?eur0(i.open):"✓"}</b></td><td>${psPill(i)}</td></tr>`).join("")}</table></div></div></div>`:""}
    </div>`;
  }).join("")+`</div></div>`;
  h+=`<div class="cmp"><h3>🟣 Mollie-uitbetalingen (bundels) · ${mollie.length} · ${eur0(mollie.reduce((s,t)=>s+ +t.amount,0))} <span class="chsub">uitsplitsen kan alleen in Mollie</span></h3>
    ${mollie.slice(0,10).map(t=>`<div class="lr"><span>${eur0(t.amount)} · ${fmt(t.date)} · <span class="chsub">${esc(String(t.ref||"").match(/REF [^ ]+/)?.[0]||"Mollie")}</span></span></div>`).join("")}${mollie.length>10?`<div class="chsub" style="margin:4px 0 8px">… en ${mollie.length-10} meer</div>`:""}
    <div style="margin-top:8px"><a class="okbtn" style="text-decoration:none" href="${MOLLIE_URL}" target="_blank">🔗 Open Mollie-dashboard</a></div></div>`;
  h+=`<div class="cmp"><h3>❓ Overige niet-afgeletterde betalingen · ${rest.length} <span class="chsub">geen leerling herkend — handmatig bekijken</span></h3>
    ${rest.slice(0,afAll?rest.length:25).map(t=>`<div class="mtch"><span class="conf lo">onbekend</span><span class="mtxt"><b>${eur0(t.amount)}</b> · ${fmt(t.date)}<br><span class="chsub rref" title="${esc(t.ref||"")}">"${esc(t.ref||"—")}"</span></span><span class="act"><span class="okbtn" onclick="reconGo(${jq(String((norm(t.ref).match(/naam: ([^o]+?) (?:omschrijving|kenmerk)/)||[])[1]||"").trim().split(" ").slice(-1)[0]||"")})">🔗 Bankaflettering</span></span></div>`).join("")}
    ${rest.length>25&&!afAll?`<div style="text-align:center;margin:10px 0"><span class="wchip" style="display:inline-flex" onclick="afAll=true;render()">Toon alle ${rest.length}</span></div>`:""}</div>`;
  return h;
}
function afTog(k){ afOpen.has(k)?afOpen.delete(k):afOpen.add(k); render(); }

// ---- start ----
try{ localStorage.removeItem("dpacAdminCode"); }catch(e){}   // oude onthouden code opruimen: nooit automatisch inloggen (DPAC-315)
setTimeout(()=>{ const g=document.getElementById("gcode"); if(g && document.getElementById("gate").style.display!=="none") g.focus(); },50);
try{ if(LOCAL()) gTry("",true); else { const c=sessionStorage.dpacAdminCode; if(c) gTry(c,true); } }catch(e){}
