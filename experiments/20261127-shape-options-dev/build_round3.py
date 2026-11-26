"""造型选项开发第三小批 6 张：机鼻下挂相机（S4）换两种不提镜片的写法（见 README）。出图前写定，2026-11-27。

基准是工作台 4.7.0 的 S4 请求（experiments/20261127-integrated-check/captures/IC-S4.json），种子与合在一起的检查小批相同（2026112861—63），逐张对照。

运行：python3 -B experiments/20261127-shape-options-dev/build_round3.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEEDS = [2026112861, 2026112862, 2026112863]
OLD_MOUNT = ("The gimbal camera hangs underneath the front of the fuselage, as on modern foldable camera drones. Seen from directly above, only the top edge of a small camera housing peeks out just ahead of the nose; "
             "the lens faces straight forward toward the top edge of the image, so no lens glass is visible from above. The camera sits low and tight against the nose, with no neck, stalk or post.")
NEW_MOUNT = ("A small gimbal pod hangs underneath the front of the fuselage. Seen from directly above, only the smooth, featureless top of the pod shows, as a short rounded block just ahead of the nose, "
             "low and tight against it, with no neck, stalk or post; its optics face forward and are hidden in this view.")
OLD_CAMERA = "A forward-facing camera sits at the nose and looks horizontally toward the top edge of the image; no lens glass faces the viewer, and nothing camera-like appears at the tail."
NEW_CAMERA = "The camera looks horizontally forward from the nose, toward the top edge of the image, so its optics are hidden in this view; nothing camera-like appears at the tail."


def main():
    rec = wbgraph.load(ROOT / "experiments/20261127-integrated-check/captures", "IC-S4")
    assert rec["prompt"].count(OLD_MOUNT) == 1 and rec["prompt"].count(OLD_CAMERA) == 1
    variants = {"S4c": rec["prompt"].replace(OLD_MOUNT, NEW_MOUNT), "S4d": rec["prompt"].replace(OLD_MOUNT, NEW_MOUNT).replace(OLD_CAMERA, NEW_CAMERA)}
    assert "lens" not in NEW_MOUNT.lower() and "lens" not in variants["S4d"].lower()  # S4c 只换下挂那一句；S4d 全文不出现 lens
    out = HERE / "round3"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for n, seed in enumerate(SEEDS, 1):
        for v, text in variants.items():
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
    manifest = {"batch": "造型选项开发第三小批（机鼻下挂相机两种写法 × 3 个种子）", "base_state": "IC-S4", "workbench": rec["workbench"],
                "sentences": {"mount_old": OLD_MOUNT, "mount_new": NEW_MOUNT, "camera_old": OLD_CAMERA, "camera_new": NEW_CAMERA}, "requests": rows, "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
