# 多旋翼造型工作台

下一台电脑和接手设计的 Claude 请从[当前工作台交接](../../planning/workbench-handoff/README.md)开始，那里汇总了导师方向、文献依据、已测流程和待做试验。

[下载离线版 ZIP](configurator-offline.zip?raw=true)，完整解压后打开 `index.html`。画布上的目标、依据、造型、便签、参考图、保存版本和历史案例可离线使用。在线生成与设计对话使用下方本机服务。4.x 工作台只做两个任务：日常随行航拍四旋（主案例，RQ3 的两种方式对照在这里）和农业植保六旋（场景适配案例）。三旋、平面八旋、共轴六旋 Y6、共轴八旋 X8 和中性外观比较留在 3.6 版（`#v=3`）和请求管线里，迁移检验直接在 GPU 上跑（作者 2026-11-23 定）。

## 4.0：每条方向是一串设计决定（默认打开，现为 4.3）

打开页面看到的是 4.0。走查用的软件夹具冒充出图后端时，顶栏和面板写“软件夹具（……不出真图）”。画布上每条方向占一行，从左到右是：意图 → 机架 → 动力 → 机身 → 细节 → 色材 → 生成 → 候选与比较。每一层节点只管自己的决定，节点上画着累到这一层为止的顶视小图。点哪个节点，右侧面板就是那一步；画布下方的输入框跟着选中的节点走。为什么这样分层、和别的分法比过什么，见[界面设计说明](interface-design.md)第一节。

| 想做的事 | 怎样做 |
| --- | --- |
| 写这次想做什么 | 在下方输入框写一句，回车。AI 读出场景、观察状态和造型目标，配上用户原话；每一条在右侧采纳或不要。意图写过以后再说一句是补充，已确认的条目保留 |
| 让 AI 提几个方向 | 意图面板里点「让 AI 提几个方向」。每个方向是一组跨层的改动，「放上画布」后成为一条方向，上游能共用的层继续共用 |
| 改某一层 | 点那一层，在右侧直接改；或在下方输入框对这一层说，例如“再紧凑一点”。AI 的建议出现在右侧，写明依据有多强 |
| 试另一种做法 | 在任何一层点「在这里分叉」，或在 AI 建议上点「开一个分支试试」。新方向复制这一层和下游，上游继续共用 |
| 生成 | 每行末尾的「生成」节点。上游改过以后它标“已过时”，并列出改了哪几项 |
| 在一张候选上改 | 选中候选，在「在这张图上改」里说要改什么。AI 只改相关的层，其余层记为“保持不动”，父图就是这张候选；确认后才生成。这张图之后方向又改过时，这一轮从这张图冻结时的规格出发、放进新方向，没要求改的部分才真正保持原样，原方向不动 |
| 取舍、定稿 | 保留、不要、定为终稿都可以先写一句为什么，写进那一轮的记录。两种方式都一样 |
| 一轮迟迟不回图 | 等了 60 秒以上，这一轮下面出现「重新取回」和「放弃这一轮」。放弃只在本机记为未完成并写明原因，服务端的请求和回执原样保留 |
| 调整画布 | 节点可以单个拖动，位置会存下；右上角「整理」一键排回按链对齐的位置 |
| 比较取舍 | 在候选上勾两到四张，点「比较已选的 N 张」。图并排放，下面列出差在哪几项决定；选定一张并写理由 |
| 把问题送回某一层 | 候选面板里「把问题送回某一层」，那一层的节点会标“待处理” |
| 定任务 | 意图面板顶上选：日常随行航拍四旋（主案例）或农业植保六旋（场景适配案例）。项目还空白时原地换；已经有决定或生成时，先确认，再另开项目。原话的用途不在两个场景里（例如光伏巡检），或 AI 读出的任务和现在的不同时，AI 先问按哪一个做，不自己换 |
| 植保的药箱与喷洒部件 | 植保任务里，机身层有“药箱”（半嵌入方形箱；收进机身），细节层有“喷洒部件”（横向喷杆；电机下方喷头）。英文句子沿用已出过图的请求原文，选项旁写着出过多少图；起始值对齐既有六旋 39 张 |
| 色材 | 色板 14 色，也可以用「自定义」选任意颜色；表面处理 6 种；“补充文字”里写选项没有的颜色名、分色、局部材质，原样写进生成文字，AI 不改这一栏 |
| 回到总览 | 点画布空白处，或按 Esc |
| 查研究记录 | 顶栏「研究记录与导出」：当前方向的提示词逐句来源、规格卡、全部轮次与取舍、原件导出。新的一轮只能从画布上的生成节点发出 |

**AI 的话分三档，档位由证据登记决定，不由模型决定。** 每条建议标出依据的强度：

- **已验证**：几何算得出的，或出图管线已经量过、有分母的事实。例如 W/L 0.70 的设计通路实际出成约 1.0，0/12。这一档的主按钮是「照此修正」。
- **统计相关**：S5 里真实产品的相关。例如机身相对轴距更宽的，往往被评为更紧凑。这一档的主按钮是「开一个分支试试」。
- **设计假设**：设计者的转译，还没有检验过。例如臂根无缝过渡更显整体。主按钮同样是「开一个分支试试」。

档位取建议所引条目里与改动字段相关的最强一条。没有引用的建议一律算设计假设。登记表在 [registry.mjs](src/design/evidence/registry.mjs)，每条写明来源和适用范围。用户原话单独显示：它支撑意图，不支撑比例。两条依据方向相反时两边都列出来。分支比较时写下的观察记为设计者对这个方案的判断，不算研究数据。

**轮次按项目归属，记录按场次归属。** 新建项目以后，上一个项目的图不再出现，也不能当父图。一场是一个人用一种方式的一段连续工作：每一轮、每条事件、对话和 AI 调用都写下属于哪一场（4.2）。4.3 起：换场时界面上没发出的文字、选中的父图都清掉；AI 的回答记回发出它的那一场，晚到的不用在下一场；委托、方式、匿名编号、次序四项齐全才是登记场次，登记场次不能直接换方式；开场时记下出图后端和文字模型，重导旧场次照这一份写；一场只有一个当前终稿。

**出图断线不算失败（4.3）。** Qwen 的一轮已经入队，之后连不上 GPU 主机、本机服务重启或等超时，都记“待核对”，接上以后按原 prompt_id 取回，不会重新入队；入队回执丢了时先在 ComfyUI 的队列和历史里按本轮编号找。只有 ComfyUI 明确拒收（例如缺权重，会写出节点和文件名）或报告运行失败才记失败。两种方式的页面都有“取回”和“放弃这一轮”。本场 ZIP 里每一轮附上服务端原件（实发请求、实发文字、入队回执、运行历史、拒收时的原始回答）。

**计时（4.3）。** 主持人在场次面板上记“主持人接手”“技术暂停”。面板上的时钟和本场 ZIP 按登记口径分开算主动操作、模型与排队等待、主持人交接、技术暂停和未知等待，对照 15 分钟、9 次、9 张；ZIP 里另有按登记的场次事件表列出的每个时间点（`session-events.csv`）。

**AI 的提议先经本机服务核对再给设计者看。** 字段和取值必须合法，锁定的层不能改，引用的条目必须存在且和改动的字段有关。不合格的条目被拿掉，并写进调用日志。

**文字模型。** 工作台那一场和“AI 对话 + 自由提示”那一场用同一个文字模型，通过接口调用，不在本机部署。版本先锁定：服务回执里必须写明模型名，并且和锁定的一致，否则这次回答不用；日志里分开记请求的版本和服务报的版本。每次调用记一行到 `WORKBENCH_AI_LOG_DIR`（默认在用户数据目录的 `Freeloop/multirotor-workbench/ai-calls`）下的 `ai-calls-日期.jsonl`。每行包括调用编号、时间、任务、所属场次、模型、请求的推理强度和输出上限、耗时、实际发出的消息、原始回答、推理内容、核对后的结果、被拿掉的条目、收尾原因、用量和服务的请求编号；失败的调用也记，导出本场材料时按场次取回。没有配置密钥时由规则回退应答，界面上写“规则回退（未连模型）”。给自由提示那一场的助手不带证据登记，也不带参数表。

| 环境变量 | 作用 |
| --- | --- |
| `WORKBENCH_LLM_API_KEY`（或 `MINIMAX_API_KEY`） | 文字模型的密钥。只放在启动进程的环境里，不写进任何文件 |
| `MINIMAX_REGION` | `global` 或 `cn`，用 MiniMax 时选区域。作者现有的密钥是国际站的，用 `global`。日志和界面标签写明服务主机（国际站 `api.minimax.io`） |
| `WORKBENCH_LLM_MODEL` | 锁定的模型名，默认 `MiniMax-M3.1-Flash`。作者 2026-11-23 定文字模型统一用 MiniMax M3.1，这就是官方接口里的名字；真实冒烟后把服务实际报的名字写进登记 |
| `WORKBENCH_LLM_BASE_URL` | 改接其他兼容 OpenAI 接口的服务时填它的地址 |
| `WORKBENCH_LLM_EFFORT` | 推理强度。用 MiniMax 时默认写明 `max`（服务不写时也是 max），可选 low、medium、high、xhigh、max；两组必须同一档，开场时记进场次 |
| `WORKBENCH_LLM_MAX_TOKENS` | 输出上限，默认 131072（MiniMax 文档的建议值；思考也算在内，4.2 的 4096 在 max 下会截断） |
| `WORKBENCH_LLM_TIMEOUT_MS` | 等一次回答的上限，默认 300000（5 分钟）；页面等 330 秒 |
| `WORKBENCH_AI_LOG_DIR` | 调用日志目录 |

```powershell
$env:MINIMAX_REGION = 'global'
$env:WORKBENCH_LLM_MODEL = 'MiniMax-M3.1-Flash'
$env:WORKBENCH_LLM_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'API Key' -AsSecureString)).Password
try { node scripts/design-chat-server.mjs --port 4178 --image-backend qwen-comfy --comfy-url http://GPU主机:8188 } finally { Remove-Item Env:WORKBENCH_LLM_API_KEY }
```

**研究场次（主持人用）。** 不选节点时，总览面板最下面有「研究场次（主持人用）」，自由提示那一场在右侧面板最下面。内容如下：

- 现在进行的是哪一场（第几场、方式、委托、参与者、次序），「导出本场材料（ZIP）」和「结束本场」（写下原因）。
- 「开一场」：委托（A 机鼻、B 臂根或不用）、方式、参与者匿名编号、该参与者第几场。开始时先结束上一场；项目里已有内容就另开空白项目。选了委托，任务定为日常随行航拍四旋，机架按 C2 载入并锁定，委托原文在意图面板和自由提示两边都显示。
- 「直接换方式」：不限、工作台、AI 对话 + 自由提示。在同一个项目里换方式，会结束这一场、另起一场。
- 载入并锁定 C2 登记条件（日常航拍时）：每条方向的机架都锁定，AI 也不提这一层的建议。
- 出图后端、文字模型（含服务主机）和证据登记各自的版本。
- 这个项目的场次（以及之前项目的场次），每一场都能「导出这一场（ZIP）」。ZIP 只装这一场的轮次、原图、回执、事件、对话、建议和 AI 调用；文件名写场次号、方式和委托；清单自检每一轮都属于这一场、都是这一场的方式。也可以只导出整个项目的工作区记录（JSON，含各场）。

“AI 对话 + 自由提示”那一场的界面只有对话、提示词和候选。设计者可以和同一个文字模型聊想法、让它起草提示词。发给出图模型的是设计者确认的那段文字。每一轮记下这段文字的来历：设计者自己写的、AI 起草后原样用的，或起草后改过的。

**3.6 版仍在。** 地址栏加 `#v=3`，或者用旧的复核地址（带 `step=`、`cfg=`、`board=` 等），打开的是 3.6 版和 B2 案例；它的顶栏有回到 4.0 的入口。下面几节写的是 3.6 版。

## 3.6 版：一块画布，每一步都在上面做（地址栏 `#v=3`）

3.4 版把目标、参数、候选图三个页面并进了画布。设计的每一步是画布上的一张卡片，在卡片上直接做；右侧面板跟着所选的卡片变化。为什么这样改见[界面设计说明](interface-design.md)和[画布式工作流拆解](../../planning/workbench-handoff/literature/画布式工作流拆解.md)。

| 想做的事 | 在画布上怎样做 |
| --- | --- |
| 写这次的目标 | 直接在「目标」卡片上写，回车保存。右侧同时给出可参考的用户原话，可以采用、驳回，或把某张证据卡放到画布上 |
| 定布局和尺寸 | 在「造型」卡片里拖橙色轴心、机身边缘和桨盘；右侧是五个部件页签的参数 |
| 加下一步 | 选中卡片，点它上方出现的按钮（生成效果图、另开方向、存为版本、以此图继续…），新卡片自动接在右边。也可以用底部工具条，或双击画布空白处 |
| 用一张图作参考 | 把图片拖进画布，再点「以此图生成」，或把它连到一张「生成」卡片 |
| 生成 | 「生成」卡片先以虚线出现，右侧列出将要提交的条件图、文字和参考图；点卡片上的「生成」才提交 |
| 取舍和继续 | 回图接在那一轮后面。选中候选图，点「保留」或「以此图继续」 |
| 并行几个方向 | 「另开方向」把当前方向复制一份，并排放在画布上，点哪个编辑哪个 |
| 只写文字出图（自由提示） | 底部工具条的「自由提示」。右侧写一段话，原样发给模型；不带布局条件图，也不带由造型编译的文字 |
| 问设计助手 | 右侧面板的「设计对话」页签。只查依据不需要模型账号 |
| 查研究记录 | 顶栏「显示留档」在画布上展开每轮冻结的规格和条件图；「研究详情与导出」里是提示词逐句来源、规格卡、导出、全部回执与取舍 |

[打开我的项目](http://127.0.0.1:4178/#step=canvas&board=project) · [打开 B2 四旋翼案例](http://127.0.0.1:4178/#step=canvas&board=history)。B2 案例沿图像连线回放去窗底图、相机上端和下端两种安装方案，以及作者的取舍；案例里的图片可以引用到自己的项目。

旧地址仍然可用，落在同一块画布上：`#step=insight` 选中目标卡片，`#step=studio&tab=fuselage` 选中造型卡片并切到机身页签，`#step=handoff` 打开研究详情与导出。

## 本地入口

从本目录构建并启动本机服务。证据检索无需模型账号。

```shell
npm ci
npm run build
npm run studio:chat -- --port 4178
```

第一次试用可以在目标卡片上写“折起来能放进小包”，看右侧给出的两条原句；或选中造型卡片，在「设计对话」里输入“折叠后装进小包，有哪些原句可以参考？”，点击「只查依据」。

检索来自36张公开的脱敏短引，界面区分卡数、来源数和答复提及的卡号。设计者可以预览、采纳、写明驳回理由或撤销。保存版本、冻结轮次和导出规格时会保留当时的对话与决定；读入上一版规格时，已有参数和意图仍可使用。生成图的服务回执、作者对图片的取舍与设计助手的文字建议分别保留。

## 图像后端：开发用 MiniMax，计入论文的场次用 Qwen

画布上的「生成」可以接两个后端，由启动本机服务时的参数决定，界面上会写明当前接的是哪一个。

| 后端 | 怎样启动 | 用途 |
| --- | --- | --- |
| MiniMax H3 Image（默认） | `npm run studio:chat -- --port 4178`，另设 `MINIMAX_API_KEY` | 开发和走查。界面上标“开发用，不计入论文数据” |
| Qwen-Image 2.1，本机 ComfyUI | `npm run studio:chat -- --port 4178 --image-backend qwen-comfy --comfy-url http://GPU主机:8188` | 计入论文的设计场次。论文全文只用这一个模型 |

Qwen 后端发出的是第 4 章 E3 设计通路已归档的同一套工作流：`TextEncodeQwenImage21` 接条件图和可选的父图，40 步、cfg 3、euler／simple，负面词与 `experiments/e3-quad-qwen/requests` 里的请求相同。三个权重文件名默认取归档请求里的名字，GPU 主机上的文件名不同时用环境变量 `QWEN_UNET`、`QWEN_CLIP`、`QWEN_VAE` 改。种子由轮次编号算出，同一轮重交不会变，并记在本轮记录里。

每一轮实际发出的请求、入队回执和运行历史原样存在本机的图像作业目录（`WORKBENCH_IMAGE_JOBS_DIR`，文件名是 `轮次编号.comfy-request.json`、`.comfy-ack.json`、`.comfy-history.json`），实际发出的文字另存为 `轮次编号.prompt.txt`，作业记录（派发时间、后端作业号、请求摘要）是 `轮次编号.json`。回图存两份：`QWEN-轮次编号.png`，以及后端报告的原文件名 `studio-轮次编号_00001_.png`。主持人登记场次时从这里取原件。

**还没有对真实的 GPU 主机测过。** 现有的检查用的是冒充 ComfyUI 接口的软件夹具（`npm run studio:fixture -- --port 4178 --image-backend qwen-comfy`，以及 `node --test scripts/image-jobs.test.mjs`）。开机后的第一件事是在画布上生成一张，核对三样：回图是 1024 × 1024 的 PNG；存下的请求里节点和权重文件名与主机一致；同一轮重交不产生第二次调用。

## 两种方式：结构化和自由提示，在同一块画布上

3.6 版把自由提示也放进了画布。两种方式用同一个模型后端、同样的生成设置（画幅、40 步、cfg 3、euler／simple、同一组负面词、同一条种子规则），每一轮留下同样的一组文件。差别只在设计者怎样告诉模型要什么：

| | 结构化 | 自由提示 |
| --- | --- | --- |
| 设计者做什么 | 写目标、查依据、调造型，再点生成 | 写一段话，点生成 |
| 发给模型的文字 | 由造型和目标编译出的文字 | 设计者写的原文，一个字不改、不加 |
| 发给模型的图 | 布局条件图；可再带一张父图或参考图 | 不带布局条件图；可带一张父图或参考图 |
| 回图以后 | 保留、以此图继续、对照、驳回 | 相同 |

不带图的自由提示发出的工作流，与 E1 纯文字组已归档的请求是同一种结构（`evidence/e1-open-20261112/E1-actual/E1-text-*/request.json`）。开发用的 MiniMax 后端是改图接口，不接受不带图的自由提示；自由提示请在 Qwen 后端上用。

**研究场次设置。** 不选任何卡片时，右侧面板最下面有「研究场次设置（主持人用）」。「这一场的方式」选「结构化」或「自由提示」后，画布上只留这一种方式的入口和卡片：自由提示场次里看不到目标、造型、用户依据和设计对话；结构化场次里看不到自由提示。记录都还在，选回「不限」就都出现。平时设计用「不限」。

## 起始设计值，和登记的实验条件

两样东西分开登记在 [src/design/defaults.ts](src/design/defaults.ts)：

- **起始设计值**是打开空白项目、点「重置参数」时看到的数：宽 X 型、W/L 1.35、机身 150 × 55 mm。它们取自 32 款真实四旋翼产品图上的量测（W/L 中位数 1.35，四分位 1.17–1.50；机身宽 ÷ 轴距中位数 0.23，0.18–0.29；机身长 ÷ 宽中位数 2.76，2.38–3.59），不是实验条件。轴距 250 mm 和桨径 5 英寸没有改。
- **登记的实验条件**不随起始值变：W/L 的三档 0.70、1.00、1.30，以及 C2 作者预试的布局（真 X 型、W/L 1.00、轴距 250 mm）。做 C2 场次时，在「研究场次设置」里点「载入登记条件」；它只改布局三项，不动机身尺寸。面板会写明当前布局符不符合登记条件。

`npm run verify` 的后 14 项核对这两样：起始值落在真实产品的四分位之内、几何上放得下；三档实验条件的轴心仍与登记的研究条件图一致；载入 C2 条件后符合登记工具的检查项。

只想走查界面、不调用模型时，用 `npm run studio:fixture -- --port 4178` 代替上面最后一条命令。这个服务照常检索公开卡，图像作业由软件夹具应答：它把本轮的布局条件图原样当作“回图”返回，只用来检查画布上的提交、回图、取舍和继续生成是否连得上。

## 在本机试用带证据的设计对话

使用 Node.js 24 或更新版本，在本目录执行 `npm ci` 和 `npm run build`。在 PowerShell 中运行以下命令，新密钥可在隐藏输入提示中填写。区域 `global` 对应国际站账号，`cn` 对应中国站账号。

```powershell
$env:MINIMAX_REGION = 'global'
$env:MINIMAX_API_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'MiniMax API Key' -AsSecureString)).Password
try { node scripts/design-chat-server.mjs --port 4178 } finally { Remove-Item Env:MINIMAX_API_KEY }
```

打开 [造型卡片的机身页签](http://127.0.0.1:4178/#step=studio&tab=fuselage)，在右侧面板的「设计对话」页签询问折叠收纳的依据，或选中机身后要求调整宽度。工作台从现有脱敏短引检索相关卡，用 MiniMax-M3.1-Flash 的 `max` 推理生成答复。选「预览」在造型卡片上查看宽度差异，选「应用到草稿」才写入当前规格。模型服务只监听本机回环地址。浏览器通过同源代理调用模型。图像默认使用相同区域和密钥。若账户分别授权了图像和文本服务，可在启动进程前通过环境变量 MINIMAX_IMAGE_API_KEY、MINIMAX_IMAGE_REGION 指定图像凭据与区域。

## 从设计目标到候选图

1. 在「目标」卡片上写下想做的改变。可选择采用一条用户原话，也可以按自己的判断确认目标。工作台按话题、观察状态和任务筛选适用依据。
2. 在「造型」卡片上直接拖动，或在右侧选择部件修改规格。部件面板可从知识库调出对照问题，由设计师决定是否记入当前方案。画布能从设计目标或已保存规格追到实际采用的证据卡。
3. 选中造型卡片，点「生成效果图」，再点新卡片上的「生成」。工作台保存当前规格，把布局条件图发给 MiniMax H3 Image，默认每轮生成一张 1024 × 1024 PNG。以候选图继续生成时，同时传入父图；以画布上的参考图生成时，同时传入那张图。等待回图时可以继续修改造型。
4. 选中候选图，选择「保留」或「以此图继续」。原始输入、图像摘要、服务回执、选案与各版关系均可回查。「研究详情与导出」保留完整记录和旧版 ComfyUI 研究工具。[MiniMax 图像编辑接口](https://platform.minimax.io/docs/guides/image-generation)

本机服务在用户数据目录 Freeloop/multirotor-workbench/image-jobs 中保存轮次与 PNG，供浏览器刷新后取回。设置 WORKBENCH_IMAGE_JOBS_DIR 可以指定该目录。

[本轮软件走查记录与截图](review/20261119-round4/README.md) · [上一版界面与历史验收](review/20261118-round3/README.md) · [研究系统实施依据](https://github.com/Freeloop993/paper/blob/a98b3ecdce0330902d9f5dd99336ce41e7fc993e/planning/advisor-20261118/system.md)


## 源码入口

| 要修改的内容 | 文件 |
| --- | --- |
| 4.0：入口与版本切换 | [Root.tsx](src/Root.tsx)、[Studio4.tsx](src/v4/ui/Studio4.tsx) |
| 4.0：决定链的数据与分叉、共用、过时（纯逻辑，有测试） | [model.ts](src/v4/model.ts)、[v4-model.test.mjs](scripts/v4-model.test.mjs) |
| 4.0：工作区状态、撤销、本机保存；让旧控件改到所属的层 | [store.ts](src/v4/store.ts)、[adapter.ts](src/v4/adapter.ts) |
| 4.0：画布、节点与视图 | [Board4.tsx](src/v4/ui/Board4.tsx)、[MiniTop.tsx](src/v4/ui/MiniTop.tsx)、[studio4.css](src/v4/ui/studio4.css) |
| 4.0：右侧面板（总览、意图、各层、生成、候选、比较）与语言输入 | [PanelOverview.tsx](src/v4/ui/PanelOverview.tsx)、[PanelIntent.tsx](src/v4/ui/PanelIntent.tsx)、[PanelLayer.tsx](src/v4/ui/PanelLayer.tsx)、[PanelRound.tsx](src/v4/ui/PanelRound.tsx)、[CommandBar.tsx](src/v4/ui/CommandBar.tsx) |
| 4.0：AI 对话加自由提示那一场；研究场次设置；工作区导出 | [FreeStudio.tsx](src/v4/ui/FreeStudio.tsx)、[SessionSetup.tsx](src/v4/ui/SessionSetup.tsx)、[exportWorkspace.ts](src/v4/exportWorkspace.ts) |
| 4.2：场次（哪些轮次属于哪一场、场次的说法、结束后的本机存档）；登记的委托与限额 | [sessions.ts](src/v4/sessions.ts)、[defaults.ts](src/design/defaults.ts) |
| 4.3：AI 调用绑定发出它的那一场（成功、失败、晚到） | [aiSession.ts](src/v4/aiSession.ts) |
| 4.3：计时（主动操作、模型与排队等待、主持人交接、技术暂停、未知等待）与登记的场次事件表 | [timing.ts](src/v4/timing.ts)、[roundTimes.ts](src/v4/roundTimes.ts) |
| 4.3：一场一个当前终稿 | [useFinal.ts](src/v4/useFinal.ts)、[FinalLine.tsx](src/v4/ui/FinalLine.tsx) |
| 4.3：Qwen 作业的待核对、按原 prompt_id 取回、服务端原件 | [image-jobs.mjs](scripts/image-jobs.mjs)、[generation.ts](src/design/generation.ts) |
| 4.0：证据登记与分档 | [registry.mjs](src/design/evidence/registry.mjs)、[Evidence.tsx](src/v4/ui/Evidence.tsx) |
| 4.0：AI 服务（提示、核对、锁定版本、调用日志、规则回退） | [design-ai.mjs](scripts/design-ai.mjs)、[design-ai.test.mjs](scripts/design-ai.test.mjs)、浏览器一侧 [ai.ts](src/v4/ai.ts) |
| 应用外壳、地址栏入口、顶栏 | [App.tsx](src/App.tsx)、[WorkbenchShell.tsx](src/components/Graph/WorkbenchShell.tsx) |
| 设计画布：添加步骤、选中后的下一步、生成与取舍 | [CanvasWorkspace.tsx](src/components/Canvas/CanvasWorkspace.tsx) |
| 画布上的步骤卡片（目标、造型、生成、图像、便签） | [StepCards.tsx](src/components/Canvas/StepCards.tsx) |
| 画布本身：排布、卡片位置、视野、连线、整理 | [DesignBoard.tsx](src/components/Canvas/DesignBoard.tsx) |
| 随所选步骤变化的右侧面板、设计对话页签 | [StepPanel.tsx](src/components/Canvas/StepPanel.tsx)、[canvasUi.tsx](src/components/Canvas/canvasUi.tsx) |
| 画布上的卡片与连线从哪里来（草稿、保存的版本、轮次、便签、待生成步骤） | [workflowGraph.ts](src/design/workflowGraph.ts)、[project.ts](src/design/workflow/project.ts)、[attempts.ts](src/design/workflow/attempts.ts)、[workspaceRecords.ts](src/design/workflow/workspaceRecords.ts) |
| 证据卡、保存版本等卡片的通用详情 | [GraphInspector.tsx](src/components/Graph/GraphInspector.tsx) |
| 目标面板、语义检索与研究资料 | [InsightPage.tsx](src/components/Insight/InsightPage.tsx)、[useGoalEditor.ts](src/components/Insight/useGoalEditor.ts)、[字段检索](src/design/semantics/lookup.mjs)、[公开卡语义标注](src/design/semantics/topics.mjs) |
| 五个部件页签的参数 | [Parameters/](src/components/Parameters/)、[controls.tsx](src/components/controls/controls.tsx) |
| 造型卡片里的顶视、条件图、侧视、拖动与比例读数 | [Stage.tsx](src/components/Studio/Stage.tsx) |
| 设计对话 | [DesignChat.tsx](src/components/Studio/DesignChat.tsx) |
| 布局空间图、设计提示、参考机型 | [SpaceMap.tsx](src/components/Studio/SpaceMap.tsx)、[Hints.tsx](src/components/Studio/Hints.tsx)、[References.tsx](src/components/Studio/References.tsx) |
| 研究详情与导出：提示词面板、规格卡与导出 | [HandoffPage.tsx](src/components/Handoff/HandoffPage.tsx)、[PromptGenerator.tsx](src/components/DevPreview/PromptGenerator.tsx)、[ParameterOverview.tsx](src/components/Overview/ParameterOverview.tsx) |
| 历史提交、候选原件、人工取舍与历史回放 | [ModelDispatch.tsx](src/components/Handoff/ModelDispatch.tsx)、[candidateRecords.ts](src/design/candidateRecords.ts)、[HistoryReplay.tsx](src/components/Handoff/HistoryReplay.tsx) |
| H3 生成、参考图转换、同一轮次恢复与本机代理 | [generation.ts](src/design/generation.ts)、[image-jobs.mjs](scripts/image-jobs.mjs) |
| 轴心几何、构型画法与依据、条件图 | [design.ts](src/design/design.ts) |
| 设计提示的算法（桨盘重叠、相机视野、桨与机身） | [checks.ts](src/design/checks.ts) |
| 每个选项的名称、短语和参考数值 | [fields.ts](src/design/fields.ts) |
| 提示词逐句编译与检查；导出与读入 | [partPrompt.ts](src/design/partPrompt.ts)、[exporters.ts](src/design/exporters.ts) |
| 状态、撤销、方向（方案）、对比、设计意图 | [droneStore.ts](src/store/droneStore.ts) |
| 参考机型数据（官方规格与手册图面量测） | [aircraft.ts](src/data/aircraft.ts) |
| 评论短引文数据 | [evidenceCards.json](src/data/evidenceCards.json)，由 `npm run evidence` 生成 |
| 早期评论检索与模型服务（停用，未改动） | [知识库](rag_knowledge_base.py)、[本地服务](rag_api_server.py)、`src/services/` |

## 评论短引文从哪里来、怎样增加

界面里的短引文取自仓库公开的 `evidence/semantic-cards/cards.csv`，目前 36 条。它们是按既定方向挑选的示例，不足以单独支撑判断，所以洞察页同时给出语料的主题分布。

要从私有评论库里再挑一批，把新挑的短引文按 `cards.csv` 的十一列整理成一份 CSV（只放 60 字以内的脱敏片段，不放完整原评论、用户名或链接；卡号不与已有的重复），然后执行：

```sh
npm run evidence -- --extra 路径/新增短引文.csv
```

语义索引锁定本次 36 张卡的版本。增加卡后须逐条复核话题、适用状态和同源关系，再更新结构化索引的版本与内容摘要，重新核验有关查询。

## 命令

在本目录执行 `npm ci` 后：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本机编辑预览。检索、对话和图像作业转给 4178 端口的本机服务（`studio:chat` 或 `studio:fixture`） |
| `npm run build` | TypeScript 检查并生成 `dist/index.html` |
| `npm run package-offline` | 重新构建并打包 `configurator-offline.zip` |
| `npm run walkthrough:studio4` | 先 `npm run build`。4.0 的整条流程：写意图、AI 读目标、补充一句不盖掉已确认的条目、AI 提方向并放成两条方向（上游共用）、对机身说话（建议标统计相关、默认开分支）、生成、在候选上改、两张比较取舍；再做一场 AI 对话加自由提示（核对发出的就是确认的原文、记下来源），载入登记条件看机架锁定，核对 AI 调用日志；按场次导出三个 ZIP 并逐个核对内容；按委托开一场、换成自由提示、植保的药箱与喷洒、有决定时换任务（4.2）。文字模型和图像作业都由夹具应答，不调用模型。可加一个目录参数保存截图 |
| `npm run walkthrough:issues` | 先 `npm run build`。Codex 11 月 23 日盲测的 12 条（第 7、14 条要真机）逐条复现与验收：换场不串、晚到的回答、Qwen 断线取回、推理强度与截断、失败调用进 ZIP、旧场次的环境、用户依据摘要、计时与事件表、终稿、服务端原件与拒收原因、登记场次、自由提示的比较。文字模型和 ComfyUI 都由可控夹具应答。加 `--probe` 只报告，`--shots=<目录>` 截图 |
| `npm run gpu:acceptance` | 真机验收（第 7、14 条）：`-- --comfy-url <地址> --out <目录>`。两种方式各出首图和两次修订（只改机鼻、只改臂根），逐轮核对原图、输入图数、工作流、权重、采样设置、种子、prompt_id、运行历史、入队次数和事件表，与本场 ZIP 对上；另存匿名盲读材料。不给地址时用夹具演练 |
| `npm run ai:smoke` | 接上真实文字模型后的冒烟检查：读意图、提方向、对机身说话、在候选上改、自由提示的助手各调用一次，列出是否通过服务的核对、耗时、服务报的模型名、推理强度、收尾原因和拿掉的条目。会产生 5 次真实调用；密钥只从环境变量读。加 `-- --fixture` 只检查脚本本身 |
| `npm run walkthrough:canvas` | 先 `npm run build`。3.6 版（`#v=3`）。在隔离的浏览器里把画布上的每一步做一遍：目标、依据、造型拖动、生成、保留、以候选继续、参考图作输入、便签、新方向、留档、B2 案例和手机宽度。图像作业由软件夹具应答，不调用模型。可加一个目录参数保存截图 |
| `npm run walkthrough:methods` | 先 `npm run build`。3.6 版（`#v=3`）。同一块画布、同一个 Qwen 后端（软件夹具），先做一场自由提示，再做一场结构化：核对起始值、载入 C2 登记条件、自由提示只发原文、两种方式的生成设置逐项相同、原始文件都存了盘、一场只显示一种方式。加两个目录参数可保存截图和留下作业文件，供 [登记工具试收](review/20261121-defaults-free-prompt/bridge-dry-run.sh) |
| `npm run walkthrough` | 从离线包走一遍目标、造型和导出，保存农业六旋实际导出与桌面截图，命令会输出所在目录 |
| `npm run check-offline` | 解压离线包，以 `file://` 打开，检查画布、目标面板、造型、导出、报错、是否有非本地请求和实际下载 |
| `npm run verify` | 任务、构型、几何、导入导出与提示词自动复核 |
| `npm run replay` | 把留存的规格 JSON 读回当前源码再导出，逐项比对 |

开发核查使用 Node 22.18 以上。打包与解压核验需要 Python 3，界面核验还需要 Chrome。

浏览器记录及协议测试可分别运行 `node scripts/record-walkthrough.mjs <预览地址>` 和 `node scripts/dispatch-walkthrough.mjs <预览地址>`。需安装 Playwright Core 或通过 `PLAYWRIGHT_CORE` 指定其路径。前者核对历史回放、导入、取舍与父图，后者在本机软件夹具上核对 HTTP 输入、回图和失败历史。两者均不调用模型。

复核时可以用地址栏参数直接还原状态：`index.html#step=studio&cfg=<规格 JSON 的 base64url>&pin=<对比规格>&set=frame.arm_width_mm="20mm"&tab=frame&q=小巧`。

[历史说明](README.historical.md)记录早期构想。已有实验的条件图见[图像和参数](public/research-guides/)。私有原始评论和本机服务配置由作者另行保存。
