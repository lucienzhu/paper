// 4.0 AI 服务的核对：规则回退的确定性回答；对模型回答的核对（字段、取值、引用、证据强弱）；版本锁定；调用记录。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesignAI, legalValue } from './design-ai.mjs';
import { baseParameters } from '../src/v4/model.ts';

const spec = baseParameters('consumer_camera');
const reply = content => Response.json({ id: 'chat-1', model: 'MiniMax-M3.1-Flash', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }], usage: { total_tokens: 10 } });

test('legal values are snapped to the field grid and illegal ones refused', () => {
  assert.equal(legalValue('fuselage.fuselage_dimensions_mm.width', 61), 60);
  assert.equal(legalValue('fuselage.fuselage_dimensions_mm.width', 500), undefined);
  assert.equal(legalValue('frame.arm_root', 'Seamless'), 'seamless');
  assert.equal(legalValue('frame.arm_root', 'glued'), undefined);
  assert.equal(legalValue('accessories.drone_primary_color', '#F97316'), '#f97316');
  assert.equal(legalValue('frame.span_ratio_wl', 1.354), 1.35);
  assert.equal(legalValue('no.such.field', 1), undefined);
});

test('without a key the service answers by rules, says so, and still logs every call', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'ai-fixture-'));
  try {
    const ai = await createDesignAI({ logDir });
    assert.deepEqual(ai.describe().mode, 'fixture');
    const reading = await ai.intent({ text: '一台日常随身带的航拍无人机，希望看起来小巧、紧凑，但不要像玩具', taskId: 'consumer_camera' });
    assert.equal(reading.call.mode, 'fixture');
    assert.deepEqual(reading.targets.map(t => [t.pair, t.pole]), [['compact', 'left']]);
    assert.deepEqual(reading.targets[0].cards, ['E001']);
    assert.equal(reading.interpretations.length, 1);
    assert.ok(reading.question.options.some(o => o.value === 'unfolded_top'));
    const body = await ai.layer({ layer: 'body', message: '再紧凑一点', lane: { parameters: spec }, intent: { targets: [{ pair: 'compact', pole: 'left' }] } });
    assert.equal(body.suggestions.length, 1);
    assert.equal(body.suggestions[0].tier, 'correlation');
    assert.deepEqual(body.suggestions[0].changes.map(c => [c.field, c.from, c.value]), [['fuselage.fuselage_dimensions_mm.width', 55, 60]]);
    const frame = await ai.layer({ layer: 'frame', message: '想更紧凑', lane: { parameters: spec } });
    assert.equal(frame.suggestions.length, 0);
    assert.match(frame.reply, /没有关系/);
    const revise = await ai.revise({ message: '机身短一点，其他别动', candidate: { parameters: spec } });
    assert.deepEqual(revise.changes.map(c => [c.field, c.value]), [['fuselage.fuselage_dimensions_mm.length', 135]]);
    assert.deepEqual(revise.keep, ['frame', 'propulsion', 'details', 'cmf']);
    const free = await ai.free({ messages: [{ role: 'user', content: '想要一个圆润的机身' }] });
    assert.ok(free.prompt.includes('圆润'));
    const files = await readdir(logDir);
    const lines = (await readFile(join(logDir, files[0]), 'utf8')).trim().split('\n').map(l => JSON.parse(l));
    assert.equal(lines.length, 5);
    assert.deepEqual(lines.map(l => l.task), ['intent', 'layer', 'layer', 'revise', 'free']);
    assert.ok(lines.every(l => l.id && l.at && Number.isFinite(l.latencyMs) && l.result));
  } finally { await rm(logDir, { recursive: true, force: true }); }
});

test('model answers are checked: unknown fields, illegal values, locked layers and irrelevant citations are dropped; tiers come from the register', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'ai-model-'));
  const sent = [];
  const answers = [
    // 逐层建议：一条合法（引用相关的统计相关条目），一条改了别的层，一条取值越界，一条引用了无关条目
    { reply: '可以试试。', suggestions: [
      { title: '加宽机身', why: '真实产品里往往更紧凑', changes: [{ field: 'fuselage.fuselage_dimensions_mm.width', value: 60 }], evidence: ['C-BWD', 'V-WL-WIDE', 'X-NONE'], cards: ['E001', 'E999'] },
      { title: '改轴距', changes: [{ field: 'frame.wheelbase_mm', value: 300 }], evidence: [] },
    ], otherLayer: { layer: 'propulsion', why: '面积占比' } },
    { reply: '再试', suggestions: [{ title: '太宽了', changes: [{ field: 'fuselage.fuselage_dimensions_mm.width', value: 900 }], evidence: ['C-BWD'] }] },
    { reply: '这条只引了无关条目', suggestions: [{ title: '换轮廓', changes: [{ field: 'fuselage.fuselage_style', value: 'Boxy Enclosure' }], evidence: ['V-WL-NARROW'] }] },
    // 方向：锁定的机架层不能改
    { directions: [{ name: '甲', summary: 's', changes: [{ field: 'frame.span_ratio_wl', value: 1.0, evidence: ['V-WL-MID'] }, { field: 'frame.arm_root', value: 'seamless', evidence: ['H-INT-ROOT'] }] }] },
  ];
  const fetchImpl = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return reply(answers.shift()); };
  try {
    const ai = await createDesignAI({ apiKey: 'test-key', region: 'global', fetchImpl, logDir });
    assert.equal(ai.describe().mode, 'model');
    const a = await ai.layer({ layer: 'body', message: '再紧凑一点', lane: { parameters: spec } });
    assert.equal(a.suggestions.length, 1);
    assert.deepEqual(a.suggestions[0].evidence, ['C-BWD']);
    assert.equal(a.suggestions[0].tier, 'correlation');
    assert.deepEqual(a.suggestions[0].cards, ['E001']);
    assert.equal(a.otherLayer.layer, 'propulsion');
    assert.equal(a.call.model, 'MiniMax-M3.1-Flash');
    assert.equal(sent[0].url, 'https://api.minimax.io/v1/chat/completions');
    assert.equal(sent[0].body.model, 'MiniMax-M3.1-Flash');
    // 上下文里有证据条目和参数表，没有卡外的东西
    const context = JSON.parse(sent[0].body.messages[1].content);
    assert.ok(context.evidence.some(e => e.id === 'C-BWD' && e.tier === 'correlation'));
    assert.ok(context.lane.body.fields.some(f => f.field === 'fuselage.fuselage_dimensions_mm.width' && f.current === 55));
    const b = await ai.layer({ layer: 'body', message: '更宽', lane: { parameters: spec } });
    assert.equal(b.suggestions.length, 0);
    const c = await ai.layer({ layer: 'body', message: '换轮廓', lane: { parameters: spec } });
    assert.equal(c.suggestions[0].tier, 'hypothesis');
    assert.deepEqual(c.suggestions[0].evidence, []);
    const d = await ai.directions({ intent: { text: '紧凑', targets: [{ pair: 'compact', pole: 'left' }] }, lane: { parameters: spec }, locked: ['frame'] });
    assert.deepEqual(d.directions[0].changes.map(x => x.field), ['frame.arm_root']);
    assert.equal(d.directions[0].changes[0].tier, 'hypothesis');
    const lines = (await readFile(join(logDir, (await readdir(logDir))[0]), 'utf8')).trim().split('\n').map(l => JSON.parse(l));
    assert.equal(lines.length, 4);
    assert.ok(lines[0].rawText.includes('加宽机身'));
    assert.ok(lines[0].dropped.some(x => x.field === 'frame.wheelbase_mm'));
    assert.ok(!JSON.stringify(lines).includes('test-key'));
  } finally { await rm(logDir, { recursive: true, force: true }); }
});

test('a reply from a different model version is refused, so both conditions stay on one pinned model', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'ai-pin-'));
  try {
    const fetchImpl = async () => Response.json({ model: 'Some-Other-Model', choices: [{ finish_reason: 'stop', message: { content: '{"reply":"x","prompt":null}' } }] });
    const ai = await createDesignAI({ apiKey: 'k', region: 'global', fetchImpl, logDir });
    await assert.rejects(ai.free({ messages: [{ role: 'user', content: '你好' }] }), /锁定的版本不一致/);
    const lines = (await readFile(join(logDir, (await readdir(logDir))[0]), 'utf8')).trim().split('\n');
    assert.match(lines[0], /锁定的版本不一致/);
  } finally { await rm(logDir, { recursive: true, force: true }); }
});

test('the free assistant receives no evidence register and no parameter table', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'ai-free-'));
  let body;
  try {
    const ai = await createDesignAI({ apiKey: 'k', region: 'global', logDir, fetchImpl: async (_u, init) => { body = JSON.parse(init.body); return reply({ reply: '好', prompt: 'a drone' }); } });
    const r = await ai.free({ messages: [{ role: 'user', content: '帮我写提示词' }], brief: '设计一架日常携带的四旋翼' });
    assert.equal(r.prompt, 'a drone');
    const all = JSON.stringify(body.messages);
    assert.ok(!all.includes('C-BWD') && !all.includes('E001') && !all.includes('fuselage.'));
    assert.ok(all.includes('设计一架日常携带的四旋翼'));
  } finally { await rm(logDir, { recursive: true, force: true }); }
});

test('pasted credentials and contact details never reach the model', async () => {
  const logDir = await mkdtemp(join(tmpdir(), 'ai-scrub-'));
  let body;
  try {
    const ai = await createDesignAI({ apiKey: 'k', region: 'global', logDir, fetchImpl: async (_u, init) => { body = init.body; return reply({ reply: '好', prompt: null }); } });
    await ai.free({ messages: [{ role: 'user', content: '我的邮箱 someone@example.com，密钥 sk-abcdefghijklmnop' }] });
    assert.ok(!body.includes('someone@example.com') && !body.includes('sk-abcdefghijklmnop'));
  } finally { await rm(logDir, { recursive: true, force: true }); }
});
