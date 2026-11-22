// 4.0 工作台走查：写意图 → AI 读出目标并逐条确认 → 补充一句不盖掉已确认的条目 → AI 提方向、放成两条方向（上游共用）
// → 对机身说话，建议带依据分级、默认开分支 → 生成一轮 → 在候选上改 → 两张并排比较并取舍；
// 再做一场“AI 对话 + 自由提示”（发出去的就是确认的原文），最后载入登记条件，核对机架锁定、研究记录抽屉和 AI 调用日志。
// 图像作业和文字模型都由软件夹具应答，不调用任何模型。运行前先执行 npm run build。可加一个目录参数保存截图。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';
import { createDesignAI } from './design-ai.mjs';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const capture = process.argv[2];
if (capture) await mkdir(capture, { recursive: true });
const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
const historyOf = (id, graph) => ({ [id]: { prompt: [1, id, graph, { client_id: 'fixture' }, ['12']],
  outputs: { 12: { images: [{ filename: graph['12'].inputs.filename_prefix + '_00001_.png', subfolder: '', type: 'output' }] } },
  status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: Date.now() - 20 }], ['execution_success', { prompt_id: id, timestamp: Date.now() }]] } } });
const uploads = new Map(), graphs = [], runs = new Map(); let output = null;
const comfy = async (url, init = {}) => {
  const { pathname } = new URL(url);
  if (pathname === '/upload/image') { const file = init.body.get('image'); uploads.set(file.name, Buffer.from(await file.arrayBuffer())); return Response.json({ name: file.name, subfolder: '', type: 'input' }); }
  if (pathname === '/prompt') { const graph = JSON.parse(init.body).prompt; graphs.push(graph); output = tagPNG(graph['15'] ? uploads.get(graph['15'].inputs.image) : plain, graph); runs.set('fixture-' + graphs.length, graph); return Response.json({ prompt_id: 'fixture-' + graphs.length, node_errors: {} }); }
  if (pathname.startsWith('/history/')) { const id = decodeURIComponent(pathname.slice(9)); return Response.json(historyOf(id, runs.get(id))); }
  if (pathname === '/view') return new Response(output, { headers: { 'Content-Type': 'image/png' } });
  return new Response('not found', { status: 404 });
};
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 30 }, fetchImpl: comfy, directory: await mkdtemp(join(tmpdir(), 'studio4-jobs-')) });
const logDir = await mkdtemp(join(tmpdir(), 'studio4-ai-'));
const ai = await createDesignAI({ logDir });
const server = createDesignServer(chat, evidence, jobs, ai);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith('http') && url.origin !== origin) { errors.push('unexpected external request ' + url.origin); return route.abort(); }
    return route.continue();
  });
  const shot = name => capture ? page.screenshot({ path: join(capture, name) }) : Promise.resolve();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')));
  const say = async text => { await page.locator('#v4-command').fill(text); await page.locator('#v4-command').press('Enter'); };
  const attempts = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
    const rows = await new Promise(resolve => { const q = db.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => resolve(q.result); });
    db.close();
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(a => ({ id: a.id, scope: a.variantScope, condition: a.condition, text: a.confirmedText,
      status: a.h3?.status, candidates: a.candidates.length, parent: !!a.parentImage, keep: a.keep, path: a.decisionPath?.map(d => d.layer) }));
  });
  // Esc 回到总览（焦点在输入框里时 Esc 不起作用，先移开焦点）。
  const overview = async () => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Escape'); await page.getByTestId('overview-panel').waitFor(); };
  const setup = async () => { const box = page.getByTestId('session-setup'); if (!await box.evaluate(d => d.open)) await box.locator('summary').click(); return box; };

  // 0. 旧版仍在 #v=3，顶栏有回到 4.0 的入口
  await page.goto(origin + '/#v=3');
  await page.locator('#drone-configurator-app').waitFor();
  await page.getByTestId('open-v4').click();
  await page.getByTestId('studio4').waitFor();

  // 1. 默认打开 4.0：一条方向、五层、文字模型写明是规则回退
  await page.goto(origin);
  await page.getByTestId('overview-panel').waitFor();
  assert.match(await page.getByTestId('ai-chip').textContent(), /规则回退/);
  assert.equal(await page.locator('[data-node=layer]').count(), 5);
  await shot('01-打开.png');

  // 2. 写意图：AI 读出两个目标和一句要你来理解的说法；逐条确认
  await say('做一台能折起来放进小包的航拍机，看起来要紧凑、整体，不要像拼起来的');
  await page.getByTestId('intent-panel').waitFor();
  await page.locator('[data-element=target]').nth(1).waitFor();
  assert.equal(await page.locator('[data-element=target]').count(), 2);
  assert.ok(await page.locator('[data-element=interpretation]').count() >= 1);
  for (let i = 0; i < 2; i++) await page.locator('[data-element=target]').nth(i).locator('[data-act=accept]').click();
  await shot('02-意图.png');
  // 补充一句：意图追加，已经确认的两个目标保留
  await say('机身要能单手握住');
  await page.waitForFunction(() => document.querySelector('[data-testid=intent-text]')?.value.includes('单手握住'));
  assert.equal(await page.locator('[data-element=target].is-accepted').count(), 2);
  assert.match((await saved()).project.intent.text, /紧凑.*\n机身要能单手握住/s);

  // 3. AI 提方向，放上画布：第一个用在方向 A，第二个从第一个改到的层分叉，上游共用
  await page.getByTestId('ask-directions').click();
  await page.getByTestId('place-direction').nth(1).waitFor();
  await page.getByTestId('place-direction').first().click();
  await page.getByTestId('layer-panel').waitFor();
  assert.deepEqual((await saved()).project.lanes.map(l => l.name), ['紧凑一体']);
  await page.locator('[data-node=intent]').click();
  await page.getByTestId('place-direction').first().click();
  await page.getByTestId('layer-panel').waitFor();
  assert.deepEqual((await saved()).project.lanes.map(l => l.name), ['紧凑一体', '利落工具感']);
  assert.equal(await page.locator('[data-node=layer][data-layer=frame]').count(), 1, '机架两条方向共用，只画一次');
  assert.equal(await page.locator('[data-node=layer][data-layer=body]').count(), 2);
  await shot('03-两条方向.png');

  // 4. 对机身说话：建议标“统计相关”，默认动作是开分支；开分支后跟到新的方向上
  assert.equal(await page.getByTestId('layer-panel').getAttribute('data-layer'), 'body');
  await say('再紧凑一点');
  const suggestion = page.locator('[data-suggestion]').first();
  await suggestion.waitFor();
  assert.equal(await suggestion.getAttribute('data-tier'), 'correlation');
  assert.equal(await suggestion.locator('.b4.pri').getAttribute('data-act'), 'branch');
  assert.ok(await suggestion.locator('[data-evidence=C-BWD]').count(), '引用的依据来自登记表');
  await shot('04-建议与依据.png');
  await suggestion.locator('[data-act=branch]').click();
  let state = await saved();
  assert.equal(state.project.lanes.length, 3);
  const branch = state.project.lanes.find(l => l.id === state.project.activeLaneId);
  assert.match(branch.name, /^利落工具感 · 试/);
  assert.deepEqual(state.selection, { kind: 'layer', laneId: branch.id, layer: 'body' });

  // 5. 生成一轮：候选出现在这一行后面；记录里有这一轮的决定链
  await page.locator(`[data-node=render][data-lane="${branch.id}"] [data-testid=node-run]`).click();
  await page.locator('[data-node=candidate]').first().waitFor({ timeout: 20000 });
  await page.locator('[data-node=candidate]').first().click();
  await page.getByTestId('candidate-panel').waitFor();
  await shot('05-候选.png');
  // 在候选上改：AI 只改机身长，其余层写成“保持不动”，父图是这张候选
  await page.getByTestId('revise-text').fill('机身短一点，其他别动');
  await page.getByTestId('revise-ask').click();
  await page.getByTestId('revision').waitFor();
  await page.getByTestId('revise-run').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-node=candidate]').length >= 2, null, { timeout: 20000 });
  // 新节点量好尺寸后画布才画它的连线，所以等连线出现。
  await page.locator('.react-flow__edge.is-revision').first().waitFor({ state: 'attached', timeout: 10000 });
  const rounds = await attempts();
  assert.equal(rounds.length, 2);
  assert.ok(rounds.every(r => r.scope === 'v4/' + branch.id && r.condition === 'structured'));
  assert.deepEqual(rounds[0].path, ['frame', 'propulsion', 'body', 'details', 'cmf']);
  assert.equal(rounds[1].parent, true);
  assert.match(rounds[1].keep, /机架/);

  // 6. 两张并排比较，选定一张并写下理由
  for (let i = 0; i < 2; i++) await page.locator('[data-node=candidate] .n4-check').nth(i).click();
  await page.locator('[data-node=candidate]').first().click();
  await page.getByTestId('open-compare').click();
  await page.getByTestId('compare-panel').waitFor();
  assert.match(await page.getByTestId('compare-panel').locator('.r4-title').textContent(), /差在 1 项决定/);
  await page.locator('.cmp4 input[type=radio]').nth(1).check();
  await page.getByTestId('compare-reason').fill('短一些更像随身带的东西');
  await page.getByTestId('compare-save').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')).compares[0]?.chosen);
  await shot('06-比较.png');

  // 7. 每次 AI 调用都记了日志：任务、规则回退、发出的消息和核对后的结果
  const files = (await readdir(logDir)).filter(f => f.endsWith('.jsonl'));
  const calls = (await Promise.all(files.map(f => readFile(join(logDir, f), 'utf8')))).join('').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual([...new Set(calls.map(c => c.task))].sort(), ['directions', 'intent', 'layer', 'revise']);
  assert.ok(calls.every(c => c.provider === 'rules' && c.model === null && c.messages.length && c.result));

  // 8. “AI 对话 + 自由提示”那一场：同一个文字模型、同一个出图后端；发出去的就是确认的原文
  await overview();
  await (await setup()).locator('[data-session-method=free]').click();
  await page.getByTestId('free-studio').waitFor();
  await page.getByTestId('free-chat').fill('我想做一台能折叠的小航拍机，看起来紧凑、整体');
  await page.getByTestId('free-chat').press('Enter');
  await page.getByTestId('use-draft').click();
  const words = await page.getByTestId('free-prompt').inputValue();
  assert.ok(words.length > 10);
  await page.getByTestId('free-run').click();
  await page.locator('[data-free-candidate]').first().waitFor({ timeout: 20000 });
  const free = (await attempts()).find(r => r.condition === 'free');
  assert.equal(free.text, words.trim());
  assert.equal(free.scope, 'v4free');
  // 记下了发出的文字来自 AI 起草、没有改过
  const freeEvent = (await saved()).events.find(e => e.kind === 'free-run');
  assert.equal(freeEvent.source, 'draft');
  assert.equal(freeEvent.attemptId, free.id);
  await shot('07-自由提示.png');

  // 9. 回到工作台，载入登记条件：每条方向的机架都锁定，改动被挡下
  await (await setup()).locator('[data-session-method=structured]').click();
  await page.getByTestId('v4-canvas').waitFor();
  await overview();
  await (await setup()).getByTestId('load-condition').click();
  await page.locator('.t4-chip', { hasText: '登记条件已锁定' }).waitFor();
  assert.equal(await page.locator('[data-node=layer][data-layer=frame][data-locked=yes]').count(), 3);
  await page.locator('[data-node=layer][data-layer=frame]').first().click();
  await page.getByTestId('locked-note').waitFor();
  state = await saved();
  for (const lane of state.project.lanes) {
    const frame = (function find(id) { const n = state.project.nodes[id]; return n.layer === 'frame' ? n : find(n.parentId); })(lane.leafId);
    assert.equal(frame.values.span_ratio_wl ?? frame.values['frame.span_ratio_wl'], 1);
  }
  await shot('08-登记条件.png');

  // 导出工作区记录：建议连着调用编号和处理结果，比较带着取舍理由
  await overview();
  const [download] = await Promise.all([page.waitForEvent('download'), (await setup()).getByTestId('export-workspace').click()]);
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(exported.schema, 'workbench/v4-export');
  assert.equal(exported.textModel.mode, 'fixture');
  assert.ok(exported.suggestions.some(x => x.status === 'branched' && x.callId && calls.some(c => c.id === x.callId)));
  assert.equal(exported.compares[0].reason, '短一些更像随身带的东西');

  // 10. 研究记录抽屉：看记录、取舍和导出；新的一轮只从画布上的生成节点发出
  await page.getByTestId('open-records').click();
  await page.getByTestId('records-drawer').waitFor();
  await page.getByRole('button', { name: '候选与记录' }).click();
  await page.getByTestId('candidate-workspace').waitFor();
  assert.equal(await page.locator('[data-attempt-goal]').count(), 0);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, lanes: state.project.lanes.map(l => l.name), rounds: (await attempts()).length, aiCalls: calls.length, realModelCalls: 0 }));
} catch (error) {
  // 出错时留一张当时的画面，便于看清卡在哪一步。
  if (capture) for (const page of browser.contexts().flatMap(c => c.pages())) await page.screenshot({ path: join(capture, '失败时的画面.png') }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
