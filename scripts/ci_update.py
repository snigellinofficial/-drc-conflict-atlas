"""
GitHub Actions auto-update entry point.
Designed to run in CI environment with credentials from GitHub Secrets.

Secrets needed (set in GitHub repo Settings > Secrets and variables > Actions):
  ACLED_EMAIL    - your ACLED login email
  ACLED_PASSWORD - your ACLED login password
"""

import json, os, sys, time, hashlib
from datetime import datetime, timedelta
from collections import defaultdict
import requests

DATA_DIR = "data"
ACLED_API = "https://acleddata.com/api/acled/read"
OAUTH_URL = "https://acleddata.com/oauth/token"

PROVINCE_MAP = {
    "Kinshasa": "Kinshasa", "Kongo Central": "Kongo-Central", "Kwango": "Kwango",
    "Kwilu": "Kwilu", "Mai-Ndombe": "Mai-Ndombe", "Equateur": "Equateur",
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
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def get_fresh_token():
    """Get a brand new OAuth token using email+password from secrets"""
    email = os.environ.get("ACLED_EMAIL", "")
    password = os.environ.get("ACLED_PASSWORD", "")
    if not email or not password:
        log("ERROR: ACLED_EMAIL or ACLED_PASSWORD not set in environment")
        sys.exit(1)

    log("Requesting new OAuth token...")
    resp = requests.post(OAUTH_URL, data={
        "username": email, "password": password,
        "grant_type": "password", "client_id": "acled",
    }, headers={"User-Agent": "DRCConflictMonitor/4.0-CI"}, timeout=30)

    if resp.status_code == 200:
        data = resp.json()
        if "access_token" in data:
            log(f"Token obtained (expires in {data.get('expires_in', '?')}s)")
            return data["access_token"]
    log(f"Token request failed: HTTP {resp.status_code} - {resp.text[:200]}")
    sys.exit(1)

def fetch_acled(access_token, start_date, end_date):
    """Fetch all DRC events in date range"""
    log(f"Fetching ACLED: {start_date} -> {end_date}")
    all_events = []
    page = 1
    while True:
        resp = requests.get(ACLED_API, params={
            "country": "Democratic Republic of Congo",
            "event_date": f"{start_date}|{end_date}",
            "event_date_where": "BETWEEN",
            "limit": "500", "page": str(page),
        }, headers={
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "Mozilla/5.0 DRCConflictMonitor/4.0-CI",
        }, timeout=60)

        if resp.status_code != 200:
            log(f"API error: HTTP {resp.status_code}")
            break
        data = resp.json()
        if data.get("status") != 200:
            log(f"API status error: {data.get('errors', data)}")
            break
        events = data.get("data", [])
        if not events:
            break
        all_events.extend(events)
        if len(events) < 500:
            break
        page += 1
        time.sleep(0.3)

    log(f"Fetched {len(all_events)} raw events")
    return all_events

def convert_event(event):
    event_date = event.get("event_date", "")[:10]
    ctype = ACLED_TYPE_MAP.get(event.get("event_type", ""), "battles")
    fatalities = event.get("fatalities", 0) or 0
    severity = "critical" if fatalities >= 40 else "high" if fatalities >= 10 else "medium" if fatalities >= 3 else "low"
    actor1 = event.get("actor1", "").strip() or "Unknown"
    actor2 = event.get("actor2", "").strip() or "Unknown"
    admin1 = event.get("admin1", "")
    province = PROVINCE_MAP.get(admin1, admin1)
    location = event.get("location", admin1)
    notes = event.get("notes", "")
    desc = f"{notes} (ACLED, ID: {event.get('event_id_cnty', '')})" if notes else f"{actor1} vs {actor2} - {location}"
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

def generate_files(all_data, builtin_ids):
    """Generate incidents.js and incidents.json"""
    # Filter out built-in events
    builtin_keys = set()
    for d_path in ["js/data.js"]:
        if os.path.exists(d_path):
            with open(d_path, "r", encoding="utf-8") as f:
                content = f.read()
            idx = content.find("var INCIDENTS = ")
            if idx != -1:
                try:
                    builtin = json.loads(content[idx + len("var INCIDENTS = "):].strip().rstrip(";"))
                    builtin = [d for d in builtin if d["id"].startswith("DRC-")]
                    for d in builtin:
                        builtin_keys.add((d["date"], d["province"], d.get("city","")))
                except:
                    pass

    filtered = [d for d in all_data if (d["date"], d["province"], d.get("city","")) not in builtin_keys]

    critical_high = [d for d in filtered if d["severity"] in ("critical", "high")]
    medium = [d for d in filtered if d["severity"] == "medium"]
    low = [d for d in filtered if d["severity"] == "low"]

    m_py = defaultdict(list)
    for d in medium: m_py[(d["province"], d["date"][:4])].append(d)
    medium_sampled = []
    for k, evts in m_py.items():
        evts.sort(key=lambda x: -x["fatalities"])
        medium_sampled.extend(evts[:3])

    l_py = defaultdict(list)
    for d in low: l_py[(d["province"], d["date"][:4])].append(d)
    low_sampled = []
    for k, evts in l_py.items():
        evts.sort(key=lambda x: -x["fatalities"])
        low_sampled.extend(evts[:2])

    sampled = critical_high + medium_sampled + low_sampled
    sampled.sort(key=lambda x: x["date"], reverse=True)

    os.makedirs(DATA_DIR, exist_ok=True)

    # incidents.js
    with open(os.path.join(DATA_DIR, "incidents.js"), "w", encoding="utf-8") as f:
        f.write(f"/* Auto-updated: {datetime.now().isoformat()} */\n")
        f.write("var EXTERNAL_INCIDENTS = ")
        json.dump(sampled, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    # Also load built-in for merged json
    builtin = []
    if os.path.exists("js/data.js"):
        with open("js/data.js", "r", encoding="utf-8") as f:
            content = f.read()
        idx = content.find("var INCIDENTS = ")
        if idx != -1:
            try:
                builtin = json.loads(content[idx + len("var INCIDENTS = "):].strip().rstrip(";"))
                builtin = [d for d in builtin if d["id"].startswith("DRC-")]
            except:
                pass

    merged = builtin + sampled
    merged.sort(key=lambda x: x["date"], reverse=True)
    with open(os.path.join(DATA_DIR, "incidents.json"), "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False)

    log(f"Generated incidents.js ({len(sampled)} events) + incidents.json ({len(merged)} events)")

def main():
    log("=== CI Auto-Update Start ===")

    token = get_fresh_token()
    today = datetime.now().strftime("%Y-%m-%d")
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

    new_events = fetch_acled(token, thirty_days_ago, today)
    if not new_events:
        log("No new events — nothing to update")
        # Still touch files to keep workflow happy
        return

    # Load existing data
    acled_file = os.path.join(DATA_DIR, "acled_drc_data.json")
    existing = []
    if os.path.exists(acled_file):
        with open(acled_file, "r", encoding="utf-8") as f:
            existing = json.load(f)

    existing_ids = {d["id"] for d in existing}
    new_count = 0
    for event in new_events:
        inc = convert_event(event)
        if inc["province"] not in PROVINCE_MAP.values():
            continue
        if inc["id"] not in existing_ids:
            existing.append(inc)
            existing_ids.add(inc["id"])
            new_count += 1

    if new_count > 0:
        existing.sort(key=lambda x: x["date"], reverse=True)
        with open(acled_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False)
        log(f"Added {new_count} new events. Total: {len(existing)}")

    generate_files(existing, set())
    log(f"=== CI Auto-Update Complete ({new_count} new) ===")

if __name__ == "__main__":
    main()
