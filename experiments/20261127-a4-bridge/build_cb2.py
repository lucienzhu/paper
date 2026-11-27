"""A4 闭环臂第二轮：按第一轮登记的读数和写定的规则反推名义值，从工作台取请求（见 README 第七节）。出图前写定，2026-11-27。

规则（11-26 登记，manifest.json 的 round2_rule）：每张图取两位读者的均值，每档取 3 个种子的中位数；对范围内三档作最小二乘直线
读数 = a + b × 名义值；b < 0.25 记“不可校准”，不跑；否则第二轮名义值 =（目标 − a）÷ b，限在第一轮档位的 0.5—1.5 倍之间，
并限在工作台该构型可调的范围内（宽 X 的 W/L 1.05—1.60）。每个因素 9 份，同一组种子。W/L 的 0.70 档不进校准。
a、b 取自 ai-reading/cb1-score.json（score_points.py 的输出，四位小数）。名义值取三位小数。

运行（仓库根目录）：
  python3 -B experiments/20261127-a4-bridge/build_cb2.py states      写 states-cb2.json
  node experiments/workbench-graph/capture.mjs experiments/20261127-a4-bridge/states-cb2.json experiments/20261127-a4-bridge/captures-cb2
  python3 -B experiments/20261127-a4-bridge/build_cb2.py requests    写 cb2/ 下的请求和清单
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112701, 2026112702, 2026112703]
TIERS = {"WL": [1.15, 1.35, 1.55], "DD": [0.46, 0.56, 0.66], "BW": [0.16, 0.23, 0.30]}
WL_RANGE = (1.05, 1.60)
D_MM = 250


def plan():
    fit = {k.split("-")[1]: v["fit"] for k, v in json.loads((HERE / "ai-reading/cb1-score.json").read_bytes())["summary"].items() if k.startswith("CB-")}
    out = {}
    for factor, tiers in TIERS.items():
        a, b = fit[factor]["a"], fit[factor]["b"]
        if b < 0.25:
            out[factor] = {"a": a, "b": b, "calibratable": False}
            continue
        rows = []
        for t in tiers:
            v = (t - a) / b
            v = min(max(v, 0.5 * t), 1.5 * t)
            if factor == "WL":
                v = min(max(v, WL_RANGE[0]), WL_RANGE[1])
            rows.append({"target": t, "nominal": round(v, 3)})
        out[factor] = {"a": a, "b": b, "calibratable": True, "tiers": rows}
    return out


def states():
    base = next(s for s in json.loads((HERE / "states.json").read_bytes())["states"] if s["name"] == "A4-WL-1.35")["values"]
    p = plan()
    st = []
    for row in p["WL"].get("tiers", []):
        st.append({"name": f"A4-WL2-{row['target']:.2f}", "values": {**base, "frame.span_ratio_wl": row["nominal"]}})
    for row in p["DD"].get("tiers", []):
        st.append({"name": f"A4-DD2-{row['target']:.2f}", "values": {**base, "propulsion.prop_diameter_inch": row["nominal"] * D_MM / 25.4}})
    for row in p["BW"].get("tiers", []):
        st.append({"name": f"A4-BW2-{row['target']:.2f}", "values": {**base, "fuselage.fuselage_dimensions_mm.width": row["nominal"] * D_MM}})
    doc = {"task": "consumer_camera", "note": "A4 闭环臂第二轮：按第一轮读数的最小二乘直线反推的名义值（build_cb2.py）。基准同第一轮（宽 X、W/L 1.35、250 mm、5 英寸桨）。", "plan": p, "states": st}
    (HERE / "states-cb2.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(p, ensure_ascii=False))
    print("状态：", [s["name"] for s in st])


def requests():
    doc = json.loads((HERE / "states-cb2.json").read_bytes())
    out = HERE / "cb2"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    recs = {s["name"]: wbgraph.load(HERE / "captures-cb2", s["name"]) for s in doc["states"]}
    base = wbgraph.load(HERE / "captures", "A4-WL-1.35")["prompt"].split("\n")
    rows = []
    for n, seed in enumerate(SEEDS, 1):
        for name, rec in recs.items():
            lines = rec["prompt"].split("\n")
            changed = sum(a != b for a, b in zip(base, lines))
            assert len(lines) == len(base) and changed <= 1, f"{name} 与基准不是至多差一句"
            factor, tier = name.split("-")[1][:2], name.split("-")[2]
            rid = f"A4-{factor}-CB2-{tier}-s{n}"
            raw = wbgraph.stamp(rec, rid, seed)
            (out / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": n, "id": rid, "factor": factor, "method": "CB", "round": 2, "tier": float(tier), "seed": seed, "state": name,
                         "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(list(recs.values()), out / "inputs")
    wbgraph.register_guides(list(recs.values()), "工作台的布局条件图：A4 闭环臂第二轮反推出的名义值（带表示桨的直杆）")
    manifest = {"batch": "A4 闭环臂第二轮（按第一轮读数反推的名义值）", "workbench": wbgraph.workbench_of(list(recs.values())), "plan": doc["plan"], "seeds": SEEDS,
                "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    {"states": states, "requests": requests}[sys.argv[1]]()
