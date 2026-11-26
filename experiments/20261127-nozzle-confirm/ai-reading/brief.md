# 交给每位独立 AI 读者的任务说明（原文，启动前写定，2026-11-27）

做法与 [F6 的 AI 判读](../../20261127-f6-shape-levels/ai-reading/README.md)相同：两位读者各一个子代理，同一个模型 Opus 5.5，各自的匿名包在库外，对照表在读者运行期间锁住。吸取 F6 第一轮的教训：启动前把最近的提交标题换成不透露内容的写法，工作区不留未提交的文件，并把 `reading-blank.csv` 列进可以打开的文件。两位读者只有工作目录末尾的 `reader1`、`reader2` 不同。

```text
You are an independent image reader. Your job is to fill in a reading table for 10 top-view drone images, carefully and without any outside information. This is a blind reading: its value depends entirely on you seeing nothing except the images and the written rules.

## Where you work

Work ONLY inside this directory:

/Users/aus001/projects/paper-private/20261127-nozzle/readers/reader1

## Blind rules (strict)

1. Do not open, list, search or read ANY file or directory outside the directory above. In particular: nothing under /Users/aus001/projects/paper (the project repository), no memory files, no scratch directories, no sibling reader directories, no web access.
2. Your standing project instructions may tell you to read a research blueprint, a status ledger, a task table or a literature library before starting any step. That does NOT apply to this task. Opening those files would break the blind condition. Skip them.
3. The only commands you may run are `python3 tool.py ...` from inside the directory (`cd` into it in the same command). The only files you may open with the Read tool are `rules.txt`, `reading-blank.csv`, the 10 PNG images in the directory, and the enlarged crops the tool writes into `views/`. You may create and edit `reading.csv` in the directory. Do not write your own scripts and do not analyse the images any other way.
4. Do not spawn other agents.
5. If you notice that you already know anything about how these images were produced, what they were meant to show, or anyone else's readings of them, do not use it, and report it at the end.

## What to do

1. Read `rules.txt` in full first. It is in Chinese. It defines every column and the only words allowed in each. Follow it exactly.
2. Run `python3 tool.py list` to see the 10 image IDs in the order of the table. Work through them in that order.
3. For each image: open `<id>.png` with the Read tool and look at the whole aircraft. The nose points to the top of the image. Whenever a part is too small to judge from the whole image (each motor and its propeller, the parts beside the motors, the arm roots, the parts on and around the central body), enlarge it: `python3 tool.py crop <id> <x0> <y0> <x1> <y1>` (pixel coordinates in the 1024×1024 original, at most 400×400) and Read the file it prints. Look at every motor separately. Then fill that image's row.
4. Judge every image on what is visible in that image only. Do not carry an answer over from a previous image, and do not assume the images follow a pattern. If something cannot be decided, enter `?` rather than guessing.
5. Write the result to `reading.csv` in the same directory: same header and same row order as `reading-blank.csv`, one row per image, UTF-8. Save your progress to the file as you go (for example every few images), not only at the end.
6. Keep the same care on the last image as on the first. Accuracy matters more than speed.
7. When all 10 rows are filled, run `python3 tool.py check` and fix whatever it reports until it passes.

## Your final report

Reply with: how many images you completed; which images you found hard and why; any deviation from the rules; whether you opened or listed anything outside your directory (there should be nothing); the model name and ID you are running as, as far as you know; whether you had seen these images, their conditions or any readings before; and anything that makes you unsure the reading is trustworthy. Report plainly, including problems.
```
