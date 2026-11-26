# 分部件配色：开发小批（出图前写定，Claude，2026-11-26）

**为什么做。** 作者 2026-11-26 指出工作台配色的一个缺陷（原话）：“the whole aircraft is entirely black in one go, but with that many real machine photos, it can't possibly be one uniform color across the board — that's a small bug. It should be designed with per-part colors instead.” 工作台现在只有一个“主色”，编成一句 “Main shell colour: …”；选了深色，整机连机臂、电机、桨都成了一个颜色。真实产品不是这样。要改成按部件配色。

**对蓝图。** 这是工作台色材这一层的设计修正（作者定的设计方向），在冻结前做。色材对应词对“低调—醒目”，交到 3.4.2（造型变量）和 4.5（工具实现）；这批开发图不进任何正式分母。

## 比什么

同一个状态（F6 的 S0 基准，工作台 4.5.3 取出），只换颜色那一句；同一组 4 个新种子（2026112821—24），三种写法，共 12 张：

| 写法 | 颜色那一句 |
| --- | --- |
| K0 现行，只有主色 | Main shell colour: charcoal black (#1e293b). |
| K1 只给机身色，写明只管机身 | Body shell colour: charcoal black (#1e293b). The arms, motors and propellers are separate parts in their own colours, not the shell colour. |
| K2 四个部件各给一个颜色 | Colours by part: body shell charcoal black (#1e293b); arms silver grey (#c7cbd1); motors neutral grey (#8a9095); propellers white (#ffffff). |

选炭黑是因为作者看到的问题就出在深色上。K2 的四个颜色故意拉开，看每个部件是不是各归各的。

## 怎么看、怎么选（出图前写定）

- **每张图判两项。** 一、整机是不是一个颜色（机身、机臂、电机、桨四样都同色记“一色”）。二、只对 K2：四个部件各自是不是登记的颜色，逐部件记对或不对。
- **谁看：** 开发门。Claude 知条件地逐张看并写下判断；总览图交给作者，作者的判断为准。
- **规则：** K0 预期多数“一色”，它只作对照。K2 的 4 张里，四个部件都对的至少 3 张，分部件配色才写进工作台；K1 的 4 张里“一色”的不超过 1 张，“只选机身色”时才用 K1 的写法，否则只选机身色时在界面上提示把其余部件也选上。
- **不能变坏的：** 四个电机、四根机臂、完整的产品；相机这一项另有[相机开发小批](../20261126-camera-dev/README.md)，这里不判。
- 写法定了以后写进工作台（机臂、电机、桨各加一个颜色项），改版本号，各批请求重新取出。
