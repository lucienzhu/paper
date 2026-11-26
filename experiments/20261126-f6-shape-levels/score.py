"""F6 的计分（出图前写定，2026-11-26）：按登记第四节，把每位读者的读数对上档位，逐读者、逐档算命中、基准误判、看不清和混合。

用法（仓库根目录）：
  python3 -B experiments/20261126-f6-shape-levels/score.py --key <研究者目录>/PRIVATE-key.csv --reading 1=<读者1的reading.csv> --reading 2=<读者2的reading.csv> [--out 结果.json]
读者编号与对照表里的 reader 一栏相同。只读、只算，不改任何读数。
"""
import argparse
import csv
import io
import json
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOTS = ("root_fl", "root_fr", "root_rr", "root_rl")
ALLOWED = {"shell": {"round", "box", "?"}, **{r: {"smooth", "socket", "hinge", "?"} for r in ROOTS},
           "camera": {"flush", "underslung", "none", "?"}, "camera_end": {"top", "bottom", "both", "none", "?"},
           "lens_up": {"yes", "no", "?"}, "cover": {"single", "multi", "two", "?"}, "product": {"yes", "no", "?"}}
# 每一档改的那一项：读成哪个类别算目标命中。S0 是基准，四项都该读成基准类别。
TARGET = {"S1": ("shell", "box"), "S2": ("roots", "socket"), "S3": ("roots", "hinge"), "S4": ("camera", "underslung"), "S5": ("cover", "multi")}
BASE = {"shell": "round", "roots": "smooth", "camera": "flush", "cover": "single"}
HIT_MIN, FALSE_MAX, PER_LEVEL = 6, 2, 8


def rows(path):
    return list(csv.DictReader(io.StringIO(Path(path).read_bytes().decode("utf-8-sig"))))


def roots_class(r):
    """四处臂根里三处以上同类，整张才记这一类；看不清占到两处以上记看不清；否则记混合。"""
    c = Counter(r[k] for k in ROOTS)
    kind, n = c.most_common(1)[0]
    if kind != "?" and n >= 3:
        return kind
    return "?" if c["?"] >= 2 else "mixed"


def part(r, item):
    return roots_class(r) if item == "roots" else r[item]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", required=True)
    ap.add_argument("--reading", action="append", required=True, help="读者编号=reading.csv")
    ap.add_argument("--out")
    a = ap.parse_args()
    level_of = {r["id"]: r["level"] for r in json.loads((HERE / "manifest.json").read_bytes())["requests"]}
    key = defaultdict(dict)
    for k in rows(a.key):
        key[k["reader"]][k["image"]] = k["request"]
    result, per_image = {}, defaultdict(dict)
    for spec in a.reading:
        reader, path = spec.split("=", 1)
        data = rows(path)
        problems = []
        seen = set()
        for r in data:
            if r["image"] not in key[reader]:
                problems.append(f"图号 {r['image']} 不在这位读者的包里")
            seen.add(r["image"])
            for col, allowed in ALLOWED.items():
                if r.get(col, "") not in allowed:
                    problems.append(f"{r['image']} 的 {col} 填了“{r.get(col, '')}”")
        missing = set(key[reader]) - seen
        if missing or len(data) != len(key[reader]):
            problems.append(f"行数 {len(data)}，包里 {len(key[reader])} 张，缺 {len(missing)} 张")
        if problems:
            raise SystemExit(f"读者 {reader} 的读数表有问题，不计分：\n  " + "\n  ".join(problems[:20]))
        by_level = defaultdict(list)
        for r in data:
            rid = key[reader][r["image"]]
            if rid in level_of:  # 混进读数包的其他批次的图不在 F6 里计
                by_level[level_of[rid]].append(r)
                per_image[rid][reader] = {item: part(r, item) for item in BASE} | {"product": r["product"], "camera_end": r["camera_end"], "lens_up": r["lens_up"]}
        levels = {}
        for lvl, (item, want) in TARGET.items():
            mine, base = by_level[lvl], by_level["S0"]
            assert len(mine) == PER_LEVEL and len(base) == PER_LEVEL, f"{lvl} 或 S0 不是 {PER_LEVEL} 张"
            got = Counter(part(r, item) for r in mine)
            false = sum(part(r, item) == want for r in base)
            hold = {other: sum(part(r, other) == BASE[other] for r in mine) for other in BASE if other != item}
            levels[lvl] = {"item": item, "target": want, "hits": got[want], "of": PER_LEVEL, "unclear": got["?"], "mixed": got["mixed"],
                           "other_readings": {k: v for k, v in got.items() if k not in (want, "?", "mixed")},
                           "baseline_false_alarms": false, "reached": got[want] >= HIT_MIN and false <= FALSE_MAX, "non_target_held": hold}
        s0 = by_level["S0"]
        levels["S0"] = {"baseline_read_as_baseline": {item: sum(part(r, item) == BASE[item] for r in s0) for item in BASE}, "of": PER_LEVEL}
        confusion = {"S2_read_as_hinge": sum(part(r, "roots") == "hinge" for r in by_level["S2"]), "S3_read_as_socket": sum(part(r, "roots") == "socket" for r in by_level["S3"])}
        result[reader] = {"levels": levels, "s2_s3_confusion": confusion,
                          "product_yes": sum(r["product"] == "yes" for rs in by_level.values() for r in rs), "images": sum(len(v) for v in by_level.values())}
    readers = sorted(result)
    agreement = {}
    if len(readers) >= 2:
        for i, x in enumerate(readers):
            for y in readers[i + 1:]:
                both = [rid for rid, v in per_image.items() if x in v and y in v]
                agreement[f"{x}-{y}"] = {item: {"same": sum(per_image[r][x][item] == per_image[r][y][item] for r in both), "of": len(both)} for item in (*BASE, "product", "camera_end", "lens_up")}
    out = {"rule": {"hit_min": HIT_MIN, "false_alarm_max": FALSE_MAX, "per_level": PER_LEVEL}, "readers": result, "agreement": agreement}
    text = json.dumps(out, ensure_ascii=False, indent=2)
    if a.out:
        Path(a.out).write_text(text + "\n", encoding="utf-8")
    for reader in readers:
        print(f"读者 {reader}：")
        for lvl, v in result[reader]["levels"].items():
            if lvl == "S0":
                print(f"  S0 读成基准：{v['baseline_read_as_baseline']}（各 {v['of']} 张）")
            else:
                print(f"  {lvl} {v['item']}→{v['target']}：命中 {v['hits']}/{v['of']}，基准误判 {v['baseline_false_alarms']}/{PER_LEVEL}，看不清 {v['unclear']}，混合 {v['mixed']}；{'达到' if v['reached'] else '没达到'}")
    for pair, v in agreement.items():
        print(f"读者 {pair} 逐图同类：" + "，".join(f"{k} {x['same']}/{x['of']}" for k, x in v.items()))


if __name__ == "__main__":
    main()
