/* =====================================================================
   DRAWER — 次级弹窗（事件详情 + 行为体档案）
   ===================================================================== */
let currentIncident=null;

function openDrawer(id){
  const inc=INCIDENTS.find(d=>d.id===id);
  if(!inc)return;
  currentIncident=inc;
  const tc=CONFLICT_TYPES[inc.type];
  const sc=SEVERITY_LEVELS[inc.severity];
  const pInfo=DRC_PROVINCES[inc.province]||{zh:inc.province||"",en:inc.province||""};

  const overlay=document.getElementById("subOverlay");
  const panel=document.getElementById("subPanel");
  const body=document.getElementById("subPanelBody");
  const title=document.getElementById("subPanelTitle");

  title.innerHTML=`${inc.title}`;
  body.innerHTML=`
    <div class="sp-section">
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <span class="sp-badge" style="background:${tc.color};color:#fff;">${tc.zh} / ${tc.en}</span>
        <span class="sp-badge" style="background:${sc.color};color:#fff;">严重等级: ${sc.zh}</span>
        ${inc.verified?'<span class="sp-badge" style="background:var(--green);color:#fff;">已验证 / Verified</span>':'<span class="sp-badge" style="background:var(--orange);color:#fff;">待验证 / Unverified</span>'}
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:var(--ink3);margin-bottom:14px;">
        <span>&#9906; ${inc.city} &middot; ${pInfo.zh}（${pInfo.en}）</span>
        <span>&#9788; ${inc.date}</span>
        <span>&#9878; ${inc.actor1} vs ${inc.actor2}</span>
      </div>
    </div>

    <div class="sp-section">
      <h4>事件描述 / Event Description</h4>
      <div class="sp-text"><p>${inc.desc}</p></div>
    </div>

    <div class="sp-section">
      <h4>伤亡估计 / Casualty Estimate</h4>
      <table class="sp-table">
        <tr><th style="width:100px;">指标 / Metric</th><th>数值 / Value</th></tr>
        <tr><td>估计死亡人数</td><td style="color:var(--red);font-weight:700;">${inc.fatalities||'未知'}</td></tr>
        <tr><td>冲突类型</td><td style="color:${tc.color};">${tc.zh}</td></tr>
        <tr><td>严重等级</td><td style="color:${sc.color};">${sc.zh}</td></tr>
        <tr><td>发生省份</td><td>${pInfo.zh} / ${pInfo.en}</td></tr>
        <tr><td>主要行为体</td><td>${inc.actor1} ${ACTOR_PROFILES[inc.actor1]?`<a href="javascript:window.showActorBrief('${inc.actor1}')" style="color:var(--accent);font-size:10px;">[档案]</a>`:""}</td></tr>
        <tr><td>次要行为体</td><td>${inc.actor2} ${ACTOR_PROFILES[inc.actor2]?`<a href="javascript:window.showActorBrief('${inc.actor2}')" style="color:var(--accent);font-size:10px;">[档案]</a>`:""}</td></tr>
      </table>
    </div>

    <div class="sp-section">
      <h4>态势评估 / Situational Assessment</h4>
      <div class="sp-text">
        <p>该事件属于<b>${tc.zh}</b>类别冲突，严重等级认定为<b>"${sc.zh}"</b>。</p>
        <p>冲突行为体为<b>${inc.actor1}</b>与<b>${inc.actor2}</b>。${inc.severity==='critical'?'该事件可能导致刚果(金)东部安全形势进一步恶化，建议密切关注关联地区动态及国际反应。':'该事件在东部冲突格局中具有重要情报价值，建议持续跟踪后续发展。'}</p>
        <p>注：上述评估仅基于 ACLED/GDELT/UCDP 公开数据库的信息汇总，不构成独立安全分析或预测。</p>
      </div>
    </div>

    <div class="sp-section">
      <h4>数据来源 / Source</h4>
      <p class="sp-source">&#9783; ${inc.source} &middot; ${inc.verified?'&#10003; 已验证数据 / Verified':'&#9888; 待交叉验证 / Unverified'}
      ${inc.sourceUrl?` &middot; <a href="${inc.sourceUrl}" target="_blank" rel="noopener">原始数据 / Source &#8599;</a>`:""}</p>
    </div>
  `;

  overlay.classList.add("open");
  panel.classList.add("open");
}

function closeDrawer(){
  document.getElementById("subOverlay").classList.remove("open");
  document.getElementById("subPanel").classList.remove("open");
  currentIncident=null;
}

// Init
document.addEventListener("DOMContentLoaded",()=>{
  const closeBtn=document.getElementById("subPanelClose");
  if(closeBtn)closeBtn.onclick=closeDrawer;
  const overlay=document.getElementById("subOverlay");
  if(overlay)overlay.onclick=closeDrawer;
});
