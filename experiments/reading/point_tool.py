# -*- coding: utf-8 -*-
"""point-reader 1.0 —— 给独立 AI 判读者用的看图与记点工具（A8 的 a8-ai-reader 1.0 的标准库重写，另加桨尖和两问）。
只做三件事：把图放大给你看、记下你报的坐标和回答、把每一步写进操作日志。它不替你找点。
所有命令都在本目录里运行：  python3 tool.py <命令> ...
  list                              列出本目录的图号和各自的完成情况
  look  <图号>                      整张图加坐标刻度（每 100 像素一条细线，边上标数字），存到 views/
  zoom  <图号> <cx> <cy> [半宽=40] [x,y ...]   以 (cx,cy) 为中心放大 8 倍；后面的 x,y 会画成十字
  hubs  <图号> x,y x,y x,y x,y      四个候选点各放大一格（顺序：左上 右上 右下 左下），十字画在候选点上
  band  <图号> <y> [x0 x1]          y 这一行上下各 20 像素的横条放大 4 倍，行本身画成细线
  col   <图号> <x> [y0 y1]          x 这一列左右各 20 像素的竖条放大 4 倍
  vals  <图号> row <y> <x0> <x1>    打印这一行 x0..x1 每个像素的灰度（0 黑 255 白）
  vals  <图号> col <x> <y0> <y1>    打印这一列 y0..y1 每个像素的灰度
  set   <图号> tl=x,y tr=x,y br=x,y bl=x,y left=x right=x tip_tl=x,y tip_tr=x,y tip_br=x,y tip_bl=x,y
                                    记点。可以分几次记，后记的覆盖先记的。left/right 只给 x，y 由工具取四轴 y 均值四舍五入
  answer <图号> connected=yes|no|? product=yes|no|?   记两问的回答
  blank <图号> <点名>[,点名...] "原因"   这个点定不了，留空并写明原因
  show  <图号>                      把已记的点叠在整张图上，供最后复看
  finish --model "..." --exposure "..." --deviations "..." --hard "..."
                                    全部做完后运行：检查有没有漏项，写出 response.csv 和 reader.json
只用标准库。每一次调用都记进 log.jsonl。
"""
import csv
import datetime
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pngread  # noqa: E402

POINTS = ["tl", "tr", "br", "bl", "left", "right", "tip_tl", "tip_tr", "tip_br", "tip_bl"]
QUESTIONS = ["connected", "product"]
STATE = HERE / "state.json"
FONT = {"0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001",
        "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111"}


def log(entry):
    with (HERE / "log.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps({"t": datetime.datetime.now().strftime("%H:%M:%S"), **entry}, ensure_ascii=False) + "\n")


def ids():
    with (HERE / "response-blank.csv").open(encoding="utf-8-sig", newline="") as f:
        return [r["image"] for r in csv.DictReader(f)]


def state():
    return json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {}


def save(s):
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def image(token):
    assert token in ids(), "没有这个图号"
    return pngread.rgb((HERE / f"{token}.png").read_bytes())


class Sheet:
    def __init__(self, w, h, fill=(255, 255, 255)):
        self.w, self.h, self.px = w, h, bytearray(bytes(fill) * (w * h))

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 3
            self.px[i:i + 3] = bytes(c)

    def hline(self, y, x0, x1, c):
        for x in range(x0, x1):
            self.put(x, y, c)

    def vline(self, x, y0, y1, c):
        for y in range(y0, y1):
            self.put(x, y, c)

    def cross(self, x, y, c=(255, 0, 255), arm=14, gap=3):
        for d in range(gap, arm):
            for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
                self.put(x + dx, y + dy, c)

    def number(self, x, y, value, c=(200, 0, 0), k=2):
        for n, ch in enumerate(str(value)):
            bits = FONT.get(ch)
            if not bits:
                continue
            for j in range(15):
                if bits[j] == "1":
                    for a in range(k):
                        for b in range(k):
                            self.put(x + n * 4 * k + (j % 3) * k + a, y + (j // 3) * k + b, c)

    def blit(self, src, x0, y0, x1, y1, ox, oy, k):
        """把原图 (x0,y0)-(x1,y1) 放大 k 倍贴到 (ox,oy)。"""
        w, h, px = src
        for y in range(y0, y1):
            for x in range(x0, x1):
                if 0 <= x < w and 0 <= y < h:
                    i = (y * w + x) * 3
                    c = px[i:i + 3]
                else:
                    c = b"\x80\x80\x80"
                for a in range(k):
                    row = ((oy + (y - y0) * k + a) * self.w + ox + (x - x0) * k) * 3
                    self.px[row:row + 3 * k] = c * k

    def write(self, name):
        (HERE / "views").mkdir(exist_ok=True)
        (HERE / "views" / name).write_bytes(pngread.encode_rgb(self.w, self.h, bytes(self.px)))
        print("views/" + name)


def xy(text):
    a, b = text.split(",")
    return int(round(float(a))), int(round(float(b)))


def cmd_look(token):
    src = image(token)
    w, h, _ = src
    m = 30
    s = Sheet(w + m, h + m)
    s.blit(src, 0, 0, w, h, m, m, 1)
    for v in range(0, w, 100):
        s.vline(m + v, m, m + h, (0, 160, 255))
        s.number(m + v + 2, 8, v)
    for v in range(0, h, 100):
        s.hline(m + v, m, m + w, (0, 160, 255))
        s.number(1, m + v + 3, v)
    s.write(f"{token}-look.png")


def cmd_zoom(token, cx, cy, half=40, marks=()):
    src = image(token)
    k = 8
    s = Sheet(2 * half * k, 2 * half * k)
    s.blit(src, cx - half, cy - half, cx + half, cy + half, 0, 0, k)
    for (x, y) in marks:
        s.cross((x - (cx - half)) * k + k // 2, (y - (cy - half)) * k + k // 2)
    s.write(f"{token}-zoom-{cx}-{cy}-{half}.png")


def cmd_hubs(token, pts):
    src = image(token)
    half, k, gap = 40, 4, 6
    t = 2 * half * k
    s = Sheet(4 * t + 3 * gap, t)
    for n, (x, y) in enumerate(pts):
        ox = n * (t + gap)
        s.blit(src, x - half, y - half, x + half, y + half, ox, 0, k)
        s.cross(ox + half * k + k // 2, half * k + k // 2)
    s.write(f"{token}-hubs-" + "-".join(f"{x}_{y}" for x, y in pts) + ".png")


def cmd_band(token, y, x0=0, x1=None):
    src = image(token)
    x1 = src[0] if x1 is None else x1
    k, half = 4, 20
    s = Sheet((x1 - x0) * k, 2 * half * k + 16)
    s.blit(src, x0, y - half, x1, y + half, 0, 16, k)
    s.hline(16 + half * k + k // 2, 0, (x1 - x0) * k, (255, 0, 255))
    for v in range((x0 // 50 + 1) * 50, x1, 50):
        s.vline((v - x0) * k, 0, 16, (0, 160, 255))
        s.number((v - x0) * k + 3, 2, v)
    s.write(f"{token}-band-{y}-{x0}-{x1}.png")


def cmd_col(token, x, y0=0, y1=None):
    src = image(token)
    y1 = src[1] if y1 is None else y1
    k, half = 4, 20
    s = Sheet(2 * half * k + 40, (y1 - y0) * k)
    s.blit(src, x - half, y0, x + half, y1, 40, 0, k)
    s.vline(40 + half * k + k // 2, 0, (y1 - y0) * k, (255, 0, 255))
    for v in range((y0 // 50 + 1) * 50, y1, 50):
        s.hline((v - y0) * k, 0, 40, (0, 160, 255))
        s.number(2, (v - y0) * k + 3, v)
    s.write(f"{token}-col-{x}-{y0}-{y1}.png")


def cmd_vals(token, kind, a, b, c):
    w, h, px = image(token)
    grey = lambda x, y: (px[(y * w + x) * 3] * 299 + px[(y * w + x) * 3 + 1] * 587 + px[(y * w + x) * 3 + 2] * 114) // 1000
    if kind == "row":
        print(" ".join(f"{x}:{grey(x, a)}" for x in range(max(0, b), min(w, c + 1))))
    else:
        print(" ".join(f"{y}:{grey(a, y)}" for y in range(max(0, b), min(h, c + 1))))


def row_y(entry):
    hubs = [entry.get(p) for p in ("tl", "tr", "br", "bl")]
    return round(sum(p[1] for p in hubs) / 4) if all(isinstance(p, list) for p in hubs) else None


def cmd_set(token, pairs):
    assert token in ids(), "没有这个图号"
    s = state()
    e = s.setdefault(token, {})
    for pair in pairs:
        name, value = pair.split("=", 1)
        assert name in POINTS, f"不认识的点名 {name}"
        if name in ("left", "right"):
            y = row_y(e)
            assert y is not None, "先记完四个轴（tl tr br bl），再记 left、right"
            e[name] = [int(round(float(value))), y]
        else:
            e[name] = list(xy(value))
        e.get("blank", {}).pop(name, None)
    save(s)
    y = row_y(e)
    print("已记：" + "，".join(f"{p}={e[p][0]},{e[p][1]}" for p in POINTS if isinstance(e.get(p), list)))
    if y is not None:
        print(f"left、right 要取的那一行是 y = {y}")


def cmd_answer(token, pairs):
    assert token in ids(), "没有这个图号"
    s = state()
    e = s.setdefault(token, {})
    for pair in pairs:
        name, value = pair.split("=", 1)
        assert name in QUESTIONS and value in ("yes", "no", "?"), "两问只能答 yes、no 或 ?"
        e[name] = value
    save(s)
    print("已记：" + "，".join(f"{q}={e[q]}" for q in QUESTIONS if q in e))


def cmd_blank(token, names, reason):
    assert token in ids() and reason.strip(), "要写原因"
    s = state()
    e = s.setdefault(token, {})
    for name in names.split(","):
        assert name in POINTS, f"不认识的点名 {name}"
        e.pop(name, None)
        e.setdefault("blank", {})[name] = reason
    save(s)
    print("已留空：" + names)


def cmd_show(token):
    src = image(token)
    w, h, _ = src
    s = Sheet(w, h)
    s.blit(src, 0, 0, w, h, 0, 0, 1)
    e = state().get(token, {})
    for n, p in enumerate(POINTS):
        if isinstance(e.get(p), list):
            x, y = e[p]
            s.cross(x, y, (255, 0, 255) if n < 4 else (0, 200, 0) if n < 6 else (255, 120, 0), arm=18, gap=2)
    y = row_y(e)
    if y is not None:
        s.hline(y, 0, w, (0, 160, 255))
    s.write(f"{token}-show.png")


def missing(e):
    out = [p for p in POINTS if not isinstance(e.get(p), list) and p not in e.get("blank", {})]
    return out + [q for q in QUESTIONS if q not in e]


def cmd_list():
    s = state()
    for token in ids():
        m = missing(s.get(token, {}))
        print(token, "完成" if not m else "还差 " + " ".join(m))


def cmd_finish(args):
    meta = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args), 2)}
    for key in ("model", "exposure", "deviations", "hard"):
        assert meta.get(key), f"要给 --{key}"
    s = state()
    left = {t: missing(s.get(t, {})) for t in ids() if missing(s.get(t, {}))}
    if left:
        print("还有没做完的：")
        for t, m in left.items():
            print(" ", t, " ".join(m))
        sys.exit(1)
    header = ["image"] + [f"{p}_{a}" for p in POINTS for a in ("x", "y")] + QUESTIONS + ["reason"]
    with (HERE / "response.csv").open("w", encoding="utf-8-sig", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=header)
        wr.writeheader()
        for t in ids():
            e = s[t]
            row = {"image": t, **{q: e[q] for q in QUESTIONS}, "reason": "；".join(f"{k}：{v}" for k, v in e.get("blank", {}).items())}
            for p in POINTS:
                if isinstance(e.get(p), list):
                    row[f"{p}_x"], row[f"{p}_y"] = e[p]
            wr.writerow(row)
    (HERE / "reader.json").write_text(json.dumps({"tool": "point-reader 1.0", "finished": datetime.datetime.now().isoformat(timespec="seconds"), **meta}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"写出 response.csv（{len(ids())} 行）和 reader.json")


def main():
    a = sys.argv[1:]
    log({"args": a})
    if not a or a[0] == "help":
        print(__doc__)
    elif a[0] == "list":
        cmd_list()
    elif a[0] == "look":
        cmd_look(a[1])
    elif a[0] == "zoom":
        cmd_zoom(a[1], int(a[2]), int(a[3]), int(a[4]) if len(a) > 4 and "," not in a[4] else 40, [xy(v) for v in a[4:] if "," in v])
    elif a[0] == "hubs":
        cmd_hubs(a[1], [xy(v) for v in a[2:6]])
    elif a[0] == "band":
        cmd_band(a[1], int(a[2]), *(int(v) for v in a[3:5]))
    elif a[0] == "col":
        cmd_col(a[1], int(a[2]), *(int(v) for v in a[3:5]))
    elif a[0] == "vals":
        cmd_vals(a[1], a[2], int(a[3]), int(a[4]), int(a[5]))
    elif a[0] == "set":
        cmd_set(a[1], a[2:])
    elif a[0] == "answer":
        cmd_answer(a[1], a[2:])
    elif a[0] == "blank":
        cmd_blank(a[1], a[2], a[3])
    elif a[0] == "show":
        cmd_show(a[1])
    elif a[0] == "finish":
        cmd_finish(a[1:])
    else:
        print("不认识的命令；python3 tool.py help")


if __name__ == "__main__":
    main()
