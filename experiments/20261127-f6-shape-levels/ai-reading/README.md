# F6 的 AI 判读记录

## 第一轮（2026-11-27 05:20—05:33）：读者交回了，但盲读条件有破口，这一轮单列、不作登记的那一份

两位读者（Opus 5.5，各一个子代理，[任务说明](brief.md)）各读完 48 张，`tool.py check` 通过。两位在最后的报告里都写了同一件事：

> 子代理启动时自动带上的上下文里有仓库最近几条提交的标题。标题里写着这是“F6 确认批”、48 张、“旋翼 48/48，整张图 46/48”，还有一条写着 S2 有两张顶盖出了横缝。

读者不知道哪几张是 S2，也说没有用它；读者 1 自己的判断是“顶盖一栏不算完全盲读”。**这是 Claude 的疏漏**：启动前核对了 CLAUDE.md 和记忆索引，没有核对最近的提交标题；而夜里的提交标题一直写得很细。

读者另外报告的两处偏离：读者 1 中途把一张图的相机从“下挂”改成“内嵌”，理由是“和别的几张一致”（读法要求每张只凭这一张判）；读者 1 打开了 `reading-blank.csv`、读者 2 没有打开它（说明里没把它列进可以打开的文件）。

**处理（在解开对照表、看任何计分之前定下，05:40）：**

1. 第一轮的两份读数原样留着，计分单列，标明“启动上下文里有本批的提交标题”，不作为登记的 AI 读数，也不用它选 F1 的父图。
2. 重新匿名、重新打乱，另起两位读者做第二轮。启动前把最近的提交标题换成不透露内容的写法（细节写进提交正文），工作区不留未提交的文件；逐条核对子代理会带上的三样东西（CLAUDE.md、记忆索引、git 状态）。
3. 任务说明只改一处：把 `reading-blank.csv` 列进可以打开的文件。别的一字不改。
4. 两轮都用逐行记录核对读者实际做过的每一次工具调用（有没有碰过自己目录以外的东西），结果写在这一页。

第二轮的记录接在下面。

## 第二轮（重新匿名、重新打乱；读者目录 `readers-round2/reader1`、`reader2`）

任务说明原文（与第一轮只差两处：工作目录；可以打开的文件里加了 `reading-blank.csv`）：

```text
You are an independent image reader. Your job is to fill in a reading table for 48 top-view drone images, carefully and without any outside information. This is a blind reading: its value depends entirely on you seeing nothing except the images and the written rules.

## Where you work

Work ONLY inside this directory:

/Users/aus001/projects/paper-private/20261127-f6/readers-round2/reader1

## Blind rules (strict)

1. Do not open, list, search or read ANY file or directory outside the directory above. In particular: nothing under /Users/aus001/projects/paper (the project repository), no memory files, no scratch directories, no sibling reader directories, no web access.
2. Your standing project instructions may tell you to read a research blueprint, a status ledger, a task table or a literature library before starting any step. That does NOT apply to this task. Opening those files would break the blind condition. Skip them.
3. The only commands you may run are `python3 tool.py ...` from inside the directory (`cd` into it in the same command). The only files you may open with the Read tool are `rules.txt`, `reading-blank.csv`, the 48 PNG images in the directory, and the enlarged crops the tool writes into `views/`. You may create and edit `reading.csv` in the directory. Do not write your own scripts and do not analyse the images any other way.
4. Do not spawn other agents.
5. If you notice that you already know anything about how these images were produced, what they were meant to show, or anyone else's readings of them, do not use it, and report it at the end.

## What to do

1. Read `rules.txt` in full first. It is in Chinese. It defines every column and the only words allowed in each. Follow it exactly.
2. Run `python3 tool.py list` to see the 48 image IDs in the order of the table. Work through them in that order.
3. For each image: open `<id>.png` with the Read tool and look at the whole aircraft. The nose points to the top of the image. Whenever a part is too small to judge from the whole image (the four arm roots, the camera at the nose, seams on the top cover), enlarge it: `python3 tool.py crop <id> <x0> <y0> <x1> <y1>` (pixel coordinates in the 1024×1024 original, at most 400×400) and Read the file it prints. Look at each of the four arm roots separately. Then fill that image's row.
4. Judge every image on what is visible in that image only. Do not carry an answer over from a previous image, and do not assume the images follow a pattern. If something cannot be decided, enter `?` rather than guessing.
5. Write the result to `reading.csv` in the same directory: same header and same row order as `reading-blank.csv`, one row per image, UTF-8. Save your progress to the file as you go (for example every few images), not only at the end.
6. Keep the same care on the last image as on the first. Accuracy matters more than speed.
7. When all 48 rows are filled, run `python3 tool.py check` and fix whatever it reports until it passes.

## Your final report

Reply with: how many images you completed; which images you found hard and why; any deviation from the rules; whether you opened or listed anything outside your directory (there should be nothing); the model name and ID you are running as, as far as you know; whether you had seen these images, their conditions or any readings before; and anything that makes you unsure the reading is trustworthy. Report plainly, including problems.
```

### 第二轮的经过和盲读条件核对（2026-11-27 05:47—05:59）

两位读者（Opus 5.5）各读完 48 张，`tool.py check` 通过。

- **启动上下文**：启动前最近五条提交的标题都换成了不透露内容的写法。两位读者报告的已知背景只有自动带上的项目说明、记忆索引和 git 状态（提到一个“构型开发”的图目录和这是个出图研究），都说里面没有这些图的图号、条件或读数，此前没见过这些图。**这一轮作为登记的 AI 读数。**
- **工具调用逐条核对**（[audit.json](audit.json)，四位读者依次是第一轮读者 1、2，第二轮读者 1、2）：四位都打开了全部 48 张原图，各放大 106—116 次；**没有一次调用碰到自己目录以外的东西**。
- **读者自己报告的偏离**：第二轮读者 1 用命令行往 `reading.csv` 里追加行（说明只许运行 `tool.py`；写的只是自己的读数）；读者 2 误跑了一条空的 `python3` 命令；读者 2 中途把两张图的相机从“内嵌”改成“下挂”，为的是和自己定的同一条界线一致。两位都说：相机“内嵌 / 下挂”和臂根“承座 / 铰链”有不少图落在两类的边界上，是按自己定的一条线判的。

## 结果（按登记第四节，每位读者、每一档分开算，分母 8；全部 48 张，不挑图）

读数（已对上请求号）：`round2-reader1-by-request.csv`、`round2-reader2-by-request.csv`；计分输出 [score-round2.json](score-round2.json)。第一轮的同样留档（`round1-…`、[score-round1.json](score-round1.json)），单列。对照表在真人读数回来以前不进仓库。

### 第二轮（登记的 AI 读数）

| 档 | 改的那一项 | 读者 1：命中 / 基准误判 | 读者 2：命中 / 基准误判 | 两位都达到？ |
| --- | --- | --- | --- | --- |
| S1 | 机身轮廓 → 方正机壳 | 8/8，0/8：达到 | 8/8，0/8：达到 | 是 |
| S2 | 臂根 → 外露承座 | 4/8，0/8：**未达到**（另 4 张读成铰链） | 6/8，0/8：达到（另 2 张读成铰链） | 否 |
| S3 | 臂根 → 折叠铰接 | 8/8，0/8：达到 | 8/8，0/8：达到 | 是 |
| S4 | 相机 → 机鼻下挂 | 8/8，**7/8：未达到** | 8/8，2/8：达到 | 否 |
| S5 | 顶盖 → 多块 | 8/8，0/8：达到 | 8/8，0/8：达到 | 是 |

- **S2 和 S3 互相读错**：S2 被读成铰链 4 张（读者 1）、2 张（读者 2）；S3 没有一张被读成承座。
- **基准（S0）被读成基准**：机身 8/8、8/8；臂根 7/8、7/8（都有 1 张填看不清）；顶盖 8/8、8/8；**相机 1/8、5/8**。
- **相机这一栏两位读者的一致率只有 24/48**；别的栏：机身 48/48、臂根 44/48、顶盖 46/48、是否完整产品 48/48、相机在哪一端 48/48（都在上端）、有没有朝上的镜片 47/48（都读成没有，1 张看不清）。
- **非目标保持**：顶盖在 S2 里是 5/8、5/8（两位都把 r07、r08 读成两块，另有一两张读成多块或看不清），和研究者验收时看到的两张横缝一致；S4 里顶盖 7/8、6/8。相机在各非相机档里：读者 1 只有 1—2/8 读成内嵌，读者 2 是 5—7/8。
- 48 张两位都读成完整的产品；没有一张读出朝上的镜片。

### 第一轮（启动上下文里有本批的提交标题，单列）

| 档 | 读者 1 | 读者 2 |
| --- | --- | --- |
| S1 | 8/8，0/8：达到 | 8/8，0/8：达到 |
| S2 | 4/8，0/8：未达到（4 张读成铰链） | 4/8，0/8：未达到（4 张读成铰链） |
| S3 | 8/8，0/8：达到 | 8/8，0/8：达到 |
| S4 | 8/8，1/8：达到 | 8/8，**8/8：未达到** |
| S5 | 8/8，0/8：达到 | 8/8，0/8：达到 |

相机一栏两位的一致率 15/48；“有没有朝上的镜片”11/48（读者 2 把机鼻上的深色窗带多读成了朝上的镜片）。

### 这些读数说明什么、不说明什么

1. **方正机壳（S1）、折叠铰接（S3）、多块顶盖（S5）：** 四位 AI 读者（两轮）全部 8/8 命中、0 误判。在 AI 读数上这三档“出得来”。真人读数未到。
2. **外露承座（S2）：** 命中 4—6/8，读不成承座的都读成了铰链。承座和铰链在图上分得不够开；S3 反过来没有被读成承座。
3. **机鼻下挂（S4）：** 四位读者都把 S4 的 8 张读成下挂、没有一张读出朝上的镜片：夜里修的那一句是管用的。**分不开的是基准这一头**：内嵌相机的窗带常带着一道檐或略微外凸，四位读者里有两位把基准的 7—8 张也读成了下挂，另两位是 1—2 张。相机这一栏读者之间的一致率只有三分之一到一半。按登记的判据，S4 只有一半读者记“达到”。这正是重新登记时写在“没有验证的”里的那一条。
4. 这是 AI 读数。登记的判据要两名有设计背景的真人；两位真人都达到的档位，5.2.1 才写“出得来”。
5. **F1 的父图**（登记的规则：S0 里按种子顺序第一张两位 AI 读者都读成“流线舱、无缝、内嵌机鼻、单盖”且机头端没有读错的）：按第二轮的读数是 **F6-S0-r08**（r01 两位的臂根都填了看不清；r02—r07 至少一位把相机读成下挂或看不清）。

**要不要因此再改内嵌相机的写法，不由 Claude 定。** 这是确认批量出来的结果，不是开发批里的毛病：照实报告。改写法意味着基准变了，F6 要重出；这要作者看过真人读数以后决定。
