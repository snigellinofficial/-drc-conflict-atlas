# 刚果（金）冲突态势感知地图 / DRC Conflict Situational Awareness Atlas

> 交互式刚果（金）武装冲突态势感知系统 · 2020–2026 · 26省全覆盖

---

## 项目概览

本项目是一份面向中文读者的**刚果（金）冲突态势感知交互地图**，基于 ACLED/GDELT/UCDP 公开冲突数据，对刚果（金）26个省份的武装冲突事件进行聚合、筛选与可视化。仅做公开信息的汇总呈现，不构成独立安全分析或预测。

**在线访问**: 浏览器直接打开 `africa_security_map.html`（需联网加载地图底图）

## 主要功能

- **交互式地图** — Leaflet 引擎 · CARTO 底图 · DRC 26省 GeoJSON 边界
- **7模块浏览栏** — 统计概览、筛选器（多选/搜索/全选/反选）、事件列表（排序/分组）、时间轴、更新日志、周报、快速报告
- **冲突标记** — 颜色=类型 · 大小=严重等级 · 点击查看详情
- **省份互动** — 点击省份查看历史冲突概况 · 缩放至9级以上显示省份名称
- **时段选择** — 地图左下角时间范围选择器（默认最近3个月）· 预设快速切换
- **次级弹窗** — 事件详情/行为体档案/省份概况 · 多级返回导航
- **数据来源** — 200条合成事件（基于 ACLED 分布模式生成）+ GDELT 爬虫实时拉取

## 技术架构

```
project-2/
├── css/style.css              — 全局样式（黑/白/红殖民美学）
├── js/
│   ├── config.js              — 冲突类型/严重等级/26省/8个行为体档案
│   ├── data.js                — 内置事件数据
│   ├── map.js                 — 地图初始化/标记/省份GeoJSON/时段选择
│   ├── filters.js             — 筛选逻辑（类型/等级/行为体/省份/时间）
│   ├── stats.js               — 统计计算
│   ├── drawer.js              — 次级弹窗（事件详情/行为体档案）· 返回栈
│   ├── timeline.js            — 时间轴和事件列表
│   ├── weekly-report.js       — 周报生成
│   └── quick-report.js        — 快速报告（模糊匹配→简式报告）
├── data/
│   ├── drc_provinces.json     — DRC 26省 GeoJSON (~1MB)
│   ├── drc_provinces_geojson.js — GeoJSON JS变量（file://兼容）
│   ├── conflict_db.json       — 爬虫写入的本地冲突数据库
│   ├── external_incidents.js  — 合成数据 JS变量（200条）
│   └── update_log.json        — 每日更新日志
├── scripts/
│   ├── crawler.py             — GDELT/ACLED 数据爬虫
│   └── generate_incidents.py  — 合成数据生成器
├── africa_security_map.html   — ★ 主交付物
└── README.md
```

**设计红线**: 数据层与展示层严格分离。所有数据通过 `<script>` 标签以 JS 变量加载，确保 `file://` 协议下无 CORS 问题。

## 快速开始

### 查看地图
```bash
# 浏览器直接打开（推荐 Chrome/Edge）
open africa_security_map.html
```

### 生成数据
```bash
# 生成200条合成冲突事件
python scripts/generate_incidents.py --count 200

# 指定日期范围
python scripts/generate_incidents.py --start 2020-01-01 --end 2026-06-01
```

### 爬取实时数据
```bash
# 拉取最近7天的 GDELT 数据
python scripts/crawler.py --days 7

# 定时执行（每日 08:00）
python scripts/crawler.py --schedule

# ACLED API 爬取（需要注册账号: https://acleddata.com/）
python scripts/crawler.py --source acled --key YOUR_ACLED_KEY --email YOUR_EMAIL
```

## 数据来源

| 来源 | 说明 | 状态 |
|------|------|------|
| **ACLED** | 武装冲突地点与事件数据（推荐） | 需要注册 |
| **GDELT** | 全球事件数据库（免费，不稳定） | 免费层限流 |
| **UCDP** | 乌普萨拉冲突数据 | 引用参考 |
| **ReliefWeb** | UN OCHA 人道信息 | 引用参考 |
| **合成数据** | 基于 ACLED 分布模式生成 | 本地可用 |

> **数据源选择说明**: ACLED 更适合本项目，因为其数据经过专家编码、质量更高，且 API 免费注册即可使用。GDELT 依赖 NLP 自动提取，误差较大，且免费层 API 不稳定（频繁返回 HTTP 429）。本项目当前使用合成数据 + GDELT 爬虫，计划迁移至 ACLED API。

## 自动更新

### GitHub Actions (推荐)
项目已配置 `.github/workflows/update_data.yml`，每日自动：
1. 运行爬虫拉取最新数据
2. 更新 `data/conflict_db.json` 和 `data/external_incidents.js`
3. 自动 commit 并 push 更新

### 手动更新
```bash
# 本地运行爬虫后重新生成 JS 变量
python scripts/generate_incidents.py --count 200
python -c "
import json
with open('data/conflict_db.json') as f: incidents = json.load(f)
js = 'var EXTERNAL_INCIDENTS = ' + json.dumps(incidents, ensure_ascii=False, indent=2) + ';'
with open('data/external_incidents.js', 'w', encoding='utf-8') as f: f.write(js)
"
git add data/ && git commit -m "data: daily update" && git push
```

## 冲突数据格式

```json
{
  "id": "SYN-XXXXXXXX",
  "date": "2025-03-15",
  "country": "DR Congo",
  "province": "North Kivu",
  "city": "Goma",
  "lat": -1.679, "lng": 29.233,
  "type": "battles",
  "severity": "high",
  "fatalities": 25,
  "actor1": "M23", "actor2": "FARDC",
  "title": "M23与FARDC在Goma附近激烈交火",
  "desc": "...",
  "source": "ACLED",
  "verified": false
}
```

## 行为体档案

涵盖 8 个主要冲突行为体：M23 · ADF · CODECO · FARDC · FDLR · MONUSCO · Wazalendo · IS-CAP

## 许可证

本项目仅用于学术研究和态势感知，不构成安全分析或政治立场。数据归因于 ACLED/GDELT/UCDP/ReliefWeb 等第三方来源。

---

〓 项目位置: `Desktop/election VIbecoding/project-2/africa_security_map.html`

〓 爬虫入口: `python scripts/crawler.py --days 7`
