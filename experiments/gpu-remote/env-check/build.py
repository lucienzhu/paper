"""编环境核对的 2 份请求：取 11 月 15 日 GPU 日已归档的两份请求，只改节点 12 的保存前缀（加 ENV-）。

保存前缀只决定主机上的文件名，不进入生成。每份配两张归档原图：同种子的原图（要比的）和同提示、下一个种子的原图（对照）。
运行：python3 -B experiments/gpu-remote/env-check/build.py   （仓库根目录）
"""
import csv
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DAY = ROOT / "experiments/gpu-day-20261115"
REC = DAY / "recovered-originals-102"
PICK = [("S12-S0-r05", "S12-S0-r06"), ("COMBO-pod-inside-single-r1", "COMBO-pod-inside-single-r2")]
RATIO = 0.25


def sha(b):
    return hashlib.sha256(b).hexdigest()


def png_prompt(data):
    """ComfyUI 的 SaveImage 把执行图写在 tEXt 的 prompt 块里。"""
    pos = 8
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"tEXt" and body.startswith(b"prompt\x00"):
            return json.loads(body[7:].decode("latin-1"))
        if kind == b"zTXt" and body.startswith(b"prompt\x00"):
            return json.loads(zlib.decompress(body[8:]).decode("latin-1"))
    return None


def main():
    man = json.loads((DAY / "manifest.json").read_bytes())
    rows = {r["id"]: r for r in man["requests"]}
    recovered = {r["run_id"]: r for r in csv.DictReader((REC / "manifest.csv").open(encoding="utf-8-sig"))}
    inputs = {x["input"]: x["sha256"] for x in man["inputs"]}
    out_reqs, used = [], {}
    (HERE / "requests").mkdir(exist_ok=True)
    for rid, neighbour in PICK:
        row, nrow = rows[rid], rows[neighbour]
        src = DAY / "queue" / ("%02d-%s.json" % (row["order"], rid))
        raw = src.read_bytes()
        assert sha(raw) == row["request_sha256"], rid
        assert row["prompt_sha256"] == nrow["prompt_sha256"] and row["seed"] != nrow["seed"], (rid, neighbour)
        req = json.loads(raw)
        graph = req["prompt"]
        pictures = {}
        for name in (rid, neighbour):
            rec = recovered[name]
            data = (REC / rec["file"]).read_bytes()
            assert sha(data) == rec["sha256"], name
            embedded = png_prompt(data)
            nsrc = DAY / "queue" / ("%02d-%s.json" % (rows[name]["order"], name))
            ngraph = json.loads(nsrc.read_bytes())["prompt"]
            same = embedded is not None and {k: (v["class_type"], v["inputs"]) for k, v in embedded.items()} == \
                {k: (v["class_type"], v["inputs"]) for k, v in ngraph.items()}
            assert same, f"{name} 原图里嵌的执行图与归档请求不一致"
            pictures[name] = {"path": str((REC / rec["file"]).relative_to(ROOT)), "sha256": rec["sha256"],
                              "seed": rows[name]["seed"], "embedded_prompt_matches_request": True}
        new_id = "ENV-" + rid
        graph["12"]["inputs"]["filename_prefix"] = new_id
        new_raw = json.dumps(req, ensure_ascii=False, indent=2).encode()
        back = json.loads(new_raw)["prompt"]
        back["12"]["inputs"]["filename_prefix"] = rid
        assert back == json.loads(raw)["prompt"], "除保存前缀外有别的改动"
        name = "01-%s.json" % new_id
        (HERE / "requests" / name).write_bytes(new_raw)
        for v in graph.values():
            if v["class_type"] == "LoadImage":
                used[v["inputs"]["image"]] = inputs[v["inputs"]["image"]]
        out_reqs.append({"order": 1, "id": new_id, "seed": row["seed"], "request_sha256": sha(new_raw),
                         "source": {"path": str(src.relative_to(ROOT)), "sha256": row["request_sha256"], "batch": row["batch"]},
                         "change": f"只改节点 12 的保存前缀：{rid} → {new_id}",
                         "compare": {"original": pictures[rid], "neighbour": pictures[neighbour], "rule_ratio": RATIO}})
    manifest = {
        "purpose": "每次开机先做的环境核对：按原种子重出 11 月 15 日的两张归档图，与原图比对",
        "archived_run": "11 月 15 日 GPU 日（AutoDL，RTX 4080 SUPER，ComfyUI e8665ca8，禁用自定义节点，--cache-classic）",
        "rule": ("每张重出图先与同种子原图逐像素比：完全相同记“逐像素相同”。不同时算三通道平均绝对差，"
                 f"再算同提示下相邻两个种子的两张原图之间的平均绝对差作对照：同种子的差不超过对照的 {RATIO} 倍，"
                 "记“只有数值差异”，照跑，把显卡型号和差值写进记录。超过就记“明显不同”，两张中有一张明显不同就先停，"
                 "核对主机回执（ComfyUI 版本、四个源文件、三份权重）、torch 版本和显卡型号。回执有一项不符，"
                 "修好环境再做一次环境核对，修好之前不跑任何批次。回执全部相符、只是显卡型号或 torch 不同，"
                 "记成“这台机器复现不了 11 月 15 日的像素”，照跑这次租机的各批，但这次的图只在本次各批内部比较，"
                 "不与 11 月 15 日的图合进同一个分母。这条规则 2026-11-26 在开机前写定。"),
        "requests": out_reqs,
        "inputs": [{"input": k, "sha256": v} for k, v in sorted(used.items())],
    }
    (HERE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {len(out_reqs)} 份请求和 manifest.json")


if __name__ == "__main__":
    sys.exit(main())
