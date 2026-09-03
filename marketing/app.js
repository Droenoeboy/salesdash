// ============================================================
//  DPAC · Sales Dashboard v2
//  Voorkant: het bewezen dashboard uit droenoeboy/salesdash.
//  Databron: de DPAC-datalaag in Supabase (laag 2: views), via n8n.
//  Alle definities staan in dpac.definitions + de views; dit bestand telt alleen op per periode.
// ============================================================
const DATA_URL = "https://dpac.app.n8n.cloud/webhook/dpac-marketing-data";
const DASH_VERSIE = "mkt-v1.0-2026-08-19";
const LOC = "TdkRfY76R77enqlUSRHi";
const EPOCH = new Date(2026,0,1);
const MND=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const MNDF=["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const PAL=["#1f6fd8","#1a9a3d","#dc2a1e","#c99a00","#8f845e","#5856d6","#0e0e0f","#2c8f9b"];

let D=null, GCODE="", L=[], AP=[], EV=[], DEFS={}, STAGES=[], P=[], REPS=[], RCOL={}, PAY_MIN=1000;
let TODAY=0, NOW=0, A, B, tab="tree", sel=null, VBEZIG=false;
let THEME="dark"; try{ THEME=localStorage.dpacTheme||"dark"; }catch(e){}
function applyTheme(){ document.documentElement.dataset.theme=THEME; const b=document.getElementById("thbtn"); if(b) b.textContent=THEME==="dark"?"☀︎":"☾"; const m=document.querySelector('meta[name=theme-color]'); if(m) m.content=THEME==="dark"?"#0e0e0f":"#0e0e0f"; }
function toggleTheme(){ THEME=THEME==="dark"?"light":"dark"; try{localStorage.dpacTheme=THEME;}catch(e){} applyTheme(); }
applyTheme();

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
    if(location.search.indexOf("local=1")>=0){ data=await (await fetch("mkt_data.json")).json(); }
    else data=await laad(code);
    GCODE=code; try{sessionStorage.dpacMktCode=code;}catch(e){}
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
  try{ const data=await laad(GCODE); const oA=A,oB=B,oTab=tab; D=data; sel=null; initApp(); A=Math.max(0,Math.min(oA,NOW)); B=Math.max(A,Math.min(oB,NOW)); tab=oTab; render();
    const t=new Date(); tx.textContent="zojuist ververst · "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0");
  }catch(e){ tx.textContent="verversen mislukt ("+(e&&e.message?e.message:"netwerk")+")"; }
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
const CHART_COL = ["#1f6fd8","#1a9a3d","#dc2a1e","#c99a00","#8f845e","#5856d6","#0e9aa7","#d95fa2"];
const repCol = n => RCOL[n] || "#8e8e93";
function svgLine(series, o={}){
  const w=o.w||640, h=o.h||190, pl=o.pl||38, pr=o.pr||(series.some(x=>x.showVals)?46:12), pt=o.pt||14, pb=o.pb||26;
  const n=Math.max(...series.map(s=>s.values.length),1);
  const vals=series.flatMap(s=>s.values.filter(v=>v!=null));
  let ymax = o.ymax!=null? o.ymax : Math.max(1,...vals); let ymin = o.ymin!=null? o.ymin : 0;
  if(o.pct){ ymax=Math.min(100,Math.max(20,Math.ceil(ymax/20)*20)); }
  else { const st=Math.pow(10,Math.floor(Math.log10(ymax||1))); ymax=Math.ceil(ymax/st)*st; }
  const X=i=> n>1? pl+(w-pl-pr)*i/(n-1) : (pl+w-pr)/2, Y=v=> pt+(h-pt-pb)*(1-(v-ymin)/((ymax-ymin)||1));
  const ticks=(o.ticks===3?[0,.5,1]:[0,.25,.5,.75,1]).map(t=>ymin+(ymax-ymin)*t);
  let s=`<svg viewBox="0 0 ${w} ${h}" class="chart" preserveAspectRatio="xMinYMin meet" style="height:${h}px;width:${w}px;max-width:100%">`;
  for(const t of ticks) s+=`<line x1="${pl}" x2="${w-pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" class="grid"/><text x="${pl-6}" y="${(Y(t)+3.5).toFixed(1)}" class="ax" text-anchor="end">${o.pct?Math.round(t)+"%":Math.round(t)}</text>`;
  (o.labels||[]).forEach((lb,i)=>{ const every=Math.ceil(n/(w<320?4:8)); if(i%every===0||i===n-1) s+=`<text x="${X(i).toFixed(1)}" y="${h-8}" class="ax" text-anchor="middle">${esc(lb)}</text>`; });
  if(o.markLast) s+=`<rect x="${(X(n-1)-8).toFixed(1)}" y="${pt}" width="16" height="${h-pt-pb}" class="cur"/>`;
  for(const se of series){
    let d="", started=false;
    se.values.forEach((v,i)=>{ if(v==null){ started=false; return; } d+=(started?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1); started=true; });
    s+=`<path d="${d}" fill="none" stroke="${se.color}" stroke-width="${se.width||2.2}" ${se.dash?'stroke-dasharray="4 4"':""} stroke-linejoin="round" stroke-linecap="round" opacity="${se.opacity||1}"/>`;
    se.values.forEach((v,i)=>{ if(v==null) return; const weak=se.weak&&se.weak[i]; s+=`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${weak?2.5:3.5}" fill="${weak?"var(--card)":se.color}" stroke="${se.color}" stroke-width="1.6"><title>${esc(se.name)} · ${(o.labels||[])[i]||""}: ${o.pct?(v+"").replace(".",",")+"%":v}${se.tips&&se.tips[i]?" · "+esc(se.tips[i]):""}</title></circle>`;
      if(se.showVals && (i===se.values.length-1)) s+=`<text x="${(X(i)+6).toFixed(1)}" y="${(Y(v)-6).toFixed(1)}" class="val" fill="${se.color}">${o.pct?(v+"").replace(".",",")+"%":v}</text>`; });
  }
  s+="</svg>";
  return s;
}
function svgBars(groups, o={}){ // groups: [{label, parts:[{v,color,name}]}] gestapeld
  const w=o.w||640, h=o.h||160, pl=o.pl||34, pr=o.pr||8, pt=o.pt||10, pb=o.pb||24;
  const n=groups.length||1, tot=groups.map(g=>g.parts.reduce((a,p)=>a+p.v,0)); let ymax=Math.max(1,...tot); const st=Math.pow(10,Math.floor(Math.log10(ymax))); ymax=Math.ceil(ymax/st)*st;
  const bw=(w-pl-pr)/n, Y=v=> pt+(h-pt-pb)*(1-v/ymax);
  let s=`<svg viewBox="0 0 ${w} ${h}" class="chart" preserveAspectRatio="xMinYMin meet" style="height:${h}px;width:${w}px;max-width:100%">`;
  for(const t of [0,.5,1]) s+=`<line x1="${pl}" x2="${w-pr}" y1="${Y(ymax*t).toFixed(1)}" y2="${Y(ymax*t).toFixed(1)}" class="grid"/><text x="${pl-5}" y="${(Y(ymax*t)+3.5).toFixed(1)}" class="ax" text-anchor="end">${Math.round(ymax*t)}</text>`;
  groups.forEach((g,i)=>{ let acc=0; const x=pl+bw*i+bw*.18, ww=bw*.64;
    for(const p of g.parts){ if(!p.v) continue; const y1=Y(acc+p.v), y0=Y(acc); s+=`<rect x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${ww.toFixed(1)}" height="${Math.max(0,y0-y1).toFixed(1)}" fill="${p.color}" rx="2"><title>${esc(g.label)} · ${esc(p.name)}: ${p.v}</title></rect>`; acc+=p.v; }
    if(tot[i]) s+=`<text x="${(x+ww/2).toFixed(1)}" y="${(Y(tot[i])-4).toFixed(1)}" class="val" text-anchor="middle">${tot[i]}</text>`;
    const every=Math.ceil(n/8); if(i%every===0||i===n-1) s+=`<text x="${(x+ww/2).toFixed(1)}" y="${h-7}" class="ax" text-anchor="middle">${esc(g.label)}</text>`; });
  s+="</svg>"; return s;
}
const legend = items => `<div class="legend">`+items.map(i=>`<span><i style="background:${i.color}"></i>${esc(i.name)}</span>`).join("")+`</div>`;
const ppDelta = (cur,prev) => (cur==null||prev==null)? "" : (()=>{ const d=Math.round((cur-prev)*10)/10; const cls=d>0?"up":d<0?"dn":"eq"; return `<i class="dlt ${cls}">${d>0?"▲ +":d<0?"▼ ":"= "}${(Math.abs(d)+"").replace(".",",")} pp</i>`; })();
function weekKey(d){ const t=d2s(d); const dow=(t.getDay()+6)%7; return d-dow; }   // maandag van de week
function monthKey(d){ const t=d2s(d); return s2d(new Date(t.getFullYear(),t.getMonth(),1)); }
function isoWeek(d){ const t=d2s(d); const x=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate())); const dn=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-dn); const y0=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return Math.ceil((((x-y0)/864e5)+1)/7); }
let dpView, dpStart=null, dpEnd=null, dpH=null;
function dpToggle(){ const p=document.getElementById("dpPop"); if(p.classList.contains("open")){p.classList.remove("open");return;} dpStart=null; dpEnd=null; dpH=null; dpView=new Date(d2s(A).getFullYear(),d2s(A).getMonth(),1); dpDraw(); p.classList.add("open"); }
function dpDraw(){
  const host=document.getElementById("dpMonths"); host.innerHTML="";
  const picking = dpStart!==null && dpEnd===null;
  const nM = window.innerWidth<720 ? 1 : 2;
  for(let k=0;k<nM;k++){
    const m=new Date(dpView.getFullYear(),dpView.getMonth()+k,1);
    const div=document.createElement("div"); div.className="dp-m";
    let h=`<div class="dp-mh">${k===0?'<button class="dp-nav" onclick="dpNav(-1)">‹</button>':"<span></span>"}<b>${MNDF[m.getMonth()]} ${m.getFullYear()}</b>${k===nM-1?'<button class="dp-nav" onclick="dpNav(1)">›</button>':"<span></span>"}</div><div class="dp-grid">`;
    for(const d of ["ma","di","wo","do","vr","za","zo"]) h+=`<span class="dp-dow">${d}</span>`;
    const first=(m.getDay()+6)%7, days=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();
    for(let i=0;i<first;i++) h+="<span></span>";
    for(let dd=1;dd<=days;dd++){
      const dv=s2d(new Date(m.getFullYear(),m.getMonth(),dd)); let cls="dp-d";
      if(picking){ const hv = dpH!==null? dpH : dpStart; const s=Math.min(dpStart,hv), e=Math.max(dpStart,hv); if(dv===dpStart||dv===hv) cls+=" cap"; else if(dv>s&&dv<e) cls+=" prev"; }
      else{ const s=dpStart!==null?dpStart:A, e=dpEnd!==null?dpEnd:(dpStart!==null?dpStart:B); if(dv===s||dv===e) cls+=" cap"; else if(dv>Math.min(s,e)&&dv<Math.max(s,e)) cls+=" inR"; }
      h+=`<button class="${cls}" onclick="dpPick(${dv})" onmouseenter="dpHov(${dv})">${dd}</button>`;
    }
    div.innerHTML=h+"</div>"; host.appendChild(div);
  }
  document.getElementById("dpHint").innerHTML = dpStart===null ? "Klik een <b>startdatum</b>, klik daarna een <b>einddatum</b>" : `Start: <b>${fmtY(dpStart)}</b> — klik nu de <b>einddatum</b>`;
  const pr=document.getElementById("dpPresets"); pr.innerHTML="";
  dpPresetList().forEach(p=>{ const c=document.createElement("div"); c.className="chip"; c.textContent=p[0]; c.onclick=()=>{ setRange(p[1],p[2]); dpClose(); }; pr.appendChild(c); });
}
function dpNav(k){ dpView.setMonth(dpView.getMonth()+k); dpDraw(); }
function dpHov(dv){ if(dpStart!==null && dpEnd===null && dpH!==dv){ dpH=dv; dpDraw(); } }
function dpPick(dv){ if(dpStart===null||dpEnd!==null){ dpStart=dv; dpEnd=null; dpH=null; dpDraw(); return; } if(dv<dpStart){ dpStart=dv; dpH=null; dpDraw(); return; } dpEnd=dv; setRange(dpStart,dpEnd); dpClose(); }
function dpClose(){ document.getElementById("dpPop").classList.remove("open"); }
document.addEventListener("click",e=>{ const inDp = e.composedPath().some(n=>n.nodeType===1 && n.classList && n.classList.contains("dp")); if(!inDp) dpClose(); });
function dpPresetList(){
  const t=d2s(NOW);
  const som=s2d(new Date(t.getFullYear(),t.getMonth(),1)), somV=s2d(new Date(t.getFullYear(),t.getMonth()-1,1)), eomV=som-1, jaar=s2d(new Date(t.getFullYear(),0,1)), drie=s2d(new Date(t.getFullYear(),t.getMonth()-3,1));
  const dow=(t.getDay()+6)%7, week=NOW-dow;
  return [["Vandaag",NOW,NOW],["Deze week",week,NOW],["Vorige week",week-7,week-1],["Deze maand",som,NOW],["Vorige maand",somV,eomV],["Laatste 30 dagen",NOW-29,NOW],["Laatste 3 maanden",drie,NOW],["Dit jaar",jaar,NOW]];
}


// ============================================================
//  DPAC · Marketing Dashboard — kern
// ============================================================
let CAMPS=new Map(), ADS=[], ADIDX=new Map(), CD=[], AD=[], FORMS=[];
let STDATA=[], STNOW=new Map(), STPREV=new Map();   // dagsnapshots van ingestelde budgetten + aan/uit (dpac.ad_entity_status)
let MODE="cohort";          // periode (leads op leaddatum, inschrijvingen op tekendatum) · cohort · gebeurd
let GROUP="tree";            // tree (platform › campagne › adset › ad) · utm_source · placement · bron · temperature · owner · setter
let PARTY=false;             // party/vacature-campagnes meetellen in totalen
let open=new Set(), sortKey="spend", sortDir=-1, detail=null, trendBy="week", trendPlat=null, trendMetric="cpk";
const PLAT={google:["Google","#1f6fd8"],meta:["Meta (FB/IG)","#5856d6"],tiktok:["TikTok","#0e9aa7"],niet_betaald:["Niet betaald (organisch/direct)","#8f845e"],onbekend:["Onbekend","#8e8e93"]};
const PN=p=>(PLAT[p]||[p||"—"])[0], PC=p=>(PLAT[p]||[null,"#8e8e93"])[1];
const BRON={ad_id:"hard · advertentie-id",campaign_id:"hard · campagne-id",adset_id:"hard · adset-id",utm:"hard · UTM",afgeleid:"afgeleid (PMax-looptijd)",ghl_klik:"zacht · GHL klik-attributie",niet_betaald:"niet betaald",onbekend:"onbekend"};
const OMZET=()=>+(DEFS.omzet_per_student||6800), MAXCPK=()=>+(DEFS.max_kosten_per_klant||1700);
const ck=(p,c)=>p+"|"+(c||"");
const eur0=v=>v==null?"—":"€ "+Math.round(v).toLocaleString("nl-NL");
const eur2=v=>v==null?"—":"€ "+v.toLocaleString("nl-NL",{minimumFractionDigits:0,maximumFractionDigits:0});
const r1=v=>(Math.round(v*10)/10+"").replace(".",",");

function setRange(a,b){ A=a; B=b; detail=null; render(); }
function initApp(){
  DEFS=D.definitions||{};
  CAMPS=new Map(); for(const r of D.campaigns||[]){ const [p,id,name,type,status,party,first,last,spend]=r; CAMPS.set(ck(p,id),{platform:p,id,name:name||"(naamloos)",type,status,party:!!party,first:dOf(first),last:dOf(last),spendTotal:+spend||0}); }
  ADS=(D.ads||[]).map((r,i)=>({i,platform:r[0],cid:r[1],adsetId:r[2],adsetName:r[3],adId:r[4],adName:r[5],first:dOf(r[6]),last:dOf(r[7]),spendTotal:+r[8]||0}));
  ADIDX=new Map(); for(const a of ADS){ ADIDX.set([a.platform,a.cid,a.adsetId||"",a.adId||""].join("|"),a); }
  const _nrm=st=>(st||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const ADNORM=new Map(); for(const a of ADS){ const nn=_nrm(a.adName); if(nn&&nn.length>=6){ const kk=a.platform+"|"+nn; if(!ADNORM.has(kk)) ADNORM.set(kk,a); } }
  CD=(D.campaign_days||[]).map(r=>({d:dOf(r[0]),platform:r[1],cid:r[2],spend:+r[3]||0,clicks:+r[4]||0,imps:+r[5]||0,isr:r[6]==null?null:+r[6],conv:r[7]==null?null:+r[7],pl:r[8]==null?null:+r[8]}));
  AD=(D.ad_days||[]).map(r=>({d:dOf(r[0]),ad:ADS[r[1]],spend:+r[2]||0,clicks:+r[3]||0,imps:+r[4]||0})).filter(x=>x.ad);
  L=objs(D.lead_cols,D.leads);
  for(const l of L){ l.nm=cap(l.name); l.cd=dOf(l.created_on); l.pd=dOf(l.planned_on); l.id_=dOf(l.intake_on); l.sd=dOf(l.signed_on); l.asd=dOf(l.asm_on);
    l.is_show=!!l.is_show; l.is_noshow=!!l.is_noshow; l.is_signed=!!l.is_signed; l.hard=!!l.hard; l.asm=!!l.asm; l.lost=l.status==="lost";
    l.platform=l.platform||"onbekend"; l.ckey=ck(l.platform,l.campaign_id); l.camp=CAMPS.get(l.ckey)||null; l.party=!!(l.camp&&l.camp.party);
    l.adObj=l.ad_id? (ADIDX.get([l.platform,l.campaign_id,l.adset_id||"",l.ad_id].join("|"))||ADS.find(a=>a.platform===l.platform&&a.adId===l.ad_id)||null) : null;
    if(!l.adObj&&l.utm_content){ const nc=_nrm(l.utm_content); if(nc.length>=6){ let hit=ADNORM.get(l.platform+"|"+nc)||null;
      if(!hit){ let cnt=0; for(const [kk,a] of ADNORM){ if(!kk.startsWith(l.platform+"|")) continue; const nn=kk.slice(l.platform.length+1); if(nn.startsWith(nc)||nc.startsWith(nn)){ cnt++; hit=a; if(cnt>1){ hit=null; break; } } } }
      if(hit&&l.camp&&hit.cid!==l.campaign_id) hit=null;   // nooit een ad uit een ándere campagne plakken
      if(hit){ l.adObj=hit; if(!l.camp&&hit.cid){ l.campaign_id=hit.cid; l.ckey=ck(l.platform,hit.cid); l.camp=CAMPS.get(l.ckey)||null; l.party=!!(l.camp&&l.camp.party); if(l.bron==="onbekend") l.bron="utm"; } } } }
    if((l.utm_content||"").toLowerCase()==="link_in_bio"){ l.bioLink=true; if(!l.session_source) l.session_source="Instagram bio-link"; }   // blijft bij Meta (ze zagen onze video's), maar duidelijk gelabeld
    l.value=+(l.contract_value||OMZET()); }
  FORMS=(D.forms||[]).map(f=>({...f,d:dOf(f.on)}));
  const _n=new Date(); TODAY=s2d(new Date(_n.getFullYear(),_n.getMonth(),_n.getDate())); NOW=TODAY;
  const g=new Date(D.gen);
  document.getElementById("gen").textContent=isNaN(g)?"—":(g.getDate()+" "+MND[g.getMonth()]+" "+String(g.getHours()).padStart(2,"0")+":"+String(g.getMinutes()).padStart(2,"0"));
  const tx=document.getElementById("rtxt"); if(tx&&!tx.textContent) tx.textContent=L.length+" leads · "+CAMPS.size+" campagnes · spend t/m "+(D.counts&&D.counts.spend_last?fmt(dOf(D.counts.spend_last)):"—");
  STDATA=(D.entity_status||[]).map(r=>({d:dOf(r[0]),key:r[1]+"|"+r[2]+"|"+(r[3]||""),platform:r[1],cid:r[2],sid:r[3]||"",level:r[4],status:r[5],budget:r[6]==null?null:+r[6],name:r[7]}));
  STNOW=new Map(); STPREV=new Map();
  for(const r of STDATA){ const a2=STNOW.get(r.key); if(!a2||r.d>a2.d) STNOW.set(r.key,r); if(r.d<=NOW-7){ const b2=STPREV.get(r.key); if(!b2||r.d>b2.d) STPREV.set(r.key,r); } }
  A=NOW-29; B=NOW; memoReset();
  render();
}
// huidige/vorige ingestelde stand + wanneer die voor het laatst wijzigde
const stKey=ad=>ad.platform+"|"+ad.cid+"|"+(ad.sid==null?"":ad.sid);
const stNowOf=ad=>STNOW.get(stKey(ad))||null;
const stPrevOf=ad=>STPREV.get(stKey(ad))||null;
const stUit=ad=>{ const c=STNOW.get(ad.platform+"|"+ad.cid+"|"); const u=ad.sid!=null?STNOW.get(stKey(ad)):null; return !!((c&&c.status==="uit")||(u&&u.status==="uit")); };
function stChange(ad){ const k=stKey(ad); const rs=STDATA.filter(r=>r.key===k).sort((x,y)=>x.d-y.d); let ch=null;
  for(let i=1;i<rs.length;i++){ if(rs[i].status!==rs[i-1].status||(rs[i].budget||0)!==(rs[i-1].budget||0)) ch={d:rs[i].d,van:rs[i-1],naar:rs[i]}; }
  return ch; }

// ---- cijfers per set leads + spendfilter ----
function spendIn(a,b,f){ let s=0,c=0,i=0; for(const r of CD){ if(r.d>=a&&r.d<=b&&f(r)){ s+=r.spend; c+=r.clicks; i+=r.imps; } } return {spend:s,clicks:c,imps:i}; }
function spendAds(a,b,f){ let s=0,c=0,i=0; for(const r of AD){ if(r.d>=a&&r.d<=b&&f(r.ad)){ s+=r.spend; c+=r.clicks; i+=r.imps; } } return {spend:s,clicks:c,imps:i}; }
function isr(a,b,cid){ const rows=CD.filter(r=>r.d>=a&&r.d<=b&&r.cid===cid&&r.isr!=null&&r.imps>0); if(!rows.length) return null; const w=rows.reduce((s,r)=>s+r.imps,0); return rows.reduce((s,r)=>s+r.isr*r.imps,0)/w; }
// leadsets volgens telmodus
function sets(leads,a,b){
  const inP=v=>v>=0&&v>=a&&v<=b;
  if(MODE==="gebeurd"){
    const nieuw=leads.filter(l=>inP(l.cd)), gepland=leads.filter(l=>inP(l.pd)), intakes=leads.filter(l=>inP(l.id_)&&l.id_<=TODAY), shows=intakes.filter(l=>l.is_show), sign=leads.filter(l=>l.is_signed&&inP(l.sd));
    return {nieuw,gepland,intakes,shows,sign};
  }
  const co=leads.filter(l=>inP(l.cd));
  const gepland=co.filter(l=>l.pd>=0), intakes=co.filter(l=>l.id_>=0&&l.id_<=TODAY), shows=co.filter(l=>l.is_show);
  const sign = MODE==="cohort" ? co.filter(l=>l.is_signed) : leads.filter(l=>l.is_signed&&inP(l.sd));
  return {nieuw:co,gepland,intakes,shows,sign};
}
function metrics(leads,sp,a,b){
  const S=sets(leads,a,b); const n=S.nieuw.length, g=S.gepland.length, i=S.intakes.length, sh=S.shows.length, sg=S.sign.length;
  const omzet=S.sign.reduce((s,l)=>s+l.value,0);
  return {S,n,g,i,sh,sg,spend:sp.spend,clicks:sp.clicks,imps:sp.imps,omzet,
    cpl: n&&sp.spend? sp.spend/n:null, cpk: sg&&sp.spend? sp.spend/sg:null, pctOmzet: sg&&sp.spend? sp.spend/sg/OMZET()*100:null,
    plan: n?pct(g,n):null, show: i?pct(sh,i):null, sign: sh?pct(sg,sh):null, l2k: n?pct(sg,n):null, roas: sp.spend? omzet/sp.spend:null,
    hard: n? pct(leads.filter(l=>S.nieuw.includes(l)&&l.hard).length,n):null };
}

// ---- boom: platform › campagne › adset › advertentie ----
function buildTree(a,b){
  const nodes=[];
  const plats=["meta","google","tiktok","niet_betaald","onbekend"];
  for(const p of plats){
    const pl=L.filter(l=>l.platform===p&&(PARTY||!l.party));
    const sp=spendIn(a,b,r=>r.platform===p&&(PARTY||!(CAMPS.get(ck(p,r.cid))||{}).party));
    const node={key:"p:"+p,level:0,label:PN(p),color:PC(p),platform:p,leads:pl,sp,children:[]};
    // Meta: plaatsing-splitsing (Facebook / Instagram) bovenaan — kosten kent Meta alleen per campagne
    if(p==="meta"&&pl.length){
      for(const [pk,plab,pc] of [["meta_ig","📸 via Instagram","#d62976"],["meta_fb","📘 via Facebook","#1877f2"],["meta_x","❔ plaatsing onbekend","#8e8e93"]]){
        const ls=pl.filter(l=>sgKey(l)===pk); if(!ls.length) continue;
        const byC=new Map(); ls.forEach(l=>{ const kk2=l.ckey; if(!byC.has(kk2)) byC.set(kk2,[]); byC.get(kk2).push(l); });
        const kids=[...byC.entries()].map(([kk2,ls2])=>{ const c2=CAMPS.get(kk2); return {key:"plc:"+pk+"|"+kk2,level:2,label:c2?c2.name:"(campagne onbekend)",platform:p,leads:ls2,sp:{spend:0,clicks:0,imps:0},children:[],leaf:true,plc:true}; });
        node.children.push({key:"plc:"+pk,level:1,label:plab,sub:"plaatsing van de lead · klik open voor de campagnes",color:pc,platform:p,leads:ls,sp:{spend:0,clicks:0,imps:0},children:kids,plc:true,pin:true});
      }
    }
    // campagnes: uit leads én uit spend
    const ckeys=new Set(); pl.forEach(l=>ckeys.add(l.ckey)); CD.forEach(r=>{ if(r.platform===p&&r.d>=a&&r.d<=b&&r.spend>0) ckeys.add(ck(p,r.cid)); });
    for(const k of ckeys){ const c=CAMPS.get(k); const cid=k.split("|")[1]; if(c&&c.party&&!PARTY) continue;
      const cl=pl.filter(l=>l.ckey===k); const csp=spendIn(a,b,r=>r.platform===p&&(r.cid||"")===cid);
      if(!cl.length&&csp.spend<0.5) continue;
      const cn={key:"c:"+k,level:1,label:c?c.name:(cid?("(campagne "+cid+")"):"(geen campagne toegekend)"),sub:c?(c.type||"")+(c.party?" · party":""):"",platform:p,cid,camp:c,leads:cl,sp:csp,children:[],noCamp:!cid};
      if(!cid){ // onderverdeling op bron
        const bs=new Map(); cl.forEach(l=>{ const kk=l.bron||"onbekend"; if(!bs.has(kk)) bs.set(kk,[]); bs.get(kk).push(l); });
        for(const [bk,bl] of bs) cn.children.push({key:"b:"+k+"|"+bk,level:2,label:BRON[bk]||bk,platform:p,leads:bl,sp:{spend:0,clicks:0,imps:0},children:[],leaf:true});
      } else {
        // adsets
        const akeys=new Set(); cl.forEach(l=>{ if(l.adObj) akeys.add(l.adObj.adsetId||""); }); ADS.forEach(x=>{ if(x.platform===p&&x.cid===cid) akeys.add(x.adsetId||""); });
        for(const ak of akeys){ const adsIn=ADS.filter(x=>x.platform===p&&x.cid===cid&&(x.adsetId||"")===ak); if(!adsIn.length) continue;
          const al=cl.filter(l=>l.adObj&&(l.adObj.adsetId||"")===ak); const asp=spendAds(a,b,x=>x.platform===p&&x.cid===cid&&(x.adsetId||"")===ak);
          if(!al.length&&asp.spend<0.5) continue;
          const an={key:"s:"+k+"|"+ak,level:2,label:adsIn[0].adsetName||(ak?("adset "+ak):"(zonder adset)"),platform:p,cid,sid:ak,leads:al,sp:asp,children:[]};
          for(const x of adsIn){ const xl=cl.filter(l=>l.adObj===x); const xsp=spendAds(a,b,y=>y===x); if(!xl.length&&xsp.spend<0.5) continue;
            an.children.push({key:"a:"+x.i,level:3,label:x.adName||(x.adId?("ad "+x.adId):"(zonder advertentie)"),platform:p,cid,leads:xl,sp:xsp,children:[],leaf:true,ad:x}); }
          cn.children.push(an); }
        const rest=cl.filter(l=>!l.adObj); if(rest.length) cn.children.push({key:"r:"+k,level:2,label:"(campagne bekend, advertentie niet)",platform:p,cid,leads:rest,sp:{spend:0,clicks:0,imps:0},children:[],leaf:true});
      }
      node.children.push(cn); }
    if(node.leads.length||node.sp.spend>0) nodes.push(node);
  }
  return nodes;
}
function groupFlat(a,b){
  const kf={utm_source:l=>l.utm_source||"(leeg)", placement:l=>l.placement||(l.platform==="meta"?"Meta (onbekende plaatsing)":PN(l.platform)), bron:l=>BRON[l.bron]||l.bron, temperature:l=>l.temperature||"(leeg)", owner:l=>l.owner||"(geen eigenaar)", setter:l=>l.setter||"(geen setter)", session:l=>l.session_source||"(leeg)"}[GROUP];
  const g=new Map(); for(const l of L){ if(!PARTY&&l.party) continue; const k=kf(l); if(!g.has(k)) g.set(k,[]); g.get(k).push(l); }
  return [...g.entries()].map(([k,ls])=>({key:"g:"+k,level:0,label:k,leads:ls,sp:{spend:0,clicks:0,imps:0},children:[],leaf:true}));
}
function decorate(n,a,b){ n.m=metrics(n.leads,n.sp,a,b); n.children.forEach(c=>decorate(c,a,b)); }
const SORTS={spend:n=>n.m.spend,n:n=>n.m.n,cpl:n=>n.m.cpl,g:n=>n.m.g,plan:n=>n.m.plan,i:n=>n.m.i,sh:n=>n.m.sh,show:n=>n.m.show,sg:n=>n.m.sg,sign:n=>n.m.sign,l2k:n=>n.m.l2k,cpk:n=>n.m.cpk,omzet:n=>n.m.omzet,hard:n=>n.m.hard};
function sortNodes(ns,top){ const f=SORTS[sortKey]||SORTS.spend; if(!(top&&GROUP==="tree")) ns.sort((x,y)=>{ const a=f(x),b=f(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a-b)*sortDir; }); ns.sort((x,y)=>(y.pin?1:0)-(x.pin?1:0)); ns.forEach(n=>sortNodes(n.children,false)); }

// ---- KPI's ----
function drawKpis(){
  const k=document.getElementById("kpis");
  const all=L.filter(l=>PARTY||!l.party); const sp=spendIn(A,B,r=>PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party);
  const m=metrics(all,sp,A,B);
  const len=B-A+1, pA=A-len, pB=A-1; const pm=metrics(all,spendIn(pA,pB,r=>PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party),pA,pB);
  const party=spendIn(A,B,r=>(CAMPS.get(ck(r.platform,r.cid))||{}).party);
  const asm=L.filter(l=>l.asm&&l.asd>=A&&l.asd<=B).length;
  const dlt=(v,p,fmtF,lowGood)=>{ if(v==null||p==null) return ""; const d=v-p; const cls= d===0?"eq":((d>0)!==!!lowGood?"up":"dn"); return `<i class="dlt ${cls}" title="vorige periode (${fmtY(pA)} t/m ${fmtY(pB)}): ${fmtF(p)}">${d>0?"▲ ":d<0?"▼ ":"= "}${fmtF(Math.abs(d))}</i>`; };
  const PAID=p=>p==="meta"||p==="google"||p==="tiktok";
  const paidSg=m.S.sign.filter(l=>PAID(l.platform)).length, paidSgP=pm.S.sign.filter(l=>PAID(l.platform)).length;
  const cpkPaid=paidSg&&m.spend?m.spend/paidSg:null, cpkPaidP=paidSgP&&pm.spend?pm.spend/paidSgP:null;
  const cpkCls=cpkPaid==null?"":(cpkPaid<=MAXCPK()*0.85?"good":cpkPaid>MAXCPK()*1.25?"bad":"warn");
  const items=[
    [eur0(m.spend),"Advertentiekosten",`excl. party/vacature (${eur0(party.spend)})`,dlt(m.spend,pm.spend,eur0,true)],
    [m.n,"Leads binnengekomen","klik voor de namen, herkomst en gewonnen/verloren",dlt(m.n,pm.n,v=>v),"","nieuw"],
    [m.cpl==null?"—":eur0(m.cpl),"Kosten per lead",null,dlt(m.cpl,pm.cpl,eur0,true)],
    [m.g,"Intake gepland",m.plan!=null?`${r1(m.plan)}% van de leads · klik voor de namen`:null,dlt(m.g,pm.g,v=>v),"","gepland"],
    [m.sh,"Shows",m.show!=null?`${r1(m.show)}% van de intakes · klik voor de namen`:null,dlt(m.sh,pm.sh,v=>v),"","shows"],
    [m.sg,"Inschrijvingen",(MODE==="cohort"?"uit dit cohort":"op tekendatum in periode")+" · klik voor de namen",dlt(m.sg,pm.sg,v=>v),"","sign"],
    [cpkPaid==null?"—":eur0(cpkPaid),"Kosten per klant (betaald)",`${paidSg} betaalde klant${paidSg===1?"":"en"} · blended ${m.cpk==null?"—":eur0(m.cpk)} (alle ${m.sg}) · plafond ${eur0(MAXCPK())}`,dlt(cpkPaid,cpkPaidP,eur0,true),cpkCls],
    [m.pctOmzet==null?"—":r1(m.pctOmzet)+"%","% van omzet per student",m.roas!=null?`ROAS ${r1(m.roas)}×`:null,""],
    [eur0(m.omzet),"Omzet uit inschrijvingen",asm?`+ ${asm} All Star-upsell${asm===1?"":"s"}`:null,dlt(m.omzet,pm.omzet,eur0)],
  ];
  k.innerHTML=items.map(x=>`<div class="kpi ${x[4]||""}${x[5]?" kclk":""}" ${x[5]?`onclick="kpiPick('${x[5]}')"`:""} ${x[2]?`title="${esc(x[2])}"`:""}><b>${x[0]}</b><span>${x[1]}</span>${x[2]?`<small>${esc(x[2])}</small>`:""}${x[3]||""}</div>`).join("");
}
function kpiPick(set){ tab="tree"; detail={key:"__ALL__",set}; dFilt={}; dOut=null; dfAll={}; dShowAll=false; render(); setTimeout(()=>{ const e=document.getElementById("detail"); if(e) e.scrollIntoView({behavior:"smooth",block:"start"}); },80); }

// ---- tabs ----
function drawTabs(){
  const el=document.getElementById("tabs"); el.innerHTML="";
  [["tree","🌳 Kanalen & ads"],["best","🏆 Beste ads"],["trend","📈 Trend"],["adv","⚡ Advies"],["fol","✔️ Opgevolgd"],["sign","🎯 Resultaten"],["data","🧪 Datakwaliteit"]].forEach(([id,lab])=>{ const t=document.createElement("div"); t.className="tab"+(tab===id?" on":""); t.textContent=lab; t.onclick=()=>{tab=id;detail=null;render();}; el.appendChild(t); });
  const mb=document.getElementById("modebar"); mb.innerHTML="";   // één telling: cohort — leads (en alles wat eruit voortkomt) tellen bij de periode waarin de lead binnenkwam
}

// ---- boomtabel ----
const COLS=[
  {k:"spend",t:"Kosten",f:m=>eur0(m.spend),w:"num"},
  {k:"n",t:"Leads",f:m=>m.n,w:"num",click:"nieuw"},
  {k:"cpl",t:"CPL",f:m=>m.cpl==null?"—":eur0(m.cpl),w:"num"},
  {k:"g",t:"Intake gepland",f:m=>m.g,w:"num",click:"gepland"},
  {k:"plan",t:"Plan %",f:m=>m.plan==null?"—":r1(m.plan)+"%",w:"pct"},
  {k:"sh",t:"Shows",f:m=>m.sh,w:"num",click:"shows"},
  {k:"show",t:"Show %",f:m=>m.show==null?"—":r1(m.show)+"%",w:"pct",sub:m=>m.i?`${m.sh}/${m.i}`:""},
  {k:"sg",t:"Ingeschr.",f:m=>m.sg,w:"num",click:"sign"},
  {k:"sign",t:"Sign %",f:m=>m.sign==null?"—":r1(m.sign)+"%",w:"pct"},
  {k:"cpk",t:"Kosten / klant",f:m=>m.cpk!=null?eur0(m.cpk):(m.sg===0&&m.spend>=100?eur0(m.spend):"—"),w:"num",cls:m=>m.cpk!=null?(m.cpk<=MAXCPK()*0.85?"good":m.cpk>MAXCPK()*1.25?"bad":"warn"):(m.sg===0&&m.spend>=400?"bad":m.sg===0&&m.spend>=100?"warn":""),sub:m=>m.cpk==null&&m.sg===0&&m.spend>=100?"uitgegeven, 0 klanten":"",tip:"kosten ÷ inschrijvingen · een rood/oranje bedrag = al uitgegeven zonder één klant (rood vanaf € 400)"},
  {k:"hard",t:"Hard bewijs",f:m=>m.hard==null?"—":r1(m.hard)+"%",w:"pct",tip:"aandeel leads met harde attributie (UTM / ad-id / campagne-id)"},
];
function toggleNode(k){ open.has(k)?open.delete(k):open.add(k); drawTree(); }
// let op: functies, geen kale `open=` in onclick — dat raakt document.open i.p.v. onze variabele
function treeOpenAll(){ const keys=[]; const walk=n=>{ if(n.children&&n.children.length){ keys.push(n.key); n.children.forEach(walk); } }; TREE.forEach(walk); open=new Set(keys); drawTree(); }
function treeCloseAll(){ open=new Set(); drawTree(); }
function setSort(k){ if(sortKey===k) sortDir=-sortDir; else { sortKey=k; sortDir=-1; } drawTree(); }
function rowHtml(n,depth){
  const m=n.m; const has=n.children&&n.children.length; const isOpen=open.has(n.key);
  const pad=10+depth*22;
  let h=`<tr class="lv${n.level}${isOpen?" open":""}${n.camp&&n.camp.party?" party":""}${has?" has":""}"${has?` onclick="toggleNode(${jq(n.key)})" title="${isOpen?"klik om in te klappen":"klik om uit te klappen"}"`:""}><td class="nm" style="padding-left:${pad}px">${has?`<span class="tg"><i class="chev${isOpen?" open":""}"></i></span>`:`<span class="tg leaf"></span>`}${n.color?`<span class="dot" style="background:${n.color}"></span>`:""}<span class="lab" title="${esc(n.label)}">${esc(n.label)}</span>${n.sub?`<small>${esc(n.sub)}</small>`:""}${n.key.startsWith("c:")&&n.cid?`<small class="isr" title="zoekvertoningsaandeel (Google)">${(()=>{const v=isr(A,B,n.cid);return v==null?"":"ISR "+Math.round(v*100)+"%";})()}</small>`:""}</td>`;
  for(const c of COLS){
    if(n.plc&&(c.k==="spend"||c.k==="cpl"||c.k==="cpk")){ h+=`<td class="${c.w}" title="Meta rapporteert kosten per campagne, niet per plaatsing — kosten staan bij de campagnes hieronder">—</td>`; continue; }
    const v=c.f(m); const cl=c.cls?c.cls(m):""; const clk=c.click&&(+v>0)?` class="clk ${c.w} ${cl}" onclick="event.stopPropagation();showDetail(${jq(n.key)},'${c.click}')" title="klik voor de namen"`:` class="${c.w} ${cl}"`;
    h+=`<td${clk}><b>${v}</b>${c.sub?`<small>${c.sub(m)}</small>`:""}</td>`; }
  h+=`</tr>`;
  if(has&&isOpen) for(const c of n.children) h+=rowHtml(c,depth+1);
  return h;
}
let TREE=[], treePlat=null, treeAutoOpen=false;
function treePick(p){ treePlat=p; detail=null; treeAutoOpen=!!p; drawTree(); }
function nbKind(l){ const ss=(l.session_source||"").toLowerCase(); return ss.indexOf("direct")>=0?"nb_dir":"nb_org"; }
function buildTreeFiltered(a,b){
  const base=buildTree(a,b);
  if(!treePlat) return base;
  if(["meta","google","tiktok","onbekend","niet_betaald"].indexOf(treePlat)>=0) return base.filter(n=>n.platform===treePlat);
  if(treePlat==="meta_fb"||treePlat==="meta_ig"){
    const pl=L.filter(l=>l.platform==="meta"&&!l.party&&sgKey(l)===treePlat);
    const byC=new Map(); pl.forEach(l=>{ const k=l.ckey; if(!byC.has(k)) byC.set(k,[]); byC.get(k).push(l); });
    const kids=[...byC.entries()].map(([k,ls])=>{ const c=CAMPS.get(k); return {key:"pf:"+treePlat+"|"+k,level:1,label:c?c.name:"(campagne onbekend)",platform:"meta",leads:ls,sp:{spend:0,clicks:0,imps:0},children:[],leaf:true,plc:true}; });
    return [{key:"p:"+treePlat,level:0,label:treePlat==="meta_fb"?"📘 Facebook (plaatsing van de lead)":"📸 Instagram (plaatsing van de lead)",color:treePlat==="meta_fb"?"#1877f2":"#d62976",platform:"meta",leads:pl,sp:{spend:0,clicks:0,imps:0},children:kids,plc:true}];
  }
  if(treePlat==="nb_org"||treePlat==="nb_dir"){
    const pl=L.filter(l=>l.platform==="niet_betaald"&&!l.party&&nbKind(l)===treePlat);
    const byS=new Map(); pl.forEach(l=>{ const k=l.session_source||"(onbekende bron)"; if(!byS.has(k)) byS.set(k,[]); byS.get(k).push(l); });
    const kids=[...byS.entries()].map(([k,ls])=>({key:"nb:"+treePlat+"|"+k,level:1,label:k,platform:"niet_betaald",leads:ls,sp:{spend:0,clicks:0,imps:0},children:[],leaf:true,plc:true}));
    return [{key:"p:"+treePlat,level:0,label:treePlat==="nb_org"?"🌱 Organisch (niet betaald)":"↩️ Direct (niet betaald)",color:"#8f845e",platform:"niet_betaald",leads:pl,sp:{spend:0,clicks:0,imps:0},children:kids,plc:true}];
  }
  return base;
}
function keepScroll(w,fn){ const sy=window.scrollY; const els=[...w.querySelectorAll("*")].filter(e=>e.scrollLeft>0).slice(0,4).map(e=>[e.className,e.scrollLeft]); fn(); window.scrollTo(0,sy);
  for(const [cls,sl] of els){ const e=[...w.querySelectorAll("*")].find(x=>x.className===cls&&x.scrollWidth>x.clientWidth); if(e) e.scrollLeft=sl; } }
function drawTree(){ const _w=document.getElementById("treewrap"); keepScroll(_w,()=>drawTreeInner()); }
function drawTreeInner(){
  const w=document.getElementById("treewrap");
  TREE = GROUP==="tree"? buildTreeFiltered(A,B) : groupFlat(A,B);
  TREE.forEach(n=>decorate(n,A,B)); sortNodes(TREE,true);
  if(treePlat&&treeAutoOpen){ TREE.forEach(n=>open.add(n.key)); treeAutoOpen=false; }
  const PB=[[null,"Alles",null],["meta","Meta (FB/IG)",PC("meta")],["meta_fb","📘 Facebook",null],["meta_ig","📸 Instagram",null],["google","Google",PC("google")],["tiktok","TikTok",PC("tiktok")],["niet_betaald","Niet betaald",PC("niet_betaald")],["nb_org","🌱 Organisch",null],["nb_dir","↩️ Direct",null],["onbekend","Onbekend",PC("onbekend")]];
  let h=`<div class="wonchips pbig">`+PB.map(([k,lab,col])=>`<div class="wchip${treePlat===k?" on":""}" onclick="treePick(${k?jq(k):"null"})">${col?`<span class="dot" style="background:${col}"></span>`:""}${lab}</div>`).join("")+`</div>`;
  h+=`<div class="wonchips"><div class="wchip sm" onclick="treeOpenAll()">alles open</div><div class="wchip sm" onclick="treeCloseAll()">alles dicht</div>${treePlat?`<span class="lbl">Facebook/Instagram en Organisch/Direct tonen alleen lead-aantallen — kosten kent Meta alleen per campagne.</span>`:""}</div>`;
  h+=`<div class="cmp treecard"><table class="tree"><tr><th class="nm">${GROUP==="tree"?"Platform › campagne › adset › advertentie":"Groep"} <small>klik op een rij om uit te klappen · klik op een getal voor de namen</small></th>`+COLS.map(c=>`<th class="${c.w}${sortKey===c.k?" on":""}" onclick="setSort('${c.k}')" ${c.tip?`title="${esc(c.tip)}"`:""}>${c.t} <span class="arr">${sortKey===c.k?(sortDir>0?"▲":"▼"):""}</span></th>`).join("")+`</tr>`;
  // totaalrij
  const all=L.filter(l=>PARTY||!l.party); const tm=metrics(all,spendIn(A,B,r=>PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party),A,B);
  h+=`<tr class="tot"><td class="nm" style="padding-left:10px"><b>Totaal</b></td>`+COLS.map(c=>`<td class="${c.w}">${c.f(tm)}</td>`).join("")+`</tr>`;
  for(const n of TREE) h+=rowHtml(n,0);
  h+=`</table></div>`;
  h+=`<p class="note"><b>${MODE==="periode"?"Periode":MODE==="cohort"?"Cohort":"Gebeurd"}</b>: ${MODE==="periode"?"leads, intakes en shows tellen op <b>leaddatum</b> (binnengekomen in de periode); inschrijvingen op <b>tekendatum</b> (formulier) in de periode — zo zie je meteen wat een campagne oplevert zonder 3 maanden te wachten. Kosten per klant = kosten in de periode ÷ inschrijvingen in de periode.":MODE==="cohort"?"alles over de leads die in de periode binnenkwamen, ook als ze later tekenden. Eerlijkst voor oude periodes (≥ 30 dagen oud).":"alles op de eigen datum: leads op binnenkomst, gepland op inplandatum, intakes/shows op intakedatum, inschrijvingen op tekendatum."} Percentages: Plan % = intake gepland ÷ leads · Show % = shows ÷ intakes die al geweest zijn · Sign % = ingeschreven ÷ shows · Lead → klant = ingeschreven ÷ leads. Kosten = advertentieplatforms (Windsor), party/vacature apart (${PARTY?"nu meegeteld":"niet meegeteld"}). <b>Hard bewijs</b> = leads met UTM / ad-id / campagne-id; de rest is via GHL-klikattributie (zacht) of afgeleid. Bron = UTM custom fields op de opportunity + GHL first/last touch.</p>`;
  w.innerHTML=h;
}
function findNode(key,ns){ for(const n of ns){ if(n.key===key) return n; const f=findNode(key,n.children); if(f) return f; } return null; }

// ---- beste ads ----
let bestSort={k:"score",d:-1}, bestAll=false, bestLvl="ad", bestOpen=new Set(), bestCamps=new Set(), bestfOpen=false;
function bestCampTog(v){ bestCamps.has(v)?bestCamps.delete(v):bestCamps.add(v); drawBest(); }
function bestTog(k){ bestOpen.has(k)?bestOpen.delete(k):bestOpen.add(k); drawBest(); }
// Prestatiescore 0–100: (1) kosten per klant t.o.v. het plafond — laag = veel punten (max 60);
// (2) zekerheid: hoe meer klanten, hoe betrouwbaarder (max 20); (3) funnel-rendement: intakes
// gepland + shows per € 100 (max 20). Weinig kosten én weinig leads → "te weinig data" (geen score).
function perfScore(m){
  if(m.spend<100&&m.n<3) return null;
  const MX=MAXCPK(); let s=0;
  if(m.sg>0&&m.cpk!=null){ const r=m.cpk/MX; s+=60*Math.max(0,Math.min(1,1.5-r)); s+= m.sg>=3?20:m.sg===2?14:8; }
  if(m.spend>0){ s+=Math.min(10,(m.g/(m.spend/100))*2.5); s+=Math.min(10,(m.sh/(m.spend/100))*5); }
  else if(m.n>0) s+=10;
  return Math.round(Math.min(100,s));
}
function adAdvice(m){ const MX=MAXCPK();
  if(m.spend<100&&m.n<3) return ["🤷 Te weinig data","Nog te weinig kosten/leads om iets zinnigs te adviseren."];
  if(m.cpk!=null&&m.cpk<MX*0.85&&(m.sg>=2||m.spend>=800)) return ["🚀 Opschalen",`Kosten per klant ${eur0(m.cpk)} zit ruim onder het plafond van ${eur0(MX)} — budget ×1,35 is verantwoord.`];
  if(m.sg===0&&m.sh===0&&m.spend>400) return ["⛔️ Stoppen",`${eur0(m.spend)} uitgegeven zonder één show of klant.`];
  if(m.sg===0&&m.sh>0&&m.spend>400) return ["½ Halveren",`Wel ${m.sh} show${m.sh===1?"":"s"} maar nog geen klant — halveer tot de eerste klant binnen is.`];
  if(m.cpk!=null&&m.cpk>MX*1.25) return ["🔻 Terugschroeven",`Kosten per klant ${eur0(m.cpk)} zit boven 125% van het plafond.`];
  return ["✅ Zo laten",`Binnen de marges${m.cpk!=null?` (kosten per klant ${eur0(m.cpk)})`:""} — geen ingreep nodig.`];
}
function scoreCell(sc){ if(sc==null) return `<span class="scorep s0" title="minder dan € 100 kosten en minder dan 3 leads — te weinig om eerlijk te beoordelen">te weinig data</span>`;
  const cl=sc>=70?"s4":sc>=45?"s3":sc>=25?"s2":"s1", lab=sc>=70?"top":sc>=45?"goed":sc>=25?"matig":"slecht";
  return `<span class="scorep ${cl}">${sc} · ${lab}</span>`; }
let bestPlat=null;
function drawBest(){ keepScroll(document.getElementById("bestwrap"),drawBestInner); }
function drawBestInner(){
  const w=document.getElementById("bestwrap");
  let rows=[];
  if(bestLvl==="ad"){
    for(const x of ADS){ if(x.platform==="onbekend"||x.platform==="niet_betaald") continue; const c=CAMPS.get(ck(x.platform,x.cid)); if(c&&c.party&&!PARTY) continue;
      const ls=L.filter(l=>l.adObj===x&&(PARTY||!l.party)); const sp=spendAds(A,B,y=>y===x); const m=metrics(ls,sp,A,B);
      if(m.n<1&&m.spend<0.5) continue; rows.push({label:x.adName||("ad "+(x.adId||"?")),camp:(c?c.name:(x.cid||"—"))+(x.adsetName?" › "+x.adsetName:""),campName:c?c.name:(x.cid||"—"),adsetName:x.adsetName||"",platform:x.platform,m,score:perfScore(m)}); }
  } else if(bestLvl==="adset"){
    const seen=new Map();
    for(const x of ADS){ if(x.platform==="onbekend"||x.platform==="niet_betaald") continue; const c=CAMPS.get(ck(x.platform,x.cid)); if(c&&c.party&&!PARTY) continue;
      const key=x.platform+"|"+x.cid+"|"+(x.adsetId||"");
      if(!seen.has(key)) seen.set(key,{label:x.adsetName||(x.adsetId?"adset "+x.adsetId:"(zonder adgroep)"),camp:c?c.name:(x.cid||"—"),platform:x.platform,ads:[]});
      seen.get(key).ads.push(x); }
    for(const g of seen.values()){ const set=new Set(g.ads);
      const ls=L.filter(l=>l.adObj&&set.has(l.adObj)&&(PARTY||!l.party)); const sp=spendAds(A,B,y=>set.has(y)); const m=metrics(ls,sp,A,B);
      if(m.n<1&&m.spend<0.5) continue; rows.push({label:g.label,camp:g.camp,campName:g.camp,adsetName:g.label,platform:g.platform,m,score:perfScore(m)}); }
  } else {
    for(const [k,c] of CAMPS){ if(c.party&&!PARTY) continue;
      const ls=L.filter(l=>l.ckey===k&&(PARTY||!l.party)); const sp=spendIn(A,B,r=>r.platform===c.platform&&(r.cid||"")===(c.id||"")); const m=metrics(ls,sp,A,B);
      if(m.n<1&&m.spend<0.5) continue; rows.push({label:c.name,camp:"",campName:c.name,adsetName:"",platform:c.platform,m,score:perfScore(m)}); }
  }
  if(bestPlat) rows=rows.filter(r=>r.platform===bestPlat);
  const preCamp=rows;
  if(bestLvl!=="camp"&&bestCamps.size) rows=rows.filter(r=>bestCamps.has(r.campName));
  const cols=[
    {k:"label",t:bestLvl==="ad"?"Advertentie":bestLvl==="adset"?"Advertentiegroep":"Campagne",v:r=>r.label.toLowerCase(),f:r=>`<div class="adnm" title="${esc(r.label)}${r.camp?" — "+esc(r.camp):""}"><b><span class="dot" style="background:${PC(r.platform)}"></span>${esc(r.label)}</b>${r.camp?`<small>${esc(r.camp)}</small>`:""}</div>`,cls:"nmw"},
    {k:"score",t:"Prestatie",v:r=>r.score,f:r=>scoreCell(r.score),tip:"0–100: kosten per klant laag (max 60) + genoeg klanten om erop te vertrouwen (max 20) + intakes en shows per uitgegeven euro (max 20)"},
    {k:"spend",t:"Kosten",v:r=>r.m.spend,f:r=>eur0(r.m.spend)},
    {k:"n",t:"Leads",v:r=>r.m.n,f:r=>r.m.n},
    {k:"cpl",t:"CPL",v:r=>r.m.cpl,f:r=>r.m.cpl==null?"—":eur0(r.m.cpl)},
    {k:"g",t:"Intakes gepland (SQL)",v:r=>r.m.g,f:r=>r.m.g},
    {k:"sh",t:"Shows",v:r=>r.m.sh,f:r=>r.m.sh},
    {k:"sg",t:"Inschrijvingen",v:r=>r.m.sg,f:r=>`<b>${r.m.sg}</b>`},
    {k:"open",t:"Nog open",v:r=>r.m.S.nieuw.filter(l=>!l.is_signed&&!l.lost).length,f:r=>{const o=r.m.S.nieuw.filter(l=>!l.is_signed&&!l.lost).length;return o||"—";},tip:"leads uit deze periode die nog niet getekend én nog niet verloren zijn — hier kan nog wat uitkomen"},
    {k:"sign",t:"Sign %",v:r=>r.m.sign,f:r=>r.m.sign==null?"—":r1(r.m.sign)+"%"},
    {k:"cpk",t:"Kosten / klant",v:r=>r.m.cpk,f:r=>r.m.cpk==null?"—":eur0(r.m.cpk),cf:r=>r.m.cpk==null?"":(r.m.cpk<=MAXCPK()*0.85?"good":r.m.cpk>MAXCPK()*1.25?"bad":"warn")},
  ];
  const s=bestSort; const col=cols.find(c=>c.k===s.k)||cols[1];
  rows.sort((x,y)=>{ const a=col.v(x),b=col.v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*s.d; });
  const LIMN=bestAll?rows.length:40;
  let h=`<div class="wonchips"><span class="lbl">Platform:</span><div class="wchip sm${bestPlat==null?" on":""}" onclick="bestPlat=null;bestCamps=new Set();bestfOpen=false;drawBest()">Alle</div>`+["meta","google","tiktok"].map(p=>`<div class="wchip sm${bestPlat===p?" on":""}" onclick="bestPlat='${p}';bestCamps=new Set();bestfOpen=false;drawBest()"><span class="dot" style="background:${PC(p)}"></span>${PN(p)}</div>`).join("")+`</div>`;
  h+=`<div class="wonchips"><span class="lbl">Niveau:</span>`+[["camp","Campagne"],["adset","Advertentiegroep"],["ad","Advertentie"]].map(x=>`<div class="wchip sm${bestLvl===x[0]?" on":""}" onclick="bestLvl='${x[0]}';bestCamps=new Set();bestfOpen=false;drawBest()">${x[1]}</div>`).join("")+`<span style="flex:1"></span><span class="lbl">klik op een kolomkop om te sorteren</span></div>`;
  let bfPanel="";
  if(bestLvl!=="camp"&&bestfOpen){ const cnt=new Map(); preCamp.forEach(r=>cnt.set(r.campName,(cnt.get(r.campName)||0)+1));
    bfPanel=`<div class="wonchips" style="margin:0 0 8px"><span class="lbl">Filter campagne:</span><div class="wchip sm${bestCamps.size?"":" on"}" onclick="bestCamps=new Set();drawBest()">Alles <span class="n">${preCamp.length}</span></div>`
      +[...cnt.entries()].sort((a,b)=>b[1]-a[1]).map(([vv,c2])=>`<div class="wchip sm${bestCamps.has(vv)?" on":""}" onclick="bestCampTog(${jq(vv)})" title="${esc(vv)}"><span style="display:inline-block;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">${esc(vv)}</span> <span class="n">${c2}</span></div>`).join("")+`</div>`; }
  h+=bfPanel;
  h+=`<div class="wontbl"><table><tr>`+cols.map(c=>`<th ${c.tip?`title="${esc(c.tip)}"`:""}><span class="sortl" onclick="bestSort.k==='${c.k}'?bestSort.d=-bestSort.d:(bestSort={k:'${c.k}',d:-1});drawBest()">${c.t} <span class="arr">${s.k===c.k?(s.d>0?"▲":"▼"):""}</span></span>${c.k==="label"&&bestLvl!=="camp"?`<span class="fbtn${bestCamps.size?" on":""}" title="filter op campagne (met aantallen)" onclick="event.stopPropagation();bestfOpen=!bestfOpen;drawBest()">⏷</span>`:""}</th>`).join("")+`</tr>`
    + rows.slice(0,LIMN).map(r=>{ const bk=bestLvl+"|"+r.label+"|"+r.camp; const opn=bestOpen.has(bk);
      return `<tr class="clkrow${opn?" onrow":""}" onclick="bestTog(${jq(bk)})" title="klik voor de volledige opbouw">`+cols.map(c=>`<td class="${c.cls||""} ${c.cf?c.cf(r):""}">${c.f(r)}</td>`).join("")+`</tr>`
        +(opn?`<tr class="bestx"><td colspan="${cols.length}"><div class="bxg"><div><small>Platform</small><b><span class="dot" style="background:${PC(r.platform)}"></span>${esc(PN(r.platform))}</b></div><div><small>Campagne</small><b>${esc(r.campName)}</b></div>${r.adsetName?`<div><small>Advertentiegroep</small><b>${esc(r.adsetName)}</b></div>`:""}${bestLvl==="ad"?`<div><small>Advertentie</small><b>${esc(r.label)}</b></div>`:""}<div><small>Kosten</small><b>${eur0(r.m.spend)}</b></div><div><small>Leads</small><b>${r.m.n}</b></div><div><small>Inschrijvingen</small><b>${r.m.sg}</b></div>${r.m.cpk!=null?`<div><small>Kosten / klant</small><b>${eur0(r.m.cpk)}</b></div>`:""}</div>${(()=>{const [al,at]=adAdvice(r.m);return `<div class="bxadv"><small>Advies voor ${bestLvl==="ad"?"deze advertentie":bestLvl==="adset"?"deze advertentiegroep":"deze campagne"} (gekozen periode)</small><b>${al}</b> <span>${at}</span></div>`;})()}</td></tr>`:""); }).join("")
    + (rows.length?"":`<tr><td colspan="${cols.length}" class="empty">Geen advertenties met leads of kosten in deze periode.</td></tr>`)+`</table></div>`;
  if(rows.length>40) h+=`<div style="text-align:center;margin:10px 0"><span class="sm" onclick="bestAll=!bestAll;drawBest()">${bestAll?"Toon top 40":"Toon alle "+rows.length}</span></div>`;
  h+=`<p class="note">Alle ${bestLvl==="ad"?"advertenties":"campagnes"} plat naast elkaar · ${fmtY(A)} t/m ${fmtY(B)} · telmodus ${MODE}. Standaard gesorteerd op <b>Prestatie</b>: van best naar slechtst presterend. De score (0–100) = <b>kosten per klant</b> t.o.v. het plafond van ${eur0(MAXCPK())} (laag = veel punten, max 60) + <b>zekerheid</b> (1 klant = 8, 2 = 14, 3+ = 20 punten — één toevalstreffer wint dus niet) + <b>funnel-rendement</b> (intakes gepland en shows per € 100, max 20). Iets met weinig kosten én weinig leads krijgt "te weinig data" en staat onderaan — goedkoop maar niks opleveren telt niet als goed. Party-campagnes ${PARTY?"tellen mee":"zijn verborgen"}.</p>`;
  w.innerHTML=h;
}

// ---- detail (namen) — met samenvatting gewonnen/verloren, uitsplitsing per dimensie en filters ----
const SETLAB={nieuw:"Leads binnengekomen",gepland:"Intake gepland",shows:"Shows",sign:"Ingeschreven"};
let dSort={c:1,d:-1}, dFilt={}, dfCol=null, dfAll={}, dDim="camp", dOut=null, dShowAll=false;
const outc=l=> l.is_signed?"won" : l.lost?"lost" : "open";
const OUTL={won:["Gewonnen","var(--sign-tx)"],lost:["Verloren","var(--close-tx)"],open:["Nog open","var(--mut)"]};
const campLab=l=> l.camp?l.camp.name : l.platform==="niet_betaald"?"(niet betaald)" : "(campagne onbekend) · "+PN(l.platform);
const DIMS={
  plat:{t:"Platform",fv:l=>PN(l.platform)+(l.platform==="meta"&&l.placement?" · "+l.placement:"")+(l.bioLink?" · bio-link":"")},
  camp:{t:"Campagne",fv:campLab},
  adset:{t:"Adset",fv:l=>l.adObj&&l.adObj.adsetName?l.adObj.adsetName:"(geen adset bekend)"},
  ad:{t:"Advertentie",fv:l=>l.adObj?(l.adObj.adName||l.adObj.adId):(l.utm_content||"(geen advertentie bekend)")},
  fase:{t:"Fase",fv:l=>l.stage_name+(l.lost&&l.stage_position!==0?" · verloren":"")},
  reden:{t:"Verliesreden",fv:l=>l.lost?(l.lost_reason||"(geen reden ingevuld)"):"(niet verloren)"},
  owner:{t:"Eigenaar",fv:l=>l.owner||"(geen eigenaar)"},
};
function dfToggle(dim,v){ if(!dFilt[dim]) dFilt[dim]=new Set(); const st=dFilt[dim]; st.has(v)?st.delete(v):st.add(v); if(!st.size) delete dFilt[dim]; drawDetail(); }
function dfClear(dim){ if(dim) delete dFilt[dim]; else { dFilt={}; dOut=null; } drawDetail(); }
function dOutPick(o){ dOut = dOut===o? null : o; if(o==="lost"&&dOut==="lost") dDim="reden"; drawDetail(); }
function dDimPick(k){ dDim=k; drawDetail(); }
function showDetail(key,set){ detail={key,set}; dFilt={}; dOut=null; dfAll={}; dShowAll=false; drawDetail(); setTimeout(()=>{ const e=document.getElementById("detail"); if(e) e.scrollIntoView({behavior:"smooth",block:"nearest"}); },50); }
function drawDetail(){ const _el=document.getElementById("detail"); if(!detail||tab!=="tree"){ _el.style.display="none"; return; } keepScroll(_el,drawDetailInner); }
function drawDetailInner(){
  const el=document.getElementById("detail"); if(!detail||tab!=="tree"){ el.style.display="none"; return; }
  let n;
  if(detail.key==="__ALL__"){
    const all=L.filter(l=>!l.party);
    n={label:"Alle kanalen samen",m:metrics(all,spendIn(A,B,r=>!(CAMPS.get(ck(r.platform,r.cid))||{}).party),A,B)};
  } else { n=findNode(detail.key,TREE); }
  if(!n){ el.style.display="none"; return; }
  const rowsAll=n.m.S[detail.set]||[];
  const FE=Object.entries(dFilt);
  const pass=(l,skip)=>FE.every(([k,st])=>k===skip||st.has(DIMS[k].fv(l)));
  const rowsDim=rowsAll.filter(l=>pass(l));                       // alle dimensie-filters, nog zonder uitkomst-filter
  const rows=dOut? rowsDim.filter(l=>outc(l)===dOut) : rowsDim;      // + uitkomst
  const cnt=ls=>({n:ls.length,g:ls.filter(l=>l.pd>=0).length,sh:ls.filter(l=>l.is_show).length,won:ls.filter(l=>outc(l)==="won").length,lost:ls.filter(l=>outc(l)==="lost").length,open:ls.filter(l=>outc(l)==="open").length});
  const T=cnt(rowsDim);
  const bar=(c,h)=> c.n? `<span class="obar" style="height:${h||8}px"><i style="width:${c.won/c.n*100}%;background:var(--sign)"></i><i style="width:${c.open/c.n*100}%;background:#b8b4a6"></i><i style="width:${c.lost/c.n*100}%;background:var(--close)"></i></span>`:"";
  // samenvatting
  const sumChip=(k,val,lab,extra)=>`<div class="dsum${dOut===k?" on":""}${k?" clk":""}" ${k?`onclick="dOutPick('${k}')"`:""}><b>${val}</b><span>${lab}</span>${extra?`<small>${extra}</small>`:""}</div>`;
  let sum=`<div class="dsums">${sumChip(null,T.n,"leads")}${sumChip(null,T.g,"intake gepland",T.n?fpct(T.g,T.n):"")}${sumChip(null,T.sh,"shows",T.g?fpct(T.sh,T.g)+" van gepland":"")}${sumChip("won",T.won,"gewonnen",T.n?fpct(T.won,T.n):"")}${sumChip("lost",T.lost,"verloren",T.n?fpct(T.lost,T.n):"")}${sumChip("open",T.open,"nog open",T.n?fpct(T.open,T.n):"")}<div class="dsum wide">${bar(T,12)}<span>gewonnen · open · verloren — klik op gewonnen/verloren/open om alleen die te zien</span></div></div>`;
  // actieve filters
  const pills=[]; for(const [k,st] of FE) for(const v of st) pills.push(`<span class="fpill" onclick="dfToggle('${k}',${jq(v)})" title="filter weghalen">${esc(DIMS[k].t)}: <b>${esc(v)}</b> ✕</span>`);
  if(dOut) pills.push(`<span class="fpill" onclick="dOutPick('${dOut}')">Alleen <b>${OUTL[dOut][0].toLowerCase()}</b> ✕</span>`);
  const fpanel= pills.length? `<div class="fpills"><span class="lbl">Filters:</span>${pills.join("")}<span class="fpill clr" onclick="dfClear()">alles wissen</span></div>` : "";
  // uitsplitsing op één dimensie: aantallen binnen de overige filters
  const base=rowsAll.filter(l=>pass(l,dDim));
  const groups=new Map(); base.forEach(l=>{ const v=DIMS[dDim].fv(l); if(!groups.has(v)) groups.set(v,[]); groups.get(v).push(l); });
  const sel=dFilt[dDim];
  let ent=[...groups.entries()].map(([v,ls])=>[v,cnt(ls)]).sort((x,y)=>((sel&&sel.has(y[0]))?1:0)-((sel&&sel.has(x[0]))?1:0)||y[1].n-x[1].n);
  const CAP=14; let more=0; if(!dfAll[dDim]&&ent.length>CAP+2){ more=ent.length-CAP; ent=ent.slice(0,CAP); }
  let brk=`<div class="dbrk"><div class="wonchips" style="margin:0 0 6px"><span class="lbl">Uitsplitsen op:</span>`+Object.entries(DIMS).map(([k,d])=>`<div class="wchip sm${dDim===k?" on":""}" onclick="dDimPick('${k}')">${d.t}${dFilt[k]?` <span class="n">${dFilt[k].size}</span>`:""}</div>`).join("")+`<span class="lbl" style="margin-left:auto">klik op een rij om te filteren · meerdere tegelijk kan</span></div>`;
  brk+=`<table class="brktbl"><tr><th></th><th>${esc(DIMS[dDim].t)}</th><th class="num">Leads</th><th class="num">Gepland</th><th class="num">Shows</th><th class="num won">Gewonnen</th><th class="num lost">Verloren</th><th class="num">Open</th><th class="barc">verdeling</th><th class="num">verloren %</th></tr>`
    + (ent.length? ent.map(([v,c])=>`<tr class="${sel&&sel.has(v)?"on":""}" onclick="dfToggle('${dDim}',${jq(v)})"><td class="ck">${sel&&sel.has(v)?"☑":"☐"}</td><td class="val" title="${esc(v)}">${esc(v)}</td><td class="num"><b>${c.n}</b></td><td class="num">${c.g||"—"}</td><td class="num">${c.sh||"—"}</td><td class="num won">${c.won||"—"}</td><td class="num lost">${c.lost||"—"}</td><td class="num">${c.open||"—"}</td><td class="barc">${bar(c)}</td><td class="num">${c.n?fpct(c.lost,c.n):"—"}</td></tr>`).join("") : `<tr><td colspan="10" class="empty">—</td></tr>`)
    + (more?`<tr><td colspan="10" class="morec"><span class="sm" onclick="dfAll['${dDim}']=true;drawDetail()">nog ${more} meer ⏷</span></td></tr>`:"")+`</table></div>`;
  // namenlijst
  const cols=[
    {t:"Naam",v:l=>l.nm.toLowerCase(),k:l=>ghl(l.contact_id,l.nm)},
    {t:"Fase",v:l=>l.stage_position,k:l=>`<span class="stg${l.is_signed?" win":l.lost?" lost":""}">${esc(l.stage_name)}${l.lost&&l.stage_position!==0?" · verloren":""}</span>${l.lost&&l.lost_reason?` <small>${esc(l.lost_reason)}</small>`:""}`},
    {t:"Binnen",v:l=>l.cd,k:l=>l.cd>=0?fmt(l.cd):"—"},
    {t:"Platform",v:l=>l.platform,k:l=>`<span class="dot" style="background:${PC(l.platform)}"></span>${esc(PN(l.platform))}${l.placement?` <small>${esc(l.placement)}</small>`:""}${l.bioLink?` <small>bio-link</small>`:""}`},
    {t:"Campagne",v:l=>campLab(l).toLowerCase(),k:l=>`<small title="${esc(l.utm_campaign||"")}">${esc(campLab(l))}</small>`},
    {t:"Adset",v:l=>l.adObj?(l.adObj.adsetName||"").toLowerCase():"",k:l=>`<small>${esc(l.adObj&&l.adObj.adsetName?l.adObj.adsetName:"—")}</small>`},
    {t:"Advertentie",v:l=>l.adObj?l.adObj.adName:"",k:l=>`<small>${esc(l.adObj?(l.adObj.adName||l.adObj.adId):(l.utm_content||"—"))}</small>`},
    {t:"Eigenaar",v:l=>l.owner||"",k:l=>esc(l.owner||"—")},
  ];
  const s=dSort; const sorted=[...rows].sort((x,y)=>{ const a=cols[s.c].v(x),b=cols[s.c].v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*s.d; });
  const LIM=dShowAll?sorted.length:150;
  el.style.display="block";
  el.innerHTML=`<div class="dhead"><b>${esc(n.label)} · ${SETLAB[detail.set]} · ${rows.length}${rows.length!==rowsAll.length?` <small>van ${rowsAll.length} (gefilterd)</small>`:""}</b><span>${fmtY(A)} t/m ${fmtY(B)} <a href="#" onclick="detail=null;drawDetail();return false" style="margin-left:10px;color:var(--plan)">sluiten ✕</a></span></div>${sum}${fpanel}${brk}
    <div class="dbody"><div style="overflow:auto"><table class="dtl"><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="dSort.c===${i}?dSort.d=-dSort.d:(dSort={c:${i},d:1});drawDetail()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+sorted.slice(0,LIM).map(l=>`<tr class="o-${outc(l)}">`+cols.map(c=>`<td>${c.k(l)}</td>`).join("")+`</tr>`).join("")+`</table>${sorted.length>LIM?`<div class="more"><span class="sm" onclick="dShowAll=true;drawDetail()">toon alle ${sorted.length} (nu de eerste ${LIM})</span></div>`:""}${sorted.length?"":`<div class="empty">Geen leads met deze filters.</div>`}</div></div>`;
}

// ---- trend ----
function buckets(by){ let a=A,b=B; if(by==="week"&&b-a<11*7) a=b-12*7+1; if(by==="maand"&&b-a<180) a=monthKey(b)-5*31; const out=[]; if(by==="week"){ for(let d=weekKey(a); d<=b; d+=7) out.push([d,Math.min(d+6,b)]); } else { for(let d=monthKey(a); d<=b;){ const nk=monthKey(d+32); out.push([d,Math.min(nk-1,b)]); d=nk; } } return out; }
const TM=[["cpk","Kosten per klant","€"],["cpl","Kosten per lead","€"],["spend","Kosten","€"],["n","Leads","#"],["sg","Inschrijvingen","#"],["l2k","Lead → klant %","%"],["plan","Plan %","%"],["show","Show %","%"],["sign","Sign %","%"],["hard","Hard bewijs %","%"]];
function drawTrend(){
  const w=document.getElementById("trendwrap"); const bk=buckets(trendBy); const lab=([a])=>trendBy==="week"?"wk "+isoWeek(a):MND[d2s(a).getMonth()]+" "+String(d2s(a).getFullYear()).slice(2); const labels=bk.map(lab);
  const plats=["meta","google","tiktok"]; const cw=Math.max(320,(w.clientWidth||900)-34);
  const rowsFor=p=>bk.map(([a,b])=>{ const ls=L.filter(l=>(p==null||l.platform===p)&&(PARTY||!l.party)); const sp=spendIn(a,b,r=>(p==null||r.platform===p)&&(PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party)); return metrics(ls,sp,a,b); });
  const TROWS=rowsFor(null);
  const [mk,mt,unit]=TM.find(x=>x[0]===trendMetric)||TM[0];
  const series=[{name:"Totaal",color:"var(--txt)",rows:TROWS,width:3,showVals:true}].concat((trendPlat?[trendPlat]:plats).map(p=>({name:PN(p),color:PC(p),rows:rowsFor(p),width:1.8,opacity:.85})));
  for(const s of series){ s.values=s.rows.map(m=>{ const v=m[mk]; return v==null?null:(unit==="€"?Math.round(v):unit==="%"?v:v); }); s.tips=s.rows.map(m=>`${m.sg} inschr · ${m.n} leads · ${eur0(m.spend)}`); }
  const pctMode=unit==="%"; const S=series; const tot=S[0]; const last=tot.values.length-1;
  // de vier belangrijkste trends in één blik (klik = groot bekijken)
  const MINIS=[["spend","Kosten","€"],["cpl","Kosten per lead","€"],["sg","Inschrijvingen","#"],["cpk","Kosten per klant","€"]];
  let h=`<div class="minigrid">`+MINIS.map(([mk2,mt2,u2])=>{ const vals=TROWS.map(m=>{const v=m[mk2]; return v==null?null:(u2==="€"?Math.round(v):v);}); const S2=[{name:mt2,color:"var(--plan)",rows:TROWS,values:vals,tips:TROWS.map(m=>`${m.sg} inschr · ${m.n} leads · ${eur0(m.spend)}`),width:2.2}]; const l2=vals.length-1;
    return `<div class="cmp mini${trendMetric===mk2?" on":""}" onclick="trendMetric='${mk2}';drawTrend()" title="klik om groot te bekijken"><div class="chhead" style="margin-bottom:0"><h3 style="margin:0;font-size:12.5px">${mt2} <span class="chsub">per ${trendBy}</span></h3><b style="font-size:16px">${vals[l2]==null?"—":(u2==="€"?eur0(vals[l2]):vals[l2])}</b></div>${svgLine(S2,{labels,h:84,w:300})}</div>`; }).join("")+`</div>`;
  h+=`<div class="wonchips">`+TM.map(x=>`<div class="wchip sm${trendMetric===x[0]?" on":""}" onclick="trendMetric='${x[0]}';drawTrend()">${x[1]}</div>`).join("")+`<span style="flex:1"></span>`+[["week","Per week"],["maand","Per maand"]].map(x=>`<div class="wchip sm${trendBy===x[0]?" on":""}" onclick="trendBy='${x[0]}';drawTrend()">${x[1]}</div>`).join("")+`</div>`;
  h+=`<div class="wonchips"><span class="lbl">Platform:</span><div class="wchip sm${trendPlat==null?" on":""}" onclick="trendPlat=null;drawTrend()">Alle</div>`+plats.map(p=>`<div class="wchip sm${trendPlat===p?" on":""}" onclick="trendPlat='${p}';drawTrend()"><span class="dot" style="background:${PC(p)}"></span>${PN(p)}</div>`).join("")+`</div>`;
  h+=`<div class="cmp"><div class="chhead"><div><h3 style="margin:0">${mt} · per ${trendBy==="week"?"ISO-week":"maand"}</h3><div class="chsub">${labels[0]} t/m ${labels[last]} · laatste punt = lopend</div></div><div class="chnow"><b>${tot.values[last]==null?"—":(unit==="€"?eur0(tot.values[last]):unit==="%"?r1(tot.values[last])+"%":tot.values[last])}</b><span>totaal, ${labels[last]}</span></div></div>${svgLine(S,{pct:pctMode,labels,markLast:true,h:240,w:cw})}${legend(S)}</div>`;
  // tabel
  h+=`<div class="cmp"><h3>Per ${trendBy} · totaal${trendPlat?" · "+PN(trendPlat):""}</h3><table class="trend"><tr><th>Periode</th><th>Kosten</th><th>Leads</th><th>CPL</th><th>Intake gepland</th><th>Shows</th><th>Inschrijvingen</th><th>Kosten/klant</th><th>Lead → klant</th><th>Omzet</th></tr>`;
  const T=(trendPlat?S[1]:S[0]).rows;
  for(let i=T.length-1;i>=0;i--){ const m=T[i]; h+=`<tr class="${i===last?"cur":""}"><td><b>${labels[i]}</b> <small>${fmt(bk[i][0])}</small></td><td>${eur0(m.spend)}</td><td>${m.n}</td><td>${m.cpl==null?"—":eur0(m.cpl)}</td><td>${m.g}</td><td>${m.sh}</td><td>${m.sg}</td><td class="${m.cpk==null?"":(m.cpk<=MAXCPK()*0.85?"good":m.cpk>MAXCPK()*1.25?"bad":"warn")}"><b>${m.cpk==null?"—":eur0(m.cpk)}</b></td><td>${m.l2k==null?"—":r1(m.l2k)+"%"}</td><td>${eur0(m.omzet)}</td></tr>`; }
  h+=`</table></div><p class="note">Weken/maanden korter dan ~21 dagen zijn wisselvallig: mediaan lead → handtekening is ~12 dagen, 95% tekent binnen 30 dagen. Kosten per klant per week zegt dus weinig; per maand en over 30/90 dagen wel.</p>`;
  w.innerHTML=h;
}

// ---- adviezen ----
// Geheugen voor zware berekeningen (boom per venster, adviezen, oordelen). Wordt geleegd bij nieuwe data (initApp) en bij de party-schakelaar.
let MEMO={tree:new Map(),adv:new Map(),list:new Map(),ver:new Map()};
function memoReset(){ MEMO={tree:new Map(),adv:new Map(),list:new Map(),ver:new Map()}; }
function treeMemo(a,b){ const k=a+"|"+b+"|"+(PARTY?1:0); let t=MEMO.tree.get(k); if(!t){ t=buildTree(a,b); t.forEach(n=>decorate(n,a,b)); MEMO.tree.set(k,t); } return t; }
function adviceFor(a,b,recRef){
  const RB=recRef||b; const mk="f|"+a+"|"+b+"|"+RB+"|"+(PARTY?1:0); if(MEMO.adv.has(mk)) return MEMO.adv.get(mk);
  const out=adviceForCalc(a,b,RB); MEMO.adv.set(mk,out); return out;
}
function adviceForCalc(a,b,RB){
  const days=b-a+1; const out=[];
  const nodes=treeMemo(a,b);
  const units=[]; for(const p of nodes){ if(!PLAT[p.platform]||p.platform==="onbekend"||p.platform==="niet_betaald") continue; for(const c of p.children){ if(!c.cid||c.noCamp) continue; const att=c.leads.length? c.leads.filter(l=>l.adObj).length/c.leads.length : 1; const subs=c.children.filter(x=>x.key.startsWith("s:")&&x.children.length); if(p.platform!=="google"&&subs.length>1) for(const s of subs) units.push({node:s,label:c.label+" → "+s.label,cname:c.label,sname:s.label,platform:p.platform,cid:c.cid,sid:s.sid||"",attOk:att>=0.7}); units.push({node:c,label:c.label,cname:c.label,sname:null,platform:p.platform,cid:c.cid,sid:null,attOk:true}); } }
  for(const u of units){ const m=u.node.m; const spend=m.spend, leads=m.n, shows=m.sh, sg=m.sg; if(spend<250&&leads<5) continue;
    const rec=spendIn(RB-13,RB,r=>r.cid===u.cid&&r.platform===u.platform).spend; if(!(rec>0)) continue; /* alleen campagnes die de laatste 14 dagen nog draaien */ if(/^\((geen|campagne niet|niet toewijsbaar)/.test(u.label)) continue;
    const kpd=spend/days, cpk=sg?spend/sg:null, isrV=u.platform==="google"?isr(a,b,u.cid):null; const MX=MAXCPK();
    const snU=STNOW.get(u.platform+"|"+u.cid+"|"+(u.sid==null?"":u.sid))||null; const bN=snU&&snU.budget!=null?snU.budget:null;
    const perAdset=(u.sid==null&&(u.platform==="meta"||u.platform==="tiktok"))?" Let op: budgetten staan bij "+PN(u.platform)+" per adset — verdeel dit over de best presterende adsets.":"";
    if(cpk!=null&&cpk<MX*0.85&&(sg>=2||spend>=800)){ const mult=isrV?Math.min(2,Math.max(1.25,0.62/isrV)):1.35; const extra=kpd*(mult-1); const exL=leads*(mult-1)*0.65; const exK=exL*(sg/leads||0);
      out.push({type:"opschalen",label:u.label,cname:u.cname,sname:u.sname,platform:u.platform,cid:u.cid,sid:u.sid,wa:a,wb:b,w:extra*30,mult,tgt:mult,txt:`Kosten per klant ${eur0(cpk)} (< ${eur0(MX*0.85)}). Schaal budget ×${r1(mult)} (+${eur0(extra)}/dag): ≈ +${r1(exL)} leads en +${r1(exK)} klanten per periode.${isrV?` Zoekvertoningsaandeel ${Math.round(isrV*100)}% → er is ruimte.`:""}${bN!=null?` Nu ingesteld ${eur0(bN)}/dag → zet naar ≈ ${eur0(bN*mult)}/dag.`:""}${perAdset}`,m}); }
    if(sg===0&&shows===0&&spend>400&&u.attOk) out.push({type:"stoppen",label:u.label,cname:u.cname,sname:u.sname,platform:u.platform,cid:u.cid,sid:u.sid,wa:a,wb:b,w:kpd*30,tgt:0,txt:`${eur0(spend)} uitgegeven, ${leads} leads, geen enkele show en geen inschrijving. Pauzeer of herbouw.`,m});
    else if(sg===0&&shows>0&&spend>400&&u.attOk) out.push({type:"halveren",label:u.label,cname:u.cname,sname:u.sname,platform:u.platform,cid:u.cid,sid:u.sid,wa:a,wb:b,w:kpd*15,tgt:0.5,txt:`${eur0(spend)} uitgegeven, ${shows} show${shows===1?"":"s"} maar nog geen inschrijving. Halveer het budget tot de eerste klant binnen is.${bN!=null?` Nu ingesteld ${eur0(bN)}/dag → zet naar ≈ ${eur0(bN/2)}/dag.`:""}${perAdset}`,m});
    if(cpk!=null&&cpk>MX*1.25&&u.attOk){ const doel=sg*MX/days; out.push({type:"terugschroeven",label:u.label,cname:u.cname,sname:u.sname,platform:u.platform,cid:u.cid,sid:u.sid,wa:a,wb:b,w:(spend-sg*MX)/days*30,tgt:Math.max(0.3,Math.min(0.8,doel/kpd)),txt:`Kosten per klant ${eur0(cpk)} (> ${eur0(MX*1.25)}). Terug naar ≈ ${eur0(doel)}/dag (nu ${eur0(kpd)}/dag) of de kwaliteit van de leads verbeteren.${bN!=null?` Nu ingesteld ${eur0(bN)}/dag.`:""}${perAdset}`,m}); }
  }
  return out;
}
// ---- kwaliteits- en vroeg-signaalregels (geen budgetknop, wél een actie: formulier/targeting/tracking) ----
// units = campagnes (+ adsets bij Meta/TikTok) met leads in venster a..b; ref = account-gemiddelde over alle betaalde leads in datzelfde venster
function adviceQual(a,b,recRef){
  const RB=recRef||b; const mk="q|"+a+"|"+b+"|"+RB+"|"+(PARTY?1:0); if(MEMO.adv.has(mk)) return MEMO.adv.get(mk);
  const out=adviceQualCalc(a,b,RB); MEMO.adv.set(mk,out); return out;
}
function adviceQualCalc(a,b,RB){
  const out=[]; const days=b-a+1;
  const nodes=treeMemo(a,b);
  const paid=L.filter(l=>(l.platform==="meta"||l.platform==="google"||l.platform==="tiktok")&&!l.party&&l.cd>=a&&l.cd<=b);
  const refN=paid.length; if(refN<40) return out;
  const refPlan=paid.filter(l=>l.pd>=0).length/refN; const refSpend=spendIn(a,b,r=>(r.platform==="meta"||r.platform==="google"||r.platform==="tiktok")&&!(CAMPS.get(ck(r.platform,r.cid))||{}).party).spend; const refCpl=refN?refSpend/refN:null;
  const JUNK=/incorrect contact|geen nederlands|too young|niets .*ingevuld|verkeerd/i;
  const units=[]; for(const p of nodes){ if(p.platform==="onbekend"||p.platform==="niet_betaald") continue; for(const c of p.children){ if(!c.cid||c.noCamp) continue; units.push({node:c,label:c.label,cname:c.label,sname:null,platform:p.platform,cid:c.cid,sid:null});
    if(p.platform!=="google") for(const s of c.children){ if(s.key.startsWith("s:")&&s.leads.length>=25) units.push({node:s,label:c.label+" → "+s.label,cname:c.label,sname:s.label,platform:p.platform,cid:c.cid,sid:s.sid||""}); } } }
  for(const u of units){ const m=u.node.m; const n=m.n; if(n<30) continue;
    const rec=spendIn(RB-13,RB,r=>r.cid===u.cid&&r.platform===u.platform).spend; if(!(rec>0)) continue;
    const kpd=m.spend/days; const plan=m.plan/100; const cpl=m.cpl;
    const junkN=u.node.leads.filter(l=>l.cd>=a&&l.cd<=b&&l.lost&&JUNK.test(l.lost_reason||"")).length; const junk=junkN/n;
    const base={label:u.label,cname:u.cname,sname:u.sname,platform:u.platform,cid:u.cid,sid:u.sid,wa:a,wb:b,m,manual:true};
    if(cpl!=null&&refCpl&&cpl<=refCpl*0.6&&plan<=refPlan*0.5&&m.sg<=1){
      out.push({...base,type:"kwaliteit",w:kpd*30*0.5,txt:`Goedkope leads (${eur0(cpl)} per lead, gemiddeld ${eur0(refCpl)}) maar maar ${r1(plan*100)}% plant een intake (gemiddeld ${r1(refPlan*100)}%) en ${m.sg} klant${m.sg===1?"":"en"} op ${eur0(m.spend)}. Dit is de goedkope-leads-val: het formulier laat te veel mensen zonder intentie door. Actie: een extra kwalificatievraag in het formulier (bv. "Wanneer wil je starten?" of een budget/tijdsinvestering-vraag), of overstappen op het "higher intent"-formulier${u.platform==="meta"?" (Meta: leadformulier op 'Hogere intentie', of eerst naar de landingspagina)":""}. Meet daarna 2 weken opnieuw; blijft plan % onder de helft van gemiddeld, dan stoppen.`}); }
    if(junk>=0.25&&junkN>=8){
      out.push({...base,type:"kwaliteit",w:kpd*30*junk,txt:`${junkN} van de ${n} leads (${r1(junk*100)}%) zijn rommel: verkeerde contactgegevens, spreekt geen Nederlands of te jong. Dat is een targeting/formulier-probleem, geen sales-probleem. Actie: taal Nederlands als vereiste in de doelgroep, leeftijd 18+, telefoonnummer-validatie (NL-formaat) en een vraag "Ik heb dit formulier bewust ingevuld" of dubbele bevestiging in het formulier.`}); }
  }
  return out;
}
// vroeg signaal: pas gestarte of net gewijzigde units die in 14 dagen al laten zien dat het niet werkt (geld zonder leads, of leads zonder één geplande intake)
function adviceEarly(N){
  const mk="e|"+N+"|"+(PARTY?1:0); if(MEMO.adv.has(mk)) return MEMO.adv.get(mk);
  const out=adviceEarlyCalc(N); MEMO.adv.set(mk,out); return out;
}
function adviceEarlyCalc(N){
  const out=[]; const a=N-13,b=N; const days=14;
  const nodes=treeMemo(a,b);
  const paid=L.filter(l=>(l.platform==="meta"||l.platform==="google"||l.platform==="tiktok")&&!l.party&&l.cd>=N-59&&l.cd<=N-7);
  const refPlan=paid.length>=40?paid.filter(l=>l.pd>=0).length/paid.length:0.2;
  const units=[]; for(const p of nodes){ if(p.platform==="onbekend"||p.platform==="niet_betaald") continue; for(const c of p.children){ if(!c.cid||c.noCamp) continue; units.push({node:c,label:c.label,cname:c.label,sname:null,platform:p.platform,cid:c.cid,sid:null});
    if(p.platform!=="google") for(const s of c.children){ if(s.key.startsWith("s:")) units.push({node:s,label:c.label+" → "+s.label,cname:c.label,sname:s.label,platform:p.platform,cid:c.cid,sid:s.sid||""}); } } }
  for(const u of units){ const m=u.node.m; const kpd=m.spend/days; const base={label:u.label,cname:u.cname,sname:u.sname,platform:u.platform,cid:u.cid,sid:u.sid,wa:a,wb:b,m,manual:true};
    if(/^\((geen|campagne niet|niet toewijsbaar)/.test(u.label)) continue;
    if(m.spend>=250&&m.n===0){ out.push({...base,type:"vroeg",w:kpd*30,txt:`${eur0(m.spend)} uitgegeven in de laatste 14 dagen zonder één lead. Dat is bijna nooit de doelgroep — check eerst de tracking (UTM's/formulierkoppeling: komen de leads misschien wél binnen maar zonder campagne-id?) en de landingspagina/het formulier. Niets gevonden? Dan pauzeren.`}); continue; }
    // plan-signaal over leads van 7–20 dagen oud (die hebben 7 dagen gehad om ingepland te worden)
    const a2=N-20,b2=N-7; const ls=u.node.leads.filter(l=>l.cd>=a2&&l.cd<=b2); const n2=ls.length; if(n2<20) continue;
    const pl=ls.filter(l=>l.pd>=0).length/n2;
    if(pl<=Math.max(0.05,refPlan*0.4)){ const sp2=(u.sid!=null?spendAds(a2,b2,x=>x.platform===u.platform&&x.cid===u.cid&&(x.adsetId||"")===u.sid):spendIn(a2,b2,r=>r.platform===u.platform&&(r.cid||"")===u.cid)).spend;
      out.push({...base,type:"vroeg",w:kpd*30*0.7,txt:`Vroeg signaal: van de ${n2} leads van 7–20 dagen geleden plant maar ${r1(pl*100)}% een intake (gemiddeld ${r1(refPlan*100)}%)${sp2?` bij ${eur0(sp2)} kosten`:""}. Niet wachten op kosten per klant: dit wordt zelden nog goed. Check eerst de speed-to-lead en verdeling over de setters (SOP) — klopt dat, dan het formulier verzwaren of deze unit pauzeren.`}); }
  }
  return out;
}
const ADV_ICON={opschalen:"🚀",stoppen:"⛔️",halveren:"½",terugschroeven:"🔻",kwaliteit:"⚠️",vroeg:"⏱"}, ADV_LAB={opschalen:"Opschalen",stoppen:"Stoppen",halveren:"Halveren",terugschroeven:"Terugschroeven",kwaliteit:"Leadkwaliteit",vroeg:"Vroeg signaal"};
let advAll=false, advOpen=new Set(), advType="all", advPlat=null;
// ---- AI-analyse op aanvraag (kost alleen iets als je op de knop drukt; antwoord wordt in de browser bewaard) ----
const AI_URL=DATA_URL;   // zelfde endpoint + toegangscode, body.action="ai" → AI-branch in n8n-workflow 13
let AI={busy:false,err:null}; try{ AI=Object.assign(AI,JSON.parse(localStorage.dpacMktAI||"{}")); }catch(e){}
function aiPayload(){
  const N=NOW; const win=(a,b)=>{ const all=L.filter(l=>!l.party); return metrics(all,spendIn(a,b,r=>!(CAMPS.get(ck(r.platform,r.cid))||{}).party),a,b); };
  const pick=m=>({spend:Math.round(m.spend),leads:m.n,cpl:m.cpl==null?null:Math.round(m.cpl),gepland:m.g,plan_pct:m.plan,shows:m.sh,show_pct:m.show,klanten:m.sg,cpk:m.cpk==null?null:Math.round(m.cpk),l2k_pct:m.l2k});
  const kp={laatste_30d:pick(win(N-29,N)),rijp_2_8wk:pick(win(N-57,N-14)),dit_jaar:pick(win(s2d(new Date(d2s(N).getFullYear(),0,1)),N))};
  const nodes=treeMemo(N-57,N-14);
  const camps=[]; for(const p of nodes){ if(p.platform==="onbekend"||p.platform==="niet_betaald") continue; for(const c of p.children){ if(!c.cid||c.m.n<5&&c.m.spend<100) continue;
    const lost={}; c.leads.filter(l=>l.lost&&l.cd>=N-57&&l.cd<=N-14).forEach(l=>{ const k=l.lost_reason||"(geen reden)"; lost[k]=(lost[k]||0)+1; });
    const sn=STNOW.get(p.platform+"|"+c.cid+"|"); camps.push({platform:p.platform,campagne:c.label,...pick(c.m),status:sn?sn.status:null,budget_nu:sn&&sn.budget!=null?sn.budget:null,verliesredenen:Object.entries(lost).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>k+" "+v).join(", "),
      adsets:c.children.filter(x=>x.key.startsWith("s:")&&(x.m.n>=5||x.m.spend>=100)).map(x=>({adset:x.label,...pick(x.m)}))}); } }
  const adv=advList(0).slice(0,15).map(ad=>({type:ad.type,unit:ad.label,rang:Math.round(ad.rank),tekst:ad.txt,status_opvolging:advVerdict(ad).st,afgevinkt:!!folGet(ad).done,opmerking:folGet(ad).note||null}));
  // sales-kant (SOP): verdeling over eigenaren/setters, no-show, verliesredenen — rijpe leads 2–8 weken
  const rl=L.filter(l=>!l.party&&l.cd>=N-57&&l.cd<=N-14); const grp=(f)=>{ const m={}; rl.forEach(l=>{ const k=f(l)||"(leeg)"; const o=m[k]||(m[k]={leads:0,gepland:0,shows:0,noshow:0,klanten:0}); o.leads++; if(l.pd>=0) o.gepland++; if(l.is_show) o.shows++; if(l.is_noshow) o.noshow++; if(l.is_signed) o.klanten++; }); return Object.fromEntries(Object.entries(m).filter(([k,o])=>o.leads>=5).map(([k,o])=>[k,{...o,plan_pct:Math.round(o.gepland/o.leads*1000)/10,noshow_pct:(o.shows+o.noshow)?Math.round(o.noshow/(o.shows+o.noshow)*1000)/10:null}])); };
  const lostAll={}; rl.filter(l=>l.lost).forEach(l=>{ const k=l.lost_reason||"(geen reden)"; lostAll[k]=(lostAll[k]||0)+1; });
  const sales={definitie:"SQL = intake gepland; show = intake heeft plaatsgevonden; klant = getekend",per_eigenaar:grp(l=>l.owner),per_setter:grp(l=>l.setter),verliesredenen_top:Object.entries(lostAll).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+" "+v).join(", "),noshow_pct_totaal:(()=>{ const sh=rl.filter(l=>l.is_show).length, ns=rl.filter(l=>l.is_noshow).length; return (sh+ns)?Math.round(ns/(sh+ns)*1000)/10:null; })()};
  return {datum:fmtY(N),plafond_kosten_per_klant:MAXCPK(),kpi:kp,campagnes_rijp_2_8wk:camps,sales_rijp_2_8wk:sales,adviezen_vandaag:adv,opmerkingen:["Cohort-telling: alles hangt aan de leaddatum.","Mediaan lead→tekenen 12 dagen, 95% binnen 30.","Doel is sales qualified leads (intakes gepland) en klanten, niet goedkope leads.","Meta-kosten alleen per campagne/adset, niet per plaatsing.","Speed-to-lead staat niet in deze data (wel in het sales-dashboard)."]};
}
async function aiRun(){
  if(AI.busy) return; AI.busy=true; AI.err=null; drawAdvice();
  try{ const body=JSON.stringify({code:GCODE,action:"ai",payload:aiPayload()});
    const resp=await fetch(AI_URL,{method:"POST",headers:{"Content-Type":"text/plain"},body});
    if(!resp.ok) throw new Error(resp.status===404?"de AI-workflow is nog niet aangesloten (404)":"server gaf "+resp.status);
    const j=await resp.json(); if(!j||j.error) throw new Error(j&&j.error==="unauthorized"?"toegangscode geweigerd":(j&&j.error)||"onbruikbaar antwoord");
    AI.text=String(j.text||j.output||"").trim(); AI.ts=Date.now(); AI.day=NOW; if(!AI.text) throw new Error("leeg antwoord");
    try{ localStorage.dpacMktAI=JSON.stringify({text:AI.text,ts:AI.ts,day:AI.day,open:true}); }catch(e){}
    AI.open=true;
  }catch(e){ AI.err=e&&e.message?e.message:"mislukt"; }
  AI.busy=false; drawAdvice();
}
function aiToggle(){ AI.open=!AI.open; try{ const s=JSON.parse(localStorage.dpacMktAI||"{}"); s.open=AI.open; localStorage.dpacMktAI=JSON.stringify(s); }catch(e){} drawAdvice(); }
function aiPanelHtml(){
  const when=AI.ts?new Date(AI.ts):null; const wl=when?`${when.getDate()} ${MND[when.getMonth()]} ${String(when.getHours()).padStart(2,"0")}:${String(when.getMinutes()).padStart(2,"0")}`:null;
  let h=`<div class="aibar"><div><b>🤖 AI-analyse op aanvraag</b><span>Leest de cijfers van vandaag (KPI's, campagnes 2–8 wk, adviezen, verliesredenen) en redeneert er één keer overheen. Kost alleen iets als je op de knop drukt; het antwoord blijft hier staan.${wl?` Laatste analyse: <b>${wl}</b>${AI.day!=null&&AI.day<NOW?" (van een eerdere dag)":""}.`:""}</span></div>`
    +`<div class="aibtns">${AI.text?`<button class="rbtn sm2" onclick="aiToggle()">${AI.open?"Verberg":"Toon"} analyse</button>`:""}<button class="rbtn sm2 pri" onclick="aiRun()" ${AI.busy?"disabled":""}>${AI.busy?"⏳ Bezig…":(AI.text?"🔄 Opnieuw analyseren":"🤖 Analyseer nu")}</button></div></div>`;
  if(AI.err) h+=`<div class="aierr">AI-analyse mislukt: ${esc(AI.err)}.</div>`;
  if(AI.text&&AI.open) h+=`<div class="cmp aiout"><h3>AI-analyse${wl?` · ${wl}`:""}</h3><div class="aitxt">${esc(AI.text).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/^### (.+)$/gm,"<h4>$1</h4>").replace(/^## (.+)$/gm,"<h4>$1</h4>").replace(/^[-•] /gm,"• ")}</div></div>`;
  return h;
}
function advTog(k){ advOpen.has(k)?advOpen.delete(k):advOpen.add(k); drawAdvice(); }
// het advies van dag N: shows-regels over vers venster, kosten/klant-regels over uitgerijpt venster (leads hebben hun doorlooptijd gehad)
function advCur(N){
  const fresh=adviceFor(N-29,N,N).filter(t=>t.type==="stoppen"||t.type==="halveren");
  const ripe=adviceFor(N-43,N-14,N).filter(t=>t.type==="opschalen");
  const sure=adviceFor(N-57,N-28,N).filter(t=>t.type==="terugschroeven");   // het negatieve kosten/klant-oordeel pas als ~95% getekend heeft
  const qual=adviceQual(N-57,N-14,N);   // leadkwaliteit: goedkoop maar plant/tekent niet, of rommel-leads — over uitgerijpte leads
  const early=adviceEarly(N);           // vroeg signaal: geld zonder leads / leads zonder intakes in de eerste 2–3 weken
  return fresh.concat(ripe).concat(sure).concat(qual).concat(early);
}
// consistentie: campagne knijpen (stoppen/halveren/terugschroeven) én adset opschalen binnen dezelfde campagne → één verschuif-advies op de adset
function advConflict(list){
  const KNIJP={stoppen:1,halveren:1,terugschroeven:1};
  const upBy=new Map(); list.forEach(ad=>{ if(ad.type==="opschalen"&&ad.sid!=null){ const k=ad.platform+"|"+ad.cid; if(!upBy.has(k)) upBy.set(k,[]); upBy.get(k).push(ad); } });
  return list.filter(ad=>{ if(KNIJP[ad.type]&&ad.sid==null){ const ups=upBy.get(ad.platform+"|"+ad.cid); if(ups&&ups.length){ for(const u of ups){ if(!u.shift){ u.shift=true; u.txt+=" De campagne als geheel presteert ondermaats — verschuif budget van de rest van de campagne naar deze adset in plaats van extra bij te storten."; } } return false; } } return true; });
}
// gedeelde lijst-bouw (Advies-tab én Opgevolgd-tab): rank incl. maandhistorie + jaar-adviezen + dedupe per label. shift=7 → het advies zoals het er een week geleden uitzag.
function advList(shift,keepUit){
  const mk=String(shift||0); let list=MEMO.list.get(mk);
  if(!list){ list=advListCalc(NOW-(shift||0)); MEMO.list.set(mk,list); }
  if(!keepUit) list=list.filter(ad=>!stUit(ad)&&!advDone(ad));   // wat al uit staat of al is doorgevoerd hoeft geen advies meer
  return list;
}
function advListCalc(N){
  const cur=advCur(N);
  // maandhistorie dit jaar: in welke maanden vuurde dezelfde regel
  const months=[]; for(let d=monthKey(N); d>=monthKey(s2d(new Date(d2s(N).getFullYear(),0,1))); d=monthKey(d-1)) months.push([d,Math.min(monthKey(d+32)-1,N)]);
  const hist=new Map(); for(const [ma,mb] of months){ for(const ad of adviceFor(ma,mb)){ const k=ad.type+"|"+ad.label; if(!hist.has(k)) hist.set(k,[]); hist.get(k).push(ma); } }
  // jaar-adviezen die nu niet vuren
  const yearA=s2d(new Date(d2s(N).getFullYear(),0,1)); const year=adviceFor(yearA,N,N).filter(y=>!cur.some(c=>c.type===y.type&&c.label===y.label)).map(y=>({...y,w:y.w*0.6,buiten:true}));
  const all=advConflict(cur.concat(year)).map(ad=>{ const ms=hist.get(ad.type+"|"+ad.label)||[]; const n=ms.length; return {...ad,months:ms,rank:ad.w*(1+0.25*Math.max(0,n-1))}; });
  // dedupe per label: hoogste rang
  const best=new Map(); for(const ad of all){ const k=ad.label; if(!best.has(k)||best.get(k).rank<ad.rank) best.set(k,ad); }
  return [...best.values()].sort((x,y)=>y.rank-x.rank);
}
// ---- opvolging: hoeveel van de geadviseerde stap is gezet? ----
// bron 1 = ingesteld budget + aan/uit uit het platform (dagsnapshot, dezelfde dag zichtbaar); bron 2 (terugval) = besteding per dag.
// referentie = dagbudget in het meetvenster van het advies (dat is waar het advies op rekende); doel = referentie × factor (opschalen ×mult, halveren ×0,5, terugschroeven ×tgt, stoppen 0).
const dayOf=(x,y,ad)=>( ad.sid!=null ? spendAds(x,y,z=>z.platform===ad.platform&&z.cid===ad.cid&&(z.adsetId||"")===ad.sid).spend : spendIn(x,y,r=>r.platform===ad.platform&&(r.cid||"")===ad.cid).spend )/(y-x+1);
function lastSpendDay(ad){ let m=null; if(ad.sid!=null){ for(const r of AD){ if(r.spend>0.5&&r.ad.platform===ad.platform&&r.ad.cid===ad.cid&&(r.ad.adsetId||"")===ad.sid&&(m==null||r.d>m)) m=r.d; } } else { for(const r of CD){ if(r.spend>0.5&&r.platform===ad.platform&&(r.cid||"")===ad.cid&&(m==null||r.d>m)) m=r.d; } } return m; }
function activeDays(ad,a,b){ const s=new Set(); if(ad.sid!=null){ for(const r of AD){ if(r.d>=a&&r.d<=b&&r.spend>0.5&&r.ad.platform===ad.platform&&r.ad.cid===ad.cid&&(r.ad.adsetId||"")===ad.sid) s.add(r.d); } } else { for(const r of CD){ if(r.d>=a&&r.d<=b&&r.spend>0.5&&r.platform===ad.platform&&(r.cid||"")===ad.cid) s.add(r.d); } } return s.size; }
function advProgress(ad){
  if(ad.manual) return {uit:false,src:"manual",bNow:null,bRef:null,tgt:null,f:null,lastSp:null,kpd:0};
  const sn=stNowOf(ad); const uit=stUit(ad);
  const kpd=ad.wa!=null? ad.m.spend/Math.max(1,activeDays(ad,ad.wa,ad.wb)) : 0;   // per dag dat de unit écht draaide (niet per kalenderdag)
  const lastSp=lastSpendDay(ad); const SL=(D&&D.counts&&D.counts.spend_last)?dOf(D.counts.spend_last):NOW-1;
  const out={uit,src:sn?"status":"spend",bNow:null,bRef:null,tgt:null,f:null,lastSp,kpd};
  if(ad.manual){ out.src="manual"; return out; }
  if(sn&&(uit||sn.budget!=null)){ out.bNow=uit?0:sn.budget; }
  else { const v=dayOf(NOW-14,NOW-8,ad), n=dayOf(NOW-7,NOW-1,ad); out.v=v; out.n=n; out.bNow=n;
    if(lastSp!=null&&lastSp<=SL-2){ out.uit=true; out.bNow=0; }   // minstens 2 volle dagen met data en géén besteding = staat uit
    else if(v<1&&n<1){ out.bRef=null; return out; } }
  out.bRef = kpd>0? kpd : (out.v>=1? out.v : null);
  if(out.bRef==null) return out;
  const tgt = ad.type==="opschalen"? out.bRef*(ad.mult||1.35) : out.bRef*(ad.tgt!=null?ad.tgt:0.5);
  out.tgt=tgt; const step=tgt-out.bRef; if(!step) return out;
  out.f=(out.bNow-out.bRef)/step;   // 1 = precies de geadviseerde stap · 0 = niets gedaan · < 0 = tegengesteld
  return out;
}
// oordeel: ok = ≥ 75% van de stap gezet óf binnen € 5 van het doel · mid = 25–75% · no = ongewijzigd (binnen ±10% / € 5 = ruis) of tegengesteld · ey = niets om mee te vergelijken · man = zelf afvinken
function advVerdict(ad){
  if(!ad.manual){ const mk=folKey(ad)+"|"+ad.wa+"|"+ad.wb; const c=MEMO.ver.get(mk); if(c) return c; const v=advVerdictCalc(ad); MEMO.ver.set(mk,v); return v; }
  return advVerdictCalc(ad);
}
function advVerdictCalc(ad){
  const P=advProgress(ad); const knijp=ad.type!=="opschalen"; let st,uitleg;
  if(P.src==="manual"){ st="man"; uitleg="Dit is een actie in het formulier, de targeting of de tracking — geen budgetknop, dus niet automatisch te meten. Vink hem hier af zodra hij is doorgevoerd."; return {...P,st,uitleg}; }
  if(P.uit){ if(knijp){ st="ok"; uitleg=P.src==="status"?"Staat uit in het advertentieplatform.":`Geen besteding meer sinds ${P.lastSp!=null?fmtY(P.lastSp):"—"} — staat uit.`; } else { st="no"; uitleg="Deze staat nu uit — terwijl het advies juist opschalen was."; } return {...P,st,uitleg}; }
  if(P.bRef==null||P.f==null){ st="ey"; uitleg=P.src==="status"?"Geen referentiebudget om mee te vergelijken.":"Vrijwel geen kosten in de afgelopen twee weken — nog niets om te beoordelen."; return {...P,st,uitleg}; }
  const d=P.bNow-P.bRef; const step=Math.abs(P.tgt-P.bRef); const near=Math.abs(P.bNow-P.tgt)<=Math.min(5,step*0.25); const TOL=Math.max(2,Math.min(5,P.bRef*0.10));   // ruisband: ±10%, max € 5 (min € 2)
  if(P.f>=0.75||near){ st="ok"; uitleg=ad.type==="stoppen"&&P.bNow<1?"Budget (vrijwel) naar nul.":`${knijp?"Verlaagd":"Verhoogd"} naar ${eur0(P.bNow)}/dag — ${(near&&P.f<0.75)?"vrijwel op het doel":Math.round(Math.min(P.f,2)*100)+"% van de geadviseerde stap"} (doel ≈ ${eur0(P.tgt)}/dag).`; }
  else if(P.f>=0.25){ st="mid"; uitleg=`${knijp?"Verlaagd":"Verhoogd"} naar ${eur0(P.bNow)}/dag = ${Math.round(P.f*100)}% van de geadviseerde stap (doel ≈ ${eur0(P.tgt)}/dag). Nog niet ver genoeg.`; }
  else if(Math.abs(d)<=TOL){ st="no"; uitleg=`Ongewijzigd: ${eur0(P.bRef)} → ${eur0(P.bNow)}/dag valt binnen de ruisband van ±10% (max € 5) — dat is geen wijziging. Doel ≈ ${eur0(P.tgt)}/dag.`; }
  else if(P.f<0){ st="no"; uitleg=`Tegengesteld: budget ging ${d>0?"omhoog":"omlaag"} (${eur0(P.bRef)} → ${eur0(P.bNow)}/dag) terwijl het advies ${knijp?"knijpen":"opschalen"} was.`; }
  else { st="no"; uitleg=`Nauwelijks gewijzigd (${eur0(P.bRef)} → ${eur0(P.bNow)}/dag = ${Math.round(P.f*100)}% van de stap). Doel ≈ ${eur0(P.tgt)}/dag.`; }
  uitleg+= P.src==="status"?" Gemeten op het ingestelde budget in het platform (dagelijkse meting om 06:25, dezelfde dag zichtbaar).":" Gemeten op besteding (laatste 7 volle dagen vs het meetvenster) — voor deze unit ontbreekt de budgetmeting.";
  return {...P,st,uitleg};
}
// is dit advies al doorgevoerd? (dan hoeft het niet meer op ⚡ Advies, wel als ✅ op Opgevolgd)
function advDone(ad){ return ad.manual ? !!folGet(ad).done : advVerdict(ad).st==="ok"; }
// ---- afvinken + notities (per advies, in de browser bewaard) ----
let FOLST={}; try{ FOLST=JSON.parse(localStorage.dpacMktFol||"{}"); }catch(e){ FOLST={}; }
const folKey=ad=>ad.type+"|"+ad.label;
function folGet(ad){ return FOLST[folKey(ad)]||{}; }
function folSave(){ try{ const cut=Date.now()-60*864e5; for(const k in FOLST){ if((FOLST[k].ts||0)<cut&&!FOLST[k].note) delete FOLST[k]; } localStorage.dpacMktFol=JSON.stringify(FOLST); }catch(e){} }
function folCheck(key,on){ FOLST[key]={...(FOLST[key]||{}),done:!!on,ts:Date.now()}; folSave(); drawFollow(); }
function folNote(key,val){ FOLST[key]={...(FOLST[key]||{}),note:String(val||"").trim(),ts:Date.now()}; folSave(); }
function folExtra(val){ try{ localStorage.dpacMktFolExtra=String(val||""); }catch(e){} }
// herkomst + onderbouwing van één advies (uitklappaneel, gedeeld door Advies- en Opgevolgd-tab)
function advSrc(ad){
  const sn=stNowOf(ad);
  const WHY={stoppen:"Show-regel: gemeten op de verse laatste 30 dagen — een intake verschijnt binnen dagen, dus dit signaal is snel én eerlijk.",halveren:"Show-regel: gemeten op de verse laatste 30 dagen — er zijn wel shows, dus knijpen in plaats van stoppen (de handtekening kan nog komen).",opschalen:"Kosten/klant-regel: gemeten op leads van 2–6 weken geleden — die hebben hun doorlooptijd gehad, en narijpers kunnen het alleen nog béter maken. Daarom mag dit advies vroeg.",terugschroeven:"Kosten/klant-regel: gemeten op leads van 4–8 weken geleden — dan heeft ~95% getekend, dus dit (negatieve) oordeel is zeker.",kwaliteit:"Kwaliteitsregel: gemeten op leads van 2–8 weken geleden, vergeleken met het account-gemiddelde in datzelfde venster. Goedkoop is pas goed als het ook intakes en klanten oplevert.",vroeg:"Vroeg signaal: laatste 14 dagen (geld zonder leads) of leads van 7–20 dagen oud (plan %). Geen eindoordeel, wel een reden om nu al te kijken in plaats van 6 weken te wachten."};
  return `<div class="bxg"><div><small>Platform</small><b><span class="dot" style="background:${PC(ad.platform)}"></span>${esc(PN(ad.platform))}</b></div><div><small>Campagne</small><b>${esc(ad.cname||ad.label)}</b></div>${ad.sname?`<div><small>Adset</small><b>${esc(ad.sname)}</b></div>`:""}${ad.wa!=null?`<div><small>Meetvenster (leads)</small><b>${fmtY(ad.wa)} t/m ${fmtY(ad.wb)}</b></div>`:""}<div><small>Cijfers in dat venster</small><b>${eur0(ad.m.spend)} · ${ad.m.n} leads · ${ad.m.sh} shows · ${ad.m.sg} klant${ad.m.sg===1?"":"en"}${ad.m.cpk!=null?" · "+eur0(ad.m.cpk)+"/klant":""}</b></div>${sn?`<div><small>Nu ingesteld</small><b>${sn.status==="uit"?"staat uit":(sn.budget!=null?eur0(sn.budget)+"/dag":"aan")}</b></div>`:""}</div><p style="margin:6px 0 0;font-size:12px;color:var(--mut)">${WHY[ad.type]||""}</p>`;
}
function drawAdvice(){
  const w=document.getElementById("advwrap");
  let note=`<div class="cmp" style="padding:12px 16px;margin-bottom:10px"><b>Alles wat hier staat, kun je vandaag direct doorvoeren.</b> Elk advies is al door het juiste meetvenster gehaald: snelle signalen (shows) worden vers gemeten, kosten per klant pas als de leads hun doorlooptijd hebben gehad. Twijfelgevallen staan hier simpelweg niet tussen — klik een advies open voor de volledige herkomst en onderbouwing.</div>`;
  const list=advList(0);
  const ICON=ADV_ICON, LAB=ADV_LAB;
  const sev=ad=> ad.rank>=1500 ? "hi" : ad.rank>=500 ? "mid" : "lo";
  note+=aiPanelHtml();
  const SEVLAB={hi:"Super belangrijk",mid:"Belangrijk",lo:"Minder urgent"};
  const CNT={}; for(const ad of list) CNT[ad.type]=(CNT[ad.type]||0)+1;
  const PCNT={}; for(const ad of list) PCNT[ad.platform]=(PCNT[ad.platform]||0)+1;
  let shown = advType==="all" ? list : list.filter(ad=>ad.type===advType);
  if(advPlat) shown=shown.filter(ad=>ad.platform===advPlat);
  note+=`<div class="wonchips"><span class="lbl">Soort advies:</span><div class="wchip sm${advType==="all"?" on":""}" onclick="advType='all';drawAdvice()">Alles <span class="n">${list.length}</span></div>`
    +Object.keys(ICON).filter(t=>CNT[t]).map(t=>`<div class="wchip sm${advType===t?" on":""}" onclick="advType='${t}';drawAdvice()">${ICON[t]} ${LAB[t]} <span class="n">${CNT[t]}</span></div>`).join("")+`</div>`;
  note+=`<div class="wonchips"><span class="lbl">Platform:</span><div class="wchip sm${advPlat==null?" on":""}" onclick="advPlat=null;drawAdvice()">Alle <span class="n">${list.length}</span></div>`+["meta","google","tiktok"].filter(p=>PCNT[p]).map(p=>`<div class="wchip sm${advPlat===p?" on":""}" onclick="advPlat='${p}';drawAdvice()"><span class="dot" style="background:${PC(p)}"></span>${PN(p)} <span class="n">${PCNT[p]}</span></div>`).join("")+`</div>`;
  const LIM=advAll?shown.length:12;
  let h=note+`<div class="advrows">`+(shown.length?shown.slice(0,LIM).map((ad,i)=>{ const sv=sev(ad); const key=ad.type+"|"+ad.label; const opn=advOpen.has(key);
    return `<div class="advrow ${sv}${opn?" open":""}" onclick="advTog(${jq(key)})">`
      +`<span class="rank">${i+1}</span>`
      +`<span class="sevb ${sv}">${SEVLAB[sv]}</span>`
      +`<span class="advmain"><b>${ICON[ad.type]} ${LAB[ad.type]}</b> · <span class="dot" style="background:${PC(ad.platform)}"></span>${esc(ad.label)}</span>`
      +`<span class="advdata">${eur0(ad.m.spend)} · ${ad.m.n} leads · ${ad.m.sh} shows · ${ad.m.sg} klant${ad.m.sg===1?"":"en"}${ad.m.cpk!=null?" · <b>"+eur0(ad.m.cpk)+"/klant</b>":""}</span>`
      +`<span class="advw">≈ ${eur0(ad.w)}/mnd op het spel</span><i class="chev${opn?" open":""}"></i>`
      +(opn?`<div class="advx"><p>${esc(ad.txt)}</p>${advSrc(ad)}<div class="doen">${ad.months.length?`Geldt al ${ad.months.length} maand${ad.months.length===1?"":"en"} (${ad.months.map(m=>MND[d2s(m).getMonth()]).join(", ")})`:"Nieuw dit moment"}${ad.buiten?" · vuurt op dit moment niet, maar stond eerder dit jaar open":""}${ad.shift?" · <b>verschuif-advies</b>":""}</div></div>`:"")
      +`</div>`; }).join(""):`<div class="advrow lo"><span class="advmain">Geen regels die vuren in deze periode (te weinig kosten of leads per campagne).</span></div>`)+`</div>`
    +(shown.length>12?`<div style="text-align:center;margin:10px 0"><span class="sm" onclick="advAll=!advAll;drawAdvice()">${advAll?"Toon alleen de top 12":"Toon alle "+shown.length+" adviezen"}</span></div>`:"");
  h+=`<div class="cmp" style="margin-top:12px"><h3>Hoe de adviezen bepaald worden</h3><ul class="advul">
    <li><b>Eén advies per dag</b>, los van de datumkiezer — de motor kiest per regel zelf het juiste meetvenster, dus alles wat hier staat is direct uitvoerbaar.</li>
    <li><b>Stoppen</b>: € 400+ uitgegeven, 0 shows én 0 klanten in de laatste 30 dagen.</li>
    <li><b>Halveren</b>: € 400+ uitgegeven, wél shows maar nog 0 klanten (laatste 30 dagen) — knijpen in plaats van stoppen, want de handtekening kan nog komen.</li>
    <li><b>Opschalen</b>: kosten/klant onder 85% van ${eur0(MAXCPK())} bij leads van 2–6 weken oud (en ≥ 2 klanten of ≥ € 800) — narijpers maken dit alleen nog beter, dus dit mag vroeg.</li>
    <li><b>Terugschroeven</b>: kosten/klant boven 125% van het plafond bij leads van 4–8 weken oud — dan heeft ~95% getekend, dus het oordeel is zeker.</li>
    <li><b>⚠️ Leadkwaliteit</b>: leads van 2–8 weken oud, ≥ 30 stuks: kosten per lead ≤ 60% van gemiddeld maar plan % ≤ de helft van gemiddeld en hooguit 1 klant → goedkope leads zonder intentie (formulier verzwaren); of ≥ 25% rommel-leads (verkeerde gegevens, geen Nederlands, te jong) → targeting/formulier.</li>
    <li><b>⏱ Vroeg signaal</b>: € 250+ in 14 dagen zonder één lead (tracking checken), of ≥ 20 leads van 7–20 dagen oud waarvan minder dan 40% van het gemiddelde plan % een intake plant. Geen eindoordeel — wel eerder kijken dan na 6 weken.</li>
    <li>Alleen campagnes die de laatste 14 dagen nog draaien; wat al uit staat of al is doorgevoerd (≥ 75% van de geadviseerde stap gezet) verschijnt hier niet meer — dat vind je terug op ✔️ Opgevolgd.</li>
    <li>Bij <b>Google</b> leeft het budget op campagneniveau (adviezen dus ook); bij <b>Meta/TikTok</b> per adset — campagne-adviezen zeggen er daarom bij dat je de wijziging over de best presterende adsets verdeelt.</li>
    <li>Botst "campagne knijpen" met "adset opschalen" binnen dezelfde campagne, dan wordt dat één <b>verschuif-advies</b>. Adset-oordelen alleen als de leads goed aan advertenties toewijsbaar zijn.</li>
    <li>Volgorde = € per maand op het spel (+25% per extra maand dat het advies al geldt). Er wordt <b>niets automatisch gewijzigd</b> — jij voert uit; opvolging zie je op <b>✔️ Opgevolgd</b>.</li>
  </ul></div>`;
  w.innerHTML=h;
}

// ---- opgevolgd: is elk advies daadwerkelijk uitgevoerd? (ingesteld budget/aan-uit uit het platform; terugval = besteding) ----
let folOpen=new Set(), folSt="all";
function folTog(k){ folOpen.has(k)?folOpen.delete(k):folOpen.add(k); drawFollow(); }
function folRows(){
  const list=advList(0);
  // adviezen die vorige week nog golden en nu niet meer, tonen we ook (meestal: opgevolgd)
  const prev=advList(7,true).filter(p=>!list.some(c=>c.label===p.label&&c.type===p.type)).map(p=>({...p,vervallen:true}));
  const rows=list.concat(prev).map(ad=>{ const V=advVerdict(ad); const ch=stChange(ad); const F=folGet(ad);
    let disp; if(V.src==="manual") disp=F.done?"afgevinkt":"zelf afvinken";
    else if(V.uit) disp=`${V.bRef!=null?eur0(V.bRef):"—"} → <b>uit</b>${V.src==="status"?" ingesteld":" (geen besteding)"}`;
    else if(V.bRef==null) disp="—";
    else disp=`${eur0(V.bRef)} → <b>${eur0(V.bNow)}/dag</b> ${V.src==="status"?"ingesteld":"besteed"}${V.tgt!=null?` <small>doel ≈ ${eur0(V.tgt)}</small>`:""}`;
    return {...ad,V,st:V.st,uitleg:V.uitleg+(F.done?" ☑ Door jullie afgevinkt — de meting blijft leidend: staat het morgen nog op ❌, dan is het niet doorgevoerd.":""),disp,ch,F}; });
  const ORD={no:0,mid:1,man:2,ok:3,ey:4};
  rows.sort((x,y)=> ORD[x.st]-ORD[y.st] || y.rank-x.rank);
  return rows;
}
const FOL_STL={no:["❌","Niet doorgevoerd"],mid:["🌓","Deels"],man:["☐","Zelf afvinken"],ok:["✅","Doorgevoerd"],ey:["⏳","Nog niet te zien"]};
function drawFollow(){
  const w=document.getElementById("folwrap");
  const rows=folRows();
  const CLS={no:"hi",mid:"mid",man:"man",ok:"ok",ey:"ey"};
  const CNT={}; for(const r of rows) CNT[r.st]=(CNT[r.st]||0)+1;
  const nDone=rows.filter(r=>r.F.done).length, nNote=rows.filter(r=>r.F.note).length;
  let note=`<div class="wonchips"><span class="lbl">Status:</span><div class="wchip sm${folSt==="all"?" on":""}" onclick="folSt='all';drawFollow()">Alles <span class="n">${rows.length}</span></div>`
    +["no","mid","man","ok","ey"].filter(s=>CNT[s]).map(s=>`<div class="wchip sm${folSt===s?" on":""}" onclick="folSt='${s}';drawFollow()">${FOL_STL[s][0]} ${FOL_STL[s][1]} <span class="n">${CNT[s]}</span></div>`).join("")
    +`<span style="flex:1"></span><button class="rbtn sm2 pri" onclick="folReport()" title="Maakt een Slack-klare tekst met alles wat nog moet gebeuren, jullie notities en een vrij veld voor extra punten">📋 Rapport voor media buyer</button></div>`;
  const shown = folSt==="all" ? rows : rows.filter(r=>r.st===folSt);
  let h=note+`<div class="advrows">`+(shown.length?shown.map(r=>{ const key=folKey(r); const opn=folOpen.has(key); const cls=CLS[r.st];
    return `<div class="advrow ${cls}${opn?" open":""}${r.F.done?" done":""}" onclick="folTog(${jq(key)})">`
      +`<label class="folchk" onclick="event.stopPropagation()" title="afvinken = wij hebben dit gedaan/besproken. De status ernaast blijft de meting; de rij blijft staan waar hij staat."><input type="checkbox" ${r.F.done?"checked":""} onchange="folCheck(${jq(key)},this.checked)"></label>`
      +`<span class="sevb ${cls}">${FOL_STL[r.st][0]} ${FOL_STL[r.st][1]}</span>`
      +`<span class="advmain"><b>${ADV_ICON[r.type]} ${ADV_LAB[r.type]}</b> · <span class="dot" style="background:${PC(r.platform)}"></span>${esc(r.label)}</span>`
      +`<span class="advw">${r.disp}${r.st==="ok"&&r.ch?` · ${fmtY(r.ch.d)}`:""}</span>`
      +`<input class="folnote-in${r.F.note?" has":""}" type="text" value="${esc(r.F.note||"")}" placeholder="opmerking (komt in het rapport)" title="Opmerking voor Ger én terugkoppeling voor Claude — komt letterlijk in het rapport" onclick="event.stopPropagation()" onchange="folNote(${jq(key)},this.value);this.classList.toggle('has',!!this.value)" onkeydown="if(event.key==='Enter'){this.blur()}">`
      +`<i class="chev${opn?" open":""}"></i>`
      +(opn?`<div class="advx" onclick="event.stopPropagation()"><p>${esc(r.txt)}</p>${advSrc(r)}<div class="doen">${r.uitleg}${r.ch?` · Laatste wijziging in het platform: <b>${fmtY(r.ch.d)}</b> (${r.ch.van.status==="uit"?"uit":eur0(r.ch.van.budget||0)+"/dag"} → ${r.ch.naar.status==="uit"?"uit":eur0(r.ch.naar.budget||0)+"/dag"})`:""}${r.vervallen?" · Dit advies vuurde vorige week nog, nu niet meer.":""}</div></div>`:"")
      +`</div>`; }).join(""):`<div class="advrow lo"><span class="advmain">Niets te tonen — geen adviezen in deze periode.</span></div>`)+`</div>`;
  h+=`<p class="note">Automatisch beoordeeld op het <b>ingestelde budget en de aan/uit-status</b> in het advertentieplatform (dagelijkse meting om 06:25 — een wijziging is dezelfde dag zichtbaar, met datum). Waar die meting ontbreekt geldt de terugval: besteding per dag, laatste 7 volle dagen. <b>Doorgevoerd</b> = minstens driekwart van de geadviseerde stap gezet (of vrijwel op het doel), of uit; <b>Deels</b> = een kwart tot driekwart; <b>Niet doorgevoerd</b> = ongewijzigd (binnen ±10%, max € 5 — dat is ruis) of tegengesteld. Formulier-, targeting- en tracking-acties (⚠️ ⏱) zijn niet automatisch meetbaar — die vink je zelf af. <b>Het vinkje is jullie eigen aantekening</b> ("dit hebben we net gedaan"): de rij blijft staan en de status blijft de meting — staat hij morgen nog op ❌, dan is het echt niet doorgevoerd (en heb je per ongeluk geklikt). Vinkjes + opmerkingen bewaart de browser; <b>📋 Rapport</b> zet alles in één Slack-bericht voor de media buyer, met de opmerkingen als terugkoppeling voor Claude.${nDone||nNote?` Nu ${nDone} afgevinkt, ${nNote} met notitie.`:""}</p>`;
  w.innerHTML=h;
}
// ---- rapport voor de media buyer (Slack-klare tekst) ----
function folReportText(rows){
  const LAB=ADV_LAB, ICO=ADV_ICON; const t=d2s(NOW);
  let extra=""; try{ extra=localStorage.dpacMktFolExtra||""; }catch(e){}
  const todo=rows.filter(r=>(r.st==="no"||r.st==="mid"||r.st==="man")&&!r.F.done), just=rows.filter(r=>(r.st==="no"||r.st==="mid"||r.st==="man")&&r.F.done), done=rows.filter(r=>r.st==="ok"), wait=rows.filter(r=>r.st==="ey");
  const line=r=>{ const V=r.V; let s=`• ${ICO[r.type]} *${LAB[r.type]}* — ${r.label}`;
    if(V.src!=="manual"&&V.bRef!=null){ s+=`: nu ${V.uit?"uit":eur0(V.bNow)+"/dag"} → ${r.type==="stoppen"?"uitzetten":"naar ≈ "+eur0(V.tgt)+"/dag"}`; if(r.st==="mid") s+=` (nu ${Math.round((V.f||0)*100)}% van de stap)`; }
    s+=`\n   _${r.txt.replace(/\s+/g," ").slice(0,220)}${r.txt.length>220?"…":""}_`;
    if(r.F.note) s+=`\n   📝 ${r.F.note}`;
    return s; };
  const byPlat=list=>["meta","google","tiktok"].map(p=>{ const ls=list.filter(r=>r.platform===p); return ls.length?`*${PN(p)}*\n`+ls.map(line).join("\n"):""; }).filter(Boolean).join("\n\n");
  let out=`*Marketing · acties voor deze week* — ${t.getDate()} ${MNDF[t.getMonth()]} ${t.getFullYear()}\n(uit het DPAC-marketingdashboard, tabblad Opgevolgd)\n\n`;
  out+= todo.length? `*Nog te doen (${todo.length})*\n\n`+byPlat(todo) : "*Nog te doen*: niets open — alles is doorgevoerd. 👌";
  if(just.length) out+=`\n\n*Net doorgevoerd / besproken, meting bevestigt nog (${just.length})* ☑\n`+just.map(r=>`• ${ICO[r.type]} ${LAB[r.type]} — ${r.label}${r.F.note?` — 📝 ${r.F.note}`:""}`).join("\n");
  if(extra.trim()) out+=`\n\n*Extra punten*\n${extra.trim()}`;
  const notes=rows.filter(r=>r.F.note); if(notes.length) out+=`\n\n_📝 = onze opmerkingen; die gaan ook terug naar Claude als terugkoppeling op de adviezen._`;
  if(done.length) out+=`\n\n*Al doorgevoerd (${done.length})* ✅\n`+done.map(r=>`• ${ICO[r.type]} ${LAB[r.type]} — ${r.label}${r.ch?` (${fmtY(r.ch.d)})`:""}${r.F.note?` — 📝 ${r.F.note}`:""}`).join("\n");
  if(wait.length) out+=`\n\n*Nog niet te beoordelen (${wait.length})* ⏳\n`+wait.map(r=>`• ${ICO[r.type]} ${LAB[r.type]} — ${r.label}`).join("\n");
  return out;
}
function folReport(){
  const rows=folRows(); let extra=""; try{ extra=localStorage.dpacMktFolExtra||""; }catch(e){}
  let m=document.getElementById("folmodal"); if(!m){ m=document.createElement("div"); m.id="folmodal"; m.className="modal"; document.body.appendChild(m); }
  m.innerHTML=`<div class="modalbox" onclick="event.stopPropagation()"><div class="modalhd"><b>📋 Rapport voor de media buyer</b><span class="sm" onclick="folReportClose()">sluiten ✕</span></div>
    <div class="modalgrid"><div><label>Extra punten (vrij veld, wordt onthouden)</label><textarea id="folextra" rows="4" placeholder="bv. nieuwe video's van Emiel klaar donderdag · TikTok-formulier 'juiste UTM' aan GHL koppelen · …" oninput="folExtra(this.value);folReportRefresh()">${esc(extra)}</textarea></div>
    <div><label>Bericht (bewerkbaar — Slack-opmaak)</label><textarea id="foltxt" rows="18" oninput="this.dataset.edited=1">${esc(folReportText(rows))}</textarea></div></div>
    <div class="modalft"><span class="lbl" id="folcopied"></span><button class="rbtn sm2" onclick="folReportRefresh(true)">↺ Opnieuw genereren</button><button class="rbtn sm2 pri" onclick="folCopy()">Kopieer voor Slack</button></div></div>`;
  m.style.display="flex"; m.onclick=folReportClose;
}
function folReportRefresh(force){ const ta=document.getElementById("foltxt"); if(!ta) return; if(force||!ta.dataset.edited) ta.value=folReportText(folRows()); }
function folReportClose(){ const m=document.getElementById("folmodal"); if(m) m.style.display="none"; }
async function folCopy(){ const ta=document.getElementById("foltxt"); const lb=document.getElementById("folcopied"); try{ await navigator.clipboard.writeText(ta.value); lb.textContent="gekopieerd — plak in Slack"; }catch(e){ ta.select(); document.execCommand("copy"); lb.textContent="gekopieerd (fallback)"; } setTimeout(()=>{ if(lb) lb.textContent=""; },3000); }
// ---- inschrijvingen ----
let sgSort={c:0,d:-1}, sgcSort={k:"sg",d:-1}, sgPlat=null, sgMode="sign", sgNF=false, sgFilt={}, sgfCol=null;
function sgfToggle(i,v){ if(!sgFilt[i]) sgFilt[i]=new Set(); const st=sgFilt[i]; st.has(v)?st.delete(v):st.add(v); if(!st.size) delete sgFilt[i]; drawSign(); }
function sgfClear(i){ delete sgFilt[i]; drawSign(); }
const SGP={meta_fb:["Facebook","#1877f2"],meta_ig:["Instagram","#d62976"],meta_x:["Meta · plaatsing onbekend","#5856d6"],google:["Google","#1f6fd8"],tiktok:["TikTok","#0e9aa7"],niet_betaald:["Niet betaald (organisch/direct)","#8f845e"],onbekend:["Onbekend","#8e8e93"]};
function sgKey(l){ if(l.platform!=="meta") return SGP[l.platform]?l.platform:"onbekend"; const p=(l.placement||"").toLowerCase(); if(p.indexOf("insta")>=0) return "meta_ig"; if(p.indexOf("facebook")>=0||/(^|[^a-z])fb([^a-z]|$)/.test(p)) return "meta_fb"; return "meta_x"; }
function drawSign(){ keepScroll(document.getElementById("signwrap"),drawSignInner); }
function drawSignInner(){
  const w=document.getElementById("signwrap");
  // modus: inschrijvingen (tekendatum) · shows (intakedatum) · intakes gepland (inplandatum)
  const md=l=> sgMode==="sign"?l.sd : sgMode==="shows"?l.id_ : l.pd;
  const MLAB=sgMode==="sign"?"Inschrijvingen":sgMode==="shows"?"Shows":"Intakes gepland";
  const RES1=sgMode==="sign"?"klant":sgMode==="shows"?"show":"geplande intake";
  const all= sgMode==="sign" ? L.filter(l=>l.is_signed&&l.sd>=A&&l.sd<=B&&!l.party)
       : sgMode==="shows" ? L.filter(l=>l.is_show&&l.id_>=A&&l.id_<=B&&!l.party)
       : L.filter(l=>l.pd>=A&&l.pd<=B&&!l.party);
  const rows=sgPlat?all.filter(l=>sgKey(l)===sgPlat):all;
  const asm=FORMS.filter(f=>f.product==="ASM"&&f.d>=A&&f.d<=B);
  // per campagne aggregeren (over de gefilterde set)
  const cg=new Map();
  for(const l of rows){ const k=l.ckey||ck(l.platform,""); if(!cg.has(k)){ const c=l.camp; cg.set(k,{k,platform:l.platform,cid:(l.campaign_id||""),name:c?c.name:(l.platform==="niet_betaald"?"Niet betaald (organisch/direct)":l.platform==="onbekend"?"(bron onbekend)":"(campagne onbekend) · "+PN(l.platform)),ls:[]}); } cg.get(k).ls.push(l); }
  for(const g of cg.values()){ g.n=g.ls.length; g.val=sgMode==="sign"?g.ls.reduce((s,l)=>s+l.value,0):null;
    g.spend=g.cid?spendIn(A,B,r=>r.platform===g.platform&&(r.cid||"")===g.cid).spend:0; g.cpk=g.cid&&g.spend>0?g.spend/g.n:null;
    const cyc=g.ls.filter(l=>l.cd>=0&&md(l)>=l.cd); g.cyc=cyc.length?cyc.reduce((s,l)=>s+(md(l)-l.cd),0)/cyc.length:null;
    const ow=new Map(); g.ls.forEach(l=>{const o=l.owner||"—"; ow.set(o,(ow.get(o)||0)+1);}); g.own=[...ow.entries()].sort((a,b)=>b[1]-a[1]).map(([o,n2])=>o+(n2>1?" "+n2:"")).join(" · ");
    const fb=g.ls.filter(l=>sgKey(l)==="meta_fb").length, ig=g.ls.filter(l=>sgKey(l)==="meta_ig").length;
    g.split=g.platform==="meta"?[fb?"Facebook "+fb:"",ig?"Instagram "+ig:"",(g.n-fb-ig)?"plaatsing onbekend "+(g.n-fb-ig):""].filter(Boolean).join(" · "):""; }
  const camps=[...cg.values()];
  // modus-knoppen
  let h=`<div class="wonchips"><span class="lbl">Wat wil je zien:</span>`+[["sign","🧾 Inschrijvingen"],["shows","👀 Shows"],["gepland","🗓 Intakes gepland"]].map(x=>`<div class="wchip${sgMode===x[0]?" on":""}" onclick="sgMode='${x[0]}';sgNF=false;sgFilt={};sgfCol=null;drawSign()">${x[1]}</div>`).join("")+`<span style="flex:1"></span><span class="lbl">${sgMode==="sign"?"":"snel zien of een advertentie op korte termijn werkt"}</span></div>`;
  // KPI's van deze pagina
  const cycL=rows.filter(l=>l.cd>=0&&md(l)>=l.cd); const cycAvg=cycL.length?Math.round(cycL.reduce((t,l)=>t+(md(l)-l.cd),0)/cycL.length):null;
  const geenForm=sgMode==="sign"?rows.length-rows.filter(l=>l.signed_via==="formulier").length:0;
  h+=`<div class="kpis ikp"><div class="kpi"><b>${rows.length}</b><span>${MLAB} in periode</span></div>`
    +(sgMode==="sign"?`<div class="kpi"><b>${eur0(rows.reduce((t,l)=>t+l.value,0))}</b><span>Waarde</span></div>`:"")
    +`<div class="kpi"><b>${cycAvg==null?"—":cycAvg+" d"}</b><span>Gem. van lead tot ${sgMode==="sign"?"tekenen":sgMode==="shows"?"show":"inplannen"}</span></div>`
    +(sgMode==="sign"?`<div class="kpi kclk ${geenForm?"warnk":""}" onclick="sgNF=!sgNF;drawSign()" title="klik voor de namen"><b>${geenForm}</b><span>Zonder formulier (fasewissel) ⏷</span></div>`:"")
    +(sgMode==="sign"?`<div class="kpi kclk" onclick="document.getElementById('asmblok').scrollIntoView({behavior:'smooth'})" title="klik om ernaartoe te springen"><b>${asm.length}</b><span>All Star (apart — telt hier niet mee)</span></div>`:"")+`</div>`;
  // zonder-formulier detail
  if(sgMode==="sign"&&sgNF){ const nf=rows.filter(l=>l.signed_via!=="formulier");
    h+=`<div class="cmp" style="margin-bottom:12px"><h3>⚠︎ Ingeschreven zonder inschrijfformulier · ${nf.length}</h3>${nf.length?`<table><tr><th>Naam</th><th>Fasewissel naar Agreement Signed</th><th>Eigenaar</th><th>Setter</th></tr>${nf.map(l=>`<tr><td>${ghl(l.contact_id,l.nm)}</td><td>${l.sd>=0?fmt(l.sd):"—"}</td><td>${esc(l.owner||"—")}</td><td>${esc(l.setter||"—")}</td></tr>`).join("")}</table><p class="note" style="margin:8px 0 0">Voor deze mensen staat géén PA-inschrijfformulier in GHL gekoppeld (ook niet via e-mail/telefoon). Check in GHL of het formulier onder een ander contact hangt, of dat de fase handmatig is versleept.</p>`:`<div class="empty">Alles heeft een formulier. 👌</div>`}</div>`; }
  // platform-chips met FB/IG-splitsing
  const pp=new Map(); all.forEach(l=>{const k=sgKey(l); if(!pp.has(k)) pp.set(k,{n:0,v:0}); const o=pp.get(k); o.n++; o.v+=l.value;});
  h+=`<div class="wonchips"><span class="lbl">Waar komen ze vandaan:</span><div class="wchip sm${sgPlat==null?" on":""}" onclick="sgPlat=null;drawSign()">Alles <span class="n">${all.length}</span></div>`+[...pp.entries()].sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>`<div class="wchip sm${sgPlat===k?" on":""}" onclick="sgPlat=${jq(k)};drawSign()" ${sgMode==="sign"?`title="${eur0(o.v)} waarde"`:""}><span class="dot" style="background:${SGP[k][1]}"></span>${esc(SGP[k][0])} <span class="n">${o.n}</span></div>`).join("")+`</div>`;
  // uit welke advertentie komen ze — blokjes met aantal
  const byAd=new Map();
  for(const l of rows){ const key=l.adObj?("a|"+(l.adObj.adName||l.adObj.adId)+"|"+(l.camp?l.camp.name:"")):("c|"+(l.camp?l.camp.name:PN(l.platform))+"|");
    if(!byAd.has(key)) byAd.set(key,{ad:l.adObj?(l.adObj.adName||l.adObj.adId):null,camp:l.camp?l.camp.name:(l.platform==="niet_betaald"?"Niet betaald (organisch/direct)":PN(l.platform)),platform:l.platform,n:0,val:0});
    const t=byAd.get(key); t.n++; t.val+=sgMode==="sign"?l.value:0; }
  const tiles=[...byAd.values()].sort((a,b)=>b.n-a.n);
  h+=`<div class="cmp"><h3>Uit welke advertentie komen ze <span class="chsub">gesorteerd · hoogste eerst</span></h3><div class="adlist">`+(tiles.length?tiles.map(t=>`<div class="adli"><span class="cnt">${t.n}</span><div class="tx"><b title="${esc(t.ad||t.camp)}">${esc(t.ad||"(geen advertentie bekend)")}</b><small><span class="dot" style="background:${PC(t.platform)}"></span>${esc(PN(t.platform))} › ${esc(t.camp)}${sgMode==="sign"&&t.val?" · "+eur0(t.val):""}</small></div></div>`).join(""):`<div class="empty">Geen ${MLAB.toLowerCase()} in deze periode.</div>`)+`</div><p class="note" style="margin:10px 0 0">Het grote cijfer = aantal ${MLAB.toLowerCase()} uit die advertentie; eronder altijd platform › campagne.</p></div>`;
  // goedkoopste campagnes
  const cheap=camps.filter(g=>g.cpk!=null).sort((a,b)=>a.cpk-b.cpk);
  h+=`<div class="cmp" style="margin-top:12px"><h3>💶 Goedkoopste campagnes per ${RES1}</h3>`+(cheap.length?cheap.slice(0,10).map((g,i)=>`<div class="lr"><span title="${esc(g.name)}">${esc(g.name)}</span><i><b style="width:${Math.max(4,Math.round(cheap[0].cpk/g.cpk*100))}%"></b></i><em style="width:auto;white-space:nowrap">${eur0(g.cpk)} · ${g.n}</em></div>`).join(""):`<div class="empty">Geen campagnes met kosten én ${MLAB.toLowerCase()} in deze periode.</div>`)+`<p class="note" style="margin:8px 0 0">Kosten per ${RES1} = kosten van de campagne in de periode ÷ ${MLAB.toLowerCase()} uit die campagne. Langere balk = goedkoper.</p></div>`;
  // per campagne (sorteerbaar)
  const ccols=[
    {k:"name",t:"Campagne",v:g=>g.name.toLowerCase(),f:g=>`<span class="dot" style="background:${PC(g.platform)}"></span><span class="campfull"><b>${esc(g.name)}</b></span>${g.split?`<br><small style="margin-left:14px">${g.split}</small>`:""}`,cls:"nmw"},
    {k:"sg",t:MLAB,v:g=>g.n,f:g=>`<b>${g.n}</b>`},
    ...(sgMode==="sign"?[{k:"val",t:"Waarde",v:g=>g.val,f:g=>eur0(g.val)}]:[]),
    {k:"spend",t:"Kosten (periode)",v:g=>g.spend,f:g=>g.cid?eur0(g.spend):"—"},
    {k:"cpk",t:"Kosten / "+RES1,v:g=>g.cpk,f:g=>g.cpk==null?"—":eur0(g.cpk),cf:g=>sgMode!=="sign"||g.cpk==null?"":(g.cpk<=MAXCPK()*0.85?"good":g.cpk>MAXCPK()*1.25?"bad":"warn")},
    {k:"cyc",t:"Dagen tot "+(sgMode==="sign"?"tekenen":sgMode==="shows"?"show":"inplannen"),v:g=>g.cyc,f:g=>g.cyc==null?"—":Math.round(g.cyc)+" d",tip:"gemiddeld aantal dagen vanaf binnenkomst van de lead"},
    {k:"own",t:"Eigenaar(s)",v:g=>g.own.toLowerCase(),f:g=>esc(g.own),cls:"nmw2"}];
  const cs=sgcSort; const ccol=ccols.find(c=>c.k===cs.k)||ccols[1];
  camps.sort((x,y)=>{ const a=ccol.v(x),b=ccol.v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*cs.d; });
  h+=`<div class="cmp" style="margin-top:12px"><h3>Per campagne</h3><div style="overflow:auto"><table><tr>`+ccols.map(c=>`<th ${c.tip?`title="${esc(c.tip)}"`:""}><span class="sortl" onclick="sgcSort.k==='${c.k}'?sgcSort.d=-sgcSort.d:(sgcSort={k:'${c.k}',d:-1});drawSign()">${c.t} <span class="arr">${cs.k===c.k?(cs.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+(camps.length?camps.map(g=>`<tr>`+ccols.map(c=>`<td class="${c.cls||""} ${c.cf?c.cf(g):""}">${c.f(g)}</td>`).join("")+`</tr>`).join(""):`<tr><td colspan="${ccols.length}" class="empty">Geen ${MLAB.toLowerCase()} in deze periode.</td></tr>`)+`</table></div></div>`;
  // individuele lijst
  const cols=[
    {t:sgMode==="sign"?"Tekendatum":sgMode==="shows"?"Intakedatum":"Ingepland op",v:l=>md(l),k:l=>fmt(md(l))+(sgMode==="sign"&&l.signed_via==="fasewissel"?" <small title='geen formulier; datum = fasewissel'>⚠︎</small>":"")},
    {t:"Naam",v:l=>l.nm.toLowerCase(),k:l=>ghl(l.contact_id,l.nm)},
    ...(sgMode==="sign"?[{t:"Waarde",v:l=>l.value,k:l=>eur0(l.value)}]:[]),
    {t:"Kosten deze "+RES1,v:l=>{const g=cg.get(l.ckey); return g&&g.cpk!=null?g.cpk:null;},k:l=>{const g=cg.get(l.ckey); return g&&g.cpk!=null?`<span title="kosten per ${RES1} van deze campagne in de gekozen periode">${eur0(g.cpk)}</span>`:"—";}},
    {t:"Eigenaar",v:l=>l.owner||"",k:l=>`<b>${esc(l.owner||"—")}</b>`,fv:l=>l.owner||"—"},
    {t:"Dagen sinds lead",v:l=>l.cd>=0?md(l)-l.cd:null,k:l=>l.cd>=0?`${md(l)-l.cd} d <small>${fmt(l.cd)}</small>`:"—"},
    {t:"Platform",v:l=>sgKey(l),k:l=>{const kk=sgKey(l); return `<span class="dot" style="background:${SGP[kk][1]}"></span>${esc(SGP[kk][0])}`;},fv:l=>SGP[sgKey(l)][0]},
    {t:"Campagne",v:l=>l.camp?l.camp.name:"",k:l=>`<span class="campfull"><small>${esc(l.camp?l.camp.name:(l.utm_campaign||"—"))}</small></span>`,cls:"nmw",fv:l=>l.camp?l.camp.name:(l.utm_campaign||"—")},
    {t:"Advertentie",v:l=>l.adObj?l.adObj.adName:"",k:l=>`<small>${esc(l.adObj?(l.adObj.adName||l.adObj.adId):(l.utm_content||"—"))}</small>`,fv:l=>l.adObj?(l.adObj.adName||l.adObj.adId):(l.utm_content||"—")},
    {t:"Bron",v:l=>l.bron,k:l=>`<small class="${l.hard?"hardb":"softb"}">${esc(BRON[l.bron]||"—")}</small>`,fv:l=>BRON[l.bron]||"—"},
    {t:"Setter",v:l=>l.setter||"",k:l=>esc(l.setter||"—"),fv:l=>l.setter||"—"},
    ...(sgMode==="sign"?[{t:"All Star",v:l=>l.asm?1:0,k:l=>l.asm?`⭐️ ${l.asd>=0?fmt(l.asd):""}`:"—"}]:[])];
  const s=sgSort; const sc=cols[Math.min(s.c,cols.length-1)];
  const FE=Object.entries(sgFilt).filter(([i])=>cols[+i]&&cols[+i].fv);
  const rowsF=rows.filter(l=>FE.every(([i,st])=>st.has(cols[+i].fv(l))));
  const sorted=[...rowsF].sort((x,y)=>{ const a=sc.v(x),b=sc.v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*s.d; });
  let sgfPanel="";
  if(sgfCol!=null&&cols[sgfCol]&&cols[sgfCol].fv){ const fc=cols[sgfCol];
    const base=rows.filter(l=>FE.every(([i,st])=>+i===sgfCol||st.has(cols[+i].fv(l))));
    const cnt=new Map(); base.forEach(l=>{ const vv=fc.fv(l); cnt.set(vv,(cnt.get(vv)||0)+1); });
    const sel2=sgFilt[sgfCol];
    sgfPanel=`<div class="wonchips" style="margin:8px 0 4px"><span class="lbl">Filter ${fc.t}:</span><div class="wchip sm${sel2?"":" on"}" onclick="sgfClear(${sgfCol})">Alles <span class="n">${base.length}</span></div>`
      +[...cnt.entries()].sort((a,b)=>b[1]-a[1]).map(([vv,c2])=>`<div class="wchip sm${sel2&&sel2.has(vv)?" on":""}" onclick="sgfToggle(${sgfCol},${jq(vv)})" title="${esc(vv)}"><span style="display:inline-block;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle">${esc(vv)}</span> <span class="n">${c2}</span></div>`).join("")+`</div>`; }
  h+=`<div class="cmp" style="margin-top:12px"><h3>Alle ${MLAB.toLowerCase()}${sgPlat?` · ${esc(SGP[sgPlat][0])}`:""}${sorted.length!==rows.length?` · <span style="color:var(--plan)">${sorted.length} van ${rows.length} (gefilterd)</span> <a href="#" onclick="sgFilt={};sgfCol=null;drawSign();return false" style="color:var(--plan);font-size:12px">filters wissen ✕</a>`:""}</h3>${sgfPanel}<div style="overflow:auto"><table><tr>`+cols.map((c,i)=>`<th ${c.tip?`title="${esc(c.tip)}"`:""}><span class="sortl" onclick="sgSort.c===${i}?sgSort.d=-sgSort.d:(sgSort={c:${i},d:1});drawSign()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span>${c.fv?`<span class="fbtn${sgFilt[i]?" on":""}" title="filter op ${c.t} (met aantallen)" onclick="sgfCol=sgfCol===${i}?null:${i};drawSign()">⏷</span>`:""}</th>`).join("")+`</tr>`+sorted.map(l=>`<tr>`+cols.map(c=>`<td class="${c.cls||""}">${c.k(l)}</td>`).join("")+`</tr>`).join("")+`${sorted.length?"":`<tr><td colspan="${cols.length}" class="empty">Geen ${MLAB.toLowerCase()}${Object.keys(sgFilt).length?" met dit filter":""} in deze periode.</td></tr>`}</table></div></div>`;
  // All Star apart
  if(sgMode==="sign") h+=`<div class="cmp" id="asmblok" style="margin-top:12px"><h3>⭐️ All Star Management (upsell) · ${asm.length} <span class="chsub">apart gehouden — telt niet mee in de PA-cijfers hierboven</span></h3>${asm.length?`<table><tr><th>Datum</th><th>Naam</th><th>Variant</th><th>Waarde</th><th>Betaaloptie</th></tr>${asm.map(f=>`<tr><td>${fmt(f.d)}</td><td>${ghl(f.contact_id,f.name)}</td><td>${esc(f.variant||"—")}</td><td>${eur0(f.value)}</td><td><small>${esc(f.pay||"—")}</small></td></tr>`).join("")}</table>`:`<div class="empty">Geen All Star-inschrijvingen in deze periode.</div>`}</div>`;
  h+=`<p class="note">${sgMode==="sign"?`Tekendatum = datum van het inschrijfformulier (GHL). Waarde uit de betaaloptie: € 6.800 (termijnen of factuur) · € 6.300 (direct afrekenen — € 500 korting, klopt dus) · € 6.595 (€ 205 korting). ⚠︎ = Agreement Signed zonder gevonden formulier; datum = fasewissel.`:sgMode==="shows"?`Shows op intakedatum in de periode — zo zie je op korte termijn welke advertentie mensen levert die ook echt komen opdagen.`:`Intakes gepland op inplandatum in de periode — de snelste indicator of een advertentie werkt.`} Facebook/Instagram-splitsing komt uit de plaatsing die GHL meekreeg; kosten zijn per campagne (Meta splitst kosten niet per plaatsing in onze data).</p>`;
  w.innerHTML=h;
}

// ---- datakwaliteit ----
function drawData(){
  const w=document.getElementById("datawrap");
  const months=new Map(); for(const l of L){ if(l.cd<0) continue; const k=d2s(l.cd).getFullYear()+"-"+String(d2s(l.cd).getMonth()+1).padStart(2,"0"); if(!months.has(k)) months.set(k,[]); months.get(k).push(l); }
  const cQ=D.counts||{}; const noFormQ=L.filter(l=>l.is_signed&&l.signed_via!=="formulier");
  const unmQ=FORMS.filter(f=>!f.contact_id);
  let h=`<div class="cmp" style="margin-bottom:12px"><h3>🔧 Actiepunten (to-dolijst)</h3><table class="todos">
    <tr><td><span class="tdo">TO DO</span></td><td><b>Media buyer</b></td><td><b>Meta:</b> de ad "Video 1 | hook 4 | hobby je werk" op dynamische URL-parameters zetten — exacte copy-paste-template staat in de UTM-checklist. Rest van Meta staat sinds ~7 aug goed.</td></tr>
    <tr><td><span class="tdo">TO DO</span></td><td><b>Abel</b></td><td><b>TikTok-leadformulier "2024 new form juiste UTM"</b> (sinds 31 aug) is niet aan GHL gekoppeld. In GHL → Integrations → TikTok Lead Ads → Map fields: dát formulier koppelen (voornaam, achternaam, e-mail, telefoon — meer kan daar niet). De leads van 31 aug–2 sep staan inmiddels wél in de pijplijn (tag "backfill 3 sep", nog geen eigenaar → toewijzen en bellen).</td></tr>
    <tr><td><span class="tdo">TO DO</span></td><td><b>Media buyer</b></td><td><b>TikTok:</b> álle lopende ads sturen geen campagne-/ad-id's mee — UTM-template instellen (staat in de checklist, met macro's). Leadformulier-leads hebben geen URL, dus daar helpt alleen een koppeling die campaign_name/adgroup_name/ad_name uit de leadpayload in de UTM-velden zet.</td></tr>
    <tr><td><span class="tok">OK</span></td><td><b>—</b></td><td><b>Verliesreden "Zegt niets te hebben ingevuld"</b> (nieuw in GHL sinds 3 aug, ±50 leads) staat sinds 3 sep in de labeltabel — telt nu gewoon mee bij de verliesredenen.</td></tr>
    <tr><td><span class="tdo">TO DO</span></td><td><b>Media buyer</b></td><td><b>Vaste regel:</b> elke nieuwe advertentie éérst URL-parameters checken + testlead doen (2 min, stappen in de checklist), dán pas live.</td></tr>
    <tr><td><span class="tok">OK</span></td><td><b>—</b></td><td><b>Google:</b> staat goed (Search met ad-id; PMax kan technisch geen ad-id meesturen). Alleen bewaken bij nieuwe campagnes.</td></tr>
    <tr><td><span class="tdo">TO DO</span></td><td><b>Abel</b></td><td><b>2 inschrijvingen van 19 aug zonder formulier</b> in GHL nakijken (zie blok hieronder) — hangt het formulier onder een ander contact?</td></tr>
    <tr><td><span class="tdo">TO DO</span></td><td><b>Claude</b></td><td><b>Inschrijfformulieren realtime</b> naar Supabase via webhook (nu 1× per nacht).</td></tr>
    <tr><td><span class="tdo">TO DO</span></td><td><b>Claude</b></td><td><b>gclid/fbclid bewaren</b> voor offline-conversies terugsturen naar Google/Meta.</td></tr>
  </table></div><div class="two"><div class="cmp ${noFormQ.length?"":""}"><h3>⚠️ Agreement Signed zonder inschrijfformulier · ${noFormQ.length}</h3>${noFormQ.length?`<table><tr><th>Naam</th><th>Fasewissel</th><th>Eigenaar</th></tr>${noFormQ.map(l=>`<tr><td>${ghl(l.contact_id,l.nm)}</td><td>${l.sd>=0?fmt(l.sd):"—"}</td><td>${esc(l.owner||"—")}</td></tr>`).join("")}</table>`:`<div class="empty">Alles gekoppeld. 👌</div>`}</div>
    <div class="cmp"><h3>⚠️ Formulieren zonder contact-koppeling · ${unmQ.length}</h3>${unmQ.length?`<table><tr><th>Datum</th><th>Naam</th><th>Product</th></tr>${unmQ.map(f=>`<tr><td>${fmt(f.d)}</td><td>${esc(f.name)}</td><td>${esc(f.product)}</td></tr>`).join("")}</table>`:`<div class="empty">Alle formulieren zijn aan een contact gekoppeld.</div>`}</div></div>`;
  h+=`<div class="cmp" style="margin-top:12px"><h3>Attributiedekking per maand (leads op binnenkomst)</h3><table><tr><th>Maand</th><th>Leads</th><th>Hard (UTM/ad-id)</th><th>Zacht (GHL klik)</th><th>Afgeleid</th><th>Niet betaald</th><th>Onbekend</th><th>Met campagne</th><th>Met advertentie</th></tr>`;
  for(const [k,ls] of [...months.entries()].sort()){ const n=ls.length; const c=f=>ls.filter(f).length; const p=x=>`${x} <small>${fpct(x,n)}</small>`;
    h+=`<tr><td><b>${k}</b></td><td>${n}</td><td>${p(c(l=>l.hard))}</td><td>${p(c(l=>l.bron==="ghl_klik"))}</td><td>${p(c(l=>l.bron==="afgeleid"))}</td><td>${p(c(l=>l.bron==="niet_betaald"))}</td><td class="${c(l=>l.bron==="onbekend")/n>0.1?"bad":""}">${p(c(l=>l.bron==="onbekend"))}</td><td>${p(c(l=>!!l.camp))}</td><td>${p(c(l=>!!l.adObj))}</td></tr>`; }
  h+=`</table></div>`;
  const c=D.counts||{};
  h+=`<div class="cmp" style="margin-top:12px"><h3>Bronnen</h3><table><tr><td>Spend-data t/m</td><td><b>${c.spend_last?fmtY(dOf(c.spend_last)):"— (nog geen spend geladen)"}</b></td></tr><tr><td>Campagne-dagen / ad-dagen</td><td>${c.campaign_days||0} / ${c.ad_days||0}</td></tr><tr><td>Leads met GHL-attributie opgehaald</td><td>${c.attr||0}</td></tr><tr><td>Inschrijfformulieren</td><td>${c.forms||0} (PA ${FORMS.filter(f=>f.product==="PA").length} · ASM ${FORMS.filter(f=>f.product==="ASM").length})</td></tr><tr><td>Laatste stand</td><td>${document.getElementById("gen").textContent}</td></tr></table></div>`;
  h+=`<p class="note">Bekende gaten (uit de overdracht): Google stuurde tot 6 aug <code>utm_campaign={campaignname}</code> letterlijk mee — campagne wordt dan herleid uit het advertentie-id in utm_content; PMax stuurt geen advertentie-id (afgeleid op looptijd); Meta Instant Forms hebben soms geen UTM's (GHL klik-attributie vangt een deel op); 8–22 mei 2026 viel de UTM-doorgifte weg. gclid/fbclid worden nog niet bewaard (staan wél in de GHL-contactattributie — volgende stap voor offline-conversies).</p>`;
  w.innerHTML=h;
}

// ---- render ----
function render(){
  document.getElementById("dpLabel").textContent = fmtY(A)+" – "+fmtY(B);
  drawTabs(); drawKpis();
  document.getElementById("kpis").style.display = tab==="tree"?"":"none";
  const ids={tree:"treewrap",best:"bestwrap",trend:"trendwrap",adv:"advwrap",fol:"folwrap",sign:"signwrap",data:"datawrap"};
  for(const k in ids) document.getElementById(ids[k]).style.display = tab===k?"block":"none";
  if(tab==="tree") drawTree(); if(tab==="best") drawBest(); if(tab==="trend") drawTrend(); if(tab==="adv") drawAdvice(); if(tab==="fol") drawFollow(); if(tab==="sign") drawSign(); if(tab==="data") drawData();
  drawDetail();
  if(window.parent!==window){ try{ window.parent.postMessage({dpacMkt:"h",h:document.body.scrollHeight},"*"); }catch(e){} }
}
const jq = s => JSON.stringify(s).replace(/"/g,"&quot;");
let _rz=null; window.addEventListener("resize",()=>{ if(!D) return; clearTimeout(_rz); _rz=setTimeout(()=>{ if(tab==="trend") drawTrend(); },250); });
setTimeout(()=>{ const g=document.getElementById("gcode"); if(g && document.getElementById("gate").style.display!=="none") g.focus(); },50);
try{ const c=sessionStorage.dpacMktCode; if(c) gTry(c, true); else if(location.search.indexOf("local=1")>=0) gTry("", true); }catch(e){}
