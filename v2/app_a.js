
// ============================================================
//  DPAC · Sales Dashboard v2
//  Voorkant: het bewezen dashboard uit droenoeboy/salesdash.
//  Databron: de DPAC-datalaag in Supabase (laag 2: views), via n8n.
//  Alle definities staan in dpac.definitions + de views; dit bestand telt alleen op per periode.
// ============================================================
const DATA_URL = "https://dpac.app.n8n.cloud/webhook/dpac-dashboard-data";
const DASH_VERSIE = "v2.5-2026-08-19";
const LOC = "TdkRfY76R77enqlUSRHi";
const EPOCH = new Date(2026,0,1);
const MND=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const MNDF=["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const PAL=["#1f6fd8","#1a9a3d","#dc2a1e","#c99a00","#8f845e","#5856d6","#0e0e0f","#2c8f9b"];

let D=null, GCODE="", L=[], AP=[], EV=[], DEFS={}, STAGES=[], P=[], REPS=[], RCOL={}, PAY_MIN=1000;
let TODAY=0, NOW=0, A, B, tab="tot", sel=null, VBEZIG=false;
let MODE="rol";   // "rol" = rolzuiver (v2) · "rep" = per rep zoals v1 (plan op setter, rest op eigenaar)
let THEME="dark"; try{ THEME=localStorage.dpacTheme||"dark"; }catch(e){}
function applyTheme(){ document.documentElement.dataset.theme=THEME; const b=document.getElementById("thbtn"); if(b) b.textContent=THEME==="dark"?"☀︎":"☾"; const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=THEME==="dark"?"#0e0e0f":"#0e0e0f"; }
function toggleTheme(){ THEME=THEME==="dark"?"light":"dark"; try{localStorage.dpacTheme=THEME;}catch(e){} applyTheme(); }
applyTheme();
function setMode(m){ MODE=m; sel=null; try{sessionStorage.dpacMode=m;}catch(e){} render(); }
try{ if(sessionStorage.dpacMode==="rep") MODE="rep"; }catch(e){}

// ---- datums ----
const d2s = d => { const t=new Date(EPOCH); t.setDate(t.getDate()+d); return t; };
const s2d = t => Math.round((t - EPOCH)/864e5);
const dOf = s => { if(!s) return -1; const t=new Date(String(s).slice(0,10)+"T00:00:00"); return isNaN(t)?-1:s2d(t); };   // 'YYYY-MM-DD' -> dagnummer
const tsLocal = iso => { if(!iso) return null; const d=new Date(iso); if(isNaN(d)) return null; return d.toLocaleString("sv-SE",{timeZone:"Europe/Amsterdam"}); };
const tsDay = iso => { const s=tsLocal(iso); return s? dOf(s.slice(0,10)) : -1; };
const tsHM  = iso => { const s=tsLocal(iso); return s? s.slice(11,16) : ""; };
const fmt = d => { const t=d2s(d); return t.getDate()+" "+MND[t.getMonth()]; };
const fmtY = d => { const t=d2s(d); return t.getDate()+" "+MND[t.getMonth()]+" "+t.getFullYear(); };
const inR = (v,a,b) => v>=0 && v>=a && v<=b;
const pct = (n,d) => d? Math.round(n/d*1000)/10 : 0;
const fpct = (n,d) => d? (pct(n,d)+"").replace(".",",")+"%" : "—";
const eur = v => "€ "+Math.round(v).toLocaleString("nl-NL");
const esc = s => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const cap = s => String(s||"").replace(/\b\p{L}/gu, c=>c.toUpperCase());
const ghl = (cid,name) => cid? `<a href="https://app.gohighlevel.com/v2/location/${LOC}/contacts/detail/${cid}" target="_blank">${esc(name||"(naam onbekend)")}</a>` : esc(name||"—");

// ---- toegang + data ----
async function laad(code){
  const resp=await fetch(DATA_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code, days:240})});
  if(!resp.ok) throw new Error("server gaf "+resp.status);
  const data=await resp.json();
  if(!data || data.error) throw new Error(data&&data.error==="unauthorized"?"code":"onbruikbaar antwoord");
  if(!Array.isArray(data.leads)) throw new Error("onbruikbaar antwoord");
  return data;
}
async function gTry(code, stil){
  try{
    let data;
    if(location.search.indexOf("local=1")>=0){ data=await (await fetch("dashboard_data.json")).json(); }
    else data=await laad(code);
    GCODE=code; try{sessionStorage.dpacSalesCode=code;}catch(e){}
    document.getElementById("gate").style.display="none";
    D=data; initApp(); return true;
  }catch(e){
    if(!stil){ document.getElementById("gfout").textContent = e.message==="code"?"Onjuiste code":"Laden mislukt ("+e.message+")"; document.getElementById("gcode").value=""; }
    return false;
  }
}
function gCheck(){ gTry(document.getElementById("gcode").value.trim(), false); }
async function ververs(){
  if(VBEZIG||!GCODE) return;
  const btn=document.getElementById("rbtn"), tx=document.getElementById("rtxt");
  VBEZIG=true; btn.disabled=true; btn.textContent="⟳ Bezig…"; tx.textContent="nieuwste stand ophalen…";
  try{
    const data=await laad(GCODE);
    const oA=A,oB=B,oTab=tab; D=data; sel=null; resetDetailState(); collapsed=new Set(); initApp();
    A=Math.max(0,Math.min(oA,NOW)); B=Math.max(A,Math.min(oB,NOW)); tab=oTab; if(tab.startsWith("p")&&!REPS.some(p=>"p"+p.n===tab)) tab="tot"; render();
    const t=new Date(); tx.textContent="zojuist ververst · "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+" · "+L.length+" leads · "+AP.length+" afspraken";
  }catch(e){ tx.textContent="verversen mislukt ("+(e&&e.message?e.message:"netwerk")+") — de oude stand blijft staan"; }
  VBEZIG=false; btn.disabled=false; btn.textContent="⟳ Ververs";
}

// ---- model opbouwen ----
function TODAY0(){ const n=new Date(); return s2d(new Date(n.getFullYear(),n.getMonth(),n.getDate())); }
function kanaalVan(src, csrc){ const u=String(src||"").toLowerCase(), c=String(csrc||"").toLowerCase();
  if(["ig","instagram"].includes(u)||c.includes("instagram")) return "Instagram";
  if(["facebook","fb","meta","an"].includes(u)||c.includes("facebook")) return "Facebook / Meta";
  if(u.includes("google")) return "Google"; if(u.includes("tiktok")||c.includes("tiktok")) return "TikTok";
  if(u) return cap(u); return "Onbekend"; }
const median = arr => { const a=arr.filter(v=>v!=null&&!isNaN(v)).sort((x,y)=>x-y); if(!a.length) return null; const m=a.length>>1; return a.length%2? a[m] : (a[m-1]+a[m])/2; };
const fmin = m => m==null? "—" : m<60? Math.round(m)+" min" : m<1440? (Math.round(m/6)/10+"").replace(".",",")+" u" : (Math.round(m/144)/10+"").replace(".",",")+" d";
function objs(cols, rows){ return (rows||[]).map(r=>{ const o={}; cols.forEach((c,i)=>o[c]=r[i]); return o; }); }
function initApp(){
  DEFS=D.definitions||{}; PAY_MIN=+(DEFS.pay_min_amount||1000);
  STAGES=(D.stages||[]).map(s=>s[1]);
  L=objs(D.lead_cols, D.leads); AP=objs(D.appt_cols, D.appointments); EV=objs(D.event_cols, D.events);
  for(const l of L){
    l.name=cap(l.contact_name); l.cd=dOf(l.created_on); l.pd=dOf(l.planned_on); l.id_=dOf(l.intake_on); l.payd=dOf(l.paid_on);
    l.scd=dOf(l.status_changed_on); l.stgd=dOf(l.stage_changed_on);
    l.setter=l.setter_name||""; l.owner=l.owner_short||"";
    l.is_show=!!l.is_show; l.is_noshow=!!l.is_noshow; l.is_signed=!!l.is_signed; l.is_paid=!!l.is_paid; l.has_planned=!!l.has_planned; l.lost_in_lead_stage=!!l.lost_in_lead_stage;
    l.lost=l.status==="lost"; l.open=l.status==="open"; l.paid_amount=+l.paid_amount||0;
    l.intaker=""; l.attempt=null;
    l.kanaal=kanaalVan(l.utm_source, l.contact_source);
    l.dagenPijp = (l.lost&&l.scd>=0&&l.cd>=0)? l.scd-l.cd : (l.cd>=0? TODAY0()-l.cd : null);
    l.faseVerlies = l.lost ? (l.lost_in_lead_stage||l.stage_position===0 ? "Leads-fase" : (l.is_show ? "Na show" : "Intake gepland, geen show")) : null;
  }
  const byC=new Map(); for(const l of L){ if(!byC.has(l.contact_id)) byC.set(l.contact_id,[]); byC.get(l.contact_id).push(l); }
  for(const a of AP){
    a.name=cap(a.contact_name); a.sd=dOf(a.starts_on); a.bd=tsDay(a.booked_at); a.hm=tsHM(a.starts_at); a.bhm=tsHM(a.booked_at);
    a.setter=a.setter_short||""; a.intaker=a.intaker_short||"";
    // intaker + poging aan de lead hangen (afspraak op de intakedatum van de lead)
    const ls=byC.get(a.contact_id)||[];
    for(const l of ls){ if(l.id_>=0 && l.id_===a.sd){ l.intaker=a.intaker; l.attempt=a.attempt_number; l.appt=a; } }
  }
  for(const l of L) if(!l.intaker) l.intaker=l.owner;   // terugval: eigenaar van de deal
  const leadByC=new Map(); for(const l of L) if(!leadByC.has(l.contact_id)) leadByC.set(l.contact_id,l);
  for(const e of EV){ e.dag=dOf(e.occurred_on); e.d=evDisp(e); const l=leadByC.get(e.contact_id);
    // bel/plan-events horen bij de setter van de lead (GHL legt geen maker vast bij taken); verloren/show/close bij de eigenaar
    e.rep = (e.d.cat==="set" && e.d.ico!=="❌" && l && l.setter) ? l.setter : (e.owner_short||(l&&l.owner)||""); }
  // speed-to-lead: eerste contactmoment (taak/belpoging/afspraak) na binnenkomst van de lead, in minuten
  const evByC=new Map(); for(const e of EV){ if(!e.contact_id) continue; if(!evByC.has(e.contact_id)) evByC.set(e.contact_id,[]); evByC.get(e.contact_id).push(e); }
  const CONTACT_EV=new Set(["task.signal","legacy.taak","legacy.belpoging_2","legacy.belpoging_3","legacy.belpoging_4","appointment.signal","legacy.intake_ingepland","legacy.intake_gepland","stage_change.signal"]);
  const EV_START = EV.length? Math.min(...EV.map(e=>new Date(e.occurred_at).getTime()).filter(t=>!isNaN(t))) : Infinity;   // reactietijd alleen voor leads die binnenkwamen sinds het eventlog draait
  for(const l of L){ l.s2l=null; l.s2b=null;
    if(l.created_at){ const t0=new Date(l.created_at).getTime(); if(!isNaN(t0)){
      const evs= t0<EV_START ? [] :(evByC.get(l.contact_id)||[]).filter(e=>CONTACT_EV.has(e.event_type)).map(e=>new Date(e.occurred_at).getTime()).filter(t=>t>t0);
      if(evs.length) l.s2l=Math.round((Math.min(...evs)-t0)/6e4);
      const bk=(byC.get(l.contact_id)||[]).length? AP.filter(a=>a.contact_id===l.contact_id&&a.booked_at).map(a=>new Date(a.booked_at).getTime()).filter(t=>t>t0) : [];
      if(bk.length) l.s2b=Math.round((Math.min(...bk)-t0)/36e5*10)/10;   // uren tot 1e boeking
    } }
  }
  // mensen: iedereen die als setter, intaker of eigenaar voorkomt, gesorteerd op activiteit
  const act=new Map(); const add=(n,w)=>{ if(!n) return; act.set(n,(act.get(n)||0)+w); };
  for(const l of L){ if(l.pd>=0&&l.stage_position!==0) add(l.setter,1); if(l.id_>=0){ add(l.intaker,1); add(l.owner,.5);} if(l.lost&&l.stage_position===0) add(l.owner,.2); }
  for(const a of AP){ add(a.setter,.5); add(a.intaker,.5); }
  P=[...act.keys()];
  REPS=P.map(n=>({n,a:act.get(n)})).filter(p=>p.a>=3).sort((a,b)=>b.a-a.a);
  REPS.forEach((p,k)=>RCOL[p.n]=PAL[k%PAL.length]);
  const _n=new Date(); TODAY=s2d(new Date(_n.getFullYear(),_n.getMonth(),_n.getDate()));
  const g=new Date(D.gen); NOW=TODAY;
  document.getElementById("gen").textContent=isNaN(g)?"—":(g.getDate()+" "+MND[g.getMonth()]+" "+String(g.getHours()).padStart(2,"0")+":"+String(g.getMinutes()).padStart(2,"0"));
  const tx=document.getElementById("rtxt"); if(tx&&!tx.textContent) tx.textContent=L.length+" leads · "+AP.length+" intake-afspraken · "+EV.length+" live-events";
  A=s2d(new Date(_n.getFullYear(),_n.getMonth(),1)); B=NOW;
  dagSel=null; dagOpen=new Set(); dagUur=null;
  render();
}

// ---- de funnel per persoon (rolzuiver) ----
// setter  : plan rate en show rate (van de intakes die hij/zij inplande)
// intaker : sign rate (intake -> ingeschreven, ongeacht wie sluit)
// owner   : close rate (ingeschreven vs verloren van de dossiers na show) en pay rate
let HF=null;   // uur-filter (alleen voor de per-uur weergave van de grafiekwidget)
function funnel(who, a, b){
  const LL = HF ? L.filter(HF) : L;
  const isS = l => who==null || l.setter===who;
  const isI = l => who==null || l.intaker===who;
  const isO = l => who==null || l.owner===who;
  const gepland  = LL.filter(l=> l.stage_position!==0 && inR(l.pd,a,b) && isS(l));
  const verloren = LL.filter(l=> l.lost_in_lead_stage && inR(l.scd,a,b) && isO(l));
  if(MODE==="rep"){   // v1-logica: alles na de planfase op de eigenaar van de deal (4 rijen, geen aparte close-rij)
    const ag=LL.filter(l=> inR(l.id_,a,b) && isO(l)), sh=ag.filter(l=>l.is_show), gs=ag.filter(l=>!l.is_show), sg=sh.filter(l=>l.is_signed), ns=sh.filter(l=>!l.is_signed);
    return {gepland, verloren, agenda:ag, show:sh, geenShow:gs, signS:sg, nietSignS:ns, agendaI:ag, showI:sh, sign:sg, nietSign:ns, dossiers:sh, closed:sg, closeLost:ns.filter(l=>l.lost), closeOpen:ns.filter(l=>!l.lost), signO:sg, paid:sg.filter(l=>l.is_paid), nietPaid:sg.filter(l=>!l.is_paid)};
  }
  const agenda   = LL.filter(l=> inR(l.id_,a,b) && isS(l));            // intakes op de agenda van deze setter
  const show     = agenda.filter(l=> l.is_show);
  const geenShow = agenda.filter(l=> !l.is_show);
  const signS    = show.filter(l=> l.is_signed);                    // sign rate setter: van jouw shows, hoeveel ingeschreven (ongeacht wie tekent)
  const nietSignS= show.filter(l=> !l.is_signed);
  const agendaI  = LL.filter(l=> inR(l.id_,a,b) && isI(l));            // intakes gevoerd door deze intaker
  const showI    = agendaI.filter(l=> l.is_show);
  const sign     = showI.filter(l=> l.is_signed);
  const nietSign = showI.filter(l=> !l.is_signed);
  const dossiers = LL.filter(l=> inR(l.id_,a,b) && l.is_show && isO(l)); // dossiers na show, van deze eigenaar
  const closed   = dossiers.filter(l=> l.is_signed);
  const closeLost= dossiers.filter(l=> !l.is_signed && l.lost);
  const closeOpen= dossiers.filter(l=> !l.is_signed && !l.lost);
  const signO    = LL.filter(l=> inR(l.id_,a,b) && l.is_signed && isO(l));
  const paid     = signO.filter(l=> l.is_paid);
  const nietPaid = signO.filter(l=> !l.is_paid);
  return {gepland, verloren, agenda, show, geenShow, signS, nietSignS, agendaI, showI, sign, nietSign, dossiers, closed, closeLost, closeOpen, signO, paid, nietPaid};
}
// afspraken (slots) in periode
function slots(who,a,b,role){
  const f = x => who==null || (role==="intaker"? x.intaker===who : x.setter===who);
  const inP = AP.filter(x=> inR(x.sd,a,b) && f(x));
  return { all:inP, show:inP.filter(x=>x.is_show), noshow:inP.filter(x=>x.is_noshow), cancel:inP.filter(x=>x.is_cancelled), late:inP.filter(x=>x.is_late_cancel), open:inP.filter(x=>x.is_upcoming), unres:inP.filter(x=>x.is_unresolved),
    booked: AP.filter(x=> inR(x.bd,a,b) && f(x)) };
}

// ---- state ----
let sortSt = {ok:{c:1,d:-1}, bad:{c:1,d:-1}};
let colF = {ok:{}, bad:{}};
let fOpen = null, expand = {};
let collapsed = new Set();
function setRange(a,b){ A=a; B=b; sel=null; render(); }
function resetDetailState(){ chFocus=null; chStack=[]; sortSt={ok:{c:1,d:-1},bad:{c:1,d:-1}}; colF={ok:{},bad:{}}; expand={}; fClose(); }

// ---- tabs ----
function drawTabs(){
  const el=document.getElementById("tabs"); el.innerHTML="";
  const mk=(id,label,color)=>{ const t=document.createElement("div");
    t.className="tab"+(tab===id?" on":"");
    if(color){const d=document.createElement("span");d.className="dot";d.style.background=color;t.appendChild(d);}
    t.appendChild(document.createTextNode(label));
    t.onclick=()=>{tab=id; sel=null; render();}; el.appendChild(t); };
  mk("tot","Totaal");
  // personenkiezer: één tab met uitklapmenu i.p.v. losse tabs
  const cur=repOf(); const pt=document.createElement("div"); pt.className="tab persoon"+((cur||tab==="ov")?" on":""); pt.id="persoonTab";
  pt.innerHTML=(cur?`<span class="dot" style="background:${RCOL[cur]}"></span>${esc(cur)}`:tab==="ov"?"Σ Iedereen":"👤 Persoon")+` <span class="caret">▾</span>`;
  pt.onclick=(e)=>{ e.stopPropagation(); persoonMenu(pt); }; el.appendChild(pt);
  mk("cmp","⚖️ Vergelijk");
  mk("int","🗓 Intakes");
  mk("won","🏆 Gewonnen");
  // Afspraken-tab verwijderd in v2.6 (alles staat in Intakes + Dag & Week)
  mk("trend","📈 Trend");
  mk("bron","📣 Bronnen & Ads");
  mk("lost","🚫 Verloren");
  mk("dag","📅 Dag & Week");
  mk("adv","⚡ Adviezen");
  const sw=document.createElement("div"); sw.className="modesw"; sw.title="Rollen = elke rate op de persoon die er echt over gaat (setter / intaker / eigenaar). Per rep = de oude v1-telling: plan op de setter, show/sign/pay op de eigenaar van de deal.";
  sw.innerHTML=`<span class="${MODE==="rol"?"on":""}" onclick="setMode('rol')">Rollen</span><span class="${MODE==="rep"?"on":""}" onclick="setMode('rep')">Per rep (v1)</span>`;
  const mb=document.getElementById("modebar"); mb.innerHTML=""; mb.appendChild(sw);
  const on=el.querySelector(".tab.on"); if(on&&on.scrollIntoView) try{ on.scrollIntoView({block:"nearest",inline:"nearest"}); }catch(e){}
}
function persoonMenu(anchor){
  const el=document.getElementById("fdrop"); if(el.dataset.open==="persoon"&&el.style.display==="block"){ el.style.display="none"; el.dataset.open=""; return; }
  el.dataset.open="persoon";
  el.innerHTML=`<div class="fi fall">Kies een persoon</div><div class="fi${tab==="ov"?" on":""}" onclick="tab='ov';sel=null;fClose();render()"><span>Σ Iedereen · overzichtspagina</span></div>`+REPS.map(p=>{ const f=funnel(p.n,A,B); const beh=f.gepland.length+f.verloren.length; return `<div class="fi${tab==="p"+p.n?" on":""}" onclick="tab=${JSON.stringify("p"+p.n).replace(/"/g,"&quot;")};sel=null;fClose();render()"><span><span class="dot" style="background:${RCOL[p.n]};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px"></span>${esc(p.n)}</span><b>${beh} · ${f.agenda.length} int.</b></div>`; }).join("");
  const r=anchor.getBoundingClientRect(); el.style.display="block"; el.style.left=Math.min(r.left, window.innerWidth-240)+"px"; el.style.top=(r.bottom+6)+"px";
}
const ROL = ph => ph==="l2s" ? "cohort" : MODE==="rep" ? (ph==="plan"?"setter":"eigenaar") : ({plan:"setter",show:"setter",signS:"setter",sign:"intaker",close:"eigenaar",pay:"eigenaar"})[ph];
const jq = s => JSON.stringify(s).replace(/"/g,"&quot;");
const repOf = () => (tab.startsWith("p")? tab.slice(1) : null);

// ---- kpi's ----
function drawKpis(){
  const who=repOf(); const f=funnel(who,A,B); const s=slots(who,A,B,"setter");
  const k=document.getElementById("kpis");
  const first = who==null ? [L.filter(l=>inR(l.cd,A,B)).length,"Nieuwe leads"] : [f.gepland.length+f.verloren.length,"Leads afgehandeld"];
  const held = s.show.length+s.noshow.length+s.late.length;
  const len=B-A+1, pA=A-len, pB=A-1, pf=funnel(who,pA,pB);   // zelfde lengte, direct ervoor
  const prevFirst = who==null ? L.filter(l=>inR(l.cd,pA,pB)).length : pf.gepland.length+pf.verloren.length;
  const dlt=(n,p)=>{ if(p==null) return ""; const d=n-p; const cls=d>0?"up":d<0?"dn":"eq"; return `<i class="dlt ${cls}" title="vorige periode van ${len} dagen (${fmtY(pA)} t/m ${fmtY(pB)}): ${p}">${d>0?"▲ +"+d:d<0?"▼ "+d:"= "+p}</i>`; };
  const s2l=median(L.filter(l=>inR(l.cd,A,B)&&(who==null||l.setter===who)).map(l=>l.s2l)), n2l=L.filter(l=>inR(l.cd,A,B)&&(who==null||l.setter===who)&&l.s2l!=null).length;
  const s2b=median(L.filter(l=>inR(l.cd,A,B)&&(who==null||l.setter===who)).map(l=>l.s2b)), n2b=L.filter(l=>inR(l.cd,A,B)&&(who==null||l.setter===who)&&l.s2b!=null).length;
  const items=[[first[0],first[1],null,dlt(first[0],prevFirst)],[f.gepland.length,"Intakes gepland",null,dlt(f.gepland.length,pf.gepland.length)],[f.agenda.length,"Intakes in periode",null,dlt(f.agenda.length,pf.agenda.length)],[f.show.length,"Shows",null,dlt(f.show.length,pf.show.length)],[f.geenShow.filter(l=>l.is_noshow).length,"No-shows",null,dlt(f.geenShow.filter(l=>l.is_noshow).length,pf.geenShow.filter(l=>l.is_noshow).length)],[f.signO.length,who?"Ingeschreven · eigenaar":"Ingeschreven",who?"ingeschreven dossiers waarvan deze persoon eigenaar is, op intakedatum":null,dlt(f.signO.length,pf.signO.length)],[f.paid.length,"Betaald",null,dlt(f.paid.length,pf.paid.length)],
    [held?fpct(s.show.length,held):"—","Show rate per slot",`${s.show.length} show · ${s.noshow.length} no-show · ${s.late.length} late cancel${s.unres.length?` · ${s.unres.length} zonder uitkomst`:""}`,""],
    [fmin(s2l),"Reactietijd (mediaan)",`Tijd van binnenkomst lead tot het eerste geregistreerde contactmoment (taak/belpoging/afspraak/fasewissel) — bekend voor ${n2l} leads uit deze periode (alleen sinds het live-eventlog draait). Tijd tot eerste intake-boeking: mediaan ${s2b==null?"—":(s2b+"").replace(".",",")+" uur"} (${n2b} leads).`,s2b!=null?`<i class="dlt eq">${(s2b+"").replace(".",",")} u tot boeking</i>`:""]];
  k.innerHTML=items.map(x=>`<div class="kpi" ${x[2]?`title="${esc(x[2])}"`:""}><b>${x[0]}</b><span>${x[1]}</span>${x[3]||""}</div>`).join("");
}

// ---- funnelkolommen ----
function rowHtml(cls,lab,who,num,den,uitTxt,phase,repKey){
  const p=pct(num,den), selCls=(sel&&sel.phase===phase&&sel.repKey===repKey)?" sel":"";
  return `<div class="frow">
    <div class="blk ${cls}${selCls}" onclick="pick('${esc(repKey)}','${phase}')">
      <div class="lab"><span>${lab} <i class="rol">${who}</i></span><span class="uit" title="${esc(uitTxt)}">${esc(uitTxt)}</span></div>
      <div class="pct">${den?fpct(num,den):"—"}</div>
      <div class="bar" style="width:${Math.min(100,p)}%"></div>
    </div>
    <div class="outN ${cls}${selCls}" onclick="pick('${esc(repKey)}','${phase}')" title="doorgestroomd">${num}</div>
  </div>`;
}
function toggleCol(repKey){ const k=String(repKey); collapsed.has(k)? collapsed.delete(k) : collapsed.add(k); drawCols(); }
function colHtml(who, name, color, tot){
  const f=funnel(who,A,B);
  const behandeld=f.gepland.length+f.verloren.length;
  const ini=name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const repKey=who==null?"tot":who;
  if(collapsed.has(String(repKey)))
    return `<div class="fcol mini" onclick="toggleCol('${esc(repKey)}')" title="uitklappen">
      <div class="ava" style="background:${color}">${ini}</div>
      <div class="vname">${esc(name)}</div><div class="vnum" style="color:${color}">${behandeld}</div></div>`;
  const openGS=f.geenShow.filter(l=>l.open).length;
  const sub = who==null
    ? `${behandeld} leads afgehandeld · ${f.agenda.length} intakes op de agenda`
    : MODE==="rep" ? `${behandeld} afgehandeld als setter · ${f.agenda.length} intakes als eigenaar`
    : `${behandeld} afgehandeld als setter · ${f.agenda.length} intakes gezet · ${f.dossiers.length} dossiers na show`;
  return `<div class="fcol${tot?" tot":""}">
    <div class="fhead" title="klik om in te klappen" onclick="toggleCol('${esc(repKey)}')"><div class="ava" style="background:${color}">${ini}</div><b>${esc(name)}</b><div class="bigN" title="leads afgehandeld (gepland + verloren in de Leads-fase)">${behandeld}</div></div>
    <div class="fsub" title="${esc(sub)}">${sub}</div>
    <div class="grp first">Setter <i>· wat lever jij aan?</i></div>
    ${rowHtml("p","Plan rate",ROL("plan"),f.gepland.length,behandeld,`${f.verloren.length} verloren`,"plan",repKey)}
    ${MODE==="rep"?`<div class="grp">Eigenaar <i>· v1: show, sign en pay op de deal-eigenaar</i></div>`:""}
    ${rowHtml("h","Show rate",ROL("show"),f.show.length,f.agenda.length,`${f.geenShow.length} geen show${openGS?` · ${openGS} nog open`:""}`,"show",repKey)}
    ${rowHtml("s","Sign rate",ROL("signS"),f.signS.length,f.show.length,(o=>o?`${f.nietSignS.length} (nog) niet · ${o} open`:`${f.nietSignS.length} niet`)(f.nietSignS.filter(l=>l.open).length),"signS",repKey)}
    ${MODE==="rep"?"":`<div class="grp">Eigenaar <i>· hoe beweeg jij dossiers?</i></div>`}
    ${MODE==="rep"?"":rowHtml("c","Close rate",ROL("close"),f.closed.length,f.closed.length+f.closeLost.length,`${f.closeLost.length} verloren${f.closeOpen.length?` · ${f.closeOpen.length} open`:""}`,"close",repKey)}
    ${rowHtml("b","Pay rate",ROL("pay"),f.paid.length,f.signO.length,`${f.nietPaid.length} nog niet`,"pay",repKey)}
    ${who==null?(co=>{const cs=co.filter(l=>l.is_signed).length,op=co.filter(l=>!l.is_signed&&!l.lost).length;return `<div class="grp">Periode <i>· binnengekomen leads → getekend</i></div>`+rowHtml("i","Lead → sign","cohort",cs,co.length,`${co.length-cs} niet getekend${op?` · ${op} open`:""}`,"l2s",repKey);})(L.filter(l=>inR(l.cd,A,B))):""}
  </div>`;
}
function drawCols(){
  const el=document.getElementById("cols"), aw=document.getElementById("advwrap"), ww=document.getElementById("wonwrap"), dw=document.getElementById("dagwrap"), pw=document.getElementById("aptwrap"), tw=document.getElementById("trendwrap"), bw=document.getElementById("bronwrap"), lw=document.getElementById("lostwrap"), cw=document.getElementById("cmpwrap"), iw=document.getElementById("intwrap");
  for(const x of [el,aw,ww,dw,pw,tw,bw,lw,cw,iw]) x.style.display="none";
  if(tab==="cmp"){ cw.style.display="block"; drawCmp(); return; }
  if(tab==="trend"){ tw.style.display="block"; drawTrend(); return; }
  if(tab==="bron"){ bw.style.display="block"; drawBron(); return; }
  if(tab==="lost"){ lw.style.display="block"; drawLost(); return; }
  if(tab==="adv"){ aw.style.display="block"; drawAdvies(); return; }
  if(tab==="won"){ ww.style.display="block"; drawWon(); return; }
  if(tab==="dag"){ dw.style.display="block"; drawDag(); return; }
  if(tab==="apt"){ pw.style.display="block"; drawApt(); return; }
  if(tab==="int"){ iw.style.display="block"; drawInt(); return; }
  if(tab==="tot"){ el.style.display="flex"; el.innerHTML=colHtml(null,"Totaal","#1a2233",true)+REPS.map(p=>colHtml(p.n,p.n,RCOL[p.n],false)).join(""); return; }
  if(tab==="ov"){ el.style.display="block"; el.innerHTML=repPage(null); return; }
  const n=repOf(); el.style.display="block"; el.innerHTML=repPage(n);
}

// ---- persoonlijke pagina ----
let upOpen=false;
function repPage(n){
  const f=funnel(n,A,B), s=slots(n,A,B,"setter"), si=slots(n,A,B,"intaker");
  const nm = n==null? "Iedereen" : n, key = n==null? "tot" : n, jou = n==null? "" : "jouw ";
  const col=`<div class="cols" style="margin:0">${colHtml(n,nm,n==null?"#1a2233":(RCOL[n]||"#1a2233"),true)}</div>`;
  // trend: 8 weken van deze persoon (kleine multiples)
  const bs=[]; for(let d=weekKey(NOW)-7*7; d<=NOW; d+=7) bs.push([d,Math.min(d+6,NOW)]);
  const rows=bs.map(([a,b])=>trendRow(n,a,b)), labels=bs.map(([a])=>"wk "+isoWeek(a));
  const cw=Math.max(240,Math.floor(((document.getElementById("cols").clientWidth||900)*0.55-40)/2)-22);
  const mets=[["plan","Plan rate",r=>[r.gepland,r.beh],+(DEFS.min_volume_plan||15)],["show","Show rate",r=>[r.show,r.agenda],+(DEFS.min_volume_show||8)],["signS","Sign rate",r=>[r.signS,r.show],+(DEFS.min_volume_sign||5)],["close","Close rate",r=>[r.closed,r.closed+r.closeLost],+(DEFS.min_volume_sign||5)]];
  const sm=mets.map(([k,t,nd,mn])=>{ const vals=rows.map(r=>{ const [a,b]=nd(r); return b?pct(a,b):null; }); const weak=rows.map(r=>(nd(r)[1]||0)<mn); const c=vals[vals.length-1], p=vals[vals.length-2];
    return `<div class="sm${sel&&sel.phase===k?" on":""}" onclick="pick(${jq(key)},'${k}')" title="klik: grafiek per dag/week/maand + de namen"><div class="smh"><span>${t} <i class="rolTag">${ROL(k)}</i></span><b>${c==null?"—":(c+"").replace(".",",")+"%"}</b>${ppDelta(c,p)}</div>${svgLine([{name:t,color:n==null?"var(--txt)":(RCOL[n]||"var(--plan)"),values:vals,weak,width:2}],{pct:true,labels,h:86,pl:30,pb:18,pt:8,ticks:3,w:cw})}</div>`; }).join("");
  // verliesredenen van deze persoon (als eigenaar)
  const lost=L.filter(l=>l.lost&&inR(l.scd,A,B)&&(n==null||l.owner===n)); const rc=new Map(); for(const l of lost) rc.set(l.lost_reason||"(geen reden)",(rc.get(l.lost_reason||"(geen reden)")||0)+1);
  const top=[...rc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6); const mx=Math.max(1,...top.map(x=>x[1]));
  const lostH=top.length? top.map(([r,c])=>`<div class="lr"><span>${esc(r)}</span><i><b style="width:${Math.round(c/mx*100)}%"></b></i><em>${c}</em></div>`).join("") : `<div class="empty">Niets verloren in deze periode.</div>`;
  // komende intakes (gezet of in agenda)
  const upAll=AP.filter(a=>a.is_upcoming&&(n==null||a.setter===n||a.intaker===n)).sort((a,b)=>a.starts_at<b.starts_at?-1:1), up=upOpen?upAll:upAll.slice(0,8);
  const upH=(up.length? `<table><tr><th>Wanneer</th><th>Wie</th><th>${n==null?"Setter · intaker":"Rol"}</th><th>Status</th></tr>`+up.map(a=>`<tr><td>${fmt(a.sd)} ${a.hm}</td><td>${ghl(a.contact_id,a.name)}</td><td><small>${n==null?esc((a.setter||"—")+" · "+(a.intaker||"—")):(a.setter===n&&a.intaker===n?"setter + intaker":a.setter===n?"setter":"intaker")}</small></td><td>${intStatPill(a)}</td></tr>`).join("")+`</table>` : `<div class="empty">Geen komende intakes.</div>`)+(upAll.length>8?`<div class="more" onclick="upOpen=!upOpen;render()">${upOpen?"▴ alleen de eerste 8":"▾ toon alle "+upAll.length+" komende intakes hier"}</div>`:"")+`<div class="more" onclick="tab='int';intScope='komend';intWho=${n==null?"null":jq(n)};render()">🗓 open in Intakes-tab →</div>`;
  // open dossiers na show (eigenaar) + no-shows nog open (setter)
  const openDoss=f.closeOpen.length, openNS=f.geenShow.filter(l=>l.open).length, unres=si.unres.length;
  const unconf=upAll.filter(a=>a.status!=="confirmed"&&!a.is_cancelled).length;
  const todo=`<div class="todo">${unconf?`<div class="td"><b>${unconf}</b><span>komende intakes nog niet bevestigd</span><a href="#" onclick="tab='int';intScope='komend';intFilt='unconf';intWho=${n==null?"null":jq(n)};render();return false">bekijk</a></div>`:""}${openNS?`<div class="td"><b>${openNS}</b><span>no-shows van ${jou}intakes nog open — herplannen</span><a href="#" onclick="pick(${jq(key)},'show');return false">bekijk</a></div>`:""}${openDoss?`<div class="td"><b>${openDoss}</b><span>dossiers na show nog open (eigenaar)</span><a href="#" onclick="pick(${jq(key)},'close');return false">bekijk</a></div>`:""}${unres?`<div class="td"><b>${unres}</b><span>intakes ${n==null?"":"in jouw agenda "}zonder show/no-show</span><a href="#" onclick="tab='apt';aptFilt='unres';render();return false">bekijk</a></div>`:""}${(!openNS&&!openDoss&&!unres&&!unconf)?`<div class="empty">Niets dat op actie wacht. 👌</div>`:""}</div>`;
  const s2l=median(L.filter(l=>inR(l.cd,A,B)&&(n==null||l.setter===n)).map(l=>l.s2l));
  return `<div class="repgrid">${col}<div class="repside">
    <div class="cmp"><h3>Verloop laatste 8 weken · ${esc(nm)} <span class="chsub">klik op een kaartje → grafiek per dag/week/maand + namen (onderaan)</span></h3><div class="smallmult two-col">${sm}</div></div>
    <div class="two"><div class="cmp"><h3>Actie nodig</h3>${todo}</div><div class="cmp"><h3>Verliesredenen (als eigenaar) · ${lost.length}</h3>${lostH}</div></div>
    <div class="two"><div class="cmp"><h3>Komende intakes</h3>${upH}</div><div class="cmp"><h3>Agenda-slots in de periode <span class="chsub">afspraken uit de GHL-agenda, als setter (jij boekte) vs als intaker (jouw agenda)</span></h3><table><tr><th></th><th>Als setter</th><th>Als intaker</th></tr><tr><td>Op de agenda</td><td>${s.all.length}</td><td>${si.all.length}</td></tr><tr><td>Show</td><td>${s.show.length}</td><td>${si.show.length}</td></tr><tr><td>No-show</td><td>${s.noshow.length}</td><td>${si.noshow.length}</td></tr><tr><td>Late cancel</td><td>${s.late.length}</td><td>${si.late.length}</td></tr><tr><td>Show rate per slot</td><td><b>${fpct(s.show.length,s.show.length+s.noshow.length+s.late.length)}</b></td><td><b>${fpct(si.show.length,si.show.length+si.noshow.length+si.late.length)}</b></td></tr><tr><td>Reactietijd (mediaan)</td><td colspan="2">${fmin(s2l)}</td></tr></table></div></div>
  </div></div>`;
}

// ---- detail ----
const PH={
  plan:{t:"Plan rate", ok:"Intake gepland", bad:"Verloren in de Leads-fase", d:"pd", bd:"scd", who:"setter"},
  show:{t:"Show rate", ok:"Op gesprek verschenen", bad:"Geen show", d:"id_", bd:"id_", who:"setter"},
  signS:{t:"Sign rate", ok:"Ingeschreven (van jouw geshowde intakes)", bad:"Show, maar (nog) niet getekend", d:"id_", bd:"id_", who:"setter"},
  close:{t:"Close rate", ok:"Ingeschreven", bad:"Verloren na show", d:"id_", bd:"scd", who:"owner"},
  pay:{t:"Pay rate", ok:"Betaald", bad:"Getekend, nog niet betaald", d:"id_", bd:"id_", who:"owner"},
  l2s:{t:"Lead → sign", ok:"Getekend (lead kwam binnen in deze periode)", bad:"(nog) niet getekend", d:"stgd", bd:"cd", who:"setter"}};
function pick(repKey,phase){ sel={repKey, phase}; resetDetailState(); drawCols(); drawDetail(); document.getElementById("detail").scrollIntoView({behavior:"smooth",block:"nearest"}); }
function sortDetail(tbl,c){ const s=sortSt[tbl]; if(s.c===c) s.d=-s.d; else {s.c=c; s.d=1;} fClose(); drawDetail(); }
function selRows(f){
  if(sel.phase==="l2s"){ const w=sel.repKey==="tot"?null:sel.repKey; const co=L.filter(l=>inR(l.cd,A,B)&&(w==null||l.setter===w)); return [co.filter(l=>l.is_signed), co.filter(l=>!l.is_signed)]; }
  if(sel.phase==="plan") return [f.gepland, f.verloren];
  if(sel.phase==="show") return [f.show, f.geenShow];
  if(sel.phase==="signS") return [f.signS, f.nietSignS];
  if(sel.phase==="sign") return [f.sign, f.nietSign];
  if(sel.phase==="close") return [f.closed, f.closeLost.concat(f.closeOpen)];
  return [f.paid, f.nietPaid];
}
function colDefs(phase,win){
  const ph=PH[phase], di = win? ph.d : ph.bd;
  const cols=[
    {t:"Naam", v:l=>l.name.toLowerCase(), k:l=>l.name, f:false},
    {t:"Datum", v:l=>l[di], k:l=>l[di]>=0?fmt(l[di]):"—", f:true},
    {t:"Setter", v:l=>l.setter, k:l=>l.setter||"—", f:true},
    {t:"Intaker", v:l=>l.intaker, k:l=>l.intaker||"—", f:true},
    {t:"Eigenaar", v:l=>l.owner, k:l=>l.owner||"—", f:true},
    {t:"Huidige fase", v:l=>l.stage_position, k:l=>l.stage_name, f:true},
    {t:"Reden", v:l=>l.lost?(l.lost_reason||""):"", k:l=>l.lost?(l.lost_reason||"(geen reden)"):"—", f:true},
  ];
  if(phase==="show") cols.push({t:"Poging", v:l=>l.attempt||0, k:l=>l.attempt?String(l.attempt)+"e":"—", f:true});
  if(phase==="pay") cols.push({t:"Betaald", v:l=>l.paid_amount, k:l=>l.paid_amount>1?eur(l.paid_amount):(l.paid_check?"✅":"—"), f:true});
  cols.push({t:"Kanaal", v:l=>l.kanaal||"", k:l=>l.kanaal||"—", f:true});
  if(phase==="plan") cols.push({t:"Reactietijd", v:l=>l.s2l==null?1e9:l.s2l, k:l=>fmin(l.s2l), f:false});
  if(phase==="plan"&&!win) cols.push({t:"Dagen tot verlies", v:l=>l.dagenPijp==null?-1:l.dagenPijp, k:l=>l.dagenPijp==null?"—":l.dagenPijp+" d", f:false});
  if(!win){ const ri=cols.findIndex(c=>c.t==="Reden"); if(ri>2){ const [rc]=cols.splice(ri,1); cols.splice(2,0,rc); } }   // verloren-kolom: reden meteen na de datum
  return cols;
}
function applyColF(rows,cols,tbl,skipCol){
  return rows.filter(r=>{ for(const ci in colF[tbl]){ if(+ci===skipCol) continue; const set=colF[tbl][ci]; if(set && set.size && !set.has(cols[ci].k(r))) return false; } return true; });
}
function openFilter(ev,tbl,ci,phase,win){
  ev.stopPropagation();
  if(fOpen && fOpen.tbl===tbl && fOpen.ci===ci){ fClose(); return; }
  fOpen={tbl,ci,phase,win};
  const who = sel.repKey==="tot"? null : sel.repKey;
  const f=funnel(who,A,B), [ok,bad]=selRows(f);
  const rows = tbl==="ok"? ok : bad;
  const cols=colDefs(phase,win);
  const base=applyColF(rows,cols,tbl,ci);
  const cnt=new Map(); for(const r of base){ const k=cols[ci].k(r); cnt.set(k,(cnt.get(k)||0)+1); }
  const set=colF[tbl][ci];
  let vals=[...cnt.entries()]; vals.sort(ci===1? ((a,b)=>0) : ((a,b)=>b[1]-a[1]));
  const el=document.getElementById("fdrop");
  let som=0, nsel=0; if(set&&set.size){ for(const [k,n] of vals) if(set.has(k)){ som+=n; nsel++; } }
  el.innerHTML=`<div class="fi fall${(!set||!set.size)?" on":""}" onclick="fPick('${tbl}',${ci},null)">Alles <b>${base.length}</b></div>`+
    vals.map(([k,n])=>`<div class="fi${set&&set.has(k)?" on":""}" onclick="fPick('${tbl}',${ci},${JSON.stringify(k).replace(/"/g,"&quot;")})">${esc(k)} <b>${n}</b></div>`).join("")+
    (nsel? `<div class="fsum">✓ ${nsel} aangevinkt · samen ${som}</div>` : "");
  const r2=ev.target.getBoundingClientRect(); el.style.display="block"; el.style.left=Math.min(r2.left, window.innerWidth-230)+"px"; el.style.top=(r2.bottom+4)+"px";
}
function fPick(tbl,ci,val){
  if(val===null){ delete colF[tbl][ci]; }
  else{ let set=colF[tbl][ci]; if(!set) set=colF[tbl][ci]=new Set(); set.has(val)? set.delete(val) : set.add(val); if(!set.size) delete colF[tbl][ci]; }
  const keep=fOpen; drawDetail();
  if(keep){ fOpen=null; const th=document.querySelector(`#tbl-${keep.tbl} th:nth-child(${keep.ci+1}) .fbtn`); if(th){ const fake={stopPropagation:()=>{},target:th}; openFilter(fake,keep.tbl,keep.ci,keep.phase,keep.win); } }
}
function fClose(){ const e=document.getElementById("fdrop"); e.style.display="none"; e.dataset.open=""; fOpen=null; }
document.addEventListener("click",e=>{ const p=e.composedPath(); if(!p.some(n=>n.nodeType===1&&n.classList&&(n.classList.contains("fdrop")||n.classList.contains("fbtn")||n.classList.contains("persoon")))) fClose(); });
function rowsTable(rows, phase, win, tblKey){
  const cols=colDefs(phase,win);
  let list=applyColF(rows,cols,tblKey,-1);
  const s=sortSt[tblKey];
  const sorted=[...list].sort((x,y)=>{ const a=cols[s.c].v(x), b=cols[s.c].v(y); return (a<b?-1:a>b?1:0)*s.d; });
  let h=`<table id="tbl-${tblKey}"><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="sortDetail('${tblKey}',${i})">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span>${c.f?`<span class="fbtn${colF[tblKey][i]?" on":""}" onclick="openFilter(event,'${tblKey}',${i},'${phase}',${win})">⏷</span>`:""}</th>`).join("")+"</tr>";
  if(!sorted.length) return h+"</table>"+`<div class="empty">Niemand${Object.keys(colF[tblKey]).length?" met dit filter":""} in deze periode.</div>`;
  const key=phase+tblKey, capN = expand[key]? 1e9 : 120;
  for(const l of sorted.slice(0,capN)){
    h+="<tr>"+cols.map((c,i)=>{
      if(i===0) return `<td>${ghl(l.contact_id,l.name)}</td>`;
      if(c.t==="Huidige fase") return `<td><span class="stg${l.is_signed?" win":l.lost?" lost":""}">${esc(l.stage_name)}${l.lost&&l.stage_position!==0?" · verloren":""}</span></td>`;
      return `<td>${esc(c.k(l))}</td>`;
    }).join("")+"</tr>";
  }
  h+="</table>";
  if(sorted.length>capN) h+=`<div class="more" onclick="expand['${key}']=1;drawDetail()">▼ toon alle ${sorted.length} namen</div>`;
  return h;
}
function drawDetail(){
  const el=document.getElementById("detail");
  if(!sel || ["adv","won","dag","apt","trend","bron","lost","int"].includes(tab)){ el.style.display="none"; return; }
  if(tab==="cmp"){ el.style.marginTop="12px"; } else el.style.marginTop="";
  const who = sel.repKey==="tot"? null : sel.repKey;
  const name = who==null? "Totaal" : who;
  const f=funnel(who,A,B), ph=PH[sel.phase];
  const [ok,bad]=selRows(f);
  el.style.display="block";
  const nf=Object.keys(colF.ok).length+Object.keys(colF.bad).length;
  const okF=applyColF(ok,colDefs(sel.phase,true),"ok",-1).length, badF=applyColF(bad,colDefs(sel.phase,false),"bad",-1).length;
  document.getElementById("dhead").innerHTML=`<b>${esc(name)} · ${ph.t} (${ROL(sel.phase)})</b><span>${fmtY(A)} t/m ${fmtY(B)} · ${ok.length} wel · ${bad.length} niet${nf?` · <a href="#" onclick="colF={ok:{},bad:{}};drawDetail();return false" style="color:var(--plan)">filters wissen (${nf})</a>`:""}</span>`;
  document.getElementById("dchart").innerHTML = tab==="tot" ? "" : chartWidget(who, sel.phase);   // homepage: geen grafiekblok, alleen wel/niet-kolommen
  document.getElementById("dcols").innerHTML=
    `<div class="dcol"><h3><span class="pill ok">${okF!==ok.length?okF+" van "+ok.length:ok.length}</span> ${ph.ok}</h3>${rowsTable(ok,sel.phase,true,"ok")}</div>
     <div class="dcol"><h3><span class="pill bad">${badF!==bad.length?badF+" van "+bad.length:bad.length}</span> ${bad.length&&!bad.some(l=>l.open)?ph.bad.replace("(nog) ",""):ph.bad}</h3>${rowsTable(bad,sel.phase,false,"bad")}</div>`;
}

// ---- 🏆 gewonnen ----
let wonRep=null, wonSort={c:0,d:-1};
function drawWon(){
  const ww=document.getElementById("wonwrap");
  const all=L.filter(l=> l.is_signed && inR(l.stgd,A,B));
  const perRep=new Map(); for(const l of all){ const k=l.owner||"—"; perRep.set(k,(perRep.get(k)||0)+1); }
  const chips=[["all","Alle eigenaren",all.length]].concat([...perRep.entries()].sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k,k,n]));
  const rows = wonRep===null? all : all.filter(l=>(l.owner||"—")===wonRep);
  const cols=[
    {t:"Inschrijfdatum", v:l=>l.stgd, k:l=>l.stgd>=0?fmt(l.stgd):"—"},
    {t:"Naam", v:l=>l.name.toLowerCase(), k:l=>ghl(l.contact_id,l.name)},
    {t:"Setter", v:l=>l.setter, k:l=>esc(l.setter||"—")},
    {t:"Intaker", v:l=>l.intaker, k:l=>esc(l.intaker||"—")},
    {t:"Eigenaar", v:l=>l.owner, k:l=>esc(l.owner||"—")},
    {t:"Fase", v:l=>l.stage_position, k:l=>`<span class="stg win">${esc(l.stage_name)}</span>${l.lost?' <span class="stg lost">verloren</span>':""}`},
    {t:"Definitief", v:l=>l.is_signed_definitive?1:0, k:l=>l.is_signed_definitive?"✅":(l.stgd>=0?`bedenktermijn t/m ${fmt(l.stgd+ (+DEFS.cooling_off_days||14))}`:"—")},
    {t:"Betaald", v:l=>l.paid_amount, k:l=>l.paid_amount>1?("<b>"+eur(l.paid_amount)+"</b>"):(l.paid_check?"✅":"—")},
    {t:"Betaaldatum", v:l=>l.payd, k:l=>l.payd>=0?fmt(l.payd):"—"},
    {t:"Bron", v:l=>l.utm_source||"", k:l=>esc(l.utm_source||"—")},
  ];
  const s=wonSort;
  const sorted=[...rows].sort((x,y)=>{ const a=cols[s.c].v(x), b=cols[s.c].v(y); return (a<b?-1:a>b?1:0)*s.d; });
  let h=`<div class="wonchips">`+chips.map(c=>`<div class="wchip${(wonRep===null&&c[0]==="all")||wonRep===c[0]?" on":""}" onclick="wonRep=${c[0]==="all"?"null":JSON.stringify(c[0]).replace(/"/g,"&quot;")};drawWon()">${esc(c[1])}<span class="n">${c[2]}</span></div>`).join("")+`</div>`;
  h+=`<div class="wontbl"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="wonSort.c===${i}?wonSort.d=-wonSort.d:(wonSort={c:${i},d:1});drawWon()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+"</tr>";
  for(const l of sorted) h+="<tr>"+cols.map(c=>`<td>${c.k(l)}</td>`).join("")+"</tr>";
  if(!sorted.length) h+=`<tr><td colspan="${cols.length}" class="empty">Geen ingeschreven deals in deze periode.</td></tr>`;
  const paid=rows.filter(l=>l.is_paid), som=rows.reduce((a,l)=>a+(l.paid_amount>1?l.paid_amount:0),0), def=rows.filter(l=>l.is_signed_definitive).length;
  h+=`</table><div class="wontot">${rows.length} ingeschreven · ${def} definitief (bedenktermijn ${DEFS.cooling_off_days||14} dagen voorbij) · ${paid.length} betaald${som?` · ${eur(som)} ontvangen`:""}</div></div>
  <p class="note">Telling op inschrijfdatum (de dag van tekenen) binnen de gekozen periode — alleen deze tab; de KPI-kaarten en rates blijven op cohort tellen. Betaald = "Betaald bedrag (DPAC)" ≥ € ${(+PAY_MIN).toLocaleString("nl-NL")}, of het ✅-vinkje. Definitief = ${DEFS.cooling_off_days||14} dagen na de laatste fasewissel naar Agreement Signed en niet verloren. Zodra Odoo gekoppeld is, komt "betaald" uit de echte betalingen.</p>`;
  ww.innerHTML=h;
}

// ---- 📆 afspraken (slots): twee show rates, poging-nummers, late cancels, zonder uitkomst ----
let aptSort={c:0,d:-1}, aptFilt="all";
function drawApt(){
  const pw=document.getElementById("aptwrap");
  const tbl=(title,role)=>{
    const names=[...new Set(AP.filter(x=>inR(x.sd,A,B)||inR(x.bd,A,B)).map(x=>role==="intaker"?x.intaker:x.setter))].filter(Boolean).sort();
    const line=(n,s)=>{ const held=s.show.length+s.noshow.length+s.late.length; return `<tr><td><b>${esc(n)}</b></td><td>${s.booked.length}</td><td>${s.all.length}</td><td>${s.show.length}</td><td>${s.noshow.length}</td><td>${s.cancel.length}${s.late.length?` <span style="color:var(--red)">(${s.late.length} laat)</span>`:""}</td><td>${s.unres.length}</td><td>${s.open.length}</td><td><b>${held?fpct(s.show.length,held):"—"}</b></td></tr>`; };
    return `<div class="cmp"><h3 style="margin:0 0 10px;font-size:13.5px">${title} · ${fmtY(A)} t/m ${fmtY(B)}</h3><table><tr><th>${role==="intaker"?"Intaker":"Setter"}</th><th>Geboekt in periode</th><th>Op de agenda</th><th>Show</th><th>No-show</th><th>Geannuleerd</th><th>Zonder uitkomst</th><th>Nog te komen</th><th>Show rate per slot</th></tr>`+
      line("Totaal",slots(null,A,B,role))+names.map(n=>line(n,slots(n,A,B,role))).join("")+`</table></div>`;
  };
  const inP=AP.filter(x=>inR(x.sd,A,B));
  const p1=inP.filter(x=>x.attempt_number===1), p2=inP.filter(x=>x.attempt_number>=2);
  const held=x=>x.filter(y=>y.is_show||y.is_noshow||y.is_late_cancel).length;
  const pog=`<div class="cmp"><h3 style="margin:0 0 10px;font-size:13.5px">Eerste poging versus herplanning</h3><table><tr><th></th><th>Afspraken</th><th>Show</th><th>Show rate per slot</th></tr>
    <tr><td>1e afspraak van de lead</td><td>${p1.length}</td><td>${p1.filter(x=>x.is_show).length}</td><td><b>${fpct(p1.filter(x=>x.is_show).length,held(p1))}</b></td></tr>
    <tr><td>2e of latere afspraak</td><td>${p2.length}</td><td>${p2.filter(x=>x.is_show).length}</td><td><b>${fpct(p2.filter(x=>x.is_show).length,held(p2))}</b></td></tr></table></div>`;
  const filt=[["all","Alles"],["show","Show"],["noshow","No-show"],["cancel","Geannuleerd"],["late","Late cancel"],["unres","Zonder uitkomst"],["open","Nog te komen"]];
  const list=inP.filter(x=> aptFilt==="all" || (aptFilt==="show"&&x.is_show)||(aptFilt==="noshow"&&x.is_noshow)||(aptFilt==="cancel"&&x.is_cancelled)||(aptFilt==="late"&&x.is_late_cancel)||(aptFilt==="unres"&&x.is_unresolved)||(aptFilt==="open"&&x.is_upcoming));
  const cols=[
    {t:"Intake", v:x=>x.starts_at, k:x=>fmt(x.sd)+" "+x.hm},
    {t:"Naam", v:x=>x.name.toLowerCase(), k:x=>ghl(x.contact_id,x.name)},
    {t:"Setter", v:x=>x.setter, k:x=>esc(x.setter||"—")},
    {t:"Intaker", v:x=>x.intaker, k:x=>esc(x.intaker||"—")},
    {t:"Status", v:x=>x.status, k:x=>{ const s=x.status; const cls=x.is_show?"win":(x.is_noshow||x.is_late_cancel)?"lost":""; const lab=x.is_show?"show":x.is_noshow?"no-show":x.is_late_cancel?"late cancel":x.is_cancelled?"geannuleerd":x.is_unresolved?"zonder uitkomst":x.is_upcoming?"nog te komen":s; return `<span class="stg ${cls}">${esc(lab)}</span>`; }},
    {t:"Poging", v:x=>x.attempt_number, k:x=>x.attempt_number+"e van "+x.attempts_total},
    {t:"Geboekt", v:x=>x.booked_at, k:x=>x.bd>=0?fmt(x.bd)+" "+x.bhm:"—"},
    {t:"Doorlooptijd", v:x=>x.lead_time_days, k:x=>x.lead_time_days!=null?String(x.lead_time_days).replace(".",",")+" d":"—"},
    {t:"Lead-fase nu", v:x=>x.lead_stage||"", k:x=>x.lead_stage?`<span class="stg${x.lead_status==="lost"?" lost":""}">${esc(x.lead_stage)}${x.lead_status==="lost"?" · verloren":""}</span>`:"—"},
    {t:"Via", v:x=>x.created_source||"", k:x=>esc((x.created_source||"—").replace(/_/g," "))},
  ];
  const s=aptSort; const sorted=[...list].sort((x,y)=>{ const a=cols[s.c].v(x), b=cols[s.c].v(y); return (a<b?-1:a>b?1:0)*s.d; });
  let h=tbl("Per setter (wie plande in)","setter")+tbl("Per intaker (wiens agenda)","intaker")+pog;
  h+=`<div class="wonchips">`+filt.map(f=>`<div class="wchip${aptFilt===f[0]?" on":""}" onclick="aptFilt='${f[0]}';drawApt()">${f[1]}<span class="n">${f[0]==="all"?inP.length:inP.filter(x=>(f[0]==="show"&&x.is_show)||(f[0]==="noshow"&&x.is_noshow)||(f[0]==="cancel"&&x.is_cancelled)||(f[0]==="late"&&x.is_late_cancel)||(f[0]==="unres"&&x.is_unresolved)||(f[0]==="open"&&x.is_upcoming)).length}</span></div>`).join("")+`</div>`;
  h+=`<div class="wontbl"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="aptSort.c===${i}?aptSort.d=-aptSort.d:(aptSort={c:${i},d:1});drawApt()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+"</tr>";
  for(const x of sorted.slice(0,400)) h+="<tr>"+cols.map(c=>`<td>${c.k(x)}</td>`).join("")+"</tr>";
  if(!sorted.length) h+=`<tr><td colspan="${cols.length}" class="empty">Geen afspraken in deze periode.</td></tr>`;
  h+=`</table>${sorted.length>400?`<div class="more">eerste 400 van ${sorted.length} getoond — kies een kortere periode</div>`:""}</div>
  <p class="note">Rechtstreeks uit de GHL-agenda's (intakekalender). Setter = wie de afspraak boekte (createdBy), intaker = in wiens agenda hij staat. <b>Show rate per slot</b> = show ÷ (show + no-show + late cancel); een gewone annulering vooraf telt niet als gehouden slot. <b>Late cancel</b> = geannuleerd op de dag zelf. <b>Zonder uitkomst</b> = intake is geweest maar staat nog op new/confirmed — niemand heeft show of no-show geregistreerd; die tellen nergens mee tot dat gebeurt. Poging = hoeveelste intake-afspraak van deze persoon.</p>`;
  pw.innerHTML=h;
}

// ---- 📅 dag ----
let dagSel=null, dagOpen=new Set(), dagUur=null;
function evDisp(e){
  const t=e.event_type;
  if(t&&t.startsWith("legacy.")){ const k=t.slice(7), st=String(e.status||"");
    if(k==="taak") return {ico:"📞", lab:"taak: "+(e.task_title||"(zonder titel)"), cat:"set"};
    if(k.startsWith("belpoging")) return {ico:"📞", lab:"belpoging "+(k.split("_")[1]||""), cat:"set"};
    if(k==="show") return {ico:"🪑", lab:"show", cat:"show"}; if(k==="no_show") return {ico:"👻", lab:"no-show", cat:"show"};
    if(k==="getekend"||k==="status_won") return {ico:"✍️", lab:"ingeschreven", cat:"close"};
    if(k==="nieuwe_lead") return {ico:"✨", lab:"nieuwe lead", cat:"set"};
    if(k==="intake_gepland") return {ico:"📅", lab:"naar Intake gepland", cat:"set"};
    if(k==="intake_ingepland"||k==="intake_gepland") return {ico:"📅", lab:"intake ingepland"+(/^\d{4}-/.test(st)?" voor "+fmt(dOf(st)):""), cat:"set"};
    if(k==="show_noshow") return st.toLowerCase().startsWith("no")? {ico:"👻", lab:"no-show", cat:"show"} : {ico:"🪑", lab:"show", cat:"show"};
    if(k==="agreement_verstuurd") return {ico:"📤", lab:"agreement verstuurd", cat:"close"};
    if(k==="motivatiebrief") return {ico:"📄", lab:"motivatiebrief binnen", cat:"close"};
    if(k==="verloren") return {ico:"❌", lab:"verloren"+(e.lost_reason?" · "+e.lost_reason:"")+(e.stage_name?" (in "+e.stage_name+")":""), cat:(e.stage_name||"leads").toLowerCase()==="leads"?"set":"close"};
    if(k==="status_open") return {ico:"↩️", lab:"weer open gezet", cat:"close"};
    if(k==="gewonnen"||k==="ingeschreven") return {ico:"✍️", lab:"ingeschreven", cat:"close"};
    return {ico:"·", lab:k.replace(/_/g," ")+(st?" · "+st:""), cat:"set"};
  }
  if(t==="task.signal") return {ico:"📞", lab:"taak: "+(e.task_title||"(zonder titel)"), cat:"set"};
  if(t==="appointment.signal") return {ico:"📅", lab:"afspraak geboekt/gewijzigd", cat:"set"};
  if(t==="status_change.signal") return e.status==="lost"? {ico:"❌", lab:"verloren"+(e.lost_reason?" · "+e.lost_reason:"")+(e.stage_name?" (in "+e.stage_name+")":""), cat:(e.stage_name||"").toLowerCase()==="leads"?"set":"close"} : {ico:"·", lab:"status → "+(e.status||"?"), cat:"close"};
  const s=(e.stage_name||"").toLowerCase();
  if(s.includes("agreement signed")) return {ico:"✍️", lab:"ingeschreven", cat:"close"};
  if(s.includes("agreement")) return {ico:"📤", lab:"agreement verstuurd", cat:"close"};
  if(s.includes("motivation")) return {ico:"📄", lab:"motivatiebrief binnen", cat:"close"};
  if(s==="show") return {ico:"🪑", lab:"show", cat:"show"};
  if(s.includes("no show")) return {ico:"👻", lab:"no-show", cat:"show"};
  if(s.includes("intake gepland")) return {ico:"📅", lab:"intake gepland", cat:"set"};
  if(s==="leads") return {ico:"↩️", lab:"terug naar Leads", cat:"set"};
  return {ico:"·", lab:"→ "+(e.stage_name||t), cat:"set"};
}
function dagStap(n){ dagGa(dagSel+n); }
let weekWho=null;
function weekHtml(){
  const mon=weekKey(dagSel); const days=[0,1,2,3,4,5,6].map(i=>mon+i);
  const who=weekWho;
  const rowsDef=[
    ["✨ Nieuwe leads", d=>L.filter(l=>l.cd===d&&(who==null||l.setter===who)), "nieuw", "binnengekomen op deze dag (setter)"],
    ["📅 Intakes gepland", d=>L.filter(l=>l.stage_position!==0&&l.pd===d&&(who==null||l.setter===who)), "plan", "op deze dag ingepland (inplandatum, setter)"],
    ["🪑 Intakes op de dag", d=>L.filter(l=>l.id_===d&&(who==null||l.setter===who)), "show", "intake vindt op deze dag plaats (toegerekend aan de setter)"],
    ["✅ Shows", d=>L.filter(l=>l.id_===d&&l.is_show&&(who==null||l.setter===who)), "show", "intake op deze dag, kwam opdagen (setter)"],
    ["👻 No-shows", d=>L.filter(l=>l.id_===d&&l.is_noshow&&(who==null||l.setter===who)), "show", "intake op deze dag, kwam niet (setter)"],
    ["✍️ Ingeschreven", d=>L.filter(l=>l.is_signed&&l.stgd===d&&(who==null||l.owner===who)), "sign", "op deze dag getekend (eigenaar)"],
    ["❌ Verloren", d=>L.filter(l=>l.lost&&l.scd===d&&(who==null||l.owner===who)), "lost", "op deze dag op verloren gezet (eigenaar)"],
    ["📞 Belpogingen/taken", d=>EV.filter(e=>e.dag===d&&(e.d.ico==="📞")&&(who==null||e.rep===who)), "nieuw", "belpogingen / taken op deze dag"],
  ];
  const tot=r=>days.reduce((a,d)=>a+r[1](d).length,0);
  let h=`<div class="cmp weekcard"><div class="chhead"><div><h3 style="margin:0">Week ${isoWeek(mon)} · ${fmt(mon)} – ${fmtY(mon+6)}</h3><div class="chsub">per dag · klik een <b>getal</b> = wie zijn dat · klik een <b>dagkop</b> = die dag hieronder openen · klik het <b>weektotaal</b> = hele week</div></div>
    <div class="wonchips" style="margin:0">`+[["Team",null]].concat(REPS.map(p=>[p.n,p.n])).map(c=>`<div class="wchip sm${weekWho===c[1]?" on":""}" onclick="weekWho=${c[1]===null?"null":JSON.stringify(c[1]).replace(/"/g,"&quot;")};drawDag()">${esc(c[0])}</div>`).join("")+`</div></div>
    <table class="weektbl"><tr><th></th>`+days.map(d=>`<th class="${d===dagSel?"sel":""}${d>TODAY?" fut":""}" onclick="dagGa(${d})">${["ma","di","wo","do","vr","za","zo"][(d2s(d).getDay()+6)%7]}<br><b>${d2s(d).getDate()}</b></th>`).join("")+`<th>Week</th></tr>`;
  rowsDef.forEach((r,ri)=>{ const vals=days.map(d=>r[1](d).length); const mx=Math.max(1,...vals);
    h+=`<tr><td class="mt" title="${esc(r[3])}">${r[0]}</td>`+vals.map((v,i)=>`<td class="${days[i]===dagSel?"sel":""}${days[i]>TODAY?" fut":""}${v?" clk":""}${weekSel&&weekSel.r===ri&&weekSel.d===days[i]?" on":""}" onclick="${v?`weekPick(${ri},${days[i]})`:`dagGa(${days[i]})`}" title="${v?"klik: wie zijn dat":""}">${v?`<b>${v}</b><i class="wbar" style="width:${Math.round(v/mx*100)}%;background:var(--wk-${r[2]})"></i>`:"<span class='z'>·</span>"}</td>`).join("")+`<td class="tot clk${weekSel&&weekSel.r===ri&&weekSel.d===null?" on":""}" onclick="weekPick(${ri},null)" title="klik: wie zijn dat (hele week)"><b>${tot(r)}</b></td></tr>`; });
  h+=`</table>`;
  if(weekSel){ const r=rowsDef[weekSel.r]; if(r){ const dd=weekSel.d===null?days:[weekSel.d]; const isEv=weekSel.r===7; const items=dd.flatMap(d=>r[1](d).map(x=>({d,x})));
    const ttl=`${r[0]} · ${weekSel.d===null?"week "+isoWeek(mon):fmtY(weekSel.d)}${who?" · "+esc(who):""} · ${items.length}`;
    h+=`<div class="weekwie"><div class="dhead"><b>${ttl}</b><span>${esc(r[3])} <a href="#" onclick="weekSel=null;drawDag();return false" style="margin-left:10px;color:var(--plan)">sluiten ✕</a></span></div>`;
    if(!items.length) h+=`<div class="empty">Niemand.</div>`;
    else if(isEv) h+=`<table><tr><th>Dag</th><th>Tijd</th><th>Wie</th><th>Wat</th><th>Door</th></tr>`+items.map(({d,x})=>`<tr><td>${fmt(d)}</td><td>${tsHM(x.occurred_at)}</td><td>${ghl(x.contact_id,(L.find(l=>l.contact_id===x.contact_id)||{}).name||x.contact_id)}</td><td>${esc(x.d.lab||x.task_title||x.event_type)}</td><td>${esc(x.rep||"—")}</td></tr>`).join("")+`</table>`;
    else h+=`<table><tr><th>Dag</th><th>Naam</th><th>Setter</th><th>Eigenaar</th><th>Fase</th><th>Kanaal</th>${weekSel.r===6?"<th>Reden</th>":""}</tr>`+items.map(({d,x})=>`<tr><td>${fmt(d)}</td><td>${ghl(x.contact_id,x.name)}</td><td>${esc(x.setter||"—")}</td><td>${esc(x.owner||"—")}</td><td><span class="stg${x.is_signed?" win":x.lost?" lost":""}">${esc(x.stage_name)}${x.lost&&x.stage_position!==0?" · verloren":""}</span></td><td><small>${esc(x.kanaal)}</small></td>${weekSel.r===6?`<td><small>${esc(x.lost_reason||"—")}</small></td>`:""}</tr>`).join("")+`</table>`;
    h+=`</div>`; } }
  h+=`</div>`;
  return h;
}
let weekSel=null;
function weekPick(r,d){ weekSel=(weekSel&&weekSel.r===r&&weekSel.d===d)?null:{r,d}; if(d!==null) dagSel=Math.min(TODAY,d); drawDag(); }
function dagGa(d){ dagSel=Math.min(TODAY,d); dagUur=null; drawDag(); }
function dagToggle(k){ dagOpen.has(k)?dagOpen.delete(k):dagOpen.add(k); dagUur=null; drawDag(); }
function dagPikUur(k,u){ dagUur=(dagUur&&dagUur.rep===k&&dagUur.uur===u)?null:{rep:k,uur:u}; drawDag(); }
function drawDag(){
  const dw=document.getElementById("dagwrap");
  if(dagSel===null||dagSel>TODAY) dagSel=TODAY;
  const wd=d2s(dagSel).toLocaleDateString("nl-NL",{weekday:"long"});
  const evts=EV.filter(e=>e.dag===dagSel);
  const crm=new Map(); const add=(rep,key,x)=>{ rep=rep||"(zonder rep)"; if(!crm.has(rep)) crm.set(rep,{gepland:[],agenda:[],show:[],verloren:[],sign:[]}); crm.get(rep)[key].push(x); };
  for(const l of L){ if(l.stage_position!==0&&l.pd===dagSel) add(l.setter,"gepland",l); if(l.id_===dagSel){ add(l.intaker,"agenda",l); if(l.is_show) add(l.intaker,"show",l);} if(l.lost&&l.scd===dagSel) add(l.owner,"verloren",l); if(l.is_signed&&l.stgd===dagSel) add(l.owner,"sign",l); }
  const per=new Map(); for(const e of evts){ const k=e.rep||"(zonder rep)"; if(!per.has(k)) per.set(k,[]); per.get(k).push(e); }
  const keys=[...new Set([...per.keys(),...crm.keys()])];
  const w=k=>(per.get(k)||[]).length+(crm.has(k)?Object.values(crm.get(k)).reduce((s,a)=>s+a.length,0):0);
  keys.sort((a,b)=>w(b)-w(a));
  const nieuw=L.filter(l=>l.cd===dagSel).length, apts=AP.filter(a=>a.sd===dagSel);
  let h=`<div class="dgkies"><button onclick="dagStap(-1)">‹</button><span class="dgdag">${wd} ${fmtY(dagSel)}</span><button onclick="dagStap(1)" ${dagSel>=TODAY?"disabled":""}>›</button><span class="dgvand" onclick="dagGa(TODAY)">vandaag</span>
    <span style="font-size:11.5px;color:var(--mut)">· ✨ ${nieuw} nieuwe leads · ${apts.length} intakes op de agenda (${apts.filter(a=>a.is_show).length} show, ${apts.filter(a=>a.is_noshow).length} no-show, ${apts.filter(a=>a.is_cancelled).length} geannuleerd) · ${evts.length} live-events met tijd</span></div>`;
  h+=weekHtml();
  if(!keys.length){ h+=`<div class="dgleeg">Geen sales-activiteit gevonden op deze dag${nieuw?` (wel ${nieuw} nieuwe leads binnengekomen)`:""}.</div>`; }
  else for(const k of keys){
    const list=per.get(k)||[], c=crm.get(k), color=RCOL[k]||"#8a94a8", ini=(k||"?").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase(), open=dagOpen.has(k);
    const nS=list.filter(e=>e.d.cat==="set").length, nH=list.filter(e=>e.d.cat==="show").length, nC=list.length-nS-nH, tot=list.length, p=x=>tot?Math.round(x/tot*100):0;
    h+=`<div class="dgcard"><div class="dghead" onclick="dagToggle(${JSON.stringify(k).replace(/"/g,"&quot;")})"><div class="ava" style="background:${color}">${esc(ini)}</div><b>${esc(k)}</b>`;
    h+= tot? `<span class="dgsum">${tot} live-${tot===1?"event":"events"} · ${p(nS)}% set / ${p(nH)}% show / ${p(nC)}% close</span><div class="dgbalk"><i style="width:${p(nS)}%;background:var(--dgset)"></i><i style="width:${p(nH)}%;background:var(--dgshow)"></i><i style="width:${p(nC)}%;background:var(--dgclose)"></i></div><span class="dgcaret">${open?"▲ uren dicht":"▼ uren tonen"}</span>` : `<span class="dgsum">geen live-events met tijdstip — wel dagcijfers hieronder</span>`;
    h+=`</div>`;
    if(c){ const defs=[["gepland","📅","ingepland (als setter)"],["agenda","🪑","intakes gevoerd"],["show","✅","shows"],["verloren","❌","verloren"],["sign","✍️","ingeschreven"]];
      const chips=defs.filter(d=>c[d[0]].length).map(d=>`<span class="dgchip">${d[1]} ${c[d[0]].length} ${d[2]}</span>`).join("");
      if(chips) h+=`<div class="dgcrm"><div class="dgcrmkop">📊 Dagcijfers uit het CRM</div>${chips}</div>`; }
    if(open&&tot){
      const uren={}; for(const e of list){ const u=+String(e.occurred_time||"00").slice(0,2); (uren[u]=uren[u]||[]).push(e); }
      h+=`<div class="dguren">`;
      for(const u of Object.keys(uren).map(Number).sort((a,b)=>a-b)){
        const le=uren[u].slice().sort((a,b)=>a.occurred_at<b.occurred_at?-1:1);
        const blok=(cat,cls)=>{ const els=le.filter(e=>e.d.cat===cat); if(!els.length) return ""; const agg=new Map(); for(const e of els) agg.set(e.d.ico,(agg.get(e.d.ico)||0)+1); return `<div class="dgblok ${cls}"><span class="lbl">${cat.toUpperCase()}</span>${[...agg.entries()].map(([ic,n])=>ic==="❌"?`<span class="rood">${ic} ${n}</span>`:`${ic} ${n}`).join(" · ")}</div>`; };
        const selu=dagUur&&dagUur.rep===k&&dagUur.uur===u;
        h+=`<div class="dguur${selu?" sel":""}" onclick="dagPikUur(${JSON.stringify(k).replace(/"/g,"&quot;")},${u})"><div class="dgu">${String(u).padStart(2,"0")}:00</div><div>${blok("set","dgb-set")}${blok("show","dgb-show")}${blok("close","dgb-close")}</div></div>`;
        if(selu){ h+=`<div class="dgdet"><table><tr><th style="width:52px">Tijd</th><th style="width:76px">Cat.</th><th>Wat</th><th>Lead</th></tr>`+le.map(e=>{ const l=L.find(x=>x.lead_id===e.entity_id||x.contact_id===e.contact_id); return `<tr><td>${e.occurred_time}</td><td><span class="dgtag dg-${e.d.cat}">${e.d.cat.toUpperCase()}</span></td><td>${e.d.ico} ${esc(e.d.lab)}</td><td>${ghl(e.contact_id||(l&&l.contact_id), l?l.name:(e.legacy_name?cap(e.legacy_name):"(lead)"))}</td></tr>`; }).join("")+`</table></div>`; }
      }
      h+=`</div>`;
    }
    h+=`</div>`;
  }
  const eerste=EV.length? Math.min(...EV.map(e=>e.dag).filter(d=>d>=0)) : -1;
  h+=`<p class="note">Live-events komen realtime binnen uit GHL (taken, fasewissels, verloren/gewonnen, afspraken)${eerste>=0?" — beschikbaar vanaf "+fmtY(eerste)+" (de oudste dagen komen uit het activiteitenlog van het vorige dashboard)":""}; de dagcijfers komen uit de nachtelijke sync. <b>Wie krijgt een event?</b> Bel- en plan-events (taken, afspraak geboekt, naar Intake gepland) staan bij de <b>setter</b> van de lead — GHL legt bij een taak niet vast wie hem aanmaakte, dus we nemen de setter uit het setterveld. Verloren, show/no-show en alles vanaf show staan bij de <b>eigenaar</b> van de deal. SET = Leads-fase, SHOW = intake gepland / no-show, CLOSE = vanaf show.</p>`;
  dw.innerHTML=h;
}



