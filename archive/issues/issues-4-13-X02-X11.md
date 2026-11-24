# 工单 #4—#13 存档：X02—X11（11 月 12 日已关闭）

存档：2026-11-24。本文件逐字保存正文与全部评论，按时间排序，供追溯。每条评论标注发布者账号、时间与原链接；评论正文中的“Claude：”“Codex：”等前缀表示实际撰写者。账号 Freeloop993 由作者和两位助手共用，账号名不等于撰写者。正文里写成从仓库根目录出发的相对链接，已改成从本目录出发（前面加 `../../`），其余逐字未改。这 10 个工单是 11 月 9—10 日派给 Codex 的离线任务，11 月 12 日关闭；11 月 18 日存档其余工单时没有收进来，这次补上。

---

## 工单 #4：[Codex · X02] S1 失败分解：尺度／平移／残差与 T/L/F 路线差异（离线）
原址：https://github.com/Freeloop993/paper/issues/4　建立：2026-11-09T14:17:57Z　状态：CLOSED　关闭：2026-11-12T08:22:02Z　评论数：3

### 正文
*Freeloop993 · 2026-11-09T14:17:57Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `71fc542`。

完整任务卡：[codex-batch-01.md#X02](https://github.com/Freeloop993/paper/blob/71fc542/docs/tasks/codex-batch-01.md#x02s1-失败分解离线复算)；依据 [G2 规格第1节](https://github.com/Freeloop993/paper/blob/71fc542/docs/protocols/G2-axis-control-spec.md)。

- [ ] 两次读数分别做相似变换分解（质心、尺度 s、残差、纵横比），逐图／路线／种子块
- [ ] T/L/F 实际请求逐节点差异表，回答“L/F 有没有 ControlNet”
- [ ] 原件可得时对旧主 18 图做同样分解
- [ ] 交 `evidence/s1-decomposition/`，README 首段写明事后探索、不改判 S1

费用：0 次调用。截止 11/10。下一接手：Claude（写 5.2.3）。

### 评论 1
*Freeloop993 · 2026-11-09T14:33:02Z · [原链接](https://github.com/Freeloop993/paper/issues/4#issuecomment-6742638998)*

Codex 接手 X02，依据 main `71fc542` 和 S1 两份封存读数，将核对真实请求、分解尺度与位置，旧18单列。同步负责本批其余离线准备，均不发模型请求。

### 评论 2
*Freeloop993 · 2026-11-09T14:45:44Z · [原链接](https://github.com/Freeloop993/paper/issues/4#issuecomment-6742926591)*

Codex 交付 [实测与复算](https://github.com/Freeloop993/paper/tree/06ef2c32cfb784d6abf9ff7036e662406332f98a/evidence/s1-decomposition)。6 图×2 次既有 AI，逐一核实际 request 与 success history；旧主18图×2 读者另列。尺度 1.190—1.358，尺度项占每图总平方误差 71.5%—99.3%。初测/复测原门都是 0/6；单独纵横容差是 5/6、4/6，B2-F 跨界。未新增调用或人评。已核规格中的 ControlNet 更正；请 Claude 依逐图数值写 5.2.3，工单留待复核。

### 评论 3
*Freeloop993 · 2026-11-12T08:22:00Z · [原链接](https://github.com/Freeloop993/paper/issues/4#issuecomment-6818544419)*

S1六图分解和节点核对已交付，两次 AI 读数的原坐标门均为0/6。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/evidence/s1-decomposition)


---

## 工单 #5：[Codex · X03] G2 控制路线可行性与冻结包（离线）
原址：https://github.com/Freeloop993/paper/issues/5　建立：2026-11-09T14:18:47Z　状态：CLOSED　关闭：2026-11-12T08:22:04Z　评论数：4

### 正文
*Freeloop993 · 2026-11-09T14:18:47Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `71fc542`。

任务卡：[codex-batch-01.md#X03](https://github.com/Freeloop993/paper/blob/71fc542/docs/tasks/codex-batch-01.md)；规格：[G2-axis-control-spec.md](https://github.com/Freeloop993/paper/blob/71fc542/docs/protocols/G2-axis-control-spec.md)。

- [ ] 核 Qwen-Image 2.1 Fun ControlNet Union 模型卡、许可证、SHA256、ComfyUI 兼容、节点、显存（许可证不明即停并报告）
- [ ] 3 档控制图（只画桨盘圆与轴心十字，无机身无机臂；r_t 用 STATUS 既定值）及字节摘要
- [ ] 6 份离线请求（3 档×2 新种子）
- [ ] 量测模板与脚本（主：r_o、单调性、|r_o−r_t|；次：尺度、质心、残差、原 S1 门）
- [ ] 费用上限估计；G2 规格第6节字段全部实填

费用：0 次调用，**未经 #3 授权不提交**。截止 11/11。下一接手：作者（D6 授权）。

### 评论 1
*Freeloop993 · 2026-11-09T14:45:45Z · [原链接](https://github.com/Freeloop993/paper/issues/5#issuecomment-6742927085)*

Codex 交付 [G2 六份请求、三档控制图、真实模型与硬件记录及评分器](https://github.com/Freeloop993/paper/tree/06ef2c32cfb784d6abf9ff7036e662406332f98a/experiments/g2-control)。官方许可 qwen-research，Comfy 原固定文件 SHA 与实测四权重表吻合；同一 ComfyUI 0.39.0 的 L/F 实际跑通过。新方案只画桨盘、轴位，0.85/1/1.15 × 两新种子，未执行。事后不能归因到单项；旧 S1 和新种子不能称同种子对照。桨盘半径69 px为承接旧主实验的候选选择。历史价条件测算见 README；等 #3 全类上限、临开机前实价及观测，无当期消费。

### 评论 2
*Freeloop993 · 2026-11-09T15:03:55Z · [原链接](https://github.com/Freeloop993/paper/issues/5#issuecomment-6743338287)*

Codex 已按作者在 #3 的新授权开始 G2。6 个既定请求与 3 张输入的字节已复核，一次性运行包 SHA-256 为 c6601daf1ed57e6539506859ca92007168068f8e9f1521ca003a3b9e54afea2f。原实例列表共 1 台，启动前关机，迁移时实见 2.04 元/小时、系统盘 0.00 元/小时。102 分钟从启动操作前保守起算；实际输出与结算另回本工单。

### 评论 3
*Freeloop993 · 2026-11-09T15:21:58Z · [原链接](https://github.com/Freeloop993/paper/issues/5#issuecomment-6743766725)*

G2 实机完成。[六张未修改 PNG、两份封存盲读、逐图评分、真实请求与已入账费用](https://github.com/Freeloop993/paper/tree/7773f2b4f430ecaf0b6aa280aa2c38a72fce6e9c/evidence/g2-six) 已提交 `7773f2b`。6/6 受理及完成，6 种不同原始像素，采样缓存命中 0，重试 0。两位独立 AI 各判四轴可量测图 0/6，各有 24/24 个位置不可辨；画面保留的是引导十字和细圆，读者找不到可定位的电机结构。已触发规格第 5 节“≥2图四轴不可辨”的失败判据；r_o、单调性和绝对误差均无可量测值。人工复测待作者。平台已关机，容器账期 23:05:13—23:17:22，0.41 元。

### 评论 4
*Freeloop993 · 2026-11-12T08:22:03Z · [原链接](https://github.com/Freeloop993/paper/issues/5#issuecomment-6818545361)*

G2实跑6张，两位AI各判四个轴心可定位的图为0/6，未能估计跨度响应。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/evidence/g2-six)


---

## 工单 #6：[Codex · X04] G3 后端参考能力小测准备（离线）
原址：https://github.com/Freeloop993/paper/issues/6　建立：2026-11-09T14:19:04Z　状态：CLOSED　关闭：2026-11-12T08:22:08Z　评论数：6

### 正文
*Freeloop993 · 2026-11-09T14:19:04Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `71fc542`。任务卡：[codex-batch-01.md#X04](https://github.com/Freeloop993/paper/blob/71fc542/docs/tasks/codex-batch-01.md)。

问题：父图接 `TextEncodeQwenImage21` 的 `images.image_1`，修订稿是否真的保留父图结构与风格？

- [ ] ≤2 次调用的判别设计：同父图同文字，有参考 vs 无参考，同种子
- [ ] 出图前写定判据（主要分件与轮廓是否保持；人工与 AI 各读一次）
- [ ] 离线请求与判读表，交 `experiments/g3-reference/`

费用：0 次调用，未授权不提交。截止 11/12。若参考无效，D/S 两组均只允许纯文字修订。

### 评论 1
*Freeloop993 · 2026-11-09T14:45:47Z · [原链接](https://github.com/Freeloop993/paper/issues/6#issuecomment-6742927682)*

Codex 交付 [G3 两份离线请求、判读表和事先判据](https://github.com/Freeloop993/paper/tree/06ef2c32cfb784d6abf9ff7036e662406332f98a/experiments/g3-reference)。同一张已核 S1 原图、同一修改意图与种子；图输入、VAE 连接与输出名以外科学设置逐项同等。用同顶视避免混入视角改动；两名不同角色各独立判读。未测后端、未新增生成。若资料不足或无信号，D/S 同样降为纯文字。

### 评论 2
*Freeloop993 · 2026-11-09T15:36:05Z · [原链接](https://github.com/Freeloop993/paper/issues/6#issuecomment-6744103993)*

G3 实机前已用实际父图复核两份请求。父图 S1-B1-T 为 1024²，两份输入同顶视、同修改句、种子 2026111101、40 步。只有参考分支接入 LoadImage 与 VAE（另有输出名差异），其余采样输入逐字段相等。与上一批同版本的 nodes_qwen.py（SHA-256 54ce02aa9e167c0b497ce026ac6b558f539427d2d1ed4fc1fcc2ec8e6bc529da）会在有参考图时编码其潜变量并加入正负条件。图像效果仍待实测。任务检验能否保留父图的机身轮廓、上盖分件和臂根，同时改动前摄过渡；一次配对仅支持这张父图和这个种子。供 D6 单独裁定的建议为 2 次、付费窗口至多 54 分钟、全项不超过 4 元（按上次 2.04 元/小时计算容器最多约 1.84 元，余量覆盖附加费与缓冲，启动前复核实价）。当前未开机。

### 评论 3
*Freeloop993 · 2026-11-09T15:37:46Z · [原链接](https://github.com/Freeloop993/paper/issues/6#issuecomment-6744146147)*

**Claude（统筹）：G3 升为前置，进入运行准备**

作者已选 D1 方案 B（Qwen＋参考图，可省略 LoRA），参考图是否真正生效因此成为后续风格稳定与 D/S 公平性的前提。请按 [codex-batch-02.md 的 X04 补充](https://github.com/Freeloop993/paper/blob/411c2dd/docs/tasks/codex-batch-02.md)：

- [ ] 核对已备 2 次请求的冻结项（父图、修订文字、种子、出图前判据）
- [ ] 评估能否与 G2b（#9）同一次开机执行
- [ ] 在本 issue 回执，待作者在 #3 批准后再提交

### 评论 4
*Freeloop993 · 2026-11-09T16:11:05Z · [原链接](https://github.com/Freeloop993/paper/issues/6#issuecomment-6744935340)*

G3 两次实际生成已交。[原图、随机编号和独立 AI 判读](https://github.com/Freeloop993/paper/tree/b77b2f4556fb0724f69328adb91e4f61ad9b2b8e/evidence/g3-actual)。同一父图、同一修订句、种子和采样设置，AI 判带父图保持 3/3、纯文字 0/3；两图均非逐像素复制，前摄与机壳平顺融合的指定改动均不可辨。作者可分发独立真人盲评包。当前只观察到这张父图、这个种子下的结构保持信号，正式 D/S 开放参考修订的完整条件仍未满足。

### 评论 5
*Freeloop993 · 2026-11-10T08:59:25Z · [原链接](https://github.com/Freeloop993/paper/issues/6#issuecomment-6763254154)*

G3 真人来源已核，作者确认一名非作者填写，填写前未看条件标签或 AI 结论。两份匿名图均成功对应。共同判读后，带父图在人评中为两项保持、一项不可判，纯文字三项改变；真人两图均选修改可辨，AI 均选不可辨。按冻结规则记录证据不足。已在 [G3 结果](https://github.com/Freeloop993/paper/tree/1f5c8e3/evidence/g3-actual) 追加脱敏选项、反馈释义和复算。

### 评论 6
*Freeloop993 · 2026-11-12T08:22:06Z · [原链接](https://github.com/Freeloop993/paper/issues/6#issuecomment-6818546503)*

G3两图及一位独立真人读数已留档，目标改动与保持的联合证据不足。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/evidence/g3-actual)


---

## 工单 #7：[Codex · X05] 四/六旋共同对照离线编译（待 G2 选路线）
原址：https://github.com/Freeloop993/paper/issues/7　建立：2026-11-09T14:19:26Z　状态：CLOSED　关闭：2026-11-12T08:22:11Z　评论数：4

### 正文
*Freeloop993 · 2026-11-09T14:19:26Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `71fc542`。任务卡：[codex-batch-01.md#X05](https://github.com/Freeloop993/paper/blob/71fc542/docs/tasks/codex-batch-01.md)。

- [ ] 2 拓扑×3 档×2 种子＝12 份请求生成器；四旋 X、六旋正六边形；同意图、顶视、归一化尺度、同模型
- [ ] 控制图规则同 G2（只画桨盘与轴心）；控制路线参数待 G2 冻结后填入
- [ ] 种子登记表；D4 风格特征读数模板
- [ ] 四/六旋除拓扑外设置逐项相同的检查脚本

交 `experiments/common-control/`。费用：0 次调用。截止 11/12。依赖：#3 D2—D4。

### 评论 1
*Freeloop993 · 2026-11-09T14:45:48Z · [原链接](https://github.com/Freeloop993/paper/issues/7#issuecomment-6742928165)*

Codex 交付 [四/六旋 12 请求候选及逐对检查](https://github.com/Freeloop993/paper/tree/06ef2c32cfb784d6abf9ff7036e662406332f98a/experiments/common-control)。两拓扑×三档×两共享种子，6 对请求消去拓扑相关字段后逐项相同。拓扑分别按基准跨度归一；D4 模板保留分件/臂根/载荷三个维度。真实输出 0；待 G2 及 D2—D4/D6，不可写迁移或风格稳定结论。

### 评论 2
*Freeloop993 · 2026-11-09T15:36:04Z · [原链接](https://github.com/Freeloop993/paper/issues/7#issuecomment-6744103449)*

更新 X05 的前置结果。G2 六图已交，两位独立 AI 各判 0/6 张具备可定位的四个轴心，已触发规格第 5 节的可读性失败条件。当前 12 份共同对照请求仍是候选输入。沿用这版线稿批量运行缺少量测前提。保留六旋案例本身和旧四图证据，待作者安排的真人复测或后续独立方案提供新增证据，再评估共同对照的范围。[G2 原始数据](https://github.com/Freeloop993/paper/tree/7773f2b4f430ecaf0b6aa280aa2c38a72fce6e9c/evidence/g2-six)

### 评论 3
*Freeloop993 · 2026-11-09T16:11:08Z · [原链接](https://github.com/Freeloop993/paper/issues/7#issuecomment-6744936588)*

G2b 已完成，可用配置 0/4；G2c 按规则未进入，正式四/六旋共同对照继续暂停。[筛选证据](https://github.com/Freeloop993/paper/tree/b77b2f4556fb0724f69328adb91e4f61ad9b2b8e/evidence/g2b-actual)。六旋现有案例数据与这个共同对照独立。

### 评论 4
*Freeloop993 · 2026-11-12T08:22:10Z · [原链接](https://github.com/Freeloop993/paper/issues/7#issuecomment-6818547755)*

旧共同对照仅编译12份候选请求，实际生成0，原任务按地基退役。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/experiments/common-control)


---

## 工单 #8：[Codex · X06] 人工转轴复测工具与 S1 匿名材料（零成本）
原址：https://github.com/Freeloop993/paper/issues/8　建立：2026-11-09T14:19:45Z　状态：CLOSED　关闭：2026-11-12T08:22:13Z　评论数：2

### 正文
*Freeloop993 · 2026-11-09T14:19:45Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `71fc542`。任务卡：[codex-batch-01.md#X06](https://github.com/Freeloop993/paper/blob/71fc542/docs/tasks/codex-batch-01.md)。

- [ ] 本地网页标注工具：匿名原图点 4 轴心（可放大），整数像素保存，记标注者、用时、不可判、机头朝向
- [ ] S1 六图匿名随机编号材料包（无可识别文件名或元数据，逐张核像素字节）
- [ ] 人工 vs 两次 AI 比对脚本，含人工读数下 0/6 是否成立

交 `experiments/hub-annotator/` 与 `evidence/s1-axis-repeat/human-pack/`。人工复测者由作者安排，助手不代填。截止 11/11。

### 评论 1
*Freeloop993 · 2026-11-09T14:45:50Z · [原链接](https://github.com/Freeloop993/paper/issues/8#issuecomment-6742928667)*

Codex 交付 [人工标注工具及比对脚本](https://github.com/Freeloop993/paper/tree/06ef2c32cfb784d6abf9ff7036e662406332f98a/experiments/hub-annotator)和[仅给评者的匿名目录](https://github.com/Freeloop993/paper/tree/06ef2c32cfb784d6abf9ff7036e662406332f98a/evidence/s1-axis-repeat/human-pack)。6 张去元数据 PNG 与原图 RGB 逐字节相同。Edge 本地已实走放大后已知像素映射、撤销、不可判、下载六图 JSON；全缺失不判 0/6，已知坐标的合成软件检查与首次距离为 0。没有真人数据；待作者安排 1—2 位未看目标/既有读数的人，另机包已准备但未冒称另机验收。

### 评论 2
*Freeloop993 · 2026-11-12T08:22:12Z · [原链接](https://github.com/Freeloop993/paper/issues/8#issuecomment-6818548698)*

六图匿名量测工具及离线像素检查已交付；该工单没有收到独立真人轴心读数。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/experiments/hub-annotator)


---

## 工单 #9：[Codex · X07] 调取历史控制图（旧 C1、S1 L/F）并备 G2b 筛选包（离线）
原址：https://github.com/Freeloop993/paper/issues/9　建立：2026-11-09T15:37:05Z　状态：CLOSED　关闭：2026-11-12T08:22:20Z　评论数：4

### 正文
*Freeloop993 · 2026-11-09T15:37:05Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `411c2dd`。

任务卡：[codex-batch-02.md#X07](https://github.com/Freeloop993/paper/blob/411c2dd/docs/tasks/codex-batch-02.md)；规格：[G2b-structure-screen-spec.md](https://github.com/Freeloop993/paper/blob/411c2dd/docs/protocols/G2b-structure-screen-spec.md)。

背景：G2 在强度 1.0、只画圆和十字时，模型把标记照抄成平面图形，24/24 轴位不可辨。旧 C1（强度 0.7，控制图疑含机壳）几乎命中。下一步要判断“画出结构”的骨架图能否既定位轴心又保留机身。

- [ ] 调取旧主实验 C1 控制图与执行图、S1 的 L-guide/F-guide；报告控制器型号与摘要、预处理、强度与区间、控制图内容（机壳／臂线／桨盘）
- [ ] G2b 骨架图（桨盘圆＋实心轴心点＋细臂中线，中心留空）及 a—d 四配置离线请求，种子 2026111101，r=1.00
- [ ] 四项筛选判据读数模板；G2 读数补“标记照抄”类别
- [ ] 交 `evidence/historic-guides/`、`experiments/g2b-screen/`

费用：0 次调用；提交须作者在 #3 批准。G2 维持失败，不改判。

### 评论 1
*Freeloop993 · 2026-11-09T15:39:36Z · [原链接](https://github.com/Freeloop993/paper/issues/9#issuecomment-6744191387)*

**更正种子：** G2b 筛选种子改为 **2026111104**（2026111101 已被 G3 登记使用）。规格与任务卡已同步：[1c4a4cc](https://github.com/Freeloop993/paper/commit/1c4a4cc)、[3f299d4](https://github.com/Freeloop993/paper/commit/3f299d4)。正文中的 2026111101 以此为准。

### 评论 2
*Freeloop993 · 2026-11-09T15:54:09Z · [原链接](https://github.com/Freeloop993/paper/issues/9#issuecomment-6744536137)*

X07 原件出现实质纠正：旧 C1 的 9 个真实 request 与 success history 已逐字段对齐，三个输入 PNG 与原始输入清单逐字节对齐。控制图显示桨叶、轴位和指向中央的臂段，中央留白；三个旧 C1 PNG 都没有闭合机壳轮廓，也没有画桨盘圆。数字机壳目标仍在文字及臂段内端位置中。两种子下 S1-F 才是四点加八边形闭合轮廓，S1-L 是四点。C1 与 S1 L/F 都是原 BF16 Fun Union 和 0.4/0.8 Canny，C1 强度 0.7、S1 为 0.35，全程。请据此修订 G2b 的旧证据解释。将按新种子 2026111104 执行冻结的四配置筛选。

### 评论 3
*Freeloop993 · 2026-11-09T16:11:04Z · [原链接](https://github.com/Freeloop993/paper/issues/9#issuecomment-6744934825)*

X07 实验与离线交付已回读到 main。[真实四图及判读](https://github.com/Freeloop993/paper/tree/b77b2f4556fb0724f69328adb91e4f61ad9b2b8e/evidence/g2b-actual)，[13 份旧执行图和原指引](https://github.com/Freeloop993/paper/tree/b77b2f4556fb0724f69328adb91e4f61ad9b2b8e/evidence/historic-guides)。四种候选各 1 张、同种子，判读者各自均未定位出 16 个实体轴心中的任何一个，四图均有标记照抄，0/4 可用。c、d 有短臂连机身，未延至可定位的实体电机。与 G3 合用实例的 0.32 元只计一次。

### 评论 4
*Freeloop993 · 2026-11-12T08:22:19Z · [原链接](https://github.com/Freeloop993/paper/issues/9#issuecomment-6818550994)*

G2b四种配置实跑四图，两位AI均判0/4可用。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/evidence/g2b-actual)


---

## 工单 #10：[Codex · X08] G2c 确认包：G2b 选中配置×3 档×新种子（依赖 X07/G2b）
原址：https://github.com/Freeloop993/paper/issues/10　建立：2026-11-09T15:37:25Z　状态：CLOSED　关闭：2026-11-12T08:22:24Z　评论数：3

### 正文
*Freeloop993 · 2026-11-09T15:37:25Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `411c2dd`。任务卡：[codex-batch-02.md#X08](https://github.com/Freeloop993/paper/blob/411c2dd/docs/tasks/codex-batch-02.md)。依赖：#9 X07 与 G2b 筛选结果。

- [ ] G2b 有可用配置时：3 档（0.85/1.00/1.15）×新种子 2026111102、2026111103＝6 份离线请求
- [ ] 量测沿用 G2，加记“标记照抄”“机身连续”
- [ ] G2b 无可用配置时不编译，回执写明停止，RQ2 按失效边界写
- [ ] 共同对照 #7 暂停，待 G2c 定路线

费用：0 次调用；提交须作者在 #3 批准。

### 评论 1
*Freeloop993 · 2026-11-09T16:08:55Z · [原链接](https://github.com/Freeloop993/paper/issues/10#issuecomment-6744883556)*

条件已判定。G2b 四项配置全部实际出图，两个隔离读者各自把四张都判为出现平面标记照抄、16/16 个电机轴心不可定位。可用配置 0/4，selected=null。按 X08 停止项，G2c 未编译、提交 0；四/六旋共同对照 #7 仍不执行。随后提交原件与独立读数并回填提交号。

### 评论 2
*Freeloop993 · 2026-11-09T16:11:07Z · [原链接](https://github.com/Freeloop993/paper/issues/10#issuecomment-6744935894)*

X08 停止回执见 [逐图判定和原始读数](https://github.com/Freeloop993/paper/tree/b77b2f4556fb0724f69328adb91e4f61ad9b2b8e/evidence/g2b-actual)。没有可用配置，未编译或执行 G2c；请按四项筛选规则写明此条件分支。

### 评论 3
*Freeloop993 · 2026-11-12T08:22:22Z · [原链接](https://github.com/Freeloop993/paper/issues/10#issuecomment-6818552412)*

G2b筛选未过，G2c未触发，实际提交0。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/evidence/g2b-actual)


---

## 工单 #11：[Codex · X09] G2d：照搬旧 C1 部件语汇的控制图（最后一批，6 次）
原址：https://github.com/Freeloop993/paper/issues/11　建立：2026-11-10T08:37:31Z　状态：CLOSED　关闭：2026-11-12T08:22:27Z　评论数：4

### 正文
*Freeloop993 · 2026-11-10T08:37:31Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `e8c94d1`。任务卡：[codex-batch-03.md#X09](https://github.com/Freeloop993/paper/blob/e8c94d1/docs/tasks/codex-batch-03.md)；规格：[G2d-G3b-spec.md 第一部分](https://github.com/Freeloop993/paper/blob/e8c94d1/docs/protocols/G2d-G3b-spec.md)。

**作者 11/10 决定**（经 Claude 转达）：G2d 作为公开的规则例外运行，且为参数可控路线的最后一批。请作者在 #3 写明费用上限后提交。

- [ ] 从旧 C1 控制图测出双叶桨几何、轴心小圈半径、臂段宽度、中间档臂段长度，写入 README
- [ ] 三档（0.85/1.00/1.15）控制图：桨形＋小圈＋固定长度臂段，中央留白，无机身无遮罩
- [ ] 管线照搬 C1：Canny 0.4/0.8、Fun Union BF16、强度 0.7、0—1；B02 简报，不写机壳比例；种子 2026111105、2026111106
- [ ] 读数模板：主判据同 G2；附记机身连续、标记照抄、三档机身是否各异、质心/尺度/残差
- [ ] 获批后运行，交 `evidence/g2d-actual/`

**无论结果如何不再开新批。**

### 评论 1
*Freeloop993 · 2026-11-10T08:41:30Z · [原链接](https://github.com/Freeloop993/paper/issues/11#issuecomment-6762922611)*

Codex 接手批次 03 的 X09、X10 离线准备，输入 main e8c94d1。先以旧 C1 中间档原 PNG 和生成几何互校，再锁定三档部件图；G3b 回核冻结后端的 VAEEncode 与 KSampler 输入通路。#3 上批额度限定批次 02，本批实机上限待记录。

### 评论 2
*Freeloop993 · 2026-11-10T08:47:56Z · [原链接](https://github.com/Freeloop993/paper/issues/11#issuecomment-6763047054)*

X09 离线交付。[三档控制图、六份请求与判读表](https://github.com/Freeloop993/paper/tree/fce67b675a58af9853caf93a17331bf00496a9a2/experiments/g2d)。从旧 C1 中档 PNG 实测四臂轴线至内端 168.291/169.706/168.291/169.706 px，取 168.999 px 固定。桨半径 68.957 px、轴圈外半径 10 px、臂宽 12 px。新中档四个半径 72 px 圆区与旧图逐像素相等。全套请求已验包，模型提交 0；作为停止规则外最后一批，等 #3 确定本批费用。

### 评论 3
*Freeloop993 · 2026-11-10T09:08:26Z · [原链接](https://github.com/Freeloop993/paper/issues/11#issuecomment-6763424250)*

作者已明确放行最终六次，原实例、全项 ≤4 元、累计付费 ≤54 分钟。北京时间 17:03 原实例启动返回 226604（当前资源不足），17:06 同机复查后仍在关机状态。17:08 相同华北一C、4090 24GB×1、14C/64GB 档在控制台标示“暂无资源”、单价 2.04 元/小时。当前实际模型提交 0；库存阻塞单独记录，G2d 科学结果待实机。

### 评论 4
*Freeloop993 · 2026-11-12T08:22:26Z · [原链接](https://github.com/Freeloop993/paper/issues/11#issuecomment-6818553658)*

G2d离线编译6份，资源不足，实际模型提交0，不能据此判生成成败。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/experiments/g2d)


---

## 工单 #12：[Codex · X10] G3b：参考图修订能否既保持又能改（≤4 次，先离线）
原址：https://github.com/Freeloop993/paper/issues/12　建立：2026-11-10T08:37:50Z　状态：CLOSED　关闭：2026-11-12T08:22:30Z　评论数：4

### 正文
*Freeloop993 · 2026-11-10T08:37:50Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `e8c94d1`。任务卡：[codex-batch-03.md#X10](https://github.com/Freeloop993/paper/blob/e8c94d1/docs/tasks/codex-batch-03.md)；规格：[G2d-G3b-spec.md 第二部分](https://github.com/Freeloop993/paper/blob/e8c94d1/docs/protocols/G2d-G3b-spec.md)。

背景：G3 带父图保持 3/3、纯文字 0/3，但两张都看不出“前摄与机鼻融合”的修改——保得住、改不动。

- [ ] 核实工作流能否以父图编码为起始潜变量（VAEEncode→KSampler，去噪<1）；不能则报告，不换模型
- [ ] 编译 i 参考＋结构化指令／ii 参考＋去噪0.8／iii 参考＋去噪0.65／iv 无参考＋去噪0.8；父图 S1-B1-T，种子 2026111101
- [ ] 判读表：三项保持＋修改可辨；“可用”＝保持≥2/3 且修改可辨，出图前冻结
- [ ] 交 `experiments/g3b/`；作者在 #3 批准后运行，可与 G2d 同次开机

### 评论 1
*Freeloop993 · 2026-11-10T08:47:58Z · [原链接](https://github.com/Freeloop993/paper/issues/12#issuecomment-6763047735)*

X10 离线交付。[四配置、参考图摘要、冻结判据与原后端接口核验器](https://github.com/Freeloop993/paper/tree/fce67b675a58af9853caf93a17331bf00496a9a2/experiments/g3b)。ii/iii/iv 以父图经 VAEEncode 输出作为采样器初始潜变量；ii/iv 仅图像参考条件与输出名有差异。核验运行锁定源码中两个原节点的包装方法，VAE 与采样函数使用测试替身。本机缺 comfy_aimdo，尚无这条起始潜变量通路的带权重执行或真人结果。提交 0，X11 依赖实际判读。

### 评论 2
*Freeloop993 · 2026-11-10T08:59:27Z · [原链接](https://github.com/Freeloop993/paper/issues/12#issuecomment-6763254706)*

根据 G3 唯一真人独立盲评暴露的题目歧义，已在出图前改好 G3b 的[读者问题与数据栏](https://github.com/Freeloop993/paper/tree/1f5c8e3/experiments/g3b/README.md)。先自由记录哪些部位产生可见变化，再独立判断壳面是否连续收向嵌入机鼻的前摄并注明依据。评分仍按至少两项保持且目标修改可辨；G3 原始题目和原始选择均保留。G3b 仍为离线阶段。

### 评论 3
*Freeloop993 · 2026-11-10T11:21:49Z · [原链接](https://github.com/Freeloop993/paper/issues/12#issuecomment-6766013481)*

**Claude：G3b 出图前追加项（离线、0 调用，不运行）**

输入版本 `b59ebb1`。修订建议全文在分支 `claude/c01-review-1110` 的 `docs/protocols/G3b-amendment-orientation.md`（尚未合入 main，待作者确认）。

**问题。** 父图 S1-B1-T 画面上端已有一组深色相机样部件（S1 复测读为机头朝上，初测未知）。G3 带父图改稿是在下端新增了一个镜头，上端原件未变。四份 G3b 请求都只写 front camera / nose，没有指明哪一端是机头。若模型再次在另一端加相机，现表的目标题可能对着新增相机判“可辨”，得到的“可用”配置并不能完成任务 A 要的修改。这是我的非盲看图描述，不计入读者分母，不改 G3 的任何读数或结论。

**请 Codex 做（R1，现在就可做）：** 在 `experiments/g3b/reading.csv` 和 README 的观察题之后、目标题之前加两题：① 改稿中相机类部件各在画面哪一端（上／下／两端都有／看不清），相对父图是新增、原位修改还是未变；② 父图上端原有深色部件是保持、被修改还是消失。目标题“可辨”增加条件：改动发生在父图原有的前部部件上，或原有部件被合理替换且全图只有一处前摄；仅在另一端新增相机记“不可辨”并注明“新增部件”。“可用”定义不变。标明版本与生效时间（出图前）。

**等作者回复后再做：** R2 作者指定这张父图的机头端（助手不代定）；R3（可选）若作者采纳，只重编 G3b-i 一份请求加朝向句，ii—iv 字节不变；R4 在 G3 README 追加一句原件描述（可见变化位于下端新增镜头部件，上端原件未变，来自非盲看图）。

G3b 仍未获批运行。

### 评论 4
*Freeloop993 · 2026-11-12T08:22:29Z · [原链接](https://github.com/Freeloop993/paper/issues/12#issuecomment-6818554693)*

G3b仅编译4份候选，实际提交0，修订能力改由E2验证。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/experiments/g3b)


---

## 工单 #13：[Codex · X11] 改稿台修订机制更新（依赖 X10/G3b 结果，离线）
原址：https://github.com/Freeloop993/paper/issues/13　建立：2026-11-10T08:38:05Z　状态：CLOSED　关闭：2026-11-12T08:22:33Z　评论数：1

### 正文
*Freeloop993 · 2026-11-10T08:38:05Z*

责任角色：Codex。派发：Claude（C01 统筹）。输入版本 `e8c94d1`。任务卡：[codex-batch-03.md#X11](https://github.com/Freeloop993/paper/blob/e8c94d1/docs/tasks/codex-batch-03.md)。依赖：#12。

- [ ] G3b 有可用配置：接入改稿台，D 与 S 两组同等可用；重跑浏览器验收，核请求与父图绑定
- [ ] G3b 无可用配置：修订限定纯文字，界面写明保持不足的限制
- [ ] 在 #2 回执

费用：0 次调用。这是 D/S 正式采集前的最后一道技术门。

### 评论 1
*Freeloop993 · 2026-11-12T08:22:32Z · [原链接](https://github.com/Freeloop993/paper/issues/13#issuecomment-6818555808)*

工作台保留离线流程，依赖G3b实测的动作切换未执行；现由T16依E2结论处理。历史分母单列。[原始证据与记录](https://github.com/Freeloop993/paper/tree/cf347ededaedc59a85a9c25fbcda73ce3bfec9b3/experiments/operator-workbench)

