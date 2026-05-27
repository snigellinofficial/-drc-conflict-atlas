/* =====================================================================
   CONFIG — 刚果(金)冲突态势感知 · 配置
   ===================================================================== */

/* --- 冲突类型（仅4类，聚焦武装冲突） --- */
const CONFLICT_TYPES = {
  "battles":            {zh:"战斗/武装冲突",    en:"Battles",               color:"#8b2020"},
  "remote-violence":    {zh:"远程暴力/爆炸",    en:"Explosions/Remote",     color:"#a0522d"},
  "violence-civilians": {zh:"对平民暴力",       en:"Violence vs Civilians", color:"#b8860b"},
  "strategic-dev":      {zh:"战略动态",         en:"Strategic Development", color:"#5c4033"}
};

/* --- 严重等级 --- */
const SEVERITY_LEVELS = {
  "critical": {zh:"严重",   size:14, color:"#8b2020", weight:4},
  "high":     {zh:"高",     size:10, color:"#a0522d", weight:3},
  "medium":   {zh:"中等",   size:7,  color:"#b8860b", weight:2},
  "low":      {zh:"低",     size:5,  color:"#6b8e6b", weight:1}
};

/* --- 刚果(金)26省（中英文） --- */
const DRC_PROVINCES = {
  "Kinshasa":       {zh:"金沙萨",     en:"Kinshasa"},
  "Kongo-Central":  {zh:"中刚果",     en:"Kongo-Central"},
  "Kwango":         {zh:"宽果",       en:"Kwango"},
  "Kwilu":          {zh:"奎卢",       en:"Kwilu"},
  "Mai-Ndombe":     {zh:"马伊恩东贝", en:"Mai-Ndombe"},
  "Équateur":       {zh:"赤道",       en:"Équateur"},
  "Sud-Ubangi":     {zh:"南乌班吉",   en:"Sud-Ubangi"},
  "Nord-Ubangi":    {zh:"北乌班吉",   en:"Nord-Ubangi"},
  "Mongala":        {zh:"蒙加拉",     en:"Mongala"},
  "Tshuapa":        {zh:"楚阿帕",     en:"Tshuapa"},
  "Tshopo":         {zh:"乔波",       en:"Tshopo"},
  "Lower Uele":     {zh:"下韦莱",     en:"Lower Uele"},
  "Upper Uele":     {zh:"上韦莱",     en:"Upper Uele"},
  "Ituri":          {zh:"伊图里",     en:"Ituri"},
  "North Kivu":     {zh:"北基伍",     en:"North Kivu"},
  "South Kivu":     {zh:"南基伍",     en:"South Kivu"},
  "Maniema":        {zh:"马涅马",     en:"Maniema"},
  "Sankuru":        {zh:"桑库鲁",     en:"Sankuru"},
  "Kasai":          {zh:"开赛",       en:"Kasai"},
  "Central Kasai":  {zh:"中开赛",     en:"Central Kasai"},
  "Kasai-Oriental": {zh:"东开赛",     en:"Kasai-Oriental"},
  "Lomami":         {zh:"洛马米",     en:"Lomami"},
  "Haut-Lomami":    {zh:"上洛马米",   en:"Haut-Lomami"},
  "Tanganyika":     {zh:"坦噶尼喀",   en:"Tanganyika"},
  "Haut-Katanga":   {zh:"上加丹加",   en:"Haut-Katanga"},
  "Lualaba":        {zh:"卢阿拉巴",   en:"Lualaba"}
};

/* --- 冲突行为体档案（基于维基百科/学术来源） --- */
const ACTOR_PROFILES = {
  "M23": {
    name: "M23 / March 23 Movement",
    zh: "M23运动（3月23日运动）",
    type: "反政府武装",
    active_since: "2012",
    region: "北基伍省、南基伍省",
    strength: "估计3,000–5,000人",
    allies: "据称获得卢旺达支持（卢方否认）",
    opponents: "FARDC、MONUSCO、Wazalendo民兵",
    desc: "M23（March 23 Movement）是刚果(金)东部的一支反政府武装，以2012年3月23日和平协议命名。该组织主要由图西族武装人员组成，2012-2013年首次叛乱期间曾短暂占领戈马市。2022年3月重新活跃，在北基伍省发动大规模攻势。联合国专家报告和多方证据显示M23获得卢旺达国防军(RDF)的物资和兵力支持，卢旺达政府予以否认。M23控制着北基伍省大片领土，包括重要的钶钽铁矿区。",
    wiki: "https://en.wikipedia.org/wiki/M23_rebellion",
    sources: ["UN Group of Experts report (2023)", "Human Rights Watch", "Congo Research Group"]
  },
  "ADF": {
    name: "ADF / Allied Democratic Forces",
    zh: "民主同盟军（ADF）",
    type: "伊斯兰主义武装",
    active_since: "1995",
    region: "北基伍省、伊图里省（跨乌干达边境）",
    strength: "估计1,500–2,500人",
    allies: "伊斯兰国中非省(ISCAP)",
    opponents: "FARDC、UPDF(乌干达军方)、MONUSCO",
    desc: "民主同盟军(ADF)起源于乌干达的反政府运动，1990年代末转入刚果(金)东部活动。2019年起宣誓效忠伊斯兰国(ISIS)，成为其中非省份(ISCAP)。ADF以极端暴力著称，频繁袭击平民、学校和医院。主要在贝尼(Beni)和伊鲁穆(Irumu)地区活动，2022年起在乌干达境内也发动了袭击。乌干达和刚果(金)于2021年底发起代号'Shujaa'的联合军事行动打击ADF。",
    wiki: "https://en.wikipedia.org/wiki/Allied_Democratic_Forces",
    sources: ["Congo Research Group", "UN Group of Experts", "Bridgeway Foundation"]
  },
  "CODECO": {
    name: "CODECO / Cooperative for Development of the Congo",
    zh: "刚果发展合作社（CODECO）",
    type: "族群民兵",
    active_since: "2017",
    region: "伊图里省",
    strength: "估计2,000–4,000人（多派系）",
    allies: "部分伦杜族传统领袖",
    opponents: "FARDC、赫马族自卫武装",
    desc: "CODECO（Cooperative for Development of the Congo）名义上是一个农业发展组织，但实际上代表伊图里省伦杜(Lendu)族的武装民兵联盟。CODECO由多个松散的派系组成，主要与赫马(Hema)族武装发生冲突。冲突根源可追溯到殖民时期的族群土地争议和矿产资源控制。CODECO武装经常袭击赫马族村庄和流离失所者营地，也袭击FARDC军事目标。",
    wiki: "https://en.wikipedia.org/wiki/CODECO",
    sources: ["UN Group of Experts", "International Crisis Group", "HRW"]
  },
  "FARDC": {
    name: "FARDC / Armed Forces of the DRC",
    zh: "刚果(金)武装部队（FARDC）",
    type: "国家正规军",
    active_since: "2003",
    region: "全国",
    strength: "约100,000–140,000人",
    allies: "MONUSCO、布隆迪军方、南非军方",
    opponents: "M23、ADF、CODECO、各Mai-Mai民兵",
    desc: "刚果(金)武装部队(FARDC)是刚果民主共和国的国家军队，2003年由多个前交战方的武装力量整编而成。FARDC面临指挥混乱、后勤匮乏、士气低落和系统性腐败等严重问题。在东部省份，FARDC同时应对M23、ADF、CODECO等多支武装组织。2025年以来，FARDC在北基伍省与M23的战斗中损失惨重，引发国内对其战斗力的广泛质疑。",
    wiki: "https://en.wikipedia.org/wiki/Armed_Forces_of_the_Democratic_Republic_of_the_Congo",
    sources: ["Congo Research Group", "UN Group of Experts", "IISS Military Balance"]
  },
  "FDLR": {
    name: "FDLR / Democratic Forces for the Liberation of Rwanda",
    zh: "卢旺达解放民主力量（FDLR）",
    type: "反政府武装",
    active_since: "2000",
    region: "南基伍省、北基伍省",
    strength: "估计1,000–2,000人",
    allies: "无明确盟友",
    opponents: "FARDC、卢旺达国防军(RDF)、M23",
    desc: "卢旺达解放民主力量(FDLR)是由1994年卢旺达种族大屠杀后逃往刚果(金)的胡图族前政府军和联攻派民兵组成的武装组织。FDLR在南基伍省和北基伍省的偏远森林地区活动，从事非法矿产贸易以维持运作。卢旺达政府以FDLR的存在作为干预刚果(金)东部的理由之一。近年来FDLR实力大幅削弱，但仍是区域安全的不稳定因素。",
    wiki: "https://en.wikipedia.org/wiki/Democratic_Forces_for_the_Liberation_of_Rwanda",
    sources: ["UN Group of Experts", "International Crisis Group"]
  },
  "MONUSCO": {
    name: "MONUSCO / UN Stabilization Mission in DRC",
    zh: "联合国刚果(金)稳定团（MONUSCO）",
    type: "联合国维和部队",
    active_since: "2010",
    region: "北基伍省、南基伍省、伊图里省",
    strength: "约14,000名军事人员",
    allies: "FARDC",
    opponents: "M23、ADF、CODECO",
    desc: "联刚稳定团(MONUSCO)是联合国在刚果(金)的维和行动，前身为1999年设立的联刚特派团(MONUC)，2010年改为现名。是目前世界上规模最大的联合国维和行动之一。MONUSCO的任务包括保护平民、支持政府机构、促进人权和监督选举。2024年起，刚果(金)政府要求MONUSCO加速撤离，但东部安全形势恶化使得撤离计划多次推迟。",
    wiki: "https://en.wikipedia.org/wiki/MONUSCO",
    sources: ["UN Security Council reports", "MONUSCO official"]
  },
  "Wazalendo": {
    name: "Wazalendo / Patriotic Resistance",
    zh: "瓦扎伦多（爱国抵抗民兵）",
    type: "亲政府民兵联盟",
    active_since: "2023",
    region: "北基伍省",
    strength: "估计5,000–10,000人",
    allies: "FARDC",
    opponents: "M23",
    desc: "Wazalendo（斯瓦希里语'爱国者'）是2023年形成的亲政府民兵联盟，由多个地方自卫武装和Mai-Mai团体组成。在M23重新崛起的背景下，FARDC与Wazalendo形成了事实上的战术同盟。Wazalendo在北基伍省协助FARDC对抗M23，但也因纪律涣散和侵犯平民人权而受到批评。",
    wiki: "https://en.wikipedia.org/wiki/Wazalendo",
    sources: ["UN Group of Experts (2024)", "Congo Research Group"]
  },
  "IS-CAP": {
    name: "IS-CAP / Islamic State Central Africa Province",
    zh: "伊斯兰国中非省（ISCAP）",
    type: "伊斯兰主义武装",
    active_since: "2019",
    region: "北基伍省、伊图里省（跨莫桑比克边境）",
    strength: "估计800–1,500人",
    allies: "ADF（核心组成部分）",
    opponents: "FARDC、UPDF、MONUSCO",
    desc: "伊斯兰国中非省(ISCAP)是伊斯兰国(ISIS)在非洲中部的分支，ADF是其核心组成部分。ISCAP于2019年首次被ISIS中央媒体提及，此后频繁声称对刚果(金)和乌干达境内的袭击事件负责。ISCAP也活跃于莫桑比克德尔加杜角省。该组织善于利用社交媒体进行宣传，以期扩大国际影响力。",
    wiki: "https://en.wikipedia.org/wiki/Islamic_State_%E2%80%93_Central_Africa_Province",
    sources: ["UN Security Council reports", "Bridgeway Foundation", "ACLED"]
  },
  "Mai-Mai": {
    name: "Mai-Mai / Local Defense Militias",
    zh: "Mai-Mai（地方自卫民兵联盟）",
    type: "地方民兵（多派系）",
    active_since: "1990s",
    region: "南基伍省、北基伍省、坦噶尼喀省、马涅马省",
    strength: "各派系总计10,000–20,000人",
    allies: "部分派系与FARDC合作",
    opponents: "FDLR、M23、其他Mai-Mai派系",
    desc: "Mai-Mai是对刚果(金)东部数十个地方民兵组织的统称。这些组织通常基于族群或社区组建，声称保护本地民众免受外来武装侵害。Mai-Mai各派系之间关系复杂，有些与FARDC合作，有些则与其他武装结盟或保持独立。主要派系包括Mai-Mai Yakutumba、Mai-Mai Mazembe、Mai-Mai Apa na Pale等。部分Mai-Mai参与了2023年以来在北基伍省对抗M23的行动，组成Wazalendo联盟。",
    wiki: "https://en.wikipedia.org/wiki/Mai-Mai",
    sources: ["UN Group of Experts", "International Crisis Group", "Rift Valley Institute"]
  },
  "RDF": {
    name: "RDF / Rwanda Defence Force",
    zh: "卢旺达国防军（RDF）",
    type: "国家正规军",
    active_since: "1994",
    region: "卢旺达及刚果(金)东部边境",
    strength: "约33,000人",
    allies: "",
    opponents: "FDLR",
    desc: "卢旺达国防军(RDF)是卢旺达的国家军队。自1990年代以来，RDF（及其前身RPF/RPA）多次介入刚果(金)东部冲突，官方理由为打击卢旺达种族大屠杀后逃往刚果(金)的FDLR武装。联合国专家报告和多方证据显示RDF为M23反政府武装提供物资、训练和兵力支持，卢旺达政府坚决否认。刚果(金)政府多次指控卢旺达通过支持M23掠夺刚果(金)东部的矿产资源。",
    wiki: "https://en.wikipedia.org/wiki/Rwanda_Defence_Force",
    sources: ["UN Group of Experts (2023, 2024)", "Human Rights Watch", "Congo Research Group"]
  },
  "UPDF": {
    name: "UPDF / Uganda People's Defence Force",
    zh: "乌干达人民国防军（UPDF）",
    type: "国家正规军",
    active_since: "1995",
    region: "乌干达及刚果(金)东部边境（北基伍省、伊图里省）",
    strength: "约45,000–50,000人",
    allies: "FARDC",
    opponents: "ADF、ISCAP",
    desc: "乌干达人民国防军(UPDF)是乌干达的国家军队。自2021年11月起，UPDF与FARDC在北基伍省和伊图里省发起代号'Shujaa'的联合军事行动，旨在打击ADF/ISCAP武装。UPDF在刚果(金)东部的存在引发了一定争议，部分民间团体对其历史角色表示担忧（UPDF在1990-2000年代曾卷入刚果冲突）。乌干达政府强调此次行动是应刚果(金)政府邀请。",
    wiki: "https://en.wikipedia.org/wiki/Uganda_People%27s_Defence_Force",
    sources: ["UN Security Council reports", "International Crisis Group"]
  },
  "LRA": {
    name: "LRA / Lord's Resistance Army",
    zh: "上帝抵抗军（LRA）",
    type: "反政府武装/邪教武装",
    active_since: "1987",
    region: "上韦莱省、下韦莱省（前活动区）；现主要在中非共和国",
    strength: "估计100–500人（残部）",
    allies: "无",
    opponents: "FARDC、UPDF、非洲联盟区域特遣部队",
    desc: "上帝抵抗军(LRA)是由约瑟夫·科尼(Joseph Kony)领导的极端主义武装组织，起源于乌干达北部。LRA以极端暴力、绑架儿童充当士兵和性奴而臭名昭著。2010年代被乌干达军方和美国顾问支持的非洲联盟部队驱逐出刚果(金)后，LRA残余势力目前主要在中非共和国东部活动，对上韦莱省的威胁已显著降低，但偶有零星袭击。",
    wiki: "https://en.wikipedia.org/wiki/Lord%27s_Resistance_Army",
    sources: ["UN Security Council reports", "HRW", "Crisis Tracker - LRA"]
  }
};

/* --- 数据源 --- */
const DATA_SOURCES = {
  "ACLED":    {url:"https://acleddata.com/",     desc:"武装冲突地点与事件数据（主要来源）"},
  "GDELT":    {url:"https://www.gdeltproject.org/", desc:"全球事件数据库（交叉验证）"},
  "UCDP":     {url:"https://ucdp.uu.se/",        desc:"乌普萨拉冲突数据（学术验证）"},
  "ReliefWeb":{url:"https://reliefweb.int/",      desc:"联合国人道事务协调厅"},
  "UN News":  {url:"https://news.un.org/",        desc:"联合国新闻"},
  "Reuters":  {url:"https://www.reuters.com/",    desc:"路透社"}
};
