"""
DRC冲突数据爬虫 / DRC Conflict Data Crawler
============================================
数据源: GDELT 2.0 Doc API
目标: 刚果(金) · 2020年以来
存储: data/conflict_db.json
日志: data/update_log.json

用法:
  python crawler.py                        # 最近7天
  python crawler.py --days 30              # 最近30天
  python crawler.py --from 2020-01-01      # 历史全量(按月分批)
  python crawler.py --from 2020-01-01 --to 2020-06-30
  python crawler.py --schedule             # 每日08:00自动执行
"""

import json, os, sys, time, re, hashlib
from datetime import datetime, timedelta, date
from urllib.request import urlopen, Request
from urllib.parse import quote
from urllib.error import HTTPError, URLError

# === CONFIGURATION ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "conflict_db.json")
LOG_FILE = os.path.join(DATA_DIR, "update_log.json")

# DRC-focused queries — tighter keywords for relevance
DRC_KEYWORDS = [
    "DR Congo", "DRC", "Congo Kinshasa", "Democratic Republic of Congo",
    "M23", "ADF", "CODECO", "FARDC", "FDLR", "MONUSCO", "Wazalendo",
    "North Kivu", "South Kivu", "Ituri", "Goma", "Bunia", "Beni",
    "Rutshuru", "Masisi", "Bukavu", "Uvira", "Tshopo", "Tanganyika",
    "Haut-Katanga", "Kinshasa", "Lubumbashi"
]

CONFLICT_TERMS = [
    "attack", "battle", "clash", "killed", "fighting", "shelling",
    "bombing", "airstrike", "militia", "rebel", "insurgent", "armed group",
    "massacre", "civilian", "displacement", "refugee", "ceasefire",
    "peace talk", "offensive", "troops", "forces"
]

# GDELT v2 Doc API
GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc"

# === UTILITIES ===

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def load_json(path, default=None):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            log(f"Failed to load {path}: {e}", "WARN")
    return default if default is not None else {}

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_db():
    return load_json(DB_FILE, [])

def save_db(db):
    save_json(DB_FILE, db)

def load_log():
    default = {"last_update": "", "total_fetched": 0, "entries": []}
    return load_json(LOG_FILE, default)

def save_log(log_data):
    save_json(LOG_FILE, log_data)

def make_id(incident):
    raw = f"{incident.get('date','')}|{incident.get('country','')}|{incident.get('city','')}|{incident.get('title','')}"
    return "GDELT-" + hashlib.md5(raw.encode()).hexdigest()[:10].upper()

# === PROVINCE DETECTION ===

DRC_PROVINCE_KEYWORDS = {
    "North Kivu": ["north kivu", "nord-kivu", "goma", "beni", "butembo", "rutshuru", "masisi", "sake"],
    "South Kivu": ["south kivu", "sud-kivu", "bukavu", "uvira", "fizi", "baraka"],
    "Ituri": ["ituri", "bunia", "djugu", "irumu", "mahagi", "arw"],
    "Tanganyika": ["tanganyika", "kalemie", "nyunzu"],
    "Haut-Katanga": ["haut-katanga", "lubumbashi", "likasi", "kolwezi"],
    "Kinshasa": ["kinshasa"],
    "Upper Uele": ["upper uele", "haut-uele", "doruma"],
    "Haut-Lomami": ["haut-lomami", "kamina"],
    "Tshopo": ["tshopo", "kisangani"],
    "Maniema": ["maniema", "kindu"],
    "Lualaba": ["lualaba", "kolwezi"],
    "Kasai": ["kasai", "tshikapa"],
    "Central Kasai": ["central kasai", "kasai-central", "kananga"],
    "Kasai-Oriental": ["kasai-oriental", "mbuji-mayi"],
    "Équateur": ["equateur", "mbandaka"],
    "Sud-Ubangi": ["sud-ubangi", "gemena"],
    "Nord-Ubangi": ["nord-ubangi", "gbadolite"],
    "Mongala": ["mongala", "lisala"],
    "Kongo-Central": ["kongo-central", "matadi", "boma"],
    "Kwango": ["kwango", "kikwit"],
    "Kwilu": ["kwilu", "bandundu"],
    "Mai-Ndombe": ["mai-ndombe", "inongo"],
    "Tshuapa": ["tshuapa"],
    "Sankuru": ["sankuru", "lodja"],
    "Lomami": ["lomami", "mwene-ditu"],
    "Lower Uele": ["lower uele", "bas-uele", "buta"],
}

def detect_province(title):
    """Heuristically detect DRC province from article title"""
    tl = title.lower()
    for prov, keywords in DRC_PROVINCE_KEYWORDS.items():
        for kw in keywords:
            if kw in tl:
                return prov
    return ""

def detect_city(title):
    """Heuristically detect city from title"""
    cities = {
        "Goma": ["goma"], "Bunia": ["bunia"], "Beni": ["beni"],
        "Butembo": ["butembo"], "Bukavu": ["bukavu"], "Kinshasa": ["kinshasa"],
        "Lubumbashi": ["lubumbashi"], "Kalemie": ["kalemie"],
        "Rutshuru": ["rutshuru"], "Masisi": ["masisi"], "Sake": ["sake"],
        "Uvira": ["uvira"], "Fizi": ["fizi"], "Djugu": ["djugu"],
        "Mahagi": ["mahagi"], "Irumu": ["irumu"], "Doruma": ["doruma"],
        "Kamina": ["kamina"], "Kisangani": ["kisangani"],
    }
    tl = title.lower()
    for city, keywords in cities.items():
        for kw in keywords:
            if kw in tl:
                return city
    return "Unknown"

# === GDELT FETCHER ===

def fetch_gdelt_daterange(start_date, end_date, max_records=200):
    """
    Fetch articles from GDELT 2.0 Doc API using absolute date range.
    start_date/end_date: 'YYYY-MM-DD' strings
    """
    # Build DRC-focused query
    drc_terms = " OR ".join([f'"{kw}"' for kw in DRC_KEYWORDS[:15]])  # Limit query length
    conflict_terms = " OR ".join(CONFLICT_TERMS[:10])
    query = f"({drc_terms}) AND ({conflict_terms})"

    start_dt = start_date.replace("-", "") + "000000"
    end_dt = end_date.replace("-", "") + "235959"

    params = (
        f"query={quote(query)}"
        f"&mode=artlist"
        f"&format=json"
        f"&maxrecords={max_records}"
        f"&startdatetime={start_dt}"
        f"&enddatetime={end_dt}"
        f"&sort=datedesc"
    )
    url = f"{GDELT_API}?{params}"

    log(f"Fetching: {start_date} → {end_date} (max={max_records})", "DEBUG")
    try:
        req = Request(url, headers={"User-Agent": "DRCConflictMonitor/2.0"})
        with urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data
    except HTTPError as e:
        log(f"HTTP {e.code} for {start_date}→{end_date}", "WARN")
        return None
    except Exception as e:
        log(f"Fetch error: {e}", "WARN")
        return None

def parse_gdelt_article(article):
    """Parse GDELT article into incident schema"""
    title = article.get("title", "Unknown Incident")
    url = article.get("url", "")
    seendate = article.get("seendate", "")[:10]
    if not seendate or seendate.startswith("0000"):
        seendate = article.get("date", "")[:10]

    province = detect_province(title)
    city = detect_city(title) if province else "Unknown"

    tl = title.lower()

    # Conflict type
    if any(w in tl for w in ["battle","clash","fighting","offensive","counter-offensive","frontline","troops","shelling"]):
        ctype = "battles"
    elif any(w in tl for w in ["bomb","blast","explosion","mortar","ied","drone","airstrike","missile","shell"]):
        ctype = "remote-violence"
    elif any(w in tl for w in ["massacre","killed civilian","raped","loot","burned village","displaced","refugee","abduct"]):
        ctype = "violence-civilians"
    elif any(w in tl for w in ["deploy","mobilize","ceasefire","peace talk","negotiation","agreement","withdraw"]):
        ctype = "strategic-dev"
    else:
        ctype = "battles"

    # Fatalities
    death_match = re.search(r'(\d+)\s*(?:killed|dead|death|died|kill|fatalities|casualties)', tl)
    fatalities = int(death_match.group(1)) if death_match else 0

    # Severity
    if fatalities >= 50 or any(w in tl for w in ["massacre","genocide","mass killing","dozens killed"]):
        severity = "critical"
    elif fatalities >= 20:
        severity = "high"
    elif fatalities >= 5:
        severity = "medium"
    else:
        severity = "low"

    # Actors — check for known DRC actors
    known_actors = ["M23","ADF","CODECO","FARDC","FDLR","MONUSCO","Wazalendo","Mai-Mai","ISCAP","UPDF","RDF"]
    found_actors = []
    for a in known_actors:
        if a.lower() in tl:
            found_actors.append(a)
    if len(found_actors) >= 2:
        actor1, actor2 = found_actors[0], found_actors[1]
    elif len(found_actors) == 1:
        actor1 = found_actors[0]
        actor2 = "FARDC" if found_actors[0] != "FARDC" else "武装团体"
    else:
        # Generic extraction
        actors = re.findall(r'([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(?:militia|rebel|army|forces|group|movement)', title)
        actor1 = actors[0] if len(actors) > 0 else "武装团体"
        actor2 = actors[1] if len(actors) > 1 else "FARDC"

    return {
        "id": make_id({"date": seendate, "country": "DR Congo", "title": title}),
        "date": seendate,
        "country": "DR Congo",
        "province": province,
        "city": city,
        "lat": 0, "lng": 0,
        "type": ctype,
        "severity": severity,
        "fatalities": fatalities,
        "actor1": actor1,
        "actor2": actor2,
        "title": title[:150],
        "desc": f"GDELT报道: {title}。来源URL: {url}",
        "source": "GDELT",
        "sourceUrl": url,
        "verified": False
    }

# === HISTORICAL BATCH CRAWL ===

def month_ranges(start_date, end_date):
    """Generate (start, end) tuples for each month in range"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    current = start
    ranges = []
    while current < end:
        month_end = (current.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        if month_end > end:
            month_end = end
        if current > month_end:
            current = month_end + timedelta(days=1)
            continue
        ranges.append((current.strftime("%Y-%m-%d"), month_end.strftime("%Y-%m-%d")))
        current = month_end + timedelta(days=1)
    return ranges

def crawl_historical(start_date="2020-01-01", end_date=None, max_per_batch=200):
    """
    Historical crawl: batch by month from start_date to end_date.
    Saves progress after each batch.
    """
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")

    ranges = month_ranges(start_date, end_date)
    log(f"=== 历史数据爬取: {start_date} → {end_date} ({len(ranges)} 批) ===")

    db = load_db()
    existing_ids = {item["id"] for item in db}
    total_new = 0
    total_errors = 0

    for idx, (batch_start, batch_end) in enumerate(ranges):
        log(f"--- 批次 {idx+1}/{len(ranges)}: {batch_start} → {batch_end} ---")

        data = fetch_gdelt_daterange(batch_start, batch_end, max_records=max_per_batch)

        if data is None:
            total_errors += 1
            time.sleep(3)
            continue

        articles = data.get("articles", [])
        batch_new = 0
        skipped = 0

        for article in articles:
            incident = parse_gdelt_article(article)
            if incident["date"] and incident["id"] not in existing_ids:
                db.append(incident)
                existing_ids.add(incident["id"])
                batch_new += 1
                total_new += 1
            else:
                skipped += 1

        log(f"  批次结果: 新增{batch_new}条, 跳过{skipped}条, DB共{len(db)}条")

        # Save after each batch
        if batch_new > 0:
            save_db(db)

        # Rate limiting — longer delay to avoid 429s
        delay = 4 if batch_new > 0 else 2
        time.sleep(delay)

    # Final save
    save_db(db)

    # Update log
    log_data = load_log()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")

    summary = f"历史爬取 {start_date}→{end_date} · {len(ranges)}批 · 新增{total_new}条 · DB共{len(db)}条"
    if total_errors > 0:
        summary += f" · {total_errors}个批次错误"

    log_data["last_update"] = now_str
    log_data["total_fetched"] = len(db)

    log_data["entries"].insert(0, {
        "date": today_str,
        "time": now_str,
        "status": "ok" if total_errors < len(ranges) * 0.3 else "partial",
        "new_items": total_new,
        "total_items": len(db),
        "summary": summary
    })
    log_data["entries"] = log_data["entries"][:90]
    save_log(log_data)

    log(f"=== 历史爬取完成: 新增{total_new}条, DB共{len(db)}条 ===")
    return total_new, total_errors

def crawl_recent(days=7, max_per_batch=250):
    """Recent data crawl using timespan mode"""
    log(f"=== 近期数据爬取: {days}天 ===")

    db = load_db()
    existing_ids = {item["id"] for item in db}

    drc_terms = " OR ".join([f'"{kw}"' for kw in DRC_KEYWORDS[:12]])
    conflict_terms = " OR ".join(CONFLICT_TERMS[:8])
    query = f"({drc_terms}) AND ({conflict_terms})"

    timespan = f"{days}d"
    params = (
        f"query={quote(query)}"
        f"&mode=artlist"
        f"&format=json"
        f"&maxrecords={max_per_batch}"
        f"&timespan={timespan}"
        f"&sort=datedesc"
    )
    url = f"{GDELT_API}?{params}"

    log(f"Fetching GDELT: timespan={timespan}")
    try:
        req = Request(url, headers={"User-Agent": "DRCConflictMonitor/2.0"})
        with urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log(f"Fetch error: {e}", "ERROR")
        return 0, 1

    new_items = 0
    if data and "articles" in data:
        for article in data["articles"]:
            incident = parse_gdelt_article(article)
            if incident["date"] and incident["id"] not in existing_ids:
                db.append(incident)
                existing_ids.add(incident["id"])
                new_items += 1

    save_db(db)

    log_data = load_log()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today_str = datetime.now().strftime("%Y-%m-%d")

    log_data["last_update"] = now_str
    log_data["total_fetched"] = len(db)
    log_data["entries"].insert(0, {
        "date": today_str, "time": now_str,
        "status": "ok", "new_items": new_items,
        "total_items": len(db),
        "summary": f"近期爬取{days}天 · 新增{new_items}条 · DB共{len(db)}条"
    })
    log_data["entries"] = log_data["entries"][:90]
    save_log(log_data)

    log(f"=== 近期爬取完成: 新增{new_items}条 ===")
    return new_items, 0

# === SCHEDULER ===

def schedule_daily():
    """Run daily at 08:00 local time"""
    log("调度模式启动: 每日 08:00")
    while True:
        now = datetime.now()
        next_run = now.replace(hour=8, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        wait_seconds = (next_run - now).total_seconds()
        log(f"下次执行: {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({wait_seconds/3600:.1f}h)")
        time.sleep(wait_seconds)
        try:
            crawl_recent(days=1)
        except Exception as e:
            log(f"调度失败: {e}", "ERROR")

# === CLI ===

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="DRC冲突数据爬虫")
    parser.add_argument("--from", dest="from_date", type=str, default=None, help="起始日期 YYYY-MM-DD")
    parser.add_argument("--to", dest="to_date", type=str, default=None, help="结束日期 YYYY-MM-DD")
    parser.add_argument("--days", type=int, default=7, help="拉取最近N天(默认7,仅近期模式)")
    parser.add_argument("--schedule", action="store_true", help="每日08:00自动执行")
    parser.add_argument("--max", type=int, default=200, help="每批最大记录数(默认200)")

    args = parser.parse_args()

    if args.schedule:
        schedule_daily()
    elif args.from_date:
        # Historical batch mode
        added, errors = crawl_historical(
            start_date=args.from_date,
            end_date=args.to_date,
            max_per_batch=args.max
        )
        print(f"\n完成: 新增{added}条, 错误批次{errors}")
    else:
        # Recent mode
        added, errors = crawl_recent(days=args.days, max_per_batch=args.max)
        print(f"\n完成: 新增{added}条, 错误{errors}")
