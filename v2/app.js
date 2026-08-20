// DPAC Sales Dashboard v2 — loader: laadt de twee scriptdelen na elkaar (app_a = kern, app_b = analyses)
(function(){
  var V='29';
  function ld(src,cb){ var e=document.createElement('script'); e.src=src+'?v='+V; e.async=false; if(cb) e.onload=cb; e.onerror=function(){ var g=document.getElementById('gfout'); if(g) g.textContent='Laden van '+src+' mislukt — ververs de pagina.'; }; document.head.appendChild(e); }
  ld('app_a.js', function(){ ld('app_b.js'); });
})();
