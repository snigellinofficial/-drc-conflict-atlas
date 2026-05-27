#!/usr/bin/env python3
"""
刚果(金)冲突数据校验与清洗工具 / DRC Conflict Data Validator

校验规则 / Validation Rules:
  R1: 时间分布均衡性 — 单月事件数不得超过总量的15%，否则标记为"时间偏倚"
  R2: 行为体合理性 — actor1/actor2 不能是"平民"/"民众"/"警方"/"矿工工会"/"矿业公司"作为 battle 的主动方
  R3: 类型一致性 — type 必须在 {battles, remote-violence, violence-civilians, strategic-dev} 中
  R4: 严重等级门槛 — critical 等级至少需 fatalities >= 40；high 至少需 fatalities >= 10
  R5: 描述长度 — desc 字段至少 30 字符，否则信息不足
  R6: 来源可信度 — verified=true 的事件至少需要 sourceUrl 或可靠 source
  R7: 坐标合理性 — lat/lng 必须在 DRC 范围内（大致：lat -13.5~5.5, lng 12~32）
  R8: 省份匹配 — province 字段必须在 DRC_PROVINCES 26省中

输出:
  - 校验报告 (控制台)
  - 清洗后数据 (cleaned_incidents.js)
  - 问题事件列表 (flagged_incidents.json)
"""

import json
import re
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta

# ======= DRC 26省 =======
DRC_PROVINCES = {
    "Kinshasa", "Kongo-Central", "Kwango", "Kwilu", "Mai-Ndombe",
    "Équateur", "Sud-Ubangi", "Nord-Ubangi", "Mongala", "Tshuapa",
    "Tshopo", "Lower Uele", "Upper Uele", "Ituri", "North Kivu",
    "South Kivu", "Maniema", "Sankuru", "Kasai", "Central Kasai",
    "Kasai-Oriental", "Lomami", "Haut-Lomami", "Tanganyika",
    "Haut-Katanga", "Lualaba"
}

VALID_TYPES = {"battles", "remote-violence", "violence-civilians", "strategic-dev"}
NON_COMBAT_ACTORS = {"平民", "民众", "警方", "矿工工会", "矿业公司", "N/A"}
CRITICAL_MIN_FATAL = 40
HIGH_MIN_FATAL = 10
MIN_DESC_LEN = 30

def load_incidents_from_js(filepath):
    """从 JS 文件中提取 INCIDENTS 数组"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find var/const declaration
    for prefix in ['var INCIDENTS = ', 'const INCIDENTS = ', 'var EXTERNAL_INCIDENTS = ', 'var CLEANED_INCIDENTS = ']:
        idx = content.find(prefix)
        if idx != -1:
            # Skip to after the prefix, find the JSON array
            json_start = idx + len(prefix)
            # Find matching ]; at end
            json_end = content.find(';\n', json_start)
            if json_end == -1:
                json_end = content.rfind(']', json_start) + 1
            json_str = content[json_start:json_end].strip()
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                # Try cleaning comments
                json_str = re.sub(r'(?<!:)//[^\n]*', '', json_str)
                json_str = re.sub(r'/\*.*?\*/', '', json_str, flags=re.DOTALL)
                try:
                    return json.loads(json_str)
                except:
                    pass
            print(f"  [WARN] JSON解析失败: {e}")
            return []
    print(f"  [WARN] 在 {filepath} 中找不到 INCIDENTS")
    return []


def validate_all(incidents):
    """对所有事件运行校验规则，返回 (通过, 问题列表, 统计)"""
    flagged = []
    passed = []
    stats = {
        "total": len(incidents),
        "by_month": Counter(),
        "by_year": Counter(),
        "by_type": Counter(),
        "by_severity": Counter(),
        "by_province": Counter(),
        "by_source": Counter(),
        "verified": 0,
        "unverified": 0,
    }

    for inc in incidents:
        issues = []
        fid = inc.get('id', 'UNKNOWN')
        date = inc.get('date', '')
        prov = inc.get('province', '')
        typ = inc.get('type', '')
        sev = inc.get('severity', '')
        fat = inc.get('fatalities', 0) or 0
        a1 = inc.get('actor1', '')
        a2 = inc.get('actor2', '')
        desc = inc.get('desc', '')
        lat = inc.get('lat', 0) or 0
        lng = inc.get('lng', 0) or 0
        verified = inc.get('verified', False)

        # Stats
        if date:
            ym = date[:7]
            stats["by_month"][ym] += 1
            stats["by_year"][date[:4]] += 1
        stats["by_type"][typ] += 1
        stats["by_severity"][sev] += 1
        stats["by_province"][prov] += 1
        stats["by_source"][inc.get('source', '?')] += 1
        if verified:
            stats["verified"] += 1
        else:
            stats["unverified"] += 1

        # R3: 类型一致性
        if typ not in VALID_TYPES:
            issues.append(f"R3: 类型'{typ}'不在有效类型集合中")

        # R4: 严重等级门槛
        if sev == "critical" and fat < CRITICAL_MIN_FATAL:
            issues.append(f"R4: critical等级但fatalities={fat} < {CRITICAL_MIN_FATAL}")
        if sev == "high" and fat < HIGH_MIN_FATAL:
            issues.append(f"R4: high等级但fatalities={fat} < {HIGH_MIN_FATAL}")

        # R2: 行为体合理性
        if typ == "battles" and (a1 in NON_COMBAT_ACTORS or a2 in NON_COMBAT_ACTORS):
            # 如果双方都是非战斗行为体，标记
            if a1 in NON_COMBAT_ACTORS and a2 in NON_COMBAT_ACTORS:
                issues.append(f"R2: battles类型但双方均为非战斗行为体({a1} vs {a2})")
            elif a1 in NON_COMBAT_ACTORS and a2 not in NON_COMBAT_ACTORS:
                # 交换行为体顺序
                issues.append(f"R2: battles类型但actor1为非战斗行为体({a1})，建议交换")

        # R5: 描述长度
        if len(desc) < MIN_DESC_LEN:
            issues.append(f"R5: 描述长度={len(desc)} < {MIN_DESC_LEN}")

        # R7: 坐标合理性
        if not (-13.5 <= lat <= 5.5 and 12 <= lng <= 32):
            issues.append(f"R7: 坐标({lat},{lng})超出DRC范围")

        # R8: 省份匹配
        if prov and prov not in DRC_PROVINCES:
            issues.append(f"R8: 省份'{prov}'不在26省列表中")

        # R6: 来源可信度
        if verified and not inc.get('sourceUrl'):
            issues.append(f"R6: verified=true但缺少sourceUrl")

        if issues:
            flagged.append({"incident": inc, "issues": issues})
        else:
            passed.append(inc)

    return passed, flagged, stats


def check_time_distribution(stats, threshold=0.15):
    """R1: 检查时间分布均衡性"""
    total = stats["total"]
    month_issues = []
    for month, count in stats["by_month"].items():
        ratio = count / total if total > 0 else 0
        if ratio > threshold:
            month_issues.append(f"R1: {month} 月有 {count} 条事件(占{ratio:.1%})，超过{threshold:.0%}阈值")
    return month_issues


def auto_fix(incident, issue_str):
    """尝试自动修复常见的低质量问题"""
    inc = dict(incident)  # shallow copy
    fixed = False

    if "R2: battles类型但actor1为非战斗行为体" in issue_str:
        # 交换 actor1 和 actor2
        inc['actor1'], inc['actor2'] = inc['actor2'], inc['actor1']
        fixed = True

    return inc, fixed


def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    print("=" * 60)
    print("刚果(金)冲突数据校验工具 / DRC Conflict Data Validator")
    print("=" * 60)

    # 加载数据
    all_incidents = []
    data_files = [
        os.path.join(base, "js", "data.js"),
        os.path.join(base, "data", "incidents.js"),
        os.path.join(base, "data", "incidents.json"),
    ]

    for fp in data_files:
        if os.path.exists(fp):
            incidents = load_incidents_from_js(fp)
            print(f"\n加载 {os.path.basename(fp)}: {len(incidents)} 条事件")
            all_incidents.extend(incidents)
        else:
            print(f"\n[SKIP] 文件不存在: {fp}")

    # 去重
    seen_ids = set()
    unique = []
    dups = 0
    for inc in all_incidents:
        if inc['id'] not in seen_ids:
            seen_ids.add(inc['id'])
            unique.append(inc)
        else:
            dups += 1
    print(f"\n去重: 移除 {dups} 条重复，剩余 {len(unique)} 条")

    # 运行校验
    passed, flagged, stats = validate_all(unique)

    # 时间分布检查
    time_issues = check_time_distribution(stats)

    print("\n" + "-" * 40)
    print("数据统计 / Statistics")
    print("-" * 40)
    print(f"总事件数: {stats['total']}")
    print(f"已验证: {stats['verified']}  |  待验证: {stats['unverified']}")
    print(f"\n按年份分布:")
    for yr in sorted(stats["by_year"]):
        bar = "#" * max(1, stats["by_year"][yr] // 2)
        print(f"  {yr}: {stats['by_year'][yr]:4d} {bar}")
    print(f"\n按月份分布 (最近12个月):")
    recent_months = sorted(stats["by_month"])[-12:]
    for m in recent_months:
        bar = "#" * max(1, stats["by_month"][m])
        ratio = stats["by_month"][m] / stats["total"] * 100
        flag = " [WARN]" if ratio > 15 else ""
        print(f"  {m}: {stats['by_month'][m]:4d} ({ratio:4.1f}%) {bar}{flag}")
    print(f"\n按类型分布:")
    for t, c in stats["by_type"].most_common():
        print(f"  {t}: {c}")
    print(f"\n按严重等级分布:")
    for s, c in stats["by_severity"].most_common():
        print(f"  {s}: {c}")

    print("\n" + "-" * 40)
    print(f"校验结果 / Validation Results")
    print("-" * 40)
    print(f"通过: {len(passed)} 条")
    print(f"问题: {len(flagged)} 条")

    if time_issues:
        print(f"\n时间分布问题 (R1):")
        for ti in time_issues:
            print(f"  [WARN] {ti}")

    if flagged:
        print(f"\n问题事件详情:")
        for i, item in enumerate(flagged, 1):
            inc = item['incident']
            print(f"\n  [{i}] {inc['id']} | {inc['date']} | {inc.get('province','?')}")
            print(f"      标题: {inc.get('title','')}")
            print(f"      类型: {inc.get('type','')} | 等级: {inc.get('severity','')} | 死亡: {inc.get('fatalities',0)}")
            print(f"      行为体: {inc.get('actor1','')} vs {inc.get('actor2','')}")
            for issue in item['issues']:
                print(f"      [FAIL] {issue}")

    # 自动修复
    print("\n" + "-" * 40)
    print("自动修复 / Auto-Fix")
    print("-" * 40)
    fixed_count = 0
    cleaned = list(passed)  # start with all passing
    for item in flagged:
        inc = item['incident']
        all_fixable = all("R2: battles类型但actor1为非战斗行为体" in iss for iss in item['issues'])
        if all_fixable and len(item['issues']) == 1:
            new_inc, was_fixed = auto_fix(inc, item['issues'][0])
            if was_fixed:
                cleaned.append(new_inc)
                fixed_count += 1
                print(f"  修复: {inc['id']} actor1<->actor2 已交换")
        else:
            # 不可自动修复，但保留（仅标记验证状态）
            inc_copy = dict(inc)
            inc_copy['verified'] = False
            inc_copy['_flagged'] = True
            inc_copy['_issues'] = item['issues']
            cleaned.append(inc_copy)
            issues_str = "; ".join(item['issues'])
            print(f"  保留(已标记): {inc['id']} — {issues_str}")

    print(f"\n自动修复: {fixed_count} 条")
    print(f"清洗后总计: {len(cleaned)} 条")

    # 输出清洗后数据
    # 移除内部标记字段
    output = []
    for inc in cleaned:
        out = {k: v for k, v in inc.items() if not k.startswith('_')}
        output.append(out)

    # 写入清洗后数据
    out_path = os.path.join(base, "data", "cleaned_incidents.js")
    js_content = "var CLEANED_INCIDENTS = " + json.dumps(output, ensure_ascii=False, indent=2) + ";\n"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"\n清洗后数据已写入: {out_path}")

    # 写入问题报告
    report_path = os.path.join(base, "data", "validation_report.json")
    report = {
        "generated": datetime.now().isoformat(),
        "total_original": len(all_incidents),
        "after_dedup": len(unique),
        "passed": len(passed),
        "flagged": len(flagged),
        "auto_fixed": fixed_count,
        "cleaned_total": len(output),
        "time_distribution_issues": time_issues,
        "stats": {
            "by_year": dict(stats["by_year"]),
            "by_month": dict(stats["by_month"]),
            "by_type": dict(stats["by_type"]),
            "by_severity": dict(stats["by_severity"]),
        },
        "flagged_incidents": [
            {"id": item['incident']['id'], "title": item['incident'].get('title',''), "issues": item['issues']}
            for item in flagged
        ]
    }
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"校验报告已写入: {report_path}")

    print("\n" + "=" * 60)
    print("校验完成 / Validation Complete")
    print("=" * 60)


if __name__ == "__main__":
    main()
