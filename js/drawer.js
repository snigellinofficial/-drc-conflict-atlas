/* =====================================================================
   DRAWER — 次级弹窗（事件详情 + 行为体档案）· 弹窗栈 + 返回按钮
   ===================================================================== */
let currentIncident=null;

function openDrawer(id){
  var inc=INCIDENTS.find(function(d){return d.id===id;});
  if(!inc)return;
  currentIncident=inc;
  window.currentDrawerIncident=inc;
  var loc=localizeEvent(inc);
  var tc=CONFLICT_TYPES[inc.type];
  var sc=SEVERITY_LEVELS[inc.severity];
  var typeName=getConflictTypeName(inc.type);
  var sevName=getSeverityName(inc.severity);
  var provName=getProvinceDisplayName(inc.province);
  var provEn=DRC_PROVINCES[inc.province]?DRC_PROVINCES[inc.province].en:inc.province||"";
  var fatalityText=(inc.fatalities||inc.fatalities===0)?inc.fatalities:(LANG==='zh'?'未知':'Unknown');
  var verifiedLabel=inc.verified?t('drawer.verified'):t('drawer.unverified');
  var verifiedColor=inc.verified?'var(--green)':'var(--orange)';
  var verifiedSource=inc.verified?(LANG==='zh'?'已验证数据 / Verified':'Verified data'):(LANG==='zh'?'待交叉验证 / Unverified':'Unverified / Pending');
  var sourceUrlLabel=LANG==='zh'?'原始数据 / Source':'Source';
  var profileLabel=t('drawer.profile');
  var severityTitle=LANG==='zh'?'严重':'Severity';
  var assessmentCritical=LANG==='zh'?'该事件可能导致刚果(金)东部安全形势进一步恶化，建议密切关注关联地区动态及国际反应。':'This incident may further deteriorate the security situation in eastern DRC. Close monitoring of related regional dynamics and international responses is advised.';
  var assessmentStandard=LANG==='zh'?'该事件在东部冲突格局中具有重要情报价值，建议持续跟踪后续发展。':'This incident holds significant intelligence value within the eastern DRC conflict landscape. Continued tracking of subsequent developments is recommended.';
  var assessmentNote=LANG==='zh'?'注：上述评估仅基于公开数据库的信息汇总，不构成独立安全分析或预测。':'Note: The above assessment is based solely on publicly available data aggregation and does not constitute independent security analysis or prediction.';
  var cityText=inc.city||'';

  var titleHtml=loc.title;
  var bodyHtml=
    '<div class="sp-section">'+
      '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">'+
        '<span class="sp-badge" style="background:'+tc.color+';color:#fff;">'+typeName+'</span>'+
        '<span class="sp-badge" style="background:'+sc.color+';color:#fff;">'+severityTitle+': '+sevName+'</span>'+
        '<span class="sp-badge" style="background:'+verifiedColor+';color:#fff;">'+verifiedLabel+'</span>'+
      '</div>'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--ink3);margin-bottom:14px;">'+
        '<span>'+cityText+(cityText?' &middot; ':'')+
        '<a class="sp-link" onclick="event.stopPropagation();showProvinceSummary(\''+inc.province+'\')">'+(LANG==='zh'?provName+'('+provEn+')':provEn+' ('+provName+')')+'</a></span>'+
        '<span>'+inc.date+'</span>'+
        '<span>'+inc.actor1+' vs '+inc.actor2+'</span>'+
      '</div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('drawer.desc')+'</h4>'+
      '<div class="sp-text"><p>'+loc.desc+'</p></div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('drawer.casualty')+'</h4>'+
      '<table class="sp-table">'+
        '<tr><th style="width:100px;">'+t('drawer.metric')+'</th><th>'+t('drawer.value')+'</th></tr>'+
        '<tr><td>'+t('drawer.fatalities')+'</td><td style="color:var(--red);font-weight:700;">'+fatalityText+'</td></tr>'+
        '<tr><td>'+t('drawer.type')+'</td><td style="color:'+tc.color+';">'+typeName+'</td></tr>'+
        '<tr><td>'+t('drawer.severity')+'</td><td style="color:'+sc.color+';">'+sevName+'</td></tr>'+
        '<tr><td>'+t('drawer.province')+'</td><td><a class="sp-link" onclick="showProvinceSummary(\''+inc.province+'\')">'+(LANG==='zh'?provName+' / '+provEn:provEn+' / '+provName)+'</a></td></tr>'+
        '<tr><td>'+t('drawer.actor1')+'</td><td><a class="sp-link" onclick="filterByActor(\''+inc.actor1.replace(/'/g,"\\'")+'\')">'+inc.actor1+'</a> '+(ACTOR_PROFILES[inc.actor1]?'<a href="javascript:window.showActorBrief(\''+inc.actor1+'\')" style="color:var(--accent);font-size:10px;">'+profileLabel+'</a>':'')+'</td></tr>'+
        '<tr><td>'+t('drawer.actor2')+'</td><td><a class="sp-link" onclick="filterByActor(\''+inc.actor2.replace(/'/g,"\\'")+'\')">'+inc.actor2+'</a> '+(ACTOR_PROFILES[inc.actor2]?'<a href="javascript:window.showActorBrief(\''+inc.actor2+'\')" style="color:var(--accent);font-size:10px;">'+profileLabel+'</a>':'')+'</td></tr>'+
      '</table>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('drawer.assessment')+'</h4>'+
      '<div class="sp-text">'+
        '<p>'+(LANG==='zh'?'该事件属于':'This incident is classified as')+'<b> '+typeName+' </b>'+(LANG==='zh'?'类别冲突，严重等级认定为':'with severity level')+'<b>"'+sevName+'"</b>。</p>'+
        '<p>'+(LANG==='zh'?'冲突行为体为':'The involved actors are')+' <b>'+inc.actor1+'</b> '+(LANG==='zh'?'与':'and')+' <b>'+inc.actor2+'</b>。'+(inc.severity==='critical'?assessmentCritical:assessmentStandard)+'</p>'+
        '<p>'+assessmentNote+'</p>'+
      '</div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('drawer.source')+'</h4>'+
      '<p class="sp-source">'+inc.source+' &middot; '+verifiedSource+
      (inc.sourceUrl?' &middot; <a href="'+inc.sourceUrl+'" target="_blank" rel="noopener">'+sourceUrlLabel+'</a>':'')+'</p>'+
    '</div>';

  // Use pushDrawer from map.js (drawer stack)
  if(window.pushDrawer){
    pushDrawer(titleHtml, bodyHtml, 'incident-'+inc.id);
  }else{
    // Fallback if map.js not loaded
    var overlay=document.getElementById("subOverlay");
    var panel=document.getElementById("subPanel");
    var title=document.getElementById("subPanelTitle");
    var body=document.getElementById("subPanelBody");
    title.innerHTML=titleHtml;
    body.innerHTML=bodyHtml;
    overlay.classList.add("open");
    panel.classList.add("open");
  }
}

function closeDrawer(){
  // Close ALL — clear drawer stack and close overlay
  if(window.closeAllDrawers){
    closeAllDrawers();
  }else{
    document.getElementById("subOverlay").classList.remove("open");
    document.getElementById("subPanel").classList.remove("open");
  }
  currentIncident=null;
}

// Init
document.addEventListener("DOMContentLoaded",function(){
  var closeBtn=document.getElementById("subPanelClose");
  if(closeBtn)closeBtn.onclick=closeDrawer;
  var backBtn=document.getElementById("subPanelBack");
  if(backBtn)backBtn.onclick=function(e){
    e.stopPropagation();
    if(window.popDrawer)popDrawer();
    else closeDrawer();
  };
  var overlay=document.getElementById("subOverlay");
  if(overlay)overlay.onclick=closeDrawer;
});
