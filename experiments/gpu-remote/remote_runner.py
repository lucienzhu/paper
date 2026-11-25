"""从本机经 ComfyUI 的网页接口提交 GPU 批次。不登录主机，不经手任何密码。

提交与核对用的是 11 月 15 日 GPU 日的 queue_runner.run_one（按摘要锁定，一个字不改）：
每份只提交一次；执行图须与请求一致；采样节点（10）不得命中缓存；只许一张输出图；
存 request.json、ack.json、history.json 和原图。本程序只在它前后加远程所需的几步：
主机只读检查、上传输入图并回读核对、提交前确认主机队列为空、每份请求一个只建一次的目录、
出错即停、事后按主机记录对账（对账从不重新提交）。

用法（仓库根目录；地址是作者开的 SSH 隧道或 AutoDL 自定义服务地址）：
  python3 -B experiments/gpu-remote/remote_runner.py make-batch --manifest <登记清单> --requests-dir <请求目录> \
      --files-dir <输入图目录> [--files-dir <遮罩目录>] --orders 1,2 --name <批名> --registration <登记文件> --write <批次单>
  python3 -B experiments/gpu-remote/remote_runner.py check     --comfy <地址> --batch <批次单> --out <输出目录>
  python3 -B experiments/gpu-remote/remote_runner.py upload    --comfy <地址> --batch <批次单> --out <输出目录>
  python3 -B experiments/gpu-remote/remote_runner.py run       --comfy <地址> --batch <批次单> --out <输出目录>
  python3 -B experiments/gpu-remote/remote_runner.py reconcile --comfy <地址> --batch <批次单> --out <输出目录>
  python3 -B experiments/gpu-remote/remote_runner.py compare   --batch <环境核对批次单> --out <输出目录>
在输出目录里放一个名为 STOP 的文件，run 会在当前这份做完后停下。
退出码：0 做完；1 检查没过；2 出错停下，要先对账；3 按 STOP 停下。
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LEGACY = ROOT / "experiments/gpu-day-20261115"
LEGACY_RUNNER = "2ae33a85b2ead0bcea980be5382dffda007f342ddf3ecdcfdf36ff178211439a"
sys.path.insert(0, str(LEGACY))
sys.path.insert(0, str(HERE))
from queue_runner import call, run_one  # noqa: E402  同一个提交与核对程序
import pngread  # noqa: E402

COMMIT = "e8665ca8e4089ab917567cdb491308e1397663d4"
WEIGHTS = json.loads((LEGACY / "weights.json").read_text(encoding="utf-8"))
NEED_FLAGS = ["--disable-all-custom-nodes", "--disable-partner-nodes"]
LOADER_FILES = {"UNETLoader": ("unet_name", "diffusion_models"), "CLIPLoader": ("clip_name", "text_encoders"),
                "VAELoader": ("vae_name", "vae")}
IMAGE_NODES = ("LoadImage", "LoadImageMask")
RECEIPT = "host-receipt.json"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def now():
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def say(msg):
    print(f"{time.strftime('%H:%M:%S')} {msg}", flush=True)


def no_proxy_for_loopback(url):
    host = urllib.parse.urlparse(url).hostname or ""
    if host in ("127.0.0.1", "localhost", "::1"):
        urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))


def get_json(comfy, path, timeout=60):
    return json.loads(call(comfy + path, timeout=timeout))


def view_url(comfy, name, kind="input"):
    return comfy + "/view?" + urllib.parse.urlencode({"filename": name, "type": kind})


# ---------- 批次单 ----------

def load_batch(path):
    batch = json.loads(Path(path).read_bytes())
    if batch.get("schema") != "gpu-remote-batch-v1":
        raise SystemExit(f"{path} 不是批次单")
    man = ROOT / batch["registered_manifest"]
    if sha(man.read_bytes()) != batch["registered_manifest_sha256"]:
        raise SystemExit(f"登记清单 {batch['registered_manifest']} 在批次单写定以后改过")
    return batch


def graph_files(graph):
    return [v["inputs"]["image"] for v in graph.values() if v["class_type"] in IMAGE_NODES]


def request_bytes(batch, row):
    raw = (ROOT / batch["requests_dir"] / row["file"]).read_bytes()
    if sha(raw) != row["sha256"]:
        raise SystemExit(f"{row['file']} 与登记的摘要不符")
    graph = json.loads(raw)["prompt"]
    if graph["12"]["inputs"]["filename_prefix"] != row["id"] or graph["10"]["inputs"]["seed"] != row["seed"]:
        raise SystemExit(f"{row['file']} 的保存前缀或种子与批次单不符")
    return raw, graph


def local_file(batch, name):
    want = batch["files"][name]
    for d in batch["files_dirs"]:
        p = ROOT / d / name
        if p.is_file() and sha(p.read_bytes()) == want:
            return p
    raise SystemExit(f"本机找不到摘要相符的 {name}")


def make_batch(a):
    man_path = Path(a.manifest)
    man = json.loads(man_path.read_bytes())
    known = {x["input"]: x["sha256"] for x in man.get("inputs", [])}
    known.update({x["mask"]: x["sha256"] for x in man.get("masks", [])})
    orders = {int(x) for x in a.orders.split(",")}
    rows, files = [], {}
    for r in man["requests"]:
        if r["order"] not in orders:
            continue
        name = "%02d-%s.json" % (r["order"], r["id"])
        raw = (Path(a.requests_dir) / name).read_bytes()
        if sha(raw) != r["request_sha256"]:
            raise SystemExit(f"{name} 与登记清单的摘要不符")
        graph = json.loads(raw)["prompt"]
        seed = graph["10"]["inputs"]["seed"]
        if graph["12"]["inputs"]["filename_prefix"] != r["id"] or ("seed" in r and r["seed"] != seed):
            raise SystemExit(f"{name} 的保存前缀或种子与登记清单不符")
        for f in graph_files(graph):
            if f not in known:
                raise SystemExit(f"{name} 用了登记清单里没有的文件 {f}")
            files[f] = known[f]
        rows.append({"file": name, "id": r["id"], "seed": seed, "sha256": r["request_sha256"]})
    if not rows:
        raise SystemExit("没有选中任何请求")
    rel = lambda p: os.path.relpath(Path(p).resolve(), ROOT)
    batch = {"schema": "gpu-remote-batch-v1", "batch": a.name, "registration": a.registration,
             "registered_manifest": rel(man_path), "registered_manifest_sha256": sha(man_path.read_bytes()),
             "requests_dir": rel(a.requests_dir), "files_dirs": [rel(d) for d in a.files_dir],
             "on_error": a.on_error, "requests": rows, "files": dict(sorted(files.items()))}
    for name in batch["files"]:
        local_file(batch, name)
    Path(a.write).write_text(json.dumps(batch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"写出 {a.write}：{len(rows)} 份请求、{len(files)} 个输入文件")


# ---------- 主机只读检查 ----------

def combo_options(spec):
    """object_info 里的下拉选项：旧写法 [[选项…], {…}]，新写法 ["COMBO", {"options": [...]}]。"""
    if isinstance(spec, list) and spec:
        if isinstance(spec[0], list):
            return spec[0]
        if spec[0] == "COMBO" and len(spec) > 1 and isinstance(spec[1], dict):
            return spec[1].get("options")
    return None


def host_check(comfy, batch):
    problems, record = [], {"at": now(), "comfy": comfy}
    stats = get_json(comfy, "/system_stats", 30)
    record["system_stats"] = stats
    argv = stats.get("system", {}).get("argv", [])
    for flag in NEED_FLAGS:
        if flag not in argv:
            problems.append(f"启动参数里没有 {flag}（实际：{' '.join(argv)}）")
    graphs = [request_bytes(batch, r)[1] for r in batch["requests"]]
    info = get_json(comfy, "/object_info", 180)
    used = sorted({v["class_type"] for g in graphs for v in g.values()})
    record["object_info"] = {c: info.get(c) for c in used}
    for c in used:
        if c not in info:
            problems.append(f"主机上没有节点 {c}")
    for g in graphs:
        for nid, v in g.items():
            spec = (info.get(v["class_type"]) or {}).get("input", {})
            specs = {**spec.get("required", {}), **spec.get("optional", {})}
            for key, val in v["inputs"].items():
                if isinstance(val, list):
                    continue  # 连线
                if v["class_type"] in IMAGE_NODES and key == "image":
                    continue  # 输入图在 upload 一步回读核对
                base = key.split(".")[0]  # 自动增长的输入写成 images.image_1，在节点表里登记的是 images
                opts = combo_options(specs.get(key))
                if key not in specs and base not in specs and v["class_type"] in info:
                    problems.append(f"{g['12']['inputs']['filename_prefix']} 节点 {nid}（{v['class_type']}）没有输入项 {key}")
                elif opts is not None and val not in opts:
                    problems.append(f"{g['12']['inputs']['filename_prefix']} 节点 {nid} 的 {key}={val} 不在主机的选项里")
    queue = get_json(comfy, "/queue", 30)
    record["queue"] = {k: len(v) for k, v in queue.items()}
    if queue.get("queue_running") or queue.get("queue_pending"):
        problems.append(f"主机队列不空：{record['queue']}")
    try:
        receipt = json.loads(call(view_url(comfy, RECEIPT), timeout=60))
    except (urllib.error.URLError, ValueError) as exc:
        receipt = None
        problems.append(f"读不到主机回执 {RECEIPT}（{exc}）：要先在主机上跑完 host-setup.sh")
    record["receipt"] = receipt
    if receipt:
        if receipt.get("commit") != COMMIT:
            problems.append(f"ComfyUI 版本是 {receipt.get('commit')}，应为 {COMMIT}")
        if receipt.get("sources") != WEIGHTS["sources"]:
            problems.append("ComfyUI 四个源文件的摘要与 11 月 12、15 日的记录不符")
        measured = {w["path"]: w for w in receipt.get("weights", [])}
        expected = {w["path"]: w for w in WEIGHTS["weights"]}
        for g in graphs:
            for v in g.values():
                if v["class_type"] in LOADER_FILES:
                    key, folder = LOADER_FILES[v["class_type"]]
                    path = f"{folder}/{v['inputs'][key]}"
                    if path not in expected:
                        problems.append(f"请求用的权重 {path} 不在登记的权重表里")
                    elif measured.get(path, {}).get("sha256") != expected[path]["sha256"]:
                        problems.append(f"主机上 {path} 的实测摘要与登记不符或没测")
        if not receipt.get("weights_verified"):
            problems.append("主机回执没有写明三份权重已逐份核对摘要")
    record["problems"] = sorted(set(problems))
    return record


def write_check(out, record):
    out.mkdir(parents=True, exist_ok=True)
    name = "host-check-" + time.strftime("%Y%m%d-%H%M%S") + ".json"
    (out / name).write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return name


# ---------- 上传与回读 ----------

def upload_one(comfy, name, data):
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"type\"\r\n\r\ninput\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(comfy + "/upload/image", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


def verify_remote(comfy, batch, names):
    bad = []
    for name in names:
        try:
            got = sha(call(view_url(comfy, name), timeout=180))
        except urllib.error.URLError as exc:
            bad.append(f"{name}：读不回（{exc}）")
            continue
        if got != batch["files"][name]:
            bad.append(f"{name}：主机上的文件摘要 {got[:12]}… 与登记 {batch['files'][name][:12]}… 不符")
    return bad


def upload(a):
    batch = load_batch(a.batch)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for name in batch["files"]:
        data = local_file(batch, name).read_bytes()
        try:
            resp = upload_one(a.comfy, name, data)  # 不覆盖：主机上已有同名不同内容的文件时，会改名存，这里就报错
        except urllib.error.URLError as exc:
            raise SystemExit(f"上传 {name} 失败：{exc}")
        if resp.get("name") != name or resp.get("subfolder", "") != "":
            raise SystemExit(f"{name}：主机上已有同名但内容不同的文件（主机回 {resp}），停下，不覆盖")
        rows.append({"file": name, "sha256": batch["files"][name], "bytes": len(data)})
    bad = verify_remote(a.comfy, batch, batch["files"])
    record = {"at": now(), "comfy": a.comfy, "batch": a.batch, "uploaded": rows, "readback_problems": bad}
    (out / "uploads.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if bad:
        print("\n".join(bad))
        sys.exit(1)
    print(f"上传并回读核对 {len(rows)} 个文件，全部一致")


# ---------- 提交 ----------

def read_journal(out):
    j = out / "progress.jsonl"
    return [json.loads(x) for x in j.read_text(encoding="utf-8").splitlines()] if j.exists() else []


def append_journal(out, rec):
    with (out / "progress.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        fh.flush()
        os.fsync(fh.fileno())


def terminal_error(od):
    """主机已明确报执行错（参数类错误），才算单份的失败；其余都当状态不明，要对账。"""
    h = od / "history.json"
    if not h.is_file():
        return False
    hist = json.loads(h.read_bytes())
    if hist.get("status", {}).get("status_str") != "error":
        return False
    msgs = [m for kind, m in hist["status"].get("messages", []) if kind == "execution_error"]
    return bool(msgs) and all(str(m.get("exception_type", "")).split(".")[-1] in {"ValueError", "TypeError"} for m in msgs)


def run(a):
    if not __debug__:
        raise SystemExit("不能用 python -O 运行：核对靠 assert")
    if sha(Path(run_one.__code__.co_filename).read_bytes()) != LEGACY_RUNNER:
        raise SystemExit("queue_runner.py 与 11 月 15 日的版本不符")
    batch = load_batch(a.batch)
    out = Path(a.out)
    record = host_check(a.comfy, batch)
    name = write_check(out, record)
    if record["problems"]:
        print("主机检查没过，不提交（" + name + "）：\n  " + "\n  ".join(record["problems"]))
        sys.exit(1)
    bad = verify_remote(a.comfy, batch, batch["files"])
    if bad:
        print("主机上的输入文件不对，不提交：\n  " + "\n  ".join(bad))
        sys.exit(1)
    past = {r["id"]: r for r in read_journal(out)}
    inputs_dir = ROOT / batch["files_dirs"][0]
    done = 0
    for row in batch["requests"]:
        rid = row["id"]
        if past.get(rid, {}).get("state") in ("completed", "reconciled"):
            done += 1
            continue
        if rid in past:
            say(f"{rid} 有未结的记录（{past[rid]['state']}），先对账")
            sys.exit(2)
        od = out / rid
        if od.exists():
            say(f"{rid} 的目录已存在，可能提交过，先对账")
            sys.exit(2)
        if (out / "STOP").exists():
            say("见到 STOP，停在这里")
            sys.exit(3)
        raw, graph = request_bytes(batch, row)
        for f in graph_files(graph):
            local_file(batch, f)
        for v in graph.values():  # run_one 只在第一个目录里查 LoadImage 的输入
            if v["class_type"] == "LoadImage" and not (inputs_dir / v["inputs"]["image"]).is_file():
                raise SystemExit(f"{rid} 的输入图 {v['inputs']['image']} 要放在 {batch['files_dirs'][0]}")
        q = get_json(a.comfy, "/queue", 30)
        if q.get("queue_running") or q.get("queue_pending"):
            say(f"主机队列里有别的任务，{rid} 不提交")
            sys.exit(2)
        od.mkdir(parents=True)  # 只建一次：目录在，就说明可能提交过，不再提交
        path = ROOT / batch["requests_dir"] / row["file"]
        say(f"提交 {rid}（种子 {row['seed']}）")
        try:
            rec = run_one(a.comfy, inputs_dir, path, od, a.timeout)
            assert rec["request_sha256"] == row["sha256"] and rec["id"] == rid, "回执与批次单不符"
            rec["state"] = "completed"
        except Exception as exc:
            (od / "error.txt").write_text(traceback.format_exc(), encoding="utf-8")
            rec = {"id": rid, "state": "isolated_error" if terminal_error(od) else "stop_unknown_or_system",
                   "error": f"{type(exc).__name__}: {exc}", "at": now()}
            try:
                (od / "queue-after-error.json").write_bytes(call(a.comfy + "/queue", timeout=10))
            except OSError:
                pass
        rec["batch"] = batch["batch"]
        rec["file"] = row["file"]
        append_journal(out, rec)
        say(f"{rec['state']} {rid}" + (f" {rec.get('seconds')} 秒" if rec["state"] == "completed" else f"：{rec['error']}"))
        if rec["state"] != "completed":
            if batch["on_error"] == "stop" or rec["state"] == "stop_unknown_or_system":
                say("按登记出错即停。先看 error.txt，再跑 reconcile；不重试、不换种子")
                sys.exit(2)
        else:
            done += 1
    say(f"批次单里 {len(batch['requests'])} 份都有了结果，完成 {done} 份")


# ---------- 对账（只读主机记录，从不重新提交） ----------

def validate(req_graph, hist):
    """与 queue_runner.run_one 的四条核对逐条相同。"""
    assert hist["status"]["status_str"] == "success", f"终态 {hist['status']['status_str']}"
    assert {k: (v["class_type"], v["inputs"]) for k, v in hist["prompt"][2].items()} == \
           {k: (v["class_type"], v["inputs"]) for k, v in req_graph.items()}, "执行图与请求不一致"
    cached = [n for kind, d in hist["status"]["messages"] if kind == "execution_cached" for n in d.get("nodes", [])]
    assert "10" not in cached, "采样节点命中缓存"
    imgs = [im for node in hist["outputs"].values() for im in node.get("images", [])]
    assert len(imgs) == 1, f"输出图数量 {len(imgs)}"
    return imgs[0]


def reconcile(a):
    batch = load_batch(a.batch)
    out = Path(a.out)
    past = {r["id"]: r for r in read_journal(out)}
    queue = get_json(a.comfy, "/queue", 30)
    prefix = lambda g: (g.get("12") or {}).get("inputs", {}).get("filename_prefix")
    waiting = {prefix(item[2]) for k in ("queue_running", "queue_pending") for item in queue.get(k, [])}
    history = get_json(a.comfy, "/history", 120)
    by_prefix = {}
    for pid, h in history.items():
        by_prefix.setdefault(prefix(h.get("prompt", [None, None, {}])[2]), []).append((pid, h))
    open_items = 0
    for row in batch["requests"]:
        rid = row["id"]
        od = out / rid
        state = past.get(rid, {}).get("state")
        if state in ("completed", "reconciled") or not od.exists():
            continue
        open_items += 1
        raw, graph = request_bytes(batch, row)
        ack_pid = None
        if (od / "ack.json").is_file():
            ack_pid = json.loads((od / "ack.json").read_bytes()).get("prompt_id")
        found = [x for x in by_prefix.get(rid, []) if ack_pid in (None, x[0])]
        rec = {"id": rid, "at": now(), "batch": batch["batch"], "file": row["file"], "prompt_id": ack_pid}
        if rid in waiting:
            rec["state"] = "still_queued"
            say(f"{rid} 还在主机队列里，等它跑完再对账")
            continue
        if len(found) > 1:
            rec.update(state="ambiguous", note=f"主机上有 {len(found)} 条同名记录")
        elif not found:
            rec.update(state="not_on_host", note="主机历史里没有这份请求。主机若重启过，历史会清空；"
                       "要不要重交由作者定，重交前把目录改名留档")
        else:
            pid, hist = found[0]
            (od / "history-reconciled.json").write_text(json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")
            try:
                im = validate(graph, hist)
                png = call(f"{a.comfy}/view?" + urllib.parse.urlencode(
                    {"filename": im["filename"], "subfolder": im.get("subfolder", ""), "type": im.get("type", "output")}), timeout=180)
                if not (od / "request.json").is_file():
                    (od / "request.json").write_bytes(raw)
                (od / f"{rid}.png").write_bytes(png)
                rec.update(state="reconciled", prompt_id=pid, request_sha256=sha(raw), png_sha256=sha(png))
            except AssertionError as exc:
                rec.update(state="isolated_error" if hist.get("status", {}).get("status_str") == "error" else "failed_check",
                           prompt_id=pid, error=str(exc))
        append_journal(out, rec)
        say(f"{rid}：{rec['state']}")
    if not open_items:
        say("没有要对账的请求")


# ---------- 环境核对：重出的图与归档原图比 ----------

def git_blob(path):
    return subprocess.run(["git", "-C", str(ROOT), "show", f"HEAD:{path}"], check=True, capture_output=True).stdout


def diff_stats(a_png, b_png):
    wa, ha, pa = pngread.rgb(a_png)
    wb, hb, pb = pngread.rgb(b_png)
    if (wa, ha) != (wb, hb):
        return {"same_size": False, "size_a": [wa, ha], "size_b": [wb, hb]}
    diffs = [abs(x - y) for x, y in zip(pa, pb)]
    n = len(diffs)
    hist = [0] * 256
    for d in diffs:
        hist[d] += 1
    acc, p99 = 0, 0
    for v, c in enumerate(hist):
        acc += c
        if acc >= 0.99 * n:
            p99 = v
            break
    over8 = sum(1 for i in range(0, n, 3) if max(diffs[i], diffs[i + 1], diffs[i + 2]) > 8)
    return {"same_size": True, "identical_pixels": hist[0] == n, "mean_abs_diff": round(sum(diffs) / n, 4),
            "p99_abs_diff": p99, "max_abs_diff": max(diffs), "share_pixels_over_8": round(over8 / (n // 3), 5)}


def compare(a):
    batch = load_batch(a.batch)
    out = Path(a.out)
    man = json.loads((ROOT / batch["registered_manifest"]).read_bytes())
    rows = {r["id"]: r for r in man["requests"]}
    results, verdicts = [], []
    for row in batch["requests"]:
        rid = row["id"]
        spec = rows[rid]["compare"]
        new = (out / rid / f"{rid}.png").read_bytes()
        orig = git_blob(spec["original"]["path"])
        neigh = git_blob(spec["neighbour"]["path"])
        assert sha(orig) == spec["original"]["sha256"] and sha(neigh) == spec["neighbour"]["sha256"], "归档原图摘要不符"
        same = diff_stats(new, orig)
        control = diff_stats(orig, neigh)
        if not same.get("same_size"):
            verdict = "明显不同"
        elif same["identical_pixels"]:
            verdict = "逐像素相同"
        elif same["mean_abs_diff"] <= spec["rule_ratio"] * control["mean_abs_diff"]:
            verdict = "只有数值差异"
        else:
            verdict = "明显不同"
        verdicts.append(verdict)
        results.append({"id": rid, "original": spec["original"], "neighbour": spec["neighbour"],
                        "new_png_sha256": sha(new), "new_vs_original": same, "original_vs_neighbour": control,
                        "verdict": verdict})
        say(f"{rid}：{verdict}（同种子平均差 {same.get('mean_abs_diff')}，相邻种子 {control.get('mean_abs_diff')}）")
    overall = "停：先查版本和权重" if "明显不同" in verdicts else "通过"
    record = {"at": now(), "rule": man["rule"], "results": results, "overall": overall}
    (out / "env-check.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    say(f"环境核对：{overall}")
    sys.exit(0 if overall == "通过" else 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    mb = sub.add_parser("make-batch")
    mb.add_argument("--manifest", required=True)
    mb.add_argument("--requests-dir", required=True)
    mb.add_argument("--files-dir", action="append", required=True)
    mb.add_argument("--orders", required=True)
    mb.add_argument("--name", required=True)
    mb.add_argument("--registration", required=True)
    mb.add_argument("--on-error", choices=["stop", "continue-isolated"], default="stop")
    mb.add_argument("--write", required=True)
    for name in ("check", "upload", "run", "reconcile"):
        p = sub.add_parser(name)
        p.add_argument("--comfy", required=True)
        p.add_argument("--batch", required=True)
        p.add_argument("--out", required=True)
        if name == "run":
            p.add_argument("--timeout", type=int, default=1200)
    cp = sub.add_parser("compare")
    cp.add_argument("--batch", required=True)
    cp.add_argument("--out", required=True)
    a = ap.parse_args()
    if getattr(a, "comfy", None):
        a.comfy = a.comfy.rstrip("/")
        no_proxy_for_loopback(a.comfy)
    if a.cmd == "make-batch":
        make_batch(a)
    elif a.cmd == "check":
        batch = load_batch(a.batch)
        record = host_check(a.comfy, batch)
        name = write_check(Path(a.out), record)
        if record["problems"]:
            print("主机检查没过（" + name + "）：\n  " + "\n  ".join(record["problems"]))
            sys.exit(1)
        print(f"主机检查通过（{name}）")
    elif a.cmd == "upload":
        upload(a)
    elif a.cmd == "run":
        run(a)
    elif a.cmd == "reconcile":
        reconcile(a)
    elif a.cmd == "compare":
        compare(a)


if __name__ == "__main__":
    main()
