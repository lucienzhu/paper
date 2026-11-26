"""H5 第一段顶视 12 张：四旋参照、平面八旋、共轴 X8 各 4 张，请求从工作台取出（2026-11-26 晚重编，出图前）。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261126-h5-octo-x8/states.json experiments/20261126-h5-octo-x8/captures
  python3 -B experiments/20261126-h5-octo-x8/build_wb.py
种子 2026112611—14，三种构型共用（同一个种子的 Q、O8、X8 成一个区组），与原登记相同。
X8 的负向词把 extra rotor 换成 extra arm：事先登记的偏离（每处臂端的第二副桨是任务要的部件）。
第二段（关联斜视）的模板留在 manifest.json 的 stage2_template 里，第一段出图后按统一的负向词重编。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112611, 2026112612, 2026112613, 2026112614]
CONFIGS = {"Q": ("四旋参照", None), "O8": ("平面八旋", None), "X8": ("共轴 X8", ("extra rotor", "extra arm"))}


def main():
    old = json.loads((HERE / "manifest.json").read_bytes())
    recs = {c: wbgraph.load(HERE / "captures", f"H5-{c}") for c in CONFIGS}
    q = recs["Q"]["prompt"].split("\n")
    for c in ("O8", "X8"):
        other = recs[c]["prompt"].split("\n")
        changed = [i for i, (a, b) in enumerate(zip(q, other)) if a != b]
        assert len(q) == len(other), c
        print(f"{c} 与四旋参照不同的句子：{len(changed)} 句（第 {', '.join(str(i + 1) for i in changed)} 行）")
    (HERE / "requests").mkdir(exist_ok=True)
    for f in (HERE / "requests").glob("*.json"):
        f.unlink()
    rows = []
    for c, (label, swap) in CONFIGS.items():
        for i, seed in enumerate(SEEDS, 1):
            rid = f"H5-{c}-r{i}"
            raw = wbgraph.stamp(recs[c], rid, seed, negative_swap=swap)
            (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
            rows.append({"order": 1, "id": rid, "config": c, "config_note": label, "seed": seed, "state": recs[c]["name"],
                         "input_images": [recs[c]["guide"]["file"]], "prompt_sha256": recs[c]["prompt_sha256"], "request_sha256": wbgraph.sha(raw),
                         **({"negative_swap": list(swap)} if swap else {})})
    for f in (HERE / "inputs").glob("*.png"):
        f.unlink()
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    wbgraph.register_guides([recs["O8"]], "工作台布局条件图：平面八旋、对角轴距 250 mm（H5）")
    wbgraph.register_guides([recs["Q"], recs["X8"]], "工作台布局条件图：真 X、W/L 1.00、对角轴距 250 mm（F6、环境核对）")
    manifest = {"batch": "H5 八旋一轮与共轴 X8：第一段顶视（工作台流程）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "states": {c: {"state": r["name"], "values": r["values"], "prompt_sha256": r["prompt_sha256"]} for c, r in recs.items()},
                "negative_prompt": recs["Q"]["negative_prompt"], "requests": rows, "inputs": inputs,
                "stage2_template": old.get("stage2_template"), "stage2_note": "第二段的模板是 11-26 早先登记的原文；负向词要在第一段出图后按统一的那一份重编，编好再过出图前检查。"}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
