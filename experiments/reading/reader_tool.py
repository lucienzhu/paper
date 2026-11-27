"""放进 AI 读者目录的小工具（改名为 tool.py，与 pngread.py 一起拷进去）：列图、放大局部、核对读数表。只用标准库。

它只做三件事，都不替读者判断：
  python3 tool.py list                         列出读数表里的图号（按读数表的顺序）
  python3 tool.py crop <图号> <x0> <y0> <x1> <y1>   把这一块按 3 倍放大存到 views/，打印文件名；坐标是原图像素（原图 1024×1024，左上角是 0,0）
  python3 tool.py check                        核对 reading.csv：行数、图号、空格子、每一栏允许的词（allowed.json）
每一次调用都记进 log.jsonl（研究者事后核对用）。
"""
import csv
import io
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pngread  # noqa: E402


def log(entry):
    with (HERE / "log.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps({"t": time.strftime("%H:%M:%S"), **entry}, ensure_ascii=False) + "\n")


def table(name):
    return list(csv.DictReader(io.StringIO((HERE / name).read_bytes().decode("utf-8-sig"))))


def main():
    args = sys.argv[1:]
    log({"args": args})
    blank = table("reading-blank.csv")
    ids = [r["image"] for r in blank]
    if not args or args[0] == "help":
        print(__doc__)
    elif args[0] == "list":
        print("\n".join(ids))
    elif args[0] == "crop":
        token, x0, y0, x1, y1 = args[1], *(int(v) for v in args[2:6])
        assert token in ids, "没有这个图号"
        w, h, px = pngread.rgb((HERE / f"{token}.png").read_bytes())
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
        assert x1 > x0 and y1 > y0 and (x1 - x0) * (y1 - y0) <= 400 * 400, "范围不对，或大于 400×400 像素"
        k, tw, th = 3, x1 - x0, y1 - y0
        out = bytearray(tw * k * th * k * 3)
        for y in range(th):
            row = bytearray()
            for x in range(tw):
                i = ((y0 + y) * w + x0 + x) * 3
                row += px[i:i + 3] * k
            for j in range(k):
                out[(y * k + j) * tw * k * 3:(y * k + j + 1) * tw * k * 3] = row
        (HERE / "views").mkdir(exist_ok=True)
        name = f"views/{token}-{x0}-{y0}-{x1}-{y1}.png"
        (HERE / name).write_bytes(pngread.encode_rgb(tw * k, th * k, bytes(out)))
        print(name)
    elif args[0] == "check":
        allowed = json.loads((HERE / "allowed.json").read_text(encoding="utf-8"))
        rows = table("reading.csv")
        problems = []
        if [r["image"] for r in rows] != ids and sorted(r["image"] for r in rows) != sorted(ids):
            problems.append("图号与空白表不一致")
        if len(rows) != len(ids):
            problems.append(f"行数 {len(rows)}，应为 {len(ids)}")
        for r in rows:
            for col, words in allowed.items():
                v = (r.get(col) or "").strip()
                if v == "":
                    problems.append(f"{r['image']} 的 {col} 是空的")
                elif words != "number" and v not in words:
                    problems.append(f"{r['image']} 的 {col} 填了“{v}”，不在允许的词里")
                elif words == "number" and not (v == "?" or v.isdigit()):
                    problems.append(f"{r['image']} 的 {col} 应填数字或 ?")
        print("\n".join(problems[:40]) if problems else f"通过：{len(rows)} 行，没有空格子，每一栏都是允许的词")
        log({"check": len(problems)})
    else:
        print("不认识的命令；python3 tool.py help")


if __name__ == "__main__":
    main()
