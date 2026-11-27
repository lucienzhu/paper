# 工作台 4.5 复核记录（2026-11-26）：出图只接 Qwen

作者 2026-11-26 定研究控制变量（[登记任务表](../../../../planning/2026-11-17-direction-and-todo.md)“作者最新决定”第 11 条）：文字模型统一用 MiniMax（M3.1），出图模型统一用 Qwen（Qwen-Image 2.1）；MiniMax H3 托管接口出的图是没走正式通路的冒烟数据，全部移出。

4.4 的「生成」默认接开发用的 MiniMax H3 出图后端，只有启动时另给 `--image-backend qwen-comfy` 才走 Qwen。启动时少写一个参数，就会用 H3 出图，这正是作者要排除的混杂。4.5 把这条后端整个去掉。

同一天全库复查时又查出两处同类的口子，一并处理：

- 文字模型默认是 MiniMax M3.1，但设 `WORKBENCH_LLM_MODEL` 就能换模型名，设 `WORKBENCH_LLM_BASE_URL` 就能改接别的兼容服务。
- `src/services/` 里还留着早期原型接 DALL-E 3、Gemini、DeepSeek 和检索增强服务的代码，`src/components/DevPreview/` 里有两个调用它们的测试页。现行界面没有任何入口引用这些文件，打包也不含它们。

**结论：** 出图只剩本机 ComfyUI 上的 Qwen 一条路，文字模型只剩 MiniMax M3.1 一条路。全部检查通过。真人场次和真实模型调用都没有。

## 一、开工前对蓝图

| 写明什么 | 这一步 |
| --- | --- |
| 对应论证链的哪一环 | RQ3 两种方式对照的登记条件（任务表 C1）：两组用同一个出图后端（Qwen-Image 2.1），4.4 的冻结说明已这样写，4.5 让代码只剩这一种可能 |
| 对象范围 | 工作台的出图后端和界面标签。不改场次流程、记录格式、计时和导出格式 |
| 交到哪一节 | 4.5 节（工具实现）与 3.5 节（两组的登记条件） |

## 二、改了什么

**服务端（`scripts/`）**

- `image-jobs.mjs`：去掉 MiniMax 改图接口的请求、回执处理和报错文字。
  - `createImageJobs` 只接受 `{provider:'qwen-comfy'}`，给别的后端直接报错。
  - 没给 ComfyUI 地址时，这一轮记失败，写“尚未配置 Qwen 图像服务地址”，不改连别的服务。
  - 4.5 以前留在本机的非 Qwen 旧轮次不再取回，只显示为未完成。
- `design-chat-server.mjs`：默认后端改为 `qwen-comfy`；`--image-backend` 只接受这一个值，留着是为了旧命令照常能用。不再读 `MINIMAX_IMAGE_API_KEY`、`MINIMAX_IMAGE_REGION`。文字模型的设置不变。
- `fixture-server.mjs`、`canvas-walkthrough.mjs`、`chat-handoff-walkthrough.mjs`：原先冒充托管出图接口的夹具，改用新加的 `comfy-fixture.mjs`，它按 ComfyUI 的接口应答。
- `studio4-issues.mjs`：R6“重新导出旧的一场”原先把“服务换了”模拟成 H3。改为模拟成换了软件夹具；判据不变：导出照那一场登记的后端写。
- `image-jobs.test.mjs`：原第一项测的是 H3 通路。改写成 Qwen 通路，仍测这几件事：同一轮只入队一次；输入变了报 409；摘要不对报 400；服务重启后不重交。另加一项：非 Qwen 的后端一律拒绝。删去“开发用后端不接受不带图的自由提示”一项。

**界面（`src/`）**

- `imageBackend.ts`：只剩 Qwen 一个后端。服务连不上，或页面是离线包时，标签也写 Qwen。非 Qwen 的旧轮次标“非 Qwen 的旧记录，不计入研究数据”。
- `StepPanel.tsx`、`PanelRound.tsx`、`SessionSetup.tsx`、`FreeStudio.tsx`：去掉“开发用，不计入论文数据”的标签和 MiniMax 的提醒。
- `candidateRecords.ts`、`generation.ts`：设计者可能看到的报错里，“H3 服务”“H3 回图”改成“出图服务”“回图”。

**文字模型（`scripts/design-ai.mjs`）**

- 模型名只认 `MiniMax-M3.1-Flash`。文档里也出现过 `MiniMax-M3.1-Flash-Preview`，真实冒烟时服务若报这个名字，照服务写，所以也认它。别的模型名一律拒绝，服务不启动。
- 给了 `WORKBENCH_LLM_BASE_URL`（改接别的兼容服务）就报错，服务不启动。这一项的读取留着，只为旧设置能报清楚错。
- 推理强度、输出上限、等候上限照旧；回执照旧记服务实际报的模型名，与锁定的不一致就不用这次回答。
- `design-ai.test.mjs` 加一项：别的模型名、别的服务都在任何调用之前被拒绝。
- `studio4-issues.mjs` 的 R6 原先把“服务换了”模拟成另一个文字模型，改为模拟服务重启时没给密钥、改走规则回退；判据不变：导出照那一场登记的文字模型写。

**早期原型的其他模型代码：** `src/services/` 的 6 个文件（DALL-E 3 出图、Gemini 和 DeepSeek 改写提示、检索增强服务、旧的出图接口），`src/components/DevPreview/` 的 `TestImageGeneration.tsx`、`GeminiOptimizationViewer.tsx`，原样移进 `archive/prototypes/drone-configurator/src/`，记在 [archive/MOVES-20261126.tsv](../../../../archive/MOVES-20261126.tsv)。`droneStore.ts` 里只为这些文件留着的 4 个状态字段和 4 个设置函数一并删去；`package.json` 删去只有它们用的 `openai`、`@google/generative-ai` 两个依赖。

**版本号：** `src/v4/version.ts` 和 `package.json` 由 4.4.0 改为 4.5.0。导出的每一份记录和每一场开场时的环境都写这个版本号，4.5 的场次不会被认成还接着 H3 的 4.4。

**没改的：** 接口路由里的 `h3`（`/api/h3/jobs`、`/api/h3/backend`）、轮次记录和导出里的 `h3` 字段，都是早期版本的内部名字。改它们就改了场次导出的格式，主持人工具要跟着改，所以这次不动。现在它们只承载 Qwen 的轮次，README 里写明了。

**离线包：** `configurator-offline.zip` 按 4.5 重打。逐个查过包里的脚本，没有 MiniMax H3。

## 三、检查（2026-11-26，本机）

| 检查 | 改前（4.4） | 改后（4.5） |
| --- | --- | --- |
| `node --test scripts/*.test.mjs` | 54 项全部通过 | 56 项全部通过（删 1 项 H3，加 3 项：Qwen 通路、拒绝非 Qwen 后端、拒绝非 MiniMax M3.1 的文字模型） |
| `npm run verify` | 71/71 | 71/71 |
| `npx tsc -b` | 通过 | 通过 |
| `npm run build` | — | 通过 |
| eslint（改过的 18 个文件） | — | 无问题 |
| `npm run walkthrough:methods` | — | 通过，真实模型调用 0 |
| `npm run walkthrough:studio4` | — | 通过，10 场 |
| `npm run walkthrough:canvas` | — | 通过。夹具换成 ComfyUI 以后，有一处断言原先写死 H3 夹具的追踪号，改为核对追踪号等于本轮编号 |
| `npm run walkthrough:issues` | 23/23 | 23/23（R6 改为模拟服务改走规则回退） |
| `npm run gpu:acceptance`（软件夹具） | 6 轮通过 | 没有发现问题 |

**没测的：** 真实 GPU 主机上的出图；真实文字模型；真人场次。工作台的冻结版本由 4.4（`8ad5515`）改为 4.5，以合并本 PR 的提交为准。
