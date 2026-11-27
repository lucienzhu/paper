"""造型选项开发第四小批 6 张：机鼻下挂相机（S4）再换两种写法（见 README）。出图前写定，2026-11-27。

基准是工作台 4.7.0 的 S4 请求，种子同前（2026112861—63）。只换“相机安装”那一句，别的句子不动。

运行：python3 -B experiments/20261127-shape-options-dev/build_round4.py   （仓库根目录）
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
from build_round3 import OLD_MOUNT, SEEDS  # noqa: E402

VARIANTS = {
    "S4e": ("A small gimbal pod hangs underneath the front of the fuselage and juts out ahead of the nose as a separate part. Seen from directly above, the top of the pod is visible as a small rounded block, "
            "clearly distinct from the shell and about one third as wide as the nose, protruding just beyond the nose's front edge, low and tight against it, with no neck, stalk or post. "
            "The top of the pod is a plain smooth cap; its optics face forward and are hidden in this view."),
    "S4f": ("The gimbal camera hangs underneath the front of the fuselage. Seen from directly above, only the top edge of a small camera housing peeks out just ahead of the nose; the top of the housing is a plain closed cap. "
            "The camera looks straight forward toward the top edge of the image and sits low and tight against the nose, with no neck, stalk or post."),
}


def main():
    rec = wbgraph.load(ROOT / "experiments/20261127-integrated-check/captures", "IC-S4")
    assert rec["prompt"].count(OLD_MOUNT) == 1
    out = HERE / "round4"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for n, seed in enumerate(SEEDS, 1):
        for v, sentence in VARIANTS.items():
            assert "lens" not in sentence.lower()
            text = rec["prompt"].replace(OLD_MOUNT, sentence)
            rid = f"SD-{v}-s{n}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (out / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": n, "id": rid, "variant": v, "seed": seed, "input_images": [rec["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([rec], out / "inputs")
    manifest = {"batch": "造型选项开发第四小批（机鼻下挂相机两种写法 × 3 个种子）", "base_state": "IC-S4", "workbench": rec["workbench"],
                "sentences": {"mount_old": OLD_MOUNT, **VARIANTS}, "requests": rows, "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
