# 11 月 15 日 GPU 日：只剩现行构建还在读的几份文件

2026-11-26，作者最新决定第 12 条：11 月 17 日以前的出图连同请求、回执和读数整体移进了 archive（[逐个列表](../../archive/MOVES-20261126-reset.tsv)，原目录在 [archive/experiments/gpu-day-20261115/](../../archive/experiments/gpu-day-20261115/)）。这里暂时只留现行工具和登记还要读的：

| 文件 | 谁在读 | 什么时候移走 |
| --- | --- | --- |
| `queue_runner.py`、`weights.json` | 远程出图工具（提交与核对程序按摘要锁定；权重摘要） | 远程工具改为读自己目录下的副本时 |
| `manifest.json`、`queue/05-WLQ-1.00-r01.json`、`queue/08-S16-S0-r01.json` | A4、A6、H5 的编法（请求模板） | 负面词统一、各批改由工作台同一份执行图生成之后 |
| `afternoon-dev/manifest.json`、`afternoon-dev/requests/02-E6B-N-dev-r*.json`、`afternoon-dev/inputs/hexa-points-1.00.png` | H3 喷头确认的编法 | 同上 |
| `hexa-fix/requests/` | A6 重新登记时取植保简报的写法 | A6 重新登记之后 |
| `queue/10-COMBO-pod-inside-single-r1.json`、`queue/11-S12-S0-r05.json`、`recovered-originals-102/` 下 4 张原图 | 环境核对（原规则拿旧原图比） | 环境核对重新登记之后（新规则不再对旧图） |

这些是出图通路的写法和工具，不是研究数据；里面的旧原图只用于核对主机环境，不进论文、不作对照。
