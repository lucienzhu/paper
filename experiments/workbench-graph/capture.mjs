// 从工作台本身取出图请求：给一组登记的参数取值，工作台照常编译文字、画布局条件图、组执行图，这里把它实际发给出图服务的那一份原样记下。
// 各批 GPU 请求由这些记录盖上登记的种子和请求号生成（wbgraph.py），所以每一批用的文字编法、条件图画法、执行图和负向词，
// 都与设计者在工作台里点“生成”时相同。出图服务由软件夹具应答，不调用任何模型。
//
// 用法（仓库根目录；先在 prototypes/drone-configurator 里 npm run build）：
//   node experiments/workbench-graph/capture.mjs <状态表.json> <输出目录>
// 状态表：{ "task": "consumer_camera" | "agricultural_spraying", "states": [{ "name": "...", "values": { "参数路径": 取值 } }] }
// 输出：<输出目录>/<name>.json（文字、负向词、执行图、完整规格、条件图摘要），<输出目录>/guides/wbguide-<摘要前 12 位>.png。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bench = resolve(here, '../../prototypes/drone-configurator');
const mod = name => import(pathToFileURL(join(bench, 'scripts', name)).href);
const { createDesignService } = await mod('design-chat.mjs');
const { createDesignServer } = await mod('design-chat-server.mjs');
const { createImageJobs, comfyGraph, comfyDefaults, seedOf } = await mod('image-jobs.mjs');
const { createDesignAI } = await mod('design-ai.mjs');
const { tagPNGFront: tagPNG } = await mod('fixture-png.mjs');
const { chromium } = createRequire(join(bench, 'package.json'))('playwright-core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

const [tablePath, outDir] = process.argv.slice(2);
if (!tablePath || !outDir) { console.error('用法：node experiments/workbench-graph/capture.mjs <状态表.json> <输出目录>'); process.exit(1); }
const table = JSON.parse(await readFile(tablePath, 'utf8'));
const version = (await readFile(join(bench, 'src/v4/version.ts'), 'utf8')).match(/STUDIO_VERSION = '([^']+)'/)[1];
const built = await readFile(join(bench, 'dist/index.html'), 'utf8');
const bundle = built.match(/assets\/[^"]+\.js/)[0];
assert.ok((await readFile(join(bench, 'dist', bundle), 'utf8')).includes(version), 'dist 不是当前版本的构建，先 npm run build');
// 每个参数归哪一层：与 src/v4/model.ts 的 layerFields 相同。抄错了的话，下面核对冻结规格时会停。
const layerFields = {
  frame: ['frame.frame_type', 'frame.wheelbase_mm', 'frame.span_ratio_wl', 'frame.arm_width_mm', 'frame.arm_thickness_mm'],
  propulsion: ['propulsion.prop_diameter_inch', 'propulsion.prop_blade_count', 'propulsion.motor_tilt_degree', 'propulsion.prop_guard'],
  body: ['fuselage.fuselage_dimensions_mm.length', 'fuselage.fuselage_dimensions_mm.width', 'fuselage.fuselage_dimensions_mm.height',
    'fuselage.fuselage_style', 'fuselage.top_cover', 'accessories.spray_tank'],
  details: ['frame.arm_root', 'accessories.has_camera_gimbal', 'accessories.camera_mount', 'landing_gear.landing_gear_style', 'landing_gear.landing_gear_height_mm',
    'accessories.spray_system'],
  cmf: ['accessories.drone_primary_color', 'accessories.surface_finish', 'frame.material_visual', 'accessories.custom_prompt_additions'],
};
const layerOf = path => Object.keys(layerFields).find(layer => layerFields[layer].includes(path));
const getPath = (object, path) => path.split('.').reduce((o, k) => o?.[k], object);

const plain = await readFile(join(bench, 'src/data/history/quad-guide.png'));
const uploads = new Map(), sent = [], runs = new Map(); let output = null;
const comfy = async (url, init = {}) => {
  const { pathname } = new URL(url);
  if (pathname === '/upload/image') { const file = init.body.get('image'); uploads.set(file.name, Buffer.from(await file.arrayBuffer())); return Response.json({ name: file.name, subfolder: '', type: 'input' }); }
  if (pathname === '/prompt') { const body = JSON.parse(init.body); sent.push(body); output = tagPNG(body.prompt['15'] ? uploads.get(body.prompt['15'].inputs.image) : plain, body.prompt);
    runs.set('fixture-' + sent.length, body.prompt); return Response.json({ prompt_id: 'fixture-' + sent.length, node_errors: {} }); }
  if (pathname.startsWith('/history/')) { const id = decodeURIComponent(pathname.slice(9)); const graph = runs.get(id);
    return Response.json({ [id]: { prompt: [1, id, graph, { client_id: 'fixture' }, ['12']], outputs: { 12: { images: [{ filename: graph['12'].inputs.filename_prefix + '_00001_.png', subfolder: '', type: 'output' }] } },
      status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: Date.now() - 20 }], ['execution_success', { prompt_id: id, timestamp: Date.now() }]] } } }); }
  if (pathname === '/queue') return Response.json({ queue_running: [], queue_pending: [] });
  if (pathname === '/view') return new Response(output, { headers: { 'Content-Type': 'image/png' } });
  return new Response('not found', { status: 404 });
};
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const jobs = createImageJobs({ fixture: true, backend: { provider: 'qwen-comfy', url: 'http://comfy.fixture', pollMs: 30 }, fetchImpl: comfy, directory: await mkdtemp(join(tmpdir(), 'wb-capture-jobs-')) });
const ai = await createDesignAI({ logDir: await mkdtemp(join(tmpdir(), 'wb-capture-ai-')) });
const server = createDesignServer(chat, evidence, jobs, ai);
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
await mkdir(join(outDir, 'guides'), { recursive: true });
const KEY = 'multirotor-studio/v4/project';
const summary = [];
try {
  for (const state of table.states) {
    assert.match(state.name, /^[A-Za-z0-9._-]+$/, '状态名只用字母、数字、点、横线：' + state.name);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.getByTestId('studio4').waitFor();
    // 空白项目在第一次改动时才存进浏览器：点一下“整理”（不改任何设计值）让它存下来。
    await page.getByTestId('tidy').dispatchEvent('click');
    await page.waitForFunction(key => !!localStorage.getItem(key), KEY);
    // 把登记的取值写进这条方向各层的节点（和在面板里逐项选是同一份数据），再刷新。
    await page.evaluate(({ key, task, values, layers }) => {
      const saved = JSON.parse(localStorage.getItem(key)), project = saved.project;
      project.intent.taskId = task;
      const path = []; let id = project.lanes[0].leafId;
      while (id) { path.unshift(project.nodes[id]); id = project.nodes[id].parentId; }
      for (const [field, value] of Object.entries(values)) {
        const node = path.find(n => n.layer === layers[field]);
        if (!node) throw new Error('这一项不归任何一层管：' + field);
        node.values[field] = value; node.touched[field] = true;
      }
      localStorage.setItem(key, JSON.stringify(saved));
    }, { key: KEY, task: table.task, values: state.values, layers: Object.fromEntries(Object.keys(state.values).map(f => [f, layerOf(f)])) });
    await page.reload();
    await page.getByTestId('studio4').waitFor();
    const before = sent.length;
    await page.locator('[data-node=render] [data-testid=node-run]').first().dispatchEvent('click');
    await page.locator('[data-node=candidate]').first().waitFor({ timeout: 30000 });
    assert.equal(sent.length, before + 1, state.name + '：工作台应当正好发出一份请求');
    const frozen = await page.evaluate(async () => {
      const db = await new Promise((done, fail) => { const q = indexedDB.open('multirotor-studio-design-records-v1'); q.onsuccess = () => done(q.result); q.onerror = () => fail(q.error); });
      const all = await new Promise(done => { const q = db.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => done(q.result); });
      db.close();
      const a = all[0];
      const hex = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
      return { count: all.length, id: a.id, text: a.confirmedText, model: a.h3?.model, status: a.h3?.status, parameters: a.config.parameters, guide: await hex(a.guide), hasParent: !!a.parentImage };
    });
    assert.deepEqual(errors, [], state.name);
    assert.equal(frozen.count, 1);
    assert.equal(frozen.status, 'succeeded');
    assert.equal(frozen.hasParent, false);
    for (const [field, value] of Object.entries(state.values)) assert.deepEqual(getPath(frozen.parameters, field), value, `${state.name}：冻结的规格里 ${field} 不是登记的取值`);
    const { prompt: graph, prompt_id: jobId } = sent[before];
    assert.equal(jobId, frozen.id);
    const text = graph['4'].inputs.prompt, guideName = graph['15'].inputs.image, guide = uploads.get(guideName);
    assert.equal(text, frozen.text, state.name + '：发给出图服务的文字就是工作台冻结的那一段');
    assert.equal(sha(guide), frozen.guide, state.name + '：发给出图服务的条件图就是工作台冻结的那一张');
    assert.deepEqual(graph, comfyGraph(frozen.id, text, seedOf(frozen.id), [guideName], comfyDefaults), state.name + '：执行图就是工作台的 comfyGraph');
    assert.equal(graph['4'].inputs.negative_prompt, comfyDefaults.negative_prompt);
    assert.deepEqual(Object.keys(graph).filter(k => graph[k].class_type === 'LoadImage'), ['15'], state.name + '：只有一张输入图（布局条件图）');
    const guideFile = 'wbguide-' + sha(guide).slice(0, 12) + '.png';
    await writeFile(join(outDir, 'guides', guideFile), guide);
    // 种子、保存前缀和输入图的文件名不进入生成内容以外的任何东西：留空位，由各批登记盖上。
    const template = structuredClone(graph);
    template['10'].inputs.seed = null; template['12'].inputs.filename_prefix = null; template['15'].inputs.image = guideFile;
    const record = { name: state.name, task: table.task, values: state.values, parameters: frozen.parameters, prompt: text, prompt_sha256: sha(Buffer.from(text, 'utf8')),
      negative_prompt: graph['4'].inputs.negative_prompt, guide: { file: guideFile, sha256: sha(guide), bytes: guide.length }, graph: template,
      workbench: { version, model: frozen.model, bundle, bundle_sha256: sha(await readFile(join(bench, 'dist', bundle))), image_jobs_sha256: sha(await readFile(join(bench, 'scripts/image-jobs.mjs'))) } };
    await writeFile(join(outDir, state.name + '.json'), JSON.stringify(record, null, 2) + '\n');
    summary.push({ name: state.name, guide: guideFile, prompt_sha256: record.prompt_sha256.slice(0, 12), lines: text.split('\n').length });
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(JSON.stringify({ workbench: version, task: table.task, captured: summary.length, guides: [...new Set(summary.map(s => s.guide))].length, states: summary }, null, 2));
