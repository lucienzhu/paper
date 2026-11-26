"""把一批出图的同一块区域按原分辨率裁出来拼在一起，给研究者细看某个部位用（知条件的检查，不进任何分母）。

用法（仓库根目录）：python3 -B experiments/reading/crops.py <输出.png> <列数> <x0> <y0> <x1> <y1> <图1.png> <图2.png> …
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "gpu-remote"))
import pngread  # noqa: E402


def main():
    out, cols = sys.argv[1], int(sys.argv[2])
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    files = sys.argv[7:]
    tw, th = x1 - x0, y1 - y0
    rows = (len(files) + cols - 1) // cols
    gap = 6
    W, H = cols * tw + (cols - 1) * gap, rows * th + (rows - 1) * gap
    sheet = bytearray(b"\xff" * (W * H * 3))
    for n, f in enumerate(files):
        w, h, px = pngread.rgb(Path(f).read_bytes())
        cx, cy = (n % cols) * (tw + gap), (n // cols) * (th + gap)
        for y in range(th):
            src = ((y0 + y) * w + x0) * 3
            dst = ((cy + y) * W + cx) * 3
            sheet[dst:dst + tw * 3] = px[src:src + tw * 3]
    Path(out).write_bytes(pngread.encode_rgb(W, H, bytes(sheet)))
    print(f"{len(files)} 张的 ({x0},{y0})-({x1},{y1}) → {out}")


if __name__ == "__main__":
    main()
