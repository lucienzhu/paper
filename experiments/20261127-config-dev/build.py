"""构型开发检查小批 8 张：农业植保六旋（喷杆、喷头）、平面八旋、共轴 X8 各 2 个种子，请求从工作台 4.7.0 取出（见 README）。出图前写定，2026-11-27。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-config-dev/states-camera.json experiments/20261127-config-dev/captures
  node experiments/workbench-graph/capture.mjs experiments/20261127-config-dev/states-spraying.json experiments/20261127-config-dev/captures
  python3 -B experiments/20261127-config-dev/build.py
X8 的负向词把 extra rotor 换成 extra arm：与 H5 登记的偏离相同（每处臂端的第二副桨是任务要的部件）。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112871, 2026112872]
STATES = {"boom": None, "nozzle": None, "O8": None, "X8": ("extra rotor", "extra arm")}


def main():
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    recs = {s: wbgraph.load(HERE / "captures", "CD-" + s) for s in STATES}
    rows = []
    for n, seed in enumerate(SEEDS, 1):
        for s, swap in STATES.items():
            rid = f"CD-{s}-s{n}"
            raw = wbgraph.stamp(recs[s], rid, seed, negative_swap=swap)
            (HERE / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": n, "id": rid, "state": s, "seed": seed, "input_images": [recs[s]["guide"]["file"]],
                         "prompt_sha256": recs[s]["prompt_sha256"], "request_sha256": wbgraph.sha(raw), **({"negative_swap": list(swap)} if swap else {})})
    inputs = wbgraph.copy_guides(list(recs.values()), HERE / "inputs")
    wbgraph.register_guides([recs["boom"]], "开发用：工作台 4.7.0 的布局条件图（农业植保六旋，带表示桨的直杆）")
    wbgraph.register_guides([recs["O8"]], "开发用：工作台 4.7.0 的布局条件图（平面八旋、250 mm，带表示桨的直杆）")
    wbgraph.register_guides([recs["X8"]], "开发用：工作台 4.7.0 的布局条件图（真 X、250 mm，带表示桨的直杆）")
    manifest = {"batch": "构型开发检查小批（植保六旋两种喷洒部件、平面八旋、共轴 X8 × 2 个种子）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
