"""remote_runner 的离线测试：对着假 ComfyUI 跑一遍正常、出错、回执丢失、缓存、检查不过、同名冲突、STOP 和环境核对。

运行：python3 -B experiments/gpu-remote/test_remote.py   （仓库根目录；约一两分钟，不连任何外部服务）
"""
import json
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RUNNER = [sys.executable, "-B", str(HERE / "remote_runner.py")]
# 2026-11-26：原先用 F1 的批次单作夹具；F1 的旧登记随旧数据移进 archive，改用现行的 H3 喷头确认批次单（4 份请求）。
F1 = str(HERE / "batches/02-nozzle-confirm.json")
ENV = str(HERE / "batches/00-env-check.json")
NO_PROXY = urllib.request.build_opener(urllib.request.ProxyHandler({}))
results = []


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class Fake:
    def __init__(self, *args):
        self.port = free_port()
        self.url = f"http://127.0.0.1:{self.port}"
        self.proc = subprocess.Popen([sys.executable, "-B", str(HERE / "fake_comfy.py"), "--port", str(self.port), *args])
        for _ in range(100):
            try:
                NO_PROXY.open(self.url + "/system_stats", timeout=1).read()
                return
            except OSError:
                time.sleep(0.1)
        raise RuntimeError("假服务没起来")

    def posts(self):
        return json.loads(NO_PROXY.open(self.url + "/posts", timeout=5).read())

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.proc.terminate()
        self.proc.wait()


def runner(cmd, fake, batch, out, *extra):
    args = RUNNER + [cmd, "--batch", batch, "--out", str(out)]
    if fake:
        args += ["--comfy", fake.url]
    p = subprocess.run(args + list(extra), capture_output=True, text=True, cwd=ROOT)
    return p.returncode, p.stdout + p.stderr


def journal(out):
    p = Path(out) / "progress.jsonl"
    return [json.loads(x) for x in p.read_text(encoding="utf-8").splitlines()] if p.exists() else []


def expect(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("通过 " if ok else "没过 ") + name + ("" if ok else f"\n{detail}"))


def main():
    tmp = Path(tempfile.mkdtemp(prefix="remote-runner-test-"))
    n_f1 = len(json.loads(Path(F1).read_bytes())["requests"])

    with Fake() as f:
        out = tmp / "normal"
        code, log = runner("check", f, F1, out)
        expect("主机检查通过", code == 0, log)
        code, log = runner("run", f, F1, out)
        expect("没上传就提交会被拦下", code == 1 and not f.posts(), log)
        code, log = runner("upload", f, F1, out)
        expect("上传并回读核对", code == 0, log)
        code, log = runner("run", f, F1, out)
        states = [r["state"] for r in journal(out)]
        expect(f"{n_f1} 份全部完成", code == 0 and states == ["completed"] * n_f1, log)
        pngs = [p for p in out.glob("*/*.png")]
        expect("每份存了原图、请求、回执、历史", len(pngs) == n_f1 and all(
            (p.parent / x).is_file() for p in pngs for x in ("request.json", "ack.json", "history.json")), log)
        before = len(f.posts())
        code, log = runner("run", f, F1, out)
        expect("重跑不重复提交", code == 0 and len(f.posts()) == before == n_f1, log)

    with Fake("--fail-prefix", "E6B-N-confirm-r2") as f:
        out = tmp / "fail"
        runner("upload", f, F1, out)
        code, log = runner("run", f, F1, out)
        states = [(r["id"], r["state"]) for r in journal(out)]
        expect("执行错即停", code == 2 and states == [("E6B-N-confirm-r1", "completed"), ("E6B-N-confirm-r2", "isolated_error")], log)
        code, log = runner("run", f, F1, out)
        expect("有未结记录时不再往下提交", code == 2 and f.posts().count("E6B-N-confirm-r3") == 0, log)

    with Fake("--drop-prefix", "E6B-N-confirm-r1") as f:
        out = tmp / "drop"
        runner("upload", f, F1, out)
        code, log = runner("run", f, F1, out)
        expect("回执丢失即停", code == 2 and journal(out)[-1]["state"] == "stop_unknown_or_system", log)
        time.sleep(1)
        code, log = runner("reconcile", f, F1, out)
        expect("对账按主机历史补回原图", code == 0 and journal(out)[-1]["state"] == "reconciled"
               and (out / "E6B-N-confirm-r1" / "E6B-N-confirm-r1.png").is_file(), log)
        code, log = runner("run", f, F1, out)
        expect("对账后接着跑完，第一份只提交过一次", code == 0 and f.posts().count("E6B-N-confirm-r1") == 1
               and len(f.posts()) == n_f1, log)

    with Fake("--cache-sampler-prefix", "E6B-N-confirm-r1") as f:
        out = tmp / "cache"
        runner("upload", f, F1, out)
        code, log = runner("run", f, F1, out)
        expect("采样节点命中缓存即停", code == 2 and "缓存" in (out / "E6B-N-confirm-r1" / "error.txt").read_text(encoding="utf-8"), log)

    for flag, name in ((["--argv-missing"], "没禁用自定义节点"), (["--receipt", "bad"], "ComfyUI 版本不对"),
                       (["--receipt", "none"], "没有主机回执")):
        with Fake(*flag) as f:
            code, log = runner("check", f, F1, tmp / ("check-" + flag[-1]))
            expect(f"主机检查拦下：{name}", code == 1, log)

    other = ROOT / "experiments/20261126-a6-hexa-ratio/inputs/hexa-points-0.70.png"
    with Fake("--preload", f"hexa-points-1.00.png={other}") as f:
        code, log = runner("upload", f, F1, tmp / "conflict")
        expect("主机上有同名不同内容的文件时不覆盖、停下", code != 0 and "同名" in log, log)

    with Fake() as f:
        out = tmp / "stop"
        runner("upload", f, F1, out)
        (out / "STOP").write_text("")
        code, log = runner("run", f, F1, out)
        expect("见到 STOP 不提交", code == 3 and not f.posts(), log)

    env = json.loads((HERE / "env-check/manifest.json").read_bytes())
    def echo_dir(swap):
        d = Path(tempfile.mkdtemp(prefix="echo-", dir=tmp))
        for r in env["requests"]:
            src = r["compare"]["neighbour" if swap else "original"]["path"]
            data = subprocess.run(["git", "-C", str(ROOT), "show", f"HEAD:{src}"], capture_output=True, check=True).stdout
            (d / (r["id"][4:] + ".png")).write_bytes(data)
        return str(d)
    for args, name, want_code, want in (([], "逐像素相同", 0, "逐像素相同"), (["--noise", "2"], "只有数值差异", 0, "只有数值差异"),
                                        (["swap"], "换成别的种子的图", 1, "明显不同")):
        swap = args == ["swap"]
        with Fake("--echo-dir", echo_dir(swap), *([] if swap else args)) as f:
            out = tmp / ("env-" + name)
            runner("upload", f, ENV, out)
            code, log = runner("run", f, ENV, out)
            ccode, clog = runner("compare", None, ENV, out)
            got = json.loads((out / "env-check.json").read_bytes())["results"] if (out / "env-check.json").exists() else []
            expect(f"环境核对：{name}", code == 0 and ccode == want_code and all(r["verdict"] == want for r in got), log + clog)

    bad = [n for n, ok in results if not ok]
    print(f"\n共 {len(results)} 项，没过 {len(bad)} 项" + ("" if not bad else "：" + "、".join(bad)))
    print("临时目录：" + str(tmp))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
