// 4.0 决定链模型的核对：分叉、共用上游、改动落在哪一层、套用、过时判断、起始值。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLayer, boardRows, clearValue, conditionHolds, forkAt, laneIntent, laneNode, laneParameters, lanePath, layerDifferences, layerFields, layerOf, layers,
  migrate, newProject, privatize, removeLane, setValue, sharedBy, staleFields, upstreamOf,
} from '../src/v4/model.ts';
import { designStart } from '../src/design/defaults.ts';
import { fields } from '../src/design/fields.ts';
import { computeLayout } from '../src/design/design.ts';

test('every parameter in the field register belongs to exactly one layer; the designer\'s own colour and material note sits in CMF', () => {
  const owned = layers.flatMap(l => layerFields[l]);
  assert.equal(new Set(owned).size, owned.length);
  for (const f of fields) assert.ok(layerOf(f.path), '没有归属：' + f.path);
  assert.equal(layerOf('accessories.custom_prompt_additions'), 'cmf');
});

test('a new project starts from the real-product starting values on one direction', () => {
  const p = newProject();
  assert.equal(p.lanes.length, 1);
  assert.deepEqual(lanePath(p, 'lane-A').map(n => n.layer), layers);
  const spec = laneParameters(p, 'lane-A');
  assert.equal(spec.frame.frame_type, designStart.frame_type);
  assert.equal(spec.frame.span_ratio_wl, designStart.span_ratio_wl);
  assert.deepEqual(spec.fuselage.fuselage_dimensions_mm, designStart.fuselage_dimensions_mm);
  assert.equal(computeLayout(spec).warnings.length, 0);
});

test('an edit lands on the layer that owns the field', () => {
  const p = newProject();
  const node = setValue(p, 'lane-A', 'fuselage.fuselage_dimensions_mm.width', 60);
  assert.equal(node.layer, 'body');
  assert.equal(laneParameters(p, 'lane-A').fuselage.fuselage_dimensions_mm.width, 60);
  assert.equal(setValue(p, 'lane-A', 'frame.arm_root', 'seamless').layer, 'details');
  assert.equal(setValue(p, 'lane-A', 'frame.material_visual', 'Carbon Fiber').layer, 'cmf');
  // 改回起始值、又从没改过的，不算改动
  const fresh = newProject();
  assert.equal(setValue(fresh, 'lane-A', 'frame.wheelbase_mm', designStart.wheelbase_mm), null);
  assert.ok(clearValue(p, 'lane-A', 'fuselage.fuselage_dimensions_mm.width'));
  assert.equal(laneParameters(p, 'lane-A').fuselage.fuselage_dimensions_mm.width, designStart.fuselage_dimensions_mm.width);
});

test('forking at the body shares frame and propulsion, copies body and everything below', () => {
  const p = newProject();
  setValue(p, 'lane-A', 'propulsion.prop_diameter_inch', 6);
  setValue(p, 'lane-A', 'fuselage.fuselage_style', 'Aerodynamic Pod');
  const b = forkAt(p, 'lane-A', 'body', '方向 B', '试加宽机身');
  const a = lanePath(p, 'lane-A'), bp = lanePath(p, b.id);
  assert.equal(a[0].id, bp[0].id);
  assert.equal(a[1].id, bp[1].id);
  for (const i of [2, 3, 4]) assert.notEqual(a[i].id, bp[i].id);
  assert.equal(laneParameters(p, b.id).fuselage.fuselage_style, 'Aerodynamic Pod');
  assert.deepEqual(b.forkedFrom, { laneId: 'lane-A', layer: 'body', reason: '试加宽机身' });
  // 改分支的机身，原方向不变
  setValue(p, b.id, 'fuselage.fuselage_dimensions_mm.width', 60);
  assert.equal(laneParameters(p, 'lane-A').fuselage.fuselage_dimensions_mm.width, designStart.fuselage_dimensions_mm.width);
  // 改共用的动力，两条方向一起变
  setValue(p, 'lane-A', 'propulsion.prop_diameter_inch', 5.5);
  assert.equal(laneParameters(p, b.id).propulsion.prop_diameter_inch, 5.5);
  assert.deepEqual(sharedBy(p, a[1].id).sort(), ['lane-A', b.id].sort());
  // 画布：共用节点只画一次，在第一条方向那一行
  const rows = boardRows(p);
  assert.equal(rows.get(a[1].id), 0);
  assert.equal(rows.get(bp[2].id), 1);
});

test('the cumulative view of a layer ignores the layers below it', () => {
  const p = newProject();
  setValue(p, 'lane-A', 'fuselage.fuselage_style', 'Faceted Compact');
  setValue(p, 'lane-A', 'accessories.drone_primary_color', '#f97316');
  assert.equal(laneParameters(p, 'lane-A', 'propulsion').fuselage.fuselage_style, '');
  assert.equal(laneParameters(p, 'lane-A', 'body').fuselage.fuselage_style, 'Faceted Compact');
  assert.equal(laneParameters(p, 'lane-A', 'body').accessories.drone_primary_color, '');
});

test('applying a layer from another direction changes only the receiving direction', () => {
  const p = newProject();
  const b = forkAt(p, 'lane-A', 'body');
  setValue(p, b.id, 'fuselage.fuselage_style', 'Boxy Enclosure');
  const c = forkAt(p, 'lane-A', 'details');
  // A 与 C 共用机身；把 B 的机身套用到 C，A 不能跟着变
  applyLayer(p, b.id, c.id, 'body');
  assert.equal(laneParameters(p, c.id).fuselage.fuselage_style, 'Boxy Enclosure');
  assert.equal(laneParameters(p, 'lane-A').fuselage.fuselage_style, '');
  assert.equal(laneNode(p, c.id, 'body').origin.laneId, b.id);
});

test('privatizing gives a direction its own copies only when something is shared', () => {
  const p = newProject();
  assert.equal(privatize(p, 'lane-A', 'body'), false);
  const b = forkAt(p, 'lane-A', 'cmf');
  assert.equal(privatize(p, b.id, 'body'), true);
  assert.notEqual(laneNode(p, 'lane-A', 'body').id, laneNode(p, b.id, 'body').id);
  assert.equal(laneNode(p, 'lane-A', 'propulsion').id, laneNode(p, b.id, 'propulsion').id);
});

test('removing a direction prunes nodes nobody uses', () => {
  const p = newProject();
  const b = forkAt(p, 'lane-A', 'propulsion');
  const before = Object.keys(p.nodes).length;
  removeLane(p, b.id);
  assert.equal(Object.keys(p.nodes).length, before - 4);
  assert.throws(() => removeLane(p, 'lane-A'), /至少保留一个方案/);
});

test('stale fields list exactly the changes made after a round was frozen', () => {
  const p = newProject();
  const frozen = laneParameters(p, 'lane-A');
  assert.deepEqual(staleFields(frozen, laneParameters(p, 'lane-A')), []);
  setValue(p, 'lane-A', 'fuselage.fuselage_dimensions_mm.width', 60);
  setValue(p, 'lane-A', 'frame.arm_root', 'seamless');
  assert.deepEqual(staleFields(frozen, laneParameters(p, 'lane-A')).map(d => d.path).sort(),
    ['frame.arm_root', 'fuselage.fuselage_dimensions_mm.width']);
});

test('only accepted intent elements reach the compiled intent', () => {
  const p = newProject();
  p.intent.elements = [
    { id: 'e1', kind: 'target', text: '紧凑', pair: 'compact', pole: 'left', cards: ['E001'], basis: 'user', status: 'accepted' },
    { id: 'e2', kind: 'interpretation', text: '配色偏低调', pair: 'visible', pole: 'left', cards: [], basis: 'ai', status: 'rejected' },
    { id: 'e3', kind: 'note', text: '不要像玩具', cards: [], basis: 'designer', status: 'accepted' },
  ];
  p.intent.cards = ['E001'];
  assert.deepEqual(laneIntent(p), { taskId: 'consumer_camera', targets: { compact: 'left' }, note: '不要像玩具', cards: ['E001'], log: [] });
});

test('a stored project survives a round trip and a broken one is refused', () => {
  const p = newProject();
  forkAt(p, 'lane-A', 'body');
  assert.ok(migrate(JSON.parse(JSON.stringify(p))));
  const broken = JSON.parse(JSON.stringify(p));
  delete broken.nodes[lanePath(p, 'lane-A')[1].id];
  assert.equal(migrate(broken), null);
});

// ---------- 4.2：主实验在前、植保六旋的药箱与喷洒部件、C2 的机身间距、按场次认轮次 ----------
import { baseParameters, studioTasks } from '../src/v4/model.ts';
import { compilePrompt } from '../src/design/partPrompt.ts';
import { bodyClearance, envelopeClearance } from '../src/design/checks.ts';
import { study, studyBriefs } from '../src/design/defaults.ts';
import { registrationClash, roundsOfSession, sessionStem, sessionTitle } from '../src/v4/sessions.ts';

// 植保六旋的药箱句和喷杆句是作者定下的设计起点，措辞取自旧六旋请求；旧请求 2026-11-26 已随旧数据归档，原句固定在这里。
const frozenHexSentences = [
  'A square spray tank sits half-embedded in the central frame: the frame wraps the lower half of the tank, while the tank top and its round filler cap stay exposed.',
  'A transverse spray boom runs across under the body and extends beyond both sides of the frame.',
];

test('the workbench offers only the two study tasks; aerial is quad-only and plant protection is the flat hex', () => {
  assert.deepEqual(studioTasks.map(t => t.id), ['consumer_camera', 'agricultural_spraying']);
  assert.ok(studioTasks[0].frames.every(f => computeLayout({ ...baseParameters('consumer_camera'), frame: { ...baseParameters('consumer_camera').frame, frame_type: f } }).hubs.length === 4));
  assert.deepEqual(studioTasks[1].frames, ['Radial Hex']);
});

test('the plant-protection start keeps the frozen design start: two blades, folding hinge, half-embedded tank, transverse boom', () => {
  const p = baseParameters('agricultural_spraying');
  assert.equal(p.propulsion.prop_blade_count, '2叶');
  assert.equal(p.frame.arm_root, 'hinge');
  assert.equal(p.accessories.spray_tank, 'half-embedded');
  assert.equal(p.accessories.spray_system, 'boom');
  const text = compilePrompt(p, {}, { taskId: 'agricultural_spraying', targets: {}, note: '', cards: [], log: [] }, computeLayout(p)).text;
  // 药箱句和喷杆句与固定的原句一字不差。
  for (const sentence of frozenHexSentences) assert.ok(text.includes(sentence), '缺少原句：' + sentence);
  assert.equal(layerOf('accessories.spray_tank'), 'body');
  assert.equal(layerOf('accessories.spray_system'), 'details');
});

test('tank and spray sentences appear only in the plant-protection task, and the nozzle option keeps the archived wording', () => {
  const quad = { ...baseParameters('consumer_camera') };
  quad.accessories = { ...quad.accessories, spray_tank: 'half-embedded', spray_system: 'boom' };
  const quadText = compilePrompt(quad, {}, { taskId: 'consumer_camera', targets: {}, note: '', cards: [], log: [] }, computeLayout(quad)).text;
  assert.ok(!/spray/i.test(quadText));
  const hexa = baseParameters('agricultural_spraying');
  hexa.accessories = { ...hexa.accessories, spray_system: 'motor-nozzles' };
  const out = compilePrompt(hexa, { 'accessories.spray_system': true }, { taskId: 'agricultural_spraying', targets: {}, note: '', cards: [], log: [] }, computeLayout(hexa));
  const s = out.sentences.find(x => x.id === 'spray_system');
  assert.equal(s.text, 'There is no spray boom. Instead, one small round spray nozzle is mounted directly below each of the six motors, its dark nozzle tip just visible beside the motor from above.');
  assert.equal(s.source, 'chosen');
  assert.equal(out.sentences.find(x => x.id === 'spray_tank').source, 'default');
});

test('under C2 the drawn body clears the props; only the sharp-cornered envelope touches them', () => {
  const p = baseParameters('consumer_camera');
  Object.assign(p.frame, study.conditions.find(c => c.id === 'c2-pilot').frame);
  const layout = computeLayout(p);
  assert.ok(envelopeClearance(p, layout) < 0 && envelopeClearance(p, layout) > -1.5, '矩形包络在四角相交约 1.1 mm');
  assert.ok(bodyClearance(p, layout) >= 0, '按画出的圆角量不相交');
  for (const style of ['Aerodynamic Pod', 'Boxy Enclosure', 'Faceted Compact'])
    assert.ok(bodyClearance({ ...p, fuselage: { ...p.fuselage, fuselage_style: style } }, layout) >= 0, style);
  // 明显放不下时仍然报重叠。
  assert.ok(bodyClearance({ ...p, fuselage: { ...p.fuselage, fuselage_dimensions_mm: { length: 200, width: 120, height: 30 } } }, layout) < 0);
});

test('the two registered briefs are the pilot texts and both pair with the C2 frame', () => {
  assert.deepEqual(studyBriefs.map(b => b.id), ['A', 'B']);
  for (const b of studyBriefs) { assert.equal(b.condition, 'c2-pilot'); assert.match(b.text, /^为日常随行航拍设计一款四旋翼，展开俯视时希望整体显得紧凑。/); }
});

test('rounds are attributed to their own session, and old untagged rounds only by project, method and time window', () => {
  const s1 = { id: 'session-1', no: 1, projectId: 'project-x', projectCreatedAt: '2026-11-23T01:00:00Z', method: 'structured', kind: 'registered', briefId: 'A', participant: 'P01', order: 1,
    startedAt: '2026-11-23T01:00:00Z', endedAt: '2026-11-23T01:20:00Z' };
  const s2 = { ...s1, id: 'session-2', no: 2, method: 'free', briefId: 'A', startedAt: '2026-11-23T01:20:00Z', endedAt: undefined };
  const round = (id, scope, at, sessionId) => ({ id, variantScope: scope, createdAt: at, sessionId, candidates: [], decisions: [] });
  const rows = [
    round('a', 'v4/project-x/lane-A', '2026-11-23T01:05:00Z', 'session-1'),
    round('b', 'v4free/project-x', '2026-11-23T01:25:00Z', 'session-2'),
    round('c', 'v4/project-x/lane-B', '2026-11-23T01:10:00Z', undefined),      // 4.1 留下的工作台轮次
    round('d', 'v4free/project-x', '2026-11-23T01:12:00Z', undefined),        // 4.1 留下的自由提示轮次，时间在第 1 场里，但方式不对
    round('e', 'v4/project-y/lane-A', '2026-11-23T01:06:00Z', undefined),     // 别的项目
  ];
  assert.deepEqual(roundsOfSession(s1, rows).rounds.map(r => r.id), ['a', 'c']);
  assert.deepEqual(roundsOfSession(s1, rows).legacy, ['c']);
  assert.deepEqual(roundsOfSession(s2, rows).rounds.map(r => r.id), ['b']);
  assert.match(sessionTitle(s1), /第 1 场 · 工作台 · 委托 A · 机鼻 · P01/);
  assert.equal(sessionStem(s2), 'session02-free-prompt-briefA-P01');
});

test('a session clock keeps active work, model and queue waiting, moderator handoff, technical pause and unknown waiting apart (overlaps counted once)', async () => {
  const { sessionTiming, sessionEventsCsv, eventColumns } = await import('../src/v4/timing.ts');
  const t0 = Date.parse('2026-11-23T10:00:00.000Z');
  const at = s => new Date(t0 + s * 1000).toISOString();
  const session = { id: 'session-x', no: 3, kind: 'registered', method: 'structured', briefId: 'A', participant: 'P01', order: 1, startedAt: at(0), endedAt: at(600), endReason: '到 10 分钟' };
  const events = [
    { at: at(30), kind: 'ai-call', task: 'intent', callId: 'c1', ok: true, startedAt: at(30), endedAt: at(50), text: '' },
    { at: at(180), kind: 'moderator-start', mark: 'handoff', note: '帮设计者粘贴委托', text: '' },
    { at: at(240), kind: 'moderator-end', text: '' },
    { at: at(360), kind: 'moderator-start', mark: 'pause', note: 'GPU 断线', text: '' },
    { at: at(390), kind: 'moderator-end', text: '' },
    { at: at(400), kind: 'final', attemptId: 'r1', candidateId: 'r1/1', text: '定为终稿' },
  ];
  const round = (id, sent, shown, status = 'succeeded') => ({ attemptId: id, label: id, condition: 'structured', frozenAt: at(sent - 2), sentAt: at(sent),
    enqueuedAt: at(sent + 1), executionStart: at(sent + 5), executionEnd: at(sent + 40), receivedAt: shown === null ? undefined : at(shown - 1),
    status, candidates: shown === null ? [] : [{ id: id + '/1', firstShown: at(shown) }], decisions: shown === null ? [] : [{ at: at(shown + 5), kind: 'accept', candidate: id + '/1', reason: '留着' }] });
  // 第 1 轮 1:00 发出、2:00 显示；第 2 轮 3:30 发出、4:30 显示（前半段与主持人交接重叠）；第 3 轮 9:00 发出，本场结束时还没回图
  const rounds = [round('r1', 60, 120), round('r2', 210, 270), round('r3', 540, null, 'running')];
  const t = sessionTiming(session, events, rounds);
  assert.equal(t.waiting.ms, (20 + 60 + 30) * 1000, '文字模型 20 秒 + 第 1 轮 60 秒 + 第 2 轮交接之后的 30 秒');
  assert.equal(t.moderator.ms, 60000);
  assert.equal(t.moderator.pauseMs, 30000);
  assert.equal(t.unknownWaitMs, 60000, '第 3 轮从发出到本场结束');
  assert.equal(t.activeMs, null, '有未知等待时不补数');
  assert.deepEqual(t.activeBounds, { low: 340000, high: 400000 });
  assert.deepEqual(t.used, { opportunities: 3, images: 2, requests: 3, enqueueRequests: 0 });
  assert.equal(t.over.opportunities, false);
  assert.ok(t.missing.some(m => /r3 的首次显示时间/.test(m.what)));
  assert.equal(t.waiting.image[0].runMs, 35000, '执行时长两端都是 GPU 主机的钟');
  // 登记的场次事件表：列名照原表，取不到的时间留空写原因
  const csv = sessionEventsCsv(session, '委托A·依据摘要v0', events, rounds);
  const [header, ...lines] = csv.trim().split('\n');
  assert.equal(header, eventColumns.join(','));
  const registered = new URL('../../../planning/research-library/design/session_events.csv', import.meta.url);
  const { existsSync, readFileSync } = await import('node:fs');
  if (existsSync(registered)) assert.equal(header, readFileSync(registered, 'utf8').split(/\r?\n/)[0], '与研究资料库里登记的空表同列');
  assert.ok(lines.some(l => l.includes('moderator_handoff_start') && l.includes('moderator') && l.includes('帮设计者粘贴委托')));
  assert.ok(lines.some(l => l.includes('technical_pause_start')));
  assert.ok(lines.some(l => l.startsWith('P01,3,委托A·依据摘要v0,S,r1,first_shown,' + at(120) + ',browser,r1/1,r1,')));
  assert.ok(lines.some(l => l.includes(',r3,first_shown,,browser,') === false && l.includes(',r3,return,,browser,') && l.endsWith('页面还没有收到回图或结论')));
  assert.ok(lines.some(l => l.includes(',run_start,' + at(65) + ',comfyui,')));
});

test('a session has one current final: a later one replaces the earlier, rejecting it withdraws it, and "nothing acceptable" is its own outcome', async () => {
  const { currentFinal, registrable, sessionTitle, sessionStem } = await import('../src/v4/sessions.ts');
  const e = (kind, attemptId) => ({ at: new Date().toISOString(), kind, attemptId, candidateId: attemptId && attemptId + '/1', text: kind });
  assert.equal(currentFinal([e('final', 'a'), e('final', 'b')]).current.attemptId, 'b');
  const withdrawn = currentFinal([e('final', 'a'), e('final', 'b'), e('final-withdrawn')]);
  assert.equal(withdrawn.current, null, '不退回更早的那张');
  assert.equal(withdrawn.history.length, 3);
  assert.equal(currentFinal([e('final', 'a'), e('final-none')]).current.kind, 'none-acceptable');
  assert.equal(currentFinal([e('edit'), e('run')]).current, null);
  // 登记场次四项齐全：委托、方式（工作台或自由提示）、匿名编号、次序
  assert.equal(registrable({ briefId: 'A', method: 'structured', participant: 'P01', order: 1 }), true);
  for (const missing of [{ briefId: undefined }, { method: 'open' }, { participant: ' ' }, { order: undefined }])
    assert.equal(registrable({ briefId: 'A', method: 'free', participant: 'P01', order: 2, ...missing }), false, JSON.stringify(missing));
  const trial = { id: 'session-1', no: 5, projectId: 'p', projectCreatedAt: '', method: 'free', kind: 'trial', briefId: 'A', startedAt: '' };
  assert.match(sessionTitle(trial), /委托 A · 机鼻 · 试用/);
  assert.equal(sessionStem(trial), 'session05-free-prompt-briefA-trial');
});

// ---------- 4.4（作者 11 月 24 日与 Codex 子代理走查） ----------
test('4.4: another version from a middle layer keeps the earlier layers shared, and says which', () => {
  assert.deepEqual(upstreamOf('frame'), []);
  assert.deepEqual(upstreamOf('body'), ['frame', 'propulsion']);
  const p = newProject();
  const b = forkAt(p, 'lane-A', 'body');
  assert.equal(b.name, '方案 B');
  for (const layer of upstreamOf('body')) assert.equal(laneNode(p, 'lane-A', layer).id, laneNode(p, b.id, layer).id, layer + ' 应当仍共用');
  assert.notEqual(laneNode(p, 'lane-A', 'body').id, laneNode(p, b.id, 'body').id);
  // 改共用的上游一层，两个方案一起变
  setValue(p, b.id, 'frame.wheelbase_mm', 260);
  assert.equal(laneParameters(p, 'lane-A').frame.wheelbase_mm, 260);
});

test('4.4: copying a layer from another solution lists exactly the items that will change', () => {
  const p = newProject();
  const b = forkAt(p, 'lane-A', 'frame');
  setValue(p, b.id, 'frame.arm_width_mm', '20mm');
  setValue(p, b.id, 'frame.wheelbase_mm', 260);
  const diffs = layerDifferences(p, b.id, 'lane-A', 'frame');
  assert.deepEqual(diffs.map(d => d.path).sort(), ['frame.arm_width_mm', 'frame.wheelbase_mm']);
  assert.deepEqual(diffs.find(d => d.path === 'frame.arm_width_mm'), { path: 'frame.arm_width_mm', from: '15mm', to: '20mm' });
  assert.deepEqual(layerDifferences(p, b.id, 'lane-A', 'cmf'), []);
  applyLayer(p, b.id, 'lane-A', 'frame');
  assert.deepEqual(layerDifferences(p, b.id, 'lane-A', 'frame'), []);
});

test('4.4: the registered frame condition is checked on every solution', () => {
  const c2 = study.conditions[0].frame;
  const p = newProject();
  for (const [k, v] of Object.entries(c2)) setValue(p, 'lane-A', 'frame.' + k, v);
  const b = forkAt(p, 'lane-A', 'body');
  assert.equal(conditionHolds(p, c2).ok, true);
  const c = forkAt(p, b.id, 'frame');
  setValue(p, c.id, 'frame.span_ratio_wl', 1.35);
  const held = conditionHolds(p, c2);
  assert.equal(held.ok, false);
  assert.deepEqual(held.mismatches, [{ laneId: c.id, path: 'frame.span_ratio_wl', expected: 1, actual: 1.35 }]);
});

test('4.4: a second registration that repeats the order, brief or method for the same participant is refused', () => {
  const first = { id: 's1', no: 1, projectId: 'p', projectCreatedAt: '', method: 'structured', kind: 'registered', briefId: 'A', participant: 'P01', order: 1, startedAt: '' };
  assert.deepEqual(registrationClash([first], { briefId: 'B', method: 'free', participant: 'P01', order: 2 }), []);
  assert.equal(registrationClash([first], { briefId: 'A', method: 'structured', participant: 'P01', order: 1 }).length, 3);
  assert.match(registrationClash([first], { briefId: 'B', method: 'free', participant: ' P01 ', order: 1 }).join(), /已经有第 1 场/);
  // 别人、试用都不算冲突
  assert.deepEqual(registrationClash([first], { briefId: 'A', method: 'structured', participant: 'P02', order: 1 }), []);
  assert.deepEqual(registrationClash([first], { briefId: 'A', method: 'structured', participant: 'P01' }), []);
});
