"""构型开发检查第四小批 4 张：共轴 X8 用交叉直杆（第三小批的 X8c），再加“机身就是四臂汇合处”一句（见 README）。出图前写定，2026-11-27。

运行：python3 -B experiments/20261127-config-dev/build_round4.py   （仓库根目录）
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

HUB4 = "The fuselage is the hub of the aircraft: all four arms attach directly to its sides, with the point where the arms meet at the middle of the fuselage, and its nose, which carries the camera, points to the top edge of the image."


def main():
    out = HERE / "round4"
    (out / "requests").mkdir(parents=True, exist_ok=True)
    (out / "inputs").mkdir(exist_ok=True)
    for old in (out / "requests").glob("*.json"):
        old.unlink()
    rows, inputs = [], {}
    for n in (1, 2, 3, 4):
        src = json.loads((HERE / "round3/requests" / f"{n:02d}-CD3-X8c-s{n}.json").read_bytes())["prompt"]
        lines = src["4"]["inputs"]["prompt"].split("\n")
        at = next(i for i, line in enumerate(lines) if line.startswith("Eight motors in a Coaxial X8 layout"))
        text = "\n".join(lines[:at + 1] + [HUB4] + lines[at + 1:])
        rid = f"CD4-X8d-s{n}"
        src["4"]["inputs"]["prompt"] = text
        src["12"]["inputs"]["filename_prefix"] = rid
        raw = json.dumps({"prompt": src}, ensure_ascii=False, indent=2).encode("utf-8")
        (out / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
        image = src["15"]["inputs"]["image"]
        data = (HERE / "round3/inputs" / image).read_bytes()
        (out / "inputs" / image).write_bytes(data)
        inputs[image] = wbgraph.sha(data)
        rows.append({"order": n, "id": rid, "variant": "X8d", "seed": src["10"]["inputs"]["seed"], "input_images": [image],
                     "prompt_sha256": wbgraph.sha(text.encode("utf-8")), "request_sha256": wbgraph.sha(raw)})
    manifest = {"batch": "构型开发检查第四小批（共轴 X8：交叉直杆 + 机身句，4 个种子）", "sentence": HUB4, "requests": rows,
                "inputs": [{"input": k, "sha256": v} for k, v in inputs.items()]}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
