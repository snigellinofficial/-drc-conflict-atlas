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
  var end=now.toISOString().slice(0,10);
  var start="2020-01-01";
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

  // Scale bar — positioned above legend
  L.control.scale({
    metric:true, imperial:false, maxWidth:180, position:'bottomleft',
    updateWhenIdle:true
  }).addTo(map);

  loadProvinceLayer();
  buildMapLegend();
  initTimeSlider();

  map.on("zoomend", updateLabelVisibility);
  map.on("zoomend", updateCityVisibility);
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
          layer.setStyle({fillOpacity:0.32,weight:2.0,color:"#2a1000"});
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

    showToast(t('toast.provLoaded'));
  }catch(e){
    console.warn("Province layer not loaded:",e.message);
    showToast(t('toast.provFail'));
  }
}

function getProvinceStyle(name){
  var hasIncidents=timeRange.start&&timeRange.end
    ? activeIncidents.some(function(d){return d.province===name&&d.date>=timeRange.start&&d.date<=timeRange.end;})
    : activeIncidents.some(function(d){return d.province===name;});
  var isSelected=selectedProvince===name;
  return {
    color: isSelected ? "#1a0a00" : (hasIncidents ? "#5a0000" : "#9a8a7a"),
    weight: isSelected ? 2.8 : (hasIncidents ? 1.0 : 0.6),
    fillColor: isSelected ? "#d4a08a" : (hasIncidents ? "#8b2020" : "#e0d8c8"),
    fillOpacity: isSelected ? 0.42 : (hasIncidents ? 0.22 : 0.13),
    opacity: isSelected ? 1.0 : 0.72,
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

var cityLabelsGroup=L.layerGroup();
cityLabelsGroup.addTo(map);

function updateLabelVisibility(){
  provinceLabelsGroup.clearLayers();
  var zoom=map.getZoom();

  // Province labels at zoom >= 9 (~1:250,000 scale) — avoids overlap
  if(zoom>=9&&provinceData){
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
              html:'<div class="province-label-inner"><span class="province-label">'+(LANG==='en'?pInfo.en:pInfo.zh)+'</span>'+(LANG==='en'?'<br><span class="province-label-en">'+pInfo.zh+'</span>':'<br><span class="province-label-en">'+pInfo.en+'</span>')+'</div>',
              iconSize:[120,24],
              iconAnchor:[60,12]
            }),
            interactive:false
          }).addTo(provinceLabelsGroup);
        }
      }catch(e){}
    });
  }
}

function updateCityVisibility(){
  cityLabelsGroup.clearLayers();
  var zoom=map.getZoom();

  // City labels at zoom >= 10 (~1:100,000 scale) — avoids overlap with province labels
  if(zoom<10)return;

  // Collect unique cities from active incidents
  var seen={};
  activeIncidents.forEach(function(inc){
    if(inc.city&&inc.city!=='Unknown'&&!seen[inc.city]){
      seen[inc.city]=[inc.lat,inc.lng];
    }
  });

  Object.keys(seen).forEach(function(city){
    L.marker([seen[city][0],seen[city][1]],{
      icon:L.divIcon({
        className:"city-label-wrap",
        html:'<div class="city-label">'+city+'</div>',
        iconSize:[80,14],
        iconAnchor:[40,7]
      }),
      interactive:false
    }).addTo(cityLabelsGroup);
  });
}

// ===================== PROVINCE SUMMARY SUB-PANEL =====================

function showProvinceSummary(provinceName){
  var pInfo=DRC_PROVINCES[provinceName]||{zh:provinceName,en:provinceName};
  var provIncidents=INCIDENTS.filter(function(d){return d.province===provinceName;});
  var fatalTotal=provIncidents.reduce(function(s,d){return s+(d.fatalities||0);},0);
  var types={};
  provIncidents.forEach(function(d){if(!types[d.type])types[d.type]=0;types[d.type]++;});

  if(provIncidents.length===0){
    showToast(getProvinceDisplayName(provinceName)+': '+t('prov.noData'));
    return;
  }

  var pDisplay=LANG==='en'?pInfo.en:pInfo.zh;
  var pSub=LANG==='en'?pInfo.zh:pInfo.en;
  var titleHtml='&#128205; '+pDisplay+' <span style="font-size:13px;font-weight:400;font-family:var(--en);font-style:italic;">'+pSub+'</span>';

  // Actor frequency
  var actorFreq={}, filterList=['平民','N/A','政府','民众','警方','矿工工会','矿业公司'];
  provIncidents.forEach(function(d){
    [d.actor1,d.actor2].forEach(function(a){
      if(!a||filterList.indexOf(a)!==-1)return;
      if(!actorFreq[a])actorFreq[a]=0;
      actorFreq[a]++;
    });
  });
  var sortedActors=Object.entries(actorFreq).sort(function(a,b){return b[1]-a[1];});
  var top5=sortedActors.slice(0,5);
  var rest=sortedActors.slice(5);
  var uid='ae-'+provinceName.replace(/[^a-zA-Z0-9]/g,'');
  var actorHtml=top5.map(function(e){
    return '<span class="actor-chip">'+e[0]+'<span class="chip-count">'+e[1]+'</span></span>';
  }).join('');
  if(rest.length>0){
    var restHtml=rest.map(function(e){
      return '<span class="actor-chip">'+e[0]+'<span class="chip-count">'+e[1]+'</span></span>';
    }).join('');
    actorHtml+=' <span class="actor-expand-btn" id="'+uid+'" onclick="toggleHiddenActors(\''+uid+'\')">... ('+rest.length+' '+t('prov.more')+')</span>';
    actorHtml+='<span class="actor-hidden" id="'+uid+'-h">'+restHtml+'</span>';
  }

  var bodyHtml='<div class="sp-section">'+
    '<table class="sp-table sp-table-province">'+
      '<tr><th>'+t('prov.metric')+'</th><th>'+t('prov.value')+'</th></tr>'+
      '<tr><td>'+t('prov.totalEvents')+'</td><td style="font-weight:700;">'+provIncidents.length+'</td></tr>'+
      '<tr><td>'+t('prov.totalDeaths')+'</td><td style="color:var(--red);font-weight:700;">'+fatalTotal+'</td></tr>'+
      '<tr><td>'+t('prov.typeDist')+'</td><td>'+Object.entries(types).sort(function(a,b){return b[1]-a[1];}).map(function(e){return getConflictTypeName(e[0])+'('+e[1]+')';}).join(' &middot; ')+'</td></tr>'+
      '<tr><td>'+t('prov.actors')+'</td><td>'+actorHtml+'</td></tr>'+
    '</table></div>'+
    '<div class="sp-section"><h4>'+t('prov.recent')+'</h4>'+
    provIncidents.sort(function(a,b){return b.date.localeCompare(a.date);}).slice(0,8).map(function(d){
      var loc=localizeEvent(d);
      return '<div class="report-card" onclick="flyToIncident(\''+d.id+'\')" style="cursor:pointer;">'+
        '<div class="rc-date">'+d.date+' &middot; '+getSeverityName(d.severity)+(LANG==='zh'?'度':'')+'</div>'+
        '<div class="rc-title">'+loc.title+'</div>'+
        '<div class="rc-desc">'+t('prov.deaths')+' '+(d.fatalities||0)+' &middot; '+getConflictTypeName(d.type)+' &middot; '+d.actor1+' vs '+d.actor2+'</div>'+
      '</div>';
    }).join('')+'</div>';

  pushDrawer(titleHtml, bodyHtml, 'province-'+provinceName);
}

function toggleHiddenActors(id){
  var btn=document.getElementById(id);
  var hidden=document.getElementById(id+'-h');
  if(!btn||!hidden)return;
  if(hidden.style.display==='inline'||hidden.style.display===''){
    hidden.style.display='none';
    btn.textContent='... ('+hidden.querySelectorAll('.actor-chip').length+' '+t('prov.more')+')';
  }else{
    hidden.style.display='inline';
    btn.textContent=' ('+t('prov.collapse')+')';
  }
}

// ===================== TIME SLIDER =====================

function initTimeSlider(){
  var wrap=document.getElementById("timeSliderWrap");
  if(!wrap){
    wrap=document.createElement("div");
    wrap.id="timeSliderWrap";
    wrap.className="time-slider-wrap";
    wrap.innerHTML=
      '<div class="ts-label">'+t('ts.label')+'</div>'+
      '<div class="ts-row" style="flex-wrap:wrap;">'+
        '<button class="ts-btn-preset" id="ts1mBtn">'+t('ts.1m')+'</button>'+
        '<button class="ts-btn-preset" id="ts3mBtn">'+t('ts.3m')+'</button>'+
        '<button class="ts-btn-preset" id="ts6mBtn">'+t('ts.6m')+'</button>'+
        '<button class="ts-btn-preset" id="ts1yBtn">'+t('ts.1y')+'</button>'+
        '<button class="ts-btn-preset" id="ts3yBtn">'+t('ts.3y')+'</button>'+
        '<button class="ts-btn-preset" id="ts5yBtn">'+t('ts.5y')+'</button>'+
        '<button class="ts-btn-preset" id="tsAllBtn">'+t('ts.all')+'</button>'+
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
    document.getElementById("ts1mBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear(),now.getMonth()-1,now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts3mBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear(),now.getMonth()-3,now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts6mBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear(),now.getMonth()-6,now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts1yBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear()-1,now.getMonth(),now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts3yBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear()-3,now.getMonth(),now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("ts5yBtn").addEventListener("click",function(){
      var now=new Date();
      var d=new Date(now.getFullYear()-5,now.getMonth(),now.getDate());
      setTimeRange(d.toISOString().slice(0,10),now.toISOString().slice(0,10));
    });
    document.getElementById("tsAllBtn").addEventListener("click",function(){
      setTimeRange("2020-01-01",new Date().toISOString().slice(0,10));
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
  info.textContent=t('ts.match')+' '+count+t('ts.unit');
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

function closeAllDrawers(){
  drawerStack=[];
  var overlay=document.getElementById("subOverlay");
  var panel=document.getElementById("subPanel");
  overlay.classList.remove("open");
  panel.classList.remove("open");
  updateBackButton();
}

function updateBackButton(){
  var btn=document.getElementById("subPanelBack");
  if(!btn)return;
  if(drawerStack.length>0){
    btn.style.display="flex";
    btn.title=t('back')+" ("+drawerStack.length+")";
  }else{
    btn.style.display="none";
  }
}

// ===================== MARKERS =====================

function createMarker(inc){
  var sev=SEVERITY_LEVELS[inc.severity];
  var type=CONFLICT_TYPES[inc.type];
  var loc=localizeEvent(inc);
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
        '<span class="sp-badge" style="background:'+type.color+';color:#fff;">'+getConflictTypeName(inc.type)+'</span>'+
        '<span class="sp-badge" style="background:'+sev.color+';color:#fff;">'+getSeverityName(inc.severity)+'</span>'+
        (inc.verified?'<span class="sp-badge" style="background:var(--green);color:#fff;">'+t('drawer.verified')+'</span>':'')+
      '</div>'+
      '<div style="font-weight:700;font-size:13px;margin-bottom:3px;">'+loc.title+'</div>'+
      '<div style="font-size:10px;color:var(--ink3);line-height:1.5;">'+getProvinceDisplayName(inc.province)+' &middot; '+inc.city+' &middot; '+(LANG==='zh'?'刚果(金)':'DR Congo')+'</div>'+
      '<div style="font-size:10px;color:var(--ink3);line-height:1.5;">'+inc.date+' &middot; '+inc.actor1+' vs '+inc.actor2+'</div>'+
      '<div style="font-size:10px;color:var(--ink3);line-height:1.5;">'+t('fatalities')+': <b style="color:var(--red)">'+(inc.fatalities||0)+'</b></div>'+
      '<button onclick="if(window.openDrawer)window.openDrawer(\''+inc.id+'\')" style="margin-top:6px;font-size:10px;padding:4px 12px;border-radius:2px;cursor:pointer;background:var(--accent);color:var(--paper1);border:none;font-weight:600;font-family:var(--zh);">'+t('drawer.view')+'</button>'+
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
  div.innerHTML='<h4>'+t('legend.title')+'</h4>'+
    Object.entries(CONFLICT_TYPES).map(function(e){return '<div class="leg-row"><span class="leg-dot" style="background:'+e[1].color+'"></span>'+getConflictTypeName(e[0])+'</div>';}).join("")+
    '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--hair);font-size:10px;color:var(--ink3);line-height:1.6;">'+t('legend.help')+'</div>';
  document.querySelector(".map-wrap").appendChild(div);
}
