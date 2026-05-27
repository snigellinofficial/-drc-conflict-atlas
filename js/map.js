/* =====================================================================
   MAP — Leaflet 地图、DRC省份GeoJSON、标记渲染、交互、视图模式
   ===================================================================== */
let map, markerCluster, provinceLayer, activeIncidents=[...INCIDENTS];
let currentFilters={types:new Set(),severity:new Set(),actors:new Set(),province:"",dateFrom:"",dateTo:""};
let provinceData=null;
let selectedProvince=null;
let currentViewMode="province";  // "province" | "current" | "historical"
let heatLayer=null;
let timeSlider=null;
let timeRange={start:"2020-01-01",end:"2026-12-31"};

function initMap(){
  map=L.map("map",{
    center:[-3.5, 24.5],
    zoom:6,
    minZoom:5,
    maxZoom:11,
    zoomControl:true,
    attributionControl:true
  });

  // Light terrain tiles — colonial atlas feel
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{
    attribution:'&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom:19
  }).addTo(map);

  markerCluster=L.markerClusterGroup({
    chunkedLoading:true,
    maxClusterRadius:30,
    iconCreateFunction:function(cluster){
      const count=cluster.getChildCount();
      let cls="marker-cluster-small";
      if(count>=20)cls="marker-cluster-large";
      else if(count>=10)cls="marker-cluster-medium";
      return L.divIcon({html:`<div><span>${count}</span></div>`,className:cls,iconSize:L.point(40,40)});
    }
  });
  map.addLayer(markerCluster);

  loadProvinceLayer();
  buildMapLegend();
}

async function loadProvinceLayer(){
  try{
    // Use preloaded global if available (avoids CORS on file://), else fetch
    if(typeof DRC_PROVINCES_GEOJSON!=="undefined"){
      provinceData=DRC_PROVINCES_GEOJSON;
    }else{
      const resp=await fetch("data/drc_provinces.json");
      if(!resp.ok)throw new Error("Province GeoJSON not available");
      provinceData=await resp.json();
    }

    // === Interactive province layer (top, clickable) ===
    provinceLayer=L.geoJSON(provinceData,{
      style:function(feature){
        const name=feature.properties.name;
        const hasIncidents=INCIDENTS.some(d=>d.province===name);
        const isSelected=selectedProvince===name;
        return {
          color: isSelected ? "#1a0a00" : (hasIncidents ? "#6b1a1a" : "#5a4a3a"),
          weight: isSelected ? 3.2 : 1.2,
          fillColor: isSelected ? "#d4a08a" : (hasIncidents ? "#c98b7a" : "#e8dcc8"),
          fillOpacity: isSelected ? 0.42 : (hasIncidents ? 0.16 : 0.06),
          opacity: isSelected ? 1.0 : 0.78,
          dashArray: null
        };
      },
      onEachFeature:function(feature,layer){
        const name=feature.properties.name;
        const pInfo=DRC_PROVINCES[name]||{zh:name,en:name};

        // Click → filter + zoom + summary (toggle selection)
        layer.on("click",function(e){
          if(selectedProvince===name){
            // Deselect
            selectedProvince=null;
            currentFilters.province="";
            var sel=document.getElementById("filterProvince");
            if(sel)sel.value="";
            applyFilters();
            refreshProvinceStyles();
            return;
          }
          selectedProvince=name;
          currentFilters.province=name;
          var sel=document.getElementById("filterProvince");
          if(sel)sel.value=name;
          applyFilters();
          refreshProvinceStyles();
          map.fitBounds(layer.getBounds(),{padding:[60,60],maxZoom:9});
          showProvinceSummary(name);
        });

        // Hover: highlight province border
        layer.on("mouseover",function(){
          if(selectedProvince===name)return;
          layer.setStyle({fillOpacity:0.28,weight:2.4,color:"#2a1000"});
          layer.bringToFront();
        });
        layer.on("mouseout",function(){
          if(selectedProvince===name)return;
          var hasIncidents=INCIDENTS.some(function(d){return d.province===name;});
          layer.setStyle({
            fillOpacity: hasIncidents?0.16:0.06,
            weight: 1.2,
            color: hasIncidents?"#6b1a1a":"#5a4a3a"
          });
        });
      }
    }).addTo(map);

    // === Background border layer (thick DRC national outline) ===
    L.geoJSON(provinceData,{
      style: {
        color: "#1a0a00",
        weight: 4.5,
        fill: false,
        opacity: 0.62,
        dashArray: null
      },
      interactive: false
    }).addTo(map);
    // Bring interactive layer above the outline
    provinceLayer.bringToFront();

    // Add province name labels — show ALL provinces
    provinceData.features.forEach(function(feat){
      var name=feat.properties.name;
      var pInfo=DRC_PROVINCES[name];
      if(!pInfo)return;
      try{
        var geoLayer=L.geoJSON(feat);
        var center=geoLayer.getBounds().getCenter();
        var bounds=geoLayer.getBounds();
        var area=(bounds.getEast()-bounds.getWest())*(bounds.getNorth()-bounds.getSouth());
        // Show labels for all but the tiniest provinces
        if(area>0.05){
          L.marker(center,{
            icon:L.divIcon({
              className:"province-label-wrap",
              html:`<div class="province-label-inner">
                <div class="province-label">${pInfo.zh}</div>
                <div class="province-label-en">${pInfo.en}</div>
              </div>`,
              iconSize:[130,28],
              iconAnchor:[65,14]
            }),
            interactive:false
          }).addTo(map);
        }
      }catch(e){}
    });

    showToast("DRC 26省行政区划已加载 — 点击省份互动");

    // Show a brief map hint that fades
    var hint=L.divIcon({className:"map-hint",html:'<div style="text-align:center;">点击任意省份<br>查看冲突详情</div>',iconSize:[160,44],iconAnchor:[80,22]});
    var hintMarker=L.marker([-4.5,24.5],{icon:hint,interactive:false}).addTo(map);
    setTimeout(function(){map.removeLayer(hintMarker);},5000);
  }catch(e){
    console.warn("Province layer not loaded:",e.message);
    showToast("省级地图加载失败，请检查网络连接");
  }
}

function refreshProvinceStyles(){
  if(!provinceLayer)return;
  provinceLayer.eachLayer(function(layer){
    var name=layer.feature.properties.name;
    var hasIncidents=activeIncidents.some(function(d){return d.province===name;});
    var isSelected=selectedProvince===name;
    layer.setStyle({
      color: isSelected ? "#1a0a00" : (hasIncidents ? "#6b1a1a" : "#5a4a3a"),
      weight: isSelected ? 3.2 : 1.2,
      fillColor: isSelected ? "#d4a08a" : (hasIncidents ? "#c98b7a" : "#e8dcc8"),
      fillOpacity: isSelected ? 0.42 : (hasIncidents ? 0.16 : 0.06),
      opacity: isSelected ? 1.0 : 0.78
    });
  });
}

function showProvinceSummary(provinceName){
  const pInfo=DRC_PROVINCES[provinceName]||{zh:provinceName,en:provinceName};
  const provIncidents=activeIncidents.filter(d=>d.province===provinceName);
  const fatalTotal=provIncidents.reduce((s,d)=>s+(d.fatalities||0),0);
  const types={};provIncidents.forEach(d=>{if(!types[d.type])types[d.type]=0;types[d.type]++;});

  if(provIncidents.length===0){
    showToast(pInfo.zh+": 当前筛选条件下无冲突事件记录");
    return;
  }

  var overlay=document.getElementById("subOverlay");
  var panel=document.getElementById("subPanel");
  var body=document.getElementById("subPanelBody");
  var title=document.getElementById("subPanelTitle");
  title.innerHTML='&#128205; '+pInfo.zh+' <span style="font-size:13px;font-weight:400;font-family:var(--en);font-style:italic;">'+pInfo.en+'</span>';
  body.innerHTML=`
    <div class="sp-section">
      <table class="sp-table">
        <tr><th>指标</th><th>数值</th></tr>
        <tr><td>当前事件总数</td><td style="font-weight:700;">${provIncidents.length}</td></tr>
        <tr><td>估计累计死亡</td><td style="color:var(--red);font-weight:700;">${fatalTotal}</td></tr>
        <tr><td>冲突类型分布</td><td>${Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([t,n])=>CONFLICT_TYPES[t].zh+'('+n+')').join(" &middot; ")}</td></tr>
        <tr><td>涉及行为体</td><td>${[...new Set(provIncidents.flatMap(d=>[d.actor1,d.actor2]))].filter(a=>a!=="平民"&&a!=="N/A").join("、")}</td></tr>
      </table>
    </div>
    <div class="sp-section">
      <h4>最近事件 / Recent Incidents</h4>
      ${provIncidents.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(d=>`
        <div class="report-card" onclick="flyToIncident('${d.id}')" style="cursor:pointer;">
          <div class="rc-date">${d.date} &middot; ${SEVERITY_LEVELS[d.severity].zh}度</div>
          <div class="rc-title">${d.title}</div>
          <div class="rc-desc">死亡: ${d.fatalities||0} &middot; ${CONFLICT_TYPES[d.type].zh} &middot; ${d.actor1} vs ${d.actor2}</div>
        </div>`).join("")}
    </div>
  `;
  overlay.classList.add("open");
  panel.classList.add("open");
}

// ===================== VIEW MODE SWITCHING =====================

function switchViewMode(mode){
  currentViewMode=mode;

  // Update header buttons
  document.querySelectorAll(".vm-btn").forEach(function(b){
    b.classList.toggle("active", b.dataset.mode===mode);
  });

  // Remove heat layer if present
  if(heatLayer){map.removeLayer(heatLayer);heatLayer=null;}

  // Remove time slider if present
  var sliderWrap=document.getElementById("timeSliderWrap");
  if(sliderWrap)sliderWrap.style.display="none";

  // Reset selected province
  selectedProvince=null;

  switch(mode){
    case "province":
      // Province View: show province layer, cluster markers
      if(provinceLayer)map.addLayer(provinceLayer);
      if(!map.hasLayer(markerCluster))map.addLayer(markerCluster);
      map.setZoom(6);
      currentFilters.province="";
      applyFilters();
      refreshProvinceStyles();
      showToast("已切换至：省份视图");
      break;

    case "current":
      // Current Conflicts View: remove province layer, show individual (non-clustered) markers
      if(provinceLayer)map.removeLayer(provinceLayer);
      if(!map.hasLayer(markerCluster))map.addLayer(markerCluster);
      // Show all incidents — markerCluster handles clustering
      currentFilters.province="";
      applyFilters();
      showToast("已切换至：当前冲突视图 (全部记录)");
      break;

    case "historical":
      // Historical Conflicts View: heatmap + time slider
      if(provinceLayer)map.addLayer(provinceLayer);
      provinceLayer.setStyle({fillOpacity:0.04,weight:0.8,color:"#999",fillColor:"#e8dcc8"});
      map.removeLayer(markerCluster);
      showTimeSlider();
      applyHeatmap(timeRange.start, timeRange.end);
      showToast("已切换至：历史冲突视图 (热力图模式)");
      break;
  }
}

// ===================== HISTORICAL / HEATMAP VIEW =====================

function showTimeSlider(){
  var wrap=document.getElementById("timeSliderWrap");
  if(!wrap){
    wrap=document.createElement("div");
    wrap.id="timeSliderWrap";
    wrap.className="time-slider-wrap";
    wrap.innerHTML=`
      <div class="time-slider-label">历史时间范围 / Historical Range</div>
      <div class="time-slider-row">
        <input type="date" id="histDateFrom" class="time-date-input" value="2020-01-01" />
        <span class="time-slider-sep">&mdash;</span>
        <input type="date" id="histDateTo" class="time-date-input" value="2026-12-31" />
        <button class="time-slider-btn" id="histApplyBtn">应用</button>
      </div>
      <div class="time-slider-info" id="histInfo"></div>
    `;
    document.querySelector(".map-wrap").appendChild(wrap);

    document.getElementById("histApplyBtn").addEventListener("click",function(){
      var from=document.getElementById("histDateFrom").value;
      var to=document.getElementById("histDateTo").value;
      if(from&&to){
        timeRange={start:from,end:to};
        applyHeatmap(from,to);
      }
    });

    // Auto-update on date change
    document.getElementById("histDateFrom").addEventListener("change",function(){
      var from=this.value;
      var to=document.getElementById("histDateTo").value;
      if(from&&to&&from<=to){
        timeRange={start:from,end:to};
        applyHeatmap(from,to);
      }
    });
    document.getElementById("histDateTo").addEventListener("change",function(){
      var from=document.getElementById("histDateFrom").value;
      var to=this.value;
      if(from&&to&&from<=to){
        timeRange={start:from,end:to};
        applyHeatmap(from,to);
      }
    });
  }
  wrap.style.display="block";
}

function applyHeatmap(dateFrom, dateTo){
  // Remove existing heat layer
  if(heatLayer){map.removeLayer(heatLayer);heatLayer=null;}

  // Filter incidents: overlap logic — incident falls within range if
  // incident.date is between dateFrom and dateTo
  var filtered=activeIncidents.filter(function(d){
    return d.date>=dateFrom && d.date<=dateTo;
  });

  var info=document.getElementById("histInfo");
  if(info)info.textContent="匹配事件: "+filtered.length+" 条 ("+dateFrom+" ~ "+dateTo+")";

  if(filtered.length===0){
    showToast("所选时间范围内无冲突事件");
    return;
  }

  // Build heatmap points — weight by fatalities
  var heatPoints=filtered.map(function(d){
    var intensity=Math.min(1.0, (d.fatalities||0)/60 + 0.15);
    return [d.lat, d.lng, intensity];
  });

  // Use simple canvas-based heat layer (no external dependency)
  heatLayer=createCanvasHeatLayer(heatPoints);
  map.addLayer(heatLayer);

  // Update province layer fill based on filtered data
  if(provinceLayer){
    provinceLayer.eachLayer(function(layer){
      var name=layer.feature.properties.name;
      var count=filtered.filter(function(d){return d.province===name;}).length;
      var alpha=Math.min(0.55, 0.05 + count*0.012);
      layer.setStyle({
        fillColor: count>0 ? "#8b0000" : "#e8dcc8",
        fillOpacity: alpha,
        weight: 0.8,
        color: "#999",
        opacity: 0.55
      });
    });
  }
}

function createCanvasHeatLayer(points){
  // Custom canvas-based heat layer for Leaflet
  var HeatCanvasLayer=L.Layer.extend({
    initialize:function(pts,options){
      this._points=pts;
      L.setOptions(this,options);
    },
    onAdd:function(map){
      this._map=map;
      if(!this._canvas)this._initCanvas();
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on("moveend",this._draw,this);
      map.on("zoomend",this._draw,this);
      this._draw();
    },
    onRemove:function(map){
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off("moveend",this._draw,this);
      map.off("zoomend",this._draw,this);
    },
    _initCanvas:function(){
      this._canvas=document.createElement("canvas");
      this._canvas.style.position="absolute";
      this._canvas.style.pointerEvents="none";
      this._canvas.style.opacity="0.7";
      this._ctx=this._canvas.getContext("2d");
    },
    _draw:function(){
      if(!this._map)return;
      var size=this._map.getSize();
      this._canvas.width=size.x;
      this._canvas.height=size.y;
      this._canvas.style.width=size.x+"px";
      this._canvas.style.height=size.y+"px";
      this._canvas.style.left="0px";
      this._canvas.style.top="0px";

      var ctx=this._ctx;
      ctx.clearRect(0,0,size.x,size.y);

      var points=this._points;
      var radius=28;

      for(var i=0;i<points.length;i++){
        var pt=points[i];
        var pos=this._map.latLngToContainerPoint([pt[0],pt[1]]);
        var intensity=pt[2]||0.2;

        // Red gradient based on intensity
        var r=Math.floor(139 + (intensity*116));  // 139→255
        var g=Math.floor(intensity*20);            // 0→20
        var b=Math.floor(intensity*10);            // 0→10
        var alpha=intensity*0.55;

        var grad=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,radius);
        grad.addColorStop(0,"rgba("+r+","+g+","+b+","+alpha+")");
        grad.addColorStop(0.5,"rgba("+r+","+g+","+b+","+(alpha*0.4)+")");
        grad.addColorStop(1,"rgba("+r+","+g+","+b+",0)");

        ctx.beginPath();
        ctx.arc(pos.x,pos.y,radius,0,Math.PI*2);
        ctx.fillStyle=grad;
        ctx.fill();
      }
    }
  });

  return new HeatCanvasLayer(points);
}

// Update heatmap when filters change (in historical mode)
function refreshHeatmapIfActive(){
  if(currentViewMode==="historical"){
    applyHeatmap(timeRange.start, timeRange.end);
  }
}

function buildMapLegend(){
  var div=document.createElement("div");
  div.className="map-legend";
  div.innerHTML='<h4>冲突类型 / Type</h4>'+
    Object.entries(CONFLICT_TYPES).map(([k,v])=>'<div class="leg-row"><span class="leg-dot" style="background:'+v.color+'"></span>'+v.zh+'</div>').join("")+
    '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--hair);font-size:10px;color:var(--ink3);line-height:1.6;">'+
    '<b>点击省份</b> → 查看该省冲突概况<br>标记大小 = 严重等级<br>'+
    '<span style="display:inline-block;width:10px;height:10px;border:2px solid #5a4a3a;background:rgba(232,220,200,.5);margin-right:4px;"></span> 省界 '+
    '<span style="display:inline-block;width:10px;height:10px;border:2px solid #6b1a1a;background:rgba(201,139,122,.24);margin-right:4px;"></span> 有冲突省份 '+
    '<span style="display:inline-block;width:10px;height:10px;border:2.5px solid #1a0a00;background:rgba(212,160,138,.5);margin-right:4px;"></span> 已选省份</div>';
  document.querySelector(".map-wrap").appendChild(div);
}

function createMarker(inc){
  const sev=SEVERITY_LEVELS[inc.severity];
  const type=CONFLICT_TYPES[inc.type];
  const marker=L.circleMarker([inc.lat,inc.lng],{
    radius: sev.size + 3,
    fillColor: type.color,
    color: "#1a0a00",
    weight: 2.2,
    opacity: 0.9,
    fillOpacity: 0.82
  });

  marker.bindPopup(`
    <div style="max-width:280px;">
      <div style="display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap;">
        <span class="sp-badge" style="background:${type.color};color:#fff;">${type.zh}</span>
        <span class="sp-badge" style="background:${sev.color};color:#fff;">${sev.zh}</span>
        ${inc.verified?'<span class="sp-badge" style="background:var(--green);color:#fff;">已验证</span>':''}
      </div>
      <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${inc.title}</div>
      <div style="font-size:10px;color:var(--ink3);line-height:1.5;">${inc.province||''} &middot; ${inc.city} &middot; ${inc.country}</div>
      <div style="font-size:10px;color:var(--ink3);line-height:1.5;">${inc.date} &middot; ${inc.actor1} vs ${inc.actor2}</div>
      <div style="font-size:10px;color:var(--ink3);line-height:1.5;">死亡: <b style="color:var(--red)">${inc.fatalities||0}</b></div>
      <button onclick="if(window.openDrawer)window.openDrawer('${inc.id}')" style="margin-top:6px;font-size:10px;padding:4px 12px;border-radius:2px;cursor:pointer;background:var(--accent);color:var(--paper1);border:none;font-weight:600;font-family:var(--zh);">查看详情 &rarr;</button>
    </div>
  `);
  marker.incidentId=inc.id;
  marker.on("click",()=>{if(window.openDrawer)window.openDrawer(inc.id);});
  return marker;
}

function renderMarkers(){
  markerCluster.clearLayers();
  activeIncidents.forEach(inc=>{
    markerCluster.addLayer(createMarker(inc));
  });
  if(window.updateEventList)window.updateEventList();

  // Update province layer fill colors based on active filters
  if(provinceLayer && currentViewMode!=="historical"){
    provinceLayer.eachLayer(function(layer){
      var name=layer.feature.properties.name;
      var hasIncidents=activeIncidents.some(function(d){return d.province===name;});
      layer.setStyle({
        fillColor: hasIncidents?"#c98b7a":"#e8dcc8",
        fillOpacity: hasIncidents?0.16:0.06,
        color: hasIncidents?"#6b1a1a":"#5a4a3a"
      });
    });
  }
}

function flyToIncident(id){
  const inc=INCIDENTS.find(d=>d.id===id);
  if(inc){
    map.flyTo([inc.lat,inc.lng],8,{duration:1.2});
    setTimeout(()=>{if(window.openDrawer)window.openDrawer(inc.id);},1300);
  }
}
