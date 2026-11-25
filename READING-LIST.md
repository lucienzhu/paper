# 阅读清单：接手的人和 AI 先读什么

2026-11-24 按[总体研究蓝图](planning/research-panorama/README.md)整理。这一页只告诉你哪份文件管什么、什么时候读，不写任何新的研究结论。研究结论以各文件原文为准。大小按字节算，中文约 1 KB 合 330 字；超过 30 KB 的文件只读要用的节。

## 一、每次开工先读这几份（约 80 KB）

| 顺序 | 文件 | 管什么 | 怎么读 |
| --- | --- | --- | --- |
| 1 | 本页 | 去哪里找东西 | 全读 |
| 2 | [现状总表（STATUS）](STATUS.md)（25 KB） | **现在做到哪**：每项登记任务的状态和实际数量（答卷文件、人数、张数分开写），开 GPU 和招人之前的门，等作者定的事，GPU 各批缺什么，同名编号对照 | 全读。查现状只看这一处；别的文件里写的“现在到哪”和它不一致时，以它为准 |
| 3 | [总体研究蓝图](planning/research-panorama/README.md)（16 KB）· [一页图 PDF](planning/research-panorama/research-blueprint.pdf) | 在解决什么、要证明的一句话、论证链、四个研究问题、缺口和下一步的顺序 | 全读。①—⑨ 节是研究主线；里面的“现在到哪”是 11 月 18—19 日的快照 |
| 4 | [登记任务表](planning/2026-11-17-direction-and-todo.md)（39 KB） | 每项任务的对象、人数、验收，作者最新决定，H 节范围收敛，第七节“数据门” | 先读开头的“作者最新决定与执行顺序”，再只读自己这一项所在的任务组。表里的“状态”栏是登记时写的 |
| 5 | [哪些数据能进论文](evidence/usable-for-writing.md)（10 KB） | 哪一批能进正文、哪一批只能以数字出现、哪一批不能用 | 引用任何实验数据或图之前必读 |
| 6 | [AGENTS](AGENTS.md)、[协作规则](CONTRIBUTING.md)；Claude 另读 [CLAUDE.md](CLAUDE.md) | 分工、提交与验收规矩、不能提交的东西 | 全读，都很短 |
| 要追溯时 | [研究进度与实际情况](planning/research-panorama/progress-20261119.md)（65 KB） | 按日期的经过；第八节是每一步开工前的对照格式 | 不在这里查现状。第一至八节是 11 月 19 日的快照，第九节以后按日期记，要追溯某件事的来由时再读 |

**作者定的规矩（2026-11-19）。** 每一步开工前，先回到蓝图和登记任务表，写明这一步对应哪一环、对象范围、人数、要对照的参数、交到论文哪一节；做完按同一张表报告。范围只能由作者收窄。格式见[进度页第八节](planning/research-panorama/progress-20261119.md#八每一步开工前的对照)。

## 二、按论证链找材料

论证链和研究问题见蓝图 ③④；论文的节号见[现行目录](manuscript/outline.md)。每一环先看[文献关系图第四节](literature/map.md#四按论证链每一环依据哪些文献)的依据。

| 环节 | 先读 | 数据与原件 | 交到论文 |
| --- | --- | --- | --- |
| RQ1 用户评论 → 设计意图 | [评论核查与新共词图](evidence/20261117-research-update/comments/README.md)（18 KB）· [证据卡说明](evidence/semantic-cards/README.md) | [36 张证据卡](evidence/semantic-cards/cards.csv) · [早期采集数据与分母](evidence/semantic-cards/early-crawl/README.md) · [第二编码](evidence/semantic40-second-coding-20261115/) 与[配对规则](experiments/semantic40-pairing/README.md) · [词对 v1（作者 11 月 13 日冻结）](docs/protocols/word-pairs-v1-draft.md) · [S6 词对重新编码](archive/evidence/20261117-research-update/s6-recode/README.md) · 原始评论与商品数据的 [8 个 ZIP](archive/paper-reading-room/datasets/early-crawl/)（放在 archive 下，但仍在用，说明见 [DATA](DATA.md)）· S2 题面与对应键在 [paper-reading-room/studies](archive/paper-reading-room/studies/20261117-offline/) | 3.2、3.3 |
| RQ2a 布局比例控得住吗 | [A8 真人取点](evidence/20261117-research-update/a8-click/README.md) 与[读法](evidence/20261117-research-update/a8-click/returns/reading.md) · [A8 不知情 AI 读数](evidence/20261117-research-update/a8-ai/README.md) | [A3 生成图读数](evidence/20261117-research-update/a3/README.md) · [点线图通路](experiments/l1-layout/README.md) 与[实测](evidence/l1-layout-actual/) · 部件图通路 [R0](evidence/r0-20261112/)、[E0](evidence/e0-open-20261112/)、[E1](evidence/e1-open-20261112/)（11 月 19 日退役，只留读数）· A8 的取点图与发放包在 [paper-reading-room/studies](archive/paper-reading-room/studies/20261117-offline/) | 3.4、5.1.2、5.2.1 |
| 真实机型（RQ2 的参照） | [A1 官方规格](evidence/20261117-research-update/a1/README.md) · [A1、A4、C1 的关系](evidence/20261117-a1-a4-c1/README.md) | [A2 手册图面量测](evidence/20261117-config-review/A2/README.md) · [真实产品顶视图来源](evidence/real-product-topview/README.md) | 3.2.3 |
| RQ2b 造型档位出得来吗 | [96 张读数与六旋](evidence/20261117-offline-review/README.md) · [v1.2 正式与 v1.6 平行批](evidence/20261115-review-takeover/README.md) | [GPU 日登记](experiments/gpu-day-20261115/README.md) 与[回收件](evidence/gpu-day-20261115/) · 造型字典开发 [form342-h3-dev 各轮](evidence/form342-h3-dev/)、[S4](evidence/qwen-shape-s4-20261114/README.md) | 5.2.1 |
| RQ2c 改得对、保得住吗 | [局部编辑第一版](evidence/20261115-review-takeover/local-edit/README.md) · [第二版 73 份请求](experiments/20261117-local-edit-v2/README.md)（未运行） | [E2R 轴心位移复核](evidence/e2r-hub-readback/README.md) · [出图防错清单](docs/protocols/run-checklist.md) 与 [preflight.py](experiments/preflight.py) | 5.2.2 |
| RQ1′ 意图读得出吗 | [S5 紧凑感评议](experiments/s5-compactness-pilot/README.md) 与[结果](experiments/s5-compactness-pilot/responses/README.md) | [3 份逐图评议](evidence/e5-individual-reviewed/README.md) · [E5 配色补充登记](docs/protocols/e5-cmf-addendum.md) · [评议用图标准](experiments/s5-compactness-pilot/stimulus-review.md)（给人看的图先按它审） | 5.3 |
| RQ3 协同的收益与代价 | [预试记录约定](evidence/20261117-research-update/method/paired-pilot.md)（含 11 月 22 日修订：两种方式都用同一个文字模型）· [工作台与研究主线的对齐](planning/2026-11-23-workbench-alignment.md) | [C1 任务书与计时](evidence/20261117-a1-a4-c1/c1-pilot.md) · 工作台见第四节 | 4.1、4.5 |
| E3 四旋设计实践（第 4 章） | [E3 三轮设计](evidence/e3-quad-qwen-20261115/README.md) · [深化稿](experiments/e3-deepening/README.md) | 方向来源 [section421-h3-span](evidence/section421-h3-span/specs-after-review.md)、[作者选择](evidence/quad-author-selection/README.md) · [B2 盲读](evidence/gpu-day-20261115/dual-hexa-handoff/blind-b2/README.md) · [作者选图工作簿](prototypes/e3-author-workbook/README.md) | 4.2—4.4 |
| RQ4 换构型还成立吗 | [植保六旋](experiments/hexa-plant-protection/README.md) · 登记任务表 H 节 | [跨构型协议](planning/advisor-20261118/cross-layout-protocol.md) · 六旋 39 张读数在 [offline-review](evidence/20261117-offline-review/README.md) | 5.5 |

现行证据的总目录在 [evidence/README.md](evidence/README.md)；现行协议在 [docs/protocols/README.md](docs/protocols/README.md)。

## 三、方法、框架和论文

| 要做什么 | 读这个 |
| --- | --- |
| 看研究框架怎么定的 | [总体框架](planning/2026-11-18-framework.md)（20 KB）· [导师反馈后的研究与验收表](planning/advisor-20261118/README.md) |
| 查语义、文献或构型，给工作台读 JSON | [研究资料库](planning/research-library/README.md) · [第三章方法与四项验证](planning/research-library/method.md) |
| 写论文 | [现行目录](manuscript/outline.md) · [论文源码与构建](manuscript/thesis/README.md) · 各章在 `manuscript/thesis/src/ch1.md`—`ch6.md`（ch3 35 KB、ch5 40 KB，按节读）· [2.6 节比较表现稿](manuscript/revisions/ch02-2.6-comparison.md) |
| 对照开题和目录原件 | [开题原 PDF](planning/proposal-original.pdf) · [修订目录 Word](planning/outline-revised.docx) · [同专业四篇硕士论文](references/peer-theses.md)（三篇是文献库的 L020、L045、L046，何彦一篇在 [archive/paper-reading-room/originals/](archive/paper-reading-room/originals/)） |
| 找文献 | [文献库](literature/README.md) → [关系图](literature/map.md) → [目录 catalog.csv](literature/catalog.csv) → [原页证据 page-evidence.csv](literature/page-evidence.csv)。目录里标“未逐页核读”的，引用前先核原页。工作台用到的 A、B 编号原页证据在[这里](planning/workbench-handoff/literature/README.md)。`references/` 是 11 月 18 日以前的旧目录，只在追溯旧引用时用；102 份旧原件在分支 `reference-fulltexts-20261109` |

## 四、工作台（系统）

| 要做什么 | 读这个 |
| --- | --- |
| 在另一台电脑接手、核对文件 | [双机交接](planning/workbench-handoff/README.md)，用 `verify_checkout.py` 核对 |
| 运行、改代码 | [工作台说明](prototypes/drone-configurator/README.md)（35 KB，先读开头的版本和运行方法）· [界面设计记录](prototypes/drone-configurator/interface-design.md) |
| 看最近一次复核和还没验证的 | [4.4 复核记录](prototypes/drone-configurator/review/20261124-workbench-4.4/README.md) · [4.3 / 4.3.1 复核记录](prototypes/drone-configurator/review/20261123-workbench-4.3/README.md) · [4.0 评审汇总](planning/2026-11-22-workbench-4-review-summary.md)（第六、七节是要作者定的事和作者的答复） |

4.3 以前的复核记录 2026-11-25 已移进 `archive/prototypes/drone-configurator/review/`；`review/20261118-round3` 留在原处，走查脚本要读里面的夹具。

## 五、作者的决定记在哪

| 时间 | 在哪 |
| --- | --- |
| 还没定的 | [现状总表](STATUS.md)第四节，按对后面的影响排序 |
| 11 月 18 日以后 | 登记任务表开头的“作者最新决定”；蓝图 ② ④ 里注明“作者定”的引文；进度页各节；评审汇总第七节 |
| 11 月 9—18 日 | 工单 #3 “作者决定与授权登记”（[存档快照](archive/issues/open-issues-20261124.md)）；最早的 F1—F5 定案在 [archive/docs/foundation.md](archive/docs/foundation.md) |
| 仓库里什么留、什么归档 | [archive/README.md](archive/README.md)：第一节是仍在用、不能挪的，第二节是退役的各批（含 2026-11-25 移走的 62 个文件）。11 月 18 日整理清单和 11 月 24 日 GitHub 清理工单都已执行，存档在 archive/planning/ |

## 六、不用读的

- **[archive/](archive/README.md) 第二节列的退役材料**：只留作追溯，不要从这里取数据写论文。旧日志 `archive/logs/` 和旧计划 `archive/docs/` 都在这里。**archive/README.md 第一节列的不在此列**：评论原始数据、S2/A3/A8 材料、一篇同专业论文和几个现行脚本要读的旧文件，仍在用，要用时照常读，不能删，也不要挪。
- **GitHub 上的旧讨论**：全部工单和 PR 的逐字副本、一览表在 [archive/issues/](archive/issues/README.md)，不用翻网页。
- **原图、压缩包和请求文件**：各实验目录下的 `originals/`、`inputs/`、`requests/`、`*.zip`。要看图时按 README 点名的那几张看；评论原始数据的 8 个 ZIP 要复算 RQ1 时再打开。这些文件不读，但都不能删。
- **文献 PDF**：`literature/fulltexts/` 和分支 `reference-fulltexts-20261109`。先查 page-evidence.csv，要核原页时再打开。
- **工作台的依赖和构建产物**：`node_modules/`、`dist/`、`configurator-offline.zip`。

## 七、维护这一页

- 任务的状态只写在[现状总表](STATUS.md)：变了就改那一行，写日期和依据。其他文件不另写“现在到哪”，要写就链到现状总表。
- 新增一份主线文件（蓝图、任务表、证据索引、论文、交接里会被引用的），在第一至五节加一行；移进 archive 的，从这里删掉那一行，在 [archive/README.md](archive/README.md) 加一行。
- 只写“是什么、什么时候读”，不写结论和数字。
- 研究材料只移进 archive，不删除；archive/README.md 第一节的东西连路径也不要动，现行脚本按路径读取。
- 每次整理后，把这一页里的链接全部点一遍，坏了就修。
