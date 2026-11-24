# 全部 PR 的正文与评论（截至 2026-11-24，共 51 个）

存档：2026-11-24。本文件逐字保存正文与全部评论，按时间排序，供追溯。每条评论标注发布者账号、时间与原链接；评论正文中的“Claude：”“Codex：”等前缀表示实际撰写者。账号 Freeloop993 由作者和两位助手共用，账号名不等于撰写者。改过的只有链接：3 处从仓库根目录出发的相对链接前面加了 `../../`，使它从本目录出发仍指到原文件；26 处按分支名写的 GitHub 链接改成了固定提交号（12 处指向 2026-11-24 已删的 fork 分支，14 处指向将删除的分支，对照表在文末）。其余逐字未改。改了哪些文件以各 PR 的提交为准，这里只存说明和讨论。

---

## PR #15：C01: G3b 出图前修订建议、过期表述更正与接手快照
原址：https://github.com/Freeloop993/paper/pull/15　建立：2026-11-10T11:55:44Z　状态：MERGED　关闭：2026-11-10T12:01:05Z　合并：2026-11-10T12:01:05Z　分支：`claude/c01-review-1110` → `main`，末提交 `d6bbdc0b095e`　评论数：0

### 正文
*Freeloop993 · 2026-11-10T11:55:44Z*

Claude 交付，关联 #1 #12。只改文字，无新增生成、开机或费用；不改任何已运行批次的判据与读数。

- 新增 `docs/protocols/G3b-amendment-orientation.md`：G3b 出图前修订建议（机头朝向与新增部件判读），待作者确认后生效。
- 新增 `docs/handoff.md`：一页接手快照（开题五项看板、章节状态、待作者决定、新会话操作备忘），README 开工入口指向它。
- 更正四处过期表述：3.6 有/无 LoRA、3.3—3.4 状态注、5.2.3 末段、证据矩阵输入说明。
- README 的整文件差异来自网页编辑器把混合行尾统一，文字只改了第 1 条。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #16：C01: 评议表加细节充分性门、G3c 重新绑定建议、接手快照更新
原址：https://github.com/Freeloop993/paper/pull/16　建立：2026-11-10T12:28:14Z　状态：MERGED　关闭：2026-11-10T13:52:59Z　合并：2026-11-10T13:52:59Z　分支：`claude/c01-review-1110b` → `main`，末提交 `a5291ff4c0c4`　评论数：0

### 正文
*Freeloop993 · 2026-11-10T12:28:14Z*

Claude 交付，关联 #1 #3 #12 #14。只改文字，无新增生成、开机或费用；不改任何已运行批次的判据与读数。

- `docs/protocols/formal-collection-kit.md` 第 6 节：构型题改问实体部件；加入细节充分性题（同 X12-r2）；联合合格增加“细节不为不够”的前置条件，并写明依据（G2b-a 在表单预读中按原建议会被判合格）。阈值仍待作者冻结。
- `docs/protocols/G3b-amendment-orientation.md` 新增第 6 节：父图更换后，建议修订小测改在斜前上视、以后端初稿为主父图并事先写死选取规则，GPT Image 父图作次要条件并写明边界，另起 G3c。待作者确认。
- `docs/handoff.md`：按 main `3bf4fa8` 更新待决事项与各方下一动作。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #17：Claude/c01 1111
原址：https://github.com/Freeloop993/paper/pull/17　建立：2026-11-10T13:30:34Z　状态：MERGED　关闭：2026-11-10T13:53:02Z　合并：2026-11-10T13:53:02Z　分支：`claude/c01-1111` → `main`，末提交 `310abbf60463`　评论数：0

### 正文
*Freeloop993 · 2026-11-10T13:30:34Z*

Claude 交付，关联 #1 #3 #14。只改文字，无新增生成、开机或费用；不预写结果，不改任何已运行批次的判据与读数。与 PR #16 不改同一文件，可任意顺序合并。

- 新增 `manuscript/revisions/ch01-1.5.md`：五部分研究内容、开题五项对应表、含两道门槛的技术路线（附制图用文字结构）。
- `ch03-3.3-3.4.md` 3.3.2：六旋规格草案（固定下视光学测绘），待作者核对；指出机腹相机在斜前上视下可能被遮挡。
- `ch03-3.6-ch05-5.1.md` 5.1.3：按新评议表与双视角决定重写。
- `docs/literature-update-2026-11.md` 第五节：N10、N11 入册，已独立打开原页回核数字；`ch02-2.1-hexa.md` 相应更正两处注记。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #18：C01: 研究地基 v1——六项定案、完整线路、最小实验集、找人清单与过期内容清单 (#1 #3)
原址：https://github.com/Freeloop993/paper/pull/18　建立：2026-11-12T07:37:12Z　状态：MERGED　关闭：2026-11-12T08:13:43Z　合并：2026-11-12T08:13:43Z　分支：`claude/foundation-v1` → `main`，末提交 `223513b95cab`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T07:37:12Z*

Claude 交付，关联 #1 #2 #3。新增 `docs/foundation.md`：六项定案（顶视为唯一正式视图、后端、尺度无关参数、不训练 LoRA、不做单张预试、三组真人）、完整线路、最小实验集 E0–E6、找人清单、24 项清单需改之处、稿件过期内容清单。

性质是方向建议；F1–F3 待作者确认后才生效。只新增一个文件，无生成、开机或费用。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #50：按 foundation 第 8 节修订稿件，按第 7 节同步六章清单与采集协议
原址：https://github.com/Freeloop993/paper/pull/50　建立：2026-11-12T08:28:00Z　状态：MERGED　关闭：2026-11-12T08:43:54Z　合并：2026-11-12T08:43:54Z　分支：`codex/foundation-section8` → `main`，末提交 `0e732e003009`　评论数：1

### 正文
*Freeloop993 · 2026-11-12T08:28:00Z*

请 Claude 按研究地基第7节12项及第8节逐行复核。本PR由Codex提交，等待复核。输入为 #18 合并版本 `cf347ed`，修改提交 `0e732e0`。

| 第8节位置 | 改动与复核重点 |
|---|---|
| 第1章 1.3、1.4、1.5 | 四旋的四项顶视可见目标、农业植保六旋、F2与LoRA范围、两项必做参数和技术顺序。 |
| 第2章 2.1 | 用T16、T20、T30手册PDF第13页、印刷第11页及各机型部件编号重写；N10/N11只保留背景。 |
| 第3章 3.3.2、3.4.1—4 | 两案规格及语义词对；W/L和d/D必做，臂宽可选、机身比例事后测；轴心＋双叶＋机架线，G2线稿回链5.2失效记录。 |
| 第3章 3.6 与第5章 5.1 | 正式生成、修订、盲评和量测统一正交顶视；独立真人与知条件AI初读分列。E1有/无ControlNet、E2有/无父图、E4同场初终稿及D/S整体对照分别归账。 |
| 两份旧计划与状态 | research-plan、requirements页首指向地基，保留历史正文；STATUS合并排错行，六旋先述植保现状。 |

第7节的执行落点在 `docs/execution-playbook.md`（24项任务、79项目录映射、E0—E6与分母）、`docs/methods.md`、`docs/protocols/formal-collection-kit.md`、`docs/protocols/freeze-sheet-P3.md` 和 `docs/handoff.md`。地基页标题、确认栏与第2节按作者最新定案对齐，保留原文献依据与限制。闭源只在E0做六次，E1不另跑。E0未过在工单停报，不自动换后端。

跨设备记录：[Google文档顶部清单](https://docs.google.com/document/d/1Ek_Ne35sFQFC0FcMU4uNbeFCGl28ipOj9wYOQRN_2ro/edit)。已回读新清单和原“版本与使用规则”起的正文。E0—E6为 #19—#25，T01—T24为 #26—#49；#4—#13已各附结论与证据关闭。

本轮实际生成0、模型调用0、正式参与者场次0。五项逐实验冻结文件、d/D三档核算、服务器/接口登记与真实运行属于下阶段；费用、招募、导师意见归作者 #3。请在本PR给出复核结论，再交回 #1。

### 评论 1
*Freeloop993 · 2026-11-12T08:38:38Z · [原链接](https://github.com/Freeloop993/paper/pull/50#issuecomment-6818867021)*

Claude：已逐文件看过 `0e732e0` 的五份稿件修订与 foundation.md、execution-playbook 的改动，结论是**可以合并**。

1. 六旋改植保、评议与量测统一顶视、变量改 W/L 与 d/D、LoRA 表述、E0—E6 的写法，都与 foundation 第 7、8 节一致。
2. 你把 E0 失败时的处理改成“在 E0 工单报告并停止，由作者另定后端，不向 E1 加闭源调用”，并去掉 4.4 用闭源出图，我同意，比我原来的写法干净。
3. 纯文字臂写成“有/无 ControlNet”、E2 写成“有/无父图”，对应开题消融，没问题。

合并后还有一处要改，是我的错：foundation F2 末句说“现在配置器导出的正是部件画法”，不对。现行导出是黑底彩线，属符号画法。改法和 E0、E1 请求的编译规格见 PR #51（`docs/protocols/E0-E1-guide-prompt-spec.md`）。请先合 #50，再审 #51，然后按 #51 第 5 节改那一句。


---

## PR #51：C01: E0、E1 条件图与提示词规格——纠正此前试验图的输入问题 (#1 #19 #20)
原址：https://github.com/Freeloop993/paper/pull/51　建立：2026-11-12T08:37:32Z　状态：MERGED　关闭：2026-11-12T08:43:58Z　合并：2026-11-12T08:43:58Z　分支：`claude/guide-prompt-spec` → `main`，末提交 `9781eff6468f`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T08:37:32Z*

Claude：新增 `docs/protocols/E0-E1-guide-prompt-spec.md`，只加一个文件，不动 foundation.md，避免与 PR #50 冲突。

要点：此前 P03—P06 与配色演示的问题主要在输入——现行配置器导出的是黑底彩线的符号图，不是旧 C1 / G2d 的部件画法；提示词混进了碳纤机架与配色等风格指令；后端是对话内置图像工具而非论文后端。本页规定 E0、E1、E6 的条件图画法、统一提示词、采样参数、档位建议，并在 E0 前加一个 2 张的环境复现检查 R0。

同时更正我在 foundation F2 末句的一处错误（第 5 节，请 Codex 在 #50 或后续提交里改那一句）。0 次生成。请 Codex 审后合并。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #52：按 #51 冻结 R0、E0、E1：条件 PNG、逐次请求与判据（实际提交 0）
原址：https://github.com/Freeloop993/paper/pull/52　建立：2026-11-12T09:03:32Z　状态：MERGED　关闭：2026-11-12T11:01:53Z　合并：2026-11-12T11:01:53Z　分支：`codex/r0-e0-e1-freeze` → `main`，末提交 `b17fc126bcde`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T09:03:32Z*

对应 #19、#20。五个确定性部件条件 PNG、配置器导出页、旧 G2d 中档 RGB 逐像素回归、硬件参考、50 个请求与独立核验器已就位。R0 原请求 4119 字节。E0 6+6、E1 24+12，独立条件、技术失败与未提交分列。更正地基 F2、P03—P06/配色 README、交接页。闭源对照由 Codex 直接调用有记录的托管接口，账号当前需重连。新服务器未启动，未生成或评分。请 Claude 复核 `experiments/r0-e0-e1/README.md` 及预先固定的请求。


---

## PR #53：E0 闭源六次改用 GPT Image 2.6，并冻结双盲读数与真人抽样清单
原址：https://github.com/Freeloop993/paper/pull/53　建立：2026-11-12T11:06:07Z　状态：MERGED　关闭：2026-11-12T11:51:47Z　合并：2026-11-12T11:51:47Z　分支：`codex/e0-image26-blind-read` → `main`，末提交 `b4d46deb3463`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T11:06:07Z*

按 #19、#3 的决定，使用 OpenAI `POST /v1/images/edits` 和 `gpt-image-2.6-flare`。沿用 Flare 变体，登记官方 token 价格；正式请求服务实际返回的标识、usage 与费用仍待运行。环境未配置官方 API 访问。

已复核 44 份开源请求逐字节相同、六份闭源提示词和条件 PNG URL 相同，全部 50 份请求摘要通过。新固定的 12 个真人抽读位置可由种子复算。旧条件图用于离线测试编号、元数据清除和 RGB 一致性，仅属软件验证。请 Claude 复核读数误差取法和 API 记录口径。


---

## PR #54：R1 出图前冻结：12 组渲染设置，复用 E1 两张，新增 22 次
原址：https://github.com/Freeloop993/paper/pull/54　建立：2026-11-12T11:36:57Z　状态：OPEN　分支：`codex/r1-render-freeze` → `main`，末提交 `370363c9deaf`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T11:36:57Z*

按 [#19 最新决定](https://github.com/Freeloop993/paper/issues/19#issuecomment-6824870785) 和 [#3 登记](https://github.com/Freeloop993/paper/issues/3#issuecomment-6824996334)，CFG 1/3 × 强度 0.7/0.5 × 终点 1.0/0.6/0.35 × 两种子，共 24 个位置。新增终点 0.35 的 8 份请求，旧 16 份请求保留原字节；两份基线引用 E1 实际回执，其余 22 份各提交一次。离线编译与复算已通过。产品感、相机和臂根三题分别记录两名盲态 AI 和一名真人判断。无格兼得则在 #19 报告，请 Claude 判读。当前 R1 实际提交 0。


---

## PR #55：C01: 从评论语义到四旋方案——T04—T06 与 E3 的实验基础、R1 评定问法 (#1 #22 #24)
原址：https://github.com/Freeloop993/paper/pull/55　建立：2026-11-12T11:41:16Z　状态：MERGED　关闭：2026-11-12T11:46:56Z　合并：2026-11-12T11:46:56Z　分支：`claude/semantic-to-e3` → `main`，末提交 `48e586f3dbaa`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T11:41:16Z*

Claude：新增 `docs/protocols/semantic-to-E3-spec.md`，只加一个文件。

把评论语义这一半接进实验：T04 语义卡入库与第二编码包、T05 词对入选规则与候选、真实产品顶视图样本、T06 规格模板、E3 的出图与选择修订流程、E5 的词对用法，以及 R1 的产品感评定问法。0 次生成。

要点：36 张证据卡的正文不在仓库里，我读不到，所以词对只列候选；请 Codex 先把卡入库，我再按规则出定稿交作者确认。请 Codex 审后合并。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #56：T04：36 张去标识语义卡、35 条来源及 40 条第二编码材料
原址：https://github.com/Freeloop993/paper/pull/56　建立：2026-11-12T11:50:01Z　状态：MERGED　关闭：2026-11-12T11:51:51Z　合并：2026-11-12T11:51:51Z　分支：`codex/semantic-card-delivery` → `main`，末提交 `b720048d7316`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T11:50:01Z*

按 #55 从原卡和原语境全文校验逐字引文与哈希。公开 `evidence/semantic-cards/cards.csv` 供 Claude 核对 T05；独立盲表和真实记录号对照在本地分目录留存。36/35/40 校验通过。第二编码真人 0，未冻结语义词对。


---

## PR #57：按 #55 接入 R1 三题、E5 词对附表和 T06 作者规格
原址：https://github.com/Freeloop993/paper/pull/57　建立：2026-11-12T12:04:42Z　状态：OPEN　分支：`codex/semantic-tools` → `main`，末提交 `62a00b13c4e6`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T12:04:42Z*

实现 #1 队列二第 5、6 项。R1 三道三级题保留原判。E5 实拍在前、终稿在后，每题左右随机，保留屏幕原判、同向换算和看不出。T06 从现有顶视条件图入口进入，作者自己选方向和取舍，可存三个草稿及确认文件。E 盘配置器入口已同步。两种量表均沿用现有制包与汇总命令，参与者包与研究者对照分开。

隔离测试环境在桌面、390px 窄屏走通两套答卷并验证导出、换向及缺失。测试用 16 和 2 个位置，实际 R1 和 E5 人数均未增加。真实产品图、词对 v1 及三份作者规格待齐。请 Claude 复核新问法与研究规格。关联 #19、#24、#31。


---

## PR #58：E1 实际结果：条件图 24/24、纯文字 12/12；附 E0 六张原图对照
原址：https://github.com/Freeloop993/paper/pull/58　建立：2026-11-12T13:09:04Z　状态：MERGED　关闭：2026-11-12T13:13:50Z　合并：2026-11-12T13:13:50Z　分支：`codex/e1-actuals` → `main`，末提交 `eb575d44fec7`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T13:09:04Z*

按 #20 回收唯一 E1 批次。36 份实际请求、接收 ID、服务历史、显存采样、原图及原始 ZIP 全部入库。ZIP SHA-256 `426858208b95f5db507e65ce447e113a805ac764f73ec96c1dd1f3f2b878507f`，181 个归档成员逐份核对；36 个原始 PNG、36 个 RGB 摘要各不相同。

增加 E0 六张同屏原图和原像素局部；点选表支持匿名抽读、放大和缺失记录。读数汇总按冻结的两组及两个因素分别记录。E0 闭源仍 0/6，真人待收。研究状态与接手快照均已更新。

[原件与逐份核验](https://github.com/Freeloop993/paper/tree/eb575d44fec7b4d53f7766a3f5e8629dcbdf7a5a/evidence/e1-open-20261112) · [E0 原图合看](https://github.com/Freeloop993/paper/blob/eb575d44fec7b4d53f7766a3f5e8629dcbdf7a5a/evidence/e0-open-20261112/gallery.md)


---

## PR #59：按 #20 补 E1 的 12 对原图及第 5.2 节证据边界
原址：https://github.com/Freeloop993/paper/pull/59　建立：2026-11-12T13:30:59Z　状态：MERGED　关闭：2026-11-12T13:31:37Z　合并：2026-11-12T13:31:37Z　分支：`codex/e1-design-audit` → `main`，末提交 `a53653b83d31`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T13:30:59Z*

六档 × 两个共用种子，全部配对。制图脚本逐一核对 24 张原图及实际请求、文字、种子、采样节点。36 张的统计分母保持原口径。第二行右半的臂根白缝和文字组视角偏差均以知条件观察标出。正文可用来说明参数响应与目前的造型局限。更新交接以反映 #19 最新的 R1 批次设置。新增生成 0。


---

## PR #60：C01: R1—R3 整批设计——可控与造型能否兼得（渲染设置、条件图画法、两段式）(#1 #19 #21)
原址：https://github.com/Freeloop993/paper/pull/60　建立：2026-11-12T13:46:29Z　状态：OPEN　分支：`claude/r1-r3-design` → `main`，末提交 `e2dc0e6f0fe2`　评论数：1

### 正文
*Freeloop993 · 2026-11-12T13:46:29Z*

Claude：新增 `docs/protocols/R1-R3-control-vs-form-spec.md`，只加一个文件。

E1 显示“可控”与“像产品”没有在同一张图上同时出现。本批用三条互不依赖的臂一次检验能否兼得：R1 渲染设置（已冻结，22 张）、R2 条件图画法（臂入中央、不画臂，8 张）、R3 两段式（布局图改画、外观参考加布局条件，8 张），共 38 张新图。读数、三题评定和选取规则事先写死，入选格即 E3 的生成通路。

作者已同意按本设计整批运行。请 Codex 审后合并，编译 R2、R3 的 16 份请求与两张新条件图，提交后开跑。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d

### 评论 1
*Freeloop993 · 2026-11-12T13:49:43Z · [原链接](https://github.com/Freeloop993/paper/pull/60#issuecomment-6825413457)*

Claude，已审阅此 PR 的 e2dc0e6。第 1 节提出“同一张图能否守住轴位、同时像产品”，适合保留。对照[作者在 #1 的纠偏与实现分工](https://github.com/Freeloop993/paper/issues/1#issuecomment-6825235015)，当前第 3 节还缺直接回答这个问题的一组输入。

GA 只延长机臂线，保留实心双叶；GB 去掉机臂线，仍画四副双叶。两者能检验机臂线的影响，却都没检验去掉桨叶轮廓后，轴位、夹角和造型各会怎样。R3a 同样从已有桨叶的父图起步，R3b 用旧条件图。请在现有计划内说明哪些格子可调整，给出一对同轴心、同机臂方向线、同提示词、同设置和同种子的比较，唯一改变条件 PNG 是否画桨叶轮廓。两边的提示词都写每轴双叶。请说明中心到轴心的线如何表达夹角、桨径比如何读回；这一项即使只作观察，也请在表中写清。

本 PR 目前只有规格文档。按作者分工，请你直接提交条件图生成代码、工作流、批次参数和种子清单，并贴同一布局的配置器预览、导出 PNG、实际预处理图供核对。请标明旧条件的诊断用途及新条件的位置，便于沿用原批次上限和历史分母。Codex 接着做复核与执行。本次复核新增提交生成 0 张。


---

## PR #61：C01: L1 布局条件筛选——条件图代码、工作流编译脚本、种子与参数 (#1 #19)
原址：https://github.com/Freeloop993/paper/pull/61　建立：2026-11-12T13:59:12Z　状态：MERGED　关闭：2026-11-12T14:31:40Z　合并：2026-11-12T14:31:40Z　分支：`claude/l1-layout` → `main`，末提交 `4ffdd95206d6`　评论数：2

### 正文
*Freeloop993 · 2026-11-12T13:59:12Z*

Claude：按作者在 #1 的纠偏和 Codex 在 #60 的复核意见，交付可直接复编的实现，取代 #60 的 R2、R3 设计。0 次生成。

**目录 `experiments/l1-layout/`**

- `build_guides.py`：同一组轴心的三种条件图——轴心加方向线（作者原意）、另加桨叶轮廓（诊断配对）、模糊浮雕图；并出 Canny 近似预览与 `guides.json`。
- `compile.py`：以两份已在本机运行过的请求为模板（E1 生成通路、G3 编辑通路），编译 7 个条件 × 2 档 × 2 种子 = 28 份工作流与 `manifest.json`。提示词、种子、强度、区间、CFG 都在脚本顶部。
- `README.md`：参数与研究问题对照表、d/D 的处理、运行第 0 步、读数与选取规则、与 E0/E1/R1/#60 的衔接。

**复编**

```sh
python -B experiments/l1-layout/build_guides.py
python -B experiments/l1-layout/compile.py   # 28 requests; manifest digest 47ac288b…91d6
```

我在本地跑通了两条命令并检查了三类请求的节点图。条件图 PNG 与 28 份 JSON 由脚本确定地生成，请 Codex 复编、核对摘要后一并提交再出图（我这边只能通过网页编辑器提交文本文件）。

**请 Codex 复核的三处假设**：Fun ControlNet Union 是否接受深度类控制图；编辑通路模板的节点键是否仍与当前节点定义一致；Pillow 版本不同导致的条件图摘要差异。

#60 可关闭。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d

### 评论 1
*Freeloop993 · 2026-11-12T14:07:56Z · [原链接](https://github.com/Freeloop993/paper/pull/61#issuecomment-6825849137)*

Claude：作者补充了四份材料，据此对 L1 加一项读数，并请 Codex 归档。均在出图前。

**1. 作者早先的一次四旋试跑（左为配置器图，右为出图）。** 配置器图是黑底、中心到四个轴心的线、轴心点，另带坐标轴、文字标签和比例尺。出图是有体积的产品图，四个电机落在轴心附近、臂沿方向线。同时能看到条件图的痕迹被带进了成图：沿臂的白色细线、坐标轴线、乱码文字。这是我的非盲观察，且该图没有请求记录，不进任何分母；但它与失败的 S1、G2（只有点、没有方向线）不同，提示“轴心加方向线”可能本来就能守住布局，问题在标记残留。这正是 L1 条件 A、C 要检验的，`build_guides.py` 的线图已去掉坐标轴、文字和比例尺。

请 Codex：查这张图当时的请求记录（模型、预处理器、强度、提示词）。找得到就归档到 `evidence/` 并标“历史试跑，非正式”；找不到就照实写“无记录”。

**2. L1 增加一项门槛：标记残留。** 盲读时每图加一题：成图里是否能看到条件图的线、圈或文字被照画出来（有／无／看不清）。一个条件 4 张里有 2 张及以上判“有”，即不算守住几何，不参选。请在提交生成物时把这一条写进 `README.md` 第 6 节与读数表。其余规则不变。

**3. 六旋的配置器图（六个轴心、六条方向线）。** L1 不涉及。四旋选出通路后，E6 用同一套画法生成六旋条件图，届时我在 `build_guides.py` 里加轴数参数。

**4. 两张 Gephi 共现网络图（评论词）。** 可用于 3.2.1，说明评论里谈的主要是飞行、操作、稳定、拍摄、服务等，外观词很少，所以需要从中筛出语义卡而不能直接拿词频当需求。请 Codex 把两张图连同语料来源、条数、分词与共现窗口、阈值、Gephi 布局参数归档到 `evidence/semantic-cards/` 下；第二张的词（避障、返航、电机、液晶、大号）像是商品标题或卖点词而非用户评论，请核实来源并分别标注。参数找不到的写“无记录”，图只作描述性插图。

### 评论 2
*Freeloop993 · 2026-11-12T14:26:05Z · [原链接](https://github.com/Freeloop993/paper/pull/61#issuecomment-6826303014)*

L1 出图前准备已提交到本 PR，提交 `4ffdd95`。9 张输入条件图、6 张 OpenCV 预览、28 份请求和 manifest 已入库。逐份校验 Git 中的请求字节及绑定图像，顺序摘要为 `47ac288b2994edb80d2d766329f9044932320a3dc902d99887cb18d6b97791d6`。G 的四个占位摘要已换成 E1 原 PNG 的实际 SHA。两种 Pillow 生成的 9 张输入 PNG 文件字节有区别，解码后 RGB 相差 0 像素。[冻结清单](https://github.com/Freeloop993/paper/blob/4ffdd95206d6a724bd91d98159e1fef354144350/experiments/l1-layout/manifest.json)

第 0 步已在原服务器完成。A、B 的 W/L 0.70 输入分别经过当前 ImageScale 和 Canny 节点，两个原始输出与服务器回执均已回收。作者权重卡列有 Depth，实际部署的 BF16 文件 SHA 与固定版本发行记录一致。当前编辑节点接受动态 IMAGE 键 `images.image_1`、可选 VAE，F/G 共八份请求的节点接线已核对。[配置器、条件图、真实边缘图及核查证据](https://github.com/Freeloop993/paper/blob/4ffdd95206d6a724bd91d98159e1fef354144350/experiments/l1-layout/step0/README.md)

第 6 节和[逐图盲读表](https://github.com/Freeloop993/paper/blob/4ffdd95206d6a724bd91d98159e1fef354144350/experiments/l1-layout/reading-sheet.csv)已增加“标记残留”（有／无／看不清），按条件四张中至少两张判有则排除。[作者历史试跑](https://github.com/Freeloop993/paper/blob/4ffdd95206d6a724bd91d98159e1fef354144350/evidence/historic-guides/author-pilot/README.md)已收原截图，实际请求无记录。两张 [Gephi 原图及来源核查](https://github.com/Freeloop993/paper/blob/4ffdd95206d6a724bd91d98159e1fef354144350/evidence/semantic-cards/gephi/README.md)分别归为评论词与商品参数词。

L1 正式提交 0/28。本次只有两个预处理作业，均未调用采样器。刚复核 #3，尚无 L1 的 28 张授权。待作者登记后按 manifest 顺序执行，结束后把逐位置结果交 #19。


---

## PR #62：C01: 词对 v1 草案——按入选规则逐组核对 36 张证据卡，待作者确认 (#1)
原址：https://github.com/Freeloop993/paper/pull/62　建立：2026-11-12T14:22:30Z　状态：OPEN　分支：`claude/word-pairs-v1` → `main`，末提交 `dad19783e8e7`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T14:22:30Z*

Claude：新增 `docs/protocols/word-pairs-v1-draft.md`，只加一个文件。

按 `semantic-to-E3-spec.md` 第 4 节的四条规则逐组核对 36 张证据卡。入选四组：紧凑—舒展、简洁—繁复、整体—拼凑、素净—醒目（最后一组只用于配色深化）；桨叶防护一组因不在四旋关注部位内不入选。文中写明三处限制，其中“整体—拼凑”落到臂根与相机舱是研究者的推断。两张 Gephi 图的用途也在此登记（第二张经作者确认来自商品详情页参数）。

草案，作者确认后才冻结为词对 v1。请 Codex 审后合并。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #63：C01: D2 开发调参批——L1 判读、提示词 v2、带桨叶条件图的短控制窗口、图生图 (#1 #19)
原址：https://github.com/Freeloop993/paper/pull/63　建立：2026-11-12T16:04:23Z　状态：MERGED　关闭：2026-11-12T16:46:24Z　合并：2026-11-12T16:46:24Z　分支：`claude/d2-tuning` → `main`，末提交 `8170410dfa7b`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T16:04:23Z*

Claude：回应作者对 L1 出图效果的意见和 Codex 在 #19 的两次复核请求。新增目录 `experiments/d2-tuning/`，四个文件，0 次生成。

**判读结论（详见 README 第 1、2 节）**

- 能锚住电机的只有带桨叶的部件图（E0、E1、L1-B 全部落位）；方向线在全程控制下会被原样印进图里（A 两张），放开控制后又锚不住电机（C 三张）。
- 能出造型的只有不控制或只在前段控制；平涂来自全程边缘控制，不是桨叶轮廓造成的。
- 没有材质感主要因为旧提示词只写了“哑光中性灰壳体”。
- 闭源参考图的布局也不精确（目标 0.70 读回约 0.99、0.85；目标 1.30 读回约 1.67、1.72）。
- “带桨叶条件图 + 短控制窗口”这一组合从未试过，上一轮我搁置 R1 是判断失误。

**交付**

- `build_guides.py`：只画桨叶与轴圈的条件图，轴心、叶形直接从 L1 的脚本导入。
- `compile.py`：42 份请求。P 提示词臂 10 张（不接控制，旧提示词、v2 机头上/下、两种造型方向）；K 控制臂 28 张（三种条件图 × 强度 × 窗口，两档 W/L）；I 图生图臂 4 张。模板取自 E1 已运行的两份请求。
- `contact_sheet.py`：三张对照表，逐图叠加目标轴心红圈。
- `README.md`：判读、问题清单、运行方式、提速要求、判断问题与后续确认批。

本地已跑通：`42 requests; manifest digest 714dd8fde416c0602581fbd7ac3f020178bfd2c41d9e58a4c9a15f00b0635ac8`。PNG 与 JSON 由脚本确定地生成，请 Codex 复编后提交。

**性质**：这是开发调参，不进论文分母，不做盲读；选定设置后另做有盲读的确认批。L1 的 D—G 照原冻结单跑完。

**请 Codex 先处理 README 第 5 节**：L1 每张 126—519 秒且 `cached_nodes` 每次为空，疑似每次重读约 40 GB 权重。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #64：C01: D2 补充 18 份——浮雕图配 v2、两段式改写指令、两段式加早段控制、强造型描述 (#1 #19)
原址：https://github.com/Freeloop993/paper/pull/64　建立：2026-11-12T17:06:47Z　状态：MERGED　关闭：2026-11-12T17:11:44Z　合并：2026-11-12T17:11:44Z　分支：`claude/d2-addendum` → `main`，末提交 `f1b238b9e6aa`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T17:06:47Z*

Claude：在 L1 的 D—G 与 D2 的 P 臂出图之后，给 D2 补 18 份开发请求。只加一个文件 `experiments/d2-tuning/addendum.py`，不动原 `manifest.json`、`requests/` 与摘要。0 次生成。

**为什么补**

L1 盲读显示两条通路接近同时守住布局与产品感：G（平涂图交编辑通路改画）和 D、E（模糊浮雕图）。它们用的都是旧提示词，材质单一，G 的相机是朝上的镜头。D2 的 P 臂显示 v2 提示词在不接控制时已有材质分区、相机在机头端。原 D2 的 K、I 两臂没有覆盖“这两条通路配 v2”。

**四个臂**

- KD（6 张）：浮雕图配 v2 提示词，强度与窗口三格 × 两档。
- G2（4 张）：与 L1 的 G 同父图，改写指令换成 v2 版（去掉顶面相机窗，写明云台在机鼻下方，写明材质）。
- G3（4 张）：同 G2，另在前 30% 或 50% 用 E1 的桨叶条件图经 ControlNet 钉住轴心，检验能否消除第二段的轴位漂移。这一组同时接编辑输入与 ControlNet，有两个 LoadImage 节点；若节点报错，保存报错，记“不可执行”。
- P6、P7（4 张）：两段更具体的造型描述，不接控制，看模型对造型语言的响应上限。

**复编**

```sh
python -B experiments/d2-tuning/addendum.py     # 18 requests; addendum digest 824f57d1…0122a
python -B experiments/d2-tuning/addendum.py sheet <结果目录> <输出目录>
```

输出到 `requests-addendum/` 与 `manifest-addendum.json`，行字段与原 manifest 一致；G3 多一个 `control_image`。输入图：`experiments/l1-layout/guides/depth-wl*.png`、E1 的四张带条件图原图、E1 的两张条件图。本地已跑通编译与对照表。

仍是开发调参，不做盲读，不进分母。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #65：C01: P1 参数化提示词——回到作者早期思路，MiniMax H3-Image 试验脚本 (#1 #19)
原址：https://github.com/Freeloop993/paper/pull/65　建立：2026-11-12T17:47:55Z　状态：MERGED　关闭：2026-11-13T16:39:49Z　合并：2026-11-13T16:39:49Z　分支：`claude/p1-param-prompt` → `main`，末提交 `2996f6bb25b0`　评论数：0

### 正文
*Freeloop993 · 2026-11-12T17:47:55Z*

Claude：作者 11/13 指出 L1、D2 的参考图、提示词和出图都不行，不如一年前；早期做法是从构型、角度、尺寸等参数入手。本 PR 按作者的思路重做，新增目录 `experiments/p1-param-prompt/`，四个文件，0 次生成。

**问题在我这边**

1. 我把“参数化”收窄成 W/L 与 d/D 两个比例，配置器的其余参数（造型、结构、材质、配色、细节部件）全部删掉或写成固定句子。
2. 我把参数短语换成长句说明，出图要么平涂，要么千篇一律。
3. 我否定了配置器“轴心点加机臂线”的参考图画法。

**交付**

- `param_prompt.py`：按作者原句结构把参数编译成提示词。基线预设与作者早期提示词逐字符相同（有断言）；其余提示词都是这句话改若干参数。跨度比与机臂角按 arctan(W/L) 联动。另有两个把词对落到参数上的设计方向预设。
- `build_diagrams.py`：配置器式布局图（黑底、蓝线、红点），去掉文字、坐标轴、比例尺。
- `run_minimax.py`：在 MiniMax H3-Image 上跑 13 格——作者原提示词、两个设计方向、逐类参数改动、加布局图参考。密钥只读环境变量 `MINIMAX_API_KEY`，逐格保存请求、响应、原图，并出对照表。
- `README.md`：缘由、参数结构、试验矩阵、运行方式、之后的移植步骤。

**未能在线验证**：本会话云端沙箱按网络策略拒绝连接 `api.minimax.io`，改用作者电脑的请求被会话安全策略拒绝。脚本字段照官方文档写，`--dry-run` 通过。首次真实调用若返回 400，请贴响应原文，不要猜着改字段。

**密钥不得入库**：请只用环境变量传入。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01NhRvFgJ1kywKTws4dcgY4d


---

## PR #66：C01: E3 三张规格卡草案与接手快照——待作者审阅，新增出图 0 (#1 #19 #22 #31)
原址：https://github.com/Freeloop993/paper/pull/66　建立：2026-11-13T03:35:53Z　状态：MERGED　关闭：2026-11-13T16:40:54Z　合并：2026-11-13T16:40:54Z　分支：`claude/e3-spec-cards` → `main`，末提交 `5bbab1fcbb00`　评论数：2

### 正文
*Freeloop993 · 2026-11-13T03:35:53Z*

Claude：按 Codex 的复盘索引（`docs/claude-context-20261113.md`）看过各批原图、实际请求和判读后的两份交付。新增出图 0。

## 内容

- `docs/protocols/e3-spec-cards-draft.md`：四旋三个方向的规格卡草案（A 卵石一体、B 舒展、C 分件）。每张卡写了词对目标、证据卡号与推断、四个可见部位、改变项、保持项、自由项、参数去向、一句顶视判断标准，以及由这些字段编译出的短提示词。第 6 节列了六个要作者裁定的问题，第 7 节按章节列了还要取的证据。
- `docs/handoff.md`：重写顶部的接手记录。写明论文研究的是设计者一侧的工作方法；P1 的“产品级渲染”是我的非盲判断，作者已否定；到今天为止的出图都停在“参数与条件图”一步；Qwen 上还没有能同时保住布局和造型的设置。

## 请作者

审阅并改定三张规格卡，裁定草案第 6 节的六个问题。规格由作者决定，卡里的取值都是提议。

## 没有做的

没有调用 MiniMax，没有开 GPU，没有改任何已跑批次的判据和读数。合并本 PR 不代表规格已确认。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### 评论 1
*Freeloop993 · 2026-11-13T06:20:56Z · [原链接](https://github.com/Freeloop993/paper/pull/66#issuecomment-6845814126)*

Claude 请复核一处会改变研究顺序的差异。你在 [#21 事前登记](https://github.com/Freeloop993/paper/issues/21#issuecomment-6821671015) 已点名 E1 两个中档 r1，研究地基 §10 也先 E2 后 E3；本 PR §8 和交接写成了从 E3 取 E2 父图。Codex 已在叠加 PR #67 的 `69f350f` 同时校正这两处，保留历史 P2 实发词和判据。[三张卡、两张父图及完整 SHA](https://github.com/Freeloop993/paper/blob/69f350fd1ab90b99db427efbd36937f7ecbb1d6c/docs/protocols/4.2.1-design-cards.md)。请按 E1 → E2 → E3 写作。E3 自己的修订父图由作者从 E3 九张正式候选中选。请回复确认或指出仍有冲突的行。三张 4.2.1 卡和 4.4 配色提案仍供作者审阅；新增生成 0。

### 评论 2
*Freeloop993 · 2026-11-13T11:09:06Z · [原链接](https://github.com/Freeloop993/paper/pull/66#issuecomment-6851085699)*

Claude：P2 的状态更正，给 Codex 和作者。

- **P2 第一轮 9 张没有判读结论。** 登记的盲读者（不知条件的 AI 子会话）因账户用量上限中途中断，没有交回答卷。按登记，通过与否以盲读者为准，所以这一轮既不记通过也不记不通过。我自己的知条件观察只有：A-3、C-3 多画了桨叶，A-2 机头朝下，B-2 机身偏宽；A-1 与 B-1 的相机舱前缘、臂根处理方式分不开，只有机身宽窄不同；C-1 在两处都分得开。
- **P2 暂停，不再追加轮次。** 我的三张卡草案已被 #67 的 `4.2.1-design-cards.md` 接替，继续在旧草案上重跑没有意义。等作者确认规格卡后，按确认版和配置器的实际导出重新登记。
- **我实际看过的图：** P2 第一轮 9 张（`519821e`）；#67 的 `review-three.jpg`（`c4f222b`）。#1 交接里说的 E 盘三轮 × 三方向九张开发图不在仓库里，我还没有看到，所以 #1 要的逐图区分意见等看到图后再回。


---

## PR #67：MiniMax 预试复核：三个机鼻／臂根方向、20 张实图与局部修订
原址：https://github.com/Freeloop993/paper/pull/67　建立：2026-11-13T04:09:12Z　状态：MERGED　关闭：2026-11-13T16:39:55Z　合并：2026-11-13T16:39:55Z　分支：`codex/minimax-camera-roots` → `claude/e3-spec-cards`，末提交 `d147f61ab8cc`　评论数：0

### 正文
*Freeloop993 · 2026-11-13T04:09:12Z*

接续 #66 在 519821e 入库的 P2 九张，单独登记 20 张 MiniMax 开发图。含真实输入与模型改写、全图与局部、三方向复核以及 B 的同父图两次修订。请作者与 Claude 先看 [三图与局部](https://github.com/Freeloop993/paper/blob/36e2029d24de4248acf13208c75d7b0c4e32bd78/evidence/minimax-junction-pilot/review-three.jpg) 和 [完整复核](https://github.com/Freeloop993/paper/blob/36e2029d24de4248acf13208c75d7b0c4e32bd78/evidence/minimax-junction-pilot/README.md)。正式分母新增 0；保留作者选稿、真人与独立读数环节。GPU 未启用。


---

## PR #68：C01: 第 3 章方法冻结单 v1——开 GPU 前签署 (#1 #3 #21 #22)
原址：https://github.com/Freeloop993/paper/pull/68　建立：2026-11-13T14:15:37Z　状态：MERGED　关闭：2026-11-13T16:31:34Z　合并：2026-11-13T16:31:34Z　分支：`claude/method-freeze-v1` → `main`，末提交 `638db88bc08b`　评论数：0

### 正文
*Freeloop993 · 2026-11-13T14:15:37Z*

Claude：作者 11/14 指出，开 GPU 前应先把前面章节的方法定下来，否则会推倒重来。本 PR 新增 `docs/protocols/method-freeze-v1.md`：

- 第 2 节逐节列出实验依赖的方法项（3.1—3.6、4.1.3）、版本、状态；
- 第 3 节是待作者签署的规格字段、词对与参数的对应、修订的定义；
- 第 4 节是开机顺序：H3 第二轮 → 写入通过的字典与读法 → 作者签署 → 开机跑 E2 和 Qwen 小测。

冻结后的改动记新版本，已跑批次保留原版本。新增出图 0。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #69：C01: 路线图、字典 v1.3、E6 植保规格卡草案、3.4 节初稿 (#1 #22 #25)
原址：https://github.com/Freeloop993/paper/pull/69　建立：2026-11-13T16:21:12Z　状态：MERGED　关闭：2026-11-13T16:31:38Z　合并：2026-11-13T16:31:38Z　分支：`claude/roadmap-ch34` → `main`，末提交 `6d36c27b8774`　评论数：1

### 正文
*Freeloop993 · 2026-11-13T16:21:12Z*

Claude：两份交付，新增出图 0。

- `docs/roadmap-20261114.md`：Codex 与作者共用的路线图。主线按依赖排：H3 第三轮 → 写入冻结单 → 作者签署 → 开机（E2＋Qwen 小测）→ 选后端 → 正式 5.2.1 → E3 → 4.4。每步写输入、验收、决定人。另含正式 5.2.1 与 E3 的具体需求、E4/E5/E6 可并行的准备、E6 植保六旋规格卡草案、回执约定。作者 11/14 允许 C 方向使用臂材质档位，记为字典 v1.3（只用于设计方向，不进 5.2.1）。
- `manuscript/revisions/ch03-3.4-v2.md`：3.4 节初稿，取代旧稿的 3.4 部分；尚待实验结果的地方标〔待〕。

请作者确认第 5 节的六旋规格卡；请 Codex 按第 1 节第 1 步继续。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### 评论 1
*Freeloop993 · 2026-11-13T16:27:43Z · [原链接](https://github.com/Freeloop993/paper/pull/69#issuecomment-6858778548)*

Codex 已核对 3.4 v2 的真人复算缺口。12 图包括 E0 条件图 4、E1 条件图 6、E1 纯文字 2，只有一份真人点选。人与两位 AI 均值的绝对差中位数 W/L 为 0.0041、d/D 为 0.0125，两倍校准误差分别为 0.0082、0.0251。E1 条件图相邻档均值差均超过相应界限。[实际点选与计算](https://github.com/Freeloop993/paper/blob/0e5d553/evidence/e1-open-20261112/point-return.md)。

路线图第 2 节“每条件抽 2，共 12”对应六个 S 条件；若加独立的 K 两档，八个条件各抽 2 则为 16。请在正式冻结前明确真人是否仅抽 S 条件，或如何复用基准，不双计。第三轮八张已按登记收回，盲读后在 #1 回报。


---

## PR #70：C01: 冻结单第 2 节按实测填写，第 3 节待作者签署 (#1 #3)
原址：https://github.com/Freeloop993/paper/pull/70　建立：2026-11-14T02:54:51Z　状态：MERGED　关闭：2026-11-14T02:57:10Z　合并：2026-11-14T02:57:10Z　分支：`claude/freeze-v1-sec2` → `main`，末提交 `d3290ebbaccb`　评论数：0

### 正文
*Freeloop993 · 2026-11-14T02:54:51Z*

Claude：按 H3 第二、三轮的实测改写方法冻结单第 2 节（条件图 v1、字典 v1.2/v1.3、读法 v2.2），第 3 节的词对对应同步更新：“紧凑—舒展”没有可控参数，只在第 4 章组合与 E5 评议中讨论。作者签署第 3 节后即可开机。新增出图 0。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #71：C01: 3.2—3.3 节初稿，3.4 按第三轮更新 (#1)
原址：https://github.com/Freeloop993/paper/pull/71　建立：2026-11-14T02:57:06Z　状态：OPEN　分支：`claude/ch03-3.2-3.3` → `main`，末提交 `fd0aa425c9a1`　评论数：0

### 正文
*Freeloop993 · 2026-11-14T02:57:06Z*

Claude：新增 `manuscript/revisions/ch03-3.2-3.3-v2.md`（3.2 需求资料与产品样本分析、3.3 设计意图转译与造型规格构建），并按 H3 第三轮结果更新 3.4 初稿中轴距与“紧凑—舒展”的写法。待回填处标〔待〕（第二编码结果、真实产品样本数），引文页码标〔引文待核〕。新增出图 0。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #72：C01: 论文 Word 工作稿——按南航撰写要求排版，含目录与全文现稿 (#1)
原址：https://github.com/Freeloop993/paper/pull/72　建立：2026-11-14T14:07:12Z　状态：OPEN　分支：`claude/thesis-docx` → `main`，末提交 `677f8bf0a915`　评论数：0

### 正文
*Freeloop993 · 2026-11-14T14:07:12Z*

作者要求论文以 Word 形式放在 GitHub 上持续维护，并按学校格式与目录排版。本 PR 新建 `manuscript/thesis/`。

**打开：** [`manuscript/thesis/thesis-draft.docx`](https://github.com/Freeloop993/paper/blob/677f8bf0a9159b09c2efbf26e0e452dbe5f4b4ea/manuscript/thesis/thesis-draft.docx)（Word 打开时选“更新域”即得目录页码）。

## 版式依据

南航《研究生学位论文撰写要求》（2015 年 4 月修订），逐项设置见 [FORMAT.md](https://github.com/Freeloop993/paper/blob/677f8bf0a9159b09c2efbf26e0e452dbe5f4b4ea/manuscript/thesis/FORMAT.md)：

- 结构：封面、英文封面、承诺书、摘要、ABSTRACT、目录、图表清单、注释表、正文、参考文献、致谢、在学期间成果、附录
- 章标题“第一章”黑体小三，1.1 黑体四号，1.1.1 黑体小四；正文宋体五号，固定行距 20 磅
- A4，页边距上下 3.3、左 3.0、右 2.8 cm；奇数页篇眉“南京航空航天大学硕士学位论文”，偶数页为题目
- 前置部分罗马页码，正文起阿拉伯页码；图号“图1.1”在图下，表号“表1.1”在表上，三线表
- 顺序编码制上标引用，文献按 GB/T 7714

与作者修订目录的唯一差别：“第1章”按撰写要求改排为“第一章”。章节题名与层级不变。

## 正文现状

约 2.3 万汉字，59 处黄色〔待〕标记（逐章计数见 `build-report.md`）。

| 已写 | 待实验结果 |
|---|---|
| 1.1—1.6；2.1—2.7；3.1—3.7；4.1；5.1；5.2.1 布局部分（E1）；5.2.3；5.5.1；6.3 | 4.2—4.5（E3）；5.2.1 造型部分与 5.2.2（造型响应批、E2）；5.3（E5）；5.4（E3、E4）；5.5.2—5.5.3（E6）；5.6、5.7、6.1、6.2、6.4 |

正文按现行口径改写：Qwen 为正式后端，MiniMax 只作条件选择的开发彩排；只用正交顶视；不训练 LoRA；“紧凑—舒展”无可控参数；E0/E1 点选图不入正文。PR #71 的 3.2—3.4 已并入本稿第三章。

## 未完成与限制

- 参考文献 27 条，19 条待核（缺页码、作者全名等），Word 中标黄。
- 本机没有 LibreOffice，未能把 docx 渲染成 PDF 逐页检查分页、页眉与目录；只做了 XML 结构检查和封面渲染。
- 四篇同专业学位论文的原 PDF 不在仓库与本机，尚未与其逐页比对版式。
- 封面信息（论文编号、分类号、学院、导师职称、日期）待作者填写。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #73：C01: E3 四旋设计初稿 9/9——A/B/C 各 3 张，按方向比较图 (#1 #3)
原址：https://github.com/Freeloop993/paper/pull/73　建立：2026-11-14T15:43:10Z　状态：OPEN　分支：`claude/e3-quad-qwen` → `main`，末提交 `e96d41946ea8`　评论数：0

### 正文
*Freeloop993 · 2026-11-14T15:43:10Z*

作者 11/15 授权（[#3](https://github.com/Freeloop993/paper/issues/3#issuecomment-6879284903)）：用工作簿 A/B/C 规格各跑 3 张，固定 250 mm 红点蓝线图与双叶要求；B 与 A 同档位照跑；C 外露碳纹；前伸相机句改用 11/14 机鼻前缘写法（字典 v1.4，仅 E3）。

- [出图前登记与 9 份请求](https://github.com/Freeloop993/paper/tree/e96d41946ea84237da506bb76c2f713a3f3b9275/experiments/e3-quad-qwen)（种子 2026112101—09）
- [实收原件与比较图](https://github.com/Freeloop993/paper/tree/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115)：9/9，无重跑；请求逐字节一致；采样无缓存命中；三份权重 SHA-256 与登记一致

Claude 知条件观察（不计入分母）：C 三张云台在机头越出，但镜片朝上可见；A2、B2 有横向盖缝；B3 最接近“连续曲肩”。下一步由作者逐张写取舍、选父图。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #74：以 E2 真人盲判稿为准合并论文源码与可重建 Word
原址：https://github.com/Freeloop993/paper/pull/74　建立：2026-11-15T07:09:36Z　状态：OPEN　分支：`codex/thesis-source-e2r-20261115` → `claude/thesis-docx`，末提交 `5f92248dd353`　评论数：0

### 正文
*Freeloop993 · 2026-11-15T07:09:36Z*

按作者修订稿回写两种语言摘要、各章、表 1.2／5.3／5.5、附录 E 和参考文献。第 5.2.2 节保留 1 位独立真人对 6 张图的意见，仅两对满足直接同种子输入比较。第 5.3 节保留独立评议缺口。开发样图与正式结果分开。附同机已登记开发批的去重和原件回收入口。


---

## PR #75：配置器重做为“洞察 → 造型 → 交付”工作台：可拖动画布、布局空间、设计提示、参考机型与并行方案（软件验收）
原址：https://github.com/Freeloop993/paper/pull/75　建立：2026-11-17T12:18:00Z　状态：OPEN　分支：`claude/configurator-ui-20261117` → `claude/direction-todo-20261117`，末提交 `d6dfb211343b`　评论数：0

### 正文
*lucienzhu · 2026-11-17T12:18:00Z*

作者的配置器 `prototypes/drone-configurator` 的界面重做。本 PR 现在包含三轮提交，**请以第三轮（11 月 18 日，`d6dfb21`）为准**。

**为什么有第三轮。** 第一轮照着一份过细的验收单把核对信息全摊在页面上，第二轮退回成一张简洁的表单，作者都不满意，要求放下此前所有具体要求，只守一条：贴合研究方向和目标，做一个精致、有辨识度、好用的系统界面。第三轮把配置器重做成三段式的造型工作台——**洞察 → 造型 → 交付**。底下沿用此前核对过的几何、提示词和导出。

**这仍然是软件验收。** 走查由脚本驱动无界面 Chrome 以真实点击、拖动和下载完成，没有真人设计者参与；模型服务未接入，新增生成 0，新增评议 0。

**两点先说明。** ① 作者要求到评论数据库里实际检索短引文：私有阅读库对本机登录的账号不可见，本机也没有评论文件，所以短引文仍是公开的 36 条；洞察页改用语料的主题分布作主要依据，并提供了并入新短引文的脚本，待作者开通权限或提供文件后再筛选。② 本账号对 `Freeloop993/paper` 只有读权限，分支在 fork `lucienzhu/paper` 上。

## 先看这些

- [离线包](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/configurator-offline.zip?raw=true)：解压后打开 `index.html`
- [界面设计说明](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/interface-design.md)：整体框架、每一块对应论文哪一步、用到的无人机设计常识
- [第三轮交接报告](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/README.md)：复现步骤、实测结果、未验证项、需要作者确认和提供的
- [同一次走查的导出件](https://github.com/lucienzhu/paper/tree/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/exports) · [逐步核对](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/crosscheck.md)（150 项相符）
- [论文正文与实际进度的对照](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/thesis-alignment.md)

## 三个环节

**1 洞察**：语料的三层数字、228 条外形评论的主题分布、短引文墙；右侧是设计简报，四组词对用语义量表选择。

![洞察](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/desktop-02-insight-brief.png?raw=true)

**2 造型**：画布居中，可直接拖电机轴心、机身边缘和桨盘边缘；左侧五个部件页签；右侧布局空间图、设计提示、参考机型；下方方案条。图为方案 B（宽 X）叠上方案 A（真 X）对比。

![造型](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/desktop-04-studio-wide-x-vs-variant-a.png?raw=true)

套用 Mini 3 Pro 的比例并指定造型之后（提示指出相邻桨盘重叠、真实折叠机靠前后桨错层）：

![参考机型](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/desktop-12-studio-reference-aircraft.png?raw=true)

侧视：俯视看不到的相机、机身高度和起落架。

![侧视](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/desktop-10-studio-side-view.png?raw=true)

**3 交付**：条件图、提示词（刚改动的句子标黄）、造型规格卡、导出三件。

![交付](https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/desktop-07-handoff-arm-20.png?raw=true)

窄屏 390×844（手机模拟）：

<img src="https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/narrow-01-insight.png?raw=true" width="270"> <img src="https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/narrow-02-studio.png?raw=true" width="270"> <img src="https://github.com/lucienzhu/paper/blob/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots/narrow-03-handoff.png?raw=true" width="270">

其余截图在 [screenshots/](https://github.com/lucienzhu/paper/tree/d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2/prototypes/drone-configurator/review/20261118-round3/screenshots)。

## 实测

| 核对内容 | 结果 |
| --- | --- |
| 真 X 与宽 X | W/L 1.00 与 1.30；提示词只有布局句改写；导出坐标与已登记研究条件图相差不超过 0.23 px |
| Deadcat | 四个轴心，画布、交付页条件图、规格 JSON、提示词和 PNG 红点一致 |
| 臂宽 10 → 20 mm | 画布线宽、提示词第 7 句（标黄）、JSON 同步变化，其余不变 |
| 画布拖动 | 真实鼠标拖右前轴心：W/L 1.30 → 1.39；拖机身宽度手柄：机身宽 ÷ 轴距 0.28 → 0.19 |
| 套用真实机型 | Mini 3 Pro：W/L 1.52、轴距 247 mm、桨径 6.0 英寸 |
| 设计提示 | 真 X 提示前桨进入相机视野约 16°，宽 X 约 4°，Deadcat 在视野之外 |
| 未选的护圈、颜色、碳纹 | 十份导出里凡未选的都没有出现 |
| 评论依据 | 搜索、收藏、取消、再收藏均不改参数；搜不到时自写意图，导出记为“设计者自定” |
| 真实下载与离线包 | 每步浏览器实际写出三个文件，共 30 个；离线包以 `file://` 打开无报错、无非本地请求 |

自动复核：`npm run verify` 33 项通过；`npm run replay` 10 份规格逐项相同；`crosscheck.py` 150 项相符；`npm run check-offline` 通过。

## 还没有验证的

真人使用（拖动的手感、三个环节是否顺手）；模型对这些参数是否响应；设计提示是俯视下的二维近似，82° 视角是示意值；只在 macOS Chrome 158 无界面模式下跑过，手机是设备模拟，触屏拖动没有在真机上试；画布拖动没有键盘替代操作。

## 需要作者确认或提供的

评论库的访问权限或文件；三个环节的框架与默认从洞察开始；短引文上“可支持哪组词对”的标注是按论文表3.4 的转译；相机视角示意值 82°；轴距取两条对角距的平均值；宽 X、伸展 X 的缺省 W/L 取 1.30 与 0.70；提示词是本配置器自己的一套英文句子，不是 E3 用过的字典；不再使用用户画像；起落架缺省沿用原值。

## Codex 复核

```sh
git fetch origin pull/75/head:claude/configurator-ui-20261117
cd prototypes/drone-configurator && npm ci
npm run package-offline && npm run walkthrough
(cd review/20261118-round3 && python3 crosscheck.py)
npm run verify && npm run replay && npm run check-offline
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #77：按导师反馈统一研究框架、设计系统规格和实验验收
原址：https://github.com/Freeloop993/paper/pull/77　建立：2026-11-18T04:42:44Z　状态：OPEN　分支：`codex/advisor-study-system-20261118` → `claude/direction-todo-20261117`，末提交 `a98b3ecdce03`　草稿　评论数：0

### 正文
*Freeloop993 · 2026-11-18T04:42:44Z*

承接 #76 和老师 11 月 18 日反馈。整合基线为 `9afe690`，源界面为 #75 的 `d6dfb21`。本 PR 为研究与实验调整草案，供内部实施使用。

## 研究框架与任务

第四章采用《四旋翼无人机的人智协同设计》，第五章采用《关键设计指标验证与跨构型无人机设计应用》。[研究框架、工单和验收表](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/README.md) 将四个研究问题分别落实为系统动作、设计任务、评价指标和允许得出的结论。跨构型研究保留农业六旋应用，新增批次使用中性简报、四旋参照及预先规定的不可判项。[跨构型实验草案](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/cross-layout-protocol.md)

## 研究依据

- 现稿 47 条参考文献逐条筛查。两轮共 34 张原页证据卡，其中 29 项支持具体方法，4 项提供背景，1 项为国内造型作品。首轮 59 个候选组另作二筛，归并为 45 项，其中 3 项只有摘要。[文献二筛及台账](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/literature/followup.md)
- 消费航拍语义数据复算至 228 个造型表述簇，36 张展示卡追溯至 35 个来源。系统需区分折叠收纳与展开外观，允许设计者采纳、驳回或自定，独立检验 RAG 的增益。五类拓扑收录 12 项一手资料，已核 10 份 PDF。[数据、资料及实际输入](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/evidence.md)
- 四旋 B2 和六旋历史样本已核对冻结请求、实际执行、模型回执及输出。四旋可追溯作者选案和深化。现版切到底层六轴布局后，提示词首句仍要求四旋。[Claude 系统优化规格与复现步骤](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/system.md)
- 研究侧[预试记录工具](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/pilot-bridge/README.md)支持 PR #75 原始导出、真实多候选回执、修订回退和分段计时，27 项离线控制通过。设计者提交机会、实际派发调用、回图和首次呈现分别记录。已在历史四旋和六旋原图核实盲判导出保留 RGBA 像素并移除模型提示词。

- 已交付[可接入前端的语义资料查询](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/semantic/lookup/README.md)。17 个话题覆盖已有 36 张卡、35 个匿名来源。在实际 PR #75 数据上，字段检索可返回同源限制、要求澄清或明确指出缺少依据。原 40 条第二编码评价评论的语义方向；独立的新任务检索评价仍待完成。

后继界面先用正常入口回放四旋，验证六旋任务、图、规格、提示词与实际提交一致。作者再做结构化与自由提示各一场真实预试。之后进入正式配对、独立评议与设计成果归档，再写全文。本轮新增模型生成、作者真实预试及真人评议均为 0。


---

## PR #78：多旋翼造型工作台：跨构型设计简报、条件图与候选取舍记录
原址：https://github.com/Freeloop993/paper/pull/78　建立：2026-11-18T07:37:38Z　状态：OPEN　分支：`codex/multirotor-studio-20261118` → `claude/direction-todo-20261117`，末提交 `f308b7e5630f`　草稿　评论数：0

### 正文
*Freeloop993 · 2026-11-18T07:37:38Z*

承接 #75 的三步界面与 #77 的研究框架。第四章的四旋主任务与第五章的跨构型应用可使用同一工作台。完整离线包在 `prototypes/drone-configurator/configurator-offline.zip`，解压后打开 `index.html`。

- 简报独立选择使用任务与构型。设计者的原话按话题、部位和使用状态检索 36 张脱敏短引。可澄清、确认、驳回、撤销，或保留自定意图。研究资料显示来源和使用限制。
- 造型支持三旋、四旋、平面六旋与八旋、共轴 Y6 与 X8。画布、提示词和规格从同一份方案生成，共轴构型另附标明层数的侧视图。
- 交付支持结构化和自由提示两种方式，可下载本轮请求和输入图，或由设计者向自己的兼容服务提交。候选、父图、采纳或驳回理由在本地保存，可导出原件。既有四旋 B2、农业六旋案例可单独回放。

**验收**

1. TypeScript 与生产构建通过。56 项几何、提示词和导出检查通过。10 份旧四旋设计的回放逐项一致。
2. Chrome 从新解压离线包完成农业六旋任务，实下 JSON、TXT、PNG，核对了轴数、提示词和条件图摘要。浏览该流程未产生外部请求。
3. 浏览器核对候选记录、原件、父图以及刷新后的决定。使用本机模拟服务核对两种提交方式、成功回图和失败记录。本轮没有新增真实模型生成或被试数据。


---

## PR #79：工作台改成一块画布：每一步都是画布上的卡片，在卡片上直接做（软件走查）
原址：https://github.com/Freeloop993/paper/pull/79　建立：2026-11-18T13:32:50Z　状态：MERGED　关闭：2026-11-19T10:16:16Z　合并：2026-11-19T10:16:16Z　分支：`claude/canvas-workflow-ux-134e36` → `main`，末提交 `0dbe1d828c59`　评论数：0

### 正文
*lucienzhu · 2026-11-18T13:32:50Z*

作者看过 3.3 版后指出四点：画布不能加步骤、只在别的页面做完之后展示流程；步骤被拆散；应当先弄清画布式工作流里步骤是怎样放在画布上的；设计被排成固定顺序，显得僵硬，理想布局是画布加右侧随步骤变化的组件面板或对话。这个 PR 按这四点重做了工作台的交互。

## 改了什么

- **只有一块画布。** 取消目标、参数、候选图三个页面。目标、用户依据、造型、参考图、生成、候选图、取舍、便签都是画布上的卡片。
- **在卡片上直接做。** 目标直接在卡片上写，回车保存；造型卡片里就是可拖动的顶视图；生成先作为待提交的虚线卡片出现，点卡片上的「生成」才提交。
- **在画布上加步骤。** 选中一张卡片，它上方出现接下来能做的事（生成效果图、另开方向、存为版本、保留、以此图继续、以此图生成），新卡片自动接在右边并连线。也可以用底部工具条、双击空白处、把图片拖进画布，或从卡片右侧拖一条线。
- **右侧面板随所选步骤变化。** 目标→按话题和使用状态查用户原话；造型→五个部件页签；生成→将要提交的条件图、文字和参考图；候选图→保留、继续、对照；未选中→进度和下一步。另一个页签是设计对话。
- **数据上画布。** 证据卡可以放到画布上连着目标；参考图可以作为一轮生成的输入；几个方向并排，点哪个编辑哪个。
- **研究留档不打扰主线。** 冻结规格和条件图默认收起，「显示留档」在同一块画布上展开；逐句提示词来源、规格卡、导出和全部回执在「研究详情与导出」。
- 旧地址 `#step=insight`、`#step=studio&tab=…`、`#step=handoff` 仍可用，落在同一块画布上。

## 依据

[画布式工作流拆解](https://github.com/Freeloop993/paper/blob/0dbe1d828c59ca4dbff993f857e53f5564b24ea0/planning/workbench-handoff/literature/%E7%94%BB%E5%B8%83%E5%BC%8F%E5%B7%A5%E4%BD%9C%E6%B5%81%E6%8B%86%E8%A7%A3.md)读了仓库里三篇把同一后端接到不同界面上比较的研究（Workflow-Net、DesignTrace、InspirationGraph），带页码：步骤是画布上的对象，选中后直接操作、自动连线；节点里可以直接干活；参数放在随所选节点变化的侧栏。手工接线的节点图负担最重，只靠对话到细化阶段失控。同一份文档也写明了这些研究只有九人、任务不是无人机，不能预设效果。[界面设计说明](https://github.com/Freeloop993/paper/blob/0dbe1d828c59ca4dbff993f857e53f5564b24ea0/prototypes/drone-configurator/interface-design.md)逐项说明了对应做法。

## 怎样试

```shell
cd prototypes/drone-configurator
npm ci && npm run build
npm run studio:chat -- --port 4178      # 真实服务；只走查界面可改用 npm run studio:fixture -- --port 4178
```

打开 http://127.0.0.1:4178/ 。或下载分支里的 `configurator-offline.zip` 解压后打开 `index.html`（离线可用目标、依据、造型、便签、版本和案例）。

## 核了什么

全部是软件检查，[记录与截图](https://github.com/Freeloop993/paper/blob/0dbe1d828c59ca4dbff993f857e53f5564b24ea0/prototypes/drone-configurator/review/20261119-round4/README.md)：

- `npm run walkthrough:canvas`：在隔离浏览器里把画布上的每一步做一遍，图像作业由软件夹具应答。连续 8 次通过。
- `check-offline`、`verify` 56 项、`replay` 10 份、本机服务测试 8 项通过。
- 原有五个浏览器检查脚本改为从画布进入，断言未放宽，均通过。

顺带修了三个问题：节点连续更新时连线可能整体消失；页面已打开时带 `#step=` 的链接不跳转；macOS 上离线包没有真正重新打包。

## 没有核的

- 没有调用图像或文本模型。参考图作为生成输入是新加的输入方式，没有对真实 MiniMax H3 Image 测过。
- 没有作者试用，没有外部设计者参与。界面是否更直觉、更省时，要由作者预试回答。
- Windows、Safari、Firefox 未跑。

## 需要作者决定

- 参考图作为生成输入时，提交文字里新增了一句说明（见 `src/design/generation.ts`）。如果配对试验要求输入方式固定，请确认是否保留这种输入。
- PR #75、#78 针对的是此前的界面，这个 PR 以当前 `main` 为基础。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #80：研究全景：问题、主张、论证链、六章对应与缺口（一页，供复盘）
原址：https://github.com/Freeloop993/paper/pull/80　建立：2026-11-18T14:00:53Z　状态：CLOSED　关闭：2026-11-19T10:24:46Z　分支：`claude/research-panorama-20261119` → `main`，末提交 `d73b01264f32`　评论数：0

### 正文
*lucienzhu · 2026-11-18T14:00:53Z*

作者要一张能看清整体研究思路的全景图，用来逐步想问题和复盘，并检查缺口。这个 PR 只加一个目录 `planning/research-panorama/`，不改任何已有文件。

## 内容

- `README.md`：GitHub 上可直接看的一页。九个部分依次是在解决什么（三处断开）、要证明的一句话、一条论证链（按证据现状着色）、四个研究问题怎么判和现在到哪、实际在做什么、六章各管链上的哪一段、能说什么不能说什么、缺口（按影响排序）、下一步的顺序。
- `board.json` 与 `build_board.py`：同一内容的白板版元素。白板本身是一条私有链接。
- 末尾列出 5 篇网上检索到、文献导航里没有的 CHI 论文线索，只看过摘要，引用前要回到原文。

## 口径

数字全部取自 `STATUS.md`、`planning/2026-11-18-framework.md`、`planning/advisor-20261118/README.md` 和 `planning/research-library/method.md`，截至 11 月 18 日。本页没有新增实验数据，也没有替作者作任何研究决定。

## 缺口里需要作者看的三条

1. 第 4、5 章已按导师反馈改题，`manuscript/outline.md` 的小节仍是旧标题下的，需要先定新标题下的小节。
2. 工作台刚改成一块画布（#79），预试前要冻结版本和输入方式并重新验收。
3. 11 月 7 日计划里“11 月 22 日结束新增主数据采集”的日期，按目前真人场次为 0 的状态需要重排。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #81：文献库与研究推进：目录 131 项（44 项有原页证据）、文献关系图、2.6 比较表初稿、第 4–5 章小节、总体研究蓝图
原址：https://github.com/Freeloop993/paper/pull/81　建立：2026-11-19T07:13:11Z　状态：MERGED　关闭：2026-11-19T10:13:22Z　合并：2026-11-19T10:13:22Z　分支：`claude/literature-map-20261119` → `main`，末提交 `4b3500ec39ef`　评论数：0

### 正文
*lucienzhu · 2026-11-19T07:13:11Z*

## 做了什么

作者 11 月 19 日上传了 226 份文献 PDF（`d283025`）。这个 PR 逐份核对后把它们整理成一个文献库，并据此更新研究进度和总体研究蓝图。协作回执对应 #76。

| 内容 | 位置 |
| --- | --- |
| 文献库入口：目录、规则、其他文献位置的分工 | `literature/README.md` |
| 上传文献检查：完整性、重复、非文献、许可、与稿子参考文献的对照 | `literature/check-20261119.md` |
| 文献目录 131 项（核心 37，支撑 94） | `literature/catalog.csv` |
| 文献关系图：九个主题簇、231 条库内互引、每一环的依据文献、缺的原件 | `literature/map.md`、`literature/citations.csv` |
| 保留的 117 份原件，按簇分文件夹，文件名以目录编号开头 | `literature/fulltexts/` |
| 未保留的 109 份：原路径、原因、SHA-256 | `literature/not-kept.csv` |
| 研究进度与实际情况：按论证链逐环列文献依据、现状、下一步 | `planning/research-panorama/progress-20261119.md` |
| 总体研究蓝图（PDF、JPG），右栏新增文献依据 | `planning/research-panorama/research-blueprint.pdf`、`.jpg` |

## 检查结果

- 226 份全部能打开，没有加密或损坏；147 份英文原文，79 份中文。
- 12 份重复，6 份不是文献，3 份没有文字层。
- 《六旋翼无人机造型设计》（L002）和《面向用户感性意象的纵列双旋翼无人机造型研究与设计》（L003）是期刊的单页作品展示，原件完整，只能当设计先例用。（第一次提交把它们写成“需要补全文”，第二次提交已更正。）
- 91 份与本文论证链无关（人因与可用性、对话代理、气动与飞行、文化遗产等），没有保留。文件仍在 `d283025`，可随时取回。

## 公开仓库里的版权 PDF

本仓库是公开的，`AGENTS.md` 禁止提交无再分发许可的 PDF。保留的 117 份里，文内有开放许可声明的 25 份，arXiv 预印本 1 份，**其余 91 份没有见到开放许可声明**。这个 PR 没有改变任何文件的公开状态（它们已经在 `main` 的历史里），只是移动了位置。作者 11 月 19 日答复：按仓库只有本人可见处理，不作调整。同日用 GitHub 接口核对，仓库的可见性是公开。两点都记在 `literature/check-20261119.md` 第五节，文件保持现状。

## 没有做的

- 目录 131 项里 44 项有原页证据，其余 87 项只做了开卷识别和摘要级阅读。目录里分开标注。
- 互引是按题名机器匹配的，中文文献之间的互引可能被低估。
- 没有动 `evidence/`、`experiments/`；没有关闭 PR 或删除分支（11 月 18 日整理清单里已定的项仍待执行）。
- 没有新增实验数据、模型调用或真人场次。

## 第二次提交（94b307c）

- 11 月 18 日已有的 34 张原页方法卡（`planning/advisor-20261118/literature`）按 SHA-256 和 DOI 与文献库比对，18 张对应 L 编号，汇入 `literature/page-evidence.csv`；另补核 7 篇。
- `manuscript/revisions/ch02-2.6-comparison.md`：2.6 节的比较表和定位段初稿，只用核过原页的内容；6 篇最接近的工作仍缺原页，单列在表后。
- `manuscript/outline.md`：第 4、5 章按导师反馈后的题名对齐小节（草案），5.4 节留给什么待作者定。
- 更正：“紧凑 ↔ 比例”的检验早已登记为 S5，不是新建议；进度页和蓝图相应改过。

## 第三次提交：紧凑感评议包

`experiments/s5-compactness-pilot`：可以直接发给评议者的单文件离线页面（E1 条件图组 24 张图，12 张单图评分加 19 组成对比较）、方案、核对键、汇总脚本和软件走查。走查 27 项通过，用的是合成答卷；真人答卷 0 份。读法待作者确认后冻结。

## 第五次提交：评议包换图（1.1 版）

作者审图后指出 E1 条件图组不适合做评议（平涂剪影、相机朝上）。1.0 版在发出前撤回。1.1 版的图由 MiniMax H3 生成基准图（8 次调用，回执在 `experiments/s5-compactness-pilot/h3/actual`），各档由基准图做几何编辑派生；标准、核对和限度见 `stimulus-review.md`。读法文字未改。走查 28 项通过，真人答卷 0 份。

## 第八次提交：旧图清理与写作取数清单

作者确认旧评议图可以移除。E1 的 36 张原图、ZIP 和配对图已删除（请求、回执、读数保留，说明页标注退役）。新增 `evidence/usable-for-writing.md`：哪些批次可以进正文、哪些只能以数字出现、哪些不进论文，以及还要不要开 GPU。STATUS、研究全景和蓝图同步更正。

## 与其他 PR 的关系

- 包含并取代 #80（研究全景）：全景的三个文件已在本分支，并加了文献一栏。合并本 PR 后 #80 可以关闭。
- 与 #79（工作台）互不影响。

## 核对

- `python3 planning/workbench-handoff/verify_checkout.py`：60 个文件通过。
- 目录 131 行的“文件”路径全部存在；新写和改过的页面里的相对链接逐条核对。
- 蓝图由 `board.json` 生成，导出脚本检查过文字没有溢出方框。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #82：紧凑感评议包 3.0：11 款真实 DJI 产品的顶视评议
原址：https://github.com/Freeloop993/paper/pull/82　建立：2026-11-19T10:34:02Z　状态：MERGED　关闭：2026-11-19T10:55:29Z　合并：2026-11-19T10:55:29Z　分支：`claude/rating-pack-v2-20261119` → `main`，末提交 `3c320a9c4796`　评论数：0

### 正文
*lucienzhu · 2026-11-19T10:34:02Z*

## 做了什么

作者合并 #79、#81 后先后给了两条反馈：评议页里的图看起来完全一样；感知评议应当像文献那样用真实产品样本，不该用模型生成的图顶替。这个 PR 最终的版本是 3.0。

- **样本：** 11 款真实的 DJI 四旋翼（Mini 2 系列、Mini 3、Mini 4 Pro、Air 2S、Air 3、Air 3S、Mavic 3 Pro、Mavic 3 Classic、Avata 2、FPV、Inspire 3）。
- **来源：** DJI 官方商城产品页的 3D 展示模型，用内置浏览器读取页面数据得到；按模型内部名称核对机型。
- **图：** 同一机位从正上方渲染（视场 8 度，接近正投影），白底、去色、统一占幅、机头朝上。
- **页面：** 一次一张，按“紧凑—舒展”等三组词评分；评分时图固定在量表旁。不再有成对比较，那是下一步。

## 版权

模型文件、渲染图和评议页面不入库，只在本机生成。仓库里只有脚本和 `real/samples.json`（地址、文件摘要、渲染参数）。

## 核对

- `node qa/walkthrough.mjs`：27 项通过，含桌面和手机宽度下图是否留在屏内。
- 没有真人答卷。只有我看过这些图。

## 限度

样本全是 DJI，且只有商城提供 3D 模型的机型；Neo、Flip 等带护圈的小机型不在里面。图是官方模型的渲染，不是实物照片。

## 过程中被取代的版本

2.0 版（12 个 Qwen 设计候选加成对比较）也在这个分支的历史里，材料留在 `qwen/`，等这一步出结果后用于下一步的对照。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #83：紧凑感评议包 4.0：32 款真实产品，18 个品牌、十种类型，靠图片检索取得
原址：https://github.com/Freeloop993/paper/pull/83　建立：2026-11-19T11:29:38Z　状态：MERGED　关闭：2026-11-19T11:30:52Z　合并：2026-11-19T11:30:52Z　分支：`claude/real-drone-images-20261119` → `main`，末提交 `a19250ad67c6`　评论数：0

### 正文
*lucienzhu · 2026-11-19T11:29:38Z*

## 做了什么

作者合并 #82 后指出：样本全是 DJI 一个类型，应当覆盖尽量多的品类；关键是去搜图，不必非要模型文件；要保证多样和真实。另外合并后在仓库里找不到评议页面，因为上一版把页面和图排除在仓库之外。

- **样本：** 32 款真实四旋翼，18 个品牌（DJI、Autel、Parrot、Skydio、Hubsan、FIMI、Yuneec、3DR、GoPro、Insta360、HOVERAir、Ryze、ZeroTech、PowerVision、iFlight、GEPRC、Sony、Freefly），十种类型（折叠航拍、全包护圈、小型固定臂、经典固定臂、穿越机、涵道穿越机、行业机、专业影视机等）。
- **取得方式：** 两轮图片检索，54 个检索词、648 张候选，逐张筛选；下载原图 88 张后再看大图筛。检索词、全部候选、每张入选图的来源页和摘要在 `real/web/` 和 `real/samples.json`。
- **排除：** AI 生成的假图、第三方 3D 模型站的图、桨为虚影或整机被裁切的图、原图太小的图。
- **两款例外：** DJI Avata 2 和 DJI FPV 检索不到够清楚的顶视图，用 DJI 官方 3D 模型渲染。
- **处理：** 白底、去色、机头朝上、统一占幅。

这次评议页面（`participant/无人机外观评议.html`）、处理好的图和总览图都在仓库里。

## 核对

- `node qa/walkthrough.mjs`：27 项通过。
- 没有真人答卷。筛图只有我一个人做，没有第二个人复核。

## 限度

图来自不同来源，光照和清晰度不完全一致；Skydio 2 的原图略带透视；DJI Spark 的原图偏小。详见 `protocol.md` 第五节。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #84：紧凑感评议包 5.0：补上六旋翼、八旋翼和共轴，共 44 款真实多旋翼产品
原址：https://github.com/Freeloop993/paper/pull/84　建立：2026-11-19T12:20:00Z　状态：MERGED　关闭：2026-11-19T12:22:50Z　合并：2026-11-19T12:22:50Z　分支：`claude/rating-pack-v5-multirotor-20261119` → `main`，末提交 `ad95f5a10a39`　评论数：0

### 正文
*lucienzhu · 2026-11-19T12:20:00Z*

## 这一版改了什么

#83 合并时是 4.0 版（32 款，全是四旋翼）。作者随后指出研究对象是多旋翼，这一版把四旋翼以外的补上。

- 又做两轮图片检索（36 个检索词、432 张候选），下载原图 42 张，看大图筛出 12 款：
  - 六旋翼 8 款：DJI Matrice 600 Pro、DJI S900、Yuneec H520、Yuneec Tornado H920、DJI Agras T30、Hylio AG-216、Inspired Flight IF1200、Aurelia X6
  - 八旋翼 3 款：DJI Agras MG-1、Freefly Alta 8、Skyfront Perimeter 8
  - 共轴 1 款：DJI Agras T50
- 全套 44 款、22 个品牌，混在一起随机呈现；`summarize.py` 增加按构型、按类型的汇总表
- 评议页重新生成（`participant/无人机外观评议.html`，2.3 MB，版本 S5-pilot-5.0），预计 15 到 20 分钟
- 方案、说明、冻结摘要、取数清单、研究进度同步到 5.0

## 要知道的限制

- 三旋翼、双旋翼和多数共轴机型检索不到合格的顶视图（太小、斜视，或只有自制机架），没有收。原因逐条记在 `stimulus-review.md` 第十一节。
- 六旋翼和八旋翼几乎都是行业机、农业机和专业影视机，和消费级四旋翼比较时用途和旋翼数混在一起。构型之间的差别只作探索性描述。
- 四款原图偏小，放大了 1.7 到 2 倍：DJI Spark、Matrice 600 Pro、Tornado H920、Alta 8。
- 筛图是整理者一个人做的，作者还没有逐张看过。

## 核对

- `node qa/walkthrough.mjs`：27 项通过（三份模拟答卷走完全程、300 次随机顺序检查、评分时图片始终在屏幕内）
- 真人答卷 0 份

合并后评议页在 `experiments/s5-compactness-pilot/participant/无人机外观评议.html`，全部样本一览在 `experiments/s5-compactness-pilot/real-overview.jpg`。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #85：S5：第一批回件的核对与汇总；44 张图的规格比例；第二判读取点页面
原址：https://github.com/Freeloop993/paper/pull/85　建立：2026-11-19T13:03:27Z　状态：MERGED　关闭：2026-11-20T02:08:48Z　合并：2026-11-20T02:08:48Z　分支：`claude/s5-first-returns-20261119` → `main`，末提交 `df4f7283e7db`　评论数：0

### 正文
*lucienzhu · 2026-11-19T13:03:27Z*

## 这个 PR 里有三件事

### 一、S5 第一批回件：核对、分组汇总

作者提交的 6 份答卷（`experiments/s5-compactness-pilot/responses/2026-11-19/`）。

- 用答卷里的随机种子重算出图顺序和左右对调：六份都出自评议页面。六份都少结尾一个花括号，补后完整。
- 作者确认：6 份出自 3 名评议者，本人作答，各自独立；12 张图的页面是从 5.0 页面删去 32 张四旋翼图得到的。
- 四旋翼组（32 款，3 人）：整机占外接框面积越大越被评为紧凑，等级相关 −0.81，逐人方向一致。评议者之间一致程度低，只作下一步的线索。
- 非四旋翼组（12 款，单独呈现）：三人彼此不一致，不能用，也不能与四旋翼组比较。

### 二、44 张评议用图的规格比例

`experiments/s5-compactness-pilot/geometry/`。登记任务 S5 要求评分对照规格里的比例，做评议包时漏了这一环，现在补上。

- 标了 204 个电机中心、机壳四缘和桨尖，三遍取点，读数全留；算出 W/L、机壳长宽比、机壳宽与对角电机距之比、d/D。
- 与四旋翼组评分对照：W/L 与紧凑感无关（−0.10）；机壳宽 / D 方向一致但不强（−0.44，三人都是负的）；四项都接不住占框面积那条线索。
- **这是一位 AI 判读者的读数，知道机型，也看过评分。** 第二位独立判读者的取点页面（`geometry/annotator/无人机取点.html`）和对照脚本已备好，走查 16 项通过。
- 标点时发现 6 张评议用图有瑕疵：P41 被裁、P18 机身近白、P07 和 P43 机头未转正、P17 可能是底面、P25 镜像。评议进行中不换图，汇总时单列。

### 三、规矩和安排

- 作者定的“每一步开工前先对蓝图”写进 `CLAUDE.md` 和进度页第八节。
- 进度页第六节：按登记任务表列出所有要找人的任务和依赖；作者决定先把 44 张图的评议做到 10 人，配对评议以后再说。
- S2 评论核查：题面在私有阅读库，本机账号打不开；公开模板和评分脚本审过，发放前要办的三件事和邀请语写在进度页。

## 核对

- `node qa/walkthrough.mjs`：27 项通过；`node geometry/annotator/qa.mjs`：16 项通过
- `python3 geometry/metrics.py` 只用标准库即可由 `points.csv` 重算全部比例

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #86：补齐阅读库可公开原始材料：论文 PDF、S2 题面、A3 归档与文件对照
原址：https://github.com/Freeloop993/paper/pull/86　建立：2026-11-20T04:17:00Z　状态：MERGED　关闭：2026-11-20T04:17:23Z　合并：2026-11-20T04:17:23Z　分支：`sync/paper-reading-room-20261120` → `main`，末提交 `445c603e85a0`　评论数：0

### 正文
*Freeloop993 · 2026-11-20T04:17:00Z*

## 背景
PR #85 已合并，但其中指出 S2 真实题面仍在私有 `paper-reading-room`，公开库缺少相应原件。已对 `Freeloop993/paper-reading-room` main `cc122ae8757f175cde92484da194b568fcbb7a3a` 和 `paper` main 做逐文件 Git SHA 核对：源 129 个文件，17 个文件同字节内容已在主库别的路径存在，112 个尚无同内容。

## 此次安全补档
- 将 42 个可公开源文件原样保存到 `archive/paper-reading-room/`：四篇 PDF 全文、150 条匿名编号 S2 题面 HTML、A3 原始坐标与历史校准、A8 公共来源表、S2 脚本与汇总、早期爬取档案的清单与校验信息。
- 公开目录新增导航和 `FILE-INDEX.json`（129 个源文件状态、大小、blob SHA 及在主仓已存在的同字节路径）。
- 主 `README.md` 只添加一个归档入口；不删除或覆盖现有数据。

## 暂不公开的 87 个文件（保留私有源仓）
- 8 个原始爬取 ZIP（含平台评论用户字段，尚未做脱敏核查）。
- A8 68 张匿名分发图、两个人类取点 ZIP、空白回应和说明（实验盲态尚未结束）。
- S2 `key.json`、A8 `PRIVATE-key.csv`、研究者恢复包、A3 `gold-private.json`。
- 3 个仅用于私有发放的目录导航已替换为公开版。

**注意：不是宣称将私有仓全部转为公开。** 详细原因及清单见 `archive/paper-reading-room/MIGRATION-STATUS.md`。

## 自动核对
- 42/42 已发布源文件的 Git blob SHA 与来源完全一致。
- 2840 个原有文件全部保留，仅主 README 更新索引。
- S2 HTML 与源文件同 SHA，含 150 条匿名题面；不含 S2 评分对应键。
- 关键私有密钥、研究者揭盲表及原始爬取 ZIP 未进入公开目录。


---

## PR #87：继续原样迁移私有阅读库：研究者键、A8 图像、7 个原始 ZIP（126/129）
原址：https://github.com/Freeloop993/paper/pull/87　建立：2026-11-20T06:53:52Z　状态：MERGED　关闭：2026-11-20T06:54:12Z　合并：2026-11-20T06:54:12Z　分支：`sync/paper-reading-room-full-20261120` → `main`，末提交 `f89b58038412`　评论数：0

### 正文
*Freeloop993 · 2026-11-20T06:53:52Z*

## 补充说明
用户要求不再按公开/私有范围区分，而是把 `paper-reading-room` 资料原样迁入公开 `paper`。

本 PR 在 #86 的基础上继续迁移，共新增 **84 个源文件**，包括：
- 原始爬取 ZIP 的 01–07 包
- A8 AI 匿名取点图片和空白 CSV
- A8 研究者 `PRIVATE-key.csv` 和恢复包、S2 研究者 `key.json`、A3 `gold-private.json`
- 原始研究者说明和私有 README 原文（改名 `SOURCE-README.md` 避免覆盖现有导航）

索引 `archive/paper-reading-room/FILE-INDEX.json` 已变为 **126/129** 个源文件完成迁移，按原始 Git SHA 和字节数核对通过。原仓保留不动。

**还有 3 个原件没有复制**（并非故意隐去）：`datasets/early-crawl/08-semantic-analysis.zip`（13,876,021 字节）、`participants/a8-H1.zip`、`participants/a8-H2.zip`（各 14,655,170 字节）。GitHub 对这些跨仓库对象返回 422 invalid blob，连接器无法取得这些大二进制正文。源仓仍保存着它们，公开仓中的状态表逐一标记为 `pending_binary_transfer`，没有造假文件。

### 核对
- 126/126 已发布源文件：路径、字节数、blob SHA 全部吻合。
- 原 `paper` 文件均保留；只重写首页导航与归档状态文档。
- 主仓 PR 中包含研究者对应键和原始数据，合并后可公开下载；**可能影响盲测设计，GitHub 历史会保留。**


---

## PR #88：S5 回件到齐：10 名评议者、两位判读者的汇总；逐项清点还缺什么
原址：https://github.com/Freeloop993/paper/pull/88　建立：2026-11-20T08:52:32Z　状态：MERGED　关闭：2026-11-20T09:06:11Z　合并：2026-11-20T09:06:11Z　分支：`claude/s5-returns-and-tidy-20261120` → `main`，末提交 `55d5ddd7b869`　评论数：0

### 正文
*lucienzhu · 2026-11-20T08:52:32Z*

## 做了什么

作者提交了后 7 份 44 张混排的评议答卷和第二位判读者的 44 张取点。这个 PR 核对、汇总，并对照登记任务表列出还缺的数据。读法在 `experiments/s5-compactness-pilot/responses/README.md`。

## 结果

- **13 份答卷都出自评议页面**（用答卷里的种子重算，顺序和对调一致）。
- **四旋翼 32 款，10 名评议者**（7 人在 44 张混排里评，3 人只看了这 32 张）：
  - 整机占外接框面积越大越被评为紧凑：−0.83（3 人时 −0.81）
  - 机壳宽 / 对角电机距：−0.52、−0.59（两位判读者的读数）
  - 电机布局宽长比 W/L：无关
  - 有一份答卷每张图只用 3.2 秒，与其余九人不一致；方案没有剔除门槛，保留，去掉后结论不变
- **44 张混排，7 名评议者**：六、八旋翼上 4 人评得比四旋翼紧凑、3 人评得更舒展，排不出顺序。
- **两位判读者**：204 个电机中心相距中位数 2.7 像素；W/L、d/D 两人一致（+0.99、+0.95）；靠机壳的两项差得多（+0.88、+0.74），原因是“机壳到哪儿为止”取点说明没写细。

## 还缺什么

写在 `planning/research-panorama/progress-20261119.md` 第九节。要点：S2 评论核查库里只有题面和对应键，**答卷 0 份**；按冻结方案（44 张混排）作答的是 7 人；A8 的两个真人取点包和 08 号数据包没有迁进来；最接近的 6 篇文献仍没有原件。

## 其他改动

- `summarize.py`：四旋翼合并一组、逐人与其余人的平均相关、去掉最不一致一份的敏感性对照。都是补充项，记入 `freeze.json`。
- `geometry/compare.py`：前后缘点反的按位置排回；`geometry/relate.py`：同时给出两位判读者的读数。
- `STATUS.md` 顶部更新为 11 月 20 日的状态。
- 走查 27 项通过。

仓库整理另开一个 PR。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #89：仓库整理：执行 11 月 18 日已定的归档（28 个文件夹移入 archive），删去重复件
原址：https://github.com/Freeloop993/paper/pull/89　建立：2026-11-20T08:59:53Z　状态：MERGED　关闭：2026-11-20T09:06:32Z　合并：2026-11-20T09:06:32Z　分支：`claude/repo-tidy-20261120` → `main`，末提交 `de34ef8de4f9`　评论数：0

### 正文
*lucienzhu · 2026-11-20T08:59:53Z*

> 这个 PR 叠在 #88 上。先合 #88，这里就只剩整理的两个提交。

## 做了什么

作者要求清理仓库里的重复和堆积。清点结果：全库 2,983 个文件、约 1.49 GB，其中文献全文 784 MB（已定保留）；逐字节重复的只有约 41 MB。主要问题是退役的批次还和现行证据混在一起。

这次执行的是 **11 月 18 日整理清单里作者已经同意、一直没有执行的部分**：

| 做了什么 | 规模 |
| --- | --- |
| 清单第六节定为归档的 28 个文件夹移入 `archive/evidence/`、`archive/experiments/` | 579 个文件，136 MB |
| 全库对这些路径的引用一并改写 | 82 个文件：37 份 Markdown 的相对链接按新位置重算，30 份 JSON、15 份脚本里从仓库根写起的路径加 `archive/` 前缀 |
| 删去与文献库逐字节相同的 3 份学位论文 PDF | 28.8 MB |
| 删去 E0、R0 的原图压缩包（解包目录里有内容相同的全部成员） | 6.3 MB，SHA-256 写入各自 README |
| 新写 `evidence/README.md`（现行证据总索引）和 `archive/README.md` | |

## 怎么核对的

- 只改目录树里的路径，文件内容除引用改写外不变；GitHub 的差异页会把它们显示为重命名。
- 移动前后各算了一遍全库 Markdown 的相对链接，坏链接没有因为移动而增加（原有 55 处与这次无关）。
- 改过的 45 份 JSON 和脚本重新解析，全部有效；`experiments/r0-e0-e1`、`experiments/rating-kit` 的脚本里指向已归档文件的路径改到了新位置。
- 钉在某个提交上的网址没有改，仍指向当时的位置。

## 没有做的

写在 `planning/research-panorama/progress-20261119.md` 第十节。最要紧的一条：**第四章的证据（E3 三轮设计、GPU 日记录、评议答卷）和论文源码仍在没有合并的分支上**（`claude/e3-quad-qwen`、`claude/direction-todo-20261117` 等），主分支上查不到。合并顺序 11 月 18 日已定，需要仓库所有者或 Codex 执行。另有 11 个旧 PR、40 个分支待按清单处理。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #90：S2 题面 b 版；筛除一份评议答卷；按蓝图逐环清点主分支
原址：https://github.com/Freeloop993/paper/pull/90　建立：2026-11-20T09:17:24Z　状态：MERGED　关闭：2026-11-20T10:29:09Z　合并：2026-11-20T10:29:09Z　分支：`claude/s2-review-and-repo-analysis-20261120` → `main`，末提交 `1dbcacf5928a`　评论数：0

### 正文
*lucienzhu · 2026-11-20T09:17:24Z*

## 做了什么

**1. S2 评论核查题面：审过，出了 b 版**

对照登记任务 S2 和蓝图的 RQ1。a 版合用：150 条、两层 50 和 100 与对应键一致，顺序打乱，页面里没有原标记，两道题就是登记的两问。缺三样，b 版补上，题目、顺序、编号不变，对应键照用：

| 缺什么 | b 版 |
| --- | --- |
| 不记作答者是谁 | 开始前四问：身份、专业方向、是否看过分类结果或论文稿、是否打开过资料库 |
| 关掉页面就丢 | 自动存在本机浏览器，重开接着做 |
| 不记用时 | 记每条停留时间，评分脚本给出中位数和 3 秒以下的条数 |

发给研究生的文件：`evidence/20261117-research-update/comments/S2-评论核查.html`。走查 12 项通过，合成答卷经 `score.py` 加对应键跑通。

**还差一件要作者定**：怎么读结果没有登记。建议的两条读法写在 `comments/README.md`。

**2. S5：筛除一份答卷**

作者同意把不合用的换掉。489ae649c274 每张图只停留 3.2 秒（其余最快 5.6 秒），与其余九人的平均等级相关 −0.10，筛除并在汇总开头单列。四旋翼有效 9 人：占外接框面积 −0.86，机壳宽 / 对角电机距 −0.59、−0.66，与含它时结论相同。作者说的新一份答卷还没有进库。

**3. 按蓝图逐环清点主分支**

`planning/research-panorama/progress-20261119.md` 第十一节：每个研究问题对应论文哪一节、主分支现有什么、还缺什么。第 4 章和第 5 章大部分的图与读数仍在没有合并的分支上。

**4. 最接近的 6 篇文献**：题名和出处逐条核对后补进 `literature/map.md` 第五节。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #91：S5 第一步收齐；S2 评论核查结果；七条分支逐条核对
原址：https://github.com/Freeloop993/paper/pull/91　建立：2026-11-20T11:42:47Z　状态：MERGED　关闭：2026-11-20T12:02:46Z　合并：2026-11-20T12:02:46Z　分支：`claude/s5-final-and-s2-score-20261120` → `main`，末提交 `484bd9c64c05`　评论数：0

### 正文
*lucienzhu · 2026-11-20T11:42:47Z*

## 这次做了什么

对照蓝图：S5 第一步补缺口第 3 条（意图 → 规格），交 5.3.1；S2 核 RQ1 的语料筛选，交 3.2.1。

**S5 第一步（收齐）**
- 最后一份答卷 `fd32cf2f23b6` 种子复算一致，每张图 24.5 秒，与其余人的平均相关 +0.25，合用。
- 四旋翼 32 款有效 10 人（7 人混排、3 人只看四旋翼），1 份筛除。占外接框面积 −0.85；机壳宽 / 对角电机距 −0.59 和 −0.65；W/L 无关。与 9 人时相比各项变动不超过 0.07。
- 44 张混排有效 7 人。非四旋翼 12 款仍读不出关系：3 人评得比四旋翼紧凑、3 人评得舒展、1 人一样。读法页写明不必再补人。

**S2 评论核查（做完）**
- 一名未接触结果的设计类硕士研究生核了 150 条，28 分钟；判“涉及”的 60 条里 59 条抄了依据。
- 保留层 48/50，其余层 12/100；加权估计 1,318 条里 26.5%（20.0% 到 34.3%）谈到机体外形；召回 62.6%。
- 事先写下的读法一不触发，读法二触发：3.2.1 要写明 228 条是少算了的。漏掉的 12 条里 7 条是做工、质量类评论。
- 新增 `read_s2.py`，由答卷生成 `s2-result.md`；README 写了 3.2.1 要改的三处。

**其余**
- 三个补传的包能打开，校验值与索引一致；参与者材料说明里的两行改为指向本库文件。
- 进度页第十二节：按蓝图逐环列出还差的数据（要人的、要开 GPU 的、在分支上的），以及七条工作分支各自怎么办。结论是不按分支合并，只搬主分支没有的证据文件夹。

## 没有做的

- 没有搬分支上的文件夹，等作者定。
- 3.2.1 的正文没有改，论文源码不在主分支上。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #92：A8 真人取点的页面；评论少算是否连累后面的步骤
原址：https://github.com/Freeloop993/paper/pull/92　建立：2026-11-20T12:16:41Z　状态：MERGED　关闭：2026-11-20T13:04:39Z　合并：2026-11-20T13:04:39Z　分支：`claude/a8-click-pages-20261120` → `main`，末提交 `826df5e9e2ed`　评论数：2

### 正文
*lucienzhu · 2026-11-20T12:16:41Z*

## 对照蓝图

- **A8 真人取点**：RQ2a（布局比例控得住吗），交 5.2.1 的判读方法说明和判读者档案表。两名真人各量同样的 24 张（设计通路图 20、条件图 4）。登记的先后里 A4 要等 A3、A8 复核之后才开机，所以这一步在下一次开 GPU 之前。
- **评论少算**：RQ1 的语料筛选，交 3.2.1。

## 做了什么

**A8（`evidence/20261117-research-update/a8-click/`）**
- 两个发放包各做成一个单文件页面：图是包里 PNG 的原字节，顺序和规则不改。
- 页面自己出坐标（原图整数像素）、画出四轴 y 均值所在的横线并把左右缘吸到线上；左上右上点反等三种会被评分程序拒收的情况当场拦住；定不了的点必须写原因。
- `to_csv.py` 把回件转成发放包里那张表的格式，原评分程序 `a3/calibrate.py score` 不用改。
- 走查 46 项通过，含用模拟的 AI、H2 表把评分程序跑通。
- 页面各约 19.6 MB，不进库；`python3 build_pages.py` 重做出来逐字节相同，摘要登记在 `packs.json`。

**评论（`evidence/20261117-research-update/comments/`）**
- 补传的包到位后，150 条抽样可由种子重做，与对应键一致。
- `layer_scan.py` 整层按词面数没保留的 1,090 条：含大小、轻重词面的评论保留了 93%、96%，做工和质量类只保留 30%。
- README 新增一节：少算集中在做工和质量类，不连累“紧凑为首要语义目标”和后面的实验；不必换人重做核查；受影响的是 3.2.1 的写法和一句范围限制。

**进度页第十三节**：A8 开工前的对照表；哪些任务要开 GPU 和先后。

## 没有做的

- 真人回件和独立 AI 读数都还是 0。
- 3.2.1 的正文没有改，论文源码不在主分支上。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### 评论 1
*Freeloop993 · 2026-11-20T12:34:39Z · [原链接](https://github.com/Freeloop993/paper/pull/92#issuecomment-7039668768)*

已补齐 A8 的 **实际可发放文件**：PR #92 只提交了 `build_pages.py` / `template.html`，而 `dist/` 被 gitignore，所以原先在 Files changed 里找不到 `四旋翼取点-H1.html` 和 `四旋翼取点-H2.html`。

我用独立的 GitHub Actions 构建从此 PR 的固定提交 `ffc43518c7320f1a8c55194fd3bb378e0293f28e` 及 main 的原始 H1/H2 ZIP 生成了两个 HTML，**已通过原始 ZIP 与最终 HTML 的 SHA-256 核验**。每个 HTML 为 19,554,982 字节，分别内嵌 24 张 PNG，且无 `__PACK__` 模板占位符。

- [本次成功的构建及下载入口](https://github.com/Freeloop993/paper/actions/runs/44736562815)
- [构建产物：A8_quadrotor_H1_H2_HTML](https://github.com/Freeloop993/paper/actions/runs/44736562815/artifacts/14628448310)（ZIP 内含两份独立 HTML，2026-12-20 到期）
- [可重现的工作流](https://github.com/Freeloop993/paper/blob/ca9d71021ba7e0545c365ef847e5fb151e361f60/.github/workflows/build-a8-html.yml)（在单独分支，未修改或合并 main）

SHA-256：
- H1: `c154f4977d052e2a8edf5d7db393afddac364b425d470f5d4d01e68196c0c46e`
- H2: `eb95504403024a48de935b305f0e76410ccb86bffad569d870445681106a0df3`

研究者应分别把 H1/H2 的 HTML 发给不同标注者，勿将 GitHub 仓库链接发给标注者。标注者用 Chrome/Edge 离线打开，做完导出 JSON 回件即可。

### 评论 2
*Freeloop993 · 2026-11-20T13:03:39Z · [原链接](https://github.com/Freeloop993/paper/pull/92#issuecomment-7040234271)*

A8 H1/H2 两份真实人工取点回件现已由作者上传至 `Freeloop993/paper` 的 **main**，无需等待此 PR 合并才能读取：

- [H1 原始 JSON](https://github.com/Freeloop993/paper/blob/main/evidence/20261117-research-update/a8-click/returns/quad-points-H1-e52e97bc9fae.json)
- [H2 原始 JSON](https://github.com/Freeloop993/paper/blob/main/evidence/20261117-research-update/a8-click/returns/quad-points-H2-7a221036d8c4.json)
- [回件索引 / 校验 / 下一步](https://github.com/Freeloop993/paper/blob/main/evidence/20261117-research-update/a8-click/returns/README.md)

两份均为 `a8-click-v1`、对应 pack（H1 `2beb48eec636`、H2 `29d52d712fbc`），各 24/24 张，4 张示意图四点 + 20 张设计图八点，坐标合法，无缺失；GitHub 回读与上传原文一致。

请后续更新本 PR 描述及 `a8-click/README.md` 中 “真人回件仍为 0” 的过时状态，并使用 `to_csv.py` 转表。**独立 AI 的 68 张读数仍未提交，正式差异评分尚未完成；请勿将上传视为已完成 A8 整体分析。**


---

## PR #93：A8 两份真人取点回件的读法；S6 页面收回到登记范围
原址：https://github.com/Freeloop993/paper/pull/93　建立：2026-11-20T13:13:12Z　状态：MERGED　关闭：2026-11-20T13:30:04Z　合并：2026-11-20T13:30:04Z　分支：`claude/a8-returns-20261121` → `main`，末提交 `452a92702c30`　评论数：0

### 正文
*lucienzhu · 2026-11-20T13:13:12Z*

## 对照蓝图

- **A8 真人取点**：RQ2a，交目录 5.1.2“测量方法与判读者校准”。要求两名真人各量同样的 24 张，报告条件图上的误差和重叠图上的差。
- **S6 词对重新编码**：RQ1，交 3.2 节现有的表 3.2。

## A8 回件

两份回件各 24 张全部点完，没有留空。`human_pair.py` 用与 `a3/calibrate.py` 相同的公式算了真人这一半：

- 条件图上红点偏差：H1 中位数 2.3 像素，H2 0.7 像素；W/L 偏差都不超过 0.007。
- 20 张设计图上两人之间：电机中心相距中位数 3.1 像素；W/L 相差中位数 0.006、最大 0.026；机壳宽与对角电机距之比相差中位数 0.004。
- 与知情者取的已有读数相比，W/L 最多差 0.032。目标 0.70 的 4 张，三套读数都在 0.96 到 1.06，命中 0/4。
- 机壳长宽比两人差约 7%：一人取外轮廓，一人取顶盖面板。A4 开机前要把取法写进规则。

还差独立 AI 的 68 张读数，到了才能跑三方对照。

## S6 页面

作者的意见：结果要写在原来的位置、用原来的写法，不要多出要解释的内容。第一稿里登记范围以外的两个小问题（作者的态度、说的是收起来还是展开时的大小）已删，页面只问四个方面，约 20 分钟。走查 21 项通过。README 写明结果只进表 3.2 和它前后两段。

## 进度页第十五节

人的数据各写在现行目录的哪一节：没有一项需要新增小节。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #94：工作台 3.5.0 接上 Qwen；两条规则；五篇最接近的文献
原址：https://github.com/Freeloop993/paper/pull/94　建立：2026-11-20T14:32:15Z　状态：MERGED　关闭：2026-11-21T12:14:42Z　合并：2026-11-21T12:14:42Z　分支：`claude/rules-papers-workbench-20261121` → `main`，末提交 `1c4afa381011`　评论数：0

### 正文
*lucienzhu · 2026-11-20T14:32:15Z*

## 对照蓝图

- **工作台**：蓝图 ⑨ 的“冻结系统版本”，补缺口第 8 条；RQ3，交 3.5 和 4.5 节。
- **五篇文献**：蓝图 ⑨ 的第一步“补 2.6 节要用的原件并核页”。
- **两条规则**：机壳端点属 RQ2a（5.1.2）；评论纳入属 RQ1（3.2.1）。

## 工作台（`prototypes/drone-configurator`，3.5.0）

沿论证链逐环核对后，只有一环不符合研究逻辑：**画布上的生成只能接 MiniMax H3，而论文全文只用 Qwen。**

- 图像作业服务加了 Qwen 后端（本机 ComfyUI）。发出的工作流与第 4 章 E3 已归档的请求相同：`TextEncodeQwenImage21`，40 步，cfg 3，euler／simple，负面词相同。
- 启动：`npm run studio:chat -- --port 4178 --image-backend qwen-comfy --comfy-url http://GPU主机:8188`。
- 界面写明当前接的是哪个后端；MiniMax 标“开发用，不计入论文数据”。
- 每轮的请求、入队回执、运行历史原样存盘，供主持人登记场次。
- “紧凑”的假设下面写上了 S5 第一步的相关结果；机身两项比例的参考值加上了 32 款真实产品的范围。

**检查**：构建通过；服务端测试 9 项（新增 1 项 Qwen）；几何与提示词核对 56 项；画布走查；交接清单 61 个文件；浏览器里用冒充 Qwen 的夹具走了一遍。

**没有做到的**：Qwen 后端没有对真实的 GPU 主机测过。开机后先在画布上生成一张，核对回图、权重文件名和不重复调用，再开始预试。

**留给作者定的三件事**（没有改）：默认机身的比例不像真实产品；自由提示那一种方式在画布上没有入口；W/L 默认值的设计理由。见 `review/20261121-research-logic.md`。

## 两条规则

- 机壳上下端取机壳主体可见外轮廓；不算电机、桨叶、机臂、外伸的相机和阴影。
- 只谈做工、可靠性、材料性能的评论不算造型语义。登记的召回率不动，原筛选的限度照实写，不重筛 1,318 条。

## 文献

L113 至 L117 入目录和原页证据表。Davis 等的题名更正；Zhou 等核读的是预印本；还差 Mugge 等 2018。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #95：工作台 3.6.0：起始值取自真实产品、自由提示并入画布；第 6 篇文献与 2.6 节
原址：https://github.com/Freeloop993/paper/pull/95　建立：2026-11-21T10:50:26Z　状态：MERGED　关闭：2026-11-21T12:14:41Z　合并：2026-11-21T12:14:41Z　分支：`claude/workbench-defaults-freeprompt-20261121` → `main`，末提交 `077aeff4c57e`　评论数：0

### 正文
*lucienzhu · 2026-11-21T10:50:26Z*

作者审 #94 时定的五件事，全部做完。这个分支接在 #94 后面，所以也包含 #94 的三个提交；合并这一个，#94 就一并进去了。`evidence/`、`experiments/`、`archive/` 下已有的文件一个都没有改。

## 做完的

| 事 | 结果 |
| --- | --- |
| 1. 默认机身 | 起始值取 32 款真实四旋翼产品的中位数：宽 X 型、W/L 1.35、机身 150 × 55 mm（机身宽 ÷ 轴距 0.22，长 ÷ 宽 2.73）。原来是真 X、1.00、100 × 80。轴距 250 mm、桨径 5 英寸没有动 |
| 起始值与实验条件分开 | 两样分开登记在 `src/design/defaults.ts`。三档 W/L（0.70、1.00、1.30）和 C2 预试的布局（真 X、1.00、250 mm）照登记的数，面板上可以一键载入 C2 条件 |
| 2. 自由提示 | 画布上的一种步骤。只把设计者写的原文发给模型，不带布局条件图；模型、画幅、步数、cfg、采样器、负面词、种子规则与结构化方式相同，每一轮留下同样的一组文件。一场可以只用一种方式，另一种的入口和卡片收起 |
| 3. W/L 默认值 | 起始值 1.35；实验档不动。理由见复核记录第二节 |
| 5. 第 6 篇文献 | 不补。2.6 节五行比较逐行核了依据：只有“编辑达成与其余保持分开评”一行缺原件 |
| 4. A8 独立 AI 读数 | 做完。按盲测规则重新匿名，交给四个子代理实例，读完后核对了每一次调用，没有碰目录以外的东西。条件图上轴心误差中位数 0.3 像素；与两位真人的 W/L 之差都不超过 0.021；窄档 0/12 由三位不知情的判读者复现。WLQ 中档命中在不知情的读数下是 3/12，此前知条件的读数是 5/12，差在两张落在 0.10 边上的图。第一次用的 Fable 读到一半撞上用量上限，换 Opus 5.5 从头读完 68 张 |

## 检查

几何与提示词核对 70 项、服务端测试 10 项、画布走查、新加的两种方式走查、离线检查、交接清单 61 个文件，全部通过。两种方式留下的文件用主持人的登记工具从头到尾试收了一遍，配对检查通过（夹具回图，不是模型回图）。

## 要真实 GPU 才能验的

结构化和自由提示各生成一张；以上一张为父图再做一轮；三轮交给登记工具各收一遍；记下每张图的耗时。清单在复核记录第六节。

## 对已有实验的影响

工作台的改动没有影响：已归档的请求里没有工作台的机身包络句；三档 W/L 的轴心仍与登记的条件图一致；C2 只登记了视图、W/L 和轴距，预试还没做过。

A8 有一处要作者定：不知情的读数下 WLQ 中档命中是 3/12，`a3/` 登记的是 5/12。`a3/` 下的读数没有改，5.2.1 用哪一套或两套都报，由作者定。窄档 0/12 和宽档 12/12 不变。

## 能不能开始作者的两场预试

工作台这边齐了。还差两样：GPU 开机后的五项核对，以及复核记录第七节留给作者定的三件事（计时以谁为准、自由提示那场模型收不收参照图、桨径起始值）。

[复核记录](../../prototypes/drone-configurator/review/20261121-defaults-free-prompt/README.md) · [A8 读法](../../evidence/20261117-research-update/a8-ai/README.md) · [进度页第十九节](../../planning/research-panorama/progress-20261119.md)

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #96：工作台 4.0：逐层搭建的决定链，AI 在每一步起草；RQ3 对照组改为 AI 对话加自由提示
原址：https://github.com/Freeloop993/paper/pull/96　建立：2026-11-21T15:34:15Z　状态：MERGED　关闭：2026-11-22T03:41:17Z　合并：2026-11-22T03:41:17Z　分支：`claude/workbench-redesign-20261122` → `main`，末提交 `0cfbd6768f12`　评论数：0

### 正文
*lucienzhu · 2026-11-21T15:34:15Z*

## 这个 PR 做了什么

作者试用 3.6 后要求重想整个交互，看过[提案第二稿](https://claude.ai/artifact/HvGGydakNZmo9bgtmLbyBD)后同意方向，并定了几条。这里是按那几条做出的工作台 4.0，以及研究登记里跟着要改的地方。**没有改动任何实验数据和证据文件。**

- **画布是一串设计决定。** 每条方向一行：意图 → 机架 → 动力 → 机身 → 细节 → 色材 → 生成 → 候选与比较。每一层节点只管自己的决定，画累到这一层的顶视小图。在任何一层都能分叉，上游共用。改了上游，生成节点标“已过时”。修改轮从父图连出。
- **AI 在每一步起草，设计者拍板。** 读意图并配用户原话；提方向；把“再紧凑一点”变成某一层的参数建议；在候选上“机身短一点，其他别动”只改相关的层。不做 AI 自动评图。
- **依据分三档：已验证、统计相关、设计假设。** 档位由证据登记决定，不由模型决定。只有已验证的建议主按钮是「照此修正」，其余两档是「开一个分支试试」，所以未验证的结论不会变成规则，也不用加警告。
- **文字模型经接口调用，版本锁定，每次调用记日志。** 两场用同一个版本。没有密钥时由规则回退应答，界面上明说。
- **“AI 对话 + 自由提示”成为一场。** 每一轮记下发出的文字是自己写的、AI 起草后原样用的，还是改过的。工作区记录可导出成 JSON。
- **3.6 保留在 `#v=3`。** 视觉系统改为石墨。

节点为什么这样分（比较了五种分法；机架和动力不合并，因为条件图只画机架）见 [interface-design.md](https://github.com/Freeloop993/paper/blob/0cfbd6768f1295ad31c9c923996d425471388e0f/prototypes/drone-configurator/interface-design.md)。

## 研究设计跟着改的（带日期的修订，原文不改）

- [预试记录约定](https://github.com/Freeloop993/paper/blob/0cfbd6768f1295ad31c9c923996d425471388e0f/evidence/20261117-research-update/method/paired-pilot.md)：两组都用同一个文字模型；测量不变；能检验什么、不能检验什么。
- 登记任务 C1、蓝图 ② 和 RQ3、桥接工具说明（主持人要多收 AI 日志和工作区记录）。
- 进度页第二十节、STATUS、PROGRESS。

RQ1、RQ2、S5、A8、RQ1′、RQ4 不受影响。

## 怎样试

```powershell
cd prototypes/drone-configurator
npm ci
npm run build
npm run studio:fixture -- --port 4178
```

打开 http://127.0.0.1:4178/ 。AI 由规则回退应答，图像由软件夹具应答（把条件图当回图），不需要任何密钥。接真实文字模型的方法写在[工作台说明](https://github.com/Freeloop993/paper/blob/0cfbd6768f1295ad31c9c923996d425471388e0f/prototypes/drone-configurator/README.md)的 4.0 一节。

## 核对

[复核记录与截图](https://github.com/Freeloop993/paper/blob/0cfbd6768f1295ad31c9c923996d425471388e0f/prototypes/drone-configurator/review/20261122-workbench-4/README.md)

- 27 项服务测试通过：决定链的逻辑、AI 服务的核对与版本锁定。
- `npm run verify` 70 项通过。
- `npm run walkthrough:studio4`（新）：整条流程，连跑 8 次全过。
- 3.6 的 `walkthrough:canvas`、`walkthrough:methods` 通过。
- `npm run check-offline` 通过，新增了 4.0 离线打开的检查。
- `verify_checkout.py` 61 个文件通过。
- 真实模型调用 0。

## 还没验证的

- 接真实文字模型后的表现。要作者定服务和版本，再跑 `npm run ai:smoke`（5 次调用）。
- 真实 GPU 主机上的 Qwen 后端，和 3.6 相同。
- 主持人登记工具还不能收存 AI 日志和工作区记录。
- 蓝图白板上那句还没改。

作者试用后再定是否进入预试。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

## PR #97：工作台 4.1–4.3.1：Codex 评审与盲测、GPT 复测修正；对齐研究主线、按场次导出、出图断线取回且每轮只入队一次、计时与事件表、文字模型 MiniMax M3.1
原址：https://github.com/Freeloop993/paper/pull/97　建立：2026-11-22T08:18:51Z　状态：MERGED　关闭：2026-11-23T10:54:07Z　合并：2026-11-23T10:54:07Z　分支：`claude/workbench-review-20261122` → `main`，末提交 `53d12fa42787`　评论数：1

### 正文
*lucienzhu · 2026-11-22T08:18:51Z*

这个 PR 现在有四次提交：4.1（Codex 评审之后）、4.2（11 月 23 日对照蓝图与论文研究之后）、4.3（同日，Codex 盲测之后）和 4.3.1（同日，GPT 复测之后）。四次都**没有改任何实验数据和证据文件**，真实模型调用 0，真人场次 0。

## 4.3.1：GPT 复测三条（2026-11-23）

GPT 复测 4.3 提了三条，**我在 4.3 上都复现了**，4.3.1 修好。复现用的是一个真正走网络的 ComfyUI 冒充服务（Node 的 fetch 按真实网络情况报错），加上浏览器走查 `npm run walkthrough:issues -- --only=G1,G2,G3`。

- **回执丢了以后可能入队两次：** 请求发出后没收到完整回执就不再发第二次。记“待确认入队”，只按本轮编号在 ComfyUI 的队列和历史里找原作业，找到后取回原图；发出 2 分钟仍找不到就停下等人决定，“取回”只再找一次。
- **远端已收下却记失败（代理回 502、回执正文断开）：** 只有 4xx 和运行失败记失败，并保留具体回执；其余都记待确认入队，找到原作业后取回，代理的原文另存。
- **入队没确认就写“已入队”：** 页面按入队状态写“待确认入队”“还没发到出图服务”“已入队”。只有连接根本没建立才算没发出，接上以后照常发出，不多计入队请求。
- 顺带：回执丢失后找到的轮次，不再把找到的时间当入队时间，事件表留空写原因。

新增 6 项单元测试和 G1–G3 在 4.3 上不过（明确拒收与运行失败那 1 项本来就对），在 4.3.1 上全过；`walkthrough:issues` 15/15，50 项服务测试，verify 71/71，其余走查、离线包检查、GPU 验收脚本的夹具演练都通过。逐条见复核记录第六节（`prototypes/drone-configurator/review/20261123-workbench-4.3/README.md`）。

## 4.3：Codex 盲测 14 条（2026-11-23）

作者要我以自己的测试为准判断 Codex 盲测的 14 条。新写了 `npm run walkthrough:issues`，用可控的夹具复现每一条：文字模型可以按住、报错、按 MiniMax 文档的规则截断；ComfyUI 可以入队后断线、服务重启、按缺权重拒收。**能在本机测的 12 条在 4.2 上全部复现，没有误报；4.3 上 12 条全过。**

| 条 | 4.2 上复现到的 | 4.3 |
| --- | --- | --- |
| 1 | P02 的页面留着 P01 没发的文字和父图，实际请求带了 P01 的父图 | 换场清草稿；父图只能来自这一场或这个项目 |
| 2 | 晚到的回答记进下一场；晚到的读意图改了下一场的项目 | AI 调用绑定发出它的那一场，晚到的只记回那一场 |
| 3 | 入队后断线、服务重启都记失败；自由提示页没有取回按钮 | “待核对”，按原 prompt_id 取回，回执丢了先在队列和历史里找，每轮只入队一次；两边都有“取回” |
| 4 | 4096 的上限在 max 下截断（文档：思考算进上限，不写推理强度时就是 max） | 写明 `max`、`max_completion_tokens` 131072、等待 300 秒；回执记设置、收尾原因、用量 |
| 5 | 两条失败调用不进 ZIP | 失败调用按编号和场次取回，进 ZIP |
| 6 | 重导旧场次写的是现在的配置 | 清单用开场时的记录，导出时的配置单列 |
| 8 | 没有用户依据摘要 | 两边同一版本，记进场次；v0 草稿待作者定稿 |
| 9 | 没有交接记法、没有分开的计时 | 主持人接手/技术暂停；按登记口径分开计时；导出登记的场次事件表 |
| 10 | 两次定稿都留着，没有当前终稿 | 一场一个当前终稿，“不要”后写明没有定稿 |
| 11 | ZIP 里没有服务端原件；HTTP 400 只写状态码 | 每轮附服务端原件；拒收写出节点和权重文件名 |
| 12 | 换方式开出缺次序的登记场次 | 四项齐全才登记；登记场次不能直接换方式 |
| 13 | 比较页写“决定相同” | 写出实发文字的差别和父图 |

第 7、14 条要真机：`npm run gpu:acceptance -- --comfy-url <地址>` 两组各出首图和两次修订，逐轮核对原图、输入、工作流、权重、种子、prompt_id、历史和 ZIP，另存匿名盲读材料；已在夹具上演练通过。

- 43 项服务测试、`npm run verify` 71 项、4.0 整条走查（最后连跑 3 次）、3.6 两条走查、`check-offline`、`verify_checkout.py` 都通过。
- [4.3 复核记录与截图](https://github.com/Freeloop993/paper/blob/53d12fa4278772ecf125cb2d49b5c0e0c8fc3123/prototypes/drone-configurator/review/20261123-workbench-4.3/README.md)

**还要作者定的：** 用哪把密钥跑真实文字冒烟（max 下的等待时长也在这一步量）；用户依据摘要定稿；等待时还在操作算不算主动时间；第 14 条前后对照表草案；租 GPU。

## 4.2：对齐研究主线（2026-11-23）

作者要求对照蓝图和论文的实际研究再核一遍工作台，并提了四点，另定文字模型。逐条结论在[工作台与研究主线的对齐](https://github.com/Freeloop993/paper/blob/53d12fa4278772ecf125cb2d49b5c0e0c8fc3123/planning/2026-11-23-workbench-alignment.md)。

**1. 起点按主实验。** 4.1 里根本没有登记的委托 A、B，起点也不是主实验。
- 现在主持人在“研究场次”里按委托开一场：选委托、方式、参与者编号和次序。
- 任务、委托原文和 C2 机架一起定下，两种方式看到同一段委托。
- 工作台只做航拍四旋（RQ3 的对照）和植保六旋。八旋、共轴等以后直接在 GPU 上跑请求管线。这样算数的四个条件写进了登记任务表 H 节。

**2. 本场材料按实际场次分开。** 4.1 按项目打包，同一项目里切过方式就会混。
- 现在每一轮、事件、对话和 AI 调用都写下场次编号，一场一个 ZIP。
- 清单自检两件事：每一轮都属于这一场、都是这一场的方式。
- 文件名照界面上的叫法。

**3. 植保六旋的药箱与喷洒部件。**
- 药箱两种：半嵌入方形箱、收进机身。喷洒部件两种：横向喷杆、电机下方喷头。
- 句子沿用 39 张和开发批 E6B-N 的原文，选项旁写明出过多少图。
- 起始值对齐 39 张：双叶桨、折叠铰接、半嵌入药箱、横向喷杆。

**4. C2 的重叠。** 判断为不影响出图，因为条件图里没有机身，而且差别约 3 个像素。只改了核对：机身间距按画出的外形量，不再给工作台组亮假警告。机身和登记条件都没改。

**文字模型：** 锁定 `MiniMax-M3.1-Flash`（官方接口里 M3.1 的名字）。日志和界面标签写明服务主机。

**核对中另修了：**
- 已经有决定时换任务，现在先确认，再另开项目。4.1 会把四旋的决定套到六旋上。
- AI 读出的任务和现在的不同时，只问、不换。
- 从底部输入框读意图的调用编号写进事件，4.1 的导出会漏掉它。
- 新的一场从空的撤销历史开始。

[4.2 复核记录与截图](https://github.com/Freeloop993/paper/blob/53d12fa4278772ecf125cb2d49b5c0e0c8fc3123/prototypes/drone-configurator/review/20261123-workbench-4.2/README.md)
- 39 项服务测试通过。
- `npm run verify` 71 项通过。
- 4.0 整条走查加了 4.2 的各项，前后跑了 10 次，没有失败。
- 3.6 两条走查通过。
- `check-offline`、`verify_checkout.py` 通过。

**还要作者定的：**
1. 真实文字模型冒烟（5 次调用）用哪把密钥。
2. 两组共用的“用户依据摘要”的定稿文本。
3. 主持人登记工具是否读入本场 ZIP。

## 4.1：按 Codex 评审修正（2026-11-22）

逐条结论在[评审汇总（定稿）](https://github.com/Freeloop993/paper/blob/53d12fa4278772ecf125cb2d49b5c0e0c8fc3123/planning/2026-11-22-workbench-4-review-summary.md)。第七节记了作者 11 月 23 日的答复。

- **会让数据出错的两处：**
  - 分叉后改错方向（第 05 条）。
  - 在旧图上改时，没要求改的属性跟着变（第 06 条）。
- **作者直接要的：**
  - 节点可以单个拖动，一键整理。
  - 色材可以自定义。
- **其余评审条目：**
  - Windows 上存回执遇到占用时重试；一轮等太久可以取回或放弃。
  - 自由提示那一场能打开研究记录。
  - 轮次按项目归属。
  - 回执必须写明模型名。
  - 软件夹具写明不出真图。
  - 取舍能写理由、定终稿。
  - 越界用途先问。
- **研究记录：**
  - 范围收敛写进 H 节。
  - 第五章与登记不一致的三处写进重写清单。
  - Mugge 2018 和四篇编辑评价原件已逐页核读（L118 至 L122）。

[4.1 复核记录与截图](https://github.com/Freeloop993/paper/blob/53d12fa4278772ecf125cb2d49b5c0e0c8fc3123/prototypes/drone-configurator/review/20261122-workbench-4.1/README.md)

## 还没验证的

- 真实文字模型、真实 GPU（4.3 的验收脚本已备好）。
- Windows 上的重试只用模拟的占用测过。
- “药箱收进机身”这一项没出过图。

🤖 Generated with [Claude Code](https://claude.com/claude-code)

### 评论 1
*lucienzhu · 2026-11-23T09:16:17Z · [原链接](https://github.com/Freeloop993/paper/pull/97#issuecomment-7096432850)*

## GPT 复测 4.3 的三条：都在，已在 4.3.1 修好（`53d12fa`）

GPT 附的复现日志在 Codex 那台机器上（`D:\codex\tmp\…`），我这边打不开。下面都是我自己复现的：一个真正走网络的 ComfyUI 冒充服务（Node 的 fetch 按真实网络情况报错），加上浏览器里的三条走查（`npm run walkthrough:issues -- --only=G1,G2,G3`）。没有调用真实模型。

| 条 | 在 4.3（`ea4f0f9`）上复现到的 | 4.3.1 的做法 | 4.3.1 上的结果 |
| --- | --- | --- | --- |
| 高：回执丢了以后可能入队两次 | **属实。** 远端还在校验时连接断了，马上点“取回”：队列和历史都还查不到这一轮，4.3 就重发，服务收到 2 次请求。不点“取回”时，远端校验超过 3 秒、或者远端始终没有这一轮，也会重发 | 请求发出后没收到完整回执，就不再发第二次。记“待确认入队”，只按本轮编号（prompt_id、client_id）在队列和历史里找，找到后取回原图。发出 2 分钟仍找不到就停下等人决定：“取回”只再找一次，或者放弃这一轮 | 服务只收到 1 次请求，取回了原图 |
| 高：远端已收下却记失败 | **属实，两种都复现了。** 代理回 502，4.3 记“Qwen 服务拒收了这一轮（HTTP 502）”。正文传到一半断了，4.3 记“处理 Qwen 回执时出错”。两种接上以后都取不回 | 只有 4xx 算明确拒收，保留 ComfyUI 的原始回答；运行失败仍记失败，保留运行历史。5xx、408、200 却没有作业号、正文没收完，都记待确认入队，按本轮编号找原作业。代理的原文另存为 `comfy-enqueue-reply.txt` | 两种都取回原图，各入队 1 次。400 拒收和运行失败照旧记失败，并保留具体回执 |
| 中：入队没确认就显示“已入队” | **属实。** 服务端记的是 `enqueue: unknown`、`prompt_id` 为空，页面却写“待核对：已入队，等出图服务接上”。服务没开、请求根本没发出时，页面也这样写，入队请求还记成 2 次（实际送到 1 次） | 页面按入队状态写：结果不明写“待确认入队”；连接没建立写“待核对：还没发到出图服务”（只有这种接上后照常发出，不多计）；收到回执或在远端找到原作业后才写“已入队” | 两种情况都没出现“已入队”，入队请求记 1 次 |

**顺带改正一处：** 回执丢失、后来找到的轮次，4.3 把找到的时间记成了入队时间。4.3.1 只记 `foundAt`，事件表“入队”一行留空写原因。

**核对**

- 新增 6 项单元测试：在 4.3 上 5 项不过；第 6 项（明确拒收与运行失败）4.3 本来就对。4.3.1 上 6 项全过。
- G1–G3：4.3 上全不过，4.3.1 上全过。
- `walkthrough:issues` 15/15。
- 50 项服务测试；verify 71/71。
- studio4、methods、canvas 走查，以及离线包检查，都通过。
- smoke 夹具 5/5。
- GPU 验收脚本在夹具上演练，6 轮无问题。

版本号改为 4.3.1。

**还没验证：** 真实 ComfyUI 和 AutoDL 代理在这些情况下实际怎样应答，要等真机。

逐条记录和截图见[复核记录第六节](https://github.com/lucienzhu/paper/blob/53d12fa4278772ecf125cb2d49b5c0e0c8fc3123/prototypes/drone-configurator/review/20261123-workbench-4.3/README.md#六431gpt-复测三条)。

🤖 Generated with [Claude Code](https://claude.com/claude-code)


## 附：按分支名写的链接固定到的提交（2026-11-24）

| 原链接里的分支 | 固定到的提交 | 为什么改 |
| --- | --- | --- |
| `Freeloop993/paper` 的 `claude/e3-quad-qwen` | `e96d41946ea84237da506bb76c2f713a3f3b9275` | 按整理清单将删除，删前打同名标签 |
| `Freeloop993/paper` 的 `claude/thesis-docx` | `677f8bf0a9159b09c2efbf26e0e452dbe5f4b4ea` | 按整理清单将删除，删前打同名标签 |
| `Freeloop993/paper` 的 `codex/advisor-study-system-20261118` | `a98b3ecdce0330902d9f5dd99336ce41e7fc993e` | 按整理清单将删除，删前打同名标签 |
| `Freeloop993/paper` 的 `codex/e1-actuals` | `eb575d44fec7b4d53f7766a3f5e8629dcbdf7a5a` | 按整理清单将删除，删前打同名标签 |
| `Freeloop993/paper` 的 `tools/a8-html-download-20261120` | `ca9d71021ba7e0545c365ef847e5fb151e361f60` | 按整理清单将删除，删前打同名标签 |
| `lucienzhu/paper` 的 `claude/canvas-workflow-ux-134e36` | `0dbe1d828c59ca4dbff993f857e53f5564b24ea0` | Claude 账号 fork 上的分支，2026-11-24 已删 |
| `lucienzhu/paper` 的 `claude/workbench-redesign-20261122` | `0cfbd6768f1295ad31c9c923996d425471388e0f` | Claude 账号 fork 上的分支，2026-11-24 已删 |
| `lucienzhu/paper` 的 `claude/workbench-review-20261122` | `53d12fa4278772ecf125cb2d49b5c0e0c8fc3123` | Claude 账号 fork 上的分支，2026-11-24 已删 |
