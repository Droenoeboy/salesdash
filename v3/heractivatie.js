// v3 · ♻️ Heractivatie (8 okt 2026, Hermes · DPAC-706/708/730). Laag bovenop engine_a/b, app.js, clean.js, ai.js, abel.js.
// Alleen instellen + inzien: leest en bewaart instellingen via n8n 99i (webhook dpac-heractivatie) in Supabase.
// Ronde 2 (DPAC-730): leest uit cache (dpac.heractivatie_pool_cache/_rep_cache), ↻ = actie 'ververs'; sorteren op aantal;
// reps aan/uit/verborgen + werkvoorraad uit dpac.v_rep_dag; groepen: 1 klik aan met Abels startinstelling.
// Verstuurt niets en schrijft niets naar GHL. Uit te zetten door dit script uit index.html te halen.
const HERACT_LIVE = false;   // de parent zet dit aan zodra de verzending echt loopt
const HX_URL = "https://dpac.app.n8n.cloud/webhook/dpac-heractivatie";
const HX_LOCAL = () => location.search.indexOf("local=1") >= 0;
const HX_PER = [["<30", "<30 dagen"], ["30-90", "30–90"], ["90-180", "90–180"], ["180+", "180+"]];
const HX_G = [
  { id: "reopen", naam: "Reopen later", def: "alle fases · reden Reopen later", std: 10 },
  { id: "noshow", naam: "No Show", def: "fase No Show · zonder not interested", std: 10 },
  { id: "mls", naam: "Motivation Letter", def: "fase MLS · 4 calls, geen brief, no money", std: 5 },
  { id: "show", naam: "Show", def: "fase Show · 4 calls, geen brief, no money", std: 5 },
  { id: "leads", naam: "Leads · 4 calls", def: "fase Leads · reden 4 calls attempted", std: 15 },
];
const HX_STD_TOT = HX_G.reduce((s, g) => s + g.std, 0);
const HX_STAP = [["pool", "in de pool"], ["benaderd", "benaderd"], ["reactie", "reageerde"], ["show", "show"], ["getekend", "getekend"], ["stop", "stop · nooit meer"]];
const HX_MIN_DATA = 30; // pas een schatting tonen vanaf zoveel benaderd in de groep
let HX = { loaded: false, laadt: false, err: null, inst: {}, reps: [], pool: {}, res: [], open: new Set(), fStap: null, fGrp: null, fPer: null, poolFase: [], F: { groep: "", per: "" }, dirty: false, msg: null, busy: false, code: "", codeErr: null, sort: -1, repSort: -1, bijgewerkt: null, ververst: false, verErr: null };

(function () {
  const st = document.createElement("style"); st.id = "heractcss";
  st.textContent = `
  body.hx-on main>*:not(#herwrap){display:none!important}
  #herwrap{display:none;padding-bottom:84px;max-width:1240px;margin:0 auto}
  body.hx-on #herwrap{display:block}
  #herwrap .hxlive{background:var(--show-bg);color:var(--show-tx);border-radius:var(--r2);padding:9px 14px;font-size:13px;font-weight:600;margin:0 0 14px}
  #herwrap .hxcard{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:14px 16px;margin-bottom:14px}
  #herwrap .hxcard h2{font-size:14px;margin:0 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #herwrap .hxcard h2 small{color:var(--mut);font-weight:500;font-size:12px}
  #herwrap .hxsum{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap}
  #herwrap .hxsum .t{font-size:15px;font-weight:600;flex:1;min-width:220px;line-height:1.45}
  #herwrap .hxsum .t.uit{color:var(--mut)}
  #herwrap .hxsum .side{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--mut)}
  #herwrap .hxauto{display:flex;align-items:center;gap:8px;color:var(--mut);font-weight:600;font-size:12.5px;cursor:pointer}
  #herwrap .hxver{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
  #herwrap .hxver button{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--txt);border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:15px;transition:border-color .15s}
  #herwrap .hxver button:hover{border-color:var(--mut2)} #herwrap .hxver button:disabled{opacity:.5;cursor:default}
  #herwrap .hxver.bezig button{animation:hxspin 1s linear infinite} @keyframes hxspin{to{transform:rotate(360deg)}}
  #herwrap .hxfil{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
  #herwrap .hxfil label{font-size:12px;color:var(--mut);font-weight:600;margin-right:2px}
  #herwrap .hxfil select{font:inherit;color:var(--txt);border:1px solid var(--line);background:var(--card);border-radius:99px;padding:6px 10px;font-size:13px;font-weight:600;cursor:pointer}
  #herwrap .hxlink{border:0;background:none;color:var(--plan-tx);font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:4px}
  #herwrap .hxfun{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border:1px solid var(--line);border-radius:var(--r2);overflow:hidden}
  #herwrap .hxfs{font:inherit;color:var(--txt);text-align:left;background:var(--card);border:0;border-left:1px solid var(--line2);padding:10px 12px;position:relative;cursor:pointer;transition:background .15s;min-width:0}
  #herwrap .hxfs:first-child{border-left:0} #herwrap .hxfs:hover{background:var(--bg)} #herwrap .hxfs.on{background:var(--bg);box-shadow:inset 0 -2px 0 var(--txt)}
  #herwrap .hxfs:focus-visible,#herwrap .hxgr:focus-visible,#herwrap .hxdr:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
  #herwrap .hxfs b{font-size:22px;display:block;letter-spacing:-.4px;line-height:1.15;font-variant-numeric:tabular-nums}
  #herwrap .hxfs span{font-size:12px;color:var(--mut);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #herwrap .hxfs small{font-size:11px;color:var(--mut2);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #herwrap .hxfs.b b{color:var(--plan-tx)} #herwrap .hxfs.y b{color:var(--show-tx)} #herwrap .hxfs.g b{color:var(--sign-tx)} #herwrap .hxfs.r b{color:var(--close-tx)}
  #herwrap .hxfs i{position:absolute;left:0;bottom:0;height:3px;background:var(--blue);opacity:.35}
  #herwrap .hxdrill{border:1px solid var(--line);border-top:0;border-radius:0 0 var(--r2) var(--r2);margin-top:-1px;padding:6px 12px 10px;background:var(--bg)}
  #herwrap .hxdh{display:grid;grid-template-columns:16px 1fr auto 64px;gap:8px;align-items:center;font-size:12px;color:var(--mut);font-weight:600;padding:6px 2px 4px;border-bottom:1px solid var(--line2)}
  #herwrap .hxsort{font:inherit;color:var(--mut);background:none;border:0;cursor:pointer;padding:2px 0;font-weight:600;text-align:right;white-space:nowrap;transition:color .15s}
  #herwrap .hxsort:hover{color:var(--txt)} #herwrap .hxsort:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  #herwrap .hxdh .p{text-align:right}
  #herwrap .hxdr{font:inherit;color:var(--txt);display:grid;grid-template-columns:16px 1fr auto 64px;gap:8px;align-items:center;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line2);padding:7px 2px;cursor:pointer;font-size:13px}
  #herwrap .hxdr:hover b{text-decoration:underline} #herwrap .hxdr .n{font-weight:700;font-variant-numeric:tabular-nums;text-align:right} #herwrap .hxdr .p{color:var(--mut);font-size:12px;text-align:right;font-variant-numeric:tabular-nums}
  #herwrap .hxdr .chev{color:var(--mut2);font-size:10px;transition:transform .15s} #herwrap .hxdr.open .chev{transform:rotate(90deg)}
  #herwrap .hxsub{padding:0 0 4px 24px;border-bottom:1px solid var(--line2)}
  #herwrap .hxdr2{font-size:12.5px;padding:6px 2px} #herwrap .hxdr2 .n{font-weight:600}
  #herwrap .hxfase{margin:4px 0 8px 24px;background:var(--card);border:1px solid var(--line2);border-radius:8px;padding:4px 10px}
  #herwrap .hxfase>div{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mut);padding:4px 0;border-bottom:1px solid var(--line2)} #herwrap .hxfase>div:last-child{border-bottom:0}
  #herwrap .hxfase b{color:var(--txt);font-variant-numeric:tabular-nums} #herwrap .hxfase .hxleeg{padding:4px 0;font-size:12px}
  #herwrap .hxleeg{font-size:13px;color:var(--mut);padding:10px 2px}
  #herwrap .hxg{border-top:1px solid var(--line2)} #herwrap .hxg:first-child{border-top:0}
  #herwrap .hxgr{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:14px;align-items:center;padding:11px 0}
  #herwrap .hxnm{min-width:0} #herwrap .hxnm b{display:block;font-size:13.5px} #herwrap .hxnm span{font-size:12px;color:var(--mut);display:block}
  #herwrap .hxg.off .hxnm b{color:var(--mut)}
  #herwrap .hxpn{font-size:12.5px;color:var(--mut);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums} #herwrap .hxpn b{color:var(--txt);font-size:14px}
  #herwrap .hxres{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  #herwrap .hxpill{border-radius:99px;padding:3px 9px;font-size:12px;font-weight:600;background:var(--line2);color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums}
  #herwrap .hxpill.b{background:var(--plan-bg);color:var(--plan-tx)} #herwrap .hxpill.y{background:var(--show-bg);color:var(--show-tx)} #herwrap .hxpill.g{background:var(--sign-bg);color:var(--sign-tx)} #herwrap .hxpill.r{background:var(--close-bg);color:var(--close-tx)}
  #herwrap .hxstc{display:flex;align-items:center;gap:8px;justify-content:flex-end}
  #herwrap .hxsw{width:38px;height:22px;border-radius:99px;background:#c9c6bb;position:relative;border:0;cursor:pointer;padding:0;flex:none;transition:background .15s}
  #herwrap .hxsw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  #herwrap .hxsw[aria-checked="true"]{background:var(--green)} #herwrap .hxsw[aria-checked="true"]::after{left:19px} #herwrap .hxsw:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  #herwrap .hxst{font-size:12px;font-weight:600;border-radius:99px;padding:4px 9px;white-space:nowrap}
  #herwrap .hxst.uit{background:var(--line2);color:var(--mut)} #herwrap .hxst.aan{background:var(--sign-bg);color:var(--sign-tx)} #herwrap .hxst.klaar{background:var(--plan-bg);color:var(--plan-tx)} #herwrap .hxst.leeg{background:var(--close-bg);color:var(--close-tx)}
  #herwrap .hxedit{font:inherit;font-size:12.5px;font-weight:600;color:var(--plan-tx);background:none;border:0;cursor:pointer;padding:4px 2px;white-space:nowrap}
  #herwrap .hxedit:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  #herwrap .hxset{display:none;background:var(--bg);border-radius:var(--r2);padding:14px 16px;margin:0 0 12px}
  #herwrap .hxg.open .hxset{display:block}
  #herwrap .hxfld{margin-bottom:16px} #herwrap .hxfld:last-child{margin-bottom:0}
  #herwrap .hxfld>label,#herwrap .hxfld>.lb{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
  #herwrap .hxfld .lb small{font-weight:500;color:var(--mut)}
  #herwrap .hxgr2{font-size:12px;color:var(--mut);margin-top:6px;line-height:1.5}
  #herwrap .hxgr2 b{color:var(--txt);font-weight:600}
  #herwrap .hxinl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px}
  #herwrap input[type=number]{font:inherit;color:var(--txt);border:1px solid var(--line);background:var(--card);border-radius:8px;padding:6px 9px;font-size:13px;width:84px}
  #herwrap .hxchks{display:flex;gap:6px 8px;flex-wrap:wrap}
  #herwrap .hxchk{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card);border-radius:99px;padding:5px 11px;font-size:13px;cursor:pointer;white-space:nowrap}
  #herwrap .hxchk input{width:15px;height:15px;margin:0;accent-color:var(--txt)} #herwrap .hxchk small{color:var(--mut);font-variant-numeric:tabular-nums}
  #herwrap .hxchk.off{color:var(--mut)}
  #herwrap .hxadv{font:inherit;font-size:12px;font-weight:600;color:var(--plan-tx);background:none;border:1px solid var(--line);border-radius:99px;padding:3px 9px;cursor:pointer}
  #herwrap .hxadv:hover{border-color:var(--mut2)}
  #herwrap .hxerr{color:var(--close-tx);font-size:12px;margin-top:6px;display:none} #herwrap .hxerr.on{display:block}
  #herwrap .hxtw{overflow-x:auto;margin-top:14px}
  #herwrap table.hxper{width:100%;border-collapse:collapse;font-size:13px;background:var(--card);border-radius:10px;overflow:hidden}
  #herwrap table.hxper th{font-size:11.5px;color:var(--mut);font-weight:600;text-align:right;padding:8px 10px;border-bottom:1px solid var(--line2)}
  #herwrap table.hxper th:first-child,#herwrap table.hxper td:first-child{text-align:left}
  #herwrap table.hxper td{padding:8px 10px;text-align:right;border-bottom:1px solid var(--line2);font-variant-numeric:tabular-nums} #herwrap table.hxper tr:last-child td{border-bottom:0}
  #herwrap .hxchips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
  #herwrap .hxrc{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:99px;overflow:hidden;background:var(--card)}
  #herwrap .hxrc button{font:inherit;border:0;background:none;color:var(--txt);cursor:pointer;font-size:13px;font-weight:600;padding:6px 12px;transition:background .15s}
  #herwrap .hxrc.on{background:var(--sel-bg);border-color:var(--sel-bg)} #herwrap .hxrc.on button{color:var(--sel-tx)}
  #herwrap .hxrc.uit button{color:var(--mut);text-decoration:line-through}
  #herwrap .hxrc .x{padding:6px 10px 6px 4px;font-weight:500;color:var(--mut2);text-decoration:none!important}
  #herwrap .hxrc button:focus-visible{outline:2px solid var(--blue);outline-offset:-2px}
  #herwrap details.hxhid{font-size:12px;color:var(--mut)} #herwrap details.hxhid summary{cursor:pointer;padding:6px 4px;font-weight:600}
  #herwrap details.hxhid .in{display:flex;gap:8px;flex-wrap:wrap;padding:4px 0 6px}
  #herwrap .hxteam{font-size:14px;font-weight:600;margin:0 0 6px}
  #herwrap .hxcaph{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,240px) 108px;gap:14px;align-items:center;font-size:12px;color:var(--mut);font-weight:600;padding:8px 0 4px;border-bottom:1px solid var(--line2)}
  #herwrap .hxcap{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,240px) 108px;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line2);font-size:13px}
  #herwrap .hxcap:last-child{border-bottom:0}
  #herwrap .hxcap .ln{min-width:0;line-height:1.45} #herwrap .hxcap .ln b{font-weight:700} #herwrap .hxcap .ln span{color:var(--mut)}
  #herwrap .hxcap.team{font-weight:600}
  #herwrap .hxwbar{height:10px;border-radius:5px;background:var(--line2);overflow:hidden;position:relative}
  #herwrap .hxwbar i{display:block;height:100%;border-radius:5px}
  #herwrap .hxwbar i.g{background:var(--green)} #herwrap .hxwbar i.o{background:var(--yellow)} #herwrap .hxwbar i.r{background:var(--red)}
  #herwrap .hxwk{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12.5px;font-weight:600}
  #herwrap .hxwk.g{color:var(--sign-tx)} #herwrap .hxwk.o{color:var(--show-tx)} #herwrap .hxwk.r{color:var(--close-tx)} #herwrap .hxwk.m{color:var(--mut);font-weight:500}
  #herwrap .hxnote{font-size:11.5px;color:var(--mut2);margin:6px 2px;line-height:1.5}
  #herwrap .hxbtn{font:inherit;color:var(--txt);border:1px solid var(--line);background:var(--card);border-radius:8px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;transition:border-color .15s,opacity .15s}
  #herwrap .hxbtn:hover{border-color:var(--mut2)} #herwrap .hxbtn.main{background:var(--txt);color:var(--card);border-color:var(--txt);padding:9px 16px} #herwrap .hxbtn.main:hover{opacity:.85} #herwrap .hxbtn:disabled{opacity:.5;cursor:default}
  #herwrap .hxbtn:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  #herwrap .hxsave{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 22px calc(10px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:12px;z-index:20}
  #herwrap .hxsave .msg{font-size:12.5px;color:var(--mut);flex:1;min-width:0} #herwrap .hxsave .msg.ok{color:var(--sign-tx);font-weight:600} #herwrap .hxsave .msg.bad{color:var(--close-tx)} #herwrap .hxsave .msg.dirty{color:var(--show-tx);font-weight:600}
  #herwrap .hxgate{max-width:420px} #herwrap .hxgate label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}
  #herwrap .hxgate input{font:inherit;color:var(--txt);border:1px solid var(--line);background:var(--card);border-radius:8px;padding:8px 10px;font-size:14px;width:200px}
  #herwrap .hxload-txt{padding:30px;text-align:center;color:var(--mut)}
  @media(max-width:900px){#herwrap .hxfun{grid-template-columns:repeat(3,minmax(0,1fr))}#herwrap .hxfs:nth-child(n+4){border-top:1px solid var(--line2)}#herwrap .hxfs:nth-child(4){border-left:0}
    #herwrap .hxgr{grid-template-columns:minmax(0,1fr) auto;row-gap:6px;grid-template-areas:'nm sc' 'pn ed'}
    #herwrap .hxnm{grid-area:nm}#herwrap .hxstc{grid-area:sc}#herwrap .hxpn{grid-area:pn;text-align:left}#herwrap .hxedit{grid-area:ed;justify-self:end}
    #herwrap .hxset{padding:12px}#herwrap table.hxper{font-size:12px;min-width:480px}#herwrap table.hxper th,#herwrap table.hxper td{padding:6px}
    #herwrap .hxcaph{display:none}#herwrap .hxcap{grid-template-columns:minmax(0,1fr) 96px;row-gap:6px}#herwrap .hxcap .ln{grid-column:1/-1}
    #herwrap .hxsave{padding-left:16px;padding-right:16px}#herwrap .hxsub{padding-left:8px}#herwrap .hxfase{margin-left:8px}}
  `;
  document.head.appendChild(st);
  const main = document.querySelector("main");
  if (main && !document.getElementById("herwrap")) { const w = document.createElement("div"); w.id = "herwrap"; main.appendChild(w); }
})();

// ---- data ----
const hxNum = v => (v === "" || v == null || isNaN(Number(v))) ? NaN : Number(v);
const hxNl = (x, d = 1) => Number(x).toFixed(d).replace(".", ",");
const hxTijd = s => s ? new Date(s).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "—";
function hxApplyInst(j) {
  HX.inst = {}; for (const g of HX_G) HX.inst[g.id] = { groep: g.id, aan: false, periodes: [], per_dag: 0, stop_shows: null, aan_sinds: null, shows_sinds: 0, auto_bijdraaien: false };
  for (const i of (j.instellingen || [])) if (HX.inst[i.groep]) HX.inst[i.groep] = { groep: i.groep, aan: !!i.aan, periodes: [...(i.periodes || [])], per_dag: i.per_dag ?? 0, stop_shows: i.stop_shows ?? null, aan_sinds: i.aan_sinds || null, shows_sinds: i.shows_sinds || 0, auto_bijdraaien: !!i.auto_bijdraaien };
  HX.reps = (j.reps || []).map(r => ({ ...r, actief: r.actief !== false, verborgen: !!r.verborgen }));
}
function hxApplyData(j) {
  HX.pool = {}; for (const p of (j.pool || [])) HX.pool[p.groep + "|" + p.periode] = p.n;
  HX.res = j.resultaten || []; HX.poolFase = j.pool_fase || []; HX.bijgewerkt = j.bijgewerkt || j.gen || null;
  if (HX.dirty) { // eigen wijzigingen aan reps houden, cijfers verversen
    const m = Object.fromEntries(HX.reps.map(r => [r.rep, r]));
    HX.reps = (j.reps || []).map(r => ({ ...r, actief: m[r.rep] ? m[r.rep].actief : r.actief !== false, verborgen: m[r.rep] ? m[r.rep].verborgen : !!r.verborgen }));
  }
}
function hxApply(j) { hxApplyInst(j); hxApplyData(j); HX.loaded = true; HX.dirty = false; }
async function hxPost(body) {
  const r = await fetch(HX_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error("server gaf " + r.status);
  if (j.error) throw new Error(j.error === "unauthorized" ? "toegangscode klopt niet" : j.error);
  return j;
}
async function hxLaad() {
  if (HX.laadt) return; HX.laadt = true; HX.err = null; hxDraw();
  try {
    let j;
    if (HX_LOCAL()) j = await (await fetch("heractivatie_demo.json")).json();
    else { if (!HX.code) throw new Error("vul eerst de code in"); j = await hxPost({ code: HX.code, actie: "lezen" }); }
    hxApply(j);
  } catch (e) {
    if (/toegangscode/.test(e.message || "")) { HX.code = ""; HX.codeErr = "Code klopt niet"; }
    else HX.err = "Heractivatie niet geladen: " + (e.message || e);
  }
  HX.laadt = false; hxDraw();
}
async function hxVervers() { // rekent de cache opnieuw uit (±15 s); het scherm blijft bruikbaar
  if (HX.ververst) return; HX.ververst = true; HX.verErr = null; hxDrawSum();
  try {
    let j;
    if (HX_LOCAL()) { await new Promise(r => setTimeout(r, 600)); j = await (await fetch("heractivatie_demo.json")).json(); j.bijgewerkt = new Date().toISOString(); }
    else j = await hxPost({ code: HX.code, actie: "ververs" });
    if (HX.dirty) hxApplyData(j); else hxApply(j);
  } catch (e) { HX.verErr = "verversen mislukt"; }
  HX.ververst = false; if (HX.dirty) hxRedrawPart(); else hxDraw();
}

// ---- rekenen ----
const hxRes = (g, per, k) => HX.res.filter(r => (!g || r.groep === g) && (!per || r.periode === per)).reduce((s, r) => s + (Number(r[k]) || 0), 0);
const hxResP = (g, pers, poging) => HX.res.filter(r => r.groep === g && pers.includes(r.periode) && Number(r.poging || 1) === poging).reduce((s, r) => s + (Number(r.benaderd) || 0), 0);
const hxPool = (g, per) => HX_PER.filter(p => !per || p[0] === per).reduce((s, p) => s + (HX.pool[g + "|" + p[0]] || 0), 0);
const hxSelPool = g => HX.inst[g].periodes.reduce((s, p) => s + (HX.pool[g + "|" + p] || 0), 0);
const hxOver = g => Math.max(0, hxSelPool(g) - hxResP(g, HX.inst[g].periodes, 1));
const hxPct = (a, b) => b ? hxNl(100 * a / b) + "%" : "";
const hxDagen = g => { const i = HX.inst[g], pd = i.per_dag || 0; return pd > 0 ? Math.ceil(hxOver(g) / pd) : null; };
const hxNaam = g => HX_G.find(x => x.id === g).naam;
const hxStd = g => HX_G.find(x => x.id === g).std;

// capaciteit: open / (afgewerkt per werkdag × werkdagen per week) = weken werk op de plank
const hxRepsZicht = () => HX.reps.filter(r => !r.verborgen);
const hxRepsMee = () => HX.reps.filter(r => !r.verborgen && r.actief);
const hxCapWk = r => (Number(r.af_werkdag) || 0) * (Number(r.werkdagen_week) || 0);
const hxWeken = r => { const c = hxCapWk(r); return c > 0 ? (r.open || 0) / c : null; };
const hxKleur = w => w == null ? "m" : w < 2 ? "g" : w <= 3 ? "o" : "r";
function hxTeam() { const rs = hxRepsMee(), open = rs.reduce((s, r) => s + (r.open || 0), 0), cap = rs.reduce((s, r) => s + hxCapWk(r), 0); return { open, cap, wk: cap > 0 ? open / cap : null }; }
const hxTeamVol = () => { const t = hxTeam(); return t.wk != null && t.wk > 3; };
const hxAdvies = g => hxTeamVol() ? Math.max(1, Math.ceil(hxStd(g) / 2)) : hxStd(g);

function hxStat(g) {
  const i = HX.inst[g];
  if (!i.aan) return ["uit", "Uit"];
  if (i.stop_shows && i.shows_sinds >= i.stop_shows) return ["klaar", "Klaar · " + i.stop_shows + " shows"];
  if (i.periodes.length && hxOver(g) === 0) return ["leeg", "Leads op"];
  return ["aan", "Aan"];
}
// schatting 'stop na N shows': alleen op echte cijfers van deze groep
function hxShowSchatting(g) {
  const i = HX.inst[g], n = i.stop_shows, ben = hxRes(g, null, "benaderd"), sh = hxRes(g, null, "show");
  if (!n) return "";
  if (ben < HX_MIN_DATA) return `Nog geen cijfers — schatting volgt na ~${HX_MIN_DATA} berichten${ben ? ` (nu ${ben})` : ""}.`;
  if (!sh) return `${ben} berichten gaven nog geen show, dus geen schatting.`;
  const rest = Math.max(0, n - (i.shows_sinds || 0)), ber = Math.ceil(rest * ben / sh), pd = i.per_dag || 0;
  return `Tot nu toe 1 show per ${hxNl(ben / sh, 0)} berichten → nog ± ${ber} berichten${pd ? ` · ± ${Math.ceil(ber / pd)} werkdagen` : ""}.`;
}

// ---- tekenen ----
function hxSumHtml() {
  const aan = HX_G.filter(g => HX.inst[g.id].aan);
  let t;
  if (!aan.length) t = `<div class="t uit">Alles staat uit.</div>`;
  else {
    const nm = aan.map(g => g.naam), lijst = nm.length > 1 ? nm.slice(0, -1).join(", ") + " en " + nm[nm.length - 1] : nm[0];
    const tot = aan.reduce((s, g) => s + (HX.inst[g.id].per_dag || 0), 0);
    const d = Math.max(0, ...aan.map(g => hxDagen(g.id) || 0));
    t = `<div class="t">Aan: ${esc(lijst)} · ${tot} berichten per werkdag · ${aan.length > 1 ? "alle groepen klaar" : "klaar"} in ± ${d} werkdag${d === 1 ? "" : "en"}</div>`;
  }
  const auto = HX_G.every(g => HX.inst[g.id].auto_bijdraaien);
  return `<div class="hxsum">${t}<div class="side">`
    + `<label class="hxauto" title="Past elke ochtend het aantal per werkdag aan volgens het advies. Wordt nu alleen bewaard; werkt pas als de verzending aan staat."><span>Automatisch bijdraaien</span><button class="hxsw" role="switch" aria-checked="${auto}" data-hx="auto" aria-label="Automatisch bijdraaien"></button></label>`
    + `<span class="hxver${HX.ververst ? " bezig" : ""}" title="Cijfers worden ververst bij nieuwe GHL-gebeurtenissen (max 1× per half uur). ↻ rekent ze nu opnieuw uit (±15 s)."><button data-hx="ververs" aria-label="Cijfers verversen" ${HX.ververst ? "disabled" : ""}>↻</button>${HX.ververst ? "verversen…" : HX.verErr ? esc(HX.verErr) : "bijgewerkt om " + hxTijd(HX.bijgewerkt)}</span>`
    + `</div></div>`;
}
function hxSortBtn(lbl, key) { const d = key === "rep" ? HX.repSort : HX.sort; return `<button class="hxsort" data-hx="sort" data-k="${key}" aria-label="sorteer ${d < 0 ? "laag naar hoog" : "hoog naar laag"}">${lbl} ${d < 0 ? "▼" : "▲"}</button>`; }
const hxSorted = (arr, f) => arr.map(x => [x, f(x)]).sort((a, b) => HX.sort * (a[1] - b[1])).map(x => x[0]);
function hxFunnelHtml() {
  const gs = HX.F.groep ? [HX.F.groep] : HX_G.map(g => g.id), per = HX.F.per || null;
  const t = k => gs.reduce((s, g) => s + (k === "pool" ? hxPool(g, per) : hxRes(g, per, k)), 0);
  const v = Object.fromEntries(HX_STAP.map(([k]) => [k, t(k)])); const ben = v.benaderd;
  const w = n => ben ? Math.min(100, 100 * n / ben) : 0;
  const sub = { pool: HX.F.groep || HX.F.per ? "gefilterd" : "alle groepen en periodes", benaderd: ben ? hxPct(ben, v.pool) + " van de pool" : "nog niets verstuurd", reactie: hxPct(v.reactie, ben) || "–", show: t("intake") + " intake geboekt", getekend: (hxPct(v.getekend, ben) || "–") + (ben ? " van benaderd" : ""), stop: hxPct(v.stop, ben) || "–" };
  const cls = { reactie: "b", show: "y", getekend: "g", stop: "r" };
  let h = `<div class="hxfun" role="group" aria-label="Trechter">` + HX_STAP.map(([k, l]) => `<button class="hxfs ${cls[k] || ""}${HX.fStap === k ? " on" : ""}" data-hx="stap" data-k="${k}" aria-expanded="${HX.fStap === k}"><b>${v[k]}</b><span>${l}</span><small>${sub[k]}</small>${k !== "pool" && k !== "stop" ? `<i style="width:${k === "benaderd" ? (ben ? 100 : 0) : w(v[k])}%"></i>` : ""}</button>`).join("") + `</div>`;
  if (HX.fStap) {
    const k = HX.fStap, lbl = HX_STAP.find(x => x[0] === k)[1];
    h += `<div class="hxdrill">`;
    if (k !== "pool" && !ben) h += `<div class="hxleeg">Nog niets verstuurd. Hier zie je straks per groep, periode en fase wie ${esc(lbl)}.</div>`;
    else {
      const nOf = (g, p) => k === "pool" ? hxPool(g, p) : hxRes(g, p, k);
      h += `<div class="hxdh"><span></span><span>${esc(lbl)} · groep → hoe lang geleden verloren → fase toen</span>${hxSortBtn("aantal", "n")}<span class="p">${k === "pool" ? "" : k === "benaderd" ? "van pool" : "van benaderd"}</span></div>`;
      h += hxSorted(gs, g => nOf(g, per)).map(g => {
        const n = nOf(g, per), bg = hxRes(g, per, "benaderd"), op = HX.fGrp === g;
        const p = k === "pool" ? "" : k === "benaderd" ? hxPct(n, hxPool(g, per)) : hxPct(n, bg);
        let r = `<button class="hxdr${op ? " open" : ""}" data-hx="dgrp" data-g="${g}" aria-expanded="${op}"><span class="chev">▶</span><b>${esc(hxNaam(g))}</b><span class="n">${n}</span><span class="p">${p}</span></button>`;
        if (op) r += `<div class="hxsub">` + hxSorted(HX_PER.filter(pp => !per || pp[0] === per), pp => nOf(g, pp[0])).map(([pk, pl]) => {
          const pn = nOf(g, pk), po = HX.fPer === pk;
          let x = `<button class="hxdr hxdr2${po ? " open" : ""}" data-hx="dper" data-p="${pk}" aria-expanded="${po}"><span class="chev">▶</span><span>${esc(pl)}${pk === "<30" ? "" : " dagen"}</span><span class="n">${pn}</span><span class="p"></span></button>`;
          if (po) { const fs = hxFases(g, pk, k); x += `<div class="hxfase">` + (fs.length ? fs.map(([f, n]) => `<div><span>${esc(f)}</span><b>${n}</b></div>`).join("") : `<div class="hxleeg">${k === "pool" ? "Niemand in deze periode." : "Nog niets in deze periode."}</div>`) + `</div>`; }
          return x;
        }).join("") + `</div>`;
        return r;
      }).join("");
    }
    h += `</div>`;
  }
  return h;
}
// fase toen (de fase waarin de lead verloren ging); volgorde volgt de sorteerknop
function hxFases(g, per, k) {
  const m = {};
  if (k === "pool") HX.poolFase.filter(x => x.groep === g && x.periode === per).forEach(x => m[x.fase_toen] = (m[x.fase_toen] || 0) + x.n);
  else HX.res.filter(x => x.groep === g && x.periode === per).forEach(x => { const f = x.fase_toen || "(onbekend)"; m[f] = (m[f] || 0) + (Number(x[k]) || 0); });
  return Object.entries(m).filter(e => e[1] > 0).sort((a, b) => HX.sort * (a[1] - b[1]));
}
function hxPerTable(g) { // alleen als er in deze groep al iets verstuurd is
  return `<div class="hxtw"><table class="hxper"><thead><tr><th>Verloren</th><th>Leads</th><th>Benaderd</th><th>Reactie</th><th>Intake</th><th>Show</th><th>Getekend</th><th>Stop</th></tr></thead><tbody>` + HX_PER.map(([pk, pl]) => {
    const pool = HX.pool[g + "|" + pk] || 0, b = hxRes(g, pk, "benaderd"), re = hxRes(g, pk, "reactie");
    return `<tr><td>${pl}</td><td>${pool}</td><td>${b}</td><td>${re}${re ? " · " + hxPct(re, b) : ""}</td><td>${hxRes(g, pk, "intake")}</td><td>${hxRes(g, pk, "show")}</td><td>${hxRes(g, pk, "getekend")}</td><td>${hxRes(g, pk, "stop")}</td></tr>`;
  }).join("") + `</tbody></table></div>`;
}
function hxRowSub(g) {
  const i = HX.inst[g];
  if (!i.aan) return esc(HX_G.find(x => x.id === g).def);
  const d = hxDagen(g), alle = i.periodes.length === HX_PER.length;
  return `${i.per_dag || 0} per werkdag · ${alle ? "alle leads" : HX_PER.filter(p => i.periodes.includes(p[0])).map(p => p[1].replace(" dagen", "")).join(" · ") + " dagen"}${d != null ? " · klaar in ± " + d + " werkdag" + (d === 1 ? "" : "en") : ""}${i.stop_shows ? " · stopt na " + i.stop_shows + " shows" : ""}`;
}
function hxLeadsLine(g) {
  const i = HX.inst[g], x = hxOver(g), pd = i.per_dag || 0;
  if (!i.periodes.length) return `Geen leads gekozen.`;
  return `<b>${x} leads → klaar in ± ${pd > 0 ? Math.ceil(x / pd) : "…"} werkdag${pd > 0 && Math.ceil(x / pd) === 1 ? "" : "en"}</b> · jongste verloren gaan eerst.`;
}
function hxStopLine(g) { const i = HX.inst[g]; let s = hxShowSchatting(g); if (i.aan && i.stop_shows && i.aan_sinds) s = `Nu ${i.shows_sinds || 0} van ${i.stop_shows} shows sinds ${new Date(i.aan_sinds).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}. ` + s; return s; }
function hxGroupsHtml() {
  const vol = hxTeamVol();
  return HX_G.map(G => {
    const g = G.id, i = HX.inst[g], [sc, sl] = hxStat(g), open = HX.open.has(g), ben = hxRes(g, null, "benaderd"), adv = hxAdvies(g);
    const alle = i.periodes.length === HX_PER.length;
    const pills = ben ? `<div class="hxres"><span class="hxpill">${ben} benaderd</span><span class="hxpill ${hxRes(g, null, "reactie") ? "b" : ""}">${hxRes(g, null, "reactie")} reactie · ${hxPct(hxRes(g, null, "reactie"), ben)}</span><span class="hxpill ${hxRes(g, null, "show") ? "y" : ""}">${hxRes(g, null, "show")} show</span><span class="hxpill ${hxRes(g, null, "getekend") ? "g" : ""}">${hxRes(g, null, "getekend")} getekend</span><span class="hxpill ${hxRes(g, null, "stop") ? "r" : ""}">${hxRes(g, null, "stop")} stop</span></div>` : "";
    return `<div class="hxg${open ? " open" : ""}${i.aan ? "" : " off"}" data-g="${g}">
     <div class="hxgr">
       <div class="hxnm"><b>${esc(G.naam)}</b><span class="sub">${hxRowSub(g)}</span>${pills}</div>
       <div class="hxpn"><b>${hxPool(g)}</b> leads</div>
       <button class="hxedit" data-hx="toggle" aria-expanded="${open}">${open ? "sluiten" : "aanpassen"}</button>
       <div class="hxstc"><span class="hxst ${sc}">${sl}</span><button class="hxsw" role="switch" aria-checked="${i.aan}" aria-label="${esc(G.naam)} aan of uit" data-hx="aan"></button></div>
     </div>
     <div class="hxset">
       <div class="hxfld"><label for="hxpd-${g}">Berichten per werkdag</label>
         <div class="hxinl"><input type="number" id="hxpd-${g}" min="0" max="200" step="1" value="${i.per_dag ?? 0}" data-hx="perdag">${i.per_dag !== adv ? `<button class="hxadv" data-hx="advpd">advies ${adv}</button>` : ""}</div>
         <div class="hxgr2">${vol ? `Team zit vol (meer dan 3 weken werk): advies gehalveerd naar ${adv}.` : `Advies ${adv}: startinstelling Abel (alle groepen samen ${HX_STD_TOT} per werkdag). Halveert als het team meer dan 3 weken werk heeft.`}</div>
         <div class="hxerr" id="hxe-pd-${g}">Heel getal van 1 tot 200.</div></div>
       <div class="hxfld"><div class="lb">Welke leads <small>· hoe lang geleden verloren</small></div>
         <div class="hxinl"><div class="hxchks">${HX_PER.map(([pk, pl]) => { const on = i.periodes.includes(pk); return `<label class="hxchk${on ? "" : " off"}"><input type="checkbox" data-hx="per" data-k="${pk}" ${on ? "checked" : ""}>${pl}${pk === "<30" ? "" : ""} <small>(${HX.pool[g + "|" + pk] || 0})</small></label>`; }).join("")}</div>${alle ? "" : `<button class="hxadv" data-hx="advper">advies: alle</button>`}</div>
         <div class="hxgr2" data-line="leads">${hxLeadsLine(g)}</div>
         <div class="hxerr" id="hxe-per-${g}">Vink minstens één periode aan.</div></div>
       <div class="hxfld"><div class="lb">Automatisch stoppen <small>· optioneel</small></div>
         <div class="hxinl">Stop deze groep na <input type="number" min="1" step="1" value="${i.stop_shows || ""}" data-hx="stop" aria-label="aantal shows"> shows${i.stop_shows ? ` <button class="hxadv" data-hx="advstop">advies: leeg</button>` : ""}</div>
         <div class="hxgr2">in totaal, geteld vanaf het moment dat je hem aanzet. Leeg = doorgaan tot de leads op zijn.</div>
         <div class="hxgr2" data-line="stop">${hxStopLine(g)}</div>
         <div class="hxerr" id="hxe-st-${g}">Heel getal vanaf 1, of leeg laten.</div></div>
       ${ben ? hxPerTable(g) : ""}
     </div></div>`;
  }).join("");
}
function hxRepsHtml() {
  const zicht = hxRepsZicht(), hid = HX.reps.filter(r => r.verborgen);
  if (!HX.reps.length) return `<div class="hxleeg">Geen reps gevonden.</div>`;
  let h = `<div class="hxchips" role="group" aria-label="Reps die meedoen">` + zicht.map(r => `<span class="hxrc ${r.actief ? "on" : "uit"}" data-rep="${esc(r.rep)}"><button data-hx="rep" aria-pressed="${r.actief}" title="${r.actief ? "Doet mee · klik = uit" : "Doet niet mee · klik = aan"}">${esc(r.rep)}</button>${r.actief ? "" : `<button class="x" data-hx="verberg" title="Verbergen: komt niet meer terug in dit tabblad" aria-label="${esc(r.rep)} verbergen">×</button>`}</span>`).join("") + `</div>`;
  if (hid.length) h += `<details class="hxhid"><summary>verborgen (${hid.length})</summary><div class="in">${hid.map(r => `<span class="hxrc uit" data-rep="${esc(r.rep)}"><button data-hx="terug" title="Terughalen">${esc(r.rep)} · terughalen</button></span>`).join("")}</div></details>`;
  const t = hxTeam(), tk = hxKleur(t.wk);
  h += `<div class="hxteam">Team: ${t.open} open · kan ± ${Math.round(t.cap)} per week afwerken · ${t.wk == null ? "geen werkdata" : "≈ " + hxNl(t.wk) + " week werk"}</div>`;
  const mee = hxRepsMee();
  if (!mee.length) return h + `<div class="hxleeg">Niemand doet mee. Klik een naam aan.</div>`;
  const sorted = mee.map(r => [r, hxWeken(r)]).sort((a, b) => HX.repSort * ((a[1] ?? -1) - (b[1] ?? -1))).map(x => x[0]);
  h += `<div class="hxcaph"><span>werkvoorraad = open opportunities in de hele pijplijn · tempo uit de laatste 4 weken</span><span></span>${hxSortBtn("weken werk", "rep")}</div>`;
  h += `<div class="hxcap team"><div class="ln">Team</div><div class="hxwbar" aria-hidden="true"><i class="${tk}" style="width:${t.wk == null ? 0 : Math.min(100, 100 * t.wk / 4)}%"></i></div><div class="hxwk ${tk}">${t.wk == null ? "—" : "≈ " + hxNl(t.wk) + " week werk"}</div></div>`;
  h += sorted.map(r => {
    const w = hxWeken(r), k = hxKleur(w), heeft = r.af_werkdag > 0;
    const ln = heeft ? `<b>${esc(r.rep)}</b> <span>· ${hxNl(r.werkdagen_week)} dagen/week · ± ${Math.round(r.uren || 0)} uur · ± ${Math.round(r.af_werkdag)} afgewerkt per werkdag ·</span> <b>${r.open || 0} open</b>` : `<b>${esc(r.rep)}</b> <span>· geen werkdata laatste 4 weken ·</span> <b>${r.open || 0} open</b>`;
    return `<div class="hxcap"><div class="ln">${ln}</div><div class="hxwbar" aria-hidden="true"><i class="${k}" style="width:${w == null ? 0 : Math.min(100, 100 * w / 4)}%"></i></div><div class="hxwk ${k}">${w == null ? "—" : "≈ " + hxNl(w) + " week werk"}</div></div>`;
  }).join("");
  return h + `<div class="hxnote">Afgewerkt = fasewissels + belpogingen op dagen met minstens 1 actie. Groen onder 2 weken werk, oranje 2–3, rood boven 3 (dan halveert het advies).</div>`;
}
function hxMsgHtml() {
  const m = HX.msg; if (m) return `<div class="msg ${m.c}" id="hxmsg">${esc(m.t)}</div>`;
  if (HX.dirty) return `<div class="msg dirty" id="hxmsg">Nog niet opgeslagen.</div>`;
  return `<div class="msg" id="hxmsg">Opslaan bewaart alleen de instellingen. Er wordt niets verstuurd.</div>`;
}
function hxDraw() {
  const w = document.getElementById("herwrap"); if (!w) return;
  const on = typeof tab !== "undefined" && tab === "her";
  document.body.classList.toggle("hx-on", on);
  if (!on) return;
  let h = HERACT_LIVE ? "" : `<div class="hxlive" role="status">Nog niets wordt verstuurd: de verzending staat nog uit.</div>`;
  if (!HX.code && !HX_LOCAL()) { // eigen code voor dit tabblad; alleen in een JS-variabele, nooit opgeslagen
    w.innerHTML = h + `<div class="hxcard hxgate"><form data-hx="gate" autocomplete="off"><label for="hxcode">Code voor Heractivatie</label><div class="hxinl"><input type="password" id="hxcode" name="hxcode" autocomplete="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore data-bwignore ${HX.laadt ? "disabled" : ""}><button class="hxbtn main" type="submit" ${HX.laadt ? "disabled" : ""}>${HX.laadt ? "Openen…" : "Openen"}</button></div><div class="hxerr${HX.codeErr ? " on" : ""}" role="alert">${esc(HX.codeErr || "")}</div></form></div>`;
    const f = document.getElementById("hxcode"); if (f && !HX.laadt) f.focus(); return;
  }
  if (HX.err) h += `<div class="hxcard"><div class="hxleeg">${esc(HX.err)} <button class="hxbtn" data-hx="laad">Opnieuw laden</button></div></div>`;
  if (!HX.loaded) { w.innerHTML = h + (HX.err ? "" : `<div class="hxload-txt">Heractivatie laden…</div>`); return; }
  h += `<div class="hxcard" id="hxsumcard">${hxSumHtml()}</div>`;
  h += `<div class="hxcard"><h2>Groepen <small>schakelaar = aan met de startinstelling · aanpassen voor details</small></h2><div id="hxgroups">${hxGroupsHtml()}</div></div>`;
  h += `<div class="hxcard"><h2>Resultaten <small>klik een stap: per groep, periode en fase</small></h2><div class="hxfil"><label>Toon</label><select data-hx="fgroep" aria-label="groep"><option value="">Alle groepen</option>${HX_G.map(g => `<option value="${g.id}" ${HX.F.groep === g.id ? "selected" : ""}>${esc(g.naam)}</option>`).join("")}</select><select data-hx="fper" aria-label="periode"><option value="">Alle periodes</option>${HX_PER.map(p => `<option value="${p[0]}" ${HX.F.per === p[0] ? "selected" : ""}>${p[1].replace(" dagen", "")} dagen</option>`).join("")}</select>${HX.F.groep || HX.F.per ? `<button class="hxlink" data-hx="freset">Wis filter</button>` : ""}</div><div id="hxfunnel">${hxFunnelHtml()}</div></div>`;
  h += `<div class="hxcard"><h2>Team en werkvoorraad <small>klik een naam = doet mee of niet</small></h2><div id="hxreps">${hxRepsHtml()}</div></div>`;
  h += `<p class="hxnote">Leads: verloren leads met telefoonnummer, minstens 3 dagen stil, zonder andere open of gewonnen deal, zonder 'not interested'. Regels: 60 dagen tussen pogingen, max 3, stop bij reactie of opt-out. Reactie gaat naar de oorspronkelijke eigenaar.</p>`;
  h += `<div class="hxsave">${hxMsgHtml()}<button class="hxbtn main" data-hx="save" ${HX.busy ? "disabled" : ""}>${HX.busy ? "Opslaan…" : "Instellingen opslaan"}</button></div>`;
  w.innerHTML = h;
}
function hxDrawSum() { const c = document.getElementById("hxsumcard"); if (c) c.innerHTML = hxSumHtml(); }
function hxRedrawPart() { // samenvatting, trechter, reps en meldingen bijwerken zonder invoervelden te vervangen
  const w = document.getElementById("herwrap"); if (!w || !HX.loaded) return;
  hxDrawSum();
  const f = document.getElementById("hxfunnel"); if (f) f.innerHTML = hxFunnelHtml();
  const r = document.getElementById("hxreps"); if (r) { const o = r.querySelector("details.hxhid"), op = o && o.open; r.innerHTML = hxRepsHtml(); const n = r.querySelector("details.hxhid"); if (n && op) n.open = true; }
  const m = document.getElementById("hxmsg"); if (m) m.outerHTML = hxMsgHtml();
}
function hxValidate() {
  let ok = true;
  for (const G of HX_G) {
    const g = G.id, i = HX.inst[g];
    const e = (id, bad) => { const el = document.getElementById(id); if (el) el.classList.toggle("on", bad); if (bad) { ok = false; HX.open.add(g); } };
    e("hxe-per-" + g, i.aan && i.periodes.length === 0);
    e("hxe-pd-" + g, !(Number.isInteger(i.per_dag) && i.per_dag >= 0 && i.per_dag <= 200) || (i.aan && i.per_dag === 0));
    e("hxe-st-" + g, !(i.stop_shows == null || (Number.isInteger(i.stop_shows) && i.stop_shows >= 1)));
  }
  return ok;
}
async function hxSave() {
  if (HX.busy) return;
  if (!hxValidate()) { hxDraw(); hxValidate(); HX.msg = { c: "bad", t: "Niet opgeslagen: zie de rode melding bij de groep." }; const m = document.getElementById("hxmsg"); if (m) m.outerHTML = hxMsgHtml(); return; }
  const body = { actie: "opslaan", instellingen: HX_G.map(G => { const i = HX.inst[G.id]; return { groep: G.id, aan: !!i.aan, periodes: i.periodes, per_dag: i.per_dag, stop_shows: i.stop_shows ?? null, auto_bijdraaien: !!i.auto_bijdraaien }; }), reps: HX.reps.map(r => ({ rep: r.rep, actief: !!r.actief, verborgen: !!r.verborgen })) };
  HX.busy = true; HX.msg = null; hxDraw();
  try {
    let j;
    if (HX_LOCAL()) { j = { instellingen: body.instellingen.map(x => ({ ...x, aan_sinds: x.aan ? (HX.inst[x.groep].aan_sinds || new Date().toISOString()) : null, shows_sinds: 0 })), reps: HX.reps, pool: Object.entries(HX.pool).map(([k, n]) => ({ groep: k.split("|")[0], periode: k.split("|")[1], n })), pool_fase: HX.poolFase, resultaten: HX.res, bijgewerkt: HX.bijgewerkt }; }
    else j = await hxPost({ code: HX.code, ...body });
    hxApply(j);
    HX.msg = { c: "ok", t: "Opgeslagen ✓ " + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) + " · er wordt niets verstuurd." };
  } catch (e) { HX.msg = { c: "bad", t: "Niet opgeslagen: " + (e.message || e) }; }
  HX.busy = false; hxDraw();
}
function hxChanged() { HX.dirty = true; HX.msg = null; }
function hxRowRefresh(row, g) { // één groepsrij bijwerken zonder het invoerveld te vervangen
  const [sc, sl] = hxStat(g); row.querySelector(".hxnm .sub").innerHTML = hxRowSub(g);
  const st = row.querySelector(".hxst"); st.className = "hxst " + sc; st.textContent = sl;
  const ll = row.querySelector("[data-line=leads]"); if (ll) ll.innerHTML = hxLeadsLine(g);
  const sl2 = row.querySelector("[data-line=stop]"); if (sl2) sl2.textContent = hxStopLine(g);
  hxRedrawPart();
}

// ---- events (één keer, gedelegeerd) ----
(function () {
  const w = document.getElementById("herwrap"); if (!w) return;
  w.addEventListener("click", ev => {
    const t = ev.target.closest("[data-hx]"); if (!t) return; const a = t.dataset.hx;
    const gEl = ev.target.closest(".hxg"), g = gEl && gEl.dataset.g, i = g && HX.inst[g];
    const repEl = ev.target.closest("[data-rep]"), rep = repEl && HX.reps.find(r => r.rep === repEl.dataset.rep);
    if (a === "laad") { hxLaad(); return; }
    if (a === "save") { hxSave(); return; }
    if (a === "ververs") { hxVervers(); return; }
    if (a === "freset") { HX.F = { groep: "", per: "" }; hxDraw(); return; }
    if (a === "sort") { if (t.dataset.k === "rep") { HX.repSort = -HX.repSort; document.getElementById("hxreps").innerHTML = hxRepsHtml(); } else { HX.sort = -HX.sort; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); } const b = w.querySelector(`.hxsort[data-k="${t.dataset.k}"]`); if (b) b.focus(); return; }
    if (a === "stap") { HX.fStap = HX.fStap === t.dataset.k ? null : t.dataset.k; HX.fGrp = null; HX.fPer = null; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); return; }
    if (a === "dper") { HX.fPer = HX.fPer === t.dataset.p ? null : t.dataset.p; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); return; }
    if (a === "dgrp") { HX.fGrp = HX.fGrp === t.dataset.g ? null : t.dataset.g; HX.fPer = null; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); return; }
    if (a === "auto") { ev.preventDefault(); const nv = !HX_G.every(G => HX.inst[G.id].auto_bijdraaien); HX_G.forEach(G => HX.inst[G.id].auto_bijdraaien = nv); hxChanged(); hxRedrawPart(); return; }
    if (a === "aan") { i.aan = !i.aan; if (i.aan) { if (!(i.per_dag > 0)) i.per_dag = hxAdvies(g); if (!i.periodes.length) i.periodes = HX_PER.map(p => p[0]); } hxChanged(); hxDraw(); return; }
    if (a === "toggle") { HX.open.has(g) ? HX.open.delete(g) : HX.open.add(g); hxDraw(); return; }
    if (a === "per") { const k = t.dataset.k; i.periodes = t.checked ? HX_PER.map(p => p[0]).filter(p => p === k || i.periodes.includes(p)) : i.periodes.filter(x => x !== k); hxChanged(); hxDraw(); return; }
    if (a === "advpd") { i.per_dag = hxAdvies(g); hxChanged(); hxDraw(); return; }
    if (a === "advper") { i.periodes = HX_PER.map(p => p[0]); hxChanged(); hxDraw(); return; }
    if (a === "advstop") { i.stop_shows = null; hxChanged(); hxDraw(); return; }
    if (a === "rep" && rep) { rep.actief = !rep.actief; hxChanged(); hxDraw(); return; }
    if (a === "verberg" && rep) { rep.verborgen = true; rep.actief = false; hxChanged(); hxDraw(); return; }
    if (a === "terug" && rep) { rep.verborgen = false; rep.actief = true; hxChanged(); hxDraw(); return; }
  });
  w.addEventListener("submit", ev => {
    if (!ev.target.matches("[data-hx=gate]")) return; ev.preventDefault();
    const inp = document.getElementById("hxcode"), v = inp ? inp.value.trim() : "";
    if (inp) inp.value = "";
    if (!v) { HX.codeErr = "Vul de code in"; hxDraw(); return; }
    HX.code = v; HX.codeErr = null; HX.err = null; HX.loaded = false; hxLaad();
  });
  w.addEventListener("change", ev => {
    const t = ev.target, a = t.dataset && t.dataset.hx; if (!a) return;
    if (a === "fgroep") { HX.F.groep = t.value; HX.fGrp = null; hxDraw(); return; }
    if (a === "fper") { HX.F.per = t.value; hxDraw(); return; }
  });
  w.addEventListener("input", ev => {
    const t = ev.target, a = t.dataset && t.dataset.hx; if (!a || !["perdag", "stop"].includes(a)) return;
    const row = t.closest(".hxg"), g = row.dataset.g, i = HX.inst[g];
    if (a === "perdag") i.per_dag = hxNum(t.value);
    if (a === "stop") i.stop_shows = t.value.trim() === "" ? null : hxNum(t.value);
    hxChanged(); hxRowRefresh(row, g);
  });
})();

// ---- inhaken op de motor: tab na Verloren, eigen tekenvlak ----
const _hxTabs = drawTabs;
drawTabs = function () {
  _hxTabs.apply(this, arguments);
  const el = document.getElementById("tabs"); if (!el || el.querySelector("[data-hxtab]")) return;
  const t = document.createElement("div"); t.className = "tab" + (tab === "her" ? " on" : ""); t.dataset.hxtab = "1"; t.textContent = "♻️ Heractivatie";
  t.title = "WhatsApp-heractivatie van verloren leads: per groep aan/uit, aantal per werkdag en welke leads";
  t.onclick = () => { tab = "her"; sel = null; render(); };
  const after = [...el.querySelectorAll(".tab")].find(x => /Verloren/.test(x.textContent));
  if (after && after.nextSibling) el.insertBefore(t, after.nextSibling); else el.appendChild(t);
  if (tab === "her") el.querySelectorAll(".tab.on").forEach(x => { if (x !== t) x.classList.remove("on"); });
};
const _hxCols = drawCols;
drawCols = function () {
  if (typeof tab !== "undefined" && tab === "her") { hxDraw(); if ((HX.code || HX_LOCAL()) && !HX.loaded && !HX.laadt && !HX.err) hxLaad(); return; }
  document.body.classList.remove("hx-on");
  _hxCols.apply(this, arguments);
};
