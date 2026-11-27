// 4.0 的核心模型：一条方向是一条逐层搭建的决定链（机架 → 动力 → 机身 → 细节 → 色材）。
// 每一层是一个节点，只保存这一层的取值；方向的完整规格由起始值加上沿链各层的取值得出。
// 在某一层分叉时，复制这一层和它的下游，上游继续共用。这里只有纯逻辑，界面和存储另放。
import type { DesignIntent, DroneParameters, TaskId, WordPairId } from '../types/DroneParameters.ts';
import { quadBladeCount } from '../design/design.ts';
import { designStart, legacyStart } from '../design/defaults.ts';
import { diffParameters, getPath, setPath } from '../design/fields.ts';

export type Layer = 'frame' | 'propulsion' | 'body' | 'details' | 'cmf';
export const layers: Layer[] = ['frame', 'propulsion', 'body', 'details', 'cmf'];

export const layerInfo: Record<Layer, { name: string; question: string; generation: string }> = {
  frame: { name: '机架', question: '几个旋翼、怎么排、多大、机臂多粗。', generation: '生成时编译成条件图（点线图），这是唯一进条件图的一层。' },
  propulsion: { name: '动力', question: '桨多大、几叶、要不要护圈。', generation: '生成时写成桨与护圈句。' },
  body: { name: '机身', question: '机身的体量、轮廓和顶盖分件；农业植保还有药箱。', generation: '生成时写成机身尺寸句、轮廓句和顶盖句（植保另有药箱句）。' },
  details: { name: '细节', question: '臂根怎样过渡、相机怎样安装、起落架；农业植保还有喷洒部件。', generation: '生成时写成臂根句、相机句和起落架句（植保另有喷洒句）。' },
  cmf: { name: '色材', question: '主色、表面处理、机臂表面外观，以及设计者自己写的色材说明。', generation: '生成时写成色材句；自己写的说明原样写进文字。' },
};

/** 每个参数归哪一层管。补充文字不属于任何一层，放在生成那一步。药箱和喷洒部件只在农业植保的规格里出现。 */
export const layerFields: Record<Layer, string[]> = {
  frame: ['frame.frame_type', 'frame.wheelbase_mm', 'frame.span_ratio_wl', 'frame.arm_width_mm', 'frame.arm_thickness_mm'],
  propulsion: ['propulsion.prop_diameter_inch', 'propulsion.prop_blade_count', 'propulsion.motor_tilt_degree', 'propulsion.prop_guard'],
  body: ['fuselage.fuselage_dimensions_mm.length', 'fuselage.fuselage_dimensions_mm.width', 'fuselage.fuselage_dimensions_mm.height',
    'fuselage.fuselage_style', 'fuselage.top_cover', 'accessories.spray_tank'],
  details: ['frame.arm_root', 'accessories.has_camera_gimbal', 'accessories.camera_mount', 'landing_gear.landing_gear_style', 'landing_gear.landing_gear_height_mm',
    'accessories.spray_system'],
  cmf: ['accessories.drone_primary_color', 'accessories.surface_finish', 'frame.material_visual', 'accessories.custom_prompt_additions'],
};

/**
 * 工作台只做两个任务（2026-11-23 作者定：先围绕主实验，其他旋翼以后直接在 GPU 上跑请求管线）。
 * 日常随行航拍四旋是主案例，RQ3 的两种方式对照在这里；农业植保六旋是场景适配案例。
 * 中性外观比较（neutral_design）只留给跨构型的请求管线和 3.6 版读旧文件，工作台里不再提供。
 */
export const studioTasks: { id: TaskId; label: string; short: string; frames: string[] }[] = [
  // 4.4：界面上只写任务本身。“主案例”“场景适配案例”是研究里的分工，不给设计者看（作者 11 月 24 日）。
  { id: 'consumer_camera', label: '日常航拍四旋', short: '日常航拍', frames: ['True X', 'Wide X', 'Stretch X', 'H-Frame', 'Deadcat', '+ Configuration'] },
  { id: 'agricultural_spraying', label: '农业植保六旋', short: '农业植保', frames: ['Radial Hex'] },
];
export const studioTask = (id: TaskId) => studioTasks.find(t => t.id === id) ?? studioTasks[0];
const owner = new Map<string, Layer>(layers.flatMap(layer => layerFields[layer].map(path => [path, layer] as [string, Layer])));
export function layerOf(path: string): Layer | null { return owner.get(path) ?? null; }

/** 语义目标主要作用在哪几层。“紧凑”同时指向机身和动力：S5 里机身相对宽度和整机占外接框面积都与紧凑感相关。 */
export const pairLayers: Record<WordPairId, Layer[]> = {
  compact: ['body', 'propulsion'], integrated: ['details', 'body'], simple: ['body', 'details'], visible: ['cmf'],
};

/**
 * 起始值。日常航拍四旋取真实产品中位数（见 design/defaults.ts）。
 * 农业植保六旋的起始值是作者定下的设计起点，措辞取自旧六旋请求（旧请求 2026-11-26 已随旧数据归档）：双叶桨、不加护圈、
 * 折叠铰接的臂根、半嵌入机身的方形药箱、机身下方的横向喷杆。设计者可以改；改过的才记为“你的选择”。
 */
export function baseParameters(taskId: TaskId): DroneParameters {
  const hexa = taskId === 'agricultural_spraying';
  return {
    frame: {
      frame_type: hexa ? 'Radial Hex' : designStart.frame_type, wheelbase_mm: hexa ? 1400 : designStart.wheelbase_mm,
      span_ratio_wl: hexa ? 1.1547 : designStart.span_ratio_wl, arm_thickness_mm: '4mm', arm_width_mm: '15mm', material_visual: '', arm_root: hexa ? 'hinge' : '',
    },
    propulsion: { prop_diameter_inch: hexa ? 20 : 5, prop_blade_count: hexa ? '2叶' : quadBladeCount, motor_tilt_degree: 0, prop_guard: 'none' },
    fuselage: { fuselage_style: '', top_cover: '', fuselage_dimensions_mm: hexa ? { ...legacyStart.fuselage_dimensions_mm } : { ...designStart.fuselage_dimensions_mm } },
    landing_gear: { landing_gear_style: '低矮滑撬/支腿', landing_gear_height_mm: 40 },
    accessories: { has_camera_gimbal: !hexa, camera_mount: '', custom_prompt_additions: '', drone_primary_color: '', surface_finish: '',
      ...(hexa ? { spray_tank: 'half-embedded' as const, spray_system: 'boom' as const } : {}) },
  };
}

/** 一个项目是否还是空白：没有改过任何一层。换任务时据此决定原地换还是另开项目。 */
export function isBlankProject(project: Project) {
  return Object.values(project.nodes).every(n => Object.keys(n.touched).length === 0) && project.lanes.length === 1;
}

export interface Issue { id: string; text: string; fromCandidate?: string; at: string; resolved?: boolean }
export interface LayerNode {
  id: string;
  layer: Layer;
  /** 上游节点；机架节点没有上游。 */
  parentId: string | null;
  values: Record<string, unknown>;
  touched: Record<string, true>;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** 从另一条方向套用过来时，记下来源。 */
  origin?: { laneId: string; nodeId: string };
  issues: Issue[];
}
export interface Lane {
  id: string;
  name: string;
  /** 链的末端（色材节点）。 */
  leafId: string;
  createdAt: string;
  collapsed?: boolean;
  forkedFrom?: { laneId: string; layer: Layer; reason?: string };
}

export type EvidenceTier = 'validated' | 'correlation' | 'hypothesis';
export interface IntentElement {
  id: string;
  kind: 'target' | 'interpretation' | 'note';
  text: string;
  pair?: WordPairId;
  pole?: 'left' | 'right';
  /** 支持这一条的用户原话卡号。 */
  cards: string[];
  /** 这一条从哪来：用户原话、设计者原话或 AI 的理解。 */
  basis: 'user' | 'designer' | 'ai';
  status: 'pending' | 'accepted' | 'rejected';
  why?: string;
}
export interface IntentState {
  text: string;
  taskId: TaskId;
  /** 观察或使用状态：展开俯视、折叠收纳、随身携带…… */
  state: string;
  elements: IntentElement[];
  /** 设计者采纳为依据的卡。 */
  cards: string[];
  readingCall?: string;
  question?: { text: string; options: { label: string; value: string }[] };
  confirmedAt?: string;
}

export interface Project {
  schema: 'workbench/v4';
  id: string;
  name: string;
  intent: IntentState;
  nodes: Record<string, LayerNode>;
  lanes: Lane[];
  activeLaneId: string;
  createdAt: string;
}

const now = () => new Date().toISOString();
export function newId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return prefix + '-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function blankNode(layer: Layer, parentId: string | null): LayerNode {
  const at = now();
  return { id: newId(layer), layer, parentId, values: {}, touched: {}, version: 1, createdAt: at, updatedAt: at, issues: [] };
}

/** 一条全新的链，五层都用起始值。 */
export function freshChain(nodes: Record<string, LayerNode>) {
  let parent: string | null = null;
  for (const layer of layers) {
    const node = blankNode(layer, parent);
    nodes[node.id] = node;
    parent = node.id;
  }
  return parent as string;
}

export function newProject(taskId: TaskId = 'consumer_camera', name = '未命名项目'): Project {
  const nodes: Record<string, LayerNode> = {};
  const leafId = freshChain(nodes);
  const lane: Lane = { id: 'lane-A', name: '方案 A', leafId, createdAt: now() };
  return {
    schema: 'workbench/v4', id: newId('project'), name, createdAt: now(),
    intent: { text: '', taskId, state: 'unspecified', elements: [], cards: [] },
    nodes, lanes: [lane], activeLaneId: lane.id,
  };
}

/** 从机架到色材，这条方向经过的五个节点。 */
export function lanePath(project: Project, laneId: string): LayerNode[] {
  const lane = project.lanes.find(l => l.id === laneId);
  if (!lane) throw new Error('找不到这个方案。');
  const path: LayerNode[] = [];
  let id: string | null = lane.leafId;
  while (id) {
    const node: LayerNode | undefined = project.nodes[id];
    if (!node) throw new Error('方案的链断了：缺少节点 ' + id);
    path.unshift(node);
    id = node.parentId;
  }
  if (path.length !== layers.length || path.some((n, i) => n.layer !== layers[i])) throw new Error('方案的链不完整。');
  return path;
}
export function laneNode(project: Project, laneId: string, layer: Layer) {
  return lanePath(project, laneId)[layers.indexOf(layer)];
}

/** 这个节点被几条方向共用。 */
export function sharedBy(project: Project, nodeId: string) {
  return project.lanes.filter(lane => lanePath(project, lane.id).some(n => n.id === nodeId)).map(l => l.id);
}

/** 方向的完整规格：起始值加上沿链各层的取值。uptoLayer 给出时只取到这一层，下游仍用起始值（用于累积显示）。 */
export function laneParameters(project: Project, laneId: string, uptoLayer?: Layer): DroneParameters {
  let parameters = baseParameters(project.intent.taskId);
  const limit = uptoLayer ? layers.indexOf(uptoLayer) : layers.length - 1;
  for (const node of lanePath(project, laneId).slice(0, limit + 1))
    for (const [path, value] of Object.entries(node.values)) parameters = setPath(parameters, path, value);
  return parameters;
}
export function laneTouched(project: Project, laneId: string) {
  return Object.assign({}, ...lanePath(project, laneId).map(n => n.touched)) as Record<string, boolean>;
}

/** 设计意图转成编译提示词所用的格式：只取设计者采纳的目标和备注。 */
export function laneIntent(project: Project): DesignIntent {
  const accepted = project.intent.elements.filter(e => e.status === 'accepted');
  const targets: DesignIntent['targets'] = {};
  for (const e of accepted) if (e.pair && e.pole) targets[e.pair] = e.pole;
  const note = accepted.filter(e => e.kind === 'note').map(e => e.text.trim()).filter(Boolean).join('；');
  return { taskId: project.intent.taskId, targets, note, cards: [...project.intent.cards], log: [] };
}

/** 是不是还用着起始值（这一层一项都没改过）。 */
export function isDefault(node: LayerNode) { return Object.keys(node.touched).length === 0; }

function touch(node: LayerNode, path: string, value: unknown, base: DroneParameters) {
  if (JSON.stringify(getPath(base, path)) === JSON.stringify(value) && !node.touched[path]) return false;
  node.values[path] = structuredClone(value);
  node.touched[path] = true;
  node.version += 1;
  node.updatedAt = now();
  return true;
}

/** 改一项。改动落在这条方向上管这一项的那一层；那一层若被几条方向共用，几条方向一起变。 */
export function setValue(project: Project, laneId: string, path: string, value: unknown) {
  const layer = layerOf(path);
  if (!layer) throw new Error('这一项不归任何一层管：' + path);
  const node = laneNode(project, laneId, layer);
  return touch(node, path, value, baseParameters(project.intent.taskId)) ? node : null;
}
export function clearValue(project: Project, laneId: string, path: string) {
  const layer = layerOf(path);
  if (!layer) return null;
  const node = laneNode(project, laneId, layer);
  if (!(path in node.values)) return null;
  delete node.values[path];
  delete node.touched[path];
  node.version += 1;
  node.updatedAt = now();
  return node;
}

function copyNode(node: LayerNode, parentId: string | null): LayerNode {
  const at = now();
  return { ...structuredClone(node), id: newId(node.layer), parentId, version: 1, createdAt: at, updatedAt: at, issues: [] };
}

/** 让这条方向从某一层起拥有自己的节点，别的方向不受影响。 */
export function privatize(project: Project, laneId: string, layer: Layer) {
  const path = lanePath(project, laneId);
  const start = layers.indexOf(layer);
  const shared = path.slice(start).some(n => sharedBy(project, n.id).length > 1);
  if (!shared) return false;
  let parent = start === 0 ? null : path[start - 1].id;
  for (const node of path.slice(start)) {
    const copy = copyNode(node, parent);
    copy.issues = structuredClone(node.issues);
    project.nodes[copy.id] = copy;
    parent = copy.id;
  }
  project.lanes = project.lanes.map(l => l.id === laneId ? { ...l, leafId: parent as string } : l);
  prune(project);
  return true;
}

/** 在某一层分叉：复制这一层和下游，作为一条新方向。上游继续共用。 */
export function forkAt(project: Project, laneId: string, layer: Layer, name?: string, reason?: string) {
  const path = lanePath(project, laneId);
  const start = layers.indexOf(layer);
  let parent = start === 0 ? null : path[start - 1].id;
  for (const node of path.slice(start)) {
    const copy = copyNode(node, parent);
    project.nodes[copy.id] = copy;
    parent = copy.id;
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const used = new Set(project.lanes.map(l => l.id));
  const letter = [...letters].find(ch => !used.has('lane-' + ch)) ?? String(project.lanes.length + 1);
  const lane: Lane = { id: 'lane-' + letter, name: name ?? '方案 ' + letter, leafId: parent as string, createdAt: now(), forkedFrom: { laneId, layer, reason } };
  const index = project.lanes.findIndex(l => l.id === laneId);
  project.lanes.splice(index + 1, 0, lane);
  return lane;
}

/** 把另一条方向某一层的决定套用到这条方向：这条方向的那一层先变成自己的，再整体换成来源的取值。 */
export function applyLayer(project: Project, fromLaneId: string, toLaneId: string, layer: Layer) {
  const source = laneNode(project, fromLaneId, layer);
  privatize(project, toLaneId, layer);
  const target = laneNode(project, toLaneId, layer);
  if (target.id === source.id) return target;
  target.values = structuredClone(source.values);
  target.touched = structuredClone(source.touched);
  target.version += 1;
  target.updatedAt = now();
  target.origin = { laneId: fromLaneId, nodeId: source.id };
  return target;
}

/** 名字以字母或数字结尾、后面接中文时空一格：“方案 B 的机架”。 */
export const spaced = (name: string) => /[A-Za-z0-9]$/.test(name) ? name + ' ' : name;

/** 在 layer 另做一版以后，新旧两个方案仍然共用的上游层（这几层以后一改，两个方案一起变）。 */
export function upstreamOf(layer: Layer): Layer[] { return layers.slice(0, layers.indexOf(layer)); }

/** 两个方案在某一层上取值不同的项：抄设置之前给设计者看会改哪几项。 */
export function layerDifferences(project: Project, fromLaneId: string, toLaneId: string, layer: Layer) {
  const from = laneParameters(project, fromLaneId), to = laneParameters(project, toLaneId);
  const relevant = layerFields[layer].filter(path => getPath(baseParameters(project.intent.taskId), path) !== undefined);
  return relevant.map(path => ({ path, from: getPath(to, path), to: getPath(from, path) }))
    .filter(d => JSON.stringify(d.from) !== JSON.stringify(d.to));
}

/**
 * 登记条件是否在每个方案上都成立。4.4：登记场次里机架由程序锁定，这一项应当永远成立；导出时再核一遍，
 * 不成立就在清单里写明，这一场不算完整登记。
 */
export function conditionHolds(project: Project, frame: Record<string, unknown>) {
  const mismatches: { laneId: string; path: string; expected: unknown; actual: unknown }[] = [];
  for (const lane of project.lanes) {
    const p = laneParameters(project, lane.id);
    for (const [k, v] of Object.entries(frame)) {
      const actual = getPath(p, 'frame.' + k);
      if (JSON.stringify(actual) !== JSON.stringify(v)) mismatches.push({ laneId: lane.id, path: 'frame.' + k, expected: v, actual });
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

/** 删掉一条方向；只属于它的节点一并删去。 */
export function removeLane(project: Project, laneId: string) {
  if (project.lanes.length < 2) throw new Error('至少保留一个方案。');
  project.lanes = project.lanes.filter(l => l.id !== laneId);
  if (project.activeLaneId === laneId) project.activeLaneId = project.lanes[0].id;
  prune(project);
}

/** 去掉没有任何方向用到的节点。 */
export function prune(project: Project) {
  const used = new Set(project.lanes.flatMap(l => lanePath(project, l.id).map(n => n.id)));
  for (const id of Object.keys(project.nodes)) if (!used.has(id)) delete project.nodes[id];
}

/** 某一轮生成冻结的规格与这条方向现在的规格差在哪几项；空表示没有过时。 */
export function staleFields(frozen: DroneParameters, current: DroneParameters) {
  return diffParameters(frozen, current).filter(d => layerOf(d.path));
}

/** 画布上的排布：每条方向一行；被几条方向共用的节点只画一次，放在第一条用到它的方向那一行。 */
export function boardRows(project: Project) {
  const placed = new Map<string, number>();
  project.lanes.forEach((lane, row) => {
    for (const node of lanePath(project, lane.id)) if (!placed.has(node.id)) placed.set(node.id, row);
  });
  return placed;
}

/** 规格改变时要重新生成的方向：沿链找到用到这个节点的方向。 */
export function lanesUsing(project: Project, nodeId: string) { return sharedBy(project, nodeId); }

export function migrate(raw: unknown): Project | null {
  const p = raw as Project;
  if (!p || p.schema !== 'workbench/v4' || !Array.isArray(p.lanes) || !p.nodes || !p.intent) return null;
  try { for (const lane of p.lanes) lanePath(p, lane.id); } catch { return null; }
  if (!p.lanes.some(l => l.id === p.activeLaneId)) p.activeLaneId = p.lanes[0].id;
  return p;
}
