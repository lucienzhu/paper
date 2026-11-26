# 工作台 4.5.1 复核记录（2026-11-26）：去掉旧 B2 案例

作者 2026-11-26 定旧路径的数据整体移出（[登记任务表](../../../../planning/2026-11-17-direction-and-todo.md)“作者最新决定”第 12 条）：11 月 17 日以前的出图，Qwen 出的也不再沿用。工作台 3.6 版里还带着旧 E3 的 B2 案例：顶栏的「B2 案例」画板（B2 原图、去窗底图、上下端相机安装和作者取舍），以及「研究详情与导出」里的历史回放（四旋 B2、六旋 HEXA3）。4.0 顶栏的「旧版」入口能打开它（登记场次里只在主持人面板）。4.5.1 把这些去掉。

**结论：** 工作台里不再有旧路径的图。出图后端、文字模型、场次流程、记录和导出格式都没改。全部检查通过；真人场次和真实模型调用都没有。

## 一、开工前对蓝图

| 写明什么 | 这一步 |
| --- | --- |
| 对应论证链的哪一环 | RQ3（两种方式对照）的工具：设计者能看到的参照只有真实产品和自己的方案，不再有旧设计案例 |
| 对象范围 | 3.6 版画布的 B2 案例画板、历史回放和它们用的图；4.0 顶栏和主持人面板里“旧版”入口的说明文字 |
| 交到哪一节 | 4.5 节（工具实现） |

## 二、改了什么

- 移进 archive：`src/design/workflow/history.ts`（B2 案例的画板数据）、`src/components/Handoff/HistoryReplay.tsx`（历史回放），`src/data/history/` 里的 `quad.webp`、`hex.webp`、`B2-*.webp`、`hex-guide.png`、`cases.json`。`quad-guide.png` 是程序画的条件图，夹具和测试还在用，留下。
- 画布只剩「我的项目」一块：`WorkbenchShell.tsx` 去掉画板切换；`CanvasWorkspace.tsx`、`workflowGraph.ts`、`GraphInspector.tsx`、`StepPanel.tsx` 去掉只读案例的分支和“引用到我的项目”；旧地址里的 `board=history` 也打开自己的项目。
- 以前从 B2 案例引用到项目里的参考图：案例已不在，这张卡片只留标题和来历说明，不显示图。
- 4.0 顶栏和主持人面板的「旧版」入口：说明文字去掉“与 B2 案例”，入口本身照旧（登记场次里只在主持人面板）。
- 植保六旋的起始值：药箱句和喷杆句原先是“与旧六旋请求一字不差”，测试从归档的 `cases.json` 里取原句来比。起始值是作者定下的设计起点，照旧；测试改为把这两句原文固定在测试里，不再读旧数据。
- 走查脚本：`canvas-walkthrough` 的参考图原先用旧 B2 图，改为在浏览器里把条件图转成 WebP 再导入（仍测 WebP 转 PNG）；去掉 B2 案例那一步。`check-offline`、`graph-walkthrough`、`record-walkthrough` 去掉 B2 案例和历史回放的检查。
- 版本号 4.5.0 → 4.5.1（`src/v4/version.ts`、`package.json`）；离线包按 4.5.1 重打。

## 三、检查（2026-11-26，本机）

| 检查 | 结果 |
| --- | --- |
| `node --test scripts/*.test.mjs` | 56 项全部通过 |
| `npm run verify` | 71/71 |
| `npx tsc -b`、`npm run build` | 通过 |
| eslint（改过的全部文件） | 0 个错误；1 条原有的提醒（`WorkbenchShell.tsx` 同时导出常量） |
| `npm run walkthrough:canvas` / `:methods` / `:studio4` / `:issues` | 通过；issues 23/23；真实模型调用 0 |
| `npm run check-offline` | 通过 |
| `npm run gpu:acceptance`（软件夹具） | 没有发现问题 |
| `graph-walkthrough`、`record-walkthrough`（不在 npm 脚本里） | 改前在未改动的版本上就跑不通，这次只去掉了 B2 案例的步骤，没有修 |

**没测的：** 真实 GPU 主机上的出图；真实文字模型；真人场次。工作台的冻结版本以合并本 PR 的提交为准，版本号 4.5.1。
