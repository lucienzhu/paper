"""A4 闭环臂第一轮 30 份：工作台流程在各档名义值下的出图，请求从工作台取出（2026-11-26 晚重新登记，出图前）。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261126-a4-bridge/states.json experiments/20261126-a4-bridge/captures
  python3 -B experiments/20261126-a4-bridge/build_wb.py
种子 2026112701—03，三个因素、各档共用，成区组，与原登记相同。请求号沿用原登记的 A4-<因素>-CB-<档>-s<种子序号>。
两段式和单次合并两臂还没有按工作台流程重新登记，这里不编。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112701, 2026112702, 2026112703]
FACTORS = {  # 因素：各档的名义值（就是目标值）和取出的状态
    "WL": {"what": "W/L（电机中心横向极差 ÷ 纵向极差）", "tiers": ["1.15", "1.35", "1.55", "0.70"], "in_range": ["1.15", "1.35", "1.55"], "tolerance": 0.10},
    "BW": {"what": "机壳宽 ÷ 对角电机距", "tiers": ["0.16", "0.23", "0.30"], "in_range": ["0.16", "0.23", "0.30"], "tolerance": 0.035},
    "DD": {"what": "桨径 ÷ 对角电机距（d/D）", "tiers": ["0.46", "0.56", "0.66"], "in_range": ["0.46", "0.56", "0.66"], "tolerance": 0.05},
}


def main():
    recs = {(f, t): wbgraph.load(HERE / "captures", f"A4-{f}-{t}") for f, spec in FACTORS.items() for t in spec["tiers"]}
    base = recs[("WL", "1.35")]["prompt"].split("\n")
    for (f, t), rec in recs.items():
        lines = rec["prompt"].split("\n")
        changed = sum(a != b for a, b in zip(base, lines))
        assert len(lines) == len(base) and changed == (0 if (f, t) == ("WL", "1.35") else 1), f"{f} {t} 与基准不是只差一句"
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    # 按种子轮换：中途停下时，每个因素手里都是完整的几个种子。
    for s, seed in enumerate(SEEDS, 1):
        for f, spec in FACTORS.items():
            for t in spec["tiers"]:
                rec = recs[(f, t)]
                rid = f"A4-{f}-CB-{t}-s{s}"
                raw = wbgraph.stamp(rec, rid, seed)
                (HERE / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
                rows.append({"order": s, "id": rid, "factor": f, "method": "CB", "round": 1, "tier": float(t), "in_range": t in spec["in_range"], "seed": seed,
                             "state": rec["name"], "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    for old in (HERE / "inputs").glob("wbguide-*.png"):
        old.unlink()
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    wbgraph.register_guides(recs.values(), "工作台布局条件图：四旋、对角轴距 250 mm，W/L 取 A4 的各档（A4 闭环臂）")
    manifest = {"batch": "A4 布局桥接开发：闭环臂第一轮（工作台流程在各档名义值下的出图）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "seeds": SEEDS, "factors": FACTORS,
                "states": {f"{f}-{t}": {"state": r["name"], "values": r["values"], "prompt_sha256": r["prompt_sha256"]} for (f, t), r in recs.items()},
                "negative_prompt": recs[("WL", "1.35")]["negative_prompt"], "requests": rows, "inputs": inputs,
                "round2_rule": ("每张图取两位读者的均值，每档取 3 个种子的中位数；对范围内的三档作最小二乘直线：读数 = a + b × 名义值；b < 0.25 记“不可校准”，不跑第二轮；"
                                "否则第二轮名义值 =（目标 − a）÷ b，限在第一轮档位的 0.5—1.5 倍之间，并限在工作台该构型可调的范围内"
                                "（宽 X 的 W/L 1.05—1.60，伸展 X 0.60—0.95）。每个因素 9 份，同一组种子。W/L 的 0.70 档不进校准，第二轮不跑。")}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
