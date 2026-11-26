# 造型选项：开发小批（出图前写定，Claude，2026-11-27）

**为什么做。** F6 是确认性的读数，但造型选项在工作台这条流程上从没先开发过就直接跑了，头 14 张就暴露出基准不稳。基准修好了（[检查小批](../20261127-baseline-check/README.md)）。五个档位在修好的流程上出不出得来，也要先看一小批，再跑确认。这就是蓝图里“先开发、过门、再确认”的开发那一步（A4→A5、F1→F2 都是这样）。

**对蓝图。** RQ2b“造型档位出得来吗”，5.2.1。这批是开发图，不进正式分母；确认批（F6）用新种子、由不知条件的读者读。

## 比什么

修正后的基准上，五个档位各只改一项（与 F6 的档位相同，[states.json](states.json)，从工作台 4.6.0 取出），同一组 3 个新种子（2026112841—43），共 15 张：

| 档 | 改的一项 | 看什么 |
| --- | --- | --- |
| S1 | 机身轮廓改为方正机壳 | 机壳侧边平直、转角是切角 |
| S2 | 臂根改为外露承座 | 四处臂根有独立的承座和横向接缝 |
| S3 | 臂根改为折叠铰接 | 四处臂根有看得见的铰链或转轴 |
| S4 | 相机改为机鼻下挂 | 机鼻前缘探出一个小的相机舱体，没有长颈或立柱 |
| S5 | 顶盖改为多块 | 顶盖上有三块或更多盖板，之间有分缝 |

## 怎么看（出图前写定）

- 每张判：这一档改的那一项出没出来（出来、没出来、拿不准）；其余几项是不是还和基准一样（相机内嵌、单盖、无缝臂根、流线舱，除去这一档改的那项）；顶视、机头朝上、四个电机、完整的产品、没有起落架的脚、配色照登记的。
- Claude 知条件地逐张写下；每一档一张总览图交给作者，作者的判断为准。出一档看一档，不等全部出完。
- **规则：** 一档的 3 张里至少 2 张“出来”，这一档进确认批。不到 2 张的，先改这一档的句子再出一小批；改了仍出不来的，照实写“这个选项在这条流程上出不来”，不进确认批，工作台里这个选项要标明或去掉。

## 头两档的结果和第二小批（2026-11-27，第一小批还在出后三档时写定）

出一档看一档。S4、S5 的 6 张出来了，总览图 [overview-S4-S5.png](overview-S4-S5.png)，S4 的机鼻裁图 [nose-crops-S4.png](nose-crops-S4.png)。Claude 知条件的判断（作者的判断为准）：

| 档 | 改的那一项 | 其余 |
| --- | --- | --- |
| S4 机鼻下挂 | 3/3 机鼻前缘都探出一个深色的相机舱体：出来了 | **3/3 的镜头都正对着观察者**。相机该朝机头前方，顶视里不该看见镜片。作者最早说的“朝上、和视角对不上”就是这个 |
| S5 多块顶盖 | 3/3 顶盖上都有分缝；但“三块或更多”只有第 2 个种子是，第 1、3 个种子是两块：1/3，不到 2 张 | 第 2 个种子的桨是四叶（要的是双叶） |

**原因和改法：**

- S4：工作台编译时把 v1.6 原句里讲镜头朝向的那半句删了（“the lens faces straight forward toward the top edge of the image, so no lens glass is visible from above”）。改回 v1.6 的原句，和“内嵌机鼻”那一句的处理一样。
- S5：现在的句子就是 v1.6 的原句（“Three or more distinct top cover panels separated by seams.”），出来的多是两块。换一个把块数和缝的走向写明的句子。

**第二小批，6 张**（种子同第一小批的 2026112841—43，便于逐张对照；接在第一小批后面跑）：

| 组 | 改的那一句 |
| --- | --- |
| S4b | The gimbal camera hangs underneath the front of the fuselage, as on modern foldable camera drones. Seen from directly above, only the top edge of a small dark grey camera housing peeks out just ahead of the nose; the lens faces straight forward toward the top edge of the image, so no lens glass is visible from above. The camera sits low and tight against the nose, with no neck, stalk or post. |
| S5b | The top cover is divided into three separate panels by two transverse seams: a nose cap, a centre cover and a rear cover. |

**怎么看：** S4b：舱体探出，且看不见正对观察者的镜片，两样都成立才算“出来”。S5b：顶盖上数得出三块或更多。规则照上面：3 张里至少 2 张。过了的句子写进工作台；S5b 是新写的句子，写进去以前请作者看图定。

## 按整张图的标准重看（2026-11-27 01 时，作者指出 S5 第 1、2 个种子的旋翼出错）

此前只看了每一档改的那一项。按[验收标准](../reading/acceptance-standard.md)把已出的图整张重看（知条件），旋翼几乎都不对：

| 图 | 旋翼 |
| --- | --- |
| S4 三张 | 两片桨叶成 V 形或回旋镖形，不是一条直线 |
| S5-s1 | V 形 |
| S5-s2 | 每个电机四片桨叶 |
| S5-s3 | V 形 |
| S2-s1、S2-s3 | V 形 |
| S2-s2 | 两片深色桨叶之外还多出一片浅色的 |
| S3-s1 | 每个电机四片桨叶 |

- 旋翼的毛病是整条流程的，不是哪一档的：先做[旋翼开发小批](../20261127-rotor-dev/README.md)，修好以后各档要在修好的流程上再出一小批，整张图验收，才谈得上进确认批。
- 各档改的那一项，已出的几张里：S2 三张的臂根都有圆形的承座（第 1 张较弱）；S3 第 1 张臂根有铰链块。后三档出完再记全。

## 第一小批的验收（2026-11-27 01:16 出完；整张图逐项看，知条件）

15 张都出了。总览图：[S4、S5](overview-S4-S5.png)、[S2、S3（部分）](overview-S2-S3.png)、[S3、S1（部分）](overview-S3-S1.png)、[S1](overview-S1.png)。15 张共同的：正交顶视、机头朝上、四个电机四根机臂、机身和机臂银灰、桨叶深色、看不到起落架、背景干净、没有条件图颜色残留（程序量，0/15）、都是完整的产品。

| 图 | 这一档改的那一项 | 旋翼 | 其余不对的 |
| --- | --- | --- | --- |
| S4-s1 | 出来：机鼻前缘探出深色舱体 | 不对：V 形 | 相机镜头正对观察者 |
| S4-s2 | 出来 | 不对：V 形 | 镜头正对观察者；顶盖上有两道纵向的线 |
| S4-s3 | 出来 | 不对：V 形 | 镜头正对观察者 |
| S5-s1 | 没出来：两块 | 不对：V 形 | |
| S5-s2 | 出来：三块 | 不对：四叶 | |
| S5-s3 | 没出来：两块 | 不对：V 形 | |
| S2-s1 | 拿不准：臂根只有小的接头 | 不对：V 形 | |
| S2-s2 | 出来：四处臂根有圆形承座 | 不对：多出一片浅色桨叶 | |
| S2-s3 | 出来：承座带凸缘 | 不对：V 形 | |
| S3-s1 | 出来：四处臂根有铰链块 | 不对：四叶 | |
| S3-s2 | 出来 | 不对：V 形 | |
| S3-s3 | 出来 | 不对：V 形 | |
| S1-s1 | 出来：侧边平直、转角切角 | 不对：V 形 | |
| S1-s2 | 出来 | 不对：多出细的桨叶 | |
| S1-s3 | 出来 | 不对：V 形 | |

**按写定的门（每档 3 张里至少 2 张“出来”）：**

| 档 | 出来的张数 | 门 |
| --- | --- | --- |
| S1 方正机壳 | 3/3 | 过 |
| S2 外露承座 | 2/3，另 1 张拿不准 | 过 |
| S3 折叠铰接 | 3/3 | 过 |
| S4 机鼻下挂 | 舱体 3/3，但镜头朝向 0/3 | 没过：第二小批改句子 |
| S5 多块顶盖 | 1/3 | 没过：第二小批改句子 |

**整张图合格的：0/15，全卡在旋翼上。** 旋翼是流程的毛病，[旋翼开发小批](../20261127-rotor-dev/README.md)接着跑。各档要等旋翼和 S4、S5 的句子定了，在修好的流程上再出一小批、整张图验收过了，才进确认批。

## 更正：旋翼一栏重判（2026-11-27 02 时）

上面两张表的“旋翼”一栏是在缩略图上看的，**把斜着摆的直桨也记成了 V 形**。用 [rotors.py](../reading/rotors.py) 量过、裁图逐副看过以后（经过见[旋翼开发小批的更正](../20261127-rotor-dev/README.md)）：

| 旋翼 | 图 |
| --- | --- |
| 对（四副都是直的双叶） | S1-s3、S2-s3、S3-s2、S3-s3、S4-s1、S4-s2、S4-s3（一副差 12°，在边上）、S5-s3（一副差 10°） |
| 不对：V 形（差 80°—90°） | S1-s1、S2-s1、S5-s1 |
| 不对：多叶 | S1-s2、S3-s1、S5-s2 |
| 不对：两片深色桨叶之外多一对浅色的 | S2-s2 |

旋翼不对的是 15 张里 7 张（第 1 个种子 5 张里 4 张，第 2 个种子 3 张，第 3 个种子 0 张），不是 15 张。**整张图合格的是 4/15**（S1-s3、S2-s3、S3-s2、S3-s3），不是 0/15；S4 三张卡在镜头朝向，S5-s3 的顶盖是两块。各档“改的那一项”的门不受影响。结论不变：旋翼仍是整条流程的毛病，要在开发批里修好。

## 第二小批没有出；第三小批（2026-11-27 03:02 写定，出图前）

**第二小批（S4b、S5b，旧流程、旧种子）登记了没有出。** 两句直接写进了工作台 4.7.0（S4b 去掉了 “dark grey”，工作台自检不许模板自带颜色），放在[合在一起的检查小批](../20261127-integrated-check/README.md)里用新种子看，省一轮。

**检查小批里已出的两个种子：** S5（写明三块、两道横缝）第 1 个种子出了清楚的三块；S4（v1.6 的原句）两张都是舱体探出，但**镜头仍正对观察者**。S4 的 3 张里已有 2 张不对，过不了门。v1.6 的原句里“lens”“lens glass”出现了三次，都在否定句里；文生图模型不大会读否定，提到镜片就容易画出镜片（旋翼那里“not a folding propeller”也是这样）。

**第三小批，6 张**（[build_round3.py](build_round3.py)；基准是 4.7.0 的 S4 请求，种子同检查小批 2026112861—63，逐张对照）：

| 组 | 改了什么 |
| --- | --- |
| S4c | 下挂那一句换成不提相机和镜片、只说顶视里看得见什么的写法：“A small gimbal pod hangs underneath the front of the fuselage. Seen from directly above, only the smooth, featureless top of the pod shows, as a short rounded block just ahead of the nose, low and tight against it, with no neck, stalk or post; its optics face forward and are hidden in this view.” |
| S4d | 同 S4c，再把每张图都有的那句相机总述也换成不提镜片的：“The camera looks horizontally forward from the nose, toward the top edge of the image, so its optics are hidden in this view; nothing camera-like appears at the tail.” |

**怎么看：** 机鼻前缘探出一个小舱体，且顶视里看不见正对观察者的镜片，两样都成立才算“出来”；其余各项照整张图的标准。**规则：** 3 张里至少 2 张“出来”才可取；两组都可取选改动小的（S4c 先于 S4d）。S4d 动了每张图都有的那一句，取它的话要把基准和其余各档再出一小批看有没有变坏。两组都不可取，照实写“机鼻下挂在这条流程的顶视图里出不来不露镜片的样子”，F6 的 S4 一档怎么办交作者定（F6 其余五档不等它）。

## 第三小批的结果和第四小批（2026-11-27 03:25 写定，第三小批出了 4 张时）

第三小批头两个种子的 4 张（S4c、S4d 各 2 张）：镜片没有了，但**舱体也没有了**，机鼻就是一个光的圆头，看不出下挂相机。“只见舱体光滑的顶面”这种写法，模型干脆什么都不画。S4c、S4d 各已有 2 张“没出来”，到不了 2/3，按 STOP 停下（第 3 个种子的两张不出）。S4c 和 S4d 的图几乎一样：每张图都有的那句相机总述不是症结，以后只动“相机安装”那一句。

到这里知道的：提“camera housing”，舱体出来、镜头朝上（4.6 的短句 3/3，v1.6 的原句 3/3）；不提，舱体不出来（4/4）。

**第四小批，6 张**（[build_round4.py](build_round4.py)；基准、种子同第三小批）：

| 组 | “相机安装”那一句 |
| --- | --- |
| S4e | 仍叫 gimbal pod，但写明它是探出机鼻的一个独立部件，并给出大小：“…juts out ahead of the nose as a separate part. Seen from directly above, the top of the pod is visible as a small rounded block, clearly distinct from the shell and about one third as wide as the nose, protruding just beyond the nose's front edge … The top of the pod is a plain smooth cap; its optics face forward and are hidden in this view.” |
| S4f | 留着能把舱体叫出来的“camera housing”，把否定镜片的半句换成正面描述顶面：“…only the top edge of a small camera housing peeks out just ahead of the nose; the top of the housing is a plain closed cap. The camera looks straight forward toward the top edge of the image …” |

判法和规则同第三小批（舱体探出且看不见正对观察者的镜片；3 张里至少 2 张）。两组都不可取的话，S4 的开发今晚到此为止：照实写明，交作者定（见 [F6 重新登记](../20261127-f6-shape-levels/README.md)第三节的约束）。

**补一条取舍（03:31，第四小批只出了第 1 个种子时写定）：** 两组都可取的话选改动小的。S4f 只是把 v1.6 原句里否定镜片的半句换成正面描述，离原句最近，先于 S4e。第 1 个种子上两组都“出来”了（S4e 是一个银灰的圆角小块，S4f 是一个深色的云台舱体，顶面都没有镜片）。

## 第四小批的结果（2026-11-27 03:37，6 张；整张图逐项看，知条件）

总览 [round4/overview.png](round4/overview.png)（上排 S4f 三个种子，下排 S4e）；机鼻原分辨率裁图 [round4/noses.png](round4/noses.png)。第三小批最后一张（S4c-s3）也是光的圆头：S4c 0/3，S4d 0/2。

| 图 | 舱体探出 | 正对观察者的镜片 | 旋翼 | 其余 | 判 |
| --- | --- | --- | --- | --- | --- |
| S4f-s1 | 有：深色云台舱体贴着机鼻前缘 | 没有 | 四副直的双叶 | — | 出来，合格 |
| S4f-s2 | 有：银灰舱体，两侧是云台电机 | 没有 | 直 | — | 出来，合格 |
| S4f-s3 | 有：同上 | 没有 | 直 | — | 出来，合格 |
| S4e-s1 | 有：一个银灰的圆角小块 | 没有 | 直 | 机尾有一个小凸起 | 出来 |
| S4e-s2 | 有 | 没有 | 直 | — | 出来，合格 |
| S4e-s3 | 有 | 没有 | 直 | **机尾多出一个像相机的部件** | 出来，但整张图不合格 |

**按写定的规则：** S4f 3/3、S4e 3/3，两组都过“至少 2 张”；按 03:31 写定的取舍取 **S4f**（离 v1.6 原句最近；整张图也是它干净）。S4f 写进了工作台 4.7.1（只改“机鼻下挂”这一个选项的句子；全套检查 12 步通过）。核对过：4.7.1 下 S0、S1、S2、S3、S5 的请求与 4.7.0 的逐项相同，4.7.1 编出的 S4 文字与这一小批的 S4f 逐字相同。

**到此五个档位都过了开发门**：S1 方正机壳、S2 外露承座、S3 折叠铰接、S5 多块顶盖在[合在一起的检查小批](../20261127-integrated-check/README.md)里各 3/3，S4 机鼻下挂在这里 3/3（同一组种子）。F6 确认批 48 张照[重新登记](../20261127-f6-shape-levels/README.md)出。

**这几轮学到的一条写法：** 文生图模型不读否定。句子里出现镜片（“no lens glass is visible”），镜片就出来；句子里出现折叠桨（“not a folding propeller”），桨就往折叠的画。要它不出现的东西不要提，改成正面描述顶视里看得见的是什么。
