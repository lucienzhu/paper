# Branch evidence recovery

These files were copied from existing research branches, preserving their repository paths and Git blob contents. This record does not imply that experiments, ratings, or analysis are complete.

The manifest records the source branch, commit and Git blob ID for each restored file. Existing main-branch files were not replaced.

Source commits:

- `claude/direction-todo-20261117`: `9afe6903b0368cd86ced367c3675bb4a7adc98e2`
- `claude/e3-quad-qwen`: `e96d41946ea84237da506bb76c2f713a3f3b9275`
- `claude/extra-readings-20261117`: `e19a706fa3b91af651444cd680b0351e15516a55`
- `claude/gpu-tasks-20261117`: `ca4b5349dbfdda162357e0c676c085345bd46b60`

## 2026-11-24 补充

11 月 20—21 日的恢复漏了 47 个文件，2026-11-24 补回，同样逐字节取原 blob。逐件来源见 [source-manifest-20261124.tsv](source-manifest-20261124.tsv)：`source_path` 是文件在分支上的位置，`repository_path` 是放进主分支的位置；`action` 为 `add` 的是新增，为 `replace` 的 4 个是用分支上较新的版本替换主分支的旧版（`real-product-topview` 的 README 与 sources.json、`semantic-cards/README.md`、旧计划 `requirements.md`）。

其中 14 个按 11 月 18 日已定的去留直接放进 `archive/`：11 月 18 日逐字存档的工单（`archive/issues/`）、`20261117-r3-check`（#3 第 20 题定为以 research-update 为准）、当时的两份清点、`e4-author-pilot` 的撤下说明，以及 `requirements.md` 的 11 月 18 日版本。

来源提交（2026-11-24）：

- `claude/direction-todo-20261117`: `9afe6903b0368cd86ced367c3675bb4a7adc98e2`
- `claude/e3-quad-qwen`: `e96d41946ea84237da506bb76c2f713a3f3b9275`
- `claude/gpu-tasks-20261117`: `ca4b5349dbfdda162357e0c676c085345bd46b60`
- `claude/word-pairs-v1`: `dad19783e8e798f3974f896ccb95e4a298685162`
- `codex/advisor-study-system-20261118`: `a98b3ecdce0330902d9f5dd99336ce41e7fc993e`

**留在分支上、没有补回的。** 这些按已定的去留不进主分支，或要作者先定：

| 分支 | 只在那里的东西 | 为什么不补 |
| --- | --- | --- |
| `codex/r1-render-freeze` | `experiments/r1-render`，R1 的 22 份请求 | R1 从未运行（清单第二节：只打标签存档） |
| `claude/r1-r3-design` | R1—R3 设计稿 | 从未执行（同上） |
| `claude/ch03-3.2-3.3` | 3.2—3.3 节第二稿 | 已被 `manuscript/thesis/src/ch3.md` 吸收（同上） |
| `codex/e2r-human-review-20261115` | 3 MB 的 E2R 评阅稿 Word | #3 第 23 题定为打标签后删分支 |
| `codex/semantic-tools`（PR #57） | E5 词对评分页与打包脚本、旧配置器的作者简报页 | #3 第 22 题定为合并，但要先改到现在的主分支上，交 Codex |
| `claude/direction-todo-20261117` | `prototypes/e3-author-workbook` 的 11 月 17 日版 `model.js`、`workbook.js` | 这一版接到已撤下的 E4 预试界面；主分支保留与 E3 证据对应的 11 月 14 日版 |
| `sync/missing-zips-20261120` | 两个 ZIP 的 base64 分片 | 三个 ZIP 已于 11 月 20 日进主分支（提交 `ba44944`），分片不再需要 |
| `tools/a8-html-download-20261120`、`tools/workbench-360-preview-20261121` | 各一个 GitHub Actions 工作流 | 一次性的打包工具 |
| `reference-fulltexts-20261109` | 102 份文献原件 | 长期数据分支，按清单保留，不并入主分支 |

各分支上其余与主分支不同的文件都是 README、STATUS、旧版工作台等的旧版本，主分支上的更新。
