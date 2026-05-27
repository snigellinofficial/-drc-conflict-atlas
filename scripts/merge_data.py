"""
Merge ACLED data with built-in curated events and produce:
  1. js/data.js           — inline curated set (~100 events)
  2. data/incidents.js     — sampled ACLED for <script> loading (~2300 events)
  3. data/incidents.json   — same as above for fetch fallback
"""
import json, os, re
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_js_array(path, var_name="INCIDENTS"):
    """Extract JS array using the same parser as validate_data.py"""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    bracket_start = content.find("[")
    if bracket_start == -1:
        print(f"WARNING: No array found in {path}")
        return []
    depth = 0; i = bracket_start
    array_str = None
    while i < len(content):
        if content[i] == "[": depth += 1
        elif content[i] == "]":
            depth -= 1
            if depth == 0:
                array_str = content[bracket_start:i+1]; break
        i += 1
    if array_str is None:
        print(f"WARNING: Could not extract array from {path}")
        return []
    array_str = re.sub(r'(?<!:)//[^\n]*', '', array_str)
    array_str = re.sub(r'/\*.*?\*/', '', array_str, flags=re.DOTALL)
    array_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', array_str)
    array_str = re.sub(r'([{,])\s*([a-zA-Z_]\w*)\s*:', r'\1"\2":', array_str)
    array_str = re.sub(r',\s*]', ']', array_str)
    array_str = re.sub(r',\s*}', '}', array_str)
    array_str = array_str.replace('undefined', 'null')
    return json.loads(array_str)

# Load built-in from cleaned data (original hand-curated events with rich Chinese descriptions)
builtin_file = os.path.join(BASE, "data", "cleaned_incidents.js")
builtin_all = load_js_array(builtin_file, "CLEANED_INCIDENTS")
builtin = [i for i in builtin_all if i["id"].startswith("DRC-")]
print(f"Loaded {len(builtin)} built-in events from cleaned_incidents.js")

with open(os.path.join(BASE, "data", "acled_drc_data.json"), "r", encoding="utf-8") as f:
    acled = json.load(f)

print(f"ACLED total: {len(acled)} events")

# Build dedup keys from built-in
builtin_keys = set()
for inc in builtin:
    key = (inc["date"], inc["province"], inc.get("city",""))
    builtin_keys.add(key)

# Filter ACLED: remove duplicates with built-in
acled_new = []
dup_count = 0
for inc in acled:
    key = (inc["date"], inc["province"], inc.get("city",""))
    if key not in builtin_keys:
        acled_new.append(inc)
    else:
        dup_count += 1

print(f"ACLED after removing built-in overlaps: {len(acled_new)} ({dup_count} dups)")

# Intelligent sampling
critical_high = [i for i in acled_new if i["severity"] in ("critical", "high")]
medium = [i for i in acled_new if i["severity"] == "medium"]
low = [i for i in acled_new if i["severity"] == "low"]

# For medium: sample up to 3 per province-year
medium_by_prov_year = defaultdict(list)
for inc in medium:
    yr = inc["date"][:4]
    medium_by_prov_year[(inc["province"], yr)].append(inc)
medium_sampled = []
for key, events in medium_by_prov_year.items():
    events.sort(key=lambda x: -x["fatalities"])
    medium_sampled.extend(events[:3])

# For low: sample up to 2 per province-year
low_by_prov_year = defaultdict(list)
for inc in low:
    yr = inc["date"][:4]
    low_by_prov_year[(inc["province"], yr)].append(inc)
low_sampled = []
for key, events in low_by_prov_year.items():
    events.sort(key=lambda x: -x["fatalities"])
    low_sampled.extend(events[:2])

sampled = critical_high + medium_sampled + low_sampled
sampled.sort(key=lambda x: x["date"], reverse=True)

print(f"\nSampling:")
print(f"  Critical+High (all): {len(critical_high)}")
print(f"  Medium (sampled): {len(medium_sampled)} from {len(medium)}")
print(f"  Low (sampled): {len(low_sampled)} from {len(low)}")
print(f"  Total sampled: {len(sampled)}")

# Merge for JSON (for fetch fallback on web servers)
merged = list(builtin) + sampled
merged.sort(key=lambda x: x["date"], reverse=True)
out_json = os.path.join(BASE, "data", "incidents.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False)
print(f"Saved {len(merged)} events -> data/incidents.json")

# Build curated inline set: built-in + top 5 per year from ACLED
curated = list(builtin)
by_year_top = defaultdict(list)
curated_ids = {c["id"] for c in curated}
for inc in sampled:
    if inc["id"] not in curated_ids:
        by_year_top[inc["date"][:4]].append(inc)
for yr, events in by_year_top.items():
    events.sort(key=lambda x: -x["fatalities"])
    curated.extend(events[:5])
curated.sort(key=lambda x: x["date"], reverse=True)

# Write inline JS
js_path = os.path.join(BASE, "js", "data.js")
with open(js_path, "w", encoding="utf-8") as f:
    f.write("/* =====================================================================\n")
    f.write("   DATA LAYER — 刚果(金)冲突事件（2010-2026）\n")
    f.write("   数据来源: ACLED (https://acleddata.com/) — 专家编码冲突数据\n")
    f.write("   覆盖: 2010-07 (MONUSCO成立) 至 2026-05 · 25/26省\n")
    f.write(f"   内联: {len(curated)}条核心事件 · 脚本加载: incidents.js\n")
    f.write("   ===================================================================== */\n")
    f.write("var INCIDENTS = ")
    json.dump(curated, f, ensure_ascii=False, indent=2)
    f.write(";\n")
print(f"Saved {len(curated)} curated events -> js/data.js")

# Generate data/incidents.js for <script> tag loading (file:// compatible)
# Contains only the extra ACLED events not already inline
extra = [i for i in sampled if i["id"] not in curated_ids]
extra.sort(key=lambda x: x["date"], reverse=True)

ext_js_path = os.path.join(BASE, "data", "incidents.js")
with open(ext_js_path, "w", encoding="utf-8") as f:
    f.write("/* Sampled ACLED DRC conflict data for runtime loading */\n")
    f.write("var EXTERNAL_INCIDENTS = ")
    json.dump(extra, f, ensure_ascii=False, indent=2)
    f.write(";\n")
print(f"Saved {len(extra)} external events -> data/incidents.js")

# Summary
print(f"\n=== Data Pipeline Summary ===")
print(f"Full ACLED:     data/acled_drc_data.json ({len(acled)} events)")
print(f"Inline (core):  js/data.js ({len(curated)} events)")
print(f"Script load:    data/incidents.js ({len(extra)} events)")
print(f"Fetch fallback: data/incidents.json ({len(merged)} events)")
