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
let MODE="periode";          // periode (leads op leaddatum, inschrijvingen op tekendatum) · cohort · gebeurd
let GROUP="tree";            // tree (platform › campagne › adset › ad) · utm_source · placement · bron · temperature · owner · setter
let PARTY=false;             // party/vacature-campagnes meetellen in totalen
let open=new Set(["p:meta","p:google"]), sortKey="spend", sortDir=-1, detail=null, trendBy="week", trendPlat=null, trendMetric="cpk";
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
  CD=(D.campaign_days||[]).map(r=>({d:dOf(r[0]),platform:r[1],cid:r[2],spend:+r[3]||0,clicks:+r[4]||0,imps:+r[5]||0,isr:r[6]==null?null:+r[6],conv:r[7]==null?null:+r[7],pl:r[8]==null?null:+r[8]}));
  AD=(D.ad_days||[]).map(r=>({d:dOf(r[0]),ad:ADS[r[1]],spend:+r[2]||0,clicks:+r[3]||0,imps:+r[4]||0})).filter(x=>x.ad);
  L=objs(D.lead_cols,D.leads);
  for(const l of L){ l.nm=cap(l.name); l.cd=dOf(l.created_on); l.pd=dOf(l.planned_on); l.id_=dOf(l.intake_on); l.sd=dOf(l.signed_on); l.asd=dOf(l.asm_on);
    l.is_show=!!l.is_show; l.is_noshow=!!l.is_noshow; l.is_signed=!!l.is_signed; l.hard=!!l.hard; l.asm=!!l.asm; l.lost=l.status==="lost";
    l.platform=l.platform||"onbekend"; l.ckey=ck(l.platform,l.campaign_id); l.camp=CAMPS.get(l.ckey)||null; l.party=!!(l.camp&&l.camp.party);
    l.adObj=l.ad_id? (ADIDX.get([l.platform,l.campaign_id,l.adset_id||"",l.ad_id].join("|"))||ADS.find(a=>a.platform===l.platform&&a.adId===l.ad_id)||null) : null;
    l.value=+(l.contract_value||OMZET()); }
  FORMS=(D.forms||[]).map(f=>({...f,d:dOf(f.on)}));
  const _n=new Date(); TODAY=s2d(new Date(_n.getFullYear(),_n.getMonth(),_n.getDate())); NOW=TODAY;
  const g=new Date(D.gen);
  document.getElementById("gen").textContent=isNaN(g)?"—":(g.getDate()+" "+MND[g.getMonth()]+" "+String(g.getHours()).padStart(2,"0")+":"+String(g.getMinutes()).padStart(2,"0"));
  const tx=document.getElementById("rtxt"); if(tx&&!tx.textContent) tx.textContent=L.length+" leads · "+CAMPS.size+" campagnes · spend t/m "+(D.counts&&D.counts.spend_last?fmt(dOf(D.counts.spend_last)):"—");
  A=NOW-29; B=NOW;
  render();
}

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
          const an={key:"s:"+k+"|"+ak,level:2,label:adsIn[0].adsetName||(ak?("adset "+ak):"(zonder adset)"),platform:p,cid,leads:al,sp:asp,children:[]};
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
function sortNodes(ns,top){ const f=SORTS[sortKey]||SORTS.spend; if(!(top&&GROUP==="tree")) ns.sort((x,y)=>{ const a=f(x),b=f(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a-b)*sortDir; }); ns.forEach(n=>sortNodes(n.children,false)); }

// ---- KPI's ----
function drawKpis(){
  const k=document.getElementById("kpis");
  const all=L.filter(l=>PARTY||!l.party); const sp=spendIn(A,B,r=>PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party);
  const m=metrics(all,sp,A,B);
  const len=B-A+1, pA=A-len, pB=A-1; const pm=metrics(all,spendIn(pA,pB,r=>PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party),pA,pB);
  const party=spendIn(A,B,r=>(CAMPS.get(ck(r.platform,r.cid))||{}).party);
  const asm=L.filter(l=>l.asm&&l.asd>=A&&l.asd<=B).length;
  const dlt=(v,p,fmtF,lowGood)=>{ if(v==null||p==null) return ""; const d=v-p; const cls= d===0?"eq":((d>0)!==!!lowGood?"up":"dn"); return `<i class="dlt ${cls}" title="vorige periode (${fmtY(pA)} t/m ${fmtY(pB)}): ${fmtF(p)}">${d>0?"▲ ":d<0?"▼ ":"= "}${fmtF(Math.abs(d))}</i>`; };
  const cpkCls=m.cpk==null?"":(m.cpk<=MAXCPK()*0.85?"good":m.cpk>MAXCPK()*1.25?"bad":"warn");
  const items=[
    [eur0(m.spend),"Advertentiekosten",`excl. party/vacature (${eur0(party.spend)})`,dlt(m.spend,pm.spend,eur0,true)],
    [m.n,"Leads binnengekomen",null,dlt(m.n,pm.n,v=>v)],
    [m.cpl==null?"—":eur0(m.cpl),"Kosten per lead",null,dlt(m.cpl,pm.cpl,eur0,true)],
    [m.g,"Intake gepland",m.plan!=null?`${r1(m.plan)}% van de leads`:null,dlt(m.g,pm.g,v=>v)],
    [m.sh,"Shows",m.show!=null?`${r1(m.show)}% van de intakes`:null,dlt(m.sh,pm.sh,v=>v)],
    [m.sg,"Inschrijvingen",MODE==="cohort"?"uit dit cohort":"op tekendatum in periode",dlt(m.sg,pm.sg,v=>v)],
    [m.cpk==null?"—":eur0(m.cpk),"Kosten per klant",`plafond ${eur0(MAXCPK())} (25% van ${eur0(OMZET())})`,dlt(m.cpk,pm.cpk,eur0,true),cpkCls],
    [m.pctOmzet==null?"—":r1(m.pctOmzet)+"%","% van omzet per student",m.roas!=null?`ROAS ${r1(m.roas)}×`:null,""],
    [eur0(m.omzet),"Omzet uit inschrijvingen",asm?`+ ${asm} All Star-upsell${asm===1?"":"s"}`:null,dlt(m.omzet,pm.omzet,eur0)],
  ];
  k.innerHTML=items.map(x=>`<div class="kpi ${x[4]||""}" ${x[2]?`title="${esc(x[2])}"`:""}><b>${x[0]}</b><span>${x[1]}</span>${x[2]?`<small>${esc(x[2])}</small>`:""}${x[3]||""}</div>`).join("");
}

// ---- tabs ----
function drawTabs(){
  const el=document.getElementById("tabs"); el.innerHTML="";
  [["tree","🌳 Kanalen & ads"],["best","🏆 Beste ads"],["trend","📈 Trend"],["adv","🧭 Wat moet ik veranderen"],["sign","🧾 Inschrijvingen"],["data","🧪 Datakwaliteit"]].forEach(([id,lab])=>{ const t=document.createElement("div"); t.className="tab"+(tab===id?" on":""); t.textContent=lab; t.onclick=()=>{tab=id;detail=null;render();}; el.appendChild(t); });
  const mb=document.getElementById("modebar"); mb.innerHTML=`<div class="modesw" title="Periode: leads op leaddatum, inschrijvingen op tekendatum (advies: zo zie je snel wat een campagne oplevert). Cohort: alles over de leads die in de periode binnenkwamen. Gebeurd: wat er in de periode gebeurde (gepland/intake/show/teken op hun eigen datum).">${[["periode","Periode"],["cohort","Cohort"],["gebeurd","Gebeurd"]].map(x=>`<span class="${MODE===x[0]?"on":""}" onclick="MODE='${x[0]}';detail=null;render()">${x[1]}</span>`).join("")}</div>`;
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
  {k:"cpk",t:"Kosten / klant",f:m=>m.cpk==null?"—":eur0(m.cpk),w:"num",cls:m=>m.cpk==null?"":(m.cpk<=MAXCPK()*0.85?"good":m.cpk>MAXCPK()*1.25?"bad":"warn")},
  {k:"hard",t:"Hard bewijs",f:m=>m.hard==null?"—":r1(m.hard)+"%",w:"pct",tip:"aandeel leads met harde attributie (UTM / ad-id / campagne-id)"},
];
function toggleNode(k){ open.has(k)?open.delete(k):open.add(k); drawTree(); }
function setSort(k){ if(sortKey===k) sortDir=-sortDir; else { sortKey=k; sortDir=-1; } drawTree(); }
function rowHtml(n,depth){
  const m=n.m; const has=n.children&&n.children.length; const isOpen=open.has(n.key);
  const pad=10+depth*22;
  let h=`<tr class="lv${n.level}${isOpen?" open":""}${n.camp&&n.camp.party?" party":""}${has?" has":""}"${has?` onclick="toggleNode(${jq(n.key)})" title="${isOpen?"klik om in te klappen":"klik om uit te klappen"}"`:""}><td class="nm" style="padding-left:${pad}px">${has?`<span class="tg"><i class="chev${isOpen?" open":""}"></i></span>`:`<span class="tg leaf"></span>`}${n.color?`<span class="dot" style="background:${n.color}"></span>`:""}<span class="lab" title="${esc(n.label)}">${esc(n.label)}</span>${n.sub?`<small>${esc(n.sub)}</small>`:""}${n.key.startsWith("c:")&&n.cid?`<small class="isr" title="zoekvertoningsaandeel (Google)">${(()=>{const v=isr(A,B,n.cid);return v==null?"":"ISR "+Math.round(v*100)+"%";})()}</small>`:""}</td>`;
  for(const c of COLS){ const v=c.f(m); const cl=c.cls?c.cls(m):""; const clk=c.click&&(+v>0)?` class="clk ${c.w} ${cl}" onclick="event.stopPropagation();showDetail(${jq(n.key)},'${c.click}')" title="klik voor de namen"`:` class="${c.w} ${cl}"`;
    h+=`<td${clk}><b>${v}</b>${c.sub?`<small>${c.sub(m)}</small>`:""}</td>`; }
  h+=`</tr>`;
  if(has&&isOpen) for(const c of n.children) h+=rowHtml(c,depth+1);
  return h;
}
let TREE=[];
function drawTree(){
  const w=document.getElementById("treewrap");
  TREE = GROUP==="tree"? buildTree(A,B) : groupFlat(A,B);
  TREE.forEach(n=>decorate(n,A,B)); sortNodes(TREE,true);
  let h=`<div class="wonchips"><div class="wchip sm" onclick="open=new Set(TREE.flatMap(n=>[n.key,...n.children.map(c=>c.key)]));drawTree()">alles open</div><div class="wchip sm" onclick="open=new Set();drawTree()">alles dicht</div><span style="flex:1"></span><div class="wchip sm${PARTY?" on":""}" onclick="PARTY=!PARTY;render()" title="party-/vacature-/verkoopcampagnes meetellen">🎉 Party meetellen</div></div>`;
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
let bestSort={k:"score",d:-1}, bestAll=false, bestLvl="ad";
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
function scoreCell(sc){ if(sc==null) return `<span class="scorep s0" title="minder dan € 100 kosten en minder dan 3 leads — te weinig om eerlijk te beoordelen">te weinig data</span>`;
  const cl=sc>=70?"s4":sc>=45?"s3":sc>=25?"s2":"s1", lab=sc>=70?"top":sc>=45?"goed":sc>=25?"matig":"slecht";
  return `<span class="scorep ${cl}">${sc} · ${lab}</span>`; }
function drawBest(){
  const w=document.getElementById("bestwrap");
  const rows=[];
  if(bestLvl==="ad"){
    for(const x of ADS){ if(x.platform==="onbekend"||x.platform==="niet_betaald") continue; const c=CAMPS.get(ck(x.platform,x.cid)); if(c&&c.party&&!PARTY) continue;
      const ls=L.filter(l=>l.adObj===x&&(PARTY||!l.party)); const sp=spendAds(A,B,y=>y===x); const m=metrics(ls,sp,A,B);
      if(m.n<1&&m.spend<0.5) continue; rows.push({label:x.adName||("ad "+(x.adId||"?")),camp:c?c.name:(x.cid||"—"),platform:x.platform,m,score:perfScore(m)}); }
  } else {
    for(const [k,c] of CAMPS){ if(c.party&&!PARTY) continue;
      const ls=L.filter(l=>l.ckey===k&&(PARTY||!l.party)); const sp=spendIn(A,B,r=>r.platform===c.platform&&(r.cid||"")===(c.id||"")); const m=metrics(ls,sp,A,B);
      if(m.n<1&&m.spend<0.5) continue; rows.push({label:c.name,camp:"",platform:c.platform,m,score:perfScore(m)}); }
  }
  const cols=[
    {k:"label",t:bestLvl==="ad"?"Advertentie":"Campagne",v:r=>r.label.toLowerCase(),f:r=>`<div class="adnm" title="${esc(r.label)}${r.camp?" — "+esc(r.camp):""}"><b><span class="dot" style="background:${PC(r.platform)}"></span>${esc(r.label)}</b>${r.camp?`<small>${esc(r.camp)}</small>`:""}</div>`,cls:"nmw"},
    {k:"score",t:"Prestatie",v:r=>r.score,f:r=>scoreCell(r.score),tip:"0–100: kosten per klant laag (max 60) + genoeg klanten om erop te vertrouwen (max 20) + intakes en shows per uitgegeven euro (max 20)"},
    {k:"spend",t:"Kosten",v:r=>r.m.spend,f:r=>eur0(r.m.spend)},
    {k:"n",t:"Leads",v:r=>r.m.n,f:r=>r.m.n},
    {k:"cpl",t:"CPL",v:r=>r.m.cpl,f:r=>r.m.cpl==null?"—":eur0(r.m.cpl)},
    {k:"g",t:"Intakes gepland (SQL)",v:r=>r.m.g,f:r=>r.m.g},
    {k:"sh",t:"Shows",v:r=>r.m.sh,f:r=>r.m.sh},
    {k:"sg",t:"Inschrijvingen",v:r=>r.m.sg,f:r=>`<b>${r.m.sg}</b>`},
    {k:"sign",t:"Sign %",v:r=>r.m.sign,f:r=>r.m.sign==null?"—":r1(r.m.sign)+"%"},
    {k:"cpk",t:"Kosten / klant",v:r=>r.m.cpk,f:r=>r.m.cpk==null?"—":eur0(r.m.cpk),cf:r=>r.m.cpk==null?"":(r.m.cpk<=MAXCPK()*0.85?"good":r.m.cpk>MAXCPK()*1.25?"bad":"warn")},
  ];
  const s=bestSort; const col=cols.find(c=>c.k===s.k)||cols[1];
  rows.sort((x,y)=>{ const a=col.v(x),b=col.v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*s.d; });
  const LIMN=bestAll?rows.length:40;
  let h=`<div class="wonchips">`+[["ad","Per advertentie"],["camp","Per campagne"]].map(x=>`<div class="wchip sm${bestLvl===x[0]?" on":""}" onclick="bestLvl='${x[0]}';drawBest()">${x[1]}</div>`).join("")+`<span style="flex:1"></span><span class="lbl">klik op een kolomkop om te sorteren</span></div>`;
  h+=`<div class="wontbl"><table><tr>`+cols.map(c=>`<th ${c.tip?`title="${esc(c.tip)}"`:""}><span class="sortl" onclick="bestSort.k==='${c.k}'?bestSort.d=-bestSort.d:(bestSort={k:'${c.k}',d:-1});drawBest()">${c.t} <span class="arr">${s.k===c.k?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`
    + rows.slice(0,LIMN).map(r=>`<tr>`+cols.map(c=>`<td class="${c.cls||""} ${c.cf?c.cf(r):""}">${c.f(r)}</td>`).join("")+`</tr>`).join("")
    + (rows.length?"":`<tr><td colspan="${cols.length}" class="empty">Geen advertenties met leads of kosten in deze periode.</td></tr>`)+`</table></div>`;
  if(rows.length>40) h+=`<div style="text-align:center;margin:10px 0"><span class="sm" onclick="bestAll=!bestAll;drawBest()">${bestAll?"Toon top 40":"Toon alle "+rows.length}</span></div>`;
  h+=`<p class="note">Alle ${bestLvl==="ad"?"advertenties":"campagnes"} plat naast elkaar · ${fmtY(A)} t/m ${fmtY(B)} · telmodus ${MODE}. Standaard gesorteerd op <b>Prestatie</b>: van best naar slechtst presterend. De score (0–100) = <b>kosten per klant</b> t.o.v. het plafond van ${eur0(MAXCPK())} (laag = veel punten, max 60) + <b>zekerheid</b> (1 klant = 8, 2 = 14, 3+ = 20 punten — één toevalstreffer wint dus niet) + <b>funnel-rendement</b> (intakes gepland en shows per € 100, max 20). Iets met weinig kosten én weinig leads krijgt "te weinig data" en staat onderaan — goedkoop maar niks opleveren telt niet als goed. Party-campagnes ${PARTY?"tellen mee":"zijn verborgen"}.</p>`;
  w.innerHTML=h;
}

// ---- detail (namen) ----
const SETLAB={nieuw:"Leads binnengekomen",gepland:"Intake gepland",shows:"Shows",sign:"Ingeschreven"};
let dSort={c:1,d:-1};
function showDetail(key,set){ detail={key,set}; drawDetail(); setTimeout(()=>{ const e=document.getElementById("detail"); if(e) e.scrollIntoView({behavior:"smooth",block:"nearest"}); },50); }
function drawDetail(){
  const el=document.getElementById("detail"); if(!detail||tab!=="tree"){ el.style.display="none"; return; }
  const n=findNode(detail.key,TREE); if(!n){ el.style.display="none"; return; }
  const rows=n.m.S[detail.set]||[];
  const cols=[
    {t:"Naam",v:l=>l.nm.toLowerCase(),k:l=>ghl(l.contact_id,l.nm)},
    {t:detail.set==="sign"?"Tekendatum":detail.set==="gepland"?"Ingepland":"Binnengekomen",v:l=>detail.set==="sign"?l.sd:detail.set==="gepland"?l.pd:l.cd,k:l=>{const d=detail.set==="sign"?l.sd:detail.set==="gepland"?l.pd:l.cd; return d>=0?fmt(d):"—";}},
    {t:"Fase",v:l=>l.stage_position,k:l=>`<span class="stg${l.is_signed?" win":l.lost?" lost":""}">${esc(l.stage_name)}${l.lost&&l.stage_position!==0?" · verloren":""}</span>`},
    {t:"Setter",v:l=>l.setter||"",k:l=>esc(l.setter||"—")},
    {t:"Eigenaar",v:l=>l.owner||"",k:l=>esc(l.owner||"—")},
    {t:"Platform",v:l=>l.platform,k:l=>`<span class="dot" style="background:${PC(l.platform)}"></span>${esc(PN(l.platform))}${l.placement?` <small>${esc(l.placement)}</small>`:""}`},
    {t:"Campagne",v:l=>l.camp?l.camp.name:"",k:l=>`<small>${esc(l.camp?l.camp.name:(l.utm_campaign||"—"))}</small>`},
    {t:"Advertentie",v:l=>l.adObj?l.adObj.adName:"",k:l=>`<small>${esc(l.adObj?(l.adObj.adName||l.adObj.adId):(l.utm_content||"—"))}</small>`},
    {t:"Bron",v:l=>l.bron,k:l=>`<small class="${l.hard?"hardb":"softb"}">${esc(BRON[l.bron]||l.bron||"—")}</small>${l.alt_last_campaign?`<br><small title="laatste klik week af van de toegekende campagne">misschien ook: ${esc(l.alt_last_campaign)}</small>`:""}`},
    {t:"Waarde",v:l=>l.is_signed?l.value:0,k:l=>l.is_signed?eur0(l.value)+(l.signed_via==="fasewissel"?" <small title='geen formulier gevonden; datum = fasewissel'>⚠︎</small>":""):"—"},
    {t:"Temp.",v:l=>l.temperature||"",k:l=>esc(l.temperature||"—")},
  ];
  const s=dSort; const sorted=[...rows].sort((x,y)=>{ const a=cols[s.c].v(x),b=cols[s.c].v(y); return (a<b?-1:a>b?1:0)*s.d; });
  // ad-verdeling binnen deze set (welke advertenties komen het vaakst voor)
  const byAd=new Map(); for(const l of rows){ const k=l.adObj?(l.adObj.adName||l.adObj.adId):(l.camp?"(campagne: "+l.camp.name+")":"(geen advertentie bekend)"); byAd.set(k,(byAd.get(k)||0)+1); }
  const top=[...byAd.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  el.style.display="block";
  el.innerHTML=`<div class="dhead"><b>${esc(n.label)} · ${SETLAB[detail.set]} · ${rows.length}</b><span>${fmtY(A)} t/m ${fmtY(B)} · ${MODE} <a href="#" onclick="detail=null;drawDetail();return false" style="margin-left:10px;color:var(--plan)">sluiten ✕</a></span></div>
    <div class="dbody"><div class="two dtwo"><div style="overflow:auto"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="dSort.c===${i}?dSort.d=-dSort.d:(dSort={c:${i},d:1});drawDetail()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+sorted.slice(0,300).map(l=>`<tr>`+cols.map(c=>`<td>${c.k(l)}</td>`).join("")+`</tr>`).join("")+`</table>${sorted.length>300?`<div class="more">eerste 300 van ${sorted.length}</div>`:""}</div>
    <div class="cmp" style="align-self:start"><h3>Welke advertenties komen het vaakst voor</h3>${top.length?top.map(([k,c])=>`<div class="lr"><span title="${esc(k)}">${esc(k)}</span><i><b style="width:${Math.round(c/top[0][1]*100)}%"></b></i><em>${c}</em></div>`).join(""):"<div class='empty'>—</div>"}</div></div></div>`;
}

// ---- trend ----
function buckets(by){ let a=A,b=B; if(by==="week"&&b-a<11*7) a=b-12*7+1; if(by==="maand"&&b-a<180) a=monthKey(b)-5*31; const out=[]; if(by==="week"){ for(let d=weekKey(a); d<=b; d+=7) out.push([d,Math.min(d+6,b)]); } else { for(let d=monthKey(a); d<=b;){ const nk=monthKey(d+32); out.push([d,Math.min(nk-1,b)]); d=nk; } } return out; }
const TM=[["cpk","Kosten per klant","€"],["cpl","Kosten per lead","€"],["spend","Kosten","€"],["n","Leads","#"],["sg","Inschrijvingen","#"],["l2k","Lead → klant %","%"],["plan","Plan %","%"],["show","Show %","%"],["sign","Sign %","%"],["hard","Hard bewijs %","%"]];
function drawTrend(){
  const w=document.getElementById("trendwrap"); const bk=buckets(trendBy); const lab=([a])=>trendBy==="week"?"wk "+isoWeek(a):MND[d2s(a).getMonth()]+" "+String(d2s(a).getFullYear()).slice(2); const labels=bk.map(lab);
  const plats=["meta","google","tiktok"]; const cw=Math.max(320,(w.clientWidth||900)-34);
  const rowsFor=p=>bk.map(([a,b])=>{ const ls=L.filter(l=>(p==null||l.platform===p)&&(PARTY||!l.party)); const sp=spendIn(a,b,r=>(p==null||r.platform===p)&&(PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party)); return metrics(ls,sp,a,b); });
  const [mk,mt,unit]=TM.find(x=>x[0]===trendMetric)||TM[0];
  const series=[{name:"Totaal",color:"var(--txt)",rows:rowsFor(null),width:3,showVals:true}].concat((trendPlat?[trendPlat]:plats).map(p=>({name:PN(p),color:PC(p),rows:rowsFor(p),width:1.8,opacity:.85})));
  for(const s of series){ s.values=s.rows.map(m=>{ const v=m[mk]; return v==null?null:(unit==="€"?Math.round(v):unit==="%"?v:v); }); s.tips=s.rows.map(m=>`${m.sg} inschr · ${m.n} leads · ${eur0(m.spend)}`); }
  const pctMode=unit==="%"; const S=series; const tot=S[0]; const last=tot.values.length-1;
  let h=`<div class="wonchips">`+TM.map(x=>`<div class="wchip sm${trendMetric===x[0]?" on":""}" onclick="trendMetric='${x[0]}';drawTrend()">${x[1]}</div>`).join("")+`<span style="flex:1"></span>`+[["week","Per week"],["maand","Per maand"]].map(x=>`<div class="wchip sm${trendBy===x[0]?" on":""}" onclick="trendBy='${x[0]}';drawTrend()">${x[1]}</div>`).join("")+`</div>`;
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
function adviceFor(a,b){
  const days=b-a+1; const out=[];
  const nodes=buildTree(a,b); nodes.forEach(n=>decorate(n,a,b));
  const units=[]; for(const p of nodes){ if(!PLAT[p.platform]||p.platform==="onbekend"||p.platform==="niet_betaald") continue; for(const c of p.children){ if(!c.cid||c.noCamp) continue; const subs=c.children.filter(x=>x.key.startsWith("s:")&&x.children.length); if(subs.length>1) for(const s of subs) units.push({node:s,label:c.label+" → "+s.label,platform:p.platform,cid:c.cid}); units.push({node:c,label:c.label,platform:p.platform,cid:c.cid}); } }
  for(const u of units){ const m=u.node.m; const spend=m.spend, leads=m.n, shows=m.sh, sg=m.sg; if(spend<250&&leads<5) continue;
    const rec=spendIn(Math.max(a,b-13),b,r=>r.cid===u.cid&&r.platform===u.platform).spend; if(!(rec>0)) continue; /* alleen campagnes die de laatste 14 dagen nog draaien */ if(/^\((geen|campagne niet|niet toewijsbaar)/.test(u.label)) continue;
    const kpd=spend/days, cpk=sg?spend/sg:null, isrV=u.platform==="google"?isr(a,b,u.cid):null; const MX=MAXCPK();
    if(cpk!=null&&cpk<MX*0.85&&(sg>=2||spend>=800)){ const mult=isrV?Math.min(2,Math.max(1.25,0.62/isrV)):1.35; const extra=kpd*(mult-1); const exL=leads*(mult-1)*0.65; const exK=exL*(sg/leads||0);
      out.push({type:"opschalen",label:u.label,platform:u.platform,w:extra*30,txt:`Kosten per klant ${eur0(cpk)} (< ${eur0(MX*0.85)}). Schaal budget ×${r1(mult)} (+${eur0(extra)}/dag): ≈ +${r1(exL)} leads en +${r1(exK)} klanten per periode.${isrV?` Zoekvertoningsaandeel ${Math.round(isrV*100)}% → er is ruimte.`:""}`,m}); }
    if(sg===0&&shows===0&&spend>400) out.push({type:"stoppen",label:u.label,platform:u.platform,w:kpd*30,txt:`${eur0(spend)} uitgegeven, ${leads} leads, geen enkele show en geen inschrijving. Pauzeer of herbouw.`,m});
    else if(sg===0&&shows>0&&spend>400) out.push({type:"halveren",label:u.label,platform:u.platform,w:kpd*15,txt:`${eur0(spend)} uitgegeven, ${shows} show${shows===1?"":"s"} maar nog geen inschrijving. Halveer het budget tot de eerste klant binnen is.`,m});
    if(cpk!=null&&cpk>MX*1.25){ const doel=sg*MX/days; out.push({type:"terugschroeven",label:u.label,platform:u.platform,w:(spend-sg*MX)/days*30,txt:`Kosten per klant ${eur0(cpk)} (> ${eur0(MX*1.25)}). Terug naar ≈ ${eur0(doel)}/dag (nu ${eur0(kpd)}/dag) of de kwaliteit van de leads verbeteren.`,m}); }
  }
  return out;
}
let advAll=false, advOpen=new Set();
function advTog(k){ advOpen.has(k)?advOpen.delete(k):advOpen.add(k); drawAdvice(); }
function drawAdvice(){
  const w=document.getElementById("advwrap");
  let a=A,b=B, note=""; if(b-a+1<21){ a=b-29; note=`<div class="warnbox">De gekozen periode is korter dan 21 dagen — adviezen zijn berekend over de laatste 30 dagen (${fmtY(a)} t/m ${fmtY(b)}).</div>`; }
  const cur=adviceFor(a,b);
  // maandhistorie dit jaar: in welke maanden vuurde dezelfde regel
  const months=[]; for(let d=monthKey(NOW); d>=monthKey(s2d(new Date(d2s(NOW).getFullYear(),0,1))); d=monthKey(d-1)) months.push([d,Math.min(monthKey(d+32)-1,NOW)]);
  const hist=new Map(); for(const [ma,mb] of months){ for(const ad of adviceFor(ma,mb)){ const k=ad.type+"|"+ad.label; if(!hist.has(k)) hist.set(k,[]); hist.get(k).push(ma); } }
  // jaar-adviezen die nu niet vuren
  const yearA=s2d(new Date(d2s(NOW).getFullYear(),0,1)); const year=adviceFor(yearA,NOW).filter(y=>!cur.some(c=>c.type===y.type&&c.label===y.label)).map(y=>({...y,w:y.w*0.6,buiten:true}));
  const all=cur.concat(year).map(ad=>{ const ms=hist.get(ad.type+"|"+ad.label)||[]; const n=ms.length; return {...ad,months:ms,rank:ad.w*(1+0.25*Math.max(0,n-1))}; });
  // dedupe per label: hoogste rang
  const best=new Map(); for(const ad of all){ const k=ad.label; if(!best.has(k)||best.get(k).rank<ad.rank) best.set(k,ad); }
  const list=[...best.values()].sort((x,y)=>y.rank-x.rank);
  const ICON={opschalen:"🚀",stoppen:"⛔️",halveren:"½",terugschroeven:"🔻"}, LAB={opschalen:"Opschalen",stoppen:"Stoppen",halveren:"Halveren",terugschroeven:"Terugschroeven"};
  const sev=ad=> ad.rank>=1500 ? "hi" : ad.rank>=500 ? "mid" : "lo";
  const SEVLAB={hi:"Super belangrijk",mid:"Belangrijk",lo:"Minder urgent"};
  const LIM=advAll?list.length:12;
  let h=note+`<div class="advrows">`+(list.length?list.slice(0,LIM).map((ad,i)=>{ const sv=sev(ad); const key=ad.type+"|"+ad.label; const opn=advOpen.has(key);
    return `<div class="advrow ${sv}${opn?" open":""}" onclick="advTog(${jq(key)})">`
      +`<span class="rank">${i+1}</span>`
      +`<span class="sevb ${sv}">${SEVLAB[sv]}</span>`
      +`<span class="advmain"><b>${ICON[ad.type]} ${LAB[ad.type]}</b> · <span class="dot" style="background:${PC(ad.platform)}"></span>${esc(ad.label)}</span>`
      +`<span class="advdata">${eur0(ad.m.spend)} · ${ad.m.n} leads · ${ad.m.sh} shows · ${ad.m.sg} klant${ad.m.sg===1?"":"en"}${ad.m.cpk!=null?" · <b>"+eur0(ad.m.cpk)+"/klant</b>":""}</span>`
      +`<span class="advw">≈ ${eur0(ad.w)}/mnd op het spel</span><i class="chev${opn?" open":""}"></i>`
      +(opn?`<div class="advx"><p>${esc(ad.txt)}</p><div class="doen">${ad.months.length?`Geldt al ${ad.months.length} maand${ad.months.length===1?"":"en"} (${ad.months.map(m=>MND[d2s(m).getMonth()]).join(", ")})`:"Nieuw dit moment"}${ad.buiten?" · valt buiten de gekozen periode maar staat nog open":""}</div></div>`:"")
      +`</div>`; }).join(""):`<div class="advrow lo"><span class="advmain">Geen regels die vuren in deze periode (te weinig kosten of leads per campagne).</span></div>`)+`</div>`
    +(list.length>12?`<div style="text-align:center;margin:10px 0"><span class="sm" onclick="advAll=!advAll;drawAdvice()">${advAll?"Toon alleen de top 12":"Toon alle "+list.length+" adviezen"}</span></div>`:"");
  h+=`<p class="note">Regels (uit het marketingdocument, drempels in <code>dpac.definitions</code>): <b>opschalen</b> als kosten/klant &lt; 85% van ${eur0(MAXCPK())} en (≥ 2 klanten of ≥ € 800); <b>stoppen</b> als 0 shows, 0 klanten en &gt; € 400; <b>halveren</b> als wel shows maar 0 klanten en &gt; € 400; <b>terugschroeven</b> als kosten/klant &gt; 125% van het plafond. Gewicht = € per maand op het spel; adviezen die al meerdere maanden gelden stijgen (+25% per extra maand); adviezen uit het hele jaar die nu niet vuren tellen ×0,6. Per campagne/adset één advies (hoogste rang). Er wordt <b>niets automatisch gewijzigd</b> — jij voert uit. Status "doorgevoerd" bijhouden volgt in de volgende versie (tabel mkt_advies).</p>`;
  w.innerHTML=h;
}

// ---- inschrijvingen ----
let sgSort={c:0,d:-1}, sgcSort={k:"sg",d:-1}, sgPlat=null;
const SGP={meta_fb:["Facebook","#1877f2"],meta_ig:["Instagram","#d62976"],meta_x:["Meta · plaatsing onbekend","#5856d6"],google:["Google","#1f6fd8"],tiktok:["TikTok","#0e9aa7"],niet_betaald:["Niet betaald (organisch/direct)","#8f845e"],onbekend:["Onbekend","#8e8e93"]};
function sgKey(l){ if(l.platform!=="meta") return SGP[l.platform]?l.platform:"onbekend"; const p=(l.placement||"").toLowerCase(); if(p.indexOf("insta")>=0) return "meta_ig"; if(p.indexOf("facebook")>=0||/(^|[^a-z])fb([^a-z]|$)/.test(p)) return "meta_fb"; return "meta_x"; }
function drawSign(){
  const w=document.getElementById("signwrap");
  const all=L.filter(l=>l.is_signed&&l.sd>=A&&l.sd<=B&&(PARTY||!l.party));
  const rows=sgPlat?all.filter(l=>sgKey(l)===sgPlat):all;
  const asm=FORMS.filter(f=>f.product==="ASM"&&f.d>=A&&f.d<=B);
  // per campagne aggregeren (over de gefilterde set)
  const cg=new Map();
  for(const l of rows){ const k=l.ckey||ck(l.platform,""); if(!cg.has(k)){ const c=l.camp; cg.set(k,{k,platform:l.platform,cid:(l.campaign_id||""),name:c?c.name:(l.platform==="niet_betaald"?"Niet betaald (organisch/direct)":l.platform==="onbekend"?"(bron onbekend)":"(campagne onbekend) · "+PN(l.platform)),ls:[]}); } cg.get(k).ls.push(l); }
  for(const g of cg.values()){ g.n=g.ls.length; g.val=g.ls.reduce((s,l)=>s+l.value,0);
    g.spend=g.cid?spendIn(A,B,r=>r.platform===g.platform&&(r.cid||"")===g.cid).spend:0; g.cpk=g.cid&&g.spend>0?g.spend/g.n:null;
    const cyc=g.ls.filter(l=>l.cd>=0&&l.sd>=l.cd); g.cyc=cyc.length?cyc.reduce((s,l)=>s+(l.sd-l.cd),0)/cyc.length:null;
    const ow=new Map(); g.ls.forEach(l=>{const o=l.owner||"—"; ow.set(o,(ow.get(o)||0)+1);}); g.own=[...ow.entries()].sort((a,b)=>b[1]-a[1]).map(([o,n2])=>o+(n2>1?" "+n2:"")).join(" · ");
    const fb=g.ls.filter(l=>sgKey(l)==="meta_fb").length, ig=g.ls.filter(l=>sgKey(l)==="meta_ig").length;
    g.split=g.platform==="meta"?[fb?"Facebook "+fb:"",ig?"Instagram "+ig:"",(g.n-fb-ig)?"plaatsing onbekend "+(g.n-fb-ig):""].filter(Boolean).join(" · "):""; }
  const camps=[...cg.values()];
  // kolommen individuele lijst — eigenaar prominent, kosten per klant, sales-cycle
  const cols=[
    {t:"Tekendatum",v:l=>l.sd,k:l=>fmt(l.sd)+(l.signed_via==="fasewissel"?" <small title='geen formulier; datum = fasewissel'>⚠︎</small>":"")},
    {t:"Naam",v:l=>l.nm.toLowerCase(),k:l=>ghl(l.contact_id,l.nm)},
    {t:"Waarde",v:l=>l.value,k:l=>eur0(l.value)},
    {t:"Kosten deze klant",v:l=>{const g=cg.get(l.ckey); return g&&g.cpk!=null?g.cpk:null;},k:l=>{const g=cg.get(l.ckey); return g&&g.cpk!=null?`<span title="kosten per klant van deze campagne in de gekozen periode">${eur0(g.cpk)}</span>`:"—";},tip:"kosten per klant van de campagne waar deze klant uit kwam (periode)"},
    {t:"Eigenaar",v:l=>l.owner||"",k:l=>`<b>${esc(l.owner||"—")}</b>`},
    {t:"Sales-cycle",v:l=>l.cd>=0?l.sd-l.cd:null,k:l=>l.cd>=0?`${l.sd-l.cd} d <small>${fmt(l.cd)}</small>`:"—",tip:"dagen van lead tot tekenen"},
    {t:"Platform",v:l=>sgKey(l),k:l=>{const kk=sgKey(l); return `<span class="dot" style="background:${SGP[kk][1]}"></span>${esc(SGP[kk][0])}`;}},
    {t:"Campagne",v:l=>l.camp?l.camp.name:"",k:l=>`<span class="campfull"><small>${esc(l.camp?l.camp.name:(l.utm_campaign||"—"))}</small></span>`,cls:"nmw"},
    {t:"Advertentie",v:l=>l.adObj?l.adObj.adName:"",k:l=>`<small>${esc(l.adObj?(l.adObj.adName||l.adObj.adId):(l.utm_content||"—"))}</small>`},
    {t:"Bron",v:l=>l.bron,k:l=>`<small class="${l.hard?"hardb":"softb"}">${esc(BRON[l.bron]||"—")}</small>`},
    {t:"Setter",v:l=>l.setter||"",k:l=>esc(l.setter||"—")},
    {t:"All Star",v:l=>l.asm?1:0,k:l=>l.asm?`⭐️ ${l.asd>=0?fmt(l.asd):""}`:"—"}];
  const s=sgSort; const sorted=[...rows].sort((x,y)=>{ const a=cols[s.c].v(x),b=cols[s.c].v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*s.d; });
  const cycL=rows.filter(l=>l.cd>=0&&l.sd>=l.cd); const cycAvg=cycL.length?Math.round(cycL.reduce((t,l)=>t+(l.sd-l.cd),0)/cycL.length):null;
  const geenForm=rows.length-rows.filter(l=>l.signed_via==="formulier").length;
  let h=`<div class="kpis ikp"><div class="kpi"><b>${rows.length}</b><span>Inschrijvingen PA (tekendatum in periode)</span></div><div class="kpi"><b>${eur0(rows.reduce((t,l)=>t+l.value,0))}</b><span>Waarde</span></div><div class="kpi"><b>${cycAvg==null?"—":cycAvg+" d"}</b><span>Gem. sales-cycle (lead → tekenen)</span></div><div class="kpi ${geenForm?"warnk":""}"><b>${geenForm}</b><span>Zonder formulier (fasewissel)</span></div><div class="kpi"><b>${asm.length}</b><span>All Star (apart — telt hier niet mee)</span></div></div>`;
  // platform-chips met FB/IG-splitsing
  const pp=new Map(); all.forEach(l=>{const k=sgKey(l); if(!pp.has(k)) pp.set(k,{n:0,v:0}); const o=pp.get(k); o.n++; o.v+=l.value;});
  h+=`<div class="wonchips"><span class="lbl">Waar komen ze vandaan:</span><div class="wchip sm${sgPlat==null?" on":""}" onclick="sgPlat=null;drawSign()">Alles <span class="n">${all.length}</span></div>`+[...pp.entries()].sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>`<div class="wchip sm${sgPlat===k?" on":""}" onclick="sgPlat=${jq(k)};drawSign()" title="${eur0(o.v)} waarde"><span class="dot" style="background:${SGP[k][1]}"></span>${esc(SGP[k][0])} <span class="n">${o.n}</span></div>`).join("")+`</div>`;
  // goedkoopste campagnes
  const cheap=camps.filter(g=>g.cpk!=null).sort((a,b)=>a.cpk-b.cpk);
  h+=`<div class="cmp"><h3>💶 Goedkoopste campagnes om een klant binnen te halen</h3>`+(cheap.length?cheap.slice(0,10).map((g,i)=>`<div class="lr"><span title="${esc(g.name)}">${i<3?["🥇","🥈","🥉"][i]+" ":""}${esc(g.name)}</span><i><b style="width:${Math.max(4,Math.round(cheap[0].cpk/g.cpk*100))}%"></b></i><em style="width:auto;white-space:nowrap">${eur0(g.cpk)} · ${g.n} klant${g.n===1?"":"en"}</em></div>`).join(""):`<div class="empty">Geen campagnes met kosten én inschrijvingen in deze periode.</div>`)+`<p class="note" style="margin:8px 0 0">Kosten per klant = kosten van de campagne in de periode ÷ inschrijvingen uit die campagne (tekendatum in de periode). Langere balk = goedkoper.</p></div>`;
  // per campagne (sorteerbaar)
  const ccols=[
    {k:"name",t:"Campagne",v:g=>g.name.toLowerCase(),f:g=>`<span class="dot" style="background:${PC(g.platform)}"></span><span class="campfull"><b>${esc(g.name)}</b></span>${g.split?`<br><small style="margin-left:14px">${g.split}</small>`:""}`,cls:"nmw"},
    {k:"sg",t:"Inschrijvingen",v:g=>g.n,f:g=>`<b>${g.n}</b>`},
    {k:"val",t:"Waarde",v:g=>g.val,f:g=>eur0(g.val)},
    {k:"spend",t:"Kosten (periode)",v:g=>g.spend,f:g=>g.cid?eur0(g.spend):"—"},
    {k:"cpk",t:"Kosten / klant",v:g=>g.cpk,f:g=>g.cpk==null?"—":eur0(g.cpk),cf:g=>g.cpk==null?"":(g.cpk<=MAXCPK()*0.85?"good":g.cpk>MAXCPK()*1.25?"bad":"warn")},
    {k:"cyc",t:"Sales-cycle",v:g=>g.cyc,f:g=>g.cyc==null?"—":Math.round(g.cyc)+" d",tip:"gemiddeld aantal dagen van lead tot tekenen"},
    {k:"own",t:"Eigenaar(s)",v:g=>g.own.toLowerCase(),f:g=>esc(g.own),cls:"nmw2"}];
  const cs=sgcSort; const ccol=ccols.find(c=>c.k===cs.k)||ccols[1];
  camps.sort((x,y)=>{ const a=ccol.v(x),b=ccol.v(y); if(a==null&&b==null) return 0; if(a==null) return 1; if(b==null) return -1; return (a<b?-1:a>b?1:0)*cs.d; });
  h+=`<div class="cmp" style="margin-top:12px"><h3>Per campagne</h3><div style="overflow:auto"><table><tr>`+ccols.map(c=>`<th ${c.tip?`title="${esc(c.tip)}"`:""}><span class="sortl" onclick="sgcSort.k==='${c.k}'?sgcSort.d=-sgcSort.d:(sgcSort={k:'${c.k}',d:-1});drawSign()">${c.t} <span class="arr">${cs.k===c.k?(cs.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+(camps.length?camps.map(g=>`<tr>`+ccols.map(c=>`<td class="${c.cls||""} ${c.cf?c.cf(g):""}">${c.f(g)}</td>`).join("")+`</tr>`).join(""):`<tr><td colspan="${ccols.length}" class="empty">Geen inschrijvingen in deze periode.</td></tr>`)+`</table></div></div>`;
  // individuele lijst
  h+=`<div class="cmp" style="margin-top:12px"><h3>Alle inschrijvingen${sgPlat?` · ${esc(SGP[sgPlat][0])}`:""}</h3><div style="overflow:auto"><table><tr>`+cols.map((c,i)=>`<th ${c.tip?`title="${esc(c.tip)}"`:""}><span class="sortl" onclick="sgSort.c===${i}?sgSort.d=-sgSort.d:(sgSort={c:${i},d:1});drawSign()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+`</tr>`+sorted.map(l=>`<tr>`+cols.map(c=>`<td class="${c.cls||""}">${c.k(l)}</td>`).join("")+`</tr>`).join("")+`${sorted.length?"":`<tr><td colspan="${cols.length}" class="empty">Geen inschrijvingen in deze periode.</td></tr>`}</table></div></div>`;
  // All Star apart
  h+=`<div class="cmp" style="margin-top:12px"><h3>⭐️ All Star Management (upsell) · ${asm.length} <span class="chsub">apart gehouden — telt niet mee in de PA-cijfers hierboven</span></h3>${asm.length?`<table><tr><th>Datum</th><th>Naam</th><th>Variant</th><th>Waarde</th><th>Betaaloptie</th></tr>${asm.map(f=>`<tr><td>${fmt(f.d)}</td><td>${ghl(f.contact_id,f.name)}</td><td>${esc(f.variant||"—")}</td><td>${eur0(f.value)}</td><td><small>${esc(f.pay||"—")}</small></td></tr>`).join("")}</table>`:`<div class="empty">Geen All Star-inschrijvingen in deze periode.</div>`}</div>`;
  h+=`<p class="note">Tekendatum = datum van het inschrijfformulier (GHL), gekoppeld via contact-id / e-mail / telefoon. Waarde uit de betaaloptie: € 6.800 (termijnen of factuur) · € 6.300 (direct afrekenen — € 500 korting, klopt dus) · € 6.595 (€ 205 korting). ⚠︎ = Agreement Signed in het CRM maar geen formulier gevonden; datum = fasewissel. Facebook/Instagram-splitsing komt uit de plaatsing die GHL meekreeg; kosten zijn per campagne (Meta splitst kosten niet per plaatsing in onze data).</p>`;
  w.innerHTML=h;
}

// ---- datakwaliteit ----
function drawData(){
  const w=document.getElementById("datawrap");
  const months=new Map(); for(const l of L){ if(l.cd<0) continue; const k=d2s(l.cd).getFullYear()+"-"+String(d2s(l.cd).getMonth()+1).padStart(2,"0"); if(!months.has(k)) months.set(k,[]); months.get(k).push(l); }
  let h=`<div class="cmp"><h3>Attributiedekking per maand (leads op binnenkomst)</h3><table><tr><th>Maand</th><th>Leads</th><th>Hard (UTM/ad-id)</th><th>Zacht (GHL klik)</th><th>Afgeleid</th><th>Niet betaald</th><th>Onbekend</th><th>Met campagne</th><th>Met advertentie</th></tr>`;
  for(const [k,ls] of [...months.entries()].sort()){ const n=ls.length; const c=f=>ls.filter(f).length; const p=x=>`${x} <small>${fpct(x,n)}</small>`;
    h+=`<tr><td><b>${k}</b></td><td>${n}</td><td>${p(c(l=>l.hard))}</td><td>${p(c(l=>l.bron==="ghl_klik"))}</td><td>${p(c(l=>l.bron==="afgeleid"))}</td><td>${p(c(l=>l.bron==="niet_betaald"))}</td><td class="${c(l=>l.bron==="onbekend")/n>0.1?"bad":""}">${p(c(l=>l.bron==="onbekend"))}</td><td>${p(c(l=>!!l.camp))}</td><td>${p(c(l=>!!l.adObj))}</td></tr>`; }
  h+=`</table></div>`;
  const c=D.counts||{}; const noForm=L.filter(l=>l.is_signed&&l.signed_via!=="formulier");
  h+=`<div class="two"><div class="cmp"><h3>Bronnen</h3><table><tr><td>Spend-data t/m</td><td><b>${c.spend_last?fmtY(dOf(c.spend_last)):"— (nog geen spend geladen)"}</b></td></tr><tr><td>Campagne-dagen / ad-dagen</td><td>${c.campaign_days||0} / ${c.ad_days||0}</td></tr><tr><td>Leads met GHL-attributie opgehaald</td><td>${c.attr||0}</td></tr><tr><td>Inschrijfformulieren</td><td>${c.forms||0} (PA ${FORMS.filter(f=>f.product==="PA").length} · ASM ${FORMS.filter(f=>f.product==="ASM").length})</td></tr><tr><td>Laatste stand</td><td>${document.getElementById("gen").textContent}</td></tr></table></div>
    <div class="cmp"><h3>Agreement Signed zonder inschrijfformulier · ${noForm.length}</h3>${noForm.length?`<table><tr><th>Naam</th><th>Fasewissel</th><th>Eigenaar</th></tr>${noForm.map(l=>`<tr><td>${ghl(l.contact_id,l.nm)}</td><td>${l.sd>=0?fmt(l.sd):"—"}</td><td>${esc(l.owner||"—")}</td></tr>`).join("")}</table>`:`<div class="empty">Alles gekoppeld. 👌</div>`}</div></div>`;
  const unm=FORMS.filter(f=>!f.contact_id);
  h+=`<div class="cmp"><h3>Formulieren zonder contact-koppeling · ${unm.length}</h3>${unm.length?`<table><tr><th>Datum</th><th>Naam</th><th>Product</th></tr>${unm.map(f=>`<tr><td>${fmt(f.d)}</td><td>${esc(f.name)}</td><td>${esc(f.product)}</td></tr>`).join("")}</table>`:`<div class="empty">Alle formulieren zijn aan een contact gekoppeld.</div>`}</div>`;
  h+=`<p class="note">Bekende gaten (uit de overdracht): Google stuurde tot 6 aug <code>utm_campaign={campaignname}</code> letterlijk mee — campagne wordt dan herleid uit het advertentie-id in utm_content; PMax stuurt geen advertentie-id (afgeleid op looptijd); Meta Instant Forms hebben soms geen UTM's (GHL klik-attributie vangt een deel op); 8–22 mei 2026 viel de UTM-doorgifte weg. gclid/fbclid worden nog niet bewaard (staan wél in de GHL-contactattributie — volgende stap voor offline-conversies).</p>`;
  w.innerHTML=h;
}

// ---- render ----
function render(){
  document.getElementById("dpLabel").textContent = fmtY(A)+" – "+fmtY(B);
  drawTabs(); drawKpis();
  const ids={tree:"treewrap",best:"bestwrap",trend:"trendwrap",adv:"advwrap",sign:"signwrap",data:"datawrap"};
  for(const k in ids) document.getElementById(ids[k]).style.display = tab===k?"block":"none";
  if(tab==="tree") drawTree(); if(tab==="best") drawBest(); if(tab==="trend") drawTrend(); if(tab==="adv") drawAdvice(); if(tab==="sign") drawSign(); if(tab==="data") drawData();
  drawDetail();
  if(window.parent!==window){ try{ window.parent.postMessage({dpacMkt:"h",h:document.body.scrollHeight},"*"); }catch(e){} }
}
const jq = s => JSON.stringify(s).replace(/"/g,"&quot;");
let _rz=null; window.addEventListener("resize",()=>{ if(!D) return; clearTimeout(_rz); _rz=setTimeout(()=>{ if(tab==="trend") drawTrend(); },250); });
setTimeout(()=>{ const g=document.getElementById("gcode"); if(g && document.getElementById("gate").style.display!=="none") g.focus(); },50);
try{ const c=sessionStorage.dpacMktCode; if(c) gTry(c, true); else if(location.search.indexOf("local=1")>=0) gTry("", true); }catch(e){}
