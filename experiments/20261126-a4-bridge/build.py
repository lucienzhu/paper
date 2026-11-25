"""A4 布局桥接开发（重新登记，出图前，2026-11-26）。

第一段（现在编）：python3 -B experiments/20261126-a4-bridge/build.py
  画条件图，编 90 份请求：三个因素（W/L、机壳宽 ÷ 对角电机距、d/D）× 三种做法 × 各档 × 3 个种子。
  两段式只编第一步（部件图通路出中间图）；闭环校准的 W/L 用 11 月 15 日 WLQ 的盲读反推输入。
两段式第二步（第一段出图后）：python3 -B experiments/20261126-a4-bridge/build.py tsb --actual <第一段输出目录>
闭环第二轮（机壳宽、d/D，读数到后）：python3 -B experiments/20261126-a4-bridge/build.py cb2 --factor BW --readings <读数.csv>
"""
import argparse
import copy
import csv
import hashlib
import io
import json
import math
import re
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import draw  # noqa: E402

DAY = ROOT / "experiments/gpu-day-20261115"
A8 = ROOT / "evidence/20261117-research-update/a8-ai/returns"
WLQ_BASE = DAY / "queue/05-WLQ-1.00-r01.json"
PATCH = "qwen_image_2.1_fun_controlnet_union_bf16.safetensors"
SEEDS = [2026112701, 2026112702, 2026112703]
D = draw.D_QUAD
WL_TIERS = [0.70, 1.15, 1.35, 1.55]          # 0.70 是范围外的档（#3 第 9 题），其余三档在真实产品范围内
WL_IN_RANGE = [1.15, 1.35, 1.55]
BW_TIERS = [0.16, 0.23, 0.30]                # 机壳宽 ÷ 对角电机距：S5 四旋 32 款的 10%、中位、90% 分位附近
DD_TIERS = [0.46, 0.56, 0.66]                # d/D：同上
HOLD_WL, HOLD_DD, BODY_LEN = 1.35, 0.50, 0.62
WL_MIN_FEASIBLE = 0.60                       # 5 英寸桨、250 mm 对角距：W/L < 0.59 时左右桨盘相交
TOL = {"WL": 0.10, "BW": 0.035, "DD": 0.05}
CONTROL_STRENGTH, CANNY = 0.7, (0.4, 0.8)

POD = "A rounded pod with a continuous curved outline."
LAYOUT = "Match the four motor centres and arm directions in the layout exactly."
PROP5 = "Each motor carries one stationary two-blade, 5-inch propeller."
EDIT_B = ("Edit this drone image. It is the layout of a compact quadcopter for everyday aerial photography, in a strict "
          "orthographic top view with the nose toward the top edge. Turn it into the finished product. Keep the four motor "
          "centres, the arm directions and the length of the propeller blades exactly as they are in the image{body}. "
          "The two blades of each propeller are identical in length and width and point in exactly opposite directions "
          "from the hub, never a V shape. No propeller guards.\n{rest}")
EDIT_B_BODY = ", and keep the width of the central body exactly as it is in the image"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def rd(path):
    return list(csv.DictReader(io.StringIO(Path(path).read_bytes().decode("utf-8-sig"))))


def wlq_response():
    """11 月 15 日 WLQ 36 张，A8 不知条件 AI 读者的四轴坐标 → 每档 W/L 中位数（留空的不计）。"""
    rekey = {r["old_token"]: r["file"] for r in rd(A8 / "rekey.csv")}
    out = {}
    for r in rd(A8 / "response-AI.csv"):
        m = re.match(r"P2-WLQ-(\d\.\d\d)-r\d\d\.png", rekey.get(r["token"], ""))
        if not m:
            continue
        try:
            xs = [float(r[k + "_x"]) for k in ("tl", "tr", "br", "bl")]
            ys = [float(r[k + "_y"]) for k in ("tl", "tr", "br", "bl")]
        except ValueError:
            continue
        out.setdefault(float(m.group(1)), []).append((max(xs) - min(xs)) / (max(ys) - min(ys)))
    return {k: statistics.median(v) for k, v in sorted(out.items())}, {k: len(v) for k, v in sorted(out.items())}


def calibrated_input(target, resp):
    """分段线性反推：落在两档读数之间就内插，落在外面就用最近一段的斜率外推；低于几何下限的截到下限。"""
    pts = sorted(resp.items())
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if y0 <= target <= y1:
            return x0 + (target - y0) * (x1 - x0) / (y1 - y0), "内插"
    (x0, y0), (x1, y1) = (pts[0], pts[1]) if target < pts[0][1] else (pts[-2], pts[-1])
    x = x0 + (target - y0) * (x1 - x0) / (y1 - y0)
    if x < WL_MIN_FEASIBLE:
        return WL_MIN_FEASIBLE, f"外推得 {x:.3f}，低于几何下限，截到 {WL_MIN_FEASIBLE}"
    return x, "外推"


def base_request():
    man = json.loads((DAY / "manifest.json").read_bytes())
    row = next(r for r in man["requests"] if r["id"] == "WLQ-1.00-r01")
    raw = WLQ_BASE.read_bytes()
    assert sha(raw) == row["request_sha256"], "WLQ 基准请求改过"
    return json.loads(raw), row["request_sha256"]


def text_variant(text, factor, method, tier):
    """各因素、各做法的文字（偏离表里逐条列出）。"""
    if factor == "DD" and method in ("TSa", "MG"):
        assert text.count(PROP5) == 1
        text = text.replace(PROP5, "Each motor carries one stationary two-blade propeller.")
    if factor == "DD" and method.startswith("CB"):
        inches = round(tier * 250 / 25.4 * 2) / 2
        text = text.replace(PROP5, f"Each motor carries one stationary two-blade, {inches:g}-inch propeller.")
        text = text.replace(LAYOUT, LAYOUT[:-1] + ", 250 mm opposite-motor span.")
    if factor == "BW" and method.startswith("CB"):
        mm = round(tier * 250)
        assert text.count(POD) == 1
        text = text.replace(POD, POD[:-1] + f"; the pod is {mm} mm wide across its middle.")
        text = text.replace(LAYOUT, LAYOUT[:-1] + ", 250 mm opposite-motor span.")
    return text


def control_graph(g, parts_name, cfg):
    """在 WLQ 图上接控制分支（照 G2d/L1-B：缩放 → Canny 0.4/0.8 → 控制补丁，强度 0.7）。"""
    g["5"] = {"class_type": "LoadImage", "inputs": {"image": parts_name}}
    g["6"] = {"class_type": "ImageScale", "inputs": {"image": ["5", 0], "upscale_method": "nearest-exact", "width": 1024,
                                                     "height": 1024, "crop": "disabled"}}
    g["7"] = {"class_type": "Canny", "inputs": {"image": ["6", 0], "low_threshold": CANNY[0], "high_threshold": CANNY[1]}}
    g["8"] = {"class_type": "ModelPatchLoader", "inputs": {"name": PATCH}}
    g["9"] = {"class_type": "QwenImageDiffsynthControlnet", "inputs": {"model": ["1", 0], "model_patch": ["8", 0],
                                                                       "vae": ["3", 0], "image": ["7", 0],
                                                                       "strength": CONTROL_STRENGTH,
                                                                       "start_percent": 0, "end_percent": 1.0}}
    g["10"]["inputs"]["model"] = ["9", 0]
    g["10"]["inputs"]["cfg"] = cfg


def guide_name(kind, **k):
    if kind == "dots":
        return f"a4-dots-wl{k['wl']:.3f}.png"
    body = f"-bw{k['bw']:.2f}" if k.get("bw") else ""
    return f"a4-parts-wl{k['wl']:.2f}-dd{k['dd']:.2f}{body}.png"


def make_guides():
    resp, counts = wlq_response()
    cal = {t: calibrated_input(t, resp) for t in WL_TIERS}
    specs = {}
    for t in WL_TIERS:
        specs[guide_name("dots", wl=t)] = ("dots", t, None, None)
        specs[guide_name("dots", wl=cal[t][0])] = ("dots", cal[t][0], None, None)
        specs[guide_name("parts", wl=t, dd=HOLD_DD)] = ("parts", t, HOLD_DD, None)
    specs[guide_name("dots", wl=HOLD_WL)] = ("dots", HOLD_WL, None, None)
    for bw in BW_TIERS:
        specs[guide_name("parts", wl=HOLD_WL, dd=HOLD_DD, bw=bw)] = ("parts", HOLD_WL, HOLD_DD, bw)
    for dd in DD_TIERS:
        specs[guide_name("parts", wl=HOLD_WL, dd=dd)] = ("parts", HOLD_WL, dd, None)
    (HERE / "inputs").mkdir(exist_ok=True)
    rows = {}
    for name, (kind, wl, dd, bw) in sorted(specs.items()):
        centres = draw.hubs(wl)
        if kind == "dots":
            png = draw.dots_guide(centres)
        else:
            body = (bw * D, BODY_LEN * D) if bw else None
            png = draw.parts_guide(centres, dd * D / 2, body=body)
        (HERE / "inputs" / name).write_bytes(png)
        xs, ys = [c[0] for c in centres], [c[1] for c in centres]
        gaps = [math.dist(a, b) - (dd * D if dd else 0) for i, a in enumerate(centres) for b in centres[i + 1:]]
        rows[name] = {"kind": kind, "wl": round(wl, 4), "dd": dd, "bw": bw, "sha256": sha(png),
                      "hubs": [[round(x, 2), round(y, 2)] for x, y in centres],
                      "span_ratio": round((max(xs) - min(xs)) / (max(ys) - min(ys)), 4),
                      "min_disc_gap_px": round(min(gaps), 1) if dd else None}
    return rows, {"wlq_blind_ai_median": {f"{k:.2f}": round(v, 4) for k, v in resp.items()},
                  "wlq_measurable": {f"{k:.2f}": n for k, n in counts.items()},
                  "inputs": {f"{t:.2f}": {"input": round(c[0], 3), "how": c[1]} for t, c in cal.items()}}


def stage1():
    base, base_sha = base_request()
    text0 = base["prompt"]["4"]["inputs"]["prompt"]
    guides, calibration = make_guides()
    cal_in = {float(k): v["input"] for k, v in calibration["inputs"].items()}
    (HERE / "requests").mkdir(exist_ok=True)
    rows = []

    def emit(factor, method, tier, seed_idx, dots=None, parts=None, cfg=3, text=None):
        rid = f"A4-{factor}-{method}-{tier:.2f}-s{seed_idx + 1}"
        req = copy.deepcopy(base)
        g = req["prompt"]
        g["4"]["inputs"]["prompt"] = text
        if dots:
            g["15"]["inputs"]["image"] = dots
        else:  # 两段式第一步：纯文字加控制分支，不接参考图（照 G2d）
            del g["15"]
            del g["4"]["inputs"]["images.image_1"]
            del g["4"]["inputs"]["vae"]
        if parts:
            control_graph(g, parts, cfg)
        g["10"]["inputs"]["cfg"] = cfg
        g["10"]["inputs"]["seed"] = SEEDS[seed_idx]
        g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
        (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
        rows.append({"order": 1, "id": rid, "factor": factor, "method": method, "tier": tier, "seed": SEEDS[seed_idx],
                     "input_images": [x for x in (parts, dots) if x], "cfg": cfg, "request_sha256": sha(raw)})

    for s in range(3):
        for t in WL_TIERS:
            parts = guide_name("parts", wl=t, dd=HOLD_DD)
            emit("WL", "TSa", t, s, parts=parts, cfg=1, text=text_variant(text0, "WL", "TSa", t))
            emit("WL", "MG", t, s, dots=guide_name("dots", wl=t), parts=parts, cfg=3, text=text_variant(text0, "WL", "MG", t))
            emit("WL", "CB", t, s, dots=guide_name("dots", wl=cal_in[t]), cfg=3, text=text_variant(text0, "WL", "CB", t))
        hold_dots = guide_name("dots", wl=cal_in[HOLD_WL])
        for bw in BW_TIERS:
            parts = guide_name("parts", wl=HOLD_WL, dd=HOLD_DD, bw=bw)
            emit("BW", "TSa", bw, s, parts=parts, cfg=1, text=text_variant(text0, "BW", "TSa", bw))
            emit("BW", "MG", bw, s, dots=guide_name("dots", wl=HOLD_WL), parts=parts, cfg=3, text=text_variant(text0, "BW", "MG", bw))
            emit("BW", "CB", bw, s, dots=hold_dots, cfg=3, text=text_variant(text0, "BW", "CB", bw))
        for dd in DD_TIERS:
            parts = guide_name("parts", wl=HOLD_WL, dd=dd)
            emit("DD", "TSa", dd, s, parts=parts, cfg=1, text=text_variant(text0, "DD", "TSa", dd))
            emit("DD", "MG", dd, s, dots=guide_name("dots", wl=HOLD_WL), parts=parts, cfg=3, text=text_variant(text0, "DD", "MG", dd))
            emit("DD", "CB", dd, s, dots=hold_dots, cfg=3, text=text_variant(text0, "DD", "CB", dd))
    approved = load_approved()
    for name, g in guides.items():
        approved["guides"][name] = {"sha256": g["sha256"], "role": f"A4 {'点线图' if g['kind'] == 'dots' else '部件图'}"
                                    f"（W/L {g['wl']}" + (f"，d/D {g['dd']}" if g["dd"] else "") +
                                    (f"，机壳宽 {g['bw']}" if g["bw"] else "") + "；experiments/20261126-a4-bridge/draw.py 画）"}
    save_approved(approved)
    rest = "\n".join(text0.split("\n")[2:])
    manifest = {
        "batch": "A4 布局桥接开发（第一段）",
        "base_request": {"path": str(WLQ_BASE.relative_to(ROOT)), "sha256": base_sha},
        "seeds": SEEDS, "tolerance": TOL, "hold": {"wl": HOLD_WL, "dd": HOLD_DD, "body_length_over_D": BODY_LEN},
        "calibration": calibration, "guides": guides,
        "requests": sorted(rows, key=lambda r: r["id"]),
        "inputs": [{"input": n, "sha256": g["sha256"]} for n, g in sorted(guides.items())],
        "tsb_template": {"prompt": EDIT_B, "body": EDIT_B_BODY, "rest": rest, "cfg": 3,
                         "rule": "输入为同号两段式第一步的原图，不裁不改；种子与第一步相同；其余与 WLQ 请求相同"},
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = {}
    for r in rows:
        counts[(r["factor"], r["method"])] = counts.get((r["factor"], r["method"]), 0) + 1
    print(f"条件图 {len(guides)} 张；第一段请求 {len(rows)} 份：{counts}")
    print("W/L 校准输入：", {k: v for k, v in calibration["inputs"].items()})


def tsb(actual):
    man_path = HERE / "manifest.json"
    man = json.loads(man_path.read_bytes())
    tpl = man["tsb_template"]
    assert tpl["prompt"] == EDIT_B and tpl["body"] == EDIT_B_BODY, "两段式第二步的模板与登记不符"
    base, _ = base_request()
    journal = {json.loads(l)["id"]: json.loads(l) for l in (Path(actual) / "progress.jsonl").read_text(encoding="utf-8").splitlines()}
    inp = HERE / "inputs-tsb"
    inp.mkdir(exist_ok=True)
    rows, inputs, missing = [], [], []
    for a in [r for r in man["requests"] if r["method"] == "TSa"]:
        rec = journal.get(a["id"], {})
        png_path = Path(actual) / a["id"] / f"{a['id']}.png"
        if rec.get("state") not in ("completed", "reconciled") or not png_path.is_file():
            missing.append(a["id"])
            continue
        png = png_path.read_bytes()
        assert sha(png) == rec["png_sha256"], a["id"]
        name = f"{a['id']}.png"
        (inp / name).write_bytes(png)
        inputs.append({"input": name, "sha256": sha(png), "parent_request": a["id"]})
        rid = a["id"].replace("-TSa-", "-TSb-")
        req = copy.deepcopy(base)
        g = req["prompt"]
        g["4"]["inputs"]["prompt"] = EDIT_B.format(body=EDIT_B_BODY if a["factor"] == "BW" else "", rest=tpl["rest"])
        g["15"]["inputs"]["image"] = name
        g["10"]["inputs"]["seed"] = a["seed"]
        g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
        (HERE / "requests" / f"02-{rid}.json").write_bytes(raw)
        rows.append({**{k: a[k] for k in ("factor", "tier", "seed")}, "order": 2, "id": rid, "method": "TSb",
                     "input_images": [name], "cfg": 3, "request_sha256": sha(raw)})
    man["requests"] = [r for r in man["requests"] if r["method"] != "TSb"] + rows
    man["inputs"] = [x for x in man["inputs"] if "parent_request" not in x] + inputs
    man["tsb_missing"] = missing
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    approved = load_approved()
    for x in inputs:
        approved["parents"][x["input"]] = {"sha256": x["sha256"], "role": "A4 两段式第二步的输入：同号第一步原图",
                                          "decision": "按 experiments/20261126-a4-bridge/README.md 出图前登记的规则接续"}
    save_approved(approved)
    print(f"写出 {len(rows)} 份两段式第二步请求；第一步缺图 {missing or '无'}")


def cb2(factor, readings):
    """闭环第二轮：读数表每行 id、reader、value（该图的机壳宽 ÷ D 或 d/D）。先对每张图取两位读者的均值，
    再取每档 3 个种子的中位数，对三档作最小二乘直线 读数 = a + b × 名义值。b < 0.25 记“不可校准”，不跑第二轮；
    否则第二轮名义值 =（目标 − a）÷ b，限在第一轮档位的 0.5—1.5 倍之间。"""
    tiers = BW_TIERS if factor == "BW" else DD_TIERS
    vals = {}
    for r in rd(readings):
        if r["id"].startswith(f"A4-{factor}-CB-") and r["value"] not in ("", "NA"):
            vals.setdefault(r["id"], []).append(float(r["value"]))
    per_tier = {}
    for rid, v in vals.items():
        tier = float(rid.split("-")[3])
        per_tier.setdefault(tier, []).append(statistics.mean(v))
    xs = [t for t in tiers if t in per_tier]
    ys = [statistics.median(per_tier[t]) for t in xs]
    if len(xs) < 2:
        print("可用的档不足两档，记不可校准")
        return
    mx, my = statistics.mean(xs), statistics.mean(ys)
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    a = my - b * mx
    record = {"factor": factor, "tiers": xs, "medians": ys, "a": a, "b": b}
    if b < 0.25:
        record["result"] = "不可校准：第一轮读数几乎不随名义值变化，不跑第二轮"
        print(json.dumps(record, ensure_ascii=False))
        (HERE / f"cb2-{factor}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return
    base, _ = base_request()
    text0 = base["prompt"]["4"]["inputs"]["prompt"]
    man = json.loads((HERE / "manifest.json").read_bytes())
    cal_in = {float(k): v["input"] for k, v in man["calibration"]["inputs"].items()}
    lo, hi = min(tiers) * 0.5, max(tiers) * 1.5
    nominal = {t: min(hi, max(lo, (t - a) / b)) for t in tiers}
    record["nominal_round2"] = nominal
    rows = []
    for s in range(3):
        for t in tiers:
            rid = f"A4-{factor}-CB2-{t:.2f}-s{s + 1}"
            req = copy.deepcopy(base)
            g = req["prompt"]
            g["4"]["inputs"]["prompt"] = text_variant(text0, factor, "CB2", nominal[t])
            g["15"]["inputs"]["image"] = guide_name("dots", wl=cal_in[HOLD_WL])
            g["10"]["inputs"]["seed"] = SEEDS[s]
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
            (HERE / "requests" / f"03-{rid}.json").write_bytes(raw)
            rows.append({"order": 3, "id": rid, "factor": factor, "method": "CB2", "tier": t, "nominal": nominal[t],
                         "seed": SEEDS[s], "input_images": [guide_name("dots", wl=cal_in[HOLD_WL])], "cfg": 3,
                         "request_sha256": sha(raw)})
    man["requests"] = [r for r in man["requests"] if not (r["method"] == "CB2" and r["factor"] == factor)] + rows
    man.setdefault("cb2", {})[factor] = record
    (HERE / "manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份闭环第二轮请求：{json.dumps(record, ensure_ascii=False)}")


APPROVED = ROOT / "experiments/approved-inputs.json"


def load_approved():
    return json.loads(APPROVED.read_text(encoding="utf-8"))


def save_approved(data):
    tail = "\n" if APPROVED.read_text(encoding="utf-8").endswith("\n") else ""
    APPROVED.write_text(json.dumps(data, ensure_ascii=False, indent=1) + tail, encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", nargs="?", default="stage1", choices=["stage1", "tsb", "cb2"])
    ap.add_argument("--actual")
    ap.add_argument("--factor", choices=["BW", "DD"])
    ap.add_argument("--readings")
    a = ap.parse_args()
    if a.stage == "stage1":
        stage1()
    elif a.stage == "tsb":
        tsb(a.actual)
    else:
        cb2(a.factor, a.readings)


if __name__ == "__main__":
    main()
