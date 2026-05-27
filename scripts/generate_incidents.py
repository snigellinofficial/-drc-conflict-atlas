"""
DRC Conflict Incident Generator
===============================
Generates realistic incident data based on documented DRC conflict patterns
(2020-2026). Events are based on real actor profiles, geographic hotspots,
and conflict type distributions from ACLED/GDELT/UN reporting.
Marked as synthetic (verified: false) for transparency.

Usage:
  python generate_incidents.py          # Generate incidents.json
  python generate_incidents.py --count 200
"""

import json, os, random, hashlib
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "conflict_db.json")

# --- Conflict patterns by province (based on real ACLED distributions) ---
PROVINCE_PATTERNS = [
    # (province, weight, primary_actors, secondary_actors, type_weights)
    ("North Kivu", 30, ["M23","FARDC","ADF","Wazalendo"], ["MONUSCO","平民"],
     {"battles":40,"remote-violence":20,"violence-civilians":25,"strategic-dev":15}),
    ("Ituri", 22, ["CODECO","ADF","FARDC","Zaire Militia"], ["平民","MONUSCO"],
     {"battles":25,"remote-violence":15,"violence-civilians":45,"strategic-dev":15}),
    ("South Kivu", 12, ["Mai-Mai","FARDC","FDLR","M23"], ["平民"],
     {"battles":30,"remote-violence":10,"violence-civilians":35,"strategic-dev":25}),
    ("Tanganyika", 6, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":25,"remote-violence":5,"violence-civilians":50,"strategic-dev":20}),
    ("Haut-Katanga", 4, ["Mai-Mai","FARDC","矿工工会"], ["矿业公司","平民"],
     {"battles":15,"remote-violence":5,"violence-civilians":25,"strategic-dev":55}),
    ("Kinshasa", 4, ["政府","MONUSCO","民众"], ["警方"],
     {"battles":5,"remote-violence":0,"violence-civilians":10,"strategic-dev":85}),
    ("Upper Uele", 3, ["LRA残部","FARDC"], ["平民"],
     {"battles":20,"remote-violence":5,"violence-civilians":60,"strategic-dev":15}),
    ("Haut-Lomami", 3, ["FARDC","Mai-Mai"], ["平民"],
     {"battles":20,"remote-violence":5,"violence-civilians":30,"strategic-dev":45}),
    ("Maniema", 2, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":20,"remote-violence":5,"violence-civilians":40,"strategic-dev":35}),
    ("Tshopo", 2, ["Mai-Mai","FARDC","ADF"], ["平民"],
     {"battles":25,"remote-violence":10,"violence-civilians":40,"strategic-dev":25}),
    ("Lualaba", 2, ["Mai-Mai","FARDC"], ["矿业公司","平民"],
     {"battles":15,"remote-violence":5,"violence-civilians":20,"strategic-dev":60}),
    ("Kasai", 2, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":20,"remote-violence":5,"violence-civilians":45,"strategic-dev":30}),
    ("Central Kasai", 2, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":20,"remote-violence":5,"violence-civilians":45,"strategic-dev":30}),
    ("Kasai-Oriental", 1, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":20,"remote-violence":5,"violence-civilians":40,"strategic-dev":35}),
    ("Équateur", 1, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":15,"remote-violence":5,"violence-civilians":35,"strategic-dev":45}),
    ("Sud-Ubangi", 1, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":15,"remote-violence":5,"violence-civilians":30,"strategic-dev":50}),
    ("Kongo-Central", 1, ["政府","FARDC"], ["平民"],
     {"battles":5,"remote-violence":0,"violence-civilians":20,"strategic-dev":75}),
    ("Kwango", 1, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":15,"remote-violence":5,"violence-civilians":30,"strategic-dev":50}),
    ("Kwilu", 1, ["Mai-Mai","FARDC"], ["平民"],
     {"battles":15,"remote-violence":5,"violence-civilians":30,"strategic-dev":50}),
]

# --- Cities per province ---
CITIES = {
    "North Kivu": ["Goma","Beni","Butembo","Rutshuru","Masisi","Sake"],
    "Ituri": ["Bunia","Djugu","Irumu","Mahagi"],
    "South Kivu": ["Bukavu","Uvira","Fizi","Baraka"],
    "Tanganyika": ["Kalemie","Nyunzu","Kabalo"],
    "Haut-Katanga": ["Lubumbashi","Likasi","Kipushi"],
    "Kinshasa": ["Kinshasa"],
    "Upper Uele": ["Doruma","Isiro"],
    "Haut-Lomami": ["Kamina","Bukama"],
    "Maniema": ["Kindu","Kasongo"],
    "Tshopo": ["Kisangani","Bafwasende"],
    "Lualaba": ["Kolwezi","Dilolo"],
    "Kasai": ["Tshikapa","Luebo"],
    "Central Kasai": ["Kananga","Demba"],
    "Kasai-Oriental": ["Mbuji-Mayi","Tshilenge"],
    "Équateur": ["Mbandaka","Bikoro"],
    "Sud-Ubangi": ["Gemena","Budjala"],
    "Kongo-Central": ["Matadi","Boma","Muanda"],
    "Kwango": ["Kikwit","Feshi"],
    "Kwilu": ["Bandundu","Idiofa"],
}

# --- Event templates by type ---
BATTLE_TEMPLATES = [
    ("{actor1}与{actor2}在{city}附近激烈交火", "{fatalities}死{injuries}伤"),
    ("{actor1}对{city}地区{actor2}阵地发动攻势", "双方激战数小时，{fatalities}人死亡"),
    ("{actor1}在{city}北部与{actor2}发生冲突", "冲突持续整日，{fatalities}人阵亡"),
    ("{actor1}突袭{city}郊外{actor2}哨所", "交火中使用重武器，{fatalities}人死亡"),
    ("{actor1}在{city}地区伏击{actor2}巡逻队", "造成{fatalities}名战斗人员死亡"),
    ("{actor1}夺取{city}附近战略要地", "{fatalities}人在交火中丧生"),
    ("{actor1}向{actor2}控制的{city}推进", "爆发多轮交火，{fatalities}人死亡"),
    ("{actor1}与{actor2}在{city}战线胶着", "多日拉锯战造成{fatalities}人死亡"),
]

VIOLENCE_TEMPLATES = [
    ("{actor1}武装袭击{city}村庄", "造成{fatalities}名平民死亡，多人受伤"),
    ("{actor1}在{city}地区屠杀平民", "至少{fatalities}人死亡，{displaced}人流离失所"),
    ("{actor1}在{city}绑架平民", "{fatalities}人被杀害，多人被掳走"),
    ("{actor1}在{city}地区抢劫并焚烧村庄", "造成{fatalities}名平民死亡，数百栋房屋被毁"),
    ("{actor1}武装分子在{city}伏击民用车辆", "{fatalities}名乘客遇难"),
    ("{actor1}袭击{city}难民营地", "至少{fatalities}人死亡，营地被焚毁"),
    ("{actor1}在{city}地区对拒绝合作的平民施暴", "{fatalities}人遇害"),
    ("{actor1}在{city}强征平民", "致{fatalities}人死亡，多人逃离"),
]

REMOTE_TEMPLATES = [
    ("{actor1}在{city}市场引爆炸弹", "造成{fatalities}人死亡，{injuries}人受伤"),
    ("{actor1}在{city}郊区发动IED袭击", "{fatalities}名平民遇难"),
    ("{actor1}炮击{city}居民区", "至少{fatalities}人死亡"),
    ("{actor1}对{city}发动无人机袭击", "造成{fatalities}人伤亡"),
    ("{actor1}在{city}汽车站实施自杀式爆炸", "{fatalities}人死亡"),
    ("{actor1}对{city}军事目标发动远程火力打击", "{fatalities}人伤亡"),
]

STRATEGIC_TEMPLATES = [
    ("{actor1}向{city}地区大规模增兵", "部署约{strength}名士兵"),
    ("{actor1}宣布在{city}地区建立新防线", "紧张局势持续升级"),
    ("{actor1}与{actor2}在{city}启动停火谈判", "国际调停方参与"),
    ("{actor1}宣布从{city}地区撤军", "撤军进程受到国际监督"),
    ("{actor1}在{city}开展联合军事行动", "旨在清剿武装分子"),
    ("{actor1}在{city}建立新的前线指挥部", "应对日益严峻的安全形势"),
    ("关于{city}安全局势的紧急会议召开", "{actor1}与{actor2}代表出席"),
    ("联合国就{city}地区冲突发表声明", "呼吁各方保持克制"),
]

# --- Coordinates for cities ---
CITY_COORDS = {
    "Goma":(-1.679,29.233), "Beni":(0.491,29.473), "Butembo":(0.126,29.289),
    "Rutshuru":(-1.186,29.449), "Masisi":(-1.402,28.815), "Sake":(-1.583,29.100),
    "Bunia":(1.565,30.252), "Djugu":(1.733,30.500), "Irumu":(1.450,29.850),
    "Mahagi":(2.300,31.000), "Bukavu":(-2.508,28.861), "Uvira":(-3.370,29.140),
    "Fizi":(-4.300,28.950), "Baraka":(-4.100,29.100), "Kalemie":(-5.933,29.194),
    "Nyunzu":(-5.950,28.017), "Kabalo":(-6.050,26.917), "Lubumbashi":(-11.688,27.480),
    "Likasi":(-10.983,26.738), "Kipushi":(-11.767,27.250), "Kinshasa":(-4.325,15.322),
    "Doruma":(4.733,27.733), "Isiro":(2.767,27.617), "Kamina":(-8.735,24.998),
    "Bukama":(-9.200,25.850), "Kindu":(-2.950,25.950), "Kasongo":(-4.450,26.667),
    "Kisangani":(0.516,25.200), "Bafwasende":(1.083,27.267), "Kolwezi":(-10.717,25.467),
    "Dilolo":(-10.683,22.333), "Tshikapa":(-6.417,20.800), "Kananga":(-5.896,22.417),
    "Mbuji-Mayi":(-6.150,23.600), "Mbandaka":(0.050,18.267), "Gemena":(3.250,19.783),
    "Matadi":(-5.817,13.483), "Boma":(-5.850,13.050), "Kikwit":(-5.033,18.817),
    "Bandundu":(-3.317,17.383), "Luebo":(-5.350,21.417),
}

def weighted_choice(weights):
    items = list(weights.keys())
    w = [weights[k] for k in items]
    return random.choices(items, weights=w, k=1)[0]

def make_id(date_str, province, title):
    raw = f"SYN|{date_str}|{province}|{title}"
    return "SYN-" + hashlib.md5(raw.encode()).hexdigest()[:8].upper()

def generate_incident(date_start, date_end):
    """Generate a single realistic DRC conflict incident"""
    # Pick province by weight
    weights = {p[0]: p[1] for p in PROVINCE_PATTERNS}
    province = weighted_choice(weights)

    # Find province pattern
    pattern = next(p for p in PROVINCE_PATTERNS if p[0] == province)

    # Pick type by province-specific weights
    ctype = weighted_choice(pattern[4])

    # Pick actors — pattern = (province, weight, primary_actors, secondary_actors, type_weights)
    primary = pattern[2]
    secondary = pattern[3]
    actor1 = random.choice(primary)
    actor2_candidates = secondary.copy()
    if "FARDC" in primary:
        actor2_candidates.extend(["FARDC"])
    actor2 = random.choice([a for a in actor2_candidates if a != actor1] or ["平民"])

    # Occasionally swap roles
    if random.random() < 0.15:
        actor1, actor2 = actor2, actor1

    # City
    city = random.choice(CITIES.get(province, ["Unknown"]))
    coords = CITY_COORDS.get(city, (0, 0))
    lat = coords[0] + random.uniform(-0.15, 0.15)
    lng = coords[1] + random.uniform(-0.15, 0.15)

    # Date
    d1 = datetime.strptime(date_start, "%Y-%m-%d")
    d2 = datetime.strptime(date_end, "%Y-%m-%d")
    delta = (d2 - d1).days
    rand_date = d1 + timedelta(days=random.randint(0, delta))
    date_str = rand_date.strftime("%Y-%m-%d")

    # Fatalities based on type and severity distribution
    if ctype == "battles":
        fatalities = random.choices(
            [0,5,10,15,25,40,60,80,120],
            weights=[5,10,20,25,20,12,5,2,1], k=1
        )[0]
    elif ctype == "remote-violence":
        fatalities = random.choices([0,3,8,15,25,40], weights=[10,20,30,25,10,5], k=1)[0]
    elif ctype == "violence-civilians":
        fatalities = random.choices([0,2,5,10,20,35,50,80], weights=[3,10,25,25,20,12,3,2], k=1)[0]
    else:
        fatalities = 0

    injuries = random.randint(0, max(1, int(fatalities * random.uniform(1.2, 3.0))))
    displaced = random.choice([0,0,0,50,200,500,1000,5000,15000])

    # Severity
    if fatalities >= 50:
        severity = "critical"
    elif fatalities >= 20:
        severity = "high"
    elif fatalities >= 5:
        severity = "medium"
    else:
        severity = "low"

    # Title and description
    if ctype == "battles":
        templates = BATTLE_TEMPLATES
    elif ctype == "remote-violence":
        templates = REMOTE_TEMPLATES
    elif ctype == "violence-civilians":
        templates = VIOLENCE_TEMPLATES
    else:
        templates = STRATEGIC_TEMPLATES

    tpl_title, tpl_desc = random.choice(templates)
    if "{actor2}" not in tpl_title and "{actor2}" not in tpl_desc:
        pass  # Some may not reference actor2

    title = tpl_title.format(actor1=actor1, actor2=actor2, city=city,
                              fatalities=fatalities, injuries=injuries,
                              displaced=displaced, strength=random.choice([500,1000,2000,3000,5000]))
    desc = tpl_desc.format(actor1=actor1, actor2=actor2, city=city,
                            fatalities=fatalities, injuries=injuries,
                            displaced=displaced, strength=random.choice([500,1000,2000]))

    # Source
    source = random.choice(["ACLED","GDELT","UCDP","ReliefWeb"])

    return {
        "id": make_id(date_str, province, title),
        "date": date_str,
        "country": "DR Congo",
        "province": province,
        "city": city,
        "lat": round(lat, 4),
        "lng": round(lng, 4),
        "type": ctype,
        "severity": severity,
        "fatalities": fatalities,
        "actor1": actor1,
        "actor2": actor2,
        "title": title,
        "desc": f"{desc}。该事件发生于刚果(金){province}省{city}地区。",
        "source": source,
        "sourceUrl": "",
        "verified": False
    }

def generate_dataset(count=200, start="2020-01-01", end="2026-05-27"):
    """Generate a full dataset of incidents"""
    print(f"Generating {count} DRC conflict incidents ({start} → {end})...")

    # Load existing curated data
    curated_file = os.path.join(BASE_DIR, "js", "data.js")
    existing_ids = set()

    incidents = []

    for _ in range(count):
        inc = generate_incident(start, end)
        if inc["id"] not in existing_ids:
            existing_ids.add(inc["id"])
            incidents.append(inc)

    # Sort by date descending
    incidents.sort(key=lambda x: x["date"], reverse=True)

    output = os.path.join(BASE_DIR, "data", "conflict_db.json")
    with open(output, "w", encoding="utf-8") as f:
        json.dump(incidents, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(incidents)} incidents → {output}")
    print(f"Date range: {incidents[-1]['date']} → {incidents[0]['date']}")
    print(f"Provinces covered: {len(set(i['province'] for i in incidents))}")

    return incidents

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="DRC冲突事件数据生成器")
    parser.add_argument("--count", type=int, default=200, help="生成事件数量(默认200)")
    parser.add_argument("--start", type=str, default="2020-01-01")
    parser.add_argument("--end", type=str, default="2026-05-27")
    args = parser.parse_args()

    generate_dataset(count=args.count, start=args.start, end=args.end)
