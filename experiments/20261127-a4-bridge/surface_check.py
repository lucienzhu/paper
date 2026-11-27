"""A4 验收用的两项程序检查（研究者知条件的检查，不进任何分母，也不是登记的读数）。

两段式和单次合并的图上出现过两样工作台原样出图没有的东西：背景上一片片的杂色，和写在图上的数字标注。
这两样眼睛看得出来，这里只是数一遍，免得靠缩略图漏掉：
- 背景杂色：在“像背景”的像素（三个通道都不低于 200）里，偏色（最大通道减最小通道 ≥ 8）的占百分之几。干净的白底接近 0。
- 小块深色：深色连通块里面积在 12—1500 像素之间的个数。桨、电机、相机都比这大；一串数字标注每个字一块，会数出几十块。
两个数都不带判断：哪张算“背景不干净”“有标注”，由看图的人定，记在验收记录里。

用法（仓库根目录）：python3 -B experiments/20261127-a4-bridge/surface_check.py <图.png> …
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "experiments/gpu-remote"))
import pngread  # noqa: E402

DARK = 110


def small_dark(w, h, px):
    mask = bytearray(w * h)
    for i in range(w * h):
        j = i * 3
        if px[j] < DARK and px[j + 1] < DARK and px[j + 2] < DARK:
            mask[i] = 1
    count = 0
    for start in range(w * h):
        if mask[start] != 1:
            continue
        mask[start] = 2
        stack, area = [start], 0
        while stack:
            i = stack.pop()
            area += 1
            x, y = i % w, i // w
            for dy in (-1, 0, 1):
                yy = y + dy
                if not 0 <= yy < h:
                    continue
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and mask[yy * w + xx] == 1:
                        mask[yy * w + xx] = 2
                        stack.append(yy * w + xx)
        if 12 <= area <= 1500:
            count += 1
    return count


def tint(w, h, px):
    bg = off = 0
    for i in range(0, w * h * 3, 3):
        r, g, b = px[i], px[i + 1], px[i + 2]
        if r >= 200 and g >= 200 and b >= 200:
            bg += 1
            if max(r, g, b) - min(r, g, b) >= 8:
                off += 1
    return 100.0 * off / (bg or 1)


def main():
    print("图\t背景杂色（%）\t小块深色（个）")
    for image in sys.argv[1:]:
        w, h, px = pngread.rgb(Path(image).read_bytes())
        print(f"{Path(image).stem}\t{tint(w, h, px):.1f}\t{small_dark(w, h, px)}")


if __name__ == "__main__":
    main()
