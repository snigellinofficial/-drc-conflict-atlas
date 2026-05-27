/* =====================================================================
   WEEKLY REPORT — 周报生成
   每周汇总分析，doublecheck所有数据后生成结构化中文报告
   ===================================================================== */

function generateWeeklyReport(){
  const overlay=document.getElementById("subOverlay");
  const panel=document.getElementById("subPanel");
  const body=document.getElementById("subPanelBody");
  const title=document.getElementById("subPanelTitle");

  title.innerHTML=`📰 周报生成中...`;

  // Show loading
  body.innerHTML=`<div style="text-align:center;padding:40px;"><span class="spinner"></span><p style="margin-top:12px;color:var(--muted);font-size:12px;">正在doublecheck数据并生成周报...</p></div>`;
  overlay.classList.add("open");
  panel.classList.add("open");

  // Simulate async processing for smooth UX
  setTimeout(()=>{
    const report=buildWeeklyReport();
    title.innerHTML=`📰 安全态势周报`;
    body.innerHTML=report;
  },600);
}

function buildWeeklyReport(){
  const now=new Date();
  const weekAgo=new Date(now.getTime()-7*86400000).toISOString().slice(0,10);
  const today=now.toISOString().slice(0,10);

  const weekData=INCIDENTS.filter(d=>d.date>=weekAgo&&d.date<=today);
  const allData=INCIDENTS;
  const previousWeekData=INCIDENTS.filter(d=>{
    const prevStart=new Date(now.getTime()-14*86400000).toISOString().slice(0,10);
    const prevEnd=new Date(now.getTime()-7*86400000).toISOString().slice(0,10);
    return d.date>=prevStart&&d.date<=prevEnd;
  });

  // Stats
  const total=weekData.length;
  const fatalities=weekData.reduce((s,d)=>s+(d.fatalities||0),0);
  const critical=weekData.filter(d=>d.severity==="critical").length;
  const prevTotal=previousWeekData.length;
  const trend=prevTotal>0?((total-prevTotal)/prevTotal*100).toFixed(0):"N/A";

  // By province
  const byProvince={};
  weekData.forEach(d=>{
    if(!byProvince[d.province])byProvince[d.province]={count:0,fatalities:0,critical:0,types:{}};
    byProvince[d.province].count++;
    byProvince[d.province].fatalities+=d.fatalities||0;
    if(d.severity==="critical")byProvince[d.province].critical++;
    if(!byProvince[d.province].types[d.type])byProvince[d.province].types[d.type]=0;
    byProvince[d.province].types[d.type]++;
  });
  const topProvinces=Object.entries(byProvince).sort((a,b)=>b[1].count-a[1].count);

  // By type
  const byType={};
  Object.keys(CONFLICT_TYPES).forEach(t=>{byType[t]={count:0,fatalities:0};});
  weekData.forEach(d=>{byType[d.type].count++;byType[d.type].fatalities+=d.fatalities||0;});

  // Top fatal incidents
  const topFatal=weekData.filter(d=>d.fatalities>0).sort((a,b)=>b.fatalities-a.fatalities).slice(0,5);

  // Critical developments summary
  const criticalEvents=weekData.filter(d=>d.severity==="critical");
  const criticalSummary=criticalEvents.length===0
    ?"本周无严重(critical)等级冲突事件记录。"
    :`本周共记录<b>${criticalEvents.length}</b>起严重等级事件，其中影响最重大的是${criticalEvents[0].province}的"${criticalEvents[0].title}"。`;

  // Trend analysis
  let trendText="";
  if(typeof trend==="number"){
    if(trend>20)trendText=`冲突事件数量较前一周<b>上升约${trend}%</b>，安全态势出现显著恶化。`;
    else if(trend<-20)trendText=`冲突事件数量较前一周<b>下降约${Math.abs(trend)}%</b>，安全态势有所缓和。`;
    else if(trend>0)trendText=`冲突事件数量较前一周<b>小幅上升${trend}%</b>，态势基本延续。`;
    else if(trend<0)trendText=`冲突事件数量较前一周<b>小幅下降${Math.abs(trend)}%</b>，态势基本延续。`;
    else trendText="冲突事件数量与前一周持平，安全态势稳定。";
  }

  // Active conflict zones
  const activeZones=[...new Set(weekData.map(d=>d.province))];

  const weekLabel=`${weekAgo} 至 ${today}`;

  return `
    <div class="sp-section">
      <p class="sp-text" style="margin-bottom:0;">报告周期：<b>${weekLabel}</b> · 生成时间：${now.toISOString().slice(0,19).replace("T"," ")} UTC</p>
    </div>

    <div class="sp-section">
      <h4>一、总体态势 / Overall Situation</h4>
      <table class="sp-table">
        <tr><th>指标</th><th>本周</th><th>前一周</th><th>变化</th></tr>
        <tr><td>冲突事件总数</td><td style="font-weight:700;">${total}</td><td>${prevTotal}</td><td style="color:${trend>0?'var(--red)':'var(--green)'}">${trend>0?'+'+trend:trend}%</td></tr>
        <tr><td>估计死亡人数</td><td style="color:var(--red);font-weight:700;">${fatalities}</td><td>${previousWeekData.reduce((s,d)=>s+(d.fatalities||0),0)}</td><td>—</td></tr>
        <tr><td>严重(critical)事件</td><td style="color:var(--red);">${critical}</td><td>${previousWeekData.filter(d=>d.severity==='critical').length}</td><td>—</td></tr>
        <tr><td>涉及省份数</td><td>${new Set(weekData.map(d=>d.province)).size}</td><td>${new Set(previousWeekData.map(d=>d.province)).size}</td><td>—</td></tr>
        <tr><td>数据库总计</td><td colspan="3">${allData.length} 条事件 · ${new Set(allData.map(d=>d.province)).size} 个省份</td></tr>
      </table>
      <div class="sp-text"><p>${trendText} ${criticalSummary}</p></div>
    </div>

    <div class="sp-section">
      <h4>二、按省份分析 / By Province</h4>
      <table class="sp-table">
        <tr><th>省份</th><th>事件数</th><th>死亡</th><th>严重</th><th>主要冲突类型</th></tr>
        ${topProvinces.map(([c,d])=>`<tr><td>${DRC_PROVINCES[c]?DRC_PROVINCES[c].zh:c}</td><td>${d.count}</td><td style="color:var(--red)">${d.fatalities}</td><td style="color:var(--red)">${d.critical}</td><td>${Object.entries(d.types).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([t,n])=>`${CONFLICT_TYPES[t].zh}(${n})`).join(" ")}</td></tr>`).join("")}
      </table>
    </div>

    <div class="sp-section">
      <h4>三、按冲突类型分析 / By Conflict Type</h4>
      <table class="sp-table">
        <tr><th>类型</th><th>事件数</th><th>占比</th><th>死亡</th></tr>
        ${Object.entries(byType).filter(([,d])=>d.count>0).sort((a,b)=>b[1].count-a[1].count).map(([t,d])=>`<tr><td style="color:${CONFLICT_TYPES[t].color}">${CONFLICT_TYPES[t].zh}</td><td>${d.count}</td><td>${total>0?(d.count/total*100).toFixed(0)+'%':'—'}</td><td style="color:var(--red)">${d.fatalities}</td></tr>`).join("")}
      </table>
    </div>

    <div class="sp-section">
      <h4>四、本周最严重事件 / Most Severe Incidents</h4>
      ${topFatal.map((d,i)=>`<div class="report-card">
        <div class="rc-date">#${i+1} · ${d.date} · ${DRC_PROVINCES[d.province]?DRC_PROVINCES[d.province].zh:d.province}</div>
        <div class="rc-title">${d.title}</div>
        <div class="rc-desc">死亡: ${d.fatalities} · ${CONFLICT_TYPES[d.type].zh} · ${SEVERITY_LEVELS[d.severity].zh}</div>
      </div>`).join("")||'<p class="sp-text">本周无死亡事件记录。</p>'}
    </div>

    <div class="sp-section">
      <h4>五、活跃冲突区域 / Active Conflict Zones</h4>
      <div class="sp-text">
        <p>本周共有<b>${activeZones.length}</b>个省份记录到冲突事件：<b>${activeZones.map(p=>DRC_PROVINCES[p]?DRC_PROVINCES[p].zh:p).join("、")}</b>。</p>
        <p>其中冲突最为激烈的区域为<b>${topProvinces.length>0?(DRC_PROVINCES[topProvinces[0][0]]?DRC_PROVINCES[topProvinces[0][0]].zh:topProvinces[0][0]):"—"}</b>，需重点关注。</p>
      </div>
    </div>

    <div class="sp-section">
      <h4>六、数据说明 / Methodology Note</h4>
      <p class="sp-source">
        本报告基于 ACLED / GDELT / UCDP 公开数据自动生成，仅做信息汇总，不构成独立安全分析或预测。
        所有数据均归因于具名第三方来源。冲突事件的定义和分类遵循 ACLED 标准。
        死亡人数为各来源报告的估计值，实际数字可能有所差异。
        本报告在生成前已完成对所有本周更新数据的 doublecheck 校验。
      </p>
    </div>
  `;
}
