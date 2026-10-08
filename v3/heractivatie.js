// v3 · ♻️ Heractivatie (8 okt 2026, Hermes · DPAC-706/708). Laag bovenop engine_a/b, app.js, clean.js, ai.js, abel.js.
// Alleen instellen + inzien: leest en bewaart instellingen via n8n 99i (webhook dpac-heractivatie) in Supabase.
// Verstuurt niets en schrijft niets naar GHL. Uit te zetten door dit script uit index.html te halen.
const HERACT_LIVE = false;   // de parent zet dit aan zodra de verzending echt loopt
const HX_URL = "https://dpac.app.n8n.cloud/webhook/dpac-heractivatie";
const HX_LOCAL = () => location.search.indexOf("local=1") >= 0;
const HX_PER = [["<30", "<30 d"], ["30-90", "30–90 d"], ["90-180", "90–180 d"], ["180+", "180+ d"]];
const HX_G = [
  { id: "reopen", naam: "Reopen later", def: "alle fases · reden Reopen later" },
  { id: "mls", naam: "Motivation Letter", def: "fase MLS · 4 calls, geen brief, no money" },
  { id: "show", naam: "Show", def: "fase Show · 4 calls, geen brief, no money" },
  { id: "noshow", naam: "No Show", def: "fase No Show · zonder not interested" },
  { id: "leads", naam: "Leads · 4 calls", def: "fase Leads · reden 4 calls attempted" },
];
const HX_DOEL = { pool: "tot de pool op is", intakes: "tot N intakes", shows: "tot N shows", datum: "tot een datum" };
const HX_STAP = [["pool", "in de pool"], ["benaderd", "benaderd"], ["reactie", "reageerde"], ["show", "show"], ["getekend", "getekend"], ["stop", "stop · nooit meer"]];
let HX = { loaded: false, laadt: false, err: null, inst: {}, reps: [], pool: {}, res: [], open: new Set(), fStap: null, fGrp: null, fPer: null, poolFase: [], F: { groep: "", per: "" }, dirty: false, msg: null, busy: false };

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
  #herwrap .hxdrill h3{font-size:12px;color:var(--mut);font-weight:600;margin:6px 0 4px}
  #herwrap .hxdr{font:inherit;color:var(--txt);display:grid;grid-template-columns:16px 1fr auto 64px;gap:8px;align-items:center;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line2);padding:7px 2px;cursor:pointer;font-size:13px}
  #herwrap .hxdr:hover b{text-decoration:underline} #herwrap .hxdr .n{font-weight:700;font-variant-numeric:tabular-nums;text-align:right} #herwrap .hxdr .p{color:var(--mut);font-size:12px;text-align:right;font-variant-numeric:tabular-nums}
  #herwrap .hxdr .chev{color:var(--mut2);font-size:10px;transition:transform .15s} #herwrap .hxdr.open .chev{transform:rotate(90deg)}
  #herwrap .hxsub{padding:0 0 4px 24px;border-bottom:1px solid var(--line2)}
  #herwrap .hxdr2{font-size:12.5px;padding:6px 2px} #herwrap .hxdr2 .n{font-weight:600}
  #herwrap .hxfase{margin:4px 0 8px 24px;background:var(--card);border:1px solid var(--line2);border-radius:8px;padding:4px 10px}
  #herwrap .hxfase>div{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--mut);padding:4px 0;border-bottom:1px solid var(--line2)} #herwrap .hxfase>div:last-child{border-bottom:0}
  #herwrap .hxfase b{color:var(--txt);font-variant-numeric:tabular-nums} #herwrap .hxfase .hxleeg{padding:4px 0;font-size:12px}
  #herwrap .hxleeg{font-size:13px;color:var(--mut);padding:10px 2px}
  #herwrap .hxstrip{display:flex;align-items:center;gap:18px;flex-wrap:wrap;font-size:13px;margin-top:10px}
  #herwrap .hxstrip b{font-size:18px;letter-spacing:-.3px;margin-right:4px;font-variant-numeric:tabular-nums} #herwrap .hxstrip .m{color:var(--mut)}
  #herwrap .hxstrip .hxauto{margin-left:auto;display:flex;align-items:center;gap:8px;color:var(--mut);font-weight:600;font-size:12.5px;cursor:pointer}
  #herwrap .hxrem{background:var(--show-bg);color:var(--show-tx);border-radius:99px;padding:4px 10px;font-size:12px;font-weight:600}
  #herwrap .hxg{border-top:1px solid var(--line2)} #herwrap .hxg:first-of-type{border-top:0}
  #herwrap .hxgr{display:grid;grid-template-columns:34px 220px minmax(0,1fr) 340px 150px;gap:12px;align-items:center;padding:11px 0;cursor:pointer;border-radius:8px}
  #herwrap .hxrank{width:26px;height:26px;border-radius:50%;background:var(--txt);color:var(--card);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
  #herwrap .hxg.off .hxrank{background:var(--sand);color:#0e0e0f}
  #herwrap .hxnm{min-width:0} #herwrap .hxnm b{display:block;font-size:13.5px} #herwrap .hxnm span{font-size:12px;color:var(--mut);display:block}
  #herwrap .hxnm .hxadv{color:var(--plan-tx);font-weight:600}
  #herwrap .hxbar{height:22px;border-radius:6px;background:var(--line2);display:flex;overflow:hidden;position:relative;min-width:0}
  #herwrap .hxbar i{display:block;height:100%} #herwrap .hxbar .p1{background:var(--blue)} #herwrap .hxbar .p2{background:var(--yellow)} #herwrap .hxbar .p3{background:var(--pay)}
  #herwrap .hxbar em{position:absolute;right:8px;top:3px;font-style:normal;font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums}
  #herwrap .hxres{display:flex;gap:6px;flex-wrap:nowrap;justify-content:flex-end}
  #herwrap .hxpill{border-radius:99px;padding:4px 9px;font-size:12px;font-weight:600;background:var(--line2);color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums}
  #herwrap .hxpill.b{background:var(--plan-bg);color:var(--plan-tx)} #herwrap .hxpill.y{background:var(--show-bg);color:var(--show-tx)} #herwrap .hxpill.g{background:var(--sign-bg);color:var(--sign-tx)} #herwrap .hxpill.r{background:var(--close-bg);color:var(--close-tx)}
  #herwrap .hxstc{display:flex;align-items:center;gap:8px;justify-content:flex-end}
  #herwrap .hxsw{width:38px;height:22px;border-radius:99px;background:#c9c6bb;position:relative;border:0;cursor:pointer;padding:0;flex:none;transition:background .15s}
  #herwrap .hxsw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  #herwrap .hxsw[aria-checked="true"]{background:var(--green)} #herwrap .hxsw[aria-checked="true"]::after{left:19px} #herwrap .hxsw:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  #herwrap .hxst{font-size:12px;font-weight:600;border-radius:99px;padding:4px 9px;white-space:nowrap}
  #herwrap .hxst.uit{background:var(--line2);color:var(--mut)} #herwrap .hxst.aan{background:var(--sign-bg);color:var(--sign-tx)} #herwrap .hxst.rem{background:var(--show-bg);color:var(--show-tx)} #herwrap .hxst.klaar{background:var(--plan-bg);color:var(--plan-tx)} #herwrap .hxst.leeg{background:var(--close-bg);color:var(--close-tx)}
  #herwrap .hxlegend{display:flex;gap:12px;font-size:11.5px;color:var(--mut);margin-top:8px;flex-wrap:wrap} #herwrap .hxlegend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
  #herwrap .hxset{display:none;background:var(--bg);border-radius:var(--r2);padding:12px 14px;margin:0 0 12px 46px}
  #herwrap .hxg.open .hxset{display:block}
  #herwrap .hxadvrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;margin:0 0 12px}
  #herwrap .hxadvrow b{font-weight:600}
  #herwrap .hxsetrow{display:flex;gap:10px 28px;flex-wrap:wrap;align-items:flex-start;margin-bottom:12px}
  #herwrap .hxf label{display:block;font-size:12px;color:var(--mut);font-weight:600;margin-bottom:6px}
  #herwrap input[type=number],#herwrap input[type=date],#herwrap select.hxsel{font:inherit;color:var(--txt);border:1px solid var(--line);background:var(--card);border-radius:8px;padding:6px 9px;font-size:13px;width:96px}
  #herwrap select.hxsel{width:auto} #herwrap .hxinl{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  #herwrap .hxerr{color:var(--close-tx);font-size:12px;margin-top:6px;display:none} #herwrap .hxerr.on{display:block}
  #herwrap .hxtw{overflow-x:auto}
  #herwrap table.hxper{width:100%;border-collapse:collapse;font-size:13px;background:var(--card);border-radius:10px;overflow:hidden}
  #herwrap table.hxper th{font-size:11.5px;color:var(--mut);font-weight:600;text-align:right;padding:8px 10px;border-bottom:1px solid var(--line2)}
  #herwrap table.hxper th:first-child,#herwrap table.hxper td:first-child{text-align:left}
  #herwrap table.hxper td{padding:8px 10px;text-align:right;border-bottom:1px solid var(--line2);font-variant-numeric:tabular-nums} #herwrap table.hxper tr:last-child td{border-bottom:0}
  #herwrap table.hxper tr.off td{color:var(--mut2)} #herwrap table.hxper td.r{color:var(--plan-tx);font-weight:600} #herwrap table.hxper td.ok{color:var(--sign-tx);font-weight:600}
  #herwrap table.hxper label{cursor:pointer;white-space:nowrap} #herwrap table.hxper .chk{width:16px;height:16px;vertical-align:-3px;margin:0 6px 0 0;accent-color:var(--txt)}
  #herwrap table.hxper small{color:var(--mut2)}
  #herwrap .hxtn{font-size:11.5px;color:var(--mut2);margin-top:6px}
  #herwrap .hxreps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  #herwrap .hxrep{border:1px solid var(--line);border-radius:var(--r2);padding:10px 12px}
  #herwrap .hxrep .nm{display:flex;align-items:center;gap:8px;margin-bottom:6px} #herwrap .hxrep .nm b{font-size:13.5px} #herwrap .hxrep .nm .hxst{margin-left:auto}
  #herwrap .hxrep .cap{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mut)}
  #herwrap .hxnum{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:8px;overflow:hidden}
  #herwrap .hxnum button{font:inherit;color:var(--txt);border:0;background:var(--card);width:30px;height:30px;cursor:pointer;font-size:15px;transition:background .15s} #herwrap .hxnum button:hover{background:var(--line2)}
  #herwrap .hxnum span{min-width:30px;text-align:center;font-weight:700;font-size:13px;color:var(--txt);font-variant-numeric:tabular-nums}
  #herwrap .hxload{height:8px;border-radius:4px;background:var(--line2);margin:8px 0 4px;overflow:hidden} #herwrap .hxload i{display:block;height:100%;background:var(--green)}
  #herwrap .hxrep.vol .hxload i{background:var(--red)} #herwrap .hxrep.bijna .hxload i{background:var(--yellow)}
  #herwrap .hxrep .sub{font-size:12px;color:var(--mut)}
  #herwrap .hxnote{font-size:11.5px;color:var(--mut2);margin:6px 2px;line-height:1.5}
  #herwrap .hxbtn{font:inherit;color:var(--txt);border:1px solid var(--line);background:var(--card);border-radius:8px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;transition:border-color .15s,opacity .15s}
  #herwrap .hxbtn:hover{border-color:var(--mut2)} #herwrap .hxbtn.main{background:var(--txt);color:var(--card);border-color:var(--txt);padding:9px 16px} #herwrap .hxbtn.main:hover{opacity:.85} #herwrap .hxbtn:disabled{opacity:.5;cursor:default}
  #herwrap .hxbtn:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
  #herwrap .hxsave{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 22px calc(10px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:12px;z-index:20}
  #herwrap .hxsave .msg{font-size:12.5px;color:var(--mut);flex:1;min-width:0} #herwrap .hxsave .msg.ok{color:var(--sign-tx);font-weight:600} #herwrap .hxsave .msg.bad{color:var(--close-tx)} #herwrap .hxsave .msg.dirty{color:var(--show-tx);font-weight:600}
  #herwrap .hxtip{position:fixed;background:#0e0e0f;color:#fff;font-size:12px;padding:7px 10px;border-radius:8px;max-width:260px;display:none;z-index:30;pointer-events:none}
  #herwrap .hxload-txt{padding:30px;text-align:center;color:var(--mut)}
  #herwrap .hxrank{grid-area:rk}#herwrap .hxnm{grid-area:nm}#herwrap .hxbar{grid-area:br}#herwrap .hxres{grid-area:rs}#herwrap .hxstc{grid-area:sc}
  #herwrap .hxgr{grid-template-areas:'rk nm br rs sc'}
  @media(max-width:1100px){#herwrap .hxgr{grid-template-columns:34px 200px minmax(0,1fr) auto;grid-template-areas:'rk nm br sc' '. rs rs rs'}#herwrap .hxres{justify-content:flex-start}}
  @media(max-width:900px){#herwrap .hxfun{grid-template-columns:repeat(3,minmax(0,1fr))}#herwrap .hxfs:nth-child(n+4){border-top:1px solid var(--line2)}#herwrap .hxfs:nth-child(4){border-left:0}
    #herwrap .hxgr{grid-template-columns:34px minmax(0,1fr) auto;row-gap:8px;grid-template-areas:'rk nm sc' 'br br br' 'rs rs rs'}#herwrap .hxres{justify-content:flex-start;flex-wrap:wrap}
    #herwrap .hxset{margin-left:0}#herwrap table.hxper{font-size:12px;min-width:560px}#herwrap table.hxper th,#herwrap table.hxper td{padding:6px}
    #herwrap .hxstrip .hxauto{margin-left:0}#herwrap .hxsave{padding-left:16px;padding-right:16px}#herwrap .hxsub{padding-left:8px}#herwrap .hxfase{margin-left:8px}}
  `;
  document.head.appendChild(st);
  const main = document.querySelector("main");
  if (main && !document.getElementById("herwrap")) { const w = document.createElement("div"); w.id = "herwrap"; main.appendChild(w); }
})();

// ---- data ----
const hxNum = v => (v === "" || v == null || isNaN(Number(v))) ? NaN : Number(v);
function hxApply(j) {
  HX.inst = {}; for (const g of HX_G) HX.inst[g.id] = { groep: g.id, aan: false, periodes: [], per_dag: 0, doel_type: "pool", doel_n: null, doel_datum: null, auto_bijdraaien: false };
  for (const i of (j.instellingen || [])) if (HX.inst[i.groep]) HX.inst[i.groep] = { ...i, periodes: [...(i.periodes || [])], doel_datum: i.doel_datum ? String(i.doel_datum).slice(0, 10) : null };
  HX.reps = (j.reps || []).map(r => ({ rep: r.rep, max_open: r.max_open, open: r.open || 0 }));
  HX.pool = {}; for (const p of (j.pool || [])) HX.pool[p.groep + "|" + p.periode] = p.n;
  HX.res = j.resultaten || [];
  HX.poolFase = j.pool_fase || [];
  HX.loaded = true; HX.dirty = false;
}
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
    else { if (!GCODE) throw new Error("log eerst in"); j = await hxPost({ code: GCODE, actie: "lezen" }); }
    hxApply(j);
  } catch (e) { HX.err = "Heractivatie niet geladen: " + (e.message || e); }
  HX.laadt = false; hxDraw();
}

// ---- rekenen ----
const hxRes = (g, per, k) => HX.res.filter(r => (!g || r.groep === g) && (!per || r.periode === per)).reduce((s, r) => s + (Number(r[k]) || 0), 0);
const hxResP = (g, pers, poging) => HX.res.filter(r => r.groep === g && pers.includes(r.periode) && Number(r.poging || 1) === poging).reduce((s, r) => s + (Number(r.benaderd) || 0), 0);
const hxPool = (g, per) => HX_PER.filter(p => !per || p[0] === per).reduce((s, p) => s + (HX.pool[g + "|" + p[0]] || 0), 0);
const hxSelPool = g => HX.inst[g].periodes.reduce((s, p) => s + (HX.pool[g + "|" + p] || 0), 0);
const hxOver = g => Math.max(0, hxSelPool(g) - hxResP(g, HX.inst[g].periodes, 1));
const hxPct = (a, b) => b ? (100 * a / b).toFixed(1).replace(".", ",") + "%" : "";
const hxRemmed = () => HX.reps.some(r => r.open > r.max_open);
const hxEff = g => { const i = HX.inst[g]; const s = i.aan ? Math.min(i.per_dag || 0, hxOver(g)) : 0; return hxRemmed() ? Math.floor(s / 2) : s; };
function hxStat(g) {
  const i = HX.inst[g];
  if (!i.aan) return ["uit", "Uit"];
  if (i.doel_type === "intakes" && i.doel_n && hxRes(g, null, "intake") >= i.doel_n) return ["klaar", "Doel bereikt"];
  if (i.doel_type === "shows" && i.doel_n && hxRes(g, null, "show") >= i.doel_n) return ["klaar", "Doel bereikt"];
  if (i.doel_type === "datum" && i.doel_datum && new Date(i.doel_datum + "T23:59") < new Date()) return ["klaar", "Doel bereikt"];
  if (i.periodes.length && hxOver(g) === 0) return ["leeg", "Pool op"];
  if (hxRemmed()) return ["rem", hxEff(g) + " van " + i.per_dag + "/dag"];
  return ["aan", (i.per_dag || 0) + "/dag"];
}
function hxDoelTxt(g) {
  const i = HX.inst[g];
  if (i.doel_type === "intakes") return hxRes(g, null, "intake") + " van " + (i.doel_n || "…") + " intakes";
  if (i.doel_type === "shows") return hxRes(g, null, "show") + " van " + (i.doel_n || "…") + " shows";
  if (i.doel_type === "datum") return "tot " + (i.doel_datum ? new Date(i.doel_datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "…");
  return "tot pool op";
}
const hxPerTxt = g => { const p = HX.inst[g].periodes; return p.length ? HX_PER.filter(x => p.includes(x[0])).map(x => x[1].replace(" d", "")).join(" · ") + " d" : "geen periode"; };
// fase toen (de fase waarin de lead verloren ging): pool uit pool_fase, resultaten uit resultaten.fase_toen; grootste eerst
function hxFases(g, per, k) {
  const m = {};
  if (k === "pool") HX.poolFase.filter(x => x.groep === g && x.periode === per).forEach(x => m[x.fase_toen] = (m[x.fase_toen] || 0) + x.n);
  else HX.res.filter(x => x.groep === g && x.periode === per).forEach(x => { const f = x.fase_toen || "(onbekend)"; m[f] = (m[f] || 0) + (Number(x[k]) || 0); });
  return Object.entries(m).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]);
}
// advies: simpel en vast. <20 benaderd = te weinig data; <5% reactie = helft; ≥15% en pool >50 = +50%; anders laten lopen
function hxAdvies(g) {
  const i = HX.inst[g], ben = hxRes(g, null, "benaderd"), re = hxRes(g, null, "reactie"), pd = i.per_dag || 0;
  if (ben < 20) return { k: "data", t: ben ? `Te weinig data (${ben} van 20 benaderd)` : "Nog niets verstuurd, dus nog geen advies." };
  if (!i.aan) return { k: "data", t: `Staat uit. ${hxPct(re, ben)} reageerde eerder.` };
  if (pd === 0) return { k: "data", t: "Zet eerst een aantal per dag." };
  const pc = re / ben;
  if (pc < 0.05) { const n = Math.max(1, Math.round(pd / 2)); return { k: "terug", n, t: `Schroef terug naar ${n}/dag · ${hxPct(re, ben)} reageert` }; }
  if (pc >= 0.15 && hxPool(g) > 50) { const n = Math.min(200, Math.max(pd + 1, Math.round(pd * 1.5))); return { k: "bij", n, t: `Draai bij naar ${n}/dag · ${hxPct(re, ben)} reageert` }; }
  return { k: "lopen", t: `Laat lopen · ${hxPct(re, ben)} reageert` };
}

// ---- tekenen ----
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
    h += `<div class="hxdrill"><h3>${esc(lbl)} · per groep${per ? " · " + esc(HX_PER.find(p => p[0] === per)[1]) : ""}</h3>`;
    if (k !== "pool" && !ben) h += `<div class="hxleeg">Nog niets verstuurd. Hier zie je straks per groep en per periode wie ${esc(lbl)}.</div>`;
    else h += gs.map(g => {
      const n = k === "pool" ? hxPool(g, per) : hxRes(g, per, k), bg = hxRes(g, per, "benaderd"), op = HX.fGrp === g;
      const p = k === "pool" ? "" : k === "benaderd" ? hxPct(n, hxPool(g, per)) : hxPct(n, bg);
      let r = `<button class="hxdr${op ? " open" : ""}" data-hx="dgrp" data-g="${g}" aria-expanded="${op}"><span class="chev">▶</span><b>${esc(HX_G.find(x => x.id === g).naam)}</b><span class="n">${n}</span><span class="p">${p}</span></button>`;
      if (op) r += `<div class="hxsub">` + HX_PER.filter(pp => !per || pp[0] === per).map(([pk, pl]) => {
        const pn = k === "pool" ? hxPool(g, pk) : hxRes(g, pk, k), po = HX.fPer === pk;
        let x = `<button class="hxdr hxdr2${po ? " open" : ""}" data-hx="dper" data-p="${pk}" aria-expanded="${po}"><span class="chev">▶</span><span>${esc(pl)}</span><span class="n">${pn}</span><span class="p"></span></button>`;
        if (po) { const fs = hxFases(g, pk, k); x += `<div class="hxfase">` + (fs.length ? fs.map(([f, n]) => `<div><span>${esc(f)}</span><b>${n}</b></div>`).join("") : `<div class="hxleeg">${k === "pool" ? "Niemand in deze periode." : "Nog niets verstuurd in deze periode."}</div>`) + `</div>`; }
        return x;
      }).join("") + `</div>`;
      return r;
    }).join("");
    h += `</div>`;
  }
  return h;
}
function hxStripHtml() {
  const act = HX_G.filter(g => ["aan", "rem"].includes(hxStat(g.id)[0]));
  const tot = act.reduce((s, g) => s + hxEff(g.id), 0);
  let exp = 0, heeft = false; act.forEach(g => { const b = hxRes(g.id, null, "benaderd"); if (b > 0) { heeft = true; exp += hxEff(g.id) * hxRes(g.id, null, "reactie") / b; } });
  const auto = HX_G.every(g => HX.inst[g.id].auto_bijdraaien);
  const rem = HX.reps.filter(r => r.open > r.max_open).map(r => esc(r.rep) + " · " + r.open + " open").join(", ");
  return `<div class="hxstrip"><span><b>${act.length}</b><span class="m">groepen aan</span></span><span><b>${tot}</b><span class="m">berichten per dag</span></span>${heeft ? `<span><b>≈${Math.round(exp)}</b><span class="m">reacties verwacht</span></span>` : ""}${rem ? `<span class="hxrem">Geremd: ${rem} · morgen de helft</span>` : ""}`
    + `<label class="hxauto" title="Past elke ochtend het aantal per dag aan volgens het advies per groep. Wordt nu alleen bewaard; werkt pas als de verzending aan staat."><span>Automatisch bijdraaien</span><button class="hxsw" role="switch" aria-checked="${auto}" data-hx="auto" aria-label="Automatisch bijdraaien"></button></label></div>`;
}
function hxPerTable(g) {
  const i = HX.inst[g];
  return `<div class="hxtw"><table class="hxper"><thead><tr><th>Periode</th><th>Pool</th><th>Benaderd</th><th>Reactie</th><th>Intake</th><th>Show</th><th>Getekend</th><th>Stop</th></tr></thead><tbody>` + HX_PER.map(([pk, pl]) => {
    const on = i.periodes.includes(pk), pool = HX.pool[g + "|" + pk] || 0, b = hxRes(g, pk, "benaderd"), re = hxRes(g, pk, "reactie"), inn = hxRes(g, pk, "intake"), sh = hxRes(g, pk, "show"), si = hxRes(g, pk, "getekend"), stp = hxRes(g, pk, "stop");
    return `<tr class="${on ? "" : "off"}"><td><label><input type="checkbox" class="chk" data-hx="per" data-k="${pk}" ${on ? "checked" : ""}>${pl}</label></td><td>${pool}</td><td>${b}${b ? " <small>" + hxPct(b, pool) + "</small>" : ""}</td><td class="${re ? "r" : ""}">${re}${re ? " <small>" + hxPct(re, b) + "</small>" : ""}</td><td class="${inn ? "ok" : ""}">${inn}</td><td class="${sh ? "ok" : ""}">${sh}</td><td class="${si ? "ok" : ""}">${si}</td><td>${stp}</td></tr>`;
  }).join("") + `</tbody></table></div><div class="hxtn">Vinkje = periode doet mee. Nieuwste eerst; het aantal per dag geldt voor de hele groep.</div><div class="hxerr" id="hxe-per-${g}">Kies minstens één periode.</div>`;
}
function hxGroupsHtml() {
  return HX_G.map((G, ix) => {
    const g = G.id, i = HX.inst[g], [sc, sl] = hxStat(g), s = hxSelPool(g), w = n => s ? Math.min(100, Math.round(100 * n / s)) : 0;
    const re = hxRes(g, null, "reactie"), sh = hxRes(g, null, "show"), si = hxRes(g, null, "getekend"), st = hxRes(g, null, "stop"), ball = hxRes(g, null, "benaderd");
    const adv = hxAdvies(g), advKort = (adv.k === "terug" || adv.k === "bij") ? ` · <span class="hxadv">${adv.k === "terug" ? "advies: terug naar " : "advies: bij naar "}${adv.n}/dag</span>` : "";
    const open = HX.open.has(g);
    const doelInp = `<input type="number" min="1" step="1" value="${i.doel_n || ""}" data-hx="n" aria-label="aantal" style="display:${["intakes", "shows"].includes(i.doel_type) ? "inline-block" : "none"}"><input type="date" value="${i.doel_datum || ""}" data-hx="datum" aria-label="datum" style="display:${i.doel_type === "datum" ? "inline-block" : "none"};width:150px">`;
    const advBtn = (adv.k === "terug" || adv.k === "bij") && adv.n !== i.per_dag ? ` <button class="hxbtn" data-hx="toepassen" data-n="${adv.n}">Toepassen</button>` : "";
    return `<div class="hxg${open ? " open" : ""}${i.aan ? "" : " off"}" data-g="${g}">
     <div class="hxgr" tabindex="0" role="button" aria-expanded="${open}" data-hx="toggle">
       <div class="hxrank">${ix + 1}</div>
       <div class="hxnm"><b>${esc(G.naam)}</b><span class="sub">${hxPerTxt(g)} · ${hxDoelTxt(g)}${advKort}</span></div>
       <div class="hxbar" title="${esc(G.def)}" aria-label="${ball} van ${s} benaderd"><i class="p1" style="width:${w(hxResP(g, i.periodes, 1))}%"></i><i class="p2" style="width:${w(hxResP(g, i.periodes, 2))}%"></i><i class="p3" style="width:${w(hxResP(g, i.periodes, 3))}%"></i><em>${s} · nog ${hxOver(g)}</em></div>
       <div class="hxres"><span class="hxpill ${re ? "b" : ""}">${re} reactie${ball ? " · " + hxPct(re, ball) : ""}</span><span class="hxpill ${sh ? "y" : ""}">${sh} show</span><span class="hxpill ${si ? "g" : ""}">${si} getekend</span><span class="hxpill ${st ? "r" : ""}">${st} stop</span></div>
       <div class="hxstc"><span class="hxst ${sc}">${sl}</span><button class="hxsw" role="switch" aria-checked="${i.aan}" aria-label="${esc(G.naam)} aan of uit" data-hx="aan"></button></div>
     </div>
     <div class="hxset">
       <div class="hxadvrow"><span><b>Advies:</b> ${esc(adv.t)}</span>${advBtn}</div>
       <div class="hxsetrow">
        <div class="hxf"><label for="hxpd-${g}">Berichten per dag</label><input type="number" id="hxpd-${g}" min="0" max="200" step="1" value="${i.per_dag ?? 0}" data-hx="perdag"><div class="hxerr" id="hxe-pd-${g}">Heel getal van 1 tot 200.</div></div>
        <div class="hxf"><label for="hxdl-${g}">Aan laten staan</label><div class="hxinl"><select class="hxsel" id="hxdl-${g}" data-hx="doel">${Object.entries(HX_DOEL).map(([k, v]) => `<option value="${k}" ${i.doel_type === k ? "selected" : ""}>${v}</option>`).join("")}</select>${doelInp}</div><div class="hxerr" id="hxe-dl-${g}">Getal boven 0 of een datum in de toekomst.</div></div>
       </div>
       ${hxPerTable(g)}
     </div></div>`;
  }).join("");
}
function hxRepsHtml() {
  if (!HX.reps.length) return `<div class="hxleeg">Geen reps gevonden.</div>`;
  return HX.reps.map((r, ix) => {
    const p = Math.min(100, 100 * r.open / r.max_open), cls = r.open > r.max_open ? "vol" : (r.open >= r.max_open * .75 ? "bijna" : "");
    const st = r.open > r.max_open ? `<span class="hxst rem">Geremd</span>` : cls === "bijna" ? `<span class="hxst klaar">Bijna vol</span>` : `<span class="hxst aan">Ruimte</span>`;
    return `<div class="hxrep ${cls}" data-r="${ix}"><div class="nm"><b>${esc(r.rep)}</b>${st}</div>
     <div class="cap">max open reacties <span class="hxnum"><button data-hx="min" aria-label="minder">−</button><span>${r.max_open}</span><button data-hx="plus" aria-label="meer">+</button></span></div>
     <div class="hxload"><i style="width:${p}%"></i></div><div class="sub">${r.open} open nu · ${r.open > r.max_open ? "morgen de helft" : "ruimte voor " + (r.max_open - r.open)}</div></div>`;
  }).join("");
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
  if (!on) { const t = w.querySelector(".hxtip"); if (t) t.style.display = "none"; return; }
  let h = HERACT_LIVE ? "" : `<div class="hxlive" role="status">Nog niets wordt verstuurd: de verzending staat nog uit.</div>`;
  if (HX.err) h += `<div class="hxcard"><div class="hxleeg">${esc(HX.err)} <button class="hxbtn" data-hx="laad">Opnieuw laden</button></div></div>`;
  if (!HX.loaded) { w.innerHTML = h + (HX.err ? "" : `<div class="hxload-txt">Heractivatie laden…</div>`); return; }
  h += `<div class="hxcard"><div class="hxfil"><label>Toon</label><select data-hx="fgroep" aria-label="groep"><option value="">Alle groepen</option>${HX_G.map(g => `<option value="${g.id}" ${HX.F.groep === g.id ? "selected" : ""}>${esc(g.naam)}</option>`).join("")}</select><select data-hx="fper" aria-label="periode"><option value="">Alle periodes</option>${HX_PER.map(p => `<option value="${p[0]}" ${HX.F.per === p[0] ? "selected" : ""}>${p[1].replace(" d", "")} dagen</option>`).join("")}</select>${HX.F.groep || HX.F.per ? `<button class="hxlink" data-hx="freset">Wis filter</button>` : ""}</div>`
    + `<div id="hxfunnel">${hxFunnelHtml()}</div>${hxStripHtml()}</div>`;
  h += `<div class="hxcard"><h2>Per groep <small>klik op een groep om in te stellen · balk = hoe vaak benaderd</small></h2><div id="hxgroups">${hxGroupsHtml()}</div>`
    + `<div class="hxlegend"><span><i style="background:var(--line2)"></i>nog niet</span><span><i style="background:var(--blue)"></i>1x benaderd</span><span><i style="background:var(--yellow)"></i>2x</span><span><i style="background:var(--pay)"></i>3x (laatste)</span></div></div>`;
  h += `<div class="hxcard"><h2>Capaciteit reps <small>max open reacties per rep · daarboven gaat zijn deel morgen op de helft</small></h2><div class="hxreps" id="hxreps">${hxRepsHtml()}</div></div>`;
  h += `<p class="hxnote">Pool: verloren leads met telefoonnummer, minstens 3 dagen stil, zonder andere open of gewonnen deal, zonder 'not interested'. Dagen stil = sinds de laatste status- of fasewissel. Regels: 60 dagen tussen pogingen, max 3, stop bij reactie of opt-out. Reactie gaat naar de oorspronkelijke eigenaar.</p>`;
  h += `<div class="hxsave">${hxMsgHtml()}<button class="hxbtn main" data-hx="save" ${HX.busy ? "disabled" : ""}>${HX.busy ? "Opslaan…" : "Instellingen opslaan"}</button></div><div class="hxtip" id="hxtip"></div>`;
  w.innerHTML = h;
}
function hxRedrawPart() { // alleen samenvatting bijwerken zonder invoervelden te vervangen
  const w = document.getElementById("herwrap"); if (!w || !HX.loaded) return;
  const f = document.getElementById("hxfunnel"); if (f) f.innerHTML = hxFunnelHtml();
  const s = w.querySelector(".hxstrip"); if (s) s.outerHTML = hxStripHtml();
  const m = document.getElementById("hxmsg"); if (m) m.outerHTML = hxMsgHtml();
}
function hxValidate() {
  let ok = true;
  for (const G of HX_G) {
    const g = G.id, i = HX.inst[g];
    const e = (id, bad) => { const el = document.getElementById(id); if (el) el.classList.toggle("on", bad); if (bad) { ok = false; HX.open.add(g); } };
    e("hxe-per-" + g, i.aan && i.periodes.length === 0);
    e("hxe-pd-" + g, !(Number.isInteger(i.per_dag) && i.per_dag >= 0 && i.per_dag <= 200) || (i.aan && i.per_dag === 0));
    const dbad = ["intakes", "shows"].includes(i.doel_type) ? !(Number.isInteger(i.doel_n) && i.doel_n > 0) : (i.doel_type === "datum" ? !(i.doel_datum && new Date(i.doel_datum) > new Date()) : false);
    e("hxe-dl-" + g, i.aan && dbad);
  }
  return ok;
}
async function hxSave() {
  if (HX.busy) return;
  const okLocal = hxValidate();
  if (!okLocal) { hxDraw(); hxValidate(); HX.msg = { c: "bad", t: "Niet opgeslagen: zie de rode melding bij de groep." }; const m = document.getElementById("hxmsg"); if (m) m.outerHTML = hxMsgHtml(); return; }
  const body = { actie: "opslaan", instellingen: HX_G.map(G => { const i = HX.inst[G.id]; return { groep: G.id, aan: !!i.aan, periodes: i.periodes, per_dag: i.per_dag, doel_type: i.doel_type, doel_n: Number.isInteger(i.doel_n) ? i.doel_n : null, doel_datum: i.doel_type === "datum" ? (i.doel_datum || null) : null, auto_bijdraaien: !!i.auto_bijdraaien }; }), reps: HX.reps.map(r => ({ rep: r.rep, max_open: r.max_open })) };
  HX.busy = true; HX.msg = null; hxDraw();
  try {
    let j;
    if (HX_LOCAL()) { j = { instellingen: body.instellingen, reps: HX.reps, pool: Object.entries(HX.pool).map(([k, n]) => ({ groep: k.split("|")[0], periode: k.split("|")[1], n })), resultaten: HX.res }; }
    else j = await hxPost({ code: GCODE, ...body });
    hxApply(j);
    HX.msg = { c: "ok", t: "Opgeslagen ✓ " + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) + " · er wordt niets verstuurd." };
  } catch (e) { HX.msg = { c: "bad", t: "Niet opgeslagen: " + (e.message || e) }; }
  HX.busy = false; hxDraw();
}
function hxChanged() { HX.dirty = true; HX.msg = null; }

// ---- events (één keer, gedelegeerd) ----
(function () {
  const w = document.getElementById("herwrap"); if (!w) return;
  w.addEventListener("click", ev => {
    const t = ev.target.closest("[data-hx]"); if (!t) return; const a = t.dataset.hx;
    const gEl = ev.target.closest(".hxg"), g = gEl && gEl.dataset.g, i = g && HX.inst[g];
    if (a === "laad") { hxLaad(); return; }
    if (a === "save") { hxSave(); return; }
    if (a === "freset") { HX.F = { groep: "", per: "" }; hxDraw(); return; }
    if (a === "stap") { HX.fStap = HX.fStap === t.dataset.k ? null : t.dataset.k; HX.fGrp = null; HX.fPer = null; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); return; }
    if (a === "dper") { HX.fPer = HX.fPer === t.dataset.p ? null : t.dataset.p; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); return; }
    if (a === "dgrp") { HX.fGrp = HX.fGrp === t.dataset.g ? null : t.dataset.g; HX.fPer = null; document.getElementById("hxfunnel").innerHTML = hxFunnelHtml(); return; }
    if (a === "auto") { ev.preventDefault(); const nv = !HX_G.every(G => HX.inst[G.id].auto_bijdraaien); HX_G.forEach(G => HX.inst[G.id].auto_bijdraaien = nv); hxChanged(); hxRedrawPart(); return; }
    if (a === "aan") { ev.stopPropagation(); i.aan = !i.aan; if (i.aan) HX.open.add(g); hxChanged(); hxDraw(); return; }
    if (a === "toggle") { HX.open.has(g) ? HX.open.delete(g) : HX.open.add(g); hxDraw(); return; }
    if (a === "per") { const k = t.dataset.k; i.periodes = t.checked ? HX_PER.map(p => p[0]).filter(p => p === k || i.periodes.includes(p)) : i.periodes.filter(x => x !== k); hxChanged(); hxDraw(); return; }
    if (a === "toepassen") { i.per_dag = Number(t.dataset.n); hxChanged(); hxDraw(); return; }
    if (a === "min" || a === "plus") { const r = HX.reps[Number(t.closest(".hxrep").dataset.r)]; r.max_open = a === "plus" ? Math.min(50, r.max_open + 1) : Math.max(1, r.max_open - 1); hxChanged(); document.getElementById("hxreps").innerHTML = hxRepsHtml(); hxRedrawPart(); return; }
  });
  w.addEventListener("keydown", ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.dataset && ev.target.dataset.hx === "toggle") { ev.preventDefault(); ev.target.click(); } });
  w.addEventListener("change", ev => {
    const t = ev.target, a = t.dataset && t.dataset.hx; if (!a) return;
    if (a === "fgroep") { HX.F.groep = t.value; HX.fGrp = null; hxDraw(); return; }
    if (a === "fper") { HX.F.per = t.value; hxDraw(); return; }
    if (a === "doel") { const g = t.closest(".hxg").dataset.g; HX.inst[g].doel_type = t.value; hxChanged(); hxDraw(); return; }
  });
  w.addEventListener("input", ev => {
    const t = ev.target, a = t.dataset && t.dataset.hx; if (!a || !["perdag", "n", "datum"].includes(a)) return;
    const row = t.closest(".hxg"), g = row.dataset.g, i = HX.inst[g];
    if (a === "perdag") i.per_dag = hxNum(t.value); if (a === "n") i.doel_n = hxNum(t.value); if (a === "datum") i.doel_datum = t.value || null;
    hxChanged();
    const [sc, sl] = hxStat(g); row.querySelector(".hxnm .sub").textContent = hxPerTxt(g) + " · " + hxDoelTxt(g);
    const st = row.querySelector(".hxst"); st.className = "hxst " + sc; st.textContent = sl; hxRedrawPart();
  });
  const TIPS = { uit: "Staat uit. Niets wordt verstuurd.", aan: "Staat aan. Zodra de verzending loopt: elke werkdag, stopt vanzelf bij het doel of als de pool op is.", rem: "Een rep zit boven zijn max open reacties. Morgen gaat de helft uit, daarna weer normaal.", klaar: "Doel gehaald. Start niet vanzelf opnieuw; zet een nieuw doel.", leeg: "Iedereen in de gekozen periodes is benaderd. Vink een extra periode aan of wacht op ronde 2 (na 60 dagen)." };
  w.addEventListener("mouseover", e => { const el = e.target.closest(".hxgr .hxst"); const tip = document.getElementById("hxtip"); if (!el || !tip) return; const c = [...el.classList].find(x => TIPS[x]); if (!c) return; tip.textContent = TIPS[c]; tip.style.display = "block"; const r = el.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(r.left, innerWidth - 280)) + "px"; tip.style.top = (r.bottom + 6) + "px"; });
  w.addEventListener("mouseout", e => { const tip = document.getElementById("hxtip"); if (tip && e.target.closest(".hxgr .hxst")) tip.style.display = "none"; });
})();

// ---- inhaken op de motor: tab na Verloren, eigen tekenvlak ----
const _hxTabs = drawTabs;
drawTabs = function () {
  _hxTabs.apply(this, arguments);
  const el = document.getElementById("tabs"); if (!el || el.querySelector("[data-hxtab]")) return;
  const t = document.createElement("div"); t.className = "tab" + (tab === "her" ? " on" : ""); t.dataset.hxtab = "1"; t.textContent = "♻️ Heractivatie";
  t.title = "WhatsApp-heractivatie van verloren leads: per groep aan/uit, periodes en aantal per dag";
  t.onclick = () => { tab = "her"; sel = null; render(); };
  const after = [...el.querySelectorAll(".tab")].find(x => /Verloren/.test(x.textContent));
  if (after && after.nextSibling) el.insertBefore(t, after.nextSibling); else el.appendChild(t);
  if (tab === "her") el.querySelectorAll(".tab.on").forEach(x => { if (x !== t) x.classList.remove("on"); });
};
const _hxCols = drawCols;
drawCols = function () {
  if (typeof tab !== "undefined" && tab === "her") { hxDraw(); if (!HX.loaded && !HX.laadt && !HX.err) hxLaad(); return; }
  document.body.classList.remove("hx-on");
  _hxCols.apply(this, arguments);
};
