"""旋翼开发第三小批 4 张：把桨画进条件图（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-rotor-dev/build_round3.py   （仓库根目录）
"""
import copy
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
sys.path.insert(0, str(ROOT / "experiments/gpu-remote"))
import pngread  # noqa: E402
import wbgraph  # noqa: E402

SEEDS = [2026112851, 2026112852, 2026112853, 2026112854]
OLD_PROP = "Each motor carries one stationary 2-blade propeller, 5-inch (127 mm) diameter. The two blades point in exactly opposite directions from the hub."
RIGID = ("Each motor carries one rigid, one-piece two-blade propeller, 5-inch (127 mm) diameter, not a folding propeller: seen from above it is a single straight bar through the hub, "
         "its two blades exactly opposite each other and equal in length.")
OLD_GUIDE = "Match the motor centres and frame links in the attached layout image: dots mark motor centres, lines mark frame links. Do not reproduce the dots or lines in the result."
NEW_GUIDE = ("Match the motor centres and frame links in the attached layout image: dots mark motor centres, lines from the centre mark frame links, and the straight bar across each dot marks that motor's propeller. "
             "Do not reproduce the dots, lines or bars as drawn; render real parts in their place.")


def red_centres(w, h, px):
    """红点的中心：把红色像素按四个象限分开求质心（真 X，四个电机各在一个象限）。"""
    acc = {}
    for y in range(h):
        row = y * w * 3
        for x in range(w):
            i = row + x * 3
            if px[i] > 200 and px[i + 1] < 60 and px[i + 2] < 60:
                k = (x >= w / 2, y >= h / 2)
                a = acc.setdefault(k, [0, 0, 0])
                a[0] += x; a[1] += y; a[2] += 1
    return [(a[0] / a[2], a[1] / a[2]) for a in acc.values()]


def with_bars(png, length=305.0, width=3.0, grey=200):
    w, h, px = pngread.rgb(png)
    out = bytearray(px)
    centres = red_centres(w, h, px)
    assert len(centres) == 4, centres
    cx, cy = w / 2, h / 2
    for (mx, my) in centres:
        ax, ay = mx - cx, my - cy
        n = math.hypot(ax, ay)
        tx, ty = -ay / n, ax / n  # 与机臂垂直
        x0, y0, x1, y1 = mx - tx * length / 2, my - ty * length / 2, mx + tx * length / 2, my + ty * length / 2
        for y in range(int(min(y0, y1)) - 3, int(max(y0, y1)) + 4):
            for x in range(int(min(x0, x1)) - 3, int(max(x0, x1)) + 4):
                if not (0 <= x < w and 0 <= y < h):
                    continue
                t = max(0.0, min(1.0, ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / (length * length)))
                d = math.hypot(x - (x0 + t * (x1 - x0)), y - (y0 + t * (y1 - y0)))
                if d <= width / 2:
                    i = (y * w + x) * 3
                    if not (out[i] > 200 and out[i + 1] < 60):  # 红点留在上面
                        out[i] = out[i + 1] = out[i + 2] = grey
    return pngread.encode_rgb(w, h, bytes(out)), centres


def main():
    rec = wbgraph.load(ROOT / "experiments/20261127-baseline-check/captures", "BASE")
    assert rec["prompt"].count(OLD_PROP) == 1 and rec["prompt"].count(OLD_GUIDE) == 1
    text = rec["prompt"].replace(OLD_PROP, RIGID).replace(OLD_GUIDE, NEW_GUIDE)
    guide, centres = with_bars(rec["_guide_path"].read_bytes())
    name = "wbguide-propbars-" + wbgraph.sha(guide)[:12] + ".png"
    out = HERE / "round3"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    (out / "inputs").mkdir(exist_ok=True)
    (out / "inputs" / name).write_bytes(guide)
    approved = json.loads(wbgraph.APPROVED.read_text(encoding="utf-8"))
    if name not in approved["guides"]:
        approved["guides"][name] = {"sha256": wbgraph.sha(guide), "role": "开发用：工作台布局条件图（真 X、250 mm）上加四根表示桨的浅灰直杆（旋翼开发第三小批）", "nose_at": "upper edge",
                                    "source": "experiments/20261127-rotor-dev/build_round3.py 由 " + rec["guide"]["file"] + " 加画"}
        wbgraph.APPROVED.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        rid = f"ROT-R5-s{s}"
        g = copy.deepcopy(rec["graph"])
        g["4"]["inputs"]["prompt"] = text
        g["15"]["inputs"]["image"] = name
        g["10"]["inputs"]["seed"] = seed
        g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
        (out / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
        rows.append({"order": s, "id": rid, "variant": "R5", "seed": seed, "input_images": [name], "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    manifest = {"batch": "旋翼开发第三小批（条件图上画桨，4 个种子）", "base_state": "BASE", "workbench": rec["workbench"],
                "motor_centres_px": [[round(x, 1), round(y, 1)] for x, y in centres], "sentences": {"propeller": RIGID, "guide": NEW_GUIDE},
                "requests": rows, "inputs": [{"input": name, "sha256": wbgraph.sha(guide)}]}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求；条件图 {name}")


if __name__ == "__main__":
    main()
