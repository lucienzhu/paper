"""农业植保六旋确认批的计分（判据照登记，出图前写定，2026-11-27）。

用法（仓库根目录）：
  python3 -B experiments/20261127-nozzle-confirm/score.py --key <研究者目录>/PRIVATE-key.csv --reading 1=<读者1的reading.csv> --reading 2=<读者2的reading.csv> [--out 结果.json]

每位读者分开计，不合并，不挑图：
- 喷头组（H3-nozzle，4 张）目标项：nozzles 填 yes 且 boom 填 no，记“可辨”。确认门：可辨至少 3/4，且药箱与加注口保持（tank、filler 都填 yes）至少 3/4。
- 特异性：喷杆组（H2-boom，6 张）里 nozzles 填 yes 的张数。超过一半（4 张以上），这位读者的“喷头可辨”分不开喷头和电机细节，确认不算数。
- 通用项两组分开报：motors 填 6、arms 填 6、blades 填 two、hinge 填 yes、camera 填 no、product 填 yes 的张数。
- 喷杆组另报：boom 填 yes 的张数和 boom_where 的分布（H2 喷洒部件的可辨性）；tank、filler 各填 yes 的张数。
"""
import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent


def rows(path):
    return list(csv.DictReader(io.StringIO(Path(path).read_bytes().decode("utf-8-sig"))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--reading", action="append", required=True, help="读者号=reading.csv")
    ap.add_argument("--out")
    a = ap.parse_args()
    group_of = {r["id"]: r["group"] for r in json.loads((HERE / "manifest.json").read_bytes())["requests"]}
    key = {(k["reader"], k["image"]): k["request"] for k in rows(a.key)}
    result = {}
    for item in a.reading:
        reader, path = item.split("=", 1)
        by = {"H3-nozzle": [], "H2-boom": []}
        for r in rows(path):
            request = key[(reader, r["image"])]
            by[group_of[request]].append({**r, "request": request})
        assert len(by["H3-nozzle"]) == 4 and len(by["H2-boom"]) == 6, f"读者 {reader} 的张数不对"
        nz, bm = by["H3-nozzle"], by["H2-boom"]
        hit = sum(r["nozzles"] == "yes" and r["boom"] == "no" for r in nz)
        kept = sum(r["tank"] == "yes" and r["filler"] == "yes" for r in nz)
        false_nozzle = sum(r["nozzles"] == "yes" for r in bm)
        general = lambda g: {"motors_6": sum(r["motors"] == "6" for r in g), "arms_6": sum(r["arms"] == "6" for r in g), "blades_two": sum(r["blades"] == "two" for r in g),
                             "hinge_yes": sum(r["hinge"] == "yes" for r in g), "camera_no": sum(r["camera"] == "no" for r in g), "product_yes": sum(r["product"] == "yes" for r in g), "n": len(g)}
        specific = false_nozzle <= 3
        result[reader] = {
            "nozzle_group": {"target_hit": hit, "tank_and_filler_kept": kept, "n": 4, "nozzles": dict(Counter(r["nozzles"] for r in nz)), "boom": dict(Counter(r["boom"] for r in nz)), "general": general(nz)},
            "boom_group": {"boom_yes": sum(r["boom"] == "yes" for r in bm), "boom_where": dict(Counter(r["boom_where"] for r in bm)), "nozzles_yes": false_nozzle, "nozzles": dict(Counter(r["nozzles"] for r in bm)),
                           "tank_yes": sum(r["tank"] == "yes" for r in bm), "filler_yes": sum(r["filler"] == "yes" for r in bm), "n": 6, "general": general(bm)},
            "specific": specific,
            "confirmed": hit >= 3 and kept >= 3 and specific,
            "per_image": [{"request": r["request"], **{k: r[k] for k in r if k not in ("image", "request")}} for g in (nz, bm) for r in sorted(g, key=lambda x: x["request"])],
        }
    readers = sorted(result)
    summary = {"readers": readers, "confirmed_by": [r for r in readers if result[r]["confirmed"]],
               "conclusion": "确认" if readers and all(result[r]["confirmed"] for r in readers) else "未全部确认，按读者分开报告"}
    text = json.dumps({"summary": summary, "by_reader": result}, ensure_ascii=False, indent=2)
    print(text)
    if a.out:
        Path(a.out).write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
