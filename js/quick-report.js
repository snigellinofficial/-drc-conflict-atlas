/* =====================================================================
   QUICK REPORT — 快速报告
   输入冲突查询 → 搜索本地库+尝试线上 → 生成RAND风格简式报告
   Bilingual: Chinese / English
   ===================================================================== */

let qrSearchOptions=[];

function initQuickReport(){
  const input=document.getElementById("qrInput");
  if(!input)return;
  input.placeholder=t('qr.placeholder');
  var hint=document.querySelector('#qrOptions > span');
  if(hint)hint.textContent=t('qr.hint');

  input.addEventListener("input",debounce(function(){
    const query=this.value.trim();
    if(query.length<2){clearQROptions();return;}
    suggestOptions(query);
  },400));
}

function suggestOptions(query){
  const q=query.toLowerCase();
  const matches=new Map();
  INCIDENTS.forEach(d=>{
    const searchText=[d.country,d.province,d.city,d.actor1,d.actor2,d.title,d.desc].join(" ").toLowerCase();
    if(searchText.includes(q)){
      const key=`${d.actor1} vs ${d.actor2} in ${d.province}`;
      if(!matches.has(key))matches.set(key,{key,province:d.province,actor1:d.actor1,actor2:d.actor2,count:0,latest:""});
      const m=matches.get(key);
      m.count++;
      if(d.date>m.latest)m.latest=d.date;
    }
  });

  Object.entries(DRC_PROVINCES).forEach(([provKey,pInfo])=>{
    const searchText=`${provKey} ${pInfo.zh} ${pInfo.en}`.toLowerCase();
    if(searchText.includes(q)&&![...matches.values()].some(m=>m.province===provKey)){
      const provData=INCIDENTS.filter(d=>d.province===provKey);
      if(provData.length>0){
        const actors=[...new Set(provData.map(d=>d.actor1))];
        const key=LANG==='zh'?`${pInfo.zh}(${provKey})所有冲突`:`${pInfo.en}(${provKey}) All Conflicts`;
        matches.set(key,{key,province:provKey,actor1:actors.slice(0,3).join("/"),actor2:LANG==='zh'?"多方":"Multiple",count:provData.length,latest:provData[0].date});
      }
    }
  });

  qrSearchOptions=[...matches.values()].sort((a,b)=>b.count-a.count).slice(0,6);

  const container=document.getElementById("qrOptions");
  if(!container)return;

  var unitLabel=LANG==='zh'?'条':')';
  if(qrSearchOptions.length===0){
    container.innerHTML=`<span class="qr-opt" onclick="doMaxSearch('${escapeHTML(query)}')">`+t('qr.maxSearchBtn')+`: "${escapeHTML(query)}"</span>`;
  }else{
    container.innerHTML=qrSearchOptions.map((o,i)=>`
      <span class="qr-opt${i===0?' sel':''}" onclick="generateQuickReport('${escapeHTML(o.key)}',false)">${o.key} (${o.count}${unitLabel}</span>
    `).join("")+
    `<span class="qr-opt" onclick="doMaxSearch('${escapeHTML(query)}')">`+t('qr.maxSearchBtn')+`</span>`;
  }
}

function clearQROptions(){
  qrSearchOptions=[];
  const container=document.getElementById("qrOptions");
  if(container)container.innerHTML=`<span style="font-size:10.5px;color:var(--ink3);">`+t('qr.hint')+`</span>`;
}

function doMaxSearch(query){
  const q=query.toLowerCase();
  const results=INCIDENTS.filter(d=>{
    return [d.country,d.province,d.city,d.actor1,d.actor2,d.title,d.desc,d.type].join(" ").toLowerCase().includes(q);
  });
  var key=LANG==='zh'?`max搜索: "${query}"`:`Max Search: "${query}"`;
  qrSearchOptions=[{key,province:"—",actor1:"—",actor2:"—",count:results.length,latest:results.length>0?results[0].date:""}];
  generateQuickReport(key,true);
}

function generateQuickReport(conflictKey,isMaxSearch){
  const overlay=document.getElementById("subOverlay");
  const panel=document.getElementById("subPanel");
  const body=document.getElementById("subPanelBody");
  const title=document.getElementById("subPanelTitle");

  title.innerHTML=t('qr.generating');
  body.innerHTML=`<div style="text-align:center;padding:40px;"><span class="spinner"></span><p style="margin-top:12px;color:var(--muted);font-size:12px;">`+t('qr.generating')+`</p></div>`;
  overlay.classList.add("open");
  panel.classList.add("open");

  setTimeout(()=>{
    const report=buildQuickReport(conflictKey,isMaxSearch);
    title.innerHTML=t('report.quickTitle');
    body.innerHTML=report;
  },500);
}

function buildQuickReport(conflictKey,isMaxSearch){
  const now=new Date().toISOString().slice(0,19).replace("T"," ");
  var isZh=LANG==='zh';
  var unitLabel=isZh?'条':' events';

  let relevantData;
  if(isMaxSearch){
    relevantData=[...INCIDENTS].sort((a,b)=>b.date.localeCompare(a.date));
  }else{
    const parts=conflictKey.split(" in ");
    const location=parts.length>1?parts[1]:"";
    const actorPart=parts[0];
    const actors=actorPart.split(" vs ").map(s=>s.trim());
    relevantData=INCIDENTS.filter(d=>{
      if(location&&d.province!==location&&d.country!==location)return false;
      if(actors.length>=2){
        if(!(d.actor1===actors[0]&&d.actor2===actors[1])&&!(d.actor1===actors[1]&&d.actor2===actors[0]))return false;
      }
      return true;
    }).sort((a,b)=>b.date.localeCompare(a.date));
  }

  if(relevantData.length===0){
    return `<div class="sp-section"><p class="sp-text">`+t('qr.noMatchText')+`</p>
      <ul style="color:var(--muted);font-size:12px;padding-left:20px;margin-top:8px;">
        <li>`+t('qr.try1')+`</li>
        <li>`+t('qr.try2')+`</li>
        <li>`+t('qr.try3')+`</li>
      </ul></div>`;
  }

  // Statistics
  const total=relevantData.length;
  const fatalities=relevantData.reduce((s,d)=>s+(d.fatalities||0),0);
  const dateRange=isZh?`${relevantData[relevantData.length-1].date} 至 ${relevantData[0].date}`:`${relevantData[relevantData.length-1].date} to ${relevantData[0].date}`;
  const provinces=[...new Set(relevantData.map(d=>d.province))];
  const types={};relevantData.forEach(d=>{if(!types[d.type])types[d.type]=0;types[d.type]++;});
  const bySeverity={critical:0,high:0,medium:0,low:0};
  relevantData.forEach(d=>{bySeverity[d.severity]++;});
  const topEvents=relevantData.filter(d=>d.fatalities>0).sort((a,b)=>b.fatalities-a.fatalities).slice(0,5);
  const actors=[...new Set(relevantData.flatMap(d=>[d.actor1,d.actor2]))];
  const byYear={};relevantData.forEach(d=>{const y=d.date.slice(0,4);if(!byYear[y])byYear[y]=0;byYear[y]++;});

  let conflictName=conflictKey;
  if(isMaxSearch){
    conflictName=relevantData.length>0?provinces.map(p=>getProvinceDisplayName(p)).join(isZh?'、':', ')+(isZh?'冲突概况':' Conflict Overview'):(isZh?'搜索结果':'Search Results');
  }

  // Year trend
  var yearRows=Object.entries(byYear).sort().map(function(e){
    var y=e[0],n=e[1];
    var trendIcon=n>5?"📈":n>2?"📊":"📉";
    return '<tr><td>'+y+'</td><td>'+n+'</td><td>'+trendIcon+'</td>';
  }).join("");

  // Type breakdown
  var typeRows=Object.entries(types).sort(function(a,b){return b[1]-a[1];}).map(function(e){
    var t2=e[0],n2=e[1];
    return '<tr><td style="color:'+CONFLICT_TYPES[t2].color+'">'+getConflictTypeName(t2)+'</td><td>'+n2+'</td><td>'+(n2/total*100).toFixed(1)+'%</td></tr>';
  }).join("");

  // Top fatal events
  var fatalHtml=topEvents.map(function(d,i){
    var loc=localizeEvent(d);
    return '<div class="report-card">'+
      '<div class="rc-date">#'+(i+1)+' · '+d.date+' · '+d.province+', '+d.city+'</div>'+
      '<div class="rc-title">'+loc.title+'</div>'+
      '<div class="rc-desc">'+(isZh?'死亡: ':'Deaths: ')+'<b style="color:var(--red)">'+d.fatalities+'</b> · '+getConflictTypeName(d.type)+' · '+getSeverityName(d.severity)+' · '+d.actor1+' vs '+d.actor2+'</div>'+
    '</div>';
  }).join("")||'<p class="sp-text">'+(isZh?'无死亡事件记录。':'No fatal incidents recorded.')+'</p>';

  // Severity mix
  var sevMix=isZh?
    bySeverity.critical+'严重 / '+bySeverity.high+'高 / '+bySeverity.medium+'中 / '+bySeverity.low+'低':
    bySeverity.critical+' Critical / '+bySeverity.high+' High / '+bySeverity.medium+' Medium / '+bySeverity.low+' Low';

  // Top 2 types for analysis
  var sortedTypes=Object.entries(types).sort(function(a,b){return b[1]-a[1];});
  var top2Types=sortedTypes.slice(0,2).map(function(e){
    return '<b>'+getConflictTypeName(e[0])+'</b>('+(isZh?'占':'')+(e[1]/total*100).toFixed(0)+'%)';
  }).join(isZh?'和':' and ');

  // Trend text
  var trendText='';
  if(Object.keys(byYear).length>1){
    trendText=isZh?
      '在'+Object.keys(byYear).sort().join('至')+'年间':
      'between '+Object.keys(byYear).sort().join(' and ');
    trendText+=Object.values(byYear).some(v=>v>=5)?(isZh?'该冲突呈现'+t('qr.trendActive')+'态势':' the conflict was '+t('qr.trendActive')):
      (isZh?'该冲突呈现'+t('qr.trendSporadic')+'态势':' the conflict was '+t('qr.trendSporadic'));
  }

  return `
    <div class="sp-section">
      <p class="sp-text" style="margin-bottom:0;">
        <b>`+t('qr.query')+`</b>`+conflictKey+` · <b>`+t('qr.generated')+`</b>`+now+` UTC<br>
        <b>`+t('qr.dataRange')+`</b>`+dateRange+` · <b>`+t('qr.matchEvents')+`</b>`+total+unitLabel+`
      </p>
    </div>

    <div class="sp-section">
      <h4>`+t('qr.overview')+`</h4>
      <table class="sp-table">
        <tr><th>`+t('qr.colIndicator')+`</th><th>`+t('qr.colValue')+`</th></tr>
        <tr><td>`+t('qr.totalEvents')+`</td><td style="font-weight:700;">`+total+`</td></tr>
        <tr><td>`+t('qr.totalDeaths')+`</td><td style="color:var(--red);font-weight:700;">`+fatalities+`</td></tr>
        <tr><td>`+t('qr.involvedProv')+`</td><td>`+provinces.map(p=>getProvinceDisplayName(p)).join(isZh?'、':', ')+`</td></tr>
        <tr><td>`+t('qr.mainActors')+`</td><td>`+actors.slice(0,6).join(isZh?'、':', ')+`</td></tr>
        <tr><td>`+t('qr.dataSpan')+`</td><td>`+dateRange+`</td></tr>
        <tr><td>`+t('qr.severityMix')+`</td><td style="color:var(--red);">`+sevMix+`</td></tr>
      </table>
    </div>

    <div class="sp-section">
      <h4>`+t('qr.annualTrend')+`</h4>
      <table class="sp-table">
        <tr><th>`+t('qr.year')+`</th><th>`+t('qr.events')+`</th><th>`+t('qr.trend')+`</th></tr>
        `+yearRows+`
      </table>
    </div>

    <div class="sp-section">
      <h4>`+t('qr.typeBreakdown')+`</h4>
      <table class="sp-table">
        <tr><th>`+t('report.colType')+`</th><th>`+t('qr.events')+`</th><th>`+t('report.colShare')+`</th></tr>
        `+typeRows+`
      </table>
    </div>

    <div class="sp-section">
      <h4>`+t('qr.mostFatal')+`</h4>
      `+fatalHtml+`
    </div>

    <div class="sp-section">
      <h4>`+t('qr.analysis')+`</h4>
      <div class="sp-text">
        <p>`+t('qr.overviewP1')+dateRange.split(isZh?' 至 ':' to ')[0]+t('qr.overviewP1b')+total+t('qr.overviewP1c')+fatalities+t('qr.overviewP1d')+`</p>
        <p>`+t('qr.overviewP2a')+top2Types+t('qr.overviewP2c')+(isZh?'':': ')+`</p>
        <p>`+t('qr.overviewP3')+bySeverity.critical+t('qr.overviewP3b')+bySeverity.high+t('qr.overviewP3c')+bySeverity.medium+t('qr.overviewP3d')+bySeverity.low+t('qr.overviewP3e')+`</p>
        <p>`+t('qr.overviewP4')+actors.slice(0,4).join(isZh?'、':', ')+t('qr.overviewP4b')+`</p>
        `+(relevantData.length>=10?'<p>'+trendText+'</p>':'')+`
      </div>
    </div>

    <div class="sp-section">
      <h4>`+t('qr.sources')+`</h4>
      <p class="sp-source">`+t('qr.sourcesNote')+`</p>
    </div>
  `;
}

// Utility
function escapeHTML(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function debounce(fn,ms){let t;return function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),ms);};}
