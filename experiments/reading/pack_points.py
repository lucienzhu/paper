"""研究者一侧：把一批出图封成给不知条件的取点读者的匿名包（做法同 pack_blind.py，另把每位读者的图分成几份，一个 AI 实例做一份）。

每位读者、每一份一个目录：图换成随机图号、打乱顺序、去掉全部元数据，附 response-blank.csv、rules.txt、tool.py（point_tool.py）和 pngread.py。
读者目录里没有请求号、档位、种子和别人的读数。对照表只写在研究者目录里。

用法（仓库根目录）：
  python3 -B experiments/reading/pack_points.py --images <出图目录>[,<出图目录>…] --rules <取点规则> --readers 2 --batches 2 \
      --reader-dir <读者目录（库外）> --researcher-dir <研究者目录（库外）>
"""
import argparse
import csv
import json
import random
import secrets
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "gpu-remote"))
import pngread  # noqa: E402
from pack_blind import collect, sha  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", required=True)
    ap.add_argument("--rules", required=True)
    ap.add_argument("--readers", type=int, default=2)
    ap.add_argument("--batches", type=int, default=2)
    ap.add_argument("--reader-dir", required=True)
    ap.add_argument("--researcher-dir", required=True)
    a = ap.parse_args()
    images = collect(a.images.split(","))
    assert images, "没有找到出图"
    reader_root, researcher = Path(a.reader_dir), Path(a.researcher_dir)
    reader_root.mkdir(parents=True, exist_ok=False)
    researcher.mkdir(parents=True, exist_ok=False)
    rng = random.SystemRandom()
    cleaned, key = {}, []
    for rid, png in images.items():
        raw = png.read_bytes()
        w, h, px = pngread.rgb(raw)
        clean = pngread.encode_rgb(w, h, px)
        assert pngread.rgb(clean) == (w, h, px) and b"tEXt" not in clean and b"zTXt" not in clean and b"iTXt" not in clean, rid
        cleaned[rid] = (raw, clean)
    for n in range(1, a.readers + 1):
        order = list(cleaned)
        rng.shuffle(order)
        size = (len(order) + a.batches - 1) // a.batches
        for b in range(a.batches):
            d = reader_root / f"reader{n}" / f"batch{b + 1}"
            d.mkdir(parents=True)
            rows = []
            for rid in order[b * size:(b + 1) * size]:
                token = secrets.token_hex(6)
                raw, clean = cleaned[rid]
                (d / f"{token}.png").write_bytes(clean)
                rows.append({"image": token})
                key.append({"reader": n, "batch": b + 1, "image": token, "request": rid, "original_sha256": sha(raw), "clean_sha256": sha(clean)})
            with (d / "response-blank.csv").open("w", encoding="utf-8-sig", newline="") as f:
                wr = csv.DictWriter(f, fieldnames=["image"])
                wr.writeheader()
                wr.writerows(rows)
            (d / "rules.txt").write_bytes(Path(a.rules).read_bytes())
            shutil.copy(HERE / "point_tool.py", d / "tool.py")
            shutil.copy(HERE.parent / "gpu-remote" / "pngread.py", d / "pngread.py")
            assert not [p.name for p in d.iterdir() if any(rid in p.name for rid in cleaned)]
    with (researcher / "PRIVATE-key.csv").open("w", encoding="utf-8-sig", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(key[0]))
        wr.writeheader()
        wr.writerows(key)
    (researcher / "pack.json").write_text(json.dumps({"images": len(cleaned), "readers": a.readers, "batches": a.batches, "rules_sha256": sha(Path(a.rules).read_bytes()),
                                                       "sources": a.images.split(",")}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"封好 {len(cleaned)} 张 × {a.readers} 位读者，每位分 {a.batches} 份；读者目录 {reader_root}")


if __name__ == "__main__":
    main()
