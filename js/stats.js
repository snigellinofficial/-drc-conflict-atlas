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
  activeIncidents.forEach(d=>{
    if(byType[d.type]){
      byType[d.type].count++;
      byType[d.type].fatalities+=d.fatalities||0;
    }
  });

  const actorPairs={};
  activeIncidents.forEach(d=>{
    const key=`${d.actor1} vs ${d.actor2}`;
    if(!actorPairs[key])actorPairs[key]=0;
    actorPairs[key]++;
  });
  const topPairs=Object.entries(actorPairs).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Monthly breakdown for chart
  const monthly={};
  activeIncidents.forEach(d=>{
    const m=d.date.slice(0,7);
    if(!monthly[m])monthly[m]=0;
    monthly[m]++;
  });
  const sortedMonths=Object.keys(monthly).sort();
  const chartData=sortedMonths.map(m=>({month:m,count:monthly[m]}));

  return {total:activeIncidents.length,thisMonth:thisMonth.length,
    totalFatalities,monthFatalities,provinces,battlesCount,criticalCount,
    byProvince,byType,topPairs,chartData};
}

function updateStats(){
  const s=computeStats();
  document.getElementById("statTotal")&&(document.getElementById("statTotal").textContent=s.thisMonth);
  document.getElementById("statFatalities")&&(document.getElementById("statFatalities").textContent=s.monthFatalities);
  document.getElementById("statActive")&&(document.getElementById("statActive").textContent=s.battlesCount);
  document.getElementById("statProvinces")&&(document.getElementById("statProvinces").textContent=s.provinces);

  const grid=document.getElementById("statsGrid");
  if(!grid)return;
  grid.innerHTML=
    '<div class="stat-card"><div class="sc-num" style="color:var(--red)">'+s.total+'</div><div class="sc-lbl">'+t('stats.total')+'</div><div class="sc-sub">'+t('stats.allTime')+'</div></div>'+
    '<div class="stat-card"><div class="sc-num" style="color:var(--accent)">'+s.battlesCount+'</div><div class="sc-lbl">'+t('stats.battles')+'</div><div class="sc-sub">'+t('stats.battlesSub')+'</div></div>'+
    '<div class="stat-card"><div class="sc-num" style="color:var(--red)">'+s.criticalCount+'</div><div class="sc-lbl">'+t('stats.critical')+'</div><div class="sc-sub">'+t('stats.criticalSub')+'</div></div>'+
    '<div class="stat-card"><div class="sc-num" style="color:var(--ink3)">'+s.provinces+'</div><div class="sc-lbl">'+t('stats.provinces')+'</div><div class="sc-sub">'+t('stats.provincesSub')+'</div></div>'+
    '<div class="stat-card"><div class="sc-num" style="color:var(--accent)">'+s.thisMonth+'</div><div class="sc-lbl">'+t('stats.monthNew')+'</div><div class="sc-sub">'+t('stats.monthSub')+' / '+new Date().toISOString().slice(0,7)+'</div></div>';

  drawMonthlyChart(s.chartData);
}

function drawMonthlyChart(chartData){
  var canvas=document.getElementById("monthlyChart");
  if(!canvas)return;
  var wrap=document.getElementById("chartWrap");
  if(!wrap)return;

  if(!chartData||chartData.length===0){
    wrap.style.display="none";
    return;
  }
  wrap.style.display="block";

  var ctx=canvas.getContext("2d");
  var dpr=window.devicePixelRatio||1;

  // Set canvas size
  var rect=canvas.parentElement.getBoundingClientRect();
  var w=rect.width||360;
  var h=200;
  canvas.style.width=w+"px";
  canvas.style.height=h+"px";
  canvas.width=w*dpr;
  canvas.height=h*dpr;
  ctx.scale(dpr,dpr);

  // Padding
  var pad={top:8,right:20,bottom:30,left:42};
  var pw=w-pad.left-pad.right;
  var ph=h-pad.top-pad.bottom;

  ctx.clearRect(0,0,w,h);

  // Determine x-axis ticks (3-6 segments)
  var n=chartData.length;
  var ticks;
  if(n<=3){
    ticks=chartData.map(function(d,i){return {index:i,label:d.month};});
  }else if(n<=6){
    ticks=chartData.map(function(d,i){return {index:i,label:d.month};});
  }else{
    var tickCount=Math.min(6,Math.max(3,Math.ceil(n/6)));
    var step=Math.ceil(n/tickCount);
    ticks=[];
    for(var i=0;i<n;i+=step){
      ticks.push({index:i,label:chartData[i].month});
    }
    // Always include last
    if(ticks[ticks.length-1].index!==n-1){
      ticks.push({index:n-1,label:chartData[n-1].month});
    }
  }

  // Y-axis max
  var maxCount=Math.max.apply(null,chartData.map(function(d){return d.count;}));
  maxCount=Math.ceil(maxCount*1.2)||5;
  // Round to nice number
  var yRounds=[5,10,15,20,25,30,40,50,75,100,150,200,300];
  var yMax=yRounds.find(function(r){return r>=maxCount;})||maxCount;
  var ySteps=4;
  while(yMax/ySteps<1)ySteps--;

  // Grid lines + Y-axis labels
  ctx.strokeStyle="rgba(0,0,0,0.07)";
  ctx.lineWidth=1;
  ctx.fillStyle="#595959";
  ctx.font="10px 'Times New Roman', Times, serif";
  ctx.textAlign="right";
  ctx.textBaseline="middle";

  for(var yi=0;yi<=ySteps;yi++){
    var yv=Math.round(yMax*yi/ySteps);
    var y=pad.top+ph-(ph*yi/ySteps);
    ctx.beginPath();
    ctx.moveTo(pad.left,y);
    ctx.lineTo(w-pad.right,y);
    ctx.stroke();
    // Y label - use fillStyle directly
    ctx.fillStyle="#595959";
    ctx.fillText(yv+"",pad.left-8,y);
  }

  // X-axis labels
  ctx.textAlign="center";
  ctx.textBaseline="top";
  ctx.fillStyle="#595959";
  ctx.font="9px 'Times New Roman', Times, serif";

  ticks.forEach(function(t){
    var x=pad.left+(pw*(t.index/(n-1)));
    if(n===1)x=pad.left+pw/2;
    // Format label: show month
    var label=t.label;
    var parts=label.split("-");
    if(parts.length===2){
      label=parts[0]+"-"+parts[1];
    }
    ctx.fillText(label,x,pad.top+ph+6);
  });

  // Draw grid border
  ctx.strokeStyle="rgba(0,0,0,0.18)";
  ctx.lineWidth=1.2;
  ctx.strokeRect(pad.left,pad.top,pw,ph);

  // Draw line
  if(chartData.length<2){
    // Single point: draw a dot
    var cx=pad.left+pw/2;
    var cy=pad.top+ph-(ph*(chartData[0].count/yMax));
    ctx.fillStyle="#8b0000";
    ctx.beginPath();
    ctx.arc(cx,cy,4,0,Math.PI*2);
    ctx.fill();
    // Value label
    ctx.fillStyle="#141414";
    ctx.font="bold 11px 'Times New Roman', Times, serif";
    ctx.textAlign="center";
    ctx.fillText(chartData[0].count,cx,cy-14);
  }else{
    // Build points
    var points=chartData.map(function(d,i){
      var x=pad.left+(pw*(i/(n-1)));
      var y=pad.top+ph-(ph*(d.count/yMax));
      return {x:x,y:y,count:d.count};
    });

    // Draw area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x,pad.top+ph);
    points.forEach(function(p){ctx.lineTo(p.x,p.y);});
    ctx.lineTo(points[points.length-1].x,pad.top+ph);
    ctx.closePath();
    ctx.fillStyle="rgba(139,0,0,0.08)";
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle="#8b0000";
    ctx.lineWidth=2;
    ctx.lineJoin="round";
    ctx.lineCap="round";
    points.forEach(function(p,i){
      if(i===0)ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    });
    ctx.stroke();

    // Draw dots
    points.forEach(function(p){
      ctx.fillStyle="#8b0000";
      ctx.beginPath();
      ctx.arc(p.x,p.y,3,0,Math.PI*2);
      ctx.fill();
      // White center
      ctx.fillStyle="#fff";
      ctx.beginPath();
      ctx.arc(p.x,p.y,1.2,0,Math.PI*2);
      ctx.fill();
    });

    // Value labels on first and last
    ctx.fillStyle="#141414";
    ctx.font="bold 10px 'Times New Roman', Times, serif";
    ctx.textAlign="center";
    ctx.fillText(points[0].count,points[0].x,points[0].y-12);
    ctx.fillText(points[points.length-1].count,points[points.length-1].x,points[points.length-1].y-12);
  }

  // Y-axis label
  ctx.save();
  ctx.translate(9,pad.top+ph/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillStyle="#595959";
  var yFont=LANG==='en'?"10px 'Times New Roman', Times, serif":"10px 'Noto Serif SC', serif";
  ctx.font=yFont;
  ctx.textAlign="center";
  ctx.fillText(t('chart.yLabel'),0,0);
  ctx.restore();

  // X-axis label
  ctx.fillStyle="#595959";
  var xFont=LANG==='en'?"9px 'Times New Roman', Times, serif":"9px 'Noto Serif SC', serif";
  ctx.font=xFont;
  ctx.textAlign="center";
  ctx.fillText(t('chart.xLabel'),pad.left+pw/2,h-3);
}
