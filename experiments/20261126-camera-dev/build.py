"""相机约束的开发小批 16 张：同一状态、同一组种子，比四种做法（见 README）。出图前写定，2026-11-26。

运行：python3 -B experiments/20261126-camera-dev/build.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112811, 2026112812, 2026112813, 2026112814]
OLD = "The camera sits inside the nose, flush with the shell; from directly overhead only a thin strip of its front window shows at the very front edge of the nose."
V16 = ("The camera sits inside the nose, flush with the shell; from directly overhead only a thin dark strip of its front window shows at the very front edge of the nose. "
       "The camera faces horizontally forward.")
EXTRA = ", camera lens visible from above, upward-facing lens, camera on a neck or stalk, camera on a post"


def main():
    rec = wbgraph.load(ROOT / "experiments/20261126-f6-shape-levels/captures", "F6-S0")
    assert rec["workbench"]["version"] == "4.5.3" and rec["prompt"].count(OLD) == 1
    variants = {"C0": (rec["prompt"], rec["negative_prompt"]), "C1": (rec["prompt"], rec["negative_prompt"] + EXTRA),
                "C2": (rec["prompt"].replace(OLD, V16), rec["negative_prompt"]), "C3": (rec["prompt"].replace(OLD, V16), rec["negative_prompt"] + EXTRA)}
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for v, (text, negative) in variants.items():
            rid = f"CAM-{v}-s{s}"
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
    manifest = {"batch": "相机约束：开发小批（四种做法 × 4 个种子）", "base_state": "F6-S0", "workbench": rec["workbench"],
                "sentence": {"current": OLD, "v1.6": V16}, "extra_negative_terms": EXTRA.strip(", ").split(", "), "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
