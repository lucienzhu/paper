# GitHub 工单与 PR 的存档

GitHub 上的讨论都在这里留了原文照录的副本，不用再去翻网页。改动只在链接上：指向已删或将删分支的网址、指向 main 上已移走文件的网址改成固定提交号，写成站内路径的改成完整网址，从仓库根目录写起的相对链接改成从本目录出发；每个文件开头写明改了几处，文末附对照表。截至 2026-11-24：工单 46 个（开着 7 个），PR 51 个（合并 39 个，开着 11 个）。

| 文件 | 内容 | 存档日期 |
| --- | --- | --- |
| [issue-1-C01.md](issue-1-C01.md) | #1 协作工单 C01，100 条评论 | 2026-11-18 |
| [issue-2-X01.md](issue-2-X01.md)、[issue-14-X12.md](issue-14-X12.md)、[issue-19-E0.md](issue-19-E0.md)、[issue-20-E1.md](issue-20-E1.md) | 11 月 18 日关闭的 4 个工单 | 2026-11-18 |
| [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) | 11 月 12 日的 24 项任务 T01—T24 | 2026-11-18 |
| [kept-issues-original-bodies-20261118.md](kept-issues-original-bodies-20261118.md) | 11 月 18 日改写标题前，保留的 6 个工单的原文 | 2026-11-18 |
| [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) | #4—#13，11 月 12 日关闭的 Codex 离线任务 | 2026-11-24 |
| [open-issues-20261124.md](open-issues-20261124.md) | 存档时还开着的 7 个工单 | 2026-11-24 |
| [pull-requests-20261124.md](pull-requests-20261124.md) | 全部 51 个 PR 的正文、评论与审阅 | 2026-11-24 |

前 4 行的文件是 11 月 18 日写在分支 `claude/direction-todo-20261117` 上的，11 月 24 日才带回主分支。其中 issue-1-C01.md 改了 31 处链接、issue-2-X01.md 和 issue-19-E0.md 各改了 1 处，其余 4 个与分支上的原件逐字节相同（git blob 相同，见[来源清单](../../evidence/20261120-branch-recovery/source-manifest-20261124.tsv)）。

## 工单一览

| 工单 | 标题 | 状态 | 建立 | 关闭 | 评论 | 存档 |
| --- | --- | --- | --- | --- | ---: | --- |
| [#1](https://github.com/Freeloop993/paper/issues/1) | [Claude · C01] 建立六章写作证据矩阵，交回第一份研究审查 | closed | 2026-11-09 | 2026-11-17 | 100 | [issue-1-C01.md](issue-1-C01.md) |
| [#2](https://github.com/Freeloop993/paper/issues/2) | [Codex · X01] 将两种操作流程接到自由外形输入，离线验收 | closed | 2026-11-09 | 2026-11-18 | 12 | [issue-2-X01.md](issue-2-X01.md) |
| [#3](https://github.com/Freeloop993/paper/issues/3) | [作者决策 · A01] 作者决定与授权登记 | open | 2026-11-09 |  | 44 | [open-issues-20261124.md](open-issues-20261124.md) |
| [#4](https://github.com/Freeloop993/paper/issues/4) | [Codex · X02] S1 失败分解：尺度／平移／残差与 T/L/F 路线差异（离线） | closed | 2026-11-09 | 2026-11-12 | 3 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#5](https://github.com/Freeloop993/paper/issues/5) | [Codex · X03] G2 控制路线可行性与冻结包（离线） | closed | 2026-11-09 | 2026-11-12 | 4 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#6](https://github.com/Freeloop993/paper/issues/6) | [Codex · X04] G3 后端参考能力小测准备（离线） | closed | 2026-11-09 | 2026-11-12 | 6 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#7](https://github.com/Freeloop993/paper/issues/7) | [Codex · X05] 四/六旋共同对照离线编译（待 G2 选路线） | closed | 2026-11-09 | 2026-11-12 | 4 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#8](https://github.com/Freeloop993/paper/issues/8) | [Codex · X06] 人工转轴复测工具与 S1 匿名材料（零成本） | closed | 2026-11-09 | 2026-11-12 | 2 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#9](https://github.com/Freeloop993/paper/issues/9) | [Codex · X07] 调取历史控制图（旧 C1、S1 L/F）并备 G2b 筛选包（离线） | closed | 2026-11-09 | 2026-11-12 | 4 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#10](https://github.com/Freeloop993/paper/issues/10) | [Codex · X08] G2c 确认包：G2b 选中配置×3 档×新种子（依赖 X07/G2b） | closed | 2026-11-09 | 2026-11-12 | 3 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#11](https://github.com/Freeloop993/paper/issues/11) | [Codex · X09] G2d：照搬旧 C1 部件语汇的控制图（最后一批，6 次） | closed | 2026-11-10 | 2026-11-12 | 4 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#12](https://github.com/Freeloop993/paper/issues/12) | [Codex · X10] G3b：参考图修订能否既保持又能改（≤4 次，先离线） | closed | 2026-11-10 | 2026-11-12 | 4 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#13](https://github.com/Freeloop993/paper/issues/13) | [Codex · X11] 改稿台修订机制更新（依赖 X10/G3b 结果，离线） | closed | 2026-11-10 | 2026-11-12 | 1 | [issues-4-13-X02-X11.md](issues-4-13-X02-X11.md) |
| [#14](https://github.com/Freeloop993/paper/issues/14) | [Codex · X12] 正式采集与评议的离线工具：评议表、分配抽签、校准包（零成本） | closed | 2026-11-10 | 2026-11-18 | 7 | [issue-14-X12.md](issue-14-X12.md) |
| [#19](https://github.com/Freeloop993/paper/issues/19) | E0｜后端对照 | closed | 2026-11-12 | 2026-11-18 | 39 | [issue-19-E0.md](issue-19-E0.md) |
| [#20](https://github.com/Freeloop993/paper/issues/20) | E1｜参数响应与纯文字对照 | closed | 2026-11-12 | 2026-11-18 | 7 | [issue-20-E1.md](issue-20-E1.md) |
| [#21](https://github.com/Freeloop993/paper/issues/21) | E2｜局部编辑第二版（F1、F2、F7） | open | 2026-11-12 |  | 7 | [open-issues-20261124.md](open-issues-20261124.md) |
| [#22](https://github.com/Freeloop993/paper/issues/22) | E3｜四旋方案展开与深化 | open | 2026-11-12 |  | 2 | [open-issues-20261124.md](open-issues-20261124.md) |
| [#23](https://github.com/Freeloop993/paper/issues/23) | E4｜结构化与自由提示的协同对照（C1—C3） | open | 2026-11-12 |  | 1 | [open-issues-20261124.md](open-issues-20261124.md) |
| [#24](https://github.com/Freeloop993/paper/issues/24) | E5｜方案感知的独立评议（清单 E 组） | open | 2026-11-12 |  | 2 | [open-issues-20261124.md](open-issues-20261124.md) |
| [#25](https://github.com/Freeloop993/paper/issues/25) | E6｜农业植保六旋可行性探测（H 组） | open | 2026-11-12 |  | 1 | [open-issues-20261124.md](open-issues-20261124.md) |
| [#26](https://github.com/Freeloop993/paper/issues/26) | T01｜核对开题五项及指标去向 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#27](https://github.com/Freeloop993/paper/issues/27) | T02｜固定研究问题与证据单位 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#28](https://github.com/Freeloop993/paper/issues/28) | T03｜补齐理论与任务来源 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#29](https://github.com/Freeloop993/paper/issues/29) | T04｜对真实评论做双人编码 | closed | 2026-11-12 | 2026-11-18 | 2 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#30](https://github.com/Freeloop993/paper/issues/30) | T05｜锁定语义差异词对 | closed | 2026-11-12 | 2026-11-18 | 3 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#31](https://github.com/Freeloop993/paper/issues/31) | T06｜编制两案规格和任务卡 | closed | 2026-11-12 | 2026-11-18 | 2 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#32](https://github.com/Freeloop993/paper/issues/32) | T07｜定义几何变量与条件图 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#33](https://github.com/Freeloop993/paper/issues/33) | T08｜编入E1同信息量对照 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#34](https://github.com/Freeloop993/paper/issues/34) | T09｜固定独立量尺和读数误差 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#35](https://github.com/Freeloop993/paper/issues/35) | T10｜按E1检验两个参数响应 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#36](https://github.com/Freeloop993/paper/issues/36) | T11｜由作者筛选四旋候选 | closed | 2026-11-12 | 2026-11-18 | 8 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#37](https://github.com/Freeloop993/paper/issues/37) | T12｜记录作者的一案修订 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#38](https://github.com/Freeloop993/paper/issues/38) | T13｜完成一案深化表达 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#39](https://github.com/Freeloop993/paper/issues/39) | T14｜实施植保六旋单案 | closed | 2026-11-12 | 2026-11-18 | 3 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#40](https://github.com/Freeloop993/paper/issues/40) | T15｜冻结三组参与者和协议 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#41](https://github.com/Freeloop993/paper/issues/41) | T16｜核对D/S动作与机会 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#42](https://github.com/Freeloop993/paper/issues/42) | T17｜采集另招设计者的配对场次 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#43](https://github.com/Freeloop993/paper/issues/43) | T18｜用r3开展独立顶视盲评 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#44](https://github.com/Freeloop993/paper/issues/44) | T19｜复算参数误差与效应 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#45](https://github.com/Freeloop993/paper/issues/45) | T20｜归纳协同效果与代价 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#46](https://github.com/Freeloop993/paper/issues/46) | T21｜做E6归一化响应比较 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#47](https://github.com/Freeloop993/paper/issues/47) | T22｜封存原件与分母 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#48](https://github.com/Freeloop993/paper/issues/48) | T23｜把证据写入六章 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#49](https://github.com/Freeloop993/paper/issues/49) | T24｜汇总结论与适用范围 | closed | 2026-11-12 | 2026-11-18 | 1 | [issues-26-49-T01-T24.md](issues-26-49-T01-T24.md) |
| [#76](https://github.com/Freeloop993/paper/issues/76) | [协作 · C02] 11 月 18 日起的协作与交接 | open | 2026-11-17 |  | 1 | [open-issues-20261124.md](open-issues-20261124.md) |

## PR 一览

| PR | 标题 | 状态 | 分支 | 建立 | 合并或关闭 |
| --- | --- | --- | --- | --- | --- |
| [#15](https://github.com/Freeloop993/paper/pull/15) | C01: G3b 出图前修订建议、过期表述更正与接手快照 | merged | `claude/c01-review-1110` | 2026-11-10 | 2026-11-10 |
| [#16](https://github.com/Freeloop993/paper/pull/16) | C01: 评议表加细节充分性门、G3c 重新绑定建议、接手快照更新 | merged | `claude/c01-review-1110b` | 2026-11-10 | 2026-11-10 |
| [#17](https://github.com/Freeloop993/paper/pull/17) | Claude/c01 1111 | merged | `claude/c01-1111` | 2026-11-10 | 2026-11-10 |
| [#18](https://github.com/Freeloop993/paper/pull/18) | C01: 研究地基 v1——六项定案、完整线路、最小实验集、找人清单与过期内容清单 (#1 #3) | merged | `claude/foundation-v1` | 2026-11-12 | 2026-11-12 |
| [#50](https://github.com/Freeloop993/paper/pull/50) | 按 foundation 第 8 节修订稿件，按第 7 节同步六章清单与采集协议 | merged | `codex/foundation-section8` | 2026-11-12 | 2026-11-12 |
| [#51](https://github.com/Freeloop993/paper/pull/51) | C01: E0、E1 条件图与提示词规格——纠正此前试验图的输入问题 (#1 #19 #20) | merged | `claude/guide-prompt-spec` | 2026-11-12 | 2026-11-12 |
| [#52](https://github.com/Freeloop993/paper/pull/52) | 按 #51 冻结 R0、E0、E1：条件 PNG、逐次请求与判据（实际提交 0） | merged | `codex/r0-e0-e1-freeze` | 2026-11-12 | 2026-11-12 |
| [#53](https://github.com/Freeloop993/paper/pull/53) | E0 闭源六次改用 GPT Image 2.6，并冻结双盲读数与真人抽样清单 | merged | `codex/e0-image26-blind-read` | 2026-11-12 | 2026-11-12 |
| [#54](https://github.com/Freeloop993/paper/pull/54) | R1 出图前冻结：12 组渲染设置，复用 E1 两张，新增 22 次 | open | `codex/r1-render-freeze` | 2026-11-12 |  |
| [#55](https://github.com/Freeloop993/paper/pull/55) | C01: 从评论语义到四旋方案——T04—T06 与 E3 的实验基础、R1 评定问法 (#1 #22 #24) | merged | `claude/semantic-to-e3` | 2026-11-12 | 2026-11-12 |
| [#56](https://github.com/Freeloop993/paper/pull/56) | T04：36 张去标识语义卡、35 条来源及 40 条第二编码材料 | merged | `codex/semantic-card-delivery` | 2026-11-12 | 2026-11-12 |
| [#57](https://github.com/Freeloop993/paper/pull/57) | 按 #55 接入 R1 三题、E5 词对附表和 T06 作者规格 | open | `codex/semantic-tools` | 2026-11-12 |  |
| [#58](https://github.com/Freeloop993/paper/pull/58) | E1 实际结果：条件图 24/24、纯文字 12/12；附 E0 六张原图对照 | merged | `codex/e1-actuals` | 2026-11-12 | 2026-11-12 |
| [#59](https://github.com/Freeloop993/paper/pull/59) | 按 #20 补 E1 的 12 对原图及第 5.2 节证据边界 | merged | `codex/e1-design-audit` | 2026-11-12 | 2026-11-12 |
| [#60](https://github.com/Freeloop993/paper/pull/60) | C01: R1—R3 整批设计——可控与造型能否兼得（渲染设置、条件图画法、两段式）(#1 #19 #21) | open | `claude/r1-r3-design` | 2026-11-12 |  |
| [#61](https://github.com/Freeloop993/paper/pull/61) | C01: L1 布局条件筛选——条件图代码、工作流编译脚本、种子与参数 (#1 #19) | merged | `claude/l1-layout` | 2026-11-12 | 2026-11-12 |
| [#62](https://github.com/Freeloop993/paper/pull/62) | C01: 词对 v1 草案——按入选规则逐组核对 36 张证据卡，待作者确认 (#1) | open | `claude/word-pairs-v1` | 2026-11-12 |  |
| [#63](https://github.com/Freeloop993/paper/pull/63) | C01: D2 开发调参批——L1 判读、提示词 v2、带桨叶条件图的短控制窗口、图生图 (#1 #19) | merged | `claude/d2-tuning` | 2026-11-12 | 2026-11-12 |
| [#64](https://github.com/Freeloop993/paper/pull/64) | C01: D2 补充 18 份——浮雕图配 v2、两段式改写指令、两段式加早段控制、强造型描述 (#1 #19) | merged | `claude/d2-addendum` | 2026-11-12 | 2026-11-12 |
| [#65](https://github.com/Freeloop993/paper/pull/65) | C01: P1 参数化提示词——回到作者早期思路，MiniMax H3-Image 试验脚本 (#1 #19) | merged | `claude/p1-param-prompt` | 2026-11-12 | 2026-11-13 |
| [#66](https://github.com/Freeloop993/paper/pull/66) | C01: E3 三张规格卡草案与接手快照——待作者审阅，新增出图 0 (#1 #19 #22 #31) | merged | `claude/e3-spec-cards` | 2026-11-13 | 2026-11-13 |
| [#67](https://github.com/Freeloop993/paper/pull/67) | MiniMax 预试复核：三个机鼻／臂根方向、20 张实图与局部修订 | merged | `codex/minimax-camera-roots` | 2026-11-13 | 2026-11-13 |
| [#68](https://github.com/Freeloop993/paper/pull/68) | C01: 第 3 章方法冻结单 v1——开 GPU 前签署 (#1 #3 #21 #22) | merged | `claude/method-freeze-v1` | 2026-11-13 | 2026-11-13 |
| [#69](https://github.com/Freeloop993/paper/pull/69) | C01: 路线图、字典 v1.3、E6 植保规格卡草案、3.4 节初稿 (#1 #22 #25) | merged | `claude/roadmap-ch34` | 2026-11-13 | 2026-11-13 |
| [#70](https://github.com/Freeloop993/paper/pull/70) | C01: 冻结单第 2 节按实测填写，第 3 节待作者签署 (#1 #3) | merged | `claude/freeze-v1-sec2` | 2026-11-14 | 2026-11-14 |
| [#71](https://github.com/Freeloop993/paper/pull/71) | C01: 3.2—3.3 节初稿，3.4 按第三轮更新 (#1) | open | `claude/ch03-3.2-3.3` | 2026-11-14 |  |
| [#72](https://github.com/Freeloop993/paper/pull/72) | C01: 论文 Word 工作稿——按南航撰写要求排版，含目录与全文现稿 (#1) | open | `claude/thesis-docx` | 2026-11-14 |  |
| [#73](https://github.com/Freeloop993/paper/pull/73) | C01: E3 四旋设计初稿 9/9——A/B/C 各 3 张，按方向比较图 (#1 #3) | open | `claude/e3-quad-qwen` | 2026-11-14 |  |
| [#74](https://github.com/Freeloop993/paper/pull/74) | 以 E2 真人盲判稿为准合并论文源码与可重建 Word | open | `codex/thesis-source-e2r-20261115` | 2026-11-15 |  |
| [#75](https://github.com/Freeloop993/paper/pull/75) | 配置器重做为“洞察 → 造型 → 交付”工作台：可拖动画布、布局空间、设计提示、参考机型与并行方案（软件验收） | open | `claude/configurator-ui-20261117` | 2026-11-17 |  |
| [#77](https://github.com/Freeloop993/paper/pull/77) | 按导师反馈统一研究框架、设计系统规格和实验验收 | open | `codex/advisor-study-system-20261118` | 2026-11-18 |  |
| [#78](https://github.com/Freeloop993/paper/pull/78) | 多旋翼造型工作台：跨构型设计简报、条件图与候选取舍记录 | open | `codex/multirotor-studio-20261118` | 2026-11-18 |  |
| [#79](https://github.com/Freeloop993/paper/pull/79) | 工作台改成一块画布：每一步都是画布上的卡片，在卡片上直接做（软件走查） | merged | `claude/canvas-workflow-ux-134e36` | 2026-11-18 | 2026-11-19 |
| [#80](https://github.com/Freeloop993/paper/pull/80) | 研究全景：问题、主张、论证链、六章对应与缺口（一页，供复盘） | closed | `claude/research-panorama-20261119` | 2026-11-18 | 2026-11-19 |
| [#81](https://github.com/Freeloop993/paper/pull/81) | 文献库与研究推进：目录 131 项（44 项有原页证据）、文献关系图、2.6 比较表初稿、第 4–5 章小节、总体研究蓝图 | merged | `claude/literature-map-20261119` | 2026-11-19 | 2026-11-19 |
| [#82](https://github.com/Freeloop993/paper/pull/82) | 紧凑感评议包 3.0：11 款真实 DJI 产品的顶视评议 | merged | `claude/rating-pack-v2-20261119` | 2026-11-19 | 2026-11-19 |
| [#83](https://github.com/Freeloop993/paper/pull/83) | 紧凑感评议包 4.0：32 款真实产品，18 个品牌、十种类型，靠图片检索取得 | merged | `claude/real-drone-images-20261119` | 2026-11-19 | 2026-11-19 |
| [#84](https://github.com/Freeloop993/paper/pull/84) | 紧凑感评议包 5.0：补上六旋翼、八旋翼和共轴，共 44 款真实多旋翼产品 | merged | `claude/rating-pack-v5-multirotor-20261119` | 2026-11-19 | 2026-11-19 |
| [#85](https://github.com/Freeloop993/paper/pull/85) | S5：第一批回件的核对与汇总；44 张图的规格比例；第二判读取点页面 | merged | `claude/s5-first-returns-20261119` | 2026-11-19 | 2026-11-20 |
| [#86](https://github.com/Freeloop993/paper/pull/86) | 补齐阅读库可公开原始材料：论文 PDF、S2 题面、A3 归档与文件对照 | merged | `sync/paper-reading-room-20261120` | 2026-11-20 | 2026-11-20 |
| [#87](https://github.com/Freeloop993/paper/pull/87) | 继续原样迁移私有阅读库：研究者键、A8 图像、7 个原始 ZIP（126/129） | merged | `sync/paper-reading-room-full-20261120` | 2026-11-20 | 2026-11-20 |
| [#88](https://github.com/Freeloop993/paper/pull/88) | S5 回件到齐：10 名评议者、两位判读者的汇总；逐项清点还缺什么 | merged | `claude/s5-returns-and-tidy-20261120` | 2026-11-20 | 2026-11-20 |
| [#89](https://github.com/Freeloop993/paper/pull/89) | 仓库整理：执行 11 月 18 日已定的归档（28 个文件夹移入 archive），删去重复件 | merged | `claude/repo-tidy-20261120` | 2026-11-20 | 2026-11-20 |
| [#90](https://github.com/Freeloop993/paper/pull/90) | S2 题面 b 版；筛除一份评议答卷；按蓝图逐环清点主分支 | merged | `claude/s2-review-and-repo-analysis-20261120` | 2026-11-20 | 2026-11-20 |
| [#91](https://github.com/Freeloop993/paper/pull/91) | S5 第一步收齐；S2 评论核查结果；七条分支逐条核对 | merged | `claude/s5-final-and-s2-score-20261120` | 2026-11-20 | 2026-11-20 |
| [#92](https://github.com/Freeloop993/paper/pull/92) | A8 真人取点的页面；评论少算是否连累后面的步骤 | merged | `claude/a8-click-pages-20261120` | 2026-11-20 | 2026-11-20 |
| [#93](https://github.com/Freeloop993/paper/pull/93) | A8 两份真人取点回件的读法；S6 页面收回到登记范围 | merged | `claude/a8-returns-20261121` | 2026-11-20 | 2026-11-20 |
| [#94](https://github.com/Freeloop993/paper/pull/94) | 工作台 3.5.0 接上 Qwen；两条规则；五篇最接近的文献 | merged | `claude/rules-papers-workbench-20261121` | 2026-11-20 | 2026-11-21 |
| [#95](https://github.com/Freeloop993/paper/pull/95) | 工作台 3.6.0：起始值取自真实产品、自由提示并入画布；第 6 篇文献与 2.6 节 | merged | `claude/workbench-defaults-freeprompt-20261121` | 2026-11-21 | 2026-11-21 |
| [#96](https://github.com/Freeloop993/paper/pull/96) | 工作台 4.0：逐层搭建的决定链，AI 在每一步起草；RQ3 对照组改为 AI 对话加自由提示 | merged | `claude/workbench-redesign-20261122` | 2026-11-21 | 2026-11-22 |
| [#97](https://github.com/Freeloop993/paper/pull/97) | 工作台 4.1–4.3.1：Codex 评审与盲测、GPT 复测修正；对齐研究主线、按场次导出、出图断线取回且每轮只入队一次、计时与事件表、文字模型 MiniMax M3.1 | merged | `claude/workbench-review-20261122` | 2026-11-22 | 2026-11-23 |
