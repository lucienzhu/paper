"""H3 电机下方喷头的确认 4 张：取 11 月 15 日开发批 E6B-N-dev-r1 的实际请求，只换种子和保存前缀。

运行：python3 -B experiments/20261126-h3-nozzle-confirm/build.py   （仓库根目录）
种子 2026112601—04。2026-11-26 对全库请求查过，此前没用过。
"""
import copy
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DEV = ROOT / "experiments/gpu-day-20261115/afternoon-dev"
SEEDS = [2026112601, 2026112602, 2026112603, 2026112604]


def sha(b):
    return hashlib.sha256(b).hexdigest()


def main():
    dev_man = json.loads((DEV / "manifest.json").read_bytes())
    dev_rows = [r for r in dev_man["requests"] if r["id"].startswith("E6B-N-dev-")]
    src = DEV / "requests/02-E6B-N-dev-r1.json"
    raw = src.read_bytes()
    assert sha(raw) == next(r for r in dev_rows if r["id"] == "E6B-N-dev-r1")["request_sha256"], "开发批请求改过"
    base = json.loads(raw)
    dev_graphs = [json.loads((DEV / f"requests/02-{r['id']}.json").read_bytes())["prompt"] for r in dev_rows]
    strip = lambda g: {k: (v["class_type"], {kk: vv for kk, vv in v["inputs"].items() if kk not in ("seed", "filename_prefix")})
                       for k, v in g.items()}
    assert all(strip(g) == strip(base["prompt"]) for g in dev_graphs), "三张开发图的请求除种子外不一致"
    (HERE / "requests").mkdir(exist_ok=True)
    rows = []
    for i, seed in enumerate(SEEDS, 1):
        rid = f"E6B-N-confirm-r{i}"
        req = copy.deepcopy(base)
        g = req["prompt"]
        g["10"]["inputs"]["seed"] = seed
        g["12"]["inputs"]["filename_prefix"] = rid
        assert strip(g) == strip(base["prompt"])
        out = json.dumps(req, ensure_ascii=False, indent=2).encode("utf-8")
        (HERE / "requests" / f"01-{rid}.json").write_bytes(out)
        rows.append({"order": 1, "id": rid, "seed": seed, "input_images": ["hexa-points-1.00.png"],
                     "prompt_sha256": next(r for r in dev_rows if r["id"] == "E6B-N-dev-r1")["prompt_sha256"],
                     "request_sha256": sha(out), "source": str(src.relative_to(ROOT)),
                     "change": "只换种子和保存前缀"})
    inputs = [x for x in dev_man["inputs"] if x["input"] == "hexa-points-1.00.png"]
    manifest = {"batch": "H3 电机下方喷头确认", "requests": rows, "inputs": inputs,
                "dev": [{"id": r["id"], "seed": r["seed"], "request_sha256": r["request_sha256"]} for r in dev_rows]}
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求")


if __name__ == "__main__":
    main()
