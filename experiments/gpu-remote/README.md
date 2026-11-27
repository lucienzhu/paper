# 远程出图工具与租机当天的步骤（Claude，2026-11-26）

> 2026-11-26 晚（作者最新决定第 12 条，旧路径的数据整体移出）：批次单 `01-f1-dev.json` 随 F1 旧登记移进 archive；`00-env-check`（拿旧原图比）、`05-a6-hexa`、`06-a4-stage1` 要重新登记，`02-nozzle-confirm`、`03-h5-stage1` 要在负面词统一后重编。自测 `test_remote.py` 的夹具改用 `02-nozzle-confirm.json`，20 项全过。负面词统一、各批重编之前不租机。

租机当天由 Claude 在本机经 ComfyUI 的网页接口提交各批。Claude 不登录主机，不经手任何密码。

**为什么不直接用 11 月 15 日的 `queue_runner.py`。** 它要在主机上运行，从主机目录里读请求。这次主机由作者租、作者登录，Claude 只拿到一个地址。提交和核对仍用它的 `run_one`，按摘要锁定，一个字不改：每份只交一次；执行图要与请求一致；采样节点不能命中缓存；只许一张输出图；存请求、回执、运行历史和原图。本工具只在它前后加远程要的几步：主机只读检查、上传输入图并读回核对、提交前确认主机队列为空、出错即停、事后按主机记录对账。对账从不重新提交。

## 文件

| 文件 | 谁用 | 做什么 |
| --- | --- | --- |
| [host-setup.sh](host-setup.sh) | 作者，在主机上 | 装 ComfyUI `e8665ca8`，取三份权重并逐份核对摘要，核对四个源文件，写主机回执，按 11 月 15 日的参数启动（禁用自定义节点和合作方节点） |
| [remote_runner.py](remote_runner.py) | Claude，在本机 | `make-batch` 写批次单；`check` 主机只读检查；`upload` 上传并读回；`run` 提交；`reconcile` 对账；`compare` 环境核对 |
| [batches/](batches/) | Claude | 每批一张批次单：请求文件、摘要、种子、输入文件摘要，开机前写定 |
| [env-check/](env-check/) | Claude | 环境核对的 2 份请求、比对规则和编法 |
| [test_remote.py](test_remote.py)、[fake_comfy.py](fake_comfy.py)、[test_host_setup.sh](test_host_setup.sh) | 任何人 | 离线测试 |
| [pngread.py](pngread.py) | 程序内部 | 读写 PNG，不依赖第三方库 |

## 租机当天

### 作者

1. 在 [#3](https://github.com/Freeloop993/paper/issues/3) 登记这次的授权：跑哪几批、张数上限、花费上限（见 [STATUS](../../STATUS.md) 第五节）。
2. 租机。最好重新开 11 月 15 日那台实例：数据盘里有 ComfyUI 和四份权重，不用再下载约 40 GB。新租的话，镜像选 PyTorch 2.8 / Python 3.12 / CUDA 12.8，数据盘留 50 GB 以上。第四份权重是 A4 两种做法要的控制分支。
3. 在主机的终端里取脚本：

   ```bash
   source /etc/network_turbo; curl -fsSL -o host-setup.sh https://raw.githubusercontent.com/Freeloop993/paper/main/experiments/gpu-remote/host-setup.sh; unset http_proxy https_proxy
   ```

   取不下来就在自己电脑上从 GitHub 下载这个文件，拖进 JupyterLab 的文件栏。然后运行：

   ```bash
   bash host-setup.sh
   ```

   有一项不对它就停，并说停在哪；把最后几行发给 Claude。跑完它会打印下一步的隧道命令。
4. 在自己的电脑上开隧道（端口和主机名照 AutoDL 控制台“登录指令”里的填，密码自己输），窗口开着别关：

   ```bash
   ssh -CNg -L 18189:127.0.0.1:8189 -p <端口> root@<主机名>
   ```

   开不了隧道的话，改用 AutoDL 的“自定义服务”：主机上运行 `LISTEN=0.0.0.0 PORT=6006 bash host-setup.sh`，把控制台给的地址发给 Claude。这样 ComfyUI 对外可见，用完要关机。
5. 告诉 Claude：隧道开好了。

### Claude

地址按隧道是 `http://127.0.0.1:18189`，下面以 `$U` 代指。命令都在仓库根目录运行。

1. **环境核对**（每次开机先做）。`check` 核对 ComfyUI 版本、四个源文件、请求用到的权重、启动参数、节点和下拉选项、队列为空；再上传、出 2 张、与 11 月 15 日的原图比。

   ```bash
   python3 -B experiments/gpu-remote/remote_runner.py check --comfy $U --batch experiments/gpu-remote/batches/00-env-check.json --out experiments/gpu-remote/env-check/actual
   ```

   接着用同样的 `--batch` 和 `--out` 依次跑 `upload`、`run`、`compare`（`compare` 不要 `--comfy`）。比对规则在 [env-check/manifest.json](env-check/manifest.json) 的 `rule`，开机前写定：两张里有一张“明显不同”就停，先查版本和权重。
2. **工作台真机验收**：先 `npm run build`，再 `npm run gpu:acceptance -- --comfy-url $U --out <输出目录>`（在 `prototypes/drone-configurator` 里）。然后手动断网取回一次。它和各批不能同时跑。
3. **F1 局部编辑开发 17 张**：批次单 [01-f1-dev.json](../../archive/experiments/gpu-remote/batches/01-f1-dev.json)，输出到 `experiments/20261117-local-edit-v2/actual/f1-dev`。按 F1 的登记，遮罩工作流报错就停、报告，不改写法顶替。
4. 其余各批照同样的 `check`、`upload`、`run`，输出放进各自登记目录的 `actual/`：

   | 批次单 | 批 | 份数 | 登记 |
   | --- | --- | ---: | --- |
   | [02-nozzle-confirm.json](batches/02-nozzle-confirm.json) | 电机下方喷头确认（任务表 H3） | 4 | [登记](../20261126-nozzle-confirm/README.md) |
   | [03-h5-stage1.json](batches/03-h5-stage1.json) | 八旋与 X8 顶视 | 12 | [登记](../20261126-h5-octo-x8/README.md) |
   | 04-h5-stage2.json（第一段出图后编） | 八旋与 X8 关联斜视 | 8 | 同上 |
   | [05-a6-hexa.json](batches/05-a6-hexa.json) | A6 六旋比例补验 | 18 | [登记](../20261126-a6-hexa-ratio/README.md) |
   | [06-a4-stage1.json](batches/06-a4-stage1.json) | A4 第一段 | 90 | [登记](../20261126-a4-bridge/README.md) |
   | 07-a4-tsb.json（第一段出图后编） | A4 两段式第二步 | 30 | 同上 |

   第二段的批次单在上一段跑完后，用各登记目录 `build.py` 的接续命令编出来，再过出图前检查和 `make-batch`。

每批跑完：把输出目录提交进仓库，当天改 STATUS 那一行。

## 规则

- **每份只交一次。** 程序为每份请求建一个目录，目录已在就不再提交。
- **出错即停**（批次单的 `on_error` 是 `stop`）。先看该份目录里的 `error.txt`，再跑 `reconcile`。不重试，不换种子。
- **对账只读主机记录。** 找到完成的记录，就照 `run_one` 的四条核对，取回原图，记“reconciled”。报“not_on_host”，是主机历史里没有这份：可能请求根本没到主机，也可能主机重启清掉了历史。要不要重交由作者定，重交前把那个目录改名留档。
- **同一时间只有一个提交方。** 提交前主机队列必须为空；工作台验收和各批不同时跑。
- **停。** 在输出目录放一个 `STOP` 文件，`run` 做完当前这份就停。主机上要停 ComfyUI：`touch /root/autodl-tmp/gpu-run/STOP`，再 `pkill -f ComfyUI-e8665ca8`。
- 退出码：0 做完；1 检查没过；2 出错停下，要先对账；3 按 STOP 停下。

## 测试（2026-11-26）

| 测试 | 结果 | 测了什么 |
| --- | --- | --- |
| `python3 -B experiments/gpu-remote/test_remote.py` | 20 项全部通过 | 对着假 ComfyUI：正常跑完 17 份、重跑不重复提交、执行错即停、回执丢失后对账补回且只交过一次、采样缓存即停、主机检查拦下三种错、同名不同内容不覆盖、STOP、环境核对的三种结果 |
| `bash experiments/gpu-remote/test_host_setup.sh` | 10 项全部通过 | 在本机用替身走完五步：全新安装、沿用旧目录不下载、权重或源文件不对时停、端口被占或 STOP 还在时停；主机检查读得到回执 |

## 还没验证的

- `host-setup.sh` 没在真的 AutoDL 主机上跑过：pip 装依赖、GitHub 下载（学术加速）、ModelScope 下载都只有替身。四个源文件是从 GitHub 按 `e8665ca8` 取的真文件，摘要与 11 月 12、15 日的记录一致。
- F1 的 17 份请求和环境核对的 2 份请求，用到的节点、输入名和下拉值（`qwen_image`、`red`、`euler`、`simple`、`default`），已按 `e8665ca8` 的 `nodes.py`、`comfy/samplers.py`、`comfy_extras/nodes_qwen.py` 逐项核过（2026-11-26，源文件从 GitHub 按这一版取，`nodes_qwen.py` 的摘要与记录一致）。网页接口返回节点表的格式（如自动增长的 `images.image_1`）是按源码推定的，第一次 `check` 在真机上验证。
- F1 用的遮罩节点（`VAEEncode`、`SetLatentNoiseMask`、`LoadImageMask`）在真机上一次没跑过。
- 11 月 15 日用的是 RTX 4080 SUPER。换了显卡型号，像素可能对不上，按 `rule` 处理。
