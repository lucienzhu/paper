"""修正后的基准：检查小批 8 张（见 README）。出图前写定，2026-11-27。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-baseline-check/states.json experiments/20261127-baseline-check/captures
  python3 -B experiments/20261127-baseline-check/build.py
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112831, 2026112832, 2026112833, 2026112834]
OLD = "Colours by part: body shell silver grey (#c7cbd1); arms silver grey (#c7cbd1); propellers charcoal black (#1e293b)."
MOT = "Colours by part: body shell silver grey (#c7cbd1); arms silver grey (#c7cbd1); motor housings neutral grey (#8a9095); propellers charcoal black (#1e293b)."


def main():
    rec = wbgraph.load(HERE / "captures", "BASE")
    assert rec["workbench"]["version"] == "4.6.0" and rec["prompt"].count(OLD) == 1
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        raw = wbgraph.stamp(rec, f"BASE-s{s}", seed)
        (HERE / "requests" / f"{s:02d}-BASE-s{s}.json").write_bytes(raw)
        rows.append({"order": s, "id": f"BASE-s{s}", "group": "BASE", "seed": seed, "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
        g = copy.deepcopy(rec["graph"])
        text = rec["prompt"].replace(OLD, MOT)
        g["4"]["inputs"]["prompt"] = text
        g["10"]["inputs"]["seed"] = seed
        g["12"]["inputs"]["filename_prefix"] = f"MOT-s{s}"
        raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
        (HERE / "requests" / f"{s:02d}-MOT-s{s}.json").write_bytes(raw)
        rows.append({"order": s, "id": f"MOT-s{s}", "group": "MOT", "seed": seed, "input_images": [rec["guide"]["file"]], "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([rec], HERE / "inputs")
    manifest = {"batch": "修正后的基准：检查小批（BASE 与 MOT 各 4 张）", "workbench": rec["workbench"], "state": {"values": rec["values"], "prompt_sha256": rec["prompt_sha256"]},
                "negative_prompt": rec["negative_prompt"], "motor_sentence": {"base": OLD, "mot": MOT}, "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
