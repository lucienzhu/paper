"""F6 造型档位确认批：工作台 4.7.0 流程下出 48 张（S0—S5 每档 8 张），出图前重新登记（2026-11-27）。

运行（仓库根目录）：
  node experiments/workbench-graph/capture.mjs experiments/20261127-f6-shape-levels/states.json experiments/20261127-f6-shape-levels/captures
  python3 -B experiments/20261127-f6-shape-levels/build.py
文字、条件图、执行图和负向词都出自工作台（captures/ 是 capture.mjs 从工作台取出的原样记录）；这里只盖种子和请求号。
种子是新的（2026112901 起）：每档 8 个连续的号，各档之间留空，档与档不共用；与 11-26 登记的那一批、与夜里各开发小批都不重。
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

LEVELS = {  # 档位：改的是哪一项、第一个种子
    "S0": ("基准：流线舱、无缝臂根、内嵌机鼻、单盖、不设独立起落架", 2026112901),
    "S1": ("机身轮廓改为方正机壳", 2026112913),
    "S2": ("臂根改为外露承座", 2026112925),
    "S3": ("臂根改为折叠铰接", 2026112937),
    "S4": ("相机改为机鼻下挂", 2026112949),
    "S5": ("顶盖改为多块", 2026112961),
}
PER_LEVEL = 8


def main():
    """python3 build.py            写 S0—S3、S5 五档（第一部分，order 1）
    python3 build.py S4         写 S4 一档（第二部分，order 2；S4 的记录取自 captures-s4/，见 README 第三节）"""
    part2 = sys.argv[1:] == ["S4"]
    wanted = ["S4"] if part2 else ["S0", "S1", "S2", "S3", "S5"]
    recs = {lvl: wbgraph.load(HERE / ("captures-s4" if lvl == "S4" and part2 else "captures"), f"F6-{lvl}") for lvl in set(wanted) | {"S0"}}
    base = recs["S0"]["prompt"].split("\n")
    (HERE / "requests").mkdir(exist_ok=True)
    mpath = HERE / "manifest.json"
    kept = [r for r in json.loads(mpath.read_bytes())["requests"] if r["level"] not in wanted] if mpath.exists() else []
    rows, seeds = [], {r["seed"] for r in kept}
    for lvl in wanted:
        what, first = LEVELS[lvl]
        rec = recs[lvl]
        changed = [i for i, (a, b) in enumerate(zip(base, rec["prompt"].split("\n"))) if a != b]
        assert len(base) == len(rec["prompt"].split("\n")) and len(changed) == (0 if lvl == "S0" else 1), f"{lvl} 与基准不是只差一句"
        assert rec["negative_prompt"] == recs["S0"]["negative_prompt"] and rec["guide"]["sha256"] == recs["S0"]["guide"]["sha256"], f"{lvl} 的负向词或条件图与基准不同"
        order = 2 if lvl == "S4" else 1
        for i in range(PER_LEVEL):
            rid, seed = f"F6-{lvl}-r{i + 1:02d}", first + i
            assert seed not in seeds
            seeds.add(seed)
            raw = wbgraph.stamp(rec, rid, seed)
            (HERE / "requests" / f"{order:02d}-{rid}.json").write_bytes(raw)
            rows.append({"order": order, "id": rid, "level": lvl, "level_note": what, "seed": seed, "state": rec["name"], "workbench_version": rec["workbench"]["version"],
                         "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(recs.values(), HERE / "inputs")
    wbgraph.register_guides(recs.values(), "工作台 4.7.0 的布局条件图：真 X、W/L 1.00、对角轴距 250 mm，带表示桨的直杆（F6 确认批）")
    rows = sorted(kept + rows, key=lambda r: (r["order"], r["id"]))
    manifest = {"batch": "F6 造型档位确认批（S0—S5 每档 8 张，2026-11-27 重新登记；S0—S3、S5 先出，S4 后出）",
                "workbench": {lvl: recs[lvl]["workbench"] for lvl in sorted(recs)},
                "states": {**(json.loads(mpath.read_bytes()).get("states", {}) if mpath.exists() else {}),
                           **{lvl: {"state": r["name"], "values": r["values"], "prompt_sha256": r["prompt_sha256"]} for lvl, r in recs.items() if lvl in wanted}},
                "negative_prompt": recs["S0"]["negative_prompt"], "requests": rows, "inputs": inputs}
    mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(wanted) * PER_LEVEL} 份请求（{'、'.join(wanted)}），清单共 {len(rows)} 份，{len(inputs)} 张条件图")


if __name__ == "__main__":
    main()
