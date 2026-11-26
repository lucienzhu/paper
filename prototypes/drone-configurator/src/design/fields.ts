// 参数登记表：每个可选项的中文名、所在页签、显示值、能否在顶视图中看到，以及当前属于哪种状态。
// 页签、当前选择清单、对照表和导出都读这一张表。
import type { DesignIntent, DroneParameters, ParameterGroup, WordPairId } from '../types/DroneParameters.ts';
import { effectiveWl, frameRules, taskLabels, topologyOf } from './design.ts';

export interface Option<T extends string = string> { value: T; zh: string; en?: string; hint?: string }

export const armRootOptions: Option<DroneParameters['frame']['arm_root']>[] = [
  { value: 'seamless', zh: '无缝过渡', en: 'Each arm grows out of the shell through a smooth seamless blend, with no joint line at the root.' },
  { value: 'socket', zh: '外露承座', en: 'Each arm enters a distinct socket at the shell, with a visible transverse joint seam.' },
  { value: 'hinge', zh: '折叠铰接', en: 'Each arm is attached to the shell by a visible folding hinge with a pivot pin.' },
];
/**
 * 农业植保的药箱与喷洒部件。英文句子沿用已出过图的请求原文，hint 写明这一项在本研究里出过多少图：
 * 半嵌入药箱和横向喷杆是六旋 39 张（HEXA3 等）用的原句；电机下方喷头是 11 月 15 日开发批 E6B-N 的原句（3 张，开发门 3/3）；
 * 药箱收进机身的写法本研究还没出过图。机尾横杆在同一开发批里 0/3，没有放进来。
 */
export const sprayTankOptions: Option<NonNullable<DroneParameters['accessories']['spray_tank']>>[] = [
  { value: 'half-embedded', zh: '方形药箱半嵌入机身', hint: '箱顶和圆形加注口外露。六旋 39 张用的就是这一句',
    en: 'A square spray tank sits half-embedded in the central frame: the frame wraps the lower half of the tank, while the tank top and its round filler cap stay exposed.' },
  { value: 'enclosed', zh: '药箱收进机身', hint: '顶上只露加注口。本研究还没出过图',
    en: 'The spray tank is enclosed inside the central body shell; from above only its round filler cap shows on top of the body.' },
];
export const spraySystemOptions: Option<NonNullable<DroneParameters['accessories']['spray_system']>>[] = [
  { value: 'boom', zh: '横向喷杆', hint: '机身下方横穿，两端伸出机架。六旋 39 张用的就是这一句',
    en: 'A transverse spray boom runs across under the body and extends beyond both sides of the frame.' },
  { value: 'motor-nozzles', zh: '电机下方喷头', hint: '不要喷杆，每个电机下一个喷头。开发批 3 张里 3 张可辨，还没做确认',
    en: 'There is no spray boom. Instead, one small round spray nozzle is mounted directly below each of the six motors, its dark nozzle tip just visible beside the motor from above.' },
];
/** 药箱与喷洒部件只对农业植保有意义：其他任务既不显示，也不写进文字。 */
export const agriculturalFields = ['accessories.spray_tank', 'accessories.spray_system'] as const;

/**
 * 机臂的表面外观。4.4 起按看上去的样子叫（作者 11 月 24 日：真实材料远不止四种，这四项只是外观预设）；
 * 取值和发给出图模型的英文句子不变，旧项目照样读。其他局部纹理写进色材层的说明。
 */
export const armMaterialOptions: Option<DroneParameters['frame']['material_visual']>[] = [
  { value: 'Carbon Fiber', zh: '外露碳纹', hint: '看得见编织纹', en: 'Arms in exposed carbon fibre with a visible weave.' },
  { value: 'Aluminum', zh: '拉丝金属', hint: '细密的拉丝纹', en: 'Arms in brushed aluminium.' },
  { value: 'ABS Plastic', zh: '细纹注塑', hint: '均匀的细砂纹', en: 'Arms in moulded ABS plastic with a fine even texture.' },
  { value: 'PLA Plastic', zh: '打印层纹', hint: '看得见一层层的打印纹', en: 'Arms in printed PLA plastic with visible layer lines.' },
];
export const fuselageStyleOptions: Option<DroneParameters['fuselage']['fuselage_style']>[] = [
  { value: 'Aerodynamic Pod', zh: '流线舱', en: 'A rounded pod with a continuous curved outline.' },
  { value: 'Boxy Enclosure', zh: '方正机壳', en: 'A box-shaped shell with straight sides and clipped corners.' },
  { value: 'Faceted Compact', zh: '切面壳', en: 'A faceted shell: a rounded outline cut by chamfered facets with crisp edges.' },
];
/** 早期选项，只为读取旧配置保留，页签中不再列出。 */
export const legacyFuselageStyles: Option<DroneParameters['fuselage']['fuselage_style']>[] = [
  { value: 'Exposed Stack', zh: '裸露堆叠（旧）', en: 'An exposed electronics stack held between flat plates.' },
  { value: 'Minimalist Plate', zh: '极简平板（旧）', en: 'A minimalist flat plate body.' },
];
export const topCoverOptions: Option<DroneParameters['fuselage']['top_cover']>[] = [
  { value: 'single', zh: '单盖', en: 'A plain top cover with no seams crossing it.' },
  { value: 'two', zh: '两段', en: 'The top cover is divided by one curved transverse parting line into a nose cap and a main cover.' },
  { value: 'multi', zh: '多块', en: 'Three or more distinct top cover panels separated by seams.' },
];
export const cameraMountOptions: Option<DroneParameters['accessories']['camera_mount']>[] = [
  {
    value: 'flush', zh: '内嵌机鼻', hint: '从正上方只见机鼻前缘一条窗带',
    // 4.6：改回 v1.6 字典的原句（thin dark strip，另加朝向那一句）。真机开发小批里，这一句连同 4 个相机负向词一起用，基准的相机 4/4 内嵌。
    en: 'The camera sits inside the nose, flush with the shell; from directly overhead only a thin dark strip of its front window shows at the very front edge of the nose. The camera faces horizontally forward.',
  },
  {
    value: 'underslung', zh: '机鼻下挂', hint: '从正上方只见舱体前缘略微探出',
    en: 'The gimbal camera hangs underneath the front of the fuselage; from directly above only the top edge of a small camera housing peeks out just ahead of the nose, low and tight against it, with no neck, stalk or post.',
  },
];
export const finishOptions: Option<DroneParameters['accessories']['surface_finish']>[] = [
  { value: 'matte', zh: '细砂哑光', en: 'Shell surface finish: fine matte.' },
  { value: 'satin', zh: '缎面', en: 'Shell surface finish: smooth satin.' },
  { value: 'gloss', zh: '高光', en: 'Shell surface finish: high gloss with crisp reflections.' },
  { value: 'metallic', zh: '金属漆', en: 'Shell surface finish: metallic paint with a fine flake sheen.' },
  { value: 'textured', zh: '细纹理', en: 'Shell surface finish: a fine textured grain.' },
];
export const gearOptions: Option<DroneParameters['landing_gear']['landing_gear_style']>[] = [
  { value: '无独立起落架', zh: '无独立起落架', hint: '以机腹或臂端着地' },
  { value: '低矮滑撬/支腿', zh: '低矮滑撬/支腿', hint: '贴近机腹的短支撑' },
  { value: '高脚起落架', zh: '高脚起落架', hint: '离地间隙较大' },
  // 4.4：脚架做在机臂末端、电机正下方，像部分折叠航拍机（例如 DJI Mavic Air，用户手册第 8 页）。以前只有挂在机腹的两种。
  { value: '臂端一体脚架', zh: '臂端一体脚架', hint: '做在机臂末端、电机正下方' },
];
export const colourSwatches: { value: string; zh: string; en: string }[] = [
  { value: '#0ea5e9', zh: '天空蓝', en: 'sky blue' },
  { value: '#1e293b', zh: '炭黑', en: 'charcoal black' },
  { value: '#ffffff', zh: '纯白', en: 'white' },
  { value: '#8a9095', zh: '中性灰', en: 'neutral grey' },
  { value: '#f97316', zh: '橙红', en: 'orange' },
  { value: '#10b981', zh: '翠绿', en: 'emerald green' },
  { value: '#7c3aed', zh: '深紫', en: 'deep purple' },
  { value: '#f59e0b', zh: '金黄', en: 'golden yellow' },
  { value: '#ec4899', zh: '玫红', en: 'rose pink' },
  { value: '#6b8fb5', zh: '雾霾蓝', en: 'dusty blue' },
  { value: '#1e3a5f', zh: '深海蓝', en: 'navy blue' },
  { value: '#c7cbd1', zh: '银灰', en: 'silver grey' },
  { value: '#c8b48a', zh: '沙丘色', en: 'sand beige' },
  { value: '#6b7a3a', zh: '橄榄绿', en: 'olive green' },
];
export const colourName = (hex: string) => colourSwatches.find(c => c.value.toLowerCase() === hex.toLowerCase());

export const wordPairs: { id: WordPairId; left: string; right: string; leftEn: string; rightEn: string; hint: string }[] = [
  {
    id: 'compact', left: '紧凑', right: '舒展',
    leftEn: 'seen from directly above with the arms unfolded, the aircraft should read as visually compact',
    rightEn: 'seen from directly above with the arms unfolded, the aircraft should read as open and spread out',
    hint: '指展开状态顶视下的视觉感受，是待检验的目标。折叠体积、重量和携带体验另需证据；证据卡不给出毫米数或比例，可到「机身」页对照机身宽/D。',
  },
  {
    id: 'simple', left: '简洁', right: '繁复',
    leftEn: 'the top surface should read as simple, with few visible parts',
    rightEn: 'the top surface should read as rich in visible parts and detail',
    hint: '评论里的“简洁”多未指明部位；落到顶盖分件是设计者的转译。',
  },
  {
    id: 'integrated', left: '整体', right: '拼凑',
    leftEn: 'arms, camera and body should read as one integrated piece',
    rightEn: 'arms, camera and body should read as clearly separate assembled parts',
    hint: '落到臂根过渡与相机安装是设计者的转译。',
  },
  {
    id: 'visible', left: '低调', right: '醒目',
    leftEn: 'the overall appearance should stay understated',
    rightEn: 'the overall appearance should be eye-catching and easy to spot',
    hint: '颜色由设计者在「配件」页决定；这里只记录意图。',
  },
];

export type FieldStatus = 'fixed' | 'default' | 'chosen' | 'open';
export const statusLabel: Record<FieldStatus, string> = { fixed: '任务固定', default: '默认值', chosen: '你的选择', open: '不指定' };
/** top＝顶视可见且示意图已画；text＝示意图不画，只进文字；occluded＝顶视被遮挡，见侧视示意。 */
export type Visibility = 'top' | 'text' | 'occluded';
export const visibilityLabel: Record<Visibility, string> = { top: '顶视可见', text: '仅进文字', occluded: '顶视遮挡' };

export interface FieldDef {
  path: string;
  group: ParameterGroup;
  label: string;
  kind: 'engineering' | 'styling' | 'custom';
  visibility: Visibility;
  format: (p: DroneParameters) => string;
  relevant?: (p: DroneParameters) => boolean;
}

const opt = (options: Option[], value: string) => options.find(o => o.value === value)?.zh ?? (value || '不指定');
const colourText = (hex: string) => (hex ? `${colourName(hex)?.zh ?? '自定义'} ${hex}` : '不指定');

export const fields: FieldDef[] = [
  { path: 'frame.frame_type', group: 'frame', label: '构型', kind: 'engineering', visibility: 'top', format: p => frameRules[p.frame.frame_type].zh },
  { path: 'frame.wheelbase_mm', group: 'frame', label: '轴距', kind: 'engineering', visibility: 'top', format: p => p.frame.wheelbase_mm + ' mm' },
  {
    path: 'frame.span_ratio_wl', group: 'frame', label: '横纵跨度比 W/L', kind: 'engineering', visibility: 'top',
    format: p => effectiveWl(p.frame).toFixed(2), relevant: p => frameRules[p.frame.frame_type].wl.adjustable,
  },
  { path: 'frame.arm_width_mm', group: 'frame', label: '机臂宽度', kind: 'engineering', visibility: 'top', format: p => parseInt(p.frame.arm_width_mm, 10) + ' mm' },
  { path: 'frame.arm_thickness_mm', group: 'frame', label: '机臂厚度', kind: 'engineering', visibility: 'occluded', format: p => parseInt(p.frame.arm_thickness_mm, 10) + ' mm' },
  { path: 'frame.arm_root', group: 'frame', label: '臂根过渡', kind: 'styling', visibility: 'text', format: p => opt(armRootOptions, p.frame.arm_root) },
  { path: 'frame.material_visual', group: 'frame', label: '机臂表面外观', kind: 'styling', visibility: 'text', format: p => opt(armMaterialOptions, p.frame.material_visual) },
  { path: 'propulsion.prop_diameter_inch', group: 'propulsion', label: '桨径', kind: 'engineering', visibility: 'top', format: p => `${p.propulsion.prop_diameter_inch} 英寸（${(p.propulsion.prop_diameter_inch * 25.4).toFixed(0)} mm）` },
  { path: 'propulsion.prop_blade_count', group: 'propulsion', label: '每轴桨叶数', kind: 'engineering', visibility: 'top', format: p => parseInt(p.propulsion.prop_blade_count, 10) + ' 叶' },
  { path: 'propulsion.motor_tilt_degree', group: 'propulsion', label: '电机倾角', kind: 'engineering', visibility: 'text', format: p => p.propulsion.motor_tilt_degree + '°' },
  { path: 'propulsion.prop_guard', group: 'propulsion', label: '桨叶护圈', kind: 'engineering', visibility: 'top', format: p => (p.propulsion.prop_guard === 'ring' ? '环形护圈' : '不加护圈') },
  { path: 'fuselage.fuselage_dimensions_mm.length', group: 'fuselage', label: '机身长', kind: 'engineering', visibility: 'top', format: p => p.fuselage.fuselage_dimensions_mm.length + ' mm' },
  { path: 'fuselage.fuselage_dimensions_mm.width', group: 'fuselage', label: '机身宽', kind: 'engineering', visibility: 'top', format: p => p.fuselage.fuselage_dimensions_mm.width + ' mm' },
  { path: 'fuselage.fuselage_dimensions_mm.height', group: 'fuselage', label: '机身高', kind: 'engineering', visibility: 'occluded', format: p => p.fuselage.fuselage_dimensions_mm.height + ' mm' },
  { path: 'fuselage.fuselage_style', group: 'fuselage', label: '机身轮廓', kind: 'styling', visibility: 'top', format: p => opt([...fuselageStyleOptions, ...legacyFuselageStyles], p.fuselage.fuselage_style) },
  { path: 'fuselage.top_cover', group: 'fuselage', label: '顶盖分件', kind: 'styling', visibility: 'top', format: p => opt(topCoverOptions, p.fuselage.top_cover) },
  { path: 'landing_gear.landing_gear_style', group: 'landing_gear', label: '起落架样式', kind: 'engineering', visibility: 'occluded', format: p => p.landing_gear.landing_gear_style },
  {
    path: 'landing_gear.landing_gear_height_mm', group: 'landing_gear', label: '离地高度', kind: 'engineering', visibility: 'occluded',
    format: p => p.landing_gear.landing_gear_height_mm + ' mm', relevant: p => p.landing_gear.landing_gear_style !== '无独立起落架',
  },
  { path: 'accessories.has_camera_gimbal', group: 'accessories', label: '前视相机', kind: 'engineering', visibility: 'occluded', format: p => (p.accessories.has_camera_gimbal ? '装相机' : '不装相机') },
  {
    path: 'accessories.camera_mount', group: 'accessories', label: '相机安装', kind: 'styling', visibility: 'occluded',
    format: p => opt(cameraMountOptions, p.accessories.camera_mount), relevant: p => p.accessories.has_camera_gimbal,
  },
  // 农业植保才有这两项：起始值里没有这两个键的规格（其他任务）不显示、不导出。
  {
    path: 'accessories.spray_tank', group: 'fuselage', label: '药箱', kind: 'styling', visibility: 'top',
    format: p => opt(sprayTankOptions, p.accessories.spray_tank ?? ''), relevant: p => p.accessories.spray_tank !== undefined,
  },
  {
    path: 'accessories.spray_system', group: 'accessories', label: '喷洒部件', kind: 'styling', visibility: 'top',
    format: p => opt(spraySystemOptions, p.accessories.spray_system ?? ''), relevant: p => p.accessories.spray_system !== undefined,
  },
  { path: 'accessories.drone_primary_color', group: 'accessories', label: '主色', kind: 'styling', visibility: 'top', format: p => colourText(p.accessories.drone_primary_color) },
  // 4.6：按部件配色。真实产品不是整机一个颜色；主色管机身外壳，机臂、桨叶各有一项（电机颜色真机上控不住，不设）。
  { path: 'accessories.arm_color', group: 'accessories', label: '机臂颜色', kind: 'styling', visibility: 'top', format: p => colourText(p.accessories.arm_color ?? '') },
  { path: 'accessories.prop_color', group: 'accessories', label: '桨叶颜色', kind: 'styling', visibility: 'top', format: p => colourText(p.accessories.prop_color ?? '') },
  { path: 'accessories.surface_finish', group: 'accessories', label: '表面处理', kind: 'styling', visibility: 'text', format: p => opt(finishOptions, p.accessories.surface_finish) },
  {
    path: 'accessories.custom_prompt_additions', group: 'accessories', label: '补充文字', kind: 'custom', visibility: 'text',
    format: p => p.accessories.custom_prompt_additions.trim() || '未填写',
  },
];
export const fieldByPath = Object.fromEntries(fields.map(f => [f.path, f])) as Record<string, FieldDef>;

export const groupLabel: Record<ParameterGroup, string> = {
  frame: '机架', propulsion: '动力', fuselage: '机身', landing_gear: '起落架', accessories: '配件',
};

/** 任务固定条件：不随页签改变，始终写入提示词。 */
export const taskFixed = [
  { label: '设计任务', value: '日常随行航拍四旋翼' },
  { label: '电机数量', value: '4 个，每个电机一副桨' },
  { label: '视图', value: '展开状态正交顶视，机头朝上' },
  { label: '相机朝向', value: '朝机头前方，水平；顶视可被遮挡' },
];

export function taskConditions(p: DroneParameters, intent: DesignIntent) {
  const task = intent.taskId ?? 'consumer_camera';
  const type = p.frame.frame_type;
  const topology = topologyOf(type);
  const quad = topology.layout_key === 'quad';
  return [
    { label: '设计任务', value: taskLabels[task] + (quad ? '四旋翼' : ' · ' + frameRules[type].zh) },
    { label: '电机数量', value: quad ? taskFixed[1].value : `${topology.rotor_count} 个，${topology.axis_count} 处轴位，每处 ${topology.layers_per_axis} 层` },
    taskFixed[2],
    ...(p.accessories.has_camera_gimbal ? [taskFixed[3]] : []),
  ];
}

export function getPath(p: DroneParameters, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], p);
}
export function setPath(p: DroneParameters, path: string, value: unknown): DroneParameters {
  const next = structuredClone(p);
  const keys = path.split('.');
  let node = next as unknown as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) node = node[k] as Record<string, unknown>;
  node[keys[keys.length - 1]] = value;
  return next;
}

export function fieldStatus(def: FieldDef, p: DroneParameters, touched: Record<string, boolean>): FieldStatus {
  // 造型项的默认值一律是留白，所以只要有值就是设计者的选择（含读回的旧配置）。
  if (def.kind === 'styling') return getPath(p, def.path) === '' ? 'open' : 'chosen';
  if (def.kind === 'custom') return p.accessories.custom_prompt_additions.trim() ? 'chosen' : 'open';
  return touched[def.path] ? 'chosen' : 'default';
}
export const isRelevant = (def: FieldDef, p: DroneParameters) => (def.relevant ? def.relevant(p) : true);

/** 仍由设计者保留、未写入提示词的造型决定。 */
export function openDecisions(p: DroneParameters) {
  return fields.filter(f => f.kind === 'styling' && isRelevant(f, p) && getPath(p, f.path) === '');
}

/** 两份参数之间的差异，按登记表顺序。 */
export function diffParameters(a: DroneParameters, b: DroneParameters) {
  return fields
    .filter(f => JSON.stringify(getPath(a, f.path)) !== JSON.stringify(getPath(b, f.path)))
    .map(f => ({ path: f.path, label: f.label, group: f.group, from: f.format(a), to: f.format(b) }));
}

/** 数值来源参考。厂商公布、图面量测、实验档位分开列出；生成图上的读数须在回图后另量。 */
export const references = {
  wl: {
    experimental: [{ v: 0.7, label: '窄档' }, { v: 1.0, label: '中档' }, { v: 1.3, label: '宽档' }],
    measured: [
      { v: 1.155, label: 'Mavic Air' }, { v: 1.346, label: 'Air 3' }, { v: 1.346, label: 'Mavic 3 Pro' }, { v: 1.361, label: 'Mavic 2 Pro' },
      { v: 1.369, label: 'Mavic Air 2' }, { v: 1.407, label: 'Mavic Mini' }, { v: 1.444, label: 'Neo' }, { v: 1.472, label: 'EVO Nano+' },
      { v: 1.485, label: 'Mini 4 Pro' }, { v: 1.516, label: 'Mini 3 Pro' }, { v: 1.52, label: 'Neo 2' },
    ],
    note: '0.70／1.00／1.30 是研究登记的实验档，不是起始值。起始值 1.35 取 32 款真实四旋翼产品图上量得的中位数（四分位 1.17–1.50，两位判读者 1.35 与 1.34）。另有 11 款消费航拍四旋的手册图面量测为 1.16–1.52（中位 1.41），是便利样本，不代表行业范围。',
  },
  dd: {
    experimental: [{ v: 0.4, label: '实验档' }, { v: 0.5, label: '实验档' }, { v: 0.6, label: '实验档' }],
    measured: [{ v: 0.628, label: 'Mavic 3 Pro' }],
    note: 'd/D＝桨径／对角电机中心距均值。图面量测仅 1 款四旋可测。',
  },
  bodyWidthOverD: {
    measured: [{ v: 0.208, label: 'Air 3' }, { v: 0.211, label: 'Mavic 3 Pro' }, { v: 0.234, label: 'Neo' }, { v: 0.325, label: 'Neo 2' }],
    note: '机身宽/D 是待检验的视觉紧凑代理量；手册图面量测 4 款。32 款真实四旋翼产品图上量得的中位数是 0.23（四分位 0.18–0.29），这个比值越大越被评为紧凑（相关，未作检验）。起始值 55 mm 即 0.22。',
  },
  bodyLengthOverWidth: {
    measured: [{ v: 2.556, label: 'Mavic 3 Pro' }, { v: 3.654, label: 'Neo 2' }, { v: 4.844, label: 'Neo' }],
    note: '机身长/宽取决于中央壳体的界定，Neo 系列含护圈连桥时差别很大。32 款真实四旋翼产品图上的中位数是 2.76（四分位 2.38–3.59）。量测时机壳上下端取外轮廓；两位读者之间仍有约 7% 的出入。起始值 150 × 55 mm 即 2.73。',
  },
  diagonal: {
    published: [{ v: 170, label: 'Spark' }, { v: 219, label: 'ATOM 2' }, { v: 239, label: 'ATOM 3' }, { v: 335, label: 'Mavic Pro' }],
    study: 250,
    note: '厂商公布的对角尺寸端点未核；250 mm 是论文规格卡的实验设定。',
  },
  sources: {
    manufacturer: 'evidence/20261117-research-update/a1/a1-all-models.csv（30 款厂商规格，其中四旋 20 款）',
    drawing: 'evidence/20261117-config-review/A2、A2-extension 与 evidence/20261117-research-update/a1（手册图面量测，四旋累计 11 款）',
    experimental: 'manuscript/thesis/src/ch3.md 表3.6；evidence/20261117-a1-a4-c1/a4-design.md',
  },
};
