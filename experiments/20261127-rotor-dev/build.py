"""旋翼开发小批 12 张：基准状态、同一组种子，比三种做法（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-rotor-dev/build.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112851, 2026112852, 2026112853, 2026112854]
OLD = "Each motor carries one stationary 2-blade propeller, 5-inch (127 mm) diameter. The two blades point in exactly opposite directions from the hub."
V16 = ("Each motor carries one stationary two-blade propeller, 5-inch (127 mm) diameter. The two blades of each propeller are identical in length and width and point in exactly opposite "
       "directions from the hub, forming one straight blade 180 degrees across, never a V shape; each propeller rests at its own natural angle.")
EXTRA = ", three-blade propeller, four-blade propeller"


def main():
    rec = wbgraph.load(ROOT / "experiments/20261127-baseline-check/captures", "BASE")
    assert rec["prompt"].count(OLD) == 1
    variants = {"R0": (rec["prompt"], rec["negative_prompt"]), "R1": (rec["prompt"].replace(OLD, V16), rec["negative_prompt"]),
                "R2": (rec["prompt"].replace(OLD, V16), rec["negative_prompt"] + EXTRA)}
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for v, (text, negative) in variants.items():
            rid = f"ROT-{v}-s{s}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["4"]["inputs"]["negative_prompt"] = negative
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (HERE / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": s, "id": rid, "variant": v, "seed": seed, "input_images": [rec["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "negative_terms": len(negative.split(", ")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([rec], HERE / "inputs")
    manifest = {"batch": "旋翼：开发小批（三种做法 × 4 个种子）", "base_state": "BASE", "workbench": rec["workbench"],
                "sentence": {"current": OLD, "v1.6": V16}, "extra_negative_terms": EXTRA.strip(", ").split(", "), "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
