"""A5 桥接确认：把登记的状态和新种子盖到工作台取出的请求上（见 README）。出图前写定，2026-11-27。

plan.json 写明每个因素用哪种做法、每档的目标和状态、哪一组种子；这里不写文字、不写条件图，
它们出自工作台自己的编译（A4 闭环臂第二轮时从工作台 4.7.3 取出的 captures-cb2，capture.mjs 逐项核对过）。
闭环做法的请求就是工作台原样的请求，只填种子和请求号。

运行（仓库根目录）：python3 -B experiments/20261127-a5-bridge-confirm/build.py
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402


def main():
    plan = json.loads((HERE / "plan.json").read_bytes())
    (HERE / "requests").mkdir(parents=True, exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows, recs, seen_seeds = [], {}, set()
    for factor, f in plan["factors"].items():
        assert f["method"] == "CB", "这个脚本只编闭环做法（工作台原样请求）；别的做法另写"
        assert not (set(f["seeds"]) & seen_seeds) and not (set(f["seeds"]) & set(plan["development_seeds"])), "种子要与开发种子、与别的因素都分开"
        seen_seeds |= set(f["seeds"])
        for n, seed in enumerate(f["seeds"], 1):
            for tier in f["tiers"]:
                rec = recs.setdefault(tier["state"], wbgraph.load(ROOT / tier["captures"], tier["state"]))
                rid = f"A5-{factor}-{tier['target']:.2f}-r{n:02d}"
                raw = wbgraph.stamp(rec, rid, seed)
                (HERE / "requests" / f"{n:02d}-{rid}.json").write_bytes(raw)
                rows.append({"order": n, "id": rid, "factor": factor, "method": f["method"], "tier": tier["target"], "nominal": tier["nominal"], "seed": seed,
                             "state": tier["state"], "input_images": [rec["guide"]["file"]], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)})
    inputs = wbgraph.copy_guides(list(recs.values()), HERE / "inputs")
    manifest = {"batch": "A5 桥接确认（闭环做法；新种子）", "workbench": wbgraph.workbench_of(list(recs.values())), "plan": plan,
                "requests": sorted(rows, key=lambda r: (r["order"], r["id"])), "inputs": inputs}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求，{len(inputs)} 张条件图；工作台 {manifest['workbench']}")


if __name__ == "__main__":
    main()
