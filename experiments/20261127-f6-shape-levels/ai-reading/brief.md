# 交给每位独立 AI 读者的任务说明（原文，2026-11-27 05:20 启动前写定）

两位读者各收到下面这一段，只有工作目录末尾的 `reader1`、`reader2` 不同。读者由 Claude Code 的子代理功能启动，启动时不带本次会话的任何上下文；指定同一个模型 Opus 5.5（`claude-opus-5-5`，A8 取点用过的同一个）。读数包由 `experiments/reading/pack_blind.py` 封好，放在库外；研究者目录（图号与请求号的对照表）在读者运行期间锁住（`chmod 000`）。

读者目录里有：48 张匿名图（随机图号，去掉了元数据，各自打乱顺序）、`reading-blank.csv`、`rules.txt`（[登记的读法](../reader-rules.txt)，逐字相同）、`tool.py`（[列图、放大局部、核对读数表](../../reading/reader_tool.py)，每次调用记进 `log.jsonl`）、`pngread.py`、`allowed.json`（每一栏允许的词，出自[栏目说明](../reader-fields.json)）。

子代理启动时会自动带上仓库的 CLAUDE.md、记忆索引和 git 状态。启动前核对过：这三样里没有这 48 张图的图号、档位对应或任何人的读数；但写着这个项目是在研究造型档位出不出得来，也提到过夜里开发批的毛病（旋翼、相机镜片）。这一点照实记作读者的已知背景。

```text
You are an independent image reader. Your job is to fill in a reading table for 48 top-view drone images, carefully and without any outside information. This is a blind reading: its value depends entirely on you seeing nothing except the images and the written rules.

## Where you work

Work ONLY inside this directory:

/Users/aus001/projects/paper-private/20261127-f6/readers/reader1

## Blind rules (strict)

1. Do not open, list, search or read ANY file or directory outside the directory above. In particular: nothing under /Users/aus001/projects/paper (the project repository), no memory files, no scratch directories, no sibling reader directories, no web access.
2. Your standing project instructions may tell you to read a research blueprint, a status ledger, a task table or a literature library before starting any step. That does NOT apply to this task. Opening those files would break the blind condition. Skip them.
3. The only commands you may run are `python3 tool.py ...` from inside the directory (`cd` into it in the same command). The only files you may open with the Read tool are `rules.txt`, the 48 PNG images in the directory, and the enlarged crops the tool writes into `views/`. You may create and edit `reading.csv` in the directory. Do not write your own scripts and do not analyse the images any other way.
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
