"""条件图颜色残留的开发小批 12 张：同一状态、同一组种子，比三种做法（见 README）。出图前写定，2026-11-26。

运行：python3 -B experiments/20261126-guide-colour-dev/build.py   （仓库根目录）
"""
import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
sys.path.insert(0, str(ROOT / "experiments/gpu-remote"))
import pngread  # noqa: E402
import wbgraph  # noqa: E402

SEEDS = [2026112801, 2026112802, 2026112803, 2026112804]
OLD = "red dots mark motor centres, blue lines mark frame links"
NEW = "dots mark motor centres, lines mark frame links"


def neutral(png):
    """点改白、线改灰，位置不动：红色分量占优的像素按红的强度变白，蓝色分量占优的按蓝的强度变灰（亮度六成）。"""
    w, h, px = pngread.rgb(png)
    out = bytearray(len(px))
    for i in range(0, len(px), 3):
        r, g, b = px[i], px[i + 1], px[i + 2]
        v = r if (r > b and r > g) else int(round(b * 0.6)) if b > r else max(r, g, b)
        out[i] = out[i + 1] = out[i + 2] = v
    return pngread.encode_rgb(w, h, bytes(out))


def main():
    rec = wbgraph.load(ROOT / "experiments/20261126-f6-shape-levels/captures", "F6-S0")
    assert rec["prompt"].count(OLD) == 1
    guide = rec["_guide_path"].read_bytes()
    grey = neutral(guide)
    grey_name = "wbguide-neutral-" + wbgraph.sha(grey)[:12] + ".png"
    (HERE / "inputs").mkdir(exist_ok=True)
    (HERE / "inputs" / rec["guide"]["file"]).write_bytes(guide)
    (HERE / "inputs" / grey_name).write_bytes(grey)
    approved = json.loads(wbgraph.APPROVED.read_text(encoding="utf-8"))
    if grey_name not in approved["guides"]:
        approved["guides"][grey_name] = {"sha256": wbgraph.sha(grey), "role": "开发用：工作台布局条件图（真 X、250 mm）换成中性色，点白线灰，位置不动（条件图颜色残留开发小批）",
                                         "nose_at": "upper edge", "source": "experiments/20261126-guide-colour-dev/build.py 由 " + rec["guide"]["file"] + " 换色"}
        wbgraph.APPROVED.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    variants = {"V0": (rec["prompt"], rec["guide"]["file"]), "V1": (rec["prompt"].replace(OLD, NEW), rec["guide"]["file"]),
                "V2": (rec["prompt"].replace(OLD, NEW), grey_name)}
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for s, seed in enumerate(SEEDS, 1):
        for v, (text, image) in variants.items():
            rid = f"GC-{v}-s{s}"
            g = copy.deepcopy(rec["graph"])
            g["4"]["inputs"]["prompt"] = text
            g["15"]["inputs"]["image"] = image
            g["10"]["inputs"]["seed"] = seed
            g["12"]["inputs"]["filename_prefix"] = rid
            raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
            (HERE / "requests" / f"{s:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": s, "id": rid, "variant": v, "seed": seed, "input_images": [image], "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    manifest = {"batch": "条件图颜色残留：开发小批（三种做法 × 4 个种子）", "base_state": "F6-S0", "workbench": rec["workbench"], "sentence": {"old": OLD, "new": NEW},
                "requests": rows, "inputs": [{"input": rec["guide"]["file"], "sha256": rec["guide"]["sha256"]}, {"input": grey_name, "sha256": wbgraph.sha(grey)}]}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求；中性色条件图 {grey_name}")


if __name__ == "__main__":
    main()
