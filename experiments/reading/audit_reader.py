"""研究者一侧：核对一位独立 AI 读者实际做过的每一次工具调用，看有没有碰过自己目录以外的东西（做法照 A8 的 audit_transcripts.py）。

用法：python3 -B experiments/reading/audit_reader.py <读者目录> <这位读者的完整记录（子代理留下的逐行 JSON）> [更多 目录 记录 …]
只输出汇总：各类调用的次数、放大了多少次、所有不在允许范围内的调用。只用标准库。
允许的：Read 自己目录里的 rules.txt、reading-blank.csv、reading.csv、<图号>.png、views/ 下工具写出的图（放大、整图加刻度、横条、复看等）；Write/Edit 自己目录里的 reading.csv；
Bash 里只出现自己目录这一个绝对路径、只运行 python3 tool.py（可以先 cd 进自己的目录）。
"""
import json
import re
import sys
from pathlib import Path


def calls(obj):
    if isinstance(obj, dict):
        if obj.get("type") == "tool_use" and "name" in obj:
            yield obj
        for v in obj.values():
            yield from calls(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from calls(v)


def audit(reader, transcript):
    home = str(Path(reader).resolve())
    seen, counts, outside, programs, crops, images = set(), {}, [], {}, 0, set()
    for line in Path(transcript).read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        for call in calls(record):
            if call.get("id") in seen:
                continue
            seen.add(call.get("id"))
            name, arg = call["name"], call.get("input", {})
            counts[name] = counts.get(name, 0) + 1
            if name == "Read":
                p = str(arg.get("file_path", ""))
                rel = p[len(home) + 1:] if p.startswith(home + "/") else None
                ok = rel is not None and (rel in ("rules.txt", "reading-blank.csv", "reading.csv") or re.fullmatch(r"[0-9a-f]{12}\.png", rel) or re.fullmatch(r"views/[0-9a-f]{12}-[A-Za-z0-9_-]+\.png", rel))
                if ok and re.fullmatch(r"[0-9a-f]{12}\.png", rel):
                    images.add(rel)
                if not ok:
                    outside.append({"tool": name, "target": p})
            elif name in ("Write", "Edit"):
                p = str(arg.get("file_path", ""))
                if p != home + "/reading.csv":
                    outside.append({"tool": name, "target": p})
            elif name == "Bash":
                c = str(arg.get("command", ""))
                paths = set(re.findall(r'/(?:Users|private|tmp|var|etc|home|opt|usr|bin)[^\s"\';|&)]*', c))
                stray = [p for p in paths if not p.startswith(home)]
                if stray or "../" in c or "/.." in c or "~" in c:
                    outside.append({"tool": name, "target": c[:300]})
                for segment in re.split(r"&&|\|\||;|\||\n", c):
                    words = segment.split()
                    if not words:
                        continue
                    first = words[0]
                    if first in ("python3", "python") and len(words) > 1 and words[1] == "tool.py":
                        first = "tool.py " + (words[2] if len(words) > 2 else "")
                        crops += first == "tool.py crop"
                    programs[first] = programs.get(first, 0) + 1
            else:
                outside.append({"tool": name, "target": json.dumps(arg, ensure_ascii=False)[:200]})
    return {"reader": Path(reader).name, "tool_calls": counts, "shell_words": programs, "images_opened": len(images), "crops": crops, "outside_allowed": outside}


def main():
    args = sys.argv[1:]
    report = [audit(args[i], args[i + 1]) for i in range(0, len(args), 2)]
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
