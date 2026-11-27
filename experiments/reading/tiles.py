"""把一张图上给定的几处按原分辨率各裁一格拼在一起（研究者细看各个旋翼、臂根用；知条件的检查，不进任何分母）。

用法（仓库根目录）：python3 -B experiments/reading/tiles.py <输出.png> <半边长> <列数> <图.png> <x,y> <x,y> …
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "gpu-remote"))
import pngread  # noqa: E402


def main():
    out, half, cols, image = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    centres = [tuple(int(v) for v in a.split(",")) for a in sys.argv[5:]]
    w, h, px = pngread.rgb(Path(image).read_bytes())
    gap, t = 6, 2 * half
    rows = (len(centres) + cols - 1) // cols
    W, H = cols * t + (cols - 1) * gap, rows * t + (rows - 1) * gap
    sheet = bytearray(b"\xff" * (W * H * 3))
    for n, (cx, cy) in enumerate(centres):
        ox, oy = (n % cols) * (t + gap), (n // cols) * (t + gap)
        for y in range(t):
            sy = cy - half + y
            if not 0 <= sy < h:
                continue
            x0, x1 = max(0, cx - half), min(w, cx + half)
            dst = ((oy + y) * W + ox + (x0 - (cx - half))) * 3
            sheet[dst:dst + (x1 - x0) * 3] = px[(sy * w + x0) * 3:(sy * w + x1) * 3]
    Path(out).write_bytes(pngread.encode_rgb(W, H, bytes(sheet)))
    print(f"{len(centres)} 格 → {out}")


if __name__ == "__main__":
    main()
