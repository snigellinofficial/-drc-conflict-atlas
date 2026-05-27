/* =====================================================================
   MONTHLY REPORT — 月度报告生成 (过去31天)
   doublecheck后生成结构化报告 + 按时间顺序冲突列表
   Bilingual: Chinese / English
   ===================================================================== */

function generateMonthlyReport(){
  pushDrawer(
    t('report.generating'),
    '<div style="text-align:center;padding:40px;"><span class="spinner"></span><p style="margin-top:12px;color:var(--muted);font-size:12px;">'+t('report.generating2')+'</p></div>',
    'monthly-report'
  );

  setTimeout(function(){
    var report=buildMonthlyReport();
    var title=document.getElementById("subPanelTitle");
    var body=document.getElementById("subPanelBody");
    title.innerHTML=t('report.monthlyTitle');
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
  var prevFatalities=previousMonthData.reduce(function(s,d){return s+(d.fatalities||0);},0);
  var prevCritical=previousMonthData.filter(function(d){return d.severity==="critical";}).length;
  var prevHigh=previousMonthData.filter(function(d){return d.severity==="high";}).length;
  var trend=prevTotal>0?((total-prevTotal)/prevTotal*100).toFixed(0):"N/A";
  var trendNum=parseInt(trend,10);
  var isZh=LANG==='zh';

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

  // Chronological event list
  var chronoList=monthData.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,30);

  // Trend analysis text
  var trendText="";
  if(!isNaN(trendNum)){
    if(trendNum>20)trendText=t('report.trendUp')+(isZh?'':trendNum+'%')+trendNum+'%'+t('report.trendWorse');
    else if(trendNum<-20)trendText=t('report.trendDown')+(isZh?'':Math.abs(trendNum)+'%')+Math.abs(trendNum)+'%'+t('report.trendBetter');
    else if(trendNum>0)trendText=t('report.trendUp2')+trendNum+'%'+t('report.trendSame');
    else if(trendNum<0)trendText=t('report.trendDown2')+Math.abs(trendNum)+'%'+t('report.trendSame');
    else trendText=t('report.trendFlat');
  }

  // Active zones
  var activeZones=[...new Set(monthData.map(function(d){return d.province;}))];
  var periodLabel=monthAgo+(isZh?' 至 ':' to ')+today;

  // Province table
  var provTableRows=topProvinces.map(function(e){
    var c=e[0],d=e[1];
    var pName=getProvinceDisplayName(c);
    var mainTypes=Object.entries(d.types).sort(function(a,b){return b[1]-a[1];}).slice(0,2).map(function(e2){return getConflictTypeName(e2[0])+'('+e2[1]+')';}).join(" ");
    return '<tr><td>'+pName+'</td><td>'+d.count+'</td><td style="color:var(--red)">'+d.fatalities+'</td><td style="color:var(--red)">'+d.critical+'</td><td>'+mainTypes+'</td></tr>';
  }).join("");

  // Type table
  var typeTableRows=Object.entries(byType).filter(function(e){return e[1].count>0;}).sort(function(a,b){return b[1].count-a[1].count;}).map(function(e){
    var t2=e[0],d2=e[1];
    return '<tr><td style="color:'+CONFLICT_TYPES[t2].color+'">'+getConflictTypeName(t2)+'</td><td>'+d2.count+'</td><td>'+(total>0?(d2.count/total*100).toFixed(0)+'%':'—')+'</td><td style="color:var(--red)">'+d2.fatalities+'</td></tr>';
  }).join("");

  // Top fatal cards
  var fatalCards=topFatal.map(function(d,i){
    var loc=localizeEvent(d);
    return '<div class="report-card">'+
      '<div class="rc-date">#'+(i+1)+' · '+d.date+' · '+getProvinceDisplayName(d.province)+'</div>'+
      '<div class="rc-title">'+loc.title+'</div>'+
      '<div class="rc-desc">'+(isZh?'死亡: ':'Deaths: ')+d.fatalities+' · '+getConflictTypeName(d.type)+' · '+getSeverityName(d.severity)+'</div>'+
    '</div>';
  }).join("")||'<p class="sp-text">'+t('report.noDeaths')+'</p>';

  // Chrono list
  var chronoHtml=chronoList.length===0?'<p class="sp-text">'+t('report.chronoNone')+'</p>':
    '<table class="sp-table">'+
      '<tr><th style="width:80px;">'+t('report.colDate')+'</th><th style="width:80px;">'+t('report.colProvince')+'</th><th>'+t('report.colEvent')+'</th><th style="width:40px;">'+t('fatalities')+'</th></tr>'+
      chronoList.map(function(d){
        var loc=localizeEvent(d);
        return '<tr><td style="font-size:10px;">'+d.date+'</td><td>'+getProvinceDisplayName(d.province)+'</td><td style="font-size:11px;">'+loc.title+'</td><td style="color:var(--red);font-weight:700;">'+(d.fatalities||0)+'</td></tr>';
      }).join("")+
    '</table>';

  // Active zones text
  var activeZonesNames=activeZones.map(function(p){return getProvinceDisplayName(p);}).join(isZh?'、':', ');
  var hottestZone=topProvinces.length>0?getProvinceDisplayName(topProvinces[0][0]):'—';

  return '<div class="sp-section">'+
      '<p class="sp-text" style="margin-bottom:0;">'+t('report.period')+'<b>'+periodLabel+'</b> (31'+(isZh?'天':' days')+') · '+t('report.generated')+now.toISOString().slice(0,19).replace("T"," ")+' UTC</p>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.overall')+'</h4>'+
      '<table class="sp-table">'+
        '<tr><th>'+t('report.indicator')+'</th><th>'+t('report.thisMonth')+'</th><th>'+t('report.prevMonth')+'</th><th>'+t('report.change')+'</th></tr>'+
        '<tr><td>'+t('report.totalEvents')+'</td><td style="font-weight:700;">'+total+'</td><td>'+prevTotal+'</td><td style="color:'+(trendNum>0?'var(--red)':'var(--green)')+'">'+(trendNum>0?'+'+trend:trend)+'%</td></tr>'+
        '<tr><td>'+t('report.estDeaths')+'</td><td style="color:var(--red);font-weight:700;">'+fatalities+'</td><td>'+prevFatalities+'</td><td>—</td></tr>'+
        '<tr><td>'+t('report.criticalEvt')+'</td><td style="color:var(--red);">'+critical+'</td><td>'+prevCritical+'</td><td>—</td></tr>'+
        '<tr><td>'+t('report.highEvt')+'</td><td style="color:var(--red2);">'+high+'</td><td>'+prevHigh+'</td><td>—</td></tr>'+
        '<tr><td>'+t('report.provCount')+'</td><td>'+activeZones.length+'</td><td>'+new Set(previousMonthData.map(function(d){return d.province;})).size+'</td><td>—</td></tr>'+
      '</table>'+
      '<div class="sp-text"><p>'+trendText+' '+(criticalEvents.length===0?t('report.noCriticals'):t('report.criticalsCount')+criticalEvents.length+t('report.criticalsCount2'))+'</p></div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.byProvince')+'</h4>'+
      '<table class="sp-table">'+
        '<tr><th>'+t('report.colProvince')+'</th><th>'+t('report.colEvents')+'</th><th>'+t('report.colDeaths')+'</th><th>'+t('report.colCritical')+'</th><th>'+t('report.colTypes')+'</th></tr>'+
        provTableRows+
      '</table>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.byType')+'</h4>'+
      '<table class="sp-table">'+
        '<tr><th>'+t('report.colType')+'</th><th>'+t('report.colEvents')+'</th><th>'+t('report.colShare')+'</th><th>'+t('report.colDeaths')+'</th></tr>'+
        typeTableRows+
      '</table>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.worst')+'</h4>'+
      fatalCards+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.timeline')+'</h4>'+
      '<p class="sp-text" style="font-size:10.5px;color:var(--ink3);margin-bottom:8px;">'+t('report.chronoTip')+'</p>'+
      chronoHtml+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.activeZones')+'</h4>'+
      '<div class="sp-text">'+
        '<p>'+t('report.activeZonesText')+activeZones.length+t('report.activeZonesText2')+activeZonesNames+t('report.activeZonesText3')+'</p>'+
        '<p>'+t('report.hottestZone')+hottestZone+t('report.hottestZone2')+'</p>'+
      '</div>'+
    '</div>'+

    '<div class="sp-section">'+
      '<h4>'+t('report.method')+'</h4>'+
      '<p class="sp-source">'+t('report.methodNote')+'</p>'+
    '</div>';
}

// Keep backward compat
function generateWeeklyReport(){
  generateMonthlyReport();
}
