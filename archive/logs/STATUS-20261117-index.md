# 状态页 · 11 月 17 日的逐批实验索引（2026-11-25 移入）

这是 2026-11-25 改写以前 `STATUS.md` 的全文，只把相对链接改到现位置，其余原样。开头几段是 11 月 23—24 日的进展，后面是 11 月 17 日的逐批实验索引，表里的“待真人作答”“缺独立复测”等是当时的状态。现在做到哪，看[现状总表](../../STATUS.md)。

---

# 论文研究状态 · 11 月 17 日

**2026-11-24 工作台 4.4。** 作者试用 4.3.1 提的 11 条和 Codex 子代理列的预试前必改 4 条都已改好：登记以后由程序锁定 C2，任务卡、实际规格和导出一致；撤销只撤设计，事件和暂停时长不再被抹掉；重复登记开不出来，当前场次照常；两种方式开场看同一张任务卡；场次设置、研究记录和旧版归主持人面板。检查 23/23 通过；真实模型调用 0，真人场次 0；真机和真实文字模型还没验收。见 [4.4 复核记录](../../prototypes/drone-configurator/review/20261124-workbench-4.4/README.md)。

**2026-11-24 仓库整理。** 新增[阅读清单](../../READING-LIST.md)；分支上漏掉的正式证据已补回主分支，旧计划、旧交接和旧日志移入 [archive/](../../archive/README.md)，研究数据没有改，见[整理清单第八节](../planning/2026-11-18-cleanup-list.md#八2026-11-24-执行情况与剩余)。这里原有的 11 月 18—23 日每日进展，原样移到了 [archive/logs/STATUS-updates-20261118-20261123.md](../../archive/logs/STATUS-updates-20261118-20261123.md)；同一时期按论证链写的记录在[研究进度页](../../planning/research-panorama/progress-20261119.md)。

**11 月 23 日，再续。** GPT 复测 4.3 提了三条：入队回执丢了以后同一轮可能入队两次；远端已经收下、代理回 502 或回执正文断开时被记成失败；入队还没确认页面就写“已入队”。三条我在 4.3 上都复现了，工作台 4.3.1 修好：请求发出后没收到完整回执就不再重发，只按本轮编号在 ComfyUI 的队列和历史里找原作业并取回；只有明确拒收（4xx）和运行失败才记失败；页面按入队状态写“待确认入队”“还没发到出图服务”或“已入队”。新加的单元测试和浏览器走查在 4.3 上不过、在 4.3.1 上全过；真机仍等作者租 GPU。[4.3 复核记录第六节](../../prototypes/drone-configurator/review/20261123-workbench-4.3/README.md#六431gpt-复测三条)

**11 月 18 日工作台交接。** [当前研究进度与已核运行记录](../../planning/workbench-handoff/context/README.md) · [源代码、文献和第二台电脑验收](../../planning/workbench-handoff/README.md)。下表为前一阶段的研究基线。

面向复核的实验索引。每行单独说明材料、样本和可回答的问题。相同原图在回收、读数和评议阶段多次出现；跨行相加会重复计数。[导师阅读稿与正文范围](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/manuscript/thesis/review/handoff-20261117/README.md)

| 研究环节 | 已取得的材料 | 解释或待验证项 |
| --- | --- | --- |
| 评论与需求 | 7,443 个检索文本簇中，1,318 个所属商品标题含航拍机标签；其中 228 个保留造型表述。已有 40 条第二编码。新共词表使用 1,318 簇；另有 150 条分层抽样人工核查题面。 | 150 条待真人作答；图词频不能给出造型参数权重。[新图及核查方法](../../evidence/20261117-research-update/comments/README.md) · [第二编码原登记](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/experiments/semantic40-pairing/README.md) |
| E0、E1 布局控制 | **11 月 19 日退役：图不合格，E1 原图已移除，只留读数，不作为本文方法的结果。** 四旋 E1 开源共 36 张；条件图的 W/L、d/D 按原容差各 12/12，纯文字各 0/6、4/6。 | 限双叶部件图及相应控制分支。E0 闭源六张按作者决定从正式比较剔除。[E1 原批](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/e1-open-20261112/README.md) · [范围决定](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/planning/2026-11-17-direction-and-todo.md) |
| E3 设计实践 | 首轮 A/B/C 共 9 张，后有第二、三轮及作者取舍。第三轮 B2 获选，深化采用去上端深窗、下端为机头的方向。 | 区分原始候选、人工作图与色材调整；开发结果不能替代效率比较。[首轮](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115/README.md) · [第二轮](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115/round-2/README.md) · [第三轮](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/e3-quad-qwen-20261115/round-3/README.md) · [深化稿](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/experiments/e3-deepening/README.md) |
| 局部编辑 | 旧 E2 六张作历史资料；E2R 六张有真人独立答卷和 AI 判读。B2 修订 12 张另有两次匿名 AI 判读。第一版三组局部编辑各三张，均未过开发门。 | 分报目标改变及非目标保持。第二版 73 份为离线请求，17 份开发、56 份有条件确认。本索引未取得其生成回执。[E2R 与部位量测](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/e2r-hub-readback/README.md) · [B2](https://github.com/Freeloop993/paper/blob/e96d41946ea84237da506bb76c2f713a3f3b9275/evidence/gpu-day-20261115/dual-hexa-handoff/blind-b2/README.md) · [第一版](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261115-review-takeover/local-edit/README.md) · [第二版登记](https://github.com/Freeloop993/paper/blob/ca4b5349dbfdda162357e0c676c085345bd46b60/experiments/20261117-local-edit-v2/README.md) |
| 正式造型与字典 | v1.2 正式 24 张、v1.6 平行 24 张有原图与匿名读数；另有组合 24、S12 扩展 48、S16 扩展 24，共 96 张经两次 AI 盲读。 | 按字典、批次、种子和读数来源分开；同一图的复读不增加图数。表中的 96 张包含在末批 102 张回收件中。[正式与平行批](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261115-review-takeover/README.md) · [96 张读数](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261117-offline-review/README.md) · [102 张回收件](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/experiments/gpu-day-20261115/recovered-originals-102/README.md) |
| 真人评议 | 配对评图 3 份、逐图读图 3 份；另有结构观察 12 图的完整答卷 3 份，其中 2 份自报事前未接触条件。 | 各题独立计数。醒目度是原配色题的目标；两项任务的答卷不能相加推断不同人数。顶盖判读仍有分歧。[逐图评价](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/e5-individual-reviewed/README.md) · [结构观察](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261117-offline-review/design-review/README.md) |
| 农业植保六旋与材质开发 | 39 张更正后六旋输出，主比较 12 张与扩展 24 张有一次独立 AI 布局复测；两种喷洒部件改法及碳纹臂各 3 张另作开发，有知条件初读。 | 六旋仅作可行性探测。某喷头在俯视可辨不足以推断喷洒性能；碳纹开发未确认整组通过。[六旋与开发读数](https://github.com/Freeloop993/paper/blob/b3b6fca0dfa1ebcf8f0a249c311330d8d2aae9d0/evidence/20261117-offline-review/README.md) |
| 工程比例、真实产品与协同对照 | A1 官方资料、A2 手册图面和 A3 生成图读数的分母各异。E4 已有任务卡与计时约定；3 位外部设计者各两场及 10 人独立评议均为招募目标。 | 优先复用坐标、校准读数，冻结实际设计流程的比例任务后再确认。作者双条件实做之后才进入三人正式场次。[本轮数据](../../evidence/20261117-research-update/README.md) · [作者预试](../../evidence/20261117-research-update/method/paired-pilot.md) |

历史试跑、费用和旧签署节点保留在[整理前的状态页](https://github.com/Freeloop993/paper/blob/6b22143c39f7bc0969b616f43704cb4d24a20310/STATUS.md)。工作流的模拟测试、图像回收和独立真人结果按各自凭据登记。
