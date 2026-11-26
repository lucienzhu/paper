// 工作台的起始设计值，和研究登记的实验条件，分开登记在这一个文件里。
// 起始设计值：打开空白项目、点「重置参数」时看到的数，取自真实产品量测。改它不影响任何实验。
// 实验条件：已经做完或已经登记的实验所用的数。只能照登记的来，不随起始设计值变。
import type { DroneParameters } from '../types/DroneParameters.ts';
import { sha256Bytes } from './sha256.ts';

/**
 * 32 款真实四旋翼产品图上的量测（S5 评议用图）。中位数和四分位，判读者一；括号外的数两位判读者相近：
 * W/L 1.35 与 1.34，机身宽/D 0.23 与 0.22，机身长/宽 2.76 与 2.63，d/D 0.58 与 0.56。
 * 逐款数值：experiments/s5-compactness-pilot/geometry/metrics.csv；四分位按不含端点的算法，与此前各处记录一致。
 */
export const realQuadrotors = {
  n: 32,
  source: 'experiments/s5-compactness-pilot/geometry/metrics.csv',
  wl: { q1: 1.17, median: 1.35, q3: 1.50 },
  bodyWidthOverD: { q1: 0.18, median: 0.23, q3: 0.29 },
  bodyLengthOverWidth: { q1: 2.38, median: 2.76, q3: 3.59 },
  dOverD: { n: 30, q1: 0.53, median: 0.58, q3: 0.62 },
} as const;

/**
 * 四旋翼的起始设计值。
 * W/L 取中位数 1.35。机身宽 55 mm 是轴距 250 mm 的 0.22，机身长 150 mm 是宽的 2.73 倍：
 * 两个数都在两位判读者的中位数之间（0.22–0.23、2.63–2.76），也落在界面滑块的 5 mm 刻度上。
 * 轴距 250 mm 和桨径 5 英寸没有动：前者是论文规格卡的设定，后者同时是实验档 d/D 0.50。
 */
export const designStart = {
  frame_type: 'Wide X', span_ratio_wl: 1.35, wheelbase_mm: 250,
  fuselage_dimensions_mm: { length: 150, width: 55, height: 30 },
} as const satisfies { frame_type: DroneParameters['frame']['frame_type']; span_ratio_wl: number; wheelbase_mm: number;
  fuselage_dimensions_mm: DroneParameters['fuselage']['fuselage_dimensions_mm'] };

/** 3.5.0 及以前的起始值。留着只为核对旧导出，界面不再使用。 */
export const legacyStart = {
  frame_type: 'True X', span_ratio_wl: 1, wheelbase_mm: 250,
  fuselage_dimensions_mm: { length: 100, width: 80, height: 30 },
} as const;

export interface StudyCondition {
  id: string;
  label: string;
  /** 登记了哪几项。没有登记的项（例如机身尺寸）不动。 */
  frame: { frame_type: DroneParameters['frame']['frame_type']; span_ratio_wl: number; wheelbase_mm: number };
  note: string;
  source: string;
}

/** 研究登记的实验条件。 */
export const study = {
  /** 工作台研究层载入的三档布局比例（预试条件）。旧路径的批次按这三档读过数，那些数据 2026-11-26 已移出；A4、A5 按自己登记的档位。 */
  wlLevels: [0.7, 1.0, 1.3],
  /** d/D 的三档。 */
  ddLevels: [0.4, 0.5, 0.6],
  conditions: [{
    id: 'c2-pilot',
    label: 'C2 作者预试',
    frame: { frame_type: 'True X', span_ratio_wl: 1, wheelbase_mm: 250 },
    note: '正交顶视、四轴等宽等长（W/L 1.00）、对角轴距 250 mm。主持人的登记工具只收符合这三项的规格。',
    source: 'planning/advisor-20261118/pilot-bridge/README.md；capture.py 对规格的检查',
  }] as StudyCondition[],
};

export interface StudyBrief {
  id: 'A' | 'B';
  label: string;
  /** 设计者收到的原文，两种方式一字不改。 */
  text: string;
  /** 这张委托要看的部位，以及要保持的部位。 */
  target: string; keep: string;
  /** 跟这张委托配套的登记条件（机架三项）。 */
  condition: string;
  source: string;
}

/**
 * RQ3 两种方式对照用的两张委托（C2 作者预试与 C3 正式场次共用）。原文照抄研究资料库的预试页，不改字。
 * 两张都是日常随行航拍四旋、展开顶视求紧凑，配套 C2 的机架三项（真 X、W/L 1.00、对角轴距 250 mm）。
 * 两张卡难度是否接近，要作者两场实际走过后确认（预试记录约定）。
 */
export const studyBriefs: StudyBrief[] = [
  { id: 'A', label: '委托 A · 机鼻', target: '前向相机与机鼻的衔接', keep: '四处机臂与机身的连接', condition: 'c2-pilot',
    text: '为日常随行航拍设计一款四旋翼，展开俯视时希望整体显得紧凑。请让前向相机与机鼻衔接协调，并保持四处机臂与机身的连接。你可以保留、修订或回选候选，结束时指出所选方案与理由。',
    source: 'planning/research-library/design/pilot.md（第四章四旋 C2 作者配对预试）' },
  { id: 'B', label: '委托 B · 臂根', target: '四处臂根与机身轮廓的过渡', keep: '前向相机与机鼻的关系', condition: 'c2-pilot',
    text: '为日常随行航拍设计一款四旋翼，展开俯视时希望整体显得紧凑。请让四处臂根与机身轮廓过渡协调，并保持前向相机与机鼻的关系。你可以保留、修订或回选候选，结束时指出所选方案与理由。',
    source: 'planning/research-library/design/pilot.md（第四章四旋 C2 作者配对预试）' },
];

/**
 * 两组共用的“用户依据摘要”（预试记录约定 11 月 22 日修订：同一份任务简报含同一份用户依据摘要）。
 * 两种方式在委托原文下面显示同一个版本；场次记录和本场材料写明版本和摘要，原文按版本可在这里查到。
 * v0 是 Claude 11 月 23 日按登记的主题表（semantics/topics.mjs）挑出的草稿：原话一字不改，括号里照证据卡的限制写能说明和不能说明的。
 * 选哪几条、怎样措辞由作者定；作者确认前 status 为 draft，界面和清单都写明“草稿，作者未确认”。
 */
const summaryText = [
  '以下是公开评论里和“小巧”“少一些外挂件”有关的用户原话，原样摘录；括号里写这条原话能说明什么、不能说明什么。',
  '1.「机身小巧便携」（E001：小巧与携带的自述，推不出机身长宽比或毫米尺寸）',
  '2.「Fit easily in a tank bag or small bag」（E003：小包携带的自述，不能推广到所有口袋）',
  '3.「it folds down small enough to toss in a day pack」（E009：说的是折叠以后，旅行推荐语境，不是亲测尺寸）',
  '4.「加了保护罩以后大了一圈」（E007：加装防护件以后的整套外形，不是原厂裸机的大小）',
  '5.「如果可以集成进机身内部是最好的了」（E016：希望少一些外挂件的愿望，不说明内置是否可行）',
  '没有一条用户原话专门说“展开俯视”时的大小；相机与机鼻、臂根与机身怎样衔接，也没有直接的用户原话。',
].join('\n');
export const evidenceSummary = {
  version: 'v0-20261123',
  status: 'draft' as 'draft' | 'confirmed',
  label: '用户依据摘要',
  text: summaryText,
  cards: ['E001', 'E003', 'E009', 'E007', 'E016'],
  source: 'src/data/evidenceCards.json；挑选依据 src/design/semantics/topics.mjs（compactness、bag_fit、accessory_outline、accessory_integration）',
  sha256: sha256Bytes(new TextEncoder().encode(summaryText)),
};

/** 登记的场次限额：每场 15 分钟主动操作、至多 9 次生成机会、至多 9 张回图（C1 登记，2026-11-22 修订后不变）。 */
export const sessionLimits = { activeMinutes: 15, opportunities: 9, images: 9 } as const;

/** 当前规格是否符合某个登记条件。 */
export function meetsCondition(parameters: DroneParameters, condition: StudyCondition, wl: number) {
  return parameters.frame.frame_type === condition.frame.frame_type
    && Math.abs(wl - condition.frame.span_ratio_wl) < 0.001
    && Math.abs(parameters.frame.wheelbase_mm - condition.frame.wheelbase_mm) < 0.01;
}
