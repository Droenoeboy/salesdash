/* Small pure policies; source metadata stays on the original advice object. */
(function(root){
  'use strict';
  function qualityAlarm(leads,a,b){
    var rows=leads.filter(function(l){return !l.party&&l.cd>=a&&l.cd<=b;});
    if(!rows.length)return null;
    var hard=rows.filter(function(l){return l.hard===true;}).length*100/rows.length;
    if(hard>=85)return null;
    var soft=rows.filter(function(l){return !l.hard;});
    var missing=soft.filter(function(l){return !l.campaign_id;}).length;
    var action=missing?'Controleer bij de '+missing+' leads zonder campagne-id de bronvelden en de overdracht naar het CRM.':'Vergelijk bij de '+soft.length+' zacht toegewezen leads de opgeslagen bronvelden met de advertentie-id’s en herstel alleen bewezen foutieve koppelingen.';
    return {hard:hard,total:rows.length,soft:soft.length,text:action+' De harde marketingtoewijzing ligt onder 85%; de oorzaak is nog niet vastgesteld.'};
  }
  // Missing requires an explicit backend reconciliation across BOTH custom brands.
  function formState(lead){
    var e=lead.form_evidence||{};
    if(e.status==='present'||lead.signed_via==='formulier')return 'present';
    if(e.status==='missing'&&['ghl','custom_dpac','custom_asm'].every(function(s){return (e.checked_sources||[]).indexOf(s)>=0;}))return 'missing';
    return 'unknown';
  }
  root.AdvicePolicy={qualityAlarm:qualityAlarm,formState:formState};
})(typeof globalThis!=='undefined'?globalThis:this);
