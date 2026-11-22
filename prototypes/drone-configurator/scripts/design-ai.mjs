// 4.0 的 AI 服务：读意图、提方向、逐层建议、把候选上的一句话变成一轮修改，以及自由提示组的通用助手。
// 模型只起草；服务端核对每条建议：参数和取值必须存在，引用的依据必须登记过、并且针对所改的参数；
// 证据强弱由登记表决定，模型不能改。没有配置密钥时用规则回退（标为“未连模型”），便于开发和走查。
// 每次调用的输入、输出、模型名、耗时都写进本机的调用记录，供场次登记和复核。
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { frameRules, taskLabels } from '../src/design/design.ts';
import {
  armMaterialOptions, armRootOptions, cameraMountOptions, colourSwatches, fieldByPath, finishOptions, fuselageStyleOptions,
  gearOptions, getPath, sprayTankOptions, spraySystemOptions, topCoverOptions, wordPairs,
} from '../src/design/fields.ts';
import { suggestFields } from '../src/design/semantics/brief.ts';
import { states, topics } from '../src/design/semantics/topics.mjs';
import { items as evidenceItems, item as evidenceItem, registryVersion, relevantCitations, tierOf } from '../src/design/evidence/registry.mjs';
import { layerFields, layerOf, layers } from '../src/v4/model.ts';

export const defaultModel = 'MiniMax-M3.1-Flash';
const endpoints = { cn: 'https://api.minimax.cn/v1/chat/completions', global: 'https://api.minimax.io/v1/chat/completions' };

export class AiError extends Error {
  constructor(status, code, message, metadata = {}) { super(message); Object.assign(this, { status, code, metadata }); }
}
const bad = message => new AiError(400, 'invalid_input', message);

// ---------- 参数的合法取值 ----------
const enumOf = options => options.map(o => o.value);
const fieldSpec = {
  'frame.frame_type': { kind: 'enum', values: Object.keys(frameRules) },
  'frame.wheelbase_mm': { kind: 'number', min: 100, max: 2000, step: 1 },
  'frame.span_ratio_wl': { kind: 'number', min: 0.6, max: 1.66, step: 0.01 },
  'frame.arm_width_mm': { kind: 'enum', values: ['10mm', '15mm', '20mm'] },
  'frame.arm_thickness_mm': { kind: 'enum', values: ['3mm', '4mm', '5mm', '6mm'] },
  'propulsion.prop_diameter_inch': { kind: 'number', min: 3, max: 30, step: 0.1 },
  'propulsion.prop_blade_count': { kind: 'enum', values: ['2叶', '3叶', '4叶', '5叶', '6叶'] },
  'propulsion.motor_tilt_degree': { kind: 'number', min: 0, max: 20, step: 1 },
  'propulsion.prop_guard': { kind: 'enum', values: ['none', 'ring'] },
  'fuselage.fuselage_dimensions_mm.length': { kind: 'number', min: 50, max: 300, step: 5 },
  'fuselage.fuselage_dimensions_mm.width': { kind: 'number', min: 30, max: 200, step: 5 },
  'fuselage.fuselage_dimensions_mm.height': { kind: 'number', min: 20, max: 150, step: 5 },
  'fuselage.fuselage_style': { kind: 'enum', values: ['', ...enumOf(fuselageStyleOptions)] },
  'fuselage.top_cover': { kind: 'enum', values: ['', ...enumOf(topCoverOptions)] },
  'frame.arm_root': { kind: 'enum', values: ['', ...enumOf(armRootOptions)] },
  'accessories.has_camera_gimbal': { kind: 'boolean' },
  'accessories.camera_mount': { kind: 'enum', values: ['', ...enumOf(cameraMountOptions)] },
  'landing_gear.landing_gear_style': { kind: 'enum', values: enumOf(gearOptions) },
  'landing_gear.landing_gear_height_mm': { kind: 'number', min: 20, max: 100, step: 5 },
  // 主色可以是色板里的，也可以是设计者自定的任意 #rrggbb。
  'accessories.drone_primary_color': { kind: 'colour' },
  'accessories.surface_finish': { kind: 'enum', values: ['', ...enumOf(finishOptions)] },
  'frame.material_visual': { kind: 'enum', values: ['', ...enumOf(armMaterialOptions)] },
  // 农业植保才有：只在规格里有这两个键（植保六旋的起始值）时交给模型、允许它提。
  'accessories.spray_tank': { kind: 'enum', values: ['', ...enumOf(sprayTankOptions)], agricultural: true },
  'accessories.spray_system': { kind: 'enum', values: ['', ...enumOf(spraySystemOptions)], agricultural: true },
};
const studioTaskIds = ['consumer_camera', 'agricultural_spraying'];
const optionLabel = { ...Object.fromEntries([fuselageStyleOptions, topCoverOptions, armRootOptions, cameraMountOptions, finishOptions, armMaterialOptions, sprayTankOptions, spraySystemOptions]
  .flat().map(o => [o.value, o.zh])), ...Object.fromEntries(colourSwatches.map(c => [c.value, c.zh])) };
/** 这一项对这份规格有没有意义：植保才有的两项，只在规格里带着它们时才算。 */
const applies = (field, parameters) => !fieldSpec[field]?.agricultural || (parameters && getPath(parameters, field) !== undefined);

/** 把模型给的值规整成合法取值；不合法返回 undefined。 */
export function legalValue(field, value) {
  const spec = fieldSpec[field];
  if (!spec) return undefined;
  if (spec.kind === 'boolean') return typeof value === 'boolean' ? value : undefined;
  if (spec.kind === 'colour') return value === '' ? '' : typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toLowerCase() : undefined;
  if (spec.kind === 'enum') {
    if (typeof value !== 'string') return undefined;
    const hit = spec.values.find(v => v.toLowerCase() === value.toLowerCase());
    return hit;
  }
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < spec.min || n > spec.max) return undefined;
  const stepped = Math.round(n / spec.step) * spec.step;
  return Number(stepped.toFixed(spec.step < 1 ? String(spec.step).split('.')[1].length : 0));
}

function text(value, max, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const t = value.trim().replace(/\s+\n/g, '\n');
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
function scrub(value) {
  return value.replace(/\b(?:Bearer\s+[\w.+/=-]{12,}|sk-[\w.-]{12,})/gi, '[已隐藏凭据]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[已隐藏邮箱]').replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '[已隐藏手机号]');
}
function userText(value, max) {
  if (typeof value !== 'string' || !value.trim()) throw bad('请先写一句话。');
  if (value.length > max) throw bad('这段话太长了，请缩短到 ' + max + ' 字以内。');
  return scrub(value.trim());
}

// ---------- 发给模型的上下文 ----------
function laneSummary(parameters, locked) {
  return Object.fromEntries(layers.map(layer => [layer, {
    locked: locked.includes(layer),
    fields: layerFields[layer].filter(f => applies(f, parameters)).map(f => {
      const spec = fieldSpec[f];
      const base = { field: f, label: fieldByPath[f]?.label ?? f, current: parameters ? getPath(parameters, f) : null };
      // 没有取值规则的（设计者自己写的色材说明）只给模型看，不让它改。
      if (!spec) return { ...base, designerOnly: true };
      if (spec.kind === 'colour') return { ...base, options: ['', ...colourSwatches.map(c => c.value)].map(v => ({ value: v, zh: optionLabel[v] ?? (v || '不指定') })), alsoAny: '#rrggbb' };
      return { ...base,
        ...(spec.kind === 'number' ? { min: spec.min, max: spec.max, step: spec.step } : spec.kind === 'enum' ? { options: spec.values.map(v => ({ value: v, zh: optionLabel[v] ?? (v || '不指定') })) } : { options: [true, false] }) };
    }),
  }]));
}
function cardTable(cards) {
  const topicOf = new Map();
  for (const [id, t] of Object.entries(topics)) for (const route of Object.values(t.byState)) for (const c of [...route.cards, ...(route.cautions ?? [])]) {
    if (!topicOf.has(c)) topicOf.set(c, new Set());
    topicOf.get(c).add(t.label);
  }
  return cards.map(c => ({ id: c.id, quote: c.quote, state: c.state, limits: c.limits, topics: [...(topicOf.get(c.id) ?? [])] }));
}
const pairTable = wordPairs.map(w => ({ pair: w.id, left: w.left, right: w.right, hint: w.hint }));
const evidenceTable = evidenceItems.map(({ id, tier, statement, limits, fields, pairs }) => ({ id, tier, statement, limits, fields, pairs }));

const rules = `规则：
1. 参数只能用上下文里列出的字段和取值：数值在给定范围内，选项只用给定的 value。标为 locked 的层不能改。
2. 依据只能引用上下文里的证据条目编号（evidence）和用户原话卡号（cards），不要编造数字、来源或研究结论。
3. 分清依据的强弱：validated 是已验证的规律；correlation 只是真实产品上的统计相关，不能说成“改了就会”，要说“往往”“值得试”；没有依据的想法可以提，但不要引用条目，它会被当作设计假设。
4. 你只提建议，设计者拍板。不要替设计者做决定，也不要说“一定”“必须”。
5. 只输出一个 JSON 对象，不要有别的文字。中文，简短直接。`;

const prompts = {
  intent: `你是多旋翼无人机工业设计工作台里的设计助手。设计者写了一段设计意图，请把它读成结构化的意图，供设计者逐条确认。
${rules}
输出结构：
本研究的工作台只做两个场景：日常随行航拍四旋（consumer_camera，主案例）和农业植保六旋（agricultural_spraying，场景适配案例）。原话的用途不在这两个里面时（例如光伏巡检、电力巡线、物流、测绘、消防），taskFit 填 out，taskMention 写原话里的用途；不要把它悄悄当成航拍。
{"taskId":"consumer_camera|agricultural_spraying","taskFit":"in|out","taskMention":"原话里的用途（taskFit 为 out 时）","state":"unfolded_top|folded|carrying|with_accessory|unspecified",
 "question":{"text":"最关键的一个澄清问题","options":[{"label":"选项说法","value":"状态值"}]} 或 null,
 "targets":[{"text":"原话里的说法","pair":"compact|simple|integrated|visible","pole":"left|right","cards":["卡号"],"why":"为什么这样读"}],
 "interpretations":[{"text":"原话里没有直接对应的说法","why":"为什么需要设计者来理解","options":[{"text":"一种理解","pair":"词对","pole":"left|right"}]}],
 "notes":[{"text":"应当原样保留给设计者的要求"}],
 "cards":[{"id":"卡号","why":"为什么相关"}]}
只在原话确实指向某个词对时才写进 targets；没有用户原话支持的理解放进 interpretations。说“紧凑”“小巧”时若没交代展开还是折叠，就用 question 问。`,
  directions: `你是多旋翼无人机工业设计工作台里的设计助手。根据设计者确认的意图，提出 2 到 3 个值得探索的造型方向。每个方向是一组跨层的参数改动，方向之间要有明显区别。
${rules}
输出结构：
{"directions":[{"name":"四到六个字的方向名","summary":"一句话说明这个方向","changes":[{"field":"字段","value":取值,"why":"理由","evidence":["条目编号"],"cards":["卡号"]}]}]}
每个方向 3 到 6 项改动，只改和这个方向有关的项。`,
  layer: `你是多旋翼无人机工业设计工作台里的设计助手。设计者正在看某一层（layer），对你说了一句话。请回应，并在合适时给出这一层的具体改动建议。
${rules}
输出结构：
{"reply":"对设计者的回应","suggestions":[{"title":"一句话标题","why":"理由","changes":[{"field":"这一层的字段","value":取值}],"evidence":["条目编号"],"cards":["卡号"]}],"otherLayer":{"layer":"另一层","why":"为什么也值得看"} 或 null}
建议只改当前这一层的字段，最多 2 条。依据之间方向不一致时，在 reply 里把两边都说出来。`,
  revise: `你是多旋翼无人机工业设计工作台里的设计助手。设计者在一张候选图上说了一句修改意见。请把它变成一轮修改：改哪些参数，保持哪几层不动。
${rules}
输出结构：
{"reply":"对设计者的回应","goal":"一句话说明这一轮改什么、保什么","changes":[{"field":"字段","value":取值}],"keep":["frame","propulsion","body","details","cmf" 中不改的层],"evidence":["条目编号"]}
没有可以对应的参数时，changes 为空，在 goal 里用一句话写清要模型改的地方。`,
  free: `你是一个通用的工业设计助手。设计者在为一架多旋翼无人机找造型方向，会和你讨论想法，并请你帮忙写给图像生成模型的提示词。图像模型生成的是产品顶视渲染图。
你没有任何研究资料、用户评论或参数表，只凭对话和你的常识。只输出一个 JSON 对象：{"reply":"对设计者的回应","prompt":"如果设计者需要，给出一段可以直接发给图像模型的提示词，否则为 null"}。中文回应，提示词可以中英文。`,
};

// ---------- 结果的核对 ----------
function checkChanges(raw, { allowed, parameters }) {
  const accepted = [], dropped = [];
  for (const change of Array.isArray(raw) ? raw.slice(0, 8) : []) {
    const field = typeof change?.field === 'string' ? change.field : '';
    if (!allowed.includes(field)) { dropped.push({ field, why: '字段不在可改范围内' }); continue; }
    const value = legalValue(field, change.value);
    if (value === undefined) { dropped.push({ field, why: '取值不合法' }); continue; }
    if (parameters && JSON.stringify(getPath(parameters, field)) === JSON.stringify(value)) { dropped.push({ field, why: '与当前值相同' }); continue; }
    accepted.push({ field, value, layer: layerOf(field), label: fieldByPath[field]?.label ?? field,
      from: parameters ? getPath(parameters, field) : null, why: text(change.why, 200) });
  }
  return { accepted, dropped };
}
function checkCards(raw, cardIds) { return [...new Set((Array.isArray(raw) ? raw : []).filter(id => typeof id === 'string' && cardIds.has(id)))]; }
function withEvidence(entry, changes, cardIds, pairs = []) {
  const fieldsChanged = changes.map(c => c.field);
  const evidence = relevantCitations(Array.isArray(entry.evidence) ? entry.evidence.filter(x => typeof x === 'string') : [], fieldsChanged, pairs);
  return { evidence, tier: tierOf(evidence, fieldsChanged), cards: checkCards(entry.cards, cardIds) };
}
const pairIds = new Set(wordPairs.map(w => w.id));
const validPole = v => v === 'left' || v === 'right' ? v : null;

function parseJson(content) {
  if (typeof content !== 'string') throw new AiError(502, 'invalid_model_output', '模型没有返回文字。');
  const start = content.indexOf('{'), end = content.lastIndexOf('}');
  if (start < 0 || end < start) throw new AiError(502, 'invalid_model_output', '模型的回答不是 JSON。');
  try { return JSON.parse(content.slice(start, end + 1)); }
  catch { throw new AiError(502, 'invalid_model_output', '模型的回答无法解析。'); }
}

// ---------- 规则回退：没有密钥时的确定性回答 ----------
const has = (t, re) => re.test(t);
function fixtureIntent(input) {
  const t = input.text;
  const { state } = suggestFields(t);
  const targets = [], interpretations = [], notes = [], cards = [];
  if (has(t, /紧凑|小巧|便携|compact/i)) {
    targets.push({ text: (t.match(/[^，。,.、]*?(?:紧凑|小巧|便携)[^，。,.、]*/) ?? ['紧凑'])[0].trim(), pair: 'compact', pole: 'left', cards: ['E001'], why: '原话直接说到小巧、紧凑。' });
    cards.push({ id: 'E001', why: '用户自述机身小巧便携。' });
  }
  if (has(t, /舒展|大气/)) targets.push({ text: '舒展', pair: 'compact', pole: 'right', cards: [], why: '原话说到舒展。' });
  if (has(t, /简洁|简约/)) targets.push({ text: '简洁', pair: 'simple', pole: 'left', cards: ['E011'], why: '原话说到简洁。' });
  if (has(t, /一体|整体/)) targets.push({ text: '整体', pair: 'integrated', pole: 'left', cards: [], why: '原话说到整体感。' });
  if (has(t, /醒目|显眼|鲜艳/)) targets.push({ text: '醒目', pair: 'visible', pole: 'right', cards: ['E029'], why: '原话说到醒目。' });
  if (has(t, /低调|沉稳/)) targets.push({ text: '低调', pair: 'visible', pole: 'left', cards: [], why: '原话说到低调。' });
  // “不要像……”说的是要避开什么，对应哪个方向由设计者来定；规则只给出两种读法。
  const negative = (t.match(/[^，。,.]*(?:不要|别|避免)[^，。,.]*/) ?? [null])[0]?.trim();
  const toyOptions = [{ text: '偏“整体”，而不是“拼凑”', pair: 'integrated', pole: 'left' }, { text: '配色偏“低调”', pair: 'visible', pole: 'left' }];
  const pieceOptions = [{ text: '偏“整体”，而不是“拼凑”', pair: 'integrated', pole: 'left' }, { text: '偏“简洁”，少一些分件', pair: 'simple', pole: 'left' }];
  if (has(t, /玩具/)) interpretations.push({ text: (t.match(/[^，。,.]*玩具[^，。,.]*/) ?? ['不要像玩具'])[0].trim(), why: '用户原话里没有对应的说法，需要你来理解。', options: toyOptions });
  else if (negative && /拼|散|零碎|堆/.test(negative)) interpretations.push({ text: negative, why: '这是一句“不要什么”，对应哪个方向要你来定。', options: pieceOptions });
  const question = state === 'unspecified' && targets.some(x => x.pair === 'compact') ? {
    text: '说的“小巧、紧凑”，是展开时看起来小，还是折叠后小？',
    options: [{ label: '展开时看起来小', value: 'unfolded_top' }, { label: '折叠后小', value: 'folded' }, { label: '泛指随身带着方便', value: 'carrying' }],
  } : null;
  if (negative && !interpretations.length) notes.push({ text: negative });
  const agricultural = has(t, /植保|农业|喷洒|打药|施肥/);
  const mention = agricultural ? null : (t.match(/(?:光伏|电力|输电|电网|管道|桥梁|建筑|森林|河道|风电)?(?:巡检|巡线)|测绘|测量|物流|快递|配送|消防|救援|安防|警用|竞速|穿越机|表演|灯光秀|喷涂|清洗|勘探/) ?? [null])[0];
  return { taskId: agricultural ? 'agricultural_spraying' : 'consumer_camera', taskFit: mention ? 'out' : 'in', taskMention: mention, state, question, targets, interpretations, notes, cards };
}
function fixtureDirections(input) {
  const wantsLow = (input.intent?.targets ?? []).some(t => t.pair === 'visible' && t.pole === 'left');
  const wantsBright = (input.intent?.targets ?? []).some(t => t.pair === 'visible' && t.pole === 'right');
  return { directions: [
    { name: '紧凑一体', summary: '机身圆润、臂根融进机身、相机藏在机鼻里，整机读起来是一个整体。', changes: [
      { field: 'fuselage.fuselage_style', value: 'Aerodynamic Pod', why: '连续的曲面轮廓更像一个整体。', evidence: [] },
      { field: 'frame.arm_root', value: 'seamless', why: '臂根无缝过渡，减少拼接感。', evidence: ['H-INT-ROOT'] },
      { field: 'accessories.camera_mount', value: 'flush', why: '相机内嵌，机鼻更干净。', evidence: ['H-INT-CAM'] },
      { field: 'accessories.drone_primary_color', value: wantsBright ? '#f97316' : '#8a9095', why: wantsBright ? '醒目的主色。' : '中性灰，不张扬。', evidence: [wantsBright ? 'H-VIS-CMF' : 'H-LOW-CMF'] },
      { field: 'accessories.surface_finish', value: 'matte', why: '哑光更沉稳。', evidence: ['H-LOW-CMF'] },
    ] },
    { name: '利落工具感', summary: '切面机壳、两段顶盖、深色哑光，像一件精干的工具。', changes: [
      { field: 'fuselage.fuselage_style', value: 'Faceted Compact', why: '切面带出利落的棱线。', evidence: [] },
      { field: 'fuselage.top_cover', value: 'two', why: '两段顶盖交代机头与主体。', evidence: [] },
      { field: 'accessories.drone_primary_color', value: wantsLow || !wantsBright ? '#1e293b' : '#f97316', why: '深色更像专业工具。', evidence: ['H-LOW-CMF'] },
      { field: 'accessories.surface_finish', value: 'matte', why: '哑光。', evidence: ['H-LOW-CMF'] },
    ] },
  ] };
}
function fixtureLayer(input) {
  const t = input.message, p = input.lane?.parameters;
  const width = p ? getPath(p, 'fuselage.fuselage_dimensions_mm.width') : 55;
  if (input.layer === 'body' && has(t, /紧凑|小巧|显小/))
    return { reply: '在真实产品里，机身相对轴距更宽的往往被评为更紧凑，这和直觉相反，也只是相关。值得开一个分支试试。', otherLayer: { layer: 'propulsion', why: '整机占外接框的面积也与紧凑感相关，桨和护圈会影响它。' },
      suggestions: [{ title: '试试把机身加宽一些', why: '机身相对轴距更宽的真实产品往往被评为更紧凑。', changes: [{ field: 'fuselage.fuselage_dimensions_mm.width', value: Math.min(200, width + 5) }], evidence: ['C-BWD', 'H-CW1'], cards: ['E001'] }] };
  if (input.layer === 'body' && has(t, /窄|瘦|修长/))
    return { reply: '可以试窄一些的机身。注意真实产品里机身相对更窄的，往往被评为更舒展。', otherLayer: null,
      suggestions: [{ title: '把机身收窄一些', why: '按你的意思收窄。', changes: [{ field: 'fuselage.fuselage_dimensions_mm.width', value: Math.max(30, width - 5) }], evidence: ['C-BWD'], cards: [] }] };
  if (input.layer === 'propulsion' && has(t, /紧凑|小巧|护圈/))
    return { reply: '两条依据方向不一致：评议里最紧凑的一端多是带护圈的小机；而有一条用户原话说加了保护罩后显得挺大（E007）。可以开个分支对比。', otherLayer: null,
      suggestions: [{ title: '试试加上环形护圈', why: '带护圈的小机在评议中偏紧凑，但用户感受不一。', changes: [{ field: 'propulsion.prop_guard', value: 'ring' }], evidence: ['C-GUARD', 'C-FILL'], cards: ['E007'] }] };
  if (input.layer === 'frame' && has(t, /紧凑|小巧/))
    return { reply: '在真实产品里，电机布局的宽长比 W/L 与紧凑感没有关系，调它多半帮不上“紧凑”。可以看看机身和动力这两层。', otherLayer: { layer: 'body', why: '机身相对宽度与紧凑感相关。' }, suggestions: [] };
  if (input.layer === 'frame' && has(t, /0\.7|窄档|更长/))
    return { reply: '要注意：W/L 设成 0.70 时，这条出图通路实测都读成约 1.0。', otherLayer: null,
      suggestions: [{ title: '把 W/L 设为 0.70 时要有心理准备', why: '这是出图工具的实测表现。', changes: [{ field: 'frame.span_ratio_wl', value: 0.7 }], evidence: ['V-WL-NARROW'], cards: [] }] };
  if (input.layer === 'details' && has(t, /整体|一体|融/))
    return { reply: '“整体”可以理解为臂根无缝过渡、相机内嵌，这是设计上的理解，没有评议数据。', otherLayer: null,
      suggestions: [{ title: '臂根改为无缝过渡', why: '减少机臂与机身的拼接感。', changes: [{ field: 'frame.arm_root', value: 'seamless' }], evidence: ['H-INT-ROOT'], cards: [] }] };
  if (input.layer === 'cmf' && has(t, /低调|沉稳|不像玩具/))
    return { reply: '可以试中性色加哑光，这是一种理解，没有数据。', otherLayer: null,
      suggestions: [{ title: '中性灰、哑光', why: '颜色不张扬。', changes: [{ field: 'accessories.drone_primary_color', value: '#8a9095' }, { field: 'accessories.surface_finish', value: 'matte' }], evidence: ['H-LOW-CMF'], cards: [] }] };
  if (input.layer === 'cmf' && has(t, /醒目|显眼|鲜艳/))
    return { reply: '可以试高饱和的主色。用户原话里有亮橙、高饱和色的愿望。', otherLayer: null,
      suggestions: [{ title: '主色改为橙红', why: '醒目。', changes: [{ field: 'accessories.drone_primary_color', value: '#f97316' }], evidence: ['H-VIS-CMF'], cards: ['E030'] }] };
  return { reply: '我先没有改动建议。可以说得具体些，例如“再紧凑一点”“臂根融进机身”。', otherLayer: null, suggestions: [] };
}
function fixtureRevise(input) {
  const t = input.message, p = input.candidate?.parameters ?? input.lane?.parameters;
  const len = p ? getPath(p, 'fuselage.fuselage_dimensions_mm.length') : 150;
  const width = p ? getPath(p, 'fuselage.fuselage_dimensions_mm.width') : 55;
  const changes = [];
  if (has(t, /短/)) changes.push({ field: 'fuselage.fuselage_dimensions_mm.length', value: Math.max(50, len - 15) });
  if (has(t, /长一点|加长/)) changes.push({ field: 'fuselage.fuselage_dimensions_mm.length', value: Math.min(300, len + 15) });
  if (has(t, /宽一点|加宽/)) changes.push({ field: 'fuselage.fuselage_dimensions_mm.width', value: Math.min(200, width + 5) });
  if (has(t, /窄一点|收窄/)) changes.push({ field: 'fuselage.fuselage_dimensions_mm.width', value: Math.max(30, width - 5) });
  if (has(t, /臂根/)) changes.push({ field: 'frame.arm_root', value: 'seamless' });
  const touched = new Set(changes.map(c => layerOf(c.field)));
  return { reply: changes.length ? '按你的意思改这几项，其余保持。' : '这句话没有对应的参数，我把它写进这一轮的目标。',
    goal: changes.length ? '只改' + [...touched].map(l => ({ frame: '机架', propulsion: '动力', body: '机身', details: '细节', cmf: '色材' })[l]).join('、') + '，其余保持。' : t.slice(0, 80),
    changes, keep: layers.filter(l => !touched.has(l)), evidence: [] };
}
function fixtureFree(input) {
  const last = [...input.messages].reverse().find(m => m.role === 'user')?.content ?? '';
  return { reply: '可以。我把你的想法整理成一段提示词，你可以改了再发。',
    prompt: '一架日常随身携带的四旋翼航拍无人机，正交顶视图，机头朝上，产品渲染，浅色背景。' + last.slice(0, 120) };
}
const fixtures = { intent: fixtureIntent, directions: fixtureDirections, layer: fixtureLayer, revise: fixtureRevise, free: fixtureFree };

// ---------- 服务 ----------
export async function createDesignAI({ apiKey, region = 'cn', model = defaultModel, baseUrl, effort, fetchImpl = globalThis.fetch,
  logDir = path.join(process.env.LOCALAPPDATA || homedir(), 'Freeloop', 'multirotor-workbench', 'ai-calls') } = {}) {
  if (!baseUrl && !Object.hasOwn(endpoints, region)) throw new Error('MINIMAX_REGION 仅支持 cn 或 global。');
  const envelope = JSON.parse(await readFile(new URL('../src/data/evidenceCards.json', import.meta.url), 'utf8'));
  const cards = envelope.cards;
  const cardIds = new Set(cards.map(c => c.id));
  const cardContext = cardTable(cards);
  const mode = apiKey ? 'model' : 'fixture';
  const provider = baseUrl ? 'openai-compatible' : 'minimax';
  const url = baseUrl ? baseUrl.replace(/\/+$/, '') + '/chat/completions' : endpoints[region];
  // 记下发到哪个服务（只记主机名）：同一个模型名在国内站和国际站是两个服务，登记要写明是哪一个。
  const endpoint = mode === 'model' ? new URL(url).host : null;

  function describe() {
    return { mode, provider: mode === 'model' ? provider : 'rules', model: mode === 'model' ? model : null, endpoint, registry: registryVersion,
      label: mode === 'model' ? `${model}（${endpoint}）` : '规则回退（未连模型）' };
  }

  async function log(entry) {
    try {
      await mkdir(logDir, { recursive: true, mode: 0o700 });
      const day = entry.at.slice(0, 10).replace(/-/g, '');
      await appendFile(path.join(logDir, `ai-calls-${day}.jsonl`), JSON.stringify(entry) + '\n', { mode: 0o600 });
    } catch { /* 记录失败不影响设计者，但会在回执里标出 */ entry.logFailed = true; }
  }

  async function callModel(messages, signal) {
    const body = { model, messages, stream: false, max_tokens: 4096, response_format: { type: 'json_object' }, ...(effort ? { reasoning_effort: effort } : {}) };
    let response, payload;
    try {
      response = await fetchImpl(url, { method: 'POST', redirect: 'error',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      try { payload = await response.json(); } catch (error) { if (response.ok) throw error; }
    } catch (error) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw new AiError(timedOut ? 504 : 502, timedOut ? 'upstream_timeout' : 'upstream_unavailable', timedOut ? '等待文字模型响应超时。' : '无法连接文字模型服务。');
    }
    const code = payload?.base_resp?.status_code ?? payload?.error?.code;
    if (!response.ok || payload?.error || (code != null && code !== 0)) {
      if (response.status === 401 || payload?.error?.type === 'authentication_error') throw new AiError(401, 'authentication_failed', '文字模型服务没有接受这个密钥。');
      if (response.status === 402 || Number(code) === 1008) throw new AiError(402, 'insufficient_balance', '文字模型账户余额不足。');
      throw new AiError(response.status === 429 ? 429 : 502, 'upstream_error', `文字模型没有完成这次请求（状态 ${code ?? response.status}）。`);
    }
    // 锁定版本：回执里必须写明模型名，并与请求的一致；没写或不一致都不用这次回答，日志里记下服务实际报的名字。
    const servedModel = typeof payload?.model === 'string' && payload.model.trim() ? payload.model.trim() : null;
    if (!servedModel) throw Object.assign(new AiError(502, 'model_unconfirmed', '服务回执里没有写模型名，无法确认这次用的是锁定的版本。'), { servedModel: null });
    if (servedModel.toLowerCase() !== model.toLowerCase())
      throw Object.assign(new AiError(502, 'unexpected_model', `服务返回的模型（${servedModel}）与锁定的版本不一致。`), { servedModel });
    const choice = payload?.choices?.[0];
    if (!choice || (choice.finish_reason && choice.finish_reason !== 'stop')) throw new AiError(502, 'incomplete_generation', '文字模型没有返回完整回答。');
    return { content: choice.message?.content, usage: payload?.usage ?? null, requestId: payload?.id ?? response.headers.get('x-request-id') ?? null, servedModel };
  }

  async function run(task, input, context, signal) {
    const id = randomUUID(), at = new Date().toISOString(), started = Date.now();
    const messages = task === 'free'
      ? [{ role: 'system', content: prompts.free }, ...(context.brief ? [{ role: 'system', content: '任务简报：' + context.brief }] : []), ...input.messages]
      : [{ role: 'system', content: prompts[task] }, { role: 'system', content: JSON.stringify(context) },
        ...(input.history ?? []), { role: 'user', content: input.text ?? input.message ?? '' }];
    let raw, rawText = null, usage = null, requestId = null, servedModel = null;
    try {
      if (mode === 'fixture') raw = structuredClone(fixtures[task](input));
      else {
        const reply = await callModel(messages, signal);
        rawText = reply.content; usage = reply.usage; requestId = reply.requestId; servedModel = reply.servedModel;
        raw = parseJson(rawText);
      }
    } catch (error) {
      await log({ id, at, task, mode, provider, endpoint, model: mode === 'model' ? model : null, requestedModel: mode === 'model' ? model : null,
        servedModel: error.servedModel ?? servedModel ?? null, latencyMs: Date.now() - started, messages, error: error.message });
      if (error instanceof AiError) { error.metadata = { callId: id }; throw error; }
      throw new AiError(500, 'ai_error', 'AI 服务没能处理这次请求。', { callId: id });
    }
    // model 是锁定（请求）的版本；servedModel 是服务回执里写的版本，两者一致才会走到这里。规则回退两项都是 null。
    const call = { id, at, mode, model: mode === 'model' ? model : null, servedModel, latencyMs: Date.now() - started, registry: registryVersion };
    return { raw, rawText, usage, requestId, messages, call, finish: async (result, dropped) => {
      const entry = { ...call, requestedModel: call.model, task, provider: mode === 'model' ? provider : 'rules', endpoint, messages, rawText, raw, result, dropped, usage, requestId };
      await log(entry);
      return { ...result, call: { ...call, ...(entry.logFailed ? { logFailed: true } : {}) } };
    } };
  }

  function lockedLayers(input) { return (Array.isArray(input.locked) ? input.locked : []).filter(l => layers.includes(l)); }
  // 设计者自己写的色材补充只由设计者改，不交给模型。
  function editable(locked, only, parameters) {
    return (only ? [only] : layers).filter(l => !locked.includes(l)).flatMap(l => layerFields[l]).filter(f => fieldSpec[f] && applies(f, parameters));
  }

  /** 按调用编号读回日志行（最多 2000 个编号）；找不到的编号单列出来。 */
  async function readLog(ids) {
    const wanted = new Set(ids.filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 2000));
    const entries = [];
    let files = [];
    try { files = (await readdir(logDir)).filter(f => /^ai-calls-\d{8}\.jsonl$/.test(f)).sort(); } catch { /* 还没有日志 */ }
    for (const f of files) for (const line of (await readFile(path.join(logDir, f), 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      try { const entry = JSON.parse(line); if (wanted.has(entry.id)) entries.push(entry); } catch { /* 跳过坏行，不影响其余 */ }
    }
    const found = new Set(entries.map(e => e.id));
    return { entries, missing: [...wanted].filter(id => !found.has(id)), logDir: path.basename(logDir) };
  }

  return {
    describe, readLog,
    async intent(input, { signal } = {}) {
      const t = userText(input?.text, 600);
      const taskId = Object.hasOwn(taskLabels, input?.taskId) ? input.taskId : 'consumer_camera';
      const run1 = await run('intent', { text: t }, { task: 'intent', taskId, states, wordPairs: pairTable, evidence: evidenceTable, cards: cardContext }, signal);
      const r = run1.raw ?? {};
      const dropped = [];
      const targets = (Array.isArray(r.targets) ? r.targets : []).flatMap(x => {
        if (!pairIds.has(x?.pair) || !validPole(x?.pole)) { dropped.push({ target: x?.text, why: '词对或方向不合法' }); return []; }
        return [{ text: text(x.text, 60, '（原话）'), pair: x.pair, pole: x.pole, cards: checkCards(x.cards, cardIds), why: text(x.why, 160) }];
      }).slice(0, 6);
      const interpretations = (Array.isArray(r.interpretations) ? r.interpretations : []).map(x => ({
        text: text(x?.text, 60, '（原话）'), why: text(x?.why, 160),
        options: (Array.isArray(x?.options) ? x.options : []).filter(o => pairIds.has(o?.pair) && validPole(o?.pole)).slice(0, 3)
          .map(o => ({ text: text(o.text, 40), pair: o.pair, pole: o.pole })),
      })).slice(0, 4);
      const question = r.question && typeof r.question.text === 'string' ? {
        text: text(r.question.text, 120),
        options: (Array.isArray(r.question.options) ? r.question.options : []).filter(o => states.includes(o?.value)).slice(0, 4).map(o => ({ label: text(o.label, 30), value: o.value })),
      } : null;
      // 用途不在两个场景里：先问设计者按哪一个做，任务先保持原样，不替设计者归类。
      const outOfScope = r.taskFit === 'out' ? text(r.taskMention, 30, '原话里的用途') : null;
      const taskQuestion = outOfScope ? {
        text: `“${outOfScope}”不在本研究的两个场景里（日常航拍、农业植保）。按哪一个来做？`,
        options: [{ label: '按日常航拍做', value: 'task:consumer_camera' }, { label: '按农业植保做', value: 'task:agricultural_spraying' }],
      } : null;
      const result = {
        // 工作台只做两个任务；读出别的（包括中性外观比较）时保持原任务。读出的任务和现在的不同，由界面先问设计者，不直接换。
        taskId: outOfScope ? taskId : studioTaskIds.includes(r.taskId) ? r.taskId : taskId,
        outOfScope,
        state: states.includes(r.state) ? r.state : 'unspecified',
        question: taskQuestion ?? (question?.options.length ? question : null),
        targets, interpretations,
        notes: (Array.isArray(r.notes) ? r.notes : []).map(n => ({ text: text(n?.text, 120) })).filter(n => n.text).slice(0, 4),
        cards: (Array.isArray(r.cards) ? r.cards : []).filter(c => cardIds.has(c?.id)).slice(0, 6).map(c => ({ id: c.id, why: text(c.why, 120) })),
      };
      return run1.finish(result, dropped);
    },
    async directions(input, { signal } = {}) {
      const locked = lockedLayers(input);
      const parameters = input?.lane?.parameters ?? null;
      const intent = { text: text(input?.intent?.text, 600), targets: (input?.intent?.targets ?? []).filter(x => pairIds.has(x?.pair) && validPole(x?.pole)),
        notes: (input?.intent?.notes ?? []).map(n => text(n, 120)).filter(Boolean) };
      const run1 = await run('directions', { text: '请根据确认的意图提出造型方向。', intent }, { task: 'directions', intent, lane: laneSummary(parameters, locked), wordPairs: pairTable, evidence: evidenceTable, cards: cardContext }, signal);
      const dropped = [];
      const pairs = intent.targets.map(x => x.pair);
      const directions = (Array.isArray(run1.raw?.directions) ? run1.raw.directions : []).slice(0, 3).map(d => {
        const changes = (Array.isArray(d?.changes) ? d.changes : []).flatMap(c => {
          const checked = checkChanges([c], { allowed: editable(locked, undefined, parameters), parameters });
          dropped.push(...checked.dropped);
          return checked.accepted.map(a => ({ ...a, ...withEvidence(c, [a], cardIds, pairs) }));
        });
        return { name: text(d?.name, 16, '方向'), summary: text(d?.summary, 160), changes };
      }).filter(d => d.changes.length);
      return run1.finish({ directions }, dropped);
    },
    async layer(input, { signal } = {}) {
      const layer = layers.includes(input?.layer) ? input.layer : null;
      if (!layer) throw bad('没有指明是哪一层。');
      const message = userText(input?.message, 400);
      const locked = lockedLayers(input);
      const parameters = input?.lane?.parameters ?? null;
      const history = (Array.isArray(input?.history) ? input.history : []).slice(-6)
        .filter(h => ['user', 'assistant'].includes(h?.role) && typeof h.content === 'string').map(h => ({ role: h.role, content: scrub(h.content.slice(0, 800)) }));
      const pairs = (input?.intent?.targets ?? []).filter(x => pairIds.has(x?.pair)).map(x => x.pair);
      const run1 = await run('layer', { message, history, layer, lane: { parameters } },
        { task: 'layer', layer, intent: input?.intent ?? null, lane: laneSummary(parameters, locked), wordPairs: pairTable, evidence: evidenceTable, cards: cardContext }, signal);
      const r = run1.raw ?? {};
      const dropped = [];
      const suggestions = locked.includes(layer) ? [] : (Array.isArray(r.suggestions) ? r.suggestions : []).slice(0, 2).map(s => {
        const checked = checkChanges(s?.changes, { allowed: editable(locked, layer, parameters), parameters });
        dropped.push(...checked.dropped);
        return { title: text(s?.title, 40, '建议'), why: text(s?.why, 200), changes: checked.accepted, ...withEvidence(s ?? {}, checked.accepted, cardIds, pairs) };
      }).filter(s => s.changes.length);
      const other = r.otherLayer && layers.includes(r.otherLayer.layer) && r.otherLayer.layer !== layer ? { layer: r.otherLayer.layer, why: text(r.otherLayer.why, 120) } : null;
      return run1.finish({ reply: text(r.reply, 600, '（没有回答）'), suggestions, otherLayer: other, cards: checkCards(r.cards, cardIds) }, dropped);
    },
    async revise(input, { signal } = {}) {
      const message = userText(input?.message, 300);
      const locked = lockedLayers(input);
      const parameters = input?.candidate?.parameters ?? input?.lane?.parameters ?? null;
      const run1 = await run('revise', { message, candidate: { parameters } },
        { task: 'revise', intent: input?.intent ?? null, candidate: laneSummary(parameters, locked), evidence: evidenceTable }, signal);
      const r = run1.raw ?? {};
      const checked = checkChanges(r.changes, { allowed: editable(locked, undefined, parameters), parameters });
      const changedLayers = new Set(checked.accepted.map(c => c.layer));
      // 保持项由实际改动推出：没改的层都保持，不采信模型自报的保持项。
      const keep = layers.filter(l => !changedLayers.has(l));
      const evidence = relevantCitations(Array.isArray(r.evidence) ? r.evidence : [], checked.accepted.map(c => c.field));
      return run1.finish({ reply: text(r.reply, 400), goal: text(r.goal, 160, message), changes: checked.accepted, keep, evidence,
        tier: tierOf(evidence, checked.accepted.map(c => c.field)) }, checked.dropped);
    },
    async free(input, { signal } = {}) {
      const messages = (Array.isArray(input?.messages) ? input.messages : []).slice(-16)
        .filter(m => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string' && m.content.trim())
        .map(m => ({ role: m.role, content: scrub(m.content.trim().slice(0, 1200)) }));
      if (!messages.length || messages[messages.length - 1].role !== 'user') throw bad('请先说一句话。');
      const brief = text(input?.brief, 1200);
      const run1 = await run('free', { messages }, { brief }, signal);
      const r = run1.raw ?? {};
      return run1.finish({ reply: text(r.reply, 1200, '（没有回答）'), prompt: typeof r.prompt === 'string' && r.prompt.trim() ? text(r.prompt, 1600) : null }, []);
    },
  };
}

/** 依据条目原文，界面显示用。 */
export function evidenceForClient() { return evidenceItems.map(e => ({ ...e })); }
export { evidenceItem };
