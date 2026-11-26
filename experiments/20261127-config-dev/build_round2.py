"""构型开发检查第二小批 7 张：平面八旋 3 个种子、共轴 X8 4 个种子，请求从工作台 4.7.2 取出（见 README）。出图前写定，2026-11-27。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-config-dev/states-camera.json experiments/20261127-config-dev/round2/captures
  python3 -B experiments/20261127-config-dev/build_round2.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

PLAN = {"O8": ([2026112871, 2026112872, 2026112873], None), "X8": ([2026112871, 2026112872, 2026112873, 2026112874], ("extra rotor", "extra arm"))}


def main():
    out = HERE / "round2"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    recs = {s: wbgraph.load(out / "captures", "CD-" + s) for s in PLAN}
    rows = []
    for s, (seeds, swap) in PLAN.items():
        for n, seed in enumerate(seeds, 1):
            rid = f"CD2-{s}-s{n}"
            raw = wbgraph.stamp(recs[s], rid, seed, negative_swap=swap)
            (out / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": n, "id": rid, "state": s, "seed": seed, "input_images": [recs[s]["guide"]["file"]],
                         "prompt_sha256": recs[s]["prompt_sha256"], "request_sha256": wbgraph.sha(raw), **({"negative_swap": list(swap)} if swap else {})})
    inputs = wbgraph.copy_guides(list(recs.values()), out / "inputs")
    wbgraph.register_guides([recs["O8"]], "开发用：工作台 4.7.2 的布局条件图（平面八旋、250 mm，直杆转 35°）")
    manifest = {"batch": "构型开发检查第二小批（平面八旋 3 个种子、共轴 X8 4 个种子）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
