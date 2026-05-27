/* =====================================================================
   MAP — Leaflet 地图、DRC省份GeoJSON、标记渲染、交互
   省份视图 · 自适应标签 · 时间轴联动 · 弹窗栈
   ===================================================================== */
let map, markerCluster, provinceLayer, activeIncidents=[...INCIDENTS];
let currentFilters={types:new Set(),severity:new Set(),actors:new Set(),province:"",dateFrom:"",dateTo:""};
let provinceData=null;
let selectedProvince=null;
let provinceLabelsGroup=L.layerGroup();

// Active time range (default: last 3 months)
let timeRange={start:"",end:""};

function getDefaultTimeRange(){
  var now=new Date();
  var d=new Date(now.getFullYear(), now.getMonth()-3, now.getDate());
  var end=now.toISOString().slice(0,10);
  var start=d.toISOString().slice(0,10);
  return {start:start,end:end};
}

function initMap(){
  var tr=getDefaultTimeRange();
  timeRange.start=tr.start;
  timeRange.end=tr.end;
  currentFilters.dateFrom=tr.start;
  currentFilters.dateTo=tr.end;

  map=L.map("map",{
    center:[-3.5, 24.5],
    zoom:6,
    minZoom:5,
    maxZoom:11,
    zoomControl:true,
    attributionControl:true
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{
    attribution:'&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom:19
  }).addTo(map);

  markerCluster=L.markerClusterGroup({
    chunkedLoading:true,
    maxClusterRadius:30,
    iconCreateFunction:function(cluster){
      var count=cluster.getChildCount();
      var cls="marker-cluster-small";
      if(count>=20)cls="marker-cluster-large";
      else if(count>=10)cls="marker-cluster-medium";
      return L.divIcon({html:'<div><span>'+count+'</span></div>',className:cls,iconSize:L.point(40,40)});
    }
  });
  map.addLayer(markerCluster);

  loadProvinceLayer();
  buildMapLegend();
  initTimeSlider();

  // Update time-display province fills on zoom/move
  map.on("zoomend", updateLabelVisibility);
  map.on("zoomend", refreshProvinceStyles);
}

// ===================== PROVINCE LAYER =====================

async function loadProvinceLayer(){
  try{
    if(typeof DRC_PROVINCES_GEOJSON!=="undefined"){
      provinceData=DRC_PROVINCES_GEOJSON;
    }else{
      var resp=await fetch("data/drc_provinces.json");
      if(!resp.ok)throw new Error("Province GeoJSON not available");
      provinceData=await resp.json();
    }

    // Interactive province layer
    provinceLayer=L.geoJSON(provinceData,{
      style:function(feature){
        return getProvinceStyle(feature.properties.name);
      },
      onEachFeature:function(feature,layer){
        var name=feature.properties.name;

        // Click → open province summary in sub-panel (does NOT filter conflicts)
        layer.on("click",function(e){
          if(selectedProvince===name){
            // Deselect
            selectedProvince=null;
            refreshProvinceStyles();
            return;
          }
          selectedProvince=name;
          refreshProvinceStyles();
          map.fitBounds(layer.getBounds(),{padding:[60,60],maxZoom:9});
          showProvinceSummary(name);
        });

        // Hover highlight
        layer.on("mouseover",function(){
          if(selectedProvince===name)return;
          layer.setStyle({fillOpacity:0.28,weight:2.8,color:"#2a1000"});
          layer.bringToFront();
        });
        layer.on("mouseout",function(){
          if(selectedProvince===name)return;
          layer.setStyle(getProvinceStyle(name));
        });
      }
    }).addTo(map);

    // National border (thick outline, weight ~4.5)
    L.geoJSON(provinceData,{
      style:{color:"#1a0a00",weight:4.5,fill:false,opacity:0.62,dashArray:null},
      interactive:false
    }).addTo(map);
    provinceLayer.bringToFront();

    // Province labels — zoom-dependent, no border
    provinceLabelsGroup.addTo(map);
    updateLabelVisibility();

    showToast("DRC 26省行政区划已加载 — 点击省份互动");

    var hint=L.divIcon({className:"map-hint",html:'<div style="text-align:center;">点击任意省份<br>查看冲突详情</div>',iconSize:[160,44],iconAnchor:[80,22]});
    var hintMarker=L.marker([-4.5,24.5],{icon:hint,interactive:false}).addTo(map);
    setTimeout(function(){map.removeLayer(hintMarker);},5000);
  }catch(e){
    console.warn("Province layer not loaded:",e.message);
    showToast("省级地图加载失败，请检查网络连接");
  }
}

function getProvinceStyle(name){
  var hasIncidents=timeRange.start&&timeRange.end
    ? activeIncidents.some(function(d){return d.province===name&&d.date>=timeRange.start&&d.date<=timeRange.end;})
    : activeIncidents.some(function(d){return d.province===name;});
  var isSelected=selectedProvince===name;
  return {
    color: isSelected ? "#1a0a00" : (hasIncidents ? "#5a0000" : "#8a7a6a"),
    weight: isSelected ? 2.8 : 1.5,
    fillColor: isSelected ? "#d4a08a" : (hasIncidents ? "#8b2020" : "#e8dcc8"),
    fillOpacity: isSelected ? 0.42 : (hasIncidents ? 0.24 : 0.06),
    opacity: isSelected ? 1.0 : 0.78,
    dashArray: null
  };
}

function refreshProvinceStyles(){
  if(!provinceLayer)return;
  provinceLayer.eachLayer(function(layer){
    layer.setStyle(getProvinceStyle(layer.feature.properties.name));
  });
}

// ===================== ZOOM-DEPENDENT LABELS =====================

function updateLabelVisibility(){
  provinceLabelsGroup.clearLayers();
  var zoom=map.getZoom();

  // Show labels at zoom >= 9 (~1:140,000 scale, exceeds 1:200,000 requirement)
  if(zoom<9||!provinceData)return;

  provinceData.features.forEach(function(feat){
    var name=feat.properties.name;
    var pInfo=DRC_PROVINCES[name];
    if(!pInfo)return;
    try{
      var geoLayer=L.geoJSON(feat);
      var center=geoLayer.getBounds().getCenter();
      var bounds=geoLayer.getBounds();
      var area=(bounds.getEast()-bounds.getWest())*(bounds.getNorth()-bounds.getSouth());
      if(area>0.02){
        L.marker(center,{
          icon:L.divIcon({
            className:"province-label-wrap",
            html:'<div class="province-label-inner"><span class="province-label">'+pInfo.zh+'</span><br><span class="province-label-en">'+pInfo.en+'</span></div>',
            iconSize:[120,24],
            iconAnchor:[60,12]
          }),
          interactive:false
        }).addTo(provinceLabelsGroup);
      }
    }catch(e){}
  });
}

// ===================== PROVINCE SUMMARY SUB-PANEL =====================

function showProvinceSummary(provinceName){
  var pInfo=DRC_PROVINCES[provinceName]||{zh:provinceName,en:provinceName};
  // Province shows ALL incidents regardless of current time filter
  var provIncidents=INCIDENTS.filter(function(d){return d.province===provinceName;});
  var fatalTotal=provIncidents.reduce(function(s,d){return s+(d.fatalities||0);},0);
  var types={};
  provIncidents.forEach(function(d){if(!types[d.type])types[d.type]=0;types[d.type]++;});

  if(provIncidents.length===0){
    showToast(pInfo.zh+": 暂无冲突事件记录");
    return;
  }

  var titleHtml='&#128205; '+pInfo.zh+' <span style="font-size:13px;font-weight:400;font-family:var(--en);font-style:italic;">'+pInfo.en+'</span>';
  var bodyHtml='<div class="sp-section">'+
    '<table class="sp-table">'+
      '<tr><th>指标</th><th>数值</th></tr>'+
      '<tr><td>历史事件总数</td><td style="font-weight:700;">'+provIncidents.length+'</td></tr>'+
      '<tr><td>估计累计死亡</td><td style="color:var(--red);font-weight:700;">'+fatalTotal+'</td></tr>'+
      '<tr><td>冲突类型分布</td><td>'+Object.entries(types).sort(function(a,b){return b[1]-a[1];}).map(function(e){return CONFLICT_TYPES[e[0]].zh+'('+e[1]+')';}).join(" &middot; ")+'</td></tr>'+
      '<tr><td>涉及行为体</td><td>'+[...new Set(provIncidents.flatMap(function(d){return [d.actor1,d.actor2];}))].filter(function(a){return a!=="平民"&&a!=="N/A";}).join("、")+'</td></tr>'+
    '</table></div>'+
    '<div class="sp-section"><h4>最近事件 / Recent Incidents</h4>'+
    provIncidents.sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,8).map(function(d){
      return '<div class="report-card" onclick="flyToIncident(\''+d.id+'\')" style="cursor:pointer;">'+
        '<div class="rc-date">'+d.date+' &middot; '+SEVERITY_LEVELS[d.severity].zh+'度</div>'+
        '<div class="rc-title">'+d.title+'</div>'+
        '<div class="rc-desc">死亡: '+(d.fatalities||0)+' &middot; '+CONFLICT_TYPES[d.type].zh+' &middot; '+d.actor1+' vs '+d.actor2+'</div>'+
      '</div>';
    }).join("")+'</div>';

  pushDrawer(titleHtml, bodyHtml, 'province-'+provinceName);
}

// ===================== TIME SLIDER =====================

function initTimeSlider(){
  var wrap=document.getElementById("timeSliderWrap");
  if(!wrap){
    wrap=document.createElement("div");
    wrap.id="timeSliderWrap";
    wrap.className="time-slider-wrap";
    wrap.innerHTML=
      '<div class="ts-label">时段 / Period</div>'+
      '<div class="ts-row">'+
        '<button class="ts-btn-preset" id="tsAllBtn" title="选择全部时段">全部</button>'+
        '<button class="ts-btn-preset" id="ts3mBtn" title="最近三个月">3月</button>'+
        '<button class="ts-btn-preset" id="ts1yBtn" title="最近一年">1年</button>'+
        '<button class="ts-btn-preset" id="ts5yBtn" title="最近五年">5年</button>'+
      '</div>'+
      '<div class="ts-row ts-dates">'+
        '<input type="date" id="tsDateFrom" class="ts-date" />'+
        '<span class="ts-sep">&mdash;</span>'+
        '<input type="date" id="tsDateTo" class="ts-date" />'+
      '</div>'+
      '<div class="ts-info" id="tsInfo"></div>';
    document.querySelector(".map-wrap").appendChild(wrap);
    wrap.style.display="block";

    // Set initial values
    document.getElementById("tsDateFrom").value=timeRange.start;
    document.getElementById("tsDateTo").value=timeRange.end;

    // Preset buttons
    document.getElementById("tsAllBtn").addEventListener("click",function(){
      setTimeRange("2020-01-01","2026-12-31");
    });
    document.getElementById("ts3mBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear(),now.getMonth()-3,now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts1yBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear()-1,now.getMonth(),now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts5yBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear()-5,now.getMonth(),now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });

    // Date input change → sync
    document.getElementById("tsDateFrom").addEventListener("change",function(){
      var from=this.value;
      var to=document.getElementById("tsDateTo").value;
      if(from&&to&&from<=to){setTimeRange(from,to);}
    });
    document.getElementById("tsDateTo").addEventListener("change",function(){
      var from=document.getElementById("tsDateFrom").value;
      var to=this.value;
      if(from&&to&&from<=to){setTimeRange(from,to);}
    });

    updateTimeSliderInfo();
  }
}

function setTimeRange(from, to){
  timeRange.start=from;
  timeRange.end=to;
  currentFilters.dateFrom=from;
  currentFilters.dateTo=to;

  // Sync all time inputs
  var elFrom=document.getElementById("tsDateFrom");
  var elTo=document.getElementById("tsDateTo");
  var fFrom=document.getElementById("dateFrom");
  var fTo=document.getElementById("dateTo");
  if(elFrom)elFrom.value=from;
  if(elTo)elTo.value=to;
  if(fFrom)fFrom.value=from;
  if(fTo)fTo.value=to;

  applyFilters();
  refreshProvinceStyles();
  updateTimeSliderInfo();
}

function updateTimeSliderInfo(){
  var info=document.getElementById("tsInfo");
  if(!info)return;
  var count=activeIncidents.filter(function(d){
    return d.date>=timeRange.start&&d.date<=timeRange.end;
  }).length;
  info.textContent='匹配: '+count+' 条事件';
}

// Sync from filter panel back to time slider
function syncTimeSliderFromFilters(){
  if(currentFilters.dateFrom&&currentFilters.dateTo){
    timeRange.start=currentFilters.dateFrom;
    timeRange.end=currentFilters.dateTo;
  }
  var elFrom=document.getElementById("tsDateFrom");
  var elTo=document.getElementById("tsDateTo");
  if(elFrom)elFrom.value=timeRange.start;
  if(elTo)elTo.value=timeRange.end;
  updateTimeSliderInfo();
}

// ===================== DRAWER STACK =====================

var drawerStack=[];

function pushDrawer(titleHtml, bodyHtml, contextId){
  var overlay=document.getElementById("subOverlay");
  var panel=document.getElementById("subPanel");
  var title=document.getElementById("subPanelTitle");
  var body=document.getElementById("subPanelBody");

  // Save current state to stack
  if(overlay.classList.contains("open")){
    drawerStack.push({
      title:title.innerHTML,
      body:body.innerHTML,
      contextId:contextId||""
    });
  }

  title.innerHTML=titleHtml;
  body.innerHTML=bodyHtml;
  overlay.classList.add("open");
  panel.classList.add("open");

  updateBackButton();
}

function popDrawer(){
  if(drawerStack.length>0){
    var prev=drawerStack.pop();
    var title=document.getElementById("subPanelTitle");
    var body=document.getElementById("subPanelBody");
    title.innerHTML=prev.title;
    body.innerHTML=prev.body;
    updateBackButton();
  }else{
    var overlay=document.getElementById("subOverlay");
    var panel=document.getElementById("subPanel");
    overlay.classList.remove("open");
    panel.classList.remove("open");
    updateBackButton();
  }
}

function updateBackButton(){
  var btn=document.getElementById("subPanelBack");
  if(!btn)return;
  if(drawerStack.length>0){
    btn.style.display="flex";
    btn.title="返回上一级 ("+drawerStack.length+"级)";
  }else{
    btn.style.display="none";
  }
}

// ===================== MARKERS =====================

function createMarker(inc){
  var sev=SEVERITY_LEVELS[inc.severity];
  var type=CONFLICT_TYPES[inc.type];
  var marker=L.circleMarker([inc.lat,inc.lng],{
    radius: sev.size + 3,
    fillColor: type.color,
    color: "#1a0a00",
    weight: 2.2,
    opacity: 0.9,
    fillOpacity: 0.82
  });

  marker.bindPopup(
    '<div style="max-width:280px;">'+
      '<div style="display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap;">'+
        '<span class="sp-badge" style="background:'+type.color+';color:#fff;">'+type.zh+'</span>'+
        '<span class="sp-badge" style="background:'+sev.color+';color:#fff;">'+sev.zh+'</span>'+
        (inc.verified?'<span class="sp-badge" style="background:var(--green);color:#fff;">已验证</span>':'')+
      '</div>'+
      '<div style="font-weight:700;font-size:13px;margin-bottom:3px;">'+inc.title+'</div>'+
      '<div style="font-size:10px;color:var(--ink3);line-height:1.5;">'+inc.province+' &middot; '+inc.city+' &middot; '+inc.country+'</div>'+
      '<div style="font-size:10px;color:var(--ink3);line-height:1.5;">'+inc.date+' &middot; '+inc.actor1+' vs '+inc.actor2+'</div>'+
      '<div style="font-size:10px;color:var(--ink3);line-height:1.5;">死亡: <b style="color:var(--red)">'+(inc.fatalities||0)+'</b></div>'+
      '<button onclick="if(window.openDrawer)window.openDrawer(\''+inc.id+'\')" style="margin-top:6px;font-size:10px;padding:4px 12px;border-radius:2px;cursor:pointer;background:var(--accent);color:var(--paper1);border:none;font-weight:600;font-family:var(--zh);">查看详情 &rarr;</button>'+
    '</div>'
  );
  marker.incidentId=inc.id;
  marker.on("click",function(){if(window.openDrawer)window.openDrawer(inc.id);});
  return marker;
}

function renderMarkers(){
  markerCluster.clearLayers();
  activeIncidents.forEach(function(inc){
    markerCluster.addLayer(createMarker(inc));
  });
  if(window.updateEventList)window.updateEventList();

  refreshProvinceStyles();
}

function flyToIncident(id){
  var inc=INCIDENTS.find(function(d){return d.id===id;});
  if(inc){
    map.flyTo([inc.lat,inc.lng],8,{duration:1.2});
    setTimeout(function(){if(window.openDrawer)window.openDrawer(inc.id);},1300);
  }
}

// ===================== MAP LEGEND =====================

function buildMapLegend(){
  var div=document.createElement("div");
  div.className="map-legend";
  div.innerHTML='<h4>冲突类型 / Type</h4>'+
    Object.entries(CONFLICT_TYPES).map(function(e){return '<div class="leg-row"><span class="leg-dot" style="background:'+e[1].color+'"></span>'+e[1].zh+'</div>';}).join("")+
    '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--hair);font-size:10px;color:var(--ink3);line-height:1.6;">'+
    '<b>点击省份</b> → 查看省份概况<br>点击标记 → 查看事件详情<br>'+
    '<span style="display:inline-block;width:10px;height:10px;border:2px solid #5a0000;background:rgba(139,32,32,.24);margin-right:4px;"></span> 时段内有冲突 '+
    '<span style="display:inline-block;width:10px;height:10px;border:2.5px solid #1a0a00;background:rgba(212,160,138,.5);margin-right:4px;"></span> 已选省份</div>';
  document.querySelector(".map-wrap").appendChild(div);
}
