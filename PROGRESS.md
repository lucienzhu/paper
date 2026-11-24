# 进度日志

2026-11-09 至 11-23 的 48 条日志已原样移到 [archive/logs/PROGRESS-20261109-20261123.md](archive/logs/PROGRESS-20261109-20261123.md)，那里的锚点和链接都可用。研究现状看 [STATUS](STATUS.md) 和[研究进度与实际情况](planning/research-panorama/progress-20261119.md)。这里只在研究状态或仓库结构变化时按日期追加，新的在前，每条写明做了什么、证据在哪、还有什么不能写。

## 2026-11-24｜仓库整理复查（Codex 审过之后）

- **archive 里仍在用的：** 评论原始数据、S2/A3/A8 的题面、对应键和取点图、何彦一篇同专业论文，以及 `experiments/g2d`、`evidence/formal-reset`、两处 `d2-tuning`、`evidence/h3-e2-local-edit-20261113`（现行脚本或索引按路径读取）。[archive/README.md](archive/README.md) 第一节单列为“不能删，不要挪”，阅读清单和 AGENTS 跟着改；没有移动文件。
- **链接：** 讨论存档里 69 处按分支名写的链接改成固定提交号（其中 12 处原指向已删的 fork 分支），1 处站内路径改成完整网址；25 处相对路径改到 archive 下的现位置或删除前的提交；E3 dev-r3 的 4 张图补上 `it1/`。fork 上补了 3 个同名标签，GitHub 网页上的 12 处旧链接恢复可用。
- **哈希：** [来源清单](evidence/20261120-branch-recovery/source-manifest-20261124.tsv)加了原 blob、现 blob、是否相同和改了什么：47 个里 38 个逐字节相同，9 个只改了链接。11 月 20 日那份 1,093 个文件的清单复核后，1,092 个仍相同。
- **交给 GPT 的清单：** 删前给全部 41 个分支打同名标签；#62、#73 的关闭评论改准。

## 2026-11-24｜仓库整理：补回分支上的证据，旧文档归档，建阅读清单

- **补回主分支：** 47 个文件（43 个只在未合并分支上，4 个是比主分支新的版本），取分支上的原 blob；其中有的在整理时改了链接，源 blob 与现 blob 逐个记在清单里：正式证据 `evidence/20261117-a1-a4-c1`、`e2r-hub-readback`、`e5-individual-reviewed`、`semantic-cards/early-crawl`，`experiments/semantic40-pairing`；作者冻结的词对 v1；出图防错清单与 `preflight.py`；11 月 18 日存档的 35 个工单。来源逐件记在 [source-manifest-20261124.tsv](evidence/20261120-branch-recovery/source-manifest-20261124.tsv)。
- **移入 archive：** 59 个不再使用的文件（旧计划、旧交接、旧协议、旧修订片段、工作台根目录的旧说明、本日志的旧文），全库引用一并改写，没有因此新坏的链接（按每一处链接数，整理前 97 处坏的，复查后 63 处）。清单见[整理清单第八节](planning/2026-11-18-cleanup-list.md#八2026-11-24-执行情况与剩余)。
- **新建：** [阅读清单](READING-LIST.md)、[现行协议索引](docs/protocols/README.md)、[GitHub 工单与 PR 的讨论存档](archive/issues/README.md)（原文照录，只改了链接）。CLAUDE.md 和 STATUS.md 只留现行内容，旧文存档。
- **没有做的：** 关 PR、删分支、关 #22 要仓库所有者的权限，交给 GPT 的清单在 [2026-11-24-github-cleanup.md](planning/2026-11-24-github-cleanup.md)。研究数据、读数和图都没有改；真实模型调用 0，真人场次 0。
