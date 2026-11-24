// Codex 11 月 23 日盲测提出的问题，逐条在本机复现、验收（第 7、14 条要真实 GPU，不在这里）。
// 图像作业和文字模型都由可控的软件夹具应答，不调用任何真实模型：
//   文字模型可以按住不回、报错，并按 MiniMax 文档写的规则截断（思考也算进输出上限，上限太小就 finish_reason 为 length、回答为空）；
//   ComfyUI 可以在入队之后断开、在工作台服务“重启”之后再连、按缺权重报 HTTP 400 和节点错误。
// 夹具里“max 要想多少”是假设的数（12000），只用来检查工作台怎样处理截断，真实用量要看冒烟检查的回执。
// 11 月 23 日 GPT 复测 4.3 又提了三条（G1–G3）：入队回执在远端校验时丢了会重发；远端收下后代理回 502、回执正文传到一半断了会记失败；
// 入队结果不明时页面写“已入队”。ComfyUI 夹具可以照这几种情况应答，也可以在发出前就拒绝连接（服务没开）。
// 11 月 24 日作者提的工作台问题和 Codex 子代理走查的四条（R1–R8）：登记场次的 C2 由程序锁定；撤销不抹掉研究事件和计时；
// 同一个人的登记冲突不开；两种方式开场看同一张任务卡；主持人用的入口不给参与者；值真的变了才记；另做一版与抄设置写明做的事；
// 生成只按画布上的设置，选项和说明按作者的意见改。
// 用法：先 npm run build，再 node scripts/studio4-issues.mjs [--probe] [--only=1,2,G1,R1]。--probe 只报告、不以失败退出。
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { createImageJobs } from './image-jobs.mjs';
import { createDesignAI } from './design-ai.mjs';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';
import { closeModerator, passTaskCard, sessionBox } from './moderator-helpers.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const probe = process.argv.includes('--probe');
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
// --shots=<目录>：在几处停下来截图，给复核记录用。
const shots = process.argv.find(a => a.startsWith('--shots='))?.slice(8);
if (shots) await (await import('node:fs/promises')).mkdir(shots, { recursive: true });
const shot = (page, name) => shots ? page.screenshot({ path: join(shots, name) }) : Promise.resolve();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(test, timeout = 10000, what = '条件') {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await test()) return; await sleep(50); }
  throw new Error('等不到' + what);
}

// ---------- 可控的 ComfyUI ----------
const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
const comfy = { down: false, refuse: false, dropAfterEnqueue: false, downMs: 2500, runMs: 300, nodeError: false, next: null, validateMs: 0, prompts: [], uploads: new Map(), jobs: new Map(), files: new Map() };
// 照 Node 的 fetch 在真实网络上报的错：连接没建立（服务没开）是 ECONNREFUSED；请求发出后对方断开是 UND_ERR_SOCKET。
const netError = (code, message) => new TypeError('fetch failed', { cause: Object.assign(new Error(message), { code }) });
const entryOf = (id, job) => ({ prompt: [job.number, id, job.graph, { client_id: job.clientId }, ['12']],
  outputs: { 12: { images: [{ filename: job.file, subfolder: '', type: 'output' }] } },
  status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: job.startedAt }], ['execution_success', { prompt_id: id, timestamp: job.doneAt }]] } });
async function comfyFetch(url, init = {}) {
  if (comfy.down) throw new TypeError('fetch failed');
  if (comfy.refuse) throw netError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:8188');
  const { pathname, searchParams } = new URL(url);
  if (pathname === '/upload/image') {
    const file = init.body.get('image'); comfy.uploads.set(file.name, Buffer.from(await file.arrayBuffer()));
    return Response.json({ name: file.name, subfolder: '', type: 'input' });
  }
  if (pathname === '/prompt' && init.method === 'POST') {
    const body = JSON.parse(init.body);
    comfy.prompts.push(body);
    if (comfy.nodeError) return Response.json({ error: { type: 'prompt_outputs_failed_validation', message: 'Prompt outputs failed validation', details: '', extra_info: {} },
      node_errors: { 1: { errors: [{ type: 'value_not_in_list', message: 'Value not in list', details: "unet_name: 'qwen_image_2.1_bf16.safetensors' not in []", extra_info: {} }], dependent_outputs: ['12'], class_type: 'UNETLoader' } } }, { status: 400 });
    const graph = body.prompt, id = typeof body.prompt_id === 'string' ? body.prompt_id : 'fixture-' + comfy.prompts.length, number = comfy.prompts.length;
    const file = graph['12'].inputs.filename_prefix + '_00001_.png';
    const queue = () => { const now = Date.now(); comfy.jobs.set(id, { graph, clientId: body.client_id, number, file, startedAt: now + 20, doneAt: now + comfy.runMs });
      comfy.files.set(file, tagPNG(graph['15'] ? comfy.uploads.get(graph['15'].inputs.image) : plain, graph)); };
    const mode = comfy.next; comfy.next = null;
    // GPT 复测：远端还在校验时连接就断了（校验完才进队列，这段时间里队列和历史都查不到）；远端收下以后中间的代理回 502；回执正文传到一半断了。
    if (mode === 'drop-while-validating') { setTimeout(queue, comfy.validateMs); throw netError('UND_ERR_SOCKET', 'other side closed'); }
    queue();
    if (mode === 'bad-gateway') return new Response('<html><head><title>502 Bad Gateway</title></head><body><center><h1>502 Bad Gateway</h1></center></body></html>', { status: 502, headers: { 'Content-Type': 'text/html' } });
    if (mode === 'cut-body') return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"prompt_')); c.error(new TypeError('terminated')); } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // 回执发出以后连接断开：之后的查询一律连不上，过一阵恢复。远端照样跑完。
    if (comfy.dropAfterEnqueue) { comfy.dropAfterEnqueue = false; comfy.down = true; setTimeout(() => { comfy.down = false; }, comfy.downMs); }
    return Response.json({ prompt_id: id, number, node_errors: {} });
  }
  if (pathname === '/queue') {
    const now = Date.now(), items = [...comfy.jobs].filter(([, j]) => now < j.doneAt).map(([id, j]) => [j.number, id, j.graph, { client_id: j.clientId }, ['12']]);
    return Response.json({ queue_running: items.slice(0, 1), queue_pending: items.slice(1) });
  }
  if (pathname === '/history' || pathname.startsWith('/history/')) {
    const id = pathname.startsWith('/history/') ? decodeURIComponent(pathname.slice('/history/'.length)) : null;
    const done = [...comfy.jobs].filter(([jid, j]) => Date.now() >= j.doneAt && (!id || jid === id));
    return Response.json(Object.fromEntries(done.map(([jid, j]) => [jid, entryOf(jid, j)])));
  }
  if (pathname === '/view') {
    const bytes = comfy.files.get(searchParams.get('filename'));
    return bytes ? new Response(bytes, { headers: { 'Content-Type': 'image/png' } }) : new Response('not found', { status: 404 });
  }
  return new Response('not found', { status: 404 });
}
/** 可以“杀掉”的连接：杀掉以后这个实例的请求永远等不到回答，就像它所在的服务进程停了。 */
function killable() { const s = { dead: false }; return { s, fetch: (url, init) => s.dead ? new Promise(() => {}) : comfyFetch(url, init) }; }

// ---------- 可控的文字模型（接口形状照 MiniMax 的 OpenAI 兼容接口） ----------
const llm = { fail: 0, hold: null, release: null, held: 0, thinkingTokens: 1000, requests: [] };
const answers = {
  intent: { taskId: 'consumer_camera', taskFit: 'in', state: 'unfolded_top', question: null,
    targets: [{ text: '紧凑', pair: 'compact', pole: 'left', cards: ['E001'], why: '原话说展开俯视显得紧凑。' }], interpretations: [], notes: [], cards: [{ id: 'E001', why: '用户自述小巧。' }] },
  directions: { directions: [
    { name: '紧凑一体', summary: '臂根融进机身。', changes: [{ field: 'frame.arm_root', value: 'seamless', why: '减少拼接感。', evidence: ['H-INT-ROOT'] }, { field: 'accessories.surface_finish', value: 'matte', why: '哑光。', evidence: ['H-LOW-CMF'] }] },
    { name: '利落工具感', summary: '两段顶盖。', changes: [{ field: 'fuselage.top_cover', value: 'two', why: '交代机头。' }, { field: 'accessories.drone_primary_color', value: '#1e293b', why: '深色。', evidence: ['H-LOW-CMF'] }] }] },
  layer: { reply: '可以试加宽一些。', suggestions: [{ title: '加宽机身', why: '真实产品里往往更紧凑。', changes: [{ field: 'fuselage.fuselage_dimensions_mm.width', value: 60 }], evidence: ['C-BWD'], cards: ['E001'] }], otherLayer: null },
  revise: { reply: '只改机身长。', goal: '机身短一点，其余保持。', changes: [{ field: 'fuselage.fuselage_dimensions_mm.length', value: 135 }], keep: ['frame'], evidence: [] },
  free: { reply: '可以，我整理成一段提示词。', prompt: 'A compact everyday camera quadcopter, strict top view, nose up, product render.' },
};
async function llmFetch(_url, init) {
  const body = JSON.parse(init.body);
  llm.requests.push(body);
  let task = 'free';
  try { task = JSON.parse(body.messages[1].content).task ?? 'free'; } catch { /* 自由提示的第二条不是上下文 */ }
  if (llm.hold) { llm.held++; await llm.hold; }
  if (llm.fail > 0) { llm.fail--; return Response.json({ base_resp: { status_code: 1000, status_msg: 'simulated failure' } }, { status: 500 }); }
  const budget = body.max_completion_tokens ?? body.max_tokens ?? Infinity, used = llm.thinkingTokens + 400, cut = used > budget;
  return Response.json({ id: 'chatcmpl-fixture-' + llm.requests.length, object: 'chat.completion', model: 'MiniMax-M3.1-Flash',
    choices: [{ index: 0, finish_reason: cut ? 'length' : 'stop', message: { role: 'assistant', content: cut ? '' : JSON.stringify(answers[task]), reasoning_content: '（夹具：模拟的思考）' } }],
    usage: { prompt_tokens: 20000, completion_tokens: cut ? budget : used, total_tokens: 20000 + (cut ? budget : used) }, base_resp: { status_code: 0, status_msg: 'success' } });
}

// ---------- 服务 ----------
const jobsDir = await mkdtemp(join(tmpdir(), 'issues-jobs-'));
const logDir = await mkdtemp(join(tmpdir(), 'issues-ai-'));
const makeJobs = fetchImpl => createImageJobs({ fixture: true, backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 40 }, fetchImpl, directory: jobsDir });
let conn = killable();
const live = { jobs: makeJobs(conn.fetch), jobsDescribe: null, aiDescribe: null };
const jobs = new Proxy({}, { get: (_, key) => key === 'describe' && live.jobsDescribe ? () => live.jobsDescribe
  : typeof live.jobs[key] === 'function' ? live.jobs[key].bind(live.jobs) : live.jobs[key] });
const realAi = await createDesignAI({ apiKey: 'fixture-key', region: 'global', effort: 'max', fetchImpl: llmFetch, logDir });
const ai = new Proxy(realAi, { get: (t, key) => key === 'describe' && live.aiDescribe ? () => live.aiDescribe : t[key] });
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const server = createDesignServer(chat, evidence, jobs, ai);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const logLines = async () => (await Promise.all((await readdir(logDir)).filter(f => f.endsWith('.jsonl')).map(f => readFile(join(logDir, f), 'utf8'))))
  .join('').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));

// ---------- 浏览器一侧的小工具 ----------
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
async function open() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await context.route('**/*', route => { const u = new URL(route.request().url()); return u.protocol.startsWith('http') && u.origin !== origin ? route.abort() : route.continue(); });
  await page.goto(origin);
  await page.getByTestId('studio4').waitFor();
  return { context, page };
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')));
const rows = page => page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
  const all = await new Promise(resolve => { const q = db.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => resolve(q.result); });
  db.close();
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(a => ({ id: a.id, sessionId: a.sessionId, condition: a.condition, text: a.confirmedText, parent: !!a.parentImage,
    h3: { status: a.h3?.status, issue: a.h3?.issue, traceId: a.h3?.traceId, model: a.h3?.model }, candidates: a.candidates.map(c => ({ id: c.id, shown: !!c.firstShown })),
    decisions: a.decisions.map(d => ({ kind: d.kind, candidate: d.candidate, reason: d.reason })) }));
});
const setup = page => sessionBox(page);
async function begin(page, { brief = '', method = 'free', participant = '', order = '', keepTaskCard = false } = {}) {
  const before = (await saved(page))?.currentSessionId ?? null;
  const box = await setup(page);
  await box.getByTestId('session-brief').selectOption(brief);
  await box.locator(`[data-setup-method=${method}]`).click();
  await box.getByTestId('session-participant').fill(participant);
  await box.getByTestId('session-order').selectOption(order);
  await box.getByTestId('session-start').click();
  await page.waitForFunction(id => { const s = JSON.parse(localStorage.getItem('multirotor-studio/v4/project') || 'null'); return s?.currentSessionId && s.currentSessionId !== id; }, before);
  await closeModerator(page);
  if (!keepTaskCard) await passTaskCard(page);
  await page.getByTestId(method === 'free' ? 'free-studio' : 'v4-canvas').waitFor();
  return (await saved(page)).currentSessionId;
}
async function freeRound(page, text) {
  const n = (await rows(page)).length;
  await page.getByTestId('free-prompt').fill(text);
  await page.getByTestId('free-run').click();
  await until(async () => { const r = await rows(page); return r.length > n && r.at(-1).candidates.some(c => c.shown); }, 20000, '自由提示这一轮回图并显示');
}
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), end = bytes.length - 22, out = new Map(), dec = new TextDecoder();
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    const size = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true);
    const name = dec.decode(bytes.slice(at + 46, at + 46 + nameLen)), localName = view.getUint16(local + 26, true);
    out.set(name, bytes.slice(local + 30 + localName, local + 30 + localName + size));
    at += 46 + nameLen;
  }
  return out;
}
async function exportZip(page, sessionId) {
  const box = await setup(page);
  const [download] = await Promise.all([page.waitForEvent('download'), box.locator(`[data-session="${sessionId}"] [data-testid=export-session]`).click()]);
  const bundle = unzip(new Uint8Array(await readFile(await download.path())));
  await closeModerator(page);
  const text = name => bundle.has(name) ? new TextDecoder().decode(bundle.get(name)) : null;
  return { name: download.suggestedFilename(), files: [...bundle.keys()], text, manifest: JSON.parse(text('manifest.json')), workspace: JSON.parse(text('workspace.json')),
    calls: (text('ai-calls.jsonl') ?? '').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) };
}

// ---------- 逐条 ----------
const results = [];
async function check(item, title, fn) {
  if (only && !only.includes(String(item))) return;
  const started = Date.now();
  try { const { pass, observed } = await fn(); results.push({ item, title, pass, observed, ms: Date.now() - started }); }
  catch (error) { results.push({ item, title, pass: false, observed: { error: error.message.split('\n')[0] }, ms: Date.now() - started }); }
  const r = results.at(-1);
  console.log(`${r.pass ? '通过' : '未过'}  #${item} ${title}\n      ${JSON.stringify(r.observed)}`);
}

await check(1, '换参与者开新的一场：上一场没发的对话、提示词和父图都不带进来', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { brief: 'A', method: 'free', participant: 'P01', order: '1' });
    await freeRound(page, 'P01 round one: a compact everyday camera quadcopter, strict top view');
    await page.locator('[data-free-candidate]').first().getByTitle('以此为父图').click();
    await page.getByTestId('free-chat').fill('P01 还没发出的一句');
    await page.getByTestId('free-prompt').fill('P01 still unsent prompt');
    await begin(page, { brief: 'B', method: 'free', participant: 'P02', order: '1' });
    const leftover = { chat: await page.getByTestId('free-chat').inputValue(), prompt: await page.getByTestId('free-prompt').inputValue(),
      parent: await page.getByText('父图：已选一张候选').count() > 0 };
    const before = comfy.prompts.length;
    await page.getByTestId('free-prompt').fill('P02 own prompt');
    await page.getByTestId('free-run').click();
    await until(() => comfy.prompts.length > before, 10000, 'P02 的请求');
    const encoder = comfy.prompts.at(-1).prompt['4'].inputs;
    const sent = { text: encoder.prompt, images: Object.keys(encoder).filter(k => k.startsWith('images.')).length };
    return { pass: !leftover.chat && !leftover.prompt && !leftover.parent && sent.text === 'P02 own prompt' && sent.images === 0, observed: { leftover, sent } };
  } finally { await context.close(); }
});

await check(2, '晚到的 AI 回答记回发出它的那一场（自由提示的对话；工作台的读意图）', async () => {
  const { context, page } = await open();
  try {
    // 自由提示：发一句，回答按住；换成工作台以后再放回答
    const freeId = await begin(page, { method: 'free' });
    llm.hold = new Promise(resolve => { llm.release = resolve; });
    let held = llm.held;
    await page.getByTestId('free-chat').fill('这一句的回答会晚到');
    await page.getByTestId('free-chat').press('Enter');
    await until(() => llm.held > held, 10000, '请求到达模型');
    await (await setup(page)).locator('[data-session-method=structured]').click();
    await page.getByTestId('v4-canvas').waitFor();
    const nextId = (await saved(page)).currentSessionId;
    llm.release(); llm.hold = null;
    await until(async () => (await logLines()).some(l => l.task === 'free'), 10000, '自由提示的调用记进日志');
    await sleep(600);
    let st = await saved(page);
    const reply = st.turns.find(t => t.role === 'assistant');
    // 工作台：读意图按住；换成自由提示以后再放回答
    llm.hold = new Promise(resolve => { llm.release = resolve; });
    held = llm.held;
    await page.locator('#v4-command').fill('展开俯视时希望整体显得紧凑');
    await page.locator('#v4-command').press('Enter');
    await until(() => llm.held > held, 10000, '读意图的请求到达模型');
    await (await setup(page)).locator('[data-session-method=free]').click();
    await page.getByTestId('free-studio').waitFor();
    const thirdId = (await saved(page)).currentSessionId;
    llm.release(); llm.hold = null;
    await until(async () => (await logLines()).some(l => l.task === 'intent'), 10000, '读意图的调用记进日志');
    await sleep(600);
    st = await saved(page);
    const intentEvent = st.events.find(e => e.kind === 'ai-intent' || e.kind === 'ai-late');
    const where = id => id === freeId ? '自由提示那一场' : id === nextId ? '工作台那一场' : id === thirdId ? '第三场' : String(id);
    const zips = { free: await exportZip(page, freeId), next: await exportZip(page, nextId), third: await exportZip(page, thirdId) };
    const tasks = z => z.calls.map(c => c.task).join(',') || '无';
    const observed = { freeReply: reply ? where(reply.sessionId) : '没有记下', intentReading: intentEvent ? where(intentEvent.sessionId) + '·' + intentEvent.kind : '没有记下',
      targetsAppliedToProject: st.project.intent.elements.length, zipCalls: { free: tasks(zips.free), next: tasks(zips.next), third: tasks(zips.third) },
      zipTurns: { free: zips.free.workspace.turns.length, next: zips.next.workspace.turns.length, third: zips.third.workspace.turns.length } };
    const pass = reply?.sessionId === freeId && intentEvent?.sessionId === nextId && tasks(zips.free) === 'free' && tasks(zips.next) === 'intent' && tasks(zips.third) === '无'
      && zips.free.workspace.turns.length === 2 && zips.third.workspace.turns.length === 0;
    return { pass, observed };
  } finally { llm.hold = null; await context.close(); }
});

await check(3, 'Qwen 入队后断线、浏览器断开、服务重启：按原 prompt_id 取回，每轮只入队一次', async () => {
  const { context, page } = await open();
  const observed = {};
  try {
    await begin(page, { method: 'free' });
    // a. 入队以后服务到 ComfyUI 的连接断开 2.5 秒，远端 1.5 秒后跑完
    comfy.runMs = 1500; comfy.dropAfterEnqueue = true; comfy.downMs = 2500;
    let before = comfy.prompts.length;
    await page.getByTestId('free-prompt').fill('enqueued, then the GPU connection drops');
    await page.getByTestId('free-run').click();
    await sleep(4500);
    if (await page.getByTestId('round-recover').count()) await page.getByTestId('round-recover').first().click();
    const a = await until(async () => (await rows(page)).at(-1)?.candidates.length > 0, 8000).then(() => true, () => false);
    let last = (await rows(page)).at(-1);
    observed.drop = { gotImage: a, status: last.h3.status, issue: last.h3.issue ?? null, enqueues: comfy.prompts.length - before };
    // b. 浏览器到本机服务断开：页面这一侧查不到进度，自由提示那一页要有“取回”
    comfy.runMs = 300;
    const blocked = url => url.pathname.startsWith('/api/h3/jobs/');
    await page.route(blocked, route => route.abort('connectionrefused'));
    before = comfy.prompts.length;
    const count = (await rows(page)).length;
    await page.getByTestId('free-prompt').fill('the browser loses the local service while waiting');
    await page.getByTestId('free-run').click();
    const sawIssue = await until(async () => { const r = await rows(page); return r.length > count && !!r.at(-1).h3.issue; }, 8000, '页面记下连不上').then(() => true, () => false);
    observed.browserIssue = sawIssue ? (await rows(page)).at(-1).h3.issue : '（没记下）';
    await page.getByTestId('round-recover').first().waitFor({ timeout: 8000 }).catch(() => {});
    const button = await page.getByTestId('round-recover').count();
    await shot(page, '13-待核对与取回.png');
    await page.unroute(blocked);
    if (button) await page.getByTestId('round-recover').first().click();
    const b = await until(async () => (await rows(page)).at(-1)?.candidates.length > 0, 8000).then(() => true, () => false);
    last = (await rows(page)).at(-1);
    observed.browser = { recoverButtonOnFreePage: button > 0, gotImage: b, status: last.h3.status, enqueues: comfy.prompts.length - before };
    // c. 工作台服务在等回图时重启：旧进程的连接停住，新进程接手；页面刷新一次
    comfy.runMs = 2500;
    before = comfy.prompts.length;
    await page.getByTestId('free-prompt').fill('the workbench service restarts while waiting');
    await page.getByTestId('free-run').click();
    await until(() => comfy.prompts.length > before, 8000, '入队');
    await sleep(300);
    const id = (await rows(page)).at(-1).id;
    conn.s.dead = true;
    const file = join(jobsDir, id + '.json');
    const record = JSON.parse(await readFile(file, 'utf8'));
    await writeFile(file, JSON.stringify({ ...record, ownerPid: 2147480000 }));
    conn = killable();
    live.jobs = makeJobs(conn.fetch);
    await page.reload();
    await page.getByTestId('free-studio').waitFor();
    await sleep(3500);
    if (await page.getByTestId('round-recover').count()) await page.getByTestId('round-recover').first().click();
    const c = await until(async () => (await rows(page)).find(r => r.id === id)?.candidates.length > 0, 8000).then(() => true, () => false);
    last = (await rows(page)).find(r => r.id === id);
    observed.restart = { gotImage: c, status: last.h3.status, issue: last.h3.issue ?? null, enqueues: comfy.prompts.length - before };
    const pass = [observed.drop, observed.browser, observed.restart].every(x => x.gotImage && x.status === 'succeeded' && x.enqueues === 1) && observed.browser.recoverButtonOnFreePage;
    return { pass, observed };
  } finally { comfy.runMs = 300; comfy.down = false; await context.close(); }
});

await check(4, '推理强度 max 下五个入口都不被截断；回执写明模型、推理强度和完整回答', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { brief: 'A', method: 'structured', participant: 'P90', order: '1' });
    llm.thinkingTokens = 12000;
    const n = llm.requests.length;
    await page.locator('#v4-command').fill('为日常随行航拍设计一款四旋翼，展开俯视时希望整体显得紧凑。');
    await page.locator('#v4-command').press('Enter');
    await until(() => llm.requests.length > n, 10000, '读意图的请求');
    await page.waitForFunction(() => document.querySelector('[data-element=target]') || document.querySelector('.k4-status.is-error'), null, { timeout: 10000 });
    const body = llm.requests.at(-1), entry = (await logLines()).at(-1);
    const targets = await page.locator('[data-element=target]').count();
    // 其余四个入口直接调本机服务（界面上的流程在 studio4 走查里），只看回答是否完整、能否用
    const post = (task, payload) => fetch(origin + '/api/ai/' + task, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(async r => ({ ok: r.ok, data: await r.json() }));
    const parameters = null;
    const others = {
      directions: await post('directions', { intent: { text: '紧凑', targets: [{ pair: 'compact', pole: 'left', text: '紧凑' }], notes: [] }, lane: { parameters }, locked: ['frame'] }),
      layer: await post('layer', { layer: 'body', message: '再紧凑一点', lane: { parameters }, intent: null, locked: ['frame'], history: [] }),
      revise: await post('revise', { message: '机身短一点', candidate: { parameters }, intent: null, locked: ['frame'] }),
      free: await post('free', { messages: [{ role: 'user', content: '帮我写一段提示词' }] }),
    };
    const lines = (await logLines()).slice(-5);
    const observed = { budgetField: body.max_completion_tokens !== undefined ? 'max_completion_tokens' : 'max_tokens', budget: body.max_completion_tokens ?? body.max_tokens,
      effortSent: body.reasoning_effort ?? '（没写，服务默认 max）', intentTargetsShown: targets,
      receipts: lines.map(l => ({ task: l.task, servedModel: l.servedModel ?? null, effort: l.request?.reasoning_effort ?? null, finish: l.finishReason ?? null, error: l.error ?? null })),
      otherEntries: Object.fromEntries(Object.entries(others).map(([k, v]) => [k, v.ok ? '完整' : v.data.code])) };
    const pass = targets > 0 && Object.values(others).every(v => v.ok)
      && lines.every(l => l.servedModel === 'MiniMax-M3.1-Flash' && l.request?.reasoning_effort === 'max' && l.finishReason === 'stop' && !l.error);
    return { pass, observed };
  } finally { llm.thinkingTokens = 1000; await context.close(); }
});

await check(5, '失败的文字调用进这一场的 ZIP：编号、入口、时间、原因；取不到的列为缺失', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { method: 'free' });
    const since = new Date().toISOString();
    llm.fail = 2;
    for (const text of ['第一句（会失败）', '第二句（也会失败）']) {
      await page.getByTestId('free-chat').fill(text);
      await page.getByTestId('free-chat').press('Enter');
      await page.locator('aside.r4 [role=alert]').waitFor({ timeout: 10000 });
      await sleep(200);
    }
    const zip = await exportZip(page, id);
    const serverFailures = (await logLines()).filter(l => l.error && l.at >= since);
    const failed = zip.calls.filter(c => c.error);
    const observed = { serverFailures: serverFailures.length, zipCalls: zip.calls.length, zipFailures: failed.map(c => ({ id: !!c.id, task: c.task, at: !!c.at, error: c.error })),
      manifest: zip.manifest.aiCalls };
    const pass = serverFailures.length === 2 && failed.length === 2 && failed.every(c => c.id && c.task === 'free' && c.at && c.error)
      && (zip.manifest.aiCalls.failed ?? zip.manifest.aiCalls.found) >= 2;
    return { pass, observed };
  } finally { llm.fail = 0; await context.close(); }
});

await check(6, '重新导出旧的一场：清单写的文字模型和出图后端取自那一场的记录，与逐轮回执一致', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { method: 'free' });
    await page.getByTestId('free-chat').fill('先聊一句');
    await page.getByTestId('free-chat').press('Enter');
    await until(async () => (await saved(page)).turns.some(t => t.role === 'assistant'), 10000, '回答');
    await freeRound(page, 'a round before the service changes');
    const box = await setup(page);
    await box.getByTestId('session-end-reason').fill('到时间');
    await box.getByTestId('session-end').click();
    live.jobsDescribe = { provider: 'minimax', model: 'MiniMax-H3-Image', endpoint: '/v1/images/edits', label: 'MiniMax H3 Image', configured: true };
    live.aiDescribe = { mode: 'model', provider: 'openai-compatible', model: 'Some-Other-Model', endpoint: 'api.example.invalid', registry: 'x', label: 'Some-Other-Model（api.example.invalid）' };
    await page.reload();
    await page.getByTestId('studio4').waitFor();
    const zip = await exportZip(page, id);
    const round = JSON.parse(zip.text(zip.files.find(f => f.startsWith('rounds/') && f.endsWith('.json'))));
    const observed = { manifestText: zip.manifest.textModel?.model ?? null, manifestImage: zip.manifest.imageBackend?.model ?? null,
      roundImage: round.h3?.model ?? null, callModel: zip.calls[0]?.model ?? null, exportTimeEnvironment: zip.manifest.exportedWith?.textModel?.model ?? null };
    const pass = observed.manifestText === 'MiniMax-M3.1-Flash' && observed.manifestImage === 'Qwen-Image-2.1' && observed.roundImage === 'Qwen-Image-2.1' && observed.callModel === 'MiniMax-M3.1-Flash';
    return { pass, observed };
  } finally { live.jobsDescribe = null; live.aiDescribe = null; await context.close(); }
});

await check(8, '两组共用的用户依据摘要：同一版本，原文、摘要和版本都在场次记录里', async () => {
  const { context, page } = await open();
  try {
    const a = await begin(page, { brief: 'A', method: 'structured', participant: 'P91', order: '1' });
    await page.locator('[data-node=intent]').dispatchEvent('click');
    await page.getByTestId('brief-card').waitFor();
    const structured = await page.locator('[data-testid=evidence-summary]').first().getAttribute('data-version', { timeout: 3000 }).catch(() => null);
    await shot(page, '14-委托与用户依据摘要.png');
    await page.keyboard.press('Escape');
    await page.getByTestId('overview-panel').waitFor();
    const b = await begin(page, { brief: 'B', method: 'free', participant: 'P91', order: '2' });
    const free = await page.locator('[data-testid=evidence-summary]').first().getAttribute('data-version', { timeout: 3000 }).catch(() => null);
    const st = await saved(page);
    const recorded = [a, b].map(id => st.sessions.find(s => s.id === id)?.evidenceSummary?.version ?? null);
    const observed = { structured, free, recorded };
    return { pass: !!structured && structured === free && recorded.every(v => v === structured), observed };
  } finally { await context.close(); }
});

await check(9, '主动操作、模型与排队等待、主持人交接分开计；按 15 分钟、9 次、9 张核对', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { method: 'free' });
    await page.getByTestId('free-chat').fill('先聊一句');
    await page.getByTestId('free-chat').press('Enter');
    await until(async () => (await saved(page)).turns.some(t => t.role === 'assistant'), 10000, '回答');
    let handoff = false;
    const box = await setup(page);
    if (await box.getByTestId('mark-handoff').count()) {
      handoff = true;
      await box.getByTestId('mark-note').fill('帮设计者把委托原文粘进对话框');
      await box.getByTestId('mark-handoff').click(); await sleep(400); await box.getByTestId('mark-resume').click();
    }
    await closeModerator(page);
    comfy.runMs = 600;
    await freeRound(page, 'a round to time');
    comfy.runMs = 300;
    if (shots) { await (await setup(page)).getByTestId('session-clock').scrollIntoViewIfNeeded(); await shot(page, '15-场次计时与主持人交接.png'); await closeModerator(page); }
    const zip = await exportZip(page, id);
    const timing = zip.manifest.timing ?? null;
    const csv = zip.text('session-events.csv');
    const observed = { handoffControls: handoff, timing: timing && { activeMs: timing.activeMs, waitingMs: timing.waiting?.ms, moderatorMs: timing.moderator?.ms, unknown: timing.unknown, limits: timing.limits, used: timing.used },
      csvHeader: csv?.split('\n')[0] ?? null };
    const pass = handoff && timing && timing.moderator.ms > 0 && timing.waiting.ms > 0 && typeof timing.activeMs === 'number' && timing.limits?.activeMinutes === 15
      && timing.used?.opportunities === 1 && csv?.startsWith('anonymous_pair,session,task_version,condition,attempt,event,timestamp_with_zone,time_source');
    return { pass, observed };
  } finally { await context.close(); }
});

await check(10, '定稿只有一个当前值；把它“不要”以后清楚写明没有定稿', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { method: 'free' });
    await freeRound(page, 'first candidate');
    await freeRound(page, 'second candidate');
    const card = i => page.locator('[data-free-candidate]').nth(i);
    await card(0).getByTestId('free-final').click(); await sleep(300);
    await card(1).getByTestId('free-final').click(); await sleep(300);
    await card(1).getByRole('button', { name: '不要' }).click(); await sleep(300);
    await shot(page, '16-终稿只有一个当前值.png');
    const zip = await exportZip(page, id);
    const finals = zip.workspace.events.filter(e => e.kind === 'final');
    const observed = { finalEvents: finals.length, manifestFinal: zip.manifest.final ?? '（清单里没有这一项）', ui: await page.getByTestId('final-current').textContent().catch(() => '（界面上没有）') };
    const pass = zip.manifest.final && zip.manifest.final.current === null && zip.manifest.final.history?.length === 3;
    return { pass, observed };
  } finally { await context.close(); }
});

await check(11, '每一轮的工作流、入队回执、运行历史和原图都在 ZIP 里；入队失败保留 ComfyUI 报的节点或权重错误', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { method: 'free' });
    await freeRound(page, 'a successful round');
    comfy.nodeError = true;
    await page.getByTestId('free-prompt').fill('a round that ComfyUI refuses');
    await page.getByTestId('free-run').click();
    await until(async () => ['failed'].includes((await rows(page)).at(-1).h3.status), 10000, '入队失败');
    comfy.nodeError = false;
    const failed = (await rows(page)).at(-1);
    const zip = await exportZip(page, id);
    const server = zip.files.filter(f => /^rounds\/.*\/(comfy-request|comfy-ack|comfy-history|prompt|job|comfy-error)/.test(f) || /-服务端\//.test(f));
    const observed = { issue: failed.h3.issue, serverFilesInZip: server.map(f => f.replace(/^rounds\/[^/]*\//, '')),
      perRound: zip.manifest.rounds.map(r => ({ found: (r.serverFiles?.found ?? []).map(f => f.name), missing: r.serverFiles?.missing })) };
    const names = r => (r.serverFiles?.found ?? []).map(f => f.name ?? f);
    const pass = /UNETLoader|value_not_in_list|qwen_image_2\.1_bf16/.test(failed.h3.issue ?? '') && zip.manifest.rounds.every(r => r.serverFiles && !r.serverFiles.missing.length)
      && ['comfy-request.json', 'comfy-ack.json', 'comfy-history.json', 'prompt.txt'].every(n => names(zip.manifest.rounds[0]).includes(n))
      && zip.manifest.rounds[0].serverFiles.found.some(f => /\.png$/.test(f.name) && /候选1\.png$/.test(f.inZipAs))
      && ['comfy-request.json', 'comfy-error.json'].every(n => names(zip.manifest.rounds[1]).includes(n))
      && zip.files.some(f => /-服务端\/comfy-error\.json$/.test(f));
    return { pass, observed };
  } finally { comfy.nodeError = false; await context.close(); }
});

await check(12, '登记场次不能用“直接换方式”开出缺次序的登记场次', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { brief: 'A', method: 'structured', participant: 'P01', order: '1' });
    const button = (await setup(page)).locator('[data-session-method=free]');
    const disabled = await button.isDisabled();
    if (!disabled) { await button.click(); await page.getByTestId('free-studio').waitFor(); }
    await closeModerator(page);
    const st = await saved(page);
    const s = st.sessions.find(x => x.id === st.currentSessionId);
    const chip = await page.getByTestId('session-chip').textContent();
    const observed = { quickSwitchDisabled: disabled, kind: s.kind, method: s.method, brief: s.briefId ?? null, participant: s.participant ?? null, order: s.order ?? null, chip };
    const complete = x => x.briefId && x.participant && x.order && ['structured', 'free'].includes(x.method);
    const pass = st.sessions.every(x => x.kind !== 'registered' || complete(x));
    return { pass, observed };
  } finally { await context.close(); }
});

await check(13, '自由提示的比较页写出两轮实发文字的差别和有没有父图', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { method: 'free' });
    await freeRound(page, 'A compact camera quadcopter, matte grey, strict top view.');
    await freeRound(page, 'A compact camera quadcopter, glossy orange, strict top view.');
    for (let i = 0; i < 2; i++) await page.locator('[data-free-candidate]').nth(i).getByRole('button', { name: '比较' }).click();
    await page.getByTestId('free-compare').click();
    await page.getByTestId('compare-panel').waitFor();
    const title = await page.getByTestId('compare-panel').locator('.r4-title').textContent();
    await shot(page, '17-自由提示的比较.png');
    const sent = await page.locator('[data-testid=compare-sent]').textContent().catch(() => null);
    const observed = { title, sentTextShown: sent };
    // 第二段按差别显示（多出的字、删掉的字），所以分别找
    const pass = !/决定相同/.test(title) && !!sent && /matte grey/.test(sent) && /glossy/.test(sent) && /orange/.test(sent) && /父图：无/.test(sent)
      && await page.locator('[data-testid=compare-sent] ins').count() > 0 && await page.locator('[data-testid=compare-sent] del').count() > 0;
    return { pass, observed };
  } finally { await context.close(); }
});

/**
 * 自由提示页上的一轮：从点“生成”起，记下这一轮先后显示过的状态标题，直到回图显示、记了失败或超时。
 * poke：“取回”一出现就点一次（远端还在校验的时候）。
 */
async function watchRound(page, before, { timeout = 25000, poke = false, during } = {}) {
  await until(async () => (await rows(page)).length > before, 10000, '这一轮的记录');
  const id = (await rows(page)).at(-1).id, titles = [], end = Date.now() + timeout;
  let poked = false;
  while (Date.now() < end) {
    const title = await page.locator(`[data-free-round="${id}"] .n4-t`).textContent({ timeout: 200 }).catch(() => null);
    if (title && titles.at(-1) !== title) titles.push(title);
    if (poke && !poked && await page.locator(`[data-free-round="${id}"] [data-testid=round-recover]`).count()) {
      await page.locator(`[data-free-round="${id}"] [data-testid=round-recover]`).click(); poked = true;
    }
    if (during) await during(titles);
    const r = (await rows(page)).find(x => x.id === id);
    if (r.candidates.some(c => c.shown) || r.h3.status === 'failed') break;
    await sleep(200);
  }
  const r = (await rows(page)).find(x => x.id === id);
  const job = JSON.parse(await readFile(join(jobsDir, id + '.json'), 'utf8'));
  return { titles, poked, status: r.h3.status, issue: r.h3.issue ?? null, image: r.candidates.some(c => c.shown),
    enqueues: comfy.prompts.filter(p => p.client_id === 'studio-' + id).length, enqueueRequests: job.comfy?.enqueueRequests ?? null, foundBy: job.comfy?.foundBy ?? null };
}
async function freeRun(page, text) {
  const before = (await rows(page)).length;
  await page.getByTestId('free-prompt').fill(text);
  await page.getByTestId('free-run').click();
  return before;
}

await check('G1', 'GPT 复测 1：入队回执在远端校验时丢了，这时队列和历史都查不到：不重发；找到原作业后取回原图', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { method: 'free' });
    comfy.next = 'drop-while-validating'; comfy.validateMs = 6000; comfy.runMs = 600;
    const before = await freeRun(page, 'the receipt is lost while ComfyUI is still validating');
    const w = await watchRound(page, before, { poke: true });
    return { pass: w.image && w.status === 'succeeded' && w.enqueues === 1 && w.enqueueRequests === 1, observed: w };
  } finally { comfy.next = null; comfy.validateMs = 0; comfy.runMs = 300; await context.close(); }
});

await check('G2', 'GPT 复测 2：远端已经收下，代理回 502 或回执正文传到一半断了：记待核对，不记失败；找到原作业后取回原图', async () => {
  const { context, page } = await open();
  const observed = {};
  try {
    await begin(page, { method: 'free' });
    let shotTaken = !shots;
    for (const mode of ['bad-gateway', 'cut-body']) {
      comfy.next = mode; comfy.runMs = 600;
      const before = await freeRun(page, 'the gateway misbehaves after ComfyUI accepted the prompt: ' + mode);
      observed[mode] = await watchRound(page, before, { during: async titles => { if (!shotTaken && titles.at(-1) === '待确认入队') { shotTaken = true; await shot(page, '18-代理回502以后待确认入队.png'); } } });
    }
    const pass = Object.values(observed).every(w => w.image && w.status === 'succeeded' && w.enqueues === 1 && w.enqueueRequests === 1);
    return { pass, observed };
  } finally { comfy.next = null; comfy.runMs = 300; await context.close(); }
});

await check('G3', 'GPT 复测 3：入队结果不明时写“待确认入队”，发出前就连不上时写“还没发出”，找到原作业或收到回执以前都不写“已入队”', async () => {
  const { context, page } = await open();
  const observed = {};
  try {
    await begin(page, { method: 'free' });
    // a. 入队请求发出后连接断了，远端 4 秒后才进队列
    comfy.next = 'drop-while-validating'; comfy.validateMs = 4000; comfy.runMs = 600;
    let before = await freeRun(page, 'the connection drops after the prompt was sent');
    observed.dropped = await watchRound(page, before);
    // b. 发出前就连不上（服务没开），2.5 秒后服务开了
    comfy.refuse = true;
    setTimeout(() => { comfy.refuse = false; }, 2500);
    before = await freeRun(page, 'the image service is not up yet at submission');
    let shotTaken = !shots;
    observed.notSent = await watchRound(page, before, { during: async titles => { if (!shotTaken && /还没发/.test(titles.at(-1) ?? '')) { shotTaken = true; await shot(page, '19-还没发到出图服务.png'); } } });
    const says = (w, re) => w.titles.some(t => re.test(t));
    const pass = says(observed.dropped, /待确认入队/) && !says(observed.dropped, /已入队/) && observed.dropped.image && observed.dropped.enqueues === 1
      && says(observed.notSent, /还没发/) && !says(observed.notSent, /已入队/) && observed.notSent.image && observed.notSent.enqueues === 1 && observed.notSent.enqueueRequests === 1;
    return { pass, observed };
  } finally { comfy.next = null; comfy.validateMs = 0; comfy.runMs = 300; comfy.refuse = false; await context.close(); }
});

// ---------- 4.4：作者 11 月 24 日的问题与 Codex 子代理走查 ----------
const tap = locator => locator.dispatchEvent('click');
async function openLayer(page, lane, layer) {
  await tap(page.locator(`[data-node=layer][data-layer=${layer}][data-lane="${lane}"]`).first());
  await page.locator(`[data-testid=layer-panel][data-layer=${layer}]`).waitFor();
}
const nodeValue = (st, lane, path) => {
  // 沿方案的链从末端往上找最近一个写了这一项的节点
  let id = st.project.lanes.find(l => l.id === lane)?.leafId;
  while (id) { const n = st.project.nodes[id]; if (path in n.values) return n.values[path]; id = n.parentId; }
  return undefined;
};

await check('R1', '子代理 1：登记场次的 C2 由程序锁定，没有“解除”；机架改不了、抄不了、另做一版的入口在其他层；撤销撤不掉锁定；任务卡、实际规格和导出一致', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { brief: 'A', method: 'structured', participant: 'P71', order: '1' });
    const box = await setup(page);
    const unlock = await box.getByTestId('unlock-condition').count(), lockedNote = await box.getByTestId('condition-locked').count();
    await closeModerator(page);
    await openLayer(page, 'lane-A', 'frame');
    await shot(page, 'R1-登记场次机架固定.png');
    const frameDisabled = await page.locator('section[aria-label=这一层的控件] [data-field="frame.arm_width_mm"] [data-option="20mm"]').isDisabled();
    const frameFork = await page.getByTestId('fork-here').count(), frameCopy = await page.getByTestId('copy-from').count();
    await openLayer(page, 'lane-A', 'body');
    await page.locator('[data-field="fuselage.top_cover"] [data-option="two"]').click();
    await page.locator('button[title=撤销]').click();
    const st = await saved(page);
    await tap(page.locator('[data-node=intent]'));
    const fixed = await page.getByTestId('fixed-conditions').first().innerText();
    const zip = await exportZip(page, id);
    // 等于起始值的项不写进节点（250 mm 就是起始值），这里只看写进去的两项；三项是否都成立看导出清单里程序算的核对。
    const frame = ['frame.frame_type', 'frame.span_ratio_wl'].map(path => nodeValue(st, 'lane-A', path));
    const observed = { unlock, lockedNote, frameDisabled, frameFork, frameCopy, lockedAfterUndo: st.session.lockedFrame ?? null, frame, fixed,
      condition: zip.manifest.session.registrationCondition, complete: zip.manifest.session.registeredComplete };
    const pass = unlock === 0 && lockedNote === 1 && frameDisabled && frameFork === 0 && frameCopy === 0 && observed.lockedAfterUndo === 'c2-pilot'
      && JSON.stringify(frame) === JSON.stringify(['True X', 1]) && /W\/L：1\.00/.test(fixed) && /250 mm/.test(fixed)
      && observed.condition?.ok === true && observed.condition?.mismatches?.length === 0 && observed.complete === true;
    return { pass, observed };
  } finally { await context.close(); }
});

await check('R2', '子代理 2：撤销只撤设计；修改事件、技术暂停与恢复都留着，另记一条“撤销：……”；暂停时长不变', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { brief: 'A', method: 'structured', participant: 'P72', order: '1' });
    await openLayer(page, 'lane-A', 'body');
    await page.locator('[data-field="fuselage.top_cover"] [data-option="two"]').click();
    const box = await setup(page);
    await box.getByTestId('mark-note').fill('GPU 断线');
    await box.getByTestId('mark-pause').click(); await sleep(1200); await box.getByTestId('mark-resume').click();
    await closeModerator(page);
    await page.locator('button[title=撤销]').click();
    const st = await saved(page);
    const mine = st.events.filter(e => e.sessionId === id);
    const zip = await exportZip(page, id);
    const kinds = mine.map(e => e.kind);
    const observed = { kinds, edit: mine.find(e => e.kind === 'edit')?.text ?? null, undo: mine.find(e => e.kind === 'undo')?.text ?? null,
      topCoverNow: nodeValue(st, 'lane-A', 'fuselage.top_cover') ?? '', pauseMs: zip.manifest.timing.moderator.pauseMs,
      zipKinds: zip.workspace.events.map(e => e.kind) };
    const pass = ['edit', 'moderator-start', 'moderator-end', 'undo'].every(k => kinds.includes(k) && observed.zipKinds.includes(k))
      && observed.undo === '撤销：' + observed.edit && observed.topCoverNow === '' && observed.pauseMs >= 1000;
    return { pass, observed };
  } finally { await context.close(); }
});

await check('R3', '子代理 3：同一个人再登记一个第 1 场：开始按钮不可点、写明冲突；现在这一场照常继续，本机只有一个第 1 场', async () => {
  const { context, page } = await open();
  try {
    const id = await begin(page, { brief: 'A', method: 'structured', participant: 'P73', order: '1' });
    const box = await setup(page);
    await box.getByTestId('session-brief').selectOption('B');
    await box.locator('[data-setup-method=free]').click();
    await box.getByTestId('session-participant').fill('P73');
    await box.getByTestId('session-order').selectOption('1');
    const disabled = await box.getByTestId('session-start').isDisabled();
    const clash = await box.getByTestId('session-clash').textContent().catch(() => null);
    await closeModerator(page);
    const st = await saved(page);
    const current = st.sessions.find(s => s.id === st.currentSessionId);
    const ones = st.sessions.filter(s => s.kind === 'registered' && s.participant === 'P73' && s.order === 1).length;
    const observed = { disabled, clash, currentIsSame: current?.id === id, ended: !!current?.endedAt, ones };
    return { pass: disabled && /已经有第 1 场/.test(clash ?? '') && observed.currentIsSame && !observed.ended && ones === 1, observed };
  } finally { await context.close(); }
});

await check('R4', '子代理 4：两种方式开场看到同一张任务卡（同一段委托、同一版依据、同样的固定条件和限额），计时都从开场算；自由提示页只说这一步怎么做', async () => {
  const { context, page } = await open();
  try {
    const a = await begin(page, { brief: 'A', method: 'structured', participant: 'P74', order: '1', keepTaskCard: true });
    const cardA = await page.getByTestId('task-card').innerText();
    await shot(page, 'R4-开场任务卡.png');
    await passTaskCard(page);
    const zipA = await exportZip(page, a);
    const b = await begin(page, { brief: 'A', method: 'free', participant: 'P75', order: '1', keepTaskCard: true });
    const cardB = await page.getByTestId('task-card').innerText();
    await passTaskCard(page);
    const freeText = await page.getByTestId('free-studio').innerText();
    const st = await saved(page);
    const zips = [zipA, await exportZip(page, b)];
    // 开第二场时另开了空白项目，第一场的事件在它结束时的存档里，按各自的 ZIP 看。
    const started = [a, b].map((id, i) => !!st.sessions.find(s => s.id === id)?.taskStartedAt && zips[i].workspace.events.some(e => e.kind === 'task-start'));
    const fromStart = zips.map(z => z.manifest.timing.wall.from === z.manifest.session.startedAt);
    const compares = /和工作台|没有用户依据|同一个出图后端/.test(freeText);
    const observed = { sameCard: cardA === cardB, cardLength: cardA.length, hasLimits: /15 分钟/.test(cardA) && /9 次生成/.test(cardA), hasEvidence: /依据/.test(cardA), started, fromStart, compares };
    return { pass: observed.sameCard && observed.hasLimits && observed.hasEvidence && started.every(Boolean) && fromStart.every(Boolean) && !compares, observed };
  } finally { await context.close(); }
});

await check('R5', '作者 6：登记场次里参与者看不到研究记录、旧版和场次设置，这几项在主持人面板里；打开主持人面板要先确认，并记一笔', async () => {
  const { context, page } = await open();
  try {
    const trial = { records: await page.getByTestId('open-records').count(), old: await page.getByTestId('old-version').count() };
    const a = await begin(page, { brief: 'A', method: 'structured', participant: 'P76', order: '1' });
    const reg = { records: await page.getByTestId('open-records').count(), old: await page.getByTestId('old-version').count(), setup: await page.getByTestId('session-setup').count() };
    await page.getByTestId('open-moderator').click();
    const confirm = await page.getByTestId('moderator-confirm').count();
    await shot(page, 'R5-主持人面板先确认.png');
    await page.getByTestId('moderator-confirm-open').click(); await page.getByTestId('moderator-drawer').waitFor();
    await shot(page, 'R5-主持人面板.png');
    const drawer ={ records: await page.getByTestId('open-records-moderator').count(), old: await page.getByTestId('old-version-moderator').count(), setup: await page.getByTestId('session-setup').count() };
    await closeModerator(page);
    const logged = (await saved(page)).events.some(e => e.sessionId === a && e.kind === 'moderator-panel');
    await begin(page, { brief: 'B', method: 'free', participant: 'P76', order: '2' });
    const free = { records: await page.getByTestId('open-records').count(), old: await page.getByTestId('old-version').count(), setup: await page.getByTestId('session-setup').count() };
    const observed = { trial, reg, confirm, drawer, logged, free };
    const pass = trial.records === 1 && trial.old === 1 && Object.values(reg).every(n => n === 0) && confirm === 1 && Object.values(drawer).every(n => n === 1) && logged && Object.values(free).every(n => n === 0);
    return { pass, observed };
  } finally { await context.close(); }
});

await check('R6', '作者 3：点已经选中的 15 mm 不算修改；改成 20 mm 记成“机臂宽度 15 mm → 20 mm”；层面板不列原始记录', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { method: 'structured' });
    await openLayer(page, 'lane-A', 'frame');
    const before = (await saved(page)).events.length;
    await page.locator('[data-field="frame.arm_width_mm"] [data-option="15mm"]').click();
    await sleep(250);
    const afterSame = (await saved(page)).events.length;
    await page.locator('[data-field="frame.arm_width_mm"] [data-option="20mm"]').click();
    await until(async () => (await saved(page)).events.length > afterSame, 3000, '修改事件');
    const edit = (await saved(page)).events.filter(e => e.kind === 'edit').at(-1);
    const observed = { sameClickLogged: afterSame - before, text: edit?.text ?? null, from: edit?.from ?? null, to: edit?.to ?? null,
      rawList: await page.locator('[aria-label=这一层的记录]').count() };
    return { pass: observed.sameClickLogged === 0 && observed.text === '机臂宽度 15 mm → 20 mm' && observed.from === '15mm' && observed.to === '20mm' && observed.rawList === 0, observed };
  } finally { await context.close(); }
});

await check('R7', '作者 1、2：“从机身起另做一版”写明哪几层仍共用；“把方案 B 的机架设置抄过来”先列出会改的项；机架固定时另做一版的入口在其他层', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { method: 'structured' });
    await openLayer(page, 'lane-A', 'body');
    const label = (await page.getByTestId('fork-here').innerText()).trim(), hint = await page.getByTestId('fork-shared-hint').innerText();
    if (shots) { await page.getByTestId('fork-here').scrollIntoViewIfNeeded(); await shot(page, 'R7-从机身起另做一版.png'); }
    await openLayer(page, 'lane-A', 'frame');
    await page.getByTestId('fork-here').click();
    await page.locator('[data-testid=layer-panel][data-layer=frame]').waitFor();
    const laneB = (await saved(page)).project.activeLaneId;
    await page.locator('[data-field="frame.arm_width_mm"] [data-option="20mm"]').click();
    await openLayer(page, 'lane-A', 'frame');
    await page.getByTestId('copy-from').selectOption(laneB);
    const preview = await page.getByTestId('copy-preview').innerText(), confirm = (await page.getByTestId('copy-confirm').innerText()).trim();
    if (shots) { await page.getByTestId('copy-confirm').scrollIntoViewIfNeeded(); await shot(page, 'R7-抄设置前先列出会变的项.png'); }
    const beforeCopy = nodeValue(await saved(page), 'lane-A', 'frame.arm_width_mm') ?? '15mm';
    await page.getByTestId('copy-confirm').click();
    await until(async () => nodeValue(await saved(page), 'lane-A', 'frame.arm_width_mm') === '20mm', 3000, '抄过来');
    const copied = (await saved(page)).events.filter(e => e.kind === 'apply').at(-1)?.text ?? null;
    await begin(page, { brief: 'A', method: 'structured', participant: 'P77', order: '1' });
    await openLayer(page, 'lane-A', 'frame');
    const locked = { fork: await page.getByTestId('fork-here').count(), note: await page.getByTestId('fork-frame-locked').count(), copy: await page.getByTestId('copy-from').count() };
    await openLayer(page, 'lane-A', 'propulsion');
    const propFork = await page.getByTestId('fork-here').count();
    const observed = { label, hint, preview, confirm, beforeCopy, copied, locked, propFork };
    const pass = label === '从机身起另做一版' && /机架、动力仍共用/.test(hint) && /机臂宽度/.test(preview) && /15 mm → 20 mm/.test(preview)
      && confirm === '把方案 B的机架设置抄过来'.replace('B的', 'B 的') && beforeCopy === '15mm' && /把方案 B 的机架设置抄到方案 A：机臂宽度 15 mm → 20 mm/.test(copied ?? '')
      && locked.fork === 0 && locked.note === 1 && locked.copy === 0 && propFork === 1;
    return { pass, observed };
  } finally { await context.close(); }
});

await check('R8', '作者 4、5、7—11：生成只按画布上的设置，没有“这一轮想看什么”和完整文字；臂端一体脚架画进侧视、写进请求；表面外观按样子起名；电机前倾收起；宽度可自定义、厚度在侧视；没有八旋共轴说明和“先做主实验”', async () => {
  const { context, page } = await open();
  try {
    await begin(page, { method: 'structured' });
    await openLayer(page, 'lane-A', 'frame');
    const frame = { otherConfigs: await page.getByTestId('other-configs-note').count(), customWidth: await page.getByTestId('arm-width-custom').count(),
      thicknessInSide: await page.locator('[data-testid=side-detail] [data-field="frame.arm_thickness_mm"]').count() };
    await openLayer(page, 'lane-A', 'propulsion');
    const tiltOpen = await page.getByTestId('tilt-more').evaluate(d => d.open);
    await openLayer(page, 'lane-A', 'details');
    await page.locator('[data-field="landing_gear.landing_gear_style"] [data-option="臂端一体脚架"]').click();
    await page.locator('[data-side-gear=arm-tip]').waitFor();
    // 选项换选中时有一段过渡，等它走完再截，不然新旧两个选项都是半深的。
    if (shots) { await page.locator('[data-side-gear=arm-tip]').scrollIntoViewIfNeeded(); await sleep(500); await shot(page, 'R8-臂端一体脚架的侧视.png'); }
    await openLayer(page, 'lane-A', 'cmf');
    const materials = await page.locator('[data-field="frame.material_visual"] [data-option]').allInnerTexts();
    if (shots) { await page.locator('[data-field="frame.material_visual"]').scrollIntoViewIfNeeded(); await shot(page, 'R8-机臂表面外观.png'); }
    await tap(page.locator('[data-node=render][data-lane="lane-A"]').first());
    await page.getByTestId('render-panel').waitFor();
    await shot(page, 'R8-生成面板.png');
    const render = { goal: await page.getByTestId('round-goal').count(), text: await page.getByTestId('round-text').count(), parent: await page.locator('select[aria-label=父图]').count() };
    const n = (await rows(page)).length;
    await page.getByTestId('run-lane').click();
    await until(async () => (await rows(page)).length > n, 15000, '提交这一轮');
    const sent = (await rows(page)).at(-1).text;
    await tap(page.locator('[data-node=intent]'));
    const tasks = await page.getByTestId('task-select').locator('option').allInnerTexts();
    const body = await page.locator('body').innerText();
    const observed = { frame, tiltOpen, materials, render, legsInRequest: /built into the underside of each arm tip/.test(sent), tasks, firstMain: /先做主实验/.test(body) };
    const pass = frame.otherConfigs === 0 && frame.customWidth === 1 && frame.thicknessInSide === 1 && tiltOpen === false
      && ['外露碳纹', '拉丝金属', '细纹注塑', '打印层纹'].every(m => materials.some(x => x.includes(m))) && Object.values(render).every(v => v === 0)
      && observed.legsInRequest && JSON.stringify(tasks) === JSON.stringify(['日常航拍四旋', '农业植保六旋']) && !observed.firstMain;
    return { pass, observed };
  } finally { await context.close(); }
});

await browser.close();
await new Promise(resolve => server.close(resolve));
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} 条通过` + (failed.length ? '；未过：' + failed.map(r => '#' + r.item).join(' ') : ''));
if (failed.length && !probe) process.exitCode = 1;
