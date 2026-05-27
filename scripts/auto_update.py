r"""
DRC Conflict Data Auto-Updater
===============================
Auto update: refresh token -> crawl ACLED -> merge -> write files

Usage:
  python auto_update.py                  # Single update (last 30 days)
  python auto_update.py --schedule       # Run daily at 08:00
  python auto_update.py --interval 12    # Every 12 hours

Token:
  - Access token valid 24h
  - Refresh token valid 14 days
  - Script auto-refreshes using refresh_token
  - When refresh expires, re-run get_acled_token.py

Windows Task Scheduler:
  Task Scheduler -> Create Task -> Daily 08:00
  Program: python
  Args: scripts/auto_update.py
"""

import json, os, sys, time
from datetime import datetime, timedelta
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
TOKEN_FILE = os.path.join(DATA_DIR, "acled_token.json")
LOG_FILE = os.path.join(DATA_DIR, "auto_update_log.json")

ACLED_API = "https://acleddata.com/api/acled/read"
OAUTH_URL = "https://acleddata.com/oauth/token"

# Province mapping (same as acled_crawler.py)
PROVINCE_MAP = {
    "Kinshasa": "Kinshasa", "Kongo Central": "Kongo-Central", "Kwango": "Kwango",
    "Kwilu": "Kwilu", "Mai-Ndombe": "Mai-Ndombe", "Equateur": "Équateur",
    "Sud-Ubangi": "Sud-Ubangi", "Nord-Ubangi": "Nord-Ubangi", "Mongala": "Mongala",
    "Tshuapa": "Tshuapa", "Tshopo": "Tshopo", "Bas-Uele": "Lower Uele",
    "Haut-Uele": "Upper Uele", "Ituri": "Ituri", "Nord-Kivu": "North Kivu",
    "Sud-Kivu": "South Kivu", "Maniema": "Maniema", "Sankuru": "Sankuru",
    "Kasai": "Kasai", "Kasai Central": "Central Kasai",
    "Kasai Oriental": "Kasai-Oriental", "Lomami": "Lomami",
    "Haut-Lomami": "Haut-Lomami", "Tanganyika": "Tanganyika",
    "Haut-Katanga": "Haut-Katanga", "Lualaba": "Lualaba",
}

ACLED_TYPE_MAP = {
    "Battles": "battles", "Explosions/Remote violence": "remote-violence",
    "Violence against civilians": "violence-civilians",
    "Strategic developments": "strategic-dev",
    "Protests": "strategic-dev", "Riots": "strategic-dev",
}

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}")
    # Also save to log file
    log_data = load_json(LOG_FILE, [])
    log_data.append({"time": ts, "message": msg})
    if len(log_data) > 500:
        log_data = log_data[-200:]
    save_json(LOG_FILE, log_data)

def load_json(path, default=None):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return default if default is not None else {}
    return default if default is not None else {}

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def refresh_token():
    """Use refresh_token to get a new access token. Returns True if successful."""
    token_data = load_json(TOKEN_FILE, {})
    refresh = token_data.get("refresh_token", "")
    if not refresh:
        log("No refresh token found — need to run get_acled_token.py first")
        return False

    log("Refreshing access token using refresh_token...")
    try:
        resp = requests.post(OAUTH_URL, data={
            "refresh_token": refresh,
            "grant_type": "refresh_token",
            "client_id": "acled",
        }, headers={
            "User-Agent": "DRCConflictMonitor/3.0",
        }, timeout=30)

        if resp.status_code == 200:
            new_data = resp.json()
            if "access_token" in new_data:
                # Update token file
                token_data["access_token"] = new_data["access_token"]
                if "refresh_token" in new_data:
                    token_data["refresh_token"] = new_data["refresh_token"]
                token_data["expires_in"] = new_data.get("expires_in", 86400)
                token_data["_last_refreshed"] = datetime.now().isoformat()
                save_json(TOKEN_FILE, token_data)
                log("Token refreshed successfully!")
                return True

        log(f"Token refresh failed: HTTP {resp.status_code} — {resp.text[:200]}")
        return False
    except Exception as e:
        log(f"Token refresh error: {e}")
        return False

def fetch_recent_events(access_token, days=30):
    """Fetch recent DRC events from ACLED API"""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    log(f"Fetching ACLED events: {start_date} -> {end_date}")

    all_events = []
    page = 1
    while True:
        resp = requests.get(ACLED_API, params={
            "country": "Democratic Republic of Congo",
            "event_date": f"{start_date}|{end_date}",
            "event_date_where": "BETWEEN",
            "limit": "500",
            "page": str(page),
        }, headers={
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "Mozilla/5.0 DRCConflictMonitor/3.0",
            "Accept": "application/json",
        }, timeout=60)

        if resp.status_code != 200:
            log(f"API error: HTTP {resp.status_code}")
            break

        data = resp.json()
        if data.get("status") != 200:
            log(f"API error: {data.get('errors', data)}")
            break

        events = data.get("data", [])
        if not events:
            break

        all_events.extend(events)
        log(f"  Page {page}: {len(events)} events (total: {len(all_events)})")

        if len(events) < 500:
            break
        page += 1
        time.sleep(0.5)

    return all_events

def convert_event(event):
    """Convert ACLED event to our schema"""
    import hashlib
    event_date = event.get("event_date", "")[:10]
    ctype = ACLED_TYPE_MAP.get(event.get("event_type", ""), "battles")
    fatalities = event.get("fatalities", 0) or 0

    if fatalities >= 40:
        severity = "critical"
    elif fatalities >= 10:
        severity = "high"
    elif fatalities >= 3:
        severity = "medium"
    else:
        severity = "low"

    actor1 = event.get("actor1", "").strip() or "Unknown"
    actor2 = event.get("actor2", "").strip() or "Unknown"
    admin1 = event.get("admin1", "")
    province = PROVINCE_MAP.get(admin1, admin1)
    location = event.get("location", admin1)
    notes = event.get("notes", "")

    if notes:
        desc = f"{notes} (来源: ACLED, 事件ID: {event.get('event_id_cnty', '')})"
    else:
        desc = f"{actor1}与{actor2}在{location}发生冲突。数据来源ACLED。"

    title = notes[:150] if notes else f"{actor1} vs {actor2} - {location}"

    raw = f"ACLED|{event_date}|{province}|{title}"
    eid = "ACLED-" + hashlib.md5(raw.encode()).hexdigest()[:10].upper()

    return {
        "id": eid, "date": event_date, "country": "DR Congo",
        "province": province, "city": location,
        "lat": float(event.get("latitude", 0) or 0),
        "lng": float(event.get("longitude", 0) or 0),
        "type": ctype, "severity": severity, "fatalities": int(fatalities),
        "actor1": actor1, "actor2": actor2, "title": title, "desc": desc,
        "source": "ACLED", "sourceUrl": "https://acleddata.com/data/",
        "verified": True
    }

def update_data():
    """Main update routine"""
    log("=" * 50)
    log("Starting auto-update...")

    # Step 1: Refresh token
    if not refresh_token():
        log("Cannot refresh token — update aborted")
        return False

    token_data = load_json(TOKEN_FILE, {})
    access_token = token_data.get("access_token", "")

    # Step 2: Fetch recent events
    events = fetch_recent_events(access_token, days=30)
    log(f"Fetched {len(events)} recent ACLED events")

    # Step 3: Convert and merge with existing data
    new_count = 0
    existing_ids = set()

    # Load existing full dataset
    acled_file = os.path.join(DATA_DIR, "acled_drc_data.json")
    existing = load_json(acled_file, [])
    for inc in existing:
        existing_ids.add(inc["id"])

    converted = []
    for event in events:
        inc = convert_event(event)
        if inc["province"] not in PROVINCE_MAP.values():
            continue
        if inc["id"] not in existing_ids:
            converted.append(inc)
            existing_ids.add(inc["id"])
            new_count += 1

    log(f"New unique events: {new_count}")

    if new_count > 0:
        # Update full dataset
        existing.extend(converted)
        existing.sort(key=lambda x: x["date"], reverse=True)
        save_json(acled_file, existing)
        log(f"Updated acled_drc_data.json: {len(existing)} total events")

        # Regenerate incidents.js (sampled, for script loading)
        regenerate_js_files(existing)

    log(f"Update complete — {new_count} new events added")
    log("=" * 50)
    return True

def regenerate_js_files(all_data):
    """Regenerate incidents.js with recent data"""
    import re
    from collections import defaultdict

    # Load built-in events from data.js
    data_js = os.path.join(BASE_DIR, "js", "data.js")
    builtin = []
    if os.path.exists(data_js):
        with open(data_js, "r", encoding="utf-8") as f:
            content = f.read()
        idx = content.find("var INCIDENTS = ")
        if idx != -1:
            json_str = content[idx + len("var INCIDENTS = "):].strip().rstrip(";")
            try:
                builtin = json.loads(json_str)
                builtin = [d for d in builtin if d["id"].startswith("DRC-")]
            except:
                pass

    builtin_ids = {d["id"] for d in builtin}
    builtin_keys = {(d["date"], d["province"], d.get("city","")) for d in builtin}

    # Filter out duplicates with built-in
    filtered = [d for d in all_data if (d["date"], d["province"], d.get("city","")) not in builtin_keys]

    # Smart sampling
    critical_high = [d for d in filtered if d["severity"] in ("critical", "high")]
    medium = [d for d in filtered if d["severity"] == "medium"]
    low = [d for d in filtered if d["severity"] == "low"]

    medium_by_py = defaultdict(list)
    for d in medium:
        medium_by_py[(d["province"], d["date"][:4])].append(d)
    medium_sampled = []
    for key, evts in medium_by_py.items():
        evts.sort(key=lambda x: -x["fatalities"])
        medium_sampled.extend(evts[:3])

    low_by_py = defaultdict(list)
    for d in low:
        low_by_py[(d["province"], d["date"][:4])].append(d)
    low_sampled = []
    for key, evts in low_by_py.items():
        evts.sort(key=lambda x: -x["fatalities"])
        low_sampled.extend(evts[:2])

    sampled = critical_high + medium_sampled + low_sampled
    sampled.sort(key=lambda x: x["date"], reverse=True)

    ext_js_path = os.path.join(DATA_DIR, "incidents.js")
    with open(ext_js_path, "w", encoding="utf-8") as f:
        f.write("/* Auto-updated ACLED DRC conflict data */\n")
        f.write(f"/* Last update: {datetime.now().isoformat()} */\n")
        f.write("var EXTERNAL_INCIDENTS = ")
        json.dump(sampled, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    log(f"Regenerated incidents.js: {len(sampled)} sampled events")

    # Also update incidents.json for fetch fallback
    merged = builtin + sampled
    merged.sort(key=lambda x: x["date"], reverse=True)
    json_path = os.path.join(DATA_DIR, "incidents.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False)
    log(f"Regenerated incidents.json: {len(merged)} events")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="DRC Data Auto-Updater")
    parser.add_argument("--schedule", action="store_true", help="Auto-run daily at 08:00")
    parser.add_argument("--interval", type=int, default=24, help="Hours between updates (schedule mode)")
    parser.add_argument("--days", type=int, default=30, help="Days of data to fetch")
    args = parser.parse_args()

    if args.schedule:
        log(f"Scheduler started (interval: {args.interval}h)")
        while True:
            now = datetime.now()
            next_run = now.replace(hour=8, minute=7, second=0, microsecond=0)
            if now >= next_run:
                next_run += timedelta(days=1)
            wait = (next_run - now).total_seconds()
            log(f"Next update: {next_run.strftime('%Y-%m-%d %H:%M:%S')} (in {wait/3600:.1f}h)")
            time.sleep(wait)
            try:
                update_data()
            except Exception as e:
                log(f"Update failed: {e}")
    else:
        update_data()
