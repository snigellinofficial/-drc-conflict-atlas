"""Simplify DRC provinces GeoJSON — reduce size for browser use."""
import json, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IN_PATH = os.path.join(BASE, "data", "drc_provinces.geojson")
OUT_PATH = os.path.join(BASE, "data", "drc_provinces.json")

with open(IN_PATH, "r", encoding="utf-8-sig") as f:
    data = json.load(f)

features = data.get("features", [])
print(f"Original: {len(features)} features, {os.path.getsize(IN_PATH)/1024:.0f} KB")

out_features = []
for feat in features:
    props = feat.get("properties", {})
    name = props.get("shapeName", props.get("name", "Unknown"))
    iso = props.get("shapeISO", "")

    # Simplify coordinates: keep every Nth point for large polygons
    geom = feat.get("geometry", {})
    if geom.get("type") == "Polygon":
        rings = geom.get("coordinates", [])
        new_rings = []
        for ring in rings:
            # Keep every 3rd point to reduce size
            new_rings.append([pt for i, pt in enumerate(ring) if i % 3 == 0 or i == 0 or i == len(ring)-1])
        geom = {"type": "Polygon", "coordinates": new_rings}
    elif geom.get("type") == "MultiPolygon":
        polys = geom.get("coordinates", [])
        new_polys = []
        for poly in polys:
            new_rings = []
            for ring in poly:
                new_rings.append([pt for i, pt in enumerate(ring) if i % 3 == 0 or i == 0 or i == len(ring)-1])
            new_polys.append(new_rings)
        geom = {"type": "MultiPolygon", "coordinates": new_polys}

    # Round coordinates to 4 decimal places
    def round_coords(obj):
        if isinstance(obj, list):
            if len(obj) >= 2 and isinstance(obj[0], (int, float)) and isinstance(obj[1], (int, float)) and not isinstance(obj[2] if len(obj) > 2 else None, list):
                return [round(obj[0], 4), round(obj[1], 4)]
            return [round_coords(item) for item in obj]
        return obj
    geom = round_coords(geom)

    new_feat = {
        "type": "Feature",
        "properties": {"name": name, "iso": iso},
        "geometry": geom
    }
    out_features.append(new_feat)
    print(f"  {name} ({iso})")

output = {"type": "FeatureCollection", "features": out_features}
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

size_kb = os.path.getsize(OUT_PATH) / 1024
print(f"Output: {len(out_features)} provinces, {size_kb:.0f} KB")
