// v3 · 🤖 Sales-AI-adviseur (1 okt 2026, Hermes). Laag bovenop engine_a/b, app.js en clean.js; uit te zetten door dit script uit index.html te halen.
// Zelfde patroon als marketing: 🤖 knop (AI-wachtwoord) → n8n workflow 22 (Claude) → pollen tot het nieuwe advies er is.
// Per advies: afvinken, opmerking, 📨 naar Django (Slack-DM via de bot). Vinkjes en opmerkingen staan in Supabase (dpac.sales_followups),
// zodat Abel en Django hetzelfde zien en de AI ze bij de volgende run leest. Het bestaande rekenadvies van de motor blijft eronder staan.
const SAI_URL = "https://dpac.app.n8n.cloud/webhook/dpac-sales-ai-adviseur";
const SAI_DATA = "https://dpac.app.n8n.cloud/webhook/dpac-sales-ai-data";
const SAI_MODEL = ["Claude Fable 5.1", "± 4 minuten"];
const SAI_LOCAL = () => location.search.indexOf("local=1") >= 0;
let SAI = { adv: null, fout: null, fol: {}, busy: false, err: null, open: new Set(), doneOpen: false, loaded: false, laadt: false };
const SAI_ACT = { sneller_bellen: "sneller bellen", vaker_proberen: "vaker proberen", eerder_inplannen: "eerder inplannen", bevestigen: "bevestigen", herplannen: "herplannen", opvolgen: "opvolgen", betaling_najagen: "betaling najagen", gesprek_coachen: "gesprek coachen", herverdelen: "herverdelen", uitbreiden: "uitbreiden", leadkwaliteit: "leadkwaliteit", uitzoeken: "uitzoeken" };
const SAI_KANT = { sales: "sales", marketing: "marketing", abel: "Abel beslist" };

(function () {
  const st = document.createElement("style"); st.id = "saicss";
  st.textContent = `
  #saiwrap{display:none;margin:0 0 20px}
  .saibar{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 8px}
  .saibtn{font:inherit;font-size:14px;font-weight:700;padding:10px 16px;border-radius:var(--radius);border:1px solid var(--line);background:var(--card);color:var(--txt);cursor:pointer;transition:border-color .15s,background .15s,opacity .15s}
  .saibtn:hover{border-color:var(--mut2)} .saibtn.pri{background:var(--txt);color:var(--card);border-color:var(--txt)} .saibtn.pri:hover{opacity:.85} .saibtn:disabled{opacity:.5;cursor:default}
  .saisub{text-align:center;font-size:12px;color:var(--mut);margin:0 0 12px}
  .saisum{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 16px;margin:0 0 8px;font-size:14px;line-height:1.45}
  .saierr{color:var(--close-tx);font-size:13px;margin:0 0 8px;text-align:center}
  .saibusy{font-size:13px;color:var(--mut);text-align:center;margin:0 0 12px} .saibusy i{display:block;height:4px;border-radius:2px;background:var(--line);overflow:hidden;margin:0 auto 6px;max-width:320px;position:relative}
  .saibusy i:before{content:'';position:absolute;left:-40%;width:40%;height:100%;background:var(--txt);animation:saib 1.4s ease-in-out infinite} @keyframes saib{to{left:100%}}
  .sairows{display:flex;flex-direction:column;gap:8px}
  .sairow{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;transition:border-color .15s}
  .sairow{border-left:5px solid var(--line)} .sairow.hi{border-left-color:#e04b4b} .sairow.mid{border-left-color:#e08a00} .sairow.lo{border-left-color:#c9b94a} .sairow.eig{border-left-color:#8e8e93}
  .sairow:hover{border-top-color:var(--mut2);border-right-color:var(--mut2);border-bottom-color:var(--mut2)} .sairow.vast{background:transparent}
  .sairow .hd{display:flex;align-items:center;gap:10px;min-width:0;cursor:pointer}
  .sairow .nr{font-size:12px;color:var(--mut);min-width:16px;text-align:right;font-variant-numeric:tabular-nums}
  .sairow input[type=checkbox]{width:20px;height:20px;flex:none;cursor:pointer;accent-color:var(--green);margin:0}
  .sairow .tt{flex:1 1 auto;min-width:0} .sairow .tt b{font-size:14px;display:block} .sairow .tt span{font-size:12px;color:var(--mut)}
  .sairow .eur{font-weight:700;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;font-size:14px}
  .sairow .eur small{display:block;font-size:10.5px;font-weight:500;color:var(--mut)}
  .sairow .chev{flex:none}
  .sairow.af{opacity:.75} .sairow.af .tt b{text-decoration:line-through;color:var(--mut)}
  .sairow .tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid var(--line);color:var(--mut);margin-right:4px}
  .sairow .tag.sent{border-color:var(--plan);color:var(--plan-tx)} .sairow .tag.ok{border-color:var(--green);color:var(--sign-tx)}
  .sairow .bd{margin:10px 0 2px 46px;font-size:13.5px;line-height:1.5}
  .sairow .bd p{margin:0 0 8px} .sairow .bd .doen{font-weight:600} .sairow .bd .lb{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;font-weight:600;display:block}
  .sairow .bd .ai{color:var(--mut)}
  .sairow .acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px}
  .sairow .acts input{font:inherit;font-size:13px;flex:1 1 220px;min-width:0;padding:8px 10px;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg);color:var(--txt)}
  .sairow .acts button{font:inherit;font-size:13px;font-weight:600;padding:8px 12px;border-radius:var(--radius);border:1px solid var(--line);background:var(--card);color:var(--txt);cursor:pointer;transition:border-color .15s}
  .sairow .acts button:hover{border-color:var(--mut2)}
  .saidone{font-size:13px;color:var(--mut);margin:10px 2px 0;cursor:pointer;display:flex;align-items:center;gap:6px} .saidone:hover{color:var(--txt)}
  .saiempty{text-align:center;color:var(--mut);font-size:13px;padding:8px}
  .saisep{font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin:18px 2px 8px;text-align:center}
  #saimodal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}
  #saimodal .box{background:var(--card);color:var(--txt);border-radius:var(--radius);padding:16px;width:min(520px,100%);max-height:86vh;overflow:auto;box-shadow:var(--shadow)}
  #saimodal .mh{display:flex;align-items:center;margin:0 0 10px} #saimodal .mh b{font-size:15px} #saimodal .mh span{margin-left:auto;cursor:pointer;color:var(--mut);font-size:13px}
  #saimodal input,#saimodal textarea{font:inherit;font-size:14px;width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--line);border-radius:var(--radius);background:var(--bg);color:var(--txt)}
  #saimodal textarea{min-height:240px;font-size:13px;line-height:1.45}
  #saimodal .mf{display:flex;justify-content:flex-end;gap:8px;margin-top:10px;align-items:center} #saimodal .mf .msg{margin-right:auto;font-size:12.5px;color:var(--close-tx)}
  @media(max-width:640px){.sairow .bd{margin-left:0}.sairow .nr{display:none}.saibtn{flex:1 1 auto}}
  `;
  document.head.appendChild(st);
  const aw = document.getElementById("advwrap"); if (aw) { const d = document.createElement("div"); d.id = "saiwrap"; aw.parentNode.insertBefore(d, aw); }
  const m = document.createElement("div"); m.id = "saimodal"; m.onclick = saiClose; document.body.appendChild(m);
})();

// ---- sleutels en status ----
const saiKey = a => "ai|" + (a.ref && /^v:/.test(a.ref) ? a.ref : (a.persoon || a.campagne || "") + "|" + (a.stap || "") + "|" + (a.titel || ""));
let SAI_LS = {}; try { SAI_LS = JSON.parse(localStorage.dpacSalesAiFol || "{}"); } catch (e) { SAI_LS = {}; }
function saiSaveLocal() { try { localStorage.dpacSalesAiFol = JSON.stringify(SAI_LS); } catch (e) {} }
function saiFol(k) { const s = SAI.fol[k] || {}, l = SAI_LS[k] || {}; return (l.upd || 0) > (Date.parse(s.updated_at) || 0) ? { ...s, ...l } : { ...l, ...s, done: !!s.done, note: s.note || "" }; }
const saiRunAt = () => SAI.adv && SAI.adv.run_at ? Date.parse(SAI.adv.run_at) : 0;
// afgevinkt telt alleen als het ná de laatste AI-run gebeurde: blijft een advies staan (🔁), dan staat het weer open
function saiDone(a) { const F = saiFol(saiKey(a)); if (!F.done) return false; const t = Date.parse(F.done_at) || F.ts || 0; return t >= saiRunAt() || !saiRunAt(); }

// ---- data ----
async function saiPost(url, body) { const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) }); const j = await r.json().catch(() => null); return { r, j }; }
async function saiLaad(force) {
  if (SAI.laadt || (SAI.loaded && !force)) return; SAI.laadt = true;
  try {
    let j;
    if (SAI_LOCAL()) j = await (await fetch("sales_ai_demo.json")).json();
    else { if (!GCODE) { SAI.laadt = false; return; } const x = await saiPost(SAI_DATA, { code: GCODE, action: "get" }); if (!x.r.ok || !x.j || !x.j.ok) throw new Error("laden mislukt (" + x.r.status + ")"); j = x.j; }
    SAI.adv = j.ai_advice || null; SAI.fout = j.laatste_fout || null; SAI.fol = {}; for (const f of j.followups || []) SAI.fol[f.key] = f; SAI.loaded = true; SAI.err = null;
  } catch (e) { SAI.err = /fetch|laden mislukt \(404\)/i.test(e.message || "") ? "AI-advies nog niet aangesloten (n8n-workflow 22 ontbreekt)." : "AI-advies niet geladen: " + (e.message || e); }
  SAI.laadt = false; saiDraw();
}
let SAI_Q = new Set(), SAI_T = null;
function saiSync(k) { SAI_Q.add(k); if (SAI_T) clearTimeout(SAI_T); SAI_T = setTimeout(saiFlush, 800); }
async function saiFlush() { SAI_T = null; if (SAI_LOCAL() || !GCODE || !SAI_Q.size) { SAI_Q.clear(); return; } const keys = [...SAI_Q]; SAI_Q.clear();
  const byK = new Map(saiList().map(a => [saiKey(a), a]));
  const items = keys.map(k => { const F = saiFol(k), a = byK.get(k) || {}; return { key: k, titel: a.titel || null, persoon: a.persoon || null, kant: a.kant || null, done: !!F.done, done_at: F.done ? (F.done_at || new Date(F.ts || Date.now()).toISOString()) : null, note: F.note || "" }; });
  try { const x = await saiPost(SAI_DATA, { code: GCODE, action: "sync", items }); if (!x.r.ok || !x.j || !x.j.ok) throw 0; for (const it of items) SAI.fol[it.key] = { ...(SAI.fol[it.key] || {}), ...it, updated_at: new Date().toISOString() }; }
  catch (e) { keys.forEach(k => SAI_Q.add(k)); SAI_T = setTimeout(saiFlush, 15000); } }

// ---- acties ----
function saiCheck(k, on) { SAI_LS[k] = { ...(SAI_LS[k] || {}), done: !!on, done_at: on ? new Date().toISOString() : null, ts: Date.now(), upd: Date.now(), note: saiFol(k).note || "" }; saiSaveLocal(); saiSync(k); saiDraw(); }
function saiNote(k, v) { SAI_LS[k] = { ...(SAI_LS[k] || {}), ...saiFol(k), note: String(v || "").trim(), upd: Date.now() }; saiSaveLocal(); saiSync(k); saiDraw(); }
function saiTog(k) { SAI.open.has(k) ? SAI.open.delete(k) : SAI.open.add(k); saiDraw(); }
function saiList() { return SAI.adv && SAI.adv.advice && Array.isArray(SAI.adv.advice.adviezen) ? SAI.adv.advice.adviezen : []; }
function saiClose() { const m = document.getElementById("saimodal"); if (m) { m.style.display = "none"; m.innerHTML = ""; } }

// 🤖: wachtwoord → workflow 22 start → pollen
const SAI_KOST = "± € 0,10 per keer (schatting, Claude-kosten)";
function saiDoorlopen() {
  if (SAI.busy) return; SAI.err = null;
  if (SAI_LOCAL()) { SAI.busy = true; saiDraw(); setTimeout(() => { SAI.busy = false; if (SAI.adv) SAI.adv.run_at = new Date().toISOString(); saiDraw(); }, 900); return; }
  const m = document.getElementById("saimodal");
  m.innerHTML = `<div class="box" style="width:min(380px,100%)" onclick="event.stopPropagation()"><div class="mh"><b>🤖 Adviezen ophalen</b><span onclick="saiClose()">sluiten ✕</span></div>
    <p style="font-size:12.5px;color:var(--mut);margin:0 0 10px">Dit kost geld: de AI leest alle cijfers en schrijft nieuw advies. Kosten ${SAI_KOST}.</p>
    <input id="saiww" type="password" autocomplete="off" placeholder="AI-wachtwoord" onkeydown="if(event.key==='Enter')saiStart(this.value)">
    <div class="mf"><span class="msg" id="saiwwfout"></span><button class="saibtn pri" id="saistart" onclick="saiStart(document.getElementById('saiww').value)">Ja, ophalen</button></div></div>`;
  m.style.display = "flex"; setTimeout(() => { const i = document.getElementById("saiww"); if (i) i.focus(); }, 30);
}
async function saiStart(ww) {
  ww = String(ww || "").trim(); const f = document.getElementById("saiwwfout"), b = document.getElementById("saistart"); if (!ww || (b && b.disabled)) return; if (f) f.textContent = ""; if (b) b.disabled = true;
  await saiFlush();
  let x = null; try { x = await saiPost(SAI_URL, { code: GCODE, ww, model: "fable" }); } catch (e) {}
  if (!x) { if (f) f.textContent = "geen verbinding"; if (b) b.disabled = false; return; }
  if (x.r.status === 401) { if (f) f.textContent = "wachtwoord klopt niet"; if (b) b.disabled = false; return; }
  if (!x.r.ok || !x.j || !x.j.ok) { if (f) f.textContent = "starten mislukt (" + ((x.j && x.j.error) || x.r.status) + ")"; if (b) b.disabled = false; return; }
  saiClose(); SAI.busy = true; saiDraw();
  const before = saiRunAt(), t0 = Date.now();
  try {
    for (let i = 0; i < 48; i++) { await new Promise(r => setTimeout(r, 15000)); SAI.loaded = false; await saiLaad(true);
      if (saiRunAt() > before) break; if (SAI.fout && Date.parse(SAI.fout.run_at) > t0 - 5000) throw new Error("de AI gaf geen bruikbaar antwoord: " + (SAI.fout.error || "onbekend")); if (i === 47) throw new Error("nog geen nieuw advies na 12 minuten; kijk later nog eens"); }
  } catch (e) { SAI.err = e.message || "doorlopen mislukt"; }
  SAI.busy = false; saiDraw();
}

// 📨 naar Django: voorbeeld tonen, aanpassen, versturen (Slack-DM via de bot)
function saiTekst(ls) {
  const eur = v => v ? " (circa € " + Math.round(v).toLocaleString("nl-NL") + " per maand)" : "";
  const regels = ls.map((a, i) => { const F = saiFol(saiKey(a));
    return `*${i + 1}. ${a.titel}*${a.persoon ? " · " + a.persoon : a.campagne ? " · " + a.campagne : ""}${eur(a.euro_per_maand)}\n👉 ${a.doen || ""}${a.meetpunt && a.meetpunt.criterium ? "\n📏 " + a.meetpunt.criterium + (a.meetpunt.datum ? " (" + a.meetpunt.datum + ")" : "") : ""}${F.note ? "\n📝 " + F.note : ""}`; });
  return "Hoi Django 👋 " + (ls.length === 1 ? "Een advies" : ls.length + " adviezen") + " uit het salesdashboard om op te pakken:\n\n" + regels.join("\n\n") + "\n\nVink het af in het dashboard (⚡ Advies) als het gedaan is: https://droenoeboy.github.io/salesdash/v3/";
}
let SAI_SEND = [];
function saiNaarDjango(k) {
  const open = saiList().filter(a => !saiDone(a)); const ls = k ? saiList().filter(a => saiKey(a) === k) : open; if (!ls.length) return; SAI_SEND = ls;
  const m = document.getElementById("saimodal");
  m.innerHTML = `<div class="box" onclick="event.stopPropagation()"><div class="mh"><b>📨 Naar Django · ${ls.length}</b><span onclick="saiClose()">sluiten ✕</span></div>
    <textarea id="saitxt">${esc(saiTekst(ls))}</textarea>
    <div class="mf"><span class="msg" id="saisendmsg"></span><button class="saibtn" onclick="saiClose()">Annuleer</button><button class="saibtn pri" id="saisendbtn" onclick="saiVerstuur()">Verstuur</button></div></div>`;
  m.style.display = "flex";
}
async function saiVerstuur() {
  const b = document.getElementById("saisendbtn"), msg = document.getElementById("saisendmsg"); if (b.disabled) return; b.disabled = true; msg.textContent = "";
  const text = document.getElementById("saitxt").value; const items = SAI_SEND.map(a => ({ key: saiKey(a), titel: a.titel, persoon: a.persoon || null, kant: a.kant || null }));
  if (SAI_LOCAL()) { items.forEach(it => { SAI.fol[it.key] = { ...(SAI.fol[it.key] || {}), sent_at: new Date().toISOString() }; }); saiClose(); saiDraw(); return; }
  try { const x = await saiPost(SAI_DATA, { code: GCODE, action: "send", items, text }); if (!x.r.ok || !x.j || !x.j.ok) throw new Error(String(x.r.status));
    items.forEach(it => { SAI.fol[it.key] = { ...(SAI.fol[it.key] || {}), sent_at: new Date().toISOString() }; }); saiClose(); saiDraw(); }
  catch (e) { msg.textContent = "versturen mislukt (" + (e.message || e) + ")"; b.disabled = false; }
}

// ---- tekenen ----
function saiWhen(s) { const t = Date.parse(s); if (!t) return "nog nooit"; const d = new Date(t); const dag = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
  return (dag === 0 ? "vandaag" : dag === 1 ? "gisteren" : d.getDate() + "-" + (d.getMonth() + 1)) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
// eerste zin, zonder haakjes-uitleg, max n tekens
function saiZin(t, n = 140) { t = String(t || "").replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim(); const m = t.match(/^.+?[.!?](\s|$)/); t = (m ? m[0] : t).trim(); return t.length > n ? t.slice(0, n - 1).replace(/[\s,;:]+\S*$/, "") + "…" : t; }
function saiRow(a, i, cls) {
  const k = saiKey(a), F = saiFol(k), af = saiDone(a), opn = SAI.open.has(k), jk = JSON.stringify(k).replace(/"/g, "&quot;");
  const wie = a.persoon || (a.campagne ? a.campagne + (a.adset ? " › " + a.adset : "") : "team");
  const sent = F.sent_at ? `<span class="tag sent" title="doorgestuurd naar Django">📨 ${saiWhen(F.sent_at)}</span>` : "";
  const sub = `${a.vast_punt ? '<span class="tag">vast punt</span>' : ""}${a.ref && !a.vast_punt ? '<span class="tag" title="stond er vorige keer ook">🔁</span>' : ""}${sent}${esc(wie)}`;
  let h = `<div class="sairow ${cls || ""}${af ? " af" : ""}${a.vast_punt ? " vast" : ""}"><div class="hd" onclick="saiTog(${jk})">`
    + `<span class="nr">${i + 1}</span><input type="checkbox" ${af ? "checked" : ""} title="afvinken: gedaan" onclick="event.stopPropagation();saiCheck(${jk},this.checked)">`
    + `<span class="tt"><b>${esc(a.titel || "")}</b><span>${sub}</span></span>`
    + `<span class="eur">${a.euro_per_maand ? "€ " + Math.round(a.euro_per_maand).toLocaleString("nl-NL") + "<small>per maand</small>" : ""}</span><i class="chev${opn ? " open" : ""}"></i></div>`;
  if (af && !opn) h += `<div class="acts" style="margin:8px 0 0 46px"><input placeholder="Opmerking (bijv. anders gedaan, en waarom)" value="${esc(F.note || "")}" onclick="event.stopPropagation()" onchange="saiNote(${jk},this.value)" onkeydown="if(event.key==='Enter')this.blur()"></div>`;
  // kort, zoals marketing: één zin wat te doen + één regel toets; waarom/verwacht weg (te lang)
  if (opn) h += `<div class="bd">`
    + (a.doen ? `<p class="doen">👉 ${esc(saiZin(a.doen))}</p>` : "")
    + (a.meetpunt && a.meetpunt.criterium ? `<p class="ai">Toets${a.meetpunt.datum ? " " + esc(a.meetpunt.datum) : ""}: ${esc(saiZin(a.meetpunt.criterium, 110))}</p>` : "")
    + (a.reactie ? `<p class="ai">🔁 ${esc(saiZin(a.reactie, 110))}</p>` : "")
    + `<div class="acts"><input placeholder="Opmerking (bijv. anders gedaan, en waarom)" value="${esc(F.note || "")}" onchange="saiNote(${jk},this.value)"><button onclick="saiNaarDjango(${jk})">📨 Naar Django</button></div></div>`;
  return h + `</div>`;
}
function saiDraw() {
  const w = document.getElementById("saiwrap"); if (!w) return;
  if (typeof tab === "undefined" || tab !== "adv") { w.style.display = "none"; return; }
  w.style.display = "block";
  const ls = saiList(); const todo = ls.map((a, i) => ({ a, i })).filter(x => !saiDone(x.a)); const gedaan = ls.filter(a => saiDone(a));
  const run = SAI.adv ? saiWhen(SAI.adv.run_at) : "nog nooit";
  const tAi = `De AI (${SAI_MODEL[0]}) loopt alle salescijfers door als sales manager: grootste lek eerst, met naam en rekensom. Leest jullie vinkjes en opmerkingen mee: gedaan vervalt, blijvend krijgt 🔁. Duurt ${SAI_MODEL[1]}, vraagt het AI-wachtwoord en kost ${SAI_KOST}.`;
  let h = `<div class="saibar"><button class="saibtn pri" onclick="saiDoorlopen()" title="${esc(tAi)}" ${SAI.busy ? "disabled" : ""}>${SAI.busy ? "⏳ Bezig…" : "🤖 Adviezen ophalen"}</button>`
    + `<button class="saibtn" onclick="saiNaarDjango()" ${todo.length ? "" : "disabled"} title="Alle open adviezen als bericht naar Django (Slack). Je ziet eerst het bericht.">📨 Open adviezen naar Django</button></div>`
    + `<div class="saisub">AI-advies · laatste run ${esc(run)}${todo.length ? " · " + todo.length + " open" : ""}</div>`;
  if (SAI.busy) h += `<div class="saibusy"><i></i>De AI loopt de cijfers door. ${SAI_MODEL[1]}; je kunt gewoon verder werken.</div>`;
  if (SAI.err) h += `<div class="saierr">${esc(SAI.err)}</div>`;
  if (SAI.adv && SAI.adv.advice && SAI.adv.advice.samenvatting) h += `<div class="saisum">${esc(SAI.adv.advice.samenvatting)}</div>`;
  if (!SAI.loaded && SAI.laadt) h += `<div class="saiempty">AI-advies laden…</div>`;
  // zoals marketing: afgevinkt blijft op zijn plek staan (doorgestreept, terug te klikken) tot de volgende AI-run; daarna vervalt het
  else if (SAI.loaded) h += `<div class="sairows">` + (ls.length ? (() => { let ri = 0; return ls.map((a, i) => { const grijs = a.vast_punt || saiDone(a); const c = grijs ? "eig" : ri < 3 ? "hi" : ri < 6 ? "mid" : "lo"; if (!grijs) ri++; return saiRow(a, i, c); }).join(""); })() : `<div class="saiempty">Nog geen AI-advies. Druk op 🤖.</div>`) + `</div>`
    + (gedaan.length ? `<div class="saiempty" style="text-align:left;padding:8px 2px 0">Afgevinkt · ${gedaan.length} · blijft staan tot de volgende AI-run; klik het vinkje weg om terug te zetten.</div>` : "");
  h += `<div class="saisep">Rekenadvies van het dashboard</div>`;
  w.innerHTML = h;
}
// inhaken op de motor: na elke render het AI-blok tonen of verbergen, en de eerste keer laden
const _saiCols = drawCols;
drawCols = function () { _saiCols.apply(this, arguments); saiDraw(); if (typeof tab !== "undefined" && tab === "adv" && !SAI.loaded) saiLaad(); };
