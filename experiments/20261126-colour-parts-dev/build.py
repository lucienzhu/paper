"""分部件配色的开发小批 12 张：同一状态、同一组种子，只换颜色那一句（见 README）。出图前写定，2026-11-26。

运行：python3 -B experiments/20261126-colour-parts-dev/build.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112821, 2026112822, 2026112823, 2026112824]
OLD = "Main shell colour: silver grey (#c7cbd1)."
VARIANTS = {
    "K0": "Main shell colour: charcoal black (#1e293b).",
    "K1": "Body shell colour: charcoal black (#1e293b). The arms, motors and propellers are separate parts in their own colours, not the shell colour.",
    "K2": "Colours by part: body shell charcoal black (#1e293b); arms silver grey (#c7cbd1); motors neutral grey (#8a9095); propellers white (#ffffff).",
}


def main():
    rec = wbgraph.load(ROOT / "experiments/20261126-f6-shape-levels/captures", "F6-S0")
    assert rec["workbench"]["version"] == "4.5.3" and rec["prompt"].count(OLD) == 1
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for v, sentence in VARIANTS.items():
            rid = f"COL-{v}-s{s}"
            text = rec["prompt"].replace(OLD, sentence)
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (HERE / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": s, "id": rid, "variant": v, "seed": seed, "input_images": [rec["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([rec], HERE / "inputs")
    manifest = {"batch": "分部件配色：开发小批（三种写法 × 4 个种子）", "base_state": "F6-S0", "workbench": rec["workbench"],
                "sentence": {"replaced": OLD, "variants": VARIANTS}, "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
