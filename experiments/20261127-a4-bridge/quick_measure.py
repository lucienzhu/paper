"""A4 的程序速量（研究者知条件的检查，不进任何分母，也不是登记的读数）。

登记的读数是两位不知条件的 AI 读者取点。这里只用程序粗量一遍，边出图边看流程有没有明显跑偏：
- 电机中心：`experiments/reading/rotors.py` 找到的每副桨（深色连通块）的外接框中心。W/L ＝ 横向极差 ÷ 纵向极差；D ＝ 两条对角线的均值。
- 桨径 d：每副桨沿自己长轴的长度，取四副的均值（含桨毂，略偏大）。
- 机壳宽：在过电机中心平均高度的那一行上，从画面中线向左右数到背景为止的宽度。
只适用于深色桨、浅色机身和背景的四旋图。

用法（仓库根目录）：python3 -B experiments/20261127-a4-bridge/quick_measure.py <图.png> …
"""
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "experiments/reading"))
sys.path.insert(0, str(ROOT / "experiments/gpu-remote"))
import pngread  # noqa: E402
import rotors  # noqa: E402

TARGET = {"WL": "W/L", "BW": "机壳宽/D", "DD": "d/D"}


def main():
    print("图\t电机数\tW/L\t机壳宽/D\td/D\t这一档的目标\t偏差")
    for image in sys.argv[1:]:
        w, h, px = pngread.rgb(Path(image).read_bytes())
        found = [rotors.measure(c) for c in rotors.components(w, h, px)]
        found = [m for m in found if m["span"] > 150]
        name = Path(image).stem
        if len(found) != 4:
            print(f"{name}\t{len(found)}\t—\t—\t—\t—\t量不了")
            continue
        xs, ys = [m["box"][0] for m in found], [m["box"][1] for m in found]
        W, L = max(xs) - min(xs), max(ys) - min(ys)
        pts = sorted(zip(xs, ys), key=lambda p: (p[1] > sum(ys) / 4, p[0]))
        D = (math.dist(pts[0], pts[3]) + math.dist(pts[1], pts[2])) / 2
        d = sum(m["span"] for m in found) / 4
        row = int(round(sum(ys) / 4))
        bg = lambda x: max(px[(row * w + x) * 3:(row * w + x) * 3 + 3]) >= 235
        left = right = w // 2
        while left > 0 and not bg(left - 1):
            left -= 1
        while right < w - 1 and not bg(right + 1):
            right += 1
        got = {"WL": W / L, "BW": (right - left + 1) / D, "DD": d / D}
        m = re.match(r"A4-(WL|BW|DD)-CB-([0-9.]+)-s\d", name)
        target = f"{TARGET[m.group(1)]} {m.group(2)}" if m else "—"
        dev = f"{got[m.group(1)] - float(m.group(2)):+.3f}" if m else "—"
        print(f"{name}\t4\t{got['WL']:.3f}\t{got['BW']:.3f}\t{got['DD']:.3f}\t{target}\t{dev}")


if __name__ == "__main__":
    main()
