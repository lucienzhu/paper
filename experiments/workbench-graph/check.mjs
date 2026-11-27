// 核对一批请求是不是工作台的出图条件：执行图逐项等于工作台的 comfyGraph（同一份文字、种子、输入图名），负向词等于工作台现行的那一份。
// 只有种子、保存前缀和输入图的文件名可以不同于工作台（它们不进入生成内容以外的东西）。事先登记的偏离用参数写明：
//   --swap <请求号前缀>:<工作台的词>=<这批的词>    负向词里换一个词（例如共轴 X8 把 extra rotor 换成 extra arm）
//   --control <请求号前缀>                          事先登记的控制分支请求（A4 的两种做法）：执行图不同，只核对采样设置、权重名和负向词
//   --hexa <请求号前缀>                             农业植保六旋的请求：负向词是不带相机词的那一份（工作台 4.6 起负向词按任务分两份）
//   --cfg <请求号前缀>=<数值>                        事先登记的控制分支请求里 CFG 不同于工作台的（A4 两段式第一步登记的是 1）；只对 --control 的请求有效
// 用法（仓库根目录）：node experiments/workbench-graph/check.mjs <请求目录> [更多目录] [--swap …] [--control …]
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { comfyGraph, comfyDefaults, negativeFor } = await import(pathToFileURL(resolve(here, '../../prototypes/drone-configurator/scripts/image-jobs.mjs')).href);
const args = process.argv.slice(2), dirs = [], swaps = [], control = [], hexa = [], cfgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--swap') { const [prefix, pair] = args[++i].split(':'); const [from, to] = pair.split('='); swaps.push({ prefix, from, to }); }
  else if (args[i] === '--control') control.push(args[++i]);
  else if (args[i] === '--hexa') hexa.push(args[++i]);
  else if (args[i] === '--cfg') { const [prefix, value] = args[++i].split('='); cfgs.push({ prefix, value: Number(value) }); }
  else dirs.push(args[i]);
}
if (!dirs.length) { console.error('用法：node experiments/workbench-graph/check.mjs <请求目录> [--swap 前缀:词=词] [--control 前缀]'); process.exit(1); }
const canon = value => JSON.stringify(value, (key, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const problems = []; let checked = 0, plain = 0, swapped = 0, branch = 0;
for (const dir of dirs) for (const file of readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'manifest.json').sort()) {
  const graph = JSON.parse(readFileSync(join(dir, file), 'utf8')).prompt;
  const id = graph['12'].inputs.filename_prefix, text = graph['4'].inputs;
  checked++;
  let negative = negativeFor(hexa.some(prefix => id.startsWith(prefix)) ? 'hexa' : 'quad');
  const swap = swaps.find(s => id.startsWith(s.prefix));
  if (swap) {
    if (!negative.split(', ').includes(swap.from)) problems.push(`${file}：登记要换的词“${swap.from}”不在工作台的负向词里`);
    negative = negative.split(', ').map(term => term === swap.from ? swap.to : term).join(', ');
    swapped++;
  }
  if (text.negative_prompt !== negative) problems.push(`${file}：负向词不是工作台现行的那一份${swap ? '（已按登记换词）' : ''}`);
  if (control.some(prefix => id.startsWith(prefix))) {
    // 控制分支：采样设置和三份权重名与工作台逐项相同，文字编码节点同型。
    branch++;
    const s = graph['10'].inputs;
    const registeredCfg = cfgs.find(c => id.startsWith(c.prefix));
    for (const key of ['steps', 'cfg', 'sampler_name', 'scheduler']) {
      const want = key === 'cfg' && registeredCfg ? registeredCfg.value : comfyDefaults[key];
      if (s[key] !== want) problems.push(`${file}：采样设置 ${key} 与${key === 'cfg' && registeredCfg ? '登记的' : '工作台'}不同`);
    }
    if (graph['1'].inputs.unet_name !== comfyDefaults.unet || graph['2'].inputs.clip_name !== comfyDefaults.clip || graph['3'].inputs.vae_name !== comfyDefaults.vae) problems.push(`${file}：权重名与工作台不同`);
    if (graph['4'].class_type !== 'TextEncodeQwenImage21' || text.resolution !== 1024) problems.push(`${file}：文字编码节点与工作台不同`);
    continue;
  }
  const images = Object.entries(graph).filter(([, node]) => node.class_type === 'LoadImage').sort(([a], [b]) => Number(a) - Number(b)).map(([, node]) => node.inputs.image);
  const expected = comfyGraph('x', text.prompt, graph['10'].inputs.seed, images, { ...comfyDefaults, negative_prompt: negative });
  expected['12'].inputs.filename_prefix = id;
  if (canon(expected) !== canon(graph)) problems.push(`${file}：执行图与工作台的 comfyGraph 不同`);
  else plain++;
}
console.log(`核对 ${checked} 份请求：与工作台的执行图逐项相同 ${plain} 份` + (swapped ? `（其中按登记换了一个负向词的 ${swapped} 份）` : '') + (branch ? `；事先登记的控制分支 ${branch} 份` : ''));
console.log('工作台现行负向词：四旋 ' + negativeFor('quad').split(', ').length + ' 个词，植保六旋 ' + negativeFor('hexa').split(', ').length + ' 个词');
for (const p of problems) console.log('  ' + p);
console.log(problems.length ? `未通过：${problems.length} 个问题` : '通过');
process.exit(problems.length ? 1 : 0);
