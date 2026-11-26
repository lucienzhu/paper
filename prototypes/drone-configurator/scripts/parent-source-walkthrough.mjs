// 4.5.2 回归走查：父图的来源（Codex 2026-11-26 复现的问题）。
// 浏览器里存着的旧项目，可能带着 4.5 以前开发用后端（MiniMax-H3-Image）出的候选。它们属于“这个项目”，原先能通过父图检查、被发给 Qwen 当父图。
// 这里用模拟的旧记录走一遍：页面上不能再拿它作父图或定为终稿；绕过页面直接发给本机服务，服务按内容摘要拒收；
// 把浏览器里的记录改回“Qwen”也骗不过服务端；正常的 Qwen 候选照常能作父图。
// 图像作业和文字模型都由软件夹具应答，不调用任何真实模型。用法：先 npm run build，再 node scripts/parent-source-walkthrough.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';
import { createDesignAI } from './design-ai.mjs';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
// 冒充旧后端出的图：一张合法的 PNG，内容和夹具返回的任何一张都不同。
const foreign = tagPNG(plain, { note: 'simulated old record: MiniMax-H3-Image output' });
const foreignHash = sha(foreign);

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
const foreignSent = () => [...uploads.values()].some(bytes => sha(bytes) === foreignHash);
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ fixture: true, backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 30 }, fetchImpl: comfy, directory: await mkdtemp(join(tmpdir(), 'parent-source-jobs-')) });
const ai = await createDesignAI({ logDir: await mkdtemp(join(tmpdir(), 'parent-source-ai-')) });
const server = createDesignServer(chat, evidence, jobs, ai);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const tap = locator => locator.dispatchEvent('click');
  const rows = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
    const all = await new Promise(resolve => { const q = db.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => resolve(q.result); });
    db.close();
    const hex = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
    return Promise.all(all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(async a => ({ id: a.id, model: a.h3?.model, status: a.h3?.status, issue: a.h3?.issue ?? '',
      parentId: a.parentId ?? null, parentHash: a.parentImage ? await hex(a.parentImage) : null, candidates: a.candidates.map(c => ({ id: c.id, hash: c.hash })) })));
  });
  const settled = async (count, timeout = 20000) => {
    for (const end = Date.now() + timeout; Date.now() < end; await sleep(150)) {
      const now = await rows();
      if (now.length === count && now.every(a => ['succeeded', 'failed'].includes(a.status) || a.issue)) return now;
    }
    throw new Error(`等不到 ${count} 轮都有结论`);
  };
  /** 把一轮记录改成另一个样子（冒充旧版本留下的，或者冒充被改过的）。 */
  const rewrite = (id, model, withForeignImage) => page.evaluate(async ({ id, model, b64, hash }) => {
    const db = await new Promise((resolve, reject) => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('attempts', 'readwrite'), store = tx.objectStore('attempts'), get = store.get(id);
      get.onsuccess = () => { const a = get.result; a.h3.model = model;
        if (b64) { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); a.candidates = a.candidates.map(c => ({ ...c, hash, file: new Blob([bytes], { type: 'image/png' }) })); }
        store.put(a); };
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, { id, model, b64: withForeignImage ? foreign.toString('base64') : '', hash: foreignHash });
  const openCandidate = async index => {
    await page.reload();
    await page.getByTestId('studio4').waitFor();
    await page.locator('.react-flow__node-candidate').nth(index).waitFor({ timeout: 20000 });
    await tap(page.locator('.react-flow__node-candidate').nth(index));
    await page.getByTestId('candidate-panel').waitFor();
  };
  const revise = async () => {
    await page.getByTestId('revise-text').fill('机身短一点，其他别动');
    await page.getByTestId('revise-ask').click();
    await page.getByTestId('revision').waitFor();
    await page.getByTestId('revise-run').click();
  };

  // 1. 正常的一轮，再以它为父图改一轮：Qwen（夹具）出的候选照常能作父图。
  await page.goto(origin);
  await page.getByTestId('overview-panel').waitFor();
  await tap(page.locator('[data-node=render] [data-testid=node-run]').first());
  await page.locator('[data-node=candidate]').first().waitFor({ timeout: 20000 });
  const first = (await settled(1))[0];
  assert.equal(first.model, 'Qwen-Image-2.1');
  await openCandidate(0);
  assert.equal(await page.getByTestId('old-record').count(), 0, '正常的候选没有“旧记录”提示');
  await revise();
  let all = await settled(2);
  const second = all.find(a => a.id !== first.id);
  assert.equal(second.status, 'succeeded', second.issue);
  assert.equal(second.parentId, first.candidates[0].id);
  assert.equal(second.parentHash, first.candidates[0].hash, '父图就是上一轮从服务取回的原图');
  assert.equal(graphs.length, 2);
  assert.equal(sha(uploads.get(graphs[1]['16'].inputs.image)), first.candidates[0].hash);

  // 2. 把第一轮改成 4.5 以前的浏览器里会有的样子：冻结时登记的是旧的托管后端，候选是那个后端的图。
  await rewrite(first.id, 'MiniMax-H3-Image', true);
  await page.reload();
  await page.getByTestId('studio4').waitFor();
  await page.locator('.react-flow__node-candidate').first().waitFor({ timeout: 20000 });
  // 画布上候选的次序不保证：找到写着旧模型的那一张。
  let oldIndex = -1;
  for (let i = 0; i < await page.locator('.react-flow__node-candidate').count(); i++) {
    await tap(page.locator('.react-flow__node-candidate').nth(i));
    await page.getByTestId('candidate-panel').waitFor();
    if (await page.getByTestId('old-record').count()) { oldIndex = i; break; }
  }
  assert.ok(oldIndex >= 0, '旧记录仍在画布上，并标明是旧记录');
  assert.match(await page.getByTestId('old-record').textContent(), /MiniMax-H3-Image.*不能作父图，也不能定为终稿/);
  assert.equal(await page.getByTestId('revise-text').isDisabled(), true, '旧记录上不能写修改');
  assert.equal(await page.getByTestId('revise-ask').isDisabled(), true);
  assert.equal(await page.getByTestId('final').isDisabled(), true, '旧记录不能定为终稿');
  assert.equal((await rows()).length, 2, '没有多出一轮');

  // 3. 绕过页面，直接把那张图当父图发给本机服务（结构化和自由提示各一次）：服务按内容摘要拒收，出图服务一个字节也没收到。
  const dataUrl = 'data:image/png;base64,' + foreign.toString('base64'), guideUrl = 'data:image/png;base64,' + plain.toString('base64');
  for (const body of [
    { attemptId: randomUUID(), prompt: 'compiled text', inputs: [{ role: 'layout', sha256: sha(plain), dataUrl: guideUrl }, { role: 'parent', sha256: foreignHash, dataUrl }] },
    { attemptId: randomUUID(), condition: 'free', prompt: '机身再窄一些', inputs: [{ role: 'parent', sha256: foreignHash, dataUrl }] },
  ]) {
    const reply = await fetch(origin + '/api/h3/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(reply.status, 422);
    assert.match((await reply.json()).error, /父图不是这台工作台从 Qwen 取回的原图/);
    assert.equal((await fetch(origin + '/api/h3/jobs/' + body.attemptId)).status, 404, '被拒收的请求不留作业记录');
  }
  assert.equal(graphs.length, 2);
  assert.equal(foreignSent(), false);

  // 4. 把浏览器里的记录改回“Qwen”（图还是那张外来的图）：页面放行，服务端照样拒收，这一轮记下原因，不出图。
  await rewrite(first.id, 'Qwen-Image-2.1', false);
  await openCandidate(oldIndex);
  assert.equal(await page.getByTestId('old-record').count(), 0);
  await revise();
  all = await settled(3);
  const third = all.find(a => a.id !== first.id && a.id !== second.id);
  assert.equal(third.parentHash, foreignHash);
  assert.notEqual(third.status, 'succeeded');
  assert.match(third.issue, /父图不是这台工作台从 Qwen 取回的原图/);
  assert.equal(third.candidates.length, 0);
  assert.equal(graphs.length, 2, '第三轮没有发给出图服务');
  assert.equal(foreignSent(), false, '外来的图没有传到出图服务');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ qwenCandidateAsParent: true, oldRecordLabelled: true, oldRecordNotParent: true, oldRecordNotFinal: true,
    serviceRefusesForeignParent: 2, editedBrowserRecordStillRefused: true, promptsSentToImageService: graphs.length, foreignImageReachedImageService: foreignSent(), realModelCalls: 0, errors }));
} finally {
  await browser.close();
  server.close();
}
