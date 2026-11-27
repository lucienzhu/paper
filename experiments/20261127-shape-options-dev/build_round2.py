"""造型选项开发的第二小批 6 张：S4、S5 换句子再出（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-shape-options-dev/build_round2.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112841, 2026112842, 2026112843]
SWAP = {
    "S4b": ("SD-S4", "The gimbal camera hangs underneath the front of the fuselage; from directly above only the top edge of a small camera housing peeks out just ahead of the nose, low and tight against it, with no neck, stalk or post.",
            "The gimbal camera hangs underneath the front of the fuselage, as on modern foldable camera drones. Seen from directly above, only the top edge of a small dark grey camera housing peeks out just ahead of the nose; "
            "the lens faces straight forward toward the top edge of the image, so no lens glass is visible from above. The camera sits low and tight against the nose, with no neck, stalk or post."),
    "S5b": ("SD-S5", "Three or more distinct top cover panels separated by seams.",
            "The top cover is divided into three separate panels by two transverse seams: a nose cap, a centre cover and a rear cover."),
}


def main():
    out = HERE / "round2"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows, recs = [], []
    for order, (group, (state, old_sentence, new_sentence)) in enumerate(SWAP.items(), 1):
        rec = wbgraph.load(HERE / "captures", state)
        recs.append(rec)
        assert rec["prompt"].count(old_sentence) == 1, group
        text = rec["prompt"].replace(old_sentence, new_sentence)
        for s, seed in enumerate(SEEDS, 1):
            rid = f"SD-{group}-s{s}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (out / "requests" / f"{order:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": order, "id": rid, "group": group, "seed": seed, "input_images": [rec["guide"]["file"]], "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs, out / "inputs")
    manifest = {"batch": "造型选项开发第二小批：S4、S5 换句子（各 3 个种子）", "workbench": recs[0]["workbench"],
                "sentences": {g: {"state": s, "old": o, "new": n} for g, (s, o, n) in SWAP.items()}, "requests": rows, "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
