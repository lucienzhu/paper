# GitHub 上的整理：交给有仓库权限的人执行（2026-11-24）

Claude 用的账号对 `Freeloop993/paper` 只有读和评论的权限，关 PR、删分支、打标签、关工单都要仓库所有者的账号。下面是完整清单和逐条要发的评论。文件层面的整理在整理 PR（#98）里，**先合并 #98，再做这里的第三步以后**：几个 PR 能关，是因为它们只在分支上的内容由 #98 补回了主分支。

清单按 2026-11-24 远端的实际状态生成：分支 43 个（含 main），开着的 PR 11 个，开着的工单 7 个。每个分支都核对过：要么已经整个在主分支的历史里，要么它独有的内容已经补回主分支，或按已定的去留只打标签。依据见[整理清单](2026-11-18-cleanup-list.md)第二至四节和第八节、[分支恢复记录](../../evidence/20261120-branch-recovery/README.md)。

**为什么每个要删的分支都先打标签。** 主分支上约 280 处固定提交链接指向只在未合并分支上的提交，标签让这些提交一直可达。GitHub 网页上的工单和 PR 讨论里还有按分支名写的链接，包括已并入主分支的分支（如 `codex/e1-actuals`）；网页上的原文改不了，只有同名标签能让这些链接在删分支后继续有效。仓库里的讨论存档（`archive/issues/`）已经把这些链接改成固定提交号，不依赖标签。

**2026-11-24 核对时的状态（Codex 复核过）。** 41 个同名标签一个都还没有（0/41）。要删的 40 个分支里，16 个的末提交不在 main 的历史里，删了只能靠标签找回。其中有两件东西只在各自的分支上，按已定的去留不进主分支，只靠标签保存：

- `codex/e2r-human-review-20261115` 上的 E2R 评阅稿 Word（`manuscript/thesis/review/2026-11-15-codex-e2r-human-reading.docx`，blob `03050e0a…`，#3 第 23 题定为打标签后删分支）；
- `codex/r1-render-freeze` 上的 R1 冻结请求包（`experiments/r1-render/`，24 份请求，manifest blob `70058d41…`，清单第二节定为只打标签存档）。

所以删分支前必须逐个确认同名标签指向原末提交。[2026-11-24-github-cleanup.sh](2026-11-24-github-cleanup.sh) 把这件事做成了脚本：`verify` 逐个核 41 个标签，再核这两件原件确实在标签里；`delete` 先跑 `verify`，不过就一个也不删，过了也在删每个分支前再核一次它的标签。`#57` 的分支（`codex/semantic-tools`）打标签但不删，`reference-fulltexts-20261109` 不在清单里，保留为分支。

## 给执行者的提示词

> 你在 GitHub 仓库 `Freeloop993/paper` 上做一次整理，只做下面清单里写到的操作，不多做。
>
> 1. 先执行 `git fetch origin --prune`，核对清单里每个分支现在的末提交和表里写的一致。不一致的，那一个分支就不要动，记下来报告。
> 2. 确认整理 PR #98 已经合并；没合并就只做第二步（打标签），其余停下等作者。
> 3. 用仓库里的脚本做标签和删分支，不要手敲：先 `bash planning/2026-11-24-github-cleanup.sh check`，再 `tag`，再 `verify`。`verify` 必须显示“同名标签：41 个一致”和两行“原件 ok”，否则停下报告。不要在本地建同名的分支和标签。
> 4. 关 PR 用 `gh pr close <号> --repo Freeloop993/paper --comment "<评论>"`，评论用表里的原文。先关 PR，再删它的分支。
> 5. 关完 PR 后，先 `bash planning/2026-11-24-github-cleanup.sh delete` 看会删哪些，确认是清单 41 个里除 `codex/semantic-tools` 以外的 40 个、每个都写着“标签已核”，再 `delete --yes`。脚本只删清单里的分支，`main` 和 `reference-fulltexts-20261109` 不在清单里。
> 6. 不要合并任何 PR，不要改主分支上的文件，不要强推。PR #57 先不关，等作者回答。
> 7. 做完把第六步的核对结果贴在工单 #76，写明实际做了哪些、哪些没做、为什么。

## 第一步：核对（只读）

```bash
git fetch origin --prune
gh api repos/Freeloop993/paper/branches --paginate --jq '.[].name' | sort
gh pr list --repo Freeloop993/paper --state open
gh issue list --repo Freeloop993/paper --state open
```

## 第二步：给要删的 41 个分支全部打同名标签

**没并入主分支的 17 个**（11 月 18 日已定“并入后改为同名标签”）：

| 分支 | 末提交 | PR | 是什么 |
| --- | --- | --- | --- |
| `claude/ch03-3.2-3.3` | `fd0aa425c9a1db10eeb3542b530b5046395452c3` | #71 | 3.2—3.3 节第二稿，已被 `manuscript/thesis/src/ch3.md` 吸收 |
| `claude/direction-todo-20261117` | `9afe6903b0368cd86ced367c3675bb4a7adc98e2` | 无 | 11 月 18 日的整合基准；主分支有 26 处固定提交链接指向它 |
| `claude/e3-quad-qwen` | `e96d41946ea84237da506bb76c2f713a3f3b9275` | #73 | 第四章 E3 证据的原分支，内容已在主分支；58 处固定提交链接 |
| `claude/extra-readings-20261117` | `e19a706fa3b91af651444cd680b0351e15516a55` | 无 | X/Y 两次判读，内容已在主分支 |
| `claude/gpu-tasks-20261117` | `ca4b5349dbfdda162357e0c676c085345bd46b60` | 无 | 局部编辑第二版登记，内容已在主分支 |
| `claude/r1-r3-design` | `e2dc0e6f0fe24e8bc66ee2573b719f96ae1f5ef8` | #60 | R1—R3 设计稿，从未执行 |
| `claude/thesis-docx` | `677f8bf0a9159b09c2efbf26e0e452dbe5f4b4ea` | #72 | 论文 Word 工作稿，源码已在主分支 |
| `claude/word-pairs-v1` | `dad19783e8e798f3974f896ccb95e4a298685162` | #62 | 词对 v1，整理 PR 已补回主分支 |
| `codex/advisor-study-system-20261118` | `a98b3ecdce0330902d9f5dd99336ce41e7fc993e` | #77 | 导师反馈后的研究框架，内容已在主分支；26 处固定提交链接 |
| `codex/e2r-human-review-20261115` | `5b1e4c6526011a94b078f1474dc24479285b600b` | 无 | 3 MB 评阅稿 Word，#3 第 23 题定为打标签后删分支 |
| `codex/multirotor-studio-20261118` | `f308b7e5630fd67f6ede84874084755e208bd22a` | #78 | Codex 11 月 18 日的工作台，已被 4.x 取代 |
| `codex/r1-render-freeze` | `370363c9deafc7aaaac3cb8e6dc2c49a85602d8f` | #54 | R1 的 24 份请求（新增 22 次、复用 E1 两张），R1 从未运行 |
| `codex/semantic-tools` | `62a00b13c4e6e637481befe4d6f2c3f372b1c93d` | #57 | E5 词对评分页，见第三步 #57，先不要删 |
| `codex/thesis-source-e2r-20261115` | `5f92248dd353075d83134c99c7d52383b96a6a48` | #74 | 论文源码合并稿，`5f92248` 的更正已在主分支；40 处固定提交链接 |
| `sync/missing-zips-20261120` | `7a265063caab4f3745e224afd9bf474bc094f72d` | 无 | 两个 ZIP 的 base64 分片，ZIP 已在主分支 |
| `tools/a8-html-download-20261120` | `ca9d71021ba7e0545c365ef847e5fb151e361f60` | 无 | 一次性的 Actions 打包工作流 |
| `tools/workbench-360-preview-20261121` | `6887f07e2068490c6c0849617842608de6210048` | 无 | 一次性的 Actions 打包工作流 |

**已经整个在主分支历史里的 24 个**（提交不会丢；打标签只为让 GitHub 网页上按分支名写的旧链接继续有效）：

| 分支 | 末提交 | PR |
| --- | --- | --- |
| `claude/c01-1111` | `310abbf60463a5736b1739578e7e2efe29812bac` | #17 |
| `claude/c01-review-1110` | `d6bbdc0b095e22652a475cad13e89be11a132bf9` | #15 |
| `claude/c01-review-1110b` | `a5291ff4c0c4c382eb6b23f1c47f40ac0755556f` | #16 |
| `claude/d2-addendum` | `f1b238b9e6aa8e1d63959fdfc0111c65848c4e4e` | #64 |
| `claude/d2-tuning` | `8170410dfa7b7ce01beabd66b7903f5f6e9a7788` | #63 |
| `claude/e3-spec-cards` | `5bbab1fcbb00a8f5efcd03bb1a60af84c410ac17` | #66 |
| `claude/foundation-v1` | `223513b95cab9acb3c40988cb9ab9abd5a027c5e` | #18 |
| `claude/freeze-v1-sec2` | `d3290ebbaccb1319ec1ee48365630a6e4cd1427f` | #70 |
| `claude/guide-prompt-spec` | `9781eff6468f5621d2f98cb0ef05a04e6c57804c` | #51 |
| `claude/l1-layout` | `4ffdd95206d6a724bd91d98159e1fef354144350` | #61 |
| `claude/method-freeze-v1` | `638db88bc08b1b828da88436d598061f3afe1ae4` | #68 |
| `claude/p1-param-prompt` | `2996f6bb25b0fcdc342685c3939a49a4dbc9db58` | #65 |
| `claude/roadmap-ch34` | `6d36c27b87740421d5c3179c1aa15dae79f6c1df` | #69 |
| `claude/semantic-to-e3` | `48e586f3dbaaf37b60f5377574d1030a8a1593b5` | #55 |
| `codex/e0-image26-blind-read` | `b4d46deb34634bfa32964a5b6e7cf178e3da93ed` | #53 |
| `codex/e1-actuals` | `eb575d44fec7b4d53f7766a3f5e8629dcbdf7a5a` | #58 |
| `codex/e1-design-audit` | `a53653b83d31bc2917b2d0fa26cd6cf903b627b4` | #59 |
| `codex/foundation-section8` | `0e732e0030096b347bada49b9a7f000a1e503bb9` | #50 |
| `codex/minimax-camera-roots` | `d147f61ab8ccbbf96e1987f8831f7b230f8c93c7` | #67 |
| `codex/pdf-library-20261119` | `d283025b67fb1bce93493ddc1dafa27de7f2ed58` | 无 |
| `codex/r0-e0-e1-freeze` | `b17fc126bcde75ac74012a7d69213e913457f1d5` | #52 |
| `codex/semantic-card-delivery` | `b720048d7316bee30ae77abc8cfdf474101fae43` | #56 |
| `sync/paper-reading-room-20261120` | `445c603e85a045832c8914c1723a9537c4521438` | #86 |
| `sync/paper-reading-room-full-20261120` | `f89b580384128cf3f3ee85a68c5392f21bebb7b7` | #87 |

## 第三步：关 PR（#98 合并之后）

| PR | 处理 | 关闭时的评论 |
| --- | --- | --- |
| #54 | 关 | R1 从未运行，按 11 月 18 日整理清单第二、三节只打标签存档。分支已存为同名标签 `codex/r1-render-freeze`。讨论原文见 archive/issues/pull-requests-20261124.md。 |
| #60 | 关 | R1—R3 从未执行，按整理清单第三节关闭。分支已存为同名标签 `claude/r1-r3-design`。 |
| #62 | 关 | 词对 v1 已由 #98 补回主分支：docs/protocols/word-pairs-v1-draft.md。正文与本分支相同；只有 1 处链接改了路径：T05 入选规则 `semantic-to-E3-spec.md` 已移入 archive，链接改为 `../../archive/docs/protocols/semantic-to-E3-spec.md`。所以文件哈希不同：本分支的 blob 是 48741698d7971935f941abde94f206dd8e835f0a，主分支上的是 46925b84ba529d137d72db976fa30637133045fa，两者都记在 evidence/20261120-branch-recovery/source-manifest-20261124.tsv。分支已存为同名标签。 |
| #71 | 关 | 3.2—3.3 节已被 manuscript/thesis/src/ch3.md 吸收，按整理清单第三节关闭。分支已存为同名标签。 |
| #72 | 关 | 论文源码 11 月 20—21 日已按文件补回主分支 manuscript/thesis/（取的是 11 月 18 日整合基准上的较新版本）。分支已存为同名标签。 |
| #73 | 关 | E3 证据 11 月 20—21 日已按文件补回主分支。本分支上主分支没有的另外 4 个文件由 #98 补回：两份协议（run-checklist.md、e5-cmf-addendum.md）取自本分支，preflight.py 与 approved-inputs.json 取 claude/gpu-tasks-20261117 上的较新版本。分支已存为同名标签。 |
| #74 | 关 | 5f92248 的更正已在主分支；本分支其余只在分支上的证据由 #98 补回。分支已存为同名标签。 |
| #77 | 关 | planning/advisor-20261118 已在主分支；只在本分支上的证据和 11 月 18 日的工单存档由 #98 补回。分支已存为同名标签。 |
| #78 | 关 | 工作台已由 4.x 取代（#96、#97）；本分支上只在这里的证据由 #98 补回。分支已存为同名标签。 |
| #57 | **先不关，问作者** | 11 月 18 日 #3 第 22 题定为合并（E5 词对评分页）。现在的主分支与它有冲突，要先只把 `experiments/rating-kit` 下的改动改到现在的主分支上；`prototypes/drone-configurator/public/research-guides/` 下的旧配置器页面不要带进来（工作台已重做）。作者若还要用这个评分页，交 Codex 照此重做成新 PR 后关掉 #57；不用了就打标签后关闭。 |
| #75 | Claude 已关 | 作者本人的 fork 账号开的，已被工作台 4.x 取代，Claude 已于 2026-11-24 关闭 |

## 第四步：删分支

第二步打过标签的 40 个：两张表里除 `codex/semantic-tools` 以外的全部。`codex/semantic-tools` 等 #57 有了结果再删。

删完以后远端只剩 `main`、`reference-fulltexts-20261109`（102 份文献原件，主分支上约 690 处链接按这个分支名指向它，长期保留）和暂留的 `codex/semantic-tools`。

## 第五步：工单

| 工单 | 处理 | 评论 |
| --- | --- | --- |
| #22 E3 | 关 | E3 三轮设计的证据已收进主分支 evidence/e3-quad-qwen-20261115，本工单正文与评论原文存于 archive/issues/open-issues-20261124.md。第 4 章 B2 的完整设计表达（D1：三视图或简模、主要尺寸、折叠方式、云台处剖面、CMF 说明、使用情境）还没有做，按蓝图 ⑧ 第 5 条和登记任务表 D1 继续跟踪，交到第 4 章 4.4 节，不因本工单关闭而结束。 |
| #3、#21、#23、#24、#25、#76 | 留着 | 11 月 18 日定的完成标准是只留这 6 个。它们 11 月 18 日以后没有新评论；存档快照在 archive/issues/open-issues-20261124.md |

## 第六步：核对结果

```bash
gh api repos/Freeloop993/paper/branches --paginate --jq '.[].name'
gh api repos/Freeloop993/paper/tags --paginate --jq '.[].name'
gh pr list --repo Freeloop993/paper --state open
gh issue list --repo Freeloop993/paper --state open
```

应该看到：分支 3 个（`main`、`reference-fulltexts-20261109`、`codex/semantic-tools`）；标签多出 41 个同名标签；开着的 PR 只剩 #57（和以后新开的）；开着的工单 6 个。

## 不在这份清单里的

Claude 账号自己的 fork（`lucienzhu/paper`）由 Claude 清理：已删 52 个并入或别处已有的旧分支；其中 3 个（`claude/canvas-workflow-ux-134e36`、`claude/workbench-redesign-20261122`、`claude/workbench-review-20261122`）在 PR #79、#96、#97 的说明里有 12 处按分支名写的链接，已在 fork 上补了同名标签，让这些网页上的链接继续有效。全部做完后，这份文件移入 `archive/planning/`，并从阅读清单删掉对应的那一行。
