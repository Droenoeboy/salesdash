
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

let D=null, GCODE="", L=[], AP=[], EV=[], FT=new Map(), DEFS={}, STAGES=[], P=[], REPS=[], REPS_ALL=[], REPS_UNK=[], RCOL={}, PAY_MIN=1000;
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
  FT=new Map((D.ft_cols&&D.first_touch)? objs(D.ft_cols, D.first_touch).map(x=>[String(x.lead_id),x]) : []);   // v3.6: reactietijd + toewijzing uit dpac.v_lead_first_touch
  for(const l of L){
    l.name=cap(l.contact_name); l.cd=dOf(l.created_on); l.pd=dOf(l.planned_on); l.id_=dOf(l.intake_on); l.payd=dOf(l.paid_on);
    l.scd=dOf(l.status_changed_on); l.stgd=dOf(l.stage_changed_on); l.insd=dOf(l.signed_form_on); l.insE=l.insd>=0?l.insd:l.stgd; // inschrijfdatum = PA-formulier, val terug op fasewissel
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
  // v3.8: events zonder herleidbare rep (GHL stuurt bij taken geen maker mee; verse leads hebben nog geen setter/eigenaar)
  // → toeschrijven aan de dominante rep van die dag (≥70% van de wél herleidbare events die dag), gemarkeerd als toegeschat
  { const perDag=new Map();
    for(const e of EV){ if(!e.rep||isRawId(e.rep)) continue; const m=perDag.get(e.dag)||new Map(); m.set(e.rep,(m.get(e.rep)||0)+1); perDag.set(e.dag,m); }
    for(const e of EV){ if(e.rep) continue; const m=perDag.get(e.dag); if(!m) continue; let tot=0,best=null,bn=0; for(const [r,n] of m){ tot+=n; if(n>bn){ bn=n; best=r; } }
      if(best && bn/tot>=0.7){ e.rep=best; e.est=true; } } }
  // speed-to-lead: eerste contactmoment (taak/belpoging/afspraak) na binnenkomst van de lead, in minuten
  const evByC=new Map(); for(const e of EV){ if(!e.contact_id) continue; if(!evByC.has(e.contact_id)) evByC.set(e.contact_id,[]); evByC.get(e.contact_id).push(e); }
  const CONTACT_EV=new Set(["task.signal","legacy.taak","legacy.belpoging_2","legacy.belpoging_3","legacy.belpoging_4","appointment.signal","legacy.intake_ingepland","legacy.intake_gepland","stage_change.signal"]);
  const EV_START = EV.length? Math.min(...EV.map(e=>new Date(e.occurred_at).getTime()).filter(t=>!isNaN(t))) : Infinity;   // reactietijd alleen voor leads die binnenkwamen sinds het eventlog draait
  // speed-to-lead v3.5: alleen menselijke acties tellen — de fasewissel naar "Leads" is de lead zelf die binnenvalt (0 min, geen eigenaar) en telt niet
  const isTouch = e => e.event_type==="stage_change.signal" ? ((e.stage_name||"")!=="Leads") : CONTACT_EV.has(e.event_type);
  // werkvenster per dag (Europe/Amsterdam): van de eerste tot de laatste menselijke actie van het team; leads die daarbuiten binnenkomen ('s nachts) tellen niet mee
  const dayKey = t => new Date(t).toLocaleDateString("sv-SE",{timeZone:"Europe/Amsterdam"});
  const WIN=new Map(); for(const e of EV){ if(!isTouch(e)) continue; const t=new Date(e.occurred_at).getTime(); if(isNaN(t)) continue; const k=dayKey(t); const w=WIN.get(k); if(!w) WIN.set(k,{a:t,b:t}); else { if(t<w.a) w.a=t; if(t>w.b) w.b=t; } }
  const inWork = t => { const w=WIN.get(dayKey(t)); return !!w && t>=w.a && t<=w.b; };
  for(const l of L){ l.s2l=null; l.s2b=null; l.s2lOut=false;
    if(l.created_at){ const t0=new Date(l.created_at).getTime(); if(!isNaN(t0)){
      if(t0>=EV_START && !inWork(t0)) l.s2lOut=true;   // buiten werkvenster: niet meegeteld
      const evs= (t0<EV_START || l.s2lOut) ? [] :(evByC.get(l.contact_id)||[]).filter(isTouch).map(e=>new Date(e.occurred_at).getTime()).filter(t=>t>t0);
      if(evs.length) l.s2l=Math.round((Math.min(...evs)-t0)/6e4);
      // v3.6: datalaag wint als die er is — reactietijd tot eerste menselijke actie, toegewezen aan wie handelde (taak-eigenaar → latere actie → enige actieve rep), buiten werkvenster = niet meegeteld
      const ft=FT.get(String(l.lead_id)); if(ft){ l.s2lBy=ft.first_touch_by||null; l.s2lHow=ft.attribution_method||null; if(ft.in_work_window){ l.s2lOut=false; l.s2l=ft.first_touch_min; } else { l.s2lOut=true; l.s2l=null; } }
      const bk=(byC.get(l.contact_id)||[]).length? AP.filter(a=>a.contact_id===l.contact_id&&a.booked_at).map(a=>new Date(a.booked_at).getTime()).filter(t=>t>t0) : [];
      if(bk.length) l.s2b=Math.round((Math.min(...bk)-t0)/36e5*10)/10;   // uren tot 1e boeking
    } }
  }
  // mensen: iedereen die als setter, intaker of eigenaar voorkomt, gesorteerd op activiteit
  const act=new Map(); const add=(n,w)=>{ if(!n) return; act.set(n,(act.get(n)||0)+w); };
  for(const l of L){ if(l.pd>=0&&l.stage_position!==0) add(l.setter,1); if(l.id_>=0){ add(l.intaker,1); add(l.owner,.5);} if(l.lost&&l.stage_position===0) add(l.owner,.2); }
  for(const a of AP){ add(a.setter,.5); add(a.intaker,.5); }
  P=[...act.keys()];
  REPS_ALL=P.map(n=>({n,a:act.get(n)})).filter(p=>p.a>=3).sort((a,b)=>b.a-a.a);
  REPS_UNK=REPS_ALL.filter(p=>isRawId(p.n));          // GHL user-id zonder naam (verwijderde/oude accounts) — nooit als kaart
  REPS=REPS_ALL.filter(p=>!isRawId(p.n));
  REPS.forEach((p,k)=>RCOL[p.n]=PAL[k%PAL.length]);
  teamLoad();
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
// ---- teamkiezer (welke kaarten tonen) — onthouden in localStorage + URL ?reps= ----
let teamSel=null;   // Set van namen; null = nog niet geladen
const TEAM_KEY="salesdash_reps";
function isRawId(n){ return /^[A-Za-z0-9]{18,24}$/.test(String(n||"")) && !/\s/.test(String(n)); }
function teamLoad(){
  const known=new Set(REPS.map(p=>p.n)); let sel=null;
  try{ const u=new URL(location