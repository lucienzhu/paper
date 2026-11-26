"""F6 造型档位：在冻结的工作台流程下出 48 张（S0—S5 每档 8 张），出图前登记（2026-11-26）。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261126-f6-shape-levels/states.json experiments/20261126-f6-shape-levels/captures
  python3 -B experiments/20261126-f6-shape-levels/build.py
文字、条件图、执行图和负向词都出自工作台（captures/ 是 capture.mjs 从工作台取出的原样记录）；这里只盖种子和请求号。
种子照 11 月 15 日登记 v1.6 那 48 张时的规则：每档 8 个连续的号，各档之间留空，档与档不共用种子。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

LEVELS = {  # 档位：改的是哪一项、第一个种子
    "S0": ("基准：流线舱、无缝臂根、内嵌机鼻、单盖", 2026112001),
    "S1": ("机身轮廓改为方正机壳", 2026112013),
    "S2": ("臂根改为外露承座", 2026112025),
    "S3": ("臂根改为折叠铰接", 2026112037),
    "S4": ("相机改为机鼻下挂", 2026112049),
    "S5": ("顶盖改为多块", 2026112061),
}
PER_LEVEL = 8


def main():
    recs = {lvl: wbgraph.load(HERE / "captures", f"F6-{lvl}") for lvl in LEVELS}
    base = recs["S0"]["prompt"].split("\n")
    (HERE / "requests").mkdir(exist_ok=True)
    rows, seeds = [], set()
    for lvl, (what, first) in LEVELS.items():
        rec = recs[lvl]
        changed = [i for i, (a, b) in enumerate(zip(base, rec["prompt"].split("\n"))) if a != b]
        assert len(base) == len(rec["prompt"].split("\n")) and len(changed) == (0 if lvl == "S0" else 1), f"{lvl} 与基准不是只差一句"
        for i in range(PER_LEVEL):
            rid, seed = f"F6-{lvl}-r{i + 1:02d}", first + i
            assert seed not in seeds
            seeds.add(seed)
            raw = wbgraph.stamp(rec, rid, seed)
            (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
            rows.append({"order": 1, "id": rid, "level": lvl, "level_note": what, "seed": seed, "state": rec["name"],
                         "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    wbgraph.register_guides(recs.values(), "工作台布局条件图：真 X、W/L 1.00、对角轴距 250 mm（F6、环境核对）")
    manifest = {"batch": "F6 造型档位（工作台流程，S0—S5 每档 8 张）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "states": {lvl: {"state": r["name"], "values": r["values"], "prompt_sha256": r["prompt_sha256"]} for lvl, r in recs.items()},
                "negative_prompt": recs["S0"]["negative_prompt"], "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
