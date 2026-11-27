"""旋翼开发第四小批 8 张（探路）：全文不出现“折”字，再试三种加法（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-rotor-dev/build_round4.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
sys.path.insert(0, str(HERE))
import wbgraph  # noqa: E402
from build_round3 import NEW_GUIDE, OLD_GUIDE, with_bars  # noqa: E402

SEEDS = {1: 2026112851, 2: 2026112852}
OLD_PROP = "Each motor carries one stationary 2-blade propeller, 5-inch (127 mm) diameter. The two blades point in exactly opposite directions from the hub."
OLD_VIEW = "Strict orthographic top view, nose toward the top edge of the image, arms fully unfolded."
NEW_VIEW = "Strict orthographic top view, nose toward the top edge of the image, arms fully extended in the flight-ready state."
STRAIGHT = ("Each motor carries one rigid two-blade propeller, 5-inch (127 mm) diameter, moulded as a single straight piece: seen from above it is one straight bar through the hub, "
            "its two blades exactly opposite each other and equal in length.")
ANALOG = STRAIGHT[:-1] + ", like the propeller of a model aeroplane."


def main():
    rec = wbgraph.load(ROOT / "experiments/20261127-baseline-check/captures", "BASE")
    base = rec["prompt"]
    assert base.count(OLD_PROP) == 1 and base.count(OLD_VIEW) == 1 and base.count(OLD_GUIDE) == 1
    r6 = base.replace(OLD_VIEW, NEW_VIEW).replace(OLD_PROP, STRAIGHT)
    lines = r6.split("\n")
    at = lines.index(STRAIGHT)
    moved = lines[:at] + lines[at + 1:]
    design = next(i for i, line in enumerate(moved) if line.startswith("Design a "))
    r7 = "\n".join(moved[:design + 1] + [STRAIGHT] + moved[design + 1:])
    r8 = r6.replace(STRAIGHT, ANALOG)
    r9 = r6.replace(OLD_GUIDE, NEW_GUIDE)
    for text in (r6, r7, r8, r9):
        assert "fold" not in text.lower(), "全文不该再有“折”字"
    guide, _ = with_bars(rec["_guide_path"].read_bytes())
    bars = "wbguide-propbars-" + wbgraph.sha(guide)[:12] + ".png"
    assert (HERE / "round3/inputs" / bars).read_bytes() == guide, "直杆条件图应与第三小批的是同一个文件"
    variants = {"R6": (r6, None), "R7": (r7, None), "R8": (r8, None), "R9": (r9, bars)}
    out = HERE / "round4"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in SEEDS.items():
        for v, (text, image) in variants.items():
            rid = f"ROT-{v}-s{s}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            if image:
                g["15"]["inputs"]["image"] = image
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (out / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": s, "id": rid, "variant": v, "seed": seed, "input_images": [image or rec["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([rec], out / "inputs")
    (out / "inputs" / bars).write_bytes(guide)
    inputs.append({"input": bars, "sha256": wbgraph.sha(guide)})
    manifest = {"batch": "旋翼开发第四小批（探路：四种做法 × 2 个种子）", "base_state": "BASE", "workbench": rec["workbench"],
                "sentences": {"view": NEW_VIEW, "propeller": STRAIGHT, "propeller_with_analogy": ANALOG, "guide_with_bars": NEW_GUIDE},
                "requests": rows, "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
