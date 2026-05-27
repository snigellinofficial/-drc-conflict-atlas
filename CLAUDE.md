# CLAUDE.md — 刚果（金）冲突态势感知地图 / DRC Conflict Situational Awareness Atlas

> 仅聚焦刚果(金) · 武装冲突与战争事件 · 态势感知交互地图
> 给 AI 编码 agent 的项目说明。每次会话开始通读;严格遵守「工作流」与「硬规则」。

## 0. WORKFLOW
1. **Plan Mode 优先**:新需求先给可执行清单待确认,再动手改代码。
2. **本文件是活文档**:改完只局部更新受影响的小节,不整篇重写。
3. **小步快跑**:一次只做清单里的一项;改完提示 `git commit`。
4. **每次会话结束必须 commit + push**:所有代码修改完成后 `git add -A && git commit -m "<描述>" && git push origin main`。GitHub Pages 在 push 后自动部署。

## 1. WHY — 目标
面向**中文读者**、**严格中立**的刚果(金)冲突态势感知交互地图。聚焦**刚果(金)26个省份**的武装冲突和战争事件,仅聚合 ACLED/GDELT/UCDP 公开冲突数据,不做独立安全分析或预测。

## 2. ARCHITECTURE — 模块化架构
```
project-2/
├── css/style.css            — 全局样式(殖民时期羊皮纸美学)
├── js/
│   ├── config.js            — 冲突类型/严重等级/26省/12个行为体档案
│   ├── i18n.js              — ★ 国际化引擎(字符串表/t()/语言切换/事件本地化)
│   ├── data.js              — 内置事件数据(23条,2020-2026)
│   ├── map.js               — Leaflet地图初始化/标记/省份GeoJSON图层/省份摘要
│   ├── filters.js           — 筛选逻辑(类型/等级/行为体/省份/时间)
│   ├── stats.js             — 统计计算+月度趋势图
│   ├── drawer.js            — 次级弹窗(事件详情/态势评估, 全双语)
│   ├── timeline.js          — 时间轴和事件列表渲染
│   ├── weekly-report.js     — 月度报告生成(doublecheck→结构化双语报告)
│   └── quick-report.js      — 快速报告(模糊匹配→RAND风格简式双语报告)
├── data/
│   ├── drc_provinces.json            — DRC 26省 GeoJSON 边界数据(~1MB)
│   ├── acled_drc_data.json           — ACLED 全量事件(35,810条, ~31MB, 参考)
│   ├── incidents.js                  — 采样后外部事件(2,357条, <script>加载)
│   ├── incidents.json                — 合并事件(23内置+采样ACLED, fetch回退)
│   ├── cleaned_incidents.js          — 校验清洗后的事件数据
│   ├── validation_report.json        — 数据校验报告
│   ├── external_incidents_synthetic.js — 已隔离的合成数据(不再加载)
│   ├── conflict_db.json              — 本地冲突数据库
│   └── update_log.json               — 每日更新日志
├── scripts/
│   ├── crawler.py           — 数据爬虫(GDELT 2.0 API)
│   ├── acled_crawler.py     — ACLED OAuth爬虫(2010至今全量获取)
│   ├── ci_update.py         — GitHub Actions CI入口(每日增量更新)
│   ├── auto_update.py       — 本地自动更新(refresh_token, 支持调度)
│   ├── get_acled_token.py   — ACLED OAuth token获取(本地运行)
│   ├── merge_data.py        — 数据合并/采样/生成输出文件
│   ├── validate_data.py     — 数据校验(8条规则, 自动修复)
│   └── trigger_workflow.py  — GitHub Actions手动触发工具
├── africa_security_map.html — ★ 主交付物(浏览器直接打开)
└── CLAUDE.md
```

**红线**:数据层与展示层严格分离。所有内容修改只动 `js/data.js` 和 `data/incidents.json`;展示代码不变。

## 3. DATA SCHEMA — 冲突事件格式
```json
{
  "id": "DRC-001",
  "date": "YYYY-MM-DD",
  "country": "DR Congo",
  "province": "省份(英文,须匹配 DRC_PROVINCES key)",
  "city": "城市",
  "lat": 纬度, "lng": 经度,
  "type": "battles|remote-violence|violence-civilians|strategic-dev",
  "severity": "critical|high|medium|low",
  "fatalities": 死亡人数,
  "actor1": "行为体1", "actor2": "行为体2",
  "title": "标题(中文)",
  "desc": "描述(中文,2-4句)",
  "source": "ACLED|GDELT|UCDP|ReliefWeb|UN News|Reuters",
  "sourceUrl": "原始链接(可选)",
  "verified": true/false
}
```

### 冲突类型(仅聚焦战争/冲突)
| key | 中文 | 颜色 |
|-----|------|------|
| battles | 战斗/武装冲突 | #8b2020 |
| remote-violence | 远程暴力/爆炸 | #a0522d |
| violence-civilians | 对平民暴力 | #b8860b |
| strategic-dev | 战略动态 | #5c4033 |

### 冲突行为体档案(12个)
M23, ADF, CODECO, FARDC, FDLR, MONUSCO, Wazalendo, IS-CAP, Mai-Mai, RDF, UPDF, LRA — 每个含名称/类型/活跃时间/活动区域/兵力估计/盟友/对手/简介(Wikipedia来源)/Wiki链接

## 4. FEATURES
### 全局语言切换
页面顶部中/英切换按钮。中文模式:所有UI翻译为中文, ACLED事件通过结构化模板生成中文标题/描述, 术语附拉丁字母原文。英文模式:所有UI翻译为英文, 内置中文事件通过模板生成英文。行为体名称保留原文。语言偏好通过URL参数 `?lang=en` 持久化(禁用localStorage)。

### 左上信息面板
动态双语(中/英)说明:系统性质、数据来源、更新模式、地图交互、技术架构

### 右面板浏览栏 (7大模块,点击展开/折叠)
1. **统计概览** — 6格统计卡片(总事件/累计死亡/战斗数/严重事件/省份数/本月新增)
2. **筛选器** — 类型×4 + 等级×4 + 行为体(多选chips) + 省份下拉(26省) + 日期范围
3. **冲突事件列表** — 可滚动,点击定位到地图标记
4. **时间轴** — 最近40条,倒序排列
5. **更新日志** — 从 `data/update_log.json` 加载,简洁格式
6. **周报** — 点击生成:doublecheck→6段结构化中文报告(总体态势/按省份/按类型/最严重事件/活跃区域/数据说明)
7. **快速报告** — 输入冲突关键词→自动模糊匹配province/actor→提供options→也可全库max搜索→RAND风格简式中文报告(概况/年度趋势/类型构成/最致命事件/简要分析/来源)

### 次级弹窗(流畅过渡动画)
- 事件详情:类型/等级/描述/伤亡表/态势评估/来源,可点击行为体查看档案
- 行为体档案:8个组织的详细信息卡片
- 省份概况:点击地图省份→该省统计+近期事件
- 周报/快速报告均在此弹窗展示

### 地图图层
- CARTO light_all 底图(殖民时期羊皮纸风格,sepia滤镜)
- DRC 26省 GeoJSON 边界,含中文标注,有冲突省份高亮
- 圆形标记:颜色=冲突类型,大小=严重等级
- Leaflet.markercluster 聚合
- 省份点击→弹出该省冲突摘要

### 数据管道
- **ACLED 主数据源**: OAuth 认证, 覆盖 2010-07-01 至今, 35,810 条真实事件
- **智能采样**: critical+high 全保留, medium 每省每年最多3条, low 每省每年最多2条
- **数据校验**: `scripts/validate_data.py` — 8条规则(时间分布/行为体/类型/等级/描述/坐标/省份/来源)
- **去重策略**: (date, province, city) 三元组匹配, MD5 hash ID
- **23条内置事件**: 手工整理的中文描述, 含可溯源 URL, 保留在 `js/data.js`
- **200条合成数据**: 已隔离至 `data/external_incidents_synthetic.js`, 不再加载

### 自动更新
- **GitHub Actions** (云端, 电脑关机也能跑):
  - `.github/workflows/update_data.yml` — 每日 UTC 00:07 (北京时间 08:07)
  - `scripts/ci_update.py` — 从 GitHub Secrets 读取 ACLED 凭证, 获取 OAuth token, 拉取最近30天数据, 合并后 commit+push
  - 需在 GitHub 仓库 Settings > Secrets 中配置 `ACLED_EMAIL` 和 `ACLED_PASSWORD`
- **本地自动更新** (`scripts/auto_update.py`):
  - 使用 refresh_token (14天有效), 过期后需重新运行 `get_acled_token.py`
  - 支持 `--schedule` (每日08:00) 和 `--interval N` (每N小时)
- **Node.js 20 弃用**: GitHub Actions 将于 2026-06-02 强制 Node.js 24。工作流已设置 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`。若 actions/checkout 或 actions/setup-python 发布支持 Node 24 的新主版本, 应及时升级。

## 5. CONVENTIONS
- 文案中文为主,关键术语中英并置。
- 殖民时期羊皮纸美学:parchment底色、Noto Serif SC(中文)、Times New Roman(英文)、sepia底图滤镜、paper纹理
- 地图使用 Leaflet v1.9 + MarkerCluster + CARTO light_all 底图(无需 API Key)。
- 省份 GeoJSON 来自 geoBoundaries,属性名 `name`(英文)、`iso`。
- 日期统一 ISO(`YYYY-MM-DD`)。
- 禁用 `localStorage` / `sessionStorage`。
- 全部文件 UTF-8 编码。

## 6. HARD RULES
**绝不**:破坏数据/展示层分离;写死内容进展示逻辑;写入密钥;虚构事件;政治倾向措辞;擅自更换地图引擎/配色/字体;引入 DRC 以外的国家数据。
**务必**:新需求先 Plan Mode;数据标注来源和验证状态;改完实测浏览器交互;更新后局部修改本 CLAUDE.md;province 字段值必须匹配 DRC_PROVINCES key。

## 7. DATA SOURCES
- **ACLED** — 武装冲突地点与事件数据(https://acleddata.com/)
- **GDELT** — 全球事件数据库(https://www.gdeltproject.org/)
- **UCDP** — 乌普萨拉冲突数据(https://ucdp.uu.se/)
- **ReliefWeb** — UN OCHA 人道信息(https://reliefweb.int/)
- **geoBoundaries** — DRC 行政区划边界(https://www.geoboundaries.org/)

## 8. ROADMAP
- [x] P-A 模块化重构(JS/CSS 分离)
- [x] P-B DRC+周边聚焦,仅保留冲突类型
- [x] P-C 右面板浏览栏(7模块,点击展开/折叠)
- [x] P-D 次级弹窗(事件详情/态势评估)
- [x] P-E 爬虫工具(GDELT→本地库→日志)
- [x] P-F 周报生成(doublecheck→结构化中文报告)
- [x] P-G 快速报告(模糊匹配→options→RAND风格简式报告)
- [x] P-H DRC-only深度聚焦(26省GeoJSON/殖民美学/行为体档案/中英双语)
- [x] P-K 真实ACLED数据集成(35,810条, 2010-2026, OAuth认证)
- [x] P-L 数据校验流水线(8规则验证+自动修复)
- [x] P-M GitHub Actions云端自动更新(每日增量+commit+push)
- [x] P-N 行为体档案扩展(8→12: +Mai-Mai, RDF, UPDF, LRA)
- [x] P-O 全局语言切换(中/英, i18n引擎, 事件本地化)
- [x] P-P 省份详情页优化(行为体按频率降序, 省略号展开)
- [x] P-Q README重写(面向最终用户, 移除API密钥要求)
- [x] P-R CLI中文写作skill(chinese-writing.md)
- [ ] P-I 热力图/密度图模式
- [ ] P-J 实时推送(GDELT streaming)

## 9. HOW TO RUN
- **地图**: 浏览器打开 `africa_security_map.html` (联网加载 Leaflet CDN 和底图)
- **ACLED Token**: `python scripts/get_acled_token.py` (首次或refresh_token过期时运行)
- **全量爬取**: `python scripts/acled_crawler.py` (2010-07-01至今, 需先在data/配置token)
- **数据合并**: `python scripts/merge_data.py` (合并内置+ACLED, 生成incidents.js/json)
- **数据校验**: `python scripts/validate_data.py` (运行8规则验证,生成报告)
- **本地自动更新**: `python scripts/auto_update.py --schedule` (每日08:00, 14天免维护)
- **云端自动更新**: 推送至 GitHub 后, Actions 每日自动运行 (无需开机)
- **GitHub Secrets**: 在 repo Settings > Secrets > Actions 配置 ACLED_EMAIL 和 ACLED_PASSWORD
