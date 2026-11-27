#!/bin/bash
# host-setup.sh 的离线测试：在本机用替身（stat、df、nvidia-smi、下载、torch、ComfyUI）把安装和启动走一遍。
# 运行：bash experiments/gpu-remote/test_host_setup.sh
# 要能连 GitHub：从 e8665ca8 取四个源文件，按摘要核对后当作“ComfyUI”。权重用三个小文件代替。
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
COMMIT=e8665ca8e4089ab917567cdb491308e1397663d4
T=$(mktemp -d "${TMPDIR:-/tmp}/host-setup-test.XXXXXX")
PASS=0; FAIL=0
ok() { if [ "$1" = 0 ]; then PASS=$((PASS + 1)); echo "通过 $2"; else FAIL=$((FAIL + 1)); echo "没过 $2"; [ -n "${3:-}" ] && tail -15 "$3"; fi; }
free_port() { python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])'; }

# 假 ComfyUI 源码包：真的四个源文件 + 冒充 main.py 的假服务
SRC="$T/src/ComfyUI-$COMMIT"
mkdir -p "$SRC/models"
for p in comfy_extras/nodes_qwen.py comfy_extras/nodes_model_patch.py comfy/ldm/qwen_image21/model.py comfy/supported_models.py; do
  mkdir -p "$SRC/$(dirname "$p")"
  curl -s -f -m 60 -o "$SRC/$p" "https://raw.githubusercontent.com/Comfy-Org/ComfyUI/$COMMIT/$p" || { echo "取不到 $p"; exit 1; }
done
printf 'torch\ntorchvision\npip\n' > "$SRC/requirements.txt"
cat > "$SRC/main.py" <<EOF
import os, sys
os.execv(sys.executable, [sys.executable, "-B", "$HERE/fake_comfy.py", "--receipt", "none"] + sys.argv[1:])
EOF
tar -czf "$T/comfy.tar.gz" -C "$T/src" "ComfyUI-$COMMIT"
cp -R "$SRC" "$T/bad-src"; echo "# changed" >> "$T/bad-src/comfy/supported_models.py"
mkdir -p "$T/bad/ComfyUI-$COMMIT"; cp -R "$T/bad-src/." "$T/bad/ComfyUI-$COMMIT/"
tar -czf "$T/comfy-bad.tar.gz" -C "$T/bad" "ComfyUI-$COMMIT"

# 三份小“权重”
W=""
for p in diffusion_models/qwen_image_2.1_bf16.safetensors text_encoders/qwen3vl_8b_bf16.safetensors vae/qwen_image_2.1_vae_bf16.safetensors; do
  mkdir -p "$T/weights/$(dirname "$p")"
  head -c 4096 /dev/urandom > "$T/weights/$p"
  W="$W$p $(wc -c < "$T/weights/$p" | tr -d ' ') $(sha256sum "$T/weights/$p" | cut -c1-64)
"
done
W="${W%$'\n'}"
WBAD=$(echo "$W" | sed '2s/ [0-9a-f]\{64\}$/ 0000000000000000000000000000000000000000000000000000000000000000/')

# 替身命令
B="$T/bin"; mkdir -p "$B" "$T/py/torch"
cat > "$B/stat" <<'EOF'
#!/bin/bash
if [ "$1" = "-c" ] && [ "$2" = "%s" ]; then exec python3 -c 'import os,sys; print(os.path.getsize(sys.argv[1]))' "$3"; fi
exec /usr/bin/stat "$@"
EOF
printf '#!/bin/bash\necho "    Avail"\necho " 999999999999"\n' > "$B/df"
printf '#!/bin/bash\necho "Fake GPU, 49140 MiB, 610.57.04"\n' > "$B/nvidia-smi"
cat > "$B/curl" <<EOF
#!/bin/bash
out=""; url=""; prev=""
for a in "\$@"; do [ "\$prev" = "-o" ] && out="\$a"; case "\$a" in http*) url="\$a";; esac; prev="\$a"; done
case "\$url" in
  *github.com/Comfy-Org/ComfyUI/archive/*) cp "\${TEST_TARBALL:-$T/comfy.tar.gz}" "\$out"; exit 0;;
  *modelscope.test/*) echo "\$url" >> "$T/downloads.log"; cp "$T/weights/\${url#*modelscope.test/}" "\$out"; exit 0;;
esac
exec /usr/bin/curl "\$@"
EOF
chmod +x "$B"/*
cat > "$T/py/torch/__init__.py" <<'EOF'
__version__ = "2.8.0+cu128"
class version:
    cuda = "12.8"
class cuda:
    @staticmethod
    def is_available():
        return True
EOF

run_setup() {  # $1 名字，其余是环境变量
  local name=$1; shift
  env PATH="$B:$PATH" PYTHONPATH="$T/py" TEST_MS="https://modelscope.test" "$@" bash "$HERE/host-setup.sh" > "$T/$name.log" 2>&1
}
stop_fake() { touch "$1/STOP"; pkill -f "fake_comfy.py --receipt none --listen 127.0.0.1 --port $2" 2>/dev/null; sleep 1; }

# 1. 全新安装：下载、核对、回执、启动
P1=$(free_port)
run_setup fresh R="$T/run1" OLD="$T/none" PORT="$P1" TEST_WEIGHTS="$W"
ok $? "全新安装走完五步并启动" "$T/fresh.log"
python3 - "$T/run1/inputs/host-receipt.json" "$COMMIT" <<'EOF'
import json, sys
r = json.load(open(sys.argv[1]))
assert r["commit"] == sys.argv[2] and r["weights_verified"] is True and len(r["weights"]) == 3
assert r["torch"] == "2.8.0+cu128" and r["gpu"] == ["Fake GPU, 49140 MiB, 610.57.04"]
assert "--disable-all-custom-nodes" in r["launch_flags"] and "--disable-partner-nodes" in r["launch_flags"]
EOF
ok $? "回执内容齐全（版本、torch、显卡、启动参数）"
[ "$(wc -l < "$T/downloads.log" | tr -d ' ')" = 3 ]; ok $? "三份权重各下载一次"
# 主机检查要读得到回执：版本和源文件相符；测试权重的摘要当然对不上登记，要被拦下
python3 -B "$HERE/remote_runner.py" check --comfy "http://127.0.0.1:$P1" --batch "$HERE/batches/01-f6-shape-levels.json" --out "$T/check1" > "$T/check1.log" 2>&1
code=$?
grep -q "实测摘要与登记不符" "$T/check1.log" && ! grep -q "ComfyUI 版本是\|四个源文件" "$T/check1.log" && [ $code = 1 ]
ok $? "主机检查读到回执：版本、源文件相符，测试权重被拦下" "$T/check1.log"

# 2. 端口上已有服务：不启动第二个
run_setup busy R="$T/run1b" OLD="$T/none" PORT="$P1" TEST_WEIGHTS="$W"
[ $? = 1 ] && grep -q "已有服务" "$T/busy.log"; ok $? "端口被占时停下" "$T/busy.log"
stop_fake "$T/run1" "$P1"

# 3. 有 STOP 文件时不启动
run_setup stopfile R="$T/run1" OLD="$T/none" PORT="$(free_port)" TEST_WEIGHTS="$W"
[ $? = 1 ] && grep -q "STOP 存在" "$T/stopfile.log"; ok $? "上次的 STOP 还在时停下" "$T/stopfile.log"

# 4. 权重摘要不对
run_setup badweight R="$T/run2" OLD="$T/none" PORT="$(free_port)" TEST_WEIGHTS="$WBAD"
[ $? = 1 ] && grep -q "摘要是" "$T/badweight.log" && ! grep -q "5/5" "$T/badweight.log"; ok $? "权重摘要不符时停在第 2 步" "$T/badweight.log"

# 5. 源文件不是 e8665ca8
run_setup badsrc R="$T/run3" OLD="$T/none" PORT="$(free_port)" TEST_WEIGHTS="$W" TEST_TARBALL="$T/comfy-bad.tar.gz"
[ $? = 1 ] && grep -q "不是 e8665ca8" "$T/badsrc.log"; ok $? "源文件被改过时停在第 3 步" "$T/badsrc.log"

# 6. 沿用 11 月 15 日的旧目录：不下载
mkdir -p "$T/old"; tar -xzf "$T/comfy.tar.gz" -C "$T/old"
cp -R "$T/weights/." "$T/old/ComfyUI-$COMMIT/models/"
python3 -m venv "$T/old/venv"
: > "$T/downloads.log"
P6=$(free_port)
run_setup reuse R="$T/run6" OLD="$T/old" PORT="$P6" TEST_WEIGHTS="$W"
code=$?
[ $code = 0 ] && grep -q "沿用 11 月 15 日的目录" "$T/reuse.log" && [ ! -s "$T/downloads.log" ]
ok $? "旧目录还在时沿用，不重新下载" "$T/reuse.log"
python3 -c "import json,sys; r=json.load(open(sys.argv[1])); assert r['python'].endswith('/old/venv/bin/python')" "$T/run6/inputs/host-receipt.json"
ok $? "沿用旧目录的 Python"
stop_fake "$T/run6" "$P6"

echo
echo "共 $((PASS + FAIL)) 项，没过 $FAIL 项。临时目录：$T"
[ $FAIL = 0 ]
