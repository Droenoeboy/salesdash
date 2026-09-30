// DPAC · Administratie-dashboard (nachtbouw 30 sep 2026, Hermes). Werklijst betalingen voor Michèle.
// Data: n8n-endpoint dpac-admin-data (nog te bouwen, zie README.md) · lokaal: ?local=1 laadt admin_data.json (fictief).
// Het dashboard schrijft nergens naar. Invullen gebeurt in Notion (knop per leerling).
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
    GCODE=code; try{ sessionStorage.dpacAdminCode=code; if(code) localStorage.dpacAdminCode=JSON.stringify({c:code,t:Date.now()}); }catch(e){}
    S=objs(data.student_cols,data.students); GEN=data.gen;
    document.getElementById("gate").style.display="none";
    document.getElementById("demo").style.display=DEMO?"block":"none";
    boot(); return true;
  }catch(e){
    if(e.message==="code"){ try{ localStorage.removeItem("dpacAdminCode"); sessionStorage.removeItem("dpacAdminCode"); }catch(x){} }
    if(!stil){ f.textContent=e.message==="code"?"Onjuiste code":"Laden mislukt ("+e.message+")"; const gi=document.getElementById("gcode"); if(gi) gi.value=""; }
    else f.textContent="";
    return false;
  }
}
function gCheck(){ gTry(document.getElementById("gcode").value.trim(),false); }
async function ververs(){ if(LOCAL()) return gTry("",true); if(GCODE) await gTry(GCODE,true); }

// ---- verrijking ----
const WL_STATUS=["Loopt ernstig achter","Loopt achter","Nog niets","Checken"];
const RANK={"Loopt ernstig achter":0,"Loopt achter":1,"Nog niets":2,"Checken":3};
function boot(){
  for(const s of S){
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

// ---- state ----
let tab="wl", open=new Set(), done=new Set(), statF=null, klasF=null, q="", sortK={c:"prio",d:1}, ovBy="klas";
try{ const d=JSON.parse(localStorage.dpacAdminDone||"null"); if(d&&d.t&&Date.now()-d.t<12*36e5) done=new Set(d.k); }catch(e){}   // "klaar" onthouden tot 12 uur
function saveDone(){ try{ localStorage.dpacAdminDone=JSON.stringify({t:Date.now(),k:[...done]}); }catch(e){} }
function tog(k){ open.has(k)?open.delete(k):open.add(k); render(); }
function doneTog(k){ done.has(k)?done.delete(k):done.add(k); saveDone(); render(); }
function keepScroll(fn){ const y=window.scrollY; fn(); window.scrollTo(0,y); }

function render(){
  const wl=werklijst(), we=wachtEerste(), af=afspraken(), ch=checken();
  const nErn=wl.filter(s=>s.status==="Loopt ernstig achter").length;
  const T=[["wl","📞 Werklijst",wl.length,nErn?"bad":wl.length?"warn":""],["eerste","⏳ Eerste betaling",we.length,we.length?"warn":""],["afspr","📅 Afspraken",af.length,""],["chk","🔎 Checken",ch.length,""],["alle","👥 Alle leerlingen",S.length,""],["ov","📊 Overzicht",null,""]];
  document.getElementById("tabs").innerHTML=T.map(t=>`<div class="tab${tab===t[0]?" on":""}" onclick="tab='${t[0]}';statF=null;klasF=null;render()">${t[1]}${t[2]!=null?`<span class="n ${t[3]}">${t[2]}</span>`:""}</div>`).join("");
  drawKpis(wl,we,af,ch);
  keepScroll(()=>{ document.getElementById("view").innerHTML = tab==="wl"?wlHtml(wl) : tab==="eerste"?eersteHtml(we) : tab==="afspr"?afsprHtml(af) : tab==="chk"?chkHtml(ch) : tab==="alle"?alleHtml() : ovHtml(); });
}
function drawKpis(wl,we,af,ch){
  const openWl=wl.reduce((a,s)=>a+s.open,0), ern=wl.filter(s=>s.status==="Loopt ernstig achter"), ach=wl.filter(s=>s.status==="Loopt achter");
  const morgen=af.filter(s=>s.afsprDagen<=1).length;
  const openTot=S.filter(s=>s.actief==="Actief").reduce((a,s)=>a+s.open,0);
  document.getElementById("kpis").innerHTML=[
    [eur0(openWl),"Openstaand op de werklijst",wl.length?"warn":"good","tab='wl';statF=null;render()"],
    [ern.length,"Loopt ernstig achter",ern.length?"bad":"good","tab='wl';statF='Loopt ernstig achter';render()"],
    [ach.length,"Loopt achter",ach.length?"warn":"good","tab='wl';statF='Loopt achter';render()"],
    [we.length,"Wacht op eerste betaling",we.length?"warn":"good","tab='eerste';render()"],
    [af.length+(morgen?" · "+morgen+" morgen":""),"Betaalafspraken lopen",morgen?"warn":"","tab='afspr';render()"],
    [ch.length,"Nog te checken (Moneybird)",ch.length?"":"good","tab='chk';render()"],
    [eur0(openTot),"Openstaand actieve leerlingen","","tab='ov';render()"]
  ].map(x=>`<div class="kpi ${x[2]}" onclick="${x[3]}"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
}
function chipsHtml(list,withStatus){
  const st=new Map(), kl=new Map(); for(const s of list){ st.set(s.status||"(leeg)",(st.get(s.status||"(leeg)")||0)+1); kl.set(s.klas,(kl.get(s.klas)||0)+1); }
  let h=`<div class="wonchips"><input class="zoek" placeholder="🔍 zoek op naam, klas, e-mail" value="${esc(q)}" oninput="q=this.value;render()"><span class="lbl">${list.length} leerlingen</span>`;
  if(withStatus){ h+=`<span class="lbl" style="margin-left:8px">Status:</span><div class="wchip${statF==null?" on":""}" onclick="statF=null;render()">Alles</div>`+[...st.entries()].sort((a,b)=>(RANK[a[0]]??9)-(RANK[b[0]]??9)).map(([k,n])=>`<div class="wchip${statF===k?" on":""}" onclick="statF=statF===${jq(k)}?null:${jq(k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join(""); }
  h+=`</div><div class="wonchips"><span class="lbl">Klas:</span><div class="wchip${klasF==null?" on":""}" onclick="klasF=null;render()">Alle</div>`+[...kl.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div class="wchip${klasF===k?" on":""}" onclick="klasF=klasF===${jq(k)}?null:${jq(k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join("")+`</div>`;
  return h;
}
const filt=list=>list.filter(s=>(statF==null||(s.status||"(leeg)")===statF)&&(klasF==null||s.klas===klasF)&&(!q||s.zoek.includes(q.toLowerCase())));
function row(s,rank){
  const k=s.id, opn=open.has(k), dn=done.has(k);
  return `<div class="wlrow ${s.cls}${dn?" done":""}" onclick="tog(${jq(k)})">
    <div class="wlhead">${rank!=null?`<span class="rank">${rank}</span>`:""}
      <span class="wlnm">${esc(s.naam)}<small>${esc(s.klas)}${s.betaalwijze?" · "+esc(s.betaalwijze):""}${s.producten&&s.producten.includes("Allstar")?" · All Star":""}</small></span>
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
  h+=`<div class="cmp"><h3>Lopende betaalafspraken <span class="chsub">staan niet op de werklijst; komen de dag na de afspraakdatum vanzelf terug</span></h3><div class="tblwrap"><table><tr><th>Naam</th><th>Klas</th><th>Status</th><th class="r">Openstaand</th><th>Afspraak t/m</th><th class="r">Nog</th><th></th></tr>${list.map(s=>`<tr><td class="nm" onclick="tab='alle';q=${jq(s.naam)};open.add(${jq(s.id)});render()">${esc(s.naam)}</td><td>${esc(s.klas)}</td><td><span class="stg ${s.cls==="hi"||s.cls==="mid"?"lost":"warn"}">${esc(s.status)}</span></td><td class="r"><b>${eur0(s.open)}</b></td><td>${fmt(s.betaalafspraak_tot)}</td><td class="r">${s.afsprDagen<=1?`<b style="color:var(--warn-tx)">${s.afsprDagen===1?"morgen":"vandaag"}</b>`:s.afsprDagen+" d"}</td><td>${s.link_notion?`<a href="${esc(s.link_notion)}" target="_blank">Notion</a>`:""}</td></tr>`).join("")||`<tr><td colspan="7" class="empty">Geen lopende afspraken.</td></tr>`}</table></div></div>`;
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
    list.slice(0,400).map(s=>`<tr><td class="nm" onclick="open.has(${jq(s.id)})?open.delete(${jq(s.id)}):open.add(${jq(s.id)});render()">${esc(s.naam)}</td><td>${esc(s.klas)}</td><td><span class="stg ${s.cls==="hi"||s.cls==="mid"?"lost":s.cls==="lo"?"warn":s.cls==="chk"?"info":s.cls==="ok"?"win":""}">${esc(s.status||"—")}</span></td><td>${esc(s.actief||"—")}</td><td class="r"><b>${eur0(s.open)}</b></td><td class="r">${eur0(s.betaald)}</td><td class="r">${s.pct!=null?`<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="bar"><b style="width:${s.pct}%"></b></span>${s.pct}%</div>`:"—"}</td><td>${s.afsprDagen!=null?(s.afsprDagen>0?"t/m "+fmt(s.betaalafspraak_tot):"verlopen"):"—"}</td><td>${esc(s.salesrep||"—")}</td><td>${fmt(s.gewijzigd)}</td></tr>${open.has(s.id)?`<tr><td colspan="${cols.length}" style="white-space:normal;padding:0 0 10px">${row(s,null)}</td></tr>`:""}`).join("")+`</table>${list.length>400?`<div class="empty">eerste 400 van ${list.length}</div>`:""}</div></div>`;
  return h;
}
function ovHtml(){
  const key=ovBy==="klas"?s=>s.klas:s=>s.cohort||"(geen cohort)";
  const g=new Map(); for(const s of S){ if(s.actief!=="Actief"&&ovBy==="klas") continue; const k=key(s); if(!g.has(k)) g.set(k,{k,n:0,open:0,traject:0,betaald:0,vol:0,ach:0,ern:0,nn:0,chk:0,afspr:0}); const r=g.get(k); r.n++; r.open+=s.open; r.traject+=s.traject; r.betaald+=s.betaald; if(s.status==="Volledig betaald") r.vol++; if(s.status==="Loopt achter") r.ach++; if(s.status==="Loopt ernstig achter") r.ern++; if(s.status==="Nog niets"||!s.status) r.nn++; if(s.status==="Checken") r.chk++; if(s.afsprDagen>0) r.afspr++; }
  const rows=[...g.values()].sort((a,b)=>b.open-a.open);
  const tot=rows.reduce((a,r)=>{ for(const k of ["n","open","traject","betaald","vol","ach","ern","nn","chk","afspr"]) a[k]=(a[k]||0)+r[k]; return a; },{k:"Totaal"});
  const cell=(r,k,cls)=>`<td class="r${r[k]?"":" dim"}" ${r[k]?`style="cursor:pointer" onclick="tab='alle';klasF=${ovBy==="klas"?jq(r.k):"null"};statF=${jq(cls)};q='';render()"`:""}>${r[k]||"—"}</td>`;
  let h=`<div class="wonchips"><span class="lbl">Per:</span><div class="wchip${ovBy==="klas"?" on":""}" onclick="ovBy='klas';render()">Klas (actieve leerlingen)</div><div class="wchip${ovBy==="cohort"?" on":""}" onclick="ovBy='cohort';render()">Cohort (iedereen)</div></div>`;
  h+=`<div class="cmp"><h3>Betaalstand per ${ovBy} <span class="chsub">hoogste openstaand eerst · klik een getal voor de namen</span></h3><div class="tblwrap"><table><tr><th>${ovBy==="klas"?"Klas":"Cohort"}</th><th class="r">Leerlingen</th><th class="r">Openstaand</th><th class="r">Betaald</th><th class="r">Volledig</th><th class="r">Ernstig achter</th><th class="r">Achter</th><th class="r">Nog niets</th><th class="r">Checken</th><th class="r">Afspraak</th></tr>`+
    rows.concat([tot]).map(r=>`<tr${r.k==="Totaal"?' style="font-weight:700"':""}><td>${esc(r.k)}</td><td class="r">${r.n}</td><td class="r"><b>${eur0(r.open)}</b></td><td class="r"><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="bar"><b style="width:${r.traject?Math.min(100,Math.round(r.betaald/r.traject*100)):0}%"></b></span>${r.traject?Math.round(r.betaald/r.traject*100)+"%":"—"}</div></td>${cell(r,"vol","Volledig betaald")}${cell(r,"ern","Loopt ernstig achter")}${cell(r,"ach","Loopt achter")}${cell(r,"nn","Nog niets")}${cell(r,"chk","Checken")}<td class="r">${r.afspr||"—"}</td></tr>`).join("")+`</table></div></div>`;
  const bo=bonusOpen(); const perRep=new Map(); for(const s of bo) perRep.set(s.salesrep,(perRep.get(s.salesrep)||0)+1);
  h+=`<div class="grid2"><div class="cmp"><h3>Bonus nog niet uitgekeerd <span class="chsub">eerste betaling binnen, vinkje "Bonus uitgekeerd" nog leeg · voor Abel</span></h3>${bo.length?`<div class="wonchips">${[...perRep.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<div class="wchip" onclick="tab='alle';q=${jq(k)};render()">${esc(k)}<span class="n">${n}</span></div>`).join("")}</div><div class="tblwrap"><table><tr><th>Naam</th><th>Salesrep</th><th class="r">Betaald</th><th>Inschrijving</th></tr>${bo.slice(0,30).map(s=>`<tr><td>${esc(s.naam)}</td><td>${esc(s.salesrep)}</td><td class="r">${eur0(s.betaald)}</td><td>${fmt(s.inschrijfdatum)}</td></tr>`).join("")}</table></div>`:`<div class="empty">Alle bonussen uitgekeerd.</div>`}</div>
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
  return items.map(([t,ls])=>`<div class="wlrow ${ls.length?"mid":"ok"}" onclick="if(${ls.length}){tab='alle';q='';statF=null;klasF=null;open=new Set([${ls.slice(0,60).map(s=>jq(s.id)).join(",")}]);render()}"><div class="wlhead"><span class="rank">${ls.length}</span><span class="wlnm" style="font-size:14px">${esc(t)}</span><span class="wlmeta">${ls.slice(0,4).map(s=>esc(s.naam)).join(", ")}${ls.length>4?" …":""}</span></div></div>`).join("");
}
// ---- start ----
setTimeout(()=>{ const g=document.getElementById("gcode"); if(g && document.getElementById("gate").style.display!=="none") g.focus(); },50);
try{ if(LOCAL()) gTry("",true); else { let c=sessionStorage.dpacAdminCode; if(!c){ const r=JSON.parse(localStorage.dpacAdminCode||"null"); if(r&&r.c&&Date.now()-r.t<30*864e5) c=r.c; } if(c) gTry(c,true); } }catch(e){}
