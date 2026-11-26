"""造型选项的开发小批 15 张：五个档位 × 3 个种子，按档排（出一档看一档）。出图前写定，2026-11-27。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-shape-options-dev/states.json experiments/20261127-shape-options-dev/captures
  python3 -B experiments/20261127-shape-options-dev/build.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112841, 2026112842, 2026112843]
LEVELS = ["S4", "S5", "S2", "S3", "S1"]  # 先出相机和顶盖：这两项在旧批次里读得最不稳


def main():
    base = wbgraph.load(ROOT / "experiments/20261127-baseline-check/captures", "BASE")["prompt"].split("\n")
    recs = {lvl: wbgraph.load(HERE / "captures", f"SD-{lvl}") for lvl in LEVELS}
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for order, lvl in enumerate(LEVELS, 1):
        rec = recs[lvl]
        lines = rec["prompt"].split("\n")
        assert len(lines) == len(base) and sum(a != b for a, b in zip(base, lines)) == 1, f"{lvl} 与基准不是只差一句"
        for s, seed in enumerate(SEEDS, 1):
            rid = f"SD-{lvl}-s{s}"
            raw = wbgraph.stamp(rec, rid, seed)
            (HERE / "requests" / f"{order:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": order, "id": rid, "level": lvl, "seed": seed, "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    manifest = {"batch": "造型选项：开发小批（五个档位 × 3 个种子）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "states": {lvl: {"values": r["values"], "prompt_sha256": r["prompt_sha256"]} for lvl, r in recs.items()},
                "negative_prompt": recs["S1"]["negative_prompt"], "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
