// 图像后端：只接本机 ComfyUI 上的 Qwen-Image 2.1（4.5：作者 2026-11-26 定研究控制变量，文字模型 MiniMax、出图模型 Qwen；
// 原先开发用的托管出图后端已去掉）。本机服务告知标签，软件夹具会写明不出真图。
import { useEffect, useState } from 'react';

export type ImageModel = 'Qwen-Image-2.1';
export interface ImageBackend { provider: 'qwen-comfy'; model: ImageModel; endpoint: string; label: string; /** 软件夹具冒充后端接口，不出真图。 */ fixture?: boolean }
export const qwenBackend: ImageBackend = { provider: 'qwen-comfy', model: 'Qwen-Image-2.1', endpoint: '/prompt', label: 'Qwen-Image 2.1（本机 ComfyUI）' };
/**
 * 一轮记录冻结时登记的模型决定了它该由哪个后端应答。4.5 起新轮次都是 Qwen；4.5 以前留在本机的非 Qwen 旧记录照实标出，
 * 服务不再取回，也不计入研究数据。
 */
export const backendOf = (model?: string): ImageBackend =>
  model === undefined || model === qwenBackend.model ? qwenBackend : { ...qwenBackend, label: `非 Qwen 的旧记录（${model}），不计入研究数据` };
export const modelLabel = (model?: string) => backendOf(model).label;
/**
 * 4.5.2：一轮的候选能不能再进生成请求（作父图）或定为终稿，只看它是不是这台工作台上 Qwen 出图成功的记录。
 * 4.5 以前留在浏览器里的旧记录（开发用的托管后端）照原样保留、照实标出，但不能再用。服务端另按内容摘要核对父图。
 */
export const usableAsParent = (round: { h3?: { model?: string; status?: string } }) =>
  round.h3?.model === qwenBackend.model && round.h3.status === 'succeeded';
export const parentRefusal = (round: { h3?: { model?: string; status?: string } }) =>
  round.h3?.model && round.h3.model !== qwenBackend.model
    ? `这张候选是旧记录（${round.h3.model}），不是 Qwen 出的图：不能作父图，也不能定为终稿。请在 Qwen 出图成功的候选里选。`
    : '这张候选不是这台工作台上 Qwen 出图成功的记录：不能作父图，也不能定为终稿。';

let current: Promise<ImageBackend> | undefined;
export function imageBackend(): Promise<ImageBackend> {
  current ??= (async () => {
    if (!['http:', 'https:'].includes(location.protocol)) return qwenBackend;
    try {
      // 路由名里的 h3 是早期版本留下的内部名字，现在这个接口只接 Qwen。
      const response = await fetch('/api/h3/backend', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      const info = response.ok ? await response.json() : null;
      // 走查用的软件夹具：标签照服务说的写（“软件夹具……不出真图”），别让截图看起来像真实回图。
      return info?.fixture === true && typeof info.label === 'string' ? { ...qwenBackend, label: info.label, fixture: true } : qwenBackend;
    } catch { return qwenBackend; }
  })();
  return current;
}
export function useImageBackend() {
  const [backend, setBackend] = useState<ImageBackend>(qwenBackend);
  useEffect(() => { let live = true; void imageBackend().then(value => { if (live) setBackend(value); }); return () => { live = false; }; }, []);
  return backend;
}
