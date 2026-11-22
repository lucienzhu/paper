// 接上真实文字模型后的冒烟检查：五种任务各调用一次（读意图、提方向、对机身说话、在候选上改、自由提示的助手），
// 看回答能不能通过服务的核对、各花了多久、拿掉了几条。会产生 5 次真实调用，计入接口用量。
// 密钥只从环境变量读（WORKBENCH_LLM_API_KEY 或 MINIMAX_API_KEY），不打印、不落盘；调用日志照常写进 WORKBENCH_AI_LOG_DIR。
// 加 --fixture 时不连模型，只用规则回退检查本脚本自己。
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createDesignAI, defaultModel } from './design-ai.mjs';
import { baseParameters } from '../src/v4/model.ts';
import { study, studyBriefs } from '../src/design/defaults.ts';

const fixture = process.argv.includes('--fixture');
const apiKey = fixture ? undefined : (process.env.WORKBENCH_LLM_API_KEY ?? process.env.MINIMAX_API_KEY)?.trim();
if (!fixture && !apiKey) { console.error('没有设置 WORKBENCH_LLM_API_KEY 或 MINIMAX_API_KEY，不调用。只检查脚本时加 --fixture。'); process.exit(2); }
const logDir = process.env.WORKBENCH_AI_LOG_DIR;
const ai = await createDesignAI({ apiKey, region: process.env.MINIMAX_REGION ?? 'cn', model: process.env.WORKBENCH_LLM_MODEL?.trim() || defaultModel,
  baseUrl: process.env.WORKBENCH_LLM_BASE_URL?.trim() || undefined, effort: process.env.WORKBENCH_LLM_EFFORT?.trim() || undefined, ...(logDir ? { logDir } : {}) });

// 用登记的委托 A 和 C2 的机架做冒烟：和正式场次的输入一样。
const parameters = baseParameters('consumer_camera');
Object.assign(parameters.frame, study.conditions.find(c => c.id === 'c2-pilot').frame);
const brief = studyBriefs[0].text;
const rows = [];
async function step(name, run, summarize) {
  const started = Date.now();
  try {
    const result = await run();
    rows.push({ 任务: name, 结果: '通过', 秒: ((Date.now() - started) / 1000).toFixed(1), 调用编号: result.call.id.slice(0, 8), 摘要: summarize(result) });
    return result;
  } catch (error) {
    rows.push({ 任务: name, 结果: '失败', 秒: ((Date.now() - started) / 1000).toFixed(1), 调用编号: error.metadata?.callId?.slice(0, 8) ?? '', 摘要: error.message });
    return null;
  }
}

const reading = await step('读意图', () => ai.intent({ text: brief, taskId: 'consumer_camera' }),
  r => `${r.targets.length} 个目标，${r.interpretations.length} 句要设计者理解，${r.cards.length} 张用户原话`);
const targets = (reading?.targets ?? []).filter(t => t.pair && t.pole);
const intent = { targets: targets.map(t => ({ pair: t.pair, pole: t.pole })), note: '' };
await step('提方向', () => ai.directions({ intent: { text: brief, targets: targets.map(t => ({ pair: t.pair, pole: t.pole, text: t.text })), notes: [] }, lane: { parameters }, locked: ['frame'] }),
  r => `${r.directions.length} 个方向，共 ${r.directions.reduce((n, d) => n + d.changes.length, 0)} 项改动`);
await step('对机身说话', () => ai.layer({ layer: 'body', message: '再紧凑一点', lane: { parameters }, intent, locked: ['frame'], history: [] }),
  r => `${r.suggestions.length} 条建议，档位：${r.suggestions.map(s => s.tier).join('、') || '无'}`);
await step('在候选上改', () => ai.revise({ message: '机身短一点，其他别动', candidate: { parameters }, intent, locked: ['frame'] }),
  r => `改 ${r.changes.length} 项，保持不动 ${r.keep.length} 层`);
await step('自由提示的助手', () => ai.free({ messages: [{ role: 'user', content: '我想做一台能折叠的小航拍机，看起来紧凑、整体，帮我写一段提示词' }] }),
  r => r.prompt ? `起草了 ${r.prompt.length} 字的提示词` : '没有起草提示词');

console.table(rows);
const described = ai.describe();
console.log(`文字模型：${described.label}（${described.mode === 'model' ? described.provider : '规则回退'}）；证据登记：${described.registry}`);
if (logDir) {
  // 从日志里数一数服务核对时拿掉了几条（只读本次的调用编号）。
  const ids = new Set(rows.map(r => r.调用编号).filter(Boolean));
  const lines = (await Promise.all((await readdir(logDir)).filter(f => f.endsWith('.jsonl')).map(f => readFile(join(logDir, f), 'utf8')))).join('').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const mine = lines.filter(l => ids.has(String(l.id).slice(0, 8)));
  console.log(`日志里找到本次 ${mine.length} 条调用；核对时拿掉的条目共 ${mine.reduce((n, l) => n + (Array.isArray(l.dropped) ? l.dropped.length : 0), 0)} 条。`);
}
process.exitCode = rows.every(r => r.结果 === '通过') ? 0 : 1;
