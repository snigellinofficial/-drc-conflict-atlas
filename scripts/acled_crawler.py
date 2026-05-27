"""
ACLED DRC Conflict Data Crawler (OAuth 2.0)
============================================
从 ACLED API 拉取刚果(金)冲突事件数据，使用 OAuth 2.0 Bearer Token 认证。
ACLED 提供专家编码的高质量冲突数据，覆盖 1997 年至今。

用法:
  python acled_crawler.py                          # 默认: 2010-07-01 → 今天
  python acled_crawler.py --from 2010-07-01 --to 2026-05-27
  python acled_crawler.py --token-file data/acled_token.json
"""

import json, os, sys, time, hashlib
from datetime import datetime, timedelta
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "acled_drc_data.json")
LOG_FILE = os.path.join(DATA_DIR, "update_log.json")

ACLED_API = "https://acleddata.com/api/acled/read"

# ACLED event type -> our schema type
ACLED_TYPE_MAP = {
    "Battles": "battles",
    "Explosions/Remote violence": "remote-violence",
    "Violence against civilians": "violence-civilians",
    "Strategic developments": "strategic-dev",
    "Protests": "strategic-dev",
    "Riots": "strategic-dev",
}

# ACLED admin1 -> our DRC 26 province names
PROVINCE_MAP = {
    "Kinshasa": "Kinshasa",
    "Kongo Central": "Kongo-Central",
    "Kwango": "Kwango",
    "Kwilu": "Kwilu",
    "Mai-Ndombe": "Mai-Ndombe",
    "Equateur": "Équateur",
    "Sud-Ubangi": "Sud-Ubangi",
    "Nord-Ubangi": "Nord-Ubangi",
    "Mongala": "Mongala",
    "Tshuapa": "Tshuapa",
    "Tshopo": "Tshopo",
    "Bas-Uele": "Lower Uele",
    "Haut-Uele": "Upper Uele",
    "Ituri": "Ituri",
    "Nord-Kivu": "North Kivu",
    "Sud-Kivu": "South Kivu",
    "Maniema": "Maniema",
    "Sankuru": "Sankuru",
    "Kasai": "Kasai",
    "Kasai Central": "Central Kasai",
    "Kasai Oriental": "Kasai-Oriental",
    "Lomami": "Lomami",
    "Haut-Lomami": "Haut-Lomami",
    "Tanganyika": "Tanganyika",
    "Haut-Katanga": "Haut-Katanga",
    "Lualaba": "Lualaba",
}

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")

def load_token(token_file):
    """Load access token from JSON file"""
    with open(token_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("access_token", "")

def parse_acled_event(event):
    """Convert ACLED event to our unified schema"""
    event_date = event.get("event_date", "")[:10]
    ctype = ACLED_TYPE_MAP.get(event.get("event_type", ""), "battles")
    fatalities = event.get("fatalities", 0) or 0

    # Severity: aligned with validate_data.py (critical>=40, high>=10)
    if fatalities >= 40:
        severity = "critical"
    elif fatalities >= 10:
        severity = "high"
    elif fatalities >= 3:
        severity = "medium"
    else:
        severity = "low"

    actor1 = event.get("actor1", "").strip()
    actor2 = event.get("actor2", "").strip()
    if not actor1:
        actor1 = "Unknown"
    if not actor2:
        actor2 = "Unknown"

    # Map province name
    admin1 = event.get("admin1", "")
    province = PROVINCE_MAP.get(admin1, admin1)

    # Rich description from ACLED notes
    notes = event.get("notes", "")
    location = event.get("location", admin1)
    if notes:
        desc = f"{notes} (来源: ACLED, 事件ID: {event.get('event_id_cnty', '')})"
    else:
        desc = f"{actor1}与{actor2}在{location}发生冲突。数据来源ACLED。"

    # Build title
    if notes:
        title = notes[:150]
    else:
        title = f"{actor1} vs {actor2} - {location}"

    # Unique ID
    raw = f"ACLED|{event_date}|{province}|{title}"
    eid = "ACLED-" + hashlib.md5(raw.encode()).hexdigest()[:10].upper()

    lat = float(event.get("latitude", 0) or 0)
    lng = float(event.get("longitude", 0) or 0)

    return {
        "id": eid,
        "date": event_date,
        "country": "DR Congo",
        "province": province,
        "city": location,
        "lat": lat,
        "lng": lng,
        "type": ctype,
        "severity": severity,
        "fatalities": int(fatalities),
        "actor1": actor1,
        "actor2": actor2,
        "title": title,
        "desc": desc,
        "source": "ACLED",
        "sourceUrl": f"https://acleddata.com/data/",
        "verified": True
    }

def fetch_acled_page(token, start_date, end_date, page=1, limit=500):
    """Fetch one page of ACLED data"""
    params = {
        "country": "Democratic Republic of Congo",
        "event_date": f"{start_date}|{end_date}",
        "event_date_where": "BETWEEN",
        "limit": str(limit),
        "page": str(page),
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }

    try:
        resp = requests.get(ACLED_API, params=params, headers=headers, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == 200:
                return data.get("data", [])
            else:
                log(f"API error: {data.get('errors', data)}")
                return None
        else:
            log(f"HTTP {resp.status_code}: {resp.text[:300]}")
            return None
    except Exception as e:
        log(f"Fetch error: {e}")
        return None

def crawl_all(token, start_date="2010-07-01", end_date=None, page_size=500):
    """Full crawl from ACLED API with pagination"""
    if end_date is None:
        end_date = datetime.now().strftime("%Y-%m-%d")

    log(f"=== ACLED Full Crawl: {start_date} -> {end_date} ===")

    all_events = []
    page = 1

    while True:
        log(f"  Fetching page {page}...")
        events = fetch_acled_page(token, start_date, end_date, page, page_size)

        if events is None:
            log(f"  ERROR on page {page}, stopping.")
            break

        if len(events) == 0:
            log(f"  No more data (page {page} returned 0).")
            break

        all_events.extend(events)
        log(f"  Page {page}: {len(events)} events, total so far: {len(all_events)}")

        if len(events) < page_size:
            break

        page += 1
        time.sleep(0.5)  # polite rate limiting

    log(f"=== Raw events fetched: {len(all_events)} ===")

    # Convert to our schema
    converted = []
    seen_ids = set()
    skipped_no_province = 0
    skipped_no_coords = 0

    for event in all_events:
        inc = parse_acled_event(event)
        # Skip if province not in our map
        if inc["province"] not in PROVINCE_MAP.values():
            skipped_no_province += 1
            continue
        # Dedup
        if inc["id"] in seen_ids:
            continue
        seen_ids.add(inc["id"])
        converted.append(inc)

    log(f"After filtering: {len(converted)} events")
    log(f"  Skipped (no province match): {skipped_no_province}")
    log(f"  Duplicates removed: {len(all_events) - len(converted) - skipped_no_province}")

    # Sort by date desc
    converted.sort(key=lambda x: x["date"], reverse=True)

    # Save to JSON
    out_path = os.path.join(DATA_DIR, "acled_drc_data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)
    log(f"Saved {len(converted)} events to {out_path}")

    # Stats
    by_year = {}
    by_type = {}
    by_prov = {}
    for inc in converted:
        yr = inc["date"][:4]
        by_year[yr] = by_year.get(yr, 0) + 1
        by_type[inc["type"]] = by_type.get(inc["type"], 0) + 1
        by_prov[inc["province"]] = by_prov.get(inc["province"], 0) + 1

    log(f"\nYearly distribution:")
    for yr in sorted(by_year):
        log(f"  {yr}: {by_year[yr]}")
    log(f"\nType distribution:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        log(f"  {t}: {c}")
    log(f"\nProvince coverage: {len(by_prov)}/26 provinces")

    return len(converted)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ACLED DRC Conflict Data Crawler")
    parser.add_argument("--from", dest="from_date", type=str, default="2010-07-01")
    parser.add_argument("--to", dest="to_date", type=str, default=None)
    parser.add_argument("--token-file", type=str, default="data/acled_token.json")
    parser.add_argument("--page-size", type=int, default=500)
    args = parser.parse_args()

    token_path = os.path.join(BASE_DIR, args.token_file)
    if not os.path.exists(token_path):
        log(f"ERROR: Token file not found: {token_path}")
        log("Run get_acled_token.py first to obtain an OAuth token.")
        sys.exit(1)

    token = load_token(token_path)
    if not token:
        log("ERROR: Empty token in file")
        sys.exit(1)

    log(f"Token loaded ({len(token)} chars)")

    added = crawl_all(token, args.from_date, args.to_date, args.page_size)
    print(f"\nDone: {added} events saved.")
