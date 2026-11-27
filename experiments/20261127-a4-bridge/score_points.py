"""A4 的计分：由两位读者的取点算三个比例，按登记的判据判命中和过门（判据照 11-26 登记第四节；出读数前写定，2026-11-27）。

用法（仓库根目录）：
  python3 -B experiments/20261127-a4-bridge/score_points.py --key <研究者目录>/PRIVATE-key.csv \
      --response 1=<读者1某一份的response.csv> --response 1=<读者1另一份> --response 2=… [--out 结果.json]
同一位读者的几份 response.csv 各给一次 --response。请求号形如 A4-<因素>-<做法>-<档>-s<种子序号>（做法 CB、CB2、MG、TS2；CB2 是闭环臂第二轮，档写的是目标值）。

每张图、每位读者：
  W/L ＝ 四个电机中心横向极差 ÷ 纵向极差；D ＝ 两条对角线的均值；机壳宽 ÷ D ＝（right − left）÷ D；
  d/D ＝ 2 × 各桨“电机中心到桨尖的距离”的中位数 ÷ D。缺点时这一项留空。
每张图的命中（三项都成立）：这张图所属因素的读数取两位读者的均值，|均值 − 目标| 不超过容差（W/L 0.10、机壳宽 0.035、d/D 0.05）；
  两位读者都答机臂连着；两位读者都答是一件产品。
过门：一种做法在一个因素上，范围内三档每档 3 张里至少 2 张命中。W/L 的 0.70 档不进门，单报；读数 ≥ 0.98 记“被拉回”。
校准（只对闭环臂）：每档取 3 个种子的中位数，对范围内三档作最小二乘直线 读数 = a + b × 名义值；b < 0.25 记“不可校准”。
"""
import argparse
import csv
import io
import json
import math
import re
import statistics
from collections import defaultdict
from pathlib import Path

TOL = {"WL": 0.10, "BW": 0.035, "DD": 0.05}
IN_RANGE = {"WL": [1.15, 1.35, 1.55], "BW": [0.16, 0.23, 0.30], "DD": [0.46, 0.56, 0.66]}
HUBS = ["tl", "tr", "br", "bl"]


def rows(path):
    return list(csv.DictReader(io.StringIO(Path(path).read_bytes().decode("utf-8-sig"))))


def pt(r, name):
    x, y = r.get(f"{name}_x", ""), r.get(f"{name}_y", "")
    return (float(x), float(y)) if x not in ("", None) and y not in ("", None) else None


def measure(r):
    hubs = [pt(r, h) for h in HUBS]
    out = {"WL": None, "BW": None, "DD": None, "connected": r.get("connected", ""), "product": r.get("product", ""), "reason": r.get("reason", "")}
    if not all(hubs):
        return out
    xs, ys = [p[0] for p in hubs], [p[1] for p in hubs]
    D = (math.dist(hubs[0], hubs[2]) + math.dist(hubs[1], hubs[3])) / 2
    out["WL"] = (max(xs) - min(xs)) / (max(ys) - min(ys))
    left, right = pt(r, "left"), pt(r, "right")
    if left and right:
        out["BW"] = (right[0] - left[0]) / D
    tips = [math.dist(h, pt(r, "tip_" + n)) for h, n in zip(hubs, HUBS) if pt(r, "tip_" + n)]
    if tips:
        out["DD"] = 2 * statistics.median(tips) / D
        out["tips_read"] = len(tips)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--response", action="append", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    key = {(k["reader"], k["image"]): k["request"] for k in rows(a.key)}
    by = defaultdict(dict)  # request -> reader -> measure
    for item in a.response:
        reader, path = item.split("=", 1)
        for r in rows(path):
            by[key[(reader, r["image"])]][reader] = measure(r)
    readers = sorted({rd for v in by.values() for rd in v})
    images, cells = [], defaultdict(list)
    for request in sorted(by):
        m = re.match(r"A4-(WL|BW|DD)-(CB2|CB|MG|TS2)-([0-9.]+)-s(\d)$", request)
        factor, method, tier, seed = m.group(1), m.group(2), float(m.group(3)), int(m.group(4))
        got = by[request]
        vals = {q: [got[rd][q] for rd in readers if rd in got and got[rd][q] is not None] for q in ("WL", "BW", "DD")}
        mean = {q: (sum(v) / len(v) if len(v) == len(readers) else None) for q, v in vals.items()}
        both = lambda q: all(got.get(rd, {}).get(q) == "yes" for rd in readers)
        dev = None if mean[factor] is None else mean[factor] - tier
        hit = dev is not None and abs(dev) <= TOL[factor] and both("connected") and both("product")
        rec = {"request": request, "factor": factor, "method": method, "tier": tier, "seed": seed, "mean": mean, "deviation": dev, "connected_both": both("connected"),
               "product_both": both("product"), "hit": hit, "by_reader": got,
               "reader_gap": {q: (abs(vals[q][0] - vals[q][1]) if len(vals[q]) == 2 else None) for q in vals}}
        images.append(rec)
        cells[(method, factor, tier)].append(rec)
    summary = {}
    for method in sorted({m for m, _, _ in cells}):
        for factor in ("WL", "BW", "DD"):
            tiers = sorted(t for (m, f, t) in cells if m == method and f == factor)
            if not tiers:
                continue
            per = {}
            for t in tiers:
                rs = cells[(method, factor, t)]
                reads = [r["mean"][factor] for r in rs if r["mean"][factor] is not None]
                per[str(t)] = {"hits": sum(r["hit"] for r in rs), "of": len(rs), "readings": [None if r["mean"][factor] is None else round(r["mean"][factor], 3) for r in rs],
                               "median": round(statistics.median(reads), 3) if reads else None, "in_range": t in IN_RANGE[factor],
                               "connected_both": sum(r["connected_both"] for r in rs), "product_both": sum(r["product_both"] for r in rs)}
            ins = [t for t in tiers if t in IN_RANGE[factor]]
            gate = len(ins) == 3 and all(per[str(t)]["hits"] >= 2 and per[str(t)]["of"] == 3 for t in ins)
            entry = {"tiers": per, "gate_passed": gate}
            meds = [(t, per[str(t)]["median"]) for t in ins if per[str(t)]["median"] is not None]
            if len(meds) == 3:
                mx, my = sum(t for t, _ in meds) / 3, sum(v for _, v in meds) / 3
                b = sum((t - mx) * (v - my) for t, v in meds) / sum((t - mx) ** 2 for t, _ in meds)
                entry["fit"] = {"a": round(my - b * mx, 4), "b": round(b, 4), "calibratable": b >= 0.25}
            if factor == "WL" and "0.7" in per:
                entry["out_of_range_0.70"] = {"readings": per["0.7"]["readings"], "pulled_back": [v is not None and v >= 0.98 for v in per["0.7"]["readings"]]}
            hold = {q: [round(r["mean"][q], 3) for t in tiers for r in cells[(method, factor, t)] if r["mean"][q] is not None] for q in ("WL", "BW", "DD") if q != factor}
            entry["hold_ranges"] = {q: [min(v), max(v)] for q, v in hold.items() if v}
            summary[f"{method}-{factor}"] = entry
    gaps = {q: [r["reader_gap"][q] for r in images if r["reader_gap"][q] is not None] for q in ("WL", "BW", "DD")}
    agreement = {q: {"n": len(v), "median_gap": round(statistics.median(v), 4), "max_gap": round(max(v), 4)} for q, v in gaps.items() if v}
    text = json.dumps({"readers": readers, "tolerance": TOL, "summary": summary, "reader_agreement": agreement, "images": images}, ensure_ascii=False, indent=2)
    if a.out:
        Path(a.out).write_text(text + "\n", encoding="utf-8")
    for k, v in summary.items():
        print(k, "过门" if v["gate_passed"] else "没过门", {t: f"{x['hits']}/{x['of']} 中位 {x['median']}" for t, x in v["tiers"].items()}, v.get("fit", ""))
    print("两位读者之差", agreement)


if __name__ == "__main__":
    main()
