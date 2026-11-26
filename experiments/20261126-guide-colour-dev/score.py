"""量每张开发图上条件图颜色的残留，按 README 写定的阈值和规则给出选哪种做法。只量、只算。

运行：python3 -B experiments/20261126-guide-colour-dev/score.py   （仓库根目录；出图在 actual/）
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[0] / "gpu-remote"))
import pngread  # noqa: E402

BLUE_MIN, RED_MIN = 0.10, 0.05  # 占全图的百分比


def shares(png):
    w, h, px = pngread.rgb(png)
    blue = red = 0
    for i in range(0, len(px), 3):
        r, g, b = px[i], px[i + 1], px[i + 2]
        if b > 110 and b - r > 45 and b - g > 20:
            blue += 1
        elif r > 110 and r - g > 60 and r - b > 60:
            red += 1
    n = w * h
    return round(blue / n * 100, 3), round(red / n * 100, 3)


def main():
    man = json.loads((HERE / "manifest.json").read_bytes())
    rows, by = [], {}
    for r in man["requests"]:
        png = HERE / "actual" / r["id"] / f"{r['id']}.png"
        if not png.is_file():
            rows.append({"id": r["id"], "variant": r["variant"], "seed": r["seed"], "missing": True})
            continue
        blue, red = shares(png.read_bytes())
        has = blue >= BLUE_MIN or red >= RED_MIN
        rows.append({"id": r["id"], "variant": r["variant"], "seed": r["seed"], "blue_pct": blue, "red_pct": red, "residue": has})
        by.setdefault(r["variant"], []).append(has)
    summary = {v: {"with_residue": sum(x), "of": len(x)} for v, x in sorted(by.items())}
    out = {"thresholds": {"blue_pct": BLUE_MIN, "red_pct": RED_MIN}, "images": rows, "summary": summary}
    (HERE / "actual" / "residue.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for r in rows:
        print(r["id"], "缺图" if r.get("missing") else f"蓝 {r['blue_pct']}%  红 {r['red_pct']}%  {'有残留' if r['residue'] else '无'}")
    print({v: f"{s['with_residue']}/{s['of']}" for v, s in summary.items()})


if __name__ == "__main__":
    main()
