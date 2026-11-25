"""H5 八旋一轮与共轴 X8：同一航拍简报、同批四旋参照、同一组预选种子（出图前登记，2026-11-26）。

第一段（现在编）：python3 -B experiments/20261126-h5-octo-x8/build.py
  画八旋点线图 octo-points-1.00.png（与四旋 dots-250 同对角距、同画法），编 12 份顶视请求：
  四旋参照 Q、平面八旋 O8、共轴 X8 各 4 张，种子 2026112611—14 三种构型共用（同种子成区组）。
第二段（第一段出图以后编）：python3 -B experiments/20261126-h5-octo-x8/build.py stage2 --actual <第一段输出目录>
  以 Q、X8 各自的顶视原图为输入，按本文件写定的模板编 8 份关联斜视请求，种子与各自的顶视图相同。
"""
import argparse
import copy
import hashlib
import json
import math
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/gpu-remote"))
import pngread  # noqa: E402

DAY = ROOT / "experiments/gpu-day-20261115"
BASE_REQ = DAY / "queue/08-S16-S0-r01.json"           # 字典 v1.6 的 S0 基准：日常航拍四旋的标准简报
QUAD_GUIDE = "qwen-shape-dots-250-15c5ad1c924b.png"
QUAD_GUIDE_SRC = ROOT / "experiments/20261117-local-edit-v2/inputs" / QUAD_GUIDE
OCTO_GUIDE = "octo-points-1.00.png"
SEEDS = [2026112611, 2026112612, 2026112613, 2026112614]

# 点线图画法照四旋 dots-250 与六旋 hexa-points 的实测：黑底，中心到电机的蓝线宽 3 像素（#205cff），电机红点半径 10 像素（#ff0000）。
SIZE, CENTRE = 1024, 512.0
R_QUAD = 210 * math.sqrt(2)                            # dots-250 的电机中心距画面中心 296.98 像素（250 mm 对角轴距）
BLUE, RED = (32, 92, 255), (255, 0, 0)
LINE_HALF, DOT_R, SUB = 1.5, 10.0, 4
OCTO_BEARINGS = [22.5 + 45 * k for k in range(8)]     # 自机头（画面上方）顺时针，机头落在两臂之间

Q_FIRST = "Design a compact quadcopter for everyday aerial photography."
Q_LAYOUT = ("Match the four motor centres and arm directions in the layout. True X, 250 mm opposite-motor span, equal "
            "horizontal and vertical spacing. Each motor carries one stationary two-blade, 5-inch propeller.")
CONFIGS = {
    "Q": {"name": "四旋参照", "guide": QUAD_GUIDE, "swap": [], "neg": []},
    "O8": {"name": "平面八旋", "guide": OCTO_GUIDE,
           "swap": [(Q_FIRST, "Design a compact octocopter for everyday aerial photography."),
                    (Q_LAYOUT, "Match the eight motor centres and arm directions in the layout. Eight arms evenly spaced "
                               "45 degrees apart, one motor at the end of each arm, 250 mm opposite-motor span, equal "
                               "horizontal and vertical spacing. Each motor carries one stationary two-blade, 3.5-inch "
                               "propeller.")],
           "neg": []},
    "X8": {"name": "共轴 X8", "guide": QUAD_GUIDE,
           "swap": [(Q_FIRST, "Design a compact coaxial X8 octocopter for everyday aerial photography."),
                    (Q_LAYOUT, "Match the four motor positions and arm directions in the layout. True X, 250 mm "
                               "opposite-motor span, equal horizontal and vertical spacing. At the end of each arm two "
                               "motors are stacked on one vertical axis, one on top of the arm and one underneath it, and "
                               "each motor carries one stationary two-blade, 5-inch propeller: two propellers in two layers "
                               "at each arm end, eight in total. From directly above, the upper propeller hides most of the "
                               "lower one.")],
           "neg": [("extra rotor", "extra arm")]},
}

# 第二段：关联斜视。输入是同种子的顶视原图（不裁、不改），Q 与 X8 的模板只差中间一句。
OBLIQUE = ("Edit this drone image. Show the same drone from a three-quarter front view, about 30 degrees above the "
           "horizon, so that the arm ends, motors and propellers are seen from the side. {rotor} Keep the design exactly "
           "the same: the body shape and colours, the camera at the nose, the top cover, and the arms and their roots. "
           "Show the complete product on a plain light background. Omit guide marks and lettering.")
OBLIQUE_ROTOR = {
    "Q": "Each arm end carries one motor with one two-blade propeller.",
    "X8": ("Each arm end carries two motors stacked on one vertical axis, one above the arm and one below it, each with "
           "its own two-blade propeller, so each arm end shows two propellers in two layers."),
}
OBLIQUE_NEG = ("flat schematic, line drawing, collage, text, labels, logo, cropped rotor, disconnected arm, extra arm, top "
               "view, V-shaped propeller, blades at an acute angle, single-blade propeller, missing blade, unequal blades")


def sha(b):
    return hashlib.sha256(b).hexdigest()


def octo_hubs():
    return [(CENTRE + R_QUAD * math.sin(math.radians(b)), CENTRE - R_QUAD * math.cos(math.radians(b))) for b in OCTO_BEARINGS]


def seg_dist2(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    qx, qy = ax + t * dx - px, ay + t * dy - py
    return qx * qx + qy * qy


def draw_guide(hubs):
    """黑底；先画中心到各电机的蓝线，再画红点；每个像素 4×4 次采样取平均（抗锯齿）。"""
    candidates = set()
    for hx, hy in hubs:
        steps = int(math.hypot(hx - CENTRE, hy - CENTRE) * 2) + 1
        for i in range(steps + 1):
            x = CENTRE + (hx - CENTRE) * i / steps
            y = CENTRE + (hy - CENTRE) * i / steps
            for ox in range(-3, 4):
                for oy in range(-3, 4):
                    candidates.add((int(x) + ox, int(y) + oy))
        for ox in range(-12, 13):
            for oy in range(-12, 13):
                candidates.add((int(hx) + ox, int(hy) + oy))
    px = bytearray(SIZE * SIZE * 3)
    offs = [(i + 0.5) / SUB for i in range(SUB)]
    for x, y in candidates:
        acc = [0, 0, 0]
        for oy in offs:
            for ox in offs:
                sx, sy = x + ox, y + oy
                if any((sx - hx) ** 2 + (sy - hy) ** 2 <= DOT_R ** 2 for hx, hy in hubs):
                    c = RED
                elif any(seg_dist2(sx, sy, CENTRE, CENTRE, hx, hy) <= LINE_HALF ** 2 for hx, hy in hubs):
                    c = BLUE
                else:
                    continue
                acc[0] += c[0]
                acc[1] += c[1]
                acc[2] += c[2]
        n = SUB * SUB
        i = (y * SIZE + x) * 3
        px[i:i + 3] = bytes(round(v / n) for v in acc)
    return pngread.encode_rgb(SIZE, SIZE, bytes(px))


def red_centroids(png):
    w, h, px = pngread.rgb(png)
    pts = [(x, y) for y in range(h) for x in range(w)
           if px[(y * w + x) * 3] > 200 and px[(y * w + x) * 3 + 1] < 60 and px[(y * w + x) * 3 + 2] < 60]
    clusters = []
    for x, y in pts:
        for c in clusters:
            if abs(c[0][0] - x) < 30 and abs(c[0][1] - y) < 30:
                c.append((x, y))
                break
        else:
            clusters.append([(x, y)])
    return [(sum(p[0] for p in c) / len(c) + 0.5, sum(p[1] for p in c) / len(c) + 0.5) for c in clusters]


def check_guide(png, hubs):
    found = red_centroids(png)
    assert len(found) == len(hubs), f"红点数 {len(found)}"
    for hx, hy in hubs:
        assert min(math.hypot(fx - hx, fy - hy) for fx, fy in found) < 0.6, f"红点位置偏离 ({hx:.1f}, {hy:.1f})"
    xs, ys = [p[0] for p in found], [p[1] for p in found]
    ratio = (max(xs) - min(xs)) / (max(ys) - min(ys))
    assert abs(ratio - 1) < 0.005, f"横纵跨度比 {ratio:.4f}"
    return found, ratio


def stage1():
    base_raw = BASE_REQ.read_bytes()
    man = json.loads((DAY / "manifest.json").read_bytes())
    row = next(r for r in man["requests"] if r["id"] == "S16-S0-r01")
    assert sha(base_raw) == row["request_sha256"], "v1.6 基准请求改过"
    base = json.loads(base_raw)
    inp = HERE / "inputs"
    inp.mkdir(exist_ok=True)
    approved = load_approved()
    quad = QUAD_GUIDE_SRC.read_bytes()
    assert sha(quad) == approved["guides"][QUAD_GUIDE]["sha256"], "四旋点线图与白名单不符"
    (inp / QUAD_GUIDE).write_bytes(quad)
    hubs = octo_hubs()
    octo = draw_guide(hubs)
    found, ratio = check_guide(octo, hubs)
    (inp / OCTO_GUIDE).write_bytes(octo)
    approved["guides"][OCTO_GUIDE] = {"sha256": sha(octo), "role": "平面八旋 W/L 1.00 点线图（H5；与四旋 dots-250 同对角距、"
                                      "同画法，由 experiments/20261126-h5-octo-x8/build.py 画）"}
    save_approved(approved)
    quad_found = red_centroids(quad)
    (HERE / "requests").mkdir(exist_ok=True)
    rows = []
    for key, cfg in CONFIGS.items():
        for i, seed in enumerate(SEEDS, 1):
            rid = f"H5-{key}-r{i}"
            req = copy.deepcopy(base)
            g = req["prompt"]
            text = g["4"]["inputs"]["prompt"]
            for old, new in cfg["swap"]:
                assert text.count(old) == 1, (key, old[:40])
                text = text.replace(old, new)
            neg = g["4"]["inputs"]["negative_prompt"]
            for old, new in cfg["neg"]:
                assert neg.count(old) == 1, (key, old)
                neg = neg.replace(old, new)
            g["4"]["inputs"]["prompt"] = text
            g["4"]["inputs"]["negative_prompt"] = neg
            g["15"]["inputs"]["image"] = cfg["guide"]
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
            (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
            rows.append({"order": 1, "id": rid, "config": key, "seed": seed, "input_images": [cfg["guide"]],
                         "prompt_sha256": sha(text.encode("utf-8")), "request_sha256": sha(raw)})
    manifest = {
        "batch": "H5 八旋一轮与共轴 X8（第一段：顶视 12 张）",
        "base_request": {"path": str(BASE_REQ.relative_to(ROOT)), "sha256": row["request_sha256"]},
        "requests": rows,
        "inputs": [{"input": QUAD_GUIDE, "sha256": sha(quad)}, {"input": OCTO_GUIDE, "sha256": sha(octo)}],
        "guides": {
            QUAD_GUIDE: {"hubs_measured": [[round(x, 2), round(y, 2)] for x, y in quad_found]},
            OCTO_GUIDE: {"hubs_planned": [[round(x, 2), round(y, 2)] for x, y in hubs],
                         "hubs_measured": [[round(x, 2), round(y, 2)] for x, y in found],
                         "span_ratio": round(ratio, 4), "radius_px": round(R_QUAD, 2)},
        },
        "stage2_template": {"prompt": OBLIQUE, "rotor": OBLIQUE_ROTOR, "negative_prompt": OBLIQUE_NEG,
                            "rule": "输入为同种子 Q、X8 顶视原图，不裁不改；种子与顶视图相同；其余节点与第一段相同"},
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"八旋点线图：8 个红点，最大偏差 < 0.6 像素，横纵跨度比 {ratio:.4f}；写出 {len(rows)} 份顶视请求")


def stage2(actual):
    man_path = HERE / "manifest.json"
    man = json.loads(man_path.read_bytes())
    tpl = man["stage2_template"]
    assert tpl["prompt"] == OBLIQUE and tpl["rotor"] == OBLIQUE_ROTOR and tpl["negative_prompt"] == OBLIQUE_NEG, "模板与登记不符"
    journal = {json.loads(l)["id"]: json.loads(l) for l in (Path(actual) / "progress.jsonl").read_text(encoding="utf-8").splitlines()}
    inp = HERE / "inputs-stage2"
    inp.mkdir(exist_ok=True)
    base = json.loads((HERE / "requests/01-H5-Q-r1.json").read_bytes())
    rows, inputs, missing = [], [], []
    for parent in [r for r in man["requests"] if r["config"] in OBLIQUE_ROTOR]:
        pid = parent["id"]
        rec = journal.get(pid, {})
        png_path = Path(actual) / pid / f"{pid}.png"
        if rec.get("state") not in ("completed", "reconciled") or not png_path.is_file():
            missing.append(pid)  # 顶视没出图，对应的斜视位置记缺失，不补跑
            continue
        png = png_path.read_bytes()
        assert sha(png) == rec["png_sha256"], f"{pid} 原图摘要与回执不符"
        name = f"{pid}.png"
        (inp / name).write_bytes(png)
        inputs.append({"input": name, "sha256": sha(png), "parent_request": pid})
        rid = pid.replace(f"H5-{parent['config']}-", f"H5-{parent['config']}-obl-")
        req = copy.deepcopy(base)
        g = req["prompt"]
        g["4"]["inputs"]["prompt"] = OBLIQUE.format(rotor=OBLIQUE_ROTOR[parent["config"]])
        g["4"]["inputs"]["negative_prompt"] = OBLIQUE_NEG
        g["15"]["inputs"]["image"] = name
        g["10"]["inputs"]["seed"] = parent["seed"]
        g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
        (HERE / "requests" / f"02-{rid}.json").write_bytes(raw)
        rows.append({"order": 2, "id": rid, "config": parent["config"] + "-obl", "seed": parent["seed"],
                     "input_images": [name], "request_sha256": sha(raw)})
    man["requests"] = [r for r in man["requests"] if r["order"] == 1] + rows
    man["inputs"] = [x for x in man["inputs"] if "parent_request" not in x] + inputs
    man["stage2_missing"] = missing
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    approved = load_approved()
    for x in inputs:
        approved["parents"][x["input"]] = {"sha256": x["sha256"], "role": "H5 关联斜视的输入：同种子顶视原图",
                                          "decision": "按 experiments/20261126-h5-octo-x8/README.md 出图前登记的第二段规则接续"}
    save_approved(approved)
    print(f"写出 {len(rows)} 份斜视请求；顶视缺图 {missing or '无'}")


APPROVED = ROOT / "experiments/approved-inputs.json"


def load_approved():
    return json.loads(APPROVED.read_text(encoding="utf-8"))


def save_approved(data):
    """照原文件的格式写回（缩进 1、保留中文）。"""
    tail = "\n" if APPROVED.read_text(encoding="utf-8").endswith("\n") else ""
    APPROVED.write_text(json.dumps(data, ensure_ascii=False, indent=1) + tail, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", nargs="?", default="stage1", choices=["stage1", "stage2"])
    ap.add_argument("--actual")
    a = ap.parse_args()
    if a.stage == "stage1":
        stage1()
    else:
        stage2(a.actual)


if __name__ == "__main__":
    main()
