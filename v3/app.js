// DPAC Sales v3 · laag bovenop de v2-motor (engine_a.js + engine_b.js, ongewijzigde rekenlogica).
// Eén startscherm: 📊 Puls. Alle bestaande tabbladen, filters, details en de rollen/per-rep-schakelaar blijven werken.
// Nachtbouw 30 sep 2026 (Hermes). Geen automatisch scrollen. Geen nieuwe data-afhankelijkheid: zelfde wf11-endpoint.
(function(){
  const st=document.createElement("style");
  st.textContent=`
  #pulswrap{display:none}
  .pulshead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}
  .pulshead h2{margin:0;font-size:17px;letter-spacing:-.2px}
  .pulshead .chsub{color:var(--mut);font-size:12.5px}
  .pulsgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:10px}
  .ptile{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--shadow);min-width:0;cursor:pointer;border-top:4px solid var(--line);position:relative}
  .ptile.ok{border-top-color:var(--green)} .ptile.warn{border-top-color:#e08a00} .ptile.bad{border-top-color:var(--red)} .ptile.na{border-top-color:var(--line)}
  .ptile b{font-size:24px;display:block;letter-spacing:-.4px;line-height:1.1}
  .ptile span{font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px;font-weight:600;display:block;margin-top:2px}
  .ptile i{display:block;font-style:normal;font-size:11.5px;font-weight:700;margin-top:5px;color:var(--mut2)} .ptile i.up{color:var(--sign-tx)} .ptile i.dn{color:var(--close-tx)}
  .ptile:hover{border-color:var(--plan)}
  .pulsrates{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))} .pulsrates .ptile b{font-size:20px}
  .pulsoordeel{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;font-size:14px}
  .pulsoordeel .dotb{width:12px;height:12px;border-radius:50%;flex:none} .dotb.ok{background:var(--green)} .dotb.warn{background:#e08a00} .dotb.bad{background:var(--red)}
  .pulsoordeel .lopend{margin-left:auto;font-size:11.5px;color:var(--mut)}
  .pulstwo{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px;align-items:start;margin-bottom:12px}
  @media(max-width:1000px){.pulstwo{grid-template-columns:1fr}}
  .pcard{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;box-shadow:var(--shadow);min-width:0}
  .pcard h3{margin:0 0 8px;font-size:14px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap} .pcard h3 .chsub{font-weight:500;color:var(--mut);font-size:12px}
  .pcard h3 .lnk{margin-left:auto;font-size:12px;font-weight:600;color:var(--plan-tx);cursor:pointer;white-space:nowrap}
  .pulstbl{width:100%;border-collapse:collapse;font-size:12.5px} .pulstbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;color:var(--mut);padding:4px 6px;border-bottom:1px solid var(--line);white-space:nowrap}
  .pulstbl td{padding:7px 6px;border-bottom:1px solid var(--line2);white-space:nowrap;font-variant-numeric:tabular-nums} .pulstbl td.nm{font-weight:700;cursor:pointer} .pulstbl td.nm:hover{color:var(--plan-tx)}
  .pulstbl td.r{text-align:right} .pulstbl th.r{text-align:right}
  .pulstbl .dlt{font-size:11px;font-weight:700;margin-left:4px} .dlt.up{color:var(--sign-tx)} .dlt.dn{color:var(--close-tx)} .dlt.eq{color:var(--mut2)}
  .pulstbl td.clk{cursor:pointer} .pulstbl td.clk:hover{text-decoration:underline}
  .pulstbl .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
  .nudo{display:flex;flex-direction:column;gap:6px}
  .nudo .row{display:flex;align-items:center;gap:10px;min-width:0;padding:8px 10px;border:1px solid var(--line);border-radius:12px;cursor:pointer;background:transparent} .nudo .row:hover{border-color:var(--plan)}
  .nudo .n{font-size:18px;font-weight:800;min-width:34px;text-align:right;font-variant-numeric:tabular-nums} .nudo .n.bad{color:var(--close-tx)} .nudo .n.warn{color:#e08a00} .nudo .n.ok{color:var(--sign-tx)}
  .nudo .t{font-weight:600;min-width:0;flex:1 1 auto;white-space:normal} .nudo .who{margin-left:auto;font-size:11.5px;color:var(--mut);white-space:nowrap}
  .nudo .empty{color:var(--mut);padding:6px 2px}
  .padv{display:flex;flex-direction:column;gap:6px}
  .padv .row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-left:5px solid var(--line);border-radius:12px;cursor:pointer} .padv .row:hover{border-color:var(--plan)}
  .padv .row.hi{border-left-color:#e04b4b}.padv .row.mid{border-left-color:#e08a00}.padv .row.lo{border-left-color:#c9b94a}.padv .row.ok{border-left-color:var(--green)}
  .padv .eur{font-weight:800;min-width:70px;font-variant-numeric:tabular-nums} .padv .t{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pulsfoot{font-size:11.5px;color:var(--mut);margin:4px 2px 0}
  .pulstwo,.pulsgrid,.pcard,#pulswrap,.pulstwo>*,.pulstwo>*>*{min-width:0;max-width:100%}
  .pcard .tblwrap{display:block;width:100%}
  @media(max-width:1000px){.pulstwo{grid-template-columns:1fr}}
  .pcard .tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
  @media(max-width:640px){.pulsgrid{grid-template-columns:repeat(3,1fr);gap:7px}.pulsrates{grid-template-columns:repeat(3,1fr)}.ptile{padding:9px 10px}.ptile b{font-size:18px}.pulsrates .ptile b{font-size:16px}.ptile span{font-size:9px}.pulshead h2{font-size:15px}.pulshead .chsub{display:none}.nudo .who{display:none}.padv .who{display:none}}
  `;
  document.head.appendChild(st);
})();

// ---- instellingen ----
const PULS_GROEN=5, PULS_ROOD=-10;      // procentpunt-drempels t.o.v. het 4-weeks gemiddelde van dezelfde weekdagen
const PULS_MINVOL=5;                     // onder dit volume geen oordeel (grijs)
let pulsWeek=0;                          // 0 = deze week (lopend), 1 = vorige week
tab="week";

// ---- helpers ----
function pulsRange(){ const wkA=weekKey(TODAY)-7*pulsWeek; const b=pulsWeek?wkA+6:TODAY; return [wkA,b]; }
function pulsCijfers(who,a,b){
  const f=funnel(who,a,b), s=slots(who,a,b,"setter");
  const beh=f.gepland.length+f.verloren.length, held=s.show.length+s.noshow.length+s.late.length;
  const leads=L.filter(l=>inR(l.cd,a,b)&&(who==null||l.setter===who)).length;
  const ins=L.filter(l=>l.is_signed&&inR(l.insE,a,b)&&(who==null||l.owner===who)).length;
  const s2l=median(L.filter(l=>inR(l.cd,a,b)&&(who==null||(l.s2lBy||l.setter)===who)).map(l=>l.s2l));
  return {leads, beh, gepland:f.gepland.length, agenda:f.agenda.length, show:f.show.length, noshow:f.geenShow.filter(l=>l.is_noshow).length, ins, paid:f.paid.length, signO:f.signO.length,
    pr:beh?pct(f.gepland.length,beh):null, sr:f.agenda.length?pct(f.show.length,f.agenda.length):null, gs:f.show.length?pct(f.signS.length,f.show.length):null, py:f.signO.length?pct(f.paid.length,f.signO.length):null, slot:held?pct(s.show.length,held):null, s2l, prN:beh, srN:f.agenda.length, gsN:f.show.length, pyN:f.signO.length};
}
function pulsGem(who,a,b,k){ let s=0,n=0; for(let i=1;i<=4;i++){ const c=pulsCijfers(who,a-7*i,b-7*i); const v=c[k]; if(v!=null){ s+=v; n++; } } return n?s/n:null; }
function pulsOordeel(v,avg,n,laagIsGoed){
  if(v==null||avg==null||n<PULS_MINVOL) return "na";
  let d = avg>0 ? (v-avg)/avg*100 : (v>0?100:0);
  if(laagIsGoed) d=-d;
  return d>=PULS_GROEN?"ok":d<=PULS_ROOD?"bad":"warn";
}
const r1=v=>(Math.round(v*10)/10+"").replace(".",",");
function pulsDlt(v,p,isPct){ if(v==null||p==null) return ""; const d=isPct?Math.round((v-p)*10)/10:v-p; const cls=d>0?"up":d<0?"dn":"eq"; const t=isPct?(d>0?"+":"")+r1(d)+" pp":(d>0?"+":"")+d; return `<i class="dlt ${cls}" title="t.o.v. dezelfde weekdagen vorige week: ${isPct?r1(p)+"%":p}">${d>0?"▲ ":d<0?"▼ ":"= "}${t}</i>`; }
function pulsGo(phase,side,flt){ const [a,b]=pulsRange(); A=a; B=b; sel=null; dagSel=Math.min(b,TODAY); tab="tot"; render(); kpiPick(phase,side,flt); }
function pulsGoTab(t,fn){ const [a,b]=pulsRange(); A=a; B=b; sel=null; dagSel=Math.min(b,TODAY); tab=t; if(fn) fn(); render(); }
function pulsRep(n){ const [a,b]=pulsRange(); A=a; B=b; sel=null; tab="p"+n; render(); }
function pulsVandaag(who,grp){ vdWho=who===undefined?undefined:who; vdGrp=grp==null?null:grp; tab="vandaag"; sel=null; render(); }

// ---- 📊 Puls ----
function drawPuls(){
  const w=document.getElementById("pulswrap"); if(!w) return;
  const [a,b]=pulsRange(); const lopend=!pulsWeek;
  const c=pulsCijfers(null,a,b), p=pulsCijfers(null,a-7,b-7);
  const wkLab=`Week ${isoWeek(a)} · ${dgn(a)} ${fmt(a)}${b>a?" t/m "+dgn(b)+" "+fmt(b):""}`;
  // tegels: aantal, oordeel t.o.v. 4-weeks gemiddelde van dezelfde weekdagen, pijl t.o.v. vorige week
  const T=[
    ["leads","Nieuwe leads",c.leads,false,()=>"pulsGo('l2s')"],
    ["gepland","Intakes gepland",c.gepland,false,()=>"pulsGo('plan','ok')"],
    ["show","Shows",c.show,false,()=>"pulsGo('show','ok')"],
    ["noshow","No-shows",c.noshow,true,()=>"pulsGo('show','bad','noshow')"],
    ["ins","Ingeschreven",c.ins,false,()=>"pulsGoTab('won',()=>{wonRep=null})"],
    ["paid","Betaald",c.paid,false,()=>"pulsGo('pay','ok')"]];
  let tiles=T.map(([k,lab,v,laag,go])=>{ const avg=pulsGem(null,a,b,k); const o=pulsOordeel(v,avg,Math.max(v,avg||0),laag);
    return `<div class="ptile ${o}" onclick="${go()}" title="klik voor de namen · 4-weeks gemiddelde van dezelfde weekdagen: ${avg==null?"—":r1(avg)}"><b>${v}</b><span>${lab}</span>${pulsDlt(v,p[k],false)||`<i>—</i>`}</div>`; }).join("");
  const R=[["pr","Plan rate","prN",()=>"pulsGo('plan')"],["sr","Show rate","srN",()=>"pulsGo('show')"],["gs","Sign rate","gsN",()=>"pulsGo('signS')"],["py","Pay rate","pyN",()=>"pulsGo('pay')"],["slot","Show per slot","srN",()=>"pulsGoTab('int',()=>{intScope='periode';intFilt='all';intWho=null})"]];
  let rates=R.map(([k,lab,nk,go])=>{ const v=c[k], avg=pulsGem(null,a,b,k); const o=pulsOordeel(v,avg,c[nk]||0,false);
    return `<div class="ptile ${o}" onclick="${go()}" title="${lab}: ${v==null?"—":r1(v)+"%"} op ${c[nk]} · 4-weeks gemiddelde ${avg==null?"—":r1(avg)+"%"}${c[nk]<PULS_MINVOL?" · te weinig volume voor een oordeel":""}"><b>${v==null?"—":r1(v)+"%"}</b><span>${lab} <small style="text-transform:none;letter-spacing:0">· ${c[nk]}</small></span>${pulsDlt(v,p[k],true)||`<i>—</i>`}</div>`; }).join("");
  const s2lAvg=pulsGem(null,a,b,"s2l"); const s2lO=c.s2l==null?"na":c.s2l<=S2L_AMBER?"ok":c.s2l<=S2L_ROOD?"warn":"bad";
  rates+=`<div class="ptile ${s2lO}" onclick="pulsGo('plan')" title="mediaan tijd tot de eerste menselijke actie · amber vanaf ${S2L_AMBER} min, rood vanaf ${S2L_ROOD} min · 4-weeks gemiddelde ${s2lAvg==null?"—":fmin(s2lAvg)}"><b>${fmin(c.s2l)}</b><span>Reactietijd</span>${c.s2l!=null&&p.s2l!=null?`<i class="${c.s2l<p.s2l?"up":c.s2l>p.s2l?"dn":""}">${c.s2l<p.s2l?"▲ sneller":c.s2l>p.s2l?"▼ trager":"= gelijk"} (vorige week ${fmin(p.s2l)})</i>`:`<i>—</i>`}</div>`;
  // oordeel in één zin: grootste negatieve afwijking wint
  const checks=[["gepland","intakes gepland",false],["show","shows",false],["ins","inschrijvingen",false],["leads","leads",false],["paid","betalingen",false]];
  let worst=null, best=null;
  for(const [k,lab] of checks){ const avg=pulsGem(null,a,b,k); if(avg==null||avg<PULS_MINVOL) continue; const d=(c[k]-avg)/avg*100; if(d<=PULS_ROOD&&(!worst||d<worst.d)) worst={k,lab,d,avg}; if(d>=PULS_GROEN&&(!best||d>best.d)) best={k,lab,d,avg}; }
  for(const [k,lab,nk] of [["pr","plan rate","prN"],["sr","show rate","srN"],["gs","sign rate","gsN"]]){ const avg=pulsGem(null,a,b,k); if(avg==null||c[k]==null||(c[nk]||0)<PULS_MINVOL) continue; const d=c[k]-avg; if(d<=-8&&(!worst||d<worst.d)) worst={k,lab,d,avg,pp:true}; if(d>=5&&(!best||d>best.d)) best={k,lab,d,avg,pp:true}; }
  const oordeelCls=worst?"bad":best?"ok":"warn";
  const fmtD=x=>x.pp?`${x.d>0?"+":""}${r1(x.d)} pp`:`${x.d>0?"+":""}${r1(x.d)}%`;
  const fmtV=x=>x.pp?r1(c[x.k])+"%":c[x.k];
  const fmtA=x=>x.pp?r1(x.avg)+"%":r1(x.avg);
  const cap=x=>x.lab[0].toUpperCase()+x.lab.slice(1);
  const oordeel = worst ? `<b>${cap(worst)} ${worst.pp?"blijft":"blijven"} achter:</b> ${fmtV(worst)} tegenover gemiddeld ${fmtA(worst)} op deze weekdagen (${fmtD(worst)}).${best?` ${cap(best)} ${best.pp?"loopt":"lopen"} voor (${fmtD(best)}).`:""}`
                 : best ? `<b>Op koers.</b> ${cap(best)} ${best.pp?"loopt":"lopen"} voor: ${fmtV(best)} tegenover gemiddeld ${fmtA(best)} (${fmtD(best)}).`
                 : `<b>Normale week.</b> Alles binnen de marge van het 4-weeks gemiddelde.`;
  // nu doen (bellijst per reden, hele team)
  const bl=belLijst(); const grp=new Map(); for(const r of bl){ grp.set(r.grp,(grp.get(r.grp)||[])); grp.get(r.grp).push(r); }
  const nRood=bl.filter(r=>r.s2l&&r.wacht>=S2L_ROOD).length;
  const nudo=[...grp.entries()].sort((x,y)=>x[0]-y[0]).map(([g,rs])=>{ const cls=g===6&&nRood?"bad":g===2||g===4?"warn":g===1?"ok":""; const who=[...new Set(rs.map(r=>r.team?"team":r.who))].slice(0,4).join(", ");
    return `<div class="row" onclick="pulsVandaag(null,${g})"><span class="n ${cls}">${rs.length}</span><span class="t">${esc(VD_GRP[g])}${g===6&&nRood?` <small style="color:var(--close-tx)">· ${nRood} langer dan ${S2L_ROOD} min</small>`:""}</span><span class="who">${esc(who)}</span></div>`; }).join("") || `<div class="empty">Niets dat nu op actie wacht. 👌</div>`;
  // per persoon
  const rows=REPS.filter(p=>teamOn(p.n)).map(p=>{ const x=pulsCijfers(p.n,a,b), y=pulsCijfers(p.n,a-7,b-7); const open=bl.filter(r=>r.who===p.n).length; return {p,x,y,open}; }).sort((u,v)=>(v.x.beh+v.x.agenda)-(u.x.beh+u.x.agenda));
  const cell=(v,pv,isPct,n)=>{ const d=(v==null||pv==null)?0:(isPct?Math.round((v-pv)*10)/10:v-pv); const tip=isPct?`vorige week ${pv==null?"—":r1(pv)+"%"}${n!=null?" · op "+n:""}`:`vorige week ${pv==null?"—":pv}`;
    return `<td class="r" title="${tip}">${v==null?"—":isPct?r1(v)+"%":v}${n!=null&&n<PULS_MINVOL&&isPct?` <small class="dim">(${n})</small>`:""}${d?`<i class="dlt ${d>0?"up":"dn"}">${d>0?"▲":"▼"}${isPct?"":" "+Math.abs(d)}</i>`:""}</td>`; };
  const perRep=`<table class="pulstbl"><tr><th>Persoon</th><th class="r">Afgehandeld</th><th class="r">Gepland</th><th class="r">Plan</th><th class="r">Shows</th><th class="r">Show</th><th class="r">Ingeschr.</th><th class="r">Reactie</th><th class="r">Open acties</th></tr>`+
    rows.map(({p,x,y,open})=>`<tr><td class="nm" onclick="pulsRep(${jq(p.n)})" title="naar de persoonspagina van ${esc(p.n)}"><span class="dot" style="background:${RCOL[p.n]}"></span>${esc(p.n)}</td>${cell(x.beh,y.beh,false)}${cell(x.gepland,y.gepland,false)}${cell(x.pr,y.pr,true,x.prN)}${cell(x.show,y.show,false)}${cell(x.sr,y.sr,true,x.srN)}${cell(x.signO,y.signO,false)}<td class="r">${fmin(x.s2l)}</td><td class="r clk" onclick="pulsVandaag(${jq(p.n)},null)" title="naar de bellijst van ${esc(p.n)}"><b>${open}</b></td></tr>`).join("")+
    `<tr style="font-weight:700"><td>Team</td>${cell(c.beh,p.beh,false)}${cell(c.gepland,p.gepland,false)}${cell(c.pr,p.pr,true,c.prN)}${cell(c.show,p.show,false)}${cell(c.sr,p.sr,true,c.srN)}${cell(c.signO,p.signO,false)}<td class="r">${fmin(c.s2l)}</td><td class="r clk" onclick="pulsVandaag(null,null)"><b>${bl.length}</b></td></tr></table>`;
  // top-3 adviezen over de laatste 4 weken
  const oA=A,oB=B; A=TODAY-27; B=TODAY; let I; try{ I=insights(); } finally { A=oA; B=oB; }
  const SEVLAB={hi:"Super belangrijk",mid:"Belangrijk",lo:"Signaal",ok:"Goed nieuws"};
  const adv=I.items.filter(i=>!i.good).slice(0,3).map(it=>`<div class="row ${it.tag}" onclick="pulsGoTab('adv',()=>{A=TODAY-27;B=TODAY;askFilter='all';askOpen=new Set([${jq(it.cat+"|"+it.t)}])})" title="${esc(it.p)}"><span class="eur">${it.eur?eur(it.eur):"—"}</span><span class="t">${esc(it.t)}</span><span class="who" style="margin-left:auto;font-size:11px;color:var(--mut)">${SEVLAB[it.tag]}</span></div>`).join("") || `<div class="empty" style="color:var(--mut)">Geen adviezen: geen afwijkingen groot genoeg in de laatste 4 weken.</div>`;
  const h=`<div class="pulshead"><h2>📊 ${wkLab}</h2><span class="chsub">${lopend?"lopend, nog onvolledig":"afgerond"} · ▲▼ t.o.v. dezelfde weekdagen vorige week · kleur t.o.v. het gemiddelde van 4 weken</span>
      <div class="wonchips" style="margin:0 0 0 auto"><div class="wchip sm${!pulsWeek?" on":""}" onclick="pulsWeek=0;drawPuls()">Deze week</div><div class="wchip sm${pulsWeek?" on":""}" onclick="pulsWeek=1;drawPuls()">Vorige week</div></div></div>
    <div class="pulsgrid">${tiles}</div><div class="pulsgrid pulsrates">${rates}</div>
    <div class="pulsoordeel"><span class="dotb ${oordeelCls}"></span><span>${oordeel}</span>${lopend?`<span class="lopend">week ${isoWeek(a)} loopt nog t/m ${dgn(b)}</span>`:""}</div>
    <div class="pulstwo"><div class="pcard"><h3>Per persoon <span class="chsub">deze ${lopend?"lopende ":""}week</span><span class="lnk" onclick="pulsGoTab('cmp')">⚖️ Vergelijk alle rates →</span></h3><div class="tblwrap">${perRep}</div></div>
      <div><div class="pcard" style="margin-bottom:12px"><h3>📞 Nu doen <span class="chsub">hele team, stand van nu</span><span class="lnk" onclick="pulsVandaag(null,null)">bellijst →</span></h3><div class="nudo">${nudo}</div></div>
      <div class="pcard"><h3>⚡ Adviezen <span class="chsub">laatste 4 weken, op gemiste omzet</span><span class="lnk" onclick="pulsGoTab('adv',()=>{A=TODAY-27;B=TODAY;askFilter='all'})">alle ${I.items.length} →</span></h3><div class="padv">${adv}</div></div></div></div>
    <p class="pulsfoot">Groen = minstens ${PULS_GROEN}% boven het 4-weeks gemiddelde van dezelfde weekdagen, rood = ${Math.abs(PULS_ROOD)}% of meer eronder, grijs = te weinig volume (onder ${PULS_MINVOL}). Reactietijd: groen tot ${S2L_AMBER} min, rood vanaf ${S2L_ROOD} min. Elk getal klikt door naar de namen erachter. Telling en definities zijn dezelfde als op Totaal (${MODE==="rep"?"per rep v1":"rollen"}).</p>`;
  keepScroll(w,()=>{ w.innerHTML=h; });
  const dl=document.getElementById("dpLabel"); if(dl) dl.textContent=fmtY(a)+" – "+fmtY(b);
}

// ---- tabbalk: Puls vooraan, verder ongewijzigd ----
const _drawTabs=drawTabs;
drawTabs=function(){
  _drawTabs();
  const el=document.getElementById("tabs"); if(!el) return;
  const t=document.createElement("div"); t.className="tab"+(tab==="week"?" on":""); t.textContent="📊 Week"; t.title="Weekpuls: in 30 seconden zien of de week goed of slecht loopt";
  t.onclick=()=>{ tab="week"; sel=null; render(); };
  el.insertBefore(t, el.firstChild);
  const tot=[...el.querySelectorAll(".tab")].find(x=>x.textContent.trim()==="📊 Totaal"); if(tot) tot.textContent="🧮 Totaal";
  const on=el.querySelector(".tab.on"); if(on){ const Lx=on.offsetLeft-el.offsetLeft; if(Lx<el.scrollLeft||Lx+on.offsetWidth>el.scrollLeft+el.clientWidth) el.scrollLeft=Math.max(0,Lx-16); }
};
// ---- KPI-rij alleen op Totaal en Team (v3: elke andere tab heeft zijn eigen kop) ----
const _drawKpis=drawKpis;
drawKpis=function(){ const k=document.getElementById("kpis"); const show = tab==="tot"||isTeamTab(); if(!show){ k.style.display="none"; k.innerHTML=""; return; } k.style.display=""; _drawKpis(); };
const _drawCols=drawCols;
drawCols=function(){ const w=document.getElementById("pulswrap"); if(tab==="week"){ _drawCols(); document.getElementById("cols").style.display="none"; w.style.display="block"; drawPuls(); return; } if(w) w.style.display="none"; _drawCols(); };
const _drawNote=drawNote;
drawNote=function(){ _drawNote(); if(tab==="week") document.getElementById("note").style.display="none"; };
const _drawStand=drawStand;
drawStand=function(){ _drawStand(); };
// ---- datumkiezer: Puls volgt zijn eigen week; een keuze in de kiezer opent Totaal ----
const _setRange=setRange;
setRange=function(a,b){ if(tab==="week") tab="tot"; _setRange(a,b); };
// ---- na laden: bekende rep landt op zijn bellijst (motor), anders op Puls ----
const _initApp=initApp;
initApp=function(){ const was=tab; _initApp(); if(tab==="tot"&&was==="week") { tab="week"; render(); } };
