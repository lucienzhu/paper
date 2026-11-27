# 交给每个独立 AI 取点实例的任务说明（原文，启动前写定，2026-11-27）

两位读者，每位的 30 张分成两份（各 15 张），一个子代理实例做一份，共四个实例；同一个模型 Opus 5.5（A8 取点校准过的那一个）。四个实例只有工作目录末尾的 `readerN/batchM` 不同。读数包在库外，目录名不透露内容；对照表在读者运行期间锁住；启动前最近的提交标题换成不透露内容的写法。

```text
You are an independent measurement reader. Your job is to mark reference points on each of 15 top-view drone images and answer two questions per image, carefully and without any outside information. This is a blind reading: its value depends entirely on you seeing nothing except the images and the written rules.

## Where you work

Work ONLY inside this directory:

/Users/aus001/projects/paper-private/20261127-pack-d/readers/reader1/batch1

## Blind rules (strict)

1. Do not open, list, search or read ANY file or directory outside the directory above. In particular: nothing under /Users/aus001/projects/paper (the project repository), no memory files, no scratch directories, no sibling reader or batch directories, no web access.
2. Your standing project instructions may tell you to read a research blueprint, a status ledger, a task table or a literature library before starting any step. That does NOT apply to this task. Opening those files would break the blind condition. Skip them.
3. The only commands you may run are `python3 tool.py ...` from inside the directory (`cd` into it in the same command). The only files you may open with the Read tool are `rules.txt` and the images the tool writes into `views/`. Do not write your own scripts and do not analyse the images any other way: every step has to go through the tool so that it is logged.
4. Do not spawn other agents.
5. If you notice that you already know anything about how these images were produced, what values they were meant to hit, or anyone else's readings of them, do not use it, and report it at the end.

## What to do

1. Read `rules.txt` in full first. It is in Chinese. It defines the points and the two questions. Follow it exactly.
2. Run `python3 tool.py` with no arguments to see the commands, then `python3 tool.py list` to see the 15 image IDs. Work through them in that order.
3. For each image, a workable routine is:
   - `look <id>` and Read the view to get rough positions (the view has a coordinate grid; it is offset by a 30-pixel margin, the grid labels give the true pixel coordinates).
   - `hubs <id> x,y x,y x,y x,y` (order: top-left, top-right, bottom-right, bottom-left as they appear in the picture) and Read the sheet. The crosshair shows where your candidate sits. Adjust and repeat (use `zoom <id> <x> <y> 40 x,y` for one hub) until each crosshair sits on the centre of the hub cap or centre screw, to within about one pixel. Do not settle for "close".
   - `set <id> tl=.. tr=.. br=.. bl=..`. The tool then prints the row y on which the left and right body edges must be taken.
   - `band <id> <row y> <x0> <x1>` around the body to find where that row crosses the central body's left and right edges; refine with `vals <id> row <y> <x0> <x1>` to see the pixel values. Then `set <id> left=<x> right=<x>`.
   - For each propeller, find the tip of one blade (the pixel of that blade farthest from its own motor centre; if both blades are clear take the one whose tip is farther). Use `zoom` on the tip to place it exactly. Then `set <id> tip_tl=x,y tip_tr=x,y tip_br=x,y tip_bl=x,y`.
   - `answer <id> connected=yes|no|? product=yes|no|?` per the rules.
   - `show <id>` and Read the overlay as a last check. Fix anything that is off.
4. If a point cannot be decided under the rules, do not guess: `blank <id> <point>[,<point>] "reason in Chinese or English"`.
5. Keep the same care on the last image as on the first. Accuracy matters more than speed. Do not copy coordinates from one image to another.
6. When all 15 are done, run:
   `python3 tool.py finish --model "<the model name and ID you are running as, as far as you know>" --exposure "<whether you had seen these images, their conditions or any readings before; say 'none' if none>" --deviations "<any place you departed from the rules, or 'none'>" --hard "<image IDs that were hard to judge and why, or 'none'>"`
   It refuses to finish if any point is neither recorded nor blanked or a question is unanswered.

## Your final report

Reply with: how many images you completed; which points you left blank and why; any image you found hard; any deviation from the rules; whether you opened or listed anything outside your directory (there should be nothing); and anything that made you unsure the reading is trustworthy. Report plainly, including problems.
```
