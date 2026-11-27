"""研究者一侧：把一批出图封成给不知条件读者的匿名包（A8 的做法，这里不依赖第三方库）。

每位读者一个目录：图换成随机图号、各自打乱顺序、去掉全部元数据（ComfyUI 存的原图里嵌着执行图和提示词），
附一张空白读数表和读法；读者目录里没有请求号、档位、种子和别人的读数。图号与请求号的对照只写在研究者目录里。
重存只去掉元数据，像素逐个核对不变。

用法（仓库根目录）：
  python3 -B experiments/reading/pack_blind.py --images <出图目录>[,<出图目录>…] --rules <读法文件> --columns <列名,列名,…> \
      --readers 2 --reader-dir <读者目录（库外）> --researcher-dir <研究者目录（库外）> [--extra <混进读数包的其他出图目录>…]
出图目录是 remote_runner 的输出目录：每份请求一个子目录，里面有 <请求号>.png。
"""
import argparse
import csv
import hashlib
import json
import random
import secrets
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "gpu-remote"))
import pngread  # noqa: E402


def sha(b):
    return hashlib.sha256(b).hexdigest()


def collect(dirs):
    found = {}
    for d in dirs:
        for sub in sorted(Path(d).iterdir()):
            png = sub / f"{sub.name}.png"
            if sub.is_dir() and png.is_file():
                assert sub.name not in found, f"请求号重复：{sub.name}"
                found[sub.name] = png
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", required=True, help="逗号分隔的出图目录")
    ap.add_argument("--extra", action="append", default=[], help="混进读数包、读者分不出来的其他出图目录")
    ap.add_argument("--rules", required=True)
    ap.add_argument("--columns", required=True)
    ap.add_argument("--readers", type=int, default=2)
    ap.add_argument("--reader-dir", required=True)
    ap.add_argument("--researcher-dir", required=True)
    a = ap.parse_args()
    images = collect(a.images.split(",") + a.extra)
    assert images, "没有找到出图"
    columns = [c for c in a.columns.split(",") if c]
    reader_root, researcher = Path(a.reader_dir), Path(a.researcher_dir)
    reader_root.mkdir(parents=True, exist_ok=False)
    researcher.mkdir(parents=True, exist_ok=False)
    rng = random.SystemRandom()
    key = []
    cleaned = {}
    for rid, png in images.items():
        raw = png.read_bytes()
        w, h, px = pngread.rgb(raw)
        clean = pngread.encode_rgb(w, h, px)
        w2, h2, px2 = pngread.rgb(clean)
        assert (w2, h2, px2) == (w, h, px), f"{rid} 重存后像素变了"
        assert b"tEXt" not in clean and b"zTXt" not in clean and b"iTXt" not in clean, f"{rid} 重存后还有元数据"
        cleaned[rid] = (raw, clean)
    for n in range(1, a.readers + 1):
        d = reader_root / f"reader{n}"
        d.mkdir()
        order = list(cleaned)
        rng.shuffle(order)
        blank = []
        for rid in order:
            token = secrets.token_hex(6)
            raw, clean = cleaned[rid]
            (d / f"{token}.png").write_bytes(clean)
            blank.append({"image": token, **{c: "" for c in columns}, "note": ""})
            key.append({"reader": n, "image": token, "request": rid, "original_sha256": sha(raw), "clean_sha256": sha(clean)})
        with (d / "reading-blank.csv").open("w", encoding="utf-8-sig", newline="") as f:
            wr = csv.DictWriter(f, fieldnames=["image", *columns, "note"])
            wr.writeheader()
            wr.writerows(blank)
        (d / "rules.txt").write_bytes(Path(a.rules).read_bytes())
        leaked = [p.name for p in d.iterdir() if any(rid in p.name for rid in cleaned)]
        assert not leaked, f"读者目录里出现了请求号：{leaked}"
    with (researcher / "PRIVATE-key.csv").open("w", encoding="utf-8-sig", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(key[0]))
        wr.writeheader()
        wr.writerows(key)
    (researcher / "pack.json").write_text(json.dumps({"images": len(cleaned), "readers": a.readers, "columns": columns,
                                                       "rules_sha256": sha(Path(a.rules).read_bytes()), "sources": a.images.split(",") + a.extra},
                                                      ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"封好 {len(cleaned)} 张 × {a.readers} 位读者；读者目录 {reader_root}，对照表在 {researcher / 'PRIVATE-key.csv'}")


if __name__ == "__main__":
    main()
