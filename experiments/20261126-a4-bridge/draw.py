"""A4 用的两种条件图，只用标准库画（本机没有 Pillow）：每个像素 4×4 次采样取平均。

- 点线图：照四旋 dots-250 和 WLQ 点线图的画法，黑底，中心到电机的蓝线宽 3 像素（#205cff），电机红点半径 10 像素。
- 部件图：照 G2d／E1 的部件图画法（archive/experiments/g2d/build.py 的 render），白底，墨色 #222222：
  机臂自电机向中心 168.6 像素、宽 12 像素；双叶桨按 G2d 的叶形多边形；电机处白心圆圈半径 10、线宽 3；
  可选机身：居中的胶囊形（两端半圆），宽、长由参数给。
画法与原图的差别在 check() 里量：用同一组几何重画仓库里已有的图，逐像素比。
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "gpu-remote"))
import pngread  # noqa: E402

SIZE, CX, CY, SUB = 1024, 512.0, 512.0, 4
BLUE, RED, INK, WHITE, BLACK = (32, 92, 255), (255, 0, 0), (34, 34, 34), (255, 255, 255), (0, 0, 0)
ARM_LEN, ARM_HALF, RING_R, RING_STROKE = 168.6, 6.0, 10.0, 3.0
BLADE_REF = math.hypot(424, 424) * 0.23 / 2      # G2d 的叶形基准半径
D_QUAD = 210 * math.sqrt(2) * 2                   # 四旋点线图的对角电机距 593.97 像素（250 mm）


def hubs(wl, d_px=D_QUAD):
    """右下、左下、左上、右上（与 G2d 同序）。"""
    length = d_px / math.hypot(wl, 1)
    width = wl * length
    return [(CX + sx * width / 2, CY + sy * length / 2) for sx, sy in [(1, 1), (-1, 1), (-1, -1), (1, -1)]]


def _seg(px, py, ax, ay, bx, by, half):
    dx, dy = bx - ax, by - ay
    n2 = dx * dx + dy * dy
    t = ((px - ax) * dx + (py - ay) * dy) / n2
    if t < 0 or t > 1:
        return False
    qx, qy = ax + t * dx - px, ay + t * dy - py
    return qx * qx + qy * qy <= half * half


def _round_seg(px, py, ax, ay, bx, by, half):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    qx, qy = ax + t * dx - px, ay + t * dy - py
    return qx * qx + qy * qy <= half * half


def _poly(px, py, pts):
    inside = False
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


class Canvas:
    """按先后叠放的形状表；每个形状带包围盒，栅格化时只算盒内的像素。"""

    def __init__(self, background):
        self.bg = background
        self.shapes = []

    def add(self, test, color, box):
        x0, y0, x1, y1 = box
        self.shapes.append((test, color, (max(0, int(x0) - 2), max(0, int(y0) - 2), min(SIZE - 1, int(x1) + 2), min(SIZE - 1, int(y1) + 2))))

    def segment(self, a, b, half, color, round_cap=False):
        (ax, ay), (bx, by) = a, b
        f = _round_seg if round_cap else _seg
        steps = int(math.hypot(bx - ax, by - ay)) + 1
        cells = set()
        for i in range(steps + 1):  # 斜线的包围盒太大，改用沿线的格子
            x = ax + (bx - ax) * i / steps
            y = ay + (by - ay) * i / steps
            r = int(half) + 2
            for ox in range(-r, r + 1):
                for oy in range(-r, r + 1):
                    cells.add((int(x) + ox, int(y) + oy))
        self.shapes.append((lambda px, py, a=a, b=b: f(px, py, a[0], a[1], b[0], b[1], half), color, cells))

    def disk(self, c, r, color):
        self.add(lambda px, py: (px - c[0]) ** 2 + (py - c[1]) ** 2 <= r * r, color, (c[0] - r, c[1] - r, c[0] + r, c[1] + r))

    def ring(self, c, r, stroke, color, fill):
        self.add(lambda px, py: (px - c[0]) ** 2 + (py - c[1]) ** 2 <= r * r, fill, (c[0] - r, c[1] - r, c[0] + r, c[1] + r))
        inner = r - stroke
        self.add(lambda px, py: inner * inner < (px - c[0]) ** 2 + (py - c[1]) ** 2 <= r * r, color,
                 (c[0] - r, c[1] - r, c[0] + r, c[1] + r))

    def polygon(self, pts, color):
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        self.add(lambda px, py: _poly(px, py, pts), color, (min(xs), min(ys), max(xs), max(ys)))

    def capsule(self, width, length, color):
        r = width / 2
        a, b = (CX, CY - length / 2 + r), (CX, CY + length / 2 - r)
        self.add(lambda px, py: _round_seg(px, py, a[0], a[1], b[0], b[1], r), color,
                 (CX - r, CY - length / 2, CX + r, CY + length / 2))

    def render(self):
        index = {}  # 像素 → 可能盖住它的形状（按叠放顺序）
        for k, (test, color, box) in enumerate(self.shapes):
            cells = box if isinstance(box, set) else ((x, y) for x in range(box[0], box[2] + 1) for y in range(box[1], box[3] + 1))
            for cell in cells:
                index.setdefault(cell, []).append(k)
        px = bytearray(bytes(self.bg) * (SIZE * SIZE))
        offs = [(i + 0.5) / SUB for i in range(SUB)]
        n = SUB * SUB
        for (x, y), ks in index.items():
            if not (0 <= x < SIZE and 0 <= y < SIZE):
                continue
            top = [self.shapes[k] for k in reversed(ks)]
            acc = [0, 0, 0]
            for oy in offs:
                for ox in offs:
                    sx, sy = x + ox, y + oy
                    c = self.bg
                    for test, color, _ in top:
                        if test(sx, sy):
                            c = color
                            break
                    acc[0] += c[0]
                    acc[1] += c[1]
                    acc[2] += c[2]
            i = (y * SIZE + x) * 3
            px[i:i + 3] = bytes(round(v / n) for v in acc)
        return pngread.encode_rgb(SIZE, SIZE, bytes(px))


def dots_guide(centres):
    cv = Canvas(BLACK)
    for h in centres:
        cv.segment((CX, CY), h, 1.5, BLUE)
    for h in centres:
        cv.disk(h, 10.0, RED)
    return cv.render()


def parts_guide(centres, blade_radius, body=None):
    """body = (宽, 长)，单位像素；None 表示不画机身（G2d 原样）。"""
    cv = Canvas(WHITE)
    if body:
        cv.capsule(body[0], body[1], INK)
    for x, y in centres:
        dx, dy = CX - x, CY - y
        norm = math.hypot(dx, dy)
        reach = norm if body else ARM_LEN  # 画了机身时，机臂一直连到机身，不留空隙
        tip = (x + dx * reach / norm, y + dy * reach / norm)
        cv.segment(tip, (x, y), ARM_HALF, INK)
    s = blade_radius / BLADE_REF
    r = blade_radius
    blade = [(9 * s, -4 * s), (.4 * r, -9 * s), (.8 * r, -7 * s), (r, 0), (.8 * r, 7 * s), (.4 * r, 9 * s), (9 * s, 4 * s)]
    for x, y in centres:
        ax = -math.copysign(212 / math.hypot(212, 212), y - CY)
        ay = math.copysign(212 / math.hypot(212, 212), x - CX)
        for sign in (-1, 1):
            cv.polygon([(x + sign * u * ax - v * ay, y + sign * u * ay + v * ax) for u, v in blade], INK)
        cv.ring((x, y), RING_R, RING_STROKE, INK, WHITE)
    return cv.render()


def compare(a_png, b_png):
    """返回 (三通道平均绝对差, 墨迹交并比)。墨迹按灰度小于 128 计（部件图）或红蓝像素计（点线图）。"""
    _, _, pa = pngread.rgb(a_png)
    _, _, pb = pngread.rgb(b_png)
    mad = sum(abs(x - y) for x, y in zip(pa, pb)) / len(pa)
    def ink(p, i):
        r, g, b = p[i], p[i + 1], p[i + 2]
        return (r + g + b) < 384 if (p[0] + p[1] + p[2]) > 384 else (r + g + b) > 120
    inter = union = 0
    for i in range(0, len(pa), 3):
        ia, ib = ink(pa, i), ink(pb, i)
        inter += ia and ib
        union += ia or ib
    return mad, inter / union
