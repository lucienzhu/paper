"""构型开发检查第三小批 10 张：八旋加“机身就是毂”一句；共轴 X8 两条路并排比（见 README）。出图前写定，2026-11-27。

  O8c  工作台 4.7.2 的八旋请求（round2/captures），布局句后面加一句；种子 2026112871—74
  X8a  工作台 4.7.0/4.7.1 的 X8 请求（captures，原来的桨句）；种子 73、74（71、72 第一小批已经出过，合起来看 4 个种子）
  X8c  同 X8a，但条件图每处臂端画两根交叉的直杆（一横一竖），桨句和读法句写明顶视里是两副直桨交叉；种子 71—74
运行：python3 -B experiments/20261127-config-dev/build_round3.py   （仓库根目录）
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

SEEDS = {1: 2026112871, 2: 2026112872, 3: 2026112873, 4: 2026112874}
HUB = "The fuselage is the hub of the aircraft: all eight arms attach directly to its sides, and its nose, which carries the camera, points to the top edge of the image."
OLD_PROP = ("Each motor carries one stationary two-blade propeller, 5-inch (127 mm) diameter. The two blades of each propeller are identical in length and width and point in exactly opposite directions from the hub, "
            "forming one straight blade 180 degrees across, never a V shape; each propeller rests at its own natural angle.")
CROSS_PROP = ("Each arm end carries two stationary two-blade propellers stacked on one vertical axis, each 5-inch (127 mm) in diameter. The lower propeller rests at a right angle to the upper one, "
              "so from above each arm end shows two straight propellers crossed at their hubs. The two blades of each propeller are identical in length and width and point in exactly opposite directions from the hub, "
              "forming one straight blade 180 degrees across, never a V shape.")
OLD_GUIDE = ("Match the motor centres and frame links in the attached layout image: dots mark motor centres, lines from the centre mark frame links, and the straight bar across each dot marks that motor's propeller. "
             "Do not reproduce the dots, lines or bars as drawn; render real parts in their place.")
CROSS_GUIDE = ("Match the motor centres and frame links in the attached layout image: dots mark motor centres, lines from the centre mark frame links, and the two crossed straight bars at each dot mark the two stacked propellers at that arm end. "
               "Do not reproduce the dots, lines or bars as drawn; render real parts in their place.")
SWAP = ("extra rotor", "extra arm")


def crossed(png, length=304.8, width=3.0, grey=200):
    """把工作台条件图上原有的直杆抹掉（灰色像素改回黑底），每个红点处改画一横一竖两根直杆。"""
    w, h, px = pngread.rgb(png)
    out = bytearray(px)
    acc = {}
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            r, g, b = px[i], px[i + 1], px[i + 2]
            if r > 200 and g < 60 and b < 60:
                a = acc.setdefault((x >= w / 2, y >= h / 2), [0, 0, 0])
                a[0] += x; a[1] += y; a[2] += 1
            elif abs(r - g) < 14 and abs(g - b) < 14 and r > 0:
                out[i] = out[i + 1] = out[i + 2] = 0
    centres = [(a[0] / a[2], a[1] / a[2]) for a in acc.values()]
    assert len(centres) == 4, centres
    for (mx, my) in centres:
        for (tx, ty) in ((1.0, 0.0), (0.0, 1.0)):
            x0, y0, x1, y1 = mx - tx * length / 2, my - ty * length / 2, mx + tx * length / 2, my + ty * length / 2
            for y in range(int(min(y0, y1)) - 3, int(max(y0, y1)) + 4):
                for x in range(int(min(x0, x1)) - 3, int(max(x0, x1)) + 4):
                    if not (0 <= x < w and 0 <= y < h):
                        continue
                    t = max(0.0, min(1.0, ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / (length * length)))
                    if math.hypot(x - (x0 + t * (x1 - x0)), y - (y0 + t * (y1 - y0))) <= width / 2:
                        i = (y * w + x) * 3
                        if not (out[i] > 200 and out[i + 1] < 60):
                            out[i] = out[i + 1] = out[i + 2] = grey
    return pngread.encode_rgb(w, h, bytes(out))


def main():
    out = HERE / "round3"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    (out / "inputs").mkdir(exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    o8 = wbgraph.load(HERE / "round2/captures", "CD-O8")
    x8 = wbgraph.load(HERE / "captures", "CD-X8")
    lines = o8["prompt"].split("\n")
    at = next(i for i, line in enumerate(lines) if line.startswith("Eight motors in a Radial octo layout"))
    o8c = "\n".join(lines[:at + 1] + [HUB] + lines[at + 1:])
    assert x8["prompt"].count(OLD_PROP) == 1 and x8["prompt"].count(OLD_GUIDE) == 1
    x8c = x8["prompt"].replace(OLD_PROP, CROSS_PROP).replace(OLD_GUIDE, CROSS_GUIDE)
    guide = crossed(x8["_guide_path"].read_bytes())
    cross_name = "wbguide-crossbars-" + wbgraph.sha(guide)[:12] + ".png"
    (out / "inputs" / cross_name).write_bytes(guide)
    approved = json.loads(wbgraph.APPROVED.read_text(encoding="utf-8"))
    if cross_name not in approved["guides"]:
        approved["guides"][cross_name] = {"sha256": wbgraph.sha(guide), "role": "开发用：真 X、250 mm 的布局条件图，每处臂端一横一竖两根直杆（共轴 X8，构型开发检查第三小批）", "nose_at": "upper edge",
                                          "source": "experiments/20261127-config-dev/build_round3.py 由 " + x8["guide"]["file"] + " 改画"}
        wbgraph.APPROVED.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    plan = [("O8c", o8, o8c, None, None, (1, 2, 3, 4)), ("X8a", x8, x8["prompt"], None, SWAP, (3, 4)), ("X8c", x8, x8c, cross_name, SWAP, (1, 2, 3, 4))]
    rows = []
    for v, rec, text, image, swap, seeds in plan:
        for n in seeds:
            rid = f"CD3-{v}-s{n}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            if swap:
                terms = g["4"]["inputs"]["negative_prompt"].split(", ")
                assert terms.count(swap[0]) == 1
                g["4"]["inputs"]["negative_prompt"] = ", ".join(swap[1] if t == swap[0] else t for t in terms)
            if image:
                g["15"]["inputs"]["image"] = image
            g["10"]["inputs"]["seed"] = SEEDS[n]
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (out / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": n, "id": rid, "variant": v, "seed": SEEDS[n], "input_images": [image or rec["guide"]["file"]],
                         "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides([o8, x8], out / "inputs") + [{"input": cross_name, "sha256": wbgraph.sha(guide)}]
    manifest = {"batch": "构型开发检查第三小批（八旋加一句；共轴 X8 原句补两个种子、交叉直杆四个种子）",
                "sentences": {"octo_hub": HUB, "x8_cross_propeller": CROSS_PROP, "x8_cross_guide": CROSS_GUIDE},
                "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求；交叉直杆的条件图 {cross_name}")


if __name__ == "__main__":
    main()
