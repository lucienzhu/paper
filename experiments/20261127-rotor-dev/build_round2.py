"""旋翼开发第二小批 8 张：直说是一体的、不能折的桨（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-rotor-dev/build_round2.py   （仓库根目录）
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
RIGID = ("Each motor carries one rigid, one-piece two-blade propeller, 5-inch (127 mm) diameter, not a folding propeller: seen from above it is a single straight bar through the hub, "
         "its two blades exactly opposite each other and equal in length.")
EXTRA = ", folding propeller, hinged propeller blades, three-blade propeller, four-blade propeller"


def main():
    rec = wbgraph.load(ROOT / "experiments/20261127-baseline-check/captures", "BASE")
    assert rec["prompt"].count(OLD) == 1
    text = rec["prompt"].replace(OLD, RIGID)
    variants = {"R3": rec["negative_prompt"], "R4": rec["negative_prompt"] + EXTRA}
    out = HERE / "round2"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for v, negative in variants.items():
            rid = f"ROT-{v}-s{s}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["4"]["inputs"]["negative_prompt"] = negative
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (out / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": s, "id": rid, "variant": v, "seed": seed, "input_images": [rec["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "negative_terms": len(negative.split(", ")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([rec], out / "inputs")
    manifest = {"batch": "旋翼开发第二小批（两种做法 × 4 个种子）", "base_state": "BASE", "workbench": rec["workbench"],
                "sentence": {"current": OLD, "rigid": RIGID}, "extra_negative_terms": EXTRA.strip(", ").split(", "), "requests": rows, "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
