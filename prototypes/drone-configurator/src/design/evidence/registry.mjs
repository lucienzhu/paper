// 研究证据的登记表：AI 给设计建议时只能引用这里的条目，证据的强弱跟着条目走，AI 不能改。
// 三级：已验证（几何计算、这条出图通路有分母的实测）、统计相关（真实产品上看到的关系）、设计假设（没有数据的设计理解）。
// 用户原话另作一类，来自 36 张公开证据卡（src/data/evidenceCards.json），说明需求和感受，不直接给造型规则。
// 每条的说法由研究者写定，界面原样显示；数字的出处见 source。改动这张表要同时改版本号。

export const registryVersion = 'evidence-registry/1 (2026-11-22)';

export const tiers = {
  validated: { label: '已验证', bars: 3, rank: 3, verb: '会', action: '照此修正' },
  correlation: { label: '统计相关', bars: 2, rank: 2, verb: '往往', action: '开一个分支试试' },
  hypothesis: { label: '设计假设', bars: 1, rank: 1, verb: '可以试试', action: '开一个分支试试' },
};

const S5 = 'experiments/s5-compactness-pilot/responses/README.md';
const A8 = 'evidence/20261117-research-update/a8-ai/README.md';
const WP = 'src/design/fields.ts（词对的说明）；planning/advisor-20261118/semantic/README.md';

export const items = [
  // 已验证：这条出图通路（点线条件图 + Qwen-Image 2.1）在不知情读数下的实测
  { id: 'V-WL-NARROW', tier: 'validated', fields: ['frame.span_ratio_wl'], pairs: [],
    statement: 'W/L 设为 0.70 时，这条出图通路出的图实际读成约 1.0：12 张里 0 张命中，三位不知情的判读者结果一致。',
    limits: '说的是出图工具的表现，不说明产品该不该这样设计。', source: A8 },
  { id: 'V-WL-WIDE', tier: 'validated', fields: ['frame.span_ratio_wl'], pairs: [],
    statement: 'W/L 设为 1.30 时，12 张全部命中（与目标相差不超过 0.10）。',
    limits: '只测了主批和扩展批的 12 张。', source: A8 },
  { id: 'V-WL-MID', tier: 'validated', fields: ['frame.span_ratio_wl'], pairs: [],
    statement: 'W/L 设为 1.00 时命中不稳：不知情的读数下 WLQ 12 张中 3 张，E3 三轮 27 张中 14 张；出图往往偏宽。',
    limits: '离容差边界 0.02 以内的图，判不判命中取决于读者。', source: A8 },

  // 统计相关：S5 第一步，32 款真实四旋翼、10 名评议者
  { id: 'C-FILL', tier: 'correlation', fields: ['propulsion.prop_diameter_inch', 'propulsion.prop_guard', 'fuselage.fuselage_dimensions_mm.width', 'fuselage.fuselage_dimensions_mm.length'], pairs: ['compact'],
    statement: '在 32 款真实四旋翼里，整机占外接框面积越大的，往往被评为越紧凑（等级相关 −0.85；去掉带护圈和涵道的机型后 −0.76）。',
    limits: '真实产品图上的相关；没有在生成图上检验，不能说明改大了就一定更紧凑。', source: S5 },
  { id: 'C-BWD', tier: 'correlation', fields: ['fuselage.fuselage_dimensions_mm.width'], pairs: ['compact'],
    statement: '在 32 款真实四旋翼里，机身宽与对角电机距之比越大的，往往被评为越紧凑（两位判读者分别为 −0.59、−0.65；去掉带护圈和涵道的机型后 −0.42）。',
    limits: '相关，不是因果；只改机身宽度的配对评议（S5 第二步）还没做。', source: S5 },
  { id: 'C-GUARD', tier: 'correlation', fields: ['propulsion.prop_guard'], pairs: ['compact'],
    statement: '评议里最紧凑的一端多是带护圈或涵道的小机。',
    limits: '这些机型同时也小，护圈本身的作用分不开；有一条用户原话说加了保护罩后显得挺大（E007）。', source: S5 },
  { id: 'C-WL-NONE', tier: 'correlation', fields: ['frame.span_ratio_wl'], pairs: ['compact'],
    statement: '电机布局的宽长比 W/L 与紧凑感没有关系（两位判读者 −0.07、−0.04）。',
    limits: '在 32 款真实四旋翼上看到的结果。', source: S5 },
  { id: 'C-DD-NONE', tier: 'correlation', fields: ['propulsion.prop_diameter_inch'], pairs: ['compact'],
    statement: '桨径与对角电机距之比和紧凑感没有可用的关系（+0.32、+0.15，靠护圈机型撑着，去掉后 −0.03）。',
    limits: '在 32 款真实四旋翼上看到的结果。', source: S5 },
  { id: 'C-LW-UNREAD', tier: 'correlation', fields: ['fuselage.fuselage_dimensions_mm.length'], pairs: ['compact'],
    statement: '机身长宽比与紧凑感的关系读不出来：两位判读者方向相反（−0.24、+0.24）。',
    limits: '机壳到哪儿为止各人理解不同；规则收紧后还没重量。', source: S5 },

  // 设计假设：词对落到部件或色材，是设计上的理解，没有评议数据
  { id: 'H-INT-ROOT', tier: 'hypothesis', fields: ['frame.arm_root'], pairs: ['integrated'],
    statement: '把“整体”理解为臂根无缝过渡。', limits: '“整体—拼凑”落到臂根是设计者的转译，没有评议数据。', source: WP },
  { id: 'H-INT-CAM', tier: 'hypothesis', fields: ['accessories.camera_mount'], pairs: ['integrated'],
    statement: '把“整体”理解为相机内嵌在机鼻里。', limits: '设计者的转译，没有评议数据。', source: WP },
  { id: 'H-SIMPLE-COVER', tier: 'hypothesis', fields: ['fuselage.top_cover', 'fuselage.fuselage_style'], pairs: ['simple'],
    statement: '把“简洁”理解为单块顶盖、少分件。', limits: '评论里的“简洁”多未指明部位，落到顶盖是设计者的转译。', source: WP },
  { id: 'H-LOW-CMF', tier: 'hypothesis', fields: ['accessories.drone_primary_color', 'accessories.surface_finish', 'frame.material_visual'], pairs: ['visible'],
    statement: '把“低调”理解为中性色、哑光。', limits: '设计者的转译，配色效果没有评议。', source: WP },
  { id: 'H-VIS-CMF', tier: 'hypothesis', fields: ['accessories.drone_primary_color'], pairs: ['visible'],
    statement: '把“醒目”理解为高饱和的主色。', limits: '用户原话里有亮橙、高饱和色的愿望（E030、E031、E034），配色效果没有评议。', source: WP },
  { id: 'H-CW1', tier: 'hypothesis', fields: ['fuselage.fuselage_dimensions_mm.width'], pairs: ['compact'],
    statement: '已登记的假设 CW-1.0：在同一展开顶视图上只改机身相对宽度，独立读者会觉得更紧凑。',
    limits: '有真实产品上的相关支持（C-BWD），因果还没检验。', source: 'src/design/semantics/topics.mjs（widthHypothesis）' },
];

const byId = new Map(items.map(item => [item.id, item]));
export function item(id) { return byId.get(id) ?? null; }

/** 一条建议的强弱：取它引用的、并且确实针对所改参数的条目中最强的一级；一条都没有就是设计假设。 */
export function tierOf(ids, changedFields = []) {
  let best = 'hypothesis';
  for (const id of ids) {
    const entry = byId.get(id);
    if (!entry) continue;
    if (changedFields.length && !entry.fields.some(f => changedFields.includes(f))) continue;
    if (tiers[entry.tier].rank > tiers[best].rank) best = entry.tier;
  }
  return best;
}

/** 只留下真实存在、并且针对所改参数（或所述词对）的引用。 */
export function relevantCitations(ids, changedFields = [], pairs = []) {
  return [...new Set(ids)].filter(id => {
    const entry = byId.get(id);
    if (!entry) return false;
    if (!changedFields.length && !pairs.length) return true;
    return entry.fields.some(f => changedFields.includes(f)) || entry.pairs.some(p => pairs.includes(p));
  });
}
