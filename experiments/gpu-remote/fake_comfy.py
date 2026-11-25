"""测试用的假 ComfyUI：只模仿 remote_runner 用到的几个接口，不出真图。

python3 -B experiments/gpu-remote/fake_comfy.py --port 18190 [--fail-prefix ID] [--drop-prefix ID]
    [--cache-sampler-prefix ID] [--argv-missing] [--receipt bad|none] [--echo-dir 目录 --noise 2]
--fail-prefix：这份请求以执行错结束（ValueError）。--drop-prefix：收下这份请求却不回话，模拟回执丢失。
--echo-dir：输出图取该目录里同名原图的像素（去掉 ENV- 前缀），--noise 给每个通道加 ±n 的扰动，用来试环境核对。
"""
import argparse
import hashlib
import json
import random
import sys
import threading
import time
import urllib.parse
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pngread  # noqa: E402

ROOT = HERE.parents[1]
WEIGHTS = json.loads((ROOT / "experiments/gpu-day-20261115/weights.json").read_text(encoding="utf-8"))
COMMIT = "e8665ca8e4089ab917567cdb491308e1397663d4"


def combo(options):
    return [options, {}]


def object_info(inputs):
    images = sorted(n for n in inputs if n.endswith(".png"))
    return {
        "UNETLoader": {"input": {"required": {"unet_name": combo(["qwen_image_2.1_bf16.safetensors"]),
                                              "weight_dtype": combo(["default", "fp8_e4m3fn"])}}},
        "CLIPLoader": {"input": {"required": {"clip_name": combo(["qwen3vl_8b_bf16.safetensors"]),
                                              "type": combo(["stable_diffusion", "qwen_image"])},
                                 "optional": {"device": combo(["default", "cpu"])}}},
        "VAELoader": {"input": {"required": {"vae_name": combo(["qwen_image_2.1_vae_bf16.safetensors"])}}},
        "TextEncodeQwenImage21": {"input": {"required": {"clip": ["CLIP", {}], "prompt": ["STRING", {}],
                                                         "negative_prompt": ["STRING", {}], "resolution": ["INT", {}]},
                                            "optional": {"vae": ["VAE", {}], "images": ["COMFY_AUTOGROW_V3", {}]}}},
        "KSampler": {"input": {"required": {"model": ["MODEL", {}], "positive": ["CONDITIONING", {}],
                                            "negative": ["CONDITIONING", {}], "latent_image": ["LATENT", {}],
                                            "seed": ["INT", {}], "steps": ["INT", {}], "cfg": ["FLOAT", {}],
                                            "sampler_name": combo(["euler", "dpmpp_2m"]),
                                            "scheduler": combo(["simple", "karras"]), "denoise": ["FLOAT", {}]}}},
        "VAEDecode": {"input": {"required": {"samples": ["LATENT", {}], "vae": ["VAE", {}]}}},
        "VAEEncode": {"input": {"required": {"pixels": ["IMAGE", {}], "vae": ["VAE", {}]}}},
        "SaveImage": {"input": {"required": {"images": ["IMAGE", {}], "filename_prefix": ["STRING", {}]}}},
        "LoadImage": {"input": {"required": {"image": combo(images)}}},
        "LoadImageMask": {"input": {"required": {"image": combo(images),
                                                 "channel": combo(["alpha", "red", "green", "blue"])}}},
        "SetLatentNoiseMask": {"input": {"required": {"samples": ["LATENT", {}], "mask": ["MASK", {}]}}},
        "EmptySD3LatentImage": {"input": {"required": {"width": ["INT", {}], "height": ["INT", {}],
                                                       "batch_size": ["INT", {}]}}},
    }


class State:
    def __init__(self, a):
        self.a = a
        self.lock = threading.Lock()
        self.inputs, self.outputs, self.history = {}, {}, {}
        self.running, self.pending = [], []
        self.posts = []
        self.number = 0
        if a.receipt != "none":
            receipt = {"commit": COMMIT if a.receipt == "good" else "0000000", "sources": WEIGHTS["sources"],
                       "weights": [{"path": w["path"], "sha256": w["sha256"], "bytes": w["bytes"]}
                                   for w in WEIGHTS["weights"][:3]], "weights_verified": True}
            self.inputs["host-receipt.json"] = json.dumps(receipt).encode()
        for spec in a.preload or []:
            name, path = spec.split("=", 1)
            self.inputs[name] = Path(path).read_bytes()
        if a.input_directory:  # 像真 ComfyUI 一样读输入目录里已有的文件（host-setup.sh 的回执就放在这里）
            for p in Path(a.input_directory).iterdir():
                if p.is_file():
                    self.inputs[p.name] = p.read_bytes()


def make_png(state, prefix, seed):
    a = state.a
    if a.echo_dir:
        src = Path(a.echo_dir) / (prefix[4:] if prefix.startswith("ENV-") else prefix)
        w, h, px = pngread.rgb(src.with_suffix(".png").read_bytes())
        if a.noise:
            rnd = random.Random(seed)
            px = bytes(min(255, max(0, v + rnd.randint(-a.noise, a.noise))) for v in px)
        return pngread.encode_rgb(w, h, px, {"prompt": "fake"})
    rnd = random.Random(seed)
    px = bytes(rnd.randrange(256) for _ in range(16 * 16 * 3))
    return pngread.encode_rgb(16, 16, px, {"prompt": "fake"})


def worker(state):
    while True:
        time.sleep(0.05)
        with state.lock:
            if state.running or not state.pending:
                continue
            item = state.pending.pop(0)
            state.running.append(item)
        number, pid, graph = item[0], item[1], item[2]
        prefix = graph["12"]["inputs"]["filename_prefix"]
        seed = graph["10"]["inputs"]["seed"]
        time.sleep(state.a.seconds)
        messages = [["execution_start", {"prompt_id": pid}]]
        cached = ["10"] if prefix == state.a.cache_sampler_prefix else []
        messages.append(["execution_cached", {"nodes": cached, "prompt_id": pid}])
        if prefix == state.a.fail_prefix:
            messages.append(["execution_error", {"prompt_id": pid, "node_id": "10", "exception_type": "ValueError",
                                                 "exception_message": "fake failure"}])
            entry = {"prompt": item, "outputs": {}, "status": {"status_str": "error", "completed": False,
                                                                "messages": messages}}
        else:
            name = f"{prefix}_00001_.png"
            with state.lock:
                state.outputs[name] = make_png(state, prefix, seed)
            messages.append(["execution_success", {"prompt_id": pid}])
            entry = {"prompt": item, "outputs": {"12": {"images": [{"filename": name, "subfolder": "", "type": "output"}]}},
                     "status": {"status_str": "success", "completed": True, "messages": messages}}
        with state.lock:
            state.history[pid] = entry
            state.running.remove(item)


def parse_multipart(body, ctype):
    boundary = ctype.split("boundary=", 1)[1].encode()
    fields = {}
    for part in body.split(b"--" + boundary):
        if b"\r\n\r\n" not in part:
            continue
        head, data = part.split(b"\r\n\r\n", 1)
        data = data[:-2] if data.endswith(b"\r\n") else data
        disp = [l for l in head.decode().split("\r\n") if l.lower().startswith("content-disposition")][0]
        attrs = dict(x.strip().split("=", 1) for x in disp.split(";")[1:])
        name = attrs["name"].strip('"')
        fields[name] = (attrs.get("filename", "").strip('"') or None, data)
    return fields


def handler(state):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def send(self, code, body, ctype="application/json"):
            if isinstance(body, (dict, list)):
                body = json.dumps(body).encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            u = urllib.parse.urlparse(self.path)
            q = dict(urllib.parse.parse_qsl(u.query))
            with state.lock:
                if u.path == "/system_stats":
                    argv = ["main.py", "--listen", "127.0.0.1", "--port", "8189", "--cache-classic"]
                    if not state.a.argv_missing:
                        argv += ["--disable-all-custom-nodes", "--disable-partner-nodes"]
                    return self.send(200, {"system": {"argv": argv, "comfyui_version": "fake"},
                                           "devices": [{"name": "fake"}]})
                if u.path == "/object_info":
                    return self.send(200, object_info(state.inputs))
                if u.path == "/queue":
                    return self.send(200, {"queue_running": state.running, "queue_pending": state.pending})
                if u.path == "/history":
                    return self.send(200, state.history)
                if u.path.startswith("/history/"):
                    pid = u.path.split("/", 2)[2]
                    return self.send(200, {pid: state.history[pid]} if pid in state.history else {})
                if u.path == "/view":
                    store = state.inputs if q.get("type") == "input" else state.outputs
                    if q.get("filename") in store:
                        return self.send(200, store[q["filename"]], "application/octet-stream")
                    return self.send(404, b"", "text/plain")
                if u.path == "/posts":
                    return self.send(200, state.posts)
            self.send(404, b"", "text/plain")

        def do_POST(self):
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
            u = urllib.parse.urlparse(self.path)
            if u.path == "/upload/image":
                fields = parse_multipart(body, self.headers["Content-Type"])
                fname, data = fields["image"]
                with state.lock:
                    name = fname
                    i = 1
                    while name in state.inputs and state.inputs[name] != data and "overwrite" not in fields:
                        stem, ext = fname.rsplit(".", 1)
                        name = f"{stem} ({i}).{ext}"
                        i += 1
                    state.inputs[name] = data
                return self.send(200, {"name": name, "subfolder": "", "type": "input"})
            if u.path == "/prompt":
                req = json.loads(body)
                graph = req["prompt"]
                prefix = graph["12"]["inputs"]["filename_prefix"]
                with state.lock:
                    state.posts.append(prefix)
                    missing = [v["inputs"]["image"] for v in graph.values()
                               if v["class_type"] in ("LoadImage", "LoadImageMask") and v["inputs"]["image"] not in state.inputs]
                    if missing:
                        return self.send(400, {"error": "missing input", "node_errors": missing})
                    state.number += 1
                    pid = str(uuid.uuid4())
                    state.pending.append([state.number, pid, graph, {}, ["12"]])
                if prefix == state.a.drop_prefix:
                    self.close_connection = True
                    self.connection.close()
                    return
                return self.send(200, {"prompt_id": pid, "number": state.number, "node_errors": {}})
            self.send(404, b"", "text/plain")
    return H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, required=True)
    ap.add_argument("--fail-prefix")
    ap.add_argument("--drop-prefix")
    ap.add_argument("--cache-sampler-prefix")
    ap.add_argument("--argv-missing", action="store_true")
    ap.add_argument("--receipt", choices=["good", "bad", "none"], default="good")
    ap.add_argument("--echo-dir")
    ap.add_argument("--noise", type=int, default=0)
    ap.add_argument("--seconds", type=float, default=0.1)
    ap.add_argument("--preload", action="append", help="名字=本地文件，测试同名冲突用")
    ap.add_argument("--input-directory")
    a, _ = ap.parse_known_args()  # 冒充 main.py 时，ComfyUI 的其余启动参数忽略
    state = State(a)
    threading.Thread(target=worker, args=(state,), daemon=True).start()
    ThreadingHTTPServer(("127.0.0.1", a.port), handler(state)).serve_forever()


if __name__ == "__main__":
    main()
