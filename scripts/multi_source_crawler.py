"""
Multi-Source DRC Conflict Data Pipeline
=======================================
以 ACLED 为基准，整合 GDELT + UCDP 三个数据源。
交叉验证事件，合并去重，保证数据量大且准确。

数据源:
  ACLED  (https://acleddata.com/)      — 基准 · 专家编码 · 需要注册
  GDELT  (https://www.gdeltproject.org/) — 补充 · NLP提取 · 免费但不稳定
  UCDP   (https://ucdp.uu.se/)          — 补充 · 学术标准 · 免费下载

交叉验证规则:
  - 同一日期 + 同一省份 + 相似描述 → 标记为 multi-source verified
  - ACLED 数据标记 verified=True (基准)
  - GDELT/UCDP 数据标记 verified=False
  - 三条源都匹配 → verified_by=all_three

用法:
  python multi_source_crawler.py --acled-key KEY --acled-email EMAIL
  python multi_source_crawler.py --all  # 全部三个源
"""

import json, os, sys, time, re, hashlib, csv, io
from datetime import datetime, timedelta
from urllib.request import urlopen, Request
from urllib.parse import quote
from urllib.error import HTTPError

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "conflict_db.json")
LOG_FILE = os.path.join(DATA_DIR, "update_log.json")
EXT_JS_FILE = os.path.join(DATA_DIR, "external_incidents.js")

ACLED_API = "https://api.acleddata.com/acled/read"
GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"
UCDP_API = "https://ucdpapi.pcr.uu.se/api/gedevents/24.1"

# DRC ISO code for UCDP
DRC_COUNTRY_ID = 490  # UCDP country ID for DR Congo

# ===================== UTILITIES =====================

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def load_json(path, default=None):
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else (default or [])

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

def make_id(source, incident):
    raw = f"{source}|{incident.get('date','')}|{incident.get('province','')}|{incident.get('city','')}"
    return f"{source}-" + hashlib.md5(raw.encode()).hexdigest()[:10].upper()

def normalize_date(d):
    """Normalize various date formats to YYYY-MM-DD"""
    d = str(d).strip()
    if len(d) >= 10:
        return d[:10]
    return d

def text_similarity(a, b):
    """Simple Jaccard-style word overlap similarity"""
    wa = set(re.findall(r'\w+', (a or "").lower()))
    wb = set(re.findall(r'\w+', (b or "").lower()))
    if not wa or not wb: return 0
    return len(wa & wb) / len(wa | wb)

# ===================== EVENT TYPE MAPPING =====================

ACLED_TYPE_MAP = {
    "Battles": "battles",
    "Explosions/Remote violence": "remote-violence",
    "Violence against civilians": "violence-civilians",
    "Strategic developments": "strategic-dev",
    "Protests": "strategic-dev",
    "Riots": "strategic-dev",
}

UCDP_TYPE_MAP = {
    "state-based conflict": "battles",
    "non-state conflict": "battles",
    "one-sided violence": "violence-civilians",
}

# ===================== ACLED (BASELINE) =====================

class ACLEDSource:
    def __init__(self, email, key):
        self.email = email
        self.key = key

    def fetch(self, start, end):
        params = (f"key={self.key}&email={quote(self.email)}"
                  f"&country={quote('Democratic Republic of Congo')}"
                  f"&event_date={start}|{end}&event_date_where=BETWEEN&limit=0")
        url = f"{ACLED_API}?{params}"
        log(f"ACLED: {start} → {end}")
        try:
            req = Request(url, headers={"User-Agent": "DRCMonitor/2.0"})
            with urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data.get("data", []) if data.get("status") == 200 else []
        except Exception as e:
            log(f"ACLED error: {e}")
            return []

    def parse(self, event):
        dt = normalize_date(event.get("event_date", ""))
        ctype = ACLED_TYPE_MAP.get(event.get("event_type", ""), "battles")
        fatalities = event.get("fatalities", 0) or 0
        if fatalities >= 50: severity = "critical"
        elif fatalities >= 20: severity = "high"
        elif fatalities >= 5: severity = "medium"
        else: severity = "low"

        return {
            "id": make_id("ACLED", {"date": dt, "province": event.get("admin1", ""), "city": event.get("location", "")}),
            "date": dt, "country": "DR Congo",
            "province": event.get("admin1", ""), "city": event.get("location", ""),
            "lat": float(event.get("latitude", 0)), "lng": float(event.get("longitude", 0)),
            "type": ctype, "severity": severity, "fatalities": fatalities,
            "actor1": event.get("actor1", "Unknown"), "actor2": event.get("actor2", "Unknown"),
            "title": (event.get("notes", "") or f"{event.get('actor1','')} vs {event.get('actor2','')}")[:120],
            "desc": f"ACLED事件: {event.get('notes','')}",
            "source": "ACLED", "sourceUrl": "https://acleddata.com/",
            "verified": True, "verified_by": ["acled"]
        }

# ===================== GDELT =====================

class GDELTSource:
    def fetch(self, start, end):
        drc_terms = " OR ".join(['"DR Congo"', '"North Kivu"', '"M23"', '"ADF"', '"FARDC"', '"CODECO"'])
        conf_terms = " OR ".join(['"attack"', '"killed"', '"battle"', '"clash"', '"rebel"'])
        query = f"({drc_terms}) AND ({conf_terms})"
        start_dt = start.replace("-", "") + "000000"
        end_dt = end.replace("-", "") + "235959"
        params = (f"query={quote(query)}&mode=artlist&format=json&maxrecords=50"
                  f"&startdatetime={start_dt}&enddatetime={end_dt}&sort=datedesc")
        url = f"{GDELT_API}?{params}"
        log(f"GDELT: {start} → {end}")
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data.get("articles", [])
        except Exception as e:
            log(f"GDELT error: {e}")
            return []

    def parse(self, article):
        title = article.get("title", "Unknown")[:150]
        dt = normalize_date(article.get("seendate", "") or article.get("date", ""))
        tl = title.lower()

        # Type detection
        if any(w in tl for w in ["battle","clash","fighting","offensive"]): ctype = "battles"
        elif any(w in tl for w in ["bomb","blast","explosion","ied","mortar"]): ctype = "remote-violence"
        elif any(w in tl for w in ["massacre","killed","raped","abduct","displaced"]): ctype = "violence-civilians"
        elif any(w in tl for w in ["deploy","mobilize","ceasefire","peace talk"]): ctype = "strategic-dev"
        else: ctype = "battles"

        # Fatalities
        death_match = re.search(r'(\d+)\s*(?:killed|dead|death|died|kill|fatalities)', tl)
        fatalities = int(death_match.group(1)) if death_match else 0
        if fatalities >= 50: severity = "critical"
        elif fatalities >= 20: severity = "high"
        elif fatalities >= 5: severity = "medium"
        else: severity = "low"

        # Province detection
        province = ""
        prov_keywords = {"North Kivu":["north kivu","goma","beni"],"South Kivu":["south kivu","bukavu","uvira"],
                         "Ituri":["ituri","bunia"],"Tanganyika":["tanganyika","kalemie"],
                         "Haut-Katanga":["haut-katanga","lubumbashi"],"Kinshasa":["kinshasa"]}
        for prov, kws in prov_keywords.items():
            if any(k in tl for k in kws):
                province = prov; break

        return {
            "id": make_id("GDELT", {"date": dt, "province": province, "city": ""}),
            "date": dt, "country": "DR Congo",
            "province": province, "city": "",
            "lat": 0, "lng": 0,
            "type": ctype, "severity": severity, "fatalities": fatalities,
            "actor1": "武装团体", "actor2": "未知",
            "title": title,
            "desc": f"GDELT报道: {title}. URL: {article.get('url','')}",
            "source": "GDELT", "sourceUrl": article.get("url", ""),
            "verified": False, "verified_by": []
        }

# ===================== UCDP =====================

class UCDPSource:
    def fetch(self, start, end):
        """UCDP GED API v24.1"""
        params = (f"country={DRC_COUNTRY_ID}"
                  f"&start_date={start}&end_date={end}")
        url = f"{UCDP_API}?{params}"
        log(f"UCDP: {start} → {end}")
        try:
            req = Request(url, headers={"User-Agent": "DRCMonitor/2.0", "Accept": "application/json"})
            with urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data.get("Result", []) if isinstance(data, dict) else data
        except Exception as e:
            log(f"UCDP error: {e}")
            # Fallback: try CSV download
            return self._fetch_csv_fallback(start, end)

    def _fetch_csv_fallback(self, start, end):
        """Fallback: UCDP CSV download from PRIO"""
        csv_url = "https://ucdpapi.pcr.uu.se/api/gedevents/24.1?pagesize=1000"
        try:
            req = Request(csv_url, headers={"User-Agent": "DRCMonitor/2.0"})
            with urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            results = data.get("Result", [])
            # Filter for DRC and date range
            drc_events = [e for e in results
                         if str(e.get("country_id", "")) == str(DRC_COUNTRY_ID)
                         and start <= str(e.get("date_start", ""))[:10] <= end]
            return drc_events
        except Exception as e:
            log(f"UCDP fallback error: {e}")
            return []

    def parse(self, event):
        dt = normalize_date(event.get("date_start", ""))
        ctype = UCDP_TYPE_MAP.get(event.get("type_of_violence", ""), "battles")
        deaths_a = int(event.get("deaths_a", 0) or 0)
        deaths_b = int(event.get("deaths_b", 0) or 0)
        deaths_civ = int(event.get("deaths_civilians", 0) or 0)
        fatalities = deaths_a + deaths_b + deaths_civ

        if fatalities >= 50: severity = "critical"
        elif fatalities >= 20: severity = "high"
        elif fatalities >= 5: severity = "medium"
        else: severity = "low"

        return {
            "id": make_id("UCDP", {"date": dt, "province": event.get("adm_1", ""), "city": event.get("location", "")}),
            "date": dt, "country": "DR Congo",
            "province": event.get("adm_1", ""), "city": event.get("location", ""),
            "lat": float(event.get("latitude", 0)), "lng": float(event.get("longitude", 0)),
            "type": ctype, "severity": severity, "fatalities": fatalities,
            "actor1": event.get("side_a", "Unknown"), "actor2": event.get("side_b", "N/A"),
            "title": f"{event.get('side_a','')} vs {event.get('side_b','')} in {event.get('adm_1','')}",
            "desc": f"UCDP GED事件. 来源说明: {event.get('source_article','')}",
            "source": "UCDP", "sourceUrl": "https://ucdp.uu.se/",
            "verified": False, "verified_by": []
        }

# ===================== CROSS-VALIDATION ENGINE =====================

class CrossValidator:
    def __init__(self):
        self.merged = []
        self.stats = {"acled": 0, "gdelt": 0, "ucdp": 0, "verified_multi": 0}

    def run(self, acled_data, gdelt_data, ucdp_data):
        """Merge three sources, cross-validate, deduplicate"""
        log("=== Cross-validating events ===")

        # Start with ACLED as baseline
        seen = {}  # key: (date, province_normalized)
        merged = []

        for inc in acled_data:
            key = (inc["date"], self._norm_province(inc.get("province", "")))
            inc["verified_by"] = ["acled"]
            merged.append(inc)
            if key not in seen: seen[key] = []
            seen[key].append(inc)
            self.stats["acled"] += 1

        # Cross-check GDELT against ACLED
        for inc in gdelt_data:
            key = (inc["date"], self._norm_province(inc.get("province", "")))
            matched = False
            if key in seen:
                for existing in seen[key]:
                    sim = text_similarity(inc.get("title", ""), existing.get("title", ""))
                    if sim > 0.25:
                        existing["verified_by"].append("gdelt")
                        existing["verified"] = True
                        matched = True
                        self.stats["verified_multi"] += 1
                        break
            if not matched:
                inc["verified_by"] = ["gdelt"]
                merged.append(inc)
                if key not in seen: seen[key] = []
                seen[key].append(inc)
            self.stats["gdelt"] += 1

        # Cross-check UCDP against ACLED
        for inc in ucdp_data:
            key = (inc["date"], self._norm_province(inc.get("province", "")))
            matched = False
            if key in seen:
                for existing in seen[key]:
                    sim = text_similarity(inc.get("title", ""), existing.get("title", ""))
                    if sim > 0.25:
                        if "ucdp" not in existing["verified_by"]:
                            existing["verified_by"].append("ucdp")
                        if len(existing["verified_by"]) >= 2:
                            existing["verified"] = True
                        matched = True
                        self.stats["verified_multi"] += 1
                        break
            if not matched:
                inc["verified_by"] = ["ucdp"]
                merged.append(inc)
                if key not in seen: seen[key] = []
                seen[key].append(inc)
            self.stats["ucdp"] += 1

        # Sort by date desc
        merged.sort(key=lambda x: x["date"], reverse=True)

        # Mark triple-verified
        for inc in merged:
            if len(inc.get("verified_by", [])) >= 3:
                inc["verified"] = True
                inc["desc"] = "[三重验证] " + inc.get("desc", "")

        log(f"Cross-validation complete: ACLED={self.stats['acled']}, "
            f"GDELT={self.stats['gdelt']}, UCDP={self.stats['ucdp']}, "
            f"Merged={len(merged)}, Multi-verified={self.stats['verified_multi']}")
        return merged

    @staticmethod
    def _norm_province(p):
        return (p or "").strip().lower()

# ===================== MAIN PIPELINE =====================

def run_pipeline(acled_email=None, acled_key=None, start="2020-01-01", end=None,
                 sources=["acled", "gdelt", "ucdp"]):
    if end is None:
        end = datetime.now().strftime("%Y-%m-%d")

    acled_data, gdelt_data, ucdp_data = [], [], []

    if "acled" in sources and acled_email and acled_key:
        source = ACLEDSource(acled_email, acled_key)
        raw = source.fetch(start, end)
        acled_data = [source.parse(e) for e in raw]
        log(f"ACLED: {len(acled_data)} events parsed")

    if "gdelt" in sources:
        source = GDELTSource()
        raw = source.fetch(start, end)
        gdelt_data = [source.parse(a) for a in raw if source.parse(a)["date"]]
        log(f"GDELT: {len(gdelt_data)} events parsed")

    if "ucdp" in sources:
        source = UCDPSource()
        raw = source.fetch(start, end)
        ucdp_data = [source.parse(e) for e in raw if source.parse(e)["date"]]
        log(f"UCDP: {len(ucdp_data)} events parsed")

    if not any([acled_data, gdelt_data, ucdp_data]):
        log("No data from any source. Generating synthetic data as fallback.")
        return generate_fallback(start, end)

    validator = CrossValidator()
    merged = validator.run(acled_data, gdelt_data, ucdp_data)

    # Save
    save_json(DB_FILE, merged)
    js = "var EXTERNAL_INCIDENTS = " + json.dumps(merged, ensure_ascii=False, indent=2) + ";\n"
    with open(EXT_JS_FILE, "w", encoding="utf-8") as f:
        f.write(js)

    # Update log
    log_data = load_json(LOG_FILE, {"last_update": "", "total_fetched": 0, "entries": []})
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_data["last_update"] = now_str
    log_data["total_fetched"] = len(merged)
    log_data["entries"].insert(0, {
        "date": datetime.now().strftime("%Y-%m-%d"), "time": now_str,
        "status": "ok", "new_items": len(merged),
        "total_items": len(merged),
        "summary": f"多源爬取 {start}→{end} · ACLED:{len(acled_data)} · GDELT:{len(gdelt_data)} · UCDP:{len(ucdp_data)} · 合并:{len(merged)} · 交叉验证:{validator.stats['verified_multi']}"
    })
    log_data["entries"] = log_data["entries"][:90]
    save_json(LOG_FILE, log_data)

    log(f"=== Pipeline complete: {len(merged)} events in DB ===")
    return len(merged)

def generate_fallback(start, end):
    """Generate synthetic data when no API source is available"""
    import subprocess
    script = os.path.join(BASE_DIR, "scripts", "generate_incidents.py")
    result = subprocess.run([sys.executable, script, "--start", start, "--end", end, "--count", "200"],
                          capture_output=True, text=True)
    log(result.stdout.strip())
    return 200

# ===================== CLI =====================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="多源DRC冲突数据管道")
    parser.add_argument("--acled-key", type=str, default="", help="ACLED API key")
    parser.add_argument("--acled-email", type=str, default="", help="ACLED注册邮箱")
    parser.add_argument("--from", dest="start", type=str, default="2020-01-01")
    parser.add_argument("--to", dest="end", type=str, default=None)
    parser.add_argument("--sources", type=str, default="acled,gdelt,ucdp",
                       help="逗号分隔的数据源 (acled,gdelt,ucdp)")
    parser.add_argument("--schedule", action="store_true", help="每日08:00执行")
    parser.add_argument("--all", action="store_true", help="使用全部三个源")
    args = parser.parse_args()

    sources = args.sources.split(",")

    if args.schedule:
        log("多源调度模式: 每日08:00")
        while True:
            now = datetime.now()
            next_run = now.replace(hour=8, minute=0, second=0, microsecond=0)
            if now >= next_run: next_run += timedelta(days=1)
            wait = (next_run - now).total_seconds()
            log(f"下次: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
            time.sleep(wait)
            try:
                start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
                end = datetime.now().strftime("%Y-%m-%d")
                run_pipeline(args.acled_email, args.acled_key, start, end, sources)
            except Exception as e:
                log(f"调度失败: {e}")
    else:
        run_pipeline(args.acled_email, args.acled_key, args.start, args.end, sources)
