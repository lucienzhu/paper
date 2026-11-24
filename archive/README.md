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
| [evidence/h3-e2-local-edit-20261113/](evidence/h3-e2-local-edit-20261113/) | H3 局部编辑开发图 | `evidence/h3-camera-layout-originals` 的索引指到其中 4 张原图 |

**公开状态。** `paper-reading-room` 里有研究者对应键、原始样本和盲测映射。仓库所有者 11 月 20 日定为不脱敏公开迁入，并提醒对应键已公开、以后的实验要重新生成并封存新键，见[该目录的说明](paper-reading-room/README.md)。

## 二、退役：只留作追溯

不进论文，也不要从这里取数据。第一节列出的文件夹除外。

| 目录 | 是什么 | 什么时候移进来的 |
| --- | --- | --- |
| [evidence/](evidence/) | 被否决的试作、闭源模型诊断、旧口径记录，另有 11 月 3 日的旧六旋三件；2026-11-24 加入 `20261117-r3-check`（#3 第 20 题定为以 research-update 为准） | 2026-11-20，按 [11 月 18 日整理清单](../planning/2026-11-18-cleanup-list.md)第六节 |
| [experiments/](experiments/) | 对应的脚本、登记和旧工具 | 同上 |
| [docs/](docs/) | 11 月 9—18 日的旧计划 7 份（研究地基 foundation 含最早的 F1—F5 定案）、旧交接与复盘 5 份、11 月的文献补记 1 份、旧协议 8 份、派单 3 份、旧示意图 1 张 | 2026-11-24，按整理清单第五节 |
| [planning/](planning/) | 11 月 12 日的全局评估入口、Claude 资料入口、Google Doc 快照、路线审核；11 月 18 日的两份仓库清点 | 同上 |
| [manuscript/](manuscript/) | 旧证据矩阵、前三章来源稿、9 份 11 月 10—14 日的旧修订片段、旧六旋结果稿。2.6 节比较表的现稿不在这里，仍在 `manuscript/revisions/` | 同上 |
| [prototypes/](prototypes/) | 已撤下的 E4 配对演练与作者预试界面的说明；工作台根目录 6 份 Gemini 时期的旧说明 | 同上 |
| [logs/](logs/) | 11 月 9—23 日的进度日志（原 `PROGRESS.md`）、STATUS 开头 11 月 18—23 日的每日进展 | 2026-11-24 |
| [entry-history/](entry-history/) | 11 月 23 日以前 `CLAUDE.md` 的全文 | 2026-11-24 |
| [issues/](issues/README.md) | GitHub 全部工单与 PR 的逐字副本和一览表 | 2026-11-18 写在分支上，2026-11-24 带回并补全 |

## 移动时做了什么

移动时全库对这些路径的相对链接一并改写。钉在某个提交上的网址（`…/blob/<提交号>/evidence/…`）没有改，仍然指向当时的位置。归档目录内部的脚本如果用相对路径互相调用，深度变了，重跑前要先看一眼路径。
