# evidence：现行的证据

2026-11-20 整理后这里只留两类：写论文要引用的正式证据，和说明设计决定由来的方法开发记录。哪一批能进正文、哪一批只能以数字出现，以[哪些数据能进论文](usable-for-writing.md)为准。退役的批次在 [archive/evidence](../archive/evidence/)。

## 正式证据

| 文件夹 | 是什么 |
| --- | --- |
| [semantic-cards](semantic-cards/) | 评论语料的 36 张证据卡；[early-crawl](semantic-cards/early-crawl/README.md) 是早期电商采集数据的分母、参数覆盖和两份共词矩阵 |
| [semantic40-second-coding-20261115](semantic40-second-coding-20261115/) | 40 条评论的独立第二编码；配对规则与结果在 [experiments/semantic40-pairing](../experiments/semantic40-pairing/README.md) |
| [r0-20261112](r0-20261112/)、[e0-open-20261112](e0-open-20261112/)、[e1-open-20261112](e1-open-20261112/) | R0、E0、E1：部件图条件控制的比例批。图已退役，只留读数（E1 的图已删） |
| [real-product-topview](real-product-topview/) | 真实机型的顶视图及来源登记 |
| [20261115-review-takeover](20261115-review-takeover/README.md) | v1.2 正式 24 张、v1.6 平行 24 张的原图与匿名读数；局部编辑第一版 |
| [gpu-day-20261115](gpu-day-20261115/) | 11 月 15 日 GPU 日的回收件：B2 修订与盲读、E2R、双六旋交接 |
| [e2r-hub-readback](e2r-hub-readback/README.md) | 更正版 E2 六张的轴心位移复核 |
| [e3-quad-qwen-20261115](e3-quad-qwen-20261115/README.md) | 第 4 章 E3 三轮设计的原图与作者取舍 |
| [20261117-offline-review](20261117-offline-review/README.md) | 96 张造型图的两次 AI 盲读；农业植保六旋 39 张与开发读数；结构观察 |
| [e5-individual-reviewed](e5-individual-reviewed/README.md) | 逐图评议 3 份回件，及真实产品与 B2 的紧凑感复核 |
| [20261117-research-update](20261117-research-update/README.md) | 11 月 17 日以后的线下数据：真实机型规格与手册量测、设计图复测、评论复算、S2 题面、A8 取点、S6 重新编码、预试记录约定 |
| [20261117-config-review](20261117-config-review/README.md) | 真实机型手册图面量测（A2）与构型素材审查 |
| [20261117-a1-a4-c1](20261117-a1-a4-c1/README.md) | A1 官方规格、A4 控制方法开发矩阵、C1 预试任务书与计时 |

人的评议数据不在这里，在 [experiments/s5-compactness-pilot](../experiments/s5-compactness-pilot/README.md)（S5）。

## 方法开发

| 文件夹 | 说明什么 |
| --- | --- |
| [historic-guides](historic-guides/)、[s1-axis-repeat](s1-axis-repeat/)、[s1-decomposition](s1-decomposition/)、[g2-six](g2-six/)、[g2b-actual](g2b-actual/)、[l1-layout-actual](l1-layout-actual/)、[prompt-parameter-review](prompt-parameter-review/) | 条件图的画法和强度是怎么选出来的 |
| [guide-choice-20261113](guide-choice-20261113/) | 条件图的分工 |
| [form342-h3-dev](form342-h3-dev/)、[qwen-shape-s4-20261114](qwen-shape-s4-20261114/README.md)、[h3-camera-layout-originals](h3-camera-layout-originals/) | 造型字典的开发，含 H3 的相机布局原图 |
| [section421-h3-span](section421-h3-span/)、[section421-minimax-review](section421-minimax-review/)、[quad-author-selection](quad-author-selection/) | E3 三个设计方向的来源 |
| [g3-actual](g3-actual/)、[x12-calibration](x12-calibration/) | 评议工具的校准 |

## 分支上的证据回到主分支

11 月 18 日清单列为“正式证据”的 18 项现在都在主分支上。11 月 20—21 日从四个分支补回 1,093 个文件；11 月 24 日补回当时漏掉的 47 个，其中正式证据是 `20261117-a1-a4-c1`、`e2r-hub-readback`、`e5-individual-reviewed`、`semantic-cards/early-crawl` 和 `experiments/semantic40-pairing`。两次都取分支上的原 blob；11 月 24 日补回的文件里有的改了链接，原 blob、现 blob 和改了什么逐件记在 [20261120-branch-recovery](20261120-branch-recovery/README.md)。
