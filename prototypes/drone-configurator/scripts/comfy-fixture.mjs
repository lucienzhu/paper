// 走查用的软件夹具：按 ComfyUI 的接口应答（上传、入队、队列、历史、取图），不调用任何模型。
// 回图就是本轮的布局条件图（不带图的自由提示用一张固定示意图），并照 ComfyUI 存图的样子嵌入本轮执行图。
// 4.5 起工作台只接 Qwen（ComfyUI），走查里原先冒充托管出图接口的夹具都改用这一个。
import { readFile } from 'node:fs/promises';
import { tagPNGFront as tagPNG } from './fixture-png.mjs';

/** onPrompt(graph) 在每次入队时回调，走查可据此核对发出去的文字和图数。 */
export async function makeComfyFixture({ delay = 0, onPrompt } = {}) {
  const plain = await readFile(new URL('../src/data/history/quad-guide.png', import.meta.url));
  const uploads = new Map(), runs = new Map(), outputs = new Map();
  let count = 0;
  const historyOf = (id, graph) => ({ prompt: [1, id, graph, { client_id: 'fixture' }, ['12']],
    outputs: { 12: { images: [{ filename: graph['12'].inputs.filename_prefix + '_00001_.png', subfolder: '', type: 'output' }] } },
    status: { status_str: 'success', completed: true, messages: [['execution_start', { prompt_id: id, timestamp: Date.now() - 20 }], ['execution_success', { prompt_id: id, timestamp: Date.now() }]] } });
  return async (url, init = {}) => {
    const { pathname, searchParams } = new URL(url);
    if (pathname === '/upload/image') {
      const file = init.body.get('image');
      uploads.set(file.name, Buffer.from(await file.arrayBuffer()));
      return Response.json({ name: file.name, subfolder: '', type: 'input' });
    }
    if (pathname === '/prompt') {
      const body = JSON.parse(init.body), graph = body.prompt;
      onPrompt?.(graph);
      const id = body.prompt_id ?? 'fixture-' + (++count);
      outputs.set(graph['12'].inputs.filename_prefix + '_00001_.png', tagPNG(graph['15'] ? uploads.get(graph['15'].inputs.image) : plain, graph));
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      runs.set(id, graph);
      return Response.json({ prompt_id: id, number: runs.size, node_errors: {} });
    }
    if (pathname === '/queue') return Response.json({ queue_running: [], queue_pending: [] });
    if (pathname === '/history') return Response.json(Object.fromEntries([...runs].map(([id, graph]) => [id, historyOf(id, graph)])));
    if (pathname.startsWith('/history/')) {
      const id = decodeURIComponent(pathname.slice(9));
      return Response.json(runs.has(id) ? { [id]: historyOf(id, runs.get(id)) } : {});
    }
    if (pathname === '/view' && searchParams.get('type') === 'output' && outputs.has(searchParams.get('filename')))
      return new Response(outputs.get(searchParams.get('filename')), { headers: { 'Content-Type': 'image/png' } });
    return new Response('not found', { status: 404 });
  };
}

/** 发出去的执行图里的文字和图数，与原先夹具核对的两项相同。 */
export const sentOf = graph => ({ prompt: graph['4'].inputs.prompt, images: Object.values(graph).filter(node => node.class_type === 'LoadImage').length });
