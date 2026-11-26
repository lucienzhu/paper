"""H5 第一段顶视：四旋参照 4 张、平面八旋 4 张，请求从工作台 4.7.3 取出（2026-11-27 重新登记，出图前）。共轴 X8 没有过开发门，这一次不编。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-h5-octo-x8/states.json experiments/20261127-h5-octo-x8/captures
  python3 -B experiments/20261127-h5-octo-x8/build.py
种子 2026112991—94，两种构型共用（同一个种子的 Q、O8 成一个区组）；X8 以后要出时用同一组种子。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112991, 2026112992, 2026112993, 2026112994]
CONFIGS = {"Q": "四旋参照", "O8": "平面八旋"}


def main():
    recs = {c: wbgraph.load(HERE / "captures", f"H5-{c}") for c in CONFIGS}
    q, o = recs["Q"]["prompt"].split("\n"), recs["O8"]["prompt"].split("\n")
    extra = [line for line in o if line not in q]
    print(f"O8 有而四旋参照没有的句子：{len(extra)} 句")
    (HERE / "requests").mkdir(exist_ok=True)
    for f in (HERE / "requests").glob("*.json"):
        f.unlink()
    rows = []
    for c, label in CONFIGS.items():
        for i, seed in enumerate(SEEDS, 1):
            rid = f"H5-{c}-r{i}"
            raw = wbgraph.stamp(recs[c], rid, seed)
            (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
            rows.append({"order": 1, "id": rid, "config": c, "config_note": label, "seed": seed, "state": recs[c]["name"],
                         "input_images": [recs[c]["guide"]["file"]], "prompt_sha256": recs[c]["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    wbgraph.register_guides([recs["O8"]], "工作台 4.7.3 的布局条件图：平面八旋、对角轴距 250 mm，直杆转 35°（H5）")
    wbgraph.register_guides([recs["Q"]], "工作台 4.7.0 起的布局条件图：真 X、W/L 1.00、对角轴距 250 mm，带表示桨的直杆")
    manifest = {"batch": "H5 第一段顶视：四旋参照与平面八旋（工作台 4.7.3，2026-11-27 重新登记）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "states": {c: {"state": r["name"], "values": r["values"], "prompt_sha256": r["prompt_sha256"]} for c, r in recs.items()},
                "negative_prompt": recs["Q"]["negative_prompt"], "requests": rows, "inputs": inputs, "not_run": {"X8": "共轴 X8 没有过开发门（experiments/20261127-config-dev），顶视 4 张和第二段斜视 8 张这一次不出"}}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
