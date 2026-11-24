// 真机验收（Codex 11 月 23 日第 7、14 条）：接上 GPU 主机（AutoDL）上的 ComfyUI（Qwen-Image 2.1），两种方式各出 3 轮：
//   首图；以首图为父图“只改机鼻，保持臂根”；以首图为父图“只改臂根，保持机鼻和轴心位置”。
// 工作台那一场发“条件图”和“条件图 + 父图”；自由提示那一场发“纯文字”和“文字 + 父图”。两场都按委托 A 带委托试用（C2 锁定），不计入实验。
// 逐轮核对：真实的 1024×1024 原图、实际输入的图数和顺序、工作流节点、权重文件名、采样设置、种子、prompt_id、运行历史，
// 再和导出的本场 ZIP 对上（服务端原件齐全、每轮只入队一次、事件表里有入队和执行的时间）。
// 修订前后的原图另存一份匿名的盲读材料（第 14 条）：读者按登记的读者表逐张读，另有一张前后对照表（草案，作者同意后再用）。
//
// 用法（先 npm run build）：
//   node scripts/gpu-acceptance.mjs --comfy-url http://<GPU 主机>:<端口> --out <输出目录> [--text-model]
//   不给 --comfy-url 时用本机夹具把流程走一遍（不出真图），检查本脚本自己。
//   --text-model：文字模型也用真的（密钥只从 WORKBENCH_LLM_API_KEY 或 MINIMAX_API_KEY 读）；默认用规则回退，不产生文字调用费用。
// 权重文件名与 E3 归档一致（qwen_image_2.1_bf16 等）；GPU 主机上的文件名不同时用 QWEN_UNET、QWEN_CLIP、QWEN_VAE 指定，报告里照实写。
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createDesignService } from './design-chat.mjs';
import { createDesignServer } from './design-chat-server.mjs';
import { comfyDefaults, createImageJobs, qwenModel, seedOf } from './image-jobs.mjs';
import { createDesignAI } from './design-ai.mjs';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';
import { closeModerator, passTaskCard, sessionBox } from './moderator-helpers.mjs';

const { values } = parseArgs({ options: { 'comfy-url': { type: 'string' }, out: { type: 'string' }, 'text-model': { type: 'boolean' }, 'wait-minutes': { type: 'string' } } });
const real = !!values['comfy-url'];
const out = resolve(values.out ?? await mkdtemp(join(tmpdir(), 'gpu-acceptance-')));
const waitMs = Number(values['wait-minutes'] ?? 15) * 60000;
await mkdir(join(out, 'zips'), { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// ---------- 演练用的 ComfyUI 夹具（只在不给 --comfy-url 时用） ----------
const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
const fake = { uploads: new Map(), jobs: new Map(), files: new Map(), n: 0 };
async function fakeComfy(url, init = {}) {
  const { pathname, searchParams } = new URL(url);
  if (pathname === '/upload/image') { const f = init.body.get('image'); fake.uploads.set(f.name, Buffer.from(await f.arrayBuffer())); return Response.json({ name: f.name, subfolder: '', type: 'input' }); }
  if (pathname === '/prompt') {
    const body = JSON.parse(init.body), id = body.prompt_id ?? randomUUID(), file = body.prompt['12'].inputs.filename_prefix + '_00001_.png', now = Date.now();
    fake.jobs.set(id, { body, file, number: ++fake.n, start: now + 50, end: now + 400 });
    fake.files.set(file, tagPNG(body.prompt['15'] ? fake.uploads.get(body.prompt['15'].inputs.image) : plain, body.prompt));
    return Response.json({ prompt_id: id, number: fake.n, node_errors: {} });
  }
  if (pathname === '/queue') return Response.json({ queue_running: [], queue_pending: [] });
  if (pathname.startsWith('/history')) {
    const want = pathname.slice('/history/'.length);
    return Response.json(Object.fromEntries([...fake.jobs].filter(([id, j]) => (!want || id === want) && Date.now() > j.end).map(([id, j]) => [id, {
      prompt: [j.number, id, j.body.prompt, { client_id: j.body.client_id }, ['12']], outputs: { 12: { images: [{ filename: j.file, subfolder: '', type: 'output' }] } },
      status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: j.start }], ['execution_success', { prompt_id: id, timestamp: j.end }]] } }])));
  }
  if (pathname === '/view') return new Response(fake.files.get(searchParams.get('filename')), { headers: { 'Content-Type': 'image/png' } });
  return new Response('not found', { status: 404 });
}

// ---------- 服务 ----------
const backend = { provider: 'qwen-comfy', url: real ? values['comfy-url'] : 'http://comfy.rehearsal', pollMs: real ? 2000 : 50, timeoutMs: waitMs,
  unet: process.env.QWEN_UNET, clip: process.env.QWEN_CLIP, vae: process.env.QWEN_VAE };
const weights = { unet: backend.unet || comfyDefaults.unet, clip: backend.clip || comfyDefaults.clip, vae: backend.vae || comfyDefaults.vae };
const jobsDir = join(out, 'image-jobs');
const jobs = createImageJobs({ backend, directory: jobsDir, ...(real ? {} : { fixture: true, fetchImpl: fakeComfy }) });
const apiKey = values['text-model'] ? (process.env.WORKBENCH_LLM_API_KEY ?? process.env.MINIMAX_API_KEY)?.trim() : undefined;
if (values['text-model'] && !apiKey) { console.error('加了 --text-model 却没有设置 WORKBENCH_LLM_API_KEY 或 MINIMAX_API_KEY。'); process.exit(2); }
const ai = await createDesignAI({ apiKey, region: process.env.MINIMAX_REGION ?? 'global', logDir: join(out, 'ai-calls') });
const { chat, evidence } = await createDesignService({ apiKey: undefined, region: 'cn' });
const server = createDesignServer(chat, evidence, jobs, ai);
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
console.log(`${real ? '真机' : '演练（夹具，不出真图）'}：出图 ${jobs.describe().label}；文字模型 ${ai.describe().label}；输出 ${out}`);

function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), end = bytes.length - 22, files = new Map(), dec = new TextDecoder();
  let at = view.getUint32(end + 16, true);
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    const size = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true);
    const name = dec.decode(bytes.slice(at + 46, at + 46 + nameLen)), localName = view.getUint16(local + 26, true);
    files.set(name, Buffer.from(bytes.slice(local + 30 + localName, local + 30 + localName + size)));
    at += 46 + nameLen;
  }
  return files;
}
const pngSize = b => b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
const strip = graph => JSON.stringify(Object.fromEntries(Object.entries(graph).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, { ...v, inputs: Object.fromEntries(Object.entries(v.inputs).filter(([key]) => key !== 'is_changed').sort()) }])));

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--disable-gpu'] });
const report = { mode: real ? 'real' : 'rehearsal', comfyUrl: real ? values['comfy-url'] : null, startedAt: new Date().toISOString(), weights, rounds: [], sessions: [], problems: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', e => report.problems.push('页面错误：' + e.message));
  await page.goto(origin);
  await page.getByTestId('studio4').waitFor();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('multirotor-studio/v4/project')));
  const overview = async () => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press('Escape'); await page.getByTestId('overview-panel').waitFor(); };
  // 4.4：场次设置在“主持人”面板里，开场后面板自己关上，登记场次先过任务卡。
  const begin = async method => {
    const box = await sessionBox(page);
    await box.getByTestId('session-brief').selectOption('A');
    await box.locator(`[data-setup-method=${method}]`).click();
    await box.getByTestId('session-start').click();
    await closeModerator(page);
    await passTaskCard(page);
    await page.getByTestId(method === 'free' ? 'free-studio' : 'v4-canvas').waitFor();
    return (await saved()).currentSessionId;
  };
  const exportZip = async id => {
    const box = await sessionBox(page);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), box.locator(`[data-session="${id}"] [data-testid=export-session]`).click()]);
    const file = join(out, 'zips', download.suggestedFilename());
    await download.saveAs(file);
    await closeModerator(page);
    return { file, files: unzip(new Uint8Array(await readFile(file))) };
  };
  const tap = locator => locator.dispatchEvent('click');
  const plan = [
    { group: 'structured', step: 'first', inputs: 1 },
    { group: 'structured', step: 'nose', inputs: 2, goal: '只改机鼻：让前向相机与机鼻衔接更协调；四处机臂与机身的连接保持不变。', target: '机鼻与前向相机', keep: '四处臂根、四个电机轴心的位置' },
    { group: 'structured', step: 'armroot', inputs: 2, goal: '只改臂根：让四处臂根与机身轮廓过渡更协调；机鼻、前向相机和四个电机轴心的位置保持不变。', target: '四处臂根', keep: '机鼻与前向相机、四个电机轴心的位置' },
    { group: 'free', step: 'first', inputs: 0, text: 'A compact everyday camera quadcopter for daily handheld aerial photography, strict top view, nose up, unfolded, neutral light background, product render.' },
    { group: 'free', step: 'nose', inputs: 1, text: 'Same drone as the image. Change only the nose: blend the forward camera into the nose more smoothly. Keep the four arm-to-body joints and the four motor positions unchanged. Strict top view.', target: '机鼻与前向相机', keep: '四处臂根、四个电机轴心的位置' },
    { group: 'free', step: 'armroot', inputs: 1, text: 'Same drone as the image. Change only the four arm roots: make the arm-to-body transitions smoother. Keep the nose, the forward camera and the four motor positions unchanged. Strict top view.', target: '四处臂根', keep: '机鼻与前向相机、四个电机轴心的位置' },
  ];
  const ids = { structured: [], free: [] };
  const sessions = {};

  // 工作台那一场：首图从画布上的生成节点发出；两次修订都在首图的候选面板里“在这张图上改”（4.4 起生成面板不再选父图、不再另写目标）。
  // 修改说明先交给文字模型（默认是规则回退）整理成这一轮的目标和参数改动，确认后按此生成，父图是首图。
  sessions.structured = await begin('structured');
  let firstCandidate = null;
  for (const p of plan.filter(x => x.group === 'structured')) {
    const before = await page.locator('[data-node=candidate]').count();
    if (p.step === 'first') await tap(page.locator('[data-node=render] [data-testid=node-run]').first());
    else {
      await tap(page.locator(`.react-flow__node:has([data-node=candidate][data-candidate="${firstCandidate}"])`));
      await page.getByTestId('candidate-panel').waitFor();
      await page.getByTestId('revise-text').fill(p.goal);
      await page.getByTestId('revise-ask').click();
      await page.getByTestId('revision').waitFor({ timeout: 120000 });
      await page.getByTestId('revise-run').click();
    }
    await page.waitForFunction(n => document.querySelectorAll('[data-node=candidate]').length > n, before, { timeout: waitMs });
    if (p.step === 'first') firstCandidate = await page.locator('[data-node=candidate]').first().getAttribute('data-candidate');
    console.log(`工作台 ${p.step} 回图`);
    await overview();
  }
  // 自由提示那一场会另开项目，工作台这一场随之归到“之前项目的场次”里；先导出。
  const zips = { structured: await exportZip(sessions.structured) };
  // 自由提示那一场：首图纯文字；两次修订都以首图为父图
  sessions.free = await begin('free');
  for (const p of plan.filter(x => x.group === 'free')) {
    const before = await page.locator('[data-free-candidate]').count();
    if (p.step !== 'first') await page.locator('[data-free-candidate]').first().getByTitle('以此为父图').click();
    await page.getByTestId('free-prompt').fill(p.text);
    await page.getByTestId('free-run').click();
    await page.waitForFunction(n => document.querySelectorAll('[data-free-candidate]').length > n, before, { timeout: waitMs });
    console.log(`自由提示 ${p.step} 回图`);
  }
  zips.free = await exportZip(sessions.free);

  // 导出两场，逐轮核对
  for (const group of ['structured', 'free']) {
    const zip = zips[group];
    const manifest = JSON.parse(zip.files.get('manifest.json'));
    const csv = zip.files.get('session-events.csv').toString('utf8');
    report.sessions.push({ group, zip: zip.file, title: manifest.session.title, imageBackend: manifest.imageBackend, textModel: manifest.textModel, checks: manifest.checks,
      timing: { activeMs: manifest.timing.activeMs, waitingMs: manifest.timing.waiting.ms, used: manifest.timing.used } });
    for (const [k, v] of Object.entries(manifest.checks)) if (v === false) report.problems.push(`${group} 的清单自检没过：${k}`);
    const steps = plan.filter(x => x.group === group);
    manifest.rounds.forEach((r, i) => {
      const p = steps[i], problems = [];
      const read = name => zip.files.get(r.serverFiles.found.find(f => f.name === name)?.inZipAs);
      const request = JSON.parse(read('comfy-request.json') ?? 'null'), ack = JSON.parse(read('comfy-ack.json') ?? 'null'), history = JSON.parse(read('comfy-history.json') ?? 'null');
      const job = JSON.parse(read('job.json') ?? 'null'), record = JSON.parse(zip.files.get(r.file));
      const png = zip.files.get(r.candidates[0]);
      const size = png ? pngSize(png) : null;
      const graph = request?.prompt ?? {};
      const loads = Object.values(graph).filter(n => n.class_type === 'LoadImage').length;
      const run = history?.[ack?.prompt_id];
      const check = (ok, what) => { if (!ok) problems.push(what); };
      check(size?.[0] === 1024 && size?.[1] === 1024, '原图不是 1024×1024 PNG');
      check(loads === p.inputs, `实际输入 ${loads} 张图，应为 ${p.inputs}`);
      check(graph['4']?.inputs?.prompt === record.confirmedText, '工作流里的文字与本轮实发文字不同');
      check(graph['1']?.inputs?.unet_name === weights.unet && graph['2']?.inputs?.clip_name === weights.clip && graph['3']?.inputs?.vae_name === weights.vae, '权重文件名与登记的不同');
      check(graph['10']?.inputs?.steps === comfyDefaults.steps && graph['10']?.inputs?.cfg === comfyDefaults.cfg && graph['10']?.inputs?.sampler_name === comfyDefaults.sampler_name && graph['10']?.inputs?.scheduler === comfyDefaults.scheduler, '采样设置与登记的不同');
      check(graph['10']?.inputs?.seed === seedOf(r.attemptId), '种子不是按轮次编号算出的');
      check(!!ack?.prompt_id && ack.prompt_id === job?.comfy?.promptId && ack.prompt_id === r.promptId, 'prompt_id 在入队回执、服务记录、清单之间对不上');
      check(run?.status?.status_str === 'success' && strip(run.prompt[2]) === strip(graph), '运行历史不是成功，或历史里的工作流与实发请求不同');
      check(r.enqueueRequests === 1, `入队请求 ${r.enqueueRequests} 次（应为 1 次）`);
      check(!r.serverFiles.missing.length, '服务端原件缺：' + r.serverFiles.missing.join('、'));
      check(['queue', 'run_start', 'run_end', 'first_shown'].every(ev => new RegExp(`,${r.attemptId},${ev},\\d{4}-`).test(csv)), '事件表里缺入队、执行或首次显示的时间');
      check(record.h3?.model === qwenModel && manifest.imageBackend?.model === qwenModel, '出图模型不是 Qwen-Image-2.1');
      if (p.step !== 'first') check(!!record.parentImage, '修订轮没有带父图');
      ids[group].push(r.attemptId);
      report.rounds.push({ group, step: p.step, label: r.label, attemptId: r.attemptId, promptId: r.promptId, seed: graph['10']?.inputs?.seed, inputs: loads,
        png: png ? { width: size?.[0], height: size?.[1], sha256: sha(png) } : null, queueMs: manifest.timing.waiting.image[i]?.queueMs ?? null, runMs: manifest.timing.waiting.image[i]?.runMs ?? null,
        ok: !problems.length, problems, zipFile: r.file, png_in_zip: r.candidates[0], target: p.target ?? null, keep: p.keep ?? null,
        // 工作台的修订轮：设计者写的修改说明，和文字模型（或规则回退）整理出的这一轮目标，照实并列，读盲读材料时用得上。
        asked: p.goal ?? p.text ?? null, roundGoal: record.goal ?? null, roundKeep: record.keep ?? null });
    });
  }

  // 第 14 条的盲读材料：修订前后的原图匿名编号；读者按登记的读者表逐张读。前后对照表是草案，作者同意后再发。
  const editDir = join(out, 'local-edit'), readerDir = join(editDir, 'reader');
  await mkdir(readerDir, { recursive: true });
  const images = report.rounds.filter(r => r.png).map(r => ({ ...r, code: 'LE-' + sha(r.attemptId + r.png.sha256).slice(0, 6).toUpperCase() }));
  images.sort((a, b) => a.code.localeCompare(b.code));
  for (const img of images) {
    const zip = report.sessions.find(s => s.group === img.group).zip;
    await writeFile(join(readerDir, img.code + '.png'), unzip(new Uint8Array(await readFile(zip))).get(img.png_in_zip));
  }
  const sheetHeader = (await readFile(new URL('../../../planning/research-library/design/reader_sheet.csv', import.meta.url), 'utf8').catch(() =>
    'anonymous_image_id,reader_code,view_quality,visible_axis_count,axis_points_xy,orientation_observable,layer_visibility_by_axis,visible_parts,occluded_parts,reason_unjudgeable,confidence_note')).split(/\r?\n/)[0];
  await writeFile(join(readerDir, 'reader_sheet.csv'), sheetHeader + '\n' + images.map(i => i.code + ',' + ','.repeat(sheetHeader.split(',').length - 2)).join('\n') + '\n');
  const pairs = report.rounds.filter(r => r.step !== 'first').map(r => {
    const first = images.find(i => i.group === r.group && i.step === 'first'), after = images.find(i => i.attemptId === r.attemptId);
    return { pair: 'P-' + after.code.slice(3), before: first.code, after: after.code, group: r.group, target: r.target, keep: r.keep };
  });
  await writeFile(join(editDir, 'pairs-researcher-only.csv'), 'pair,before,after,group,target,keep\n' + pairs.map(p => [p.pair, p.before, p.after, p.group, p.target, p.keep].join(',')).join('\n') + '\n');
  await writeFile(join(editDir, 'pair_sheet-draft.csv'), 'pair,reader_code,before,after,target_part,target_changed(是/否/不可判),keep_parts,keep_drifted_by_part(部位:是/否/不可判),axis_points_before_xy,axis_points_after_xy,text_in_image,reason_unjudgeable,note\n'
    + pairs.map(p => [p.pair, '', p.before, p.after, p.target, '', p.keep, '', '', '', '', '', ''].join(',')).join('\n') + '\n');
  report.localEdit = { dir: editDir, images: images.length, pairs: pairs.length, note: '读者表照 planning/research-library/design/reader_sheet.csv；前后对照表是草案（第 14 条的口径），作者同意后再发给读者。轴心按读者标的点算比例，图里出现的尺寸文字单列。' };
  // 服务端作业目录里的原件也拷一份到报告目录（ZIP 里已有，这里便于直接核对）
  for (const r of report.rounds) await copyFile(join(jobsDir, r.attemptId + '.comfy-history.json'), join(out, `${r.group}-${r.step}.comfy-history.json`)).catch(() => {});
} catch (error) {
  report.problems.push('中断：' + (error?.message ?? String(error)).split('\n')[0]);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
  report.finishedAt = new Date().toISOString();
  report.ok = !report.problems.length && report.rounds.length === 6 && report.rounds.every(r => r.ok);
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  const md = ['# 真机验收报告', '', `${report.mode === 'real' ? '真机：' + report.comfyUrl : '演练（夹具，不出真图）'}；${report.startedAt} 到 ${report.finishedAt}。`, '',
    '| 组 | 轮 | 输入图 | 原图 | 种子 | prompt_id | 排队 ms | 执行 ms | 结果 |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...report.rounds.map(r => `| ${r.group === 'free' ? '自由提示' : '工作台'} | ${r.step} | ${r.inputs} | ${r.png ? r.png.width + '×' + r.png.height : '无'} | ${r.seed} | ${r.promptId ?? ''} | ${r.queueMs ?? ''} | ${r.runMs ?? ''} | ${r.ok ? '通过' : r.problems.join('；')} |`),
    '', '工作台修订轮（在首图上改）：写的修改说明 → 这一轮的目标',
    ...report.rounds.filter(r => r.group === 'structured' && r.step !== 'first').map(r => `- ${r.step}：${r.asked} → ${r.roundGoal}${r.roundKeep ? '（' + r.roundKeep + '）' : ''}`),
    '', report.problems.length ? '问题：' + report.problems.join('；') : '没有发现问题。', '', `盲读材料：${report.localEdit?.dir ?? '没有生成'}`].join('\n');
  await writeFile(join(out, 'report.md'), md + '\n');
  console.log(md);
  process.exitCode = report.ok ? 0 : 1;
}
assert.ok(true);
