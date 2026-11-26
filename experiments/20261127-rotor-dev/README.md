# 旋翼：开发小批（出图前写定，Claude，2026-11-27）

**为什么做。** 作者 2026-11-27 指出 S5 第 1、2 个种子的旋翼出错，并要求整张图都看。Claude 回头按[验收标准](../reading/acceptance-standard.md)重看：桨的毛病不是个别的。修正后的基准（BASE）第 2 个种子，四个电机上的两片桨叶都成 V 形，不是一条直线；其余几张也多是回旋镖形。另有三叶（配色小批 K2 第 1 个种子）、四叶（S5 第 2 个种子）。此前“双叶桨 4/4”只数了叶数，没看形状，判错了。

**原因的推测。** 工作台编译时把 v1.6 桨那一句删短了：留下 “The two blades point in exactly opposite directions from the hub.”，删掉了 “identical in length and width … forming one straight blade 180 degrees across, never a V shape; each propeller rests at its own natural angle”。相机的两句也是这样被删短后失效、改回原句才好的。

**对蓝图。** 冻结前的开发。旋翼是每一张图都有的部件，A2、A4、A5 的取点（电机中心、桨尖）也靠它；它不对，后面各批都不能用。开发图不进正式分母。

## 比什么

修正后的基准状态（工作台 4.6.0 取出的 BASE），同一组 4 个新种子（2026112851—54），三种做法，共 12 张：

| 做法 | 桨那一句 | 负向词 |
| --- | --- | --- |
| R0 现行 | Each motor carries one stationary 2-blade propeller, 5-inch (127 mm) diameter. The two blades point in exactly opposite directions from the hub. | 现行 19 个 |
| R1 改回 v1.6 的写法 | Each motor carries one stationary two-blade propeller, 5-inch (127 mm) diameter. The two blades of each propeller are identical in length and width and point in exactly opposite directions from the hub, forming one straight blade 180 degrees across, never a V shape; each propeller rests at its own natural angle. | 现行 19 个 |
| R2 再加叶数的负向词 | 同 R1 | 现行 19 个，加 three-blade propeller, four-blade propeller |

## 怎么看、怎么选（出图前写定）

- **每张图四副桨逐副看**（原分辨率）：叶数是 2；两片从桨毂向相反方向伸出，成一条直线（夹角不小于约 160°）；两片等长。四副都对，这张的旋翼记“对”。
- 同时按验收标准把整张图其余各项都看一遍，逐张记。
- **规则：** 4 张里旋翼“对”的至少 3 张，这种做法才可取。可取的里面选改动小的（R1 先于 R2）。都不可取，再改写法出下一小批。其余各项不能因为改了桨这一句而变坏（BASE 检查小批里成立的各项仍至少 3/4）。
- 选出的写法写进工作台，改版本号。

## 第一个种子的情形和第二小批（2026-11-27 01:27，第一小批还在出时写定）

第一个种子的三张（R0、R1、R2）出来了：三张的桨仍然都是 V 形。改回 v1.6 的长句、再加叶数的负向词，在这个种子上都没用。其余三个种子出完再记全；先把下一步备好，接在后面跑。

**推测。** 模型把小型航拍机的桨画成折叠桨（两片各自铰接在桨毂上，停着时收成 V 形），这是它对这类产品的成见；只说“两片相反方向”压不住。换一个说法：直说是一体的、不能折的桨。

**第二小批，8 张**（种子同第一小批 2026112851—54，逐张对照）：

| 做法 | 桨那一句 | 负向词 |
| --- | --- | --- |
| R3 | Each motor carries one rigid, one-piece two-blade propeller, 5-inch (127 mm) diameter, not a folding propeller: seen from above it is a single straight bar through the hub, its two blades exactly opposite each other and equal in length. | 现行 19 个 |
| R4 | 同 R3 | 现行 19 个，加 folding propeller, hinged propeller blades, three-blade propeller, four-blade propeller |

判法和规则同上：四副桨逐副看，4 张里至少 3 张旋翼“对”才可取；R3 先于 R4。

## 第一小批的情形（01:41，12 张里出了 11 张）和第三小批

四个种子、三种做法，已出的 11 张桨全是两片成 V 形；叶数都是 2，没有多叶。**R0、R1、R2 都不可取**（最后一张出完再把表记全）。v1.6 的长句和叶数负向词都压不住 V 形。第二小批（直说一体、不能折的桨）接着跑。

再备一手，接在第二小批后面：**把桨画进条件图。** 文字压不住的，交给条件图去管（布局就是这样管住的）。

**第三小批，4 张**（种子同前 2026112851—54）：

| 做法 | 条件图 | 文字 |
| --- | --- | --- |
| R5 | 工作台的条件图上，过每个电机的红点加一根浅灰的直杆（3 像素宽，长 305 像素，即 127 mm 的桨径；方向与机臂垂直），位置一个像素不动 | 桨那一句用第二小批的（一体、不能折）；条件图读法那一句改为：“Match the motor centres and frame links in the attached layout image: dots mark motor centres, lines from the centre mark frame links, and the straight bar across each dot marks that motor's propeller. Do not reproduce the dots, lines or bars as drawn; render real parts in their place.” |

判法和规则同上（4 张里至少 3 张旋翼“对”）。另看：桨有没有照直杆的方向和长度出来；有没有把直杆当成别的部件画出来（残留）。R5 要改条件图的画法，比改句子动得大：只有第二小批的 R3、R4 都不可取时才考虑写进工作台。

## 第一小批的结果（2026-11-27 01:43 出齐，12 张）

逐张按[整张图的标准](../reading/acceptance-standard.md)看过（总览图加原图）。旋翼一栏四副桨逐副看。

| 图 | 旋翼 | 其余各项 | 判 |
| --- | --- | --- | --- |
| R0-s1 | 四副都是 V 形（两片夹角明显小于 180°） | 视图、布局、流线舱、内嵌相机（机头前缘一条深色窗）、不设起落架、机身机臂银灰、桨炭黑、背景都对 | 不合格 |
| R0-s2 | 四副 V 形 | 同上 | 不合格 |
| R0-s3 | 四副 V 形 | 同上 | 不合格 |
| R0-s4 | 四副 V 形 | 同上 | 不合格 |
| R1-s1 | 四副 V 形 | 同上 | 不合格 |
| R1-s2 | 四副 V 形 | 同上 | 不合格 |
| R1-s3 | 四副 V 形 | 同上 | 不合格 |
| R1-s4 | 四副 V 形 | 同上 | 不合格 |
| R2-s1 | 四副 V 形 | 同上 | 不合格 |
| R2-s2 | 四副 V 形 | 同上 | 不合格 |
| R2-s3 | 四副 V 形 | 同上 | 不合格 |
| R2-s4 | 四副 V 形 | 同上 | 不合格 |

**按规则：** R0 0/4，R1 0/4，R2 0/4，三种做法都不可取。叶数 12 张都是双叶，没有多叶、缺叶。

**看到的另一件事：** 同一个种子的三张几乎是同一张图（机身、机臂、桨的位置和角度都一样）。也就是说，只改桨那一句、只加负向词，对这条流程出的图几乎没有影响；V 形是模型对“小型消费级折叠机”这副样子的固有画法（折叠桨收拢时就是这个形状）。所以下一步不再只在句子的措辞上打转：第二小批直说“不是折叠桨”，第三小批把桨画进条件图。

## 第四小批（探路，2026-11-27 01:50 写定，第二、三小批还在出）

第二小批第一张（R3-s1，直说“一体、不是折叠桨”）出来了：仍是 V 形，和第一小批同种子的图几乎一样。

**回头读全文，找到两处“折”字：** 工作台编出的视图句里固定带着 “arms fully unfolded”；第二小批的桨句里又写了 “not a folding propeller”。文生图模型不大会读否定，句子里有 fold 这个词，就可能把整机往折叠机上带，而折叠机的桨停着时正是这个 V 形。第一到第三小批的文字里都带着 “unfolded”。

**第四小批，8 张**（4 种做法 × 2 个种子 2026112851、52，和前面逐张对照；负向词都是现行 19 个）：

| 做法 | 改了什么 |
| --- | --- |
| R6 | 全文不出现 fold：视图句改为 “…arms fully extended in the flight-ready state.”；桨句改为 “Each motor carries one rigid two-blade propeller, 5-inch (127 mm) diameter, moulded as a single straight piece: seen from above it is one straight bar through the hub, its two blades exactly opposite each other and equal in length.” |
| R7 | 同 R6，再把桨句提到任务句后面（第三行），看位置有没有用 |
| R8 | 同 R6，桨句末尾加 “, like the propeller of a model aeroplane” |
| R9 | 同 R6，再用第三小批那张画了直杆的条件图和那一句读法 |

**这是探路，不是定案：** 每种做法只出 2 个种子。两个种子的四副桨都“对”的做法，才补出另外两个种子（53、54）；定案的门不变，仍是 4 张里至少 3 张旋翼“对”，其余各项不变坏。可取的里面选改动小的（R6 先于 R7、R8，先于 R9）。

**提前停的规则（同时写定）：** 一种做法在 4 个种子里已有 2 张不对，就到不了 3/4，剩下的不必出完。
