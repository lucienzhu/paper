"""A4 的另外两种做法按工作台流程重新登记：单次合并 MG 30 份、两段式第一步 TS1 30 份、两段式第二步 TS2 30 份（见 README 第五节）。出图前写定，2026-11-27。

三种做法用同一组工作台请求作底（captures/，工作台 4.7.1，与闭环臂第一轮相同的 10 个状态、同一组种子 2026112701—03）：
  MG   工作台的请求原样（文字、条件图、负向词、CFG 3），另接登记的控制分支：部件图 → 缩放 → Canny 0.4/0.8 → 控制补丁，强度 0.7。
  TS1  不接参考图（工作台的纯文字执行图），文字是工作台的文字去掉讲随附条件图的两句；接同一条控制分支；CFG 1（登记的设置）。出的是中间图。
  TS2  工作台的请求，把条件图换成同一状态、同一种子的 TS1 中间图；文字第一句和读法句换成一句讲这张图是什么的话。第一步出图后才编。
部件图由这里按工作台条件图的轴心位置和比例尺画（draw.py 的画布和叶形；桨的方向与工作台条件图上的直杆相同，即与“中心到轴心”垂直）。

运行（仓库根目录）：
  python3 -B experiments/20261127-a4-bridge/build_ts_mg.py mg          写 MG 30 份和一份通路核对用的请求
  python3 -B experiments/20261127-a4-bridge/build_ts_mg.py ts1         写 TS1 30 份
  python3 -B experiments/20261127-a4-bridge/build_ts_mg.py ts2 --actual <TS1 的输出目录>   写 TS2（TS1 没出图的位置记缺失，不补）
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
sys.path.insert(0, str(ROOT / "experiments/20261126-a4-bridge"))
import draw  # noqa: E402
import pngread  # noqa: E402
import wbgraph  # noqa: E402

SEEDS = [2026112701, 2026112702, 2026112703]
PLUMB_SEED = 2026112799
STATES = [("WL", t) for t in ("1.15", "1.35", "1.55", "0.70")] + [("BW", t) for t in ("0.16", "0.23", "0.30")] + [("DD", t) for t in ("0.46", "0.56", "0.66")]
IN_RANGE = {"WL": ["1.15", "1.35", "1.55"], "BW": ["0.16", "0.23", "0.30"], "DD": ["0.46", "0.56", "0.66"]}
PATCH = "qwen_image_2.1_fun_controlnet_union_bf16.safetensors"
CONTROL_STRENGTH, CANNY = 0.7, (0.4, 0.8)
PX_PER_MM = 600 / 250                # 工作台条件图：对角电机距 250 mm 画成 600 像素
BODY_LEN_MM = 150                    # 工作台的机身包络长
ROLE_LINE = "Image 1 is a motor-axis layout guide only. Replace dots and lines with a complete industrial product and omit all visible guide marks."
GUIDE_LINE = ("Match the motor centres and frame links in the attached layout image: dots mark motor centres, lines from the centre mark frame links, and the straight bar across each dot marks that motor's propeller. "
              "Do not reproduce the dots, lines or bars as drawn; render real parts in their place.")
TS2_ROLE = ("Image 1 is a flat layout drawing of this aircraft, not a finished image. Turn it into the complete industrial product, "
            "keeping the motor centres, the arm directions, the propeller lengths and the width of the central body exactly as drawn.")


def red_centres(png):
    w, h, px = pngread.rgb(png)
    acc = {}
    for y in range(h):
        for x in range(w):
            i = (y * w + x) * 3
            if px[i] > 200 and px[i + 1] < 60 and px[i + 2] < 60:
                a = acc.setdefault((x >= w / 2, y >= h / 2), [0, 0, 0])
                a[0] += x; a[1] += y; a[2] += 1
    assert len(acc) == 4, "应当正好四个红点"
    order = [(True, True), (False, True), (False, False), (True, False)]  # 右下、左下、左上、右上（draw.py 的顺序）
    return [(acc[k][0] / acc[k][2], acc[k][1] / acc[k][2]) for k in order]


def parts_image(centres, blade_radius, body=None):
    """照 draw.parts_guide 画，只有一处不同：桨的方向取与“中心到轴心”垂直（工作台条件图上直杆的方向），不取固定的 45°。"""
    cv = draw.Canvas(draw.WHITE)
    if body:
        cv.capsule(body[0], body[1], draw.INK)
    for x, y in centres:
        dx, dy = draw.CX - x, draw.CY - y
        norm = math.hypot(dx, dy)
        reach = norm if body else draw.ARM_LEN
        cv.segment((x + dx * reach / norm, y + dy * reach / norm), (x, y), draw.ARM_HALF, draw.INK)
    s, r = blade_radius / draw.BLADE_REF, blade_radius
    blade = [(9 * s, -4 * s), (.4 * r, -9 * s), (.8 * r, -7 * s), (r, 0), (.8 * r, 7 * s), (.4 * r, 9 * s), (9 * s, 4 * s)]
    for x, y in centres:
        rx, ry = x - draw.CX, y - draw.CY
        n = math.hypot(rx, ry)
        ax, ay = -ry / n, rx / n
        for sign in (-1, 1):
            cv.polygon([(x + sign * u * ax - v * ay, y + sign * u * ay + v * ax) for u, v in blade], draw.INK)
        cv.ring((x, y), draw.RING_R, draw.RING_STROKE, draw.INK, draw.WHITE)
    return cv.render()


def control_graph(g, parts_name, cfg):
    """登记的控制分支（照 11-26 登记的 control_graph，一字不改）：缩放 → Canny → 控制补丁，强度 0.7。"""
    g["5"] = {"class_type": "LoadImage", "inputs": {"image": parts_name}}
    g["6"] = {"class_type": "ImageScale", "inputs": {"image": ["5", 0], "upscale_method": "nearest-exact", "width": 1024, "height": 1024, "crop": "disabled"}}
    g["7"] = {"class_type": "Canny", "inputs": {"image": ["6", 0], "low_threshold": CANNY[0], "high_threshold": CANNY[1]}}
    g["8"] = {"class_type": "ModelPatchLoader", "inputs": {"name": PATCH}}
    g["9"] = {"class_type": "QwenImageDiffsynthControlnet", "inputs": {"model": ["1", 0], "model_patch": ["8", 0], "vae": ["3", 0], "image": ["7", 0],
                                                                       "strength": CONTROL_STRENGTH, "start_percent": 0, "end_percent": 1.0}}
    g["10"]["inputs"]["model"] = ["9", 0]
    g["10"]["inputs"]["cfg"] = cfg


def state_parts(rec, factor):
    """这个状态的部件图：轴心取自工作台条件图上的红点，桨径和机壳宽取自工作台的参数。"""
    p = rec["parameters"]
    centres = red_centres(rec["_guide_path"].read_bytes())
    blade_radius = p["propulsion"]["prop_diameter_inch"] * 25.4 * PX_PER_MM / 2
    body = (p["fuselage"]["fuselage_dimensions_mm"]["width"] * PX_PER_MM, BODY_LEN_MM * PX_PER_MM) if factor == "BW" else None
    return parts_image(centres, blade_radius, body)


def approve(name, data, role):
    approved = json.loads(wbgraph.APPROVED.read_text(encoding="utf-8"))
    old = approved["guides"].get(name)
    if old:
        assert old["sha256"] == wbgraph.sha(data), name
        return
    approved["guides"][name] = {"sha256": wbgraph.sha(data), "role": role}
    wbgraph.APPROVED.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def text_only_graph(rec, text):
    """工作台的纯文字执行图（comfyGraph 在没有输入图时的样子）：去掉 LoadImage 和编码器上的图、VAE 输入。"""
    g = copy.deepcopy(rec["graph"])
    del g["15"]
    inp = g["4"]["inputs"]
    del inp["images.image_1"], inp["vae"]
    inp["prompt"] = text
    return g


def write(out, rows, order, rid, g, seed, extra):
    g["10"]["inputs"]["seed"] = seed
    g["12"]["inputs"]["filename_prefix"] = rid
    raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
    (out / "requests" / f"{order:02d}-{rid}.json").write_bytes(raw)
    rows.append({"order": order, "id": rid, "seed": seed, "request_sha256": wbgraph.sha(raw), **extra})


def load_states():
    return {(f, t): wbgraph.load(HERE / "captures", f"A4-{f}-{t}") for f, t in STATES}


def prepare(out):
    (out / "requests").mkdir(parents=True, exist_ok=True)
    (out / "inputs").mkdir(exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()


def parts_for(out, recs):
    names = {}
    for (f, t), rec in recs.items():
        data = state_parts(rec, f)
        name = f"a4wb-parts-{f}-{t}-{wbgraph.sha(data)[:10]}.png"
        (out / "inputs" / name).write_bytes(data)
        approve(name, data, f"A4 部件图（工作台比例尺；{f} {t}；experiments/20261127-a4-bridge/build_ts_mg.py 画）")
        names[(f, t)] = name
    return names


def mg():
    out = HERE / "mg"
    prepare(out)
    recs = load_states()
    parts = parts_for(out, recs)
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for (f, t), rec in recs.items():
            g = copy.deepcopy(rec["graph"])
            control_graph(g, parts[(f, t)], 3)
            write(out, rows, s, f"A4-{f}-MG-{t}-s{s}", g, seed, {"factor": f, "method": "MG", "tier": float(t), "in_range": t in IN_RANGE[f], "state": rec["name"],
                                                               "input_images": [rec["guide"]["file"], parts[(f, t)]], "prompt_sha256": rec["prompt_sha256"]})
    # 通路核对用的一份：控制分支在这台主机、这个 CFG 下没跑过；用登记以外的种子，不进任何分母
    rec = recs[("WL", "1.35")]
    g = copy.deepcopy(rec["graph"])
    control_graph(g, parts[("WL", "1.35")], 3)
    write(out, rows, 0, "A4-MG-plumb", g, PLUMB_SEED, {"factor": "WL", "method": "MG", "tier": 1.35, "in_range": True, "state": rec["name"], "plumbing_check": True,
                                                       "input_images": [rec["guide"]["file"], parts[("WL", "1.35")]], "prompt_sha256": rec["prompt_sha256"]})
    inputs = wbgraph.copy_guides(list(recs.values()), out / "inputs") + [{"input": n, "sha256": wbgraph.sha((out / "inputs" / n).read_bytes())} for n in sorted(set(parts.values()))]
    manifest = {"batch": "A4 单次合并 MG（工作台流程 + 登记的控制分支），10 个状态 × 3 个种子，另一份通路核对", "workbench": wbgraph.workbench_of(list(recs.values())),
                "control": {"patch": PATCH, "strength": CONTROL_STRENGTH, "canny": list(CANNY), "cfg": 3}, "seeds": SEEDS,
                "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"MG：写出 {len(rows)} 份请求（含通路核对 1 份），部件图 {len(set(parts.values()))} 张")


def ts1():
    out = HERE / "ts1"
    prepare(out)
    recs = load_states()
    parts = parts_for(out, recs)
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for (f, t), rec in recs.items():
            lines = rec["prompt"].split("\n")
            assert lines[0] == ROLE_LINE and lines.count(GUIDE_LINE) == 1, rec["name"]
            text = "\n".join(line for line in lines[1:] if line != GUIDE_LINE)
            g = text_only_graph(rec, text)
            control_graph(g, parts[(f, t)], 1)
            write(out, rows, s, f"A4-{f}-TS1-{t}-s{s}", g, seed, {"factor": f, "method": "TS", "stage": 1, "tier": float(t), "in_range": t in IN_RANGE[f], "state": rec["name"],
                                                                "input_images": [parts[(f, t)]], "prompt_sha256": wbgraph.sha(text.encode("utf-8"))})
    inputs = [{"input": n, "sha256": wbgraph.sha((out / "inputs" / n).read_bytes())} for n in sorted(set(parts.values()))]
    manifest = {"batch": "A4 两段式第一步 TS1（纯文字执行图 + 登记的控制分支，CFG 1），10 个状态 × 3 个种子", "workbench": wbgraph.workbench_of(list(recs.values())),
                "control": {"patch": PATCH, "strength": CONTROL_STRENGTH, "canny": list(CANNY), "cfg": 1}, "seeds": SEEDS,
                "removed_lines": [ROLE_LINE, GUIDE_LINE], "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"TS1：写出 {len(rows)} 份请求，部件图 {len(set(parts.values()))} 张")


def ts2(actual):
    out = HERE / "ts2"
    prepare(out)
    recs = load_states()
    rows, missing, inputs = [], [], []
    for s, seed in enumerate(SEEDS, 1):
        for (f, t), rec in recs.items():
            first = f"A4-{f}-TS1-{t}-s{s}"
            src = Path(actual) / first / f"{first}.png"
            if not src.is_file():
                missing.append(first)
                continue
            data = src.read_bytes()
            name = f"a4wb-ts1-{f}-{t}-s{s}-{wbgraph.sha(data)[:10]}.png"
            w, h, px = pngread.rgb(data)
            clean = pngread.encode_rgb(w, h, px)  # 去掉原图里嵌的执行图和提示词
            (out / "inputs" / name).write_bytes(clean)
            approved = json.loads(wbgraph.APPROVED.read_text(encoding="utf-8"))
            approved["parents"][name] = {"sha256": wbgraph.sha(clean), "role": f"A4 两段式第一步的中间图（{first}，去掉元数据；作第二步的输入）", "source_sha256": wbgraph.sha(data)}
            wbgraph.APPROVED.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            lines = rec["prompt"].split("\n")
            assert lines[0] == ROLE_LINE and lines.count(GUIDE_LINE) == 1, rec["name"]
            text = "\n".join([TS2_ROLE] + [line for line in lines[1:] if line != GUIDE_LINE])
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["15"]["inputs"]["image"] = name
            write(out, rows, s, f"A4-{f}-TS2-{t}-s{s}", g, seed, {"factor": f, "method": "TS", "stage": 2, "tier": float(t), "in_range": t in IN_RANGE[f], "state": rec["name"],
                                                                "input_images": [name], "first_stage": first, "prompt_sha256": wbgraph.sha(text.encode("utf-8"))})
            inputs.append({"input": name, "sha256": wbgraph.sha(clean)})
    manifest = {"batch": "A4 两段式第二步 TS2（工作台的请求，条件图换成第一步的中间图）", "workbench": wbgraph.workbench_of(list(recs.values())), "seeds": SEEDS,
                "role_line": TS2_ROLE, "removed_lines": [ROLE_LINE, GUIDE_LINE], "missing_first_stage": missing,
                "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"TS2：写出 {len(rows)} 份请求；第一步缺 {len(missing)} 张")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else ""
    if which == "mg":
        mg()
    elif which == "ts1":
        ts1()
    elif which == "ts2":
        ts2(sys.argv[sys.argv.index("--actual") + 1])
    else:
        print(__doc__)
