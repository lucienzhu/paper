"""旋翼开发第六小批 8 张：把桨画进条件图（直杆），配 v1.6 的桨句，放到出过错桨的那 8 个“状态 × 种子”上（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-rotor-dev/build_round6.py   （仓库根目录）
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
from build_round3 import NEW_GUIDE, OLD_GUIDE, with_bars  # noqa: E402
from build_round5 import CASES  # noqa: E402


def main():
    out = HERE / "round6"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    (out / "inputs").mkdir(exist_ok=True)
    rows, bars, guide = [], None, None
    for n, (state, directory, name, seed, earlier) in enumerate(CASES, 1):
        rec = wbgraph.load(directory, name)
        assert rec["prompt"].count(OLD) == 1 and rec["prompt"].count(OLD_GUIDE) == 1, name
        made, _ = with_bars(rec["_guide_path"].read_bytes())
        if guide is None:
            guide, bars = made, "wbguide-propbars-" + wbgraph.sha(made)[:12] + ".png"
            assert (HERE / "round3/inputs" / bars).read_bytes() == guide, "直杆条件图应与第三小批登记的是同一个文件"
        assert made == guide, "八个状态用的是同一张布局条件图"
        text = rec["prompt"].replace(OLD, V16).replace(OLD_GUIDE, NEW_GUIDE)
        rid = "ROT-R10-" + earlier.replace("SD-", "")
        g = copy.deepcopy(rec["graph"])
        g["4"]["inputs"]["prompt"] = text
        g["15"]["inputs"]["image"] = bars
        g["10"]["inputs"]["seed"] = seed
        g["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")
        target = out / "requests" / f"{n:02d}-{rid}.json"
        if not target.exists() or target.read_bytes() != raw:
            target.write_bytes(raw)
        rows.append({"order": n, "id": rid, "variant": "R10", "state": state, "seed": seed, "earlier_image_with_current_sentence": earlier,
                     "input_images": [bars], "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    (out / "inputs" / bars).write_bytes(guide)
    manifest = {"batch": "旋翼开发第六小批（条件图上画桨 + v1.6 桨句，8 个出过错桨的状态 × 种子）",
                "sentences": {"propeller": V16, "guide": NEW_GUIDE}, "requests": rows, "inputs": [{"input": bars, "sha256": wbgraph.sha(guide)}]}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求；条件图 {bars}")


if __name__ == "__main__":
    main()
