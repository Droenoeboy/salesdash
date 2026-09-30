// Mock-up marketingdashboard: 2 tabs. Ligt bovenop ../marketing/app.js en vervangt alleen tekenfuncties.
(function(){
  const st=document.createElement("style");
  st.textContent=".sub,#rtxt,#note{display:none!important}.kpis{grid-template-columns:repeat(4,1fr)}.kpi.on{box-shadow:inset 0 0 0 1px var(--plan,#1f6fd8)}#kpitrend{margin:-6px 0 16px}.arow.al{border-left-color:#8e8e93}.arow .anote{max-width:220px}";
  document.head.appendChild(st);
  document.title="DPAC · Marketing (mock-up)";
})();
tab="adv";
let kpiTrend=null, TOTM=null;
const RIJP_A=()=>NOW-56, RIJP_B=()=>NOW-14;

// periode: standaard rijp (leads 2 tot 8 weken oud), als preset in de bestaande datumkiezer
const _initApp=initApp; initApp=function(){ _initApp(); A=RIJP_A(); B=RIJP_B(); };
const _dpP=dpPresetList; dpPresetList=function(){ return [["Rijp (2 tot 8 weken)",RIJP_A(),RIJP_B()]].concat(_dpP().filter(x=>x[0]!=="Vandaag")); };

// tabs: Advies (start) en Cijfers
drawTabs=function(){ const el=document.getElementById("tabs"); el.innerHTML="";
  [["adv","⚡ Advies"],["tree","📊 Cijfers"]].forEach(([id,lab])=>{ const t=document.createElement("div"); t.className="tab"+(tab===id?" on":""); t.textContent=lab; t.onclick=()=>{tab=id;detail=null;render();}; el.appendChild(t); });
  document.getElementById("modebar").innerHTML=""; };

// vier tegels: getal, label, verschil. Klik = weeklijn eronder.
function kpiTog(k){ kpiTrend=kpiTrend===k?null:k; render(); }
const PAIDP=p=>p==="meta"||p==="google"||p==="tiktok";
const partyF=r=>PARTY||!(CAMPS.get(ck(r.platform,r.cid))||{}).party;
drawKpis=function(){
  const k=document.getElementById("kpis");
  const all=L.filter(l=>PARTY||!l.party);
  const m=metrics(all,spendIn(A,B,partyF),A,B);
  const len=B-A+1, pA=A-len, pB=A-1; const pm=metrics(all,spendIn(pA,pB,partyF),pA,pB);
  const dlt=(v,p,f,lowGood)=>{ if(v==null||p==null) return ""; const d=v-p; const cls=d===0?"eq":((d>0)!==!!lowGood?"up":"dn"); return `<i class="dlt ${cls}" title="vorige periode (${fmtY(pA)} t/m ${fmtY(pB)}): ${f(p)}">${d>0?"▲ ":d<0?"▼ ":"= "}${f(Math.abs(d))}</i>`; };
  const ps=m.S.sign.filter(l=>PAIDP(l.platform)).length, psP=pm.S.sign.filter(l=>PAIDP(l.platform)).length;
  const cpk=ps&&m.spend?m.spend/ps:null, cpkP=psP&&pm.spend?pm.spend/psP:null;
  const cpkCls=cpk==null?"":(cpk<=MAXCPK()*0.85?"good":cpk>MAXCPK()*1.25?"bad":"warn");
  const items=[
    ["cpk",cpk==null?"—":eur0(cpk),"Kosten per klant",dlt(cpk,cpkP,eur0,true),cpkCls],
    ["sg",m.sg,"Klanten",dlt(m.sg,pm.sg,v=>v),""],
    ["spend",eur0(m.spend),"Uitgegeven",dlt(m.spend,pm.spend,eur0,true),""],
    ["plan",m.plan==null?"—":r1(m.plan)+"%","Plan %",dlt(m.plan,pm.plan,v=>r1(v)+" pt"),""]];
  k.innerHTML=items.map(x=>`<div class="kpi kclk ${x[4]}${kpiTrend===x[0]?" on":""}" onclick="kpiTog('${x[0]}')" title="klik voor de lijn per week"><b>${x[1]}</b><span>${x[2]}</span>${x[3]}</div>`).join("");
  let tr=document.getElementById("kpitrend"); if(!tr){ tr=document.createElement("div"); tr.id="kpitrend"; k.insertAdjacentElement("afterend",tr); }
  const show=tab==="tree"&&!!kpiTrend; tr.style.display=show?"":"none"; if(show) tr.innerHTML=kpiTrendHtml(kpiTrend);
};
function kpiTrendHtml(key){
  const bk=[]; for(let d=weekKey(NOW-12*7+1); d<=NOW; d+=7) bk.push([d,Math.min(d+6,NOW)]);
  const all=L.filter(l=>PARTY||!l.party);
  const rows=bk.map(([a,b])=>{ const m=metrics(all,spendIn(a,b,partyF),a,b); const ps=m.S.sign.filter(l=>PAIDP(l.platform)).length; m.cpkPaid=ps&&m.spend?m.spend/ps:null; return m; });
  const LAB={cpk:["Kosten per klant","€"],sg:["Klanten","#"],spend:["Uitgegeven","€"],plan:["Plan %","%"]}[key];
  const vals=rows.map(m=>{ const v=key==="cpk"?m.cpkPaid:m[key]; return v==null?null:(LAB[1]==="€"?Math.round(v):v); });
  const labels=bk.map(([a])=>"wk "+isoWeek(a));
  const S=[{name:LAB[0],color:"var(--plan)",rows,values:vals,tips:rows.map(m=>`${m.sg} klanten · ${m.n} leads · ${eur0(m.spend)}`),width:2.2}];
  const cw=Math.max(320,(document.getElementById("kpis").clientWidth||900)-34);
  return `<div class="cmp"><div class="chhead"><h3 style="margin:0">${LAB[0]} <span class="chsub">per week · laatste 12 weken</span></h3></div>${svgLine(S,{pct:LAB[1]==="%",labels,markLast:true,h:180,w:cw})}</div>`;
}

// boom: 5 kolommen, Plan % gekleurd ten opzichte van het totaal
const relCls=(v,t)=>v==null||t==null?"":(v>=t*1.1?"good":v<=t*0.9?"bad":"");
const relSub=(v,t)=>v==null||t==null?"":((v-t>=0?"+":"")+r1(v-t));
COLS.length=0; COLS.push(
  {k:"spend",t:"Kosten",f:m=>eur0(m.spend),w:"num"},
  {k:"n",t:"Leads",f:m=>m.n,w:"num",click:"nieuw"},
  {k:"plan",t:"Plan %",f:m=>m.plan==null?"—":r1(m.plan)+"%",w:"pct",cls:m=>TOTM&&m!==TOTM?relCls(m.plan,TOTM.plan):"",sub:m=>TOTM&&m!==TOTM?relSub(m.plan,TOTM.plan):"",tip:"intake gepland ÷ leads · groen boven, rood onder het totaal"},
  {k:"sg",t:"Klanten",f:m=>m.sg,w:"num",click:"sign"},
  {k:"cpk",t:"Kosten / klant",f:m=>m.cpk!=null?eur0(m.cpk):(m.sg===0&&m.spend>=100?eur0(m.spend):"—"),w:"num",cls:m=>m.cpk!=null?(m.cpk<=MAXCPK()*0.85?"good":m.cpk>MAXCPK()*1.25?"bad":"warn"):(m.sg===0&&m.spend>=400?"bad":m.sg===0&&m.spend>=100?"warn":""),sub:m=>m.cpk==null&&m.sg===0&&m.spend>=100?"0 klanten":"",tip:"kosten ÷ klanten · plafond € 1.700"});
drawTreeInner=function(){
  const w=document.getElementById("treewrap");
  TREE=buildTreeFiltered(A,B); TREE.forEach(n=>decorate(n,A,B)); sortNodes(TREE,true);
  TOTM=metrics(L.filter(l=>PARTY||!l.party),spendIn(A,B,partyF),A,B);
  let h=`<div class="cmp treecard"><table class="tree"><tr><th class="nm">Platform › campagne › adset › advertentie</th>`+COLS.map(c=>`<th class="${c.w}${sortKey===c.k?" on":""}" onclick="setSort('${c.k}')" ${c.tip?`title="${esc(c.tip)}"`:""}>${c.t} <span class="arr">${sortKey===c.k?(sortDir>0?"▲":"▼"):""}</span></th>`).join("")+`</tr>`;
  h+=`<tr class="tot"><td class="nm" style="padding-left:10px"><b>Totaal</b></td>`+COLS.map(c=>`<td class="${c.w}">${c.f(TOTM)}</td>`).join("")+`</tr>`;
  for(const n of TREE) h+=rowHtml(n,0);
  w.innerHTML=h+`</table></div>`;
};

// Advies: Ger-punten en data-alarmen als rijen; opmerkingveld pas na afvinken of uitklappen
const kort=s=>{ s=String(s||"").split(" (")[0]; return s.length>70?s.slice(0,68)+"…":s; };
const _eigen=eigenList; eigenList=function(){ const out=_eigen();
  for(const a of ACTIES){ if(a.until&&dOf(a.until)<NOW) continue;
    const ad={ai:false,actie:true,type:"actie",label:a.cname+(a.sname?" → "+a.sname:""),cname:a.cname,sname:a.sname,platform:a.platform,cid:null,sid:null,manual:true,absRef:null,absTgt:null,txt:a.txt,titel:a.txt,kant:"advertentie",zekerheid:"",w:a.w||0,prio:500-(a.w||0)/10,ref:null,reactie:"",opmTeam:"",wa:null,wb:null,m:{spend:0,n:0,sh:0,sg:0,cpk:null},doen:a.doen};
    ADVBYKEY.set(folKey(ad),ad); out.push(ad); }
  const t=d2s(NOW), mA=s2d(new Date(t.getFullYear(),t.getMonth(),1)); const cur=L.filter(l=>l.cd>=mA&&l.cd<=NOW); const hard=cur.length?cur.filter(l=>l.hard).length/cur.length*100:null;
  const al=[]; if(hard!=null&&cur.length>=20&&hard<85) al.push(`Hard bewijs deze maand ${r1(hard)}%, onder 85%`);
  const nf=L.filter(l=>l.is_signed&&l.signed_via!=="formulier").length; if(nf) al.push(`${nf} inschrijving${nf===1?"":"en"} zonder inschrijfformulier`);
  const um=FORMS.filter(f=>!f.contact_id).length; if(um) al.push(`${um} formulier${um===1?"":"en"} zonder contact`);
  al.forEach(x=>out.push({ai:false,alarm:true,type:"alarm",label:x,cname:x,sname:null,platform:null,cid:null,sid:null,manual:true,absRef:null,absTgt:null,txt:"",titel:x,kant:"data",zekerheid:"",w:0,prio:800,ref:null,reactie:"",opmTeam:"",wa:null,wb:null,m:{spend:0,n:0,sh:0,sg:0,cpk:null}}));
  return out; };
const _advState=advState; advState=function(ad){ if(ad.alarm) return {grp:"open",chk:false,note:"",F:{}}; return _advState(ad); };
advRow=function(ad,cls){
  const key=folKey(ad); const S=advState(ad); const opn=advOpen.has(key);
  if(ad.alarm) return `<div class="arow al"><span class="amk">⚠️</span><div class="amain"><b>${esc(ad.titel)}</b></div><span class="abud uitz">data</span></div>`;
  if(ad.eigen) return `<div class="arow eig ${S.grp}"><label class="achk" title="Gedaan"><input type="checkbox" ${S.chk?"checked":""} onchange="folCheck(${jq(key)},this.checked)"></label><span class="amk"></span><div class="amain"><b>${esc(ad.titel)}</b></div></div>`;
  const sn=stNowOf(ad);
  const body=ad.actie
    ? `<p class="amut">${esc(ad.cname)}${ad.sname?` › ${esc(ad.sname)}`:""}</p><p>${esc(ad.txt)}</p>${ad.doen?`<p class="amut">${esc(ad.doen)}</p>`:""}`
    : `<p class="amut">${esc(ad.cname)}${ad.sname?` › ${esc(ad.sname)}`:""}${sn?` · nu ingesteld: ${stUit(ad)?"uit":sn.budget!=null?eur0(sn.budget)+" per dag":"aan"}`:""}</p>${ad.manual&&ad.titel?`<p><b>${esc(ad.titel)}</b></p>`:""}${ad.txt?`<p>${esc(zin2(ad.txt))}</p>`:""}${ad.ref&&ad.opmTeam?`<p class="amut">📝 ${esc(ad.opmTeam)}</p>`:""}${ad.ref&&ad.reactie?`<p class="amut">🔁 ${esc(ad.reactie)}</p>`:""}`;
  const naam=ad.actie?kort(ad.sname||ad.cname):(ad.sname||ad.cname);
  return `<div class="arow ${cls||""} ${S.grp}${opn?" open":""}">`
    +`<label class="achk" title="Gedaan. Zonder opmerking = advies gevolgd. Met opmerking = anders gedaan."><input type="checkbox" ${S.chk?"checked":""} onchange="folCheck(${jq(key)},this.checked)"></label>`
    +`<span class="amk">${S.m?M_ICO[S.m][0]:""}</span>`
    +`<div class="amain" onclick="advTog(${jq(key)})"><b><span class="dot" style="background:${PC(ad.platform)}"></span>${esc(PN(ad.platform))} · ${esc(naam)}${ad.ref?` <span class="rep" title="blijft staan uit de vorige run">🔁</span>`:""}</b></div>`
    +((S.chk||opn||S.note)?`<input class="anote" type="text" value="${esc(S.note)}" placeholder="opmerking" title="Anders gedaan? Schrijf hier wat jullie wél deden. Gaat naar Ger en naar de AI." onchange="folNote(${jq(key)},this.value)" onkeydown="if(event.key==='Enter'){this.blur()}">`:"")
    +(ad.actie?`<span class="abud uitz">instelling</span>`:budHtml(ad))
    +(opn?`<div class="apanel">${body}</div>`:"")+`</div>`;
};
drawAdviceInner=function(){
  const w=document.getElementById("advwrap");
  const ai=aiAdvList();
  const rows=ai.concat(eigenList()).map(ad=>({ad,S:advState(ad)})).filter(r=>!(r.ad.eigen&&r.S.grp==="gedaan"));
  const todo=rows.filter(r=>r.S.grp!=="gedaan").sort((a,b)=>a.ad.prio-b.ad.prio);
  let ri=0; todo.forEach(r=>{ const grijs=r.ad.eigen||r.ad.actie||r.ad.alarm; r.cls=grijs?"eig":(ri<3?"hi":ri<6?"mid":"lo"); if(!grijs) ri++; });
  const gedaan=rows.filter(r=>r.S.grp==="gedaan").sort((a,b)=>a.ad.prio-b.ad.prio);
  const run=AI_RUNAT(); const runTxt=run?whenTxt(run)+(AIADV.trigger==="donderdag"?" (donderdag)":""):"nog nooit";
  const tAi=`Adviezen doorvoeren: meet eerst budget en aan/uit in Google, Meta en TikTok, dan kijkt de AI (${AI_MODELS.fable[0]}, ${AI_MODELS.fable[1]}) opnieuw met jullie vinkjes en opmerkingen. Duurt 2 tot 4 minuten. Draait ook elke donderdag om 06:40. Laatste run: ${runTxt}. Laatste meting: ${STAT_AT?whenTxt(STAT_AT):"—"}. Er wordt nooit iets automatisch gewijzigd in de platforms.`;
  const tGer=`Naar Ger: rapport met wat nog te doen is, wat anders is gedaan met jullie opmerking en de reactie van de AI, en jullie eigen punten. Gaat via de Slack-bot naar Ger en Abel; je ziet eerst een voorbeeld.`;
  let h=`<div class="abar" style="justify-content:flex-end"><div class="abtns">`
    +`<button class="rbtn big pri" onclick="advDoorvoeren()" title="${esc(tAi)}" ${advBusy?"disabled":""}>${advBusy?"⏳ Bezig…":"🤖 Adviezen doorvoeren"}</button>`
    +`<button class="rbtn big" onclick="folSendOpen()" title="${esc(tGer)}">🍆 Naar Ger</button></div></div>`;
  if(advBusy){ if(!document.getElementById("abusycss")){ const st=document.createElement("style"); st.id="abusycss"; st.textContent=".abusy{margin:-4px 0 12px;font-size:13px;color:var(--mut)}.abusy i{display:block;height:4px;border-radius:2px;background:var(--line);overflow:hidden;margin-bottom:6px;position:relative}.abusy i:before{content:'';position:absolute;left:-40%;width:40%;height:100%;background:var(--plan,#7a6ee0);animation:abusy 1.2s linear infinite}@keyframes abusy{to{left:100%}}"; document.head.appendChild(st); }
    h+=`<div class="abusy"><i></i>${advBusy==="ctl"?"Stap 1 van 2: budget en aan/uit meten in Google, Meta en TikTok. 10 tot 20 seconden.":"Stap 2 van 2: de AI verwerkt jullie vinkjes en opmerkingen en maakt nieuw advies. 2 tot 4 minuten."}</div>`; }
  if(AIRUN.err) h+=`<div class="aierr">${esc(AIRUN.err)}</div>`;
  h+=`<div class="arows">`+(todo.length?todo.map(r=>advRow(r.ad,r.cls)).join(""):`<div class="aempty">${ai.length?"Alles gedaan.":"Nog geen AI-advies."}</div>`)+`</div>`;
  if(gedaan.length) h+=`<div class="adone" onclick="advDoneOpen=!advDoneOpen;drawAdvice()"><i class="chev${advDoneOpen?" open":""}"></i>Gedaan · ${gedaan.length}</div>`+(advDoneOpen?`<div class="arows">${gedaan.map(r=>advRow(r.ad,"ok")).join("")}</div>`:"");
  w.innerHTML=h;
};
// data al binnen vóór dit script? dan meteen opnieuw tekenen
if(typeof D!=="undefined"&&D){ A=RIJP_A(); B=RIJP_B(); tab="adv"; render(); }
