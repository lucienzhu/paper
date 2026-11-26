"""农业植保六旋：起始状态（横向喷杆）6 张，电机下方喷头确认 4 张（任务表 H2、H3）。请求从工作台 4.7.1 取出（2026-11-27 重新登记，出图前）。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-nozzle-confirm/states.json experiments/20261127-nozzle-confirm/captures
  python3 -B experiments/20261127-nozzle-confirm/build.py
种子是新的：喷头确认 2026112971—74，喷杆 2026112981—86（11-26 那一版一张也没出，但为了与夜里的开发小批和别的确认批都不重，统一换新号段）。两组只差喷洒部件那一句。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

GROUPS = [("H3-nozzle", "E6B-N-confirm", [2026112971 + i for i in range(4)], "电机下方喷头（确认）"),
          ("H2-boom", "H2-boom", [2026112981 + i for i in range(6)], "横向喷杆（工作台里这个任务的起始状态；读数包里作对照）")]


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
    wbgraph.register_guides(recs.values(), "工作台 4.7.1 的布局条件图：平面六旋、对角轴距 1400 mm，带表示桨的直杆（农业植保确认批，H2、H3）")
    manifest = {"batch": "农业植保六旋确认批：横向喷杆 6 张、电机下方喷头 4 张（工作台 4.7.1，2026-11-27 重新登记）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "states": {n: {"values": r["values"], "prompt_sha256": r["prompt_sha256"]} for n, r in recs.items()},
                "negative_prompt": recs["H2-boom"]["negative_prompt"], "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
