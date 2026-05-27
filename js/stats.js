/* =====================================================================
   STATS — 刚果(金)冲突统计
   ===================================================================== */
function computeStats(){
  const now=new Date();const ym=now.toISOString().slice(0,7);
  const thisMonth=activeIncidents.filter(d=>d.date.startsWith(ym));
  const totalFatalities=activeIncidents.reduce((s,d)=>s+(d.fatalities||0),0);
  const monthFatalities=thisMonth.reduce((s,d)=>s+(d.fatalities||0),0);
  const provinces=new Set(activeIncidents.map(d=>d.province)).size;
  const battlesCount=activeIncidents.filter(d=>d.type==="battles").length;
  const criticalCount=activeIncidents.filter(d=>d.severity==="critical").length;

  const byProvince={};
  activeIncidents.forEach(d=>{
    if(!byProvince[d.province])byProvince[d.province]={incidents:0,fatalities:0,critical:0};
    byProvince[d.province].incidents++;
    byProvince[d.province].fatalities+=d.fatalities||0;
    if(d.severity==="critical")byProvince[d.province].critical++;
  });

  const byType={};
  Object.keys(CONFLICT_TYPES).forEach(t=>{byType[t]={count:0,fatalities:0};});
  activeIncidents.forEach(d=>{byType[d.type].count++;byType[d.type].fatalities+=d.fatalities||0;});

  const actorPairs={};
  activeIncidents.forEach(d=>{
    const key=`${d.actor1} vs ${d.actor2}`;
    if(!actorPairs[key])actorPairs[key]=0;
    actorPairs[key]++;
  });
  const topPairs=Object.entries(actorPairs).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return {total:activeIncidents.length,thisMonth:thisMonth.length,
    totalFatalities,monthFatalities,provinces,battlesCount,criticalCount,
    byProvince,byType,topPairs};
}

function updateStats(){
  const s=computeStats();
  document.getElementById("statTotal")&&(document.getElementById("statTotal").textContent=s.thisMonth);
  document.getElementById("statFatalities")&&(document.getElementById("statFatalities").textContent=s.monthFatalities);
  document.getElementById("statActive")&&(document.getElementById("statActive").textContent=s.battlesCount);
  document.getElementById("statProvinces")&&(document.getElementById("statProvinces").textContent=s.provinces);

  const grid=document.getElementById("statsGrid");
  if(!grid)return;
  grid.innerHTML=`
    <div class="stat-card"><div class="sc-num" style="color:var(--red)">${s.total}</div><div class="sc-lbl">总冲突事件</div><div class="sc-sub">数据库累计 / All Time</div></div>
    <div class="stat-card"><div class="sc-num" style="color:var(--orange)">${s.totalFatalities}</div><div class="sc-lbl">累计死亡人数</div><div class="sc-sub">估计值 / Estimated</div></div>
    <div class="stat-card"><div class="sc-num" style="color:var(--accent)">${s.battlesCount}</div><div class="sc-lbl">战斗/交火事件</div><div class="sc-sub">Battles & Clashes</div></div>
    <div class="stat-card"><div class="sc-num" style="color:var(--red)">${s.criticalCount}</div><div class="sc-lbl">严重(critical)事件</div><div class="sc-sub">最严重等级</div></div>
    <div class="stat-card"><div class="sc-num" style="color:var(--ink3)">${s.provinces}</div><div class="sc-lbl">涉及省份</div><div class="sc-sub">共26省 / Provinces</div></div>
    <div class="stat-card"><div class="sc-num" style="color:var(--accent)">${s.thisMonth}</div><div class="sc-lbl">本月新增事件</div><div class="sc-sub">This Month / ${new Date().toISOString().slice(0,7)}</div></div>
  `;
}
