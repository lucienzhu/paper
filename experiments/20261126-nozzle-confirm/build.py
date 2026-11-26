"""农业植保六旋：起始状态（横向喷杆）6 张，电机下方喷头确认 4 张（任务表 H2、H3）。请求从工作台取出（2026-11-26 晚重编，出图前）。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261126-nozzle-confirm/states.json experiments/20261126-nozzle-confirm/captures
  python3 -B experiments/20261126-nozzle-confirm/build.py
喷头确认的种子 2026112601—04，与原登记相同。喷杆 6 张的种子 2026112621—26：原登记混进读数包的 6 张对照图用的是旧图，旧图已移出，
改为同一次运行里新出，种子新取（2026-11-26 对全库请求查过，没用过）。两组只差喷洒部件那一句。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

GROUPS = [("H3-nozzle", "E6B-N-confirm", [2026112601 + i for i in range(4)], "电机下方喷头（确认）"),
          ("H2-boom", "H2-boom", [2026112621 + i for i in range(6)], "横向喷杆（工作台里这个任务的起始状态；读数包里作对照）")]


def main():
    recs = {name: wbgraph.load(HERE / "captures", name) for name, *_ in GROUPS}
    a, b = (recs[n]["prompt"].split("\n") for n in ("H2-boom", "H3-nozzle"))
    changed = [i for i, (x, y) in enumerate(zip(a, b)) if x != y]
    assert len(a) == len(b) and len(changed) == 1, "两组应当只差喷洒部件那一句"
    (HERE / "requests").mkdir(exist_ok=True)
    for f in (HERE / "requests").glob("*.json"):
        f.unlink()
    rows = []
    for name, prefix, seeds, note in GROUPS:
        for i, seed in enumerate(seeds, 1):
            rid = f"{prefix}-r{i}"
            raw = wbgraph.stamp(recs[name], rid, seed)
            (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
            rows.append({"order": 1, "id": rid, "group": name, "group_note": note, "seed": seed, "state": name,
                         "input_images": [recs[name]["guide"]["file"]], "prompt_sha256": recs[name]["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    wbgraph.register_guides(recs.values(), "工作台布局条件图：平面六旋（正六边形）、对角轴距 1400 mm（农业植保，H2、H3）")
    manifest = {"batch": "农业植保六旋：横向喷杆 6 张、电机下方喷头确认 4 张（工作台流程）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "states": {n: {"values": r["values"], "prompt_sha256": r["prompt_sha256"]} for n, r in recs.items()},
                "negative_prompt": recs["H2-boom"]["negative_prompt"], "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
