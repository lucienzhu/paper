"""旋翼开发第五小批 8 张：v1.6 的桨句（R1）放到现行写法出过错桨的那 8 个“状态 × 种子”上重出（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-rotor-dev/build_round5.py   （仓库根目录）
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
from build import OLD, V16  # noqa: E402

BASE = ROOT / "experiments/20261127-baseline-check/captures"
SD = ROOT / "experiments/20261127-shape-options-dev/captures"
# （状态，取自哪一批的工作台请求，种子，那一次现行写法出的图）
CASES = [("BASE", BASE, "BASE", 2026112832, "BASE-s2"), ("S1", SD, "SD-S1", 2026112841, "SD-S1-s1"), ("S1", SD, "SD-S1", 2026112842, "SD-S1-s2"),
         ("S2", SD, "SD-S2", 2026112841, "SD-S2-s1"), ("S3", SD, "SD-S3", 2026112841, "SD-S3-s1"),
         ("S5", SD, "SD-S5", 2026112841, "SD-S5-s1"), ("S5", SD, "SD-S5", 2026112842, "SD-S5-s2"),
         # 第 8 例是加了“连浅色一起数”以后才量出来的（两片深色桨叶之外多一对浅色的），单独成一张批次单，接在前 7 张后面
         ("S2", SD, "SD-S2", 2026112842, "SD-S2-s2")]


def main():
    out = HERE / "round5"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    rows, recs = [], []
    for n, (state, directory, name, seed, earlier) in enumerate(CASES, 1):
        rec = wbgraph.load(directory, name)
        assert rec["prompt"].count(OLD) == 1, name
        recs.append(rec)
        text = rec["prompt"].replace(OLD, V16)
        rid = "ROT-R1f-" + earlier.replace("SD-", "")
        g = copy.deepcopy(rec["graph"])
        g["4"]["inputs"]["prompt"] = text
        g["10"]["inputs"]["seed"] = seed
        g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
        target = out / "requests" / f"{n:02d}-{rid}.json"
        if not target.exists() or target.read_bytes() != raw:  # 已有且相同的不重写（前 7 张可能正在出）
            target.write_bytes(raw)
        rows.append({"order": n, "id": rid, "variant": "R1", "state": state, "seed": seed, "earlier_image_with_current_sentence": earlier,
                     "input_images": [rec["guide"]["file"]], "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs, out / "inputs")
    manifest = {"batch": "旋翼开发第五小批（R1 放到现行写法出过错桨的 8 个状态 × 种子上）", "workbench": recs[0]["workbench"],
                "sentence": {"current": OLD, "v16": V16}, "requests": rows, "inputs": inputs}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
