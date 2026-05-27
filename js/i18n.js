/* I18N — 国际化 / Internationalization
   Central string table, language toggle, event localization */

var LANG = 'zh';

var I18N = {
  /* --- Header --- */
  'site.title':       {zh:"刚果（金）冲突态势感知地图", en:"DRC Conflict Situational Awareness Atlas"},
  'site.tagline':     {zh:"&mdash; since 2020", en:"&mdash; since 2020"},
  'head.events':      {zh:"本月事件", en:"Month Events"},
  'head.deaths':      {zh:"估计死亡", en:"Est. Fatalities"},
  'head.battles':     {zh:"战斗/交手", en:"Battles/Clashes"},
  'head.provinces':   {zh:"涉及省份", en:"Provinces"},
  'head.live':        {zh:"态势感知中", en:"Monitoring"},

  /* --- Info panel --- */
  'info.header':      {zh:"关于本系统 / About", en:"About This System"},
  'info.nature':      {zh:"系统性质", en:"System Nature"},
  'info.natureText':  {zh:"刚果（金）武装冲突态势感知交互地图。仅做公开信息的汇总与可视化呈现，不构成独立安全分析或预测。",
                       en:"Interactive situational awareness map for armed conflict in the DRC. Aggregation and visualization of publicly available information only; this does not constitute independent security analysis or prediction."},
  'info.dataSources':  {zh:"数据来源", en:"Data Sources"},
  'info.dataSourcesText':{zh:"数据主要来自ACLED（武装冲突地点与事件数据项目），辅以GDELT和UCDP进行交叉验证。所有事件均标注来源与验证状态。",
                          en:"Data primarily from ACLED (Armed Conflict Location & Event Data Project), with GDELT and UCDP for cross-validation. All events are sourced and verified."},
  'info.update':       {zh:"更新模式", en:"Update Mode"},
  'info.updateText':   {zh:"GitHub Actions 每日 UTC 00:07（北京时间 08:07）自动从 ACLED API 拉取最新冲突数据，经智能采样后合并至事件库。",
                         en:"GitHub Actions auto-fetches the latest ACLED data daily at 00:07 UTC, with intelligent sampling and merging into the event database."},
  'info.map':          {zh:"地图交互", en:"Map Interaction"},
  'info.mapText':      {zh:"点击省份查看区域冲突概况；点击标记查看事件详情。图例位于地图右下角。缩放至9级显示省份名称，10级显示城市。",
                         en:"Click a province to view its conflict overview; click a marker for event details. Legend at bottom-right. Zoom ≥ 9 for province labels, ≥ 10 for city labels."},
  'info.tech':         {zh:"技术架构", en:"Tech Stack"},
  'info.techText':     {zh:"Leaflet + MarkerCluster 渲染地图标记。CARTO 浅色底图提供羊皮纸质感。数据层与展示层严格分离。",
                         en:"Leaflet + MarkerCluster for map rendering. CARTO light basemap with parchment aesthetic. Strict separation of data and presentation layers."},
  'info.filtersBrief':  {zh:"筛选与报告", en:"Filters & Reports"},
  'info.filtersBriefText':{zh:"右侧面板可按冲突类型、严重等级、行为体、省份筛选事件。支持生成月度安全态势报告与快速冲突查询报告。",
                           en:"Right panel: filter events by conflict type, severity, actor, or province. Generate monthly security reports and quick conflict queries."},
  'info.langBrief':     {zh:"语言切换", en:"Language"},
  'info.langBriefText': {zh:"页面顶部「中 | EN」按钮切换界面语言。行为体名称等专有名词保留原文。",
                          en:"Toggle \"中 | EN\" at the top to switch the interface language. Proper nouns such as actor names are kept in the original."},
  'info.search':        {zh:"搜索事件（行为体/地名/关键词）...", en:"Search events (actor/location/keyword)..."},
  'info.searchNoResults':{zh:"未找到匹配事件", en:"No matching events found."},
  'info.searchResults': {zh:"找到 {n} 条结果", en:"{n} result(s) found."},

  /* --- Right panel --- */
  'panel.stats':       {zh:"统计概览 / Statistics", en:"Statistics"},
  'panel.filters':     {zh:"筛选器 / Filters", en:"Filters"},
  'panel.events':      {zh:"冲突事件列表 / Events", en:"Events"},
  'panel.timeline':    {zh:"时间轴 / Timeline", en:"Timeline"},
  'panel.log':         {zh:"更新日志 / Update Log", en:"Update Log"},
  'panel.monthly':     {zh:"月度报告 / Monthly Report", en:"Monthly Report"},
  'panel.quickReport': {zh:"快速报告 / Quick Report", en:"Quick Report"},
  'panel.genReport':   {zh:"点击生成 &rarr;", en:"Generate &rarr;"},

  /* --- Stats --- */
  'stats.total':       {zh:"总冲突事件", en:"Total Incidents"},
  'stats.allTime':     {zh:"数据库累计 / All Time", en:"Database Total / All Time"},
  'stats.fatalities':  {zh:"估计累计死亡", en:"Est. Total Fatalities"},
  'stats.fatalSub':    {zh:"数据库累计 / All Time", en:"Database Total / All Time"},
  'stats.battles':     {zh:"战斗/交火事件", en:"Battles & Clashes"},
  'stats.battlesSub':  {zh:"Battles & Clashes", en:"Battles & Clashes"},
  'stats.critical':    {zh:"严重(critical)事件", en:"Critical Events"},
  'stats.criticalSub': {zh:"最严重等级", en:"Highest Severity"},
  'stats.provinces':   {zh:"涉及省份", en:"Provinces Involved"},
  'stats.provincesSub':{zh:"共26省 / Provinces", en:"of 26 Provinces"},
  'stats.monthNew':    {zh:"本月新增事件", en:"New This Month"},
  'stats.monthSub':    {zh:"This Month", en:"This Month"},

  /* --- Filters --- */
  'filter.type':       {zh:"冲突类型 / Type", en:"Conflict Type"},
  'filter.severity':   {zh:"严重等级 / Severity", en:"Severity"},
  'filter.actor':      {zh:"冲突参与组织 / Actor", en:"Actors"},
  'filter.province':   {zh:"省份 / Province", en:"Province"},
  'filter.dateRange':  {zh:"时间范围 / Date Range", en:"Date Range"},
  'filter.allProv':    {zh:"全部 26 省", en:"All 26 Provinces"},
  'filter.selectAll':  {zh:"全选", en:"All"},
  'filter.invert':     {zh:"反选", en:"Invert"},
  'filter.actorHint':  {zh:"点击=选择  ◎=详情", en:"Click=Select  ◎=Info"},
  'filter.actorSearch':{zh:"搜索行为体 / Search actors...", en:"Search actors..."},
  'filter.apply':      {zh:"应用筛选", en:"Apply Filters"},
  'filter.reset':      {zh:"重置全部", en:"Reset All"},
  'filter.match':      {zh:"匹配事件:", en:"Matching:"},
  'filter.unit':       {zh:"条", en:" events"},

  /* --- Event list --- */
  'evt.newest':        {zh:"最新优先", en:"Newest First"},
  'evt.oldest':        {zh:"最早优先", en:"Oldest First"},
  'evt.fatal':         {zh:"死亡最多", en:"Most Fatal"},
  'evt.severity':      {zh:"严重等级优先", en:"Severity First"},
  'evt.groupNone':     {zh:"不分组", en:"No Grouping"},
  'evt.groupYear':     {zh:"按年份分组", en:"By Year"},
  'evt.groupProvince': {zh:"按省份分组", en:"By Province"},
  'evt.sortLabel':     {zh:"排序:", en:"Sort:"},
  'evt.groupLabel':    {zh:"分组:", en:"Group:"},

  /* --- Timeline --- */
  'tl.newest':         {zh:"最新优先", en:"Newest First"},
  'tl.oldest':         {zh:"最早优先", en:"Oldest First"},
  'tl.critical':       {zh:"仅严重事件", en:"Critical Only"},
  'tl.sortLabel':      {zh:"排序:", en:"Sort:"},

  /* --- Time slider --- */
  'ts.label':          {zh:"时段 / Period", en:"Period"},
  'ts.1m':             {zh:"1个月", en:"1 Month"},
  'ts.3m':             {zh:"3个月", en:"3 Months"},
  'ts.6m':             {zh:"6个月", en:"6 Months"},
  'ts.1y':             {zh:"1年", en:"1 Year"},
  'ts.3y':             {zh:"3年", en:"3 Years"},
  'ts.5y':             {zh:"5年", en:"5 Years"},
  'ts.all':            {zh:"全部", en:"All"},
  'ts.match':          {zh:"匹配:", en:"Matching:"},
  'ts.unit':           {zh:"条事件", en:" events"},

  /* --- Map legend --- */
  'legend.title':      {zh:"冲突类型 / Type", en:"Conflict Type"},
  'legend.help':       {zh:"<b>点击省份</b> → 查看省份概况<br>点击标记 → 查看事件详情<br>缩放至9级 → 显示省份名称<br>缩放至10级 → 显示城市名称<br>"+
                          '<span style="display:inline-block;width:10px;height:10px;border:2px solid #5a0000;background:rgba(139,32,32,.22);margin-right:4px;"></span> 时段内有冲突 '+
                          '<span style="display:inline-block;width:10px;height:10px;border:2.5px solid #1a0a00;background:rgba(212,160,138,.5);margin-right:4px;"></span> 已选省份',
                        en:"<b>Click province</b> → view summary<br>Click marker → view details<br>Zoom ≥ 9 → province labels<br>Zoom ≥ 10 → city labels<br>"+
                          '<span style="display:inline-block;width:10px;height:10px;border:2px solid #5a0000;background:rgba(139,32,32,.22);margin-right:4px;"></span> Active conflict '+
                          '<span style="display:inline-block;width:10px;height:10px;border:2.5px solid #1a0a00;background:rgba(212,160,138,.5);margin-right:4px;"></span> Selected province'},

  /* --- Province summary --- */
  'prov.metric':       {zh:"指标", en:"Metric"},
  'prov.value':        {zh:"数值", en:"Value"},
  'prov.totalEvents':  {zh:"历史事件总数", en:"Historical Events"},
  'prov.totalDeaths':  {zh:"估计累计死亡", en:"Est. Total Fatalities"},
  'prov.typeDist':     {zh:"冲突类型分布", en:"Conflict Type Distribution"},
  'prov.actors':       {zh:"涉及行为体", en:"Actors Involved"},
  'prov.recent':       {zh:"最近事件 / Recent Incidents", en:"Recent Incidents"},
  'prov.noData':       {zh:"暂无冲突事件记录", en:"No conflict events recorded"},
  'prov.deaths':       {zh:"死亡:", en:"Fatalities:"},
  'prov.more':         {zh:"更多", en:"more"},
  'prov.collapse':     {zh:"收起", en:"collapse"},

  /* --- Incident detail --- */
  'drawer.verified':   {zh:"已验证 / Verified", en:"Verified"},
  'drawer.unverified': {zh:"待验证 / Unverified", en:"Unverified"},
  'drawer.desc':       {zh:"事件描述 / Event Description", en:"Event Description"},
  'drawer.casualty':   {zh:"伤亡估计 / Casualty Estimate", en:"Casualty Estimate"},
  'drawer.metric':     {zh:"指标 / Metric", en:"Metric"},
  'drawer.value':      {zh:"数值 / Value", en:"Value"},
  'drawer.fatalities': {zh:"估计死亡人数", en:"Est. Fatalities"},
  'drawer.type':       {zh:"冲突类型", en:"Conflict Type"},
  'drawer.severity':   {zh:"严重等级", en:"Severity"},
  'drawer.province':   {zh:"发生省份", en:"Province"},
  'drawer.actor1':     {zh:"主要行为体", en:"Primary Actor"},
  'drawer.actor2':     {zh:"次要行为体", en:"Secondary Actor"},
  'drawer.assessment': {zh:"态势评估 / Situational Assessment", en:"Situational Assessment"},
  'drawer.source':     {zh:"数据来源 / Source", en:"Source"},
  'drawer.view':       {zh:"查看详情 &rarr;", en:"View Details &rarr;"},
  'drawer.profile':    {zh:"[档案]", en:"[Profile]"},
  'drawer.severityLabel':{zh:"严重等级:", en:"Severity:"},

  /* --- Actor profile --- */
  'actor.enName':      {zh:"英文名", en:"English Name"},
  'actor.region':      {zh:"活动区域", en:"Area of Operations"},
  'actor.strength':    {zh:"兵力估计", en:"Est. Strength"},
  'actor.allies':      {zh:"盟友", en:"Allies"},
  'actor.opponents':   {zh:"对手", en:"Opponents"},
  'actor.profile':     {zh:"组织概况 / Profile", en:"Organization Profile"},
  'actor.sources':     {zh:"信息来源 / Sources", en:"Sources"},
  'actor.noProfile':   {zh:"暂无详细档案", en:"No detailed profile available"},
  'actor.filterEvents': {zh:"筛选此行为体相关事件", en:"Filter events by this actor"},

  /* --- Reports --- */
  'report.monthlyTitle': {zh:"月度安全态势报告", en:"Monthly Security Report"},
  'report.generating':  {zh:"月度报告生成中...", en:"Generating monthly report..."},
  'report.generating2': {zh:"正在doublecheck数据并生成月度报告...", en:"Double-checking data and generating report..."},
  'report.period':      {zh:"报告周期：", en:"Report Period: "},
  'report.generated':   {zh:"生成时间：", en:"Generated: "},
  'report.overall':     {zh:"一、总体态势 / Overall Situation", en:"1. Overall Situation"},
  'report.byProvince':  {zh:"二、按省份分析 / By Province", en:"2. By Province"},
  'report.byType':      {zh:"三、按冲突类型分析 / By Conflict Type", en:"3. By Conflict Type"},
  'report.worst':       {zh:"四、最严重事件 / Most Severe Incidents", en:"4. Most Severe Incidents"},
  'report.timeline':    {zh:"五、冲突事件时间线 / Chronological Events", en:"5. Chronological Events"},
  'report.activeZones': {zh:"六、活跃冲突区域 / Active Conflict Zones", en:"6. Active Conflict Zones"},
  'report.method':      {zh:"七、数据说明 / Methodology Note", en:"7. Methodology Note"},
  'report.noEvents':    {zh:"所选时段内无冲突事件记录。", en:"No conflict events recorded in the selected period."},

  'qr.placeholder':    {zh:"输入冲突或组织关键词，例如：M23、伊图里、CODECO、Goma...\n系统将自动匹配并提供选项，亦可使用全库搜索。",
                        en:"Enter keywords, e.g.: M23, Ituri, CODECO, Goma...\nAuto-suggest options will appear. Full-database search is also available."},
  'qr.hint':           {zh:"输入关键词后自动显示匹配选项...", en:"Type keywords to see matching options..."},
  'qr.maxSearch':      {zh:"全库搜索:", en:"Full DB search:"},
  'qr.maxSearchBtn':   {zh:"全库 max 搜索", en:"Full DB Max Search"},
  'qr.generating':     {zh:"快速报告生成中...", en:"Generating quick report..."},
  'qr.noMatch':        {zh:"未匹配到相关事件...", en:"No matching events found..."},

  'report.quickTitle':       {zh:"冲突快速分析报告", en:"Conflict Quick Analysis Report"},
  'report.sectionOverview':  {zh:"概况", en:"Overview"},
  'report.sectionTrend':     {zh:"年度趋势", en:"Annual Trend"},
  'report.sectionType':      {zh:"类型构成", en:"Type Composition"},
  'report.sectionDeadliest': {zh:"最致命事件", en:"Deadliest Incident"},
  'report.sectionAnalysis':  {zh:"简要分析", en:"Brief Analysis"},
  'report.sectionSource':    {zh:"来源", en:"Sources"},
  'report.barProvince':      {zh:"省份", en:"Province"},
  'report.barFatalities':    {zh:"死亡人数", en:"Fatalities"},
  'report.noEventsFound':    {zh:"未找到匹配的冲突事件。", en:"No matching conflict events found."},

  /* --- Update log --- */
  'log.fallback':      {zh:"暂无更新记录", en:"No update records yet"},
  'log.loadError':     {zh:"日志加载失败", en:"Failed to load log"},

  /* --- Toast --- */
  'toast.provLoaded':  {zh:"DRC 26省行政区划已加载", en:"DRC 26 provinces loaded"},
  'toast.provFail':    {zh:"省级地图加载失败，请检查网络连接", en:"Province map failed to load — check network"},
  'toast.filtersReset':{zh:"筛选已重置", en:"Filters reset"},
  'toast.dataLoaded':  {zh:"已加载外部数据: +", en:"External data loaded: +"},

  /* --- Pagination --- */
  'pagination.prev':   {zh:"上一页", en:"Prev"},
  'pagination.next':   {zh:"下一页", en:"Next"},
  'pagination.of':     {zh:"/", en:"of"},

  /* --- More info modal --- */
  'moreInfo.title':    {zh:"更多信息 / More Information", en:"More Information"},
  'moreInfo.btn':      {zh:"更多信息 / More Info &rarr;", en:"More Info &rarr;"},

  /* --- Chart --- */
  'chart.title':       {zh:"月度事件趋势 / Monthly Trend", en:"Monthly Trend"},
  'chart.yLabel':      {zh:"事件件数", en:"Incidents"},
  'chart.xLabel':      {zh:"时间 / Date", en:"Date"},

  /* --- Monthly/weekly report details --- */
  'report.indicator':  {zh:"指标", en:"Indicator"},
  'report.thisMonth':  {zh:"本月", en:"This Month"},
  'report.prevMonth':  {zh:"前一月", en:"Previous Month"},
  'report.change':     {zh:"变化", en:"Change"},
  'report.totalEvents':{zh:"冲突事件总数", en:"Total Incidents"},
  'report.estDeaths':  {zh:"估计死亡人数", en:"Est. Fatalities"},
  'report.criticalEvt':{zh:"严重(critical)事件", en:"Critical Events"},
  'report.highEvt':    {zh:"高(high)等级事件", en:"High Severity Events"},
  'report.provCount':  {zh:"涉及省份数", en:"Provinces Involved"},
  'report.trendUp':    {zh:"冲突事件数量较前一月<b>上升约</b>", en:"Incident count <b>increased ~</b>"},
  'report.trendDown':  {zh:"冲突事件数量较前一月<b>下降约</b>", en:"Incident count <b>decreased ~</b>"},
  'report.trendUp2':   {zh:"冲突事件数量较前一月<b>小幅上升</b>", en:"Incident count <b>slightly increased</b>"},
  'report.trendDown2': {zh:"冲突事件数量较前一月<b>小幅下降</b>", en:"Incident count <b>slightly decreased</b>"},
  'report.trendFlat':  {zh:"冲突事件数量与前一月持平，安全态势稳定。", en:"Incident count stable compared to previous month."},
  'report.trendWorse': {zh:"%，安全态势出现显著恶化。", en:"%; security situation has significantly deteriorated."},
  'report.trendBetter':{zh:"%，安全态势有所缓和。", en:"%; security situation has eased somewhat."},
  'report.trendSame':  {zh:"%，态势基本延续。", en:"%; trend largely continues."},
  'report.noCriticals':{zh:"本月无严重(critical)等级冲突事件记录。", en:"No critical-level conflict events recorded this month."},
  'report.criticalsCount':{zh:"本月共记录<b>", en:"A total of <b>"},
  'report.criticalsCount2':{zh:"</b>起严重等级事件。", en:"</b> critical events were recorded."},
  'report.colProvince':{zh:"省份", en:"Province"},
  'report.colEvents': {zh:"事件数", en:"Events"},
  'report.colDeaths': {zh:"死亡", en:"Deaths"},
  'report.colCritical':{zh:"严重", en:"Critical"},
  'report.colTypes':  {zh:"主要冲突类型", en:"Main Conflict Types"},
  'report.colType':   {zh:"类型", en:"Type"},
  'report.colShare':  {zh:"占比", en:"Share"},
  'report.colDate':   {zh:"日期", en:"Date"},
  'report.colTitle':  {zh:"事件", en:"Event"},
  'report.colEvent':  {zh:"事件", en:"Event"},
  'report.noDeaths':  {zh:"本月无死亡事件记录。", en:"No fatal incidents recorded this month."},
  'report.chronoTip': {zh:"以下为过去31天内按时间顺序排列的冲突事件（最多30条）", en:"Chronological list of conflict events in the past 31 days (max 30)"},
  'report.chronoNone':{zh:"本月无冲突事件记录。", en:"No conflict events recorded this month."},
  'report.activeZonesText':{zh:"本月共有<b>", en:"A total of <b>"},
  'report.activeZonesText2':{zh:"</b>个省份记录到冲突事件：<b>", en:"</b> provinces recorded conflict events: <b>"},
  'report.activeZonesText3':{zh:"</b>。", en:"</b>."},
  'report.hottestZone':{zh:"其中冲突最为激烈的区域为<b>", en:"The most intense conflict zone was <b>"},
  'report.hottestZone2':{zh:"</b>，需重点关注。", en:"</b>, requiring close attention."},
  'report.methodNote':{zh:"本报告基于 ACLED / GDELT / UCDP 公开数据自动生成，仅做信息汇总，不构成独立安全分析或预测。所有数据均归因于具名第三方来源。冲突事件的定义和分类遵循 ACLED 标准。严重等级分级依据见筛选器说明。死亡人数为各来源报告的估计值，实际数字可能有所差异。",
    en:"This report is auto-generated from ACLED / GDELT / UCDP public data for information aggregation purposes only and does not constitute independent security analysis or prediction. All data is attributed to named third-party sources. Definitions and classifications follow ACLED standards. See filter legend for severity classification. Fatality figures are estimates from source reports; actual numbers may differ."},

  /* --- Quick report details --- */
  'qr.query':          {zh:"查询：", en:"Query: "},
  'qr.generated':      {zh:"生成时间：", en:"Generated: "},
  'qr.dataRange':      {zh:"数据范围：", en:"Data Range: "},
  'qr.matchEvents':    {zh:"匹配事件：", en:"Matching Events: "},
  'qr.overview':       {zh:"一、冲突概况 / Conflict Overview", en:"1. Conflict Overview"},
  'qr.annualTrend':    {zh:"二、年度趋势 / Annual Trend", en:"2. Annual Trend"},
  'qr.typeBreakdown':  {zh:"三、冲突类型构成 / Conflict Type Breakdown", en:"3. Conflict Type Breakdown"},
  'qr.mostFatal':      {zh:"四、最致命事件 / Most Fatal Incidents", en:"4. Most Fatal Incidents"},
  'qr.analysis':       {zh:"五、简要分析 / Brief Analysis", en:"5. Brief Analysis"},
  'qr.sources':        {zh:"六、数据来源与说明 / Sources & Notes", en:"6. Sources & Notes"},
  'qr.colIndicator':   {zh:"指标", en:"Indicator"},
  'qr.colValue':       {zh:"数值", en:"Value"},
  'qr.totalEvents':    {zh:"总事件数", en:"Total Events"},
  'qr.totalDeaths':    {zh:"估计总死亡", en:"Est. Total Fatalities"},
  'qr.involvedProv':   {zh:"涉及省份", en:"Provinces Involved"},
  'qr.mainActors':     {zh:"主要行为体", en:"Main Actors"},
  'qr.dataSpan':       {zh:"数据跨度", en:"Data Span"},
  'qr.severityMix':    {zh:"严重事件占比", en:"Severity Mix"},
  'qr.year':           {zh:"年份", en:"Year"},
  'qr.events':         {zh:"事件数", en:"Events"},
  'qr.trend':          {zh:"趋势", en:"Trend"},
  'qr.noMatchText':    {zh:"未在本地数据库中找到匹配的冲突记录。请尝试：", en:"No matching conflict records found in local database. Try:"},
  'qr.try1':           {zh:"扩大搜索范围或使用不同关键词", en:"Broaden your search or use different keywords"},
  'qr.try2':           {zh:"使用\"全库 max 搜索\"进行全文检索", en:"Use \"Full DB Max Search\" for full-text search"},
  'qr.try3':           {zh:"运行爬虫更新数据库(cd scripts && python crawler.py)", en:"Run crawler to update database (cd scripts && python crawler.py)"},
  'qr.overviewP1':     {zh:"该冲突自<b>", en:"Since <b>"},
  'qr.overviewP1b':    {zh:"</b>以来，在数据库中累计记录到<b>", en:"</b>, a total of <b>"},
  'qr.overviewP1c':    {zh:"</b>起事件，造成约<b>", en:"</b> incidents were recorded, with approximately <b>"},
  'qr.overviewP1d':    {zh:"</b>人死亡。", en:"</b> fatalities."},
  'qr.overviewP2a':    {zh:"冲突的主要形式为", en:"Primary forms of conflict were "},
  'qr.overviewP2b':    {zh:"和", en:" and "},
  'qr.overviewP2c':    {zh:"占据", en:" accounting for "},
  'qr.overviewP3':     {zh:"严重等级分布为：严重", en:"Severity distribution: Critical "},
  'qr.overviewP3b':    {zh:"起、高", en:", High "},
  'qr.overviewP3c':    {zh:"起、中等", en:", Medium "},
  'qr.overviewP3d':    {zh:"起、低", en:", Low "},
  'qr.overviewP3e':    {zh:"起。", en:"."},
  'qr.overviewP4':     {zh:"涉及的主要武装行为体包括：<b>", en:"Main armed actors involved: <b>"},
  'qr.overviewP4b':    {zh:"</b>等。", en:"</b>."},
  'qr.trendActive':    {zh:"持续活跃", en:"persistently active"},
  'qr.trendSporadic':  {zh:"间歇性活动", en:"sporadically active"},
  'qr.sourcesNote':    {zh:"数据来源：ACLED (Armed Conflict Location & Event Data) / GDELT / UCDP 公开数据集。本报告为机器自动生成的信息汇总，遵循RAND报告简式格式，仅做事实性数据呈现，不构成安全分析或预测。死亡人数为各来源报告的估计值。如需更详细分析，请查阅各来源原始数据。",
    en:"Data sources: ACLED (Armed Conflict Location & Event Data) / GDELT / UCDP public datasets. This report is machine-generated information aggregation following RAND report simplified format, presenting factual data only and not constituting security analysis or prediction. Fatality figures are estimates from source reports. For detailed analysis, please consult original source data."},

  /* --- More info modal --- */
  'moreInfo.title':    {zh:"更多信息 / More Information", en:"More Information"},
  'moreInfo.btn':      {zh:"更多信息 / More Info &rarr;", en:"More Info &rarr;"},
  'moreInfo.section1': {zh:"一、数据来源 / Data Sources", en:"1. Data Sources"},
  'moreInfo.section2': {zh:"二、更新模式 / Update Mode", en:"2. Update Mode"},
  'moreInfo.section3': {zh:"三、冲突事件档案（按年份归档 / Archival Records by Year）", en:"3. Conflict Event Archive (Archival Records by Year)"},
  'moreInfo.totalRecords':{zh:"共 <b>{n}</b> 条事件记录。以下为该系统中所有爬取的冲突原始数据，按年份分类展示。", en:"A total of <b>{n}</b> event records. All crawled conflict data in this system, organized by year."},
  'moreInfo.yearLabel':{zh:" 年（", en:" ("},
  'moreInfo.yearLabel2':{zh:" 条）", en:" records)"},
  'moreInfo.thDate':   {zh:"日期", en:"Date"},
  'moreInfo.thProvince':{zh:"省份", en:"Province"},
  'moreInfo.thTitle':  {zh:"事件标题", en:"Event Title"},
  'moreInfo.thType':   {zh:"类型", en:"Type"},
  'moreInfo.thSeverity':{zh:"等级", en:"Severity"},
  'moreInfo.thDeaths': {zh:"死亡", en:"Deaths"},
  'moreInfo.thActors': {zh:"行为体", en:"Actors"},
  'moreInfo.thSource': {zh:"来源", en:"Source"},
  'moreInfo.thVerified':{zh:"验证", en:"Verified"},

  /* --- Header stats --- */
  'head.monthEvents':  {zh:"本月事件", en:"Month Events"},
  'head.estDeaths':    {zh:"估计死亡", en:"Est. Fatalities"},
  'head.battlesClashes':{zh:"战斗/交手", en:"Battles/Clashes"},
  'head.provincesAffected':{zh:"涉及省份", en:"Provinces"},
  'head.monitoring':   {zh:"态势感知中", en:"Monitoring"},

  /* --- Misc --- */
  'back':              {zh:"返回", en:"Back"},
  'close':             {zh:"关闭", en:"Close"},
  'fatalities':        {zh:"死亡", en:"Fatalities"},
  'severity.degree':   {zh:"度", en:""},
  'genReport':         {zh:"点击生成 &rarr;", en:"Generate &rarr;"}
};

/* --- Translation function --- */
function t(key) {
  var entry = I18N[key];
  if (!entry) return key;
  return entry[LANG] || entry['zh'] || key;
}

/* --- Language toggle --- */
function setLanguage(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  LANG = lang;
  document.documentElement.lang = lang;
  var url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url.toString());
  updateLangUI();
  rebuildAllUIText();
}

function updateLangUI() {
  var zhBtn = document.getElementById('langZh');
  var enBtn = document.getElementById('langEn');
  if (zhBtn) { zhBtn.classList.toggle('active', LANG === 'zh'); }
  if (enBtn) { enBtn.classList.toggle('active', LANG === 'en'); }
}

function initLangFromURL() {
  var params = new URLSearchParams(window.location.search);
  var lang = params.get('lang');
  if (lang === 'en' || lang === 'zh') { LANG = lang; document.documentElement.lang = lang; }
  updateLangUI();
}

/* --- Display helpers --- */
function getConflictTypeName(typeKey) {
  var cfg = CONFLICT_TYPES[typeKey];
  if (!cfg) return typeKey;
  return LANG === 'en' ? cfg.en : cfg.zh;
}
function getSeverityName(sevKey) {
  var cfg = SEVERITY_LEVELS[sevKey];
  if (!cfg) return sevKey;
  return LANG === 'en' ? (cfg.en || sevKey) : cfg.zh;
}
function getProvinceDisplayName(provKey) {
  var p = DRC_PROVINCES[provKey];
  if (!p) return provKey;
  return LANG === 'en' ? p.en : p.zh;
}

function getActorDisplayName(actorKey) {
  if (!actorKey) return LANG === 'zh' ? '未知' : 'Unknown';
  for (var k in ACTOR_PROFILES) {
    if (actorKey.indexOf(k) !== -1) {
      return LANG === 'zh' ? ACTOR_PROFILES[k].zh : ACTOR_PROFILES[k].name;
    }
  }
  var cleaned = actorKey.replace(/\s*\(.*?\)\s*$/g, '').replace(/:.*$/, '').trim();
  return cleaned || actorKey;
}

/* --- Event localization --- */
function localizeEvent(inc) {
  if (LANG === 'zh') {
    if (inc.id && inc.id.indexOf('DRC-') === 0) return inc;
    var loc = {};
    for (var k in inc) loc[k] = inc[k];
    loc.title = genChineseTitle(inc);
    loc.desc = genChineseDesc(inc);
    loc._localized = true;
    return loc;
  } else {
    if (inc.id && inc.id.indexOf('DRC-') === 0) {
      var eng = {};
      for (var k2 in inc) eng[k2] = inc[k2];
      eng.title = genEnglishTitle(inc);
      eng.desc = genEnglishDesc(inc);
      eng._localized = true;
      return eng;
    }
    return inc;
  }
}

function genChineseTitle(inc) {
  var a1 = getActorDisplayName(inc.actor1);
  var a2 = getActorDisplayName(inc.actor2);
  var prov = getProvinceDisplayName(inc.province);
  var city = inc.city && inc.city !== 'Unknown' ? inc.city : '';
  var loc = prov + (city ? city : '');
  var action = {
    'battles': '与' + a2 + '在' + loc + '地区发生交火',
    'remote-violence': '在' + loc + '地区发动爆炸袭击',
    'violence-civilians': '在' + loc + '地区袭击平民',
    'strategic-dev': '在' + loc + '地区有战略部署'
  };
  var title = inc.date + '，' + a1 + (action[inc.type] || ('与' + a2 + '在' + loc + '发生冲突'));
  if (inc.fatalities > 0) title += '，造成' + inc.fatalities + '人死亡';
  return title;
}

function genChineseDesc(inc) {
  var typeName = getConflictTypeName(inc.type);
  var a1 = getActorDisplayName(inc.actor1);
  var a2 = getActorDisplayName(inc.actor2);
  var prov = getProvinceDisplayName(inc.province);
  var city = inc.city && inc.city !== 'Unknown' ? inc.city + '地区' : '';
  var desc = inc.date + '，' + a1 + '与' + a2 + '在' + prov + '省' + city + '发生' + typeName + '事件';
  if (inc.fatalities > 0) {
    desc += '，造成' + inc.fatalities + '人死亡';
    if (inc.severity === 'critical') desc += '，属严重等级事件';
  }
  desc += '。';
  if (inc.source) desc += '（来源：' + inc.source + '，事件ID：' + inc.id + '）';
  return desc;
}

function genEnglishTitle(inc) {
  var a1 = getActorDisplayName(inc.actor1);
  var a2 = getActorDisplayName(inc.actor2);
  var prov = getProvinceDisplayName(inc.province);
  var typeName = getConflictTypeName(inc.type);
  var t = inc.date + ': ' + a1 + ' ' + typeName + ' against ' + a2 + ' in ' + prov;
  if (inc.fatalities > 0) t += ', ' + inc.fatalities + ' killed';
  return t;
}

function genEnglishDesc(inc) {
  var a1 = getActorDisplayName(inc.actor1);
  var a2 = getActorDisplayName(inc.actor2);
  var prov = getProvinceDisplayName(inc.province);
  var typeName = getConflictTypeName(inc.type);
  var city = inc.city && inc.city !== 'Unknown' ? inc.city + ', ' : '';
  var desc = 'On ' + inc.date + ', ' + a1 + ' engaged ' + a2 + ' in ' + city + prov + ' province (' + typeName;
  if (inc.fatalities > 0) desc += ', ' + inc.fatalities + ' fatalities';
  desc += ').';
  if (inc.source) desc += ' Source: ' + inc.source + '.';
  return desc;
}

/* --- Rebuild all UI text after language switch --- */
function rebuildAllUIText() {
  /* Header */
  var h1 = document.querySelector('.brand h1');
  if (h1) h1.textContent = t('site.title');
  /* Info panel */
  var ipHeader = document.getElementById('infoPanelHeader');
  if (ipHeader) {
    ipHeader.childNodes[0] && (ipHeader.childNodes[0].textContent = ' ' + t('info.header') + ' ');
  }
  rebuildInfoPanelBody();

  /* Panel section headers */
  var phKeys = ['panel.stats','panel.filters','panel.events','panel.timeline','panel.log','panel.monthly','panel.quickReport'];
  document.querySelectorAll('.panel-header .ph-title').forEach(function(el, i) {
    if (i < phKeys.length) el.textContent = t(phKeys[i]);
  });

  /* Map legend */
  var legendH4 = document.querySelector('.map-legend h4');
  if (legendH4) legendH4.textContent = t('legend.title');
  rebuildMapLegendContent();

  /* Time slider */
  rebuildTimeSliderLabels();

  /* Re-render data-driven elements */
  if (window.renderMarkers) renderMarkers();
  if (window.updateStats) updateStats();
  if (window.updateEventList) updateEventList();
  if (window.updateTimeline) updateTimeline();
  updateFilterUI();
  updateEvtSortOptions();
  updateTlSortOptions();
  updateHeaderStatsLabels();
  updateQRPlaceholder();
  if (window.updateMoreInfoModal) updateMoreInfoModal();

  /* Province labels */
  if (window.updateLabelVisibility) updateLabelVisibility();

  /* Gen report link */
  var genLink = document.querySelector('#panelSection6 .ph-right span') || document.querySelector('[onclick="generateWeeklyReport()"] span');
  if (!genLink) {
    var links = document.querySelectorAll('.panel-header span[style]');
    for (var li = 0; li < links.length; li++) {
      if (links[li].textContent.indexOf('生成') !== -1 || links[li].textContent.indexOf('Generate') !== -1) {
        links[li].textContent = t('genReport');
        break;
      }
    }
  }

  /* Back/close buttons */
  var backBtn = document.getElementById('subPanelBack');
  if (backBtn) { backBtn.innerHTML = '&larr; ' + t('back'); backBtn.title = t('back'); }
  var closeBtn = document.getElementById('subPanelClose');
  if (closeBtn) closeBtn.title = t('close');

  /* More info button */
  var miBtn = document.querySelector('[onclick="showMoreInfo()"]');
  if (miBtn) miBtn.textContent = t('moreInfo.btn');

  /* Drawer if open */
  if (document.getElementById('subOverlay').classList.contains('open') && window.currentDrawerIncident) {
    openDrawer(window.currentDrawerIncident.id);
  }
}

function rebuildInfoPanelBody() {
  var body = document.querySelector('.info-panel-body-inner');
  if (!body) return;
  body.innerHTML =
    '<div class="info-search-wrap">' +
      '<input id="infoSearchInput" class="info-search-input" type="text" placeholder="' + t('info.search') + '" oninput="onInfoSearch(this.value)" />' +
      '<div id="infoSearchResults" class="info-search-results"></div>' +
    '</div>' +
    '<p><span class="info-label">' + t('info.map') + '</span><br>' + t('info.mapText') + '</p>' +
    '<p><span class="info-label">' + t('info.filtersBrief') + '</span><br>' + t('info.filtersBriefText') + '</p>' +
    '<p><span class="info-label">' + t('info.langBrief') + '</span><br>' + t('info.langBriefText') + '</p>' +
    '<p style="margin-top:10px;text-align:center;">' +
      '<button onclick="showMoreInfo()" class="info-more-btn">' + t('moreInfo.btn') + '</button>' +
    '</p>';
}

function rebuildMapLegendContent() {
  var legend = document.querySelector('.map-legend');
  if (!legend) return;
  var html = '<h4>' + t('legend.title') + '</h4>' +
    Object.entries(CONFLICT_TYPES).map(function(e) {
      return '<div class="leg-row"><span class="leg-dot" style="background:' + e[1].color + '"></span>' + getConflictTypeName(e[0]) + '</div>';
    }).join("") +
    '<div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--hair);font-size:10px;color:var(--ink3);line-height:1.6;">' + t('legend.help') + '</div>';
  legend.innerHTML = html;
}

function rebuildTimeSliderLabels() {
  var label = document.querySelector('.ts-label');
  if (label) label.textContent = t('ts.label');
  var btns = [
    ['ts1mBtn','ts.1m'],['ts3mBtn','ts.3m'],['ts6mBtn','ts.6m'],
    ['ts1yBtn','ts.1y'],['ts3yBtn','ts.3y'],['ts5yBtn','ts.5y'],['tsAllBtn','ts.all']
  ];
  btns.forEach(function(p) {
    var btn = document.getElementById(p[0]);
    if (btn) btn.textContent = t(p[1]);
  });
  if (window.updateTimeSliderInfo) updateTimeSliderInfo();
}

/* --- Update filter UI labels without resetting state --- */
function updateFilterUI() {
  /* Section headers - filter label spans inside filter-row-header */
  var filterLabels = document.querySelectorAll('#filterBody .filter-label');
  var labelKeys = ['filter.type', 'filter.severity', 'filter.actor'];
  filterLabels.forEach(function(el, i) {
    if (i < labelKeys.length) el.textContent = t(labelKeys[i]);
  });
  /* Province/Date standalone labels (after the actor section) */
  var standaloneLabels = document.querySelectorAll('#filterBody > .filter-wrap > .filter-label');
  var sKeys = ['filter.province', 'filter.dateRange'];
  standaloneLabels.forEach(function(el, i) {
    if (i < sKeys.length) el.textContent = t(sKeys[i]);
  });

  /* Select all / invert links inside filter-label-en spans */
  var actionLinks = document.querySelectorAll('.filter-label-en a');
  actionLinks.forEach(function(a) {
    var txt = a.textContent.trim();
    if (txt === '全选' || txt === 'All') { a.textContent = t('filter.selectAll'); a.title = LANG === 'zh' ? '全选/取消全选' : 'Select/Deselect All'; }
    else if (txt === '反选' || txt === 'Invert') { a.textContent = t('filter.invert'); a.title = LANG === 'zh' ? '反选' : 'Invert Selection'; }
  });
  /* Actor hint text in filter-label-en */
  var hintSpans = document.querySelectorAll('.filter-label-en');
  hintSpans.forEach(function(sp) {
    // Update the text node after the "反选" link and before "&circled;i;"
    var txt = sp.textContent;
    if (txt.indexOf('点击=选择') !== -1 || txt.indexOf('Click=Select') !== -1) {
      // Rebuild the actor hint span
      var links = sp.querySelectorAll('a');
      var hintText = t('filter.actorHint');
      if (links.length >= 2) {
        sp.innerHTML = '';
        sp.appendChild(links[0]);
        sp.appendChild(document.createTextNode(' · '));
        sp.appendChild(links[1]);
        sp.appendChild(document.createTextNode(' · ' + hintText));
      }
    }
  });

  /* Type chips */
  document.querySelectorAll('#filterTypes .chip').forEach(function(c) {
    c.textContent = getConflictTypeName(c.dataset.value);
  });
  /* Severity chips */
  document.querySelectorAll('#filterSeverity .chip').forEach(function(c) {
    c.textContent = getSeverityName(c.dataset.value);
  });
  /* Province select options */
  var selP = document.getElementById('filterProvince');
  if (selP) {
    var curVal = selP.value;
    var opts = selP.querySelectorAll('option');
    if (opts.length > 0) opts[0].textContent = t('filter.allProv');
    for (var i = 1; i < opts.length; i++) {
      var provKey = opts[i].value;
      if (DRC_PROVINCES[provKey]) {
        var p = DRC_PROVINCES[provKey];
        opts[i].textContent = (LANG === 'en' ? p.en : p.zh) + '  ' + (LANG === 'en' ? p.zh : p.en);
      }
    }
    selP.value = curVal;
  }
  /* Actor search placeholder */
  var as = document.getElementById('actorSearch');
  if (as) as.placeholder = t('filter.actorSearch');
  /* Section headers */
  var filterHeaders = document.querySelectorAll('[data-panel="filterBody"] .ph-title');
  if (filterHeaders.length > 0) filterHeaders[0].textContent = t('panel.filters');
  /* Apply/reset button text */
  var btns = document.querySelectorAll('#filterBody .btn-row button');
  if (btns.length >= 2) {
    btns[0].textContent = t('filter.apply');
    btns[1].textContent = t('filter.reset');
  }
  /* Match text */
  var infoRows = document.querySelectorAll('#filterBody .info-row');
  infoRows.forEach(function(row) {
    var matchText = t('filter.match');
    var fc2 = row.querySelector('#filterCount');
    if (fc2) {
      row.childNodes[0] && (row.childNodes[0].textContent = matchText + ' ');
      fc2.textContent = activeIncidents.length + t('filter.unit');
    }
  });
  /* Update counts */
  var actorCountEls = document.querySelectorAll('#filterActors > div');
  actorCountEls.forEach(function(el) {
    if (el.style && el.style.fontSize === '10px') {
      var allActors = [...new Set(INCIDENTS.flatMap(function(d){return [d.actor1,d.actor2];}))]
        .filter(function(a){return a!=="N/A"&&a!=="平民"&&a!=="政府"&&a!=="民众"&&a!=="矿工工会"&&a!=="矿业公司"&&a!=="警方";});
      el.textContent = allActors.length + (LANG === 'zh' ? ' 个行为体' : ' actors');
    }
  });
}

/* --- Update event list sort/group options --- */
function updateEvtSortOptions() {
  var sel = document.getElementById('evtSort');
  if (sel) {
    sel.options[0].textContent = t('evt.newest');
    sel.options[1].textContent = t('evt.oldest');
    sel.options[2].textContent = t('evt.fatal');
    sel.options[3].textContent = t('evt.severity');
  }
  var grp = document.getElementById('evtGroup');
  if (grp) {
    grp.options[0].textContent = t('evt.groupNone');
    grp.options[1].textContent = t('evt.groupYear');
    grp.options[2].textContent = t('evt.groupProvince');
  }
}

/* --- Update timeline sort options --- */
function updateTlSortOptions() {
  var sel = document.getElementById('tlSort');
  if (sel) {
    sel.options[0].textContent = t('tl.newest');
    sel.options[1].textContent = t('tl.oldest');
    sel.options[2].textContent = t('tl.critical');
  }
}

/* --- Update header quick stats labels --- */
function updateHeaderStatsLabels() {
  var qstatLbls = document.querySelectorAll('.quick-stats .qstat .lbl');
  var labels = ['head.monthEvents', 'head.estDeaths', 'head.battlesClashes', 'head.provincesAffected'];
  qstatLbls.forEach(function(el, i) {
    if (i < labels.length) el.textContent = t(labels[i]);
  });
  var liveEl = document.querySelector('.quick-stats > span');
  if (liveEl && liveEl.textContent.indexOf('态势') !== -1 || (liveEl && liveEl.textContent.indexOf('Monitor') !== -1)) {
    // Update the monitoring text - it's in a span with live-dot
    var spans = document.querySelectorAll('.quick-stats > span');
    spans.forEach(function(s) {
      if (s.querySelector('.live-dot')) {
        s.childNodes.forEach(function(cn) {
          if (cn.nodeType === 3) cn.textContent = t('head.monitoring');
        });
      }
    });
  }
  /* Also update the tagline */
  var tagline = document.querySelector('.brand .sub');
  if (tagline) {
    if (LANG === 'en') {
      tagline.innerHTML = t('site.tagline');
    } else {
      tagline.innerHTML = 'DRC Conflict Situational Awareness Atlas ' + t('site.tagline');
    }
  }
}

/* --- Update QR textarea placeholder --- */
function updateQRPlaceholder() {
  var ta = document.getElementById('qrInput');
  if (ta) ta.placeholder = t('qr.placeholder');
  var hint = document.querySelector('#qrOptions > span');
  if (hint && hint.textContent.indexOf('输入') !== -1 || (hint && hint.textContent.indexOf('Type') !== -1)) {
    hint.textContent = t('qr.hint');
  }
  var qrHeader = document.querySelector('[data-panel="qrBody"] .ph-title');
  if (qrHeader) qrHeader.textContent = t('panel.quickReport');
}

/* Expose */
window.updateFilterUI = updateFilterUI;
