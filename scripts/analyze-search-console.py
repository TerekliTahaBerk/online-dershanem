"""Read-only analysis of native Search Console CSV ZIP exports (Python stdlib).

Source files stay unchanged. Query totals can omit anonymized queries; page totals
can count multiple results. Never infer property totals from visible query rows.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import zipfile
from datetime import date, timedelta
from pathlib import Path

BRAND = re.compile(r"online\s*dershanem|onlinedershanem|y[öo]n\s*ko[çc]luk|online\s*ko[çc]um|deneme\s*ligi|onlinedenemekul[üu]b[üu]m", re.I)


def read_csv(archive, name):
    return list(csv.DictReader(io.StringIO(archive.read(name).decode("utf-8-sig"))))


def totals(rows):
    clicks = sum(int(row["Tıklamalar"]) for row in rows)
    impressions = sum(int(row["Gösterimler"]) for row in rows)
    return {
        "clicks": clicks,
        "impressions": impressions,
        "ctrPercent": 100 * clicks / impressions if impressions else None,
        # Reconstructed from rounded daily positions; not falsely exact GSC precision.
        "approxImpressionWeightedPosition": sum(float(row["Pozisyon"] or 0) * int(row["Gösterimler"]) for row in rows) / impressions if impressions else None,
    }


def analyze(raw_dir, exported_on):
    result = {"property": "sc-domain:onlinedershanem.com", "exportedOn": exported_on, "periods": {}, "sources": []}
    daily_exports = []
    for path in sorted(raw_dir.glob("performance-*.zip")):
        with zipfile.ZipFile(path) as archive:
            result["sources"].append({"file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "members": archive.namelist()})
            if "Grafik.csv" not in archive.namelist():
                continue
            daily = read_csv(archive, "Grafik.csv")
            queries = read_csv(archive, "Sorgular.csv")
            pages = read_csv(archive, "Sayfa sayısı.csv")
            period = {"start": daily[0]["Tarih"], "end": daily[-1]["Tarih"], **totals(daily), "queryRows": len(queries), "visibleQueryClicks": sum(int(q["Tıklamalar"]) for q in queries), "pages": pages, "devices": read_csv(archive, "Cihazlar.csv"), "countries": read_csv(archive, "Ülkeler.csv"), "filters": read_csv(archive, "Filtreler.csv")}
            period["brandedQueryApproximation"] = {"definition": BRAND.pattern, "rows": [q for q in queries if BRAND.search(q["En çok yapılan sorgular"])]}
            period["queryOpportunities"] = [q for q in queries if 4 <= float(q["Pozisyon"] or 0) <= 20 and int(q["Gösterimler"]) >= 2]
            result["periods"][path.stem] = period
            daily_exports.append((path, daily))
    recent = next((rows for path, rows in daily_exports if "28-days-" in path.name), None)
    if recent:
        start = date.fromisoformat(recent[0]["Tarih"])
        previous_start = (start - timedelta(days=len(recent))).isoformat()
        previous_end = (start - timedelta(days=1)).isoformat()
        candidates = [rows for _, rows in daily_exports if rows[0]["Tarih"] <= previous_start and rows[-1]["Tarih"] >= previous_end]
        if candidates:
            previous = [row for row in candidates[0] if previous_start <= row["Tarih"] <= previous_end]
            result["previous28Days"] = {"start": previous_start, "end": previous_end, "daysPresent": len(previous), **totals(previous)}
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw-dir", type=Path, default=Path("reports/seo/search-console/raw"))
    parser.add_argument("--output", type=Path, default=Path("reports/seo/search-console/analysis-2026-10-26.json"))
    parser.add_argument("--exported-on", required=True, help="Actual export date, YYYY-MM-DD")
    args = parser.parse_args()
    date.fromisoformat(args.exported_on)
    summary = analyze(args.raw_dir, args.exported_on)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(args.output), "periods": {key: {field: value for field, value in period.items() if field in ["start", "end", "clicks", "impressions", "ctrPercent", "queryRows", "visibleQueryClicks"]} for key, period in summary["periods"].items()}, "previous28Days": summary.get("previous28Days")}, ensure_ascii=False))
