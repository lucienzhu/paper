"""量顶视图里每副桨的两片桨叶是不是成一条直线，并把每副桨按原分辨率裁出来（研究者知条件的检查用，不进任何分母）。

为什么要量：2026-11-27 夜里 Claude 只凭缩略图把“斜着摆的直桨”和“V 形桨”看混了，又把“每个电机只有一片桨叶”看成了对的（见旋翼开发小批的更正）。量出来的不靠眼力。

做法（只适用于桨是深色、机身和背景是浅色的图；机身也是深色时不能用）：
1. 取深色像素，找连通块；面积够大的每一块算一副桨（桨叶、桨毂、电机顶连在一起）。块数应等于电机数。
2. 每一块的像素分成两堆（两片桨叶），各求长轴方向。两根长轴差几度，就是这副桨弯了几度（直桨是 0°）。
3. 直的时候取整块长轴的中点当桨毂，按方向数深色的峰数（双叶应为 2）。同时报整块的长度（像素）。
4. 浅色的桨叶深色那一遍看不见：再按“不是背景”数一遍方向，去掉朝画面中心的机臂那一段，剩下的也应为 2。
判：离直线 10° 以内记“直”，10°—20° 记“拿不准”，20° 以上记“弯”；哪一遍的方向数不是 2 另记“叶数存疑”。
程序量不出来的：每个电机只有一片桨叶（一片桨叶加电机顶，量出来也是“直”，只是整块短一截）。试过按对称、按桨毂位置去判，都分不开，
所以**每张图的裁图都要人眼逐副看**：两片都在不在、是不是一样长。程序只帮着量角度和数叶；其余各项（相机、机身、臂根……）照验收标准另看。

用法（仓库根目录）：python3 -B experiments/reading/rotors.py [--crops <目录>] [--expect <电机数>] <图1.png> <图2.png> …
给了 --crops，就在那个目录里为每张图写一张 <图名>-rotors.png（每副桨一格，原分辨率）。
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "gpu-remote"))
import pngread  # noqa: E402

DARK, MIN_AREA, HALF = 110, 2500, 176


def components(w, h, px):
    mask = bytearray(w * h)
    for i in range(w * h):
        j = i * 3
        if px[j] < DARK and px[j + 1] < DARK and px[j + 2] < DARK:
            mask[i] = 1
    out = []
    for start in range(w * h):
        if mask[start] != 1:
            continue
        mask[start] = 2
        stack, pts = [start], []
        while stack:
            i = stack.pop()
            x, y = i % w, i // w
            pts.append((x, y))
            for dy in (-1, 0, 1):
                yy = y + dy
                if not 0 <= yy < h:
                    continue
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and mask[yy * w + xx] == 1:
                        mask[yy * w + xx] = 2
                        stack.append(yy * w + xx)
        if len(pts) >= MIN_AREA:
            out.append(pts)
    return out


def axis_of(pts):
    n = len(pts)
    mx, my = sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts); syy = sum((p[1] - my) ** 2 for p in pts); sxy = sum((p[0] - mx) * (p[1] - my) for p in pts)
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(ang), math.sin(ang)
    proj = sorted((p[0] - mx) * ux + (p[1] - my) * uy for p in pts)
    length = proj[int(n * 0.995)] - proj[int(n * 0.005)]
    return (mx, my), (ux, uy), math.degrees(ang) % 180, length


def measure(pts):
    n = len(pts)
    cx, cy = sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n
    a = max(pts, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
    b = max(pts, key=lambda p: (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
    c1, c2 = (float(a[0]), float(a[1])), (float(b[0]), float(b[1]))
    for _ in range(10):
        g1 = [p for p in pts if (p[0] - c1[0]) ** 2 + (p[1] - c1[1]) ** 2 <= (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2]
        g2 = [p for p in pts if (p[0] - c1[0]) ** 2 + (p[1] - c1[1]) ** 2 > (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2]
        if not g1 or not g2:
            break
        c1 = (sum(p[0] for p in g1) / len(g1), sum(p[1] for p in g1) / len(g1))
        c2 = (sum(p[0] for p in g2) / len(g2), sum(p[1] for p in g2) / len(g2))
    (m1, u1, ang1, len1), (m2, u2, ang2, len2) = axis_of(g1), axis_of(g2)
    bend = abs((ang1 - ang2 + 90) % 180 - 90)
    # 整块沿长轴的宽度分布：一副直的双叶桨关于中点对称（两头各一片桨叶）；只有一片桨叶加一个电机顶时不对称
    (mm, uu, _, span) = axis_of(pts)
    proj = [(p[0] - mm[0]) * uu[0] + (p[1] - mm[1]) * uu[1] for p in pts]
    lo, hi = min(proj), max(proj)
    k = 24
    prof = [0] * k
    for v in proj:
        prof[min(k - 1, int((v - lo) / ((hi - lo) or 1.0) * k))] += 1
    symmetry = 1 - sum(abs(prof[i] - prof[k - 1 - i]) for i in range(k)) / (2.0 * n)
    mid = (lo + hi) / 2
    # 桨毂：两根长轴的交点（弯的时候）；直的时候取整块长轴的中点
    det = u1[0] * (-u2[1]) - (-u2[0]) * u1[1]
    if bend > 15 and abs(det) > 1e-6:
        s = ((m2[0] - m1[0]) * (-u2[1]) - (-u2[0]) * (m2[1] - m1[1])) / det
        hub = (m1[0] + s * u1[0], m1[1] + s * u1[1])
    else:
        hub = (mm[0] + mid * uu[0], mm[1] + mid * uu[1])
    bins = [0.0] * 72
    for x, y in pts:
        d = math.hypot(x - hub[0], y - hub[1])
        if d >= 34:
            bins[int((math.degrees(math.atan2(y - hub[1], x - hub[0])) % 360) // 5) % 72] += d
    sm = [bins[(k2 - 2) % 72] + 2 * bins[(k2 - 1) % 72] + 3 * bins[k2] + 2 * bins[(k2 + 1) % 72] + bins[(k2 + 2) % 72] for k2 in range(72)]
    top = max(sm) or 1.0
    peaks = sum(1 for i in range(72) if sm[i] > 0.3 * top and sm[i] >= sm[(i - 1) % 72] and sm[i] > sm[(i + 1) % 72]
                and sm[i] >= max(sm[(i + j) % 72] for j in (-4, -3, -2, 2, 3, 4)))
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return {"bend": bend, "peaks": peaks, "symmetry": symmetry, "span": hi - lo, "hub": hub,
            "box": ((min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2), "area": n, "reach": (hi - lo) / 2}


def any_colour_peaks(w, h, px, m):
    """浅色的桨叶深色那一遍看不见：再数一遍“不是背景”的方向。去掉朝画面中心的那一段（机臂），剩下的应当正好是两片桨叶。"""
    hx, hy = m["hub"]
    r0, r1 = 52, max(70.0, 0.8 * m["reach"])
    toward = math.degrees(math.atan2(h / 2 - hy, w / 2 - hx)) % 360
    bins = [0.0] * 72
    for y in range(max(0, int(hy - r1)), min(h, int(hy + r1) + 1)):
        for x in range(max(0, int(hx - r1)), min(w, int(hx + r1) + 1)):
            d = math.hypot(x - hx, y - hy)
            if d < r0 or d > r1:
                continue
            i = (y * w + x) * 3
            if max(px[i], px[i + 1], px[i + 2]) < 225:
                a = math.degrees(math.atan2(y - hy, x - hx)) % 360
                if abs((a - toward + 180) % 360 - 180) > 30:
                    bins[int(a // 5) % 72] += 1
    sm = [bins[(k - 2) % 72] + 2 * bins[(k - 1) % 72] + 3 * bins[k] + 2 * bins[(k + 1) % 72] + bins[(k + 2) % 72] for k in range(72)]
    top = max(sm) or 1.0
    return sum(1 for k in range(72) if sm[k] > 0.25 * top and sm[k] >= sm[(k - 1) % 72] and sm[k] > sm[(k + 1) % 72]
               and sm[k] >= max(sm[(k + j) % 72] for j in (-4, -3, -2, 2, 3, 4)))


def verdict(m):
    v = "直" if m["bend"] <= 10 else "拿不准" if m["bend"] <= 20 else "弯"
    if m["peaks"] != 2:
        v += f"、叶数存疑（深色 {m['peaks']} 个方向）"
    if m.get("any", 2) != 2:
        v += f"、叶数存疑（连浅色共 {m['any']} 个方向）"
    return v


def main():
    args, crops, expect = sys.argv[1:], None, 4
    while args and args[0].startswith("--"):
        if args[0] == "--crops":
            crops = Path(args[1])
        elif args[0] == "--expect":
            expect = int(args[1])
        args = args[2:]
    if crops:
        crops.mkdir(parents=True, exist_ok=True)
    for image in args:
        w, h, px = pngread.rgb(Path(image).read_bytes())
        found = sorted((measure(c) for c in components(w, h, px)), key=lambda m: (m["box"][1] > h / 2, m["box"][0]))
        for m in found:
            m["any"] = any_colour_peaks(w, h, px, m)
        straight = sum(1 for m in found if verdict(m) == "直")
        head = f"{Path(image).stem}：{len(found)} 副桨" + ("" if len(found) == expect else f"（应为 {expect}）") + f"，直 {straight}"
        print(head + "｜" + "；".join(f"({m['box'][0]},{m['box'][1]}) {verdict(m)} 差 {m['bend']:.0f}° 长 {m['span']:.0f}" for m in found))
        if crops and found:
            gap, t = 6, 2 * HALF
            cols = 2 if len(found) <= 4 else 4
            rows = (len(found) + cols - 1) // cols
            W, H = cols * t + (cols - 1) * gap, rows * t + (rows - 1) * gap
            sheet = bytearray(b"\xff" * (W * H * 3))
            for n, m in enumerate(found):
                bx, by = m["box"]
                ox, oy = (n % cols) * (t + gap), (n // cols) * (t + gap)
                for y in range(t):
                    sy = by - HALF + y
                    if not 0 <= sy < h:
                        continue
                    x0, x1 = max(0, bx - HALF), min(w, bx + HALF)
                    dst = ((oy + y) * W + ox + (x0 - (bx - HALF))) * 3
                    sheet[dst:dst + (x1 - x0) * 3] = px[(sy * w + x0) * 3:(sy * w + x1) * 3]
            (crops / (Path(image).stem + "-rotors.png")).write_bytes(pngread.encode_rgb(W, H, bytes(sheet)))


if __name__ == "__main__":
    main()
