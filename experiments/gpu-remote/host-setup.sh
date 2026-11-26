#!/bin/bash
# GPU 主机的安装与启动。作者在租到的 AutoDL 主机终端里运行；Claude 不登录主机，不经手密码。
#
#   bash host-setup.sh                         # ComfyUI 只听 127.0.0.1:8189，作者在自己电脑上开 SSH 隧道
#   LISTEN=0.0.0.0 PORT=6006 bash host-setup.sh  # 改用 AutoDL 的“自定义服务”地址时
#
# 做五件事，有一项不对就停，不往下做：
#   1. ComfyUI 固定在 e8665ca8。11 月 15 日 GPU 日的目录还在就沿用，否则从 GitHub 下载这一版的源码包。
#   2. 四份权重（三份生成用，另一份是 A4 两种做法要的控制分支）：旧目录里有就沿用，否则从 ModelScope 按固定版本下载。逐份核对 SHA-256。
#   3. 核对 ComfyUI 四个源文件的摘要，与 11 月 12、15 日的记录比。
#   4. 写主机回执 host-receipt.json（版本、摘要、显卡、torch），放进 ComfyUI 的输入目录，Claude 从网页接口读。
#   5. 照 11 月 15 日的参数启动 ComfyUI（禁用自定义节点和合作方节点），退出就重启。
# 停：touch /root/autodl-tmp/gpu-run/STOP，再 pkill -f ComfyUI-e8665ca8
set -euo pipefail

COMMIT=e8665ca8e4089ab917567cdb491308e1397663d4
REV=b85fad7e67914a86469b382e1a321d1635b3caf8
R=${R:-/root/autodl-tmp/gpu-run}
OLD=${OLD:-/root/autodl-tmp/cloud183-20261016}
LISTEN=${LISTEN:-127.0.0.1}
PORT=${PORT:-8189}
MS="https://modelscope.cn/models/Comfy-Org/Qwen-Image-2.1/resolve/$REV"

WEIGHTS="diffusion_models/qwen_image_2.1_bf16.safetensors 14230280616 89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc
text_encoders/qwen3vl_8b_bf16.safetensors 17534334616 68bdc82bc1b66851162ae656225e7e2068166b603db19bd5d5a3b90eb12669a9
vae/qwen_image_2.1_vae_bf16.safetensors 675509688 bb21f7473051e1ac368515dd3f2e15cd44d7a11748ee8823e1ddca3e4876b7c9
model_patches/qwen_image_2.1_fun_controlnet_union_bf16.safetensors 7550977992 1f9dea8384ba167084f39f624908f1dbf2ea8a223bb4a8108a77dafa9b55bfe1"
SOURCES="comfy_extras/nodes_qwen.py 54ce02aa9e167c0b497ce026ac6b558f539427d2d1ed4fc1fcc2ec8e6bc529da
comfy_extras/nodes_model_patch.py f5e024c0d9ff32f3f364166dd21fae715bd911a6f2caef0fd3ccfd7d9b5d0dc2
comfy/ldm/qwen_image21/model.py a69dff15ff6fa369fab5ca0d3261f8aaf19aaedd3fc66414e20a1cf7df0aa5ac
comfy/supported_models.py 5943d81bc0257b9b72b065a4ecb2f57c51c826e91f86c333b98fbe8a830e0cef"
if [ -n "${TEST_WEIGHTS:-}" ]; then WEIGHTS="$TEST_WEIGHTS"; MS="${TEST_MS:-$MS}"; fi  # 只给离线测试 test_host_setup.sh 用

stop() { echo; echo "停：$*"; echo "把上面这几行发给 Claude。"; exit 1; }
step() { echo; echo "== $* ($(date '+%H:%M:%S'))"; }

mkdir -p "$R"/{inputs,output,temp,user}
cd "$R"
if [ -e "$R/STOP" ]; then stop "$R/STOP 存在。上次停机留下的；确认要重新开始就先 rm $R/STOP"; fi
if curl -s -m 3 "http://127.0.0.1:$PORT/system_stats" >/dev/null 2>&1; then
  stop "端口 $PORT 上已有服务在跑，可能是上次启动的 ComfyUI。不要启动第二个"
fi

step "1/5 ComfyUI $COMMIT"
if [ -f "$OLD/ComfyUI-$COMMIT/main.py" ]; then
  C="$OLD/ComfyUI-$COMMIT"
  echo "沿用 11 月 15 日的目录 $C"
else
  C="$R/ComfyUI-$COMMIT"
  if [ ! -f "$C/main.py" ]; then
    (
      [ -f /etc/network_turbo ] && source /etc/network_turbo
      curl -fL --retry 3 -o "$R/comfy-$COMMIT.tar.gz" "https://github.com/Comfy-Org/ComfyUI/archive/$COMMIT.tar.gz"
    ) || stop "从 GitHub 下载 ComfyUI 失败"
    tar -xzf "$R/comfy-$COMMIT.tar.gz" -C "$R" || stop "解压 ComfyUI 失败"
  fi
  echo "ComfyUI 在 $C"
fi

if [ -x "$OLD/venv/bin/python" ] && [ "$C" = "$OLD/ComfyUI-$COMMIT" ]; then
  PY="$OLD/venv/bin/python"
else
  python3 -c "import torch" 2>/dev/null || stop "镜像里没有 PyTorch。租机时请选 PyTorch 2.8 / Python 3.12 / CUDA 12.8 的镜像"
  if [ ! -x "$R/venv/bin/python" ]; then
    python3 -m venv --system-site-packages "$R/venv" || stop "建虚拟环境失败"
  fi
  PY="$R/venv/bin/python"
  # 不动镜像自带的 torch：装依赖时把 torch 三件去掉
  grep -v -E '^(torch|torchvision|torchaudio)([<>=~! ].*)?$' "$C/requirements.txt" > "$R/requirements-no-torch.txt"
  "$PY" -m pip install -q -r "$R/requirements-no-torch.txt" || stop "装 ComfyUI 的依赖失败"
fi
"$PY" -c "import torch; assert torch.cuda.is_available()" 2>/dev/null || stop "$PY 里的 torch 看不到显卡"
echo "Python：$PY"

step "2/5 四份权重（SHA-256 逐份核对，约 4—6 分钟）"
M="$C/models"
NEED=0
while read -r path bytes digest; do
  f="$M/$path"
  [ -f "$f" ] && [ "$(stat -c %s "$f")" = "$bytes" ] || NEED=$((NEED + bytes))
done <<< "$WEIGHTS"
if [ "$NEED" -gt 0 ]; then
  AVAIL=$(df --output=avail -B1 "$M" | tail -1 | tr -d ' ')
  [ "$AVAIL" -gt $((NEED + 2000000000)) ] || stop "数据盘剩余 $AVAIL 字节，下载权重要 $NEED 字节，再加 2 GB 余量。请扩容数据盘"
fi
while read -r path bytes digest; do
  f="$M/$path"
  if [ ! -f "$f" ] || [ "$(stat -c %s "$f")" != "$bytes" ]; then
    echo "下载 $path（$bytes 字节）"
    mkdir -p "$(dirname "$f")"
    curl -fL --retry 5 -C - -o "$f.part" "$MS/$path" || stop "下载 $path 失败"
    mv "$f.part" "$f"
  fi
  got=$(sha256sum "$f" | cut -c1-64) || true
  [ "$got" = "$digest" ] || stop "$path 的摘要是 $got，应为 $digest"
  echo "相符 $path"
done <<< "$WEIGHTS"

step "3/5 ComfyUI 源文件摘要"
while read -r path digest; do
  got=$(sha256sum "$C/$path" 2>/dev/null | cut -c1-64) || true
  [ "$got" = "$digest" ] || stop "$path 的摘要是 $got，应为 $digest：不是 e8665ca8 这一版"
  echo "相符 $path"
done <<< "$SOURCES"

step "4/5 主机回执"
FLAGS="--listen $LISTEN --port $PORT --disable-auto-launch --disable-all-custom-nodes --disable-partner-nodes --cache-classic --input-directory $R/inputs --output-directory $R/output --temp-directory $R/temp --user-directory $R/user"
COMMIT="$COMMIT" C="$C" PY="$PY" FLAGS="$FLAGS" WEIGHTS="$WEIGHTS" SOURCES="$SOURCES" "$PY" - "$R/inputs/host-receipt.json" <<'EOF'
import json, os, platform, socket, subprocess, sys, time, torch
gpu = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
                     capture_output=True, text=True).stdout.strip().splitlines()
receipt = {
    "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "hostname": socket.gethostname(),
    "commit": os.environ["COMMIT"], "comfy_dir": os.environ["C"], "python": os.environ["PY"],
    "python_version": platform.python_version(), "torch": torch.__version__, "cuda": torch.version.cuda,
    "gpu": gpu, "launch_flags": os.environ["FLAGS"].split(),
    "sources": {l.split()[0]: l.split()[1] for l in os.environ["SOURCES"].splitlines()},
    "weights": [{"path": l.split()[0], "bytes": int(l.split()[1]), "sha256": l.split()[2]} for l in os.environ["WEIGHTS"].splitlines()],
    "weights_verified": True,
}
open(sys.argv[1], "w").write(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: receipt[k] for k in ("commit", "torch", "cuda", "gpu")}, ensure_ascii=False))
EOF
cp "$R/inputs/host-receipt.json" "$R/host-receipt.json"

step "5/5 启动 ComfyUI（$LISTEN:$PORT）"
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY
nohup bash -c "while [ ! -e '$R/STOP' ]; do echo COMFY_START \$(date -Is); '$PY' -B '$C/main.py' $FLAGS; echo COMFY_EXIT \$(date -Is) code \$?; sleep 10; done" >> "$R/comfy.log" 2>&1 &
for i in $(seq 1 90); do
  if curl -s -m 2 "http://127.0.0.1:$PORT/system_stats" >/dev/null 2>&1; then
    echo
    echo "ComfyUI 已在运行。日志：$R/comfy.log"
    if [ "$LISTEN" = "127.0.0.1" ]; then
      echo "下一步在你自己的电脑上开隧道（端口和主机名照 AutoDL 控制台“登录指令”里的填，密码你自己输）："
      echo "  ssh -CNg -L 18189:127.0.0.1:$PORT -p <端口> root@<主机名>"
      echo "开好后告诉 Claude：隧道开好了，地址 http://127.0.0.1:18189"
    else
      echo "下一步把 AutoDL 控制台“自定义服务”的地址发给 Claude。"
    fi
    exit 0
  fi
  sleep 2
done
tail -30 "$R/comfy.log"
stop "ComfyUI 3 分钟内没起来，日志末尾见上。后台还在反复重启它，先停掉：touch $R/STOP; pkill -f ComfyUI-$COMMIT"
