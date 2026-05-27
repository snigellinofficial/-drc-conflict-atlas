/* =====================================================================
   FILTERS — 优化筛选:全选/反选/行为体多选/搜索/信息分离
   ===================================================================== */

function updateFilterState(){
  currentFilters.types=new Set();
  document.querySelectorAll("#filterTypes .chip.on").forEach(c=>currentFilters.types.add(c.dataset.value));
  currentFilters.severity=new Set();
  document.querySelectorAll("#filterSeverity .chip.on").forEach(c=>currentFilters.severity.add(c.dataset.value));
  currentFilters.actors=new Set();
  document.querySelectorAll("#filterActors .chip.on").forEach(c=>currentFilters.actors.add(c.dataset.value));
  currentFilters.province=document.getElementById("filterProvince")?.value||"";
  currentFilters.dateFrom=document.getElementById("dateFrom")?.value||"";
  currentFilters.dateTo=document.getElementById("dateTo")?.value||"";
}

function applyFilters(){
  updateFilterState();
  activeIncidents=INCIDENTS.filter(function(d){
    if(currentFilters.types.size>0&&!currentFilters.types.has(d.type))return false;
    if(currentFilters.severity.size>0&&!currentFilters.severity.has(d.severity))return false;
    if(currentFilters.actors.size>0&&!currentFilters.actors.has(d.actor1)&&!currentFilters.actors.has(d.actor2))return false;
    if(currentFilters.province&&d.province!==currentFilters.province)return false;
    if(currentFilters.dateFrom&&d.date<currentFilters.dateFrom)return false;
    if(currentFilters.dateTo&&d.date>currentFilters.dateTo)return false;
    return true;
  });
  renderMarkers();
  if(window.updateTimeline)window.updateTimeline();
  if(window.updateStats)window.updateStats();
  if(window.syncTimeSliderFromFilters)window.syncTimeSliderFromFilters();
  var fc=document.getElementById("filterCount");if(fc)fc.textContent=activeIncidents.length+" 条";
  var pc=document.getElementById("provCount");if(pc)pc.textContent=activeIncidents.length+" 条";
}

function selectAllTime(){
  var df=document.getElementById("dateFrom");
  var dt=document.getElementById("dateTo");
  if(df)df.value="2020-01-01";
  if(dt)dt.value=new Date().toISOString().slice(0,10);
  applyFilters();
}

function resetFilters(){
  document.querySelectorAll("#filterTypes .chip.on,#filterSeverity .chip.on,#filterActors .chip.on").forEach(function(c){c.classList.remove("on");});
  var selP=document.getElementById("filterProvince");if(selP)selP.value="";
  var df=document.getElementById("dateFrom");if(df)df.value=timeRange.start||"";
  var dt=document.getElementById("dateTo");if(dt)dt.value=timeRange.end||"";
  var as=document.getElementById("actorSearch");if(as)as.value="";filterActors("");
  currentFilters={types:new Set(),severity:new Set(),actors:new Set(),province:"",dateFrom:timeRange.start||"",dateTo:timeRange.end||""};
  activeIncidents=[...INCIDENTS];
  renderMarkers();
  if(window.updateTimeline)window.updateTimeline();
  if(window.updateStats)window.updateStats();
  var fc=document.getElementById("filterCount");if(fc)fc.textContent=activeIncidents.length+" 条";
  var pc=document.getElementById("provCount");if(pc)pc.textContent=activeIncidents.length+" 条";
  showToast("筛选已重置");
}

// === Chip toggle (multi-select for type/severity/actor) ===
function toggleChip(el,group){
  if(group==="actor"){
    el.classList.toggle("on");
  }else{
    el.classList.toggle("on");
  }
}

// === Select All / Deselect All ===
function selectAll(groupId){
  var chips=document.querySelectorAll("#"+groupId+" .chip:not(.small-btn):not(.action-btn)");
  var allOn=true;
  chips.forEach(function(c){if(!c.classList.contains("on"))allOn=false;});
  chips.forEach(function(c){
    if(allOn){c.classList.remove("on");}
    else{c.classList.add("on");}
  });
  applyFilters();
}

// === Invert selection ===
function invertSelection(groupId){
  var chips=document.querySelectorAll("#"+groupId+" .chip:not(.small-btn):not(.action-btn)");
  chips.forEach(function(c){c.classList.toggle("on");});
  applyFilters();
}

// === Actor search filter ===
function filterActors(query){
  var q=(query||"").toLowerCase();
  var chips=document.querySelectorAll("#filterActors .chip.actor-chip");
  chips.forEach(function(c){
    var text=c.dataset.value.toLowerCase();
    if(!q||text.includes(q)){
      c.style.display="inline-flex";
    }else{
      c.style.display="none";
      c.classList.remove("on");
    }
  });
}

// === Show actor info in sub-panel ===
function showActorBrief(actorName){
  var profile=ACTOR_PROFILES[actorName];
  if(!profile){
    showToast('"'+actorName+'" 暂无详细档案');
    return;
  }
  var overlay=document.getElementById("subOverlay");
  var panel=document.getElementById("subPanel");
  var body=document.getElementById("subPanelBody");
  var title=document.getElementById("subPanelTitle");
  title.innerHTML='<span style="color:var(--red);">&#9878;</span> '+profile.zh;
  body.innerHTML=`
    <div class="sp-section">
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <span class="sp-badge" style="background:var(--ink);color:#fff;">${profile.type}</span>
        <span class="sp-badge" style="background:var(--ink3);color:#fff;">活跃自 ${profile.active_since}</span>
        <span class="sp-badge" style="background:var(--red);color:#fff;">${profile.strength}</span>
      </div>
      <table class="sp-table">
        <tr><th style="width:80px;">英文名</th><td style="font-family:var(--en);font-style:italic;">${profile.name}</td></tr>
        <tr><th>活动区域</th><td>${profile.region}</td></tr>
        <tr><th>兵力估计</th><td>${profile.strength}</td></tr>
        <tr><th>盟友</th><td>${profile.allies}</td></tr>
        <tr><th>对手</th><td>${profile.opponents}</td></tr>
      </table>
    </div>
    <div class="sp-section">
      <h4>组织概况 / Profile</h4>
      <div class="sp-text"><p>${profile.desc}</p></div>
    </div>
    <div class="sp-section">
      <h4>信息来源 / Sources</h4>
      <p class="sp-source">
        ${profile.sources.map(function(s){return '&#128218; '+s;}).join("<br>")}
        ${profile.wiki?'<br><br>&#128214; <a href="'+profile.wiki+'" target="_blank" rel="noopener">Wikipedia 条目 &nearr;</a>':''}
      </p>
    </div>
  `;
  overlay.classList.add("open");
  panel.classList.add("open");
}

// === Init filter UI ===
function initFilterUI(){
  // --- Type chips ---
  var typeDiv=document.getElementById("filterTypes");
  if(!typeDiv)return;
  typeDiv.innerHTML="";
  for(var typeKey in CONFLICT_TYPES){
    var cfg=CONFLICT_TYPES[typeKey];
    var span=document.createElement("span");
    span.className="chip type-"+typeKey;
    span.textContent=cfg.zh;
    span.dataset.value=typeKey;
    span.onclick=function(){toggleChip(this,"type");};
    typeDiv.appendChild(span);
  }

  // --- Severity chips ---
  var sevDiv=document.getElementById("filterSeverity");
  sevDiv.innerHTML="";
  for(var sevKey in SEVERITY_LEVELS){
    var cfg2=SEVERITY_LEVELS[sevKey];
    var span2=document.createElement("span");
    span2.className="chip sev-"+sevKey;
    span2.textContent=cfg2.zh;
    span2.dataset.value=sevKey;
    span2.onclick=function(){toggleChip(this,"severity");};
    sevDiv.appendChild(span2);
  }

  // --- Province select ---
  var selP=document.getElementById("filterProvince");
  selP.innerHTML='<option value="">全部 26 省</option>';
  for(var provKey in DRC_PROVINCES){
    var val=DRC_PROVINCES[provKey];
    var o=document.createElement("option");o.value=provKey;o.textContent=val.zh+"  "+val.en;selP.appendChild(o);
  }

  // --- Actor chips with info buttons ---
  var actorDiv=document.getElementById("filterActors");
  actorDiv.innerHTML="";

  // Actor search box
  var searchBox=document.createElement("input");
  searchBox.type="text";
  searchBox.className="actor-search";
  searchBox.id="actorSearch";
  searchBox.placeholder="搜索行为体 / Search actors...";
  searchBox.oninput=function(){filterActors(this.value);};
  actorDiv.appendChild(searchBox);

  // Actor chips container
  var chipsWrap=document.createElement("div");
  chipsWrap.className="filter-row";
  chipsWrap.id="actorChipsWrap";

  var allActors=[...new Set(INCIDENTS.flatMap(function(d){return [d.actor1,d.actor2];}))]
    .filter(function(a){return a!=="N/A"&&a!=="平民"&&a!=="政府"&&a!=="民众"&&a!=="矿工工会"&&a!=="矿业公司"&&a!=="警方";})
    .sort();

  allActors.forEach(function(a){
    var hasProfile=!!ACTOR_PROFILES[a];

    var wrapper=document.createElement("span");
    wrapper.style.display="inline-flex";wrapper.style.alignItems="center";wrapper.style.gap="2px";

    var span=document.createElement("span");
    span.className="chip actor-chip";
    span.textContent=a;
    span.dataset.value=a;
    span.title="筛选包含 "+a+" 的事件";
    span.onclick=function(e){
      toggleChip(this,"actor");
      e.stopPropagation();
    };
    wrapper.appendChild(span);

    // Info button — separate from selection
    if(hasProfile){
      var infoBtn=document.createElement("span");
      infoBtn.className="actor-info-btn";
      infoBtn.textContent="i";
      infoBtn.title="查看 "+a+" 详细档案";
      infoBtn.onclick=function(e){
        e.stopPropagation();
        showActorBrief(a);
      };
      wrapper.appendChild(infoBtn);
    }

    chipsWrap.appendChild(wrapper);
  });

  actorDiv.appendChild(chipsWrap);

  // Actor count
  var actorCount=document.createElement("div");
  actorCount.style.cssText="font-size:10px;color:var(--ink3);margin-top:4px;font-family:var(--en);";
  actorCount.textContent=allActors.length+" 个行为体";
  actorDiv.appendChild(actorCount);

  // Default: all actor chips selected
  setTimeout(function(){
    document.querySelectorAll("#filterActors .chip.actor-chip").forEach(function(c){c.classList.add("on");});
    updateFilterState();
  },100);
}

// Expose globals
window.showActorBrief=showActorBrief;
window.selectAll=selectAll;
window.invertSelection=invertSelection;
window.filterActors=filterActors;
window.selectAllTime=selectAllTime;
