"""H5 第一段顶视（四旋参照、平面八旋）的计分，预期照 11-26 登记的第 1、2 条，出图前写定（2026-11-27）。

用法（仓库根目录）：
  python3 -B experiments/20261127-h5-octo-x8/score.py --key <研究者目录>/PRIVATE-key.csv --reading 1=<读者1的reading.csv> --reading 2=<读者2的reading.csv> [--out 结果.json]

每位读者分开计，不合并，不挑图：
- 预期 1（O8 轴位）：O8 的 4 张里 axes 填 8 的至少 3 张；“变成四旋”（axes 填 4 且 layers 填 one）0 张。
- 预期 2（O8 关键部位不漂移）：四项各数一遍——相机是内嵌且在上端（camera=flush 且 camera_end=top）、顶盖一整块（cover=single）、臂根顺滑（roots=smooth）、机身流线舱（shell=round）。
  每一项，O8 的张数比四旋参照少不超过 1 张。
- 两条都满足，这位读者记“符合预期”。另报：机臂数、每副桨双叶、是否完整产品、各栏的分布。
"""
import argparse
import csv
import io
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ITEMS = {"camera_flush_top": lambda r: r["camera"] == "flush" and r["camera_end"] == "top", "cover_single": lambda r: r["cover"] == "single",
         "roots_smooth": lambda r: r["roots"] == "smooth", "shell_round": lambda r: r["shell"] == "round"}


def rows(path):
    return list(csv.DictReader(io.StringIO(Path(path).read_bytes().decode("utf-8-sig"))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--reading", action="append", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    config_of = {r["id"]: r["config"] for r in json.loads((HERE / "manifest.json").read_bytes())["requests"]}
    key = {(k["reader"], k["image"]): k["request"] for k in rows(a.key)}
    result = {}
    for item in a.reading:
        reader, path = item.split("=", 1)
        by = {"Q": [], "O8": []}
        for r in rows(path):
            request = key[(reader, r["image"])]
            by[config_of[request]].append({**r, "request": request})
        assert len(by["Q"]) == 4 and len(by["O8"]) == 4, f"读者 {reader} 的张数不对"
        q, o = by["Q"], by["O8"]
        axes8 = sum(r["axes"] == "8" for r in o)
        became_quad = sum(r["axes"] == "4" and r["layers"] == "one" for r in o)
        kept = {name: {"Q": sum(f(r) for r in q), "O8": sum(f(r) for r in o)} for name, f in ITEMS.items()}
        no_drift = all(v["O8"] >= v["Q"] - 1 for v in kept.values())
        dist = lambda g: {c: dict(Counter(r[c] for r in g)) for c in ("axes", "arms", "layers", "blades", "shell", "roots", "camera", "camera_end", "cover", "product")}
        result[reader] = {"O8_axes_8": axes8, "O8_became_quad": became_quad, "expectation_1": axes8 >= 3 and became_quad == 0, "key_parts": kept, "expectation_2": no_drift,
                          "as_expected": axes8 >= 3 and became_quad == 0 and no_drift, "Q": dist(q), "O8": dist(o),
                          "per_image": [{"request": r["request"], **{k: r[k] for k in r if k not in ("image", "request")}} for g in (q, o) for r in sorted(g, key=lambda x: x["request"])]}
    readers = sorted(result)
    text = json.dumps({"summary": {"readers": readers, "as_expected_by": [r for r in readers if result[r]["as_expected"]]}, "by_reader": result}, ensure_ascii=False, indent=2)
    print(text)
    if a.out:
        Path(a.out).write_text(text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
