// 4.0 工作台走查：写意图 → AI 读出目标并逐条确认 → 补充一句不盖掉已确认的条目 → AI 提方向、放成两条方向（上游共用）
// → 对机身说话，建议带依据分级、默认开分支 → 生成一轮 → 在候选上改 → 两张并排比较并取舍；
// 再做一场“AI 对话 + 自由提示”（发出去的就是确认的原文），最后载入登记条件，核对机架锁定、研究记录抽屉和 AI 调用日志。
// 4.2 起：按场次导出（同一个项目里换过方式，也是一场一个 ZIP，标签与内容一致）；按委托开一场（任务定为日常航拍、C2 机架锁定、两种方式看到同一段委托）；
// C2 下机身间距按画出的圆角量；农业植保有药箱与喷洒部件，句子沿用 39 张的原文；已经有决定时换任务要另开项目。
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
  if (pathname === '/queue') return Response.json({ queue_running: [], queue_pending: [] });
  if (pathname === '/view') return new Response(output, { headers: { 'Content-Type': 'image/png' } });
  return new Response('not found', { status: 404 });
};
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ fixture: true, backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 30 }, fetchImpl: comfy, directory: await mkdtemp(join(tmpdir(), 'studio4-jobs-')) });
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
      status: a.h3?.status, candidates: a.candidates.length, parent: !!a.parentImage, keep: a.keep, path: a.decisionPath?.map(d => d.layer),
      finish: a.config?.parameters?.accessories?.surface_finish, length: a.config?.parameters?.fuselage?.fuselage_dimensions_mm?.length,
      decisions: a.decisions.map(d => ({ kind: d.kind, reason: d.reason })) }));
  });
  // 某条方向某一层节点里的值：沿 leafId 往上找。
  const layerValues = (state, laneId, layer) => {
    const lane = state.project.lanes.find(l => l.id === laneId);
    let node = state.project.nodes[lane.leafId];
    while (node && node.layer !== layer) node = state.project.nodes[node.parentId];
    return node?.values ?? {};
  };
  // 画布上的节点可能在可视范围外；用派发的点击代替鼠标点，不受视口限制。
  const tap = locator => locator.dispatchEvent('click');
  const unzip = bytes => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), end = bytes.length - 22, out = new Map(), dec = new TextDecoder();
    let at = view.getUint32(end + 16, true);
    for (let i = 0; i < view.getUint16(end + 10, true); i++) {
      const size = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true);
      const name = dec.decode(bytes.slice(at + 46, at + 46 + nameLen)), localName = view.getUint16(local + 26, true);
      out.set(name, bytes.slice(local + 30 + localName, local + 30 + localName + size));
      at += 46 + nameLen;
    }
    return out;
  };
  // Esc 回到总览（焦点在输入框里时 Esc 不起作用，先移开焦点）。
  const overview = async () => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Escape'); await page.getByTestId('overview-panel').waitFor(); };
  const setup = async () => { const box = page.getByTestId('session-setup'); if (!await box.evaluate(d => d.open)) await box.locator(':scope > summary').click(); return box; };

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

  // 3b. 单个节点可以拖动，别的节点不动；位置存下；“整理”排回去
  const frameNode = page.locator('.react-flow__node:has([data-node=layer][data-layer=frame])').first();
  const frameId = await frameNode.getAttribute('data-id');
  const transforms = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.react-flow__node')].map(n => [n.dataset.id, n.style.transform])));
  const before = await transforms();
  const box = await frameNode.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + 140, { steps: 8 });
  await page.mouse.up();
  const after = await transforms();
  assert.notEqual(after[frameId], before[frameId], '拖动的节点移动了');
  for (const id of Object.keys(before)) if (id !== frameId) assert.equal(after[id], before[id], '其余节点不动：' + id);
  assert.ok((await saved()).layout[frameId], '拖过的位置存进了工作区');
  await page.getByTestId('tidy').click();
  await page.waitForFunction(id => !JSON.parse(localStorage.getItem('multirotor-studio/v4/project')).layout[id], frameId);
  assert.equal((await transforms())[frameId], before[frameId], '整理以后回到按链排好的位置');

  // 4. 对机身说话：建议标“统计相关”，默认动作是开分支；开分支后跟到新的方向上
  await tap(page.locator('.react-flow__node:has([data-node=layer][data-layer=body])').last());
  await page.waitForFunction(() => document.querySelector('[data-testid=layer-panel]')?.dataset.layer === 'body');
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

  // 4b. 在动力处分叉以后马上改护圈：改动落在新方向上，原方向不变（Codex 第 05 条）
  const laneA = state.project.lanes[0].id;
  await tap(page.locator(`.react-flow__node:has([data-node=layer][data-layer=propulsion][data-lane="${laneA}"])`));
  await page.waitForFunction(() => document.querySelector('[data-testid=layer-panel]')?.dataset.layer === 'propulsion');
  await page.getByTestId('fork-here').click();
  state = await saved();
  const forked = state.project.lanes.find(l => l.id === state.project.activeLaneId);
  assert.notEqual(forked.id, laneA);
  assert.deepEqual(state.selection, { kind: 'layer', laneId: forked.id, layer: 'propulsion' }, '面板跟到了新方向');
  await page.locator('aside.r4').getByRole('radio', { name: '环形护圈' }).click();
  state = await saved();
  assert.equal(layerValues(state, forked.id, 'propulsion')['propulsion.prop_guard'], 'ring');
  assert.notEqual(layerValues(state, laneA, 'propulsion')['propulsion.prop_guard'], 'ring', '原方向没有被改');

  // 5. 在“试机身宽”那条方向生成一轮；保留时写一句理由（Codex 第 12 条）
  await tap(page.locator(`[data-node=render][data-lane="${branch.id}"] [data-testid=node-run]`));
  await page.locator('[data-node=candidate]').first().waitFor({ timeout: 20000 });
  await tap(page.locator('.react-flow__node-candidate').first());
  await page.getByTestId('candidate-panel').waitFor();
  await page.getByTestId('decision-reason').fill('先留着，机身比例对了');
  await page.getByTestId('keep').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=keep]')?.textContent.includes('已保留'));
  await shot('05-候选.png');
  let rounds = await attempts();
  assert.equal(rounds.length, 1);
  assert.deepEqual(rounds[0].decisions, [{ kind: 'accept', reason: '先留着，机身比例对了' }]);
  assert.equal(rounds[0].finish, 'matte');

  // 5b. 生成之后把这条方向的表面处理改成缎面，再回到那张旧图说“机身短一点，其他别动”：
  //     这一轮从旧图的规格出发，放进新方向，表面处理仍是细砂哑光；原方向保留缎面（Codex 第 06 条）
  await tap(page.locator(`.react-flow__node:has([data-node=layer][data-layer=cmf][data-lane="${branch.id}"])`));
  await page.waitForFunction(() => document.querySelector('[data-testid=layer-panel]')?.dataset.layer === 'cmf');
  await page.locator('aside.r4').getByRole('radio', { name: '缎面' }).click();
  assert.equal(layerValues(await saved(), branch.id, 'cmf')['accessories.surface_finish'], 'satin');
  await tap(page.locator('.react-flow__node-candidate').first());
  await page.getByTestId('candidate-panel').waitFor();
  await page.getByTestId('revise-text').fill('机身短一点，其他别动');
  await page.getByTestId('revise-ask').click();
  await page.getByTestId('revision').waitFor();
  assert.match(await page.getByTestId('revise-drift').textContent(), /又改了 1 项/);
  await page.getByTestId('revise-run').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-node=candidate]').length >= 2, null, { timeout: 20000 });
  // 新节点量好尺寸后画布才画它的连线，所以等连线出现。
  await page.locator('.react-flow__edge.is-revision').first().waitFor({ state: 'attached', timeout: 10000 });
  state = await saved();
  const revisedLane = state.project.lanes.find(l => l.name.endsWith('由第 1 轮改'));
  assert.ok(revisedLane, '另开了一条方向');
  rounds = await attempts();
  assert.equal(rounds.length, 2);
  assert.ok(rounds.every(r => r.condition === 'structured' && r.scope.startsWith(`v4/${state.project.id}/`)));
  assert.equal(rounds[1].scope, `v4/${state.project.id}/${revisedLane.id}`);
  assert.equal(rounds[1].finish, 'matte', '没要求改的表面处理保持旧图的细砂哑光');
  assert.equal(rounds[1].length, rounds[0].length - 15, '只改了机身长');
  assert.equal(rounds[1].parent, true);
  assert.match(rounds[1].keep, /机架/);
  assert.deepEqual(rounds[0].path, ['frame', 'propulsion', 'body', 'details', 'cmf']);
  assert.equal(layerValues(state, branch.id, 'cmf')['accessories.surface_finish'], 'satin', '原方向的缎面原样保留');

  // 6. 两张并排比较，选定一张并写下理由；再把选中的那张定为终稿
  for (let i = 0; i < 2; i++) await tap(page.locator('[data-node=candidate] .n4-check').nth(i));
  await tap(page.locator('.react-flow__node-candidate').first());
  await page.getByTestId('open-compare').click();
  await page.getByTestId('compare-panel').waitFor();
  assert.match(await page.getByTestId('compare-panel').locator('.r4-title').textContent(), /差在 1 项决定/);
  await page.locator('.cmp4 input[type=radio]').nth(1).check();
  await page.getByTestId('compare-reason').fill('短一些更像随身带的东西');
  await page.getByTestId('compare-save').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')).compares[0]?.chosen);
  await shot('06-比较.png');
  await tap(page.locator('.react-flow__node-candidate').nth(1));
  await page.getByTestId('candidate-panel').waitFor();
  await page.getByTestId('decision-reason').fill('就这张');
  await page.getByTestId('final').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')).events.some(e => e.kind === 'final'));
  assert.ok((await attempts())[1].decisions.some(d => d.reason === '定为终稿：就这张'));

  // 7. 每次 AI 调用都记了日志：任务、规则回退、发出的消息和核对后的结果
  const files = (await readdir(logDir)).filter(f => f.endsWith('.jsonl'));
  const calls = (await Promise.all(files.map(f => readFile(join(logDir, f), 'utf8')))).join('').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual([...new Set(calls.map(c => c.task))].sort(), ['directions', 'intent', 'layer', 'revise']);
  assert.ok(calls.every(c => c.provider === 'rules' && c.model === null && c.servedModel === null && c.messages.length && c.result));

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
  assert.equal(free.scope, `v4free/${(await saved()).project.id}`);
  // 记下了发出的文字来自 AI 起草、没有改过
  const freeEvent = (await saved()).events.find(e => e.kind === 'free-run');
  assert.equal(freeEvent.source, 'draft');
  assert.equal(freeEvent.attemptId, free.id);
  // 自由提示这一场的取舍也能写理由
  await page.getByTestId('free-decision-reason').fill('构图和比例都还行');
  await page.locator('[data-free-candidate]').first().getByRole('button', { name: '保留' }).click();
  await page.waitForFunction(async id => {
    const db = await new Promise(r => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => r(q.result); });
    const row = await new Promise(r => { const q = db.transaction('attempts').objectStore('attempts').get(id); q.onsuccess = () => r(q.result); });
    db.close(); return row?.decisions?.some(d => d.reason === '构图和比例都还行');
  }, free.id);
  await shot('07-自由提示.png');
  // 自由提示这一场也能打开研究记录，且只列这一场的轮次（Codex 第 08 条）
  await page.getByTestId('open-records').click();
  await page.getByTestId('records-drawer').waitFor();
  await page.getByTestId('candidate-workspace').waitFor();
  await page.locator('[data-testid=candidate-workspace] select[data-attempt] option').first().waitFor({ state: 'attached' });
  const listed = await page.locator('[data-testid=candidate-workspace] select[data-attempt] option').allTextContents();
  assert.equal(listed.length, 1);
  assert.match(listed[0], /自由提示/);
  await page.getByTestId('records-drawer').getByRole('button', { name: '回到画布' }).click();

  // 9. 回到工作台，载入登记条件：每条方向的机架都锁定，改动被挡下
  await (await setup()).locator('[data-session-method=structured]').click();
  await page.getByTestId('v4-canvas').waitFor();
  await overview();
  await (await setup()).getByTestId('load-condition').click();
  await page.locator('.t4-chip', { hasText: '登记条件已锁定' }).waitFor();
  state = await saved();
  assert.equal(await page.locator('[data-node=layer][data-layer=frame][data-locked=yes]').count(), state.project.lanes.length);
  await tap(page.locator('.react-flow__node:has([data-node=layer][data-layer=frame])').first());
  await page.getByTestId('locked-note').waitFor();
  for (const lane of state.project.lanes) assert.equal(layerValues(state, lane.id, 'frame')['frame.span_ratio_wl'], 1);
  await shot('08-登记条件.png');

  // 10. 按场次导出：同一个项目里先用工作台（第 1 场）、再用自由提示（第 2 场）、又回到工作台（第 3 场），一场一个 ZIP（作者 11 月 23 日指出的问题）
  await overview();
  const exportSession = async id => {
    const box = await setup();
    const [download] = await Promise.all([page.waitForEvent('download'), box.locator(`[data-session="${id}"] [data-testid=export-session]`).click()]);
    const bundle = unzip(new Uint8Array(await readFile(await download.path())));
    const read = name => JSON.parse(new TextDecoder().decode(bundle.get(name)));
    const calls = new TextDecoder().decode(bundle.get('ai-calls.jsonl')).trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
    return { name: download.suggestedFilename(), bundle, manifest: read('manifest.json'), workspace: read('workspace.json'), calls,
      rounds: [...bundle.keys()].filter(n => n.startsWith('rounds/') && n.endsWith('.json') && !n.includes('-服务端/')) };
  };
  state = await saved();
  const [s1, s2, s3] = state.sessions;
  assert.deepEqual([s1.method, s2.method, s3.method], ['open', 'free', 'structured']);
  assert.ok(s1.endedAt && s2.endedAt && !s3.endedAt && state.currentSessionId === s3.id);
  const first = await exportSession(s1.id);
  assert.equal(first.manifest.schema, 'workbench/v4-session-bundle');
  assert.equal(first.manifest.counts.rounds, 2);
  assert.equal(first.rounds.length, 2);
  assert.ok(first.rounds.every(n => !n.includes('自由提示')), '第 1 场只有工作台的轮次');
  assert.ok(first.manifest.rounds.every(r => r.method === '工作台'));
  assert.deepEqual(first.manifest.checks, { everyRoundThisSession: true, everyRoundThisMethod: true, roundsAttributedByTime: 0, decisionsAfterSessionEnd: 0,
    registeredSessionComplete: true, environmentMatchesRecords: true, everyCallThisSession: true });
  // 4.3：每一轮附上服务端原件；清单写的出图后端取自这一场开场时的记录
  assert.ok(first.manifest.rounds.every(r => ['comfy-request.json', 'comfy-ack.json', 'comfy-history.json'].every(n => r.serverFiles.found.some(f => f.name === n))));
  assert.equal(first.manifest.imageBackend.model, 'Qwen-Image-2.1');
  assert.equal(first.manifest.environmentSource, '这一场开场时的记录');
  assert.ok(new TextDecoder().decode(first.bundle.get('session-events.csv')).startsWith('anonymous_pair,session,task_version,condition,attempt,event,'));
  assert.equal([...first.bundle.keys()].filter(n => n.endsWith('.png')).length, first.manifest.counts.candidates);
  assert.deepEqual(first.manifest.aiCalls.missing, []);
  assert.deepEqual([...new Set(first.calls.map(c => c.task))].sort(), ['directions', 'intent', 'layer', 'revise'], '第 1 场只有工作台那一场的 AI 调用');
  assert.ok(first.workspace.suggestions.some(x => x.status === 'branched' && first.calls.some(c => c.id === x.callId)));
  assert.equal(first.workspace.compares[0].reason, '短一些更像随身带的东西');
  assert.ok(first.workspace.events.every(e => e.sessionId === s1.id));
  assert.match(first.name, /^workbench4-session01-workbench-open-trial-/);
  assert.match(new TextDecoder().decode(first.bundle.get('说明.txt')), /^本场材料：第 1 场 · 工作台（未限定方式） · 自由试用/);
  const second = await exportSession(s2.id);
  assert.equal(second.manifest.counts.rounds, 1);
  assert.match(second.rounds[0], /自由提示第1轮/);
  assert.deepEqual(second.calls.map(c => c.task), ['free'], '第 2 场只有自由提示的对话');
  assert.equal(second.workspace.project.lanes, undefined, '自由提示的一场不附工作台的方向和节点');
  assert.ok(second.workspace.events.some(e => e.kind === 'free-run' && e.source === 'draft'));
  assert.match(second.name, /^workbench4-session02-free-prompt-trial-/);
  // 第 3 场在“试机身宽”那条方向上再生成一轮：这条方向跨过两场，画布上叫第 2 轮，第 3 场的 ZIP 里也叫第 2 轮，而且只装这一轮
  await tap(page.locator(`[data-node=render][data-lane="${branch.id}"] [data-testid=node-run]`));
  await page.waitForFunction(() => document.querySelectorAll('[data-node=candidate]').length >= 3, null, { timeout: 20000 });
  assert.ok(await page.locator(`.react-flow__node-candidate:has-text("第 2 轮")`).count() >= 1);
  await overview();
  const third = await exportSession(s3.id);
  assert.equal(third.manifest.counts.rounds, 1, '第 3 场只有它自己这一轮');
  assert.ok(third.rounds[0].includes(branch.name + '第2轮'), '文件名照画布的叫法：' + third.rounds[0]);
  assert.ok(third.bundle.has('说明.txt'));
  const manifest = first.manifest, bundled = [...first.calls, ...second.calls];

  // 11. 研究记录抽屉：看记录、取舍和导出；新的一轮只从画布上的生成节点发出
  await page.getByTestId('open-records').click();
  await page.getByTestId('records-drawer').waitFor();
  await page.getByRole('button', { name: '候选与记录' }).click();
  await page.getByTestId('candidate-workspace').waitFor();
  assert.equal(await page.locator('[data-attempt-goal]').count(), 0);
  await page.getByTestId('records-drawer').getByRole('button', { name: '回到画布' }).click();

  // 12. 新建项目以后，上一个项目的图不再出现，也不能当父图（Codex 第 09 条）
  await overview();
  let setupBox = await setup();
  await setupBox.getByRole('button', { name: '新建项目' }).click();
  await setupBox.getByRole('button', { name: '确定新建' }).click();
  await (await setup()).locator('[data-session-method=free]').click();
  await page.getByTestId('free-studio').waitFor();
  assert.equal(await page.locator('[data-free-candidate]').count(), 0);
  setupBox = await setup();
  await setupBox.locator('[data-session-method=structured]').click();
  await page.getByTestId('v4-canvas').waitFor();
  assert.equal(await page.locator('[data-node=candidate]').count(), 0);

  // 13. 用途不在两个场景里：AI 先问按哪一个做，不悄悄当成航拍（Codex 第 01 条）
  await say('做一台光伏巡检用的无人机，看起来要紧凑');
  await page.getByTestId('intent-panel').waitFor();
  await page.locator('[data-state="task:consumer_camera"]').click();
  state = await saved();
  assert.equal(state.project.intent.taskId, 'consumer_camera');
  assert.ok(!state.project.intent.question, '问题答完就收起');
  assert.ok(state.events.some(e => e.text === '任务定为：日常航拍'));
  assert.match(await page.locator('.t4').first().textContent(), /软件夹具/, '顶栏写明出图是软件夹具（Codex 第 11 条）');

  // 14. 按委托开一场：任务定为日常航拍，机架按 C2 载入并锁定，委托原文出现在意图面板；项目里已有内容，另开空白项目
  await overview();
  let box14 = await setup();
  await box14.getByTestId('session-brief').selectOption('A');
  await box14.locator('[data-setup-method=structured]').click();
  await box14.getByTestId('session-participant').fill('P01');
  await box14.getByTestId('session-order').selectOption('1');
  await box14.getByTestId('session-start').click();
  await page.getByTestId('session-chip').filter({ hasText: '委托 A' }).waitFor();
  state = await saved();
  const registered = state.sessions.find(x => x.id === state.currentSessionId);
  assert.deepEqual([registered.kind, registered.method, registered.briefId, registered.participant, registered.order], ['registered', 'structured', 'A', 'P01', 1]);
  assert.equal(state.project.intent.text, '', '另开了空白项目');
  assert.equal(state.project.intent.taskId, 'consumer_camera');
  assert.equal(state.session.lockedFrame, 'c2-pilot');
  assert.ok(await page.locator('.t4-btn[title=撤销]').isDisabled(), '新的一场从空的撤销历史开始，撤销撤不掉登记的锁定');
  // 轴距 250 mm 与起始值相同，不另存；构型和 W/L 存在机架节点上。
  assert.deepEqual(layerValues(state, state.project.lanes[0].id, 'frame'), { 'frame.frame_type': 'True X', 'frame.span_ratio_wl': 1 });
  await tap(page.locator('[data-node=intent]'));
  await page.getByTestId('brief-card').waitFor();
  assert.ok(await page.getByTestId('task-select').isDisabled(), '这一场按委托做，任务不能换');
  await page.getByTestId('use-brief').click();
  await page.waitForFunction(() => document.querySelector('[data-testid=intent-text]')?.value.startsWith('为日常随行航拍设计一款四旋翼'));
  assert.ok((await saved()).events.some(e => e.kind === 'intent-from-brief' && e.sessionId === registered.id));
  await shot('09-委托与登记条件.png');
  // C2 下机身按画出的圆角量，不报“桨盘伸到机身上方”，只说明矩形包络的四角（作者第 4 点）
  await tap(page.locator('.react-flow__node:has([data-node=layer][data-layer=body])').first());
  await page.waitForFunction(() => document.querySelector('[data-testid=layer-panel]')?.dataset.layer === 'body');
  const bodyChecks = await page.locator('aside.r4 [aria-label=核对]').textContent();
  assert.match(bodyChecks, /按画出的圆角量/);
  assert.match(bodyChecks, /条件图里没有机身，这一点不影响出图/);
  assert.doesNotMatch(bodyChecks, /桨盘伸到机身上方/);
  await page.locator('aside.r4 [aria-label=核对]').scrollIntoViewIfNeeded();
  await shot('11-C2机身核对.png');

  // 15. 登记场次里“直接换方式”是灰的（Codex 第 12 条）；这一场生成一轮后结束，表单按上一场填好这个人的第 2 场（另一份委托、另一种方式）；
  //     自由提示那一场看得到同一版用户依据摘要；两场各导各的
  await tap(page.locator('[data-node=render] [data-testid=node-run]').first());
  await page.locator('[data-node=candidate]').first().waitFor({ timeout: 20000 });
  await overview();
  let box15 = await setup();
  assert.ok(await box15.locator('[data-session-method=free]').isDisabled(), '登记场次不能直接换方式');
  await box15.getByTestId('session-end-reason').fill('设计者说定稿了');
  await box15.getByTestId('session-end').click();
  // 第 2 场会另开空白项目，第 1 场随之归到“之前项目的场次”里；先导出它。
  const regZip = await exportSession(registered.id);
  box15 = await setup();
  await box15.getByTestId('next-suggestion').waitFor();
  assert.equal(await box15.getByTestId('session-brief').inputValue(), 'B');
  assert.equal(await box15.getByTestId('session-participant').inputValue(), 'P01');
  assert.equal(await box15.getByTestId('session-order').inputValue(), '2');
  assert.equal(await box15.locator('[data-setup-method=free]').getAttribute('aria-pressed'), 'true');
  assert.match(await box15.getByTestId('session-kind').textContent(), /登记场次/);
  await box15.getByTestId('session-start').click();
  await page.getByTestId('free-studio').waitFor();
  await page.getByTestId('brief-card').waitFor();
  assert.equal(await page.getByTestId('evidence-summary').getAttribute('data-version'), await page.evaluate(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')).sessions.at(-1).evidenceSummary.version));
  assert.equal(await page.locator('[data-free-candidate]').count(), 0, '上一场工作台的图不在这一场里');
  await page.getByTestId('use-brief').click();
  assert.match(await page.getByTestId('free-chat').inputValue(), /^为日常随行航拍设计一款四旋翼，展开俯视时希望整体显得紧凑。请让四处臂根/);
  await page.getByTestId('free-prompt').fill('A compact everyday camera quadcopter, strict top view, nose up.');
  await page.getByTestId('free-run').click();
  await page.locator('[data-free-candidate]').first().waitFor({ timeout: 20000 });
  state = await saved();
  const freeSession = state.sessions.find(x => x.id === state.currentSessionId);
  assert.deepEqual([freeSession.kind, freeSession.method, freeSession.briefId, freeSession.participant, freeSession.order], ['registered', 'free', 'B', 'P01', 2], '第 2 场四项齐全，是登记场次');
  const freeZip = await exportSession(freeSession.id);
  assert.match(freeZip.manifest.session.title, /^第 \d+ 场 · AI 对话 \+ 自由提示 · 委托 B · 臂根 · P01 · 该参与者第 2 场/);
  assert.equal(freeZip.manifest.counts.rounds, 1);
  assert.match(freeZip.rounds[0], /自由提示第1轮/);
  assert.equal(freeZip.manifest.session.brief.id, 'B');
  assert.equal(freeZip.manifest.evidenceSummary.version, freeSession.evidenceSummary.version);
  assert.equal(regZip.manifest.counts.rounds, 1);
  assert.ok(regZip.manifest.rounds.every(r => r.method === '工作台'));
  assert.match(regZip.manifest.session.title, /工作台 · 委托 A · 机鼻 · P01 · 该参与者第 1 场/);
  assert.match(new TextDecoder().decode(regZip.bundle.get('说明.txt')), /委托原文：为日常随行航拍设计一款四旋翼/);
  assert.equal(regZip.workspace.lockedFrame, 'c2-pilot');
  await (await setup()).getByTestId('session-list').scrollIntoViewIfNeeded();
  await shot('12-场次列表.png');

  // 16. 农业植保六旋：药箱和喷洒部件可选，起始值沿用 39 张的设定；冻结的文字里是 39 张用过的原句
  let box16 = await setup();
  await box16.getByTestId('session-brief').selectOption('');
  await box16.locator('[data-setup-method=structured]').click();
  await box16.getByTestId('session-participant').fill('');
  await box16.getByTestId('session-order').selectOption('');
  await box16.getByTestId('session-start').click();
  await page.getByTestId('v4-canvas').waitFor();
  await tap(page.locator('[data-node=intent]'));
  await page.getByTestId('task-select').selectOption('agricultural_spraying');
  state = await saved();
  assert.equal(state.project.intent.taskId, 'agricultural_spraying', '空白项目里原地换任务');
  await tap(page.locator('.react-flow__node:has([data-node=layer][data-layer=frame])').first());
  await page.getByTestId('other-configs-note').waitFor();
  assert.equal(await page.locator('aside.r4 [role=radiogroup][aria-label=构型]').count(), 0, '植保只有平面六旋，不给其他构型');
  await tap(page.locator('.react-flow__node:has([data-node=layer][data-layer=body])').first());
  await page.locator('aside.r4 [role=radiogroup][aria-label=药箱]').waitFor();
  assert.equal(await page.locator('aside.r4 [aria-label=药箱] [aria-checked=true]').getAttribute('data-option'), 'half-embedded');
  await tap(page.locator('.react-flow__node:has([data-node=layer][data-layer=details])').first());
  await page.locator('aside.r4 [role=radiogroup][aria-label=喷洒部件]').waitFor();
  await page.locator('aside.r4 [aria-label=喷洒部件] [data-option=motor-nozzles]').click();
  await page.locator('aside.r4 [aria-label=核对]', { hasText: '记“不可判”' }).waitFor();
  await page.waitForTimeout(300); // 等按钮颜色过渡完再截图
  await shot('10-植保药箱与喷洒.png');
  await tap(page.locator('[data-node=render] [data-testid=node-run]').first());
  await page.locator('[data-node=candidate]').first().waitFor({ timeout: 20000 });
  const hexRound = (await page.evaluate(async () => {
    const db = await new Promise(r => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => r(q.result); });
    const rows = await new Promise(r => { const q = db.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => r(q.result); });
    db.close(); return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  }));
  assert.equal(hexRound.config.parameters.frame.frame_type, 'Radial Hex');
  assert.equal(hexRound.config.parameters.propulsion.prop_blade_count, '2叶');
  assert.match(hexRound.confirmedText, /A square spray tank sits half-embedded in the central frame: the frame wraps the lower half of the tank, while the tank top and its round filler cap stay exposed\./);
  assert.match(hexRound.confirmedText, /one small round spray nozzle is mounted directly below each of the six motors/);
  assert.doesNotMatch(hexRound.confirmedText, /transverse spray boom/);
  assert.equal(hexRound.workflowOrigin.task, 'hexa');

  // 17. 已经有决定和生成时换任务：先确认，另开一个项目，这一场随之结束
  await tap(page.locator('[data-node=intent]'));
  const sessionBefore = (await saved()).currentSessionId;
  await page.getByTestId('task-select').selectOption('consumer_camera');
  await page.getByTestId('task-switch-confirm').waitFor();
  assert.equal((await saved()).project.intent.taskId, 'agricultural_spraying', '确认之前不换');
  await page.getByTestId('task-switch-confirm').getByRole('button', { name: '另开项目' }).click();
  state = await saved();
  assert.equal(state.project.intent.taskId, 'consumer_camera');
  assert.ok(state.sessions.find(x => x.id === sessionBefore).endedAt, '上一场结束了');
  assert.notEqual(state.currentSessionId, sessionBefore);
  assert.equal(await page.locator('[data-node=candidate]').count(), 0);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, sessions: (await saved()).sessions.length, firstBundleRounds: manifest.counts.rounds, aiCallsInBundles: bundled.length, realModelCalls: 0 }));
} catch (error) {
  // 出错时留一张当时的画面，便于看清卡在哪一步。
  if (capture) for (const page of browser.contexts().flatMap(c => c.pages())) await page.screenshot({ path: join(capture, '失败时的画面.png') }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
