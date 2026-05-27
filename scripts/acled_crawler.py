"""
ACLED DRC Conflict Data Crawler
================================
从 ACLED API 拉取刚果(金)冲突事件数据。
ACLED 提供专家编码的高质量冲突数据，比 GDELT 更可靠。

注册: https://acleddata.com/ (免费, 非商业用途)
API文档: https://acleddata.com/api-documentation

用法:
  python acled_crawler.py --email your@email.com --key YOUR_API_KEY
  python acled_crawler.py --email your@email.com --key YOUR_KEY --from 2020-01-01
  python acled_crawler.py --email your@email.com --key YOUR_KEY --schedule
"""

import json, os, sys, time, hashlib
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

# ACLED event type → our schema type mapping
ACLED_TYPE_MAP = {
    "Battles": "battles",
    "Explosions/Remote violence": "remote-violence",
    "Violence against civilians": "violence-civilians",
    "Strategic developments": "strategic-dev",
    "Protests": "strategic-dev",
    "Riots": "strategic-dev",
}

def load_json(path, default=None):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default if default is not None else []

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def make_id(incident):
    raw = f"ACLED|{incident.get('date','')}|{incident.get('province','')}|{incident.get('title','')}"
    return "ACLED-" + hashlib.md5(raw.encode()).hexdigest()[:10].upper()

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def parse_acled_event(event):
    """Convert ACLED event to our schema"""
    event_date = event.get("event_date", "")[:10]
    ctype = ACLED_TYPE_MAP.get(event.get("event_type", ""), "battles")
    fatalities = event.get("fatalities", 0) or 0

    if fatalities >= 50:
        severity = "critical"
    elif fatalities >= 20:
        severity = "high"
    elif fatalities >= 5:
        severity = "medium"
    else:
        severity = "low"

    actor1 = event.get("actor1", "Unknown")
    actor2 = event.get("actor2", "Unknown")

    return {
        "id": make_id({"date": event_date, "province": event.get("admin1", ""), "title": event.get("notes", "")}),
        "date": event_date,
        "country": "DR Congo",
        "province": event.get("admin1", ""),
        "city": event.get("location", ""),
        "lat": float(event.get("latitude", 0)),
        "lng": float(event.get("longitude", 0)),
        "type": ctype,
        "severity": severity,
        "fatalities": fatalities,
        "actor1": actor1,
        "actor2": actor2,
        "title": event.get("notes", f"{actor1} vs {actor2}")[:120],
        "desc": f"ACLED事件: {event.get('notes', '')}. 数据来源ACLED, 事件编号{event.get('event_id_cnty', '')}",
        "source": "ACLED",
        "sourceUrl": f"https://acleddata.com/data/",
        "verified": True
    }

def fetch_acled(email, key, start_date, end_date, limit=500):
    """Fetch ACLED data for DRC in date range"""
    params = (
        f"key={key}"
        f"&email={quote(email)}"
        f"&country={quote('Democratic Republic of Congo')}"
        f"&event_date={start_date}|{end_date}"
        f"&event_date_where=BETWEEN"
        f"&limit={limit}"
    )
    url = f"{ACLED_API}?{params}"

    log(f"Fetching ACLED: {start_date} → {end_date}")
    try:
        req = Request(url, headers={"User-Agent": "DRCConflictMonitor/2.0"})
        with urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("status") == 200:
            return data.get("data", [])
        else:
            log(f"ACLED API error: {data.get('errors', data)}")
            return None
    except HTTPError as e:
        log(f"HTTP {e.code}: {e.reason}")
        return None
    except Exception as e:
        log(f"Fetch error: {e}")
        return None

def crawl_acled(email, key, start_date="2020-01-01", end_date=None):
    """Full crawl from ACLED API"""
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")

    log(f"=== ACLED爬取: {start_date} → {end_date} ===")

    events = fetch_acled(email, key, start_date, end_date, limit=0)
    if events is None:
        log("ACLED爬取失败")
        return 0

    db = load_json(DB_FILE, [])
    existing_ids = {item["id"] for item in db}
    new_items = 0

    for event in events:
        incident = parse_acled_event(event)
        if incident["id"] not in existing_ids:
            db.append(incident)
            existing_ids.add(incident["id"])
            new_items += 1

    # Sort by date desc
    db.sort(key=lambda x: x["date"], reverse=True)
    save_json(DB_FILE, db)

    # Regenerate JS file for file:// compatibility
    js = "var EXTERNAL_INCIDENTS = " + json.dumps(db, ensure_ascii=False, indent=2) + ";\n"
    with open(EXT_JS_FILE, "w", encoding="utf-8") as f:
        f.write(js)

    # Update log
    log_data = load_json(LOG_FILE, {"last_update": "", "total_fetched": 0, "entries": []})
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_data["last_update"] = now_str
    log_data["total_fetched"] = len(db)
    log_data["entries"].insert(0, {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": now_str,
        "status": "ok",
        "new_items": new_items,
        "total_items": len(db),
        "summary": f"ACLED爬取 {start_date}→{end_date} · 新增{new_items}条 · DB共{len(db)}条"
    })
    log_data["entries"] = log_data["entries"][:90]
    save_json(LOG_FILE, log_data)

    log(f"=== ACLED完成: 新增{new_items}条, DB共{len(db)}条 ===")
    return new_items

def schedule_daily(email, key):
    """Run daily at 08:00"""
    log("ACLED调度模式: 每日08:00")
    while True:
        now = datetime.now()
        next_run = now.replace(hour=8, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        wait = (next_run - now).total_seconds()
        log(f"下次执行: {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({wait/3600:.1f}h)")
        time.sleep(wait)
        try:
            # Fetch last 7 days
            start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            end = datetime.now().strftime("%Y-%m-%d")
            crawl_acled(email, key, start, end)
        except Exception as e:
            log(f"调度失败: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ACLED DRC冲突数据爬虫")
    parser.add_argument("--email", type=str, required=True, help="ACLED注册邮箱")
    parser.add_argument("--key", type=str, required=True, help="ACLED API密钥")
    parser.add_argument("--from", dest="from_date", type=str, default="2020-01-01")
    parser.add_argument("--to", dest="to_date", type=str, default=None)
    parser.add_argument("--schedule", action="store_true", help="每日08:00自动执行")
    args = parser.parse_args()

    if args.schedule:
        schedule_daily(args.email, args.key)
    else:
        added = crawl_acled(args.email, args.key, args.from_date, args.to_date)
        print(f"\n完成: 新增{added}条")
