# archive：不再更新的材料，其中一部分仍在用

这里的东西都不再更新，**但不是都退役了**。第一节是仍在用的原始数据和现行脚本还要读的文件：不能删，也不要挪动路径，脚本和索引是按这些路径读取的。第二节才是退役、只留作追溯的。写论文要引用实验数据，先看[哪些数据能进论文](../evidence/usable-for-writing.md)；现行材料从[阅读清单](../READING-LIST.md)进。

## 一、仍在用：不能删，不要挪

2026-11-24 逐项核对了谁在读这些文件。

| 位置 | 是什么 | 谁在用 |
| --- | --- | --- |
| [paper-reading-room/datasets/early-crawl/](paper-reading-room/datasets/early-crawl/) | 早期电商评论、商品检索列表与详情的原始采集数据，8 个 ZIP，附包内逐文件校验清单 | RQ1 评论语料的原始来源（11,241 行原评论、7,443 条去重文本出自这些包，见 [DATA.md](../DATA.md)）；`evidence/20261117-research-update/comments/layer_scan.py` 直接读 08 包 |
| [paper-reading-room/studies/20261117-offline/](paper-reading-room/studies/20261117-offline/) | S2 评论核查的 150 条题面与研究者对应键、A3 旧校准与真值、A8 的 68 张匿名取点图、参与者发放包、研究者映射与恢复包 | S2、A8 的正式证据（`evidence/20261117-research-update/` 下的 comments、a8-click、a8-ai）：`a8-click/qa.mjs`、`a8-ai/pack_ai.py`、`comments/build_form_b.py` 按路径读这里。A3 的旧校准、真值和研究者完整复核记录也在这里 |
| [paper-reading-room/originals/](paper-reading-room/originals/) | 同专业四篇硕士论文中何彦一篇的原版 PDF；另三篇在文献库（L020、L045、L046） | 写作时对照篇幅与结构，见 [peer-theses.md](../references/peer-theses.md) |
| [paper-reading-room/FILE-INDEX.json](paper-reading-room/FILE-INDEX.json)、[manifest.json](paper-reading-room/manifest.json) | 迁入的 129 个文件的大小与哈希 | 核对上面三项是否完整 |
| [experiments/g2d/](experiments/g2d/) | G2d 条件图的请求与画法 | `experiments/r0-e0-e1` 的 build_guides.py、compile.py、verify.py 读它的提示词模板；E0、E1 的读数（只能以数字出现）靠它复现 |
| [evidence/formal-reset/](evidence/formal-reset/) | 11 月 11 日的图像登记表 | `experiments/rating-kit/eligibility.py` 读其中的 image-registry.json |
| [evidence/d2-tuning/](evidence/d2-tuning/)、[experiments/d2-tuning/](experiments/d2-tuning/) | D2 调参的原图与输入绑定 | `evidence/prompt-parameter-review/build_index.py` 和 actual-parameters.json |

**公开状态。** `paper-reading-room` 里有研究者对应键、原始样本和盲测映射。仓库所有者 11 月 20 日定为不脱敏公开迁入，并提醒对应键已公开、以后的实验要重新生成并封存新键，见[该目录的说明](paper-reading-room/README.md)。

## 二、退役：只留作追溯

不进论文，也不要从这里取数据。第一节列出的文件夹除外。

| 目录 | 是什么 | 什么时候移进来的 |
| --- | --- | --- |
| [evidence/](evidence/) | 被否决的试作、闭源模型诊断、旧口径记录，另有 11 月 3 日的旧六旋三件；2026-11-24 加入 `20261117-r3-check`（#3 第 20 题定为以 research-update 为准） | 2026-11-20，按 [11 月 18 日整理清单](planning/2026-11-18-cleanup-list.md)第六节 |
| [experiments/](experiments/) | 对应的脚本、登记和旧工具 | 同上 |
| [docs/](docs/) | 11 月 9—18 日的旧计划 7 份（研究地基 foundation 含最早的 F1—F5 定案）、旧交接与复盘 5 份、11 月的文献补记 1 份、旧协议 8 份、派单 3 份、旧示意图 1 张 | 2026-11-24，按整理清单第五节 |
| [planning/](planning/) | 11 月 12 日的全局评估入口、Claude 资料入口、Google Doc 快照、路线审核；11 月 18 日的两份仓库清点 | 同上 |
| [manuscript/](manuscript/) | 旧证据矩阵、前三章来源稿、9 份 11 月 10—14 日的旧修订片段、旧六旋结果稿。2.6 节比较表的现稿不在这里，仍在 `manuscript/revisions/` | 同上 |
| [prototypes/](prototypes/) | 已撤下的 E4 配对演练与作者预试界面的说明；工作台根目录 6 份 Gemini 时期的旧说明 | 同上 |
| [logs/](logs/) | 11 月 9—23 日的进度日志（原 `PROGRESS.md`）、STATUS 开头 11 月 18—23 日的每日进展；2026-11-25 加入改写以前的 STATUS 全文（11 月 17 日的逐批实验索引） | 2026-11-24 |
| [entry-history/](entry-history/) | 11 月 23 日以前 `CLAUDE.md` 的全文 | 2026-11-24 |
| 2026-11-25 一批（62 个文件，逐个列在 [MOVES-20261125.tsv](MOVES-20261125.tsv)） | S6 的手册、页面和脚本（作者定不做）；11 月 19 日开机单；11 月 18 日整理清单、11 月 24 日 GitHub 清理工单和脚本（都已执行）；11 月 17 日的 E 盘配置器方案；11 月 10 日 X12 表单预读；工作台 4.0—4.2 和 11 月 18—19 日的复核记录。都放在 `archive/` 下原来的相对路径里 | 2026-11-25（作者第 9 条：无关文件移出去） |
| 2026-11-26 一批（759 个文件，逐个列在 [MOVES-20261126.tsv](MOVES-20261126.tsv)，含原因） | MiniMax H3 托管接口出的全部图及其请求、回执、读数和说明：开发三轮、首轮五图、4.2.1 节轴距两档、配置器开发图、相机布局开发图、条件图分工对比、作者工作簿、S5 试作 8 张、工作台交接包里的作业记录和截图。原在第一节的 `evidence/h3-e2-local-edit-20261113` 也是这类数据，读它的索引一并移进来了，所以改列在这里。另有 Codex 内置图像编辑出的两张样张、E0 闭源对照臂 6 份请求（从未运行）、资料库检索走查的题表与结果。同日全库复查又移入 14 个：论文图4.1（工作簿截图里载着三张 H3 图）；资料库本机小模型（Qwen2.5-0.5B）起草通路及两份无效草稿；工作台早期原型里接 DALL-E 3、Gemini、DeepSeek 的代码。S5 评议图审查页里 1.1 版的四节另存为 [experiments/s5-compactness-pilot/stimulus-review-v1.1.md](experiments/s5-compactness-pilot/stimulus-review-v1.1.md) | 2026-11-26（作者第 11 条：冒烟脏数据全部移出；研究控制变量，文字模型 MiniMax，出图模型 Qwen） |
| 2026-11-26 旧路径整体移出（1,785 个文件按原路径移入，另有论文两份 Word 稿与构建报告 4 个文件移入、第 4—6 章与摘要等 6 份旧稿另存一份；逐个列在 [MOVES-20261126-reset.tsv](MOVES-20261126-reset.tsv)，含原因） | 11 月 17 日以前的全部出图（含 Qwen）及其请求、回执、读数和说明；对旧图做的复核与分析（A3、离线复核）；评旧图的真人评议；F1/F2 以旧 E3 图为父图的登记；工作台的 B2 案例和历史回放；论文里用旧图做的图、第 4—6 章与摘要的旧稿、两份 Word 稿；旧路径的协议与方法冻结单 v1。现行构建还在读的 GPU 日请求模板、环境核对参照图和 H5 的点线图暂留原处，按统一流程重编登记时再移 | 2026-11-26（作者第 12 条：旧路径的数据不再沿用，研究按重建后的链条和新登记重来） |
| 2026-11-26 晚各批重编（28 个文件另存一份；逐个列在 [MOVES-20261126-rebuild.tsv](MOVES-20261126-rebuild.tsv)，含原因） | 环境核对、电机下方喷头确认、H5 第一段照旧 GPU 日模板编的请求、清单、批次单和编法。原处已换成从工作台 4.5.2 取出的请求 | 2026-11-26（各批请求改为从工作台本身取出，见 experiments/workbench-graph） |
| [issues/](issues/README.md) | GitHub 全部工单与 PR 的逐字副本和一览表 | 2026-11-18 写在分支上，2026-11-24 带回并补全 |

## 移动时做了什么

2026-11-24 移动的每个文件的旧路径与新路径列在 [MOVES-20261124.tsv](MOVES-20261124.tsv)；11 月 20 日的移动只是在原路径前加 `archive/`。移动时全库对这些路径的相对链接一并改写；正文里以纯文字写的旧路径没有改，用这张表查。钉在某个提交上的网址（`…/blob/<提交号>/evidence/…`）没有改，仍然指向当时的位置。归档目录内部的脚本如果用相对路径互相调用，深度变了，重跑前要先看一眼路径。
