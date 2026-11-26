"""A6 六旋比例补验 18 张：六旋点线图三档，用四旋 W/L 批（WLQ）的航拍简报，与既有六旋同种子配对（出图前登记，2026-11-26）。

运行：python3 -B experiments/20261126-a6-hexa-ratio/build.py   （仓库根目录）
- 文字取 11 月 15 日 WLQ 的实际请求（三档文字相同），只把构型名、轴位数和桨径换成六旋的；
- 点线图用既有六旋 36 张的同一组 hexa-points-0.70／1.00／1.30；
- 种子 2026112323—28，与既有六旋 HEXA3-wl*-r01—r06 逐张同种子、同点线图，三档共用同一组种子。
"""
import copy
import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DAY = ROOT / "experiments/gpu-day-20261115"
TIERS = ("0.70", "1.00", "1.30")
SEEDS = [2026112323 + i for i in range(6)]
OLD_IMAGES = "evidence/gpu-day-20261115/dual-hexa-handoff/images/hexa"
SWAPS = [
    ("Design a compact quadcopter for everyday aerial photography.",
     "Design a compact six-rotor drone for everyday aerial photography."),
    ("Match the four motor centres and arm directions in the layout exactly. Each motor carries one stationary two-blade, "
     "5-inch propeller.",
     "Match the six motor centres and arm directions in the layout exactly. Each motor carries one stationary two-blade, "
     "3.5-inch propeller."),
]


def sha(b):
    return hashlib.sha256(b).hexdigest()


def git_show(path):
    return subprocess.run(["git", "-C", str(ROOT), "show", f"HEAD:{path}"], capture_output=True, check=True).stdout


def main():
    man = json.loads((DAY / "manifest.json").read_bytes())
    rows_by_id = {r["id"]: r for r in man["requests"]}
    texts = {}
    for tier in TIERS:
        rid = f"WLQ-{tier}-r01"
        raw = (DAY / "queue" / f"05-{rid}.json").read_bytes()
        assert sha(raw) == rows_by_id[rid]["request_sha256"], f"{rid} 改过"
        texts[tier] = json.loads(raw)
    prompts = {t: r["prompt"]["4"]["inputs"]["prompt"] for t, r in texts.items()}
    negs = {t: r["prompt"]["4"]["inputs"]["negative_prompt"] for t, r in texts.items()}
    assert len(set(prompts.values())) == 1 and len(set(negs.values())) == 1, "WLQ 三档文字不同"
    base = texts["1.00"]
    text = prompts["1.00"]
    for old, new in SWAPS:
        assert text.count(old) == 1, old[:40]
        text = text.replace(old, new)
    approved = json.loads((ROOT / "experiments/approved-inputs.json").read_text(encoding="utf-8"))["guides"]
    verified = {r["id"]: r for r in json.loads(git_show("evidence/gpu-day-20261115/dual-hexa-handoff/hexa-verified.json"))["records"]}
    (HERE / "requests").mkdir(exist_ok=True)
    (HERE / "inputs").mkdir(exist_ok=True)
    rows, inputs = [], []
    for tier in TIERS:
        guide = f"hexa-points-{tier}.png"
        data = (DAY / "inputs" / guide).read_bytes()
        assert sha(data) == approved[guide]["sha256"], guide
        (HERE / "inputs" / guide).write_bytes(data)
        inputs.append({"input": guide, "sha256": sha(data)})
        for i, seed in enumerate(SEEDS, 1):
            old_id = f"HEXA3-wl{tier}-r{i:02d}"
            old_req = json.loads(next((DAY / "hexa-fix/requests").glob(f"*-{old_id}.json")).read_bytes())["prompt"]
            assert old_req["10"]["inputs"]["seed"] == seed and old_req["15"]["inputs"]["image"] == guide, old_id
            old_png = git_show(f"{OLD_IMAGES}/{old_id}.png")
            assert sha(old_png) == verified[old_id]["png_sha256"], f"{old_id} 原图与回执不符"
            rid = f"A6-HA-wl{tier}-r{i:02d}"
            req = copy.deepcopy(base)
            g = req["prompt"]
            g["4"]["inputs"]["prompt"] = text
            g["15"]["inputs"]["image"] = guide
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
            (HERE / "requests" / f"01-{rid}.json").write_bytes(raw)
            rows.append({"order": 1, "id": rid, "tier": float(tier), "seed": seed, "input_images": [guide],
                         "prompt_sha256": sha(text.encode("utf-8")), "request_sha256": sha(raw),
                         "paired_old": {"id": old_id, "png": f"{OLD_IMAGES}/{old_id}.png", "png_sha256": verified[old_id]["png_sha256"],
                                        "task": "农业植保简报"}})
    manifest = {"batch": "A6 六旋比例补验（航拍简报，与既有六旋同种子）",
                "base_request": {"path": "experiments/gpu-day-20261115/queue/05-WLQ-1.00-r01.json",
                                 "sha256": rows_by_id["WLQ-1.00-r01"]["request_sha256"]},
                "swaps": [{"from": a, "to": b} for a, b in SWAPS], "requests": rows, "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求；配对的既有六旋原图 18 张都与回执一致")


if __name__ == "__main__":
    main()
