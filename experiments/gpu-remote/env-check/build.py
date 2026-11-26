"""编环境核对的 3 份请求（每次开机先做）。2026-11-26 重新登记：不再与 11 月 15 日的旧图比（旧路径的数据已移出，作者最新决定第 12 条）。

做法：同一份请求在这台主机上出两次，中间隔一份只换种子的请求。两次要一样；换种子的那张作对照，说明“不一样”有多大。
请求取自工作台的 F6 基准状态（experiments/20261126-f6-shape-levels/captures/F6-S0.json），种子另取，不与任何一批共用。
运行：python3 -B experiments/gpu-remote/env-check/build.py   （仓库根目录）
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "experiments/workbench-graph"))
import wbgraph  # noqa: E402

SEED, NEIGHBOUR = 2026112691, 2026112692
RATIO = 0.25
ROWS = [(1, "ENV-A-r1", SEED), (2, "ENV-N", NEIGHBOUR), (3, "ENV-A-r2", SEED)]


def main():
    rec = wbgraph.load(ROOT / "experiments/20261126-f6-shape-levels/captures", "F6-S0")
    (HERE / "requests").mkdir(exist_ok=True)
    for old in (HERE / "requests").glob("*.json"):
        old.unlink()
    rows = []
    for order, rid, seed in ROWS:
        raw = wbgraph.stamp(rec, rid, seed)
        (HERE / "requests" / f"{order:02d}-{rid}.json").write_bytes(raw)
        row = {"order": order, "id": rid, "seed": seed, "state": rec["name"], "prompt_sha256": rec["prompt_sha256"], "request_sha256": wbgraph.sha(raw)}
        if rid == "ENV-A-r2":
            row["compare"] = {"repeat_of": "ENV-A-r1", "contrast": "ENV-N", "rule_ratio": RATIO}
        rows.append(row)
    inputs = wbgraph.copy_guides([rec], HERE / "inputs")
    manifest = {
        "purpose": "每次开机先做的环境核对：同一份请求在这台主机上出两次，看两次是否一样",
        "workbench": rec["workbench"],
        "rule": ("ENV-A-r1 与 ENV-A-r2 是同一份请求（同文字、同条件图、同种子），中间隔一份只换种子的 ENV-N，免得第二次命中缓存。"
                 "两张先逐像素比：完全相同记“逐像素相同”。不同时算三通道平均绝对差，再算 ENV-A-r1 与 ENV-N 的平均绝对差作对照："
                 f"同种子的差不超过对照的 {RATIO} 倍，记“只有数值差异”，照跑，把显卡型号和差值写进记录。超过就记“明显不同”，先停："
                 "核对主机回执（ComfyUI 版本、四个源文件、权重摘要）、启动参数、torch 版本和显卡型号，修好再做一次环境核对，修好之前不跑任何批次。"
                 "这条规则 2026-11-26 在开机前写定。它核对的是这台主机按登记的执行图出图、同一请求可以重复；不与任何旧图比。"),
        "requests": rows, "inputs": inputs,
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(rows)} 份请求和 manifest.json")


if __name__ == "__main__":
    sys.exit(main())
