/* =====================================================================
   QUICK REPORT — 快速报告
   输入冲突查询 → 搜索本地库+尝试线上 → 生成RAND风格简式中文报告
   ===================================================================== */

let qrSearchOptions=[];

function initQuickReport(){
  const input=document.getElementById("qrInput");
  if(!input)return;

  input.addEventListener("input",debounce(function(){
    const query=this.value.trim();
    if(query.length<2){clearQROptions();return;}
    suggestOptions(query);
  },400));
}

function suggestOptions(query){
  const q=query.toLowerCase();
  // Search local data for matching conflicts
  const matches=new Map();
  INCIDENTS.forEach(d=>{
    const searchText=[d.country,d.province,d.city,d.actor1,d.actor2,d.title,d.desc].join(" ").toLowerCase();
    if(searchText.includes(q)){
      // Create conflict key
      const key=`${d.actor1} vs ${d.actor2} in ${d.province}`;
      if(!matches.has(key))matches.set(key,{key,province:d.province,actor1:d.actor1,actor2:d.actor2,count:0,latest:""});
      const m=matches.get(key);
      m.count++;
      if(d.date>m.latest)m.latest=d.date;
    }
  });

  // Also match by province name
  Object.entries(DRC_PROVINCES).forEach(([provKey,pInfo])=>{
    const searchText=`${provKey} ${pInfo.zh} ${pInfo.en}`.toLowerCase();
    if(searchText.includes(q)&&![...matches.values()].some(m=>m.province===provKey)){
      const provData=INCIDENTS.filter(d=>d.province===provKey);
      if(provData.length>0){
        const actors=[...new Set(provData.map(d=>d.actor1))];
        const key=`${pInfo.zh}(${provKey})所有冲突`;
        matches.set(key,{key,province:provKey,actor1:actors.slice(0,3).join("/"),actor2:"多方",count:provData.length,latest:provData[0].date});
      }
    }
  });

  qrSearchOptions=[...matches.values()].sort((a,b)=>b.count-a.count).slice(0,6);

  const container=document.getElementById("qrOptions");
  if(!container)return;

  if(qrSearchOptions.length===0){
    container.innerHTML=`<span class="qr-opt" onclick="doMaxSearch('${escapeHTML(query)}')">🔍 全库搜索: "${escapeHTML(query)}"</span>`;
  }else{
    container.innerHTML=qrSearchOptions.map((o,i)=>`
      <span class="qr-opt${i===0?' sel':''}" onclick="generateQuickReport('${escapeHTML(o.key)}',false)">${o.key} (${o.count}条)</span>
    `).join("")+
    `<span class="qr-opt" onclick="doMaxSearch('${escapeHTML(query)}')">🔍 全库 max 搜索</span>`;
  }
}

function clearQROptions(){
  qrSearchOptions=[];
  const container=document.getElementById("qrOptions");
  if(container)container.innerHTML="";
}

function doMaxSearch(query){
  // Search ALL incidents containing the query
  const q=query.toLowerCase();
  const results=INCIDENTS.filter(d=>{
    return [d.country,d.province,d.city,d.actor1,d.actor2,d.title,d.desc,d.type].join(" ").toLowerCase().includes(q);
  });
  const key=`max搜索: "${query}"`;
  qrSearchOptions=[{key,province:"—",actor1:"—",actor2:"—",count:results.length,latest:results.length>0?results[0].date:""}];
  generateQuickReport(key,true);
}

function generateQuickReport(conflictKey,isMaxSearch){
  const overlay=document.getElementById("subOverlay");
  const panel=document.getElementById("subPanel");
  const body=document.getElementById("subPanelBody");
  const title=document.getElementById("subPanelTitle");

  title.innerHTML=`🔍 快速报告生成中...`;
  body.innerHTML=`<div style="text-align:center;padding:40px;"><span class="spinner"></span><p style="margin-top:12px;color:var(--muted);font-size:12px;">检索本地数据库与线上来源中...</p></div>`;
  overlay.classList.add("open");
  panel.classList.add("open");

  setTimeout(()=>{
    const report=buildQuickReport(conflictKey,isMaxSearch);
    title.innerHTML=`📋 快速报告`;
    body.innerHTML=report;
  },500);
}

function buildQuickReport(conflictKey,isMaxSearch){
  const now=new Date().toISOString().slice(0,19).replace("T"," ");

  // Determine scope
  let relevantData;
  if(isMaxSearch){
    relevantData=[...INCIDENTS].sort((a,b)=>b.date.localeCompare(a.date));
  }else{
    const parts=conflictKey.split(" in ");
    const location=parts.length>1?parts[1]:"";  // province or country
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
    return `<div class="sp-section"><p class="sp-text">未在本地数据库中找到与"${conflictKey}"匹配的冲突记录。请尝试：</p>
      <ul style="color:var(--muted);font-size:12px;padding-left:20px;margin-top:8px;">
        <li>扩大搜索范围或使用不同关键词</li>
        <li>使用"全库 max 搜索"进行全文检索</li>
        <li>运行爬虫更新数据库(cd scripts && python crawler.py)</li>
      </ul></div>`;
  }

  // Statistics
  const total=relevantData.length;
  const fatalities=relevantData.reduce((s,d)=>s+(d.fatalities||0),0);
  const dateRange=`${relevantData[relevantData.length-1].date} 至 ${relevantData[0].date}`;
  const provinces=[...new Set(relevantData.map(d=>d.province))];
  const types={};relevantData.forEach(d=>{if(!types[d.type])types[d.type]=0;types[d.type]++;});
  const bySeverity={critical:0,high:0,medium:0,low:0};
  relevantData.forEach(d=>{bySeverity[d.severity]++;});
  const topEvents=relevantData.filter(d=>d.fatalities>0).sort((a,b)=>b.fatalities-a.fatalities).slice(0,5);
  const actors=[...new Set(relevantData.flatMap(d=>[d.actor1,d.actor2]))];
  const byYear={};relevantData.forEach(d=>{const y=d.date.slice(0,4);if(!byYear[y])byYear[y]=0;byYear[y]++;});

  let conflictName=conflictKey;
  if(isMaxSearch)conflictName=relevantData.length>0?`${provinces.map(p=>DRC_PROVINCES[p]?DRC_PROVINCES[p].zh:p).join("、")}冲突概况`:"搜索结果";

  return `
    <div class="sp-section">
      <p class="sp-text" style="margin-bottom:0;">
        <b>查询：</b>${conflictKey} · <b>生成时间：</b>${now} UTC<br>
        <b>数据范围：</b>${dateRange} · <b>匹配事件：</b>${total} 条
      </p>
    </div>

    <div class="sp-section">
      <h4>一、冲突概况 / Conflict Overview</h4>
      <table class="sp-table">
        <tr><th>指标</th><th>数值</th></tr>
        <tr><td>总事件数</td><td style="font-weight:700;">${total}</td></tr>
        <tr><td>估计总死亡</td><td style="color:var(--red);font-weight:700;">${fatalities}</td></tr>
        <tr><td>涉及省份</td><td>${provinces.map(p=>DRC_PROVINCES[p]?DRC_PROVINCES[p].zh:p).join("、")}</td></tr>
        <tr><td>主要行为体</td><td>${actors.slice(0,6).join("、")}</td></tr>
        <tr><td>数据跨度</td><td>${dateRange}</td></tr>
        <tr><td>严重事件占比</td><td style="color:var(--red);">${bySeverity.critical}严重 / ${bySeverity.high}高 / ${bySeverity.medium}中 / ${bySeverity.low}低</td></tr>
      </table>
    </div>

    <div class="sp-section">
      <h4>二、年度趋势 / Annual Trend</h4>
      <table class="sp-table">
        <tr><th>年份</th><th>事件数</th><th>趋势</th></tr>
        ${Object.entries(byYear).sort().map(([y,n])=>{
          const trendIcon=n>5?"📈":n>2?"📊":"📉";
          return `<tr><td>${y}</td><td>${n}</td><td>${trendIcon}</td>`;
        }).join("")}
      </table>
    </div>

    <div class="sp-section">
      <h4>三、冲突类型构成 / Conflict Type Breakdown</h4>
      <table class="sp-table">
        <tr><th>类型</th><th>事件数</th><th>占比</th></tr>
        ${Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<tr><td style="color:${CONFLICT_TYPES[t].color}">${CONFLICT_TYPES[t].zh}</td><td>${n}</td><td>${(n/total*100).toFixed(1)}%</td></tr>`).join("")}
      </table>
    </div>

    <div class="sp-section">
      <h4>四、最致命事件 / Most Fatal Incidents</h4>
      ${topEvents.map((d,i)=>`<div class="report-card">
        <div class="rc-date">#${i+1} · ${d.date} · ${d.province}, ${d.city}</div>
        <div class="rc-title">${d.title}</div>
        <div class="rc-desc">死亡: <b style="color:var(--red)">${d.fatalities}</b> · ${(CONFLICT_TYPES[d.type]||{}).zh||d.type} · ${(SEVERITY_LEVELS[d.severity]||{}).zh||d.severity} · ${d.actor1} vs ${d.actor2}</div>
      </div>`).join("")||'<p class="sp-text">无死亡事件记录。</p>'}
    </div>

    <div class="sp-section">
      <h4>五、简要分析 / Brief Analysis</h4>
      <div class="sp-text">
        <p>该冲突自<b>${dateRange.split(" 至 ")[0]}</b>以来，在数据库中累计记录到<b>${total}</b>起事件，造成约<b>${fatalities}</b>人死亡。</p>
        <p>冲突的主要形式为${Object.entries(types).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([t,n])=>`<b>${CONFLICT_TYPES[t].zh}</b>(占${(n/total*100).toFixed(0)}%)`).join("和")}。</p>
        <p>严重等级分布为：严重${bySeverity.critical}起、高${bySeverity.high}起、中等${bySeverity.medium}起、低${bySeverity.low}起。</p>
        <p>涉及的主要武装行为体包括：<b>${actors.slice(0,4).join("、")}</b>等。</p>
        ${relevantData.length>=10?`<p>年度趋势显示，${Object.entries(byYear).length>1?`在${Object.keys(byYear).sort().join("至")}年间`:"该时间段内"}该冲突呈现${Object.values(byYear).some(v=>v>=5)?'持续活跃':'间歇性活动'}态势。</p>`:""}
      </div>
    </div>

    <div class="sp-section">
      <h4>六、数据来源与说明 / Sources & Notes</h4>
      <p class="sp-source">
        数据来源：ACLED (Armed Conflict Location & Event Data) / GDELT / UCDP 公开数据集。
        本报告为机器自动生成的信息汇总，遵循RAND报告简式格式，仅做事实性数据呈现，不构成安全分析或预测。
        死亡人数为各来源报告的估计值。如需更详细分析，请查阅各来源原始数据。
      </p>
    </div>
  `;
}

// Utility
function escapeHTML(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function debounce(fn,ms){let t;return function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),ms);};}
