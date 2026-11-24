# 进度日志

2026-11-09 至 11-23 的 48 条日志已原样移到 [archive/logs/PROGRESS-20261109-20261123.md](archive/logs/PROGRESS-20261109-20261123.md)，那里的锚点和链接都可用。研究现状看 [STATUS](STATUS.md) 和[研究进度与实际情况](planning/research-panorama/progress-20261119.md)。这里只在研究状态或仓库结构变化时按日期追加，新的在前，每条写明做了什么、证据在哪、还有什么不能写。

## 2026-11-24｜仓库整理：补回分支上的证据，旧文档归档，建阅读清单

- **补回主分支：** 47 个只在未合并分支上的文件，逐字节取原 blob：正式证据 `evidence/20261117-a1-a4-c1`、`e2r-hub-readback`、`e5-individual-reviewed`、`semantic-cards/early-crawl`，`experiments/semantic40-pairing`；作者冻结的词对 v1；出图防错清单与 `preflight.py`；11 月 18 日逐字存档的 35 个工单。来源逐件记在 [source-manifest-20261124.tsv](evidence/20261120-branch-recovery/source-manifest-20261124.tsv)。
- **移入 archive：** 59 个不再使用的文件（旧计划、旧交接、旧协议、旧修订片段、工作台根目录的旧说明、本日志的旧文），全库引用一并改写，坏链接 78 → 74，没有新坏的。清单见[整理清单第八节](planning/2026-11-18-cleanup-list.md#八2026-11-24-执行情况与剩余)。
- **新建：** [阅读清单](READING-LIST.md)、[现行协议索引](docs/protocols/README.md)、[GitHub 工单与 PR 的逐字存档](archive/issues/README.md)。CLAUDE.md 和 STATUS.md 只留现行内容，旧文存档。
- **没有做的：** 关 PR、删分支、关 #22 要仓库所有者的权限，交给 GPT 的清单在 [2026-11-24-github-cleanup.md](planning/2026-11-24-github-cleanup.md)。研究数据、读数和图都没有改；真实模型调用 0，真人场次 0。
