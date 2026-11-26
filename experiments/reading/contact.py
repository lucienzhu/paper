"""把一批出图拼成一张缩略总览，给研究者在每一批跑完后先看一遍用（知条件的检查，不是判读，不进任何分母）。

用法（仓库根目录）：python3 -B experiments/reading/contact.py <输出.png> <列数> <图1.png> <图2.png> …
每张缩到一半（1024 → 512），按给出的顺序从左到右、从上到下排。不依赖第三方库。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "gpu-remote"))
import pngread  # noqa: E402


def half(png):
    w, h, px = pngread.rgb(png)
    out = bytearray((w // 2) * (h // 2) * 3)
    row = w * 3
    o = 0
    for y in range(0, h - 1, 2):
        a = y * row
        for x in range(0, (w // 2) * 6, 6):
            i = a + x
            j = i + row
            out[o] = (px[i] + px[i + 3] + px[j] + px[j + 3]) >> 2
            out[o + 1] = (px[i + 1] + px[i + 4] + px[j + 1] + px[j + 4]) >> 2
            out[o + 2] = (px[i + 2] + px[i + 5] + px[j + 2] + px[j + 5]) >> 2
            o += 3
    return w // 2, h // 2, bytes(out)


def main():
    out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    tiles = [half(Path(f).read_bytes()) for f in files]
    tw, th = tiles[0][0], tiles[0][1]
    rows = (len(tiles) + cols - 1) // cols
    sheet = bytearray(b"\xff" * (tw * cols * th * rows * 3))
    for n, (w, h, px) in enumerate(tiles):
        cx, cy = (n % cols) * tw, (n // cols) * th
        for y in range(h):
            dst = ((cy + y) * tw * cols + cx) * 3
            sheet[dst:dst + w * 3] = px[y * w * 3:(y + 1) * w * 3]
    Path(out).write_bytes(pngread.encode_rgb(tw * cols, th * rows, bytes(sheet)))
    print(f"{len(tiles)} 张 → {out}（{cols} 列 × {rows} 行，每张 {tw}×{th}）")


if __name__ == "__main__":
    main()
