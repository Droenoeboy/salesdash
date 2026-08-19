// ---- 📊 grafiek-helpers (SVG, geen libraries) ----
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

// ---- ⚖️ vergelijk: mensen naast elkaar, één rij per KPI ----
let cmpSel=null, cmpTeam=true;   // null = automatisch (iedereen met activiteit in de periode)
function cmpToggle(n){ if(cmpSel===null) cmpSel=new Set(cmpAuto()); cmpSel.has(n)?cmpSel.delete(n):cmpSel.add(n); if(!cmpSel.size) cmpSel=null; drawCmp(); }
function cmpAuto(){ const l=REPS.filter(p=>{ const f=funnel(p.n,A,B); return f.gepland.length+f.verloren.length+f.agenda.length+f.dossiers.length>=5; }).map(p=>p.n).slice(0,5); return l.length? l : REPS.slice(0,3).map(p=>p.n); }
function drawCmp(){
  const el=document.getElementById("cmpwrap");
  const names = cmpSel? REPS.map(p=>p.n).filter(n=>cmpSel.has(n)) : cmpAuto();
  const cols=(cmpTeam?[{n:null,lab:"Team"}]:[]).concat(names.map(n=>({n,lab:n})));
  const F=cols.map(c=>({f:funnel(c.n,A,B), s:slots(c.n,A,B,"setter"), si:slots(c.n,A,B,"intaker")}));
  const ti = cmpTeam?1:0;   // index van de eerste persoon
  const rate=(num,den)=>den?pct(num,den):null;
  const rows=[
    {hdr:"Setter · wat lever jij aan?"},
    {t:"Leads afgehandeld", sub:"gepland + verloren in Leads-fase", g:x=>({v:x.f.gepland.length+x.f.verloren.length}), num:true, phase:"plan"},
    {t:"Plan rate", sub:ROL("plan"), g:x=>{ const d=x.f.gepland.length+x.f.verloren.length; return {v:rate(x.f.gepland.length,d), n:x.f.gepland.length, d}; }, phase:"plan", min:+(DEFS.min_volume_plan||15)},
    {t:"Intakes gezet", sub:"op intakedatum"+(MODE==="rep"?", als eigenaar":", als setter"), g:x=>({v:x.f.agenda.length}), num:true, phase:"show"},
    {t:"Shows", sub:MODE==="rep"?"als eigenaar":"van jouw intakes", g:x=>({v:x.f.show.length}), num:true, phase:"show"},
    {t:"Show rate", sub:ROL("show"), g:x=>({v:rate(x.f.show.length,x.f.agenda.length), n:x.f.show.length, d:x.f.agenda.length}), phase:"show", min:+(DEFS.min_volume_show||8)},
    {t:"Show rate per slot", sub:"agenda-afspraken, als setter", g:x=>{ const d=x.s.show.length+x.s.noshow.length+x.s.late.length; return {v:rate(x.s.show.length,d), n:x.s.show.length, d}; }, min:+(DEFS.min_volume_show||8)},
    {t:"Sign rate", sub:ROL("signS")+" · van jouw shows, wie ook tekent", g:x=>({v:rate(x.f.signS.length,x.f.show.length), n:x.f.signS.length, d:x.f.show.length}), phase:"signS", min:+(DEFS.min_volume_sign||5)},
    {t:"Reactietijd", sub:"mediaan, als setter", g:(x,c)=>{ const m=median(L.filter(l=>inR(l.cd,A,B)&&(c.n==null||l.setter===c.n)).map(l=>l.s2l)); return {v:m, txt:fmin(m)}; }, num:true, rank:true, lowGood:true},
    {t:"Verloren in Leads-fase", sub:"als eigenaar (wie op verloren sleept)", g:x=>({v:x.f.verloren.length}), num:true, phase:"plan", lowGood:true},
    {hdr:"Eigenaar · hoe beweeg jij dossiers?"},
    ...(MODE==="rep"?[]:[{t:"Dossiers na show", sub:"in bezit, op intakedatum", g:x=>({v:x.f.dossiers.length}), num:true, phase:"close"}]),
    ...(MODE==="rep"?[]:[{t:"Close rate", sub:"eigenaar · ingeschreven vs verloren", g:x=>{ const d=x.f.closed.length+x.f.closeLost.length; return {v:rate(x.f.closed.length,d), n:x.f.closed.length, d}; }, phase:"close", min:+(DEFS.min_volume_sign||5)}]),
    {t:"Ingeschreven", sub:"als eigenaar", g:x=>({v:x.f.signO.length}), num:true, phase:"pay"},
    {t:"Pay rate", sub:"eigenaar", g:x=>({v:rate(x.f.paid.length,x.f.signO.length), n:x.f.paid.length, d:x.f.signO.length}), phase:"pay", min:1},
  ];
  const chips=`<div class="wonchips"><div class="wchip${cmpTeam?" on":""}" onclick="cmpTeam=!cmpTeam;drawCmp()" title="Team-kolom tonen/verbergen">Σ Team</div><span class="lbl" style="margin-left:4px">Personen:</span>`+REPS.map(p=>`<div class="wchip${names.includes(p.n)?" on":""}" onclick="cmpToggle(${JSON.stringify(p.n).replace(/"/g,"&quot;")})"><span class="dot" style="background:${repCol(p.n)}"></span>${esc(p.n)}</div>`).join("")+`<div class="wchip" onclick="cmpSel=new Set(REPS.map(p=>p.n));drawCmp()">Iedereen</div><div class="wchip" onclick="cmpSel=null;drawCmp()">↺ auto</div></div>`;
  let h=chips+`<div class="cmpcard"><table class="cmptbl"><tr><th class="mt">KPI</th>`+cols.map((c,i)=>`<th class="${(cmpTeam&&i===0)?"team":""}"><span class="dot" style="background:${c.n?repCol(c.n):"var(--txt)"}"></span>${esc(c.lab)}</th>`).join("")+`</tr>`;
  for(const r of rows){
    if(r.hdr){ h+=`<tr class="hdr"><td colspan="${cols.length+1}">${r.hdr}</td></tr>`; continue; }
    const cells=cols.map((c,i)=>r.g(F[i],c));
    const vals=r.num&&!r.rank ? [] : cells.slice(ti).map((x,i)=>(r.min && x.d!=null && x.d<r.min)? null : x.v).filter(v=>v!=null);
    const best= vals.length>1? (r.lowGood? Math.min(...vals) : Math.max(...vals)) : null, worst= vals.length>1? (r.lowGood? Math.max(...vals) : Math.min(...vals)) : null;
    const maxAbs=Math.max(1,...cells.map(x=>x.v==null?0:x.v));
    h+=`<tr><td class="mt"><b>${r.t}</b><small>${r.sub}</small></td>`+cells.map((x,i)=>{
      const c=cols[i]; const weak = r.min && x.d!=null && x.d<r.min;
      const cls = i>=ti && !weak && x.v!=null && best!==null && x.v===best && best!==worst ? "best" : (i>=ti && !weak && x.v!=null && worst!==null && x.v===worst && best!==worst ? "worst" : "");
      const txt = x.txt!=null ? x.txt : (x.v==null ? "—" : (r.num ? x.v : (x.v+"").replace(".",",")+"%"));
      const bar = x.v==null ? "" : `<i class="cbar" style="width:${Math.round((r.num? x.v/maxAbs : x.v/100)*100)}%;background:${c.n?repCol(c.n):"var(--mut2)"}"></i>`;
      const click = r.phase ? `onclick="tab='cmp';pick('${esc(c.n==null?"tot":c.n)}','${r.phase}')" title="klik voor de namen"` : "";
      return `<td class="${cls}${(cmpTeam&&i===0)?" team":""}${weak?" weak":""}" ${click}><b>${txt}</b>${x.d!=null?`<small>${x.n}/${x.d}${weak?" · te weinig":""}</small>`:""}${bar}</td>`; }).join("")+`</tr>`;
  }
  h+=`</table></div>
  <p class="note">Elke rij is één KPI, elke kolom één persoon — zo vergelijk je Django en Marcel direct, ook op je telefoon (schuif horizontaal). <b>Groen</b> = beste van de rij, <b>rood</b> = laagste; grijs = te weinig volume om eerlijk te vergelijken (plan ≥ ${DEFS.min_volume_plan||15}, show ≥ ${DEFS.min_volume_show||8}, sign/close ≥ ${DEFS.min_volume_sign||5}). Klik op een cel voor de namen erachter. Rollen per rij staan eronder; schakel bovenin naar <i>Per rep (v1)</i> voor de oude telling.</p>`;
  el.innerHTML=h;
}

// ---- 📈 trend: percentages per week, grafiek + week-op-week verandering ----
let trendWho=null, trendBy="auto", trendMetric="pr", trendReps=null;
function weekKey(d){ const t=d2s(d); const dow=(t.getDay()+6)%7; return d-dow; }   // maandag van de week
function monthKey(d){ const t=d2s(d); return s2d(new Date(t.getFullYear(),t.getMonth(),1)); }
function isoWeek(d){ const t=d2s(d); const x=new Date(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate())); const dn=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-dn); const y0=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return Math.ceil((((x-y0)/864e5)+1)/7); }
const TREND_METRICS=[
  {k:"pr", t:"Plan rate", pct:true, num:r=>r.gepland, den:r=>r.beh, min:()=>+(DEFS.min_volume_plan||15), rol:"plan"},
  {k:"sr", t:"Show rate", pct:true, num:r=>r.show, den:r=>r.agenda, min:()=>+(DEFS.min_volume_show||8), rol:"show"},
  {k:"gs", t:"Sign rate", pct:true, num:r=>r.signS, den:r=>r.show, min:()=>+(DEFS.min_volume_sign||5), rol:"signS"},
  {k:"cr", t:"Close rate", pct:true, num:r=>r.closed, den:r=>r.closed+r.closeLost, min:()=>+(DEFS.min_volume_sign||5), rol:"close"},
  {k:"pay", t:"Pay rate", pct:true, num:r=>r.paid, den:r=>r.signO, min:()=>1, rol:"pay"},
  {k:"l2s", t:"Lead → sale", pct:true, num:r=>r.sign, den:r=>r.beh, min:()=>+(DEFS.min_volume_plan||15)},
  {k:"slot", t:"Show rate per slot", pct:true, num:r=>r.slotShow, den:r=>r.held, min:()=>+(DEFS.min_volume_show||8)},
  {k:"nieuw", t:"Nieuwe leads", pct:false, num:r=>r.nieuw},
  {k:"gepland", t:"Intakes gepland", pct:false, num:r=>r.gepland},
  {k:"show", t:"Shows", pct:false, num:r=>r.show},
  {k:"sign", t:"Ingeschreven", pct:false, num:r=>r.signO},
  {k:"verloren", t:"Verloren (Leads-fase)", pct:false, num:r=>r.verloren},
];
function trendBuckets(){
  const by = trendBy==="auto" ? ((B-A)>=120?"maand":"week") : trendBy;
  let start=A, end=B;
  if(by==="week"&&(end-start)<11*7) start=end-12*7+1;      // minimaal 12 weken in beeld
  if(by==="maand"&&(end-start)<180) start=monthKey(end)-5*31; // ± 6 maanden
  const key = by==="week"? weekKey : monthKey;
  const buckets=[]; for(let d=key(start); d<=end; ){ const nk = by==="week"? d+7 : monthKey(d+32); buckets.push([d, Math.min(nk-1,end)]); d=nk; }
  return {by, buckets};
}
function trendRow(who,a,b){
  const f=funnel(who,a,b), s=slots(who,a,b,"setter"); const beh=f.gepland.length+f.verloren.length; const held=s.show.length+s.noshow.length+s.late.length;
  return {a,b, nieuw:L.filter(l=>inR(l.cd,a,b)&&(who==null||l.setter===who)).length, beh, gepland:f.gepland.length, verloren:f.verloren.length, agenda:f.agenda.length, show:f.show.length, signS:f.signS.length, showI:f.showI.length, sign:f.sign.length, closed:f.closed.length, closeLost:f.closeLost.length, paid:f.paid.length, signO:f.signO.length, held, slotShow:s.show.length, late:s.late.length, unres:s.unres.length,
    pr:pct(f.gepland.length,beh), sr:pct(f.show.length,f.agenda.length), gs:pct(f.signS.length,f.show.length), gr:pct(f.sign.length,f.showI.length), cr:pct(f.closed.length,f.closed.length+f.closeLost.length), l2s:pct(f.sign.length,beh), slot:pct(s.show.length,held)};
}
function drawTrend(){
  const tw=document.getElementById("trendwrap");
  const {by,buckets}=trendBuckets();
  const lab = ([a])=> by==="week"? `wk ${isoWeek(a)}` : MND[d2s(a).getMonth()]+" "+String(d2s(a).getFullYear()).slice(2);
  const labels=buckets.map(lab);
  const M=TREND_METRICS.find(m=>m.k===trendMetric)||TREND_METRICS[0];
  const cw=Math.max(320,(tw.clientWidth||900)-34);
  const autoReps=REPS.filter(p=>{ const r=trendRow(p.n,buckets[0][0],B); return r.beh+r.agenda>=20; }).map(p=>p.n).slice(0,3);
  const repsShown = trendReps ? REPS.map(p=>p.n).filter(n=>trendReps.has(n)) : autoReps;
  const seriesFor=(who,name,color,isTeam)=>{ const rows=buckets.map(([a,b])=>trendRow(who,a,b));
    const weak=rows.map(r=> M.pct && M.min ? (M.den(r)||0) < M.min() : false);
    const values=rows.map((r,i)=>{ if(M.pct){ const d=M.den(r); return d && !(weak[i]&&!isTeam) ? pct(M.num(r),d) : null; } return M.num(r); });
    const tips=rows.map(r=> M.pct? `${M.num(r)}/${M.den(r)}` : "");
    return {name,color,values,weak,tips,rows,width:isTeam?3:2,opacity:isTeam?1:.9,showVals:true}; };
  const S=[seriesFor(null,"Team","var(--txt)",true)].concat(M.hideRep&&MODE!=="rep"?[]:repsShown.map(n=>seriesFor(n,n,repCol(n),false)));
  // koppen
  let h=`<div class="wonchips">`+TREND_METRICS.map(m=>`<div class="wchip${trendMetric===m.k?" on":""}" onclick="trendMetric='${m.k}';drawTrend()">${m.t}</div>`).join("")+`</div>`;
  h+=`<div class="wonchips"><span class="lbl">Personen:</span>`+REPS.map(p=>`<div class="wchip${repsShown.includes(p.n)?" on":""}" onclick="trendReps=trendReps||new Set(${JSON.stringify(autoReps)});trendReps.has(${JSON.stringify(p.n)})?trendReps.delete(${JSON.stringify(p.n)}):trendReps.add(${JSON.stringify(p.n)});drawTrend()"><span class="dot" style="background:${repCol(p.n)}"></span>${esc(p.n)}</div>`).join("")+
    `<span style="flex:1"></span>`+[["auto","Auto"],["week","Per week"],["maand","Per maand"]].map(x=>`<div class="wchip${trendBy===x[0]?" on":""}" onclick="trendBy='${x[0]}';drawTrend()">${x[1]}</div>`).join("")+`</div>`;
  // grafiek
  const team=S[0]; const last=team.values.length-1; const cur=team.values[last], prev=team.values[last-1];
  h+=`<div class="cmp"><div class="chhead"><div><h3 style="margin:0">${M.t}${M.rol?` <i class="rolTag">${ROL(M.rol)}</i>`:""} · per ${by==="week"?"ISO-week":"maand"}</h3><div class="chsub">${labels[0]} t/m ${labels[last]} · lopende periode = laatste punt${M.pct?" · open bolletje = te weinig volume":""}</div></div>
    <div class="chnow"><b>${cur==null?"—":(M.pct?(cur+"").replace(".",",")+"%":cur)}</b><span>team, ${labels[last]}</span>${M.pct?ppDelta(cur,prev):(cur!=null&&prev!=null?`<i class="dlt ${cur>prev?"up":cur<prev?"dn":"eq"}">${cur>prev?"▲ +":cur<prev?"▼ ":"= "}${Math.abs(cur-prev)}</i>`:"")}</div></div>
    ${svgLine(S,{pct:M.pct,labels,markLast:true,h:230,w:cw})}${legend(S)}</div>`;
  // alle rates naast elkaar (kleine multiples, team)
  const rateM=TREND_METRICS.filter(m=>m.pct); const smCols=Math.max(1,Math.min(rateM.length,Math.floor((cw)/210))); const smw=Math.floor((cw-(smCols-1)*10)/smCols)-22;
  h+=`<div class="cmp"><h3>Alle rates in één oogopslag · team</h3><div class="smallmult">`+rateM.map(m=>{ const rows=team.rows; const vals=rows.map(r=>{ const d=m.den(r); return d?pct(m.num(r),d):null; }); const weak=rows.map(r=>(m.den(r)||0)<m.min()); const c=vals[vals.length-1], p=vals[vals.length-2];
    return `<div class="sm" onclick="trendMetric='${m.k}';drawTrend()"><div class="smh"><span>${m.t}</span><b>${c==null?"—":(c+"").replace(".",",")+"%"}</b>${ppDelta(c,p)}</div>${svgLine([{name:m.t,color:"var(--plan)",values:vals,weak,width:2}],{pct:true,labels,h:96,pl:30,pb:18,pt:8,ticks:3,w:smw})}</div>`; }).join("")+`</div><p class="note" style="margin-top:8px">Verandering = laatste punt t.o.v. de periode ervoor, in procentpunten (pp). Klik op een kaartje om het groot te zien.</p></div>`;
  // tabel: per periode de rate + verandering
  const T=S;
  h+=`<div class="cmp"><h3>${M.t} per ${by==="week"?"week":"maand"} · met verandering t.o.v. de periode ervoor</h3><table class="trend"><tr><th>Periode</th>`+T.map(s=>`<th><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</th>`).join("")+`</tr>`;
  for(let i=labels.length-1;i>=0;i--){ const isCur=i===last;
    h+=`<tr class="${isCur?"cur":""}"><td><b>${labels[i]}</b> <small>${fmt(buckets[i][0])}${isCur?" · lopend":""}</small></td>`+T.map(s=>{ const v=s.values[i], p=i>0?s.values[i-1]:null; const weak=s.weak&&s.weak[i];
      return `<td class="${weak?"weak":""}"><b>${v==null?"—":(M.pct?(v+"").replace(".",",")+"%":v)}</b>${M.pct?`<small>${s.tips[i]}</small>`:""} ${M.pct?ppDelta(v,p):(v!=null&&p!=null?`<i class="dlt ${v>p?"up":v<p?"dn":"eq"}">${v>p?"▲ +":v<p?"▼ ":"= "}${Math.abs(v-p)}</i>`:"")}</td>`; }).join("")+`</tr>`; }
  h+=`</table></div>`;
  // volledige tabel (counts) team of gekozen persoon
  const who=trendWho; const rows=buckets.map(([a,b])=>trendRow(who,a,b));
  h+=`<div class="cmp"><h3>Alle cijfers per ${by==="week"?"week":"maand"} · ${who?esc(who):"team"} <span class="chsub">(kies: `+[["Team",null]].concat(REPS.map(p=>[p.n,p.n])).map(c=>`<a href="#" onclick="trendWho=${c[1]===null?"null":JSON.stringify(c[1]).replace(/"/g,"&quot;")};drawTrend();return false" style="color:${(trendWho===c[1])?"var(--plan-tx)":"inherit"};font-weight:${trendWho===c[1]?800:500};margin-right:8px">${esc(c[0])}</a>`).join("")+`)</span></h3>
    <table class="trend"><tr><th>Periode</th><th>Nieuwe leads</th><th>Afgehandeld</th><th>Gepland</th><th>Plan rate</th><th>Intakes</th><th>Shows</th><th>Show rate</th><th>Ingeschr.</th><th>Sign rate</th><th>Close rate</th><th>Lead → sale</th><th>Verloren</th><th>Slot-show</th></tr>`;
  const rc=(v,n,d)=>d? `<td><b>${(v+"").replace(".",",")}%</b><small>${n}/${d}</small></td>` : "<td>—</td>";
  for(let i=rows.length-1;i>=0;i--){ const r=rows[i]; h+=`<tr class="${i===last?"cur":""}"><td><b>${labels[i]}</b> <small>${fmt(r.a)}</small></td><td>${r.nieuw}</td><td>${r.beh}</td><td>${r.gepland}</td>${rc(r.pr,r.gepland,r.beh)}<td>${r.agenda}</td><td>${r.show}</td>${rc(r.sr,r.show,r.agenda)}<td>${r.signS}</td>${rc(r.gs,r.signS,r.show)}${rc(r.cr,r.closed,r.closed+r.closeLost)}${rc(r.l2s,r.sign,r.beh)}<td>${r.verloren}</td>${rc(r.slot,r.slotShow,r.held)}</tr>`; }
  h+=`</table></div>
  <p class="note">Rates per ISO-week (ma t/m zo) met dezelfde definities als de funnelkolommen: nieuwe leads op aanmaakdatum, gepland op inplandatum, intakes/shows/inschrijvingen op intakedatum, verloren op datum van afboeken. Absolute aantallen bewegen mee met het aantal leads; de <b>percentages</b> laten zien of het team beter of slechter wordt. Een open bolletje/grijze cel = te weinig volume in die week (plan ≥ ${DEFS.min_volume_plan||15}, show ≥ ${DEFS.min_volume_show||8}, sign/close ≥ ${DEFS.min_volume_sign||5}) — dan zegt het percentage weinig.</p>`;
  tw.innerHTML=h;
}

// ---- 📣 bronnen & ads ----
let bronBy="kanaal", bronSort={c:1,d:-1}, bronMode="periode", bronEvt="show", bronPick=null;
const BRON_EVT={binnen:["Binnengekomen",l=>inR(l.cd,A,B),"cd"], gepland:["Intake gepland",l=>l.stage_position!==0&&inR(l.pd,A,B),"pd"], intake:["Intakes",l=>inR(l.id_,A,B),"id_"], show:["Shows",l=>inR(l.id_,A,B)&&l.is_show,"id_"], sign:["Ingeschreven",l=>inR(l.id_,A,B)&&l.is_signed,"id_"], paid:["Betaald",l=>inR(l.id_,A,B)&&l.is_paid,"id_"]};
function bronLijst(ls, dk, title){
  const rows=[...ls].sort((a,b)=>(b[dk]||0)-(a[dk]||0));
  return `<div class="cmp"><h3>${title} <span class="chsub">(klik op een naam voor GHL)</span></h3><table><tr><th>Naam</th><th>Datum</th><th>Setter</th><th>Eigenaar</th><th>Fase</th><th>Kanaal</th><th>Campagne</th><th>Advertentie</th><th>Temp.</th></tr>`+
    rows.slice(0,200).map(l=>`<tr><td>${ghl(l.contact_id,l.name)}</td><td>${l[dk]>=0?fmt(l[dk]):"—"}</td><td>${esc(l.setter||"—")}</td><td>${esc(l.owner||"—")}</td><td><span class="stg${l.is_signed?" win":l.lost?" lost":""}">${esc(l.stage_name)}${l.lost&&l.stage_position!==0?" · verloren":""}</span></td><td>${esc(l.kanaal||"—")}</td><td><small>${esc(l.utm_campaign||"(leeg)")}</small></td><td><small>${esc(l.utm_content||"(leeg)")}</small></td><td>${esc(l.temperature||"—")}</td></tr>`).join("")+`</table>${rows.length>200?`<div class="more">eerste 200 van ${rows.length}</div>`:""}</div>`;
}
function bronFunnel(k, ls){
  const steps=[["Binnengekomen",ls.length,"var(--mut2)"],["Intake gepland",ls.filter(l=>l.has_planned||l.pd>=0).length,"var(--plan)"],["Intakes geweest",ls.filter(l=>l.id_>=0&&l.id_<=TODAY).length,"var(--plan)"],["Shows",ls.filter(l=>l.is_show).length,"var(--show)"],["Ingeschreven",ls.filter(l=>l.is_signed).length,"var(--sign)"],["Betaald",ls.filter(l=>l.is_paid).length,"var(--close)"]];
  const mx=Math.max(1,steps[0][1]); const lost=ls.filter(l=>l.lost).length, open=ls.filter(l=>l.open).length;
  return `<div class="cmp"><h3>Cohort "${esc(k)}" · ${ls.length} leads binnengekomen ${fmtY(A)} t/m ${fmtY(B)} <span class="chsub">${lost} verloren · ${open} nog open</span></h3>`+steps.map(([t,n,c],i)=>`<div class="fst"><span>${t}</span><em><i style="width:${Math.round(n/mx*100)}%;background:${c}"></i></em><b>${n}</b><small>${i?fpct(n,steps[0][1])+" van binnen":""}${i>1?` · ${fpct(n,steps[i-1][1])} van vorige`:""}</small></div>`).join("")+`</div>`;
}
const BRON_KEYS={kanaal:["Kanaal",l=>l.kanaal||"Onbekend"], utm_campaign:["Campagne",l=>l.utm_campaign||"(leeg)"], utm_content:["Advertentie (utm_content)",l=>l.utm_content||"(leeg)"], utm_source:["utm_source",l=>l.utm_source||"(leeg)"], temperature:["Temperatuur",l=>l.temperature||"(leeg)"], contact_source:["Contactbron (GHL)",l=>l.contact_source||"(leeg)"]};
function bronRows(co,kf){
  const g=new Map(); for(const l of co){ const k=kf(l); if(!g.has(k)) g.set(k,[]); g.get(k).push(l); }
  return [...g.entries()].map(([k,ls])=>{ const gep=ls.filter(l=>l.has_planned||l.pd>=0), lostL=ls.filter(l=>l.lost_in_lead_stage), beh=gep.length+lostL.length, open=ls.filter(l=>l.open&&l.stage_position===0&&!l.has_planned), intake=ls.filter(l=>l.id_>=0), show=ls.filter(l=>l.is_show), sign=ls.filter(l=>l.is_signed), paid=ls.filter(l=>l.is_paid), som=ls.reduce((s,l)=>s+(l.paid_amount>1?l.paid_amount:0),0), lostAll=ls.filter(l=>l.lost);
    const tr=topReason(lostAll);
    return {k, ls, n:ls.length, beh, gep:gep.length, lost:lostL.length, lostAll:lostAll.length, open:open.length, intake:intake.length, show:show.length, sign:sign.length, paid:paid.length, som, pr:pct(gep.length,beh), sr:pct(show.length,intake.length), gr:pct(sign.length,show.length), l2s:pct(sign.length,ls.length), l2i:pct(gep.length,ls.length), lostShare:pct(lostAll.length,ls.length), s2l:median(ls.map(l=>l.s2l)), top:tr?tr[0]+" ("+tr[1]+")":"—"}; });
}
function drawBron(){
  const bw=document.getElementById("bronwrap");
  const co=L.filter(l=>inR(l.cd,A,B));   // cohort: leads binnengekomen in de periode
  const kf=BRON_KEYS[bronBy][1];
  let h=`<div class="wonchips"><div class="wchip${bronMode==="periode"?" on":""}" onclick="bronMode='periode';bronPick=null;drawBron()">⏱ Wat gebeurde er in de periode</div><div class="wchip${bronMode==="cohort"?" on":""}" onclick="bronMode='cohort';bronPick=null;drawBron()">👥 Cohort · leads binnengekomen in de periode</div></div>`;
  h+=`<div class="wonchips"><span class="lbl">Per:</span>`+Object.entries(BRON_KEYS).map(([k,v])=>`<div class="wchip sm${bronBy===k?" on":""}" onclick="bronBy='${k}';bronPick=null;drawBron()">${v[0]}</div>`).join("")+`</div>`;
  if(bronMode==="periode"){
    const E=Object.entries(BRON_EVT); const sets={}; for(const [k,v] of E) sets[k]=L.filter(v[1]);
    h+=`<div class="wonchips"><span class="lbl">Tel:</span>`+E.map(([k,v])=>`<div class="wchip${bronEvt===k?" on":""}" onclick="bronEvt='${k}';bronPick=null;drawBron()">${v[0]}<span class="n">${sets[k].length}</span></div>`).join("")+`</div>`;
    const allKeys=new Set(); for(const k in sets) sets[k].forEach(l=>allKeys.add(kf(l)));
    const rws=[...allKeys].map(k=>{ const o={k}; for(const e in sets) o[e]=sets[e].filter(l=>kf(l)===k); return o; }).sort((a,b)=>b[bronEvt].length-a[bronEvt].length||b.binnen.length-a.binnen.length);
    const tot=sets[bronEvt].length, mx=Math.max(1,...rws.map(r=>r[bronEvt].length));
    h+=`<div class="cmp"><h3>${BRON_EVT[bronEvt][0]} · ${fmtY(A)} t/m ${fmtY(B)} · per ${BRON_KEYS[bronBy][0].toLowerCase()} · <b>${tot}</b> <span class="chsub">klik op een getal voor de namen</span></h3><table class="brontbl"><tr><th>${BRON_KEYS[bronBy][0]}</th>`+E.map(([k,v])=>`<th class="${k===bronEvt?"on":""}">${v[0]}</th>`).join("")+`<th>Aandeel ${BRON_EVT[bronEvt][0].toLowerCase()}</th></tr>`;
    for(const r of rws.slice(0,80)){ const n=r[bronEvt].length; h+=`<tr class="${bronPick===r.k?"sel":""}"><td><b>${esc(r.k)}</b></td>`+E.map(([k])=>`<td class="clk${k===bronEvt?" on":""}" onclick="bronPick=${jq(r.k)};bronEvt='${k}';drawBron()">${r[k].length?`<b>${r[k].length}</b>`:"<span class=dim>0</span>"}</td>`).join("")+`<td><div class="shr"><em><i style="width:${Math.round(n/mx*100)}%"></i></em><span>${fpct(n,tot)}</span></div></td></tr>`; }
    h+=`<tr class="tot"><td><b>Totaal</b></td>`+E.map(([k])=>`<td class="${k===bronEvt?"on":""}"><b>${sets[k].length}</b></td>`).join("")+`<td></td></tr></table>${rws.length>80?`<div class="more">eerste 80 van ${rws.length}</div>`:""}</div>`;
    if(bronPick!=null){ const ls=sets[bronEvt].filter(l=>kf(l)===bronPick); h+=bronLijst(ls,BRON_EVT[bronEvt][2],`${BRON_EVT[bronEvt][0]} via ${BRON_KEYS[bronBy][0].toLowerCase()} "${esc(bronPick)}" · ${ls.length}`); }
    h+=`<p class="note">Telt wat er <b>in de gekozen periode gebeurde</b> — binnengekomen op aanmaakdatum, gepland op inplandatum, intakes/shows/inschrijvingen/betaald op intakedatum — en laat zien via welk kanaal, welke campagne of advertentie die mensen ooit binnenkwamen. De totalen sluiten aan op de KPI-tegels bovenin. Bron = de UTM-velden op de <b>opportunity</b> (custom fields utm source/campaign/content), niet het standaard GHL-contactveld; Kanaal = utm_source samengevoegd (facebook/fb/meta → Facebook / Meta, ig → Instagram) met terugval op de GHL-contactbron.</p>`;
    bw.innerHTML=h; return;
  }
  const rows=bronRows(co,kf);
  const cols=[["k","Bron"],["n","Leads"],["open","Nog open"],["beh","Afgehandeld"],["gep","Intake gepland"],["pr","Plan rate"],["intake","Intakes"],["show","Shows"],["sr","Show rate"],["sign","Ingeschr."],["gr","Sign rate"],["l2s","Lead → sale"],["lostShare","Verloren %"],["top","Top verliesreden"],["paid","Betaald"],["s2l","Reactietijd"]];
  const s=bronSort; rows.sort((x,y)=>{ const c=cols[s.c][0]; let a=x[c],b=y[c]; if(a==null)a=-1; if(b==null)b=-1; return (a<b?-1:a>b?1:0)*s.d; });
  const T={n:co.length}; for(const k of ["beh","gep","lost","lostAll","open","intake","show","sign","paid","som"]) T[k]=rows.reduce((a,r)=>a+r[k],0);
  const mn=+(DEFS.min_volume_plan||15);
  const bestPr=Math.max(...rows.filter(r=>r.beh>=mn).map(r=>r.pr),-1), worstPr=Math.min(...rows.filter(r=>r.beh>=mn).map(r=>r.pr),999);
  const cell=(r,c)=>{ const v=r[c]; if(c==="k") return `<td class="clk" onclick="bronPick=${jq(v)};drawBron()"><b>${esc(v)}</b></td>`; if(c==="top") return `<td><small>${esc(v)}</small></td>`;
    if(c==="pr"){ const cls=r.beh>=mn&&rows.filter(x=>x.beh>=mn).length>1?(v===bestPr?"best":v===worstPr?"worst":""):""; return `<td class="${cls}${r.beh<mn?" weak":""}"><b>${(v+"").replace(".",",")}%</b></td>`; }
    if(["sr","gr","l2s","lostShare"].includes(c)) return `<td><b>${(v+"").replace(".",",")}%</b></td>`; if(c==="s2l") return `<td>${fmin(v)}</td>`; return `<td>${v}</td>`; };
  // beste / slechtste
  const ranked=rows.filter(r=>r.n>=10);
  const rank=(list,title,cls)=>`<div class="cmp"><h3>${title}</h3>`+(list.length?`<table><tr><th>${BRON_KEYS[bronBy][0]}</th><th>Leads</th><th>Lead → intake gepland</th><th>Verloren %</th><th>Ingeschr.</th><th>Top verliesreden</th></tr>`+list.map(r=>`<tr><td><b>${esc(r.k)}</b></td><td>${r.n}</td><td class="${cls}"><b>${(r.l2i+"").replace(".",",")}%</b> <small>${r.gep}/${r.n}</small></td><td>${(r.lostShare+"").replace(".",",")}%</td><td>${r.sign}</td><td><small>${esc(r.top)}</small></td></tr>`).join("")+`</table>`:`<div class="empty">Te weinig volume (min. 10 leads per ${BRON_KEYS[bronBy][0].toLowerCase()}) in deze periode.</div>`)+`</div>`;
  if(ranked.length>=6){ const byL2i=[...ranked].sort((a,b)=>b.l2i-a.l2i);
    h+=`<div class="two">${rank(byL2i.slice(0,5),"🏆 Best presterend (leads → intake gepland)","best")}${rank(byL2i.slice(-5).reverse(),"⚠️ Slechtst presterend","worst")}</div>`; }
  h+=`<div class="cmp"><h3>Leads binnengekomen ${fmtY(A)} t/m ${fmtY(B)} · per ${BRON_KEYS[bronBy][0].toLowerCase()} · ${co.length} leads</h3><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="bronSort.c===${i}?bronSort.d=-bronSort.d:(bronSort={c:${i},d:-1});drawBron()">${c[1]} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+"</tr>";
  h+=`<tr class="tot"><td><b>Totaal</b></td><td>${T.n}</td><td>${T.open}</td><td>${T.beh}</td><td>${T.gep}</td><td><b>${(pct(T.gep,T.beh)+"").replace(".",",")}%</b></td><td>${T.intake}</td><td>${T.show}</td><td><b>${(pct(T.show,T.intake)+"").replace(".",",")}%</b></td><td>${T.sign}</td><td><b>${(pct(T.sign,T.show)+"").replace(".",",")}%</b></td><td><b>${(pct(T.sign,T.n)+"").replace(".",",")}%</b></td><td><b>${(pct(T.lostAll,T.n)+"").replace(".",",")}%</b></td><td><small>${(()=>{const t=topReason(co.filter(l=>l.lost)); return t?esc(t[0])+" ("+t[1]+")":"—";})()}</small></td><td>${T.paid}</td><td>${fmin(median(co.map(l=>l.s2l)))}</td></tr>`;
  for(const r of rows.slice(0,80)) h+=`<tr class="${bronPick===r.k?"sel":""}">`+cols.map(c=>cell(r,c[0])).join("")+"</tr>";
  h+=`</table>${rows.length>80?`<div class="more">eerste 80 van ${rows.length} getoond</div>`:""}</div>`;
  if(bronPick!=null){ const ls=co.filter(l=>kf(l)===bronPick); h+=bronFunnel(bronPick,ls)+bronLijst(ls,"cd",`Leads via ${BRON_KEYS[bronBy][0].toLowerCase()} "${esc(bronPick)}" · ${ls.length}`); }
  // kanaal × temperatuur + verliesredenen per kanaal
  if(bronBy==="kanaal"){ const temps=["Hot","Warm","Cold","(leeg)"]; const kan=[...new Set(co.map(l=>l.kanaal||"Onbekend"))].sort((a,b)=>co.filter(l=>(l.kanaal||"Onbekend")===b).length-co.filter(l=>(l.kanaal||"Onbekend")===a).length);
    const rsn=[...new Set(co.filter(l=>l.lost).map(l=>l.lost_reason||"(geen reden)"))].map(r=>[r,co.filter(l=>l.lost&&(l.lost_reason||"(geen reden)")===r).length]).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
    h+=`<div class="two"><div class="cmp"><h3>Kanaal × temperatuur (leads · plan rate)</h3><table><tr><th>Kanaal</th>${temps.map(t=>`<th>${t}</th>`).join("")}</tr>`+
      kan.map(k=>`<tr><td><b>${esc(k)}</b></td>`+temps.map(t=>{ const ls=co.filter(l=>(l.kanaal||"Onbekend")===k&&(l.temperature||"(leeg)")===t); const gep=ls.filter(l=>l.has_planned||l.pd>=0).length, beh=gep+ls.filter(l=>l.lost_in_lead_stage).length; return `<td>${ls.length?`${ls.length} · <b>${beh?fpct(gep,beh):"—"}</b>`:"—"}</td>`; }).join("")+"</tr>").join("")+`</table></div>
      <div class="cmp"><h3>Verliesredenen per kanaal (aandeel van de leads)</h3><table><tr><th>Kanaal</th>${rsn.map(r=>`<th>${esc(r)}</th>`).join("")}</tr>`+
      kan.map(k=>{ const ls=co.filter(l=>(l.kanaal||"Onbekend")===k); return `<tr><td><b>${esc(k)}</b> <small>${ls.length}</small></td>`+rsn.map(r=>{ const n=ls.filter(l=>l.lost&&(l.lost_reason||"(geen reden)")===r).length; return `<td>${n?`${n} <small>${fpct(n,ls.length)}</small>`:"—"}</td>`; }).join("")+"</tr>"; }).join("")+`</table></div></div>`; }
  h+=`<p class="note">Cohort op <b>aanmaakdatum</b> van de lead: zo zie je per bron/campagne/advertentie wat een lead uiteindelijk oplevert. Recente leads staan nog "open" — kies een periode van minstens een paar weken oud voor een eerlijk beeld. Kanaal = utm_source samengevoegd (facebook/fb/meta → Facebook / Meta, ig → Instagram) met terugval op de GHL-contactbron. Plan rate = intake gepland ÷ (gepland + verloren in Leads-fase); <b>lead → intake gepland</b> = gepland ÷ alle leads (de eerlijkste maat om ads te vergelijken); lead → sale = ingeschreven ÷ alle leads. Best/slechtst alleen bij ≥ 10 leads. Klik op een bron voor de funnel en de namen. Bron = UTM-velden op de <b>opportunity</b> (custom fields), niet het standaard GHL-veld.</p>`;
  bw.innerHTML=h;
}

// ---- 🚫 verloren: per rep × fase, redenen, trend ----
let lostSeg="all", lostOwner=null, lostSort={c:0,d:-1};
const SEG=["Leads-fase","Intake gepland, geen show","Na show"];
const SEGC={"Leads-fase":"var(--plan)","Intake gepland, geen show":"var(--show)","Na show":"var(--close)"};
function topReason(ls){ const rc=new Map(); for(const l of ls) rc.set(l.lost_reason||"(geen reden)",(rc.get(l.lost_reason||"(geen reden)")||0)+1); return [...rc.entries()].sort((a,b)=>b[1]-a[1])[0]; }
function drawLost(){
  const lw=document.getElementById("lostwrap");
  const all=L.filter(l=>l.lost&&inR(l.scd,A,B));
  const base=all.filter(l=>lostSeg==="all"||l.faseVerlies===lostSeg);
  const owners=[...new Set(all.map(l=>l.owner||"—"))].sort((a,b)=>all.filter(l=>(l.owner||"—")===b).length-all.filter(l=>(l.owner||"—")===a).length);
  const rows=lostOwner===null? base : base.filter(l=>(l.owner||"—")===lostOwner);
  const reasons=[...new Set(all.map(l=>l.lost_reason||"(geen reden)"))];
  const cnt=(ls,r,sg)=>ls.filter(l=>(l.lost_reason||"(geen reden)")===r&&(sg==null||l.faseVerlies===sg)).length;
  reasons.sort((a,b)=>cnt(rows,b)-cnt(rows,a));
  let h=`<div class="wonchips">`+[["all","Alle fases"]].concat(SEG.map(x=>[x,x])).map(c=>`<div class="wchip${lostSeg===c[0]?" on":""}" onclick="lostSeg=${JSON.stringify(c[0]).replace(/"/g,"&quot;")};drawLost()">${c[1]}<span class="n">${c[0]==="all"?all.length:all.filter(l=>l.faseVerlies===c[0]).length}</span></div>`).join("")+
    `<span style="flex:1"></span>`+[["Alle eigenaren",null]].concat(owners.map(o=>[o,o])).map(c=>`<div class="wchip${lostOwner===c[1]?" on":""}" onclick="lostOwner=${c[1]===null?"null":JSON.stringify(c[1]).replace(/"/g,"&quot;")};drawLost()">${esc(c[0])}<span class="n">${c[1]===null?base.length:base.filter(l=>(l.owner||"—")===c[1]).length}</span></div>`).join("")+`</div>`;
  // 1. per rep × fase: verliespercentage + topreden
  const rep=(o)=>{ const f=funnel(o,A,B); const beh=f.gepland.length+f.verloren.length;
    const gs=f.geenShow.filter(l=>l.lost), agenda=MODE==="rep"?f.agenda:L.filter(l=>inR(l.id_,A,B)&&(o==null||l.owner===o));
    const gsO=agenda.filter(l=>!l.is_show&&l.lost);
    return {beh, lostL:f.verloren, prL:pct(f.verloren.length,beh), agenda, gsO, prS:pct(gsO.length,agenda.length), doss:f.dossiers, closeLost:f.closeLost, prC:pct(f.closeLost.length,f.closed.length+f.closeLost.length)}; };
  const people=[null].concat(REPS.map(p=>p.n));
  const cell=(n,d,p,ls,color)=>`<td class="lcell"><div class="lc"><b>${d?(p+"").replace(".",",")+"%":"—"}</b><small>${n} van ${d}</small><i class="cbar" style="width:${Math.min(100,p)}%;background:${color}"></i>${(()=>{const t=topReason(ls); return t?`<em>${esc(t[0])} (${t[1]})</em>`:""})()}</div></td>`;
  h+=`<div class="cmp"><h3>Waar verliest wie? · ${fmtY(A)} t/m ${fmtY(B)}</h3><table class="lostm"><tr><th>Persoon</th><th>Verloren in Leads-fase<br><i>÷ afgehandeld (eigenaar)</i></th><th>Verloren zonder show<br><i>÷ intakes op de agenda (eigenaar)</i></th><th>Verloren na show<br><i>÷ afgeronde dossiers (eigenaar)</i></th><th>Totaal verloren</th></tr>`;
  for(const o of people){ const r=rep(o); const tot=r.lostL.length+r.gsO.length+r.closeLost.length; if(o!==null&&(r.beh+r.agenda.length<5)) continue;
    h+=`<tr class="${o===null?"tot":""}"><td><b>${o===null?"Team":esc(o)}</b></td>${cell(r.lostL.length,r.beh,r.prL,r.lostL,SEGC["Leads-fase"])}${cell(r.gsO.length,r.agenda.length,r.prS,r.gsO,SEGC["Intake gepland, geen show"])}${cell(r.closeLost.length,r.closeLost.length+r.doss.filter(l=>l.is_signed).length,r.prC,r.closeLost,SEGC["Na show"])}<td><b>${tot}</b></td></tr>`; }
  h+=`</table><p class="note" style="margin-top:8px">Per fase een eigen noemer, cursief eronder = meest voorkomende reden in die cel. Zo zie je in één oogopslag: verliest iemand vooral vóór het plannen (bereikbaarheid, kwalificatie), door no-shows, of ná het gesprek (bezwaren, geld).</p></div>`;
  // 2. trend per week: verloren per fase (gestapeld) + top-5 redenen
  const {buckets}=(()=>{ const end=B; const start=Math.min(A,end-12*7+1); const bs=[]; for(let d=weekKey(start); d<=end; d+=7) bs.push([d,Math.min(d+6,end)]); return {buckets:bs}; })();
  const labels=buckets.map(([a])=>"wk "+isoWeek(a));
  const lostAll=L.filter(l=>l.lost&&(lostOwner===null||(l.owner||"—")===lostOwner));
  const groups=buckets.map(([a,b],i)=>({label:labels[i], parts:SEG.map(sg=>({name:sg,color:SEGC[sg],v:lostAll.filter(l=>inR(l.scd,a,b)&&l.faseVerlies===sg).length}))}));
  const top5=[...new Set(lostAll.filter(l=>inR(l.scd,buckets[0][0],B)).map(l=>l.lost_reason||"(geen reden)"))].map(r=>[r,lostAll.filter(l=>inR(l.scd,buckets[0][0],B)&&(l.lost_reason||"(geen reden)")===r).length]).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const rs=top5.map(([r],k)=>({name:r,color:CHART_COL[k],values:buckets.map(([a,b])=>lostAll.filter(l=>inR(l.scd,a,b)&&(l.lost_reason||"(geen reden)")===r).length),width:2}));
  const cw2=Math.max(300,Math.floor(((lw.clientWidth||900)-12)/((lw.clientWidth||900)>900?2:1))-34);
  h+=`<div class="two"><div class="cmp"><h3>Verloren per week · per fase${lostOwner?" · "+esc(lostOwner):""}</h3>${svgBars(groups,{h:180,w:cw2})}${legend(SEG.map(sg=>({name:sg,color:SEGC[sg]})))}</div>
    <div class="cmp"><h3>Top-5 verliesredenen per week${lostOwner?" · "+esc(lostOwner):""}</h3>${svgLine(rs,{labels,h:180,w:cw2})}${legend(rs)}</div></div>`;
  // 3. redenen × fase
  h+=`<div class="cmp"><h3>Verliesredenen${lostOwner?" · "+esc(lostOwner):""}${lostSeg!=="all"?" · "+esc(lostSeg):""} · ${rows.length} verloren</h3><table><tr><th>Reden</th><th>Totaal</th><th>Aandeel</th>${SEG.map(x=>`<th>${x}</th>`).join("")}<th>Per persoon</th><th></th></tr>`;
  const mxr=Math.max(1,...reasons.map(r=>cnt(rows,r)));
  for(const r of reasons){ const n=cnt(rows,r); if(!n) continue; const perO=owners.map(o=>[o,rows.filter(l=>(l.lost_reason||"(geen reden)")===r&&(l.owner||"—")===o).length]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).map(x=>`${esc(x[0])} ${x[1]}`).join(" · ");
    h+=`<tr><td><b>${esc(r)}</b></td><td>${n}</td><td>${fpct(n,rows.length)}</td>${SEG.map(sg=>`<td>${cnt(rows,r,sg)||"—"}</td>`).join("")}<td><small>${perO}</small></td><td style="min-width:120px"><div class="tbar"><i style="width:${Math.round(n/mxr*100)}%;background:var(--close)"></i></div></td></tr>`; }
  h+=`</table></div>`;
  // 4. lijst
  const cols=[
    {t:"Verloren op", v:l=>l.scd, k:l=>l.scd>=0?fmt(l.scd):"—"},
    {t:"Naam", v:l=>l.name.toLowerCase(), k:l=>ghl(l.contact_id,l.name)},
    {t:"Reden", v:l=>l.lost_reason||"", k:l=>esc(l.lost_reason||"(geen reden)")},
    {t:"Fase bij verlies", v:l=>l.stage_position, k:l=>`<span class="stg lost">${esc(l.stage_name)}</span>`},
    {t:"Setter", v:l=>l.setter, k:l=>esc(l.setter||"—")},
    {t:"Eigenaar", v:l=>l.owner, k:l=>esc(l.owner||"—")},
    {t:"Binnengekomen", v:l=>l.cd, k:l=>l.cd>=0?fmt(l.cd):"—"},
    {t:"Dagen in pijplijn", v:l=>l.dagenPijp==null?-1:l.dagenPijp, k:l=>l.dagenPijp==null?"—":l.dagenPijp+" d"},
    {t:"Kanaal", v:l=>l.kanaal||"", k:l=>esc(l.kanaal||"—")},
    {t:"Campagne", v:l=>l.utm_campaign||"", k:l=>esc(l.utm_campaign||"—")},
    {t:"Temp.", v:l=>l.temperature||"", k:l=>esc(l.temperature||"—")},
  ];
  const s=lostSort; const sorted=[...rows].sort((x,y)=>{ const a=cols[s.c].v(x), b=cols[s.c].v(y); return (a<b?-1:a>b?1:0)*s.d; });
  h+=`<div class="wontbl"><table><tr>`+cols.map((c,i)=>`<th><span class="sortl" onclick="lostSort.c===${i}?lostSort.d=-lostSort.d:(lostSort={c:${i},d:1});drawLost()">${c.t} <span class="arr">${s.c===i?(s.d>0?"▲":"▼"):""}</span></span></th>`).join("")+"</tr>";
  for(const l of sorted.slice(0,300)) h+="<tr>"+cols.map(c=>`<td>${c.k(l)}</td>`).join("")+"</tr>";
  if(!sorted.length) h+=`<tr><td colspan="${cols.length}" class="empty">Geen verloren leads in deze selectie.</td></tr>`;
  h+=`</table>${sorted.length>300?`<div class="more">eerste 300 van ${sorted.length} getoond — kies een kortere periode</div>`:""}</div>
  <p class="note">Geteld op de datum waarop de deal op <i>lost</i> is gezet, bij de eigenaar van de deal op dat moment (wie op verloren sleept). <b>Leads-fase</b> = verloren vóór er een intake gepland stond (drukt de plan rate); <b>zonder show</b> = na inplannen verloren zonder show (drukt de show rate); <b>na show</b> = dossier verloren na een gevoerde intake (drukt de close rate). "Reopen later" is strikt genomen geen verlies maar een parkeerplek.</p>`;
  lw.innerHTML=h;
}

// ---- 💬 vraag: opvallende zaken op basis van de gekozen periode (regelmotor) + datapakket voor Claude ----
let askQ="", askFilter="all";
function insights(){
  const tot=funnel(null,A,B), ts=slots(null,A,B,"setter");
  const tBeh=tot.gepland.length+tot.verloren.length;
  const tPlan=pct(tot.gepland.length,tBeh), tShow=pct(tot.show.length,tot.agenda.length), tSign=pct(tot.signS.length,tot.show.length), tClose=pct(tot.closed.length,tot.closed.length+tot.closeLost.length);
  const MP=+(DEFS.min_volume_plan||15), MS=+(DEFS.min_volume_show||8), MG=+(DEFS.min_volume_sign||5);
  const items=[], rows=[]; const r1=v=>(v+"").replace(".",",");
  for(const p of REPS){
    const f=funnel(p.n,A,B); const beh=f.gepland.length+f.verloren.length;
    const pr=pct(f.gepland.length,beh), sr=pct(f.show.length,f.agenda.length), gr=pct(f.signS.length,f.show.length), cr=pct(f.closed.length,f.closed.length+f.closeLost.length);
    rows.push({n:p.n,beh,gepland:f.gepland.length,agenda:f.agenda.length,show:f.show.length,signS:f.signS.length,dossiers:f.dossiers.length,signO:f.signO.length,closed:f.closed.length,closeLost:f.closeLost.length,pr:beh>=MP?pr:null,sr:f.agenda.length>=MS?sr:null,gr:f.show.length>=MG?gr:null,cr:(f.closed.length+f.closeLost.length)>=MG?cr:null});
    if(beh>=25 && pr < tPlan-5){ const extra=Math.round((tPlan-pr)/100*beh); const tr=topReason(f.verloren);
      items.push({cat:"rep",imp:extra*3, tag:extra>=8?"hi":"mid", t:`${p.n} verliest veel in de planfase`, p:`Plan rate ${fpct(f.gepland.length,beh)} tegenover ${r1(tPlan)}% gemiddeld, op ${beh} afgehandelde leads (${f.verloren.length} verloren${tr?`, vooral "${tr[0]}" ${tr[1]}×`:""}). Op het gemiddelde waren dat ± ${extra} extra geplande intakes.`, d:`Bekijk de verliesredenen van ${p.n} (tab Verloren) en het belritme in de Leads-fase.`}); }
    if(beh>=25 && pr > tPlan+5){ items.push({cat:"rep",imp:Math.round((pr-tPlan)/100*beh)*2, tag:"lo", t:`${p.n} plant het best in`, p:`Plan rate ${fpct(f.gepland.length,beh)} tegenover ${r1(tPlan)}% gemiddeld (${beh} afgehandeld).`, d:`Laat ${p.n} zijn belscript/aanpak delen met de rest.`}); }
    if(f.agenda.length>=MS && sr < tShow-10){ const extra=Math.round((tShow-sr)/100*f.agenda.length);
      items.push({cat:"rep",imp:extra*8, tag:extra>=4?"hi":"mid", t:`Lage show rate op de intakes van ${p.n}`, p:`${f.show.length} van ${f.agenda.length} door ${p.n} ingeplande intakes verschenen (${fpct(f.show.length,f.agenda.length)}) tegenover ${r1(tShow)}% gemiddeld. Op het gemiddelde waren dat ± ${extra} extra shows.`, d:`Check bevestiging/reminders en de doorlooptijd tussen boeken en intake (tab Afspraken).`}); }
    if(f.show.length>=MG && gr < tSign-10){ const extra=Math.max(1,Math.round((tSign-gr)/100*f.show.length));
      items.push({cat:"rep",imp:extra*20, tag:"hi", t:`${p.n}: shows gezet, weinig inschrijvingen`, p:`Van de ${f.show.length} geshowde intakes die ${p.n} zette zijn er ${f.signS.length} ingeschreven (${fpct(f.signS.length,f.show.length)}) tegenover ${r1(tSign)}% gemiddeld — bij € 6.800 per traject is elke gemiste sale direct voelbaar.`, d:`Check de kwalificatie aan de telefoon en kijk wie deze intakes voerde (klik op de sign-rij voor de namen).`}); }
    if((f.closed.length+f.closeLost.length)>=MG && cr < tClose-10){ const tr=topReason(f.closeLost);
      items.push({cat:"rep",imp:f.closeLost.length*10, tag:"mid", t:`${p.n} verliest relatief veel dossiers na de show`, p:`Van de afgeronde dossiers na show die ${p.n} bezit is ${fpct(f.closed.length,f.closed.length+f.closeLost.length)} ingeschreven (${f.closeLost.length} verloren${tr?`, vooral "${tr[0]}"`:""}) tegenover ${r1(tClose)}% gemiddeld.`, d:`Kijk naar de verliesredenen na show en het opvolgritme na de intake.`}); }
  }
  const openGS=tot.geenShow.filter(l=>l.open);
  if(openGS.length>=3) items.push({cat:"funnel",imp:openGS.length*4, tag:openGS.length>=10?"hi":"mid", t:`${openGS.length} no-shows staan nog open`, p:`Van de ${tot.geenShow.length} geen-shows in deze periode zijn er ${openGS.length} nog niet verloren gezet — die zijn mogelijk nog te herplannen.`, d:`Nabellen/appen en direct een nieuwe intake plannen (klik show-blok → rechterlijst).`});
  if(ts.unres.length>=3) items.push({cat:"funnel",imp:ts.unres.length*3, tag:"mid", t:`${ts.unres.length} intakes zonder geregistreerde uitkomst`, p:`Deze afspraken zijn geweest maar staan in GHL nog op new/confirmed. Zolang niemand show of no-show zet, tellen ze niet mee en klopt de show rate per slot niet.`, d:`Laat de intakers na elke intake-avond de status zetten (tab Afspraken → "Zonder uitkomst").`});
  if(ts.late.length>=3) items.push({cat:"funnel",imp:ts.late.length*4, tag:"mid", t:`${ts.late.length} late cancels (op de dag zelf)`, p:`${ts.late.length} van de ${ts.all.length} intakes zijn op de dag zelf geannuleerd — verloren tijd voor de intaker, maar deze mensen zijn makkelijker terug te halen dan een no-show.`, d:`Aparte reactivatie-flow voor late cancels; check of de bevestigingsreminder op tijd gaat.`});
  const withBoth=tot.agenda.filter(l=>l.cd>=0&&l.id_>=0);
  const fast=withBoth.filter(l=>l.id_-l.cd<=3), slow=withBoth.filter(l=>l.id_-l.cd>3);
  if(fast.length>=10&&slow.length>=10){ const fs=pct(fast.filter(l=>l.is_show).length,fast.length), ss=pct(slow.filter(l=>l.is_show).length,slow.length);
    if(fs>ss+8) items.push({cat:"funnel",imp:Math.round((fs-ss)/100*slow.length)*6, tag:"mid", t:`Snel plannen loont: ${r1(fs)}% vs ${r1(ss)}% show`, p:`Intakes binnen 3 dagen na binnenkomst: ${r1(fs)}% show (${fast.length} leads). Later gepland: ${r1(ss)}% (${slow.length} leads).`, d:`Stuur op inplannen binnen 72 uur; ${slow.length} intakes zaten er deze periode boven.`}); }
  const p1=ts.all.filter(x=>x.attempt_number===1), p2=ts.all.filter(x=>x.attempt_number>=2), heldN=x=>x.filter(y=>y.is_show||y.is_noshow||y.is_late_cancel).length;
  if(heldN(p1)>=10&&heldN(p2)>=5){ const a1=pct(p1.filter(x=>x.is_show).length,heldN(p1)), a2=pct(p2.filter(x=>x.is_show).length,heldN(p2));
    items.push({cat:"funnel",imp:Math.abs(a1-a2), tag:"lo", t:`Herplande intakes: ${r1(a2)}% show vs ${r1(a1)}% bij de eerste afspraak`, p:`${heldN(p2)} gehouden slots waren een 2e of latere poging; ${heldN(p1)} een eerste. ${a2<a1?"Herplannen levert dus minder op — weeg af hoeveel moeite je erin steekt.":"Herplannen loont hier — blijf no-shows actief herplannen."}`, d:`Zie tab Afspraken → "Eerste poging versus herplanning".`}); }
  // verliesredenen
  const lostAll=L.filter(l=>l.lost&&inR(l.scd,A,B));
  const cnt=new Map(); for(const l of tot.verloren) if(l.lost_reason) cnt.set(l.lost_reason,(cnt.get(l.lost_reason)||0)+1);
  const top=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(top && top[1]>=10){ items.push({cat:"lost",imp:top[1], tag:"mid", t:`Grootste lek in de Leads-fase: "${top[0]}" (${top[1]}×)`, p:`${r1(pct(top[1],tot.verloren.length))}% van de ${tot.verloren.length} in de Leads-fase verloren leads heeft deze reden.`, d: top[0]==="4 calls attempted" ? "Bereikbaarheidsprobleem: test bellen op andere tijden + extra WhatsApp-poging vóór afboeken." : top[0]==="Not interested" ? "Kijk of de advertentie de verwachting goed zet (prijs/duur/niveau) en check het openingsscript." : "Kijk of dit met targeting (advertenties) of het belproces te voorkomen is."}); }
  const afterShow=lostAll.filter(l=>l.faseVerlies==="Na show"); const tr2=topReason(afterShow);
  if(afterShow.length>=5&&tr2) items.push({cat:"lost",imp:afterShow.length*3, tag:"mid", t:`Na de show verloren: ${afterShow.length}, vooral "${tr2[0]}"`, p:`${tr2[1]} van de ${afterShow.length} verloren dossiers na show hebben deze reden.`, d:`Bespreek dit bezwaar in de intake zelf en werk aan de opvolging in de eerste 48 uur na het gesprek.`});
  const noShowLost=lostAll.filter(l=>l.faseVerlies==="Intake gepland, geen show");
  if(noShowLost.length>=5) items.push({cat:"lost",imp:noShowLost.length*2, tag:"lo", t:`${noShowLost.length} leads afgeboekt na een no-show`, p:`Zij zijn ingepland maar nooit gekomen en daarna verloren gezet.`, d:`Overweeg een tweede belpoging + WhatsApp vóór afboeken; herplannen levert nog steeds shows op.`});
  // bronnen / ads
  const co=L.filter(l=>inR(l.cd,A,B)); const camp=bronRows(co,BRON_KEYS.utm_campaign[1]).filter(r=>r.n>=10&&r.k!=="(leeg)"); const kan=bronRows(co,BRON_KEYS.kanaal[1]).filter(r=>r.n>=10);
  const teamL2i=pct(co.filter(l=>l.has_planned||l.pd>=0).length,co.length);
  for(const r of camp.sort((a,b)=>a.l2i-b.l2i).slice(0,2)) if(r.l2i<teamL2i-8) items.push({cat:"bron",imp:Math.round((teamL2i-r.l2i)/100*r.n)*3, tag:"mid", t:`Campagne "${r.k}" levert weinig intakes op`, p:`${r.gep} van ${r.n} leads kreeg een intake gepland (${r1(r.l2i)}%) tegenover ${r1(teamL2i)}% gemiddeld; ${r1(r.lostShare)}% al verloren, meest "${r.top}".`, d:`Check targeting/creatie van deze campagne of pauzeer hem; vergelijk in tab Bronnen & Ads per advertentie.`});
  for(const r of camp.sort((a,b)=>b.l2i-a.l2i).slice(0,1)) if(r.l2i>teamL2i+8) items.push({cat:"bron",imp:Math.round((r.l2i-teamL2i)/100*r.n)*2, tag:"lo", t:`Beste campagne: "${r.k}"`, p:`${r1(r.l2i)}% van de ${r.n} leads kreeg een intake gepland (gemiddeld ${r1(teamL2i)}%); ${r.sign} ingeschreven.`, d:`Schaal budget hierheen als de kosten per lead vergelijkbaar zijn.`});
  for(const r of kan) if(r.n>=30&&r.l2i<teamL2i-10) items.push({cat:"bron",imp:Math.round((teamL2i-r.l2i)/100*r.n)*2, tag:"mid", t:`Kanaal ${r.k}: lage lead-kwaliteit`, p:`${r1(r.l2i)}% van ${r.n} leads kreeg een intake (gemiddeld ${r1(teamL2i)}%); top verliesreden "${r.top}".`, d:`Kwalificatievragen aanscherpen of ander publiek testen op dit kanaal.`});
  // trend: laatste afgeronde week vs 4 ervoor (team)
  const wk=[]; for(let d=weekKey(NOW)-7*6; d<weekKey(NOW); d+=7) wk.push(trendRow(null,d,d+6));
  if(wk.length>=5){ const last=wk[wk.length-1], prev=wk.slice(-5,-1); const avg=k=>prev.reduce((s,r)=>s+r[k],0)/prev.length;
    for(const [k,lab] of [["pr","plan rate"],["sr","show rate"],["gs","sign rate"],["cr","close rate"],["l2s","lead → sale"]]){ const a=avg(k), v=last[k]; if(a>0&&Math.abs(v-a)>=8) items.push({cat:"trend",imp:Math.abs(v-a)*3, tag:v<a?"mid":"lo", t:`${lab.charAt(0).toUpperCase()+lab.slice(1)} vorige week ${v<a?"gezakt":"gestegen"} naar ${r1(v)}%`, p:`Gemiddelde van de 4 weken ervoor: ${r1(Math.round(a*10)/10)}%.`, d:`Zie tab Trend voor het verloop per week en per persoon.`}); } }
  items.sort((a,b)=>b.imp-a.imp);
  return {items,rows,tot,tBeh,tPlan,tShow,tSign,tClose,MP,MS,MG};
}
function askRun(q){ askQ=q||document.getElementById("askq").value||""; const s=askQ.toLowerCase();
  askFilter = /ad|campag|bron|utm|kanaal|meta|instagram|google/.test(s)?"bron" : /verl|reden|lek/.test(s)?"lost" : /coach|wie |rep|setter|intaker|marcel|django|linda|lucas|abel/.test(s)?"rep" : /trend|week|beter|slechter|verloop/.test(s)?"trend" : /show|no-show|afspra|slot|snel/.test(s)?"funnel" : "all";
  if(/30 dagen|dertig/.test(s)) setRange(NOW-29,NOW); else if(/deze week/.test(s)) setRange(weekKey(NOW),NOW); else if(/vorige week/.test(s)) setRange(weekKey(NOW)-7,weekKey(NOW)-1); else if(/deze maand/.test(s)) setRange(monthKey(NOW),NOW); else drawAsk(); }
function askPak(){ const I=insights(); const r1=v=>(v+"").replace(".",",");
  const lines=[`DPAC sales · periode ${fmtY(A)} t/m ${fmtY(B)} (weergave: ${MODE==="rep"?"per rep v1":"rollen"})`,`Team: ${I.tBeh} afgehandeld · plan ${r1(I.tPlan)}% · ${I.tot.agenda.length} intakes · show ${r1(I.tShow)}% · ${I.tot.show.length} shows · sign ${r1(I.tSign)}% · close ${r1(I.tClose)}% · ${I.tot.signO.length} ingeschreven · ${I.tot.paid.length} betaald`];
  for(const r of I.rows) lines.push(`${r.n}: afgehandeld ${r.beh}, gepland ${r.gepland} (plan ${r.pr==null?"n.v.t.":r1(r.pr)+"%"}), intakes gezet ${r.agenda}, shows ${r.show} (show ${r.sr==null?"n.v.t.":r1(r.sr)+"%"}), ingeschreven uit eigen intakes ${r.signS} (sign ${r.gr==null?"n.v.t.":r1(r.gr)+"%"}), als eigenaar close ${r.closed}/${r.closeLost} (${r.cr==null?"n.v.t.":r1(r.cr)+"%"}), ingeschreven ${r.signO}`);
  const lostAll=L.filter(l=>l.lost&&inR(l.scd,A,B)); const rc=new Map(); for(const l of lostAll) rc.set((l.faseVerlies||"?")+" · "+(l.lost_reason||"(geen reden)"),(rc.get((l.faseVerlies||"?")+" · "+(l.lost_reason||"(geen reden)"))||0)+1);
  lines.push("Verloren ("+lostAll.length+"): "+[...rc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]+" "+x[1]).join(" | "));
  const co=L.filter(l=>inR(l.cd,A,B)); lines.push("Bronnen (cohort "+co.length+" leads): "+bronRows(co,BRON_KEYS.kanaal[1]).map(r=>`${r.k} ${r.n} leads, ${r1(r.l2i)}% intake, ${r.sign} sale`).join(" | "));
  lines.push("Campagnes ≥10 leads: "+bronRows(co,BRON_KEYS.utm_campaign[1]).filter(r=>r.n>=10).sort((a,b)=>b.n-a.n).slice(0,12).map(r=>`${r.k}: ${r.n} leads, ${r1(r.l2i)}% intake, ${r1(r.lostShare)}% verloren (${r.top})`).join(" | "));
  const wk=[]; for(let d=weekKey(NOW)-7*7; d<=NOW; d+=7){ const r=trendRow(null,d,Math.min(d+6,NOW)); wk.push(`wk${isoWeek(d)}: leads ${r.nieuw}, plan ${r1(r.pr)}%, show ${r1(r.sr)}%, sign ${r1(r.gs)}%, close ${r1(r.cr)}%, sale ${r.signO}`); } lines.push("Per week: "+wk.join(" | "));
  lines.push("Opvallend (regelmotor): "+I.items.slice(0,8).map(i=>i.t).join(" | "));
  const txt=lines.join("\n"); const done=()=>{ const b=document.getElementById("pakbtn"); if(b){ b.textContent="✓ gekopieerd — plak het in je chat met Claude"; setTimeout(()=>b.textContent="📋 Kopieer datapakket voor Claude",3000);} };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done,()=>{ prompt("Kopieer:",txt); }); else prompt("Kopieer:",txt); }
function drawAsk(){
  const aw=document.getElementById("advwrap"); const I=insights(); const r1=v=>(v+"").replace(".",",");
  const presets=[["Top 5 opvallende zaken",""],["Waar lekt de funnel?","funnel"],["Wie moet ik coachen?","coach"],["Welke ads presteren slecht?","ads"],["Waarom verliezen we leads?","verlies reden"],["Wat is de trend?","trend"]];
  let h=`<div class="askbox"><div class="askrow"><span class="askic">💬</span><input id="askq" value="${esc(askQ)}" placeholder="Vraag iets over deze periode… bijv. 'top 5 opvallende zaken laatste 30 dagen'" onkeydown="if(event.key==='Enter')askRun()"><button onclick="askRun()">Vraag</button></div>
    <div class="askpre">${presets.map(p=>`<span class="chip" onclick="askRun(${JSON.stringify(p[0]+" "+p[1]).replace(/"/g,"&quot;")})">${p[0]}</span>`).join("")}<span style="flex:1"></span><button id="pakbtn" class="chip" onclick="askPak()">📋 Kopieer datapakket voor Claude</button></div></div>`;
  const list = (askFilter==="all"? I.items : I.items.filter(i=>i.cat===askFilter)).slice(0,6);
  const catLab={rep:"per persoon",funnel:"funnel",lost:"verliezen",bron:"bronnen & ads",trend:"trend"};
  h+=`<div class="askhead"><b>${askQ?esc(askQ):"Top opvallende zaken"}</b><span>${fmtY(A)} t/m ${fmtY(B)}${askFilter!=="all"?" · focus: "+catLab[askFilter]:""} · ${list.length} van ${I.items.length} signalen</span></div>`;
  h+=`<div class="advgrid">`+(list.length? list.map((it,i)=>`<div class="advcard"><span class="imp ${it.tag}">${it.tag==="hi"?"grote impact":it.tag==="mid"?"impact":"signaal"}</span><h3><span class="rank">${i+1}</span>${esc(it.t)}</h3><p>${esc(it.p)}</p><div class="doen">→ ${esc(it.d)}</div><div class="cat">${catLab[it.cat]||it.cat}</div></div>`).join("")
     : `<div class="advcard"><p>Geen opvallende afwijkingen in deze selectie — of te weinig volume. Kies een langere periode voor een eerlijker beeld.</p></div>`)+`</div>`;
  const cell=(v,best,worst)=>v==null?"<td>—</td>":`<td class="${v===best?"best":v===worst?"worst":""}">${r1(v)}%</td>`;
  const rows=I.rows, mx=k=>Math.max(...rows.map(r=>r[k]).filter(v=>v!=null)), mn=k=>Math.min(...rows.map(r=>r[k]).filter(v=>v!=null));
  h+=`<div class="cmp" style="margin-top:14px"><h3>Team naast elkaar · ${fmtY(A)} t/m ${fmtY(B)} <span class="chsub">(— = te weinig volume: plan ≥ ${I.MP}, show ≥ ${I.MS}, sign/close ≥ ${I.MG})</span></h3>
    <table><tr><th>Naam</th><th>Afgehandeld</th><th>Gepland</th><th>Plan rate<br><i>${ROL("plan")}</i></th><th>Intakes gezet</th><th>Show</th><th>Show rate<br><i>${ROL("show")}</i></th><th>Ingeschr. uit eigen intakes</th><th>Sign rate<br><i>${ROL("signS")}</i></th><th>Ingeschr. / verloren<br><i>eigenaar</i></th><th>Close rate<br><i>eigenaar</i></th></tr>
    <tr class="tot"><td><b>Team</b></td><td>${I.tBeh}</td><td>${I.tot.gepland.length}</td><td><b>${r1(I.tPlan)}%</b></td><td>${I.tot.agenda.length}</td><td>${I.tot.show.length}</td><td><b>${r1(I.tShow)}%</b></td><td>${I.tot.signS.length}</td><td><b>${r1(I.tSign)}%</b></td><td>${I.tot.closed.length} / ${I.tot.closeLost.length}</td><td><b>${r1(I.tClose)}%</b></td></tr>`+
    rows.map(r=>`<tr><td>${esc(r.n)}</td><td>${r.beh}</td><td>${r.gepland}</td>${cell(r.pr,mx("pr"),mn("pr"))}<td>${r.agenda}</td><td>${r.show}</td>${cell(r.sr,mx("sr"),mn("sr"))}<td>${r.signS}</td>${cell(r.gr,mx("gr"),mn("gr"))}<td>${r.closed} / ${r.closeLost}</td>${cell(r.cr,mx("cr"),mn("cr"))}</tr>`).join("")+"</table></div>";
  h+=`<p class="note">Deze antwoorden komen uit een vaste regelmotor in het dashboard (plan/show/sign/close per persoon, no-shows, late cancels, doorlooptijd, verliesredenen per fase, campagnes/kanalen, week-op-week trend). Wil je een echt gesprek over de cijfers: klik <b>Kopieer datapakket</b> en plak het in Claude — dat is een compacte samenvatting van precies deze periode. Zodra er een AI-sleutel in n8n staat, kan dit vak rechtstreeks antwoorden.</p>`;
  aw.innerHTML=h;
}
const drawAdvies = drawAsk;


// ---- 📊 grafiek-widget bij een geselecteerde rate (dag / week / maand) ----
let chBy="auto", chOthers=false;
const CH_METRIC={
  plan:{t:"Plan rate", tk:"pr", num:r=>r.gepland, den:r=>r.beh, min:()=>+(DEFS.min_volume_plan||15), ok:"gepland", bad:"verloren in Leads-fase"},
  show:{t:"Show rate", tk:"sr", num:r=>r.show, den:r=>r.agenda, min:()=>+(DEFS.min_volume_show||8), ok:"show", bad:"geen show"},
  signS:{t:"Sign rate", tk:"gs", num:r=>r.signS, den:r=>r.show, min:()=>+(DEFS.min_volume_sign||5), ok:"ingeschreven", bad:"(nog) niet getekend"},
  sign:{t:"Sign rate", tk:"gs", num:r=>r.signS, den:r=>r.show, min:()=>+(DEFS.min_volume_sign||5), ok:"ingeschreven", bad:"(nog) niet getekend"},
  close:{t:"Close rate", tk:"cr", num:r=>r.closed, den:r=>r.closed+r.closeLost, min:()=>+(DEFS.min_volume_sign||5), ok:"ingeschreven", bad:"verloren na show"},
  pay:{t:"Pay rate", tk:"pay", num:r=>r.paid, den:r=>r.signO, min:()=>1, ok:"betaald", bad:"nog niet betaald"}};
function chBuckets(by){
  let a=A, b=B, out=[];
  if(by==="dag"){ if(b-a<13) a=b-13; if(b-a>92) a=b-92; for(let d=a; d<=b; d++) out.push([d,d]); return out; }
  if(by==="week"){ if(b-a<11*7) a=b-12*7+1; for(let d=weekKey(a); d<=b; d+=7) out.push([d,Math.min(d+6,b)]); return out; }
  if(b-a<180) a=monthKey(b)-5*31; for(let d=monthKey(a); d<=b;){ const nk=monthKey(d+32); out.push([d,Math.min(nk-1,b)]); d=nk; } return out;
}
const chLabel=(by,x)=> by==="dag"? fmt(x[0]) : by==="week"? "wk "+isoWeek(x[0]) : MND[d2s(x[0]).getMonth()]+" "+String(d2s(x[0]).getFullYear()).slice(2);
function chartWidget(who, phase){
  const M=CH_METRIC[phase]; if(!M) return "";
  const by = chBy==="auto" ? ((B-A)<=31?"dag":(B-A)<=200?"week":"maand") : chBy;
  const bk=chBuckets(by), labels=bk.map(x=>chLabel(by,x));
  const cw=Math.max(300,((document.getElementById("detail")||{}).clientWidth||900)-34);
  const name= who==null?"Totaal":who, col= who==null?"var(--txt)":repCol(who);
  const ser=(w,nm,c,main)=>{ const rows=bk.map(([a,b])=>trendRow(w,a,b)); const weak=rows.map(r=>(M.den(r)||0)<M.min()); const values=rows.map((r,i)=>{ const d=M.den(r); return d&&!(weak[i]&&!main)?pct(M.num(r),d):null; }); const tips=rows.map(r=>`${M.num(r)}/${M.den(r)}`); return {name:nm,color:c,values,weak,tips,rows,width:main?3:1.6,opacity:main?1:.55,showVals:main}; };
  const S=[ser(who,name,col,true)];
  if(chOthers){ if(who!=null) S.push(ser(null,"Totaal","var(--mut2)",false)); for(const p of REPS) if(p.n!==who) S.push(ser(p.n,p.n,repCol(p.n),false)); }
  const main=S[0], last=main.values.length-1, cur=main.values[last], prev=main.values[last-1];
  const sumN=main.rows.reduce((s,r)=>s+M.num(r),0), sumD=main.rows.reduce((s,r)=>s+M.den(r),0);
  const bars=bk.map((x,i)=>{ const r=main.rows[i]; const n=M.num(r), d=M.den(r); return {label:labels[i], parts:[{v:n,color:col,name:M.ok},{v:Math.max(0,d-n),color:"var(--line)",name:M.bad}]}; });
  const chips=[["auto","Auto"],["dag","Per dag"],["week","Per week"],["maand","Per maand"]].map(x=>`<div class="wchip sm${chBy===x[0]?" on":""}" onclick="chBy='${x[0]}';drawDetail()">${x[1]}</div>`).join("");
  const strip=`<div class="chstrip">`+bk.map((x,i)=>{ const v=main.values[i], r=main.rows[i], n=M.num(r), d=M.den(r); return `<div class="chc${i===last?" cur":""}${main.weak[i]?" weak":""}" title="${esc(labels[i])}: ${n} ${M.ok} van ${d}"><span>${labels[i]}</span><b>${v==null?"—":(v+"").replace(".",",")+"%"}</b><small>${n}/${d}</small></div>`; }).join("")+`</div>`;
  return `<div class="chw"><div class="chhead"><div><h3 style="margin:0">${esc(name)} · ${M.t} <i class="rolTag">${ROL(phase)}</i> · per ${by==="dag"?"dag":by==="week"?"ISO-week":"maand"}</h3><div class="chsub">${labels[0]} t/m ${labels[last]} · over deze ${bk.length} ${by==="dag"?"dagen":by==="week"?"weken":"maanden"}: <b>${fpct(sumN,sumD)}</b> (${sumN}/${sumD}) · open bolletje = te weinig volume</div></div>
    <div class="chnow"><b>${cur==null?"—":(cur+"").replace(".",",")+"%"}</b><span>${labels[last]}</span>${ppDelta(cur,prev)}</div></div>
    <div class="wonchips" style="margin:6px 0 8px">${chips}<div class="wchip sm${chOthers?" on":""}" onclick="chOthers=!chOthers;drawDetail()">⚖️ Vergelijk met anderen</div><span style="flex:1"></span><div class="wchip sm" onclick="tab='trend';trendMetric='${M.tk}';trendBy='${by==="dag"?"week":by}';${who?`trendReps=new Set([${JSON.stringify(who)}]);`:""}sel=null;render()">📈 Open in Trend</div></div>
    ${svgLine(S,{pct:true,labels,markLast:true,h:210,w:cw})}${chOthers?legend(S):""}
    <div class="chsub" style="margin-top:8px">Aantallen per ${by}: gekleurd = ${M.ok}, grijs = ${M.bad}</div>${svgBars(bars,{h:110,w:cw})}${strip}</div>`;
}

// ---- 🗓 intakes: wie komt wanneer, bevestigd of niet ----
let intScope="komend", intFilt="all", intWho=null;
const DAGN=["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
function intStat(x){ if(x.is_show) return ["show","win"]; if(x.is_noshow) return ["no-show","lost"]; if(x.is_late_cancel) return ["late cancel","lost"]; if(x.is_cancelled) return ["geannuleerd","lost"]; if(x.is_unresolved) return ["zonder uitkomst",""]; if(x.status==="confirmed") return ["✅ bevestigd","win"]; return ["⏳ nog niet bevestigd","warn"]; }
const intStatPill=x=>{ const [t,c]=intStat(x); return `<span class="stg ${c}">${t}</span>`; };
function drawInt(){
  const w=document.getElementById("intwrap");
  const base = intScope==="komend" ? AP.filter(x=>x.sd>=TODAY) : AP.filter(x=>inR(x.sd,A,B));
  const F={all:x=>!x.is_cancelled, conf:x=>x.status==="confirmed"&&!x.is_cancelled&&!x.is_show&&!x.is_noshow, unconf:x=>x.status!=="confirmed"&&!x.is_cancelled&&!x.is_show&&!x.is_noshow&&!x.is_unresolved, show:x=>x.is_show, noshow:x=>x.is_noshow, unres:x=>x.is_unresolved, cancel:x=>x.is_cancelled};
  const FL=[["all","Alles"],["conf","✅ Bevestigd"],["unconf","⏳ Niet bevestigd"],["show","Show"],["noshow","No-show"],["unres","Zonder uitkomst"],["cancel","Geannuleerd"]];
  const who=intWho; const byWho=x=>who==null||x.setter===who||x.intaker===who;
  const list=base.filter(byWho).filter(F[intFilt]||F.all).sort((a,b)=> intScope==="komend" ? (a.starts_at<b.starts_at?-1:1) : (a.starts_at<b.starts_at?1:-1));
  const names=[...new Set(base.flatMap(x=>[x.setter,x.intaker]))].filter(n=>n&&!/^[A-Za-z0-9]{18,}$/.test(n)).sort();
  // samenvatting
  const up=base.filter(byWho).filter(x=>!x.is_cancelled), conf=up.filter(F.conf).length, unconf=up.filter(F.unconf).length;
  const vandaag=up.filter(x=>x.sd===TODAY).length, morgen=up.filter(x=>x.sd===TODAY+1).length, week=up.filter(x=>x.sd>=TODAY&&x.sd<TODAY+7).length;
  let h=`<div class="wonchips"><div class="wchip${intScope==="komend"?" on":""}" onclick="intScope='komend';drawInt()">📅 Komend (vanaf vandaag)</div><div class="wchip${intScope==="periode"?" on":""}" onclick="intScope='periode';drawInt()">In gekozen periode · ${fmtY(A)} t/m ${fmtY(B)}</div></div>`;
  h+=`<div class="wonchips"><span class="lbl">Status:</span>`+FL.map(f=>`<div class="wchip sm${intFilt===f[0]?" on":""}" onclick="intFilt='${f[0]}';drawInt()">${f[1]}<span class="n">${base.filter(byWho).filter(F[f[0]]).length}</span></div>`).join("")+`</div>`;
  h+=`<div class="wonchips"><span class="lbl">Persoon:</span><div class="wchip sm${who==null?" on":""}" onclick="intWho=null;drawInt()">Iedereen</div>`+names.map(n=>`<div class="wchip sm${who===n?" on":""}" onclick="intWho=${jq(n)};drawInt()"><span class="dot" style="background:${repCol(n)}"></span>${esc(n)}</div>`).join("")+`</div>`;
  if(intScope==="komend") h+=`<div class="kpis ikp"><div class="kpi"><b>${up.length}</b><span>Komende intakes</span></div><div class="kpi"><b>${conf}</b><span>Bevestigd</span></div><div class="kpi ${unconf?"warnk":""}"><b>${unconf}</b><span>Nog niet bevestigd</span></div><div class="kpi"><b>${vandaag}</b><span>Vandaag</span></div><div class="kpi"><b>${morgen}</b><span>Morgen</span></div><div class="kpi"><b>${week}</b><span>Komende 7 dagen</span></div></div>`;
  // per dag
  const days=[...new Set(list.map(x=>x.sd))];
  if(!days.length) h+=`<div class="cmp"><div class="empty">Geen intakes${intFilt!=="all"?" met deze status":""}${who?" voor "+esc(who):""}${intScope==="komend"?" vanaf vandaag":" in deze periode"}.</div></div>`;
  for(const d of days.slice(0,60)){ const xs=list.filter(x=>x.sd===d); const c=xs.filter(x=>x.status==="confirmed"&&!x.is_cancelled).length, u=xs.filter(F.unconf).length, sh=xs.filter(x=>x.is_show).length, ns=xs.filter(x=>x.is_noshow).length;
    const sub = d>=TODAY ? `${xs.length} intake${xs.length===1?"":"s"} · ${c} bevestigd${u?` · <b class="warnt">${u} nog niet bevestigd</b>`:""}` : `${xs.length} intake${xs.length===1?"":"s"} · ${sh} show · ${ns} no-show`;
    h+=`<div class="cmp daycard${d===TODAY?" today":""}"><div class="dayhd"><b>${d===TODAY?"Vandaag · ":d===TODAY+1?"Morgen · ":""}${DAGN[d2s(d).getDay()]} ${fmtY(d)}</b><span>${sub}</span></div>
      <table><tr><th>Tijd</th><th>Naam</th><th>Setter</th><th>Intaker</th><th>Status</th><th>Geboekt</th><th>Poging</th><th>Lead-fase</th></tr>`+
      xs.map(x=>`<tr><td><b>${x.hm}</b></td><td>${ghl(x.contact_id,x.name)}</td><td>${esc(x.setter||"—")}</td><td>${esc(x.intaker||"—")}</td><td>${intStatPill(x)}</td><td><small>${x.bd>=0?fmt(x.bd)+" "+x.bhm:"—"}</small></td><td><small>${x.attempt_number}e van ${x.attempts_total}</small></td><td>${x.lead_stage?`<span class="stg${x.lead_status==="lost"?" lost":""}">${esc(x.lead_stage)}${x.lead_status==="lost"?" · verloren":""}</span>`:"—"}</td></tr>`).join("")+`</table></div>`; }
  if(days.length>60) h+=`<div class="more">eerste 60 dagen getoond — kies een kortere periode</div>`;
  h+=`<p class="note">Rechtstreeks uit de GHL-intakekalender. <b>Bevestigd</b> = de afspraak staat in GHL op <i>confirmed</i> (de klant heeft bevestigd of iemand heeft hem op bevestigd gezet); <b>nog niet bevestigd</b> = status <i>new</i>. Setter = wie boekte, intaker = in wiens agenda hij staat. Klik op een naam om de contactkaart in GHL te openen.</p>`;
  w.innerHTML=h;
}

// ---- datumkiezer (ongewijzigd t.o.v. v1) ----
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

// ---- render ----
function drawNote(){
  const nt=document.getElementById("note"); nt.style.display = ["trend","bron","lost","won","apt","dag","adv","int"].includes(tab) ? "none" : "block";
  const rol = MODE!=="rep";
  nt.innerHTML=`<details class="uitleg"${tab==="cmp"?"":""}><summary>ℹ️ Hoe tel ik? · weergave <b>${rol?"Rollen":"Per rep (v1)"}</b> — klik voor uitleg met voorbeeld</summary>
  <div class="ucols">
    <div><h4>Rollen (aanbevolen)</h4><p>Twee blokken: <b>Setter</b> (wat lever jij aan: plan, show, sign) en <b>Eigenaar</b> (hoe beweeg jij dossiers: close, pay). Wie de intake voerde speelt niet mee.</p>
      <ul><li><b>Plan rate · setter</b> = intakes gepland ÷ (gepland + in de Leads-fase verloren). Wie de intake inplant is de setter (setterveld; bij herplannen de laatste setter). Verloren in de Leads-fase telt bij wie hem op verloren sleept.</li>
      <li><b>Show rate · setter</b> = van de intakes die jíj inplande, hoeveel kwamen opdagen (geteld op intakedatum).</li>
      <li><b>Sign rate · setter</b> = van de intakes die jíj zette én die geshowd zijn, hoeveel zijn uiteindelijk ingeschreven — ongeacht wie de intake voert of tekent. (2 intakes gezet, 2 shows, 1 getekend → 50 %.)</li>
      <li><b>Close rate · eigenaar</b> = van de dossiers na show die jij nu bezit (laatste eigenaar — ook als je hem van een collega kreeg), hoeveel ingeschreven vs verloren. Dit is "hoe beweeg jij dossiers door de pipeline".</li>
      <li><b>Pay rate · eigenaar</b> = betaald ÷ ingeschreven.</li></ul></div>
    <div><h4>Per rep (v1, zoals het oude dashboard)</h4><p>Plan rate op de setter; <b>show, sign en pay op de eigenaar van de deal</b>, zonder close-rij. Simpeler, maar wie een deal overneemt krijgt ook de show en de sign op zijn naam.</p>
      <h4>Voorbeeld</h4><p>Vandaag 8 intakes: 6 ingepland door Django (alle 6 verschenen), 2 door Marcel (1 verschenen). <b>Show rate</b>: Django 100%, Marcel 50% — in beide weergaven, want show hangt aan de setter… <i>behalve</i> in Per rep als de deal een andere eigenaar heeft: dan telt de show bij die eigenaar. Stel Linda zette de intake, de deal belandt bij Marcel en Marcel tekent: in <b>Rollen</b> telt hij één keer in Linda's sign rate (setter) en één keer in Marcels close rate (eigenaar) — niets bij een derde; in <b>Per rep</b> telt alles bij Marcel.</p></div>
  </div>
  <p class="ufoot">Show = fase Show of verder, het Show-veld of een afspraak op "showed"; Ingeschreven = Agreement Signed; Betaald = "Betaald bedrag (DPAC)" ≥ € ${(+PAY_MIN).toLocaleString("nl-NL")} of het ✅-vinkje. KPI-pijltjes vergelijken met de even lange periode direct ervoor. Klik op een blok voor de namen; sorteren = kolomkop, filteren = ⏷. Alle regels staan in <code>dpac.definitions</code> (rule_*) en het regeldocument.</p></details>`;
}
function render(){
  document.getElementById("dpLabel").textContent = fmtY(A)+" – "+fmtY(B);
  if((tab.startsWith("p")||tab==="ov") && !sel){ sel={repKey:tab==="ov"?"tot":tab.slice(1), phase:"plan"}; resetDetailState(); }
  drawTabs(); drawKpis(); drawCols(); drawDetail(); drawNote();
}
let _rz=null; window.addEventListener("resize",()=>{ if(!D) return; clearTimeout(_rz); _rz=setTimeout(()=>{ if(["trend","lost"].includes(tab)) drawCols(); if(sel) drawDetail(); },250); });
setTimeout(()=>{ const g=document.getElementById("gcode"); if(g && document.getElementById("gate").style.display!=="none") g.focus(); },50);
try{ const c=sessionStorage.dpacSalesCode; if(c) gTry(c, true); else if(location.search.indexOf("local=1")>=0) gTry("", true); }catch(e){}
