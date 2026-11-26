"""合在一起的检查小批 18 张：工作台 4.7.0 的基准和五个造型档位 × 3 个新种子（见 README）。出图前写定，2026-11-27。

运行（仓库根目录；先 npm run build，再 node experiments/workbench-graph/capture.mjs experiments/20261127-integrated-check/states.json experiments/20261127-integrated-check/captures）：
python3 -B experiments/20261127-integrated-check/build.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112861, 2026112862, 2026112863]
STATES = ["S0", "S1", "S2", "S3", "S4", "S5"]


def main():
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    recs = {s: wbgraph.load(HERE / "captures", "IC-" + s) for s in STATES}
    rows = []
    for n, seed in enumerate(SEEDS, 1):
        for s in STATES:
            rid = f"IC-{s}-s{n}"
            raw = wbgraph.stamp(recs[s], rid, seed)
            (HERE / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": n, "id": rid, "state": s, "seed": seed, "input_images": [recs[s]["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(recs[s]["prompt"].encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(list(recs.values()), HERE / "inputs")
    wbgraph.register_guides(list(recs.values()), "开发用：工作台 4.7.0 的布局条件图（真 X、250 mm，带表示桨的直杆）")
    manifest = {"batch": "合在一起的检查小批（基准和五个造型档位 × 3 个新种子）", "workbench": wbgraph.workbench_of(list(recs.values())),
                "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
