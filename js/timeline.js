/* =====================================================================
   TIMELINE & EVENT LIST — 时间轴 + 事件列表(含排序/分组)
   ===================================================================== */

// ==================== EVENT LIST ====================

function updateEventList(){
  var el=document.getElementById("eventList");
  if(!el)return;

  var sortBy=document.getElementById("evtSort")?.value||"date-desc";
  var groupBy=document.getElementById("evtGroup")?.value||"none";

  var sorted=[...activeIncidents];
  switch(sortBy){
    case "date-desc": sorted.sort(function(a,b){return b.date.localeCompare(a.date);});break;
    case "date-asc":  sorted.sort(function(a,b){return a.date.localeCompare(b.date);});break;
    case "fatalities-desc": sorted.sort(function(a,b){return (b.fatalities||0)-(a.fatalities||0);});break;
    case "severity":
      var sevOrder={critical:0,high:1,medium:2,low:3};
      sorted.sort(function(a,b){return (sevOrder[a.severity]||4)-(sevOrder[b.severity]||4);});
      break;
  }

  var ec=document.getElementById("evtCount");
  if(ec)ec.textContent=sorted.length+" 条";

  if(groupBy==="none"){
    el.innerHTML=sorted.map(renderEventItem).join("");
  }else if(groupBy==="year"){
    var groups={};
    sorted.forEach(function(d){
      var y=d.date.slice(0,4);
      if(!groups[y])groups[y]=[];
      groups[y].push(d);
    });
    var html="";
    Object.keys(groups).sort().reverse().forEach(function(y){
      var items=groups[y];
      var totalFatal=items.reduce(function(s,d){return s+(d.fatalities||0);},0);
      html+='<div class="evt-group-header">'+y+' 年 &mdash; '+items.length+' 事件 · '+totalFatal+' 死亡</div>';
      html+=items.map(renderEventItem).join("");
    });
    el.innerHTML=html;
  }else if(groupBy==="province"){
    var g2={};
    sorted.forEach(function(d){
      var p=d.province||"未知";
      if(!g2[p])g2[p]=[];
      g2[p].push(d);
    });
    var html2="";
    Object.entries(g2).sort(function(a,b){return b[1].length-a[1].length;}).forEach(function(e){
      var pName=DRC_PROVINCES[e[0]]?DRC_PROVINCES[e[0]].zh:e[0];
      html2+='<div class="evt-group-header">'+pName+' ('+e[1].length+' 事件)</div>';
      html2+=e[1].map(renderEventItem).join("");
    });
    el.innerHTML=html2;
  }
}

function renderEventItem(d){
  var tc=CONFLICT_TYPES[d.type];
  var sc=SEVERITY_LEVELS[d.severity];
  var fatalColor=d.fatalities>20?"var(--red)":d.fatalities>0?"var(--red2)":"var(--muted)";
  var provName=DRC_PROVINCES[d.province]?DRC_PROVINCES[d.province].zh:d.province||"";
  return '<div class="evt-item" onclick="flyToIncident(\''+d.id+'\')">'+
    '<span class="evt-dot" style="background:'+tc.color+'"></span>'+
    '<div class="evt-info">'+
      '<div class="evt-title" title="'+d.title.replace(/"/g,"&quot;")+'">'+d.title+'</div>'+
      '<div class="evt-meta">'+provName+' &middot; '+d.date+' &middot; '+tc.zh+'</div>'+
    '</div>'+
    '<span class="evt-fatal" style="color:'+fatalColor+'">'+(d.fatalities||0)+'</span>'+
  '</div>';
}

// ==================== TIMELINE ====================

function updateTimeline(){
  var tl=document.getElementById("tlContent");
  if(!tl)return;

  var sortBy=document.getElementById("tlSort")?.value||"date-desc";

  var sorted=[...activeIncidents].sort(function(a,b){return b.date.localeCompare(a.date);});

  if(sortBy==="date-asc"){
    sorted.reverse();
  }else if(sortBy==="critical"){
    sorted=sorted.filter(function(d){return d.severity==="critical"||d.severity==="high";});
  }

  var tc=document.getElementById("tlCount");
  if(tc)tc.textContent=sorted.length+" 条";

  tl.innerHTML=sorted.slice(0,60).map(function(d){
    var cfg=CONFLICT_TYPES[d.type];
    return '<div class="tl-item" onclick="flyToIncident(\''+d.id+'\')">'+
      '<span class="tl-dot" style="background:'+cfg.color+'"></span>'+
      '<span class="tl-date">'+d.date.slice(2)+'</span>'+
      '<span class="tl-text">'+d.title+'</span>'+
    '</div>';
  }).join("");
}
