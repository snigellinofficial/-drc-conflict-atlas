/* =====================================================================
   MONTHLY REPORT — 月度报告生成 (过去31天)
   doublecheck后生成结构化中文报告 + 按时间顺序冲突列表
   ===================================================================== */

function generateMonthlyReport(){
  var overlay=document.getElementById("subOverlay");
  var panel=document.getElementById("subPanel");
  var body=document.getElementById("subPanelBody");
  var title=document.getElementById("subPanelTitle");

  title.innerHTML='月度报告生成中...';
  body.innerHTML='<div style="text-align:center;padding:40px;"><span class="spinner"></span><p style="margin-top:12px;color:var(--muted);font-size:12px;">正在doublecheck数据并生成月度报告...</p></div>';
  overlay.classList.add("open");
  panel.classList.add("open");

  setTimeout(function(){
    var report=buildMonthlyReport();
    title.innerHTML='月度安全态势报告';
    body.innerHTML=report;
  },600);
}

function buildMonthlyReport(){
  var now=new Date();
  var monthAgo=new Date(now.getTime()-31*86400000).toISOString().slice(0,10);
  var today=now.toISOString().slice(0,10);

  var monthData=INCIDENTS.filter(function(d){return d.date>=monthAgo&&d.date<=today;});
  var previousMonthData=INCIDENTS.filter(function(d){
    var prevStart=new Date(now.getTime()-62*86400000).toISOString().slice(0,10);
    var prevEnd=new Date(now.getTime()-31*86400000).toISOString().slice(0,10);
    return d.date>=prevStart&&d.date<=prevEnd;
  });

  // Stats
  var total=monthData.length;
  var fatalities=monthData.reduce(function(s,d){return s+(d.fatalities||0);},0);
  var critical=monthData.filter(function(d){return d.severity==="critical";}).length;
  var high=monthData.filter(function(d){return d.severity==="high";}).length;
  var prevTotal=previousMonthData.length;
  var trend=prevTotal>0?((total-prevTotal)/prevTotal*100).toFixed(0):"N/A";

  // By province
  var byProvince={};
  monthData.forEach(function(d){
    if(!byProvince[d.province])byProvince[d.province]={count:0,fatalities:0,critical:0,types:{}};
    byProvince[d.province].count++;
    byProvince[d.province].fatalities+=d.fatalities||0;
    if(d.severity==="critical")byProvince[d.province].critical++;
    if(!byProvince[d.province].types[d.type])byProvince[d.province].types[d.type]=0;
    byProvince[d.province].types[d.type]++;
  });
  var topProvinces=Object.entries(byProvince).sort(function(a,b){return b[1].count-a[1].count;});

  // By type
  var byType={};
  Object.keys(CONFLICT_TYPES).forEach(function(t){byType[t]={count:0,fatalities:0};});
  monthData.forEach(function(d){byType[d.type].count++;byType[d.type].fatalities+=d.fatalities||0;});

  // Top fatal incidents
  var topFatal=monthData.filter(function(d){return d.fatalities>0;}).sort(function(a,b){return b.fatalities-a.fatalities;}).slice(0,5);

  // Critical events
  var criticalEvents=monthData.filter(function(d){return d.severity==="critical";});

  // Chronological event list (new — by date, most recent first)
  var chronoList=monthData.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,30);

  // Trend analysis
  var trendText="";
  if(typeof trend==="number"){
    if(trend>20)trendText='冲突事件数量较前一月<b>上升约'+trend+'%</b>，安全态势出现显著恶化。';
    else if(trend<-20)trendText='冲突事件数量较前一月<b>下降约'+Math.abs(trend)+'%</b>，安全态势有所缓和。';
    else if(trend>0)trendText='冲突事件数量较前一月<b>小幅上升'+trend+'%</b>，态势基本延续。';
    else if(trend<0)trendText='冲突事件数量较前一月<b>小幅下降'+Math.abs(trend)+'%</b>，态势基本延续。';
    else trendText='冲突事件数量与前一月持平，安全态势稳定。';
  }

  // Active zones
  var activeZones=[...new Set(monthData.map(function(d){return d.province;}))];
  var periodLabel=monthAgo+' 至 '+today;

  return '<div class="sp-section">'+
      '<p class="sp-text" style="margin-bottom:0;">报告周期：<b>'+periodLabel+'</b> (31天) · 生成时间：'+now.toISOString().slice(0,19).replace("T"," ")+' UTC</p>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>一、总体态势 / Overall Situation</h4>'+
      '<table class="sp-table">'+
        '<tr><th>指标</th><th>本月</th><th>前一月</th><th>变化</th></tr>'+
        '<tr><td>冲突事件总数</td><td style="font-weight:700;">'+total+'</td><td>'+prevTotal+'</td><td style="color:'+(trend>0?'var(--red)':'var(--green)')+'">'+(trend>0?'+'+trend:trend)+'%</td></tr>'+
        '<tr><td>估计死亡人数</td><td style="color:var(--red);font-weight:700;">'+fatalities+'</td><td>'+previousMonthData.reduce(function(s,d){return s+(d.fatalities||0);},0)+'</td><td>—</td></tr>'+
        '<tr><td>严重(critical)事件</td><td style="color:var(--red);">'+critical+'</td><td>'+previousMonthData.filter(function(d){return d.severity==="critical";}).length+'</td><td>—</td></tr>'+
        '<tr><td>高(high)等级事件</td><td style="color:var(--red2);">'+high+'</td><td>'+previousMonthData.filter(function(d){return d.severity==="high";}).length+'</td><td>—</td></tr>'+
        '<tr><td>涉及省份数</td><td>'+activeZones.length+'</td><td>'+new Set(previousMonthData.map(function(d){return d.province;})).size+'</td><td>—</td></tr>'+
      '</table>'+
      '<div class="sp-text"><p>'+trendText+' '+(criticalEvents.length===0?'本月无严重(critical)等级冲突事件记录。':'本月共记录<b>'+criticalEvents.length+'</b>起严重等级事件。')+'</p></div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>二、按省份分析 / By Province</h4>'+
      '<table class="sp-table">'+
        '<tr><th>省份</th><th>事件数</th><th>死亡</th><th>严重</th><th>主要冲突类型</th></tr>'+
        topProvinces.map(function(e){var c=e[0],d=e[1];return '<tr><td>'+(DRC_PROVINCES[c]?DRC_PROVINCES[c].zh:c)+'</td><td>'+d.count+'</td><td style="color:var(--red)">'+d.fatalities+'</td><td style="color:var(--red)">'+d.critical+'</td><td>'+Object.entries(d.types).sort(function(a,b){return b[1]-a[1];}).slice(0,2).map(function(e2){return CONFLICT_TYPES[e2[0]].zh+'('+e2[1]+')';}).join(" ")+'</td></tr>';}).join("")+
      '</table>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>三、按冲突类型分析 / By Conflict Type</h4>'+
      '<table class="sp-table">'+
        '<tr><th>类型</th><th>事件数</th><th>占比</th><th>死亡</th></tr>'+
        Object.entries(byType).filter(function(e){return e[1].count>0;}).sort(function(a,b){return b[1].count-a[1].count;}).map(function(e){var t=e[0],d=e[1];return '<tr><td style="color:'+CONFLICT_TYPES[t].color+'">'+CONFLICT_TYPES[t].zh+'</td><td>'+d.count+'</td><td>'+(total>0?(d.count/total*100).toFixed(0)+'%':'—')+'</td><td style="color:var(--red)">'+d.fatalities+'</td></tr>';}).join("")+
      '</table>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>四、最严重事件 / Most Severe Incidents</h4>'+
      (topFatal.map(function(d,i){return '<div class="report-card">'+
        '<div class="rc-date">#'+(i+1)+' · '+d.date+' · '+(DRC_PROVINCES[d.province]?DRC_PROVINCES[d.province].zh:d.province)+'</div>'+
        '<div class="rc-title">'+d.title+'</div>'+
        '<div class="rc-desc">死亡: '+d.fatalities+' · '+CONFLICT_TYPES[d.type].zh+' · '+SEVERITY_LEVELS[d.severity].zh+'</div>'+
      '</div>';}).join("")||'<p class="sp-text">本月无死亡事件记录。</p>')+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>五、冲突事件时间线 / Chronological Event List</h4>'+
      '<p class="sp-text" style="font-size:10.5px;color:var(--ink3);margin-bottom:8px;">以下为过去31天内按时间顺序排列的冲突事件（最多30条）</p>'+
      (chronoList.length===0?'<p class="sp-text">本月无冲突事件记录。</p>':
        '<table class="sp-table">'+
          '<tr><th style="width:80px;">日期</th><th style="width:80px;">省份</th><th>事件</th><th style="width:40px;">死亡</th></tr>'+
          chronoList.map(function(d){return '<tr><td style="font-size:10px;">'+d.date+'</td><td>'+(DRC_PROVINCES[d.province]?DRC_PROVINCES[d.province].zh:d.province||'')+'</td><td style="font-size:11px;">'+d.title+'</td><td style="color:var(--red);font-weight:700;">'+(d.fatalities||0)+'</td></tr>';}).join("")+
        '</table>')+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>六、活跃冲突区域 / Active Conflict Zones</h4>'+
      '<div class="sp-text">'+
        '<p>本月共有<b>'+activeZones.length+'</b>个省份记录到冲突事件：<b>'+activeZones.map(function(p){return DRC_PROVINCES[p]?DRC_PROVINCES[p].zh:p;}).join("、")+'</b>。</p>'+
        '<p>其中冲突最为激烈的区域为<b>'+(topProvinces.length>0?(DRC_PROVINCES[topProvinces[0][0]]?DRC_PROVINCES[topProvinces[0][0]].zh:topProvinces[0][0]):"—")+'</b>，需重点关注。</p>'+
      '</div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>七、数据说明 / Methodology Note</h4>'+
      '<p class="sp-source">'+
        '本报告基于 ACLED / GDELT / UCDP 公开数据自动生成，仅做信息汇总，不构成独立安全分析或预测。'+
        '所有数据均归因于具名第三方来源。冲突事件的定义和分类遵循 ACLED 标准。'+
        '严重等级分级依据见筛选器说明。死亡人数为各来源报告的估计值，实际数字可能有所差异。'+
      '</p>'+
    '</div>';
}

// Keep backward compat
function generateWeeklyReport(){
  generateMonthlyReport();
}
