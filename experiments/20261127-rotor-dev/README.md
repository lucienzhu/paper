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
